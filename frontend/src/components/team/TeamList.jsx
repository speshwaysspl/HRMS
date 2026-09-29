import React, { useEffect, useState } from "react";
import { useSocketEvent } from "../../context/NotificationContext";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../utils/apiConfig";
import { motion, AnimatePresence } from "framer-motion";
import { FaTrash, FaFileExcel, FaEdit } from "react-icons/fa";

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
  useSocketEvent("team:updated", (e) => {
    if (["team", "members", "deleted"].includes(e?.kind)) fetchTeams();
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
      (!q || [t.name, t.leadId?.name, t.leadId?.email].some((v) => v?.toLowerCase().includes(q)))
  );

  const toggleLead = (id) =>
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // One workbook for every team (admin: all teams or the selected leads' teams, lead: the teams they lead).
  const exportAll = async (leadIds) => {
    setMenuOpen(false);
    setExporting(true);
    try {
      const res = await axios.get(`${API_BASE}/api/team/attendance/export`, {
        params: leadIds?.length ? { month, leadId: leadIds.join(",") } : { month },
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = leadIds?.length ? `selected_leads_attendance_${month}.xlsx` : `all_teams_attendance_${month}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export attendance");
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="p-6 text-ink-muted">Loading...</div>;

  return (
    <motion.div
      className="p-6 bg-surface-muted min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="flex flex-wrap justify-between items-center gap-3 mb-6"
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
        <div className="flex flex-wrap items-center gap-2 mb-4">
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
          {(search || leadFilter) && (
            <button
              onClick={() => { setSearch(""); setLeadFilter(""); }}
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
                <td colSpan={4} className="text-center p-8 text-ink-muted">
                  {teams.length === 0 ? "No teams found." : "No teams match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>
      <div className="sm:hidden space-y-3">
        {visibleTeams.map((team) => (
          <div
            key={team._id}
            className="bg-white rounded-xl shadow-card border border-surface-subtle p-4 cursor-pointer"
            onClick={() => {
              navigate(
                user?.role?.includes("admin")
                  ? `/admin-dashboard/team/${team._id}`
                  : `/employee-dashboard/team/${team._id}`
              );
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-ink">{team.name}</div>
                <div className="text-xs text-ink-muted">Members: {team.members?.length || 0}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-sm text-ink-muted">Lead: <span className="font-medium text-ink">{team.leadId?.name || "N/A"}</span></div>
                {user?.role?.includes("admin") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin-dashboard/edit-team/${team._id}`);
                    }}
                    className="text-accent-700 hover:text-accent-800 p-2"
                    aria-label="Edit Team"
                  >
                    <FaEdit />
                  </button>
                )}
                {user?.role?.includes("admin") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(team._id);
                    }}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {teams.length === 0 && (
          <div className="bg-white rounded-xl shadow-card border border-surface-subtle p-6 text-center text-ink-muted">No teams found.</div>
        )}
      </div>
    </motion.div>
  );
};

export default TeamList;
