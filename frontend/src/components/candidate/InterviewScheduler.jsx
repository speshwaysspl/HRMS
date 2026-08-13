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
import { SkeletonRow } from "../common/LoadingState";
import EmptyState from "../common/EmptyState";

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
        return "bg-amber-100 text-amber-700";
      case "Interview Completed":
        return "bg-accent-100 text-accent-700";
      case "Screening":
        return "bg-brand-50 text-brand-700";
      case "Applied":
      default:
        return "bg-surface-muted text-ink-muted";
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
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Interview Scheduler</h2>
        <p className="text-sm text-ink-muted mt-1">
          Manage interview timings, Zoom calls, and lifecycle stages for prospective candidates.
        </p>
      </div>

      {/* Search and Tabs Row */}
      <div className="rounded-xl border border-surface-subtle bg-white p-5 shadow-card flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" size={14} />
          <input
            type="text"
            placeholder="Search candidates..."
            className="w-full rounded-lg border border-surface-subtle bg-white px-10 py-2.5 text-sm text-ink placeholder-ink-faint outline-none focus:border-brand-500 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Custom Tab Filters */}
        <div className="flex bg-surface-muted p-1 rounded-lg border border-surface-subtle w-full md:w-auto">
          {[
            { id: "all", label: "All Interviews" },
            { id: "pending", label: "Pending Schedule" },
            { id: "scheduled", label: "Scheduled" },
            { id: "completed", label: "Completed" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 md:flex-none text-xs font-semibold py-2 px-4 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-accent-600 text-white"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-surface-subtle bg-white overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-surface-subtle bg-surface-muted text-ink-muted text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">Candidate</th>
                <th className="py-4 px-6">Position</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Interview Time (IST)</th>
                <th className="py-4 px-6">Zoom Link</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle text-ink text-sm">
              {loading ? (
                <>
                  <SkeletonRow columns={6} />
                  <SkeletonRow columns={6} />
                  <SkeletonRow columns={6} />
                </>
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4">
                    <EmptyState
                      icon={FaCalendarAlt}
                      title="No candidates found"
                      message="No candidates match the selected tab or search."
                    />
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => (
                  <tr key={c._id} className="hover:bg-surface-muted transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-surface-muted flex items-center justify-center text-ink-muted border border-surface-subtle">
                          <FaUser size={14} />
                        </div>
                        <div>
                          <div className="font-semibold text-ink">{c.fullName}</div>
                          <div className="text-xs text-ink-faint mt-0.5">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-ink">{c.position}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {c.interviewDate ? (
                        <div className="flex items-center gap-1.5 text-ink font-medium">
                          <FaClock className="text-brand-600 text-xs" />
                          {formatDateTime(c.interviewDate)}
                        </div>
                      ) : (
                        <span className="text-ink-faint italic">Not Scheduled</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {c.zoomMeetingLink ? (
                        <a
                          href={c.zoomMeetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-semibold"
                        >
                          <FaVideo /> Join Link
                        </a>
                      ) : (
                        <span className="text-ink-faint">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenScheduleModal(c)}
                        className="inline-flex items-center gap-1 bg-accent-600 hover:bg-accent-700 text-white font-semibold text-xs px-3 py-2 rounded-lg transition-colors"
                      >
                        <FaCalendarAlt size={11} />
                        {c.interviewDate ? "Reschedule" : "Schedule"}
                      </button>
                      {c.status === "Interview Scheduled" && (
                        <button
                          onClick={() => handleMarkCompleted(c)}
                          className="inline-flex items-center gap-1 border border-surface-subtle bg-white text-ink hover:bg-surface-muted font-semibold text-xs px-3 py-2 rounded-lg transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-surface-subtle bg-white p-6 shadow-panel relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedCandidate(null);
              }}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink transition-colors"
            >
              <FaTimes size={18} />
            </button>

            <h3 className="text-lg font-semibold text-ink mb-4">
              {selectedCandidate.interviewDate ? "Reschedule Interview" : "Schedule Interview"}
            </h3>

            <div className="mb-4 p-3 bg-surface-muted rounded-lg border border-surface-subtle text-sm space-y-1">
              <div>
                <span className="text-ink-muted">Candidate:</span>{" "}
                <span className="font-semibold text-ink">{selectedCandidate.fullName}</span>
              </div>
              <div>
                <span className="text-ink-muted">Position:</span>{" "}
                <span className="font-semibold text-ink">{selectedCandidate.position}</span>
              </div>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">
                  Interview Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand-500"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">
                  Zoom Call Link *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://zoom.us/j/..."
                  className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-2.5 text-sm text-ink placeholder-ink-faint outline-none focus:border-brand-500"
                  value={zoomLink}
                  onChange={(e) => setZoomLink(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 border-t border-surface-subtle pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedCandidate(null);
                  }}
                  className="rounded-lg border border-surface-subtle bg-white px-4 py-2.5 text-xs font-semibold text-ink hover:bg-surface-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-accent-600 hover:bg-accent-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
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
