/**
 * Client-Side Real-Time Server Cloud Sync Engine
 * 負責將晶圓工程師的學習筆記、進度、成就、連續天數與設定自動上傳並與伺服器資料庫進行雙向合併
 */

import { AOI_HANDWRITTEN_VOCAB, AOI_HANDWRITTEN_LESSONS } from '../data/aoiHandwrittenData';

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

/**
 * 取得當前客戶端所有欲同步的本機學習數據
 */
export function collectLocalSyncPayload() {
  if (typeof window === 'undefined') return null;

  try {
    const rawBookmarks = localStorage.getItem('fse_bookmarks');
    const bookmarks = rawBookmarks ? JSON.parse(rawBookmarks) : [];

    const rawVisited = localStorage.getItem('fse_visited_lessons');
    const visitedLessonIds = rawVisited ? JSON.parse(rawVisited) : [];

    const rawReadArticles = localStorage.getItem('fse_read_articles');
    const readArticleIds = rawReadArticles ? JSON.parse(rawReadArticles) : [];

    const rawBookmarkedArticles = localStorage.getItem('fse_bookmarked_articles');
    const bookmarkedArticleIds = rawBookmarkedArticles ? JSON.parse(rawBookmarkedArticles) : [];

    const rawDiag = localStorage.getItem('fse_user_diagnostics');
    const diagnostics = rawDiag ? JSON.parse(rawDiag) : {};

    const rawStreak = localStorage.getItem('fse_streak');
    const streakCount = rawStreak ? parseInt(rawStreak, 10) || 1 : 1;

    const rawShift = localStorage.getItem('fse_shift_settings');
    const shiftSettings = rawShift ? JSON.parse(rawShift) : {};

    const rawLessonNotes = localStorage.getItem('fab_fse_lesson_notes');
    const lessonNotes = rawLessonNotes ? JSON.parse(rawLessonNotes) : {};

    const rawVocabNotes = localStorage.getItem('fab_fse_vocab_notes');
    const vocabNotes = rawVocabNotes ? JSON.parse(rawVocabNotes) : {};

    const rawFlashcardMastered = localStorage.getItem('fab_flashcard_mastered');
    const flashcardMastered = rawFlashcardMastered ? JSON.parse(rawFlashcardMastered) : [];

    const rawImportedVocab = localStorage.getItem('fse_imported_vocab');
    const importedVocab = rawImportedVocab ? JSON.parse(rawImportedVocab) : [];

    const rawImportedLessons = localStorage.getItem('fse_imported_lessons');
    const importedLessons = rawImportedLessons ? JSON.parse(rawImportedLessons) : [];

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
      flashcardMastered,
      importedVocab,
      importedLessons,
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
      if (data.record.bookmarks && Array.isArray(data.record.bookmarks)) {
        localStorage.setItem('fse_bookmarks', JSON.stringify(data.record.bookmarks));
      }
      if (data.record.visitedLessonIds && Array.isArray(data.record.visitedLessonIds)) {
        localStorage.setItem('fse_visited_lessons', JSON.stringify(data.record.visitedLessonIds));
      }
      if (data.record.readArticleIds && Array.isArray(data.record.readArticleIds)) {
        localStorage.setItem('fse_read_articles', JSON.stringify(data.record.readArticleIds));
      }
      if (data.record.bookmarkedArticleIds && Array.isArray(data.record.bookmarkedArticleIds)) {
        localStorage.setItem('fse_bookmarked_articles', JSON.stringify(data.record.bookmarkedArticleIds));
      }
      if (data.record.lessonNotes && typeof data.record.lessonNotes === 'object') {
        localStorage.setItem('fab_fse_lesson_notes', JSON.stringify(data.record.lessonNotes));
      }
      if (data.record.vocabNotes && typeof data.record.vocabNotes === 'object') {
        localStorage.setItem('fab_fse_vocab_notes', JSON.stringify(data.record.vocabNotes));
      }
      if (data.record.flashcardMastered && Array.isArray(data.record.flashcardMastered)) {
        localStorage.setItem('fab_flashcard_mastered', JSON.stringify(data.record.flashcardMastered));
      }
      if (data.record.importedVocab && Array.isArray(data.record.importedVocab) && data.record.importedVocab.length > 0) {
        const customVocab = data.record.importedVocab.filter(
          (v: any) =>
            !String(v?.id || '').startsWith('aoi-') &&
            !AOI_HANDWRITTEN_VOCAB.some((a) => a.word.toLowerCase() === String(v?.word || '').toLowerCase())
        );
        localStorage.setItem('fse_imported_vocab', JSON.stringify([...AOI_HANDWRITTEN_VOCAB, ...customVocab]));
      }
      if (data.record.importedLessons && Array.isArray(data.record.importedLessons) && data.record.importedLessons.length > 0) {
        const customLessons = data.record.importedLessons.filter(
          (l: any) =>
            !String(l?.id || '').startsWith('aoi-') &&
            !AOI_HANDWRITTEN_LESSONS.some((a) => a.english_sentence === l?.english_sentence)
        );
        localStorage.setItem('fse_imported_lessons', JSON.stringify([...AOI_HANDWRITTEN_LESSONS, ...customLessons]));
      }
      if (data.record.streakCount && data.record.streakCount > payload.streakCount) {
        localStorage.setItem('fse_streak', data.record.streakCount.toString());
      }
      localStorage.setItem('fse_last_server_sync_timestamp', Date.now().toString());
      localStorage.setItem('fse_server_sync_revision', (data.revision || 1).toString());
    }

    // Dispatch global event for UI components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fse-server-synced', {
        detail: {
          timestamp: data.serverTimestamp || Date.now(),
          revision: data.revision || 1,
          mergedChanges: data.mergedChangesCount || 0
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
