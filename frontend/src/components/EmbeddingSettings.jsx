import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const inputStyle = {
  backgroundColor: 'var(--bg-secondary)',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

const cardStyle = {
  backgroundColor: 'var(--bg-card)',
  borderColor: 'var(--border-color)',
};

const EmbeddingSettings = () => {
  const [settings, setSettings] = useState(null);
  const [provider, setProvider] = useState('ollama');
  const [model, setModel] = useState('bge-m3');
  const [apiKey, setApiKey] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [testingOpenRouter, setTestingOpenRouter] = useState(false);
  const [checkingOllama, setCheckingOllama] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reindexNeeded, setReindexNeeded] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  // ── Beállítások betöltése ──
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/v1/settings/embedding/config');
      setSettings(res.data);
      setProvider(res.data.provider);
      setModel(res.data.model);
      setReindexNeeded(false);
    } catch (err) {
      console.error('Error loading embedding settings:', err);
      toast.error('Hiba az embedding beállítások betöltésekor');
    }
  };

  // ── Ollama modellek ellenőrzése ──
  const checkOllama = async () => {
    setCheckingOllama(true);
    try {
      const res = await api.get('/v1/settings/embedding/check-ollama');
      if (res.data.status === 'ok') {
        setOllamaStatus(res.data);
        toast.success('Ollama modellek ellenőrizve!');
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error('Nem lehet csatlakozni az Ollama szerverhez');
    } finally {
      setCheckingOllama(false);
    }
  };

  // ── OpenRouter kulcs tesztelése ──
  const testOpenRouter = async () => {
    if (!apiKey.trim()) {
      toast.error('Írd be az OpenRouter API kulcsot');
      return;
    }

    setTestingOpenRouter(true);
    try {
      const res = await api.post('/v1/settings/embedding/test-openrouter', null, {
        params: { api_key: apiKey },
      });
      if (res.data.status === 'ok') {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error('Hiba az OpenRouter API kulcs tesztelése során');
    } finally {
      setTestingOpenRouter(false);
    }
  };

  // ── Mentés ──
  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await api.put('/v1/settings/embedding/config', {
        provider,
        model,
        openrouter_api_key: apiKey || undefined,
      });

      if (res.data.reindex_required) {
        setReindexNeeded(true);
      }
      toast.success(res.data.message);
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
        'Hiba a beállítások mentése során'
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Újraindexelés ──
  const reindexAll = async () => {
    if (!confirm(
      '⚠️ Ez MINDEN dokumentumot újraindexel!\n'
      + 'Ez eltarthat néhány percig. Folytatod?'
    )) return;

    setReindexing(true);
    try {
      const res = await api.post('/v1/documents/reindex-all');
      toast.success(
        `✅ Kész!\n`
        + `Dokumentumok: ${res.data.documents_processed}\n`
        + `Chunk-ok: ${res.data.total_chunks}`
      );
      setReindexNeeded(false);
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
        'Hiba az újraindexelés során'
      );
    } finally {
      setReindexing(false);
    }
  };

  if (!settings) {
    return (
      <div className="text-center py-8">
        <Loader2 className="animate-spin mx-auto" size={24} style={{ color: 'var(--text-secondary)' }} />
        <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>Betöltés...</p>
      </div>
    );
  }

  const availableModels = settings.available_models[provider] || {};

  return (
    <div className="space-y-6">
      {/* ── Provider választó ── */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Embedding Provider:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              provider === 'ollama'
                ? 'border-blue-500 bg-blue-50'
                : 'hover:border-gray-400'
            }`}
            style={provider === 'ollama' ? {} : cardStyle}
            onClick={() => {
              setProvider('ollama');
              setModel('bge-m3');
            }}
          >
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              🖥️ Lokális (Ollama)
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Ingyenes, adatok helyben maradnak
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Saját gépen fut
            </p>
          </div>

          <div
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              provider === 'openrouter'
                ? 'border-blue-500 bg-blue-50'
                : 'hover:border-gray-400'
            }`}
            style={provider === 'openrouter' ? {} : cardStyle}
            onClick={() => {
              setProvider('openrouter');
              setModel('text-embedding-3-small');
            }}
          >
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              ☁️ API (OpenRouter)
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Legjobb minőség, fizetős
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              ~$0.02 / 1M token
            </p>
          </div>
        </div>
      </div>

      {/* ── Modell választó ── */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Embedding Modell:
        </label>
        <div className="space-y-2">
          {Object.entries(availableModels).map(([id, config]) => (
            <div
              key={id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                model === id
                  ? 'border-blue-500 bg-blue-50'
                  : 'hover:border-gray-400'
              }`}
              style={model === id ? {} : cardStyle}
              onClick={() => setModel(id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {config.name}
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {config.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    <span>📐 {config.dimension} dim</span>
                    <span>⚡ {config.speed}</span>
                    <span>Magyar: {config.quality_hu}</span>
                    {config.price && <span>💰 {config.price}</span>}
                    {config.size !== 'API' && <span>💾 {config.size}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {provider === 'ollama' && ollamaStatus?.models?.[id] && (
                    <span
                      className="text-xs font-medium px-2 py-1 rounded"
                      style={{
                        backgroundColor: ollamaStatus.models[id].installed
                          ? '#dcfce7'
                          : '#fee2e2',
                        color: ollamaStatus.models[id].installed
                          ? '#166534'
                          : '#991b1b',
                      }}
                    >
                      {ollamaStatus.models[id].installed
                        ? '✅ Telepítve'
                        : '❌ Nincs kész'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── OpenRouter: API kulcs ── */}
      {provider === 'openrouter' && (
        <div className="space-y-3 p-4 rounded-lg border" style={cardStyle}>
          <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            OpenRouter API kulcs:
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-..."
              className="flex-1 px-3 py-2 rounded border"
              style={inputStyle}
            />
            <button
              onClick={testOpenRouter}
              disabled={testingOpenRouter}
              className="px-3 py-2 rounded border transition-colors"
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {testingOpenRouter ? '⏳' : '🧪'}
            </button>
          </div>
          {settings.has_openrouter_key && !apiKey && (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              ✅ Korábban már be lett állítva API kulcs.
            </p>
          )}
        </div>
      )}

      {/* ── Ollama: modell check & Mentés ── */}
      <div className="flex justify-between items-center gap-2">
        <div>
          {provider === 'ollama' && (
            <button
              onClick={checkOllama}
              disabled={checkingOllama}
              className="px-4 py-2 rounded font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              {checkingOllama ? '🔄 Ellenőrzés...' : '🔍 Ollama modellek ellenőrzése'}
            </button>
          )}
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-4 py-2 rounded font-medium transition-colors"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          {saving ? '💾 Mentés...' : '💾 Beállítások Mentése'}
        </button>
      </div>

      {/* ── Újraindexelés figyelmeztetés ── */}
      {reindexNeeded && (
        <div className="p-4 rounded-lg border" style={{
          backgroundColor: '#fffbeb',
          borderColor: '#fbbf24',
        }}>
          <div className="flex gap-3">
            <AlertCircle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <div>
              <h3 className="font-semibold" style={{ color: '#92400e' }}>
                ⚠️ Újraindexelés szükséges!
              </h3>
              <p className="text-sm mt-1" style={{ color: '#92400e' }}>
                A provider vagy modell megváltozott.
                A dokumentumokat újra kell indexelni,
                hogy a keresés megfelelően működjön.
              </p>
              <button
                onClick={reindexAll}
                disabled={reindexing}
                className="mt-3 px-4 py-2 rounded font-medium transition-colors"
                style={{ backgroundColor: '#f59e0b', color: 'white' }}
              >
                {reindexing
                  ? '🔄 Újraindexelés folyamatban...'
                  : '🔄 Összes dokumentum újraindexelése'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbeddingSettings;
