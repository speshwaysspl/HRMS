import axios from "axios";
import React, { createContext, useContext, useEffect, useState } from "react";
import { API_BASE } from "../utils/apiConfig";
import { unregisterWebPush } from "../utils/webPush";
import { clearQueryCache } from "../utils/queryStore";

const userContext = createContext();

// The last verified user's basic profile (id, name, email, role, no secrets),
// so a page refresh renders immediately instead of waiting on /verify. The
// server still authorizes every request; this only decides what UI to show.
const USER_KEY = "authUser";
const readCachedUser = () => {
  try {
    return localStorage.getItem("token") ? JSON.parse(localStorage.getItem(USER_KEY) || "null") : null;
  } catch {
    return null;
  }
};
const cacheUser = (u) => {
  try {
    if (!u) return localStorage.removeItem(USER_KEY);
    const { _id, name, email, role } = u;
    localStorage.setItem(USER_KEY, JSON.stringify({ _id, name, email, role }));
  } catch { /* storage unavailable: fall back to waiting for /verify */ }
};

const authContext = ({ children }) => {
  const [user, setUser] = useState(readCachedUser);
  // Only block rendering when there is a token but no cached profile yet.
  const [loading, setLoading] = useState(() => !!localStorage.getItem("token") && !readCachedUser());

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    // Other code reads the token from sessionStorage; set it before any fetch.
    sessionStorage.setItem("token", token);
    const verifyUser = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) {
          setUser(response.data.user);
          cacheUser(response.data.user);
        } else {
          signOutLocally();
        }
      } catch (error) {
        const status = error.response?.status;
        // Session rejected: sign out. Network/server hiccup: keep the cached
        // session so a refresh while offline still shows the app.
        if (status === 401 || status === 403 || status === 404) signOutLocally();
        else if (!readCachedUser()) setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verifyUser();
  }, []);

  const signOutLocally = () => {
    clearQueryCache();
    cacheUser(null);
    setUser(null);
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
  };

  const login = (user) => {
    clearQueryCache(); // never show a previous user's cached data
    cacheUser(user);
    setUser(user);
  };

  const logout = () => {
    unregisterWebPush(); // reads the auth token synchronously before it's cleared below
    signOutLocally();
  };
  return (
    <userContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </userContext.Provider>
  );
};

export const useAuth = () => useContext(userContext);
export default authContext;
