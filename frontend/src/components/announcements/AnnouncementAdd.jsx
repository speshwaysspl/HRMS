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
  Checkbox,
} from "@mui/material";
import { motion } from "framer-motion";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";

const MotionBox = motion.create(Box);
const MotionTypography = motion.create(Typography);

export const ANNOUNCEMENT_CATEGORIES = [
  { id: "important", label: "Important Announcement", emoji: "📢", prefix: "Important Announcement", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  { id: "quote", label: "Today's Quote", emoji: "✨", prefix: "Today's Quote", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  { id: "festival", label: "Festival Greeting", emoji: "🎉", prefix: "Festival Greeting", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { id: "event", label: "Event & Activity", emoji: "📅", prefix: "Event Update", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  { id: "achievement", label: "Achievement", emoji: "🏆", prefix: "Milestone & Achievement", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  { id: "general", label: "Company Notice", emoji: "📌", prefix: "Company Notice", color: "#475569", bg: "#f8fafc", border: "#e2e8f0" },
];

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
  const [category, setCategory] = useState("important");
  const [image, setImage] = useState(null);
  const [scope, setScope] = useState('all'); // 'all', 'team_leads', 'team_members', 'team', 'specific'
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [recipientSearch, setRecipientSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert("Please fill all required fields");
      return;
    }

    if (scope === 'team' && !selectedTeam) {
      alert("Please select a team");
      return;
    }

    if (selectedRecipients.length === 0) {
      alert("Please select at least one employee recipient with the check mark");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      formData.append("scope", scope);
      if (scope === 'team') {
        formData.append('targetTeam', selectedTeam);
      }
      formData.append('recipients', JSON.stringify(selectedRecipients));
      if (image) formData.append("image", image);

      const token = sessionStorage.getItem("token");
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
        const token = sessionStorage.getItem('token');
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

  // Fetch teams for team-based announcements
  React.useEffect(() => {
    const fetchTeams = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const res = await axios.get(`${API_BASE}/api/team`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data && res.data.teams) {
          setTeams(res.data.teams);
          // Set first team as default if scope is team
          if (res.data.teams.length > 0 && !selectedTeam) {
            setSelectedTeam(res.data.teams[0]._id);
          }
        }
      } catch (err) {
        // Failed to fetch teams
      }
    };
    fetchTeams();
  }, []);

  // Fetch departments
  React.useEffect(() => {
    const fetchDeps = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const depRes = await axios.get(`${API_BASE}/api/department`, { headers: { Authorization: `Bearer ${token}` } });
        const deps = Array.isArray(depRes.data) ? depRes.data : depRes.data?.departments || [];
        setDepartments(deps);
      } catch (err) {
        // Failed to fetch departments
      }
    };
    fetchDeps();
  }, []);

  // Compute candidate employees based on current Send To selection
  const candidateEmployees = useMemo(() => {
    if (!employees || !employees.length) return [];

    if (scope === 'all') {
      return employees.map((emp) => ({
        userId: emp.userId ? (emp.userId._id || emp.userId) : emp._id,
        name: emp.userId?.name || emp.employeeId,
        email: emp.userId?.email || '',
        designation: emp.designation || 'Employee',
        roleBadge: 'Employee',
      }));
    }

    if (scope === 'team_leads') {
      const leadUserIds = new Set();
      teams.forEach((t) => {
        const id = t.leadId?._id || t.leadId;
        if (id) leadUserIds.add(id.toString());
      });

      const list = [];
      employees.forEach((emp) => {
        const uId = emp.userId ? (emp.userId._id || emp.userId).toString() : emp._id.toString();
        const roles = Array.isArray(emp.userId?.role) ? emp.userId.role : [emp.userId?.role];
        if (roles.includes('team_lead') || leadUserIds.has(uId)) {
          list.push({
            userId: emp.userId ? (emp.userId._id || emp.userId) : emp._id,
            name: emp.userId?.name || emp.employeeId,
            email: emp.userId?.email || '',
            designation: emp.designation || 'Team Lead',
            roleBadge: 'Team Lead',
          });
        }
      });

      teams.forEach((t) => {
        if (t.leadId && typeof t.leadId === 'object' && t.leadId._id) {
          const idStr = t.leadId._id.toString();
          if (!list.some((item) => item.userId.toString() === idStr)) {
            list.push({
              userId: t.leadId._id,
              name: t.leadId.name,
              email: t.leadId.email || '',
              designation: 'Team Lead',
              roleBadge: 'Team Lead',
            });
          }
        }
      });
      return list;
    }

    if (scope === 'team_members') {
      const teamMemberEmpIds = new Set();
      teams.forEach((t) => {
        (t.members || []).forEach((m) => {
          const empId = m.employeeId?._id || m.employeeId;
          if (empId) teamMemberEmpIds.add(empId.toString());
        });
      });

      return employees
        .filter((emp) => {
          const empIdStr = emp._id?.toString();
          const roles = Array.isArray(emp.userId?.role) ? emp.userId.role : [emp.userId?.role];
          return teamMemberEmpIds.has(empIdStr) || roles.includes('employee');
        })
        .map((emp) => {
          let roleInTeam = 'Member';
          for (const t of teams) {
            const found = (t.members || []).find(
              (m) => (m.employeeId?._id || m.employeeId)?.toString() === emp._id?.toString()
            );
            if (found && found.role) {
              roleInTeam = found.role;
              break;
            }
          }
          return {
            userId: emp.userId ? (emp.userId._id || emp.userId) : emp._id,
            name: emp.userId?.name || emp.employeeId,
            email: emp.userId?.email || '',
            designation: emp.designation || roleInTeam,
            roleBadge: roleInTeam,
          };
        });
    }

    if (scope === 'team') {
      if (!selectedTeam) return [];
      const currentTeam = teams.find((t) => t._id === selectedTeam);
      if (!currentTeam) return [];

      const list = [];
      // 1. Team lead
      if (currentTeam.leadId) {
        const leadObj = currentTeam.leadId;
        const leadUserId = leadObj._id || leadObj;
        const leadEmp = employees.find(
          (e) => (e.userId?._id || e.userId)?.toString() === leadUserId.toString()
        );
        list.push({
          userId: leadUserId,
          name: leadObj.name || leadEmp?.userId?.name || 'Team Lead',
          email: leadObj.email || leadEmp?.userId?.email || '',
          designation: leadEmp?.designation || 'Team Lead',
          roleBadge: 'Team Lead',
        });
      }

      // 2. Team members
      (currentTeam.members || []).forEach((m) => {
        const empMember =
          m.employeeId && typeof m.employeeId === 'object' && m.employeeId.userId
            ? m.employeeId
            : employees.find(
                (e) => e._id?.toString() === (m.employeeId?._id || m.employeeId)?.toString()
              );

        if (empMember) {
          const uId = empMember.userId?._id || empMember.userId;
          if (uId && !list.some((item) => item.userId.toString() === uId.toString())) {
            list.push({
              userId: uId,
              name: empMember.userId?.name || empMember.employeeId,
              email: empMember.userId?.email || '',
              designation: empMember.designation || m.role || 'Developer',
              roleBadge: m.role || 'Member',
            });
          }
        }
      });

      return list;
    }

    if (scope === 'specific') {
      return employees
        .filter(
          (emp) =>
            selectedDepartment === 'all' ||
            (emp.department?._id || emp.department) === selectedDepartment
        )
        .map((emp) => ({
          userId: emp.userId ? (emp.userId._id || emp.userId) : emp._id,
          name: emp.userId?.name || emp.employeeId,
          email: emp.userId?.email || '',
          designation: emp.designation || 'Employee',
          roleBadge: 'Employee',
        }));
    }

    return [];
  }, [scope, employees, teams, selectedTeam, selectedDepartment]);

  // Synchronize selected checkmarks: all candidates checked by default!
  React.useEffect(() => {
    if (candidateEmployees.length > 0) {
      setSelectedRecipients(candidateEmployees.map((c) => c.userId));
    } else {
      setSelectedRecipients([]);
    }
  }, [candidateEmployees]);

  const handleToggleRecipient = (userId) => {
    setSelectedRecipients((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedRecipients.length === candidateEmployees.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(candidateEmployees.map((c) => c.userId));
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
      bgcolor="#f6f7fb"
      px={{ xs: 2, sm: 3 }}
    >
      <Card
        sx={{
          width: { xs: '100%', sm: 500, md: 600 },
          maxWidth: '100%',
          boxShadow: 'none',
          border: '1px solid #eef0f6',
          borderRadius: 3,
          overflow: "hidden",
          background: "#ffffff",
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <MotionTypography
            variant="h5"
            component="h2"
            align="center"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: "#1e3a5f",
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
            {/* Announcement Type / Category */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#1e3a5f', fontSize: '0.875rem' }}>
                Announcement Type
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ANNOUNCEMENT_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 13px',
                        borderRadius: 20,
                        fontSize: '0.825rem',
                        fontWeight: isSelected ? 600 : 500,
                        border: isSelected ? `2px solid ${cat.color}` : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? cat.bg : '#ffffff',
                        color: isSelected ? cat.color : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        outline: 'none',
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Live Subject Preview */}
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.25,
                  bgcolor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '0.8rem',
                  color: '#475569',
                }}
              >
                <span style={{ fontWeight: 600, color: '#1e3a5f', whiteSpace: 'nowrap' }}>Email Subject:</span>
                <span style={{ color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(() => {
                    const currentCat = ANNOUNCEMENT_CATEGORIES.find(c => c.id === category) || ANNOUNCEMENT_CATEGORIES[0];
                    return `${currentCat.emoji} ${currentCat.prefix}: ${title.trim() || '[Title]'} - SPESHWAY SOLUTIONS`;
                  })()}
                </span>
              </Box>
            </div>

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

            <div style={{ marginTop: 14, marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#1e3a5f' }}>Send To</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 12 }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="scope" value="all" checked={scope==='all'} onChange={() => setScope('all')} />
                  <span>All Employees</span>
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="scope" value="team_leads" checked={scope==='team_leads'} onChange={() => setScope('team_leads')} />
                  <span>Team Leads</span>
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="scope" value="team_members" checked={scope==='team_members'} onChange={() => setScope('team_members')} />
                  <span>Team Members</span>
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="scope" value="team" checked={scope==='team'} onChange={() => setScope('team')} />
                  <span>Specific Team</span>
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="scope" value="specific" checked={scope==='specific'} onChange={() => setScope('specific')} />
                  <span>Specific Employees</span>
                </label>
              </div>

              {/* If Specific Team is selected, render Team dropdown first */}
              {scope === 'team' && (
                <Box sx={{ mt: 1.5, mb: 1.5, p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <FormControl fullWidth size="small" required>
                    <InputLabel id="team-select-label">Select Team</InputLabel>
                    <Select
                      labelId="team-select-label"
                      value={selectedTeam}
                      label="Select Team"
                      onChange={(e) => setSelectedTeam(e.target.value)}
                    >
                      {teams.length === 0 ? (
                        <MenuItem value="" disabled>No teams found</MenuItem>
                      ) : (
                        teams.map((t) => (
                          <MenuItem key={t._id} value={t._id}>
                            {t.name} {t.leadId?.name ? `(Lead: ${t.leadId.name} • ${t.members?.length || 0} members)` : `(${t.members?.length || 0} members)`}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Box>
              )}

              {/* If Specific Employees is selected, render Department filter */}
              {scope === 'specific' && (
                <Box sx={{ mt: 1.5, mb: 1.5, display: 'flex', alignItems: 'center' }}>
                  <FormControl size="small" sx={{ minWidth: 200, maxWidth: '100%' }}>
                    <InputLabel id="dep-select-label">Filter by Department</InputLabel>
                    <Select
                      labelId="dep-select-label"
                      value={selectedDepartment}
                      label="Filter by Department"
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                    >
                      <MenuItem value={'all'}>All Departments</MenuItem>
                      {departments.map((d) => (
                        <MenuItem key={d._id} value={d._id}>{d.dep_name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}

              {/* Interactive Employees Checklist for ALL Send To options */}
              <Box
                sx={{
                  mt: 1.5,
                  mb: 1.5,
                  border: '1px solid #e2e8f0',
                  borderRadius: 2.5,
                  bgcolor: '#f8fafc',
                  p: 2,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Checkbox
                      size="small"
                      checked={candidateEmployees.length > 0 && selectedRecipients.length === candidateEmployees.length}
                      indeterminate={selectedRecipients.length > 0 && selectedRecipients.length < candidateEmployees.length}
                      onChange={handleToggleSelectAll}
                      sx={{ p: 0.5, color: '#16a34a', '&.Mui-checked': { color: '#16a34a' } }}
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e3a5f' }}>
                      {scope === 'team' && 'Team Lead & Members'}
                      {scope === 'team_leads' && 'Team Leads'}
                      {scope === 'team_members' && 'Team Members'}
                      {scope === 'all' && 'All Employees'}
                      {scope === 'specific' && 'Select Employees'} ({selectedRecipients.length}/{candidateEmployees.length} selected)
                    </Typography>
                  </Box>

                  <Button
                    size="small"
                    onClick={handleToggleSelectAll}
                    sx={{ textTransform: 'none', fontSize: '0.8rem', color: '#16a34a', p: 0 }}
                  >
                    {selectedRecipients.length === candidateEmployees.length ? 'Unselect All' : 'Select All'}
                  </Button>
                </Box>

                {candidateEmployees.length > 5 && (
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by name or email..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    sx={{
                      mb: 1.5,
                      bgcolor: '#ffffff',
                      borderRadius: 1.5,
                      '& .MuiInputBase-input': { fontSize: '0.85rem', py: 0.75 }
                    }}
                  />
                )}

                <Box
                  sx={{
                    maxHeight: candidateEmployees.length > 5 ? 285 : 'none',
                    overflowY: candidateEmployees.length > 5 ? 'auto' : 'visible',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.75,
                    scrollbarWidth: 'none', // Firefox
                    '&::-webkit-scrollbar': {
                      display: 'none', // Chrome, Safari, Edge
                    },
                    msOverflowStyle: 'none', // IE and Edge
                  }}
                >
                  {candidateEmployees
                    .filter((emp) => {
                      if (!recipientSearch.trim()) return true;
                      const q = recipientSearch.toLowerCase();
                      return emp.name.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q);
                    })
                    .map((emp) => {
                      const isChecked = selectedRecipients.includes(emp.userId);
                      return (
                        <Box
                          key={emp.userId}
                          onClick={() => handleToggleRecipient(emp.userId)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1,
                            borderRadius: 1.5,
                            bgcolor: isChecked ? '#ffffff' : '#f1f5f9',
                            border: isChecked ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease-in-out',
                            '&:hover': {
                              bgcolor: isChecked ? '#f0fdf4' : '#e2e8f0',
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, overflow: 'hidden' }}>
                            <Checkbox
                              size="small"
                              checked={isChecked}
                              onChange={() => handleToggleRecipient(emp.userId)}
                              onClick={(e) => e.stopPropagation()}
                              sx={{ p: 0, color: '#16a34a', '&.Mui-checked': { color: '#16a34a' } }}
                            />
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                fontSize: '0.8rem',
                                bgcolor: isChecked ? '#16a34a' : '#94a3b8',
                                fontWeight: 600,
                              }}
                            >
                              {emp.name?.charAt(0)?.toUpperCase()}
                            </Avatar>
                            <Box sx={{ overflow: 'hidden' }}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', lineHeight: 1.2 }}
                              >
                                {emp.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: '#64748b', fontSize: '0.75rem', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                              >
                                {emp.email || emp.designation}
                              </Typography>
                            </Box>
                          </Box>

                          <Chip
                            size="small"
                            label={emp.roleBadge}
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              bgcolor: emp.roleBadge === 'Team Lead' ? '#fef3c7' : '#e0e7ff',
                              color: emp.roleBadge === 'Team Lead' ? '#92400e' : '#3730a3',
                            }}
                          />
                        </Box>
                      );
                    })}

                  {candidateEmployees.length === 0 && (
                    <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', py: 2 }}>
                      {scope === 'team' ? 'Please select a team from the dropdown above' : 'No employees found'}
                    </Typography>
                  )}
                </Box>
              </Box>
            </div>

            {/* Upload Button */}
            <Button
              variant="outlined"
              component="label"
              fullWidth
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

            {/* Show selected image preview */}
            {image && (
              <div style={{ marginTop: "16px", textAlign: "center", marginBottom: "16px" }}>
                <img
                  src={URL.createObjectURL(image)}
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

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                height: { xs: 42, sm: 45 },
                fontWeight: 600,
                letterSpacing: 0.3,
                bgcolor: "#16a34a",
                "&:hover": { bgcolor: "#15803d" },
                boxShadow: 'none',
                textTransform: 'none',
                fontSize: { xs: '0.9rem', sm: '1rem' },
                py: { xs: 1.25, sm: 1.5 },
              }}
              startIcon={
                loading ? <CircularProgress size={20} color="inherit" /> : null
              }
            >
              {loading ? "Adding..." : "Add Announcement"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </MotionBox>
  );
};

export default AnnouncementAdd;
