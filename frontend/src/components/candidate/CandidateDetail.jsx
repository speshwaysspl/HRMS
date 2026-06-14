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
    return (
      <div className="flex h-64 items-center justify-center text-slate-500 font-medium">
        <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
        Loading candidate details...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation Back / Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate(`${dashboardPath}/candidates`)}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-sm font-semibold"
        >
          <FaChevronLeft size={12} /> Back to Candidates List
        </button>
        
        {(candidate.status === "Offer Accepted" || candidate.status === "Appointment Sent" || candidate.status === "Appointment Accepted") && (
          <button
            onClick={handleConvertToEmployee}
            disabled={converting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-green-500/25 transition disabled:opacity-50"
          >
            <FaUserCheck /> {converting ? "Converting..." : "Create Permanent Employee"}
          </button>
        )}
      </div>

      {/* Header Profile summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <FaUserTie size={32} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{candidate.candidateId}</div>
              <h2 className="text-2xl font-bold text-slate-900 mt-0.5">{candidate.fullName}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-slate-500">
                <span className="flex items-center gap-1"><FaBuilding /> {candidate.position} ({candidate.department?.dep_name})</span>
                <span className="flex items-center gap-1"><FaCalendarAlt /> Expected Join: {candidate.expectedJoiningDate ? new Date(candidate.expectedJoiningDate).toLocaleDateString() : "TBD"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Onboarding Phase</span>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-600 border border-indigo-100">
              {candidate.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 flex gap-6">
        {[
          { id: "details", label: "Profile Details", icon: <FaUser /> },
          { id: "documents", label: `Uploaded Documents (${documents?.length || 0})`, icon: <FaFileAlt /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 pb-4 text-sm font-semibold transition border-b-2 ${
              activeSubTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
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
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 shadow-sm">
                <h4 className="font-bold text-blue-400 mb-4 border-b border-white/5 pb-2 flex items-center gap-2 text-base">
                  <FaCalendarAlt /> Scheduled Interview Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="text-slate-400 font-medium">Date & Time (IST)</span>
                    <div className="font-semibold text-white mt-1 text-base flex items-center gap-2">
                      <FaClock className="text-blue-400" />
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
                    <span className="text-slate-400 font-medium">Zoom Call Link</span>
                    <div className="mt-1">
                      {candidate.zoomMeetingLink ? (
                        <a
                          href={candidate.zoomMeetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-blue-500/20"
                        >
                          <FaVideo /> Join Zoom Meeting
                        </a>
                      ) : (
                        <span className="text-slate-500 italic">No link generated</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Personal & Contact Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Personal Information</h4>
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div className="text-slate-400">First Name:</div>
                  <div className="font-semibold">{candidate.personalInfo?.firstName || "-"}</div>
                  <div className="text-slate-400">Last Name:</div>
                  <div className="font-semibold">{candidate.personalInfo?.lastName || "-"}</div>
                  <div className="text-slate-400">Date of Birth:</div>
                  <div className="font-semibold">{candidate.personalInfo?.dob ? new Date(candidate.personalInfo.dob).toLocaleDateString() : "-"}</div>
                  <div className="text-slate-400">Gender:</div>
                  <div className="font-semibold">{candidate.personalInfo?.gender || "-"}</div>
                  <div className="text-slate-400">Blood Group:</div>
                  <div className="font-semibold">{candidate.personalInfo?.bloodGroup || "-"}</div>
                  <div className="text-slate-400">Nationality:</div>
                  <div className="font-semibold">{candidate.personalInfo?.nationality || "-"}</div>
                  <div className="text-slate-400">Marital Status:</div>
                  <div className="font-semibold">{candidate.personalInfo?.maritalStatus || "-"}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Contact & Emergency Details</h4>
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="text-slate-400 mb-1">Current Address:</div>
                    <div className="font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">{candidate.contactInfo?.currentAddress || "-"}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Permanent Address:</div>
                    <div className="font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">{candidate.contactInfo?.permanentAddress || "-"}</div>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <h5 className="font-semibold text-slate-950 mb-2">Emergency Contact</h5>
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="text-slate-400">Contact Person:</div>
                      <div className="font-semibold">{candidate.contactInfo?.emergencyContact?.name || "-"}</div>
                      <div className="text-slate-400">Relationship:</div>
                      <div className="font-semibold">{candidate.contactInfo?.emergencyContact?.relationship || "-"}</div>
                      <div className="text-slate-400">Contact Number:</div>
                      <div className="font-semibold">{candidate.contactInfo?.emergencyContact?.phone || "-"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic & Bank Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Education Qualifications</h4>
                {candidate.educationDetails?.length > 0 ? (
                  <div className="space-y-4 divide-y divide-slate-100">
                    {candidate.educationDetails.map((edu, idx) => (
                      <div key={idx} className="pt-3 first:pt-0 text-sm">
                        <div className="font-bold text-slate-800">{edu.degree}</div>
                        <div className="text-slate-500 mt-1">{edu.college} | {edu.university}</div>
                        <div className="flex gap-4 text-xs font-semibold text-slate-400 mt-1.5">
                          <span>Passing Year: {edu.passingYear}</span>
                          <span>Score: {edu.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm italic">No academic qualifications submitted yet.</div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Bank & Nominee Information</h4>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-y-3">
                    <div className="text-slate-400">Bank Name:</div>
                    <div className="font-semibold">{candidate.bankDetails?.bankName || "-"}</div>
                    <div className="text-slate-400">Account Number:</div>
                    <div className="font-semibold">{candidate.bankDetails?.accountNumber || "-"}</div>
                    <div className="text-slate-400">IFSC Code:</div>
                    <div className="font-semibold">{candidate.bankDetails?.ifscCode || "-"}</div>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <h5 className="font-semibold text-slate-950 mb-2">Nominee Details</h5>
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="text-slate-400">Nominee Name:</div>
                      <div className="font-semibold">{candidate.nomineeDetails?.nomineeName || "-"}</div>
                      <div className="text-slate-400">Relationship:</div>
                      <div className="font-semibold">{candidate.nomineeDetails?.relationship || "-"}</div>
                      <div className="text-slate-400">Contact Number:</div>
                      <div className="font-semibold">{candidate.nomineeDetails?.contactNumber || "-"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "documents" && (
          <div className="space-y-4 max-w-4xl">
            <h3 className="text-lg font-bold text-slate-800">Onboarding Documents Verification</h3>
            
            {documents?.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-400 italic text-sm">
                No documents uploaded by the candidate yet.
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{doc.fileType}</h4>
                        <div className="text-xs text-slate-400 mt-0.5">Filename: {doc.originalName}</div>
                      </div>
                      
                      {/* Current Status Badge */}
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
                        doc.status === "Approved" ? "bg-green-50 text-green-600 border-green-200" :
                        doc.status === "Rejected" ? "bg-red-50 text-red-600 border-red-200" :
                        "bg-yellow-50 text-yellow-600 border-yellow-200"
                      }`}>
                        {doc.status}
                      </span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 pt-4">
                      {/* View document link */}
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline shrink-0"
                      >
                        <FaEye /> View / Preview uploaded scan
                      </a>

                      {/* Verification Controls (Only if status is pending or rejected) */}
                      {doc.status === "Pending" && (
                        <div className="flex flex-1 md:justify-end items-center gap-3 w-full">
                          <input
                            type="text"
                            placeholder="Add rejection comments..."
                            className="flex-1 max-w-sm rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                            value={commentText[doc._id] || ""}
                            onChange={(e) => setCommentText({ ...commentText, [doc._id]: e.target.value })}
                          />
                          <button
                            onClick={() => handleVerify(doc._id, "Rejected")}
                            disabled={verifyingDocId === doc._id}
                            className="rounded-lg bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 text-xs font-bold transition shrink-0"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleVerify(doc._id, "Approved")}
                            disabled={verifyingDocId === doc._id}
                            className="rounded-lg bg-green-600 text-white hover:bg-green-700 px-3 py-1.5 text-xs font-bold transition shrink-0"
                          >
                            Approve
                          </button>
                        </div>
                      )}
                      
                      {doc.comments && (
                        <div className="text-xs text-slate-500 italic">
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
