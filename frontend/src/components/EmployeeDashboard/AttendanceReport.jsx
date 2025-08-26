import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
 
const AttendanceReport = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialDate = params.get("date") || new Date().toISOString().split("T")[0];
 
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(initialDate);
 
  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
 
        const { data } = await axios.get(
          `http://localhost:5000/api/attendance/report?date=${selectedDate}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
 
        setAttendance(data?.length > 0 ? data[0] : null);
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
          <p>
            <strong>In Time:</strong> {attendance.inTime || "Not marked"}
          </p>
          <p>
            <strong>Out Time:</strong> {attendance.outTime || "Not marked"}
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
                    Break {idx + 1}: {b.start} - {b.end || "Ongoing"}
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