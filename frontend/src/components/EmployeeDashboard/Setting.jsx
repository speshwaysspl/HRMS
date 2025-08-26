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

const Setting = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [setting, setSetting] = useState({
    userId: user._id,
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSetting({ ...setting, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (setting.newPassword !== setting.confirmPassword) {
      setError("❌ Passwords do not match");
    } else {
      try {
        const response = await axios.put(
          `${API_BASE}/api/setting/change-password`,
          setting,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (response.data.success) {
          navigate("/admin-dashboard/employees");
          setError("");
        }
      } catch (error) {
        if (error.response && !error.response.data.success) {
          setError(error.response.data.error);
        }
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-100 via-teal-50 to-white">
      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center p-3 sm:p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="bg-white p-4 sm:p-6 md:p-10 rounded-2xl shadow-2xl border border-teal-100 w-full max-w-lg relative overflow-hidden"
        >
          {/* Floating background effect */}
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
            className="absolute -top-20 -right-20 w-64 h-64 bg-teal-100 rounded-full mix-blend-multiply filter blur-2xl opacity-40"
          />
          <motion.div
            animate={{ rotate: [0, -15, 15, 0] }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-100 rounded-full mix-blend-multiply filter blur-2xl opacity-40"
          />

          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-3 sm:mb-4 md:mb-6 text-center text-teal-700 relative z-10">
            🔒 Change Password
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

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 relative z-10">
            {["oldPassword", "newPassword", "confirmPassword"].map((field, i) => (
              <motion.div
                key={field}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.2, duration: 0.5 }}
              >
                <label className="text-xs sm:text-sm font-medium text-gray-600">
                  {field === "oldPassword"
                    ? "Old Password"
                    : field === "newPassword"
                    ? "New Password"
                    : "Confirm Password"}
                </label>
                <motion.input
                  type="password"
                  name={field}
                  placeholder={
                    field === "oldPassword"
                      ? "Enter old password"
                      : field === "newPassword"
                      ? "Enter new password"
                      : "Re-enter new password"
                  }
                  onChange={handleChange}
                  whileFocus={{ scale: 1.02, borderColor: "#14b8a6" }}
                  className="mt-1 w-full p-2 sm:p-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition"
                  required
                />
              </motion.div>
            ))}

            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "#0f766e" }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="w-full mt-3 sm:mt-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 text-sm sm:text-base rounded-lg shadow-md transition"
            >
              Update Password
            </motion.button>
          </form>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-6 sm:py-8 md:py-10 mt-6 sm:mt-8 md:mt-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Contact Info */}
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold border-b-2 border-gray-600 pb-2">
              Contact Us
            </h2>
            <p className="flex items-center space-x-2 sm:space-x-3 text-sm sm:text-base">
              <FaPhone className="text-teal-400 text-base sm:text-lg flex-shrink-0" />
              <span>+91 9100006020</span>
            </p>
            <p className="flex items-center space-x-2 sm:space-x-3 text-sm sm:text-base">
              <FaEnvelope className="text-indigo-400 text-base sm:text-lg flex-shrink-0" />
              <span>hr@speshway.com</span>
            </p>
            <p className="flex items-center space-x-2 sm:space-x-3 text-sm sm:text-base">
              <FaLinkedin className="text-blue-500 text-base sm:text-lg flex-shrink-0" />
              <a
                href="https://www.linkedin.com/in/speshway-solutions-a59366248?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                target="_blank"
                rel="noreferrer"
                className="hover:underline break-all sm:break-normal"
              >
                linkedin.com/speshway-solutions
              </a>
            </p>
            <p className="flex items-center space-x-2 sm:space-x-3 text-sm sm:text-base">
              <FaGlobe className="text-green-400 text-base sm:text-lg flex-shrink-0" />
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
            <h2 className="text-lg sm:text-xl font-semibold border-b-2 border-gray-600 pb-2">
              Office Address
            </h2>
            <p className="flex items-start space-x-2 sm:space-x-3 text-sm sm:text-base">
              <FaMapMarkerAlt className="text-red-400 text-base sm:text-lg flex-shrink-0 mt-1" />
              <span className="leading-relaxed">
                Plot No 1/C, Syno 83/1, Raidurgam, Knowledge City Rd, Panmaktha
Hyderabad Telangana 500081.
              </span>
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="text-center text-gray-400 text-xs sm:text-sm mt-6 sm:mt-8 border-t border-gray-700 pt-3 sm:pt-4">
          © {new Date().getFullYear()} Your Company. All Rights Reserved.
        </div>
      </motion.footer>
    </div>
  );
};

export default Setting;
