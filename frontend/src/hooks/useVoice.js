import { useState, useCallback, useRef, useEffect } from 'react';

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

// Pick the best available female English voice
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  const preferred = ['Zira', 'Hazel', 'Susan', 'Jenny', 'Aria'];

  for (const name of preferred) {
    const match = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
    if (match) return match;
  }

  // Fallback: any English female-sounding voice
  const english = voices.filter(v => v.lang.startsWith('en'));
  return english[0] || voices[0] || null;
}

// Simple chime using Web Audio API
function playChime(freq = 880, duration = 0.12) {
  try {
    const ctx = new AudioContext();
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

export default function useVoice({ onTranscript, onTTSStart, onTTSEnd }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef(null);
  const spaceHeld = useRef(false);

  useEffect(() => {
    setSupported(!!SpeechRecognition);
    // Preload voices
    speechSynthesis.getVoices();
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition || isListening) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        onTranscript?.(transcript.trim());
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      playChime(660, 0.1);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    playChime(880, 0.12);
  }, [isListening, onTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const speak = useCallback((text) => {
    if (!text) return;

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    utterance.onstart = () => {
      setIsSpeaking(true);
      onTTSStart?.();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      onTTSEnd?.();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      onTTSEnd?.();
    };

    speechSynthesis.speak(utterance);
  }, [onTTSStart, onTTSEnd]);

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    onTTSEnd?.();
  }, [onTTSEnd]);

  // Spacebar push-to-talk handler
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
