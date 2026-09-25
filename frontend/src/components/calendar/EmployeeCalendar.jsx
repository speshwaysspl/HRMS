import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiChevronLeft, FiChevronRight, FiUsers, FiCalendar } from "react-icons/fi";
import { MdOutlineCelebration } from "react-icons/md";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString } from "../../utils/dateTimeUtils";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";

// Employee "Calendar & Holidays" — same layout as the mobile
// CalendarScreen (mobile/lib/screens/employee/calendar_screen.dart):
// month card with round day cells (holidays tinted brand blue, event dots),
// the selected day's events below, then upcoming holidays.

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const TYPE_STYLE = {
  holiday: { icon: MdOutlineCelebration, fg: "text-brand-600", bg: "bg-brand-50", dot: "bg-brand-600" },
  meeting: { icon: FiUsers, fg: "text-blue-600", bg: "bg-blue-50", dot: "bg-blue-600" },
  event: { icon: FiCalendar, fg: "text-accent-700", bg: "bg-accent-50", dot: "bg-accent-700" },
};
const styleFor = (type) => TYPE_STYLE[type] || TYPE_STYLE.event;

// Events are stored at midnight UTC of the chosen day.
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
const pad = (n) => String(n).padStart(2, "0");
const daysAway = (key, today) => {
  const n = Math.round((new Date(`${key}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / 86400000);
  return n === 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`;
};
const fmt = (key, opts) => new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", ...opts });

const EmployeeCalendar = () => {
  const today = toISTDateString(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [month, setMonth] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
  const [selected, setSelected] = useState(today);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_BASE}/api/events`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      setEvents((data.events || []).map((e) => ({ ...e, key: dayKey(e.date) })).sort((a, b) => a.key.localeCompare(b.key)));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const byDay = useMemo(() => {
    const map = {};
    events.forEach((e) => (map[e.key] ||= []).push(e));
    return map;
  }, [events]);

  const upcomingHolidays = useMemo(
    () => events.filter((e) => e.type === "holiday" && e.key >= today).slice(0, 6),
    [events, today]
  );

  const shift = (delta) => {
    setMonth(({ y, m }) => {
      const d = new Date(Date.UTC(y, m - 1 + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
    });
    setSelected(null);
  };

  if (loading) return <LoadingState message="Loading calendar..." />;
  if (error) return <ErrorState title="Couldn't load the calendar" onRetry={load} />;

  const daysInMonth = new Date(Date.UTC(month.y, month.m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(month.y, month.m - 1, 1)).getUTCDay() + 6) % 7; // Monday-first
  const monthLabel = fmt(`${month.y}-${pad(month.m)}-01`, { month: "long", year: "numeric" });
  const selectedEvents = selected ? byDay[selected] || [] : [];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl md:text-2xl font-semibold text-ink mb-4">Calendar &amp; Holidays</h1>

      {/* Month card */}
      <section className="bg-white rounded-2xl border border-surface-subtle p-4 md:p-6">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month"
            className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <FiChevronLeft size={20} />
          </button>
          <h2 className="text-base md:text-lg font-bold text-ink">{monthLabel}</h2>
          <button type="button" onClick={() => shift(1)} aria-label="Next month"
            className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <FiChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 mt-2 mb-1.5">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="text-center text-xs font-semibold text-ink-faint">{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const key = `${month.y}-${pad(month.m)}-${pad(i + 1)}`;
            const dayEvents = byDay[key] || [];
            const isHoliday = dayEvents.some((e) => e.type === "holiday");
            const isToday = key === today;
            const isSelected = key === selected;
            const dot = dayEvents[0] ? styleFor(dayEvents[0].type).dot : null;
            return (
              <div key={key} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setSelected(key)}
                  aria-pressed={isSelected}
                  aria-label={`${fmt(key, { day: "numeric", month: "long" })}${dayEvents.length ? `, ${dayEvents.map((e) => e.title).join(", ")}` : ""}`}
                  className={`relative w-11 h-11 md:w-12 md:h-12 rounded-full flex flex-col items-center justify-center text-sm tabular-nums transition-colors
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
                    ${isSelected
                      ? "bg-brand-600 text-white font-bold"
                      : isHoliday
                        ? "bg-brand-50 text-brand-700 font-semibold hover:bg-brand-100"
                        : isToday
                          ? "bg-accent-50 text-ink font-bold ring-[1.5px] ring-accent-500"
                          : "text-ink font-medium hover:bg-surface-muted"}`}
                >
                  {i + 1}
                  {dot && <span className={`mt-0.5 w-1 h-1 rounded-full ${isSelected ? "bg-white" : dot}`} aria-hidden="true" />}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Selected day */}
      <section className="mt-6" aria-live="polite">
        <h2 className="text-sm font-bold text-ink mb-3">
          {selected
            ? `${selected === today ? "Today · " : ""}${fmt(selected, { day: "numeric", month: "long", year: "numeric" })}`
            : "Pick a day"}
        </h2>
        {selectedEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-subtle py-10 text-center">
            <FiCalendar className="mx-auto text-ink-faint" size={26} />
            <p className="mt-2 font-semibold text-ink">No events on this day</p>
            <p className="text-sm text-ink-muted">Pick another day to see holidays or meetings.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {selectedEvents.map((e) => <EventRow key={e._id} event={e} />)}
          </ul>
        )}
      </section>

      {/* Upcoming holidays */}
      {upcomingHolidays.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-bold text-ink mb-3">Upcoming holidays</h2>
          <ul className="space-y-2.5">
            {upcomingHolidays.map((e) => (
              <li key={e._id}>
                <button
                  type="button"
                  onClick={() => {
                    setMonth({ y: Number(e.key.slice(0, 4)), m: Number(e.key.slice(5, 7)) });
                    setSelected(e.key);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="w-full text-left flex items-center gap-3 bg-white rounded-2xl border border-surface-subtle p-3.5 hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {/* Month/day tile — same as the home "Next Holiday" card */}
                  <span className="w-12 h-12 rounded-lg bg-brand-50 flex flex-col items-center justify-center flex-shrink-0 leading-none">
                    <span className="text-[10px] font-bold text-brand-600 uppercase">{fmt(e.key, { month: "short" })}</span>
                    <span className="text-lg font-extrabold text-ink tabular-nums mt-0.5">{Number(e.key.slice(8, 10))}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink text-sm truncate">{e.title}</span>
                    <span className="block text-sm text-ink-muted">{fmt(e.key, { weekday: "long" })}</span>
                  </span>
                  <span className="text-xs font-semibold text-ink-muted whitespace-nowrap">{daysAway(e.key, today)}</span>
                  <FiChevronRight className="text-ink-faint flex-shrink-0" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

const EventRow = ({ event, onClick }) => {
  const { icon: Icon, fg, bg } = styleFor(event.type);
  const Tag = onClick ? "button" : "div";
  return (
    <li>
      <Tag
        {...(onClick ? { type: "button", onClick } : {})}
        className={`w-full text-left flex items-center gap-3 bg-white rounded-2xl border border-surface-subtle p-3.5 ${onClick ? "hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" : ""}`}
      >
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg} ${fg}`}>
          <Icon size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink truncate">{event.title}</span>
          <span className="block text-sm text-ink-muted">
            {fmt(event.key, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            {event.description ? ` · ${event.description}` : ""}
          </span>
        </span>
      </Tag>
    </li>
  );
};

export default EmployeeCalendar;
