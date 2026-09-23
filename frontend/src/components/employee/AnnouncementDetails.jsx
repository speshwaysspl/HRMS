// frontend/src/pages/EmployeeAnnouncementDetails.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { FiArrowLeft } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";
import { formatISTDate } from "../../utils/dateTimeUtils";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";

const CATEGORY_STYLE = {
  important: { label: "Important", className: "text-brand-600" },
  festival: { label: "Festival", className: "text-accent-600" },
  event: { label: "Event", className: "text-accent-600" },
  achievement: { label: "Achievement", className: "text-accent-600" },
  quote: { label: "Daily Quote", className: "text-ink-faint" },
};
const categoryStyle = (category) => CATEGORY_STYLE[category] || { label: "Announcement", className: "text-ink-faint" };

const EmployeeAnnouncementDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canonical = useMemo(() => `${window.location.origin}/employee-dashboard/announcements/${id}`, [id]);
  useMeta({
    title: announcement?.title ? `${announcement.title} — Announcement` : 'Announcement — Speshway HRMS',
    description: announcement?.description || 'View announcement details.',
    keywords: 'announcement, employee, HRMS',
    image: announcement?.imageUrl || '/images/Logo.jpg',
    url: canonical,
    robots: 'noindex,nofollow',
    type: 'article'
  });

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        setLoading(true);
        const token = sessionStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/announcement/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          setAnnouncement(res.data.announcement);
        } else {
          setError("Failed to load announcement.");
        }
      } catch (err) {
        setError("Failed to load announcement.");
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncement();
  }, [id]);

  if (loading) return <LoadingState message="Loading announcement..." />;
  if (error) return <ErrorState title="Failed to load announcement" message={error} />;
  if (!announcement) return null;

  const { label, className } = categoryStyle(announcement.category);

  return (
    <div className="min-h-screen bg-surface-muted p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Mobile already has a back arrow in the sticky page bar (Navbar's
            MobilePageBar) — this one is desktop-only to avoid a duplicate. */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink mb-4 transition-colors"
        >
          <FiArrowLeft size={16} /> Back
        </button>
        <div className="rounded-2xl border border-surface-subtle bg-surface p-5 md:p-8">
          {announcement.imageUrl && (
            <img
              src={announcement.imageUrl}
              alt={announcement.title}
              className="w-full max-h-80 object-cover rounded-xl mb-6"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          )}
          <span className={`text-[11px] font-bold uppercase tracking-wide ${className}`}>{label}</span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-ink leading-tight mt-1.5">{announcement.title}</h1>
          <p className="text-sm text-ink-faint font-medium mt-2">
            {[announcement.createdBy?.name, formatISTDate(new Date(announcement.createdAt))].filter(Boolean).join(" • ")}
          </p>
          <hr className="border-surface-subtle my-5" />
          <p className="text-[15px] text-ink leading-[1.75] whitespace-pre-wrap">
            {announcement.description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAnnouncementDetails;
