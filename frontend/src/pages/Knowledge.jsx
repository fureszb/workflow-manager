import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const Knowledge = () => {
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [knowledgeLog, setKnowledgeLog] = useState([]);
  const [personalityLog, setPersonalityLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents');
  const [removingDocId, setRemovingDocId] = useState(null);

  // RAG Debug state
  const [ragStatus, setRagStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedDocChunks, setSelectedDocChunks] = useState(null);
  const [loadingChunks, setLoadingChunks] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, docsRes, logRes, personalityRes, ragStatusRes] = await Promise.all([
        api.get('/v1/ai/knowledge-stats'),
        api.get('/v1/ai/knowledge-documents'),
        api.get('/v1/ai/knowledge-log?limit=50'),
        api.get('/v1/ai/personality-log?limit=50'),
        api.get('/v1/rag-debug/status').catch(() => null), // RAG debug might not be available
      ]);

      setStats(statsRes.data);
      setDocuments(docsRes.data);
      setKnowledgeLog(logRes.data);
      setPersonalityLog(personalityRes.data);
      if (ragStatusRes) {
        setRagStatus(ragStatusRes.data);
      }
    } catch (error) {
      console.error('Error fetching knowledge data:', error);
      toast.error('Hiba az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDocument = async (docId) => {
    if (!confirm('Biztosan eltávolítja ezt a dokumentumot a tudásbázisból?')) return;

    setRemovingDocId(docId);
    try {
      await api.delete(`/v1/ai/knowledge-documents/${docId}`);
      toast.success('Dokumentum sikeresen eltávolítva!');
      fetchData();
    } catch (error) {
      console.error('Error removing document:', error);
      toast.error(error.response?.data?.detail || 'Hiba történt a dokumentum eltávolításakor');
    } finally {
      setRemovingDocId(null);
    }
  };

  const handleTestSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Adjon meg egy keresési kifejezést');
      return;
    }

    setSearching(true);
    try {
      const res = await api.post('/v1/rag-debug/test-search', {}, {
        params: { query: searchQuery, k: 5, min_score: 0.0 }
      });
      setSearchResults(res.data);
    } catch (error) {
      console.error('Error testing search:', error);
      toast.error('Hiba a keresés során');
    } finally {
      setSearching(false);
    }
  };

  const handleViewChunks = async (docId) => {
    setLoadingChunks(true);
    try {
      const res = await api.get(`/v1/rag-debug/chunks/${docId}`);
      setSelectedDocChunks(res.data);
    } catch (error) {
      console.error('Error loading chunks:', error);
      toast.error('Hiba a chunk-ok betöltésekor');
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleReindexDocument = async (docId) => {
    if (!confirm('Újraindexálja ezt a dokumentumot?')) return;
    try {
      const res = await api.post(`/v1/rag-debug/reindex-document/${docId}`);
      if (res.data.success) {
        toast.success(`${res.data.chunks_created} chunk indexelve`);
        fetchData();
      } else {
        toast.error(res.data.error || 'Hiba az indexelés során');
      }
    } catch (error) {
      toast.error('Hiba az indexelés során');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('hu-HU');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getActionBadge = (action) => {
    const colors = {
      added: { bg: 'var(--success)', text: '#fff' },
      removed: { bg: 'var(--danger)', text: '#fff' },
    };
    const color = colors[action] || { bg: 'var(--text-secondary)', text: '#fff' };
    return (
      <span
        className="px-2 py-1 rounded text-xs font-medium"
        style={{ backgroundColor: color.bg, color: color.text }}
      >
        {action === 'added' ? 'Hozzáadva' : action === 'removed' ? 'Eltávolítva' : action}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const colors = {
      completed: { bg: 'var(--success)', text: '#fff' },
      partial: { bg: 'var(--warning)', text: '#000' },
      failed: { bg: 'var(--danger)', text: '#fff' },
      pending: { bg: 'var(--text-secondary)', text: '#fff' },
    };
    const color = colors[status] || { bg: 'var(--text-secondary)', text: '#fff' };
    const labels = {
      completed: 'Sikeres',
      partial: 'Részleges',
      failed: 'Sikertelen',
      pending: 'Folyamatban',
    };
    return (
      <span
        className="px-2 py-1 rounded text-xs font-medium"
        style={{ backgroundColor: color.bg, color: color.text }}
      >
        {labels[status] || status}
      </span>
    );
  };

  const getFieldLabel = (field) => {
    const labels = {
      name: 'Név',
      system_prompt: 'Rendszer prompt',
      tone: 'Hangnem',
      expertise: 'Szakterület',
      language: 'Nyelv',
      is_active: 'Aktív',
      created: 'Létrehozva',
    };
    return labels[field] || field;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            AI Tudásbázis & Tanulás Monitor
          </h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            Az AI tudásbázis dokumentumainak és tanulási naplójának áttekintése
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded-lg font-medium transition-colors"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          Frissítés
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          className="rounded-lg p-4 border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="text-3xl mb-1" style={{ color: 'var(--accent)' }}>
            {stats?.total_documents || 0}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Dokumentum a tudásbázisban
          </div>
        </div>

        <div
          className="rounded-lg p-4 border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="text-3xl mb-1" style={{ color: 'var(--success)' }}>
            {stats?.total_chunks || 0}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Szövegrészlet (chunk)
          </div>
        </div>

        <div
          className="rounded-lg p-4 border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="text-3xl mb-1" style={{ color: 'var(--warning)' }}>
            {stats?.total_vectors || 0}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Vektor a FAISS indexben
          </div>
        </div>

        <div
          className="rounded-lg p-4 border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
            {stats?.last_update ? formatDate(stats.last_update) : 'Nincs adat'}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Utolsó frissítés
          </div>
        </div>
      </div>

      {/* Documents by Type */}
      {stats?.documents_by_type && Object.keys(stats.documents_by_type).length > 0 && (
        <div
          className="rounded-lg p-4 border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Dokumentumok típus szerint
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.documents_by_type).map(([type, count]) => (
              <div
                key={type}
                className="px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {type.toUpperCase()}
                </span>
                <span className="ml-2" style={{ color: 'var(--text-secondary)' }}>
                  {count} db
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex gap-4">
          {[
            { id: 'documents', label: 'Tudásbázis dokumentumok' },
            { id: 'rag-debug', label: 'RAG Debug & Keresés' },
            { id: 'learning-log', label: 'Tanulási napló' },
            { id: 'personality-log', label: 'Személyiség változások' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-current' : 'border-transparent'
              }`}
              style={{
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div>
            {documents.length === 0 ? (
              <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                Nincs dokumentum a tudásbázisban. A Dokumentumok oldalon jelölje meg a kívánt fájlokat tudásbázis dokumentumnak.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Fájlnév
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Típus
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Méret
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Kategória
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Chunk-ok
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Hozzáadva
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Művelet
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-t"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                        {doc.original_filename}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium uppercase"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                        >
                          {doc.file_type || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {formatFileSize(doc.file_size)}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {doc.category || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="px-2 py-1 rounded text-sm font-medium"
                          style={{ backgroundColor: 'var(--accent)20', color: 'var(--accent)' }}
                        >
                          {doc.chunk_count}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(doc.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRemoveDocument(doc.id)}
                          disabled={removingDocId === doc.id}
                          className="px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
                          style={{ backgroundColor: 'var(--danger)', color: '#fff' }}
                        >
                          {removingDocId === doc.id ? 'Eltávolítás...' : 'Eltávolítás'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* RAG Debug Tab */}
        {activeTab === 'rag-debug' && ragStatus && (
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Index Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded p-3 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                  {ragStatus.indexed_documents}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Indexelt dokumenumok</div>
              </div>
              <div className="rounded p-3 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                  {ragStatus.total_chunks}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Chunks összesen</div>
              </div>
              <div className="rounded p-3 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                  {ragStatus.total_vectors}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Vektorok</div>
              </div>
              <div className="rounded p-3 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <div className="text-sm" style={{ color: 'var(--accent)' }}>
                  {ragStatus.faiss_dimension || 'N/A'}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Dimenzió</div>
              </div>
            </div>

            {/* Test Search Form */}
            <div>
              <h4 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>🔍 Test Search</h4>
              <form onSubmit={handleTestSearch} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Keresési kifejezés..."
                  className="flex-1 px-3 py-2 text-sm rounded border"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                />
                <button type="submit" disabled={searching} className="px-4 py-2 text-sm rounded font-medium" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                  {searching ? '...' : 'OK'}
                </button>
              </form>

              {searchResults && (
                <div className="bg-opacity-50 p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {searchResults.results_count} találat
                  </div>
                  {searchResults.results.map((r, i) => (
                    <div key={i} className="text-xs p-2 mb-2 rounded border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }} >
                      <div style={{ color: 'var(--text-primary)' }}>
                        <strong>{r.document_filename}</strong> (#{r.chunk_index}, score: {(r.score*100).toFixed(0)}%)
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }} className="mt-1">
                        {r.content_preview}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Learning Log Tab */}
        {activeTab === 'learning-log' && (
          <div>
            {knowledgeLog.length === 0 ? (
              <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                Nincs bejegyzés a tanulási naplóban.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Időpont
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Művelet
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Dokumentum
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Chunk-ok
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Státusz
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Hiba
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {knowledgeLog.map((log) => (
                    <tr
                      key={log.id}
                      className="border-t"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                        {log.document_filename || `#${log.document_id || '-'}`}
                      </td>
                      <td className="px-4 py-3 text-center" style={{ color: 'var(--text-primary)' }}>
                        {log.chunks_processed}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--danger)' }}>
                        {log.error_message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Personality Log Tab */}
        {activeTab === 'personality-log' && (
          <div>
            {personalityLog.length === 0 ? (
              <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                Nincs bejegyzés a személyiség változások naplójában.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Időpont
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Szolgáltató
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Módosított mező
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Régi érték
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Új érték
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {personalityLog.map((log) => (
                    <tr
                      key={log.id}
                      className="border-t"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium uppercase"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                        >
                          {log.provider}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                        {getFieldLabel(log.field_changed)}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        <span className="line-clamp-2" title={log.old_value || '-'}>
                          {log.old_value ? (log.old_value.length > 50 ? log.old_value.slice(0, 50) + '...' : log.old_value) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                        <span className="line-clamp-2" title={log.new_value || '-'}>
                          {log.new_value ? (log.new_value.length > 50 ? log.new_value.slice(0, 50) + '...' : log.new_value) : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Knowledge;
