import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../utils/apiConfig";
import { motion, AnimatePresence } from "framer-motion";
import { FaTrash } from "react-icons/fa";

const TeamList = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/team`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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

  if (loading) return <div>Loading...</div>;

  return (
    <motion.div
      className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="flex justify-between items-center mb-6"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <h2
          className="text-3xl font-bold text-gray-800"
          style={{ fontFamily: "Times New Roman, serif" }}
        >
          Teams
        </h2>
        {user?.role?.includes("admin") && (
          <Link
            to="/admin-dashboard/create-team"
            className="bg-gradient-to-r from-teal-600 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            Create Team
          </Link>
        )}
      </motion.div>

      <motion.div
        className="bg-white rounded-xl shadow-xl overflow-x-auto border hidden sm:block"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <table className="min-w-full border-collapse">
          <thead className="bg-indigo-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-bold text-slate-700">Team Name</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-slate-700">Lead</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-slate-700">Members</th>
              {user?.role?.includes("admin") && (
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-700">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <AnimatePresence>
              {teams.map((team, index) => (
                <motion.tr
                  key={team._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-blue-50 transition-colors cursor-pointer"
                  onClick={() => {
                    navigate(
                      user?.role?.includes("admin")
                        ? `/admin-dashboard/team/${team._id}`
                        : `/team-lead-dashboard/team/${team._id}`
                    );
                  }}
                >
                  <td className="px-5 py-4 font-medium text-gray-800">{team.name}</td>
                  <td className="px-5 py-4 text-gray-600">{team.leadId?.name || "N/A"}</td>
                  <td className="px-5 py-4 text-gray-600">{team.members?.length || 0}</td>
                  {user?.role?.includes("admin") && (
                    <td className="px-5 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(team._id);
                        }}
                        className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-full hover:bg-red-50"
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
                <td colSpan={3} className="text-center p-8 text-gray-500">
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
            className="bg-white rounded-xl shadow border p-4 cursor-pointer"
            onClick={() => {
              navigate(
                user?.role?.includes("admin")
                  ? `/admin-dashboard/team/${team._id}`
                  : `/team-lead-dashboard/team/${team._id}`
              );
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-gray-900">{team.name}</div>
                <div className="text-xs text-gray-500">Members: {team.members?.length || 0}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-sm text-gray-600">Lead: <span className="font-semibold">{team.leadId?.name || "N/A"}</span></div>
                {user?.role?.includes("admin") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(team._id);
                    }}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {teams.length === 0 && (
          <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">No teams found.</div>
        )}
      </div>
    </motion.div>
  );
};

export default TeamList;
