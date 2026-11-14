import { useState, useEffect, useCallback } from 'react';
import { playLaserScanSound, playWaferSnapSound } from '../utils/audioEffects';
import { globalOfflineSpeechPlaylist } from '../utils/offlineSpeechPlaylist';

const STORAGE_KEY_REVIEWED_VOCAB = 'fse_offline_reviewed_vocab_ids';
const STORAGE_KEY_SIMULATED_OFFLINE = 'fse_simulated_offline_mode';

export interface OfflineStatusState {
  isOffline: boolean;
  isSimulatedOffline: boolean;
  showOfflinePrompt: boolean;
  reviewedVocabIds: string[];
  offlineLastDetectedAt: number | null;
  toggleSimulatedOffline: () => void;
  openOfflineFlashcards: () => void;
  closeOfflineFlashcards: () => void;
  dismissOfflinePrompt: () => void;
  triggerOfflinePromptManually: () => void;
  toggleVocabReviewed: (id: string) => void;
  isFlashcardsModalOpen: boolean;
}

export function useOfflineStatus(): OfflineStatusState {
  const [isBrowserOffline, setIsBrowserOffline] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });

  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_SIMULATED_OFFLINE) === 'true';
    }
    return false;
  });

  const [showOfflinePrompt, setShowOfflinePrompt] = useState<boolean>(false);
  const [isFlashcardsModalOpen, setIsFlashcardsModalOpen] = useState<boolean>(false);
  const [offlineLastDetectedAt, setOfflineLastDetectedAt] = useState<number | null>(null);

  const [reviewedVocabIds, setReviewedVocabIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_REVIEWED_VOCAB);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const isOffline = isBrowserOffline || isSimulatedOffline;

  // Listen to browser network changes
  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOffline(false);
    };

    const handleOffline = () => {
      setIsBrowserOffline(true);
      setShowOfflinePrompt(true);
      setOfflineLastDetectedAt(Date.now());
      playLaserScanSound();
      globalOfflineSpeechPlaylist.handleOfflineDetected();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setShowOfflinePrompt(true);
      setOfflineLastDetectedAt(Date.now());
      globalOfflineSpeechPlaylist.handleOfflineDetected();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save reviewed vocabs to localStorage
  const toggleVocabReviewed = useCallback((id: string) => {
    setReviewedVocabIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY_REVIEWED_VOCAB, JSON.stringify(next));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fse-offline-progress-updated'));
        }
      } catch (e) {}
      return next;
    });
  }, []);

  const toggleSimulatedOffline = useCallback(() => {
    setIsSimulatedOffline((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_SIMULATED_OFFLINE, next ? 'true' : 'false');
      } catch (e) {}
      if (next) {
        setShowOfflinePrompt(true);
        setOfflineLastDetectedAt(Date.now());
        playLaserScanSound();
        globalOfflineSpeechPlaylist.handleOfflineDetected();
      } else {
        playWaferSnapSound();
      }
      return next;
    });
  }, []);

  const openOfflineFlashcards = useCallback(() => {
    setIsFlashcardsModalOpen(true);
    setShowOfflinePrompt(false);
  }, []);

  const closeOfflineFlashcards = useCallback(() => {
    setIsFlashcardsModalOpen(false);
  }, []);

  const dismissOfflinePrompt = useCallback(() => {
    setShowOfflinePrompt(false);
    setIsSimulatedOffline(false);
    try {
      localStorage.removeItem(STORAGE_KEY_SIMULATED_OFFLINE);
    } catch {}
  }, []);

  const triggerOfflinePromptManually = useCallback(() => {
    setShowOfflinePrompt(true);
    setOfflineLastDetectedAt(Date.now());
    playLaserScanSound();
  }, []);

  return {
    isOffline,
    isSimulatedOffline,
    showOfflinePrompt,
    reviewedVocabIds,
    offlineLastDetectedAt,
    toggleSimulatedOffline,
    openOfflineFlashcards,
    closeOfflineFlashcards,
    dismissOfflinePrompt,
    triggerOfflinePromptManually,
    toggleVocabReviewed,
    isFlashcardsModalOpen
  };
}
