import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";

const CreateTeam = () => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    leadId: "",
  });
  const [teamLeads, setTeamLeads] = useState([]);
  const navigate = useNavigate();

  React.useEffect(() => {
    fetchTeamLeads();
  }, []);

  const fetchTeamLeads = async () => {
    try {
        const response = await axios.get(`${API_BASE}/api/team/leads`, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        });
        if (response.data.success) {
            setTeamLeads(response.data.leads);
        }
    } catch (error) {
        console.error("Error fetching team leads:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${API_BASE}/api/team/add`,
        formData,
        {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        }
      );
      if (response.data.success) {
        navigate("/admin-dashboard/teams");
      }
    } catch (error) {
      console.error("Error creating team:", error);
      alert(error.response?.data?.error || "Failed to create team");
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-card border border-surface-subtle">
      <h2 className="text-2xl font-semibold mb-6 text-brand-800">Create New Team</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-ink text-sm font-medium mb-2">
            Team Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
            required
          />
        </div>

        <div className="mb-4">
            <label className="block text-ink text-sm font-medium mb-2">
                Assign Team Lead
            </label>
            <select
                name="leadId"
                value={formData.leadId}
                onChange={handleChange}
                className="w-full border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
                required
            >
                <option value="">Select Team Lead</option>
                {teamLeads.map(lead => (
                    <option key={lead._id} value={lead._id}>{lead.name}</option>
                ))}
            </select>
        </div>

        <div className="mb-4">
          <label className="block text-ink text-sm font-medium mb-2">
            Start Date
          </label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="w-full border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
          />
        </div>
        <button
          type="submit"
          className="bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          Create Team
        </button>
      </form>
    </div>
  );
};

export default CreateTeam;
