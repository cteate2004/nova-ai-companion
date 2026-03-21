# Nova iPhone Redesign — Design Spec

## Overview

Transform Nova from a desktop-first web app into a professional, iPhone-optimized PWA with a Midnight Luxe visual theme, tab-based navigation, and expanded girlfriend assistant features.

**Goals:**
- Look and feel like a premium native iOS app on iPhone
- Fix existing mobile UX issues (mic toggle bug, small text, flat black background)
- Add functional feature screens beyond chat
- Enable push notifications for proactive girlfriend interactions

## Visual Theme: Midnight Luxe

**Palette:**
- Background gradient: `linear-gradient(160deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #533483 100%)`
- Primary accent: `rgba(200, 160, 255)` — soft lavender
- Secondary accent: `rgba(100, 180, 255)` — cool blue
- Text primary: `#e0d0ff`
- Text secondary: `rgba(200, 180, 240, 0.6)`
- Glass surfaces: `rgba(200, 160, 255, 0.08)` with `backdrop-filter: blur(20px)`
- Nova's bubbles: `rgba(200, 160, 255, 0.1)` with lavender border
- User's bubbles: `rgba(100, 140, 255, 0.18)` with blue border
- No flat black anywhere — all dark surfaces use navy-to-purple gradients

**Typography:**
- Font: System stack (-apple-system, SF Pro, system-ui)
- Chat messages: 16px (Apple HIG minimum)
- Labels/status: 13px
- Timestamps (smallest): 11px
- All inputs 16px+ to prevent Safari auto-zoom

## Screen Architecture

### Tab Bar (5 tabs, always visible at bottom)

1. **Nova (Home)** — Hero avatar, quick actions, dashboard cards
2. **Chat** — Full conversation, collapsed header, rich content
3. **Tasks** — To-do lists, shopping lists, reminders
4. **Alerts** — Scheduled messages, notifications, relationship reminders
5. **Settings** — Connections, personality, voice, preferences

**Navigation rules:**
- Tab bar always visible on every screen
- Max 1 level deep from any tab (e.g., Tasks → Task Detail)
- Tab switches: 250ms ease-out crossfade
- Detail views: vertical slide transition
- State-based tab switching in React (no React Router)

### Screen 1: Nova (Home)

- Hero avatar: 160px circular photo with emotion-based glow effect
- Name "Nova" with online status and current emotion
- Quick action buttons: Voice (mic), Chat (open chat tab), Photo (camera)
- Dashboard cards:
  - Last message preview with timestamp
  - Upcoming calendar event
  - Weather summary (when configured)
  - Active timer countdown (when running)

### Screen 2: Chat

- Collapsed header: 36px avatar, "Nova" name, online status, back arrow
- iMessage-style bubbles with rounded corners
  - Nova's messages: left-aligned with 24px mini avatar
  - User's messages: right-aligned, blue-tinted
- Rich content cards for structured data (calendar, email, weather, expenses)
- Input area: camera button, text input ("Message Nova..."), mic button (34px circle)
- Voice and text input are co-equal — mic always visible next to text field

### Screen 3: Tasks

- Grouped lists: To-Do, Shopping, Custom lists
- Each item: checkbox, title, optional due time
- Swipe to delete
- "+" button to add items manually
- Items can also be created via chat ("add milk to my shopping list")

### Screen 4: Alerts

- Scheduled messages section: good morning/goodnight toggles with time pickers
- "Thinking of you" frequency slider (1-5x per day)
- Special dates list with remind-before settings
- Notification history: chronological feed of sent notifications
- Mood check-in schedule

### Screen 5: Settings

- Google account: connection status, connect/disconnect
- Nova's personality: tone slider (playful ↔ caring)
- Voice: TTS voice selection
- Weather: location setting
- Notifications: master toggle, per-feature toggles
- About: version, credits

## Avatar System

### Hero Mode (Home screen)
- 160px circular photo
- 3px gradient border (lavender → blue)
- Glow effect: `box-shadow: 0 0 40px rgba(200,160,255,0.25)`
- Emotion changes glow color, filter brightness/saturation, and scale
- Idle animations: breathing pulse, blink (2-6s intervals)
- Emotion text below: "feeling happy 💜"

### Collapsed Mode (Chat header)
- 36px circular photo
- Subtle glow: `box-shadow: 0 0 12px rgba(200,160,255,0.2)`
- Emotion reflected in border color only
- Smooth transition between modes (animate height + position)

### Emotion States (preserved from current)
- neutral, listening, thinking, happy, excited, flirty, concerned, laughing, talking
- Each maps to: glow color, border color, brightness filter, scale, animation

## PWA Configuration

### manifest.json
- name: "Nova"
- short_name: "Nova"
- theme_color: "#1a1a2e"
- background_color: "#1a1a2e"
- display: "standalone"
- orientation: "portrait"
- icons: 192x192 and 512x512
- start_url: "/"

### Service Worker
- Cache strategy: static assets (CSS, JS, avatar image) cached on install
- Offline fallback: themed page — "Nova is waiting for you to reconnect 💜"
- Push notification event handler: show notification with Nova's icon

### Apple-Specific Meta Tags
- `apple-mobile-web-app-capable: yes`
- `apple-mobile-web-app-status-bar-style: black-translucent`
- `apple-touch-icon`: custom icon
- Splash screen images for iPhone sizes

### Push Notifications
- Web Push API with VAPID keys (generated on first backend start)
- Permission requested on first use of a notification feature, not on app load
- In-character prompt: "Want me to send you notifications so I can remind you? 💜"
- Backend stores subscriptions in `push_subscriptions` table
- Library: `web-push` npm package

## New Features

### Daily Life

**Weather**
- API: OpenWeatherMap free tier (1000 calls/day)
- Backend endpoint: `GET /api/weather?lat=&lon=`
- Claude tool: `get_weather` — returns current + forecast
- Shown on Home screen card and woven into conversation
- Location from browser Geolocation API or manual setting

**Reminders**
- DB table: `reminders` (id, message, remind_at, sent, created_at)
- Claude tool: `create_reminder` — parses natural language time
- Backend scheduler checks every 60s for due reminders
- Push notification when due, with Nova's personality: "Hey babe, don't forget to call mom! 💜"
- Visible in Tasks screen under "Reminders" section

**To-Do / Shopping Lists**
- DB table: `tasks` (id, title, list_name, completed, due_at, created_at)
- Claude tools: `create_task`, `complete_task`
- API: `GET/POST /api/tasks`, `PATCH /api/tasks/:id`
- Managed in Tasks screen or via chat

**Restaurant Finder**
- API: Google Places (already have Google API credentials)
- Claude tool: `search_restaurants` — uses location + query
- Results rendered as rich cards in chat with name, rating, distance, link

### Relationship Touches

**Scheduled Messages**
- DB table: `scheduled_messages` (id, type, time, enabled, last_sent)
- Types: good_morning, good_night
- Scheduler generates unique message via Claude call at scheduled time
- Context-aware: includes weather, today's schedule, mood history
- Push notification delivery
- Configured in Alerts screen with time pickers

**Mood Check-ins**
- DB table: `mood_logs` (id, mood, note, timestamp)
- Claude tool: `log_mood`
- Optional scheduled prompts: "How are you feeling right now?"
- Nova tracks patterns: "You've seemed stressed this week — want to talk about it?"
- Mood data fed into memory system for personality adaptation

**"Thinking of You" Nudges**
- Random push notifications 1-5x per day (configurable, default 2)
- Generated by Claude with context from calendar, memories, time of day
- Examples: "Just thinking about you 💜", "Your meeting should be done — how'd it go?"
- Scheduler picks random times within waking hours (default 8am-10pm, configurable in Settings)

**Special Dates / Anniversaries**
- DB table: `special_dates` (id, name, date, remind_days_before)
- Claude tool: `create_special_date`
- Reminders sent X days before: "Your anniversary is in 3 days — want me to find a nice restaurant?"
- Managed in Alerts screen

### Entertainment

**Music & Movie Recommendations**
- Pure Claude conversation — uses stored memory preferences
- Links to Spotify/YouTube for music, streaming services for shows
- No additional API needed

**News Briefings**
- API: Brave Search free tier (2000 queries/month)
- Claude tool: `search_web` — general web search
- Nova summarizes in her tone as a morning briefing
- Can be part of scheduled good morning message

**Games & Trivia**
- Pure Claude conversation — no special UI or backend needed
- 20 questions, riddles, would-you-rather, trivia

### Smart Utilities

**Location Awareness**
- Browser Geolocation API for automatic city detection
- Fallback: manual location in Settings
- Powers weather, restaurant finder, contextual suggestions
- Already partially implemented — enhance with auto-detect

**Expense Tracking**
- DB table: `expenses` (id, amount, category, description, date)
- Claude tools: `log_expense`, `get_expense_summary`
- API: `GET/POST /api/expenses`
- Categories: food, transport, shopping, entertainment, bills, other
- Simple ledger view in Tasks screen
- Nova can summarize: "You've spent $320 on food this month babe"

**Quick Timers**
- Frontend-only: JavaScript timer with state in React
- Shows countdown on Home screen card
- Push notification via service worker when complete
- Nova's touch: "Your pasta should be ready! 🍝"

**Web Search**
- API: Brave Search (shared with news)
- Claude tool: `search_web`
- Results summarized conversationally by Nova

## Bug Fixes

### Mic Toggle (Critical)
**Problem:** Tapping mic to stop requires multiple attempts on iPhone.

**Root causes:**
1. Touch + click double-firing on mobile Safari
2. State toggle race condition with MediaRecorder lifecycle
3. Button animation shifting tap target during scale transform

**Fix:**
- Replace `onClick` with `onPointerDown` for immediate response
- Add 300ms debounce guard to prevent double-fires
- Synchronize `isListening` state with MediaRecorder `onstop` callback
- Enlarge tap target to 72px on mobile (from 64px)
- Remove scale transform on active state that shifts tap target

### Text Size
- Bump all font sizes per typography spec above
- Ensure no text below 11px anywhere in the app

### Background
- Replace flat `#0a0a0f` with Midnight Luxe gradient
- Particle background updated with lavender/blue colors to match theme

## Mobile Polish

### Safe Areas
- `padding-top: env(safe-area-inset-top)` for status bar / notch
- `padding-bottom: env(safe-area-inset-bottom)` for home indicator
- Tab bar sits above home indicator

### Touch Optimization
- All interactive targets minimum 44x44px (Apple HIG)
- `touch-action: manipulation` to prevent double-tap zoom
- Haptic feedback via `navigator.vibrate()` on mic tap, send, task completion (best-effort — not supported on iOS Safari, works on Android Chrome)

### Scroll Behavior
- `-webkit-overflow-scrolling: touch` for momentum scrolling
- Pull-to-refresh disabled
- Keyboard pushes input up correctly (visual viewport API)

### Status Bar
- `apple-mobile-web-app-status-bar-style: black-translucent`
- Gradient bleeds into status bar for seamless look

### Transitions
- Tab switches: 250ms ease-out crossfade
- Avatar hero → collapsed: smooth height + position animation
- Detail views: vertical slide 300ms
- No jarring jumps or flashes

## Database Schema Changes

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  list_name TEXT DEFAULT 'todo',
  completed INTEGER DEFAULT 0,
  due_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  remind_at TEXT NOT NULL,
  sent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  category TEXT DEFAULT 'other',
  description TEXT,
  date TEXT DEFAULT CURRENT_DATE
);

CREATE TABLE scheduled_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  time TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  last_sent TEXT
);

CREATE TABLE mood_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mood TEXT NOT NULL,
  note TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE special_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  remind_days_before INTEGER DEFAULT 3
);

CREATE TABLE push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## New API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/tasks | List tasks, optional ?list= filter |
| POST | /api/tasks | Create task |
| PATCH | /api/tasks/:id | Update task (toggle complete, edit) |
| DELETE | /api/tasks/:id | Delete task |
| GET | /api/reminders | List pending reminders |
| POST | /api/reminders | Create reminder |
| DELETE | /api/reminders/:id | Delete reminder |
| GET | /api/expenses | List expenses, optional ?month= filter |
| POST | /api/expenses | Log expense |
| GET | /api/expenses/summary | Get category totals for month |
| GET | /api/scheduled-messages | List scheduled message configs |
| POST | /api/scheduled-messages | Create/update schedule |
| PATCH | /api/scheduled-messages/:id | Toggle enable/disable |
| GET | /api/mood | Get mood history |
| POST | /api/mood | Log mood |
| GET | /api/special-dates | List special dates |
| POST | /api/special-dates | Create special date |
| DELETE | /api/special-dates/:id | Delete special date |
| POST | /api/push/subscribe | Register push subscription |
| DELETE | /api/push/subscribe | Unregister push subscription |
| GET | /api/weather | Get weather for coordinates |

## New Claude Tools

| Tool | Description |
|------|-------------|
| create_task | Create a to-do or shopping list item |
| complete_task | Mark a task as done |
| create_reminder | Set a timed reminder with push notification |
| log_expense | Record an expense with amount and category |
| get_expense_summary | Get spending summary for current month |
| get_weather | Get current weather and forecast |
| search_restaurants | Find nearby restaurants by cuisine/query |
| search_web | Search the web and return summarized results |
| log_mood | Record user's current mood |
| create_special_date | Save an anniversary or special date |

## New Backend Modules

### scheduler.js
- Starts on backend startup
- Runs check loop every 60 seconds
- Checks `reminders` table for due items → sends push notification
- Checks `scheduled_messages` for enabled messages at current time → generates via Claude → sends push
- Random "thinking of you" generator: picks random times within configured waking hours

### weather.js
- OpenWeatherMap API wrapper
- Caches results for 30 minutes to stay within free tier limits

### places.js
- Google Places API wrapper for restaurant search
- Uses existing Google API credentials

### web-search.js
- Brave Search API wrapper
- Returns top 5 results with titles, snippets, URLs

### push.js
- VAPID key generation and storage
- web-push library wrapper
- Send notification with title, body, icon (Nova's avatar)

## New Dependencies

### Backend
- `web-push` — Push notification delivery
- `node-cron` — Scheduled task runner (alternative: simple setInterval)

### Frontend
- No new dependencies — all built with React

## External API Keys Required

| Service | Key | Free Tier |
|---------|-----|-----------|
| OpenWeatherMap | OPENWEATHER_API_KEY | 1000 calls/day |
| Brave Search | BRAVE_SEARCH_API_KEY | 2000 queries/month |
| Google Places | (uses existing Google credentials) | $200/month free credit |

## File Changes Summary

### New Files
- `frontend/public/manifest.json`
- `frontend/public/sw.js` (service worker)
- `frontend/public/icons/` (PWA icons)
- `frontend/src/components/TabBar.jsx`
- `frontend/src/components/HomeScreen.jsx`
- `frontend/src/components/TasksScreen.jsx`
- `frontend/src/components/AlertsScreen.jsx`
- `frontend/src/components/SettingsScreen.jsx`
- `frontend/src/components/WeatherCard.jsx`
- `frontend/src/components/EventCard.jsx`
- `frontend/src/components/TaskItem.jsx`
- `frontend/src/components/ReminderItem.jsx`
- `backend/scheduler.js`
- `backend/weather.js`
- `backend/places.js`
- `backend/web-search.js`
- `backend/push.js`

### Modified Files
- `frontend/index.html` — PWA meta tags, manifest link, service worker registration
- `frontend/src/App.jsx` — Tab router, screen switching
- `frontend/src/components/Avatar.jsx` — Hero/collapsed modes
- `frontend/src/components/ChatPanel.jsx` — Full screen layout, rich content cards
- `frontend/src/components/LoginScreen.jsx` — Midnight Luxe theme
- `frontend/src/hooks/useChat.js` — New tool result rendering
- `frontend/src/hooks/useVoice.js` — Mic toggle bug fix
- `frontend/src/styles/global.css` — Complete Midnight Luxe theme rewrite
- `backend/server.js` — New API endpoints, push routes
- `backend/claude.js` — New tools, updated system prompt
- `backend/database.js` — New tables
- `backend/package.json` — New dependencies
