import React, { useEffect, useState } from "react";
import { useSocketEvent } from "../../context/NotificationContext";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { useAuth } from "../../context/AuthContext";
import { FaFileExcel, FaSave } from "react-icons/fa";
import { FiCalendar, FiChevronDown, FiSearch, FiUsers, FiUserX, FiClock } from "react-icons/fi";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// `short` = the app's compact segment labels (P / Half / A) used on phones.
const STATUSES = [
  { value: "present", label: "Present", short: "P", on: "bg-green-100 text-green-800" },
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
    if (e?.kind === "resync" || (e?.teamId === teamId && e.kind === "attendance")) setReloadKey((k) => k + 1);
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [exporting, setExporting] = useState(false);
  const [query, setQuery] = useState("");

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
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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

  // Until the day is saved, unchosen members are "not marked"; once saved
  // they count as absent.
  const rest = members.length - presentCount - halfCount;
  const absentCount = marked ? rest : 0;
  const notMarkedCount = marked ? 0 : rest;
  const q = query.trim().toLowerCase();
  const visible = q
    ? members.filter((m) => (m.userId?.name || "").toLowerCase().includes(q) || (m.employeeId || "").toLowerCase().includes(q))
    : members;
  const initials = (name) => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  };
  const tiles = [
    { label: "Present", value: presentCount, Icon: FiUsers, cls: "text-green-700" },
    { label: "Half Day", value: halfCount, Icon: FiClock, cls: "text-amber-700" },
    { label: "Absent", value: absentCount, Icon: FiUserX, cls: "text-red-700" },
    { label: "Not Marked", value: notMarkedCount, Icon: FiUsers, cls: "text-ink" },
  ];

  return (
    <section className="mx-auto max-w-3xl min-w-0" aria-labelledby="rollcall-heading">
      <h3 id="rollcall-heading" className="sr-only">Mark attendance</h3>

      {/* Date + Excel */}
      <div className="flex items-center gap-2 rounded-2xl border border-surface-subtle bg-white p-2.5 shadow-card">
        <label className="relative flex min-h-[52px] min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl p-1 hover:bg-surface-muted focus-within:ring-2 focus-within:ring-accent-500">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <FiCalendar aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-ink">
              {new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className="block text-xs text-ink-muted">{new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long" })}</span>
          </span>
          <FiChevronDown aria-hidden="true" className="text-ink-muted" />
          <input
            type="date"
            aria-label="Attendance date"
            max={todayStr()}
            value={date}
            disabled={saving}
            onClick={(e) => e.currentTarget.showPicker?.()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        {!isToday && (
          <button onClick={() => setDate(todayStr())} className="hidden sm:inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-medium text-brand-700 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-accent-500 outline-none">
            Today
          </button>
        )}
        <span className="h-9 w-px bg-surface-subtle" aria-hidden="true" />
        <label className="relative inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 rounded-full bg-brand-50 px-4 text-sm font-semibold text-brand-700 hover:bg-brand-100 focus-within:ring-2 focus-within:ring-accent-500">
          <FaFileExcel aria-hidden="true" />
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
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>

      {/* Counts */}
      <dl className="mt-3 grid grid-cols-4 gap-2">
        {tiles.map(({ label, value, Icon, cls }) => (
          <div key={label} className="flex flex-col items-center rounded-2xl border border-surface-subtle bg-white px-1 py-3 shadow-card">
            <Icon aria-hidden="true" className={`text-lg ${cls}`} />
            <dd className={`mt-1 text-xl font-bold tabular-nums ${cls}`}>{value}</dd>
            <dt className="text-xs text-center text-ink-muted">{label}</dt>
          </div>
        ))}
      </dl>
      {!editable && <p className="mt-2 text-sm text-ink-muted">View only — attendance can be changed for today only.</p>}
      {editable && !isToday && <p className="mt-2 text-sm font-semibold text-amber-700">Editing a past date.</p>}

      {/* Search */}
      <div className="relative mt-3">
        <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search members"
          placeholder="Search member by name or ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full min-h-[48px] rounded-full border-0 bg-surface-subtle/60 pl-11 pr-4 text-sm text-ink focus:ring-2 focus:ring-accent-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="mt-3 rounded-2xl bg-white px-5 py-12 text-center text-sm text-ink-muted shadow-card">Loading attendance...</div>
      ) : members.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-white px-6 py-14 text-center shadow-card">
          <p className="font-semibold text-ink">No members in this team</p>
          <p className="mt-1 text-sm text-ink-muted">Add members from the Members tab to start taking attendance.</p>
        </div>
      ) : (
        <>
          <label className={`mt-3 flex min-h-[52px] items-center gap-3 rounded-2xl bg-brand-50 px-4 ${editable ? "cursor-pointer" : "cursor-default"}`}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={!editable || saving} className="h-5 w-5 rounded text-brand-700" />
            <span className="flex-1 text-sm font-bold text-brand-800">Mark all present</span>
            <span className="text-xs text-ink-muted tabular-nums">Total: {members.length} members</span>
          </label>

          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">No member matches "{query}".</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {visible.map((m) => {
                const status = statusOf(m._id);
                const name = (m.userId?.name || "Unknown").trim();
                return (
                  <li key={m._id} className="flex items-center gap-3 rounded-2xl border border-surface-subtle bg-white px-3 py-3 sm:px-4">
                    <input
                      type="checkbox"
                      aria-label={`Mark ${name} present`}
                      checked={status === "present"}
                      disabled={!editable || saving}
                      onChange={(e) => setStatus(m._id, e.target.checked ? "present" : "absent")}
                      className="h-5 w-5 shrink-0 rounded text-brand-700"
                    />
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold bg-brand-50 text-brand-700`} aria-hidden="true">
                      {initials(name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink line-clamp-2">{name}</span>
                      <span className="block text-xs text-ink-muted tabular-nums">{m.employeeId}</span>
                    </span>
                    <span role="radiogroup" aria-label={`Attendance for ${name}`} className="inline-flex shrink-0 overflow-hidden rounded-full border border-surface-subtle">
                      {STATUSES.map((s, i) => {
                        const selected = status === s.value;
                        return (
                          <button
                            key={s.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={s.label}
                            disabled={!editable || saving}
                            onClick={() => setStatus(m._id, s.value)}
                            className={`min-h-[40px] min-w-[44px] px-2.5 sm:px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500 disabled:cursor-default ${i > 0 ? "border-l border-surface-subtle" : ""} ${
                              selected ? `${s.on} font-bold` : `text-ink ${editable ? "hover:bg-surface-muted" : ""}`
                            }`}
                          >
                            <span className="sm:hidden">{s.short}</span>
                            <span className="hidden sm:inline">{s.label}</span>
                          </button>
                        );
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {message && (
        <p role="status" className={`mt-3 text-sm ${message.type === "error" ? "text-red-700" : "text-green-700"}`}>
          {message.text}
        </p>
      )}

      {editable && members.length > 0 && (
        <div className="sticky bottom-0 -mx-1 mt-3 bg-gradient-to-t from-surface-muted via-surface-muted to-transparent px-1 pb-3 pt-4">
          <button
            onClick={save}
            disabled={saving || loading}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-5 text-base font-semibold text-white hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 outline-none disabled:opacity-60"
          >
            <FaSave aria-hidden="true" /> {saving ? "Saving..." : marked ? "Update Attendance" : "Save Attendance"}
          </button>
        </div>
      )}
    </section>
  );
};

export default TeamAttendance;
