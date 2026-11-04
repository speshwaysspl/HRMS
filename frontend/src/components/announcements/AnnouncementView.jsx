// src/components/announcement/AnnouncementView.jsx
import axios from "axios";
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";
import { motion } from "framer-motion";


import { formatISTDate } from "../../utils/dateTimeUtils";
import useMeta from "../../utils/useMeta";
import { useLiveTick } from "../../context/NotificationContext";
import AnnouncementCard from "./AnnouncementCard";

const AnnouncementView = () => {
  const liveTick = useLiveTick(["announcement"]);
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
  }, [id, liveTick]);

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
      className="max-w-3xl mx-auto md:mt-10 md:bg-white md:p-8 md:rounded-xl md:shadow-panel md:border md:border-surface-subtle"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h1 className="hidden md:block text-3xl font-semibold mb-6 text-center text-brand-800">
        Announcement Details
      </h1>

      {/* Same themed card employees see */}
      <AnnouncementCard
        variant="full"
        a={{
          ...announcement,
          imageUrl: (() => {
            const raw = announcement.imageUrl || announcement.image;
            return raw ? (raw.startsWith("http") ? raw : `${API_BASE}/${raw.replace(/^\//, "")}`) : null;
          })(),
        }}
      />

      <p className="mt-4 text-sm text-ink-muted">
        <span className="font-semibold text-ink">Audience: </span>
        {announcement.scope === "team_leads" ? "Team Leads Only"
          : announcement.scope === "team_members" ? "Team Members Only"
          : announcement.scope === "team" ? `Team: ${announcement.targetTeam?.name || "Specific Team"}`
          : announcement.scope === "specific" ? `Specific Employees (${announcement.recipients?.length || 0})`
          : "All Employees"}
        {" · "}
        {formatISTDate(new Date(announcement.createdAt))}
      </p>

      <button
        onClick={() => navigate("/admin-dashboard/announcements")}
        className="mt-6 hidden md:block w-full py-3 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-lg transition-colors text-sm sm:text-base"
      >
        ← Back to Announcements
      </button>
    </motion.div>
  );
};

export default AnnouncementView;
