/**
 * Auto Speech Speed Calibration Analyzer (自動語速校正分析儀)
 *
 * 支援 10 秒定時朗讀錄音，結合「Web Speech 語音辨識目標語句比對」與
 * 「Web Audio 麥克風能量包絡／音節節奏／無塵室底噪 dB 估測」，
 * 即時計算使用者的平均語速 (WPM)、詞彙比對準確率、停頓流暢度與背景噪音等級，
 * 推算出具體的「晶圓廠環境適配語速」數值，並產出可直接優化全域 TTS 的完整合成參數組合。
 */

import { ensureSharedAudioContextRunning } from './audioEffects';
import type { EqualizerProfileId, LoudnessBoostMode, SpeechStylePreset } from './speech';

export const CALIBRATION_RECORDING_DURATION_MS = 10000;

export interface CalibrationPrompt {
  id: string;
  label: string;
  text: string;
  translation: string;
  wordCount: number;
  syllableCount: number;
}

export const CALIBRATION_PROMPTS: CalibrationPrompt[] = [
  {
    id: 'cal-vacuum',
    label: '早班腔體交接（10 秒標準句）',
    text: 'Please check the chamber vacuum pressure and verify the gas flow before starting the morning wafer lot.',
    translation: '請在開始早班晶圓批次前確認腔體真空壓力並核對氣體流量。',
    wordCount: 17,
    syllableCount: 26,
  },
  {
    id: 'cal-mfc',
    label: '設備安全連鎖（10 秒實戰句）',
    text: 'I inspected the mass flow controller, cleared the minor pressure alarm, and confirmed the safety interlock status.',
    translation: '我已檢查質量流量控制器、排除輕微壓力警報並確認安全連鎖狀態。',
    wordCount: 17,
    syllableCount: 31,
  },
  {
    id: 'cal-robot',
    label: '傳片手臂作業（10 秒連貫句）',
    text: 'The transfer robot moved the wafer carrier smoothly to load port one without any alignment sensor warning.',
    translation: '傳片機械手臂已平順將晶圓載具移至一號載入埠，且無任何對位感測器警示。',
    wordCount: 17,
    syllableCount: 28,
  },
  {
    id: 'cal-pm-handover',
    label: 'PM 復機回報（10 秒無塵室句）',
    text: 'Preventive maintenance on chamber B is complete, leak check passed cleanly, and tool recovery is ready now.',
    translation: 'B 腔體預防性保養已完成，測漏檢查順利通過，機台現已就緒準備復機。',
    wordCount: 17,
    syllableCount: 29,
  },
];

export type FluencyLevel = 'foundational' | 'developing' | 'steady' | 'fluent';
export type FabEnvironmentTier = 'quiet_office' | 'standard_cleanroom' | 'noisy_fab_bay';
export type CalibrationCompletionReason = 'ten_second_timeout' | 'target_completed' | 'manual_stop';

export interface OptimizedGlobalSynthesisParams {
  speechSpeed: number; // 0.70 .. 1.20 (晶圓廠環境適配語速)
  pitch: number; // 0.96 .. 1.08
  speechStyle: SpeechStylePreset;
  loudnessBoost: LoudnessBoostMode;
  equalizerProfile: EqualizerProfileId;
  rationale: string;
}

export interface CalibrationSnapshot {
  elapsedMs: number;
  maxDurationMs: number;
  remainingMs: number;
  liveWpm: number;
  transcript: string;
  matchedWordCount: number;
  totalTargetWords: number;
  liveMatchAccuracy: number; // 0..100
  inputLevel: number; // 0..100
  ambientNoiseDb: number; // 36..86 dB (SPL-equivalent estimate)
  fabEnvironmentTier: FabEnvironmentTier;
  fabEnvironmentLabel: string;
  frequencyBars: number[]; // 16 bars, 10..100
  pauseCount: number;
  mode: 'speech_and_audio' | 'speech_only' | 'audio_cadence' | 'manual_timer';
}

export interface CalibrationResult {
  measuredWpm: number;
  syllablesPerSec: number;
  speakingDurationSec: number;
  recordedDurationSec: number;
  wordAccuracy: number; // 0..100
  pauseCount: number;
  pauseRatio: number; // 0..100
  fluencyScore: number; // 0..100
  fluencyLevel: FluencyLevel;
  fluencyLabel: string;
  recommendedSpeed: number; // 0.70 .. 1.20 (個人基礎最佳語速)
  fabAdaptedSpeed: number; // 0.70 .. 1.20 (晶圓廠環境適配語速)
  fabSpeedAdjustment: number; // e.g. 0, -0.05, -0.10
  ambientNoiseDb: number; // 36..86 dB
  fabEnvironmentTier: FabEnvironmentTier;
  fabEnvironmentLabel: string;
  optimizedSynthesisParams: OptimizedGlobalSynthesisParams;
  completionReason: CalibrationCompletionReason;
  recommendationSummary: string;
  transcript: string;
  mode: 'speech_and_audio' | 'speech_only' | 'audio_cadence' | 'manual_timer';
}

export const GLOBAL_SPEECH_SPEED_STORAGE_KEY = 'fse_global_speech_speed';

export function getStoredGlobalSpeechSpeed(fallback: number = 0.85): number {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(GLOBAL_SPEECH_SPEED_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed >= 0.65 && parsed <= 1.25) {
      return Number(parsed.toFixed(2));
    }
  } catch {}
  return fallback;
}

export function saveGlobalSpeechSpeed(speed: number): number {
  const clamped = Math.max(0.65, Math.min(1.25, Number(speed.toFixed(2))));
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(GLOBAL_SPEECH_SPEED_STORAGE_KEY, clamped.toFixed(2));
    } catch {}
  }
  return clamped;
}

/**
 * 將麥克風底噪 RMS 換算為相對聲壓分貝 (36 ~ 86 dB)
 */
export function estimateAmbientDbFromRms(rms: number): number {
  const safeRms = Math.max(0.0012, Math.min(0.6, rms));
  const db = 94 + 20 * Math.log10(safeRms);
  return Math.round(Math.max(36, Math.min(86, db)));
}

/**
 * 依據背景底噪分貝判定所處晶圓廠聲學環境分級
 */
export function classifyFabEnvironment(ambientNoiseDb: number): {
  tier: FabEnvironmentTier;
  label: string;
  shortLabel: string;
} {
  if (ambientNoiseDb >= 66) {
    return {
      tier: 'noisy_fab_bay',
      label: '高噪機台區 (FFU / Dry Pump)',
      shortLabel: '高噪機台區',
    };
  }
  if (ambientNoiseDb >= 52) {
    return {
      tier: 'standard_cleanroom',
      label: '標準無塵室 (Class 100–1000)',
      shortLabel: '標準無塵室',
    };
  }
  return {
    tier: 'quiet_office',
    label: '靜音辦公 / 訓練室',
    shortLabel: '靜音辦公區',
  };
}

/**
 * 從 10 秒採樣序列取第 20 百分位 RMS 作為穩健的背景底噪估值（避免人聲波峰干擾）
 */
export function computeNoiseFloorRms(samples: number[]): number | null {
  if (!samples || samples.length < 4) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * 0.2)));
  return sorted[idx];
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter(Boolean);
}

/**
 * 估算英文單字音節數（支援常見晶圓廠英文詞彙）
 */
export function estimateEnglishSyllables(text: string): number {
  const words = normalizeWords(text);
  if (words.length === 0) return 0;

  let total = 0;
  for (const raw of words) {
    if (/^\d+$/.test(raw)) {
      total += Math.max(1, raw.length);
      continue;
    }
    const word = raw.replace(/[^a-z]/g, '');
    if (!word) continue;
    if (word.length <= 3) {
      total += 1;
      continue;
    }
    const stripped = word
      .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
      .replace(/^y/, '');
    const vowelGroups = stripped.match(/[aeiouy]{1,2}/g);
    total += Math.max(1, vowelGroups ? vowelGroups.length : 1);
  }
  return total;
}

/**
 * 計算使用者朗讀詞彙與目標校正句的順序匹配率 (LCS / Target Length)
 */
export function computeWordMatchStats(
  transcript: string,
  targetText: string
): { matchedCount: number; totalTarget: number; accuracy: number; spokenCount: number; matchedIndices: Set<number> } {
  const targetWords = normalizeWords(targetText);
  const spokenWords = normalizeWords(transcript);
  if (targetWords.length === 0) {
    return { matchedCount: 0, totalTarget: 0, accuracy: 0, spokenCount: spokenWords.length, matchedIndices: new Set() };
  }
  if (spokenWords.length === 0) {
    return { matchedCount: 0, totalTarget: targetWords.length, accuracy: 0, spokenCount: 0, matchedIndices: new Set() };
  }

  // 逐詞比對（允許輕微字尾差異如複數 -s / -ed 以避免辨識器誤差誤扣分）
  const isLooseWordMatch = (a: string, b: string): boolean => {
    if (a === b) return true;
    if (a.length >= 4 && b.length >= 4) {
      if (a.startsWith(b.slice(0, -1)) || b.startsWith(a.slice(0, -1))) return true;
    }
    return false;
  };

  const matchedIndices = new Set<number>();
  let searchFrom = 0;
  for (let tIdx = 0; tIdx < targetWords.length; tIdx++) {
    const targetWord = targetWords[tIdx];
    for (let sIdx = searchFrom; sIdx < spokenWords.length; sIdx++) {
      if (isLooseWordMatch(spokenWords[sIdx], targetWord)) {
        matchedIndices.add(tIdx);
        searchFrom = sIdx + 1;
        break;
      }
    }
  }

  // 補掃未順序命中但出現在辨識文本中的關鍵詞（權重 0.85）
  let extraHits = 0;
  const spokenSet = new Set(spokenWords);
  targetWords.forEach((tw, idx) => {
    if (!matchedIndices.has(idx)) {
      for (const sw of spokenSet) {
        if (isLooseWordMatch(sw, tw)) {
          matchedIndices.add(idx);
          extraHits += 0.85;
          break;
        }
      }
    }
  });

  const orderedCount = matchedIndices.size - Math.round(extraHits / 0.85);
  const effectiveMatches = Math.min(targetWords.length, orderedCount + extraHits);
  const accuracy = Math.max(0, Math.min(1, effectiveMatches / targetWords.length));

  return {
    matchedCount: matchedIndices.size,
    totalTarget: targetWords.length,
    accuracy,
    spokenCount: spokenWords.length,
    matchedIndices,
  };
}

/**
 * 依據 10 秒朗讀語速 (WPM)、目標語句比對準確率、停頓流暢度與背景底噪 dB，
 * 推算「晶圓廠環境適配語速」與全域語音合成最佳化參數組。
 */
export function computeCalibrationResult(params: {
  prompt: CalibrationPrompt;
  transcript: string;
  activeSpeakingMs: number;
  recordedDurationMs?: number;
  pauseCount: number;
  pauseDurationMs: number;
  acousticSyllablePeaks: number;
  ambientNoiseDb?: number;
  completionReason?: CalibrationCompletionReason;
  mode: CalibrationResult['mode'];
}): CalibrationResult {
  const {
    prompt,
    transcript,
    activeSpeakingMs,
    recordedDurationMs,
    pauseCount,
    pauseDurationMs,
    acousticSyllablePeaks,
    ambientNoiseDb = 58,
    completionReason = 'manual_stop',
    mode,
  } = params;

  const safeDurationSec = Math.max(1.4, Math.min(35, activeSpeakingMs / 1000));
  const safeRecordedSec = Number(
    Math.max(1.0, Math.min(35, (recordedDurationMs ?? activeSpeakingMs) / 1000)).toFixed(1)
  );
  const clampedAmbientDb = Math.round(Math.max(36, Math.min(86, ambientNoiseDb)));
  const fabEnv = classifyFabEnvironment(clampedAmbientDb);

  const matchStats = computeWordMatchStats(transcript, prompt.text);
  const hasUsableTranscript = matchStats.spokenCount >= 3;

  // 1. 決定有效朗讀字數與音節數
  let effectiveWords: number;
  let effectiveSyllables: number;
  let wordAccuracyRatio: number;

  if (mode === 'manual_timer') {
    effectiveWords = prompt.wordCount;
    effectiveSyllables = prompt.syllableCount;
    wordAccuracyRatio = 0.88;
  } else if (hasUsableTranscript) {
    const blendedWords = Math.max(matchStats.spokenCount, Math.round(matchStats.matchedCount * 1.05));
    effectiveWords = Math.max(3, Math.min(prompt.wordCount + 8, blendedWords));
    effectiveSyllables = Math.max(
      effectiveWords,
      estimateEnglishSyllables(transcript) || Math.round((effectiveWords / prompt.wordCount) * prompt.syllableCount)
    );
    wordAccuracyRatio = matchStats.accuracy;
  } else if (acousticSyllablePeaks >= 3) {
    effectiveSyllables = Math.max(4, Math.min(prompt.syllableCount + 10, acousticSyllablePeaks));
    effectiveWords = Math.max(3, Math.round(effectiveSyllables / 1.58));
    wordAccuracyRatio = Math.min(0.9, Math.max(0.62, effectiveSyllables / Math.max(1, prompt.syllableCount)));
  } else {
    effectiveWords = prompt.wordCount;
    effectiveSyllables = prompt.syllableCount;
    wordAccuracyRatio = 0.72;
  }

  const rawWpm = (effectiveWords / safeDurationSec) * 60;
  const measuredWpm = Math.round(Math.max(48, Math.min(215, rawWpm)));
  const syllablesPerSec = Number(Math.max(1.1, Math.min(6.5, effectiveSyllables / safeDurationSec)).toFixed(1));

  // 2. 停頓比例計算
  const pauseRatioRaw = Math.max(0, Math.min(0.75, pauseDurationMs / Math.max(1000, activeSpeakingMs)));

  // 3. 綜合流暢度評分 (0 ~ 100)
  let paceScoreNorm = 1;
  if (measuredWpm < 115) {
    paceScoreNorm = Math.max(0.2, (measuredWpm - 45) / 70);
  } else if (measuredWpm > 175) {
    paceScoreNorm = Math.max(0.65, 1 - (measuredWpm - 175) / 110);
  }
  const pacePoints = paceScoreNorm * 40;

  const continuityNorm = Math.max(0.15, Math.min(1, 1 - pauseRatioRaw * 1.25 - pauseCount * 0.075));
  const continuityPoints = continuityNorm * 35;

  const accuracyPoints = Math.max(0.25, Math.min(1, wordAccuracyRatio)) * 25;

  const fluencyScore = Math.round(Math.max(25, Math.min(100, pacePoints + continuityPoints + accuracyPoints)));
  const wordAccuracyPct = Math.round(wordAccuracyRatio * 100);

  // 4. 推算個人基礎最佳語速 (0.70x ~ 1.20x，以 0.05 為刻度)
  let fluencyLevel: FluencyLevel;
  let fluencyLabel: string;
  let rawRecommended: number;

  const basePaceRatio = measuredWpm / 148;

  if (fluencyScore < 52 || measuredWpm < 82) {
    fluencyLevel = 'foundational';
    fluencyLabel = '慢速精聽打底';
    rawRecommended = Math.max(0.7, Math.min(0.8, 0.68 + basePaceRatio * 0.22));
  } else if (fluencyScore < 72 || measuredWpm < 112) {
    fluencyLevel = 'developing';
    fluencyLabel = '穩步建立語感';
    rawRecommended = Math.max(0.8, Math.min(0.92, basePaceRatio * 1.04));
  } else if (fluencyScore < 86 || measuredWpm < 148) {
    fluencyLevel = 'steady';
    fluencyLabel = '穩健流暢進階';
    rawRecommended = Math.max(0.9, Math.min(1.05, basePaceRatio * 1.02));
  } else {
    fluencyLevel = 'fluent';
    fluencyLabel = '高速熟練實戰';
    rawRecommended = Math.max(1.0, Math.min(1.2, basePaceRatio));
  }

  const recommendedSpeed = Math.max(0.7, Math.min(1.2, Number((Math.round(rawRecommended * 20) / 20).toFixed(2))));

  // 5. 計算「晶圓廠環境適配語速」 (依據背景底噪分級 + 目標語句準確率進行聲學補償)
  let fabSpeedPenalty = 0;
  if (fabEnv.tier === 'noisy_fab_bay') {
    // 高噪機台區：FFU 與乾式幫浦會遮蔽子音，自動降速 0.05x ~ 0.10x 確保指令辨識度
    fabSpeedPenalty = wordAccuracyPct < 78 || fluencyScore < 68 ? -0.1 : -0.05;
  } else if (fabEnv.tier === 'standard_cleanroom') {
    // 標準無塵室：若基礎語速偏快或語句比對 < 82%，小幅降速 0.05x 保留清晰字尾咬字
    if ((recommendedSpeed >= 1.0 && fluencyScore < 84) || wordAccuracyPct < 80) {
      fabSpeedPenalty = -0.05;
    }
  }

  const rawFabAdapted = recommendedSpeed + fabSpeedPenalty;
  const fabAdaptedSpeed = Math.max(
    0.7,
    Math.min(1.2, Number((Math.round(rawFabAdapted * 20) / 20).toFixed(2)))
  );
  const actualAdjustment = Number((fabAdaptedSpeed - recommendedSpeed).toFixed(2));

  // 6. 推導完整全域語音合成最佳化參數組 (語速 + 音調 + 風格 + 響度增益 + 聲學等化器)
  let pitch = 1.0;
  let loudnessBoost: LoudnessBoostMode = 'standard';
  let equalizerProfile: EqualizerProfileId = 'studio_fidelity';
  let speechStyle: SpeechStylePreset = 'natural';

  if (fabEnv.tier === 'noisy_fab_bay') {
    pitch = 1.04;
    loudnessBoost = 'boost_max';
    equalizerProfile = 'cleanroom_penetration';
    speechStyle = fabAdaptedSpeed <= 0.8 ? 'slow_clarity' : 'cleanroom';
  } else if (fabEnv.tier === 'standard_cleanroom') {
    pitch = 1.02;
    loudnessBoost = 'loud';
    equalizerProfile = wordAccuracyPct < 80 ? 'pronunciation_enhancer' : 'mask_compensation';
    speechStyle = fluencyLevel === 'foundational' || fabAdaptedSpeed <= 0.8 ? 'slow_clarity' : 'cleanroom';
  } else {
    pitch = 1.0;
    loudnessBoost = 'standard';
    equalizerProfile =
      fluencyLevel === 'foundational' || wordAccuracyPct < 82
        ? 'pronunciation_enhancer'
        : 'studio_fidelity';
    speechStyle =
      fluencyLevel === 'foundational'
        ? 'slow_clarity'
        : fluencyLevel === 'developing'
        ? 'cleanroom'
        : 'natural';
  }

  const eqLabelMap: Record<EqualizerProfileId, string> = {
    cleanroom_penetration: '無塵室穿透 EQ',
    mask_compensation: '口罩防悶清晰 EQ',
    commute_boost: '通勤人聲增強 EQ',
    studio_fidelity: '錄音室原音 EQ',
    pronunciation_enhancer: '發音咬字強化 EQ',
  };

  const adjustmentNote =
    actualAdjustment < 0
      ? `（針對 ${clampedAmbientDb} dB ${fabEnv.shortLabel}底噪補償 ${actualAdjustment.toFixed(2)}x）`
      : `（符合 ${clampedAmbientDb} dB ${fabEnv.shortLabel}聲學條件）`;

  const rationale = `10 秒朗讀比對完成：實測 ${measuredWpm} WPM、語句比對 ${wordAccuracyPct}%、流暢度 ${fluencyScore} 分。系統建議「晶圓廠環境適配語速」為 ${fabAdaptedSpeed.toFixed(
    2
  )}x${adjustmentNote}，並同步優化全域音調 ${pitch.toFixed(2)}x 與 ${eqLabelMap[equalizerProfile]}。`;

  const optimizedSynthesisParams: OptimizedGlobalSynthesisParams = {
    speechSpeed: fabAdaptedSpeed,
    pitch,
    speechStyle,
    loudnessBoost,
    equalizerProfile,
    rationale,
  };

  return {
    measuredWpm,
    syllablesPerSec,
    speakingDurationSec: Number(safeDurationSec.toFixed(1)),
    recordedDurationSec: safeRecordedSec,
    wordAccuracy: wordAccuracyPct,
    pauseCount,
    pauseRatio: Math.round(pauseRatioRaw * 100),
    fluencyScore,
    fluencyLevel,
    fluencyLabel,
    recommendedSpeed,
    fabAdaptedSpeed,
    fabSpeedAdjustment: actualAdjustment,
    ambientNoiseDb: clampedAmbientDb,
    fabEnvironmentTier: fabEnv.tier,
    fabEnvironmentLabel: fabEnv.label,
    optimizedSynthesisParams,
    completionReason,
    recommendationSummary: rationale,
    transcript: transcript.trim(),
    mode,
  };
}

export interface SpeechSpeedCalibrationSession {
  stopAndAnalyze: () => CalibrationResult;
  cancel: () => void;
}

/**
 * 啟動 10 秒自動語速校正分析儀工作階段（Web Speech 目標語句比對 + Web Audio 聲學節奏與無塵室底噪偵測）
 */
export async function startSpeechSpeedCalibrationSession(options: {
  prompt: CalibrationPrompt;
  manualTimerOnly?: boolean;
  maxDurationMs?: number;
  onSnapshot: (snapshot: CalibrationSnapshot) => void;
  onAutoComplete?: (result: CalibrationResult) => void;
  onNotice?: (message: string) => void;
}): Promise<SpeechSpeedCalibrationSession> {
  const {
    prompt,
    manualTimerOnly = false,
    maxDurationMs = CALIBRATION_RECORDING_DURATION_MS,
    onSnapshot,
    onAutoComplete,
    onNotice,
  } = options;

  let isClosed = false;
  const sessionStartTs = Date.now();
  let firstSpeechTs: number | null = null;
  let lastSpeechTs: number | null = null;

  let finalTranscript = '';
  let interimTranscript = '';
  let lastWordArrivalTs: number | null = null;
  let speechPauseCount = 0;
  let speechPauseDurationMs = 0;

  let audioPauseCount = 0;
  let audioPauseDurationMs = 0;
  let acousticSyllablePeaks = 0;
  let wasVoiced = false;
  let silenceStartedTs: number | null = null;
  let lastPeakTs = 0;
  let currentLevel = 0;
  let currentBars = Array.from({ length: 16 }, () => 10);
  const rmsHistory: number[] = [];
  let currentAmbientDb = 58; // 預設標準無塵室基準，若取得麥克風則以即時聲學量測覆蓋

  let recognition: any = null;
  let mediaStream: MediaStream | null = null;
  let micSource: MediaStreamAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let timeDomainData: Float32Array | null = null;
  let freqData: Uint8Array | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let autoCompleteTimer: ReturnType<typeof setTimeout> | null = null;
  let maxDurationTimer: ReturnType<typeof setTimeout> | null = null;

  let hasSpeechApi = false;
  let hasAudioAnalyser = false;

  const getCombinedTranscript = () => `${finalTranscript} ${interimTranscript}`.replace(/\s+/g, ' ').trim();

  const resolveMode = (): CalibrationResult['mode'] => {
    if (manualTimerOnly) return 'manual_timer';
    if (hasSpeechApi && hasAudioAnalyser) return 'speech_and_audio';
    if (hasSpeechApi) return 'speech_only';
    if (hasAudioAnalyser) return 'audio_cadence';
    return 'manual_timer';
  };

  const cleanupResources = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (autoCompleteTimer) {
      clearTimeout(autoCompleteTimer);
      autoCompleteTimer = null;
    }
    if (maxDurationTimer) {
      clearTimeout(maxDurationTimer);
      maxDurationTimer = null;
    }
    if (recognition) {
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();
      } catch {}
      recognition = null;
    }
    if (micSource) {
      try {
        micSource.disconnect();
      } catch {}
      micSource = null;
    }
    if (analyser) {
      try {
        analyser.disconnect();
      } catch {}
      analyser = null;
    }
    if (mediaStream) {
      try {
        mediaStream.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaStream = null;
    }
  };

  const buildFinalResult = (completionReason: CalibrationCompletionReason): CalibrationResult => {
    const now = Date.now();
    const transcript = getCombinedTranscript();
    const mode = resolveMode();
    const recordedDurationMs = Math.min(maxDurationMs, Math.max(1000, now - sessionStartTs));

    let activeSpeakingMs: number;
    if (mode === 'manual_timer') {
      activeSpeakingMs = Math.max(1500, recordedDurationMs);
    } else if (firstSpeechTs && lastSpeechTs && lastSpeechTs > firstSpeechTs + 450) {
      activeSpeakingMs = Math.min(recordedDurationMs, lastSpeechTs - firstSpeechTs + 350);
    } else if (firstSpeechTs) {
      activeSpeakingMs = Math.max(1400, Math.min(recordedDurationMs, now - firstSpeechTs));
    } else {
      activeSpeakingMs = Math.max(1800, recordedDurationMs);
    }

    const combinedPauseCount = hasAudioAnalyser ? Math.max(audioPauseCount, speechPauseCount) : speechPauseCount;
    const combinedPauseDurationMs = hasAudioAnalyser
      ? Math.max(audioPauseDurationMs, speechPauseDurationMs)
      : speechPauseDurationMs;

    const floorRms = computeNoiseFloorRms(rmsHistory);
    const finalAmbientDb = floorRms !== null ? estimateAmbientDbFromRms(floorRms) : currentAmbientDb;

    return computeCalibrationResult({
      prompt,
      transcript,
      activeSpeakingMs,
      recordedDurationMs,
      pauseCount: combinedPauseCount,
      pauseDurationMs: combinedPauseDurationMs,
      acousticSyllablePeaks,
      ambientNoiseDb: finalAmbientDb,
      completionReason,
      mode,
    });
  };

  const finalizeSession = (reason: CalibrationCompletionReason) => {
    if (isClosed) return;
    const res = buildFinalResult(reason);
    isClosed = true;
    cleanupResources();
    if (onAutoComplete) {
      onAutoComplete(res);
    }
  };

  if (!manualTimerOnly && typeof window !== 'undefined') {
    // 1. 開啟麥克風 Web Audio Analyser（量測即時頻譜、音節節奏與真實無塵室底噪 dB）
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        const ctx = await ensureSharedAudioContextRunning(650);
        if (ctx && !isClosed && mediaStream) {
          micSource = ctx.createMediaStreamSource(mediaStream);
          analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.65;
          micSource.connect(analyser);
          timeDomainData = new Float32Array(analyser.fftSize);
          freqData = new Uint8Array(analyser.frequencyBinCount);
          hasAudioAnalyser = true;
        }
      } catch {
        // 使用者未授權麥克風或裝置無麥克風：降級使用語音辨識或 10 秒計時測速
      }
    }

    // 2. 啟動瀏覽器 Web Speech Recognition 即時連續辨識以比對目標語句
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass && !isClosed) {
      try {
        recognition = new SpeechRecognitionClass();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          if (isClosed) return;
          const now = Date.now();
          let nextFinal = '';
          let nextInterim = '';

          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            const piece = res?.[0]?.transcript || '';
            if (res.isFinal) {
              nextFinal += `${piece} `;
            } else {
              nextInterim += `${piece} `;
            }
          }

          const prevWordCount = normalizeWords(getCombinedTranscript()).length;
          finalTranscript = nextFinal.trim();
          interimTranscript = nextInterim.trim();
          const newCombined = getCombinedTranscript();
          const nextWordCount = normalizeWords(newCombined).length;

          if (nextWordCount > 0) {
            if (firstSpeechTs === null) {
              firstSpeechTs = now;
            }
            if (nextWordCount > prevWordCount) {
              if (lastWordArrivalTs !== null) {
                const gap = now - lastWordArrivalTs;
                if (gap > 750 && gap < 6000) {
                  speechPauseCount++;
                  speechPauseDurationMs += gap - 350;
                }
              }
              lastWordArrivalTs = now;
              lastSpeechTs = now;
            }

            // 若在 10 秒內已完整念完目標句（比對 >= 88% 且字數達標），在 1.5 秒自然收尾停頓後自動結算
            const matchStats = computeWordMatchStats(newCombined, prompt.text);
            if (matchStats.accuracy >= 0.88 && matchStats.spokenCount >= Math.max(5, prompt.wordCount - 2)) {
              if (autoCompleteTimer) clearTimeout(autoCompleteTimer);
              autoCompleteTimer = setTimeout(() => {
                finalizeSession('target_completed');
              }, 1500);
            }
          }
        };

        recognition.onerror = (event: any) => {
          if (isClosed) return;
          const errCode = event?.error || '';
          if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
            hasSpeechApi = false;
            if (!hasAudioAnalyser && onNotice) {
              onNotice('未取得麥克風權限，您可直接改用「無麥克風 10 秒計時測速」完成語速校正。');
            }
          }
        };

        recognition.onend = () => {
          if (!isClosed && recognition) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
        hasSpeechApi = true;
      } catch {
        hasSpeechApi = false;
      }
    }

    if (!hasSpeechApi && !hasAudioAnalyser && onNotice) {
      onNotice('目前瀏覽器無法存取麥克風或語音辨識，已自動切換為「10 秒計時朗讀模式」，請照常朗讀至倒數結束或點擊提前完成。');
    }
  }

  // 3. 嚴格 10 秒定時錄音自動結束分析計時器
  if (!isClosed && maxDurationMs > 0) {
    maxDurationTimer = setTimeout(() => {
      finalizeSession('ten_second_timeout');
    }, maxDurationMs);
  }

  // 4. 65ms 即時聲學採樣、無塵室底噪追蹤與 10 秒倒數快照推送
  pollTimer = setInterval(() => {
    if (isClosed) return;
    const now = Date.now();
    const elapsedMs = Math.min(maxDurationMs, now - sessionStartTs);
    const remainingMs = Math.max(0, maxDurationMs - elapsedMs);

    if (analyser && timeDomainData && freqData) {
      analyser.getFloatTimeDomainData(timeDomainData);
      analyser.getByteFrequencyData(freqData);

      let sumSq = 0;
      for (let i = 0; i < timeDomainData.length; i++) {
        sumSq += timeDomainData[i] * timeDomainData[i];
      }
      const rms = Math.sqrt(sumSq / timeDomainData.length);
      rmsHistory.push(rms);
      if (rmsHistory.length > 220) {
        rmsHistory.shift();
      }

      const rollingFloor = computeNoiseFloorRms(rmsHistory);
      if (rollingFloor !== null) {
        currentAmbientDb = estimateAmbientDbFromRms(rollingFloor);
      }

      currentLevel = Math.min(100, Math.round(rms * 520));

      const bars: number[] = [];
      const usableBins = Math.min(48, freqData.length);
      const step = Math.max(1, Math.floor(usableBins / 16));
      for (let b = 0; b < 16; b++) {
        const val = freqData[Math.min(freqData.length - 1, b * step)] || 0;
        bars.push(Math.max(10, Math.min(100, Math.round((val / 255) * 100))));
      }
      currentBars = bars;

      // 自適應底噪門檻 VAD（在高噪無塵室中不將風機底噪誤判為語音）
      const adaptiveThreshold = Math.max(0.022, (rollingFloor ?? 0.008) * 2.15);
      const isCurrentlyVoiced = rms > adaptiveThreshold;
      if (isCurrentlyVoiced) {
        if (firstSpeechTs === null) {
          firstSpeechTs = now;
        }
        lastSpeechTs = now;

        if ((!wasVoiced || rms > adaptiveThreshold * 1.85) && now - lastPeakTs > 145) {
          acousticSyllablePeaks++;
          lastPeakTs = now;
        }

        if (silenceStartedTs !== null) {
          const silenceDur = now - silenceStartedTs;
          if (silenceDur >= 650 && silenceDur < 8000) {
            audioPauseCount++;
            audioPauseDurationMs += silenceDur - 300;
          }
          silenceStartedTs = null;
        }
        wasVoiced = true;
      } else {
        if (wasVoiced && firstSpeechTs !== null && silenceStartedTs === null) {
          silenceStartedTs = now;
        }
        wasVoiced = false;
      }
    } else if (manualTimerOnly) {
      const phase = elapsedMs / 180;
      currentLevel = 35;
      currentBars = Array.from({ length: 16 }, (_, idx) =>
        Math.round(22 + Math.abs(Math.sin(phase + idx * 0.45)) * 48)
      );
    }

    const transcript = getCombinedTranscript();
    const matchStats = computeWordMatchStats(transcript, prompt.text);
    const activeElapsedMs = firstSpeechTs ? Math.max(500, now - firstSpeechTs) : Math.max(500, elapsedMs);
    let liveWpm = 0;
    if (matchStats.spokenCount >= 2 && firstSpeechTs) {
      liveWpm = Math.round(Math.min(220, (matchStats.spokenCount / (activeElapsedMs / 1000)) * 60));
    } else if (acousticSyllablePeaks >= 2 && firstSpeechTs) {
      liveWpm = Math.round(Math.min(220, ((acousticSyllablePeaks / 1.58) / (activeElapsedMs / 1000)) * 60));
    }

    const fabEnv = classifyFabEnvironment(currentAmbientDb);

    onSnapshot({
      elapsedMs,
      maxDurationMs,
      remainingMs,
      liveWpm,
      transcript,
      matchedWordCount: matchStats.matchedCount,
      totalTargetWords: prompt.wordCount,
      liveMatchAccuracy: Math.round(matchStats.accuracy * 100),
      inputLevel: currentLevel,
      ambientNoiseDb: currentAmbientDb,
      fabEnvironmentTier: fabEnv.tier,
      fabEnvironmentLabel: fabEnv.shortLabel,
      frequencyBars: currentBars,
      pauseCount: hasAudioAnalyser ? Math.max(audioPauseCount, speechPauseCount) : speechPauseCount,
      mode: resolveMode(),
    });
  }, 65);

  return {
    stopAndAnalyze: () => {
      const result = buildFinalResult('manual_stop');
      isClosed = true;
      cleanupResources();
      return result;
    },
    cancel: () => {
      isClosed = true;
      cleanupResources();
    },
  };
}
