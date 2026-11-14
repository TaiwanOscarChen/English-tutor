/**
 * Audio Keep-Alive & In-Car Bluetooth / MediaSession Controller
 * Prevents mobile browsers and in-car Bluetooth connections from sleeping or suspending SpeechSynthesis.
 */

let keepAliveCtx: AudioContext | null = null;
let keepAliveOsc: OscillatorNode | null = null;
let keepAliveGain: GainNode | null = null;
let silentAudioEl: HTMLAudioElement | null = null;

// 1-second silent WAV base64 encoded audio track
const SILENT_WAV_BASE64 = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

/**
 * Starts a silent Web Audio & AudioElement keep-alive channel to keep mobile OS audio pipeline active
 */
export function startAudioKeepAlive(): void {
  if (typeof window === 'undefined') return;

  // 1. HTML5 Audio Element Loop (Primary for iOS Safari / Android Chrome lock-screen media state)
  try {
    if (!silentAudioEl) {
      silentAudioEl = new Audio(SILENT_WAV_BASE64);
      silentAudioEl.loop = true;
      silentAudioEl.volume = 0.001; // nearly inaudible
    }
    if (silentAudioEl.paused) {
      silentAudioEl.play().catch(() => {
        // Autoplay may need user gesture, will be triggered on first touch
      });
    }
  } catch (err) {
    console.warn("Silent audio element init notice:", err);
  }

  // 2. Web Audio API Oscillator (Secondary for browser audio hardware lock)
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!keepAliveCtx || keepAliveCtx.state === 'closed') {
      keepAliveCtx = new AudioCtx();
    }

    if (keepAliveCtx.state === 'suspended') {
      keepAliveCtx.resume().catch(() => {});
    }

    if (!keepAliveOsc) {
      keepAliveOsc = keepAliveCtx.createOscillator();
      keepAliveGain = keepAliveCtx.createGain();

      // Ultra-low frequency 30Hz sine wave at near-zero gain (0.0001)
      keepAliveOsc.type = 'sine';
      keepAliveOsc.frequency.setValueAtTime(30, keepAliveCtx.currentTime);
      keepAliveGain.gain.setValueAtTime(0.0001, keepAliveCtx.currentTime);

      keepAliveOsc.connect(keepAliveGain);
      keepAliveGain.connect(keepAliveCtx.destination);

      keepAliveOsc.start();
    }
  } catch (err) {
    console.warn("Audio Keep-Alive oscillator initialization notice:", err);
  }
}

/**
 * Stops the silent keep-alive channel
 */
export function stopAudioKeepAlive(): void {
  try {
    if (silentAudioEl && !silentAudioEl.paused) {
      silentAudioEl.pause();
    }
  } catch (err) {}

  try {
    if (keepAliveOsc) {
      try {
        keepAliveOsc.stop();
      } catch (e) {}
      keepAliveOsc.disconnect();
      keepAliveOsc = null;
    }
    if (keepAliveGain) {
      keepAliveGain.disconnect();
      keepAliveGain = null;
    }
    if (keepAliveCtx && keepAliveCtx.state !== 'closed') {
      keepAliveCtx.suspend().catch(() => {});
    }
  } catch (err) {
    console.warn("Audio Keep-Alive stop notice:", err);
  }
}

export interface MediaSessionMetadataPayload {
  title: string;
  artist: string;
  album: string;
  artwork?: { src: string; sizes: string; type: string }[];
}

/**
 * Updates browser MediaSession API for in-car Bluetooth screens, steering wheel controls, and lock screens
 */
export function updateCarMediaSession(
  metadata: MediaSessionMetadataPayload,
  handlers: {
    onPlay?: () => void;
    onPause?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
  }
): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  try {
    const MediaMeta = (window as any).MediaMetadata || (navigator as any).mediaSession?.metadata?.constructor;
    if (MediaMeta) {
      navigator.mediaSession.metadata = new MediaMeta({
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        artwork: metadata.artwork || [
          {
            src: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=512&q=80',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      });
    }

    navigator.mediaSession.playbackState = 'playing';

    if (handlers.onPlay) {
      navigator.mediaSession.setActionHandler('play', handlers.onPlay);
    }
    if (handlers.onPause) {
      navigator.mediaSession.setActionHandler('pause', handlers.onPause);
    }
    if (handlers.onNext) {
      navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext);
    }
    if (handlers.onPrev) {
      navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrev);
    }
  } catch (err) {
    console.warn("MediaSession update notice:", err);
  }
}

/**
 * Sets MediaSession state to paused
 */
export function pauseCarMediaSession(): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = 'paused';
  } catch (err) {}
}
