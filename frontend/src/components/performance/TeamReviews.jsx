import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { FiAward, FiPlus, FiX } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";
import EmptyState from "../common/EmptyState";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";

const STATUS_STYLES = {
  Draft: "bg-surface-muted text-ink-faint",
  Submitted: "bg-amber-100 text-amber-700",
  Acknowledged: "bg-accent-100 text-accent-700",
};

const emptyForm = { employeeId: "", cycle: "", overallRating: 3, managerComments: "" };

const TeamReviews = () => {
  useMeta({
    title: "My Team Reviews — Speshway HRMS",
    description: "Manage performance reviews for your direct reports.",
    robots: "noindex,nofollow",
  });

  const [reviews, setReviews] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const authHeaders = () => ({
    Authorization: `Bearer ${sessionStorage.getItem("token") || localStorage.getItem("token")}`,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reviewsRes, reportsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/reviews/team`, { headers: authHeaders() }),
        axios.get(`${API_BASE}/api/reviews/direct-reports`, { headers: authHeaders() }),
      ]);
      if (reviewsRes.data.success) setReviews(reviewsRes.data.reviews);
      if (reportsRes.data.success) setReports(reportsRes.data.reports);
    } catch (err) {
      setError("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/reviews`, form, { headers: authHeaders() });
      setForm(emptyForm);
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create review");
    }
  };

  const handlePublish = async (id) => {
    try {
      await axios.put(`${API_BASE}/api/reviews/${id}`, { status: "Submitted" }, { headers: authHeaders() });
      fetchData();
    } catch (err) {
      alert("Failed to publish review");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-xl md:text-2xl font-semibold text-ink flex items-center gap-2">
          <FiAward className="text-brand-700" /> My Team Reviews
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {showForm ? <FiX /> : <FiPlus />} {showForm ? "Cancel" : "New Review"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-surface-subtle rounded-xl shadow-card p-4 md:p-6 mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-1">Employee</label>
              <select
                value={form.employeeId}
                onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                className="w-full p-2 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
                required
              >
                <option value="">Select employee</option>
                {reports.map((r) => (
                  <option key={r._id} value={r._id}>{r.userId?.name || r.employeeId}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-1">Cycle</label>
              <input
                type="text"
                placeholder="e.g. Q1 2026"
                value={form.cycle}
                onChange={(e) => setForm((f) => ({ ...f, cycle: e.target.value }))}
                className="w-full p-2 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1">Overall Rating (1-5)</label>
            <input
              type="number"
              min="1"
              max="5"
              value={form.overallRating}
              onChange={(e) => setForm((f) => ({ ...f, overallRating: Number(e.target.value) }))}
              className="w-full p-2 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1">Manager Comments</label>
            <textarea
              value={form.managerComments}
              onChange={(e) => setForm((f) => ({ ...f, managerComments: e.target.value }))}
              rows={3}
              className="w-full p-2 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-accent-600 hover:bg-accent-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            Save as Draft
          </button>
        </form>
      )}

      <div className="bg-white border border-surface-subtle rounded-xl shadow-card divide-y divide-surface-subtle">
        {loading ? (
          <LoadingState message="Loading reviews…" />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : reviews.length === 0 ? (
          <EmptyState icon={FiAward} title="No reviews yet" message="Create a review for one of your direct reports." />
        ) : (
          reviews.map((r) => (
            <div key={r._id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {r.employeeId?.userId?.name || "Employee"} — {r.cycle}
                </p>
                <p className="text-xs text-ink-muted mt-0.5">
                  Overall Rating: {r.overallRating ?? "—"}/5
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>
                  {r.status}
                </span>
                {r.status === "Draft" && (
                  <button
                    onClick={() => handlePublish(r._id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white"
                  >
                    Publish
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TeamReviews;
