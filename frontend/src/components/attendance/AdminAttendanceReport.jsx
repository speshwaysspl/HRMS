import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString, formatISTDate } from "../../utils/dateTimeUtils";
 
const AdminAttendanceReport = () => {
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
      const token = localStorage.getItem("token");
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
      console.error("Fetch error:", err);
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
      const token = localStorage.getItem("token");
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
      console.log('Employee not found or error fetching details');
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
      const token = localStorage.getItem("token");
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
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <h2 className="text-2xl md:text-4xl font-bold text-blue-700 mb-6 md:mb-8 text-center drop-shadow">
        📊 Admin Attendance Report
      </h2>

      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-2xl p-4 md:p-6 space-y-6 md:space-y-8">
        {/* 🔹 Day-wise Filter */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-700 mb-3">Day-wise Report</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={fetchAttendance}
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition text-sm"
              >
                {loading ? "Loading..." : "Fetch Day-wise"}
              </button>
              <button
                onClick={downloadDayExcel}
                className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition text-sm"
              >
                ⬇ Excel
              </button>
            </div>
          </div>
        </div>

        {/* 🔹 Monthly Filter */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-700 mb-3">Monthly Report</h3>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-400 text-sm"
              />
              <input
                type="text"
                placeholder="Employee ID"
                value={employeeId}
                onChange={handleEmployeeIdChange}
                className="flex-1 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-400 text-sm"
              />
              <input
                type="text"
                placeholder="Employee Name"
                value={employeeName}
                onChange={handleEmployeeNameChange}
                className="flex-1 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-400 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchMonthlyAttendance}
                className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md transition text-sm"
              >
                {loading ? "Loading..." : "Fetch Monthly"}
              </button>
              <button
                onClick={downloadMonthlyExcel}
                className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition text-sm"
              >
                ⬇ Monthly Excel
              </button>
            </div>
          </div>
        </div>

        {/* 🔹 Status Filter */}
        <div className="bg-indigo-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-indigo-700 mb-3">Filter by Status</h3>
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="w-full sm:w-auto p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 text-sm"
          >
            <option value="All">All Status</option>
            <option value="Present">Present</option>
            <option value="Present + Overtime">Present + Overtime</option>
            <option value="Half-Day">Half-Day</option>
            <option value="Absent">Absent</option>
            <option value="Leave">Leave</option>
            <option value="Incomplete">Incomplete</option>
          </select>
        </div>
 
        {/* Error Message */}
        {errorMsg && (
          <p className="text-center text-red-600 font-semibold">{errorMsg}</p>
        )}
 
        {/* Attendance Table */}
        {filteredData.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Attendance Records ({filteredData.length})</h3>
            
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {filteredData.map((att, i) => (
                <div key={i} className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{att.name}</p>
                      <p className="text-sm text-gray-600">ID: {att.employeeId}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      att.status === "Present"
                        ? "bg-green-100 text-green-600"
                        : att.status === "Present + Overtime"
                        ? "bg-green-200 text-green-800"
                        : att.status === "Half-Day"
                        ? "bg-orange-100 text-orange-600"
                        : att.status === "Incomplete"
                        ? "bg-yellow-100 text-yellow-600"
                        : att.status === "Leave"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {att.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">Date (IST):</span> {att.date}</div>
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
                            <div key={idx} className="text-xs bg-yellow-50 p-1 rounded">
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
            <div className="hidden md:block overflow-x-auto rounded-lg shadow-md">
              <table className="min-w-full border-collapse bg-white rounded-lg">
                <thead className="sticky top-0 bg-blue-600 text-white">
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
                <tbody>
                  {filteredData.map((att, i) => (
                    <tr
                      key={i}
                      className={`border-t hover:bg-gray-50 ${
                        i % 2 === 0 ? "bg-gray-50" : "bg-white"
                      }`}
                    >
                      <td className="px-3 py-2 text-sm">{att.employeeId}</td>
                      <td className="px-3 py-2 text-sm font-medium">{att.name}</td>
                      <td className="px-3 py-2 text-sm">{att.designation}</td>
                      <td className="px-3 py-2 text-sm">{att.date}</td>
                      <td className="px-3 py-2 text-sm">{att.inTime || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm">{att.outTime || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm">{att.workMode}</td>
                      <td className="px-3 py-2 text-sm">{att.inLocation || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm">{att.outLocation || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm">
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
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${att.status === "Present"
                          ? "bg-green-100 text-green-600"
                          : att.status === "Present + Overtime"
                          ? "bg-green-200 text-green-800"
                          : att.status === "Half-Day"
                          ? "bg-orange-100 text-orange-600"
                          : att.status === "Incomplete"
                          ? "bg-yellow-100 text-yellow-600"
                          : att.status === "Leave"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-red-100 text-red-600"
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
          <p className="text-center text-gray-500 italic">No records found.</p>
        )}
      </div>
    </div>
  );
};
 
export default AdminAttendanceReport;