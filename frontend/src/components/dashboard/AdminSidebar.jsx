import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FaBuilding,
  FaCalendarAlt,
  FaCogs,
  FaMoneyBillWave,
  FaTachometerAlt,
  FaUsers,
  FaBullhorn,
  FaBars,
  FaTimes,
  FaChevronRight,
  FaChevronDown,
  FaSignOutAlt,
  FaFileInvoiceDollar,
  FaClipboardList,
  FaHistory,
} from "react-icons/fa";
import { AiOutlineFileText } from "react-icons/ai";
import { motion, AnimatePresence } from "framer-motion";

const AdminSidebar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [salaryDropdownOpen, setSalaryDropdownOpen] = useState(false);

  const links = [
    { to: "/admin-dashboard", label: "Dashboard", icon: <FaTachometerAlt />, end: true },
    { to: "/admin-dashboard/employees", label: "Employees", icon: <FaUsers /> },
    { to: "/admin-dashboard/departments", label: "Departments", icon: <FaBuilding /> },
    { to: "/admin-dashboard/leaves", label: "Leaves", icon: <FaCalendarAlt /> },
    { to: "/admin-dashboard/attendance-report", label: "Attendance Report", icon: <AiOutlineFileText /> },
    { to: "/admin-dashboard/announcements", label: "Announcements", icon: <FaBullhorn /> },
    { to: "/admin-dashboard/setting", label: "Settings", icon: <FaCogs /> },
  ];

  const salaryLinks = [
    { to: "/admin-dashboard/employees", label: "View Salary Records", icon: <FaClipboardList /> },
    { to: "/admin-dashboard/salary/payslip-generator", label: "Generate Payslip", icon: <FaFileInvoiceDollar /> },
    { to: "/admin-dashboard/salary/template-manager", label: "Manage Templates", icon: <FaClipboardList /> },
    { to: "/admin-dashboard/salary/payslip-history", label: "Payslip History", icon: <FaHistory /> },
  ];

  // Track window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const newIsDesktop = window.innerWidth >= 768;
      setIsDesktop(newIsDesktop);
      if (newIsDesktop) setIsOpen(false); // Close mobile menu when switching to desktop
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!isDesktop && isOpen && !e.target.closest('.sidebar-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDesktop, isOpen]);

  return (
    <>
      {/* Mobile Hamburger Button */}
      {!isDesktop && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-[60] p-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg shadow-lg md:hidden hover:from-teal-600 hover:to-cyan-600 transition-all duration-200"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
        </motion.button>
      )}

      {/* Sidebar */}
      <motion.div
        initial={{ x: isDesktop ? 0 : -300 }}
        animate={{ x: isDesktop ? 0 : isOpen ? 0 : -300 }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
        className={`sidebar-container backdrop-blur-lg bg-gradient-to-b from-gray-900/95 to-gray-800/95 border-r border-gray-700 text-white h-screen fixed top-0 left-0 bottom-0 shadow-2xl w-64 z-50 flex flex-col ${isDesktop ? 'translate-x-0' : ''}`}
      >
        {/* Header */}
       <div className="bg-gradient-to-r from-teal-500 to-cyan-500 h-16 flex items-center justify-center shadow-md px-5">
  {/* Logo Image */}
  <img 
    src="/images/Logo.jpg"
    alt="Company Logo" 
    className="w-12 h-12 rounded-full shadow-lg border-2 border-white mr-3"
    onError={(e) => {
      e.target.style.display = 'none';
      e.target.nextSibling.style.marginLeft = '0';
    }}
  />
  
  {/* Company Name */}
  <h1 className="text-white font-bold text-lg sm:text-xl">HR Portal</h1>
</div>


        {/* Links */}
        <div className={`px-4 ${isDesktop ? "mt-6" : "mt-6"} space-y-2 flex-1 overflow-y-auto scrollbar-hide`} style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          {links.map((link, idx) => (
            <NavLink
              key={idx}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `group relative flex items-center space-x-4 py-3 px-4 rounded-lg transition-all duration-500 
                 ${
                   isActive
                     ? "bg-gradient-to-r from-teal-500 to-green-500 text-white shadow-xl scale-105"
                     : "hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white"
                 }`
              }
              onClick={() => !isDesktop && setIsOpen(false)} // auto-close on mobile
            >
              <motion.span
                whileHover={{ scale: 1.3, rotate: 12 }}
                transition={{ type: "spring", stiffness: 250 }}
                className="text-xl"
              >
                {link.icon}
              </motion.span>
              <span className="text-sm font-semibold tracking-wide">
                {link.label}
              </span>
              <FaChevronRight className="ml-auto text-xs opacity-70" />
              {/* Animated Glow on Hover */}
              <motion.div
                className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100"
                initial={false}
                transition={{ duration: 0.3 }}
              />
            </NavLink>
          ))}

          {/* Salary Dropdown */}
          <div className="space-y-1">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSalaryDropdownOpen(!salaryDropdownOpen)}
              className="w-full group relative flex items-center space-x-4 py-3 px-4 rounded-lg transition-all duration-500 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white"
            >
              <motion.span
                whileHover={{ scale: 1.3, rotate: 12 }}
                transition={{ type: "spring", stiffness: 250 }}
                className="text-xl"
              >
                <FaMoneyBillWave />
              </motion.span>
              <span className="text-sm font-semibold tracking-wide">
                Salary Management
              </span>
              <motion.span
                animate={{ rotate: salaryDropdownOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto text-xs opacity-70"
              >
                {salaryDropdownOpen ? <FaChevronDown /> : <FaChevronRight />}
              </motion.span>
            </motion.button>

            <AnimatePresence>
              {salaryDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="ml-4 space-y-1 overflow-hidden"
                >
                  {salaryLinks.map((subLink, subIdx) => (
                    <NavLink
                      key={subIdx}
                      to={subLink.to}
                      className={({ isActive }) =>
                        `group relative flex items-center space-x-3 py-2 px-3 rounded-lg transition-all duration-300 text-sm
                         ${
                           isActive
                             ? "bg-gradient-to-r from-teal-400 to-green-400 text-white shadow-lg"
                             : "hover:bg-gradient-to-r hover:from-blue-400 hover:to-purple-400 hover:text-white text-gray-300"
                         }`
                      }
                      onClick={() => !isDesktop && setIsOpen(false)}
                    >
                      <span className="text-base">{subLink.icon}</span>
                      <span className="font-medium">{subLink.label}</span>
                    </NavLink>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logout Button - After Salary Management */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={logout}
            className="w-full group relative flex items-center space-x-4 py-3 px-4 rounded-lg transition-all duration-500 mt-4 bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl hover:from-red-600 hover:to-red-700"
          >
            <motion.span
              whileHover={{ scale: 1.3, rotate: 12 }}
              transition={{ type: "spring", stiffness: 250 }}
              className="text-xl"
            >
              <FaSignOutAlt />
            </motion.span>
            <span className="text-sm font-semibold tracking-wide">
              Logout
            </span>
            <FaChevronRight className="ml-auto text-xs opacity-70" />
          </motion.button>
        </div>
      </motion.div>

      {/* Dark overlay when sidebar open on mobile */}
      {!isDesktop && isOpen && (
        <AnimatePresence>
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setIsOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        </AnimatePresence>
      )}
    </>
  );
};

export default AdminSidebar;
