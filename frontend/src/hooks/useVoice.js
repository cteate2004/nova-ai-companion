import { useState, useCallback, useRef, useEffect } from 'react';

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

// Strip emotion JSON tag that Claude appends
function stripEmotionTag(text) {
  return text.replace(/\s*\{"emotion":\s*"\w+"\}\s*$/, '').trim();
}

// Strip URLs, markdown images, and markdown links for TTS
function stripForTTS(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')        // Remove ![alt](url)
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')     // [text](url) → text
    .replace(/https?:\/\/[^\s)]+/g, '')           // Remove bare URLs
    .replace(/\s{2,}/g, ' ')                      // Collapse whitespace
    .trim();
}

// Load voices asynchronously — Chrome fires voiceschanged after first call
function getVoices() {
  return new Promise(resolve => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) return resolve(voices);
    speechSynthesis.addEventListener('voiceschanged', () => {
      resolve(speechSynthesis.getVoices());
    }, { once: true });
  });
}

// Pick the best available female English voice
async function pickVoice() {
  const voices = await getVoices();
  const preferred = ['Aria', 'Jenny', 'Zira', 'Hazel', 'Susan'];

  for (const name of preferred) {
    const match = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
    if (match) return match;
  }

  // Fallback: any English voice, prefer one with "female" in the name
  const english = voices.filter(v => v.lang.startsWith('en'));
  const female = english.find(v => /female/i.test(v.name));
  if (female) return female;

  // Second fallback: second English voice (often female on Windows)
  return english[1] || english[0] || voices[0] || null;
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
  const selectedVoice = useRef(null);
  const hasInteracted = useRef(false);

  // Track user interaction for autoplay policy
  useEffect(() => {
    function markInteracted() {
      hasInteracted.current = true;
    }
    window.addEventListener('click', markInteracted, { once: true });
    window.addEventListener('keydown', markInteracted, { once: true });
    return () => {
      window.removeEventListener('click', markInteracted);
      window.removeEventListener('keydown', markInteracted);
    };
  }, []);

  // Load voices on mount
  useEffect(() => {
    setSupported(!!SpeechRecognition);
    pickVoice().then(voice => {
      selectedVoice.current = voice;
      console.log('[Voice] Selected TTS voice:', voice?.name || 'none');
    });
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

  // Speak text — chunks into sentences to avoid Chrome's 15-second kill bug
  const speak = useCallback((text) => {
    if (!text) return;

    // Don't speak if user hasn't interacted yet (autoplay policy)
    if (!hasInteracted.current) {
      console.log('[Voice] Skipping TTS — no user interaction yet');
      return;
    }

    // Strip emotion tag and URLs before speaking
    const cleanText = stripForTTS(stripEmotionTag(text));
    if (!cleanText) return;

    speechSynthesis.cancel();

    // Split into sentences to avoid Chrome's ~15s utterance timeout
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    let started = false;

    sentences.forEach((sentence, i) => {
      const utterance = new SpeechSynthesisUtterance(sentence.trim());
      if (selectedVoice.current) utterance.voice = selectedVoice.current;
      utterance.rate = 0.95;
      utterance.pitch = 1.05;

      // Fire onTTSStart only on the first sentence
      if (i === 0) {
        utterance.onstart = () => {
          started = true;
          setIsSpeaking(true);
          onTTSStart?.();
        };
      }

      // Fire onTTSEnd only on the last sentence
      if (i === sentences.length - 1) {
        utterance.onend = () => {
          setIsSpeaking(false);
          onTTSEnd?.();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          onTTSEnd?.();
        };
      }

      speechSynthesis.speak(utterance);
    });
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
