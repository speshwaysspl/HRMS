import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString, toISTTimeString } from "../../utils/dateTimeUtils";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
 
// Fix marker icon issue in leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});
 
const Attendance = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [tracker, setTracker] = useState({
    inTime: "",
    outTime: "",
    workMode: "office",
    breaks: [],
    latitude: null,
    longitude: null,
    area: "",
  });
 
  // Get user location + area using Photon (no API key needed)
  const getLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const { latitude, longitude } = coords;
          let area = "Unknown Area";
          try {
            const res = await fetch(
              `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}`
            );
            const data = await res.json();
            if (data.features?.length > 0) {
              area = data.features[0].properties.name || "Unknown Area";
              if (data.features[0].properties.city) {
                area += `, ${data.features[0].properties.city}`;
              }
            }
          } catch (err) {
            console.error("Error fetching location from Photon:", err);
          }
          resolve({ latitude, longitude, area });
        },
        reject,
        { enableHighAccuracy: true }
      );
    });
  }, []);
 
  useEffect(() => {
    getLocation().then((loc) =>
      setTracker((prev) => ({ ...prev, ...loc }))
    );
  }, [getLocation]);
 
  // Fetch today’s record on mount
  useEffect(() => {
    const fetchToday = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await axios.get(`${API_BASE}/api/attendance/today`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          setTodayRecord(res.data);
          setTracker((prev) => ({
            ...prev,
            inTime: res.data.inTime || "",
            outTime: res.data.outTime || "",
            workMode: res.data.workMode || prev.workMode,
            breaks: res.data.breaks || [],
            latitude: res.data.inLocation?.latitude || prev.latitude,
            longitude: res.data.inLocation?.longitude || prev.longitude,
            area: res.data.inLocation?.area || prev.area,
          }));
        }
      } catch (err) {
        console.error("Error fetching today record:", err);
      }
    };
    fetchToday();
  }, []);
 
  const getCurrentTime = () => toISTTimeString();
 
  const saveBreaksToBackend = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const today = toISTDateString(new Date());
      const attendanceData = {
        date: today,
        breaks: tracker.breaks,
      };

      await axios.post(`${API_BASE}/api/attendance`, attendanceData, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Error saving breaks:", err);
    }
  };

  const handleSubmit = async (type) => {
    const now = getCurrentTime();
    const updatedTracker = { ...tracker };

    if (type === "inTime") {
      updatedTracker.inTime = now;
    } else if (type === "outTime") {
      updatedTracker.outTime = now;
    }

    setTracker(updatedTracker);
    setLoading(true);
 
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login.");
        navigate("/login");
        return;
      }
 
      const today = toISTDateString(new Date());
      const attendanceData = {
        date: today,
        inTime: updatedTracker.inTime,
        outTime: updatedTracker.outTime || "",
        workMode: updatedTracker.workMode,
        breaks: updatedTracker.breaks,
        inLocation: {
          latitude: updatedTracker.latitude,
          longitude: updatedTracker.longitude,
          area: updatedTracker.area,
        },
        outLocation: updatedTracker.outTime
          ? {
              latitude: updatedTracker.latitude,
              longitude: updatedTracker.longitude,
              area: updatedTracker.area,
            }
          : null,
      };
 
      await axios.post(`${API_BASE}/api/attendance`, attendanceData, {
        headers: { Authorization: `Bearer ${token}` },
      });
 
      setTodayRecord(attendanceData);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error saving attendance.");
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex justify-center py-4 md:py-8 px-4">
      <div className="w-full max-w-3xl bg-white shadow-xl rounded-2xl p-4 md:p-6">
        <h2 className="text-2xl md:text-4xl font-extrabold text-blue-600 mb-4 md:mb-6 text-center">
          Attendance Tracker
        </h2>
 
        {/* Work Mode */}
        <div className="mb-6">
          <label className="block mb-1 font-medium text-gray-700">Work Mode</label>
          <select
            value={tracker.workMode}
            onChange={(e) =>
              setTracker((prev) => ({ ...prev, workMode: e.target.value }))
            }
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-300"
          >
            <option value="office">Work from Office</option>
            <option value="home">Work from Home</option>
          </select>
        </div>
 
        {/* In & Out Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl flex flex-col items-center bg-blue-50">
            <p className="text-gray-700 text-sm md:text-base">In Time</p>
            <p className="font-bold text-lg md:text-xl text-blue-600">
              {tracker.inTime || "Not Set"}
            </p>
            <button
              onClick={() => handleSubmit("inTime")}
              disabled={!!todayRecord?.inTime || loading}
              className="mt-2 px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm md:text-base"
            >
              Login
            </button>
          </div>

          <div className="p-4 rounded-xl flex flex-col items-center bg-red-50">
            <p className="text-gray-700 text-sm md:text-base">Out Time</p>
            <p className="font-bold text-lg md:text-xl text-red-600">
              {tracker.outTime || "Not Set"}
            </p>
            <button
              onClick={() => handleSubmit("outTime")}
              disabled={!todayRecord?.inTime || !!todayRecord?.outTime || loading}
              className="mt-2 px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 text-sm md:text-base"
            >
              Logout
            </button>
          </div>
        </div>
 
        {/* Breaks */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Break Times</h3>
          {tracker.breaks.map((b, idx) => (
            <div
              key={idx}
              className="flex justify-between bg-yellow-50 p-3 rounded-xl mb-2"
            >
              <p>
                Break {idx + 1}: {b.start} - {b.end || "Ongoing"}
              </p>
              {!b.end && (
                <button
                  onClick={async () => {
                    const now = getCurrentTime();
                    setTracker((prev) => {
                      const updated = [...prev.breaks];
                      updated[idx].end = now;
                      return { ...prev, breaks: updated };
                    });
                    // Save breaks to backend after state update
                    setTimeout(() => saveBreaksToBackend(), 100);
                  }}
                  disabled={!!todayRecord?.outTime || loading}
                  className="px-3 py-1 bg-green-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  End
                </button>
              )}
            </div>
          ))}
          <button
            onClick={async () => {
              const now = getCurrentTime();
              setTracker((prev) => ({
                ...prev,
                breaks: [...prev.breaks, { start: now, end: "" }],
              }));
              // Save breaks to backend after state update
              setTimeout(() => saveBreaksToBackend(), 100);
            }}
            disabled={!todayRecord?.inTime || !!todayRecord?.outTime || loading}
            className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Start Break
          </button>
        </div>
 
        {/* Location + Map */}
        {tracker.latitude && tracker.longitude && (
          <div className="mb-6">
            <div className="p-4 bg-green-50 rounded-xl text-center mb-4">
              <p className="text-gray-700">Current Location</p>
              <p className="text-green-700 font-semibold">
                Lat: {tracker.latitude.toFixed(4)}, Lon:{" "}
                {tracker.longitude.toFixed(4)}
              </p>
              <p className="text-gray-800 mt-1">Area: {tracker.area}</p>
            </div>
 
            <MapContainer
              center={[tracker.latitude, tracker.longitude]}
              zoom={17}
              style={{ height: "250px", width: "100%", borderRadius: "12px" }}
              className="md:h-80"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <Marker position={[tracker.latitude, tracker.longitude]}>
                <Popup>
                  You are here: <br />
                  {tracker.area}
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
};
 
export default Attendance;
 