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
import { FiCalendar, FiClock, FiLogIn, FiLogOut, FiMapPin, FiCoffee, FiSun, FiMoon } from "react-icons/fi";

// Single source of truth for status → badge color, instead of repeating the
// same ternary chain in three places.
const STATUS_STYLES = {
  "Present": "bg-accent-100 text-accent-700",
  "Present + Overtime": "bg-accent-100 text-accent-700",
  "Half-Day": "bg-amber-100 text-amber-700",
  "Incomplete": "bg-amber-100 text-amber-700",
  "Leave": "bg-brand-100 text-brand-700",
  "Work from Home - Present": "bg-brand-100 text-brand-700",
  "Work from Home + Overtime": "bg-brand-100 text-brand-700",
  "Work from Home - Half Day": "bg-brand-100 text-brand-700",
  "Work from Home - Incomplete": "bg-amber-100 text-amber-700",
  "Work from Home - Not Marked": "bg-surface-muted text-ink-muted",
  "Not Yet": "bg-surface-muted text-ink-muted",
};
const getStatusStyle = (status) => STATUS_STYLES[status] || "bg-red-100 text-red-700";

const StatusBadge = ({ status }) => (
  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(status)}`}>
    {status}
  </span>
);

const StatTile = ({ icon: Icon, label, value }) => (
  <div className="bg-surface-muted rounded-lg border border-surface-subtle p-4">
    <div className="flex items-center gap-2 text-ink-faint text-xs font-medium uppercase tracking-wide">
      <Icon size={14} />
      {label}
    </div>
    <p className="text-ink font-semibold mt-2 text-sm md:text-base">{value}</p>
  </div>
);

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
  const [workingHours, setWorkingHours] = useState(null);

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

  // Decimal hours -> "Xh Ym", matching the live Attendance page's format
  // instead of a raw "0.22h" figure.
  const formatHoursDuration = (hoursDecimal) => {
    const totalMinutes = Math.round(Number(hoursDecimal) * 60);
    return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  };

  // Plain check-in → check-out span. Breaks are tracked and shown
  // separately, not deducted from Working Hours.
  const computeWorkingHours = (record) => {
    if (!record?.inTime || !record?.outTime) return null;
    const [inHour, inMin] = record.inTime.split(":").map(Number);
    const [outHour, outMin] = record.outTime.split(":").map(Number);
    let hours = (outHour - inHour) + (outMin - inMin) / 60;
    if (hours < 0) hours += 24;
    return hours;
  };

  useEffect(() => {
    const fetchAttendance = async () => {
      if (viewMode !== "daily") return; // Only fetch daily data when in daily mode
      setLoading(true);
      setWorkingHours(null);
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
            const hours = computeWorkingHours(record);

            if (record?.inTime && record?.outTime) {
              setWorkingHours(hours);
              // Combine WFH with time-based status
              if (hours >= 8) {
                setAttendanceStatus(hours > 8 ? "Work from Home + Overtime" : "Work from Home - Present");
              } else if (hours >= 4) {
                setAttendanceStatus("Work from Home - Half Day");
              } else if (hours > 0) {
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
            const workingHoursValue = computeWorkingHours(record);
            setWorkingHours(workingHoursValue);

            // Determine status based on working hours
            if (workingHoursValue >= 8) {
              status = workingHoursValue > 8 ? "Present + Overtime" : "Present";
            } else if (workingHoursValue >= 4) {
              status = "Half-Day";
            } else {
              status = "Absent";
            }
          } else if (record.inTime) {
            // Only in-time is marked, no out-time. Once the day itself has
            // ended, close it out as a Half-Day instead of leaving it
            // "Incomplete" forever.
            status = selectedDate < toISTDateString(new Date()) ? "Half-Day" : "Incomplete";
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

  const renderLocation = (loc, label, Icon) =>
    loc ? (
      <div className="flex items-start gap-3 py-2.5 border-b border-surface-subtle last:border-b-0">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon size={15} />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label} Location</p>
          <p className="text-sm text-ink mt-0.5">
            {loc.area || "N/A"}{" "}
            {loc.latitude && loc.longitude && (
              <a
                href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 underline hover:text-brand-700"
              >
                View on map
              </a>
            )}
          </p>
        </div>
      </div>
    ) : null;

  if (loading) return <LoadingState message="Loading attendance..." />;

  const isSpecialStatus = attendanceStatus === "Leave" || attendanceStatus.startsWith("Work from Home");

  return (
    <div className="p-4 md:p-8 min-h-screen bg-surface-muted">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight">Attendance Report</h1>
          <p className="text-ink-muted mt-1 text-sm md:text-base">
            Review a single day's check-in details or a full month at a glance.
          </p>
        </div>

        {/* Toolbar: tabs + the relevant date/month picker, together */}
        <div className="mb-6 bg-white rounded-xl border border-surface-subtle shadow-card p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="inline-flex rounded-lg bg-surface-muted p-1 self-start">
            <button
              onClick={() => setViewMode("daily")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                viewMode === "daily" ? "bg-accent-600 text-white shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              Daily Report
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                viewMode === "monthly" ? "bg-accent-600 text-white shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              Monthly Report
            </button>
          </div>

          {viewMode === "daily" ? (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2.5 border border-surface-subtle rounded-lg bg-white text-ink text-sm focus:ring-2 focus:ring-accent-500 focus:outline-none"
            />
          ) : (
            <MonthPicker
              value={selectedMonth}
              onChange={setSelectedMonth}
              placeholder="Select month and year"
            />
          )}
        </div>

        {/* Daily Report Content */}
        {viewMode === "daily" && (
          <>
            {isSpecialStatus ? (
              <div className="bg-white shadow-card rounded-xl border border-surface-subtle overflow-hidden">
                <div className="p-6 flex items-center justify-between flex-wrap gap-3 border-b border-surface-subtle">
                  <div>
                    <p className="text-sm text-ink-muted">{formatISTDate ? formatISTDate(selectedDate) : selectedDate}</p>
                    <p className="text-lg font-semibold text-ink mt-0.5">Attendance Status</p>
                  </div>
                  <StatusBadge status={attendanceStatus} />
                </div>
                <div className="p-8 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700 mb-3">
                    {attendanceStatus.startsWith("Work from Home") ? <FiMoon size={20} /> : <FiSun size={20} />}
                  </span>
                  <p className="text-ink-muted">
                    {attendanceStatus.startsWith("Work from Home")
                      ? `You were working from home on ${selectedDate}.`
                      : `You were on approved leave on ${selectedDate}.`}
                  </p>
                </div>
              </div>
            ) : !attendance ? (
              <div className="bg-white shadow-card rounded-xl border border-surface-subtle">
                <EmptyState
                  icon={FiCalendar}
                  title="No Attendance Found"
                  message={`No attendance record was found for ${selectedDate}.`}
                />
              </div>
            ) : (
              <div className="bg-white shadow-card rounded-xl border border-surface-subtle overflow-hidden">
                <div className="p-6 flex items-center justify-between flex-wrap gap-3 border-b border-surface-subtle">
                  <div>
                    <p className="text-sm text-ink-muted">{selectedDate}</p>
                    <p className="text-lg font-semibold text-ink mt-0.5">Attendance Status</p>
                  </div>
                  <StatusBadge status={attendanceStatus} />
                </div>

                <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatTile icon={FiLogIn} label="In Time (IST)" value={attendance.inTime || "Not marked"} />
                  <StatTile icon={FiLogOut} label="Out Time (IST)" value={attendance.outTime || "Not marked"} />
                  <StatTile icon={FiClock} label="Work Mode" value={attendance.workMode || "—"} />
                  <StatTile
                    icon={FiClock}
                    label="Working Hours"
                    value={workingHours != null ? formatHoursDuration(workingHours) : "—"}
                  />
                </div>

                {(attendance.inLocation || attendance.outLocation) && (
                  <div className="px-6 pb-2">
                    {renderLocation(attendance.inLocation, "In", FiMapPin)}
                    {renderLocation(attendance.outLocation, "Out", FiMapPin)}
                  </div>
                )}

                {attendance.breaks?.length > 0 && (
                  <div className="px-6 pb-6 pt-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-2 flex items-center gap-2">
                      <FiCoffee size={14} /> Breaks
                    </p>
                    <ul className="space-y-1.5">
                      {attendance.breaks.map((b, idx) => (
                        <li key={idx} className="text-sm text-ink-muted flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Break {idx + 1}: {b.start} – {b.end || "Ongoing"} (IST)
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
              <div className="bg-white shadow-card rounded-xl border border-surface-subtle">
                <EmptyState
                  icon={FiCalendar}
                  title="Select a month"
                  message="Please select a month to view the monthly attendance report."
                />
              </div>
            ) : monthlyData.length === 0 ? (
              <div className="bg-white shadow-card rounded-xl border border-surface-subtle">
                <EmptyState
                  icon={FiCalendar}
                  title="No data found"
                  message="No attendance data found for the selected month."
                />
              </div>
            ) : (
              <div className="bg-white shadow-card rounded-xl border border-surface-subtle overflow-hidden">
                <div className="p-6 border-b border-surface-subtle">
                  <h3 className="text-lg font-semibold text-ink">Monthly summary — {selectedMonth}</h3>
                </div>

                {/* Monthly Summary (memoized) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
                  <div className="bg-surface-muted p-4 rounded-lg text-center border border-surface-subtle">
                    <div className="text-2xl font-semibold text-accent-600">{monthlySummary.present}</div>
                    <div className="text-sm text-ink-muted mt-0.5">Present Days</div>
                  </div>
                  <div className="bg-surface-muted p-4 rounded-lg text-center border border-surface-subtle">
                    <div className="text-2xl font-semibold text-red-600">{monthlySummary.absent}</div>
                    <div className="text-sm text-ink-muted mt-0.5">Absent Days</div>
                  </div>
                  <div className="bg-surface-muted p-4 rounded-lg text-center border border-surface-subtle">
                    <div className="text-2xl font-semibold text-amber-600">{monthlySummary.halfDay}</div>
                    <div className="text-sm text-ink-muted mt-0.5">Half Days</div>
                  </div>
                  <div className="bg-surface-muted p-4 rounded-lg text-center border border-surface-subtle">
                    <div className="text-2xl font-semibold text-brand-600">{monthlySummary.wfh}</div>
                    <div className="text-sm text-ink-muted mt-0.5">Work from Home</div>
                  </div>
                </div>

                {/* Monthly Data Virtualized List */}
                <div className="overflow-x-auto px-6 pb-6">
                  {/* Desktop Header - Hidden on Mobile */}
                  <div className="hidden md:grid grid-cols-6 bg-surface-muted border border-surface-subtle rounded-t-lg">
                    <div className="px-4 py-2 text-left font-semibold text-ink text-sm">Date</div>
                    <div className="px-4 py-2 text-left font-semibold text-ink text-sm">Status</div>
                    <div className="px-4 py-2 text-left font-semibold text-ink text-sm">In Time</div>
                    <div className="px-4 py-2 text-left font-semibold text-ink text-sm">Out Time</div>
                    <div className="px-4 py-2 text-left font-semibold text-ink text-sm">Work Mode</div>
                    <div className="px-4 py-2 text-left font-semibold text-ink text-sm">Working Hours</div>
                  </div>

                  {/* Mobile View - Card Layout */}
                  <div className="md:hidden space-y-3">
                    {monthlyData.map((record, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg shadow-card border border-surface-subtle">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-ink text-sm">{formatDMY(record.date)}</div>
                          <StatusBadge status={record.status} />
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
                            <span className="text-ink-muted">Hours:</span> {record.workingHours && record.workingHours !== "0.00" ? formatHoursDuration(record.workingHours) : "-"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View - Virtualized List */}
                  <div className="hidden md:block border-x border-b border-surface-subtle rounded-b-lg">
                    <List
                      height={Math.min(384, Math.max(192, monthlyData.length * 48))}
                      itemCount={monthlyData.length}
                      itemSize={48}
                      width={"100%"}
                    >
                      {({ index, style }) => {
                        const record = monthlyData[index];
                        return (
                          <div style={style} className="grid grid-cols-6 border-b border-surface-subtle last:border-b-0 hover:bg-surface-muted text-ink">
                            <div className="px-4 py-2 text-sm flex items-center">{formatDMY(record.date)}</div>
                            <div className="px-4 py-2 flex items-center">
                              <StatusBadge status={record.status} />
                            </div>
                            <div className="px-4 py-2 text-sm flex items-center">{record.inTime}</div>
                            <div className="px-4 py-2 text-sm flex items-center">{record.outTime}</div>
                            <div className="px-4 py-2 text-sm flex items-center">{record.workMode}</div>
                            <div className="px-4 py-2 text-sm flex items-center">
                              {record.workingHours && record.workingHours !== "0.00" ? formatHoursDuration(record.workingHours) : "-"}
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
    </div>
  );
};

export default AttendanceReport;
