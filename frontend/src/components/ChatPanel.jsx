import React, { useState, useRef, useEffect } from 'react';

export default function ChatPanel({ messages, isStreaming, onSend, isOpen, onClose }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSend(input);
    setInput('');
  }

  return (
    <div className={`chat-panel ${isOpen ? 'open' : ''}`}>
      <div className="chat-panel-header">
        <h2>Chat with Nova</h2>
        <button className="chat-panel-close" onClick={onClose}>&times;</button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: 40 }}>
            Say something to Nova...
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.content || (
              <span className="chat-streaming">
                <span className="streaming-dots">
                  <span></span><span></span><span></span>
                </span>
              </span>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSubmit}>
        <input
          className="chat-input"
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isStreaming}
        />
        <button className="chat-send-btn" type="submit" disabled={isStreaming || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
