import React, { useState } from 'react';
import Avatar from './components/Avatar';
import ChatPanel from './components/ChatPanel';
import StatusBar from './components/StatusBar';
import useChat from './hooks/useChat';
import useAvatar from './hooks/useAvatar';

export default function App() {
  const [chatOpen, setChatOpen] = useState(false);
  const { messages, sendMessage, isStreaming, currentEmotion, connected } = useChat();
  const { displayEmotion, isBlinking, mouthOpen } = useAvatar(currentEmotion);

  return (
    <div className="app">
      <div className="app-main">
        <Avatar
          emotion={displayEmotion}
          isBlinking={isBlinking}
          mouthOpen={mouthOpen}
        />

        {/* Mic button placeholder — wired in Group 3 */}
        <button
          className="mic-button"
          title="Voice input (coming soon)"
          style={{ opacity: 0.5, cursor: 'default' }}
        >
          🎤
        </button>
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
