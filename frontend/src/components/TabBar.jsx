import React from 'react';

const TABS = [
  { id: 'home', icon: '\u{1F469}' },
  { id: 'chat', icon: '\u{1F4AC}' },
  { id: 'tasks', icon: '\u{1F4CB}' },
  { id: 'grocery', icon: '\u{1F6D2}' },
  { id: 'alerts', icon: '\u{1F514}' },
  { id: 'settings', icon: '\u2699\uFE0F' },
];

export default function TabBar({ activeTab, onTabChange }) {
  return (
    <nav className="tab-bar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          onPointerDown={() => onTabChange(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          {activeTab === tab.id && <span className="tab-indicator" />}
        </button>
      ))}
    </nav>
  );
}
