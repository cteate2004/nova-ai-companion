import React, { useState, useEffect, useCallback } from 'react';

const CATEGORY_ORDER = ['personal', 'preference', 'work', 'interest', 'relationship', 'event'];
const CATEGORY_LABELS = {
  personal: 'Personal',
  preference: 'Preferences',
  work: 'Work',
  interest: 'Interests',
  relationship: 'Relationship',
  event: 'Events',
};

export default function MemoryScreen({ authToken, onBack }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState(null);

  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch('/api/memory', { headers });
      if (res.ok) {
        const data = await res.json();
        setMemories(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('[MemoryScreen] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const handleEdit = (memory) => {
    setEditingId(memory.id);
    setEditValue(memory.fact);
  };

  const handleSave = async (id) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    const prev = memories.find(m => m.id === id);
    if (prev && trimmed === prev.fact) { setEditingId(null); return; }

    setMemories(ms => ms.map(m => m.id === id ? { ...m, fact: trimmed } : m));
    setEditingId(null);
    try {
      const res = await fetch(`/api/memory/${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact: trimmed }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch (err) {
      console.error('[MemoryScreen] save error:', err);
      setError('Failed to save');
      fetchMemories();
      setTimeout(() => setError(null), 2000);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this memory?')) return;
    const prev = memories;
    setMemories(ms => ms.filter(m => m.id !== id));
    try {
      const res = await fetch(`/api/memory/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Delete failed');
    } catch (err) {
      console.error('[MemoryScreen] delete error:', err);
      setMemories(prev);
      setError('Failed to delete');
      setTimeout(() => setError(null), 2000);
    }
  };

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = memories.filter(m => m.category === cat);
    if (items.length > 0) acc.push({ category: cat, items });
    return acc;
  }, []);
  const knownCats = new Set(CATEGORY_ORDER);
  const uncategorized = memories.filter(m => !knownCats.has(m.category));
  if (uncategorized.length > 0) grouped.push({ category: 'other', items: uncategorized });

  return (
    <div className="screen-container">
      <div className="screen-header">
        <button className="memory-back-btn" onPointerDown={onBack}>{'\u2190'}</button>
        <h2>Nova's Memories</h2>
      </div>

      {error && <div className="memory-error">{error}</div>}

      {loading ? (
        <div className="screen-loading">Loading...</div>
      ) : memories.length === 0 ? (
        <div className="screen-empty">
          <div>{'\u{1F9E0}'}</div>
          <p>Nova hasn't learned anything about you yet</p>
          <p className="screen-empty-hint">Chat with Nova and she'll remember things naturally</p>
        </div>
      ) : (
        grouped.map(({ category, items }) => (
          <div key={category} className="task-group">
            <div className="section-title">{CATEGORY_LABELS[category] || category}</div>
            <div className="task-list-card">
              {items.map(m => (
                <div key={m.id} className="memory-item">
                  {editingId === m.id ? (
                    <input
                      className="memory-edit-input"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => handleSave(m.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSave(m.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <div className="memory-fact" onPointerDown={() => handleEdit(m)}>
                      {m.fact}
                    </div>
                  )}
                  <div className="memory-meta">
                    {new Date(m.created_at).toLocaleDateString()}
                  </div>
                  <button className="memory-delete-btn" onPointerDown={() => handleDelete(m.id)}>
                    {'\u00D7'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
      <div style={{ height: 24 }} />
    </div>
  );
}
