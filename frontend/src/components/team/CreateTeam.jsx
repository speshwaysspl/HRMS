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
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-6">Create New Team</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Team Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>

        <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
                Assign Team Lead
            </label>
            <select
                name="leadId"
                value={formData.leadId}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
            >
                <option value="">Select Team Lead</option>
                {teamLeads.map(lead => (
                    <option key={lead._id} value={lead._id}>{lead.name}</option>
                ))}
            </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Start Date
          </label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <button
          type="submit"
          className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
        >
          Create Team
        </button>
      </form>
    </div>
  );
};

export default CreateTeam;
