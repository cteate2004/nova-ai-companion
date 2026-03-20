# Nova AI Companion

A personal AI companion with voice interaction, server-side TTS, Gmail and Calendar integration, web search, image generation, push notifications, and persistent memory. Nova runs locally on Windows, works as a PWA on iPhone, and is powered by Anthropic's Claude API.

## Features

- **Streaming Chat** — Real-time SSE-streamed responses from Claude (claude-sonnet-4-20250514)
- **Server-side TTS** — Edge TTS service with Microsoft AriaNeural voice, MP3 audio that works on all devices including iOS. Falls back to browser TTS if service not running
- **Speaker Button** — Play button on main screen and in chat bubbles. Pulses teal when new message ready
- **Voice Interaction** — Push-to-talk (spacebar) or click mic, emoji/URL/markdown stripping for clean speech
- **PWA Mobile App** — Installable on iPhone via Safari "Add to Home Screen", standalone mode, custom icons
- **HTTPS Support** — Self-signed SSL cert for mobile mic access. Backend serves HTTPS on port 8000
- **Personality Modes** — Girlfriend (comedian + flirty, infinite patience), Assistant, or Buddy — switch via dropdown
- **Gmail Integration** — Google OAuth2, reads inbox, filters spam, Nova summarizes naturally
- **Calendar Integration** — Google Calendar API, reads ALL calendars including shared/subscribed
- **Web Search** — Brave Search API, Claude decides when to search automatically via tool_use
- **Image Generation** — Stable Horde (free, no API key), downloads locally, NSFW filters off. Ask Nova or type `/image [prompt]`
- **iPhone Push Notifications** — ntfy.sh free service, includes "Reply to Nova" link with local URL
- **Scheduled Check-ins** — Good morning (8 AM) and good night (10 PM) messages via node-cron
- **Memory System** — Auto-extracts facts every 20 messages, stores in SQLite, included in context
- **Emotions** — Avatar glow ring changes color based on mood (happy=gold, flirty=pink, etc.)
- **Dark Premium UI** — Glass-morphism chat panel with particle background effects

## Tech Stack

- **Frontend:** React 19, Vite, Web Speech API (STT), SpeechSynthesis (browser TTS fallback), PWA with service worker
- **Backend:** Node.js, Express, Anthropic Claude SDK (claude-sonnet-4-20250514), HTTPS with self-signed SSL
- **TTS Service:** Python, FastAPI, Edge TTS (Microsoft AriaNeural voice), serves MP3 audio
- **Database:** SQLite via sql.js (pure JS, no native dependencies)
- **APIs:** Anthropic, Brave Search, Google (Gmail + Calendar), Stable Horde, ntfy.sh

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+ with a virtual environment (optional, for Edge TTS service)
- Anthropic API key ([get one here](https://console.anthropic.com/)) — **required**
- Brave Search API key ([get one here](https://brave.com/search/api/)) — optional, free tier
- Google Cloud project with Gmail + Calendar APIs enabled, OAuth2 Desktop credentials — optional
- ntfy app on iPhone subscribed to your topic — optional
- Chrome or Edge browser (for voice features on desktop)

## Setup

1. Clone the repo:
   ```
   git clone https://github.com/cteate2004/nova-ai-companion.git
   cd nova-ai-companion
   ```

2. Configure environment variables:
   ```
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env`:
   ```env
   ANTHROPIC_API_KEY=sk-ant-...          # Required
   BRAVE_SEARCH_API_KEY=BSA...           # Optional — enables web search
   NTFY_TOPIC=nova-companion             # Optional — push notification topic
   ```

3. Place a face image as `frontend/public/nova-face.jpg` for Nova's avatar.

4. Install dependencies:
   ```
   cd backend && npm install
   cd ../frontend && npm install
   ```

5. Build frontend for mobile access:
   ```
   cd frontend && npm run build
   ```

6. (Optional) Set up TTS service:
   ```
   cd tts
   pip install fastapi uvicorn edge-tts pydantic
   ```

7. Generate self-signed SSL cert for HTTPS (enables mobile mic access):
   ```
   cd backend
   openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
   ```

8. Start the app:
   ```
   # From the project root:
   start.bat
   ```
   Or start manually:
   ```
   # Terminal 1 - TTS Service (optional)
   cd tts && python app.py

   # Terminal 2 - Backend
   cd backend && npm start

   # Terminal 3 - Frontend (desktop dev only)
   cd frontend && npm run dev
   ```

9. Access Nova:
   - **Desktop:** http://localhost:5173 in Chrome or Edge
   - **Mobile/iPhone:** https://{your-local-ip}:8000 in Safari (accept the self-signed cert)

10. (Optional) Install on iPhone:
    - Open https://{your-local-ip}:8000 in Safari
    - Tap "Show Details" > "visit this website" to accept the cert
    - Tap Share > "Add to Home Screen"

11. (Optional) Connect Google services:
    Visit http://localhost:8080/api/google/auth and sign in to enable Gmail and Calendar.

## Architecture

```
Desktop Browser (localhost:5173) ──> Vite Dev Server
                                          │
                                     proxy /api, /public
                                          │
                                          v
iPhone/Mobile ──────────────────> Port 8000 (HTTPS) ──> Express Backend
                                  self-signed SSL        │
                                  serves frontend/dist   │── Port 8080 (HTTP fallback)
                                                         │   (Google OAuth, Vite proxy target)
                                                         │
                                                         v
                                                   Port 8002 (TTS)
                                                   Python Edge TTS
                                                   FastAPI + AriaNeural
```

## Project Structure

```
ai-companion/
├── backend/
│   ├── server.js        # Express API, HTTPS, serves frontend build, TTS proxy
│   ├── claude.js        # Claude SDK with tool_use (5 tools)
│   ├── modes.js         # Personality modes (girlfriend, assistant, buddy)
│   ├── gmail.js         # Gmail API service
│   ├── calendar.js      # Google Calendar service (all calendars)
│   ├── search.js        # Brave Search API
│   ├── imagegen.js      # Stable Horde image generation
│   ├── notify.js        # ntfy.sh push notifications
│   ├── scheduler.js     # node-cron scheduled check-ins
│   ├── google-auth.js   # Google OAuth2 flow
│   ├── memory.js        # Memory extraction system
│   ├── database.js      # SQLite via sql.js
│   ├── cert.pem         # Self-signed SSL certificate
│   └── key.pem          # SSL private key
├── tts/
│   ├── app.py           # Edge TTS service (FastAPI, AriaNeural voice)
│   └── audio/           # Generated MP3 files (auto-cleaned)
├── frontend/
│   ├── public/
│   │   ├── manifest.json    # PWA manifest
│   │   ├── sw.js            # Service worker
│   │   └── icons/           # SVG app icons (192, 512)
│   └── src/
│       ├── App.jsx           # Main app with mode switcher
│       ├── components/
│       │   └── ChatPanel.jsx # Chat with images, links, speaker buttons
│       ├── hooks/
│       │   ├── useChat.js    # Chat hook with /image command
│       │   └── useVoice.js   # TTS (emoji/URL stripping), STT
│       └── styles/           # Dark theme, mobile-responsive CSS
├── docs/
│   └── TRAINING.md      # Full user training manual
├── start.bat            # One-click launcher (TTS + backend + frontend + mobile URL)
└── CHANGELOG.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message, receive SSE stream |
| GET | `/api/history/:session_id` | Get last 50 messages |
| GET | `/api/memory` | Get stored memories |
| GET | `/api/health` | Server health check |
| GET | `/api/modes` | List personality modes |
| GET | `/api/mode` | Get current mode |
| POST | `/api/mode` | Switch personality mode |
| POST | `/api/image` | Direct image generation (bypasses Claude) |
| GET | `/api/scheduled` | Fetch unread scheduled messages |
| GET | `/api/google/auth` | Start Google OAuth2 flow |
| GET | `/api/google/status` | Check Google auth status |
| POST | `/api/notify/test` | Send test push notification |
| GET | `/api/notify/status` | Check notification config |
| POST | `/api/tts` | Generate speech audio via Edge TTS |
| GET | `/api/tts/status` | Check if TTS service is running |

## Claude Tools

Nova uses Claude's `tool_use` feature with 5 tools:

| Tool | Trigger | Description |
|------|---------|-------------|
| `web_search` | Ask about current events, news, etc. | Searches via Brave Search API |
| `check_email` | "Check my email", "Any new messages?" | Reads Gmail inbox, filters spam |
| `check_calendar` | "What's on my schedule?", "Am I free?" | Reads all Google Calendars |
| `generate_image` | "Generate an image of...", "Draw me..." | Creates image via Stable Horde |
| `send_notification` | "Remind me to...", "Send to my phone" | Pushes to iPhone via ntfy.sh |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `BRAVE_SEARCH_API_KEY` | No | Brave Search API key (free tier) |
| `NTFY_TOPIC` | No | ntfy.sh topic name (default: `nova-companion`) |
| `TTS_PORT` | No | Edge TTS service port (default: `8002`) |
| `TTS_VOICE` | No | Edge TTS voice (default: `en-US-AriaNeural`) |

## Documentation

- **[Training Manual](docs/TRAINING.md)** — Complete user guide with step-by-step instructions for every feature
- **[Changelog](CHANGELOG.md)** — Version history and release notes
