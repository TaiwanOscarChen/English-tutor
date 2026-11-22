import { Lesson } from '../types';
import {
  cleanEnglishText,
  preprocessSpeechText,
  prepareTaiwanPhoneticForSpeech,
  extractBilingualComponent,
  globalAudioScheduler,
} from './speech';

export type AudioPlaybackMode =
  | 'full_flow'       // 英學五步精聽：慢速拆解 ➔ 核心字彙重點 ➔ 簡潔中文理解 ➔ 節奏跟讀留白 ➔ 原速美語強化
  | 'follow_repeat'   // 開口跟讀 3s 特訓：慢速示範 ➔ 中文輔助 ➔ 原速示範 ➔ 3秒跟讀 ➔ 原速確認
  | 'bilingual'       // 英➔中➔英 三明治：清晰英文 ➔ 簡潔中文釋義 ➔ 母語原速強化（結尾留在英文）
  | 'svo_breakdown'   // SVO 句構精煉：主角 ➔ 動作 ➔ 受詞 ➔ 完整金句兩遍
  | 'english_repeat'; // 純英沉浸磨耳朵：慢速清晰 ➔ 原速流暢（無中文干擾）

export interface PlaybackModeMeta {
  id: AudioPlaybackMode;
  label: string;
  shortLabel: string;
  desc: string;
  steps: string[];
}

export const DRIVE_PLAYBACK_MODES: PlaybackModeMeta[] = [
  {
    id: 'full_flow',
    label: '英文精聽五步',
    shortLabel: '英文精聽 5步',
    desc: '先聽慢速英文 ➔ 核心字詞焦點 ➔ 簡潔中文理解 ➔ 跟讀留白 ➔ 原速強化收尾（拒絕翻譯腔）',
    steps: ['慢速清晰', '關鍵字音', '中文點撥', '跟讀記憶', '原速強化'],
  },
  {
    id: 'english_repeat',
    label: '純英沉浸連播',
    shortLabel: '純英磨耳',
    desc: '零中文干擾！先慢速抓音節、再原速雙連擊，最適合開車磨耳朵與聽力內化',
    steps: ['慢速抓音', '節奏吸收', '原速強化'],
  },
  {
    id: 'bilingual',
    label: '英中英三明治',
    shortLabel: '英-中-英',
    desc: '英文先入耳 ➔ 簡短中文點出意思 ➔ 立刻補上原速英文定型，讓大腦記住英文而非翻譯',
    steps: ['清晰英文', '簡潔釋義', '原速定型'],
  },
  {
    id: 'follow_repeat',
    label: '開口跟讀 3s',
    shortLabel: '跟讀 3s',
    desc: '慢速示範 ➔ 簡潔提示 ➔ 原速示範 ➔ 3 秒開口跟讀倒數 ➔ 最終美語確認',
    steps: ['慢速示範', '重點理解', '原速預備', '開口 3s', '原速確認'],
  },
  {
    id: 'svo_breakdown',
    label: 'SVO 句構拆解',
    shortLabel: 'SVO 拆解',
    desc: '拆解「主角 S + 動作 V + 對象 O」核心英文模組，再組合成完整原速英文',
    steps: ['主角 S', '動作 V', '對象 O', '原速金句'],
  },
];

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
  cleanSvo: {
    subjectEn: string;
    subjectZh: string;
    verbEn: string;
    verbZh: string;
    objectEn: string;
    objectZh: string;
    bridgeEn: string;
    bridgeZh: string;
  };
}

/**
 * 清理情境標題（去除冗餘前置符號與括號標記，保留易懂文字）
 */
export function cleanScenarioLabel(scenario: string): string {
  if (!scenario) return '無塵室實戰情境';
  return scenario
    .replace(/^🎬\s*情境[:：]?\s*/g, '')
    .replace(/\s*[\(（][^\)）]*[\)）]/g, '')
    .trim() || '無塵室實戰情境';
}

/**
 * 抽出該句最核心的英文焦點短語（優先取「動作 V + 對象 O」，讓學習者精準聽清關鍵動詞與名詞）
 */
export function buildFocusEnglishPhrase(item: PlaylistItem): string {
  const { verbEn, bridgeEn, objectEn } = item.cleanSvo;
  const parts = [verbEn, bridgeEn, objectEn].filter(Boolean);
  if (parts.length >= 2) {
    const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (joined.length > 0 && joined.toLowerCase() !== cleanEnglishText(item.english).toLowerCase()) {
      return joined;
    }
  }
  // Fallback: pick meaningful content words (skip basic filler if > 3 words)
  const cleanFull = cleanEnglishText(item.english);
  const words = cleanFull.split(/\s+/).filter(Boolean);
  if (words.length >= 4) {
    return words.slice(-Math.min(3, words.length - 1)).join(' ');
  }
  return cleanFull;
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

    const s = extractBilingualComponent(subj);
    const v = extractBilingualComponent(act);
    const o = extractBilingualComponent(obj);
    const b = extractBilingualComponent(bri);

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
      },
      cleanSvo: {
        subjectEn: s.english,
        subjectZh: s.chinese,
        verbEn: v.english,
        verbZh: v.chinese,
        objectEn: o.english,
        objectZh: o.chinese,
        bridgeEn: b.english,
        bridgeZh: b.chinese,
      },
    };
  });
}

export function getCleanSpeechSegments(item: PlaylistItem) {
  return {
    english: cleanEnglishText(item.english),
    chinese: preprocessSpeechText(item.chinese || '', false),
    phonetic: prepareTaiwanPhoneticForSpeech(item.taiwanPhonetic || ''),
    scenarioZh: preprocessSpeechText(cleanScenarioLabel(item.scenario), false),
    focusEnglish: buildFocusEnglishPhrase(item),
  };
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
 * 可精準即時中斷的間隔停頓延遲（採用真實系統時鐘 Date.now()，防止背景分頁 / 鎖屏節流造成數十秒卡死）
 */
export function sleepWithCancel(ms: number, isCancelled?: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0 || (isCancelled && isCancelled())) {
      resolve();
      return;
    }

    const deadline = Date.now() + ms;
    let settled = false;
    let mainTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelCheckInterval: ReturnType<typeof setInterval> | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (mainTimer) {
        clearTimeout(mainTimer);
        mainTimer = null;
      }
      if (cancelCheckInterval) {
        clearInterval(cancelCheckInterval);
        cancelCheckInterval = null;
      }
      resolve();
    };

    mainTimer = setTimeout(finish, ms);

    if (isCancelled) {
      cancelCheckInterval = setInterval(() => {
        if (isCancelled() || Date.now() >= deadline) {
          finish();
        }
      }, 40);
    }
  });
}

