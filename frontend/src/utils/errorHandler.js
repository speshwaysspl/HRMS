/**
 * Utility function to handle common API error responses
 * @param {Error} error - The error object from axios
 * @param {string} defaultMessage - Default message to show if no specific error message
 */
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  if (error.response && !error.response.data.success) {
    alert(error.response.data.error || defaultMessage);
  } else {
    alert(defaultMessage);
  }
};

/**
 * Utility function to check if an API response was successful
 * @param {Object} response - The response object from axios
 * @returns {boolean} - Whether the response was successful
 */
export const isApiSuccess = (response) => {
  return response.data && response.data.success;
};