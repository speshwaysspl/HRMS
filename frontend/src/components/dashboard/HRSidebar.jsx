import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FaTimes,
  FaCogs,
  FaClipboardList,
  FaTachometerAlt,
  FaUsers,
  FaUserCheck,
  FaRegMoon,
  FaSun,
  FaCalendarAlt,
  FaSignOutAlt,
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { toggleDarkMode } from "../../redux/slices/recruitmentSlice";
import SidebarSection from "./SidebarSection";
import brandLogo from "../../assets/logo.jpg";

const HRSidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const dispatch = useDispatch();
  const darkMode = useSelector((state) => state.recruitment.darkMode);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  const topLink = { to: "/hr-dashboard", label: "Dashboard Overview", icon: <FaTachometerAlt />, end: true };

  const sections = [
    {
      key: "recruitment",
      label: "Recruitment",
      icon: <FaUsers />,
      links: [
        { to: "/hr-dashboard/candidates", label: "Candidates", icon: <FaUsers /> },
        { to: "/hr-dashboard/interviews", label: "Interviews", icon: <FaCalendarAlt /> },
      ],
    },
    {
      key: "pre-onboarding",
      label: "Pre-Onboarding",
      icon: <FaClipboardList />,
      links: [
        { to: "/hr-dashboard/profiles", label: "Candidate Profiles", icon: <FaClipboardList /> },
        { to: "/hr-dashboard/offer", label: "Ready For Offer", icon: <FaUserCheck /> },
      ],
    },
    {
      key: "settings",
      label: "Settings",
      icon: <FaCogs />,
      links: [
        { to: "/hr-dashboard/settings", label: "General Settings", icon: <FaCogs /> },
        { to: "/hr-dashboard/report-settings", label: "Report Settings", icon: <FaCogs /> },
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
      if (!isDesktop && isOpen && !e.target.closest(".hr-sidebar-container")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDesktop, isOpen, setIsOpen]);

  const topLinkClass = ({ isActive }) =>
    `flex items-center gap-3 py-2.5 px-3.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
      isActive
        ? "bg-accent-500 text-white shadow-sm"
        : "text-brand-100/80 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <>
      <div
        className={`hr-sidebar-container bg-brand-800 text-white h-screen fixed top-0 left-0 bottom-0 shadow-panel w-64 z-40 flex flex-col transform transition-transform duration-200 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="bg-brand-900 h-16 flex items-center justify-between px-5 gap-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={brandLogo}
              alt="Logo"
              loading="lazy"
              width="36"
              height="36"
              className="w-9 h-9 rounded-md object-cover flex-shrink-0"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <h1 className="text-white font-semibold text-base tracking-wide truncate">Recruitment</h1>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => dispatch(toggleDarkMode())}
              className="text-brand-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Toggle Theme"
            >
              {darkMode ? <FaSun size={14} /> : <FaRegMoon size={14} />}
            </button>
            <button
              className="text-brand-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors md:hidden"
              aria-label="Close menu"
              onClick={() => setIsOpen(false)}
            >
              <FaTimes size={16} />
            </button>
          </div>
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
              defaultOpen={section.key !== "settings"}
              isDesktop={isDesktop}
              setIsOpen={setIsOpen}
            />
          ))}
        </div>

        <div className="p-4 border-t border-white/10 bg-brand-900 flex items-center flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-white font-semibold text-xs uppercase flex-shrink-0">
            {user?.name?.substring(0, 2) || "HR"}
          </div>
          <div className="ml-3 truncate min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-brand-200 truncate">HR Manager</p>
          </div>
          <button
            onClick={logout}
            className="ml-2 p-2 rounded-lg text-brand-200 hover:text-red-300 hover:bg-red-500/10 transition-colors flex-shrink-0"
            aria-label="Logout"
            title="Logout"
          >
            <FaSignOutAlt size={16} />
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

export default HRSidebar;
