import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../utils/apiConfig";
import { motion, AnimatePresence } from "framer-motion";
import { FaTrash, FaFileExcel } from "react-icons/fa";

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

  // One workbook for every team (admin: all teams, lead: the teams they lead).
  const exportAll = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API_BASE}/api/team/attendance/export`, {
        params: { month },
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all_teams_attendance_${month}.xlsx`;
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
              <button
                onClick={exportAll}
                disabled={exporting || !month}
                className="border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-60 transition-colors"
              >
                <FaFileExcel className="text-accent-700" />
                {exporting ? "Exporting..." : "Download Attendance Excel"}
              </button>
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
              {teams.map((team, index) => (
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
                    </td>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
            {teams.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center p-8 text-ink-muted">
                  No teams found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>
      <div className="sm:hidden space-y-3">
        {teams.map((team) => (
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
