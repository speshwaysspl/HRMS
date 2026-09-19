import React from "react";
import { NavLink } from "react-router-dom";
import { FaUmbrellaBeach, FaHome, FaUserCog, FaUsers } from "react-icons/fa";

/**
 * Mobile-only bottom tab bar for the admin dashboard — mirrors the Flutter
 * mobile app's admin tab layout (Home / Leaves / Employees / Profile).
 * The hamburger + sidebar drawer stay available for everything else
 * (Departments, Payroll, Announcements, etc.), same pairing the mobile app
 * uses (bottom tabs + drawer). Hidden on md+ (desktop keeps the sidebar as
 * primary navigation).
 */
const AdminMobileBottomNav = () => {
  const tabs = [
    { to: "/admin-dashboard/leaves", label: "Leaves", icon: FaUmbrellaBeach },
    { to: "/admin-dashboard", label: "Home", icon: FaHome, end: true, center: true },
    { to: "/admin-dashboard/employees", label: "Employees", icon: FaUsers },
    { to: "/admin-dashboard/setting", label: "Settings", icon: FaUserCog },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-surface-subtle rounded-t-2xl shadow-panel"
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
                      isActive ? "bg-brand-600 text-white shadow-card" : "bg-surface-muted text-ink-muted"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className={`text-[11px] font-medium ${isActive ? "text-brand-700" : "text-ink-faint"}`}>
                    {label}
                  </span>
                </>
              ) : (
                <>
                  <Icon size={18} className={isActive ? "text-brand-600" : "text-ink-faint"} />
                  <span className={`text-[11px] font-medium ${isActive ? "text-brand-700" : "text-ink-faint"}`}>
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

export default AdminMobileBottomNav;
