import { useState, useCallback, useRef, useEffect } from 'react';

// Strip emotion JSON tag that Claude appends
function stripEmotionTag(text) {
  return text.replace(/\s*\{"emotion":\s*"\w+"\}\s*$/, '').trim();
}

// Simple chime using Web Audio API
function playChime(freq = 880, duration = 0.12) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => ctx.close(), duration * 1000 + 100);
  } catch {}
}

// Pick a MIME type the browser supports for MediaRecorder
function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    '',
  ];
  for (const type of types) {
    if (!type || (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type))) {
      return type;
    }
  }
  return '';
}

// Create a persistent Audio element and unlock it on iOS
// iOS Safari only allows audio playback from elements that have been
// "activated" by playing (even silence) during a user gesture.
const sharedAudio = (typeof document !== 'undefined') ? new Audio() : null;
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked || !sharedAudio) return;
  // Play a tiny silent data URI to unlock the audio element
  sharedAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwMHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  sharedAudio.volume = 0.01;
  const p = sharedAudio.play();
  if (p) p.catch(() => {});
  audioUnlocked = true;
}

export default function useVoice({ onTranscript, onTTSStart, onTTSEnd, authToken }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const spaceHeld = useRef(false);
  const lastToggleTime = useRef(0);
  const DEBOUNCE_MS = 300;
  const currentAudioUrl = useRef(null);
  const onTTSStartRef = useRef(onTTSStart);
  const onTTSEndRef = useRef(onTTSEnd);
  onTTSStartRef.current = onTTSStart;
  onTTSEndRef.current = onTTSEnd;

  // Unlock audio on ANY user gesture (critical for iOS)
  useEffect(() => {
    function handleGesture() {
      unlockAudio();
    }
    window.addEventListener('touchstart', handleGesture);
    window.addEventListener('touchend', handleGesture);
    window.addEventListener('click', handleGesture);
    window.addEventListener('keydown', handleGesture);
    return () => {
      window.removeEventListener('touchstart', handleGesture);
      window.removeEventListener('touchend', handleGesture);
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, []);

  // Check support on mount
  useEffect(() => {
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setSupported(hasMediaRecorder && hasGetUserMedia);
  }, []);

  const startListening = useCallback(async () => {
    if (isListening) return;
    const now = Date.now();
    if (now - lastToggleTime.current < DEBOUNCE_MS) return;
    lastToggleTime.current = now;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        chunksRef.current = [];

        if (blob.size < 1000) {
          setIsListening(false);
          return;
        }

        try {
          const formData = new FormData();
          const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
          formData.append('audio', blob, `recording.${ext}`);

          const resp = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData,
          });

          if (resp.ok) {
            const data = await resp.json();
            if (data.text && data.text.trim()) {
              onTranscript?.(data.text.trim());
            }
          } else {
            console.error('[Voice] Transcription failed:', resp.status);
          }
        } catch (err) {
          console.error('[Voice] Transcription error:', err);
        }

        setIsListening(false);
        playChime(660, 0.1);
      };

      recorder.onerror = () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setIsListening(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
      playChime(880, 0.12);
    } catch (err) {
      console.error('[Voice] Mic access denied:', err);
      setIsListening(false);
    }
  }, [isListening, onTranscript, authToken]);

  const stopListening = useCallback(() => {
    const now = Date.now();
    if (now - lastToggleTime.current < DEBOUNCE_MS) return;
    lastToggleTime.current = now;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // setIsListening(false) is called inside recorder.onstop to avoid race conditions
      mediaRecorderRef.current = null;
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setIsListening(false);
    }
  }, []);

  // Speak text using server-side edge-tts via the shared (unlocked) Audio element
  const speak = useCallback(async (text) => {
    if (!text || !sharedAudio) return;

    const cleanText = stripEmotionTag(text);
    if (!cleanText) return;

    // Revoke previous blob URL if any
    if (currentAudioUrl.current) {
      URL.revokeObjectURL(currentAudioUrl.current);
      currentAudioUrl.current = null;
    }

    console.log('[Voice] Requesting TTS for:', cleanText.slice(0, 50) + '...');

    try {
      setIsSpeaking(true);
      onTTSStartRef.current?.();

      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!resp.ok) {
        console.error('[Voice] TTS request failed:', resp.status);
        setIsSpeaking(false);
        onTTSEndRef.current?.();
        return;
      }

      const audioBlob = await resp.blob();
      console.log('[Voice] Got TTS audio blob:', audioBlob.size, 'bytes');
      const audioUrl = URL.createObjectURL(audioBlob);
      currentAudioUrl.current = audioUrl;

      // Use the pre-unlocked shared audio element
      sharedAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioUrl.current = null;
        setIsSpeaking(false);
        onTTSEndRef.current?.();
      };

      sharedAudio.onerror = (e) => {
        console.error('[Voice] Audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
        currentAudioUrl.current = null;
        setIsSpeaking(false);
        onTTSEndRef.current?.();
      };

      sharedAudio.src = audioUrl;
      sharedAudio.volume = 1.0;

      const playPromise = sharedAudio.play();
      if (playPromise) {
        playPromise.then(() => {
          console.log('[Voice] Audio playing');
        }).catch((err) => {
          console.error('[Voice] Audio play blocked:', err);
          setIsSpeaking(false);
          onTTSEndRef.current?.();
        });
      }
    } catch (err) {
      console.error('[Voice] TTS error:', err);
      setIsSpeaking(false);
      onTTSEndRef.current?.();
    }
  }, [authToken]);

  const stopSpeaking = useCallback(() => {
    if (sharedAudio) {
      sharedAudio.pause();
      sharedAudio.currentTime = 0;
    }
    if (currentAudioUrl.current) {
      URL.revokeObjectURL(currentAudioUrl.current);
      currentAudioUrl.current = null;
    }
    setIsSpeaking(false);
    onTTSEndRef.current?.();
  }, []);

  // Spacebar push-to-talk handler (desktop)
  useEffect(() => {
    function onKeyDown(e) {
      if (e.code === 'Space' && !e.repeat && !e.target.matches('input, textarea')) {
        e.preventDefault();
        if (!spaceHeld.current) {
          spaceHeld.current = true;
          startListening();
        }
      }
    }

    function onKeyUp(e) {
      if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        spaceHeld.current = false;
        stopListening();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [startListening, stopListening]);

  return {
    isListening,
    isSpeaking,
    supported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
