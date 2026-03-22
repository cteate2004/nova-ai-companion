# Nova Face Authentication — Design Spec

## Overview

Add two-factor authentication to Nova: PIN (server-verified) + face recognition (client-side). Face processing happens entirely in the browser using `@vladmandic/face-api` (actively maintained fork of face-api.js) — no biometric data leaves the device, minimal backend changes.

## Goals

- Strengthen authentication for a personal assistant with access to email, calendar, and other sensitive integrations
- Keep biometric data private (client-side only)
- Maintain PIN as a reliable fallback
- Work on iPhone (mobile Safari) and desktop (webcam)

## Non-Goals

- Multi-user face recognition
- Server-side face processing
- Anti-spoofing / liveness detection (out of scope for v1)
- Replacing PIN entirely

## Architecture

```
┌─────────────────────────────────────────────────┐
│  BROWSER (Client-Side Only)                     │
│                                                 │
│  localStorage:                                  │
│    • nova_face_descriptors  (array of 5 arrays  │
│      of 128 numbers, JSON-serialized)           │
│    • nova_face_enabled      (boolean flag)      │
│                                                 │
│  @vladmandic/face-api:                          │
│    • TinyFaceDetector  (~190KB model)           │
│    • FaceLandmark68    (~350KB model)           │
│    • FaceRecognition   (~6MB model)             │
│                                                 │
│  getUserMedia:                                  │
│    • Front camera (iPhone / webcam)             │
└──────────────┬──────────────────────────────────┘
               │ PIN only (face never sent)
┌──────────────▼──────────────────────────────────┐
│  BACKEND (Minimal change: token revoke endpoint)│
│    • /api/auth/login   (PIN verification)       │
│    • /api/auth/check   (token validation)       │
│    • /api/auth/revoke  (NEW: revoke token)      │
└─────────────────────────────────────────────────┘
```

Face recognition runs in the browser. The backend handles PIN verification, token management, and a new token revocation endpoint.

## Library Choice: @vladmandic/face-api

- Actively maintained fork of face-api.js with ESM support and Safari fixes
- TinyFaceDetector + 68-point landmarks + 128-dimensional face descriptors
- ~6.5MB total model weight files served from `public/models/`
- Euclidean distance matching against stored descriptors
- Proven on mobile Safari / iPhone
- Simplest API for single-user face matching
- Package: `@vladmandic/face-api` (latest version)

## Login Flow

### LoginScreen State Machine

```
PIN_ENTRY → (PIN correct + face enrolled) → FACE_VERIFY → (match) → AUTHENTICATED
                                                        → (3 fails) → PIN_ENTRY
         → (PIN correct + no face enrolled) → AUTHENTICATED
```

`LoginScreen.jsx` gains internal state: `phase` = `'pin'` | `'face'`, and `pendingToken` to hold the token between PIN success and face verification.

### First-time (no face enrolled)

1. User enters PIN → backend verifies → token returned → stored in localStorage → app unlocks (current behavior, unchanged)
2. User can optionally set up Face ID in Settings

### After enrollment

1. User enters PIN on login screen
2. Backend verifies PIN, returns auth token → held as `pendingToken` in React state (not yet persisted to localStorage)
3. `LoginScreen` transitions to `phase: 'face'` → renders `FaceVerification` component
4. Camera auto-opens, `face-api` detects face, computes 128-dim descriptor
5. Descriptor compared against 5 stored descriptors using Euclidean distance
6. **Match (distance < 0.5):** `pendingToken` stored in localStorage, `onLogin(token)` called
7. **No match:** retry automatically — 3 total detection attempts, ~1.5s between each (detection takes ~200-500ms + 1s pause)
8. **All 3 fail:** call `POST /api/auth/revoke` with `pendingToken` to invalidate it server-side, clear `pendingToken`, return to `phase: 'pin'` with error "Face verification failed — try again"

### Edge cases

- **No camera available:** face auth disabled, PIN-only login (skip face phase entirely), no error shown
- **Camera permission denied:** same as no camera — PIN-only
- **localStorage cleared / new browser:** no descriptors found → PIN-only login, prompt to re-enroll in Settings
- **Face auth disabled in settings:** PIN-only login
- **Logout / re-auth:** face descriptors persist in localStorage across logouts — face auth applies on next login if still enrolled
- **Model loading failure:** treat as "no camera" — graceful fallback to PIN-only

## Enrollment Flow

Located in Settings → "Face ID" section.

1. User taps "Set Up Face ID"
2. Camera opens with guided instructions
3. 5 captures with prompts:
   - "Look straight ahead"
   - "Turn slightly left"
   - "Turn slightly right"
   - "Tilt head slightly up"
   - "Tilt head slightly down"
4. Each capture: detect face → validate detection confidence is sufficient (reject low-confidence/partial faces, prompt retake) → compute descriptor → store
5. All 5 descriptors saved to `localStorage` as JSON: `Array.from(descriptor)` for each Float32Array, producing an array of 5 arrays of 128 numbers
6. `nova_face_enabled` flag set to `"true"`
7. Success confirmation shown

### Re-enrollment

- User can tap "Reset Face ID" in Settings to clear descriptors and re-enroll
- Toggling Face ID off clears stored descriptors

## Face Matching

- **Algorithm:** Euclidean distance between live descriptor and each of 5 stored descriptors
- **Threshold:** distance < 0.5 = match (face-api.js recommended default)
- **Strategy:** best match wins — if any of the 5 stored descriptors match, verification passes
- **Speed:** ~200-500ms per detection on modern devices

## Model Loading Strategy

- Models are loaded **lazily** — only when face verification or enrollment is triggered (not on app boot or login screen mount)
- Once loaded, models stay in memory for the duration of the session
- Model files cached by the service worker (`sw.js`) for fast subsequent loads
- If model loading fails (network error, corrupt files), fall back to PIN-only with no error shown to user
- Model files in `public/models/`:
  - `tiny_face_detector_model-weights_manifest.json` + shard files
  - `face_landmark_68_model-weights_manifest.json` + shard files
  - `face_recognition_model-weights_manifest.json` + shard files
  - (~9 files total, ~6.5MB)

## Data Storage

All in `localStorage` (browser-only):

| Key | Type | Description |
|-----|------|-------------|
| `nova_face_descriptors` | JSON string: array of 5 arrays of 128 numbers (serialized via `Array.from()` per descriptor) | Face descriptors from enrollment |
| `nova_face_enabled` | `"true"` / `"false"` | Whether face auth is active |

Total storage: ~5KB. Deserialization: `new Float32Array(arr)` for each stored array.

## New Files

### Frontend

| File | Purpose |
|------|---------|
| `src/hooks/useFaceAuth.js` | Hook: face-api initialization, lazy model loading, capture, descriptor comparison, enrollment logic |
| `src/components/FaceVerification.jsx` | Camera viewfinder with animated scanning ring, status text, retry counter |
| `src/components/FaceEnrollment.jsx` | Guided 5-photo capture wizard with directional prompts and confidence validation |
| `public/models/*` | face-api model weight files (~9 files, ~6.5MB total) |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/LoginScreen.jsx` | Add `phase`/`pendingToken` state. After PIN success: if face enrolled, set `phase: 'face'` and render `FaceVerification`. On face success, call `onLogin(pendingToken)`. On face failure, revoke token and reset to `phase: 'pin'`. |
| `src/components/SettingsScreen.jsx` | Add Face ID section: enable/disable toggle, "Set Up" button → FaceEnrollment, "Reset" button |
| `frontend/public/sw.js` | Add model files to service worker cache list |

### Backend

| File | Changes |
|------|---------|
| `backend/server.js` | Add `POST /api/auth/revoke` endpoint: accepts token in body, removes from `activeSessions` map. Called on face verification failure to prevent orphaned sessions. |

## UX Details

### Face Verification Screen (login)

- Full-screen overlay matching existing login aesthetic (dark gradient, purple accents)
- Circular camera viewfinder (centered, ~200px diameter)
- Animated dashed ring rotating around viewfinder during scan
- Status text below: "Verifying your face..." / "Try again..." / "Verification failed"
- Green checkmark animation on success before transitioning to app
- PIN checkmark shown above viewfinder ("PIN verified ✓")

### Face Enrollment Screen (settings)

- Modal/overlay with camera viewfinder
- Current instruction text above camera ("Look straight ahead")
- Progress indicator (step counter: 1/5, 2/5, etc.)
- Auto-capture after face detected with sufficient confidence + 1s hold
- Low-confidence detection → "Move closer" or "Better lighting needed" prompt
- Review step after all 5 captured: "Face ID is ready"

## Security Considerations

- Face descriptors are mathematical representations (128 floats), not photos — cannot be reverse-engineered into a face image
- Data never leaves the browser — no network requests for face auth
- PIN remains required as first factor — face alone cannot unlock
- If localStorage is compromised, attacker still needs the PIN
- Orphaned token risk mitigated by `/api/auth/revoke` endpoint on face failure
- No anti-spoofing in v1 (photo of face could potentially fool it) — acceptable for personal single-user app behind PIN

## Testing Plan

- Enrollment: verify 5 descriptors saved correctly to localStorage with proper JSON format
- Enrollment validation: verify low-confidence detections are rejected
- Login match: verify correct face passes within 3 attempts
- Login mismatch: verify wrong face fails after 3 attempts, returns to PIN, token revoked
- No camera: verify graceful fallback to PIN-only
- Permission denied: verify graceful fallback
- Model load failure: verify graceful fallback to PIN-only
- Settings toggle: verify enable/disable clears/preserves descriptors
- Logout/re-auth: verify face auth persists across logouts
- Mobile Safari: verify camera and face-api work on iPhone
- Desktop: verify webcam works
- Token revocation: verify `/api/auth/revoke` removes session on face failure
