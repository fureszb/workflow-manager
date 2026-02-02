import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';

const pageTitle = {
  '/': 'Dashboard',
  '/processes': 'Folyamatok',
  '/emails': 'Email Menedzsment',
  '/documents': 'Dokumentumok',
  '/chat': 'AI Chat',
  '/ideas': 'Ötletek & Javítások',
  '/statistics': 'Statisztikák',
  '/settings': 'Beállítások',
  '/audit-log': 'Előzmények',
  '/scripts': 'Python Scriptek',
  '/token-monitor': 'Token Monitor',
  '/knowledge': 'Tudásbázis',
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentTitle = pageTitle[location.pathname] || 'WorkFlow Manager';

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navbar */}
        <TopNavbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          pageTitle={currentTitle}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
