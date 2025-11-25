// src/components/leave/List.jsx
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";
import { formatDMY } from "../../utils/dateUtils";

const List = () => {
  const [leaves, setLeaves] = useState(null);
  let sno = 1;
  const { id } = useParams();
  const { user } = useAuth();

  const fetchLeaves = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/leave/${id}/${user.role}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.data.success) {
        setLeaves(response.data.leaves);
      }
    } catch (error) {
      if (error.response && !error.response.data.success) {
        alert(error.message);
      }
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  if (!leaves) {
    return (
      <div className="flex justify-center items-center h-64">
        <motion.div
          className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="p-3 sm:p-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-wide" style={{ fontFamily: 'Times New Roman, serif' }}>
          Manage Leaves
        </h3>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center mb-4">
        {user.role === "employee" && (
          <Link
            to="/employee-dashboard/add-leave"
            className="px-4 sm:px-5 py-2 bg-gradient-to-r from-teal-500 to-teal-700 rounded-lg text-white font-medium shadow-md hover:scale-105 transform transition text-center text-sm sm:text-base"
          >
            ➕ Add New Leave
          </Link>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden">
        {leaves.map((leave, index) => (
          <motion.div
            key={leave._id}
            className="bg-white rounded-lg shadow-md p-4 mb-4 border border-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="bg-teal-100 text-teal-800 text-xs font-semibold px-2 py-1 rounded">
                  #{sno++}
                </span>
                <span className="font-semibold text-gray-800">{leave.leaveType}</span>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  leave.status === "Approved"
                    ? "bg-green-100 text-green-600"
                    : leave.status === "Rejected"
                    ? "bg-red-100 text-red-600"
                    : "bg-yellow-100 text-yellow-600"
                }`}
              >
                {leave.status}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="font-medium text-gray-600 min-w-[60px]">From:</span>
                <span className="text-gray-800">{formatDMY(leave.startDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span className="font-medium text-gray-600 min-w-[60px]">To:</span>
                <span className="text-gray-800">{formatDMY(leave.endDate)}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full mt-1"></span>
                <span className="font-medium text-gray-600 min-w-[60px]">Reason:</span>
                <span className="text-gray-800 flex-1">{leave.reason}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Desktop Table View */}
      <motion.div
        className="hidden md:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600 rounded-lg overflow-hidden shadow-lg">
            <thead className="text-xs uppercase bg-teal-100 text-gray-700">
              <tr>
                <th className="px-6 py-3">SNO</th>
                <th className="px-6 py-3">Leave Type</th>
                <th className="px-6 py-3">From</th>
                <th className="px-6 py-3">To</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave, index) => (
                <motion.tr
                  key={leave._id}
                  className="bg-white border-b hover:bg-teal-50 transition"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <td className="px-6 py-3 font-semibold text-gray-800">
                    {index + 1}
                  </td>
                  <td className="px-6 py-3">{leave.leaveType}</td>
                  <td className="px-6 py-3">
                    {formatDMY(leave.startDate)}
                  </td>
                  <td className="px-6 py-3">
                    {formatDMY(leave.endDate)}
                  </td>
                  <td className="px-6 py-3">{leave.reason}</td>
                  <td
                    className={`px-6 py-3 font-semibold ${
                      leave.status === "Approved"
                        ? "text-green-600"
                        : leave.status === "Rejected"
                        ? "text-red-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {leave.status}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default List;
