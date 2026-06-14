import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCandidates } from "../../redux/slices/candidateSlice";
import { fetchOffers, createOffer, sendOffer } from "../../redux/slices/offerSlice";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toast } from "react-toastify";
import { FaEye, FaPaperPlane, FaCheck } from "react-icons/fa";

const ReadyForOffer = () => {
  const dispatch = useDispatch();
  const { list: candidates, loading: candidatesLoading } = useSelector((state) => state.candidates);
  const { list: offers, loading: offersLoading } = useSelector((state) => state.offers);
  const [candidateDocs, setCandidateDocs] = useState({});
  const [loadingDocs, setLoadingDocs] = useState({});
  const [inlineEdits, setInlineEdits] = useState({});
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [creatingOffer, setCreatingOffer] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [creatingAppointment, setCreatingAppointment] = useState(null);

  // Helper to initialize inline edits
  const getInlineEdit = (candidateId, offer, candidate) => {
    if (!inlineEdits[candidateId]) {
      const newEdit = {
        designation: offer?.designation || candidate?.position || "",
        salaryPackage: offer?.salaryPackage ? (offer.salaryPackage / 100000).toFixed(1) : "",
        joiningDate: offer?.joiningDate ? new Date(offer.joiningDate).toISOString().split('T')[0] : (candidate?.expectedJoiningDate ? new Date(candidate.expectedJoiningDate).toISOString().split('T')[0] : ""),
        reportingTime: offer?.reportingTime || "09:00",
        department: offer?.department || candidate?.department?._id || candidate?.department || (departments.length > 0 ? departments[0]._id : ""),
        reportingManager: offer?.reportingManager || (managers.length > 0 ? (managers[0].userId?._id || managers[0]._id) : ""),
        workLocation: offer?.workLocation || "Hyderabad",
        probationPeriod: offer?.probationPeriod || "6 months",
        noticePeriod: offer?.noticePeriod || "2 months",
        expiryDate: offer?.expiryDate ? new Date(offer.expiryDate).toISOString().split('T')[0] : ""
      };
      setInlineEdits(prev => ({
        ...prev,
        [candidateId]: newEdit
      }));
      return newEdit;
    }
    
    // Self-heal: If it exists, but department/reportingManager are falsy, make sure we fill them in using the loaded lists
    const existingEdit = inlineEdits[candidateId];
    let changed = false;
    if (!existingEdit.department && (departments.length > 0 || candidate?.department)) {
      existingEdit.department = offer?.department || candidate?.department?._id || candidate?.department || (departments.length > 0 ? departments[0]._id : "");
      changed = true;
    }
    if (!existingEdit.reportingManager && managers.length > 0) {
      existingEdit.reportingManager = offer?.reportingManager || (managers[0].userId?._id || managers[0]._id);
      changed = true;
    }
    if (changed) {
      setInlineEdits(prev => ({
        ...prev,
        [candidateId]: { ...existingEdit }
      }));
    }
    
    return existingEdit;
  };

  // Helper to update inline edits
  const updateInlineEdit = (candidateId, field, value) => {
    setInlineEdits(prev => ({
      ...prev,
      [candidateId]: {
        ...prev[candidateId],
        [field]: value
      }
    }));
  };

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAppointments(res.data.appointments || []);
      }
    } catch (err) {
      console.error("Failed to fetch appointments", err);
    }
  };

  // Fetch dependencies
  useEffect(() => {
    dispatch(fetchCandidates({ limit: 100 }));
    dispatch(fetchOffers());
    fetchAppointments();
    const fetchDeptsAndManagers = async () => {
      try {
        const token = localStorage.getItem("token");
        const [depRes, empRes] = await Promise.all([
          axios.get(`${API_BASE}/api/department`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE}/api/employee`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (depRes.data.success) setDepartments(depRes.data.departments || []);
        if (empRes.data.success) setManagers(empRes.data.employees || []);
      } catch (err) {
        console.error("Failed to fetch dependencies", err);
      }
    };
    fetchDeptsAndManagers();
  }, [dispatch]);

  const eligibleCandidates = candidates.filter(candidate => {
    const docs = candidateDocs[candidate._id];
    return docs && docs.length > 0 && docs.every(d => d.status === "Approved");
  });

  const fetchCandidateDocs = async (candidateId) => {
    if (candidateDocs[candidateId] || loadingDocs[candidateId]) return;
    setLoadingDocs(prev => ({ ...prev, [candidateId]: true }));
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/onboarding/documents/${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setCandidateDocs(prev => ({ ...prev, [candidateId]: res.data.documents || [] }));
      }
    } catch (err) {
      console.error("Failed to fetch docs", err);
    } finally {
      setLoadingDocs(prev => ({ ...prev, [candidateId]: false }));
    }
  };

  useEffect(() => {
    candidates.forEach(c => fetchCandidateDocs(c._id));
  }, [candidates]);

  useEffect(() => {
    if (candidates.length > 0) {
      const initialEdits = { ...inlineEdits };
      let updated = false;
      candidates.forEach(candidate => {
        const offer = offers.find(o => o.candidateId?._id === candidate._id || o.candidateId === candidate._id);
        
        const designation = offer?.designation || candidate?.position || "";
        const salaryPackage = offer?.salaryPackage ? (offer.salaryPackage / 100000).toFixed(1) : "";
        const joiningDate = offer?.joiningDate ? new Date(offer.joiningDate).toISOString().split('T')[0] : (candidate?.expectedJoiningDate ? new Date(candidate.expectedJoiningDate).toISOString().split('T')[0] : "");
        const reportingTime = offer?.reportingTime || "09:00";
        const department = offer?.department?._id || offer?.department || candidate?.department?._id || candidate?.department || (departments.length > 0 ? departments[0]._id : "");
        const reportingManager = offer?.reportingManager?._id || offer?.reportingManager || (managers.length > 0 ? (managers[0].userId?._id || managers[0]._id) : "");
        const workLocation = offer?.workLocation || "Hyderabad";
        const probationPeriod = offer?.probationPeriod || "6 months";
        const noticePeriod = offer?.noticePeriod || "2 months";
        const expiryDate = offer?.expiryDate ? new Date(offer.expiryDate).toISOString().split('T')[0] : "";

        if (!initialEdits[candidate._id]) {
          initialEdits[candidate._id] = {
            designation,
            salaryPackage,
            joiningDate,
            reportingTime,
            department,
            reportingManager,
            workLocation,
            probationPeriod,
            noticePeriod,
            expiryDate
          };
          updated = true;
        } else {
          // If already initialized, but department or reportingManager was empty and is now available, update them
          const currentEdit = initialEdits[candidate._id];
          if (!currentEdit.department && department) {
            currentEdit.department = department;
            updated = true;
          }
          if (!currentEdit.reportingManager && reportingManager) {
            currentEdit.reportingManager = reportingManager;
            updated = true;
          }
        }
      });
      if (updated) {
        setInlineEdits(initialEdits);
      }
    }
  }, [candidates, offers, departments, managers]);

  const getOfferForCandidate = (candidateId) => {
    return offers.find(o => o.candidateId?._id === candidateId || o.candidateId === candidateId);
  };

  const getAppointmentForCandidate = (candidateId) => {
    return appointments.find(a => a.candidateId?._id === candidateId || a.candidateId === candidateId);
  };

  // Handle Preview Offer (fetches dynamic PDF preview without S3/DB saving)
  const handlePreviewOffer = async (candidate) => {
    const edit = getInlineEdit(candidate._id, null, candidate);
    
    if (!edit.designation || !edit.department || !edit.joiningDate) {
      toast.warning("Please fill in designation, department, and joining date first");
      return;
    }

    // Open a blank tab immediately to prevent popup blockers
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Generating Preview...</title>
          </head>
          <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0f172a;color:#94a3b8;margin:0;">
            <div style="text-align:center;">
              <div style="border:4px solid #38bdf8;border-top-color:transparent;border-radius:50%;width:30px;height:30px;animation:spin 1s linear infinite;margin:0 auto 15px;"></div>
              <div>Generating PDF Preview...</div>
            </div>
            <style>
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </body>
        </html>
      `);
    }

    setCreatingOffer(candidate._id);
    
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/recruitment/candidate/${candidate._id}/preview-offer`, {
        params: {
          designation: edit.designation,
          joiningDate: edit.joiningDate,
          reportingTime: edit.reportingTime,
          ctc: parseFloat(edit.salaryPackage || "0") * 100000
        },
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });
      
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      if (newWindow) {
        newWindow.location.href = url;
      } else {
        window.open(url, "_blank");
      }
      toast.success("Offer letter preview generated successfully!");
    } catch (err) {
      console.error(err);
      if (newWindow) newWindow.close();
      toast.error("Failed to generate preview");
    } finally {
      setCreatingOffer(null);
    }
  };

  const handleSendOffer = async (offerId) => {
    try {
      const resultAction = await dispatch(sendOffer(offerId));
      if (sendOffer.fulfilled.match(resultAction)) {
        toast.success("Offer letter sent to candidate successfully!");
        dispatch(fetchOffers());
        dispatch(fetchCandidates({ limit: 100 }));
      } else {
        toast.error(resultAction.payload || "Failed to send offer");
      }
    } catch (err) {
      toast.error("Error sending offer");
    }
  };

  const handleCreateAndSendOffer = async (candidate) => {
    const edit = getInlineEdit(candidate._id, null, candidate);
    
    if (!edit.designation || !edit.joiningDate) {
      toast.warning("Please fill in designation and joining date first");
      return;
    }

    setCreatingOffer(candidate._id);
    try {
      const offerData = {
        candidateId: candidate._id,
        designation: edit.designation,
        department: edit.department || (departments.length > 0 ? departments[0]._id : undefined),
        reportingManager: edit.reportingManager || (managers.length > 0 ? (managers[0].userId?._id || managers[0]._id) : undefined),
        salaryPackage: parseFloat(edit.salaryPackage || "0") * 100000,
        joiningDate: edit.joiningDate,
        reportingTime: edit.reportingTime,
        workLocation: edit.workLocation,
        probationPeriod: edit.probationPeriod,
        noticePeriod: edit.noticePeriod,
        expiryDate: edit.expiryDate || new Date(new Date(edit.joiningDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      if (!offerData.department) {
        toast.warning("No department available to associate with the offer");
        setCreatingOffer(null);
        return;
      }
      if (!offerData.reportingManager) {
        toast.warning("No reporting manager available to associate with the offer");
        setCreatingOffer(null);
        return;
      }

      const resultAction = await dispatch(createOffer(offerData));
      if (createOffer.fulfilled.match(resultAction)) {
        const createdOffer = resultAction.payload.offer;
        const sendResult = await dispatch(sendOffer(createdOffer._id));
        if (sendOffer.fulfilled.match(sendResult)) {
          toast.success("Offer letter generated and sent successfully!");
          dispatch(fetchOffers());
          dispatch(fetchCandidates({ limit: 100 }));
        } else {
          toast.error(sendResult.payload || "Failed to send offer after generation");
        }
      } else {
        toast.error(resultAction.payload || "Failed to generate offer letter");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error generating/sending offer");
    } finally {
      setCreatingOffer(null);
    }
  };

  const handleSendBoth = async (candidate) => {
    const edit = getInlineEdit(candidate._id, null, candidate);

    if (!edit.designation || !edit.joiningDate) {
      toast.warning("Please fill in designation and joining date first");
      return;
    }

    if (!window.confirm(`Are you sure you want to send both Offer and Appointment Letters to ${candidate.fullName}?`)) {
      return;
    }

    setCreatingOffer(candidate._id);
    setCreatingAppointment(candidate._id);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/recruitment/candidate/${candidate._id}/send-both`, {
        designation: edit.designation,
        department: edit.department || (departments.length > 0 ? departments[0]._id : undefined),
        reportingManager: edit.reportingManager || (managers.length > 0 ? (managers[0].userId?._id || managers[0]._id) : undefined),
        salaryPackage: parseFloat(edit.salaryPackage || "0") * 100000,
        joiningDate: edit.joiningDate,
        reportingTime: edit.reportingTime,
        workLocation: edit.workLocation,
        probationPeriod: edit.probationPeriod,
        noticePeriod: edit.noticePeriod,
        expiryDate: edit.expiryDate || new Date(new Date(edit.joiningDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success("Both Offer and Appointment letters sent successfully!");
      } else {
        toast.error(res.data.error || "Failed to send letters.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Error sending both letters");
    } finally {
      setCreatingOffer(null);
      setCreatingAppointment(null);
      dispatch(fetchOffers());
      fetchAppointments();
      dispatch(fetchCandidates({ limit: 100 }));
    }
  };

  const handlePreviewAppointment = async (candidate) => {
    const edit = getInlineEdit(candidate._id, null, candidate);
    
    if (!edit.designation || !edit.joiningDate) {
      toast.warning("Please fill in designation and joining date first");
      return;
    }

    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Generating Preview...</title>
          </head>
          <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0f172a;color:#94a3b8;margin:0;">
            <div style="text-align:center;">
              <div style="border:4px solid #38bdf8;border-top-color:transparent;border-radius:50%;width:30px;height:30px;animation:spin 1s linear infinite;margin:0 auto 15px;"></div>
              <div>Generating PDF Preview...</div>
            </div>
            <style>
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </body>
        </html>
      `);
    }

    setCreatingAppointment(candidate._id);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/appointments/candidate/${candidate._id}/preview`, {
        params: {
          designation: edit.designation,
          joiningDate: edit.joiningDate,
          reportingTime: edit.reportingTime,
          salaryPackage: parseFloat(edit.salaryPackage || "0") * 100000,
          probationPeriod: edit.probationPeriod,
          noticePeriod: edit.noticePeriod
        },
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      if (newWindow) {
        newWindow.location.href = url;
      } else {
        window.open(url, "_blank");
      }
      toast.success("Appointment letter preview generated!");
    } catch (err) {
      console.error(err);
      if (newWindow) newWindow.close();
      toast.error("Failed to generate preview");
    } finally {
      setCreatingAppointment(null);
    }
  };

  const handleSendAppointment = async (candidate) => {
    const edit = getInlineEdit(candidate._id, null, candidate);

    if (!edit.designation || !edit.joiningDate) {
      toast.warning("Please fill in designation and joining date first");
      return;
    }

    if (!window.confirm(`Are you sure you want to send the Letter of Appointment to ${candidate.fullName}?`)) {
      return;
    }

    setCreatingAppointment(candidate._id);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/appointments/candidate/${candidate._id}/send`, {
        designation: edit.designation,
        joiningDate: edit.joiningDate,
        reportingTime: edit.reportingTime,
        salaryPackage: parseFloat(edit.salaryPackage || "0") * 100000,
        department: edit.department,
        probationPeriod: edit.probationPeriod,
        noticePeriod: edit.noticePeriod
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success("Appointment letter sent to candidate successfully!");
        fetchAppointments();
        dispatch(fetchOffers());
        dispatch(fetchCandidates({ limit: 100 }));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to send appointment letter");
    } finally {
      setCreatingAppointment(null);
    }
  };

  const handleCreatePermanentEmployee = async (candidate) => {
    if (!window.confirm(`Are you sure you want to activate candidate ${candidate.fullName} as a permanent active employee? This will finalize their credentials.`)) {
      return;
    }

    setCreatingAppointment(candidate._id);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/appointments/candidate/${candidate._id}/convert`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success(`Employee created successfully! ID: ${res.data.employeeId}`);
        fetchAppointments();
        dispatch(fetchOffers());
        dispatch(fetchCandidates({ limit: 100 }));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to create employee record");
    } finally {
      setCreatingAppointment(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Ready For Offer Letters</h2>
          <p className="text-slate-400 text-sm mt-1">List of candidates who have passed all checklist and document reviews.</p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-4 text-left">Candidate Name</th>
                <th className="px-6 py-4 text-left">Designation</th>
                <th className="px-6 py-4 text-left">Package (LPA)</th>
                <th className="px-6 py-4 text-left">Joining Date</th>
                <th className="px-6 py-4 text-left">Reporting Time</th>
                <th className="px-6 py-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-slate-200">
              {candidatesLoading || offersLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : eligibleCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No eligible candidates yet.
                  </td>
                </tr>
              ) : (
                eligibleCandidates.map(candidate => {
                  const offer = getOfferForCandidate(candidate._id);
                  const appointment = getAppointmentForCandidate(candidate._id);
                  const docs = candidateDocs[candidate._id] || [];
                  const edit = getInlineEdit(candidate._id, offer, candidate);
                  return (
                    <tr key={candidate._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{candidate.fullName}</div>
                        <div className="text-xs text-slate-500">{candidate.candidateId}</div>
                      </td>
                      <>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={edit.designation}
                            onChange={(e) => updateInlineEdit(candidate._id, "designation", e.target.value)}
                            className="w-full px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                            placeholder="Designation"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            step="0.1"
                            value={edit.salaryPackage}
                            onChange={(e) => updateInlineEdit(candidate._id, "salaryPackage", e.target.value)}
                            className="w-full px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                            placeholder="0.0"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="date"
                            value={edit.joiningDate}
                            onChange={(e) => updateInlineEdit(candidate._id, "joiningDate", e.target.value)}
                            className="w-full px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="time"
                            value={edit.reportingTime}
                            onChange={(e) => updateInlineEdit(candidate._id, "reportingTime", e.target.value)}
                            className="w-full px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                          />
                        </td>
                      </>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          {/* Offer Letter Actions Row */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePreviewOffer(candidate)}
                              disabled={creatingOffer === candidate._id}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                            >
                              {creatingOffer === candidate._id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Generating...
                                </>
                              ) : (
                                  <>
                                    <FaEye className="inline" size={12} />
                                    Preview Offer
                                  </>
                              )}
                            </button>
                            {!offer && (
                              <button
                                onClick={() => handleCreateAndSendOffer(candidate)}
                                disabled={creatingOffer === candidate._id}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                              >
                                {creatingOffer === candidate._id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <FaPaperPlane className="inline mr-2" size={12} />
                                    Send Offer
                                  </>
                                )}
                              </button>
                            )}
                            {offer && offer.status === "Pending" && (
                              <button
                                onClick={() => handleSendOffer(offer._id)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                              >
                                <FaPaperPlane className="inline mr-2" size={12} />
                                Send Offer
                              </button>
                            )}
                            {offer && offer.status === "Sent" && (
                              <span className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm font-semibold">
                                Offer Sent
                              </span>
                            )}
                            {offer && offer.status === "Accepted" && (
                              <span className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm font-semibold">
                                Offer Accepted
                              </span>
                            )}
                          </div>

                          {/* Appointment Letter Actions Row */}
                          <div className="flex items-center gap-2 border-t border-slate-700/50 pt-2">
                            <button
                              onClick={() => handlePreviewAppointment(candidate)}
                              disabled={creatingAppointment === candidate._id}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                            >
                              {creatingAppointment === candidate._id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <FaEye className="inline" size={12} />
                                  Preview Appointment
                                </>
                              )}
                            </button>
                            {candidate.status !== "Employee Created" && (!appointment || appointment.status === "Pending") && (
                              <button
                                onClick={() => handleSendAppointment(candidate)}
                                disabled={creatingAppointment === candidate._id}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                              >
                                {creatingAppointment === candidate._id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <FaPaperPlane className="inline mr-2" size={12} />
                                    Send Appointment
                                  </>
                                )}
                              </button>
                            )}
                            {appointment && appointment.status === "Sent" && (
                              <span className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm font-semibold">
                                Appointment Sent
                              </span>
                            )}
                            {appointment && appointment.status === "Accepted" && (
                              <span className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm font-semibold">
                                Appointment Accepted
                              </span>
                            )}
                          </div>

                          {/* Employee Status / Action Row */}
                          {(candidate.status === "Employee Created" || (appointment && (appointment.status === "Sent" || appointment.status === "Accepted") && offer && offer.status === "Accepted")) && (
                            <div className="flex items-center gap-2 border-t border-slate-700/50 pt-2">
                              {candidate.status === "Employee Created" ? (
                                <span className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm font-semibold w-full text-center">
                                  Employee Created
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleCreatePermanentEmployee(candidate)}
                                  disabled={creatingAppointment === candidate._id}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 w-full justify-center"
                                >
                                  {creatingAppointment === candidate._id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      Creating Employee...
                                    </>
                                  ) : (
                                    <>
                                      <FaCheck className="inline" size={12} />
                                      Create Permanent Employee
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Send Both Actions Row */}
                          {candidate.status !== "Employee Created" && (!offer || offer.status === "Pending") && (!appointment || appointment.status === "Pending") && (
                            <div className="flex items-center gap-2 border-t border-slate-700/50 pt-2">
                              <button
                                onClick={() => handleSendBoth(candidate)}
                                disabled={creatingOffer === candidate._id || creatingAppointment === candidate._id}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 w-full justify-center shadow-lg hover:shadow-indigo-500/20"
                              >
                                {creatingOffer === candidate._id || creatingAppointment === candidate._id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Sending Both...
                                  </>
                                ) : (
                                  <>
                                    <FaPaperPlane className="inline" size={12} />
                                    Send Both (Offer & Appointment)
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReadyForOffer;
