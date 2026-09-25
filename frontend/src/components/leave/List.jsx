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

  const [cancelling, setCancelling] = useState(null);
  const isEmployee = Array.isArray(user.role) ? user.role.includes("employee") : user.role === "employee";

  // Withdraw an own leave request while it's still Pending.
  const cancelLeave = async (leave) => {
    if (!window.confirm(`Cancel your ${leave.leaveType} request (${formatDMY(leave.startDate)} – ${formatDMY(leave.endDate)})?`)) return;
    setCancelling(leave._id);
    try {
      const headers = { Authorization: `Bearer ${sessionStorage.getItem("token")}` };
      try {
        await axios.delete(`${API_BASE}/api/leave/mine/${leave._id}`, { headers });
      } catch (err) {
        // Older server without /mine/:id — use the original delete route.
        if (err.response?.status !== 404) throw err;
        await axios.delete(`${API_BASE}/api/leave/${leave._id}`, { headers });
      }
      setLeaves((prev) => prev.filter((l) => l._id !== leave._id));
    } catch (error) {
      alert(error.response?.data?.error || "Couldn't cancel this leave.");
    } finally {
      setCancelling(null);
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
      ? "bg-accent-100 text-accent-700 border-accent-700/30"
      : status === "Rejected"
      ? "bg-red-100 text-red-700 border-red-700/30"
      : "bg-amber-100 text-amber-700 border-amber-700/30";

  // Status pill: dot + label, same shape as the mobile StatusPill.
  const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center gap-1.5 flex-shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusBadgeClass(status)}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  );

  // Inclusive day count, e.g. "2 days".
  const dayCount = (leave) => {
    const n = Math.round((new Date(leave.endDate) - new Date(leave.startDate)) / 86400000) + 1;
    return Number.isFinite(n) && n >= 1 ? (n === 1 ? "1 day" : `${n} days`) : null;
  };

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
            className="px-4 sm:px-5 py-3 sm:py-2 bg-accent-600 hover:bg-accent-700 rounded-xl sm:rounded-lg text-white font-bold sm:font-medium text-center text-sm sm:text-base transition-colors duration-150 shadow-card"
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
                className="bg-white rounded-2xl p-4 mb-3 border border-surface-subtle"
                style={{ boxShadow: "0 4px 12px rgba(28,35,68,0.08)" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink text-[15px] leading-snug truncate">{leave.leaveType}</span>
                  <StatusBadge status={leave.status} />
                </div>
                <div className="flex items-center gap-1.5 mt-2.5 text-[13px] text-ink">
                  <svg className="w-4 h-4 text-ink-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="flex-1">{formatDMY(leave.startDate)} – {formatDMY(leave.endDate)}</span>
                  {dayCount(leave) && <span className="text-xs font-semibold text-ink-muted">{dayCount(leave)}</span>}
                </div>
                {leave.reason && (
                  <div className="mt-2.5 pt-2.5 border-t border-surface-subtle text-[13px] text-ink-muted line-clamp-2">{leave.reason}</div>
                )}
                {isEmployee && leave.status === "Pending" && (
                  <button
                    type="button"
                    onClick={() => cancelLeave(leave)}
                    disabled={cancelling === leave._id}
                    className="mt-3 w-full min-h-[44px] rounded-lg border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
                  >
                    {cancelling === leave._id ? "Cancelling…" : "Cancel request"}
                  </button>
                )}
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
                    {isEmployee && <th className="px-6 py-3"><span className="sr-only">Actions</span></th>}
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
                        <StatusBadge status={leave.status} />
                      </td>
                      {isEmployee && (
                        <td className="px-6 py-3 text-right">
                          {leave.status === "Pending" && (
                            <button
                              type="button"
                              onClick={() => cancelLeave(leave)}
                              disabled={cancelling === leave._id}
                              className="px-3 py-1.5 rounded-lg text-red-700 text-xs font-semibold hover:bg-red-50 disabled:opacity-60"
                            >
                              {cancelling === leave._id ? "Cancelling…" : "Cancel"}
                            </button>
                          )}
                        </td>
                      )}
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
