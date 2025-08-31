// frontend/src/pages/EmployeeAnnouncements.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";
import { formatISTDate } from "../../utils/dateTimeUtils";

const EmployeeAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/announcement`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          setAnnouncements(res.data.announcements);
        } else {
          setError("Failed to load announcements.");
        }
      } catch (err) {
        setError("Failed to load announcements.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (error) return (
    <div className="text-center mt-8 p-4">
      <p className="text-red-600 text-lg">{error}</p>
    </div>
  );
  if (announcements.length === 0) return (
    <div className="text-center mt-8 p-4">
      <p className="text-gray-600 text-lg">No announcements available.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6 md:mb-8"
        >
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-2">📢 Announcements</h1>
          <p className="text-gray-600 text-sm md:text-base">Stay updated with the latest company news</p>
        </motion.div>

        <div className="space-y-4">
          {announcements.map(({ _id, title, createdAt }, index) => (
            <motion.div
              key={_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200"
            >
              <div className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 break-words">
                      {title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatISTDate(new Date(createdAt))}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => navigate(`/employee-dashboard/announcements/${_id}`)}
                      className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmployeeAnnouncements;
