import { Lesson } from '../types';
import {
  cleanEnglishText,
  preprocessSpeechText,
  globalAudioScheduler,
  findStandardEnglishVoice,
  findTaiwanChineseVoice,
  cancelSpeech,
  resetSpeechEngine
} from './speech';

export type AudioPlaybackMode = 
  | 'full_flow'      // 情境引導 ➔ 慢速清晰英文 ➔ 中文含義 ➔ 台味諧音 ➔ 原速複誦
  | 'follow_repeat'  // 駕駛跟讀留白 ➔ 慢速英文 ➔ 中文 ➔ 原速 ➔ 留白 3 秒跟讀 ➔ 複誦確認
  | 'bilingual'      // 慢速英文 ➔ 中文翻譯
  | 'svo_breakdown'  // 主角 S ➔ 動作 V ➔ 東西 O ➔ 完整金句
  | 'english_repeat';// 英文連續 2 遍清晰朗讀

export interface PlaylistItem {
  lessonId: string;
  scenario: string;
  english: string;
  chinese: string;
  taiwanPhonetic: string;
  rawLesson: Lesson;
  svo: {
    subject: string;
    verb: string;
    object: string;
    bridge?: string;
  };
}

/**
 * 從課程清單建構單一對應、清晰明確的隨身聽播放清單
 */
export function buildDrivePlaylist(lessons: Lesson[]): PlaylistItem[] {
  if (!lessons || lessons.length === 0) return [];

  return lessons.map((lesson) => {
    const eng = lesson.english_sentence || '';
    const chi = lesson.chinese_translation || '';
    const pho = lesson.phonetic_taiwan || '';
    const subj = lesson.components?.subject || 'I';
    const act = lesson.components?.action || '';
    const obj = lesson.components?.object || '';
    const bri = lesson.components?.bridge || '';

    return {
      lessonId: lesson.id,
      scenario: lesson.scenario || '無塵室實戰情境',
      english: eng,
      chinese: chi,
      taiwanPhonetic: pho,
      rawLesson: lesson,
      svo: {
        subject: subj,
        verb: act,
        object: obj,
        bridge: bri,
      }
    };
  });
}

/**
 * 透過 AudioScheduler 執行排程語音播放（含語音預處理與強制 Buffer Time）
 */
export function speakAsync(
  text: string,
  lang: 'en-US' | 'zh-TW',
  speed: number = 0.85,
  isCancelled?: () => boolean,
  bufferAfterMs: number = 400
): Promise<void> {
  return globalAudioScheduler.enqueue(
    text,
    lang,
    speed,
    bufferAfterMs,
    isCancelled
  );
}

/**
 * 清空佇列並停止播放
 */
export function clearSpeechQueue(): void {
  globalAudioScheduler.clear();
}

/**
 * 可精準即時中斷的間隔停頓延遲
 */
export function sleepWithCancel(ms: number, isCancelled?: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (isCancelled && isCancelled()) {
      resolve();
      return;
    }

    const step = 20;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += step;
      if ((isCancelled && isCancelled()) || elapsed >= ms) {
        clearInterval(interval);
        resolve();
      }
    }, step);
  });
}
