import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString, toISTTimeString, getCurrentISTDateTime } from "../../utils/dateTimeUtils";
import { reverseGeocodeFast, buildAccuracyLabel, parseAccuracyMeters } from "../../utils/geocodeUtils";
import useMeta from "../../utils/useMeta";
import { useAuth } from "../../context/AuthContext";
import {
  FiLogIn,
  FiLogOut,
  FiCoffee,
  FiMapPin,
  FiExternalLink,
  FiCopy,
  FiCrosshair,
  FiAlertTriangle,
  FiRefreshCw,
  FiCalendar,
  FiInfo,
  FiClock,
  FiBriefcase,
  FiCheckCircle,
  FiChevronDown,
  FiLock,
} from "react-icons/fi";

const QUOTES = [
  "Small steps of consistency lead to big results.",
  "Discipline is the bridge between goals and accomplishment.",
  "Focus on progress, not perfection.",
  "Great things are done by a series of small things brought together.",
  "Your only limit is you.",
  "Success is the sum of small efforts repeated daily.",
];

const formatTime12 = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
};

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const formatDuration = (mins) => `${Math.floor(mins / 60)}h ${mins % 60}m`;

const MiniStat = ({ icon: Icon, label, value, sub }) => (
  <div className="flex items-center gap-2.5 min-w-0">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-surface-subtle text-brand-700">
      <Icon size={15} />
    </span>
    <div className="min-w-0">
      <p className="text-ink-faint text-[11px] font-medium uppercase tracking-wide leading-none whitespace-nowrap">{label}</p>
      <p className="text-ink font-semibold text-sm mt-1 leading-snug">{value}</p>
      {sub && <p className="text-ink-faint text-xs mt-0.5">{sub}</p>}
    </div>
  </div>
);

const CheckCard = ({ icon: Icon, tone, title, subtitle, time, buttonLabel, onClick, disabled }) => (
  <div className="bg-white rounded-xl border border-surface-subtle shadow-card p-5 flex flex-col items-center text-center">
    <span
      className={`flex h-14 w-14 items-center justify-center rounded-full mb-3 ${
        tone === "out" ? "bg-red-50 text-red-500" : "bg-accent-50 text-accent-600"
      }`}
    >
      <Icon size={22} />
    </span>
    <p className="font-semibold text-ink text-lg">{title}</p>
    <p className="text-ink-faint text-xs mt-1">{subtitle}</p>
    <p className="font-mono text-2xl font-semibold text-ink mt-4" aria-live="polite">
      {time || "--:-- --"}
    </p>
    <button
      onClick={onClick}
      disabled={disabled}
      className={`mt-5 w-full py-3 rounded-lg text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        tone === "out" ? "bg-red-500 hover:bg-red-600" : "bg-accent-600 hover:bg-accent-700"
      }`}
    >
      {buttonLabel}
    </button>
  </div>
);

const Attendance = () => {
  useMeta({
    title: "Attendance — Speshway HRMS",
    description: "Mark in/out, track breaks and view current location.",
    keywords: "attendance, HRMS",
    image: "/images/Logo.jpg",
    url: `${window.location.origin}/employee-dashboard/attendance`,
    robots: "noindex,nofollow"
  });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accLoading, setAccLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [banner, setBanner] = useState(null); // { type: "error" | "success", message }
  const [copied, setCopied] = useState(false);
  const [, forceTick] = useState(0);
  const [tracker, setTracker] = useState({
    inTime: "",
    outTime: "",
    workMode: "",
    breaks: [],
    latitude: null,
    longitude: null,
    area: "",
  });

  // Track best accuracy across watch updates
  const bestAccuracyRef = useRef(Infinity);

  // Get user location + area using fast REST geocoding
  const getLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const { latitude, longitude, accuracy } = coords;
          const locationAccuracy = buildAccuracyLabel(accuracy);
          let area = "Unknown Area";
          try {
            area = await reverseGeocodeFast(latitude, longitude);
          } catch (_) {
            // keep Unknown Area
          }
          resolve({ latitude, longitude, area, accuracy: locationAccuracy });
        },
        (error) => {
          let errorMessage = "Unknown location error";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied by user. Please enable location permissions.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable. Please check your GPS/network.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out. Please try again.";
              break;
          }

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 45000,
          maximumAge: 0
        }
      );
    });
  }, []);

  const getLocationLowAccuracy = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const { latitude, longitude, accuracy } = coords;
          const locationAccuracy = buildAccuracyLabel(accuracy);
          let area = "Unknown Area";
          try {
            area = await reverseGeocodeFast(latitude, longitude);
          } catch (_) { void 0; }
          resolve({ latitude, longitude, area, accuracy: locationAccuracy });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000,
        }
      );
    });
  }, []);

  const fetchIpLocation = useCallback(async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (!res.ok) throw new Error("IP lookup failed");
      const data = await res.json();
      const latitude = Number(data.latitude);
      const longitude = Number(data.longitude);
      const area = [data.city, data.region, data.country_name].filter(Boolean).join(", ");
      return { latitude, longitude, area, accuracy: "IP-based" };
    } catch (_) {
      throw new Error("Fallback location failed");
    }
  }, []);

  const getLocationWithFallback = useCallback(async () => {
    try {
      return await getLocation();
    } catch (err) {
      try {
        return await getLocationLowAccuracy();
      } catch (_) {
        return await fetchIpLocation();
      }
    }
  }, [getLocation, getLocationLowAccuracy, fetchIpLocation]);

  useEffect(() => {
    getLocationWithFallback()
      .then((loc) => {
        setTracker((prev) => ({ ...prev, ...loc }));
        bestAccuracyRef.current = parseAccuracyMeters(loc.accuracy);
      })
      .catch((error) => {
        // Set a default location or show error message
        setTracker((prev) => ({
          ...prev,
          area: `Location Error: ${error.message}`,
          latitude: null,
          longitude: null
        }));
      });
  }, [getLocationWithFallback]);

  // Watch position to refine accuracy and re-geocode on improvement
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        const { latitude, longitude, accuracy } = coords;
        const newAcc = Math.round(accuracy || Infinity);
        if (newAcc < bestAccuracyRef.current - 5) {
          bestAccuracyRef.current = newAcc;
          const area = await reverseGeocodeFast(latitude, longitude);
          setTracker((prev) => ({
            ...prev,
            latitude,
            longitude,
            area,
            accuracy: buildAccuracyLabel(newAcc),
          }));
        }
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );
    return () => {
      if (typeof watchId === 'number') navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const improveAccuracy = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      let bestAcc = Infinity;
      let bestCoords = null;
      const watchId = navigator.geolocation.watchPosition(
        async ({ coords }) => {
          const { latitude, longitude, accuracy } = coords;
          const a = Math.round(accuracy || Infinity);
          if (a < bestAcc) {
            bestAcc = a;
            bestCoords = { latitude, longitude };
            const area = await reverseGeocodeFast(latitude, longitude);
            setTracker((prev) => ({
              ...prev,
              latitude,
              longitude,
              area,
              accuracy: buildAccuracyLabel(a),
            }));
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 45000 }
      );
      setTimeout(() => {
        if (typeof watchId === 'number') navigator.geolocation.clearWatch(watchId);
        if (bestCoords) {
          resolve(bestCoords);
        } else {
          reject(new Error('No improved fix'));
        }
      }, 20000);
    });
  }, []);

  // Automatically try to sharpen the initial GPS fix once, in the
  // background — no button press required. The "Improve Accuracy" button
  // still lets the user re-run this on demand later.
  useEffect(() => {
    setAccLoading(true);
    improveAccuracy()
      .catch(() => {})
      .finally(() => setAccLoading(false));
  }, [improveAccuracy]);

  // Fetch today's record on mount
  useEffect(() => {
    const fetchToday = async () => {
      const token = sessionStorage.getItem("token");
      if (!token) return;
      try {
        const res = await axios.get(`${API_BASE}/api/attendance/today`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Check for ongoing break in localStorage
        const savedBreak = localStorage.getItem('ongoingBreak');
        let breaks = res.data?.breaks || [];

        if (savedBreak) {
          try {
            const ongoingBreak = JSON.parse(savedBreak);
            // If there's an ongoing break in localStorage, add it to breaks
            if (!ongoingBreak.end) {
              // Check if this break is already in the breaks array
              const existingBreakIndex = breaks.findIndex(b => !b.end);
              if (existingBreakIndex >= 0) {
                // Replace the existing ongoing break
                breaks[existingBreakIndex] = ongoingBreak;
              } else {
                // Add the ongoing break to the breaks array
                breaks.push(ongoingBreak);
              }
            }
          } catch (e) {
            console.error("Error parsing saved break:", e);
          }
        }

        // Self-heal: a day that's already checked out should never still
        // have a break marked "Ongoing" (can happen from a checkout saved
        // before this was auto-closed). Close it out at the check-out time
        // and persist the fix.
        if (res.data?.outTime && breaks.some((b) => !b.end)) {
          breaks = breaks.map((b) => (b.end ? b : { ...b, end: res.data.outTime }));
          localStorage.removeItem("ongoingBreak");
          axios
            .post(
              `${API_BASE}/api/attendance`,
              { date: toISTDateString(new Date()), breaks },
              { headers: { Authorization: `Bearer ${token}` } }
            )
            .catch(() => {});
        }

        if (res.data) {
          setTodayRecord({ ...res.data, breaks });
          setTracker((prev) => ({
            ...prev,
            inTime: res.data.inTime || "",
            outTime: res.data.outTime || "",
            workMode: res.data.workMode || prev.workMode,
            breaks: breaks,
            latitude: res.data.inLocation?.latitude || prev.latitude,
            longitude: res.data.inLocation?.longitude || prev.longitude,
            area: res.data.inLocation?.area || prev.area,
          }));
        }
      } catch (err) {
        // Error fetching today's record
      }
    };
    fetchToday();
  }, []);

  // Re-render every minute while checked in (not yet out) so "Working
  // Hours" keeps counting up live.
  useEffect(() => {
    if (!tracker.inTime || tracker.outTime) return;
    const id = setInterval(() => forceTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, [tracker.inTime, tracker.outTime]);

  const getCurrentTime = () => toISTTimeString();

  const saveBreaksToBackend = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return;

      const today = toISTDateString(new Date());
      const attendanceData = {
        date: today,
        breaks: tracker.breaks,
      };

      // Check if there's an ongoing break
      const ongoingBreakIndex = tracker.breaks.findIndex(b => !b.end);
      if (ongoingBreakIndex >= 0) {
        // Save the ongoing break to localStorage
        localStorage.setItem('ongoingBreak', JSON.stringify(tracker.breaks[ongoingBreakIndex]));
      }

      await axios.post(`${API_BASE}/api/attendance`, attendanceData, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      // Error saving breaks
    }
  };

  const handleSubmit = async (type) => {
    if (type === "inTime" && !tracker.workMode) {
      setBanner({ type: "error", message: "Please select a work mode before checking in." });
      return;
    }

    const now = getCurrentTime();
    const updatedTracker = { ...tracker };

    if (type === "inTime") {
      updatedTracker.inTime = now;
    } else if (type === "outTime") {
      updatedTracker.outTime = now;
      // Checking out ends the day — any break left running gets closed
      // out at the same moment instead of staying "Ongoing" forever.
      updatedTracker.breaks = updatedTracker.breaks.map((b) => (b.end ? b : { ...b, end: now }));
      localStorage.removeItem("ongoingBreak");
    }

    setTracker(updatedTracker);
    setLoading(true);
    setBanner(null);

    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        setBanner({ type: "error", message: "Please login to continue." });
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
      setBanner({
        type: "success",
        message: type === "inTime" ? "Checked in successfully." : "Checked out successfully.",
      });
    } catch (err) {
      setBanner({ type: "error", message: err.response?.data?.message || "Error saving attendance." });
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = () => {
    const now = getCurrentTime();
    const newBreak = { start: now, end: "" };

    setTracker((prev) => ({
      ...prev,
      breaks: [...prev.breaks, newBreak],
    }));

    localStorage.setItem(
      'ongoingBreak',
      JSON.stringify({ start: now, end: "", timestamp: new Date().getTime() })
    );

    setTimeout(() => saveBreaksToBackend(), 100);
  };

  const handleEndBreak = (idx) => {
    const now = getCurrentTime();
    setTracker((prev) => {
      const updated = [...prev.breaks];
      updated[idx] = { ...updated[idx], end: now };
      return { ...prev, breaks: updated };
    });
    localStorage.removeItem('ongoingBreak');
    setTimeout(() => saveBreaksToBackend(), 100);
  };

  const handleCopyCoordinates = () => {
    navigator.clipboard.writeText(`${tracker.latitude}, ${tracker.longitude}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleRetryLocation = () => {
    setLoading(true);
    setBanner(null);
    getLocationWithFallback()
      .then((loc) => {
        setTracker((prev) => ({ ...prev, ...loc }));
        setLoading(false);
      })
      .catch((error) => {
        setTracker((prev) => ({ ...prev, area: `Location Error: ${error.message}` }));
        setLoading(false);
      });
  };

  const ongoingBreak = tracker.breaks.find((b) => !b.end);

  // Derived, render-time values for the summary tiles. Once checked out,
  // "now" for any still-open break is the check-out time, not the live
  // clock — otherwise a break left unclosed at logout would keep eating
  // into the working-hours total for as long as the page stays open.
  const sessionEnd = tracker.outTime || getCurrentTime();
  const totalBreakMinutes = tracker.breaks.reduce((sum, b) => {
    if (!b.start) return sum;
    let dur = toMinutes(b.end || sessionEnd) - toMinutes(b.start);
    if (dur < 0) dur += 24 * 60;
    return sum + dur;
  }, 0);

  // Working Hours is the plain check-in → check-out span; Break Time is
  // shown as its own row rather than deducted from this figure.
  const workingMinutes = tracker.inTime
    ? (() => {
        let total = toMinutes(sessionEnd) - toMinutes(tracker.inTime);
        if (total < 0) total += 24 * 60;
        return Math.max(0, total);
      })()
    : 0;

  // Status mirrors the same thresholds used in the Attendance Report and
  // admin views: <4h worked = Absent, 4-8h = Half-Day, >=8h = Present.
  // While still checked in (no check-out yet) the day isn't final, so it
  // just reads "Checked In".
  const statusLabel = !tracker.inTime
    ? "Not Checked In"
    : !tracker.outTime
    ? "Checked In"
    : workingMinutes >= 480
    ? (workingMinutes > 480 ? "Present + Overtime" : "Present")
    : workingMinutes >= 240
    ? "Half-Day"
    : "Absent";
  const istNow = getCurrentISTDateTime();
  const istHour = istNow.getUTCHours();
  const greeting = istHour < 12 ? "Morning" : istHour < 17 ? "Afternoon" : "Evening";
  const weekdayLabel = istNow.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const dateLabel = istNow.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const quote = QUOTES[istNow.getUTCDate() % QUOTES.length];

  return (
    <div className="min-h-screen bg-surface-muted py-4 md:py-8 px-4">
      <div className="w-full max-w-6xl mx-auto space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight">Attendance Tracker</h1>
            <p className="text-ink-muted mt-1 text-sm md:text-base">
              Mark your check-in and check-out, track breaks, and confirm your location.
            </p>
          </div>

          {/* Quote + date card */}
          <div className="flex items-center gap-4 bg-white rounded-xl border border-surface-subtle shadow-card px-5 py-4 w-full lg:w-auto lg:min-w-[380px]">
            <div className="flex-1 min-w-0">
              <p className="text-ink text-sm italic leading-snug">&ldquo;{quote}&rdquo;</p>
              <span className="block h-1 w-8 bg-accent-500 rounded-full mt-2" />
            </div>
            <span className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
              <FiCalendar size={20} />
            </span>
            <div className="border-l border-surface-subtle pl-4 shrink-0 text-right">
              <p className="text-xs text-ink-faint">{weekdayLabel}</p>
              <p className="text-sm font-semibold text-ink">{dateLabel}</p>
            </div>
          </div>
        </div>

        {banner && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
              banner.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-accent-50 border-accent-100 text-accent-700"
            }`}
          >
            {banner.type === "error" && <FiAlertTriangle className="mt-0.5 shrink-0" size={16} />}
            {banner.message}
          </div>
        )}

        {/* Greeting + Check In / Check Out */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-4">
          <div className="relative overflow-hidden bg-gradient-to-br from-accent-50 via-white to-white rounded-xl border border-accent-100 shadow-card p-6">
            <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-accent-100/70 blur-2xl" aria-hidden="true" />
            <p className="relative text-accent-700 font-medium text-sm">Good {greeting},</p>
            <p className="relative text-2xl font-bold text-ink mt-0.5">
              {user?.name || "Employee"} <span aria-hidden="true">👋</span>
            </p>
            <p className="relative text-ink-muted text-sm mt-1">
              {statusLabel === "Not Checked In"
                ? "You're all set for today. Have a productive day!"
                : statusLabel === "Checked In"
                ? "You're checked in — make it count!"
                : "Great work today — you're checked out."}
            </p>

            <div className="relative mt-6 pt-5 border-t border-accent-100/70 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-surface-subtle text-brand-700">
                  <FiBriefcase size={15} />
                </span>
                <div className="min-w-0">
                  <label htmlFor="work-mode" className="block text-ink-faint text-[11px] font-medium uppercase tracking-wide leading-none">
                    Work Mode {!todayRecord?.inTime && <span className="text-red-500">*</span>}
                  </label>
                  {todayRecord?.inTime ? (
                    <p className="flex items-center gap-1.5 text-ink font-semibold text-sm mt-1">
                      {tracker.workMode === "home" ? "Home" : "Office"}
                      <FiLock size={11} className="text-ink-faint" title="Locked after check-in" />
                    </p>
                  ) : (
                    <div className="relative inline-flex items-center mt-1 rounded-md hover:bg-white/70 -ml-1 pl-1 pr-5 transition-colors">
                      <select
                        id="work-mode"
                        value={tracker.workMode}
                        onChange={(e) => setTracker((prev) => ({ ...prev, workMode: e.target.value }))}
                        className={`font-semibold text-sm bg-transparent border-none py-0.5 pl-0 pr-0 focus:outline-none cursor-pointer appearance-none ${
                          tracker.workMode ? "text-ink" : "text-ink-faint"
                        }`}
                      >
                        <option value="" disabled>
                          Select mode
                        </option>
                        <option value="office">Office</option>
                        <option value="home">Home</option>
                      </select>
                      <FiChevronDown size={13} className="absolute right-1 text-ink-faint pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>

              <MiniStat icon={FiClock} label="Working Hours" value={formatDuration(workingMinutes)} sub="Today" />
              <MiniStat icon={FiCheckCircle} label="Status" value={statusLabel} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CheckCard
              icon={FiLogIn}
              title="Check In"
              subtitle="Mark your arrival to start the day"
              time={formatTime12(tracker.inTime)}
              buttonLabel="Check In"
              onClick={() => handleSubmit("inTime")}
              disabled={!!todayRecord?.inTime || loading || !tracker.workMode}
            />
            <CheckCard
              icon={FiLogOut}
              tone="out"
              title="Check Out"
              subtitle="Mark your departure to end the day"
              time={formatTime12(tracker.outTime)}
              buttonLabel="Check Out"
              onClick={() => handleSubmit("outTime")}
              disabled={!todayRecord?.inTime || !!todayRecord?.outTime || loading}
            />
          </div>
        </div>

        {/* Location / Break Times / Today's Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Location */}
          <div className="bg-white rounded-xl border border-surface-subtle shadow-card p-5">
            <h3 className="text-sm font-semibold mb-3 text-ink flex items-center gap-2">
              <FiMapPin size={15} className="text-brand-700" /> Current Location
            </h3>

            {tracker.latitude && tracker.longitude ? (
              <>
                <div className="relative h-40 overflow-hidden rounded-lg border border-surface-subtle mb-3">
                  <iframe
                    title="OpenStreetMap"
                    className="absolute inset-x-0 top-0 w-full h-[172px]"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(tracker.longitude-0.0015).toFixed(6)}%2C${(tracker.latitude-0.0015).toFixed(6)}%2C${(tracker.longitude+0.0015).toFixed(6)}%2C${(tracker.latitude+0.0015).toFixed(6)}&layer=mapnik&marker=${tracker.latitude.toFixed(6)}%2C${tracker.longitude.toFixed(6)}`}
                  />
                </div>
                <p className="text-ink text-xs leading-relaxed line-clamp-2">{tracker.area}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => window.open(`https://www.google.com/maps?q=${tracker.latitude},${tracker.longitude}`, '_blank')}
                    title="Open in Google Maps"
                    className="inline-flex items-center gap-1.5 h-9 px-2.5 border border-surface-subtle bg-white text-ink text-xs rounded-lg hover:bg-surface-muted transition-colors"
                  >
                    <FiExternalLink size={13} /> Google Maps
                  </button>
                  <button
                    onClick={handleCopyCoordinates}
                    title="Copy coordinates"
                    className="inline-flex items-center gap-1.5 h-9 px-2.5 border border-surface-subtle bg-white text-ink text-xs rounded-lg hover:bg-surface-muted transition-colors"
                  >
                    <FiCopy size={13} /> {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={() => {
                      setAccLoading(true);
                      improveAccuracy().finally(() => setAccLoading(false));
                    }}
                    disabled={accLoading}
                    title="Improve accuracy"
                    className="inline-flex items-center gap-1.5 h-9 px-2.5 bg-accent-600 text-white text-xs font-medium rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50"
                  >
                    <FiCrosshair size={13} /> {accLoading ? 'Improving…' : 'Improve'}
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface-muted border border-surface-subtle flex items-center justify-center h-32">
                  <FiMapPin size={28} className="text-ink-faint" />
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex flex-col items-center justify-center text-center">
                  <FiAlertTriangle className="text-amber-600 mb-1.5" size={16} />
                  <p className="text-amber-800 font-medium text-xs">Location not available</p>
                  <p className="text-amber-700 text-[11px] mt-1 leading-snug">
                    Unable to detect your current location. Please enable location access and try again.
                  </p>
                  <button
                    onClick={handleRetryLocation}
                    disabled={loading}
                    className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 bg-white border border-amber-300 text-amber-800 text-xs font-semibold rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    <FiRefreshCw size={12} className={loading ? "animate-spin" : ""} /> {loading ? "Retrying…" : "Retry Location"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Break Times */}
          <div className="bg-white rounded-xl border border-surface-subtle shadow-card p-5">
            <h3 className="text-sm font-semibold mb-3 text-ink flex items-center gap-2">
              <FiCoffee size={15} className="text-brand-700" /> Break Times
            </h3>

            {tracker.breaks.length === 0 ? (
              <div className="py-6 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-ink-faint mb-2">
                  <FiCoffee size={16} />
                </span>
                <p className="text-sm text-ink-muted">No breaks logged yet today.</p>
                <p className="text-xs text-ink-faint mt-0.5">Take breaks to stay fresh and productive!</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {tracker.breaks.map((b, idx) => (
                  <li
                    key={idx}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-sm ${
                      b.end ? 'bg-surface-muted border-surface-subtle' : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <span className="text-ink flex items-center gap-2 min-w-0">
                      {!b.end && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />}
                      <span className="truncate">Break {idx + 1}: {b.start} – {b.end || "Ongoing"}</span>
                    </span>
                    {!b.end && (
                      <button
                        onClick={() => handleEndBreak(idx)}
                        disabled={!!todayRecord?.outTime || loading}
                        className="px-2.5 py-1.5 bg-accent-600 hover:bg-accent-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                      >
                        End
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={handleStartBreak}
              disabled={!todayRecord?.inTime || !!todayRecord?.outTime || loading || !!ongoingBreak}
              className="mt-3 w-full px-4 py-2.5 bg-white border border-surface-subtle hover:bg-surface-muted text-ink text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              + Start Break
            </button>
          </div>

          {/* Today's Summary */}
          <div className="bg-white rounded-xl border border-surface-subtle shadow-card p-5">
            <h3 className="text-sm font-semibold mb-4 text-ink flex items-center gap-2">
              <FiCheckCircle size={15} className="text-brand-700" /> Today's Summary
            </h3>
            <ul className="space-y-3.5 text-sm">
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-ink-muted"><FiLogIn size={14} className="text-brand-600" /> Check In</span>
                <span className="font-mono text-ink font-medium">{formatTime12(tracker.inTime) || "--:-- --"}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-ink-muted"><FiLogOut size={14} className="text-red-500" /> Check Out</span>
                <span className="font-mono text-ink font-medium">{formatTime12(tracker.outTime) || "--:-- --"}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-ink-muted"><FiClock size={14} className="text-brand-600" /> Working Hours</span>
                <span className="text-ink font-medium">{formatDuration(workingMinutes)}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-ink-muted"><FiCoffee size={14} className="text-amber-600" /> Break Time</span>
                <span className="text-ink font-medium">{totalBreakMinutes}m</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-ink-muted"><FiBriefcase size={14} className="text-brand-600" /> Work Mode</span>
                <span className="text-ink font-medium capitalize">{tracker.workMode || "—"}</span>
              </li>
              <li className="pt-3 border-t border-surface-subtle">
                <span className="flex items-center gap-2 text-ink-muted mb-1.5"><FiMapPin size={14} className="text-brand-600" /> Check-in Location</span>
                {tracker.latitude && tracker.longitude ? (
                  <p className="text-ink font-medium text-xs leading-relaxed line-clamp-2">{tracker.area}</p>
                ) : (
                  <p className="text-ink-faint text-xs">Not available</p>
                )}
              </li>
              <li className="pt-3 border-t border-surface-subtle">
                <span className="flex items-center gap-2 text-ink-muted mb-1.5"><FiMapPin size={14} className="text-brand-600" /> Check-out Location</span>
                {todayRecord?.outLocation?.area ? (
                  <p className="text-ink font-medium text-xs leading-relaxed line-clamp-2">{todayRecord.outLocation.area}</p>
                ) : (
                  <p className="text-ink-faint text-xs">Not available</p>
                )}
              </li>
            </ul>
          </div>
        </div>

        {/* Tip */}
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-start sm:items-center gap-2.5 text-sm text-brand-800">
          <FiInfo size={16} className="shrink-0 mt-0.5 sm:mt-0" />
          Tip: Make sure to enable location access in your browser for accurate attendance tracking.
        </div>
      </div>
    </div>
  );
};

export default Attendance;
