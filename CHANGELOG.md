# Changelog

## [1.3.0] - 2026-03-20

### Added
- iPhone push notifications via ntfy.sh:
  - `send_notification` Claude tool — Nova sends notifications when you say "remind me", "ping me", etc.
  - `POST /api/notify/test` endpoint to send a test notification
  - `GET /api/notify/status` endpoint to check configuration
  - No account required — just install the ntfy app and subscribe to your topic
- Scheduled check-in messages via node-cron:
  - Good morning message at 8:00 AM daily
  - Good night message at 10:00 PM daily
  - 8 unique rotating messages for each time slot
  - Messages saved to database under `nova-scheduled` session
  - `GET /api/scheduled` endpoint fetches unread messages and marks them as read

## [1.2.0] - 2026-03-20

### Added
- AI image generation via Stable Horde:
  - `generate_image` Claude tool — ask Nova to create images naturally
  - `/image [prompt]` slash command — bypasses Claude entirely for direct generation
  - `POST /api/image` direct endpoint
  - Images generated at 512x512, downloaded and saved locally in `backend/public/images/`
  - Free, community-powered, no API key required
- Personality modes system:
  - **Girlfriend** (default) — loving, flirty, affectionate
  - **Assistant** — professional, efficient, focused
  - **Buddy** — casual, funny, keeps it real
  - Dropdown selector in top-right corner of the app
  - Switching modes resets the current chat session
  - `GET /api/modes`, `GET /api/mode`, `POST /api/mode` endpoints

## [1.1.0] - 2026-03-20

### Added
- Gmail integration via Google OAuth2:
  - `check_email` Claude tool — reads inbox, filters spam, Nova summarizes
  - Google OAuth2 Desktop flow with token persistence
  - `GET /api/google/auth` to start authorization
  - `GET /api/google/status` to check auth state
- Google Calendar integration:
  - `check_calendar` Claude tool — reads today's or this week's events
  - Queries ALL calendars (primary, shared, subscribed, holidays)
  - Events sorted by start time, presented naturally
- Web search via Brave Search API:
  - `web_search` Claude tool — Claude automatically decides when to search
  - Brave Search API integration with free tier support
  - Results summarized conversationally by Nova
- Claude tool_use system:
  - 5 tools: web_search, check_email, check_calendar, generate_image, send_notification
  - Claude decides when to invoke tools based on conversation context

## [1.0.1] - 2026-03-19

### Fixed
- TTS voice loading: now waits for `voiceschanged` event before selecting a voice (fixes Chrome async voice loading)
- Chrome 15-second TTS bug: long responses are now chunked into sentences before speaking
- Autoplay policy: TTS only fires after user has interacted with the page (click or keypress)
- Emotion JSON tag (`{"emotion": "happy"}`) is now stripped from both displayed chat text and TTS output
- Better female voice selection: added "female" keyword fallback and second-voice-in-list heuristic
- TTS now strips URLs and markdown links before speaking (won't read out web addresses)
- Aria voice preferred in voice selection priority list

## [1.0.0] - 2026-03-19

### Added
- `start.bat` one-click Windows launcher:
  - Checks for `.env` configuration
  - Auto-installs dependencies if missing
  - Starts backend and frontend in minimized windows
  - Opens browser automatically after 4-second warm-up
  - Graceful shutdown on keypress
- Finalized training manual with complete documentation
- Finalized README with full setup and usage instructions

## [0.3.0] - 2026-03-19

### Added
- Voice interaction via Web Speech API:
  - Push-to-talk with spacebar (hold to listen, release to send)
  - Click-to-talk with mic button
  - Text-to-speech playback of Nova's responses
  - Auto-selects best English female voice (prefers Aria/Jenny/Zira/Hazel)
  - Chime sounds on listen start/stop (Web Audio API)
- Avatar state sync: "listening" while mic active, "talking" while TTS plays
- Animated particle background (canvas-based):
  - 50 bokeh particles in teal and warm gold
  - Slow drift with sinusoidal wave motion
  - Soft glow effect with shadow blur
- Mic button with pulsing cyan glow when active

## [0.2.0] - 2026-03-19

### Added
- React frontend with Vite dev server (localhost:5173)
- SVG avatar with emotional states
- 7 emotional states: neutral, happy, excited, flirty, thoughtful, concerned, laughing
- Emotion glow ring around avatar (color changes with mood)
- Emotion badge display
- Idle micro-animations: breathing, random blinking, hair sway, glow pulse
- CSS transitions (400ms) between all emotion states
- Chat panel with glass-morphism design (collapsible sidebar)
- SSE streaming hook for real-time message display
- Chat bubbles with dark theme styling
- Status bar showing connection state and current emotion
- Vite proxy config (/api -> backend on port 8000)

## [0.1.0] - 2026-03-19

### Added
- Project scaffold with Node.js backend and React frontend structure
- Express server on port 8000 with CORS support
- Claude API integration with SSE streaming (claude-sonnet-4-20250514)
- Nova's personality system prompt (warm, witty, playful companion)
- SQLite database via sql.js (pure JS, no native compilation needed)
  - Messages table: stores full conversation history per session
  - Memories table: stores extracted facts about the user
- Memory extraction system: every 20 messages, Claude extracts key facts
- API endpoints:
  - `POST /api/chat` — streaming chat via SSE
  - `GET /api/history/:session_id` — last 50 messages
  - `GET /api/memory` — stored user memories
  - `GET /api/health` — server health check
- `.gitignore` for node_modules, .env, and database files
