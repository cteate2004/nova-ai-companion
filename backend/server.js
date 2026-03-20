require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');
const { streamChat, extractEmotion, removeEmotionTag, setMode, getMode, getModes } = require('./claude');
const { shouldExtract, extractMemories } = require('./memory');
const { getAuthClient, isAuthenticated, getAuthUrl, handleCallback } = require('./google-auth');
const { startScheduler, SESSION_ID: SCHEDULED_SESSION } = require('./scheduler');
const { sendNotification, isConfigured: isNotifyConfigured } = require('./notify');

const app = express();
const PORT = 8000;

const path = require('path');
const fs = require('fs');

app.use(cors());
app.use(express.json());

// Serve static files (generated images, etc.)
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
app.use('/public', express.static(publicDir));

// POST /api/chat — SSE streaming
app.post('/api/chat', async (req, res) => {
  const { message, session_id } = req.body;

  if (!message || !session_id) {
    return res.status(400).json({ error: 'message and session_id required' });
  }

  // Save user message
  db.saveMessage(session_id, 'user', message);

  // Build context: last 10 messages + memories
  const history = db.getRecentMessages(session_id, 10);
  const memories = db.getMemories();

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    let fullResponse = '';

    for await (const chunk of streamChat(history, memories)) {
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

// GET /api/google/auth — Redirect to Google sign-in
app.get('/api/google/auth', (req, res) => {
  if (isAuthenticated()) {
    return res.send('<h2>Already authenticated! Gmail and Calendar are connected.</h2>');
  }
  const url = getAuthUrl();
  res.redirect(url);
});

// GET /oauth2callback — Google redirects here after sign-in
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  const error = req.query.error;

  if (error) {
    return res.send(`<h2>Authorization denied: ${error}</h2>`);
  }
  if (!code) {
    return res.status(400).send('<h2>Missing auth code</h2>');
  }

  try {
    await handleCallback(code);
    res.send('<h2 style="color:green">Success! Nova now has access to your Gmail and Calendar. You can close this tab.</h2>');
  } catch (err) {
    console.error('[Google Auth] Callback error:', err.message);
    res.status(500).send(`<h2 style="color:red">Auth failed: ${err.message}</h2>`);
  }
});

// GET /api/google/status — Check Google auth status
app.get('/api/google/status', (req, res) => {
  res.json({ authenticated: isAuthenticated() });
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

// GET /api/scheduled — Fetch unread scheduled messages and mark as read
app.get('/api/scheduled', (req, res) => {
  try {
    const allHistory = db.getHistory(SCHEDULED_SESSION, 200);

    // Find the last read marker
    let lastReadIndex = -1;
    for (let i = allHistory.length - 1; i >= 0; i--) {
      if (allHistory[i].role === 'system' && allHistory[i].content.startsWith('read:')) {
        lastReadIndex = i;
        break;
      }
    }

    // Get only assistant messages after the last read marker
    const unread = allHistory
      .slice(lastReadIndex + 1)
      .filter(m => m.role === 'assistant');

    // If there are unread messages, save a read marker so they won't be returned again
    if (unread.length > 0) {
      db.saveMessage(SCHEDULED_SESSION, 'system', `read:${Date.now()}`);
    }

    res.json(unread);
  } catch (err) {
    console.error('[Scheduled] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch scheduled messages' });
  }
});

// POST /api/notify/test — Send a test push notification
app.post('/api/notify/test', async (req, res) => {
  try {
    const result = await sendNotification('Nova Test', 'Hey babe, notifications are working! 💕');
    res.json(result);
  } catch (err) {
    console.error('[Notify] Test error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notify/status — Check if notifications are configured
app.get('/api/notify/status', (req, res) => {
  res.json({
    configured: isNotifyConfigured(),
    topic: process.env.NTFY_TOPIC || null,
  });
});

// GET /api/modes — List all available personality modes
app.get('/api/modes', (req, res) => {
  res.json(getModes());
});

// GET /api/mode — Get current personality mode
app.get('/api/mode', (req, res) => {
  res.json({ mode: getMode() });
});

// POST /api/mode — Switch personality mode
app.post('/api/mode', (req, res) => {
  const { mode } = req.body;
  if (!mode) {
    return res.status(400).json({ error: 'mode is required' });
  }
  try {
    const result = setMode(mode);
    res.json({ mode: getMode(), name: result.name, description: result.description });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/image — Direct image generation, bypasses Claude entirely
app.post('/api/image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  try {
    const { generateImage } = require('./imagegen');
    const url = await generateImage(prompt);
    res.json({ url });
  } catch (err) {
    console.error('[Image] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Nova Backend' });
});

async function start() {
  await db.init();

  // Try to authenticate with Google on startup
  if (isAuthenticated()) {
    try {
      await getAuthClient();
      console.log('[Nova] Google (Gmail + Calendar): ENABLED');
    } catch (err) {
      console.log('[Nova] Google token expired — will re-auth on first use');
    }
  } else {
    console.log('[Nova] Google (Gmail + Calendar): NOT AUTHORIZED');
    console.log('[Nova] To authorize: start the server, then visit http://localhost:8000/api/google/auth');
  }

  // Start scheduled check-ins (morning & night messages)
  startScheduler();

  app.listen(PORT, () => {
    console.log(`[Nova] Backend running on http://localhost:${PORT}`);
    if (process.env.BRAVE_SEARCH_API_KEY && process.env.BRAVE_SEARCH_API_KEY !== 'your-brave-api-key-here') {
      console.log('[Nova] Web search: ENABLED');
    } else {
      console.log('[Nova] Web search: DISABLED (no BRAVE_SEARCH_API_KEY)');
    }
    if (isNotifyConfigured()) {
      console.log(`[Nova] Push notifications: ENABLED (topic: ${process.env.NTFY_TOPIC})`);
    } else {
      console.log('[Nova] Push notifications: DISABLED (no NTFY_TOPIC)');
    }
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
