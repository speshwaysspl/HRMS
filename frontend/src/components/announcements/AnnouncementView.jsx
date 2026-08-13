// src/components/announcement/AnnouncementView.jsx
import axios from "axios";
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";
import { motion } from "framer-motion";


import { formatISTDate } from "../../utils/dateTimeUtils";
import useMeta from "../../utils/useMeta";

const AnnouncementView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const canonical = useMemo(() => `${window.location.origin}/admin-dashboard/announcements/${id}`, [id]);
  useMeta({
    title: announcement?.title ? `${announcement.title} — Announcement` : "Announcement — Speshway HRMS",
    description: announcement?.description || "View announcement details.",
    keywords: "announcement, HRMS",
    url: canonical,
    image: announcement?.imageUrl || "/images/Logo.jpg",
    type: "article",
    robots: "noindex,nofollow",
    jsonLd: announcement && {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": announcement.title,
      "image": announcement.imageUrl ? [announcement.imageUrl] : undefined,
      "datePublished": announcement.createdAt,
      "dateModified": announcement.updatedAt || announcement.createdAt,
      "author": {
        "@type": "Organization",
        "name": "Speshway HRMS"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Speshway HRMS",
        "logo": {
          "@type": "ImageObject",
          "url": "/images/Logo.jpg"
        }
      },
      "mainEntityOfPage": canonical
    }
  });

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/announcement/${id}`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
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
        className="max-w-3xl mx-auto mt-10 text-center text-red-600 font-medium bg-red-100 rounded-xl p-4 border border-red-200"
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
        className="text-center mt-10 text-ink-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Loading...
      </motion.div>
    );

  return (
    <motion.div
      className="max-w-3xl mx-auto mt-10 bg-white p-3 sm:p-6 md:p-8 rounded-xl shadow-panel border border-surface-subtle"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h1 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6 text-center text-brand-800 px-2">
        Announcement Details
      </h1>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex justify-center items-center mb-4 md:mb-0">
          {announcement.imageUrl ? (
            <img
              src={announcement.imageUrl}
              alt={announcement.title}
              className="rounded-lg w-full max-w-xs sm:max-w-sm shadow-card"
            />
          ) : (
            <div className="bg-surface-muted text-ink-faint w-full max-w-xs sm:max-w-sm h-40 sm:h-48 flex items-center justify-center rounded-lg text-sm sm:text-base">
              No Image Available
            </div>
          )}
        </div>

        <div className="px-2 sm:px-0">
          <div className="mb-4 sm:mb-5">
            <p className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 text-ink">Title:</p>
            <p className="font-medium text-ink-muted text-sm sm:text-base break-words">{announcement.title}</p>
          </div>

          <div className="mb-4 sm:mb-5">
            <p className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 text-ink">Date:</p>
            <p className="font-medium text-ink-muted text-sm sm:text-base">
              {formatISTDate(new Date(announcement.createdAt))}
            </p>
          </div>

          <div className="mb-4 sm:mb-5">
            <p className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 text-ink">Description:</p>
            <p className="font-medium text-ink-muted whitespace-pre-wrap text-sm sm:text-base break-words leading-relaxed">
              {announcement.description}
            </p>
          </div>
        </div>
      </motion.div>

      <button
        onClick={() => navigate("/admin-dashboard/announcements")}
        className="mt-4 sm:mt-6 w-full py-2 sm:py-3 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-lg transition-colors text-sm sm:text-base"
      >
        ← Back to Announcements
      </button>
    </motion.div>
  );
};

export default AnnouncementView;
