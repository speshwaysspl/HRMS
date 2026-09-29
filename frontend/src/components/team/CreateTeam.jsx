import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
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
  // Same form edits an existing team when reached via /edit-team/:id.
  const { id } = useParams();
  const isEdit = !!id;
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    fetchTeamLeads();
  }, []);

  React.useEffect(() => {
    if (!id) return;
    axios
      .get(`${API_BASE}/api/team/${id}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      })
      .then((res) => {
        const t = res.data.team;
        setFormData({
          name: t.name || "",
          description: t.description || "",
          startDate: t.startDate ? String(t.startDate).slice(0, 10) : "",
          leadId: t.leadId?._id || t.leadId || "",
        });
      })
      .catch(() => alert("Failed to load team"));
  }, [id]);

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
    setSaving(true);
    try {
      const response = await axios[isEdit ? "put" : "post"](
        isEdit ? `${API_BASE}/api/team/${id}` : `${API_BASE}/api/team/add`,
        formData,
        {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        }
      );
      if (response.data.success) {
        navigate("/admin-dashboard/teams");
      }
    } catch (error) {
      console.error("Error saving team:", error);
      alert(error.response?.data?.error || `Failed to ${isEdit ? "update" : "create"} team`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-card border border-surface-subtle">
      <h2 className="text-2xl font-semibold mb-6 text-brand-800">{isEdit ? "Edit Team" : "Create New Team"}</h2>
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
          disabled={saving}
          className="bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Team"}
        </button>
      </form>
    </div>
  );
};

export default CreateTeam;
