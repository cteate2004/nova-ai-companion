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
    'SELECT fact, category, created_at FROM memories ORDER BY created_at DESC'
  );

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();

  return rows;
}

module.exports = {
  init,
  saveMessage,
  getHistory,
  getRecentMessages,
  getMessageCount,
  saveMemory,
  getMemories,
};
