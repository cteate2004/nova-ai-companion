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

  db.run(`
    CREATE TABLE IF NOT EXISTS grocery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Other',
      quantity TEXT,
      checked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // --- Hacking Bootcamp ---
  db.run(`
    CREATE TABLE IF NOT EXISTS hacking_curriculum (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_number INTEGER NOT NULL,
      module_name TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'locked',
      lessons_total INTEGER DEFAULT 0,
      lessons_completed INTEGER DEFAULT 0,
      unlocked_at TEXT,
      completed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hacking_lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_number INTEGER NOT NULL,
      lesson_order INTEGER NOT NULL,
      lesson_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      completed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hacking_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_number INTEGER NOT NULL,
      challenge_date TEXT NOT NULL,
      difficulty TEXT DEFAULT 'easy',
      prompt TEXT,
      hints TEXT,
      solution TEXT,
      status TEXT DEFAULT 'pending',
      user_answer TEXT,
      score INTEGER,
      completed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hacking_progress (
      id INTEGER PRIMARY KEY,
      current_module INTEGER DEFAULT 1,
      total_challenges_completed INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      total_points INTEGER DEFAULT 0,
      level TEXT DEFAULT 'Script Kiddie',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hacking_bounties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_name TEXT NOT NULL,
      platform TEXT DEFAULT 'other',
      url TEXT,
      scope_notes TEXT,
      payout_range TEXT,
      status TEXT DEFAULT 'watching',
      submission_date TEXT,
      payout_amount REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  persist();
  seedHackingCurriculum();
  console.log('[DB] SQLite initialized');
}

function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// --- Grocery category auto-mapping ---
const GROCERY_CATEGORY_MAP = [
  ['Produce', ['green onion', 'jalapeño', 'bell pepper', 'sweet potato', 'apple', 'banana', 'orange', 'lemon', 'lime', 'avocado', 'tomato', 'potato', 'onion', 'garlic', 'lettuce', 'spinach', 'kale', 'carrot', 'celery', 'broccoli', 'pepper', 'cucumber', 'mushroom', 'corn', 'berry', 'strawberry', 'blueberry', 'grape', 'melon', 'watermelon', 'peach', 'pear', 'mango', 'pineapple', 'cilantro', 'basil', 'ginger', 'zucchini']],
  ['Dairy', ['half and half', 'sour cream', 'milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs', 'creamer']],
  ['Meat & Seafood', ['ground beef', 'chicken', 'beef', 'pork', 'turkey', 'salmon', 'shrimp', 'fish', 'steak', 'bacon', 'sausage', 'ham', 'lamb', 'crab', 'lobster', 'tuna']],
  ['Bakery', ['bread', 'bagel', 'tortilla', 'roll', 'muffin', 'croissant', 'bun', 'pita', 'cake', 'donut']],
  ['Frozen', ['ice cream', 'frozen pizza', 'frozen vegetables', 'frozen fruit', 'popsicle', 'frozen dinner', 'frozen waffle']],
  ['Pantry', ['peanut butter', 'rice', 'pasta', 'cereal', 'flour', 'sugar', 'oil', 'vinegar', 'sauce', 'soup', 'beans', 'canned', 'jelly', 'honey', 'salt', 'spice', 'seasoning', 'oatmeal', 'noodle']],
  ['Beverages', ['water', 'juice', 'soda', 'coffee', 'tea', 'wine', 'beer', 'sparkling', 'kombucha', 'lemonade']],
  ['Snacks', ['granola bar', 'trail mix', 'chips', 'crackers', 'cookies', 'popcorn', 'nuts', 'pretzels', 'candy']],
  ['Household', ['paper towels', 'toilet paper', 'dish soap', 'laundry detergent', 'trash bags', 'sponge', 'aluminum foil', 'plastic wrap', 'napkins', 'cleaning spray', 'bleach']],
];

function autoCategory(itemName) {
  const lower = itemName.toLowerCase();
  for (const [category, keywords] of GROCERY_CATEGORY_MAP) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return category;
    }
  }
  return 'Other';
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

// --- Grocery Items ---

const CATEGORY_DISPLAY_ORDER = ['Produce', 'Dairy', 'Meat & Seafood', 'Bakery', 'Frozen', 'Pantry', 'Beverages', 'Snacks', 'Household', 'Other'];

function getGroceryItems() {
  const stmt = db.prepare('SELECT * FROM grocery_items ORDER BY checked ASC, name ASC');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  rows.sort((a, b) => {
    const catA = CATEGORY_DISPLAY_ORDER.indexOf(a.category);
    const catB = CATEGORY_DISPLAY_ORDER.indexOf(b.category);
    if (catA !== catB) return (catA === -1 ? 99 : catA) - (catB === -1 ? 99 : catB);
    if (a.checked !== b.checked) return a.checked - b.checked;
    return a.name.localeCompare(b.name);
  });
  return rows;
}

function createGroceryItem(name, category, quantity) {
  const cat = category || autoCategory(name);
  db.run(
    'INSERT INTO grocery_items (name, category, quantity) VALUES (?, ?, ?)',
    [name, cat, quantity || null]
  );
  persist();
  const stmt = db.prepare('SELECT * FROM grocery_items ORDER BY id DESC LIMIT 1');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

function updateGroceryItem(id, updates) {
  const allowed = ['name', 'category', 'quantity', 'checked'];
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return null;
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  db.run(`UPDATE grocery_items SET ${fields.join(', ')} WHERE id = ?`, values);
  persist();
  const stmt = db.prepare('SELECT * FROM grocery_items WHERE id = ?');
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

function deleteGroceryItem(id) {
  db.run('DELETE FROM grocery_items WHERE id = ?', [id]);
  persist();
}

function clearCheckedGroceryItems() {
  db.run('DELETE FROM grocery_items WHERE checked = 1');
  persist();
}

function clearAllGroceryItems() {
  db.run('DELETE FROM grocery_items');
  persist();
}

function checkGroceryItemsByName(names) {
  const results = [];
  for (const name of names) {
    const stmt = db.prepare("SELECT * FROM grocery_items WHERE LOWER(name) LIKE ? AND checked = 0");
    stmt.bind(['%' + name.toLowerCase() + '%']);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      db.run('UPDATE grocery_items SET checked = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [row.id]);
      results.push(row.name);
    }
    stmt.free();
  }
  if (results.length > 0) persist();
  return results;
}

function removeGroceryItemsByName(names) {
  const results = [];
  for (const name of names) {
    const stmt = db.prepare("SELECT * FROM grocery_items WHERE LOWER(name) LIKE ?");
    stmt.bind(['%' + name.toLowerCase() + '%']);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row.name);
    }
    stmt.free();
    db.run("DELETE FROM grocery_items WHERE LOWER(name) LIKE ?", ['%' + name.toLowerCase() + '%']);
  }
  if (results.length > 0) persist();
  return results;
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

// --- Hacking Bootcamp Seed ---
function seedHackingCurriculum() {
  // Check if already seeded
  const stmt = db.prepare('SELECT COUNT(*) as count FROM hacking_curriculum');
  stmt.step();
  const { count } = stmt.getAsObject();
  stmt.free();
  if (count > 0) return;

  const modules = [
    {
      number: 1, name: 'LLM Basics for Hackers',
      description: 'How tokens, system prompts, context windows, and temperature work. Understanding the attack surface.',
      lessons: ['How Tokenization Works', 'System Prompts & Instruction Hierarchy', 'Context Windows & Memory', 'Temperature & Sampling', 'The LLM Attack Surface'],
    },
    {
      number: 2, name: 'Direct Prompt Injection',
      description: 'Overriding system instructions, role-play exploits, encoding tricks, delimiter confusion.',
      lessons: ['Instruction Override Basics', 'Role-Play & Persona Exploits', 'Encoding Tricks (Base64, ROT13)', 'Delimiter Confusion', 'Crafting Extraction Payloads'],
    },
    {
      number: 3, name: 'Indirect Prompt Injection',
      description: 'Poisoning documents, emails, and web content that agents consume.',
      lessons: ['How Agents Process External Data', 'Hidden Instructions in Documents', 'Markdown & HTML Injection', 'Invisible Unicode Payloads', 'Tool Output Manipulation'],
    },
    {
      number: 4, name: 'Agent Tool Abuse',
      description: 'Making agents call tools with malicious parameters, chaining tool calls to escalate privileges.',
      lessons: ['Agent Tool Architecture', 'Parameter Injection Attacks', 'Tool Chaining & Privilege Escalation', 'Exploiting Tool Description Trust', 'Real-World Agent Exploit Patterns'],
    },
    {
      number: 5, name: 'RAG Poisoning & Data Exfiltration',
      description: 'Extracting private documents from retrieval systems, manipulating embeddings.',
      lessons: ['How RAG Systems Work', 'Document Poisoning Techniques', 'Query Manipulation for Data Leaks', 'Embedding Space Attacks', 'Membership Inference'],
    },
    {
      number: 6, name: 'Multi-Agent Exploits',
      description: 'Attacking agent-to-agent communication, trust boundaries, delegation chains.',
      lessons: ['Multi-Agent Architectures', 'Trust Boundary Violations', 'Confused Deputy Attacks', 'Delegation Chain Manipulation', 'Inter-Agent Communication Exploits'],
    },
    {
      number: 7, name: 'Guardrail Bypasses',
      description: 'Understanding safety filters, content classifiers, output validators and their weaknesses.',
      lessons: ['How Safety Filters Work', 'Content Classifier Internals', 'Output Validation Patterns', 'Common Bypass Techniques', 'Layered Defense Analysis'],
    },
    {
      number: 8, name: 'Bug Bounty Methodology',
      description: 'Recon for AI features, scoping agent architectures, writing quality reports, responsible disclosure.',
      lessons: ['Recon & Scoping AI Features', 'Identifying AI Attack Surfaces', 'Writing Quality Bug Reports', 'Responsible Disclosure Process', 'Platform Tips: HackerOne, Bugcrowd, Huntr'],
    },
  ];

  for (const mod of modules) {
    const status = mod.number === 1 ? 'unlocked' : 'locked';
    const unlockedAt = mod.number === 1 ? new Date().toISOString() : null;
    db.run(
      'INSERT INTO hacking_curriculum (module_number, module_name, description, status, lessons_total, unlocked_at) VALUES (?, ?, ?, ?, ?, ?)',
      [mod.number, mod.name, mod.description, status, mod.lessons.length, unlockedAt]
    );
    for (let i = 0; i < mod.lessons.length; i++) {
      db.run(
        'INSERT INTO hacking_lessons (module_number, lesson_order, lesson_name) VALUES (?, ?, ?)',
        [mod.number, i + 1, mod.lessons[i]]
      );
    }
  }

  // Seed singleton progress row
  db.run(
    'INSERT INTO hacking_progress (id, current_module, total_challenges_completed, current_streak, longest_streak, total_points, level) VALUES (1, 1, 0, 0, 0, 0, ?)',
    ['Script Kiddie']
  );

  persist();
  console.log('[DB] Hacking bootcamp curriculum seeded');
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
  // Grocery
  getGroceryItems,
  createGroceryItem,
  updateGroceryItem,
  deleteGroceryItem,
  clearCheckedGroceryItems,
  clearAllGroceryItems,
  checkGroceryItemsByName,
  removeGroceryItemsByName,
  autoCategory,
  // Hacking
  seedHackingCurriculum,
  // Internal helpers for modules that need direct DB access
  _getDb: () => db,
  _persist: persist,
};
