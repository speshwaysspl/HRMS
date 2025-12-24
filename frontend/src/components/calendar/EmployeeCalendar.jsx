import React, { useState } from 'react';
import Calendar from './Calendar';
import HolidayList from './HolidayList';
import { motion } from 'framer-motion';

const EmployeeCalendar = () => {
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="text-2xl font-bold text-gray-800">Company Calendar</h3>
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg relative">
            {['calendar', 'list'].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors z-10 ${
                        activeTab === tab ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    {activeTab === tab && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-white rounded-md shadow-sm"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            style={{ zIndex: -1 }}
                        />
                    )}
                    {tab === 'calendar' ? 'Calendar View' : 'Holiday List'}
                </button>
            ))}
        </div>
      </div>
      
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'calendar' ? (
            <Calendar isAdmin={false} />
        ) : (
            <HolidayList isAdmin={false} />
        )}
      </motion.div>
    </div>
  );
};

export default EmployeeCalendar;
