import { NavLink } from 'react-router-dom';
import { useTheme } from '../../store/ThemeContext';
import { Sun, Moon, Bell, Settings, PanelLeftClose, PanelLeft } from 'lucide-react';

const mainMenuItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/processes', label: 'Folyamatok' },
  { path: '/emails', label: 'Emailek' },
  { path: '/documents', label: 'Dokumentumok' },
  { path: '/chat', label: 'Chat' },
];

const TopNavbar = ({ onSidebarToggle, sidebarOpen }) => {
  const { theme, toggleTheme } = useTheme();

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

          <button
            className="p-2 rounded-lg hover:bg-gray-500/10 transition-colors relative"
            style={{ color: 'var(--text-primary)' }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--danger)' }}
            />
          </button>

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
