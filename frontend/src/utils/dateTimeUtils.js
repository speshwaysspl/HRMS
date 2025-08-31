// src/utils/dateTimeUtils.js

/**
 * Utility functions for handling date and time conversions to Indian Standard Time (IST)
 */

/**
 * Converts a date string or Date object to IST date string in YYYY-MM-DD format
 * @param {Date|string} date - Date object or date string
 * @returns {string} Date string in YYYY-MM-DD format in IST
 */
export const toISTDateString = (date) => {
  // Create a date object if a string is provided
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Convert to IST by adding the offset (UTC+5:30)
  const istDate = new Date(dateObj.getTime() + (5.5 * 60 * 60 * 1000));
  
  // Format as YYYY-MM-DD
  return istDate.toISOString().split('T')[0];
};

/**
 * Converts a time string or gets current time in IST in HH:MM format
 * @param {string} [timeString] - Optional time string in HH:MM format
 * @returns {string} Time string in HH:MM format in IST
 */
export const toISTTimeString = (timeString) => {
  let hours, minutes;
  
  if (timeString) {
    // Parse the provided time string
    [hours, minutes] = timeString.split(':').map(Number);
    
    // Create a date object with the current date and the provided time
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    // Convert to IST
    const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    
    // Format as HH:MM using UTC methods to avoid timezone issues
    hours = istDate.getUTCHours();
    minutes = istDate.getUTCMinutes();
  } else {
    // Get current time in IST
    const now = new Date();
    const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    // Use UTC methods to get the correct IST time
    hours = istDate.getUTCHours();
    minutes = istDate.getUTCMinutes();
  }
  
  // Format with leading zeros
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Gets the current date and time in IST
 * @returns {Date} Date object representing current time in IST
 */
export const getCurrentISTDateTime = () => {
  const now = new Date();
  return new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
};

/**
 * Formats a date object to a localized date string in IST
 * @param {Date|string} date - Date object or date string
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatISTDate = (date, options = {}) => {
  // Default options for date formatting
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  // Create a date object if a string is provided
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Convert to IST
  const istDate = new Date(dateObj.getTime() + (5.5 * 60 * 60 * 1000));
  
  // Format using Intl.DateTimeFormat
  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(istDate);
};