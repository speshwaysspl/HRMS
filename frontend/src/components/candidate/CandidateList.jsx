import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCandidates, deleteCandidate, updateCandidateAccountStatus } from "../../redux/slices/candidateSlice";
import { useNavigate } from "react-router-dom";
import AddCandidate from "./AddCandidate";
import EditCandidate from "./EditCandidate";
import CandidateStatusToggle from "./CandidateStatusToggle";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toast } from "react-toastify";
import { FaSearch, FaFilter, FaPlus, FaEye, FaTrash, FaEdit, FaChevronLeft, FaChevronRight, FaUserFriends, FaBuilding } from "react-icons/fa";
import { SkeletonRow } from "../common/LoadingState";
import EmptyState from "../common/EmptyState";

const CandidateList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, loading, error, pagination } = useSelector((state) => state.candidates);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCandidate, setEditCandidate] = useState(null);
  const [updatingCandidateId, setUpdatingCandidateId] = useState(null);

  const handleAccountStatusChange = useCallback(async (candidateId, newIsActive) => {
    setUpdatingCandidateId(candidateId);
    try {
      await dispatch(updateCandidateAccountStatus({ id: candidateId, isActive: newIsActive })).unwrap();
      toast.success(`Candidate account ${newIsActive ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      toast.error(err || 'Failed to update candidate account status');
    } finally {
      setUpdatingCandidateId(null);
    }
  }, [dispatch]);

  useEffect(() => {
    // Fetch departments for filter dropdown
    const fetchDepts = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/department`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setDepartments(res.data.departments || []);
        }
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    fetchDepts();
  }, []);

  // Fetch candidates on state or page change
  useEffect(() => {
    dispatch(fetchCandidates({ page, search, status, department }));
  }, [dispatch, page, search, status, department]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete candidate ${name}?`)) {
      try {
        const resultAction = await dispatch(deleteCandidate(id));
        if (deleteCandidate.fulfilled.match(resultAction)) {
          toast.success("Candidate deleted successfully!");
        } else {
          toast.error(resultAction.payload || "Failed to delete candidate");
        }
      } catch (err) {
        toast.error("Error deleting candidate");
      }
    }
  };

  const getStatusColor = (statusVal) => {
    switch (statusVal) {
      case "Employee Created":
      case "Offer Accepted": return "bg-accent-100 text-accent-700";
      case "Offer Sent": return "bg-brand-50 text-brand-700";
      case "Selected":
      case "Pre-Onboarding": return "bg-brand-50 text-brand-700";
      case "Interview Scheduled": return "bg-amber-100 text-amber-700";
      case "Applied":
      case "Screening": return "bg-surface-muted text-ink-muted";
      default: return "bg-surface-muted text-ink-muted";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Recruitment & Candidates</h2>
          <p className="text-sm text-ink-muted mt-1">Manage applicants, track onboarding lifecycle, and extend offers.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 px-5 py-3 text-sm font-semibold text-white transition-colors shrink-0"
        >
          <FaPlus size={14} /> Create Candidate
        </button>
      </div>

      {/* Filters & Search row */}
      <div className="rounded-xl border border-surface-subtle bg-white p-5 shadow-card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search bar */}
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" size={14} />
            <input
              type="text"
              placeholder="Search by name, email, ID..."
              className="w-full rounded-lg border border-surface-subtle pl-10 pr-4 py-2.5 text-sm text-ink placeholder-ink-faint outline-none focus:border-brand-500"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <FaFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" size={14} />
            <select
              className="w-full rounded-lg border border-surface-subtle pl-10 pr-4 py-2.5 text-sm text-ink outline-none focus:border-brand-500 appearance-none bg-white"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Stages / Statuses</option>
              <option value="Applied">Applied</option>
              <option value="Screening">Screening</option>
              <option value="Interview Scheduled">Interview Scheduled</option>
              <option value="Interview Completed">Interview Completed</option>
              <option value="Selected">Selected</option>
              <option value="Pre-Onboarding">Pre-Onboarding</option>
              <option value="Offer Sent">Offer Sent</option>
              <option value="Offer Accepted">Offer Accepted</option>
              <option value="Employee Created">Employee Created</option>
            </select>
          </div>

          {/* Department filter */}
          <div className="relative">
            <FaBuilding className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" size={14} />
            <select
              className="w-full rounded-lg border border-surface-subtle pl-10 pr-4 py-2.5 text-sm text-ink outline-none focus:border-brand-500 appearance-none bg-white"
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.dep_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table grid */}
      <div className="rounded-xl border border-surface-subtle bg-white overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-surface-subtle bg-surface-muted text-ink-muted text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">ID</th>
                <th className="py-4 px-6">Candidate Name</th>
                <th className="py-4 px-6">Position</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Stage Status</th>
                <th className="py-4 px-6">Account Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle text-ink text-sm">
              {loading ? (
                <>
                  <SkeletonRow columns={7} />
                  <SkeletonRow columns={7} />
                  <SkeletonRow columns={7} />
                </>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4">
                    <EmptyState
                      icon={FaUserFriends}
                      title="No candidates found"
                      message="Try adjusting your search or filters, or create a new candidate."
                    />
                  </td>
                </tr>
              ) : (
                list.map((c) => (
                  <tr key={c._id} className="hover:bg-surface-muted transition-colors">
                    <td className="py-4 px-6 font-semibold text-ink">{c.candidateId}</td>
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-ink">{c.fullName}</div>
                        <div className="text-xs text-ink-muted mt-0.5">{c.email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium">{c.position}</td>
                    <td className="py-4 px-6">{c.department?.dep_name || "General"}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <CandidateStatusToggle
                        candidateId={c._id}
                        currentIsActive={c.isActive}
                        onStatusChange={handleAccountStatusChange}
                        isLoading={updatingCandidateId === c._id}
                      />
                    </td>
                    <td className="py-4 px-6 text-right space-x-2 shrink-0">
                      <button
                        onClick={() => navigate(`/hr-dashboard/candidates/${c._id}`)}
                        className="p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors inline-flex items-center justify-center"
                        title="View Profile Details"
                      >
                        <FaEye size={14} />
                      </button>
                      <button
                        onClick={() => setEditCandidate(c)}
                        className="p-2 rounded-lg bg-surface-muted text-ink hover:bg-surface-subtle transition-colors inline-flex items-center justify-center"
                        title="Edit Candidate Details"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(c._id, c.fullName)}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors inline-flex items-center justify-center"
                        title="Delete Candidate"
                      >
                        <FaTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-surface-subtle px-6 py-4 bg-surface-muted">
            <span className="text-xs text-ink-muted font-medium">
              Showing page {page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="rounded-lg border border-surface-subtle bg-white p-2 text-ink hover:bg-surface-muted disabled:opacity-40 transition-colors"
              >
                <FaChevronLeft size={12} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
                disabled={page === pagination.pages}
                className="rounded-lg border border-surface-subtle bg-white p-2 text-ink hover:bg-surface-muted disabled:opacity-40 transition-colors"
              >
                <FaChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddCandidate
          onClose={() => setShowAddModal(false)}
          onSuccess={() => dispatch(fetchCandidates({ page, search, status, department }))}
        />
      )}

      {/* Edit Modal */}
      {editCandidate && (
        <EditCandidate
          candidate={editCandidate}
          onClose={() => setEditCandidate(null)}
          onSuccess={() => dispatch(fetchCandidates({ page, search, status, department }))}
        />
      )}
    </div>
  );
};

export default CandidateList;
