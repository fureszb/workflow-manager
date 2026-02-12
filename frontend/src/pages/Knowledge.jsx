import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000/api/v1';

const Knowledge = () => {
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [knowledgeLog, setKnowledgeLog] = useState([]);
  const [personalityLog, setPersonalityLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents');
  const [removingDocId, setRemovingDocId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, docsRes, logRes, personalityRes] = await Promise.all([
        fetch(`${API_BASE}/ai/knowledge-stats`),
        fetch(`${API_BASE}/ai/knowledge-documents`),
        fetch(`${API_BASE}/ai/knowledge-log?limit=50`),
        fetch(`${API_BASE}/ai/personality-log?limit=50`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (docsRes.ok) setDocuments(await docsRes.json());
      if (logRes.ok) setKnowledgeLog(await logRes.json());
      if (personalityRes.ok) setPersonalityLog(await personalityRes.json());
    } catch (error) {
      console.error('Error fetching knowledge data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDocument = async (docId) => {
    if (!confirm('Biztosan eltávolítja ezt a dokumentumot a tudásbázisból?')) return;

    setRemovingDocId(docId);
    try {
      const response = await fetch(`${API_BASE}/ai/knowledge-documents/${docId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh data
        fetchData();
      } else {
        const error = await response.json();
        alert(`Hiba: ${error.detail || 'Nem sikerült eltávolítani a dokumentumot'}`);
      }
    } catch (error) {
      console.error('Error removing document:', error);
      alert('Hiba történt a dokumentum eltávolításakor');
    } finally {
      setRemovingDocId(null);
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
