import axios from "axios";
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";
import { formatISTDate } from "../../utils/dateTimeUtils";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";
import { useLiveTick } from "../../context/NotificationContext";

const Detail = () => {
  const liveTick = useLiveTick(["leave"]);
  const { id } = useParams();
  const [leave, setLeave] = useState(null);
  const navigate = useNavigate()
  const canonical = useMemo(() => `${window.location.origin}/admin-dashboard/leaves/${id}`, [id]);
  useMeta({
    title: 'Leave Details — Speshway HRMS',
    description: 'Review and update a leave request.',
    keywords: 'leave details, HRMS',
    image: '/images/Logo.jpg',
    url: canonical,
    robots: 'noindex,nofollow'
  });

  useEffect(() => {
    const fetchLeave = async () => {
      try {
        const responnse = await axios.get(
          `${API_BASE}/api/leave/detail/${id}`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
        if (responnse.data.success) {
          setLeave(responnse.data.leave);
        }
      } catch (error) {

        if (error.response && !error.response.data.success) {
          alert(error.response.data.error);
        }
      }
    };

    fetchLeave();
  }, [liveTick]);

  const [rejecting, setRejecting] = useState(false);
  const [remark, setRemark] = useState("");
  const [remarkError, setRemarkError] = useState("");

  const changeStatus = async (id, status) => {
    if (status === "Rejected" && !remark.trim()) {
      setRemarkError("Please give a reason for rejecting.");
      return;
    }
    try {
        const responnse = await axios.put(
          `${API_BASE}/api/leave/${id}`, {status, remark: remark.trim()},
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
        if (responnse.data.success) {
            navigate('/admin-dashboard/leaves')
        }
      } catch (error) {
        if (error.response && !error.response.data.success) {
          alert(error.response.data.error);
        }
      }
  }

  const employee = leave?.employeeId || {};
  const user = employee?.userId || {};
  const department = employee?.department || {};

  const formattedStartDate =
    leave?.startDate ? formatISTDate(new Date(leave.startDate)) : "N/A";
  const formattedEndDate =
    leave?.endDate ? formatISTDate(new Date(leave.endDate)) : "N/A";

  return (
    <>
      {leave ? (
        <div className="max-w-3xl mx-auto mt-6 md:mt-10 bg-white p-4 sm:p-8 rounded-xl shadow-card border border-surface-subtle">
          <h2 className="text-xl sm:text-2xl font-semibold text-ink mb-6 md:mb-8 text-center">
            Leave Details
          </h2>
          <div className="grid grid-cols-1 gap-1 divide-y divide-surface-subtle">
            <div className="flex flex-wrap justify-between items-center py-3 gap-1">
              <p className="text-sm font-medium text-ink-muted">Name</p>
              <p className="font-medium text-ink break-words text-right">{user.name || "N/A"}</p>
            </div>
            <div className="flex flex-wrap justify-between items-center py-3 gap-1">
              <p className="text-sm font-medium text-ink-muted">Employee ID</p>
              <p className="font-medium text-ink break-words text-right">{employee.employeeId || "N/A"}</p>
            </div>

            <div className="flex flex-wrap justify-between items-center py-3 gap-1">
              <p className="text-sm font-medium text-ink-muted">Leave Type</p>
              <p className="font-medium text-ink break-words text-right">
                {leave.leaveType}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start py-3 gap-1">
              <p className="text-sm font-medium text-ink-muted">Reason</p>
              <p className="font-medium text-ink sm:text-right max-w-full sm:max-w-md break-words">{leave.reason}</p>
            </div>

            {leave.proof && (
              <div className="flex flex-wrap justify-between items-center py-3 gap-1">
                <p className="text-sm font-medium text-ink-muted">Proof</p>
                <a
                  href={leave.proof.startsWith("http") ? leave.proof : `${API_BASE}/${leave.proof}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent-700 underline underline-offset-2 break-all hover:text-accent-800"
                >
                  {leave.proofName || "View proof"}
                </a>
              </div>
            )}

            <div className="flex flex-wrap justify-between items-center py-3 gap-1">
              <p className="text-sm font-medium text-ink-muted">Department</p>
              <p className="font-medium text-ink break-words text-right">{department.dep_name || "N/A"}</p>
            </div>
            <div className="flex flex-wrap justify-between items-center py-3 gap-1">
              <p className="text-sm font-medium text-ink-muted">Start Date</p>
              <p className="font-medium text-ink break-words text-right">{formattedStartDate}</p>
            </div>
            <div className="flex flex-wrap justify-between items-center py-3 gap-1">
              <p className="text-sm font-medium text-ink-muted">End Date</p>
              <p className="font-medium text-ink break-words text-right">{formattedEndDate}</p>
            </div>
            <div className="flex flex-wrap justify-between items-center py-3 gap-1">
              <p className="text-sm font-medium text-ink-muted">
                  {leave.status === "Pending" ? "Action" : "Status"}
                  </p>
                  {leave.status === "Pending" ? (
                      <div className="flex flex-wrap gap-2">
                          <button className="px-3 py-1 rounded-lg text-sm font-medium bg-accent-600 hover:bg-accent-700 text-white transition-colors duration-150"
                          onClick={() => changeStatus(leave._id, "Approved")}>Approve</button>
                          <button className="px-3 py-1 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors duration-150"
                          onClick={() => setRejecting(true)}>Reject</button>
                      </div>
                  ) : (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      leave.status === "Approved"
                        ? "bg-accent-100 text-accent-700"
                        : "bg-red-100 text-red-700"
                    }`}>{leave.status}</span>
                  )
              }
            </div>

            {leave.status === "Pending" && rejecting && (
              <div className="py-3">
                <label htmlFor="reject-remark" className="block text-sm font-medium text-ink mb-1">Reason for rejecting</label>
                <textarea
                  id="reject-remark"
                  rows={3}
                  maxLength={500}
                  autoFocus
                  value={remark}
                  onChange={(e) => { setRemark(e.target.value); setRemarkError(""); }}
                  aria-invalid={!!remarkError}
                  placeholder="Tell the employee why"
                  className="w-full rounded-lg border border-surface-subtle px-3 py-2 text-sm text-ink bg-white focus:ring-2 focus:ring-accent-500 outline-none"
                />
                {remarkError && <p role="alert" className="mt-1 text-sm text-red-700">{remarkError}</p>}
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => { setRejecting(false); setRemarkError(""); }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink hover:bg-surface-muted">Cancel</button>
                  <button type="button" onClick={() => changeStatus(leave._id, "Rejected")}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white">Confirm reject</button>
                </div>
              </div>
            )}

            {leave.status !== "Pending" && leave.reviewRemark && (
              <div className="flex flex-col sm:flex-row justify-between items-start py-3 gap-1">
                <p className="text-sm font-medium text-ink-muted">{leave.status === "Rejected" ? "Rejection reason" : "Remark"}</p>
                <p className="font-medium text-ink sm:text-right max-w-full sm:max-w-md break-words">{leave.reviewRemark}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <LoadingState message="Loading leave details..." />
      )}
    </>
  );
};

export default Detail;
