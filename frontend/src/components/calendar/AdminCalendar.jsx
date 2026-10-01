// Admin calendar — ported from nutri_hrms client/src/pages/admin/AdminCalendarPage.jsx.
// Clicking a day opens "New calendar event" for that date; events this month
// are listed beside the grid with Remove. Mirrors mobile admin_calendar_screen.dart.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { FaPlus, FaDownload, FaRegCalendarAlt, FaHome, FaTrashAlt, FaTimes } from "react-icons/fa";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";
import MonthCalendar from "./MonthCalendar";

const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } });

// Local calendar date -> "YYYY-MM-DD".
const toDateInput = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const emptyForm = (dateStr) => ({ date: dateStr, type: "holiday", title: "", description: "" });
const BADGE = {
  holiday: { label: "Holiday", cls: "bg-red-50 text-red-700" },
  wfh: { label: "WFH", cls: "bg-green-50 text-green-700" },
};
const badgeFor = (t) => BADGE[t] || { label: t ? t[0].toUpperCase() + t.slice(1) : "Event", cls: "bg-surface-subtle text-ink-muted" };

const NewEventModal = ({ form, setForm, onClose, onSubmit, saving }) => {
  const titleRef = useRef(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const input = "mt-1.5 w-full rounded-lg border border-surface-subtle bg-white px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-accent-500";
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-brand-950/50 p-4" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-event-title"
        onSubmit={onSubmit}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-panel"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="new-event-title" className="text-lg font-semibold text-ink">New calendar event</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted">
            <FaTimes aria-hidden="true" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Date *
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className={input} />
          </label>
          <label className="block text-sm font-medium text-ink">
            Type *
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={input}>
              <option value="holiday">Holiday</option>
              <option value="wfh">Work from home</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-ink sm:col-span-2">
            Title *
            <input ref={titleRef} placeholder="e.g. Independence Day" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={input} />
          </label>
          <label className="block text-sm font-medium text-ink sm:col-span-2">
            Description (optional)
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={input} />
          </label>
        </div>
        <div className="mt-6 flex gap-2">
          <button type="submit" disabled={saving} className="rounded-full bg-accent-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-surface-subtle px-6 py-2.5 text-sm font-semibold text-ink hover:bg-surface-muted">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

const AdminCalendar = () => {
  useMeta({
    title: "Calendar — Speshway HRMS",
    description: "Mark holidays and work-from-home days for employees.",
    keywords: "calendar, holidays, HRMS",
    image: "/images/Logo.jpg",
    url: `${window.location.origin}/admin-dashboard/calendar`,
  });

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(now);
  const [form, setForm] = useState(emptyForm(toDateInput(now)));
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { text, tone }

  const showToast = (text, tone = "success") => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/events`, auth());
      setEvents(data.events || []);
    } catch {
      showToast("Failed to load calendar events", "error");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const goPrevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const openForm = (date) => {
    setSelectedDate(date);
    setForm(emptyForm(toDateInput(date)));
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.title.trim()) return showToast("Date and title are required", "error");
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/api/events/add`, { ...form, title: form.title.trim() }, auth());
      showToast("Event added");
      setShowForm(false);
      await load();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to add event", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this event?")) return;
    try {
      await axios.delete(`${API_BASE}/api/events/${id}`, auth());
      showToast("Event removed");
      await load();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to remove event", "error");
    }
  };

  const handleImportIndia = async () => {
    if (!window.confirm("Import India public holidays? Existing matching holidays will be skipped.")) return;
    setImporting(true);
    try {
      const { data } = await axios.post(`${API_BASE}/api/events/seed`, {}, auth());
      showToast(data.message || "Holidays imported");
      await load();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to import India holidays", "error");
    } finally {
      setImporting(false);
    }
  };

  // Events in the month on screen (dates are UTC midnight of the day).
  const sortedEvents = useMemo(
    () =>
      events
        .filter((ev) => {
          const d = new Date(ev.date);
          return d.getUTCFullYear() === year && d.getUTCMonth() === month;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [events, month, year]
  );

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">Calendar</h1>
          <p className="text-sm sm:text-base text-ink-muted">Mark holidays and work-from-home days so employees can see them on their dashboard.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={importing}
            onClick={handleImportIndia}
            className="inline-flex items-center gap-2 rounded-full border border-surface-subtle bg-white px-5 py-3 text-sm font-semibold text-ink shadow-card hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent-500 outline-none disabled:opacity-60"
          >
            <FaDownload aria-hidden="true" /> {importing ? "Importing…" : "Import India holidays"}
          </button>
          <button
            type="button"
            onClick={() => openForm(new Date())}
            className="inline-flex items-center gap-2 rounded-full bg-accent-600 px-5 py-3 text-sm font-semibold text-white shadow-panel hover:bg-accent-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-500 outline-none"
          >
            <FaPlus aria-hidden="true" /> Add event
          </button>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <MonthCalendar
          month={month}
          year={year}
          events={events}
          onPrevMonth={goPrevMonth}
          onNextMonth={goNextMonth}
          onDayClick={openForm}
          selectedDate={selectedDate}
        />

        <section aria-labelledby="month-events" className="rounded-2xl border border-surface-subtle bg-white p-5 sm:p-7">
          <h2 id="month-events" className="flex items-center gap-2 text-lg font-semibold text-ink">
            <FaRegCalendarAlt aria-hidden="true" /> Events this month
          </h2>
          <p className="mt-0.5 text-sm text-accent-700">{sortedEvents.length ? `${sortedEvents.length} event(s)` : "No events yet"}</p>

          <div className="mt-5">
            {loading ? (
              <p className="text-sm text-ink-muted">Loading…</p>
            ) : sortedEvents.length === 0 ? (
              <p className="text-sm text-ink-muted">No holidays or work-from-home days marked for this month.</p>
            ) : (
              <div className="grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
                {sortedEvents.map((ev) => {
                  const b = badgeFor(ev.type);
                  return (
                    <div key={ev._id} className="flex flex-col gap-2.5 rounded-xl border border-surface-subtle bg-surface-muted p-4">
                      <div className="flex items-start justify-between gap-2">
                        <strong className="flex min-w-0 items-center gap-1.5 text-[15px] text-ink">
                          {ev.type === "wfh" ? <FaHome size={14} aria-hidden="true" /> : <FaRegCalendarAlt size={14} aria-hidden="true" />}
                          <span className="break-words">{ev.title}</span>
                        </strong>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.cls}`}>{b.label}</span>
                      </div>
                      <p className="text-base text-ink">
                        {new Date(ev.date).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", timeZone: "UTC" })}
                      </p>
                      {ev.description && <p className="text-sm text-ink-muted">{ev.description}</p>}
                      <button
                        type="button"
                        onClick={() => handleDelete(ev._id)}
                        className="mt-1 inline-flex items-center justify-center gap-2 rounded-full border border-surface-subtle bg-white py-2.5 text-sm font-semibold text-ink hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
                      >
                        <FaTrashAlt size={12} aria-hidden="true" /> Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {showForm && (
        <NewEventModal form={form} setForm={setForm} onClose={() => setShowForm(false)} onSubmit={handleSubmit} saving={saving} />
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[70] rounded-lg px-4 py-3 text-sm font-medium text-white shadow-panel ${toast.tone === "error" ? "bg-red-600" : "bg-accent-700"}`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
