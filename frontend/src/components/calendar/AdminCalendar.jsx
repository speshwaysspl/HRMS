import React, { useState } from 'react';
import Calendar from './Calendar';
import HolidayList from './HolidayList';

const AdminCalendar = () => {
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="text-2xl font-bold text-gray-800">Calendar Manager</h3>
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
                className={`px-4 py-2 rounded-md text-sm transition-all ${activeTab === 'calendar' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                onClick={() => setActiveTab('calendar')}
            >
                Calendar View
            </button>
            <button
                className={`px-4 py-2 rounded-md text-sm transition-all ${activeTab === 'list' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                onClick={() => setActiveTab('list')}
            >
                Holiday List
            </button>
        </div>
      </div>
      
      {activeTab === 'calendar' ? (
        <Calendar isAdmin={true} />
      ) : (
        <HolidayList isAdmin={true} />
      )}
    </div>
  );
};

export default AdminCalendar;
