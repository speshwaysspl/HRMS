import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString, formatISTDate } from "../../utils/dateTimeUtils";
import MonthPicker from "../common/MonthPicker";
 
const AttendanceReport = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialDate = params.get("date") || toISTDateString(new Date());
 
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [attendanceStatus, setAttendanceStatus] = useState("");
  
  // Monthly report states
  const [viewMode, setViewMode] = useState("daily"); // "daily" or "monthly"
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // Current month in YYYY-MM format
  const [monthlyData, setMonthlyData] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
 
  useEffect(() => {
    const fetchAttendance = async () => {
      if (viewMode !== "daily") return; // Only fetch daily data when in daily mode
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
 
        // First check if there's an approved leave for this date
        const leaveResponse = await axios.get(
          `${API_BASE}/api/leave/employee?date=${selectedDate}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const hasApprovedLeave = leaveResponse.data.some(leave => 
          leave.status === "Approved" && 
          new Date(leave.startDate) <= new Date(selectedDate) && 
          new Date(leave.endDate) >= new Date(selectedDate)
        );
        
        if (hasApprovedLeave) {
          setAttendanceStatus("Leave");
          setAttendance(null); // No attendance record needed for leave days
          setLoading(false);
          return;
        }
        
        // If no approved leave, fetch attendance record
        const { data } = await axios.get(
          `${API_BASE}/api/attendance/report?date=${selectedDate}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
 
        const record = data?.length > 0 ? data[0] : null;
        setAttendance(record);
        
        if (record) {
          // Calculate attendance status
          let status = "";
          
          // Check if there's both in and out time
          if (record.inTime && record.outTime) {
            // Calculate working hours
            const [inHour, inMin] = record.inTime.split(":").map(Number);
            const [outHour, outMin] = record.outTime.split(":").map(Number);
            
            // Calculate total hours worked
            let workingHours = (outHour - inHour) + (outMin - inMin) / 60;
            if (workingHours < 0) workingHours += 24; // Handle overnight shifts
            
            // Deduct break time if any
            if (record.breaks && record.breaks.length > 0) {
              record.breaks.forEach(breakPeriod => {
                if (breakPeriod.start && breakPeriod.end) {
                  const [breakStartHour, breakStartMin] = breakPeriod.start.split(":").map(Number);
                  const [breakEndHour, breakEndMin] = breakPeriod.end.split(":").map(Number);
                  
                  let breakHours = (breakEndHour - breakStartHour) + (breakEndMin - breakStartMin) / 60;
                  if (breakHours < 0) breakHours += 24;
                  
                  workingHours -= breakHours;
                }
              });
            }
            
            // Determine status based on working hours
            if (workingHours >= 8) {
              status = workingHours > 8 ? "Present + Overtime" : "Present";
            } else if (workingHours >= 4) {
              status = "Half-Day";
            } else {
              status = "Absent";
            }
          } else if (record.inTime) {
            // Only in-time is marked, no out-time
            status = "Incomplete";
          } else {
            status = "Absent";
          }
          
          setAttendanceStatus(status);
        } else {
          setAttendanceStatus("Absent");
        }
      } catch (err) {
        console.error(err);
        setAttendance(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [selectedDate, viewMode]);

  // Fetch monthly attendance data
  const fetchMonthlyAttendance = async () => {
    if (!selectedMonth) return;
    
    setMonthlyLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const { data } = await axios.get(
        `${API_BASE}/api/attendance/monthly?month=${selectedMonth}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Monthly API Response:", data);
      setMonthlyData(data);
    } catch (err) {
      console.error("Error fetching monthly attendance:", err);
      setMonthlyData([]);
    } finally {
      setMonthlyLoading(false);
    }
  };

  // Fetch monthly data when month changes or when switching to monthly view
  useEffect(() => {
    if (viewMode === "monthly" && selectedMonth) {
      fetchMonthlyAttendance();
    }
  }, [selectedMonth, viewMode]);

  // Initial fetch for monthly data when component mounts
  useEffect(() => {
    if (selectedMonth) {
      fetchMonthlyAttendance();
    }
  }, []);
 
  const renderLocation = (loc, label) =>
    loc ? (
      <p>
        <strong>{label} Location:</strong> {loc.area || "N/A"}{" "}
        {loc.latitude && loc.longitude && (
          <a
            href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            View on Map
          </a>
        )}
      </p>
    ) : null;
 
  if (loading) return <div className="p-8 text-center">Loading attendance...</div>;
 
  return (
    <div className="p-8 min-h-screen bg-gray-100">
      <h2 className="text-4xl font-extrabold text-blue-700 mb-6 text-center">
        Attendance Report
      </h2>

      {/* View Mode Tabs */}
      <div className="mb-6 flex justify-center">
        <div className="bg-white rounded-lg p-1 shadow-md">
          <button
            onClick={() => setViewMode("daily")}
            className={`px-6 py-2 rounded-md font-medium transition-all ${
              viewMode === "daily"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            Daily Report
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-6 py-2 rounded-md font-medium transition-all ${
              viewMode === "monthly"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            Monthly Report
          </button>
        </div>
      </div>

      {/* Daily Report Section */}
      {viewMode === "daily" && (
        <>
          {/* Date Selector */}
          <div className="mb-6 text-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border rounded"
            />
          </div>
        </>
      )}

      {/* Monthly Report Section */}
      {viewMode === "monthly" && (
        <>
          {/* Month Selector */}
          <div className="mb-6 text-center">
            <div className="max-w-md mx-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Month
              </label>
              <MonthPicker
                value={selectedMonth}
                onChange={setSelectedMonth}
                placeholder="Select month and year"
              />
            </div>
          </div>
        </>
      )}
 
      {/* Daily Report Content */}
      {viewMode === "daily" && (
        <>
          {attendanceStatus === "Leave" ? (
            <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-3xl p-8 border border-gray-300 space-y-4">
              <div className="mb-4">
                <strong>Status: </strong>
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-600">
                  {attendanceStatus}
                </span>
              </div>
              <p className="text-center text-lg text-gray-600">
                You are on approved leave for {selectedDate}
              </p>
            </div>
          ) : !attendance ? (
            <div className="text-center text-xl text-gray-600">
              No Attendance Found for {selectedDate}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-3xl p-8 border border-gray-300 space-y-4">
              <div className="mb-4">
                <strong>Status: </strong>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${attendanceStatus === "Present" 
                  ? "bg-green-100 text-green-600" 
                  : attendanceStatus === "Present + Overtime" 
                  ? "bg-green-200 text-green-800" 
                  : attendanceStatus === "Half-Day" 
                  ? "bg-orange-100 text-orange-600" 
                  : attendanceStatus === "Incomplete" 
                  ? "bg-yellow-100 text-yellow-600" 
                  : attendanceStatus === "Leave" 
                  ? "bg-blue-100 text-blue-600" 
                  : "bg-red-100 text-red-600"}`}>
                  {attendanceStatus}
                </span>
              </div>
              <p>
                <strong>In Time (IST):</strong> {attendance.inTime || "Not marked"}
              </p>
              <p>
                <strong>Out Time (IST):</strong> {attendance.outTime || "Not marked"}
              </p>
              <p>
                <strong>Work Mode:</strong> {attendance.workMode}
              </p>

              {renderLocation(attendance.inLocation, "In")}
              {renderLocation(attendance.outLocation, "Out")}

              {attendance.breaks?.length > 0 && (
                <div>
                  <strong>Breaks:</strong>
                  <ul className="list-disc ml-6 mt-2">
                    {attendance.breaks.map((b, idx) => (
                      <li key={idx}>
                        Break {idx + 1}: {b.start} - {b.end || "Ongoing"} (IST)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Monthly Report Content */}
      {viewMode === "monthly" && (
        <>
          {monthlyLoading ? (
            <div className="p-8 text-center">Loading monthly attendance...</div>
          ) : !selectedMonth ? (
            <div className="text-center text-xl text-gray-600">
              Please select a month to view monthly attendance report
            </div>
          ) : monthlyData.length === 0 ? (
            <div className="text-center text-xl text-gray-600">
              No attendance data found for the selected month
            </div>
          ) : (
            <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-3xl p-8 border border-gray-300">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                Monthly Attendance Report - {selectedMonth}
              </h3>
              
              {/* Monthly Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {monthlyData.filter(d => d.status === "Present" || d.status === "Present + Overtime").length}
                  </div>
                  <div className="text-sm text-gray-600">Present Days</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {monthlyData.filter(d => d.status === "Absent").length}
                  </div>
                  <div className="text-sm text-gray-600">Absent Days</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {monthlyData.filter(d => d.status === "Half-Day").length}
                  </div>
                  <div className="text-sm text-gray-600">Half Days</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {monthlyData.filter(d => d.status === "Leave").length}
                  </div>
                  <div className="text-sm text-gray-600">Leave Days</div>
                </div>
              </div>

              {/* Monthly Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">In Time</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Out Time</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Work Mode</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Working Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            record.status === "Present" 
                              ? "bg-green-100 text-green-600" 
                              : record.status === "Present + Overtime" 
                              ? "bg-green-200 text-green-800" 
                              : record.status === "Half-Day" 
                              ? "bg-orange-100 text-orange-600" 
                              : record.status === "Incomplete" 
                              ? "bg-yellow-100 text-yellow-600" 
                              : record.status === "Leave" 
                              ? "bg-blue-100 text-blue-600" 
                              : "bg-red-100 text-red-600"
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">{record.inTime}</td>
                        <td className="border border-gray-300 px-4 py-2">{record.outTime}</td>
                        <td className="border border-gray-300 px-4 py-2">{record.workMode}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          {record.workingHours && record.workingHours !== "0.00" ? `${record.workingHours}h` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
 
export default AttendanceReport;