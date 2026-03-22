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
