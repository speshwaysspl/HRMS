import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString, formatISTDate } from "../../utils/dateTimeUtils";
import { formatDMY } from "../../utils/dateUtils";
import MonthPicker from "../common/MonthPicker";
import { FixedSizeList as List } from "react-window";
import useMeta from "../../utils/useMeta";
import LoadingState from "../common/LoadingState";
import EmptyState from "../common/EmptyState";
import { FiCalendar } from "react-icons/fi";
 
const AttendanceReport = () => {
  useMeta({
    title: "Attendance Report — Speshway HRMS",
    description: "View daily and monthly attendance summaries.",
    keywords: "attendance report, HRMS",
    image: "/images/Logo.jpg",
    url: `${window.location.origin}/employee-dashboard/attendance-report`,
    robots: "noindex,nofollow"
  });
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
        const token = sessionStorage.getItem("token");
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
      const token = sessionStorage.getItem("token");
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
      <p className="text-ink">
        <strong>{label} Location:</strong> {loc.area || "N/A"}{" "}
        {loc.latitude && loc.longitude && (
          <a
            href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline hover:text-brand-700"
          >
            View on Map
          </a>
        )}
      </p>
    ) : null;
 
  if (loading) return <LoadingState message="Loading attendance..." />;

  return (
    <div className="p-4 md:p-8 min-h-screen bg-surface-muted">
      <h2 className="text-2xl md:text-3xl font-semibold text-ink mb-4 md:mb-6 text-center">
        Attendance Report
      </h2>

      {/* View Mode Tabs */}
      <div className="mb-4 md:mb-6 flex justify-center">
        <div className="bg-white rounded-lg p-1 shadow-card border border-surface-subtle w-full max-w-xs">
          <button
            onClick={() => setViewMode("daily")}
            className={`px-4 md:px-6 py-2 rounded-md font-medium transition-colors ${
              viewMode === "daily"
                ? "bg-accent-600 text-white"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Daily Report
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-4 md:px-6 py-2 rounded-md font-medium transition-colors ${
              viewMode === "monthly"
                ? "bg-accent-600 text-white"
                : "text-ink-muted hover:text-ink"
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
              className="p-2 border border-surface-subtle rounded-lg bg-white text-ink focus:ring-2 focus:ring-accent-500 focus:outline-none"
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
              <label className="block text-sm font-medium text-ink-muted mb-2">
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
            <div className="max-w-4xl mx-auto bg-white shadow-card rounded-xl p-8 border border-surface-subtle space-y-4">
              <div className="mb-4">
                <strong className="text-ink">Status: </strong>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
                  {attendanceStatus}
                </span>
              </div>
              <p className="text-center text-lg text-ink-muted">
                {attendanceStatus.startsWith("Work from Home")
                  ? `You are working from home on ${selectedDate}`
                  : `You are on approved leave for ${selectedDate}`}
              </p>
            </div>
          ) : !attendance ? (
            <EmptyState
              icon={FiCalendar}
              title="No Attendance Found"
              message={`No attendance record was found for ${selectedDate}.`}
            />
          ) : (
            <div className="max-w-4xl mx-auto bg-white shadow-card rounded-xl p-8 border border-surface-subtle space-y-4">
              <div className="mb-4">
                <strong className="text-ink">Status: </strong>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  attendanceStatus === "Present"
                    ? "bg-accent-100 text-accent-700"
                    : attendanceStatus === "Present + Overtime"
                    ? "bg-accent-100 text-accent-700"
                    : attendanceStatus === "Half-Day"
                    ? "bg-amber-100 text-amber-700"
                    : attendanceStatus === "Incomplete"
                    ? "bg-amber-100 text-amber-700"
                    : attendanceStatus === "Leave"
                    ? "bg-brand-100 text-brand-700"
                    : attendanceStatus === "Work from Home - Present"
                    ? "bg-brand-100 text-brand-700"
                    : attendanceStatus === "Work from Home + Overtime"
                    ? "bg-brand-100 text-brand-700"
                    : attendanceStatus === "Work from Home - Half Day"
                    ? "bg-brand-100 text-brand-700"
                    : attendanceStatus === "Work from Home - Incomplete"
                    ? "bg-amber-100 text-amber-700"
                    : attendanceStatus === "Work from Home - Not Marked"
                    ? "bg-surface-muted text-ink-muted"
                    : attendanceStatus === "Not Yet"
                    ? "bg-surface-muted text-ink-muted"
                    : "bg-red-100 text-red-700"
                }`}>
                  {attendanceStatus}
                </span>
              </div>
              <p className="text-ink">
                <strong>In Time (IST):</strong> {attendance.inTime || "Not marked"}
              </p>
              <p className="text-ink">
                <strong>Out Time (IST):</strong> {attendance.outTime || "Not marked"}
              </p>
              <p className="text-ink">
                <strong>Work Mode:</strong> {attendance.workMode}
              </p>

              {renderLocation(attendance.inLocation, "In")}
              {renderLocation(attendance.outLocation, "Out")}

              {attendance.breaks?.length > 0 && (
                <div className="text-ink">
                  <strong>Breaks:</strong>
                  <ul className="list-disc ml-6 mt-2 text-ink-muted">
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
            <LoadingState message="Loading monthly attendance..." />
          ) : !selectedMonth ? (
            <EmptyState
              icon={FiCalendar}
              title="Select a month"
              message="Please select a month to view the monthly attendance report."
            />
          ) : monthlyData.length === 0 ? (
            <EmptyState
              icon={FiCalendar}
              title="No data found"
              message="No attendance data found for the selected month."
            />
          ) : (
            <div className="max-w-6xl mx-auto bg-white shadow-card rounded-xl p-8 border border-surface-subtle">
              <h3 className="text-xl font-semibold text-ink mb-6 text-center">
                Monthly Attendance Report - {selectedMonth}
              </h3>

              {/* Monthly Summary (memoized) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-surface-muted p-4 rounded-lg text-center border border-surface-subtle">
                  <div className="text-2xl font-semibold text-accent-600">{monthlySummary.present}</div>
                  <div className="text-sm text-ink-muted">Present Days</div>
                </div>
                <div className="bg-surface-muted p-4 rounded-lg text-center border border-surface-subtle">
                  <div className="text-2xl font-semibold text-red-600">{monthlySummary.absent}</div>
                  <div className="text-sm text-ink-muted">Absent Days</div>
                </div>
                <div className="bg-surface-muted p-4 rounded-lg text-center border border-surface-subtle">
                  <div className="text-2xl font-semibold text-amber-600">{monthlySummary.halfDay}</div>
                  <div className="text-sm text-ink-muted">Half Days</div>
                </div>
                <div className="bg-surface-muted p-4 rounded-lg text-center border border-surface-subtle">
                  <div className="text-2xl font-semibold text-brand-600">{monthlySummary.wfh}</div>
                  <div className="text-sm text-ink-muted">Work from Home</div>
                </div>
              </div>

              {/* Monthly Data Virtualized List */}
              <div className="overflow-x-auto">
                {/* Desktop Header - Hidden on Mobile */}
                <div className="hidden md:grid grid-cols-6 bg-surface-muted border border-surface-subtle">
                  <div className="px-4 py-2 text-left font-semibold text-ink">Date</div>
                  <div className="px-4 py-2 text-left font-semibold text-ink">Status</div>
                  <div className="px-4 py-2 text-left font-semibold text-ink">In Time</div>
                  <div className="px-4 py-2 text-left font-semibold text-ink">Out Time</div>
                  <div className="px-4 py-2 text-left font-semibold text-ink">Work Mode</div>
                  <div className="px-4 py-2 text-left font-semibold text-ink">Working Hours</div>
                </div>

                {/* Mobile View - Card Layout */}
                <div className="md:hidden">
                  {monthlyData.map((record, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-card border border-surface-subtle mb-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-ink">{formatDMY(record.date)}</div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.status === "Present"
                            ? "bg-accent-100 text-accent-700"
                            : record.status === "Present + Overtime"
                            ? "bg-accent-100 text-accent-700"
                            : record.status === "Half-Day"
                            ? "bg-amber-100 text-amber-700"
                            : record.status === "Incomplete"
                            ? "bg-amber-100 text-amber-700"
                            : record.status === "Leave"
                            ? "bg-brand-100 text-brand-700"
                            : record.status === "Work from Home - Present"
                            ? "bg-brand-100 text-brand-700"
                            : record.status === "Work from Home + Overtime"
                            ? "bg-brand-100 text-brand-700"
                            : record.status === "Work from Home - Half Day"
                            ? "bg-brand-100 text-brand-700"
                            : record.status === "Work from Home - Incomplete"
                            ? "bg-amber-100 text-amber-700"
                            : record.status === "Work from Home - Not Marked"
                            ? "bg-surface-muted text-ink-muted"
                            : record.status === "Not Yet"
                            ? "bg-surface-muted text-ink-muted"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {record.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-ink">
                        <div>
                          <span className="text-ink-muted">In:</span> {record.inTime || "-"}
                        </div>
                        <div>
                          <span className="text-ink-muted">Out:</span> {record.outTime || "-"}
                        </div>
                        <div>
                          <span className="text-ink-muted">Mode:</span> {record.workMode}
                        </div>
                        <div>
                          <span className="text-ink-muted">Hours:</span> {record.workingHours && record.workingHours !== "0.00" ? `${record.workingHours}h` : "-"}
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
                        <div style={style} className="grid grid-cols-6 border border-surface-subtle hover:bg-surface-muted text-ink">
                          <div className="px-4 py-2">{formatDMY(record.date)}</div>
                          <div className="px-4 py-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.status === "Present"
                                ? "bg-accent-100 text-accent-700"
                                : record.status === "Present + Overtime"
                                ? "bg-accent-100 text-accent-700"
                                : record.status === "Half-Day"
                                ? "bg-amber-100 text-amber-700"
                                : record.status === "Incomplete"
                                ? "bg-amber-100 text-amber-700"
                                : record.status === "Leave"
                                ? "bg-brand-100 text-brand-700"
                                : record.status === "Work from Home - Present"
                                ? "bg-brand-100 text-brand-700"
                                : record.status === "Work from Home + Overtime"
                                ? "bg-brand-100 text-brand-700"
                                : record.status === "Work from Home - Half Day"
                                ? "bg-brand-100 text-brand-700"
                                : record.status === "Work from Home - Incomplete"
                                ? "bg-amber-100 text-amber-700"
                                : record.status === "Work from Home - Not Marked"
                                ? "bg-surface-muted text-ink-muted"
                                : record.status === "Not Yet"
                                ? "bg-surface-muted text-ink-muted"
                                : "bg-red-100 text-red-700"
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
