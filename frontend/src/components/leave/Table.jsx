import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import DataTable from "react-data-table-component";
import { columns, LeaveButtons } from "../../utils/LeaveHelper";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";
import EmptyState from "../common/EmptyState";


//
const Table = () => {
  useMeta({
    title: "Leaves — Speshway HRMS",
    description: "Manage leave requests and statuses.",
    keywords: "leaves, HRMS",
    image: "/images/Logo.jpg",
    url: `${window.location.origin}/admin-dashboard/leaves`,
    robots: "noindex,nofollow"
  });
  const [leaves, setLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const handleDeleteSuccess = (deletedId) => {
    setLeaves((prev) => {
      const updated = prev.filter((leave) => leave._id !== deletedId);
      setFilteredLeaves((current) =>
        current.filter((leave) => leave._id !== deletedId)
      );
      return updated;
    });
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const responnse = await axios.get(`${API_BASE}/api/leave`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      });
      if (responnse.data.success) {
        let sno = 1;
        const data = (responnse.data.leaves || []).map((leave) => {
          const start = leave.startDate ? new Date(leave.startDate) : null;
          const end = leave.endDate ? new Date(leave.endDate) : null;
          const days =
            start && end
              ? Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
              : 0;

          return {
            _id: leave._id,
            sno: sno++,
            employeeId: leave.employeeId?.employeeId || "",
            name: leave.employeeId?.userId?.name || "",
            leaveType: leave.leaveType || "",
            department: leave.employeeId?.department?.dep_name || "",
            days,
            status: leave.status || "",
            action: <LeaveButtons Id={leave._id} onDelete={handleDeleteSuccess} />,
          };
        });
        setLeaves(data);
        setFilteredLeaves(data);
      }
    } catch (error) {
      if (error.response && !error.response.data.success) {
        alert(error.response.data.error);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchLeaves();
  }, []);

  // Apply initial filter if a status is provided via query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status && leaves) {
      if (status === 'All') {
        setFilteredLeaves(leaves);
      } else {
        const data = leaves.filter((leave) => leave.status.toLowerCase().includes(status.toLowerCase()));
        setFilteredLeaves(data);
      }
    }
  }, [location.search, leaves]);

  const filterByInput = (e) => {
    const data = leaves.filter((leave) =>
      leave.employeeId
        .toLowerCase()
        .includes(e.target.value.toLowerCase())
    );
    setFilteredLeaves(data)
  };
  const filterByButton = (status) => {
    const data = leaves.filter((leave) =>
      leave.status
        .toLowerCase()
        .includes(status.toLowerCase())
    );
    setFilteredLeaves(data)
  };

  return (
    <>
      {loading ? (
        <LoadingState message="Loading leaves..." />
      ) : (
        <div className="p-4 md:p-6">
          <div className="mb-4 md:mb-6">
            <h3 className="text-xl md:text-2xl font-semibold text-ink">Manage Leaves</h3>
          </div>
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-4">
            <input
              type="text"
              placeholder="Search By Employee ID"
              className="w-full lg:w-auto px-4 py-2 border border-surface-subtle rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              onChange={filterByInput}
            />
            <div className="flex flex-wrap gap-2 justify-center">
              <button className="px-3 py-2 border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg transition-colors duration-150 text-sm"
              onClick={() => filterByButton("Pending")}>
                Pending
              </button>
              <button className="px-3 py-2 border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg transition-colors duration-150 text-sm"
              onClick={() => filterByButton("Approved")}>
                Approved
              </button>
              <button className="px-3 py-2 border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg transition-colors duration-150 text-sm"
              onClick={() => filterByButton("Rejected")}>
                Rejected
              </button>
            </div>
          </div>

          {filteredLeaves.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-subtle">
              <EmptyState title="No leave requests found" message="Try adjusting your filters or search." />
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden mt-4">
                {filteredLeaves.map((leave) => (
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
                      <div className="text-right">
                        {leave.action}
                      </div>
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
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block mt-4 overflow-x-auto bg-white rounded-xl shadow-card border border-surface-subtle">
                <DataTable columns={columns} data={filteredLeaves} pagination responsive />
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default Table;
