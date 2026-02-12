import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { GripVertical, Trash2, Plus, Loader2 } from 'lucide-react';

const inputStyle = {
  backgroundColor: 'var(--bg-secondary)',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

const SubtaskTemplates = ({ processId, processName }) => {
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [adding, setAdding] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const loadSubtasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/v1/processes/${processId}/subtasks?include_inactive=true`);
      setSubtasks(res.data);
    } catch (err) {
      console.error('Error loading subtasks:', err);
    } finally {
      setLoading(false);
    }
  }, [processId]);

  useEffect(() => {
    loadSubtasks();
  }, [loadSubtasks]);

  const handleAdd = async () => {
    if (!newSubtaskName.trim()) return;
    setAdding(true);
    try {
      await api.post(`/v1/processes/${processId}/subtasks`, {
        process_type_id: processId,
        name: newSubtaskName,
      });
      setNewSubtaskName('');
      loadSubtasks();
      toast.success('Alfeladat sablon hozzáadva!');
    } catch (err) {
      console.error('Error adding subtask:', err);
      toast.error('Hiba az alfeladat hozzáadásakor!');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (id) => {
    try {
      await api.put(`/v1/processes/${processId}/subtasks/${id}`, editForm);
      setEditingId(null);
      loadSubtasks();
      toast.success('Alfeladat sablon frissítve!');
    } catch (err) {
      console.error('Error updating subtask:', err);
      toast.error('Hiba az alfeladat frissítésekor!');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/v1/processes/${processId}/subtasks/${id}`);
      loadSubtasks();
      if (res.data.deactivated) {
        toast.success('Alfeladat inaktiválva (van hozzá tartozó feladat)');
      } else {
        toast.success('Alfeladat sablon törölve!');
      }
    } catch (err) {
      console.error('Error deleting subtask:', err);
      toast.error('Hiba az alfeladat törlésekor!');
    }
  };

  const handleToggleActive = async (subtask) => {
    try {
      await api.put(`/v1/processes/${processId}/subtasks/${subtask.id}`, {
        is_active: !subtask.is_active,
      });
      loadSubtasks();
    } catch (err) {
      console.error('Error toggling subtask:', err);
    }
  };

  const handleDragStart = (idx) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...subtasks];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    setSubtasks(updated);
    setDragIdx(idx);
  };

  const handleDragEnd = async () => {
    setDragIdx(null);
    try {
      await api.put(`/v1/processes/${processId}/subtasks/reorder`, subtasks.map((s) => s.id));
    } catch (err) {
      console.error('Error reordering subtasks:', err);
      loadSubtasks();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 px-3">
        <Loader2 className="animate-spin" size={14} style={{ color: 'var(--text-secondary)' }} />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Betöltés...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Alfeladat sablonok ({subtasks.length})
        </span>
      </div>

      {/* Subtask list */}
      {subtasks.length > 0 && (
        <div className="space-y-1">
          {subtasks.map((subtask, idx) => (
            <div
              key={subtask.id}
              draggable={!editingId}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 px-2 py-1.5 rounded border text-sm ${
                !subtask.is_active ? 'opacity-50' : ''
              }`}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                opacity: dragIdx === idx ? 0.5 : subtask.is_active ? 1 : 0.5,
              }}
            >
              <GripVertical size={12} style={{ color: 'var(--text-secondary)', cursor: 'grab' }} />

              {editingId === subtask.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="px-2 py-0.5 rounded border flex-1 text-sm"
                    style={inputStyle}
                  />
                  <button
                    onClick={() => handleUpdate(subtask.id)}
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                  >
                    OK
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-2 py-0.5 rounded text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <span
                    className="flex-1 cursor-pointer"
                    style={{ color: 'var(--text-primary)' }}
                    onClick={() => {
                      setEditingId(subtask.id);
                      setEditForm({ name: subtask.name, description: subtask.description || '' });
                    }}
                  >
                    {subtask.name}
                  </span>
                  <button
                    onClick={() => handleToggleActive(subtask)}
                    className="p-0.5 rounded text-xs"
                    title={subtask.is_active ? 'Inaktiválás' : 'Aktiválás'}
                    style={{ color: subtask.is_active ? 'var(--success)' : 'var(--text-secondary)' }}
                  >
                    {subtask.is_active ? '✓' : '○'}
                  </button>
                  <button
                    onClick={() => handleDelete(subtask.id)}
                    className="p-0.5 rounded hover:bg-red-100 transition-colors"
                    title="Törlés"
                  >
                    <Trash2 size={12} className="text-red-500" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new subtask */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newSubtaskName}
          onChange={(e) => setNewSubtaskName(e.target.value)}
          placeholder="Új alfeladat sablon..."
          className="flex-1 px-2 py-1 rounded border text-sm"
          style={inputStyle}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newSubtaskName.trim()}
          className="px-2 py-1 rounded text-sm font-medium"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          <Plus size={14} />
        </button>
      </div>

      {subtasks.length === 0 && (
        <p className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>
          Adj hozzá alfeladat sablonokat, amik automatikusan létrejönnek a havi feladatoknál.
        </p>
      )}
    </div>
  );
};

export default SubtaskTemplates;
