import React, { useState } from 'react';

export default function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      localStorage.setItem('nova_token', token);
      onLogin(token);
    } catch {
      setError('Connection failed');
      setLoading(false);
    }
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
