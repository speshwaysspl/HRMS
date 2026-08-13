import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOffers, createOffer, sendOffer, revokeOffer } from "../../redux/slices/offerSlice";
import { fetchCandidates } from "../../redux/slices/candidateSlice";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toast } from "react-toastify";
import { FaPlus, FaPaperPlane, FaTimes, FaUndo, FaEye, FaCalendarAlt, FaBuilding, FaUserTie, FaMoneyBillWave } from "react-icons/fa";
import { SkeletonRow } from "../common/LoadingState";
import EmptyState from "../common/EmptyState";

const OfferManagement = () => {
  const dispatch = useDispatch();
  
  const { list: offers, loading: offersLoading } = useSelector((state) => state.offers);
  const { list: candidates } = useSelector((state) => state.candidates);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  
  // Create Offer form data
  const [form, setForm] = useState({
    candidateId: "",
    designation: "",
    department: "",
    reportingManager: "",
    salaryPackage: "",
    joiningDate: "",
    workLocation: "Hyderabad",
    probationPeriod: "6 months",
    noticePeriod: "2 months",
    expiryDate: ""
  });

  const [selectedOffer, setSelectedOffer] = useState(null);
  const [docsVerified, setDocsVerified] = useState(null);
  const [checkingDocs, setCheckingDocs] = useState(false);

  const handleCandidateChange = async (candidateId) => {
    setForm((prev) => ({ ...prev, candidateId }));
    if (!candidateId) {
      setDocsVerified(null);
      return;
    }
    setCheckingDocs(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/onboarding/documents/${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const docs = res.data.documents || [];
        const verified = docs.length > 0 && docs.every((d) => d.status === "Approved");
        setDocsVerified(verified);
      } else {
        setDocsVerified(false);
      }
    } catch (err) {
      console.error(err);
      setDocsVerified(false);
    } finally {
      setCheckingDocs(false);
    }
  };

  useEffect(() => {
    dispatch(fetchOffers());
    // Fetch candidates with Selected status to create offers
    dispatch(fetchCandidates({ limit: 100 }));
    
    const fetchDeptsAndManagers = async () => {
      try {
        const token = localStorage.getItem("token");
        
        // Fetch departments
        const depRes = await axios.get(`${API_BASE}/api/department`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (depRes.data.success) {
          setDepartments(depRes.data.departments || []);
        }

        // Fetch managers (we can fetch all active employees/admins to act as managers)
        const empRes = await axios.get(`${API_BASE}/api/employee`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (empRes.data.success) {
          setManagers(empRes.data.employees || []);
        }
      } catch (err) {
        console.error("Failed to fetch dependencies", err);
      }
    };
    fetchDeptsAndManagers();
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.candidateId || !form.designation || !form.department || !form.reportingManager || !form.salaryPackage || !form.joiningDate) {
      toast.warning("Please fill in all required fields!");
      return;
    }

    setLoading(true);
    try {
      const resultAction = await dispatch(createOffer(form));
      if (createOffer.fulfilled.match(resultAction)) {
        toast.success("Offer Letter generated successfully!");
        setShowCreateForm(false);
        setForm({
          candidateId: "",
          designation: "",
          department: "",
          reportingManager: "",
          salaryPackage: "",
          joiningDate: "",
          workLocation: "Hyderabad",
          probationPeriod: "6 months",
          noticePeriod: "2 months",
          expiryDate: ""
        });
        dispatch(fetchOffers());
      } else {
        toast.error(resultAction.payload || "Failed to generate offer letter");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOffer = async (id) => {
    try {
      const resultAction = await dispatch(sendOffer(id));
      if (sendOffer.fulfilled.match(resultAction)) {
        toast.success("Offer Letter sent to candidate successfully!");
        dispatch(fetchOffers());
      } else {
        toast.error(resultAction.payload || "Failed to send offer");
      }
    } catch (err) {
      toast.error("Error sending offer");
    }
  };

  const handleRevokeOffer = async (id) => {
    if (window.confirm("Are you sure you want to revoke this offer?")) {
      try {
        const resultAction = await dispatch(revokeOffer(id));
        if (revokeOffer.fulfilled.match(resultAction)) {
          toast.info("Offer letter has been revoked.");
          dispatch(fetchOffers());
        } else {
          toast.error(resultAction.payload || "Failed to revoke offer");
        }
      } catch (err) {
        toast.error("Error revoking offer");
      }
    }
  };

  const getStatusColor = (statusVal) => {
    switch (statusVal) {
      case "Accepted": return "bg-accent-100 text-accent-700";
      case "Sent": return "bg-brand-100 text-brand-700";
      case "Rejected": return "bg-red-100 text-red-700";
      case "Revoked": return "bg-surface-subtle text-ink-muted";
      default: return "bg-amber-100 text-amber-700";
    }
  };

  // Only allow creating offers for Selected / Pre-Onboarding candidates
  const eligibleCandidates = candidates.filter(c => ["Selected", "Pre-Onboarding", "Applied"].includes(c.status));

  return (
    <div className="space-y-6">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Job Offer Management</h2>
          <p className="text-sm text-ink-muted mt-1">Generate PDF contracts, manage salary definitions, and monitor acceptance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Table column list of offers */}
        <div className="rounded-xl border border-surface-subtle bg-white shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-surface-subtle bg-surface-muted text-ink-muted text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Candidate</th>
                  <th className="py-3.5 px-6">Designation</th>
                  <th className="py-3.5 px-6">CTC</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-subtle text-ink text-sm">
                {offersLoading ? (
                  <>
                    <SkeletonRow columns={5} />
                    <SkeletonRow columns={5} />
                    <SkeletonRow columns={5} />
                  </>
                ) : offers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8">
                      <EmptyState title="No offers generated yet" message="Offers you create will appear here." />
                    </td>
                  </tr>
                ) : (
                  offers.map((o) => (
                    <tr
                      key={o._id}
                      onClick={() => setSelectedOffer(o)}
                      className={`hover:bg-surface-muted cursor-pointer transition-colors ${
                        selectedOffer?._id === o._id ? "bg-brand-50" : ""
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="font-semibold text-ink">{o.candidateId?.fullName}</div>
                        <div className="text-xs text-ink-faint mt-0.5">{o.candidateId?.candidateId}</div>
                      </td>
                      <td className="py-4 px-6 font-medium">{o.designation}</td>
                      <td className="py-4 px-6 font-semibold">
                        {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(o.salaryPackage)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        {o.offerLetterUrl && (
                          <a
                            href={o.offerLetterUrl.startsWith("http") ? o.offerLetterUrl : `${API_BASE}${o.offerLetterUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-surface-muted text-ink-muted hover:bg-surface-subtle transition-colors inline-flex items-center justify-center"
                            title="Preview PDF"
                          >
                            <FaEye size={14} />
                          </a>
                        )}
                        {o.status === "Pending" && (
                          <button
                            onClick={() => handleSendOffer(o._id)}
                            className="p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors inline-flex items-center justify-center"
                            title="Send Offer Letter"
                          >
                            <FaPaperPlane size={14} />
                          </button>
                        )}
                        {o.status === "Sent" && (
                          <button
                            onClick={() => handleRevokeOffer(o._id)}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors inline-flex items-center justify-center"
                            title="Revoke Offer"
                          >
                            <FaTimes size={14} />
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


      </div>

      {/* Create Offer Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-surface-subtle bg-white p-6 md:p-8 shadow-panel relative max-h-[90vh] overflow-y-auto text-ink">
            <button
              onClick={() => { setShowCreateForm(false); setDocsVerified(null); setCheckingDocs(false); }}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink transition-colors"
            >
              <FaTimes size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-brand-50 text-brand-600"><FaUserTie size={22} /></div>
              <h3 className="text-xl font-semibold text-ink">Generate Offer Letter</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Select Candidate *</label>
                  <select
                    required
                    className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink outline-none focus:border-brand-500 text-sm"
                    value={form.candidateId}
                    onChange={(e) => handleCandidateChange(e.target.value)}
                  >
                    <option value="" disabled>Select Candidate</option>
                    {eligibleCandidates.map((c) => (
                      <option key={c._id} value={c._id}>{c.fullName} ({c.candidateId})</option>
                    ))}
                  </select>
                  {checkingDocs && <p className="text-xs text-amber-600 mt-1.5">Checking document verification status...</p>}
                  {docsVerified === false && (
                    <p className="text-xs text-red-600 mt-1.5 font-medium">
                      Candidate must have all uploaded documents verified (Approved) by HR first.
                    </p>
                  )}
                  {docsVerified === true && (
                    <p className="text-xs text-accent-700 mt-1.5 font-medium">
                      All documents verified. Candidate eligible for offer letter.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Designation / Title *</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink placeholder-ink-faint outline-none focus:border-brand-500 text-sm"
                    placeholder="e.g. Senior Software Engineer"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Department *</label>
                  <select
                    required
                    className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink outline-none focus:border-brand-500 text-sm"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    <option value="" disabled>Select Department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.dep_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Reporting Manager *</label>
                  <select
                    required
                    className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink outline-none focus:border-brand-500 text-sm"
                    value={form.reportingManager}
                    onChange={(e) => setForm({ ...form, reportingManager: e.target.value })}
                  >
                    <option value="" disabled>Select Manager</option>
                    {managers.map((m) => (
                      <option key={m.userId?._id} value={m.userId?._id}>{m.userId?.name} ({m.designation})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">CTC Package (Annual INR) *</label>
                  <input
                    type="number"
                    required
                    className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink placeholder-ink-faint outline-none focus:border-brand-500 text-sm"
                    placeholder="e.g. 600000"
                    value={form.salaryPackage}
                    onChange={(e) => setForm({ ...form, salaryPackage: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Expected Joining Date *</label>
                  <input
                    type="date"
                    required
                    className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink outline-none focus:border-brand-500 text-sm"
                    value={form.joiningDate}
                    onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Work Location</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink outline-none focus:border-brand-500 text-sm"
                    value={form.workLocation}
                    onChange={(e) => setForm({ ...form, workLocation: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Offer Expiry Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink outline-none focus:border-brand-500 text-sm"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Probation Period</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink outline-none focus:border-brand-500 text-sm"
                    value={form.probationPeriod}
                    onChange={(e) => setForm({ ...form, probationPeriod: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Notice Period</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink outline-none focus:border-brand-500 text-sm"
                    value={form.noticePeriod}
                    onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-surface-subtle pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); setDocsVerified(null); setCheckingDocs(false); }}
                  className="rounded-lg border border-surface-subtle bg-white px-6 py-3 font-medium text-ink hover:bg-surface-muted transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || checkingDocs || docsVerified !== true}
                  className="rounded-lg bg-accent-600 hover:bg-accent-700 px-6 py-3 font-medium text-white transition-colors text-sm disabled:opacity-50"
                >
                  {loading ? "Generating PDF..." : "Generate Offer PDF"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferManagement;
