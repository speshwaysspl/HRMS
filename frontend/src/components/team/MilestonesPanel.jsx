import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FiFlag, FiCalendar, FiEdit2, FiTrash2, FiCheckCircle, FiRotateCcw, FiX, FiCheck, FiClock, FiList, FiMoreVertical, FiTrendingUp } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";
import emptyMilestones from "../../assets/empty_milestones.svg";

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

// "Week-3" -> "W3", "Auth screens" -> "AS", "Sprint" -> "S".
const badge = (title = "") => {
  const week = /week\s*[-_ ]?\s*(\d+)/i.exec(title);
  if (week) return `W${week[1]}`;
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
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
  const [menuId, setMenuId] = useState(null);

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

  const total = open.length + closed.length;
  const summary = [
    { key: "open", label: "Open milestones", count: open.length, Icon: FiFlag },
    { key: "closed", label: "Closed milestones", count: closed.length, Icon: FiCheckCircle },
  ];

  return (
    <section aria-labelledby="ms-heading">
      <h3 id="ms-heading" className="sr-only">Milestones</h3>
      <div className="flex flex-wrap items-stretch gap-3 mb-4">
        <div role="tablist" aria-label="Milestone state" className="grid flex-1 grid-cols-2 gap-3 min-w-[16rem]">
          {summary.map(({ key, label, count, Icon }) => {
            const on = view === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={on}
                onClick={() => setView(key)}
                className={`rounded-2xl border p-3 sm:p-4 text-left shadow-card transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${on ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-surface-subtle bg-white hover:border-brand-200"}`}
              >
                <span className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg text-brand-700 ${on ? "bg-white" : "bg-brand-50"}`}>
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-2xl font-bold text-ink tabular-nums">{count}</span>
                    <span className="block truncate text-sm text-ink-muted">{label}</span>
                  </span>
                </span>
                <span className="mt-3 block h-1 overflow-hidden rounded-full bg-surface-subtle" aria-hidden="true">
                  <span className="block h-full rounded-full bg-brand-600" style={{ width: `${total ? Math.round((count / total) * 100) : 0}%` }} />
                </span>
              </button>
            );
          })}
        </div>
        {canManage && (
          <button
            onClick={startNew}
            className="inline-flex min-h-[44px] items-center gap-2 self-center rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 outline-none transition-colors"
          >
            <FiFlag aria-hidden="true" /> New Milestone
          </button>
        )}
      </div>

      {rowError && <p role="alert" className="mb-3 text-sm text-red-700">{rowError}</p>}

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-surface-subtle bg-white px-6 py-12 text-center shadow-card">
          {view === "open" ? (
            <img src={emptyMilestones} alt="" className="mx-auto mb-4 w-full max-w-[280px]" />
          ) : (
            <div className="mx-auto mb-5 flex h-32 w-32 items-center justify-center rounded-full bg-brand-50">
              <FiCheckCircle className="text-5xl text-green-700" aria-hidden="true" />
            </div>
          )}
          <p className="text-xl font-bold text-ink">{view === "open" ? "No open milestones" : "No closed milestones yet"}</p>
          <p className="mt-1.5 text-sm text-ink-muted max-w-sm mx-auto">
            {view === "open"
              ? canManage
                ? "Plan the week: tap New Milestone, open it and add its tasks."
                : "Your team lead hasn't planned a milestone yet."
              : "Close a milestone when its week is done to keep this list tidy."}
          </p>
          {view === "open" && canManage && (
            <ol className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-2">
              {[
                ["Create a milestone", FiFlag],
                ["Add tasks", FiList],
                ["Track progress", FiTrendingUp],
              ].map(([label, Icon]) => (
                <li key={label} className="flex flex-col items-center gap-2">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-lg text-brand-700"><Icon aria-hidden="true" /></span>
                  <span className="text-sm text-ink-muted">{label}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((m) => {
            const due = dueLabel(m);
            const busy = busyId === m._id;
            const late = m.state === "open" && due.text.startsWith("Past due");
            const chip = m.state === "closed"
              ? { label: "Closed", Icon: FiCheck, cls: "bg-green-50 text-green-700" }
              : late
                ? { label: "Overdue", Icon: FiClock, cls: "bg-red-50 text-red-700" }
                : { label: "Open", Icon: FiFlag, cls: "bg-brand-50 text-brand-700" };
            return (
              <li
                key={m._id}
                onClick={() => onViewTasks(m._id)}
                className="relative cursor-pointer rounded-2xl border border-surface-subtle bg-white p-4 shadow-card transition-colors hover:border-brand-200"
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold bg-brand-50 text-brand-700`}>{badge(m.title)}</span>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onViewTasks(m._id); }}
                      className="text-left text-lg font-bold text-ink hover:text-brand-700 outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
                    >
                      {m.title}
                    </button>
                    <p className={`mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm ${due.tone}`}>
                      <FiCalendar aria-hidden="true" className="shrink-0" />
                      {due.text}
                    </p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${chip.cls}`}>
                    <chip.Icon aria-hidden="true" /> {chip.label}
                  </span>
                  {canManage && (
                    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setMenuId(menuId === m._id ? null : m._id)}
                        aria-label={`Actions for ${m.title}`}
                        aria-haspopup="menu"
                        aria-expanded={menuId === m._id}
                        className="-mr-1 -mt-1 rounded-lg p-2.5 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
                      >
                        <FiMoreVertical aria-hidden="true" />
                      </button>
                      {menuId === m._id && (
                        <>
                          <button aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuId(null)} />
                          <div role="menu" onKeyDown={(e) => e.key === "Escape" && setMenuId(null)} className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-surface-subtle bg-white py-1 shadow-panel">
                            <button role="menuitem" autoFocus onClick={() => { setMenuId(null); startEdit(m); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-surface-muted focus-visible:bg-surface-muted outline-none">
                              <FiEdit2 aria-hidden="true" /> Edit
                            </button>
                            {m.state === "open" ? (
                              <button role="menuitem" disabled={busy} onClick={() => { setMenuId(null); setState(m, "closed"); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-surface-muted focus-visible:bg-surface-muted outline-none disabled:opacity-60">
                                <FiCheckCircle aria-hidden="true" /> Close
                              </button>
                            ) : (
                              <button role="menuitem" disabled={busy} onClick={() => { setMenuId(null); setState(m, "open"); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-surface-muted focus-visible:bg-surface-muted outline-none disabled:opacity-60">
                                <FiRotateCcw aria-hidden="true" /> Reopen
                              </button>
                            )}
                            <button role="menuitem" onClick={() => { setMenuId(null); setConfirmDelete(m._id); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-700 hover:bg-red-50 focus-visible:bg-red-50 outline-none">
                              <FiTrash2 aria-hidden="true" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {m.description && <p className="mt-3 text-sm text-ink-muted line-clamp-2">{m.description}</p>}

                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-subtle" role="progressbar" aria-valuenow={m.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.title} progress`}>
                    <div className="h-full rounded-full bg-green-700 transition-[width]" style={{ width: `${m.progress}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-ink tabular-nums">{m.progress}%</span>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    ["Done", m.completedTasks ?? 0, FiCheckCircle, "text-green-700"],
                    ["Open", m.openTasks ?? 0, FiList, "text-brand-700"],
                    ["Overdue", m.overdueTasks ?? 0, FiClock, "text-red-700"],
                  ].map(([label, v, Icon, c]) => (
                    <div key={label} className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2.5">
                      <Icon className={`shrink-0 text-lg ${c}`} aria-hidden="true" />
                      <span className="min-w-0">
                        <dd className="text-base font-bold text-ink tabular-nums leading-tight">{v}</dd>
                        <dt className="text-xs text-ink-muted">{label}</dt>
                      </span>
                    </div>
                  ))}
                </dl>

                {canManage && confirmDelete === m._id && (
                  <div onClick={(e) => e.stopPropagation()} className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm">
                    <span className="text-ink">Delete? Tasks stay, unlinked.</span>
                    <button onClick={() => remove(m)} disabled={busy} className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 outline-none disabled:opacity-60">
                      {busy ? "Deleting..." : "Delete"}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="rounded-lg px-3 py-1.5 font-medium text-ink hover:bg-white focus-visible:ring-2 focus-visible:ring-accent-500 outline-none">
                      Keep
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {view === "open" && unplannedCount > 0 && (
        <button
          onClick={() => onViewTasks("none")}
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-surface-subtle bg-white px-5 py-3.5 text-left text-sm shadow-card hover:bg-surface-muted outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
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
