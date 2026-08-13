import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { FiAward } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";
import EmptyState from "../common/EmptyState";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";

const STATUS_STYLES = {
  Submitted: "bg-amber-100 text-amber-700",
  Acknowledged: "bg-accent-100 text-accent-700",
};

const MyReviews = () => {
  useMeta({
    title: "My Reviews — Speshway HRMS",
    description: "View your performance reviews.",
    robots: "noindex,nofollow",
  });

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState({});

  const authHeaders = () => ({
    Authorization: `Bearer ${sessionStorage.getItem("token") || localStorage.getItem("token")}`,
  });

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/reviews/mine`, { headers: authHeaders() });
      if (response.data.success) setReviews(response.data.reviews);
    } catch (err) {
      setError("Failed to load your reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSaveComments = async (id) => {
    try {
      await axios.put(
        `${API_BASE}/api/reviews/${id}`,
        { selfComments: drafts[id] || "" },
        { headers: authHeaders() }
      );
      fetchReviews();
    } catch (err) {
      alert("Failed to save comments");
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await axios.put(`${API_BASE}/api/reviews/${id}`, { status: "Acknowledged" }, { headers: authHeaders() });
      fetchReviews();
    } catch (err) {
      alert("Failed to acknowledge review");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl md:text-2xl font-semibold text-ink mb-4 flex items-center gap-2">
        <FiAward className="text-brand-700" /> My Reviews
      </h2>

      {loading ? (
        <LoadingState message="Loading your reviews…" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchReviews} />
      ) : reviews.length === 0 ? (
        <EmptyState icon={FiAward} title="No reviews yet" message="Your manager hasn't published a review yet." />
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r._id} className="bg-white border border-surface-subtle rounded-xl shadow-card p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{r.cycle}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Reviewer: {r.reviewerId?.userId?.name || "Manager"} · Overall: {r.overallRating ?? "—"}/5
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>
                  {r.status}
                </span>
              </div>
              {r.managerComments && (
                <p className="text-sm text-ink-muted mb-3">
                  <span className="font-medium text-ink">Manager comments: </span>
                  {r.managerComments}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-1">Your Comments</label>
                <textarea
                  defaultValue={r.selfComments || ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [r._id]: e.target.value }))}
                  rows={3}
                  disabled={r.status === "Acknowledged"}
                  className="w-full p-2 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:bg-surface-muted disabled:text-ink-faint"
                />
              </div>
              {r.status !== "Acknowledged" && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleSaveComments(r._id)}
                    className="text-sm font-medium px-4 py-2 rounded-lg border border-surface-subtle bg-white text-ink hover:bg-surface-muted"
                  >
                    Save Comments
                  </button>
                  <button
                    onClick={() => handleAcknowledge(r._id)}
                    className="text-sm font-semibold px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-700 text-white"
                  >
                    Acknowledge
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReviews;
