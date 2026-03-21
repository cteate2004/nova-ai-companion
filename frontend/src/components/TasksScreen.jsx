import React, { useState, useEffect, useCallback } from 'react';
import TaskItem from './TaskItem';
import ReminderItem from './ReminderItem';

export default function TasksScreen({ authToken }) {
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskList, setNewTaskList] = useState('To-Do');

  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchAll = useCallback(async () => {
    try {
      const [tasksRes, remindersRes, expenseRes] = await Promise.all([
        fetch('/api/tasks', { headers }),
        fetch('/api/reminders?status=pending', { headers }),
        fetch('/api/expenses/summary', { headers }),
      ]);
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(Array.isArray(data) ? data : (data.tasks || []));
      }
      if (remindersRes.ok) {
        const data = await remindersRes.json();
        setReminders(Array.isArray(data) ? data : (data.reminders || []));
      }
      if (expenseRes.ok) {
        const data = await expenseRes.json();
        setExpenseSummary(data);
      }
    } catch (err) {
      console.error('[TasksScreen] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleToggle = async (id, completed) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
    } catch (err) {
      console.error('[TasksScreen] toggle error:', err);
      fetchAll(); // revert on error
    }
  };

  const handleDeleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE', headers });
    } catch (err) {
      console.error('[TasksScreen] delete task error:', err);
      fetchAll();
    }
  };

  const handleDeleteReminder = async (id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`/api/reminders/${id}`, { method: 'DELETE', headers });
    } catch (err) {
      console.error('[TasksScreen] delete reminder error:', err);
      fetchAll();
    }
  };

  const handleAddTask = async () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, list_name: newTaskList }),
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks(prev => [...prev, newTask.task || newTask]);
      }
    } catch (err) {
      console.error('[TasksScreen] add task error:', err);
    }
    setNewTaskTitle('');
    setShowAddTask(false);
  };

  // Group tasks by list_name
  const taskGroups = tasks.reduce((acc, task) => {
    const list = task.list_name || 'To-Do';
    if (!acc[list]) acc[list] = [];
    acc[list].push(task);
    return acc;
  }, {});

  const listNames = Object.keys(taskGroups);

  return (
    <div className="screen-container">
      <div className="screen-header">
        <h2>Tasks</h2>
      </div>

      {loading ? (
        <div className="screen-loading">Loading...</div>
      ) : (
        <>
          {/* Task Lists */}
          {listNames.length === 0 && reminders.length === 0 ? (
            <div className="screen-empty">
              <div>📋</div>
              <p>No tasks yet</p>
              <p className="screen-empty-hint">Tap + to add a task or ask Nova</p>
            </div>
          ) : (
            <>
              {listNames.map(listName => (
                <div key={listName} className="task-group">
                  <div className="section-title">{listName}</div>
                  <div className="task-list-card">
                    {taskGroups[listName].map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={handleToggle}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Reminders Section */}
          {reminders.length > 0 && (
            <div className="task-group">
              <div className="section-title">Reminders</div>
              <div className="task-list-card">
                {reminders.map(reminder => (
                  <ReminderItem
                    key={reminder.id}
                    reminder={reminder}
                    onDelete={handleDeleteReminder}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Expense Summary */}
          {expenseSummary && (
            <div className="task-group">
              <div className="section-title">Expenses</div>
              <div className="task-list-card">
                {expenseSummary.total !== undefined && (
                  <div className="settings-item">
                    <span className="settings-item-label">Total this month</span>
                    <span className="settings-item-value">
                      ${(expenseSummary.total || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                {Array.isArray(expenseSummary.by_category) && expenseSummary.by_category.map(cat => (
                  <div key={cat.category} className="settings-item">
                    <span className="settings-item-label">{cat.category}</span>
                    <span className="settings-item-value">${(cat.total || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Inline add task form */}
      {showAddTask && (
        <div className="task-add-overlay" onPointerDown={() => setShowAddTask(false)}>
          <div className="task-add-sheet" onPointerDown={e => e.stopPropagation()}>
            <div className="section-title" style={{ paddingTop: 12 }}>New Task</div>
            <div className="inline-add" style={{ flexDirection: 'column', gap: 10 }}>
              <input
                className="inline-input"
                placeholder="Task title…"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                autoFocus
              />
              <select
                className="inline-input"
                value={newTaskList}
                onChange={e => setNewTaskList(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="To-Do">To-Do</option>
                <option value="Shopping">Shopping</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="inline-submit"
                  style={{ flex: 1 }}
                  onPointerDown={handleAddTask}
                >
                  Add Task
                </button>
                <button
                  className="settings-btn"
                  style={{ flex: 1 }}
                  onPointerDown={() => setShowAddTask(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button className="fab" onPointerDown={() => setShowAddTask(true)} aria-label="Add task">
        +
      </button>
    </div>
  );
}
