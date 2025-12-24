import Team from "../models/Team.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import Task from "../models/Task.js";

// Create Team
export const createTeam = async (req, res) => {
  try {
    const { name, description, startDate, leadId } = req.body;
    
    // Only Admin can create team
    if (req.user.role !== "admin") {
       return res.status(403).json({ success: false, error: "Only admin can create team" });
    }

    // If admin provides leadId, use it.
    const assignedLeadId = leadId;

    if (!assignedLeadId) {
        return res.status(400).json({ success: false, error: "Team Lead is required" });
    }

    const newTeam = new Team({
      name,
      description,
      startDate,
      leadId: assignedLeadId,
    });

    await newTeam.save();
    res.status(201).json({ success: true, team: newTeam });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get All Team Leads (For Admin selection)
export const getTeamLeads = async (req, res) => {
    try {
        const leads = await User.find({ role: "team_lead" }).select("name email");
        res.status(200).json({ success: true, leads });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Add Members to Team
export const addMembers = async (req, res) => {
  try {
    const { teamId, employeeIds } = req.body;
    
    // Validate team ownership
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, error: "Team not found" });

    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Only admin can add members to team" });
    }

    // Add employees (prevent duplicates)
    // Expecting req.body.employees to be array of { employeeId, role } or employeeIds and role
    // Let's support the UI sending { employeeIds: [], role: "" }
    const { role } = req.body;
    
    const currentMemberIds = team.members.map(m => m.employeeId.toString());
    
    const newMembers = employeeIds
      .filter(id => !currentMemberIds.includes(id))
      .map(id => ({ employeeId: id, role: role || 'Developer' }));

    team.members = [...team.members, ...newMembers];
    
    await team.save();
    res.status(200).json({ success: true, team });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Teams (Admin sees all, Lead sees theirs)
export const getTeams = async (req, res) => {
  try {
    let teams;
    if (req.user.role === "admin") {
      teams = await Team.find()
        .populate("leadId", "name email")
        // Removed deep population of members as it's not needed for the list view and slows down response
        .select("name leadId members"); 
    } else if (req.user.role === "team_lead") {
      teams = await Team.find({ leadId: req.user._id })
        .populate("leadId", "name email")
        .select("name leadId members");
    } else {
      // Employee view - teams they belong to
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) {
        teams = await Team.find({ "members.employeeId": employee._id })
           .populate("leadId", "name")
           .select("name leadId members");
      } else {
         teams = [];
      }
    }
    res.status(200).json({ success: true, teams });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Team Detail with Task Stats
export const getTeamDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await Team.findById(id)
      .populate("leadId", "name")
      .populate({
        path: "members.employeeId",
        populate: { path: "userId", select: "name email profileImage" }
      });

    if (!team) return res.status(404).json({ success: false, error: "Team not found" });

    // Fetch tasks for all members in this team
    const tasks = await Task.find({ teamId: id })
      .sort({ createdAt: -1 })
      .populate({
        path: "assignedTo",
        populate: { path: "userId", select: "name email" }
    });

    // Calculate stats per member
    const memberStats = team.members.map(memberObj => {
      const member = memberObj.employeeId;
      if (!member) return null; // Handle case where population might fail or data issue

      const memberTasks = tasks.filter(t => t.assignedTo && t.assignedTo._id.toString() === member._id.toString());
      // Filter out deleted tasks for statistics (but they are still returned in the main tasks list)
      const activeTasks = memberTasks.filter(t => !t.isDeleted);

      const completed = activeTasks.filter(t => t.status === "Completed").length;
      const total = activeTasks.length;
      
      return {
        member: member,
        role: memberObj.role,
        totalTasks: total,
        completed: completed,
        pending: activeTasks.filter(t => ["Assigned", "In Progress", "Review"].includes(t.status) && new Date(t.deadline) >= new Date()).length,
        overdue: activeTasks.filter(t => t.status === "Overdue" || (new Date(t.deadline) < new Date() && t.status !== "Completed")).length,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        // tasks: memberTasks // Removed to reduce payload size
      };
    }).filter(stat => stat !== null);

    res.status(200).json({ success: true, team, memberStats, tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete Team
export const deleteTeam = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== "admin") {
            return res.status(403).json({ success: false, error: "Only admin can delete team" });
        }

        const team = await Team.findById(id);
        if (!team) {
            return res.status(404).json({ success: false, error: "Team not found" });
        }

        // Delete associated tasks
        await Task.deleteMany({ teamId: id });

        await Team.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: "Team deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
