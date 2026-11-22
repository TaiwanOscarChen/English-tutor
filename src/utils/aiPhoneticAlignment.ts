/**
 * AI-Phonetic-Alignment Engine & Weakness-Vocab-List Persistence Store
 *
 * 利用麥克風 Web Audio API 12 段共振峰頻譜訊號與語音辨識輸出，
 * 逐詞對比目標句子的 KK 音標特徵（母音共振峰、擦音／氣音高頻能量、字尾塞音清晰度），
 * 計算每個單字的 KK 音標對齊精準度，並自動將發音不準確的單字存入 'Weakness-Vocab-List'。
 */

import { getWordKKPhonetic, lookupWordDefinition } from './wordDictionary';

export const WEAKNESS_VOCAB_LIST_KEY = 'fse_weakness_vocab_list_v1';
export const WEAKNESS_VOCAB_UPDATED_EVENT = 'fse-weakness-vocab-updated';

export interface MicSpectralFrame {
  timestampMs: number;
  /** 12 formant bands (150Hz..5000Hz), range 0..100 */
  bands: number[];
  similarity: number;
  isVoiceDetected: boolean;
}

export interface WordKKAlignmentResult {
  word: string;
  normalizedWord: string;
  kkPhonetic: string;
  chineseMeaning: string;
  lexicalScore: number; // 0..100
  acousticKkScore: number; // 0..100
  alignmentScore: number; // 0..100
  status: 'accurate' | 'borderline' | 'inaccurate';
  kkTargetFeatures: string[];
  kkIssueNote: string;
  savedToWeaknessList: boolean;
}

export interface AiPhoneticAlignmentReport {
  sentence: string;
  overallKkScore: number; // 0..100
  voicedFrameCount: number;
  wordResults: WordKKAlignmentResult[];
  newlySavedWeakWords: WeaknessVocabEntry[];
  evaluatedAt: number;
}

export interface WeaknessVocabEntry {
  word: string; // normalized lowercase key
  displayWord: string;
  kkPhonetic: string;
  chineseMeaning: string;
  lastAlignmentScore: number; // 0..100
  missCount: number;
  lastSentence: string;
  kkIssueNote: string;
  updatedAt: number;
}

function normalizeWord(raw: string): string {
  return (raw || '').toLowerCase().replace(/[^a-z0-9'-]/g, '').replace(/^'+|'+$/g, '');
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * 解析單字 KK 音標中的聲學目標特徵（供比對麥克風低/中/高頻能量分佈）
 */
function analyzeKKAcousticTargets(kk: string, word: string): {
  needsHighFricative: boolean;
  needsOpenVowel: boolean;
  needsRetroflexLiquid: boolean;
  needsFinalStop: boolean;
  featureLabels: string[];
} {
  const cleanKk = kk || '';
  const lower = word.toLowerCase();

  const needsHighFricative = /[θðszʃʒfv]|ch|sh|th/i.test(cleanKk) || /(th|sh|ch|s|z|f|v)/.test(lower);
  const needsOpenVowel = /[æɑɔɛʌ]/.test(cleanKk);
  const needsRetroflexLiquid = /[rɚɝl]/.test(cleanKk);
  const needsFinalStop = /[ptkdbɡ]\]?$/.test(cleanKk) || /[ptkdb]$/.test(lower);

  const featureLabels: string[] = [];
  if (needsHighFricative) featureLabels.push('高頻擦音/氣音');
  if (needsOpenVowel) featureLabels.push('母音共振峰');
  if (needsRetroflexLiquid) featureLabels.push('捲舌/邊音');
  if (needsFinalStop) featureLabels.push('字尾爆破收音');
  if (featureLabels.length === 0) featureLabels.push('基本音節連讀');

  return {
    needsHighFricative,
    needsOpenVowel,
    needsRetroflexLiquid,
    needsFinalStop,
    featureLabels,
  };
}

/**
 * 依據麥克風 12 段共振峰頻譜與辨識結果，執行逐詞 'AI-Phonetic-Alignment' (KK 音標對齊)
 */
export function runAiPhoneticAlignment(params: {
  targetSentence: string;
  recognizedTranscript: string;
  spectralFrames: MicSpectralFrame[];
  isOfflineAcoustic?: boolean;
  inaccurateThreshold?: number;
  autoPersistWeakness?: boolean;
}): AiPhoneticAlignmentReport {
  const {
    targetSentence,
    recognizedTranscript,
    spectralFrames,
    isOfflineAcoustic = false,
    inaccurateThreshold = 75,
    autoPersistWeakness = true,
  } = params;

  const rawWords = (targetSentence || '')
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ''))
    .filter(Boolean);

  const spokenWords = (recognizedTranscript || '')
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean);

  const voicedFrames = spectralFrames.filter((f) => f.isVoiceDetected && Array.isArray(f.bands) && f.bands.length >= 12);
  const totalWords = Math.max(1, rawWords.length);

  // 按字長加權分配時間窗口，對應每個單字在麥克風訊號中的時間區段
  const wordWeights = rawWords.map((w) => Math.max(2, w.length));
  const totalWeight = wordWeights.reduce((a, b) => a + b, 0) || 1;
  let cumulativeWeight = 0;

  const wordResults: WordKKAlignmentResult[] = [];
  const toSaveEntries: WeaknessVocabEntry[] = [];

  for (let idx = 0; idx < rawWords.length; idx++) {
    const displayWord = rawWords[idx];
    const normWord = normalizeWord(displayWord);
    const kkPhonetic = getWordKKPhonetic(displayWord);
    const def = lookupWordDefinition(displayWord);
    const chineseMeaning = def?.translation || '晶圓廠工程詞彙';
    const kkTargets = analyzeKKAcousticTargets(kkPhonetic, displayWord);

    // 1. 計算詞彙辨識對齊分數 (lexicalScore)
    let lexicalScore = 100;
    if (!isOfflineAcoustic && spokenWords.length > 0) {
      if (spokenWords.includes(normWord)) {
        lexicalScore = 100;
      } else {
        // 找最接近的辨識詞估算近似發音偏差
        let bestDist = Infinity;
        for (const sw of spokenWords) {
          const d = levenshteinDistance(normWord, sw);
          if (d < bestDist) bestDist = d;
        }
        const maxLen = Math.max(1, normWord.length);
        const ratio = Math.max(0, 1 - bestDist / maxLen);
        if (ratio >= 0.72) {
          lexicalScore = Math.round(62 + ratio * 22);
        } else if (ratio >= 0.45) {
          lexicalScore = Math.round(35 + ratio * 35);
        } else {
          lexicalScore = 28;
        }
      }
    } else if (!isOfflineAcoustic && spokenWords.length === 0) {
      lexicalScore = 45;
    }

    // 2. 切出該單字對應的麥克風共振峰頻譜時間段，計算 KK 聲學對齊分 (acousticKkScore)
    const startRatio = cumulativeWeight / totalWeight;
    cumulativeWeight += wordWeights[idx];
    const endRatio = cumulativeWeight / totalWeight;

    let acousticKkScore = isOfflineAcoustic ? 78 : lexicalScore >= 90 ? 88 : 60;
    let issueHints: string[] = [];

    if (voicedFrames.length >= 2) {
      const startFrame = Math.min(voicedFrames.length - 1, Math.floor(startRatio * voicedFrames.length));
      const endFrame = Math.max(startFrame + 1, Math.min(voicedFrames.length, Math.ceil(endRatio * voicedFrames.length)));
      const slice = voicedFrames.slice(startFrame, endFrame);

      let lowSum = 0; // bands 0..3 (150-820Hz, F0/F1 vowel)
      let midSum = 0; // bands 4..8 (820-2800Hz, F2/F3 consonant/liquid)
      let highSum = 0; // bands 9..11 (2800-5000Hz, fricatives/sibilants/bursts)
      let simSum = 0;

      for (const frame of slice) {
        lowSum += (frame.bands[0] + frame.bands[1] + frame.bands[2] + frame.bands[3]) / 4;
        midSum += (frame.bands[4] + frame.bands[5] + frame.bands[6] + frame.bands[7] + frame.bands[8]) / 5;
        highSum += (frame.bands[9] + frame.bands[10] + frame.bands[11]) / 3;
        simSum += frame.similarity || 70;
      }

      const n = Math.max(1, slice.length);
      const lowAvg = lowSum / n;
      const midAvg = midSum / n;
      const highAvg = highSum / n;
      const baseSim = simSum / n;

      let penalty = 0;
      if (kkTargets.needsHighFricative && highAvg < 24) {
        penalty += 14;
        issueHints.push(`高頻擦音/氣音偏弱 (${kkPhonetic})`);
      }
      if (kkTargets.needsOpenVowel && lowAvg < 28) {
        penalty += 12;
        issueHints.push(`母音共振峰開口不足 (${kkPhonetic})`);
      }
      if (kkTargets.needsRetroflexLiquid && midAvg < 26) {
        penalty += 10;
        issueHints.push(`捲舌/邊音共振待加強`);
      }
      if (kkTargets.needsFinalStop && highAvg < 20 && midAvg < 28) {
        penalty += 9;
        issueHints.push(`字尾塞音收尾略輕`);
      }

      acousticKkScore = Math.max(32, Math.min(99, Math.round(baseSim - penalty)));
    }

    // 3. 融合詞彙辨識與 Web Audio KK 聲學對齊分數
    const alignmentScore = isOfflineAcoustic
      ? acousticKkScore
      : Math.round(lexicalScore * 0.62 + acousticKkScore * 0.38);

    const status: WordKKAlignmentResult['status'] =
      alignmentScore >= 82
        ? 'accurate'
        : alignmentScore >= inaccurateThreshold
        ? 'borderline'
        : 'inaccurate';

    if (lexicalScore < 65 && issueHints.length === 0) {
      issueHints.push(`辨識偏離目標音標 ${kkPhonetic}，建議慢速重讀`);
    }
    const kkIssueNote =
      status === 'accurate'
        ? `KK 音標 ${kkPhonetic} 對齊精準`
        : issueHints.join('；') || `音節對齊偏弱 (${kkPhonetic})`;

    const isMeaningfulWord = normWord.length >= 2 || status === 'inaccurate';
    const shouldSaveToWeakness = status === 'inaccurate' && isMeaningfulWord;

    wordResults.push({
      word: displayWord,
      normalizedWord: normWord,
      kkPhonetic,
      chineseMeaning,
      lexicalScore,
      acousticKkScore,
      alignmentScore,
      status,
      kkTargetFeatures: kkTargets.featureLabels,
      kkIssueNote,
      savedToWeaknessList: shouldSaveToWeakness,
    });

    if (shouldSaveToWeakness && normWord) {
      toSaveEntries.push({
        word: normWord,
        displayWord,
        kkPhonetic,
        chineseMeaning,
        lastAlignmentScore: alignmentScore,
        missCount: 1,
        lastSentence: targetSentence,
        kkIssueNote,
        updatedAt: Date.now(),
      });
    }
  }

  let newlySavedWeakWords: WeaknessVocabEntry[] = [];
  if (autoPersistWeakness && toSaveEntries.length > 0) {
    newlySavedWeakWords = upsertWeaknessVocabEntries(toSaveEntries);
  } else {
    newlySavedWeakWords = toSaveEntries;
  }

  const overallKkScore =
    wordResults.length > 0
      ? Math.round(wordResults.reduce((sum, w) => sum + w.alignmentScore, 0) / wordResults.length)
      : 0;

  return {
    sentence: targetSentence,
    overallKkScore,
    voicedFrameCount: voicedFrames.length,
    wordResults,
    newlySavedWeakWords,
    evaluatedAt: Date.now(),
  };
}

// ============================================================================
// Weakness-Vocab-List 持久化管理 (localStorage + 全站同步事件)
// ============================================================================

export function loadWeaknessVocabList(): WeaknessVocabEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WEAKNESS_VOCAB_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.word === 'string' && item.word.trim().length > 0)
      .sort((a, b) => b.missCount - a.missCount || a.lastAlignmentScore - b.lastAlignmentScore);
  } catch {
    return [];
  }
}

export function upsertWeaknessVocabEntries(entries: WeaknessVocabEntry[]): WeaknessVocabEntry[] {
  const existing = loadWeaknessVocabList();
  const map = new Map<string, WeaknessVocabEntry>();
  existing.forEach((item) => map.set(item.word, item));

  const updatedItems: WeaknessVocabEntry[] = [];

  for (const entry of entries) {
    const key = normalizeWord(entry.word || entry.displayWord);
    if (!key) continue;
    const prev = map.get(key);
    const merged: WeaknessVocabEntry = prev
      ? {
          ...prev,
          displayWord: entry.displayWord || prev.displayWord,
          kkPhonetic: entry.kkPhonetic || prev.kkPhonetic,
          chineseMeaning: entry.chineseMeaning || prev.chineseMeaning,
          lastAlignmentScore: entry.lastAlignmentScore,
          missCount: prev.missCount + 1,
          lastSentence: entry.lastSentence || prev.lastSentence,
          kkIssueNote: entry.kkIssueNote || prev.kkIssueNote,
          updatedAt: Date.now(),
        }
      : {
          ...entry,
          word: key,
          missCount: Math.max(1, entry.missCount || 1),
          updatedAt: Date.now(),
        };
    map.set(key, merged);
    updatedItems.push(merged);
  }

  const nextList = Array.from(map.values())
    .sort((a, b) => b.missCount - a.missCount || a.lastAlignmentScore - b.lastAlignmentScore)
    .slice(0, 80);

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(WEAKNESS_VOCAB_LIST_KEY, JSON.stringify(nextList));
    } catch {}
  }
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent(WEAKNESS_VOCAB_UPDATED_EVENT, {
          detail: { count: nextList.length, added: updatedItems.length },
        })
      );
    } catch {}
  }

  return updatedItems;
}

export function removeWeaknessVocabWord(word: string): WeaknessVocabEntry[] {
  const key = normalizeWord(word);
  const nextList = loadWeaknessVocabList().filter((item) => item.word !== key);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(WEAKNESS_VOCAB_LIST_KEY, JSON.stringify(nextList));
    } catch {}
  }
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent(WEAKNESS_VOCAB_UPDATED_EVENT, { detail: { count: nextList.length } })
      );
    } catch {}
  }
  return nextList;
}

export function clearWeaknessVocabList(): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(WEAKNESS_VOCAB_LIST_KEY);
    } catch {}
  }
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent(WEAKNESS_VOCAB_UPDATED_EVENT, { detail: { count: 0 } })
      );
    } catch {}
  }
}
