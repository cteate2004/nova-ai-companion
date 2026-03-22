# Face Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two-factor authentication (PIN + client-side face recognition) to Nova using `@vladmandic/face-api`.

**Architecture:** Client-side face recognition via `@vladmandic/face-api`. After PIN verification (existing backend), the browser captures a face via `getUserMedia`, computes a 128-dim descriptor, and matches it against 5 stored descriptors in localStorage. One new backend endpoint (`/api/auth/revoke`) handles token cleanup on face failure.

**Tech Stack:** React 19, @vladmandic/face-api, getUserMedia API, localStorage, Express 5

**Spec:** `docs/superpowers/specs/2026-03-22-face-authentication-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/hooks/useFaceAuth.js` | Create | Hook: lazy model loading, face detection, descriptor comparison, enrollment capture |
| `frontend/src/components/FaceVerification.jsx` | Create | Login-phase camera UI: viewfinder, scanning ring animation, retry counter, status text |
| `frontend/src/components/FaceEnrollment.jsx` | Create | Settings wizard: guided 5-photo capture with directional prompts and confidence validation |
| `frontend/src/components/LoginScreen.jsx` | Modify | Add `phase`/`pendingToken` state machine, render FaceVerification after PIN success |
| `frontend/src/components/SettingsScreen.jsx` | Modify | Add Face ID section: toggle, setup button, reset button |
| `frontend/src/styles/global.css` | Modify | Add face verification and enrollment CSS |
| `frontend/public/sw.js` | Modify | Cache face-api model files |
| `backend/server.js` | Modify | Add `POST /api/auth/revoke` endpoint |
| `frontend/public/models/` | Create | face-api.js model weight files (~9 files) |

---

## Task 1: Install dependencies and download model files

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/public/models/*` (~9 weight files)

- [ ] **Step 1: Install @vladmandic/face-api**

```bash
cd /opt/nova/frontend && npm install @vladmandic/face-api
```

- [ ] **Step 2: Copy model files to public/models/**

The models ship inside the npm package. Copy the required model files:

```bash
mkdir -p /opt/nova/frontend/public/models
# Copy all model files for the three required models.
# @vladmandic/face-api uses .bin files (not -shard* files).
# List actual files first to verify naming:
ls /opt/nova/frontend/node_modules/@vladmandic/face-api/model/ | grep -E '(tiny_face_detector|face_landmark_68|face_recognition)'
# Then copy them:
cp /opt/nova/frontend/node_modules/@vladmandic/face-api/model/tiny_face_detector_model-weights_manifest.json /opt/nova/frontend/public/models/
cp /opt/nova/frontend/node_modules/@vladmandic/face-api/model/tiny_face_detector_model.bin /opt/nova/frontend/public/models/
cp /opt/nova/frontend/node_modules/@vladmandic/face-api/model/face_landmark_68_model-weights_manifest.json /opt/nova/frontend/public/models/
cp /opt/nova/frontend/node_modules/@vladmandic/face-api/model/face_landmark_68_model.bin /opt/nova/frontend/public/models/
cp /opt/nova/frontend/node_modules/@vladmandic/face-api/model/face_recognition_model-weights_manifest.json /opt/nova/frontend/public/models/
cp /opt/nova/frontend/node_modules/@vladmandic/face-api/model/face_recognition_model.bin /opt/nova/frontend/public/models/
```

Note: If any file is missing, list `node_modules/@vladmandic/face-api/model/` and copy all files matching `tiny_face_detector_model*`, `face_landmark_68_model*`, and `face_recognition_model*`.

- [ ] **Step 3: Verify model files are accessible**

```bash
ls -la /opt/nova/frontend/public/models/
```

Expected: 6-9 files totaling ~6.5MB.

- [ ] **Step 4: Commit**

```bash
cd /opt/nova && git add frontend/package.json frontend/package-lock.json frontend/public/models/
git commit -m "chore: install @vladmandic/face-api and add model weights"
```

---

## Task 2: Add token revoke endpoint to backend

**Files:**
- Modify: `backend/server.js:27-43`

- [ ] **Step 1: Add the revoke endpoint**

In `backend/server.js`, add this endpoint after the existing `app.get('/api/auth/check', ...)` block (after line 43):

```javascript
app.post('/api/auth/revoke', (req, res) => {
  const { token } = req.body;
  if (token && activeSessions.has(token)) {
    activeSessions.delete(token);
  }
  res.json({ revoked: true });
});
```

This sits within the auth endpoints section (before the auth middleware at line 46), so it does not require authentication itself — by design, it's called when face verification fails and the token hasn't been stored client-side yet.

- [ ] **Step 2: Verify backend starts without errors**

```bash
cd /opt/nova/backend && node -e "require('./server.js')" &
sleep 2
curl -s -X POST http://localhost:8000/api/auth/revoke -H 'Content-Type: application/json' -d '{"token":"fake"}'
# Expected: {"revoked":true}
kill %1
```

- [ ] **Step 3: Commit**

```bash
cd /opt/nova && git add backend/server.js
git commit -m "feat: add POST /api/auth/revoke endpoint for face auth failure cleanup"
```

---

## Task 3: Create useFaceAuth hook

**Files:**
- Create: `frontend/src/hooks/useFaceAuth.js`

This is the core logic hook. It handles:
- Lazy loading of face-api models
- Face detection and descriptor extraction from a video element
- Descriptor comparison (Euclidean distance against stored descriptors)
- Enrollment (capturing and storing multiple descriptors)
- Reading/writing localStorage

- [ ] **Step 1: Create the hook file**

Create `frontend/src/hooks/useFaceAuth.js`:

```javascript
import { useState, useRef, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';
const MATCH_THRESHOLD = 0.5;
const STORAGE_KEY_DESCRIPTORS = 'nova_face_descriptors';
const STORAGE_KEY_ENABLED = 'nova_face_enabled';

export default function useFaceAuth() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  // Check if face auth is enrolled and enabled
  const isEnrolled = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY_ENABLED) === 'true'
      && localStorage.getItem(STORAGE_KEY_DESCRIPTORS) !== null;
  }, []);

  // Load models lazily (only once)
  const loadModels = useCallback(async () => {
    if (modelsLoaded || loadingRef.current) return true;
    loadingRef.current = true;
    setLoading(true);
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
      return true;
    } catch (err) {
      console.error('[useFaceAuth] model load failed:', err);
      return false;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [modelsLoaded]);

  // Detect a single face and return its 128-dim descriptor
  const detectFace = useCallback(async (videoEl) => {
    const detection = await faceapi
      .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection || null;
  }, []);

  // Compare a live descriptor against stored descriptors
  const matchDescriptor = useCallback((liveDescriptor) => {
    const stored = localStorage.getItem(STORAGE_KEY_DESCRIPTORS);
    if (!stored) return false;

    const descriptors = JSON.parse(stored);
    for (const arr of descriptors) {
      const dist = faceapi.euclideanDistance(liveDescriptor, arr);
      if (dist < MATCH_THRESHOLD) return true;
    }
    return false;
  }, []);

  // Verify face against stored descriptors using a video element
  // Returns: { success: boolean, error?: string }
  const verifyFace = useCallback(async (videoEl) => {
    const detection = await detectFace(videoEl);
    if (!detection) return { success: false, error: 'No face detected' };

    const matched = matchDescriptor(detection.descriptor);
    return { success: matched, error: matched ? null : 'Face did not match' };
  }, [detectFace, matchDescriptor]);

  // Capture a single descriptor for enrollment
  // Returns: { descriptor: number[], error?: string }
  const captureDescriptor = useCallback(async (videoEl) => {
    const detection = await detectFace(videoEl);
    if (!detection) return { descriptor: null, error: 'No face detected — try better lighting' };
    if (detection.detection.score < 0.6) {
      return { descriptor: null, error: 'Low confidence — move closer or improve lighting' };
    }
    return { descriptor: Array.from(detection.descriptor), error: null };
  }, [detectFace]);

  // Save enrollment descriptors to localStorage
  const saveEnrollment = useCallback((descriptors) => {
    localStorage.setItem(STORAGE_KEY_DESCRIPTORS, JSON.stringify(descriptors));
    localStorage.setItem(STORAGE_KEY_ENABLED, 'true');
  }, []);

  // Clear enrollment data
  const clearEnrollment = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_DESCRIPTORS);
    localStorage.setItem(STORAGE_KEY_ENABLED, 'false');
  }, []);

  // Check if camera is available
  const checkCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    isEnrolled,
    loadModels,
    modelsLoaded,
    loading,
    verifyFace,
    captureDescriptor,
    saveEnrollment,
    clearEnrollment,
    checkCamera,
  };
}
```

- [ ] **Step 2: Verify import works**

```bash
cd /opt/nova/frontend && npx vite build 2>&1 | tail -5
```

Expected: Build succeeds (or at least no import errors for face-api).

- [ ] **Step 3: Commit**

```bash
cd /opt/nova && git add frontend/src/hooks/useFaceAuth.js
git commit -m "feat: add useFaceAuth hook for face detection and matching"
```

---

## Task 4: Create FaceVerification component (login phase)

**Files:**
- Create: `frontend/src/components/FaceVerification.jsx`
- Modify: `frontend/src/styles/global.css`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/FaceVerification.jsx`:

```jsx
import React, { useRef, useState, useEffect } from 'react';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY = 1500;

export default function FaceVerification({ onSuccess, onFailure, faceAuth }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | scanning | success | failed
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState('Initializing...');
  const mountedRef = useRef(true);
  // Stable refs for callbacks to avoid re-triggering effects
  const onSuccessRef = useRef(onSuccess);
  const onFailureRef = useRef(onFailure);
  onSuccessRef.current = onSuccess;
  onFailureRef.current = onFailure;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Start camera, load models, and run verification — single self-contained effect
  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Load models
      setMessage('Loading face recognition...');
      const loaded = await faceAuth.loadModels();
      if (cancelled) return;
      if (!loaded) {
        setStatus('failed');
        setMessage('Could not load face models');
        onFailureRef.current();
        return;
      }

      // Open camera
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        if (cancelled) return;
        setStatus('failed');
        setMessage('Camera access denied');
        onFailureRef.current();
        return;
      }

      // Run verification attempts
      setStatus('scanning');
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        if (cancelled) return;
        setAttempt(i + 1);
        setMessage(`Verifying your face... (${i + 1}/${MAX_ATTEMPTS})`);

        const result = await faceAuth.verifyFace(videoRef.current);
        if (cancelled) return;

        if (result.success) {
          setStatus('success');
          setMessage('Welcome back!');
          setTimeout(() => { if (mountedRef.current) onSuccessRef.current(); }, 800);
          return;
        }

        if (i < MAX_ATTEMPTS - 1) {
          setMessage('Try again...');
          await new Promise(r => setTimeout(r, RETRY_DELAY));
        }
      }

      if (!cancelled) {
        setStatus('failed');
        setMessage('Face verification failed');
        setTimeout(() => { if (mountedRef.current) onFailureRef.current(); }, 1500);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [faceAuth]); // eslint-disable-line react-hooks/exhaustive-deps

  const ringClass = status === 'success' ? 'face-ring success' : status === 'failed' ? 'face-ring failed' : 'face-ring scanning';

  return (
    <div className="face-verify-overlay">
      <div className="face-verify-content">
        <div className="face-pin-check">✓ PIN verified</div>

        <div className="face-viewfinder-wrap">
          <div className={ringClass}>
            <video
              ref={videoRef}
              className="face-video"
              autoPlay
              playsInline
              muted
            />
          </div>
        </div>

        <p className="face-status">{message}</p>

        <div className="face-dots">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
            <span
              key={i}
              className={`face-dot ${i < attempt ? (status === 'success' ? 'success' : status === 'failed' && i === attempt - 1 ? 'failed' : 'done') : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for face verification**

Append to `frontend/src/styles/global.css` (before the media queries section):

```css
/* ===== FACE VERIFICATION ===== */
.face-verify-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(160deg, var(--bg-start) 0%, var(--bg-mid) 30%, #0f3460 60%, var(--bg-end) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: calc(24px + var(--safe-top)) 24px calc(24px + var(--safe-bottom));
}

.face-verify-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.face-pin-check {
  color: rgba(100, 220, 120, 0.7);
  font-size: 14px;
  letter-spacing: 0.5px;
}

.face-viewfinder-wrap {
  position: relative;
}

.face-ring {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  border: 3px solid rgba(200, 160, 255, 0.4);
  overflow: hidden;
  position: relative;
  transition: border-color 400ms;
}

.face-ring.scanning {
  animation: face-pulse 2s ease-in-out infinite;
}

.face-ring.success {
  border-color: rgba(100, 220, 120, 0.8);
  box-shadow: 0 0 30px rgba(100, 220, 120, 0.3);
}

.face-ring.failed {
  border-color: rgba(255, 107, 107, 0.8);
  box-shadow: 0 0 30px rgba(255, 107, 107, 0.2);
}

@keyframes face-pulse {
  0%, 100% { box-shadow: 0 0 10px rgba(200, 160, 255, 0.2); }
  50% { box-shadow: 0 0 30px rgba(200, 160, 255, 0.4); }
}

.face-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
  border-radius: 50%;
}

.face-status {
  color: var(--text-dim);
  font-size: 14px;
  letter-spacing: 0.3px;
  text-align: center;
}

.face-dots {
  display: flex;
  gap: 8px;
}

.face-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(200, 160, 255, 0.2);
  transition: background 300ms;
}

.face-dot.done { background: rgba(200, 160, 255, 0.6); }
.face-dot.success { background: rgba(100, 220, 120, 0.8); }
.face-dot.failed { background: rgba(255, 107, 107, 0.7); }

/* ===== FACE ENROLLMENT ===== */
.face-enroll-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 24px;
}

.face-enroll-card {
  width: 100%;
  max-width: 360px;
  background: rgba(200, 160, 255, 0.06);
  border: 1px solid rgba(200, 160, 255, 0.15);
  border-radius: 24px;
  padding: 28px;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.face-enroll-title {
  color: var(--accent);
  font-size: 20px;
  font-weight: 300;
  letter-spacing: 1px;
}

.face-enroll-instruction {
  color: var(--text-dim);
  font-size: 14px;
  text-align: center;
  min-height: 40px;
}

.face-enroll-viewfinder {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  border: 2px solid rgba(200, 160, 255, 0.3);
  overflow: hidden;
}

.face-enroll-viewfinder video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
  border-radius: 50%;
}

.face-enroll-progress {
  color: var(--text-muted);
  font-size: 13px;
  letter-spacing: 1px;
}

.face-enroll-btn {
  width: 100%;
  background: linear-gradient(135deg, var(--accent) 0%, rgba(160, 120, 220, 1) 100%);
  border: none;
  border-radius: 14px;
  padding: 14px;
  color: #1a1a2e;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 200ms;
}

.face-enroll-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.face-enroll-btn-secondary {
  width: 100%;
  background: transparent;
  border: 1px solid rgba(200, 160, 255, 0.2);
  border-radius: 14px;
  padding: 14px;
  color: var(--text-dim);
  font-size: 14px;
  cursor: pointer;
}

.face-enroll-error {
  color: #ff6b6b;
  font-size: 13px;
  text-align: center;
  min-height: 18px;
}
```

- [ ] **Step 3: Verify build**

```bash
cd /opt/nova/frontend && npx vite build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /opt/nova && git add frontend/src/components/FaceVerification.jsx frontend/src/styles/global.css
git commit -m "feat: add FaceVerification component with scanning ring UI"
```

---

## Task 5: Create FaceEnrollment component (settings wizard)

**Files:**
- Create: `frontend/src/components/FaceEnrollment.jsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/FaceEnrollment.jsx`:

```jsx
import React, { useRef, useState, useEffect } from 'react';

const PROMPTS = [
  'Look straight ahead',
  'Turn slightly left',
  'Turn slightly right',
  'Tilt head slightly up',
  'Tilt head slightly down',
];

export default function FaceEnrollment({ faceAuth, onComplete, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [step, setStep] = useState(-1); // -1 = loading, 0-4 = capture steps, 5 = done
  const [descriptors, setDescriptors] = useState([]);
  const [error, setError] = useState('');
  const [capturing, setCapturing] = useState(false);

  // Start camera and load models
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const loaded = await faceAuth.loadModels();
      if (cancelled) return;
      if (!loaded) {
        setError('Could not load face recognition models');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        // setStep(0) triggers render which mounts the <video> element.
        // We assign srcObject in a separate effect below.
        setStep(0);
      } catch {
        if (!cancelled) setError('Camera access denied');
      }
    }

    init();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [faceAuth]);

  // Assign stream to video element once it's mounted (step >= 0)
  useEffect(() => {
    if (step >= 0 && videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [step]);

  const handleCapture = async () => {
    if (capturing || !videoRef.current) return;
    setCapturing(true);
    setError('');

    const result = await faceAuth.captureDescriptor(videoRef.current);
    if (result.error) {
      setError(result.error);
      setCapturing(false);
      return;
    }

    const updated = [...descriptors, result.descriptor];
    setDescriptors(updated);
    setCapturing(false);

    if (updated.length >= PROMPTS.length) {
      // All captures done — save
      faceAuth.saveEnrollment(updated);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      setStep(PROMPTS.length);
    } else {
      setStep(updated.length);
    }
  };

  const handleDone = () => {
    onComplete();
  };

  // Done state
  if (step === PROMPTS.length) {
    return (
      <div className="face-enroll-overlay">
        <div className="face-enroll-card">
          <div className="face-enroll-title">Face ID Ready</div>
          <div style={{ fontSize: 48, margin: '12px 0' }}>✓</div>
          <p className="face-enroll-instruction">
            Your face has been enrolled successfully. Face verification will now be required when you log in.
          </p>
          <button className="face-enroll-btn" onClick={handleDone}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="face-enroll-overlay">
      <div className="face-enroll-card">
        <div className="face-enroll-title">Set Up Face ID</div>

        {step < 0 ? (
          <p className="face-enroll-instruction">Initializing camera...</p>
        ) : (
          <>
            <p className="face-enroll-instruction">{PROMPTS[step]}</p>

            <div className="face-enroll-viewfinder">
              <video ref={videoRef} autoPlay playsInline muted />
            </div>

            <div className="face-enroll-progress">{step + 1} / {PROMPTS.length}</div>

            <p className="face-enroll-error">{error}</p>

            <button
              className="face-enroll-btn"
              onClick={handleCapture}
              disabled={capturing}
            >
              {capturing ? 'Capturing...' : 'Capture'}
            </button>
          </>
        )}

        <button className="face-enroll-btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /opt/nova/frontend && npx vite build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /opt/nova && git add frontend/src/components/FaceEnrollment.jsx
git commit -m "feat: add FaceEnrollment wizard component with 5-step guided capture"
```

---

## Task 6: Modify LoginScreen to support face verification phase

**Files:**
- Modify: `frontend/src/components/LoginScreen.jsx`

- [ ] **Step 1: Update LoginScreen with face verification state machine**

Replace the entire content of `frontend/src/components/LoginScreen.jsx`:

```jsx
import React, { useState } from 'react';
import FaceVerification from './FaceVerification';
import useFaceAuth from '../hooks/useFaceAuth';

export default function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('pin'); // 'pin' | 'face'
  const [pendingToken, setPendingToken] = useState(null);
  const faceAuth = useFaceAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pin.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      if (!res.ok) {
        setError('Wrong PIN');
        setPin('');
        setLoading(false);
        return;
      }

      const { token } = await res.json();

      // Check if face auth is enrolled
      if (faceAuth.isEnrolled()) {
        setPendingToken(token);
        setPhase('face');
        setLoading(false);
      } else {
        // No face auth — log in directly
        localStorage.setItem('nova_token', token);
        onLogin(token);
      }
    } catch {
      setError('Connection failed');
      setLoading(false);
    }
  }

  function handleFaceSuccess() {
    localStorage.setItem('nova_token', pendingToken);
    onLogin(pendingToken);
  }

  async function handleFaceFailure() {
    // Revoke the pending token on the server
    if (pendingToken) {
      try {
        await fetch('/api/auth/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: pendingToken }),
        });
      } catch {
        // Best effort — token will expire eventually
      }
    }
    setPendingToken(null);
    setPhase('pin');
    setPin('');
    setError('Face verification failed — try again');
  }

  if (phase === 'face') {
    return (
      <FaceVerification
        faceAuth={faceAuth}
        onSuccess={handleFaceSuccess}
        onFailure={handleFaceFailure}
      />
    );
  }

  return (
    <div className="login-screen">
      <div className="login-branding">
        <img
          className="login-avatar"
          src="/nova-face.jpg"
          alt="Nova"
        />
        <h1 className="login-title">Nova</h1>
        <p className="login-tagline">Your personal AI</p>
      </div>

      <div className="login-card">
        <p className="login-subtitle">Enter your PIN to continue</p>
        <form onSubmit={handleSubmit}>
          <input
            className="login-input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="· · · ·"
            value={pin}
            onChange={e => setPin(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          <p className="login-error">{error}</p>
          <button className="login-btn" type="submit" disabled={loading || !pin.trim()}>
            {loading ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

Key changes from original:
- Import FaceVerification and useFaceAuth
- Add `phase` state (`'pin'` | `'face'`) and `pendingToken` state
- After PIN success: check `faceAuth.isEnrolled()` — if true, hold token and show face phase
- `handleFaceSuccess`: store token and call `onLogin`
- `handleFaceFailure`: revoke token via `/api/auth/revoke`, reset to PIN phase with error message
- PIN form is unchanged — identical JSX

- [ ] **Step 2: Verify build**

```bash
cd /opt/nova/frontend && npx vite build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /opt/nova && git add frontend/src/components/LoginScreen.jsx
git commit -m "feat: add face verification phase to LoginScreen after PIN success"
```

---

## Task 7: Add Face ID section to SettingsScreen

**Files:**
- Modify: `frontend/src/components/SettingsScreen.jsx`

- [ ] **Step 1: Add Face ID imports and state**

At the top of `frontend/src/components/SettingsScreen.jsx`, add imports after the existing React import (line 1):

```jsx
import FaceEnrollment from './FaceEnrollment';
import useFaceAuth from '../hooks/useFaceAuth';
```

- [ ] **Step 2: Add Face ID state inside the component**

Inside the `SettingsScreen` function, after the existing `useState` calls (after line 68), add:

```javascript
const faceAuth = useFaceAuth();
const [faceEnabled, setFaceEnabled] = useState(localStorage.getItem('nova_face_enabled') === 'true');
const [showEnrollment, setShowEnrollment] = useState(false);
```

- [ ] **Step 3: Add Face ID toggle handler**

After the `handleUseLocation` function (after line 155), add:

```javascript
// --- Face ID ---
const handleToggleFaceId = () => {
  if (faceEnabled) {
    faceAuth.clearEnrollment();
    setFaceEnabled(false);
  }
  // If not enabled, they need to go through enrollment
};

const handleEnrollComplete = () => {
  setShowEnrollment(false);
  setFaceEnabled(true);
};

const handleEnrollCancel = () => {
  setShowEnrollment(false);
};
```

- [ ] **Step 4: Add Face ID JSX section**

In the return JSX, add this section after the Notifications section (after the closing `</div>` on line 214) and before the Weather Location section:

```jsx
{/* Face ID */}
<div className="section-title">Face ID</div>
<div className="task-list-card settings-group">
  <div className="toggle-row">
    <span className="toggle-label">Face Verification</span>
    <button
      className={`toggle-switch ${faceEnabled ? 'on' : ''}`}
      onPointerDown={faceEnabled ? handleToggleFaceId : undefined}
      aria-label="Toggle face verification"
    />
  </div>
  {!faceEnabled && (
    <div className="settings-item">
      <button
        className="settings-btn"
        onPointerDown={() => setShowEnrollment(true)}
      >
        Set Up Face ID
      </button>
    </div>
  )}
  {faceEnabled && (
    <div className="settings-item">
      <button
        className="settings-btn"
        onPointerDown={() => { faceAuth.clearEnrollment(); setFaceEnabled(false); }}
      >
        Reset Face ID
      </button>
    </div>
  )}
  <div className="settings-item">
    <span className="settings-item-label" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
      {faceEnabled
        ? 'Face verification is required after PIN entry'
        : 'Add face recognition as a second factor'}
    </span>
  </div>
</div>

{showEnrollment && (
  <FaceEnrollment
    faceAuth={faceAuth}
    onComplete={handleEnrollComplete}
    onCancel={handleEnrollCancel}
  />
)}
```

- [ ] **Step 5: Verify build**

```bash
cd /opt/nova/frontend && npx vite build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
cd /opt/nova && git add frontend/src/components/SettingsScreen.jsx
git commit -m "feat: add Face ID settings section with enrollment and reset"
```

---

## Task 8: Update service worker to cache model files

**Files:**
- Modify: `frontend/public/sw.js`

- [ ] **Step 1: Add model files to the static assets cache**

In `frontend/public/sw.js`:

First, bump the cache version on line 1 to force activation of the new service worker:
```javascript
const CACHE_NAME = 'nova-v3';
```

Then replace the fetch event listener (lines 23-36) with a version that adds runtime caching for model files:

```javascript
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return;
  // HTML pages: network-first so updates load immediately
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }
  // Face-api model files: cache-first with runtime caching
  if (event.request.url.includes('/models/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }
  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

- [ ] **Step 2: Commit**

```bash
cd /opt/nova && git add frontend/public/sw.js
git commit -m "feat: add runtime caching for face-api model files in service worker"
```

---

## Task 9: Build, deploy, and end-to-end test

**Files:** None (deployment task)

- [ ] **Step 1: Build frontend**

```bash
cd /opt/nova/frontend && npm run build 2>&1 | tail -10
```

Expected: Build succeeds, output in `frontend/dist/`.

- [ ] **Step 2: Restart backend**

```bash
cd /opt/nova/backend && pkill -f "node server.js"; nohup node server.js > /tmp/nova-server.log 2>&1 &
sleep 2
curl -s http://localhost:8000/api/auth/check | head -1
```

Expected: `{"authenticated":false}` (server is running).

- [ ] **Step 3: Manual end-to-end test checklist**

Open https://nova.srv1042999.hstgr.cloud on iPhone:

1. **PIN-only login (no face enrolled):** Enter PIN → should log in directly (no face step)
2. **Enroll face:** Settings → Face ID → "Set Up Face ID" → complete 5 captures → "Face ID Ready"
3. **Verify toggle:** Face Verification toggle should now be ON in Settings
4. **Log out and test face auth:** Log out → enter PIN → camera should auto-open → face scan → should unlock
5. **Test face failure:** Cover camera or hold up to wall → 3 attempts → "Face verification failed" → back to PIN
6. **Test reset:** Settings → "Reset Face ID" → toggle should be OFF → login should be PIN-only again
7. **Test no camera:** On a device without camera, login should work with PIN only

- [ ] **Step 4: Final commit**

```bash
cd /opt/nova && git add -A
git commit -m "feat: complete face authentication two-factor login system"
```
