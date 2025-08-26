import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../../utils/apiConfig';

const StatusToggle = ({ employeeId, currentStatus, onStatusChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(currentStatus || 'active');

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
      } else {
        console.error('Failed to update status:', response.data.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
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
        px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 
        border-2 min-w-[70px] text-center
        ${isActive 
          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300' 
          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300'
        }
        ${isLoading 
          ? 'opacity-60 cursor-not-allowed' 
          : 'cursor-pointer hover:shadow-sm'
        }
      `}
      type="button"
    >
      {isLoading ? 'Updating...' : displayStatus}
    </button>
  );
};

export default StatusToggle;