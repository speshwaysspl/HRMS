import React, { useEffect, useState } from "react";
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
  }, [teamId, date]);

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

  const presentCount = members.filter((m) => present.has(m._id)).length;

  return (
    <div className="bg-white rounded-xl shadow-card border border-surface-subtle p-4">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="ta-date">Date</label>
          <input
            id="ta-date"
            type="date"
            max={todayStr()}
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 outline-none"
          />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="ta-month">Monthly report</label>
            <input
              id="ta-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 outline-none"
            />
          </div>
          <button
            onClick={exportExcel}
            disabled={exporting || !month}
            className="border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          >
            <FaFileExcel className="text-accent-700" /> {exporting ? "Exporting..." : "Download Excel"}
          </button>
        </div>
      </div>

      <p className="mb-2 text-sm text-ink-muted">
        {marked ? "Marked" : "Not marked yet"} · <span className="text-accent-700 font-medium">{presentCount} present</span> ·{" "}
        <span className="text-red-700 font-medium">{members.length - presentCount} absent</span>
      </p>

      {loading ? (
        <div className="p-6 text-center text-ink-muted">Loading...</div>
      ) : members.length === 0 ? (
        <div className="p-6 text-center text-ink-muted bg-surface-muted rounded-lg">No members in this team.</div>
      ) : (
        <div className="border border-surface-subtle rounded-lg divide-y divide-surface-subtle">
          <label className="flex items-center gap-3 p-3 bg-surface-muted cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded text-accent-600" />
            <span className="text-sm font-medium text-ink">Mark all present</span>
          </label>
          {members.map((m) => {
            const isPresent = present.has(m._id);
            return (
              <label key={m._id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface-muted">
                <input type="checkbox" checked={isPresent} onChange={() => toggle(m._id)} className="h-4 w-4 rounded text-accent-600" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{m.userId?.name || "Unknown"}</div>
                  <div className="text-xs text-ink-muted">{m.employeeId}</div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isPresent ? "bg-accent-100 text-accent-700" : "bg-red-100 text-red-700"}`}>
                  {isPresent ? "Present" : "Absent"}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {message && (
        <p role="status" className={`mt-3 text-sm ${message.type === "error" ? "text-red-700" : "text-accent-700"}`}>
          {message.text}
        </p>
      )}

      <div className="flex justify-end mt-4">
        <button
          onClick={save}
          disabled={saving || loading || members.length === 0}
          className="bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-60"
        >
          <FaSave /> {saving ? "Saving..." : "Save Attendance"}
        </button>
      </div>
    </div>
  );
};

export default TeamAttendance;
