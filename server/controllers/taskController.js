import Task from "../models/Task.js";
import { emitTeamUpdate } from "../utils/realtime.js";
import Team from "../models/Team.js";
import Employee from "../models/Employee.js";
import { createTaskAssignmentNotification, createTaskUpdateNotification, createTaskSubmissionNotification } from "./notificationController.js";
import { saveFile, deleteFile, getFileKeyFromUrl } from "../utils/fileSaver.js";
import { resolveMilestoneId } from "./milestoneController.js";

// Assign Task (Team Lead)
// Remark and rating are the reviewer's private assessment; employees only see status.
const isReviewerRole = (role) => {
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes("admin") || roles.includes("team_lead");
};
const hideReview = (task) => {
  const obj = task.toObject ? task.toObject() : { ...task };
  delete obj.remark;
  delete obj.rating;
  return obj;
};

export const assignTask = async (req, res) => {
  try {
    const { title, description, priority, startDate, deadline, teamId } = req.body;
    // Multipart requests (with a reference file) send the assignee list as JSON text.
    let { assignedTo } = req.body;
    if (typeof assignedTo === "string" && assignedTo.trim().startsWith("[")) {
      try { assignedTo = JSON.parse(assignedTo); } catch { /* keep as-is */ }
    }

    // Verify Team Lead owns the team
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, error: "Team not found" });

    if (!req.user.role.includes("admin") && team.leadId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, error: "Not authorized" });
    }
    const ms = await resolveMilestoneId(req.body.milestoneId, teamId);
    if (ms.error) return res.status(400).json({ success: false, error: ms.error });
    const milestoneId = ms.value || undefined;
    // A task inside a milestone takes the milestone's week.
    const taskStart = ms.milestone ? ms.milestone.startDate : startDate;
    const taskDeadline = ms.milestone ? ms.milestone.dueDate : deadline;

    // Optional reference from the lead (image/file showing what to do); shared by all assignees.
    let reference, referenceName;
    if (req.file) {
      reference = (await saveFile(req.file, "tasks")).url;
      referenceName = req.file.originalname;
    }

    // Handle multiple assignees
    if (Array.isArray(assignedTo)) {
        const tasks = assignedTo.map(employeeId => ({
            title,
            description,
            priority,
            startDate: taskStart,
            deadline: taskDeadline,
            assignedTo: employeeId,
            assignedBy: req.user._id,
            teamId,
            milestoneId,
            reference,
            referenceName,
            status: "Assigned"
        }));

        const createdTasks = await Task.insertMany(tasks);
        
        // Notify each assignee
        for (const task of createdTasks) {
            await createTaskAssignmentNotification(task, req.user._id, req.io);
        }

        emitTeamUpdate(req.io, team, "tasks");
        return res.status(201).json({ success: true, tasks: createdTasks });
    }

    // Handle single assignee (backward compatibility)
    const newTask = new Task({
      title,
      description,
      priority,
      startDate: taskStart,
      deadline: taskDeadline,
      assignedTo, // Employee ID
      assignedBy: req.user._id,
      teamId,
      milestoneId,
      reference,
      referenceName,
      status: "Assigned"
    });

    await newTask.save();

    // Notify assignee
    await createTaskAssignmentNotification(newTask, req.user._id, req.io);

    emitTeamUpdate(req.io, team, "tasks");
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
    
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, error: "Task not found" });

    // Decide by relationship to this task, not by role: a team lead can also be
    // an assignee (on another lead's team), and must then act as the employee.
    const employee = await Employee.findOne({ userId: req.user._id });
    const isAssignee = !!employee && String(task.assignedTo) === String(employee._id);
    const team = await Team.findById(task.teamId).select("leadId");
    const roles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const isReviewer =
      !isAssignee && (roles.includes("admin") || (team && String(team.leadId) === String(req.user._id)));

    if (!isAssignee && !isReviewer) {
      return res.status(403).json({ success: false, error: "Not authorized to update this task" });
    }
    if (!isReviewer && task.status === "Completed") {
      return res.status(400).json({ success: false, error: "This task is already completed" });
    }

    // Work proof is the employee's: upload replaces the current file; removeWorkProof=true
    // deletes it. Leads/admins only review it, so their uploads are ignored.
    const dropOldProof = async () => {
      if (!task.workProof) return;
      try { await deleteFile(getFileKeyFromUrl(task.workProof)); } catch { /* keep going */ }
    };
    if (req.file && !isReviewer) {
      const uploadResult = await saveFile(req.file, "tasks");
      await dropOldProof();
      task.workProof = uploadResult.url;
      task.workProofName = req.file.originalname;
    } else if (!isReviewer && String(req.body.removeWorkProof) === "true") {
      await dropOldProof();
      task.workProof = undefined;
      task.workProofName = undefined;
    }

    // Employees can't edit the task itself. They can attach/replace/remove their
    // work proof and comment until it's completed, and say "I've completed my work",
    // which moves the task to Review; the team lead or admin then closes it.
    if (!isReviewer) {
      if (status && status !== "Review") {
        return res.status(403).json({ success: false, error: "Only your team lead can update this task" });
      }
      if (comments !== undefined) task.comments = comments;
      const submitting = status === "Review"; // first submit or a resubmit — both notify the lead
      if (submitting) task.status = "Review";
      task.updatedAt = Date.now();
      await task.save();
      if (submitting) await createTaskSubmissionNotification(task, req.user._id, req.io);
      emitTeamUpdate(req.io, task.teamId, "tasks");
      return res.status(200).json({ success: true, task: hideReview(task) });
    }

    if (status) task.status = status;
    if (comments) task.comments = comments;
    if (description) task.description = description; // Older app builds send the remark here
    // Remark and rating (1-10) are the reviewer's; "0"/"" clears the rating.
    const { rating, remark } = req.body;
    if (remark !== undefined && isReviewer) task.remark = remark;
    if (rating !== undefined && isReviewer) {
      const r = Number(rating);
      if (!r) task.rating = undefined;
      else if (Number.isInteger(r) && r >= 1 && r <= 10) task.rating = r;
      else return res.status(400).json({ success: false, error: "Rating must be 1 to 10" });
    }
    task.updatedAt = Date.now();

    await task.save();
    emitTeamUpdate(req.io, task.teamId?._id || task.teamId, "tasks");

    // Send Notifications
    if (req.user.role.includes('admin') || req.user.role.includes('team_lead')) {
        // Admin/TL updated task -> Notify Employee
        await createTaskUpdateNotification(task, req.user._id, req.io);
    } else {
        // Employee updated task (status/workProof) -> Notify Team Lead/Admin (who assigned it)
        await createTaskSubmissionNotification(task, req.user._id, req.io);
    }

    res.status(200).json({ success: true, task: isReviewerRole(req.user.role) ? task : hideReview(task) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Tasks
export const getTasks = async (req, res) => {
  try {
    const { teamId, employeeId } = req.query;
    let query = { isDeleted: { $ne: true } };

    // "My Tasks" (no filters): the caller's own assigned tasks, whatever their
    // roles, so a team lead who is also an assignee sees theirs like any employee.
    if (!teamId && !employeeId) {
      const me = await Employee.findOne({ userId: req.user._id }).select("_id");
      if (!me) return res.status(200).json({ success: true, tasks: [] });
      const mine = await Task.find({ ...query, assignedTo: me._id })
        .populate("assignedBy", "name")
        .populate("teamId", "name")
        .populate("milestoneId", "title description startDate dueDate state");
      return res.status(200).json({ success: true, tasks: mine.map(hideReview) });
    }

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
        .populate("teamId", "name")
        .populate("milestoneId", "title description startDate dueDate state");

    res.status(200).json({
      success: true,
      tasks: isReviewerRole(req.user.role) ? tasks : tasks.map(hideReview),
    });
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
        emitTeamUpdate(req.io, task.teamId?._id || task.teamId, "tasks");
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
        const ms = await resolveMilestoneId(req.body.milestoneId, task.teamId?._id || task.teamId);
        if (ms.error) return res.status(400).json({ success: false, error: ms.error });
        if (ms.value !== undefined) task.milestoneId = ms.value || undefined;
        if (ms.milestone) {
          task.startDate = ms.milestone.startDate;
          task.deadline = ms.milestone.dueDate;
        }
        // Reference file: upload replaces it; removeReference=true clears it.
        if (req.file) {
          task.reference = (await saveFile(req.file, "tasks")).url;
          task.referenceName = req.file.originalname;
        } else if (String(req.body.removeReference) === "true") {
          task.reference = undefined;
          task.referenceName = undefined;
        }
        task.updatedAt = Date.now();
        await task.save();
        emitTeamUpdate(req.io, task.teamId?._id || task.teamId, "tasks");

        res.status(200).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
