import React, { useEffect, useState } from "react";
import { useSocketEvent } from "../../context/NotificationContext";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../utils/apiConfig";
import { FaFilePdf, FaEye, FaTasks, FaUser, FaInfoCircle, FaCalendarAlt, FaStickyNote, FaExpandAlt, FaEdit, FaPen, FaTrash, FaUserPlus, FaTimes, FaCheck } from "react-icons/fa";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import TeamAttendance from "./TeamAttendance";
import MilestonesPanel from "./MilestonesPanel";
import { ReferencePicker, ReferenceView } from "../task/TaskReference";
import StarRating from "../task/StarRating";

const getRandomColor = (name) => {
    const colors = [
        'bg-brand-100 text-brand-800',
        'bg-accent-100 text-accent-800',
        'bg-amber-100 text-amber-800',
        'bg-slate-200 text-slate-800',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const TeamDetail = () => {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [memberStats, setMemberStats] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("milestones"); // 'tasks' = one milestone's tasks // 'tasks' or 'team'
  // Live refresh when anyone changes this team's tasks, members or details.
  useSocketEvent("team:updated", (e) => {
    if (e?.teamId !== id) return;
    if (e.kind === "milestones") fetchMilestones();
    else {
      fetchTeamDetail();
      if (e.kind === "tasks") fetchMilestones(); // progress counts
    }
  });
  const [milestones, setMilestones] = useState([]);
  const [milestoneFilter, setMilestoneFilter] = useState(""); // "" all, "none", or a milestone id
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const { user } = useAuth();

  const [selectedMember, setSelectedMember] = useState(null); // For detail modal
  // Milestone groups in the member modal start collapsed.
  const [memberOpenGroups, setMemberOpenGroups] = useState(() => new Set());
  useEffect(() => { setMemberOpenGroups(new Set()); }, [selectedMember?.member?._id]);
  const toggleMemberGroup = (key) =>
    setMemberOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const [editingTask, setEditingTask] = useState(null); // For status update
  const [viewTask, setViewTask] = useState(null); // For viewing task details
  const [editDetails, setEditDetails] = useState(null); // For editing title/description/dates
  const [savingDetails, setSavingDetails] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState("");
  const [newTaskRemark, setNewTaskRemark] = useState("");
  const [newTaskRating, setNewTaskRating] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  // Task Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [refFile, setRefFile] = useState(null); // lead's optional "what to do" attachment
  const [isAssigning, setIsAssigning] = useState(false);
  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    startDate: "",
    deadline: "",
    assignedTo: [],
  });
  const [docsModal, setDocsModal] = useState({ open: false, documents: [], employeeName: "" });
  const [docsLoading, setDocsLoading] = useState(false);

  // PDF Filter State
  const [filterType, setFilterType] = useState("startDate");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  useEffect(() => {
    fetchTeamDetail();
    fetchMilestones();
    if (user?.role?.includes("admin")) {
      fetchEmployees();
    }
  }, [id]);
 
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setShowTaskModal(false);
        setAssignError("");
      }
    };
    if (showTaskModal) {
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showTaskModal]);

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      const response = await axios.delete(`${API_BASE}/api/task/${taskId}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (response.data.success) {
        alert("Task deleted successfully");
        // Soft delete: Update local state to mark as deleted instead of removing
        setTasks(prev => prev.map(t => t._id === taskId ? { ...t, isDeleted: true } : t));
        fetchTeamDetail(); // Refresh stats
      }
    } catch (error) {
        alert("Failed to delete task");
    }
  };

  const toDateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");

  const openEditDetails = (task) =>
    setEditDetails({
      _id: task._id,
      title: task.title || "",
      description: task.description || "",
      startDate: toDateInput(task.startDate),
      deadline: toDateInput(task.deadline),
      milestoneId: task.milestoneId || "",
    });

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!editDetails.title.trim()) return alert("Title is required");
    if (editDetails.startDate && editDetails.deadline && editDetails.deadline < editDetails.startDate) {
      return alert("Due date must be on or after the start date");
    }
    setSavingDetails(true);
    try {
      const { _id, ...body } = editDetails;
      await axios.put(`${API_BASE}/api/task/${_id}/details`, body, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      setEditDetails(null);
      fetchTeamDetail();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to save task");
    } finally {
      setSavingDetails(false);
    }
  };

  const removeMember = async (stat) => {
    const name = stat.member?.userId?.name || "this member";
    if (!window.confirm(`Remove ${name} from this team? Their existing tasks are kept.`)) return;
    try {
      await axios.delete(`${API_BASE}/api/team/${id}/members/${stat.member._id}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      fetchTeamDetail();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to remove member");
    }
  };

  const fetchMilestones = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/milestone`, {
        params: { teamId: id },
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (res.data.success) setMilestones(res.data.milestones || []);
    } catch (error) {
      console.error("Error fetching milestones:", error);
    }
  };

  const fetchTeamDetail = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/team/${id}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (response.data.success) {
        setTeam(response.data.team);
        setMemberStats(response.data.memberStats);
        setTasks(response.data.tasks || []);
      }
    } catch (error) {
      console.error("Error fetching team detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/employee`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (response.data.success) {
        setEmployees(response.data.employees);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleAddMembers = async () => {
    // Optimistic Update: Update UI immediately before server response
    const addedEmployees = employees.filter(emp => selectedEmployees.includes(emp._id));
    const newStats = addedEmployees.map(emp => ({
      member: emp,
      role: "Developer",
      totalTasks: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
      progress: 0,
      tasks: []
    }));

    const previousStats = [...memberStats]; // Backup for rollback
    setMemberStats(prev => [...prev, ...newStats]);
    
    // Clear selection immediately
    const tempSelectedIds = [...selectedEmployees];
    setSelectedEmployees([]);
    setSearchTerm("");

    try {
      const response = await axios.post(
        `${API_BASE}/api/team/members`,
        { teamId: id, employeeIds: tempSelectedIds, role: "Developer" }, // Default role
        { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
      );
      if (response.data.success) {
        // Success: UI is already updated. No need to fetchTeamDetail().
      }
    } catch (error) {
      console.error("Failed to add members:", error);
      alert("Failed to add members");
      // Rollback UI
      setMemberStats(previousStats);
      setSelectedEmployees(tempSelectedIds);
    }
  };

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleTaskMemberSelection = (memberId) => {
    setTaskData(prev => {
        const currentAssigned = Array.isArray(prev.assignedTo) ? prev.assignedTo : [];
        const newAssignedTo = currentAssigned.includes(memberId)
            ? currentAssigned.filter(id => id !== memberId)
            : [...currentAssigned, memberId];
        return { ...prev, assignedTo: newAssignedTo };
    });
  };
 
  const isAllSelected = () => {
    const total = memberStats.length;
    const selected = Array.isArray(taskData.assignedTo) ? taskData.assignedTo.length : 0;
    return total > 0 && selected === total;
  };
 
  const toggleSelectAllMembers = () => {
    setTaskData(prev => {
      const allIds = memberStats.map(s => s.member._id);
      const nextAssigned = isAllSelected() ? [] : allIds;
      return { ...prev, assignedTo: nextAssigned };
    });
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (isAssigning) return;
    if (taskData.assignedTo.length === 0) {
        setAssignError("Pick at least one member to assign this task to.");
        return;
    }
    try {
      setIsAssigning(true);
      const form = new FormData();
      form.append("teamId", id);
      form.append("title", taskData.title);
      form.append("description", taskData.description || "");
      form.append("assignedTo", JSON.stringify(taskData.assignedTo));
      if (taskData.milestoneId) form.append("milestoneId", taskData.milestoneId);
      if (taskData.startDate) form.append("startDate", taskData.startDate);
      if (taskData.deadline) form.append("deadline", taskData.deadline);
      if (refFile) form.append("file", refFile);
      const response = await axios.post(`${API_BASE}/api/task/assign`, form, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}`, "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        setShowTaskModal(false);
        setAssignError("");
        setRefFile(null);
        fetchTeamDetail(); // Refresh stats
        setTaskData({ title: "", description: "", startDate: "", deadline: "", assignedTo: [], milestoneId: "" });
      }
    } catch (error) {
      setAssignError(error.response?.data?.error || "Couldn't assign the task. Try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("status", newTaskStatus);
      formData.append("remark", newTaskRemark);
      formData.append("rating", String(newTaskRating));
      const response = await axios.put(
        `${API_BASE}/api/task/${editingTask._id}`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data"
          } 
        }
      );
      if (response.data.success) {
        // Update local state immediately
        setTasks(prev => prev.map(t => 
            t._id === editingTask._id ? { ...t, status: newTaskStatus, remark: newTaskRemark, rating: newTaskRating || undefined } : t
        ));

        // Also update member stats (completed/pending counts) locally if needed, 
        // but fetching is safer for stats consistency. 
        // We can optimize this later if needed.
        fetchTeamDetail(); 
        
        setEditingTask(null);
      }
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const getDocumentUrl = (path) => {
    if (!path) return '#';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    // Ensure path doesn't start with / if we're appending
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_BASE}/${cleanPath}`;
  };

  const openEmployeeDocs = async (employee) => {
    setDocsModal({ open: true, documents: [], employeeName: employee?.userId?.name || "Employee" });
    setDocsLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/document`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (response.data.success) {
        const allDocs = response.data.documents || [];
        const filtered = allDocs.filter(d => {
            const docEmpId = d.employeeId?._id || d.employeeId;
            return String(docEmpId) === String(employee._id);
        });
        setDocsModal({ open: true, documents: filtered, employeeName: employee?.userId?.name || "Employee" });
      }
    } catch (error) {
      // Silent fail with empty docs
      setDocsModal(prev => ({ ...prev, documents: [] }));
    } finally {
      setDocsLoading(false);
    }
  };

  // "<Milestone> (28 Sep - 4 Oct 2026)" for the PDF heading; file name
  // "<Milestone>_28Sep-04Oct2026_<TeamLead>.pdf".
  const milestoneRange = (m) => {
    if (!m?.startDate || !m?.dueDate) return "";
    const s = new Date(m.startDate), e = new Date(m.dueDate);
    const day = (d, opts) => d.toLocaleDateString("en-GB", opts);
    return `${day(s, { day: "numeric", month: "short" })} - ${day(e, { day: "numeric", month: "short", year: "numeric" })}`;
  };
  const fileSafe = (v) => String(v || "").trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  const handleDownloadPDF = () => {
    const m = milestones.find((x) => String(x._id) === String(milestoneFilter));
    const heading = m ? m.title.trim() : "Unplanned tasks";
    const range = milestoneRange(m);
    const lead = team?.leadId?.name || "N/A";

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text(range ? `${heading} (${range})` : heading, 15, 15);
    doc.text(`Team Lead: ${lead}`, doc.internal.pageSize.getWidth() - 15, 15, { align: "right" });

    // Only this milestone's live tasks
    const rows = tasks
      .filter((t) => !t.isDeleted)
      .filter((t) => (milestoneFilter === "none" ? !t.milestoneId : String(t.milestoneId) === String(milestoneFilter)))
      .map((t) => [
        t.title || "-",
        t.assignedTo?.userId?.name || "Unassigned",
        t.status,
        t.startDate ? new Date(t.startDate).toLocaleDateString() : "-",
        t.deadline ? new Date(t.deadline).toLocaleDateString() : "-",
        t.remark || "-",
        t.rating ? `${t.rating}/5` : "-",
      ]);

    autoTable(doc, {
      head: [["Task", "Employee Name", "Status", "Start Date", "Due Date", "Remark", "Rating"]],
      body: rows,
      startY: 20,
    });

    const rangePart = m?.startDate && m?.dueDate
      ? `${new Date(m.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}-${new Date(m.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`.replace(/ /g, "")
      : "";
    doc.save(`${[fileSafe(heading), rangePart, fileSafe(lead)].filter(Boolean).join("_")}.pdf`);
  };

  // Derive member tasks from main tasks list to avoid duplication in state/backend
  const memberTasks = selectedMember?.member?._id
    ? tasks.filter(t => !t.isDeleted && t.assignedTo && t.assignedTo._id === selectedMember.member._id)
    : [];

  if (loading) return <div className="p-6 text-ink-muted">Loading...</div>;
  if (!team) return <div className="p-6 text-ink-muted">Team not found</div>;

  const canTakeAttendance =
    user?.role?.includes("admin") ||
    String(team.leadId?._id || team.leadId) === String(user?._id || user?.id);

  const liveTasks = tasks.filter(t => !t.isDeleted);
  const inDateRange = (task) => {
    if (!filterFrom && !filterTo) return true;
    const val = filterType === 'startDate' ? task.startDate : task.deadline;
    const d = val ? new Date(val) : null;
    if (!d || isNaN(d.getTime())) return false;
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return (!filterFrom || ds >= filterFrom) && (!filterTo || ds <= filterTo);
  };
  const inMilestone = (task) =>
    !milestoneFilter ||
    (milestoneFilter === "none" ? !task.milestoneId : String(task.milestoneId) === milestoneFilter);
  const visibleTasks = liveTasks.filter((t) => inDateRange(t) && inMilestone(t));
  const dateFiltered = !!(filterFrom || filterTo);
  const milestoneById = new Map(milestones.map((m) => [String(m._id), m]));
  const openMilestones = milestones.filter((m) => m.state === "open");
  const canManageTasks = user?.role?.includes('admin') || user?.role?.includes('team_lead');

  const canManageMilestones = canTakeAttendance; // admin or this team's lead
  const unplannedCount = liveTasks.filter((t) => !t.milestoneId).length;
  const currentMilestone = milestoneById.get(milestoneFilter);
  const openMilestoneTasks = (mid) => { setMilestoneFilter(String(mid)); setActiveTab('tasks'); };
  const backToMilestones = () => { setActiveTab('milestones'); setMilestoneFilter(''); setFilterFrom(''); setFilterTo(''); };
  const tabs = [
    { key: 'milestones', label: 'Milestones', count: openMilestones.length },
    { key: 'team', label: 'Members', count: memberStats.length },
    ...(canTakeAttendance ? [{ key: 'attendance', label: 'Attendance' }] : []),
  ];

  return (
    <motion.div
      className="sm:p-6 bg-surface-muted min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Team header + tabs are hidden inside a milestone: it reads as its own sub-page. */}
      {activeTab !== 'tasks' && (<>
      {/* Header */}
      {/* Phone: dark header with the team name + tabs, like the app's HrmsAppBar with TabBar. */}
      <div className="sm:hidden mb-3 rounded-xl bg-gradient-to-b from-brand-900 to-brand-800 text-white overflow-hidden">
        <h1 className="px-4 pt-4 text-lg font-bold break-words">{team.name}</h1>
        <div role="tablist" aria-label="Team sections" className="flex mt-2">
          {tabs.map(t => {
            const active = activeTab === t.key || (t.key === 'milestones' && activeTab === 'tasks');
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => (t.key === 'milestones' ? backToMilestones() : setActiveTab(t.key))}
                className={`flex-1 min-h-[48px] text-sm font-semibold border-b-[3px] transition-colors outline-none focus-visible:bg-white/10 ${active ? 'border-white text-white' : 'border-transparent text-white/70'}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <p className="sm:hidden px-1 mb-3 text-sm font-semibold text-ink">Lead: {team.leadId?.name || "N/A"}</p>

      <header className="hidden sm:block bg-white rounded-xl shadow-card border border-surface-subtle p-4 sm:p-5 mb-5">
        <h1 className="text-xl sm:text-2xl font-semibold text-brand-800 break-words">{team.name}</h1>
        {team.description && <p className="mt-1 text-sm text-ink-muted max-w-3xl">{team.description}</p>}
        <dl className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-x-10 gap-y-3 text-sm">
          <div>
            <dt className="text-ink-muted text-xs">Team lead</dt>
            <dd className="font-medium text-ink">{team.leadId?.name || "N/A"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted text-xs">Members</dt>
            <dd className="font-medium text-ink tabular-nums">{memberStats.length}</dd>
          </div>
        </dl>
      </header>

      {/* Tabs */}
      <div role="tablist" aria-label="Team sections" className="hidden sm:flex gap-1 overflow-x-auto border-b border-surface-subtle mb-5">
        {tabs.map(t => {
          const active = activeTab === t.key || (t.key === 'milestones' && activeTab === 'tasks');
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => (t.key === 'milestones' ? backToMilestones() : setActiveTab(t.key))}
              className={`shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-t ${active ? 'border-accent-600 text-accent-700' : 'border-transparent text-ink-muted hover:text-ink'}`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${active ? 'bg-accent-100 text-accent-800' : 'bg-surface-subtle text-ink-muted'}`}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>
      </>)}

      <AnimatePresence mode="wait">
        {activeTab === 'tasks' && (
            <motion.div 
                key="tasks"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl shadow-card border border-surface-subtle p-4 sm:p-5"
            >
                <div className="mb-4 pb-4 border-b border-surface-subtle">
                    <button
                        onClick={backToMilestones}
                        className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-accent-700 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    >
                        <span aria-hidden="true">&larr;</span> {team.name} · Milestones
                    </button>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <h2 className="text-lg font-semibold text-ink">
                            {milestoneFilter === 'none' ? 'Unplanned tasks' : currentMilestone?.title || 'Milestone'}
                        </h2>
                        {currentMilestone && (
                            <span className="text-sm text-ink-muted tabular-nums">
                                {currentMilestone.dueDate ? `Due ${new Date(currentMilestone.dueDate).toLocaleDateString()} · ` : ''}
                                {currentMilestone.progress}% complete · {currentMilestone.openTasks} open · {currentMilestone.completedTasks} done
                                {currentMilestone.state === 'closed' ? ' · Closed' : ''}
                            </span>
                        )}
                    </div>
                    {currentMilestone && (
                        <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full bg-surface-subtle" role="progressbar" aria-valuenow={currentMilestone.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Milestone progress">
                            <div className="h-2 rounded-full bg-accent-600" style={{ width: `${currentMilestone.progress}%` }} />
                        </div>
                    )}
                    {milestoneFilter === 'none' && (
                        <p className="mt-1 text-sm text-ink-muted">Tasks created before milestones. Edit a task to move it into a milestone.</p>
                    )}
                    {currentMilestone?.description && <p className="mt-1 text-sm text-ink-muted max-w-prose">{currentMilestone.description}</p>}
                </div>
                <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                    </div>
                    {canManageTasks && (
                        <div className="flex gap-2">
                            <button
                                className="flex-1 sm:flex-none border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleDownloadPDF}
                                disabled={visibleTasks.length === 0}
                            >
                                <FaFilePdf className="text-red-600" /> Download PDF
                            </button>
                            <button
                                className="flex-1 sm:flex-none bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => {
                                    const ms = milestoneById.get(milestoneFilter);
                                    setTaskData({ title: "", description: "", deadline: "", assignedTo: [], milestoneId: ms && ms.state === "open" ? ms._id : "" });
                                    setRefFile(null);
                                    setShowTaskModal(true);
                                }}
                                disabled={memberStats.length === 0}
                                hidden={!currentMilestone}
                                title={memberStats.length === 0 ? "Add members before assigning tasks" : undefined}
                            >
                                <span aria-hidden="true">+</span> Add Task
                            </button>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto border border-surface-subtle rounded-lg hidden sm:block">
                    <table className="min-w-full text-sm border-collapse">
                        <thead className="bg-surface-muted">
                            <tr>
                                <th className="p-3 text-left font-semibold text-ink border-r border-surface-subtle flex items-center gap-2">
                                    <FaTasks className="text-ink-muted" /> Task
                                </th>
                                <th className="p-3 text-left font-semibold text-ink border-r border-surface-subtle w-48">
                                    <div className="flex items-center gap-2">
                                        <FaUser className="text-ink-muted" /> Assigned To
                                    </div>
                                </th>
                                <th className="p-3 text-left font-semibold text-ink border-r border-surface-subtle w-32">
                                    <div className="flex items-center gap-2">
                                        <FaInfoCircle className="text-ink-muted" /> Status
                                    </div>
                                </th>
                                <th className="p-3 text-left font-semibold text-ink border-r border-surface-subtle w-32">
                                    <div className="flex items-center gap-2">
                                        <FaCalendarAlt className="text-ink-muted" /> Start Date
                                    </div>
                                </th>
                                <th className="p-3 text-left font-semibold text-ink border-r border-surface-subtle w-32">
                                    <div className="flex items-center gap-2">
                                        <FaCalendarAlt className="text-ink-muted" /> Due Date
                                    </div>
                                </th>
                                <th className="p-3 text-left font-semibold text-ink">
                                    <div className="flex items-center gap-2">
                                        <FaStickyNote className="text-ink-muted" /> Remark
                                    </div>
                                </th>

                                <th className="p-3 text-left font-semibold text-ink w-28">
                                    Documents
                                </th>
                                <th className="p-3 text-left font-semibold text-ink w-52">
                                    Actions
                                </th>

                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-subtle bg-white">
                            <AnimatePresence>
                            {visibleTasks.map((task, index) => {
                                const assignee = task.assignedTo;
                                const assigneeName = assignee?.userId?.name || "Unassigned";
                                const assigneeColor = assignee ? getRandomColor(assigneeName) : 'bg-gray-100 text-gray-500';

                                // Map Status colors
                                let statusColor = 'bg-slate-100 text-slate-700';
                                if (task.status === 'Completed') statusColor = 'bg-accent-100 text-accent-700';
                                if (task.status === 'In Progress') statusColor = 'bg-amber-100 text-amber-700'; // Like "Waiting"
                                if (task.status === 'Overdue') statusColor = 'bg-red-100 text-red-700'; // Like "Cancelled"
                                if (task.status === 'Assigned') statusColor = 'bg-brand-100 text-brand-700';

                                return (
                                    <motion.tr 
                                        key={task._id} 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-surface-muted transition-colors"
                                    >
                                        <td className="p-3 border-r border-surface-subtle">
                                            <span className="font-medium text-ink line-clamp-1">{task.title}</span>
                                        </td>
                                        <td className="p-3 border-r border-surface-subtle">
                                            {assignee ? (
                                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${assigneeColor}`}>
                                                    {assigneeName}
                                                </span>
                                            ) : (
                                                <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-ink-faint">
                                                    Unassigned
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 border-r border-surface-subtle">
                                            <button
                                                onClick={() => {
                                                    setEditingTask(task);
                                                    setNewTaskStatus(task.status);
                                                    setNewTaskRemark(task.remark || "");
                                                    setNewTaskRating(task.rating || 0);
                                                }}
                                                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor} hover:opacity-80 transition-opacity cursor-pointer`}
                                            >
                                                {task.status}
                                            </button>
                                        </td>
                                        <td className="p-3 border-r border-surface-subtle text-ink-muted">
                                            {task.startDate ? new Date(task.startDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="p-3 border-r border-surface-subtle text-ink-muted">
                                            {task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="p-3 text-ink-muted max-w-[200px]">
                                            <div className="truncate">{task.remark || "-"}</div>
                                            {task.rating ? <StarRating value={task.rating} size={12} /> : null}
                                        </td>

                                        <td className="p-3">
                                            {task.workProof || task.reference ? (
                                                <div className="flex flex-col items-start gap-1">
                                                    {task.workProof && (
                                                        <a
                                                            href={getDocumentUrl(task.workProof)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title={task.workProofName || "Employee's work proof"}
                                                            className="bg-brand-700 text-white text-xs px-2 py-1 rounded-lg inline-flex items-center gap-1 hover:bg-brand-800 transition-colors"
                                                        >
                                                            <FaEye aria-hidden="true" /> Work proof
                                                        </a>
                                                    )}
                                                    {task.reference && (
                                                        <a
                                                            href={getDocumentUrl(task.reference)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title={task.referenceName || "Your reference"}
                                                            className="text-xs text-accent-700 hover:underline inline-flex items-center gap-1"
                                                        >
                                                            <FaFilePdf className="text-[10px]" aria-hidden="true" /> Reference
                                                        </a>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-ink-faint text-xs">-</span>
                                            )}
                                        </td>

                                        <td className="p-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingTask(task);
                                                        setNewTaskStatus(task.status);
                                                        setNewTaskRemark(task.remark || "");
                                                        setNewTaskRating(task.rating || 0);
                                                    }}
                                                    className="p-2 bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 transition-colors"
                                                    title="Update Task"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    onClick={() => setViewTask(task)}
                                                    className="p-2 bg-surface-muted text-ink-muted rounded-lg hover:bg-surface-subtle transition-colors"
                                                    title="View Details"
                                                >
                                                    <FaEye />
                                                </button>
                                                <button
                                                    onClick={() => openEditDetails(task)}
                                                    className="p-2 bg-surface-muted text-ink-muted rounded-lg hover:bg-surface-subtle transition-colors"
                                                    title="Edit Task"
                                                    aria-label="Edit task"
                                                >
                                                    <FaPen />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTask(task._id)}
                                                    className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                                                    title="Delete Task"
                                                    aria-label="Delete task"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>

                                    </motion.tr>
                                );
                            })}
                            </AnimatePresence>
                            {visibleTasks.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="text-center px-6 py-14 text-ink-muted">{!dateFiltered
                                        ? (memberStats.length === 0 ? "No tasks yet. Add members to the team, then assign their first task." : "No tasks in this milestone yet. Use Add Task to plan the week's work.")
                                        : "No tasks in this date range."}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="sm:hidden space-y-3">
                    {visibleTasks.map(task => {
                        const assignee = task.assignedTo;
                        const assigneeName = assignee?.userId?.name || "Unassigned";
                        let statusColor = 'bg-slate-100 text-slate-700';
                        if (task.status === 'Completed') statusColor = 'bg-accent-100 text-accent-700';
                        if (task.status === 'In Progress') statusColor = 'bg-amber-100 text-amber-700';
                        if (task.status === 'Overdue') statusColor = 'bg-red-100 text-red-700';
                        if (task.status === 'Assigned') statusColor = 'bg-brand-100 text-brand-700';
                        return (
                            <div key={task._id} className="bg-white rounded-xl shadow-card border border-surface-subtle p-4">
                                <div className="flex justify-between items-start">
                                    <div className="font-semibold text-ink">{task.title}</div>
                                    <button
                                        onClick={() => {
                                            setEditingTask(task);
                                            setNewTaskStatus(task.status);
                                            setNewTaskRemark(task.remark || "");
                                            setNewTaskRating(task.rating || 0);
                                        }}
                                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
                                    >
                                        {task.status}
                                    </button>
                                </div>
                                <div className="mt-2 text-sm text-ink-muted">
                                    <div>Assigned To: <span className="font-medium text-ink">{assigneeName}</span></div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div>Start: {task.startDate ? new Date(task.startDate).toLocaleDateString() : '-'}</div>
                                        <div>Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}</div>
                                    </div>
                                    {task.description && (
                                        <div className="mt-2 text-ink-muted">
                                            {task.description}
                                        </div>
                                    )}
                                </div>
                                {task.workProof && (
                                    <a
                                        href={getDocumentUrl(task.workProof)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-block text-brand-600 font-medium"
                                    >
                                        View Doc
                                    </a>
                                )}
                                <div className="flex justify-end gap-3 mt-3 border-t border-surface-subtle pt-3">
                                    <button
                                        onClick={() => {
                                            setEditingTask(task);
                                            setNewTaskStatus(task.status);
                                            setNewTaskRemark(task.remark || "");
                                            setNewTaskRating(task.rating || 0);
                                        }}
                                        className="text-brand-700 text-sm font-medium flex items-center gap-1 bg-brand-100 px-3 py-1.5 rounded-lg"
                                    >
                                        <FaEdit /> Update
                                    </button>
                                    <button
                                        onClick={() => setViewTask(task)}
                                        className="text-ink-muted text-sm font-medium flex items-center gap-1 bg-surface-muted px-3 py-1.5 rounded-lg"
                                    >
                                        <FaEye /> View
                                    </button>
                                    <button
                                        onClick={() => openEditDetails(task)}
                                        className="text-ink-muted text-sm font-medium flex items-center gap-1 bg-surface-muted px-3 py-1.5 rounded-lg"
                                    >
                                        <FaPen /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTask(task._id)}
                                        className="text-red-700 text-sm font-medium flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-lg"
                                    >
                                        <FaTrash /> Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {visibleTasks.length === 0 && (
                        <div className="rounded-lg bg-surface-muted p-6 text-center text-sm text-ink-muted">
                            {!dateFiltered
                                        ? (memberStats.length === 0 ? "No tasks yet. Add members to the team, then assign their first task." : "No tasks in this milestone yet. Use Add Task to plan the week's work.")
                                        : "No tasks in this date range."}
                        </div>
                    )}
                </div>
            </motion.div>
        )}

        {activeTab === 'milestones' && (
            <motion.div key="milestones" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mb-8">
                <MilestonesPanel
                    teamId={id}
                    milestones={milestones}
                    canManage={canManageMilestones}
                    onChanged={fetchMilestones}
                    onViewTasks={openMilestoneTasks}
                    unplannedCount={unplannedCount}
                />
            </motion.div>
        )}

        {activeTab === 'team' && (() => {
            const isAdmin = user?.role?.includes('admin');
            const memberIds = new Set(memberStats.map(s => s.member._id));
            const leadUserId = String(team.leadId?._id || team.leadId || '');
            const q = searchTerm.trim().toLowerCase();
            const eligible = employees.filter(emp => {
                if (memberIds.has(emp._id) || !emp.userId) return false;
                if (String(emp.userId._id || emp.userId) === leadUserId) return false;
                const roles = Array.isArray(emp.userId.role) ? emp.userId.role : [emp.userId.role];
                return roles.some(r => ['employee', 'team_lead'].includes(r));
            });
            const results = eligible.filter(emp =>
                !q || emp.userId?.name?.toLowerCase().includes(q) || emp.employeeId?.toLowerCase().includes(q)
            );
            const selected = employees.filter(emp => selectedEmployees.includes(emp._id));
            const mq = memberSearch.trim().toLowerCase();
            const shownMembers = memberStats.filter(s =>
                !mq || s.member?.userId?.name?.toLowerCase().includes(mq) || s.member?.employeeId?.toLowerCase().includes(mq)
            );
            const initials = (name) => {
                const parts = (name || '').trim().split(/\s+/).filter(Boolean);
                if (parts.length === 0) return '?';
                return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
            };
            const closeAdd = () => { setAddOpen(false); setSearchTerm(''); };
            const confirmAdd = async () => { closeAdd(); await handleAddMembers(); };

            return (
            <motion.div
                key="team"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-8"
            >
            <section className="bg-white rounded-xl shadow-card border border-surface-subtle" aria-labelledby="members-heading">
                <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-surface-subtle">
                    <h3 id="members-heading" className="text-lg font-semibold text-ink mr-auto">
                        Members <span className="text-ink-muted font-normal tabular-nums">· {memberStats.length}</span>
                    </h3>
                    {memberStats.length > 3 && (
                        <input
                            type="search"
                            aria-label="Search members"
                            placeholder="Search members..."
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            className="w-full sm:w-64 order-last sm:order-none border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 outline-none"
                        />
                    )}
                    {isAdmin && (
                        <button
                            onClick={() => setAddOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 outline-none transition-colors"
                        >
                            <FaUserPlus aria-hidden="true" /> Add members
                        </button>
                    )}
                </div>

                {memberStats.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-accent-700">
                            <FaUser className="text-xl" aria-hidden="true" />
                        </div>
                        <p className="font-semibold text-ink">No members in this team yet</p>
                        <p className="mt-1 text-sm text-ink-muted">
                            {isAdmin ? 'Add employees to start assigning them tasks.' : 'An admin can add members to this team.'}
                        </p>
                        {isAdmin && (
                            <button
                                onClick={() => setAddOpen(true)}
                                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 outline-none"
                            >
                                <FaUserPlus aria-hidden="true" /> Add members
                            </button>
                        )}
                    </div>
                ) : shownMembers.length === 0 ? (
                    <p className="px-6 py-10 text-center text-sm text-ink-muted">No members match "{memberSearch}".</p>
                ) : (
                    <>
                    <div className="hidden md:grid grid-cols-[minmax(0,1fr)_repeat(4,5rem)_10rem_2.75rem] gap-4 px-5 py-2.5 bg-surface-muted text-xs font-medium text-ink-muted">
                        <span>Member</span>
                        <span className="text-right">Tasks</span>
                        <span className="text-right">Done</span>
                        <span className="text-right">Pending</span>
                        <span className="text-right">Overdue</span>
                        <span>Progress</span>
                        <span className="sr-only">Actions</span>
                    </div>
                    <ul className="divide-y divide-surface-subtle">
                        {shownMembers.map((stat) => {
                            const name = stat.member?.userId?.name || 'Unknown';
                            return (
                            <li key={stat.member._id} className="group relative grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_repeat(4,5rem)_10rem_2.75rem] items-center gap-x-4 gap-y-2 px-5 py-3.5 hover:bg-surface-muted transition-colors">
                                <button
                                    onClick={() => setSelectedMember(stat)}
                                    className="flex min-w-0 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-lg after:absolute after:inset-0"
                                    aria-label={`View ${name}'s tasks`}
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-800">
                                        {initials(name)}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-medium text-ink truncate">{name}</span>
                                        <span className="block text-xs text-ink-muted tabular-nums">
                                            {stat.member?.employeeId}
                                            {stat.member?.designation ? ` · ${stat.member.designation}` : ''}
                                        </span>
                                    </span>
                                </button>

                                {/* Desktop columns */}
                                <span className="hidden md:block text-right text-sm tabular-nums text-ink">{stat.totalTasks}</span>
                                <span className="hidden md:block text-right text-sm tabular-nums text-ink">{stat.completed}</span>
                                <span className="hidden md:block text-right text-sm tabular-nums text-ink">{stat.pending}</span>
                                <span className={`hidden md:block text-right text-sm tabular-nums ${stat.overdue > 0 ? 'font-semibold text-red-700' : 'text-ink-muted'}`}>{stat.overdue}</span>
                                <div className="hidden md:flex items-center gap-2">
                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-subtle" role="progressbar" aria-valuenow={stat.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${name} progress`}>
                                        <div className="h-full rounded-full bg-accent-600" style={{ width: `${stat.progress}%` }} />
                                    </div>
                                    <span className="w-9 text-right text-xs tabular-nums text-ink-muted">{stat.progress}%</span>
                                </div>

                                {/* Remove */}
                                {isAdmin ? (
                                    <button
                                        onClick={() => removeMember(stat)}
                                        className="relative z-10 justify-self-end rounded-lg p-2.5 text-ink-muted md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500 outline-none transition"
                                        title="Remove from team"
                                        aria-label={`Remove ${name} from team`}
                                    >
                                        <FaTrash aria-hidden="true" />
                                    </button>
                                ) : <span className="hidden md:block" />}

                                {/* Mobile summary */}
                                <div className="col-span-2 md:hidden flex items-center gap-3 pl-[3.25rem] text-xs text-ink-muted tabular-nums">
                                    <span>{stat.completed}/{stat.totalTasks} done</span>
                                    {stat.overdue > 0 && <span className="font-medium text-red-700">{stat.overdue} overdue</span>}
                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-subtle">
                                        <div className="h-full rounded-full bg-accent-600" style={{ width: `${stat.progress}%` }} />
                                    </div>
                                </div>
                            </li>
                            );
                        })}
                    </ul>
                    </>
                )}
            </section>

            {/* Add members panel */}
            <AnimatePresence>
            {isAdmin && addOpen && (
                <div className="fixed inset-0 z-50" onKeyDown={(e) => e.key === 'Escape' && closeAdd()}>
                    <motion.div
                        className="absolute inset-0 bg-black/40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2 }}
                        onClick={closeAdd}
                    />
                    <motion.aside
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-heading"
                        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-xl"
                        initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
                        animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
                        transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                            <div>
                                <h3 id="add-heading" className="text-lg font-semibold text-ink">Add members</h3>
                                <p className="text-sm text-ink-muted">to {team.name}</p>
                            </div>
                            <button
                                onClick={closeAdd}
                                className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
                                aria-label="Close"
                            >
                                <FaTimes aria-hidden="true" />
                            </button>
                        </div>
                        <div className="px-5 pb-3 border-b border-surface-subtle">
                            <input
                                type="search"
                                autoFocus
                                aria-label="Search employees to add"
                                placeholder={`Search ${eligible.length} employees by name or ID`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full border border-surface-subtle rounded-lg px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-accent-500 outline-none"
                            />
                            {selected.length > 0 && (
                                <div className="mt-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                                    {selected.map(emp => (
                                        <button
                                            key={emp._id}
                                            onClick={() => toggleEmployeeSelection(emp._id)}
                                            className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2.5 py-1 text-xs font-medium text-accent-800 hover:bg-accent-200 focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
                                            aria-label={`Unselect ${emp.userId?.name}`}
                                        >
                                            {emp.userId?.name || 'Unknown'} <FaTimes className="text-[10px]" aria-hidden="true" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <ul className="flex-1 overflow-y-auto py-1">
                            {results.length === 0 ? (
                                <li className="px-5 py-10 text-center text-sm text-ink-muted">
                                    {q ? `No employees match "${searchTerm}".` : 'Everyone is already in this team.'}
                                </li>
                            ) : results.map(emp => {
                                const checked = selectedEmployees.includes(emp._id);
                                return (
                                    <li key={emp._id}>
                                        <label className={`flex min-h-[52px] items-center gap-3 px-5 py-2 cursor-pointer transition-colors ${checked ? 'bg-accent-50' : 'hover:bg-surface-muted'}`}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleEmployeeSelection(emp._id)}
                                                className="h-4 w-4 rounded text-accent-600 focus:ring-accent-500"
                                            />
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-ink">
                                                {initials(emp.userId?.name)}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-sm font-medium text-ink truncate">{emp.userId?.name || 'Unknown'}</span>
                                                <span className="block text-xs text-ink-muted tabular-nums">
                                                    {emp.employeeId}{emp.designation ? ` · ${emp.designation}` : ''}
                                                </span>
                                            </span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="flex gap-3 p-4 border-t border-surface-subtle">
                            <button
                                onClick={closeAdd}
                                className="rounded-lg border border-surface-subtle px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAdd}
                                disabled={selectedEmployees.length === 0}
                                className="flex-1 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-700 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                            >
                                {selectedEmployees.length === 0
                                    ? 'Select employees'
                                    : `Add ${selectedEmployees.length} member${selectedEmployees.length > 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </motion.aside>
                </div>
            )}
            </AnimatePresence>
            </motion.div>
            );
        })()}
        {activeTab === 'attendance' && canTakeAttendance && (
            <motion.div
                key="attendance"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
            >
                <TeamAttendance teamId={id} members={memberStats.map(s => s.member)} />
            </motion.div>
        )}
      </AnimatePresence>

      {/* Member Detail Modal */}
      <AnimatePresence>
      {selectedMember && (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-950/60 overflow-y-auto h-full w-full flex justify-center items-center z-50"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white p-6 rounded-xl shadow-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-ink">{selectedMember.member?.userId?.name || 'Unknown'} - Details</h3>
                    <button onClick={() => setSelectedMember(null)} className="text-ink-faint hover:text-ink text-2xl font-bold transition-colors">&times;</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Employee Info */}
                    <div className="bg-surface-muted p-6 rounded-xl border border-surface-subtle">
                        <h4 className="font-semibold text-lg mb-4 text-ink">Employee Info</h4>
                        <div className="space-y-2">
                            <p className="flex justify-between border-b border-surface-subtle pb-2"><span className="text-ink-muted">ID:</span> <span className="font-semibold text-ink">{selectedMember.member?.employeeId}</span></p>
                            <p className="flex justify-between pt-2"><span className="text-ink-muted">Email:</span> <span className="font-semibold text-ink">{selectedMember.member?.userId?.email}</span></p>
                        </div>
                    </div>

                    {/* Task Stats */}
                    <div className="bg-surface-muted p-6 rounded-xl border border-surface-subtle">
                        <h4 className="font-semibold text-lg mb-4 text-ink">Task Statistics</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-white rounded-lg border border-surface-subtle">
                                <p className="text-ink-muted text-sm mb-1">Total</p>
                                <p className="text-2xl font-semibold text-ink">{selectedMember.totalTasks}</p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg border border-surface-subtle border-b-4 border-b-accent-500">
                                <p className="text-ink-muted text-sm mb-1">Completed</p>
                                <p className="text-2xl font-semibold text-accent-600">{selectedMember.completed}</p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg border border-surface-subtle border-b-4 border-b-amber-500">
                                <p className="text-ink-muted text-sm mb-1">Pending</p>
                                <p className="text-2xl font-semibold text-amber-600">{selectedMember.pending}</p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg border border-surface-subtle border-b-4 border-b-red-500">
                                <p className="text-ink-muted text-sm mb-1">Overdue</p>
                                <p className="text-2xl font-semibold text-red-600">{selectedMember.overdue}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Employee Tasks Section */}
                <div className="mb-6">
                    <h4 className="font-semibold text-xl mb-4 text-ink">
                        Employee Tasks
                    </h4>
                    {memberTasks && memberTasks.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-surface-subtle">
                            <table className="min-w-full divide-y divide-surface-subtle">
                                <thead className="bg-surface-muted">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase">Task Title</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase">Start Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase">Deadline</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-surface-subtle">
                                    {(() => {
                                        // Group by milestone (milestone order), then tasks with no milestone.
                                        const ids = new Set(milestones.map(m => String(m._id)));
                                        const groups = milestones
                                            .map(m => ({ key: String(m._id), title: m.title, closed: m.state === 'closed', tasks: memberTasks.filter(t => String(t.milestoneId || '') === String(m._id)) }))
                                            .filter(g => g.tasks.length);
                                        const rest = memberTasks.filter(t => !ids.has(String(t.milestoneId || '')));
                                        if (rest.length) groups.push({ key: 'none', title: 'No milestone', tasks: rest });
                                        return groups.flatMap(g => [
                                            <tr key={`g-${g.key}`} className="bg-surface-muted">
                                                <td colSpan={4} className="p-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleMemberGroup(g.key)}
                                                        aria-expanded={memberOpenGroups.has(g.key)}
                                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-ink hover:bg-surface-subtle outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500"
                                                    >
                                                        <span aria-hidden="true" className={`inline-block text-ink-muted transition-transform motion-reduce:transition-none ${memberOpenGroups.has(g.key) ? 'rotate-90' : ''}`}>&rsaquo;</span>
                                                        {g.title}
                                                        <span className="ml-auto font-normal text-ink-muted">
                                                            {g.tasks.filter(t => t.status === 'Completed').length} of {g.tasks.length} done{g.closed ? ' · Closed' : ''}
                                                        </span>
                                                    </button>
                                                </td>
                                            </tr>,
                                            ...(memberOpenGroups.has(g.key) ? g.tasks : []).map((task) => (
                                        <tr key={task._id} className={task.isDeleted ? "bg-red-50" : "hover:bg-surface-muted transition-colors"}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-sm text-ink">
                                                    {task.title}
                                                    {task.isDeleted && <span className="text-red-600 font-semibold text-xs ml-2">(Deleted)</span>}
                                                </div>
                                                <div className="text-xs text-ink-muted truncate max-w-[200px] mt-1">{task.description}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-ink-muted">
                                                {task.startDate ? new Date(task.startDate).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-ink-muted">
                                                {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-brand-600">
                                                <button
                                                    onClick={() => {
                                                        setEditingTask(task);
                                                        setNewTaskStatus(task.status);
                                                        setNewTaskRemark(task.remark || "");
                                                        setNewTaskRating(task.rating || 0);
                                                    }}
                                                    className="hover:underline focus:outline-none"
                                                >
                                                    {task.status}
                                                </button>
                                            </td>


                                        </tr>
                                    ))]);
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-ink-muted italic text-center py-4 bg-surface-muted rounded-lg">
                            No tasks assigned to this employee.
                        </p>
                    )}
                </div>

                <div className="flex justify-end mt-6">
                    <button
                        onClick={() => setSelectedMember(null)}
                        className="border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Status Update Modal */}
      <AnimatePresence>
      {editingTask && (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-950/60 flex justify-center items-center z-[60] p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-6 rounded-xl shadow-panel w-full max-w-sm max-h-[90vh] overflow-y-auto"
            >
                <h3 className="text-lg font-semibold mb-4 text-ink">Update Task</h3>
                <form onSubmit={handleStatusUpdate}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2 text-ink">Task Title</label>
                        <p className="p-3 bg-surface-muted rounded-lg text-ink text-sm border border-surface-subtle">{editingTask.title}</p>
                        {editingTask.workProof && (
                            <p className="mt-2 text-sm">
                                <span className="font-medium text-ink">Employee's work proof: </span>
                                <a
                                    href={editingTask.workProof.startsWith("http") ? editingTask.workProof : `${API_BASE}/${editingTask.workProof}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-600 hover:underline font-medium"
                                >
                                    View Attached File
                                </a>

                            </p>
                        )}
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2 text-ink">Status</label>
                        <select
                            className="w-full border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
                            value={newTaskStatus}
                            onChange={(e) => setNewTaskStatus(e.target.value)}
                        >
                            <option value="Assigned">Assigned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Review">Review</option>
                            <option value="Completed">Completed</option>
                            <option value="Overdue">Overdue</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <span className="block text-sm font-medium mb-1 text-ink">Rating</span>
                        <StarRating value={newTaskRating} onChange={setNewTaskRating} size={22} />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2 text-ink">Remark</label>
                        <textarea
                            className="w-full border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink h-24 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
                            value={newTaskRemark}
                            onChange={(e) => setNewTaskRemark(e.target.value)}
                            placeholder="Add remarks..."
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setEditingTask(null)} className="border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg px-4 py-2 text-sm font-medium transition-colors">Cancel</button>
                        <button type="submit" className="bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">Update</button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Assign Task Modal */}
      <AnimatePresence>
      {showTaskModal && (() => {
        const close = () => { if (!isAssigning) { setShowTaskModal(false); setAssignError(""); } };
        const assignedCount = taskData.assignedTo.length;
        const fieldCls = "w-full border border-surface-subtle rounded-lg px-3 py-2.5 text-sm text-ink bg-white placeholder:text-ink-faint focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none";
        const labelCls = "block text-sm font-medium text-ink mb-1.5";
        const initialsOf = (name) => {
          const parts = (name || '').trim().split(/\s+/).filter(Boolean);
          if (parts.length === 0) return '?';
          return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
        };
        return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            className="fixed inset-0 z-50 bg-brand-950/60 flex justify-center items-end sm:items-center sm:p-4"
            onClick={close}
            onKeyDown={(e) => e.key === 'Escape' && close()}
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="assign-heading"
                initial={reduceMotion ? { opacity: 0 } : { y: 16, opacity: 0 }}
                animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { y: 16, opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white w-full sm:max-w-xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-xl shadow-panel border border-surface-subtle"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-surface-subtle">
                    <div>
                        <h3 id="assign-heading" className="text-lg font-semibold text-ink">Assign task</h3>
                        <p className="text-sm text-ink-muted">{team.name}</p>
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
                        aria-label="Close"
                    >
                        <FaTimes aria-hidden="true" />
                    </button>
                </div>

                <form id="assign-form" onSubmit={handleAssignTask} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    <div>
                        <label htmlFor="task-title" className={labelCls}>Title</label>
                        <input
                            id="task-title"
                            type="text"
                            autoFocus
                            placeholder="e.g. Build the login screen"
                            className={fieldCls}
                            value={taskData.title}
                            onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="task-desc" className={labelCls}>
                            Description <span className="font-normal text-ink-muted">(optional)</span>
                        </label>
                        <textarea
                            id="task-desc"
                            rows={3}
                            placeholder="What needs to be done, and what does done look like?"
                            className={`${fieldCls} resize-y`}
                            value={taskData.description}
                            onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                        />
                    </div>

                    <fieldset>
                        <div className="flex items-center justify-between mb-2">
                            <legend className="text-sm font-medium text-ink">
                                Assign to <span className="font-normal text-ink-muted tabular-nums">· {assignedCount} of {memberStats.length}</span>
                            </legend>
                            {memberStats.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => { toggleSelectAllMembers(); setAssignError(""); }}
                                    className="rounded px-1 text-sm font-medium text-accent-700 hover:text-accent-800 focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
                                >
                                    {isAllSelected() ? 'Clear all' : 'Select all'}
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto">
                            {memberStats.map(stat => {
                                const name = stat.member?.userId?.name || 'Unknown';
                                const on = taskData.assignedTo.includes(stat.member._id);
                                return (
                                    <button
                                        key={stat.member._id}
                                        type="button"
                                        role="checkbox"
                                        aria-checked={on}
                                        onClick={() => { toggleTaskMemberSelection(stat.member._id); setAssignError(""); }}
                                        className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-accent-500 outline-none ${on ? 'border-accent-600 bg-accent-50 text-accent-800' : 'border-surface-subtle bg-white text-ink hover:bg-surface-muted'}`}
                                    >
                                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${on ? 'bg-accent-600 text-white' : 'bg-surface-subtle text-ink-muted'}`}>
                                            {on ? <FaCheck aria-hidden="true" className="text-[11px]" /> : initialsOf(name)}
                                        </span>
                                        {name}
                                        <span className="text-xs text-ink-muted tabular-nums">{stat.member?.employeeId}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {assignError && <p role="alert" className="mt-2 text-sm text-red-700">{assignError}</p>}
                    </fieldset>

                    {milestoneById.get(String(taskData.milestoneId)) && (() => {
                        const m = milestoneById.get(String(taskData.milestoneId));
                        const d = (v) => new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                        return (
                            <p className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-ink">
                                <FaCalendarAlt className="shrink-0 text-ink-muted" aria-hidden="true" />
                                <span>
                                    Adds to <span className="font-medium">{m.title}</span>
                                    {m.startDate && m.dueDate ? ` · ${d(m.startDate)} – ${d(m.dueDate)}` : ''}
                                </span>
                            </p>
                        );
                    })()}

                    <ReferencePicker file={refFile} onChange={setRefFile} disabled={isAssigning} />
                </form>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-subtle bg-surface-muted/60 rounded-b-xl">
                    <button
                        type="button"
                        onClick={close}
                        className="border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg px-4 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-accent-500 outline-none transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="assign-form"
                        disabled={isAssigning}
                        className="rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-700 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 outline-none disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                    >
                        {isAssigning
                            ? 'Assigning...'
                            : assignedCount > 1 ? `Assign to ${assignedCount} members` : 'Assign task'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
        );
      })()}
      </AnimatePresence>

      {/* Edit Task Details Modal */}
      <AnimatePresence>
      {editDetails && (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-950/60 flex justify-center items-center z-[60] p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-6 rounded-xl shadow-panel w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
                <h3 className="text-lg font-semibold mb-4 text-ink">Edit Task</h3>
                <form onSubmit={handleSaveDetails} className="space-y-4">
                    <div>
                        <label htmlFor="edit-title" className="block text-sm font-medium mb-1 text-ink">Title</label>
                        <input
                            id="edit-title"
                            className="w-full border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 outline-none"
                            value={editDetails.title}
                            onChange={(e) => setEditDetails({ ...editDetails, title: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="edit-desc" className="block text-sm font-medium mb-1 text-ink">Description</label>
                        <textarea
                            id="edit-desc"
                            className="w-full border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink h-20 focus:ring-2 focus:ring-accent-500 outline-none"
                            value={editDetails.description}
                            onChange={(e) => setEditDetails({ ...editDetails, description: e.target.value })}
                        />
                    </div>
                    {milestones.length > 0 && (
                        <div>
                            <label htmlFor="edit-milestone" className="block text-sm font-medium mb-1 text-ink">Milestone</label>
                            <p className="mb-1.5 text-xs text-ink-muted">Tasks in a milestone use its week as their dates.</p>
                            <select
                                id="edit-milestone"
                                className="w-full border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink bg-white focus:ring-2 focus:ring-accent-500 outline-none"
                                value={editDetails.milestoneId || ""}
                                onChange={(e) => setEditDetails({ ...editDetails, milestoneId: e.target.value })}
                            >
                                <option value="">No milestone</option>
                                {milestones
                                    .filter((m) => m.state === "open" || String(m._id) === String(editDetails.milestoneId))
                                    .map((m) => <option key={m._id} value={m._id}>{m.title}{m.state === "closed" ? " (closed)" : ""}</option>)}
                            </select>
                        </div>
                    )}
                    {!editDetails.milestoneId && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit-start" className="text-xs font-medium block mb-1 text-ink-muted uppercase">Start Date</label>
                            <input
                                id="edit-start"
                                type="date"
                                className="w-full border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 outline-none"
                                value={editDetails.startDate}
                                onChange={(e) => setEditDetails({ ...editDetails, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-deadline" className="text-xs font-medium block mb-1 text-ink-muted uppercase">Deadline</label>
                            <input
                                id="edit-deadline"
                                type="date"
                                className="w-full border border-surface-subtle rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 outline-none"
                                value={editDetails.deadline}
                                onChange={(e) => setEditDetails({ ...editDetails, deadline: e.target.value })}
                            />
                        </div>
                    </div>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setEditDetails(null)} className="border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg px-4 py-2 text-sm font-medium transition-colors">Cancel</button>
                        <button
                            type="submit"
                            disabled={savingDetails}
                            className="bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
                        >
                            {savingDetails ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* View Task Modal */}
      <AnimatePresence>
      {viewTask && (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-950/60 flex justify-center items-center z-[60]"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-6 rounded-xl shadow-panel w-full max-w-md max-h-[90vh] overflow-y-auto m-4"
            >
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-ink">Task Details</h3>
                    <button onClick={() => setViewTask(null)} className="text-ink-faint hover:text-ink text-2xl font-bold transition-colors">&times;</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-ink-muted uppercase block mb-1">Title</label>
                        <p className="text-ink font-medium bg-surface-muted p-3 rounded-lg border border-surface-subtle">{viewTask.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-ink-muted uppercase block mb-1">Status</label>
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                viewTask.status === 'Completed' ? 'bg-accent-100 text-accent-700' :
                                viewTask.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                                viewTask.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                                'bg-brand-100 text-brand-700'
                            }`}>
                                {viewTask.status}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-ink-muted uppercase block mb-1">Start Date</label>
                            <p className="text-ink">{viewTask.startDate ? new Date(viewTask.startDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-ink-muted uppercase block mb-1">Due Date</label>
                            <p className="text-ink">{viewTask.deadline ? new Date(viewTask.deadline).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-ink-muted uppercase block mb-1">Assigned To</label>
                        <p className="text-ink">{viewTask.assignedTo?.userId?.name || "Unassigned"}</p>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-ink-muted uppercase block mb-1">Description</label>
                        <p className="text-ink bg-surface-muted p-3 rounded-lg border border-surface-subtle min-h-[3rem] text-sm">
                            {viewTask.description || "No description provided."}
                        </p>
                    </div>

                    <ReferenceView url={viewTask.reference} name={viewTask.referenceName} />

                    <div>
                        <label className="text-xs font-medium text-ink-muted uppercase block mb-1">Remark</label>
                        <p className="text-ink bg-surface-muted p-3 rounded-lg border border-surface-subtle min-h-[3rem] text-sm">
                            {viewTask.remark || "No remark yet."}
                        </p>
                    </div>

                    <div>
                        <span className="text-xs font-medium text-ink-muted uppercase block mb-1">Rating</span>
                        {viewTask.rating ? <StarRating value={viewTask.rating} /> : <p className="text-sm text-ink-muted">Not rated yet</p>}
                    </div>

                    {viewTask.workProof && (
                        <div>
                            <label className="text-xs font-medium text-ink-muted uppercase block mb-1">Work Proof</label>
                            <a
                                href={getDocumentUrl(viewTask.workProof)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                            >
                                <FaEye /> View Attached Document
                            </a>
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-6">
                    <button
                        onClick={() => setViewTask(null)}
                        className="border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Employee Documents Modal */}
      <AnimatePresence>
      {docsModal.open && (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-950/60 flex justify-center items-center z-[60]"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white p-6 rounded-xl shadow-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-ink">Documents - {docsModal.employeeName}</h3>
              <button onClick={() => setDocsModal({ open: false, documents: [], employeeName: "" })} className="text-ink-faint hover:text-ink text-2xl font-bold transition-colors">&times;</button>
            </div>
            {docsLoading ? (
              <div className="p-8 text-center text-ink-muted">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600 mx-auto mb-2"></div>
                  Loading...
              </div>
            ) : docsModal.documents.length === 0 ? (
              <div className="p-8 text-center text-ink-muted bg-surface-muted rounded-lg">No documents uploaded</div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-surface-subtle">
                  <table className="min-w-full divide-y divide-surface-subtle">
                    <thead className="bg-surface-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase">File Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase">File</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-surface-subtle">
                      {docsModal.documents.map(doc => (
                        <tr key={doc._id} className="hover:bg-surface-muted">
                          <td className="px-4 py-3 text-sm font-medium text-ink">{doc.originalName}</td>
                          <td className="px-4 py-3 text-sm text-ink-muted">{new Date(doc.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              doc.status === 'Approved' ? 'bg-accent-100 text-accent-700' :
                              doc.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>{doc.status || 'Pending'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <a
                              href={getDocumentUrl(doc.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 font-medium"
                            >
                              <FaEye /> View
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TeamDetail;
