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
  const { messages, sendMessage, isStreaming, currentEmotion, connected } = useChat();
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

  // Auto-speak Nova's response when streaming ends
  const prevStreaming = useRef(isStreaming);
  useEffect(() => {
    if (prevStreaming.current && !isStreaming && lastAssistantMsg.current) {
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
      </div>

      {!chatOpen && (
        <button className="chat-toggle" onClick={() => setChatOpen(true)}>
          💬 Chat
        </button>
      )}

      <ChatPanel
        messages={messages}
        isStreaming={isStreaming}
        onSend={sendMessage}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      <StatusBar connected={connected} emotion={displayEmotion} />
    </div>
  );
}
