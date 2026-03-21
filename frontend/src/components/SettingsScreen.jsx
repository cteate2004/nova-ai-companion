import React, { useState, useEffect, useCallback } from 'react';

async function subscribePush(authToken) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

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
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    body: JSON.stringify(sub.toJSON()),
  });
  return true;
}

export default function SettingsScreen({ authToken }) {
  const [googleStatus, setGoogleStatus] = useState(null);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);

  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/google/status', { headers });
      if (res.ok) {
        const data = await res.json();
        setGoogleStatus(data);
      }
    } catch (err) {
      console.error('[SettingsScreen] google status error:', err);
    }
  }, [authToken]);

  useEffect(() => {
    fetchGoogleStatus();

    // Check if push already granted
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotifEnabled(true);
    }
  }, [fetchGoogleStatus]);

  // --- Notifications ---
  const handleToggleNotifications = async () => {
    if (notifEnabled) {
      // Can't revoke permission via JS — just inform user
      setNotifEnabled(false);
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in this browser.');
      return;
    }
    setNotifLoading(true);
    try {
      const success = await subscribePush(authToken);
      setNotifEnabled(success);
      if (!success) {
        alert('Notification permission was denied. Please enable it in your browser settings.');
      }
    } catch (err) {
      console.error('[SettingsScreen] push subscribe error:', err);
      alert('Failed to enable notifications. Please try again.');
    } finally {
      setNotifLoading(false);
    }
  };

  // --- Weather Location ---
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocationLoading(true);
    setLocationSaved(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await fetch('/api/settings/location', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: latitude, lon: longitude }),
          });
          setLocation({ lat: latitude.toFixed(4), lon: longitude.toFixed(4) });
          setLocationSaved(true);
        } catch (err) {
          console.error('[SettingsScreen] save location error:', err);
          // Still show coordinates even if save fails
          setLocation({ lat: latitude.toFixed(4), lon: longitude.toFixed(4) });
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        console.error('[SettingsScreen] geolocation error:', err);
        alert('Could not get your location. Please check your browser permissions.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  return (
    <div className="screen-container">
      <div className="screen-header">
        <h2>Settings</h2>
      </div>

      {/* Google Account */}
      <div className="section-title">Google Account</div>
      <div className="task-list-card settings-group">
        <div className="settings-item">
          <span className="settings-item-label">Status</span>
          <span className="settings-item-value">
            {googleStatus === null
              ? 'Checking…'
              : googleStatus.connected
              ? '✓ Connected'
              : 'Not connected'}
          </span>
        </div>
        {googleStatus && !googleStatus.connected && (
          <div className="settings-item">
            <a
              href="/api/google/auth"
              className="settings-btn"
              style={{ textDecoration: 'none', display: 'inline-block' }}
            >
              Connect Google
            </a>
          </div>
        )}
        {googleStatus?.connected && googleStatus?.email && (
          <div className="settings-item">
            <span className="settings-item-label">Account</span>
            <span className="settings-item-value">{googleStatus.email}</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="section-title">Notifications</div>
      <div className="task-list-card settings-group">
        <div className="toggle-row">
          <span className="toggle-label">Push Notifications</span>
          <button
            className={`toggle-switch ${notifEnabled ? 'on' : ''}`}
            onPointerDown={notifLoading ? undefined : handleToggleNotifications}
            style={notifLoading ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            aria-label="Toggle push notifications"
          />
        </div>
        <div className="settings-item">
          <span className="settings-item-label" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {notifEnabled
              ? 'Push notifications are enabled'
              : 'Enable to receive reminders and messages'}
          </span>
        </div>
      </div>

      {/* Weather Location */}
      <div className="section-title">Weather Location</div>
      <div className="task-list-card settings-group">
        {location ? (
          <div className="settings-item">
            <span className="settings-item-label">Current Location</span>
            <span className="settings-item-value">
              {location.lat}, {location.lon}
              {locationSaved && ' ✓'}
            </span>
          </div>
        ) : null}
        <div className="settings-item">
          <button
            className="settings-btn"
            onPointerDown={locationLoading ? undefined : handleUseLocation}
            style={locationLoading ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            {locationLoading ? 'Getting location…' : 'Use Current Location'}
          </button>
        </div>
      </div>

      {/* About */}
      <div className="section-title">About</div>
      <div className="task-list-card settings-group">
        <div className="settings-item">
          <span className="settings-item-label">Nova v2.0</span>
          <span className="settings-item-value">AI Companion</span>
        </div>
        <div className="settings-item">
          <span className="settings-item-label" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Midnight Luxe Edition
          </span>
        </div>
      </div>

      {/* Bottom padding */}
      <div style={{ height: 24 }} />
    </div>
  );
}
