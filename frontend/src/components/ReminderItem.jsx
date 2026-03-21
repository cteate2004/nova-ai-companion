import React from 'react';

export default function ReminderItem({ reminder, onDelete }) {
  return (
    <div className="task-item">
      <div className="reminder-icon">🔔</div>
      <div className="task-content">
        <span className="task-title">{reminder.message}</span>
        {reminder.remind_at && (
          <span className="task-due">{new Date(reminder.remind_at).toLocaleString()}</span>
        )}
      </div>
      <button className="task-delete" onPointerDown={() => onDelete(reminder.id)}>×</button>
    </div>
  );
}
