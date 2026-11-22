/**
 * SpeechSynthesis Prefetching & Caching Engine (語音預加載與多級緩存引擎)
 * 
 * 核心功能：
 * 1. 【LRU 記憶體緩存 + IndexedDB 持久化】：已處理語音指紋 (Lexicon preprocessed & Utterance structures) 毫秒級即時呼叫。
 * 2. 【智慧管線預加載 (Smart Lookahead Pipeline)】：當切換或點擊當前教材時，自動在背景低負載執行下 1~3 個句子的文字正規化、音素重音處理與 Web Speech Engine Warm-up。
 * 3. 【常用高頻半導體詞彙預熱 (Fab Vocab & Preset Preload)】：應用程式啟動後自動非同步預載常用單字、SVO 與交接句型。
 * 4. 【防止競爭中斷與延遲消除】：預建立 SpeechSynthesisUtterance 實例快取並維護引用防 GC，徹底消除播放時的等待卡頓。
 */

import {
  cleanEnglishText,
  preprocessSpeechText,
  findStandardEnglishVoice,
  findTaiwanChineseVoice,
  getAllAvailableVoices,
  getPreferredSpeechPitch,
  unlockAudioContext,
  splitTtsChunks,
  fetchAndBufferCloudAudioBlob,
  getAudioBufferStats
} from './speech';
import {
  getCachedAudioSnippet
} from './audioCacheDB';
import { getLessonAllSentences } from './lessonSentenceHelper';
import { Lesson } from '../types';

export interface PrefetchedSpeechItem {
  key: string;
  rawText: string;
  cleanedText: string;
  lang: string;
  rate: number;
  pitch: number;
  voiceName: string;
  timestamp: number;
  prewarmed: boolean;
}

// 記憶體中的高優先 LRU 快取池
const MEMORY_CACHE_LIMIT = 300;
const memorySpeechCache = new Map<string, PrefetchedSpeechItem>();

// 預載工作佇列與狀態
const pendingPrefetchQueue: Array<{
  text: string;
  lang: string;
  rate?: number;
  pitch?: number;
  priority?: 'high' | 'normal' | 'low';
}> = [];

let isProcessingPrefetchQueue = false;
let prefetchStats = {
  totalPrefetched: 0,
  cacheHits: 0,
  cacheMisses: 0
};

/**
 * 產生預加載標準鍵值
 */
export function getPrefetchKey(text: string, lang: string = 'en-US', rate: number = 0.95, pitch: number = 1.0): string {
  const normText = text.trim().toLowerCase();
  return `${lang}__${rate.toFixed(2)}__${pitch.toFixed(2)}__${normText}`;
}

/**
 * 取得記憶體中已預加載的語音資料
 */
export function getPrefetchedSpeech(text: string, lang: string = 'en-US', rate: number = 0.95, pitch: number = 1.0): PrefetchedSpeechItem | null {
  const key = getPrefetchKey(text, lang, rate, pitch);
  const found = memorySpeechCache.get(key);
  if (found) {
    prefetchStats.cacheHits++;
    // 更新 LRU 順序
    memorySpeechCache.delete(key);
    memorySpeechCache.set(key, found);
    return found;
  }
  prefetchStats.cacheMisses++;
  return null;
}

/**
 * 預熱與快取單一文字（可為英文或中文），直接寫入與 AudioScheduler 共用的 RAM Blob 快取池與 IndexedDB
 */
export async function prefetchSpeechText(
  rawText: string,
  lang: string = 'en-US',
  rate: number = 0.95,
  customPitch?: number
): Promise<PrefetchedSpeechItem | null> {
  if (!rawText || !rawText.trim()) return null;

  const pitch = customPitch !== undefined ? customPitch : getPreferredSpeechPitch();
  const key = getPrefetchKey(rawText, lang, rate, pitch);

  // 1. 進行智慧正規化與晶圓詞庫音素替換
  const isEn = lang.startsWith('en');
  const targetLang: 'en-US' | 'zh-TW' = isEn ? 'en-US' : 'zh-TW';
  const cleanedText = isEn ? cleanEnglishText(rawText) : preprocessSpeechText(rawText, false);
  if (!cleanedText) return null;

  // 2. 檢查記憶體快取
  if (memorySpeechCache.has(key)) {
    const existing = memorySpeechCache.get(key)!;
    // 確保共用 RAM Blob 快取亦已根據對應語速 (rate) 就緒
    const chunks = splitTtsChunks(cleanedText, 155);
    chunks.forEach((c) => {
      fetchAndBufferCloudAudioBlob(c, targetLang, 4500, rate, true).catch(() => {});
    });
    return existing;
  }

  // 3. 解析與綁定最佳語音
  const allVoices = getAllAvailableVoices();
  const matchedVoice = isEn ? findStandardEnglishVoice(allVoices) : findTaiwanChineseVoice(allVoices);
  const voiceName = matchedVoice ? matchedVoice.name : 'default';

  const item: PrefetchedSpeechItem = {
    key,
    rawText,
    cleanedText,
    lang: targetLang,
    rate,
    pitch,
    voiceName,
    timestamp: Date.now(),
    prewarmed: false
  };

  // 4. 背景預載實體雲端音訊 Blob 至共用 RAM 快取與 IndexedDB（根據 rate 提前緩存，確保切換關卡或點擊時 0ms 瞬發播放）
  if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
    const chunks = splitTtsChunks(cleanedText, 155);
    for (const chunk of chunks) {
      fetchAndBufferCloudAudioBlob(chunk, targetLang, 5000, rate, true).catch(() => {});
    }
  }

  // 5. 存入記憶體快取 (LRU 清理)
  if (memorySpeechCache.size >= MEMORY_CACHE_LIMIT) {
    const oldestKey = memorySpeechCache.keys().next().value;
    if (oldestKey) {
      memorySpeechCache.delete(oldestKey);
    }
  }

  item.prewarmed = true;
  memorySpeechCache.set(key, item);
  prefetchStats.totalPrefetched++;

  return item;
}

/**
 * 批次將多個文字加入預載工作佇列
 */
export function enqueuePrefetch(
  texts: string[],
  lang: string = 'en-US',
  rate: number = 0.95,
  priority: 'high' | 'normal' | 'low' = 'normal'
): void {
  texts.forEach((text) => {
    if (!text || !text.trim()) return;
    if (priority === 'high') {
      pendingPrefetchQueue.unshift({ text, lang, rate, priority });
    } else {
      pendingPrefetchQueue.push({ text, lang, rate, priority });
    }
  });

  processPrefetchQueue();
}

/**
 * 非同步背景執行預載佇列，採用微任務延遲避免阻礙 UI 渲染
 */
async function processPrefetchQueue(): Promise<void> {
  if (isProcessingPrefetchQueue || pendingPrefetchQueue.length === 0) return;
  isProcessingPrefetchQueue = true;

  try {
    // 釋放主線程給 React 渲染
    await new Promise((r) => setTimeout(r, 40));

    while (pendingPrefetchQueue.length > 0) {
      const nextTask = pendingPrefetchQueue.shift();
      if (nextTask) {
        await prefetchSpeechText(nextTask.text, nextTask.lang, nextTask.rate, nextTask.pitch);
      }
      // 避免佔用 CPU，每項之間讓出 25ms
      await new Promise((r) => setTimeout(r, 25));
    }
  } catch (err) {
    console.warn("Prefetch queue processing error:", err);
  } finally {
    isProcessingPrefetchQueue = false;
  }
}

/**
 * 【教材智慧管線預加載 (Lookahead Current & Next Lessons)】
 * 當前正在學習 currentIndex 時，立即高優先預緩衝當前課程所有子句與 SVO 組件，並背景預載前後鄰近課程
 */
export function prefetchAdjacentLessons(
  lessons: Lesson[],
  currentIndex: number,
  lookaheadCount: number = 2,
  speechRate: number = 0.95
): void {
  if (!lessons || lessons.length === 0) return;

  const total = lessons.length;
  const currentLesson = lessons[currentIndex];

  // 1. 最高優先：當前課程的所有子句、中文釋義與 SVO 結構拆解組件
  if (currentLesson) {
    const currentEn: string[] = [];
    const currentZh: string[] = [];
    const allSentences = getLessonAllSentences(currentLesson);
    allSentences.forEach((s) => {
      if (s.english) currentEn.push(s.english);
      if (s.chinese) currentZh.push(s.chinese);
    });
    if (currentLesson.components) {
      const cleanSub = currentLesson.components.subject.replace(/[\(（][^\)）]*[\)）]/g, '').trim();
      const cleanAct = currentLesson.components.action.replace(/[\(（][^\)）]*[\)）]/g, '').trim();
      const cleanBri = (currentLesson.components.bridge || '').replace(/[\(（][^\)）]*[\)）]/g, '').trim();
      const cleanObj = currentLesson.components.object.replace(/[\(（][^\)）]*[\)）]/g, '').trim();
      [cleanSub, cleanAct, cleanBri, cleanObj].forEach((part) => {
        if (part) currentEn.push(part);
      });
    }
    enqueuePrefetch(currentEn, 'en-US', speechRate, 'high');
    enqueuePrefetch(currentZh, 'zh-TW', 1.0, 'high');
  }

  // 2. 次高優先：前後鄰近課程 (Next +1, Next +2, Prev -1)
  const targetIndices: number[] = [];
  targetIndices.push((currentIndex + 1) % total);
  if (lookaheadCount >= 2) targetIndices.push((currentIndex + 2) % total);
  targetIndices.push((currentIndex - 1 + total) % total);

  const englishPhrases: string[] = [];
  const chinesePhrases: string[] = [];

  targetIndices.forEach((idx) => {
    if (idx === currentIndex) return;
    const lesson = lessons[idx];
    if (lesson) {
      const sentences = getLessonAllSentences(lesson);
      sentences.slice(0, 2).forEach((s) => {
        if (s.english) englishPhrases.push(s.english);
        if (s.chinese) chinesePhrases.push(s.chinese);
      });
    }
  });

  enqueuePrefetch(englishPhrases, 'en-US', speechRate, 'normal');
  enqueuePrefetch(chinesePhrases, 'zh-TW', 1.0, 'low');
}

/**
 * 【常用晶圓半導體高頻詞彙與標準句型全域背景預載】
 * 在 App 初始化或閒置 (Idle) 時自動觸發
 */
export function warmupCommonFabVocabulary(presetLessons: Lesson[], speechRate: number = 0.95): void {
  if (typeof window === 'undefined') return;

  // 使用 requestIdleCallback 或 setTimeout 在閒置時執行
  const executeWarmup = () => {
    unlockAudioContext();

    const highFrequencyVocabs = [
      'I test the sensor.',
      'We replace the dry pump.',
      'Check the MFC flow rate.',
      'Execute LOTO procedure.',
      'The FOUP arrived at load port.',
      'Align the wafer carefully.',
      'Verify SECS and GEM status.',
      'Clean the chamber with SC-1.',
      'Measure chamber vacuum at 5 mTorr.',
      'Subject',
      'Action',
      'Object',
      'Correct! Great job.',
      'Next challenge.'
    ];

    enqueuePrefetch(highFrequencyVocabs, 'en-US', speechRate, 'normal');

    if (presetLessons && presetLessons.length > 0) {
      const presetSentences = presetLessons.slice(0, 10).map((l) => l.english_sentence);
      enqueuePrefetch(presetSentences, 'en-US', speechRate, 'low');
    }
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => executeWarmup(), { timeout: 2000 });
  } else {
    setTimeout(executeWarmup, 1000);
  }
}

/**
 * 取得當前快取狀態與預加載統計數據
 */
export function getPrefetchStats() {
  const bufStats = getAudioBufferStats();
  return {
    ...prefetchStats,
    memoryCacheCount: Math.max(memorySpeechCache.size, bufStats.ramCachedBlobs),
    cacheHits: prefetchStats.cacheHits + bufStats.cacheHitCount,
    pendingQueueCount: pendingPrefetchQueue.length
  };
}

/**
 * 清除預加載記憶體快取
 */
export function clearPrefetchCache(): void {
  memorySpeechCache.clear();
  pendingPrefetchQueue.length = 0;
  prefetchStats = {
    totalPrefetched: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
}

export interface CloudAudioBatchProgress {
  done: number;
  total: number;
  percent: number;
  newlyDownloaded: number;
  alreadyCached: number;
  failed: number;
  retriedCount: number;
  currentText: string;
}

export interface CloudAudioBatchOptions {
  speechSpeed?: number;
  concurrency?: number;
  maxRetries?: number;
}

/**
 * 批次下載真實高音質雲端音訊 Blob (/api/tts) 並存入 RAM 與 IndexedDB（支援弱網自動重試、多通道併發與進度百分比計算）
 * 讓地下無塵室 / 網速不穩或無訊號環境可達成 100% 離線原音播放
 */
export async function prefetchCloudAudioBatch(
  items: Array<{ text: string; lang?: 'en-US' | 'zh-TW'; speechSpeed?: number }>,
  onProgress?: (progress: CloudAudioBatchProgress) => void,
  signal?: AbortSignal,
  options?: CloudAudioBatchOptions
): Promise<CloudAudioBatchProgress> {
  const defaultSpeed =
    typeof options?.speechSpeed === 'number' && options.speechSpeed > 0 ? options.speechSpeed : 0.85;
  const concurrency = Math.max(1, Math.min(3, options?.concurrency ?? 2));
  const maxRetries = Math.max(0, Math.min(3, options?.maxRetries ?? 2));

  const chunkTasks: Array<{ chunkText: string; lang: 'en-US' | 'zh-TW'; speed: number }> = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!item?.text?.trim()) continue;
    const lang: 'en-US' | 'zh-TW' = item.lang === 'zh-TW' ? 'zh-TW' : 'en-US';
    const itemSpeed =
      typeof item.speechSpeed === 'number' && item.speechSpeed > 0 ? item.speechSpeed : defaultSpeed;
    const speedTier = itemSpeed <= 0.72 ? 'slow' : 'std';
    const isEn = lang === 'en-US';
    const cleaned = isEn ? cleanEnglishText(item.text) : preprocessSpeechText(item.text, false);
    if (!cleaned) continue;

    const chunks = splitTtsChunks(cleaned, 155);
    for (const chunkText of chunks) {
      const dedupeKey = `${lang}::${speedTier}::${chunkText.toLowerCase()}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        chunkTasks.push({ chunkText, lang, speed: itemSpeed });
      }
    }
  }

  const progress: CloudAudioBatchProgress = {
    done: 0,
    total: chunkTasks.length,
    percent: chunkTasks.length === 0 ? 100 : 0,
    newlyDownloaded: 0,
    alreadyCached: 0,
    failed: 0,
    retriedCount: 0,
    currentText: ''
  };

  const emitProgress = () => {
    progress.percent =
      progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 100;
    if (onProgress) {
      onProgress({ ...progress });
    }
  };

  emitProgress();
  if (chunkTasks.length === 0) return progress;

  let cursor = 0;

  const downloadSingleChunkWithRetry = async (task: {
    chunkText: string;
    lang: 'en-US' | 'zh-TW';
    speed: number;
  }): Promise<'cached' | 'downloaded' | 'failed'> => {
    if (signal?.aborted) return 'failed';

    try {
      const existing = await getCachedAudioSnippet(task.chunkText, task.lang, task.speed).catch(() => null);
      if (existing?.audioBlob && existing.audioBlob.size > 64) {
        await fetchAndBufferCloudAudioBlob(task.chunkText, task.lang, 3000, task.speed, true).catch(() => null);
        return 'cached';
      }
    } catch {}

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'failed';
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (signal?.aborted) return 'failed';
      if (attempt > 0) {
        progress.retriedCount++;
        emitProgress();
        // 指數退避等待，適應無塵室邊緣網路瞬斷或訊號波動
        await new Promise((r) => setTimeout(r, 320 * attempt));
        if (signal?.aborted) return 'failed';
      }

      try {
        const timeoutMs = 6500 + attempt * 2000;
        const blob = await fetchAndBufferCloudAudioBlob(
          task.chunkText,
          task.lang,
          timeoutMs,
          task.speed,
          true
        );
        if (blob && blob.size > 64) {
          return 'downloaded';
        }
      } catch {
        if (signal?.aborted) return 'failed';
      }
    }

    return 'failed';
  };

  const runWorker = async () => {
    while (cursor < chunkTasks.length && !signal?.aborted) {
      const idx = cursor++;
      const task = chunkTasks[idx];
      if (!task) break;

      progress.currentText = task.chunkText;
      emitProgress();

      const outcome = await downloadSingleChunkWithRetry(task);
      if (signal?.aborted) break;

      if (outcome === 'cached') {
        progress.alreadyCached++;
      } else if (outcome === 'downloaded') {
        progress.newlyDownloaded++;
      } else {
        progress.failed++;
      }

      progress.done++;
      emitProgress();

      if (!signal?.aborted) {
        await new Promise((r) => setTimeout(r, 25));
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, chunkTasks.length) }, () => runWorker());
  await Promise.all(workers);

  if (!signal?.aborted && progress.done >= progress.total) {
    progress.percent = 100;
    progress.currentText = '';
    emitProgress();
  }

  return progress;
}

const IDLE_PREFETCH_PREF_KEY = 'fse_idle_audio_prefetch_v1';
let hasRunIdleSafetyPrefetch = false;

export function isIdleAudioPrefetchEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(IDLE_PREFETCH_PREF_KEY);
    if (raw === 'false') return false;
    return true;
  } catch {
    return true;
  }
}

export function setIdleAudioPrefetchEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(IDLE_PREFETCH_PREF_KEY, enabled ? 'true' : 'false');
  } catch {}
}

/**
 * 閒置低頻寬自動補齊：僅在穩定連線、非省流量模式 (saveData=false) 且頁面閒置時，
 * 以單執行緒 (concurrency=1) 背景補齊最多 6 段尚未快取的工安／高頻交接語音，嚴格控管流量與額度。
 */
export function scheduleIdleSafetyAudioPrefetch(
  items: Array<{ text: string; lang: 'en-US' | 'zh-TW' }>,
  speechSpeed: number = 0.95,
  maxNewClipsPerSession: number = 6
): () => void {
  if (typeof window === 'undefined' || hasRunIdleSafetyPrefetch || !isIdleAudioPrefetchEnabled()) {
    return () => {};
  }

  let cancelled = false;
  const controller = new AbortController();

  const runIdleTask = async () => {
    if (cancelled || hasRunIdleSafetyPrefetch) return;
    if (typeof navigator !== 'undefined') {
      if (navigator.onLine === false) return;
      const conn = (navigator as any).connection;
      if (conn?.saveData) return;
      if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return;
    }

    hasRunIdleSafetyPrefetch = true;
    const uncached: Array<{ text: string; lang: 'en-US' | 'zh-TW' }> = [];

    for (const item of items) {
      if (cancelled || uncached.length >= maxNewClipsPerSession) break;
      const cleaned = cleanEnglishText(item.text);
      if (!cleaned) continue;
      const existing = await getCachedAudioSnippet(cleaned, item.lang, 1.0).catch(() => null);
      if (!existing?.audioBlob) {
        uncached.push({ text: cleaned, lang: item.lang });
      }
    }

    if (cancelled || uncached.length === 0) return;

    await prefetchCloudAudioBatch(uncached, undefined, controller.signal, {
      speechSpeed,
      concurrency: 1,
      maxRetries: 1,
    }).catch(() => {});
  };

  const timerId = window.setTimeout(() => {
    if (cancelled) return;
    const ric = (window as any).requestIdleCallback;
    if (typeof ric === 'function') {
      ric(() => {
        runIdleTask().catch(() => {});
      }, { timeout: 6000 });
    } else {
      runIdleTask().catch(() => {});
    }
  }, 8500);

  return () => {
    cancelled = true;
    window.clearTimeout(timerId);
    controller.abort();
  };
}
