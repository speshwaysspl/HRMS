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
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
        return <div key={`blank-${index}`} className="h-24 sm:h-32 border border-surface-subtle bg-surface-muted/50"></div>;
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
            scale: 1.03,
            zIndex: 20,
            boxShadow: "0 4px 10px -2px rgba(28,35,51,0.10)",
          }}
          className={`h-24 sm:h-32 border border-surface-subtle p-2 overflow-y-auto transition-colors relative group ${
            isAdmin ? "cursor-pointer" : ""
          } ${isToday ? "bg-accent-50" : isWeekend ? "bg-surface-muted" : "bg-white"}`}
          onClick={() => handleDateClick(day)}
        >
          {isToday && (
            <motion.span
              layoutId="today"
              className="absolute top-2 right-2 w-8 h-8 bg-accent-100 rounded-full -z-10"
            />
          )}
          <div className={`text-right font-semibold text-sm mb-1 relative z-10 flex justify-end items-center gap-1 ${isToday ? "text-accent-700" : isWeekend ? "text-ink-muted" : "text-ink"}`}>
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
                    ? "bg-amber-500"
                    : event.type === "meeting"
                    ? "bg-brand-600"
                    : "bg-accent-600"
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
      className="p-6 bg-white rounded-xl shadow-card border border-surface-subtle"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <h2 className="text-2xl font-semibold text-brand-800 tracking-tight flex items-center gap-3">
          {monthNames[currentDate.getMonth()]}
          <span className="text-accent-700 bg-accent-50 px-3 py-1 rounded-lg text-xl border border-accent-100">{currentDate.getFullYear()}</span>
        </h2>
        <div className="flex items-center gap-2 bg-surface-muted p-1 rounded-xl border border-surface-subtle">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePrevMonth}
            className="p-3 rounded-lg text-ink-muted hover:text-accent-700 hover:bg-white hover:shadow-sm transition-colors"
          >
            <FaChevronLeft />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCurrentDate(new Date())}
            className="px-6 py-2 text-sm font-semibold text-accent-700 bg-white rounded-lg shadow-sm border border-surface-subtle hover:border-accent-200 transition-colors"
          >
            Today
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNextMonth}
            className="p-3 rounded-lg text-ink-muted hover:text-accent-700 hover:bg-white hover:shadow-sm transition-colors"
          >
            <FaChevronRight />
          </motion.button>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 gap-0 mb-4 text-center font-semibold text-ink-muted uppercase text-xs tracking-wider bg-surface-muted rounded-lg py-3 border border-surface-subtle">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl overflow-hidden border border-surface-subtle bg-surface-subtle">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentDate.toString()}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-7 gap-px bg-surface-subtle"
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
              className="bg-white rounded-2xl shadow-panel w-full max-w-md max-h-[90vh] overflow-y-auto relative border border-surface-subtle"
            >
              {/* Modal Header Decoration */}
              <div className={`h-1.5 w-full ${
                 formData.type === "holiday" ? "bg-amber-500" :
                 formData.type === "meeting" ? "bg-brand-600" :
                 "bg-accent-600"
              }`} />

              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-ink flex items-center gap-2">
                    {editingEvent ? <FaEdit className="text-brand-600" /> : <FaPlus className="text-accent-600" />}
                    {editingEvent ? "Edit Event" : "New Event"}
                  </h3>
                  <button onClick={handleCloseModal} className="text-ink-faint hover:text-ink transition-colors p-2 hover:bg-surface-muted rounded-full">
                    <FaTimes size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-surface-subtle rounded-lg px-4 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                      placeholder="Event title"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">Date</label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-surface-subtle rounded-lg px-4 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">Type</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full border border-surface-subtle rounded-lg px-4 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                      >
                        <option value="event">Event</option>
                        <option value="holiday">Holiday</option>
                        <option value="meeting">Meeting</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full border border-surface-subtle rounded-lg px-4 py-2 text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors resize-none"
                      placeholder="Add details..."
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-surface-subtle mt-6">
                    {editingEvent && (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm flex items-center gap-2"
                      >
                        <FaTrash size={14} /> Delete
                      </motion.button>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={handleCloseModal}
                      className="border border-surface-subtle bg-white text-ink hover:bg-surface-muted rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      className="bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-6 py-2 text-sm font-medium transition-colors"
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
