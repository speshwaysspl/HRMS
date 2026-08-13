import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { FiClock, FiPlus } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";
import { formatDMY } from "../../utils/dateUtils";
import useMeta from "../../utils/useMeta";
import EmptyState from "../common/EmptyState";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";

const STATUS_STYLES = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-accent-100 text-accent-700",
  Rejected: "bg-red-100 text-red-700",
};

const RegularizationRequest = () => {
  useMeta({
    title: "Attendance Correction — Speshway HRMS",
    description: "Request a correction to your attendance record.",
    robots: "noindex,nofollow",
  });

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: "", requestedInTime: "", requestedOutTime: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);

  const authHeaders = () => ({
    Authorization: `Bearer ${sessionStorage.getItem("token") || localStorage.getItem("token")}`,
  });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/attendance-regularization/mine`, {
        headers: authHeaders(),
      });
      if (response.data.success) setRequests(response.data.regularizations);
    } catch (err) {
      setError("Failed to load your correction requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/api/attendance-regularization`, form, { headers: authHeaders() });
      setForm({ date: "", requestedInTime: "", requestedOutTime: "", reason: "" });
      setShowForm(false);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-xl md:text-2xl font-semibold text-ink flex items-center gap-2">
          <FiClock className="text-brand-700" /> Attendance Corrections
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <FiPlus /> Request Correction
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-surface-subtle rounded-xl shadow-card p-4 md:p-6 mb-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full p-2 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-1">Correct In Time</label>
              <input
                type="time"
                value={form.requestedInTime}
                onChange={(e) => setForm((f) => ({ ...f, requestedInTime: e.target.value }))}
                className="w-full p-2 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-1">Correct Out Time</label>
              <input
                type="time"
                value={form.requestedOutTime}
                onChange={(e) => setForm((f) => ({ ...f, requestedOutTime: e.target.value }))}
                className="w-full p-2 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1">Reason</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              rows={3}
              className="w-full p-2 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent-600 hover:bg-accent-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </form>
      )}

      <div className="bg-white border border-surface-subtle rounded-xl shadow-card divide-y divide-surface-subtle">
        {loading ? (
          <LoadingState message="Loading your requests…" />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchRequests} />
        ) : requests.length === 0 ? (
          <EmptyState icon={FiClock} title="No correction requests" message="Requests you submit will appear here." />
        ) : (
          requests.map((r) => (
            <div key={r._id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{formatDMY(r.date)}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {r.requestedInTime && `In: ${r.requestedInTime}`}
                  {r.requestedInTime && r.requestedOutTime && " · "}
                  {r.requestedOutTime && `Out: ${r.requestedOutTime}`}
                </p>
                <p className="text-xs text-ink-faint mt-0.5">{r.reason}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[r.status]}`}>
                {r.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RegularizationRequest;
