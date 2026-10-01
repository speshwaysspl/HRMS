import React, { useEffect, useState } from "react";
import { useSocketEvent } from "../../context/NotificationContext";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../utils/apiConfig";
import { motion, AnimatePresence } from "framer-motion";
import { FaTrash, FaFileExcel, FaEdit } from "react-icons/fa";
import { FiChevronRight, FiGrid, FiUsers } from "react-icons/fi";

// Same helpers as mobile my_teams_screen.dart.
const memberNames = (team) =>
  (team.members || []).map((m) => m.employeeId?.userId?.name || m.name || "");

const initials = (name) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const MAX_AVATARS = 4;

const timeOf = (v) => new Date(v).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// Today's roll-call status for a team (admin view).
const AttendanceStatus = ({ team }) => {
  if (!team.members?.length) return <span className="text-sm text-ink-faint">No members</span>;
  const a = team.attendanceToday;
  return a?.marked ? (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-800">Marked</span>
      <span className="text-xs text-ink-muted">{timeOf(a.markedAt)}{a.markedBy ? ` · ${a.markedBy}` : ""}</span>
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Not marked</span>
  );
};

const TeamList = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
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
  // "" | "marked" | "not_marked" — today's team roll call.
  const [attFilter, setAttFilter] = useState("");
  useSocketEvent("team:updated", (e) => {
    if (["team", "members", "deleted", "attendance"].includes(e?.kind)) fetchTeams();
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/team`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (response.data.success) {
        setTeams(response.data.teams);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this team?")) {
      try {
        const response = await axios.delete(`${API_BASE}/api/team/${id}`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        });
        if (response.data.success) {
          fetchTeams();
        }
      } catch (error) {
        console.error("Error deleting team:", error);
        alert("Failed to delete team");
      }
    }
  };

  const canExport = user?.role?.includes("admin") || user?.role?.includes("team_lead");

  const isAdmin = user?.role?.includes("admin");
  // Distinct team leads, for the admin's "download by lead" menu.
  const leads = [...new Map(teams.filter((t) => t.leadId?._id).map((t) => [t.leadId._id, t.leadId])).values()]
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // Search matches team name, lead name or lead email; the dropdown narrows to one lead.
  const q = search.trim().toLowerCase();
  const visibleTeams = teams.filter(
    (t) =>
      (!leadFilter || t.leadId?._id === leadFilter) &&
      (!attFilter ||
        (attFilter === "marked" ? !!t.attendanceToday?.marked : !t.attendanceToday?.marked && t.members?.length > 0)) &&
      (!q || [t.name, t.leadId?.name, t.leadId?.email].some((v) => v?.toLowerCase().includes(q)))
  );

  // Teams with no members have no roll call to take, so they're not "pending".
  const trackable = teams.filter((t) => t.members?.length);
  const markedCount = trackable.filter((t) => t.attendanceToday?.marked).length;
  const pendingCount = trackable.length - markedCount;

  // Not marked first, then marked, then teams with no members.
  const attRank = (t) => (!t.members?.length ? 2 : t.attendanceToday?.marked ? 1 : 0);
  if (isAdmin) visibleTeams.sort((x, y) => attRank(x) - attRank(y));

  const toggleLead = (id) =>
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      alert("Failed to export attendance");
    } finally {
      setExporting(false);
    }
  };

  const openTeam = (team) =>
    navigate(isAdmin ? `/admin-dashboard/team/${team._id}` : `/employee-dashboard/team/${team._id}`);

  if (loading)
    return (
      <div className="p-4 sm:p-6 space-y-3" aria-busy="true" aria-label="Loading teams">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-white border border-surface-subtle animate-pulse" />
        ))}
      </div>
    );

  return (
    <motion.div
      className="py-1 sm:p-6 bg-surface-muted min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="hidden sm:flex flex-wrap justify-between items-center gap-3 mb-6"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <h2 className="text-2xl font-semibold text-brand-800">
          Teams
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {canExport && teams.length > 0 && (
            <>
              <label htmlFor="all-teams-month" className="sr-only">Report month</label>
              <input
                id="all-teams-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink bg-white focus:ring-2 focus:ring-accent-500 outline-none"
              />
              <div className="relative">
                <button
                  onClick={() => (isAdmin ? setMenuOpen((o) => !o) : exportAll())}
                  disabled={exporting || !month}
                  aria-haspopup={isAdmin ? "menu" : undefined}
                  aria-expanded={isAdmin ? menuOpen : undefined}
                  className="border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-60 transition-colors"
                >
                  <FaFileExcel className="text-accent-700" />
                  {exporting ? "Exporting..." : "Download Attendance Excel"}
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div role="menu" className="absolute right-0 z-20 mt-2 w-64 max-h-80 overflow-y-auto bg-white border border-surface-subtle rounded-lg shadow-card py-1">
                      <button role="menuitem" onClick={() => exportAll()} className="w-full text-left px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted">
                        All teams
                      </button>
                      {leads.length > 0 && (
                        <div className="px-4 pt-2 pb-1 text-xs font-medium text-ink-muted border-t border-surface-subtle">By team lead</div>
                      )}
                      {leads.map((l) => (
                        <label key={l._id} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-muted cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedLeads.has(l._id)}
                            onChange={() => toggleLead(l._id)}
                            className="h-4 w-4 rounded text-accent-600"
                          />
                          {l.name || "Unknown"}
                        </label>
                      ))}
                      {leads.length > 0 && (
                        <div className="sticky bottom-0 bg-white border-t border-surface-subtle p-2">
                          <button
                            onClick={() => exportAll([...selectedLeads])}
                            disabled={selectedLeads.size === 0}
                            className="w-full bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60"
                          >
                            Download selected ({selectedLeads.size})
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
          {user?.role?.includes("admin") && (
            <Link
              to="/admin-dashboard/create-team"
              className="bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Create Team
            </Link>
          )}
        </div>
      </motion.div>

      {teams.length > 0 && (
        <div className={`${isAdmin ? "flex" : "hidden sm:flex"} flex-wrap items-center gap-2 mb-4`}>
          <label htmlFor="team-search" className="sr-only">Search teams</label>
          <input
            id="team-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team or team lead..."
            className="flex-1 min-w-[200px] max-w-md border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink bg-white focus:ring-2 focus:ring-accent-500 outline-none"
          />
          <label htmlFor="team-lead-filter" className="sr-only">Filter by team lead</label>
          <select
            id="team-lead-filter"
            value={leadFilter}
            onChange={(e) => setLeadFilter(e.target.value)}
            className="border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink bg-white focus:ring-2 focus:ring-accent-500 outline-none"
          >
            <option value="">All team leads</option>
            {leads.map((l) => (
              <option key={l._id} value={l._id}>{l.name || "Unknown"}</option>
            ))}
          </select>
          {isAdmin && (
            <>
              <label htmlFor="team-att-filter" className="sr-only">Filter by today's attendance</label>
              <select
                id="team-att-filter"
                value={attFilter}
                onChange={(e) => setAttFilter(e.target.value)}
                className="border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink bg-white focus:ring-2 focus:ring-accent-500 outline-none"
              >
                <option value="">Today: all</option>
                <option value="marked">Today: marked ({markedCount})</option>
                <option value="not_marked">Today: not marked ({pendingCount})</option>
              </select>
            </>
          )}
          {(search || leadFilter || attFilter) && (
            <button
              onClick={() => { setSearch(""); setLeadFilter(""); setAttFilter(""); }}
              className="text-sm font-medium text-accent-700 hover:underline px-2 py-2"
            >
              Clear
            </button>
          )}
          <span className="text-sm text-ink-muted">{visibleTeams.length} of {teams.length} teams</span>
        </div>
      )}

      <motion.div
        className="bg-white rounded-xl shadow-card overflow-x-auto border border-surface-subtle hidden sm:block"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <table className="min-w-full border-collapse">
          <thead className="bg-surface-muted">
            <tr>
              <th className="px-5 py-3 text-left text-sm font-semibold text-ink">Team Name</th>
              <th className="px-5 py-3 text-left text-sm font-semibold text-ink">Lead</th>
              <th className="px-5 py-3 text-left text-sm font-semibold text-ink">Members</th>
              {isAdmin && (
                <th className="px-5 py-3 text-left text-sm font-semibold text-ink">Today's Attendance</th>
              )}
              {user?.role?.includes("admin") && (
                <th className="px-5 py-3 text-left text-sm font-semibold text-ink">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-surface-subtle">
            <AnimatePresence>
              {visibleTeams.map((team, index) => (
                <motion.tr
                  key={team._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-surface-muted transition-colors cursor-pointer"
                  onClick={() => {
                    navigate(
                      user?.role?.includes("admin")
                        ? `/admin-dashboard/team/${team._id}`
                        : `/employee-dashboard/team/${team._id}`
                    );
                  }}
                >
                  <td className="px-5 py-4 font-medium text-ink">{team.name}</td>
                  <td className="px-5 py-4 text-ink-muted">{team.leadId?.name || "N/A"}</td>
                  <td className="px-5 py-4 text-ink-muted">{team.members?.length || 0}</td>
                  {isAdmin && (
                    <td className="px-5 py-4">
                      <AttendanceStatus team={team} />
                    </td>
                  )}
                  {user?.role?.includes("admin") && (
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin-dashboard/edit-team/${team._id}`);
                        }}
                        className="text-accent-700 hover:text-accent-800 transition-colors p-2 rounded-full hover:bg-accent-50"
                        title="Edit Team"
                        aria-label="Edit Team"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(team._id);
                        }}
                        className="text-red-600 hover:text-red-700 transition-colors p-2 rounded-full hover:bg-red-50"
                        title="Delete Team"
                      >
                        <FaTrash />
                      </button>
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
            {visibleTeams.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center p-8 text-ink-muted">
                  {teams.length === 0 ? "No teams found." : "No teams match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>
      {/* Phone layout — mirrors mobile/lib/screens/teamlead/my_teams_screen.dart */}
      <div className="sm:hidden">
        {teams.length > 0 && (
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold text-ink-muted">Your teams · {visibleTeams.length}</p>
            <div className="flex items-center">
              {canExport && (
                <label className="relative inline-flex min-h-[44px] items-center gap-1.5 px-2 text-sm font-semibold text-brand-700 cursor-pointer rounded-lg hover:bg-brand-50 focus-within:ring-2 focus-within:ring-accent-500">
                  <FiGrid size={18} aria-hidden="true" />
                  {exporting ? "Preparing..." : "Attendance"}
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
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              )}
              {isAdmin && (
                <Link to="/admin-dashboard/create-team" className="inline-flex min-h-[44px] items-center px-2 text-sm font-semibold text-brand-700 rounded-lg hover:bg-brand-50">
                  + New
                </Link>
              )}
            </div>
          </div>
        )}
        <ul className="space-y-3">
          {visibleTeams.map((team) => {
            const names = memberNames(team);
            const count = names.length;
            const shown = names.slice(0, MAX_AVATARS);
            const description = team.description?.trim();
            return (
              <li key={team._id}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`${team.name}, ${count} ${count === 1 ? "member" : "members"}`}
                  onClick={() => openTeam(team)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openTeam(team);
                    }
                  }}
                  className="block bg-white rounded-xl border border-surface-subtle p-4 cursor-pointer active:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                >
                  <div className="flex items-start gap-1">
                    <h3 className="flex-1 min-w-0 text-base font-bold text-ink line-clamp-2">{team.name}</h3>
                    {isAdmin && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin-dashboard/edit-team/${team._id}`); }}
                          className="-my-2 p-2.5 text-accent-700 rounded-full hover:bg-accent-50"
                          aria-label={`Edit ${team.name}`}
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(team._id); }}
                          className="-my-2 p-2.5 text-red-600 rounded-full hover:bg-red-50"
                          aria-label={`Delete ${team.name}`}
                        >
                          <FaTrash />
                        </button>
                      </>
                    )}
                    <FiChevronRight size={22} className="shrink-0 text-ink-faint" aria-hidden="true" />
                  </div>
                  {isAdmin && (
                    <div className="mt-1.5">
                      <AttendanceStatus team={team} />
                    </div>
                  )}
                  {description && <p className="mt-1 text-[13px] leading-snug text-ink-muted line-clamp-2">{description}</p>}
                  <div className="mt-3.5 flex items-center gap-2.5">
                    {shown.length > 0 && (
                      <div className="flex -space-x-2" aria-hidden="true">
                        {shown.map((n, i) => (
                          <span key={i} className="grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-white bg-brand-50 text-[11px] font-bold text-brand-500">
                            {initials(n)}
                          </span>
                        ))}
                        {count > MAX_AVATARS && (
                          <span className="grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-white bg-surface-subtle text-[11px] font-bold text-ink-muted">
                            +{count - MAX_AVATARS}
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-[13px] text-ink-muted">
                      {count === 0 ? "No members yet" : `${count} ${count === 1 ? "member" : "members"}`}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {teams.length === 0 && (
          <div className="flex flex-col items-center text-center py-16 px-6">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-500 mb-4">
              <FiUsers size={28} aria-hidden="true" />
            </span>
            <p className="font-semibold text-ink">No teams assigned to you yet.</p>
          </div>
        )}
        {teams.length > 0 && visibleTeams.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-muted">No teams match your search.</p>
        )}
      </div>
    </motion.div>
  );
};

export default TeamList;
