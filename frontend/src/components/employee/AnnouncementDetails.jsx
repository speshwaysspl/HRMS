// frontend/src/pages/EmployeeAnnouncementDetails.jsx
import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress, Card, CardContent, CardMedia } from "@mui/material";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { formatISTDate } from "../../utils/dateTimeUtils";

const EmployeeAnnouncementDetails = () => {
  const { id } = useParams();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
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

  if (loading) return <Box textAlign="center" mt={4}><CircularProgress /></Box>;
  if (error) return <Typography color="error" align="center" mt={2}>{error}</Typography>;
  if (!announcement) return null;

  return (
    <Box maxWidth={800} mx="auto" mt={5} p={3}>
      <Card>
        {announcement.imageUrl && (
          <CardMedia
            component="img"
            image={announcement.imageUrl}
            alt={announcement.title}
            sx={{ maxHeight: 300, objectFit: "contain" }}
          />
        )}
        <CardContent>
          <Typography variant="h4" gutterBottom>{announcement.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {announcement.createdBy?.name} • {formatISTDate(new Date(announcement.createdAt))}
          </Typography>
          <Typography sx={{ mt: 2, whiteSpace: "pre-wrap" }}>
            {announcement.description}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EmployeeAnnouncementDetails;
