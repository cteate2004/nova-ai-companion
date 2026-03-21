# Nova AI Companion

A personal AI girlfriend assistant with voice interaction, persistent memory, push notifications, and a professional iPhone-optimized PWA interface. Nova is powered by the Claude API and runs on a VPS.

**Live URL:** `https://nova.srv1042999.hstgr.cloud`

## Features

### Core
- **Photo Avatar** — Real image avatar with 9 emotion states and dynamic glow effects
- **Voice Interaction** — Push-to-talk with Whisper STT and EdgeTTS text-to-speech
- **Streaming Chat** — Real-time SSE responses with iMessage-style bubbles
- **Persistent Memory** — Nova remembers details about you across conversations (auto-extracts every 5 messages)
- **PIN Authentication** — Simple numeric PIN with 30-day token sessions

### iPhone Redesign (v2.0)
- **Midnight Luxe Theme** — Navy-to-purple gradient, lavender/blue accents, glass morphism. No flat black.
- **5-Tab Navigation** — Home, Chat, Tasks, Alerts, Settings with bottom tab bar
- **PWA** — Add to Home Screen for native app feel, standalone mode, push notifications
- **Hero Avatar** — 160px hero on Home screen, collapses to 36px in Chat header
- **Mobile Polish** — Safe areas, 16px fonts (no Safari zoom), momentum scrolling, 72px touch targets

### Integrations
- **Gmail** — Read inbox, search, send emails via Google API
- **Google Calendar** — View events, create events
- **Flight Search** — Search flights with links to booking sites
- **Rental Search** — Search apartments/rentals
- **Weather** — Current conditions + forecast via OpenWeatherMap
- **Restaurant Finder** — Nearby restaurant search via Google Places
- **Web Search** — General web search via Brave Search API

### Proactive Features
- **Scheduled Messages** — Good morning/goodnight push notifications at configurable times
- **"Thinking of You" Nudges** — Random sweet notifications 1-5x per day during waking hours (8am-10pm PST)
- **Reminders** — "Remind me to call mom at 5pm" → push notification when due
- **Special Dates** — Anniversary and birthday reminders with advance notice
- **Mood Tracking** — Logs mood from conversation, tracks patterns over time

### Task Management
- **To-Do Lists** — Create and manage via chat or Tasks tab
- **Shopping Lists** — Separate list for shopping items
- **Expense Tracking** — Log expenses via chat, view summaries by category
- **Quick Timers** — Set timers with push notification on completion

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6 |
| Backend | Node.js 20, Express 5 |
| Database | SQLite via sql.js (pure JS) |
| AI | Claude API (claude-sonnet-4-20250514) |
| STT | OpenAI Whisper API |
| TTS | EdgeTTS (external service) |
| Push | Web Push API with VAPID keys |
| Scheduler | node-cron |
| Reverse Proxy | Traefik (Docker) with Let's Encrypt SSL |

## Prerequisites

- Node.js 18+ and npm
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com/))
- OpenAI API key (for Whisper STT)
- EdgeTTS service running (for text-to-speech)
- Google API credentials (for Gmail, Calendar, Places)

### Optional API Keys
- `OPENWEATHER_API_KEY` — Weather features (free tier: 1000 calls/day)
- `BRAVE_SEARCH_API_KEY` — Web search and news (free tier: 2000 queries/month)
- `GOOGLE_PLACES_API_KEY` — Restaurant finder (or uses existing Google credentials)

## Setup

### Environment
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
NOVA_PIN=1234
TTS_URL=http://localhost:5050/tts
USER_TIMEZONE=America/Los_Angeles

# Optional
OPENWEATHER_API_KEY=...
BRAVE_SEARCH_API_KEY=...
```

### Install & Run
```bash
# Backend
cd backend && npm install && npm start

# Frontend (development)
cd frontend && npm install && npm run dev

# Frontend (production build)
cd frontend && npm run build
```

Production mode: the backend serves the built frontend from `frontend/dist/` on port 8000.

### Traefik (Production)
Nova is proxied through Traefik via `/opt/traefik-dynamic/nova.yml`:
```yaml
http:
  routers:
    nova:
      rule: "Host(`nova.srv1042999.hstgr.cloud`)"
      entryPoints: [websecure]
      service: nova
      tls:
        certResolver: mytlschallenge
  services:
    nova:
      loadBalancer:
        servers:
          - url: "http://172.18.0.1:8000"
```

## Project Structure

```
nova/
├── backend/
│   ├── server.js          # Express routes, SSE streaming, API endpoints
│   ├── claude.js          # Claude integration, 14 tools, personality prompt
│   ├── database.js        # SQLite (9 tables, CRUD functions)
│   ├── memory.js          # Fact extraction every 5 messages
│   ├── scheduler.js       # Cron: reminders, scheduled messages, nudges
│   ├── push.js            # Web Push with VAPID keys
│   ├── weather.js         # OpenWeatherMap wrapper (30min cache)
│   ├── web-search.js      # Brave Search wrapper
│   ├── places.js          # Google Places restaurant search
│   ├── google-auth.js     # OAuth2 for Gmail/Calendar
│   ├── gmail.js           # Gmail API wrapper
│   ├── calendar.js        # Calendar API wrapper
│   ├── flights.js         # Flight search
│   ├── rentals.js         # Rental search
│   └── data/
│       ├── nova.db        # SQLite database
│       ├── vapid-keys.json # Push notification keys
│       └── google-token.json # OAuth token
├── frontend/
│   ├── public/
│   │   ├── manifest.json  # PWA manifest
│   │   ├── sw.js          # Service worker (cache + push)
│   │   ├── nova-face.jpg  # Avatar photo
│   │   └── clear-sw.html  # Service worker reset page
│   └── src/
│       ├── App.jsx        # Auth + tab router
│       ├── main.jsx       # Entry + error boundary + SW registration
│       ├── components/
│       │   ├── TabBar.jsx        # 5-tab bottom navigation
│       │   ├── HomeScreen.jsx    # Hero avatar, quick actions, cards
│       │   ├── ChatPanel.jsx     # Full-screen chat with collapsed header
│       │   ├── TasksScreen.jsx   # Tasks, reminders, expenses
│       │   ├── AlertsScreen.jsx  # Scheduled messages, dates, mood
│       │   ├── SettingsScreen.jsx # Google, push, location, about
│       │   ├── Avatar.jsx        # Photo avatar (hero/collapsed)
│       │   ├── WeatherCard.jsx   # Home screen weather
│       │   ├── EventCard.jsx     # Home screen upcoming reminder
│       │   ├── TaskItem.jsx      # Task list item
│       │   ├── ReminderItem.jsx  # Reminder list item
│       │   ├── ParticleBackground.jsx # Lavender/blue bokeh
│       │   ├── LoginScreen.jsx   # PIN entry with branding
│       │   ├── VoiceControl.jsx  # Mic button
│       │   └── StatusBar.jsx     # Connection indicator
│       ├── hooks/
│       │   ├── useChat.js   # SSE streaming, emotion, geolocation
│       │   ├── useVoice.js  # Whisper STT + EdgeTTS playback
│       │   └── useAvatar.js # Emotion state, blink, mouth animation
│       └── styles/
│           └── global.css   # Midnight Luxe theme (~900 lines)
├── tts/                    # EdgeTTS service (separate)
├── docs/
│   ├── TRAINING.md         # User training manual
│   └── superpowers/
│       ├── specs/          # Design specs
│       └── plans/          # Implementation plans
└── CHANGELOG.md
```

## Database Tables

| Table | Purpose |
|-------|---------|
| messages | Chat history per session |
| memories | Extracted facts about user |
| tasks | To-do and shopping list items |
| reminders | Timed reminders with push delivery |
| expenses | Expense tracking with categories |
| scheduled_messages | Good morning/night message config |
| mood_logs | Mood entries with timestamps |
| special_dates | Anniversaries and birthdays |
| push_subscriptions | Web Push subscription endpoints |

## API Endpoints

### Auth (no auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | PIN authentication |
| GET | /api/auth/check | Verify token |

### Chat & AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat | Send message, receive SSE stream |
| GET | /api/history/:session_id | Get message history |
| GET | /api/memory | Get stored memories |
| POST | /api/transcribe | Speech-to-text (Whisper) |
| POST | /api/tts | Text-to-speech (EdgeTTS) |

### Tasks & Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /api/tasks | List/create tasks |
| PATCH/DELETE | /api/tasks/:id | Update/delete task |
| GET/POST | /api/reminders | List/create reminders |
| DELETE | /api/reminders/:id | Delete reminder |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /api/expenses | List/create expenses |
| GET | /api/expenses/summary | Category totals |

### Alerts & Mood
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /api/scheduled-messages | Manage scheduled messages |
| PATCH | /api/scheduled-messages/:id | Toggle/update schedule |
| GET/POST | /api/mood | Mood history/log |
| GET/POST | /api/special-dates | Manage special dates |
| DELETE | /api/special-dates/:id | Delete special date |

### Push & Weather
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/push/subscribe | Register push subscription |
| DELETE | /api/push/subscribe | Unregister |
| GET | /api/push/vapid-key | Get VAPID public key |
| POST | /api/push/test | Send test notification |
| GET | /api/weather | Weather for coordinates |

### Google
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/google/auth | Start OAuth flow |
| GET | /api/google/status | Connection status |
| GET | /oauth2callback | OAuth callback |

## Claude Tools

Nova has 14 tools available during conversation:

| Tool | Description |
|------|-------------|
| search_flights | Search flights between cities |
| search_rentals | Search rental properties |
| check_gmail / read_email / send_email / search_email | Gmail operations |
| get_calendar_events / get_today_events / create_calendar_event | Calendar operations |
| create_task / complete_task | To-do and shopping list management |
| create_reminder | Set timed reminders with push notifications |
| log_expense / get_expense_summary | Expense tracking |
| get_weather | Current weather and forecast |
| search_restaurants | Nearby restaurant search |
| search_web | General web search |
| log_mood | Record user's mood |
| create_special_date | Save anniversaries and important dates |

## Current Status (v2.0)

- [x] Midnight Luxe theme (navy-to-purple gradient)
- [x] 5-tab navigation (Home, Chat, Tasks, Alerts, Settings)
- [x] PWA with manifest and service worker
- [x] Push notifications (VAPID + Apple Web Push)
- [x] Hero/collapsed avatar system
- [x] Mic toggle bug fix (debounce + onPointerDown)
- [x] 10 new Claude tools
- [x] 7 new database tables with CRUD
- [x] 20 new API endpoints
- [x] Scheduler for reminders, messages, nudges
- [x] Weather, web search, restaurant finder modules
- [x] Tasks, Alerts, Settings full UI screens
- [x] Home screen cards (weather, upcoming event)
- [x] Mobile polish (safe areas, scroll, transitions)
- [x] Google OAuth auto-redirect back to app
- [x] iPhone-optimized font sizes (16px min)

### Known Areas for Future Improvement
- Claude-generated scheduled messages (currently hardcoded text)
- Configurable "thinking of you" frequency via UI
- Rich content cards in chat for tool results
- Personality tone slider in Settings
- TTS voice selection in Settings
- PWA app icons (currently using nova-face.jpg)
