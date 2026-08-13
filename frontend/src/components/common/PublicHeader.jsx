import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/contact", label: "Contact" },
  { to: "/terms-and-conditions", label: "Terms" },
  { to: "/privacy-policy", label: "Privacy Policy" },
];

const PublicHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-brand-900 sticky top-0 left-0 right-0 z-40">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3">
          <img src="/images/Logo.jpg" alt="Speshway HRMS" width="40" height="40" className="h-10 w-auto rounded-lg" />
          <span className="text-lg font-semibold text-white tracking-wide hidden sm:block">SPESHWAY HRMS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-white/90 font-medium text-sm">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="hover:text-accent-500 transition-colors">
              {link.label}
            </Link>
          ))}
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-700 text-white font-semibold transition-colors"
          >
            Login
          </Link>
        </nav>

        <button
          onClick={() => setMenuOpen(true)}
          className="md:hidden text-white p-2 -mr-2"
          aria-label="Open menu"
        >
          <FiMenu size={22} />
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col bg-brand-900">
          <div className="flex justify-between items-center px-4 py-3">
            <Link to="/" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
              <img src="/images/Logo.jpg" alt="Speshway HRMS" width="40" height="40" className="h-10 w-auto rounded-lg" />
              <span className="text-lg font-semibold text-white tracking-wide">SPESHWAY HRMS</span>
            </Link>
            <button onClick={() => setMenuOpen(false)} className="text-white p-2" aria-label="Close menu">
              <FiX size={22} />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white text-lg font-semibold px-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="w-full py-3.5 rounded-lg text-center bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="w-full py-3.5 rounded-lg text-center bg-accent-600 hover:bg-accent-700 transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicHeader;
