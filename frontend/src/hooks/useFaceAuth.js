import { useState, useRef, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';
const MATCH_THRESHOLD = 0.5;
const STORAGE_KEY_DESCRIPTORS = 'nova_face_descriptors';
const STORAGE_KEY_ENABLED = 'nova_face_enabled';

export default function useFaceAuth() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const isEnrolled = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY_ENABLED) === 'true'
      && localStorage.getItem(STORAGE_KEY_DESCRIPTORS) !== null;
  }, []);

  const loadModels = useCallback(async () => {
    if (modelsLoaded || loadingRef.current) return true;
    loadingRef.current = true;
    setLoading(true);
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
      return true;
    } catch (err) {
      console.error('[useFaceAuth] model load failed:', err);
      return false;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [modelsLoaded]);

  const detectFace = useCallback(async (videoEl) => {
    // Ensure video is actually producing frames
    if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) {
      console.warn('[useFaceAuth] video not ready:', {
        readyState: videoEl?.readyState,
        videoWidth: videoEl?.videoWidth,
        videoHeight: videoEl?.videoHeight,
      });
      return null;
    }

    // Timeout to prevent hanging on mobile Safari
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Detection timed out')), 10000)
    );

    try {
      const detection = await Promise.race([
        faceapi
          .detectSingleFace(videoEl, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
          .withFaceLandmarks()
          .withFaceDescriptor(),
        timeout,
      ]);
      return detection || null;
    } catch (err) {
      console.error('[useFaceAuth] detectFace error:', err);
      return null;
    }
  }, []);

  const matchDescriptor = useCallback((liveDescriptor) => {
    const stored = localStorage.getItem(STORAGE_KEY_DESCRIPTORS);
    if (!stored) return false;
    const descriptors = JSON.parse(stored);
    for (const arr of descriptors) {
      const dist = faceapi.euclideanDistance(liveDescriptor, arr);
      if (dist < MATCH_THRESHOLD) return true;
    }
    return false;
  }, []);

  const verifyFace = useCallback(async (videoEl) => {
    const detection = await detectFace(videoEl);
    if (!detection) return { success: false, error: 'No face detected' };
    const matched = matchDescriptor(detection.descriptor);
    return { success: matched, error: matched ? null : 'Face did not match' };
  }, [detectFace, matchDescriptor]);

  const captureDescriptor = useCallback(async (videoEl) => {
    const detection = await detectFace(videoEl);
    if (!detection) return { descriptor: null, error: 'No face detected — try better lighting' };
    if (detection.detection.score < 0.4) {
      return { descriptor: null, error: 'Low confidence — move closer or improve lighting' };
    }
    return { descriptor: Array.from(detection.descriptor), error: null };
  }, [detectFace]);

  const saveEnrollment = useCallback((descriptors) => {
    localStorage.setItem(STORAGE_KEY_DESCRIPTORS, JSON.stringify(descriptors));
    localStorage.setItem(STORAGE_KEY_ENABLED, 'true');
  }, []);

  const clearEnrollment = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_DESCRIPTORS);
    localStorage.setItem(STORAGE_KEY_ENABLED, 'false');
  }, []);

  const checkCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }, []);

  // Stable reference — prevents useEffect re-triggers in consumers
  const api = useRef({});
  api.current.isEnrolled = isEnrolled;
  api.current.loadModels = loadModels;
  api.current.modelsLoaded = modelsLoaded;
  api.current.loading = loading;
  api.current.verifyFace = verifyFace;
  api.current.captureDescriptor = captureDescriptor;
  api.current.saveEnrollment = saveEnrollment;
  api.current.clearEnrollment = clearEnrollment;
  api.current.checkCamera = checkCamera;

  return api.current;
}
