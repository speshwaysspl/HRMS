import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE } from '../utils/apiConfig';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (user && user._id) {
      // Create socket connection
      socketRef.current = io(API_BASE, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('🔗 Connected to notification server');
        setIsConnected(true);
        // Join user's personal notification room
        console.log(`🏠 Joining notification room for user: ${user._id}`);
        socket.emit('join', user._id);
      });

      socket.on('disconnect', () => {
        console.log('❌ Disconnected from notification server');
        setIsConnected(false);
      });

      // Listen for new notifications
      socket.on('newNotification', (notification) => {
        console.log('🔔 New notification received:', notification);
        console.log('📝 Notification details:', {
          type: notification.type,
          title: notification.title,
          message: notification.message,
          from: notification.senderId?.name,
          to: notification.recipientId?.name
        });
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show popup notification
        showPopupNotification(notification);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  // Show popup notification
  const showPopupNotification = (notification) => {
    // Create a temporary popup element
    const popup = document.createElement('div');
    popup.className = 'notification-popup';
    popup.innerHTML = `
      <div class="notification-popup-content">
        <div class="notification-popup-header">
          <h4>${notification.title}</h4>
          <button class="notification-popup-close">&times;</button>
        </div>
        <p>${notification.message}</p>
      </div>
    `;

    // Add styles
    popup.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
    `;

    const content = popup.querySelector('.notification-popup-content');
    content.style.cssText = `
      padding: 16px;
    `;

    const header = popup.querySelector('.notification-popup-header');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const title = popup.querySelector('h4');
    title.style.cssText = `
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #1a202c;
    `;

    const message = popup.querySelector('p');
    message.style.cssText = `
      margin: 0;
      font-size: 14px;
      color: #4a5568;
      line-height: 1.4;
    `;

    const closeBtn = popup.querySelector('.notification-popup-close');
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #a0aec0;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Add animation keyframes
    if (!document.querySelector('#notification-popup-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-popup-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Close functionality
    const closePopup = () => {
      popup.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (popup.parentNode) {
          popup.parentNode.removeChild(popup);
        }
      }, 300);
    };

    closeBtn.addEventListener('click', closePopup);

    // Auto close after 5 seconds
    setTimeout(closePopup, 5000);

    document.body.appendChild(popup);
  };

  // Fetch initial notifications
  useEffect(() => {
    if (user && user._id) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/notifications/user/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/notifications/read/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif._id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/notifications/read-all/${user._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearNotification = (notificationId) => {
    setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
  };

  const clearAllNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/notifications/clear-all/${user._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotification,
    fetchNotifications,
    clearAllNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};