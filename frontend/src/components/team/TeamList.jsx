import React, { useEffect, useMemo, useState } from "react";
import { useSocketEvent } from "../../context/NotificationContext";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../utils/apiConfig";
import {
  FiChevronDown, FiChevronRight, FiDownload, FiEdit2, FiPlus, FiSearch, FiTrash2, FiUsers, FiX,
} from "react-icons/fi";

// Same helpers as mobile my_teams_screen.dart.
const memberNames = (team) =>
  (team.members || [])
    .filter((m) => m.employeeId)
    .map((m) => m.employeeId?.userId?.name || m.name || "")
    .filter(Boolean);

const validMemberCount = (team) =>
  (team?.members || []).filter((m) => m.employeeId).length;

// "Devops KT 8" -> "D8", "Platform team" -> "PT".
const teamBadge = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const num = /\d+$/.exec(words[words.length - 1])?.[0];
  if (num && num.length <= 3) return `${words[0][0].toUpperCase()}${num}`;
  return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
};

const initials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const MAX_AVATARS = 4;
const timeOf = (v) => new Date(v).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// Today's roll call for a team: "pending" | "marked" | "empty" (no members, nothing to mark).
const rollCall = (team) =>
  !validMemberCount(team) ? "empty" : team.attendanceToday?.marked ? "marked" : "pending";
const ROLL_RANK = { pending: 0, marked: 1, empty: 2 };

const field =
  "h-10 rounded-lg border border-surface-subtle bg-white px-3 text-sm text-ink placeholder:text-ink-faint " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-transparent";
const iconBtn =
  "grid h-10 w-10 place-items-center rounded-lg text-ink-faint transition-colors duration-150 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500";

// Today's roll-call status (admin view).
const AttendanceStatus = ({ team }) => {
  const state = rollCall(team);
  if (state === "empty") return <span className="text-sm text-ink-faint">No members</span>;
  if (state === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
        Not marked
      </span>
    );
  }
  const a = team.attendanceToday;
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
        <span className="h-1.5 w-1.5 rounded-full bg-green-600" aria-hidden="true" />
        Marked {a?.markedAt ? <span className="font-normal tabular-nums">· {timeOf(a.markedAt)}</span> : null}
      </span>
      {a?.markedBy && <span className="pl-1 text-xs text-ink-muted">by {a.markedBy}</span>}
    </span>
  );
};

const AvatarStack = ({ names, size = 30 }) => {
  const shown = names.slice(0, MAX_AVATARS);
  if (!shown.length) return null;
  const dim = { width: size, height: size };
  return (
    <span className="flex -space-x-1.5" aria-hidden="true">
      {shown.map((n, i) => (
        <span key={i} style={dim} className="grid place-items-center rounded-full border-2 border-white bg-brand-50 text-[11px] font-bold text-brand-600">
          {initials(n)}
        </span>
      ))}
      {names.length > MAX_AVATARS && (
        <span style={dim} className="grid place-items-center rounded-full border-2 border-white bg-surface-subtle text-[11px] font-bold text-ink-muted tabular-nums">
          +{names.length - MAX_AVATARS}
        </span>
      )}
    </span>
  );
};

const TeamList = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [exporting, setExporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [leadFilter, setLeadFilter] = useState("");
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  // "" (all) | "pending" | "marked" — today's roll call.
  const [rollFilter, setRollFilter] = useState("");

  useSocketEvent("team:updated", (e) => {
    if (["team", "members", "deleted", "attendance", "resync"].includes(e?.kind)) fetchTeams();
  });

  useEffect(() => { fetchTeams(); }, []);

  // Escape closes the export menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/team`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (response.data.success) {
        setTeams(response.data.teams);
        setLoadError(false);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (team) => {
    if (!window.confirm(`Delete "${team.name}"? Its members stay in the system; only the team is removed.`)) return;
    try {
      const response = await axios.delete(`${API_BASE}/api/team/${team._id}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (response.data.success) fetchTeams();
    } catch (error) {
      console.error("Error deleting team:", error);
      alert("Couldn't delete the team. Please try again.");
    }
  };

  const isAdmin = !!user?.role?.includes("admin");
  const canExport = isAdmin || !!user?.role?.includes("team_lead");

  // Distinct team leads, for the filter and the "download by lead" menu.
  const leads = useMemo(
    () =>
      [...new Map(teams.filter((t) => t.leadId?._id).map((t) => [t.leadId._id, t.leadId])).values()]
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [teams]
  );

  const counts = useMemo(() => {
    const c = { pending: 0, marked: 0, empty: 0 };
    for (const t of teams) c[rollCall(t)]++;
    return c;
  }, [teams]);
  const trackable = counts.pending + counts.marked;

  // Search matches team name, lead name or lead email.
  const q = search.trim().toLowerCase();
  const visibleTeams = useMemo(() => {
    const list = teams.filter(
      (t) =>
        (!leadFilter || t.leadId?._id === leadFilter) &&
        (!rollFilter || rollCall(t) === rollFilter) &&
        (!q || [t.name, t.leadId?.name, t.leadId?.email].some((v) => v?.toLowerCase().includes(q)))
    );
    // Teams that still need attention first.
    if (isAdmin) list.sort((x, y) => ROLL_RANK[rollCall(x)] - ROLL_RANK[rollCall(y)]);
    return list;
  }, [teams, leadFilter, rollFilter, q, isAdmin]);

  const filtersActive = !!(search || leadFilter || rollFilter);
  const clearFilters = () => { setSearch(""); setLeadFilter(""); setRollFilter(""); };

  const toggleLead = (id) =>
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // One workbook for every team (admin: all teams or the selected leads' teams, lead: the teams they lead).
  const exportAll = async (leadIds, forMonth = month) => {
    setMenuOpen(false);
    setExporting(true);
    try {
      const res = await axios.get(`${API_BASE}/api/team/attendance/export`, {
        params: leadIds?.length ? { month: forMonth, leadId: leadIds.join(",") } : { month: forMonth },
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = leadIds?.length ? `selected_leads_attendance_${forMonth}.xlsx` : `all_teams_attendance_${forMonth}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Couldn't download the attendance Excel. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const openTeam = (team) =>
    navigate(isAdmin ? `/admin-dashboard/team/${team._id}` : `/employee-dashboard/team/${team._id}`);
  const editTeam = (team) => navigate(`/admin-dashboard/edit-team/${team._id}`);

  const tabs = [
    { key: "pending", label: "Not marked", count: counts.pending },
    { key: "marked", label: "Marked", count: counts.marked },
    { key: "", label: "All teams", count: teams.length },
  ];

  if (loading) {
    return (
      <div className="p-4 sm:p-6" aria-busy="true" aria-label="Loading teams">
        <div className="mb-6 h-8 w-40 rounded-lg bg-surface-subtle animate-pulse motion-reduce:animate-none" />
        <div className="rounded-xl border border-surface-subtle bg-white divide-y divide-surface-subtle">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-10 w-10 rounded-lg bg-surface-subtle animate-pulse motion-reduce:animate-none" />
              <div className="h-4 flex-1 max-w-xs rounded bg-surface-subtle animate-pulse motion-reduce:animate-none" />
              <div className="hidden sm:block h-4 w-32 rounded bg-surface-subtle animate-pulse motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-1 sm:p-6 bg-surface-muted min-h-screen">
      {/* Header */}
      <header className="hidden sm:flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Teams</h1>
          {isAdmin && trackable > 0 && (
            <p className="mt-1 text-sm text-ink-muted">
              <span className="font-semibold text-ink tabular-nums">{counts.marked} of {trackable}</span> teams have marked attendance today
              {counts.pending > 0 && <span className="text-amber-800"> · {counts.pending} still pending</span>}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canExport && teams.length > 0 && (
            <div className="flex items-center rounded-lg border border-surface-subtle bg-white">
              <label htmlFor="all-teams-month" className="sr-only">Attendance report month</label>
              <input
                id="all-teams-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-10 rounded-l-lg bg-transparent px-3 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              />
              <div className="relative border-l border-surface-subtle">
                <button
                  type="button"
                  onClick={() => (isAdmin ? setMenuOpen((o) => !o) : exportAll())}
                  disabled={exporting || !month}
                  aria-haspopup={isAdmin ? "menu" : undefined}
                  aria-expanded={isAdmin ? menuOpen : undefined}
                  className="flex h-10 items-center gap-2 rounded-r-lg px-3.5 text-sm font-medium text-ink hover:bg-surface-muted transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                >
                  <FiDownload className="text-accent-700" aria-hidden="true" />
                  {exporting ? "Preparing…" : "Attendance Excel"}
                  {isAdmin && <FiChevronDown className="text-ink-faint" aria-hidden="true" />}
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div role="menu" className="absolute right-0 z-20 mt-2 w-72 max-h-96 overflow-y-auto rounded-xl border border-surface-subtle bg-white py-1.5 shadow-card">
                      <button role="menuitem" onClick={() => exportAll()} className="w-full px-4 py-2.5 text-left text-sm font-medium text-ink hover:bg-surface-muted focus:outline-none focus-visible:bg-surface-muted">
                        All teams
                      </button>
                      {leads.length > 0 && (
                        <p className="border-t border-surface-subtle px-4 pt-3 pb-1 text-xs font-medium text-ink-muted">Only these team leads</p>
                      )}
                      {leads.map((l) => (
                        <label key={l._id} className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-ink hover:bg-surface-muted">
                          <input
                            type="checkbox"
                            checked={selectedLeads.has(l._id)}
                            onChange={() => toggleLead(l._id)}
                            className="h-4 w-4 rounded border-surface-subtle text-accent-600 focus:ring-accent-500"
                          />
                          {l.name || "Unknown"}
                        </label>
                      ))}
                      {leads.length > 0 && (
                        <div className="sticky bottom-0 border-t border-surface-subtle bg-white p-2">
                          <button
                            onClick={() => exportAll([...selectedLeads])}
                            disabled={selectedLeads.size === 0}
                            className="w-full rounded-lg bg-accent-600 px-3 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Download for {selectedLeads.size || "selected"} {selectedLeads.size === 1 ? "lead" : "leads"}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {isAdmin && (
            <Link
              to="/admin-dashboard/create-team"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-600"
            >
              <FiPlus aria-hidden="true" /> Create team
            </Link>
          )}
        </div>
      </header>

      {loadError && teams.length === 0 && (
        <div role="alert" className="mx-3 sm:mx-0 mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Couldn't load teams. Check your connection.
          <button onClick={() => { setLoading(true); fetchTeams(); }} className="font-semibold underline underline-offset-2">Retry</button>
        </div>
      )}

      {/* Roll-call tabs + filters */}
      {teams.length > 0 && (
        <div className={`${isAdmin ? "flex" : "hidden sm:flex"} flex-col gap-3 mb-4 px-3 sm:px-0 lg:flex-row lg:items-center lg:justify-between`}>
          {isAdmin ? (
            <div role="tablist" aria-label="Today's attendance" className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 border border-surface-subtle self-start">
              {tabs.map((t) => {
                const active = rollFilter === t.key;
                return (
                  <button
                    key={t.key || "all"}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setRollFilter(t.key)}
                    className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                      active ? "bg-brand-700 text-white" : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                    }`}
                  >
                    {t.label}
                    <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-white/20 text-white" : t.key === "pending" && t.count > 0 ? "bg-amber-100 text-amber-800" : "bg-surface-muted text-ink-muted"}`}>
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : <span />}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] lg:w-72 lg:flex-none">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
              <label htmlFor="team-search" className="sr-only">Search teams</label>
              <input
                id="team-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team or lead"
                className={`${field} w-full pl-9`}
              />
            </div>
            {leads.length > 1 && (
              <>
                <label htmlFor="team-lead-filter" className="sr-only">Filter by team lead</label>
                <select id="team-lead-filter" value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)} className={field}>
                  <option value="">All leads</option>
                  {leads.map((l) => (
                    <option key={l._id} value={l._id}>{l.name || "Unknown"}</option>
                  ))}
                </select>
              </>
            )}
            {filtersActive && (
              <button onClick={clearFilters} className="inline-flex h-10 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-accent-700 hover:bg-accent-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">
                <FiX aria-hidden="true" /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-surface-subtle bg-white shadow-card">
        {teams.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><FiUsers size={26} aria-hidden="true" /></span>
            <h2 className="font-semibold text-ink">No teams yet</h2>
            <p className="mt-1 max-w-sm text-sm text-ink-muted">
              {isAdmin ? "Create a team to group employees under a lead. The lead marks daily attendance and reviews their members." : "You don't lead any teams yet."}
            </p>
            {isAdmin && (
              <Link to="/admin-dashboard/create-team" className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700">
                <FiPlus aria-hidden="true" /> Create team
              </Link>
            )}
          </div>
        ) : visibleTeams.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-medium text-ink">
              {rollFilter === "pending" && !q && !leadFilter ? "Every team has marked attendance today." : "No teams match these filters."}
            </p>
            {filtersActive && (
              <button onClick={clearFilters} className="mt-2 text-sm font-medium text-accent-700 underline underline-offset-2">Show all teams</button>
            )}
          </div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-surface-subtle text-left text-xs font-medium text-ink-muted">
                <th scope="col" className="px-5 py-3 font-medium">Team</th>
                <th scope="col" className="px-5 py-3 font-medium">Lead</th>
                <th scope="col" className="px-5 py-3 font-medium">Members</th>
                {isAdmin && <th scope="col" className="px-5 py-3 font-medium">Today</th>}
                {isAdmin && <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle">
              {visibleTeams.map((team) => {
                const names = memberNames(team);
                const description = team.description?.trim();
                return (
                  <tr
                    key={team._id}
                    onClick={() => openTeam(team)}
                    className="group cursor-pointer transition-colors duration-150 hover:bg-surface-muted/70"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700" aria-hidden="true">
                          {teamBadge(team.name)}
                        </span>
                        <div className="min-w-0">
                          {/* The team name is the row's real link, for keyboard and screen readers. */}
                          <Link
                            to={isAdmin ? `/admin-dashboard/team/${team._id}` : `/employee-dashboard/team/${team._id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-ink hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
                          >
                            {team.name}
                          </Link>
                          {description && <p className="mt-0.5 max-w-xs truncate text-xs text-ink-muted">{description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {team.leadId?.name ? (
                        <span className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-50 text-[11px] font-bold text-accent-800" aria-hidden="true">
                            {initials(team.leadId.name)}
                          </span>
                          <span className="text-sm text-ink">{team.leadId.name}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-ink-faint">No lead</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2.5">
                        <AvatarStack names={names} />
                        <span className="text-sm text-ink-muted tabular-nums">{names.length || "None"}</span>
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5"><AttendanceStatus team={team} /></td>
                    )}
                    {isAdmin && (
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); editTeam(team); }}
                            className={`${iconBtn} hover:bg-accent-50 hover:text-accent-700`}
                            title="Edit team"
                            aria-label={`Edit ${team.name}`}
                          >
                            <FiEdit2 aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(team); }}
                            className={`${iconBtn} hover:bg-red-50 hover:text-red-600`}
                            title="Delete team"
                            aria-label={`Delete ${team.name}`}
                          >
                            <FiTrash2 aria-hidden="true" />
                          </button>
                          <FiChevronRight className="ml-1 text-ink-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100" aria-hidden="true" />
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Phone layout — mirrors mobile/lib/screens/teamlead/my_teams_screen.dart */}
      <div className="sm:hidden px-3">
        {teams.length > 0 && (
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink-muted">
              {isAdmin ? "Teams" : "Your teams"} · <span className="tabular-nums">{visibleTeams.length}</span>
            </p>
            <div className="flex items-center">
              {canExport && (
                <label className="relative inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-within:ring-2 focus-within:ring-accent-500">
                  <FiDownload size={17} aria-hidden="true" />
                  {exporting ? "Preparing…" : "Attendance"}
                  {/* Month picker opens like the app's; picking a month downloads the Excel. */}
                  <input
                    type="month"
                    aria-label="Download attendance Excel for month"
                    value={month}
                    disabled={exporting}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setMonth(e.target.value);
                      exportAll(undefined, e.target.value);
                    }}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              )}
              {isAdmin && (
                <Link to="/admin-dashboard/create-team" className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                  <FiPlus aria-hidden="true" /> New
                </Link>
              )}
            </div>
          </div>
        )}
        <ul className="space-y-2.5">
          {visibleTeams.map((team) => {
            const names = memberNames(team);
            const count = names.length;
            const description = team.description?.trim();
            return (
              <li key={team._id}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`${team.name}, ${count} ${count === 1 ? "member" : "members"}`}
                  onClick={() => openTeam(team)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTeam(team); }
                  }}
                  className="block cursor-pointer rounded-2xl border border-surface-subtle bg-white p-3.5 active:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700" aria-hidden="true">{teamBadge(team.name)}</span>
                    <span className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-bold text-ink">{team.name}</h3>
                      {team.leadId?.name && <span className="block truncate text-[13px] text-ink-muted">Lead: {team.leadId.name}</span>}
                    </span>
                    {isAdmin && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); editTeam(team); }} className="-my-2 grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-accent-50 hover:text-accent-700" aria-label={`Edit ${team.name}`}>
                          <FiEdit2 aria-hidden="true" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(team); }} className="-my-2 grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${team.name}`}>
                          <FiTrash2 aria-hidden="true" />
                        </button>
                      </>
                    )}
                    <FiChevronRight size={20} className="shrink-0 text-ink-faint" aria-hidden="true" />
                  </div>
                  {isAdmin && <div className="mt-2"><AttendanceStatus team={team} /></div>}
                  {description && <p className="mt-2.5 line-clamp-2 text-[13px] leading-snug text-ink-muted">{description}</p>}
                  <div className="mt-3 flex items-center gap-3 border-t border-surface-subtle pt-3">
                    <AvatarStack names={names} size={32} />
                    <span className="text-[13px] text-ink-muted">
                      {count === 0 ? "No members yet" : `${count} ${count === 1 ? "member" : "members"}`}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {teams.length === 0 && !loadError && (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600"><FiUsers size={28} aria-hidden="true" /></span>
            <p className="font-semibold text-ink">{isAdmin ? "No teams yet" : "No teams assigned to you yet."}</p>
            {isAdmin && (
              <Link to="/admin-dashboard/create-team" className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white">
                <FiPlus aria-hidden="true" /> Create team
              </Link>
            )}
          </div>
        )}
        {teams.length > 0 && visibleTeams.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-ink-muted">
              {rollFilter === "pending" && !q && !leadFilter ? "Every team has marked attendance today." : "No teams match these filters."}
            </p>
            {filtersActive && <button onClick={clearFilters} className="mt-2 min-h-[44px] text-sm font-medium text-accent-700 underline underline-offset-2">Show all teams</button>}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamList;
