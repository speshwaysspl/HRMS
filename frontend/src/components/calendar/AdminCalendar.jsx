import React, { useState } from 'react';
import Calendar from './Calendar';
import HolidayList from './HolidayList';

const AdminCalendar = () => {
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <div className="p-6 bg-surface-muted min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="text-2xl font-semibold text-brand-800">Calendar Manager</h3>
        <div className="flex space-x-1 bg-white border border-surface-subtle p-1 rounded-lg shadow-card">
            <button
                className={`px-4 py-2 rounded-md text-sm transition-colors ${activeTab === 'calendar' ? 'bg-accent-600 text-white font-medium' : 'text-ink-muted hover:text-ink hover:bg-surface-muted'}`}
                onClick={() => setActiveTab('calendar')}
            >
                Calendar View
            </button>
            <button
                className={`px-4 py-2 rounded-md text-sm transition-colors ${activeTab === 'list' ? 'bg-accent-600 text-white font-medium' : 'text-ink-muted hover:text-ink hover:bg-surface-muted'}`}
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
