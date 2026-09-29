import Team from "../models/Team.js";
import Employee from "../models/Employee.js";

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
