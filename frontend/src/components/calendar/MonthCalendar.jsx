// Month grid with tinted days + dots for holidays / WFH / leave.
// Ported from nutri_hrms client/src/components/shared/MonthCalendar.jsx.
import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const isSameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Events are stored at UTC midnight of their calendar day.
const eventDay = (d) => {
  const x = new Date(d);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth(), d: x.getUTCDate() };
};

const DOT = {
  holiday: "bg-red-600",
  wfh: "bg-blue-600",
  weekend: "bg-rose-400",
  leave_approved: "bg-green-600",
  leave_pending: "bg-amber-600",
  other: "bg-ink-faint",
};
const Dot = ({ type }) => <span className={`inline-block h-1.5 w-1.5 rounded-full ${DOT[type] || DOT.other}`} aria-hidden="true" />;

const MonthCalendar = ({ month, year, events = [], onPrevMonth, onNextMonth, onDayClick, selectedDate, showLeaveLegend }) => {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const eventsByDay = new Map();
  events.forEach((ev) => {
    const { y, m, d } = eventDay(ev.date);
    if (y !== year || m !== month) return;
    if (!eventsByDay.has(d)) eventsByDay.set(d, []);
    eventsByDay.get(d).push(ev);
  });

  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  return (
    <div className="rounded-2xl border border-surface-subtle bg-white px-5 pb-5 pt-4">
      <div className="mb-3.5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Previous month"
          className="grid h-9 w-9 place-items-center rounded-full border border-surface-subtle bg-surface-muted text-ink hover:bg-accent-50 hover:text-accent-700 focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
        >
          <FaChevronLeft size={13} aria-hidden="true" />
        </button>
        <strong className="min-w-[160px] text-center text-base text-ink" aria-live="polite">
          {firstOfMonth.toLocaleString("en-GB", { month: "long", year: "numeric" })}
        </strong>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Next month"
          className="grid h-9 w-9 place-items-center rounded-full border border-surface-subtle bg-surface-muted text-ink hover:bg-accent-50 hover:text-accent-700 focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
        >
          <FaChevronRight size={13} aria-hidden="true" />
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <span key={w} className={`text-center text-xs font-semibold ${w === "Sun" || w === "Sat" ? "text-rose-600" : "text-ink-muted"}`}>{w}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const cellDate = new Date(year, month, day);
          const dayEvents = eventsByDay.get(day) || [];
          const isToday = isSameDay(cellDate, today);
          const isSelected = isSameDay(cellDate, selectedDate);
          const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
          const has = (t) => dayEvents.some((e) => e.type === t);
          const hasHoliday = has("holiday");
          const hasWfh = has("wfh");
          const hasLeaveApproved = has("leave_approved");
          const hasLeavePending = has("leave_pending");
          const hasOther = dayEvents.some((e) => !["holiday", "wfh", "leave_approved", "leave_pending"].includes(e.type));
          const title = dayEvents.length ? dayEvents.map((e) => e.title).join(", ") : isWeekend ? "Weekend" : undefined;

          // Later tints win, matching the source stylesheet order.
          const tint = isSelected
            ? "border-accent-600 bg-accent-50"
            : hasLeavePending
            ? "bg-amber-600/[0.12]"
            : hasLeaveApproved
            ? "bg-green-600/[0.12]"
            : hasWfh
            ? "bg-blue-600/[0.08]"
            : hasHoliday
            ? "bg-red-600/[0.08]"
            : isWeekend
            ? "bg-rose-50 border-rose-100 text-rose-700 font-medium"
            : "hover:bg-surface-muted";

          return (
            <button
              type="button"
              key={day}
              onClick={() => onDayClick?.(cellDate, dayEvents)}
              title={title}
              aria-label={`${day} ${firstOfMonth.toLocaleString("en-GB", { month: "long" })}${title ? `, ${title}` : ""}`}
              aria-pressed={isSelected}
              className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-[10px] border border-transparent text-sm text-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent-500 outline-none ${tint}`}
            >
              <span className={`tabular-nums ${isToday ? "font-extrabold text-accent-700" : ""}`}>{day}</span>
              {dayEvents.length > 0 && (
                <span className="flex gap-0.5">
                  {hasHoliday && <Dot type="holiday" />}
                  {hasWfh && <Dot type="wfh" />}
                  {hasLeaveApproved && <Dot type="leave_approved" />}
                  {hasLeavePending && <Dot type="leave_pending" />}
                  {hasOther && <Dot type="other" />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2.5 text-[13px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Dot type="holiday" /> Holiday</span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Dot type="wfh" /> Work from home</span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Dot type="weekend" /> Weekend</span>
        {showLeaveLegend && (
          <>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Dot type="leave_approved" /> Your leave (approved)</span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Dot type="leave_pending" /> Your leave (pending)</span>
          </>
        )}
      </div>
    </div>
  );
};

export default MonthCalendar;
