import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString } from "../../utils/dateTimeUtils";
import { formatDMY } from "../../utils/dateUtils";
import { FiX, FiEdit3 } from "react-icons/fi";

// Month grid of attendance, colour-coded by status, with a day panel that
// lets the employee request a correction (e.g. forgot to check out).
// Mirrors mobile/lib/widgets/attendance_calendar.dart.

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Collapse the many server statuses into five calendar categories.
export const dayCategory = (status = "", isHoliday = false) => {
  if (isHoliday) return "holiday";
  if (status === "Leave") return "leave";
  if (status.includes("Half")) return "half";
  if (status.includes("Present") || status.includes("Overtime")) return "present";
  if (status === "Absent") return "absent";
  return "none";
};

const CATEGORY = {
  present: { label: "Present", cell: "bg-accent-100 text-accent-800", dot: "bg-accent-600" },
  half: { label: "Half-Day", cell: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  absent: { label: "Absent", cell: "bg-red-100 text-red-800", dot: "bg-red-500" },
  leave: { label: "Leave", cell: "bg-brand-100 text-brand-800", dot: "bg-brand-600" },
  holiday: { label: "Holiday", cell: "bg-purple-100 text-purple-800", dot: "bg-purple-500" },
  none: { label: "", cell: "bg-surface-muted text-ink-muted", dot: "" },
};

const authHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem("token")}` });

const AttendanceCalendar = ({ month, days, onChanged }) => {
  const [holidays, setHolidays] = useState({});
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/events`, { headers: authHeaders() })
      .then(({ data }) => {
        const map = {};
        (data.events || [])
          .filter((e) => e.type === "holiday")
          .forEach((e) => (map[new Date(e.date).toISOString().slice(0, 10)] = e.title));
        setHolidays(map);
      })
      .catch(() => {});
  }, []);

  const loadRequests = () =>
    axios
      .get(`${API_BASE}/api/attendance-regularization/mine`, { headers: authHeaders() })
      .then(({ data }) => setRequests(data.regularizations || []))
      .catch(() => {});
  useEffect(() => {
    loadRequests();
  }, []);

  const byDate = useMemo(() => Object.fromEntries(days.map((d) => [d.date, d])), [days]);
  const requestByDate = useMemo(
    () => Object.fromEntries(requests.map((r) => [r.date, r])),
    [requests]
  );

  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const lead = (new Date(year, mon - 1, 1).getDay() + 6) % 7; // Monday-first
  const today = toISTDateString(new Date());

  const counts = useMemo(() => {
    const c = { present: 0, half: 0, absent: 0, leave: 0, holiday: 0 };
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${month}-${String(d).padStart(2, "0")}`;
      const cat = dayCategory(byDate[key]?.status, !!holidays[key]);
      if (c[cat] !== undefined) c[cat] += 1;
    }
    return c;
  }, [byDate, holidays, month, daysInMonth]);

  return (
    <div className="px-4 sm:px-6 pb-6">
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-xs text-ink-muted">
        {["present", "half", "absent", "leave", "holiday"].map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY[k].dot}`} aria-hidden="true" />
            {CATEGORY[k].label} <span className="font-semibold text-ink tabular-nums">{counts[k]}</span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label={`Attendance for ${month}`}>
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-[11px] font-semibold text-ink-faint uppercase py-1">
            {w}
          </div>
        ))}
        {Array.from({ length: lead }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, "0")}`;
          const rec = byDate[key];
          const cat = dayCategory(rec?.status, !!holidays[key]);
          const future = key > today;
          return (
            <button
              key={key}
              type="button"
              disabled={future}
              onClick={() => setSelected(key)}
              aria-label={`${formatDMY(key)} ${CATEGORY[cat].label || "no record"}`}
              className={`relative aspect-square min-h-[40px] rounded-lg text-sm font-semibold tabular-nums transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
                ${future ? "bg-transparent text-ink-faint cursor-default" : `${CATEGORY[cat].cell} hover:brightness-95`}
                ${key === today ? "ring-2 ring-ink" : ""}`}
            >
              {i + 1}
              {requestByDate[key]?.status === "Pending" && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" title="Correction pending" />
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <DayPanel
          date={selected}
          record={byDate[selected]}
          holiday={holidays[selected]}
          request={requestByDate[selected]}
          canRequest={selected < today}
          onClose={() => setSelected(null)}
          onSubmitted={() => {
            loadRequests();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
};

const DayPanel = ({ date, record, holiday, request, canRequest, onClose, onSubmitted }) => {
  const missingOut = record?.inTime && record.inTime !== "Not Marked" && (!record.outTime || record.outTime === "Not Marked");
  const [open, setOpen] = useState(false);
  const [inTime, setInTime] = useState(record?.inTime && record.inTime !== "Not Marked" ? record.inTime : "");
  const [outTime, setOutTime] = useState("");
  const [reason, setReason] = useState(missingOut ? "Forgot to check out" : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!outTime && !inTime) return setError("Enter a check-in or check-out time.");
    if (inTime && outTime && outTime <= inTime) return setError("Check-out must be after check-in.");
    if (!reason.trim()) return setError("Add a short reason.");
    setSaving(true);
    try {
      await axios.post(
        `${API_BASE}/api/attendance-regularization`,
        { date, requestedInTime: inTime || undefined, requestedOutTime: outTime || undefined, reason: reason.trim() },
        { headers: authHeaders() }
      );
      setOpen(false);
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't send the request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-surface-subtle bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{formatDMY(date)}</p>
          <p className="text-sm text-ink-muted mt-0.5">
            {holiday ? `Holiday — ${holiday}` : record?.status || "No record"}
          </p>
        </div>
        <button type="button" onClick={onClose} className="p-2 -m-2 text-ink-muted hover:text-ink rounded-lg" aria-label="Close">
          <FiX size={18} />
        </button>
      </div>

      {record && record.inTime !== "Not Marked" && (
        <dl className="grid grid-cols-2 gap-3 mt-3 text-sm">
          <div>
            <dt className="text-ink-muted">Check in</dt>
            <dd className="font-semibold text-ink tabular-nums">{record.inTime}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Check out</dt>
            <dd className="font-semibold text-ink tabular-nums">{record.outTime === "Not Marked" ? "—" : record.outTime}</dd>
          </div>
        </dl>
      )}

      {request ? (
        <p className="mt-3 text-sm text-ink-muted">
          Correction request:{" "}
          <span className="font-semibold text-ink">{request.status}</span>
          {request.requestedOutTime && ` · out ${request.requestedOutTime}`}
          {request.requestedInTime && ` · in ${request.requestedInTime}`}
        </p>
      ) : (
        canRequest &&
        !holiday &&
        !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink text-white text-sm font-semibold hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <FiEdit3 size={14} /> {missingOut ? "Forgot to check out? Request correction" : "Request correction"}
          </button>
        )
      )}

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-ink-muted">
              Check in
              <input type="time" value={inTime} onChange={(e) => setInTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-surface-subtle px-3 py-2 text-ink" />
            </label>
            <label className="text-sm text-ink-muted">
              Check out
              <input type="time" value={outTime} onChange={(e) => setOutTime(e.target.value)} autoFocus={missingOut}
                className="mt-1 w-full rounded-lg border border-surface-subtle px-3 py-2 text-ink" />
            </label>
          </div>
          <label className="block text-sm text-ink-muted">
            Reason
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200}
              className="mt-1 w-full rounded-lg border border-surface-subtle px-3 py-2 text-ink" />
          </label>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? "Sending…" : "Send for approval"}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold text-ink-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AttendanceCalendar;
