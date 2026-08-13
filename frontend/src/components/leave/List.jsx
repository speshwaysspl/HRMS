// src/components/leave/List.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";
import { formatDMY } from "../../utils/dateUtils";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";
import EmptyState from "../common/EmptyState";

const List = () => {
  const [leaves, setLeaves] = useState(null);
  let sno = 1;
  const { id } = useParams();
  const { user } = useAuth();
  const canonical = useMemo(() => `${window.location.origin}/employee-dashboard/leaves/${id}`, [id]);
  useMeta({
    title: 'My Leaves — Speshway HRMS',
    description: 'View and manage your leave applications.',
    keywords: 'leaves, employee, HRMS',
    image: '/images/Logo.jpg',
    url: canonical,
    robots: 'noindex,nofollow'
  });

  const fetchLeaves = async () => {
    if (!id) return;
    try {
      const roleParam = Array.isArray(user.role) 
        ? (user.role.includes("admin") ? "admin" : "employee") 
        : user.role;
        
      const response = await axios.get(
        `${API_BASE}/api/leave/${id}/${roleParam}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
    return <LoadingState message="Loading leaves..." />;
  }

  const statusBadgeClass = (status) =>
    status === "Approved"
      ? "bg-accent-100 text-accent-700"
      : status === "Rejected"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";

  return (
    <motion.div
      className="p-3 sm:p-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="mb-4 sm:mb-6">
        <h3 className="text-xl sm:text-2xl font-semibold text-ink">
          Manage Leaves
        </h3>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center mb-4">
        {(Array.isArray(user.role) ? user.role.includes("employee") : user.role === "employee") && (
          <Link
            to="/employee-dashboard/add-leave"
            className="px-4 sm:px-5 py-2 bg-accent-600 hover:bg-accent-700 rounded-lg text-white font-medium text-center text-sm sm:text-base transition-colors duration-150"
          >
            + Add New Leave
          </Link>
        )}
      </div>

      {leaves.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-subtle">
          <EmptyState title="No leave requests found" message="You haven't applied for any leave yet." />
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block md:hidden">
            {leaves.map((leave, index) => (
              <motion.div
                key={leave._id}
                className="bg-white rounded-xl shadow-card p-4 mb-4 border border-surface-subtle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-50 text-brand-700 text-xs font-semibold px-2 py-1 rounded">
                      #{sno++}
                    </span>
                    <span className="font-semibold text-ink">{leave.leaveType}</span>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(leave.status)}`}>
                    {leave.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-muted min-w-[60px]">From:</span>
                    <span className="text-ink">{formatDMY(leave.startDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-muted min-w-[60px]">To:</span>
                    <span className="text-ink">{formatDMY(leave.endDate)}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-ink-muted min-w-[60px]">Reason:</span>
                    <span className="text-ink flex-1">{leave.reason}</span>
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
            transition={{ delay: 0.2 }}
          >
            <div className="overflow-x-auto bg-white rounded-xl shadow-card border border-surface-subtle">
              <table className="w-full text-sm text-left text-ink">
                <thead className="text-xs uppercase bg-surface-muted text-ink-muted">
                  <tr>
                    <th className="px-6 py-3">SNO</th>
                    <th className="px-6 py-3">Leave Type</th>
                    <th className="px-6 py-3">From</th>
                    <th className="px-6 py-3">To</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-subtle">
                  {leaves.map((leave, index) => (
                    <tr
                      key={leave._id}
                      className="hover:bg-surface-muted transition-colors duration-150"
                    >
                      <td className="px-6 py-3 font-medium text-ink">
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
                      <td className="px-6 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(leave.status)}`}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default List;
