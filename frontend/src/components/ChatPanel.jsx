import React, { useState, useRef, useEffect } from 'react';
import Avatar from './Avatar';

function formatMessage(content) {
  if (!content) return null;

  // Convert markdown-style links [text](url) to clickable links
  const parts = [];
  let lastIndex = 0;
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push(
      <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="chat-link">
        {match[1]} →
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export default function ChatPanel({ messages, isStreaming, onSend, emotion, onMicToggle, connected }) {
  const [input, setInput] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const userScrolledUp = useRef(false);

  // Track if user has manually scrolled up
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    function handleScroll() {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      userScrolledUp.current = distFromBottom > 80;
    }
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom on new messages — only if user hasn't scrolled up
  useEffect(() => {
    if (userScrolledUp.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'instant' : 'smooth' });
  }, [messages, isStreaming]);

  function handleSubmit(e) {
    e.preventDefault();
    if ((!input.trim() && !imageFile) || isStreaming) return;
    onSend(input, imageFile);
    setInput('');
    clearImage();
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }

  return (
    <div className="screen-container chat-screen">
      <div className="chat-header">
        <div className="chat-header-avatar">
          <Avatar emotion={emotion} size="collapsed" />
        </div>
        <div>
          <div className="chat-header-name">Nova</div>
          <div className="chat-header-status">
            <span className={`status-dot ${connected ? 'online' : ''}`} style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', marginRight: 4 }} />
            {connected ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.length === 0 && (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: 40 }}>
            Say something to Nova...
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.image && (
              <img src={msg.image} alt="Shared photo" className="chat-image" />
            )}
            {msg.content ? (msg.role === 'assistant' ? formatMessage(msg.content) : msg.content) : (
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

      {imagePreview && (
        <div className="chat-image-preview">
          <img src={imagePreview} alt="Preview" />
          <button className="chat-image-preview-remove" onClick={clearImage}>&times;</button>
        </div>
      )}

      <form className="chat-input-area" onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="chat-image-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          title="Take a photo"
        >
          {'\u{1F4F7}'}
        </button>
        <button
          type="button"
          className="chat-image-btn"
          onClick={() => galleryInputRef.current?.click()}
          disabled={isStreaming}
          title="Choose from gallery"
        >
          {'\u{1F5BC}'}
        </button>
        <input
          className="chat-input"
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isStreaming}
        />
        {onMicToggle && (
          <button
            type="button"
            className="chat-mic-btn"
            onPointerDown={onMicToggle}
            title="Voice input"
          >
            {'\u{1F3A4}'}
          </button>
        )}
        <button className="chat-send-btn" type="submit" disabled={isStreaming || (!input.trim() && !imageFile)}>
          Send
        </button>
      </form>
    </div>
  );
}
