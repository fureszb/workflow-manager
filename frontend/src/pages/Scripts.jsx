import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import {
  Plus,
  Edit3,
  Trash2,
  Upload,
  FolderOpen,
  X,
  FileCode,
  Link,
  Check,
  Play,
  Square,
  Terminal,
  Loader2,
  History,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  StopCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const cardStyle = {
  backgroundColor: 'var(--bg-card)',
  borderColor: 'var(--border-color)',
};

const inputStyle = {
  backgroundColor: 'var(--bg-secondary)',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (startedAt, completedAt) => {
  if (!startedAt) return '-';
  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const diffMs = end - start;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return `${diffSec}mp`;
  }
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${mins}p ${secs}mp`;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'success':
      return <CheckCircle size={16} className="text-green-500" />;
    case 'failed':
      return <XCircle size={16} className="text-red-500" />;
    case 'cancelled':
      return <StopCircle size={16} className="text-yellow-500" />;
    case 'running':
      return <Loader2 size={16} className="animate-spin text-blue-500" />;
    default:
      return <Clock size={16} style={{ color: 'var(--text-secondary)' }} />;
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'success':
      return 'Sikeres';
    case 'failed':
      return 'Hiba';
    case 'cancelled':
      return 'Leállítva';
    case 'running':
      return 'Fut';
    default:
      return status;
  }
};

const Scripts = () => {
  const [scripts, setScripts] = useState([]);
  const [processTypes, setProcessTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formProcessTypeId, setFormProcessTypeId] = useState('');
  const [formMode, setFormMode] = useState('upload'); // 'upload' or 'path'
  const [formFilePath, setFormFilePath] = useState('');
  const [formFile, setFormFile] = useState(null);

  // Script execution state
  const [runningScripts, setRunningScripts] = useState({}); // {scriptId: runId}
  const [scriptLogs, setScriptLogs] = useState({}); // {runId: string[]}
  const [expandedLogs, setExpandedLogs] = useState({}); // {scriptId: boolean}

  // Run history state
  const [expandedHistory, setExpandedHistory] = useState({}); // {scriptId: boolean}
  const [scriptRuns, setScriptRuns] = useState({}); // {scriptId: runs[]}
  const [loadingHistory, setLoadingHistory] = useState({});

  // Log modal state
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedRunOutputFiles, setSelectedRunOutputFiles] = useState([]);
  const [loadingOutputFiles, setLoadingOutputFiles] = useState(false);

  const fileInputRef = useRef(null);
  const logEndRefs = useRef({}); // For auto-scrolling
  const wsRef = useRef(null);

  const loadScripts = useCallback(async () => {
    try {
      const res = await api.get('/v1/scripts');
      setScripts(res.data);
    } catch {
      toast.error('Hiba a scriptek betöltésekor!');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProcessTypes = useCallback(async () => {
    try {
      const res = await api.get('/v1/scripts/process-types/list');
      setProcessTypes(res.data);
    } catch {
      // Silently fail - process types are optional
    }
  }, []);

  useEffect(() => {
    loadScripts();
    loadProcessTypes();
  }, [loadScripts, loadProcessTypes]);

  // WebSocket connection for real-time script output
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected for script output');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'script.output') {
          const { run_id, line, stream } = message.data;
          setScriptLogs((prev) => {
            const currentLogs = prev[run_id] || [];
            const prefix = stream === 'stderr' ? '[ERR] ' : '';
            return {
              ...prev,
              [run_id]: [...currentLogs, prefix + line],
            };
          });
        } else if (message.type === 'script.status') {
          const { run_id, script_id, status } = message.data;
          if (status !== 'running') {
            // Script finished - remove from running scripts
            setRunningScripts((prev) => {
              const newState = { ...prev };
              delete newState[script_id];
              return newState;
            });

            // Show toast based on status
            if (status === 'success') {
              toast.success('Script sikeresen lefutott!');
            } else if (status === 'failed') {
              toast.error('Script hiba történt!');
            } else if (status === 'cancelled') {
              toast('Script leállítva', { icon: '🛑' });
            }

            // Reload scripts to update run history
            loadScripts();
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [loadScripts]);

  // Auto-scroll log windows
  useEffect(() => {
    Object.keys(expandedLogs).forEach((scriptId) => {
      if (expandedLogs[scriptId] && logEndRefs.current[scriptId]) {
        logEndRefs.current[scriptId].scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [scriptLogs, expandedLogs]);

  const handleRunScript = async (scriptId) => {
    try {
      const res = await api.post(`/v1/scripts/${scriptId}/run`);
      const runId = res.data.id;

      setRunningScripts((prev) => ({ ...prev, [scriptId]: runId }));
      setScriptLogs((prev) => ({ ...prev, [runId]: [] }));
      setExpandedLogs((prev) => ({ ...prev, [scriptId]: true }));

      toast.success('Script elindítva!');
    } catch (err) {
      const message = err.response?.data?.detail || 'Hiba a script indításakor!';
      toast.error(message);
    }
  };

  const handleCancelScript = async (scriptId) => {
    const runId = runningScripts[scriptId];
    if (!runId) return;

    try {
      await api.post(`/v1/scripts/${scriptId}/cancel`, null, {
        params: { run_id: runId },
      });
      toast('Script leállítás kérve...', { icon: '⏳' });
    } catch (err) {
      const message = err.response?.data?.detail || 'Hiba a script leállításakor!';
      toast.error(message);
    }
  };

  const toggleLogExpand = (scriptId) => {
    setExpandedLogs((prev) => ({ ...prev, [scriptId]: !prev[scriptId] }));
  };

  const loadRunHistory = async (scriptId) => {
    setLoadingHistory((prev) => ({ ...prev, [scriptId]: true }));
    try {
      const res = await api.get(`/v1/scripts/${scriptId}/runs`, {
        params: { limit: 20 },
      });
      setScriptRuns((prev) => ({ ...prev, [scriptId]: res.data }));
    } catch {
      toast.error('Hiba az előzmények betöltésekor!');
    } finally {
      setLoadingHistory((prev) => ({ ...prev, [scriptId]: false }));
    }
  };

  const toggleHistoryExpand = async (scriptId) => {
    const newExpanded = !expandedHistory[scriptId];
    setExpandedHistory((prev) => ({ ...prev, [scriptId]: newExpanded }));

    if (newExpanded && !scriptRuns[scriptId]) {
      await loadRunHistory(scriptId);
    }
  };

  const openLogModal = async (run) => {
    setSelectedRun(run);
    setLogModalOpen(true);
    setLoadingOutputFiles(true);
    setSelectedRunOutputFiles([]);

    try {
      const res = await api.get(`/v1/scripts/runs/${run.id}/output-files`);
      setSelectedRunOutputFiles(res.data);
    } catch {
      // Silently fail - output files are optional
    } finally {
      setLoadingOutputFiles(false);
    }
  };

  const closeLogModal = () => {
    setLogModalOpen(false);
    setSelectedRun(null);
    setSelectedRunOutputFiles([]);
  };

  const downloadOutputFile = (runId, filename) => {
    window.open(`/api/v1/scripts/runs/${runId}/output-files/${encodeURIComponent(filename)}`, '_blank');
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormProcessTypeId('');
    setFormMode('upload');
    setFormFilePath('');
    setFormFile(null);
    setEditingScript(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (script) => {
    setEditingScript(script);
    setFormName(script.name);
    setFormDescription(script.description || '');
    setFormProcessTypeId(script.process_type_id?.toString() || '');
    setFormMode(script.is_uploaded ? 'upload' : 'path');
    setFormFilePath(script.is_uploaded ? '' : script.file_path);
    setFormFile(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.py')) {
        toast.error('Csak .py fájlok tölthetők fel!');
        e.target.value = '';
        return;
      }
      setFormFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formName.trim()) {
      toast.error('A név megadása kötelező!');
      return;
    }

    if (!editingScript) {
      // Creating new script
      if (formMode === 'upload' && !formFile) {
        toast.error('Válassz ki egy fájlt a feltöltéshez!');
        return;
      }
      if (formMode === 'path' && !formFilePath.trim()) {
        toast.error('Add meg a fájl útvonalát!');
        return;
      }
    }

    setSaving(true);

    try {
      if (editingScript) {
        // Update existing script
        await api.put(`/v1/scripts/${editingScript.id}`, {
          name: formName,
          description: formDescription || null,
          process_type_id: formProcessTypeId ? parseInt(formProcessTypeId) : null,
        });
        toast.success('Script sikeresen frissítve!');
      } else {
        // Create new script using FormData for file upload
        const formData = new FormData();
        formData.append('name', formName);
        if (formDescription) {
          formData.append('description', formDescription);
        }
        if (formProcessTypeId) {
          formData.append('process_type_id', formProcessTypeId);
        }

        if (formMode === 'upload' && formFile) {
          formData.append('file', formFile);
        } else if (formMode === 'path') {
          formData.append('file_path', formFilePath);
        }

        await api.post('/v1/scripts', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        toast.success('Script sikeresen létrehozva!');
      }

      closeModal();
      loadScripts();
    } catch (err) {
      const message = err.response?.data?.detail || 'Hiba történt a mentés során!';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (scriptId) => {
    try {
      await api.delete(`/v1/scripts/${scriptId}`);
      toast.success('Script sikeresen törölve!');
      setDeleteConfirmId(null);
      loadScripts();
    } catch (err) {
      const message = err.response?.data?.detail || 'Hiba történt a törlés során!';
      toast.error(message);
    }
  };

  const getProcessTypeName = (processTypeId) => {
    if (!processTypeId) return null;
    const pt = processTypes.find((p) => p.id === processTypeId);
    return pt?.name || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-lg p-6 border"
        style={cardStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Python Scriptek
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Egyéni Python scriptek regisztrálása és kezelése
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded font-medium"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
            }}
          >
            <Plus size={18} />
            Új Script
          </button>
        </div>
      </div>

      {/* Script List */}
      <div
        className="rounded-lg p-6 border"
        style={cardStyle}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Regisztrált Scriptek
        </h2>

        {scripts.length === 0 ? (
          <div className="text-center py-12">
            <FileCode
              size={48}
              className="mx-auto mb-4"
              style={{ color: 'var(--text-secondary)' }}
            />
            <p style={{ color: 'var(--text-secondary)' }}>
              Még nincs regisztrált script.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 rounded font-medium"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'white',
              }}
            >
              Első Script Regisztrálása
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {scripts.map((script) => {
              const isRunning = !!runningScripts[script.id];
              const currentRunId = runningScripts[script.id];
              const currentLogs = currentRunId ? scriptLogs[currentRunId] || [] : [];
              const isLogExpanded = expandedLogs[script.id];

              return (
              <div
                key={script.id}
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <FileCode size={20} style={{ color: 'var(--accent)' }} />
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {script.name}
                      </h3>
                      {script.is_uploaded && (
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--accent)',
                            color: 'white',
                          }}
                        >
                          Feltöltött
                        </span>
                      )}
                      {isRunning && (
                        <span
                          className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
                          style={{
                            backgroundColor: '#22c55e',
                            color: 'white',
                          }}
                        >
                          <Loader2 size={12} className="animate-spin" />
                          Fut
                        </span>
                      )}
                    </div>
                    {script.description && (
                      <p className="text-sm mb-2 ml-8" style={{ color: 'var(--text-secondary)' }}>
                        {script.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 ml-8 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span>Fájl: {script.file_path.split('/').pop()}</span>
                      <span>Létrehozva: {formatDate(script.created_at)}</span>
                      {script.process_type && (
                        <span className="flex items-center gap-1">
                          <Link size={12} />
                          {script.process_type.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* Run/Cancel button */}
                    {isRunning ? (
                      <button
                        onClick={() => handleCancelScript(script.id)}
                        className="p-2 rounded bg-red-500 text-white hover:bg-red-600"
                        title="Leállítás"
                      >
                        <Square size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRunScript(script.id)}
                        className="p-2 rounded bg-green-500 text-white hover:bg-green-600"
                        title="Futtatás"
                      >
                        <Play size={16} />
                      </button>
                    )}
                    {/* Toggle log button */}
                    {(isRunning || currentLogs.length > 0) && (
                      <button
                        onClick={() => toggleLogExpand(script.id)}
                        className={`p-2 rounded border ${isLogExpanded ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        style={{ borderColor: 'var(--border-color)' }}
                        title={isLogExpanded ? 'Log elrejtése' : 'Log megjelenítése'}
                      >
                        <Terminal size={16} style={{ color: isLogExpanded ? 'var(--accent)' : 'var(--text-primary)' }} />
                      </button>
                    )}
                    {/* History button */}
                    <button
                      onClick={() => toggleHistoryExpand(script.id)}
                      className={`p-2 rounded border ${expandedHistory[script.id] ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      style={{ borderColor: 'var(--border-color)' }}
                      title={expandedHistory[script.id] ? 'Előzmények elrejtése' : 'Előzmények'}
                    >
                      <History size={16} style={{ color: expandedHistory[script.id] ? 'var(--accent)' : 'var(--text-primary)' }} />
                    </button>
                    <button
                      onClick={() => openEditModal(script)}
                      className="p-2 rounded border hover:bg-gray-100 dark:hover:bg-gray-700"
                      style={{ borderColor: 'var(--border-color)' }}
                      title="Szerkesztés"
                    >
                      <Edit3 size={16} style={{ color: 'var(--text-primary)' }} />
                    </button>
                    {deleteConfirmId === script.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(script.id)}
                          className="p-2 rounded bg-red-500 text-white hover:bg-red-600"
                          title="Megerősítés"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="p-2 rounded border hover:bg-gray-100 dark:hover:bg-gray-700"
                          style={{ borderColor: 'var(--border-color)' }}
                          title="Mégse"
                        >
                          <X size={16} style={{ color: 'var(--text-primary)' }} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(script.id)}
                        disabled={isRunning}
                        className={`p-2 rounded border hover:bg-red-50 dark:hover:bg-red-900/20 ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{ borderColor: 'var(--border-color)' }}
                        title="Törlés"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Log Display Panel */}
                {isLogExpanded && currentLogs.length > 0 && (
                  <div
                    className="mt-3 rounded-lg overflow-hidden"
                    style={{
                      backgroundColor: '#1e1e1e',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div
                      className="flex items-center justify-between px-3 py-2"
                      style={{ backgroundColor: '#2d2d2d' }}
                    >
                      <div className="flex items-center gap-2">
                        <Terminal size={14} style={{ color: '#10b981' }} />
                        <span className="text-xs font-mono" style={{ color: '#a0a0a0' }}>
                          Kimenet {isRunning && <span className="animate-pulse">...</span>}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleLogExpand(script.id)}
                        className="p-1 rounded hover:bg-gray-700"
                      >
                        <X size={14} style={{ color: '#a0a0a0' }} />
                      </button>
                    </div>
                    <div
                      className="p-3 font-mono text-xs overflow-auto max-h-64"
                      style={{ color: '#d4d4d4' }}
                    >
                      {currentLogs.map((line, idx) => (
                        <div
                          key={idx}
                          style={{
                            color: line.startsWith('[ERR]') ? '#f87171' : '#d4d4d4',
                          }}
                        >
                          {line}
                        </div>
                      ))}
                      <div ref={(el) => (logEndRefs.current[script.id] = el)} />
                    </div>
                  </div>
                )}

                {/* Run History Panel */}
                {expandedHistory[script.id] && (
                  <div
                    className="mt-3 rounded-lg border overflow-hidden"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <div
                      className="flex items-center justify-between px-3 py-2"
                      style={{ backgroundColor: 'var(--bg-card)' }}
                    >
                      <div className="flex items-center gap-2">
                        <History size={14} style={{ color: 'var(--accent)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          Futtatási előzmények
                        </span>
                      </div>
                      <button
                        onClick={() => loadRunHistory(script.id)}
                        className="text-xs px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        style={{ color: 'var(--text-secondary)' }}
                        title="Frissítés"
                      >
                        Frissít
                      </button>
                    </div>

                    {loadingHistory[script.id] ? (
                      <div className="p-4 text-center">
                        <Loader2 size={20} className="animate-spin mx-auto" style={{ color: 'var(--accent)' }} />
                      </div>
                    ) : scriptRuns[script.id]?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Dátum
                              </th>
                              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Státusz
                              </th>
                              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Időtartam
                              </th>
                              <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Műveletek
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {scriptRuns[script.id].map((run) => (
                              <tr
                                key={run.id}
                                className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                style={{ borderColor: 'var(--border-color)' }}
                              >
                                <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>
                                  {formatDate(run.started_at)}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <StatusIcon status={run.status} />
                                    <span style={{ color: 'var(--text-primary)' }}>
                                      {getStatusLabel(run.status)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                                  {formatDuration(run.started_at, run.completed_at)}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    onClick={() => openLogModal(run)}
                                    className="p-1.5 rounded border hover:bg-gray-100 dark:hover:bg-gray-700"
                                    style={{ borderColor: 'var(--border-color)' }}
                                    title="Log megtekintése"
                                  >
                                    <Eye size={14} style={{ color: 'var(--text-primary)' }} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Még nincs futtatási előzmény
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-lg rounded-lg border p-6"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {editingScript ? 'Script Szerkesztése' : 'Új Script Regisztrálása'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X size={20} style={{ color: 'var(--text-primary)' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Név *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="pl. Adat feldolgozó script"
                  className="w-full px-3 py-2 rounded border"
                  style={inputStyle}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Leírás
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="A script rövid leírása..."
                  rows={3}
                  className="w-full px-3 py-2 rounded border"
                  style={inputStyle}
                />
              </div>

              {/* Process Type Assignment */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Hozzárendelt Folyamat
                </label>
                <select
                  value={formProcessTypeId}
                  onChange={(e) => setFormProcessTypeId(e.target.value)}
                  className="w-full px-3 py-2 rounded border"
                  style={inputStyle}
                >
                  <option value="">-- Nincs hozzárendelés --</option>
                  {processTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* File Source - only for new scripts */}
              {!editingScript && (
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Script Forrás
                  </label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        checked={formMode === 'upload'}
                        onChange={() => setFormMode('upload')}
                        className="accent-blue-500"
                      />
                      <Upload size={16} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ color: 'var(--text-primary)' }}>Fájl feltöltés</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        checked={formMode === 'path'}
                        onChange={() => setFormMode('path')}
                        className="accent-blue-500"
                      />
                      <FolderOpen size={16} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ color: 'var(--text-primary)' }}>Szerveren lévő fájl</span>
                    </label>
                  </div>

                  {formMode === 'upload' ? (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".py"
                        onChange={handleFileChange}
                        className="w-full px-3 py-2 rounded border"
                        style={inputStyle}
                      />
                      {formFile && (
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                          Kiválasztva: {formFile.name}
                        </p>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={formFilePath}
                      onChange={(e) => setFormFilePath(e.target.value)}
                      placeholder="/path/to/script.py"
                      className="w-full px-3 py-2 rounded border"
                      style={inputStyle}
                    />
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded border font-medium"
                  style={{
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded font-medium disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'white',
                  }}
                >
                  {saving ? 'Mentés...' : editingScript ? 'Mentés' : 'Regisztrálás'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Viewer Modal */}
      {logModalOpen && selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-3xl max-h-[80vh] rounded-lg border flex flex-col"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Futtatás részletei
                </h3>
                <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>{formatDate(selectedRun.started_at)}</span>
                  <div className="flex items-center gap-1">
                    <StatusIcon status={selectedRun.status} />
                    <span>{getStatusLabel(selectedRun.status)}</span>
                  </div>
                  <span>Időtartam: {formatDuration(selectedRun.started_at, selectedRun.completed_at)}</span>
                  {selectedRun.exit_code !== null && selectedRun.exit_code !== undefined && (
                    <span>Exit code: {selectedRun.exit_code}</span>
                  )}
                </div>
              </div>
              <button
                onClick={closeLogModal}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X size={20} style={{ color: 'var(--text-primary)' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
              {/* Output Files Section */}
              {selectedRunOutputFiles.length > 0 && (
                <div
                  className="rounded-lg border overflow-hidden"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <Download size={14} style={{ color: 'var(--accent)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Kimeneti fájlok ({selectedRunOutputFiles.length})
                    </span>
                  </div>
                  <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                    {selectedRunOutputFiles.map((file) => (
                      <div
                        key={file.filename}
                        className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <div className="flex items-center gap-2">
                          <FileCode size={14} style={{ color: 'var(--text-secondary)' }} />
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            {file.filename}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            ({formatFileSize(file.file_size)})
                          </span>
                        </div>
                        <button
                          onClick={() => downloadOutputFile(selectedRun.id, file.filename)}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded border hover:bg-gray-100 dark:hover:bg-gray-700"
                          style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        >
                          <Download size={12} />
                          Letöltés
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadingOutputFiles && (
                <div className="text-center py-2">
                  <Loader2 size={16} className="animate-spin mx-auto" style={{ color: 'var(--accent)' }} />
                </div>
              )}

              {/* Log Output */}
              <div
                className="flex-1 rounded-lg overflow-hidden min-h-[200px]"
                style={{
                  backgroundColor: '#1e1e1e',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div
                  className="flex items-center gap-2 px-3 py-2"
                  style={{ backgroundColor: '#2d2d2d' }}
                >
                  <Terminal size={14} style={{ color: '#10b981' }} />
                  <span className="text-xs font-mono" style={{ color: '#a0a0a0' }}>
                    Kimenet
                  </span>
                </div>
                <div
                  className="p-3 font-mono text-xs overflow-auto"
                  style={{ color: '#d4d4d4', maxHeight: '300px' }}
                >
                  {selectedRun.stdout && (
                    <pre className="whitespace-pre-wrap">{selectedRun.stdout}</pre>
                  )}
                  {selectedRun.stderr && (
                    <pre className="whitespace-pre-wrap" style={{ color: '#f87171' }}>
                      {selectedRun.stderr}
                    </pre>
                  )}
                  {!selectedRun.stdout && !selectedRun.stderr && (
                    <span style={{ color: '#a0a0a0' }}>Nincs kimenet</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="px-6 py-4 border-t flex justify-end"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <button
                onClick={closeLogModal}
                className="px-4 py-2 rounded border font-medium"
                style={{
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scripts;
