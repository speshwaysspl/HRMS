import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCandidates } from "../../redux/slices/candidateSlice";
import { fetchOffers, createOffer, sendOffer } from "../../redux/slices/offerSlice";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toast } from "react-toastify";
import { FaEye, FaPaperPlane, FaCheck } from "react-icons/fa";
import { SkeletonRow } from "../common/LoadingState";
import EmptyState from "../common/EmptyState";

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Ready For Offer Letters</h2>
          <p className="text-ink-muted text-sm mt-1">List of candidates who have passed all checklist and document reviews.</p>
        </div>
      </div>

      <div className="bg-white border border-surface-subtle rounded-xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-muted text-ink-muted text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5 text-left">Candidate Name</th>
                <th className="px-6 py-3.5 text-left">Designation</th>
                <th className="px-6 py-3.5 text-left">Package (LPA)</th>
                <th className="px-6 py-3.5 text-left">Joining Date</th>
                <th className="px-6 py-3.5 text-left">Reporting Time</th>
                <th className="px-6 py-3.5 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle text-ink text-sm">
              {candidatesLoading || offersLoading ? (
                <>
                  <SkeletonRow columns={6} />
                  <SkeletonRow columns={6} />
                  <SkeletonRow columns={6} />
                </>
              ) : eligibleCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <EmptyState title="No eligible candidates yet" message="Candidates appear here once all checklist and document reviews are complete." />
                  </td>
                </tr>
              ) : (
                eligibleCandidates.map(candidate => {
                  const offer = getOfferForCandidate(candidate._id);
                  const appointment = getAppointmentForCandidate(candidate._id);
                  const docs = candidateDocs[candidate._id] || [];
                  const edit = getInlineEdit(candidate._id, offer, candidate);
                  return (
                    <tr key={candidate._id} className="hover:bg-surface-muted transition-colors">
                      <td className="px-6 py-4 max-w-[180px]">
                        <div className="font-semibold text-ink truncate">{candidate.fullName}</div>
                        <div className="text-xs text-ink-faint truncate">{candidate.candidateId}</div>
                      </td>
                      <>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={edit.designation}
                            onChange={(e) => updateInlineEdit(candidate._id, "designation", e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-surface-subtle rounded-lg text-sm text-ink focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            placeholder="Designation"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            step="0.1"
                            value={edit.salaryPackage}
                            onChange={(e) => updateInlineEdit(candidate._id, "salaryPackage", e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-surface-subtle rounded-lg text-sm text-ink focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            placeholder="0.0"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="date"
                            value={edit.joiningDate}
                            onChange={(e) => updateInlineEdit(candidate._id, "joiningDate", e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-surface-subtle rounded-lg text-sm text-ink focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="time"
                            value={edit.reportingTime}
                            onChange={(e) => updateInlineEdit(candidate._id, "reportingTime", e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-surface-subtle rounded-lg text-sm text-ink focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                          />
                        </td>
                      </>
                      <td className="px-6 py-4 min-w-[260px]">
                        {(() => {
                          const packageEntered = !!edit.salaryPackage && parseFloat(edit.salaryPackage) > 0;
                          const disabledTitle = !packageEntered ? "Enter the package (LPA) first" : undefined;
                          return (
                            <div className="space-y-2">
                              {!packageEntered && (
                                <p className="text-[11px] text-amber-700 font-medium">Enter package to enable actions</p>
                              )}

                              <div className="flex flex-wrap gap-1.5">
                                {offer?.status === "Sent" && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Offer Sent</span>
                                )}
                                {offer?.status === "Accepted" && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-accent-100 text-accent-700">Offer Accepted</span>
                                )}
                                {appointment?.status === "Sent" && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Appt. Sent</span>
                                )}
                                {appointment?.status === "Accepted" && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-accent-100 text-accent-700">Appt. Accepted</span>
                                )}
                                {candidate.status === "Employee Created" && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-accent-100 text-accent-700">Employee Created</span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  onClick={() => handlePreviewOffer(candidate)}
                                  disabled={!packageEntered || creatingOffer === candidate._id}
                                  title={disabledTitle}
                                  className="px-2.5 py-1.5 border border-surface-subtle bg-white hover:bg-surface-muted text-ink disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <FaEye size={11} /> {creatingOffer === candidate._id ? "Generating..." : "Preview Offer"}
                                </button>

                                {(!offer || offer.status === "Pending") ? (
                                  <button
                                    onClick={() => offer ? handleSendOffer(offer._id) : handleCreateAndSendOffer(candidate)}
                                    disabled={!packageEntered || creatingOffer === candidate._id}
                                    title={disabledTitle}
                                    className="px-2.5 py-1.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                                  >
                                    <FaPaperPlane size={11} /> {creatingOffer === candidate._id ? "Sending..." : "Send Offer"}
                                  </button>
                                ) : <span />}

                                <button
                                  onClick={() => handlePreviewAppointment(candidate)}
                                  disabled={!packageEntered || creatingAppointment === candidate._id}
                                  title={disabledTitle}
                                  className="px-2.5 py-1.5 border border-surface-subtle bg-white hover:bg-surface-muted text-ink disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <FaEye size={11} /> {creatingAppointment === candidate._id ? "Generating..." : "Preview Appt."}
                                </button>

                                {candidate.status !== "Employee Created" && (!appointment || appointment.status === "Pending") ? (
                                  <button
                                    onClick={() => handleSendAppointment(candidate)}
                                    disabled={!packageEntered || creatingAppointment === candidate._id}
                                    title={disabledTitle}
                                    className="px-2.5 py-1.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                                  >
                                    <FaPaperPlane size={11} /> {creatingAppointment === candidate._id ? "Sending..." : "Send Appt."}
                                  </button>
                                ) : <span />}
                              </div>

                              {candidate.status !== "Employee Created" && (!offer || offer.status === "Pending") && (!appointment || appointment.status === "Pending") && (
                                <button
                                  onClick={() => handleSendBoth(candidate)}
                                  disabled={!packageEntered || creatingOffer === candidate._id || creatingAppointment === candidate._id}
                                  title={disabledTitle}
                                  className="w-full px-3 py-1.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <FaPaperPlane size={11} /> Send Both (Offer & Appointment)
                                </button>
                              )}

                              {candidate.status !== "Employee Created" && appointment && (appointment.status === "Sent" || appointment.status === "Accepted") && offer && offer.status === "Accepted" && (
                                <button
                                  onClick={() => handleCreatePermanentEmployee(candidate)}
                                  disabled={!packageEntered || creatingAppointment === candidate._id}
                                  title={disabledTitle}
                                  className="w-full px-3 py-1.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <FaCheck size={11} /> {creatingAppointment === candidate._id ? "Creating Employee..." : "Create Permanent Employee"}
                                </button>
                              )}
                            </div>
                          );
                        })()}
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
