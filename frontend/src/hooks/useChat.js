import { useState, useCallback, useEffect, useRef } from 'react';

// Strip emotion JSON tag from end of message
function stripEmotionTag(text) {
  return text.replace(/\s*\{"emotion":\s*"\w+"\}\s*$/, '').trim();
}

const SESSION_KEY = 'nova_session_id';

function generateId() {
  // crypto.randomUUID() requires secure context (HTTPS), so fallback for HTTP
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch {}
  }
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export default function useChat() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [connected, setConnected] = useState(false);
  const sessionId = useRef(getSessionId());

  // Check backend health on mount
  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(() => setConnected(true))
      .catch(() => setConnected(false));
  }, []);

  // Load history on mount
  useEffect(() => {
    fetch(`/api/history/${sessionId.current}`)
      .then(r => r.json())
      .then(history => {
        if (history.length > 0) {
          setMessages(history.map(m => ({
            role: m.role,
            content: m.content,
          })));
        }
      })
      .catch(() => {});
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isStreaming) return;

    const trimmed = text.trim();
    const userMsg = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    // Direct image command: /image <prompt> — bypasses Claude entirely
    if (trimmed.startsWith('/image ')) {
      const prompt = trimmed.slice(7).trim();
      setMessages(prev => [...prev, { role: 'assistant', content: 'Generating image...' }]);
      try {
        const imgRes = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const imgData = await imgRes.json();
        if (imgData.url) {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: `Here you go babe 😘\n\n![${prompt}](${imgData.url})` };
            return updated;
          });
        } else {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: `Image generation failed: ${imgData.error}` };
            return updated;
          });
        }
      } catch (err) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `Image generation failed: ${err.message}` };
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
      return;
    }

    // Add placeholder for assistant response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          session_id: sessionId.current,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              if (data.emotion) setCurrentEmotion(data.emotion);
              // Strip emotion tag from the accumulated message
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: stripEmotionTag(last.content),
                  };
                }
                return updated;
              });
            } else {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + data.text,
                  };
                }
                return updated;
              });
            }
          } catch {}
        }
      }

      setConnected(true);
    } catch (err) {
      console.error('Chat error:', err);
      setConnected(false);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant' && !last.content) {
          updated[updated.length - 1] = {
            ...last,
            content: 'Sorry, I couldn\'t connect. Make sure the backend is running.',
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming]);

  // Reset conversation (new session, clear messages)
  const resetChat = useCallback(() => {
    const newId = generateId();
    localStorage.setItem(SESSION_KEY, newId);
    sessionId.current = newId;
    setMessages([]);
    setCurrentEmotion('neutral');
  }, []);

  return {
    messages,
    sendMessage,
    isStreaming,
    currentEmotion,
    connected,
    sessionId: sessionId.current,
    resetChat,
  };
}
