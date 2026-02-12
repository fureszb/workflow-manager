import { useEffect, useRef, useCallback, useState } from 'react';
import toast from 'react-hot-toast';

/**
 * WebSocket event types
 */
export const WS_EVENTS = {
  SCRIPT_OUTPUT: 'script.output',
  SCRIPT_STATUS: 'script.status',
  CHAT_STREAM: 'chat.stream',
  NOTIFICATION: 'notification',
  PST_IMPORT_PROGRESS: 'pst_import.progress',
};

/**
 * Custom hook for WebSocket connection with auto-reconnect
 * @param {Object} options - Hook options
 * @param {function} options.onMessage - Callback for handling messages
 * @param {number} options.reconnectInterval - Reconnect interval in ms (default: 3000)
 * @param {number} options.maxReconnectAttempts - Max reconnect attempts (default: 10)
 * @param {boolean} options.showToasts - Show toast notifications for events (default: true)
 * @param {boolean} options.browserNotifications - Show browser notifications (default: false)
 * @returns {Object} WebSocket utilities
 */
export function useWebSocket({
  onMessage,
  reconnectInterval = 3000,
  maxReconnectAttempts = 10,
  showToasts = true,
  browserNotifications = false,
} = {}) {
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Get WebSocket URL
  const getWsUrl = useCallback(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsHost = apiUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '');
    return `${wsProtocol}//${wsHost}/ws`;
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((title, body, options = {}) => {
    if (!browserNotifications || Notification.permission !== 'granted') {
      return;
    }
    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        ...options,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.actionUrl) {
          window.location.href = options.actionUrl;
        }
      };
    } catch {
      // Silently fail for browsers that don't support notifications
    }
  }, [browserNotifications]);

  // Handle incoming messages
  const handleMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);
      const { type, data } = message;

      // Handle notifications with toast and browser notifications
      if (type === WS_EVENTS.NOTIFICATION && data) {
        const { message: msg, level, title, action_url } = data;

        // Show toast
        if (showToasts) {
          const toastOptions = {
            duration: level === 'error' ? 5000 : 4000,
          };
          switch (level) {
            case 'success':
              toast.success(msg, toastOptions);
              break;
            case 'error':
              toast.error(msg, toastOptions);
              break;
            case 'warning':
              toast(msg, { ...toastOptions, icon: '\u26a0\ufe0f' });
              break;
            default:
              toast(msg, toastOptions);
          }
        }

        // Show browser notification
        if (browserNotifications) {
          showBrowserNotification(title || 'Workflow Manager', msg, { actionUrl: action_url });
        }
      }

      // Call custom message handler
      if (onMessage) {
        onMessage(message);
      }
    } catch {
      // Ignore invalid JSON
    }
  }, [onMessage, showToasts, browserNotifications, showBrowserNotification]);

  // Send message to server
  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  // Start ping interval for keep-alive
  const startPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    pingIntervalRef.current = setInterval(() => {
      send({ type: 'ping' });
    }, 30000); // Ping every 30 seconds
  }, [send]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    const wsUrl = getWsUrl();

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        startPingInterval();
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }

        // Auto-reconnect logic
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          setConnectionStatus('reconnecting');

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setConnectionStatus('failed');
        }
      };

      ws.onerror = () => {
        // Error will trigger onclose, so we don't need to do much here
      };
    } catch {
      setConnectionStatus('failed');
    }
  }, [getWsUrl, handleMessage, maxReconnectAttempts, reconnectInterval, startPingInterval]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      // Prevent auto-reconnect
      reconnectAttempts.current = maxReconnectAttempts;
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, [maxReconnectAttempts]);

  // Manual reconnect (resets attempt counter)
  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    disconnect();
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Request notification permission if browserNotifications is enabled
  useEffect(() => {
    if (browserNotifications) {
      requestNotificationPermission();
    }
  }, [browserNotifications, requestNotificationPermission]);

  return {
    isConnected,
    connectionStatus,
    send,
    reconnect,
    disconnect,
    requestNotificationPermission,
  };
}

export default useWebSocket;
