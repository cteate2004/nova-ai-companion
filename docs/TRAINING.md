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

*(Coming in Group 2 — Avatar + UI)*

## 3. Voice Interaction

*(Coming in Group 3 — Voice + Polish)*

## 4. Nova's Emotions

*(Coming in Group 2 — Avatar + UI)*

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
