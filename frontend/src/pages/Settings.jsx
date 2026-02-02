import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../store/ThemeContext';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { GripVertical, Trash2, Plus } from 'lucide-react';

const TABS = [
  { id: 'general', label: 'Általános' },
  { id: 'ai', label: 'AI Személyiség' },
  { id: 'theme', label: 'Téma' },
  { id: 'notifications', label: 'Értesítések' },
  { id: 'knowledge', label: 'Tudásbázis' },
  { id: 'statuses', label: 'Státuszok' },
  { id: 'processes', label: 'Folyamatok' },
];

const inputStyle = {
  backgroundColor: 'var(--bg-secondary)',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

const cardStyle = {
  backgroundColor: 'var(--bg-card)',
  borderColor: 'var(--border-color)',
};

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);

  // Statuses state
  const [statuses, setStatuses] = useState([]);
  const [newStatus, setNewStatus] = useState({ name: '', color: '#6b7280' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', color: '' });
  const [dragIdx, setDragIdx] = useState(null);

  useEffect(() => {
    api.get('/v1/settings').then((res) => {
      setSettings(res.data);
    }).catch(() => {});
  }, []);

  const loadStatuses = useCallback(() => {
    api.get('/v1/statuses').then((res) => {
      setStatuses(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  const updateField = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/v1/settings', settings);
      toast.success('Beállítások sikeresen mentve!');
    } catch {
      toast.error('Hiba a mentés során!');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateStatus = async () => {
    if (!newStatus.name.trim()) return;
    try {
      await api.post('/v1/statuses', {
        name: newStatus.name,
        color: newStatus.color,
        order: statuses.length,
      });
      setNewStatus({ name: '', color: '#6b7280' });
      loadStatuses();
      toast.success('Státusz létrehozva!');
    } catch {
      toast.error('Hiba a státusz létrehozásakor!');
    }
  };

  const handleUpdateStatus = async (id) => {
    try {
      await api.put(`/v1/statuses/${id}`, editForm);
      setEditingId(null);
      loadStatuses();
      toast.success('Státusz frissítve!');
    } catch {
      toast.error('Hiba a státusz frissítésekor!');
    }
  };

  const handleDeleteStatus = async (id) => {
    try {
      await api.delete(`/v1/statuses/${id}`);
      loadStatuses();
      toast.success('Státusz törölve!');
    } catch (err) {
      const msg = err.response?.status === 409
        ? 'A státusz használatban van, nem törölhető!'
        : 'Hiba a státusz törlésekor!';
      toast.error(msg);
    }
  };

  const handleDragStart = (idx) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...statuses];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    setStatuses(updated);
    setDragIdx(idx);
  };

  const handleDragEnd = async () => {
    setDragIdx(null);
    try {
      await api.put('/v1/statuses/reorder', statuses.map((s) => s.id));
      toast.success('Sorrend mentve!');
    } catch {
      toast.error('Hiba a sorrend mentésekor!');
      loadStatuses();
    }
  };

  const renderGeneral = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          OpenRouter API kulcs
        </label>
        <input
          type="password"
          value={settings.openrouter_api_key || ''}
          onChange={(e) => updateField('openrouter_api_key', e.target.value)}
          placeholder="sk-or-..."
          className="w-full px-3 py-2 rounded border"
          style={inputStyle}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          OpenRouter alapértelmezett modell
        </label>
        <input
          type="text"
          value={settings.openrouter_default_model || ''}
          onChange={(e) => updateField('openrouter_default_model', e.target.value)}
          placeholder="openai/gpt-4o"
          className="w-full px-3 py-2 rounded border"
          style={inputStyle}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Ollama base URL
        </label>
        <input
          type="text"
          value={settings.ollama_base_url || ''}
          onChange={(e) => updateField('ollama_base_url', e.target.value)}
          placeholder="http://localhost:11434"
          className="w-full px-3 py-2 rounded border"
          style={inputStyle}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Ollama modell
        </label>
        <input
          type="text"
          value={settings.ollama_model || ''}
          onChange={(e) => updateField('ollama_model', e.target.value)}
          placeholder="llama3"
          className="w-full px-3 py-2 rounded border"
          style={inputStyle}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Chat kontextus méret
        </label>
        <input
          type="number"
          value={settings.chat_context_size || ''}
          onChange={(e) => updateField('chat_context_size', e.target.value)}
          placeholder="4096"
          className="w-full px-3 py-2 rounded border"
          style={inputStyle}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Audit log megőrzés (nap)
        </label>
        <input
          type="number"
          value={settings.audit_log_retention_days || ''}
          onChange={(e) => updateField('audit_log_retention_days', e.target.value)}
          placeholder="90"
          className="w-full px-3 py-2 rounded border"
          style={inputStyle}
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Automatikus havi feladat generálás
        </label>
        <input
          type="checkbox"
          checked={settings.auto_monthly_tasks === 'true'}
          onChange={(e) => updateField('auto_monthly_tasks', e.target.checked ? 'true' : 'false')}
          className="w-5 h-5"
        />
      </div>
    </div>
  );

  const renderAI = () => (
    <div className="space-y-4">
      <p style={{ color: 'var(--text-secondary)' }}>
        AI személyiség és viselkedés konfigurálása.
      </p>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          AI szolgáltató
        </label>
        <select
          value={settings.ai_provider || 'ollama'}
          onChange={(e) => updateField('ai_provider', e.target.value)}
          className="w-full px-3 py-2 rounded border"
          style={inputStyle}
        >
          <option value="ollama">Ollama</option>
          <option value="openrouter">OpenRouter</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Rendszer prompt
        </label>
        <textarea
          value={settings.ai_system_prompt || ''}
          onChange={(e) => updateField('ai_system_prompt', e.target.value)}
          placeholder="Te egy segítőkész asszisztens vagy..."
          rows={4}
          className="w-full px-3 py-2 rounded border"
          style={inputStyle}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Hangnem
        </label>
        <select
          value={settings.ai_tone || 'professional'}
          onChange={(e) => updateField('ai_tone', e.target.value)}
          className="w-full px-3 py-2 rounded border"
          style={inputStyle}
        >
          <option value="professional">Professzionális</option>
          <option value="friendly">Barátságos</option>
          <option value="concise">Tömör</option>
        </select>
      </div>
    </div>
  );

  const renderTheme = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Téma
        </label>
        <select
          className="w-full px-3 py-2 rounded border"
          style={inputStyle}
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          <option value="light">Világos</option>
          <option value="dark">Sötét</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Nyelv
        </label>
        <select className="w-full px-3 py-2 rounded border" style={inputStyle}>
          <option>Magyar</option>
          <option>English</option>
        </select>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-3">
      {[
        { key: 'notif_email', label: 'Email értesítések' },
        { key: 'notif_push', label: 'Push értesítések' },
        { key: 'notif_process_updates', label: 'Folyamat frissítések' },
        { key: 'notif_weekly_summary', label: 'Heti összefoglaló' },
      ].map((item) => (
        <div key={item.key} className="flex items-center justify-between">
          <span style={{ color: 'var(--text-primary)' }}>{item.label}</span>
          <input
            type="checkbox"
            checked={settings[item.key] === 'true'}
            onChange={(e) => updateField(item.key, e.target.checked ? 'true' : 'false')}
            className="w-5 h-5"
          />
        </div>
      ))}
    </div>
  );

  const renderKnowledge = () => (
    <div className="space-y-4">
      <p style={{ color: 'var(--text-secondary)' }}>
        Tudásbázis beállítások és dokumentum feldolgozás konfigurálása.
      </p>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Chunk méret (karakter)
        </label>
        <input
          type="number"
          value={settings.knowledge_chunk_size || ''}
          onChange={(e) => updateField('knowledge_chunk_size', e.target.value)}
          placeholder="1000"
          className="w-full px-3 py-2 rounded border"
          style={inputStyle}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Chunk átfedés (karakter)
        </label>
        <input
          type="number"
          value={settings.knowledge_chunk_overlap || ''}
          onChange={(e) => updateField('knowledge_chunk_overlap', e.target.value)}
          placeholder="200"
          className="w-full px-3 py-2 rounded border"
          style={inputStyle}
        />
      </div>
    </div>
  );

  const renderStatuses = () => (
    <div className="space-y-4">
      <p style={{ color: 'var(--text-secondary)' }}>
        Folyamat státuszok kezelése. Az itt definiált státuszok jelennek meg a folyamatok kezelésénél.
      </p>

      {/* Status list with drag & drop */}
      <div className="space-y-2" data-testid="status-list">
        {statuses.map((status, idx) => (
          <div
            key={status.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className="flex items-center gap-3 px-3 py-2 rounded border cursor-grab"
            style={{
              ...cardStyle,
              opacity: dragIdx === idx ? 0.5 : 1,
            }}
            data-testid={`status-item-${status.id}`}
          >
            <GripVertical size={16} style={{ color: 'var(--text-secondary)' }} />
            <span
              className="w-6 h-6 rounded-full flex-shrink-0"
              style={{ backgroundColor: status.color }}
            />
            {editingId === status.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="px-2 py-1 rounded border flex-1"
                  style={inputStyle}
                  data-testid="edit-status-name"
                />
                <input
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer"
                  data-testid="edit-status-color"
                />
                <button
                  onClick={() => handleUpdateStatus(status.id)}
                  className="px-3 py-1 rounded text-sm font-medium"
                  style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                >
                  Mentés
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1 rounded text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Mégse
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between flex-1">
                <span
                  className="cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                  onClick={() => {
                    setEditingId(status.id);
                    setEditForm({ name: status.name, color: status.color });
                  }}
                  data-testid={`status-name-${status.id}`}
                >
                  {status.name}
                </span>
                <button
                  onClick={() => handleDeleteStatus(status.id)}
                  className="p-1 rounded hover:bg-red-100 transition-colors"
                  title="Törlés"
                  data-testid={`delete-status-${status.id}`}
                >
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New status form */}
      <div
        className="flex items-center gap-3 px-3 py-3 rounded border"
        style={cardStyle}
        data-testid="new-status-form"
      >
        <Plus size={16} style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          value={newStatus.name}
          onChange={(e) => setNewStatus((s) => ({ ...s, name: e.target.value }))}
          placeholder="Új státusz neve..."
          className="px-2 py-1 rounded border flex-1"
          style={inputStyle}
          data-testid="new-status-name"
        />
        <input
          type="color"
          value={newStatus.color}
          onChange={(e) => setNewStatus((s) => ({ ...s, color: e.target.value }))}
          className="w-8 h-8 rounded cursor-pointer"
          data-testid="new-status-color"
        />
        <button
          onClick={handleCreateStatus}
          className="px-4 py-1 rounded text-sm font-medium"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          data-testid="add-status-btn"
        >
          Hozzáadás
        </button>
      </div>
    </div>
  );

  const renderProcesses = () => (
    <div className="space-y-4">
      <p style={{ color: 'var(--text-secondary)' }}>
        Folyamat típusok és sablonok kezelése.
      </p>
      <div className="space-y-2">
        {['Számlázás', 'HR folyamatok', 'IT karbantartás', 'Beszerzés'].map((name) => (
          <div
            key={name}
            className="flex items-center justify-between px-3 py-2 rounded border"
            style={cardStyle}
          >
            <span style={{ color: 'var(--text-primary)' }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const tabContent = {
    general: renderGeneral,
    ai: renderAI,
    theme: renderTheme,
    notifications: renderNotifications,
    knowledge: renderKnowledge,
    statuses: renderStatuses,
    processes: renderProcesses,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Beállítások
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded font-medium transition-colors"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          {saving ? 'Mentés...' : 'Mentés'}
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex flex-wrap gap-1 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 text-sm font-medium transition-colors rounded-t"
            style={{
              backgroundColor: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-lg p-6 border" style={cardStyle}>
        {tabContent[activeTab]()}
      </div>
    </div>
  );
};

export default Settings;
