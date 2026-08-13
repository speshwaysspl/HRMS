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
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
      className="bg-white rounded-xl shadow-card p-6 mt-6 border border-surface-subtle"
    >
      <h3 className="text-xl font-semibold text-brand-800 mb-6 flex items-center gap-2">
        <span className="p-2 bg-accent-100 rounded-lg text-accent-700">
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
            className="mb-8 p-6 bg-surface-muted rounded-xl border border-surface-subtle"
          >
            <h4 className="font-semibold text-ink mb-4">Add New Holiday</h4>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Holiday Name"
                value={newHoliday.title}
                onChange={(e) =>
                  setNewHoliday({ ...newHoliday, title: e.target.value })
                }
                className="flex-1 border border-surface-subtle rounded-lg p-3 text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                required
              />
              <input
                type="date"
                value={newHoliday.date}
                onChange={(e) =>
                  setNewHoliday({ ...newHoliday, date: e.target.value })
                }
                className="border border-surface-subtle rounded-lg p-3 text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                required
              />
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="bg-accent-600 hover:bg-accent-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium text-sm"
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
        <div className="flex flex-col items-center justify-center py-12 text-ink-faint">
            <div className="w-8 h-8 border-4 border-accent-500 border-t-transparent rounded-full animate-spin mb-4"></div>
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
               className="flex flex-col items-center justify-center py-12 text-ink-faint bg-surface-muted rounded-xl border border-dashed border-surface-subtle"
             >
               <FaRegCalendarTimes className="text-4xl mb-3 text-ink-faint" />
               <p>{isAdmin ? "No holidays found." : "No holidays found for this month."}</p>
             </motion.div>
          ) : (
            Object.entries(displayHolidays).map(([month, items]) => (
              <motion.div variants={item} key={month} className={`rounded-xl overflow-hidden ${month === currentMonthYear ? 'ring-2 ring-accent-100 shadow-card' : 'border border-surface-subtle'}`}>
                <div className={`px-4 py-3 border-b flex items-center justify-between sticky top-0 z-10 backdrop-blur-md ${month === currentMonthYear ? 'bg-accent-50/90 border-accent-100' : 'bg-surface-muted/90 border-surface-subtle'}`}>
                  <h4 className={`text-lg font-semibold ${month === currentMonthYear ? 'text-accent-700' : 'text-ink'}`}>
                    {month}
                  </h4>
                  {month === currentMonthYear && (
                    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-accent-100 text-accent-700">
                      Current Month
                    </span>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-4 bg-white">
                  {items.map((holiday) => (
                    <motion.div
                      key={holiday._id}
                      whileHover={{ y: -2 }}
                      className="group relative flex flex-col justify-between p-4 bg-white border border-surface-subtle rounded-xl hover:border-accent-200 transition-colors shadow-card"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-accent-500 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="mb-2">
                        <div className="font-semibold text-ink text-lg group-hover:text-accent-700 transition-colors">
                          {holiday.title}
                        </div>
                        <div className="text-sm text-ink-muted font-medium flex items-center gap-2 mt-1">
                          <span className="w-1.5 h-1.5 bg-ink-faint rounded-full group-hover:bg-accent-500 transition-colors"></span>
                          {new Date(holiday.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                            onClick={() => handleDeleteHoliday(holiday._id)}
                            className="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
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
