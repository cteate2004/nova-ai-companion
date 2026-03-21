const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'nova.db');

let db = null;

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fact TEXT NOT NULL,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_referenced DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      list_name TEXT DEFAULT 'todo',
      completed INTEGER DEFAULT 0,
      due_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      remind_at TEXT NOT NULL,
      sent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category TEXT DEFAULT 'other',
      description TEXT,
      date TEXT DEFAULT CURRENT_DATE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS scheduled_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      time TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      last_sent TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS mood_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mood TEXT NOT NULL,
      note TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS special_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      remind_days_before INTEGER DEFAULT 3
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  persist();
  console.log('[DB] SQLite initialized');
}

function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function saveMessage(sessionId, role, content) {
  db.run(
    'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)',
    [sessionId, role, content]
  );
  persist();
}

function getHistory(sessionId, limit = 50) {
  const stmt = db.prepare(
    'SELECT role, content, timestamp FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT ?'
  );
  stmt.bind([sessionId, limit]);

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();

  return rows.reverse();
}

function getRecentMessages(sessionId, limit = 10) {
  const rows = getHistory(sessionId, limit);
  return rows.map(r => ({ role: r.role, content: r.content }));
}

function getMessageCount(sessionId) {
  const stmt = db.prepare(
    'SELECT COUNT(*) as count FROM messages WHERE session_id = ?'
  );
  stmt.bind([sessionId]);
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();
  return result.count;
}

function saveMemory(fact, category) {
  db.run(
    'INSERT INTO memories (fact, category) VALUES (?, ?)',
    [fact, category]
  );
  persist();
}

function getMemories() {
  const stmt = db.prepare(
    'SELECT id, fact, category, created_at, last_referenced FROM memories ORDER BY created_at DESC'
  );

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();

  return rows;
}

function updateMemory(id, updates) {
  const allowed = ['fact', 'category'];
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return null;
  values.push(id);
  db.run(`UPDATE memories SET ${fields.join(', ')} WHERE id = ?`, values);
  persist();
  const stmt = db.prepare('SELECT id, fact, category, created_at, last_referenced FROM memories WHERE id = ?');
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

function deleteMemory(id) {
  db.run('DELETE FROM memories WHERE id = ?', [id]);
  persist();
}

// --- Tasks ---

function getTasks(listName) {
  let sql = 'SELECT * FROM tasks';
  const params = [];
  if (listName) {
    sql += ' WHERE list_name = ?';
    params.push(listName);
  }
  sql += ' ORDER BY created_at DESC';
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function createTask(title, listName, dueAt) {
  db.run(
    'INSERT INTO tasks (title, list_name, due_at) VALUES (?, ?, ?)',
    [title, listName || 'todo', dueAt || null]
  );
  persist();
  const stmt = db.prepare('SELECT * FROM tasks ORDER BY id DESC LIMIT 1');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

function updateTask(id, updates) {
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  if (fields.length === 0) return getTasks().find(t => t.id == id);
  values.push(id);
  db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
  persist();
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

function deleteTask(id) {
  db.run('DELETE FROM tasks WHERE id = ?', [id]);
  persist();
}

// --- Reminders ---

function getReminders(pendingOnly) {
  let sql = 'SELECT * FROM reminders';
  if (pendingOnly) sql += ' WHERE sent = 0';
  sql += ' ORDER BY remind_at ASC';
  console.log('[DB] getReminders called, db exists:', !!db, 'pendingOnly:', pendingOnly);
  const stmt = db.prepare(sql);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function createReminder(message, remindAt) {
  console.log('[DB] createReminder called, db exists:', !!db);
  db.run(
    'INSERT INTO reminders (message, remind_at) VALUES (?, ?)',
    [message, remindAt]
  );
  persist();
  const stmt = db.prepare('SELECT * FROM reminders ORDER BY id DESC LIMIT 1');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

function markReminderSent(id) {
  db.run('UPDATE reminders SET sent = 1 WHERE id = ?', [id]);
  persist();
}

function deleteReminder(id) {
  db.run('DELETE FROM reminders WHERE id = ?', [id]);
  persist();
}

// --- Expenses ---

function getExpenses(month) {
  let sql = 'SELECT * FROM expenses';
  const params = [];
  if (month) {
    sql += " WHERE strftime('%Y-%m', date) = ?";
    params.push(month);
  }
  sql += ' ORDER BY date DESC';
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function createExpense(amount, category, description) {
  db.run(
    'INSERT INTO expenses (amount, category, description) VALUES (?, ?, ?)',
    [amount, category || 'other', description || null]
  );
  persist();
  const stmt = db.prepare('SELECT * FROM expenses ORDER BY id DESC LIMIT 1');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

function getExpenseSummary(month) {
  let sql = "SELECT category, SUM(amount) as total FROM expenses";
  const params = [];
  if (month) {
    sql += " WHERE strftime('%Y-%m', date) = ?";
    params.push(month);
  }
  sql += ' GROUP BY category ORDER BY total DESC';
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// --- Scheduled Messages ---

function getScheduledMessages() {
  const stmt = db.prepare('SELECT * FROM scheduled_messages ORDER BY id ASC');
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function createScheduledMessage(type, time) {
  db.run(
    'INSERT INTO scheduled_messages (type, time) VALUES (?, ?)',
    [type, time]
  );
  persist();
  const stmt = db.prepare('SELECT * FROM scheduled_messages ORDER BY id DESC LIMIT 1');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

function updateScheduledMessage(id, updates) {
  // If time is being changed, reset last_sent so it fires at the new time today
  if (updates.time && !('last_sent' in updates)) {
    updates.last_sent = null;
  }
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  if (fields.length === 0) return null;
  values.push(id);
  db.run(`UPDATE scheduled_messages SET ${fields.join(', ')} WHERE id = ?`, values);
  persist();
  const stmt = db.prepare('SELECT * FROM scheduled_messages WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

// --- Mood Logs ---

function getMoodLogs(limit = 50) {
  const stmt = db.prepare('SELECT * FROM mood_logs ORDER BY timestamp DESC LIMIT ?');
  stmt.bind([limit]);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function createMoodLog(mood, note) {
  db.run(
    'INSERT INTO mood_logs (mood, note) VALUES (?, ?)',
    [mood, note || null]
  );
  persist();
  const stmt = db.prepare('SELECT * FROM mood_logs ORDER BY id DESC LIMIT 1');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

// --- Special Dates ---

function getSpecialDates() {
  const stmt = db.prepare('SELECT * FROM special_dates ORDER BY date ASC');
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function createSpecialDate(name, date, remindDaysBefore) {
  db.run(
    'INSERT INTO special_dates (name, date, remind_days_before) VALUES (?, ?, ?)',
    [name, date, remindDaysBefore != null ? remindDaysBefore : 3]
  );
  persist();
  const stmt = db.prepare('SELECT * FROM special_dates ORDER BY id DESC LIMIT 1');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

function deleteSpecialDate(id) {
  db.run('DELETE FROM special_dates WHERE id = ?', [id]);
  persist();
}

// --- Push Subscriptions ---

function getPushSubscriptions() {
  const stmt = db.prepare('SELECT * FROM push_subscriptions ORDER BY id ASC');
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function savePushSubscription(endpoint, p256dh, auth) {
  db.run(
    'INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)',
    [endpoint, p256dh, auth]
  );
  persist();
}

function deletePushSubscription(endpoint) {
  db.run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
  persist();
}

module.exports = {
  init,
  saveMessage,
  getHistory,
  getRecentMessages,
  getMessageCount,
  saveMemory,
  getMemories,
  updateMemory,
  deleteMemory,
  // Tasks
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  // Reminders
  getReminders,
  createReminder,
  markReminderSent,
  deleteReminder,
  // Expenses
  getExpenses,
  createExpense,
  getExpenseSummary,
  // Scheduled Messages
  getScheduledMessages,
  createScheduledMessage,
  updateScheduledMessage,
  // Mood Logs
  getMoodLogs,
  createMoodLog,
  // Special Dates
  getSpecialDates,
  createSpecialDate,
  deleteSpecialDate,
  // Push Subscriptions
  getPushSubscriptions,
  savePushSubscription,
  deletePushSubscription,
};
