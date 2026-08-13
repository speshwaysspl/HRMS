import axios from "axios";
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";
import { formatISTDate } from "../../utils/dateTimeUtils";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";

const Detail = () => {
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
  }, []);

  const changeStatus = async (id, status) => {
    try {
        const responnse = await axios.put(
          `${API_BASE}/api/leave/${id}`, {status},
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
                          onClick={() => changeStatus(leave._id, "Rejected")}>Reject</button>
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
          </div>
        </div>
      ) : (
        <LoadingState message="Loading leave details..." />
      )}
    </>
  );
};

export default Detail;
