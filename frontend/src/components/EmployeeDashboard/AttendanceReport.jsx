import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString, formatISTDate } from "../../utils/dateTimeUtils";
 
const AttendanceReport = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialDate = params.get("date") || toISTDateString(new Date());
 
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [attendanceStatus, setAttendanceStatus] = useState("");
 
  useEffect(() => {
    const fetchAttendance = async () => {
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
  }, [selectedDate]);
 
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
 
      {/* Date Selector */}
      <div className="mb-6 text-center">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="p-2 border rounded"
        />
      </div>
 
      {!attendance ? (
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
    </div>
  );
};
 
export default AttendanceReport;