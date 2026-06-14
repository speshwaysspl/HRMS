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
      title={`Click to ${isActive ? 'deactivate' : 'activate'} candidate account`}
    >
      {isLoading ? 'Updating...' : displayStatus}
    </button>
  );
};

export default CandidateStatusToggle;
