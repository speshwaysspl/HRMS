import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  FaBuilding,
  FaCalendarAlt,
  FaCogs,
  FaMoneyBillWave,
  FaTachometerAlt,
  FaUsers,
  FaBullhorn,
  FaTimes,
  FaClipboardCheck,
  FaSignOutAlt,
} from "react-icons/fa";
import SidebarSection from "./SidebarSection";
import brandLogo from "../../assets/logo.jpg";
import { useAuth } from "../../context/AuthContext";

const AdminSidebar = ({ isOpen, setIsOpen }) => {
  const { logout } = useAuth();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  const topLink = { to: "/admin-dashboard", label: "Dashboard Overview", icon: <FaTachometerAlt />, end: true };

  const sections = [
    {
      key: "workforce",
      label: "Workforce",
      icon: <FaUsers />,
      links: [
        { to: "/admin-dashboard/employees", label: "Manage Employees", icon: <FaUsers /> },
        { to: "/admin-dashboard/teams", label: "Manage Teams", icon: <FaUsers /> },
        { to: "/admin-dashboard/departments", label: "Manage Departments", icon: <FaBuilding /> },
      ],
    },
    {
      key: "leave-attendance",
      label: "Leave & Attendance",
      icon: <FaCalendarAlt />,
      links: [
        { to: "/admin-dashboard/leaves", label: "Leaves", icon: <FaCalendarAlt /> },
        { to: "/admin-dashboard/leave-types", label: "Leave Types", icon: <FaCalendarAlt /> },
        { to: "/admin-dashboard/calendar", label: "Calendar", icon: <FaCalendarAlt /> },
        { to: "/admin-dashboard/attendance-report", label: "Attendance Report", icon: <FaCalendarAlt /> },
        { to: "/admin-dashboard/attendance-approvals", label: "Attendance Approvals", icon: <FaCalendarAlt /> },
      ],
    },
    {
      key: "payroll",
      label: "Payroll",
      icon: <FaMoneyBillWave />,
      links: [
        { to: "/admin-dashboard/salary/template-manager", label: "Payroll Templates", icon: <FaMoneyBillWave /> },
        { to: "/admin-dashboard/salary/payslip-generator", label: "Generate Payslip", icon: <FaMoneyBillWave /> },
        { to: "/admin-dashboard/salary/generate-by-days", label: "Generate Payslip (Custom Days)", icon: <FaMoneyBillWave /> },
        { to: "/admin-dashboard/salary/payslip-history", label: "Payslip History", icon: <FaMoneyBillWave /> },
      ],
    },
    {
      key: "performance",
      label: "Performance",
      icon: <FaClipboardCheck />,
      links: [
        { to: "/admin-dashboard/team-reviews", label: "Performance Reviews", icon: <FaClipboardCheck /> },
        { to: "/admin-dashboard/feedback", label: "Feedback Management", icon: <FaClipboardCheck /> },
      ],
    },
    {
      key: "communication",
      label: "Communication",
      icon: <FaBullhorn />,
      links: [
        { to: "/admin-dashboard/announcements", label: "Announcements", icon: <FaBullhorn /> },
        { to: "/admin-dashboard/daily-quote", label: "Daily Quote", icon: <FaBullhorn /> },
      ],
    },
    {
      key: "settings",
      label: "Settings",
      icon: <FaCogs />,
      links: [
        { to: "/admin-dashboard/setting", label: "General Settings", icon: <FaCogs /> },
        { to: "/admin-dashboard/report-settings", label: "Report Settings", icon: <FaCogs /> },
      ],
    },
  ];

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!isDesktop && isOpen && !e.target.closest(".sidebar-container")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDesktop, isOpen, setIsOpen]);

  useEffect(() => {
    if (!isDesktop && isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDesktop, isOpen]);

  const topLinkClass = ({ isActive }) =>
    `flex items-center gap-3 py-2.5 px-3.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
      isActive
        ? "bg-accent-500 text-white shadow-sm"
        : "text-brand-100/80 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <>
      <div
        className={`sidebar-container bg-brand-800 text-white fixed top-0 left-0 bottom-0 shadow-panel w-64 z-50 flex flex-col transform transition-transform duration-200 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center px-5 gap-3 border-b border-white/10 flex-shrink-0">
          <img
            src={brandLogo}
            alt="Company Logo"
            loading="lazy"
            width="36"
            height="36"
            className="w-9 h-9 rounded-md object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <h1 className="text-white font-semibold text-base tracking-wide">HRMS Portal</h1>
          <button
            className="ml-auto text-brand-200 hover:text-white transition-colors md:hidden"
            aria-label="Close menu"
            onClick={() => setIsOpen(false)}
          >
            <FaTimes size={16} />
          </button>
        </div>

        <div className="px-3 mt-4 space-y-1 flex-1 overflow-y-auto scrollbar-hide">
          <NavLink
            to={topLink.to}
            end={topLink.end}
            className={topLinkClass}
            onClick={() => setIsOpen(false)}
          >
            <span className="text-base">{topLink.icon}</span>
            <span>{topLink.label}</span>
          </NavLink>

          {sections.map((section) => (
            <SidebarSection
              key={section.key}
              icon={section.icon}
              label={section.label}
              links={section.links}
              isDesktop={isDesktop}
              setIsOpen={setIsOpen}
            />
          ))}
        </div>

        <div className="px-3 py-3 border-t border-white/10 flex-shrink-0">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 py-2.5 px-3.5 rounded-lg text-sm font-medium text-brand-100/80 hover:bg-red-500/10 hover:text-red-300 transition-colors duration-150"
          >
            <FaSignOutAlt className="text-base" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {!isDesktop && isOpen && (
        <div
          className="fixed inset-0 bg-brand-950/60 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default AdminSidebar;
