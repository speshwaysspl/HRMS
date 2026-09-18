// src/utils/AnnouncementHelper.js
import axios from "axios";
import { API_BASE } from "./apiConfig";

const getAuthHeaders = () => {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchAnnouncements = async () => {
  try {
    const res = await axios.get(`${API_BASE}/api/announcement`, { headers: getAuthHeaders() });
    if (res.data.success) {
      // backend already returns imageUrl and createdAt; still normalize
      return res.data.announcements.map((a) => {
        const raw = a.imageUrl || a.image;
        let imgUrl = null;
        if (raw) {
          imgUrl = (raw.startsWith('http://') || raw.startsWith('https://'))
            ? raw
            : `${API_BASE}/${raw.replace(/^\//, '')}`;
        }
        return {
          ...a,
          imageUrl: imgUrl,
        };
      });
    }
    return [];
  } catch (err) {
    return [];
  }
};
