// IndexedDB helper for caching TTS audio blobs & user recordings for offline cleanroom usage

const DB_NAME = 'fse_cleanroom_offline_db';
const DB_VERSION = 1;
const AUDIO_STORE = 'cached_audio_blobs';
const RECORDING_STORE = 'user_speech_recordings';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject('IndexedDB is not supported');
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(RECORDING_STORE)) {
        db.createObjectStore(RECORDING_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioBlobOffline(key: string, blob: Blob, title: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_STORE);
    store.put({
      key,
      blob,
      title,
      timestamp: Date.now()
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("IndexedDB save audio error:", e);
  }
}

export async function getAudioBlobOffline(key: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(AUDIO_STORE, 'readonly');
    const store = tx.objectStore(AUDIO_STORE);
    const request = store.get(key);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result ? request.result.blob : null);
      };
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn("IndexedDB get audio error:", e);
    return null;
  }
}

export async function saveUserRecordingOffline(sentence: string, blob: Blob, score: number): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(RECORDING_STORE, 'readwrite');
    const store = tx.objectStore(RECORDING_STORE);
    const id = Date.now();
    store.put({
      id,
      sentence,
      blob,
      score,
      synced: false,
      createdAt: new Date().toISOString()
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("IndexedDB save user recording error:", e);
    return Date.now();
  }
}

export async function getUserRecordingsOffline(): Promise<Array<{ id: number; sentence: string; blob: Blob; score: number; synced?: boolean; createdAt: string }>> {
  try {
    const db = await openDB();
    const tx = db.transaction(RECORDING_STORE, 'readonly');
    const store = tx.objectStore(RECORDING_STORE);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (e) {
    console.warn("IndexedDB get user recordings error:", e);
    return [];
  }
}

export async function markRecordingsAsSynced(ids: number[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(RECORDING_STORE, 'readwrite');
    const store = tx.objectStore(RECORDING_STORE);
    
    for (const id of ids) {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          store.put({
            ...getReq.result,
            synced: true,
            syncedAt: new Date().toISOString()
          });
        }
      };
    }

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    console.warn("IndexedDB markRecordingsAsSynced error:", e);
  }
}
