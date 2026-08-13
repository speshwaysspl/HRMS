import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FiChevronRight, FiHome } from "react-icons/fi";

const LABELS = {
  "admin-dashboard": "Dashboard",
  "hr-dashboard": "Dashboard",
  "employee-dashboard": "Dashboard",
  "candidate-dashboard": "Dashboard",
  employees: "Employees",
  teams: "Teams",
  departments: "Departments",
  leaves: "Leaves",
  calendar: "Calendar",
  "attendance-report": "Attendance Report",
  announcements: "Announcements",
  feedback: "Feedback",
  "daily-quote": "Daily Quote",
  setting: "Settings",
  salary: "Salary",
  "template-manager": "Payroll Templates",
  "payslip-generator": "Generate Payslip",
  "payslip-history": "Payslip History",
  candidates: "Candidates",
  recruitment: "Recruitment",
  add: "Add",
  edit: "Edit",
  notifications: "Notifications",
  attendance: "Attendance",
  profile: "Profile",
  tasks: "Tasks",
  documents: "Documents",
  team: "Team Lead",
  teams: "Teams",
  reviews: "Reviews",
  approvals: "Approvals",
};

// Routes whose URL doesn't nest under their logical parent list page
// (e.g. "add-employee" isn't under "employees") get a virtual crumb inserted.
const VIRTUAL_PARENTS = {
  "add-employee": { label: "Employees", segment: "employees" },
  "add-department": { label: "Departments", segment: "departments" },
  "create-team": { label: "Teams", segment: "teams" },
};

const isId = (segment) => /^[0-9a-fA-F]{24}$/.test(segment);

const toLabel = (segment) => {
  if (LABELS[segment]) return LABELS[segment];
  if (isId(segment)) return "Details";
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const Breadcrumbs = () => {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = [];
  segments.forEach((segment, idx) => {
    const prefix = segments.slice(0, idx).join("/");
    const virtualParent = VIRTUAL_PARENTS[segment];
    if (virtualParent) {
      crumbs.push({
        label: virtualParent.label,
        to: "/" + [prefix, virtualParent.segment].filter(Boolean).join("/"),
        isLast: false,
      });
    }
    crumbs.push({
      label: toLabel(segment),
      to: "/" + segments.slice(0, idx + 1).join("/"),
      isLast: idx === segments.length - 1,
    });
  });

  return (
    <nav className="flex items-center flex-wrap gap-1.5 text-sm text-ink-muted mb-4" aria-label="Breadcrumb">
      <Link to={crumbs[0].to} className="flex items-center gap-1 hover:text-brand-700 transition-colors">
        <FiHome size={14} />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.to} className="flex items-center gap-1.5">
          <FiChevronRight size={14} className="text-ink-faint" />
          {crumb.isLast ? (
            <span className="text-ink font-medium">{crumb.label}</span>
          ) : (
            <Link to={crumb.to} className="hover:text-brand-700 transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
