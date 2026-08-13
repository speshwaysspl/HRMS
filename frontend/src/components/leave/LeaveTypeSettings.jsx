import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { FiPlus, FiTrash2, FiEdit2, FiTag } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";
import EmptyState from "../common/EmptyState";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";

const emptyForm = { name: "", annualQuota: 12, requiresApproval: true };

const LeaveTypeSettings = () => {
  useMeta({
    title: "Leave Types — Speshway HRMS",
    description: "Configure leave types and annual quotas.",
    robots: "noindex,nofollow",
  });

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${sessionStorage.getItem("token") || localStorage.getItem("token")}`,
  });

  const fetchLeaveTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/leave-types`, { headers: authHeaders() });
      if (response.data.success) setLeaveTypes(response.data.leaveTypes);
    } catch (err) {
      setError("Failed to load leave types.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaveTypes();
  }, [fetchLeaveTypes]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_BASE}/api/leave-types/${editingId}`, form, { headers: authHeaders() });
      } else {
        await axios.post(`${API_BASE}/api/leave-types`, form, { headers: authHeaders() });
      }
      resetForm();
      fetchLeaveTypes();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save leave type");
    }
  };

  const handleEdit = (lt) => {
    setForm({ name: lt.name, annualQuota: lt.annualQuota, requiresApproval: lt.requiresApproval });
    setEditingId(lt._id);
  };

  const handleToggleActive = async (lt) => {
    try {
      await axios.put(
        `${API_BASE}/api/leave-types/${lt._id}`,
        { ...lt, isActive: !lt.isActive },
        { headers: authHeaders() }
      );
      fetchLeaveTypes();
    } catch (err) {
      alert("Failed to update leave type");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this leave type? Existing leave requests will be unaffected.")) return;
    try {
      await axios.delete(`${API_BASE}/api/leave-types/${id}`, { headers: authHeaders() });
      fetchLeaveTypes();
    } catch (err) {
      alert("Failed to delete leave type");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl md:text-2xl font-semibold text-ink mb-4 flex items-center gap-2">
        <FiTag className="text-brand-700" /> Leave Types
      </h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-surface-subtle rounded-xl shadow-card p-4 md:p-6 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
      >
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-ink-muted mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full p-2 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-muted mb-1">Annual Quota (days)</label>
          <input
            type="number"
            min="0"
            value={form.annualQuota}
            onChange={(e) => setForm((f) => ({ ...f, annualQuota: Number(e.target.value) }))}
            className="w-full p-2 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
            required
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 bg-accent-600 hover:bg-accent-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
        >
          <FiPlus /> {editingId ? "Update" : "Add"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="md:col-start-4 text-sm text-ink-muted hover:text-ink underline"
          >
            Cancel edit
          </button>
        )}
      </form>

      <div className="bg-white border border-surface-subtle rounded-xl shadow-card divide-y divide-surface-subtle">
        {loading ? (
          <LoadingState message="Loading leave types…" />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchLeaveTypes} />
        ) : leaveTypes.length === 0 ? (
          <EmptyState icon={FiTag} title="No leave types configured" />
        ) : (
          leaveTypes.map((lt) => (
            <div key={lt._id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{lt.name}</p>
                <p className="text-xs text-ink-muted mt-0.5">{lt.annualQuota} days/year</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleToggleActive(lt)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    lt.isActive ? "bg-accent-100 text-accent-700" : "bg-surface-muted text-ink-faint"
                  }`}
                >
                  {lt.isActive ? "Active" : "Inactive"}
                </button>
                <button onClick={() => handleEdit(lt)} className="text-ink-muted hover:text-brand-700">
                  <FiEdit2 size={16} />
                </button>
                <button onClick={() => handleDelete(lt._id)} className="text-ink-muted hover:text-red-600">
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LeaveTypeSettings;
