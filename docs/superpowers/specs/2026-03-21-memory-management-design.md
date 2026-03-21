# Memory Management & TTS Emoji Fix — Design Spec

## Overview

Two changes:

1. **Memory management screen** — a sub-screen accessible from Settings where the user can view, edit, and delete Nova's memories about them. Organized by category with inline editing.
2. **TTS emoji stripping** — remove emojis from text before sending to the TTS service so Nova doesn't read out emoji names like "purple heart."

## 1. Memory Management

### Current State

- Memories are stored in a `memories` table with `id, fact, category, created_at, last_referenced`
- Extracted automatically every 5 messages via Claude
- Injected into Nova's system prompt as bullet points
- Only API endpoint is `GET /api/memory` (read-only)
- No frontend UI exists

### New: Settings Sub-Screen

A "Manage Memories" button in SettingsScreen opens a full-screen sub-view (not a modal — replaces the Settings content with a back button to return).

**Layout:**

1. **Header** — "Nova's Memories" title + back arrow button
2. **Category sections** — memories grouped by category (personal, preference, work, interest, relationship, event), each with a section header. Only categories with memories are shown.
3. **Memory items** — each memory displays:
   - The fact text (editable on tap)
   - Category label (muted)
   - Date added (muted, small)
   - Delete button (x)
4. **Empty state** — "Nova hasn't learned anything about you yet" when no memories exist
5. **Search/filter** — not needed for v1; memory lists are typically small

**Edit flow:**
- Tap a memory fact to enter edit mode (text becomes an input field)
- Save on blur or Enter key
- Cancel on Escape

**Delete flow:**
- Tap the x button on a memory
- Confirm with a simple "Delete this memory?" prompt
- Memory is removed from Nova's knowledge immediately

### Backend Changes

**Fix existing:**

- `getMemories()` must be updated to `SELECT id, fact, category, created_at, last_referenced FROM memories` (currently omits `id`, which the frontend needs for edit/delete)

**New API routes:**

| Method | Route             | Description                     |
|--------|-------------------|---------------------------------|
| PATCH  | /api/memory/:id   | Update memory {fact, category}  |
| DELETE | /api/memory/:id   | Delete a memory                 |

**Validation for PATCH /api/memory/:id:**
- Return 404 if id does not exist
- Reject empty/whitespace-only `fact`
- Only allow `fact` and `category` fields (whitelist, ignore others)
- Return 400 if no valid fields provided

**New database functions:**

- `updateMemory(id, updates)` — partial update, whitelisted to `fact` and `category` only. Calls `persist()`. Returns updated row or null if id not found.
- `deleteMemory(id)` — deletes a memory by id. Calls `persist()`.

### Frontend Changes

**New component: `MemoryScreen.jsx`**
- Receives `onBack` and `authToken` props
- Fetches memories from `GET /api/memory` on mount
- Groups by category for display
- Handles edit (PATCH) and delete (DELETE) with optimistic UI updates
- On failed API calls, reverts local state and shows brief error

**Modified: `SettingsScreen.jsx`**
- Add "Manage Memories" button with memory count badge (e.g. "Manage Memories (23)")
- When tapped, calls `onNavigate('memory')` prop

**Modified: `App.jsx`**
- Add `settingsSubScreen` state (null or 'memory') in NovaApp
- In `renderScreen()`, when `activeTab === 'settings'` and `settingsSubScreen === 'memory'`, render MemoryScreen instead of SettingsScreen
- Reset `settingsSubScreen` to null when `activeTab` changes (navigating away returns to main Settings)
- Pass `onNavigate` to SettingsScreen, `onBack` to MemoryScreen

### Files Changed

| File | Change |
|------|--------|
| `backend/database.js` | Fix `getMemories()` to include `id`; add `updateMemory()`, `deleteMemory()` |
| `backend/server.js` | Add `PATCH /api/memory/:id`, `DELETE /api/memory/:id` |
| `frontend/src/App.jsx` | Sub-screen state management for MemoryScreen |
| `frontend/src/components/SettingsScreen.jsx` | Add "Manage Memories" button |
| `frontend/src/components/MemoryScreen.jsx` | New — memory management sub-screen |
| `frontend/src/styles/global.css` | Memory screen styles |

## 2. TTS Emoji Stripping

### Problem

When Nova's response contains emojis (e.g. "Good morning! sun with face Hope you have an amazing day purple heart"), the TTS engine reads them out as their Unicode names, which sounds unnatural.

### Solution

Strip all emoji characters from the text in the backend `/api/tts` route before forwarding to edge-tts. This is the cleanest place because:
- It's a single point of change
- The frontend still displays emojis in chat bubbles (visual emojis are fine)
- Only the spoken audio is affected

### Implementation

Add a `stripEmojis(text)` function in `server.js` using the Unicode property escape `\p{Extended_Pictographic}` (supported in Node.js). This is standards-based and stays current with new emoji additions.

```js
function stripEmojis(text) {
  return text.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s{2,}/g, ' ').trim();
}
```

Applied in the `POST /api/tts` route handler, to the `text` variable before constructing the fetch body:
```js
body: JSON.stringify({ text: stripEmojis(text), voice }),
```

### Files Changed

| File | Change |
|------|--------|
| `backend/server.js` | Add `stripEmojis()`, apply in `/api/tts` route |
