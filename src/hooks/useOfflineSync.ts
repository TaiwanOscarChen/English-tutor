import { useState, useEffect, useCallback } from 'react';
import { UserDiagnostics } from '../types';
import {
  getPendingOfflineSyncStats,
  syncOfflineDataToAchievements,
  PendingOfflineSyncStats,
  SyncResultSummary
} from '../utils/offlineSyncManager';
import { playSuccessChime, playClickSound } from '../utils/audioEffects';

export interface UseOfflineSyncReturn {
  isOnline: boolean;
  pendingStats: PendingOfflineSyncStats | null;
  hasPendingSync: boolean;
  isSyncing: boolean;
  syncSummary: SyncResultSummary | null;
  showPrompt: boolean;
  refreshPendingStats: () => Promise<void>;
  triggerSync: (
    diagnostics: UserDiagnostics,
    onUpdateDiagnostics: (nextDiag: UserDiagnostics) => void,
    setStreakCount?: React.Dispatch<React.SetStateAction<number>>
  ) => Promise<SyncResultSummary | null>;
  dismissPrompt: () => void;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  const [pendingStats, setPendingStats] = useState<PendingOfflineSyncStats | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSummary, setSyncSummary] = useState<SyncResultSummary | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const refreshPendingStats = useCallback(async () => {
    try {
      const stats = await getPendingOfflineSyncStats();
      setPendingStats(stats);
      if (stats.totalPending === 0) {
        setIsDismissed(false);
      }
    } catch (e) {
      console.warn("Failed to check pending offline sync stats:", e);
    }
  }, []);

  // 監聽連線恢復與斷線事件
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setIsDismissed(false);
      refreshPendingStats();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleProgressUpdated = () => {
      refreshPendingStats();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('fse-offline-progress-updated', handleProgressUpdated);

    // 初次載入檢查
    refreshPendingStats();

    // 定期探測檢查 (每 20 秒確認是否有新的離線暫存資料)
    const timer = setInterval(() => {
      if (navigator.onLine) {
        refreshPendingStats();
      }
    }, 20000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('fse-offline-progress-updated', handleProgressUpdated);
      clearInterval(timer);
    };
  }, [refreshPendingStats]);

  const hasPendingSync = Boolean(isOnline && pendingStats && pendingStats.totalPending > 0);
  const showPrompt = Boolean(hasPendingSync && !isDismissed);

  const triggerSync = useCallback(
    async (
      diagnostics: UserDiagnostics,
      onUpdateDiagnostics: (nextDiag: UserDiagnostics) => void,
      setStreakCount?: React.Dispatch<React.SetStateAction<number>>
    ): Promise<SyncResultSummary | null> => {
      if (!isOnline || isSyncing) return null;

      setIsSyncing(true);
      playClickSound();

      try {
        const result = await syncOfflineDataToAchievements(
          diagnostics,
          onUpdateDiagnostics,
          setStreakCount
        );

        setSyncSummary(result);
        playSuccessChime();

        // 重新整理統計
        await refreshPendingStats();

        // 5秒後自動隱藏成功提示
        setTimeout(() => {
          setSyncSummary(null);
        }, 5000);

        return result;
      } catch (err) {
        console.error("Offline sync failed:", err);
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    [isOnline, isSyncing, refreshPendingStats]
  );

  const dismissPrompt = useCallback(() => {
    playClickSound();
    setIsDismissed(true);
  }, []);

  return {
    isOnline,
    pendingStats,
    hasPendingSync,
    isSyncing,
    syncSummary,
    showPrompt,
    refreshPendingStats,
    triggerSync,
    dismissPrompt
  };
}
