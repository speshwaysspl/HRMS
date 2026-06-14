/**
 * Middleware to restrict route access based on user roles
 * @param  {...string} allowedRoles Roles that are permitted to access the route
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized: User not authenticated" });
    }
    
    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const hasRole = userRoles.some(role => allowedRoles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ success: false, error: "Forbidden: You do not have permission to perform this action" });
    }
    
    next();
  };
};

export default authorizeRoles;
