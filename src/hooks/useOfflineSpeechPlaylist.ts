import { useState, useEffect } from 'react';
import {
  globalOfflineSpeechPlaylist,
  OfflinePlaylistState,
  OfflinePlaylistConfig
} from '../utils/offlineSpeechPlaylist';

export function useOfflineSpeechPlaylist() {
  const [state, setState] = useState<OfflinePlaylistState>(() =>
    globalOfflineSpeechPlaylist.getState()
  );

  useEffect(() => {
    const unsubscribe = globalOfflineSpeechPlaylist.subscribe((next) => {
      setState(next);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...state,
    start: (index?: number, category?: OfflinePlaylistConfig['category']) =>
      globalOfflineSpeechPlaylist.start(index, category),
    pause: () => globalOfflineSpeechPlaylist.pause(),
    resume: () => globalOfflineSpeechPlaylist.resume(),
    togglePlayPause: () => globalOfflineSpeechPlaylist.togglePlayPause(),
    next: () => globalOfflineSpeechPlaylist.next(),
    prev: () => globalOfflineSpeechPlaylist.prev(),
    stop: () => globalOfflineSpeechPlaylist.stop(),
    updateConfig: (partial: Partial<OfflinePlaylistConfig>) =>
      globalOfflineSpeechPlaylist.updateConfig(partial),
    setReviewedVocabIds: (ids: string[]) =>
      globalOfflineSpeechPlaylist.setReviewedVocabIds(ids)
  };
}
