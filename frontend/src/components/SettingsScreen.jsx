import React from 'react';

export default function SettingsScreen() {
  return (
    <div className="screen-container">
      <div className="screen-header">
        <h2>Settings</h2>
      </div>
      <div className="screen-empty">
        <div>{'\u2699\uFE0F'}</div>
        <p>Settings coming soon</p>
        <p className="screen-empty-hint">Customize your Nova experience</p>
      </div>
    </div>
  );
}
