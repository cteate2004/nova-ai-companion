import React, { useRef, useState, useEffect } from 'react';

const PROMPTS = [
  'Look straight ahead',
  'Turn slightly left',
  'Turn slightly right',
  'Tilt head slightly up',
  'Tilt head slightly down',
];

export default function FaceEnrollment({ faceAuth, onComplete, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [step, setStep] = useState(-1); // -1 = loading, 0-4 = capture steps, 5 = done
  const [descriptors, setDescriptors] = useState([]);
  const [error, setError] = useState('');
  const [capturing, setCapturing] = useState(false);

  // Start camera and load models
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const loaded = await faceAuth.loadModels();
      if (cancelled) return;
      if (!loaded) {
        setError('Could not load face recognition models');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        // setStep(0) triggers render which mounts the <video> element.
        // We assign srcObject in a separate effect below.
        setStep(0);
      } catch {
        if (!cancelled) setError('Camera access denied');
      }
    }

    init();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [faceAuth]);

  // Assign stream to video element once it's mounted (step >= 0)
  useEffect(() => {
    if (step >= 0 && videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [step]);

  const handleCapture = async () => {
    if (capturing || !videoRef.current) return;
    setCapturing(true);
    setError('');

    const result = await faceAuth.captureDescriptor(videoRef.current);
    if (result.error) {
      setError(result.error);
      setCapturing(false);
      return;
    }

    const updated = [...descriptors, result.descriptor];
    setDescriptors(updated);
    setCapturing(false);

    if (updated.length >= PROMPTS.length) {
      // All captures done — save
      faceAuth.saveEnrollment(updated);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      setStep(PROMPTS.length);
    } else {
      setStep(updated.length);
    }
  };

  const handleDone = () => {
    onComplete();
  };

  // Done state
  if (step === PROMPTS.length) {
    return (
      <div className="face-enroll-overlay">
        <div className="face-enroll-card">
          <div className="face-enroll-title">Face ID Ready</div>
          <div style={{ fontSize: 48, margin: '12px 0' }}>✓</div>
          <p className="face-enroll-instruction">
            Your face has been enrolled successfully. Face verification will now be required when you log in.
          </p>
          <button className="face-enroll-btn" onClick={handleDone}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="face-enroll-overlay">
      <div className="face-enroll-card">
        <div className="face-enroll-title">Set Up Face ID</div>

        {step < 0 ? (
          <p className="face-enroll-instruction">Initializing camera...</p>
        ) : (
          <>
            <p className="face-enroll-instruction">{PROMPTS[step]}</p>

            <div className="face-enroll-viewfinder">
              <video ref={videoRef} autoPlay playsInline muted />
            </div>

            <div className="face-enroll-progress">{step + 1} / {PROMPTS.length}</div>

            <p className="face-enroll-error">{error}</p>

            <button
              className="face-enroll-btn"
              onClick={handleCapture}
              disabled={capturing}
            >
              {capturing ? 'Capturing...' : 'Capture'}
            </button>
          </>
        )}

        <button className="face-enroll-btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
