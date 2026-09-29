import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FiFlag, FiCalendar, FiEdit2, FiTrash2, FiCheckCircle, FiRotateCcw, FiX, FiPlus } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";

const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } });
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toInput = (v) => (v ? ymd(new Date(v)) : "");
const fmt = (v) => new Date(v).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

// Monday–Sunday of the week containing `base`, shifted by `offset` weeks.
export const weekRange = (offset = 0, base = new Date()) => {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { startDate: ymd(monday), dueDate: ymd(sunday) };
};

const dueLabel = (m) => {
  if (m.state === "closed") return { text: `Closed ${m.closedAt ? fmt(m.closedAt) : ""}`.trim(), tone: "text-ink-muted" };
  if (!m.dueDate) return { text: "No due date", tone: "text-ink-muted" };
  const today = new Date(ymd(new Date()));
  const due = new Date(ymd(new Date(m.dueDate)));
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { text: `Past due by ${-days} day${days === -1 ? "" : "s"}`, tone: "text-red-700 font-medium" };
  if (days === 0) return { text: "Due today", tone: "text-amber-700 font-medium" };
  return { text: `Due by ${fmt(m.dueDate)}`, tone: "text-ink-muted" };
};

const fieldCls = "w-full border border-surface-subtle rounded-lg px-3 py-2.5 text-sm text-ink bg-white placeholder:text-ink-faint focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none";

/**
 * GitHub-style milestones for a team: open/closed list with progress, and
 * create / edit / close / reopen / delete for the team lead or an admin.
 */
const MilestonesPanel = ({ teamId, milestones, canManage, onChanged, onViewTasks, unplannedCount = 0 }) => {
  const reduceMotion = useReducedMotion();
  const [view, setView] = useState("open");
  const [form, setForm] = useState(null); // { _id?, title, description, startDate, dueDate }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState("");

  const open = milestones.filter((m) => m.state === "open");
  const closed = milestones.filter((m) => m.state === "closed");
  const shown = view === "open" ? open : closed;

  const startNew = () => {
    setFormError("");
    setForm({ title: "", description: "", ...weekRange(0) });
  };
  const startEdit = (m) => {
    setFormError("");
    setForm({ _id: m._id, title: m.title, description: m.description || "", startDate: toInput(m.startDate), dueDate: toInput(m.dueDate) });
  };
  const closeForm = () => !saving && setForm(null);

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setFormError("Give the milestone a title.");
    if (form.startDate && form.dueDate && form.dueDate < form.startDate) return setFormError("Due date can't be before the start date.");
    setSaving(true);
    setFormError("");
    try {
      const body = { title: form.title.trim(), description: form.description, startDate: form.startDate, dueDate: form.dueDate };
      if (form._id) await axios.put(`${API_BASE}/api/milestone/${form._id}`, body, auth());
      else await axios.post(`${API_BASE}/api/milestone`, { ...body, teamId }, auth());
      setForm(null);
      if (!form._id) setView("open");
      onChanged();
    } catch (err) {
      setFormError(err.response?.data?.error || "Couldn't save the milestone. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const act = async (m, fn) => {
    setBusyId(m._id);
    setRowError("");
    try {
      await fn();
      onChanged();
    } catch (err) {
      setRowError(err.response?.data?.error || "Something went wrong. Try again.");
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  };
  const setState = (m, state) => act(m, () => axios.put(`${API_BASE}/api/milestone/${m._id}`, { state }, auth()));
  const remove = (m) => act(m, () => axios.delete(`${API_BASE}/api/milestone/${m._id}`, auth()));

  const quickWeek = (offset) => setForm((f) => ({ ...f, ...weekRange(offset) }));

  return (
    <section className="bg-white rounded-xl shadow-card border border-surface-subtle" aria-labelledby="ms-heading">
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-surface-subtle">
        <h3 id="ms-heading" className="sr-only">Milestones</h3>
        <div role="tablist" aria-label="Milestone state" className="flex items-center gap-1 mr-auto">
          {[
            ["open", "Open", open.length, FiFlag],
            ["closed", "Closed", closed.length, FiCheckCircle],
          ].map(([key, label, count, Icon]) => (
            <button
              key={key}
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors ${view === key ? "bg-surface-muted text-ink" : "text-ink-muted hover:text-ink"}`}
            >
              <Icon aria-hidden="true" /> <span className="tabular-nums">{count}</span> {label}
            </button>
          ))}
        </div>
        {canManage && (
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 outline-none transition-colors"
          >
            <FiPlus aria-hidden="true" /> New milestone
          </button>
        )}
      </div>

      {rowError && <p role="alert" className="px-5 pt-3 text-sm text-red-700">{rowError}</p>}

      {shown.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-700">
            <FiFlag className="text-xl" aria-hidden="true" />
          </div>
          <p className="font-semibold text-ink">{view === "open" ? "No open milestones" : "No closed milestones yet"}</p>
          <p className="mt-1 text-sm text-ink-muted max-w-sm mx-auto">
            {view === "open"
              ? canManage
                ? "Plan the week: create a milestone, open it and add its tasks."
                : "Your team lead hasn't planned a milestone yet."
              : "Close a milestone when its week is done to keep this list tidy."}
          </p>
          {view === "open" && canManage && (
            <button
              onClick={startNew}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 outline-none"
            >
              <FiPlus aria-hidden="true" /> New milestone
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-surface-subtle">
          {shown.map((m) => {
            const due = dueLabel(m);
            const busy = busyId === m._id;
            return (
              <li
                key={m._id}
                onClick={() => onViewTasks(m._id)}
                className="grid cursor-pointer gap-4 px-5 py-4 transition-colors hover:bg-surface-muted md:grid-cols-[minmax(0,1fr)_16rem]"
              >
                <div className="min-w-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onViewTasks(m._id); }}
                    className="text-left text-lg font-semibold text-ink hover:text-accent-700 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
                  >
                    {m.title}
                  </button>
                  <p className={`mt-1 flex flex-wrap items-center gap-x-2 text-sm ${due.tone}`}>
                    <FiCalendar aria-hidden="true" className="shrink-0" />
                    {due.text}
                    {m.startDate && m.state === "open" && (
                      <span className="text-ink-muted font-normal">· starts {fmt(m.startDate)}</span>
                    )}
                  </p>
                  {m.description && <p className="mt-2 text-sm text-ink-muted line-clamp-2 max-w-prose">{m.description}</p>}
                </div>

                <div className="min-w-0">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle" role="progressbar" aria-valuenow={m.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.title} progress`}>
                    <div className="h-full rounded-full bg-accent-600 transition-[width]" style={{ width: `${m.progress}%` }} />
                  </div>
                  <p className="mt-1.5 flex flex-wrap gap-x-3 text-sm text-ink-muted tabular-nums">
                    <span><span className="font-semibold text-ink">{m.progress}%</span> complete</span>
                    <span><span className="font-semibold text-ink">{m.openTasks}</span> open</span>
                    <span><span className="font-semibold text-ink">{m.completedTasks}</span> done</span>
                  </p>

                  {canManage && (
                    <div onClick={(e) => e.stopPropagation()}>
                    {confirmDelete === m._id ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-ink">Delete? Tasks stay, unlinked.</span>
                        <button onClick={() => remove(m)} disabled={busy} className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 outline-none disabled:opacity-60">
                          {busy ? "Deleting..." : "Delete"}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="rounded-lg px-3 py-1.5 font-medium text-ink hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent-500 outline-none">
                          Keep
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-x-1 text-sm">
                        <button onClick={() => startEdit(m)} className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 font-medium text-accent-700 hover:bg-accent-50 focus-visible:ring-2 focus-visible:ring-accent-500 outline-none">
                          <FiEdit2 aria-hidden="true" /> Edit
                        </button>
                        {m.state === "open" ? (
                          <button onClick={() => setState(m, "closed")} disabled={busy} className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 font-medium text-accent-700 hover:bg-accent-50 focus-visible:ring-2 focus-visible:ring-accent-500 outline-none disabled:opacity-60">
                            <FiCheckCircle aria-hidden="true" /> Close
                          </button>
                        ) : (
                          <button onClick={() => setState(m, "open")} disabled={busy} className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 font-medium text-accent-700 hover:bg-accent-50 focus-visible:ring-2 focus-visible:ring-accent-500 outline-none disabled:opacity-60">
                            <FiRotateCcw aria-hidden="true" /> Reopen
                          </button>
                        )}
                        <button onClick={() => setConfirmDelete(m._id)} className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 font-medium text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 outline-none">
                          <FiTrash2 aria-hidden="true" /> Delete
                        </button>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {view === "open" && unplannedCount > 0 && (
        <button
          onClick={() => onViewTasks("none")}
          className="flex w-full items-center justify-between gap-3 border-t border-surface-subtle px-5 py-3.5 text-left text-sm hover:bg-surface-muted outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500"
        >
          <span>
            <span className="font-medium text-ink">Unplanned tasks</span>
            <span className="block text-ink-muted">Tasks not in any milestone</span>
          </span>
          <span className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-xs font-medium tabular-nums text-ink-muted">{unplannedCount}</span>
        </button>
      )}

      {/* Create / edit */}
      <AnimatePresence>
        {form && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            className="fixed inset-0 z-50 bg-brand-950/60 flex justify-center items-end sm:items-center sm:p-4"
            onClick={closeForm}
            onKeyDown={(e) => e.key === "Escape" && closeForm()}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ms-form-heading"
              initial={reduceMotion ? { opacity: 0 } : { y: 16, opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { y: 16, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-xl shadow-panel border border-surface-subtle"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4 border-b border-surface-subtle">
                <h3 id="ms-form-heading" className="text-lg font-semibold text-ink">{form._id ? "Edit milestone" : "New milestone"}</h3>
                <button type="button" onClick={closeForm} aria-label="Close" className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent-500 outline-none">
                  <FiX aria-hidden="true" />
                </button>
              </div>
              <form id="ms-form" onSubmit={save} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <div>
                  <label htmlFor="ms-title" className="block text-sm font-medium text-ink mb-1.5">Title</label>
                  <input id="ms-title" autoFocus className={fieldCls} placeholder="e.g. Week 40 – Auth screens" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium text-ink">Week</span>
                    <div className="flex gap-1">
                      {[["This week", 0], ["Next week", 1]].map(([label, off]) => {
                        const r = weekRange(off);
                        const on = form.startDate === r.startDate && form.dueDate === r.dueDate;
                        return (
                          <button key={label} type="button" onClick={() => quickWeek(off)} className={`rounded-full border px-3 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-accent-500 outline-none ${on ? "border-accent-600 bg-accent-50 text-accent-800" : "border-surface-subtle text-ink hover:bg-surface-muted"}`}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="ms-start" className="block text-xs text-ink-muted mb-1">Starts</label>
                      <input id="ms-start" type="date" className={fieldCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                    </div>
                    <div>
                      <label htmlFor="ms-due" className="block text-xs text-ink-muted mb-1">Due</label>
                      <input id="ms-due" type="date" min={form.startDate || undefined} className={fieldCls} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="ms-desc" className="block text-sm font-medium text-ink mb-1.5">
                    Description <span className="font-normal text-ink-muted">(optional)</span>
                  </label>
                  <textarea id="ms-desc" rows={3} className={`${fieldCls} resize-y`} placeholder="What should the team ship this week?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
              </form>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-subtle">
                <button type="button" onClick={closeForm} className="border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg px-4 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-accent-500 outline-none">
                  Cancel
                </button>
                <button type="submit" form="ms-form" disabled={saving} className="rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-700 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 outline-none disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving ? "Saving..." : form._id ? "Save changes" : "Create milestone"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default MilestonesPanel;
