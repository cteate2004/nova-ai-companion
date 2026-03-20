import React from 'react';

export default function StatusBar({ connected, emotion }) {
  return (
    <div className="status-bar">
      <span className={`status-dot ${connected ? 'connected' : 'error'}`} />
      <span>{connected ? 'Connected' : 'Disconnected'}</span>
      {emotion && emotion !== 'neutral' && (
        <>
          <span style={{ color: 'var(--text-dim)' }}>|</span>
          <span className="status-emotion">{emotion}</span>
        </>
      )}
    </div>
  );
}
