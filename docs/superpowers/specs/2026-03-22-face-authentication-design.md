# Nova Face Authentication — Design Spec

## Overview

Add two-factor authentication to Nova: PIN (server-verified) + face recognition (client-side). Face processing happens entirely in the browser using `face-api.js` — no biometric data leaves the device, no backend changes required.

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
│    • nova_face_descriptors  (128-dim arrays × 5)│
│    • nova_face_enabled      (boolean flag)      │
│                                                 │
│  face-api.js:                                   │
│    • TinyFaceDetector  (~190KB model)           │
│    • FaceLandmark68    (~350KB model)           │
│    • FaceRecognition   (~6MB model)             │
│                                                 │
│  getUserMedia:                                  │
│    • Front camera (iPhone / webcam)             │
└──────────────┬──────────────────────────────────┘
               │ PIN only (face never sent)
┌──────────────▼──────────────────────────────────┐
│  BACKEND (No changes for face auth)             │
│    • /api/auth/login  (PIN verification)        │
│    • /api/auth/check  (token validation)        │
└─────────────────────────────────────────────────┘
```

All face recognition runs in the browser. The backend only handles PIN verification and token management — unchanged from current behavior.

## Library Choice: face-api.js

- TinyFaceDetector + 68-point landmarks + 128-dimensional face descriptors
- ~6.5MB total model weight files served from `public/models/`
- Euclidean distance matching against stored descriptors
- Proven on mobile Safari / iPhone
- Simplest API for single-user face matching

## Login Flow

### First-time (no face enrolled)

1. User enters PIN → backend verifies → token returned → app unlocks (current behavior, unchanged)
2. User prompted in Settings to set up Face ID (optional)

### After enrollment

1. User enters PIN on login screen
2. Backend verifies PIN, returns auth token (held in memory, not yet stored)
3. Login screen transitions to face verification view — camera auto-opens
4. `face-api.js` detects face, computes 128-dim descriptor
5. Descriptor compared against 5 stored descriptors (Euclidean distance)
6. **Match (distance < 0.5):** token stored in localStorage, app unlocks
7. **No match:** retry automatically, up to 3 attempts (1 second apart)
8. **All 3 fail:** discard token, return to PIN screen with error "Face verification failed — try again"

### Edge cases

- **No camera available:** face auth disabled, PIN-only login, no error shown
- **Camera permission denied:** same as no camera — PIN-only
- **localStorage cleared / new browser:** no descriptors found → PIN-only login, prompt to re-enroll in Settings
- **Face auth disabled in settings:** PIN-only login

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
4. Each capture: detect face → compute descriptor → store
5. All 5 descriptors saved to `localStorage` as JSON array
6. `nova_face_enabled` flag set to `true`
7. Success confirmation shown

### Re-enrollment

- User can tap "Reset Face ID" in Settings to clear descriptors and re-enroll
- Toggling Face ID off clears stored descriptors

## Face Matching

- **Algorithm:** Euclidean distance between live descriptor and each of 5 stored descriptors
- **Threshold:** distance < 0.5 = match (face-api.js recommended default)
- **Strategy:** best match wins — if any of the 5 stored descriptors match, verification passes
- **Speed:** ~200-500ms per detection on modern devices

## Data Storage

All in `localStorage` (browser-only):

| Key | Type | Description |
|-----|------|-------------|
| `nova_face_descriptors` | JSON array of 5 Float32Array-like arrays | 128-dim face descriptors from enrollment |
| `nova_face_enabled` | `"true"` / `"false"` | Whether face auth is active |

Total storage: ~5KB

## New Files

### Frontend

| File | Purpose |
|------|---------|
| `src/hooks/useFaceAuth.js` | Hook: face-api.js initialization, model loading, capture, descriptor comparison, enrollment logic |
| `src/components/FaceVerification.jsx` | Camera viewfinder with animated scanning ring, status text, retry counter |
| `src/components/FaceEnrollment.jsx` | Guided 5-photo capture wizard with directional prompts |
| `public/models/*` | face-api.js model weight files (TinyFaceDetector, FaceLandmark68, FaceRecognition) |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/LoginScreen.jsx` | After PIN success: if face enrolled, transition to FaceVerification instead of calling onLogin directly |
| `src/components/SettingsScreen.jsx` | Add Face ID section: enable/disable toggle, "Set Up" button → FaceEnrollment, "Reset" button |
| `src/App.jsx` | Pass face auth state to LoginScreen |

### Backend

No changes.

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
- Progress indicator (dots or step counter: 1/5, 2/5, etc.)
- Capture button or auto-capture after face detected + 1s hold
- Review step after all 5 captured: "Face ID is ready"

## Security Considerations

- Face descriptors are mathematical representations (128 floats), not photos — cannot be reverse-engineered into a face image
- Data never leaves the browser — no network requests for face auth
- PIN remains required as first factor — face alone cannot unlock
- If localStorage is compromised, attacker still needs the PIN
- No anti-spoofing in v1 (photo of face could potentially fool it) — acceptable for personal single-user app behind PIN

## Testing Plan

- Enrollment: verify 5 descriptors saved correctly to localStorage
- Login match: verify correct face passes within 3 attempts
- Login mismatch: verify wrong face fails after 3 attempts, returns to PIN
- No camera: verify graceful fallback to PIN-only
- Permission denied: verify graceful fallback
- Settings toggle: verify enable/disable clears/preserves descriptors
- Mobile Safari: verify camera and face-api.js work on iPhone
- Desktop: verify webcam works
