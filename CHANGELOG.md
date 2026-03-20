# Changelog

## [0.3.0] - 2026-03-19

### Added
- Voice interaction via Web Speech API:
  - Push-to-talk with spacebar (hold to listen, release to send)
  - Click-to-talk with mic button
  - Text-to-speech playback of Nova's responses
  - Auto-selects best English female voice (prefers Zira/Hazel)
  - Chime sounds on listen start/stop (Web Audio API)
- Avatar state sync: "listening" while mic active, "talking" while TTS plays
- Animated particle background (canvas-based):
  - 50 bokeh particles in teal and warm gold
  - Slow drift with sinusoidal wave motion
  - Soft glow effect with shadow blur
- Mic button with pulsing cyan glow when active
- Updated training manual with voice interaction guide

## [0.2.0] - 2026-03-19

### Added
- React frontend with Vite dev server (localhost:5173)
- SVG avatar with Polynesian/Samoan-inspired features:
  - Warm brown skin, deep brown eyes, full lips, wavy dark hair
  - Plumeria flower behind right ear
  - Layered gradients for depth and dimension
- 7 emotional states: neutral, happy, excited, flirty, thoughtful, concerned, laughing
- Idle micro-animations: breathing, random blinking, hair sway, glow pulse
- CSS transitions (400ms) between all emotion states
- Chat panel with glass-morphism design (collapsible sidebar)
- SSE streaming hook for real-time message display
- Chat bubbles with dark theme styling
- Status bar showing connection state and current emotion
- Vite proxy config (/api → backend on port 8000)
- Updated training manual with chat instructions and emotion guide

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
- README with setup instructions
- Training manual (docs/TRAINING.md) with getting started guide
- `.gitignore` for node_modules, .env, and database files
