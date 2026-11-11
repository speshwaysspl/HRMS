// Who manages whom. Managers are the leads of the employee's teams (Teams
// screen). The old per-employee "Reports To" field is no longer editable but
// existing links are still honoured, so nobody loses access they already had.
import Team from "../models/Team.js";
import Employee from "../models/Employee.js";

// User ids of everyone who manages this employee.
export const managerUserIdsFor = async (employee) => {
  const ids = new Set();
  const teams = await Team.find({ "members.employeeId": employee._id }).select("leadId").lean();
  for (const t of teams) if (t.leadId) ids.add(String(t.leadId));
  if (employee.reportsTo) {
    const legacy = await Employee.findById(employee.reportsTo).select("userId").lean();
    if (legacy?.userId) ids.add(String(legacy.userId));
  }
  return [...ids];
};

// Employee ids managed by this user (members of teams they lead, plus legacy direct reports).
export const managedEmployeeIds = async (userId) => {
  const ids = new Set();
  const teams = await Team.find({ leadId: userId }).select("members.employeeId").lean();
  for (const t of teams) for (const m of t.members || []) if (m.employeeId) ids.add(String(m.employeeId));
  const me = await Employee.findOne({ userId }).select("_id").lean();
  if (me) {
    const legacy = await Employee.find({ reportsTo: me._id }).select("_id").lean();
    for (const e of legacy) ids.add(String(e._id));
  }
  ids.delete(me ? String(me._id) : ""); // never manage yourself
  return [...ids];
};
