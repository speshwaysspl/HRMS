// src/utils/AnnouncementButtons.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "./apiConfig";


const AnnouncementButtons = ({ Id }) => {
  const navigate = useNavigate();

  const handleView = () => {
    navigate(`/admin-dashboard/announcements/${Id}`);
  };

  const handleEdit = () => {
    navigate(`/admin-dashboard/announcements/edit/${Id}`);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/api/announcement/${Id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Simple refresh — you can improve by lifting state up
      window.location.reload();
    } catch (err) {
      console.error("Delete error", err);
      alert(err.response?.data?.error || "Could not delete announcement");
    }
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={handleView} className="px-3 py-1 bg-blue-500 text-white rounded">View</button>
      <button onClick={handleEdit} className="px-3 py-1 bg-green-500 text-white rounded">Edit</button>
      <button onClick={handleDelete} className="px-3 py-1 bg-red-500 text-white rounded">Delete</button>
    </div>
  );
};

export default AnnouncementButtons;
