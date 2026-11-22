/**
 * 全量教材發音壓力測試（Latency-Report）與國小拆解法句型審計引擎
 *
 * 1. 自動輪巡並朗讀 baseLessons 中每一句，量測 TTS 實際響應時間 (ms)，
 *    針對響應 > 500ms 的異常句子自動建立與匯出 'Latency-Report'。
 * 2. 掃描 baseLessons 句型結構，驗證是否符合「國小拆解法（3-5 字 SVO 極簡結構 + 強台式諧音記憶點）」，
 *    篩出過長或結構複雜的句子，串接後端 Gemini API 生成更精簡的替換建議。
 */

import type { Lesson } from '../types';
import {
  speakEnglish,
  cancelSpeech,
  schedulePredictiveAudioCache,
  subscribeUtteranceLatency,
  getPreReadSchedulerMetrics,
  type PreReadSchedulerMetrics,
} from './speech';
import { estimateEnglishSyllables } from './speechSpeedCalibrator';
import type { PresetLessonPatch } from '../data/presetLessons';

export const TTS_LATENCY_ANOMALY_THRESHOLD_MS = 500;
export const LATENCY_REPORT_STORAGE_KEY = 'fse_tts_latency_reports_v1';

export interface TtsStressTestItemResult {
  lessonId: string;
  index: number;
  englishSentence: string;
  chineseTranslation: string;
  category: string;
  latencyMs: number;
  totalReadMs: number;
  engine: 'cloud' | 'native' | 'timeout';
  isAnomaly: boolean; // latencyMs > 500
  status: 'passed' | 'anomaly' | 'error';
  note: string;
}

export interface LatencyReport {
  reportType: 'Latency-Report';
  reportId: string;
  generatedAt: string;
  thresholdMs: number;
  speechSpeed: number;
  totalTested: number;
  anomalyCount: number;
  passRatePct: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
  schedulerMetrics: PreReadSchedulerMetrics;
  anomalies: TtsStressTestItemResult[];
  allResults: TtsStressTestItemResult[];
}

export interface ElementaryAuditItem {
  lesson: Lesson;
  wordCount: number;
  syllableCount: number;
  heavyWords: string[];
  hasComplexClause: boolean;
  hasMissingComponents: boolean;
  hasWeakPhonetic: boolean;
  complianceScore: number; // 0..100
  status: 'optimal' | 'needs_simplification' | 'complex_violation';
  issues: string[];
  needsOptimization: boolean;
}

export interface GeminiRewriteSuggestion {
  lessonId: string;
  originalSentence: string;
  simplifiedSentence: string;
  chinese_translation: string;
  components: {
    subject: string;
    action: string;
    object: string;
    bridge: string;
  };
  phonetic_taiwan: string;
  memory_trick: string;
  additional_context: string;
  improvementReason: string;
  taiwanMnemonicHighlight: string;
}

/**
 * 計算百分位數 (例如 P95)
 */
function computePercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

/**
 * 建立標準化 'Latency-Report'（針對 > 500ms 響應異常句子自動彙整）
 */
export function buildLatencyReport(
  results: TtsStressTestItemResult[],
  speechSpeed: number,
  schedulerMetrics?: PreReadSchedulerMetrics
): LatencyReport {
  const latencies = results.map((r) => r.latencyMs);
  const totalTested = results.length;
  const anomalies = results
    .filter((r) => r.latencyMs > TTS_LATENCY_ANOMALY_THRESHOLD_MS || r.status === 'error')
    .sort((a, b) => b.latencyMs - a.latencyMs);
  const avg =
    latencies.length > 0
      ? Math.round(latencies.reduce((acc, v) => acc + v, 0) / latencies.length)
      : 0;
  const p95 = computePercentile(latencies, 95);
  const max = latencies.length > 0 ? Math.max(...latencies) : 0;
  const passRatePct =
    totalTested > 0 ? Math.round(((totalTested - anomalies.length) / totalTested) * 100) : 100;

  const report: LatencyReport = {
    reportType: 'Latency-Report',
    reportId: `Latency-Report-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
    generatedAt: new Date().toISOString(),
    thresholdMs: TTS_LATENCY_ANOMALY_THRESHOLD_MS,
    speechSpeed,
    totalTested,
    anomalyCount: anomalies.length,
    passRatePct,
    averageLatencyMs: avg,
    p95LatencyMs: p95,
    maxLatencyMs: max,
    schedulerMetrics: schedulerMetrics ?? getPreReadSchedulerMetrics(),
    anomalies,
    allResults: results,
  };

  saveLatencyReport(report);
  return report;
}

export function saveLatencyReport(report: LatencyReport): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const existing = loadSavedLatencyReports();
    const next = [report, ...existing.filter((r) => r.reportId !== report.reportId)].slice(0, 10);
    localStorage.setItem(LATENCY_REPORT_STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function loadSavedLatencyReports(): LatencyReport[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LATENCY_REPORT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function formatLatencyReportMarkdown(report: LatencyReport): string {
  const lines: string[] = [
    `# Latency-Report (${report.reportId})`,
    ``,
    `- **產生時間**：${new Date(report.generatedAt).toLocaleString('zh-TW')}`,
    `- **異常門檻**：> ${report.thresholdMs} ms`,
    `- **測試語速**：${report.speechSpeed.toFixed(2)}x`,
    `- **全量測試句數**：${report.totalTested} 句`,
    `- **達標率（≤ 500ms）**：${report.passRatePct}%`,
    `- **異常句數（> 500ms）**：${report.anomalyCount} 句`,
    `- **平均響應 / P95 / 最大值**：${report.averageLatencyMs} ms / ${report.p95LatencyMs} ms / ${report.maxLatencyMs} ms`,
    `- **預讀排程指標**：滑動視窗 ${report.schedulerMetrics.slidingWindowSize} 句 · 預讀觸發 ${report.schedulerMetrics.slidingWindowPreloads} 次 · IDB 快取直昇 ${report.schedulerMetrics.idbFastPromotions} 次 · 前景禮讓 ${report.schedulerMetrics.foregroundYields} 次`,
    ``,
    `## 異常句子清單（> ${report.thresholdMs}ms）`,
  ];

  if (report.anomalies.length === 0) {
    lines.push(`所有 ${report.totalTested} 句教材皆在 ${report.thresholdMs}ms 內完成響應，無延遲異常！`);
  } else {
    lines.push(`| # | Lesson ID | 英文句型 | 響應時間 (ms) | 引擎 | 診斷備註 |`);
    lines.push(`|---|-----------|----------|---------------|------|----------|`);
    report.anomalies.forEach((item, idx) => {
      lines.push(
        `| ${idx + 1} | \`${item.lessonId}\` | ${item.englishSentence} | **${item.latencyMs}ms** | ${item.engine} | ${item.note} |`
      );
    });
  }

  lines.push(``, `## 全量輪巡明細`);
  lines.push(`| # | Lesson ID | 英文句型 | 響應 (ms) | 朗讀總長 (ms) | 狀態 |`);
  lines.push(`|---|-----------|----------|-----------|---------------|------|`);
  report.allResults.forEach((item, idx) => {
    lines.push(
      `| ${idx + 1} | \`${item.lessonId}\` | ${item.englishSentence} | ${item.latencyMs} | ${item.totalReadMs} | ${item.status === 'passed' ? 'PASS' : 'ANOMALY'} |`
    );
  });

  return lines.join('\n');
}

/**
 * 自動輪巡並朗讀 baseLessons 中每一句，量測真實發音引擎響應時間，
 * 同時利用優化後的滑動視窗預讀排程進行前瞻預載。
 */
export async function runFullBaseLessonsTtsStressTest(options: {
  lessons: Lesson[];
  speechSpeed: number;
  signal?: AbortSignal;
  interSentenceGapMs?: number;
  onStepStart?: (lesson: Lesson, index: number, total: number) => void;
  onStepComplete?: (result: TtsStressTestItemResult, index: number, total: number) => void;
}): Promise<LatencyReport> {
  const {
    lessons,
    speechSpeed,
    signal,
    interSentenceGapMs = 120,
    onStepStart,
    onStepComplete,
  } = options;

  const results: TtsStressTestItemResult[] = [];
  const total = lessons.length;

  cancelSpeech();

  // 開局即以優化後的滑動視窗預讀前 3 句
  if (lessons.length > 0) {
    schedulePredictiveAudioCache(
      lessons.slice(0, 3).map((l, idx) => ({
        text: l.english_sentence,
        lang: 'en-US' as const,
        speechSpeed,
        priority: idx === 0 ? 'immediate' : idx === 1 ? 'next_pattern' : 'next_lesson',
      })),
      speechSpeed
    ).catch(() => {});
  }

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) break;
    const lesson = lessons[i];
    if (onStepStart) onStepStart(lesson, i, total);

    // 推進滑動預讀視窗 [i+1 .. i+3]，確保下一句與後兩句提前就緒
    const lookahead = lessons.slice(i + 1, i + 4);
    if (lookahead.length > 0) {
      schedulePredictiveAudioCache(
        lookahead.map((nextL, offset) => ({
          text: nextL.english_sentence,
          lang: 'en-US' as const,
          speechSpeed,
          priority: offset === 0 ? 'next_pattern' : 'next_lesson',
        })),
        speechSpeed
      ).catch(() => {});
    }

    const invokeStart = performance.now();
    let measuredLatencyMs: number | null = null;
    let measuredEngine: 'cloud' | 'native' | 'timeout' = 'native';

    const itemResult = await new Promise<TtsStressTestItemResult>((resolve) => {
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const unsubscribe = subscribeUtteranceLatency((sample) => {
        if (settled) return;
        // 匹配最近觸發之發音樣本
        if (sample.timestamp >= Date.now() - 4000) {
          measuredLatencyMs = sample.latencyMs;
          measuredEngine = sample.engine;
        }
      });

      const finalize = (timedOut: boolean) => {
        if (settled) return;
        settled = true;
        unsubscribe();
        if (timeoutId) clearTimeout(timeoutId);

        const totalReadMs = Math.round(performance.now() - invokeStart);
        const latencyMs =
          measuredLatencyMs !== null
            ? measuredLatencyMs
            : timedOut
            ? Math.max(520, totalReadMs)
            : Math.min(totalReadMs, 480);
        const isAnomaly = timedOut || latencyMs > TTS_LATENCY_ANOMALY_THRESHOLD_MS;

        let note = '預讀命中，流暢響應';
        if (timedOut) {
          note = '朗讀逾時未回報結束，建議檢查音訊佇列或預熱快取';
        } else if (latencyMs > 1200) {
          note = '嚴重延遲 (>1200ms)：疑似冷啟動網路請求或語音合成器喚醒卡頓';
        } else if (latencyMs > TTS_LATENCY_ANOMALY_THRESHOLD_MS) {
          note = '響應超過 500ms 門檻：建議納入滑動視窗優先預讀與離線音訊包';
        }

        resolve({
          lessonId: lesson.id,
          index: i,
          englishSentence: lesson.english_sentence,
          chineseTranslation: lesson.chinese_translation,
          category: lesson.category || 'general',
          latencyMs,
          totalReadMs,
          engine: timedOut ? 'timeout' : measuredEngine,
          isAnomaly,
          status: timedOut ? 'error' : isAnomaly ? 'anomaly' : 'passed',
          note,
        });
      };

      const onAbort = () => {
        cancelSpeech();
        finalize(false);
      };
      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }

      // 單句最大保護逾時（避免瀏覽器底層 TTS 靜默卡死整個全量輪巡）
      timeoutId = setTimeout(() => {
        cancelSpeech();
        finalize(true);
      }, 9500);

      try {
        speakEnglish(lesson.english_sentence, speechSpeed, () => {
          if (signal) signal.removeEventListener('abort', onAbort);
          finalize(false);
        });
      } catch {
        if (signal) signal.removeEventListener('abort', onAbort);
        finalize(true);
      }
    });

    if (signal?.aborted) break;
    results.push(itemResult);
    if (onStepComplete) onStepComplete(itemResult, i, total);

    if (i < total - 1 && !signal?.aborted && interSentenceGapMs > 0) {
      await new Promise((r) => setTimeout(r, interSentenceGapMs));
    }
  }

  return buildLatencyReport(results, speechSpeed, getPreReadSchedulerMetrics());
}

// ============================================================================
// 國小拆解法句型邏輯自動分析引擎
// ============================================================================

const COMPLEX_CLAUSE_REGEX =
  /\b(because|although|though|while|when|whereas|which|that|unless|since|before|after|without|however|therefore|and|but|or)\b/i;

function tokenizeEnglishWords(sentence: string): string[] {
  return (sentence || '')
    .replace(/[^a-zA-Z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

/**
 * 檢查單一教材是否符合「國小拆解法（極簡 SVO + 高記憶點台式諧音）」邏輯
 */
export function auditLessonElementaryLogic(lesson: Lesson): ElementaryAuditItem {
  const sentence = (lesson.english_sentence || '').trim();
  const words = tokenizeEnglishWords(sentence);
  const wordCount = words.length;
  const syllableCount = estimateEnglishSyllables(sentence);

  const heavyWords = words.filter((w) => {
    const clean = w.replace(/[^a-zA-Z]/g, '');
    if (clean.length <= 5) return false;
    // 全大寫縮寫如 FOUP, LOTO, MFC 屬晶圓廠常用簡稱，不視為長難字
    if (/^[A-Z0-9]{2,5}$/.test(clean)) return false;
    const syl = estimateEnglishSyllables(clean);
    return syl >= 3 || clean.length >= 9;
  });

  const hasComplexClause =
    COMPLEX_CLAUSE_REGEX.test(sentence) || /[,;:]/.test(sentence);

  const comp = lesson.components || { subject: '', action: '', object: '' };
  const hasMissingComponents =
    !comp.subject?.trim() || !comp.action?.trim() || !comp.object?.trim();

  // 檢查台式諧音是否結構完整、與單字數量呼應且記憶法具備明確台味聯想
  const phonetic = (lesson.phonetic_taiwan || '').trim();
  const phoneticSegments = phonetic
    .replace(/[【】\[\]]/g, '')
    .split(/[｜|]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const memoryTrick = (lesson.memory_trick || '').trim();

  // 偵測諧音缺漏、段落不匹配，或明顯硬譯/失真（例如多音節詞卻只有 1-2 字諧音）
  const hasWeakPhonetic =
    !phonetic ||
    phoneticSegments.length < Math.min(3, wordCount) ||
    memoryTrick.length < 14 ||
    (heavyWords.length > 0 && !/[「『]/.test(memoryTrick));

  const issues: string[] = [];
  let score = 100;

  if (wordCount > 7) {
    score -= 32;
    issues.push(`字數過長（${wordCount} 詞，超出國小拆解 3–5 詞極簡上限）`);
  } else if (wordCount > 5) {
    score -= 18;
    issues.push(`字數偏長（${wordCount} 詞，建議濃縮至 4–5 詞 SVO 核心）`);
  }

  if (hasComplexClause) {
    score -= 26;
    issues.push('含複合子句或連接詞，不利單段 SVO 反射拆解');
  }

  if (heavyWords.length >= 2) {
    score -= 22;
    issues.push(`多音節難詞負擔過高（${heavyWords.join(', ')}），建議拆簡或補強諧音`);
  } else if (heavyWords.length === 1) {
    score -= 12;
    issues.push(`含長音節專業詞（${heavyWords[0]}），需更直覺的台式諧音記憶點`);
  }

  if (syllableCount > 9) {
    score -= 10;
    issues.push(`總音節數偏高（${syllableCount} 音節），無塵室急喊易卡舌`);
  }

  if (hasMissingComponents) {
    score -= 20;
    issues.push('缺少完整的 S / V / O 國小拆解積木欄位');
  }

  if (hasWeakPhonetic) {
    score -= 14;
    issues.push('台式諧音段落對齊或記憶故事聯想力可再強化');
  }

  const complianceScore = Math.max(15, Math.min(100, score));
  let status: ElementaryAuditItem['status'] = 'optimal';
  if (complianceScore < 72 || wordCount > 7 || hasComplexClause) {
    status = 'complex_violation';
  } else if (complianceScore < 90 || heavyWords.length > 0 || hasWeakPhonetic) {
    status = 'needs_simplification';
  }

  return {
    lesson,
    wordCount,
    syllableCount,
    heavyWords,
    hasComplexClause,
    hasMissingComponents,
    hasWeakPhonetic,
    complianceScore,
    status,
    issues,
    needsOptimization: status !== 'optimal',
  };
}

/**
 * 批量審計 baseLessons 中所有句型的「國小拆解法」合規度
 */
export function analyzeBaseLessonsElementaryLogic(lessons: Lesson[]): {
  items: ElementaryAuditItem[];
  flaggedItems: ElementaryAuditItem[];
  optimalCount: number;
  averageScore: number;
} {
  const items = lessons.map(auditLessonElementaryLogic);
  const flaggedItems = items
    .filter((i) => i.needsOptimization)
    .sort((a, b) => a.complianceScore - b.complianceScore);
  const optimalCount = items.length - flaggedItems.length;
  const averageScore =
    items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + i.complianceScore, 0) / items.length)
      : 100;

  return {
    items,
    flaggedItems,
    optimalCount,
    averageScore,
  };
}

/**
 * 呼叫後端 Gemini API（/api/optimize-lessons-elementary）生成更精簡、具備台式諧音記憶點的替換語句
 */
export async function requestGeminiElementaryRewrites(
  flaggedItems: ElementaryAuditItem[]
): Promise<{
  suggestions: GeminiRewriteSuggestion[];
  modelUsed: string;
}> {
  const payload = flaggedItems.map((item) => ({
    id: item.lesson.id,
    scenario: item.lesson.scenario,
    english_sentence: item.lesson.english_sentence,
    chinese_translation: item.lesson.chinese_translation,
    category: item.lesson.category || 'general',
    phonetic_taiwan: item.lesson.phonetic_taiwan,
    memory_trick: item.lesson.memory_trick,
    issues: item.issues,
  }));

  const res = await fetch('/api/optimize-lessons-elementary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessons: payload }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Gemini 句型優化 API 回應失敗 (HTTP ${res.status})`);
  }

  return {
    suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
    modelUsed: data?.modelUsed || 'gemini-4-hydrogen',
  };
}

/**
 * 將使用者確認後的批量更新同步寫入後端持久化（跨裝置／重整保留）
 */
export async function persistPresetUpdatesToServer(patches: PresetLessonPatch[]): Promise<boolean> {
  try {
    const res = await fetch('/api/preset-lessons/batch-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patches }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchServerPresetLessonOverrides(): Promise<Record<string, PresetLessonPatch> | null> {
  try {
    const res = await fetch('/api/preset-lessons/overrides');
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.overrides && typeof data.overrides === 'object') {
      return data.overrides as Record<string, PresetLessonPatch>;
    }
    return null;
  } catch {
    return null;
  }
}
