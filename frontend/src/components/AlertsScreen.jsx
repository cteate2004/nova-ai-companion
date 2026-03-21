import React, { useState, useEffect, useCallback } from 'react';

export default function AlertsScreen({ authToken }) {
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [specialDates, setSpecialDates] = useState([]);
  const [moodHistory, setMoodHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add special date form state
  const [newDateName, setNewDateName] = useState('');
  const [newDateValue, setNewDateValue] = useState('');
  const [newDateDaysBefore, setNewDateDaysBefore] = useState('3');

  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchAll = useCallback(async () => {
    try {
      const [smRes, sdRes, moodRes] = await Promise.all([
        fetch('/api/scheduled-messages', { headers }),
        fetch('/api/special-dates', { headers }),
        fetch('/api/mood?limit=10', { headers }),
      ]);
      if (smRes.ok) {
        const data = await smRes.json();
        setScheduledMessages(Array.isArray(data) ? data : (data.messages || []));
      }
      if (sdRes.ok) {
        const data = await sdRes.json();
        setSpecialDates(Array.isArray(data) ? data : (data.dates || []));
      }
      if (moodRes.ok) {
        const data = await moodRes.json();
        setMoodHistory(Array.isArray(data) ? data : (data.entries || []));
      }
    } catch (err) {
      console.error('[AlertsScreen] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // --- Scheduled Messages ---
  const getMsg = (type) => scheduledMessages.find(m => m.type === type);

  const handleToggleScheduled = async (type, currentEnabled, currentTime) => {
    const existing = getMsg(type);
    try {
      if (existing) {
        const res = await fetch(`/api/scheduled-messages/${existing.id}`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: !currentEnabled }),
        });
        if (res.ok) {
          const updated = await res.json();
          setScheduledMessages(prev =>
            prev.map(m => m.id === existing.id ? (updated.message || updated) : m)
          );
        }
      } else {
        // Create new
        const res = await fetch('/api/scheduled-messages', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, enabled: true, send_time: currentTime || '08:00' }),
        });
        if (res.ok) {
          const created = await res.json();
          setScheduledMessages(prev => [...prev, created.message || created]);
        }
      }
    } catch (err) {
      console.error('[AlertsScreen] toggle scheduled error:', err);
    }
  };

  const handleTimeChange = async (type, newTime) => {
    const existing = getMsg(type);
    if (!existing) return;
    try {
      const res = await fetch(`/api/scheduled-messages/${existing.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ send_time: newTime }),
      });
      if (res.ok) {
        const updated = await res.json();
        setScheduledMessages(prev =>
          prev.map(m => m.id === existing.id ? (updated.message || updated) : m)
        );
      }
    } catch (err) {
      console.error('[AlertsScreen] time change error:', err);
    }
  };

  // --- Special Dates ---
  const handleAddDate = async () => {
    const name = newDateName.trim();
    const date = newDateValue.trim();
    if (!name || !date) return;
    try {
      const res = await fetch('/api/special-dates', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date, days_before: parseInt(newDateDaysBefore) || 3 }),
      });
      if (res.ok) {
        const created = await res.json();
        setSpecialDates(prev => [...prev, created.date || created]);
        setNewDateName('');
        setNewDateValue('');
        setNewDateDaysBefore('3');
      }
    } catch (err) {
      console.error('[AlertsScreen] add date error:', err);
    }
  };

  const handleDeleteDate = async (id) => {
    setSpecialDates(prev => prev.filter(d => d.id !== id));
    try {
      await fetch(`/api/special-dates/${id}`, { method: 'DELETE', headers });
    } catch (err) {
      console.error('[AlertsScreen] delete date error:', err);
      fetchAll();
    }
  };

  // Mood emoji helper
  const moodEmoji = (mood) => {
    const map = { happy: '😊', sad: '😢', angry: '😠', anxious: '😰', excited: '🤩', calm: '😌', tired: '😴', neutral: '😐' };
    return map[mood] || '💭';
  };

  const morningMsg = getMsg('good_morning');
  const nightMsg = getMsg('good_night');

  return (
    <div className="screen-container">
      <div className="screen-header">
        <h2>Alerts</h2>
      </div>

      {loading ? (
        <div className="screen-loading">Loading...</div>
      ) : (
        <>
          {/* Scheduled Messages */}
          <div className="section-title">Scheduled Messages</div>
          <div className="task-list-card">
            {/* Good Morning */}
            <div className="toggle-row">
              <span className="toggle-label">Good Morning 🌅</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {morningMsg?.enabled && (
                  <input
                    type="time"
                    className="time-input"
                    value={morningMsg?.send_time || '08:00'}
                    onChange={e => handleTimeChange('good_morning', e.target.value)}
                  />
                )}
                <button
                  className={`toggle-switch ${morningMsg?.enabled ? 'on' : ''}`}
                  onPointerDown={() => handleToggleScheduled('good_morning', morningMsg?.enabled, morningMsg?.send_time)}
                  aria-label="Toggle good morning message"
                />
              </div>
            </div>

            {/* Good Night */}
            <div className="toggle-row">
              <span className="toggle-label">Good Night 🌙</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {nightMsg?.enabled && (
                  <input
                    type="time"
                    className="time-input"
                    value={nightMsg?.send_time || '22:00'}
                    onChange={e => handleTimeChange('good_night', e.target.value)}
                  />
                )}
                <button
                  className={`toggle-switch ${nightMsg?.enabled ? 'on' : ''}`}
                  onPointerDown={() => handleToggleScheduled('good_night', nightMsg?.enabled, nightMsg?.send_time)}
                  aria-label="Toggle good night message"
                />
              </div>
            </div>
          </div>

          {/* Special Dates */}
          <div className="section-title">Special Dates</div>
          <div className="task-list-card">
            {specialDates.length === 0 ? (
              <div style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
                No special dates added yet
              </div>
            ) : (
              specialDates.map(sd => (
                <div key={sd.id} className="date-item">
                  <div className="date-info">
                    <div className="date-name">{sd.name}</div>
                    <div className="date-detail">
                      {sd.date}
                      {sd.days_before != null && ` · Remind ${sd.days_before}d before`}
                    </div>
                  </div>
                  <button className="task-delete" onPointerDown={() => handleDeleteDate(sd.id)}>×</button>
                </div>
              ))
            )}

            {/* Add form */}
            <div className="inline-add" style={{ flexDirection: 'column', gap: 8 }}>
              <input
                className="inline-input"
                placeholder="Event name (e.g. Birthday)"
                value={newDateName}
                onChange={e => setNewDateName(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="date"
                  className="inline-input"
                  value={newDateValue}
                  onChange={e => setNewDateValue(e.target.value)}
                  style={{ flex: 2 }}
                />
                <input
                  type="number"
                  className="inline-input"
                  placeholder="Days before"
                  value={newDateDaysBefore}
                  onChange={e => setNewDateDaysBefore(e.target.value)}
                  min="0"
                  max="30"
                  style={{ flex: 1 }}
                />
              </div>
              <button className="inline-submit" onPointerDown={handleAddDate}>
                Add Date
              </button>
            </div>
          </div>

          {/* Mood History */}
          <div className="section-title">Mood History</div>
          <div className="task-list-card">
            {moodHistory.length === 0 ? (
              <div style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
                No mood entries yet
              </div>
            ) : (
              moodHistory.map(entry => (
                <div key={entry.id} className="mood-entry">
                  <span className="mood-emoji">{moodEmoji(entry.mood)}</span>
                  <span className="mood-text">{entry.mood}{entry.note ? ` — ${entry.note}` : ''}</span>
                  <span className="mood-time">
                    {entry.recorded_at ? new Date(entry.recorded_at).toLocaleString() : ''}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Bottom padding so last card isn't hidden behind FAB area */}
          <div style={{ height: 24 }} />
        </>
      )}
    </div>
  );
}
