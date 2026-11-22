/**
 * Real-Time Pronunciation Spectrum Similarity Engine (即時發音頻譜相似度分析引擎)
 *
 * 利用 Web Audio API 即時分析使用者麥克風收音的 12 段人聲共振峰頻譜 (150Hz ~ 5000Hz)，
 * 與目標句子的參考頻譜（優先自本地快取標準範讀音檔萃取真實頻譜，離線無快取時即時建立英語音素共振峰模型）
 * 進行即時餘弦相似度、頻譜重心與母音／子音能量比對，驅動「即時發音準確率計量條」。
 */

export interface SpeechFormantBand {
  minHz: number;
  maxHz: number;
  centerHz: number;
  label: string;
}

export const SPEECH_FORMANT_BANDS: ReadonlyArray<SpeechFormantBand> = [
  { minHz: 150, maxHz: 280, centerHz: 215, label: '基頻' },
  { minHz: 280, maxHz: 420, centerHz: 350, label: '低共振' },
  { minHz: 420, maxHz: 600, centerHz: 510, label: 'F1a' },
  { minHz: 600, maxHz: 820, centerHz: 710, label: 'F1b' },
  { minHz: 820, maxHz: 1080, centerHz: 950, label: 'F1-F2' },
  { minHz: 1080, maxHz: 1400, centerHz: 1240, label: 'F2a' },
  { minHz: 1400, maxHz: 1800, centerHz: 1600, label: 'F2b' },
  { minHz: 1800, maxHz: 2250, centerHz: 2025, label: 'F2c' },
  { minHz: 2250, maxHz: 2800, centerHz: 2525, label: 'F3a' },
  { minHz: 2800, maxHz: 3450, centerHz: 3125, label: 'F3b' },
  { minHz: 3450, maxHz: 4150, centerHz: 3800, label: '子音' },
  { minHz: 4150, maxHz: 5000, centerHz: 4575, label: '氣音' },
];

export type TargetSpectrumSource = 'tts-audio' | 'phoneme-model';

export interface TargetSpectrumProfile {
  sentence: string;
  source: TargetSpectrumSource;
  /** 整體目標句歸一化 12 段參考頻譜向量 (L2 norm = 1) */
  globalVector: number[];
  /** 依序排列的音節／分段 12 段頻譜模板，供即時滑動視窗對齊比對 */
  segmentVectors: number[][];
  /** 供視覺化顯示用的目標句頻譜輪廓 (18..95) */
  displayBars: number[];
  /** 目標句期望頻譜重心 (0..11 band index) */
  expectedCentroid: number;
  /** 目標句高頻子音／低頻母音能量比 */
  expectedHighLowRatio: number;
}

export type SimilarityTier = 'waiting' | 'low' | 'aligning' | 'high' | 'excellent';

export interface RealtimeSimilaritySnapshot {
  /** 即時發音相似度 (0..100) */
  similarity: number;
  /** 本次錄音最高相似度 (0..100) */
  peakSimilarity: number;
  /** 本次錄音有效發聲平均相似度 (0..100) */
  avgSimilarity: number;
  /** 使用者即時 12 段人聲頻譜柱高度 (15..100) */
  userBars: number[];
  /** 目標句 12 段參考頻譜輪廓高度 (18..95) */
  targetBars: number[];
  /** 當前是否偵測到清晰人聲發音 */
  isVoiceDetected: boolean;
  /** 相似度等級 */
  tier: SimilarityTier;
  /** 簡潔即時中文回饋 */
  feedbackLabel: string;
  /** 參考頻譜來源 */
  referenceSource: TargetSpectrumSource;
}

function l2Normalize(vec: number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm <= 1e-8) {
    return vec.map(() => 1 / Math.sqrt(vec.length));
  }
  return vec.map((v) => v / norm);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA * normB);
  if (denom <= 1e-8) return 0;
  return Math.max(0, Math.min(1, dot / denom));
}

function computeCentroid(vec: number[]): number {
  let weightedSum = 0;
  let total = 0;
  for (let i = 0; i < vec.length; i++) {
    weightedSum += i * vec[i];
    total += vec[i];
  }
  return total > 1e-8 ? weightedSum / total : 4.5;
}

function computeHighLowRatio(vec: number[]): number {
  let low = 0;
  let high = 0;
  for (let i = 0; i < 6; i++) low += vec[i] || 0;
  for (let i = 6; i < 12; i++) high += vec[i] || 0;
  return high / Math.max(0.05, low);
}

function vectorToDisplayBars(vec: number[]): number[] {
  const maxVal = Math.max(0.001, ...vec);
  return vec.map((v) => Math.max(18, Math.min(95, Math.round(18 + (v / maxVal) * 77))));
}

/**
 * 依據英語字詞的母音共振峰 (F1/F2/F3) 與子音摩擦音特徵，估算單字 12 段頻譜向量
 */
function synthesizeWordSpectrumVector(rawWord: string): number[] {
  const word = rawWord.toLowerCase().replace(/[^a-z0-9]/g, '');
  // 基礎美語人聲自然頻譜斜率 (12 bands)
  const bands = [0.42, 0.56, 0.62, 0.58, 0.48, 0.44, 0.38, 0.32, 0.26, 0.22, 0.16, 0.12];

  if (!word) return l2Normalize(bands);

  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const next = word[i + 1] || '';
    const pair = ch + next;

    // 雙字母高頻摩擦音 / 破擦音
    if (pair === 'sh' || pair === 'ch' || pair === 'th' || pair === 'ph') {
      bands[8] += 0.24;
      bands[9] += 0.32;
      bands[10] += 0.38;
      bands[11] += 0.32;
    }

    // 前母音 (高 F2: 1400~2400Hz)
    if (ch === 'i' || ch === 'e' || ch === 'y') {
      bands[0] += 0.16;
      bands[1] += 0.2;
      bands[6] += 0.28;
      bands[7] += 0.3;
      bands[8] += 0.18;
    }
    // 開口／後母音 (強 F1: 420~1080Hz)
    else if (ch === 'a' || ch === 'o') {
      bands[1] += 0.18;
      bands[2] += 0.32;
      bands[3] += 0.34;
      bands[4] += 0.28;
      bands[5] += 0.2;
    }
    // 圓唇後母音 (低 F1/F2: 280~900Hz)
    else if (ch === 'u') {
      bands[0] += 0.24;
      bands[1] += 0.34;
      bands[2] += 0.26;
      bands[3] += 0.18;
    }
    // 鼻音與流音 (低頻共振強 + F3 過渡)
    else if (ch === 'm' || ch === 'n' || ch === 'l' || ch === 'r' || ch === 'w') {
      bands[0] += 0.22;
      bands[1] += 0.24;
      bands[4] += 0.16;
      bands[5] += 0.18;
      bands[8] += 0.14;
    }
    // 齒齦摩擦音 / 噝音 (強高頻能量 2800~5000Hz)
    else if (ch === 's' || ch === 'z' || ch === 'x' || ch === 'f' || ch === 'v') {
      bands[9] += 0.28;
      bands[10] += 0.4;
      bands[11] += 0.36;
    }
    // 爆破塞音 (中頻至中高頻瞬態 1400~3400Hz)
    else if (ch === 't' || ch === 'd' || ch === 'k' || ch === 'g' || ch === 'p' || ch === 'b' || ch === 'c') {
      bands[5] += 0.16;
      bands[7] += 0.22;
      bands[8] += 0.24;
      bands[9] += 0.18;
    }
  }

  return l2Normalize(bands);
}

/**
 * 即時建立目標句子的音素共振峰參考頻譜模型（0ms 延遲、100% 離線可用）
 */
export function buildTargetSentenceSpectrumProfile(sentence: string): TargetSpectrumProfile {
  const words = sentence
    .replace(/[-/]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);

  const segmentVectors =
    words.length > 0
      ? words.map((w) => synthesizeWordSpectrumVector(w))
      : [synthesizeWordSpectrumVector('check chamber vacuum pressure')];

  const accum = new Array<number>(12).fill(0);
  for (const seg of segmentVectors) {
    for (let i = 0; i < 12; i++) {
      accum[i] += seg[i];
    }
  }
  const globalVector = l2Normalize(accum);

  return {
    sentence,
    source: 'phoneme-model',
    globalVector,
    segmentVectors,
    displayBars: vectorToDisplayBars(globalVector),
    expectedCentroid: computeCentroid(globalVector),
    expectedHighLowRatio: computeHighLowRatio(globalVector),
  };
}

/**
 * 單頻 Goertzel 能量偵測（用於從解碼後的標準範讀音檔極速萃取真實頻段能量）
 */
function goertzelMagnitude(samples: Float32Array, start: number, length: number, targetHz: number, sampleRate: number): number {
  const k = Math.round((length * targetHz) / sampleRate);
  if (k <= 0 || k >= length / 2) return 0;
  const omega = (2 * Math.PI * k) / length;
  const coeff = 2 * Math.cos(omega);
  let q0 = 0;
  let q1 = 0;
  let q2 = 0;

  for (let i = 0; i < length; i++) {
    // Hann window 避免頻譜洩漏
    const win = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (length - 1)));
    q0 = coeff * q1 - q2 + samples[start + i] * win;
    q2 = q1;
    q1 = q0;
  }

  const power = Math.max(0, q1 * q1 + q2 * q2 - q1 * q2 * coeff);
  return Math.sqrt(power) / length;
}

/**
 * 從本地快取的標準範讀音訊 Blob 解碼並萃取真實 12 段參考頻譜（若解碼失敗則自動回退至音素模型）
 */
export async function extractTargetSpectrumFromAudioBlob(
  sentence: string,
  audioBlob: Blob
): Promise<TargetSpectrumProfile | null> {
  if (typeof window === 'undefined' || !audioBlob || audioBlob.size < 128) return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  let tempCtx: AudioContext | null = null;
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    tempCtx = new AudioCtx();
    const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    const frameSize = Math.min(1024, Math.max(256, Math.round(sampleRate * 0.032)));
    const hopSize = Math.max(128, Math.round(frameSize * 1.5));
    const maxFrames = 72;
    const totalPossibleFrames = Math.max(1, Math.floor((channelData.length - frameSize) / hopSize));
    const stride = Math.max(1, Math.ceil(totalPossibleFrames / maxFrames));

    const activeFrames: number[][] = [];

    for (let f = 0; f < totalPossibleFrames; f += stride) {
      const start = f * hopSize;
      if (start + frameSize > channelData.length) break;

      let rmsSq = 0;
      for (let i = 0; i < frameSize; i++) {
        const s = channelData[start + i];
        rmsSq += s * s;
      }
      const rms = Math.sqrt(rmsSq / frameSize);
      if (rms < 0.015) continue; // 略過靜音段

      const bandVec = SPEECH_FORMANT_BANDS.map((band) => {
        const lowProbe = goertzelMagnitude(channelData, start, frameSize, band.minHz + (band.maxHz - band.minHz) * 0.33, sampleRate);
        const highProbe = goertzelMagnitude(channelData, start, frameSize, band.minHz + (band.maxHz - band.minHz) * 0.67, sampleRate);
        // 對數壓縮對齊 AnalyserNode dB 感知特性
        return Math.log1p((lowProbe + highProbe) * 180);
      });
      activeFrames.push(l2Normalize(bandVec));
    }

    if (activeFrames.length < 3) return null;

    // 聚合成 8~16 個時序區段向量
    const targetSegCount = Math.min(16, Math.max(6, Math.round(activeFrames.length / 2)));
    const segmentVectors: number[][] = [];
    for (let s = 0; s < targetSegCount; s++) {
      const from = Math.floor((s * activeFrames.length) / targetSegCount);
      const to = Math.max(from + 1, Math.floor(((s + 1) * activeFrames.length) / targetSegCount));
      const avg = new Array<number>(12).fill(0);
      for (let idx = from; idx < to; idx++) {
        for (let b = 0; b < 12; b++) {
          avg[b] += activeFrames[idx][b];
        }
      }
      segmentVectors.push(l2Normalize(avg));
    }

    const globalAccum = new Array<number>(12).fill(0);
    for (const seg of segmentVectors) {
      for (let b = 0; b < 12; b++) globalAccum[b] += seg[b];
    }
    const globalVector = l2Normalize(globalAccum);

    return {
      sentence,
      source: 'tts-audio',
      globalVector,
      segmentVectors,
      displayBars: vectorToDisplayBars(globalVector),
      expectedCentroid: computeCentroid(globalVector),
      expectedHighLowRatio: computeHighLowRatio(globalVector),
    };
  } catch {
    return null;
  } finally {
    if (tempCtx && tempCtx.state !== 'closed') {
      tempCtx.close().catch(() => {});
    }
  }
}

/**
 * 將 Web Audio AnalyserNode 的原始 FFT 頻譜 (0..255) 映射至 12 段人聲共振峰向量
 */
export function extractLive12BandSpectrum(
  freqData: Uint8Array,
  sampleRate: number
): { rawBands: number[]; normalizedVector: number[]; voiceEnergy: number; displayBars: number[] } {
  const binCount = freqData.length;
  const nyquist = (sampleRate || 48000) / 2;
  const hzPerBin = nyquist / Math.max(1, binCount);

  const rawBands = SPEECH_FORMANT_BANDS.map((band) => {
    const startBin = Math.max(1, Math.floor(band.minHz / hzPerBin));
    const endBin = Math.min(binCount - 1, Math.max(startBin, Math.ceil(band.maxHz / hzPerBin)));
    let sum = 0;
    let count = 0;
    for (let b = startBin; b <= endBin; b++) {
      sum += freqData[b] || 0;
      count++;
    }
    return count > 0 ? sum / count : 0;
  });

  // 人聲核心頻帶能量 (280Hz ~ 3450Hz, bands 1..9)
  let energySum = 0;
  for (let i = 1; i <= 9; i++) {
    energySum += rawBands[i];
  }
  const voiceEnergy = energySum / 9;

  const displayBars = rawBands.map((v) => Math.max(15, Math.min(100, Math.round((v / 255) * 112))));
  const normalizedVector = l2Normalize(rawBands.map((v) => Math.max(0, v - 4)));

  return {
    rawBands,
    normalizedVector,
    voiceEnergy,
    displayBars,
  };
}

/**
 * 即時頻譜相似度追蹤器：
 * 在錄音期間逐幀對比使用者麥克風即時頻譜與目標句子參考頻譜，
 * 同時計算動態語音活動、頻譜起伏（排除靜態風扇底噪）與滑動時序對齊相似度。
 */
export class RealtimeSpectrumMatcher {
  private profile: TargetSpectrumProfile;
  private noiseFloor = 12;
  private smoothedSimilarity = 0;
  private peakSimilarity = 0;
  private voicedSimilaritySum = 0;
  private voicedFrameCount = 0;
  private prevNormVec: number[] | null = null;
  private smoothedFlux = 0;
  private segmentCursor = 0;
  private accumUserBands = new Array<number>(12).fill(0);
  private lastTranscriptBoost = 0;

  constructor(profile: TargetSpectrumProfile) {
    this.profile = profile;
  }

  public updateTargetProfile(profile: TargetSpectrumProfile): void {
    this.profile = profile;
  }

  /**
   * 可選：注入即時語音辨識詞彙命中率 (0..1) 進行微幅融合校準（離線無辨識時為 0，仍 100% 依靠頻譜分析運作）
   */
  public setLiveTranscriptMatchRatio(ratio: number): void {
    if (Number.isFinite(ratio)) {
      this.lastTranscriptBoost = Math.max(0, Math.min(1, ratio));
    }
  }

  /**
   * 輸入一幀 Web Audio AnalyserNode 頻譜資料，回傳即時發音相似度快照
   */
  public pushFrequencyFrame(freqData: Uint8Array, sampleRate: number): RealtimeSimilaritySnapshot {
    const { rawBands, normalizedVector, voiceEnergy, displayBars } = extractLive12BandSpectrum(freqData, sampleRate);

    // 追蹤環境底噪基準線
    if (voiceEnergy < this.noiseFloor * 1.25) {
      this.noiseFloor = this.noiseFloor * 0.92 + voiceEnergy * 0.08;
    } else {
      this.noiseFloor = this.noiseFloor * 0.995 + voiceEnergy * 0.005;
    }
    this.noiseFloor = Math.max(6, Math.min(42, this.noiseFloor));

    // 計算幀間頻譜動態變化 (Spectral Flux)：真實說話有明顯音節調變，恆定風扇噪音 Flux 極低
    let flux = 0;
    if (this.prevNormVec) {
      for (let i = 0; i < 12; i++) {
        flux += Math.abs(normalizedVector[i] - this.prevNormVec[i]);
      }
    }
    this.prevNormVec = normalizedVector;
    this.smoothedFlux = this.smoothedFlux * 0.78 + flux * 0.22;

    const isVoiceDetected = voiceEnergy > Math.max(16, this.noiseFloor * 1.38 + 5);

    let feedbackLabel = '請對著麥克風清晰朗讀...';
    let tier: SimilarityTier = 'waiting';

    if (isVoiceDetected) {
      this.voicedFrameCount++;
      for (let i = 0; i < 12; i++) {
        this.accumUserBands[i] += rawBands[i];
      }

      // 1. 滑動時序分段對齊（在當前進度前後視窗尋找最佳共振峰匹配）
      const segs = this.profile.segmentVectors;
      const winStart = Math.max(0, Math.floor(this.segmentCursor) - 1);
      const winEnd = Math.min(segs.length - 1, Math.floor(this.segmentCursor) + 3);
      let bestSegSim = 0;
      let bestSegIdx = winStart;

      for (let s = winStart; s <= winEnd; s++) {
        const sim = cosineSimilarity(normalizedVector, segs[s]);
        if (sim > bestSegSim) {
          bestSegSim = sim;
          bestSegIdx = s;
        }
      }
      if (bestSegIdx > this.segmentCursor) {
        this.segmentCursor = Math.min(segs.length - 1, this.segmentCursor + 0.14);
      }

      // 2. 累積整體頻譜餘弦相似度
      const accumNorm = l2Normalize(this.accumUserBands);
      const globalSim = cosineSimilarity(accumNorm, this.profile.globalVector);

      // 3. 頻譜重心與母音／子音比例對齊度
      const liveCentroid = computeCentroid(normalizedVector);
      const centroidAlign = Math.max(0, 1 - Math.abs(liveCentroid - this.profile.expectedCentroid) / 5.5);

      const liveRatio = computeHighLowRatio(normalizedVector);
      const ratioAlign = Math.max(
        0,
        1 - Math.abs(Math.log1p(liveRatio) - Math.log1p(this.profile.expectedHighLowRatio)) / 1.4
      );

      // 4. 動態說話調變獎勵（避免恆定單音或環境風聲拿高分）
      const articulationFactor = Math.max(0.76, Math.min(1.04, 0.78 + this.smoothedFlux * 0.38));

      // 綜合原始頻譜相似度 (0..1)
      const rawSpectralScore =
        (bestSegSim * 0.44 + globalSim * 0.34 + centroidAlign * 0.12 + ratioAlign * 0.1) * articulationFactor;

      // 將聲學餘弦空間 (典型語音 0.55..0.97) 映射至直觀的 28..99% 計量條刻度
      let mappedPercent = Math.max(22, Math.min(99, Math.round(((rawSpectralScore - 0.34) / 0.6) * 100)));

      // 若有即時語音辨識結果，微幅融合 (±6%) 提高實戰準確度
      if (this.lastTranscriptBoost > 0) {
        const transcriptScore = Math.round(52 + this.lastTranscriptBoost * 47);
        mappedPercent = Math.round(mappedPercent * 0.78 + transcriptScore * 0.22);
      }

      // 平滑濾波，讓進度條反應靈敏但不劇烈抖動
      this.smoothedSimilarity =
        this.voicedFrameCount <= 2
          ? mappedPercent
          : this.smoothedSimilarity * 0.72 + mappedPercent * 0.28;

      const roundedSim = Math.max(0, Math.min(99, Math.round(this.smoothedSimilarity)));
      this.peakSimilarity = Math.max(this.peakSimilarity, roundedSim);
      this.voicedSimilaritySum += roundedSim;

      if (roundedSim >= 85) {
        tier = 'excellent';
        feedbackLabel = '頻譜高度共振，咬字清晰精準';
      } else if (roundedSim >= 70) {
        tier = 'high';
        feedbackLabel = '語音頻譜吻合良好，保持連讀節奏';
      } else if (roundedSim >= 50) {
        tier = 'aligning';
        feedbackLabel =
          liveRatio < this.profile.expectedHighLowRatio * 0.72
            ? '節奏對齊中，可加強字尾子音發音'
            : '節奏對齊中，放慢母音咬字更清晰';
      } else {
        tier = 'low';
        feedbackLabel = '頻譜落差較大，建議靠近麥克風清晰朗讀';
      }
    } else if (this.voicedFrameCount > 0) {
      // 短暫換氣靜默期間微幅自然保持，不瞬間歸零
      this.smoothedSimilarity = Math.max(0, this.smoothedSimilarity * 0.985);
      const holdSim = Math.round(this.smoothedSimilarity);
      tier = holdSim >= 85 ? 'excellent' : holdSim >= 70 ? 'high' : holdSim >= 50 ? 'aligning' : 'low';
      feedbackLabel = '偵測到換氣停頓，請繼續朗讀剩餘字詞...';
    }

    const currentSimilarity = Math.max(0, Math.min(99, Math.round(this.smoothedSimilarity)));
    const avgSimilarity =
      this.voicedFrameCount > 0 ? Math.round(this.voicedSimilaritySum / this.voicedFrameCount) : 0;

    return {
      similarity: currentSimilarity,
      peakSimilarity: this.peakSimilarity,
      avgSimilarity,
      userBars: displayBars,
      targetBars: this.profile.displayBars,
      isVoiceDetected,
      tier,
      feedbackLabel,
      referenceSource: this.profile.source,
    };
  }

  public getSummary(): { avgSimilarity: number; peakSimilarity: number; voicedFrames: number } {
    return {
      avgSimilarity: this.voicedFrameCount > 0 ? Math.round(this.voicedSimilaritySum / this.voicedFrameCount) : 0,
      peakSimilarity: this.peakSimilarity,
      voicedFrames: this.voicedFrameCount,
    };
  }
}
