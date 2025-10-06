import React, { useState, useRef, useEffect } from 'react';

const MonthPicker = ({ value, onChange, placeholder = "Select month and year" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const dropdownRef = useRef(null);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => thisYear - 5 + i);

  // Parse current value
  const parseValue = (val) => {
    if (!val) return { month: null, year: null };
    const [year, month] = val.split('-');
    return { month: parseInt(month), year: parseInt(year) };
  };

  const { month: currentMonth, year: currentYear } = parseValue(value);

  // Format display value
  const getDisplayValue = () => {
    if (!value) return placeholder;
    const { month, year } = parseValue(value);
    if (month && year) {
      return `${months[month - 1]}, ${year}`;
    }
    return placeholder;
  };

  // Handle month selection
  const handleMonthSelect = (monthIndex) => {
    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const newValue = `${selectedYear}-${monthStr}`;
    onChange(newValue);
    setIsOpen(false);
  };

  // Handle year change
  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  // Handle clear
  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Handle "This Month"
  const handleThisMonth = () => {
    const now = new Date();
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const newValue = `${now.getFullYear()}-${monthStr}`;
    onChange(newValue);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set initial year when component mounts or value changes
  useEffect(() => {
    if (currentYear) {
      setSelectedYear(currentYear);
    }
  }, [currentYear]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input Field */}
      <div
        className="w-full p-3 border border-gray-300 rounded-lg bg-white cursor-pointer flex items-center justify-between hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>
          {getDisplayValue()}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          {/* Year Selector */}
          <div className="p-3 border-b border-gray-200">
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded text-center font-medium"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Month Grid */}
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {months.map((month, index) => {
                const isSelected = currentMonth === index + 1 && currentYear === selectedYear;
                return (
                  <button
                    key={month}
                    onClick={() => handleMonthSelect(index)}
                    className={`p-2 text-sm rounded hover:bg-blue-50 transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'text-gray-700 hover:text-blue-600'
                    }`}
                  >
                    {month}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-3 border-t border-gray-200 flex justify-between">
            <button
              onClick={handleClear}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleThisMonth}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              This month
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthPicker;