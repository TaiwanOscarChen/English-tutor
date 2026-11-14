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
 */
export function generateAudioCacheKey(text: string, lang: string, rate: number): string {
  const normText = text.trim().toLowerCase().replace(/\s+/g, ' ');
  const normRate = Math.round(rate * 100) / 100;
  return `${lang}__${normRate}__${normText}`;
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

  const key = generateAudioCacheKey(text, lang, rate);

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CachedAudioSnippet | undefined;
        if (result) {
          // 異步遞增命中次數
          updateHitCount(key);
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
 * 將音訊片段存入 IndexedDB 快取
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
  const snippet: CachedAudioSnippet = {
    id: key,
    text,
    lang,
    rate,
    audioBlob: data?.audioBlob,
    base64Audio: data?.base64Audio,
    durationMs: data?.durationMs,
    timestamp: Date.now(),
    hitCount: 1
  };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(snippet);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
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
 * 取得快取統計資訊 (總數量與磁碟占用概況)
 */
export async function getAudioCacheStats(): Promise<{ count: number; totalEstimatedBytes: number }> {
  const db = await getAudioCacheDB();
  if (!db) return { count: 0, totalEstimatedBytes: 0 };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const countReq = store.count();

      countReq.onsuccess = () => {
        const count = countReq.result || 0;
        resolve({ count, totalEstimatedBytes: count * 1024 });
      };

      countReq.onerror = () => {
        resolve({ count: 0, totalEstimatedBytes: 0 });
      };
    } catch {
      resolve({ count: 0, totalEstimatedBytes: 0 });
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
