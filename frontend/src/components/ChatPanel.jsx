import React, { useState, useRef, useEffect } from 'react';

/**
 * Render message content with support for:
 * - Markdown images: ![alt](url) → clickable image that opens in browser
 * - Markdown links: [text](url) → clickable link
 * - Plain URLs → clickable link
 */
function renderContent(text) {
  if (!text) return null;

  const parts = [];
  const regex = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]*)\]\(([^)]+)\)|(https?:\/\/[^\s)]+)/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined || match[2]) {
      parts.push({ type: 'image', alt: match[1], url: match[2] });
    } else if (match[3] !== undefined || match[4]) {
      parts.push({ type: 'link', text: match[3], url: match[4] });
    } else if (match[5]) {
      parts.push({ type: 'link', text: 'View Link', url: match[5] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
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

// Strip URLs/markdown/emojis for TTS
function stripForTTS(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s)]+/g, '')
    .replace(/\{"emotion":\s*"\w+"\}\s*$/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Speak text — tries server TTS (Edge TTS / Aria), falls back to browser TTS
async function speakText(text) {
  const clean = stripForTTS(text);
  if (!clean) return;

  // Try server-side TTS first (natural Aria voice)
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
  const voices = speechSynthesis.getVoices();
  const preferred = ['Samantha', 'Karen', 'Moira', 'Tessa', 'Aria', 'Jenny', 'Zira', 'Hazel'];
  let voice = null;
  for (const name of preferred) {
    voice = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
    if (voice) break;
  }
  if (!voice) {
    const english = voices.filter(v => v.lang.startsWith('en'));
    voice = english.find(v => /female/i.test(v.name)) || english[1] || english[0] || null;
  }

  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  sentences.forEach(function(sentence) {
    var utterance = new SpeechSynthesisUtterance(sentence.trim());
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    speechSynthesis.speak(utterance);
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
            {msg.content ? (
              <>
                {renderContent(msg.content)}
                {msg.role === 'assistant' && msg.content && (
                  <button
                    className="chat-speak-btn"
                    onClick={() => speakText(msg.content)}
                    title="Tap to hear Nova say this"
                  >
                    🔊
                  </button>
                )}
              </>
            ) : (
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
