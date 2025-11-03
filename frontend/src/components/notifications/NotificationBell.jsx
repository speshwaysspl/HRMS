import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { formatDMY } from '../../utils/dateUtils';

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

    // Navigate based on notification type and user role
    const navigateToNotificationTarget = () => {
      if (!user || !user.role) return;

      const isAdmin = user.role === 'admin';
      const isEmployee = user.role === 'employee';

      switch (notification.type) {
        case 'leave_request':
          if (isAdmin) {
            // Admin should go to leave management page
            navigate('/admin-dashboard/leaves');
          } else if (isEmployee) {
            // Employee should go to their leave history
            navigate(`/employee-dashboard/leaves/${user._id}`);
          }
          break;

        case 'leave_approved':
        case 'leave_rejected':
          if (isEmployee) {
            // Employee should go to their leave history to see the status
            navigate(`/employee-dashboard/leaves/${user._id}`);
          } else if (isAdmin) {
            // Admin should go to leave management page
            navigate('/admin-dashboard/leaves');
          }
          break;

        case 'announcement':
          if (isAdmin) {
            // Admin should go to announcement management
            if (notification.relatedId) {
              navigate(`/admin-dashboard/announcements/${notification.relatedId}`);
            } else {
              navigate('/admin-dashboard/announcements');
            }
          } else if (isEmployee) {
            // Employee should go to announcement details or list
            if (notification.relatedId) {
              navigate(`/employee-dashboard/announcements/${notification.relatedId}`);
            } else {
              navigate('/employee-dashboard/announcements');
            }
          }
          break;
          
        case 'feedback_submitted':
          if (isAdmin) {
            // Admin should go to feedback management page
            navigate('/admin-dashboard/feedback');
          }
          break;
          
        case 'feedback_response':
          if (isEmployee) {
            // Employee should go to their feedback page
            navigate('/employee-dashboard/feedback');
          }
          break;

        default:
          // For unknown notification types, navigate to dashboard
          if (isAdmin) {
            navigate('/admin-dashboard');
          } else if (isEmployee) {
            navigate('/employee-dashboard');
          }
          break;
      }
    };

    // Close the dropdown and navigate
    setIsOpen(false);
    navigateToNotificationTarget();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'leave_request':
        return '📝';
      case 'leave_approved':
        return '✅';
      case 'leave_rejected':
        return '❌';
      case 'announcement':
        return '📢';
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
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors duration-200"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  <span>Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-sm text-red-600 hover:text-red-800 flex items-center space-x-1"
                  title="Clear all notifications"
                >
                  <Trash2 size={14} />
                  <span>Clear all</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-150 ${
                    !notification.isRead ? 'bg-blue-50' : ''
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
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                        {notification.senderId && (
                          <p className="text-xs text-gray-500">
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
          {notifications.length > 10 && (
            <div className="px-4 py-3 border-t border-gray-200 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-800">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;