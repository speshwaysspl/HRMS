import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../utils/apiConfig";
import { motion, AnimatePresence } from "framer-motion";

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const location = useLocation();
  const boardPath = `${location.pathname.replace(/\/$/, "")}/board`;
  const [selectedTask, setSelectedTask] = useState(null);
  const [updateData, setUpdateData] = useState({ status: "", comments: "" });
  const [updating, setUpdating] = useState(false);

  const userRoles = user?.role ? (Array.isArray(user.role) ? user.role : [user.role]) : [];

  const getSortTimestamp = (task) => {
    const candidates = [task?.createdAt, task?.startDate, task?.deadline];
    for (const val of candidates) {
      if (!val) continue;
      const t = new Date(val).getTime();
      if (!isNaN(t)) return t;
    }
    return 0;
  };

  const formatDateOrNA = (val) => {
    if (!val) return "N/A";
    const d = new Date(val);
    const t = d.getTime();
    if (isNaN(t) || t === 0) return "N/A";
    return d.toLocaleDateString();
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/task`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (response.data.success) {
        const incoming = Array.isArray(response.data.tasks) ? response.data.tasks : [];
        const sorted = [...incoming].sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
        setTasks(sorted);
      } 
    } catch (error) {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("status", updateData.status);
    formData.append("comments", updateData.comments);
    if (updateData.file) {
      formData.append("file", updateData.file);
    }
    try {
      setUpdating(true);
      const response = await axios.put(
        `${API_BASE}/api/task/${selectedTask._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (response.data.success) {
        setSelectedTask(null);
        fetchTasks();
      }
    } catch {
      // Failed to update task
    } finally {
      setUpdating(false);
    }
  };

  const getFileIcon = (type) => {
    return null;
  };

  if (loading) return <div className="p-6 text-ink-muted">Loading...</div>;

  return (
    <motion.div
      className="p-6 bg-surface-muted min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <motion.h2
          className="text-2xl font-semibold text-brand-800"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          My Tasks
        </motion.h2>
        <Link
          to={boardPath}
          className="text-sm font-medium px-4 py-2 rounded-lg border border-surface-subtle bg-white text-ink hover:bg-surface-muted transition-colors"
        >
          Board View
        </Link>
      </div>

      <motion.div
        className="bg-white rounded-xl shadow-card overflow-x-auto border border-surface-subtle hidden sm:block"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <table className="min-w-full border-collapse">
          <thead className="bg-surface-muted">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-ink">Title</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-ink">Start Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-ink">Deadline</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-ink">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-surface-subtle">
            <AnimatePresence>
              {tasks.map((task, index) => (
                <motion.tr
                  key={task._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-surface-muted cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedTask(task);
                    setUpdateData({ status: task.status, comments: task.comments || "" });
                  }}
                >
                  <td className="px-6 py-4 font-medium text-ink">{task.title}</td>
                  <td className="px-6 py-4 text-sm text-ink-muted">
                    {task.startDate ? new Date(task.startDate).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-muted">
                    {formatDateOrNA(task.deadline)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-accent-100 text-accent-700">
                      {task.status}
                    </span>
                  </td>

                </motion.tr>
              ))}
            </AnimatePresence>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center p-8 text-ink-muted">
                  No tasks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>
      <div className="sm:hidden space-y-3">
        {tasks.map((task) => {
          const pri = (task.priority || "Medium").toLowerCase();
          const priStyle =
            pri === "high"
              ? { color: "#DC2626", bg: "#FEE2E2" }
              : pri === "low"
              ? { color: "#16A34A", bg: "#DCFCE7" }
              : { color: "#EA580C", bg: "#FFEDD5" };
          const st = (task.status || "").toLowerCase();
          const statusStyle = st.includes("complete")
            ? { color: "#16A34A", bg: "#DCFCE7", icon: "✓" }
            : st.includes("progress")
            ? { color: "#2563EB", bg: "#DBEAFE", icon: "↻" }
            : st.includes("review")
            ? { color: "#9333EA", bg: "#F3E8FF", icon: "★" }
            : { color: "#2C3968", bg: "#EEF1F8", icon: "☰" };
          return (
          <div
            key={task._id}
            className="bg-white rounded-2xl border border-surface-subtle p-4 cursor-pointer active:scale-[0.99] transition-transform"
            style={{ boxShadow: "0 4px 12px rgba(28,35,68,0.08)" }}
            onClick={() => {
              setSelectedTask(task);
              setUpdateData({ status: task.status, comments: task.comments || "" });
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0"
                style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
              >
                {statusStyle.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-extrabold text-ink text-[15px] leading-snug break-words">{task.title}</div>
                  <span
                    className="flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                  >
                    {task.status}
                  </span>
                </div>
                {task.description && (
                  <div className="mt-1 text-[13px] text-ink-muted line-clamp-2">{task.description}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-surface-subtle text-xs text-ink-muted flex-wrap">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold"
                style={{ backgroundColor: priStyle.bg, color: priStyle.color }}
              >
                ⚑ {task.priority || "Medium"}
              </span>
              <span className="inline-flex items-center gap-1">
                Start: {task.startDate ? new Date(task.startDate).toLocaleDateString() : "N/A"}
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-ink">
                Due: {formatDateOrNA(task.deadline)}
              </span>
            </div>
          </div>
          );
        })}
        {tasks.length === 0 && (
          <div className="bg-white rounded-xl shadow-card border border-surface-subtle p-6 text-center text-ink-muted">No tasks found.</div>
        )}
      </div>

      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-950/60 flex justify-center items-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white p-6 rounded-xl shadow-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-ink">{selectedTask.title}</h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-ink-faint hover:text-ink text-2xl font-bold transition-colors"
                >
                  &times;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-surface-muted p-4 rounded-xl border border-surface-subtle">
                  <h4 className="font-semibold text-lg mb-3 text-ink">Task Details</h4>
                  <div className="text-sm space-y-2">
                    <p><span className="font-medium text-ink-muted">Description:</span> {selectedTask.description}</p>
                    <p><span className="font-medium text-ink-muted">Priority:</span> {selectedTask.priority}</p>
                    <p><span className="font-medium text-ink-muted">Start Date:</span> {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString() : "N/A"}</p>
                    <p><span className="font-medium text-ink-muted">Deadline:</span> {formatDateOrNA(selectedTask.deadline)}</p>
                    <p><span className="font-medium text-ink-muted">Assigned By:</span> {selectedTask.assignedBy?.name || "Team Lead"}</p>
                    {selectedTask.workProof && (
                      <p>
                        <span className="font-medium text-ink">Work Proof:</span>{" "}
                        <a
                          href={selectedTask.workProof.startsWith("http") ? selectedTask.workProof : `${API_BASE}/${selectedTask.workProof}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:underline font-medium"
                        >

                          View Attached File
                        </a>
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-surface-muted p-4 rounded-xl border border-surface-subtle">
                  <h4 className="font-semibold text-lg mb-3 text-ink">Current Status</h4>
                  <div className="text-sm">
                    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-accent-100 text-accent-700">
                      {selectedTask.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-surface-subtle pt-6">
                <h4 className="font-semibold text-lg mb-4 text-ink">Update Task</h4>
                <form onSubmit={handleUpdate} className="space-y-4">
                  {!userRoles.includes("employee") && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-ink">Status</label>
                      <select
                        value={updateData.status}
                        onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                        className="w-full border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
                      >
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Review">Review</option>
                        <option value="Completed">Completed</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-ink">Attach File (Work Proof)</label>
                    <input
                      type="file"
                      className="w-full border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
                      onChange={(e) => setUpdateData({ ...updateData, file: e.target.files[0] })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-ink">Comments</label>
                    <textarea
                      value={updateData.comments}
                      onChange={(e) => setUpdateData({ ...updateData, comments: e.target.value })}
                      className="w-full border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink h-24 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedTask(null)}
                      className="border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updating}
                      className="bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {updating ? "Updating..." : "Update Task"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TaskList;
