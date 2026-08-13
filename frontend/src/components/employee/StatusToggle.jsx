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
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
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
        px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150
        min-w-[80px] text-center
        ${isActive
          ? 'bg-accent-100 text-accent-700 hover:bg-accent-200'
          : 'bg-red-100 text-red-700 hover:bg-red-200'
        }
        ${isLoading
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer'
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
