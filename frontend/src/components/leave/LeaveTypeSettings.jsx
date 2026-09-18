import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { FiPlus, FiTrash2, FiEdit2, FiTag, FiAlertTriangle } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";
import EmptyState from "../common/EmptyState";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";
import ActionIconButton from "../common/ActionIconButton";

const emptyForm = { name: "", monthlyQuota: 1, requiresApproval: true };

const LeaveTypeSettings = () => {
  useMeta({
    title: "Leave Types — Speshway HRMS",
    description: "Configure leave types and monthly quotas.",
    robots: "noindex,nofollow",
  });

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(false);

  const authHeaders = () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

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
      const payload = {
        ...form,
        monthlyQuota: Number(form.monthlyQuota),
        annualQuota: Math.round(Number(form.monthlyQuota) * 12),
      };
      if (editingId) {
        await axios.put(`${API_BASE}/api/leave-types/${editingId}`, payload, { headers: authHeaders() });
      } else {
        await axios.post(`${API_BASE}/api/leave-types`, payload, { headers: authHeaders() });
      }
      resetForm();
      fetchLeaveTypes();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save leave type");
    }
  };

  const handleEdit = (lt) => {
    const mq = lt.monthlyQuota !== undefined ? lt.monthlyQuota : (lt.annualQuota ? Math.round((lt.annualQuota / 12) * 10) / 10 : 1);
    setForm({ name: lt.name, monthlyQuota: mq, requiresApproval: lt.requiresApproval });
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

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE}/api/leave-types/${deleteConfirm.id}`, { headers: authHeaders() });
      setLeaveTypes((prev) => prev.filter((lt) => lt._id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Failed to delete leave type");
      fetchLeaveTypes();
    } finally {
      setDeleting(false);
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
          <label className="block text-sm font-medium text-ink-muted mb-1">Monthly Quota (days)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.monthlyQuota}
            onChange={(e) => setForm((f) => ({ ...f, monthlyQuota: Number(e.target.value) }))}
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
          leaveTypes.map((lt) => {
            const mq = lt.monthlyQuota !== undefined ? lt.monthlyQuota : (lt.annualQuota ? Math.round((lt.annualQuota / 12) * 10) / 10 : 1);
            return (
              <div key={lt._id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{lt.name}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{mq} {mq === 1 ? "day/month" : "days/month"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(lt)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                      lt.isActive ? "bg-accent-100 text-accent-700" : "bg-surface-muted text-ink-faint"
                    }`}
                  >
                    {lt.isActive ? "Active" : "Inactive"}
                  </button>
                  <ActionIconButton icon={FiEdit2} label="Edit" color="brand" onClick={() => handleEdit(lt)} />
                  <ActionIconButton icon={FiTrash2} label="Delete" color="danger" onClick={() => setDeleteConfirm({ id: lt._id, name: lt.name })} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-subtle max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <FiAlertTriangle size={22} />
              </div>
              <h3 className="text-lg font-semibold text-ink">Delete Leave Type</h3>
            </div>
            <p className="text-sm text-ink-muted mb-6">
              Are you sure you want to delete <strong className="text-ink font-semibold">{deleteConfirm.name}</strong>? Existing leave requests will remain unaffected.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveTypeSettings;
