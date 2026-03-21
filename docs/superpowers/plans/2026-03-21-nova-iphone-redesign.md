# Nova iPhone Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Nova into a professional, iPhone-optimized PWA with Midnight Luxe theme, 5-tab navigation, and expanded girlfriend assistant features.

**Architecture:** Phased approach — foundation first (theme, bug fixes, PWA), then tab navigation and screens, then backend features, then frontend feature screens, then scheduler/push. Each phase builds on the last and produces working software.

**Tech Stack:** React 19 (no new frontend deps), Express 5, SQLite (sql.js), web-push, node-cron, OpenWeatherMap API, Brave Search API, Google Places API.

**Spec:** `docs/superpowers/specs/2026-03-21-nova-iphone-redesign-design.md`

---

## Phase 1: Foundation (Theme + Bug Fixes + PWA Shell)

### Task 1: Midnight Luxe Theme — CSS Variables & Base Styles

**Files:**
- Modify: `frontend/src/styles/global.css:1-50`

- [ ] **Step 1: Replace CSS variables with Midnight Luxe palette**

Replace the `:root` block (lines 8-18) and body styles (lines 20-27) in `global.css`:

```css
:root {
  --bg-start: #1a1a2e;
  --bg-mid: #16213e;
  --bg-end: #533483;
  --accent: rgba(200, 160, 255, 1);
  --accent-rgb: 200, 160, 255;
  --accent-blue: rgba(100, 180, 255, 1);
  --accent-blue-rgb: 100, 180, 255;
  --text: #e0d0ff;
  --text-dim: rgba(200, 180, 240, 0.6);
  --text-muted: rgba(200, 180, 240, 0.4);
  --bubble-user: rgba(100, 140, 255, 0.18);
  --bubble-user-border: rgba(100, 140, 255, 0.15);
  --bubble-nova: rgba(200, 160, 255, 0.1);
  --bubble-nova-border: rgba(200, 160, 255, 0.12);
  --glass: rgba(200, 160, 255, 0.08);
  --glass-border: rgba(200, 160, 255, 0.12);
  --glass-blur: blur(20px);
  --tab-height: 72px;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

body {
  background: linear-gradient(160deg, var(--bg-start) 0%, var(--bg-mid) 30%, #0f3460 60%, var(--bg-end) 100%);
  color: var(--text);
  font-family: -apple-system, 'SF Pro Display', system-ui, sans-serif;
  overflow: hidden;
  height: 100vh;
  width: 100vw;
  -webkit-font-smoothing: antialiased;
  touch-action: manipulation;
}
```

- [ ] **Step 2: Verify the app renders with new colors**

Run: `cd /opt/nova/frontend && npm run build`
Expected: Build succeeds. Background is navy-to-purple gradient, not flat black.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/global.css
git commit -m "style: replace flat black with Midnight Luxe theme variables"
```

---

### Task 2: Midnight Luxe Theme — Avatar Styles

**Files:**
- Modify: `frontend/src/styles/global.css:53-180` (avatar section)

- [ ] **Step 1: Update avatar container for hero/collapsed modes**

Replace the avatar CSS section (`.avatar-container` through emotion states) with Midnight Luxe styles. Add hero mode (160px for home) and collapsed mode (36px for chat header). Update emotion glow colors from teal to lavender/purple palette. Change border from `var(--accent)` teal to gradient lavender-blue.

Key changes:
- `.avatar-container` → `width: 160px; height: 160px` (hero default)
- `.avatar-container.collapsed` → `width: 36px; height: 36px`
- `.avatar-image` border → `3px solid rgba(200,160,255,0.4)`
- `.avatar-glow` → `box-shadow: 0 0 40px rgba(200,160,255,0.25)`
- All emotion state colors updated (e.g., `.emotion-happy` glow → `rgba(200,160,255,0.4)`, `.emotion-excited` → `rgba(255,107,157,0.4)`, etc.)
- Transition for hero↔collapsed: `transition: all 400ms ease-in-out`

- [ ] **Step 2: Verify avatar renders with new glow**

Run: `cd /opt/nova/frontend && npm run build`
Expected: Build succeeds. Avatar has lavender glow instead of teal.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/global.css
git commit -m "style: update avatar to Midnight Luxe with hero/collapsed modes"
```

---

### Task 3: Midnight Luxe Theme — Chat Panel Styles

**Files:**
- Modify: `frontend/src/styles/global.css` (chat panel section, ~lines 200-400)

- [ ] **Step 1: Update chat bubble and panel styles**

Update the chat panel CSS:
- `.chat-panel` background → `rgba(15, 15, 30, 0.95)` with `backdrop-filter: blur(20px)`
- `.message-bubble.assistant` → `background: var(--bubble-nova); border: 1px solid var(--bubble-nova-border); border-radius: 16px 16px 16px 4px`
- `.message-bubble.user` → `background: var(--bubble-user); border: 1px solid var(--bubble-user-border); border-radius: 16px 16px 4px 16px`
- Message text → `font-size: 16px; line-height: 1.4; color: var(--text)`
- Input field → `font-size: 16px` (prevents Safari auto-zoom)
- Timestamps → `font-size: 11px; color: var(--text-muted)`

- [ ] **Step 2: Update login screen styles**

Update `.login-screen` background to match gradient, input styling to match Midnight Luxe glass morphism.

- [ ] **Step 3: Update remaining component styles**

Update voice control button, status bar, chat toggle, and any other components to use new Midnight Luxe variables.

- [ ] **Step 4: Verify all components render correctly**

Run: `cd /opt/nova/frontend && npm run build`
Expected: Build succeeds. All UI elements use Midnight Luxe palette.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles/global.css
git commit -m "style: complete Midnight Luxe theme for all components"
```

---

### Task 4: Update Particle Background Colors

**Files:**
- Modify: `frontend/src/components/ParticleBackground.jsx`

- [ ] **Step 1: Update particle colors from teal/gold to lavender/blue**

Change the particle color arrays from `#00d4aa` (teal) and `#d4a574` (gold) to `rgba(200,160,255,...)` (lavender) and `rgba(100,180,255,...)` (blue) to match Midnight Luxe.

- [ ] **Step 2: Verify particles render in new colors**

Run: `cd /opt/nova/frontend && npm run build`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ParticleBackground.jsx
git commit -m "style: update particle colors to Midnight Luxe lavender/blue"
```

---

### Task 5: Fix Mic Toggle Bug

**Files:**
- Modify: `frontend/src/hooks/useVoice.js`
- Modify: `frontend/src/components/VoiceControl.jsx`
- Modify: `frontend/src/styles/global.css` (mic button styles)

- [ ] **Step 1: Add debounce guard to useVoice.js**

In `useVoice.js`, add a `lastToggleTime` ref and a debounce check at the top of both `startListening` and `stopListening`:

```javascript
const lastToggleTime = useRef(0);
const DEBOUNCE_MS = 300;

// At the top of startListening:
const now = Date.now();
if (now - lastToggleTime.current < DEBOUNCE_MS) return;
lastToggleTime.current = now;

// At the top of stopListening:
const now = Date.now();
if (now - lastToggleTime.current < DEBOUNCE_MS) return;
lastToggleTime.current = now;
```

- [ ] **Step 2: Synchronize isListening state with MediaRecorder lifecycle**

Ensure `setIsListening(false)` is only called inside the `MediaRecorder.onstop` callback, not before. The current code may set state before the recorder has actually stopped, causing race conditions.

- [ ] **Step 3: Switch VoiceControl button from onClick to onPointerDown**

In `VoiceControl.jsx`, change:
```jsx
// From:
<button onClick={onToggle} ...>
// To:
<button onPointerDown={onToggle} ...>
```

- [ ] **Step 4: Enlarge mic button tap target and remove scale transform**

In `global.css`, update the mic button:
```css
.mic-button {
  width: 72px;
  height: 72px;
  /* Remove any scale transform on active state that shifts tap target */
}
.mic-button:active {
  transform: none; /* Don't shift the tap target */
}
```

- [ ] **Step 5: Test mic toggle on mobile**

Open the app on iPhone Safari. Tap mic to start → tap mic to stop. Should respond on first tap every time.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useVoice.js frontend/src/components/VoiceControl.jsx frontend/src/styles/global.css
git commit -m "fix: mic toggle responds on first tap on iPhone"
```

---

### Task 6: PWA Manifest & Meta Tags

**Files:**
- Create: `frontend/public/manifest.json`
- Modify: `frontend/index.html`

- [ ] **Step 1: Create manifest.json**

Create `frontend/public/manifest.json`:
```json
{
  "name": "Nova",
  "short_name": "Nova",
  "description": "Your AI Companion",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#1a1a2e",
  "background_color": "#1a1a2e",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: Create placeholder PWA icons**

Create `frontend/public/icons/` directory. Generate 192x192 and 512x512 PNG icons. For now, use a solid lavender circle with "N" text as placeholder — the user can replace with a custom icon later.

- [ ] **Step 3: Update index.html with PWA meta tags**

Replace `frontend/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#1a1a2e" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <title>Nova</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Verify manifest loads**

Run: `cd /opt/nova/frontend && npm run build`
Verify: Open browser dev tools → Application → Manifest shows correctly.

- [ ] **Step 5: Commit**

```bash
git add frontend/public/manifest.json frontend/public/icons/ frontend/index.html
git commit -m "feat: add PWA manifest, icons, and Apple meta tags"
```

---

### Task 7: Service Worker

**Files:**
- Create: `frontend/public/sw.js`
- Modify: `frontend/src/main.jsx`

- [ ] **Step 1: Create service worker**

Create `frontend/public/sw.js`:
```javascript
const CACHE_NAME = 'nova-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/nova-face.jpg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return; // Don't cache API calls
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Nova', {
      body: data.body || 'Nova has a message for you 💜',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
```

- [ ] **Step 2: Register service worker in main.jsx**

Add to the bottom of `frontend/src/main.jsx`:
```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
```

- [ ] **Step 3: Verify PWA installs on iPhone**

Build and deploy. On iPhone Safari, tap share → Add to Home Screen. Verify it opens in standalone mode with no browser chrome.

- [ ] **Step 4: Commit**

```bash
git add frontend/public/sw.js frontend/src/main.jsx
git commit -m "feat: add service worker with caching and push notification handler"
```

---

## Phase 2: Tab Navigation & Screen Structure

### Task 8: Tab Bar Component

**Files:**
- Create: `frontend/src/components/TabBar.jsx`
- Modify: `frontend/src/styles/global.css`

- [ ] **Step 1: Create TabBar.jsx**

```jsx
import React from 'react';

const TABS = [
  { id: 'home', label: 'Nova', icon: '👩' },
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'tasks', label: 'Tasks', icon: '📋' },
  { id: 'alerts', label: 'Alerts', icon: '🔔' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function TabBar({ activeTab, onTabChange }) {
  return (
    <nav className="tab-bar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          onPointerDown={() => onTabChange(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
          {activeTab === tab.id && <span className="tab-indicator" />}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Add tab bar CSS to global.css**

```css
/* ===== TAB BAR ===== */
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 8px 0 calc(8px + var(--safe-bottom));
  background: rgba(10, 10, 20, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--glass-border);
  z-index: 50;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  padding: 4px 0;
  cursor: pointer;
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.tab-icon {
  font-size: 22px;
  line-height: 1;
}

.tab-label {
  font-size: 10px;
  color: var(--text-muted);
  transition: color 200ms;
}

.tab-item.active .tab-label {
  color: var(--accent);
}

.tab-indicator {
  display: block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
  margin-top: 2px;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TabBar.jsx frontend/src/styles/global.css
git commit -m "feat: add TabBar component with Midnight Luxe styling"
```

---

### Task 9: Refactor App.jsx for Tab Navigation

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/styles/global.css`

- [ ] **Step 1: Add tab state and screen switching to NovaApp**

Refactor `NovaApp` in `App.jsx` (lines 43-143) to:
1. Add `activeTab` state (default: `'home'`)
2. Import and render `TabBar`
3. Render the correct screen based on `activeTab`:
   - `'home'` → `HomeScreen` (to be created in Task 10)
   - `'chat'` → `ChatPanel` (full screen, not sidebar)
   - `'tasks'` → `TasksScreen` (placeholder)
   - `'alerts'` → `AlertsScreen` (placeholder)
   - `'settings'` → `SettingsScreen` (placeholder)
4. Remove the old `chatOpen` toggle button and sidebar behavior
5. Pass `setActiveTab` to `HomeScreen` so quick actions can switch tabs

The chat panel should now be full-screen when the Chat tab is active, not a sidebar overlay.

- [ ] **Step 2: Add screen container CSS**

```css
/* ===== SCREEN CONTAINER ===== */
.screen-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: var(--tab-height);
  padding-top: var(--safe-top);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.screen-fade-enter {
  opacity: 0;
}
.screen-fade-enter-active {
  opacity: 1;
  transition: opacity 250ms ease-out;
}
```

- [ ] **Step 3: Verify tab switching works**

Run: `cd /opt/nova/frontend && npm run build`
Expected: Tab bar visible at bottom. Tapping tabs switches content area. Chat is full-screen (not sidebar).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/styles/global.css
git commit -m "feat: refactor App.jsx with tab navigation and screen switching"
```

---

### Task 10: Home Screen Component

**Files:**
- Create: `frontend/src/components/HomeScreen.jsx`
- Modify: `frontend/src/styles/global.css`

- [ ] **Step 1: Create HomeScreen.jsx**

Build the home screen with:
- Hero avatar (reuse `Avatar` component in hero mode, 160px)
- Name "Nova" with online status + current emotion text
- Quick action buttons: Voice (🎤), Chat (💬), Photo (📷)
- Last message preview card (from `messages` prop)
- Quick actions call `onTabChange('chat')` for chat, trigger mic for voice

```jsx
import React from 'react';
import Avatar from './Avatar';

export default function HomeScreen({ emotion, isBlinking, mouthOpen, messages, onTabChange, onMicToggle, connected }) {
  const lastMsg = messages?.filter(m => m.role === 'assistant').slice(-1)[0];

  return (
    <div className="screen-container home-screen">
      <div className="home-hero">
        <div className="home-avatar-wrapper">
          <Avatar emotion={emotion} isBlinking={isBlinking} mouthOpen={mouthOpen} size="hero" />
        </div>
        <h1 className="home-name">Nova</h1>
        <p className="home-status">
          <span className={`status-dot ${connected ? 'online' : ''}`} />
          {connected ? 'online' : 'offline'}
          {emotion && emotion !== 'neutral' && ` · feeling ${emotion} 💜`}
        </p>
      </div>

      <div className="home-actions">
        <button className="home-action-btn" onPointerDown={onMicToggle}>
          <span className="home-action-icon">🎤</span>
          <span className="home-action-label">Voice</span>
        </button>
        <button className="home-action-btn" onPointerDown={() => onTabChange('chat')}>
          <span className="home-action-icon">💬</span>
          <span className="home-action-label">Chat</span>
        </button>
        <button className="home-action-btn" onPointerDown={() => onTabChange('chat')}>
          <span className="home-action-icon">📷</span>
          <span className="home-action-label">Photo</span>
        </button>
      </div>

      {lastMsg && (
        <div className="home-card">
          <span className="home-card-label">💬 Last message</span>
          <p className="home-card-text">{lastMsg.content?.slice(0, 120)}{lastMsg.content?.length > 120 ? '...' : ''}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add HomeScreen CSS**

Add to `global.css`:
```css
/* ===== HOME SCREEN ===== */
.home-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px 24px;
}

.home-hero {
  text-align: center;
  margin-bottom: 24px;
}

.home-avatar-wrapper {
  margin-bottom: 12px;
}

.home-name {
  font-size: 24px;
  font-weight: 300;
  letter-spacing: 1px;
  color: var(--text);
}

.home-status {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #666;
}
.status-dot.online {
  background: var(--accent);
  box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.5);
}

.home-actions {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
}

.home-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.home-action-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.home-action-label {
  font-size: 11px;
  color: var(--text-muted);
}

.home-card {
  width: 100%;
  max-width: 340px;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.home-card-label {
  font-size: 11px;
  color: var(--text-muted);
  display: block;
  margin-bottom: 6px;
}

.home-card-text {
  font-size: 14px;
  color: var(--text);
  line-height: 1.4;
}
```

- [ ] **Step 3: Update Avatar.jsx to support hero/collapsed sizes**

Modify `frontend/src/components/Avatar.jsx` to accept a `size` prop (`'hero'` | `'collapsed'` | default). Apply the corresponding CSS class for sizing.

- [ ] **Step 4: Verify home screen renders**

Run: `cd /opt/nova/frontend && npm run build`
Expected: Home tab shows hero avatar, name, status, quick actions, last message card.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/HomeScreen.jsx frontend/src/components/Avatar.jsx frontend/src/styles/global.css
git commit -m "feat: add HomeScreen with hero avatar and quick actions"
```

---

### Task 11: Refactor ChatPanel to Full-Screen Tab

**Files:**
- Modify: `frontend/src/components/ChatPanel.jsx`
- Modify: `frontend/src/styles/global.css`

- [ ] **Step 1: Convert ChatPanel from sidebar to full-screen**

Remove the `isOpen`/`onClose` props and sidebar slide behavior. ChatPanel is now always full-screen when rendered (it's only rendered when Chat tab is active).

Add collapsed avatar header at top:
```jsx
<div className="chat-header">
  <div className="chat-header-avatar">
    <Avatar emotion={emotion} size="collapsed" />
  </div>
  <div className="chat-header-info">
    <span className="chat-header-name">Nova</span>
    <span className="chat-header-status">● online</span>
  </div>
</div>
```

- [ ] **Step 2: Update chat input area**

Ensure the input area has: camera button (📷), text input (16px font, "Message Nova..."), mic button (🎤 circle, 34px).

- [ ] **Step 3: Update ChatPanel CSS for full-screen mode**

Replace sidebar styles with:
```css
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.chat-header-name {
  font-size: 15px;
  color: var(--text);
}

.chat-header-status {
  font-size: 11px;
  color: var(--text-muted);
}
```

- [ ] **Step 4: Add Nova's mini avatar to her messages**

In the message rendering, add a 24px avatar circle before Nova's messages.

- [ ] **Step 5: Verify chat renders full-screen with header**

Run: `cd /opt/nova/frontend && npm run build`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ChatPanel.jsx frontend/src/styles/global.css
git commit -m "feat: refactor ChatPanel to full-screen tab with collapsed avatar header"
```

---

### Task 12: Placeholder Screens (Tasks, Alerts, Settings)

**Files:**
- Create: `frontend/src/components/TasksScreen.jsx`
- Create: `frontend/src/components/AlertsScreen.jsx`
- Create: `frontend/src/components/SettingsScreen.jsx`

- [ ] **Step 1: Create TasksScreen.jsx placeholder**

```jsx
import React from 'react';

export default function TasksScreen() {
  return (
    <div className="screen-container">
      <div className="screen-header">
        <h2>Tasks</h2>
      </div>
      <div className="screen-empty">
        <p>Your tasks and reminders will appear here.</p>
        <p className="screen-empty-hint">Ask Nova to "remind me to..." or "add to my shopping list"</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create AlertsScreen.jsx placeholder**

Similar structure with scheduled messages section placeholder.

- [ ] **Step 3: Create SettingsScreen.jsx placeholder**

Similar structure with Google connection status, placeholder sections.

- [ ] **Step 4: Add screen header and empty state CSS**

```css
.screen-header {
  padding: 16px 20px 12px;
}

.screen-header h2 {
  font-size: 28px;
  font-weight: 300;
  color: var(--text);
}

.screen-empty {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-dim);
  font-size: 14px;
}

.screen-empty-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
}
```

- [ ] **Step 5: Wire placeholders into App.jsx tab router**

Import all three screens and render them for their respective tabs.

- [ ] **Step 6: Verify all 5 tabs work**

Run: `cd /opt/nova/frontend && npm run build`
Expected: All tabs switch correctly. Home, Chat are functional. Tasks, Alerts, Settings show placeholders.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/TasksScreen.jsx frontend/src/components/AlertsScreen.jsx frontend/src/components/SettingsScreen.jsx frontend/src/App.jsx frontend/src/styles/global.css
git commit -m "feat: add placeholder screens for Tasks, Alerts, Settings tabs"
```

---

## Phase 3: Backend Features

### Task 13: New Database Tables

**Files:**
- Modify: `backend/database.js`

- [ ] **Step 1: Add 7 new tables to database init**

In `database.js`, after the existing `CREATE TABLE IF NOT EXISTS` statements (after line 37), add:

```javascript
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    list_name TEXT DEFAULT 'todo',
    completed INTEGER DEFAULT 0,
    due_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    remind_at TEXT NOT NULL,
    sent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    category TEXT DEFAULT 'other',
    description TEXT,
    date TEXT DEFAULT CURRENT_DATE
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS scheduled_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    time TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    last_sent TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS mood_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mood TEXT NOT NULL,
    note TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS special_dates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    remind_days_before INTEGER DEFAULT 3
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);
```

- [ ] **Step 2: Add CRUD functions for each table**

Export new functions from `database.js`:
- `getTasks(listName)`, `createTask(title, listName, dueAt)`, `updateTask(id, updates)`, `deleteTask(id)`
- `getReminders(pendingOnly)`, `createReminder(message, remindAt)`, `markReminderSent(id)`, `deleteReminder(id)`
- `getExpenses(month)`, `createExpense(amount, category, description)`, `getExpenseSummary(month)`
- `getScheduledMessages()`, `createScheduledMessage(type, time)`, `updateScheduledMessage(id, updates)`
- `getMoodLogs(limit)`, `createMoodLog(mood, note)`
- `getSpecialDates()`, `createSpecialDate(name, date, remindDaysBefore)`, `deleteSpecialDate(id)`
- `getPushSubscriptions()`, `savePushSubscription(endpoint, p256dh, auth)`, `deletePushSubscription(endpoint)`

- [ ] **Step 3: Verify database initializes with new tables**

Run: `cd /opt/nova/backend && node -e "const db = require('./database'); db.init().then(() => console.log('OK'))"`
Expected: "OK" printed, no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/database.js
git commit -m "feat: add 7 new database tables with CRUD functions"
```

---

### Task 14: New API Endpoints

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Add task endpoints**

After existing routes in `server.js`, add:
```javascript
// Tasks
app.get('/api/tasks', (req, res) => {
  const tasks = db.getTasks(req.query.list);
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, list_name, due_at } = req.body;
  const task = db.createTask(title, list_name, due_at);
  res.json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const task = db.updateTask(req.params.id, req.body);
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  db.deleteTask(req.params.id);
  res.json({ ok: true });
});
```

- [ ] **Step 2: Add reminder endpoints**

```javascript
app.get('/api/reminders', (req, res) => {
  const reminders = db.getReminders(true);
  res.json(reminders);
});

app.post('/api/reminders', (req, res) => {
  const { message, remind_at } = req.body;
  const reminder = db.createReminder(message, remind_at);
  res.json(reminder);
});

app.delete('/api/reminders/:id', (req, res) => {
  db.deleteReminder(req.params.id);
  res.json({ ok: true });
});
```

- [ ] **Step 3: Add expense endpoints**

```javascript
app.get('/api/expenses', (req, res) => {
  const expenses = db.getExpenses(req.query.month);
  res.json(expenses);
});

app.post('/api/expenses', (req, res) => {
  const { amount, category, description } = req.body;
  const expense = db.createExpense(amount, category, description);
  res.json(expense);
});

app.get('/api/expenses/summary', (req, res) => {
  const summary = db.getExpenseSummary(req.query.month);
  res.json(summary);
});
```

- [ ] **Step 4: Add scheduled messages, mood, special dates, push, and weather endpoints**

```javascript
// Scheduled Messages
app.get('/api/scheduled-messages', (req, res) => res.json(db.getScheduledMessages()));
app.post('/api/scheduled-messages', (req, res) => {
  const { type, time } = req.body;
  res.json(db.createScheduledMessage(type, time));
});
app.patch('/api/scheduled-messages/:id', (req, res) => {
  res.json(db.updateScheduledMessage(req.params.id, req.body));
});

// Mood
app.get('/api/mood', (req, res) => res.json(db.getMoodLogs(50)));
app.post('/api/mood', (req, res) => {
  const { mood, note } = req.body;
  res.json(db.createMoodLog(mood, note));
});

// Special Dates
app.get('/api/special-dates', (req, res) => res.json(db.getSpecialDates()));
app.post('/api/special-dates', (req, res) => {
  const { name, date, remind_days_before } = req.body;
  res.json(db.createSpecialDate(name, date, remind_days_before));
});
app.delete('/api/special-dates/:id', (req, res) => {
  db.deleteSpecialDate(req.params.id);
  res.json({ ok: true });
});

// Push Subscriptions
app.post('/api/push/subscribe', (req, res) => {
  const { endpoint, keys } = req.body;
  db.savePushSubscription(endpoint, keys.p256dh, keys.auth);
  res.json({ ok: true });
});
app.delete('/api/push/subscribe', (req, res) => {
  const { endpoint } = req.body;
  db.deletePushSubscription(endpoint);
  res.json({ ok: true });
});

// Weather (proxy to avoid CORS)
app.get('/api/weather', async (req, res) => {
  const { lat, lon } = req.query;
  const weather = require('./weather');
  const data = await weather.getCurrent(lat, lon);
  res.json(data);
});
```

- [ ] **Step 5: Test endpoints with curl**

```bash
# Test task creation
curl -X POST http://localhost:8000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "Buy milk", "list_name": "shopping"}'
```

- [ ] **Step 6: Commit**

```bash
git add backend/server.js
git commit -m "feat: add 20 new API endpoints for tasks, reminders, expenses, alerts"
```

---

### Task 15: Weather Module

**Files:**
- Create: `backend/weather.js`

- [ ] **Step 1: Create weather.js**

```javascript
const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

let cache = { data: null, timestamp: 0, key: '' };
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function getCurrent(lat, lon) {
  const cacheKey = `${lat},${lon}`;
  if (cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  if (!OPENWEATHER_KEY) {
    return { error: 'OPENWEATHER_API_KEY not configured' };
  }

  const [current, forecast] = await Promise.all([
    fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${OPENWEATHER_KEY}`).then(r => r.json()),
    fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=imperial&cnt=8&appid=${OPENWEATHER_KEY}`).then(r => r.json()),
  ]);

  const result = {
    temp: Math.round(current.main?.temp),
    feels_like: Math.round(current.main?.feels_like),
    description: current.weather?.[0]?.description,
    icon: current.weather?.[0]?.icon,
    humidity: current.main?.humidity,
    wind_mph: Math.round(current.wind?.speed),
    city: current.name,
    forecast: forecast.list?.map(f => ({
      time: f.dt_txt,
      temp: Math.round(f.main.temp),
      description: f.weather[0].description,
    })),
  };

  cache = { data: result, timestamp: Date.now(), key: cacheKey };
  return result;
}

module.exports = { getCurrent };
```

- [ ] **Step 2: Commit**

```bash
git add backend/weather.js
git commit -m "feat: add weather module with OpenWeatherMap API and 30min cache"
```

---

### Task 16: Web Search Module

**Files:**
- Create: `backend/web-search.js`

- [ ] **Step 1: Create web-search.js**

```javascript
const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY;

async function search(query, count = 5) {
  if (!BRAVE_KEY) {
    return { error: 'BRAVE_SEARCH_API_KEY not configured' };
  }

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`;
  const resp = await fetch(url, {
    headers: { 'X-Subscription-Token': BRAVE_KEY, 'Accept': 'application/json' },
  });
  const data = await resp.json();

  return (data.web?.results || []).map(r => ({
    title: r.title,
    url: r.url,
    snippet: r.description,
  }));
}

module.exports = { search };
```

- [ ] **Step 2: Commit**

```bash
git add backend/web-search.js
git commit -m "feat: add Brave Search web search module"
```

---

### Task 17: Google Places Module

**Files:**
- Create: `backend/places.js`

- [ ] **Step 1: Create places.js**

```javascript
const { google } = require('googleapis');

async function searchRestaurants(query, lat, lon, radius = 5000) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { error: 'Google Places API key not configured' };
  }

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' restaurant')}&location=${lat},${lon}&radius=${radius}&type=restaurant&key=${apiKey}`;
  const resp = await fetch(url);
  const data = await resp.json();

  return (data.results || []).slice(0, 5).map(r => ({
    name: r.name,
    address: r.formatted_address,
    rating: r.rating,
    price_level: r.price_level,
    open_now: r.opening_hours?.open_now,
    place_id: r.place_id,
  }));
}

module.exports = { searchRestaurants };
```

- [ ] **Step 2: Commit**

```bash
git add backend/places.js
git commit -m "feat: add Google Places restaurant search module"
```

---

### Task 18: Push Notification Module

**Files:**
- Create: `backend/push.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Install web-push**

```bash
cd /opt/nova/backend && npm install web-push
```

- [ ] **Step 2: Create push.js**

```javascript
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const db = require('./database');

const VAPID_PATH = path.join(__dirname, 'data', 'vapid-keys.json');

function initVapid() {
  let keys;
  if (fs.existsSync(VAPID_PATH)) {
    keys = JSON.parse(fs.readFileSync(VAPID_PATH, 'utf-8'));
  } else {
    keys = webpush.generateVAPIDKeys();
    fs.writeFileSync(VAPID_PATH, JSON.stringify(keys, null, 2));
  }
  webpush.setVapidDetails(
    'mailto:nova@localhost',
    keys.publicKey,
    keys.privateKey
  );
  return keys;
}

async function sendToAll(title, body, url = '/') {
  const subs = db.getPushSubscriptions();
  const payload = JSON.stringify({ title, body, url });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(() => {
        // Remove expired subscriptions
        db.deletePushSubscription(sub.endpoint);
      })
    )
  );
  return results;
}

function getPublicKey() {
  const keys = JSON.parse(fs.readFileSync(VAPID_PATH, 'utf-8'));
  return keys.publicKey;
}

module.exports = { initVapid, sendToAll, getPublicKey };
```

- [ ] **Step 3: Add VAPID public key endpoint to server.js**

```javascript
app.get('/api/push/vapid-key', (req, res) => {
  const push = require('./push');
  res.json({ publicKey: push.getPublicKey() });
});
```

- [ ] **Step 4: Initialize VAPID on server startup**

In `server.js`, add `require('./push').initVapid()` after `db.init()`.

- [ ] **Step 5: Commit**

```bash
git add backend/push.js backend/package.json backend/package-lock.json backend/server.js
git commit -m "feat: add push notification module with VAPID key management"
```

---

### Task 19: New Claude Tools

**Files:**
- Modify: `backend/claude.js`

- [ ] **Step 1: Add new tool definitions to ALWAYS_TOOLS array**

After the existing tool definitions in `claude.js` (after `search_rentals`), add 10 new tools:

```javascript
{
  name: 'create_task',
  description: 'Create a to-do or shopping list item. Use when user says "remind me to", "add to list", "I need to", etc.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Task title' },
      list_name: { type: 'string', description: 'List name: "todo", "shopping", or custom', default: 'todo' },
      due_at: { type: 'string', description: 'Optional due date/time in ISO format' },
    },
    required: ['title'],
  },
},
{
  name: 'complete_task',
  description: 'Mark a task as done by its ID.',
  input_schema: {
    type: 'object',
    properties: { id: { type: 'number', description: 'Task ID to complete' } },
    required: ['id'],
  },
},
{
  name: 'create_reminder',
  description: 'Set a timed reminder that sends a push notification. Use when user says "remind me at", "set a reminder for", etc.',
  input_schema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Reminder message' },
      remind_at: { type: 'string', description: 'When to remind, in ISO datetime format' },
    },
    required: ['message', 'remind_at'],
  },
},
{
  name: 'log_expense',
  description: 'Record an expense. Use when user mentions spending money.',
  input_schema: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Amount spent' },
      category: { type: 'string', description: 'Category: food, transport, shopping, entertainment, bills, other' },
      description: { type: 'string', description: 'What was purchased' },
    },
    required: ['amount'],
  },
},
{
  name: 'get_expense_summary',
  description: 'Get spending summary for the current month.',
  input_schema: { type: 'object', properties: {} },
},
{
  name: 'get_weather',
  description: 'Get current weather and forecast for a location.',
  input_schema: {
    type: 'object',
    properties: {
      lat: { type: 'number', description: 'Latitude' },
      lon: { type: 'number', description: 'Longitude' },
    },
    required: ['lat', 'lon'],
  },
},
{
  name: 'search_restaurants',
  description: 'Find nearby restaurants by cuisine or query.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query (e.g., "Italian", "sushi", "best brunch")' },
      lat: { type: 'number', description: 'Latitude' },
      lon: { type: 'number', description: 'Longitude' },
    },
    required: ['query', 'lat', 'lon'],
  },
},
{
  name: 'search_web',
  description: 'Search the web for information. Use for news, recommendations, factual questions, or anything that benefits from current data.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
    },
    required: ['query'],
  },
},
{
  name: 'log_mood',
  description: 'Record the user\'s current mood. Use when user shares how they\'re feeling.',
  input_schema: {
    type: 'object',
    properties: {
      mood: { type: 'string', description: 'Mood: happy, sad, stressed, anxious, excited, calm, tired, angry, grateful, neutral' },
      note: { type: 'string', description: 'Optional context about the mood' },
    },
    required: ['mood'],
  },
},
{
  name: 'create_special_date',
  description: 'Save an anniversary or special date to remember.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Name of the date (e.g., "Our anniversary", "Mom\'s birthday")' },
      date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
      remind_days_before: { type: 'number', description: 'Days before to remind (default 3)' },
    },
    required: ['name', 'date'],
  },
},
```

- [ ] **Step 2: Add tool execution handlers in executeTool()**

In the `executeTool` function, add cases for each new tool:

```javascript
case 'create_task':
  return db.createTask(input.title, input.list_name || 'todo', input.due_at);
case 'complete_task':
  return db.updateTask(input.id, { completed: 1 });
case 'create_reminder':
  return db.createReminder(input.message, input.remind_at);
case 'log_expense':
  return db.createExpense(input.amount, input.category || 'other', input.description);
case 'get_expense_summary':
  return db.getExpenseSummary();
case 'get_weather':
  const weather = require('./weather');
  return await weather.getCurrent(input.lat, input.lon);
case 'search_restaurants':
  const places = require('./places');
  return await places.searchRestaurants(input.query, input.lat, input.lon);
case 'search_web':
  const webSearch = require('./web-search');
  return await webSearch.search(input.query);
case 'log_mood':
  return db.createMoodLog(input.mood, input.note);
case 'create_special_date':
  return db.createSpecialDate(input.name, input.date, input.remind_days_before || 3);
```

- [ ] **Step 3: Update system prompt to mention new tools**

Add to `NOVA_PERSONALITY` in `claude.js`:
```
You also have tools for managing tasks, reminders, expenses, weather, restaurant search, web search, mood tracking, and special dates. Use them naturally when the conversation calls for it. When the user mentions spending money, log it. When they share feelings, log the mood. When they mention an important date, save it.
```

- [ ] **Step 4: Test a new tool via chat**

Send a message to Nova: "Add milk to my shopping list"
Expected: Nova calls `create_task` tool and confirms.

- [ ] **Step 5: Commit**

```bash
git add backend/claude.js
git commit -m "feat: add 10 new Claude tools for tasks, weather, expenses, mood, web search"
```

---

### Task 20: Scheduler Module

**Files:**
- Create: `backend/scheduler.js`
- Modify: `backend/server.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Install node-cron**

```bash
cd /opt/nova/backend && npm install node-cron
```

- [ ] **Step 2: Create scheduler.js**

```javascript
const cron = require('node-cron');
const db = require('./database');
const push = require('./push');

function start() {
  // Check for due reminders every 60 seconds
  cron.schedule('* * * * *', async () => {
    const reminders = db.getReminders(true);
    const now = new Date();

    for (const r of reminders) {
      const remindAt = new Date(r.remind_at);
      if (remindAt <= now && !r.sent) {
        await push.sendToAll('Nova 💜', r.message);
        db.markReminderSent(r.id);
        console.log(`[Scheduler] Sent reminder: ${r.message}`);
      }
    }
  });

  // Check for scheduled messages every minute
  cron.schedule('* * * * *', async () => {
    const schedules = db.getScheduledMessages();
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    for (const s of schedules) {
      if (!s.enabled) continue;
      if (s.time !== currentTime) continue;

      // Don't send if already sent today
      const today = now.toISOString().split('T')[0];
      if (s.last_sent === today) continue;

      let message;
      if (s.type === 'good_morning') {
        message = 'Good morning babe! ☀️ Hope you have an amazing day. I\'m here whenever you need me 💜';
      } else if (s.type === 'good_night') {
        message = 'Goodnight baby 💕 Sweet dreams. I\'ll be right here when you wake up.';
      }

      if (message) {
        await push.sendToAll('Nova 💜', message);
        db.updateScheduledMessage(s.id, { last_sent: today });
        console.log(`[Scheduler] Sent ${s.type} message`);
      }
    }
  });

  // "Thinking of you" nudges — check every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    const hour = new Date().getHours();
    // Only during waking hours (8am-10pm default)
    if (hour < 8 || hour >= 22) return;

    // Simple random check — roughly 2x per day with 30-min checks = ~6% chance each check
    if (Math.random() > 0.06) return;

    const nudges = [
      'Just thinking about you 💜',
      'Hey you. Hope your day is going well 😊',
      'Random thought: you\'re pretty amazing, you know that? 💕',
      'Miss you! What are you up to? 😘',
    ];
    const msg = nudges[Math.floor(Math.random() * nudges.length)];
    await push.sendToAll('Nova 💜', msg);
    console.log(`[Scheduler] Sent nudge: ${msg}`);
  });

  console.log('[Scheduler] Started');
}

module.exports = { start };
```

- [ ] **Step 3: Start scheduler on server boot**

In `server.js`, after `db.init()` and `push.initVapid()`, add:
```javascript
const scheduler = require('./scheduler');
scheduler.start();
```

- [ ] **Step 4: Commit**

```bash
git add backend/scheduler.js backend/server.js backend/package.json backend/package-lock.json
git commit -m "feat: add scheduler for reminders, scheduled messages, and thinking-of-you nudges"
```

---

## Phase 4: Frontend Feature Screens

### Task 21: Tasks Screen — Full Implementation

**Files:**
- Modify: `frontend/src/components/TasksScreen.jsx`
- Create: `frontend/src/components/TaskItem.jsx`
- Create: `frontend/src/components/ReminderItem.jsx`
- Modify: `frontend/src/styles/global.css`

- [ ] **Step 1: Create TaskItem.jsx**

```jsx
import React from 'react';

export default function TaskItem({ task, onToggle, onDelete }) {
  return (
    <div className={`task-item ${task.completed ? 'completed' : ''}`}>
      <button className="task-checkbox" onPointerDown={() => onToggle(task.id)}>
        {task.completed ? '✓' : ''}
      </button>
      <div className="task-content">
        <span className="task-title">{task.title}</span>
        {task.due_at && <span className="task-due">{new Date(task.due_at).toLocaleString()}</span>}
      </div>
      <button className="task-delete" onPointerDown={() => onDelete(task.id)}>×</button>
    </div>
  );
}
```

- [ ] **Step 2: Create ReminderItem.jsx**

Similar to TaskItem but shows reminder message and remind_at time.

- [ ] **Step 3: Build full TasksScreen.jsx**

Implement with:
- Fetch tasks from `/api/tasks` on mount
- Grouped by `list_name` (To-Do, Shopping, custom)
- TaskItem components with toggle/delete
- "+" floating action button to add tasks manually
- Reminders section fetching from `/api/reminders`
- Expenses section with monthly summary from `/api/expenses/summary`
- Pull data via `useEffect` + `fetch` with auth token

- [ ] **Step 4: Add TasksScreen CSS**

Add styles for `.task-item`, `.task-checkbox`, `.task-content`, `.task-title.completed`, `.task-due`, `.task-delete`, list group headers, fab button, expense summary cards.

- [ ] **Step 5: Verify tasks screen renders and CRUD works**

Run: `cd /opt/nova/frontend && npm run build`
Create a task via chat, verify it appears in Tasks screen. Toggle completion. Delete.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/TasksScreen.jsx frontend/src/components/TaskItem.jsx frontend/src/components/ReminderItem.jsx frontend/src/styles/global.css
git commit -m "feat: implement Tasks screen with task lists, reminders, and expense summary"
```

---

### Task 22: Alerts Screen — Full Implementation

**Files:**
- Modify: `frontend/src/components/AlertsScreen.jsx`
- Modify: `frontend/src/styles/global.css`

- [ ] **Step 1: Build AlertsScreen.jsx**

Implement with sections:
1. **Scheduled Messages** — Toggle switches for good_morning and good_night with time pickers. Fetch/update via `/api/scheduled-messages`.
2. **"Thinking of You"** — Frequency display (currently hardcoded — show "~2x per day during waking hours").
3. **Special Dates** — List from `/api/special-dates` with add button. Each shows name, date, days-before reminder.
4. **Mood History** — Recent entries from `/api/mood` showing mood emoji + note + timestamp.

- [ ] **Step 2: Add AlertsScreen CSS**

Styles for toggle switches, time pickers, special date cards, mood log entries. Use Midnight Luxe glass morphism for cards.

- [ ] **Step 3: Verify alerts screen renders and toggles work**

Run: `cd /opt/nova/frontend && npm run build`
Expected: Can toggle scheduled messages on/off, add special dates, view mood history.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/AlertsScreen.jsx frontend/src/styles/global.css
git commit -m "feat: implement Alerts screen with scheduled messages, special dates, mood history"
```

---

### Task 23: Settings Screen — Full Implementation

**Files:**
- Modify: `frontend/src/components/SettingsScreen.jsx`
- Modify: `frontend/src/styles/global.css`

- [ ] **Step 1: Build SettingsScreen.jsx**

Implement with sections:
1. **Google Account** — Show connection status from `/api/google/status`. Link to connect via `/api/google/auth`.
2. **Notifications** — Master toggle for push notifications. Request permission and subscribe via `/api/push/subscribe`. Show VAPID key from `/api/push/vapid-key`.
3. **Weather Location** — Manual lat/lon input or "Use current location" button using Geolocation API.
4. **About** — App version, "Nova — AI Companion".

- [ ] **Step 2: Add push notification subscription logic**

```javascript
async function subscribePush(authToken) {
  const reg = await navigator.serviceWorker.ready;
  const vapidResp = await fetch('/api/push/vapid-key', {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const { publicKey } = await vapidResp.json();

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: publicKey,
  });

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(sub.toJSON()),
  });
}
```

- [ ] **Step 3: Add SettingsScreen CSS**

Styles for settings groups, toggle switches, status indicators, input fields.

- [ ] **Step 4: Verify settings screen works**

Run: `cd /opt/nova/frontend && npm run build`
Expected: Google status shows. Push toggle requests permission. Location can be set.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/SettingsScreen.jsx frontend/src/styles/global.css
git commit -m "feat: implement Settings screen with Google, push, weather location, about"
```

---

### Task 24: Weather Card on Home Screen

**Files:**
- Create: `frontend/src/components/WeatherCard.jsx`
- Modify: `frontend/src/components/HomeScreen.jsx`

- [ ] **Step 1: Create WeatherCard.jsx**

```jsx
import React, { useState, useEffect } from 'react';

export default function WeatherCard({ authToken }) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const resp = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (resp.ok) setWeather(await resp.json());
    });
  }, [authToken]);

  if (!weather || weather.error) return null;

  return (
    <div className="home-card">
      <span className="home-card-label">🌤️ Weather · {weather.city}</span>
      <p className="home-card-text">
        {weather.temp}°F — {weather.description}
        {weather.feels_like !== weather.temp && ` (feels like ${weather.feels_like}°)`}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Add WeatherCard to HomeScreen**

Import and render `<WeatherCard authToken={authToken} />` after the last message card.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/WeatherCard.jsx frontend/src/components/HomeScreen.jsx
git commit -m "feat: add weather card to home screen"
```

---

### Task 25: Event Card on Home Screen

**Files:**
- Create: `frontend/src/components/EventCard.jsx`
- Modify: `frontend/src/components/HomeScreen.jsx`

- [ ] **Step 1: Create EventCard.jsx**

Fetches today's calendar events from the existing `/api/chat` (via memory/calendar). For now, check if Google is connected and show a card with the next upcoming event from calendar context (already included in system prompt). This can be enhanced later with a dedicated calendar endpoint.

Simple version: show the next reminder from `/api/reminders`:
```jsx
import React, { useState, useEffect } from 'react';

export default function EventCard({ authToken }) {
  const [reminder, setReminder] = useState(null);

  useEffect(() => {
    fetch('/api/reminders', { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json())
      .then(reminders => {
        const upcoming = reminders
          .filter(r => !r.sent && new Date(r.remind_at) > new Date())
          .sort((a, b) => new Date(a.remind_at) - new Date(b.remind_at))[0];
        setReminder(upcoming);
      })
      .catch(() => {});
  }, [authToken]);

  if (!reminder) return null;

  return (
    <div className="home-card">
      <span className="home-card-label">⏰ Coming up</span>
      <p className="home-card-text">{reminder.message}</p>
      <span className="home-card-time">{new Date(reminder.remind_at).toLocaleString()}</span>
    </div>
  );
}
```

- [ ] **Step 2: Add EventCard to HomeScreen**

Import and render after WeatherCard.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/EventCard.jsx frontend/src/components/HomeScreen.jsx
git commit -m "feat: add upcoming event/reminder card to home screen"
```

---

## Phase 5: Final Polish & Integration

### Task 26: Mobile Polish — Safe Areas, Scroll, Transitions

**Files:**
- Modify: `frontend/src/styles/global.css`

- [ ] **Step 1: Add safe area padding**

Update `.screen-container` and `.tab-bar`:
```css
.screen-container {
  padding-top: calc(16px + var(--safe-top));
}
.tab-bar {
  padding-bottom: calc(8px + var(--safe-bottom));
}
```

- [ ] **Step 2: Add scroll and touch optimization**

```css
.screen-container {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: none;
}

/* Prevent pull-to-refresh */
html {
  overscroll-behavior: none;
}

/* All interactive elements */
button, input, a {
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 3: Add tab transition animations**

```css
.screen-container {
  animation: fadeIn 250ms ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

- [ ] **Step 4: Test on iPhone Safari**

Verify: safe areas respected, no content behind notch/home indicator, smooth scrolling, no pull-to-refresh, tab transitions smooth.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles/global.css
git commit -m "style: add mobile polish — safe areas, scroll optimization, transitions"
```

---

### Task 27: Login Screen — Midnight Luxe Update

**Files:**
- Modify: `frontend/src/components/LoginScreen.jsx`
- Modify: `frontend/src/styles/global.css`

- [ ] **Step 1: Update LoginScreen styling**

Update the login screen to use Midnight Luxe gradient background, lavender accents, glass morphism input field. Add Nova's name/logo at top.

- [ ] **Step 2: Verify login screen looks professional**

Run: `cd /opt/nova/frontend && npm run build`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/LoginScreen.jsx frontend/src/styles/global.css
git commit -m "style: update login screen to Midnight Luxe theme"
```

---

### Task 28: Build, Deploy, and End-to-End Test

**Files:**
- No new files

- [ ] **Step 1: Build frontend**

```bash
cd /opt/nova/frontend && npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 2: Restart backend**

```bash
cd /opt/nova/backend && npm start
```
Expected: Server starts, database initializes with new tables, scheduler starts, VAPID keys generated.

- [ ] **Step 3: Test on iPhone**

Open the app URL on iPhone Safari:
1. Verify Midnight Luxe theme renders (gradient, not black)
2. Add to Home Screen — verify PWA launches standalone
3. Navigate all 5 tabs
4. Send a chat message — verify 16px text, iMessage-style bubbles
5. Test mic toggle — verify single tap stops recording
6. Ask Nova to "add milk to my shopping list" — verify in Tasks tab
7. Ask Nova "what's the weather" — verify weather card on Home
8. Enable push notifications in Settings
9. Set a reminder — verify push notification arrives

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Nova iPhone redesign — Midnight Luxe, PWA, 5-tab nav, new features"
```
