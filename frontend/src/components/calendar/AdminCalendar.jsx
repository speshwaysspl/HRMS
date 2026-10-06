// Admin calendar — ported from nutri_hrms client/src/pages/admin/AdminCalendarPage.jsx.
// Clicking a day opens "New calendar event" for that date; events this month
// are listed beside the grid with Remove. Mirrors mobile admin_calendar_screen.dart.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { FaPlus, FaDownload, FaRegCalendarAlt, FaHome, FaTrashAlt, FaTimes } from "react-icons/fa";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";
import MonthCalendar from "./MonthCalendar";
import { useLiveData } from "../../context/NotificationContext";

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
  useLiveData(["events", "leave"], () => { load(); });
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
  const [dayFilter, setDayFilter] = useState(null); // "YYYY-MM-DD" or null
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
    setDayFilter(null);
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    setDayFilter(null);
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const openForm = (date) => {
    setForm(emptyForm(toDateInput(date || selectedDate || new Date())));
    setShowForm(true);
  };

  // A day with events filters the agenda; an empty day goes straight to "add".
  const handleDayClick = (date, dayEvents) => {
    setSelectedDate(date);
    if (dayEvents.length) setDayFilter(toDateInput(date));
    else { setDayFilter(null); openForm(date); }
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

  const summary = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const holidayWeekdays = new Set();
    let holidays = 0;
    let wfh = 0;
    sortedEvents.forEach((ev) => {
      const d = new Date(ev.date);
      if (ev.type === "holiday") {
        holidays += 1;
        if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) holidayWeekdays.add(d.getUTCDate());
      } else if (ev.type === "wfh") wfh += 1;
    });
    let weekdays = 0;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dow = new Date(year, month, day).getDay();
      if (dow !== 0 && dow !== 6) weekdays += 1;
    }
    return { holidays, wfh, working: weekdays - holidayWeekdays.size };
  }, [sortedEvents, month, year]);

  const visibleEvents = dayFilter ? sortedEvents.filter((ev) => ev.date.slice(0, 10) === dayFilter) : sortedEvents;
  const todayKey = toDateInput(now);
  const monthName = new Date(year, month, 1).toLocaleString("en-GB", { month: "long" });
  const filterLabel = dayFilter
    ? new Date(`${dayFilter}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    : null;
  const primaryBtn =
    "inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent-600 px-5 text-sm font-semibold text-white hover:bg-accent-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-500 outline-none";

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">Calendar</h1>
          <p className="mt-1 max-w-[60ch] text-sm text-ink-muted">Holidays and work-from-home days you mark here appear on every employee's dashboard.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={importing}
            onClick={handleImportIndia}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-surface-subtle bg-white px-5 text-sm font-semibold text-ink hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent-500 outline-none disabled:opacity-60"
          >
            <FaDownload aria-hidden="true" /> {importing ? "Importing…" : "Import India holidays"}
          </button>
          <button type="button" onClick={() => openForm(dayFilter ? new Date(`${dayFilter}T00:00:00`) : new Date())} className={primaryBtn}>
            <FaPlus aria-hidden="true" /> Add event
          </button>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(360px,460px)_1fr]">
        <div className="flex flex-col gap-4">
          <MonthCalendar
            month={month}
            year={year}
            events={events}
            onPrevMonth={goPrevMonth}
            onNextMonth={goNextMonth}
            onDayClick={handleDayClick}
            selectedDate={selectedDate}
          />
          <dl className="grid grid-cols-3 divide-x divide-surface-subtle rounded-2xl border border-surface-subtle bg-white py-4 text-center">
            {[
              ["Working days", summary.working, "text-ink"],
              ["Holidays", summary.holidays, "text-red-700"],
              ["WFH days", summary.wfh, "text-blue-700"],
            ].map(([label, value, cls]) => (
              <div key={label} className="px-2">
                <dt className="text-xs font-medium text-ink-muted">{label}</dt>
                <dd className={`mt-1 text-2xl font-semibold tabular-nums ${cls}`}>{loading ? "–" : value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <section aria-labelledby="month-events" className="rounded-2xl border border-surface-subtle bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-subtle px-5 py-4 sm:px-6">
            <div>
              <h2 id="month-events" className="text-lg font-semibold text-ink">{filterLabel || `${monthName} ${year}`}</h2>
              <p className="text-sm text-ink-muted">
                {loading ? "Loading events…" : `${visibleEvents.length} ${visibleEvents.length === 1 ? "event" : "events"}`}
              </p>
            </div>
            {dayFilter && (
              <button
                type="button"
                onClick={() => setDayFilter(null)}
                className="min-h-[40px] rounded-full px-4 text-sm font-semibold text-accent-700 hover:bg-accent-50 focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
              >
                Show whole month
              </button>
            )}
          </div>

          {loading ? (
            <ul className="divide-y divide-surface-subtle" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <div className="h-14 w-14 animate-pulse rounded-xl bg-surface-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-surface-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
                  </div>
                </li>
              ))}
            </ul>
          ) : visibleEvents.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-muted text-ink-muted">
                <FaRegCalendarAlt aria-hidden="true" />
              </span>
              <p className="mt-3 font-semibold text-ink">Nothing marked for {monthName}</p>
              <p className="mt-1 max-w-[42ch] text-sm text-ink-muted">Click any day on the calendar to add a holiday or work-from-home day, or import India's public holidays.</p>
              <button type="button" onClick={() => openForm(new Date(year, month, 1))} className={`mt-5 ${primaryBtn}`}>
                <FaPlus aria-hidden="true" /> Add event
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-surface-subtle">
              {visibleEvents.map((ev) => {
                const b = badgeFor(ev.type);
                const d = new Date(ev.date);
                const key = ev.date.slice(0, 10);
                const isWfh = ev.type === "wfh";
                return (
                  <li key={ev._id} className={`flex items-center gap-4 px-5 py-4 sm:px-6 ${key < todayKey ? "opacity-60" : ""}`}>
                    <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl ${isWfh ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
                      <span className="text-[11px] font-semibold uppercase">{d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</span>
                      <span className="text-xl font-semibold leading-none tabular-nums">{d.getUTCDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words font-semibold text-ink">{ev.title}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${b.cls}`}>
                          {isWfh && <FaHome size={10} aria-hidden="true" />}
                          {b.label}
                        </span>
                        {key === todayKey && <span className="rounded-full bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700">Today</span>}
                      </div>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
                        {ev.description ? ` · ${ev.description}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(ev._id)}
                      aria-label={`Remove ${ev.title}`}
                      title="Remove"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
                    >
                      <FaTrashAlt size={14} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
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
