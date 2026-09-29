import React, { useEffect, useState } from "react";
import { useSocketEvent } from "../../context/NotificationContext";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { FaFileExcel, FaSave } from "react-icons/fa";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const authHeader = () => ({ Authorization: `Bearer ${sessionStorage.getItem("token")}` });

// Manual daily roll-call kept by the team lead. Independent of punch-in attendance.
const TeamAttendance = ({ teamId, members }) => {
  const [date, setDate] = useState(todayStr());
  const [present, setPresent] = useState(new Set());
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

  const toggle = (id) =>
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = members.length > 0 && members.every((m) => present.has(m._id));
  const toggleAll = () => setPresent(allSelected ? new Set() : new Set(members.map((m) => m._id)));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`${API_BASE}/api/team/${teamId}/attendance`, { date, present: [...present] }, { headers: authHeader() });
      setMarked(true);
      setMessage({ type: "success", text: "Attendance saved" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to save attendance" });
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API_BASE}/api/team/${teamId}/attendance/export`, {
        params: { month },
        headers: authHeader(),
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `team_attendance_${month}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ type: "error", text: "Failed to export Excel" });
    } finally {
      setExporting(false);
    }
  };

  // Attendance can only be changed for today; past dates are view-only.
  const editable = date === todayStr();
  const presentCount = members.filter((m) => present.has(m._id)).length;

  const isToday = date === todayStr();
  const prettyDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* Roll call */}
      <section className="bg-white rounded-xl shadow-card border border-surface-subtle min-w-0" aria-labelledby="rollcall-heading">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 sm:px-5 py-4 border-b border-surface-subtle">
          <div className="min-w-0">
            <h3 id="rollcall-heading" className="text-lg font-semibold text-ink">Daily roll call</h3>
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

        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 text-sm">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${marked ? "bg-accent-100 text-accent-800" : "bg-amber-100 text-amber-800"}`}>
            {marked ? "Marked" : "Not marked yet"}
          </span>
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-accent-700 tabular-nums">{presentCount} present</span>
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-red-700 tabular-nums">{members.length - presentCount} absent</span>
          {!editable && (
            <span className="text-xs text-ink-muted">View only. Attendance can be changed for today only.</span>
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
              const isPresent = present.has(m._id);
              return (
                <li key={m._id}>
                  <label className={`flex items-center gap-3 px-4 sm:px-5 py-3 min-h-[56px] ${editable ? "cursor-pointer hover:bg-surface-muted" : "cursor-default"}`}>
                    <input type="checkbox" checked={isPresent} onChange={() => toggle(m._id)} disabled={!editable} className="h-5 w-5 rounded text-accent-600" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{m.userId?.name || "Unknown"}</div>
                      <div className="text-xs text-ink-muted">{m.employeeId}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${isPresent ? "bg-accent-100 text-accent-700" : "bg-red-100 text-red-700"}`}>
                      {isPresent ? "Present" : "Absent"}
                    </span>
                  </label>
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
            <span className="text-sm text-ink-muted hidden sm:inline">Unticked members are saved as absent.</span>
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
      <aside className="bg-white rounded-xl shadow-card border border-surface-subtle p-4 sm:p-5 self-start" aria-labelledby="report-heading">
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
