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
      alert(err.response?.data?.error || "Could not delete announcement");
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 w-full">
      <button
        onClick={handleView}
        className="px-2 py-1 min-w-[56px] text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-md whitespace-nowrap"
      >
        View
      </button>
      <button
        onClick={handleEdit}
        className="px-2 py-1 min-w-[56px] text-xs font-medium bg-green-500 hover:bg-green-600 text-white rounded-md whitespace-nowrap"
      >
        Edit
      </button>
      <button
        onClick={handleDelete}
        className="px-2 py-1 min-w-[56px] text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-md whitespace-nowrap"
      >
        Delete
      </button>
    </div>
  );
};

export default AnnouncementButtons;
