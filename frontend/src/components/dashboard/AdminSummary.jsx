import React, { useEffect, useState, useMemo } from "react";
import {
  FaBuilding,
  FaCheckCircle,
  FaFileAlt,
  FaHourglassHalf,
  FaTimesCircle,
  FaUsers,
  FaUser,
} from "react-icons/fa";
import axios from "axios";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";
import { useAuth } from "../../context/AuthContext";
import { getAdminDailyMessage } from "../../utils/greetingUtils";
import useMeta from "../../utils/useMeta";

const StatCard = ({ icon, text, number, color, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white border border-gray-100 rounded-xl md:rounded-2xl shadow-sm p-4 md:p-6 flex items-center gap-3 md:gap-4 hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div
        className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-lg md:rounded-xl text-white text-xl md:text-2xl ${color}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-gray-500 text-xs md:text-sm">{text}</p>
        <h2 className="text-lg md:text-2xl font-bold text-gray-800">{number}</h2>
      </div>
    </motion.div>
  );
};

const AdminSummary = () => {
  const [summary, setSummary] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  useMeta({
    title: "Admin Overview — Speshway HRMS",
    description: "Quick stats across employees, departments and leaves.",
    keywords: "admin overview, HRMS",
    image: "/images/Logo.jpg",
    url: `${window.location.origin}/admin-dashboard`
  });
  
  // Greeting based on IST
  const getGreeting = () => {
    const now = new Date();
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const hour = ist.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Daily message (rotates by day-of-year)
  const dailyQuote = useMemo(() => getAdminDailyMessage(), []);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const summary = await axios.get(
          `${API_BASE}/api/dashboard/summary`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setSummary(summary.data);
      } catch (error) {
        if (error.response) {
          alert(error.response.data.error);
        }

      }
    };
    fetchSummary();
  }, []);

  if (!summary) {
    return (
      <div className="flex justify-center items-center h-40 text-lg font-semibold text-gray-500 animate-pulse">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6">
      {/* Greeting Banner */}
      <motion.div
        className="mb-4 rounded-2xl p-5 md:p-6 bg-gradient-to-r from-purple-600 via-violet-600 to-pink-500 text-white shadow-lg flex items-center gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ fontFamily: 'Times New Roman, serif' }}
      >
        <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
          <FaUser className="text-xl md:text-2xl" />
        </div>
        <div className="flex-1">
  <div className="text-xl md:text-2xl font-semibold opacity-90">
    {getGreeting()},
  </div>

  <div className="text-lg md:text-xl opacity-90 mt-2">
    {dailyQuote}
  </div>
</div>

      </motion.div>

      {/* Heading */}
      <motion.h3
        className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2"
        style={{ fontFamily: 'Times New Roman, serif' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        📊 Dashboard Overview
      </motion.h3>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-4 md:mt-6">
        <StatCard
          icon={<FaUsers />}
          text="Total Employees"
          number={summary.totalEmployees}
          color="bg-blue-500"
          onClick={() => navigate('/admin-dashboard/employees')}
        />
        <StatCard
          icon={<FaBuilding />}
          text="Departments"
          number={summary.totalDepartments}
          color="bg-indigo-500"
          onClick={() => navigate('/admin-dashboard/departments')}
        />
      </div>

      {/* Leave Details */}
      <div className="mt-8 md:mt-12">
        <motion.h4
          className="text-xl font-bold text-gray-700 text-center flex items-center justify-left gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          📝 Leave Details
        </motion.h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <StatCard
            icon={<FaFileAlt />}
            text="Leave Applied"
            number={summary.leaveSummary.appliedFor}
            color="bg-blue-500"
            onClick={() => navigate('/admin-dashboard/leaves?status=All')}
          />
          <StatCard
            icon={<FaCheckCircle />}
            text="Approved"
            number={summary.leaveSummary.approved}
            color="bg-green-500"
            onClick={() => navigate('/admin-dashboard/leaves?status=Approved')}
          />
          <StatCard
            icon={<FaHourglassHalf />}
            text="Pending"
            number={summary.leaveSummary.pending}
            color="bg-yellow-500"
            onClick={() => navigate('/admin-dashboard/leaves?status=Pending')}
          />
          <StatCard
            icon={<FaTimesCircle />}
            text="Rejected"
            number={summary.leaveSummary.rejected}
            color="bg-red-500"
            onClick={() => navigate('/admin-dashboard/leaves?status=Rejected')}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminSummary;
