import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBullhorn,
  FaQuoteLeft,
  FaGift,
  FaCalendarAlt,
  FaTrophy,
  FaThumbtack,
  FaImage,
  FaPaperPlane,
  FaClock,
} from "react-icons/fa";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";

// Drawn icons for the type picker (the emoji stay in the email subject, which is what recipients see).
export const CATEGORY_ICONS = {
  important: FaBullhorn,
  quote: FaQuoteLeft,
  festival: FaGift,
  event: FaCalendarAlt,
  achievement: FaTrophy,
  general: FaThumbtack,
};

const SCOPES = [
  { id: "all", label: "All employees" },
  { id: "team_leads", label: "Team leads" },
  { id: "team_members", label: "Team members" },
  { id: "team", label: "A specific team" },
  { id: "specific", label: "Specific people" },
];

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
  // Optional schedule: "now" or a local date-time (datetime-local value, browser time zone).
  const [sendMode, setSendMode] = useState("now");
  const [scheduleAt, setScheduleAt] = useState("");
  const navigate = useNavigate();

  const imagePreview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  React.useEffect(() => () => imagePreview && URL.revokeObjectURL(imagePreview), [imagePreview]);

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

    let scheduledIso = null;
    if (sendMode === "schedule") {
      const when = scheduleAt ? new Date(scheduleAt) : null;
      if (!when || isNaN(when.getTime())) {
        alert("Please pick a date and time to schedule this announcement");
        return;
      }
      if (when.getTime() <= Date.now()) {
        alert("Scheduled time must be in the future");
        return;
      }
      scheduledIso = when.toISOString();
    }

    try {
      setLoading(true);

      const formData = new FormData();
      if (scheduledIso) formData.append("scheduledAt", scheduledIso);
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
        alert(
          scheduledIso
            ? `Announcement scheduled for ${new Date(scheduledIso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
            : "Announcement added successfully"
        );
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

  const currentCat = ANNOUNCEMENT_CATEGORIES.find((c) => c.id === category) || ANNOUNCEMENT_CATEGORIES[0];
  const emailSubject = `${currentCat.emoji} ${currentCat.prefix}: ${title.trim() || "[Title]"} - SPESHWAY SOLUTIONS`;
  const q = recipientSearch.trim().toLowerCase();
  const shownRecipients = candidateEmployees.filter(
    (emp) => !q || emp.name?.toLowerCase().includes(q) || emp.email?.toLowerCase().includes(q)
  );
  const allChecked = candidateEmployees.length > 0 && selectedRecipients.length === candidateEmployees.length;
  const someChecked = selectedRecipients.length > 0 && !allChecked;
  const scheduleLabel =
    sendMode === "schedule" && scheduleAt
      ? new Date(scheduleAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
      : null;
  const minSchedule = (() => {
    const d = new Date(Date.now() + 60000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  })();
  const submitLabel = loading
    ? sendMode === "schedule" ? "Scheduling..." : "Publishing..."
    : sendMode === "schedule" ? "Schedule announcement" : "Publish now";

  const inputCls =
    "w-full rounded-lg border border-surface-subtle bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent-500 focus:ring-2 focus:ring-accent-500/30 outline-none disabled:opacity-60";
  const labelCls = "block text-sm font-medium text-ink mb-1.5";
  const sectionCls = "bg-white rounded-xl shadow-card border border-surface-subtle p-4 sm:p-6";

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-5 sm:px-6 sm:py-8 pb-28 lg:pb-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => navigate("/admin-dashboard/announcements")}
              className="mb-2 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
            >
              <FaArrowLeft className="text-xs" /> Announcements
            </button>
            <h1 className="text-2xl sm:text-3xl font-semibold text-brand-800 tracking-tight">New announcement</h1>
            <p className="mt-1 text-sm text-ink-muted">Write it, choose who receives it, then send now or schedule it.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} encType="multipart/form-data" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="flex flex-col gap-5 min-w-0">
            {/* 1. Message */}
            <section className={sectionCls} aria-labelledby="sec-message">
              <h2 id="sec-message" className="text-lg font-semibold text-ink">Message</h2>

              <fieldset className="mt-4">
                <legend className={labelCls}>Type</legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ANNOUNCEMENT_CATEGORIES.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.id] || FaBullhorn;
                    const selected = category === cat.id;
                    return (
                      <label
                        key={cat.id}
                        className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-accent-500 ${
                          selected ? "font-medium" : "border-surface-subtle text-ink-muted hover:border-slate-300 hover:text-ink"
                        }`}
                        style={selected ? { borderColor: cat.color, backgroundColor: cat.bg, color: cat.color } : undefined}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={cat.id}
                          checked={selected}
                          onChange={() => setCategory(cat.id)}
                          className="sr-only"
                        />
                        <Icon className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{cat.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-5">
                <label htmlFor="ann-title" className={labelCls}>Title <span className="text-red-600">*</span></label>
                <input
                  id="ann-title"
                  type="text"
                  required
                  maxLength={150}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={loading}
                  placeholder="e.g. Office closed on Friday for Diwali"
                  className={inputCls}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="ann-body" className={labelCls}>Message <span className="text-red-600">*</span></label>
                <textarea
                  id="ann-body"
                  required
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  placeholder="What do people need to know?"
                  className={`${inputCls} resize-y leading-relaxed`}
                />
              </div>

              <div className="mt-4">
                <span className={labelCls}>Image <span className="font-normal text-ink-muted">(optional)</span></span>
                {image ? (
                  <div className="flex items-center gap-3 rounded-lg border border-surface-subtle p-2">
                    <img src={imagePreview} alt="Selected announcement image" className="h-16 w-24 rounded-md object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{image.name}</p>
                      <p className="text-xs text-ink-muted">{(image.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      disabled={loading}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex min-h-[72px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-4 text-sm text-ink-muted hover:border-accent-500 hover:text-ink focus-within:ring-2 focus-within:ring-accent-500">
                    <FaImage aria-hidden="true" />
                    <span>Choose an image to attach</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={loading}
                      onChange={(e) => e.target.files?.[0] && setImage(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            </section>

            {/* 2. Audience */}
            <section className={sectionCls} aria-labelledby="sec-audience">
              <h2 id="sec-audience" className="text-lg font-semibold text-ink">Audience</h2>

              <fieldset className="mt-4">
                <legend className="sr-only">Send to</legend>
                <div className="flex flex-wrap gap-2">
                  {SCOPES.map((s) => {
                    const selected = scope === s.id;
                    return (
                      <label
                        key={s.id}
                        className={`inline-flex min-h-[40px] cursor-pointer items-center rounded-full border px-4 text-sm transition-colors focus-within:ring-2 focus-within:ring-accent-500 ${
                          selected
                            ? "border-accent-600 bg-accent-600 text-white font-medium"
                            : "border-surface-subtle bg-white text-ink hover:bg-surface-muted"
                        }`}
                      >
                        <input
                          type="radio"
                          name="scope"
                          value={s.id}
                          checked={selected}
                          onChange={() => { setScope(s.id); setRecipientSearch(""); }}
                          className="sr-only"
                        />
                        {s.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {scope === "team" && (
                <div className="mt-4">
                  <label htmlFor="ann-team" className={labelCls}>Team</label>
                  <select id="ann-team" value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className={inputCls}>
                    {teams.length === 0 && <option value="">No teams found</option>}
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}{t.leadId?.name ? ` · Lead: ${t.leadId.name}` : ""} · {t.members?.length || 0} members
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {scope === "specific" && (
                <div className="mt-4">
                  <label htmlFor="ann-dep" className={labelCls}>Department</label>
                  <select id="ann-dep" value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className={`${inputCls} sm:max-w-xs`}>
                    <option value="all">All departments</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.dep_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-4 rounded-lg border border-surface-subtle">
                <div className="flex flex-wrap items-center gap-3 border-b border-surface-subtle px-3 py-2.5">
                  <label className="flex min-h-[36px] cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = someChecked; }}
                      onChange={handleToggleSelectAll}
                      disabled={candidateEmployees.length === 0}
                      className="h-4 w-4 rounded text-accent-600 focus:ring-accent-500"
                    />
                    Select all
                  </label>
                  <span className="text-sm text-ink-muted tabular-nums">
                    {selectedRecipients.length} of {candidateEmployees.length} selected
                  </span>
                  {candidateEmployees.length > 5 && (
                    <input
                      type="search"
                      aria-label="Search recipients"
                      placeholder="Search name or email"
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      className="ml-auto w-full sm:w-56 rounded-lg border border-surface-subtle px-3 py-1.5 text-sm text-ink focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 outline-none"
                    />
                  )}
                </div>

                <ul className="max-h-80 overflow-y-auto divide-y divide-surface-subtle [scrollbar-width:thin]">
                  {candidateEmployees.length === 0 ? (
                    <li className="px-4 py-8 text-center text-sm text-ink-muted">
                      {employees.length === 0 ? "Loading employees..." : "Nobody matches this audience."}
                    </li>
                  ) : shownRecipients.length === 0 ? (
                    <li className="px-4 py-8 text-center text-sm text-ink-muted">No one matches "{recipientSearch}".</li>
                  ) : (
                    shownRecipients.map((emp) => {
                      const checked = selectedRecipients.includes(emp.userId);
                      return (
                        <li key={emp.userId}>
                          <label className={`flex min-h-[52px] cursor-pointer items-center gap-3 px-3 py-2 transition-colors ${checked ? "" : "bg-surface-muted/60"} hover:bg-surface-muted`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleRecipient(emp.userId)}
                              className="h-4 w-4 rounded text-accent-600 focus:ring-accent-500"
                            />
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${checked ? "bg-accent-100 text-accent-800" : "bg-slate-200 text-slate-600"}`}>
                              {emp.name?.charAt(0)?.toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-sm font-medium ${checked ? "text-ink" : "text-ink-muted"}`}>{emp.name}</span>
                              <span className="block truncate text-xs text-ink-muted">{emp.email || emp.designation}</span>
                            </span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${emp.roleBadge === "Team Lead" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                              {emp.roleBadge}
                            </span>
                          </label>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </section>

            {/* 3. Timing */}
            <section className={sectionCls} aria-labelledby="sec-when">
              <h2 id="sec-when" className="text-lg font-semibold text-ink">When to send</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  { id: "now", label: "Send now", hint: "Notifications and emails go out immediately.", Icon: FaPaperPlane },
                  { id: "schedule", label: "Schedule for later", hint: "Hidden from employees until the time you pick.", Icon: FaClock },
                ].map(({ id, label, hint, Icon }) => {
                  const selected = sendMode === id;
                  return (
                    <label
                      key={id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-accent-500 ${
                        selected ? "border-accent-600 bg-accent-50" : "border-surface-subtle hover:bg-surface-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sendMode"
                        value={id}
                        checked={selected}
                        onChange={() => setSendMode(id)}
                        disabled={loading}
                        className="mt-1 h-4 w-4 text-accent-600 focus:ring-accent-500"
                      />
                      <span>
                        <span className="flex items-center gap-2 text-sm font-medium text-ink">
                          <Icon className={selected ? "text-accent-700" : "text-ink-muted"} aria-hidden="true" /> {label}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {sendMode === "schedule" && (
                <div className="mt-4">
                  <label htmlFor="ann-schedule" className={labelCls}>Date and time</label>
                  <input
                    id="ann-schedule"
                    type="datetime-local"
                    value={scheduleAt}
                    min={minSchedule}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    disabled={loading}
                    required
                    className={`${inputCls} sm:max-w-xs`}
                  />
                </div>
              )}
            </section>
          </div>

          {/* Summary + publish (sticky on desktop) */}
          <aside className="lg:sticky lg:top-6" aria-labelledby="sec-summary">
            <div className={sectionCls}>
              <h2 id="sec-summary" className="text-lg font-semibold text-ink">Summary</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-ink-muted">Email subject</dt>
                  <dd className="mt-0.5 break-words font-medium text-ink">{emailSubject}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Recipients</dt>
                  <dd className="font-medium text-ink tabular-nums">{selectedRecipients.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Audience</dt>
                  <dd className="font-medium text-ink text-right">{SCOPES.find((s) => s.id === scope)?.label}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Sends</dt>
                  <dd className={`font-medium text-right ${sendMode === "schedule" ? "text-amber-700" : "text-ink"}`}>
                    {sendMode === "schedule" ? scheduleLabel || "Pick a time" : "Immediately"}
                  </dd>
                </div>
              </dl>
              <button
                type="submit"
                disabled={loading || selectedRecipients.length === 0}
                className="mt-5 hidden lg:flex w-full items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-500 outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {sendMode === "schedule" ? <FaClock aria-hidden="true" /> : <FaPaperPlane aria-hidden="true" />}
                {submitLabel}
              </button>
              {selectedRecipients.length === 0 && (
                <p className="mt-2 text-xs text-red-700">Select at least one recipient.</p>
              )}
            </div>
          </aside>

          {/* Mobile publish bar */}
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-20 border-t border-surface-subtle bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)]">
            <div className="mx-auto flex max-w-6xl items-center gap-3">
              <p className="min-w-0 flex-1 truncate text-xs text-ink-muted">
                <span className="font-medium text-ink tabular-nums">{selectedRecipients.length}</span> recipients ·{" "}
                {sendMode === "schedule" ? scheduleLabel || "pick a time" : "sends now"}
              </p>
              <button
                type="submit"
                disabled={loading || selectedRecipients.length === 0}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent-600 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-50"
              >
                {sendMode === "schedule" ? <FaClock aria-hidden="true" /> : <FaPaperPlane aria-hidden="true" />}
                {submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnnouncementAdd;
