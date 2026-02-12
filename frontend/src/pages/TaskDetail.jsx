import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import {
  ArrowLeft,
  Save,
  Upload,
  Download,
  Trash2,
  Play,
  Mail,
  MessageSquare,
  FileText,
  Clock,
  Send,
  Sparkles,
  Copy,
  Check,
  Plus,
  CheckSquare,
  GripVertical,
  RefreshCw,
} from 'lucide-react';

const MONTH_NAMES = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December',
];

const cardStyle = {
  backgroundColor: 'var(--bg-card)',
  borderColor: 'var(--border-color)',
};

const inputStyle = {
  backgroundColor: 'var(--bg-secondary)',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

const TaskDetail = () => {
  const { processId, taskId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Task data
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Statuses for dropdown
  const [statuses, setStatuses] = useState([]);

  // Editable fields
  const [quickGuide, setQuickGuide] = useState('');
  const [notes, setNotes] = useState('');
  const [statusId, setStatusId] = useState(null);

  // Comments
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  // Scripts
  const [scripts, setScripts] = useState([]);
  const [runningScript, setRunningScript] = useState(null);

  // File upload
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // AI Guide generation
  const [generatingGuide, setGeneratingGuide] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Subtasks
  const [subtasks, setSubtasks] = useState([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [generatingSubtasks, setGeneratingSubtasks] = useState(false);
  const [subtaskDragIdx, setSubtaskDragIdx] = useState(null);

  const loadTask = useCallback(async () => {
    try {
      const res = await api.get(`/v1/monthly-tasks/${taskId}`);
      setTask(res.data);
      setQuickGuide(res.data.quick_guide || res.data.process_type?.quick_guide || '');
      setNotes(res.data.notes || '');
      setStatusId(res.data.status_id);
      setAiDraft(res.data.quick_guide_ai_draft || '');
    } catch {
      toast.error('Hiba a feladat betöltésekor!');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const loadStatuses = useCallback(async () => {
    try {
      const res = await api.get('/v1/statuses');
      setStatuses(res.data);
    } catch {
      // ignore
    }
  }, []);

  const loadScripts = useCallback(async () => {
    try {
      const res = await api.get(`/v1/monthly-tasks/${taskId}/scripts`);
      setScripts(res.data);
    } catch {
      // ignore
    }
  }, [taskId]);

  const loadSubtasks = useCallback(async () => {
    setLoadingSubtasks(true);
    try {
      const res = await api.get(`/v1/monthly-tasks/${taskId}/subtasks`);
      setSubtasks(res.data);
    } catch {
      // ignore
    } finally {
      setLoadingSubtasks(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
    loadStatuses();
    loadScripts();
    loadSubtasks();
  }, [loadTask, loadStatuses, loadScripts, loadSubtasks]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/v1/monthly-tasks/${taskId}`, {
        quick_guide: quickGuide,
        notes: notes,
        status_id: statusId,
      });
      toast.success('Mentve!');
      loadTask();
    } catch {
      toast.error('Hiba a mentés során!');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatusId) => {
    setStatusId(newStatusId);
    try {
      await api.put(`/v1/monthly-tasks/${taskId}`, { status_id: newStatusId });
      toast.success('Státusz frissítve!');
      loadTask();
    } catch {
      toast.error('Hiba a státusz frissítésekor!');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      await api.post(`/v1/monthly-tasks/${taskId}/comments?content=${encodeURIComponent(newComment)}`);
      setNewComment('');
      toast.success('Megjegyzés hozzáadva!');
      loadTask();
    } catch {
      toast.error('Hiba a megjegyzés hozzáadásakor!');
    } finally {
      setAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/v1/monthly-tasks/${taskId}/comments/${commentId}`);
      toast.success('Megjegyzés törölve!');
      loadTask();
    } catch {
      toast.error('Hiba a megjegyzés törlésekor!');
    }
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        await api.post(`/v1/monthly-tasks/${taskId}/files`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(`${file.name} feltöltve!`);
      } catch {
        toast.error(`Hiba: ${file.name} feltöltése sikertelen!`);
      }
    }
    setUploading(false);
    loadTask();
  };

  const handleFileInputChange = (e) => {
    handleFileUpload(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDownloadFile = async (fileId, filename) => {
    try {
      const res = await api.get(`/v1/monthly-tasks/${taskId}/files/${fileId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Hiba a fájl letöltésekor!');
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await api.delete(`/v1/monthly-tasks/${taskId}/files/${fileId}`);
      toast.success('Fájl törölve!');
      loadTask();
    } catch {
      toast.error('Hiba a fájl törlésekor!');
    }
  };

  const handleRunScript = async (scriptId) => {
    setRunningScript(scriptId);
    try {
      await api.post(`/v1/monthly-tasks/${taskId}/scripts/${scriptId}/run`);
      toast.success('Script indítva!');
    } catch {
      toast.error('Hiba a script indításakor!');
    } finally {
      setRunningScript(null);
    }
  };

  // Subtask handlers
  const handleAddSubtask = async () => {
    if (!newSubtaskName.trim()) return;
    setAddingSubtask(true);
    try {
      await api.post(`/v1/monthly-tasks/${taskId}/subtasks`, {
        process_instance_id: parseInt(taskId),
        name: newSubtaskName,
      });
      setNewSubtaskName('');
      toast.success('Alfeladat hozzáadva!');
      loadSubtasks();
    } catch {
      toast.error('Hiba az alfeladat hozzáadásakor!');
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleSubtaskStatusChange = async (subtaskId, newStatusId) => {
    try {
      await api.put(`/v1/monthly-tasks/${taskId}/subtasks/${subtaskId}`, {
        status_id: newStatusId ? parseInt(newStatusId) : null,
      });
      loadSubtasks();
    } catch {
      toast.error('Hiba az alfeladat státusz frissítésekor!');
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await api.delete(`/v1/monthly-tasks/${taskId}/subtasks/${subtaskId}`);
      toast.success('Alfeladat törölve!');
      loadSubtasks();
    } catch {
      toast.error('Hiba az alfeladat törlésekor!');
    }
  };

  const handleGenerateSubtasksFromTemplate = async () => {
    setGeneratingSubtasks(true);
    try {
      const res = await api.post(`/v1/monthly-tasks/${taskId}/subtasks/generate-from-template`);
      toast.success(res.data.message || 'Alfeladatok generálva!');
      loadSubtasks();
    } catch {
      toast.error('Hiba az alfeladatok generálásakor!');
    } finally {
      setGeneratingSubtasks(false);
    }
  };

  const getSubtaskProgress = () => {
    if (subtasks.length === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = subtasks.filter(s => s.status?.name === 'Kész').length;
    return {
      completed,
      total: subtasks.length,
      percent: Math.round((completed / subtasks.length) * 100),
    };
  };

  // Subtask drag & drop handlers
  const handleSubtaskDragStart = (idx) => {
    setSubtaskDragIdx(idx);
  };

  const handleSubtaskDragOver = (e, idx) => {
    e.preventDefault();
    if (subtaskDragIdx === null || subtaskDragIdx === idx) return;
    const updated = [...subtasks];
    const [moved] = updated.splice(subtaskDragIdx, 1);
    updated.splice(idx, 0, moved);
    setSubtasks(updated);
    setSubtaskDragIdx(idx);
  };

  const handleSubtaskDragEnd = async () => {
    setSubtaskDragIdx(null);
    try {
      await api.put(`/v1/monthly-tasks/${taskId}/subtasks/reorder`, subtasks.map((s) => s.id));
    } catch (err) {
      console.error('Error reordering subtasks:', err);
      loadSubtasks();
    }
  };

  const handleGenerateGuide = async () => {
    setGeneratingGuide(true);
    try {
      const res = await api.post(`/v1/processes/${taskId}/generate-guide`);
      setAiDraft(res.data.quick_guide_ai_draft);
      toast.success(res.data.message || 'Gyors útmutató generálva!');
      loadTask();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Hiba az AI generálás során!';
      toast.error(errorMsg);
    } finally {
      setGeneratingGuide(false);
    }
  };

  const handleCopyDraftToGuide = () => {
    setQuickGuide(aiDraft);
    setCopiedDraft(true);
    toast.success('AI vázlat átmásolva a gyors útmutatóba!');
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('hu-HU');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: 'var(--text-secondary)' }}>Betöltés...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: 'var(--text-secondary)' }}>Feladat nem található.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/processes')}
            className="p-2 rounded hover:bg-gray-500/10 transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {task.process_type?.name || 'Feladat'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {task.year}. {MONTH_NAMES[task.month - 1]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Dropdown */}
          <select
            value={statusId || ''}
            onChange={(e) => handleStatusChange(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2 rounded border"
            style={inputStyle}
            data-testid="status-dropdown"
          >
            <option value="">Nincs státusz</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            data-testid="save-btn"
          >
            <Save size={18} />
            {saving ? 'Mentés...' : 'Mentés'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Guide */}
          <div className="rounded-lg border p-4" style={cardStyle}>
            <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FileText size={18} />
              Gyors útmutató
            </h2>
            <textarea
              value={quickGuide}
              onChange={(e) => setQuickGuide(e.target.value)}
              placeholder="Írj ide útmutatót a feladat végrehajtásához..."
              rows={8}
              className="w-full px-3 py-2 rounded border resize-y"
              style={inputStyle}
              data-testid="quick-guide-editor"
            />
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
              Markdown formázás támogatott.
            </p>
          </div>

          {/* Subtasks Section */}
          <div className="rounded-lg border p-4" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <CheckSquare size={18} />
                Alfeladatok
                {subtasks.length > 0 && (
                  <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
                    ({getSubtaskProgress().completed}/{getSubtaskProgress().total})
                  </span>
                )}
              </h2>
              <button
                onClick={handleGenerateSubtasksFromTemplate}
                disabled={generatingSubtasks}
                className="flex items-center gap-1 px-3 py-1 rounded text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                title="Alfeladatok generálása a folyamat sablonból"
              >
                <RefreshCw size={14} className={generatingSubtasks ? 'animate-spin' : ''} />
                Sablonból
              </button>
            </div>

            {/* Progress bar */}
            {subtasks.length > 0 && (
              <div className="mb-4">
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${getSubtaskProgress().percent}%`,
                      backgroundColor: 'var(--success)',
                    }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {getSubtaskProgress().percent}% kész
                </p>
              </div>
            )}

            {/* Subtask list */}
            {loadingSubtasks ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Betöltés...</p>
            ) : subtasks.length > 0 ? (
              <div className="space-y-2 mb-4">
                {subtasks.map((subtask, idx) => (
                  <div
                    key={subtask.id}
                    draggable
                    onDragStart={() => handleSubtaskDragStart(idx)}
                    onDragOver={(e) => handleSubtaskDragOver(e, idx)}
                    onDragEnd={handleSubtaskDragEnd}
                    className="flex items-center gap-3 px-3 py-2 rounded border cursor-grab"
                    style={{
                      backgroundColor: subtask.status?.name === 'Kész' ? 'var(--success)10' : 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      opacity: subtaskDragIdx === idx ? 0.5 : 1,
                    }}
                  >
                    <GripVertical size={14} style={{ color: 'var(--text-secondary)', cursor: 'grab' }} />
                    
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium ${subtask.status?.name === 'Kész' ? 'line-through' : ''}`}
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {subtask.name}
                      </p>
                      {subtask.description && (
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {subtask.description}
                        </p>
                      )}
                    </div>

                    <select
                      value={subtask.status_id || ''}
                      onChange={(e) => handleSubtaskStatusChange(subtask.id, e.target.value)}
                      className="px-2 py-1 rounded border text-sm"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: subtask.status?.color || 'var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="">-</option>
                      {statuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="p-1 rounded hover:bg-red-100 transition-colors"
                      title="Törlés"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Nincsenek alfeladatok. Adj hozzá egyet vagy generáld a sablonból.
              </p>
            )}

            {/* Add new subtask */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskName}
                onChange={(e) => setNewSubtaskName(e.target.value)}
                placeholder="Új alfeladat neve..."
                className="flex-1 px-3 py-2 rounded border"
                style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
              />
              <button
                onClick={handleAddSubtask}
                disabled={addingSubtask || !newSubtaskName.trim()}
                className="px-4 py-2 rounded font-medium transition-colors"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-lg border p-4" style={cardStyle}>
            <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Megjegyzések
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="További megjegyzések..."
              rows={4}
              className="w-full px-3 py-2 rounded border resize-y"
              style={inputStyle}
              data-testid="notes-editor"
            />
          </div>

          {/* Files */}
          <div className="rounded-lg border p-4" style={cardStyle}>
            <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Upload size={18} />
              Csatolt fájlok
            </h2>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                dragOver ? 'border-blue-500 bg-blue-50/10' : ''
              }`}
              style={{ borderColor: dragOver ? 'var(--accent)' : 'var(--border-color)' }}
              onClick={() => fileInputRef.current?.click()}
              data-testid="file-dropzone"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                className="hidden"
                multiple
              />
              <Upload size={32} className="mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>
                {uploading ? 'Feltöltés...' : 'Húzd ide a fájlokat vagy kattints a tallózáshoz'}
              </p>
            </div>

            {/* File list */}
            {task.files && task.files.length > 0 && (
              <div className="mt-4 space-y-2">
                {task.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between px-3 py-2 rounded border"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                    data-testid={`file-item-${file.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={16} style={{ color: 'var(--text-secondary)' }} />
                      <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                        {file.document?.original_filename || 'Ismeretlen fájl'}
                      </span>
                      {file.document?.file_size && (
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          ({(file.document.file_size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadFile(file.id, file.document?.original_filename || 'file')}
                        className="p-1 rounded hover:bg-gray-500/10 transition-colors"
                        title="Letöltés"
                      >
                        <Download size={16} style={{ color: 'var(--accent)' }} />
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-1 rounded hover:bg-red-100 transition-colors"
                        title="Törlés"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="rounded-lg border p-4" style={cardStyle}>
            <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <MessageSquare size={18} />
              Jegyzetek / Kommentek
            </h2>

            {/* Add comment form */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Új megjegyzés..."
                className="flex-1 px-3 py-2 rounded border"
                style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                data-testid="new-comment-input"
              />
              <button
                onClick={handleAddComment}
                disabled={addingComment || !newComment.trim()}
                className="px-4 py-2 rounded font-medium transition-colors"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                data-testid="add-comment-btn"
              >
                <Send size={18} />
              </button>
            </div>

            {/* Comments list */}
            {task.comments && task.comments.length > 0 ? (
              <div className="space-y-3">
                {task.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="px-3 py-2 rounded border"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                    data-testid={`comment-${comment.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p style={{ color: 'var(--text-primary)' }}>{comment.content}</p>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 rounded hover:bg-red-100 transition-colors flex-shrink-0"
                        title="Törlés"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(comment.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Nincsenek megjegyzések.
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* AI Guide Generation */}
          <div className="rounded-lg border p-4" style={cardStyle}>
            <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Sparkles size={18} />
              AI Gyors útmutató
            </h2>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              Generálj AI-val vázlatot a feltöltött dokumentumok alapján.
            </p>
            <button
              onClick={handleGenerateGuide}
              disabled={generatingGuide}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-medium transition-colors"
              style={{
                backgroundColor: generatingGuide ? 'var(--bg-secondary)' : 'var(--accent)',
                color: generatingGuide ? 'var(--text-secondary)' : 'white'
              }}
              data-testid="generate-guide-btn"
            >
              <Sparkles size={18} className={generatingGuide ? 'animate-pulse' : ''} />
              {generatingGuide ? 'Generálás...' : 'Vázlat generálása'}
            </button>

            {aiDraft && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    AI vázlat
                  </span>
                  <button
                    onClick={handleCopyDraftToGuide}
                    className="flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors hover:bg-gray-500/10"
                    style={{ color: 'var(--accent)' }}
                    title="Átmásolás a gyors útmutatóba"
                    data-testid="copy-draft-btn"
                  >
                    {copiedDraft ? <Check size={14} /> : <Copy size={14} />}
                    {copiedDraft ? 'Átmásolva!' : 'Használat'}
                  </button>
                </div>
                <div
                  className="p-3 rounded border text-sm max-h-48 overflow-y-auto whitespace-pre-wrap"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  data-testid="ai-draft-preview"
                >
                  {aiDraft}
                </div>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="rounded-lg border p-4" style={cardStyle}>
            <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Clock size={18} />
              Időbélyegek
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Létrehozva:</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatDate(task.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Módosítva:</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatDate(task.updated_at)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Elkezdte:</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatDate(task.started_at)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Befejezve:</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatDate(task.completed_at)}</span>
              </div>
            </div>
          </div>

          {/* Scripts */}
          {scripts.length > 0 && (
            <div className="rounded-lg border p-4" style={cardStyle}>
              <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Play size={18} />
                Scriptek
              </h2>
              <div className="space-y-2">
                {scripts.map((script) => (
                  <div
                    key={script.id}
                    className="flex items-center justify-between px-3 py-2 rounded border"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                    data-testid={`script-${script.id}`}
                  >
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {script.name}
                      </p>
                      {script.description && (
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {script.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRunScript(script.id)}
                      disabled={runningScript === script.id}
                      className="p-2 rounded transition-colors"
                      style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                      title="Futtatás"
                    >
                      <Play size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Emails */}
          <div className="rounded-lg border p-4" style={cardStyle}>
            <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Mail size={18} />
              Kapcsolódó emailek
            </h2>
            {task.linked_emails && task.linked_emails.length > 0 ? (
              <div className="space-y-2">
                {task.linked_emails.map((email) => (
                  <div
                    key={email.id}
                    className="px-3 py-2 rounded border cursor-pointer hover:bg-gray-500/10 transition-colors"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                    onClick={() => navigate(`/emails?id=${email.id}`)}
                    data-testid={`email-${email.id}`}
                  >
                    <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {email.subject || '(Nincs tárgy)'}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {email.sender}
                    </p>
                    {email.ai_summary && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                        {email.ai_summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Nincsenek kapcsolódó emailek.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
