import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { FaTrash, FaPlus, FaCalendarAlt, FaRegCalendarTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const HolidayList = ({ isAdmin = false }) => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newHoliday, setNewHoliday] = useState({
    title: "",
    date: "",
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/events`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.data.success) {
        const holidayEvents = response.data.events.filter(
          (e) => e.type === "holiday"
        );
        // Sort by date
        holidayEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        setHolidays(holidayEvents);
      }
    } catch (err) {
      setError("Failed to fetch holidays");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHoliday.title || !newHoliday.date) return;

    try {
      const response = await axios.post(
        `${API_BASE}/api/events/add`,
        {
          ...newHoliday,
          type: "holiday",
          description: "Added via Holiday List",
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        setNewHoliday({ title: "", date: "" });
        fetchHolidays();
      }
    } catch (err) {
      setError("Failed to add holiday");
      console.error(err);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;
    try {
      await axios.delete(`${API_BASE}/api/events/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      fetchHolidays();
    } catch (err) {
      setError("Failed to delete holiday");
      console.error(err);
    }
  };

  // Group holidays by month-year
  const groupedHolidays = holidays.reduce((acc, holiday) => {
    const date = new Date(holiday.date);
    const monthYear = date.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(holiday);
    return acc;
  }, {});

  const currentMonthYear = new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  // Filter for non-admins (employees) to show ONLY current month
  const displayHolidays = isAdmin 
    ? groupedHolidays 
    : Object.keys(groupedHolidays)
        .filter(key => key === currentMonthYear)
        .reduce((obj, key) => {
          obj[key] = groupedHolidays[key];
          return obj;
        }, {});

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-xl p-6 mt-6 border border-gray-100"
    >
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span className="p-2 bg-blue-100 rounded-lg text-blue-600">
          <FaCalendarAlt />
        </span>
        Holiday List
      </h3>

      {/* Add Holiday Form - Only for Admin */}
      <AnimatePresence>
        {isAdmin && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddHoliday} 
            className="mb-8 p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm"
          >
            <h4 className="font-semibold text-gray-700 mb-4">Add New Holiday</h4>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Holiday Name"
                value={newHoliday.title}
                onChange={(e) =>
                  setNewHoliday({ ...newHoliday, title: e.target.value })
                }
                className="flex-1 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
              <input
                type="date"
                value={newHoliday.date}
                onChange={(e) =>
                  setNewHoliday({ ...newHoliday, date: e.target.value })
                }
                className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-md shadow-blue-200"
              >
                <FaPlus /> Add
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-100 flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"/>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            Loading holidays...
        </div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {Object.keys(displayHolidays).length === 0 ? (
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200"
             >
               <FaRegCalendarTimes className="text-4xl mb-3 text-gray-300" />
               <p>{isAdmin ? "No holidays found." : "No holidays found for this month."}</p>
             </motion.div>
          ) : (
            Object.entries(displayHolidays).map(([month, items]) => (
              <motion.div variants={item} key={month} className={`rounded-xl overflow-hidden ${month === currentMonthYear ? 'ring-2 ring-blue-100 shadow-lg shadow-blue-50' : 'border border-gray-100'}`}>
                <div className={`px-4 py-3 border-b flex items-center justify-between sticky top-0 z-10 backdrop-blur-md ${month === currentMonthYear ? 'bg-blue-50/90 border-blue-100' : 'bg-gray-50/90 border-gray-100'}`}>
                  <h4 className={`text-lg font-bold ${month === currentMonthYear ? 'text-blue-700' : 'text-gray-700'}`}>
                    {month}
                  </h4>
                  {month === currentMonthYear && (
                    <span className="text-xs font-semibold bg-blue-100 text-blue-600 px-3 py-1 rounded-full border border-blue-200">
                      Current Month
                    </span>
                  )}
                </div>
                
                <div className={`p-4 flex flex-col gap-4 ${month === currentMonthYear ? 'bg-white' : 'bg-white'}`}>
                  {items.map((holiday) => (
                    <motion.div
                      key={holiday._id}
                      whileHover={{ y: -4, shadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                      className="group relative flex flex-col justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 transition-colors shadow-sm"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-blue-600 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="mb-2">
                        <div className="font-bold text-gray-800 text-lg group-hover:text-blue-700 transition-colors">
                          {holiday.title}
                        </div>
                        <div className="text-sm text-gray-500 font-medium flex items-center gap-2 mt-1">
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full group-hover:bg-blue-400 transition-colors"></span>
                          {new Date(holiday.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                            onClick={() => handleDeleteHoliday(holiday._id)}
                            className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete Holiday"
                            >
                            <FaTrash />
                            </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default HolidayList;
