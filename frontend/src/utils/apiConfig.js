// src/utils/apiConfig.js

// Export the API base URL with the new port 5001
export const API_BASE = import.meta.env.VITE_API_URL ;

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};