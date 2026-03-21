# Changelog

## [2.1.0] - 2026-03-21

### Added — Grocery List
- **Grocery Tab (🛒):** Dedicated grocery list screen with 10 category groupings (Produce, Dairy, Meat & Seafood, Bakery, Frozen, Pantry, Beverages, Snacks, Household, Other).
- **Auto-Categorization:** Items automatically sorted into categories based on keyword matching (e.g. "milk" -> Dairy, "chicken breast" -> Meat & Seafood). Multi-word keywords matched first for accuracy.
- **Chat Integration:** 4 new Claude tools — `add_grocery_items`, `check_grocery_items`, `remove_grocery_items`, `get_grocery_list`. Say "add milk, eggs, and bread to my grocery list" via voice or text.
- **Print (AirPrint):** Print button formats a clean list (unchecked items only, grouped by category) and opens the native iOS print dialog.
- **Share:** Share button uses Web Share API (native iOS share sheet) with SMS/email fallback for browsers without support.
- **Clear Actions:** Clear checked items after shopping, or clear all to start a new trip (with confirmation).
- **Auto-Refresh:** Grocery list re-fetches when tab becomes active, picking up items added via chat.

### Added — Memory Management
- **Manage Memories Screen:** New sub-screen in Settings showing everything Nova remembers, grouped by category (Personal, Preferences, Work, Interests, Relationship, Events).
- **Edit Memories:** Tap any memory to edit inline. Saves on Enter/blur, cancels on Escape.
- **Delete Memories:** Delete individual memories with confirmation prompt.
- **Memory Count Badge:** Settings shows "Manage Memories (N)" with current count.
- **Optimistic UI:** Edit and delete update immediately with rollback on API failure.

### Added — Photo Gallery
- **Gallery Picker:** New 🖼️ button in chat input for choosing existing photos from library, alongside the existing 📷 camera button.

### Fixed
- **TTS Emoji Stripping:** Emojis are now stripped from text before sending to EdgeTTS, so Nova no longer reads out emoji names like "purple heart" or "sun with face". Uses Unicode `\p{Extended_Pictographic}` regex.
- **Stale Push Subscription Cleanup:** Push subscriptions with `VapidPkHashMismatch` (400 error) are now auto-removed, not just 410 Gone.
- **Scheduled Message Time Change:** Changing a scheduled message's time now resets `last_sent` to null, ensuring it fires at the new time on the same day.
- **Missed Scheduled Messages:** Scheduler now uses catch-up firing (`currentTime >= s.time`) instead of exact-minute matching, so messages fire even if the server restarts or the schedule is set after the target minute.

### Changed
- **Tab Bar:** Now 6 tabs (added Grocery) with icon-only display (labels removed) to fit on smaller iPhone screens.
- **Database:** Added `grocery_items` table (10th table). Added `updateMemory`, `deleteMemory` functions. Fixed `getMemories` to include `id` field.
- **API:** 8 new endpoints (6 grocery + 2 memory edit/delete). TTS endpoint now strips emojis.
- **Claude Tools:** 18 total (was 14). Added 4 grocery tools.

## [2.0.0] - 2026-03-21

### Added — iPhone Redesign
- **Midnight Luxe Theme:** Navy-to-purple gradient background, lavender/blue accents, glass morphism surfaces. Replaced flat black (#0a0a0f) entirely.
- **5-Tab Navigation:** Bottom tab bar with Home, Chat, Tasks, Alerts, Settings. State-based routing (no React Router). 250ms crossfade transitions.
- **Home Screen:** Hero avatar (160px), "Nova" name with online status and emotion, quick action buttons (Voice, Chat, Photo), last message preview card, weather card, upcoming event card.
- **Full-Screen Chat:** Converted from sidebar overlay to full-screen tab. Collapsed 36px avatar header. iMessage-style bubbles with Nova's mini avatar. 16px font. Mic button in input area.
- **Tasks Screen:** Grouped task lists (To-Do, Shopping, Custom), checkbox toggle, swipe delete, FAB add button, reminders section, expense summary.
- **Alerts Screen:** Good morning/night toggles with time pickers, special dates with add form, mood history with emoji mapping.
- **Settings Screen:** Google account status, push notification toggle with service worker subscription, weather location via geolocation, about section.
- **PWA:** manifest.json (standalone, portrait), service worker with cache-first for assets and network-first for HTML, push notification handler, Apple meta tags (web-app-capable, black-translucent status bar).
- **Push Notifications:** Web Push API with VAPID keys, Apple push support, scheduler delivers reminders, scheduled messages, and "thinking of you" nudges.
- **Scheduler (node-cron):** Checks every 60 seconds for due reminders, fires good morning/night messages at configured times, random "thinking of you" nudges during waking hours (8am-10pm PST).
- **Weather Module:** OpenWeatherMap API with 30-minute cache. Current conditions + 8-period forecast.
- **Web Search Module:** Brave Search API wrapper returning top 5 results.
- **Restaurant Finder:** Google Places text search for nearby restaurants.
- **Push Module:** VAPID key generation/storage, web-push delivery to all subscriptions, expired subscription cleanup (410 Gone only).
- **10 New Claude Tools:** create_task, complete_task, create_reminder, log_expense, get_expense_summary, get_weather, search_restaurants, search_web, log_mood, create_special_date.
- **7 New Database Tables:** tasks, reminders, expenses, scheduled_messages, mood_logs, special_dates, push_subscriptions.
- **20 New API Endpoints:** Full CRUD for all new tables plus weather proxy and push management.
- **Home Screen Cards:** WeatherCard (auto geolocation) and EventCard (next upcoming reminder).
- **Error Boundary:** React error boundary in main.jsx catches crashes and shows error message with "Clear Data & Reload" button.
- **Service Worker Reset Page:** `/clear-sw.html` for clearing stuck service workers.
- **Test Push Endpoint:** `POST /api/push/test` for debugging push delivery.

### Fixed
- **Mic Toggle Bug:** Replaced onClick with onPointerDown, added 300ms debounce guard, synchronized isListening state with MediaRecorder.onstop callback, enlarged tap target to 72px, removed scale transform on active state.
- **Text Size:** Bumped chat messages to 16px (Apple HIG minimum), labels to 13px, minimum 11px anywhere. All inputs 16px+ to prevent Safari auto-zoom.
- **Google OAuth Redirect:** Callback page now auto-redirects to app after 1.5s instead of showing static "close this tab" message (didn't work in PWA).
- **AlertsScreen Field Names:** Fixed mismatches between frontend (send_time, days_before, recorded_at) and backend API (time, remind_days_before, timestamp).
- **Service Worker Caching:** Changed from cache-first for HTML to network-first, preventing stale bundles after deploys. Bumped cache version.
- **Database Create Functions:** Fixed sql.js `last_insert_rowid()` not working in prepared statements — switched to `ORDER BY id DESC LIMIT 1`.
- **Push VAPID Subject:** Changed from `mailto:nova@localhost` to site URL — Apple rejected the JWT with localhost.
- **Push Error Handling:** Only delete subscriptions on 410 Gone (was deleting on any error). Detailed logging with status code and body.
- **Push Resubscribe:** Settings screen now unsubscribes existing subscription before resubscribing (handles VAPID key rotation).
- **Scheduler Timezone:** Uses `USER_TIMEZONE` env var (default America/Los_Angeles) instead of server UTC.
- **Particle Background:** Updated colors from teal/gold to lavender/blue matching Midnight Luxe.

### Changed
- Avatar system now supports `size` prop: "hero" (160px), "collapsed" (36px), default (280px)
- Chat panel is full-screen tab instead of sidebar overlay
- Login screen updated with Nova branding (avatar image, glass morphism card)
- Font stack changed to `-apple-system, 'SF Pro Display', system-ui`
- All CSS variables updated for Midnight Luxe palette
- PORT is now configurable via environment variable (default 8000)

### Dependencies Added
- `web-push` — Push notification delivery
- `node-cron` — Scheduled task runner

## [1.0.1] - 2026-03-19

### Fixed
- TTS voice loading: now waits for `voiceschanged` event before selecting a voice (fixes Chrome async voice loading)
- Chrome 15-second TTS bug: long responses are now chunked into sentences before speaking
- Autoplay policy: TTS only fires after user has interacted with the page (click or keypress)
- Emotion JSON tag (`{"emotion": "happy"}`) is now stripped from both displayed chat text and TTS output
- Better female voice selection: added "female" keyword fallback and second-voice-in-list heuristic

## [1.0.0] - 2026-03-19

### Added
- `start.bat` one-click Windows launcher
- Finalized training manual and README

## [0.3.0] - 2026-03-19

### Added
- Voice interaction via Web Speech API (push-to-talk with spacebar, click mic button)
- Text-to-speech playback with female voice selection
- Animated particle background (50 bokeh particles)
- Mic button with pulsing glow

## [0.2.0] - 2026-03-19

### Added
- React frontend with animated SVG avatar
- 7 emotional states with CSS transitions
- Idle animations (breathing, blinking, hair sway)
- Glass-morphism chat panel
- SSE streaming for real-time responses

## [0.1.0] - 2026-03-19

### Added
- Express backend with Claude API streaming
- SQLite database (messages + memories tables)
- Memory extraction system (every 20 messages)
- Initial API endpoints and project scaffold
