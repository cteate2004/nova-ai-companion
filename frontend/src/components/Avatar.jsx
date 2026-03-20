import React from 'react';
import AvatarSVG from './AvatarSVG';

export default function Avatar({ emotion = 'neutral', isBlinking = false, mouthOpen = false }) {
  const classes = [
    'avatar-container',
    `avatar--${emotion}`,
    isBlinking ? 'avatar--blinking' : '',
    mouthOpen ? 'avatar--mouth-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <AvatarSVG emotion={emotion} />
    </div>
  );
}
