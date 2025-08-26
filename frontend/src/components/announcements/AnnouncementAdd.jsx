import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Card,
  CardContent,
} from "@mui/material";
import { motion } from "framer-motion";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";

const MotionBox = motion.create(Box);
const MotionTypography = motion.create(Typography);

const AnnouncementAdd = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      if (image) formData.append("image", image);

      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to add announcements");
        setLoading(false);
        return;
      }

      const response = await axios.post(
        `${API_BASE}/api/announcement`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        alert("Announcement added successfully");
        navigate("/admin-dashboard/announcements");
      } else {
        alert(response.data.error || "Failed to add announcement");
      }
    } catch (error) {
      console.error("Add Announcement Error:", error);
      alert(
        error.response?.data?.error ||
          "Something went wrong while adding announcement"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <MotionBox
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="90vh"
      bgcolor="linear-gradient(to right, #2563eb, #06b6d4)"
      px={{ xs: 2, sm: 3 }}
    >
      <Card
        sx={{
          width: { xs: '100%', sm: 500, md: 600 },
          maxWidth: '100%',
          boxShadow: 6,
          borderRadius: 4,
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #ffffff, #f8fafc, #f1f5f9)",
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <MotionTypography
            variant="h5"
            component="h2"
            align="center"
            gutterBottom
            sx={{
              fontWeight: "bold",
              background: "linear-gradient(to right, #2563eb, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: { xs: 2, sm: 3 },
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            }}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 120 }}
          >
            Add New Announcement
          </MotionTypography>

          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <TextField
              label="Title"
              variant="outlined"
              fullWidth
              required
              margin="normal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              sx={{
                mb: { xs: 2, sm: 2.5 },
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.9rem', sm: '1rem' }
                }
              }}
            />
            <TextField
              label="Description"
              variant="outlined"
              fullWidth
              required
              multiline
              rows={{ xs: 3, sm: 4 }}
              margin="normal"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              sx={{
                mb: { xs: 2, sm: 2.5 },
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.9rem', sm: '1rem' }
                }
              }}
            />

            {/* Upload Button with animation */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="contained"
                component="label"
                fullWidth
                sx={{
                  mt: { xs: 1.5, sm: 2 },
                  mb: { xs: 1.5, sm: 2 },
                  bgcolor: "#2563eb",
                  "&:hover": { bgcolor: "#1d4ed8" },
                  fontSize: { xs: '0.85rem', sm: '0.9rem' },
                  py: { xs: 1, sm: 1.25 },
                  px: { xs: 2, sm: 3 },
                }}
                disabled={loading}
              >
                Upload Image (optional)
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImage(e.target.files[0]);
                    }
                  }}
                  disabled={loading}
                />
              </Button>
            </motion.div>

            {/* Show selected image preview */}
            {image && (
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
                  src={URL.createObjectURL(image)}
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

            {/* Submit Button with loading animation */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={loading}
                sx={{
                  height: { xs: 42, sm: 45 },
                  fontWeight: "bold",
                  letterSpacing: 1,
                  bgcolor: "#0d9488",
                  "&:hover": { bgcolor: "#0f766e" },
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  py: { xs: 1.25, sm: 1.5 },
                }}
                startIcon={
                  loading ? <CircularProgress size={20} color="inherit" /> : null
                }
              >
                {loading ? "Adding..." : "Add Announcement"}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </MotionBox>
  );
};

export default AnnouncementAdd;
