import React from 'react';

export default function VoiceControl({ isListening, supported, onToggle }) {
  return (
    <button
      className={`mic-button ${isListening ? 'active' : ''}`}
      onPointerDown={onToggle}
      title={
        !supported
          ? 'Voice not supported in this browser (use Chrome or Edge)'
          : isListening
          ? 'Listening... (release to stop)'
          : 'Click or hold Spacebar to talk'
      }
      disabled={!supported}
      style={!supported ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
    >
      {isListening ? '🔴' : '🎤'}
    </button>
  );
}
