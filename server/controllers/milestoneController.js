import mongoose from "mongoose";
import Milestone from "../models/Milestone.js";
import Task from "../models/Task.js";
import Team from "../models/Team.js";
import Employee from "../models/Employee.js";
import { emitTeamUpdate } from "../utils/realtime.js";

const rolesOf = (user) => (Array.isArray(user.role) ? user.role : [user.role]);
const isLeadOf = (team, user) => String(team.leadId) === String(user._id);

// Admin or the team's lead may manage milestones; members may read them.
const loadTeamFor = async (teamId, user, { manage }) => {
  if (!mongoose.isValidObjectId(teamId)) return { error: [400, "Invalid team"] };
  const team = await Team.findById(teamId).select("leadId members");
  if (!team) return { error: [404, "Team not found"] };
  if (rolesOf(user).includes("admin") || isLeadOf(team, user)) return { team };
  if (manage) return { error: [403, "Only the team lead can manage milestones"] };
  const emp = await Employee.findOne({ userId: user._id }).select("_id");
  const member = emp && team.members.some((m) => String(m.employeeId) === String(emp._id));
  return member ? { team } : { error: [403, "Not a member of this team"] };
};

const fail = (res, [code, error]) => res.status(code).json({ success: false, error });

const withCounts = async (milestones) => {
  const ids = milestones.map((m) => m._id);
  const counts = ids.length
    ? await Task.aggregate([
        { $match: { milestoneId: { $in: ids }, isDeleted: { $ne: true } } },
        {
          $group: {
            _id: "$milestoneId",
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          },
        },
      ])
    : [];
  const byId = new Map(counts.map((c) => [String(c._id), c]));
  return milestones.map((m) => {
    const c = byId.get(String(m._id)) || { total: 0, completed: 0 };
    const obj = m.toObject ? m.toObject() : m;
    return {
      ...obj,
      totalTasks: c.total,
      completedTasks: c.completed,
      openTasks: c.total - c.completed,
      progress: c.total ? Math.round((c.completed / c.total) * 100) : 0,
    };
  });
};

const readBody = (body) => {
  const out = {};
  if (body.title !== undefined) out.title = String(body.title).trim();
  if (body.description !== undefined) out.description = String(body.description);
  if (body.startDate !== undefined) out.startDate = body.startDate || undefined;
  if (body.dueDate !== undefined) out.dueDate = body.dueDate || undefined;
  return out;
};

const datesInvalid = (m) => m.startDate && m.dueDate && new Date(m.dueDate) < new Date(m.startDate);

// GET /api/milestone?teamId=&state=open|closed|all
export const getMilestones = async (req, res) => {
  try {
    const { teamId, state = "all" } = req.query;
    const { error } = await loadTeamFor(teamId, req.user, { manage: false });
    if (error) return fail(res, error);
    const query = { teamId };
    if (state === "open" || state === "closed") query.state = state;
    const milestones = await Milestone.find(query).sort({ state: -1, dueDate: 1, createdAt: -1 });
    res.json({ success: true, milestones: await withCounts(milestones) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/milestone { teamId, title, description, startDate, dueDate }
export const createMilestone = async (req, res) => {
  try {
    const { team, error } = await loadTeamFor(req.body.teamId, req.user, { manage: true });
    if (error) return fail(res, error);
    const data = readBody(req.body);
    if (!data.title) return fail(res, [400, "Title is required"]);
    if (datesInvalid(data)) return fail(res, [400, "Due date can't be before the start date"]);
    const milestone = await Milestone.create({ ...data, teamId: team._id, createdBy: req.user._id });
    emitTeamUpdate(req.io, team, "milestones");
    res.status(201).json({ success: true, milestone: (await withCounts([milestone]))[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/milestone/:id { title?, description?, startDate?, dueDate?, state? }
export const updateMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return fail(res, [404, "Milestone not found"]);
    const { team, error } = await loadTeamFor(milestone.teamId, req.user, { manage: true });
    if (error) return fail(res, error);

    const data = readBody(req.body);
    if (data.title !== undefined && !data.title) return fail(res, [400, "Title is required"]);
    Object.assign(milestone, data);
    if (datesInvalid(milestone)) return fail(res, [400, "Due date can't be before the start date"]);
    if (req.body.state === "open" || req.body.state === "closed") {
      if (req.body.state !== milestone.state) milestone.closedAt = req.body.state === "closed" ? new Date() : undefined;
      milestone.state = req.body.state;
    }
    const datesChanged = milestone.isModified("startDate") || milestone.isModified("dueDate");
    await milestone.save();
    // A milestone's tasks follow its week, so employees see the new dates.
    if (datesChanged) {
      await Task.updateMany(
        { milestoneId: milestone._id, isDeleted: { $ne: true } },
        { $set: { startDate: milestone.startDate, deadline: milestone.dueDate, updatedAt: Date.now() } }
      );
      emitTeamUpdate(req.io, team, "tasks");
    }
    emitTeamUpdate(req.io, team, "milestones");
    res.json({ success: true, milestone: (await withCounts([milestone]))[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/milestone/:id: tasks are kept and just unlinked.
export const deleteMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return fail(res, [404, "Milestone not found"]);
    const { team, error } = await loadTeamFor(milestone.teamId, req.user, { manage: true });
    if (error) return fail(res, error);
    await Task.updateMany({ milestoneId: milestone._id }, { $unset: { milestoneId: 1 } });
    await milestone.deleteOne();
    emitTeamUpdate(req.io, team, "milestones");
    emitTeamUpdate(req.io, team, "tasks");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Used by task create/edit: milestone must exist and belong to the task's team.
export const resolveMilestoneId = async (milestoneId, teamId) => {
  if (milestoneId === undefined) return { value: undefined };
  if (!milestoneId) return { value: null };
  if (!mongoose.isValidObjectId(milestoneId)) return { error: "Invalid milestone" };
  const m = await Milestone.findById(milestoneId).select("teamId startDate dueDate");
  if (!m || String(m.teamId) !== String(teamId)) return { error: "Milestone isn't part of this team" };
  return { value: m._id, milestone: m };
};
