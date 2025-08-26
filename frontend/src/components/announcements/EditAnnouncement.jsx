import React, { useEffect, useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";

const EditAnnouncement = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const token = localStorage.getItem("token");
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
        console.error("Failed to load announcement:", error);
      }
    };
    fetchAnnouncement();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      if (image) formData.append("image", image);

      await axios.put(`${API_BASE}/api/announcement/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate("/admin-dashboard/announcements");
    } catch (error) {
      console.error("Failed to update announcement:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-6 flex items-center justify-center"
    >
      <Box
        p={{ xs: 2, sm: 3, md: 4 }}
        maxWidth={{ xs: '95%', sm: 500, md: 600 }}
        mx="auto"
        bgcolor="white"
        borderRadius={3}
        boxShadow={6}
      >
        <motion.h2
          className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-4 sm:mb-6 bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent px-2"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 120 }}
        >
          Edit Announcement
        </motion.h2>

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
            rows={{ xs: 3, sm: 4 }}
            required
            sx={{
              mb: { xs: 2, sm: 2.5 },
              '& .MuiInputBase-root': {
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }
            }}
          />

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="contained"
              component="label"
              sx={{ 
                mt: { xs: 1.5, sm: 2 }, 
                mb: { xs: 1.5, sm: 2 },
                background: "linear-gradient(to right, #2563eb, #06b6d4)",
                fontSize: { xs: '0.85rem', sm: '0.9rem' },
                py: { xs: 1, sm: 1.25 },
                px: { xs: 2, sm: 3 }
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
          </motion.div>

          {preview && (
            <motion.div
              mt={2}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{ 
                marginTop: "16px", 
                textAlign: "center",
                marginBottom: "16px"
              }}
            >
              <img
                src={preview}
                alt="Preview"
                style={{
                  width: "100%",
                  maxWidth: "200px",
                  height: "120px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
              />
            </motion.div>
          )}

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{
                mt: { xs: 3, sm: 4 },
                height: { xs: 42, sm: 45 },
                fontWeight: "bold",
                background: "linear-gradient(to right, #0d9488, #14b8a6)",
                fontSize: { xs: '0.9rem', sm: '1rem' },
                py: { xs: 1.25, sm: 1.5 }
              }}
            >
              Update Announcement
            </Button>
          </motion.div>
        </form>
      </Box>
    </motion.div>
  );
};

export default EditAnnouncement;
