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
import { FiBell, FiChevronRight } from "react-icons/fi";

// Purposeful, stable label + color per announcement category — used instead
// of a decorative icon badge on every row.
const CATEGORY_STYLE = {
  important: { label: "Important", className: "text-brand-600" },
  festival: { label: "Festival", className: "text-accent-600" },
  event: { label: "Event", className: "text-accent-600" },
  achievement: { label: "Achievement", className: "text-accent-600" },
  quote: { label: "Daily Quote", className: "text-ink-faint" },
};
const categoryStyle = (category) => CATEGORY_STYLE[category] || { label: "Announcement", className: "text-ink-faint" };

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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-surface-subtle bg-surface divide-y divide-surface-subtle overflow-hidden"
        >
          {announcements.map(({ _id, title, description, createdAt, category, imageUrl }) => {
            const { label, className } = categoryStyle(category);
            return (
              <button
                key={_id}
                type="button"
                onClick={() => navigate(`/employee-dashboard/announcements/${_id}`)}
                className="group w-full text-left p-4 md:p-5 flex items-start gap-3 hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:bg-surface-muted"
              >
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[10.5px] font-bold uppercase tracking-wide ${className}`}>{label}</span>
                    <span className="text-xs text-ink-faint font-medium flex-shrink-0">{formatISTDate(new Date(createdAt))}</span>
                  </div>
                  <h3 className="text-[15px] md:text-base font-bold text-ink leading-snug line-clamp-2 break-words">
                    {title}
                  </h3>
                  {description && (
                    <p className="text-[13px] text-ink-muted leading-relaxed line-clamp-2 mt-1">{description}</p>
                  )}
                </div>
                <FiChevronRight className="text-ink-faint flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" size={18} />
              </button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default EmployeeAnnouncements;
