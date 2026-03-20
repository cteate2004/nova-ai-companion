# Changelog

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
