import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Search,
  CheckCircle,
  Clock,
  FolderOpen,
  X,
} from 'lucide-react';

const cardStyle = {
  backgroundColor: 'var(--bg-card)',
  borderColor: 'var(--border-color)',
};

const ProcessArchive = () => {
  const navigate = useNavigate();

  // Data state
  const [years, setYears] = useState([]);
  const [expandedYears, setExpandedYears] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(null); // { year, month }
  const [monthTasks, setMonthTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Load years with summaries
  const loadYears = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/monthly-tasks/archive/years');
      setYears(res.data);
    } catch {
      toast.error('Hiba az archívum betöltésekor!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadYears();
  }, [loadYears]);

  // Toggle year expansion
  const toggleYear = (year) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  // Load tasks for a specific month
  const loadMonthTasks = async (year, month) => {
    setSelectedMonth({ year, month });
    setLoadingTasks(true);
    setShowSearchResults(false);
    try {
      const res = await api.get(`/v1/monthly-tasks/archive/years/${year}/months/${month}`);
      setMonthTasks(res.data);
    } catch {
      toast.error('Hiba a havi feladatok betöltésekor!');
    } finally {
      setLoadingTasks(false);
    }
  };

  // Search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowSearchResults(true);
    setSelectedMonth(null);
    try {
      const res = await api.get('/v1/monthly-tasks/archive/search', {
        params: { q: searchQuery },
      });
      setSearchResults(res.data);
    } catch {
      toast.error('Hiba a keresés során!');
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Navigate to task detail
  const goToTask = (task) => {
    navigate(`/processes/${task.process_type_id || 1}/tasks/${task.id}`);
  };

  // Calculate yearly totals
  const getTotalYearlyStats = () => {
    let totalTasks = 0;
    let totalCompleted = 0;
    years.forEach((y) => {
      totalTasks += y.total_tasks;
      totalCompleted += y.total_completed;
    });
    return { totalTasks, totalCompleted };
  };

  const { totalTasks, totalCompleted } = getTotalYearlyStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Archívum
        </h1>

        {/* Search bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Keresés a folyamatokban..."
              className="pl-10 pr-8 py-2 rounded-lg border w-64"
              style={{
                ...cardStyle,
                color: 'var(--text-primary)',
              }}
              data-testid="archive-search-input"
            />
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-secondary)' }}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-500/10"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim()}
            className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            data-testid="archive-search-btn"
          >
            Keresés
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {!loading && years.length > 0 && (
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          data-testid="archive-summary"
        >
          <div className="rounded-lg border p-4" style={cardStyle}>
            <div className="flex items-center gap-3">
              <Calendar size={24} style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Archivált évek
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {years.length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-4" style={cardStyle}>
            <div className="flex items-center gap-3">
              <Clock size={24} style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Összes feladat
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {totalTasks}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-4" style={cardStyle}>
            <div className="flex items-center gap-3">
              <CheckCircle size={24} style={{ color: '#22c55e' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Befejezett
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {totalCompleted}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Year/Month tree */}
        <div
          className="lg:col-span-1 rounded-lg border p-4"
          style={cardStyle}
          data-testid="archive-tree"
        >
          <h2
            className="text-lg font-semibold mb-4 flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <FolderOpen size={20} />
            Év / Hónap
          </h2>

          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Betöltés...</p>
          ) : years.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Nincs archivált folyamat.</p>
          ) : (
            <div className="space-y-2">
              {years.map((yearData) => (
                <div key={yearData.year} data-testid={`archive-year-${yearData.year}`}>
                  {/* Year header */}
                  <button
                    onClick={() => toggleYear(yearData.year)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-500/10 transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {expandedYears[yearData.year] ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                    <span className="font-medium">{yearData.year}</span>
                    <span
                      className="ml-auto text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {yearData.total_completed}/{yearData.total_tasks}
                    </span>
                  </button>

                  {/* Months list */}
                  {expandedYears[yearData.year] && (
                    <div className="ml-6 mt-1 space-y-1">
                      {yearData.months.map((monthData) => {
                        const isSelected =
                          selectedMonth?.year === yearData.year &&
                          selectedMonth?.month === monthData.month;
                        return (
                          <button
                            key={monthData.month}
                            onClick={() => loadMonthTasks(yearData.year, monthData.month)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                              isSelected ? 'ring-2' : 'hover:bg-gray-500/10'
                            }`}
                            style={{
                              color: 'var(--text-primary)',
                              backgroundColor: isSelected ? 'var(--bg-secondary)' : 'transparent',
                              '--tw-ring-color': 'var(--accent)',
                            }}
                            data-testid={`archive-month-${yearData.year}-${monthData.month}`}
                          >
                            <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
                            <span>{monthData.month_name}</span>
                            <span
                              className="ml-auto text-sm"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {monthData.completed_count}/{monthData.task_count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks display / Search results */}
        <div
          className="lg:col-span-2 rounded-lg border p-4"
          style={cardStyle}
          data-testid="archive-content"
        >
          {showSearchResults ? (
            <>
              <h2
                className="text-lg font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Keresési eredmények: &quot;{searchQuery}&quot;
              </h2>

              {isSearching ? (
                <p style={{ color: 'var(--text-secondary)' }}>Keresés...</p>
              ) : searchResults.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>
                  Nincs találat a keresésre.
                </p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => goToTask(result)}
                      className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:ring-2 transition-colors"
                      style={{
                        ...cardStyle,
                        '--tw-ring-color': 'var(--accent)',
                      }}
                      data-testid={`search-result-${result.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-medium"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {result.process_type_name}
                          </span>
                          <span
                            className="text-sm"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {result.year}. {result.month < 10 ? `0${result.month}` : result.month}
                          </span>
                        </div>
                        {result.notes && (
                          <p
                            className="text-sm mt-1 line-clamp-1"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {result.notes}
                          </p>
                        )}
                      </div>
                      {result.status_name && (
                        <span
                          className="px-2 py-1 rounded text-xs text-white"
                          style={{ backgroundColor: result.status_color || '#6b7280' }}
                        >
                          {result.status_name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : selectedMonth ? (
            <>
              <h2
                className="text-lg font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                {selectedMonth.year}. {selectedMonth.month < 10 ? `0${selectedMonth.month}` : selectedMonth.month}
                {' '}hónap folyamatai
              </h2>

              {loadingTasks ? (
                <p style={{ color: 'var(--text-secondary)' }}>Betöltés...</p>
              ) : monthTasks.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>
                  Nincs folyamat ebben a hónapban.
                </p>
              ) : (
                <div className="space-y-2">
                  {monthTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => goToTask(task)}
                      className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:ring-2 transition-colors"
                      style={{
                        ...cardStyle,
                        '--tw-ring-color': 'var(--accent)',
                      }}
                      data-testid={`month-task-${task.id}`}
                    >
                      <div className="flex-1">
                        <span
                          className="font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {task.process_type?.name || 'Ismeretlen folyamat'}
                        </span>
                        {task.notes && (
                          <p
                            className="text-sm mt-1 line-clamp-1"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {task.notes}
                          </p>
                        )}
                      </div>
                      {task.status && (
                        <span
                          className="px-2 py-1 rounded text-xs text-white"
                          style={{ backgroundColor: task.status.color || '#6b7280' }}
                        >
                          {task.status.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FolderOpen
                size={48}
                className="mx-auto mb-4"
                style={{ color: 'var(--text-secondary)' }}
              />
              <p style={{ color: 'var(--text-secondary)' }}>
                Válassz egy hónapot a bal oldali listából, vagy keress rá egy folyamatra.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessArchive;
