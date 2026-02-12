import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../../store/ThemeContext';
import { useWebSocketContext } from '../../store/WebSocketContext';
import { Sun, Moon, Bell, Settings, PanelLeftClose, PanelLeft, Check, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const mainMenuItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/processes', label: 'Folyamatok' },
  { path: '/emails', label: 'Emailek' },
  { path: '/documents', label: 'Dokumentumok' },
  { path: '/chat', label: 'Chat' },
];

// Get icon for notification level
const getNotificationIcon = (level) => {
  switch (level) {
    case 'success':
      return <CheckCircle size={16} className="text-green-500" />;
    case 'error':
      return <AlertCircle size={16} className="text-red-500" />;
    case 'warning':
      return <AlertTriangle size={16} className="text-yellow-500" />;
    default:
      return <Info size={16} className="text-blue-500" />;
  }
};

// Format relative time
const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Most';
  if (diffMins < 60) return `${diffMins} perce`;
  if (diffHours < 24) return `${diffHours} órája`;
  return `${diffDays} napja`;
};

const TopNavbar = ({ onSidebarToggle, sidebarOpen }) => {
  const { theme, toggleTheme } = useTheme();
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    clearNotifications,
  } = useWebSocketContext();

  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setShowNotifications(false);
    }
  };

  return (
    <header
      className="sticky top-0 z-30 border-b"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Logo + sidebar toggle */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <button
            onClick={onSidebarToggle}
            className="p-2 rounded-lg hover:bg-gray-500/10 transition-colors"
            style={{ color: 'var(--text-primary)' }}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
          </button>
          <span
            className="text-lg font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            WorkFlow Manager
          </span>
        </div>

        {/* Center: Main menu */}
        <nav className="flex items-center gap-1">
          {mainMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? ''
                    : 'hover:bg-gray-500/10'
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-secondary)',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 min-w-[200px] justify-end">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-500/10 transition-colors"
            style={{ color: 'var(--text-primary)' }}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Notifications dropdown */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg hover:bg-gray-500/10 transition-colors relative"
              style={{ color: 'var(--text-primary)' }}
              aria-label="Notifications"
              data-testid="notifications-button"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--danger)', fontSize: '10px', padding: '0 4px' }}
                  data-testid="notification-badge"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showNotifications && (
              <div
                className="absolute right-0 mt-2 w-80 rounded-lg shadow-lg border overflow-hidden"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  maxHeight: '400px',
                }}
                data-testid="notifications-dropdown"
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Értesítések
                  </h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs px-2 py-1 rounded hover:bg-gray-500/10 transition-colors"
                        style={{ color: 'var(--accent)' }}
                        title="Mind olvasottnak jelölése"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-xs px-2 py-1 rounded hover:bg-gray-500/10 transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        title="Mind törlése"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications list */}
                <div
                  className="overflow-y-auto"
                  style={{ maxHeight: '320px' }}
                >
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center" style={{ color: 'var(--text-secondary)' }}>
                      <Bell size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nincs értesítés</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition-colors hover:bg-gray-500/5 ${
                          !notification.read ? 'bg-blue-500/5' : ''
                        }`}
                        style={{ borderColor: 'var(--border-color)' }}
                        data-testid={`notification-item-${notification.id}`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.level)}
                        </div>
                        <div className="flex-1 min-w-0">
                          {notification.title && (
                            <p
                              className="text-sm font-medium truncate"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {notification.title}
                            </p>
                          )}
                          <p
                            className="text-sm"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {notification.message}
                          </p>
                          <p
                            className="text-xs mt-1"
                            style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
                          >
                            {formatRelativeTime(notification.timestamp)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                            style={{ backgroundColor: 'var(--accent)' }}
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `p-2 rounded-lg hover:bg-gray-500/10 transition-colors ${isActive ? 'bg-gray-500/10' : ''}`
            }
            style={{ color: 'var(--text-primary)' }}
            aria-label="Settings"
          >
            <Settings size={18} />
          </NavLink>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
