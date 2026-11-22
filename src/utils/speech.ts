/**
 * Cleanroom & Semiconductor AudioScheduler Engine (2026 Resilient Web Speech & Audio Pipeline)
 * 專為晶圓半導體無塵室英語特訓打造的頂級語音合成、自然發音韻律排程、手機深度抗卡頓與多層自癒引擎
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getCachedAudioSnippet,
  saveAudioSnippetToCache
} from './audioCacheDB';
import {
  playCleanroomConfirmationCue,
  playAmbientInterSentenceCue,
  getAmbientSoundType,
  getSharedAudioContext,
  ensureSharedAudioContextRunning,
  triggerHapticFeedback,
  triggerHapticStepPulse,
  triggerHapticPhraseComplete
} from './audioEffects';

export type SpeechEnginePhase =
  | 'IDLE'
  | 'BUFFERING'
  | 'PLAYING_CLOUD'
  | 'PLAYING_NATIVE'
  | 'INTER_SENTENCE_BUFFER'
  | 'RECOVERING'
  | 'ERROR';

export interface AudioBufferStats {
  ramCachedBlobs: number;
  inFlightRequests: number;
  cacheHitCount: number;
  cacheMissCount: number;
  prebufferedChunksCount: number;
  underrunRecoveryCount: number;
  conflictPreventedCount: number;
  completedTasksCount: number;
  predictiveCachedCount: number;
  activePredictiveRequests: number;
  currentSpeedBucket: string;
  trimmedChunksCount?: number;
  totalTrimmedSilenceMs?: number;
  dynamicNoiseFloor?: number;
  dynamicStartThreshold?: number;
  dynamicEndThreshold?: number;
  clickPopSuppressedCount?: number;
  dynamicAudioBufferSize?: number;
  predictiveZeroCrossingAlignments?: number;
  taskRetryCount?: number;
  taskRecoverySuccessCount?: number;
}

export interface DynamicAudioBufferConfig {
  /** 依據 speechSpeed 自動縮減之 AudioContext 處理緩衝區樣本數 (256 | 512 | 1024 | 2048) */
  bufferSize: 256 | 512 | 1024 | 2048;
  /** 實時 AnalyserNode 對應之動態 FFT 視窗大小 (512 | 1024 | 2048) */
  analyserFftSize: 512 | 1024 | 2048;
  /** 預估硬體緩衝反應延遲毫秒數 */
  estimatedReactionLatencyMs: number;
  /** 根據語速縮放之前導子音安全緩衝毫秒數 */
  leadInPadMs: number;
  /** 根據語速縮放之尾韻釋放安全緩衝毫秒數 */
  trailOutPadMs: number;
  /** 多段拼接之句間微呼吸間隔毫秒數 */
  interChunkBreathMs: number;
  /** 預測性過零點 (Predictive Zero-Crossing) 搜尋半徑樣本數 */
  predictiveSearchRadiusSamples: number;
}

export interface RealtimeNoiseAnalysisMetrics {
  /** 實時 AudioAnalyser 偵測到的殘留基底噪音 RMS 閾值 */
  residualNoiseFloor: number;
  /** 動態傳入 trimStart 的起始能量閾值 */
  dynamicStartThreshold: number;
  /** 動態傳入 trimEnd 的結束能量閾值 */
  dynamicEndThreshold: number;
  /** 數位喀嗒聲 (Click/Pop) 瞬間斜率 (Slew-Rate) 攔截閾值 */
  clickImpulseThreshold: number;
  /** 實時 AnalyserNode 當前時域 RMS 振幅 */
  realtimeRmsLevel: number;
  /** 高頻瞬態脈衝能量比 (8kHz~20kHz / Total) */
  highFreqTransientRatio: number;
  /** 已累計攔截並消除的斷句數位喀嗒聲次數 */
  clickPopSuppressedCount: number;
  /** 實時分析樣本更新次數 */
  analyserSampleCount: number;
  /** 當前根據 speechSpeed 動態調整之 AudioContext buffer size */
  dynamicAudioBufferSize: number;
  /** 預測性過零點 (Predictive Zero-Crossing) 成功對齊次數 */
  predictiveZeroCrossingAlignments: number;
}

export interface AudioTrimOptions {
  /** 語音起始能量偵測閾值（由實時 AudioAnalyser 動態注入，預設自適應） */
  startThreshold?: number;
  /** 語音結束能量偵測閾值（由實時 AudioAnalyser 動態注入，保留字尾氣音與摩擦音） */
  endThreshold?: number;
  /** 實時 AudioAnalyser 偵測到的殘留噪音基底值 */
  residualNoiseFloor?: number;
  /** 數位喀嗒聲 (Click/Pop) 瞬態脈衝斜率閾值 */
  clickImpulseThreshold?: number;
  /** 當前語速 (speechSpeed)，用於動態縮減緩衝區與預測性過零點斜率補償 */
  speechSpeed?: number;
  /** 動態 AudioContext buffer size (256 ~ 2048) */
  dynamicBufferSize?: number;
  /** 裁切點前方保留之自然起音緩衝毫秒數（防止子音 p/t/k/s/f 被削頭） */
  leadInPadMs?: number;
  /** 裁切點後方保留之自然尾韻緩衝毫秒數（防止字尾 s/f/sh/t 斷尾） */
  trailOutPadMs?: number;
  /** 防喀嗒聲（De-click）微淡入毫秒數（預設 3.0ms） */
  fadeInMs?: number;
  /** 防喀嗒聲（De-click）微淡出毫秒數（預設 4.5ms） */
  fadeOutMs?: number;
}

export interface AudioTrimResult {
  buffer: AudioBuffer;
  trimmedStartMs: number;
  trimmedEndMs: number;
  totalTrimmedMs: number;
  originalDurationMs: number;
  trimmedDurationMs: number;
  appliedStartThreshold: number;
  appliedEndThreshold: number;
  suppressedClicks: number;
  dynamicBufferSize: number;
}

export interface PredictiveCacheTarget {
  text: string;
  lang?: 'en-US' | 'zh-TW';
  speechSpeed?: number;
  priority?: 'immediate' | 'next_pattern' | 'next_lesson' | 'background';
}

export interface PredictiveLessonContext {
  currentSentences: Array<{ english: string; chinese?: string }>;
  activeSentenceIndex: number;
  nextLessonSentences?: Array<{ english: string; chinese?: string }>;
  prevLessonSentences?: Array<{ english: string; chinese?: string }>;
  speechSpeed: number;
  includeBilingual?: boolean;
}

export interface SpeechProgressPayload {
  progress: number; // 0 to 100
  charIndex: number; // 當前朗讀字元索引
  wordIndex: number; // 當前朗讀單字索引 (0-based, 若無則為 -1)
  currentWord: string; // 當前正在朗讀的單字
  totalWords: number; // 總單字數
  remainingSeconds: number; // 剩餘秒數
  totalSeconds: number; // 預估或實際總秒數
  rawText: string; // 原始輸入文字
  cleanedText: string; // 正規化後發音文字
  lang: 'en-US' | 'zh-TW';
  enginePhase: SpeechEnginePhase;
}

export interface AudioTask {
  id: number;
  rawText?: string;
  text: string;
  lang: 'en-US' | 'zh-TW';
  rate: number;
  pitch?: number;
  volume?: number;
  bufferAfterMs?: number; // 語句強制緩衝間隔 (Buffer Time)
  onStart?: () => void;
  onProgress?: (payload: SpeechProgressPayload) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export interface SpeechSequenceStep {
  text: string;
  lang?: 'en-US' | 'zh-TW';
  rate?: number;
  pitch?: number;
  bufferAfterMs?: number;
  delayAfterMs?: number;
  onStepStart?: () => void;
  onStepProgress?: (payload: SpeechProgressPayload) => void;
  onStepEnd?: () => void;
}

export interface SpeechQueueProgressState {
  isPlaying: boolean;
  enginePhase: SpeechEnginePhase;
  sessionEpoch: number;
  currentTask: AudioTask | null;
  lastCompletedTask: AudioTask | null;
  progress: number; // 0 to 100
  charIndex: number;
  wordIndex: number; // 當前朗讀單字索引 (0-based, IDLE 時為 -1)
  currentWord: string; // 當前正在朗讀的單字
  totalWords: number; // 當前句子總單字數
  totalLength: number;
  queueLength: number; // 佇列總數（包含正在播放中的項目）
  remainingQueueCount: number; // 佇列中待播放的其餘句子數量（不含正在播放的這句）
  remainingSeconds: number; // 當前正在播放的句子剩餘秒數 (如 2.4s)
  totalEstimatedSeconds: number; // 當前正在播放的句子預估總秒數
  isMobileDevice: boolean;
  isEngineHealthy: boolean;
  bufferStats: AudioBufferStats;
}

export type SpeechStylePreset = 'cleanroom' | 'natural' | 'slow_clarity';
export type LoudnessBoostMode = 'standard' | 'loud' | 'boost_max';
export type AccentMode = 'tw_fab' | 'us_standard' | 'tw_mandarin_bilingual';

export interface SpeechLatencyEvent {
  id: string;
  latencyMs: number;
  thresholdMs: number;
  isFallbackActive: boolean;
  text: string;
  lang: string;
  source: 'web-speech' | 'offline-cache' | 'acoustic-synthetic';
  timestamp: number;
  warningCount: number;
}

export interface SpeechLatencyStats {
  averageLatencyMs: number;
  lastLatencyMs: number;
  maxLatencyMs: number;
  totalSamples: number;
  warningCount: number;
  isOfflineFallbackActive: boolean;
  thresholdMs: number;
}

// 語音延遲監控與離線快取預警狀態管理
const SPEECH_LATENCY_STORAGE_KEY = 'fse_speech_latency_threshold_ms';
let currentLatencyThresholdMs = 2500; // 預設 2500ms 安全閾值，避免瀏覽器正常語音啟動被誤殺

if (typeof window !== 'undefined') {
  try {
    const savedThreshold = localStorage.getItem(SPEECH_LATENCY_STORAGE_KEY);
    if (savedThreshold) {
      const parsed = parseInt(savedThreshold, 10);
      if (!isNaN(parsed) && parsed >= 1200 && parsed <= 5000) {
        currentLatencyThresholdMs = parsed;
      }
    }
  } catch {}
}

const latencyHistory: number[] = [];
let totalLatencyWarningCount = 0;
let isOfflineFallbackActiveGlobal = false;
const latencyListeners: Array<(event: SpeechLatencyEvent) => void> = [];

export function getSpeechLatencyThreshold(): number {
  return currentLatencyThresholdMs;
}

export function setSpeechLatencyThreshold(ms: number): void {
  currentLatencyThresholdMs = Math.max(250, Math.min(3000, ms));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SPEECH_LATENCY_STORAGE_KEY, currentLatencyThresholdMs.toString());
    } catch {}
  }
}

export function getSpeechLatencyStats(): SpeechLatencyStats {
  const avg = latencyHistory.length > 0
    ? Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length)
    : 0;
  const max = latencyHistory.length > 0 ? Math.max(...latencyHistory) : 0;
  const last = latencyHistory.length > 0 ? latencyHistory[latencyHistory.length - 1] : 0;

  return {
    averageLatencyMs: avg,
    lastLatencyMs: last,
    maxLatencyMs: max,
    totalSamples: latencyHistory.length,
    warningCount: totalLatencyWarningCount,
    isOfflineFallbackActive: isOfflineFallbackActiveGlobal,
    thresholdMs: currentLatencyThresholdMs
  };
}

export function subscribeSpeechLatency(listener: (event: SpeechLatencyEvent) => void): () => void {
  latencyListeners.push(listener);
  return () => {
    const idx = latencyListeners.indexOf(listener);
    if (idx !== -1) latencyListeners.splice(idx, 1);
  };
}

export function dispatchSpeechLatencyEvent(event: SpeechLatencyEvent): void {
  latencyListeners.forEach((fn) => {
    try {
      fn(event);
    } catch (err) {
      console.warn("Speech latency listener error:", err);
    }
  });
}

/**
 * React Hook to monitor speech synthesis latency, pre-warnings, and offline cache fallback state
 */
export function useSpeechLatencyMonitor() {
  const [stats, setStats] = useState<SpeechLatencyStats>(getSpeechLatencyStats);
  const [recentWarning, setRecentWarning] = useState<SpeechLatencyEvent | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeSpeechLatency(() => {
      setStats(getSpeechLatencyStats());
    });

    return unsubscribe;
  }, []);

  const updateThreshold = useCallback((ms: number) => {
    setSpeechLatencyThreshold(ms);
    setStats(getSpeechLatencyStats());
  }, []);

  const clearWarning = useCallback(() => {
    setRecentWarning(null);
  }, []);

  return {
    ...stats,
    recentWarning,
    updateThreshold,
    clearWarning
  };
}

export interface AccentOption {
  id: AccentMode;
  name: string;
  subtitle: string;
  desc: string;
  badge: string;
  flag: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  {
    id: 'tw_fab',
    name: '台灣晶圓廠在地口音',
    subtitle: 'Taiwan Fab Localized Accent',
    desc: '專為台灣半導體晶圓廠與封測廠工程師優化：加強子音爆破清晰度、以台灣無塵室最熟悉的通用術語發音（FOUP [foop]、recipe [瑞瑟匹]、MFC [M-F-C]、LOTO [肉頭]、mTorr、sccm 等）精準發音，溝通無障礙。',
    badge: '🇹🇼 在地推薦',
    flag: '🇹🇼'
  },
  {
    id: 'us_standard',
    name: '美式國際標準發音',
    subtitle: 'Standard US Native Accent',
    desc: '美語母語國際標準語調與自然連音，適合全英語技術會議與設備工程專業交流。',
    badge: '🇺🇸 國際原音',
    flag: '🇺🇸'
  },
  {
    id: 'tw_mandarin_bilingual',
    name: '台灣國語雙語導讀',
    subtitle: 'Bilingual Taiwan Mandarin Guide',
    desc: '先以道地親切台灣國語釋義，再由晶圓廠英語清晰朗讀，國小級直覺對照，極速掌握操作重點。',
    badge: '🇹🇼🗣️ 雙語對照',
    flag: '🇹🇼'
  }
];

export interface SpeechEngineDiagnostics {
  isWebSpeechSupported: boolean;
  isAudioContextSupported: boolean;
  audioContextState: string;
  isMobileDevice: boolean;
  totalVoices: number;
  englishVoicesCount: number;
  taiwanVoicesCount: number;
  selectedEnglishVoice: string;
  selectedTaiwanVoice: string;
  accentMode: AccentMode;
  isSpeaking: boolean;
  isPaused: boolean;
  isPending: boolean;
  queueLength: number;
  currentPitch: number;
  currentStyle: SpeechStylePreset;
  currentVolume: number;
  loudnessBoostMode: LoudnessBoostMode;
  enginePhase: SpeechEnginePhase;
  sessionEpoch: number;
  bufferStats: AudioBufferStats;
}

const PREFERRED_VOICE_KEY = 'CLEANROOM_PREFERRED_VOICE_URI';
const PREFERRED_TAIWAN_VOICE_KEY = 'CLEANROOM_TAIWAN_VOICE_URI';
const PREFERRED_ACCENT_MODE_KEY = 'CLEANROOM_ACCENT_MODE';
const PREFERRED_PITCH_KEY = 'CLEANROOM_SPEECH_PITCH';
const PREFERRED_STYLE_KEY = 'CLEANROOM_SPEECH_STYLE';
const PREFERRED_VOLUME_KEY = 'CLEANROOM_SPEECH_VOLUME';
const PREFERRED_LOUDNESS_BOOST_KEY = 'CLEANROOM_LOUDNESS_BOOST';
const PREFERRED_VOICE_ENGINE_KEY = 'CLEANROOM_VOICE_ENGINE';

export type VoiceEngineMode = 'auto' | 'cloud_hd' | 'local_only';

// 判斷是否為行動裝置環境 (iOS / Android / iPadOS)
export const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod|Android|Mobile|Silk|BlackBerry|Opera Mini/i.test(ua) ||
    (navigator.maxTouchPoints !== undefined && navigator.maxTouchPoints > 2);
};

// 全域防止 V8 / WebKit GC (Garbage Collection) 回收活躍 Utterance 的常駐集合
if (typeof window !== 'undefined') {
  (window as any).__FSE_ACTIVE_UTTERANCES__ = (window as any).__FSE_ACTIVE_UTTERANCES__ || new Set<SpeechSynthesisUtterance>();
}

/**
 * 晶圓半導體專用術語自然音訊發音字典 (精準展開工程縮寫與計量單位，保持標準英語單字完整自然發音)
 */
const TECHNICAL_PRONUNCIATION_MAP: [RegExp, string][] = [
  // 晶圓搬送、載具與自動化縮寫 (AMHS / EFEM / Fab Robotics) — 採用無塵室工程師標準自然連讀，杜絕單字母拆解造成的斷句感
  [/\bFOUPs\b/g, 'foops'],
  [/\bFOUP\b/g, 'foop'],
  [/\bFOUPS\b/g, 'foops'],
  [/\bSMIF\b/g, 'smiff'],
  [/\bSECS\/GEM\b/gi, 'S E C S gem'],
  [/\bSECS-GEM\b/gi, 'S E C S gem'],
  [/\bSECS\b/g, 'S E C S'],
  [/\bLOTO\b/g, 'lockout tagout'],
  [/\bMFCs\b/g, 'M F C s'],
  [/\bMFC\b/g, 'M F C'],
  [/\bOHT\b/g, 'O H T'],
  [/\bAGV\b/g, 'A G V'],
  [/\bAMHS\b/g, 'A M H S'],
  [/\bEFEM\b/g, 'E F E M'],
  [/\bFSE\b/g, 'F S E'],
  [/\bWIP\b/g, 'W I P'],
  [/\bEMO\b/g, 'E M O'],
  [/\bEPO\b/g, 'E P O'],
  [/\bE-Stop\b/gi, 'E stop'],
  [/\bEstop\b/gi, 'E stop'],
  [/\bFFU\b/g, 'F F U'],
  [/\bESD\b/g, 'E S D'],
  [/\bPLC\b/g, 'P L C'],
  [/\bHMI\b/g, 'H M I'],
  [/\bTCU\b/g, 'T C U'],
  [/\bCIP\b/g, 'C I P'],
  [/\bPFD\b/g, 'P F D'],
  [/\bloadport\b/gi, 'load port'],
  [/\bloadports\b/gi, 'load ports'],

  // 光學檢測與封裝通用縮寫 (Optical Inspection & Packaging)
  [/\bAOI\b/g, 'A O I'],
  [/\bOCV\b/g, 'O C V'],
  [/\bOCR\b/g, 'O C R'],
  [/\bPC\b/g, 'P C'],
  [/\b2D\b/gi, 'two D'],
  [/\bC4\b/g, 'C four'],

  // 微影、黃光與曝光系統 (Photolithography & Track)
  [/\bEUV\b/g, 'E U V'],
  [/\bDUV\b/g, 'D U V'],
  [/\bHigh-NA\b/gi, 'High N A'],
  [/\bHigh NA\b/gi, 'High N A'],
  [/\bArFi\b/g, 'A R F immersion'],
  [/\bArF\b/g, 'A R F'],
  [/\bKrF\b/g, 'K R F'],
  [/\bi-line\b/gi, 'i line'],
  [/\bEBR\b/g, 'E B R'],
  [/\bPEB\b/g, 'P E B'],
  [/\bTMAH\b/g, 'T M A H'],
  [/\bEUV Pod\b/gi, 'E U V pod'],
  [/\bEUV Pods\b/gi, 'E U V pods'],

  // 先進封裝與奈米節點 (Advanced Packaging & Leading Edge Nodes)
  [/\bCoWoS\b/gi, 'CoWoS'],
  [/\bInFO\b/g, 'InFO'],
  [/\bSoIC\b/g, 'S O I C'],
  [/\bTSV\b/g, 'T S V'],
  [/\bTSVs\b/g, 'T S V s'],
  [/\bGAA\b/g, 'G A A'],
  [/\bBackside PDN\b/gi, 'backside P D N'],

  // 半導體製程與機台模組 (Process & Equipment)
  [/\bCVD\b/g, 'C V D'],
  [/\bPVD\b/g, 'P V D'],
  [/\bCMP\b/g, 'C M P'],
  [/\bALD\b/g, 'A L D'],
  [/\bRTP\b/g, 'R T P'],
  [/\bESC\b/g, 'E S C'],
  [/\bE-Chuck\b/gi, 'E chuck'],
  [/\bRF\b/g, 'R F'],
  [/\bDMM\b/g, 'D M M'],
  [/\bRGA\b/g, 'R G A'],
  [/\bHBC\b/g, 'H B C'],
  [/\bICP\b/g, 'I C P'],
  [/\bCCP\b/g, 'C C P'],
  [/\bECN\b/g, 'E C N'],

  // 真空、閥件與廠務系統縮寫 (Vacuum, Valves & Sub-Fab)
  [/\bTMP\b/g, 'T M P'],
  [/\bEPD\b/g, 'E P D'],
  [/\bOES\b/g, 'O E S'],
  [/\bTGMS\b/g, 'T G M S'],
  [/\bUPW\b/g, 'U P W'],
  [/\bPOU\b/g, 'P O U'],
  [/\bPCW\b/g, 'P C W'],
  [/\bend-effector\b/gi, 'end effector'],

  // 化學品、氣體與廠務安全 (Chemicals & Safety)
  [/\bIPA\b/g, 'I P A'],
  [/\bDIW\b/g, 'D I water'],
  [/\bDI Water\b/gi, 'D I water'],
  [/\bCDA\b/g, 'C D A'],
  [/\bSC-?1\b/g, 'S C 1'],
  [/\bSC-?2\b/g, 'S C 2'],
  [/\bSPM\b/g, 'S P M'],
  [/\bBOE\b/g, 'B O E'],
  [/\bHF\b/g, 'H F'],
  [/\bDHF\b/g, 'dilute H F'],
  [/\bTEOS\b/g, 'T E O S'],
  [/\bPPE\b/g, 'P P E'],
  [/\bCF4\b/g, 'C F 4'],
  [/\bCHF3\b/g, 'C H F 3'],
  [/\bC4F8\b/g, 'C 4 F 8'],
  [/\bSF6\b/g, 'S F 6'],
  [/\bNF3\b/g, 'N F 3'],
  [/\bN2O\b/g, 'N 2 O'],
  [/\bN2\b/g, 'N 2'],
  [/\bO2\b/g, 'O 2'],
  [/\bH2O2\b/g, 'H 2 O 2'],
  [/\bH2\b/g, 'H 2'],
  [/\bNH3\b/g, 'N H 3'],
  [/\bSiH4\b/g, 'S I H 4'],
  [/\bWF6\b/g, 'W F 6'],
  [/\bCl2\b/g, 'C L 2'],
  [/\bBCl3\b/g, 'B C L 3'],
  [/\bHBr\b/g, 'H B R'],
  [/\bVHP\b/g, 'V H P'],
  [/\bAMC\b/g, 'A M C'],
  [/\bLPCVD\b/g, 'L P C V D'],
  [/\bPECVD\b/g, 'P E C V D'],
  [/\bHDPCVD\b/g, 'H D P C V D'],
  [/\bSACVD\b/g, 'S A C V D'],
  [/\bRIE\b/g, 'R I E'],
  [/\bDRIE\b/g, 'D R I E'],
  [/\bALE\b/g, 'A L E'],

  // 維修與品管規範 (Maintenance & Quality)
  [/\bSOP\b/g, 'S O P'],
  [/\bOCAP\b/g, 'O C A P'],
  [/\bFMEA\b/g, 'F M E A'],
  [/\bSPC\b/g, 'S P C'],
  [/\bCPK\b/gi, 'C P K'],
  [/\bPM\b/g, 'P M'],
  [/\bBM\b/g, 'B M'],
  [/\bTAT\b/g, 'T A T'],
  [/\bMTBF\b/g, 'M T B F'],
  [/\bMTTR\b/g, 'M T T R'],
  [/\bMES\b/g, 'M E S'],
  [/\bSVO\b/g, 'S V O'],
  [/\bOOC\b/g, 'O O C'],
  [/\bOOS\b/g, 'O O S'],

  // 物理量與計量單位展開 (Units & Physical Metrics)
  [/\b(\d+)\s*°C\b/gi, '$1 degrees Celsius'],
  [/\b°C\b/g, 'degrees Celsius'],
  [/\b(\d+)\s*kW\b/gi, '$1 kilowatts'],
  [/\b(\d+)\s*kHz\b/gi, '$1 kilohertz'],
  [/\b(\d+)\s*MHz\b/gi, '$1 megahertz'],
  [/\b(\d+)\s*GHz\b/gi, '$1 gigahertz'],
  [/\b(\d+)\s*sccm\b/gi, '$1 S C C M'],
  [/\b(\d+)\s*SCCM\b/g, '$1 S C C M'],
  [/\b(\d+)\s*slm\b/gi, '$1 S L M'],
  [/\b(\d+)\s*SLM\b/g, '$1 S L M'],
  [/\b(\d+)\s*mTorr\b/gi, '$1 millitorr'],
  [/\b(\d+)\s*Torr\b/gi, '$1 torr'],
  [/\b(\d+)\s*nm\b/gi, '$1 nanometers'],
  [/\b(\d+)\s*μm\b/gi, '$1 microns'],
  [/\b(\d+)\s*um\b/gi, '$1 microns'],
  [/\b(\d+)\s*mm\b/g, '$1 millimeters'],
  [/\b(\d+)\s*cm\b/g, '$1 centimeters'],
  [/\b(\d+)\s*mL\b/gi, '$1 milliliters'],
  [/\b(\d+)\s*Å\b/gi, '$1 angstroms'],
  [/\b(\d+)\s*RPM\b/gi, '$1 R P M'],
  [/\b(\d+)\s*rpm\b/gi, '$1 R P M'],
  [/\b(\d+)\s*psi\b/gi, '$1 P S I'],
  [/\b(\d+)\s*PSI\b/g, '$1 P S I'],
  [/\b(\d+)\s*Pa\b/g, '$1 pascals'],
  [/\b(\d+)\s*kPa\b/gi, '$1 kilopascals'],
  [/\b(\d+)\s*mbar\b/gi, '$1 millibar'],
  [/\b(\d+)\s*kV\b/gi, '$1 kilovolts'],
  [/\b(\d+)\s*mV\b/gi, '$1 millivolts'],
  [/\b(\d+)\s*mA\b/gi, '$1 milliamps'],
  [/±/g, 'plus or minus '],

  // 常用專業書面縮寫展開 (Common Engineering Abbreviations)
  [/\be\.g\.,?\b/gi, 'for example,'],
  [/\bi\.e\.,?\b/gi, 'that is,'],
  [/\bvs\./gi, 'versus'],
  [/\betc\./gi, 'etcetera'],
  [/\bapprox\./gi, 'approximately'],
  [/#(\d+)\b/g, 'number $1'],
  [/\bno\.\s*(\d+)/gi, 'number $1'],
  [/\bw\/\s+/gi, 'with '],
  [/\bw\/o\s+/gi, 'without '],
  [/\bOn\/Off\b/gi, 'On or Off'],
  [/\bIn\/Out\b/gi, 'In or Out'],
  [/\bPass\/Fail\b/gi, 'Pass or Fail'],
  [/\bLock\/Tag\b/gi, 'Lock and Tag'],
  [/\bRun\/Stop\b/gi, 'Run or Stop'],
  [/\bOpen\/Close\b/gi, 'Open or Close'],
  [/\bload-lock\b/gi, 'load lock'],
  [/\bloadlock\b/gi, 'load lock'],
  [/\bsub-fab\b/gi, 'sub fab'],
  [/\bsubfab\b/gi, 'sub fab'],
  [/\bo-ring\b/gi, 'O ring'],
  [/\bo-rings\b/gi, 'O rings']
];

/**
 * 台灣半導體在地發音與中文術語正音字典 (Taiwan Fab Accent & Acronym Normalization Map)
 * 專注精準展開無塵室縮寫，保持標準英語單字完整自然，不破壞單字原生讀音
 */
export const TAIWAN_FAB_PHONETIC_REPLACEMENTS: [RegExp, string][] = [
  [/\bFOUPs\b/g, 'foops'],
  [/\bFOUP\b/g, 'foop'],
  [/\bSMIF\b/g, 'smiff'],
  [/\bLOTO\b/g, 'lockout tagout'],
  [/\bloadport\b/gi, 'load port'],
  [/\bloadports\b/gi, 'load ports'],
  [/\bOOC\b/g, 'O O C'],
  [/\bOOS\b/g, 'O O S'],
  [/\bOCAP\b/g, 'O C A P'],
  [/\bSECS\/GEM\b/gi, 'S E C S gem'],
  [/\bSECS\b/g, 'S E C S'],
  [/\bCD-?SEM\b/gi, 'C D S E M'],
  [/\bTEM\b/g, 'T E M'],
  [/\bFIB\b/g, 'F I B'],
  [/\bCMP\b/g, 'C M P'],
  [/\bPVD\b/g, 'P V D'],
  [/\bCVD\b/g, 'C V D'],
  [/\bALD\b/g, 'A L D'],
  [/\bEUV\b/g, 'E U V'],
  [/\bDUV\b/g, 'D U V'],
  [/\bMFC\b/g, 'M F C'],
  [/\bsccm\b/gi, 'S C C M'],
  [/\bmTorr\b/gi, 'millitorr'],
  [/\bend-effector\b/gi, 'end effector'],
  [/\bE-Stop\b/gi, 'E stop']
];

/**
 * 台灣在地繁體中文半導體名詞正音字典（避免 TTS 發出奇怪捲舌音或多音字錯誤）
 */
export const TAIWAN_MANDARIN_CHINESE_NORMALIZATION: [RegExp, string][] = [
  [/矽/g, '矽'],
  [/沉積/g, '沉積'],
  [/蝕刻/g, '蝕刻'],
  [/閘閥/g, '閘閥'],
  [/閥門/g, '閥門'],
  [/閥件/g, '閥件'],
  [/卡匣/g, '卡匣'],
  [/晶圓/g, '晶圓'],
  [/光阻/g, '光阻'],
  [/腔體/g, '腔體'],
  [/巡檢/g, '巡檢'],
  [/交接/g, '交接'],
  [/機台/g, '機台']
];

/**
 * 『語音流智慧預處理器』(Intelligent Speech Prosody & Lexicon Preprocessor)
 * 保持標準英語自然連音與母語句子結構，僅清理括號註解與展開純縮寫
 */
export function preprocessSpeechText(input: string, isEnglish: boolean = true, customAccentMode?: AccentMode): string {
  if (!input) return "";

  let text = input;
  const accentMode = customAccentMode || getPreferredAccentMode();

  // 1. 正規化引號、撇號、破折號與機台編號 (#1 -> number 1)
  text = text.replace(/[’‘`]/g, "'");
  text = text.replace(/[“”]/g, '"');
  text = text.replace(/[–—]/g, ', ');
  if (isEnglish) {
    text = text.replace(/#(\d+)\b/g, 'number $1');
  }

  // 2. 移除 Markdown 標記
  text = text.replace(/[*_#`~>]/g, " ");

  // 3. 全面過濾所有半形與全形括號及其內部註釋文字 (Subject / Object / 中文說明 / Emoji)
  text = text.replace(/\([^\)]*\)/g, " ");
  text = text.replace(/（[^）]*）/g, " ");
  text = text.replace(/\[[^\]]*\]/g, " ");
  text = text.replace(/【[^】]*】/g, " ");
  text = text.replace(/\{[^\}]*\}/g, " ");

  if (isEnglish) {
    // 4. 移除殘留中文字元與全形符號
    text = text.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g, " ");
  }

  // 5. 移除 Emoji 與特殊圖形符號
  text = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, " ");

  // 6. 套用晶圓廠專用術語縮寫展開
  if (isEnglish) {
    for (const [pattern, replacement] of TECHNICAL_PRONUNCIATION_MAP) {
      text = text.replace(pattern, replacement);
    }
  }

  // 7. 若開啟「台灣晶圓廠在地口音模式」，套用台灣工程師縮寫對齊
  if (isEnglish && (accentMode === 'tw_fab' || accentMode === 'tw_mandarin_bilingual')) {
    for (const [pattern, replacement] of TAIWAN_FAB_PHONETIC_REPLACEMENTS) {
      text = text.replace(pattern, replacement);
    }
  }

  // 8. 若為中文發音，套用台灣在地國語半導體專業名詞規範
  if (!isEnglish) {
    for (const [pattern, replacement] of TAIWAN_MANDARIN_CHINESE_NORMALIZATION) {
      text = text.replace(pattern, replacement);
    }
  }

  // 9. 將單詞間的斜線替換為自然空格
  text = text.replace(/([a-zA-Z0-9])\/([a-zA-Z0-9])/g, "$1 $2");

  // 10. 移除多餘非法標點，保留基本發音停頓標點
  text = text.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s.,'?!:%+\-]/g, " ");

  // 11. 標準化連續標點與空白（不人工強插碎裂逗號，保留母語自然連貫語流）
  text = text.replace(/\.{2,}/g, ".");
  text = text.replace(/,{2,}/g, ",");
  text = text.replace(/:\s*/g, ", ");
  text = text.replace(/;\s*/g, ", ");
  text = text.replace(/^[,\s]+/g, "");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

export function cleanEnglishText(input: string): string {
  return preprocessSpeechText(input, true);
}

/**
 * 將標記了【 戴 · 醬普 · 森瑟 】的台味諧音轉換成自然可朗讀的中文音節，
 * 避免直接被 preprocessSpeechText 的括號過濾器清空為空字串。
 */
export function prepareTaiwanPhoneticForSpeech(phonetic: string): string {
  if (!phonetic) return "";
  let text = phonetic
    .replace(/[\[\]【】\(\)（）\{\}]/g, " ")
    .replace(/[·｜|•\/]/g, "，")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Normalize comma spacing for crisp syllable pacing
  text = text.replace(/，+/g, "，").replace(/^，+|，+$/g, "");
  return preprocessSpeechText(text, false);
}

/**
 * 從混合中英組件字串 (例如 "I (👤 我)" 或 "the sensor (📦 那個感應器)")
 * 分別抽出純英文與純中文意義
 */
export function extractBilingualComponent(input: string): { english: string; chinese: string } {
  if (!input) return { english: "", chinese: "" };
  const english = cleanEnglishText(input);
  const parenMatches = input.match(/[\(（]([^\)）]*)[\)）]/g) || [];
  let chineseCandidate = parenMatches
    .map((m) => m.slice(1, -1))
    .join(" ");
  // Keep only Chinese characters and basic punctuation, removing emoji/tags
  chineseCandidate = chineseCandidate
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/[a-zA-Z]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!chineseCandidate) {
    // Fallback: extract CJK directly from input
    const cjk = input.match(/[\u4e00-\u9fa5]+/g);
    chineseCandidate = cjk ? cjk.join(" ") : "";
  }
  return {
    english,
    chinese: preprocessSpeechText(chineseCandidate, false)
  };
}

export interface DetectedPhoneticTerm {
  term: string;
  phonetic: string;
}

export function analyzePhoneticTransformations(input: string): {
  original: string;
  processed: string;
  detectedTerms: DetectedPhoneticTerm[];
} {
  if (!input) return { original: '', processed: '', detectedTerms: [] };
  const detectedTerms: DetectedPhoneticTerm[] = [];

  for (const [pattern, replacement] of TECHNICAL_PRONUNCIATION_MAP) {
    const match = input.match(pattern);
    if (match && match.length > 0) {
      for (const matchedStr of match) {
        if (!detectedTerms.some(d => d.term.toLowerCase() === matchedStr.toLowerCase())) {
          detectedTerms.push({
            term: matchedStr,
            phonetic: replacement
          });
        }
      }
    }
  }

  const processed = preprocessSpeechText(input, true);
  return {
    original: input,
    processed,
    detectedTerms
  };
}

/**
 * 強化發音專用預處理器 (Enhanced Pronunciation Text Preprocessor)
 * 保持自然母語連貫語調，不插入碎裂逗號，僅確保縮寫清晰展開
 */
export function preprocessEnhancedPronunciationText(input: string): string {
  if (!input) return "";
  return preprocessSpeechText(input, true);
}

export type EqualizerProfileId = 'cleanroom_penetration' | 'mask_compensation' | 'commute_boost' | 'studio_fidelity' | 'pronunciation_enhancer';

export interface EqualizerProfile {
  id: EqualizerProfileId;
  name: string;
  subtitle: string;
  desc: string;
  bands: {
    hz80: number;   // -12 to +12 dB
    hz300: number;  // -12 to +12 dB
    hz1k: number;   // -12 to +12 dB
    hz3k5: number;  // -12 to +12 dB
    hz8k: number;   // -12 to +12 dB
  };
  recommendedFor: string;
}

export const EQUALIZER_PROFILES: EqualizerProfile[] = [
  {
    id: 'pronunciation_enhancer',
    name: '⚡ 強化發音·母音共振與子音爆破',
    subtitle: 'Consonant Attack & Syllable Clarity',
    desc: '極致加強發音細節：顯著拉升 2.8kHz~4.5kHz 子音爆破音 (-t, -p, -k, -d) 與字尾摩擦音 (-s, -th, -sh)，強化 1kHz 母音清晰共鳴，杜絕含糊吞字。',
    bands: { hz80: -5, hz300: -2, hz1k: +4, hz3k5: +8, hz8k: +6 },
    recommendedFor: '語音跟讀練習、弱音拆解、口音校正'
  },
  {
    id: 'cleanroom_penetration',
    name: '晶圓無塵室人聲穿透',
    subtitle: 'Consonant Boost & Low-Cut',
    desc: '濾除 80Hz/300Hz 機台與 FFU 風機共振低頻，顯著增強 3.5kHz 人聲子音爆破音，確保在層流環境下每字精準入耳。',
    bands: { hz80: -6, hz300: -4, hz1k: +2, hz3k5: +6, hz8k: +3 },
    recommendedFor: '無塵室實戰、機台維修與交接巡檢'
  },
  {
    id: 'mask_compensation',
    name: '防塵面罩/口罩悶音補償',
    subtitle: 'Mask De-muffle & High Clarity',
    desc: '針對配戴防塵口罩或無塵全罩式頭盔時造成的物理高頻悶音衰減進行深度補償，拉升 1kHz~8kHz 頻段。',
    bands: { hz80: -3, hz300: -2, hz1k: +3, hz3k5: +7, hz8k: +5 },
    recommendedFor: '配戴無塵全罩裝備、護目鏡時'
  },
  {
    id: 'commute_boost',
    name: '通勤與開車抗噪增強',
    subtitle: 'Road Noise Rejection & Max Loudness',
    desc: '增強中頻 1kHz~3.5kHz 核心人聲厚度，並壓制車內低頻路噪與胎噪，確保單字音量極致清晰飽滿。',
    bands: { hz80: -5, hz300: -3, hz1k: +4, hz3k5: +5, hz8k: +2 },
    recommendedFor: '開車通勤、捷運與戶外嘈雜環境'
  },
  {
    id: 'studio_fidelity',
    name: '原音高傳真監聽',
    subtitle: 'Flat Response Studio Reference',
    desc: '全頻段無染色平坦輸出 (Flat)，保留語音合成引擎最原始自然的母語聲線細節。',
    bands: { hz80: 0, hz300: 0, hz1k: 0, hz3k5: 0, hz8k: 0 },
    recommendedFor: '安靜室內、高解析入耳式耳機精聽'
  }
];

export function getPreferredEqualizerProfile(): EqualizerProfileId {
  try {
    const saved = localStorage.getItem('CLEANROOM_EQUALIZER_PROFILE');
    if (saved && EQUALIZER_PROFILES.some(p => p.id === saved)) {
      return saved as EqualizerProfileId;
    }
  } catch {}
  return 'cleanroom_penetration';
}

export function setPreferredEqualizerProfile(id: EqualizerProfileId): void {
  try {
    localStorage.setItem('CLEANROOM_EQUALIZER_PROFILE', id);
  } catch {}
}

/**
 * 偏好設定持久化管理 (Voice URI, Pitch, Style Preset, Volume, Loudness Boost)
 */
export function getPreferredVoiceURI(): string | null {
  try {
    return localStorage.getItem(PREFERRED_VOICE_KEY);
  } catch {
    return null;
  }
}

export function setPreferredVoiceURI(uri: string | null): void {
  try {
    if (uri) {
      localStorage.setItem(PREFERRED_VOICE_KEY, uri);
    } else {
      localStorage.removeItem(PREFERRED_VOICE_KEY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fse-voice-changed', { detail: { uri } }));
    }
  } catch {}
}

export function getPreferredTaiwanVoiceURI(): string | null {
  try {
    return localStorage.getItem(PREFERRED_TAIWAN_VOICE_KEY);
  } catch {
    return null;
  }
}

export function setPreferredTaiwanVoiceURI(uri: string | null): void {
  try {
    if (uri) {
      localStorage.setItem(PREFERRED_TAIWAN_VOICE_KEY, uri);
    } else {
      localStorage.removeItem(PREFERRED_TAIWAN_VOICE_KEY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fse-voice-changed', { detail: { uri } }));
    }
  } catch {}
}

export function getPreferredAccentMode(): AccentMode {
  try {
    const saved = localStorage.getItem(PREFERRED_ACCENT_MODE_KEY);
    if (saved === 'tw_fab' || saved === 'us_standard' || saved === 'tw_mandarin_bilingual') {
      return saved as AccentMode;
    }
  } catch {}
  return 'us_standard'; // 預設使用美式國際標準原音
}

export function setPreferredAccentMode(mode: AccentMode): void {
  try {
    localStorage.setItem(PREFERRED_ACCENT_MODE_KEY, mode);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fse-voice-changed', { detail: { mode } }));
    }
  } catch {}
}

export function getPreferredSpeechVolume(): number {
  try {
    const saved = localStorage.getItem(PREFERRED_VOLUME_KEY);
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= 0.2 && val <= 1.0) {
        return val;
      }
    }
  } catch {}
  return 1.0; // 預設最大音量 (100% 響度輸出)
}

export function setPreferredSpeechVolume(volume: number): void {
  try {
    const clamped = Math.max(0.2, Math.min(1.0, volume));
    localStorage.setItem(PREFERRED_VOLUME_KEY, clamped.toString());
  } catch {}
}

export function getPreferredLoudnessBoost(): LoudnessBoostMode {
  try {
    const saved = localStorage.getItem(PREFERRED_LOUDNESS_BOOST_KEY);
    if (saved === 'standard' || saved === 'loud' || saved === 'boost_max') {
      return saved as LoudnessBoostMode;
    }
  } catch {}
  return 'standard'; // 預設標準自然原聲模式
}

export function setPreferredLoudnessBoost(mode: LoudnessBoostMode): void {
  try {
    localStorage.setItem(PREFERRED_LOUDNESS_BOOST_KEY, mode);
  } catch {}
}

export function getPreferredSpeechPitch(): number {
  try {
    const saved = localStorage.getItem(PREFERRED_PITCH_KEY);
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= 0.8 && val <= 1.25) {
        return val;
      }
    }
  } catch {}
  return 1.0;
}

export function setPreferredSpeechPitch(pitch: number): void {
  try {
    const clamped = Math.max(0.8, Math.min(1.25, pitch));
    localStorage.setItem(PREFERRED_PITCH_KEY, clamped.toString());
  } catch {}
}

export function getPreferredSpeechStyle(): SpeechStylePreset {
  try {
    const saved = localStorage.getItem(PREFERRED_STYLE_KEY);
    if (saved === 'cleanroom' || saved === 'natural' || saved === 'slow_clarity') {
      return saved as SpeechStylePreset;
    }
  } catch {}
  return 'natural'; // 預設美式自然連音原音
}

export function setPreferredSpeechStyle(style: SpeechStylePreset): void {
  try {
    localStorage.setItem(PREFERRED_STYLE_KEY, style);
  } catch {}
}

export function getPreferredVoiceEngine(): VoiceEngineMode {
  try {
    const saved = localStorage.getItem(PREFERRED_VOICE_ENGINE_KEY);
    if (saved === 'auto' || saved === 'cloud_hd' || saved === 'local_only') {
      return saved;
    }
  } catch {}
  return 'cloud_hd';
}

export function setPreferredVoiceEngine(mode: VoiceEngineMode): void {
  try {
    localStorage.setItem(PREFERRED_VOICE_ENGINE_KEY, mode);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fse-voice-changed', { detail: { engineMode: mode } }));
    }
  } catch {}
}

/**
 * 恢復所有語音設定為系統預設值
 */
export function restoreDefaultVoiceSettings(): void {
  try {
    localStorage.removeItem(PREFERRED_VOICE_KEY);
    localStorage.removeItem(PREFERRED_TAIWAN_VOICE_KEY);
    localStorage.removeItem(PREFERRED_ACCENT_MODE_KEY);
    localStorage.removeItem(PREFERRED_LOUDNESS_BOOST_KEY);
    localStorage.removeItem(PREFERRED_STYLE_KEY);
    localStorage.removeItem(PREFERRED_PITCH_KEY);
    localStorage.removeItem(PREFERRED_VOLUME_KEY);
    localStorage.removeItem(PREFERRED_VOICE_ENGINE_KEY);
  } catch {}
  resetSpeechEngine();
}

/**
 * 語音清單快取與智慧分級管理
 */
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesReadyResolvers: Array<(voices: SpeechSynthesisVoice[]) => void> = [];
let speechEngineInitPromise: Promise<void> | null = null;

function notifyVoicesReady(list: SpeechSynthesisVoice[]): void {
  if (list.length > 0 && voicesReadyResolvers.length > 0) {
    const pending = voicesReadyResolvers;
    voicesReadyResolvers = [];
    pending.forEach((fn) => {
      try {
        fn(list);
      } catch {}
    });
  }
}

export function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    const list = window.speechSynthesis.getVoices() || [];
    if (list && list.length > 0) {
      cachedVoices = list;
      notifyVoicesReady(list);
    }
  } catch (e) {
    console.warn("loadVoices error:", e);
  }
  return cachedVoices;
}

export function getAllAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const list = window.speechSynthesis.getVoices() || [];
      if (list && list.length > 0) {
        cachedVoices = list;
        notifyVoicesReady(list);
        return list;
      }
    } catch {}
  }
  return cachedVoices;
}

/**
 * 等待系統 Web Speech 聲線列表完成非同步初始化（解決冷啟動首句 getVoices() 回傳空陣列的競態問題）
 */
export function ensureVoicesReady(timeoutMs: number = 950): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([]);
  }
  const existing = getAllAvailableVoices();
  if (existing.length > 0) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve) => {
    let settled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (voices: SpeechSynthesisVoice[]) => {
      if (settled) return;
      settled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      voicesReadyResolvers = voicesReadyResolvers.filter((fn) => fn !== onReady);
      resolve(voices);
    };

    const onReady = (voices: SpeechSynthesisVoice[]) => finish(voices);
    voicesReadyResolvers.push(onReady);

    pollTimer = setInterval(() => {
      const current = loadVoices();
      if (current.length > 0) {
        finish(current);
      }
    }, 60);

    timeoutTimer = setTimeout(() => {
      finish(loadVoices());
    }, Math.max(150, timeoutMs));
  });
}

/**
 * 冪等式 TTS 引擎冷啟動初始化（同步確保 AudioContext 喚醒與系統聲線列表就緒）
 */
export function ensureSpeechEngineInitialized(timeoutMs: number = 900): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!speechEngineInitPromise) {
    speechEngineInitPromise = (async () => {
      await Promise.all([
        ensureSharedAudioContextRunning(Math.min(700, timeoutMs)).catch(() => null),
        ensureVoicesReady(timeoutMs).catch(() => [])
      ]);
    })().finally(() => {
      // 若初始化時尚未載入任何語音或 AudioContext 仍暫停，允許後續呼叫再次嘗試初始化
      const ctx = getSharedAudioContext();
      const ctxReady = !ctx || ctx.state === 'running';
      const voicesReady = !('speechSynthesis' in window) || cachedVoices.length > 0;
      if (!ctxReady || !voicesReady) {
        speechEngineInitPromise = null;
      }
    });
  }
  return speechEngineInitPromise;
}

/**
 * 高階自然語音聲學校驗評分系統 (Acoustic Natural Voice Scoring Engine)
 * 自動識別並置頂業界頂級神經網路/自然聲線 (Microsoft Natural, Apple Premium/Enhanced, Google US English)
 */
export function scoreEnglishVoice(v: SpeechSynthesisVoice): number {
  const name = (v.name || '').toLowerCase();
  const lang = (v.lang || '').toLowerCase();
  let score = 0;

  // 必須為純英文聲線
  if (!lang.startsWith('en') && !name.includes('english')) return -1000;
  if (lang.startsWith('zh') || lang.includes('taiwan') || lang.includes('chinese') || name.includes('chinese') || name.includes('taiwan') || name.includes('國語')) {
    return -1000;
  }

  // 0. 優先選擇本機低延遲語音引擎 (localService === true)，徹底消除遠端 Online WebSocket 2500ms+ 延遲與斷線問題
  if (v.localService) {
    score += 90;
  } else {
    score -= 35;
  }

  // 1. 高階自然聲線加分
  if (name.includes('premium')) score += 70;
  if (name.includes('enhanced')) score += 65;
  if (name.includes('natural')) score += 45;
  if (name.includes('neural')) score += 40;
  if (name.includes('online')) score -= 25;

  // 2. 業界頂級旗艦女性自然聲線（語感溫和清晰，適合日常實戰學習）
  if (name.includes('samantha') || name.includes('allison') || name.includes('susan') || name.includes('ava') || name.includes('jenny') || name.includes('aria') || name.includes('michelle') || name.includes('emma') || name.includes('zira')) {
    score += 65;
  }

  // 3. 業界頂級旗艦男性自然聲線（渾厚穩重，適合技術工程交流）
  if (name.includes('alex') || name.includes('tom') || name.includes('evan') || name.includes('guy') || name.includes('christopher') || name.includes('eric') || name.includes('brian') || name.includes('daniel')) {
    score += 55;
  }

  // 4. Google US English (Android / Chrome 原音，發音標準)
  if (name.includes('google us english') || name.includes('google english') || name.includes('en-us-x-')) {
    score += 65;
  }

  // 5. 語言區域權重 (美式英語 en-US 為國際晶圓廠標準優先)
  if (lang === 'en-us' || lang === 'en_us' || name.includes('united states') || name.includes('us english')) {
    score += 45;
  } else if (lang.startsWith('en')) {
    score += 15;
  }

  // 6. 降低低取樣率合成器
  if (name.includes('compact') || name.includes('espeak') || name.includes('legacy') || name.includes('whisper') || name.includes('sample')) {
    score -= 100;
  }

  return score;
}

export function scoreTaiwanVoice(v: SpeechSynthesisVoice): number {
  const name = (v.name || '').toLowerCase();
  const lang = (v.lang || '').toLowerCase();
  let score = 0;

  const isTW = lang.includes('tw') || lang.includes('taiwan') || name.includes('taiwan') || name.includes('台灣') || name.includes('臺灣') || name.includes('國語') || name.includes('繁體');
  if (!isTW && !lang.startsWith('zh')) return -1000;

  if (isTW) score += 55;

  // 優先本機零延遲語音引擎
  if (v.localService) {
    score += 85;
  } else {
    score -= 30;
  }

  // 自然旗艦聲線
  if (name.includes('premium') || name.includes('enhanced')) score += 60;
  if (name.includes('natural')) score += 40;
  if (name.includes('online')) score -= 20;

  // 知名台灣國語聲線
  if (name.includes('mei-jia') || name.includes('meijia') || name.includes('hanhan') || name.includes('yating') || name.includes('zhiwei')) score += 65;
  if (name.includes('hsiaochen') || name.includes('yunjhe') || name.includes('hsiaoyu')) score += 50;
  if (name.includes('sinji') || name.includes('tingting')) score += 35;
  if (name.includes('google') && isTW) score += 55;

  if (name.includes('compact') || name.includes('espeak')) {
    score -= 80;
  }

  return score;
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  const list = getAllAvailableVoices();
  const filtered = list.filter(v => {
    const l = (v.lang || '').toLowerCase();
    const n = (v.name || '').toLowerCase();
    if (l.startsWith('zh') || l.includes('taiwan') || l.includes('chinese') || n.includes('chinese') || n.includes('taiwan') || n.includes('國語')) {
      return false;
    }
    return l.startsWith('en') || l.includes('en-') || l.includes('en_') || n.includes('english') || n.includes('us english');
  });

  return filtered.sort((a, b) => scoreEnglishVoice(b) - scoreEnglishVoice(a));
}

export function getTaiwanChineseVoices(): SpeechSynthesisVoice[] {
  const list = getAllAvailableVoices();
  const twList = list.filter(v => {
    const l = (v.lang || '').toLowerCase();
    const n = (v.name || '').toLowerCase();
    return (
      l.includes('tw') ||
      l.includes('taiwan') ||
      n.includes('taiwan') ||
      n.includes('台灣') ||
      n.includes('臺灣') ||
      n.includes('國語') ||
      n.includes('hsiaochen') ||
      n.includes('yunjhe') ||
      n.includes('zhiwei') ||
      n.includes('hsiaoyu') ||
      n.includes('mei-jia') ||
      n.includes('tingting') ||
      n.includes('sinji') ||
      n.includes('hanhan')
    );
  });
  const targetList = twList.length > 0 ? twList : list.filter(v => (v.lang || '').toLowerCase().startsWith('zh'));
  return targetList.sort((a, b) => scoreTaiwanVoice(b) - scoreTaiwanVoice(a));
}

/**
 * 最佳美式英語聲線智慧篩選器 (自動匹配高音質自然旗艦聲線)
 */
export function findStandardEnglishVoice(voices?: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const list = (voices && voices.length > 0) ? voices.filter(v => scoreEnglishVoice(v) > -500).sort((a, b) => scoreEnglishVoice(b) - scoreEnglishVoice(a)) : getEnglishVoices();
  if (!list || list.length === 0) return null;

  // 使用者自選偏好優先 (需確保存在於當前清單)
  const preferredURI = getPreferredVoiceURI();
  if (preferredURI) {
    const userChoice = list.find(v => v.voiceURI === preferredURI);
    if (userChoice) return userChoice;
  }

  // 自動挑選評分最高之頂級自然聲線
  return list[0] || null;
}

/**
 * 最佳台灣國語聲線智慧篩選器 (優先匹配繁體台灣在地口音)
 */
export function findTaiwanChineseVoice(voices?: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const list = (voices && voices.length > 0) ? voices.filter(v => scoreTaiwanVoice(v) > -500).sort((a, b) => scoreTaiwanVoice(b) - scoreTaiwanVoice(a)) : getTaiwanChineseVoices();
  if (!list || list.length === 0) return null;

  // 使用者自選台灣國語聲線優先
  const preferredTaiwanURI = getPreferredTaiwanVoiceURI();
  if (preferredTaiwanURI) {
    const userChoice = list.find(v => v.voiceURI === preferredTaiwanURI);
    if (userChoice) return userChoice;
  }

  // 自動挑選評分最高之台灣國語聲線
  return list[0] || null;
}

// 註冊語音清單更新監聽器
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.onvoiceschanged = () => {
      loadVoices();
      window.dispatchEvent(new CustomEvent('fse-voice-changed'));
    };
    loadVoices();
    setTimeout(() => {
      loadVoices();
      window.dispatchEvent(new CustomEvent('fse-voice-changed'));
    }, 200);
    setTimeout(() => {
      loadVoices();
      window.dispatchEvent(new CustomEvent('fse-voice-changed'));
    }, 1000);
  } catch (e) {}
}

export interface VoicePresetOption {
  id: string;
  category: 'female' | 'male' | 'google' | 'tw_accent' | 'default';
  title: string;
  subtitle: string;
  voiceName: string;
  voiceURI: string | null;
  accentMode?: AccentMode;
  isCurrent: boolean;
  sampleText: string;
}

export function getCurrentVoiceSummary(): {
  label: string;
  voiceName: string;
  accentMode: AccentMode;
  isTaiwan: boolean;
} {
  const accent = getPreferredAccentMode();
  if (accent === 'tw_fab') {
    return {
      label: '🇹🇼 晶圓在地口音',
      voiceName: '台灣晶圓廠在地口音 (加強工程術語爆破)',
      accentMode: 'tw_fab',
      isTaiwan: true,
    };
  }
  const enVoices = getEnglishVoices();
  const currentVoice = findStandardEnglishVoice(enVoices);
  if (!currentVoice) {
    return {
      label: '系統預設',
      voiceName: '系統預設聲音 (System Default)',
      accentMode: accent,
      isTaiwan: false,
    };
  }
  const name = currentVoice.name;
  const isFemale = /jenny|aria|ava|samantha|allison|susan|michelle|emma|zira|female/i.test(name);
  const isMale = /guy|christopher|eric|tom|evan|alex|brian|david|male/i.test(name);

  let label = '美式原音';
  if (isFemale) label = '美式女聲';
  else if (isMale) label = '美式男聲';
  else if (/google/i.test(name)) label = 'Google US';

  return {
    label,
    voiceName: name,
    accentMode: accent,
    isTaiwan: false,
  };
}

export function getTopVoicePresets(): VoicePresetOption[] {
  const accent = getPreferredAccentMode();
  const preferredURI = getPreferredVoiceURI();
  const enVoices = getEnglishVoices();
  const activeVoice = findStandardEnglishVoice(enVoices);

  // 1. 女聲推薦 (溫潤自然、聽感清晰)
  const femaleVoice = enVoices.find(v => /jenny|aria|ava|samantha|allison|susan|michelle|emma|zira/i.test(v.name)) ||
                      enVoices.find(v => /female/i.test(v.name)) || null;

  // 2. 男聲推薦 (穩健渾厚)
  const maleVoice = enVoices.find(v => /guy|christopher|eric|tom|evan|alex|brian/i.test(v.name)) ||
                    enVoices.find(v => /male/i.test(v.name)) || null;

  // 3. Google 或頂級標準原音
  const googleVoice = enVoices.find(v => /google us english|google english/i.test(v.name)) ||
                      (enVoices.length > 0 && enVoices[0] !== femaleVoice && enVoices[0] !== maleVoice ? enVoices[0] : null);

  const presets: VoicePresetOption[] = [];

  if (femaleVoice) {
    const isCur = accent === 'us_standard' && (preferredURI === femaleVoice.voiceURI || (!preferredURI && activeVoice?.voiceURI === femaleVoice.voiceURI));
    presets.push({
      id: 'natural_female',
      category: 'female',
      title: '👩 美式優質自然女聲',
      subtitle: '柔和清晰、溫潤自然，聆聽最舒適無負擔',
      voiceName: femaleVoice.name,
      voiceURI: femaleVoice.voiceURI,
      accentMode: 'us_standard',
      isCurrent: isCur,
      sampleText: 'The wafer has completed chemical mechanical polishing.'
    });
  }

  if (maleVoice) {
    const isCur = accent === 'us_standard' && (preferredURI === maleVoice.voiceURI || (!preferredURI && activeVoice?.voiceURI === maleVoice.voiceURI));
    presets.push({
      id: 'natural_male',
      category: 'male',
      title: '👨 美式沉穩標準男聲',
      subtitle: '穩重渾厚、權威標準，適合實戰技術交涉',
      voiceName: maleVoice.name,
      voiceURI: maleVoice.voiceURI,
      accentMode: 'us_standard',
      isCurrent: isCur,
      sampleText: 'Please verify the recipe parameters and vacuum interlock.'
    });
  }

  if (googleVoice) {
    const isCur = accent === 'us_standard' && (preferredURI === googleVoice.voiceURI || (!preferredURI && activeVoice?.voiceURI === googleVoice.voiceURI));
    presets.push({
      id: 'google_standard',
      category: 'google',
      title: '🌐 國際標準清脆原音',
      subtitle: '清脆穿透度高，發音端正標準',
      voiceName: googleVoice.name,
      voiceURI: googleVoice.voiceURI,
      accentMode: 'us_standard',
      isCurrent: isCur,
      sampleText: 'FOUP cassette transfer is scheduled for bay seven.'
    });
  }

  // 4. 台灣晶圓廠在地口音
  presets.push({
    id: 'tw_fab_accent',
    category: 'tw_accent',
    title: '🇹🇼 台灣晶圓廠實戰口音',
    subtitle: '台灣工程師最熟悉術語對齊（FOUP、recipe、abort、LOTO）',
    voiceName: '台灣在地腔調 + 晶圓專用爆破音節',
    voiceURI: null,
    accentMode: 'tw_fab',
    isCurrent: accent === 'tw_fab',
    sampleText: 'We need to abort the recipe and check the FOUP clamp.'
  });

  return presets;
}

let activeCloudAudio: HTMLAudioElement | null = null;
let activeCloudBufferSource: AudioBufferSourceNode | null = null;
let activeCloudOutputGainNode: GainNode | null = null;
let activeCloudFetchController: AbortController | null = null;
let activeCloudAbort: (() => void) | null = null;
let isCloudFallbackActive: boolean = false;
let cloudGenerationId: number = 0;
let dummyUnlockAudioElement: HTMLAudioElement | null = null;
let hasHtmlAudioUnlocked: boolean = false;
let isHtmlAudioUnlockInFlight: boolean = false;

function stopCloudFallbackAudio(): void {
  cloudGenerationId++;
  isCloudFallbackActive = false;
  if (activeCloudFetchController) {
    const ctrl = activeCloudFetchController;
    activeCloudFetchController = null;
    try {
      ctrl.abort();
    } catch {}
  }
  if (activeCloudBufferSource) {
    const src = activeCloudBufferSource;
    const gain = activeCloudOutputGainNode;
    activeCloudBufferSource = null;
    activeCloudOutputGainNode = null;
    try {
      src.onended = null;
      const ctx = getSharedAudioContext();
      if (gain && ctx && ctx.state === 'running') {
        // 先施加 2.5ms 抗喀嗒微斜坡淡出再停止震盪源，徹底防止斷句或中斷時的硬體 DAC Click/Pop 雜音
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
        gain.gain.linearRampToValueAtTime(0.00001, now + 0.0025);
        setTimeout(() => {
          try {
            src.stop();
            src.disconnect();
          } catch {}
        }, 4);
      } else {
        src.stop();
        src.disconnect();
      }
    } catch {}
  }
  if (activeCloudAbort) {
    const abortFn = activeCloudAbort;
    activeCloudAbort = null;
    try {
      abortFn();
    } catch {}
  }
  if (activeCloudAudio) {
    const audioEl = activeCloudAudio;
    activeCloudAudio = null;
    try {
      audioEl.onended = null;
      audioEl.onerror = null;
      audioEl.ontimeupdate = null;
      audioEl.onloadedmetadata = null;
      audioEl.onstalled = null;
      audioEl.onwaiting = null;
      audioEl.onplaying = null;
      audioEl.pause();
      audioEl.removeAttribute('src');
      // 強制釋放 Chromium 原生 WebMediaPlayer 解碼槽位，避免長時間連播累積達上限後無聲卡死
      audioEl.load();
    } catch {}
  }
}

export function isAnySpeechPlaying(): boolean {
  if (typeof window === 'undefined') return false;
  const webSpeaking = 'speechSynthesis' in window && Boolean(window.speechSynthesis.speaking);
  const cloudPlaying =
    isCloudFallbackActive ||
    Boolean(activeCloudBufferSource) ||
    Boolean(activeCloudAudio && !activeCloudAudio.paused && !activeCloudAudio.ended);
  const queueBusy = globalAudioScheduler.isBusy();
  return webSpeaking || cloudPlaying || queueBusy;
}

export function splitTtsChunks(text: string, maxLen: number = 170): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  if (normalized.length <= maxLen) return [normalized];

  const chunks: string[] = [];
  let remaining = normalized;
  while (remaining.length > maxLen) {
    let splitIdx = -1;
    for (const sep of ['.', '!', '?', '。', '！', '？', ',', '，', ';', ' ']) {
      const idx = remaining.lastIndexOf(sep, maxLen);
      if (idx > Math.floor(maxLen * 0.4)) {
        splitIdx = idx + 1;
        break;
      }
    }
    if (splitIdx <= 0) splitIdx = maxLen;
    chunks.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks.filter(Boolean);
}

const memoryAudioBlobCache = new Map<string, Blob>();
const memoryTrimmedWavBlobCache = new Map<string, Blob>();
const memoryDecodedAudioBufferCache = new Map<string, AudioBuffer>();
const inFlightCloudBlobMap = new Map<string, Promise<Blob | null>>();
// 長時間連續播放記憶體上限保護：防止行動端 Safari 數小時播放後因未壓縮 Float32 PCM 緩衝過大而觸發系統 OOM 斬殺音訊
const MAX_RAM_AUDIO_BLOBS = 360;
const MAX_RAM_DECODED_BUFFERS = 96;

let bufferCacheHitCount = 0;
let bufferCacheMissCount = 0;
let prebufferedChunksTotal = 0;
let underrunRecoveryCount = 0;
let conflictPreventedCount = 0;
let completedSpeechTasksCount = 0;
let predictiveCachedTotal = 0;
let activePredictiveRequestsCount = 0;
let trimmedChunksTotalCount = 0;
let totalTrimmedSilenceMsAcc = 0;
let lastTrackedSpeechSpeed = 0.85;
let taskRetryCount = 0;
let taskRecoverySuccessCount = 0;
let hasSharedCloudAudioElementBeenUnlocked = false;

// ============================================================================
// 動態 AudioContext Buffer Size 與實時 AudioAnalyser 殘留噪音偵測 / 預測性過零點引擎
// ============================================================================
let sharedSpeechAnalyserNode: AnalyserNode | null = null;
let analyserTimeDomainBuffer: Float32Array | null = null;
let analyserFreqDomainBuffer: Uint8Array | null = null;
let trackedResidualNoiseFloor = 0.00105; // 初始預設殘留底噪 RMS (~ -59.5dB)
let trackedDynamicStartThreshold = 0.00115;
let trackedDynamicEndThreshold = 0.0009;
let trackedClickImpulseThreshold = 0.028;
let latestRealtimeRmsLevel = 0;
let latestHighFreqTransientRatio = 0;
let totalClickPopSuppressedCount = 0;
let totalAnalyserSampleCount = 0;
let currentDynamicAudioBufferSize: 256 | 512 | 1024 | 2048 = 1024;
let totalPredictiveZeroCrossingAlignments = 0;

/**
 * 根據使用者當前的 `speechSpeed` 動態計算 `AudioContext` 的最佳緩衝區大小 (Dynamic Buffer Size)：
 * 語速越快（如 1.0x / 1.2x），自動縮減緩衝區樣本數 (2048 -> 1024 -> 512 -> 256) 與前導/句間緩衝，
 * 顯著減少音訊管線反應時間 (Reaction Latency)，同時提供對應語速的預測性過零點搜尋半徑。
 */
export function getDynamicAudioBufferConfig(speechSpeed: number = lastTrackedSpeechSpeed): DynamicAudioBufferConfig {
  const spd = Number.isFinite(speechSpeed) && speechSpeed > 0 ? Math.max(0.55, Math.min(1.4, speechSpeed)) : 0.85;

  let bufferSize: 256 | 512 | 1024 | 2048;
  let analyserFftSize: 512 | 1024 | 2048;

  if (spd >= 1.12) {
    // 極速實戰模式 (1.2x)：縮減至最小 256 samples (~5.8ms @ 44.1kHz)，極致降低點擊與連播反應延遲
    bufferSize = 256;
    analyserFftSize = 512;
  } else if (spd >= 0.94) {
    // 標準母語模式 (1.0x)：縮減至 512 samples (~11.6ms @ 44.1kHz)
    bufferSize = 512;
    analyserFftSize = 512;
  } else if (spd >= 0.78) {
    // 清晰跟讀模式 (0.85x)：採用 1024 samples (~23.2ms @ 44.1kHz)
    bufferSize = 1024;
    analyserFftSize = 1024;
  } else {
    // 慢速精聽拆解模式 (0.7x)：採用 2048 samples (~46.4ms @ 44.1kHz)，給予拉長音節最完整的頻譜解析度
    bufferSize = 2048;
    analyserFftSize = 1024;
  }

  // 依據 speechSpeed 反比縮放前導與尾韻安全墊：語速加快時適度縮減前導空白減少反應延遲，但尾端永遠保留充足氣音與爆破音安全空間
  const speedScale = Math.max(0.76, Math.min(1.18, 0.88 / spd));
  const leadInPadMs = Number(Math.max(20.0, Math.min(32.0, 26.5 * speedScale)).toFixed(1));
  const trailOutPadMs = Number(Math.max(92.0, Math.min(132.0, 112.0 * speedScale)).toFixed(1));
  const interChunkBreathMs = Math.max(12, Math.min(24, Math.round(16 * speedScale)));
  const predictiveSearchRadiusSamples = Math.max(48, Math.min(128, Math.round(72 * Math.max(0.85, spd))));
  const estimatedReactionLatencyMs = Number(((bufferSize / 44100) * 1000).toFixed(2));

  return {
    bufferSize,
    analyserFftSize,
    estimatedReactionLatencyMs,
    leadInPadMs,
    trailOutPadMs,
    interChunkBreathMs,
    predictiveSearchRadiusSamples
  };
}

/**
 * 根據最新 `speechSpeed` 即時同步更新 `AudioContext` 動態緩衝區變數與 `AnalyserNode` 視窗大小
 */
export function syncDynamicAudioBufferForSpeed(
  speechSpeed: number,
  ctx?: AudioContext | null
): DynamicAudioBufferConfig {
  const validSpeed = Number.isFinite(speechSpeed) && speechSpeed > 0 ? speechSpeed : lastTrackedSpeechSpeed;
  lastTrackedSpeechSpeed = validSpeed;
  const config = getDynamicAudioBufferConfig(validSpeed);
  currentDynamicAudioBufferSize = config.bufferSize;

  if (sharedSpeechAnalyserNode && sharedSpeechAnalyserNode.fftSize !== config.analyserFftSize) {
    try {
      sharedSpeechAnalyserNode.fftSize = config.analyserFftSize;
      analyserTimeDomainBuffer = new Float32Array(sharedSpeechAnalyserNode.fftSize);
      analyserFreqDomainBuffer = new Uint8Array(sharedSpeechAnalyserNode.frequencyBinCount);
    } catch {}
  } else if (ctx && !sharedSpeechAnalyserNode) {
    getOrInitRealtimeAudioAnalyser(ctx, validSpeed);
  }

  return config;
}

/**
 * 取得或初始化綁定於共用 AudioContext 的實時 `AnalyserNode` (AudioAnalyser)
 * 其 `fftSize` 與時域分析緩衝區會根據當前 `speechSpeed` 動態縮減以減少播放反應時間
 */
export function getOrInitRealtimeAudioAnalyser(
  ctx?: AudioContext | null,
  speechSpeed: number = lastTrackedSpeechSpeed
): AnalyserNode | null {
  try {
    const targetCtx = ctx || getSharedAudioContext();
    if (!targetCtx) return null;
    const dynConfig = getDynamicAudioBufferConfig(speechSpeed);
    currentDynamicAudioBufferSize = dynConfig.bufferSize;

    if (!sharedSpeechAnalyserNode || sharedSpeechAnalyserNode.context !== targetCtx) {
      const analyser = targetCtx.createAnalyser();
      analyser.fftSize = dynConfig.analyserFftSize;
      analyser.smoothingTimeConstant = 0.22; // 低平滑時間常數，確保能即時捕捉微秒級數位喀嗒聲 (Click/Pop)
      analyser.minDecibels = -96;
      analyser.maxDecibels = -6;
      sharedSpeechAnalyserNode = analyser;
      analyserTimeDomainBuffer = new Float32Array(analyser.fftSize);
      analyserFreqDomainBuffer = new Uint8Array(analyser.frequencyBinCount);
    } else if (sharedSpeechAnalyserNode.fftSize !== dynConfig.analyserFftSize) {
      try {
        sharedSpeechAnalyserNode.fftSize = dynConfig.analyserFftSize;
        analyserTimeDomainBuffer = new Float32Array(sharedSpeechAnalyserNode.fftSize);
        analyserFreqDomainBuffer = new Uint8Array(sharedSpeechAnalyserNode.frequencyBinCount);
      } catch {}
    }
    return sharedSpeechAnalyserNode;
  } catch {
    return null;
  }
}

/**
 * 從實時 `AudioAnalyser` (`AnalyserNode`) 抽樣當前語音輸出的時域與頻域特徵：
 * 1. 偵測語音句尾、句間與起音前緣的殘留底噪 (Residual Noise Floor)，動態平滑更新 `trackedResidualNoiseFloor`。
 * 2. 偵測 8kHz~20kHz 高頻瞬態能量比與相鄰樣本一階差分斜率 (Slew-Rate)，精準識別斷句數位喀嗒聲 (Click/Pop)。
 */
export function sampleRealtimeAnalyserNoiseFloor(analyserOverride?: AnalyserNode | null): RealtimeNoiseAnalysisMetrics {
  const analyser = analyserOverride || sharedSpeechAnalyserNode;
  if (analyser && analyserTimeDomainBuffer && analyserFreqDomainBuffer) {
    try {
      analyser.getFloatTimeDomainData(analyserTimeDomainBuffer as Float32Array<ArrayBuffer>);
      analyser.getByteFrequencyData(analyserFreqDomainBuffer as Uint8Array<ArrayBuffer>);

      // 依據當前動態 AudioContext buffer size 決定實時掃描的時域樣本窗口，加速高語速下的分析反應
      const activeScanLen = Math.min(analyserTimeDomainBuffer.length, currentDynamicAudioBufferSize);
      let sumSq = 0;
      let maxSlew = 0;

      // 將時域緩衝區切分為 8 個微子窗，找出最安靜子窗的殘留底噪 RMS
      const subWinSize = Math.max(16, Math.floor(activeScanLen / 8));
      let minSubWinRms = Number.POSITIVE_INFINITY;

      for (let w = 0; w < activeScanLen; w += subWinSize) {
        const end = Math.min(activeScanLen, w + subWinSize);
        let winSq = 0;
        for (let i = w; i < end; i++) {
          const s = analyserTimeDomainBuffer[i];
          sumSq += s * s;
          winSq += s * s;
          if (i > 0) {
            const diff = Math.abs(s - analyserTimeDomainBuffer[i - 1]);
            if (diff > maxSlew) maxSlew = diff;
          }
        }
        const winRms = Math.sqrt(winSq / Math.max(1, end - w));
        if (winRms < minSubWinRms) minSubWinRms = winRms;
      }

      const frameRms = Math.sqrt(sumSq / Math.max(1, activeScanLen));
      latestRealtimeRmsLevel = Number(frameRms.toFixed(6));

      // 計算 8kHz 以上高頻能量佔比（數位喀嗒聲 Click/Pop 在高頻段具有異常寬頻尖峰）
      const binCount = analyserFreqDomainBuffer.length;
      const sampleRate = analyser.context?.sampleRate || 44100;
      const nyquist = sampleRate / 2;
      const highFreqStartBin = Math.max(1, Math.min(binCount - 1, Math.floor((7800 / nyquist) * binCount)));

      let totalSpecEnergy = 0;
      let highFreqEnergy = 0;
      for (let b = 0; b < binCount; b++) {
        const mag = analyserFreqDomainBuffer[b];
        totalSpecEnergy += mag;
        if (b >= highFreqStartBin) {
          highFreqEnergy += mag;
        }
      }
      latestHighFreqTransientRatio =
        totalSpecEnergy > 0 ? Number((highFreqEnergy / totalSpecEnergy).toFixed(4)) : 0;

      // 若偵測到有效微弱底噪區段（非完全靜止 0，且低於正常母音能量），以指數移動平均 (EMA) 更新動態殘留噪音閾值
      if (minSubWinRms > 0.00015 && minSubWinRms < 0.0032) {
        const blendedFloor = trackedResidualNoiseFloor * 0.78 + minSubWinRms * 0.22;
        // 嚴格限制殘留噪音基底在 [0.00065, 0.0019] 安全範圍，確保絕不誤傷輕音子音 (/s/, /f/, /th/, /h/)
        trackedResidualNoiseFloor = Math.max(0.00065, Math.min(0.0019, blendedFloor));
      }

      // 若在高頻瞬態能量異常偏高且整體語音處於邊界微弱區時，微調喀嗒聲斜率攔截敏感度
      if (latestHighFreqTransientRatio > 0.42 && frameRms < 0.012 && maxSlew > 0.018) {
        trackedClickImpulseThreshold = Math.max(0.018, Math.min(0.045, maxSlew * 0.85));
      }

      trackedDynamicStartThreshold = Number(
        Math.max(0.00085, Math.min(0.0022, trackedResidualNoiseFloor * 1.18)).toFixed(6)
      );
      trackedDynamicEndThreshold = Number(
        Math.max(0.00072, Math.min(0.0018, trackedResidualNoiseFloor * 0.92)).toFixed(6)
      );
      totalAnalyserSampleCount++;
    } catch {}
  }

  return getRealtimeAudioAnalyserStats();
}

/**
 * 結合實時 `AudioAnalyser` 基準、當前 `speechSpeed` 動態緩衝區設定與待處理 `AudioBuffer` 首尾邊界微觀分析，
 * 動態計算最適配該語音片段的殘留噪音閾值 (`startThreshold` / `endThreshold` / `clickImpulseThreshold` / `dynamicBufferSize`)
 */
export function computeDynamicTrimThresholdsWithAnalyser(
  ctx: BaseAudioContext,
  sourceBuffer: AudioBuffer,
  speechSpeed: number = lastTrackedSpeechSpeed
): AudioTrimOptions {
  const dynConfig =
    typeof AudioContext !== 'undefined' && ctx instanceof AudioContext
      ? syncDynamicAudioBufferForSpeed(speechSpeed, ctx)
      : getDynamicAudioBufferConfig(speechSpeed);
  currentDynamicAudioBufferSize = dynConfig.bufferSize;

  // 先刷新一次實時 AnalyserNode 狀態
  if (typeof AudioContext !== 'undefined' && ctx instanceof AudioContext) {
    const liveAnalyser = getOrInitRealtimeAudioAnalyser(ctx, speechSpeed);
    if (liveAnalyser) {
      sampleRealtimeAnalyserNoiseFloor(liveAnalyser);
    }
  }

  const sampleRate = sourceBuffer.sampleRate || 44100;
  const numChannels = sourceBuffer.numberOfChannels;
  const totalSamples = sourceBuffer.length;

  if (totalSamples < Math.floor(sampleRate * 0.04) || numChannels === 0) {
    return {
      residualNoiseFloor: trackedResidualNoiseFloor,
      startThreshold: trackedDynamicStartThreshold,
      endThreshold: trackedDynamicEndThreshold,
      clickImpulseThreshold: trackedClickImpulseThreshold,
      speechSpeed,
      dynamicBufferSize: dynConfig.bufferSize,
      leadInPadMs: dynConfig.leadInPadMs,
      trailOutPadMs: dynConfig.trailOutPadMs
    };
  }

  const ch0 = sourceBuffer.getChannelData(0);
  // 根據動態 AudioContext buffer size 決定邊界微觀分析視窗，語速越快分析窗越精簡
  const boundaryInspectSamples = Math.min(
    Math.max(dynConfig.bufferSize, Math.floor(sampleRate * 0.02)),
    Math.floor(totalSamples * 0.15)
  );
  const microWin = Math.max(12, Math.min(128, Math.floor(dynConfig.bufferSize / 8)));
  const microRmsList: number[] = [];
  let globalPeak = 0;

  for (let i = 0; i < totalSamples; i += 4) {
    const abs = Math.abs(ch0[i]);
    if (abs > globalPeak) globalPeak = abs;
  }

  // 抽樣開頭邊界微視窗
  for (let i = 0; i + microWin <= boundaryInspectSamples; i += microWin) {
    let sq = 0;
    for (let j = 0; j < microWin; j++) {
      const v = ch0[i + j];
      sq += v * v;
    }
    microRmsList.push(Math.sqrt(sq / microWin));
  }

  // 抽樣結尾邊界微視窗
  for (let i = Math.max(0, totalSamples - boundaryInspectSamples); i + microWin <= totalSamples; i += microWin) {
    let sq = 0;
    for (let j = 0; j < microWin; j++) {
      const v = ch0[i + j];
      sq += v * v;
    }
    microRmsList.push(Math.sqrt(sq / microWin));
  }

  let bufferNoiseFloor = trackedResidualNoiseFloor;
  if (microRmsList.length > 0) {
    microRmsList.sort((a, b) => a - b);
    const p20Idx = Math.min(microRmsList.length - 1, Math.floor(microRmsList.length * 0.2));
    const quietBoundaryRms = microRmsList[p20Idx];
    if (quietBoundaryRms > 0.00008 && quietBoundaryRms < 0.0028) {
      bufferNoiseFloor = trackedResidualNoiseFloor * 0.55 + quietBoundaryRms * 0.45;
    }
  }

  // 更新全域追蹤之殘留底噪，並嚴格夾限於 [-64dB ~ -56dB] 防止削傷微弱字尾子音
  const effectiveNoiseFloor = Math.max(0.00058, Math.min(0.00145, bufferNoiseFloor));
  trackedResidualNoiseFloor = Number(effectiveNoiseFloor.toFixed(6));

  const dynamicStart = Math.max(
    0.00075,
    Math.min(0.00175, Math.max(effectiveNoiseFloor * 1.18, globalPeak * 0.0014))
  );
  const dynamicEnd = Math.max(
    0.00048,
    Math.min(0.00105, Math.max(effectiveNoiseFloor * 0.88, globalPeak * 0.001))
  );
  const dynamicClickSlew = Math.max(0.018, Math.min(0.042, Math.max(0.024, globalPeak * 0.065)));

  trackedDynamicStartThreshold = Number(dynamicStart.toFixed(6));
  trackedDynamicEndThreshold = Number(dynamicEnd.toFixed(6));
  trackedClickImpulseThreshold = Number(dynamicClickSlew.toFixed(5));

  return {
    residualNoiseFloor: trackedResidualNoiseFloor,
    startThreshold: trackedDynamicStartThreshold,
    endThreshold: trackedDynamicEndThreshold,
    clickImpulseThreshold: trackedClickImpulseThreshold,
    speechSpeed,
    dynamicBufferSize: dynConfig.bufferSize,
    leadInPadMs: dynConfig.leadInPadMs,
    trailOutPadMs: dynConfig.trailOutPadMs,
    fadeInMs: 2.5,
    fadeOutMs: 5.0
  };
}

export function getRealtimeAudioAnalyserStats(): RealtimeNoiseAnalysisMetrics {
  return {
    residualNoiseFloor: trackedResidualNoiseFloor,
    dynamicStartThreshold: trackedDynamicStartThreshold,
    dynamicEndThreshold: trackedDynamicEndThreshold,
    clickImpulseThreshold: trackedClickImpulseThreshold,
    realtimeRmsLevel: latestRealtimeRmsLevel,
    highFreqTransientRatio: latestHighFreqTransientRatio,
    clickPopSuppressedCount: totalClickPopSuppressedCount,
    analyserSampleCount: totalAnalyserSampleCount,
    dynamicAudioBufferSize: currentDynamicAudioBufferSize,
    predictiveZeroCrossingAlignments: totalPredictiveZeroCrossingAlignments
  };
}

export function getSpeechSpeedBucket(speechSpeed: number = 0.85): '0.7x' | '0.85x' | '1.0x' | '1.2x' {
  const spd = Number.isFinite(speechSpeed) && speechSpeed > 0 ? speechSpeed : 0.85;
  if (spd <= 0.75) return '0.7x';
  if (spd <= 0.92) return '0.85x';
  if (spd <= 1.08) return '1.0x';
  return '1.2x';
}

function getMemoryCacheKey(text: string, lang: 'en-US' | 'zh-TW', _speechSpeed: number = 0.85): string {
  const norm = text.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${lang}__v6_studio_clean__${norm}`;
}

function lookupMemoryAudioBlob(text: string, lang: 'en-US' | 'zh-TW', speechSpeed: number = 0.85): Blob | null {
  const primaryKey = getMemoryCacheKey(text, lang, speechSpeed);
  // 優先回傳已經過實時 AudioAnalyser 動態閾值 trimStart / trimEnd 靜音裁切與防喀嗒聲包絡處理的無損 WAV Blob
  const trimmedWav = memoryTrimmedWavBlobCache.get(primaryKey);
  if (trimmedWav && trimmedWav.size > 64) {
    memoryTrimmedWavBlobCache.delete(primaryKey);
    memoryTrimmedWavBlobCache.set(primaryKey, trimmedWav);
    return trimmedWav;
  }
  const exact = memoryAudioBlobCache.get(primaryKey);
  if (exact && exact.size > 64) {
    // 刷新 LRU 順序
    memoryAudioBlobCache.delete(primaryKey);
    memoryAudioBlobCache.set(primaryKey, exact);
    return exact;
  }
  return null;
}

function storeMemoryAudioBlob(key: string, blob: Blob): void {
  if (memoryAudioBlobCache.size >= MAX_RAM_AUDIO_BLOBS && !memoryAudioBlobCache.has(key)) {
    const oldestKey = memoryAudioBlobCache.keys().next().value;
    if (oldestKey) memoryAudioBlobCache.delete(oldestKey);
  }
  memoryAudioBlobCache.set(key, blob);
}

function storeMemoryTrimmedWavBlob(key: string, wavBlob: Blob): void {
  if (memoryTrimmedWavBlobCache.size >= MAX_RAM_DECODED_BUFFERS && !memoryTrimmedWavBlobCache.has(key)) {
    const oldestKey = memoryTrimmedWavBlobCache.keys().next().value;
    if (oldestKey) memoryTrimmedWavBlobCache.delete(oldestKey);
  }
  memoryTrimmedWavBlobCache.set(key, wavBlob);
}

// ============================================================================
// 針對 'click' 雜訊的預測性過零點 (Predictive Zero-Crossing) 對齊演算法與動態緩衝 DSP 層
// ============================================================================

/**
 * 預測性過零點 (Predictive Zero-Crossing) 對齊演算法：
 * 針對調整語速 (`speechSpeed` 0.7x ~ 1.2x) 時，瀏覽器時間伸縮重取樣 (WSOLA / Linear Interpolation)
 * 容易在非連續斜率切點放大相位突波並產生數位 'click' 雜訊的問題：
 * 1. 結合多點軌跡預測 ($x[n-2..n+2]$)、一階導數斜率 ($\frac{dx}{dt}$) 與二階曲率加速度 ($\frac{d^2x}{dt^2}$)，
 *    並將 `speechSpeed` 重取樣步進因子納入權重，預測出在任何變速比例下皆具備最小相位跳變的過零點。
 * 2. 針對起點 (`start` 模式) 優先鎖定正斜率平滑爬升過零點；針對終點 (`end` 模式) 優先鎖定平緩收斂過零點，
 *    確保多段語音在變速播放與無縫銜接時達到 $C^1$ 切線連續。
 */
export function findPredictiveZeroCrossing(
  channelData: Float32Array,
  targetIndex: number,
  boundaryMode: 'start' | 'end' = 'start',
  speechSpeed: number = lastTrackedSpeechSpeed,
  searchRadius?: number
): number {
  const len = channelData.length;
  if (len <= 4) return Math.max(0, Math.min(len - 1, targetIndex));
  const clampedTarget = Math.max(2, Math.min(len - 3, targetIndex));

  const spd = Number.isFinite(speechSpeed) && speechSpeed > 0 ? Math.max(0.6, Math.min(1.35, speechSpeed)) : 0.85;
  const effectiveRadius =
    searchRadius ?? getDynamicAudioBufferConfig(spd).predictiveSearchRadiusSamples;

  const start = Math.max(2, clampedTarget - effectiveRadius);
  const end = Math.min(len - 3, clampedTarget + effectiveRadius);

  let bestIndex = clampedTarget;
  let lowestClickCost = Number.POSITIVE_INFINITY;

  for (let i = start; i <= end; i++) {
    const xm2 = channelData[i - 2];
    const xm1 = channelData[i - 1];
    const x0 = channelData[i];
    const xp1 = channelData[i + 1];
    const xp2 = channelData[i + 2];

    // 判斷是否為正負號交越點或極微幅準過零點
    const isSignCrossing = (xm1 <= 0 && x0 >= 0) || (xm1 >= 0 && x0 <= 0) || (x0 <= 0 && xp1 >= 0) || (x0 >= 0 && xp1 <= 0);
    const absAmp = Math.abs(x0);

    // 一階差分斜率 (First-Order Derivative) 與二階差分曲率 (Second-Order Curvature / Slew Acceleration)
    const firstDerivative = 0.5 * (xp1 - xm1);
    const secondDerivative = xp1 - 2 * x0 + xm1;
    const wideCurvature = 0.25 * (xp2 - 2 * x0 + xm2);

    // 根據當前 speechSpeed 預測變速重取樣後的下一步相位插值誤差 (Predicted Resampled Trajectory Error)
    const predictedNextSample = x0 + firstDerivative * spd + 0.5 * secondDerivative * spd * spd;
    const trajectoryContinuityError = Math.abs(predictedNextSample - (x0 * (1 - spd) + xp1 * spd));

    // 斜率方向匹配獎勵：起點偏好平緩正斜率過零，終點偏好由正或負平滑趨近於 0 的低斜率點
    const slopeDirectionPenalty =
      boundaryMode === 'start'
        ? firstDerivative < -0.0015
          ? Math.abs(firstDerivative) * 1.4
          : Math.abs(firstDerivative) * 0.65
        : Math.abs(firstDerivative) * 0.85;

    // 距離目標索引的輕微懲罰，避免切點漂移過遠影響子音時長
    const distanceRatio = Math.abs(i - clampedTarget) / Math.max(1, effectiveRadius);

    // 綜合 Click 雜訊風險代價函數 (越低代表變速銜接時越平滑無喀嗒聲)
    let cost =
      absAmp * 3.2 +
      slopeDirectionPenalty +
      Math.abs(secondDerivative) * (1.8 * spd) +
      Math.abs(wideCurvature) * 0.9 +
      trajectoryContinuityError * 2.5 +
      distanceRatio * 0.0012;

    if (isSignCrossing) {
      cost *= 0.42; // 顯著優先採用真實正負號交越點
    }

    if (cost < lowestClickCost) {
      lowestClickCost = cost;
      bestIndex = isSignCrossing && Math.abs(xm1) < absAmp ? i - 1 : i;
    }
  }

  totalPredictiveZeroCrossingAlignments++;
  return Math.max(0, Math.min(len - 1, bestIndex));
}

/**
 * 對已經過預測性過零點對齊的波形首尾施加三次厄米特 (Cubic Hermite $C^1$) 零斜率切線平滑修正，
 * 確保切點處不僅振幅 $x(0) = 0$，且一階導數 $x'(0) = 0$，徹底消除調整 `speechSpeed` 時的重取樣邊界 'click' 雜訊
 */
function applyPredictiveZeroCrossingContinuity(
  channelData: Float32Array,
  speechSpeed: number = lastTrackedSpeechSpeed
): void {
  const len = channelData.length;
  if (len < 16) return;
  const spd = Number.isFinite(speechSpeed) && speechSpeed > 0 ? Math.max(0.6, Math.min(1.35, speechSpeed)) : 0.85;
  // 根據 speechSpeed 調整厄米特切線對齊樣本數 (約 24 ~ 44 samples, ~0.6ms-1.0ms)
  const alignSamples = Math.min(Math.floor(len * 0.05), Math.max(20, Math.round(32 * spd)));

  for (let i = 0; i < alignSamples; i++) {
    const t = i / alignSamples;
    // Cubic Hermite S-curve: h(t) = 3t^2 - 2t^3，在 t=0 處導數為 0，在 t=1 處導數亦為 0
    const hermiteGain = t * t * (3 - 2 * t);
    channelData[i] *= hermiteGain;

    const tailIdx = len - 1 - i;
    channelData[tailIdx] *= hermiteGain;
  }
  channelData[0] = 0;
  channelData[len - 1] = 0;
}

/**
 * 將所有語音片段透過 AudioContext 動態緩衝區、實時 `AudioAnalyser` 殘留噪音閾值與「預測性過零點對齊演算法」進行精準的 `trimStart` 與 `trimEnd` 清理：
 * 1. 根據當前 `speechSpeed` 自動調整動態分析緩衝視窗大小，減少高語速下的處理與播放反應延遲。
 * 2. 移除各聲道直流偏置 (DC Offset Removal)，消除低頻基底偏移。
 * 3. 結合實時 `AudioAnalyser` 的 `residualNoiseFloor` 與 `clickImpulseThreshold`，自動偵測並平滑抹除片段首尾與斷句邊界處
 *    持續時間 < 1.8ms 的孤立數位喀嗒聲 (Digital Click / Pop Transients)，同時 100% 保留持續 15ms 以上的真實英語氣音與爆破子音。
 * 4. 以預測性過零點演算法 (`findPredictiveZeroCrossing`) 結合三次厄米特 $C^1$ 切線平滑 (`applyPredictiveZeroCrossingContinuity`)
 *    對齊 `trimStart` 與 `trimEnd`，確保在任意調整 `speechSpeed` 時波形銜接極致平滑、零 'click' 雜訊。
 */
export function trimAudioBufferSilence(
  ctx: BaseAudioContext,
  sourceBuffer: AudioBuffer,
  options: AudioTrimOptions = {}
): AudioTrimResult {
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;
  const totalSamples = sourceBuffer.length;
  const originalDurationMs = Math.round((totalSamples / sampleRate) * 1000);
  const effectiveSpeed = options.speechSpeed ?? lastTrackedSpeechSpeed;

  // 若呼叫端未顯式傳入動態閾值，自動向實時 AudioAnalyser 請求當前語速與片段的動態殘留噪音閾值與緩衝區配置
  const resolvedOptions: AudioTrimOptions =
    options.startThreshold !== undefined && options.endThreshold !== undefined
      ? options
      : { ...computeDynamicTrimThresholdsWithAnalyser(ctx, sourceBuffer, effectiveSpeed), ...options };

  const dynConfig = getDynamicAudioBufferConfig(effectiveSpeed);
  const activeDynamicBufferSize = resolvedOptions.dynamicBufferSize ?? dynConfig.bufferSize;
  const dynamicNoiseFloor = resolvedOptions.residualNoiseFloor ?? trackedResidualNoiseFloor;
  const baseStartThreshold = resolvedOptions.startThreshold ?? trackedDynamicStartThreshold;
  const baseEndThreshold = resolvedOptions.endThreshold ?? trackedDynamicEndThreshold;
  const clickImpulseThreshold = resolvedOptions.clickImpulseThreshold ?? trackedClickImpulseThreshold;

  if (totalSamples < Math.floor(sampleRate * 0.04) || numChannels === 0) {
    return {
      buffer: sourceBuffer,
      trimmedStartMs: 0,
      trimmedEndMs: 0,
      totalTrimmedMs: 0,
      originalDurationMs,
      trimmedDurationMs: originalDurationMs,
      appliedStartThreshold: baseStartThreshold,
      appliedEndThreshold: baseEndThreshold,
      suppressedClicks: 0,
      dynamicBufferSize: activeDynamicBufferSize
    };
  }

  // 複製各聲道樣本並執行第一步：去直流偏置 (DC Offset Removal) 與斷句邊界數位喀嗒聲 (Click/Pop) 瞬態抑制
  const cleanedChannels: Float32Array[] = [];
  let globalPeak = 0;
  let suppressedClicksInClip = 0;

  const edgeImpulseGuardSamples = Math.min(Math.floor(sampleRate * 0.003), Math.floor(totalSamples * 0.05));
  // 邊界區範圍依據動態 buffer size 自動調整，兼顧低延遲與首尾突波攔截
  const boundaryDeclickZone = Math.min(
    Math.max(activeDynamicBufferSize, Math.floor(sampleRate * 0.028)),
    Math.floor(totalSamples * 0.2)
  );
  const transientHalfWin = Math.max(6, Math.floor(sampleRate * 0.0008)); // ~0.8ms 局部突波半窗
  const contextQuietWin = Math.max(24, Math.floor(sampleRate * 0.0045)); // ~4.5ms 周圍背景安靜確認窗

  for (let ch = 0; ch < numChannels; ch++) {
    const raw = sourceBuffer.getChannelData(ch);
    const copy = new Float32Array(totalSamples);

    let sum = 0;
    for (let i = 0; i < totalSamples; i++) {
      sum += raw[i];
    }
    const dcOffset = sum / totalSamples;

    for (let i = 0; i < totalSamples; i++) {
      copy[i] = raw[i] - dcOffset;
    }

    // 1A. 檢查首尾 3ms 是否存在編碼器邊界階躍突波（首尾瞬間突波後緊接底噪靜音）
    const quietCheckWindow = Math.min(Math.floor(sampleRate * 0.009), Math.floor(totalSamples * 0.1));
    if (quietCheckWindow > edgeImpulseGuardSamples * 2) {
      let postEdgeRms = 0;
      let preTailRms = 0;
      const checkLen = quietCheckWindow - edgeImpulseGuardSamples;
      for (let i = edgeImpulseGuardSamples; i < quietCheckWindow; i++) {
        postEdgeRms += copy[i] * copy[i];
        const tailIdx = totalSamples - 1 - i;
        preTailRms += copy[tailIdx] * copy[tailIdx];
      }
      postEdgeRms = Math.sqrt(postEdgeRms / Math.max(1, checkLen));
      preTailRms = Math.sqrt(preTailRms / Math.max(1, checkLen));

      const silenceGuardCeiling = Math.max(0.0024, dynamicNoiseFloor * 2.1);
      if (postEdgeRms < silenceGuardCeiling) {
        for (let i = 0; i < edgeImpulseGuardSamples; i++) {
          if (Math.abs(copy[i]) > dynamicNoiseFloor * 1.5) suppressedClicksInClip++;
          copy[i] = 0;
        }
      }
      if (preTailRms < silenceGuardCeiling) {
        for (let i = totalSamples - edgeImpulseGuardSamples; i < totalSamples; i++) {
          if (Math.abs(copy[i]) > dynamicNoiseFloor * 1.5) suppressedClicksInClip++;
          copy[i] = 0;
        }
      }
    }

    // 1B. 在首尾斷句邊界區偵測「高一階差分斜率 (Slew-Rate) + 周圍底噪靜音」的孤立數位喀嗒聲 (Click/Pop)
    const suppressIsolatedClicksInRange = (rangeStart: number, rangeEnd: number) => {
      for (let i = Math.max(1, rangeStart); i < Math.min(totalSamples - 1, rangeEnd); i++) {
        const slew = Math.abs(copy[i] - copy[i - 1]);
        if (slew >= clickImpulseThreshold) {
          // 檢查該尖峰後方 1.8ms~6ms 是否立即跌回殘留底噪（若是真實子音則能量會持續 15ms~80ms）
          const checkStart = Math.min(totalSamples - 1, i + transientHalfWin * 2);
          const checkEnd = Math.min(totalSamples, checkStart + contextQuietWin);
          if (checkEnd > checkStart + 8) {
            let surroundSq = 0;
            for (let k = checkStart; k < checkEnd; k++) {
              surroundSq += copy[k] * copy[k];
            }
            const surroundRms = Math.sqrt(surroundSq / (checkEnd - checkStart));
            if (surroundRms <= dynamicNoiseFloor * 2.35) {
              // 確認為孤立數位喀嗒聲 (Click/Pop)，以厄米特平滑內插抹除該微秒突波
              const cleanLeftIdx = Math.max(0, i - transientHalfWin);
              const cleanRightIdx = Math.min(totalSamples - 1, i + transientHalfWin);
              const leftVal = copy[cleanLeftIdx] * 0.12;
              const rightVal = copy[cleanRightIdx] * 0.12;
              const span = Math.max(1, cleanRightIdx - cleanLeftIdx);
              for (let m = cleanLeftIdx; m <= cleanRightIdx; m++) {
                const t = (m - cleanLeftIdx) / span;
                const sCurve = t * t * (3 - 2 * t);
                copy[m] = leftVal * (1 - sCurve) + rightVal * sCurve;
              }
              suppressedClicksInClip++;
              i = cleanRightIdx;
            }
          }
        }
      }
    };

    suppressIsolatedClicksInRange(1, boundaryDeclickZone);
    suppressIsolatedClicksInRange(Math.max(1, totalSamples - boundaryDeclickZone), totalSamples - 1);

    for (let i = 0; i < totalSamples; i++) {
      const abs = Math.abs(copy[i]);
      if (abs > globalPeak) globalPeak = abs;
    }

    cleanedChannels.push(copy);
  }

  if (suppressedClicksInClip > 0) {
    totalClickPopSuppressedCount += suppressedClicksInClip;
  }

  if (globalPeak < 0.001) {
    return {
      buffer: sourceBuffer,
      trimmedStartMs: 0,
      trimmedEndMs: 0,
      totalTrimmedMs: 0,
      originalDurationMs,
      trimmedDurationMs: originalDurationMs,
      appliedStartThreshold: baseStartThreshold,
      appliedEndThreshold: baseEndThreshold,
      suppressedClicks: suppressedClicksInClip,
      dynamicBufferSize: activeDynamicBufferSize
    };
  }

  // 將實時 AudioAnalyser 動態殘留噪音閾值與片段峰值自適應結合，嚴格保護微弱尾音與無聲爆破子音 (-t, -k, -p, -v, -s, -f, -th)
  const adaptiveStartThreshold = Math.max(
    0.00068,
    Math.min(0.00175, Math.max(baseStartThreshold, dynamicNoiseFloor * 1.15, globalPeak * 0.0015))
  );
  const adaptiveEndThreshold = Math.max(
    0.00045,
    Math.min(0.00105, Math.max(baseEndThreshold, dynamicNoiseFloor * 0.88, globalPeak * 0.001))
  );

  // 語音邊界偵測窗固定維持至少 ~5.5ms（跨半個音高週期以上），避免在高速率 (256-sample buffer) 下因微視窗過短導致字尾誤判截斷
  const windowSize = Math.max(96, Math.min(384, Math.floor(sampleRate * 0.0055)));
  const stepSize = Math.max(24, Math.floor(windowSize / 3));

  let rawStartSample = 0;
  let foundStart = false;

  // 正向掃描 trimStart：尋找第一個超過動態殘留噪音閾值的持續語音或子音起音視窗
  for (let i = 0; i <= totalSamples - windowSize; i += stepSize) {
    let sumSq = 0;
    let maxPeakInWin = 0;
    for (let j = 0; j < windowSize; j++) {
      const idx = i + j;
      let sampleMax = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        const v = Math.abs(cleanedChannels[ch][idx]);
        if (v > sampleMax) sampleMax = v;
      }
      sumSq += sampleMax * sampleMax;
      if (sampleMax > maxPeakInWin) maxPeakInWin = sampleMax;
    }
    const rms = Math.sqrt(sumSq / windowSize);
    if (rms >= adaptiveStartThreshold || maxPeakInWin >= adaptiveStartThreshold * 2.1) {
      rawStartSample = i;
      foundStart = true;
      break;
    }
  }

  let rawEndSample = totalSamples - 1;
  // 反向掃描 trimEnd：尋找最後一個超過動態殘留噪音閾值的語音尾韻、字尾爆破音 (-t, -k, -p) 或氣音視窗
  for (let i = totalSamples - windowSize; i >= rawStartSample; i -= stepSize) {
    let sumSq = 0;
    let maxPeakInWin = 0;
    for (let j = 0; j < windowSize; j++) {
      const idx = i + j;
      let sampleMax = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        const v = Math.abs(cleanedChannels[ch][idx]);
        if (v > sampleMax) sampleMax = v;
      }
      sumSq += sampleMax * sampleMax;
      if (sampleMax > maxPeakInWin) maxPeakInWin = sampleMax;
    }
    const rms = Math.sqrt(sumSq / windowSize);
    if (rms >= adaptiveEndThreshold || maxPeakInWin >= adaptiveEndThreshold * 2.1) {
      rawEndSample = Math.min(totalSamples - 1, i + windowSize);
      break;
    }
  }

  if (!foundStart || rawEndSample <= rawStartSample) {
    return {
      buffer: sourceBuffer,
      trimmedStartMs: 0,
      trimmedEndMs: 0,
      totalTrimmedMs: 0,
      originalDurationMs,
      trimmedDurationMs: originalDurationMs,
      appliedStartThreshold: adaptiveStartThreshold,
      appliedEndThreshold: adaptiveEndThreshold,
      suppressedClicks: suppressedClicksInClip,
      dynamicBufferSize: activeDynamicBufferSize
    };
  }

  // 依據當前 speechSpeed 動態縮減前導與維持充裕尾韻安全墊，減少啟動空白同時確保 100% 字尾不遺失
  const leadInPadSamples = Math.floor(((resolvedOptions.leadInPadMs ?? dynConfig.leadInPadMs) / 1000) * sampleRate);
  const trailOutPadSamples = Math.floor(((resolvedOptions.trailOutPadMs ?? dynConfig.trailOutPadMs) / 1000) * sampleRate);

  const paddedStart = Math.max(0, rawStartSample - leadInPadSamples);
  const paddedEnd = Math.min(totalSamples - 1, rawEndSample + trailOutPadSamples);

  // 透過預測性過零點演算法 (Predictive Zero-Crossing Alignment) 對齊剪輯邊界，確保變速播放時斜率與相位平滑銜接
  const searchRadius = dynConfig.predictiveSearchRadiusSamples;
  const trimStartSample = findPredictiveZeroCrossing(
    cleanedChannels[0],
    paddedStart,
    'start',
    effectiveSpeed,
    searchRadius
  );
  const candidateEndSample = findPredictiveZeroCrossing(
    cleanedChannels[0],
    paddedEnd,
    'end',
    effectiveSpeed,
    searchRadius
  );
  // 確保 predictive zero-crossing 絕不會向內回縮跨越 rawEndSample，始終保留完整尾音
  const trimEndSample = Math.max(
    trimStartSample + Math.min(totalSamples - trimStartSample, Math.floor(sampleRate * 0.04)),
    Math.min(totalSamples - 1, Math.max(rawEndSample, candidateEndSample))
  );

  // 僅在最外緣 7ms 安全墊區間施加平滑向下擴展 (Soft Noise Gate)，絕不碰觸實質語音本體
  const softGateZoneSamples = Math.min(
    Math.floor(sampleRate * 0.007),
    Math.floor(leadInPadSamples * 0.45),
    Math.floor(trailOutPadSamples * 0.25),
    Math.floor((trimEndSample - trimStartSample) * 0.05)
  );

  const trimmedLength = Math.max(1, trimEndSample - trimStartSample + 1);
  const trimmedBuffer = ctx.createBuffer(numChannels, trimmedLength, sampleRate);

  const fadeInSamples = Math.min(
    Math.floor(((resolvedOptions.fadeInMs ?? 2.5) / 1000) * sampleRate),
    Math.floor(trimmedLength * 0.05)
  );
  const fadeOutSamples = Math.min(
    Math.floor(((resolvedOptions.fadeOutMs ?? 5.0) / 1000) * sampleRate),
    Math.floor(trimmedLength * 0.06)
  );

  for (let ch = 0; ch < numChannels; ch++) {
    const src = cleanedChannels[ch];
    const dst = trimmedBuffer.getChannelData(ch);

    for (let i = 0; i < trimmedLength; i++) {
      let sample = src[trimStartSample + i];

      if (softGateZoneSamples > 0 && (i < softGateZoneSamples || i >= trimmedLength - softGateZoneSamples)) {
        const absS = Math.abs(sample);
        if (absS < dynamicNoiseFloor * 0.85) {
          const ratio = absS / Math.max(0.0001, dynamicNoiseFloor * 0.85);
          sample *= ratio * ratio;
        }
      }

      // 施加餘弦微淡入包絡 (Raised-Cosine Fade-In) 防止開頭喀嗒聲
      if (i < fadeInSamples && fadeInSamples > 1) {
        const gain = 0.5 * (1 - Math.cos((Math.PI * i) / fadeInSamples));
        sample *= gain;
      }
      // 施加餘弦微淡出包絡 (Raised-Cosine Fade-Out) 防止結尾爆音與斷句感
      else if (i >= trimmedLength - fadeOutSamples && fadeOutSamples > 1) {
        const remain = trimmedLength - 1 - i;
        const gain = 0.5 * (1 - Math.cos((Math.PI * remain) / fadeOutSamples));
        sample *= gain;
      }

      dst[i] = sample;
    }

    // 施加預測性過零點三次厄米特 C1 連續切線修正，確保調整 speechSpeed 時重取樣波形零斜率突變
    applyPredictiveZeroCrossingContinuity(dst, effectiveSpeed);
  }

  const trimmedStartMs = Math.round((trimStartSample / sampleRate) * 1000);
  const trimmedEndMs = Math.round(((totalSamples - 1 - trimEndSample) / sampleRate) * 1000);
  const totalTrimmedMs = trimmedStartMs + trimmedEndMs;
  const trimmedDurationMs = Math.round((trimmedLength / sampleRate) * 1000);

  trimmedChunksTotalCount++;
  totalTrimmedSilenceMsAcc += totalTrimmedMs;

  return {
    buffer: trimmedBuffer,
    trimmedStartMs,
    trimmedEndMs,
    totalTrimmedMs,
    originalDurationMs,
    trimmedDurationMs,
    appliedStartThreshold: adaptiveStartThreshold,
    appliedEndThreshold: adaptiveEndThreshold,
    suppressedClicks: suppressedClicksInClip,
    dynamicBufferSize: activeDynamicBufferSize
  };
}

/**
 * 將多個已經過 `trimStart` 與 `trimEnd` 清理的語音片段無縫拼接為單一連續 `AudioBuffer`
 * 結合預測性過零點 (Predictive Zero-Crossing) 邊界對齊與根據 `speechSpeed` 動態縮減的微呼吸間隙，
 * 確保在調整語速時各分段波形銜接極致平滑、徹底消除分段 'click' 雜訊
 */
export function concatenateTrimmedAudioBuffers(
  ctx: BaseAudioContext,
  buffers: AudioBuffer[],
  interChunkBreathMs?: number,
  speechSpeed: number = lastTrackedSpeechSpeed
): AudioBuffer | null {
  const validBuffers = buffers.filter((b) => Boolean(b && b.length > 0));
  if (validBuffers.length === 0) return null;
  if (validBuffers.length === 1) return validBuffers[0];

  const dynConfig = getDynamicAudioBufferConfig(speechSpeed);
  const effectiveBreathMs = interChunkBreathMs ?? dynConfig.interChunkBreathMs;
  const sampleRate = validBuffers[0].sampleRate;
  const numChannels = validBuffers[0].numberOfChannels;
  const breathSamples = Math.max(0, Math.floor((effectiveBreathMs / 1000) * sampleRate));
  const boundaryTaperSamples = Math.max(8, Math.floor(sampleRate * 0.0018)); // 1.8ms 微接縫平順保護，絕不砍損子音

  const totalLength = validBuffers.reduce(
    (acc, buf, idx) => acc + buf.length + (idx < validBuffers.length - 1 ? breathSamples : 0),
    0
  );

  const mergedBuffer = ctx.createBuffer(numChannels, Math.max(1, totalLength), sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const outData = mergedBuffer.getChannelData(ch);
    let writeOffset = 0;

    for (let bIdx = 0; bIdx < validBuffers.length; bIdx++) {
      const buf = validBuffers[bIdx];
      const chIdx = Math.min(ch, buf.numberOfChannels - 1);
      const inData = buf.getChannelData(chIdx);
      const segLen = buf.length;
      const needStartTaper = bIdx > 0 && Math.abs(inData[0]) > 0.0005;
      const needEndTaper = bIdx < validBuffers.length - 1 && Math.abs(inData[segLen - 1]) > 0.0005;
      const taper = Math.min(boundaryTaperSamples, Math.floor(segLen * 0.04));

      for (let i = 0; i < segLen; i++) {
        let s = inData[i];
        if (needStartTaper && i < taper && taper > 1) {
          const t = i / taper;
          s *= t * t * (3 - 2 * t);
        } else if (needEndTaper && i >= segLen - taper && taper > 1) {
          const rem = segLen - 1 - i;
          const t = rem / taper;
          s *= t * t * (3 - 2 * t);
        }
        outData[writeOffset + i] = s;
      }
      if (segLen > 2) {
        outData[writeOffset] = 0;
        outData[writeOffset + segLen - 1] = 0;
      }
      writeOffset += segLen;

      if (bIdx < validBuffers.length - 1 && breathSamples > 0) {
        writeOffset += breathSamples; // Float32Array 預設為 0.0 純淨句間微呼吸間隙
      }
    }
  }

  return mergedBuffer;
}

const FSET_WAV_DRAIN_PAD_MS = 180;
const FSET_WAV_VERSION = 6;
const processedWavBlobSet = new WeakSet<Blob>();
const wavSpeechDurationSecMap = new WeakMap<Blob, number>();

/**
 * 解析自訂 'FSET' RIFF 區塊：識別是否已完成 Studio trimStart/trimEnd 與防重覆裁切標記，並取得實際語音樣本長度與排空靜音墊長度
 */
function parseFsetWavMetadata(arrayBuffer: ArrayBuffer): {
  isProcessed: boolean;
  speechSamples: number;
  drainPadSamples: number;
  speechDurationSec: number;
} | null {
  if (!arrayBuffer || arrayBuffer.byteLength < 60) return null;
  const view = new DataView(arrayBuffer);
  const readTag = (off: number) =>
    String.fromCharCode(
      view.getUint8(off),
      view.getUint8(off + 1),
      view.getUint8(off + 2),
      view.getUint8(off + 3)
    );
  if (readTag(0) !== 'RIFF' || readTag(8) !== 'WAVE') return null;

  let sampleRate = 44100;
  let offset = 12;
  while (offset + 8 <= arrayBuffer.byteLength) {
    const chunkId = readTag(offset);
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === 'fmt ' && offset + 16 <= arrayBuffer.byteLength) {
      sampleRate = view.getUint32(offset + 12, true) || 44100;
    } else if (chunkId === 'FSET' && chunkSize >= 12 && offset + 20 <= arrayBuffer.byteLength) {
      const ver = view.getUint32(offset + 8, true);
      const speechSamples = view.getUint32(offset + 12, true);
      const drainPadSamples = view.getUint32(offset + 16, true);
      if (ver === FSET_WAV_VERSION && speechSamples > 0) {
        return {
          isProcessed: true,
          speechSamples,
          drainPadSamples,
          speechDurationSec: speechSamples / sampleRate
        };
      }
    }
    const nextOffset = offset + 8 + chunkSize + (chunkSize % 2);
    if (nextOffset <= offset) break;
    offset = nextOffset;
  }
  return null;
}

/**
 * 將完成 `trimStart` / `trimEnd` 與去喀嗒聲處理的 `AudioBuffer` 編碼為記憶體內 16-bit PCM WAV `Blob`
 * 內嵌 'FSET' 中繼區塊防範二次重覆裁切，並於尾端自動補上 180ms 純數位零值 (0.0) WSOLA 排空保護墊，
 * 徹底根除瀏覽器在變速播放 (`preservesPitch = true`) 時輸出 FIFO 尚未吐完即觸發 `ended` 截斷尾音的問題！
 */
export function encodeAudioBufferToWavBlob(
  buffer: AudioBuffer,
  drainPadMs: number = FSET_WAV_DRAIN_PAD_MS
): Blob {
  const numChannels = Math.min(2, Math.max(1, buffer.numberOfChannels));
  const sampleRate = buffer.sampleRate;
  const speechSamples = buffer.length;
  const drainPadSamples = Math.max(0, Math.floor((drainPadMs / 1000) * sampleRate));
  const totalOutSamples = speechSamples + drainPadSamples;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalOutSamples * blockAlign;
  // 44 (RIFF + fmt + data header) + 20 ('FSET' chunk: 8 header + 12 payload) = 64 bytes
  const fsetChunkTotalBytes = 20;
  const arrayBuffer = new ArrayBuffer(44 + fsetChunkTotalBytes + dataSize);
  const view = new DataView(arrayBuffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + fsetChunkTotalBytes + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16 bits per sample
  writeAscii(36, 'FSET');
  view.setUint32(40, 12, true);
  view.setUint32(44, FSET_WAV_VERSION, true);
  view.setUint32(48, speechSamples, true);
  view.setUint32(52, drainPadSamples, true);
  writeAscii(56, 'data');
  view.setUint32(60, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 64;
  for (let i = 0; i < speechSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }
  // 剩餘 drainPadSamples * blockAlign 位元組在新建 ArrayBuffer 中預設為 0x0000 (零雜訊純淨排空保護墊)

  const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  processedWavBlobSet.add(blob);
  wavSpeechDurationSecMap.set(blob, speechSamples / sampleRate);
  return blob;
}

async function decodeAndCacheAudioBuffer(
  chunkText: string,
  lang: 'en-US' | 'zh-TW',
  speechSpeed: number,
  blob: Blob
): Promise<AudioBuffer | null> {
  const key = getMemoryCacheKey(chunkText, lang, speechSpeed);
  // 根據當前 speechSpeed 動態同步 AudioContext buffer size 設定
  syncDynamicAudioBufferForSpeed(speechSpeed);
  const cached = memoryDecodedAudioBufferCache.get(key);
  if (cached) {
    memoryDecodedAudioBufferCache.delete(key);
    memoryDecodedAudioBufferCache.set(key, cached);
    return cached;
  }
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return null;
    // 注意：絕不在背景預解碼時 await ctx.resume()，因為在未發生使用者點擊前 resume() Promise 會無限期掛起導致死鎖！
    const arrayBuffer = await blob.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength <= 64) return null;

    const fsetMeta = parseFsetWavMetadata(arrayBuffer);

    // 2500ms 解碼保護（兼顧行動端較長句型與拼接 WAV）
    const rawDecoded = await Promise.race([
      ctx.decodeAudioData(arrayBuffer.slice(0)),
      new Promise<AudioBuffer | null>((resolve) => setTimeout(() => resolve(null), 2500))
    ]);

    if (rawDecoded && rawDecoded.duration > 0) {
      let cleanBuffer: AudioBuffer;
      if (fsetMeta?.isProcessed || processedWavBlobSet.has(blob)) {
        // 已經過 Studio 清理的 WAV：絕不二次重覆 trimStart/trimEnd，僅將末尾排空保護墊裁平至實質語音長度
        processedWavBlobSet.add(blob);
        if (fsetMeta) {
          wavSpeechDurationSecMap.set(blob, fsetMeta.speechDurationSec);
        }
        const targetRatio =
          fsetMeta && fsetMeta.speechSamples > 0 && fsetMeta.drainPadSamples > 0
            ? fsetMeta.speechSamples / (fsetMeta.speechSamples + fsetMeta.drainPadSamples)
            : 1;
        const keepSamples = Math.max(
          1,
          Math.min(rawDecoded.length, Math.round(rawDecoded.length * targetRatio))
        );
        if (keepSamples < rawDecoded.length && targetRatio < 0.995) {
          cleanBuffer = ctx.createBuffer(rawDecoded.numberOfChannels, keepSamples, rawDecoded.sampleRate);
          for (let ch = 0; ch < rawDecoded.numberOfChannels; ch++) {
            cleanBuffer.getChannelData(ch).set(rawDecoded.getChannelData(ch).subarray(0, keepSamples));
          }
        } else {
          cleanBuffer = rawDecoded;
        }
      } else {
        // 原始未處理之 MP3 / WAV：透過實時 AudioAnalyser 動態閾值執行唯一一次 trimStart / trimEnd 與過零點對齊
        const dynamicTrimOptions = computeDynamicTrimThresholdsWithAnalyser(ctx, rawDecoded, speechSpeed);
        const { buffer: trimmedBuffer } = trimAudioBufferSilence(ctx, rawDecoded, dynamicTrimOptions);
        cleanBuffer = trimmedBuffer;
      }

      if (memoryDecodedAudioBufferCache.size >= MAX_RAM_DECODED_BUFFERS && !memoryDecodedAudioBufferCache.has(key)) {
        const oldest = memoryDecodedAudioBufferCache.keys().next().value;
        if (oldest) memoryDecodedAudioBufferCache.delete(oldest);
      }
      memoryDecodedAudioBufferCache.set(key, cleanBuffer);

      // 同步將清理後的 WAV Blob（含 180ms WSOLA 排空墊）存入快取，供 HTMLAudioElement 直接播放
      if (!memoryTrimmedWavBlobCache.has(key)) {
        if (fsetMeta?.isProcessed && fsetMeta.drainPadSamples > 0) {
          storeMemoryTrimmedWavBlob(key, blob);
        } else {
          const trimmedWavBlob = encodeAudioBufferToWavBlob(cleanBuffer);
          storeMemoryTrimmedWavBlob(key, trimmedWavBlob);
        }
      }
      return cleanBuffer;
    }
  } catch {
    return null;
  }
  return null;
}

export function getAudioBufferStats(): AudioBufferStats {
  return {
    ramCachedBlobs: memoryAudioBlobCache.size,
    inFlightRequests: inFlightCloudBlobMap.size,
    cacheHitCount: bufferCacheHitCount,
    cacheMissCount: bufferCacheMissCount,
    prebufferedChunksCount: prebufferedChunksTotal,
    underrunRecoveryCount,
    conflictPreventedCount,
    completedTasksCount: completedSpeechTasksCount,
    predictiveCachedCount: predictiveCachedTotal,
    activePredictiveRequests: activePredictiveRequestsCount,
    currentSpeedBucket: getSpeechSpeedBucket(lastTrackedSpeechSpeed),
    trimmedChunksCount: trimmedChunksTotalCount,
    totalTrimmedSilenceMs: totalTrimmedSilenceMsAcc,
    dynamicNoiseFloor: trackedResidualNoiseFloor,
    dynamicStartThreshold: trackedDynamicStartThreshold,
    dynamicEndThreshold: trackedDynamicEndThreshold,
    clickPopSuppressedCount: totalClickPopSuppressedCount,
    dynamicAudioBufferSize: currentDynamicAudioBufferSize,
    predictiveZeroCrossingAlignments: totalPredictiveZeroCrossingAlignments,
    taskRetryCount,
    taskRecoverySuccessCount
  };
}

/**
 * 清除指定語句的 RAM 快取（於錯誤恢復重試時使用，防止損毀或截斷之 Blob 反覆命中）
 */
function evictMemoryAudioCacheForSentence(
  rawText: string,
  lang: 'en-US' | 'zh-TW',
  speechSpeed: number
): void {
  const chunks = splitTtsChunks(rawText, 155);
  const targets = chunks.length > 1 ? [rawText, ...chunks] : chunks;
  for (const seg of targets) {
    const k1 = getMemoryCacheKey(seg, lang, speechSpeed);
    const k2 = getMemoryCacheKey(seg, lang, 0.85);
    memoryAudioBlobCache.delete(k1);
    memoryTrimmedWavBlobCache.delete(k1);
    memoryDecodedAudioBufferCache.delete(k1);
    memoryAudioBlobCache.delete(k2);
    memoryTrimmedWavBlobCache.delete(k2);
    memoryDecodedAudioBufferCache.delete(k2);
  }
}

/**
 * 檢查指定句子在對應語速下是否已預緩存於 RAM 快取池中
 */
export function isSentenceAudioCached(
  rawText: string,
  lang: 'en-US' | 'zh-TW' = 'en-US',
  speechSpeed: number = 0.85
): boolean {
  if (!rawText || !rawText.trim()) return false;
  const cleaned = lang === 'en-US' ? cleanEnglishText(rawText) : preprocessSpeechText(rawText, false);
  if (!cleaned) return false;
  const chunks = splitTtsChunks(cleaned, 155);
  if (chunks.length === 0) return false;
  return chunks.every((chunk) => Boolean(lookupMemoryAudioBlob(chunk, lang, speechSpeed)));
}

/**
 * 統一去重預緩衝音訊載入器 (Deduplicated, Speed-Aware & Retry-Resilient Cloud Audio Blob Pre-Buffer)
 * 1. 依據 speechSpeed 優先命中對應語速層級的 RAM 快取 (0ms)
 * 2. 若已有相同句子與語速層級的 In-Flight 網路請求，直接共用 Promise (杜絕重複請求衝突)
 * 3. 查詢 IndexedDB 離線快取
 * 4. 攜帶 speed 參數向 /api/tts 拉取完整 MPEG/WAV 二進位音訊並內建指數退避重試 (Exponential Backoff + Jitter)
 */
export async function fetchAndBufferCloudAudioBlob(
  chunkText: string,
  lang: 'en-US' | 'zh-TW' = 'en-US',
  timeoutMs: number = 5500,
  speechSpeed: number = 0.85,
  isPredictive: boolean = false,
  options?: { bypassCache?: boolean; maxRetries?: number }
): Promise<Blob | null> {
  const normalized = chunkText.replace(/\s+/g, ' ').trim();
  if (!normalized || typeof window === 'undefined') return null;

  const effectiveSpeed = Number.isFinite(speechSpeed) && speechSpeed > 0 ? speechSpeed : 0.85;
  lastTrackedSpeechSpeed = effectiveSpeed;
  const bypassCache = Boolean(options?.bypassCache);
  const maxRetries = typeof options?.maxRetries === 'number' ? Math.max(0, options.maxRetries) : (isPredictive ? 1 : 2);

  const memKey = getMemoryCacheKey(normalized, lang, effectiveSpeed);
  if (!bypassCache) {
    const existingCleaned = lookupMemoryAudioBlob(normalized, lang, effectiveSpeed);
    if (existingCleaned && existingCleaned.size > 64) {
      bufferCacheHitCount++;
      return existingCleaned;
    }

    const existingInFlight = inFlightCloudBlobMap.get(memKey);
    if (existingInFlight) {
      bufferCacheHitCount++;
      return existingInFlight;
    }
  }

  bufferCacheMissCount++;
  if (isPredictive) {
    activePredictiveRequestsCount++;
  }

  const fetchPromise = (async (): Promise<Blob | null> => {
    try {
      if (!bypassCache) {
        const idbCached = await getCachedAudioSnippet(normalized, lang, effectiveSpeed);
        if (idbCached?.audioBlob && idbCached.audioBlob.size > 64) {
          storeMemoryAudioBlob(memKey, idbCached.audioBlob);
          decodeAndCacheAudioBuffer(normalized, lang, effectiveSpeed, idbCached.audioBlob).catch(() => null);
          prebufferedChunksTotal++;
          if (isPredictive) predictiveCachedTotal++;
          return memoryTrimmedWavBlobCache.get(memKey) || idbCached.audioBlob;
        }
      }

      if (typeof fetch !== 'function') return null;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

      const url = `/api/tts?lang=${encodeURIComponent(lang)}&speed=${encodeURIComponent(effectiveSpeed.toFixed(2))}&text=${encodeURIComponent(normalized)}`;
      let blob: Blob | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) break;

        const controller = new AbortController();
        const attemptTimeoutMs = attempt === 0 ? timeoutMs : Math.min(8000, timeoutMs + attempt * 1400);
        const timer = setTimeout(() => controller.abort(), attemptTimeoutMs);
        let retryable = false;

        try {
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) {
            // 僅針對暫時性限流、逾時或 5xx 伺服器錯誤進行重試
            retryable = res.status === 408 || res.status === 429 || res.status >= 500;
          } else {
            const candidate = await res.blob();
            if (candidate && candidate.size > 64 && !candidate.type.includes('text') && !candidate.type.includes('json')) {
              blob = candidate;
              break;
            }
            retryable = true;
          }
        } catch {
          retryable = true;
        } finally {
          // 網路下載完畢立即清除 abort 計時器，避免後續 AudioContext 解碼耗時誤觸 abort
          clearTimeout(timer);
        }

        if (!retryable || attempt >= maxRetries) {
          break;
        }

        // 具抖動的指數退避延遲 (~220ms -> ~580ms)，避免重試風暴同時快速跨越短暫網路抖動
        const backoffMs = Math.round(200 * Math.pow(2.4, attempt) + Math.random() * 120);
        await new Promise((r) => setTimeout(r, backoffMs));
      }

      if (blob && blob.size > 64 && !blob.type.includes('text') && !blob.type.includes('json')) {
        storeMemoryAudioBlob(memKey, blob);
        const stdKey = getMemoryCacheKey(normalized, lang, 0.85);
        if (!memoryAudioBlobCache.has(stdKey)) {
          storeMemoryAudioBlob(stdKey, blob);
        }

        const trimmedBuffer = await decodeAndCacheAudioBuffer(normalized, lang, effectiveSpeed, blob).catch(
          () => null
        );
        const processedBlob = memoryTrimmedWavBlobCache.get(memKey) || blob;
        if (trimmedBuffer && !memoryTrimmedWavBlobCache.has(stdKey)) {
          storeMemoryTrimmedWavBlob(stdKey, processedBlob);
        }

        prebufferedChunksTotal++;
        if (isPredictive) predictiveCachedTotal++;
        const exactDurationMs = trimmedBuffer
          ? Math.max(250, Math.round(trimmedBuffer.duration * 1000))
          : Math.max(500, Math.round((normalized.length * 85) / Math.max(0.55, effectiveSpeed)));
        saveAudioSnippetToCache(normalized, lang, effectiveSpeed, {
          audioBlob: processedBlob,
          durationMs: exactDurationMs
        }).catch(() => {});
        return processedBlob;
      }
      return bypassCache ? null : lookupMemoryAudioBlob(normalized, lang, effectiveSpeed);
    } catch {
      return bypassCache ? null : lookupMemoryAudioBlob(normalized, lang, effectiveSpeed);
    } finally {
      if (inFlightCloudBlobMap.get(memKey) === fetchPromise) {
        inFlightCloudBlobMap.delete(memKey);
      }
      if (isPredictive) {
        activePredictiveRequestsCount = Math.max(0, activePredictiveRequestsCount - 1);
      }
    }
  })();

  if (!bypassCache) {
    inFlightCloudBlobMap.set(memKey, fetchPromise);
  }
  return fetchPromise;
}

// ============================================================================
// 預測性音訊緩存引擎 (Predictive Audio Cache Engine based on speechSpeed)
// ============================================================================
interface QueuedPredictiveTask {
  chunkText: string;
  lang: 'en-US' | 'zh-TW';
  speechSpeed: number;
  priorityWeight: number;
}

const predictiveTaskQueue: QueuedPredictiveTask[] = [];
const predictiveQueuedKeys = new Set<string>();
let isPredictiveWorkerActive = false;
let predictiveScheduleTimer: ReturnType<typeof setTimeout> | null = null;
let latestPredictiveLessonContext: PredictiveLessonContext | null = null;

function getPredictivePriorityWeight(priority?: PredictiveCacheTarget['priority']): number {
  switch (priority) {
    case 'immediate':
      return 1;
    case 'next_pattern':
      return 2;
    case 'next_lesson':
      return 3;
    case 'background':
    default:
      return 4;
  }
}

export interface UtteranceLatencySample {
  text: string;
  lang: string;
  latencyMs: number;
  engine: 'cloud' | 'native';
  isOver500ms: boolean;
  timestamp: number;
}

export interface PreReadSchedulerMetrics {
  slidingWindowSize: number;
  slidingWindowPreloads: number;
  idbFastPromotions: number;
  foregroundYields: number;
  adaptiveConcurrency: number;
  ewmaLatencyMs: number;
  over500msCount: number;
  pendingQueueDepth: number;
  lastSample: UtteranceLatencySample | null;
}

let slidingWindowPreloadsCount = 0;
let idbFastPromotionsCount = 0;
let foregroundYieldsCount = 0;
let currentAdaptiveConcurrency = 1;
let recentTtsLatencyEwmaMs = 180;
let over500msUtteranceCount = 0;
let lastUtteranceLatencySample: UtteranceLatencySample | null = null;
const utteranceLatencySubscribers = new Set<(sample: UtteranceLatencySample) => void>();

export function subscribeUtteranceLatency(
  listener: (sample: UtteranceLatencySample) => void
): () => void {
  utteranceLatencySubscribers.add(listener);
  return () => {
    utteranceLatencySubscribers.delete(listener);
  };
}

export function getPreReadSchedulerMetrics(): PreReadSchedulerMetrics {
  return {
    slidingWindowSize: 3,
    slidingWindowPreloads: slidingWindowPreloadsCount,
    idbFastPromotions: idbFastPromotionsCount,
    foregroundYields: foregroundYieldsCount,
    adaptiveConcurrency: currentAdaptiveConcurrency,
    ewmaLatencyMs: Math.round(recentTtsLatencyEwmaMs),
    over500msCount: over500msUtteranceCount,
    pendingQueueDepth: predictiveTaskQueue.length,
    lastSample: lastUtteranceLatencySample,
  };
}

function recordUtteranceLatencySample(
  text: string,
  lang: string,
  rawLatencyMs: number,
  engine: 'cloud' | 'native'
): UtteranceLatencySample {
  const latencyMs = Math.max(0, Math.min(15000, Math.round(rawLatencyMs)));
  latencyHistory.push(latencyMs);
  if (latencyHistory.length > 80) latencyHistory.shift();

  // EWMA 平滑更新，用於驅動預讀佇列的延遲自適應併發度
  recentTtsLatencyEwmaMs = recentTtsLatencyEwmaMs * 0.7 + latencyMs * 0.3;
  const isOver500ms = latencyMs > 500;
  if (isOver500ms) {
    over500msUtteranceCount++;
  }

  const sample: UtteranceLatencySample = {
    text,
    lang,
    latencyMs,
    engine,
    isOver500ms,
    timestamp: Date.now(),
  };
  lastUtteranceLatencySample = sample;
  utteranceLatencySubscribers.forEach((fn) => {
    try {
      fn(sample);
    } catch {}
  });
  return sample;
}

async function drainPredictiveTaskQueue(activeSpeed: number): Promise<void> {
  if (isPredictiveWorkerActive || predictiveTaskQueue.length === 0) return;
  isPredictiveWorkerActive = true;

  try {
    const normalizedSpeed = Math.max(0.65, Math.min(1.25, activeSpeed || 0.85));

    while (predictiveTaskQueue.length > 0) {
      // 依優先權排序，確保「當前句型 (1)」與「下一個句型 (2)」永遠優先於跨關卡背景任務 (3/4)
      predictiveTaskQueue.sort((a, b) => a.priorityWeight - b.priorityWeight);

      // 前景緩衝保護：若主播放引擎正處於 BUFFERING 且下一個預讀屬低優先權，主動退讓 45ms 避免搶佔頻寬
      const nextHead = predictiveTaskQueue[0];
      const schedulerPhase =
        typeof globalAudioScheduler !== 'undefined' ? globalAudioScheduler.getState().enginePhase : 'IDLE';
      if (schedulerPhase === 'BUFFERING' && nextHead && nextHead.priorityWeight >= 3) {
        foregroundYieldsCount++;
        await new Promise((r) => setTimeout(r, 45));
        continue;
      }

      // 延遲自適應併發度與節流間隔：若 EWMA > 500ms 降為單執行緒並溫和退避，否則開啟雙路平行預讀
      const isCongested = recentTtsLatencyEwmaMs > 500;
      const concurrency = isCongested ? 1 : normalizedSpeed >= 0.85 ? 2 : 1;
      currentAdaptiveConcurrency = concurrency;
      const interRequestDelayMs = isCongested
        ? Math.min(180, Math.round(recentTtsLatencyEwmaMs * 0.14))
        : Math.max(12, Math.round(24 / normalizedSpeed));

      const batch = predictiveTaskQueue.splice(0, concurrency);
      await Promise.all(
        batch.map(async (item) => {
          const dedupeKey = getMemoryCacheKey(item.chunkText, item.lang, item.speechSpeed);
          predictiveQueuedKeys.delete(dedupeKey);
          if (memoryAudioBlobCache.has(dedupeKey)) return;

          // IndexedDB 極速升階至 RAM（< 5ms），完全省去不必要的雲端重複請求
          try {
            const cached = await getCachedAudioSnippet(item.chunkText, item.lang, item.speechSpeed);
            if (cached?.audioBlob && cached.audioBlob.size > 64) {
              storeMemoryAudioBlob(dedupeKey, cached.audioBlob);
              idbFastPromotionsCount++;
              decodeAndCacheAudioBuffer(item.chunkText, item.lang, item.speechSpeed, cached.audioBlob).catch(() => null);
              return;
            }
          } catch {}

          const fetchStart = performance.now();
          await fetchAndBufferCloudAudioBlob(
            item.chunkText,
            item.lang,
            4500,
            item.speechSpeed,
            true
          ).catch(() => null);
          const fetchElapsed = performance.now() - fetchStart;
          if (fetchElapsed > 30) {
            recentTtsLatencyEwmaMs = recentTtsLatencyEwmaMs * 0.85 + Math.min(fetchElapsed, 3000) * 0.15;
          }
        })
      );

      if (predictiveTaskQueue.length > 0) {
        await new Promise((r) => setTimeout(r, interRequestDelayMs));
      }
    }
  } finally {
    isPredictiveWorkerActive = false;
  }
}

/**
 * 排程預測性音訊緩存任務：根據 speechSpeed 預先將下一個句型與相鄰關卡的音訊片段拉取至 RAM 與 IndexedDB
 */
export function schedulePredictiveAudioCache(
  targets: PredictiveCacheTarget[],
  baseSpeechSpeed: number = 0.85
): Promise<void> {
  if (typeof window === 'undefined' || !targets || targets.length === 0) {
    return Promise.resolve();
  }

  const effectiveBaseSpeed = Number.isFinite(baseSpeechSpeed) && baseSpeechSpeed > 0 ? baseSpeechSpeed : 0.85;
  lastTrackedSpeechSpeed = effectiveBaseSpeed;

  for (const target of targets) {
    if (!target?.text?.trim()) continue;
    const lang: 'en-US' | 'zh-TW' = target.lang === 'zh-TW' ? 'zh-TW' : 'en-US';
    const spd =
      typeof target.speechSpeed === 'number' && target.speechSpeed > 0
        ? target.speechSpeed
        : effectiveBaseSpeed;
    const cleaned = lang === 'en-US' ? cleanEnglishText(target.text) : preprocessSpeechText(target.text, false);
    if (!cleaned) continue;

    const chunks = splitTtsChunks(cleaned, 155);
    const weight = getPredictivePriorityWeight(target.priority);

    for (const chunkText of chunks) {
      const memKey = getMemoryCacheKey(chunkText, lang, spd);
      if (memoryAudioBlobCache.has(memKey) || inFlightCloudBlobMap.has(memKey) || predictiveQueuedKeys.has(memKey)) {
        continue;
      }
      predictiveQueuedKeys.add(memKey);
      predictiveTaskQueue.push({
        chunkText,
        lang,
        speechSpeed: spd,
        priorityWeight: weight
      });
    }
  }

  return drainPredictiveTaskQueue(effectiveBaseSpeed);
}

/**
 * 根據當前關卡句型、作用中句型索引與 `speechSpeed`，智慧預測並提前緩存：
 * 1. 當前句型於 `speechSpeed` 下的音訊（立即就緒）
 * 2. 同關卡「下一個句型 (Next Sentence Pattern)」與相鄰句型於 `speechSpeed` 下的音訊
 * 3. 當 `speechSpeed <= 0.85` 時，同步預熱 `0.7x` 慢速清晰層級，支援無縫切換三速與慢讀
 * 4. 下一關 (Next Lesson) 與上一關 (Prev Lesson) 的核心句型音訊，徹底消除切換關卡時的載入空白
 */
export function predictAndCacheNextSentences(ctx: PredictiveLessonContext): void {
  if (typeof window === 'undefined' || !ctx) return;
  latestPredictiveLessonContext = ctx;

  const {
    currentSentences = [],
    activeSentenceIndex = 0,
    nextLessonSentences = [],
    prevLessonSentences = [],
    speechSpeed = 0.85,
    includeBilingual = false
  } = ctx;

  const effectiveSpeed = Number.isFinite(speechSpeed) && speechSpeed > 0 ? speechSpeed : 0.85;
  lastTrackedSpeechSpeed = effectiveSpeed;

  if (predictiveScheduleTimer) {
    clearTimeout(predictiveScheduleTimer);
    predictiveScheduleTimer = null;
  }

  // 依據 speechSpeed 動態決定預啟動延遲：語速較快時更早發起預載
  const leadDelayMs = effectiveSpeed >= 1.0 ? 25 : 45;

  predictiveScheduleTimer = setTimeout(() => {
    predictiveScheduleTimer = null;
    const targets: PredictiveCacheTarget[] = [];
    const totalPatterns = currentSentences.length;

    // 1. 當前正在瀏覽的句型 (Priority: immediate)
    const activeItem = currentSentences[activeSentenceIndex] || currentSentences[0];
    if (activeItem?.english) {
      targets.push({
        text: activeItem.english,
        lang: 'en-US',
        speechSpeed: effectiveSpeed,
        priority: 'immediate'
      });
      if (includeBilingual && activeItem.chinese) {
        targets.push({
          text: activeItem.chinese,
          lang: 'zh-TW',
          speechSpeed: 0.95,
          priority: 'immediate'
        });
      }
    }

    // 2. 預測下一個句型 (Next Pattern in Current Lesson - Priority: next_pattern)
    if (totalPatterns > 1) {
      for (let offset = 1; offset < totalPatterns; offset++) {
        const nextIdx = (activeSentenceIndex + offset) % totalPatterns;
        const nextPattern = currentSentences[nextIdx];
        if (nextPattern?.english) {
          targets.push({
            text: nextPattern.english,
            lang: 'en-US',
            speechSpeed: effectiveSpeed,
            priority: offset === 1 ? 'next_pattern' : 'next_lesson'
          });
          // 若處於慢速或標準學習語速，為當前與下一個句型額外預熱 0.7x 慢讀音訊層級
          if (effectiveSpeed > 0.72 && effectiveSpeed <= 0.9 && offset === 1) {
            targets.push({
              text: nextPattern.english,
              lang: 'en-US',
              speechSpeed: 0.7,
              priority: 'next_lesson'
            });
          }
          if (includeBilingual && nextPattern.chinese && offset === 1) {
            targets.push({
              text: nextPattern.chinese,
              lang: 'zh-TW',
              speechSpeed: 0.95,
              priority: 'next_pattern'
            });
          }
        }
      }
    }

    // 若當前句型本身在標準語速，也預熱 0.7x 慢速專版以支援一鍵 0.7x / 三速特訓
    if (activeItem?.english && effectiveSpeed > 0.72 && effectiveSpeed <= 0.9) {
      targets.push({
        text: activeItem.english,
        lang: 'en-US',
        speechSpeed: 0.7,
        priority: 'next_pattern'
      });
    }

    // 3. 預測下一關 (Next Lesson) 的句型，消除滑動/點擊切換下一關時的載入空白
    const lookaheadPatternLimit = effectiveSpeed >= 1.0 ? 3 : 2;
    nextLessonSentences.slice(0, lookaheadPatternLimit).forEach((s, idx) => {
      if (s?.english) {
        targets.push({
          text: s.english,
          lang: 'en-US',
          speechSpeed: effectiveSpeed,
          priority: idx === 0 ? 'next_pattern' : 'next_lesson'
        });
      }
      if (includeBilingual && s?.chinese && idx === 0) {
        targets.push({
          text: s.chinese,
          lang: 'zh-TW',
          speechSpeed: 0.95,
          priority: 'next_lesson'
        });
      }
    });

    // 4. 預測上一關 (Prev Lesson) 的首句，支援雙向無塵室手勢滑動零延遲
    prevLessonSentences.slice(0, 1).forEach((s) => {
      if (s?.english) {
        targets.push({
          text: s.english,
          lang: 'en-US',
          speechSpeed: effectiveSpeed,
          priority: 'background'
        });
      }
    });

    schedulePredictiveAudioCache(targets, effectiveSpeed).catch(() => {});
  }, leadDelayMs);
}

interface WordTimelineEntry {
  wordIndex: number;
  rawWord: string;
  cleanWord: string;
  charIndex: number;
  startRatio: number;
  endRatio: number;
}

/**
 * 建立語句聲學單字時間軸 (Acoustic Word-Boundary Timeline)
 * 根據單字音節長度、縮寫連字號與標點停頓權重，精準映射播放時間比例 (0.0~1.0) 與字元索引至對應單字，
 * 讓 Cloud HD 音訊串流與本地 Web Speech 皆能即時驅動 UI 逐字朗讀高亮 (onProgress)
 */
function buildSentenceWordTimeline(rawText: string): WordTimelineEntry[] {
  const source = (rawText || '').trim();
  if (!source) return [];

  const matches = Array.from(source.matchAll(/\S+/g));
  if (matches.length === 0) return [];

  const weights = matches.map((m) => {
    const token = m[0];
    const clean = token.replace(/^[^a-zA-Z0-9\u4e00-\u9fa5]+|[^a-zA-Z0-9\u4e00-\u9fa5]+$/g, '');
    let weight = Math.max(2, clean.length);
    // 全大寫縮寫 (如 FOUP, MFC, SECS/GEM, LOTO) 發音拍數較長
    if (/^[A-Z0-9\/-]{2,8}$/.test(clean)) {
      weight += clean.length * 1.6;
    }
    // 逗號、分號、句號帶有自然語氣停頓權重
    if (/[,;，；:：]$/.test(token)) {
      weight += 3.2;
    } else if (/[.!?。！？]$/.test(token)) {
      weight += 2.4;
    }
    return weight;
  });

  const totalWeight = weights.reduce((acc, w) => acc + w, 0) || 1;
  let cumulative = 0;

  return matches.map((m, idx) => {
    const rawWord = m[0];
    const cleanWord = rawWord.replace(/^[^a-zA-Z0-9\u4e00-\u9fa5-]+|[^a-zA-Z0-9\u4e00-\u9fa5-]+$/g, '');
    const startRatio = cumulative / totalWeight;
    cumulative += weights[idx];
    const endRatio = idx === matches.length - 1 ? 1.0 : cumulative / totalWeight;
    return {
      wordIndex: idx,
      rawWord,
      cleanWord: cleanWord || rawWord,
      charIndex: m.index ?? 0,
      startRatio,
      endRatio
    };
  });
}

function resolveWordAtRatio(
  timeline: WordTimelineEntry[],
  ratio: number
): { wordIndex: number; currentWord: string; charIndex: number; totalWords: number } {
  const totalWords = timeline.length;
  if (totalWords === 0) {
    return { wordIndex: -1, currentWord: '', charIndex: 0, totalWords: 0 };
  }
  const clamped = Math.max(0, Math.min(0.9999, ratio));
  for (let i = 0; i < totalWords; i++) {
    const entry = timeline[i];
    if (clamped >= entry.startRatio && clamped <= entry.endRatio) {
      return {
        wordIndex: entry.wordIndex,
        currentWord: entry.cleanWord,
        charIndex: entry.charIndex,
        totalWords
      };
    }
  }
  const last = timeline[totalWords - 1];
  return {
    wordIndex: last.wordIndex,
    currentWord: last.cleanWord,
    charIndex: last.charIndex,
    totalWords
  };
}

function resolveWordAtCharIndex(
  timeline: WordTimelineEntry[],
  cleanedTextLen: number,
  charIndex: number
): { wordIndex: number; currentWord: string; charIndex: number; totalWords: number } {
  const totalWords = timeline.length;
  if (totalWords === 0) {
    return { wordIndex: -1, currentWord: '', charIndex: 0, totalWords: 0 };
  }
  const ratio = cleanedTextLen > 0 ? Math.max(0, Math.min(0.999, charIndex / cleanedTextLen)) : 0;
  return resolveWordAtRatio(timeline, ratio);
}

type CloudPlaybackOutcome = 'played' | 'aborted' | 'failed';

async function playSingleCloudChunk(
  chunkText: string,
  lang: 'en-US' | 'zh-TW',
  rate: number,
  volume: number,
  expectedGenId: number,
  prebufferedBlob: Blob | null = null,
  onProgress?: (percent: number, remainSec: number, totalSec: number) => void
): Promise<CloudPlaybackOutcome> {
  if (expectedGenId !== cloudGenerationId) return 'aborted';

  let audioBlob: Blob | null = prebufferedBlob || lookupMemoryAudioBlob(chunkText, lang, rate) || null;
  if (!audioBlob) {
    audioBlob = await fetchAndBufferCloudAudioBlob(chunkText, lang, 5500, rate, false);
  }
  if (expectedGenId !== cloudGenerationId) return 'aborted';
  if (!audioBlob || audioBlob.size <= 64) {
    return 'failed';
  }

  // 確保播放前已透過 AudioContext 處理層完成 trimStart / trimEnd 靜音與邊界雜訊清理（含 180ms 排空保護墊）
  const memKey = getMemoryCacheKey(chunkText, lang, rate);
  if (!memoryTrimmedWavBlobCache.has(memKey)) {
    await decodeAndCacheAudioBuffer(chunkText, lang, rate, audioBlob).catch(() => null);
  }
  if (expectedGenId !== cloudGenerationId) return 'aborted';
  const cleanPlaybackBlob = memoryTrimmedWavBlobCache.get(memKey) || audioBlob;
  const knownSpeechDurSec = wavSpeechDurationSecMap.get(cleanPlaybackBlob) || 0;

  // 單一階自然母語語速校準（搭配 HTMLAudioElement preservesPitch = true 進行無變調時間伸縮）
  const baseScale = lang === 'en-US' ? 0.94 : 0.96;
  const calibratedRate = Math.max(0.66, Math.min(1.18, Number((rate * baseScale).toFixed(2))));

  const loudnessBoost = getPreferredLoudnessBoost();
  const eqProfileId = getPreferredEqualizerProfile();
  const eqProfile = EQUALIZER_PROFILES.find((p) => p.id === eqProfileId) || EQUALIZER_PROFILES[0];
  const boostedVol =
    loudnessBoost === 'boost_max' ? 1.0 : loudnessBoost === 'loud' ? Math.max(volume, 0.95) : volume;
  const clampedVol = Math.max(0.15, Math.min(1.0, boostedVol));
  const dspPreampMultiplier =
    loudnessBoost === 'boost_max' ? 1.58 : loudnessBoost === 'loud' ? 1.24 : 1.0;

  // 建立 5 段式聲學等化器 (80Hz / 300Hz / 1kHz / 3.5kHz / 8kHz) + 響度增益鏈 + 防破音動態壓縮限幅器
  const connectThroughDspEqualizer = (ctx: AudioContext, sourceNode: AudioNode): (() => void) => {
    const filter80 = ctx.createBiquadFilter();
    filter80.type = 'lowshelf';
    filter80.frequency.value = 80;
    filter80.gain.value = eqProfile.bands.hz80;

    const filter300 = ctx.createBiquadFilter();
    filter300.type = 'peaking';
    filter300.frequency.value = 300;
    filter300.Q.value = 1.0;
    filter300.gain.value = eqProfile.bands.hz300;

    const filter1k = ctx.createBiquadFilter();
    filter1k.type = 'peaking';
    filter1k.frequency.value = 1000;
    filter1k.Q.value = 1.1;
    filter1k.gain.value = eqProfile.bands.hz1k;

    const filter3k5 = ctx.createBiquadFilter();
    filter3k5.type = 'peaking';
    filter3k5.frequency.value = 3500;
    filter3k5.Q.value = 1.2;
    filter3k5.gain.value = eqProfile.bands.hz3k5;

    const filter8k = ctx.createBiquadFilter();
    filter8k.type = 'highshelf';
    filter8k.frequency.value = 8000;
    filter8k.gain.value = eqProfile.bands.hz8k;

    const gainNode = ctx.createGain();
    gainNode.gain.value = clampedVol * dspPreampMultiplier;
    activeCloudOutputGainNode = gainNode;

    // 加入安全防破音壓縮限幅器 (Safety Soft-Limiter)，確保大音量增益 + EQ 時人聲不削波失真
    const safetyLimiter = ctx.createDynamicsCompressor();
    safetyLimiter.threshold.value = -2.5;
    safetyLimiter.knee.value = 6;
    safetyLimiter.ratio.value = 10;
    safetyLimiter.attack.value = 0.002;
    safetyLimiter.release.value = 0.08;

    const realtimeAnalyser = getOrInitRealtimeAudioAnalyser(ctx, rate);

    sourceNode.connect(filter80);
    filter80.connect(filter300);
    filter300.connect(filter1k);
    filter1k.connect(filter3k5);
    filter3k5.connect(filter8k);
    filter8k.connect(gainNode);
    gainNode.connect(safetyLimiter);
    if (realtimeAnalyser) {
      safetyLimiter.connect(realtimeAnalyser);
      realtimeAnalyser.connect(ctx.destination);
    } else {
      safetyLimiter.connect(ctx.destination);
    }

    return () => {
      try {
        if (activeCloudOutputGainNode === gainNode) {
          activeCloudOutputGainNode = null;
        }
        sourceNode.disconnect();
        filter80.disconnect();
        filter300.disconnect();
        filter1k.disconnect();
        filter3k5.disconnect();
        filter8k.disconnect();
        gainNode.disconnect();
        safetyLimiter.disconnect();
      } catch {}
    };
  };

  const playViaWebAudioBuffer = async (): Promise<CloudPlaybackOutcome> => {
    const decodedBuffer = await decodeAndCacheAudioBuffer(chunkText, lang, rate, audioBlob!);
    if (expectedGenId !== cloudGenerationId) return 'aborted';
    const ctx = getSharedAudioContext();
    if (!decodedBuffer || !ctx) return 'failed';

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
      if (expectedGenId !== cloudGenerationId) return 'aborted';

      return await new Promise<CloudPlaybackOutcome>((resolve) => {
        if (expectedGenId !== cloudGenerationId) {
          resolve('aborted');
          return;
        }

        let settled = false;
        let progressTimer: ReturnType<typeof setInterval> | null = null;
        let safetyTimer: ReturnType<typeof setTimeout> | null = null;
        let tailTimer: ReturnType<typeof setTimeout> | null = null;

        // AudioBufferSourceNode 不支援 preservesPitch，因此限制變速範圍在 0.92~1.05 以保持自然人聲共振峰不變調
        const safeWebAudioRate = Math.max(0.92, Math.min(1.05, calibratedRate));

        const source = ctx.createBufferSource();
        source.buffer = decodedBuffer;
        source.playbackRate.value = safeWebAudioRate;

        const disconnectDsp = connectThroughDspEqualizer(ctx, source);
        activeCloudBufferSource = source;

        const rawDuration = Math.max(0.15, decodedBuffer.duration);
        const effectiveDurationSec = Math.max(0.15, rawDuration / safeWebAudioRate);
        const startCtxTime = ctx.currentTime;

        const done = (outcome: CloudPlaybackOutcome) => {
          if (settled) return;
          settled = true;
          sampleRealtimeAnalyserNoiseFloor();
          if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
          }
          if (safetyTimer) {
            clearTimeout(safetyTimer);
            safetyTimer = null;
          }
          if (tailTimer) {
            clearTimeout(tailTimer);
            tailTimer = null;
          }
          if (activeCloudAbort === abortBufferPlayback) {
            activeCloudAbort = null;
          }
          if (activeCloudBufferSource === source) {
            activeCloudBufferSource = null;
          }
          try {
            source.onended = null;
            if (outcome === 'aborted') {
              source.stop();
            }
          } catch {}
          disconnectDsp();
          resolve(outcome);
        };

        const abortBufferPlayback = () => {
          done('aborted');
        };
        activeCloudAbort = abortBufferPlayback;

        safetyTimer = setTimeout(() => {
          done(expectedGenId === cloudGenerationId ? 'played' : 'aborted');
        }, Math.ceil(effectiveDurationSec * 1000) + 5000);

        if (onProgress) {
          onProgress(2, Math.round(effectiveDurationSec * 10) / 10, Math.round(effectiveDurationSec * 10) / 10);
          progressTimer = setInterval(() => {
            if (settled || expectedGenId !== cloudGenerationId) return;
            sampleRealtimeAnalyserNoiseFloor();
            const elapsedSec = Math.max(0, ctx.currentTime - startCtxTime);
            const pct = Math.min(99, Math.max(2, Math.round((elapsedSec / effectiveDurationSec) * 100)));
            const rem = Math.max(0, Math.round((effectiveDurationSec - elapsedSec) * 10) / 10);
            const tot = Math.max(0.2, Math.round(effectiveDurationSec * 10) / 10);
            onProgress(pct, rem, tot);
          }, 35);
        }

        source.onended = () => {
          if (settled) return;
          if (expectedGenId !== cloudGenerationId) {
            done('aborted');
            return;
          }
          sampleRealtimeAnalyserNoiseFloor();
          if (onProgress) {
            const tot = Math.max(0.2, Math.round(effectiveDurationSec * 10) / 10);
            onProgress(100, 0, tot);
          }
          tailTimer = setTimeout(() => {
            done(expectedGenId === cloudGenerationId ? 'played' : 'aborted');
          }, 75);
        };

        try {
          source.start(0);
          sampleRealtimeAnalyserNoiseFloor();
        } catch {
          done('failed');
        }
      });
    } catch {
      return 'failed';
    }
  };

  // 1. 主力播放器：每次建立獨立的 new Audio(objectUrl) 實例並開啟 preservesPitch = true，
  //    直接走瀏覽器原生 OS 音訊通道播放經 AudioContext 清理並附加 180ms 排空保護墊的 cleanPlaybackBlob
  const objectUrlToRevoke = URL.createObjectURL(cleanPlaybackBlob);
  const audio = new Audio();
  audio.preload = 'auto';
  (audio as any).playsInline = true;
  activeCloudAudio = audio;

  const htmlAudioOutcome = await new Promise<CloudPlaybackOutcome>((resolve) => {
    if (expectedGenId !== cloudGenerationId) {
      try {
        URL.revokeObjectURL(objectUrlToRevoke);
      } catch {}
      resolve('aborted');
      return;
    }

    let settled = false;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    let highResProgressTimer: ReturnType<typeof setInterval> | null = null;
    let stallGuardTimer: ReturnType<typeof setInterval> | null = null;
    let tailGuardTimer: ReturnType<typeof setTimeout> | null = null;
    let hasPlaybackStarted = false;
    let lastObservedTime = -1;
    let lastProgressTs = Date.now();

    const done = (outcome: CloudPlaybackOutcome) => {
      if (settled) return;
      settled = true;
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      if (highResProgressTimer) {
        clearInterval(highResProgressTimer);
        highResProgressTimer = null;
      }
      if (stallGuardTimer) {
        clearInterval(stallGuardTimer);
        stallGuardTimer = null;
      }
      if (tailGuardTimer) {
        clearTimeout(tailGuardTimer);
        tailGuardTimer = null;
      }
      if (activeCloudAbort === abortCurrentCloud) {
        activeCloudAbort = null;
      }
      const releaseElementMediaSlot = () => {
        try {
          audio.removeAttribute('src');
          // 強制釋放 Chromium WebMediaPlayer 解碼實例，避免長時間連播逾 ~75 句後靜默失效
          audio.load();
        } catch {}
      };
      try {
        audio.onended = null;
        audio.onerror = null;
        audio.ontimeupdate = null;
        audio.onloadedmetadata = null;
        audio.onstalled = null;
        audio.onwaiting = null;
        audio.onplaying = null;
        // 若自然播放完畢 (ended=true)，不主動呼叫 pause() 避免搶斷 OS 音訊尾端殘響緩衝
        if (outcome !== 'played' || !audio.ended) {
          audio.pause();
          releaseElementMediaSlot();
        }
      } catch {}
      if (activeCloudAudio === audio) {
        activeCloudAudio = null;
      }
      // 自然結束時延遲 140ms 釋放媒體槽位與 Blob URL，確保瀏覽器音訊解碼管線完全排空後再回收記憶體
      if (outcome === 'played') {
        setTimeout(() => {
          releaseElementMediaSlot();
          try {
            URL.revokeObjectURL(objectUrlToRevoke);
          } catch {}
        }, 140);
      } else {
        try {
          URL.revokeObjectURL(objectUrlToRevoke);
        } catch {}
      }
      resolve(outcome);
    };

    const abortCurrentCloud = () => {
      done('aborted');
    };
    activeCloudAbort = abortCurrentCloud;

    const initialTimeoutMs = Math.max(16000, Math.ceil((chunkText.length * 190) / Math.max(0.55, calibratedRate)) + 6000);
    safetyTimer = setTimeout(() => done(expectedGenId === cloudGenerationId ? 'failed' : 'aborted'), initialTimeoutMs);

    const applyPlaybackSettings = () => {
      try {
        audio.preservesPitch = true;
        (audio as any).mozPreservesPitch = true;
        (audio as any).webkitPreservesPitch = true;
        if (Math.abs(audio.playbackRate - calibratedRate) > 0.005) {
          audio.playbackRate = calibratedRate;
        }
        if (Math.abs(audio.volume - clampedVol) > 0.01) {
          audio.volume = clampedVol;
        }
      } catch {}
    };

    const getEffectiveSpeechDuration = (): number => {
      if (knownSpeechDurSec > 0.08) return knownSpeechDurSec;
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        return audio.duration;
      }
      return 0;
    };

    const reportAudioTime = () => {
      if (settled || expectedGenId !== cloudGenerationId) return;
      if (audio.currentTime > lastObservedTime + 0.005) {
        lastObservedTime = audio.currentTime;
        lastProgressTs = Date.now();
        hasPlaybackStarted = true;
      }
      if (!onProgress) return;
      const speechDur = getEffectiveSpeechDuration();
      if (speechDur > 0) {
        const effRate = Math.max(0.5, audio.playbackRate || calibratedRate);
        const pct = Math.min(99, Math.max(1, Math.round((audio.currentTime / speechDur) * 100)));
        const totalSec = Math.max(0.2, Math.round((speechDur / effRate) * 10) / 10);
        const rem = Math.max(0, Math.round((Math.max(0, speechDur - audio.currentTime) / effRate) * 10) / 10);
        onProgress(pct, rem, totalSec);
      }
    };

    audio.onplaying = () => {
      if (settled || expectedGenId !== cloudGenerationId) return;
      hasPlaybackStarted = true;
      lastProgressTs = Date.now();
    };

    audio.onloadedmetadata = () => {
      if (settled || expectedGenId !== cloudGenerationId) return;
      // 僅在尚未開始播放或變速被重置時同步，不在播放途中反覆改寫 playbackRate 以免觸發 WSOLA 重新同步斷音
      if (audio.paused || Math.abs(audio.playbackRate - calibratedRate) > 0.01) {
        applyPlaybackSettings();
      }
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        if (safetyTimer) clearTimeout(safetyTimer);
        const actualDurationMs = Math.ceil((audio.duration / Math.max(0.5, calibratedRate)) * 1000);
        safetyTimer = setTimeout(
          () => done(expectedGenId === cloudGenerationId ? 'failed' : 'aborted'),
          actualDurationMs + 5500
        );
        reportAudioTime();
      }
    };

    audio.ontimeupdate = reportAudioTime;
    if (onProgress) {
      highResProgressTimer = setInterval(() => {
        if (!audio.paused && !audio.ended) {
          reportAudioTime();
        }
      }, 35);
    }

    // 常駐播放停滯偵測器（攔截藍牙路由切換、來電打斷或解碼器卡死導致的 currentTime 凍結）
    stallGuardTimer = setInterval(() => {
      if (settled || expectedGenId !== cloudGenerationId) return;
      const now = Date.now();
      if (audio.currentTime > lastObservedTime + 0.005) {
        lastObservedTime = audio.currentTime;
        lastProgressTs = now;
        hasPlaybackStarted = true;
        return;
      }
      // 只有在頁面可見或已開播後持續停滯 > 4800ms 才判定硬體停滯並轉入恢復重試
      const stallLimitMs = hasPlaybackStarted ? 4800 : 6500;
      if (!audio.ended && now - lastProgressTs > stallLimitMs) {
        underrunRecoveryCount++;
        done(expectedGenId === cloudGenerationId ? 'failed' : 'aborted');
      }
    }, 300);

    audio.onended = () => {
      if (settled || expectedGenId !== cloudGenerationId) {
        done('aborted');
        return;
      }
      const speechDur = getEffectiveSpeechDuration();
      if (onProgress && speechDur > 0) {
        const effRate = Math.max(0.5, audio.playbackRate || calibratedRate);
        const totalSec = Math.max(0.2, Math.round((speechDur / effRate) * 10) / 10);
        onProgress(100, 0, totalSec);
      }
      // 等待 140ms 確保瀏覽器 WSOLA 時間伸縮緩衝區與硬體 DAC 100% 輸出所有字尾音節後再結束任務
      tailGuardTimer = setTimeout(() => {
        done(expectedGenId === cloudGenerationId ? 'played' : 'aborted');
      }, 140);
    };

    audio.onerror = () => {
      done(expectedGenId === cloudGenerationId ? 'failed' : 'aborted');
    };

    try {
      audio.src = objectUrlToRevoke;
      applyPlaybackSettings();
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            hasHtmlAudioUnlocked = true;
            lastProgressTs = Date.now();
          })
          .catch(() => {
            done(expectedGenId === cloudGenerationId ? 'failed' : 'aborted');
          });
      }
    } catch {
      done(expectedGenId === cloudGenerationId ? 'failed' : 'aborted');
    }
  });

  if (htmlAudioOutcome === 'played' || htmlAudioOutcome === 'aborted') {
    return htmlAudioOutcome;
  }

  // 2. 若行動端瀏覽器因自動播放策略攔截 new Audio() 或播放停滯，立即以已解鎖的 Web Audio AudioBufferSourceNode 備援發聲
  if (expectedGenId === cloudGenerationId) {
    await ensureSharedAudioContextRunning(600).catch(() => null);
    return await playViaWebAudioBuffer();
  }
  return 'aborted';
}

async function playCloudFallbackAudio(
  text: string,
  lang: 'en-US' | 'zh-TW',
  rate: number,
  volume: number = 1.0,
  onProgress?: (percent: number, remainSec: number, totalSec: number) => void,
  onBufferingDone?: () => void,
  bypassCache: boolean = false
): Promise<CloudPlaybackOutcome> {
  if (typeof window === 'undefined') return 'failed';
  stopCloudFallbackAudio();
  const myGenId = ++cloudGenerationId;
  isCloudFallbackActive = true;

  try {
    const chunks = splitTtsChunks(text, 155);
    if (chunks.length === 0) return 'failed';

    const prebufferedBlobs = await Promise.all(
      chunks.map((chunk) =>
        fetchAndBufferCloudAudioBlob(chunk, lang, 5500, rate, false, { bypassCache })
      )
    );
    if (myGenId !== cloudGenerationId) return 'aborted';

    // 若任何分段未能取得有效音訊 Blob，立即回傳 'failed' 切換至本地語音引擎或觸發錯誤恢復重試
    if (prebufferedBlobs.some((b) => !b || b.size <= 64)) {
      return 'failed';
    }

    if (onBufferingDone) {
      try {
        onBufferingDone();
      } catch {}
    }

    // 若一個長句被切分為多個語音片段 (chunks.length > 1)，先透過 AudioContext 處理層對各片段執行
    // trimStart / trimEnd 靜音消除，再無縫拼接為單一連續 WAV Blob 一次播放，徹底消除分段之間的喀嗒聲與斷句感
    if (chunks.length > 1) {
      const ctx = getSharedAudioContext();
      if (ctx) {
        const decodedChunks = await Promise.all(
          chunks.map((chunk, idx) => decodeAndCacheAudioBuffer(chunk, lang, rate, prebufferedBlobs[idx]!))
        );
        if (myGenId !== cloudGenerationId) return 'aborted';
        if (decodedChunks.every((buf): buf is AudioBuffer => Boolean(buf && buf.duration > 0))) {
          const dynConfig = syncDynamicAudioBufferForSpeed(rate, ctx);
          const mergedBuffer = concatenateTrimmedAudioBuffers(
            ctx,
            decodedChunks,
            dynConfig.interChunkBreathMs,
            rate
          );
          if (mergedBuffer) {
            const stitchedWavBlob = encodeAudioBufferToWavBlob(mergedBuffer);
            const fullKey = getMemoryCacheKey(text, lang, rate);
            storeMemoryTrimmedWavBlob(fullKey, stitchedWavBlob);
            if (memoryDecodedAudioBufferCache.size >= MAX_RAM_DECODED_BUFFERS && !memoryDecodedAudioBufferCache.has(fullKey)) {
              const oldest = memoryDecodedAudioBufferCache.keys().next().value;
              if (oldest) memoryDecodedAudioBufferCache.delete(oldest);
            }
            memoryDecodedAudioBufferCache.set(fullKey, mergedBuffer);

            const stitchedOutcome = await playSingleCloudChunk(
              text,
              lang,
              rate,
              volume,
              myGenId,
              stitchedWavBlob,
              onProgress
            );
            if (myGenId !== cloudGenerationId || stitchedOutcome === 'aborted') return 'aborted';
            if (stitchedOutcome === 'played') return 'played';
          }
        }
      }
    }

    for (let i = 0; i < chunks.length; i++) {
      if (myGenId !== cloudGenerationId) return 'aborted';
      const outcome = await playSingleCloudChunk(
        chunks[i],
        lang,
        rate,
        volume,
        myGenId,
        prebufferedBlobs[i],
        onProgress
          ? (pct, rem, totalSec) => {
              if (myGenId !== cloudGenerationId) return;
              const overall = Math.round(((i + pct / 100) / chunks.length) * 100);
              onProgress(overall, rem, totalSec * chunks.length);
            }
          : undefined
      );
      if (myGenId !== cloudGenerationId || outcome === 'aborted') return 'aborted';
      if (outcome === 'failed') return 'failed';
    }
    return 'played';
  } catch {
    return myGenId === cloudGenerationId ? 'failed' : 'aborted';
  } finally {
    if (myGenId === cloudGenerationId) {
      isCloudFallbackActive = false;
    }
  }
}

interface QueuedAudioEntry {
  task: AudioTask;
  resolve: () => void;
  reject: (reason?: any) => void;
  isCancelled?: () => boolean;
  enqueuedEpoch: number;
}

/**
 * 核心：基於 Promise 序列佇列 (Promise-Chain Sequential Queue)、雲端高音質預緩衝、IndexedDB 本地快取與
 * Web Speech API 雙重備援的狀態機排程引擎 (AudioScheduler)
 * 
 * 架構特點：
 * 1. 單一 Promise 執行鏈互斥鎖 (`serialExecutionChain`)：確保任何時刻僅有一個語音任務處於硬體發聲狀態，徹底消除併發語音衝突。
 * 2. 瀏覽器硬體 `cancel -> speak` 防競態靜默窗口：若前次中斷距今不足 55ms，自動於 Promise 鏈中等待硬體釋放，防止新句子被底層吞字或斷句。
 * 3. 高解析度 `onProgress` 逐字同步回調：結合聲學單字時間軸 (Acoustic Word Timeline) 與 35ms 計時器 / Web Speech Boundary，即時驅動 UI 朗讀單字高亮。
 */
export class AudioScheduler {
  private queue: QueuedAudioEntry[] = [];
  private serialExecutionChain: Promise<void> = Promise.resolve();
  private activeLoopPromise: Promise<void> | null = null;
  private isDrainingLoop: boolean = false;

  private isRunning: boolean = false;
  private enginePhase: SpeechEnginePhase = 'IDLE';
  private schedulerEpoch: number = 0;
  private skipRequested: boolean = false;
  private currentTaskId: number = 0;
  private currentActiveUtterance: SpeechSynthesisUtterance | null = null;
  private currentRunningTask: AudioTask | null = null;
  private currentTaskAbort: ((reason?: 'aborted' | 'failed') => void) | null = null;
  private currentSleepAbort: (() => void) | null = null;
  private lastCompletedTask: AudioTask | null = null;
  private currentProgress: number = 0;
  private currentCharIndex: number = 0;
  private currentWordIndex: number = -1;
  private currentWord: string = '';
  private currentTotalWords: number = 0;
  private currentRemainingSeconds: number = 0;
  private currentEstimatedTotalSeconds: number = 0;
  private currentStartTime: number = 0;
  private lastActivityTimestamp: number = 0;
  private lastCancelTime: number = 0;
  private lastClearTimestamp: number = 0;
  private progressAnimTimer: any = null;
  private listeners: Set<(state: SpeechQueueProgressState) => void> = new Set();

  /**
   * 取得當前排程引擎與緩衝狀態機快照
   */
  public getState(): SpeechQueueProgressState {
    const queueTotal = this.getQueueLength();
    const remainingCount = Math.max(0, queueTotal - (this.isRunning ? 1 : 0));

    return {
      isPlaying: this.isRunning,
      enginePhase: this.isRunning ? this.enginePhase : 'IDLE',
      sessionEpoch: this.schedulerEpoch,
      currentTask: this.currentRunningTask,
      lastCompletedTask: this.lastCompletedTask,
      progress: this.currentProgress,
      charIndex: this.currentCharIndex,
      wordIndex: this.isRunning ? this.currentWordIndex : -1,
      currentWord: this.isRunning ? this.currentWord : '',
      totalWords: this.isRunning ? this.currentTotalWords : 0,
      totalLength: this.currentRunningTask ? this.currentRunningTask.text.length : 0,
      queueLength: queueTotal,
      remainingQueueCount: remainingCount,
      remainingSeconds: this.currentRemainingSeconds,
      totalEstimatedSeconds: this.currentEstimatedTotalSeconds,
      isMobileDevice: isMobileDevice(),
      isEngineHealthy: this.enginePhase !== 'ERROR',
      bufferStats: getAudioBufferStats()
    };
  }

  public getEpoch(): number {
    return this.schedulerEpoch;
  }

  private setPhase(phase: SpeechEnginePhase): void {
    if (this.enginePhase !== phase) {
      this.enginePhase = phase;
      this.notifyListeners();
    }
  }

  /**
   * 訂閱佇列與播放進度狀態變化
   */
  public subscribe(listener: (state: SpeechQueueProgressState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch {}
    });
  }

  /**
   * 原子化排程多步驟語音序列（如：三速帶讀、SVO 三段拆解帶讀、雙語導讀、逐字慢讀、Auto-Pilot 巡航）
   * 綁定單一 Session Epoch，一旦使用者點擊其他發音按鈕，整組舊序列自動失效，徹底杜絕計時器語音衝突
   */
  public scheduleSequence(
    steps: SpeechSequenceStep[],
    options?: {
      interrupt?: boolean;
      isCancelled?: () => boolean;
      onProgress?: (payload: SpeechProgressPayload, stepIndex: number) => void;
      onSequenceEnd?: () => void;
    }
  ): number {
    unlockAudioContext();
    if (options?.interrupt !== false) {
      this.clear();
    }
    const sequenceEpoch = this.schedulerEpoch;
    const validSteps = steps.filter((s) => Boolean(s.text && s.text.trim()));
    if (validSteps.length === 0) {
      if (options?.onSequenceEnd) options.onSequenceEnd();
      return sequenceEpoch;
    }

    // 滑動視窗動態預讀排程 (Sliding-Window Pre-Read Scheduler, Window = 3)
    // 避免整組序列同時併發發起請求造成 Thundering Herd 與 >500ms 延遲尖峰，
    // 改為開局預載 [0..2]，並於每一步開播時動態推進預讀 [idx+1..idx+3]。
    const SLIDING_WINDOW_SIZE = 3;
    const preReadWindowFrom = (startIdx: number) => {
      if (this.schedulerEpoch !== sequenceEpoch) return;
      const windowSteps = validSteps.slice(startIdx, startIdx + SLIDING_WINDOW_SIZE);
      if (windowSteps.length === 0) return;

      const targets: PredictiveCacheTarget[] = [];
      windowSteps.forEach((step, offset) => {
        const isEn = !step.lang || step.lang === 'en-US' || step.lang.startsWith('en');
        if (!step.text?.trim()) return;
        targets.push({
          text: step.text,
          lang: isEn ? 'en-US' : 'zh-TW',
          speechSpeed: step.rate ?? 0.95,
          priority: offset === 0 ? 'immediate' : offset === 1 ? 'next_pattern' : 'next_lesson',
        });
      });

      if (targets.length > 0) {
        slidingWindowPreloadsCount += targets.length;
        const baseRate = windowSteps[0]?.rate ?? 0.95;
        schedulePredictiveAudioCache(targets, baseRate).catch(() => {});
      }
    };

    preReadWindowFrom(0);

    validSteps.forEach((step, idx) => {
      const isLast = idx === validSteps.length - 1;
      const combinedCancelCheck = () => {
        if (this.schedulerEpoch !== sequenceEpoch) {
          conflictPreventedCount++;
          return true;
        }
        return Boolean(options?.isCancelled && options.isCancelled());
      };

      const stepBufferMs = step.bufferAfterMs ?? step.delayAfterMs ?? 200;
      this.enqueue(
        step.text,
        step.lang || 'en-US',
        step.rate ?? 0.95,
        stepBufferMs,
        combinedCancelCheck,
        step.pitch,
        () => {
          if (idx > 0) {
            triggerHapticStepPulse();
          }
          // 當前步驟一啟動即推進預讀滑動視窗至後續 3 步，維持 0ms 切換銜接
          if (idx + 1 < validSteps.length) {
            preReadWindowFrom(idx + 1);
          }
          if (step.onStepStart) step.onStepStart();
        },
        () => {
          if (step.onStepEnd) step.onStepEnd();
          if (isLast && !combinedCancelCheck()) {
            triggerHapticPhraseComplete();
            if (options?.onSequenceEnd) {
              options.onSequenceEnd();
            }
          }
        },
        undefined,
        (payload) => {
          if (combinedCancelCheck()) return;
          if (step.onStepProgress) step.onStepProgress(payload);
          if (options?.onProgress) options.onProgress(payload, idx);
        }
      );
    });

    return sequenceEpoch;
  }

  /**
   * 跳過當前正在播放的句子，立即前進至佇列中的下一句
   */
  public skipCurrent(): void {
    if (this.progressAnimTimer) {
      clearInterval(this.progressAnimTimer);
      this.progressAnimTimer = null;
    }
    this.skipRequested = true;
    stopCloudFallbackAudio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const wasNativeActive =
        Boolean(this.currentActiveUtterance) ||
        window.speechSynthesis.speaking ||
        window.speechSynthesis.pending ||
        window.speechSynthesis.paused;
      if (wasNativeActive) {
        this.lastCancelTime = Date.now();
        try {
          window.speechSynthesis.cancel();
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch {}
      }
    }
    const abortSleep = this.currentSleepAbort;
    this.currentSleepAbort = null;
    if (abortSleep) abortSleep();

    const abortTask = this.currentTaskAbort;
    this.currentTaskAbort = null;
    if (abortTask) abortTask();

    this.notifyListeners();
  }

  /**
   * 重播當前正在播放或剛播放完畢的句子
   */
  public replayCurrent(): void {
    const taskToReplay = this.currentRunningTask || this.lastCompletedTask;
    if (!taskToReplay) return;

    if (this.progressAnimTimer) {
      clearInterval(this.progressAnimTimer);
      this.progressAnimTimer = null;
    }
    this.skipRequested = true;
    stopCloudFallbackAudio();

    const replayTask: AudioTask = {
      ...taskToReplay,
      id: ++this.currentTaskId
    };

    // 將該句插回佇列最前列
    this.queue.unshift({
      task: replayTask,
      resolve: () => {},
      reject: () => {},
      enqueuedEpoch: this.schedulerEpoch
    });

    if (this.currentActiveUtterance || this.isRunning) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const wasNativeActive =
          Boolean(this.currentActiveUtterance) ||
          window.speechSynthesis.speaking ||
          window.speechSynthesis.pending ||
          window.speechSynthesis.paused;
        if (wasNativeActive) {
          this.lastCancelTime = Date.now();
          try {
            window.speechSynthesis.cancel();
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          } catch {}
        }
      }
      const abortSleep = this.currentSleepAbort;
      this.currentSleepAbort = null;
      if (abortSleep) abortSleep();

      const abortTask = this.currentTaskAbort;
      this.currentTaskAbort = null;
      if (abortTask) abortTask();
    } else {
      this.scheduleDrainLoop();
    }

    this.notifyListeners();
  }

  /**
   * 將語音任務推入基於 Promise 的序列佇列 (Promise-based Sequential Queue)
   */
  public enqueue(
    text: string,
    lang: 'en-US' | 'zh-TW' = 'en-US',
    rate: number = 0.95,
    bufferAfterMs: number = 200,
    isCancelled?: () => boolean,
    customPitch?: number,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void,
    onProgress?: (payload: SpeechProgressPayload) => void
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (isCancelled && isCancelled()) {
        conflictPreventedCount++;
        resolve();
        return;
      }

      const isEn = lang === 'en-US' || lang.startsWith('en');
      const cleaned = isEn ? cleanEnglishText(text) : preprocessSpeechText(text, false);
      if (!cleaned) {
        if (onEnd) onEnd();
        resolve();
        return;
      }

      const pitch = customPitch !== undefined ? customPitch : getPreferredSpeechPitch();

      const task: AudioTask = {
        id: ++this.currentTaskId,
        rawText: text,
        text: cleaned,
        lang: isEn ? 'en-US' : 'zh-TW',
        rate,
        pitch,
        bufferAfterMs,
        onStart,
        onProgress,
        onEnd,
        onError
      };

      // 若佇列前方尚有任務正在播放，提前於背景預緩衝此句音訊（對齊實際語速），消除句間網路延遲
      if (this.isRunning || this.queue.length > 0) {
        fetchAndBufferCloudAudioBlob(cleaned, task.lang, 4000, rate, true).catch(() => {});
      }

      this.queue.push({
        task,
        resolve,
        reject,
        isCancelled,
        enqueuedEpoch: this.schedulerEpoch
      });

      this.notifyListeners();
      this.scheduleDrainLoop();
    });
  }

  /**
   * 立即清空所有佇列並停止底層發音（被中斷的舊任務不可觸發 onEnd 連續播放鏈，徹底消除語音衝突）
   */
  public clear(): void {
    this.lastClearTimestamp = Date.now();
    if (this.isRunning || this.queue.length > 0) {
      conflictPreventedCount += this.queue.length + (this.isRunning ? 1 : 0);
    }
    this.schedulerEpoch++;
    this.skipRequested = false;
    this.enginePhase = 'IDLE';
    if (this.progressAnimTimer) {
      clearInterval(this.progressAnimTimer);
      this.progressAnimTimer = null;
    }
    this.currentTaskId++;
    const hadNativeUtterance = Boolean(this.currentActiveUtterance);
    const pending = [...this.queue];
    this.queue = [];
    this.isRunning = false;
    this.currentActiveUtterance = null;
    this.currentRunningTask = null;
    this.currentProgress = 0;
    this.currentCharIndex = 0;
    this.currentWordIndex = -1;
    this.currentWord = '';
    this.currentTotalWords = 0;
    this.currentRemainingSeconds = 0;
    this.currentEstimatedTotalSeconds = 0;
    this.currentStartTime = 0;

    const abortSleep = this.currentSleepAbort;
    this.currentSleepAbort = null;
    if (abortSleep) abortSleep();

    const abortTask = this.currentTaskAbort;
    this.currentTaskAbort = null;
    if (abortTask) abortTask();

    stopSpeechKeepAlive();
    stopCloudFallbackAudio();

    if (typeof window !== 'undefined') {
      if ((window as any).__FSE_ACTIVE_UTTERANCES__) {
        (window as any).__FSE_ACTIVE_UTTERANCES__.clear();
      }
      (window as any).__CURRENT_ACTIVE_UTTERANCE__ = null;

      if ('speechSynthesis' in window) {
        try {
          const isSynthBusy =
            hadNativeUtterance ||
            window.speechSynthesis.speaking ||
            window.speechSynthesis.pending ||
            window.speechSynthesis.paused;
          if (isSynthBusy) {
            this.lastCancelTime = Date.now();
            window.speechSynthesis.cancel();
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          }
        } catch (err) {
          console.warn("AudioScheduler cancel error:", err);
        }
      }

      try {
        window.dispatchEvent(new CustomEvent('fse-speech-interrupted', { detail: { epoch: this.schedulerEpoch } }));
      } catch {}
    }

    this.notifyListeners();

    pending.forEach((item) => {
      item.resolve();
    });
  }

  /**
   * 取得當前排隊中的佇列長度（包含正在播放中的項目）
   */
  public getQueueLength(): number {
    return this.queue.length + (this.isRunning ? 1 : 0);
  }

  /**
   * 檢查當前是否有語音正在進行中或排隊中
   */
  public isBusy(): boolean {
    return this.isRunning || this.queue.length > 0;
  }

  /**
   * 標記語音管線活躍時間戳（於緩衝完成、進度推進、背景喚醒或重試時更新，避免誤判長句卡死）
   */
  public markActivity(): void {
    this.lastActivityTimestamp = Date.now();
  }

  /**
   * 當瀏覽器從鎖屏 / 背景分頁回到前景時呼叫：刷新活躍時間戳並喚醒被系統暫停的音訊管線
   */
  public handleVisibilityResume(): void {
    if (this.isRunning && this.currentRunningTask) {
      const audioActivelyPlaying =
        Boolean(activeCloudAudio && !activeCloudAudio.paused && !activeCloudAudio.ended) ||
        Boolean(activeCloudBufferSource) ||
        (typeof window !== 'undefined' && 'speechSynthesis' in window && Boolean(window.speechSynthesis.speaking));
      if (audioActivelyPlaying) {
        this.lastActivityTimestamp = Date.now();
      }
    }
    ensureSharedAudioContextRunning(600).catch(() => null);
  }

  /**
   * 手機端主動自癒檢測：以「最近活躍時間戳 (lastActivityTimestamp)」精準判定是否真正停滯，
   * 避免長句或慢速朗讀遭誤殺；若確認卡死則以 recoverable 'failed' 觸發任務內建重試恢復而非斬斷序列鏈
   */
  public checkAndSelfHeal(): void {
    if (typeof window === 'undefined') return;

    const hasSpeechSynth = 'speechSynthesis' in window;
    if (hasSpeechSynth) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {}
    }

    if (this.isRunning && this.currentRunningTask) {
      const now = Date.now();
      const lastAct = this.lastActivityTimestamp || this.currentStartTime || now;
      const idleSinceActivity = now - lastAct;
      const totalElapsed = now - (this.currentStartTime || now);

      // 若正在進行雲端串流緩衝或錯誤重試冷卻，給予合理的寬容度；只有在確實無任何進度推進時才判定停滯
      const overallHardCeiling = Math.max(45000, this.currentEstimatedTotalSeconds * 4200 + 18000);
      const activityStallLimit =
        this.enginePhase === 'BUFFERING' || this.enginePhase === 'RECOVERING'
          ? 20000
          : this.enginePhase === 'INTER_SENTENCE_BUFFER'
          ? 12000
          : 15000;

      const synthIdleLong =
        hasSpeechSynth &&
        this.enginePhase === 'PLAYING_NATIVE' &&
        this.currentActiveUtterance !== null &&
        !window.speechSynthesis.speaking &&
        !window.speechSynthesis.pending &&
        !isCloudFallbackActive &&
        !activeCloudBufferSource &&
        !activeCloudAudio &&
        idleSinceActivity > 9500;

      if (idleSinceActivity > activityStallLimit || totalElapsed > overallHardCeiling || synthIdleLong) {
        this.setPhase('RECOVERING');
        this.lastActivityTimestamp = now;
        underrunRecoveryCount++;
        if (hasSpeechSynth && (this.currentActiveUtterance || window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
          try {
            window.speechSynthesis.cancel();
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          } catch {}
        }
        stopCloudFallbackAudio();

        if (this.currentActiveUtterance) {
          try {
            if ((window as any).__FSE_ACTIVE_UTTERANCES__) {
              (window as any).__FSE_ACTIVE_UTTERANCES__.delete(this.currentActiveUtterance);
            }
          } catch {}
          this.currentActiveUtterance = null;
        }

        const abortSleep = this.currentSleepAbort;
        this.currentSleepAbort = null;
        if (abortSleep) abortSleep();

        const abortTask = this.currentTaskAbort;
        this.currentTaskAbort = null;
        if (abortTask) {
          // 以 'failed' 觸發該任務的自動恢復重試迴圈，維持連續播放鏈不中斷
          abortTask('failed');
        } else if (!abortSleep) {
          this.isRunning = false;
          this.enginePhase = 'IDLE';
          this.scheduleDrainLoop();
        }
      }
    } else if (!this.isRunning && !this.isDrainingLoop && this.queue.length > 0) {
      this.scheduleDrainLoop();
    }
  }

  /**
   * 啟動單一序列 Promise 執行鏈 (Serialized Promise Queue Drain)
   * 確保無論多少異步來源同時呼叫 enqueue，皆嚴格在單一 Promise 鏈上依序執行，絕不發生重疊播放或尾端競態遺漏
   */
  private scheduleDrainLoop(): Promise<void> {
    if (this.activeLoopPromise && this.isDrainingLoop) {
      return this.activeLoopPromise;
    }

    this.isDrainingLoop = true;
    const nextLoop = this.serialExecutionChain
      .catch(() => {})
      .then(() => this.drainQueueSequentially());

    this.serialExecutionChain = nextLoop;
    this.activeLoopPromise = nextLoop.finally(() => {
      if (this.activeLoopPromise === nextLoop) {
        this.activeLoopPromise = null;
      }
      this.isDrainingLoop = false;
      // 若在釋放鎖的瞬間又有新項目進入佇列，無縫接續下一輪 Promise 鏈
      if (this.queue.length > 0 && !this.isRunning) {
        this.scheduleDrainLoop();
      }
    });

    return this.activeLoopPromise;
  }

  /**
   * 序列佇列主迴圈：透過 async/await 嚴格序列化每一筆語音任務、引擎冷啟動初始化、
   * 錯誤恢復重試 (Exponential Backoff + Cross-Engine Recovery) 與句間緩衝
   */
  private async drainQueueSequentially(): Promise<void> {
    const MAX_TASK_RETRIES = 2;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      const { task, resolve, isCancelled, enqueuedEpoch } = item;
      const runEpoch = this.schedulerEpoch;

      // 1. 檢查世代權杖 (Epoch) 與取消條件，攔截過期任務
      if (enqueuedEpoch !== runEpoch || (isCancelled && isCancelled())) {
        conflictPreventedCount++;
        resolve();
        continue;
      }

      this.isRunning = true;
      this.skipRequested = false;
      this.lastActivityTimestamp = Date.now();

      // 1.5 確保引擎已完成非同步初始化（含 AudioContext running 與聲線就緒），避免冷啟動首句失效
      await ensureSpeechEngineInitialized(850).catch(() => {});
      if (enqueuedEpoch !== this.schedulerEpoch || (isCancelled && isCancelled()) || this.skipRequested) {
        this.skipRequested = false;
        resolve();
        continue;
      }

      // 2. 連續狂點防抖動合併窗口 (Rapid-Click Coalescing Window)：若距離前次 clear() 不足 35ms，等待最新一次點擊穩定後再啟動硬體發聲
      const msSinceClear = Date.now() - this.lastClearTimestamp;
      if (this.lastClearTimestamp > 0 && msSinceClear >= 0 && msSinceClear < 35) {
        await this.sleep(35 - msSinceClear, isCancelled, runEpoch);
        if (enqueuedEpoch !== this.schedulerEpoch || (isCancelled && isCancelled()) || this.skipRequested) {
          this.skipRequested = false;
          resolve();
          continue;
        }
      }

      // 3. 前瞻預緩衝 (Lookahead Pre-Buffering)：當第 N 句準備播放時，依據其對應語速 (rate) 非阻塞預載第 N+1 與 N+2 句
      for (let lookIdx = 0; lookIdx < Math.min(2, this.queue.length); lookIdx++) {
        const upcoming = this.queue[lookIdx];
        if (upcoming && upcoming.enqueuedEpoch === runEpoch) {
          fetchAndBufferCloudAudioBlob(
            upcoming.task.text,
            upcoming.task.lang,
            4000,
            upcoming.task.rate,
            true
          ).catch(() => {});
        }
      }

      // 4. 硬體防競態保護窗口：若剛執行過 speechSynthesis.cancel()，等待至少 50ms 讓行動端音訊通道完全重置
      const msSinceCancel = Date.now() - this.lastCancelTime;
      if (this.lastCancelTime > 0 && msSinceCancel >= 0 && msSinceCancel < 50) {
        await this.sleep(50 - msSinceCancel, isCancelled, runEpoch);
      }

      if (enqueuedEpoch !== this.schedulerEpoch || (isCancelled && isCancelled()) || this.skipRequested) {
        this.skipRequested = false;
        resolve();
        continue;
      }

      let wasSkipped = false;
      try {
        const cancelEpochBefore = this.lastCancelTime;
        let finalOutcome: 'played' | 'aborted' | 'failed' = 'failed';

        // 4.5 任務級錯誤恢復重試引擎：針對暫時性網路抖動、音訊通道中斷或瀏覽器合成器偶發異常自動退避重試與跨引擎切換
        for (let attempt = 0; attempt <= MAX_TASK_RETRIES; attempt++) {
          if (enqueuedEpoch !== this.schedulerEpoch || (isCancelled && isCancelled()) || this.skipRequested) {
            finalOutcome = 'aborted';
            break;
          }

          if (attempt > 0) {
            taskRetryCount++;
            underrunRecoveryCount++;
            this.setPhase('RECOVERING');
            this.lastActivityTimestamp = Date.now();

            // 退避冷卻 (240ms -> 620ms)，並於重試前主動修復 AudioContext、清除可能損毀的單句快取與喚醒 speechSynthesis
            const backoffMs = attempt === 1 ? 240 : 620;
            evictMemoryAudioCacheForSentence(task.text || task.rawText || '', task.lang, task.rate);
            await ensureSharedAudioContextRunning(650).catch(() => null);
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              try {
                if (window.speechSynthesis.paused) {
                  window.speechSynthesis.resume();
                }
                loadVoices();
              } catch {}
            }
            await this.sleep(backoffMs, isCancelled, runEpoch);

            if (enqueuedEpoch !== this.schedulerEpoch || (isCancelled && isCancelled()) || this.skipRequested) {
              finalOutcome = 'aborted';
              break;
            }
          }

          finalOutcome = await this.speakUtterance(task, isCancelled, runEpoch, {
            retryAttempt: attempt,
            preferAlternateEngine: attempt === 1,
            bypassCache: attempt >= 1
          });

          if (finalOutcome === 'played') {
            if (attempt > 0) {
              taskRecoverySuccessCount++;
            }
            break;
          }

          if (finalOutcome === 'aborted') {
            break;
          }
          // finalOutcome === 'failed' -> 繼續下一次退避重試（直到達到 MAX_TASK_RETRIES）
        }

        wasSkipped = this.skipRequested || this.lastCancelTime > cancelEpochBefore || runEpoch !== this.schedulerEpoch;
        this.skipRequested = false;

        const cancelledByCaller =
          finalOutcome === 'aborted' ||
          wasSkipped ||
          runEpoch !== this.schedulerEpoch ||
          Boolean(isCancelled && isCancelled());

        if (!cancelledByCaller) {
          if (finalOutcome === 'played') {
            completedSpeechTasksCount++;
            triggerHapticFeedback(12);
            if (this.queue.length > 0 && getAmbientSoundType() !== 'silent') {
              playAmbientInterSentenceCue();
            }
            const bufferInterval = task.bufferAfterMs && task.bufferAfterMs > 0 ? task.bufferAfterMs : 90;
            this.setPhase('INTER_SENTENCE_BUFFER');
            this.lastActivityTimestamp = Date.now();
            await this.sleep(bufferInterval, isCancelled, runEpoch);
          } else {
            // 單筆任務在歷經完整重試後仍無法發聲（非使用者主動中斷）：回報 onError，但不破壞後續序列朗讀鏈
            this.setPhase('ERROR');
            if (task.onError) {
              try {
                task.onError(new Error('TTS_TASK_RECOVERY_EXHAUSTED'));
              } catch {}
            }
            await this.sleep(160, isCancelled, runEpoch);
          }

          // 6. 僅在未被新發音/使用者主動中斷的前提下觸發 task.onEnd()，確保連續清單與多步驟序列永不因單句異常而永久卡死
          if (runEpoch === this.schedulerEpoch && !(isCancelled && isCancelled())) {
            if (task.onEnd) {
              try {
                task.onEnd();
              } catch {}
            }
          }
        }
      } catch (err) {
        console.warn("AudioScheduler sequential execute error:", err);
        this.setPhase('ERROR');
        if (task.onError) {
          try {
            task.onError(err);
          } catch {}
        }
        // 非使用者取消的例外亦允許後續佇列與回調平順銜接，杜絕序列靜默死亡
        if (runEpoch === this.schedulerEpoch && !(isCancelled && isCancelled()) && task.onEnd) {
          try {
            task.onEnd();
          } catch {}
        }
      } finally {
        resolve();
      }
    }

    // 佇列全部執行完畢，重置為 IDLE 狀態並清除朗讀單字高亮
    this.isRunning = false;
    this.enginePhase = 'IDLE';
    this.currentRunningTask = null;
    this.currentProgress = 0;
    this.currentCharIndex = 0;
    this.currentWordIndex = -1;
    this.currentWord = '';
    this.currentTotalWords = 0;
    this.currentRemainingSeconds = 0;
    this.currentEstimatedTotalSeconds = 0;
    this.lastActivityTimestamp = 0;
    this.notifyListeners();
  }

  private speakUtterance(
    task: AudioTask,
    isCancelled?: () => boolean,
    runEpoch: number = this.schedulerEpoch,
    attemptConfig?: { retryAttempt: number; preferAlternateEngine: boolean; bypassCache: boolean }
  ): Promise<'played' | 'aborted' | 'failed'> {
    return new Promise((resolve) => {
      if ((isCancelled && isCancelled()) || runEpoch !== this.schedulerEpoch) {
        resolve('aborted');
        return;
      }

      unlockAudioContext();

      let isCompleted = false;
      let isAborted = false;
      let earlyStartWatchdog: any = null;
      let fullDurationWatchdog: any = null;
      let latencyFallbackTimer: any = null;
      const speakInvokeTimestamp = performance.now();

      const globalVol = getPreferredSpeechVolume();
      const loudnessBoost = getPreferredLoudnessBoost();
      const rawVol = typeof task.volume === 'number' ? task.volume : globalVol;
      const targetVolume =
        loudnessBoost === 'boost_max' ? 1.0 : loudnessBoost === 'loud' ? Math.max(rawVol, 0.95) : rawVol;
      const stylePreset = getPreferredSpeechStyle();

      let effectiveRate = Math.max(0.6, Math.min(1.25, task.rate));
      if (stylePreset === 'slow_clarity') {
        effectiveRate = Math.max(0.6, Math.min(1.1, Number((effectiveRate * 0.94).toFixed(2))));
      }

      const estimatedDurationMs = Math.max(900, task.text.length * (95 / Math.max(0.6, effectiveRate)));
      const totalSecs = Math.round((estimatedDurationMs / 1000) * 10) / 10;

      // 建立原句單字聲學時間軸，用於同步計算 wordIndex 與 currentWord
      const rawSentenceSource = task.rawText || task.text;
      const wordTimeline = buildSentenceWordTimeline(rawSentenceSource);

      const nowTs = Date.now();
      this.currentRunningTask = task;
      this.enginePhase = attemptConfig && attemptConfig.retryAttempt > 0 ? 'RECOVERING' : 'BUFFERING';
      this.currentProgress = 0;
      this.currentCharIndex = 0;
      this.currentWordIndex = wordTimeline.length > 0 ? 0 : -1;
      this.currentWord = wordTimeline.length > 0 ? wordTimeline[0].cleanWord : '';
      this.currentTotalWords = wordTimeline.length;
      this.currentEstimatedTotalSeconds = totalSecs;
      this.currentRemainingSeconds = totalSecs;
      this.currentStartTime = nowTs;
      this.lastActivityTimestamp = nowTs;
      this.notifyListeners();

      let hasTriggeredMidPlaybackPrediction = false;

      const dispatchTaskProgress = (
        pct: number,
        remainSec: number,
        actualTotalSec: number,
        explicitCharIdx?: number
      ) => {
        if (isCompleted || isAborted || runEpoch !== this.schedulerEpoch || (isCancelled && isCancelled())) {
          return;
        }
        this.lastActivityTimestamp = Date.now();
        const clampedPct = Math.max(0, Math.min(100, Math.round(pct)));
        const ratio = clampedPct / 100;
        const wordInfo =
          typeof explicitCharIdx === 'number'
            ? resolveWordAtCharIndex(wordTimeline, task.text.length, explicitCharIdx)
            : resolveWordAtRatio(wordTimeline, ratio);

        this.currentProgress = clampedPct;
        this.currentCharIndex = wordInfo.charIndex;
        this.currentWordIndex = clampedPct >= 100 ? -1 : wordInfo.wordIndex;
        this.currentWord = clampedPct >= 100 ? '' : wordInfo.currentWord;
        this.currentTotalWords = wordInfo.totalWords;
        this.currentRemainingSeconds = Math.max(0, remainSec);
        if (actualTotalSec > 0) {
          this.currentEstimatedTotalSeconds = actualTotalSec;
        }

        // 當句子播放進度達 30% 時，自動依據當前 task.rate 觸發下一個句型與下一關的預測性音訊緩存
        if (!hasTriggeredMidPlaybackPrediction && clampedPct >= 30 && latestPredictiveLessonContext) {
          hasTriggeredMidPlaybackPrediction = true;
          predictAndCacheNextSentences({
            ...latestPredictiveLessonContext,
            speechSpeed: task.rate
          });
        }

        if (task.onProgress) {
          try {
            task.onProgress({
              progress: clampedPct,
              charIndex: wordInfo.charIndex,
              wordIndex: this.currentWordIndex,
              currentWord: this.currentWord,
              totalWords: wordInfo.totalWords,
              remainingSeconds: this.currentRemainingSeconds,
              totalSeconds: this.currentEstimatedTotalSeconds,
              rawText: rawSentenceSource,
              cleanedText: task.text,
              lang: task.lang,
              enginePhase: this.enginePhase
            });
          } catch {}
        }

        this.notifyListeners();
      };

      let utterance: SpeechSynthesisUtterance | null = null;
      let onStartNotified = false;
      const notifyStartOnce = () => {
        if (onStartNotified) return;
        onStartNotified = true;
        this.lastActivityTimestamp = Date.now();
        // 僅於初次嘗試時觸發 task.onStart()，避免重試時重複觸發 UI 啟動回調
        if (task.onStart && (!attemptConfig || attemptConfig.retryAttempt === 0)) {
          try {
            task.onStart();
          } catch {}
        }
        dispatchTaskProgress(2, totalSecs, totalSecs);
      };

      const clearUtteranceTracking = () => {
        if (typeof window !== 'undefined') {
          if (utterance && (window as any).__FSE_ACTIVE_UTTERANCES__) {
            (window as any).__FSE_ACTIVE_UTTERANCES__.delete(utterance);
          }
          if (utterance && (window as any).__CURRENT_ACTIVE_UTTERANCE__ === utterance) {
            (window as any).__CURRENT_ACTIVE_UTTERANCE__ = null;
          }
        }
        if (this.currentActiveUtterance === utterance) {
          this.currentActiveUtterance = null;
        }
      };

      const finish = (outcome: 'played' | 'aborted' | 'failed') => {
        if (isCompleted) return;
        isCompleted = true;

        if (this.currentTaskAbort === abortCurrentTask) {
          this.currentTaskAbort = null;
        }
        if (latencyFallbackTimer) {
          clearTimeout(latencyFallbackTimer);
          latencyFallbackTimer = null;
        }
        if (earlyStartWatchdog) clearTimeout(earlyStartWatchdog);
        if (fullDurationWatchdog) clearTimeout(fullDurationWatchdog);

        if (this.progressAnimTimer) {
          clearInterval(this.progressAnimTimer);
          this.progressAnimTimer = null;
        }

        const resolvedOutcome: 'played' | 'aborted' | 'failed' =
          isAborted || runEpoch !== this.schedulerEpoch || (isCancelled && isCancelled())
            ? 'aborted'
            : outcome;

        this.currentProgress = resolvedOutcome === 'played' ? 100 : 0;
        this.currentWordIndex = -1;
        this.currentWord = '';
        this.currentRemainingSeconds = 0;
        if (resolvedOutcome === 'played') {
          this.lastCompletedTask = task;
          if (task.onProgress) {
            try {
              task.onProgress({
                progress: 100,
                charIndex: rawSentenceSource.length,
                wordIndex: -1,
                currentWord: '',
                totalWords: wordTimeline.length,
                remainingSeconds: 0,
                totalSeconds: this.currentEstimatedTotalSeconds,
                rawText: rawSentenceSource,
                cleanedText: task.text,
                lang: task.lang,
                enginePhase: this.enginePhase
              });
            } catch {}
          }
        }
        this.notifyListeners();

        stopSpeechKeepAlive();
        clearUtteranceTracking();
        resolve(resolvedOutcome);
      };

      const abortCurrentTask = (reason: 'aborted' | 'failed' = 'aborted') => {
        if (isCompleted) return;
        if (reason === 'aborted') {
          isAborted = true;
        }
        if (utterance) {
          utterance.onstart = null;
          utterance.onboundary = null;
          utterance.onend = null;
          utterance.onerror = null;
        }
        stopCloudFallbackAudio();
        finish(reason);
      };
      this.currentTaskAbort = abortCurrentTask;

      const startNativeSpeechSynthesis = (allowCloudFallbackOnFailure: boolean) => {
        if (isCompleted || isAborted || runEpoch !== this.schedulerEpoch || (isCancelled && isCancelled())) {
          finish('aborted');
          return;
        }
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          finish('failed');
          return;
        }

        this.lastActivityTimestamp = Date.now();

        // 若瀏覽器底層 speechSynthesis 殘留前次狀態，先 cancel 並非同步讓出 65ms 讓 OS/瀏覽器引擎重置，徹底消除同 tick cancel+speak 吞句截斷
        let hadToCancel = false;
        try {
          if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
            hadToCancel = true;
          }
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch {}

        const launchSubChunks = async () => {
          if (isCompleted || isAborted || runEpoch !== this.schedulerEpoch || (isCancelled && isCancelled())) {
            finish('aborted');
            return;
          }

          // 若冷啟動尚未取得任何聲線，先短暫等待 voiceschanged 事件完成初始化
          let allVoices = getAllAvailableVoices();
          if (allVoices.length === 0) {
            allVoices = await ensureVoicesReady(650);
            if (isCompleted || isAborted || runEpoch !== this.schedulerEpoch || (isCancelled && isCancelled())) {
              finish('aborted');
              return;
            }
          }

          const selectedVoice =
            task.lang === 'en-US'
              ? findStandardEnglishVoice(allVoices)
              : findTaiwanChineseVoice(allVoices);

          // 將超過 130 字元的長句拆為短子句序列朗讀，徹底規避 Chromium Web Speech ~15 秒靜默強制斷句 Bug
          const nativeSubChunks = splitTtsChunks(task.text, 130);
          if (nativeSubChunks.length === 0) {
            finish('played');
            return;
          }

          let effectivePitch = task.pitch || getPreferredSpeechPitch() || 1.0;
          const isQuestion = rawSentenceSource.trim().endsWith('?');
          if (isQuestion) {
            effectivePitch = Math.min(1.15, effectivePitch * 1.02);
          }
          const localBaseScale = task.lang === 'en-US' ? 0.92 : 0.95;
          const localRate = Math.max(0.62, Math.min(1.15, Number((effectiveRate * localBaseScale).toFixed(2))));

          let isFallingBackToCloud = false;
          let chunkIdx = 0;
          let accumulatedChars = 0;
          const totalNativeChars = nativeSubChunks.reduce((acc, c) => acc + c.length, 0) || task.text.length || 1;

          const dynamicWatchdogMs = Math.max(20000, Math.min(54000, estimatedDurationMs * 3.2 + 9000));
          fullDurationWatchdog = setTimeout(() => {
            if (!isCompleted && !isFallingBackToCloud) {
              // 逾時保護判定為 failed 以允許外部排程器安全恢復或前進，避免靜默吞字
              finish('failed');
            }
          }, dynamicWatchdogMs);

          const speakNextSubChunk = () => {
            if (isFallingBackToCloud || isCompleted || isAborted || runEpoch !== this.schedulerEpoch || (isCancelled && isCancelled())) {
              if (!isCompleted && !isFallingBackToCloud) finish('aborted');
              return;
            }
            if (chunkIdx >= nativeSubChunks.length) {
              finish('played');
              return;
            }

            this.lastActivityTimestamp = Date.now();
            const chunkText = nativeSubChunks[chunkIdx];
            const chunkBaseOffset = accumulatedChars;
            const subUtterance = new SpeechSynthesisUtterance(chunkText);
            utterance = subUtterance;
            this.currentActiveUtterance = subUtterance;
            (window as any).__CURRENT_ACTIVE_UTTERANCE__ = subUtterance;
            if ((window as any).__FSE_ACTIVE_UTTERANCES__) {
              (window as any).__FSE_ACTIVE_UTTERANCES__.add(subUtterance);
            }

            subUtterance.volume = targetVolume;
            subUtterance.pitch = effectivePitch;
            subUtterance.rate = localRate;
            if (selectedVoice) {
              subUtterance.voice = selectedVoice;
              subUtterance.lang = selectedVoice.lang || task.lang;
            } else {
              subUtterance.lang = task.lang;
            }

            let subStarted = false;
            if (earlyStartWatchdog) {
              clearTimeout(earlyStartWatchdog);
              earlyStartWatchdog = null;
            }
            // 放寬至 3400ms，避免較慢初始化之系統語音被誤判卡死
            earlyStartWatchdog = setTimeout(() => {
              if (!subStarted && !isCompleted && !isAborted && !isFallingBackToCloud) {
                underrunRecoveryCount++;
                this.setPhase('RECOVERING');
                clearUtteranceTracking();
                try {
                  window.speechSynthesis.cancel();
                } catch {}
                if (allowCloudFallbackOnFailure) {
                  isFallingBackToCloud = true;
                  runCloudPrimaryOrFallback(false);
                } else {
                  finish('failed');
                }
              }
            }, 3400);

            subUtterance.onstart = () => {
              if (isFallingBackToCloud || isCompleted || isAborted) return;
              subStarted = true;
              this.lastActivityTimestamp = Date.now();
              this.setPhase('PLAYING_NATIVE');

              if (earlyStartWatchdog) {
                clearTimeout(earlyStartWatchdog);
                earlyStartWatchdog = null;
              }
              if (latencyFallbackTimer) {
                clearTimeout(latencyFallbackTimer);
                latencyFallbackTimer = null;
              }

              if (chunkIdx === 0) {
                const startLatencyMs = Math.round(performance.now() - speakInvokeTimestamp);
                recordUtteranceLatencySample(
                  task.rawText || task.text,
                  task.lang,
                  startLatencyMs,
                  'native'
                );

                startSpeechKeepAlive();
                this.currentStartTime = Date.now();
                notifyStartOnce();

                const startTime = this.currentStartTime;
                if (this.progressAnimTimer) clearInterval(this.progressAnimTimer);
                this.progressAnimTimer = setInterval(() => {
                  if (isCompleted || isAborted || isFallingBackToCloud) return;
                  const elapsed = Date.now() - startTime;
                  const estimatedPercent = Math.min(96, Math.max(4, Math.round((elapsed / estimatedDurationMs) * 100)));
                  const remainMs = Math.max(0, estimatedDurationMs - elapsed);
                  const remainSec = Math.round((remainMs / 1000) * 10) / 10;

                  if (estimatedPercent >= this.currentProgress) {
                    dispatchTaskProgress(estimatedPercent, remainSec, totalSecs);
                  }
                }, 50);
              }
            };

            subUtterance.onboundary = (e: SpeechSynthesisEvent) => {
              if (isFallingBackToCloud || isCompleted || isAborted) return;
              this.lastActivityTimestamp = Date.now();
              if (typeof e.charIndex === 'number') {
                const globalChar = chunkBaseOffset + e.charIndex;
                const boundaryPercent = Math.min(98, Math.round((globalChar / totalNativeChars) * 100));
                const remainRatio = Math.max(0, 1 - globalChar / totalNativeChars);
                const remainSec = Math.round(totalSecs * remainRatio * 10) / 10;
                dispatchTaskProgress(Math.max(this.currentProgress, boundaryPercent), remainSec, totalSecs, globalChar);
              }
            };

            subUtterance.onend = () => {
              if (isFallingBackToCloud || isCompleted || isAborted) return;
              this.lastActivityTimestamp = Date.now();
              if (earlyStartWatchdog) {
                clearTimeout(earlyStartWatchdog);
                earlyStartWatchdog = null;
              }
              clearUtteranceTracking();
              accumulatedChars += chunkText.length + 1;
              chunkIdx++;
              if (chunkIdx >= nativeSubChunks.length) {
                finish('played');
              } else {
                // 稍微錯開微任務排入下一段，避免某些瀏覽器於 onend 當下佇列尚未釋放
                setTimeout(speakNextSubChunk, 20);
              }
            };

            subUtterance.onerror = (e) => {
              if (isFallingBackToCloud || isCompleted || isAborted) return;
              if (e.error === 'canceled' || e.error === 'interrupted') {
                // 若係因外部排程 epoch 變更則為 aborted，否則視為 OS/瀏覽器無預警中斷（可恢復重試）
                const externallyCancelled = runEpoch !== this.schedulerEpoch || Boolean(isCancelled && isCancelled());
                finish(externallyCancelled ? 'aborted' : 'failed');
                return;
              }
              clearUtteranceTracking();
              if (allowCloudFallbackOnFailure) {
                isFallingBackToCloud = true;
                underrunRecoveryCount++;
                this.setPhase('RECOVERING');
                runCloudPrimaryOrFallback(false);
              } else {
                finish('failed');
              }
            };

            try {
              if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
              }
              window.speechSynthesis.speak(subUtterance);
            } catch {
              clearUtteranceTracking();
              if (allowCloudFallbackOnFailure) {
                isFallingBackToCloud = true;
                underrunRecoveryCount++;
                this.setPhase('RECOVERING');
                runCloudPrimaryOrFallback(false);
              } else {
                finish('failed');
              }
            }
          };

          speakNextSubChunk();
        };

        if (hadToCancel) {
          setTimeout(() => {
            launchSubChunks().catch(() => finish('failed'));
          }, 65);
        } else {
          launchSubChunks().catch(() => finish('failed'));
        }
      };

      const runCloudPrimaryOrFallback = async (allowNativeFallbackOnFailure: boolean) => {
        clearUtteranceTracking();
        if (isCompleted || isAborted || runEpoch !== this.schedulerEpoch || (isCancelled && isCancelled())) {
          finish('aborted');
          return false;
        }
        const now = Date.now();
        this.currentStartTime = now;
        this.lastActivityTimestamp = now;
        this.setPhase('BUFFERING');
        notifyStartOnce();

        const cloudOutcome = await playCloudFallbackAudio(
          task.text || task.rawText || '',
          task.lang,
          effectiveRate,
          targetVolume,
          (pct, rem, actualTotalSec) => {
            if (isCompleted || isAborted || runEpoch !== this.schedulerEpoch) return;
            if (this.enginePhase !== 'PLAYING_CLOUD') {
              this.enginePhase = 'PLAYING_CLOUD';
            }
            dispatchTaskProgress(pct, rem, actualTotalSec);
          },
          () => {
            if (!isCompleted && !isAborted && runEpoch === this.schedulerEpoch) {
              this.lastActivityTimestamp = Date.now();
              this.setPhase('PLAYING_CLOUD');
              const startLatencyMs = Math.round(performance.now() - speakInvokeTimestamp);
              recordUtteranceLatencySample(
                task.rawText || task.text,
                task.lang,
                startLatencyMs,
                'cloud'
              );
            }
          },
          Boolean(attemptConfig?.bypassCache)
        );

        // 若因使用者連續點擊或切換而被主動中斷 ('aborted')，直接結束，絕不觸發本地 Web Speech 備援以免發生重疊衝突
        if (
          cloudOutcome === 'aborted' ||
          isCompleted ||
          isAborted ||
          runEpoch !== this.schedulerEpoch ||
          (isCancelled && isCancelled())
        ) {
          finish('aborted');
          return false;
        }

        // 僅在雲端音訊真正載入/播放失敗 ('failed') 時，才自動無縫切換至本地 Web Speech API
        if (
          cloudOutcome === 'failed' &&
          allowNativeFallbackOnFailure &&
          typeof window !== 'undefined' &&
          'speechSynthesis' in window
        ) {
          underrunRecoveryCount++;
          this.setPhase('RECOVERING');
          this.lastActivityTimestamp = Date.now();
          startNativeSpeechSynthesis(false);
          return false;
        }

        finish(cloudOutcome === 'played' ? 'played' : 'failed');
        return cloudOutcome === 'played';
      };

      const voiceEngineMode = getPreferredVoiceEngine();
      const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        runCloudPrimaryOrFallback(false);
        return;
      }

      // 重試第 1 次時優先交換引擎（若正常模式以雲端為主，重試時視情況改以本地引擎或繞過快取雲端）
      if (attemptConfig?.preferAlternateEngine && voiceEngineMode !== 'local_only' && voiceEngineMode !== 'cloud_hd') {
        startNativeSpeechSynthesis(isOnline);
        return;
      }

      // 除非使用者強制設定為「僅限本機離線語音 (local_only)」，否則在連線狀態下優先採用 Cloud HD 預緩衝母語音訊，
      // 並以本地 Web Speech 作為無縫自動備援，徹底杜絕行動裝置瀏覽器「無聲、半截斷音、機器人怪腔」問題
      if (voiceEngineMode !== 'local_only' && isOnline) {
        const explicitUserVoiceURI =
          task.lang === 'en-US' ? getPreferredVoiceURI() : getPreferredTaiwanVoiceURI();
        if (voiceEngineMode === 'cloud_hd' || !explicitUserVoiceURI) {
          runCloudPrimaryOrFallback(true);
          return;
        }
        const allVoices = getAllAvailableVoices();
        const matchedExplicitVoice = allVoices.find((v) => v.voiceURI === explicitUserVoiceURI && v.localService);
        if (!matchedExplicitVoice) {
          runCloudPrimaryOrFallback(true);
          return;
        }
      }

      startNativeSpeechSynthesis(voiceEngineMode !== 'local_only');
    });
  }

  private sleep(ms: number, isCancelled?: () => boolean, runEpoch: number = this.schedulerEpoch): Promise<void> {
    return new Promise((resolve) => {
      if ((isCancelled && isCancelled()) || runEpoch !== this.schedulerEpoch || ms <= 0) {
        resolve();
        return;
      }
      // 採用真實系統時鐘 (Date.now) 與直接 setTimeout，杜絕背景分頁 / 鎖屏時 16ms 累加器漂移導致數十秒凍結
      const deadline = Date.now() + ms;
      let settled = false;
      let mainTimer: ReturnType<typeof setTimeout> | null = null;
      let cancelPoll: ReturnType<typeof setInterval> | null = null;

      const done = () => {
        if (settled) return;
        settled = true;
        if (mainTimer) {
          clearTimeout(mainTimer);
          mainTimer = null;
        }
        if (cancelPoll) {
          clearInterval(cancelPoll);
          cancelPoll = null;
        }
        if (this.currentSleepAbort === done) {
          this.currentSleepAbort = null;
        }
        resolve();
      };

      this.currentSleepAbort = done;
      mainTimer = setTimeout(done, ms);
      cancelPoll = setInterval(() => {
        if ((isCancelled && isCancelled()) || runEpoch !== this.schedulerEpoch || Date.now() >= deadline) {
          done();
        }
      }, 40);
    });
  }
}

// 全域共享連續播放佇列 (Sequential Speech Queue / AudioScheduler) 單例
export const globalAudioScheduler = new AudioScheduler();
export const SequentialSpeechQueue = AudioScheduler;
export const globalSpeechQueue = globalAudioScheduler;

/**
 * 徹底中斷語音播放並清空佇列
 */
export function cancelSpeech(): void {
  globalAudioScheduler.clear();
}

/**
 * 清空連續播放佇列
 */
export function clearSpeechQueue(): void {
  globalAudioScheduler.clear();
}

/**
 * 跳過當前正在播放的句子
 */
export function skipCurrentSpeech(): void {
  globalAudioScheduler.skipCurrent();
}

/**
 * 重播當前正在播放或剛播放完畢的句子
 */
export function replayCurrentSpeech(): void {
  globalAudioScheduler.replayCurrent();
}

/**
 * 訂閱連續播放佇列狀態變化
 */
export function subscribeSpeechQueue(listener: (state: SpeechQueueProgressState) => void): () => void {
  return globalAudioScheduler.subscribe(listener);
}

/**
 * 取得當前連續播放佇列狀態
 */
export function getSpeechQueueState(): SpeechQueueProgressState {
  return globalAudioScheduler.getState();
}

/**
 * 連續播放佇列 React 專用 Hook
 */
export function useSpeechQueue() {
  const [queueState, setQueueState] = useState<SpeechQueueProgressState>(() => globalAudioScheduler.getState());

  useEffect(() => {
    return globalAudioScheduler.subscribe((state) => {
      setQueueState(state);
    });
  }, []);

  const skipCurrent = useCallback(() => {
    globalAudioScheduler.skipCurrent();
  }, []);

  const replayCurrent = useCallback(() => {
    globalAudioScheduler.replayCurrent();
  }, []);

  const clearQueue = useCallback(() => {
    globalAudioScheduler.clear();
  }, []);

  return {
    ...queueState,
    skipCurrent,
    replayCurrent,
    clearQueue
  };
}

/**
 * 檢查佇列是否正在忙碌中
 */
export function isSpeechQueueBusy(): boolean {
  return globalAudioScheduler.isBusy();
}

/**
 * 取得當前連續播放佇列中的任務數
 */
export function getSpeechQueueLength(): number {
  return globalAudioScheduler.getQueueLength();
}

/**
 * 推送任務至連續播放佇列 (Sequential Speech Queue)
 */
export function enqueueSequentialSpeech(
  text: string,
  lang: 'en-US' | 'zh-TW' = 'en-US',
  rate: number = 0.95,
  onEnd?: () => void,
  customPitch?: number,
  bufferAfterMs: number = 150,
  onProgress?: (payload: SpeechProgressPayload) => void
): Promise<void> {
  return globalAudioScheduler.enqueue(
    text,
    lang,
    rate,
    bufferAfterMs,
    undefined,
    customPitch,
    undefined,
    onEnd,
    undefined,
    onProgress
  );
}

/**
 * 徹底重置與解鎖語音引擎（專為手機清除所有卡死狀態、重啟音訊上下文並重載語音）
 */
export function resetSpeechEngine(): void {
  globalAudioScheduler.clear();

  if (typeof window !== 'undefined') {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        loadVoices();
      } catch {}
    }

    try {
      ensureSharedAudioContextRunning(650).catch(() => null);
    } catch {}
  }
}

/**
 * 主動解鎖瀏覽器 Web Audio 與 Web Speech API (手機觸控即時解鎖，共用單一 AudioContext 避免硬體數量上限洩漏)
 * 只有在靜音測試音真正播放成功後才標記 hasHtmlAudioUnlocked=true，避免在無手勢狀態下失敗一次後永久放棄解鎖
 */
export function unlockAudioContext(): void {
  if (typeof window === 'undefined') return;

  try {
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      loadVoices();
    }

    if (!hasHtmlAudioUnlocked && !isHtmlAudioUnlockInFlight && typeof Audio !== 'undefined') {
      try {
        if (!dummyUnlockAudioElement) {
          dummyUnlockAudioElement = new Audio();
          dummyUnlockAudioElement.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
          (dummyUnlockAudioElement as any).playsInline = true;
          dummyUnlockAudioElement.volume = 0.01;
        }
        isHtmlAudioUnlockInFlight = true;
        const p = dummyUnlockAudioElement.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            hasHtmlAudioUnlocked = true;
            isHtmlAudioUnlockInFlight = false;
            try {
              dummyUnlockAudioElement?.pause();
            } catch {}
          }).catch(() => {
            isHtmlAudioUnlockInFlight = false;
          });
        } else {
          hasHtmlAudioUnlocked = true;
          isHtmlAudioUnlockInFlight = false;
        }
      } catch {
        isHtmlAudioUnlockInFlight = false;
      }
    }

    const ctx = getSharedAudioContext();
    if (ctx && (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted')) {
      ensureSharedAudioContextRunning(650).catch(() => null);
    }
  } catch {}
}

/**
 * 手機專屬語音通道深度喚醒（觸摸時解鎖 AudioContext 與恢復語音引擎）
 */
let hasMobileSpeechBeenPrimed = false;
export function primeMobileSpeechEngine(): void {
  if (typeof window === 'undefined') return;

  try {
    unlockAudioContext();
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    const ctx = getSharedAudioContext();
    if (hasHtmlAudioUnlocked && (!ctx || ctx.state === 'running')) {
      hasMobileSpeechBeenPrimed = true;
    }
  } catch (e) {
    console.warn("Mobile speech priming note:", e);
  }
}

// 監聽用戶觸控手勢，直到 HTMLAudio 與 AudioContext 皆確認真正解鎖後再自動卸載監聽器
if (typeof window !== 'undefined') {
  const handleUserGestureUnlock = () => {
    primeMobileSpeechEngine();
    unlockAudioContext();
    const ctx = getSharedAudioContext();
    if (hasHtmlAudioUnlocked && (!ctx || ctx.state === 'running')) {
      window.removeEventListener('click', handleUserGestureUnlock);
      window.removeEventListener('touchstart', handleUserGestureUnlock);
      window.removeEventListener('pointerdown', handleUserGestureUnlock);
    }
  };

  window.addEventListener('click', handleUserGestureUnlock, { passive: true });
  window.addEventListener('touchstart', handleUserGestureUnlock, { passive: true });
  window.addEventListener('pointerdown', handleUserGestureUnlock, { passive: true });

  // 監聽手機螢幕鎖定喚醒與頁面切換回訪 (VisibilityChange / Focus / PageShow)
  const handlePageWakeUp = () => {
    if (document.visibilityState === 'visible') {
      unlockAudioContext();
      globalAudioScheduler.handleVisibilityResume();
      globalAudioScheduler.checkAndSelfHeal();
    }
  };

  document.addEventListener('visibilitychange', handlePageWakeUp, { passive: true });
  window.addEventListener('focus', handlePageWakeUp, { passive: true });
  window.addEventListener('pageshow', handlePageWakeUp, { passive: true });

  // 自動每 2.5 秒常駐自癒心跳檢測 (Background Auto-Healing Watchdog)
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      globalAudioScheduler.checkAndSelfHeal();
    }
  }, 2500);
}

/**
 * 手機硬體級音訊通道無縫保活引擎 (Web Audio Silent Carrier Loop)
 * 解決 iOS WebKit 與 Android MediaService 在發音間隔自動關閉 DAC 導致字頭被吞 (first 200ms clip)
 */
let mobileSilentBufferSource: AudioBufferSourceNode | null = null;

function startMobileAudioHardwareKeepAlive(): void {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
      ensureSharedAudioContextRunning(600).catch(() => null);
    }
    if (!mobileSilentBufferSource) {
      // 根據當前 speechSpeed 動態調整 AudioContext 保活載波的 buffer size (256 ~ 2048 samples)，減少通道切換延遲
      const dynBufferFrames = Math.max(256, currentDynamicAudioBufferSize);
      const buffer = ctx.createBuffer(1, dynBufferFrames, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.0001; // 次聲頻微電位
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
      mobileSilentBufferSource = source;
    }
  } catch {}
}

function stopMobileAudioHardwareKeepAlive(): void {
  try {
    if (mobileSilentBufferSource) {
      mobileSilentBufferSource.stop();
      mobileSilentBufferSource.disconnect();
      mobileSilentBufferSource = null;
    }
  } catch {}
}

/**
 * 防卡死 Keep-Alive 保活計時器 (僅在被非預期暫停時 resume，絕不主動呼叫 pause() 避免語音截斷與破音)
 */
let speechKeepAliveTimer: any = null;

function startSpeechKeepAlive() {
  stopSpeechKeepAlive();
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  speechKeepAliveTimer = setInterval(() => {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}
  }, 3500);
}

function stopSpeechKeepAlive() {
  if (speechKeepAliveTimer) {
    clearInterval(speechKeepAliveTimer);
    speechKeepAliveTimer = null;
  }
  stopMobileAudioHardwareKeepAlive();
}

/**
 * 播放美式英語（預設 interrupt = true，回傳 Promise 並支援 onProgress 即時同步 UI 朗讀高亮）
 */
export function speakEnglish(
  rawText: string,
  rate: number = 0.95,
  onEnd?: () => void,
  customPitch?: number,
  bufferAfterMs: number = 100,
  interrupt: boolean = true,
  onProgress?: (payload: SpeechProgressPayload) => void
): Promise<void> {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return Promise.resolve();
  }

  unlockAudioContext();

  if (interrupt) {
    globalAudioScheduler.clear();
  }

  return globalAudioScheduler.enqueue(
    rawText,
    'en-US',
    rate,
    bufferAfterMs,
    undefined,
    customPitch,
    undefined,
    onEnd,
    undefined,
    onProgress
  );
}

/**
 * 播放台灣中文（預設 interrupt = true，回傳 Promise 並支援 onProgress 即時同步 UI 朗讀高亮）
 */
export function speakChinese(
  rawText: string,
  rate: number = 0.95,
  onEnd?: () => void,
  customPitch?: number,
  bufferAfterMs: number = 100,
  interrupt: boolean = true,
  onProgress?: (payload: SpeechProgressPayload) => void
): Promise<void> {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return Promise.resolve();
  }

  unlockAudioContext();

  if (interrupt) {
    globalAudioScheduler.clear();
  }

  return globalAudioScheduler.enqueue(
    rawText,
    'zh-TW',
    rate,
    bufferAfterMs,
    undefined,
    customPitch,
    undefined,
    onEnd,
    undefined,
    onProgress
  );
}

/**
 * 單字極速發音（專為點擊單字翻譯設計，非阻塞、高清晰度即時發音）
 */
export function speakSingleEnglishWord(
  rawWord: string,
  rate: number = 0.88,
  onEnd?: () => void,
  customPitch?: number,
  onProgress?: (payload: SpeechProgressPayload) => void
): Promise<void> {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return Promise.resolve();
  }

  const cleanWord = rawWord.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').trim();
  if (!cleanWord) {
    if (onEnd) onEnd();
    return Promise.resolve();
  }

  unlockAudioContext();
  // 快速播放單字，中斷先前語句以提供即時點擊回饋
  globalAudioScheduler.clear();

  // 單字發音附加微句點，確保爆破音與尾音（如 -t, -p, -k）完整吐字不被引擎提早截斷
  const wordToSpeak = cleanWord.endsWith('.') ? cleanWord : `${cleanWord}.`;

  return globalAudioScheduler.enqueue(
    wordToSpeak,
    'en-US',
    rate,
    80,
    undefined,
    customPitch,
    undefined,
    onEnd,
    undefined,
    onProgress
  );
}

/**
 * 慢速精準微音節發音模式 (0.7x Slow Clarity Mode)
 * 針對晶圓廠複雜專有名詞、尾音連音與弱化子音進行精準拆解發音
 */
export function speakSlowClarityEnglish(
  rawText: string,
  onEnd?: () => void,
  customPitch?: number,
  onProgress?: (payload: SpeechProgressPayload) => void
): Promise<void> {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return Promise.resolve();
  }

  unlockAudioContext();
  globalAudioScheduler.clear();

  return globalAudioScheduler.enqueue(
    rawText,
    'en-US',
    0.7,
    200,
    undefined,
    customPitch || 1.0,
    undefined,
    onEnd,
    undefined,
    onProgress
  );
}

/**
 * ⚡ 強化發音 (Enhanced Pronunciation Mode)
 */
export function speakEnhancedPronunciation(
  rawText: string,
  speed: number = 0.78,
  onEnd?: () => void,
  customPitch: number = 1.05,
  onProgress?: (payload: SpeechProgressPayload) => void
): Promise<void> {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return Promise.resolve();
  }

  unlockAudioContext();
  globalAudioScheduler.clear();

  const enhancedText = preprocessEnhancedPronunciationText(rawText);

  return globalAudioScheduler.enqueue(
    enhancedText,
    'en-US',
    speed,
    180,
    undefined,
    customPitch,
    undefined,
    onEnd,
    undefined,
    onProgress
  );
}

/**
 * 單字音節拆解發音 (Syllable Breakdown Pronunciation)
 */
export function speakSyllableBreakdown(
  rawWordOrSyllables: string,
  onEnd?: () => void
): Promise<void> {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return Promise.resolve();
  }

  unlockAudioContext();
  globalAudioScheduler.clear();

  let cleanSyllables = rawWordOrSyllables
    .replace(/[·•\-]/g, ', ')
    .replace(/[\/\[\]\(\)]/g, '')
    .trim();

  if (!cleanSyllables.includes(',')) {
    cleanSyllables = preprocessEnhancedPronunciationText(cleanSyllables).replace(/[\-]/g, ', ');
  }

  const textToSpeak = `${cleanSyllables}.`;

  return globalAudioScheduler.enqueue(
    textToSpeak,
    'en-US',
    0.7,
    120,
    undefined,
    1.06,
    undefined,
    onEnd
  );
}

/**
 * 播放台英雙語對照教學（先以道地台灣國語導讀釋義，再以晶圓廠英語清晰朗讀）
 */
export function speakBilingualLesson(
  englishText: string,
  chineseExplanation: string,
  rate: number = 0.95,
  onEnd?: () => void,
  onProgress?: (payload: SpeechProgressPayload) => void
): void {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  const steps: SpeechSequenceStep[] = [];
  if (chineseExplanation && chineseExplanation.trim()) {
    steps.push({
      text: chineseExplanation,
      lang: 'zh-TW',
      rate: 0.95,
      pitch: 1.0,
      bufferAfterMs: 220
    });
  }
  steps.push({
    text: englishText,
    lang: 'en-US',
    rate,
    bufferAfterMs: 150,
    onStepProgress: onProgress
  });

  globalAudioScheduler.scheduleSequence(steps, {
    interrupt: true,
    onSequenceEnd: onEnd
  });
}

/**
 * 手機一鍵緊急解除語音卡死 (Force Unstick Speech Engine)
 */
export function forceUnstickSpeech(): void {
  resetSpeechEngine();
  primeMobileSpeechEngine();
  unlockAudioContext();
}

/**
 * 取得當前瀏覽器音訊與語音引擎完整健康度診斷數據
 */
export function getAudioEngineDiagnostics(): SpeechEngineDiagnostics {
  const isWebSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const isAudioCtx = typeof window !== 'undefined' && Boolean(window.AudioContext || (window as any).webkitAudioContext);
  
  let audioCtxState = 'unavailable';
  if (isAudioCtx) {
    try {
      const sharedCtx = getSharedAudioContext();
      audioCtxState = sharedCtx ? sharedCtx.state : 'running';
    } catch {
      audioCtxState = 'running';
    }
  }

  const allVoices = getAllAvailableVoices();
  const enVoices = getEnglishVoices();
  const twVoices = getTaiwanChineseVoices();
  const curEn = findStandardEnglishVoice(allVoices);
  const curTw = findTaiwanChineseVoice(allVoices);

  let isSpeaking = isAnySpeechPlaying();
  let isPaused = false;
  let isPending = false;

  if (isWebSpeech) {
    isPaused = window.speechSynthesis.paused;
    isPending = window.speechSynthesis.pending;
  }

  const queueState = globalAudioScheduler.getState();

  return {
    isWebSpeechSupported: isWebSpeech,
    isAudioContextSupported: isAudioCtx,
    audioContextState: audioCtxState,
    isMobileDevice: isMobileDevice(),
    totalVoices: allVoices.length,
    englishVoicesCount: enVoices.length,
    taiwanVoicesCount: twVoices.length,
    selectedEnglishVoice: curEn ? curEn.name : '系統預設美語 (en-US)',
    selectedTaiwanVoice: curTw ? curTw.name : '系統預設國語 (zh-TW)',
    accentMode: getPreferredAccentMode(),
    isSpeaking,
    isPaused,
    isPending,
    queueLength: globalAudioScheduler.getQueueLength(),
    currentPitch: getPreferredSpeechPitch(),
    currentStyle: getPreferredSpeechStyle(),
    currentVolume: getPreferredSpeechVolume(),
    loudnessBoostMode: getPreferredLoudnessBoost(),
    enginePhase: queueState.enginePhase,
    sessionEpoch: queueState.sessionEpoch,
    bufferStats: queueState.bufferStats
  };
}

/**
 * 瀏覽器語音辨識封裝 (Speech Recognition)
 */
export function listenSpeech(onResult: (transcript: string) => void, onError?: (err: any) => void) {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (onError) onError("您的手機或瀏覽器暫不支援 Web Speech 語音辨識，建議使用 Chrome 或 Safari 獲得最佳辨識體驗。");
    return null;
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.onerror = (event: any) => {
      if (onError) onError(event.error);
    };

    recognition.start();
    return recognition;
  } catch (e) {
    if (onError) onError(e);
    return null;
  }
}

