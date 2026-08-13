// frontend/src/pages/EmployeeAnnouncementDetails.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Box, Typography, Card, CardContent, CardMedia } from "@mui/material";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { formatISTDate } from "../../utils/dateTimeUtils";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";

const EmployeeAnnouncementDetails = () => {
  const { id } = useParams();
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

  return (
    <Box maxWidth={800} mx="auto" mt={5} p={{ xs: 2, sm: 3 }}>
      <Card sx={{ borderRadius: 3, boxShadow: "0 1px 2px rgba(28,35,51,0.06), 0 4px 12px rgba(28,35,51,0.06)", border: "1px solid #eef0f6" }}>
        {announcement.imageUrl && (
          <CardMedia
            component="img"
            image={announcement.imageUrl}
            alt={announcement.title}
            sx={{ maxHeight: 300, objectFit: "contain" }}
          />
        )}
        <CardContent>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: "#1c2333" }}>{announcement.title}</Typography>
          <Typography variant="body2" sx={{ color: "#5b6376" }}>
            {announcement.createdBy?.name} • {formatISTDate(new Date(announcement.createdAt))}
          </Typography>
          <Typography sx={{ mt: 2, whiteSpace: "pre-wrap", color: "#1c2333" }}>
            {announcement.description}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EmployeeAnnouncementDetails;
