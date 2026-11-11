import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FaChevronDown } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";

// Expanded/collapsed state per section survives a refresh, and the section
// holding the current page always opens.
const storeKey = (label) => `sidebarSection:${label}`;
const readStored = (label) => {
  try {
    const v = localStorage.getItem(storeKey(label));
    return v === null ? null : v === "1";
  } catch {
    return null;
  }
};

const SidebarSection = ({ icon, label, links, defaultOpen = false, isDesktop, setIsOpen }) => {
  const { pathname } = useLocation();
  const holdsCurrentPage = links.some((l) => pathname === l.to || pathname.startsWith(`${l.to}/`));
  const [open, setOpen] = useState(() => holdsCurrentPage || (readStored(label) ?? defaultOpen));

  // Navigating into this section (e.g. from a dashboard link) opens it.
  useEffect(() => {
    if (holdsCurrentPage) setOpen(true);
  }, [holdsCurrentPage]);

  const toggle = () =>
    setOpen((o) => {
      try { localStorage.setItem(storeKey(label), o ? "0" : "1"); } catch { /* storage unavailable */ }
      return !o;
    });

  return (
    <div className="space-y-1">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 py-2.5 px-3.5 rounded-lg text-sm font-medium text-brand-100/80 hover:bg-white/10 hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <span className="text-base">{icon}</span>
        <span>{label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-auto text-xs opacity-70"
        >
          <FaChevronDown />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-3 space-y-1 overflow-hidden border-l border-white/10 pl-3"
          >
            {links.map((link, idx) => (
              <NavLink
                key={idx}
                to={link.to}
                end={link.end}
                // Picking a page closes the sidebar (desktop and phone); the
                // closed state is remembered across refreshes (useSidebarState).
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 py-2 px-3 rounded-lg text-sm transition-colors duration-150 ${
                    isActive
                      ? "bg-accent-500 text-white shadow-sm"
                      : "text-brand-100/70 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <span className="text-sm">{link.icon}</span>
                <span>{link.label}</span>
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SidebarSection;
