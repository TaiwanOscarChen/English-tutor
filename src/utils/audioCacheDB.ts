/**
 * IndexedDB Audio Cache System for Cleanroom DriveMode
 * 提供本地二進位/音訊合成快取與離線高可靠朗讀支援
 */

const DB_NAME = 'CleanroomDriveAudioCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'audio_snippets';

export interface CachedAudioSnippet {
  id: string; // 唯一快取鍵 (如: text_lang_rate)
  text: string;
  lang: string;
  rate: number;
  audioBlob?: Blob; // 二進位音訊資料 (若有音訊流)
  base64Audio?: string;
  timestamp: number;
  hitCount: number;
  durationMs?: number;
}

let dbInstance: IDBDatabase | null = null;
let isOpening = false;
const openWaiters: Array<(db: IDBDatabase | null) => void> = [];

/**
 * 取得或初始化 IndexedDB 資料庫連線
 */
export function getAudioCacheDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve) => {
    if (isOpening) {
      openWaiters.push(resolve);
      return;
    }

    isOpening = true;

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('lang', 'lang', { unique: false });
        }
      };

      request.onsuccess = (event: Event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        isOpening = false;
        resolve(dbInstance);
        openWaiters.forEach((cb) => cb(dbInstance));
        openWaiters.length = 0;
      };

      request.onerror = (event: Event) => {
        console.warn("IndexedDB open error:", (event.target as IDBOpenDBRequest).error);
        isOpening = false;
        resolve(null);
        openWaiters.forEach((cb) => cb(null));
        openWaiters.length = 0;
      };
    } catch (e) {
      console.warn("IndexedDB initialization exception:", e);
      isOpening = false;
      resolve(null);
    }
  });
}

/**
 * 產生一致性音訊指紋鍵值 (Cache Key)
 * 統一以標準母語原音鍵值儲存，由前端透過 preservesPitch=true 進行無損變速，讓單一快取支援所有語速 (0.7x ~ 1.2x)
 */
export function generateAudioCacheKey(text: string, lang: string, _rate: number = 1.0): string {
  const normText = text.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${lang}__v6_studio_clean__${normText}`;
}

/**
 * 從 IndexedDB 讀取已快取的音訊片段
 */
export async function getCachedAudioSnippet(
  text: string,
  lang: string,
  rate: number
): Promise<CachedAudioSnippet | null> {
  const db = await getAudioCacheDB();
  if (!db) return null;

  const primaryKey = generateAudioCacheKey(text, lang, rate);

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(primaryKey);

      request.onsuccess = () => {
        const result = request.result as CachedAudioSnippet | undefined;
        if (result && result.audioBlob && result.audioBlob.size > 64) {
          updateHitCount(primaryKey);
          resolve(result);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * 將音訊片段存入 IndexedDB 快取（保留既有 audioBlob，避免無 Blob 寫入覆蓋實體音檔）
 */
export async function saveAudioSnippetToCache(
  text: string,
  lang: string,
  rate: number,
  data?: { audioBlob?: Blob; base64Audio?: string; durationMs?: number }
): Promise<boolean> {
  const db = await getAudioCacheDB();
  if (!db) return false;

  const key = generateAudioCacheKey(text, lang, rate);

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(key);

      getReq.onsuccess = () => {
        const existing = getReq.result as CachedAudioSnippet | undefined;
        const mergedBlob = data?.audioBlob ?? existing?.audioBlob;
        const mergedBase64 = data?.base64Audio ?? existing?.base64Audio;

        // 若既無新音訊 Blob 也無舊音訊 Blob，不寫入空殼紀錄
        if (!mergedBlob && !mergedBase64) {
          resolve(false);
          return;
        }

        const snippet: CachedAudioSnippet = {
          id: key,
          text,
          lang,
          rate,
          audioBlob: mergedBlob,
          base64Audio: mergedBase64,
          durationMs: data?.durationMs ?? existing?.durationMs,
          timestamp: Date.now(),
          hitCount: (existing?.hitCount || 0) + 1
        };

        const putReq = store.put(snippet);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => resolve(false);
      };

      getReq.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * 更新快取項目的命中次數與最新存取時間
 */
async function updateHitCount(key: string): Promise<void> {
  const db = await getAudioCacheDB();
  if (!db) return;

  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(key);

    getReq.onsuccess = () => {
      const item = getReq.result as CachedAudioSnippet;
      if (item) {
        item.hitCount = (item.hitCount || 0) + 1;
        item.timestamp = Date.now();
        store.put(item);
      }
    };
  } catch {}
}

/**
 * 取得快取統計資訊 (總數量、可播放音訊片段清單與磁碟占用概況)
 */
export async function getAudioCacheStats(): Promise<{
  count: number;
  playableBlobCount: number;
  totalEstimatedBytes: number;
  cachedIds: string[];
}> {
  const db = await getAudioCacheDB();
  if (!db) return { count: 0, playableBlobCount: 0, totalEstimatedBytes: 0, cachedIds: [] };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const cursorReq = store.openCursor();
      let count = 0;
      let playableBlobCount = 0;
      let totalEstimatedBytes = 0;
      const cachedIds: string[] = [];

      cursorReq.onsuccess = (event: Event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          count++;
          const val = cursor.value as CachedAudioSnippet | undefined;
          if (val?.audioBlob && val.audioBlob.size > 64) {
            playableBlobCount++;
            totalEstimatedBytes += val.audioBlob.size;
            if (val.id) cachedIds.push(val.id);
          } else {
            totalEstimatedBytes += 256;
          }
          cursor.continue();
        } else {
          resolve({ count, playableBlobCount, totalEstimatedBytes, cachedIds });
        }
      };

      cursorReq.onerror = () => {
        resolve({ count: 0, playableBlobCount: 0, totalEstimatedBytes: 0, cachedIds: [] });
      };
    } catch {
      resolve({ count: 0, playableBlobCount: 0, totalEstimatedBytes: 0, cachedIds: [] });
    }
  });
}

/**
 * 智慧空間清理：移除最久未存取且命中率最低的指定比例音檔，釋放手機空間同時保留常用無塵室音訊
 */
export async function pruneOldestAudioCache(fractionToFree: number = 0.3): Promise<{
  deletedCount: number;
  freedBytes: number;
}> {
  const db = await getAudioCacheDB();
  if (!db) return { deletedCount: 0, freedBytes: 0 };

  const clampedFraction = Math.min(0.8, Math.max(0.1, fractionToFree));

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const entries: Array<{ id: string; timestamp: number; hitCount: number; size: number }> = [];
      const cursorReq = store.openCursor();

      cursorReq.onsuccess = (event: Event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const val = cursor.value as CachedAudioSnippet | undefined;
          if (val?.id) {
            entries.push({
              id: val.id,
              timestamp: Number(val.timestamp) || 0,
              hitCount: Number(val.hitCount) || 0,
              size: val.audioBlob?.size || 256,
            });
          }
          cursor.continue();
        } else {
          if (entries.length === 0) {
            resolve({ deletedCount: 0, freedBytes: 0 });
            return;
          }
          // Sort oldest & lowest hitCount first
          entries.sort((a, b) => {
            if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
            return a.hitCount - b.hitCount;
          });
          const toRemoveCount = Math.max(1, Math.floor(entries.length * clampedFraction));
          const targets = entries.slice(0, toRemoveCount);
          let freedBytes = 0;
          for (const target of targets) {
            store.delete(target.id);
            freedBytes += target.size;
          }
          tx.oncomplete = () => resolve({ deletedCount: targets.length, freedBytes });
          tx.onerror = () => resolve({ deletedCount: 0, freedBytes: 0 });
        }
      };

      cursorReq.onerror = () => resolve({ deletedCount: 0, freedBytes: 0 });
    } catch {
      resolve({ deletedCount: 0, freedBytes: 0 });
    }
  });
}

/**
 * 清空所有已快取的音訊資料
 */
export async function clearAllAudioCache(): Promise<boolean> {
  const db = await getAudioCacheDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
