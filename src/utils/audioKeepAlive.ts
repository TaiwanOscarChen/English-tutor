/**
 * Audio Keep-Alive & In-Car Bluetooth / MediaSession Controller
 * Prevents mobile browsers and in-car Bluetooth connections from sleeping or suspending SpeechSynthesis.
 */

import { getSharedAudioContext, ensureSharedAudioContextRunning } from './audioEffects';

let keepAliveOsc: OscillatorNode | null = null;
let keepAliveGain: GainNode | null = null;
let keepAliveBoundCtx: AudioContext | null = null;
let silentAudioEl: HTMLAudioElement | null = null;

// 1-second silent WAV base64 encoded audio track
const SILENT_WAV_BASE64 = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

/**
 * Starts a silent Web Audio & AudioElement keep-alive channel to keep mobile OS audio pipeline active
 * Reuses the app's single shared AudioContext so long sessions never hit iOS/Safari hardware AudioContext limits.
 */
export function startAudioKeepAlive(): void {
  if (typeof window === 'undefined') return;

  // 1. HTML5 Audio Element Loop (Primary for iOS Safari / Android Chrome lock-screen media state)
  try {
    if (!silentAudioEl) {
      silentAudioEl = new Audio(SILENT_WAV_BASE64);
      silentAudioEl.loop = true;
      (silentAudioEl as any).playsInline = true;
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

  // 2. Web Audio API Oscillator on Shared Context (Secondary for browser audio hardware lock)
  try {
    const sharedCtx = getSharedAudioContext();
    if (!sharedCtx) return;

    if (sharedCtx.state === 'suspended' || (sharedCtx.state as string) === 'interrupted') {
      ensureSharedAudioContextRunning(600).catch(() => {});
    }

    // 若共享 AudioContext 已因系統重置而重建，先清理舊的 oscillator 參照
    if (keepAliveOsc && keepAliveBoundCtx !== sharedCtx) {
      try {
        keepAliveOsc.stop();
        keepAliveOsc.disconnect();
      } catch {}
      try {
        keepAliveGain?.disconnect();
      } catch {}
      keepAliveOsc = null;
      keepAliveGain = null;
      keepAliveBoundCtx = null;
    }

    if (!keepAliveOsc) {
      keepAliveOsc = sharedCtx.createOscillator();
      keepAliveGain = sharedCtx.createGain();
      keepAliveBoundCtx = sharedCtx;

      // Ultra-low frequency 30Hz sine wave at near-zero gain (0.0001)
      keepAliveOsc.type = 'sine';
      keepAliveOsc.frequency.setValueAtTime(30, sharedCtx.currentTime);
      keepAliveGain.gain.setValueAtTime(0.0001, sharedCtx.currentTime);

      keepAliveOsc.connect(keepAliveGain);
      keepAliveGain.connect(sharedCtx.destination);

      keepAliveOsc.start();
    }
  } catch (err) {
    console.warn("Audio Keep-Alive oscillator initialization notice:", err);
  }
}

/**
 * Stops the silent keep-alive channel without suspending the shared AudioContext used by TTS/SFX
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
    keepAliveBoundCtx = null;
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
