import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCandidateProfile, resetOnboardingStatus } from "../redux/slices/onboardingSlice";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API_BASE } from "../utils/apiConfig";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  FaUser,
  FaFileAlt,
  FaCheckCircle,
  FaEnvelopeOpenText,
  FaLock,
  FaSignOutAlt,
  FaArrowRight,
  FaCloudUploadAlt,
  FaTimes,
  FaBuilding,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaExclamationTriangle
} from "react-icons/fa";

// Lazy-loaded subcomponents
import ProfileCompletionForm from "../components/candidate/ProfileCompletionForm";
import OnboardingDocsUpload from "../components/candidate/OnboardingDocsUpload";
import OfferLetterPortal from "../components/offer/OfferLetterPortal";
import LoadingState from "../components/common/LoadingState";

const getMissingFields = (candidate) => {
  if (!candidate) return [];
  const missing = [];

  const fieldNames = {
    firstName: "First Name",
    lastName: "Last Name",
    dob: "Date of Birth",
    gender: "Gender",
    bloodGroup: "Blood Group",
    nationality: "Nationality",
    maritalStatus: "Marital Status",
    currentAddress: "Current Address",
    permanentAddress: "Permanent Address",
    emergencyContactName: "Emergency Contact Name",
    emergencyContactRelationship: "Emergency Contact Relationship",
    emergencyContactPhone: "Emergency Contact Phone",
    educationDetails: "Education History",
    experience: "Total Experience",
    currentCompany: "Current Company",
    currentSalary: "Current CTC/Salary",
    bankName: "Bank Name",
    accountNumber: "Bank Account Number",
    ifscCode: "Bank IFSC Code",
    nomineeName: "Nominee Name",
    nomineeRelationship: "Nominee Relationship",
    nomineeContactNumber: "Nominee Contact Number"
  };

  const personalFields = ["firstName", "lastName", "dob", "gender", "bloodGroup", "nationality", "maritalStatus"];
  personalFields.forEach(f => {
    if (!candidate.personalInfo?.[f]) missing.push(fieldNames[f]);
  });

  const contactFields = ["currentAddress", "permanentAddress"];
  contactFields.forEach(f => {
    if (!candidate.contactInfo?.[f]) missing.push(fieldNames[f]);
  });
  
  if (!candidate.contactInfo?.emergencyContact?.name) missing.push(fieldNames.emergencyContactName);
  if (!candidate.contactInfo?.emergencyContact?.relationship) missing.push(fieldNames.emergencyContactRelationship);
  if (!candidate.contactInfo?.emergencyContact?.phone) missing.push(fieldNames.emergencyContactPhone);

  if (!candidate.educationDetails || candidate.educationDetails.length === 0) {
    missing.push(fieldNames.educationDetails);
  }

  const isFresher = candidate.professionalDetails?.experience?.toLowerCase() === "fresher";
  const profFields = isFresher ? ["experience"] : ["experience", "currentCompany", "currentSalary"];
  profFields.forEach(f => {
    const val = candidate.professionalDetails?.[f];
    if (val === undefined || val === null || val === "") {
      missing.push(fieldNames[f]);
    }
  });

  const bankFields = ["bankName", "accountNumber", "ifscCode"];
  bankFields.forEach(f => {
    if (!candidate.bankDetails?.[f]) missing.push(fieldNames[f]);
  });

  const nomineeFields = ["nomineeName", "relationship", "contactNumber"];
  nomineeFields.forEach(f => {
    if (!candidate.nomineeDetails?.[f]) missing.push(fieldNames[f]);
  });

  return missing;
};

const CandidateDashboard = () => {
  const dispatch = useDispatch();
  const { logout } = useAuth();
  const { candidate, offer, appointment, documents, loading, error } = useSelector((state) => state.onboarding);
  
  const [activeTab, setActiveTab] = useState("dashboard");
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    dispatch(fetchCandidateProfile());
  }, [dispatch]);

  // Handle first-login password change
  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long!");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await axios.put(
        `${API_BASE}/api/onboarding/profile`,
        {
          personalInfo: {}, // dummy to pass validation if needed
          firstLoginChangePassword: true
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );

      // Also call change password API
      await axios.put(
        `${API_BASE}/api/setting/change-password`,
        {
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );

      toast.success("Password changed successfully! Welcome to your onboarding dashboard.");
      dispatch(fetchCandidateProfile());
    } catch (err) {
      toast.error(err.response?.data?.error || "Error changing password. Ensure old password is correct.");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-muted text-ink">
        <LoadingState message="Loading your onboarding portal…" />
      </div>
    );
  }

  // Bypassed first-login password change: direct straight to dashboard


  // Pre-calculate document status
  const isCandidateFresher = candidate?.professionalDetails?.experience?.toLowerCase() === "fresher";
  const requiredDocKeys = [
    "Aadhaar",
    "PAN",
    "SSC Certificate",
    "Intermediate Certificate",
    "Degree Certificate",
    "Resume",
    "Passbook",
    "Passport Photo",
    "Signature"
  ];
  if (!isCandidateFresher) {
    requiredDocKeys.push("Experience Letters", "Relieving Letter");
  }

  const approvedDocsCount = documents ? documents.filter(d => requiredDocKeys.includes(d.fileType) && d.status === "Approved").length : 0;
  const pendingDocsCount = Math.max(0, requiredDocKeys.length - approvedDocsCount);
  const underVerificationCount = documents ? documents.filter(d => requiredDocKeys.includes(d.fileType) && d.status === "Pending").length : 0;

  // Onboarding progress calculation
  const progressStages = [
    { label: "Profile Completed", done: candidate?.profileCompletionPercentage === 100 },
    { 
      label: "Documents Uploaded", 
      done: documents && requiredDocKeys.every(key => documents.some(d => d.fileType === key)) 
    },
    { 
      label: "Verification Status", 
      done: documents && documents.length > 0 && requiredDocKeys.every(key => documents.some(d => d.fileType === key && d.status === "Approved")) 
    },
    { label: "Offer Generated", done: offer !== null },
    { label: "Offer Accepted", done: offer?.status === "Accepted" }
  ];

  const currentStageIndex = progressStages.findIndex(s => !s.done);
  const activeStage = currentStageIndex === -1 ? 5 : currentStageIndex;

  return (
    <div className="flex min-h-screen bg-surface-muted text-ink">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Portal Sidebar */}
      <div className="w-64 border-r border-white/10 bg-brand-800 text-white p-6 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <img src="/images/Logo.jpg" className="w-9 h-9 rounded-md object-cover" alt="Logo" />
            <h1 className="font-semibold text-base tracking-wide">Onboarding</h1>
          </div>

          <nav className="space-y-1">
            {[
              { id: "dashboard", label: "Dashboard Overview", icon: <FaUser /> },
              { id: "profile", label: "Complete Profile", icon: <FaUser /> },
              { id: "documents", label: "Upload Documents", icon: <FaCloudUploadAlt /> },
              { id: "offer", label: "Offer & Appointment", icon: <FaEnvelopeOpenText /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors duration-150 text-sm font-medium ${
                  activeTab === tab.id
                    ? "bg-accent-500 text-white shadow-sm"
                    : "text-brand-100/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-3 text-brand-100/80 hover:text-white font-medium px-3.5 py-2.5 rounded-lg hover:bg-white/10 transition-colors duration-150"
        >
          <FaSignOutAlt />
          Sign Out
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8 lg:p-10">
        {/* Header / Topbar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs font-semibold text-brand-600 uppercase tracking-widest">Candidate Portal</span>
            <h2 className="text-2xl md:text-3xl font-semibold text-ink mt-1">
              Welcome, {candidate?.fullName || "Candidate"}!
            </h2>
          </div>
          <button
            onClick={logout}
            className="md:hidden flex items-center justify-center p-2 rounded-lg border border-surface-subtle text-ink-muted hover:text-rose-600"
          >
            <FaSignOutAlt size={20} />
          </button>
        </div>

        {/* Tab Content Router */}
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Profile Completion banner card */}
              <div className="rounded-2xl border border-surface-subtle bg-white p-6 md:p-8 shadow-card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 border border-brand-100">
                      Onboarding Status: {candidate?.status}
                    </span>
                    <h3 className="text-xl md:text-2xl font-semibold text-ink">Complete your onboarding profile</h3>
                    <p className="text-ink-muted text-sm max-w-xl">
                      Fill out your personal, bank, and professional details to prepare your employment records.
                    </p>
                    {candidate?.profileCompletionPercentage < 100 && (
                      <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs max-w-xl">
                        <div className="font-semibold mb-1 flex items-center gap-1.5 text-amber-700">
                          <FaExclamationTriangle /> Missing Profile Fields ({getMissingFields(candidate).length}):
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 font-medium text-amber-700">
                          {getMissingFields(candidate).map((field, i) => (
                            <span key={i} className="flex items-center gap-1">
                              • {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="relative flex items-center justify-center mb-2">
                      {/* Radial Progress */}
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle cx="40" cy="40" r="34" className="stroke-surface-subtle" strokeWidth="6" fill="transparent" />
                        <circle
                          cx="40"
                          cy="40"
                          r="34"
                          className="stroke-accent-500 transition-all duration-1000"
                          strokeWidth="6"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 34}
                          strokeDashoffset={2 * Math.PI * 34 * (1 - (candidate?.profileCompletionPercentage || 0) / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-lg font-semibold text-ink">{candidate?.profileCompletionPercentage || 0}%</span>
                    </div>
                    <button
                      onClick={() => setActiveTab("profile")}
                      className="inline-flex items-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150"
                    >
                      Complete Profile <FaArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Profile Widget */}
                <div className="rounded-xl border border-surface-subtle bg-white p-6 shadow-card hover:shadow-panel transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-ink-muted text-xs font-semibold uppercase tracking-wider">Profile Status</span>
                    <div className="p-2 rounded-lg bg-brand-50 text-brand-600"><FaUser /></div>
                  </div>
                  <div className="text-2xl font-semibold text-ink">{candidate?.profileCompletionPercentage}%</div>
                  <p className="text-ink-muted text-xs mt-1">Profile data completion progress</p>
                </div>

                {/* Documents approved Widget */}
                <div className="rounded-xl border border-surface-subtle bg-white p-6 shadow-card hover:shadow-panel transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-ink-muted text-xs font-semibold uppercase tracking-wider">Approved Docs</span>
                    <div className="p-2 rounded-lg bg-accent-50 text-accent-600"><FaCheckCircle /></div>
                  </div>
                  <div className="text-2xl font-semibold text-ink">{approvedDocsCount} <span className="text-sm text-ink-faint font-normal">/ 12</span></div>
                  <p className="text-ink-muted text-xs mt-1">{underVerificationCount} doc(s) currently under HR review</p>
                </div>

                {/* Pending Documents Widget */}
                <div className="rounded-xl border border-surface-subtle bg-white p-6 shadow-card hover:shadow-panel transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-ink-muted text-xs font-semibold uppercase tracking-wider">Pending Docs</span>
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><FaCloudUploadAlt /></div>
                  </div>
                  <div className="text-2xl font-semibold text-ink">{pendingDocsCount}</div>
                  <p className="text-ink-muted text-xs mt-1">Documents remaining to upload</p>
                </div>

                {/* Offer Status Widget */}
                <div className="rounded-xl border border-surface-subtle bg-white p-6 shadow-card hover:shadow-panel transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-ink-muted text-xs font-semibold uppercase tracking-wider">Offer Status</span>
                    <div className="p-2 rounded-lg bg-brand-50 text-brand-600"><FaEnvelopeOpenText /></div>
                  </div>
                  <div className={`text-xl font-semibold uppercase ${
                    offer?.status === "Accepted" ? "text-accent-600" :
                    offer?.status === "Sent" ? "text-brand-600" :
                    offer?.status === "Rejected" ? "text-rose-600" : "text-amber-600"
                  }`}>
                    {offer?.status || "Unavailable"}
                  </div>
                  <p className="text-ink-muted text-xs mt-1">Employment offer letter status</p>
                </div>
              </div>

              {/* Progress Stage Timeline */}
              <div className="rounded-xl border border-surface-subtle bg-white p-6 shadow-card">
                <h4 className="text-lg font-semibold text-ink mb-6">Onboarding Progress Tracker</h4>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
                  {progressStages.map((stage, idx) => (
                    <div key={idx} className="flex-1 flex items-center gap-4 md:flex-col md:text-center relative">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
                        stage.done ? "bg-accent-500 border-accent-500 text-white" :
                        idx === activeStage ? "bg-white border-brand-400 text-brand-600" : "border-surface-subtle text-ink-faint"
                      }`}>
                        {stage.done ? <FaCheckCircle /> : idx + 1}
                      </div>
                      <div className="md:mt-2">
                        <div className="text-sm font-semibold text-ink">{stage.label}</div>
                        <div className="text-xs text-ink-muted">{stage.done ? "Completed" : idx === activeStage ? "Action Needed" : "Pending"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Offer Info Box */}
              {offer && offer.status === "Sent" && (
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-left">
                    <div className="p-3 rounded-full bg-brand-100 text-brand-600 hidden sm:block">
                      <FaEnvelopeOpenText size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg text-ink">Your Offer Letter is Ready!</h4>
                      <p className="text-sm text-ink-muted">Please review and digitally accept your offer letter before {new Date(offer.expiryDate).toLocaleDateString()}.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("offer")}
                    className="rounded-lg bg-accent-600 hover:bg-accent-700 text-white px-6 py-2.5 font-semibold transition-colors duration-150 shrink-0"
                  >
                    Review Offer
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "profile" && (
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
            >
              <ProfileCompletionForm 
                onSave={() => dispatch(fetchCandidateProfile())} 
                onSubmitSuccess={() => setActiveTab("dashboard")} 
              />
            </motion.div>
          )}

          {activeTab === "documents" && (
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
            >
              <OnboardingDocsUpload documents={documents} candidate={candidate} />
            </motion.div>
          )}

          {activeTab === "offer" && (
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
            >
              <OfferLetterPortal 
                offer={offer} 
                appointment={appointment} 
                candidate={candidate} 
                onAction={() => dispatch(fetchCandidateProfile())} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CandidateDashboard;
