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

  let lesson = null;

  // Try exact match first
  const find = SQL.prepare('SELECT id, status, lesson_name FROM hacking_lessons WHERE module_number = ? AND lesson_name = ?');
  find.bind([moduleNumber, lessonName]);
  if (find.step()) lesson = find.getAsObject();
  find.free();

  // Try by lesson_order if lessonName is a number
  if (!lesson && /^\d+$/.test(String(lessonName))) {
    const byOrder = SQL.prepare('SELECT id, status, lesson_name FROM hacking_lessons WHERE module_number = ? AND lesson_order = ?');
    byOrder.bind([moduleNumber, parseInt(lessonName)]);
    if (byOrder.step()) lesson = byOrder.getAsObject();
    byOrder.free();
  }

  // Try case-insensitive / partial match
  if (!lesson) {
    const all = SQL.prepare('SELECT id, status, lesson_name FROM hacking_lessons WHERE module_number = ? ORDER BY lesson_order');
    all.bind([moduleNumber]);
    const candidates = [];
    while (all.step()) candidates.push(all.getAsObject());
    all.free();

    const needle = lessonName.toLowerCase().trim();
    // Try case-insensitive exact match
    lesson = candidates.find(c => c.lesson_name.toLowerCase() === needle);
    // Try substring match
    if (!lesson) lesson = candidates.find(c => c.lesson_name.toLowerCase().includes(needle) || needle.includes(c.lesson_name.toLowerCase()));
  }

  // Try completing next pending lesson in module if "next" is passed
  if (!lesson && lessonName.toLowerCase() === 'next') {
    const next = SQL.prepare('SELECT id, status, lesson_name FROM hacking_lessons WHERE module_number = ? AND status = ? ORDER BY lesson_order LIMIT 1');
    next.bind([moduleNumber, 'pending']);
    if (next.step()) lesson = next.getAsObject();
    next.free();
  }

  if (!lesson) return { error: 'Lesson not found', hint: 'Use get_curriculum to see exact lesson names, or pass lesson_order number (1-5), or "next" for the next pending lesson' };

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

  // Ensure this module (and all prior modules) are unlocked
  const now = new Date().toISOString();
  SQL.run('UPDATE hacking_curriculum SET status = ?, unlocked_at = COALESCE(unlocked_at, ?) WHERE module_number <= ? AND status = ?',
    ['unlocked', now, moduleNumber, 'locked']);

  let moduleCompleted = false;
  if (mod.lessons_completed >= mod.lessons_total) {
    SQL.run('UPDATE hacking_curriculum SET status = ?, completed_at = ? WHERE module_number = ?',
      ['completed', now, moduleNumber]);

    // Also mark all prior modules as completed if they have all lessons done
    SQL.run(`UPDATE hacking_curriculum SET status = 'completed', completed_at = COALESCE(completed_at, ?)
      WHERE module_number < ? AND lessons_completed >= lessons_total AND status != 'completed'`,
      [now, moduleNumber]);

    // Unlock next module
    const nextMod = moduleNumber + 1;
    if (nextMod <= 8) {
      SQL.run('UPDATE hacking_curriculum SET status = ?, unlocked_at = COALESCE(unlocked_at, ?) WHERE module_number = ? AND status = ?',
        ['unlocked', now, nextMod, 'locked']);
    }

    // Update progress current_module to the highest incomplete module
    const highest = SQL.prepare('SELECT MIN(module_number) as next FROM hacking_curriculum WHERE status != ?');
    highest.bind(['completed']);
    highest.step();
    const nextActive = highest.getAsObject();
    highest.free();
    const newCurrent = nextActive.next || 8;

    SQL.run('UPDATE hacking_progress SET current_module = ?, updated_at = ? WHERE id = 1',
      [newCurrent, now]);

    moduleCompleted = true;
  } else {
    // Even if module not fully complete, update current_module to at least this module
    SQL.run('UPDATE hacking_progress SET current_module = MAX(current_module, ?), updated_at = ? WHERE id = 1',
      [moduleNumber, now]);
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

function syncState() {
  const SQL = db._getDb();
  const now = new Date().toISOString();

  // Sync lessons_completed counts from actual lesson records
  const mods = SQL.prepare('SELECT module_number FROM hacking_curriculum ORDER BY module_number');
  while (mods.step()) {
    const { module_number } = mods.getAsObject();
    const count = SQL.prepare('SELECT COUNT(*) as c FROM hacking_lessons WHERE module_number = ? AND status = ?');
    count.bind([module_number, 'completed']);
    count.step();
    const { c } = count.getAsObject();
    count.free();
    SQL.run('UPDATE hacking_curriculum SET lessons_completed = ? WHERE module_number = ?', [c, module_number]);
  }
  mods.free();

  // Mark modules completed if all lessons done
  SQL.run(`UPDATE hacking_curriculum SET status = 'completed', completed_at = COALESCE(completed_at, ?)
    WHERE lessons_completed >= lessons_total AND lessons_completed > 0 AND status != 'completed'`, [now]);

  // Unlock all modules up to the highest one with progress, plus the next one
  const withProgress = SQL.prepare('SELECT MAX(module_number) as m FROM hacking_lessons WHERE status = ?');
  withProgress.bind(['completed']);
  withProgress.step();
  const highest = withProgress.getAsObject();
  withProgress.free();

  if (highest.m) {
    // Unlock everything up to and including the module with progress, plus the next one
    const unlockUpTo = Math.min(highest.m + 1, 8);
    SQL.run(`UPDATE hacking_curriculum SET status = 'unlocked', unlocked_at = COALESCE(unlocked_at, ?)
      WHERE module_number <= ? AND status = 'locked'`, [now, unlockUpTo]);

    // Re-mark completed ones (the unlock above may have overwritten)
    SQL.run(`UPDATE hacking_curriculum SET status = 'completed'
      WHERE lessons_completed >= lessons_total AND lessons_completed > 0`);

    // Update current_module
    SQL.run('UPDATE hacking_progress SET current_module = MAX(current_module, ?), updated_at = ? WHERE id = 1',
      [highest.m, now]);
  }

  db._persist();
}

function getDashboard() {
  syncState();
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
