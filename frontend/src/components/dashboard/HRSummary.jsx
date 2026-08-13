import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchHRDashboardSummary } from "../../redux/slices/hrDashboardSlice";
import { API_BASE } from "../../utils/apiConfig";
import axios from "axios";
import CountUp from "react-countup";
import { motion, AnimatePresence } from "framer-motion";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  FaUsers,
  FaCheckCircle,
  FaHourglassHalf,
  FaTimesCircle,
  FaFileInvoiceDollar,
  FaCalendarAlt,
  FaFileExcel,
  FaPlus,
  FaCheck,
  FaTimes,
  FaUserCheck,
  FaClock,
  FaHome,
  FaArrowRight,
  FaSpinner,
  FaFileAlt
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import EmptyState from "../common/EmptyState";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";

const PIE_COLORS = ["#2c3968", "#337038", "#8898cd", "#5da562", "#c9a227", "#b0bbdf"];

const StatCard = ({ icon: Icon, title, count, colorClass, onClick }) => {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onClick}
      className="rounded-xl border border-surface-subtle p-5 md:p-6 shadow-card bg-white text-ink cursor-pointer transition-shadow hover:shadow-panel"
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="text-ink-muted text-xs md:text-sm font-medium uppercase tracking-wider mb-1">
            {title}
          </p>
          <h3 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight">
            <CountUp end={count} duration={1.5} separator="," />
          </h3>
        </div>
        <div className={`p-3 md:p-4 rounded-xl bg-surface-muted ${colorClass}`}>
          <Icon className="text-xl md:text-2xl" />
        </div>
      </div>
    </motion.div>
  );
};

const HRSummary = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Fetch data from Redux slice
  const { kpis, recruitment, pendingActions, attendance, leaves, payroll, calendarEvents, loading, error } = useSelector(
    (state) => state.hrDashboard
  );

  // Helper to get unique candidates with pending documents
  const getUniquePendingCandidates = () => {
    if (!pendingActions?.documentsPending) return [];
    const seen = new Set();
    const uniqueCandidates = [];
    
    pendingActions.documentsPending.forEach((doc) => {
      const candidate = doc.candidateId;
      if (candidate && candidate._id && !seen.has(candidate._id)) {
        seen.add(candidate._id);
        uniqueCandidates.push(candidate);
      }
    });
    
    return uniqueCandidates;
  };

  const uniquePendingCandidates = getUniquePendingCandidates();

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [activeActionsTab, setActiveActionsTab] = useState("verifications");
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  
  // Modals/Verification inputs
  const [verificationComments, setVerificationComments] = useState("");
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Calendar Edit & Write Onboarding states
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingDate, setOnboardingDate] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [candidatesList, setCandidatesList] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [onboardingModalLoading, setOnboardingModalLoading] = useState(false);

  const fetchCandidatesForOnboarding = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/recruitment/candidates`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (response.data.success) {
        setCandidatesList(response.data.candidates || []);
      }
    } catch (err) {
      console.error("Error fetching candidates for onboarding:", err);
      toast.error("Failed to load candidates list");
    }
  };

  useEffect(() => {
    dispatch(fetchHRDashboardSummary());
    fetchCandidatesForOnboarding();
  }, [dispatch]);

  const handleDateClick = (dateStr) => {
    setOnboardingDate(dateStr);
    setSelectedCandidateId("");
    setIsEditMode(false);
    setShowOnboardingModal(true);
  };

  const handleEventClick = (event) => {
    const type = event.extendedProps.type;
    const candidateId = event.extendedProps.candidateId;
    const dateStr = event.startStr.split("T")[0];

    if (type === "onboarding" || type === "interview" || type === "joining") {
      if (!candidateId) {
        toast.info(`Event: ${event.title}`);
        return;
      }
      setSelectedCandidateId(candidateId);
      setOnboardingDate(dateStr);
      setIsEditMode(true);
      setShowOnboardingModal(true);
    } else {
      toast.info(`Event: ${event.title}`);
    }
  };

  const handleSaveOnboarding = async (e) => {
    e.preventDefault();
    if (!selectedCandidateId) {
      toast.warn("Please select a candidate");
      return;
    }
    if (!onboardingDate) {
      toast.warn("Please select a date");
      return;
    }

    try {
      setOnboardingModalLoading(true);
      const response = await axios.put(
        `${API_BASE}/api/recruitment/candidate/${selectedCandidateId}`,
        { expectedJoiningDate: onboardingDate },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (response.data.success) {
        toast.success(
          isEditMode
            ? "Onboarding date updated successfully!"
            : "Onboarding date scheduled successfully!"
        );
        setShowOnboardingModal(false);
        dispatch(fetchHRDashboardSummary());
      } else {
        toast.error(response.data.error || "Failed to save onboarding date");
      }
    } catch (err) {
      console.error("Error saving onboarding date:", err);
      toast.error(err.response?.data?.error || "Error saving onboarding date");
    } finally {
      setOnboardingModalLoading(false);
    }
  };

  const handleCancelOnboarding = async () => {
    if (!selectedCandidateId) return;

    if (!window.confirm("Are you sure you want to clear this onboarding schedule?")) {
      return;
    }

    try {
      setOnboardingModalLoading(true);
      const response = await axios.put(
        `${API_BASE}/api/recruitment/candidate/${selectedCandidateId}`,
        { expectedJoiningDate: "" },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (response.data.success) {
        toast.success("Onboarding date cleared successfully!");
        setShowOnboardingModal(false);
        dispatch(fetchHRDashboardSummary());
      } else {
        toast.error(response.data.error || "Failed to clear onboarding date");
      }
    } catch (err) {
      console.error("Error clearing onboarding date:", err);
      toast.error(err.response?.data?.error || "Error clearing onboarding date");
    } finally {
      setOnboardingModalLoading(false);
    }
  };

  const handleExport = async (reportType) => {
    try {
      setExportDropdownOpen(false);
      toast.info(`Generating ${reportType} report...`);
      
      const response = await axios.get(`${API_BASE}/api/hr-dashboard/export?reportType=${reportType}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        responseType: "blob"
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `HRMS_${reportType}_Report.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report downloaded!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to download report. Please try again.");
    }
  };

  const handleVerifyDocument = async (id, status) => {
    if (!verificationComments && status === "Rejected") {
      toast.warn("Please add comments explaining the reason for rejection.");
      return;
    }
    try {
      const response = await axios.put(
        `${API_BASE}/api/document/${id}/status`,
        { status, comments: verificationComments || "Verified via HR Command Center" },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      if (response.data.success) {
        toast.success(`Document ${status === "Approved" ? "Approved" : "Rejected"} successfully!`);
        setShowVerifyModal(false);
        setVerificationComments("");
        setSelectedDocId(null);
        dispatch(fetchHRDashboardSummary());
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Error verifying document");
    }
  };

  const handleConvertCandidate = (candidate) => {
    toast.info(`Converting candidate: ${candidate.fullName}`);
    navigate(`/hr-dashboard/candidates/${candidate._id}`);
  };

  if (loading && !kpis) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh]">
        <LoadingState message="Analyzing command center records…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10 max-w-lg mx-auto">
        <ErrorState
          title="Error Loading Dashboard"
          message={error}
          onRetry={() => dispatch(fetchHRDashboardSummary())}
        />
      </div>
    );
  }

  // Formatting events for FullCalendar
  const formattedEvents = calendarEvents?.map((evt) => ({
    title: evt.title,
    start: evt.start ? evt.start.split("T")[0] : "",
    allDay: true,
    backgroundColor: evt.color,
    borderColor: evt.color,
    extendedProps: { 
      type: evt.type,
      candidateId: evt.candidateId,
      offerId: evt.offerId
    }
  })) || [];

  return (
    <div className="p-4 md:p-6 bg-surface-muted min-h-screen text-ink">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />

      {/* Header Block */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 bg-brand-800 p-6 md:p-8 rounded-2xl shadow-panel text-white">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            HR Command Center
          </h2>
          <p className="text-brand-100 text-sm mt-1">
            Real-time hiring status, aggregates, onboarding checklists, and automated schedules.
          </p>
        </div>
        <div className="flex items-center gap-3 self-end lg:self-auto relative">
          <button
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg shadow-sm transition-colors duration-150 font-medium"
          >
            <FaFileExcel className="text-lg" />
            <span>Export Reports</span>
          </button>

          <AnimatePresence>
            {exportDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 top-14 w-52 bg-white text-ink border border-surface-subtle rounded-xl shadow-panel z-50 overflow-hidden"
              >
                <div className="py-1">
                  <button
                    onClick={() => handleExport("recruitment")}
                    className="w-full text-left px-4 py-3 hover:bg-surface-muted text-sm font-medium transition-colors"
                  >
                    Recruitment Funnel
                  </button>
                  <button
                    onClick={() => handleExport("offers")}
                    className="w-full text-left px-4 py-3 hover:bg-surface-muted text-sm font-medium transition-colors"
                  >
                    Offers Tracker
                  </button>
                  <button
                    onClick={() => handleExport("employees")}
                    className="w-full text-left px-4 py-3 hover:bg-surface-muted text-sm font-medium transition-colors"
                  >
                    Active Employees
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
          <StatCard
            icon={FaUsers}
            title="Total Candidates"
            count={kpis.totalCandidates}
            colorClass="text-blue-500"
            gradient="from-blue-600 to-blue-800"
            onClick={() => navigate("/hr-dashboard/candidates")}
          />
          <StatCard
            icon={FaCheckCircle}
            title="Selected Candidates"
            count={kpis.selectedCandidates}
            colorClass="text-emerald-500"
            gradient="from-teal-600 to-emerald-700"
            onClick={() => navigate("/hr-dashboard/candidates?status=Selected")}
          />
          <StatCard
            icon={FaHourglassHalf}
            title="Pending Onboarding"
            count={kpis.pendingOnboarding}
            colorClass="text-orange-500"
            gradient="from-amber-600 to-orange-700"
            onClick={() => navigate("/hr-dashboard/candidates?status=Pre-Onboarding")}
          />
          <StatCard
            icon={FaFileAlt}
            title="Verification Pending"
            count={kpis.pendingVerification}
            colorClass="text-purple-500"
            gradient="from-purple-600 to-indigo-700"
            onClick={() => navigate("/hr-dashboard/profiles")}
          />
          <StatCard
            icon={FaFileInvoiceDollar}
            title="Offers Sent"
            count={kpis.offersSent}
            colorClass="text-sky-500"
            gradient="from-sky-600 to-blue-700"
            onClick={() => navigate("/hr-dashboard/offer")}
          />
          <StatCard
            icon={FaCheckCircle}
            title="Offers Accepted"
            count={kpis.offersAccepted}
            colorClass="text-teal-500"
            gradient="from-teal-500 to-cyan-600"
            onClick={() => navigate("/hr-dashboard/offer")}
          />
          <StatCard
            icon={FaTimesCircle}
            title="Offers Rejected"
            count={kpis.offersRejected}
            colorClass="text-red-500"
            gradient="from-rose-600 to-red-700"
            onClick={() => navigate("/hr-dashboard/offer")}
          />

          <StatCard
            icon={FaCalendarAlt}
            title="New Joiners (Month)"
            count={kpis.newEmployeesThisMonth}
            colorClass="text-pink-500"
            gradient="from-pink-600 to-rose-700"
            onClick={() => navigate("/hr-dashboard")}
          />
        </div>
      )}

      {/* Analytics Charts */}
      {recruitment && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-surface-subtle rounded-xl shadow-card p-4 md:p-6">
            <h4 className="text-base font-semibold text-ink mb-4">Recruitment Funnel</h4>
            {recruitment.funnelData?.some((f) => f.count > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={recruitment.funnelData} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#5b6376" }} />
                  <YAxis type="category" dataKey="stage" width={130} tick={{ fontSize: 11, fill: "#5b6376" }} />
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#eef0f6", fontSize: 13 }} />
                  <Bar dataKey="count" fill="#337038" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No recruitment activity yet" message="Funnel stages will populate as candidates progress." />
            )}
          </div>

          <div className="bg-white border border-surface-subtle rounded-xl shadow-card p-4 md:p-6">
            <h4 className="text-base font-semibold text-ink mb-4">Payroll Status — {payroll?.month} {payroll?.year}</h4>
            {payroll && (payroll.payrollProcessed || payroll.payrollPending) ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Processed", value: payroll.payrollProcessed },
                      { name: "Pending", value: payroll.payrollPending },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    <Cell fill="#337038" />
                    <Cell fill="#dc2626" />
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#eef0f6", fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No payroll data" message="Payroll status appears once payslips are generated." />
            )}
          </div>

          <div className="bg-white border border-surface-subtle rounded-xl shadow-card p-4 md:p-6 lg:col-span-2">
            <h4 className="text-base font-semibold text-ink mb-4">Hiring Trend (Last 6 Months)</h4>
            {recruitment.monthlyHiringTrend?.some((m) => m.count > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={recruitment.monthlyHiringTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#5b6376" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5b6376" }} />
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#eef0f6", fontSize: 13 }} />
                  <Line type="monotone" dataKey="count" stroke="#2c3968" strokeWidth={2} name="New Hires" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No hiring activity yet" message="Hiring trend will appear once employees join." />
            )}
          </div>
        </div>
      )}


      {/* Action Queues (Verification, Conversion) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white border border-surface-subtle rounded-xl p-5 md:p-6 shadow-card">
          <div className="flex border-b border-surface-subtle mb-6">
            <button
              onClick={() => setActiveActionsTab("verifications")}
              className={`pb-3 pr-6 text-sm font-semibold border-b-2 transition-colors duration-150 ${
                activeActionsTab === "verifications"
                  ? "border-accent-600 text-accent-600"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Documents Pending ({uniquePendingCandidates.length})
            </button>
            <button
              onClick={() => setActiveActionsTab("conversions")}
              className={`pb-3 pr-6 text-sm font-semibold border-b-2 transition-colors duration-150 ${
                activeActionsTab === "conversions"
                  ? "border-accent-600 text-accent-600"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Employee Conversion Ready ({pendingActions?.conversionsPending?.length || 0})
            </button>
          </div>

          <div>
            {activeActionsTab === "verifications" && (
              <div className="space-y-4">
                {uniquePendingCandidates.length > 0 ? (
                  uniquePendingCandidates.map((candidate) => (
                    <div
                      key={candidate._id}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-surface-muted border border-surface-subtle rounded-xl gap-4 hover:shadow-card transition-shadow"
                    >
                      <div>
                        <h4
                          className="font-semibold text-ink text-sm cursor-pointer hover:text-brand-600 transition-colors"
                          onClick={() => navigate(`/hr-dashboard/candidates/${candidate._id}`)}
                        >
                          {candidate.fullName}
                        </h4>
                        <p className="text-ink-muted text-xs mt-1">
                          Role: {candidate.position || "Unspecified"}
                        </p>
                        <button
                          onClick={() => navigate(`/hr-dashboard/candidates/${candidate._id}`)}
                          className="inline-block text-xs font-semibold text-brand-600 underline mt-2 hover:text-brand-700"
                        >
                          View Document Details
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="All caught up" message="No documents waiting for verification." />
                )}
              </div>
            )}

            {activeActionsTab === "conversions" && (
              <div className="space-y-4">
                {pendingActions?.conversionsPending && pendingActions.conversionsPending.length > 0 ? (
                  pendingActions.conversionsPending.map((candidate) => (
                    <div
                      key={candidate._id}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-surface-muted border border-surface-subtle rounded-xl gap-4 hover:shadow-card transition-shadow"
                    >
                      <div>
                        <h4 className="font-semibold text-ink text-sm">{candidate.fullName}</h4>
                        <p className="text-ink-muted text-xs mt-1">
                          Position: {candidate.position} | Department: {candidate.department?.dep_name || "General"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleConvertCandidate(candidate)}
                        className="w-full sm:w-auto px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <FaUserCheck /> Review Profile <FaArrowRight />
                      </button>
                    </div>
                  ))
                ) : (
                  <EmptyState title="Nothing to convert yet" message="No candidates ready for employee conversion." />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Summary Panels: Leaves, Attendance, Payroll */}
        <div className="bg-white border border-surface-subtle rounded-xl p-5 md:p-6 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink mb-6">
              Operational Summary
            </h3>

            {/* Attendance */}
            {attendance && (
              <div className="mb-6">
                <h4 className="text-xs font-semibold uppercase text-ink-faint tracking-wider mb-3 flex items-center gap-1.5">
                  <FaClock /> Attendance (Today)
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-accent-50 border border-accent-100 p-3 rounded-xl">
                    <p className="text-accent-800 font-semibold">{attendance.presentToday}</p>
                    <p className="text-accent-600 text-xs mt-0.5">Present</p>
                  </div>
                  <div className="bg-brand-50 border border-brand-100 p-3 rounded-xl">
                    <p className="text-brand-800 font-semibold">{attendance.wfhEmployees}</p>
                    <p className="text-brand-600 text-xs mt-0.5 flex items-center gap-1">
                      <FaHome /> WFH
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
                    <p className="text-amber-800 font-semibold">{attendance.lateEmployees}</p>
                    <p className="text-amber-600 text-xs mt-0.5">Late Arrivals</p>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl">
                    <p className="text-rose-800 font-semibold">{attendance.absentToday}</p>
                    <p className="text-rose-600 text-xs mt-0.5">Absent</p>
                  </div>
                </div>
              </div>
            )}

            {/* Leaves */}
            {leaves && (
              <div className="mb-6 border-t border-surface-subtle pt-6">
                <h4 className="text-xs font-semibold uppercase text-ink-faint tracking-wider mb-3 flex items-center gap-1.5">
                  <FaCalendarAlt /> Leaves Status
                </h4>
                <div className="flex justify-between text-sm">
                  <div className="text-center">
                    <p className="text-amber-600 font-semibold text-lg">{leaves.pendingLeaves}</p>
                    <p className="text-ink-muted text-xs">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-accent-600 font-semibold text-lg">{leaves.approvedLeaves}</p>
                    <p className="text-ink-muted text-xs">Approved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-rose-600 font-semibold text-lg">{leaves.rejectedLeaves}</p>
                    <p className="text-ink-muted text-xs">Rejected</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payroll */}
            {payroll && (
              <div className="border-t border-surface-subtle pt-6">
                <h4 className="text-xs font-semibold uppercase text-ink-faint tracking-wider mb-3 flex items-center gap-1.5">
                  <FaFileInvoiceDollar /> Payroll: {payroll.month} {payroll.year}
                </h4>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex-1 bg-surface-muted border border-surface-subtle p-3 rounded-xl">
                    <span className="text-accent-700 font-semibold">{payroll.payrollProcessed}</span>
                    <span className="text-ink-muted text-xs block mt-0.5">Payslips Processed</span>
                  </div>
                  <div className="flex-1 bg-surface-muted border border-surface-subtle p-3 rounded-xl">
                    <span className="text-rose-700 font-semibold">{payroll.payrollPending}</span>
                    <span className="text-ink-muted text-xs block mt-0.5">Pending Action</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="bg-white border border-surface-subtle rounded-2xl p-6 shadow-card mb-8">
        <h3 className="text-lg font-semibold text-ink mb-6">
          Joint Schedules & Recruitment Calendar
        </h3>
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={formattedEvents}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,dayGridWeek"
            }}
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              meridiem: false
            }}
            dateClick={(info) => {
              handleDateClick(info.dateStr);
            }}
            eventClick={(info) => {
              handleEventClick(info.event);
            }}
            height="auto"
          />
        </div>
      </div>

      {/* Floating Speed Dial menu */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          <AnimatePresence>
            {quickActionsOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="absolute right-0 bottom-16 bg-white border border-surface-subtle p-3 rounded-xl shadow-panel flex flex-col gap-2 min-w-[200px]"
              >
                <button
                  onClick={() => {
                    setQuickActionsOpen(false);
                    navigate("/hr-dashboard/candidates");
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-surface-muted rounded-lg text-ink transition-colors"
                >
                  <FaPlus className="text-accent-600" />
                  <span>Add Candidate</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setQuickActionsOpen(!quickActionsOpen)}
            className="w-14 h-14 bg-accent-600 hover:bg-accent-700 rounded-full flex items-center justify-center text-white shadow-panel transition-colors focus:outline-none"
          >
            <FaPlus className={`text-xl transition-transform duration-300 ${quickActionsOpen ? "rotate-45" : ""}`} />
          </motion.button>
        </div>
      </div>

      {/* Verify Document Modal */}
      <AnimatePresence>
        {showVerifyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl shadow-panel p-6 border border-surface-subtle"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-ink text-lg">Verify Document</h3>
                <button
                  onClick={() => {
                    setShowVerifyModal(false);
                    setSelectedDocId(null);
                    setVerificationComments("");
                  }}
                  className="text-ink-faint hover:text-ink-muted transition-colors p-1.5 hover:bg-surface-muted rounded-full"
                >
                  <FaTimes size={18} />
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-ink mb-1">
                  Comments / Remarks
                </label>
                <textarea
                  value={verificationComments}
                  onChange={(e) => setVerificationComments(e.target.value)}
                  placeholder="Enter comments (mandatory for rejection)..."
                  className="w-full border border-surface-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-shadow"
                  rows={4}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => handleVerifyDocument(selectedDocId, "Rejected")}
                  className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  <FaTimes /> Reject
                </button>
                <button
                  onClick={() => handleVerifyDocument(selectedDocId, "Approved")}
                  className="px-5 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  <FaCheck /> Approve
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Schedule Modal */}
      <AnimatePresence>
        {showOnboardingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl shadow-panel p-6 border border-surface-subtle text-ink"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-ink text-lg">
                  {isEditMode ? "Edit Onboarding Schedule" : "Schedule Candidate Onboarding"}
                </h3>
                <button
                  onClick={() => {
                    setShowOnboardingModal(false);
                    setSelectedCandidateId("");
                    setOnboardingDate("");
                  }}
                  className="text-ink-faint hover:text-ink-muted transition-colors p-1.5 hover:bg-surface-muted rounded-full"
                >
                  <FaTimes size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveOnboarding} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Candidate
                  </label>
                  <select
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    disabled={isEditMode}
                    className="w-full border border-surface-subtle rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-shadow disabled:bg-surface-muted disabled:text-ink-faint"
                    required
                  >
                    <option value="">Select Candidate...</option>
                    {candidatesList.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.fullName} - {c.position} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Onboarding Date
                  </label>
                  <input
                    type="date"
                    value={onboardingDate}
                    onChange={(e) => setOnboardingDate(e.target.value)}
                    className="w-full border border-surface-subtle rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-shadow"
                    required
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={handleCancelOnboarding}
                      disabled={onboardingModalLoading}
                      className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 text-sm font-semibold transition-colors flex items-center gap-1.5 mr-auto disabled:opacity-50"
                    >
                      Clear Schedule
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowOnboardingModal(false);
                      setSelectedCandidateId("");
                      setOnboardingDate("");
                    }}
                    className="px-4 py-2 border border-surface-subtle text-ink-muted rounded-lg hover:bg-surface-muted text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={onboardingModalLoading}
                    className="px-5 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {onboardingModalLoading ? "Saving..." : "Save Schedule"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HRSummary;
