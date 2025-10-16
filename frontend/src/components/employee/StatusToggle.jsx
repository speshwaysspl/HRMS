import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../../utils/apiConfig';

const StatusToggle = ({ employeeId, currentStatus, onStatusChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(currentStatus || 'active');

  // Sync local status with prop changes
  React.useEffect(() => {
    if (currentStatus && currentStatus !== status) {
      setStatus(currentStatus);
    }
  }, [currentStatus]);

  // Debug logging
  React.useEffect(() => {
    console.log(`StatusToggle for employee ${employeeId}: currentStatus=${currentStatus}, status=${status}`);
  }, [employeeId, currentStatus, status]);

  const handleToggle = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    setIsLoading(true);
    const newStatus = status === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await axios.patch(
        `${API_BASE}/api/employee/${employeeId}/status`,
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
        }
      );
      
      if (response.data.success) {
        setStatus(newStatus);
        if (onStatusChange) {
          onStatusChange(employeeId, newStatus);
        }
        console.log(`Status updated successfully: ${newStatus}`);
      } else {
        console.error('Failed to update status:', response.data.error);
        alert('Failed to update status: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, status, onStatusChange, isLoading]);

  const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
  const isActive = status === 'active';

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 
        border-2 min-w-[80px] text-center shadow-sm
        ${isActive 
          ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200 hover:border-green-400 hover:shadow-md' 
          : 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200 hover:border-red-400 hover:shadow-md'
        }
        ${isLoading 
          ? 'opacity-60 cursor-not-allowed' 
          : 'cursor-pointer hover:scale-105 transform'
        }
      `}
      type="button"
      title={`Click to ${isActive ? 'deactivate' : 'activate'} employee`}
    >
      {isLoading ? 'Updating...' : displayStatus}
    </button>
  );
};

export default StatusToggle;