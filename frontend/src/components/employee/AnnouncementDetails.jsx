// frontend/src/pages/EmployeeAnnouncementDetails.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { FiArrowLeft } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";
import AnnouncementCard from "../announcements/AnnouncementCard";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";

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
          // Counts toward the admin's "seen by N" (fire-and-forget).
          axios.post(`${API_BASE}/api/announcement/${id}/seen`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
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

  if (loading) return <LoadingState message="Loading announcement..." variant="detail" />;
  if (error) return <ErrorState title="Failed to load announcement" message={error} />;
  if (!announcement) return null;

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
        <AnnouncementCard a={announcement} variant="full" />
      </div>
    </div>
  );
};

export default EmployeeAnnouncementDetails;
