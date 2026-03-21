import React from 'react';

export default function AlertsScreen() {
  return (
    <div className="screen-container">
      <div className="screen-header">
        <h2>Alerts</h2>
      </div>
      <div className="screen-empty">
        <div>{'\u{1F514}'}</div>
        <p>No alerts</p>
        <p className="screen-empty-hint">Notifications and reminders will appear here</p>
      </div>
    </div>
  );
}
