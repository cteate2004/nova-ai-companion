# Grocery List, Memory Management & TTS Emoji Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a grocery list feature with categorized items and chat integration, a memory management sub-screen in Settings, and strip emojis from TTS output.

**Architecture:** Three independent features sharing the existing Express + sql.js + React stack. Grocery list gets a new DB table, API routes, Claude tools, and a dedicated tab. Memory management adds edit/delete to the existing memories system with a new Settings sub-screen. TTS fix is a one-line backend change.

**Tech Stack:** Node.js/Express, sql.js, React, Claude API tool use, Web Share API, `window.print()`

**Specs:**
- `docs/superpowers/specs/2026-03-21-grocery-list-design.md`
- `docs/superpowers/specs/2026-03-21-memory-management-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `backend/database.js` | Add grocery_items table + CRUD, fix getMemories, add updateMemory/deleteMemory |
| `backend/server.js` | Add /api/grocery routes, /api/memory PATCH/DELETE, stripEmojis in TTS |
| `backend/claude.js` | Add 4 grocery tools + executeTool cases |
| `frontend/src/App.jsx` | Add Grocery tab, settings sub-screen routing |
| `frontend/src/components/TabBar.jsx` | Add Grocery tab, remove labels for 6-tab fit |
| `frontend/src/components/GroceryScreen.jsx` | New — full grocery list UI |
| `frontend/src/components/MemoryScreen.jsx` | New — memory management sub-screen |
| `frontend/src/components/SettingsScreen.jsx` | Add "Manage Memories" button |
| `frontend/src/styles/global.css` | Grocery styles, memory styles, print styles |

---

## Task 1: TTS Emoji Stripping

**Files:**
- Modify: `backend/server.js:176-202`

- [ ] **Step 1: Add stripEmojis function and apply in TTS route**

In `backend/server.js`, add the function before the TTS route (around line 176):

```js
function stripEmojis(text) {
  return text.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s{2,}/g, ' ').trim();
}
```

Then change line 186 from:
```js
body: JSON.stringify({ text, voice }),
```
to:
```js
body: JSON.stringify({ text: stripEmojis(text), voice }),
```

- [ ] **Step 2: Verify**

Run: `node -e "function stripEmojis(t){return t.replace(/\p{Extended_Pictographic}/gu,'').replace(/\s{2,}/g,' ').trim()} console.log(stripEmojis('Good morning! \\u2600\\uFE0F Hope you have an amazing day \\u{1F49C}'))"`

Expected: `Good morning! Hope you have an amazing day`

- [ ] **Step 3: Commit**

```bash
git add backend/server.js
git commit -m "fix: strip emojis from TTS text so Nova doesn't read emoji names"
```

---

## Task 2: Memory Management Backend

**Files:**
- Modify: `backend/database.js:164-176` (fix getMemories)
- Modify: `backend/database.js:455-492` (add exports)
- Modify: `backend/server.js:131-135` (add routes after existing GET)

- [ ] **Step 1: Fix getMemories to include id**

In `backend/database.js`, change line 166 from:
```js
'SELECT fact, category, created_at FROM memories ORDER BY created_at DESC'
```
to:
```js
'SELECT id, fact, category, created_at, last_referenced FROM memories ORDER BY created_at DESC'
```

- [ ] **Step 2: Add updateMemory and deleteMemory functions**

In `backend/database.js`, after the `getMemories()` function (after line 176), add:

```js
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
```

- [ ] **Step 3: Export the new functions**

In `backend/database.js`, in the `module.exports` object, after `getMemories,` add:
```js
updateMemory,
deleteMemory,
```

- [ ] **Step 4: Add API routes**

In `backend/server.js`, after the existing `GET /api/memory` route (after line 135), add:

```js
app.patch('/api/memory/:id', (req, res) => {
  const { fact, category } = req.body;
  if (fact !== undefined && !fact.trim()) {
    return res.status(400).json({ error: 'fact cannot be empty' });
  }
  const updates = {};
  if (fact !== undefined) updates.fact = fact.trim();
  if (category !== undefined) updates.category = category;
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }
  const result = db.updateMemory(req.params.id, updates);
  if (!result) return res.status(404).json({ error: 'Memory not found' });
  res.json(result);
});

app.delete('/api/memory/:id', (req, res) => {
  db.deleteMemory(req.params.id);
  res.json({ ok: true });
});
```

- [ ] **Step 5: Verify**

Restart the server and test:
```bash
curl -s -H "Authorization: Bearer $(cat /tmp/nova-token 2>/dev/null || echo test)" http://localhost:8000/api/memory | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)[0]))"
```

Confirm the response includes `id` field.

- [ ] **Step 6: Commit**

```bash
git add backend/database.js backend/server.js
git commit -m "feat: memory management backend — fix getMemories, add update/delete API"
```

---

## Task 3: Memory Management Frontend

**Files:**
- Create: `frontend/src/components/MemoryScreen.jsx`
- Modify: `frontend/src/components/SettingsScreen.jsx`
- Modify: `frontend/src/App.jsx:45-154`
- Modify: `frontend/src/styles/global.css`

- [ ] **Step 1: Create MemoryScreen.jsx**

Create `frontend/src/components/MemoryScreen.jsx`:

```jsx
import React, { useState, useEffect, useCallback } from 'react';

const CATEGORY_ORDER = ['personal', 'preference', 'work', 'interest', 'relationship', 'event'];
const CATEGORY_LABELS = {
  personal: 'Personal',
  preference: 'Preferences',
  work: 'Work',
  interest: 'Interests',
  relationship: 'Relationship',
  event: 'Events',
};

export default function MemoryScreen({ authToken, onBack }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState(null);

  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch('/api/memory', { headers });
      if (res.ok) {
        const data = await res.json();
        setMemories(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('[MemoryScreen] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const handleEdit = (memory) => {
    setEditingId(memory.id);
    setEditValue(memory.fact);
  };

  const handleSave = async (id) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    const prev = memories.find(m => m.id === id);
    if (prev && trimmed === prev.fact) { setEditingId(null); return; }

    setMemories(ms => ms.map(m => m.id === id ? { ...m, fact: trimmed } : m));
    setEditingId(null);
    try {
      const res = await fetch(`/api/memory/${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact: trimmed }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch (err) {
      console.error('[MemoryScreen] save error:', err);
      setError('Failed to save');
      fetchMemories();
      setTimeout(() => setError(null), 2000);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this memory?')) return;
    const prev = memories;
    setMemories(ms => ms.filter(m => m.id !== id));
    try {
      const res = await fetch(`/api/memory/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Delete failed');
    } catch (err) {
      console.error('[MemoryScreen] delete error:', err);
      setMemories(prev);
      setError('Failed to delete');
      setTimeout(() => setError(null), 2000);
    }
  };

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = memories.filter(m => m.category === cat);
    if (items.length > 0) acc.push({ category: cat, items });
    return acc;
  }, []);
  // Catch uncategorized
  const knownCats = new Set(CATEGORY_ORDER);
  const uncategorized = memories.filter(m => !knownCats.has(m.category));
  if (uncategorized.length > 0) grouped.push({ category: 'other', items: uncategorized });

  return (
    <div className="screen-container">
      <div className="screen-header">
        <button className="memory-back-btn" onPointerDown={onBack}>{'\u2190'}</button>
        <h2>Nova's Memories</h2>
      </div>

      {error && <div className="memory-error">{error}</div>}

      {loading ? (
        <div className="screen-loading">Loading...</div>
      ) : memories.length === 0 ? (
        <div className="screen-empty">
          <div>{'\u{1F9E0}'}</div>
          <p>Nova hasn't learned anything about you yet</p>
          <p className="screen-empty-hint">Chat with Nova and she'll remember things naturally</p>
        </div>
      ) : (
        grouped.map(({ category, items }) => (
          <div key={category} className="task-group">
            <div className="section-title">{CATEGORY_LABELS[category] || category}</div>
            <div className="task-list-card">
              {items.map(m => (
                <div key={m.id} className="memory-item">
                  {editingId === m.id ? (
                    <input
                      className="memory-edit-input"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => handleSave(m.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSave(m.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <div className="memory-fact" onPointerDown={() => handleEdit(m)}>
                      {m.fact}
                    </div>
                  )}
                  <div className="memory-meta">
                    {new Date(m.created_at).toLocaleDateString()}
                  </div>
                  <button className="memory-delete-btn" onPointerDown={() => handleDelete(m.id)}>
                    {'\u00D7'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
      <div style={{ height: 24 }} />
    </div>
  );
}
```

- [ ] **Step 2: Add "Manage Memories" button to SettingsScreen**

In `frontend/src/components/SettingsScreen.jsx`:

1. Change the function signature on line 61 from:
```js
export default function SettingsScreen({ authToken }) {
```
to:
```js
export default function SettingsScreen({ authToken, onNavigate }) {
```

2. Add memory count state and fetch. After the `locationSaved` state (line 67), add:
```js
const [memoryCount, setMemoryCount] = useState(0);
```

3. Inside the `useEffect` on line 84, after `fetchGoogleStatus();`, add:
```js
fetch('/api/memory', { headers }).then(r => r.json()).then(d => setMemoryCount(Array.isArray(d) ? d.length : 0)).catch(() => {});
```

4. Before the `{/* About */}` comment (line 237), add:
```jsx
{/* Memories */}
<div className="section-title">Memories</div>
<div className="task-list-card settings-group">
  <div className="settings-item">
    <button
      className="settings-btn"
      onPointerDown={() => onNavigate && onNavigate('memory')}
    >
      Manage Memories ({memoryCount})
    </button>
  </div>
  <div className="settings-item">
    <span className="settings-item-label" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
      View and edit what Nova remembers about you
    </span>
  </div>
</div>
```

- [ ] **Step 3: Add sub-screen routing in App.jsx**

In `frontend/src/App.jsx`:

1. Add import at line 7 (after SettingsScreen import):
```js
import MemoryScreen from './components/MemoryScreen';
```

2. In the `NovaApp` function, after `const [activeTab, setActiveTab] = useState('home');` (line 46), add:
```js
const [settingsSubScreen, setSettingsSubScreen] = useState(null);
```

3. Add an effect to reset sub-screen when tab changes. After the existing `useEffect` blocks (around line 99), add:
```js
useEffect(() => {
  setSettingsSubScreen(null);
}, [activeTab]);
```

4. In `renderScreen()`, change the `case 'settings':` block (line 140-141) from:
```js
case 'settings':
  return <SettingsScreen authToken={authToken} />;
```
to:
```js
case 'settings':
  if (settingsSubScreen === 'memory') {
    return <MemoryScreen authToken={authToken} onBack={() => setSettingsSubScreen(null)} />;
  }
  return <SettingsScreen authToken={authToken} onNavigate={setSettingsSubScreen} />;
```

- [ ] **Step 4: Add memory screen CSS**

In `frontend/src/styles/global.css`, add at the end:

```css
/* === Memory Screen === */
.memory-back-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 24px;
  cursor: pointer;
  padding: 0 12px 0 0;
  line-height: 1;
}
.memory-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.memory-item:last-child { border-bottom: none; }
.memory-fact {
  flex: 1;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  min-height: 20px;
}
.memory-edit-input {
  flex: 1;
  background: rgba(255,255,255,0.08);
  border: 1px solid var(--accent);
  border-radius: 6px;
  color: var(--text);
  font-size: 14px;
  padding: 6px 8px;
  outline: none;
}
.memory-meta {
  color: var(--text-muted);
  font-size: 11px;
  white-space: nowrap;
}
.memory-delete-btn {
  background: none;
  border: none;
  color: rgba(255,100,100,0.7);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.memory-error {
  background: rgba(255,80,80,0.15);
  color: #ff6b6b;
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  margin: 8px 0;
  font-size: 13px;
}
```

- [ ] **Step 5: Build and verify**

```bash
cd /opt/nova/frontend && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/MemoryScreen.jsx frontend/src/components/SettingsScreen.jsx frontend/src/App.jsx frontend/src/styles/global.css
git commit -m "feat: memory management screen — view, edit, delete Nova's memories from Settings"
```

---

## Task 4: Grocery List Backend — Database

**Files:**
- Modify: `backend/database.js`

- [ ] **Step 1: Add grocery_items table creation**

In `backend/database.js`, after the `push_subscriptions` table creation (after line 106), add:

```js
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
```

- [ ] **Step 2: Add category auto-mapping**

After the `persist()` function (after line 115), add the category keyword map:

```js
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
  // Check multi-word keywords first (longest match wins), then single-word
  for (const [category, keywords] of GROCERY_CATEGORY_MAP) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return category;
    }
  }
  return 'Other';
}
```

Note: Within each category array, multi-word keywords are listed before single-word ones so they match first.

- [ ] **Step 3: Add CRUD functions**

After the `autoCategory` function, add:

```js
const CATEGORY_DISPLAY_ORDER = ['Produce', 'Dairy', 'Meat & Seafood', 'Bakery', 'Frozen', 'Pantry', 'Beverages', 'Snacks', 'Household', 'Other'];

function getGroceryItems() {
  const stmt = db.prepare('SELECT * FROM grocery_items ORDER BY checked ASC, name ASC');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  // Sort by category display order, then checked, then name
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
```

- [ ] **Step 4: Export the new functions**

In the `module.exports` object in `backend/database.js`, add after the Push Subscriptions exports:

```js
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
```

- [ ] **Step 5: Commit**

```bash
git add backend/database.js
git commit -m "feat: grocery list database — table, CRUD, category auto-mapping"
```

---

## Task 5: Grocery List Backend — API Routes

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Add grocery API routes**

In `backend/server.js`, before the `// ===== Push Subscriptions =====` section (before line 326), add:

```js
// ===== Grocery =====
app.get('/api/grocery', (req, res) => {
  res.json(db.getGroceryItems());
});
app.post('/api/grocery/clear-checked', (req, res) => {
  db.clearCheckedGroceryItems();
  res.json({ ok: true });
});
app.post('/api/grocery/clear-all', (req, res) => {
  db.clearAllGroceryItems();
  res.json({ ok: true });
});
app.post('/api/grocery', (req, res) => {
  const { name, category, quantity } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
  res.json(db.createGroceryItem(name.trim(), category, quantity));
});
app.patch('/api/grocery/:id', (req, res) => {
  const result = db.updateGroceryItem(req.params.id, req.body);
  if (!result) return res.status(404).json({ error: 'Item not found' });
  res.json(result);
});
app.delete('/api/grocery/:id', (req, res) => {
  db.deleteGroceryItem(req.params.id);
  res.json({ ok: true });
});
```

Note: `clear-checked` and `clear-all` routes are registered BEFORE the `/:id` route to avoid param conflicts.

- [ ] **Step 2: Commit**

```bash
git add backend/server.js
git commit -m "feat: grocery list API routes"
```

---

## Task 6: Grocery List — Claude Chat Integration

**Files:**
- Modify: `backend/claude.js:41` (system prompt)
- Modify: `backend/claude.js:43-187` (ALWAYS_TOOLS)
- Modify: `backend/claude.js:286-334` (executeTool)

- [ ] **Step 1: Update system prompt**

In `backend/claude.js`, change line 41 from:
```js
You also have tools for managing tasks, reminders, expenses, weather, restaurant search, web search, mood tracking, and special dates. Use them naturally when the conversation calls for it. When the user mentions spending money, log it. When they share feelings, log the mood. When they mention an important date, save it.`;
```
to:
```js
You also have tools for managing tasks, reminders, expenses, weather, restaurant search, web search, mood tracking, special dates, and grocery list. Use them naturally when the conversation calls for it. When the user mentions spending money, log it. When they share feelings, log the mood. When they mention an important date, save it. When the user wants to add items to their grocery list, use the grocery tools.`;
```

- [ ] **Step 2: Add grocery tool definitions**

In `backend/claude.js`, in the `ALWAYS_TOOLS` array, before the closing `];` (before line 187), add:

```js
{
  name: 'add_grocery_items',
  description: 'Add items to the grocery list. Auto-categorizes based on item name if no category provided.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Item name' },
            quantity: { type: 'string', description: 'Optional quantity/unit (e.g. "2 lbs", "1 gallon")' },
            category: { type: 'string', description: 'Optional category override: Produce, Dairy, Meat & Seafood, Bakery, Frozen, Pantry, Beverages, Snacks, Household, Other' },
          },
          required: ['name'],
        },
      },
    },
    required: ['items'],
  },
},
{
  name: 'check_grocery_items',
  description: 'Check off (mark as done) items from the grocery list by name. Use when user says they got an item.',
  input_schema: {
    type: 'object',
    properties: {
      items: { type: 'array', items: { type: 'string' }, description: 'Item names to check off' },
    },
    required: ['items'],
  },
},
{
  name: 'remove_grocery_items',
  description: 'Remove items from the grocery list by name.',
  input_schema: {
    type: 'object',
    properties: {
      items: { type: 'array', items: { type: 'string' }, description: 'Item names to remove' },
    },
    required: ['items'],
  },
},
{
  name: 'get_grocery_list',
  description: 'Get the current grocery list grouped by category.',
  input_schema: { type: 'object', properties: {} },
},
```

- [ ] **Step 3: Add executeTool cases**

In `backend/claude.js`, in the `executeTool` function's first `switch` block, before `case 'create_special_date':` (before line 332), add:

```js
case 'add_grocery_items': {
  const added = [];
  for (const item of input.items) {
    const result = db.createGroceryItem(item.name, item.category, item.quantity);
    added.push({ name: result.name, category: result.category });
  }
  return { added };
}
case 'check_grocery_items': {
  const checked = db.checkGroceryItemsByName(input.items);
  return { checked };
}
case 'remove_grocery_items': {
  const removed = db.removeGroceryItemsByName(input.items);
  return { removed };
}
case 'get_grocery_list':
  return db.getGroceryItems();
```

- [ ] **Step 4: Commit**

```bash
git add backend/claude.js
git commit -m "feat: grocery list Claude tools — add, check, remove, get via chat"
```

---

## Task 7: Grocery List Frontend — Tab Bar & App.jsx

**Files:**
- Modify: `frontend/src/components/TabBar.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add Grocery tab to TabBar**

In `frontend/src/components/TabBar.jsx`, replace the `TABS` array (lines 3-9) with:

```js
const TABS = [
  { id: 'home', icon: '\u{1F469}' },
  { id: 'chat', icon: '\u{1F4AC}' },
  { id: 'tasks', icon: '\u{1F4CB}' },
  { id: 'grocery', icon: '\u{1F6D2}' },
  { id: 'alerts', icon: '\u{1F514}' },
  { id: 'settings', icon: '\u2699\uFE0F' },
];
```

Then update the tab rendering (lines 14-24) to remove the label span:

```jsx
{TABS.map((tab) => (
  <button
    key={tab.id}
    className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
    onPointerDown={() => onTabChange(tab.id)}
  >
    <span className="tab-icon">{tab.icon}</span>
    {activeTab === tab.id && <span className="tab-indicator" />}
  </button>
))}
```

- [ ] **Step 2: Add GroceryScreen to App.jsx**

In `frontend/src/App.jsx`:

1. Add import after the AlertsScreen import (line 6):
```js
import GroceryScreen from './components/GroceryScreen';
```

2. In `renderScreen()`, add a case before `case 'alerts':` (before line 138):
```js
case 'grocery':
  return <GroceryScreen authToken={authToken} isActive={activeTab === 'grocery'} />;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TabBar.jsx frontend/src/App.jsx
git commit -m "feat: add Grocery tab to navigation, icon-only tab bar"
```

---

## Task 8: Grocery List Frontend — GroceryScreen

**Files:**
- Create: `frontend/src/components/GroceryScreen.jsx`

- [ ] **Step 1: Create GroceryScreen.jsx**

Create `frontend/src/components/GroceryScreen.jsx`:

```jsx
import React, { useState, useEffect, useCallback } from 'react';

const CATEGORY_ORDER = ['Produce', 'Dairy', 'Meat & Seafood', 'Bakery', 'Frozen', 'Pantry', 'Beverages', 'Snacks', 'Household', 'Other'];
const CATEGORY_MAP = {
  'Produce': ['green onion','sweet potato','bell pepper','apple','banana','orange','lemon','lime','avocado','tomato','potato','onion','garlic','lettuce','spinach','kale','carrot','celery','broccoli','pepper','cucumber','mushroom','corn','berry','strawberry','blueberry','grape','melon','peach','pear','mango','pineapple','cilantro','basil','ginger','zucchini'],
  'Dairy': ['half and half','sour cream','milk','cheese','yogurt','butter','cream','eggs','creamer'],
  'Meat & Seafood': ['ground beef','chicken','beef','pork','turkey','salmon','shrimp','fish','steak','bacon','sausage','ham','lamb','crab','lobster','tuna'],
  'Bakery': ['bread','bagel','tortilla','roll','muffin','croissant','bun','pita','cake','donut'],
  'Frozen': ['ice cream','frozen pizza','frozen vegetables','frozen fruit','popsicle'],
  'Pantry': ['peanut butter','rice','pasta','cereal','flour','sugar','oil','vinegar','sauce','soup','beans','jelly','honey','salt','spice','oatmeal','noodle'],
  'Beverages': ['water','juice','soda','coffee','tea','wine','beer','sparkling','kombucha','lemonade'],
  'Snacks': ['granola bar','trail mix','chips','crackers','cookies','popcorn','nuts','pretzels','candy'],
  'Household': ['paper towels','toilet paper','dish soap','laundry detergent','trash bags','sponge','aluminum foil','plastic wrap','napkins'],
};

function guessCategory(name) {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return cat;
    }
  }
  return 'Other';
}

function buildShareText(items) {
  const unchecked = items.filter(i => !i.checked);
  if (unchecked.length === 0) return 'Grocery list is empty!';
  const grouped = {};
  for (const item of unchecked) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }
  let text = 'Grocery List\n';
  for (const cat of CATEGORY_ORDER) {
    if (!grouped[cat]) continue;
    text += `\n${cat}:\n`;
    for (const item of grouped[cat]) {
      text += `  - ${item.name}${item.quantity ? ` (${item.quantity})` : ''}\n`;
    }
  }
  return text;
}

export default function GroceryScreen({ authToken, isActive }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newCat, setNewCat] = useState('Other');
  const [showShareMenu, setShowShareMenu] = useState(false);

  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/grocery', { headers });
      if (res.ok) setItems(await res.json());
    } catch (err) {
      console.error('[GroceryScreen] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Auto-refresh when tab becomes active (picks up items added via chat)
  useEffect(() => {
    if (isActive) fetchItems();
  }, [isActive]);

  const handleToggle = async (id, checked) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked } : i));
    try {
      await fetch(`/api/grocery/${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked }),
      });
    } catch (err) {
      console.error('[GroceryScreen] toggle error:', err);
      fetchItems();
    }
  };

  const handleDelete = async (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await fetch(`/api/grocery/${id}`, { method: 'DELETE', headers });
    } catch (err) {
      console.error('[GroceryScreen] delete error:', err);
      fetchItems();
    }
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: newCat, quantity: newQty.trim() || undefined }),
      });
      if (res.ok) {
        const item = await res.json();
        setItems(prev => [...prev, item]);
      }
    } catch (err) {
      console.error('[GroceryScreen] add error:', err);
    }
    setNewName('');
    setNewQty('');
    setNewCat('Other');
    setShowAdd(false);
  };

  const handleClearChecked = async () => {
    setItems(prev => prev.filter(i => !i.checked));
    try {
      await fetch('/api/grocery/clear-checked', { method: 'POST', headers });
    } catch (err) {
      console.error('[GroceryScreen] clear checked error:', err);
      fetchItems();
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear the entire grocery list?')) return;
    setItems([]);
    try {
      await fetch('/api/grocery/clear-all', { method: 'POST', headers });
    } catch (err) {
      console.error('[GroceryScreen] clear all error:', err);
      fetchItems();
    }
  };

  const handleShare = async () => {
    const text = buildShareText(items);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Grocery List', text });
      } catch (err) {
        if (err.name !== 'AbortError') console.error('[GroceryScreen] share error:', err);
      }
    } else {
      setShowShareMenu(true);
    }
  };

  const handlePrint = () => window.print();

  const handleNameChange = (val) => {
    setNewName(val);
    if (val.trim()) setNewCat(guessCategory(val));
  };

  const hasChecked = items.some(i => i.checked);
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length > 0) acc.push({ category: cat, items: catItems });
    return acc;
  }, []);

  return (
    <div className="screen-container grocery-screen">
      <div className="screen-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>Grocery List</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="grocery-action-btn" onPointerDown={handlePrint} title="Print">{'\u{1F5A8}'}</button>
          <button className="grocery-action-btn" onPointerDown={handleShare} title="Share">{'\u{1F4E4}'}</button>
        </div>
      </div>

      {loading ? (
        <div className="screen-loading">Loading...</div>
      ) : items.length === 0 ? (
        <div className="screen-empty">
          <div>{'\u{1F6D2}'}</div>
          <p>Your grocery list is empty</p>
          <p className="screen-empty-hint">Tap + to add items or tell Nova what you need</p>
        </div>
      ) : (
        <>
          {grouped.map(({ category, items: catItems }) => (
            <div key={category} className="task-group">
              <div className="section-title">{category}</div>
              <div className="task-list-card">
                {catItems.map(item => (
                  <div key={item.id} className="grocery-item">
                    <button
                      className={`task-checkbox ${item.checked ? 'checked' : ''}`}
                      onPointerDown={() => handleToggle(item.id, item.checked ? 0 : 1)}
                    >
                      {item.checked ? '\u2713' : ''}
                    </button>
                    <span className={`grocery-item-name ${item.checked ? 'checked' : ''}`}>
                      {item.name}
                    </span>
                    {item.quantity && (
                      <span className="grocery-item-qty">{item.quantity}</span>
                    )}
                    <button className="task-delete" onPointerDown={() => handleDelete(item.id)}>
                      {'\u00D7'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {hasChecked && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="settings-btn" style={{ flex: 1 }} onPointerDown={handleClearChecked}>
                Clear Checked
              </button>
              <button className="settings-btn" style={{ flex: 1 }} onPointerDown={handleClearAll}>
                Clear All
              </button>
            </div>
          )}
        </>
      )}

      {/* Share fallback menu */}
      {showShareMenu && (
        <div className="task-add-overlay" onPointerDown={() => setShowShareMenu(false)}>
          <div className="task-add-sheet" onPointerDown={e => e.stopPropagation()}>
            <div className="section-title" style={{ paddingTop: 12 }}>Share Grocery List</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 16px' }}>
              <a
                href={`sms:?body=${encodeURIComponent(buildShareText(items))}`}
                className="inline-submit"
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                Text Message
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent('Grocery List')}&body=${encodeURIComponent(buildShareText(items))}`}
                className="inline-submit"
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                Email
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Add item modal */}
      {showAdd && (
        <div className="task-add-overlay" onPointerDown={() => setShowAdd(false)}>
          <div className="task-add-sheet" onPointerDown={e => e.stopPropagation()}>
            <div className="section-title" style={{ paddingTop: 12 }}>Add Item</div>
            <div className="inline-add" style={{ flexDirection: 'column', gap: 10 }}>
              <input
                className="inline-input"
                placeholder="Item name..."
                value={newName}
                onChange={e => handleNameChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              <input
                className="inline-input"
                placeholder="Quantity (optional)..."
                value={newQty}
                onChange={e => setNewQty(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <select
                className="inline-input"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {CATEGORY_ORDER.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="inline-submit" style={{ flex: 1 }} onPointerDown={handleAdd}>
                  Add Item
                </button>
                <button className="settings-btn" style={{ flex: 1 }} onPointerDown={() => setShowAdd(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print view — hidden, shown only when printing */}
      <div className="grocery-print">
        <h1>Grocery List</h1>
        {grouped.map(({ category, items: catItems }) => {
          const unchecked = catItems.filter(i => !i.checked);
          if (unchecked.length === 0) return null;
          return (
            <div key={category}>
              <h3>{category}</h3>
              <ul>
                {unchecked.map(item => (
                  <li key={item.id}>
                    {item.name}{item.quantity ? ` — ${item.quantity}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <button className="fab" onPointerDown={() => setShowAdd(true)} aria-label="Add grocery item">
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/GroceryScreen.jsx
git commit -m "feat: GroceryScreen component — categorized list, add/check/delete, print/share"
```

---

## Task 9: Grocery List Frontend — CSS & Print Styles

**Files:**
- Modify: `frontend/src/styles/global.css`

- [ ] **Step 1: Add grocery and print CSS**

In `frontend/src/styles/global.css`, add at the end (after the memory styles added in Task 3):

```css
/* === Grocery Screen === */
.grocery-action-btn {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 18px;
  padding: 6px 10px;
  cursor: pointer;
}
.grocery-action-btn:active {
  background: rgba(255,255,255,0.15);
}
.grocery-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.grocery-item:last-child { border-bottom: none; }
.grocery-item-name {
  flex: 1;
  color: var(--text);
  font-size: 14px;
}
.grocery-item-name.checked {
  text-decoration: line-through;
  opacity: 0.5;
}
.grocery-item-qty {
  color: var(--text-muted);
  font-size: 12px;
  background: rgba(255,255,255,0.06);
  padding: 2px 6px;
  border-radius: 4px;
}

/* === Print Styles === */
.grocery-print {
  display: none;
}

@media print {
  /* Hide everything except print view */
  .app > *:not(.grocery-screen) { display: none !important; }
  .tab-bar,
  .screen-header,
  .fab,
  .task-add-overlay,
  .grocery-action-btn,
  .grocery-screen > *:not(.grocery-print) { display: none !important; }

  .grocery-print {
    display: block !important;
    color: #000;
    background: #fff;
    padding: 20px;
    font-family: -apple-system, system-ui, sans-serif;
  }
  .grocery-print h1 {
    font-size: 20px;
    margin-bottom: 16px;
    color: #000;
  }
  .grocery-print h3 {
    font-size: 14px;
    margin: 12px 0 4px;
    color: #333;
  }
  .grocery-print ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .grocery-print li {
    padding: 3px 0;
    font-size: 13px;
    color: #000;
  }
  .grocery-print li::before {
    content: '\u25A1  ';
    font-size: 12px;
  }

  /* Hide particle background and other chrome */
  .particle-bg { display: none !important; }
  body { background: #fff !important; }
}
```

- [ ] **Step 2: Update tab bar CSS for icon-only layout**

In `frontend/src/styles/global.css`, find the `.tab-label` rule and add:

```css
.tab-label { display: none; }
```

If `.tab-label` doesn't exist as a standalone rule, add it. This hides labels since we removed them from the JSX but ensures backwards compatibility.

- [ ] **Step 3: Build and verify**

```bash
cd /opt/nova/frontend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles/global.css
git commit -m "feat: grocery screen CSS, print styles, icon-only tab bar"
```

---

## Task 10: Final Integration & Restart

- [ ] **Step 1: Rebuild frontend**

```bash
cd /opt/nova/frontend && npm run build
```

- [ ] **Step 2: Restart backend**

```bash
pkill -f "node server.js" 2>/dev/null || true
sleep 2
cd /opt/nova/backend && nohup node server.js > /tmp/nova-server.log 2>&1 &
sleep 3
head -10 /tmp/nova-server.log
```

Expected: Server starts with no errors, `[DB] SQLite initialized`, `[Nova] Backend running on http://0.0.0.0:8000`.

- [ ] **Step 3: Verify grocery API**

```bash
# Add an item
curl -s -X POST http://localhost:8000/api/grocery \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TEST" \
  -d '{"name": "milk"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)))"

# Get items
curl -s http://localhost:8000/api/grocery \
  -H "Authorization: Bearer TEST" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)))"
```

Expected: Item created with category "Dairy" (auto-detected). Get returns array with the item.

Note: Replace `TEST` with a valid auth token if auth middleware rejects it. You can get one via: `curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"pin":"1234"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))"`

- [ ] **Step 4: Verify memory API**

```bash
curl -s http://localhost:8000/api/memory \
  -H "Authorization: Bearer TEST" | node -e "process.stdin.on('data',d=>{const m=JSON.parse(d);console.log('Count:',m.length,'Has id:',m.length>0&&'id' in m[0])})"
```

Expected: Shows count and `Has id: true`.

- [ ] **Step 5: Verify in browser**

Open the app in browser/phone. Check:
1. Tab bar shows 6 icons (no labels)
2. Grocery tab opens with empty state
3. Can add items via FAB (+)
4. Can check off and delete items
5. Print button opens print dialog
6. Share button opens native share sheet (iOS) or fallback menu
7. Settings > Manage Memories opens memory sub-screen
8. Can edit and delete memories
9. Back button returns to Settings

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: integration adjustments after testing"
```
