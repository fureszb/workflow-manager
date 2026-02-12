import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../store/ThemeContext';
import { useWebSocketContext } from '../store/WebSocketContext';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { GripVertical, Trash2, Plus, Star, FileText, File, Loader2, X, Bell, BellOff, Wifi, WifiOff, MessageSquare } from 'lucide-react';

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
  const {
    isConnected,
    connectionStatus,
    browserNotificationsEnabled,
    notificationPermission,
    enableBrowserNotifications,
    disableBrowserNotifications,
    toastNotificationsEnabled,
    enableToastNotifications,
    disableToastNotifications,
  } = useWebSocketContext();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);

  // Statuses state
  const [statuses, setStatuses] = useState([]);
  const [newStatus, setNewStatus] = useState({ name: '', color: '#6b7280' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', color: '' });
  const [dragIdx, setDragIdx] = useState(null);

  // Knowledge base documents state
  const [knowledgeDocs, setKnowledgeDocs] = useState([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [togglingDocId, setTogglingDocId] = useState(null);

  // AI Personality state
  const [personalities, setPersonalities] = useState({
    ollama: { name: '', system_prompt: '', tone: 'professional', expertise: '', language: 'magyar' },
    openrouter: { name: '', system_prompt: '', tone: 'professional', expertise: '', language: 'magyar' },
  });
  const [loadingPersonalities, setLoadingPersonalities] = useState(false);
  const [savingPersonality, setSavingPersonality] = useState(null);
  const [expertiseInput, setExpertiseInput] = useState({ ollama: '', openrouter: '' });

  useEffect(() => {
    api.get('/v1/settings').then((res) => {
      setSettings(res.data);
    }).catch((err) => {
      console.error('Error loading settings:', err);
      toast.error('Hiba a beállítások betöltésekor');
    });
  }, []);

  const loadPersonalities = useCallback(async () => {
    setLoadingPersonalities(true);
    try {
      const res = await api.get('/v1/ai/personality');
      setPersonalities({
        ollama: res.data.ollama || { name: '', system_prompt: '', tone: 'professional', expertise: '', language: 'magyar' },
        openrouter: res.data.openrouter || { name: '', system_prompt: '', tone: 'professional', expertise: '', language: 'magyar' },
      });
    } catch (err) {
      console.error('Error loading AI personalities:', err);
      toast.error('Hiba az AI személyiségek betöltésekor');
    } finally {
      setLoadingPersonalities(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ai') {
      loadPersonalities();
    }
  }, [activeTab, loadPersonalities]);

  const loadStatuses = useCallback(() => {
    api.get('/v1/statuses').then((res) => {
      setStatuses(res.data);
    }).catch((err) => {
      console.error('Error loading statuses:', err);
      toast.error('Hiba a státuszok betöltésekor');
    });
  }, []);

  const loadKnowledgeDocs = useCallback(async () => {
    setLoadingKnowledge(true);
    try {
      const res = await api.get('/v1/documents');
      setKnowledgeDocs(res.data);
    } catch (err) {
      console.error('Error loading knowledge documents:', err);
      toast.error('Hiba a dokumentumok betöltésekor');
    } finally {
      setLoadingKnowledge(false);
    }
  }, []);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  useEffect(() => {
    if (activeTab === 'knowledge') {
      loadKnowledgeDocs();
    }
  }, [activeTab, loadKnowledgeDocs]);

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

  const updatePersonalityField = (provider, field, value) => {
    setPersonalities((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], [field]: value },
    }));
  };

  const handleSavePersonality = async (provider) => {
    setSavingPersonality(provider);
    try {
      await api.put(`/v1/ai/personality/${provider}`, personalities[provider]);
      toast.success(`${provider === 'ollama' ? 'Lokális' : 'Online'} AI személyiség mentve!`);
    } catch {
      toast.error('Hiba a személyiség mentésekor!');
    } finally {
      setSavingPersonality(null);
    }
  };

  const getExpertiseTags = (provider) => {
    const expertise = personalities[provider]?.expertise || '';
    return expertise ? expertise.split(',').map((t) => t.trim()).filter(Boolean) : [];
  };

  const addExpertiseTag = (provider) => {
    const tag = expertiseInput[provider].trim();
    if (!tag) return;
    const currentTags = getExpertiseTags(provider);
    if (!currentTags.includes(tag)) {
      updatePersonalityField(provider, 'expertise', [...currentTags, tag].join(', '));
    }
    setExpertiseInput((prev) => ({ ...prev, [provider]: '' }));
  };

  const removeExpertiseTag = (provider, tagToRemove) => {
    const currentTags = getExpertiseTags(provider);
    updatePersonalityField(provider, 'expertise', currentTags.filter((t) => t !== tagToRemove).join(', '));
  };

  const handleExpertiseKeyDown = (provider, e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addExpertiseTag(provider);
    }
  };

  const handleToggleKnowledge = async (doc) => {
    setTogglingDocId(doc.id);
    try {
      await api.post(`/v1/documents/${doc.id}/toggle-knowledge`);
      toast.success(
        doc.is_knowledge
          ? 'Eltávolítva a tudásbázisból'
          : 'Hozzáadva a tudásbázishoz'
      );
      loadKnowledgeDocs();
    } catch {
      toast.error('Hiba a tudásbázis állapot módosításakor!');
    } finally {
      setTogglingDocId(null);
    }
  };

  const getFileIcon = (fileType) => {
    const icons = {
      pdf: { color: '#ef4444' },
      docx: { color: '#3b82f6' },
      xlsx: { color: '#22c55e' },
      txt: { color: '#6b7280' },
    };
    const config = icons[fileType] || icons.txt;
    return fileType === 'txt' ? (
      <File size={16} style={{ color: config.color }} />
    ) : (
      <FileText size={16} style={{ color: config.color }} />
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Email importáláskor automatikus AI kategorizálás
          </label>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Ha bekapcsolod, az importált emailek automatikusan fontosság szerint kategorizálva lesznek
          </p>
        </div>
        <input
          type="checkbox"
          checked={settings.email_auto_categorize === 'true'}
          onChange={(e) => updateField('email_auto_categorize', e.target.checked ? 'true' : 'false')}
          className="w-5 h-5"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Email-feladat AI összerendelés mód
        </label>
        <select
          value={settings.email_auto_link_mode || 'approval'}
          onChange={(e) => updateField('email_auto_link_mode', e.target.value)}
          className="w-full px-3 py-2 rounded border"
          style={inputStyle}
        >
          <option value="approval">Jóváhagyás-alapú (javaslatokat ad)</option>
          <option value="auto">Automatikus (magas bizonyosság esetén automatikusan összerendel)</option>
        </select>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Automatikus módban az AI 70% feletti bizonyosság esetén automatikusan összerendeli az emaileket a feladatokkal
        </p>
      </div>
    </div>
  );

  const renderPersonalitySection = (provider, title) => {
    const personality = personalities[provider] || {};
    const tags = getExpertiseTags(provider);

    return (
      <div
        className="space-y-4 p-4 rounded-lg border"
        style={cardStyle}
        data-testid={`personality-section-${provider}`}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <button
            onClick={() => handleSavePersonality(provider)}
            disabled={savingPersonality === provider}
            className="px-3 py-1 rounded text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            data-testid={`save-personality-${provider}`}
          >
            {savingPersonality === provider ? 'Mentés...' : 'Mentés'}
          </button>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Név
          </label>
          <input
            type="text"
            value={personality.name || ''}
            onChange={(e) => updatePersonalityField(provider, 'name', e.target.value)}
            placeholder="AI Asszisztens"
            className="w-full px-3 py-2 rounded border"
            style={inputStyle}
            data-testid={`personality-name-${provider}`}
          />
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            System prompt
          </label>
          <textarea
            value={personality.system_prompt || ''}
            onChange={(e) => updatePersonalityField(provider, 'system_prompt', e.target.value)}
            placeholder="Te egy segítőkész AI asszisztens vagy, aki magyar nyelven válaszol..."
            rows={5}
            className="w-full px-3 py-2 rounded border"
            style={inputStyle}
            data-testid={`personality-system-prompt-${provider}`}
          />
        </div>

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Hangnem
          </label>
          <select
            value={personality.tone || 'professional'}
            onChange={(e) => updatePersonalityField(provider, 'tone', e.target.value)}
            className="w-full px-3 py-2 rounded border"
            style={inputStyle}
            data-testid={`personality-tone-${provider}`}
          >
            <option value="professional">Professzionális</option>
            <option value="friendly">Barátságos</option>
            <option value="concise">Tömör</option>
            <option value="detailed">Részletes</option>
          </select>
        </div>

        {/* Expertise Tags */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Szakterületek
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                data-testid={`expertise-tag-${provider}-${tag}`}
              >
                {tag}
                <button
                  onClick={() => removeExpertiseTag(provider, tag)}
                  className="hover:text-red-500 transition-colors"
                  data-testid={`remove-tag-${provider}-${tag}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={expertiseInput[provider]}
              onChange={(e) => setExpertiseInput((prev) => ({ ...prev, [provider]: e.target.value }))}
              onKeyDown={(e) => handleExpertiseKeyDown(provider, e)}
              placeholder="Új szakterület (Enter a hozzáadáshoz)"
              className="flex-1 px-3 py-2 rounded border"
              style={inputStyle}
              data-testid={`expertise-input-${provider}`}
            />
            <button
              onClick={() => addExpertiseTag(provider)}
              className="px-3 py-2 rounded border transition-colors"
              style={{ ...inputStyle, cursor: 'pointer' }}
              data-testid={`add-expertise-${provider}`}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Nyelv
          </label>
          <select
            value={personality.language || 'magyar'}
            onChange={(e) => updatePersonalityField(provider, 'language', e.target.value)}
            className="w-full px-3 py-2 rounded border"
            style={inputStyle}
            data-testid={`personality-language-${provider}`}
          >
            <option value="magyar">Magyar</option>
            <option value="english">English</option>
            <option value="german">Deutsch</option>
          </select>
        </div>
      </div>
    );
  };

  const renderAI = () => {
    if (loadingPersonalities) {
      return (
        <div className="text-center py-8">
          <Loader2 className="animate-spin mx-auto" size={24} style={{ color: 'var(--text-secondary)' }} />
          <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>Betöltés...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <p style={{ color: 'var(--text-secondary)' }}>
          AI személyiség és viselkedés konfigurálása külön a lokális és online szolgáltatóhoz.
          A system prompt minden AI hívásba automatikusan bekerül.
        </p>

        {/* Local AI (Ollama) Section */}
        {renderPersonalitySection('ollama', 'Lokális AI (Ollama)')}

        {/* Online AI (OpenRouter) Section */}
        {renderPersonalitySection('openrouter', 'Online AI (OpenRouter)')}
      </div>
    );
  };

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

  const handleBrowserNotificationToggle = async () => {
    if (browserNotificationsEnabled) {
      await disableBrowserNotifications();
      toast.success('Böngésző értesítések kikapcsolva');
    } else {
      const granted = await enableBrowserNotifications();
      if (granted) {
        toast.success('Böngésző értesítések bekapcsolva');
      } else {
        toast.error('Böngésző értesítések engedélyezése sikertelen. Ellenőrizd a böngésző beállításait.');
      }
    }
  };

  const handleToastNotificationToggle = async () => {
    if (toastNotificationsEnabled) {
      await disableToastNotifications();
      toast.success('Toast értesítések kikapcsolva');
    } else {
      await enableToastNotifications();
      toast.success('Toast értesítések bekapcsolva');
    }
  };

  const renderNotifications = () => (
    <div className="space-y-6">
      {/* WebSocket Connection Status */}
      <div className="p-4 rounded-lg border" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <Wifi size={20} className="text-green-500" />
            ) : (
              <WifiOff size={20} className="text-red-500" />
            )}
            <div>
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                WebSocket kapcsolat
              </h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {connectionStatus === 'connected' && 'Kapcsolódva - valós idejű frissítések aktívak'}
                {connectionStatus === 'connecting' && 'Kapcsolódás...'}
                {connectionStatus === 'reconnecting' && 'Újrakapcsolódás...'}
                {connectionStatus === 'disconnected' && 'Nincs kapcsolat'}
                {connectionStatus === 'failed' && 'Kapcsolódás sikertelen'}
              </p>
            </div>
          </div>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {isConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Browser Notifications */}
      <div className="p-4 rounded-lg border" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {browserNotificationsEnabled ? (
              <Bell size={20} style={{ color: 'var(--accent)' }} />
            ) : (
              <BellOff size={20} style={{ color: 'var(--text-secondary)' }} />
            )}
            <div>
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Böngésző értesítések
              </h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {notificationPermission === 'denied'
                  ? 'A böngésző blokkolja az értesítéseket. Engedélyezd a böngésző beállításaiban.'
                  : browserNotificationsEnabled
                  ? 'Értesítések megjelennek akkor is, ha az alkalmazás háttérben van'
                  : 'Kapj értesítéseket akkor is, ha az alkalmazás háttérben van'}
              </p>
            </div>
          </div>
          <button
            onClick={handleBrowserNotificationToggle}
            disabled={notificationPermission === 'denied'}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              notificationPermission === 'denied'
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : browserNotificationsEnabled
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : ''
            }`}
            style={
              notificationPermission !== 'denied' && !browserNotificationsEnabled
                ? { backgroundColor: 'var(--accent)', color: 'white' }
                : undefined
            }
          >
            {browserNotificationsEnabled ? 'Kikapcsolás' : 'Bekapcsolás'}
          </button>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="p-4 rounded-lg border" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare
              size={20}
              style={{ color: toastNotificationsEnabled ? 'var(--accent)' : 'var(--text-secondary)' }}
            />
            <div>
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Toast értesítések
              </h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {toastNotificationsEnabled
                  ? 'Felugró értesítések az alkalmazáson belül aktívak'
                  : 'Felugró értesítések kikapcsolva'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToastNotificationToggle}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              toastNotificationsEnabled
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : ''
            }`}
            style={
              !toastNotificationsEnabled
                ? { backgroundColor: 'var(--accent)', color: 'white' }
                : undefined
            }
          >
            {toastNotificationsEnabled ? 'Kikapcsolás' : 'Bekapcsolás'}
          </button>
        </div>
      </div>

      {/* Other notification settings */}
      <div className="space-y-3">
        <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
          Egyéb értesítések
        </h4>
        {[
          { key: 'notif_email', label: 'Email értesítések' },
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
    </div>
  );

  const renderKnowledge = () => {
    const knowledgeCount = knowledgeDocs.filter(d => d.is_knowledge).length;

    return (
      <div className="space-y-6">
        {/* Settings section */}
        <div className="space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Feldolgozási beállítások
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                data-testid="knowledge-chunk-size"
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
                data-testid="knowledge-chunk-overlap"
              />
            </div>
          </div>
        </div>

        {/* Documents section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Dokumentumok
            </h3>
            <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              {knowledgeCount} / {knowledgeDocs.length} a tudásbázisban
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Kattints a csillag ikonra a dokumentum tudásbázishoz adásához vagy eltávolításához.
          </p>

          {loadingKnowledge ? (
            <div className="text-center py-8">
              <Loader2 className="animate-spin mx-auto" size={24} style={{ color: 'var(--text-secondary)' }} />
              <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>Betöltés...</p>
            </div>
          ) : knowledgeDocs.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={48} className="mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>
                Még nincsenek dokumentumok. Tölts fel dokumentumokat a Dokumentumok oldalon.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto" data-testid="knowledge-documents-list">
              {knowledgeDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between px-3 py-2 rounded border transition-colors"
                  style={{
                    ...cardStyle,
                    backgroundColor: doc.is_knowledge ? 'var(--bg-secondary)' : 'var(--bg-card)',
                  }}
                  data-testid={`knowledge-doc-${doc.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(doc.file_type)}
                    <div className="flex-1 min-w-0">
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}
                        title={doc.original_filename}
                      >
                        {doc.original_filename}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatFileSize(doc.file_size)}
                        {doc.category && ` • ${doc.category}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleKnowledge(doc)}
                    disabled={togglingDocId === doc.id}
                    className={`p-2 rounded transition-colors ${
                      doc.is_knowledge
                        ? 'text-yellow-500 hover:bg-yellow-50'
                        : 'hover:bg-gray-500/10'
                    }`}
                    style={{
                      color: doc.is_knowledge ? '#eab308' : 'var(--text-secondary)',
                    }}
                    title={doc.is_knowledge ? 'Eltávolítás a tudásbázisból' : 'Hozzáadás a tudásbázishoz'}
                    data-testid={`knowledge-toggle-${doc.id}`}
                  >
                    {togglingDocId === doc.id ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Star size={20} fill={doc.is_knowledge ? 'currentColor' : 'none'} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

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
