import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString, formatISTDate } from "../../utils/dateTimeUtils";
import { formatDMY } from "../../utils/dateUtils";
import MonthPicker from "../common/MonthPicker";
import { FixedSizeList as List } from "react-window";
 
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

  // Memoized monthly summary counts to avoid repeated filtering
  const monthlySummary = useMemo(() => {
    const present = monthlyData.filter(d => d.status === "Present" || d.status === "Present + Overtime").length;
    const absent = monthlyData.filter(d => d.status === "Absent" || d.status === "Leave").length;
    const halfDay = monthlyData.filter(d => d.status === "Half-Day").length;
    const wfh = monthlyData.filter(d => d.status?.startsWith("Work from Home")).length;
    return { present, absent, halfDay, wfh };
  }, [monthlyData]);
 
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
        
        const approvedLeave = leaveResponse.data.find(leave => 
          leave.status === "Approved" && 
          new Date(leave.startDate) <= new Date(selectedDate) && 
          new Date(leave.endDate) >= new Date(selectedDate)
        );
        
        if (approvedLeave) {
          // Check if it's work from home leave
          if (approvedLeave.leaveType === "Work from Home") {
            // For work from home, we need to check attendance record for time conditions
            const { data: attendanceData } = await axios.get(
              `${API_BASE}/api/attendance/report?date=${selectedDate}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const record = attendanceData?.length > 0 ? attendanceData[0] : null;
            
            if (record?.inTime && record?.outTime) {
              // Calculate working hours for WFH
              const [inHour, inMin] = record.inTime.split(":").map(Number);
              const [outHour, outMin] = record.outTime.split(":").map(Number);
              
              let workingHours = (outHour - inHour) + (outMin - inMin) / 60;
              if (workingHours < 0) workingHours += 24;
              
              // Subtract break times if any
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
              
              // Combine WFH with time-based status
              if (workingHours >= 8) {
                setAttendanceStatus(workingHours > 8 ? "Work from Home + Overtime" : "Work from Home - Present");
              } else if (workingHours >= 4) {
                setAttendanceStatus("Work from Home - Half Day");
              } else if (workingHours > 0) {
                setAttendanceStatus("Work from Home - Incomplete");
              } else {
                setAttendanceStatus("Work from Home - Not Marked");
              }
              setAttendance(record);
            } else if (record?.inTime && !record?.outTime) {
              setAttendanceStatus("Work from Home - Incomplete");
              setAttendance(record);
            } else {
              setAttendanceStatus("Work from Home - Not Marked");
              setAttendance(null);
            }
          } else {
            setAttendanceStatus("Leave");
            setAttendance(null);
          }
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
            status = "Not Yet";
          }
          
          setAttendanceStatus(status);
        } else {
          setAttendanceStatus("Not Yet");
        }
      } catch (err) {
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

      
      setMonthlyData(data);
    } catch (err) {
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
    <div className="p-4 md:p-8 min-h-screen bg-gray-100">
      <h2 className="text-3xl md:text-4xl font-extrabold text-blue-700 mb-4 md:mb-6 text-center" style={{ fontFamily: 'Times New Roman, serif' }}>
        Attendance Report
      </h2>

      {/* View Mode Tabs */}
      <div className="mb-4 md:mb-6 flex justify-center">
        <div className="bg-white rounded-lg p-1 shadow-md w-full max-w-xs">
          <button
            onClick={() => setViewMode("daily")}
            className={`px-4 md:px-6 py-2 rounded-md font-medium transition-all ${
              viewMode === "daily"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            Daily Report
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-4 md:px-6 py-2 rounded-md font-medium transition-all ${
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
          {attendanceStatus === "Leave" || attendanceStatus.startsWith("Work from Home") ? (
            <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-3xl p-8 border border-gray-300 space-y-4">
              <div className="mb-4">
                <strong>Status: </strong>
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-600">
                  {attendanceStatus}
                </span>
              </div>
              <p className="text-center text-lg text-gray-600">
                {attendanceStatus.startsWith("Work from Home")
                  ? `You are working from home on ${selectedDate}` 
                  : `You are on approved leave for ${selectedDate}`}
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
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  attendanceStatus === "Present" 
                    ? "bg-green-100 text-green-600" 
                    : attendanceStatus === "Present + Overtime" 
                    ? "bg-green-200 text-green-800" 
                    : attendanceStatus === "Half-Day" 
                    ? "bg-orange-100 text-orange-600" 
                    : attendanceStatus === "Incomplete" 
                    ? "bg-yellow-100 text-yellow-600" 
                    : attendanceStatus === "Leave" 
                    ? "bg-blue-100 text-blue-600" 
                    : attendanceStatus === "Work from Home - Present" 
                    ? "bg-purple-100 text-purple-600" 
                    : attendanceStatus === "Work from Home + Overtime" 
                    ? "bg-purple-200 text-purple-800" 
                    : attendanceStatus === "Work from Home - Half Day" 
                    ? "bg-purple-50 text-purple-500" 
                    : attendanceStatus === "Work from Home - Incomplete" 
                    ? "bg-yellow-100 text-yellow-600" 
                    : attendanceStatus === "Work from Home - Not Marked" 
                    ? "bg-gray-100 text-gray-600" 
                    : attendanceStatus === "Not Yet" 
                    ? "bg-gray-100 text-gray-600" 
                    : "bg-red-100 text-red-600"
                }`}>
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
              
              {/* Monthly Summary (memoized) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{monthlySummary.present}</div>
                  <div className="text-sm text-gray-600">Present Days</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{monthlySummary.absent}</div>
                  <div className="text-sm text-gray-600">Absent Days</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">{monthlySummary.halfDay}</div>
                  <div className="text-sm text-gray-600">Half Days</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{monthlySummary.wfh}</div>
                  <div className="text-sm text-gray-600">Work from Home</div>
                </div>
              </div>

              {/* Monthly Data Virtualized List */}
              <div className="overflow-x-auto">
                {/* Desktop Header - Hidden on Mobile */}
                <div className="hidden md:grid grid-cols-6 bg-gray-50 border border-gray-300">
                  <div className="px-4 py-2 text-left font-semibold">Date</div>
                  <div className="px-4 py-2 text-left font-semibold">Status</div>
                  <div className="px-4 py-2 text-left font-semibold">In Time</div>
                  <div className="px-4 py-2 text-left font-semibold">Out Time</div>
                  <div className="px-4 py-2 text-left font-semibold">Work Mode</div>
                  <div className="px-4 py-2 text-left font-semibold">Working Hours</div>
                </div>
                
                {/* Mobile View - Card Layout */}
                <div className="md:hidden">
                  {monthlyData.map((record, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-sm border mb-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold">{formatDMY(record.date)}</div>
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
                            : record.status === "Work from Home - Present"
                            ? "bg-purple-100 text-purple-600"
                            : record.status === "Work from Home + Overtime"
                            ? "bg-purple-200 text-purple-800"
                            : record.status === "Work from Home - Half Day"
                            ? "bg-purple-50 text-purple-500"
                            : record.status === "Work from Home - Incomplete"
                            ? "bg-yellow-100 text-yellow-600"
                            : record.status === "Work from Home - Not Marked"
                            ? "bg-gray-100 text-gray-600"
                            : record.status === "Not Yet"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-red-100 text-red-600"
                        }`}>
                          {record.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">In:</span> {record.inTime || "-"}
                        </div>
                        <div>
                          <span className="text-gray-500">Out:</span> {record.outTime || "-"}
                        </div>
                        <div>
                          <span className="text-gray-500">Mode:</span> {record.workMode}
                        </div>
                        <div>
                          <span className="text-gray-500">Hours:</span> {record.workingHours && record.workingHours !== "0.00" ? `${record.workingHours}h` : "-"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop View - Virtualized List */}
                <div className="hidden md:block">
                  <List
                    height={Math.min(384, Math.max(192, monthlyData.length * 48))}
                    itemCount={monthlyData.length}
                    itemSize={48}
                    width={"100%"}
                  >
                    {({ index, style }) => {
                      const record = monthlyData[index];
                      return (
                        <div style={style} className="grid grid-cols-6 border border-gray-200 hover:bg-gray-50">
                          <div className="px-4 py-2">{formatDMY(record.date)}</div>
                          <div className="px-4 py-2">
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
                                : record.status === "Work from Home - Present"
                                ? "bg-purple-100 text-purple-600"
                                : record.status === "Work from Home + Overtime"
                                ? "bg-purple-200 text-purple-800"
                                : record.status === "Work from Home - Half Day"
                                ? "bg-purple-50 text-purple-500"
                                : record.status === "Work from Home - Incomplete"
                                ? "bg-yellow-100 text-yellow-600"
                                : record.status === "Work from Home - Not Marked"
                                ? "bg-gray-100 text-gray-600"
                                : record.status === "Not Yet"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-red-100 text-red-600"
                            }`}>
                              {record.status}
                            </span>
                          </div>
                          <div className="px-4 py-2">{record.inTime}</div>
                          <div className="px-4 py-2">{record.outTime}</div>
                          <div className="px-4 py-2">{record.workMode}</div>
                          <div className="px-4 py-2">
                            {record.workingHours && record.workingHours !== "0.00" ? `${record.workingHours}h` : "-"}
                          </div>
                        </div>
                      );
                    }}
                  </List>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
 
export default AttendanceReport;