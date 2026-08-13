export const getDashboardBasePath = (role) => {
  const roles = Array.isArray(role) ? role : [role];
  if (roles.includes("admin")) return "/admin-dashboard";
  if (roles.includes("hr")) return "/hr-dashboard";
  if (roles.includes("candidate")) return "/candidate-dashboard";
  return "/employee-dashboard";
};
