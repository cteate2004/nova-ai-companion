import React from 'react';

export default function TaskItem({ task, onToggle, onDelete }) {
  return (
    <div className={`task-item ${task.completed ? 'completed' : ''}`}>
      <button className="task-checkbox" onPointerDown={() => onToggle(task.id, !task.completed)}>
        {task.completed ? '✓' : ''}
      </button>
      <div className="task-content">
        <span className="task-title">{task.title}</span>
        {task.due_at && <span className="task-due">{new Date(task.due_at).toLocaleString()}</span>}
      </div>
      <button className="task-delete" onPointerDown={() => onDelete(task.id)}>×</button>
    </div>
  );
}
