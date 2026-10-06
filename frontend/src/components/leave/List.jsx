// src/components/leave/List.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useSocketEvent, useLiveData } from "../../context/NotificationContext";
import { motion } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";
import { formatDMY } from "../../utils/dateUtils";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";
import EmptyState from "../common/EmptyState";

const PROOF_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,application/pdf";

// Employee's upload / replace / remove controls for a leave's proof. Locked once approved.
// Uploading on a rejected leave resubmits it for review (server moves it back to Pending).
const ProofActions = ({ leave, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const inputId = `proof-${leave._id}`;
  const auth = { Authorization: `Bearer ${sessionStorage.getItem("token")}` };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!PROOF_ACCEPT.split(",").includes(file.type)) return setMsg({ error: true, text: "Proof must be an image or a PDF." });
    if (file.size > 5 * 1024 * 1024) return setMsg({ error: true, text: "Proof file must be 5 MB or smaller." });
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("proof", file);
      const res = await axios.put(`${API_BASE}/api/leave/mine/${leave._id}/proof`, form, { headers: auth });
      setMsg({ text: res.data.resubmitted ? "Proof uploaded. Your leave was sent for review again." : "Proof updated." });
      onChanged();
    } catch (err) {
      setMsg({ error: true, text: err.response?.data?.error || "Upload failed. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove the attached proof?")) return;
    setBusy(true);
    setMsg(null);
    try {
      await axios.delete(`${API_BASE}/api/leave/mine/${leave._id}/proof`, { headers: auth });
      setMsg({ text: "Proof removed." });
      onChanged();
    } catch (err) {
      setMsg({ error: true, text: err.response?.data?.error || "Could not remove proof." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <label
        htmlFor={inputId}
        className={`inline-flex min-h-[36px] items-center rounded-lg border border-surface-subtle bg-white px-3 text-xs font-semibold text-ink hover:bg-surface-muted focus-within:ring-2 focus-within:ring-accent-500 ${busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
      >
        {busy ? "Working..." : leave.proof ? "Replace proof" : leave.status === "Rejected" ? "Upload proof & resubmit" : "Upload proof"}
        <input id={inputId} type="file" accept={PROOF_ACCEPT} onChange={upload} disabled={busy} className="sr-only" />
      </label>
      {leave.proof && (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="min-h-[36px] rounded-lg px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Remove
        </button>
      )}
      {leave.status === "Rejected" && leave.proof && (
        <span className="text-xs text-ink-muted">Replacing the proof sends the leave for review again.</span>
      )}
      {msg && (
        <p role="status" className={`w-full text-xs ${msg.error ? "text-red-700" : "text-accent-700"}`}>{msg.text}</p>
      )}
    </div>
  );
};

const List = () => {
  useLiveData(["leave"], () => { fetchLeaves(); });
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
  const [openId, setOpenId] = useState(null);
  const toggle = (id) => setOpenId((cur) => (cur === id ? null : id));
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

  // Approved/rejected elsewhere (admin dashboard or HR's email): refresh the list live.
  useSocketEvent("newNotification", (n) => {
    if (n?.type === "leave_approved" || n?.type === "leave_rejected") fetchLeaves();
  });

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

  // Expanded view of one leave: full reason, admin's remark / rejection reason, proof.
  const LeaveDetails = ({ leave }) => (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
      <dt className="text-ink-muted">Reason</dt>
      <dd className="text-ink whitespace-pre-wrap break-words">{leave.reason || "—"}</dd>
      {leave.status !== "Pending" && (
        <>
          <dt className="text-ink-muted">{leave.status === "Rejected" ? "Rejection reason" : "Remark"}</dt>
          <dd className={`whitespace-pre-wrap break-words ${leave.status === "Rejected" ? "text-red-700 font-medium" : "text-ink"}`}>
            {leave.reviewRemark || "No remark given"}
          </dd>
        </>
      )}
      {isEmployee && leave.status !== "Approved" && (
        <>
          <dt className="text-ink-muted self-center">{leave.proof ? "Manage proof" : "Proof"}</dt>
          <dd><ProofActions leave={leave} onChanged={fetchLeaves} /></dd>
        </>
      )}
      {leave.proof && (
        <>
          <dt className="text-ink-muted">Proof</dt>
          <dd>
            <a
              href={leave.proof.startsWith("http") ? leave.proof : `${API_BASE}/${leave.proof}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-accent-700 underline underline-offset-2 break-all"
            >
              {leave.proofName || "View proof"}
            </a>
          </dd>
        </>
      )}
    </dl>
  );

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
                <button
                  type="button"
                  onClick={() => toggle(leave._id)}
                  aria-expanded={openId === leave._id}
                  className="w-full text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
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
                </button>
                {openId === leave._id ? (
                  <div className="mt-2.5 pt-2.5 border-t border-surface-subtle"><LeaveDetails leave={leave} /></div>
                ) : (
                  <div className="mt-2.5 pt-2.5 border-t border-surface-subtle text-[13px] text-ink-muted">
                    <span className="line-clamp-2">{leave.reason}</span>
                    <span className="mt-1 block text-xs font-semibold text-accent-700">
                      {leave.status === "Rejected" ? "Tap to see why it was rejected" : "Tap for details"}
                    </span>
                  </div>
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
                    <React.Fragment key={leave._id}>
                    <tr
                      onClick={() => toggle(leave._id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggle(leave._id);
                        }
                      }}
                      tabIndex={0}
                      aria-expanded={openId === leave._id}
                      title="Click for details"
                      className="cursor-pointer hover:bg-surface-muted transition-colors duration-150 focus-visible:outline-none focus-visible:bg-surface-muted"
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
                              onClick={(e) => { e.stopPropagation(); cancelLeave(leave); }}
                              disabled={cancelling === leave._id}
                              className="px-3 py-1.5 rounded-lg text-red-700 text-xs font-semibold hover:bg-red-50 disabled:opacity-60"
                            >
                              {cancelling === leave._id ? "Cancelling…" : "Cancel"}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                    {openId === leave._id && (
                      <tr className="bg-surface-muted/60">
                        <td colSpan={isEmployee ? 7 : 6} className="px-6 py-4"><LeaveDetails leave={leave} /></td>
                      </tr>
                    )}
                    </React.Fragment>
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
