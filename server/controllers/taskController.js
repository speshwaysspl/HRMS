import Task from "../models/Task.js";
import Team from "../models/Team.js";
import Employee from "../models/Employee.js";
import { createTaskAssignmentNotification, createTaskUpdateNotification, createTaskSubmissionNotification } from "./notificationController.js";
import { saveFile } from "../utils/fileSaver.js";

// Assign Task (Team Lead)
export const assignTask = async (req, res) => {
  try {
    const { title, description, priority, startDate, deadline, assignedTo, teamId } = req.body;

    // Verify Team Lead owns the team
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, error: "Team not found" });

    if (!req.user.role.includes("admin") && team.leadId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, error: "Not authorized" });
    }

    // Handle multiple assignees
    if (Array.isArray(assignedTo)) {
        const tasks = assignedTo.map(employeeId => ({
            title,
            description,
            priority,
            startDate,
            deadline,
            assignedTo: employeeId,
            assignedBy: req.user._id,
            teamId,
            status: "Assigned"
        }));

        const createdTasks = await Task.insertMany(tasks);
        
        // Notify each assignee
        for (const task of createdTasks) {
            await createTaskAssignmentNotification(task, req.user._id, req.io);
        }

        return res.status(201).json({ success: true, tasks: createdTasks });
    }

    // Handle single assignee (backward compatibility)
    const newTask = new Task({
      title,
      description,
      priority,
      startDate,
      deadline,
      assignedTo, // Employee ID
      assignedBy: req.user._id,
      teamId,
      status: "Assigned"
    });

    await newTask.save();

    // Notify assignee
    await createTaskAssignmentNotification(newTask, req.user._id, req.io);

    res.status(201).json({ success: true, task: newTask });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update Task Status (Employee)
export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments, description } = req.body;
    
    let workProof = undefined;
    if (req.file) {
      const uploadResult = await saveFile(req.file, "tasks");
      workProof = uploadResult.url;
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, error: "Task not found" });

    // Check if user is the assigned employee
    // We need to find the Employee record for the current User
    const employee = await Employee.findOne({ userId: req.user._id });
    
    if (!req.user.role.includes("admin") && !req.user.role.includes("team_lead") && (!employee || task.assignedTo.toString() !== employee._id.toString())) {
         return res.status(403).json({ success: false, error: "Not authorized to update this task" });
    }

    if (status) task.status = status;
    if (comments) task.comments = comments;
    if (description) task.description = description; // Older app builds send the remark here
    if (workProof) task.workProof = workProof;
    // Remark and rating (1-5) are the reviewer's; "0"/"" clears the rating.
    const { rating, remark } = req.body;
    const isReviewer = req.user.role.includes("admin") || req.user.role.includes("team_lead");
    if (remark !== undefined && isReviewer) task.remark = remark;
    if (rating !== undefined && isReviewer) {
      const r = Number(rating);
      if (!r) task.rating = undefined;
      else if (Number.isInteger(r) && r >= 1 && r <= 5) task.rating = r;
      else return res.status(400).json({ success: false, error: "Rating must be 1 to 5" });
    }
    task.updatedAt = Date.now();

    await task.save();

    // Send Notifications
    if (req.user.role.includes('admin') || req.user.role.includes('team_lead')) {
        // Admin/TL updated task -> Notify Employee
        await createTaskUpdateNotification(task, req.user._id, req.io);
    } else {
        // Employee updated task (status/workProof) -> Notify Team Lead/Admin (who assigned it)
        await createTaskSubmissionNotification(task, req.user._id, req.io);
    }

    res.status(200).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Tasks
export const getTasks = async (req, res) => {
  try {
    const { teamId, employeeId } = req.query;
    let query = { isDeleted: { $ne: true } };

    if (req.user.role === "employee") {
         const employee = await Employee.findOne({ userId: req.user._id });
         if (!employee) return res.status(404).json({success: false, error: "Employee profile not found"});
         query.assignedTo = employee._id;
    } else if (req.user.role === "team_lead") {
        // Team Lead should see tasks for their teams
        const teams = await Team.find({ leadId: req.user._id });
        const teamIds = teams.map(t => t._id);
        
        // If query parameters are provided, respect them but ensure they belong to lead's teams
        if (teamId) {
             if (teamIds.some(id => id.toString() === teamId)) {
                 query.teamId = teamId;
             } else {
                 return res.status(403).json({ success: false, error: "Access denied to this team's tasks" });
             }
        } else {
             query.teamId = { $in: teamIds };
        }
        
        if (employeeId) {
            query.assignedTo = employeeId;
        }
    } else if (teamId) {
        query.teamId = teamId;
    } else if (employeeId) {
        query.assignedTo = employeeId;
    }

    const tasks = await Task.find(query)
        .populate("assignedTo") // might need deep populate to see user name
        .populate("teamId", "name");
        
    res.status(200).json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete Task (Team Lead)
export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await Task.findById(id).populate("teamId"); // Need team info to check ownership

        if (!task) {
            return res.status(404).json({ success: false, error: "Task not found" });
        }

        // Check Authorization: Admin or Team Lead of the team the task belongs to
        const roles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
        if (!roles.includes("admin")) {
            // Check if user is the team lead of the task's team
            if (!task.teamId || task.teamId.leadId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, error: "Not authorized to delete this task" });
            }
        }

        // Soft delete: Mark as deleted instead of removing from DB
        await Task.findByIdAndUpdate(id, { isDeleted: true });
        res.status(200).json({ success: true, message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Edit task details (title/description/priority/dates): admin or lead of the task's team.
export const editTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate("teamId", "leadId");
        if (!task || task.isDeleted) {
            return res.status(404).json({ success: false, error: "Task not found" });
        }
        const roles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
        const isLead = task.teamId && task.teamId.leadId?.toString() === req.user._id.toString();
        if (!roles.includes("admin") && !isLead) {
            return res.status(403).json({ success: false, error: "Not authorized to edit this task" });
        }

        const { title, description, priority, startDate, deadline } = req.body;
        if (title !== undefined) {
            if (!String(title).trim()) return res.status(400).json({ success: false, error: "Title is required" });
            task.title = String(title).trim();
        }
        if (description !== undefined) task.description = description;
        if (priority !== undefined) {
            if (!["Low", "Medium", "High"].includes(priority)) {
                return res.status(400).json({ success: false, error: "Invalid priority" });
            }
            task.priority = priority;
        }
        if (startDate !== undefined) task.startDate = startDate || undefined;
        if (deadline !== undefined) task.deadline = deadline || undefined;
        task.updatedAt = Date.now();
        await task.save();

        res.status(200).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
