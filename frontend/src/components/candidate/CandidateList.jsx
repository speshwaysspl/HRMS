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
      case "Employee Created": return "bg-green-500/15 text-green-500 border-green-500/20";
      case "Offer Accepted": return "bg-emerald-500/15 text-emerald-500 border-emerald-500/20";
      case "Offer Sent": return "bg-blue-500/15 text-blue-500 border-blue-500/20";
      case "Selected":
      case "Pre-Onboarding": return "bg-indigo-500/15 text-indigo-500 border-indigo-500/20";
      case "Interview Scheduled": return "bg-yellow-500/15 text-yellow-500 border-yellow-500/20";
      case "Applied":
      case "Screening": return "bg-slate-500/15 text-slate-400 border-slate-500/20";
      default: return "bg-slate-500/10 text-slate-300 border-white/5";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Recruitment & Candidates</h2>
          <p className="text-sm text-slate-500 mt-1">Manage applicants, track onboarding lifecycle, and extend offers.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition shrink-0"
        >
          <FaPlus size={14} /> Create Candidate
        </button>
      </div>

      {/* Filters & Search row */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search bar */}
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by name, email, ID..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <FaFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 appearance-none bg-white"
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
            <FaBuilding className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 appearance-none bg-white"
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
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">ID</th>
                <th className="py-4 px-6">Candidate Name</th>
                <th className="py-4 px-6">Position</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Stage Status</th>
                <th className="py-4 px-6">Account Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                    <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading candidates...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    No candidates found.
                  </td>
                </tr>
              ) : (
                list.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">{c.candidateId}</td>
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-slate-900">{c.fullName}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{c.email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium">{c.position}</td>
                    <td className="py-4 px-6">{c.department?.dep_name || "General"}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${getStatusColor(c.status)}`}>
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
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition inline-flex items-center justify-center"
                        title="View Profile Details"
                      >
                        <FaEye size={14} />
                      </button>
                      <button
                        onClick={() => setEditCandidate(c)}
                        className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition inline-flex items-center justify-center"
                        title="Edit Candidate Details"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(c._id, c.fullName)}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition inline-flex items-center justify-center"
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
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50">
            <span className="text-xs text-slate-500 font-medium">
              Showing page {page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <FaChevronLeft size={12} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
                disabled={page === pagination.pages}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
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
