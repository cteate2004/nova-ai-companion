import React from 'react';

export default function TasksScreen() {
  return (
    <div className="screen-container">
      <div className="screen-header">
        <h2>Tasks</h2>
      </div>
      <div className="screen-empty">
        <div>{'\u{1F4CB}'}</div>
        <p>No tasks yet</p>
        <p className="screen-empty-hint">Ask Nova to create tasks for you</p>
      </div>
    </div>
  );
}
