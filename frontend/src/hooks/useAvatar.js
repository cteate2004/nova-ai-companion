import { useState, useEffect, useCallback, useRef } from 'react';

const BLINK_MIN = 2000;
const BLINK_MAX = 6000;
const BLINK_DURATION = 150;

export default function useAvatar(currentEmotion = 'neutral') {
  const [displayEmotion, setDisplayEmotion] = useState(currentEmotion);
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const blinkTimer = useRef(null);
  const mouthTimer = useRef(null);

  // Sync display emotion with prop
  useEffect(() => {
    setDisplayEmotion(currentEmotion);
  }, [currentEmotion]);

  // Random blink loop
  useEffect(() => {
    function scheduleBlink() {
      const delay = BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN);
      blinkTimer.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, BLINK_DURATION);
      }, delay);
    }

    scheduleBlink();
    return () => clearTimeout(blinkTimer.current);
  }, []);

  // Mouth animation for talking state
  const startTalking = useCallback(() => {
    setDisplayEmotion('talking');
    function toggle() {
      setMouthOpen(prev => !prev);
      mouthTimer.current = setTimeout(toggle, 150 + Math.random() * 100);
    }
    toggle();
  }, []);

  const stopTalking = useCallback(() => {
    clearTimeout(mouthTimer.current);
    setMouthOpen(false);
    setDisplayEmotion(currentEmotion);
  }, [currentEmotion]);

  return {
    displayEmotion,
    isBlinking,
    mouthOpen,
    startTalking,
    stopTalking,
    setDisplayEmotion,
  };
}
