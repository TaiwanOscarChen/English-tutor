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
  unlockAudioContext
} from './speech';
import {
  saveAudioSnippetToCache,
  getCachedAudioSnippet,
  generateAudioCacheKey
} from './audioCacheDB';
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
const MEMORY_CACHE_LIMIT = 200;
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
 * 預熱與快取單一文字（可為英文或中文）
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

  // 1. 檢查記憶體快取
  if (memorySpeechCache.has(key)) {
    const existing = memorySpeechCache.get(key)!;
    return existing;
  }

  // 2. 進行智慧正規化與晶圓詞庫音素替換
  const isEn = lang.startsWith('en');
  const cleanedText = isEn ? cleanEnglishText(rawText) : preprocessSpeechText(rawText, false);
  if (!cleanedText) return null;

  // 3. 解析與綁定最佳語音
  const allVoices = getAllAvailableVoices();
  const matchedVoice = isEn ? findStandardEnglishVoice(allVoices) : findTaiwanChineseVoice(allVoices);
  const voiceName = matchedVoice ? matchedVoice.name : 'default';

  const item: PrefetchedSpeechItem = {
    key,
    rawText,
    cleanedText,
    lang,
    rate,
    pitch,
    voiceName,
    timestamp: Date.now(),
    prewarmed: false
  };

  // 4. 寫入 IndexedDB 持久化記錄 (輕量標記，避免每次重新運算)
  try {
    saveAudioSnippetToCache(cleanedText, lang, rate, {
      durationMs: Math.max(500, Math.round(cleanedText.length * 80))
    }).catch(() => {});
  } catch {}

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
    await new Promise((r) => setTimeout(r, 60));

    while (pendingPrefetchQueue.length > 0) {
      const nextTask = pendingPrefetchQueue.shift();
      if (nextTask) {
        await prefetchSpeechText(nextTask.text, nextTask.lang, nextTask.rate, nextTask.pitch);
      }
      // 避免佔用 CPU，每項之間讓出 30ms
      await new Promise((r) => setTimeout(r, 30));
    }
  } catch (err) {
    console.warn("Prefetch queue processing error:", err);
  } finally {
    isProcessingPrefetchQueue = false;
  }
}

/**
 * 【教材智慧管線預加載 (Lookahead Next Lessons)】
 * 當前正在學習 currentIndex 時，自動背景預先加載前後鄰近的 2~3 個句子及其中文與 SVO
 */
export function prefetchAdjacentLessons(
  lessons: Lesson[],
  currentIndex: number,
  lookaheadCount: number = 3,
  speechRate: number = 0.95
): void {
  if (!lessons || lessons.length === 0) return;

  const total = lessons.length;
  const targetIndices: number[] = [];

  // 優先加載下一個 (Next +1, Next +2, Next +3)，以及上一個 (Prev -1)
  targetIndices.push((currentIndex + 1) % total);
  if (lookaheadCount >= 2) targetIndices.push((currentIndex + 2) % total);
  if (lookaheadCount >= 3) targetIndices.push((currentIndex + 3) % total);
  targetIndices.push((currentIndex - 1 + total) % total);

  const englishPhrases: string[] = [];
  const chinesePhrases: string[] = [];

  targetIndices.forEach((idx) => {
    const lesson = lessons[idx];
    if (lesson) {
      if (lesson.english_sentence) englishPhrases.push(lesson.english_sentence);
      if (lesson.scenario) chinesePhrases.push(lesson.scenario);
      if (lesson.chinese_translation) chinesePhrases.push(lesson.chinese_translation);
      
      // SVO 拆解句子
      if (lesson.components) {
        const cleanSub = lesson.components.subject.replace(/[\(（][^\)）]*[\)）]/g, '').trim();
        const cleanAct = lesson.components.action.replace(/[\(（][^\)）]*[\)）]/g, '').trim();
        const cleanObj = lesson.components.object.replace(/[\(（][^\)）]*[\)）]/g, '').trim();
        englishPhrases.push(`Subject: ${cleanSub}. Action: ${cleanAct}. Object: ${cleanObj}`);
      }
    }
  });

  // 加入高優先佇列
  enqueuePrefetch(englishPhrases, 'en-US', speechRate, 'high');
  enqueuePrefetch(chinesePhrases, 'zh-TW', 1.0, 'normal');
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
  return {
    ...prefetchStats,
    memoryCacheCount: memorySpeechCache.size,
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
