import React from 'react';

const TABS = [
  { id: 'home', label: 'Nova', icon: '\u{1F469}' },
  { id: 'chat', label: 'Chat', icon: '\u{1F4AC}' },
  { id: 'tasks', label: 'Tasks', icon: '\u{1F4CB}' },
  { id: 'alerts', label: 'Alerts', icon: '\u{1F514}' },
  { id: 'settings', label: 'Settings', icon: '\u2699\uFE0F' },
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
          <span className="tab-label">{tab.label}</span>
          {activeTab === tab.id && <span className="tab-indicator" />}
        </button>
      ))}
    </nav>
  );
}
