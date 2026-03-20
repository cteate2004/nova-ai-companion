require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');
const { streamChat, extractEmotion, removeEmotionTag } = require('./claude');
const { shouldExtract, extractMemories } = require('./memory');

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Nova Backend' });
});

async function start() {
  await db.init();
  app.listen(PORT, () => {
    console.log(`[Nova] Backend running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
