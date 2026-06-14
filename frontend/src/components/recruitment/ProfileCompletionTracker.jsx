import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCandidates } from "../../redux/slices/candidateSlice";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaFilter, FaEye, FaChevronLeft, FaChevronRight, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

const ProfileCompletionTracker = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: candidates, loading, pagination } = useSelector((state) => state.candidates);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchCandidates({ page, search, status, limit: 10 }));
  }, [dispatch, page, search, status]);

  const getProgressColor = (percent) => {
    if (percent === 100) return "bg-green-500";
    if (percent >= 50) return "bg-blue-500";
    if (percent >= 25) return "bg-yellow-500";
    return "bg-rose-500";
  };

  const getProgressBg = (percent) => {
    if (percent === 100) return "bg-green-500/10 text-green-600";
    if (percent >= 50) return "bg-blue-500/10 text-blue-600";
    if (percent >= 25) return "bg-yellow-500/10 text-yellow-600";
    return "bg-rose-500/10 text-rose-600";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Pre-Onboarding Profile Tracker</h2>
        <p className="text-sm text-slate-500 mt-1">
          Monitor candidate form completions, bank detail submittals, and emergency contact setups.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by candidate name or ID..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

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
              <option value="">All Pre-Onboarding Candidates</option>
              <option value="Pre-Onboarding">Pre-Onboarding</option>
              <option value="Offer Sent">Offer Sent</option>
              <option value="Offer Accepted">Offer Accepted</option>
              <option value="Selected">Selected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Candidate</th>
                <th className="py-4 px-6">Onboarding Status</th>
                <th className="py-4 px-6">Profile Progress</th>
                <th className="py-4 px-6">Completion</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">
                    <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading tracker...
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    No candidates found.
                  </td>
                </tr>
              ) : (
                candidates.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-slate-900">{c.fullName}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{c.candidateId} • {c.position}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 min-w-[200px]">
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(
                              c.profileCompletionPercentage
                            )}`}
                            style={{ width: `${c.profileCompletionPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                          {c.profileCompletionPercentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {c.profileCompletionPercentage === 100 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-xl">
                          <CheckCircleIcon /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl">
                          <WarningIcon /> Incomplete
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => navigate(`/hr-dashboard/candidates/${c._id}`)}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition inline-flex items-center justify-center"
                        title="View & Verify Profile"
                      >
                        <FaEye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
    </div>
  );
};

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </svg>
);

export default ProfileCompletionTracker;
