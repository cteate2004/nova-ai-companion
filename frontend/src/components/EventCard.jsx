import React, { useState, useEffect } from 'react';

export default function EventCard({ authToken }) {
  const [reminder, setReminder] = useState(null);

  useEffect(() => {
    fetch('/api/reminders', { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json())
      .then(reminders => {
        const upcoming = reminders
          .filter(r => !r.sent && new Date(r.remind_at) > new Date())
          .sort((a, b) => new Date(a.remind_at) - new Date(b.remind_at))[0];
        setReminder(upcoming);
      })
      .catch(() => {});
  }, [authToken]);

  if (!reminder) return null;

  return (
    <div className="home-card">
      <span className="home-card-label">⏰ Coming up</span>
      <p className="home-card-text">{reminder.message}</p>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
        {new Date(reminder.remind_at).toLocaleString()}
      </span>
    </div>
  );
}
