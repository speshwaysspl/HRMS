import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCandidates, updateCandidate } from "../../redux/slices/candidateSlice";
import { toast } from "react-toastify";
import {
  FaSearch,
  FaCalendarAlt,
  FaVideo,
  FaCheck,
  FaEdit,
  FaClock,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaUser
} from "react-icons/fa";

const InterviewScheduler = () => {
  const dispatch = useDispatch();
  const { list: candidates, loading } = useSelector((state) => state.candidates);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'pending', 'scheduled', 'completed'
  const [selectedCandidate, setSelectedCandidate] = useState(null); // for scheduling modal
  const [showModal, setShowModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [zoomLink, setZoomLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch all candidates without status filter so we can do tab filtering locally
  useEffect(() => {
    dispatch(fetchCandidates({ page: 1, limit: 100, search: "" }));
  }, [dispatch]);

  const handleOpenScheduleModal = (candidate) => {
    setSelectedCandidate(candidate);
    
    // Format date for datetime-local input YYYY-MM-DDTHH:MM
    let initialDate = "";
    if (candidate.interviewDate) {
      const dateObj = new Date(candidate.interviewDate);
      if (!isNaN(dateObj.getTime())) {
        const pad = (num) => String(num).padStart(2, "0");
        const year = dateObj.getFullYear();
        const month = pad(dateObj.getMonth() + 1);
        const day = pad(dateObj.getDate());
        const hours = pad(dateObj.getHours());
        const minutes = pad(dateObj.getMinutes());
        initialDate = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    }
    
    setInterviewDate(initialDate);
    setZoomLink(candidate.zoomMeetingLink || "");
    setShowModal(true);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!interviewDate || !zoomLink) {
      toast.warning("Please fill in both the Date/Time and Zoom meeting link.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    // Maintain candidate fields
    formData.append("fullName", selectedCandidate.fullName);
    formData.append("email", selectedCandidate.email);
    formData.append("mobileNumber", selectedCandidate.mobileNumber);
    formData.append("position", selectedCandidate.position);
    formData.append("department", selectedCandidate.department?._id || selectedCandidate.department || "");
    
    // Set scheduling fields & status
    formData.append("status", "Interview Scheduled");
    formData.append("interviewDate", new Date(interviewDate).toISOString());
    formData.append("zoomMeetingLink", zoomLink);

    try {
      const resultAction = await dispatch(
        updateCandidate({ id: selectedCandidate._id, formData })
      );
      if (updateCandidate.fulfilled.match(resultAction)) {
        toast.success("Interview scheduled successfully! Invitation email sent.");
        setShowModal(false);
        setSelectedCandidate(null);
        dispatch(fetchCandidates({ page: 1, limit: 100, search: "" }));
      } else {
        toast.error(resultAction.payload || "Failed to schedule interview.");
      }
    } catch (err) {
      toast.error("An error occurred while scheduling the interview.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkCompleted = async (candidate) => {
    if (!window.confirm(`Are you sure you want to mark the interview for ${candidate.fullName} as Completed?`)) {
      return;
    }

    const formData = new FormData();
    formData.append("fullName", candidate.fullName);
    formData.append("email", candidate.email);
    formData.append("mobileNumber", candidate.mobileNumber);
    formData.append("position", candidate.position);
    formData.append("department", candidate.department?._id || candidate.department || "");
    formData.append("status", "Interview Completed");

    try {
      const resultAction = await dispatch(
        updateCandidate({ id: candidate._id, formData })
      );
      if (updateCandidate.fulfilled.match(resultAction)) {
        toast.success("Interview marked as Completed successfully.");
        dispatch(fetchCandidates({ page: 1, limit: 100, search: "" }));
      } else {
        toast.error(resultAction.payload || "Failed to update status.");
      }
    } catch (err) {
      toast.error("An error occurred while updating the status.");
    }
  };

  // Helper filter logic
  const filteredCandidates = candidates.filter((c) => {
    // Search match
    const searchLower = search.toLowerCase();
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchLower) ||
      c.email.toLowerCase().includes(searchLower) ||
      c.candidateId.toLowerCase().includes(searchLower) ||
      c.position.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    // Tab filter match
    // Only display candidates who are in interview stages
    const interviewStages = ["Applied", "Screening", "Interview Scheduled", "Interview Completed"];
    if (!interviewStages.includes(c.status)) return false;

    if (activeTab === "pending") {
      return c.status === "Applied" || c.status === "Screening";
    }
    if (activeTab === "scheduled") {
      return c.status === "Interview Scheduled";
    }
    if (activeTab === "completed") {
      return c.status === "Interview Completed";
    }
    return true; // activeTab === 'all'
  });

  const getStatusBadge = (statusVal) => {
    switch (statusVal) {
      case "Interview Scheduled":
        return "bg-yellow-500/15 text-yellow-500 border-yellow-500/20";
      case "Interview Completed":
        return "bg-green-500/15 text-green-400 border-green-500/20";
      case "Screening":
        return "bg-blue-500/15 text-blue-400 border-blue-500/20";
      case "Applied":
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/20";
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Interview Scheduler</h2>
        <p className="text-sm text-slate-400 mt-1">
          Manage interview timings, Zoom calls, and lifecycle stages for prospective candidates.
        </p>
      </div>

      {/* Search and Tabs Row */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-5 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input
            type="text"
            placeholder="Search candidates..."
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-10 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Custom Tab Filters */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 w-full md:w-auto">
          {[
            { id: "all", label: "All Interviews" },
            { id: "pending", label: "Pending Schedule" },
            { id: "scheduled", label: "Scheduled" },
            { id: "completed", label: "Completed" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 md:flex-none text-xs font-semibold py-2 px-4 rounded-lg transition ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/40 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Candidate</th>
                <th className="py-4 px-6">Position</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Interview Time (IST)</th>
                <th className="py-4 px-6">Zoom Link</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading candidates...
                  </td>
                </tr>
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No candidates found for the selected tab.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => (
                  <tr key={c._id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-white/10">
                          <FaUser size={14} />
                        </div>
                        <div>
                          <div className="font-semibold text-white">{c.fullName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-white">{c.position}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${getStatusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {c.interviewDate ? (
                        <div className="flex items-center gap-1.5 text-white font-medium">
                          <FaClock className="text-blue-400 text-xs" />
                          {formatDateTime(c.interviewDate)}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Not Scheduled</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {c.zoomMeetingLink ? (
                        <a
                          href={c.zoomMeetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                        >
                          <FaVideo /> Join Link
                        </a>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenScheduleModal(c)}
                        className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-2 rounded-lg transition"
                      >
                        <FaCalendarAlt size={11} />
                        {c.interviewDate ? "Reschedule" : "Schedule"}
                      </button>
                      {c.status === "Interview Scheduled" && (
                        <button
                          onClick={() => handleMarkCompleted(c)}
                          className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-3 py-2 rounded-lg transition"
                        >
                          <FaCheck size={11} />
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      {showModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedCandidate(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <FaTimes size={18} />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">
              {selectedCandidate.interviewDate ? "Reschedule Interview" : "Schedule Interview"}
            </h3>

            <div className="mb-4 p-3 bg-slate-950 rounded-xl border border-white/5 text-sm space-y-1">
              <div>
                <span className="text-slate-500">Candidate:</span>{" "}
                <span className="font-semibold text-white">{selectedCandidate.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500">Position:</span>{" "}
                <span className="font-semibold text-white">{selectedCandidate.position}</span>
              </div>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Interview Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Zoom Call Link *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://zoom.us/j/..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500"
                  value={zoomLink}
                  onChange={(e) => setZoomLink(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedCandidate(null);
                  }}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewScheduler;
