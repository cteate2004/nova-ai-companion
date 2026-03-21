import React from 'react';
import Avatar from './Avatar';

export default function HomeScreen({ emotion, isBlinking, mouthOpen, messages, onTabChange, onMicToggle, connected }) {
  const lastNovaMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.content);

  return (
    <div className="screen-container home-screen">
      <div className="home-hero">
        <div className="home-avatar-wrapper">
          <Avatar emotion={emotion} isBlinking={isBlinking} mouthOpen={mouthOpen} size="hero" />
        </div>
        <div className="home-name">Nova</div>
        <div className="home-status">
          <span className={`status-dot ${connected ? 'online' : ''}`} />
          {connected ? 'Online' : 'Offline'}
          {emotion && emotion !== 'neutral' && (
            <span style={{ color: 'var(--accent)', textTransform: 'capitalize' }}>{emotion}</span>
          )}
        </div>
      </div>

      <div className="home-actions">
        <button className="home-action-btn" onPointerDown={onMicToggle}>
          <span className="home-action-icon">{'\u{1F3A4}'}</span>
          <span className="home-action-label">Voice</span>
        </button>
        <button className="home-action-btn" onPointerDown={() => onTabChange('chat')}>
          <span className="home-action-icon">{'\u{1F4AC}'}</span>
          <span className="home-action-label">Chat</span>
        </button>
        <button className="home-action-btn" onPointerDown={() => onTabChange('chat')}>
          <span className="home-action-icon">{'\u{1F4F7}'}</span>
          <span className="home-action-label">Photo</span>
        </button>
      </div>

      {lastNovaMsg && (
        <div className="home-card">
          <span className="home-card-label">Last message</span>
          <span className="home-card-text">
            {lastNovaMsg.content.length > 120
              ? lastNovaMsg.content.slice(0, 120) + '...'
              : lastNovaMsg.content}
          </span>
        </div>
      )}
    </div>
  );
}
