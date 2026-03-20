import React, { useState } from 'react';

export default function Avatar({ emotion = 'neutral', isBlinking = false, mouthOpen = false }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const emotionGlow = {
    neutral: 'rgba(0, 212, 170, 0.15)',
    happy: 'rgba(255, 200, 50, 0.2)',
    excited: 'rgba(255, 150, 50, 0.25)',
    flirty: 'rgba(255, 100, 150, 0.2)',
    concerned: 'rgba(100, 150, 255, 0.15)',
    thoughtful: 'rgba(150, 100, 255, 0.15)',
    laughing: 'rgba(255, 220, 50, 0.25)',
    listening: 'rgba(0, 212, 170, 0.25)',
    talking: 'rgba(0, 212, 170, 0.2)',
  };

  return (
    <div className="avatar-container avatar-lifelike">
      <div
        className="avatar-glow-ring"
        style={{ boxShadow: `0 0 80px 40px ${emotionGlow[emotion] || emotionGlow.neutral}` }}
      />

      <img
        src="/nova-face.jpg"
        alt="Nova"
        className="avatar-photo"
        onLoad={() => setImageLoaded(true)}
        onError={(e) => {
          if (e.target.src.includes('.jpg')) {
            e.target.src = '/nova-face.png';
          }
        }}
      />

      <div className={`avatar-emotion-badge avatar-emotion--${emotion}`}>
        {emotion !== 'neutral' && emotion}
      </div>

      {!imageLoaded && (
        <div className="avatar-placeholder">
          <div className="avatar-placeholder-text">
            Place <strong>nova-face.jpg</strong> in<br />frontend/public/
          </div>
        </div>
      )}
    </div>
  );
}
