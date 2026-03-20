# Nova AI Companion

A personal AI companion app with an animated avatar, voice interaction, and persistent memory. Nova runs locally on Windows and is powered by the Claude API.

## Features

- **Animated Avatar** — Stylized SVG face with emotional states and idle animations
- **Voice Interaction** — Push-to-talk with speech recognition and text-to-speech
- **Persistent Memory** — Nova remembers details about you across conversations
- **Streaming Chat** — Real-time streamed responses via SSE
- **Dark Premium UI** — Immersive interface with particle background effects

## Tech Stack

- **Frontend:** React 19 (Vite)
- **Backend:** Node.js / Express
- **Database:** SQLite via sql.js (pure JS, no native deps)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)
- **Voice:** Web Speech API (STT) + SpeechSynthesis (TTS)

## Prerequisites

- Node.js 18+ and npm
- An Anthropic API key ([get one here](https://console.anthropic.com/))
- Chrome or Edge browser (for voice features)

## Setup

1. Clone the repo:
   ```
   git clone https://github.com/cteate2004/nova-ai-companion.git
   cd nova-ai-companion
   ```

2. Configure your API key:
   ```
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and add your Anthropic API key.

3. Install dependencies:
   ```
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. Start the app:
   ```
   # From the project root:
   start.bat
   ```
   Or start manually:
   ```
   # Terminal 1 - Backend
   cd backend && npm start

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

5. Open http://localhost:5173 in Chrome or Edge.

## Project Structure

```
ai-companion/
├── backend/           # Express API server
│   ├── server.js      # Routes and SSE streaming
│   ├── database.js    # SQLite via sql.js
│   ├── claude.js      # Anthropic SDK integration
│   └── memory.js      # Fact extraction system
├── frontend/          # React UI
│   └── src/
│       ├── components/  # Avatar, ChatPanel, VoiceControl, etc.
│       ├── hooks/       # useChat, useVoice, useAvatar
│       └── styles/      # Dark theme CSS
├── docs/
│   └── TRAINING.md    # User training manual
└── start.bat          # One-click Windows launcher
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat | Send message, receive SSE stream |
| GET | /api/history/:session_id | Get last 50 messages |
| GET | /api/memory | Get stored memories |
| GET | /api/health | Server health check |

## Current Status (v1.0.1)

All core features are built and working:

- [x] Backend: Express + Claude SSE streaming + SQLite memory
- [x] Frontend: React + Vite with proxy to backend
- [x] SVG Avatar: 7 emotion states + idle animations (breathing, blinking, hair sway)
- [x] Chat Panel: Glass-morphism sidebar with streaming display
- [x] Voice: Push-to-talk (spacebar/mic) + TTS with sentence chunking
- [x] Particle Background: Canvas bokeh with teal/gold particles
- [x] Memory System: Fact extraction every 20 messages
- [x] Windows Launcher: start.bat with auto-install and graceful shutdown
- [x] TTS Fix: Async voice loading, Chrome 15s bug workaround, emotion tag stripping

### Known Areas for Future Improvement
- Avatar SVG could be refined for more visual detail/polish
- Add more granular mouth animation synced to speech
- Add settings panel (voice selection, TTS on/off, theme)
- Mobile responsive layout
- Session management UI (switch/delete sessions)
