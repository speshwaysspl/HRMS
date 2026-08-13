import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { formatDMY } from '../../utils/dateUtils';
import { getNotificationTarget } from '../../utils/notificationNavigation';
import { getDashboardBasePath } from '../../utils/roleRoutes';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAllNotifications } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Event listener for external triggers to open notification dropdown
  useEffect(() => {
    const handleTriggerNotificationBell = () => {
      setIsOpen(true);
    };
    
    window.addEventListener('triggerNotificationBell', handleTriggerNotificationBell);
    
    return () => {
      window.removeEventListener('triggerNotificationBell', handleTriggerNotificationBell);
    };
  }, []);

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    setIsOpen(false);
    const target = getNotificationTarget(notification, user);
    if (target) navigate(target);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'leave_request':
        return '📝';
      case 'leave_approved':
        return '✅';
      case 'leave_rejected':
        return '❌';
      case 'holiday':
      case 'meeting':
      case 'event':
        return '📅';
      case 'announcement':
        return '📢';
      case 'task_assigned':
      case 'task_updated':
      case 'task_submitted':
        return '📋';
      case 'feedback_submitted':
        return '📋';
      case 'feedback_response':
        return '💬';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'leave_request':
        return 'bg-blue-50 border-blue-200';
      case 'leave_approved':
        return 'bg-green-50 border-green-200';
      case 'leave_rejected':
        return 'bg-red-50 border-red-200';
      case 'holiday':
        return 'bg-yellow-50 border-yellow-200';
      case 'announcement':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return formatDMY(notificationDate);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-ink-muted hover:text-ink hover:bg-surface-muted rounded-full transition-colors duration-150"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-accent-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[20rem] sm:w-80 bg-white rounded-xl shadow-panel border border-surface-subtle z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-surface-subtle flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-ink">Notifications</h3>
            <div className="flex items-center gap-3 flex-wrap">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  <span>Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-xs font-medium text-ink-muted hover:text-ink flex items-center gap-1"
                  title="Clear all notifications"
                >
                  <Trash2 size={14} />
                  <span>Clear all</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-ink-faint hover:text-ink-muted"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-ink-muted">
                <Bell size={32} className="mx-auto mb-2 text-ink-faint" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b border-surface-subtle cursor-pointer hover:bg-surface-muted transition-colors duration-150 ${
                    !notification.isRead ? 'bg-brand-50/60' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Notification Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <span className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </span>
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-ink truncate">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-accent-500 rounded-full flex-shrink-0 ml-2"></div>
                        )}
                      </div>
                      <p className="text-sm text-ink-muted mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-ink-faint">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                        {notification.senderId && (
                          <p className="text-xs text-ink-faint">
                            From: {notification.senderId.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-surface-subtle text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate(`${getDashboardBasePath(user?.role)}/notifications`);
              }}
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
