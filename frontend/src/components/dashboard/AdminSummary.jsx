// Admin home. Leads with what needs action today, then today's attendance,
// team work, what's coming up, and the long-range charts.
// Mirrors mobile/lib/screens/admin/admin_home_screen.dart.
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  FaLayerGroup,
  FaBuilding,
  FaUsers,
  FaChevronRight,
  FaCalendarAlt,
  FaBirthdayCake,
  FaBullhorn,
  FaUserClock,
  FaClipboardList,
  FaUserCheck,
} from "react-icons/fa";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { API_BASE } from "../../utils/apiConfig";
import { getAdminDailyMessage, getISTGreeting } from "../../utils/greetingUtils";
import useMeta from "../../utils/useMeta";
import { useSocketEvent, useLiveData } from "../../context/NotificationContext";
import EmptyState from "../common/EmptyState";
import { useAuth } from "../../context/AuthContext";

const TOOLTIP = { borderRadius: 8, borderColor: "#eef0f6", fontSize: 13 };
const ddmm = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const inDaysLabel = (n) => (n === 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`);

const Panel = ({ title, action, children, className = "" }) => (
  <section className={`bg-white border border-surface-subtle rounded-xl p-4 md:p-5 ${className}`}>
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const PanelLink = ({ to, children }) => (
  <Link to={to} className="inline-flex min-h-[32px] items-center gap-1 rounded-md px-2 text-xs font-semibold text-accent-700 hover:bg-accent-50 focus-visible:ring-2 focus-visible:ring-accent-500 outline-none">
    {children} <FaChevronRight aria-hidden="true" size={10} />
  </Link>
);

// One "needs attention" item: count + what it is + where to act.
const ActionItem = ({ icon: Icon, count, label, hint, to, tone }) => {
  const active = count > 0;
  return (
    <Link
      to={to}
      className={`group flex items-center gap-3 rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:ring-accent-500 outline-none ${
        active ? `${tone.border} ${tone.bg} hover:brightness-[0.98]` : "border-surface-subtle bg-white hover:bg-surface-muted"
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${active ? tone.icon : "bg-surface-subtle text-ink-faint"}`}>
        <Icon aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={`text-2xl font-semibold tabular-nums ${active ? "text-ink" : "text-ink-muted"}`}>{count}</span>
          <span className="truncate text-sm font-medium text-ink">{label}</span>
        </span>
        <span className="block truncate text-xs text-ink-muted">{active ? hint : "All clear"}</span>
      </span>
      <FaChevronRight aria-hidden="true" className="shrink-0 text-ink-faint group-hover:text-ink-muted" />
    </Link>
  );
};

const TONES = {
  amber: { border: "border-amber-200", bg: "bg-amber-50/60", icon: "bg-amber-100 text-amber-800" },
  red: { border: "border-red-200", bg: "bg-red-50/60", icon: "bg-red-100 text-red-700" },
  brand: { border: "border-brand-200", bg: "bg-brand-50/60", icon: "bg-brand-100 text-brand-700" },
};

// Progress ring for the checked-in share.
const Ring = ({ pct }) => {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <div className="relative h-20 w-20 shrink-0" role="img" aria-label={`${pct}% checked in`}>
      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-surface-subtle" />
        <circle
          cx="40" cy="40" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
          className="stroke-accent-600 transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-lg font-semibold tabular-nums text-ink">{pct}%</span>
    </div>
  );
};

const Skeleton = () => (
  <div className="space-y-5" aria-busy="true" aria-label="Loading dashboard">
    <div className="h-14 w-72 animate-pulse rounded-lg bg-surface-subtle" />
    <div className="grid gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-subtle" />)}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-surface-subtle" />)}
    </div>
  </div>
);

const AdminSummary = () => {
  useLiveData(["dashboard", "attendance", "leave", "employee", "task", "events", "announcement"], () => { fetchSummary(); });
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  useMeta({
    title: "Admin Overview — Speshway HRMS",
    description: "What needs attention today across attendance, leaves and teams.",
    keywords: "admin overview, HRMS",
    image: "/images/Logo.jpg",
    url: `${window.location.origin}/admin-dashboard`,
  });

  const today = useMemo(
    () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    []
  );
  const dailyQuote = useMemo(() => getAdminDailyMessage(), []);

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/dashboard/summary`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      setSummary(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not load the dashboard.");
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  // A lead marking attendance updates the "not marked" list live.
  useSocketEvent("team:updated", (e) => { if (e?.kind === "attendance" || e?.kind === "resync") fetchSummary(); });

  if (error && !summary) {
    return (
      <div className="py-16 text-center">
        <p className="font-semibold text-ink">{error}</p>
        <button onClick={fetchSummary} className="mt-3 rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700">
          Try again
        </button>
      </div>
    );
  }
  if (!summary) return <Skeleton />;

  const t = summary.today || {};
  const ta = summary.teamAttendance || { total: 0, marked: 0, notMarked: [] };
  const up = summary.upcoming || { events: [], birthdays: [] };
  const leave = summary.leaveSummary || {};
  const pctCheckedIn = t.activeEmployees ? Math.round((t.checkedIn / t.activeEmployees) * 100) : 0;
  const teamPct = ta.total ? Math.round((ta.marked / ta.total) * 100) : 0;
  const greeting = `${getISTGreeting()}${user?.name ? `, ${user.name}` : ""}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-ink">{greeting}</h1>
          <p className="mt-0.5 text-sm text-ink-muted max-w-[70ch]">{dailyQuote}</p>
        </div>
        <p className="text-sm text-ink-muted whitespace-nowrap">{today}</p>
      </header>

      {/* Organisation */}
      <section aria-labelledby="org" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <h2 id="org" className="sr-only">Organisation</h2>
        {[
          { icon: FaUsers, value: summary.totalEmployees, label: "Employees", to: "/admin-dashboard/employees" },
          { icon: FaBuilding, value: summary.totalDepartments, label: "Departments", to: "/admin-dashboard/departments" },
          { icon: FaLayerGroup, value: ta.total, label: "Active teams", to: "/admin-dashboard/teams" },
          { icon: FaCalendarAlt, value: (leave.approved || 0) + (leave.pending || 0) + (leave.rejected || 0), label: "Leaves applied", to: "/admin-dashboard/leaves?status=All" },
        ].map(({ icon: Icon, value, label, to }) => (
          <Link
            key={label}
            to={to}
            className="flex items-center gap-3 rounded-xl border border-surface-subtle bg-white p-4 hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon aria-hidden="true" /></span>
            <span className="min-w-0">
              <span className="block text-2xl font-semibold tabular-nums text-ink">{value ?? 0}</span>
              <span className="block truncate text-xs text-ink-muted">{label}</span>
            </span>
          </Link>
        ))}
      </section>

      {/* Needs attention */}
      <section aria-labelledby="attn">
        <h2 id="attn" className="sr-only">Needs attention</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ActionItem
            icon={FaCalendarAlt}
            count={leave.pending || 0}
            label={`leave request${leave.pending === 1 ? "" : "s"} pending`}
            hint="Approve or reject"
            to="/admin-dashboard/leaves?status=Pending"
            tone={TONES.amber}
          />
          <ActionItem
            icon={FaUserClock}
            count={summary.pending?.regularizations || 0}
            label={`attendance correction${summary.pending?.regularizations === 1 ? "" : "s"}`}
            hint="Review check-in/out fixes"
            to="/admin-dashboard/attendance-approvals"
            tone={TONES.amber}
          />
          <ActionItem
            icon={FaClipboardList}
            count={ta.notMarked.length}
            label={`team${ta.notMarked.length === 1 ? "" : "s"} not marked today`}
            hint="Team roll call still open"
            to="/admin-dashboard/teams"
            tone={TONES.red}
          />
        </div>
      </section>

      {/* Today's attendance */}
      <section aria-labelledby="today-att" className="rounded-xl border border-surface-subtle bg-white p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="today-att" className="text-sm font-semibold text-ink">Today's attendance</h2>
          <PanelLink to="/admin-dashboard/attendance-report">Attendance report</PanelLink>
        </div>
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex items-center gap-4 md:w-64 md:shrink-0">
            <Ring pct={pctCheckedIn} />
            <div>
              <p className="text-sm font-medium text-ink">{t.checkedIn ?? 0} of {t.activeEmployees ?? 0}</p>
              <p className="text-xs text-ink-muted">employees checked in</p>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Checked in", value: t.checkedIn, dot: "bg-accent-600", text: "text-accent-800", status: "checked-in" },
              { label: "On leave", value: t.onLeave, dot: "bg-amber-400", text: "text-amber-800", status: "Leave" },
              { label: "Not checked in", value: t.notCheckedIn, dot: "bg-red-400", text: "text-red-700", status: "not-checked-in" },
            ].map((x) => (
              <Link
                key={x.label}
                to={`/admin-dashboard/attendance-report?status=${encodeURIComponent(x.status)}`}
                className="rounded-lg bg-surface-muted p-4 hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
              >
                <span className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                  <span className={`h-2 w-2 rounded-full ${x.dot}`} aria-hidden="true" /> {x.label}
                </span>
                <span className={`mt-1 block text-3xl font-semibold tabular-nums ${x.text}`}>{x.value ?? 0}</span>
                <span className="block text-xs text-ink-muted tabular-nums">
                  {t.activeEmployees ? Math.round(((x.value || 0) / t.activeEmployees) * 100) : 0}% of active
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Team roll call + upcoming */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Team roll call"
          action={<PanelLink to="/admin-dashboard/teams">All teams</PanelLink>}
          className="lg:col-span-2"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums text-ink">{ta.marked}</span>
            <span className="text-sm text-ink-muted">of {ta.total} teams marked today</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-subtle" role="progressbar" aria-valuenow={teamPct} aria-valuemin={0} aria-valuemax={100} aria-label="Teams marked today">
            <div className="h-full rounded-full bg-accent-600" style={{ width: `${teamPct}%` }} />
          </div>
          {ta.notMarked.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-accent-800">
              <FaUserCheck aria-hidden="true" /> Every team has marked attendance today.
            </p>
          ) : (
            <>
              <p className="mt-4 mb-2 text-xs font-medium text-ink-muted">Not marked yet</p>
              <ul className="grid max-h-56 gap-x-4 overflow-y-auto sm:grid-cols-2">
                {ta.notMarked.map((tm) => (
                  <li key={tm._id}>
                    <button
                      onClick={() => navigate(`/admin-dashboard/team/${tm._id}`)}
                      className="flex w-full min-h-[44px] items-center gap-2 rounded-md px-2 text-left hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{tm.name}</span>
                        <span className="block truncate text-xs text-ink-muted">{tm.lead || "No lead"}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel title="Coming up" action={<PanelLink to="/admin-dashboard/calendar">Calendar</PanelLink>}>
          {up.events.length === 0 && up.birthdays.length === 0 ? (
            <p className="text-sm text-ink-muted">No holidays, events or birthdays in the next few weeks.</p>
          ) : (
            <ul className="space-y-3">
              {up.birthdays.map((b, i) => (
                <li key={`b${i}`} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pink-50 text-pink-700"><FaBirthdayCake aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{b.name}'s birthday</span>
                    <span className="block text-xs text-ink-muted">{inDaysLabel(b.inDays)}</span>
                  </span>
                </li>
              ))}
              {up.events.map((e, i) => (
                <li key={`e${i}`} className="flex items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${e.type === "holiday" ? "bg-accent-50 text-accent-700" : "bg-brand-50 text-brand-700"}`}>
                    <FaCalendarAlt aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{e.title}</span>
                    <span className="block text-xs text-ink-muted capitalize">{e.type} · {ddmm(e.date)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Announcements */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Recent announcements" action={<PanelLink to="/admin-dashboard/announcements">All</PanelLink>} className="lg:col-span-3">
          {summary.recentAnnouncements?.length ? (
            <ul className="divide-y divide-surface-subtle">
              {summary.recentAnnouncements.map((a) => (
                <li key={a._id}>
                  <Link to={`/admin-dashboard/announcements/${a._id}`} className="flex min-h-[48px] items-center gap-3 rounded-md px-1 hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent-500 outline-none">
                    <FaBullhorn aria-hidden="true" className="shrink-0 text-ink-faint" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{a.title}</span>
                    <span className="shrink-0 text-xs tabular-nums text-ink-muted">{ddmm(a.date)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">No announcements yet.</p>
          )}
        </Panel>
      </div>

      {/* Trends */}
      <div>
      <Panel title="Check-ins, last 30 days">
        {summary.attendanceTrend?.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={summary.attendanceTrend} margin={{ left: -16, right: 8 }}>
              <defs>
                <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#337038" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#337038" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
              <XAxis dataKey="date" tickFormatter={ddmm} tick={{ fontSize: 11, fill: "#5b6376" }} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5b6376" }} />
              <Tooltip contentStyle={TOOLTIP} labelFormatter={ddmm} />
              <Area type="monotone" dataKey="present" stroke="#337038" strokeWidth={2} fill="url(#presentFill)" name="Checked in" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="No attendance data yet" message="The trend appears once check-ins are recorded." />
        )}
      </Panel>

      </div>
    </div>
  );
};

export default AdminSummary;
