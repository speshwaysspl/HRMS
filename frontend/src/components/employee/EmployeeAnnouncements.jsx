// frontend/src/pages/EmployeeAnnouncements.jsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import { FiBell } from "react-icons/fi";
import AnnouncementCard from "../announcements/AnnouncementCard";
import { useLiveTick } from "../../context/NotificationContext";

const EmployeeAnnouncements = () => {
  const liveTick = useLiveTick(["announcement"]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const canonical = useMemo(() => `${window.location.origin}/employee-dashboard/announcements`, []);
  useMeta({
    title: "Announcements — Speshway HRMS",
    description: "Latest company announcements for employees.",
    keywords: "announcements, employee, HRMS",
    url: canonical,
    image: "/images/Logo.jpg",
    robots: "noindex,nofollow",
    type: "article"
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const token = sessionStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/announcement`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          setAnnouncements(res.data.announcements);
        } else {
          setError("Failed to load announcements.");
        }
      } catch (err) {
        setError("Failed to load announcements.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [liveTick]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingState message="Loading announcements..." variant="cards" rows={6} />
    </div>
  );
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ErrorState title="Failed to load announcements" message={error} />
    </div>
  );
  if (announcements.length === 0) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <EmptyState icon={FiBell} title="No announcements available" message="Check back later for company updates." />
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-muted md:p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-3.5 md:mb-8 px-0.5 md:px-0"
        >
          <h1 className="hidden md:block text-3xl font-extrabold text-ink mb-1">Announcements</h1>
          <p className="text-ink-muted text-[13px] md:text-base">Stay updated with the latest company news</p>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid gap-3.5 md:gap-4"
        >
          {announcements.map((a) => (
            <li key={a._id}>
              <AnnouncementCard
                a={a}
                isNew={a.seen === false}
                onClick={() => navigate(`/employee-dashboard/announcements/${a._id}`)}
              />
            </li>
          ))}
        </motion.ul>
      </div>
    </div>
  );
};

export default EmployeeAnnouncements;
