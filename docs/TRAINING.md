# Nova AI Companion — Training Manual

Welcome to Nova, your personal AI companion. This guide walks you through everything: setup, features, and daily usage.

---

## 1. Getting Started

### Prerequisites

- **Node.js 18+** — check with `node --version` (download from https://nodejs.org/)
- **npm** — comes with Node.js, check with `npm --version`
- **Anthropic API key** (required) — get one at https://console.anthropic.com/
- **Brave Search API key** (optional, free tier) — get one at https://brave.com/search/api/
- **Google Cloud project** (optional) — for Gmail and Calendar integration
- **ntfy app on iPhone** (optional) — for push notifications
- **Chrome or Edge browser** — required for voice features

### API Key Setup

1. Navigate to the `backend/` folder
2. Copy `.env.example` to `.env`:
   ```
   cp backend/.env.example backend/.env
   ```
3. Open `backend/.env` in a text editor and fill in your keys:
   ```env
   # Required
   ANTHROPIC_API_KEY=sk-ant-...

   # Optional — enables web search
   BRAVE_SEARCH_API_KEY=BSA...

   # Optional — push notification topic (default: nova-companion)
   NTFY_TOPIC=nova-companion
   ```
4. Place a face image as `frontend/public/nova-face.jpg` (or `.png`) for Nova's avatar.

### First Launch

1. Double-click **`start.bat`** in the project root
2. Wait for the backend and frontend to start (status messages will appear)
3. Your browser opens automatically to **http://localhost:5173**

### Manual Launch (if start.bat doesn't work)

Open two terminal windows:

**Terminal 1 — Backend:**
```
cd backend
npm install   (first time only)
npm start
```
You should see: `[Nova] Backend running on http://localhost:8000`

**Terminal 2 — Frontend:**
```
cd frontend
npm install   (first time only)
npm run dev
```
You should see: `Local: http://localhost:5173/`

Open **http://localhost:5173** in Chrome or Edge.

---

## 2. Chatting with Nova

### Sending Messages

1. Type your message in the input field at the bottom of the chat panel
2. Press **Enter** or click **Send**
3. Nova's response streams in real-time — you see it appear word by word via SSE (Server-Sent Events)

### What It Looks Like

**Casual greeting:**
> **You:** Hey Nova, how's it going?
>
> **Nova:** Hey you! I'm good — always happy when you show up. What's going on today?

**Asking for help:**
> **You:** I'm stuck on a networking issue at work
>
> **Nova:** Okay, tell me what's happening. What kind of networking issue — routing, DNS, firewall stuff? Let's figure it out together.

### Chat History

- Conversations are stored locally in a SQLite database (`backend/data/nova.db`)
- History persists across browser refreshes
- Each browser session gets a unique session ID stored in localStorage
- To start completely fresh, delete `backend/data/nova.db` and restart the backend

---

## 3. Personality Modes

Nova has three personality modes, selectable via the **dropdown in the top-right corner** of the app.

| Mode | Description |
|------|-------------|
| **Girlfriend** (default) | Loving, flirty, affectionate — calls you babe, baby, love. Sweet and spicy. |
| **Assistant** | Professional, efficient, focused — like a sharp and reliable coworker. No pet names. |
| **Buddy** | Casual best friend — chill, funny, uses slang, keeps it real. Equal parts hype man and reality check. |

**Important:** Switching modes resets the current chat conversation and starts a new session.

---

## 4. Voice Interaction

### Requirements
- Use **Chrome** or **Edge** browser (Firefox has limited speech support)
- Allow microphone access when prompted

### Push-to-Talk (Spacebar)

1. Make sure the chat input field is **NOT** focused (click somewhere on the background)
2. **Hold the spacebar** to start listening — you'll hear a chime and the mic activates
3. **Speak your message** while holding spacebar
4. **Release spacebar** — another chime plays, your speech is transcribed and sent to Nova
5. Nova's response appears in chat AND is spoken aloud

### Click-to-Talk (Mic Button)

1. Click the **microphone button**
2. Speak your message
3. Click again to stop (or it stops automatically after silence)

### Text-to-Speech (TTS)

- Nova automatically speaks her responses aloud after each message
- Uses browser SpeechSynthesis API with the **Aria** voice preferred (falls back to Jenny, Zira, Hazel, or best available English female voice)
- TTS rate is set to 0.95 with a pitch of 1.05 for a natural sound
- **URLs and markdown links are stripped** before speaking — Nova won't read out web addresses
- Long responses are **chunked into sentences** to avoid Chrome's 15-second TTS timeout bug
- TTS only fires after you have interacted with the page (click or keypress) due to browser autoplay policies

### Tips

- The spacebar shortcut only works when you are NOT typing in the chat input
- If voice doesn't work, check that your browser has microphone permission enabled
- To interrupt Nova while she is speaking, the page will stop speech on new interactions

---

## 5. Nova's Emotions

Nova expresses emotions visually through her avatar. Each response includes an emotion that changes the UI:

| Emotion | Glow Color |
|---------|------------|
| **Neutral** | Teal |
| **Happy** | Warm gold |
| **Excited** | Bright orange |
| **Flirty** | Pink / rose |
| **Thoughtful** | Purple |
| **Concerned** | Soft blue |
| **Laughing** | Bright gold |

- The **glow ring** around Nova's avatar photo shifts color based on her current mood
- An **emotion badge** appears briefly at the bottom of the avatar
- Emotions are detected from a JSON tag Claude appends to each response (automatically stripped from displayed text and TTS)

---

## 6. Web Search

Nova can search the internet in real-time using the Brave Search API. Claude decides automatically when a search is needed — no special commands required.

### Setup

1. Go to https://brave.com/search/api/ and sign up (free tier available)
2. Add the key to `backend/.env`:
   ```
   BRAVE_SEARCH_API_KEY=BSA...
   ```
3. Restart the backend server

### How It Works

- You ask a question about current events, news, weather, sports, or anything time-sensitive
- Claude's `tool_use` system automatically triggers the `web_search` tool
- Nova searches, reads the results, and summarizes them conversationally
- Just ask naturally — no special syntax needed

### Examples

> **You:** What's going on with the latest SpaceX launch?
>
> **Nova:** Okay so I just looked that up — SpaceX launched their Starship yesterday and it actually stuck the landing this time! Pretty wild. Want the details?

> **You:** Can you search for the best pizza places in Austin?
>
> **Nova:** I gotchu! So the top spots people are raving about are...

### Without Search

If no Brave API key is configured, Nova still works normally but cannot look up current information from the web.

---

## 7. Gmail Integration

Nova can read your Gmail inbox, filter out spam, and summarize your emails.

### Setup

1. Create a **Google Cloud project** at https://console.cloud.google.com/
2. Enable the **Gmail API**
3. Create **OAuth 2.0 Desktop credentials** and download the `credentials.json` file
4. Place `credentials.json` in the `backend/` folder
5. Start the backend, then visit **http://localhost:8000/api/google/auth** in your browser
6. Sign in with your Google account and grant access
7. A success message confirms the connection — you can close that tab

### How It Works

- Claude uses the `check_email` tool when you ask about your email
- Nova reads your recent inbox messages, filters obvious spam, and gives you a natural summary
- No special commands needed — just ask naturally

### Examples

> **You:** Do I have any emails?
>
> **Nova:** Let me check... You've got 3 new ones. There's one from your boss about the project deadline, a shipping confirmation from Amazon, and a newsletter you can probably skip.

> **You:** Check my inbox
>
> **Nova:** On it! Here's what I see...

---

## 8. Calendar Integration

Nova can read your Google Calendar, including ALL calendars you have access to (primary, shared, subscribed, holidays).

### Setup

Uses the same Google OAuth2 connection as Gmail. If you already set up Gmail:

1. Make sure the **Google Calendar API** is also enabled in your Google Cloud project
2. That's it — the same authorization covers both Gmail and Calendar

If you haven't set up Google yet, follow the Gmail setup steps above but enable both the Gmail API and Calendar API.

### How It Works

- Claude uses the `check_calendar` tool when you ask about your schedule
- Nova queries ALL calendars linked to your Google account (not just the primary one)
- Events are sorted by start time and presented naturally

### Examples

> **You:** What's on my schedule today?
>
> **Nova:** You've got a team standup at 9:30, then lunch with Mike at noon, and a dentist appointment at 3:15.

> **You:** Am I free tomorrow afternoon?
>
> **Nova:** Let me check... Looks clear after 1 PM! Want me to block something off?

---

## 9. Image Generation

Nova can generate AI images using **Stable Horde** — a free, community-powered service. No API key required.

### Two Ways to Generate Images

**Method 1 — Ask Nova naturally:**
> **You:** Can you generate an image of a sunset over mountains?
>
> Nova uses Claude's `generate_image` tool. Claude passes your description to Stable Horde and shares the result.

**Method 2 — Direct `/image` command:**
> **You:** /image a cat wearing a top hat
>
> This bypasses Claude entirely and sends the prompt directly to Stable Horde. Faster, no AI interpretation of your prompt.

### How It Works

1. Your prompt is sent to Stable Horde's API (anonymous access, no key needed)
2. The image is generated on community GPUs (may take 30 seconds to 2 minutes depending on queue)
3. The image is **downloaded and saved locally** in `backend/public/images/`
4. Nova displays the image inline in the chat using markdown image syntax

### Details

- Images are generated at 512x512, 25 steps, CFG scale 7
- Prompts are trimmed to 500 characters max
- Generated images persist locally and are served from the backend's static file directory
- Queue wait times vary — check the backend terminal for progress updates

---

## 10. iPhone Push Notifications

Nova can send push notifications to your iPhone using **ntfy.sh**, a free notification relay service.

### Setup

1. Install the **ntfy** app on your iPhone (free on the App Store)
2. Open the ntfy app and **subscribe** to a topic (e.g., `nova-companion`)
3. Add the topic to `backend/.env`:
   ```
   NTFY_TOPIC=nova-companion
   ```
4. Restart the backend
5. Test it by visiting: `POST http://localhost:8000/api/notify/test` (or use the endpoint directly)

### How It Works

- Claude uses the `send_notification` tool when you ask Nova to remind you, ping you, or send something to your phone
- The notification appears on your iPhone with a title and message
- No account needed, completely free

### Examples

> **You:** Remind me to take out the trash at 6
>
> **Nova:** Done! I just sent a reminder to your phone.

> **You:** Send that to my phone
>
> **Nova:** Sent! Check your notifications, babe.

### Check Status

- `GET http://localhost:8000/api/notify/status` — shows whether notifications are configured and the current topic

---

## 11. Scheduled Check-ins

Nova sends you good morning and good night messages automatically using **node-cron**.

### Schedule

| Time | Message Type |
|------|-------------|
| **8:00 AM** | Good morning — encouraging, affectionate start to your day |
| **10:00 PM** | Good night — sweet, calming wind-down message |

### How It Works

- Messages are randomly selected from a pool of 8 unique morning messages and 8 unique night messages
- Messages are saved to the database under a special `nova-scheduled` session
- The frontend fetches unread scheduled messages via `GET /api/scheduled`
- Once fetched, messages are marked as read so they don't repeat

### Notes

- These run on the server clock, so the backend must be running at those times
- Messages use the Girlfriend personality regardless of current mode selection
- The scheduler starts automatically when the backend starts

---

## 12. Memory System

Nova automatically remembers details about you over time.

### How It Works

1. Every message you send is stored in a local SQLite database
2. Every **20 messages**, Nova analyzes recent conversation to extract key facts
3. Facts are categorized: personal info, preferences, work, interests, events, inside jokes
4. Stored memories are included in Nova's context so she can reference them naturally in future conversations

### What Nova Remembers

- Your name and personal details you share
- Your job, projects, and work situations
- Your interests and preferences
- Important events you mention
- Running jokes between you

### Viewing Memories

Check what Nova has stored:
```
http://localhost:8000/api/memory
```

### Storage

All data is stored locally in `backend/data/nova.db` (SQLite). Nothing is sent to external servers beyond the APIs you configure.

---

## 13. Project File Reference

| File | Purpose |
|------|---------|
| `backend/server.js` | Express server, all API routes, SSE streaming |
| `backend/claude.js` | Claude SDK integration, tool_use (web_search, check_email, check_calendar, generate_image, send_notification) |
| `backend/modes.js` | Personality mode definitions (girlfriend, assistant, buddy) |
| `backend/gmail.js` | Gmail API service — inbox reading, spam filtering |
| `backend/calendar.js` | Google Calendar service — queries ALL calendars including shared/subscribed |
| `backend/search.js` | Brave Search API integration |
| `backend/imagegen.js` | Stable Horde image generation, local download and storage |
| `backend/notify.js` | ntfy.sh push notification service |
| `backend/scheduler.js` | node-cron scheduled check-ins (morning/night) |
| `backend/google-auth.js` | Google OAuth2 flow for Gmail and Calendar |
| `backend/memory.js` | Memory extraction from conversations |
| `backend/database.js` | SQLite database via sql.js |
| `frontend/src/App.jsx` | Main React app with personality mode switcher |
| `frontend/src/components/ChatPanel.jsx` | Chat UI with image and link rendering |
| `frontend/src/hooks/useChat.js` | Chat hook with SSE streaming and `/image` command support |
| `frontend/src/hooks/useVoice.js` | TTS (with URL stripping) and STT via Web Speech API |
| `start.bat` | One-click launcher for backend + frontend |

---

## 14. API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send a message, receive SSE streaming response |
| GET | `/api/history/:session_id` | Get last 50 messages for a session |
| GET | `/api/memory` | Get all stored memories |
| GET | `/api/health` | Server health check |
| GET | `/api/modes` | List available personality modes |
| GET | `/api/mode` | Get current personality mode |
| POST | `/api/mode` | Switch personality mode (`{ "mode": "assistant" }`) |
| POST | `/api/image` | Direct image generation, bypasses Claude (`{ "prompt": "..." }`) |
| GET | `/api/scheduled` | Fetch unread scheduled check-in messages |
| GET | `/api/google/auth` | Start Google OAuth2 sign-in flow |
| GET | `/api/google/status` | Check Google authentication status |
| GET | `/oauth2callback` | Google OAuth2 callback (internal) |
| POST | `/api/notify/test` | Send a test push notification |
| GET | `/api/notify/status` | Check push notification configuration |

---

## 15. Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot connect to server" | Make sure the backend is running on port 8000 |
| No response from Nova | Check that `ANTHROPIC_API_KEY` is set in `backend/.env` |
| Backend won't start | Run `cd backend && npm install` to reinstall dependencies |
| Frontend won't start | Run `cd frontend && npm install` to reinstall dependencies |
| Port already in use | Kill existing processes: `taskkill /f /im node.exe` and restart |
| Nova says she can't search | Make sure `BRAVE_SEARCH_API_KEY` is set in `backend/.env` and restart |
| Avatar shows placeholder | Place `nova-face.jpg` (or `.png`) in `frontend/public/` |
| No voice output (TTS) | Click anywhere on the page first (autoplay policy requires interaction), then send a message |
| TTS cuts off mid-sentence | Already mitigated by sentence chunking. If it persists, try shorter messages |
| Gmail/Calendar not working | Visit `http://localhost:8000/api/google/auth` to authorize, ensure APIs are enabled in Google Cloud |
| Google token expired | Visit `http://localhost:8000/api/google/auth` to re-authorize |
| Image generation slow | Stable Horde uses community GPUs — queue times vary. Check backend terminal for progress |
| Image generation fails | Stable Horde may be under heavy load. Try again in a few minutes |
| Push notifications not arriving | Make sure ntfy app is installed and subscribed to the same topic as in `.env` |
| Scheduled messages not appearing | Backend must be running at 8 AM / 10 PM for cron jobs to fire |
| Mode switch doesn't take effect | Switching modes resets the chat — this is expected behavior |
