import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket, WS_EVENTS } from '../hooks/useWebSocket';
import api from '../utils/api';

const WebSocketContext = createContext(null);

// Maximum notifications to keep in history
const MAX_NOTIFICATIONS = 50;

/**
 * WebSocket provider component that manages global WebSocket connection,
 * browser notification settings, toast notification settings, and notification history
 */
export function WebSocketProvider({ children }) {
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [toastNotificationsEnabled, setToastNotificationsEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [eventHandlers, setEventHandlers] = useState({});

  // Notification history for badge and dropdown
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationIdRef = useRef(0);

  // Load notification settings from API
  useEffect(() => {
    api.get('/v1/settings')
      .then((res) => {
        const browserEnabled = res.data?.browser_notifications === 'true';
        const toastEnabled = res.data?.toast_notifications !== 'false'; // Default to true
        setBrowserNotificationsEnabled(browserEnabled);
        setToastNotificationsEnabled(toastEnabled);
      })
      .catch(() => {
        // Silently fail, use defaults
      });
  }, []);

  // Add notification to history
  const addNotification = useCallback((notification) => {
    notificationIdRef.current += 1;
    const newNotification = {
      id: notificationIdRef.current,
      ...notification,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => {
      const updated = [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
      return updated;
    });
    setUnreadCount((prev) => prev + 1);
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === notificationId && !n.read) {
          setUnreadCount((count) => Math.max(0, count - 1));
          return { ...n, read: true };
        }
        return n;
      })
    );
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Custom message handler that dispatches to registered handlers and tracks notifications
  const handleMessage = useCallback((message) => {
    const { type, data } = message;

    // Track notification events in history
    if (type === WS_EVENTS.NOTIFICATION && data) {
      addNotification({
        message: data.message,
        level: data.level || 'info',
        title: data.title,
        actionUrl: data.action_url,
      });
    }

    const handlers = eventHandlers[type];
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch {
          // Silently ignore handler errors
        }
      });
    }
  }, [eventHandlers, addNotification]);

  const {
    isConnected,
    connectionStatus,
    send,
    reconnect,
    requestNotificationPermission,
  } = useWebSocket({
    onMessage: handleMessage,
    showToasts: toastNotificationsEnabled,
    browserNotifications: browserNotificationsEnabled && notificationPermission === 'granted',
  });

  // Subscribe to an event type
  const subscribe = useCallback((eventType, handler) => {
    setEventHandlers((prev) => ({
      ...prev,
      [eventType]: [...(prev[eventType] || []), handler],
    }));

    // Return unsubscribe function
    return () => {
      setEventHandlers((prev) => ({
        ...prev,
        [eventType]: (prev[eventType] || []).filter((h) => h !== handler),
      }));
    };
  }, []);

  // Enable browser notifications
  const enableBrowserNotifications = useCallback(async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationPermission('granted');
      setBrowserNotificationsEnabled(true);
      // Save setting to API
      try {
        await api.put('/v1/settings', { browser_notifications: 'true' });
      } catch {
        // Silently fail
      }
    }
    return granted;
  }, [requestNotificationPermission]);

  // Disable browser notifications
  const disableBrowserNotifications = useCallback(async () => {
    setBrowserNotificationsEnabled(false);
    // Save setting to API
    try {
      await api.put('/v1/settings', { browser_notifications: 'false' });
    } catch {
      // Silently fail
    }
  }, []);

  // Enable toast notifications
  const enableToastNotifications = useCallback(async () => {
    setToastNotificationsEnabled(true);
    try {
      await api.put('/v1/settings', { toast_notifications: 'true' });
    } catch {
      // Silently fail
    }
  }, []);

  // Disable toast notifications
  const disableToastNotifications = useCallback(async () => {
    setToastNotificationsEnabled(false);
    try {
      await api.put('/v1/settings', { toast_notifications: 'false' });
    } catch {
      // Silently fail
    }
  }, []);

  // Update permission state when it changes
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission);
    }
  }, [browserNotificationsEnabled]);

  const value = {
    // Connection state
    isConnected,
    connectionStatus,
    send,
    reconnect,
    subscribe,
    // Browser notifications
    browserNotificationsEnabled,
    notificationPermission,
    enableBrowserNotifications,
    disableBrowserNotifications,
    // Toast notifications
    toastNotificationsEnabled,
    enableToastNotifications,
    disableToastNotifications,
    // Notification history
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    clearNotifications,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook to access WebSocket context
 */
export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

// Re-export WS_EVENTS for convenience
export { WS_EVENTS };

export default WebSocketContext;
