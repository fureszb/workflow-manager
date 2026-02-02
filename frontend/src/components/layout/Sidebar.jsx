import { NavLink } from 'react-router-dom';
import { useState } from 'react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: '🏠' },
  { path: '/processes', label: 'Folyamatok', icon: '📋' },
  { path: '/emails', label: 'Email Menedzsment', icon: '✉️' },
  { path: '/documents', label: 'Dokumentumok', icon: '📁' },
  { path: '/chat', label: 'AI Chat', icon: '💬' },
  { path: '/ideas', label: 'Ötletek & Javítások', icon: '💡' },
  { path: '/statistics', label: 'Statisztikák', icon: '📊' },
  { path: '/settings', label: 'Beállítások', icon: '⚙️' },
  { path: '/audit-log', label: 'Előzmények', icon: '📜' },
  { path: '/scripts', label: 'Python Scriptek', icon: '💻' },
  { path: '/token-monitor', label: 'Token Monitor', icon: '🪙' },
  { path: '/knowledge', label: 'Tudásbázis', icon: '🧠' },
];

const Sidebar = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ backgroundColor: 'var(--bg-sidebar)' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-sidebar)' }}>
              WorkFlow Manager
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => window.innerWidth < 1024 && onClose()}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'font-semibold'
                          : 'hover:bg-opacity-10 hover:bg-white'
                      }`
                    }
                    style={({ isActive }) => ({
                      backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                      color: isActive ? 'white' : 'var(--text-sidebar)',
                    })}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-sm text-center opacity-60" style={{ color: 'var(--text-sidebar)' }}>
              v1.0.0
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
