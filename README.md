# Nova AI Companion

A personal AI girlfriend assistant with voice interaction, persistent memory, push notifications, and a professional PWA interface optimized for iPhone and desktop browsers. Nova is powered by the Claude API and runs on a VPS.

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
- **6-Tab Navigation** — Home, Chat, Tasks, Grocery, Alerts, Settings with icon-only bottom tab bar
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

### Grocery List
- **Dedicated Tab** — Full grocery list screen with category grouping (Produce, Dairy, Meat & Seafood, Bakery, Frozen, Pantry, Beverages, Snacks, Household, Other)
- **Auto-Categorization** — Items automatically sorted into categories (e.g. "milk" -> Dairy, "chicken" -> Meat & Seafood)
- **Chat Integration** — "Add milk, eggs, and bread to my grocery list" via voice or text
- **Check & Clear** — Check off items while shopping, clear checked or clear all for new trips
- **Print** — AirPrint via iOS print dialog (formats a clean printable list)
- **Share** — Native iOS share sheet (Messages, Mail, AirDrop, etc.) via Web Share API

### Memory Management
- **View Memories** — Settings > Manage Memories shows everything Nova remembers about you
- **Edit & Delete** — Tap to edit any memory, delete individual memories
- **Grouped by Category** — Personal, Preferences, Work, Interests, Relationship, Events

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
│   ├── claude.js          # Claude integration, 25 tools, personality prompt
│   ├── database.js        # SQLite (15 tables, CRUD functions)
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
│   ├── hacking.js         # Hacking bootcamp logic (curriculum, lessons, challenges, bounties)
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
│       │   ├── TabBar.jsx        # 6-tab icon-only bottom navigation
│       │   ├── HomeScreen.jsx    # Hero avatar, quick actions, cards
│       │   ├── ChatPanel.jsx     # Full-screen chat with collapsed header
│       │   ├── TasksScreen.jsx   # Tasks, reminders, expenses
│       │   ├── AlertsScreen.jsx  # Scheduled messages, dates, mood
│       │   ├── SettingsScreen.jsx # Google, push, location, memories, about
│       │   ├── GroceryScreen.jsx  # Grocery list with categories, print, share
│       │   ├── MemoryScreen.jsx   # Memory management (view/edit/delete)
│       │   ├── Avatar.jsx        # Photo avatar (hero/collapsed)
│       │   ├── WeatherCard.jsx   # Home screen weather
│       │   ├── EventCard.jsx     # Home screen upcoming reminder
│       │   ├── TaskItem.jsx      # Task list item
│       │   ├── ReminderItem.jsx  # Reminder list item
│       │   ├── ParticleBackground.jsx # Lavender/blue bokeh
│       │   ├── HackingCard.jsx  # Hacking bootcamp progress card
│       │   ├── LoginScreen.jsx   # PIN entry with branding
│       │   ├── VoiceControl.jsx  # Mic button
│       │   └── StatusBar.jsx     # Connection indicator
│       ├── hooks/
│       │   ├── useChat.js   # SSE streaming, emotion, geolocation
│       │   ├── useVoice.js  # Whisper STT + EdgeTTS playback
│       │   └── useAvatar.js # Emotion state, blink, mouth animation
│       └── styles/
│           └── global.css   # Midnight Luxe theme (~1600 lines, desktop responsive)
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
| grocery_items | Grocery list with categories |
| hacking_curriculum | 8-module bootcamp with status/progress |
| hacking_lessons | Individual lessons per module |
| hacking_challenges | Daily challenges with scoring |
| hacking_progress | User level, points, streak |
| hacking_bounties | Bug bounty program tracking |

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
| PATCH | /api/memory/:id | Update a memory |
| DELETE | /api/memory/:id | Delete a memory |
| POST | /api/transcribe | Speech-to-text (Whisper) |
| POST | /api/tts | Text-to-speech (emoji-stripped) |

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

### Grocery
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/grocery | List all grocery items |
| POST | /api/grocery | Add grocery item |
| PATCH | /api/grocery/:id | Update grocery item |
| DELETE | /api/grocery/:id | Delete grocery item |
| POST | /api/grocery/clear-checked | Clear checked items |
| POST | /api/grocery/clear-all | Clear entire list |

### Push & Weather
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/push/subscribe | Register push subscription |
| DELETE | /api/push/subscribe | Unregister |
| GET | /api/push/vapid-key | Get VAPID public key |
| POST | /api/push/test | Send test notification |
| GET | /api/weather | Weather for coordinates |

### Hacking Bootcamp
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/hacking/dashboard | Full dashboard (progress, curriculum, challenge, bounties) |
| GET | /api/hacking/curriculum | All modules with status |
| GET | /api/hacking/progress | User level, points, streak |
| GET | /api/hacking/challenge/today | Today's daily challenge |
| GET | /api/hacking/bounties | Tracked bounty programs |

### Google
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/google/auth | Start OAuth flow |
| GET | /api/google/status | Connection status |
| GET | /oauth2callback | OAuth callback |

## Claude Tools

Nova has 25 tools available during conversation:

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
| add_grocery_items | Add items to grocery list (auto-categorizes) |
| check_grocery_items | Check off grocery items by name |
| remove_grocery_items | Remove grocery items by name |
| get_grocery_list | Get current grocery list |
| get_curriculum | Get hacking bootcamp curriculum and lesson progress |
| complete_hacking_lesson | Mark a lesson complete (by name, number, or "next") |
| get_daily_challenge | Get today's hacking challenge |
| save_daily_challenge | Save generated challenge to database |
| submit_challenge_answer | Submit and score challenge answer |
| track_bounty | Add or update bug bounty programs |
| get_hacking_dashboard | Full bootcamp overview |

## Current Status (v2.0)

- [x] Midnight Luxe theme (navy-to-purple gradient)
- [x] 6-tab icon-only navigation (Home, Chat, Tasks, Grocery, Alerts, Settings)
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

### v2.1 (2026-03-21)
- [x] Grocery list with 10 categories and auto-categorization
- [x] Grocery chat integration (4 new Claude tools)
- [x] Print grocery list via AirPrint (browser print dialog)
- [x] Share grocery list via Web Share API / SMS / Email
- [x] Memory management screen (view, edit, delete memories)
- [x] TTS emoji stripping (no more "purple heart" spoken aloud)
- [x] Photo gallery picker (choose existing photos, not just camera)
- [x] Stale push subscription auto-cleanup (VapidPkHashMismatch)
- [x] Scheduled message time-change fix (reset last_sent on reschedule)
- [x] Catch-up firing for missed scheduled messages

### v2.2 (2026-03-22)
- [x] AI Hacking Bootcamp — 8-module curriculum with 5 lessons each, daily challenges, bounty tracking
- [x] 7 new Claude tools for hacking bootcamp (get_curriculum, complete_hacking_lesson, get_daily_challenge, save_daily_challenge, submit_challenge_answer, track_bounty, get_hacking_dashboard)
- [x] 5 new database tables (hacking_curriculum, hacking_lessons, hacking_challenges, hacking_progress, hacking_bounties)
- [x] 5 new API endpoints for hacking dashboard, curriculum, progress, challenges, bounties
- [x] HackingCard component on Home screen with progress, streak, curriculum map
- [x] Clickable module chips — tap unlocked/completed modules to start lessons in chat
- [x] Hacking progress auto-loaded into system prompt — Nova always knows your current module and progress
- [x] Flexible lesson completion matching (exact name, lesson order number, "next", case-insensitive, partial match)
- [x] Self-healing state sync on dashboard load — fixes unlock/completion drift
- [x] Desktop/tablet responsive layout — centered phone-frame with glow on wide screens (768px+)
- [x] Scheduled hacking notifications: daily challenge teaser (3am), weekly recap (Sun 10am), bounty search (Wed 12pm)

### Known Areas for Future Improvement
- Claude-generated scheduled messages (currently hardcoded text)
- Configurable "thinking of you" frequency via UI
- Rich content cards in chat for tool results
- Personality tone slider in Settings
- TTS voice selection in Settings
- PWA app icons (currently using nova-face.jpg)
