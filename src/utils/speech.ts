/**
 * Cleanroom & Semiconductor AudioScheduler Engine (2026 Resilient Web Speech & Audio Pipeline)
 * 專為晶圓半導體無塵室英語特訓打造的頂級語音合成、自然發音韻律排程、手機深度抗卡頓與多層自癒引擎
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getCachedAudioSnippet,
  saveAudioSnippetToCache
} from './audioCacheDB';
import { prefetchSpeechText } from './speechPrefetcher';
import { playCleanroomConfirmationCue, playAmbientInterSentenceCue, getAmbientSoundType, getSharedAudioContext } from './audioEffects';

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
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export interface SpeechQueueProgressState {
  isPlaying: boolean;
  currentTask: AudioTask | null;
  lastCompletedTask: AudioTask | null;
  progress: number; // 0 to 100
  charIndex: number;
  totalLength: number;
  queueLength: number; // 佇列總數（包含正在播放中的項目）
  remainingQueueCount: number; // 佇列中待播放的其餘句子數量（不含正在播放的這句）
  remainingSeconds: number; // 當前正在播放的句子剩餘秒數 (如 2.4s)
  totalEstimatedSeconds: number; // 當前正在播放的句子預估總秒數
  isMobileDevice: boolean;
  isEngineHealthy: boolean;
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
}

const PREFERRED_VOICE_KEY = 'CLEANROOM_PREFERRED_VOICE_URI';
const PREFERRED_TAIWAN_VOICE_KEY = 'CLEANROOM_TAIWAN_VOICE_URI';
const PREFERRED_ACCENT_MODE_KEY = 'CLEANROOM_ACCENT_MODE';
const PREFERRED_PITCH_KEY = 'CLEANROOM_SPEECH_PITCH';
const PREFERRED_STYLE_KEY = 'CLEANROOM_SPEECH_STYLE';
const PREFERRED_VOLUME_KEY = 'CLEANROOM_SPEECH_VOLUME';
const PREFERRED_LOUDNESS_BOOST_KEY = 'CLEANROOM_LOUDNESS_BOOST';

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
 * 晶圓半導體專用術語自然音訊發音字典 (精準轉化為母語級口語發音與清晰音節)
 */
const TECHNICAL_PRONUNCIATION_MAP: [RegExp, string][] = [
  // 晶圓搬送、載具與自動化 (AMHS / EFEM / Fab Robotics)
  [/\bFOUPs\b/gi, 'foops'],
  [/\bFOUP\b/gi, 'foop'],
  [/\bFOUPS\b/g, 'foops'],
  [/\bSMIF\b/gi, 'smiff'],
  [/\bSECS\/GEM\b/gi, 'SECS and GEM'],
  [/\bSECS-GEM\b/gi, 'SECS and GEM'],
  [/\bSECS\b/gi, 'secs'],
  [/\bGEM\b/gi, 'gem'],
  [/\bLOTO\b/gi, 'low-toe'],
  [/\bMFCs\b/gi, 'M F C s'],
  [/\bMFC\b/gi, 'M F C'],
  [/\bOHT\b/gi, 'O H T'],
  [/\bAGV\b/gi, 'A G V'],
  [/\bAMHS\b/gi, 'A M H S'],
  [/\bEFEM\b/gi, 'E F E M'],
  [/\bFSE\b/gi, 'F S E'],
  [/\bWIP\b/gi, 'wip'],
  [/\bEMO\b/gi, 'E M O'],
  [/\bEPO\b/gi, 'E P O'],
  [/\bE-Stop\b/gi, 'E stop'],
  [/\bEstop\b/gi, 'E stop'],
  [/\bFFU\b/gi, 'F F U'],
  [/\bESD\b/gi, 'E S D'],
  [/\bPLC\b/gi, 'P L C'],
  [/\bHMI\b/gi, 'H M I'],
  [/\bTCU\b/gi, 'T C U'],
  [/\bCIP\b/gi, 'C I P'],
  [/\bPFD\b/gi, 'P F D'],
  [/\bloadport\b/gi, 'load port'],
  [/\bloadports\b/gi, 'load ports'],

  // 光學檢測與封裝通用縮寫 (Optical Inspection & Packaging)
  [/\bAOI\b/gi, 'A O I'],
  [/\bOCV\b/gi, 'O C V'],
  [/\bOCR\b/gi, 'O C R'],
  [/\bJIG\b/gi, 'jig'],
  [/\bC4\b/gi, 'C four'],

  // 微影、黃光與曝光系統 (Photolithography & Track)
  [/\bEUV\b/gi, 'E U V'],
  [/\bDUV\b/gi, 'D U V'],
  [/\bHigh-NA\b/gi, 'High N A'],
  [/\bHigh NA\b/gi, 'High N A'],
  [/\bArFi\b/gi, 'A R F immersion'],
  [/\bArF\b/gi, 'A R F'],
  [/\bKrF\b/gi, 'K R F'],
  [/\bi-line\b/gi, 'i line'],
  [/\bEBR\b/gi, 'E B R'],
  [/\bPEB\b/gi, 'P E B'],
  [/\bTMAH\b/gi, 'T M A H'],
  [/\bpellicle\b/gi, 'pellicle'],
  [/\bpellicles\b/gi, 'pellicles'],
  [/\breticle\b/gi, 'reticle'],
  [/\breticles\b/gi, 'reticles'],
  [/\bEUV Pod\b/gi, 'E U V pod'],
  [/\bEUV Pods\b/gi, 'E U V pods'],

  // 先進封裝與奈米節點 (Advanced Packaging & Leading Edge Nodes)
  [/\bCoWoS\b/gi, 'co-woss'],
  [/\bInFO\b/gi, 'in-foe'],
  [/\bSoIC\b/gi, 'S O I C'],
  [/\bTSV\b/gi, 'T S V'],
  [/\bTSVs\b/gi, 'T S V s'],
  [/\bFinFET\b/gi, 'fin fet'],
  [/\bFinFETs\b/gi, 'fin fets'],
  [/\bGAA\b/gi, 'G A A'],
  [/\bGAAFET\b/gi, 'G A A fet'],
  [/\bGAAFETs\b/gi, 'G A A fets'],
  [/\bNanosheet\b/gi, 'nanosheet'],
  [/\bNanosheets\b/gi, 'nanosheets'],
  [/\bBackside PDN\b/gi, 'backside P D N'],
  [/\bBackside Power\b/gi, 'backside power'],

  // 半導體製程與機台模組 (Process & Equipment)
  [/\bCVD\b/gi, 'C V D'],
  [/\bPVD\b/gi, 'P V D'],
  [/\bCMP\b/gi, 'C M P'],
  [/\bALD\b/gi, 'A L D'],
  [/\bETCH\b/gi, 'etch'],
  [/\bRTP\b/gi, 'R T P'],
  [/\bEPI\b/gi, 'epi'],
  [/\bESC\b/gi, 'E S C'],
  [/\bE-Chuck\b/gi, 'E chuck'],
  [/\bRF\b/gi, 'R F'],
  [/\bDMM\b/gi, 'D M M'],
  [/\bRGA\b/gi, 'R G A'],
  [/\bHBC\b/gi, 'H B C'],
  [/\bICP\b/gi, 'I C P'],
  [/\bCCP\b/gi, 'C C P'],
  [/\bECN\b/gi, 'E C N'],

  // 真空、閥件與壓力傳感系統 (Vacuum, Valves & Pressure Sensing)
  [/\bBaratron\b/gi, 'Baratron'],
  [/\bBaratrons\b/gi, 'Baratrons'],
  [/\bPirani\b/gi, 'Pirani'],
  [/\bPenning\b/gi, 'Penning'],
  [/\bCryopump\b/gi, 'cryopump'],
  [/\bCryopumps\b/gi, 'cryopumps'],
  [/\bTMP\b/gi, 'T M P'],
  [/\bSlit Valve\b/gi, 'slit valve'],
  [/\bSlit Valves\b/gi, 'slit valves'],
  [/\bPendulum Valve\b/gi, 'pendulum valve'],
  [/\bPendulum Valves\b/gi, 'pendulum valves'],
  [/\bThrottle Valve\b/gi, 'throttle valve'],
  [/\bThrottle Valves\b/gi, 'throttle valves'],
  [/\bRoughing Pump\b/gi, 'roughing pump'],
  [/\bDry Pump\b/gi, 'dry pump'],
  [/\bTurbo Pump\b/gi, 'turbo pump'],
  [/\bChiller\b/gi, 'chiller'],
  [/\bChillers\b/gi, 'chillers'],
  [/\bScrubber\b/gi, 'scrubber'],
  [/\bScrubbers\b/gi, 'scrubbers'],
  [/\bEPD\b/gi, 'E P D'],
  [/\bOES\b/gi, 'O E S'],
  [/\bTGMS\b/gi, 'T G M S'],
  [/\bUPW\b/gi, 'U P W'],
  [/\bPOU\b/gi, 'P O U'],
  [/\bPCW\b/gi, 'P C W'],
  [/\bde-chuck\b/gi, 'de-chuck'],
  [/\bde-chucking\b/gi, 'de-chucking'],
  [/\bchucking\b/gi, 'chucking'],
  [/\bwafer bevel\b/gi, 'wafer bevel'],
  [/\bwafer notch\b/gi, 'wafer notch'],
  [/\bend-effector\b/gi, 'end effector'],
  [/\bend effector\b/gi, 'end effector'],
  [/\bpiranha\b/gi, 'piranha'],
  [/\bmanometer\b/gi, 'manometer'],
  [/\bthermocouple\b/gi, 'thermocouple'],
  [/\bthermocouples\b/gi, 'thermocouples'],

  // 化學品、氣體與廠務安全 (Chemicals & Safety)
  [/\bIPA\b/gi, 'I P A'],
  [/\bDIW\b/gi, 'D I water'],
  [/\bDI Water\b/gi, 'D I water'],
  [/\bCDA\b/gi, 'C D A'],
  [/\bSC-?1\b/gi, 'S C 1'],
  [/\bSC-?2\b/gi, 'S C 2'],
  [/\bSPM\b/gi, 'S P M'],
  [/\bBOE\b/gi, 'B O E'],
  [/\bHF\b/gi, 'H F'],
  [/\bDHF\b/gi, 'dilute H F'],
  [/\bSiH4\b/gi, 'silane'],
  [/\bNF3\b/gi, 'nitrogen trifluoride'],
  [/\bWF6\b/gi, 'tungsten hexafluoride'],
  [/\bTEOS\b/gi, 'tee-oss'],
  [/\bPPE\b/gi, 'P P E'],
  [/\bCl2\b/g, 'chlorine gas'],
  [/\bBCl3\b/g, 'boron trichloride'],
  [/\bHBr\b/g, 'hydrogen bromide'],
  [/\bCF4\b/g, 'C F 4'],
  [/\bCHF3\b/g, 'C H F 3'],
  [/\bC4F8\b/g, 'C 4 F 8'],
  [/\bSF6\b/g, 'S F 6'],
  [/\bNH3\b/g, 'ammonia'],
  [/\bN2O\b/g, 'nitrous oxide'],
  [/\bPH3\b/g, 'phosphine'],
  [/\bAsH3\b/g, 'arsine'],
  [/\bB2H6\b/g, 'diborane'],
  [/\bGeH4\b/g, 'germane'],
  [/\bH2O2\b/g, 'hydrogen peroxide'],
  [/\bH2SO4\b/g, 'sulfuric acid'],
  [/\bHCl\b/g, 'hydrochloric acid'],
  [/\bH3PO4\b/g, 'phosphoric acid'],
  [/\bNH4OH\b/g, 'ammonium hydroxide'],

  // 維修與品管規範 (Maintenance & Quality)
  [/\bSOP\b/gi, 'S O P'],
  [/\bOCAP\b/gi, 'O-CAP'],
  [/\bFMEA\b/gi, 'F M E A'],
  [/\bSPC\b/gi, 'S P C'],
  [/\bCPK\b/gi, 'C P K'],
  [/\bPM\b/gi, 'P M'],
  [/\bBM\b/gi, 'B M'],
  [/\bTAT\b/gi, 'T A T'],
  [/\bMTBF\b/gi, 'M T B F'],
  [/\bMTTR\b/gi, 'M T T R'],
  [/\bMES\b/gi, 'M E S'],
  [/\bSVO\b/gi, 'S V O'],
  [/\bOOC\b/gi, 'O O C'],
  [/\bOOS\b/gi, 'O O S'],

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
  [/\b(\d+)\s*Å\b/gi, '$1 angstroms'],
  [/\b(\d+)\s*RPM\b/gi, '$1 R P M'],
  [/\b(\d+)\s*rpm\b/gi, '$1 R P M'],
  [/\b(\d+)\s*psi\b/gi, '$1 P S I'],
  [/\b(\d+)\s*PSI\b/g, '$1 P S I'],
  [/\b(\d+)\s*Pa\b/gi, '$1 pascals'],
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
  [/\bno\.\s*(\d+)/gi, 'number $1'],
  [/\bw\/\s+/gi, 'with '],
  [/\bw\/o\s+/gi, 'without '],
  [/\bOn\/Off\b/gi, 'On Off'],
  [/\bIn\/Out\b/gi, 'In Out'],
  [/\bPass\/Fail\b/gi, 'Pass Fail'],
  [/\bLock\/Tag\b/gi, 'Lock and Tag'],
  [/\bRun\/Stop\b/gi, 'Run Stop'],
  [/\bOpen\/Close\b/gi, 'Open Close'],
  [/\btemp\.\s*/gi, 'temperature '],
  [/\bpress\.\s*/gi, 'pressure '],
  [/\bpos\.\s*/gi, 'position '],
  [/\bavg\.\s*/gi, 'average '],
  [/\bmin\.\s*(\d+)/gi, 'minimum $1'],
  [/\bmax\.\s*(\d+)/gi, 'maximum $1'],
  [/\bstd\.\s*/gi, 'standard '],
  [/\bcal\.\s*/gi, 'calibration '],
  [/\bmaint\.\s*/gi, 'maintenance '],
  [/\bspec\.\s*/gi, 'specification '],
  [/\bconfig\.\s*/gi, 'configuration '],
  [/\bdiag\.\s*/gi, 'diagnostic '],
  [/\berr\.\s*/gi, 'error '],
  [/\bmsg\.\s*/gi, 'message '],
  [/\bchk\.\s*/gi, 'check '],
  [/\bctrl\.\s*/gi, 'control '],
  [/\bvlv\.\s*/gi, 'valve '],
  [/\bcyl\.\s*/gi, 'cylinder '],
  [/\bgen\.\s*/gi, 'generator '],
  [/\btrans\.\s*/gi, 'transmitter '],
  [/\brecv\.\s*/gi, 'receiver '],
  [/\baux\.\s*/gi, 'auxiliary '],

  [/\bde-?ionized\b/gi, 'D I'],
  [/\bo-ring\b/gi, 'O ring'],
  [/\bo-rings\b/gi, 'O rings']
];

/**
 * 台灣半導體在地發音與中文術語正音字典 (Taiwan Fab Accent & Acronym Normalization Map)
 * 專注精準展開無塵室縮寫與特殊術語，保持標準英語單字完整，避免連字號導致機械音割裂
 */
export const TAIWAN_FAB_PHONETIC_REPLACEMENTS: [RegExp, string][] = [
  // 核心機台與縮寫專用正音 (確保 TTS 準確唸出工程縮寫而非拼字母或誤音)
  [/\bFOUPs\b/gi, 'foops'],
  [/\bFOUP\b/gi, 'foop'],
  [/\bLOTO\b/g, 'L O T O'],
  [/\bloadport\b/gi, 'load port'],
  [/\bloadports\b/gi, 'load ports'],
  [/\bde-?ionized\b/gi, 'D I'],
  [/\bOOC\b/g, 'O O C'],
  [/\bOOS\b/g, 'O O S'],
  [/\bOCAP\b/g, 'O-CAP'],
  [/\bSECS\/GEM\b/gi, 'SECS and GEM'],
  [/\bSECS\b/gi, 'secs'],
  [/\bGEM\b/gi, 'gem'],
  [/\bASML\b/gi, 'A S M L'],
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
  [/\bmTorr\b/gi, 'milli torr'],
  [/\bbaratron\b/gi, 'baratron'],
  [/\bcryopump\b/gi, 'cryo pump'],
  [/\bcryopumps\b/gi, 'cryo pumps'],
  [/\bde-chuck\b/gi, 'de chuck'],
  [/\bde-chucking\b/gi, 'de chucking'],
  [/\bend-effector\b/gi, 'end effector'],
  [/\bE-Stop\b/gi, 'E stop'],
  [/\bcleanroom\b/gi, 'clean room'],
  [/\bsub-fab\b/gi, 'sub fab']
];

/**
 * 台灣在地繁體中文半導體名詞正音字典（避免 TTS 發出奇怪捲舌音或多音字錯誤）
 */
export const TAIWAN_MANDARIN_CHINESE_NORMALIZATION: [RegExp, string][] = [
  [/矽/g, '矽'], // 保持台灣常用「ㄒㄧˋ」
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
 * 支援台灣晶圓廠在地口音模式 (Taiwan Fab Accent) 與標準美式發音切換
 */
export function preprocessSpeechText(input: string, isEnglish: boolean = true, customAccentMode?: AccentMode): string {
  if (!input) return "";

  let text = input;
  const accentMode = customAccentMode || getPreferredAccentMode();

  // 1. 正規化引號、撇號、破折號
  text = text.replace(/[’‘`]/g, "'");
  text = text.replace(/[“”]/g, '"');
  text = text.replace(/[–—]/g, ', ');

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

  // 6. 套用晶圓廠專用術語發音微調
  for (const [pattern, replacement] of TECHNICAL_PRONUNCIATION_MAP) {
    text = text.replace(pattern, replacement);
  }

  // 7. 若開啟「台灣晶圓廠在地口音模式」，套用台灣工程師專屬音節加強與發音對齊
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

  // 9. 將單詞間的斜線替換為自然空格或 and
  text = text.replace(/([a-zA-Z0-9])\/([a-zA-Z0-9])/g, "$1 $2");

  // 10. 智慧韻律停頓插入：在長句連接詞前加入微停頓逗號，提升自然母語節奏感
  if (isEnglish) {
    text = text.replace(/(?<=\w)\s+\b(because|however|therefore|in addition|as a result|furthermore)\b/gi, ", $1,");
    text = text.replace(/(?<=\w)\s+\b(before opening|before starting|after completing|prior to|in order to)\b/gi, ", $1");
  }

  // 11. 移除多餘非法標點，保留基本發音停頓標點
  text = text.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s.,'?!:%+\-]/g, " ");

  // 12. 標準化連續標點與空白
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
 * 1. 深度音節展開與重音清晰化 (Syllable Disambiguation & Stress Articulation)
 * 2. 意群微停頓注入 (Thought-Group Cadence & Micro Pauses)
 * 3. 確保單字結尾弱化子音 (-t, -d, -k, -p, -s, -th) 完整吐字
 */
export function preprocessEnhancedPronunciationText(input: string): string {
  if (!input) return "";

  let text = preprocessSpeechText(input, true);

  // 1. 晶圓廠核心專用術語與縮寫展開 (保持英語原詞流暢發音，精準解析縮寫)
  const ENHANCED_PHONETIC_EXPANSIONS: [RegExp, string][] = [
    [/\bFOUPs\b/gi, 'foops'],
    [/\bFOUP\b/gi, 'foop'],
    [/\bLOTO\b/g, 'L O T O'],
    [/\bloadport\b/gi, 'load port'],
    [/\bloadports\b/gi, 'load ports'],
    [/\bcryopump\b/gi, 'cryo pump'],
    [/\bde-chuck\b/gi, 'de chuck'],
    [/\bde-chucking\b/gi, 'de chucking'],
    [/\bsub-fab\b/gi, 'sub fab'],
    [/\bcleanroom\b/gi, 'clean room'],
    [/\bend-effector\b/gi, 'end effector'],
    [/\bE-Stop\b/gi, 'E stop'],
    [/\bMFC\b/g, 'M F C'],
    [/\bASML\b/gi, 'A S M L'],
    [/\bCMP\b/g, 'C M P'],
    [/\bPVD\b/g, 'P V D'],
    [/\bCVD\b/g, 'C V D'],
    [/\bALD\b/g, 'A L D']
  ];

  for (const [regex, rep] of ENHANCED_PHONETIC_EXPANSIONS) {
    text = text.replace(regex, rep);
  }

  // 2. 意群微停頓 (Thought-group cadence)：在連接詞與長片語前注入微停頓逗號
  text = text.replace(/(?<=\w)\s+(to verify|to check|to prevent|to ensure|to avoid)\b/gi, ", $1");
  text = text.replace(/(?<=\w)\s+(and verify|and ensure|and check)\b/gi, ", $1");
  text = text.replace(/(?<=\w)\s+(such as|as well as)\b/gi, ", $1");
  text = text.replace(/(?<=\w)\s+(in the chamber|in the load port|at bay|on tool)\b/gi, ", $1");

  // 3. 標準化逗號與空白
  text = text.replace(/,{2,}/g, ",");
  text = text.replace(/\s*,\s*/g, ", ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
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
  } catch {}
  resetSpeechEngine();
}

/**
 * 語音清單快取與智慧分級管理
 */
let cachedVoices: SpeechSynthesisVoice[] = [];

export function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    const list = window.speechSynthesis.getVoices() || [];
    if (list && list.length > 0) {
      cachedVoices = list;
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
        return list;
      }
    } catch {}
  }
  return cachedVoices;
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

function stopCloudFallbackAudio(): void {
  if (activeCloudAudio) {
    try {
      activeCloudAudio.pause();
      activeCloudAudio.src = '';
    } catch {}
    activeCloudAudio = null;
  }
}

async function playCloudFallbackAudio(
  text: string,
  lang: 'en-US' | 'zh-TW',
  rate: number,
  volume: number = 1.0,
  onProgress?: (percent: number, remainSec: number) => void
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  stopCloudFallbackAudio();

  try {
    const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 220);
    if (!cleanText) return false;

    const url = `/api/tts?lang=${encodeURIComponent(lang)}&text=${encodeURIComponent(cleanText)}`;
    const audio = new Audio(url);
    activeCloudAudio = audio;
    audio.playbackRate = Math.max(0.55, Math.min(1.35, rate));
    audio.volume = Math.max(0.1, Math.min(1.0, volume));

    if (onProgress) {
      audio.ontimeupdate = () => {
        if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
          const pct = Math.min(98, Math.round((audio.currentTime / audio.duration) * 100));
          const rem = Math.max(0, Math.round(((audio.duration - audio.currentTime) / audio.playbackRate) * 10) / 10);
          onProgress(pct, rem);
        }
      };
    }

    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (activeCloudAudio === audio) {
          activeCloudAudio = null;
        }
        resolve(ok);
      };

      const safetyTimer = setTimeout(() => done(false), 12000);
      audio.onended = () => {
        clearTimeout(safetyTimer);
        done(true);
      };
      audio.onerror = () => {
        clearTimeout(safetyTimer);
        done(false);
      };

      audio.play().catch(() => {
        clearTimeout(safetyTimer);
        done(false);
      });
    });
  } catch {
    return false;
  }
}

/**
 * 核心：基於 Web Speech API、雲端高音質流與 IndexedDB 本地快取的 Promise-based 『連續播放佇列 (Sequential Speech Queue / AudioScheduler)』系統
 * 具備手機端多重自癒看門狗、非阻塞同步啟動、背景喚醒解鎖與防 GC 銷毀機制
 */
export class AudioScheduler {
  private queue: {
    task: AudioTask;
    resolve: () => void;
    reject: (reason?: any) => void;
    isCancelled?: () => boolean;
  }[] = [];

  private isRunning: boolean = false;
  private currentTaskId: number = 0;
  private currentActiveUtterance: SpeechSynthesisUtterance | null = null;
  private currentRunningTask: AudioTask | null = null;
  private lastCompletedTask: AudioTask | null = null;
  private currentProgress: number = 0;
  private currentCharIndex: number = 0;
  private currentRemainingSeconds: number = 0;
  private currentEstimatedTotalSeconds: number = 0;
  private currentStartTime: number = 0;
  private lastCancelTime: number = 0;
  private progressAnimTimer: any = null;
  private listeners: Set<(state: SpeechQueueProgressState) => void> = new Set();
  private lastWatchdogRescueTime: number = 0;

  /**
   * 取得當前連續播放佇列狀態
   */
  public getState(): SpeechQueueProgressState {
    const queueTotal = this.getQueueLength();
    const remainingCount = Math.max(0, queueTotal - (this.isRunning ? 1 : 0));

    return {
      isPlaying: this.isRunning,
      currentTask: this.currentRunningTask,
      lastCompletedTask: this.lastCompletedTask,
      progress: this.currentProgress,
      charIndex: this.currentCharIndex,
      totalLength: this.currentRunningTask ? this.currentRunningTask.text.length : 0,
      queueLength: queueTotal,
      remainingQueueCount: remainingCount,
      remainingSeconds: this.currentRemainingSeconds,
      totalEstimatedSeconds: this.currentEstimatedTotalSeconds,
      isMobileDevice: isMobileDevice(),
      isEngineHealthy: true
    };
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
   * 跳過當前正在播放的句子，立即前進至佇列中的下一句
   */
  public skipCurrent(): void {
    if (this.progressAnimTimer) {
      clearInterval(this.progressAnimTimer);
      this.progressAnimTimer = null;
    }
    stopCloudFallbackAudio();
    if (this.currentActiveUtterance || this.isRunning) {
      this.lastCancelTime = Date.now();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch {}
      }
    }
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
    stopCloudFallbackAudio();

    const replayTask: AudioTask = {
      ...taskToReplay,
      id: ++this.currentTaskId
    };

    // 將該句插回佇列最前列
    this.queue.unshift({
      task: replayTask,
      resolve: () => {},
      reject: () => {}
    });

    if (this.currentActiveUtterance || this.isRunning) {
      this.lastCancelTime = Date.now();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch {}
      }
    } else {
      this.processQueue();
    }

    this.notifyListeners();
  }

  /**
   * 將語音任務推入連續播放佇列 (Sequential Queue)
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
    onError?: (err: any) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (isCancelled && isCancelled()) {
        if (onEnd) onEnd();
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
        onEnd,
        onError
      };

      this.queue.push({
        task,
        resolve,
        reject,
        isCancelled
      });

      this.notifyListeners();
      this.processQueue();
    });
  }

  /**
   * 立即清空所有佇列並停止底層發音
   */
  public clear(): void {
    if (this.progressAnimTimer) {
      clearInterval(this.progressAnimTimer);
      this.progressAnimTimer = null;
    }
    this.currentTaskId++;
    this.lastCancelTime = Date.now();
    const pending = [...this.queue];
    this.queue = [];
    this.isRunning = false;
    this.currentActiveUtterance = null;
    this.currentRunningTask = null;
    this.currentProgress = 0;
    this.currentCharIndex = 0;
    this.currentRemainingSeconds = 0;
    this.currentEstimatedTotalSeconds = 0;
    this.currentStartTime = 0;
    stopSpeechKeepAlive();
    stopCloudFallbackAudio();

    if (typeof window !== 'undefined') {
      // 清空 GC 追蹤集合
      if ((window as any).__FSE_ACTIVE_UTTERANCES__) {
        (window as any).__FSE_ACTIVE_UTTERANCES__.clear();
      }
      (window as any).__CURRENT_ACTIVE_UTTERANCE__ = null;

      // 停止原生 Web Speech
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch (err) {
          console.warn("AudioScheduler cancel error:", err);
        }
      }
    }

    this.notifyListeners();

    pending.forEach((item) => {
      if (item.task.onEnd) {
        try {
          item.task.onEnd();
        } catch {}
      }
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
   * 手機端主動自癒檢測：若佇列卡住超過預估時間，強制喚醒或重啟發音調度
   */
  public checkAndSelfHeal(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // 若瀏覽器處於暫停狀態，立即恢復
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}

    if (this.isRunning && this.currentRunningTask) {
      const elapsed = Date.now() - this.currentStartTime;
      const threshold = Math.max(10000, this.currentEstimatedTotalSeconds * 2000 + 4000);

      if (elapsed > threshold) {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch {}

        if (this.currentActiveUtterance) {
          try {
            if ((window as any).__FSE_ACTIVE_UTTERANCES__) {
              (window as any).__FSE_ACTIVE_UTTERANCES__.delete(this.currentActiveUtterance);
            }
          } catch {}
          this.currentActiveUtterance = null;
        }

        this.isRunning = false;
        if (this.currentRunningTask?.onEnd) {
          try {
            this.currentRunningTask.onEnd();
          } catch {}
        }
        this.processQueue();
      }
    }
  }

  /**
   * 執行隊列核心調度 (極速非阻塞調度，內建 cancel-speak 45ms 安全防競態緩衝)
   */
  private async processQueue(): Promise<void> {
    if (this.isRunning || this.queue.length === 0) {
      if (!this.isRunning && this.queue.length === 0) {
        this.currentRunningTask = null;
        this.currentProgress = 0;
        this.currentCharIndex = 0;
        this.notifyListeners();
      }
      return;
    }

    this.isRunning = true;
    const item = this.queue.shift();
    if (!item) {
      this.isRunning = false;
      this.currentRunningTask = null;
      this.currentProgress = 0;
      this.notifyListeners();
      return;
    }

    const { task, resolve, isCancelled } = item;

    if (isCancelled && isCancelled()) {
      if (task.onEnd) task.onEnd();
      resolve();
      this.isRunning = false;
      this.processQueue();
      return;
    }

    try {
      // 避開 Chrome / Safari 在 cancel() 後同一 JS tick 呼叫 speak() 導致語音被靜默丟棄的瀏覽器底層競態
      const sinceCancel = Date.now() - this.lastCancelTime;
      if (sinceCancel < 45) {
        await new Promise((r) => setTimeout(r, 45 - sinceCancel));
      }

      const startTime = Date.now();

      await this.speakUtterance(task, isCancelled);

      // 非同步背景儲存快取至 IndexedDB（不阻礙主發音流）
      const durationMs = Date.now() - startTime;
      saveAudioSnippetToCache(task.text, task.lang, task.rate, { durationMs }).catch(() => {});

      // 語句完成過渡確認音效 (微靜音混音)
      if (!isCancelled || !isCancelled()) {
        try {
          if (task.lang === 'en-US' || task.rawText) {
            playCleanroomConfirmationCue();
            playAmbientInterSentenceCue();
          }
        } catch (e) {}
      }

      // 語句之間緩衝間隔 (Buffer Time)
      const bufferInterval = (task.bufferAfterMs && task.bufferAfterMs > 0) ? task.bufferAfterMs : 120;
      await this.sleep(bufferInterval, isCancelled);

      resolve();
    } catch (err) {
      console.warn("AudioScheduler execute error:", err);
      if (task.onEnd) task.onEnd();
      resolve();
    } finally {
      this.isRunning = false;
      if (this.queue.length === 0) {
        this.currentRunningTask = null;
        this.currentProgress = 0;
        this.currentRemainingSeconds = 0;
        this.currentEstimatedTotalSeconds = 0;
        this.notifyListeners();
      }
      // 連續播放切換微小間隙
      setTimeout(() => {
        this.processQueue();
      }, 25);
    }
  }

  private speakUtterance(task: AudioTask, isCancelled?: () => boolean): Promise<void> {
    return new Promise((resolve) => {
      if (isCancelled && isCancelled()) {
        if (task.onEnd) task.onEnd();
        resolve();
        return;
      }

      // 立即解鎖共用 AudioContext
      unlockAudioContext();

      let isCompleted = false;
      let earlyStartWatchdog: any = null;
      let fullDurationWatchdog: any = null;
      let latencyFallbackTimer: any = null;
      const speakInvokeTimestamp = performance.now();

      const globalVol = getPreferredSpeechVolume();
      const targetVolume = typeof task.volume === 'number' ? task.volume : globalVol;
      const accentMode = getPreferredAccentMode();

      let effectiveRate = Math.max(0.55, Math.min(1.25, task.rate));
      if (accentMode === 'tw_fab' && task.lang === 'en-US') {
        effectiveRate = Math.max(0.55, Math.min(1.15, effectiveRate * 0.96));
      }

      // 依長度與語速計算預估總秒數
      const estimatedDurationMs = Math.max(900, (task.text.length * (85 / Math.max(0.55, effectiveRate))));
      const totalSecs = Math.round((estimatedDurationMs / 1000) * 10) / 10;

      this.currentRunningTask = task;
      this.currentProgress = 0;
      this.currentCharIndex = 0;
      this.currentEstimatedTotalSeconds = totalSecs;
      this.currentRemainingSeconds = totalSecs;
      this.currentStartTime = Date.now();
      this.notifyListeners();

      let utterance: SpeechSynthesisUtterance | null = null;

      const finish = () => {
        if (isCompleted) return;
        isCompleted = true;

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
        this.currentProgress = 100;
        this.currentRemainingSeconds = 0;
        this.lastCompletedTask = task;
        this.notifyListeners();

        stopSpeechKeepAlive();

        if (utterance && (window as any).__FSE_ACTIVE_UTTERANCES__) {
          (window as any).__FSE_ACTIVE_UTTERANCES__.delete(utterance);
        }
        if (utterance && (window as any).__CURRENT_ACTIVE_UTTERANCE__ === utterance) {
          (window as any).__CURRENT_ACTIVE_UTTERANCE__ = null;
        }
        this.currentActiveUtterance = null;
        resolve();
      };

      const runCloudFallbackAndFinish = async () => {
        if (isCompleted) return;
        if (task.onStart) {
          try {
            task.onStart();
          } catch {}
        }
        this.currentProgress = 10;
        this.notifyListeners();

        await playCloudFallbackAudio(
          task.rawText || task.text,
          task.lang,
          effectiveRate,
          targetVolume,
          (pct, rem) => {
            this.currentProgress = pct;
            this.currentRemainingSeconds = rem;
            this.notifyListeners();
          }
        );

        if (task.onEnd) {
          try {
            task.onEnd();
          } catch {}
        }
        finish();
      };

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        runCloudFallbackAndFinish();
        return;
      }

      const allVoices = getAllAvailableVoices();
      const selectedVoice = task.lang === 'en-US'
        ? findStandardEnglishVoice(allVoices)
        : findTaiwanChineseVoice(allVoices);

      // 若當前瀏覽器環境無可用語音包 (例如無頭瀏覽器或精簡系統)，直接無縫啟用雲端真實語音流
      if (allVoices.length === 0 && !selectedVoice) {
        runCloudFallbackAndFinish();
        return;
      }

      utterance = new SpeechSynthesisUtterance(task.text);
      this.currentActiveUtterance = utterance;
      (window as any).__CURRENT_ACTIVE_UTTERANCE__ = utterance;
      if ((window as any).__FSE_ACTIVE_UTTERANCES__) {
        (window as any).__FSE_ACTIVE_UTTERANCES__.add(utterance);
      }

      utterance.volume = targetVolume;

      let effectivePitch = task.pitch || getPreferredSpeechPitch() || 1.0;
      const isQuestion = (task.rawText || task.text).trim().endsWith('?');
      if (isQuestion) {
        effectivePitch = Math.min(1.2, effectivePitch * 1.04);
      }
      utterance.pitch = effectivePitch;
      utterance.rate = effectiveRate;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang || task.lang;
      } else {
        utterance.lang = task.lang;
      }

      let hasStarted = false;
      let isFallingBackToCloud = false;

      // 極速無感防卡頓保護：若瀏覽器語音引擎 900ms 內未啟動 (如遠端自然語音卡住)，立即自動切換雲端真實發音流，零報錯、零中斷
      latencyFallbackTimer = setTimeout(() => {
        if (!hasStarted && !isCompleted && !isFallingBackToCloud) {
          isFallingBackToCloud = true;
          try {
            window.speechSynthesis.cancel();
          } catch {}
          runCloudFallbackAndFinish();
        }
      }, 900);

      utterance.onstart = () => {
        if (isFallingBackToCloud || isCompleted) return;
        hasStarted = true;
        const startLatencyMs = Math.round(performance.now() - speakInvokeTimestamp);

        if (latencyFallbackTimer) {
          clearTimeout(latencyFallbackTimer);
          latencyFallbackTimer = null;
        }

        // 記錄統計 (不彈出干擾學習的橘色警告橫幅)
        latencyHistory.push(Math.min(startLatencyMs, 800));
        if (latencyHistory.length > 50) latencyHistory.shift();

        if (earlyStartWatchdog) {
          clearTimeout(earlyStartWatchdog);
          earlyStartWatchdog = null;
        }

        startSpeechKeepAlive();
        this.currentProgress = 5;
        this.currentStartTime = Date.now();
        this.notifyListeners();

        // 啟動流暢動態進度與剩餘秒數倒數模擬插值器
        const startTime = this.currentStartTime;
        if (this.progressAnimTimer) clearInterval(this.progressAnimTimer);
        this.progressAnimTimer = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const estimatedPercent = Math.min(95, Math.max(5, Math.round((elapsed / estimatedDurationMs) * 100)));
          const remainMs = Math.max(0, estimatedDurationMs - elapsed);
          const remainSec = Math.round((remainMs / 1000) * 10) / 10;
          
          let changed = false;
          if (estimatedPercent > this.currentProgress) {
            this.currentProgress = estimatedPercent;
            changed = true;
          }
          if (remainSec !== this.currentRemainingSeconds) {
            this.currentRemainingSeconds = remainSec;
            changed = true;
          }
          if (changed) {
            this.notifyListeners();
          }
        }, 80);

        if (task.onStart) {
          try {
            task.onStart();
          } catch {}
        }
      };

      utterance.onboundary = (e: SpeechSynthesisEvent) => {
        if (isFallingBackToCloud || isCompleted) return;
        if (typeof e.charIndex === 'number' && task.text.length > 0) {
          this.currentCharIndex = e.charIndex;
          const boundaryPercent = Math.min(98, Math.round((e.charIndex / task.text.length) * 100));
          const remainRatio = Math.max(0, 1 - (e.charIndex / task.text.length));
          const remainSec = Math.round((totalSecs * remainRatio) * 10) / 10;

          let changed = false;
          if (boundaryPercent > this.currentProgress) {
            this.currentProgress = boundaryPercent;
            changed = true;
          }
          if (remainSec < this.currentRemainingSeconds) {
            this.currentRemainingSeconds = remainSec;
            changed = true;
          }
          if (changed) {
            this.notifyListeners();
          }
        }
      };

      utterance.onend = () => {
        if (isFallingBackToCloud || isCompleted) return;
        if (task.onEnd) {
          try {
            task.onEnd();
          } catch {}
        }
        finish();
      };

      utterance.onerror = (e) => {
        if (isFallingBackToCloud || isCompleted) return;
        if (e.error === 'canceled' || e.error === 'interrupted') {
          if (task.onEnd) {
            try {
              task.onEnd();
            } catch {}
          }
          finish();
          return;
        }

        // 若原生語音報錯 (如 synthesis-failed / audio-busy / network)，無縫轉由雲端語音流完成朗讀
        isFallingBackToCloud = true;
        runCloudFallbackAndFinish();
      };

      // 總長度安全看門狗 (Full-Duration Watchdog)
      const dynamicWatchdogMs = Math.max(4000, Math.min(20000, estimatedDurationMs * 1.6 + 1500));
      fullDurationWatchdog = setTimeout(() => {
        if (!isCompleted) {
          if (task.onEnd) {
            try {
              task.onEnd();
            } catch {}
          }
          finish();
        }
      }, dynamicWatchdogMs);

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        isFallingBackToCloud = true;
        runCloudFallbackAndFinish();
      }
    });
  }

  private sleep(ms: number, isCancelled?: () => boolean): Promise<void> {
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
  bufferAfterMs: number = 150
): Promise<void> {
  return globalAudioScheduler.enqueue(
    text,
    lang,
    rate,
    bufferAfterMs,
    undefined,
    customPitch,
    undefined,
    onEnd
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
      const ctx = getSharedAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
  }
}

/**
 * 主動解鎖瀏覽器 Web Audio 與 Web Speech API (手機觸控即時解鎖，共用單一 AudioContext 避免硬體數量上限洩漏)
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

    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {}
}

/**
 * 手機專屬語音通道深度喚醒（觸摸時解鎖 AudioContext 與恢復語音引擎）
 */
let hasMobileSpeechBeenPrimed = false;
export function primeMobileSpeechEngine(): void {
  if (typeof window === 'undefined') return;
  if (hasMobileSpeechBeenPrimed) return;

  try {
    unlockAudioContext();
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    hasMobileSpeechBeenPrimed = true;
  } catch (e) {
    console.warn("Mobile speech priming note:", e);
  }
}

// 監聽用戶觸控手勢，立即深度解鎖手機音訊與語音通道
if (typeof window !== 'undefined') {
  const handleFirstUserGesture = () => {
    primeMobileSpeechEngine();
    unlockAudioContext();
  };

  window.addEventListener('click', handleFirstUserGesture, { passive: true, once: true });
  window.addEventListener('touchstart', handleFirstUserGesture, { passive: true, once: true });
  window.addEventListener('pointerdown', handleFirstUserGesture, { passive: true, once: true });

  // 監聽手機螢幕鎖定喚醒與頁面切換回訪 (VisibilityChange / Focus / PageShow)
  const handlePageWakeUp = () => {
    if (document.visibilityState === 'visible') {
      unlockAudioContext();
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
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (!mobileSilentBufferSource) {
      const buffer = ctx.createBuffer(1, 22050, 22050);
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
  
  if (isMobileDevice()) {
    startMobileAudioHardwareKeepAlive();
  }

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
 * 播放美式英語（預設 interrupt = true，點擊即刻發音零排隊等待）
 */
export function speakEnglish(
  rawText: string,
  rate: number = 0.95,
  onEnd?: () => void,
  customPitch?: number,
  bufferAfterMs: number = 100,
  interrupt: boolean = true
): void {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  unlockAudioContext();

  if (interrupt) {
    globalAudioScheduler.clear();
  }

  // 預加載快取
  prefetchSpeechText(rawText, 'en-US', rate, customPitch).catch(() => {});

  // 透過連續播放佇列排程播放
  globalAudioScheduler.enqueue(
    rawText,
    'en-US',
    rate,
    bufferAfterMs,
    undefined,
    customPitch,
    undefined,
    onEnd
  );
}

/**
 * 播放台灣中文（預設 interrupt = true，點擊即刻發音零排隊等待）
 */
export function speakChinese(
  rawText: string,
  rate: number = 0.95,
  onEnd?: () => void,
  customPitch?: number,
  bufferAfterMs: number = 100,
  interrupt: boolean = true
): void {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  unlockAudioContext();

  if (interrupt) {
    globalAudioScheduler.clear();
  }

  // 預加載與快取中文語句
  prefetchSpeechText(rawText, 'zh-TW', rate, customPitch).catch(() => {});

  // 透過連續播放佇列排程播放
  globalAudioScheduler.enqueue(
    rawText,
    'zh-TW',
    rate,
    bufferAfterMs,
    undefined,
    customPitch,
    undefined,
    onEnd
  );
}

/**
 * 單字極速發音（專為點擊單字翻譯設計，非阻塞、高清晰度即時發音）
 */
export function speakSingleEnglishWord(
  rawWord: string,
  rate: number = 0.88,
  onEnd?: () => void,
  customPitch?: number
): void {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  const cleanWord = rawWord.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').trim();
  if (!cleanWord) {
    if (onEnd) onEnd();
    return;
  }

  unlockAudioContext();
  // 快速播放單字，中斷先前語句以提供即時點擊回饋
  globalAudioScheduler.clear();

  // 單字發音附加微句點，確保爆破音與尾音（如 -t, -p, -k）完整吐字不被引擎提早截斷
  const wordToSpeak = cleanWord.endsWith('.') ? cleanWord : `${cleanWord}.`;

  globalAudioScheduler.enqueue(
    wordToSpeak,
    'en-US',
    rate,
    80,
    undefined,
    customPitch,
    undefined,
    onEnd
  );
}

/**
 * 慢速精準微音節發音模式 (0.72x Slow Clarity Mode)
 * 針對晶圓廠複雜專有名詞、尾音連音與弱化子音進行精準拆解發音
 */
export function speakSlowClarityEnglish(
  rawText: string,
  onEnd?: () => void,
  customPitch?: number
): void {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  unlockAudioContext();
  globalAudioScheduler.clear();

  // 以 0.72x 慢速與高精準度發音，拉開語句間距至 200ms
  globalAudioScheduler.enqueue(
    rawText,
    'en-US',
    0.72,
    200,
    undefined,
    customPitch || 1.0,
    undefined,
    onEnd
  );
}

/**
 * ⚡ 強化發音 (Enhanced Pronunciation Mode)
 */
export function speakEnhancedPronunciation(
  rawText: string,
  speed: number = 0.78,
  onEnd?: () => void,
  customPitch: number = 1.05
): void {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  unlockAudioContext();
  globalAudioScheduler.clear();

  const enhancedText = preprocessEnhancedPronunciationText(rawText);

  globalAudioScheduler.enqueue(
    enhancedText,
    'en-US',
    speed,
    180,
    undefined,
    customPitch,
    undefined,
    onEnd
  );
}

/**
 * 單字音節拆解發音 (Syllable Breakdown Pronunciation)
 */
export function speakSyllableBreakdown(
  rawWordOrSyllables: string,
  onEnd?: () => void
): void {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
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

  globalAudioScheduler.enqueue(
    textToSpeak,
    'en-US',
    0.72,
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
  onEnd?: () => void
): void {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  unlockAudioContext();
  globalAudioScheduler.clear();

  // 1. 先播放道地台灣國語釋義
  if (chineseExplanation) {
    globalAudioScheduler.enqueue(
      chineseExplanation,
      'zh-TW',
      0.95,
      220,
      undefined,
      1.0,
      undefined,
      () => {}
    );
  }

  // 2. 再播放晶圓廠實戰英語
  globalAudioScheduler.enqueue(
    englishText,
    'en-US',
    rate,
    150,
    undefined,
    undefined,
    undefined,
    onEnd
  );
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

  let isSpeaking = false;
  let isPaused = false;
  let isPending = false;

  if (isWebSpeech) {
    isSpeaking = window.speechSynthesis.speaking;
    isPaused = window.speechSynthesis.paused;
    isPending = window.speechSynthesis.pending;
  }

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
    loudnessBoostMode: getPreferredLoudnessBoost()
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

