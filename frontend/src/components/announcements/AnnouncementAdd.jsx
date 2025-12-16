import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Autocomplete,
  Chip,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { motion } from "framer-motion";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";

const MotionBox = motion.create(Box);
const MotionTypography = motion.create(Typography);

const AnnouncementAdd = () => {
  const canonical = useMemo(() => `${window.location.origin}/admin-dashboard/announcements/add`, []);
  useMeta({
    title: "Add Announcement — Speshway HRMS",
    description: "Publish a new company announcement.",
    keywords: "add announcement, HRMS",
    url: canonical,
    image: "/images/Logo.jpg",
    robots: "noindex,nofollow",
    type: "article"
  });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [scope, setScope] = useState('all'); // 'all' or 'specific'
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
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
      formData.append("scope", scope);
      if (scope === 'specific' && selectedRecipients.length > 0) {
        // send recipients as a JSON string (backend will parse)
        formData.append('recipients', JSON.stringify(selectedRecipients));
      }
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
      alert(
        error.response?.data?.error ||
          "Something went wrong while adding announcement"
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees for recipient selection
  React.useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE}/api/employee`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data && res.data.employees) {
          setEmployees(res.data.employees);
        } else if (Array.isArray(res.data)) {
          setEmployees(res.data);
        }
      } catch (err) {
        // Failed to fetch employees, continue with empty list
      }
    };
    fetchEmployees();
  }, []);

  // Fetch departments and build recipient options
  React.useEffect(() => {
    const fetchDepsAndBuildOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const depRes = await axios.get(`${API_BASE}/api/department`, { headers: { Authorization: `Bearer ${token}` } });
        const deps = Array.isArray(depRes.data) ? depRes.data : depRes.data?.departments || [];
        setDepartments(deps);

        // Build recipient options when employees are available
        if (employees && employees.length) {
          const opts = employees.map((emp) => ({
            label: emp.userId ? emp.userId.name : emp.employeeId,
            userId: emp.userId ? emp.userId._id : emp._id,
            department: emp.department,
            employeeId: emp.employeeId,
            email: emp.userId?.email || '',
          }));
          setRecipientOptions(opts);
        }
      } catch (err) {
        // Failed to fetch departments, continue with current options
      }
    };
    fetchDepsAndBuildOptions();
  }, [employees]);

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
              rows={4}
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

            <div style={{ marginTop: 12, marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Send To</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="radio" name="scope" value="all" checked={scope==='all'} onChange={() => setScope('all')} />
                  <span>All Employees</span>
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="radio" name="scope" value="specific" checked={scope==='specific'} onChange={() => setScope('specific')} />
                  <span>Specific Employees</span>
                </label>
              </div>

              {scope === 'specific' && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel id="dep-select-label">Department</InputLabel>
                      <Select
                        labelId="dep-select-label"
                        value={selectedDepartment}
                        label="Department"
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                      >
                        <MenuItem value={'all'}>All Departments</MenuItem>
                        {departments.map((d) => (
                          <MenuItem key={d._id} value={d._id}>{d.dep_name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <div style={{ flex: 1 }} />
                  </div>

                  <Autocomplete
                    multiple
                    options={recipientOptions.filter((opt) => selectedDepartment === 'all' || (opt.department?._id || opt.department) === selectedDepartment)}
                    getOptionLabel={(option) => option.label}
                    groupBy={(option) => {
                      // try to resolve department name from departments array
                      const dep = departments.find((d) => d._id === (option.department?._id || option.department));
                      return dep ? dep.dep_name : 'Other';
                    }}
                    value={recipientOptions.filter((opt) => selectedRecipients.includes(opt.userId))}
                    onChange={(e, value) => {
                      setSelectedRecipients(value.map((v) => v.userId));
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          key={option.userId}
                          label={option.label}
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                    renderOption={(props, option) => (
                      <li {...props} key={option.userId}>
                        <Avatar sx={{ mr: 1, width: 30, height: 30 }}>{option.label?.charAt(0)}</Avatar>
                        <div>
                          <div style={{ fontWeight: 600 }}>{option.label}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>{option.email || option.employeeId || ''}</div>
                        </div>
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select employees (search by name or email)"
                        placeholder="Type to search..."
                      />
                    )}
                    disableCloseOnSelect
                    sx={{ width: '100%' }}
                  />
                </div>
              )}
            </div>

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
                  alt={title ? `Preview: ${title}` : 'Announcement image preview'}
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
