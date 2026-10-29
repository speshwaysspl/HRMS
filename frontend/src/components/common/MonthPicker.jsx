import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';

const MONTHS = [
  { short: 'Jan', full: 'January' },
  { short: 'Feb', full: 'February' },
  { short: 'Mar', full: 'March' },
  { short: 'Apr', full: 'April' },
  { short: 'May', full: 'May' },
  { short: 'Jun', full: 'June' },
  { short: 'Jul', full: 'July' },
  { short: 'Aug', full: 'August' },
  { short: 'Sep', full: 'September' },
  { short: 'Oct', full: 'October' },
  { short: 'Nov', full: 'November' },
  { short: 'Dec', full: 'December' },
];

const MonthPicker = ({ value, onChange, placeholder = "Select month", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const now = new Date();
  const realCurrentYear = now.getFullYear();
  const realCurrentMonth = now.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(realCurrentYear);
  const dropdownRef = useRef(null);

  // Parse current value (format: YYYY-MM)
  const parseValue = (val) => {
    if (!val || typeof val !== 'string') return { month: null, year: null };
    const [year, month] = val.split('-');
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    return {
      month: !isNaN(m) ? m : null,
      year: !isNaN(y) ? y : null,
    };
  };

  const { month: currentMonth, year: currentYear } = parseValue(value);

  // Available selectable years (10 years back, 5 years forward)
  const years = Array.from({ length: 16 }, (_, i) => realCurrentYear - 10 + i);

  // Format display string
  const getDisplayValue = () => {
    if (!value) return placeholder;
    const { month, year } = parseValue(value);
    if (month && year && month >= 1 && month <= 12) {
      return `${MONTHS[month - 1].short}, ${year}`;
    }
    return placeholder;
  };

  // Month selection
  const handleMonthSelect = (monthIndex) => {
    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const newValue = `${selectedYear}-${monthStr}`;
    onChange(newValue);
    setIsOpen(false);
  };

  // Clear value
  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Jump to this month
  const handleThisMonth = () => {
    const monthStr = String(realCurrentMonth).padStart(2, '0');
    const newValue = `${realCurrentYear}-${monthStr}`;
    setSelectedYear(realCurrentYear);
    onChange(newValue);
    setIsOpen(false);
  };

  // Update selectedYear when value changes
  useEffect(() => {
    if (currentYear) {
      setSelectedYear(currentYear);
    }
  }, [currentYear]);

  // Click outside to close (desktop)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full sm:w-auto inline-flex items-center justify-between gap-3 px-3.5 py-2 min-w-[150px] sm:min-w-[170px] bg-white border rounded-xl text-sm font-medium transition-all duration-150 shadow-card ${
          isOpen
            ? 'border-accent-600 ring-2 ring-accent-500/20'
            : 'border-surface-subtle hover:border-ink-faint'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FiCalendar className="text-accent-600 text-base shrink-0" aria-hidden="true" />
          <span className={`truncate ${value ? 'text-ink font-semibold' : 'text-ink-muted'}`}>
            {getDisplayValue()}
          </span>
        </div>
        <FiChevronDown
          size={16}
          className={`text-ink-muted transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-accent-600' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Popover / Mobile Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 sm:hidden"
              aria-hidden="true"
            />

            {/* Picker Card: Center modal on mobile, absolute dropdown on desktop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-[330px] mx-auto z-50 sm:mx-0 sm:max-w-none sm:translate-y-0 sm:inset-auto sm:absolute sm:top-full sm:right-0 mt-0 sm:mt-2 w-auto sm:w-80 bg-white border border-surface-subtle rounded-2xl shadow-2xl sm:shadow-xl p-4 origin-center sm:origin-top-right"
              role="dialog"
              aria-label="Choose month and year"
            >
              {/* Header: Year Navigator + Mobile Close Button */}
              <div className="flex items-center justify-between pb-3 border-b border-surface-subtle">
                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y - 1)}
                  className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors active:scale-95"
                  title="Previous year"
                  aria-label="Previous year"
                >
                  <FiChevronLeft size={18} />
                </button>

                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    className="appearance-none bg-surface-muted hover:bg-surface-subtle text-ink font-semibold text-sm py-1 pl-3 pr-7 rounded-lg border border-surface-subtle focus:ring-2 focus:ring-accent-500 focus:outline-none cursor-pointer transition-colors"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedYear((y) => y + 1)}
                    className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors active:scale-95"
                    title="Next year"
                    aria-label="Next year"
                  >
                    <FiChevronRight size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="sm:hidden ml-1 p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
                    title="Close"
                    aria-label="Close"
                  >
                    <FiX size={18} />
                  </button>
                </div>
              </div>

              {/* Body: Months Grid */}
              <div className="grid grid-cols-3 gap-2.5 py-3.5">
                {MONTHS.map((m, index) => {
                  const monthNum = index + 1;
                  const isSelected = currentMonth === monthNum && currentYear === selectedYear;
                  const isCurrentRealMonth =
                    realCurrentMonth === monthNum && realCurrentYear === selectedYear;

                  return (
                    <button
                      key={m.short}
                      type="button"
                      onClick={() => handleMonthSelect(index)}
                      className={`relative py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 flex flex-col items-center justify-center select-none active:scale-95 ${
                        isSelected
                          ? 'bg-accent-600 text-white font-semibold shadow-sm scale-[1.02]'
                          : isCurrentRealMonth
                          ? 'bg-accent-50 text-accent-800 font-semibold border border-accent-200 hover:bg-accent-100'
                          : 'text-ink hover:bg-surface-muted hover:text-brand-900'
                      }`}
                    >
                      <span>{m.short}</span>
                      {isCurrentRealMonth && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-600 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer: Quick Actions */}
              <div className="pt-3 border-t border-surface-subtle flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1.5 text-ink-muted hover:text-ink font-medium rounded-lg hover:bg-surface-muted transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleThisMonth}
                  className="px-3.5 py-1.5 bg-accent-50 hover:bg-accent-100 text-accent-700 font-semibold rounded-lg transition-colors flex items-center gap-1.5 active:scale-95"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-600 animate-pulse" />
                  This month
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MonthPicker;
