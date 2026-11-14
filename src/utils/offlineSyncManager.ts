import { UserDiagnostics } from '../types';
import { getUserRecordingsOffline, markRecordingsAsSynced } from './offlineAudioCache';
import { FAB_VOCAB } from '../data/fabVocab';

export const STORAGE_KEY_REVIEWED_VOCAB = 'fse_offline_reviewed_vocab_ids';
export const STORAGE_KEY_SYNCED_VOCAB = 'fse_synced_offline_vocab_ids';
export const STORAGE_KEY_PENDING_DRILLS = 'fse_offline_pending_drills';
export const STORAGE_KEY_LAST_SYNC_TIME = 'fse_last_sync_timestamp';

export interface PendingDrillItem {
  id: string;
  type: 'svo' | 'article' | 'scenario' | 'quiz' | 'vocab_match';
  title: string;
  xp: number;
  score?: number;
  timestamp: number;
}

export interface PendingOfflineSyncStats {
  totalPending: number;
  unsyncedVocabIds: string[];
  unsyncedVocabCount: number;
  unsyncedSpeechRecordings: Array<{ id: number; sentence: string; score: number; createdAt: string }>;
  unsyncedSpeechCount: number;
  unsyncedDrills: PendingDrillItem[];
  unsyncedDrillCount: number;
  lastSyncedAt: number | null;
}

export interface SyncResultSummary {
  success: boolean;
  totalSynced: number;
  vocabCount: number;
  speechCount: number;
  drillCount: number;
  xpGained: number;
  masteredTopicsAdded: string[];
  timestamp: number;
}

/**
 * 取得本地離線未同步之學習進度統計數據
 */
export async function getPendingOfflineSyncStats(): Promise<PendingOfflineSyncStats> {
  if (typeof window === 'undefined') {
    return {
      totalPending: 0,
      unsyncedVocabIds: [],
      unsyncedVocabCount: 0,
      unsyncedSpeechRecordings: [],
      unsyncedSpeechCount: 0,
      unsyncedDrills: [],
      unsyncedDrillCount: 0,
      lastSyncedAt: null
    };
  }

  // 1. 檢查離線複習單字
  let reviewedVocabs: string[] = [];
  let syncedVocabs: string[] = [];
  try {
    const rawReviewed = localStorage.getItem(STORAGE_KEY_REVIEWED_VOCAB);
    if (rawReviewed) reviewedVocabs = JSON.parse(rawReviewed);
    const rawSynced = localStorage.getItem(STORAGE_KEY_SYNCED_VOCAB);
    if (rawSynced) syncedVocabs = JSON.parse(rawSynced);
  } catch (e) {
    console.warn("Read vocab sync storage exception:", e);
  }

  const unsyncedVocabIds = reviewedVocabs.filter((id) => !syncedVocabs.includes(id));

  // 2. 檢查 IndexedDB 離線語音口說錄音
  let unsyncedRecordings: Array<{ id: number; sentence: string; score: number; createdAt: string }> = [];
  try {
    const allRecordings = await getUserRecordingsOffline();
    unsyncedRecordings = allRecordings
      .filter((rec) => rec.synced !== true)
      .map((rec) => ({
        id: rec.id,
        sentence: rec.sentence,
        score: rec.score,
        createdAt: rec.createdAt
      }));
  } catch (e) {
    console.warn("Read offline recordings for sync error:", e);
  }

  // 3. 檢查離線練習與闖關 (Drills)
  let unsyncedDrills: PendingDrillItem[] = [];
  try {
    const rawDrills = localStorage.getItem(STORAGE_KEY_PENDING_DRILLS);
    if (rawDrills) unsyncedDrills = JSON.parse(rawDrills);
  } catch (e) {
    console.warn("Read pending drills storage exception:", e);
  }

  // 4. 取得上次同步時間
  let lastSyncedAt: number | null = null;
  const rawLastSync = localStorage.getItem(STORAGE_KEY_LAST_SYNC_TIME);
  if (rawLastSync) {
    lastSyncedAt = parseInt(rawLastSync, 10);
  }

  const totalPending = unsyncedVocabIds.length + unsyncedRecordings.length + unsyncedDrills.length;

  return {
    totalPending,
    unsyncedVocabIds,
    unsyncedVocabCount: unsyncedVocabIds.length,
    unsyncedSpeechRecordings: unsyncedRecordings,
    unsyncedSpeechCount: unsyncedRecordings.length,
    unsyncedDrills,
    unsyncedDrillCount: unsyncedDrills.length,
    lastSyncedAt
  };
}

/**
 * 記錄離線情境、闖關或測驗活動
 */
export function recordOfflineDrill(drill: Omit<PendingDrillItem, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  try {
    const rawDrills = localStorage.getItem(STORAGE_KEY_PENDING_DRILLS);
    const list: PendingDrillItem[] = rawDrills ? JSON.parse(rawDrills) : [];
    list.push({
      ...drill,
      id: `drill-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now()
    });
    localStorage.setItem(STORAGE_KEY_PENDING_DRILLS, JSON.stringify(list));
  } catch (e) {
    console.warn("Failed to record offline drill:", e);
  }
}

/**
 * 執行離線數據自動同步，將本地暫存紀錄完整累計回總成就系統與用戶學習診斷庫中
 */
export async function syncOfflineDataToAchievements(
  currentDiagnostics: UserDiagnostics,
  onUpdateDiagnostics: (nextDiag: UserDiagnostics) => void,
  setStreakCount?: React.Dispatch<React.SetStateAction<number>>
): Promise<SyncResultSummary> {
  const stats = await getPendingOfflineSyncStats();

  if (stats.totalPending === 0) {
    return {
      success: true,
      totalSynced: 0,
      vocabCount: 0,
      speechCount: 0,
      drillCount: 0,
      xpGained: 0,
      masteredTopicsAdded: [],
      timestamp: Date.now()
    };
  }

  // 1. 處理離線掌握單字 -> 轉換為成就主題 (Mastered Topics)
  const newlyMasteredTopics: string[] = [];
  const existingMastered = new Set(currentDiagnostics.masteredTopics || []);

  stats.unsyncedVocabIds.forEach((vId) => {
    const matchedVocab = FAB_VOCAB.find((v) => v.id === vId);
    if (matchedVocab) {
      const topicName = `${matchedVocab.word} (${matchedVocab.translation})`;
      if (!existingMastered.has(topicName)) {
        existingMastered.add(topicName);
        newlyMasteredTopics.push(topicName);
      }
    }
  });

  // 2. 處理口說練習加權平均與次數累積
  const speechAddCount = stats.unsyncedSpeechRecordings.length;
  let totalSpeechScores = 0;
  stats.unsyncedSpeechRecordings.forEach((rec) => {
    totalSpeechScores += rec.score;
  });

  const prevTotalPracticed = currentDiagnostics.totalSentencesPracticed || 0;
  const nextTotalPracticed = prevTotalPracticed + speechAddCount;

  let nextAvgScore = currentDiagnostics.speechScoreAverage || 88;
  if (speechAddCount > 0) {
    const currentWeight = prevTotalPracticed * (currentDiagnostics.speechScoreAverage || 88);
    nextAvgScore = Math.min(
      99,
      Math.max(70, Math.round((currentWeight + totalSpeechScores) / Math.max(1, nextTotalPracticed)))
    );
  }

  // 3. 計算獲得之經驗值 (XP)
  // 單字 +15 XP，口說 +25 XP，離線闖關依設定
  let drillXp = 0;
  stats.unsyncedDrills.forEach((d) => {
    drillXp += d.xp || 20;
  });

  const xpGained = (stats.unsyncedVocabCount * 15) + (speechAddCount * 25) + drillXp;
  const nextTotalXp = (currentDiagnostics.totalXp || 0) + xpGained;

  // 4. 更新 UserDiagnostics
  const updatedDiagnostics: UserDiagnostics = {
    ...currentDiagnostics,
    totalSentencesPracticed: nextTotalPracticed,
    speechScoreAverage: nextAvgScore,
    totalXp: nextTotalXp,
    masteredTopics: Array.from(existingMastered),
    vocabFlashCount: (currentDiagnostics.vocabFlashCount || 0) + stats.unsyncedVocabCount
  };

  onUpdateDiagnostics(updatedDiagnostics);
  try {
    localStorage.setItem('fse_user_diagnostics', JSON.stringify(updatedDiagnostics));
  } catch (e) {}

  // 5. 標記單字為已同步 (Synced)
  try {
    const rawSynced = localStorage.getItem(STORAGE_KEY_SYNCED_VOCAB);
    const syncedList: string[] = rawSynced ? JSON.parse(rawSynced) : [];
    const mergedSynced = Array.from(new Set([...syncedList, ...stats.unsyncedVocabIds]));
    localStorage.setItem(STORAGE_KEY_SYNCED_VOCAB, JSON.stringify(mergedSynced));
  } catch (e) {}

  // 6. 標記 IndexedDB 錄音為已同步
  if (stats.unsyncedSpeechRecordings.length > 0) {
    const recordingIds = stats.unsyncedSpeechRecordings.map((r) => r.id);
    await markRecordingsAsSynced(recordingIds);
  }

  // 7. 清空離線待同步 Drills
  try {
    localStorage.removeItem(STORAGE_KEY_PENDING_DRILLS);
  } catch (e) {}

  // 8. 儲存本次同步時間戳
  const now = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY_LAST_SYNC_TIME, now.toString());
  } catch (e) {}

  // 9. 更新連續天數 streak (若有離線練習)
  if (setStreakCount && stats.totalPending >= 3) {
    setStreakCount((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem('fse_streak', next.toString());
      } catch (e) {}
      return next;
    });
  }

  return {
    success: true,
    totalSynced: stats.totalPending,
    vocabCount: stats.unsyncedVocabCount,
    speechCount: stats.unsyncedSpeechCount,
    drillCount: stats.unsyncedDrillCount,
    xpGained,
    masteredTopicsAdded: newlyMasteredTopics,
    timestamp: now
  };
}
