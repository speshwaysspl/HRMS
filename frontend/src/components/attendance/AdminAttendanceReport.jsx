import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString, formatISTDate } from "../../utils/dateTimeUtils";
import { formatDMY } from "../../utils/dateUtils";
import useMeta from "../../utils/useMeta";
import { FiCalendar } from "react-icons/fi";
import PageHeader from "../common/PageHeader";

const AdminAttendanceReport = () => {
  useMeta({
    title: "Admin Attendance Report — Speshway HRMS",
    description: "Search and review attendance across employees.",
    keywords: "admin attendance, HRMS",
    image: "/images/Logo.jpg",
    url: `${window.location.origin}/admin-dashboard/attendance-report`,
    robots: "noindex,nofollow"
  });
  const [selectedDate, setSelectedDate] = useState(toISTDateString(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(toISTDateString(new Date()).substring(0, 7));
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]); // ✅ New filtered dataset
  const [statusFilter, setStatusFilter] = useState("All"); // ✅ Status filter
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
 
  // 🔹 Common fetch function
  const fetchData = async (url, errorMessage) => {
    setLoading(true);
    setErrorMsg("");
    setAttendanceData([]);
    setFilteredData([]);
 
    try {
      const token = sessionStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");
 
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
 
      if (Array.isArray(data) && data.length > 0) {
        setAttendanceData(data);
        applyStatusFilter(data, statusFilter); // ✅ Apply filter immediately
      } else {
        setErrorMsg(errorMessage);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || errorMessage);
    } finally {
      setLoading(false);
    }
  };
 
  // 🔹 Apply status filter
  const applyStatusFilter = (data, status) => {
    // No need to modify status as it's now calculated correctly in the backend
    if (status === "All") {
      setFilteredData(data);
    } else {
      setFilteredData(data.filter((item) => item.status === status));
    }
  };
 
  // 🔹 When dropdown changes
  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setStatusFilter(newStatus);
    applyStatusFilter(attendanceData, newStatus);
  };
 
  // 🔹 Auto-fetch employee details
  const fetchEmployeeDetails = async (searchBy, value) => {
    if (!value.trim() || isAutoFetching) return;
   
    setIsAutoFetching(true);
    try {
      const token = sessionStorage.getItem("token");
      const queryParam = searchBy === 'id' ? `employeeId=${value}` : `employeeName=${encodeURIComponent(value)}`;
      const response = await axios.get(`${API_BASE}/api/employee/search?${queryParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
     
      if (response.data.success) {
        const { employeeId: fetchedId, name: fetchedName } = response.data.employee;
        if (searchBy === 'id') {
          setEmployeeName(fetchedName);
        } else {
          setEmployeeId(fetchedId);
        }
      }
    } catch (error) {
      // Silently handle errors for better UX
      
    } finally {
      setIsAutoFetching(false);
    }
  };
 
  // 🔹 Handle Employee ID change with auto-fetch
  const handleEmployeeIdChange = (e) => {
    const value = e.target.value;
    setEmployeeId(value);
    if (value !== employeeName) {
      setEmployeeName(""); // Clear name when typing ID
    }
   
    // Auto-fetch name after user stops typing (debounce)
    if (value.trim()) {
      setTimeout(() => {
        if (value === employeeId) { // Only fetch if value hasn't changed
          fetchEmployeeDetails('id', value);
        }
      }, 500);
    }
  };
 
  // 🔹 Handle Employee Name change with auto-fetch
  const handleEmployeeNameChange = (e) => {
    const value = e.target.value;
    setEmployeeName(value);
    if (value !== employeeId) {
      setEmployeeId(""); // Clear ID when typing name
    }
   
    // Auto-fetch ID after user stops typing (debounce)
    if (value.trim()) {
      setTimeout(() => {
        if (value === employeeName) { // Only fetch if value hasn't changed
          fetchEmployeeDetails('name', value);
        }
      }, 500);
    }
  };
 
  // 🔹 Day-wise Attendance
  const fetchAttendance = () => {
    if (!selectedDate) return alert("Please select a date");
    const url = `${API_BASE}/api/attendance/admin/all?date=${selectedDate}`;
    fetchData(url, "No records found.");
  };
 
  // 🔹 Monthly Attendance
  const fetchMonthlyAttendance = () => {
    if (!selectedMonth || (!employeeId && !employeeName))
      return alert("Please select month and either Employee ID or Employee Name");
   
    let url = `${API_BASE}/api/attendance/admin/monthly?month=${selectedMonth}`;
    if (employeeId) {
      url += `&employeeId=${employeeId}`;
    } else if (employeeName) {
      url += `&employeeName=${encodeURIComponent(employeeName)}`;
    }
    fetchData(url, "No monthly records found.");
  };
 
  // 🔹 Common Excel download
  const downloadExcel = async (url, filename, errorMessage) => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
 
      const fileUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = fileUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert(errorMessage);
    }
  };
 
  // 🔹 Day-wise Excel
  const downloadDayExcel = () => {
    if (!selectedDate) return alert("Please select a date first");
    let url = `${API_BASE}/api/attendance/admin/export?date=${selectedDate}`;
    if (statusFilter && statusFilter !== "All") {
      url += `&status=${encodeURIComponent(statusFilter)}`;
    }
    downloadExcel(url, `attendance_${selectedDate}.xlsx`, "Error downloading Excel");
  };
 
  // 🔹 Monthly Excel
  const downloadMonthlyExcel = () => {
    if (!selectedMonth || (!employeeId && !employeeName))
      return alert("Please select month and either Employee ID or Employee Name first");
   
    let url = `${API_BASE}/api/attendance/admin/export/monthly?month=${selectedMonth}`;
    if (employeeId) {
      url += `&employeeId=${employeeId}`;
    } else if (employeeName) {
      url += `&employeeName=${encodeURIComponent(employeeName)}`;
    }
    if (statusFilter && statusFilter !== "All") {
      url += `&status=${encodeURIComponent(statusFilter)}`;
    }
    downloadExcel(
      url,
      `attendance_${employeeId}_${selectedMonth}.xlsx`,
      "Error downloading Monthly Excel"
    );
  };
 
  return (
    <div>
      <PageHeader icon={FiCalendar} title="Admin Attendance Report" subtitle="Day-wise, monthly, and status-filtered attendance records" />

      <div className="bg-white shadow-card rounded-xl p-4 md:p-6 space-y-6 md:space-y-8 border border-surface-subtle">
        {/* Day-wise Filter */}
        <div className="bg-surface-muted p-4 rounded-lg border border-surface-subtle">
          <h3 className="text-lg font-semibold text-brand-700 mb-3">Day-wise Report</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 p-2 border border-surface-subtle rounded-lg text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={fetchAttendance}
                className="flex-1 sm:flex-none px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? "Loading..." : "Fetch Day-wise"}
              </button>
              <button
                onClick={downloadDayExcel}
                className="flex-1 sm:flex-none px-4 py-2 border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg text-sm font-medium transition-colors"
              >
                Excel
              </button>
            </div>
          </div>
        </div>

        {/* Monthly Filter */}
        <div className="bg-surface-muted p-4 rounded-lg border border-surface-subtle">
          <h3 className="text-lg font-semibold text-brand-700 mb-3">Monthly Report</h3>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 p-2 border border-surface-subtle rounded-lg text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
              />
              <input
                type="text"
                placeholder="Employee ID"
                value={employeeId}
                onChange={handleEmployeeIdChange}
                className="flex-1 p-2 border border-surface-subtle rounded-lg text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
              />
              <input
                type="text"
                placeholder="Employee Name"
                value={employeeName}
                onChange={handleEmployeeNameChange}
                className="flex-1 p-2 border border-surface-subtle rounded-lg text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchMonthlyAttendance}
                className="flex-1 sm:flex-none px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? "Loading..." : "Fetch Monthly"}
              </button>
              <button
                onClick={downloadMonthlyExcel}
                className="flex-1 sm:flex-none px-4 py-2 border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg text-sm font-medium transition-colors"
              >
                Monthly Excel
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="bg-surface-muted p-4 rounded-lg border border-surface-subtle">
          <h3 className="text-lg font-semibold text-brand-700 mb-3">Filter by Status</h3>
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="w-full sm:w-auto p-2 border border-surface-subtle rounded-lg text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
          >
            <option value="All">All Status</option>
            <option value="Present">Present</option>
            <option value="Present + Overtime">Present + Overtime</option>
            <option value="Half-Day">Half-Day</option>
            <option value="Absent">Absent</option>
            <option value="Not Yet">Not Yet</option>
            <option value="Leave">Leave</option>
            <option value="Incomplete">Incomplete</option>
            <option value="Work from Home - Present">Work from Home - Present</option>
            <option value="Work from Home + Overtime">Work from Home + Overtime</option>
            <option value="Work from Home - Half Day">Work from Home - Half Day</option>
            <option value="Work from Home - Incomplete">Work from Home - Incomplete</option>
            <option value="Work from Home - Not Marked">Work from Home - Not Marked</option>
          </select>
        </div>
 
        {/* Error Message */}
        {errorMsg && (
          <p className="text-center text-red-600 font-semibold">{errorMsg}</p>
        )}

        {/* Attendance Table */}
        {filteredData.length > 0 && (
          <div className="bg-white p-4 rounded-lg border border-surface-subtle">
            <h3 className="text-lg font-semibold text-ink mb-3">Attendance Records ({filteredData.length})</h3>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {filteredData.map((att, i) => (
                <div key={i} className="bg-white p-4 rounded-lg shadow-card border border-surface-subtle">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-ink">{att.name}</p>
                      <p className="text-sm text-ink-muted">ID: {att.employeeId}</p>
                    </div>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      att.status === "Present"
                        ? "bg-accent-100 text-accent-700"
                        : att.status === "Present + Overtime"
                        ? "bg-accent-100 text-accent-700"
                        : att.status === "Half-Day"
                        ? "bg-amber-100 text-amber-700"
                        : att.status === "Incomplete"
                        ? "bg-amber-100 text-amber-700"
                        : att.status === "Leave"
                        ? "bg-amber-100 text-amber-700"
                        : att.status === "Not Yet"
                        ? "bg-surface-muted text-ink-muted"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {att.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-ink">
                    <div><span className="font-medium">Date (IST):</span> {formatDMY(att.date)}</div>
                    <div><span className="font-medium">Designation:</span> {att.designation}</div>
                    <div><span className="font-medium">In (IST):</span> {att.inTime || 'N/A'}</div>
                    <div><span className="font-medium">Out (IST):</span> {att.outTime || 'N/A'}</div>
                    <div><span className="font-medium">Mode:</span> {att.workMode}</div>
                    <div className="col-span-2">
                      <span className="font-medium">Location:</span> {att.inLocation || 'N/A'}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Breaks (IST):</span>
                      {att.breaks?.length > 0 ? (
                        <div className="mt-1 space-y-1">
                          {att.breaks.map((b, idx) => (
                            <div key={idx} className="text-xs bg-surface-muted p-1 rounded">
                              Break {idx + 1}: {b.start} - {b.end || 'Ongoing'}
                            </div>
                          ))}
                        </div>
                      ) : (
                        'No breaks'
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-surface-subtle">
              <table className="min-w-full border-collapse bg-white rounded-lg">
                <thead className="sticky top-0 bg-surface-muted text-ink">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-medium">Employee ID</th>
                    <th className="px-3 py-2 text-left text-sm font-medium">Name</th>
                    <th className="px-3 py-2 text-left text-sm font-medium">Designation</th>
                    <th className="px-3 py-2 text-left text-sm font-medium">Date (IST)</th>
                    <th className="px-3 py-2 text-left text-sm font-medium">In Time (IST)</th>
                    <th className="px-3 py-2 text-left text-sm font-medium">Out Time (IST)</th>
                    <th className="px-3 py-2 text-left text-sm font-medium">Work Mode</th>
                    <th className="px-3 py-2 text-left text-sm font-medium">In Location</th>
                    <th className="px-3 py-2 text-left text-sm font-medium">Out Location</th>
                    <th className="px-3 py-2 text-left text-sm font-medium">Breaks (IST)</th>
                    <th className="px-3 py-2 text-left text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-subtle">
                  {filteredData.map((att, i) => (
                    <tr
                      key={i}
                      className="hover:bg-surface-muted bg-white"
                    >
                      <td className="px-3 py-2 text-sm text-ink">{att.employeeId}</td>
                      <td className="px-3 py-2 text-sm font-medium text-ink">{att.name}</td>
                      <td className="px-3 py-2 text-sm text-ink">{att.designation}</td>
                      <td className="px-3 py-2 text-sm text-ink">{formatDMY(att.date)}</td>
                      <td className="px-3 py-2 text-sm text-ink">{att.inTime || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-ink">{att.outTime || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-ink">{att.workMode}</td>
                      <td className="px-3 py-2 text-sm text-ink">{att.inLocation || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-ink">{att.outLocation || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-ink">
                        {att.breaks?.length > 0 ? (
                          <div className="space-y-1">
                            {att.breaks.map((b, idx) => (
                              <div key={idx} className="text-xs">
                                Break {idx + 1}: {b.start} - {b.end || 'Ongoing'}
                              </div>
                            ))}
                          </div>
                        ) : (
                          'No breaks'
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${att.status === "Present"
                          ? "bg-accent-100 text-accent-700"
                          : att.status === "Present + Overtime"
                          ? "bg-accent-100 text-accent-700"
                          : att.status === "Half-Day"
                          ? "bg-amber-100 text-amber-700"
                          : att.status === "Incomplete"
                          ? "bg-amber-100 text-amber-700"
                          : att.status === "Leave"
                          ? "bg-amber-100 text-amber-700"
                          : att.status === "Not Yet"
                          ? "bg-surface-muted text-ink-muted"
                          : "bg-red-100 text-red-700"
                        }`}>
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && filteredData.length === 0 && !errorMsg && (
          <p className="text-center text-ink-faint italic">No records found.</p>
        )}
      </div>
    </div>
  );
};
 
export default AdminAttendanceReport;
