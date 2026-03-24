import { useState, useCallback, useEffect, useRef } from 'react';

// Strip emotion JSON tag from end of message
function stripEmotionTag(text) {
  return text.replace(/\s*\{"emotion":\s*"\w+"\}\s*$/, '').trim();
}

const SESSION_KEY = 'nova_session_id';
const LOCATION_KEY = 'nova_user_location';

// Get user's location via browser geolocation + reverse geocoding (cached)
async function getUserLocation() {
  const cached = sessionStorage.getItem(LOCATION_KEY);
  if (cached) return cached;

  try {
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
    );
    const { latitude, longitude } = pos.coords;
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`,
      { headers: { 'User-Agent': 'Nova-App' } }
    );
    if (resp.ok) {
      const data = await resp.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.county || '';
      const state = addr.state || '';
      const location = [city, state].filter(Boolean).join(', ');
      if (location) {
        sessionStorage.setItem(LOCATION_KEY, location);
        return location;
      }
    }
  } catch {}
  return '';
}

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export default function useChat(authToken) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [connected, setConnected] = useState(false);
  const sessionId = useRef(getSessionId());

  // Check backend health on mount
  useEffect(() => {
    fetch('/api/health', {
      headers: { 'Authorization': `Bearer ${authToken}` },
    })
      .then(r => r.json())
      .then(() => setConnected(true))
      .catch(() => setConnected(false));
  }, []);

  // Load history on mount
  useEffect(() => {
    fetch(`/api/history/${sessionId.current}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    })
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

  const sendMessage = useCallback(async (text, imageFile) => {
    if ((!text || !text.trim()) && !imageFile) return;
    if (isStreaming) return;

    const userText = text ? text.trim() : '';
    const userMsg = {
      role: 'user',
      content: userText || 'What do you see in this photo?',
      image: imageFile ? URL.createObjectURL(imageFile) : null,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    // Add placeholder for assistant response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      // Use FormData if image is attached, otherwise JSON
      let response;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localTime = new Date().toLocaleString('en-US', { timeZone: timezone });
      const location = await getUserLocation();

      if (imageFile) {
        const formData = new FormData();
        formData.append('session_id', sessionId.current);
        if (userText) formData.append('message', userText);
        formData.append('image', imageFile);
        formData.append('timezone', timezone);
        formData.append('local_time', localTime);
        if (location) formData.append('location', location);
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: formData,
        });
      } else {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            message: userText,
            session_id: sessionId.current,
            timezone,
            local_time: localTime,
            location,
          }),
        });
      }

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

  return {
    messages,
    sendMessage,
    isStreaming,
    currentEmotion,
    connected,
    sessionId: sessionId.current,
  };
}
