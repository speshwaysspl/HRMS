// src/utils/AnnouncementHelper.js
import axios from "axios";
import { API_BASE } from "./apiConfig";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchAnnouncements = async () => {
  try {
    const res = await axios.get(`${API_BASE}/api/announcement`, { headers: getAuthHeaders() });
    if (res.data.success) {
      // backend already returns imageUrl and createdAt; still normalize
      return res.data.announcements.map((a) => ({
        ...a,
        imageUrl: a.imageUrl || (a.image ? `${API_BASE}/uploads/announcements/${a.image}` : null),
      }));
    }
    return [];
  } catch (err) {
    console.error("fetchAnnouncements error", err);
    return [];
  }
};
