import React, { useEffect, useState, useMemo } from "react";
import { Box, Button, TextField, FormControl, InputLabel, Select, MenuItem, Typography, Chip, Checkbox, Avatar } from "@mui/material";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";
import { ANNOUNCEMENT_CATEGORIES } from "./AnnouncementAdd";

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
  const [category, setCategory] = useState("important");
  const [scope, setScope] = useState("all");
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [initialRecipientsLoaded, setInitialRecipientsLoaded] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/team`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.teams) {
          setTeams(res.data.teams);
        }
      } catch (err) {
        // Continue if teams fail to fetch
      }
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/employee`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.employees) {
          setEmployees(res.data.employees);
        } else if (Array.isArray(res.data)) {
          setEmployees(res.data);
        }
      } catch (err) {
        // Continue if employees fail to fetch
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchDeps = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const depRes = await axios.get(`${API_BASE}/api/department`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const deps = Array.isArray(depRes.data) ? depRes.data : depRes.data?.departments || [];
        setDepartments(deps);
      } catch (err) {
        // Continue if departments fail to fetch
      }
    };
    fetchDeps();
  }, []);

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
          if (a.category) setCategory(a.category);
          setScope(a.scope || "all");
          if (a.targetTeam) {
            setSelectedTeam(a.targetTeam._id || a.targetTeam);
          }
          if (a.recipients && a.recipients.length > 0) {
            setSelectedRecipients(a.recipients.map((r) => r._id || r));
            setInitialRecipientsLoaded(true);
          }
          const rawImg = a.imageUrl || a.image;
          if (rawImg) {
            if (rawImg.startsWith('http://') || rawImg.startsWith('https://') || rawImg.startsWith('blob:') || rawImg.startsWith('data:')) {
              setPreview(rawImg);
            } else {
              setPreview(`${API_BASE}/${rawImg.replace(/^\//, '')}`);
            }
          }
        }
      } catch (error) {
        alert("Failed to load announcement");
      }
    };
    fetchAnnouncement();
  }, [id]);

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
        const tLeadId = t.leadId?._id || t.leadId;
        if (tLeadId) leadUserIds.add(tLeadId.toString());
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

  // Synchronize initial recipients if not already set from announcement
  useEffect(() => {
    if (!initialRecipientsLoaded && candidateEmployees.length > 0) {
      setSelectedRecipients(candidateEmployees.map((c) => c.userId));
    }
  }, [candidateEmployees, initialRecipientsLoaded]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (scope === 'team' && !selectedTeam) {
      alert("Please select a team");
      return;
    }

    if (selectedRecipients.length === 0) {
      alert("Please select at least one employee recipient with the check mark");
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("scope", scope);
      if (scope === 'team') {
        formData.append("targetTeam", selectedTeam);
      }
      formData.append("recipients", JSON.stringify(selectedRecipients));
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

          <div style={{ marginTop: 14, marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#1e3a5f' }}>Send To</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 12 }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="scope" value="all" checked={scope==='all'} onChange={() => { setScope('all'); setInitialRecipientsLoaded(false); }} />
                <span>All Employees</span>
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="scope" value="team_leads" checked={scope==='team_leads'} onChange={() => { setScope('team_leads'); setInitialRecipientsLoaded(false); }} />
                <span>Team Leads</span>
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="scope" value="team_members" checked={scope==='team_members'} onChange={() => { setScope('team_members'); setInitialRecipientsLoaded(false); }} />
                <span>Team Members</span>
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="scope" value="team" checked={scope==='team'} onChange={() => { setScope('team'); setInitialRecipientsLoaded(false); }} />
                <span>Specific Team</span>
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="scope" value="specific" checked={scope==='specific'} onChange={() => { setScope('specific'); setInitialRecipientsLoaded(false); }} />
                <span>Specific Employees</span>
              </label>
            </div>

            {/* If Specific Team is selected, render Team dropdown */}
            {scope === 'team' && (
              <Box sx={{ mt: 1.5, mb: 1.5, p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <FormControl fullWidth size="small" required>
                  <InputLabel id="team-select-label-edit">Select Team</InputLabel>
                  <Select
                    labelId="team-select-label-edit"
                    value={selectedTeam}
                    label="Select Team"
                    onChange={(e) => {
                      setSelectedTeam(e.target.value);
                      setInitialRecipientsLoaded(false);
                    }}
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
                  <InputLabel id="dep-select-label-edit">Filter by Department</InputLabel>
                  <Select
                    labelId="dep-select-label-edit"
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
              <div style={{ position: "relative", display: "inline-block" }}>
                <img
                  src={preview}
                  alt={title ? `Preview: ${title}` : 'Announcement image preview'}
                  style={{
                    width: "100%",
                    maxWidth: "240px",
                    maxHeight: "150px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                />
              </div>
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
