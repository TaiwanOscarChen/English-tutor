/**
 * Pronunciation Trend History & Weak-Phoneme Analytics Engine
 * 追蹤口說練習的即時頻譜相似度、語速 (WPM) 與常見半導體英語弱項音素，
 * 並支援跨裝置無衝突合併 (CRDT-safe merge)。
 */

export type PhonemeGroupId =
  | 'th'
  | 'rl'
  | 'sibilants'
  | 'vf'
  | 'final_stop'
  | 'vowels';

export interface PhonemeGroupInfo {
  id: PhonemeGroupId;
  label: string;
  ipa: string;
  tip: string;
  sampleWords: string[];
}

export const PHONEME_CATALOG: Record<PhonemeGroupId, PhonemeGroupInfo> = {
  th: {
    id: 'th',
    label: 'TH 咬舌音',
    ipa: '/θ, ð/',
    tip: '舌尖輕放上下齒間送氣，避免唸成 /s/ 或 /d/（如 thermal、the、through）',
    sampleWords: ['thermal', 'through', 'threshold', 'the'],
  },
  rl: {
    id: 'rl',
    label: 'R / L 捲舌區分',
    ipa: '/r, l/',
    tip: 'R 舌尖懸空微捲不碰上顎；L 舌尖確實抵住上齒齦（如 align、chamber、wafer）',
    sampleWords: ['align', 'wafer', 'pressure', 'calibration'],
  },
  sibilants: {
    id: 'sibilants',
    label: 'SH / CH / S 嘶擦音',
    ipa: '/ʃ, tʃ, s/',
    tip: 'SH / CH 嘴唇微噘送氣清晰，避免與 S 混淆（如 chamber、shift、pressure）',
    sampleWords: ['chamber', 'pressure', 'sensor', 'shutdown'],
  },
  vf: {
    id: 'vf',
    label: 'V / F 唇齒音',
    ipa: '/v, f/',
    tip: '上門牙輕觸下唇內側，V 需震動聲帶，避免唸成 B 或 W（如 valve、vacuum、verify）',
    sampleWords: ['valve', 'vacuum', 'verify', 'flow'],
  },
  final_stop: {
    id: 'final_stop',
    label: '字尾塞音與複數',
    ipa: '/-t, -d, -k, -p, -s/',
    tip: '無塵室通訊易吃字尾，刻意補齊字尾清音（如 port、leak、check、fault）',
    sampleWords: ['port', 'check', 'fault', 'interlock'],
  },
  vowels: {
    id: 'vowels',
    label: '長短母音張力',
    ipa: '/iː vs ɪ, eɪ/',
    tip: '拉開長短母音時長差異，避免 leak/lick、seal/sill 或 wafer 扁平化',
    sampleWords: ['leak', 'seal', 'clean', 'wafer'],
  },
};

export interface PronunciationSessionRecord {
  id: string;
  timestamp: number;
  sentence: string;
  score: number;
  spectralAvg: number;
  spectralPeak: number;
  wpm: number;
  weakPhonemes: PhonemeGroupId[];
  missedWords: string[];
}

export interface PhonemeCounter {
  hits: number;
  misses: number;
  lastSeenAt: number;
}

export interface PronunciationAnalyticsStore {
  sessions: PronunciationSessionRecord[];
  phonemeStats: Partial<Record<PhonemeGroupId, PhonemeCounter>>;
  updatedAt: number;
}

export interface WeakPhonemeSummary {
  info: PhonemeGroupInfo;
  misses: number;
  hits: number;
  accuracyPct: number;
  recentMissedWords: string[];
}

export interface PronunciationInsights {
  totalSessions: number;
  recentSessions: PronunciationSessionRecord[];
  averageScore: number;
  averageSpectral: number;
  averageWpm: number;
  trendDelta: number; // Latest 3 avg minus previous 3 avg
  topWeakPhonemes: WeakPhonemeSummary[];
}

const STORAGE_KEY = 'fse_pronunciation_analytics_v1';
const MAX_STORED_SESSIONS = 60;

export function createEmptyPronunciationStore(): PronunciationAnalyticsStore {
  return {
    sessions: [],
    phonemeStats: {},
    updatedAt: 0,
  };
}

export function detectPhonemeGroupsInWord(rawWord: string): PhonemeGroupId[] {
  const word = rawWord.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return [];

  const groups = new Set<PhonemeGroupId>();
  if (word.includes('th')) groups.add('th');
  if (word.includes('r') || word.includes('l')) groups.add('rl');
  if (/(sh|ch|ss|tion|sion|ce|ci)/.test(word)) groups.add('sibilants');
  if (word.includes('v') || word.includes('f') || word.includes('ph')) groups.add('vf');
  if (/[tdkpgbsz]$/.test(word) && word.length >= 3) groups.add('final_stop');
  if (/(ee|ea|oo|ai|ay|ei|ie|oa)/.test(word)) groups.add('vowels');

  return Array.from(groups);
}

export function loadPronunciationAnalytics(): PronunciationAnalyticsStore {
  if (typeof window === 'undefined') return createEmptyPronunciationStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyPronunciationStore();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return createEmptyPronunciationStore();
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions.slice(0, MAX_STORED_SESSIONS) : [],
      phonemeStats: parsed.phonemeStats && typeof parsed.phonemeStats === 'object' ? parsed.phonemeStats : {},
      updatedAt: Number(parsed.updatedAt) || 0,
    };
  } catch {
    return createEmptyPronunciationStore();
  }
}

export function savePronunciationAnalytics(store: PronunciationAnalyticsStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sessions: (store.sessions || []).slice(0, MAX_STORED_SESSIONS),
      phonemeStats: store.phonemeStats || {},
      updatedAt: store.updatedAt || Date.now(),
    }));
  } catch {
    // Guard against storage quota limits
  }
}

/**
 * Pure conflict-safe CRDT merge between two device stores.
 * - Sessions: union by id, newest first, capped at MAX_STORED_SESSIONS
 * - Phoneme counters: element-wise maximum (monotonic non-destructive merge)
 */
export function mergePronunciationAnalytics(
  existing?: Partial<PronunciationAnalyticsStore> | null,
  incoming?: Partial<PronunciationAnalyticsStore> | null
): PronunciationAnalyticsStore {
  const byId = new Map<string, PronunciationSessionRecord>();

  const ingestSessions = (list?: PronunciationSessionRecord[]) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string') continue;
      const prev = byId.get(item.id);
      if (!prev || (Number(item.timestamp) || 0) >= (Number(prev.timestamp) || 0)) {
        byId.set(item.id, {
          id: item.id.slice(0, 64),
          timestamp: Number(item.timestamp) || Date.now(),
          sentence: String(item.sentence || '').slice(0, 240),
          score: Math.min(100, Math.max(0, Math.round(Number(item.score) || 0))),
          spectralAvg: Math.min(100, Math.max(0, Math.round(Number(item.spectralAvg) || 0))),
          spectralPeak: Math.min(100, Math.max(0, Math.round(Number(item.spectralPeak) || 0))),
          wpm: Math.min(300, Math.max(0, Math.round(Number(item.wpm) || 0))),
          weakPhonemes: Array.isArray(item.weakPhonemes)
            ? item.weakPhonemes.filter((p): p is PhonemeGroupId => p in PHONEME_CATALOG).slice(0, 6)
            : [],
          missedWords: Array.isArray(item.missedWords)
            ? item.missedWords.map((w) => String(w).slice(0, 32)).slice(0, 12)
            : [],
        });
      }
    }
  };

  ingestSessions(existing?.sessions);
  ingestSessions(incoming?.sessions);

  const mergedSessions = Array.from(byId.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_STORED_SESSIONS);

  const mergedStats: Partial<Record<PhonemeGroupId, PhonemeCounter>> = {};
  const allKeys = Object.keys(PHONEME_CATALOG) as PhonemeGroupId[];
  for (const key of allKeys) {
    const a = existing?.phonemeStats?.[key];
    const b = incoming?.phonemeStats?.[key];
    if (!a && !b) continue;
    mergedStats[key] = {
      hits: Math.max(Number(a?.hits) || 0, Number(b?.hits) || 0),
      misses: Math.max(Number(a?.misses) || 0, Number(b?.misses) || 0),
      lastSeenAt: Math.max(Number(a?.lastSeenAt) || 0, Number(b?.lastSeenAt) || 0),
    };
  }

  return {
    sessions: mergedSessions,
    phonemeStats: mergedStats,
    updatedAt: Math.max(Number(existing?.updatedAt) || 0, Number(incoming?.updatedAt) || 0, Date.now()),
  };
}

export function recordPronunciationSession(input: {
  sentence: string;
  score: number;
  spectralAvg: number;
  spectralPeak: number;
  durationMs: number;
  wordEvaluations: Array<{ word: string; matched: boolean }>;
}): PronunciationAnalyticsStore {
  const store = loadPronunciationAnalytics();
  const now = Date.now();
  const wordCount = Math.max(
    1,
    input.sentence
      .trim()
      .split(/\s+/)
      .filter(Boolean).length
  );
  const effectiveSec = Math.max(1.2, Math.min(30, (input.durationMs || 2500) / 1000));
  const wpm = Math.min(240, Math.max(35, Math.round((wordCount / effectiveSec) * 60)));

  const missedWords: string[] = [];
  const weakSet = new Set<PhonemeGroupId>();
  const nextStats: Partial<Record<PhonemeGroupId, PhonemeCounter>> = { ...store.phonemeStats };

  for (const ev of input.wordEvaluations || []) {
    const groups = detectPhonemeGroupsInWord(ev.word);
    if (!ev.matched) {
      missedWords.push(ev.word);
    }
    for (const g of groups) {
      const prev = nextStats[g] || { hits: 0, misses: 0, lastSeenAt: 0 };
      if (ev.matched) {
        nextStats[g] = { hits: prev.hits + 1, misses: prev.misses, lastSeenAt: now };
      } else {
        nextStats[g] = { hits: prev.hits, misses: prev.misses + 1, lastSeenAt: now };
        weakSet.add(g);
      }
    }
  }

  // If spectral similarity is weak (< 72%) despite full text match, highlight acoustic vowel/sibilant tension
  if (weakSet.size === 0 && input.spectralAvg > 0 && input.spectralAvg < 72) {
    const sentenceGroups = detectPhonemeGroupsInWord(input.sentence);
    if (sentenceGroups.length > 0) {
      const primary = sentenceGroups[0];
      weakSet.add(primary);
      const prev = nextStats[primary] || { hits: 0, misses: 0, lastSeenAt: 0 };
      nextStats[primary] = { hits: prev.hits, misses: prev.misses + 1, lastSeenAt: now };
    }
  }

  const record: PronunciationSessionRecord = {
    id: `pr_${now}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now,
    sentence: input.sentence.slice(0, 240),
    score: Math.min(100, Math.max(0, Math.round(input.score))),
    spectralAvg: Math.min(100, Math.max(0, Math.round(input.spectralAvg))),
    spectralPeak: Math.min(100, Math.max(0, Math.round(input.spectralPeak))),
    wpm,
    weakPhonemes: Array.from(weakSet),
    missedWords: missedWords.slice(0, 12),
  };

  const updated: PronunciationAnalyticsStore = {
    sessions: [record, ...store.sessions].slice(0, MAX_STORED_SESSIONS),
    phonemeStats: nextStats,
    updatedAt: now,
  };

  savePronunciationAnalytics(updated);
  return updated;
}

export function computePronunciationInsights(
  store: PronunciationAnalyticsStore
): PronunciationInsights {
  const sessions = store.sessions || [];
  const totalSessions = sessions.length;
  const recentSessions = sessions.slice(0, 7);

  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      recentSessions: [],
      averageScore: 0,
      averageSpectral: 0,
      averageWpm: 0,
      trendDelta: 0,
      topWeakPhonemes: [],
    };
  }

  const avg = (nums: number[]) =>
    nums.length === 0 ? 0 : Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);

  const averageScore = avg(recentSessions.map((s) => s.score));
  const spectralValues = recentSessions.map((s) => s.spectralAvg).filter((n) => n > 0);
  const averageSpectral = spectralValues.length > 0 ? avg(spectralValues) : averageScore;
  const averageWpm = avg(recentSessions.map((s) => s.wpm).filter((n) => n > 0));

  const latestWindow = sessions.slice(0, 3).map((s) => s.score);
  const priorWindow = sessions.slice(3, 6).map((s) => s.score);
  const trendDelta = priorWindow.length > 0 ? avg(latestWindow) - avg(priorWindow) : 0;

  // Map recent missed words to phoneme groups
  const missedWordsByGroup: Partial<Record<PhonemeGroupId, Set<string>>> = {};
  for (const s of sessions.slice(0, 20)) {
    for (const w of s.missedWords || []) {
      for (const g of detectPhonemeGroupsInWord(w)) {
        if (!missedWordsByGroup[g]) missedWordsByGroup[g] = new Set();
        missedWordsByGroup[g]!.add(w);
      }
    }
  }

  const weakList: WeakPhonemeSummary[] = [];
  for (const [id, counter] of Object.entries(store.phonemeStats || {}) as Array<[PhonemeGroupId, PhonemeCounter]>) {
    if (!counter || !(id in PHONEME_CATALOG) || counter.misses <= 0) continue;
    const total = counter.hits + counter.misses;
    const accuracyPct = total > 0 ? Math.round((counter.hits / total) * 100) : 0;
    weakList.push({
      info: PHONEME_CATALOG[id],
      misses: counter.misses,
      hits: counter.hits,
      accuracyPct,
      recentMissedWords: Array.from(missedWordsByGroup[id] || []).slice(0, 4),
    });
  }

  weakList.sort((a, b) => {
    // Prioritize lower accuracy and higher miss frequency
    const scoreA = a.misses * (100 - a.accuracyPct + 10);
    const scoreB = b.misses * (100 - b.accuracyPct + 10);
    return scoreB - scoreA;
  });

  return {
    totalSessions,
    recentSessions,
    averageScore,
    averageSpectral,
    averageWpm,
    trendDelta,
    topWeakPhonemes: weakList.slice(0, 3),
  };
}

export interface WeakPhonemeDrillItem {
  id: string;
  english_sentence: string;
  scenario: string;
  phonetic_taiwan: string;
  matchedPhonemes: PhonemeGroupInfo[];
  focusWords: string[];
  relevanceScore: number;
}

/**
 * 依據診斷出的弱項音素，自動從教材庫挑選 5 句專屬「3 分鐘弱項音素特訓」組卷
 * 若尚未有弱項紀錄，則挑選涵蓋 6 大音素的平衡校準特訓組
 */
export function buildWeakPhonemeDrillLessons(
  store: PronunciationAnalyticsStore,
  lessons: Array<{
    id: string;
    english_sentence: string;
    scenario?: string;
    phonetic_taiwan?: string;
  }>,
  limit: number = 5
): WeakPhonemeDrillItem[] {
  const insights = computePronunciationInsights(store);
  const targetIds: PhonemeGroupId[] =
    insights.topWeakPhonemes.length > 0
      ? insights.topWeakPhonemes.map((w) => w.info.id)
      : (['th', 'rl', 'vf', 'sibilants', 'final_stop', 'vowels'] as PhonemeGroupId[]);

  const weightByGroup = new Map<PhonemeGroupId, number>();
  targetIds.forEach((id, idx) => {
    weightByGroup.set(id, Math.max(1, 4 - idx));
  });

  const seenSentences = new Set<string>();
  const scored: WeakPhonemeDrillItem[] = [];

  for (const lesson of lessons || []) {
    if (!lesson?.english_sentence) continue;
    const norm = lesson.english_sentence.trim().toLowerCase();
    if (!norm || seenSentences.has(norm)) continue;
    seenSentences.add(norm);

    const words = lesson.english_sentence
      .replace(/[^a-zA-Z\s'-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    const matchedGroupIds = new Set<PhonemeGroupId>();
    const focusWords: string[] = [];
    let score = 0;

    for (const w of words) {
      const groups = detectPhonemeGroupsInWord(w);
      let wordHit = false;
      for (const g of groups) {
        const weight = weightByGroup.get(g) || 0;
        if (weight > 0) {
          matchedGroupIds.add(g);
          score += weight;
          wordHit = true;
        }
      }
      if (wordHit && focusWords.length < 4 && !focusWords.some((fw) => fw.toLowerCase() === w.toLowerCase())) {
        focusWords.push(w);
      }
    }

    // Bonus for covering multiple distinct target weak phoneme groups in one sentence
    score += matchedGroupIds.size * 3;
    if (score <= 0) continue;

    scored.push({
      id: lesson.id,
      english_sentence: lesson.english_sentence,
      scenario: lesson.scenario || '晶圓廠實戰發音特訓',
      phonetic_taiwan: lesson.phonetic_taiwan || '',
      matchedPhonemes: Array.from(matchedGroupIds).map((id) => PHONEME_CATALOG[id]),
      focusWords,
      relevanceScore: score,
    });
  }

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return scored.slice(0, Math.max(1, limit));
}
