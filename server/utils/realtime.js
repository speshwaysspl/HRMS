import mongoose from "mongoose";
import { createAdapter } from "@socket.io/mongo-adapter";
import Team from "../models/Team.js";
import Employee from "../models/Employee.js";

// Several server processes share one database (deployed server, local dev, …).
// Without this, a write handled by one process only reaches sockets connected
// to that same process: e.g. a check-in from the mobile app (deployed server)
// never refreshed a web page served by another. The Mongo adapter relays every
// emit through a capped collection so all processes deliver it.
export const attachSharedAdapter = async (io) => {
  try {
    const db = mongoose.connection.db;
    const name = "socket_io_events";
    const exists = await db.listCollections({ name }).hasNext();
    if (!exists) await db.createCollection(name, { capped: true, size: 1e6 });
    io.adapter(createAdapter(db.collection(name)));
    console.log("🔁 Socket.IO events shared across server processes");
  } catch (err) {
    // Single-process delivery still works; only cross-process relay is lost.
    console.error("Socket.IO Mongo adapter failed:", err.message);
  }
};

// Live-refresh signals for team screens (task list, members, attendance, team list).
// Clients join `user_<id>` on connect; admins additionally join `role_admin` (see index.js).
// Payload is a hint only ({ teamId, kind }); clients refetch through the normal
// authorized REST endpoints, so no data leaks over the socket.
export const emitTeamUpdate = async (io, teamOrId, kind) => {
  if (!io || !teamOrId) return;
  try {
    const team =
      typeof teamOrId === "object" && teamOrId.members
        ? teamOrId
        : await Team.findById(teamOrId).select("leadId members");
    if (!team) return;

    const empIds = (team.members || []).map((m) => m.employeeId?._id || m.employeeId).filter(Boolean);
    const emps = empIds.length ? await Employee.find({ _id: { $in: empIds } }).select("userId") : [];
    const userIds = new Set(emps.map((e) => String(e.userId?._id || e.userId)).filter(Boolean));
    if (team.leadId) userIds.add(String(team.leadId._id || team.leadId));

    const payload = { teamId: String(team._id), kind, at: Date.now() };
    let target = io.to("role_admin");
    for (const id of userIds) target = target.to(`user_${id}`);
    target.emit("team:updated", payload);
  } catch (err) {
    console.error("emitTeamUpdate failed:", err.message);
  }
};

// Generic live-refresh hint for every other screen: after any successful write
// under /api/<resource>, broadcast `data:changed` { resource }. Like team:updated
// it carries no data — clients refetch through their normal authorized endpoints.
// Auth/account/notification writes are excluded (per-user, or already pushed via
// newNotification); daily-quote keeps its own event.
const SKIP_RESOURCES = new Set(["auth", "account", "notifications"]);
// Writes that change data other screens show under a different name.
const ALSO_CHANGES = {
  "attendance-regularization": ["attendance"],
  "leave-types": ["leave"],
  "payroll-template": ["payslip"],
  milestone: ["task"],
  task: ["dashboard"],
  leave: ["dashboard", "attendance"],
  attendance: ["dashboard"],
  employee: ["dashboard"],
  candidates: ["recruitment", "hr-dashboard"],
  recruitment: ["hr-dashboard"],
  onboarding: ["hr-dashboard", "recruitment"],
  offers: ["hr-dashboard", "onboarding"],
  appointments: ["hr-dashboard", "onboarding"],
  document: ["hr-dashboard"],
};

export const liveDataMiddleware = (io) => (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const resource = req.originalUrl.split("?")[0].split("/")[2];
  if (!resource || SKIP_RESOURCES.has(resource)) return next();
  res.on("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    const at = Date.now();
    for (const r of [resource, ...(ALSO_CHANGES[resource] || [])]) {
      io.emit("data:changed", { resource: r, at });
    }
  });
  next();
};
