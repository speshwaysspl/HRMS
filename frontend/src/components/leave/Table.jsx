import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import DataTable from "react-data-table-component";
import { columns, LeaveButtons } from "../../utils/LeaveHelper";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import { useCachedQuery } from "../../utils/queryCache";

const STATUSES = ["All", "Pending", "Approved", "Rejected"];

const Table = () => {
  useMeta({
    title: "Leaves — Speshway HRMS",
    description: "Manage leave requests and statuses.",
    keywords: "leaves, HRMS",
    image: "/images/Logo.jpg",
    url: `${window.location.origin}/admin-dashboard/leaves`,
    robots: "noindex,nofollow"
  });
  const location = useLocation();
  const initialStatus = useMemo(() => {
    const s = new URLSearchParams(location.search).get("status");
    return STATUSES.includes(s) ? s : "All";
  }, [location.search]);

  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => { setStatus(initialStatus); setPage(1); }, [initialStatus]);
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Server-side filtering + pages; revisits render instantly from cache.
  const { data, loading, error, refetch, mutate } = useCachedQuery(
    `leaves:${status}:${query}:${page}:${perPage}`,
    async () => {
      const res = await axios.get(`${API_BASE}/api/leave`, {
        params: { page, limit: perPage, status: status === "All" ? undefined : status, q: query || undefined },
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (!res.data.success) throw new Error(res.data.error || "Failed to load leaves");
      return { rows: res.data.leaves || [], total: res.data.total || 0, counts: res.data.statusCounts || {} };
    },
    { live: ["leave"], keepPrevious: true }
  );

  const handleDeleteSuccess = useCallback((deletedId) => {
    mutate((prev) => prev && { ...prev, rows: prev.rows.filter((l) => l._id !== deletedId), total: Math.max(0, prev.total - 1) });
  }, [mutate]);

  const leaves = useMemo(() => (data?.rows || []).map((leave, i) => {
    const start = leave.startDate ? new Date(leave.startDate) : null;
    const end = leave.endDate ? new Date(leave.endDate) : null;
    return {
      _id: leave._id,
      sno: (page - 1) * perPage + i + 1,
      employeeId: leave.employeeId?.employeeId || "",
      name: leave.employeeId?.userId?.name || "",
      leaveType: leave.leaveType || "",
      department: leave.employeeId?.department?.dep_name || "",
      days: start && end ? Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1 : 0,
      status: leave.status || "",
      action: <LeaveButtons Id={leave._id} onDelete={handleDeleteSuccess} />,
    };
  }), [data, page, perPage, handleDeleteSuccess]);

  const total = data?.total || 0;
  const counts = data?.counts || {};
  const pages = Math.max(1, Math.ceil(total / perPage));
  const countFor = (s) => (s === "All" ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[s] || 0);

  // Full-page loader only on first load; searching/filtering keeps the controls mounted.
  if (loading && !data) return <LoadingState message="Loading leaves..." variant="table" columns={7} rows={8} />;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h3 className="text-xl md:text-2xl font-semibold text-ink">Manage Leaves</h3>
      </div>
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-4">
        <label htmlFor="leave-search" className="sr-only">Search by employee ID or name</label>
        <input
          id="leave-search"
          type="search"
          value={search}
          placeholder="Search by employee ID or name"
          className="w-full lg:w-72 px-4 py-2 border border-surface-subtle rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 justify-center" role="group" aria-label="Filter by status">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`min-h-[44px] px-3 py-2 border rounded-lg transition-colors duration-150 text-sm ${
                status === s
                  ? "border-accent-600 bg-accent-50 text-accent-800 font-medium"
                  : "border-surface-subtle bg-white text-ink hover:bg-surface-muted"
              }`}
            >
              {s} <span className="tabular-nums text-ink-muted">({countFor(s)})</span>
            </button>
          ))}
        </div>
      </div>

      {error && !data ? (
        <div className="bg-white rounded-xl border border-surface-subtle">
          <ErrorState message="Couldn't load leave requests." onRetry={refetch} />
        </div>
      ) : leaves.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-subtle">
          <EmptyState title="No leave requests found" message="Try adjusting your filters or search." />
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block md:hidden mt-4">
            {leaves.map((leave) => (
              <div key={leave._id} className="bg-white rounded-xl shadow-card p-4 mb-4 border border-surface-subtle">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-50 text-brand-700 text-xs font-semibold px-2 py-1 rounded">
                      #{leave.sno}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      leave.status === "Approved"
                        ? "bg-accent-100 text-accent-700"
                        : leave.status === "Pending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                  <div className="text-right">{leave.action}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium text-ink-muted">Employee ID:</span> <span className="text-ink">{leave.employeeId}</span></div>
                  <div><span className="font-medium text-ink-muted">Name:</span> <span className="text-ink">{leave.name}</span></div>
                  <div><span className="font-medium text-ink-muted">Leave Type:</span> <span className="text-ink">{leave.leaveType}</span></div>
                  <div><span className="font-medium text-ink-muted">Days:</span> <span className="text-ink">{leave.days}</span></div>
                  <div className="col-span-2">
                    <span className="font-medium text-ink-muted">Department:</span> <span className="text-ink">{leave.department}</span>
                  </div>
                </div>
              </div>
            ))}
            {pages > 1 && (
              <nav className="flex items-center justify-between gap-3" aria-label="Leave pages">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="min-h-[44px] px-4 rounded-lg border border-surface-subtle bg-white text-ink font-medium disabled:opacity-50">Previous</button>
                <span className="text-sm text-ink-muted tabular-nums">Page {page} of {pages}</span>
                <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
                  className="min-h-[44px] px-4 rounded-lg border border-surface-subtle bg-white text-ink font-medium disabled:opacity-50">Next</button>
              </nav>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block mt-4 overflow-x-auto bg-white rounded-xl shadow-card border border-surface-subtle">
            <DataTable
              columns={columns}
              data={leaves}
              pagination
              paginationServer
              paginationTotalRows={total}
              paginationDefaultPage={page}
              paginationPerPage={perPage}
              paginationRowsPerPageOptions={[10, 25, 50, 100]}
              onChangePage={setPage}
              onChangeRowsPerPage={(n, p) => { setPerPage(n); setPage(p); }}
              responsive
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Table;
