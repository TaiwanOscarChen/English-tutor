/**
 * Cleanroom Background Noise Suppression DSP Engine (無塵室背景降噪引擎)
 *
 * 透過多段 Web Audio DSP 濾波器與硬體麥克風約束，濾除無塵室常見的：
 * 1. FFU 風扇 / 空調層流低頻轟鳴與 60Hz/120Hz 電源諧波 (High-Pass + 120Hz Notch)
 * 2. 乾式真空泵、渦輪分子泵與搬送機台高頻尖銳噪音 (6.2kHz Notch + Low-Pass)
 * 3. 人聲母音與子音清晰度強化 (1.85kHz Presence Boost + Dynamics Compressor)
 * 4. 動態語音活動軟閘門 (Adaptive Voice-Band Soft Noise Gate)
 *
 * 並提供多候選語音辨識濾噪比對 (selectBestCleanroomTranscript)，
 * 在嘈雜無塵室環境中大幅降低背景噪音引發的辨識誤判。
 */

export type CleanroomNoiseLevel = 'standard' | 'max';

export interface CleanroomNoiseConfig {
  enabled: boolean;
  level: CleanroomNoiseLevel;
}

export interface CleanroomFilterSpec {
  highpassHz: number;
  lowpassHz: number;
  notchLowHz: number;
  notchHighHz: number;
  presenceHz: number;
  presenceGainDb: number;
  gateFloorGain: number;
  gateThresholdRatio: number;
  label: string;
  shortDesc: string;
}

export const CLEANROOM_FILTER_SPECS: Record<CleanroomNoiseLevel, CleanroomFilterSpec> = {
  standard: {
    highpassHz: 135,
    lowpassHz: 4200,
    notchLowHz: 120,
    notchHighHz: 6200,
    presenceHz: 1850,
    presenceGainDb: 3.5,
    gateFloorGain: 0.32,
    gateThresholdRatio: 1.35,
    label: '標準無塵室',
    shortDesc: '濾除 FFU 風扇低頻 (<135Hz) 與機台高頻 (>4.2kHz)',
  },
  max: {
    highpassHz: 190,
    lowpassHz: 3500,
    notchLowHz: 120,
    notchHighHz: 5800,
    presenceHz: 2050,
    presenceGainDb: 4.8,
    gateFloorGain: 0.14,
    gateThresholdRatio: 1.55,
    label: '強效機台降噪',
    shortDesc: '深度抑制風扇轟鳴 (<190Hz)、高頻尖嘯 (>3.5kHz) 並啟用動態降噪閘門',
  },
};

const STORAGE_KEY = 'fse_cleanroom_noise_suppression_v1';

export function getStoredNoiseSuppressionConfig(): CleanroomNoiseConfig {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { enabled: true, level: 'standard' };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { enabled: true, level: 'standard' };
    }
    const parsed = JSON.parse(raw);
    const enabled = typeof parsed?.enabled === 'boolean' ? parsed.enabled : true;
    const level: CleanroomNoiseLevel = parsed?.level === 'max' ? 'max' : 'standard';
    return { enabled, level };
  } catch {
    return { enabled: true, level: 'standard' };
  }
}

export function saveNoiseSuppressionConfig(config: CleanroomNoiseConfig): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

/**
 * 依據降噪模式產生最佳化的 getUserMedia 音訊約束參數
 */
export function buildMicAudioConstraints(
  enabled: boolean,
  _level: CleanroomNoiseLevel = 'standard'
): MediaStreamConstraints {
  if (!enabled) {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: true,
      },
    };
  }

  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
  };
}

export interface CleanroomDenoiseMetrics {
  spectrumBars: number[]; // 12 bars, 15..100
  attenuationDb: number; // 0..24 dB estimated out-of-band noise attenuation
  isVoiceActive: boolean;
  /** 降噪後原始 FFT 頻譜資料，供即時發音準確率計量條比對目標句頻譜 */
  freqData: Uint8Array;
  /** AudioContext 取樣率 (Hz) */
  sampleRate: number;
}

export interface CleanroomDenoisePipeline {
  /** 經過多段濾波與動態壓縮降噪後的純淨音訊串流（供 MediaRecorder 錄製） */
  processedStream: MediaStream;
  /** 取得當下即時頻譜與降噪幅度量測（同時驅動動態軟降噪閘門） */
  sampleMetrics: () => CleanroomDenoiseMetrics;
  /** 取得本次錄音期間的平均噪音抑制幅度 (dB) */
  getAverageAttenuationDb: () => number;
  /** 即時切換濾波等級（不中斷錄音） */
  updateLevel: (level: CleanroomNoiseLevel) => void;
  /** 徹底釋放所有 Web Audio 節點、AudioContext 與目的地音軌 */
  destroy: () => void;
}

/**
 * 建立即時無塵室背景降噪 DSP 處理管線：
 * Raw Mic -> High-Pass (風扇低頻) -> 120Hz Notch (馬達電源諧波) ->
 * 6.2kHz Notch (真空泵尖嘯) -> Low-Pass (機台高頻嘶聲) ->
 * 1.85kHz Presence Boost (人聲咬字) -> DynamicsCompressor ->
 * Adaptive Soft Noise Gate -> MediaStreamDestination (供錄音與回放)
 */
export function createCleanroomDenoisePipeline(
  rawStream: MediaStream,
  initialLevel: CleanroomNoiseLevel = 'standard'
): CleanroomDenoisePipeline | null {
  if (typeof window === 'undefined') return null;

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  let audioCtx: AudioContext | null = null;
  try {
    audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    let currentSpec = CLEANROOM_FILTER_SPECS[initialLevel];

    const source = audioCtx.createMediaStreamSource(rawStream);

    // Pre-filter analyser (量測原始環境風扇低頻與機台高頻噪音能量)
    const rawAnalyser = audioCtx.createAnalyser();
    rawAnalyser.fftSize = 256;
    rawAnalyser.smoothingTimeConstant = 0.72;
    source.connect(rawAnalyser);

    // Stage 1: Sub-bass / FFU Fan Rumble High-Pass Filter
    const highpass = audioCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = currentSpec.highpassHz;
    highpass.Q.value = 0.85;

    // Stage 2: 120Hz AC / Blower Harmonic Notch Filter
    const notchLow = audioCtx.createBiquadFilter();
    notchLow.type = 'notch';
    notchLow.frequency.value = currentSpec.notchLowHz;
    notchLow.Q.value = 4.5;

    // Stage 3: High-frequency Equipment / Turbo-Pump Whine Notch Filter
    const notchHigh = audioCtx.createBiquadFilter();
    notchHigh.type = 'notch';
    notchHigh.frequency.value = currentSpec.notchHighHz;
    notchHigh.Q.value = 2.6;

    // Stage 4: High-frequency Machine Hiss Low-Pass Filter
    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = currentSpec.lowpassHz;
    lowpass.Q.value = 0.78;

    // Stage 5: Vocal Intelligibility Presence Boost (English consonant clarity)
    const presence = audioCtx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = currentSpec.presenceHz;
    presence.Q.value = 1.05;
    presence.gain.value = currentSpec.presenceGainDb;

    // Stage 6: Dynamics Compressor (stabilize voice level & tame transient machine clanks)
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.18;

    // Stage 7: Adaptive Soft Noise Gate (attenuates steady fan hiss during inter-word pauses)
    const gateGain = audioCtx.createGain();
    gateGain.gain.value = 1.0;

    // Post-filter analyser (驅動介面頻譜與降噪幅度對比)
    const cleanAnalyser = audioCtx.createAnalyser();
    cleanAnalyser.fftSize = 256;
    cleanAnalyser.smoothingTimeConstant = 0.72;

    // Output stream destination for MediaRecorder
    const destination = audioCtx.createMediaStreamDestination();

    // Wire DSP graph
    source.connect(highpass);
    highpass.connect(notchLow);
    notchLow.connect(notchHigh);
    notchHigh.connect(lowpass);
    lowpass.connect(presence);
    presence.connect(compressor);
    compressor.connect(gateGain);
    gateGain.connect(cleanAnalyser);
    gateGain.connect(destination);

    const binCount = cleanAnalyser.frequencyBinCount;
    const rawFreqData = new Uint8Array(new ArrayBuffer(binCount));
    const cleanFreqData = new Uint8Array(new ArrayBuffer(binCount));

    const nyquist = (audioCtx.sampleRate || 48000) / 2;
    const hzPerBin = nyquist / binCount;

    const binForHz = (hz: number) => Math.max(0, Math.min(binCount - 1, Math.round(hz / hzPerBin)));

    // 語音主要頻帶 (280 Hz ~ 3400 Hz) 與常見無塵室噪聲頻帶 (<180 Hz 風扇 + >4000 Hz 機台高頻)
    const voiceStartBin = binForHz(280);
    const voiceEndBin = binForHz(3400);
    const fanEndBin = Math.max(1, binForHz(180));
    const whineStartBin = binForHz(4000);

    let adaptiveNoiseFloor = 14;
    let smoothedAttenuationDb = initialLevel === 'max' ? 11.5 : 8.2;
    let attenuationSum = 0;
    let attenuationSamples = 0;
    let destroyed = false;

    const sampleMetrics = (): CleanroomDenoiseMetrics => {
      if (destroyed || !audioCtx) {
        return {
          spectrumBars: Array.from({ length: 12 }, () => 15),
          attenuationDb: Math.round(smoothedAttenuationDb),
          isVoiceActive: false,
          freqData: cleanFreqData,
          sampleRate: 48000,
        };
      }

      rawAnalyser.getByteFrequencyData(rawFreqData);
      cleanAnalyser.getByteFrequencyData(cleanFreqData);

      // 1. 計算語音頻帶平均能量（供動態降噪閘門判定人聲活動）
      let voiceSum = 0;
      let voiceBins = 0;
      for (let i = voiceStartBin; i <= voiceEndBin; i++) {
        voiceSum += rawFreqData[i];
        voiceBins++;
      }
      const voiceAvg = voiceBins > 0 ? voiceSum / voiceBins : 0;

      // 追蹤環境底噪基準線（緩慢跟隨低能量背景聲，不被人聲拉高）
      if (voiceAvg < adaptiveNoiseFloor * 1.25) {
        adaptiveNoiseFloor = adaptiveNoiseFloor * 0.94 + voiceAvg * 0.06;
      } else {
        adaptiveNoiseFloor = adaptiveNoiseFloor * 0.996 + voiceAvg * 0.004;
      }
      adaptiveNoiseFloor = Math.max(6, Math.min(48, adaptiveNoiseFloor));

      const isVoiceActive = voiceAvg > adaptiveNoiseFloor * currentSpec.gateThresholdRatio + 6;
      const targetGateGain = isVoiceActive ? 1.0 : currentSpec.gateFloorGain;
      const timeConst = isVoiceActive ? 0.015 : 0.095;
      try {
        gateGain.gain.setTargetAtTime(targetGateGain, audioCtx.currentTime, timeConst);
      } catch {}

      // 2. 計算帶外噪音（風扇低頻 + 機台高頻）濾波前後衰減幅度 (dB)
      let rawNoiseEnergy = 0;
      let cleanNoiseEnergy = 0;
      let noiseBins = 0;

      for (let i = 0; i <= fanEndBin; i++) {
        rawNoiseEnergy += rawFreqData[i] * rawFreqData[i];
        cleanNoiseEnergy += cleanFreqData[i] * cleanFreqData[i];
        noiseBins++;
      }
      for (let i = whineStartBin; i < binCount; i++) {
        rawNoiseEnergy += rawFreqData[i] * rawFreqData[i];
        cleanNoiseEnergy += cleanFreqData[i] * cleanFreqData[i];
        noiseBins++;
      }

      if (noiseBins > 0 && rawNoiseEnergy > 16) {
        const ratio = (rawNoiseEnergy + 1) / (cleanNoiseEnergy + 1);
        const instantDb = Math.max(3, Math.min(24, 10 * Math.log10(ratio)));
        smoothedAttenuationDb = smoothedAttenuationDb * 0.85 + instantDb * 0.15;
        attenuationSum += smoothedAttenuationDb;
        attenuationSamples++;
      }

      // 3. 產生 12 條聚焦人聲頻段 (200Hz ~ 3800Hz) 的乾淨頻譜柱
      const barSpan = Math.max(12, voiceEndBin - Math.max(1, voiceStartBin - 1));
      const step = Math.max(1, Math.floor(barSpan / 12));
      const spectrumBars = Array.from({ length: 12 }, (_, idx) => {
        const binIdx = Math.min(binCount - 1, Math.max(1, voiceStartBin - 1) + idx * step);
        const val = cleanFreqData[binIdx] || 0;
        return Math.max(15, Math.min(100, Math.round((val / 255) * 108)));
      });

      return {
        spectrumBars,
        attenuationDb: Math.round(smoothedAttenuationDb),
        isVoiceActive,
        freqData: cleanFreqData,
        sampleRate: audioCtx.sampleRate || 48000,
      };
    };

    const updateLevel = (nextLevel: CleanroomNoiseLevel) => {
      if (destroyed || !audioCtx) return;
      currentSpec = CLEANROOM_FILTER_SPECS[nextLevel];
      const now = audioCtx.currentTime;
      try {
        highpass.frequency.setTargetAtTime(currentSpec.highpassHz, now, 0.03);
        notchHigh.frequency.setTargetAtTime(currentSpec.notchHighHz, now, 0.03);
        lowpass.frequency.setTargetAtTime(currentSpec.lowpassHz, now, 0.03);
        presence.frequency.setTargetAtTime(currentSpec.presenceHz, now, 0.03);
        presence.gain.setTargetAtTime(currentSpec.presenceGainDb, now, 0.03);
      } catch {}
    };

    const getAverageAttenuationDb = () => {
      if (attenuationSamples === 0) {
        return Math.round(smoothedAttenuationDb);
      }
      return Math.max(4, Math.min(24, Math.round(attenuationSum / attenuationSamples)));
    };

    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      try {
        source.disconnect();
        rawAnalyser.disconnect();
        highpass.disconnect();
        notchLow.disconnect();
        notchHigh.disconnect();
        lowpass.disconnect();
        presence.disconnect();
        compressor.disconnect();
        gateGain.disconnect();
        cleanAnalyser.disconnect();
      } catch {}
      try {
        destination.stream.getTracks().forEach((t) => t.stop());
      } catch {}
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
      audioCtx = null;
    };

    return {
      processedStream: destination.stream,
      sampleMetrics,
      getAverageAttenuationDb,
      updateLevel,
      destroy,
    };
  } catch (err) {
    console.warn('Cleanroom DSP denoise pipeline initialization failed:', err);
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
    return null;
  }
}

/**
 * 降噪多候選辨識優化器：
 * 當 SpeechRecognition 在背景噪音環境回傳多個候選轉錄 (maxAlternatives > 1) 時，
 * 排除風扇/機台噪音造成的短暫雜訊誤判，選出與目標練習句音素/詞彙最吻合的候選結果。
 */
export function selectBestCleanroomTranscript(
  alternatives: Array<{ transcript: string; confidence?: number }>,
  targetSentence: string
): string {
  if (!alternatives || alternatives.length === 0) return '';
  if (alternatives.length === 1) return (alternatives[0]?.transcript || '').trim();

  const targetWords = targetSentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (targetWords.length === 0) {
    return (alternatives[0]?.transcript || '').trim();
  }

  let bestTranscript = (alternatives[0]?.transcript || '').trim();
  let bestScore = -1;

  for (let idx = 0; idx < alternatives.length; idx++) {
    const candidate = (alternatives[idx]?.transcript || '').trim();
    if (!candidate) continue;

    const spokenWords = candidate
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    if (spokenWords.length === 0) continue;

    let matches = 0;
    for (const tw of targetWords) {
      const hit = spokenWords.some(
        (sw) =>
          sw === tw ||
          (tw.length >= 4 && sw.length >= 4 && (sw.startsWith(tw.slice(0, -1)) || tw.startsWith(sw.slice(0, -1))))
      );
      if (hit) matches++;
    }

    const matchRatio = matches / targetWords.length;
    const confidenceBonus =
      typeof alternatives[idx]?.confidence === 'number' && Number.isFinite(alternatives[idx].confidence)
        ? alternatives[idx].confidence * 0.15
        : idx === 0
        ? 0.08
        : 0;
    // 懲罰明顯過長（夾雜環境噪音亂字）的候選
    const noiseSpillPenalty = Math.max(0, spokenWords.length - targetWords.length - 3) * 0.04;
    const totalScore = matchRatio + confidenceBonus - noiseSpillPenalty;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestTranscript = candidate;
    }
  }

  return bestTranscript;
}
