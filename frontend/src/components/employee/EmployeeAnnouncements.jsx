// frontend/src/pages/EmployeeAnnouncements.jsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";
import { formatISTDate } from "../../utils/dateTimeUtils";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import { FiBell } from "react-icons/fi";

const EmployeeAnnouncements = () => {
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
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingState message="Loading announcements..." />
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
    <div className="min-h-screen bg-surface-muted p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5 md:mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-extrabold text-ink mb-1">Announcements</h1>
          <p className="text-ink-muted text-sm md:text-base">Stay updated with the latest company news</p>
        </motion.div>

        <div className="space-y-3 md:space-y-4">
          {announcements.map(({ _id, title, description, createdAt }, index) => {
            const isNew = createdAt ? Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000 : false;
            return (
              <motion.button
                key={_id}
                type="button"
                onClick={() => navigate(`/employee-dashboard/announcements/${_id}`)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="w-full text-left rounded-2xl p-4 md:p-5 border bg-gradient-to-b from-[#F0FDF4] to-white hover:shadow-panel transition-shadow"
                style={{ borderColor: "#BBF7D0", boxShadow: "0 4px 12px rgba(22,163,74,0.08)" }}
              >
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center flex-shrink-0">
                    <FiBell size={20} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[15px] md:text-lg font-extrabold text-ink leading-snug line-clamp-2 break-words">
                        {title}
                      </h3>
                      {isNew && (
                        <span className="flex-shrink-0 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-[#16A34A] text-white">
                          NEW
                        </span>
                      )}
                    </div>
                    {description && (
                      <p className="text-[13px] text-[#475569] leading-relaxed line-clamp-3 mt-1.5">{description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#DCFCE7]">
                  <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatISTDate(new Date(createdAt))}
                  </span>
                  <span className="text-xs font-bold text-[#16A34A]">Read more ›</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmployeeAnnouncements;
