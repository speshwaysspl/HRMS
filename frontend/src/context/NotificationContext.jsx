import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE } from '../utils/apiConfig';
import { registerWebPush } from '../utils/webPush';

// Add notification sound
const notificationSound = new Audio('/notification-sound.mp3');

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
  // Other screens subscribe to live data events (e.g. "team:updated") through useSocketEvent.
  const listenersRef = useRef(new Map());

  // Initialize socket connection
  useEffect(() => {
    let isMounted = true;
    if (user && user._id) {
      // Create socket connection
      import('socket.io-client').then(({ io }) => {
        if (!isMounted) return;

        socketRef.current = io(API_BASE, {
          withCredentials: true,
          transports: ['websocket', 'polling']
        });

        const socket = socketRef.current;
        socket.onAny((event, ...args) => {
          listenersRef.current.get(event)?.forEach((fn) => fn(...args));
        });

        socket.on('connect', () => {
          if (!isMounted) return;
          setIsConnected(true);
          // Join user's personal notification room
          socket.emit('join', user._id);
        });

        socket.on('disconnect', () => {
          if (!isMounted) return;
          setIsConnected(false);
        });

        // Listen for new notifications
        socket.on('newNotification', (notification) => {
          if (!isMounted) return;
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show popup notification
          showPopupNotification(notification);
          
          // Request notification permission on first notification if not already set
          if (("Notification" in window) && Notification.permission === "default") {
            Notification.requestPermission();
          }
        });

        socket.on('connect_error', (error) => {
          if (!isMounted) return;
          setIsConnected(false);
        });
      });

      return () => {
        isMounted = false;
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user]);

  // Show popup notification
  const showPopupNotification = (notification) => {
    // Play notification sound
    try {
      notificationSound.play().catch(err => console.log("Error playing sound:", err));
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }

    // Check if browser notifications are supported
    if (!("Notification" in window)) {
      console.log("This browser does not support system notifications");
      // Fall back to in-app notification
      showInAppNotification(notification);
      return;
    }

    // Check if permission is already granted
    if (Notification.permission === "granted") {
      createNotification(notification);
    } 
    // Otherwise, request permission
    else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          createNotification(notification);
        } else {
          // Fall back to in-app notification if permission denied
          showInAppNotification(notification);
        }
      });
    } else {
      // Fall back to in-app notification if permission denied
      showInAppNotification(notification);
    }
  };

  // Create the actual notification
  const createNotification = (notification) => {
    const title = notification.title || "New Notification";
    const options = {
      body: notification.message || "",
      icon: "/images/Logo.jpg",
      tag: notification._id, // Unique identifier for the notification
      requireInteraction: true, // Keep notification visible until user interacts with it
      silent: false // Ensure browser plays its own sound too
    };

    try {
      const systemNotification = new Notification(title, options);
      
      // Handle notification click
      systemNotification.onclick = () => {
        window.focus(); // Focus on the window
        // Trigger the notification bell dropdown to open
        window.dispatchEvent(new Event('triggerNotificationBell'));
      };
    } catch (error) {
      console.error("Error creating system notification:", error);
      showInAppNotification(notification);
    }
  };
  
  // Show in-app popup notification as fallback
  const showInAppNotification = (notification) => {
    // Create a temporary popup element
    const popup = document.createElement('div');
    popup.className = 'notification-popup';
    popup.innerHTML = `
      <div class="notification-popup-content">
        <div class="notification-popup-header">
          <h4>${notification.title || 'New Notification'}</h4>
          <button class="notification-popup-close">&times;</button>
        </div>
        <p>${notification.message || ''}</p>
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
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
      opacity: 1;
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

    // Add animation styles to document if not already present
    if (!document.getElementById('notification-animations')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'notification-animations';
      styleSheet.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(styleSheet);
    }

    // Add to DOM
    document.body.appendChild(popup);

    // Add click event to close button
    const closeButton = popup.querySelector('.notification-popup-close');
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      margin-left: 8px;
    `;
    
    closeButton.addEventListener('click', () => {
      popup.style.animation = 'fadeOut 0.3s forwards';
      setTimeout(() => {
        if (document.body.contains(popup)) {
          document.body.removeChild(popup);
        }
      }, 300);
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(popup)) {
        popup.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => {
          if (document.body.contains(popup)) {
            document.body.removeChild(popup);
          }
        }, 300);
      }
    }, 5000);
  };

  // Fetch initial notifications and register this browser for push
  useEffect(() => {
    if (user && user._id) {
      fetchNotifications();
      registerWebPush();
    }
  }, [user]);

  // A push notification clicked while a tab is open: open the bell dropdown.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e) => {
      if (e.data?.type === 'open-notifications') window.dispatchEvent(new Event('triggerNotificationBell'));
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

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
      // Silently handle error - notifications will remain empty
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
      // Silently handle error - notification will remain unread
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
      // Silently handle error - notifications will remain unread
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
      // Silently handle error - notifications will remain
    }
  };

  const subscribe = React.useCallback((event, fn) => {
    const map = listenersRef.current;
    if (!map.has(event)) map.set(event, new Set());
    map.get(event).add(fn);
    return () => map.get(event)?.delete(fn);
  }, []);

  const value = {
    subscribe,
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
// Runs `handler` whenever the server emits `event`. Handler may change between renders.
export const useSocketEvent = (event, handler) => {
  const { subscribe } = useNotifications();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribe(event, (...args) => ref.current(...args)), [event, subscribe]);
};

// Re-runs `refetch` when the server reports a write to any of `resources`
// (e.g. ["leave", "attendance"]). Bursts are collapsed into one refetch.
export const useLiveData = (resources, refetch, delay = 600) => {
  const ref = useRef(refetch);
  ref.current = refetch;
  const timer = useRef(null);
  const key = [].concat(resources).join(",");
  useEffect(() => () => clearTimeout(timer.current), []);
  useSocketEvent("data:changed", (e) => {
    if (!e?.resource || !key.split(",").includes(e.resource)) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => ref.current?.(), delay);
  });
};

// Same trigger as useLiveData, as a counter — add it to a useEffect's deps when
// the loader lives inside that effect.
export const useLiveTick = (resources) => {
  const [tick, setTick] = useState(0);
  useLiveData(resources, () => setTick((t) => t + 1));
  return tick;
};
