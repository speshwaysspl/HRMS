import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { FiClock, FiCheck, FiX } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";
import { formatDMY } from "../../utils/dateUtils";
import useMeta from "../../utils/useMeta";
import EmptyState from "../common/EmptyState";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";

const RegularizationApprovals = () => {
  useMeta({
    title: "Attendance Correction Approvals — Speshway HRMS",
    description: "Review and approve attendance correction requests.",
    robots: "noindex,nofollow",
  });

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${sessionStorage.getItem("token") || localStorage.getItem("token")}`,
  });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/attendance-regularization/pending`, {
        headers: authHeaders(),
      });
      if (response.data.success) setRequests(response.data.regularizations);
    } catch (err) {
      setError("Failed to load pending requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleDecision = async (id, status) => {
    setProcessingId(id);
    try {
      await axios.put(
        `${API_BASE}/api/attendance-regularization/${id}`,
        { status },
        { headers: authHeaders() }
      );
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update request");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl md:text-2xl font-semibold text-ink mb-4 flex items-center gap-2">
        <FiClock className="text-brand-700" /> Attendance Correction Approvals
      </h2>

      <div className="bg-white border border-surface-subtle rounded-xl shadow-card divide-y divide-surface-subtle">
        {loading ? (
          <LoadingState message="Loading pending requests…" />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchRequests} />
        ) : requests.length === 0 ? (
          <EmptyState icon={FiClock} title="No pending requests" message="You're all caught up." />
        ) : (
          requests.map((r) => (
            <div key={r._id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {r.employeeId?.userId?.name || "Employee"} — {formatDMY(r.date)}
                </p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {r.requestedInTime && `In: ${r.requestedInTime}`}
                  {r.requestedInTime && r.requestedOutTime && " · "}
                  {r.requestedOutTime && `Out: ${r.requestedOutTime}`}
                </p>
                <p className="text-xs text-ink-faint mt-0.5">{r.reason}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={processingId === r._id}
                  onClick={() => handleDecision(r._id, "Rejected")}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-surface-subtle text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <FiX /> Reject
                </button>
                <button
                  disabled={processingId === r._id}
                  onClick={() => handleDecision(r._id, "Approved")}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-700 text-white disabled:opacity-50"
                >
                  <FiCheck /> Approve
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RegularizationApprovals;
