import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { ChevronLeft, ChevronRight, Filter, Plus, GripVertical } from 'lucide-react';

const MONTH_NAMES = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December',
];

const cardStyle = {
  backgroundColor: 'var(--bg-card)',
  borderColor: 'var(--border-color)',
};

const Processes = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isArchive = searchParams.get('view') === 'archive';

  // Current date state for month navigation
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Data state
  const [statuses, setStatuses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [processTypes, setProcessTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterStatusId, setFilterStatusId] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Drag state
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverStatusId, setDragOverStatusId] = useState(null);

  // Load statuses
  const loadStatuses = useCallback(async () => {
    try {
      const res = await api.get('/v1/statuses');
      setStatuses(res.data);
    } catch {
      toast.error('Hiba a státuszok betöltésekor!');
    }
  }, []);

  // Load process types
  const loadProcessTypes = useCallback(async () => {
    try {
      const res = await api.get('/v1/processes');
      setProcessTypes(res.data);
    } catch {
      toast.error('Hiba a folyamatok betöltésekor!');
    }
  }, []);

  // Load tasks for the current month
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { year, month };
      if (filterStatusId) {
        params.status_id = filterStatusId;
      }
      const res = await api.get('/v1/monthly-tasks', { params });
      setTasks(res.data);
    } catch {
      toast.error('Hiba a feladatok betöltésekor!');
    } finally {
      setLoading(false);
    }
  }, [year, month, filterStatusId]);

  useEffect(() => {
    loadStatuses();
    loadProcessTypes();
  }, [loadStatuses, loadProcessTypes]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Month navigation
  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  // Generate tasks for current month
  const handleGenerateTasks = async () => {
    try {
      const res = await api.post('/v1/monthly-tasks/generate', { year, month });
      toast.success(res.data.message);
      loadTasks();
    } catch {
      toast.error('Hiba a feladatok generálásakor!');
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, statusId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatusId(statusId);
  };

  const handleDragLeave = () => {
    setDragOverStatusId(null);
  };

  const handleDrop = async (e, newStatusId) => {
    e.preventDefault();
    setDragOverStatusId(null);

    if (!draggedTask || draggedTask.status_id === newStatusId) {
      setDraggedTask(null);
      return;
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggedTask.id
          ? { ...t, status_id: newStatusId, status: statuses.find((s) => s.id === newStatusId) }
          : t
      )
    );

    try {
      await api.put(`/v1/monthly-tasks/${draggedTask.id}`, { status_id: newStatusId });
      toast.success('Státusz frissítve!');
    } catch {
      toast.error('Hiba a státusz frissítésekor!');
      loadTasks(); // Revert on error
    }

    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverStatusId(null);
  };

  // Get tasks for a specific status
  const getTasksForStatus = (statusId) => {
    return tasks.filter((t) => t.status_id === statusId);
  };

  // Get tasks without status
  const getUnassignedTasks = () => {
    return tasks.filter((t) => !t.status_id);
  };

  // Archive view - show all past months
  if (isArchive) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Archívum
        </h1>
        <div
          className="rounded-lg p-8 border text-center"
          style={cardStyle}
        >
          <p style={{ color: 'var(--text-secondary)' }}>
            Az archívum nézet fejlesztés alatt áll.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Havi Folyamatok
        </h1>

        <div className="flex items-center gap-4">
          {/* Month Navigator */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg border"
            style={cardStyle}
            data-testid="month-navigator"
          >
            <button
              onClick={goToPrevMonth}
              className="p-1 rounded hover:bg-gray-500/10 transition-colors"
              style={{ color: 'var(--text-primary)' }}
              data-testid="prev-month-btn"
            >
              <ChevronLeft size={20} />
            </button>
            <span
              className="font-medium min-w-[140px] text-center"
              style={{ color: 'var(--text-primary)' }}
              data-testid="current-month-display"
            >
              {year}. {MONTH_NAMES[month - 1]}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-1 rounded hover:bg-gray-500/10 transition-colors"
              style={{ color: 'var(--text-primary)' }}
              data-testid="next-month-btn"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                filterStatusId ? 'ring-2 ring-offset-2' : ''
              }`}
              style={{
                ...cardStyle,
                color: 'var(--text-primary)',
                ringColor: 'var(--accent)',
              }}
              data-testid="filter-btn"
            >
              <Filter size={18} />
              <span>Szűrés</span>
            </button>

            {showFilterMenu && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-lg border shadow-lg z-10"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                }}
                data-testid="filter-menu"
              >
                <button
                  onClick={() => {
                    setFilterStatusId(null);
                    setShowFilterMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-500/10 transition-colors"
                  style={{
                    color: !filterStatusId ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                >
                  Mind
                </button>
                {statuses.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => {
                      setFilterStatusId(status.id);
                      setShowFilterMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-500/10 transition-colors flex items-center gap-2"
                    style={{
                      color: filterStatusId === status.id ? 'var(--accent)' : 'var(--text-primary)',
                    }}
                    data-testid={`filter-status-${status.id}`}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    {status.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Generate Tasks Button */}
          <button
            onClick={handleGenerateTasks}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            data-testid="generate-tasks-btn"
          >
            <Plus size={18} />
            <span>Feladatok generálása</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div
          className="rounded-lg p-8 border text-center"
          style={cardStyle}
        >
          <p style={{ color: 'var(--text-secondary)' }}>Betöltés...</p>
        </div>
      ) : statuses.length === 0 ? (
        <div
          className="rounded-lg p-8 border text-center"
          style={cardStyle}
        >
          <p style={{ color: 'var(--text-secondary)' }}>
            Nincsenek státuszok definiálva. Hozz létre státuszokat a Beállítások oldalon!
          </p>
        </div>
      ) : (
        <div
          className="flex gap-4 overflow-x-auto pb-4"
          style={{ minHeight: '500px' }}
          data-testid="kanban-board"
        >
          {statuses.map((status) => {
            const statusTasks = getTasksForStatus(status.id);
            const isDropTarget = dragOverStatusId === status.id;

            return (
              <div
                key={status.id}
                className="flex-shrink-0 w-72"
                onDragOver={(e) => handleDragOver(e, status.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status.id)}
                data-testid={`kanban-column-${status.id}`}
              >
                {/* Column Header */}
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-t-lg border-b"
                  style={{
                    backgroundColor: status.color,
                    borderColor: status.color,
                  }}
                >
                  <span className="font-semibold text-white">{status.name}</span>
                  <span
                    className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                    }}
                  >
                    {statusTasks.length}
                  </span>
                </div>

                {/* Column Body */}
                <div
                  className={`min-h-[400px] p-2 rounded-b-lg border border-t-0 space-y-2 transition-colors ${
                    isDropTarget ? 'ring-2 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    ringColor: 'var(--accent)',
                  }}
                >
                  {statusTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => navigate(`/processes/${task.process_type_id}/tasks/${task.id}`)}
                      className={`p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-opacity hover:ring-2 hover:ring-offset-1 ${
                        draggedTask?.id === task.id ? 'opacity-50' : ''
                      }`}
                      style={{ ...cardStyle, '--tw-ring-color': 'var(--accent)' }}
                      data-testid={`task-card-${task.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical
                          size={16}
                          className="flex-shrink-0 mt-0.5"
                          style={{ color: 'var(--text-secondary)' }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4
                            className="font-medium truncate"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {task.process_type?.name || 'Ismeretlen folyamat'}
                          </h4>
                          {task.notes && (
                            <p
                              className="text-sm mt-1 line-clamp-2"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {task.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {statusTasks.length === 0 && (
                    <div
                      className="flex items-center justify-center h-24 rounded-lg border-2 border-dashed"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <p
                        className="text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Üres
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Unassigned tasks column (if any) */}
          {getUnassignedTasks().length > 0 && (
            <div className="flex-shrink-0 w-72">
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-t-lg border-b"
                style={{
                  backgroundColor: '#9ca3af',
                  borderColor: '#9ca3af',
                }}
              >
                <span className="font-semibold text-white">Nincs státusz</span>
                <span
                  className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                  }}
                >
                  {getUnassignedTasks().length}
                </span>
              </div>
              <div
                className="min-h-[400px] p-2 rounded-b-lg border border-t-0 space-y-2"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                {getUnassignedTasks().map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onClick={() => navigate(`/processes/${task.process_type_id}/tasks/${task.id}`)}
                    className={`p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-opacity hover:ring-2 hover:ring-offset-1 ${
                      draggedTask?.id === task.id ? 'opacity-50' : ''
                    }`}
                    style={{ ...cardStyle, '--tw-ring-color': 'var(--accent)' }}
                    data-testid={`task-card-${task.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical
                        size={16}
                        className="flex-shrink-0 mt-0.5"
                        style={{ color: 'var(--text-secondary)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4
                          className="font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {task.process_type?.name || 'Ismeretlen folyamat'}
                        </h4>
                        {task.notes && (
                          <p
                            className="text-sm mt-1 line-clamp-2"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {task.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close filter menu */}
      {showFilterMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowFilterMenu(false)}
        />
      )}
    </div>
  );
};

export default Processes;
