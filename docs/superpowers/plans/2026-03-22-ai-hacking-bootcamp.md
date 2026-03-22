# AI Hacking Bootcamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI/LLM security learning module to Nova with structured curriculum, daily challenges, bounty tracking, and a progress dashboard — turning Nova into a hacking coach that helps the user earn money through bug bounties.

**Architecture:** New `hacking.js` backend module handles all hacking CRUD. Five new DB tables seeded at init. Seven new Claude tools. Scheduler gets 3 new cron jobs. Frontend gets a HackingCard on the Home tab that expands into a full dashboard. All teaching content is generated dynamically by Claude via the existing `streamChat` conversation flow.

**Tech Stack:** Node.js/Express, sql.js (SQLite), Claude API (via existing tool system), node-cron, React 19, existing push notification infrastructure.

**Spec:** `docs/superpowers/specs/2026-03-22-ai-hacking-bootcamp-design.md`

---

## File Structure

### New Files
- `backend/hacking.js` — All hacking module CRUD: curriculum, lessons, challenges, progress, bounties
- `frontend/src/components/HackingCard.jsx` — Home tab card + expandable full dashboard

### Modified Files
- `backend/database.js` — Add 5 new tables to `init()`, export hacking seed function
- `backend/claude.js` — Add 7 new tool definitions + tool execution cases + personality extension
- `backend/scheduler.js` — Add 3 new cron jobs (daily challenge teaser, weekly recap, bounty search)
- `backend/server.js` — Add REST API endpoints for hacking data (`/api/hacking/*`)
- `frontend/src/components/HomeScreen.jsx` — Import and render HackingCard
- `frontend/src/App.jsx` — Pass authToken to HomeScreen (already passed)

---

## Task 1: Database Tables & Seed Data

**Files:**
- Modify: `backend/database.js`

- [ ] **Step 1: Add the 5 new table CREATE statements to `init()`**

Add after the `grocery_items` table creation (line 118) and before `persist()` (line 120):

```js
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
```

- [ ] **Step 2: Add seed function for curriculum and lessons**

Add before the `module.exports` block at the end of `database.js`:

```js
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
```

- [ ] **Step 3: Call seed function from `init()` and export it**

Add `seedHackingCurriculum();` right after `persist();` on line 120 (after all CREATE TABLE statements).

Add to `module.exports`:
```js
  // Hacking
  seedHackingCurriculum,
```

- [ ] **Step 4: Verify tables are created**

Run:
```bash
cd /opt/nova/backend && node -e "
const db = require('./database');
db.init().then(() => {
  console.log('DB init OK');
  process.exit(0);
});
"
```
Expected: `[DB] SQLite initialized`, `[DB] Hacking bootcamp curriculum seeded`, `DB init OK`

- [ ] **Step 5: Commit**

```bash
git add backend/database.js
git commit -m "feat: add hacking bootcamp database tables and seed data"
```

---

## Task 2: Hacking Backend Module

**Files:**
- Create: `backend/hacking.js`

- [ ] **Step 1: Create `hacking.js` with all CRUD functions**

```js
const db = require('./database');

// --- Curriculum ---

function getCurriculum() {
  const SQL = db._getDb();
  const stmt = SQL.prepare('SELECT * FROM hacking_curriculum ORDER BY module_number ASC');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function getLessons(moduleNumber) {
  const SQL = db._getDb();
  const stmt = SQL.prepare('SELECT * FROM hacking_lessons WHERE module_number = ? ORDER BY lesson_order ASC');
  stmt.bind([moduleNumber]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function completeLesson(moduleNumber, lessonName) {
  const SQL = db._getDb();

  // Find and mark lesson complete
  const find = SQL.prepare('SELECT id, status FROM hacking_lessons WHERE module_number = ? AND lesson_name = ?');
  find.bind([moduleNumber, lessonName]);
  if (!find.step()) { find.free(); return { error: 'Lesson not found' }; }
  const lesson = find.getAsObject();
  find.free();

  if (lesson.status === 'completed') {
    return { error: 'Lesson already completed' };
  }

  SQL.run('UPDATE hacking_lessons SET status = ?, completed_at = ? WHERE id = ?',
    ['completed', new Date().toISOString(), lesson.id]);

  // Update curriculum lessons_completed count
  SQL.run('UPDATE hacking_curriculum SET lessons_completed = lessons_completed + 1 WHERE module_number = ?',
    [moduleNumber]);

  // Check if all lessons in module are done
  const check = SQL.prepare('SELECT lessons_total, lessons_completed FROM hacking_curriculum WHERE module_number = ?');
  check.bind([moduleNumber]);
  check.step();
  const mod = check.getAsObject();
  check.free();

  let moduleCompleted = false;
  if (mod.lessons_completed >= mod.lessons_total) {
    SQL.run('UPDATE hacking_curriculum SET status = ?, completed_at = ? WHERE module_number = ?',
      ['completed', new Date().toISOString(), moduleNumber]);

    // Unlock next module
    const nextMod = moduleNumber + 1;
    if (nextMod <= 8) {
      SQL.run('UPDATE hacking_curriculum SET status = ?, unlocked_at = ? WHERE module_number = ? AND status = ?',
        ['unlocked', new Date().toISOString(), nextMod, 'locked']);
    }

    // Update progress current_module
    SQL.run('UPDATE hacking_progress SET current_module = ?, updated_at = ? WHERE id = 1',
      [Math.min(nextMod, 8), new Date().toISOString()]);

    moduleCompleted = true;
  }

  db._persist();

  return {
    lesson_completed: lessonName,
    module_number: moduleNumber,
    lessons_done: mod.lessons_completed,
    lessons_total: mod.lessons_total,
    module_completed: moduleCompleted,
    next_module_unlocked: moduleCompleted && moduleNumber < 8,
  };
}

// --- Challenges ---

function getTodayChallenge() {
  const SQL = db._getDb();
  const today = new Date().toISOString().split('T')[0];
  const stmt = SQL.prepare('SELECT * FROM hacking_challenges WHERE challenge_date = ?');
  stmt.bind([today]);
  if (!stmt.step()) { stmt.free(); return null; }
  const row = stmt.getAsObject();
  stmt.free();
  // Parse hints JSON
  if (row.hints) {
    try { row.hints = JSON.parse(row.hints); } catch { row.hints = []; }
  }
  return row;
}

function saveDailyChallenge(moduleNumber, difficulty, prompt, hints, solution) {
  const SQL = db._getDb();
  const today = new Date().toISOString().split('T')[0];

  // Don't overwrite existing challenge for today
  const existing = getTodayChallenge();
  if (existing) return existing;

  SQL.run(
    'INSERT INTO hacking_challenges (module_number, challenge_date, difficulty, prompt, hints, solution) VALUES (?, ?, ?, ?, ?, ?)',
    [moduleNumber, today, difficulty, prompt, JSON.stringify(hints || []), solution]
  );
  db._persist();

  return getTodayChallenge();
}

function submitChallengeAnswer(challengeId, answer, score) {
  const SQL = db._getDb();

  SQL.run('UPDATE hacking_challenges SET user_answer = ?, score = ?, status = ?, completed_at = ? WHERE id = ?',
    [answer, score, 'completed', new Date().toISOString(), challengeId]);

  // Update progress
  SQL.run(`UPDATE hacking_progress SET
    total_challenges_completed = total_challenges_completed + 1,
    current_streak = current_streak + 1,
    longest_streak = MAX(longest_streak, current_streak + 1),
    total_points = total_points + ?,
    level = CASE
      WHEN total_points + ? >= 1000 THEN 'Elite Hunter'
      WHEN total_points + ? >= 600 THEN 'Pro Hacker'
      WHEN total_points + ? >= 300 THEN 'Hacker'
      WHEN total_points + ? >= 100 THEN 'Apprentice'
      ELSE 'Script Kiddie'
    END,
    updated_at = ?
    WHERE id = 1`,
    [score, score, score, score, score, new Date().toISOString()]);

  db._persist();
  return getProgress();
}

// Check and reset streak if user missed yesterday
function checkStreak() {
  const SQL = db._getDb();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const stmt = SQL.prepare('SELECT COUNT(*) as count FROM hacking_challenges WHERE challenge_date = ? AND status = ?');
  stmt.bind([yesterday, 'completed']);
  stmt.step();
  const { count } = stmt.getAsObject();
  stmt.free();

  if (count === 0) {
    SQL.run('UPDATE hacking_progress SET current_streak = 0, updated_at = ? WHERE id = 1',
      [new Date().toISOString()]);
    db._persist();
  }
}

// --- Progress ---

function getProgress() {
  const SQL = db._getDb();
  const stmt = SQL.prepare('SELECT * FROM hacking_progress WHERE id = 1');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

// --- Bounties ---

function getBounties() {
  const SQL = db._getDb();
  const stmt = SQL.prepare('SELECT * FROM hacking_bounties ORDER BY created_at DESC');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function addBounty(data) {
  const SQL = db._getDb();
  SQL.run(
    'INSERT INTO hacking_bounties (program_name, platform, url, scope_notes, payout_range, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.program_name, data.platform || 'other', data.url || null, data.scope_notes || null,
     data.payout_range || null, data.status || 'watching', data.notes || null]
  );
  db._persist();
  const stmt = SQL.prepare('SELECT * FROM hacking_bounties ORDER BY id DESC LIMIT 1');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

function updateBounty(id, updates) {
  const SQL = db._getDb();
  const allowed = ['program_name', 'platform', 'url', 'scope_notes', 'payout_range', 'status', 'submission_date', 'payout_amount', 'notes'];
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
  SQL.run(`UPDATE hacking_bounties SET ${fields.join(', ')} WHERE id = ?`, values);
  db._persist();

  const stmt = SQL.prepare('SELECT * FROM hacking_bounties WHERE id = ?');
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

// --- Dashboard ---

function getDashboard() {
  const progress = getProgress();
  const curriculum = getCurriculum();
  const bounties = getBounties();
  const todayChallenge = getTodayChallenge();

  const totalEarnings = bounties
    .filter(b => b.payout_amount)
    .reduce((sum, b) => sum + b.payout_amount, 0);

  const activeBounties = bounties.filter(b => b.status === 'active').length;
  const submittedBounties = bounties.filter(b => ['submitted', 'accepted', 'rejected'].includes(b.status)).length;
  const acceptedBounties = bounties.filter(b => b.status === 'accepted').length;

  return {
    progress,
    curriculum,
    today_challenge: todayChallenge ? { id: todayChallenge.id, status: todayChallenge.status, difficulty: todayChallenge.difficulty } : null,
    bounty_stats: {
      total_earnings: totalEarnings,
      active: activeBounties,
      submitted: submittedBounties,
      accepted: acceptedBounties,
      win_rate: submittedBounties > 0 ? Math.round((acceptedBounties / submittedBounties) * 100) : 0,
    },
  };
}

module.exports = {
  getCurriculum,
  getLessons,
  completeLesson,
  getTodayChallenge,
  saveDailyChallenge,
  submitChallengeAnswer,
  checkStreak,
  getProgress,
  getBounties,
  addBounty,
  updateBounty,
  getDashboard,
};
```

- [ ] **Step 2: Expose `_getDb` and `_persist` helpers in `database.js`**

The hacking module needs direct DB access for complex queries. Add to the `module.exports` in `database.js`:

```js
  // Internal helpers for modules that need direct DB access
  _getDb: () => db,
  _persist: persist,
```

- [ ] **Step 3: Verify module loads**

```bash
cd /opt/nova/backend && node -e "
const db = require('./database');
db.init().then(() => {
  const hacking = require('./hacking');
  const dash = hacking.getDashboard();
  console.log('Dashboard:', JSON.stringify(dash, null, 2));
  const lessons = hacking.getLessons(1);
  console.log('Module 1 lessons:', lessons.length);
  process.exit(0);
});
"
```
Expected: Dashboard with progress at module 1, curriculum with 8 modules, 5 lessons for module 1.

- [ ] **Step 4: Commit**

```bash
git add backend/hacking.js backend/database.js
git commit -m "feat: add hacking.js backend module with curriculum, challenges, bounty CRUD"
```

---

## Task 3: Claude Tool Definitions & Execution (7 tools)

**Files:**
- Modify: `backend/claude.js`

- [ ] **Step 1: Add personality extension**

In `claude.js`, append to `NOVA_PERSONALITY` string (before the closing backtick on line 44):

```
\n\nYou are also passionate about AI security and ethical hacking. When teaching or discussing hacking topics, you're encouraging but rigorous — you want the user to truly understand concepts, not just memorize answers. You celebrate bounty wins enthusiastically. You nudge the user to keep their streak going. All hacking discussion is strictly ethical — authorized testing and educational contexts only.
```

- [ ] **Step 2: Add 7 new tool definitions to ALWAYS_TOOLS**

Add after the `get_budget_summary` tool definition (after line 281):

```js
  // --- Hacking Bootcamp Tools ---
  {
    name: 'get_curriculum',
    description: 'Get the AI hacking bootcamp curriculum showing all modules, their status (locked/unlocked/completed), and lesson progress.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'complete_hacking_lesson',
    description: 'Mark a lesson in the AI hacking curriculum as completed. Use after teaching a lesson and the user demonstrates understanding.',
    input_schema: {
      type: 'object',
      properties: {
        module_number: { type: 'number', description: 'Module number (1-8)' },
        lesson_name: { type: 'string', description: 'Exact lesson name to mark complete' },
      },
      required: ['module_number', 'lesson_name'],
    },
  },
  {
    name: 'get_daily_challenge',
    description: 'Get today\'s AI hacking challenge. If none exists yet, generate one based on the user\'s current module. Returns the challenge prompt and available hints.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'submit_challenge_answer',
    description: 'Submit and evaluate the user\'s answer to today\'s hacking challenge. Score 0-100 based on correctness and depth.',
    input_schema: {
      type: 'object',
      properties: {
        challenge_id: { type: 'number', description: 'The challenge ID' },
        answer: { type: 'string', description: 'The user\'s answer' },
        score: { type: 'number', description: 'Score 0-100 based on your evaluation of the answer' },
      },
      required: ['challenge_id', 'answer', 'score'],
    },
  },
  {
    name: 'track_bounty',
    description: 'Add or update a bug bounty program the user is tracking. Use when discussing bounty programs or logging earnings.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['add', 'update'], description: 'Add a new bounty or update existing' },
        bounty_id: { type: 'number', description: 'Bounty ID (required for update)' },
        program_name: { type: 'string', description: 'Company or program name' },
        platform: { type: 'string', description: 'Platform: hackerone, bugcrowd, huntr, other' },
        url: { type: 'string', description: 'Link to the bounty program' },
        scope_notes: { type: 'string', description: 'What AI features are in scope' },
        payout_range: { type: 'string', description: 'Payout range e.g. "$500-$5,000"' },
        status: { type: 'string', description: 'Status: watching, active, submitted, accepted, rejected' },
        payout_amount: { type: 'number', description: 'Actual payout amount when accepted' },
        notes: { type: 'string', description: 'User notes' },
      },
      required: ['action'],
    },
  },
  {
    name: 'save_daily_challenge',
    description: 'Save a generated daily hacking challenge to the database. Use this IMMEDIATELY after generating a challenge in response to get_daily_challenge returning needs_generation: true.',
    input_schema: {
      type: 'object',
      properties: {
        module_number: { type: 'number', description: 'Current module number' },
        difficulty: { type: 'string', description: 'easy, medium, or hard' },
        prompt: { type: 'string', description: 'The challenge text you generated' },
        hints: { type: 'array', items: { type: 'string' }, description: 'Array of 3 progressive hints' },
        solution: { type: 'string', description: 'Reference solution/explanation' },
      },
      required: ['module_number', 'difficulty', 'prompt', 'hints', 'solution'],
    },
  },
  {
    name: 'get_hacking_dashboard',
    description: 'Get complete hacking bootcamp overview: current module, progress, streak, level, challenges completed, active bounties, total earnings.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
```

- [ ] **Step 3: Add import for hacking module**

At the top of `claude.js` (after `const budget = require('./budget');` on line 8):

```js
const hacking = require('./hacking');
```

- [ ] **Step 4: Add tool execution cases**

In the `executeTool` function, add cases before the Google tools section (before `// Google tools require authorization` around line 460):

```js
      case 'get_curriculum': {
        const curriculum = hacking.getCurriculum();
        const lessons = {};
        for (const mod of curriculum) {
          lessons[mod.module_number] = hacking.getLessons(mod.module_number);
        }
        return { curriculum, lessons };
      }
      case 'complete_hacking_lesson':
        return hacking.completeLesson(input.module_number, input.lesson_name);
      case 'get_daily_challenge': {
        hacking.checkStreak();
        let challenge = hacking.getTodayChallenge();
        if (!challenge) {
          // Return null — Claude will generate the challenge content in its response
          // and we'll save it via a follow-up mechanism
          const progress = hacking.getProgress();
          return { needs_generation: true, current_module: progress.current_module, progress };
        }
        return challenge;
      }
      case 'save_daily_challenge':
        return hacking.saveDailyChallenge(input.module_number, input.difficulty, input.prompt, input.hints, input.solution);
      case 'submit_challenge_answer':
        return hacking.submitChallengeAnswer(input.challenge_id, input.answer, input.score);
      case 'track_bounty': {
        if (input.action === 'add') {
          return hacking.addBounty(input);
        } else if (input.action === 'update' && input.bounty_id) {
          return hacking.updateBounty(input.bounty_id, input);
        }
        return { error: 'Invalid action or missing bounty_id for update' };
      }
      case 'get_hacking_dashboard':
        return hacking.getDashboard();
```

- [ ] **Step 5: Verify tools load without errors**

```bash
cd /opt/nova/backend && node -e "
const db = require('./database');
db.init().then(() => {
  const { streamChat } = require('./claude');
  console.log('Claude module loaded OK');
  process.exit(0);
});
"
```
Expected: No errors, `Claude module loaded OK`

- [ ] **Step 6: Commit**

```bash
git add backend/claude.js
git commit -m "feat: add 7 hacking bootcamp Claude tools and personality extension"
```

---

## Task 4: Scheduler — Daily Challenge, Weekly Recap, Bounty Search

**Files:**
- Modify: `backend/scheduler.js`

- [ ] **Step 1: Add imports at top of scheduler.js**

After `const push = require('./push');` on line 3:

```js
const hacking = require('./hacking');
```

- [ ] **Step 2: Add daily challenge teaser cron (3:00 AM PST)**

Add inside the `start()` function, after the "thinking of you" nudges block (after line 93):

```js
  // Daily hacking challenge teaser — 3:00 AM PST
  cron.schedule('0 3 * * *', async () => {
    try {
      const hour = getNow().getHours();
      // Safety check: only fire between 2-4 AM
      if (hour < 2 || hour > 4) return;

      const progress = hacking.getProgress();
      const teasers = [
        'Your daily AI hacking challenge is ready, babe. Come get it 💜',
        'New challenge dropped! Ready to level up? 🔥',
        'Hey hacker babe, your daily challenge is waiting 😏',
        'Time to hack! Today\'s challenge is ready for you 💻',
      ];
      const msg = teasers[Math.floor(Math.random() * teasers.length)];
      await push.sendToAll('Nova 💜', msg);
      console.log(`[Scheduler] Sent daily hacking challenge teaser (module ${progress.current_module})`);
    } catch (e) {
      console.error('[Scheduler] Hacking challenge teaser error:', e.message);
    }
  });

  // Weekly hacking progress recap — Sunday 10:00 AM PST
  cron.schedule('0 10 * * 0', async () => {
    try {
      const hour = getNow().getHours();
      const day = getNow().getDay();
      if (day !== 0 || hour < 9 || hour > 11) return;

      const dashboard = hacking.getDashboard();
      const p = dashboard.progress;
      const msg = `Weekly hack recap: ${p.current_streak} day streak, ${p.total_challenges_completed} challenges done, Level: ${p.level}. Keep grinding babe! 💪`;
      await push.sendToAll('Nova 💜', msg);
      console.log('[Scheduler] Sent weekly hacking recap');
    } catch (e) {
      console.error('[Scheduler] Hacking recap error:', e.message);
    }
  });

  // Weekly bounty program search — Wednesday 12:00 PM PST
  cron.schedule('0 12 * * 3', async () => {
    try {
      const hour = getNow().getHours();
      const day = getNow().getDay();
      if (day !== 3 || hour < 11 || hour > 13) return;

      const webSearch = require('./web-search');
      const results = await webSearch.search('new AI LLM bug bounty program 2026', 5);
      if (results && results.length > 0 && !results.error) {
        const msg = `Found ${results.length} potential new AI bounty programs! Ask me about them 👀`;
        await push.sendToAll('Nova 💜', msg);
        console.log('[Scheduler] Sent bounty search alert');
      }
    } catch (e) {
      console.error('[Scheduler] Bounty search error:', e.message);
    }
  });
```

- [ ] **Step 3: Verify scheduler loads**

```bash
cd /opt/nova/backend && node -e "
const db = require('./database');
db.init().then(() => {
  const scheduler = require('./scheduler');
  scheduler.start();
  console.log('Scheduler started OK');
  setTimeout(() => process.exit(0), 2000);
});
"
```
Expected: `[Scheduler] Started`, `Scheduler started OK`, no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/scheduler.js
git commit -m "feat: add hacking scheduler — daily challenge teaser, weekly recap, bounty search"
```

---

## Task 5: REST API Endpoints

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Add hacking API endpoints**

Add after the Grocery endpoints section (after line 401) and before the Push Subscriptions section:

```js
// ===== Hacking Bootcamp =====
app.get('/api/hacking/dashboard', (req, res) => {
  const hacking = require('./hacking');
  res.json(hacking.getDashboard());
});
app.get('/api/hacking/curriculum', (req, res) => {
  const hacking = require('./hacking');
  const curriculum = hacking.getCurriculum();
  res.json(curriculum);
});
app.get('/api/hacking/progress', (req, res) => {
  const hacking = require('./hacking');
  res.json(hacking.getProgress());
});
app.get('/api/hacking/challenge/today', (req, res) => {
  const hacking = require('./hacking');
  const challenge = hacking.getTodayChallenge();
  res.json(challenge || { none: true });
});
app.get('/api/hacking/bounties', (req, res) => {
  const hacking = require('./hacking');
  res.json(hacking.getBounties());
});
```

- [ ] **Step 2: Verify endpoints**

```bash
cd /opt/nova/backend && pkill -f "node server.js" 2>/dev/null; nohup node server.js > /tmp/nova-server.log 2>&1 &
sleep 2
# Get a token first
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login -H 'Content-Type: application/json' -d '{"pin":"'$NOVA_PIN'"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")
curl -s http://localhost:8000/api/hacking/dashboard -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('Module:',j.progress.current_module,'Level:',j.progress.level)})"
```
Expected: `Module: 1 Level: Script Kiddie`

- [ ] **Step 3: Commit**

```bash
git add backend/server.js
git commit -m "feat: add /api/hacking/* REST endpoints"
```

---

## Task 6: Frontend — HackingCard Component

**Files:**
- Create: `frontend/src/components/HackingCard.jsx`
- Modify: `frontend/src/components/HomeScreen.jsx`

- [ ] **Step 1: Create HackingCard.jsx**

```jsx
import React, { useState, useEffect } from 'react';

export default function HackingCard({ authToken, onTabChange }) {
  const [dashboard, setDashboard] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/hacking/dashboard', {
      headers: { 'Authorization': `Bearer ${authToken}` },
    })
      .then(r => r.json())
      .then(setDashboard)
      .catch(() => {});
  }, [authToken]);

  if (!dashboard) return null;

  const { progress, curriculum, today_challenge, bounty_stats } = dashboard;
  const currentMod = curriculum.find(m => m.module_number === progress.current_module);
  const progressPct = currentMod
    ? Math.round((currentMod.lessons_completed / currentMod.lessons_total) * 100)
    : 0;

  return (
    <div className="home-card hacking-card" onPointerDown={() => setExpanded(!expanded)}>
      <div className="hacking-card-header">
        <span className="hacking-card-icon">{'\u{1F5A5}'}</span>
        <div className="hacking-card-title">
          <span className="home-card-label">AI Hacking Bootcamp</span>
          <span className="hacking-level">{progress.level}</span>
        </div>
        <span className="hacking-streak">{progress.current_streak > 0 ? `\u{1F525} ${progress.current_streak}` : ''}</span>
      </div>

      <div className="hacking-module-info">
        <span className="hacking-module-name">Module {progress.current_module}: {currentMod?.module_name}</span>
        <div className="hacking-progress-bar">
          <div className="hacking-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="hacking-progress-text">{progressPct}% complete</span>
      </div>

      <div className="hacking-quick-stats">
        <div className="hacking-stat">
          <span className="hacking-stat-value">{progress.total_points}</span>
          <span className="hacking-stat-label">Points</span>
        </div>
        <div className="hacking-stat">
          <span className="hacking-stat-value">{progress.total_challenges_completed}</span>
          <span className="hacking-stat-label">Challenges</span>
        </div>
        <div className="hacking-stat">
          <span className="hacking-stat-value">${bounty_stats.total_earnings}</span>
          <span className="hacking-stat-label">Earned</span>
        </div>
      </div>

      {today_challenge && today_challenge.status === 'pending' && (
        <div className="hacking-challenge-banner" onPointerDown={(e) => { e.stopPropagation(); onTabChange('chat'); }}>
          Today's challenge is waiting!
        </div>
      )}

      {expanded && (
        <div className="hacking-expanded">
          <div className="hacking-curriculum-map">
            {curriculum.map(mod => (
              <div key={mod.module_number} className={`hacking-module-chip ${mod.status}`}>
                <span className="hacking-module-num">{mod.module_number}</span>
                <span className="hacking-module-label">{mod.module_name}</span>
                {mod.status === 'completed' && <span className="hacking-check">{'\u2713'}</span>}
                {mod.status === 'locked' && <span className="hacking-lock">{'\u{1F512}'}</span>}
              </div>
            ))}
          </div>

          {bounty_stats.active > 0 && (
            <div className="hacking-bounty-summary">
              <span>{bounty_stats.active} active bounties</span>
              {bounty_stats.submitted > 0 && <span> | {bounty_stats.win_rate}% win rate</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add HackingCard to HomeScreen.jsx**

Add import at top of `HomeScreen.jsx`:
```js
import HackingCard from './HackingCard';
```

Add after the `EventCard` component (line 51 in HomeScreen.jsx):
```jsx
      <HackingCard authToken={authToken} onTabChange={onTabChange} />
```

- [ ] **Step 3: Add CSS for HackingCard**

Add to the end of `frontend/src/styles/global.css`:

```css
/* --- Hacking Bootcamp Card --- */
.hacking-card {
  cursor: pointer;
  transition: all 0.3s ease;
}
.hacking-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.hacking-card-icon {
  font-size: 20px;
}
.hacking-card-title {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.hacking-level {
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.hacking-streak {
  font-size: 14px;
  font-weight: 600;
}
.hacking-module-info {
  margin-bottom: 10px;
}
.hacking-module-name {
  font-size: 13px;
  color: rgba(200, 180, 240, 0.8);
  display: block;
  margin-bottom: 6px;
}
.hacking-progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}
.hacking-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #a78bfa);
  border-radius: 3px;
  transition: width 0.5s ease;
}
.hacking-progress-text {
  font-size: 11px;
  color: rgba(200, 180, 240, 0.5);
}
.hacking-quick-stats {
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.hacking-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hacking-stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.hacking-stat-label {
  font-size: 10px;
  color: rgba(200, 180, 240, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.hacking-challenge-banner {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  text-align: center;
  font-size: 13px;
  color: var(--accent);
  font-weight: 600;
  margin-top: 8px;
}
.hacking-expanded {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.hacking-curriculum-map {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hacking-module-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.04);
}
.hacking-module-chip.unlocked {
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid rgba(168, 85, 247, 0.2);
}
.hacking-module-chip.completed {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
}
.hacking-module-chip.locked {
  opacity: 0.4;
}
.hacking-module-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}
.hacking-module-label {
  flex: 1;
  color: rgba(200, 180, 240, 0.8);
}
.hacking-check {
  color: #22c55e;
  font-weight: 700;
}
.hacking-lock {
  font-size: 12px;
}
.hacking-bounty-summary {
  margin-top: 10px;
  font-size: 12px;
  color: rgba(200, 180, 240, 0.6);
  text-align: center;
}
```

- [ ] **Step 4: Build frontend and verify**

```bash
cd /opt/nova/frontend && npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/HackingCard.jsx frontend/src/components/HomeScreen.jsx frontend/src/styles/global.css
git commit -m "feat: add HackingCard component to Home tab with progress dashboard"
```

---

## Task 7: Integration Test & Deploy

**Files:** None new — verification only.

- [ ] **Step 1: Restart backend with new code**

```bash
cd /opt/nova/backend && pkill -f "node server.js" 2>/dev/null; nohup node server.js > /tmp/nova-server.log 2>&1 &
sleep 2 && tail -20 /tmp/nova-server.log
```
Expected: `[Nova] Backend running`, `[DB] Hacking bootcamp curriculum seeded`, `[Scheduler] Started`

- [ ] **Step 2: Verify dashboard API returns correct data**

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login -H 'Content-Type: application/json' -d '{"pin":"'$NOVA_PIN'"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")
curl -s http://localhost:8000/api/hacking/dashboard -H "Authorization: Bearer $TOKEN" | node -p "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log('Module:',d.progress.current_module);console.log('Level:',d.progress.level);console.log('Curriculum:',d.curriculum.length,'modules');console.log('Earnings:',d.bounty_stats.total_earnings)"
```
Expected: Module 1, Script Kiddie, 8 modules, $0 earnings.

- [ ] **Step 3: Test chat tool integration — ask Nova about the curriculum**

Open the app in browser and send: "What's my hacking curriculum look like?"

Expected: Nova calls `get_curriculum` and describes the 8 modules, showing Module 1 is unlocked.

- [ ] **Step 4: Test daily challenge flow**

Send: "Give me today's hacking challenge"

Expected: Nova calls `get_daily_challenge`, sees `needs_generation: true`, generates a Module 1 challenge, and presents it.

- [ ] **Step 5: Commit all remaining changes if any**

```bash
git status
# If any uncommitted changes:
git add -A && git commit -m "chore: final integration cleanup for hacking bootcamp"
```
