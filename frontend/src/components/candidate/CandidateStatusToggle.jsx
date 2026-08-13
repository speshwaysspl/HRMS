import React, { useState, useEffect, useCallback } from 'react';

const CandidateStatusToggle = ({ candidateId, currentIsActive, onStatusChange, isLoading }) => {
  // Treat undefined/null as true
  const [isActive, setIsActive] = useState(currentIsActive !== false);

  // Sync local state with prop changes
  useEffect(() => {
    setIsActive(currentIsActive !== false);
  }, [currentIsActive]);

  const handleToggle = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    const newIsActive = !isActive;
    
    if (onStatusChange) {
      onStatusChange(candidateId, newIsActive);
    }
  }, [candidateId, isActive, onStatusChange, isLoading]);

  const displayStatus = isActive ? 'Active' : 'Inactive';

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-150
        min-w-[80px] text-center
        ${isActive
          ? 'bg-accent-100 text-accent-700'
          : 'bg-red-100 text-red-700'
        }
        ${isLoading
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer'
        }
      `}
      type="button"
      title={`Click to ${isActive ? 'deactivate' : 'activate'} candidate account`}
    >
      {isLoading ? 'Updating...' : displayStatus}
    </button>
  );
};

export default CandidateStatusToggle;
