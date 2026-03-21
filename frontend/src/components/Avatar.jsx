import React from 'react';

export default function Avatar({ emotion = 'neutral', isBlinking = false, mouthOpen = false, size }) {
  const classes = [
    'avatar-container',
    `avatar--${emotion}`,
    isBlinking ? 'avatar--blinking' : '',
    mouthOpen ? 'avatar--mouth-open' : '',
    size === 'hero' ? 'hero' : '',
    size === 'collapsed' ? 'collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="avatar-image-wrapper">
        <img src="/nova-face.jpg" alt="Nova" className="avatar-image" />
        <div className="avatar-image-glow" />
      </div>
    </div>
  );
}
