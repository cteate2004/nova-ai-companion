require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const db = require('./database');
const { streamChat, extractEmotion, removeEmotionTag } = require('./claude');
const { shouldExtract, extractMemories } = require('./memory');

const app = express();
const PORT = 8000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const NOVA_PIN = process.env.NOVA_PIN || '1234';
const activeSessions = new Map(); // token -> expiry timestamp
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

app.use(cors());
app.use(express.json());

// Serve frontend build
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(distPath));

// --- Auth endpoints (no auth required) ---
app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  if (pin !== NOVA_PIN) {
    return res.status(401).json({ error: 'Wrong PIN' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, Date.now() + SESSION_DURATION);
  res.json({ token });
});

app.get('/api/auth/check', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token && activeSessions.has(token) && activeSessions.get(token) > Date.now()) {
    return res.json({ authenticated: true });
  }
  res.json({ authenticated: false });
});

// --- Auth middleware for all /api routes below ---
app.use('/api', (req, res, next) => {
  // Skip auth check for auth endpoints
  if (req.path.startsWith('/auth/')) return next();
  // Skip for Google OAuth callback
  if (req.path === '/google/auth') return next();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !activeSessions.has(token) || activeSessions.get(token) < Date.now()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
});

// POST /api/chat — SSE streaming (supports text + optional image)
app.post('/api/chat', upload.single('image'), async (req, res) => {
  const message = req.body.message;
  const session_id = req.body.session_id;
  const timezone = req.body.timezone;
  const localTime = req.body.local_time;
  const location = req.body.location;

  if (!session_id || (!message && !req.file)) {
    return res.status(400).json({ error: 'session_id and message or image required' });
  }

  const userText = message || 'What do you see in this photo?';

  // Save user message
  db.saveMessage(session_id, 'user', userText + (req.file ? ' [📷 image attached]' : ''));

  // Build context: last 10 messages + memories
  const history = db.getRecentMessages(session_id, 10);
  const memories = db.getMemories();

  // If image is attached, build multimodal content for the latest user message
  let imageData = null;
  if (req.file) {
    const base64 = req.file.buffer.toString('base64');
    const mediaType = req.file.mimetype || 'image/jpeg';
    imageData = { base64, mediaType };
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    let fullResponse = '';

    for await (const chunk of streamChat(history, memories, imageData, { timezone, localTime, location })) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ text: chunk, done: false })}\n\n`);
    }

    // Extract emotion and clean response
    const emotion = extractEmotion(fullResponse);
    const cleanedResponse = removeEmotionTag(fullResponse);

    // Save assistant message (cleaned, without emotion tag)
    db.saveMessage(session_id, 'assistant', cleanedResponse);

    // Check if memory extraction should run
    let memoryUpdated = false;
    if (await shouldExtract(session_id)) {
      memoryUpdated = await extractMemories(session_id);
    }

    // Send final event
    res.write(`data: ${JSON.stringify({ text: '', done: true, emotion, memory_updated: memoryUpdated })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[Chat] Error:', err.message);
    res.write(`data: ${JSON.stringify({ text: '', done: true, emotion: 'concerned', error: err.message })}\n\n`);
    res.end();
  }
});

// GET /api/history/:session_id
app.get('/api/history/:session_id', (req, res) => {
  const history = db.getHistory(req.params.session_id, 50);
  res.json(history);
});

// GET /api/memory
app.get('/api/memory', (req, res) => {
  const memories = db.getMemories();
  res.json(memories);
});

// POST /api/transcribe — Whisper speech-to-text
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'audio file required' });
  }

  try {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: 'audio.webm',
      contentType: req.file.mimetype || 'audio/webm',
    });
    form.append('model', 'whisper-1');
    form.append('language', 'en');

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('[Transcribe] Whisper error:', err);
      return res.status(500).json({ error: 'Transcription failed' });
    }

    const data = await resp.json();
    res.json({ text: data.text || '' });
  } catch (err) {
    console.error('[Transcribe] Error:', err.message);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// POST /api/tts — proxy to edge-tts service
app.post('/api/tts', async (req, res) => {
  const { text, voice } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const ttsUrl = process.env.TTS_URL || 'http://localhost:8002';
    const resp = await fetch(`${ttsUrl}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });

    if (!resp.ok) {
      console.error('[TTS] Service error:', resp.status);
      return res.status(500).json({ error: 'TTS failed' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    const buffer = await resp.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[TTS] Error:', err.message);
    res.status(500).json({ error: 'TTS failed' });
  }
});

// ===== Google OAuth Routes =====
const googleAuth = require('./google-auth');

// Start OAuth flow
app.get('/api/google/auth', (req, res) => {
  try {
    const url = googleAuth.getAuthUrl();
    res.redirect(url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OAuth callback
app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    await googleAuth.handleCallback(code);
    res.send(`
      <html><body style="background:#0a0a0f;color:#00d4aa;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <div style="text-align:center">
          <h1>✅ Google Connected!</h1>
          <p>Gmail and Calendar are now linked to Nova.</p>
          <p>You can close this tab and go back to chatting.</p>
        </div>
      </body></html>
    `);
  } catch (err) {
    console.error('[OAuth] Callback error:', err.message);
    res.status(500).send('Authorization failed: ' + err.message);
  }
});

// Check Google auth status
app.get('/api/google/status', (req, res) => {
  res.json({ authorized: googleAuth.isAuthorized() });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Nova Backend', google_authorized: googleAuth.isAuthorized() });
});

// ===== Tasks =====
app.get('/api/tasks', (req, res) => {
  res.json(db.getTasks(req.query.list));
});
app.post('/api/tasks', (req, res) => {
  const { title, list_name, due_at } = req.body;
  res.json(db.createTask(title, list_name, due_at));
});
app.patch('/api/tasks/:id', (req, res) => {
  res.json(db.updateTask(req.params.id, req.body));
});
app.delete('/api/tasks/:id', (req, res) => {
  db.deleteTask(req.params.id);
  res.json({ ok: true });
});

// ===== Reminders =====
app.get('/api/reminders', (req, res) => {
  res.json(db.getReminders(true));
});
app.post('/api/reminders', (req, res) => {
  const { message, remind_at } = req.body;
  res.json(db.createReminder(message, remind_at));
});
app.delete('/api/reminders/:id', (req, res) => {
  db.deleteReminder(req.params.id);
  res.json({ ok: true });
});

// ===== Expenses =====
app.get('/api/expenses/summary', (req, res) => {
  res.json(db.getExpenseSummary(req.query.month));
});
app.get('/api/expenses', (req, res) => {
  res.json(db.getExpenses(req.query.month));
});
app.post('/api/expenses', (req, res) => {
  const { amount, category, description } = req.body;
  res.json(db.createExpense(amount, category, description));
});

// ===== Scheduled Messages =====
app.get('/api/scheduled-messages', (req, res) => {
  res.json(db.getScheduledMessages());
});
app.post('/api/scheduled-messages', (req, res) => {
  const { type, time } = req.body;
  res.json(db.createScheduledMessage(type, time));
});
app.patch('/api/scheduled-messages/:id', (req, res) => {
  res.json(db.updateScheduledMessage(req.params.id, req.body));
});

// ===== Mood =====
app.get('/api/mood', (req, res) => {
  res.json(db.getMoodLogs(50));
});
app.post('/api/mood', (req, res) => {
  const { mood, note } = req.body;
  res.json(db.createMoodLog(mood, note));
});

// ===== Special Dates =====
app.get('/api/special-dates', (req, res) => {
  res.json(db.getSpecialDates());
});
app.post('/api/special-dates', (req, res) => {
  const { name, date, remind_days_before } = req.body;
  res.json(db.createSpecialDate(name, date, remind_days_before));
});
app.delete('/api/special-dates/:id', (req, res) => {
  db.deleteSpecialDate(req.params.id);
  res.json({ ok: true });
});

// ===== Push Subscriptions =====
app.post('/api/push/subscribe', (req, res) => {
  const { endpoint, keys } = req.body;
  db.savePushSubscription(endpoint, keys.p256dh, keys.auth);
  res.json({ ok: true });
});
app.delete('/api/push/subscribe', (req, res) => {
  const { endpoint } = req.body;
  db.deletePushSubscription(endpoint);
  res.json({ ok: true });
});

// ===== Weather proxy =====
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const weather = require('./weather');
    const data = await weather.getCurrent(parseFloat(lat), parseFloat(lon));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/push/vapid-key', (req, res) => {
  const push = require('./push');
  const key = push.getPublicKey();
  res.json({ publicKey: key });
});

// SPA fallback — serve index.html for non-API routes (Express 5 syntax)
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

async function start() {
  await db.init();
  require('./push').initVapid();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Nova] Backend running on http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
