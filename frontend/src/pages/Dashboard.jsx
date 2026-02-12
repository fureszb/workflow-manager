import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ClipboardList,
  Mail,
  FolderOpen,
  MessageSquare,
  Lightbulb,
  Play,
  GripVertical,
  RefreshCw,
} from 'lucide-react';
import api from '../utils/api';

// Sortable Widget Component
const SortableWidget = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="relative group">
        <div
          {...listeners}
          className="absolute top-2 right-2 p-1 rounded cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-10"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <GripVertical size={16} style={{ color: 'var(--text-secondary)' }} />
        </div>
        {children}
      </div>
    </div>
  );
};

// Stat Card Widget
const StatCard = ({ title, value, subValue, icon: Icon, color, description, onClick }) => (
  <div
    className="rounded-lg p-6 border hover:shadow-lg transition-all duration-200 cursor-pointer"
    style={{
      backgroundColor: 'var(--bg-card)',
      borderColor: 'var(--border-color)',
    }}
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-4">
      <div
        className="p-3 rounded-lg"
        style={{ backgroundColor: color + '20' }}
      >
        <Icon size={24} style={{ color }} />
      </div>
      <div className="text-right">
        <div
          className="text-3xl font-bold"
          style={{ color }}
        >
          {value}
        </div>
        {subValue !== undefined && (
          <div
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            / {subValue}
          </div>
        )}
      </div>
    </div>
    <h3
      className="font-semibold mb-1"
      style={{ color: 'var(--text-primary)' }}
    >
      {title}
    </h3>
    <p
      className="text-sm"
      style={{ color: 'var(--text-secondary)' }}
    >
      {description}
    </p>
  </div>
);

// Recent Activity Item
const ActivityItem = ({ activity }) => {
  const typeIcons = {
    process: ClipboardList,
    email: Mail,
    document: FolderOpen,
    chat: MessageSquare,
    script: Play,
  };
  const typeColors = {
    process: 'var(--accent)',
    email: 'var(--warning)',
    document: 'var(--success)',
    chat: 'var(--accent)',
    script: 'var(--info)',
  };

  const Icon = typeIcons[activity.type] || ClipboardList;
  const color = typeColors[activity.type] || 'var(--text-secondary)';

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'most';
    if (diffMins < 60) return `${diffMins} perce`;
    if (diffHours < 24) return `${diffHours} órája`;
    if (diffDays < 7) return `${diffDays} napja`;
    return date.toLocaleDateString('hu-HU');
  };

  return (
    <div
      className="flex items-center gap-3 py-3 border-b last:border-b-0"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <div
        className="p-2 rounded-lg"
        style={{ backgroundColor: color + '15' }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {activity.text}
        </p>
      </div>
      <span
        className="text-xs whitespace-nowrap"
        style={{ color: 'var(--text-secondary)' }}
      >
        {formatTime(activity.timestamp)}
      </span>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [widgetOrder, setWidgetOrder] = useState([
    'active_processes',
    'unread_emails',
    'documents',
    'chat_sessions',
    'ideas',
    'scripts',
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/v1/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLayoutOrder = async () => {
    try {
      const response = await api.get('/v1/dashboard/layout');
      if (response.data && response.data.length > 0) {
        // Sort by x, then y position to get the order
        const sortedWidgets = [...response.data]
          .filter(w => w.is_visible)
          .sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
          })
          .map(w => w.widget_id);
        if (sortedWidgets.length > 0) {
          setWidgetOrder(sortedWidgets);
        }
      }
    } catch (error) {
      console.error('Error fetching layout:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchLayoutOrder();
  }, []);

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Save new layout to backend
        const layoutData = newOrder.map((widgetId, index) => ({
          widget_id: widgetId,
          x: index % 3,
          y: Math.floor(index / 3),
          w: 1,
          h: 1,
        }));

        api.post('/v1/dashboard/layout/batch', layoutData).catch(err => {
          console.error('Error saving layout:', err);
        });

        return newOrder;
      });
    }
  };

  const handleGenerateMonthlyTasks = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    setIsGenerating(true);
    setGenerateMessage(null);

    try {
      const response = await api.post('/v1/monthly-tasks/generate', { year, month });
      setGenerateMessage({
        type: 'success',
        text: `${response.data.created_count || 0} feladat létrehozva (${year}/${String(month).padStart(2, '0')})`,
      });
      // Refresh dashboard data
      fetchDashboardData();
    } catch (error) {
      setGenerateMessage({
        type: 'error',
        text: 'Hiba történt a feladatok generálása során.',
      });
      console.error('Error generating monthly tasks:', error);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerateMessage(null), 5000);
    }
  };

  const stats = dashboardData?.stats || {};

  const widgetConfigs = {
    active_processes: {
      title: 'Aktív Folyamatok',
      value: stats.active_processes || 0,
      subValue: stats.total_processes || 0,
      icon: ClipboardList,
      color: 'var(--accent)',
      description: 'Folyamatban lévő munkafolyamatok',
      onClick: () => navigate('/processes'),
    },
    unread_emails: {
      title: 'Olvasatlan Emailek',
      value: stats.unread_emails || 0,
      subValue: stats.total_emails || 0,
      icon: Mail,
      color: 'var(--warning)',
      description: `${stats.high_importance_emails || 0} fontos email`,
      onClick: () => navigate('/emails'),
    },
    documents: {
      title: 'Dokumentumok',
      value: stats.total_documents || 0,
      subValue: undefined,
      icon: FolderOpen,
      color: 'var(--success)',
      description: `${stats.knowledge_documents || 0} tudásbázisban`,
      onClick: () => navigate('/documents'),
    },
    chat_sessions: {
      title: 'AI Chat',
      value: stats.chat_sessions_today || 0,
      subValue: stats.total_chat_sessions || 0,
      icon: MessageSquare,
      color: 'var(--accent)',
      description: 'Mai chat munkamenetek',
      onClick: () => navigate('/chat'),
    },
    ideas: {
      title: 'Ötletek',
      value: stats.active_ideas || 0,
      subValue: stats.total_ideas || 0,
      icon: Lightbulb,
      color: '#f59e0b',
      description: 'Aktív ötletek és javaslatok',
      onClick: () => navigate('/ideas'),
    },
    scripts: {
      title: 'Scriptek',
      value: stats.scripts_count || 0,
      subValue: undefined,
      icon: Play,
      color: 'var(--info)',
      description: `${stats.recent_script_runs || 0} futtatás az elmúlt héten`,
      onClick: () => navigate('/scripts'),
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div
        className="rounded-lg p-6 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          WorkFlow Manager
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Itt áttekintheti a projektek és folyamatok állapotát. A widgeteket áthúzással átrendezheti.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={handleGenerateMonthlyTasks}
            disabled={isGenerating}
            className="px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
            }}
          >
            {isGenerating ? 'Generálás...' : 'Új hónap indítása'}
          </button>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            <RefreshCw size={16} />
            Frissítés
          </button>
          {generateMessage && (
            <span
              className="text-sm"
              style={{
                color: generateMessage.type === 'success' ? 'var(--success)' : 'var(--error)',
              }}
            >
              {generateMessage.text}
            </span>
          )}
        </div>
      </div>

      {/* Draggable Stats grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgetOrder.map((widgetId) => {
              const config = widgetConfigs[widgetId];
              if (!config) return null;
              return (
                <SortableWidget key={widgetId} id={widgetId}>
                  <StatCard {...config} />
                </SortableWidget>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Recent activity */}
      <div
        className="rounded-lg p-6 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Legutóbbi Tevékenységek
        </h2>
        <div>
          {dashboardData?.recent_activities?.length > 0 ? (
            dashboardData.recent_activities.map((activity, index) => (
              <ActivityItem key={index} activity={activity} />
            ))
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>
              Nincs még rögzített tevékenység.
            </p>
          )}
        </div>
      </div>

      {/* Current month processes summary */}
      {dashboardData?.current_month_processes?.length > 0 && (
        <div
          className="rounded-lg p-6 border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Aktuális Havi Feladatok
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dashboardData.current_month_processes.slice(0, 6).map((process) => (
              <div
                key={process.id}
                className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                }}
                onClick={() => navigate(`/processes?task=${process.id}`)}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-medium truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {process.process_type?.name || 'Ismeretlen'}
                  </span>
                  {process.status && (
                    <span
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: process.status.color + '20',
                        color: process.status.color,
                      }}
                    >
                      {process.status.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {dashboardData.current_month_processes.length > 6 && (
            <button
              onClick={() => navigate('/processes')}
              className="mt-4 text-sm font-medium"
              style={{ color: 'var(--accent)' }}
            >
              + {dashboardData.current_month_processes.length - 6} további feladat
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
