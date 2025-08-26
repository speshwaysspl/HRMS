import React, { useEffect, useState } from "react";
import {
  FaBuilding,
  FaCheckCircle,
  FaFileAlt,
  FaHourglassHalf,
  FaTimesCircle,
  FaUsers,
} from "react-icons/fa";
import axios from "axios";
import { motion } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";

const StatCard = ({ icon, text, number, color }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white border border-gray-100 rounded-xl md:rounded-2xl shadow-sm p-4 md:p-6 flex items-center gap-3 md:gap-4 hover:shadow-md transition-all"
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
        console.log(error.message);
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
      {/* Heading */}
      <motion.h3
        className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2"
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
        />
        <StatCard
          icon={<FaBuilding />}
          text="Departments"
          number={summary.totalDepartments}
          color="bg-indigo-500"
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
          />
          <StatCard
            icon={<FaCheckCircle />}
            text="Approved"
            number={summary.leaveSummary.approved}
            color="bg-green-500"
          />
          <StatCard
            icon={<FaHourglassHalf />}
            text="Pending"
            number={summary.leaveSummary.pending}
            color="bg-yellow-500"
          />
          <StatCard
            icon={<FaTimesCircle />}
            text="Rejected"
            number={summary.leaveSummary.rejected}
            color="bg-red-500"
          />
        </div>
      </div>
    </div>
  );
};

export default AdminSummary;
