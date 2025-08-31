// src/components/announcement/AnnouncementView.jsx
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";
import { motion } from "framer-motion";
import { formatISTDate } from "../../utils/dateTimeUtils";

const AnnouncementView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/announcement/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (response.data.success) {
          setAnnouncement(response.data.announcement);
        } else {
          setErrorMsg(response.data.error || "Failed to fetch announcement");
        }
      } catch (error) {
        setErrorMsg(error.response?.data?.error || "Server error");
      }
    };
    fetchAnnouncement();
  }, [id]);

  if (errorMsg)
    return (
      <motion.div
        className="max-w-3xl mx-auto mt-10 text-center text-red-600 font-medium"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {errorMsg}
      </motion.div>
    );

  if (!announcement)
    return (
      <motion.div
        className="text-center mt-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Loading ...
      </motion.div>
    );

  return (
    <motion.div
      className="max-w-3xl mx-auto mt-10 bg-white p-3 sm:p-6 md:p-8 rounded-2xl shadow-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h2
        className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent px-2"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 120 }}
      >
        Announcement Details
      </motion.h2>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="flex justify-center items-center mb-4 md:mb-0"
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 150 }}
        >
          {announcement.imageUrl ? (
            <img
              src={announcement.imageUrl}
              alt={announcement.title}
              className="rounded-lg w-full max-w-xs sm:max-w-sm shadow-md"
            />
          ) : (
            <div className="bg-gray-200 text-gray-500 w-full max-w-xs sm:max-w-sm h-40 sm:h-48 flex items-center justify-center rounded-lg shadow-inner text-sm sm:text-base">
              No Image Available
            </div>
          )}
        </motion.div>

        <div className="px-2 sm:px-0">
          <div className="mb-4 sm:mb-5">
            <p className="text-base sm:text-lg font-bold mb-1 sm:mb-2">Title:</p>
            <p className="font-medium text-gray-700 text-sm sm:text-base break-words">{announcement.title}</p>
          </div>

          <div className="mb-4 sm:mb-5">
            <p className="text-base sm:text-lg font-bold mb-1 sm:mb-2">Date:</p>
            <p className="font-medium text-gray-700 text-sm sm:text-base">
              {formatISTDate(new Date(announcement.createdAt))}
            </p>
          </div>

          <div className="mb-4 sm:mb-5">
            <p className="text-base sm:text-lg font-bold mb-1 sm:mb-2">Description:</p>
            <p className="font-medium text-gray-700 whitespace-pre-wrap text-sm sm:text-base break-words leading-relaxed">
              {announcement.description}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <button
          onClick={() => navigate("/admin-dashboard/announcements")}
          className="mt-4 sm:mt-6 w-full py-2 sm:py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all text-sm sm:text-base"
        >
          ← Back to Announcements
        </button>
      </motion.div>
    </motion.div>
  );
};

export default AnnouncementView;
