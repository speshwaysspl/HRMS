import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCandidates } from "../../redux/slices/candidateSlice";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaFilter, FaEye, FaChevronLeft, FaChevronRight, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { SkeletonRow } from "../common/LoadingState";
import EmptyState from "../common/EmptyState";

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
    if (percent === 100) return "bg-accent-500";
    if (percent >= 50) return "bg-brand-500";
    if (percent >= 25) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Pre-Onboarding Profile Tracker</h2>
        <p className="text-sm text-ink-muted mt-1">
          Monitor candidate form completions, bank detail submittals, and emergency contact setups.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-surface-subtle bg-white p-5 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" size={14} />
            <input
              type="text"
              placeholder="Search by candidate name or ID..."
              className="w-full rounded-lg border border-surface-subtle pl-10 pr-4 py-2.5 text-sm text-ink placeholder-ink-faint outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="relative">
            <FaFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" size={14} />
            <select
              className="w-full rounded-lg border border-surface-subtle pl-10 pr-4 py-2.5 text-sm text-ink outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 appearance-none bg-white"
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
      <div className="rounded-xl border border-surface-subtle bg-white overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-surface-subtle bg-surface-muted text-ink-muted text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6">Candidate</th>
                <th className="py-3.5 px-6">Onboarding Status</th>
                <th className="py-3.5 px-6">Profile Progress</th>
                <th className="py-3.5 px-6">Completion</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle text-ink text-sm">
              {loading ? (
                <>
                  <SkeletonRow columns={5} />
                  <SkeletonRow columns={5} />
                  <SkeletonRow columns={5} />
                </>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10">
                    <EmptyState title="No candidates found" message="Try adjusting your search or filter criteria." />
                  </td>
                </tr>
              ) : (
                candidates.map((c) => (
                  <tr key={c._id} className="hover:bg-surface-muted transition-colors">
                    <td className="py-4 px-6 max-w-[200px]">
                      <div>
                        <div className="font-semibold text-ink truncate">{c.fullName}</div>
                        <div className="text-xs text-ink-faint mt-0.5 truncate">{c.candidateId} • {c.position}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-ink-muted">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 min-w-[200px]">
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-surface-subtle rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(
                              c.profileCompletionPercentage
                            )}`}
                            style={{ width: `${c.profileCompletionPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-ink-muted whitespace-nowrap">
                          {c.profileCompletionPercentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {c.profileCompletionPercentage === 100 ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-accent-100 text-accent-700">
                          <CheckCircleIcon /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                          <WarningIcon /> Incomplete
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => navigate(`/hr-dashboard/candidates/${c._id}`)}
                        className="p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors inline-flex items-center justify-center"
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-subtle px-6 py-4 bg-surface-muted">
            <span className="text-xs text-ink-muted font-medium">
              Showing page {page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="rounded-lg border border-surface-subtle bg-white p-2 text-ink-muted hover:bg-surface-muted disabled:opacity-40 transition-colors"
              >
                <FaChevronLeft size={12} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
                disabled={page === pagination.pages}
                className="rounded-lg border border-surface-subtle bg-white p-2 text-ink-muted hover:bg-surface-muted disabled:opacity-40 transition-colors"
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
