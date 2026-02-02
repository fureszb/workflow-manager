import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Mail, FileText, MessageSquare,
  Lightbulb, BarChart3, Code, Coins, BookOpen, ScrollText,
  Calendar, Archive, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const sidebarMenuItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    path: '/processes',
    label: 'Folyamatok',
    icon: ClipboardList,
    subItems: [
      { path: '/processes', label: 'Havi nézet', icon: Calendar },
      { path: '/processes?view=archive', label: 'Archívum', icon: Archive },
    ],
  },
  {
    path: '/emails',
    label: 'Emailek',
    icon: Mail,
  },
  {
    path: '/documents',
    label: 'Dokumentumok',
    icon: FileText,
  },
  {
    path: '/chat',
    label: 'Chat',
    icon: MessageSquare,
  },
  {
    path: '/ideas',
    label: 'Ötletek',
    icon: Lightbulb,
  },
  {
    path: '/statistics',
    label: 'Statisztikák',
    icon: BarChart3,
  },
  {
    path: '/scripts',
    label: 'Scriptek',
    icon: Code,
  },
  {
    path: '/token-monitor',
    label: 'Token Monitor',
    icon: Coins,
  },
  {
    path: '/knowledge',
    label: 'Tudásbázis',
    icon: BookOpen,
  },
  {
    path: '/audit-log',
    label: 'Audit Log',
    icon: ScrollText,
  },
];

const Sidebar = ({ isOpen }) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState([]);

  const toggleExpand = (path) => {
    setExpandedItems((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const isItemActive = (item) => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  };

  return (
    <aside
      className={`
        ${isOpen ? 'w-64' : 'w-0'}
        transition-all duration-300 ease-in-out overflow-hidden
        border-r flex-shrink-0
      `}
      style={{
        backgroundColor: 'var(--bg-sidebar)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex flex-col h-full w-64">
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {sidebarMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = expandedItems.includes(item.path) || (active && hasSubItems);

              return (
                <li key={item.path}>
                  <div className="flex items-center">
                    <NavLink
                      to={item.path}
                      end={item.path === '/' || !hasSubItems}
                      className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: active ? 'var(--accent)' : 'transparent',
                        color: active ? 'white' : 'var(--text-sidebar)',
                      }}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                    {hasSubItems && (
                      <button
                        onClick={() => toggleExpand(item.path)}
                        className="p-1 rounded hover:bg-gray-500/10 transition-colors"
                        style={{ color: 'var(--text-sidebar)' }}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    )}
                  </div>
                  {hasSubItems && isExpanded && (
                    <ul className="ml-6 mt-1 space-y-1">
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const subActive = location.pathname + location.search === sub.path;
                        return (
                          <li key={sub.path}>
                            <NavLink
                              to={sub.path}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
                              style={{
                                backgroundColor: subActive ? 'var(--accent)' : 'transparent',
                                color: subActive ? 'white' : 'var(--text-sidebar)',
                                opacity: subActive ? 1 : 0.8,
                              }}
                            >
                              <SubIcon size={14} />
                              <span>{sub.label}</span>
                            </NavLink>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-xs text-center opacity-50" style={{ color: 'var(--text-sidebar)' }}>
            v1.0.0
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
