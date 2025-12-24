import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString } from "../../utils/dateTimeUtils";
import { FaChevronLeft, FaChevronRight, FaPlus, FaTimes, FaEdit, FaTrash } from "react-icons/fa";

const Calendar = ({ isAdmin = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    description: "",
    type: "event",
  });
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/events`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.data.success) {
        setEvents(response.data.events);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedHolidays = async () => {
    if (!window.confirm("Do you want to populate standard Indian IT holidays for 2025-2026?")) return;
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/api/events/seed`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.data.success) {
        alert(response.data.message);
        fetchEvents();
      }
    } catch (error) {
      console.error("Error seeding holidays:", error);
      alert("Failed to seed holidays");
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day) => {
    if (!isAdmin) return;
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    setFormData({ ...formData, date: dateStr });
    setEditingEvent(null);
    setShowModal(true);
  };

  const handleEventClick = (e, event) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setEditingEvent(event);
    setFormData({
      title: event.title,
      date: toISTDateString(event.date),
      description: event.description || "",
      type: event.type || "event",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      title: "",
      date: "",
      description: "",
      type: "event",
    });
    setEditingEvent(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        // Update
        const response = await axios.put(
          `${API_BASE}/api/events/${editingEvent._id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (response.data.success) {
          fetchEvents();
          handleCloseModal();
        }
      } else {
        // Add
        const response = await axios.post(
          `${API_BASE}/api/events/add`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (response.data.success) {
          fetchEvents();
          handleCloseModal();
        }
      }
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event");
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      const response = await axios.delete(
        `${API_BASE}/api/events/${editingEvent._id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.data.success) {
        fetchEvents();
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event");
    }
  };

  const renderDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const allCells = [...blanks, ...days];

    return allCells.map((day, index) => {
      if (day === null) {
        return <div key={`blank-${index}`} className="h-24 sm:h-32 border border-gray-100 bg-gray-50/30"></div>;
      }

      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEvents = events.filter((event) => {
        const eventDate = toISTDateString(event.date);
        return eventDate === dateStr;
      });

      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isWeekend = currentDayDate.getDay() === 0 || currentDayDate.getDay() === 6;

      return (
        <motion.div
          key={`day-${day}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          whileHover={{ 
            scale: 1.05, 
            zIndex: 20, 
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            backgroundColor: isWeekend && !isToday ? "#1e40af" : "#fff"
          }}
          className={`h-24 sm:h-32 border border-gray-100 p-2 overflow-y-auto transition-colors relative group ${
            isAdmin ? "cursor-pointer" : ""
          } ${isToday ? "bg-blue-100" : isWeekend ? "bg-blue-900" : "bg-white"}`}
          onClick={() => handleDateClick(day)}
        >
          {isToday && (
            <motion.span 
              layoutId="today"
              className="absolute top-2 right-2 w-8 h-8 bg-blue-100 rounded-full -z-10"
            />
          )}
          <div className={`text-right font-bold text-sm mb-1 relative z-10 flex justify-end items-center gap-1 ${isToday ? "text-blue-600" : isWeekend ? "text-white" : "text-gray-700"}`}>
            {day}
          </div>
          
          <div className="space-y-1 relative z-10">
            {dayEvents.map((event) => (
              <motion.div
                key={event._id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05, x: 2 }}
                onClick={(e) => handleEventClick(e, event)}
                className={`text-xs px-2 py-1 rounded-full truncate text-white shadow-sm cursor-pointer font-medium flex items-center gap-1 ${
                  event.type === "holiday"
                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : event.type === "meeting"
                    ? "bg-gradient-to-r from-blue-400 to-indigo-500"
                    : "bg-gradient-to-r from-emerald-400 to-teal-500"
                }`}
                title={event.title}
              >
                <span className="w-1 h-1 bg-white/50 rounded-full flex-shrink-0" />
                {event.title}
              </motion.div>
            ))}
          </div>
        </motion.div>
      );
    });
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white rounded-xl shadow-xl border border-gray-100"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <h2 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
          <span className="text-4xl text-gray-300 font-light">|</span>
          {monthNames[currentDate.getMonth()]} 
          <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-lg text-2xl border border-blue-100">{currentDate.getFullYear()}</span>
        </h2>
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: "#fff" }} 
            whileTap={{ scale: 0.9 }} 
            onClick={handlePrevMonth} 
            className="p-3 rounded-lg text-gray-600 hover:text-blue-600 hover:shadow-sm transition-all"
          >
            <FaChevronLeft />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            onClick={() => setCurrentDate(new Date())} 
            className="px-6 py-2 text-sm font-semibold text-blue-600 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-200 transition-colors"
          >
            Today
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: "#fff" }} 
            whileTap={{ scale: 0.9 }} 
            onClick={handleNextMonth} 
            className="p-3 rounded-lg text-gray-600 hover:text-blue-600 hover:shadow-sm transition-all"
          >
            <FaChevronRight />
          </motion.button>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 gap-0 mb-4 text-center font-bold text-gray-400 uppercase text-xs tracking-wider bg-gray-50/50 rounded-lg py-3 border border-gray-100">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-gray-50">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentDate.toString()}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-7 gap-px bg-gray-200"
          >
            {renderDays()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Event Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
            >
              {/* Modal Header Decoration */}
              <div className={`h-2 w-full ${
                 formData.type === "holiday" ? "bg-gradient-to-r from-amber-400 to-orange-500" :
                 formData.type === "meeting" ? "bg-gradient-to-r from-blue-400 to-indigo-500" :
                 "bg-gradient-to-r from-emerald-400 to-teal-500"
              }`} />

              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    {editingEvent ? <FaEdit className="text-blue-500" /> : <FaPlus className="text-green-500" />}
                    {editingEvent ? "Edit Event" : "New Event"}
                  </h3>
                  <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full">
                    <FaTimes size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="Event title"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="event">Event</option>
                        <option value="holiday">Holiday</option>
                        <option value="meeting">Meeting</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                      placeholder="Add details..."
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                    {editingEvent && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium flex items-center gap-2"
                      >
                        <FaTrash size={14} /> Delete
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg hover:shadow-blue-200 transition-all font-medium"
                    >
                      Save Changes
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Calendar;
