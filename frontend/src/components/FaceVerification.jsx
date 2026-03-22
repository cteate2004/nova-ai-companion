import React, { useRef, useState, useEffect } from 'react';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY = 1500;

export default function FaceVerification({ onSuccess, onFailure, faceAuth }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState('Initializing...');
  const mountedRef = useRef(true);
  const onSuccessRef = useRef(onSuccess);
  const onFailureRef = useRef(onFailure);
  onSuccessRef.current = onSuccess;
  onFailureRef.current = onFailure;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setMessage('Loading face recognition...');
      const loaded = await faceAuth.loadModels();
      if (cancelled) return;
      if (!loaded) {
        setStatus('failed');
        setMessage('Could not load face models');
        onFailureRef.current();
        return;
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        if (cancelled) return;
        setStatus('failed');
        setMessage('Camera access denied');
        onFailureRef.current();
        return;
      }

      setStatus('scanning');
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        if (cancelled) return;
        setAttempt(i + 1);
        setMessage(`Verifying your face... (${i + 1}/${MAX_ATTEMPTS})`);

        const result = await faceAuth.verifyFace(videoRef.current);
        if (cancelled) return;

        if (result.success) {
          setStatus('success');
          setMessage('Welcome back!');
          setTimeout(() => { if (mountedRef.current) onSuccessRef.current(); }, 800);
          return;
        }

        if (i < MAX_ATTEMPTS - 1) {
          setMessage('Try again...');
          await new Promise(r => setTimeout(r, RETRY_DELAY));
        }
      }

      if (!cancelled) {
        setStatus('failed');
        setMessage('Face verification failed');
        setTimeout(() => { if (mountedRef.current) onFailureRef.current(); }, 1500);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [faceAuth]); // eslint-disable-line react-hooks/exhaustive-deps

  const ringClass = status === 'success' ? 'face-ring success' : status === 'failed' ? 'face-ring failed' : 'face-ring scanning';

  return (
    <div className="face-verify-overlay">
      <div className="face-verify-content">
        <div className="face-pin-check">✓ PIN verified</div>

        <div className="face-viewfinder-wrap">
          <div className={ringClass}>
            <video
              ref={videoRef}
              className="face-video"
              autoPlay
              playsInline
              muted
            />
          </div>
        </div>

        <p className="face-status">{message}</p>

        <div className="face-dots">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
            <span
              key={i}
              className={`face-dot ${i < attempt ? (status === 'success' ? 'success' : status === 'failed' && i === attempt - 1 ? 'failed' : 'done') : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
