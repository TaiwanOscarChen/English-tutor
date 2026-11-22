/**
 * Offline Speech Playlist Engine for Semiconductor Fab Engineers
 * 專為半導體無塵室離線環境設計的「一鍵朗讀 / 連續語音播放清單」引擎
 * 當偵測到離線或手動觸發時，自動批次將已快取的單字、諧音記憶法與晶圓廠實戰例句循序播放
 */

import { FAB_VOCAB } from '../data/fabVocab';
import { VocabItem } from '../types';
import {
  resetSpeechEngine,
  prepareTaiwanPhoneticForSpeech,
  globalAudioScheduler,
  unlockAudioContext,
  ensureSpeechEngineInitialized
} from './speech';
import { getExampleTranslation } from './exampleSentenceTranslator';
import { playClickSound, playWaferSnapSound } from './audioEffects';

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
  private sessionEpoch: number = 0;
  private offlineAutoStartTimer: ReturnType<typeof setTimeout> | null = null;
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
    const epoch = ++this.sessionEpoch;
    this.isCancelled = false;
    this.isPlaying = true;
    this.isPaused = false;
    this.currentIndex = Math.max(0, Math.min(startIndex, this.activeItems.length - 1));
    this.playedCount = 0;

    if (this.config.sleepTimerMinutes > 0) {
      this.initSleepTimer(this.config.sleepTimerMinutes);
    }

    this.notify();
    this.playCurrentStep(epoch);
  }

  private isEpochActive(epoch: number): boolean {
    return epoch === this.sessionEpoch && this.isPlaying && !this.isPaused && !this.isCancelled;
  }

  private waitWithEpoch(ms: number, epoch: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isEpochActive(epoch)) {
        resolve(false);
        return;
      }
      if (ms <= 0) {
        resolve(true);
        return;
      }
      if (this.timerRef) {
        clearTimeout(this.timerRef);
        this.timerRef = null;
      }
      this.timerRef = setTimeout(() => {
        this.timerRef = null;
        resolve(this.isEpochActive(epoch));
      }, ms);
    });
  }

  private async speakQueuedStep(
    text: string,
    lang: 'en-US' | 'zh-TW',
    speed: number,
    bufferAfterMs: number,
    epoch: number
  ): Promise<boolean> {
    if (!this.isEpochActive(epoch)) return false;
    if (!text || !text.trim()) return true;

    let hadError = false;
    try {
      await globalAudioScheduler.enqueue(
        text,
        lang,
        speed,
        bufferAfterMs,
        () => !this.isEpochActive(epoch),
        1.0,
        undefined,
        undefined,
        () => {
          hadError = true;
        }
      );
    } catch {
      hadError = true;
    }

    if (!this.isEpochActive(epoch)) return false;
    return !hadError;
  }

  /**
   * 核心循環播放邏輯（採用 Epoch 守衛之 async 序列化迴圈，具備單步錯誤隔離與自動恢復機制，絕不因單次 TTS 異常導致整串清單靜默停擺）
   */
  private playCurrentStep(epoch: number = this.sessionEpoch) {
    if (!this.isEpochActive(epoch)) return;
    this.runSequentialPlaylistLoop(epoch).catch((err) => {
      console.warn("[OfflineSpeechPlaylist] Unexpected loop error:", err);
      if (this.isEpochActive(epoch)) {
        this.stop();
      }
    });
  }

  private async runSequentialPlaylistLoop(epoch: number): Promise<void> {
    unlockAudioContext();
    await ensureSpeechEngineInitialized(800).catch(() => {});
    if (!this.isEpochActive(epoch)) return;

    let consecutiveErrors = 0;

    while (this.isEpochActive(epoch)) {
      if (this.activeItems.length === 0) {
        this.stop();
        return;
      }
      if (this.currentIndex >= this.activeItems.length) {
        this.currentIndex = 0;
      }

      const item = this.activeItems[this.currentIndex];
      if (!item) {
        this.stop();
        return;
      }

      let itemSucceededSteps = 0;
      let itemFailedSteps = 0;

      // Step 1: 英文單字朗讀（可依設定重複 1~3 次）
      this.currentPhase = 'word';
      this.notify();

      const speed = this.config.speechSpeed || 0.95;
      const speakWordTimes = this.config.repeatCount;

      for (let wordSpoken = 1; wordSpoken <= speakWordTimes; wordSpoken++) {
        if (!this.isEpochActive(epoch)) return;
        const wordSpeed = wordSpoken === 1 ? Math.max(0.7, Number((speed * 0.85).toFixed(2))) : speed;
        const ok = await this.speakQueuedStep(item.word, 'en-US', wordSpeed, 150, epoch);
        if (!this.isEpochActive(epoch)) return;
        if (ok) itemSucceededSteps++;
        else itemFailedSteps++;

        if (wordSpoken < speakWordTimes) {
          const stillActive = await this.waitWithEpoch(320, epoch);
          if (!stillActive) return;
        }
      }

      // Step 2: 簡潔中文釋義 + 原速英文單字強化
      if (this.config.includeMemoryTrick) {
        if (!this.isEpochActive(epoch)) return;
        this.currentPhase = 'taiwan_trick';
        this.notify();

        const phoneticText = prepareTaiwanPhoneticForSpeech(item.taiwanPhonetic || '');
        const textToSpeak = item.translation
          ? item.translation
          : (phoneticText || item.memoryTrick || '');

        if (textToSpeak) {
          const zhOk = await this.speakQueuedStep(
            textToSpeak,
            'zh-TW',
            Math.max(0.95, speed),
            200,
            epoch
          );
          if (!this.isEpochActive(epoch)) return;
          if (zhOk) itemSucceededSteps++;
          else itemFailedSteps++;
        }

        const enReinforceOk = await this.speakQueuedStep(item.word, 'en-US', speed, 180, epoch);
        if (!this.isEpochActive(epoch)) return;
        if (enReinforceOk) itemSucceededSteps++;
        else itemFailedSteps++;
      }

      // Step 3: 晶圓廠實戰例句（慢速英文 ➔ 中文理解 ➔ 原速英文強化定型）
      if (this.config.includeExample && item.exampleSentence) {
        if (!this.isEpochActive(epoch)) return;
        this.currentPhase = 'example';
        this.notify();

        const slowSpeed = Math.max(0.7, Number((speed * 0.85).toFixed(2)));
        const zhMeaning =
          item.exampleTranslation ||
          item.exampleSentenceZh ||
          getExampleTranslation(item.exampleSentence, item.word);

        const slowOk = await this.speakQueuedStep(item.exampleSentence, 'en-US', slowSpeed, 200, epoch);
        if (!this.isEpochActive(epoch)) return;
        if (slowOk) itemSucceededSteps++;
        else itemFailedSteps++;

        if (this.config.includeMemoryTrick && zhMeaning) {
          const exZhOk = await this.speakQueuedStep(
            zhMeaning,
            'zh-TW',
            Math.max(0.95, speed),
            180,
            epoch
          );
          if (!this.isEpochActive(epoch)) return;
          if (exZhOk) itemSucceededSteps++;
          else itemFailedSteps++;
        }

        const normalOk = await this.speakQueuedStep(item.exampleSentence, 'en-US', speed, 220, epoch);
        if (!this.isEpochActive(epoch)) return;
        if (normalOk) itemSucceededSteps++;
        else itemFailedSteps++;
      }

      // 若整題所有步驟都失敗，觸發短暫退避冷卻並自動重置音訊上下文後繼續前進，避免無限快速空轉
      if (itemSucceededSteps === 0 && itemFailedSteps > 0) {
        consecutiveErrors++;
        unlockAudioContext();
        const recoveryCooldownMs = Math.min(3000, 600 * consecutiveErrors);
        const stillActive = await this.waitWithEpoch(recoveryCooldownMs, epoch);
        if (!stillActive) return;
        if (consecutiveErrors >= 5) {
          // 連續 5 題皆完全無法發聲（例如設備完全靜音或無網路無離線語音），安全暫停避免耗電
          this.pause();
          return;
        }
      } else {
        consecutiveErrors = 0;
      }

      // Step 4: 當前單字播放結束，等待間隔後自動前進至下一詞
      if (!this.isEpochActive(epoch)) return;
      this.currentPhase = 'interval';
      this.playedCount++;
      this.notify();

      const delayMs = Math.max(400, (this.config.intervalSeconds || 2.0) * 1000);
      const stillActive = await this.waitWithEpoch(delayMs, epoch);
      if (!stillActive) return;

      if (this.config.playMode !== 'loop_single') {
        this.currentIndex = (this.currentIndex + 1) % this.activeItems.length;
      }
      this.notify();
    }
  }

  /**
   * 暫停播放
   */
  public pause() {
    if (!this.isPlaying) return;
    this.sessionEpoch++;
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
    const epoch = ++this.sessionEpoch;
    this.isPaused = false;
    this.notify();
    this.playCurrentStep(epoch);
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
    const epoch = ++this.sessionEpoch;
    if (this.timerRef) {
      clearTimeout(this.timerRef);
      this.timerRef = null;
    }
    resetSpeechEngine();
    this.currentIndex = (this.currentIndex + 1) % this.activeItems.length;
    this.isCancelled = false;
    this.isPaused = false;
    this.isPlaying = true;
    this.notify();
    this.playCurrentStep(epoch);
  }

  /**
   * 返回上一個單字
   */
  public prev() {
    if (this.activeItems.length === 0) return;
    playClickSound();
    const epoch = ++this.sessionEpoch;
    if (this.timerRef) {
      clearTimeout(this.timerRef);
      this.timerRef = null;
    }
    resetSpeechEngine();
    this.currentIndex = (this.currentIndex - 1 + this.activeItems.length) % this.activeItems.length;
    this.isCancelled = false;
    this.isPaused = false;
    this.isPlaying = true;
    this.notify();
    this.playCurrentStep(epoch);
  }

  /**
   * 停止播放清單
   */
  public stop(notify: boolean = true) {
    this.sessionEpoch++;
    this.isCancelled = true;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentPhase = 'idle';
    if (this.offlineAutoStartTimer) {
      clearTimeout(this.offlineAutoStartTimer);
      this.offlineAutoStartTimer = null;
    }
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
      if (this.offlineAutoStartTimer) {
        clearTimeout(this.offlineAutoStartTimer);
      }
      // 稍微延遲 600ms 讓用戶看到離線提示後平順啟動
      this.offlineAutoStartTimer = setTimeout(() => {
        this.offlineAutoStartTimer = null;
        if (!this.isPlaying && this.config.autoStartOnOffline) {
          this.start(0);
        }
      }, 600);
    }
  }
}

// 全域單例
export const globalOfflineSpeechPlaylist = new OfflineSpeechPlaylistEngine();
