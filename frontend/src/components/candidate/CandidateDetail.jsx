import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { fetchCandidateById, addCandidateNote, updateCandidateStatus } from "../../redux/slices/candidateSlice";
import { fetchCandidateDocuments, verifyDocument, convertToEmployee } from "../../redux/slices/onboardingSlice";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import {
  FaUser,
  FaFileAlt,
  FaComments,
  FaHistory,
  FaBuilding,
  FaCalendarAlt,
  FaUserCheck,
  FaClock,
  FaChevronLeft,
  FaCheck,
  FaTimes,
  FaEye,
  FaUserTie,
  FaVideo
} from "react-icons/fa";
import LoadingState from "../common/LoadingState";
import EmptyState from "../common/EmptyState";

const CandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  
  const userRoles = Array.isArray(user?.role) ? user.role : [user?.role];
  const isAdmin = userRoles.includes("admin");
  const dashboardPath = isAdmin ? "/admin-dashboard" : "/hr-dashboard";
  
  const { current: candidate, loading: cLoading } = useSelector((state) => state.candidates);
  const { documents, loading: oLoading } = useSelector((state) => state.onboarding);

  const [activeSubTab, setActiveSubTab] = useState("details");
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [converting, setConverting] = useState(false);
  
  // Verification action states
  const [commentText, setCommentText] = useState({});
  const [verifyingDocId, setVerifyingDocId] = useState(null);

  useEffect(() => {
    dispatch(fetchCandidateById(id));
    dispatch(fetchCandidateDocuments(id));
  }, [dispatch, id]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setAddingNote(true);
    try {
      const resultAction = await dispatch(addCandidateNote({ id, note: noteText }));
      if (addCandidateNote.fulfilled.match(resultAction)) {
        toast.success("Note added successfully!");
        setNoteText("");
        dispatch(fetchCandidateById(id)); // refresh timeline
      } else {
        toast.error(resultAction.payload || "Failed to add note");
      }
    } catch (err) {
      toast.error("Error adding note");
    } finally {
      setAddingNote(false);
    }
  };

  const handleVerify = async (docId, status) => {
    const comment = commentText[docId] || "";
    if (status === "Rejected" && !comment.trim()) {
      toast.warning("Please provide a comment for rejection!");
      return;
    }

    setVerifyingDocId(docId);
    try {
      const resultAction = await dispatch(verifyDocument({ docId, status, comments: comment }));
      if (verifyDocument.fulfilled.match(resultAction)) {
        toast.success(`Document marked as ${status}`);
        // Reset comment input
        setCommentText({ ...commentText, [docId]: "" });
        dispatch(fetchCandidateDocuments(id)); // refresh
        dispatch(fetchCandidateById(id)); // refresh timeline
      } else {
        toast.error(resultAction.payload || "Verification failed");
      }
    } catch (err) {
      toast.error("Error updating document status");
    } finally {
      setVerifyingDocId(null);
    }
  };

  const handleConvertToEmployee = async () => {
    if (!window.confirm(`Are you sure you want to convert candidate ${candidate.fullName} to an active employee? This will activate their credentials and generate an Employee ID.`)) {
      return;
    }

    setConverting(true);
    try {
      const resultAction = await dispatch(convertToEmployee(candidate._id));
      if (convertToEmployee.fulfilled.match(resultAction)) {
        toast.success("Candidate converted to active employee successfully!");
        navigate(isAdmin ? "/admin-dashboard/employees" : "/hr-dashboard/candidates");
      } else {
        toast.error(resultAction.payload || "Failed to convert candidate to employee");
      }
    } catch (err) {
      toast.error("An error occurred during conversion");
    } finally {
      setConverting(false);
    }
  };

  if (cLoading || !candidate) {
    return <LoadingState message="Loading candidate details…" />;
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation Back / Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate(`${dashboardPath}/candidates`)}
          className="inline-flex items-center gap-2 text-ink-muted hover:text-ink transition-colors text-sm font-semibold"
        >
          <FaChevronLeft size={12} /> Back to Candidates List
        </button>

        {(candidate.status === "Offer Accepted" || candidate.status === "Appointment Sent" || candidate.status === "Appointment Accepted") && (
          <button
            onClick={handleConvertToEmployee}
            disabled={converting}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 px-5 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          >
            <FaUserCheck /> {converting ? "Converting..." : "Create Permanent Employee"}
          </button>
        )}
      </div>

      {/* Header Profile summary */}
      <div className="rounded-xl border border-surface-subtle bg-white p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
              <FaUserTie size={32} />
            </div>
            <div>
              <div className="text-xs text-ink-faint font-semibold uppercase tracking-wider">{candidate.candidateId}</div>
              <h2 className="text-2xl font-semibold text-ink mt-0.5">{candidate.fullName}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-ink-muted">
                <span className="flex items-center gap-1"><FaBuilding /> {candidate.position} ({candidate.department?.dep_name})</span>
                <span className="flex items-center gap-1"><FaCalendarAlt /> Expected Join: {candidate.expectedJoiningDate ? new Date(candidate.expectedJoiningDate).toLocaleDateString() : "TBD"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1">
            <span className="text-xs text-ink-faint font-semibold uppercase tracking-wider">Onboarding Phase</span>
            <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-0.5 text-sm font-medium text-brand-700">
              {candidate.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-surface-subtle flex gap-6">
        {[
          { id: "details", label: "Profile Details", icon: <FaUser /> },
          { id: "documents", label: `Uploaded Documents (${documents?.length || 0})`, icon: <FaFileAlt /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 pb-4 text-sm font-semibold transition-colors border-b-2 ${
              activeSubTab === tab.id
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-ink-faint hover:text-ink-muted"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub tabs contents */}
      <div>
        {activeSubTab === "details" && (
          <div className="space-y-6">
            {candidate.interviewDate && (
              <div className="rounded-xl border border-surface-subtle bg-brand-50/40 p-6 shadow-card">
                <h4 className="font-semibold text-brand-700 mb-4 border-b border-surface-subtle pb-2 flex items-center gap-2 text-base">
                  <FaCalendarAlt /> Scheduled Interview Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="text-ink-muted font-medium">Date & Time (IST)</span>
                    <div className="font-semibold text-ink mt-1 text-base flex items-center gap-2">
                      <FaClock className="text-brand-600" />
                      {new Date(candidate.interviewDate).toLocaleString("en-IN", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="text-ink-muted font-medium">Zoom Call Link</span>
                    <div className="mt-1">
                      {candidate.zoomMeetingLink ? (
                        <a
                          href={candidate.zoomMeetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors"
                        >
                          <FaVideo /> Join Zoom Meeting
                        </a>
                      ) : (
                        <span className="text-ink-faint italic">No link generated</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Personal & Contact Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-surface-subtle bg-white p-6 shadow-card">
                <h4 className="font-semibold text-ink mb-4 border-b border-surface-subtle pb-2">Personal Information</h4>
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div className="text-ink-muted">First Name:</div>
                  <div className="font-semibold text-ink">{candidate.personalInfo?.firstName || "-"}</div>
                  <div className="text-ink-muted">Last Name:</div>
                  <div className="font-semibold text-ink">{candidate.personalInfo?.lastName || "-"}</div>
                  <div className="text-ink-muted">Date of Birth:</div>
                  <div className="font-semibold text-ink">{candidate.personalInfo?.dob ? new Date(candidate.personalInfo.dob).toLocaleDateString() : "-"}</div>
                  <div className="text-ink-muted">Gender:</div>
                  <div className="font-semibold text-ink">{candidate.personalInfo?.gender || "-"}</div>
                  <div className="text-ink-muted">Blood Group:</div>
                  <div className="font-semibold text-ink">{candidate.personalInfo?.bloodGroup || "-"}</div>
                  <div className="text-ink-muted">Nationality:</div>
                  <div className="font-semibold text-ink">{candidate.personalInfo?.nationality || "-"}</div>
                  <div className="text-ink-muted">Marital Status:</div>
                  <div className="font-semibold text-ink">{candidate.personalInfo?.maritalStatus || "-"}</div>
                </div>
              </div>

              <div className="rounded-xl border border-surface-subtle bg-white p-6 shadow-card">
                <h4 className="font-semibold text-ink mb-4 border-b border-surface-subtle pb-2">Contact & Emergency Details</h4>
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="text-ink-muted mb-1">Current Address:</div>
                    <div className="font-medium text-ink bg-surface-muted p-3 rounded-lg border border-surface-subtle">{candidate.contactInfo?.currentAddress || "-"}</div>
                  </div>
                  <div>
                    <div className="text-ink-muted mb-1">Permanent Address:</div>
                    <div className="font-medium text-ink bg-surface-muted p-3 rounded-lg border border-surface-subtle">{candidate.contactInfo?.permanentAddress || "-"}</div>
                  </div>
                  <div className="border-t border-surface-subtle pt-3">
                    <h5 className="font-semibold text-ink mb-2">Emergency Contact</h5>
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="text-ink-muted">Contact Person:</div>
                      <div className="font-semibold text-ink">{candidate.contactInfo?.emergencyContact?.name || "-"}</div>
                      <div className="text-ink-muted">Relationship:</div>
                      <div className="font-semibold text-ink">{candidate.contactInfo?.emergencyContact?.relationship || "-"}</div>
                      <div className="text-ink-muted">Contact Number:</div>
                      <div className="font-semibold text-ink">{candidate.contactInfo?.emergencyContact?.phone || "-"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic & Bank Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-surface-subtle bg-white p-6 shadow-card">
                <h4 className="font-semibold text-ink mb-4 border-b border-surface-subtle pb-2">Education Qualifications</h4>
                {candidate.educationDetails?.length > 0 ? (
                  <div className="space-y-4 divide-y divide-surface-subtle">
                    {candidate.educationDetails.map((edu, idx) => (
                      <div key={idx} className="pt-3 first:pt-0 text-sm">
                        <div className="font-semibold text-ink">{edu.degree}</div>
                        <div className="text-ink-muted mt-1">{edu.college} | {edu.university}</div>
                        <div className="flex gap-4 text-xs font-semibold text-ink-faint mt-1.5">
                          <span>Passing Year: {edu.passingYear}</span>
                          <span>Score: {edu.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-ink-faint text-sm italic">No academic qualifications submitted yet.</div>
                )}
              </div>

              <div className="rounded-xl border border-surface-subtle bg-white p-6 shadow-card">
                <h4 className="font-semibold text-ink mb-4 border-b border-surface-subtle pb-2">Bank & Nominee Information</h4>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-y-3">
                    <div className="text-ink-muted">Bank Name:</div>
                    <div className="font-semibold text-ink">{candidate.bankDetails?.bankName || "-"}</div>
                    <div className="text-ink-muted">Account Number:</div>
                    <div className="font-semibold text-ink">{candidate.bankDetails?.accountNumber || "-"}</div>
                    <div className="text-ink-muted">IFSC Code:</div>
                    <div className="font-semibold text-ink">{candidate.bankDetails?.ifscCode || "-"}</div>
                  </div>
                  <div className="border-t border-surface-subtle pt-3">
                    <h5 className="font-semibold text-ink mb-2">Nominee Details</h5>
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="text-ink-muted">Nominee Name:</div>
                      <div className="font-semibold text-ink">{candidate.nomineeDetails?.nomineeName || "-"}</div>
                      <div className="text-ink-muted">Relationship:</div>
                      <div className="font-semibold text-ink">{candidate.nomineeDetails?.relationship || "-"}</div>
                      <div className="text-ink-muted">Contact Number:</div>
                      <div className="font-semibold text-ink">{candidate.nomineeDetails?.contactNumber || "-"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "documents" && (
          <div className="space-y-4 max-w-4xl">
            <h3 className="text-lg font-semibold text-ink">Onboarding Documents Verification</h3>

            {documents?.length === 0 ? (
              <div className="rounded-xl border border-surface-subtle bg-white">
                <EmptyState
                  icon={FaFileAlt}
                  title="No documents uploaded"
                  message="The candidate has not uploaded any onboarding documents yet."
                />
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className="rounded-xl border border-surface-subtle bg-white p-5 shadow-card space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-ink text-base">{doc.fileType}</h4>
                        <div className="text-xs text-ink-faint mt-0.5">Filename: {doc.originalName}</div>
                      </div>

                      {/* Current Status Badge */}
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        doc.status === "Approved" ? "bg-accent-100 text-accent-700" :
                        doc.status === "Rejected" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {doc.status}
                      </span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-surface-subtle pt-4">
                      {/* View document link */}
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline shrink-0"
                      >
                        <FaEye /> View / Preview uploaded scan
                      </a>

                      {/* Verification Controls (Only if status is pending or rejected) */}
                      {doc.status === "Pending" && (
                        <div className="flex flex-1 md:justify-end items-center gap-3 w-full">
                          <input
                            type="text"
                            placeholder="Add rejection comments..."
                            className="flex-1 max-w-sm rounded-lg border border-surface-subtle px-3 py-1.5 text-xs text-ink outline-none focus:border-brand-500"
                            value={commentText[doc._id] || ""}
                            onChange={(e) => setCommentText({ ...commentText, [doc._id]: e.target.value })}
                          />
                          <button
                            onClick={() => handleVerify(doc._id, "Rejected")}
                            disabled={verifyingDocId === doc._id}
                            className="rounded-lg bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 text-xs font-semibold transition-colors shrink-0"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleVerify(doc._id, "Approved")}
                            disabled={verifyingDocId === doc._id}
                            className="rounded-lg bg-accent-600 text-white hover:bg-accent-700 px-3 py-1.5 text-xs font-semibold transition-colors shrink-0"
                          >
                            Approve
                          </button>
                        </div>
                      )}

                      {doc.comments && (
                        <div className="text-xs text-ink-muted italic">
                          <b>HR comments:</b> {doc.comments}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


      </div>
    </div>
  );
};

export default CandidateDetail;
