import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaChevronDown,
  FaCogs,
  FaClipboardList,
  FaTachometerAlt,
  FaUsers,
  FaUserCheck,
  FaFileUpload,
  FaUserShield,
  FaBell,
  FaChartBar,
  FaRegMoon,
  FaSun,
  FaCalendarAlt
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { toggleDarkMode } from "../../redux/slices/recruitmentSlice";
import { motion, AnimatePresence } from "framer-motion";

const HRSidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const dispatch = useDispatch();
  const darkMode = useSelector((state) => state.recruitment.darkMode);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [recruitmentOpen, setRecruitmentOpen] = useState(true);
  const [preOnboardOpen, setPreOnboardOpen] = useState(true);

  const links = [
    { to: "/hr-dashboard", label: "Dashboard Overview", icon: <FaTachometerAlt />, end: true }
  ];

  const recruitmentLinks = [
    { to: "/hr-dashboard/candidates", label: "Candidates", icon: <FaUsers /> },
    { to: "/hr-dashboard/interviews", label: "Interviews", icon: <FaCalendarAlt /> }
  ];

  const preOnboardingLinks = [
    { to: "/hr-dashboard/profiles", label: "Candidate Profiles", icon: <FaClipboardList /> },
    { to: "/hr-dashboard/offer", label: "Ready For Offer", icon: <FaUserCheck /> }
  ];

  useEffect(() => {
    const handleResize = () => {
      const newIsDesktop = window.innerWidth >= 768;
      setIsDesktop(newIsDesktop);
      if (newIsDesktop) setIsOpen(false);
    };
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
  }, [isDesktop, isOpen]);

  return (
    <>
      {/* Hamburger Button - hidden when sidebar is open */}
      {!isOpen && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-[60] p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
        >
          <FaBars size={20} />
        </motion.button>
      )}

      <motion.div
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
        className={`hr-sidebar-container backdrop-blur-xl bg-slate-900/90 border-r border-slate-800 text-slate-100 h-screen fixed top-0 left-0 bottom-0 shadow-2xl w-64 z-50 flex flex-col`}
      >
        {/* Header (Clickable) */}
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="cursor-pointer bg-gradient-to-r from-blue-600 via-indigo-700 to-violet-600 h-16 flex items-center justify-between px-5 shadow-lg hover:from-blue-700 hover:via-indigo-800 hover:to-violet-700 transition-all duration-300"
        >
          <div className="flex items-center">
            <img
              src="/images/Logo.jpg"
              alt="Logo"
              className="w-10 h-10 rounded-full border border-white/20 mr-3 shadow-md"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <h1 className="text-white font-bold text-lg tracking-wider">Recruitment</h1>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); dispatch(toggleDarkMode()); }}
            className="text-white/80 hover:text-white p-1.5 rounded-lg bg-white/10"
            title="Toggle Theme"
          >
            {darkMode ? <FaSun size={15} /> : <FaRegMoon size={15} />}
          </button>
        </div>

        {/* Links Navigation */}
        <div className="px-4 mt-6 space-y-2 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {links.map((link, idx) => (
            <NavLink
              key={idx}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center space-x-3 py-2.5 px-4 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "hover:bg-slate-800 text-slate-300 hover:text-white"
                }`
              }
              onClick={() => setIsOpen(false)} // auto-close always
            >
              <span className="text-lg">{link.icon}</span>
              <span className="text-sm font-semibold tracking-wide">{link.label}</span>
            </NavLink>
          ))}

          {/* Recruitment Collapsible */}
          <div className="space-y-1">
            <button
              onClick={() => setRecruitmentOpen(!recruitmentOpen)}
              className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
            >
              <div className="flex items-center space-x-3">
                <FaUsers className="text-lg text-blue-400" />
                <span className="text-sm font-semibold tracking-wide">Recruitment</span>
              </div>
              <motion.span animate={{ rotate: recruitmentOpen ? 180 : 0 }}>
                <FaChevronDown size={12} />
              </motion.span>
            </button>

            <AnimatePresence>
              {recruitmentOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pl-4 space-y-1"
                >
                  {recruitmentLinks.map((subLink, subIdx) => (
                    <NavLink
                      key={subIdx}
                      to={subLink.to}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 py-2 px-3 rounded-lg text-sm transition-all ${
                          isActive ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`
                      }
                      onClick={() => setIsOpen(false)} // auto-close always
                    >
                      <span>{subLink.icon}</span>
                      <span>{subLink.label}</span>
                    </NavLink>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pre-Onboarding Collapsible */}
          <div className="space-y-1">
            <button
              onClick={() => setPreOnboardOpen(!preOnboardOpen)}
              className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
            >
              <div className="flex items-center space-x-3">
                <FaClipboardList className="text-lg text-emerald-400" />
                <span className="text-sm font-semibold tracking-wide">Pre-Onboarding</span>
              </div>
              <motion.span animate={{ rotate: preOnboardOpen ? 180 : 0 }}>
                <FaChevronDown size={12} />
              </motion.span>
            </button>

            <AnimatePresence>
              {preOnboardOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pl-4 space-y-1"
                >
                  {preOnboardingLinks.map((subLink, subIdx) => (
                    <NavLink
                      key={subIdx}
                      to={subLink.to}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 py-2 px-3 rounded-lg text-sm transition-all ${
                          isActive ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`
                      }
                      onClick={() => setIsOpen(false)} // auto-close always
                    >
                      <span>{subLink.icon}</span>
                      <span>{subLink.label}</span>
                    </NavLink>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* General Links */}
          <NavLink
            to="/hr-dashboard/settings"
            className={({ isActive }) =>
              `flex items-center space-x-3 py-2.5 px-4 rounded-xl transition-all ${
                isActive ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-300 hover:text-white"
              }`
            }
            onClick={() => setIsOpen(false)} // auto-close always
          >
            <FaCogs className="text-lg" />
            <span className="text-sm font-semibold tracking-wide">Settings</span>
          </NavLink>

          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white mt-8 shadow-lg shadow-red-600/10"
          >
            <FaSignOutAlt className="text-lg" />
            <span className="text-sm font-semibold tracking-wide">Logout</span>
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-inner">
            {user?.name?.substring(0, 2) || "HR"}
          </div>
          <div className="ml-3 truncate">
            <p className="text-sm font-bold text-slate-200 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">HR Manager</p>
          </div>
        </div>
      </motion.div>

      {!isDesktop && isOpen && (
        <AnimatePresence>
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setIsOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        </AnimatePresence>
      )}
    </>
  );
};

export default HRSidebar;
