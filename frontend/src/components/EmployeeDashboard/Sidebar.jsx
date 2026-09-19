import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  FaBuilding,
  FaCalendarAlt,
  FaCogs,
  FaMoneyBillWave,
  FaTachometerAlt,
  FaUsers,
  FaTimes,
  FaComments,
  FaClipboardList,
  FaUserTie,
  FaSignOutAlt,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import SidebarSection from "../dashboard/SidebarSection";
import brandLogo from "../../assets/logo.jpg";

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const userRoles = Array.isArray(user?.role) ? user.role : [user?.role];
  const isTeamLead = userRoles.includes("team_lead");

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!isDesktop && isOpen && !e.target.closest('.sidebar-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDesktop, isOpen, setIsOpen]);

  useEffect(() => {
    if (!isDesktop && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDesktop, isOpen]);

  const topLinks = [
    { to: "/employee-dashboard", label: "Dashboard", icon: <FaTachometerAlt />, end: true },
    { to: `/employee-dashboard/profile/${user?._id}`, label: "My Profile", icon: <FaUsers /> },
    { to: `/employee-dashboard/salary/${user?._id}`, label: "Salary", icon: <FaMoneyBillWave /> },
  ];

  const bottomLinks = [
    { to: "/employee-dashboard/setting", label: "Settings", icon: <FaCogs /> },
  ];

  const sections = [
    {
      key: "leave-attendance",
      label: "Leave & Attendance",
      icon: <FaCalendarAlt />,
      links: [
        { to: `/employee-dashboard/leaves/${user?._id}`, label: "Leaves", icon: <FaBuilding /> },
        { to: "/employee-dashboard/attendance", label: "Attendance", icon: <FaCalendarAlt /> },
        { to: "/employee-dashboard/attendance-report", label: "Attendance Report", icon: <FaCalendarAlt /> },
        { to: "/employee-dashboard/calendar", label: "Calendar", icon: <FaCalendarAlt /> },
      ],
    },
    {
      key: "work",
      label: "Work",
      icon: <FaClipboardList />,
      links: [
        { to: "/employee-dashboard/tasks", label: "My Tasks", icon: <FaClipboardList /> },
        { to: "/employee-dashboard/my-reviews", label: "My Reviews", icon: <FaClipboardList /> },
      ],
    },
    {
      key: "communication",
      label: "Communication",
      icon: <FaComments />,
      links: [
        { to: "/employee-dashboard/announcements", label: "Announcements", icon: <FaComments /> },
        { to: "/employee-dashboard/feedback", label: "Feedback", icon: <FaComments /> },
      ],
    },
    ...(isTeamLead
      ? [
          {
            key: "team-lead",
            label: "Team Lead",
            icon: <FaUserTie />,
            links: [
              { to: "/employee-dashboard/team/teams", label: "My Teams", icon: <FaUsers /> },
              { to: "/employee-dashboard/team/approvals", label: "Attendance Approvals", icon: <FaCalendarAlt /> },
              { to: "/employee-dashboard/team/reviews", label: "Team Reviews", icon: <FaClipboardList /> },
            ],
          },
        ]
      : []),
  ];

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
        <div className="bg-brand-900 h-16 flex items-center px-5 gap-3 border-b border-white/10 flex-shrink-0">
          <img
            src={brandLogo}
            alt="Company Logo"
            loading="lazy"
            width="36"
            height="36"
            className="w-9 h-9 rounded-md object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
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
          {topLinks.map((link, idx) => (
            <NavLink
              key={idx}
              to={link.to}
              end={link.end}
              className={topLinkClass}
              onClick={() => setIsOpen(false)}
            >
              <span className="text-base">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}

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

          {bottomLinks.map((link, idx) => (
            <NavLink
              key={idx}
              to={link.to}
              end={link.end}
              className={topLinkClass}
              onClick={() => setIsOpen(false)}
            >
              <span className="text-base">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
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

export default Sidebar;
