# Nova AI Assistant — Training Manual

## 1. Accessing Nova

### URL
Open in any browser: **https://nova.srv1042999.hstgr.cloud**

Nova works on both **iPhone** and **desktop/PC browsers**. On desktop, the app renders in a centered phone-style frame with a subtle glow effect.

### PIN Login
Enter your numeric PIN to unlock. Your session lasts 30 days.

### Face ID (Two-Factor Authentication)
Nova supports optional face-based two-factor authentication. When enabled, you must verify your face after entering your PIN.

**Setting up Face ID:**
1. Log in with your PIN
2. Go to **Settings** → **Face ID**
3. Tap **Set Up Face ID**
4. Follow the guided capture — 5 photos from different angles (straight, left, right, up, down)
5. Tap **Capture** for each pose
6. When complete, Face ID is active

**How login works with Face ID enabled:**
1. Enter your PIN as normal
2. Camera opens automatically after PIN is verified
3. Nova scans your face (up to 3 attempts)
4. If matched → you're in. If not → back to PIN to try again.

**Managing Face ID:**
- **Disable:** Settings → Face ID → toggle off (clears stored face data)
- **Reset:** Settings → Face ID → Reset Face ID (re-enroll with new captures)
- **No camera?** If your device has no camera or you deny permission, login falls back to PIN-only automatically.

**Privacy:** Face data is stored entirely on your device (browser localStorage). It never leaves your phone — no face data is sent to the server. Face descriptors are mathematical representations (128 numbers), not photos.

### Installing as a PWA on iPhone (Recommended)
For the best iPhone experience, add Nova to your home screen:
1. Open the URL above in **Safari**
2. Tap the **Share button** (square with upward arrow)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**

This gives you:
- Full-screen mode (no Safari browser chrome)
- Push notifications for reminders and scheduled messages
- App icon on your home screen

### Desktop Browser
Just visit the URL in Chrome, Edge, Firefox, or Safari on your PC/Mac. The UI is fully functional — chat, voice, tasks, grocery, hacking bootcamp, and all features work the same.

## 2. Navigation

Nova has 6 tabs at the bottom of the screen (icon-only):

| Tab | Icon | Purpose |
|-----|------|---------|
| **Nova** | 👩 | Home screen — avatar, quick actions, dashboard cards |
| **Chat** | 💬 | Full conversation with Nova |
| **Tasks** | 📋 | To-do lists, shopping lists, reminders, expenses |
| **Grocery** | 🛒 | Grocery list with categories, print, share |
| **Alerts** | 🔔 | Scheduled messages, special dates, mood history |
| **Settings** | ⚙️ | Google connection, notifications, Face ID, memories, location |

### Home Screen
- **Hero Avatar** — Nova's photo with emotion-based glow
- **Quick Actions** — Voice (🎤), Chat (💬), Photo (📷)
- **Last Message** — Preview of Nova's most recent response
- **Weather Card** — Current weather (requires location permission)
- **Upcoming Event** — Next pending reminder
- **Hacking Bootcamp Card** — AI security learning progress, streak, and earnings (tap to expand full curriculum map)

## 3. Chatting with Nova

### Sending Messages
1. Go to the **Chat** tab
2. Type in the input field at the bottom
3. Press Send or tap Enter
4. Nova's response streams in real-time

### Image Messages
- Tap the 📷 button to take a photo with your camera
- Tap the 🖼️ button to choose an existing photo from your library
Nova can see and discuss images.

### What You Can Ask
Nova is your personal AI assistant. She can:

**Daily tasks:**
- "Add milk to my shopping list"
- "Add milk, eggs, and bread to my grocery list"
- "Remind me to call mom at 5pm"
- "I spent $45 on dinner"
- "What's the weather like?"
- "Find me a good Italian restaurant nearby"

**Information:**
- "Search the web for best hiking trails near me"
- "Check my email"
- "What's on my calendar today?"
- "Look up flights to Miami"

**AI Hacking Bootcamp:**
- "What's my hacking curriculum?"
- "Give me today's challenge"
- "Teach me about prompt injection"
- "How am I doing on my hacking progress?"

**Conversation:**
- Just chat naturally — she remembers your conversations and learns about you over time

### Example Conversations

**Casual:**
> **You:** Hey, how's it going?
> **Nova:** Hey! 😊 Always ready when you are. What's going on today?

**Task management:**
> **You:** Remind me to pick up groceries at 6pm
> **Nova:** Done! I'll remind you at 6pm to pick up groceries 💜

**Daily briefing:**
> **You:** What's my day look like?
> **Nova:** Let me check! You have 3 meetings today: Team standup at 10, lunch with Sarah at 1, and design review at 3:30. Want me to check your email too?

## 4. Voice Interaction

### Requirements
- Chrome or Edge browser (or Safari PWA)
- Microphone permission granted

### Using Voice
1. Tap the **🎤 mic button** (in Chat input area or Home quick actions)
2. Speak your message
3. Tap mic again to stop recording
4. Your speech is transcribed and sent to Nova
5. Nova's response appears in chat AND is spoken aloud

### Tips
- The mic button is 72px — easy to tap
- Single tap starts, single tap stops (fixed for iPhone)
- While Nova is speaking, her avatar shows the "talking" emotion
- To interrupt Nova while speaking, tap the mic button

## 5. Nova's Emotions

Nova's avatar changes appearance based on her response tone:

| Emotion | Visual Effect |
|---------|--------------|
| **Neutral** | Soft lavender glow, relaxed |
| **Listening** | Bright glow, pulse animation |
| **Thinking** | Cool purple tint, slightly desaturated |
| **Happy** | Warm glow, slight scale up |
| **Excited** | Vibrant pink glow, rapid pulse, scale up |
| **Confident** | Warm pink glow, enhanced brightness |
| **Concerned** | Muted blue-gray glow, dimmed |
| **Laughing** | Gold glow, bouncy rotation |
| **Talking** | Lavender accent, subtle pulse |

The emotion text also shows on the Home screen: "feeling happy 💜"

## 6. Tasks & Reminders

### Creating Tasks
**Via chat:** "Add milk to my shopping list" or "I need to finish the report"
**Via Tasks tab:** Tap the purple **+** button

### Managing Tasks
- Tap the circle to mark complete ✓
- Tap × to delete
- Tasks are grouped by list (To-Do, Shopping, Custom)

### Reminders
**Via chat:** "Remind me to call mom at 5pm"
- Nova creates a timed reminder
- You get a **push notification** when it's due
- View pending reminders in the Tasks tab

### Expense Tracking
**Via chat:** "I spent $45 on dinner" or "I bought groceries for $120"
- Nova logs the amount and category
- View summary in the Tasks tab
- Ask Nova: "How much have I spent this month?"

## 7. Grocery List

### Adding Items
**Via chat:** "Add milk, eggs, and bread to my grocery list"
- Nova auto-categorizes items (milk -> Dairy, bread -> Bakery, etc.)
- You can also say "check off milk" or "remove bread from grocery list"

**Via Grocery tab:** Tap the **+** button
- Enter item name (category auto-selects as you type)
- Optionally add quantity (e.g. "2 lbs")
- Change category if needed

### While Shopping
- Tap the circle to check off items as you get them
- Checked items show with strikethrough
- Tap **Clear Checked** when done shopping
- Tap **Clear All** to start a fresh list for next trip

### Printing Your List
Tap the printer icon in the header. On iPhone this opens the AirPrint dialog — select your printer and print a clean formatted list (unchecked items only, grouped by category).

### Sharing Your List
Tap the share icon in the header. On iPhone this opens the native share sheet where you can send via Messages, Mail, AirDrop, Notes, or any other app.

### Categories
Items are automatically grouped into: Produce, Dairy, Meat & Seafood, Bakery, Frozen, Pantry, Beverages, Snacks, Household, Other.

## 8. Alerts & Scheduled Messages

### Good Morning / Good Night Messages
1. Go to **Alerts** tab
2. Toggle **Good Morning 🌅** or **Good Night 🌙** on
3. Set your preferred time
4. Nova sends a push notification at that time every day

Messages are unique and contextual (weather, your schedule, mood patterns).

### Check-in Nudges
Nova randomly sends check-in push notifications 1-5x per day during waking hours (8am-10pm PST). Examples:
- "Hey! Just checking in 💜"
- "Hope your day is going well 😊"
- "Your meeting should be done — how'd it go?"

### Special Dates
1. Go to **Alerts** tab → Special Dates section
2. Enter the event name, date, and how many days before to remind
3. Nova reminds you ahead of time: "Your anniversary is in 3 days — want me to find a nice restaurant?"

### Mood History
Nova tracks your mood when you share how you're feeling. View the history in Alerts tab. She notices patterns: "You've seemed stressed this week — want to talk about it?"

## 9. Settings

### Google Account
- Shows connection status (✓ Connected / Not connected)
- Tap **Connect Google** to authorize Gmail and Calendar access
- After connecting, Nova can read your email and calendar

### Face ID
- Tap **Set Up Face ID** to enroll (5-step guided face capture)
- Toggle off to disable and clear face data
- Tap **Reset Face ID** to re-enroll
- Face data stored locally only — never sent to server

### Push Notifications
- Toggle to enable/disable
- Required for: reminders, scheduled messages, "thinking of you" nudges
- Must be using the PWA (added to Home Screen) for push to work when app is closed

### Weather Location
- Tap **Use Current Location** to set your location for weather
- Used by the Weather card on Home screen and Nova's weather tool

## 10. Memory System

Nova automatically remembers details about you.

### How It Works
- Every 5 messages, Nova analyzes recent conversation to extract facts
- Facts are categorized: personal, preference, work, interest, assistant, event
- Memories are included in Nova's context so she references them naturally

### What Nova Remembers
- Your name and personal details
- Job, projects, work situations
- Interests, food preferences, hobbies
- Important events and dates
- Communication preferences and recurring requests

### Managing Memories
1. Go to **Settings** tab
2. Tap **Manage Memories (N)** — the number shows how many memories Nova has
3. Browse memories grouped by category (Personal, Preferences, Work, Interests, Assistant, Events)
4. **Edit:** Tap any memory text to edit it inline. Press Enter to save, Escape to cancel.
5. **Delete:** Tap the × button on a memory. Confirm to remove it from Nova's knowledge.

This is useful if Nova has remembered something incorrectly or you want her to forget something specific.

### Data Storage
All data is stored locally in `backend/data/nova.db` (SQLite). Nothing is sent to third parties except:
- Claude API (for conversation)
- OpenAI Whisper (for voice transcription)
- Google APIs (if connected, for email/calendar)
- Push services (Apple/Google, for notifications)

## 11. Budget Management

Nova connects to your Budget Pro app (ctdevbudget.com) so you can manage your monthly budget through conversation.

### What You Can Ask

**Check your budget:**
> "What's on my budget this month?"
> Nova lists all your budget items with amounts, due dates, and paid status.

**See what's coming up:**
> "What bills are coming up?"
> Nova shows unpaid bills due in the next 7 days and any overdue bills.

**Get a summary:**
> "How's my budget looking?"
> Nova shows your totals — budgeted vs actual income and expenses, how many items are paid, and what's remaining.

**Mark something as paid:**
> "I just paid rent, it was $2,000"
> "Mark the electric bill as paid"
> Nova finds the item and marks it paid. If you tell her the actual amount, she records that too.

**Add a new item:**
> "Add a $50 expense for haircut on the 28th"
> "Add a $200 income for freelance work"
> Nova adds the item to your current month's budget with the right category and account.

### Notes
- Budget items are managed in Budget Pro — Nova reads and updates them via the API.
- You still create monthly budgets in Budget Pro's web interface. Nova works with the current month's existing budget.
- Categories and accounts are matched automatically when you add items. If you say "utilities" or "checking," Nova finds the closest match.

## 12. AI Hacking Bootcamp

Nova includes a built-in AI security learning module designed to take you from beginner to bug bounty hunter.

### Curriculum

The bootcamp has 8 modules that unlock progressively:

| # | Module | What You Learn |
|---|--------|---------------|
| 1 | LLM Basics for Hackers | How tokens, system prompts, and context windows work |
| 2 | Direct Prompt Injection | Overriding system instructions, encoding tricks |
| 3 | Indirect Prompt Injection | Poisoning documents and content agents consume |
| 4 | Agent Tool Abuse | Making agents call tools with malicious parameters |
| 5 | RAG Poisoning & Data Exfil | Extracting private data from retrieval systems |
| 6 | Multi-Agent Exploits | Attacking agent-to-agent communication |
| 7 | Guardrail Bypasses | Understanding and testing safety filters |
| 8 | Bug Bounty Methodology | Writing reports, responsible disclosure, earning money |

### Daily Challenges

Every day at 3:00 AM PST, Nova sends a push notification that a new challenge is ready. Ask her "Give me today's challenge" to start. Challenges scale with your current module and get harder as you progress.

- Complete challenges to earn points and build your streak
- Ask for hints (3 available per challenge)
- Submit your answer and Nova evaluates it with feedback

### Rank Levels

| Points | Rank |
|--------|------|
| 0-99 | Script Kiddie |
| 100-299 | Apprentice |
| 300-599 | Hacker |
| 600-999 | Pro Hacker |
| 1000+ | Elite Hunter |

### Bounty Tracking

Nova searches weekly for new AI/LLM bug bounty programs and notifies you. She helps you:
- Track programs you're watching or actively testing
- Scope AI features on target companies
- Draft vulnerability reports in standard disclosure format
- Log your earnings when bounties pay out

### What You Can Ask

> "What's my hacking curriculum?" — See all modules and your progress
> "Give me today's challenge" — Get the daily challenge
> "Teach me about indirect prompt injection" — Nova teaches the topic
> "Help me scope the AI features on [company]" — Recon assistance
> "Review my bounty report" — Nova critiques your draft
> "How am I doing?" — Full progress dashboard

### Home Screen Card

The Hacking Bootcamp card on the Home tab shows:
- Current module and progress bar
- Points, challenges completed, and earnings
- Streak counter (consecutive days of challenges)
- Tap to expand the full curriculum map with module statuses

### Starting a Lesson
- **Tap the current module info** (progress bar area) on the hacking card to jump to chat and start learning
- **Expand the curriculum map** and tap any unlocked or completed module to start it
- Locked modules (greyed out with 🔒) can't be tapped — complete the current module first
- Nova automatically knows your progress — she won't re-teach completed lessons unless you ask

### Progress Tracking
- Nova marks lessons complete as you learn them — your dashboard updates automatically
- When all 5 lessons in a module are done, the next module unlocks
- If progress ever gets out of sync, it self-heals when you load the dashboard

## 13. Response Speed

Nova's responses stream in real-time — you'll see text appear word-by-word within about 1 second of sending a message.

- **Simple chat** — text starts appearing almost immediately
- **Tool use** (weather, grocery, tasks, etc.) — Nova may pause briefly while executing the action, then streams the response
- **Memory** — Nova learns about you in the background every 5 messages without slowing down the conversation

If responses feel slow, it's usually the internet connection between your device and the server, not Nova herself.

## 14. Troubleshooting

| Problem | Solution |
|---------|----------|
| App shows blank screen | Clear Safari data: Settings → Safari → Clear History and Website Data |
| Service worker stuck | Visit `https://nova.srv1042999.hstgr.cloud/clear-sw.html` |
| "Not authenticated" | Your session expired. Re-enter your PIN. |
| Push notifications not arriving | 1. Must use PWA (Add to Home Screen) 2. Toggle notifications OFF then ON in Settings 3. Check iOS Settings → Notifications → Nova is allowed |
| Google shows "Not connected" after connecting | Refresh the page — OAuth redirects back automatically |
| Mic requires multiple taps | Should be fixed in v2.0. If persists, try force-closing and reopening the PWA |
| Text too small | Should be fixed in v2.0 (16px minimum). If old styles are cached, clear Safari data |
| Weather not showing | Grant location permission when prompted, or set location manually in Settings |
| Scheduled message didn't fire | Check that: 1. Push notifications are enabled 2. Time is set correctly (uses PST timezone) 3. Message wasn't already sent today |
| Chat not responding | Check backend is running: the server auto-starts but may need restart after VPS reboot |
| Face ID can't detect face | Ensure good lighting, hold phone at arm's length, face the camera directly. If persistent, reset Face ID in Settings and re-enroll. |
| Face ID not showing in login | Face ID must be set up first in Settings. If localStorage was cleared, re-enroll. |
| Camera goes black during enrollment | Force-close the app and try again. Ensure no other app is using the camera. |

### Restarting the Backend
```bash
ssh root@srv1042999.hstgr.cloud
cd /opt/nova/backend
pkill -f "node server.js"
nohup node server.js > /tmp/nova-server.log 2>&1 &
```

### Checking Logs
```bash
cat /tmp/nova-server.log
# Look for [Scheduler], [Push], [DB] prefixed lines
```
