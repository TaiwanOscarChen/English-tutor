/**
 * Client-Side Real-Time Server Cloud Sync Engine
 * 負責將晶圓工程師的學習筆記、進度、成就、連續天數與設定自動上傳並與伺服器資料庫進行雙向合併
 */

import { AOI_HANDWRITTEN_VOCAB, AOI_HANDWRITTEN_LESSONS } from '../data/aoiHandwrittenData';
import { loadSrsMap, saveSrsMap } from './srsScheduler';
import {
  loadPronunciationAnalytics,
  savePronunciationAnalytics,
  mergePronunciationAnalytics
} from './pronunciationAnalytics';
import { getStoredGlobalSpeechSpeed, saveGlobalSpeechSpeed } from './speechSpeedCalibrator';

export interface ServerSyncResult {
  success: boolean;
  serverTimestamp: number;
  revision: number;
  mergedChangesCount: number;
  error?: string;
}

export interface ServerDatabaseStats {
  databaseVersion: number;
  totalUserProfiles: number;
  totalSyncJournals: number;
  totalCustomLessons: number;
  dbFileSizeBytes: number;
  lastFlushedAt: string;
  backupsAvailableCount: number;
  status: 'healthy' | 'degraded';
}

let syncDebounceTimer: any = null;
let isSyncInProgress = false;

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) {
      return (Array.isArray(parsed) ? parsed : fallback) as T;
    }
    if (fallback && typeof fallback === 'object') {
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback) as T;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

function safeSetStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Guard against QuotaExceededError or restricted storage
  }
}

/**
 * 取得當前客戶端所有欲同步的本機學習數據
 */
export function collectLocalSyncPayload() {
  if (typeof window === 'undefined') return null;

  try {
    const bookmarks = safeParseJson<any[]>(localStorage.getItem('fse_bookmarks'), []);
    const visitedLessonIds = safeParseJson<string[]>(localStorage.getItem('fse_visited_lessons'), []);
    const readArticleIds = safeParseJson<string[]>(localStorage.getItem('fse_read_articles'), []);
    const bookmarkedArticleIds = safeParseJson<string[]>(localStorage.getItem('fse_bookmarked_articles'), []);
    const diagnostics = safeParseJson<Record<string, any>>(localStorage.getItem('fse_user_diagnostics'), {});
    const rawStreak = localStorage.getItem('fse_streak');
    const streakCount = rawStreak ? Math.max(1, parseInt(rawStreak, 10) || 1) : 1;
    const shiftSettings = safeParseJson<Record<string, any>>(localStorage.getItem('fse_shift_settings'), {});
    const lessonNotes = safeParseJson<Record<string, string>>(localStorage.getItem('fab_fse_lesson_notes'), {});
    const vocabNotes = safeParseJson<Record<string, string>>(localStorage.getItem('fab_fse_vocab_notes'), {});
    const flashcardMastered = safeParseJson<string[]>(localStorage.getItem('fab_flashcard_mastered'), []);
    const importedVocab = safeParseJson<any[]>(localStorage.getItem('fse_imported_vocab'), []);
    const importedLessons = safeParseJson<any[]>(localStorage.getItem('fse_imported_lessons'), []);
    const srsMemory = loadSrsMap();
    const shadowingScores = safeParseJson<Record<string, number>>(localStorage.getItem('fse_shadowing_scores_v1'), {});
    const pronunciationAnalytics = loadPronunciationAnalytics();
    const noteTimestamps = safeParseJson<Record<string, number>>(localStorage.getItem('fse_note_timestamps_v1'), {});
    const speechSpeed = getStoredGlobalSpeechSpeed(0.85);
    const speechSpeedUpdatedAt = Number(localStorage.getItem('fse_speech_speed_updated_at')) || 0;

    return {
      userId: 'fse_engineer_local',
      bookmarks,
      visitedLessonIds,
      readArticleIds,
      bookmarkedArticleIds,
      diagnostics,
      streakCount,
      shiftSettings,
      lessonNotes,
      vocabNotes,
      noteTimestamps,
      flashcardMastered,
      importedVocab,
      importedLessons,
      srsMemory,
      shadowingScores,
      pronunciationAnalytics,
      speechSpeed,
      speechSpeedUpdatedAt,
      clientTimestamp: Date.now()
    };
  } catch (err) {
    console.warn('[ServerSync] Error collecting local payload:', err);
    return null;
  }
}

/**
 * 超時彈性 Fetch 函式：以 AbortController 設置 7.5 秒超時，杜絕無塵室弱網或後端卡死造成前端掛起
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 7500): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 主動推播本地資料至伺服器端資料庫 (Push & Merge)
 */
export async function pushLocalProgressToServer(): Promise<ServerSyncResult> {
  if (isSyncInProgress) {
    return { success: false, serverTimestamp: Date.now(), revision: 0, mergedChangesCount: 0, error: 'Sync in progress' };
  }

  const payload = collectLocalSyncPayload();
  if (!payload) {
    return { success: false, serverTimestamp: Date.now(), revision: 0, mergedChangesCount: 0, error: 'No payload' };
  }

  isSyncInProgress = true;

  try {
    const response = await fetchWithTimeout('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 8000);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // If server merged back additional remote records, safely write to LocalStorage
    if (data.record) {
      if (Array.isArray(data.record.bookmarks)) {
        safeSetStorage('fse_bookmarks', JSON.stringify(data.record.bookmarks));
      }
      if (Array.isArray(data.record.visitedLessonIds)) {
        safeSetStorage('fse_visited_lessons', JSON.stringify(data.record.visitedLessonIds));
      }
      if (Array.isArray(data.record.readArticleIds)) {
        safeSetStorage('fse_read_articles', JSON.stringify(data.record.readArticleIds));
      }
      if (Array.isArray(data.record.bookmarkedArticleIds)) {
        safeSetStorage('fse_bookmarked_articles', JSON.stringify(data.record.bookmarkedArticleIds));
      }
      if (data.record.diagnostics && typeof data.record.diagnostics === 'object') {
        safeSetStorage('fse_user_diagnostics', JSON.stringify(data.record.diagnostics));
      }
      if (data.record.lessonNotes && typeof data.record.lessonNotes === 'object') {
        safeSetStorage('fab_fse_lesson_notes', JSON.stringify(data.record.lessonNotes));
      }
      if (data.record.vocabNotes && typeof data.record.vocabNotes === 'object') {
        safeSetStorage('fab_fse_vocab_notes', JSON.stringify(data.record.vocabNotes));
      }
      if (Array.isArray(data.record.flashcardMastered)) {
        safeSetStorage('fab_flashcard_mastered', JSON.stringify(data.record.flashcardMastered));
      }
      if (Array.isArray(data.record.importedVocab) && data.record.importedVocab.length > 0) {
        const customVocab = data.record.importedVocab.filter(
          (v: any) =>
            !String(v?.id || '').startsWith('aoi-') &&
            !AOI_HANDWRITTEN_VOCAB.some((a) => a.word.toLowerCase() === String(v?.word || '').toLowerCase())
        );
        safeSetStorage('fse_imported_vocab', JSON.stringify([...AOI_HANDWRITTEN_VOCAB, ...customVocab]));
      }
      if (Array.isArray(data.record.importedLessons) && data.record.importedLessons.length > 0) {
        const customLessons = data.record.importedLessons.filter(
          (l: any) =>
            !String(l?.id || '').startsWith('aoi-') &&
            !AOI_HANDWRITTEN_LESSONS.some((a) => a.english_sentence === l?.english_sentence)
        );
        safeSetStorage('fse_imported_lessons', JSON.stringify([...AOI_HANDWRITTEN_LESSONS, ...customLessons]));
      }
      if (data.record.srsMemory && typeof data.record.srsMemory === 'object' && !Array.isArray(data.record.srsMemory)) {
        const currentLocalSrs = loadSrsMap();
        const mergedSrs = { ...currentLocalSrs };
        let hasNewerRemote = false;
        for (const [lessonId, remoteEntry] of Object.entries<any>(data.record.srsMemory)) {
          if (!remoteEntry || typeof remoteEntry !== 'object') continue;
          const localEntry = mergedSrs[lessonId];
          if (!localEntry || (Number(remoteEntry.lastReviewedAt) || 0) > (Number(localEntry.lastReviewedAt) || 0)) {
            mergedSrs[lessonId] = remoteEntry;
            hasNewerRemote = true;
          }
        }
        if (hasNewerRemote || Object.keys(currentLocalSrs).length === 0) {
          saveSrsMap(mergedSrs);
        }
      }
      if (data.record.shadowingScores && typeof data.record.shadowingScores === 'object' && !Array.isArray(data.record.shadowingScores)) {
        const localShadowing = safeParseJson<Record<string, number>>(localStorage.getItem('fse_shadowing_scores_v1'), {});
        const mergedShadowing: Record<string, number> = { ...localShadowing };
        for (const [scenarioId, rawScore] of Object.entries<any>(data.record.shadowingScores)) {
          const val = Number(rawScore);
          if (Number.isFinite(val)) {
            mergedShadowing[scenarioId] = Math.max(mergedShadowing[scenarioId] ?? 0, Math.min(100, Math.max(0, Math.round(val))));
          }
        }
        safeSetStorage('fse_shadowing_scores_v1', JSON.stringify(mergedShadowing));
      }
      if (data.record.noteTimestamps && typeof data.record.noteTimestamps === 'object') {
        safeSetStorage('fse_note_timestamps_v1', JSON.stringify(data.record.noteTimestamps));
      }
      if (data.record.pronunciationAnalytics && typeof data.record.pronunciationAnalytics === 'object') {
        const mergedAnalytics = mergePronunciationAnalytics(
          loadPronunciationAnalytics(),
          data.record.pronunciationAnalytics
        );
        savePronunciationAnalytics(mergedAnalytics);
      }
      if (
        typeof data.record.speechSpeed === 'number' &&
        Number.isFinite(data.record.speechSpeed) &&
        (Number(data.record.speechSpeedUpdatedAt) || 0) > (payload.speechSpeedUpdatedAt || 0)
      ) {
        saveGlobalSpeechSpeed(data.record.speechSpeed);
        safeSetStorage('fse_speech_speed_updated_at', String(data.record.speechSpeedUpdatedAt));
      }
      if (data.record.streakCount && data.record.streakCount > payload.streakCount) {
        safeSetStorage('fse_streak', data.record.streakCount.toString());
      }
      safeSetStorage('fse_last_server_sync_timestamp', Date.now().toString());
      safeSetStorage('fse_server_sync_revision', (data.revision || 1).toString());
    }

    // Dispatch global event for UI components to hydrate any newly merged remote records
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fse-server-synced', {
        detail: {
          timestamp: data.serverTimestamp || Date.now(),
          revision: data.revision || 1,
          mergedChanges: data.mergedChangesCount || 0,
          record: data.record || null
        }
      }));
    }

    return {
      success: true,
      serverTimestamp: data.serverTimestamp,
      revision: data.revision,
      mergedChangesCount: data.mergedChangesCount
    };
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError';
    return {
      success: false,
      serverTimestamp: Date.now(),
      revision: 0,
      mergedChangesCount: 0,
      error: isAbort ? 'Sync timed out (Cleanroom offline protection)' : (err?.message || 'Network error during server sync')
    };
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * 防抖自動同步 (每次進度變更後 3 秒自動背景推播同步到伺服器)
 */
export function queueAutoServerSync(delayMs = 3000): void {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }
  syncDebounceTimer = setTimeout(() => {
    pushLocalProgressToServer().catch(() => {});
  }, delayMs);
}

/**
 * 查詢伺服器資料庫即時狀態
 */
export async function fetchServerDatabaseStatus(): Promise<ServerDatabaseStats | null> {
  try {
    const res = await fetchWithTimeout('/api/sync/status', {}, 5000);
    if (!res.ok) return null;
    const json = await res.json();
    return json.database || null;
  } catch {
    return null;
  }
}

/**
 * 手動觸發伺服器快照備份
 */
export async function triggerServerDatabaseSnapshot(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout('/api/sync/snapshot', { method: 'POST' }, 8000);
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

// Auto-bind network reconnection and visibility sync listeners in browser environment
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    queueAutoServerSync(800);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      queueAutoServerSync(1500);
    }
  });
}
