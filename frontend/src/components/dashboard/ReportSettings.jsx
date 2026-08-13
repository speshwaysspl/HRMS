import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiMail } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";

const ReportSettings = () => {
  useMeta({
    title: "Report Settings — Speshway HRMS",
    description: "Manage scheduled email report preferences.",
    robots: "noindex,nofollow",
  });

  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const authHeaders = () => ({
    Authorization: `Bearer ${sessionStorage.getItem("token") || localStorage.getItem("token")}`,
  });

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/report-subscription/mine`, {
          headers: authHeaders(),
        });
        if (response.data.success) setEnabled(response.data.subscription.weeklySummaryEnabled);
      } catch (err) {
        // default stays enabled
      } finally {
        setLoading(false);
      }
    };
    fetchSubscription();
  }, []);

  const handleToggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      await axios.put(
        `${API_BASE}/api/report-subscription/mine`,
        { weeklySummaryEnabled: next },
        { headers: authHeaders() }
      );
    } catch (err) {
      setEnabled(!next);
      alert("Failed to update preference");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading report settings…" />;

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-xl md:text-2xl font-semibold text-ink mb-4 flex items-center gap-2">
        <FiMail className="text-brand-700" /> Report Settings
      </h2>
      <div className="bg-white border border-surface-subtle rounded-xl shadow-card p-4 md:p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Weekly Summary Email</p>
          <p className="text-xs text-ink-muted mt-1">
            Receive an emailed attendance &amp; leave summary report every Monday.
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            enabled ? "bg-accent-600" : "bg-surface-subtle"
          } disabled:opacity-60`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default ReportSettings;
