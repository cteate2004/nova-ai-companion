import React, { useState, useRef, useEffect } from 'react';

/**
 * Render message content with support for:
 * - Markdown images: ![alt](url) → clickable image that opens in browser
 * - Markdown links: [text](url) → clickable link
 * - Plain URLs → clickable link
 */
function renderContent(text) {
  if (!text) return null;

  // Split on markdown images, links, and bare URLs
  const parts = [];
  let remaining = text;

  // Pattern: ![alt](url) or [text](url) or bare https:// URLs
  const regex = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]*)\]\(([^)]+)\)|(https?:\/\/[^\s)]+)/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(remaining)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: remaining.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined || match[2]) {
      // Markdown image: ![alt](url)
      parts.push({ type: 'image', alt: match[1], url: match[2] });
    } else if (match[3] !== undefined || match[4]) {
      // Markdown link: [text](url)
      parts.push({ type: 'link', text: match[3], url: match[4] });
    } else if (match[5]) {
      // Bare URL
      parts.push({ type: 'link', text: 'View Link', url: match[5] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < remaining.length) {
    parts.push({ type: 'text', content: remaining.slice(lastIndex) });
  }

  if (parts.length === 0) return text;

  return parts.map((part, i) => {
    if (part.type === 'text') {
      return <span key={i}>{part.content}</span>;
    }
    if (part.type === 'image') {
      return (
        <span key={i} className="chat-image-container">
          <img
            src={part.url}
            alt={part.alt || 'Generated image'}
            className="chat-image"
            referrerPolicy="no-referrer"
            onClick={() => window.open(part.url, '_blank', 'noreferrer')}
          />
        </span>
      );
    }
    if (part.type === 'link') {
      return (
        <a key={i} href={part.url} target="_blank" rel="noopener noreferrer" className="chat-link">
          {part.text}
        </a>
      );
    }
    return null;
  });
}

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
            {msg.content ? renderContent(msg.content) : (
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
