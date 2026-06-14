import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateCandidateProfile } from "../../redux/slices/onboardingSlice";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { FaUser, FaAddressBook, FaGraduationCap, FaBriefcase, FaUniversity, FaUserFriends, FaChevronLeft, FaChevronRight, FaSave } from "react-icons/fa";

const ProfileCompletionForm = ({ onSave, onSubmitSuccess }) => {
  const dispatch = useDispatch();
  const { candidate, loading } = useSelector((state) => state.onboarding);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [candidateType, setCandidateType] = useState("Fresher");

  // Form State
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
    bloodGroup: "",
    nationality: "",
    maritalStatus: ""
  });

  const [contactInfo, setContactInfo] = useState({
    currentAddress: "",
    permanentAddress: "",
    emergencyContact: { name: "", relationship: "", phone: "" }
  });

  const [educationDetails, setEducationDetails] = useState([
    { degree: "", college: "", university: "", passingYear: "", percentage: "" }
  ]);

  const [professionalDetails, setProfessionalDetails] = useState({
    experience: "",
    currentCompany: "",
    currentSalary: ""
  });

  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountNumber: "",
    ifscCode: ""
  });

  const [nomineeDetails, setNomineeDetails] = useState({
    nomineeName: "",
    relationship: "",
    contactNumber: ""
  });

  // Populate data when candidate changes
  useEffect(() => {
    if (candidate) {
      if (candidate.personalInfo) {
        setPersonalInfo({
          firstName: candidate.personalInfo.firstName || "",
          lastName: candidate.personalInfo.lastName || "",
          dob: candidate.personalInfo.dob ? new Date(candidate.personalInfo.dob).toISOString().split("T")[0] : "",
          gender: candidate.personalInfo.gender || "",
          bloodGroup: candidate.personalInfo.bloodGroup || "",
          nationality: candidate.personalInfo.nationality || "",
          maritalStatus: candidate.personalInfo.maritalStatus || ""
        });
      }
      if (candidate.contactInfo) {
        setContactInfo({
          currentAddress: candidate.contactInfo.currentAddress || "",
          permanentAddress: candidate.contactInfo.permanentAddress || "",
          emergencyContact: {
            name: candidate.contactInfo.emergencyContact?.name || "",
            relationship: candidate.contactInfo.emergencyContact?.relationship || "",
            phone: candidate.contactInfo.emergencyContact?.phone || ""
          }
        });
      }
      if (candidate.educationDetails && candidate.educationDetails.length > 0) {
        setEducationDetails(
          candidate.educationDetails.map((edu) => ({
            degree: edu.degree || "",
            college: edu.college || "",
            university: edu.university || "",
            passingYear: edu.passingYear ?? "",
            percentage: edu.percentage ?? ""
          }))
        );
      }
      if (candidate.professionalDetails) {
        const exp = candidate.professionalDetails.experience || "";
        const isExp = exp && exp.toLowerCase() !== "fresher";
        setCandidateType(isExp ? "Experienced" : "Fresher");
        setProfessionalDetails({
          experience: exp,
          currentCompany: candidate.professionalDetails.currentCompany || "",
          currentSalary: candidate.professionalDetails.currentSalary ?? ""
        });
      }
      if (candidate.bankDetails) {
        setBankDetails({
          bankName: candidate.bankDetails.bankName || "",
          accountNumber: candidate.bankDetails.accountNumber || "",
          ifscCode: candidate.bankDetails.ifscCode || ""
        });
      }
      if (candidate.nomineeDetails) {
        setNomineeDetails({
          nomineeName: candidate.nomineeDetails.nomineeName || "",
          relationship: candidate.nomineeDetails.relationship || "",
          contactNumber: candidate.nomineeDetails.contactNumber || ""
        });
      }
    }
  }, [candidate]);

  // State update & validation helpers to clear errors dynamically
  const updatePersonalInfo = (field, value) => {
    setPersonalInfo(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const updateContactInfo = (field, value) => {
    setContactInfo(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const updateEmergencyContact = (field, value) => {
    setContactInfo(prev => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value }
    }));
    const errorKey = field === "name" ? "emergencyName" : field === "relationship" ? "emergencyRelationship" : "emergencyPhone";
    if (errors[errorKey]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[errorKey];
        return copy;
      });
    }
  };

  const updateBankDetails = (field, value) => {
    setBankDetails(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const updateNomineeDetails = (field, value) => {
    setNomineeDetails(prev => ({ ...prev, [field]: value }));
    const errorKey = field === "nomineeName" ? "nomineeName" : field === "relationship" ? "nomineeRelationship" : "nomineePhone";
    if (errors[errorKey]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[errorKey];
        return copy;
      });
    }
  };

  const updateProfessionalDetails = (field, value) => {
    setProfessionalDetails(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const updateEducationField = (index, field, val) => {
    const copy = [...educationDetails];
    copy[index][field] = val;
    setEducationDetails(copy);
    if (errors.education && errors.education[index] && errors.education[index][field]) {
      setErrors(prev => {
        const nextErrors = { ...prev };
        const eduErrorsCopy = [...(nextErrors.education || [])];
        if (eduErrorsCopy[index]) {
          const itemErrors = { ...eduErrorsCopy[index] };
          delete itemErrors[field];
          if (Object.keys(itemErrors).length === 0) {
            delete eduErrorsCopy[index];
          } else {
            eduErrorsCopy[index] = itemErrors;
          }
        }
        if (eduErrorsCopy.filter(Boolean).length === 0) {
          delete nextErrors.education;
        } else {
          nextErrors.education = eduErrorsCopy;
        }
        return nextErrors;
      });
    }
  };

  const validateStep = (s) => {
    const tempErrors = {};
    let isValid = true;

    if (s === 1) {
      if (!personalInfo.firstName.trim()) {
        tempErrors.firstName = "First Name is required";
        toast.error("First Name is required");
        isValid = false;
      }
      if (!personalInfo.lastName.trim()) {
        tempErrors.lastName = "Last Name is required";
        toast.error("Last Name is required");
        isValid = false;
      }
      if (!personalInfo.dob) {
        tempErrors.dob = "Date of Birth is required";
        toast.error("Date of Birth is required");
        isValid = false;
      }
      if (!personalInfo.gender) {
        tempErrors.gender = "Gender is required";
        toast.error("Gender is required");
        isValid = false;
      }
    } else if (s === 2) {
      if (!contactInfo.currentAddress.trim()) {
        tempErrors.currentAddress = "Current Address is required";
        toast.error("Current Address is required");
        isValid = false;
      }
      if (!contactInfo.emergencyContact.name.trim()) {
        tempErrors.emergencyName = "Emergency Contact Name is required";
        toast.error("Emergency Contact Name is required");
        isValid = false;
      }
      if (!contactInfo.emergencyContact.relationship.trim()) {
        tempErrors.emergencyRelationship = "Emergency Contact Relationship is required";
        toast.error("Emergency Contact Relationship is required");
        isValid = false;
      }
      if (!contactInfo.emergencyContact.phone.trim()) {
        tempErrors.emergencyPhone = "Emergency Contact Mobile Number is required";
        toast.error("Emergency Contact Mobile Number is required");
        isValid = false;
      } else if (!/^\d{10}$/.test(contactInfo.emergencyContact.phone.trim())) {
        tempErrors.emergencyPhone = "Emergency Contact Mobile Number must be 10 digits";
        toast.error("Emergency Contact Mobile Number must be 10 digits");
        isValid = false;
      }
    } else if (s === 3) {
      const eduErrors = [];
      educationDetails.forEach((edu, idx) => {
        const itemErrors = {};
        if (!edu.degree.trim()) {
          itemErrors.degree = "Degree / Qualification is required";
          toast.error(`Education #${idx + 1}: Degree / Qualification is required`);
          isValid = false;
        }
        if (!edu.college.trim()) {
          itemErrors.college = "College / Institution is required";
          toast.error(`Education #${idx + 1}: College / Institution is required`);
          isValid = false;
        }
        if (!edu.university.trim()) {
          itemErrors.university = "University / Board is required";
          toast.error(`Education #${idx + 1}: University / Board is required`);
          isValid = false;
        }
        if (!edu.passingYear) {
          itemErrors.passingYear = "Passing Year is required";
          toast.error(`Education #${idx + 1}: Passing Year is required`);
          isValid = false;
        } else {
          const year = parseInt(edu.passingYear);
          const currentYear = new Date().getFullYear();
          if (isNaN(year) || year < 1950 || year > currentYear + 5) {
            itemErrors.passingYear = "Please enter a valid passing year";
            toast.error(`Education #${idx + 1}: Please enter a valid passing year`);
            isValid = false;
          }
        }
        if (!edu.percentage) {
          itemErrors.percentage = "Percentage / CGPA is required";
          toast.error(`Education #${idx + 1}: Percentage / CGPA is required`);
          isValid = false;
        }
        if (Object.keys(itemErrors).length > 0) {
          eduErrors[idx] = itemErrors;
        }
      });
      if (eduErrors.length > 0) {
        tempErrors.education = eduErrors;
      }
    } else if (s === 4) {
      if (candidateType === "Experienced" && !professionalDetails.experience.trim()) {
        tempErrors.experience = "Total Experience is required";
        toast.error("Total Experience is required");
        isValid = false;
      }
    } else if (s === 5) {
      if (!bankDetails.bankName.trim()) {
        tempErrors.bankName = "Bank Name is required";
        toast.error("Bank Name is required");
        isValid = false;
      }
      if (!bankDetails.accountNumber.trim()) {
        tempErrors.accountNumber = "Account Number is required";
        toast.error("Account Number is required");
        isValid = false;
      }
      if (!bankDetails.ifscCode.trim()) {
        tempErrors.ifscCode = "IFSC Code is required";
        toast.error("IFSC Code is required");
        isValid = false;
      } else if (bankDetails.ifscCode.trim().length !== 11) {
        tempErrors.ifscCode = "IFSC Code must be 11 characters long";
        toast.error("IFSC Code must be 11 characters long");
        isValid = false;
      }
    } else if (s === 6) {
      if (!nomineeDetails.nomineeName.trim()) {
        tempErrors.nomineeName = "Nominee Full Name is required";
        toast.error("Nominee Full Name is required");
        isValid = false;
      }
      if (!nomineeDetails.relationship.trim()) {
        tempErrors.nomineeRelationship = "Relationship is required";
        toast.error("Relationship is required");
        isValid = false;
      }
      if (!nomineeDetails.contactNumber.trim()) {
        tempErrors.nomineePhone = "Nominee Contact Number is required";
        toast.error("Nominee Contact Number is required");
        isValid = false;
      } else if (!/^\d{10}$/.test(nomineeDetails.contactNumber.trim())) {
        tempErrors.nomineePhone = "Nominee Contact Number must be 10 digits";
        toast.error("Nominee Contact Number must be 10 digits");
        isValid = false;
      }
    }

    setErrors(tempErrors);
    return isValid;
  };

  const getInputClass = (errorVal) => {
    const base = "w-full rounded-xl border bg-slate-950/40 px-4 py-3 text-white outline-none transition duration-200";
    if (errorVal) {
      return `${base} border-red-500/80 bg-red-950/10 focus:border-red-500 focus:ring-1 focus:ring-red-500/50`;
    }
    return `${base} border-white/10 focus:border-blue-500`;
  };

  // Handle draft save
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const payload = {
        personalInfo,
        contactInfo,
        educationDetails: educationDetails.filter(edu => edu.degree || edu.college), // exclude blank entries
        professionalDetails: {
          experience: candidateType === "Fresher" ? "Fresher" : professionalDetails.experience,
          currentCompany: candidateType === "Fresher" ? null : (professionalDetails.currentCompany || null),
          currentSalary: candidateType === "Fresher" ? null : (professionalDetails.currentSalary !== "" ? Number(professionalDetails.currentSalary) : null)
        },
        bankDetails,
        nomineeDetails
      };
      
      const resultAction = await dispatch(updateCandidateProfile(payload));
      if (updateCandidateProfile.fulfilled.match(resultAction)) {
        toast.success("Draft saved successfully!");
        if (onSave) onSave();
      } else {
        toast.error(resultAction.payload || "Failed to save draft.");
      }
    } catch (err) {
      toast.error("An error occurred during save.");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (!validateStep(step)) {
      return;
    }

    // Auto-save draft on step change
    await handleSaveDraft();
    setStep((prev) => prev + 1);
  };

  const handlePrev = () => {
    setStep((prev) => prev - 1);
  };

  const handleAddEducation = () => {
    setEducationDetails([...educationDetails, { degree: "", college: "", university: "", passingYear: "", percentage: "" }]);
  };

  const handleRemoveEducation = (index) => {
    setEducationDetails(educationDetails.filter((_, idx) => idx !== index));
    if (errors.education) {
      setErrors(prev => {
        const nextErrors = { ...prev };
        const eduErrorsCopy = [...(nextErrors.education || [])];
        eduErrorsCopy.splice(index, 1);
        if (eduErrorsCopy.filter(Boolean).length === 0) {
          delete nextErrors.education;
        } else {
          nextErrors.education = eduErrorsCopy;
        }
        return nextErrors;
      });
    }
  };

  const stepsList = [
    { label: "Personal", icon: <FaUser /> },
    { label: "Contact", icon: <FaAddressBook /> },
    { label: "Education", icon: <FaGraduationCap /> },
    { label: "Professional", icon: <FaBriefcase /> },
    { label: "Banking", icon: <FaUniversity /> },
    { label: "Nominee", icon: <FaUserFriends /> }
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl max-w-4xl mx-auto shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold">Candidate Onboarding Form</h3>
          <p className="text-sm text-slate-400 mt-1">Please fill in your details. Progress is automatically saved as draft.</p>
        </div>
        <button
          onClick={handleSaveDraft}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2 text-sm font-semibold transition"
        >
          <FaSave /> {saving ? "Saving..." : "Save Draft"}
        </button>
      </div>

      {/* Steps Indicator */}
      <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6 overflow-x-auto scrollbar-hide">
        {stepsList.map((sItem, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < step;
          const isActive = stepNum === step;

          return (
            <div key={idx} className="flex items-center gap-2 flex-shrink-0 mr-4 last:mr-0">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold border transition ${
                isCompleted ? "bg-blue-600 border-blue-500 text-white" :
                isActive ? "bg-slate-800 border-blue-500 text-blue-400" : "border-slate-800 text-slate-500"
              }`}>
                {sItem.icon}
              </div>
              <span className={`text-xs font-semibold tracking-wider uppercase ${
                isActive ? "text-blue-400" : isCompleted ? "text-slate-200" : "text-slate-500"
              }`}>{sItem.label}</span>
            </div>
          );
        })}
      </div>

      {/* Step Container Form */}
      <div className="min-h-[350px]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">First Name *</label>
                <input
                  type="text"
                  required
                  className={getInputClass(errors.firstName)}
                  value={personalInfo.firstName}
                  onChange={(e) => updatePersonalInfo("firstName", e.target.value)}
                />
                {errors.firstName && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.firstName}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Last Name *</label>
                <input
                  type="text"
                  required
                  className={getInputClass(errors.lastName)}
                  value={personalInfo.lastName}
                  onChange={(e) => updatePersonalInfo("lastName", e.target.value)}
                />
                {errors.lastName && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.lastName}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Date of Birth *</label>
                <input
                  type="date"
                  required
                  className={getInputClass(errors.dob)}
                  value={personalInfo.dob}
                  onChange={(e) => updatePersonalInfo("dob", e.target.value)}
                />
                {errors.dob && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.dob}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Gender *</label>
                <select
                  required
                  className={getInputClass(errors.gender)}
                  value={personalInfo.gender}
                  onChange={(e) => updatePersonalInfo("gender", e.target.value)}
                >
                  <option value="" disabled className="bg-slate-950">Select Gender</option>
                  <option value="Male" className="bg-slate-950">Male</option>
                  <option value="Female" className="bg-slate-950">Female</option>
                  <option value="Other" className="bg-slate-950">Other</option>
                </select>
                {errors.gender && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.gender}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Blood Group</label>
                <input
                  type="text"
                  placeholder="e.g. O+"
                  className={getInputClass(errors.bloodGroup)}
                  value={personalInfo.bloodGroup}
                  onChange={(e) => updatePersonalInfo("bloodGroup", e.target.value)}
                />
                {errors.bloodGroup && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.bloodGroup}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Nationality</label>
                <input
                  type="text"
                  className={getInputClass(errors.nationality)}
                  value={personalInfo.nationality}
                  onChange={(e) => updatePersonalInfo("nationality", e.target.value)}
                />
                {errors.nationality && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.nationality}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Marital Status</label>
                <select
                  className={getInputClass(errors.maritalStatus)}
                  value={personalInfo.maritalStatus}
                  onChange={(e) => updatePersonalInfo("maritalStatus", e.target.value)}
                >
                  <option value="" className="bg-slate-950">Select Status</option>
                  <option value="Single" className="bg-slate-950">Single</option>
                  <option value="Married" className="bg-slate-950">Married</option>
                  <option value="Divorced" className="bg-slate-950">Divorced</option>
                </select>
                {errors.maritalStatus && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.maritalStatus}</span>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Current Address *</label>
                <textarea
                  required
                  rows={2}
                  className={getInputClass(errors.currentAddress)}
                  value={contactInfo.currentAddress}
                  onChange={(e) => updateContactInfo("currentAddress", e.target.value)}
                />
                {errors.currentAddress && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.currentAddress}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Permanent Address</label>
                <textarea
                  rows={2}
                  className={getInputClass(errors.permanentAddress)}
                  value={contactInfo.permanentAddress}
                  onChange={(e) => updateContactInfo("permanentAddress", e.target.value)}
                />
                {errors.permanentAddress && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.permanentAddress}</span>
                )}
              </div>
              <div className="border-t border-white/5 pt-4">
                <h4 className="text-sm font-semibold mb-4 text-blue-400">Emergency Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Contact Name *</label>
                    <input
                      type="text"
                      className={getInputClass(errors.emergencyName)}
                      value={contactInfo.emergencyContact.name}
                      onChange={(e) => updateEmergencyContact("name", e.target.value)}
                    />
                    {errors.emergencyName && (
                      <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.emergencyName}</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Relationship *</label>
                    <input
                      type="text"
                      placeholder="e.g. Father"
                      className={getInputClass(errors.emergencyRelationship)}
                      value={contactInfo.emergencyContact.relationship}
                      onChange={(e) => updateEmergencyContact("relationship", e.target.value)}
                    />
                    {errors.emergencyRelationship && (
                      <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.emergencyRelationship}</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Contact Mobile Number *</label>
                    <input
                      type="text"
                      className={getInputClass(errors.emergencyPhone)}
                      value={contactInfo.emergencyContact.phone}
                      onChange={(e) => updateEmergencyContact("phone", e.target.value)}
                    />
                    {errors.emergencyPhone && (
                      <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.emergencyPhone}</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                  <h4 className="text-sm font-semibold text-blue-400">Education Background</h4>
                  {errors.educationList && (
                    <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.educationList}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAddEducation}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold transition"
                >
                  + Add Education
                </button>
              </div>

              {educationDetails.map((edu, idx) => (
                <div key={idx} className="border border-white/5 rounded-2xl p-5 bg-slate-950/20 space-y-4 relative">
                  {educationDetails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEducation(idx)}
                      className="absolute top-4 right-4 text-xs font-bold text-red-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Degree / Qualification</label>
                      <input
                        type="text"
                        placeholder="e.g. B.Tech / MBA"
                        className={getInputClass(errors.education && errors.education[idx] && errors.education[idx].degree)}
                        value={edu.degree}
                        onChange={(e) => updateEducationField(idx, "degree", e.target.value)}
                      />
                      {errors.education && errors.education[idx] && errors.education[idx].degree && (
                        <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">
                          {errors.education[idx].degree}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">College / Institution</label>
                      <input
                        type="text"
                        className={getInputClass(errors.education && errors.education[idx] && errors.education[idx].college)}
                        value={edu.college}
                        onChange={(e) => updateEducationField(idx, "college", e.target.value)}
                      />
                      {errors.education && errors.education[idx] && errors.education[idx].college && (
                        <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">
                          {errors.education[idx].college}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">University / Board</label>
                      <input
                        type="text"
                        className={getInputClass(errors.education && errors.education[idx] && errors.education[idx].university)}
                        value={edu.university}
                        onChange={(e) => updateEducationField(idx, "university", e.target.value)}
                      />
                      {errors.education && errors.education[idx] && errors.education[idx].university && (
                        <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">
                          {errors.education[idx].university}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Passing Year</label>
                      <input
                        type="number"
                        placeholder="YYYY"
                        className={getInputClass(errors.education && errors.education[idx] && errors.education[idx].passingYear)}
                        value={edu.passingYear}
                        onChange={(e) => updateEducationField(idx, "passingYear", e.target.value)}
                      />
                      {errors.education && errors.education[idx] && errors.education[idx].passingYear && (
                        <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">
                          {errors.education[idx].passingYear}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Percentage / CGPA</label>
                      <input
                        type="text"
                        placeholder="%"
                        className={getInputClass(errors.education && errors.education[idx] && errors.education[idx].percentage)}
                        value={edu.percentage}
                        onChange={(e) => updateEducationField(idx, "percentage", e.target.value)}
                      />
                      {errors.education && errors.education[idx] && errors.education[idx].percentage && (
                        <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">
                          {errors.education[idx].percentage}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-full mb-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-3">Professional Status *</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCandidateType("Fresher");
                      setProfessionalDetails({
                        experience: "Fresher",
                        currentCompany: "",
                        currentSalary: ""
                      });
                    }}
                    className={`flex-1 md:flex-initial text-center py-3 px-6 rounded-xl font-bold transition-all duration-200 border ${
                      candidateType === "Fresher"
                        ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10"
                        : "bg-slate-950/40 border-white/10 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    Fresher
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCandidateType("Experienced");
                      setProfessionalDetails(prev => ({
                        ...prev,
                        experience: prev.experience === "Fresher" ? "" : prev.experience
                      }));
                    }}
                    className={`flex-1 md:flex-initial text-center py-3 px-6 rounded-xl font-bold transition-all duration-200 border ${
                      candidateType === "Experienced"
                        ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10"
                        : "bg-slate-950/40 border-white/10 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    Experienced
                  </button>
                </div>
              </div>

              {candidateType === "Experienced" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Total Experience *</label>
                    <input
                      type="text"
                      placeholder="e.g. 2 Years"
                      className={getInputClass(errors.experience)}
                      value={professionalDetails.experience}
                      onChange={(e) => updateProfessionalDetails("experience", e.target.value)}
                    />
                    {errors.experience && (
                      <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.experience}</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Current/Last Company</label>
                    <input
                      type="text"
                      className={getInputClass(null)}
                      value={professionalDetails.currentCompany}
                      onChange={(e) => updateProfessionalDetails("currentCompany", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Current Salary (Annual CTC in INR)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500000"
                      className={getInputClass(null)}
                      value={professionalDetails.currentSalary}
                      onChange={(e) => updateProfessionalDetails("currentSalary", e.target.value)}
                    />
                  </div>
                </>
              )}
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Bank Name</label>
                <input
                  type="text"
                  className={getInputClass(errors.bankName)}
                  value={bankDetails.bankName}
                  onChange={(e) => updateBankDetails("bankName", e.target.value)}
                />
                {errors.bankName && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.bankName}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Account Number</label>
                <input
                  type="text"
                  className={getInputClass(errors.accountNumber)}
                  value={bankDetails.accountNumber}
                  onChange={(e) => updateBankDetails("accountNumber", e.target.value)}
                />
                {errors.accountNumber && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.accountNumber}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">IFSC Code</label>
                <input
                  type="text"
                  placeholder="e.g. SBIN0001234"
                  className={getInputClass(errors.ifscCode)}
                  value={bankDetails.ifscCode}
                  onChange={(e) => updateBankDetails("ifscCode", e.target.value.toUpperCase())}
                />
                {errors.ifscCode && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.ifscCode}</span>
                )}
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div key="step6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Nominee Full Name</label>
                <input
                  type="text"
                  className={getInputClass(errors.nomineeName)}
                  value={nomineeDetails.nomineeName}
                  onChange={(e) => updateNomineeDetails("nomineeName", e.target.value)}
                />
                {errors.nomineeName && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.nomineeName}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Relationship with Candidate</label>
                <input
                  type="text"
                  placeholder="e.g. Mother / Spouse"
                  className={getInputClass(errors.nomineeRelationship)}
                  value={nomineeDetails.relationship}
                  onChange={(e) => updateNomineeDetails("relationship", e.target.value)}
                />
                {errors.nomineeRelationship && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.nomineeRelationship}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Nominee Contact Number</label>
                <input
                  type="text"
                  className={getInputClass(errors.nomineePhone)}
                  value={nomineeDetails.contactNumber}
                  onChange={(e) => updateNomineeDetails("contactNumber", e.target.value)}
                />
                {errors.nomineePhone && (
                  <span className="text-red-400 text-xs mt-1 block font-medium animate-pulse">{errors.nomineePhone}</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Button Controls */}
      <div className="flex justify-between items-center mt-10 border-t border-white/5 pt-6">
        <button
          onClick={handlePrev}
          disabled={step === 1 || loading}
          className="flex items-center gap-2 rounded-xl border border-white/10 hover:bg-white/5 px-5 py-3 font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <FaChevronLeft size={12} /> Previous Step
        </button>

        {step < 6 ? (
          <button
            onClick={handleNext}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 font-semibold transition text-white"
          >
            Next Step <FaChevronRight size={12} />
          </button>
        ) : (
          <button
            onClick={async () => {
              if (!validateStep(6)) {
                return;
              }
              await handleSaveDraft();
              toast.success("Profile saved and finalized!");
              if (onSubmitSuccess) onSubmitSuccess();
            }}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 px-6 py-3 font-semibold transition text-white"
          >
            Complete & Submit
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileCompletionForm;
