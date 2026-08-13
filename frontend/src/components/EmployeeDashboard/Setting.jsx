// src/components/forms/DepartmentForm.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import {
  FaPhone,
  FaEnvelope,
  FaLinkedin,
  FaGlobe,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";

const Setting = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  useMeta({
    title: "Settings — Speshway HRMS",
    description: "Update your account password and preferences.",
    keywords: "settings, account, HRMS",
    image: "/images/Logo.jpg",
    url: `${window.location.origin}/employee-dashboard/setting`,
    robots: "noindex,nofollow"
  });
  const [setting, setSetting] = useState({
    userId: user._id,
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [show, setShow] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSetting({ ...setting, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pwd = setting.newPassword || "";
    const confirm = setting.confirmPassword || "";
    const lengthOk = pwd.length >= 8 && pwd.length <= 18;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasDigit = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

    if (!lengthOk) {
      setError("New password must be 8–18 characters");
      return;
    }
    if (!(hasUpper && hasLower && hasDigit && hasSpecial)) {
      setError("New password must include uppercase, lowercase, number, and special character");
      return;
    }
    if ((setting.oldPassword || "") === pwd) {
      setError("Old and new password cannot be the same");
      return;
    }
    if (pwd !== confirm) {
      setError("❌ Passwords do not match");
      return;
    }

    try {
      const response = await axios.put(
        `${API_BASE}/api/setting/change-password`,
        setting,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      if (response.data.success) {
        setError("");
        setSuccess("Password updated successfully.");
        setSetting((prev) => ({
          ...prev,
          oldPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
      }
    } catch (error) {
      if (error.response && !error.response.data.success) {
        const msg = String(error.response.data.error || "");
        setError(msg.includes("wrong") ? "Wrong old password" : msg);
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-muted">
      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center p-3 sm:p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white p-4 sm:p-6 md:p-10 rounded-xl shadow-card border border-surface-subtle w-full max-w-lg relative overflow-hidden"
        >
          <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 md:mb-6 text-center text-ink relative z-10">
            Change Password
          </h2>

          {/* Animated Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                className="text-red-500 text-center mb-4 font-medium"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Animated Success */}
          <AnimatePresence>
            {success && (
              <motion.p
                className="text-green-600 text-center mb-4 font-medium"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                {success}
              </motion.p>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 relative z-10">
            {["oldPassword", "newPassword", "confirmPassword"].map((field, i) => (
              <motion.div
                key={field}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.2, duration: 0.5 }}
              >
                <label className="text-xs sm:text-sm font-medium text-ink-muted">
                  {field === "oldPassword"
                    ? "Old Password"
                    : field === "newPassword"
                    ? "New Password"
                    : "Confirm Password"}
                </label>
                <div className="relative">
                  <input
                    type={show[field] ? "text" : "password"}
                    name={field}
                    value={setting[field]}
                    placeholder={
                      field === "oldPassword"
                        ? "Enter old password"
                        : field === "newPassword"
                        ? "Enter new password"
                        : "Re-enter new password"
                    }
                    onChange={handleChange}
                    className="mt-1 w-full p-2 sm:p-3 text-sm sm:text-base border border-surface-subtle rounded-lg focus:ring-2 focus:ring-accent-500 outline-none transition pr-12 bg-white text-ink"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => ({ ...s, [field]: !s[field] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-brand-600 hover:text-brand-700"
                  >
                    {show[field] ? "Hide" : "Show"}
                  </button>
                </div>
              </motion.div>
            ))}

            {/* helper text removed per request */}

            <button
              type="submit"
              className="w-full mt-3 sm:mt-4 bg-accent-600 hover:bg-accent-700 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 text-sm sm:text-base rounded-lg transition-colors"
            >
              Update Password
            </button>
          </form>
        </motion.div>
      </div>

      {/* Footer */}
      <footer
        className="bg-brand-900 text-white py-6 sm:py-8 md:py-10 mt-6 sm:mt-8 md:mt-10"
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Contact Info */}
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold border-b border-white/20 pb-2">
              Contact Us
            </h2>
            <p className="flex items-center space-x-2 sm:space-x-3 text-sm sm:text-base text-white/85">
              <FaPhone className="text-accent-400 text-base sm:text-lg flex-shrink-0" />
              <span>+91 9154986733 || +91 9154986732</span>
            </p>
            <p className="flex items-center space-x-2 sm:space-x-3 text-sm sm:text-base text-white/85">
              <FaEnvelope className="text-accent-400 text-base sm:text-lg flex-shrink-0" />
              <span>support@speshwayhrms.com</span>
            </p>
            <p className="flex items-center space-x-2 sm:space-x-3 text-sm sm:text-base text-white/85">
              <FaLinkedin className="text-accent-400 text-base sm:text-lg flex-shrink-0" />
              <a
                href="https://www.linkedin.com/in/speshway-solutions-a59366248?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                target="_blank"
                rel="noreferrer"
                className="hover:underline break-all sm:break-normal"
              >
                linkedin.com/speshway-solutions
              </a>
            </p>
            <p className="flex items-center space-x-2 sm:space-x-3 text-sm sm:text-base text-white/85">
              <FaGlobe className="text-accent-400 text-base sm:text-lg flex-shrink-0" />
              <a
                href="https://speshway.com/"
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                www.speshway.com
              </a>
            </p>
          </div>

          {/* Address */}
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold border-b border-white/20 pb-2">
              Office Address
            </h2>
            <p className="flex items-start space-x-2 sm:space-x-3 text-sm sm:text-base text-white/85">
              <FaMapMarkerAlt className="text-accent-400 text-base sm:text-lg flex-shrink-0 mt-1" />
              <span className="leading-relaxed">
                Plot No 1/C, Syno 83/1, Raidurgam, Knowledge City Rd, Panmaktha
Hyderabad Telangana 500081.
              </span>
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="text-center text-white/60 text-xs sm:text-sm mt-6 sm:mt-8 border-t border-white/20 pt-3 sm:pt-4">
          © {new Date().getFullYear()} SPESHWAY SOLUTIONS PRIVATE LIMITED. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

export default Setting;
