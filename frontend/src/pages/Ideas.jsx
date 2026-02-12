import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1';

// Status workflow: Új → Átgondolva → Megvalósítva / Elvetve
const STATUSES = ['Új', 'Átgondolva', 'Megvalósítva', 'Elvetve'];
const PRIORITIES = ['Alacsony', 'Közepes', 'Magas', 'Kritikus'];

// Priority color mapping
const getPriorityColor = (priority) => {
  switch (priority) {
    case 'Kritikus':
      return 'var(--error)';
    case 'Magas':
      return 'var(--warning)';
    case 'Közepes':
      return 'var(--accent)';
    case 'Alacsony':
    default:
      return 'var(--success)';
  }
};

// Status color mapping
const getStatusColor = (status) => {
  switch (status) {
    case 'Új':
      return 'var(--accent)';
    case 'Átgondolva':
      return 'var(--warning)';
    case 'Megvalósítva':
      return 'var(--success)';
    case 'Elvetve':
      return 'var(--text-secondary)';
    default:
      return 'var(--text-secondary)';
  }
};

// Source badge
const SourceBadge = ({ source }) => {
  const isAI = source === 'ai';
  return (
    <span
      className="text-xs px-2 py-0.5 rounded"
      style={{
        backgroundColor: isAI ? 'var(--accent)' + '20' : 'var(--text-secondary)' + '20',
        color: isAI ? 'var(--accent)' : 'var(--text-secondary)',
      }}
    >
      {isAI ? 'AI' : 'Manuális'}
    </span>
  );
};

const Ideas = () => {
  const [ideas, setIdeas] = useState([]);
  const [processTypes, setProcessTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingIdea, setEditingIdea] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Közepes',
    process_type_id: null,
  });

  // Fetch ideas with filters
  const fetchIdeas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (sourceFilter) params.append('source', sourceFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await axios.get(`${API_BASE}/ideas?${params.toString()}`);
      setIdeas(response.data);
      setError(null);
    } catch (err) {
      setError('Hiba az ötletek betöltésekor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch process types for dropdown
  const fetchProcessTypes = async () => {
    try {
      const response = await axios.get(`${API_BASE}/processes/types`);
      setProcessTypes(response.data);
    } catch (err) {
      console.error('Error fetching process types:', err);
    }
  };

  useEffect(() => {
    fetchIdeas();
    fetchProcessTypes();
  }, [statusFilter, priorityFilter, sourceFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIdeas();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Create or update idea
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingIdea) {
        await axios.put(`${API_BASE}/ideas/${editingIdea.id}`, formData);
      } else {
        await axios.post(`${API_BASE}/ideas`, formData);
      }
      setShowModal(false);
      setEditingIdea(null);
      setFormData({ title: '', description: '', priority: 'Közepes', process_type_id: null });
      fetchIdeas();
    } catch (err) {
      console.error('Error saving idea:', err);
      setError('Hiba az ötlet mentésekor');
    }
  };

  // Delete idea
  const handleDelete = async (id) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt az ötletet?')) return;
    try {
      await axios.delete(`${API_BASE}/ideas/${id}`);
      fetchIdeas();
    } catch (err) {
      console.error('Error deleting idea:', err);
      setError('Hiba az ötlet törlésekor');
    }
  };

  // Update status
  const handleStatusChange = async (idea, newStatus) => {
    try {
      await axios.put(`${API_BASE}/ideas/${idea.id}`, { status: newStatus });
      fetchIdeas();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Hiba a státusz frissítésekor');
    }
  };

  // Generate AI ideas
  const handleGenerateIdeas = async () => {
    try {
      setGenerating(true);
      const response = await axios.post(`${API_BASE}/ideas/generate?max_ideas=5`);
      if (response.data.success) {
        fetchIdeas();
        alert(`${response.data.generated_count} új ötlet generálva!`);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      console.error('Error generating ideas:', err);
      setError('Hiba az ötletek generálásakor');
    } finally {
      setGenerating(false);
    }
  };

  // Open edit modal
  const openEditModal = (idea) => {
    setEditingIdea(idea);
    setFormData({
      title: idea.title,
      description: idea.description || '',
      priority: idea.priority,
      process_type_id: idea.process_type_id,
    });
    setShowModal(true);
  };

  // Open new idea modal
  const openNewModal = () => {
    setEditingIdea(null);
    setFormData({ title: '', description: '', priority: 'Közepes', process_type_id: null });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Ötletek & Javítások
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Workflow javítási javaslatok kezelése
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateIdeas}
            disabled={generating}
            className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
              opacity: generating ? 0.6 : 1,
            }}
          >
            {generating ? (
              <>
                <span className="animate-spin">⏳</span>
                Generálás...
              </>
            ) : (
              <>
                <span>🤖</span>
                AI Ötletek
              </>
            )}
          </button>
          <button
            onClick={openNewModal}
            className="px-4 py-2 rounded-lg flex items-center gap-2"
            style={{ backgroundColor: 'var(--success)', color: 'white' }}
          >
            <span>+</span>
            Új Ötlet
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="p-4 rounded-lg border"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              Keresés
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cím vagy leírás..."
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              Státusz
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">Mind</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              Prioritás
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">Mind</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Source filter */}
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              Forrás
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">Mind</option>
              <option value="manual">Manuális</option>
              <option value="ai">AI</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'var(--error)' + '20', color: 'var(--error)' }}
        >
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline">
            Bezár
          </button>
        </div>
      )}

      {/* Ideas Grid */}
      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
          Betöltés...
        </div>
      ) : ideas.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
          }}
        >
          <div className="text-4xl mb-4">💡</div>
          <p>Még nincsenek ötletek.</p>
          <p className="text-sm mt-2">Hozz létre egyet vagy generálj AI-val!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="rounded-lg border p-4 flex flex-col"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                borderLeftWidth: '4px',
                borderLeftColor: getPriorityColor(idea.priority),
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3
                  className="font-semibold text-lg leading-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {idea.title}
                </h3>
                <SourceBadge source={idea.source} />
              </div>

              {/* Description */}
              {idea.description && (
                <p
                  className="text-sm mb-3 flex-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {idea.description.length > 150
                    ? idea.description.substring(0, 150) + '...'
                    : idea.description}
                </p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {/* Status badge */}
                <span
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    backgroundColor: getStatusColor(idea.status) + '20',
                    color: getStatusColor(idea.status),
                  }}
                >
                  {idea.status}
                </span>

                {/* Priority badge */}
                <span
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    backgroundColor: getPriorityColor(idea.priority) + '20',
                    color: getPriorityColor(idea.priority),
                  }}
                >
                  {idea.priority}
                </span>

                {/* Process type badge */}
                {idea.process_type && (
                  <span
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {idea.process_type.name}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t pt-3 mt-auto" style={{ borderColor: 'var(--border-color)' }}>
                {/* Status dropdown */}
                <select
                  value={idea.status}
                  onChange={(e) => handleStatusChange(idea, e.target.value)}
                  className="text-sm px-2 py-1 rounded border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {/* Edit/Delete buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(idea)}
                    className="text-sm px-2 py-1 rounded"
                    style={{ color: 'var(--accent)' }}
                  >
                    Szerkesztés
                  </button>
                  <button
                    onClick={() => handleDelete(idea.id)}
                    className="text-sm px-2 py-1 rounded"
                    style={{ color: 'var(--error)' }}
                  >
                    Törlés
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="w-full max-w-lg mx-4 rounded-lg p-6"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {editingIdea ? 'Ötlet Szerkesztése' : 'Új Ötlet'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Cím *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Leírás
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Prioritás
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Process Type */}
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Kapcsolódó Folyamat
                </label>
                <select
                  value={formData.process_type_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      process_type_id: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="">Nincs kiválasztva</option>
                  {processTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                >
                  {editingIdea ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ideas;
