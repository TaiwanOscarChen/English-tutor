/**
 * Offline Speech Playlist Engine for Semiconductor Fab Engineers
 * 專為半導體無塵室離線環境設計的「一鍵朗讀 / 連續語音播放清單」引擎
 * 當偵測到離線或手動觸發時，自動批次將已快取的單字、諧音記憶法與晶圓廠實戰例句循序播放
 */

import { FAB_VOCAB } from '../data/fabVocab';
import { VocabItem } from '../types';
import { speakEnglish, speakChinese, resetSpeechEngine } from './speech';
import { getExampleTranslation } from './exampleSentenceTranslator';
import { playClickSound, playLaserScanSound, playWaferSnapSound } from './audioEffects';

export type OfflinePlaylistPhase = 'idle' | 'word' | 'taiwan_trick' | 'example' | 'interval' | 'paused';

export type OfflinePlayMode = 'sequential' | 'shuffle' | 'loop_single' | 'unmastered_only';

export interface OfflinePlaylistConfig {
  autoStartOnOffline: boolean;
  repeatCount: 1 | 2 | 3;
  includeExample: boolean;
  includeMemoryTrick: boolean;
  intervalSeconds: number; // 1.0, 1.5, 2.0, 3.0
  category: 'all' | 'equipment' | 'process' | 'maintenance' | 'safety';
  speechSpeed: number; // 0.75 ~ 1.25
  playMode: OfflinePlayMode;
  sleepTimerMinutes: number; // 0 = off, 5, 10, 15, 30
}

export interface OfflinePlaylistState {
  isPlaying: boolean;
  isPaused: boolean;
  currentIndex: number;
  currentPhase: OfflinePlaylistPhase;
  currentItem: VocabItem | null;
  totalItemsCount: number;
  config: OfflinePlaylistConfig;
  playedCount: number;
  sleepTimerSecondsLeft: number;
  activeItems: VocabItem[];
}

const STORAGE_KEY_CONFIG = 'fse_offline_playlist_config';

function loadStoredConfig(): OfflinePlaylistConfig {
  const defaultConfig: OfflinePlaylistConfig = {
    autoStartOnOffline: true,
    repeatCount: 1,
    includeExample: true,
    includeMemoryTrick: true,
    intervalSeconds: 2.0,
    category: 'all',
    speechSpeed: 0.95,
    playMode: 'sequential',
    sleepTimerMinutes: 0
  };

  if (typeof window === 'undefined') return defaultConfig;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultConfig, ...parsed };
    }
  } catch (e) {}

  return defaultConfig;
}

function saveConfig(config: OfflinePlaylistConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (e) {}
}

class OfflineSpeechPlaylistEngine {
  private config: OfflinePlaylistConfig = loadStoredConfig();
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private currentIndex: number = 0;
  private currentPhase: OfflinePlaylistPhase = 'idle';
  private activeItems: VocabItem[] = FAB_VOCAB;
  private timerRef: any = null;
  private sleepIntervalRef: any = null;
  private sleepTimerSecondsLeft: number = 0;
  private playedCount: number = 0;
  private isCancelled: boolean = false;
  private reviewedVocabIds: string[] = [];
  private listeners: Set<(state: OfflinePlaylistState) => void> = new Set();

  constructor() {
    this.refreshActiveItems();
    this.loadReviewedIds();
  }

  private loadReviewedIds() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('fse_offline_reviewed_vocab_ids');
      if (raw) {
        this.reviewedVocabIds = JSON.parse(raw);
      }
    } catch (e) {}
  }

  public setReviewedVocabIds(ids: string[]) {
    this.reviewedVocabIds = ids;
    if (this.config.playMode === 'unmastered_only') {
      this.refreshActiveItems();
      this.notify();
    }
  }

  private refreshActiveItems() {
    let list = [...FAB_VOCAB];
    if (this.config.category !== 'all') {
      list = list.filter((item) => item.category === this.config.category);
    }

    if (this.config.playMode === 'unmastered_only') {
      const unmastered = list.filter((item) => !this.reviewedVocabIds.includes(item.id));
      if (unmastered.length > 0) {
        list = unmastered;
      }
    }

    if (this.config.playMode === 'shuffle') {
      // Fisher-Yates shuffle
      list = [...list].sort(() => Math.random() - 0.5);
    }

    this.activeItems = list.length > 0 ? list : [...FAB_VOCAB];
  }

  public getState(): OfflinePlaylistState {
    const currentItem = this.activeItems[this.currentIndex] || null;
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex,
      currentPhase: this.currentPhase,
      currentItem,
      totalItemsCount: this.activeItems.length,
      config: { ...this.config },
      playedCount: this.playedCount,
      sleepTimerSecondsLeft: this.sleepTimerSecondsLeft,
      activeItems: this.activeItems
    };
  }

  public subscribe(listener: (state: OfflinePlaylistState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => {
      try {
        l(state);
      } catch (e) {}
    });
  }

  public updateConfig(partial: Partial<OfflinePlaylistConfig>) {
    const prevMode = this.config.playMode;
    const prevCat = this.config.category;
    const prevSleep = this.config.sleepTimerMinutes;

    this.config = { ...this.config, ...partial };
    saveConfig(this.config);

    if (partial.category !== undefined && partial.category !== prevCat) {
      this.refreshActiveItems();
      this.currentIndex = 0;
    }

    if (partial.playMode !== undefined && partial.playMode !== prevMode) {
      this.refreshActiveItems();
      this.currentIndex = 0;
    }

    if (partial.sleepTimerMinutes !== undefined && partial.sleepTimerMinutes !== prevSleep) {
      this.initSleepTimer(partial.sleepTimerMinutes);
    }

    this.notify();
  }

  private initSleepTimer(minutes: number) {
    if (this.sleepIntervalRef) {
      clearInterval(this.sleepIntervalRef);
      this.sleepIntervalRef = null;
    }

    if (minutes <= 0) {
      this.sleepTimerSecondsLeft = 0;
      return;
    }

    this.sleepTimerSecondsLeft = minutes * 60;
    this.sleepIntervalRef = setInterval(() => {
      if (this.isPlaying && !this.isPaused) {
        this.sleepTimerSecondsLeft--;
        if (this.sleepTimerSecondsLeft <= 0) {
          clearInterval(this.sleepIntervalRef);
          this.sleepIntervalRef = null;
          this.sleepTimerSecondsLeft = 0;
          this.stop();
          playWaferSnapSound();
        } else {
          this.notify();
        }
      }
    }, 1000);
  }

  /**
   * 啟動批次連續朗讀播放清單
   */
  public start(startIndex: number = 0, category?: OfflinePlaylistConfig['category']) {
    if (category) {
      this.config.category = category;
    }
    this.refreshActiveItems();

    if (this.activeItems.length === 0) {
      this.refreshActiveItems();
    }

    this.stop(false);
    this.isCancelled = false;
    this.isPlaying = true;
    this.isPaused = false;
    this.currentIndex = Math.max(0, Math.min(startIndex, this.activeItems.length - 1));
    this.playedCount = 0;

    if (this.config.sleepTimerMinutes > 0) {
      this.initSleepTimer(this.config.sleepTimerMinutes);
    }

    this.notify();
    this.playCurrentStep();
  }

  /**
   * 核心循環播放邏輯
   */
  private playCurrentStep() {
    if (!this.isPlaying || this.isPaused || this.isCancelled) return;

    if (this.currentIndex >= this.activeItems.length) {
      // 播放清單結束，自動循環從第 1 首開始
      this.currentIndex = 0;
    }

    const item = this.activeItems[this.currentIndex];
    if (!item) {
      this.stop();
      return;
    }

    // Step 1: 英文單字朗讀
    this.currentPhase = 'word';
    this.notify();

    const speed = this.config.speechSpeed || 0.95;

    // 播放英文單字 (可依設定重複 1 或 2 次)
    const speakWordTimes = this.config.repeatCount;
    let wordSpoken = 0;

    const playWordLoop = () => {
      if (!this.isPlaying || this.isPaused || this.isCancelled) return;

      wordSpoken++;
      speakEnglish(
        item.word,
        speed,
        () => {
          if (!this.isPlaying || this.isPaused || this.isCancelled) return;

          if (wordSpoken < speakWordTimes) {
            // 重複朗讀單字，間隔 350ms
            this.timerRef = setTimeout(() => {
              playWordLoop();
            }, 350);
          } else {
            // 前往 Step 2: 諧音口訣與中文翻譯 (若開啟)
            this.playTaiwanTrickStep(item);
          }
        },
        1.0,
        150,
        true // 清空舊發音佇列
      );
    };

    playWordLoop();
  }

  /**
   * Step 2: 播放台味諧音記憶法與中文意思
   */
  private playTaiwanTrickStep(item: VocabItem) {
    if (!this.isPlaying || this.isPaused || this.isCancelled) return;

    if (!this.config.includeMemoryTrick) {
      this.playExampleStep(item);
      return;
    }

    this.currentPhase = 'taiwan_trick';
    this.notify();

    const textToSpeak = `${item.translation}。口訣：${item.memoryTrick || item.taiwanPhonetic}`;

    speakChinese(
      textToSpeak,
      Math.max(0.9, this.config.speechSpeed || 0.95),
      () => {
        if (!this.isPlaying || this.isPaused || this.isCancelled) return;
        this.playExampleStep(item);
      },
      1.0,
      250,
      false
    );
  }

  /**
   * Step 3: 播放晶圓廠實戰例句 (英文 + 中文意思)
   */
  private playExampleStep(item: VocabItem) {
    if (!this.isPlaying || this.isPaused || this.isCancelled) return;

    if (!this.config.includeExample || !item.exampleSentence) {
      this.finishCurrentItem();
      return;
    }

    this.currentPhase = 'example';
    this.notify();

    const speed = Math.max(0.85, (this.config.speechSpeed || 0.95) * 0.95);
    const zhMeaning = item.exampleTranslation || item.exampleSentenceZh || getExampleTranslation(item.exampleSentence, item.word);

    speakEnglish(
      item.exampleSentence,
      speed,
      () => {
        if (!this.isPlaying || this.isPaused || this.isCancelled) return;

        // 若啟用口訣與中文朗讀，接著朗讀例句中文意思
        if (this.config.includeMemoryTrick && zhMeaning) {
          speakChinese(
            `例句意思：${zhMeaning}`,
            Math.max(0.9, this.config.speechSpeed || 0.95),
            () => {
              if (!this.isPlaying || this.isPaused || this.isCancelled) return;
              this.finishCurrentItem();
            },
            1.0,
            200,
            false
          );
        } else {
          this.finishCurrentItem();
        }
      },
      1.0,
      250,
      false
    );
  }

  /**
   * Step 4: 當前單字播放結束，等待間隔後自動前進至下一詞
   */
  private finishCurrentItem() {
    if (!this.isPlaying || this.isPaused || this.isCancelled) return;

    this.currentPhase = 'interval';
    this.playedCount++;
    this.notify();

    const delayMs = Math.max(400, (this.config.intervalSeconds || 2.0) * 1000);

    this.timerRef = setTimeout(() => {
      if (!this.isPlaying || this.isPaused || this.isCancelled) return;

      if (this.config.playMode === 'loop_single') {
        // 單詞精聽循環模式：維持原索引重複播放
        this.notify();
        this.playCurrentStep();
      } else {
        this.currentIndex = (this.currentIndex + 1) % this.activeItems.length;
        this.notify();
        this.playCurrentStep();
      }
    }, delayMs);
  }

  /**
   * 暫停播放
   */
  public pause() {
    if (!this.isPlaying) return;
    this.isPaused = true;
    this.currentPhase = 'paused';
    if (this.timerRef) {
      clearTimeout(this.timerRef);
      this.timerRef = null;
    }
    resetSpeechEngine();
    this.notify();
  }

  /**
   * 繼續播放
   */
  public resume() {
    if (!this.isPlaying || !this.isPaused) return;
    this.isPaused = false;
    this.notify();
    this.playCurrentStep();
  }

  /**
   * 切換 播放 / 暫停
   */
  public togglePlayPause() {
    if (!this.isPlaying) {
      this.start(this.currentIndex);
    } else if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * 跳至下一個單字
   */
  public next() {
    if (this.activeItems.length === 0) return;
    playClickSound();
    if (this.timerRef) {
      clearTimeout(this.timerRef);
      this.timerRef = null;
    }
    resetSpeechEngine();
    this.currentIndex = (this.currentIndex + 1) % this.activeItems.length;
    this.isPaused = false;
    this.isPlaying = true;
    this.notify();
    this.playCurrentStep();
  }

  /**
   * 返回上一個單字
   */
  public prev() {
    if (this.activeItems.length === 0) return;
    playClickSound();
    if (this.timerRef) {
      clearTimeout(this.timerRef);
      this.timerRef = null;
    }
    resetSpeechEngine();
    this.currentIndex = (this.currentIndex - 1 + this.activeItems.length) % this.activeItems.length;
    this.isPaused = false;
    this.isPlaying = true;
    this.notify();
    this.playCurrentStep();
  }

  /**
   * 停止播放清單
   */
  public stop(notify: boolean = true) {
    this.isCancelled = true;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentPhase = 'idle';
    if (this.timerRef) {
      clearTimeout(this.timerRef);
      this.timerRef = null;
    }
    if (this.sleepIntervalRef) {
      clearInterval(this.sleepIntervalRef);
      this.sleepIntervalRef = null;
      this.sleepTimerSecondsLeft = 0;
    }
    resetSpeechEngine();
    if (notify) {
      this.notify();
    }
  }

  /**
   * 偵測到離線時自動觸發朗讀（若啟用 autoStartOnOffline 且尚未播放中）
   */
  public handleOfflineDetected() {
    if (this.config.autoStartOnOffline && !this.isPlaying) {
      // 稍微延遲 600ms 讓用戶看到離線提示後平順啟動
      setTimeout(() => {
        if (!this.isPlaying) {
          this.start(0);
        }
      }, 600);
    }
  }
}

// 全域單例
export const globalOfflineSpeechPlaylist = new OfflineSpeechPlaylistEngine();
