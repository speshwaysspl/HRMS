/**
 * Utility functions for handling dates and times in Indian Standard Time (IST)
 */

/**
 * Converts a Date object to IST date string in YYYY-MM-DD format
 * @param {Date} date - The date to convert
 * @returns {string} Date string in YYYY-MM-DD format in IST
 */
export const toISTDateString = (date) => {
  // Create a date object with the IST timezone offset (+5:30)
  const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  return istDate.toISOString().split('T')[0];
};

/**
 * Converts a Date object to IST time string in HH:MM format
 * @param {Date} date - The date to convert
 * @returns {string} Time string in HH:MM format in IST
 */
export const toISTTimeString = (date) => {
  // Create a date object with the IST timezone offset (+5:30)
  const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  const hours = istDate.getUTCHours().toString().padStart(2, '0');
  const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Gets the current date and time in IST
 * @returns {Date} Current date and time in IST
 */
export const getCurrentISTDateTime = () => {
  const now = new Date();
  return new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
};