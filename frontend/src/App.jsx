import React, { useState, useCallback, useRef, useEffect } from 'react';
import TabBar from './components/TabBar';
import HomeScreen from './components/HomeScreen';
import ChatPanel from './components/ChatPanel';
import TasksScreen from './components/TasksScreen';
import AlertsScreen from './components/AlertsScreen';
import GroceryScreen from './components/GroceryScreen';
import SettingsScreen from './components/SettingsScreen';
import MemoryScreen from './components/MemoryScreen';
import ParticleBackground from './components/ParticleBackground';
import LoginScreen from './components/LoginScreen';
import useChat from './hooks/useChat';
import useAvatar from './hooks/useAvatar';
import useVoice from './hooks/useVoice';

export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('nova_token'));
  const [authChecked, setAuthChecked] = useState(false);

  // Verify stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('nova_token');
    if (!token) { setAuthChecked(true); return; }

    fetch('/api/auth/check', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) {
          localStorage.removeItem('nova_token');
          setAuthToken(null);
        }
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  if (!authChecked) return null;
  if (!authToken) {
    return <LoginScreen onLogin={(token) => setAuthToken(token)} />;
  }

  return <NovaApp authToken={authToken} onLogout={() => { localStorage.removeItem('nova_token'); setAuthToken(null); }} />;
}

function NovaApp({ authToken, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [settingsSubScreen, setSettingsSubScreen] = useState(null);
  const { messages, sendMessage, isStreaming, currentEmotion, connected } = useChat(authToken);
  const { displayEmotion, isBlinking, mouthOpen, startTalking, stopTalking, setDisplayEmotion } = useAvatar(currentEmotion);
  const lastAssistantMsg = useRef('');
  const speakRef = useRef(null);

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
    authToken,
  });

  // Keep a stable ref to speak so the effect doesn't re-trigger
  speakRef.current = voice.speak;

  // Track the latest assistant message for TTS
  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === 'assistant' && last.content) {
        lastAssistantMsg.current = last.content;
      }
    }
  }, [messages]);

  // Set avatar to listening when mic is active
  useEffect(() => {
    if (voice.isListening) {
      setDisplayEmotion('listening');
    }
  }, [voice.isListening, setDisplayEmotion]);

  // Auto-speak Nova's response when streaming ends
  const wasStreaming = useRef(false);
  useEffect(() => {
    if (wasStreaming.current && !isStreaming && lastAssistantMsg.current) {
      console.log('[App] Streaming ended, speaking response...');
      speakRef.current?.(lastAssistantMsg.current);
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    setSettingsSubScreen(null);
  }, [activeTab]);

  const handleMicToggle = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      if (voice.isSpeaking) voice.stopSpeaking();
      voice.startListening();
    }
  }, [voice]);

  function renderScreen() {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            emotion={displayEmotion}
            isBlinking={isBlinking}
            mouthOpen={mouthOpen}
            messages={messages}
            onTabChange={setActiveTab}
            onMicToggle={handleMicToggle}
            connected={connected}
            authToken={authToken}
          />
        );
      case 'chat':
        return (
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            onSend={sendMessage}
            emotion={displayEmotion}
            onMicToggle={handleMicToggle}
            connected={connected}
          />
        );
      case 'tasks':
        return <TasksScreen authToken={authToken} />;
      case 'grocery':
        return <GroceryScreen authToken={authToken} isActive={activeTab === 'grocery'} />;
      case 'alerts':
        return <AlertsScreen authToken={authToken} />;
      case 'settings':
        if (settingsSubScreen === 'memory') {
          return <MemoryScreen authToken={authToken} onBack={() => setSettingsSubScreen(null)} />;
        }
        return <SettingsScreen authToken={authToken} onNavigate={setSettingsSubScreen} />;
      default:
        return null;
    }
  }

  return (
    <div className="app">
      <ParticleBackground />
      {renderScreen()}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
