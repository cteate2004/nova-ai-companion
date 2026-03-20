# Nova AI Companion — Training Manual

## 1. Getting Started

### Prerequisites
- **Node.js 18+** installed (check with `node --version`)
- **npm** installed (check with `npm --version`)
- **Anthropic API key** — get one at https://console.anthropic.com/

### API Key Setup
1. Navigate to the `backend/` folder
2. Copy `.env.example` to `.env`:
   ```
   cp backend/.env.example backend/.env
   ```
3. Open `backend/.env` in a text editor and replace `your-api-key-here` with your actual Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

### First Launch
1. Double-click `start.bat` in the project root
2. Wait for both servers to start (you'll see status messages)
3. Your browser will open automatically to http://localhost:5173

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

Open http://localhost:5173 in Chrome or Edge.

## 2. Chatting with Nova

### Opening the Chat Panel
- Click the **"💬 Chat"** button in the top-right corner
- The chat panel slides in from the right side

### Sending Messages
1. Type your message in the input field at the bottom of the chat panel
2. Press **Enter** or click **Send**
3. Nova's response streams in real-time — you'll see it appear word by word

### Example Conversations

**Casual greeting:**
> **You:** Hey Nova, how's it going?
>
> **Nova:** Hey you! 😊 I'm good — always happy when you show up. What's going on today?

**Asking for help:**
> **You:** I'm stuck on a networking issue at work
>
> **Nova:** Okay, tell me what's happening. What kind of networking issue — routing, DNS, firewall stuff? Let's figure it out together.

**Just chatting:**
> **You:** I just finished a big project at work
>
> **Nova:** Look at you! 🔥 Okay I see you. Tell me everything — what was the project?

### Closing the Chat Panel
- Click the **✕** button in the panel header
- The panel slides away, leaving the avatar view clean

## 3. Voice Interaction

### Requirements
- Use **Chrome** or **Edge** browser (Firefox has limited speech support)
- Allow microphone access when prompted

### Push-to-Talk (Spacebar)
1. Make sure the chat input field is NOT focused (click somewhere on the background)
2. **Hold the spacebar** to start listening — you'll hear a chime and the mic button glows
3. **Speak your message** while holding spacebar
4. **Release spacebar** — another chime plays, your speech is transcribed and sent to Nova
5. Nova's response appears in chat AND is spoken aloud via text-to-speech

### Click-to-Talk (Mic Button)
1. Click the **microphone button** below Nova's face
2. Speak your message
3. Click again to stop (or it stops automatically after silence)

### Text-to-Speech
- Nova automatically speaks her responses aloud after each message
- While speaking, her avatar enters the "talking" state with mouth animation
- To interrupt Nova while she's speaking, click the mic button

### Tips
- The spacebar shortcut only works when you're NOT typing in the chat input
- If voice doesn't work, check that your browser has microphone permission enabled
- Nova will use the best available English female voice on your system

## 4. Nova's Emotions

Nova's avatar changes expression based on the tone of her response. Here's what each emotion looks like:

| Emotion | Avatar Changes |
|---------|---------------|
| **Neutral** | Relaxed expression, gentle smile, idle animations |
| **Happy** | Wide smile with a hint of teeth, eyes crinkle, cheeks flush |
| **Excited** | Big smile, bright eyes, enhanced glow |
| **Flirty** | Half-lidded eyes, one-sided smirk, subtle blush, eyebrow raise |
| **Thoughtful** | Eyes glance sideways, one eyebrow raised, sparkles near temple |
| **Concerned** | Eyebrows knit together, slight frown, softened eyes |
| **Laughing** | Eyes squint closed, wide open smile, slight head shake |

### Idle Animations (always active)
- **Breathing:** Subtle shoulder/body rise and fall
- **Blinking:** Random blinks every 2-6 seconds
- **Hair sway:** Gentle movement of hair strands
- **Glow:** Soft teal glow pulses around Nova

## 5. Memory System

Nova automatically remembers details about you over time.

### How It Works
- Every message you send is stored in a local SQLite database
- Every 20 messages, Nova analyzes recent conversation to extract key facts
- Facts are categorized: personal info, preferences, work, interests, events, jokes
- Memories are included in Nova's context so she can reference them naturally

### What Nova Remembers
- Your name and personal details you share
- Your job, projects, and work situations
- Your interests and preferences
- Important events you mention
- Running jokes between you

### Viewing Memories
You can check what Nova remembers by visiting:
```
http://localhost:8000/api/memory
```

## 6. Chat History

- Conversations are stored locally in `backend/data/nova.db`
- History persists across browser refreshes
- Each browser session gets a unique session ID stored in localStorage
- To start completely fresh, delete `backend/data/nova.db` and restart the backend

## 7. Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot connect to server" | Make sure the backend is running on port 8000 |
| No response from Nova | Check that your `ANTHROPIC_API_KEY` is set in `backend/.env` |
| Backend won't start | Run `cd backend && npm install` to reinstall dependencies |
| Frontend won't start | Run `cd frontend && npm install` to reinstall dependencies |
| Port already in use | Kill existing processes: `taskkill /f /im node.exe` and restart |
