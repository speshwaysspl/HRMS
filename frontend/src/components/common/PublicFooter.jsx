import React from "react";
import { Link } from "react-router-dom";

const PublicFooter = () => (
  <footer className="bg-brand-900 border-t border-white/10">
    <div className="container mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <img src="/images/Logo.jpg" alt="Speshway HRMS" width="32" height="32" className="h-8 w-auto rounded-md" />
          <span className="text-white font-semibold tracking-wide">SPESHWAY HRMS</span>
        </div>
        <p className="text-white/60 text-sm leading-relaxed">
          Unified HR management for attendance, leave, payroll, recruitment and performance.
        </p>
      </div>

      <div>
        <h4 className="text-white text-sm font-semibold uppercase tracking-wide mb-3">Company</h4>
        <ul className="space-y-2 text-sm">
          <li><Link to="/" className="text-white/60 hover:text-accent-500 transition-colors">Home</Link></li>
          <li><Link to="/contact" className="text-white/60 hover:text-accent-500 transition-colors">Contact</Link></li>
          <li><Link to="/login" className="text-white/60 hover:text-accent-500 transition-colors">Login</Link></li>
        </ul>
      </div>

      <div>
        <h4 className="text-white text-sm font-semibold uppercase tracking-wide mb-3">Legal</h4>
        <ul className="space-y-2 text-sm">
          <li><Link to="/terms-and-conditions" className="text-white/60 hover:text-accent-500 transition-colors">Terms &amp; Conditions</Link></li>
          <li><Link to="/privacy-policy" className="text-white/60 hover:text-accent-500 transition-colors">Privacy Policy</Link></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-white/10 py-4 text-center text-white/50 text-xs">
      &copy; {new Date().getFullYear()} Speshway Solutions Pvt. Ltd. All rights reserved.
    </div>
  </footer>
);

export default PublicFooter;
