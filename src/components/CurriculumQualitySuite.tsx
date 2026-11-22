import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
  Wand2,
  Zap,
  CheckSquare,
  ShieldCheck,
} from 'lucide-react';
import type { Lesson } from '../types';
import {
  TTS_LATENCY_ANOMALY_THRESHOLD_MS,
  type LatencyReport,
  type TtsStressTestItemResult,
  type GeminiRewriteSuggestion,
  runFullBaseLessonsTtsStressTest,
  loadSavedLatencyReports,
  formatLatencyReportMarkdown,
  analyzeBaseLessonsElementaryLogic,
  requestGeminiElementaryRewrites,
  persistPresetUpdatesToServer,
} from '../utils/curriculumAuditEngine';
import {
  applyPresetLessonBatchUpdates,
  loadPresetLessonOverrides,
  resetPresetLessonOverrides,
  type PresetLessonPatch,
} from '../data/presetLessons';
import { getPreReadSchedulerMetrics, speakEnglish, cancelSpeech } from '../utils/speech';
import { playClickSound, playSuccessChime } from '../utils/audioEffects';

interface CurriculumQualitySuiteProps {
  baseLessons: Lesson[];
  speechSpeed: number;
}

export const CurriculumQualitySuite: React.FC<CurriculumQualitySuiteProps> = ({
  baseLessons,
  speechSpeed,
}) => {
  const [activeSuiteTab, setActiveSuiteTab] = useState<'stress' | 'elementary'>('stress');

  // --- Tab 1: Full Curriculum TTS Latency Stress Test & Latency-Report ---
  const [isStressRunning, setIsStressRunning] = useState(false);
  const [stressProgress, setStressProgress] = useState<{ current: number; total: number; currentSentence: string }>({
    current: 0,
    total: 0,
    currentSentence: '',
  });
  const [liveResults, setLiveResults] = useState<TtsStressTestItemResult[]>([]);
  const [latestReport, setLatestReport] = useState<LatencyReport | null>(() => {
    const saved = loadSavedLatencyReports();
    return saved.length > 0 ? saved[0] : null;
  });
  const [schedulerMetrics, setSchedulerMetrics] = useState(() => getPreReadSchedulerMetrics());
  const stressAbortRef = useRef<AbortController | null>(null);

  // --- Tab 2: Elementary Decomposition Audit & Gemini Rewrite + Batch Preset Update ---
  const auditSummary = useMemo(() => analyzeBaseLessonsElementaryLogic(baseLessons), [baseLessons]);
  const [selectedAuditIds, setSelectedAuditIds] = useState<Set<string>>(() => {
    return new Set(auditSummary.flaggedItems.slice(0, 10).map((i) => i.lesson.id));
  });
  const [isGeneratingRewrites, setIsGeneratingRewrites] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [rewriteSuggestions, setRewriteSuggestions] = useState<GeminiRewriteSuggestion[]>([]);
  const [rewriteModelUsed, setRewriteModelUsed] = useState<string | null>(null);
  const [approvedSuggestionIds, setApprovedSuggestionIds] = useState<Set<string>>(new Set());
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);
  const [batchUpdateFeedback, setBatchUpdateFeedback] = useState<string | null>(null);
  const [overrideCount, setOverrideCount] = useState<number>(
    () => Object.keys(loadPresetLessonOverrides()).length
  );

  // Keep default selection aligned when baseLessons refreshes (if user hasn't generated suggestions yet)
  useEffect(() => {
    if (rewriteSuggestions.length === 0) {
      setSelectedAuditIds(new Set(auditSummary.flaggedItems.slice(0, 10).map((i) => i.lesson.id)));
    }
    setOverrideCount(Object.keys(loadPresetLessonOverrides()).length);
  }, [auditSummary.flaggedItems.length, baseLessons.length]);

  useEffect(() => {
    return () => {
      stressAbortRef.current?.abort();
    };
  }, []);

  const handleStartFullStressTest = async () => {
    if (isStressRunning || baseLessons.length === 0) return;
    playClickSound();
    const controller = new AbortController();
    stressAbortRef.current = controller;

    setIsStressRunning(true);
    setLiveResults([]);
    setStressProgress({
      current: 0,
      total: baseLessons.length,
      currentSentence: baseLessons[0]?.english_sentence || '',
    });

    try {
      const report = await runFullBaseLessonsTtsStressTest({
        lessons: baseLessons,
        speechSpeed,
        signal: controller.signal,
        interSentenceGapMs: 110,
        onStepStart: (lesson, index, total) => {
          setStressProgress({
            current: index + 1,
            total,
            currentSentence: lesson.english_sentence,
          });
        },
        onStepComplete: (result) => {
          setLiveResults((prev) => [...prev, result]);
          setSchedulerMetrics(getPreReadSchedulerMetrics());
        },
      });
      setLatestReport(report);
      setSchedulerMetrics(report.schedulerMetrics);
      if (!controller.signal.aborted) {
        playSuccessChime();
      }
    } finally {
      stressAbortRef.current = null;
      setIsStressRunning(false);
    }
  };

  const handleStopStressTest = () => {
    playClickSound();
    stressAbortRef.current?.abort();
    cancelSpeech();
  };

  const handleDownloadLatencyReport = (format: 'md' | 'json') => {
    if (!latestReport) return;
    playClickSound();
    const content =
      format === 'md'
        ? formatLatencyReportMarkdown(latestReport)
        : JSON.stringify(latestReport, null, 2);
    const mime = format === 'md' ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${latestReport.reportId}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleAuditSelection = (lessonId: string) => {
    playClickSound();
    setSelectedAuditIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        if (next.size >= 12) return next;
        next.add(lessonId);
      }
      return next;
    });
  };

  const handleSelectAllFlagged = () => {
    playClickSound();
    const pool =
      auditSummary.flaggedItems.length > 0
        ? auditSummary.flaggedItems.slice(0, 12)
        : auditSummary.items.slice(0, 8);
    setSelectedAuditIds(new Set(pool.map((i) => i.lesson.id)));
  };

  const handleGenerateGeminiRewrites = async () => {
    const chosen = auditSummary.items.filter((i) => selectedAuditIds.has(i.lesson.id)).slice(0, 12);
    if (chosen.length === 0) {
      setRewriteError('請先勾選至少 1 句欲優化的教材句型。');
      return;
    }

    playClickSound();
    setIsGeneratingRewrites(true);
    setRewriteError(null);
    setBatchUpdateFeedback(null);

    try {
      const { suggestions, modelUsed } = await requestGeminiElementaryRewrites(chosen);
      setRewriteSuggestions(suggestions);
      setRewriteModelUsed(modelUsed);
      setApprovedSuggestionIds(new Set(suggestions.map((s) => s.lessonId)));
      playSuccessChime();
    } catch (err: any) {
      setRewriteError(err?.message || '呼叫 Gemini API 生成替換語句失敗，請稍後重試。');
    } finally {
      setIsGeneratingRewrites(false);
    }
  };

  const toggleApprovedSuggestion = (lessonId: string) => {
    playClickSound();
    setApprovedSuggestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  const handleConfirmBatchUpdatePresetLessons = async () => {
    const approved = rewriteSuggestions.filter((s) => approvedSuggestionIds.has(s.lessonId));
    if (approved.length === 0) return;

    playClickSound();
    setIsApplyingBatch(true);
    setBatchUpdateFeedback(null);

    const lessonLookup = new Map(baseLessons.map((l) => [l.id, l]));
    const patches: PresetLessonPatch[] = approved.map((s) => {
      const orig = lessonLookup.get(s.lessonId);
      return {
        id: s.lessonId,
        english_sentence: s.simplifiedSentence,
        chinese_translation: s.chinese_translation,
        components: s.components,
        phonetic_taiwan: s.phonetic_taiwan,
        memory_trick: s.memory_trick,
        additional_context: s.additional_context,
        scenario: orig?.scenario,
        category: orig?.category || 'shift-handover',
      };
    });

    const { updatedCount, overrides } = applyPresetLessonBatchUpdates(patches);
    const serverSaved = await persistPresetUpdatesToServer(patches);
    setOverrideCount(Object.keys(overrides).length);
    setIsApplyingBatch(false);
    playSuccessChime();

    setBatchUpdateFeedback(
      `已確認並批量更新 ${updatedCount} 句教材至 presetLessons（${
        serverSaved ? '本地與雲端覆寫檔皆已同步持久化' : '已寫入本地持久化並即時生效'
      }），全站課程與發音快取已同步更新！`
    );
    setRewriteSuggestions([]);
    setApprovedSuggestionIds(new Set());
  };

  const handleResetOverrides = async () => {
    playClickSound();
    resetPresetLessonOverrides();
    setOverrideCount(0);
    setBatchUpdateFeedback('已還原為預設初始 presetLessons 教材清單。');
  };

  const displayedStressRows = isStressRunning ? liveResults : latestReport?.allResults || [];
  const anomalyRows = displayedStressRows.filter((r) => r.isAnomaly);

  return (
    <div className="bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl shadow-cyan-950/20">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 shrink-0">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2 flex-wrap">
              <span>全量教材發音壓測 ✕ 國小拆解法 AI 審計中心</span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/35 text-[10px] font-mono font-bold text-cyan-300">
                baseLessons: {baseLessons.length} 句
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              自動輪巡朗讀量測 TTS 響應時間（&gt;500ms 自動建立 Latency-Report），並以 Gemini API 精簡複雜句型與強化台式諧音記憶點
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveSuiteTab('stress');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSuiteTab === 'stress'
                ? 'bg-cyan-400 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>全量發音壓測</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveSuiteTab('elementary');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSuiteTab === 'elementary'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>國小拆解 AI 審計</span>
            {auditSummary.flaggedItems.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  activeSuiteTab === 'elementary'
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {auditSummary.flaggedItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: FULL CURRICULUM TTS STRESS TEST & LATENCY-REPORT               */}
      {/* ===================================================================== */}
      {activeSuiteTab === 'stress' && (
        <div className="space-y-3.5">
          {/* Pre-Read Scheduler Optimization Telemetry Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold">預讀滑動視窗</div>
              <div className="font-mono font-black text-cyan-300 text-sm mt-0.5 tabular-nums">
                Window = {schedulerMetrics.slidingWindowSize} 句
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                已觸發 {schedulerMetrics.slidingWindowPreloads} 次預載
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold">IDB 快取極速直昇</div>
              <div className="font-mono font-black text-emerald-300 text-sm mt-0.5 tabular-nums">
                {schedulerMetrics.idbFastPromotions} 次
              </div>
              <div className="text-[10px] text-slate-500">免重抓網路 (&lt;5ms)</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold">延遲自適應排程</div>
              <div className="font-mono font-black text-amber-300 text-sm mt-0.5 tabular-nums">
                EWMA {schedulerMetrics.ewmaLatencyMs}ms
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                併發 {schedulerMetrics.adaptiveConcurrency} · 禮讓 {schedulerMetrics.foregroundYields} 次
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold">異常判定門檻</div>
              <div className="font-mono font-black text-rose-300 text-sm mt-0.5 tabular-nums">
                &gt; {TTS_LATENCY_ANOMALY_THRESHOLD_MS} ms
              </div>
              <div className="text-[10px] text-slate-500">自動生成 Latency-Report</div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {!isStressRunning ? (
              <button
                type="button"
                onClick={handleStartFullStressTest}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-950/40 cursor-pointer active:scale-[0.99] transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  啟動全量教材發音壓力測試（自動輪巡朗讀全部 {baseLessons.length} 句）
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopStressTest}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>
                  中止輪巡並即刻產出 Latency-Report ({stressProgress.current}/{stressProgress.total})
                </span>
              </button>
            )}

            {latestReport && !isStressRunning && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadLatencyReport('md')}
                  className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>匯出 Latency-Report (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadLatencyReport('json')}
                  className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
              </div>
            )}
          </div>

          {/* Active Patrol Progress Bar */}
          {isStressRunning && (
            <div className="p-3 rounded-xl bg-slate-950 border border-cyan-400/50 space-y-2">
              <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                <span className="text-cyan-300 font-black flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>正在朗讀第 {stressProgress.current} / {stressProgress.total} 句</span>
                </span>
                <span className="font-mono text-[11px] text-amber-300 tabular-nums">
                  已偵測 &gt;500ms 異常：{anomalyRows.length} 句
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-150"
                  style={{
                    width: `${
                      stressProgress.total > 0
                        ? Math.round((stressProgress.current / stressProgress.total) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs font-mono text-slate-200 truncate">
                <Volume2 className="w-3.5 h-3.5 inline mr-1.5 text-emerald-400" />
                {stressProgress.currentSentence}
              </p>
            </div>
          )}

          {/* Generated Latency-Report Summary Card */}
          {latestReport && !isStressRunning && (
            <div className="p-3.5 rounded-xl bg-slate-950/95 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono font-black text-[11px]">
                    {latestReport.reportType}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{latestReport.reportId}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {new Date(latestReport.generatedAt).toLocaleString('zh-TW')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">全量測試句數</div>
                  <div className="text-base font-black font-mono text-slate-100 tabular-nums">
                    {latestReport.totalTested} 句
                  </div>
                </div>
                <div
                  className={`p-2 rounded-lg border ${
                    latestReport.anomalyCount > 0
                      ? 'bg-rose-950/40 border-rose-500/50'
                      : 'bg-emerald-950/40 border-emerald-500/40'
                  }`}
                >
                  <div className="text-[10px] text-slate-300">&gt;500ms 異常句數</div>
                  <div
                    className={`text-base font-black font-mono tabular-nums ${
                      latestReport.anomalyCount > 0 ? 'text-rose-300' : 'text-emerald-300'
                    }`}
                  >
                    {latestReport.anomalyCount} 句 ({latestReport.passRatePct}% 達標)
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">平均 / P95 響應</div>
                  <div className="text-base font-black font-mono text-cyan-300 tabular-nums">
                    {latestReport.averageLatencyMs} / {latestReport.p95LatencyMs}ms
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">最高單句延遲</div>
                  <div
                    className={`text-base font-black font-mono tabular-nums ${
                      latestReport.maxLatencyMs > 500 ? 'text-amber-300' : 'text-emerald-300'
                    }`}
                  >
                    {latestReport.maxLatencyMs}ms
                  </div>
                </div>
              </div>

              {/* Anomaly Table (> 500ms) */}
              {latestReport.anomalies.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>偵測到 {latestReport.anomalies.length} 句響應大於 500ms 的異常句子</span>
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {latestReport.anomalies.map((item) => (
                      <div
                        key={`${item.lessonId}-${item.index}`}
                        className="p-2.5 rounded-lg bg-rose-950/25 border border-rose-500/35 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-slate-100 truncate">
                            [{item.lessonId}] {item.englishSentence}
                          </div>
                          <div className="text-[10px] text-rose-200/80 mt-0.5">{item.note}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-black tabular-nums">
                            {item.latencyMs}ms
                          </span>
                          <button
                            type="button"
                            onClick={() => speakEnglish(item.englishSentence, speechSpeed)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 cursor-pointer"
                            title="重聽驗證預讀命中"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-lg bg-emerald-950/35 border border-emerald-500/35 text-xs text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    全量 {latestReport.totalTested} 句教材皆在 500ms 內響應完成，滑動視窗預讀排程運作極佳！
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Live / Full Per-Sentence Latency Stream */}
          {displayedStressRows.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-950/80 border border-slate-800 divide-y divide-slate-800/80">
              {displayedStressRows.map((row) => (
                <div
                  key={`${row.lessonId}-${row.index}`}
                  className="px-3 py-1.5 flex items-center justify-between gap-2 text-[11px]"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="font-mono text-slate-500 w-6 shrink-0">#{row.index + 1}</span>
                    <span className="font-mono text-slate-200 truncate">{row.englishSentence}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                    <span className="text-[10px] text-slate-500 uppercase">{row.engine}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        row.isAnomaly
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/35'
                          : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {row.latencyMs}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ELEMENTARY DECOMPOSITION AUDIT + GEMINI REWRITE + BATCH UPDATE */}
      {/* ===================================================================== */}
      {activeSuiteTab === 'elementary' && (
        <div className="space-y-3.5">
          {/* Elementary Audit KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold">審計句型總數</div>
              <div className="text-base font-black font-mono text-slate-100 tabular-nums">
                {auditSummary.items.length} 句
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30">
              <div className="text-[10px] text-emerald-300 font-bold">完全符合國小拆解</div>
              <div className="text-base font-black font-mono text-emerald-300 tabular-nums">
                {auditSummary.optimalCount} 句
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/40">
              <div className="text-[10px] text-amber-300 font-bold">建議精簡／強化諧音</div>
              <div className="text-base font-black font-mono text-amber-300 tabular-nums">
                {auditSummary.flaggedItems.length} 句
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/35">
              <div className="text-[10px] text-cyan-300 font-bold">平均拆解合規分</div>
              <div className="text-base font-black font-mono text-cyan-300 tabular-nums">
                {auditSummary.averageScore} / 100
              </div>
            </div>
          </div>

          {batchUpdateFeedback && (
            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-400/50 text-xs text-emerald-200 font-bold flex items-center justify-between gap-2 flex-wrap">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{batchUpdateFeedback}</span>
              </span>
              {overrideCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetOverrides}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>還原初始 presetLessons ({overrideCount})</span>
                </button>
              )}
            </div>
          )}

          {rewriteError && (
            <div className="px-3.5 py-2.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-xs text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{rewriteError}</span>
            </div>
          )}

          {/* Flagged & Selectable Sentences List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>
                  句型結構健檢清單（已勾選 {selectedAuditIds.size} / 上限 12 句送交 Gemini 優化）
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFlagged}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/35 text-[11px] font-bold cursor-pointer"
                >
                  一鍵勾選待優化句
                </button>
                {overrideCount > 0 && !batchUpdateFeedback && (
                  <button
                    type="button"
                    onClick={handleResetOverrides}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    已優化 {overrideCount} 句（還原）
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {[...auditSummary.items]
                .sort((a, b) => a.complianceScore - b.complianceScore)
                .map((item) => {
                  const isChecked = selectedAuditIds.has(item.lesson.id);
                  return (
                    <label
                      key={item.lesson.id}
                      className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-950/30 border-amber-400/50'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAuditSelection(item.lesson.id)}
                        className="mt-1 accent-amber-400 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-100">
                            {item.lesson.english_sentence}
                          </span>
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            <span className="text-slate-400">
                              {item.wordCount} 詞 · {item.syllableCount} 音節
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-black ${
                                item.status === 'complex_violation'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : item.status === 'needs_simplification'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-emerald-500/15 text-emerald-300'
                              }`}
                            >
                              {item.complianceScore} 分
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.lesson.chinese_translation} · {item.lesson.phonetic_taiwan}
                        </div>
                        {item.issues.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {item.issues.map((iss, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-200/90 border border-amber-500/25 text-[10px]"
                              >
                                {iss}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={isGeneratingRewrites || selectedAuditIds.size === 0}
              onClick={handleGenerateGeminiRewrites}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:brightness-110 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.99] transition-all"
            >
              {isGeneratingRewrites ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在透過 Gemini API 生成國小拆解精簡句與台式諧音記憶點...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    使用 Gemini API 生成精簡替換語句與台式諧音（已選 {selectedAuditIds.size} 句）
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Gemini Suggestions Diff Review & Batch Confirmation */}
          {rewriteSuggestions.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-400/60 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" />
                  <span>
                    Gemini 改寫審核清單（{rewriteSuggestions.length} 句 · 模型 {rewriteModelUsed || 'gemini-4-hydrogen'}）
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      setApprovedSuggestionIds(new Set(rewriteSuggestions.map((s) => s.lessonId)))
                    }
                    className="text-cyan-300 hover:underline font-bold cursor-pointer"
                  >
                    全選
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setApprovedSuggestionIds(new Set())}
                    className="text-slate-400 hover:underline font-bold cursor-pointer"
                  >
                    全取消
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {rewriteSuggestions.map((sug) => {
                  const approved = approvedSuggestionIds.has(sug.lessonId);
                  return (
                    <div
                      key={sug.lessonId}
                      className={`p-3 rounded-xl border space-y-2 text-xs transition-all ${
                        approved
                          ? 'bg-emerald-950/25 border-emerald-500/45'
                          : 'bg-slate-900/70 border-slate-800 opacity-65'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={approved}
                            onChange={() => toggleApprovedSuggestion(sug.lessonId)}
                            className="mt-1 accent-emerald-400 cursor-pointer"
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                              <span className="font-mono text-slate-500">[{sug.lessonId}]</span>
                              <span className="line-through text-rose-300/80 font-mono">
                                {sug.originalSentence}
                              </span>
                              <span className="text-slate-500">➔</span>
                              <span className="text-emerald-300 font-mono font-black text-sm">
                                {sug.simplifiedSentence}
                              </span>
                            </div>
                            <div className="text-slate-200 font-bold">
                              {sug.chinese_translation}
                              <span className="ml-2 text-amber-300 font-mono text-[11px]">
                                {sug.phonetic_taiwan}
                              </span>
                            </div>
                          </div>
                        </label>

                        <button
                          type="button"
                          onClick={() => speakEnglish(sug.simplifiedSentence, speechSpeed)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/35 shrink-0 cursor-pointer"
                          title="試聽新句發音"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="pl-6 space-y-1 text-[11px]">
                        <div className="text-amber-200 bg-amber-950/35 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                          <span className="font-black text-amber-300 mr-1.5">
                            台式諧音記憶點（{sug.taiwanMnemonicHighlight}）：
                          </span>
                          <span>{sug.memory_trick}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-300">
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25">
                            S: {sug.components.subject}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                            V: {sug.components.action}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25">
                            O: {sug.components.object}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {sug.improvementReason}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isApplyingBatch || approvedSuggestionIds.size === 0}
                  onClick={handleConfirmBatchUpdatePresetLessons}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.99] transition-all"
                >
                  {isApplyingBatch ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 fill-current" />
                  )}
                  <span>
                    確認並批量更新 presetLessons（套用已勾選 {approvedSuggestionIds.size} 句）
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setRewriteSuggestions([]);
                  }}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-xs cursor-pointer shrink-0"
                >
                  取消此次草稿
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
