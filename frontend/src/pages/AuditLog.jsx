import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import {
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  X
} from 'lucide-react';

const inputStyle = {
  backgroundColor: 'var(--bg-secondary)',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

const cardStyle = {
  backgroundColor: 'var(--bg-card)',
  borderColor: 'var(--border-color)',
};

// Format date for display
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// Get action badge color
const getActionColor = (action) => {
  if (!action) return { bg: 'var(--bg-secondary)', text: 'var(--text-secondary)' };

  const actionLower = action.toLowerCase();
  if (actionLower.includes('create') || actionLower.includes('upload') || actionLower.includes('generated')) {
    return { bg: '#dcfce7', text: '#166534' }; // Green
  }
  if (actionLower.includes('delete') || actionLower.includes('cleanup')) {
    return { bg: '#fee2e2', text: '#991b1b' }; // Red
  }
  if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('modify')) {
    return { bg: '#fef3c7', text: '#92400e' }; // Yellow
  }
  return { bg: '#dbeafe', text: '#1e40af' }; // Blue (default)
};

// Get entity type display name
const getEntityTypeDisplay = (entityType) => {
  const typeMap = {
    'ProcessInstance': 'Folyamat',
    'Document': 'Dokumentum',
    'Email': 'Email',
    'ChatConversation': 'Chat',
    'ChatMessage': 'Üzenet',
    'Idea': 'Ötlet',
    'PythonScript': 'Script',
    'AuditLog': 'Audit',
    'AppSetting': 'Beállítás',
    'StatusDefinition': 'Státusz',
  };
  return typeMap[entityType] || entityType || '-';
};

// Try to parse and format JSON details
const formatDetails = (details) => {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return details;
  }
};

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter options
  const [actionOptions, setActionOptions] = useState([]);
  const [entityTypeOptions, setEntityTypeOptions] = useState([]);

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const loadFilterOptions = useCallback(async () => {
    try {
      const [actionsRes, entityTypesRes] = await Promise.all([
        api.get('/v1/audit-log/actions'),
        api.get('/v1/audit-log/entity-types'),
      ]);
      setActionOptions(actionsRes.data || []);
      setEntityTypeOptions(entityTypesRes.data || []);
    } catch {
      // Silently fail
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (actionFilter) params.append('action', actionFilter);
      if (entityTypeFilter) params.append('entity_type', entityTypeFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('skip', String(page * pageSize));
      params.append('limit', String(pageSize));

      const [logsRes, countRes] = await Promise.all([
        api.get(`/v1/audit-log?${params.toString()}`),
        api.get(`/v1/audit-log/count?${params.toString()}`),
      ]);

      setLogs(logsRes.data || []);
      setTotalCount(countRes.data?.count || 0);
    } catch (err) {
      toast.error('Hiba az audit log betöltésekor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, actionFilter, entityTypeFilter, searchQuery, page]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (actionFilter) params.append('action', actionFilter);
      if (entityTypeFilter) params.append('entity_type', entityTypeFilter);

      const response = await api.post(`/v1/audit-log/export?${params.toString()}`, null, {
        responseType: 'blob',
      });

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = `audit_log.${format === 'csv' ? 'csv' : 'xlsx'}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Audit log exportálva (${format.toUpperCase()})`);
    } catch (err) {
      toast.error('Hiba az exportálás során');
      console.error(err);
    }
  };

  const handleClearFilters = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    setStartDate(date.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setActionFilter('');
    setEntityTypeFilter('');
    setSearchQuery('');
    setPage(0);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Audit Log
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Rendszeresemények és műveletek nyomon követése
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadLogs()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded border transition-colors hover:bg-opacity-80"
            style={inputStyle}
            title="Frissítés"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="relative group">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              <Download size={16} />
              Export
              <ChevronDown size={16} />
            </button>
            <div
              className="absolute right-0 mt-1 py-1 rounded shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10"
              style={{ ...cardStyle, minWidth: '150px' }}
            >
              <button
                onClick={() => handleExport('excel')}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-80"
                style={{ color: 'var(--text-primary)' }}
              >
                <FileSpreadsheet size={16} className="text-green-600" />
                Excel (.xlsx)
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-80"
                style={{ color: 'var(--text-primary)' }}
              >
                <FileText size={16} className="text-blue-600" />
                CSV (.csv)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-lg p-4 border"
        style={cardStyle}
      >
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Szűrők
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
              className="flex-1 px-3 py-2 rounded border text-sm"
              style={inputStyle}
            />
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-secondary)' }}>-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
              className="flex-1 px-3 py-2 rounded border text-sm"
              style={inputStyle}
            />
          </div>

          {/* Action filter */}
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 rounded border text-sm"
            style={inputStyle}
          >
            <option value="">Minden művelet</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>

          {/* Entity type filter */}
          <select
            value={entityTypeFilter}
            onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 rounded border text-sm"
            style={inputStyle}
          >
            <option value="">Minden entitás</option>
            {entityTypeOptions.map((type) => (
              <option key={type} value={type}>{getEntityTypeDisplay(type)}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-secondary)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Keresés részletekben..."
              className="w-full pl-9 pr-3 py-2 rounded border text-sm"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Filter actions */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {totalCount} bejegyzés találva
          </span>
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-sm hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            <X size={14} />
            Szűrők törlése
          </button>
        </div>
      </div>

      {/* Log table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={cardStyle}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Időpont
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Művelet
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Entitás
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Részletek
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <RefreshCw className="animate-spin mx-auto mb-2" size={24} style={{ color: 'var(--text-secondary)' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Betöltés...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                    Nincs találat a megadott szűrőkkel
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const actionColor = getActionColor(log.action);
                  const formattedDetails = formatDetails(log.details);
                  const isJson = formattedDetails !== log.details;

                  return (
                    <>
                      <tr
                        key={log.id}
                        className="border-t cursor-pointer hover:bg-opacity-50 transition-colors"
                        style={{ borderColor: 'var(--border-color)' }}
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <td className="px-4 py-3">
                          {log.details && (
                            isExpanded ? (
                              <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
                            ) : (
                              <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
                            )
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: actionColor.bg,
                              color: actionColor.text,
                            }}
                          >
                            {log.action || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                          {getEntityTypeDisplay(log.entity_type)}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {log.entity_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm max-w-md truncate" style={{ color: 'var(--text-secondary)' }}>
                          {log.details ? (
                            <span title={log.details}>
                              {log.details.substring(0, 80)}{log.details.length > 80 ? '...' : ''}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                      {isExpanded && log.details && (
                        <tr key={`${log.id}-details`} style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <td colSpan={6} className="px-4 py-3">
                            <div className="text-sm">
                              <div className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                Részletek:
                              </div>
                              <pre
                                className="p-3 rounded overflow-x-auto text-xs"
                                style={{
                                  backgroundColor: 'var(--bg-card)',
                                  color: 'var(--text-secondary)',
                                  whiteSpace: isJson ? 'pre' : 'pre-wrap',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {formattedDetails}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalCount)} / {totalCount}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={inputStyle}
              >
                Előző
              </button>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={inputStyle}
              >
                Következő
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
