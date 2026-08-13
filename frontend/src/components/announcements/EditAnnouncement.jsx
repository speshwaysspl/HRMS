import React, { useEffect, useState, useMemo } from "react";
import { Box, Button, TextField } from "@mui/material";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";

const EditAnnouncement = () => {
  const { id } = useParams();
  const canonical = useMemo(() => `${window.location.origin}/admin-dashboard/announcements/edit/${id}`, [id]);
  useMeta({
    title: "Edit Announcement — Speshway HRMS",
    description: "Update an existing company announcement.",
    keywords: "edit announcement, HRMS",
    url: canonical,
    image: "/images/Logo.jpg",
    robots: "noindex,nofollow",
    type: "article"
  });
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/announcement/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          const a = res.data.announcement;
          setTitle(a.title);
          setDescription(a.description);
          if (a.image) setPreview(`${API_BASE}/${a.image}`);
        }
      } catch (error) {
        alert("Failed to load announcement");
      }
    };
    fetchAnnouncement();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem("token");
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      if (image) formData.append("image", image);

      await axios.put(`${API_BASE}/api/announcement/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate("/admin-dashboard/announcements");
    } catch (error) {
      alert("Failed to update announcement");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-surface-muted p-3 sm:p-6 flex items-center justify-center"
    >
      <Box
        p={{ xs: 2, sm: 3, md: 4 }}
        maxWidth={{ xs: '95%', sm: 500, md: 600 }}
        mx="auto"
        bgcolor="white"
        borderRadius={3}
        border="1px solid #eef0f6"
        boxShadow="0 4px 16px rgba(28,35,51,0.08)"
      >
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center mb-4 sm:mb-6 text-brand-800 px-2">
          Edit Announcement
        </h2>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            required
            sx={{
              mb: { xs: 2, sm: 2.5 },
              '& .MuiInputBase-root': {
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }
            }}
          />
          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            multiline
            rows={4}
            required
            sx={{
              mb: { xs: 2, sm: 2.5 },
              '& .MuiInputBase-root': {
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }
            }}
          />

          <Button
            variant="outlined"
            component="label"
            sx={{
              mt: { xs: 1.5, sm: 2 },
              mb: { xs: 1.5, sm: 2 },
              color: "#1c2333",
              borderColor: "#eef0f6",
              "&:hover": { borderColor: "#16a34a", bgcolor: "#f6f7fb" },
              fontSize: { xs: '0.85rem', sm: '0.9rem' },
              py: { xs: 1, sm: 1.25 },
              px: { xs: 2, sm: 3 },
              textTransform: 'none',
            }}
          >
            Upload New Image
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => {
                setImage(e.target.files[0]);
                setPreview(URL.createObjectURL(e.target.files[0]));
              }}
            />
          </Button>

          {preview && (
            <div style={{ marginTop: "16px", textAlign: "center", marginBottom: "16px" }}>
              <img
                src={preview}
                alt={title ? `Preview: ${title}` : 'Announcement image preview'}
                style={{
                  width: "100%",
                  maxWidth: "200px",
                  height: "120px",
                  objectFit: "cover",
                  borderRadius: "8px",
                }}
              />
            </div>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              mt: { xs: 3, sm: 4 },
              height: { xs: 42, sm: 45 },
              fontWeight: 600,
              bgcolor: "#16a34a",
              "&:hover": { bgcolor: "#15803d" },
              boxShadow: 'none',
              textTransform: 'none',
              fontSize: { xs: '0.9rem', sm: '1rem' },
              py: { xs: 1.25, sm: 1.5 }
            }}
          >
            Update Announcement
          </Button>
        </form>
      </Box>
    </motion.div>
  );
};

export default EditAnnouncement;
