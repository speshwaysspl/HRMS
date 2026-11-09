// Server-side access helpers. Permissions are decided from the logged-in user
// loaded from the database (req.user), never from roles/ids sent by the client.
import Employee from "../models/Employee.js";

export const rolesOf = (user) => [].concat(user?.role || []);
export const hasAnyRole = (user, ...roles) => rolesOf(user).some((r) => roles.includes(r));
export const isAdminOrHr = (user) => hasAnyRole(user, "admin", "hr");

export const forbid = (res, msg = "You do not have permission to access this resource") =>
  res.status(403).json({ success: false, error: msg });

// The Employee record of the logged-in user (null for users without one).
export const myEmployee = (req) => Employee.findOne({ userId: req.user._id }).select("_id employeeId userId");

export const sameId = (a, b) => a != null && b != null && String(a?._id ?? a) === String(b?._id ?? b);
