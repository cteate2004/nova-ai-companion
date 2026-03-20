import React, { useState, useCallback, useRef, useEffect } from 'react';
import Avatar from './components/Avatar';
import ChatPanel from './components/ChatPanel';
import VoiceControl from './components/VoiceControl';
import StatusBar from './components/StatusBar';
import ParticleBackground from './components/ParticleBackground';
import useChat from './hooks/useChat';
import useAvatar from './hooks/useAvatar';
import useVoice from './hooks/useVoice';

export default function App() {
  const [chatOpen, setChatOpen] = useState(false);
  const [modes, setModes] = useState([]);
  const [currentMode, setCurrentMode] = useState('girlfriend');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const { messages, sendMessage, isStreaming, currentEmotion, connected, resetChat } = useChat();

  // Fetch available modes on mount
  useEffect(() => {
    fetch('/api/modes').then(r => r.json()).then(setModes).catch(() => {});
    fetch('/api/mode').then(r => r.json()).then(d => setCurrentMode(d.mode)).catch(() => {});
  }, []);

  const handleModeChange = useCallback((e) => {
    const mode = e.target.value;
    setCurrentMode(mode);
    resetChat();
    fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    }).catch(() => {});
  }, [resetChat]);
  const { displayEmotion, isBlinking, mouthOpen, startTalking, stopTalking, setDisplayEmotion } = useAvatar(currentEmotion);
  const lastAssistantMsg = useRef('');

  // Track the latest assistant message for TTS
  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === 'assistant' && last.content) {
        lastAssistantMsg.current = last.content;
      }
    }
  }, [messages]);

  const handleTranscript = useCallback((text) => {
    voice.unlockSpeech?.();
    sendMessage(text);
  }, [sendMessage]);

  const handleTTSStart = useCallback(() => {
    startTalking();
  }, [startTalking]);

  const handleTTSEnd = useCallback(() => {
    stopTalking();
  }, [stopTalking]);

  const voice = useVoice({
    onTranscript: handleTranscript,
    onTTSStart: handleTTSStart,
    onTTSEnd: handleTTSEnd,
  });

  // Set avatar to listening when mic is active
  useEffect(() => {
    if (voice.isListening) {
      setDisplayEmotion('listening');
    }
  }, [voice.isListening, setDisplayEmotion]);

  // Auto-speak Nova's response when streaming ends + flag new message
  const prevStreaming = useRef(isStreaming);
  useEffect(() => {
    if (prevStreaming.current && !isStreaming && lastAssistantMsg.current) {
      setHasNewMessage(true);
      voice.speak(lastAssistantMsg.current);
    }
    prevStreaming.current = isStreaming;
  }, [isStreaming, voice.speak]);

  const handleMicToggle = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      if (voice.isSpeaking) voice.stopSpeaking();
      voice.startListening();
    }
  }, [voice]);

  return (
    <div className="app">
      <ParticleBackground />

      <div className="app-main">
        <Avatar
          emotion={displayEmotion}
          isBlinking={isBlinking}
          mouthOpen={mouthOpen}
        />

        <VoiceControl
          isListening={voice.isListening}
          supported={voice.supported}
          onToggle={handleMicToggle}
        />

        {lastAssistantMsg.current && (
          <button
            className={`play-latest-btn ${hasNewMessage ? 'play-latest-btn--new' : ''}`}
            onClick={async () => {
              const text = lastAssistantMsg.current;
              if (!text) return;
              setHasNewMessage(false);
              const clean = text
                .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
                .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
                .replace(/https?:\/\/[^\s)]+/g, '')
                .replace(/\{"emotion":\s*"\w+"\}\s*$/g, '')
                .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
                .replace(/\s{2,}/g, ' ')
                .trim();
              if (!clean) return;
              // Try server TTS first
              try {
                const res = await fetch('/api/tts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text: clean }),
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.audio_url) {
                    const audio = new Audio(data.audio_url);
                    audio.play();
                    return;
                  }
                }
              } catch {}
              // Fallback to browser TTS
              speechSynthesis.cancel();
              const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
              sentences.forEach(s => {
                const u = new SpeechSynthesisUtterance(s.trim());
                u.rate = 0.95;
                u.pitch = 1.05;
                speechSynthesis.speak(u);
              });
            }}
            title="Play Nova's last message"
          >
            🔊
          </button>
        )}
      </div>

      <div className="top-controls">
        {modes.length > 0 && (
          <select
            className="mode-switcher"
            value={currentMode}
            onChange={handleModeChange}
          >
            {modes.map(m => (
              <option key={m.key} value={m.key}>{m.name}</option>
            ))}
          </select>
        )}
        {!chatOpen && (
          <button className="chat-toggle-inline" onClick={() => setChatOpen(true)}>
            Chat
          </button>
        )}
      </div>

      <ChatPanel
        messages={messages}
        isStreaming={isStreaming}
        onSend={(text) => { voice.unlockSpeech?.(); sendMessage(text); }}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      <StatusBar connected={connected} emotion={displayEmotion} />
    </div>
  );
}
