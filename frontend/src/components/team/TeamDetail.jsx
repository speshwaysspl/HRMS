import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../utils/apiConfig";
import { FaFilePdf, FaEye, FaTasks, FaUser, FaInfoCircle, FaCalendarAlt, FaStickyNote, FaExpandAlt, FaEdit } from "react-icons/fa";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from "framer-motion";

const getRandomColor = (name) => {
    const colors = [
        'bg-orange-100 text-orange-800',
        'bg-blue-100 text-blue-800',
        'bg-green-100 text-green-800',
        'bg-purple-100 text-purple-800',
        'bg-pink-100 text-pink-800',
        'bg-yellow-100 text-yellow-800',
        'bg-teal-100 text-teal-800',
        'bg-indigo-100 text-indigo-800'
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
  const [activeTab, setActiveTab] = useState("tasks"); // 'tasks' or 'team'
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const { user } = useAuth();

  const [selectedMember, setSelectedMember] = useState(null); // For detail modal
  const [editingTask, setEditingTask] = useState(null); // For status update
  const [viewTask, setViewTask] = useState(null); // For viewing task details
  const [newTaskStatus, setNewTaskStatus] = useState("");
  const [newTaskRemark, setNewTaskRemark] = useState("");
  const [workProofFile, setWorkProofFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Task Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    priority: "Medium",
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
    if (user?.role?.includes("admin")) {
      fetchEmployees();
    }
  }, [id]);
 
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setShowTaskModal(false);
        setIsMemberDropdownOpen(false);
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
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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

  const fetchTeamDetail = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/team/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
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
        alert("Please select at least one member");
        return;
    }
    try {
      setIsAssigning(true);
      const response = await axios.post(
        `${API_BASE}/api/task/assign`,
        { ...taskData, teamId: id },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (response.data.success) {
        alert("Task assigned successfully");
        setShowTaskModal(false);
        fetchTeamDetail(); // Refresh stats
        setTaskData({ title: "", description: "", priority: "Medium", startDate: "", deadline: "", assignedTo: [] });
      }
    } catch (error) {
      alert(error.response?.data?.error || "Failed to assign task");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("status", newTaskStatus);
      formData.append("description", newTaskRemark);
      if (workProofFile) {
        formData.append("file", workProofFile);
      }
      const response = await axios.put(
        `${API_BASE}/api/task/${editingTask._id}`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data"
          } 
        }
      );
      if (response.data.success) {
        alert("Task updated successfully");
        
        // Update local state immediately
        setTasks(prev => prev.map(t => 
            t._id === editingTask._id ? { ...t, status: newTaskStatus, description: newTaskRemark, workProof: workProofFile ? response.data.task.workProof : t.workProof } : t
        ));

        // Also update member stats (completed/pending counts) locally if needed, 
        // but fetching is safer for stats consistency. 
        // We can optimize this later if needed.
        fetchTeamDetail(); 
        
        setEditingTask(null);
        setWorkProofFile(null);
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
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text("Task List", 15, 15);
    
    const tableColumn = ["Task", "Assigned To", "Status", "Start Date", "Due Date", "Remark"];
    const tableRows = [];

    const filteredTasks = tasks.filter(task => {
        if (!filterFrom && !filterTo) return true;
        
        const taskDateVal = filterType === 'startDate' ? task.startDate : task.deadline;
        if (!taskDateVal) return false;

        const d = new Date(taskDateVal);
        if (isNaN(d.getTime())) return false;
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const taskDateStr = `${year}-${month}-${day}`;
        
        if (filterFrom && taskDateStr < filterFrom) return false;
        if (filterTo && taskDateStr > filterTo) return false;
        
        return true;
    });

    filteredTasks.forEach(task => {
        const taskData = [
            task.title,
            task.assignedTo?.userId?.name || "Unassigned",
            task.status,
            task.startDate ? new Date(task.startDate).toLocaleDateString() : '-',
            task.deadline ? new Date(task.deadline).toLocaleDateString() : '-',
            task.description || "-"
        ];
        tableRows.push(taskData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
    });

    doc.save("task_list.pdf");
  };

  // Derive member tasks from main tasks list to avoid duplication in state/backend
  const memberTasks = selectedMember?.member?._id
    ? tasks.filter(t => t.assignedTo && t.assignedTo._id === selectedMember.member._id)
    : [];

  if (loading) return <div>Loading...</div>;
  if (!team) return <div>Team not found</div>;

  return (
    <motion.div 
      className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h2 
        className="text-3xl font-bold mb-4 text-gray-800"
        style={{ fontFamily: 'Times New Roman, serif' }}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {team.name}
      </motion.h2>
      <motion.div 
        className="bg-white p-4 rounded-xl shadow-md mb-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p><strong>Lead:</strong> {team.leadId?.name || "N/A"}</p>
      </motion.div>

      {/* Tabs */}
      <motion.div 
        className="flex border-b mb-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <button
          className={`px-6 py-2 font-medium transition-colors duration-300 ${activeTab === 'tasks' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
          onClick={() => setActiveTab('tasks')}
        >
          Task List
        </button>
        <button
          className={`px-6 py-2 font-medium transition-colors duration-300 ${activeTab === 'team' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
          onClick={() => setActiveTab('team')}
        >
          Team Members
        </button>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === 'tasks' && (
            <motion.div 
                key="tasks"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl shadow-xl p-4"
            >
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <div className="flex gap-2 flex-wrap">
                        {(user?.role?.includes('admin') || user?.role?.includes('team_lead')) && (
                            <>
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                                    onClick={() => {
                                        setTaskData({ title: "", description: "", priority: "Medium", deadline: "", assignedTo: [] });
                                        setShowTaskModal(true);
                                    }}
                                >
                                    <span>+</span> Add Task
                                </motion.button>

                                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border shadow-sm">
                                    <select 
                                        className="p-1.5 rounded text-sm border-none bg-transparent focus:outline-none text-gray-700 font-medium" 
                                        value={filterType} 
                                        onChange={(e) => setFilterType(e.target.value)}
                                    >
                                        <option value="startDate">Start Date</option>
                                        <option value="deadline">Due Date</option>
                                    </select>
                                    <input 
                                        type="date" 
                                        className="p-1.5 rounded text-sm border border-gray-200 focus:outline-none focus:border-blue-500" 
                                        value={filterFrom} 
                                        onChange={(e) => setFilterFrom(e.target.value)} 
                                    />
                                    <span className="text-gray-500 font-medium">-</span>
                                    <input 
                                        type="date" 
                                        className="p-1.5 rounded text-sm border border-gray-200 focus:outline-none focus:border-blue-500" 
                                        value={filterTo} 
                                        onChange={(e) => setFilterTo(e.target.value)} 
                                    />
                                </div>

                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                                    onClick={handleDownloadPDF}
                                >
                                    <FaFilePdf /> Download PDF
                                </motion.button>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="overflow-x-auto border rounded-lg hidden sm:block">
                    <table className="min-w-full text-sm border-collapse">
                        <thead className="bg-indigo-50">
                            <tr>
                                <th className="p-3 text-left font-bold text-slate-700 border-r border-indigo-100 flex items-center gap-2">
                                    <FaTasks className="text-slate-500" /> Task
                                </th>
                                <th className="p-3 text-left font-bold text-slate-700 border-r border-indigo-100 w-48">
                                    <div className="flex items-center gap-2">
                                        <FaUser className="text-slate-500" /> Assigned To
                                    </div>
                                </th>
                                <th className="p-3 text-left font-bold text-slate-700 border-r border-indigo-100 w-32">
                                    <div className="flex items-center gap-2">
                                        <FaInfoCircle className="text-slate-500" /> Status
                                    </div>
                                </th>
                                <th className="p-3 text-left font-bold text-slate-700 border-r border-indigo-100 w-32">
                                    <div className="flex items-center gap-2">
                                        <FaCalendarAlt className="text-slate-500" /> Start Date
                                    </div>
                                </th>
                                <th className="p-3 text-left font-bold text-slate-700 border-r border-indigo-100 w-32">
                                    <div className="flex items-center gap-2">
                                        <FaCalendarAlt className="text-slate-500" /> Due Date
                                    </div>
                                </th>
                                <th className="p-3 text-left font-bold text-slate-700">
                                    <div className="flex items-center gap-2">
                                        <FaStickyNote className="text-slate-500" /> Remark
                                    </div>
                                </th>

                                <th className="p-3 text-left font-bold text-slate-700 w-28">
                                    Documents
                                </th>
                                <th className="p-3 text-left font-bold text-slate-700 w-32">
                                    Actions
                                </th>
                                
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            <AnimatePresence>
                            {tasks.filter(t => !t.isDeleted).map((task, index) => {
                                const assignee = task.assignedTo;
                                const assigneeName = assignee?.userId?.name || "Unassigned";
                                const assigneeColor = assignee ? getRandomColor(assigneeName) : 'bg-gray-100 text-gray-500';

                                // Map Status colors
                                let statusColor = 'bg-gray-100 text-gray-800';
                                if (task.status === 'Completed') statusColor = 'bg-pink-100 text-pink-800';
                                if (task.status === 'In Progress') statusColor = 'bg-orange-100 text-orange-800'; // Like "Waiting"
                                if (task.status === 'Overdue') statusColor = 'bg-purple-100 text-purple-800'; // Like "Cancelled"
                                if (task.status === 'Assigned') statusColor = 'bg-blue-100 text-blue-800';

                                return (
                                    <motion.tr 
                                        key={task._id} 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-blue-50 transition-colors"
                                    >
                                        <td className="p-3 border-r border-gray-100">
                                            <span className="font-medium text-gray-700 line-clamp-1">{task.title}</span>
                                        </td>
                                        <td className="p-3 border-r border-gray-100">
                                            {assignee ? (
                                                <span className={`px-3 py-1 rounded-full font-medium text-xs inline-block shadow-sm ${assigneeColor}`}>
                                                    {assigneeName}
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full font-medium text-xs bg-gray-100 text-gray-400 inline-block">
                                                    Unassigned
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 border-r border-gray-100">
                                            <button 
                                                onClick={() => {
                                                    setEditingTask(task);
                                                    setNewTaskStatus(task.status);
                                                    setNewTaskRemark(task.description || "");
                                                    setWorkProofFile(null);
                                                }}
                                                className={`px-3 py-1 rounded-full font-medium text-xs inline-block shadow-sm ${statusColor} hover:opacity-80 transition-opacity cursor-pointer`}
                                            >
                                                {task.status}
                                            </button>
                                        </td>
                                        <td className="p-3 border-r border-gray-100 text-gray-600">
                                            {task.startDate ? new Date(task.startDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="p-3 border-r border-gray-100 text-gray-600">
                                            {task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="p-3 text-gray-500 truncate max-w-[200px]">
                                            {task.description || "-"}
                                        </td>

                                        <td className="p-3">
                                            {task.workProof ? (
                                                <a
                                                    href={getDocumentUrl(task.workProof)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-lg inline-flex items-center gap-1 hover:bg-indigo-700 shadow-sm transition-colors"
                                                >
                                                    <FaEye /> View Doc
                                                </a>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        
                                        <td className="p-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingTask(task);
                                                        setNewTaskStatus(task.status);
                                                        setNewTaskRemark(task.description || "");
                                                        setWorkProofFile(null);
                                                    }}
                                                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                                    title="Update Task"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    onClick={() => setViewTask(task)}
                                                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                                    title="View Details"
                                                >
                                                    <FaEye />
                                                </button>
                                            </div>
                                        </td>
                                        
                                    </motion.tr>
                                );
                            })}
                            </AnimatePresence>
                            {tasks.filter(t => !t.isDeleted).length === 0 && (
                                <tr>
                                    <td colSpan="8" className="text-center p-8 text-gray-500">No tasks found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="sm:hidden space-y-3">
                    {tasks.filter(t => !t.isDeleted).map(task => {
                        const assignee = task.assignedTo;
                        const assigneeName = assignee?.userId?.name || "Unassigned";
                        let statusColor = 'bg-gray-100 text-gray-800';
                        if (task.status === 'Completed') statusColor = 'bg-pink-100 text-pink-800';
                        if (task.status === 'In Progress') statusColor = 'bg-orange-100 text-orange-800';
                        if (task.status === 'Overdue') statusColor = 'bg-purple-100 text-purple-800';
                        if (task.status === 'Assigned') statusColor = 'bg-blue-100 text-blue-800';
                        return (
                            <div key={task._id} className="bg-white rounded-xl shadow border p-4">
                                <div className="flex justify-between items-start">
                                    <div className="font-semibold text-gray-800">{task.title}</div>
                                    <button 
                                        onClick={() => {
                                            setEditingTask(task);
                                            setNewTaskStatus(task.status);
                                            setNewTaskRemark(task.description || "");
                                            setWorkProofFile(null);
                                        }}
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
                                    >
                                        {task.status}
                                    </button>
                                </div>
                                <div className="mt-2 text-sm text-gray-600">
                                    <div>Assigned To: <span className="font-medium">{assigneeName}</span></div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div>Start: {task.startDate ? new Date(task.startDate).toLocaleDateString() : '-'}</div>
                                        <div>Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}</div>
                                    </div>
                                    {task.description && (
                                        <div className="mt-2 text-gray-500">
                                            {task.description}
                                        </div>
                                    )}
                                </div>
                                {task.workProof && (
                                    <a
                                        href={getDocumentUrl(task.workProof)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-block text-blue-600 font-medium"
                                    >
                                        View Doc
                                    </a>
                                )}
                                <div className="flex justify-end gap-3 mt-3 border-t pt-3">
                                    <button 
                                        onClick={() => {
                                            setEditingTask(task);
                                            setNewTaskStatus(task.status);
                                            setNewTaskRemark(task.description || "");
                                            setWorkProofFile(null);
                                        }}
                                        className="text-blue-600 text-sm font-medium flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg"
                                    >
                                        <FaEdit /> Update
                                    </button>
                                    <button 
                                        onClick={() => setViewTask(task)}
                                        className="text-gray-600 text-sm font-medium flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-lg"
                                    >
                                        <FaEye /> View
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {tasks.filter(t => !t.isDeleted).length === 0 && (
                        <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
                            No tasks found.
                        </div>
                    )}
                </div>
            </motion.div>
        )}

        {activeTab === 'team' && (
            <motion.div
                key="team"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
            >
            {/* Add Members Section (Admin Only) - Inline Multi-select */}
            {user?.role?.includes('admin') && (
                <div className="bg-white p-4 rounded-xl shadow-md mb-6">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Add Team Members</h3>
                    <div className="flex flex-col gap-4">
                        <input
                            type="text"
                            placeholder="Search employees to add..."
                            className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        
                        <div className="border rounded-lg max-h-60 overflow-y-auto p-2 bg-gray-50">
                            {searchTerm && employees
                            .filter(emp => {
                                const isAlreadyMember = memberStats.some(stat => stat.member._id === emp._id);
                                if (isAlreadyMember) return false;
                                
                                // Handle role array and allow team_lead to be added as member too
                                const empRoles = Array.isArray(emp.userId.role) ? emp.userId.role : [emp.userId.role];
                                if (!empRoles.some(r => ['employee', 'team_lead'].includes(r))) return false;

                                const searchLower = searchTerm.toLowerCase();
                                const nameMatch = emp.userId?.name?.toLowerCase().includes(searchLower);
                                const idMatch = emp.employeeId.toLowerCase().includes(searchLower);
                                return nameMatch || idMatch;
                            })
                            .map(emp => (
                                <motion.div 
                                    key={emp._id} 
                                    whileHover={{ backgroundColor: "#EFF6FF" }}
                                    className={`flex items-center p-2 border-b last:border-0 cursor-pointer rounded-md ${selectedEmployees.includes(emp._id) ? 'bg-blue-50' : ''}`}
                                    onClick={() => toggleEmployeeSelection(emp._id)}
                                >
                                    <input 
                                        type="checkbox"
                                        checked={selectedEmployees.includes(emp._id)}
                                        onChange={() => {}} // Handled by div click
                                        className="mr-3 h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <div>
                                        <div className="font-medium text-gray-800">{emp.userId?.name || 'Unknown'}</div>
                                        <div className="text-xs text-gray-500">{emp.employeeId}</div>
                                    </div>
                                </motion.div>
                            ))}
                            {!searchTerm && selectedEmployees.length > 0 && (
                                <div className="text-gray-500 text-sm mb-2 font-medium">Selected employees:</div>
                            )}
                            {/* Show selected employees even if not searching */}
                            {employees
                                .filter(emp => selectedEmployees.includes(emp._id))
                                .map(emp => (
                                     <motion.div 
                                    key={emp._id} 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="flex items-center p-2 bg-blue-50 border-b last:border-0 cursor-pointer rounded-md mb-1"
                                    onClick={() => toggleEmployeeSelection(emp._id)}
                                >
                                    <input 
                                        type="checkbox"
                                        checked={true}
                                        onChange={() => {}} 
                                        className="mr-3 h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <div>
                                        <div className="font-medium text-blue-800">{emp.userId?.name || 'Unknown'}</div>
                                        <div className="text-xs text-blue-600">{emp.employeeId}</div>
                                    </div>
                                </motion.div>
                                ))
                            }
                            
                            {searchTerm && employees.filter(emp => {
                                const isAlreadyMember = memberStats.some(stat => stat.member._id === emp._id);
                                if (isAlreadyMember) return false;
                                
                                // Handle role array and allow team_lead to be added as member too
                                const empRoles = Array.isArray(emp.userId.role) ? emp.userId.role : [emp.userId.role];
                                if (!empRoles.some(r => ['employee', 'team_lead'].includes(r))) return false;

                                const searchLower = searchTerm.toLowerCase();
                                return emp.userId.name.toLowerCase().includes(searchLower) || emp.employeeId.toLowerCase().includes(searchLower);
                            }).length === 0 && (
                                 <p className="text-gray-500 text-center py-4">No employees found matching "{searchTerm}"</p>
                            )}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleAddMembers}
                            disabled={selectedEmployees.length === 0}
                            className={`px-4 py-2 rounded-lg text-white font-bold transition-all shadow-md ${
                                selectedEmployees.length > 0 
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg' 
                                : 'bg-gray-300 cursor-not-allowed'
                            }`}
                        >
                            Add Selected Members ({selectedEmployees.length})
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Stats Section - Converted to Table */}
            <h3 className="text-xl font-bold mb-4 text-gray-800">Team Members</h3>
            <div className="bg-white rounded-xl shadow-xl overflow-x-auto mb-8 hidden sm:block">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tasks</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                            
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {memberStats.map((stat, index) => (
                            <motion.tr 
                                key={stat.member._id} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="hover:bg-blue-50 cursor-pointer transition-colors"
                                onClick={() => setSelectedMember(stat)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-bold text-gray-900">{stat.member?.userId?.name || 'Unknown'}</div>
                                    <div className="text-xs text-gray-500">{stat.member?.employeeId}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {stat.totalTasks}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-green-600 text-xs font-medium">Completed: {stat.completed}</span>
                                        <span className="text-yellow-600 text-xs font-medium">Pending: {stat.pending}</span>
                                        <span className="text-red-600 text-xs font-medium">Overdue: {stat.overdue}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap align-middle">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[100px] overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stat.progress}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="bg-blue-600 h-2.5 rounded-full" 
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500 mt-1 block font-medium">{stat.progress}%</span>
                                </td>

                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="sm:hidden space-y-3 mb-8">
                {memberStats.map((stat) => (
                    <div 
                        key={stat.member._id} 
                        className="bg-white rounded-xl shadow border p-4 cursor-pointer"
                        onClick={() => setSelectedMember(stat)}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="font-bold text-gray-900">{stat.member?.userId?.name || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">{stat.member?.employeeId}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-600">Total: <span className="font-semibold">{stat.totalTasks}</span></div>
                                <div className="w-24 bg-gray-200 rounded-full h-2 mt-1 overflow-hidden">
                                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${stat.progress}%` }} />
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{stat.progress}%</div>
                            </div>
                        </div>
                        <div className="mt-3 flex gap-3 text-xs">
                            <span className="text-green-600 font-medium">Completed {stat.completed}</span>
                            <span className="text-yellow-600 font-medium">Pending {stat.pending}</span>
                            <span className="text-red-600 font-medium">Overdue {stat.overdue}</span>
                        </div>
                    </div>
                ))}
            </div>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-center z-50"
        >
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">{selectedMember.member?.userId?.name || 'Unknown'} - Details</h3>
                    <button onClick={() => setSelectedMember(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors">&times;</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Employee Info */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-lg mb-4 text-gray-700">Employee Info</h4>
                        <div className="space-y-2">
                            <p className="flex justify-between border-b pb-2"><span className="text-gray-600">ID:</span> <span className="font-semibold">{selectedMember.member?.employeeId}</span></p>
                            <p className="flex justify-between pt-2"><span className="text-gray-600">Email:</span> <span className="font-semibold">{selectedMember.member?.userId?.email}</span></p>
                        </div>
                    </div>

                    {/* Task Stats */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-lg mb-4 text-gray-700">Task Statistics</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                <p className="text-gray-500 text-sm mb-1">Total</p>
                                <p className="text-2xl font-bold text-gray-800">{selectedMember.totalTasks}</p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm border-b-4 border-green-500">
                                <p className="text-gray-500 text-sm mb-1">Completed</p>
                                <p className="text-2xl font-bold text-green-600">{selectedMember.completed}</p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm border-b-4 border-yellow-500">
                                <p className="text-gray-500 text-sm mb-1">Pending</p>
                                <p className="text-2xl font-bold text-yellow-600">{selectedMember.pending}</p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm border-b-4 border-red-500">
                                <p className="text-gray-500 text-sm mb-1">Overdue</p>
                                <p className="text-2xl font-bold text-red-600">{selectedMember.overdue}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Employee Tasks Section */}
                <div className="mb-6">
                    <h4 className="font-bold text-xl mb-4 text-gray-800">
                        Employee Tasks
                    </h4>
                    {memberTasks && memberTasks.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Task Title</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Priority</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Start Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Deadline</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {memberTasks.map((task) => (
                                        <tr key={task._id} className={task.isDeleted ? "bg-red-50" : "hover:bg-gray-50 transition-colors"}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-sm text-gray-900">
                                                    {task.title}
                                                    {task.isDeleted && <span className="text-red-600 font-bold text-xs ml-2">(Deleted)</span>}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate max-w-[200px] mt-1">{task.description}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs text-white font-medium ${
                                                    task.priority === 'High' ? 'bg-red-500' : 
                                                    task.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                                                }`}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {task.startDate ? new Date(task.startDate).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                                                <button 
                                                    onClick={() => {
                                                        setEditingTask(task);
                                                        setNewTaskStatus(task.status);
                                                        setNewTaskRemark(task.description || "");
                                                        setWorkProofFile(null);
                                                    }}
                                                    className="hover:underline focus:outline-none"
                                                >
                                                    {task.status}
                                                </button>
                                            </td>

                                            
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500 italic text-center py-4 bg-gray-50 rounded-lg">
                            No tasks assigned to this employee.
                        </p>
                    )}
                </div>

                <div className="flex justify-end mt-6">
                    <button 
                        onClick={() => setSelectedMember(null)}
                        className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60]"
        >
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-6 rounded-2xl shadow-2xl w-96"
            >
                <h3 className="text-xl font-bold mb-4 text-gray-800">Update Task</h3>
                <form onSubmit={handleStatusUpdate}>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2 text-gray-700">Task Title</label>
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-700 text-sm border border-gray-100">{editingTask.title}</p>
                        {editingTask.workProof && (
                            <p className="mt-2 text-sm">
                                <span className="font-bold text-gray-700">Work Proof: </span>
                                <a 
                                    href={`${API_BASE}/${editingTask.workProof}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 hover:underline font-medium"
                                >
                                    View Attached File
                                </a>
                            </p>
                        )}
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2 text-gray-700">Attach File (Work Proof)</label>
                        <input 
                            type="file" 
                            className="w-full border p-2 rounded-lg"
                            onChange={(e) => setWorkProofFile(e.target.files[0])}
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2 text-gray-700">Status</label>
                        <select 
                            className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <div className="mb-6">
                        <label className="block text-sm font-bold mb-2 text-gray-700">Remark</label>
                        <textarea 
                            className="w-full border p-2 rounded-lg h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={newTaskRemark}
                            onChange={(e) => setNewTaskRemark(e.target.value)}
                            placeholder="Add remarks..."
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setEditingTask(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">Update</button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Assign Task Modal */}
      <AnimatePresence>
      {showTaskModal && (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-center"
        >
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="bg-white/95 p-8 rounded-2xl shadow-2xl ring-1 ring-gray-200 w-full max-w-2xl m-4"
            >
                <h3 className="text-xl font-bold mb-4 text-gray-800">Assign Task</h3>
                <form onSubmit={handleAssignTask} className="space-y-4">
                    <input 
                        type="text" placeholder="Task Title" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={taskData.title} onChange={(e) => setTaskData({...taskData, title: e.target.value})} required
                    />
                    <textarea 
                        placeholder="Remark" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={taskData.description} onChange={(e) => setTaskData({...taskData, description: e.target.value})}
                    />
                    <select 
                        className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={taskData.priority} onChange={(e) => setTaskData({...taskData, priority: e.target.value})}
                    >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                    <div className="relative">
                        <button 
                            type="button"
                            className="w-full border p-3 rounded-lg text-left bg-white flex justify-between items-center focus:ring-2 focus:ring-blue-500"
                            onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                        >
                            <span className="truncate text-gray-700">
                                {taskData.assignedTo.length === 0 
                                    ? "Select Member" 
                                    : `${taskData.assignedTo.length} member(s) selected`}
                            </span>
                            <span className="text-gray-500">▼</span>
                        </button>
                        <AnimatePresence>
                        {isMemberDropdownOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="absolute z-10 w-full bg-white border rounded-lg shadow-xl max-h-60 overflow-y-auto mt-1"
                            >
                                <div 
                                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b"
                                    onClick={toggleSelectAllMembers}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={isAllSelected()}
                                        onChange={() => {}}
                                        className="mr-3 h-4 w-4 rounded text-blue-600"
                                    />
                                    <span className="text-sm">Select All</span>
                                </div>
                                {memberStats.map(stat => (
                                    <div 
                                        key={stat.member._id} 
                                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                                        onClick={() => toggleTaskMemberSelection(stat.member._id)}
                                    >
                                        <input 
                                            type="checkbox" 
                                            checked={taskData.assignedTo.includes(stat.member._id)}
                                            onChange={() => {}} 
                                            className="mr-3 h-4 w-4 rounded text-blue-600"
                                        />
                                        <span className="text-sm">{stat.member?.userId?.name || 'Unknown'} <span className="text-gray-500 text-xs">({stat.member?.employeeId})</span></span>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold block mb-1 text-gray-600 uppercase">Start Date</label>
                            <input 
                                type="date" className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                                value={taskData.startDate} onChange={(e) => setTaskData({...taskData, startDate: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold block mb-1 text-gray-600 uppercase">Deadline</label>
                            <input 
                                type="date" className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                                value={taskData.deadline} onChange={(e) => setTaskData({...taskData, deadline: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowTaskModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-medium hover:bg-gray-300 transition-colors">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={isAssigning}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${isAssigning ? 'bg-teal-300 text-white cursor-not-allowed' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                        >
                            {isAssigning ? 'Assigning...' : 'Assign'}
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60]"
        >
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md m-4"
            >
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Task Details</h3>
                    <button onClick={() => setViewTask(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors">&times;</button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Title</label>
                        <p className="text-gray-900 font-medium bg-gray-50 p-3 rounded-lg border border-gray-100">{viewTask.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Status</label>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                viewTask.status === 'Completed' ? 'bg-pink-100 text-pink-800' :
                                viewTask.status === 'In Progress' ? 'bg-orange-100 text-orange-800' :
                                viewTask.status === 'Overdue' ? 'bg-purple-100 text-purple-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                                {viewTask.status}
                            </span>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Priority</label>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                viewTask.priority === 'High' ? 'bg-red-500 text-white' : 
                                viewTask.priority === 'Medium' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
                            }`}>
                                {viewTask.priority || 'Medium'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Start Date</label>
                            <p className="text-gray-700">{viewTask.startDate ? new Date(viewTask.startDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Due Date</label>
                            <p className="text-gray-700">{viewTask.deadline ? new Date(viewTask.deadline).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Assigned To</label>
                        <p className="text-gray-900">{viewTask.assignedTo?.userId?.name || "Unassigned"}</p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Description / Remark</label>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[3rem] text-sm">
                            {viewTask.description || "No description provided."}
                        </p>
                    </div>

                    {viewTask.workProof && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Work Proof</label>
                            <a
                                href={getDocumentUrl(viewTask.workProof)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                            >
                                <FaEye /> View Attached Document
                            </a>
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-6">
                    <button 
                        onClick={() => setViewTask(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60]"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Documents - {docsModal.employeeName}</h3>
              <button onClick={() => setDocsModal({ open: false, documents: [], employeeName: "" })} className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors">&times;</button>
            </div>
            {docsLoading ? (
              <div className="p-8 text-center text-gray-600">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  Loading...
              </div>
            ) : docsModal.documents.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">No documents uploaded</div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">File Name</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">File</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {docsModal.documents.map(doc => (
                        <tr key={doc._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{doc.originalName}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              doc.status === 'Approved' ? 'bg-green-100 text-green-800' :
                              doc.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>{doc.status || 'Pending'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <a 
                              href={getDocumentUrl(doc.fileUrl)} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 font-medium"
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
