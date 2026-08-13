import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiBell, FiCheckCircle } from "react-icons/fi";
import { API_BASE } from "../utils/apiConfig";
import { useAuth } from "../context/AuthContext";
import { NOTIFICATION_GROUPS, getNotificationTarget } from "../utils/notificationNavigation";
import { formatDMY } from "../utils/dateUtils";
import useMeta from "../utils/useMeta";
import EmptyState from "../components/common/EmptyState";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";

const TABS = ["All", ...Object.keys(NOTIFICATION_GROUPS)];

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  useMeta({
    title: "Notifications — Speshway HRMS",
    description: "View and manage all your notifications.",
    robots: "noindex,nofollow",
  });

  const [activeTab, setActiveTab] = useState("All");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPage = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (activeTab !== "All") {
        params.set("types", NOTIFICATION_GROUPS[activeTab].join(","));
      }
      if (unreadOnly) params.set("isRead", "false");

      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE}/api/notifications/user/${user._id}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(response.data.notifications || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [user, page, activeTab, unreadOnly]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, unreadOnly]);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.put(
        `${API_BASE}/api/notifications/read/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      // silent
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.put(
        `${API_BASE}/api/notifications/read-all/${user._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      // silent
    }
  };

  const handleClick = (notification) => {
    if (!notification.isRead) markAsRead(notification._id);
    const target = getNotificationTarget(notification, user);
    if (target) navigate(target);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-semibold text-ink flex items-center gap-2">
          <FiBell className="text-brand-700" /> Notifications
        </h2>
        <button
          onClick={markAllAsRead}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <FiCheckCircle size={16} /> Mark all as read
        </button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-brand-800 text-white"
                  : "bg-white border border-surface-subtle text-ink-muted hover:bg-surface-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="h-4 w-4 rounded border-surface-subtle text-accent-600 focus:ring-accent-500"
          />
          Unread only
        </label>
      </div>

      <div className="bg-white border border-surface-subtle rounded-xl shadow-card divide-y divide-surface-subtle">
        {loading ? (
          <LoadingState message="Loading notifications…" />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchPage} />
        ) : notifications.length === 0 ? (
          <EmptyState icon={FiBell} title="No notifications" message="You're all caught up." />
        ) : (
          notifications.map((notification) => (
            <div
              key={notification._id}
              onClick={() => handleClick(notification)}
              className={`p-4 cursor-pointer hover:bg-surface-muted transition-colors ${
                !notification.isRead ? "bg-accent-50/40" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-ink">{notification.title}</p>
                {!notification.isRead && (
                  <span className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0 mt-1.5" />
                )}
              </div>
              <p className="text-sm text-ink-muted mt-1">{notification.message}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-ink-faint">{formatDMY(notification.createdAt)}</p>
                {notification.senderId?.name && (
                  <p className="text-xs text-ink-faint">From: {notification.senderId.name}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-surface-subtle bg-white text-ink hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-ink-muted">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-surface-subtle bg-white text-ink hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
