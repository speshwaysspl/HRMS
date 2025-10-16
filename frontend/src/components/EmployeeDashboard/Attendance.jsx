import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Wrapper } from "@googlemaps/react-wrapper";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString, toISTTimeString } from "../../utils/dateTimeUtils";

// Google Maps component
const GoogleMap = React.forwardRef(({ center, zoom, children }, mapRef) => {
  const ref = React.useRef(null);
  const [map, setMap] = React.useState();

  React.useEffect(() => {
    if (ref.current && !map) {
      const newMap = new window.google.maps.Map(ref.current, {
        center,
        zoom,
        mapTypeId: 'roadmap', // Default to roadmap for better visibility
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        scaleControl: true,
        rotateControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_CENTER,
          mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
        },
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER,
        },
        streetViewControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_TOP,
        },
        fullscreenControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_TOP,
        },
        gestureHandling: 'cooperative',
        minZoom: 3,
        maxZoom: 21,
        // Google Maps styling
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "on" }]
          },
          {
            featureType: "transit",
            elementType: "labels",
            stylers: [{ visibility: "on" }]
          }
        ],
        // Better UX options
        clickableIcons: true,
        disableDoubleClickZoom: false,
        draggable: true,
        keyboardShortcuts: true,
        scrollwheel: true,
      });

      // Add zoom change listener to ensure marker visibility
      newMap.addListener('zoom_changed', () => {
        const currentZoom = newMap.getZoom();
      });

      // Add map click listener
      newMap.addListener('click', (event) => {
        // Map click handled
      });

      setMap(newMap);
      
      // Expose map instance to parent component
      if (mapRef) {
        mapRef.current = newMap;
      }
    }
  }, [ref, map, mapRef]);

  React.useEffect(() => {
    if (map && center) {
      map.setCenter(center);
      map.setZoom(zoom);
    }
  }, [map, center, zoom]);

  return (
    <>
      <div 
        ref={ref} 
        style={{ 
          height: "300px", 
          width: "100%", 
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }} 
        className="md:h-96" 
      />
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { map });
        }
      })}
    </>
  );
});

// Google Maps Marker component
const GoogleMarker = ({ position, map, title }) => {
  const [marker, setMarker] = React.useState();

  React.useEffect(() => {
    if (map && position) {
      // Remove existing marker if it exists
      if (marker) {
        marker.setMap(null);
      }

      // Create custom marker icon with pulsing animation for better visibility
      const customIcon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <animateTransform id="pulse" attributeName="transform" type="scale" 
                values="1;1.2;1" dur="2s" repeatCount="indefinite"/>
            </defs>
            <!-- Outer pulsing ring -->
            <circle cx="20" cy="20" r="18" fill="#FF4444" opacity="0.3" filter="url(#glow)">
              <animate attributeName="r" values="15;20;15" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2s" repeatCount="indefinite"/>
            </circle>
            <!-- Main marker -->
            <circle cx="20" cy="20" r="12" fill="#FF4444" stroke="#FFFFFF" stroke-width="3" filter="url(#glow)"/>
            <circle cx="20" cy="20" r="6" fill="#FFFFFF"/>
            <circle cx="20" cy="20" r="3" fill="#FF4444"/>
            <!-- Location pin icon -->
            <path d="M20 8 C16 8 13 11 13 15 C13 20 20 27 20 27 S27 20 27 15 C27 11 24 8 20 8 Z M20 18 C18.3 18 17 16.7 17 15 S18.3 12 20 12 S23 13.3 23 15 S21.7 18 20 18 Z" 
                  fill="#FFFFFF" opacity="0.8" transform="scale(0.6) translate(6.7, 6.7)"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20),
      };

      const newMarker = new window.google.maps.Marker({
        position,
        map,
        title,
        icon: customIcon,
        animation: window.google.maps.Animation.DROP,
        optimized: false, // Ensures marker is always visible during zoom
        zIndex: 1000, // High z-index to ensure visibility
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: Arial, sans-serif;">
            <div style="font-weight: bold; color: #333; margin-bottom: 4px;">📍 Your Current Location</div>
            <div style="color: #666; font-size: 14px;">${title}</div>
            <div style="margin-top: 8px; font-size: 12px; color: #888;">
              Lat: ${position.lat.toFixed(6)}, Lng: ${position.lng.toFixed(6)}
            </div>
          </div>
        `,
        maxWidth: 300,
      });

      newMarker.addListener("click", () => {
        infoWindow.open(map, newMarker);
      });

      // Add bounce animation on marker creation
      newMarker.addListener("animation_changed", () => {
        setTimeout(() => {
          newMarker.setAnimation(null);
        }, 2000);
      });

      // Ensure marker stays visible during zoom changes
      map.addListener('zoom_changed', () => {
        if (newMarker.getMap()) {
          // Force marker to redraw
          newMarker.setVisible(false);
          setTimeout(() => {
            newMarker.setVisible(true);
          }, 10);
        }
      });

      setMarker(newMarker);
    }

    return () => {
      if (marker) {
        marker.setMap(null);
      }
    };
  }, [map, position, title]);

  // Update marker position when position changes
  React.useEffect(() => {
    if (marker && position) {
      marker.setPosition(position);
      // Ensure marker is visible after position update
      marker.setVisible(true);
    }
  }, [marker, position]);

  return null;
};
 
const Attendance = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const mapRef = React.useRef(null);
  const [tracker, setTracker] = useState({
    inTime: "",
    outTime: "",
    workMode: "office",
    breaks: [],
    latitude: null,
    longitude: null,
    area: "",
  });
 
  // Get user location + area using Google Geocoding API
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
          let area = "Unknown Area";
          let locationAccuracy = "Unknown";
          
          // Determine location accuracy level
          if (accuracy <= 10) {
            locationAccuracy = "Excellent (±" + Math.round(accuracy) + "m)";
          } else if (accuracy <= 50) {
            locationAccuracy = "Good (±" + Math.round(accuracy) + "m)";
          } else if (accuracy <= 100) {
            locationAccuracy = "Fair (±" + Math.round(accuracy) + "m)";
          } else {
            locationAccuracy = "Poor (±" + Math.round(accuracy) + "m)";
          }
          
          try {
            // Wait for Google Maps to be loaded
            if (window.google && window.google.maps && window.google.maps.Geocoder) {
              const geocoder = new window.google.maps.Geocoder();
              const latlng = { lat: latitude, lng: longitude };
              
              geocoder.geocode({ location: latlng }, (results, status) => {
                if (status === "OK" && results[0]) {
                  area = results[0].formatted_address;
                } else {
                  // Geocoding failed, using coordinates only
                }
                resolve({ latitude, longitude, area, accuracy: locationAccuracy });
              });
            } else {
              // Google Maps not loaded, using coordinates only
              resolve({ latitude, longitude, area, accuracy: locationAccuracy });
            }
          } catch (err) {
            // Error fetching location from Google, using coordinates only
            resolve({ latitude, longitude, area, accuracy: locationAccuracy });
          }
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
          timeout: 20000, // Increased timeout
          maximumAge: 60000 // Reduced cache age for fresher location
        }
      );
    });
  }, []);
 
  useEffect(() => {
    getLocation()
      .then((loc) => {
        setTracker((prev) => ({ ...prev, ...loc }));
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
        // Error fetching today's record
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
      // Error saving breaks
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
      alert(err.response?.data?.message || "Error saving attendance.");
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex justify-center py-4 md:py-8 px-4">
      <div className="w-full max-w-3xl bg-white shadow-xl rounded-2xl p-4 md:p-6">
        <h2 className="text-2xl md:text-4xl font-extrabold text-blue-600 mb-4 md:mb-6 text-center" style={{ fontFamily: 'Times New Roman, serif' }}>
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
        <div className="mb-6">
          {tracker.latitude && tracker.longitude ? (
            <div className="p-4 bg-green-50 rounded-xl text-center mb-4">
              <p className="text-gray-700 font-medium">📍 Current Location</p>
              <p className="text-green-700 font-semibold">
                Lat: {tracker.latitude.toFixed(6)}, Lon:{" "}
                {tracker.longitude.toFixed(6)}
              </p>
              <p className="text-gray-800 mt-1 text-sm">📍 {tracker.area}</p>
              {tracker.accuracy && (
                <p className="text-gray-600 mt-1 text-xs">
                  <strong>Accuracy:</strong> <span className={`accuracy-${tracker.accuracy.toLowerCase().split(' ')[0]}`}>{tracker.accuracy}</span>
                </p>
              )}
              <style jsx>{`
                .accuracy-excellent {
                  color: #10b981;
                  font-weight: 600;
                }
                .accuracy-good {
                  color: #3b82f6;
                  font-weight: 600;
                }
                .accuracy-fair {
                  color: #f59e0b;
                  font-weight: 600;
                }
                .accuracy-poor {
                  color: #ef4444;
                  font-weight: 600;
                }
              `}</style>
              <div className="mt-3 flex justify-center space-x-2">
                <button
                  onClick={() => {
                    const url = `https://www.google.com/maps?q=${tracker.latitude},${tracker.longitude}`;
                    window.open(url, '_blank');
                  }}
                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Open in Google Maps
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${tracker.latitude}, ${tracker.longitude}`);
                    alert('Coordinates copied to clipboard!');
                  }}
                  className="px-3 py-1 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Copy Coordinates
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center mb-4">
              <p className="text-yellow-800 font-medium">⚠️ Location Not Available</p>
              <p className="text-yellow-700 text-sm mt-1">{tracker.area || "Unable to detect current location"}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  getLocation()
                    .then((loc) => {
                      setTracker((prev) => ({ ...prev, ...loc }));
                      setLoading(false);
                    })
                    .catch((error) => {
                      setTracker((prev) => ({ 
                        ...prev, 
                        area: `Location Error: ${error.message}` 
                      }));
                      setLoading(false);
                    });
                }}
                disabled={loading}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
              >
                {loading ? "🔄 Retrying..." : "🔄 Retry Location"}
              </button>
            </div>
          )}

          {tracker.latitude && tracker.longitude && (

            <div className="relative">
              <Wrapper apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                <GoogleMap
                  ref={mapRef}
                  center={{ lat: tracker.latitude, lng: tracker.longitude }}
                  zoom={17}
                >
                  <GoogleMarker
                    position={{ lat: tracker.latitude, lng: tracker.longitude }}
                    title={tracker.area}
                  />
                </GoogleMap>
              </Wrapper>
              
              {/* Map Controls Overlay */}
              <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 space-y-2">
                <button
                  onClick={() => {
                    setLoading(true);
                    // Refresh location
                    getLocation().then((loc) => {
                      setTracker((prev) => ({ ...prev, ...loc }));
                      // Center map on new location
                      if (mapRef.current) {
                        mapRef.current.setCenter({ lat: loc.latitude, lng: loc.longitude });
                        mapRef.current.setZoom(17);
                      }
                      setLoading(false);
                    }).catch(() => {
                      setLoading(false);
                      alert('Failed to get current location. Please check your location permissions.');
                    });
                  }}
                  disabled={loading}
                  className="flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  title="Refresh Location"
                >
                  {loading ? '⏳' : '🔄'}
                </button>
                <button
                  onClick={() => {
                    // Center map on current location
                    if (mapRef.current && tracker.latitude && tracker.longitude) {
                      mapRef.current.setCenter({ lat: tracker.latitude, lng: tracker.longitude });
                      mapRef.current.setZoom(17);
                      
                      // Add a small bounce animation to the map
                      const currentZoom = mapRef.current.getZoom();
                      mapRef.current.setZoom(currentZoom - 1);
                      setTimeout(() => {
                        mapRef.current.setZoom(17);
                      }, 200);
                    }
                  }}
                  className="flex items-center justify-center w-10 h-10 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  title="Center on Location"
                >
                  🎯
                </button>
              </div>

              {/* Map Legend */}
              <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                  <span className="text-gray-700">Your Location</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
 
export default Attendance;
 