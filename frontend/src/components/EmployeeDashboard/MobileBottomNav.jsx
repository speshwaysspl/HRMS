import React from "react";
import { NavLink } from "react-router-dom";
import { FaUmbrellaBeach, FaCalendarCheck, FaHome, FaTasks, FaUser } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

/**
 * Mobile-only bottom tab bar for the employee experience — mirrors the
 * Flutter mobile app's 5-tab layout (Leaves / Attendance / Home / Tasks /
 * Profile) so the web app feels the same on a phone. The hamburger menu +
 * sidebar drawer stay available for everything else (Salary, Announcements,
 * Team Lead sections, etc.), matching how the mobile app pairs a bottom bar
 * with a side drawer for "more" links. Hidden on md+ (desktop keeps the
 * sidebar as primary navigation).
 */
const MobileBottomNav = () => {
  const { user } = useAuth();

  const tabs = [
    { to: "/employee-dashboard/leaves/" + (user?._id || ""), label: "Leaves", icon: FaUmbrellaBeach },
    { to: "/employee-dashboard/attendance", label: "Attendance", icon: FaCalendarCheck },
    { to: "/employee-dashboard", label: "Home", icon: FaHome, end: true, center: true },
    { to: "/employee-dashboard/tasks", label: "Tasks", icon: FaTasks },
    { to: "/employee-dashboard/profile/" + (user?._id || ""), label: "Profile", icon: FaUser },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-brand-900 rounded-t-2xl shadow-panel"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch justify-around px-1 pt-1.5 pb-1.5">
        {tabs.map(({ to, label, icon: Icon, end, center }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className="flex-1 flex flex-col items-center justify-end gap-1 py-1"
          >
            {({ isActive }) =>
              center ? (
                <>
                  <span
                    className={`flex items-center justify-center w-11 h-11 rounded-full transition-colors ${
                      isActive ? "bg-white text-brand-900 shadow-card" : "bg-white/10 text-white/70"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className={`text-[11px] font-medium ${isActive ? "text-white" : "text-white/60"}`}>
                    {label}
                  </span>
                </>
              ) : (
                <>
                  <Icon size={18} className={isActive ? "text-white" : "text-white/60"} />
                  <span className={`text-[11px] font-medium ${isActive ? "text-white" : "text-white/60"}`}>
                    {label}
                  </span>
                </>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
