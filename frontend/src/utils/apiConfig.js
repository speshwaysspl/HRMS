// src/utils/apiConfig.js

// Export the API base URL, falling back to local backend if env is not set
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};