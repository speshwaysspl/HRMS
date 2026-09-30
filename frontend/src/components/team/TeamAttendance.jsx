import React, { useEffect, useState } from "react";
import { useSocketEvent } from "../../context/NotificationContext";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { useAuth } from "../../context/AuthContext";
import { FaFileExcel, FaSave } from "react-icons/fa";
import { FiCalendar, FiGrid } from "react-icons/fi";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// `short` = the app's compact segment labels (P / Half / A) used on phones.
const STATUSES = [
  { value: "present", label: "Present", short: "P", on: "bg-accent-100 text-accent-800" },
  { value: "half", label: "Half day", short: "Half", on: "bg-amber-100 text-amber-800" },
  { value: "absent", label: "Absent", short: "A", on: "bg-red-100 text-red-700" },
];

const authHeader = () => ({ Authorization: `Bearer ${sessionStorage.getItem("token")}` });

// Manual daily roll-call kept by the team lead. Independent of punch-in attendance.
const TeamAttendance = ({ teamId, members }) => {
  const { user } = useAuth();
  const isAdmin = (Array.isArray(user?.role) ? user.role : [user?.role]).includes("admin");
  const [date, setDate] = useState(todayStr());
  const [present, setPresent] = useState(new Set());
  const [half, setHalf] = useState(new Set());
  const [marked, setMarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  useSocketEvent("team:updated", (e) => {
    if (e?.teamId === teamId && e.kind === "attendance") setReloadKey((k) => k + 1);
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessage(null);
    axios
      .get(`${API_BASE}/api/team/${teamId}/attendance`, { params: { date }, headers: authHeader() })
      .then((res) => {
        if (cancelled) return;
        setPresent(new Set(res.data.present));
        setHalf(new Set(res.data.halfDay || []));
        setMarked(res.data.marked);
      })
      .catch((err) => {
        if (!cancelled) setMessage({ type: "error", text: err.response?.data?.error || "Failed to load attendance" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, date, reloadKey]);

  const statusOf = (id) => (half.has(id) ? "half" : present.has(id) ? "present" : "absent");
  const setStatus = (id, status) => {
    const withId = (on) => (prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    };
    setPresent(withId(status === "present"));
    setHalf(withId(status === "half"));
  };

  const allSelected = members.length > 0 && members.every((m) => present.has(m._id));
  const toggleAll = () => {
    setPresent(allSelected ? new Set() : new Set(members.map((m) => m._id)));
    setHalf(new Set());
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`${API_BASE}/api/team/${teamId}/attendance`, { date, present: [...present], halfDay: [...half] }, { headers: authHeader() });
      setMarked(true);
      setMessage({ type: "success", text: "Attendance saved" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to save attendance" });
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = async (forMonth = month) => {
    setExporting(true);
    try {
      const res = await axios.get(`${API_BASE}/api/team/${teamId}/attendance/export`, {
        params: { month: forMonth },
        headers: authHeader(),
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `team_attendance_${forMonth}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ type: "error", text: "Failed to export Excel" });
    } finally {
      setExporting(false);
    }
  };

  // Team leads change today only; admins can also correct past dates.
  const editable = date === todayStr() || isAdmin;
  const presentCount = members.filter((m) => present.has(m._id)).length;
  const halfCount = members.filter((m) => half.has(m._id)).length;

  const isToday = date === todayStr();
  const prettyDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* Roll call */}
      <section className="bg-white rounded-xl shadow-card border border-surface-subtle min-w-0" aria-labelledby="rollcall-heading">
        {/* Phone: two equal outlined buttons, like the app (date picker · Excel). */}
        <div className="sm:hidden grid grid-cols-2 gap-2.5 p-3">
          <label className="relative flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-surface-subtle text-sm font-semibold text-brand-700 focus-within:ring-2 focus-within:ring-accent-500">
            <FiCalendar size={16} aria-hidden="true" />
            {new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            <input
              type="date"
              aria-label="Attendance date"
              max={todayStr()}
              value={date}
              disabled={saving}
              onClick={(e) => e.currentTarget.showPicker?.()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
          <label className="relative flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-surface-subtle text-sm font-semibold text-brand-700 focus-within:ring-2 focus-within:ring-accent-500">
            <FiGrid size={16} aria-hidden="true" />
            {exporting ? "Preparing..." : "Excel"}
            <input
              type="month"
              aria-label="Download attendance Excel for month"
              max={todayStr().slice(0, 7)}
              value={month}
              disabled={exporting}
              onClick={(e) => e.currentTarget.showPicker?.()}
              onChange={(e) => {
                if (!e.target.value) return;
                setMonth(e.target.value);
                exportExcel(e.target.value);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>

        <div className="hidden sm:flex flex-wrap items-end justify-between gap-3 px-4 sm:px-5 py-4 border-b border-surface-subtle">
          <div className="min-w-0">
            <h3 id="rollcall-heading" className="text-lg font-semibold text-ink">Mark attendance</h3>
            <p className="text-sm text-ink-muted">{prettyDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="ta-date">Date</label>
            <input
              id="ta-date"
              type="date"
              max={todayStr()}
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink bg-white focus:ring-2 focus:ring-accent-500 outline-none"
            />
            {!isToday && (
              <button
                onClick={() => setDate(todayStr())}
                className="rounded-lg px-3 py-2 text-sm font-medium text-accent-700 hover:bg-accent-50"
              >
                Today
              </button>
            )}
          </div>
        </div>

        <p className="sm:hidden px-4 pb-3 text-[13px] leading-relaxed text-ink-muted tabular-nums">
          {marked ? "Marked" : "Not marked yet"} ·{" "}
          <span className="font-semibold text-green-600">{presentCount} present</span> ·{" "}
          <span className="font-semibold text-amber-700">{halfCount} half day</span> ·{" "}
          <span className="font-semibold text-red-600">{members.length - presentCount - halfCount} absent</span>
          {!editable && " · View only (today only)"}
          {editable && !isToday && <span className="font-semibold text-amber-700"> · Editing a past date</span>}
        </p>

        <div className="hidden sm:flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 text-sm">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${marked ? "bg-accent-100 text-accent-800" : "bg-amber-100 text-amber-800"}`}>
            {marked ? "Marked" : "Not marked yet"}
          </span>
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-accent-700 tabular-nums">{presentCount} present</span>
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-amber-700 tabular-nums">{halfCount} half day</span>
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-red-700 tabular-nums">{members.length - presentCount - halfCount} absent</span>
          {!editable && (
            <span className="text-xs text-ink-muted">View only. Attendance can be changed for today only.</span>
          )}
          {editable && !isToday && (
            <span className="text-xs font-medium text-amber-700">Editing a past date (admin).</span>
          )}
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-ink-muted">Loading attendance...</div>
        ) : members.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-semibold text-ink">No members in this team</p>
            <p className="mt-1 text-sm text-ink-muted">Add members from the Members tab to start taking attendance.</p>
          </div>
        ) : (
          <ul className="border-t border-surface-subtle divide-y divide-surface-subtle">
            <li>
              <label className={`flex items-center gap-3 px-4 sm:px-5 py-3 bg-surface-muted ${editable ? "cursor-pointer" : "cursor-default"}`}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={!editable} className="h-5 w-5 rounded text-accent-600" />
                <span className="text-sm font-medium text-ink">Mark all present</span>
              </label>
            </li>
            {members.map((m) => {
              const status = statusOf(m._id);
              const name = m.userId?.name || "Unknown";
              return (
                <li key={m._id} className="flex items-center gap-3 px-4 sm:px-5 py-3 min-h-[60px]">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{name}</div>
                    <div className="text-xs text-ink-muted">{m.employeeId}</div>
                  </div>
                  <div role="radiogroup" aria-label={`Attendance for ${name}`} className="inline-flex shrink-0 rounded-lg border border-surface-subtle p-0.5">
                    {STATUSES.map((s) => {
                      const selected = status === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={!editable}
                          onClick={() => setStatus(m._id, s.value)}
                          aria-label={s.label}
                          className={`min-h-[40px] min-w-[40px] sm:min-w-0 rounded-md px-2.5 sm:px-3 text-sm sm:text-xs font-semibold sm:font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-default ${
                            selected ? s.on : `text-ink-muted ${editable ? "hover:bg-surface-muted" : ""}`
                          }`}
                        >
                          <span className="sm:hidden">{s.short}</span>
                          <span className="hidden sm:inline">{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {message && (
          <p role="status" className={`px-4 sm:px-5 pt-3 text-sm ${message.type === "error" ? "text-red-700" : "text-accent-700"}`}>
            {message.text}
          </p>
        )}

        {editable && members.length > 0 && (
          <div className="sticky bottom-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-3 mt-2 border-t border-surface-subtle bg-white rounded-b-xl">
            <span className="text-sm text-ink-muted hidden sm:inline">Set each member to Present, Half day or Absent.</span>
            <button
              onClick={save}
              disabled={saving || loading}
              className="w-full sm:w-auto bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-5 py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <FaSave /> {saving ? "Saving..." : marked ? "Update Attendance" : "Save Attendance"}
            </button>
          </div>
        )}
      </section>

      {/* Monthly report */}
      <aside className="hidden sm:block bg-white rounded-xl shadow-card border border-surface-subtle p-4 sm:p-5 self-start" aria-labelledby="report-heading">
        <h3 id="report-heading" className="text-base font-semibold text-ink">Monthly report</h3>
        <p className="mt-1 text-sm text-ink-muted">Download the attendance register for a whole month as Excel.</p>
        <label className="block text-xs font-medium text-ink-muted mt-4 mb-1" htmlFor="ta-month">Month</label>
        <input
          id="ta-month"
          type="month"
          value={month}
          max={todayStr().slice(0, 7)}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink bg-white focus:ring-2 focus:ring-accent-500 outline-none"
        />
        <button
          onClick={exportExcel}
          disabled={exporting || !month}
          className="mt-3 w-full border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <FaFileExcel className="text-accent-700" /> {exporting ? "Exporting..." : "Download Excel"}
        </button>
      </aside>
    </div>
  );
};

export default TeamAttendance;
