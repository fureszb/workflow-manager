import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const IMPORTANCE_OPTIONS = ['Alacsony', 'Közepes', 'Magas', 'Kritikus'];
const IMPORTANCE_COLORS = {
  'Alacsony': { bg: 'var(--bg-secondary)', text: 'var(--text-secondary)' },
  'Közepes': { bg: '#3b82f620', text: '#3b82f6' },
  'Magas': { bg: '#f59e0b20', text: '#f59e0b' },
  'Kritikus': { bg: '#ef444420', text: '#ef4444' },
};

const Emails = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [categorizing, setCategorizing] = useState(false);
  const [categorizationProgress, setCategorizationProgress] = useState(null);
  const [autoLinking, setAutoLinking] = useState(false);
  const [autoLinkProgress, setAutoLinkProgress] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [emailDetails, setEmailDetails] = useState(null);
  const [editingImportance, setEditingImportance] = useState(false);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [linkingTask, setLinkingTask] = useState(false);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);

  // Filter state
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    importance: '',
    category: '',
    search: '',
  });
  const [categories, setCategories] = useState([]);

  // Fetch emails on mount and when filters change
  useEffect(() => {
    fetchEmails();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchEmails();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [filters]);

  const connectWebSocket = useCallback(() => {
    // Connect directly to backend WebSocket (CORS is allowed)
    const wsUrl = import.meta.env.DEV ? 'ws://localhost:8000/ws' : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pst_import.progress') {
          setImportProgress(data.data);

          if (data.data.status === 'completed') {
            toast.success(`Import befejezve: ${data.data.imported} email importálva, ${data.data.skipped} kihagyva`);
            setImporting(false);
            fetchEmails();
          } else if (data.data.status === 'error') {
            toast.error(`Import hiba: ${data.data.message}`);
            setImporting(false);
          }
        } else if (data.type === 'email_categorization.progress') {
          setCategorizationProgress(data.data);

          if (data.data.status === 'completed') {
            toast.success(data.data.message);
            setCategorizing(false);
            fetchEmails();
            // Refresh details if an email is selected
            if (selectedEmail) {
              fetchEmailDetails(selectedEmail.id);
            }
          } else if (data.data.status === 'error') {
            toast.error(`Kategorizálás hiba: ${data.data.message}`);
            setCategorizing(false);
          }
        } else if (data.type === 'email_auto_link.progress') {
          setAutoLinkProgress(data.data);

          if (data.data.status === 'completed') {
            toast.success(data.data.message);
            setAutoLinking(false);
            fetchEmails();
            if (selectedEmail) {
              fetchEmailDetails(selectedEmail.id);
            }
          } else if (data.data.status === 'error') {
            toast.error(`Összerendelés hiba: ${data.data.message}`);
            setAutoLinking(false);
          }
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    wsRef.current.onclose = () => {
      setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          connectWebSocket();
        }
      }, 3000);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, []);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.dateFrom) params.append('date_from', new Date(filters.dateFrom).toISOString());
      if (filters.dateTo) params.append('date_to', new Date(filters.dateTo).toISOString());
      if (filters.importance) params.append('importance', filters.importance);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/v1/emails?${params.toString()}`);
      setEmails(response.data);

      // Extract unique categories from emails
      const uniqueCategories = [...new Set(response.data.map(e => e.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error('Hiba az emailek betöltésekor');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailDetails = async (emailId) => {
    try {
      setDetailsLoading(true);
      const response = await api.get(`/v1/emails/${emailId}`);
      setEmailDetails(response.data);
      setSelectedTaskId('');
    } catch (error) {
      console.error('Error fetching email details:', error);
      toast.error('Hiba az email részletek betöltésekor');
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchAvailableTasks = async () => {
    try {
      const response = await api.get('/v1/emails/available-tasks');
      setAvailableTasks(response.data);
    } catch (error) {
      console.error('Error fetching available tasks:', error);
    }
  };

  useEffect(() => {
    fetchAvailableTasks();
  }, []);

  const handleEmailClick = (email) => {
    if (selectedEmail?.id === email.id) {
      setSelectedEmail(null);
      setEmailDetails(null);
    } else {
      setSelectedEmail(email);
      fetchEmailDetails(email.id);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleAiCategorize = async () => {
    setCategorizing(true);
    setCategorizationProgress({
      status: 'processing',
      current: 0,
      total: 0,
      message: 'AI kategorizálás indítása...'
    });

    try {
      const response = await api.post('/v1/emails/auto-categorize');
      if (response.data.success) {
        toast.success(`Kategorizálás sikeres: ${response.data.categorized} email feldolgozva`);
      } else if (response.data.errors?.length > 0) {
        toast.error(`Kategorizálás részben sikeres: ${response.data.errors[0]}`);
      }
      fetchEmails();
    } catch (error) {
      console.error('Categorization error:', error);
      toast.error('Hiba a kategorizálás során: ' + (error.response?.data?.detail || error.message));
    } finally {
      setCategorizing(false);
    }
  };

  const handleAiAutoLink = async () => {
    setAutoLinking(true);
    setAutoLinkProgress({
      status: 'processing',
      current: 0,
      total: 0,
      message: 'AI feladat összerendelés indítása...'
    });

    try {
      const response = await api.post('/v1/emails/auto-link');
      if (response.data.success) {
        toast.success(`Összerendelés sikeres: ${response.data.linked} email összerendelve`);
      } else if (response.data.errors?.length > 0) {
        toast.error(`Összerendelés részben sikeres: ${response.data.errors[0]}`);
      }
      fetchEmails();
      if (selectedEmail) {
        fetchEmailDetails(selectedEmail.id);
      }
    } catch (error) {
      console.error('Auto-link error:', error);
      toast.error('Hiba az összerendelés során: ' + (error.response?.data?.detail || error.message));
    } finally {
      setAutoLinking(false);
    }
  };

  const handleLinkTask = async () => {
    if (!emailDetails || !selectedTaskId) return;

    setLinkingTask(true);
    try {
      await api.post(`/v1/emails/${emailDetails.id}/link-task`, {
        process_instance_id: parseInt(selectedTaskId)
      });
      toast.success('Feladat sikeresen hozzárendelve');
      fetchEmailDetails(emailDetails.id);
      setSelectedTaskId('');
    } catch (error) {
      console.error('Error linking task:', error);
      toast.error('Hiba a feladat hozzárendelésekor: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLinkingTask(false);
    }
  };

  const handleUnlinkTask = async (taskId) => {
    if (!emailDetails) return;

    try {
      await api.delete(`/v1/emails/${emailDetails.id}/unlink-task/${taskId}`);
      toast.success('Feladat összerendelés törölve');
      fetchEmailDetails(emailDetails.id);
    } catch (error) {
      console.error('Error unlinking task:', error);
      toast.error('Hiba a feladat összerendelés törlésekor');
    }
  };

  const handleImportanceChange = async (newImportance) => {
    if (!emailDetails) return;

    try {
      const response = await api.put(`/v1/emails/${emailDetails.id}/importance`, {
        importance: newImportance,
        ai_importance_reason: `Manuálisan módosítva: ${emailDetails.importance} → ${newImportance}`
      });
      setEmailDetails(response.data);
      setEditingImportance(false);
      fetchEmails();
      toast.success('Fontosság frissítve');
    } catch (error) {
      console.error('Error updating importance:', error);
      toast.error('Hiba a fontosság frissítésekor');
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pst')) {
      toast.error('Csak PST fájlok fogadhatók el');
      return;
    }

    setImporting(true);
    setImportProgress({
      status: 'processing',
      current: 0,
      total: 0,
      imported: 0,
      skipped: 0,
      message: 'Fájl feltöltése...'
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/v1/emails/import-pst', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success(`Import sikeres: ${response.data.imported} email importálva`);
      } else if (response.data.errors?.length > 0) {
        toast.error(`Import részben sikeres: ${response.data.errors[0]}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Hiba az import során: ' + (error.response?.data?.detail || error.message));
      setImporting(false);
    }

    event.target.value = '';
  };

  const handleDownloadAttachment = async (emailId, attachment) => {
    try {
      const response = await api.get(
        `/v1/emails/${emailId}/attachments/${attachment.id}/download`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Hiba a melléklet letöltésekor');
    }
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      importance: '',
      category: '',
      search: '',
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('hu-HU');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getProgressPercent = () => {
    if (!importProgress || importProgress.total === 0) return 0;
    return Math.round((importProgress.current / importProgress.total) * 100);
  };

  const getCategorizationPercent = () => {
    if (!categorizationProgress || categorizationProgress.total === 0) return 0;
    return Math.round((categorizationProgress.current / categorizationProgress.total) * 100);
  };

  const getAutoLinkPercent = () => {
    if (!autoLinkProgress || autoLinkProgress.total === 0) return 0;
    return Math.round((autoLinkProgress.current / autoLinkProgress.total) * 100);
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.importance || filters.category || filters.search;

  return (
    <div className="flex h-full gap-6">
      {/* Main content area */}
      <div className={`flex-1 space-y-6 ${selectedEmail ? 'max-w-[60%]' : ''}`}>
        {/* Header with import button */}
        <div
          className="rounded-lg p-6 border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Email Menedzsment
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Emailek importálása, böngészése és szűrése
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pst"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={handleAiAutoLink}
                disabled={autoLinking || importing || categorizing}
                className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                }}
                title="AI alapú email-feladat összerendelés"
              >
                {autoLinking ? 'Összerendelés...' : 'AI Összerendelés'}
              </button>
              <button
                onClick={handleAiCategorize}
                disabled={categorizing || importing || autoLinking}
                className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                }}
              >
                {categorizing ? 'Kategorizálás...' : 'AI Kategorizálás'}
              </button>
              <button
                onClick={handleImportClick}
                disabled={importing || categorizing || autoLinking}
                className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                }}
              >
                {importing ? 'Importálás...' : 'PST Importálás'}
              </button>
            </div>
          </div>

          {/* Import progress bar */}
          {importing && importProgress && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span>{importProgress.message}</span>
                <span>{getProgressPercent()}%</span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${getProgressPercent()}%`,
                    backgroundColor: 'var(--accent)',
                  }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>Importálva: {importProgress.imported}</span>
                <span>Kihagyva (duplikátum): {importProgress.skipped}</span>
                <span>Összesen: {importProgress.current}/{importProgress.total}</span>
              </div>
            </div>
          )}

          {/* Categorization progress bar */}
          {categorizing && categorizationProgress && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span>{categorizationProgress.message}</span>
                <span>{getCategorizationPercent()}%</span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${getCategorizationPercent()}%`,
                    backgroundColor: '#8b5cf6',
                  }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>Feldolgozva: {categorizationProgress.current}/{categorizationProgress.total}</span>
              </div>
            </div>
          )}

          {/* Auto-link progress bar */}
          {autoLinking && autoLinkProgress && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span>{autoLinkProgress.message}</span>
                <span>{getAutoLinkPercent()}%</span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${getAutoLinkPercent()}%`,
                    backgroundColor: '#10b981',
                  }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>Feldolgozva: {autoLinkProgress.current}/{autoLinkProgress.total}</span>
              </div>
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div
          className="rounded-lg p-4 border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            {/* Date range */}
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Dátum:</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>-</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Importance dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Fontosság:</label>
              <select
                value={filters.importance}
                onChange={(e) => setFilters(prev => ({ ...prev, importance: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">Mind</option>
                {IMPORTANCE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Category dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Kategória:</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">Mind</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Search input */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Keresés..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                }}
              >
                Szűrők törlése
              </button>
            )}
          </div>
        </div>

        {/* Email stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            className="rounded-lg p-4 border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent)' }}>
              {emails.length}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {hasActiveFilters ? 'Szűrt' : 'Összes'} email
            </div>
          </div>
          <div
            className="rounded-lg p-4 border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--success)' }}>
              {emails.filter(e => e.is_read).length}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Olvasott</div>
          </div>
          <div
            className="rounded-lg p-4 border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--warning)' }}>
              {emails.filter(e => !e.is_read).length}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Olvasatlan</div>
          </div>
          <div
            className="rounded-lg p-4 border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="text-2xl font-bold mb-1" style={{ color: '#ef4444' }}>
              {emails.filter(e => e.importance === 'Magas' || e.importance === 'Kritikus').length}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Fontos</div>
          </div>
        </div>

        {/* Email list table */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Emailek
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
              Betöltés...
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
              <div className="text-4xl mb-4">📭</div>
              <p>{hasActiveFilters ? 'Nincs találat a szűrési feltételeknek megfelelően' : 'Nincsenek emailek'}</p>
              {!hasActiveFilters && (
                <p className="text-sm mt-2">Használd a PST Importálás gombot emailek feltöltéséhez</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Dátum
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Feladó
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Tárgy
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Fontosság
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Kategória
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((email) => (
                    <tr
                      key={email.id}
                      onClick={() => handleEmailClick(email)}
                      className="cursor-pointer transition-colors border-t"
                      style={{
                        borderColor: 'var(--border-color)',
                        backgroundColor: selectedEmail?.id === email.id
                          ? 'var(--accent-bg)'
                          : email.is_read
                            ? 'transparent'
                            : 'var(--bg-secondary)',
                      }}
                    >
                      <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(email.received_date)}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                        <div className="flex items-center gap-2">
                          {!email.is_read && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: 'var(--accent)' }}
                            />
                          )}
                          <span className="truncate max-w-[200px]">
                            {email.sender || 'Ismeretlen feladó'}
                          </span>
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 text-sm truncate max-w-[300px] ${!email.is_read ? 'font-semibold' : ''}`}
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {email.subject || '(Nincs tárgy)'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: IMPORTANCE_COLORS[email.importance]?.bg || 'var(--bg-secondary)',
                            color: IMPORTANCE_COLORS[email.importance]?.text || 'var(--text-secondary)',
                          }}
                        >
                          {email.importance}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {email.category ? (
                          <span
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {email.category}
                          </span>
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Email details panel (right side) */}
      {selectedEmail && (
        <div
          className="w-[40%] rounded-lg border overflow-hidden flex flex-col"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          {/* Header */}
          <div
            className="p-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Email részletek
            </h3>
            <button
              onClick={() => {
                setSelectedEmail(null);
                setEmailDetails(null);
              }}
              className="p-1 rounded hover:bg-opacity-80 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {detailsLoading ? (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                Betöltés...
              </div>
            ) : emailDetails ? (
              <>
                {/* Subject */}
                <div>
                  <h4
                    className="text-lg font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {emailDetails.subject || '(Nincs tárgy)'}
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {editingImportance ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={emailDetails.importance}
                          onChange={(e) => handleImportanceChange(e.target.value)}
                          className="px-2 py-1 rounded text-xs border"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {IMPORTANCE_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setEditingImportance(false)}
                          className="text-xs px-2 py-1 rounded"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Mégse
                        </button>
                      </div>
                    ) : (
                      <span
                        className="px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: IMPORTANCE_COLORS[emailDetails.importance]?.bg || 'var(--bg-secondary)',
                          color: IMPORTANCE_COLORS[emailDetails.importance]?.text || 'var(--text-secondary)',
                        }}
                        onClick={() => setEditingImportance(true)}
                        title="Kattints a módosításhoz"
                      >
                        {emailDetails.importance}
                      </span>
                    )}
                    {emailDetails.category && (
                      <span
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {emailDetails.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* AI Importance Reason */}
                {emailDetails.ai_importance_reason && (
                  <div>
                    <h5
                      className="text-sm font-medium mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      AI Fontosság Indoklás
                    </h5>
                    <div
                      className="p-3 rounded-lg text-sm"
                      style={{
                        backgroundColor: '#8b5cf610',
                        color: 'var(--text-primary)',
                        borderLeft: '3px solid #8b5cf6',
                      }}
                    >
                      {emailDetails.ai_importance_reason}
                    </div>
                  </div>
                )}

                {/* Task Links Section */}
                <div>
                  <h5
                    className="text-sm font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Kapcsolódó Feladatok
                  </h5>

                  {/* Existing task links */}
                  {emailDetails.task_links && emailDetails.task_links.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {emailDetails.task_links.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between p-2 rounded-lg"
                          style={{ backgroundColor: 'var(--bg-secondary)' }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                              {link.process_name || `Feladat #${link.process_instance_id}`}
                            </span>
                            {link.ai_confidence !== null && (
                              <span
                                className="px-1.5 py-0.5 rounded text-xs"
                                style={{
                                  backgroundColor: link.ai_confidence >= 0.7 ? '#10b98120' : '#f59e0b20',
                                  color: link.ai_confidence >= 0.7 ? '#10b981' : '#f59e0b',
                                }}
                                title="AI bizonyosság"
                              >
                                {Math.round(link.ai_confidence * 100)}%
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleUnlinkTask(link.process_instance_id)}
                            className="p-1 rounded hover:bg-red-100 transition-colors text-red-500"
                            title="Összerendelés törlése"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new task link */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTaskId}
                      onChange={(e) => setSelectedTaskId(e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded border text-sm"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="">Feladat kiválasztása...</option>
                      {availableTasks
                        .filter(task => !emailDetails.task_links?.some(link => link.process_instance_id === task.id))
                        .map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.full_name}
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={handleLinkTask}
                      disabled={!selectedTaskId || linkingTask}
                      className="px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                      }}
                    >
                      {linkingTask ? '...' : 'Hozzáad'}
                    </button>
                  </div>
                </div>

                {/* Metadata */}
                <div
                  className="p-3 rounded-lg space-y-2 text-sm"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div className="flex">
                    <span className="font-medium w-24" style={{ color: 'var(--text-secondary)' }}>
                      Feladó:
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {emailDetails.sender || '-'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="font-medium w-24" style={{ color: 'var(--text-secondary)' }}>
                      Címzett:
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {emailDetails.recipients || '-'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="font-medium w-24" style={{ color: 'var(--text-secondary)' }}>
                      Dátum:
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {formatDate(emailDetails.received_date)}
                    </span>
                  </div>
                </div>

                {/* Attachments */}
                {emailDetails.attachments && emailDetails.attachments.length > 0 && (
                  <div>
                    <h5
                      className="text-sm font-medium mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Mellékletek ({emailDetails.attachments.length})
                    </h5>
                    <div className="space-y-2">
                      {emailDetails.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-2 rounded-lg"
                          style={{ backgroundColor: 'var(--bg-secondary)' }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg">📎</span>
                            <div className="min-w-0">
                              <div
                                className="text-sm truncate"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {attachment.filename}
                              </div>
                              <div
                                className="text-xs"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {formatFileSize(attachment.file_size)}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadAttachment(emailDetails.id, attachment)}
                            className="px-3 py-1 rounded text-sm transition-colors"
                            style={{
                              backgroundColor: 'var(--accent)',
                              color: 'white',
                            }}
                          >
                            Letöltés
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Summary (if available) */}
                {emailDetails.ai_summary && (
                  <div>
                    <h5
                      className="text-sm font-medium mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      AI Összefoglaló
                    </h5>
                    <div
                      className="p-3 rounded-lg text-sm"
                      style={{
                        backgroundColor: '#3b82f610',
                        color: 'var(--text-primary)',
                        borderLeft: '3px solid #3b82f6',
                      }}
                    >
                      {emailDetails.ai_summary}
                    </div>
                  </div>
                )}

                {/* Body */}
                <div>
                  <h5
                    className="text-sm font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Tartalom
                  </h5>
                  <div
                    className="p-3 rounded-lg text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {emailDetails.body || '(Nincs tartalom)'}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                Hiba az email betöltésekor
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Emails;
