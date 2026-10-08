import React, { useEffect, useState } from "react";
import { useSocketEvent } from "../../context/NotificationContext";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../utils/apiConfig";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheckCircle, FiClock, FiFlag, FiChevronRight } from "react-icons/fi";
import WorkProofField, { proofsOf } from "./WorkProofField";
import { ReferenceView } from "./TaskReference";


// Employee view: tasks grouped under their milestone (open milestones by due
// date, then closed ones), with tasks outside any milestone last.
const groupByMilestone = (tasks) => {
  const groups = new Map();
  for (const t of tasks) {
    const m = t.milestoneId && typeof t.milestoneId === "object" ? t.milestoneId : null;
    const key = m ? m._id : "none";
    if (!groups.has(key)) groups.set(key, { key, milestone: m, title: m ? m.title : "Other tasks", tasks: [] });
    groups.get(key).tasks.push(t);
  }
  const rank = (g) => (!g.milestone ? 2 : g.milestone.state === "closed" ? 1 : 0);
  const due = (g) => (g.milestone?.dueDate ? new Date(g.milestone.dueDate).getTime() : Infinity);
  return [...groups.values()].sort((a, b) => rank(a) - rank(b) || due(a) - due(b));
};

const statusTone = (status) =>
  status === "Completed"
    ? "bg-accent-100 text-accent-700"
    : status === "Review"
    ? "bg-brand-100 text-brand-700"
    : status === "Overdue"
    ? "bg-red-100 text-red-700"
    : status === "In Progress"
    ? "bg-amber-100 text-amber-800"
    : "bg-surface-subtle text-ink";

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [proofFiles, setProofFiles] = useState([]);
  const [proofRemoved, setProofRemoved] = useState([]); // saved proof URLs to delete
  const [openGroups, setOpenGroups] = useState(() => new Set()); // milestones start collapsed
  const toggleGroup = (key) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  useSocketEvent("team:updated", (e) => {
    if (e?.kind === "tasks" || e?.kind === "resync") fetchTasks();
  });

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

  // Employees can't edit tasks; they only tell the team lead the work is done,
  // which moves the task to Review. The lead then marks it Completed.
  const handleMarkDone = async () => {
    try {
      setUpdating(true);
      setUpdateError("");
      const formData = new FormData();
      formData.append("status", "Review");
      proofFiles.forEach((f) => formData.append("files", f));
      if (proofRemoved.length) formData.append("removeWorkProofs", JSON.stringify(proofRemoved));
      const response = await axios.put(
        `${API_BASE}/api/task/${selectedTask._id}`,
        formData,
        { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}`, "Content-Type": "multipart/form-data" } }
      );
      if (response.data.success) {
        setSelectedTask(null);
        fetchTasks();
      }
    } catch (err) {
      setUpdateError(err.response?.data?.error || "Couldn't send this to your team lead. Try again.");
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
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card border border-surface-subtle p-10 text-center">
          <p className="font-semibold text-ink">No tasks yet</p>
          <p className="mt-1 text-sm text-ink-muted">Tasks your team lead assigns will appear here, grouped by milestone.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupByMilestone(tasks).map((g) => {
            const done = g.tasks.filter((t) => t.status === "Completed").length;
            const pct = Math.round((done / g.tasks.length) * 100);
            const expanded = openGroups.has(g.key);
            return (
              <section key={g.key} className="bg-white rounded-xl shadow-card border border-surface-subtle" aria-label={g.title}>
                <button
                  type="button"
                  onClick={() => toggleGroup(g.key)}
                  aria-expanded={expanded}
                  aria-controls={`group-${g.key}`}
                  className={`block w-full px-5 py-4 text-left rounded-xl hover:bg-surface-muted/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500 ${expanded ? "border-b border-surface-subtle rounded-b-none" : ""}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
                      <FiChevronRight
                        className={`shrink-0 text-ink-muted transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-90" : ""}`}
                        aria-hidden="true"
                      />
                      {g.milestone ? <FiFlag className="text-accent-700 shrink-0" aria-hidden="true" /> : null}
                      {g.title}
                      {g.milestone?.state === "closed" && (
                        <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-medium text-ink-muted">Closed</span>
                      )}
                    </h3>
                    <span className="text-sm text-ink-muted tabular-nums">
                      {g.milestone?.dueDate ? `Due ${formatDateOrNA(g.milestone.dueDate)} · ` : ""}
                      {done} of {g.tasks.length} done
                    </span>
                  </div>
                  {g.milestone?.description && (
                    <p className="mt-1 text-sm text-ink-muted max-w-prose line-clamp-2">{g.milestone.description}</p>
                  )}
                  {g.milestone && (
                    <div className="mt-3 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-surface-subtle" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.title}: your progress`}>
                      <div className="h-full rounded-full bg-accent-600" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </button>
                {expanded && (
                <ul id={`group-${g.key}`} className="divide-y divide-surface-subtle">
                  {g.tasks.map((task) => (
                    <li key={task._id}>
                      <button
                        className="w-full grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_8rem_8rem_7rem] items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left hover:bg-surface-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500"
                        onClick={() => {
                          setSelectedTask(task);
                          setUpdateError("");
                          setProofFiles([]);
                          setProofRemoved([]);
                        }}
                      >
                        <span className="min-w-0">
                          <span className="block font-medium text-ink truncate">{task.title}</span>
                          {task.description && <span className="block text-sm text-ink-muted truncate">{task.description}</span>}
                          <span className="block sm:hidden mt-0.5 text-xs text-ink-muted">Due {formatDateOrNA(task.deadline)}</span>
                        </span>
                        <span className="hidden sm:block text-sm text-ink-muted tabular-nums">
                          {task.startDate ? new Date(task.startDate).toLocaleDateString() : "—"}
                        </span>
                        <span className="hidden sm:block text-sm text-ink tabular-nums">{formatDateOrNA(task.deadline)}</span>
                        <span className={`justify-self-end sm:justify-self-start inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone(task.status)}`}>
                          {task.status}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

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
                    <p><span className="font-medium text-ink-muted">Start Date:</span> {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString() : "N/A"}</p>
                    <p><span className="font-medium text-ink-muted">Deadline:</span> {formatDateOrNA(selectedTask.deadline)}</p>
                    <p><span className="font-medium text-ink-muted">Assigned By:</span> {selectedTask.assignedBy?.name || "Team Lead"}</p>
                    {proofsOf(selectedTask).length > 0 && (
                      <p>
                        <span className="font-medium text-ink">Work Proof:</span>{" "}
                        {proofsOf(selectedTask).length} file{proofsOf(selectedTask).length > 1 ? "s" : ""} attached
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

              {selectedTask.reference && (
                <div className="mb-6">
                  <ReferenceView url={selectedTask.reference} name={selectedTask.referenceName} />
                </div>
              )}

              <div className="border-t border-surface-subtle pt-5">
                {selectedTask.status === "Completed" ? (
                  <div className="space-y-4">
                    <p className="flex items-center gap-2 text-sm text-ink">
                      <FiCheckCircle className="text-accent-700 text-lg shrink-0" aria-hidden="true" />
                      Your team lead marked this task completed.
                    </p>
                    {proofsOf(selectedTask).length > 0 && (
                      <div>
                        <p className="block text-sm font-medium text-ink mb-1.5">Your work proof</p>
                        <WorkProofField existing={proofsOf(selectedTask)} editable={false} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedTask.status === "Review" ? (
                      <p className="flex items-center gap-2 text-sm text-ink">
                        <FiClock className="text-brand-500 text-lg shrink-0" aria-hidden="true" />
                        Sent to your team lead for review. You can resubmit with new proof.
                      </p>
                    ) : (
                      <p className="text-sm text-ink-muted">
                        Done with this? Your team lead will review it and mark it completed.
                      </p>
                    )}
                    <div>
                      <p className="block text-sm font-medium text-ink mb-1.5">
                        Work proof <span className="font-normal text-ink-muted">(optional)</span>
                      </p>
                      <WorkProofField
                        existing={proofsOf(selectedTask)}
                        files={proofFiles}
                        onFilesChange={setProofFiles}
                        removed={proofRemoved}
                        onRemovedChange={setProofRemoved}
                        editable
                        disabled={updating}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleMarkDone}
                        disabled={updating}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-700 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 outline-none disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                      >
                        <FiCheckCircle aria-hidden="true" />
                        {updating ? "Sending..." : selectedTask.status === "Review" ? "Resubmit for review" : "I've completed this task"}
                      </button>
                    </div>
                  </div>
                )}
                {updateError && <p role="alert" className="mt-3 text-sm text-red-700">{updateError}</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TaskList;
