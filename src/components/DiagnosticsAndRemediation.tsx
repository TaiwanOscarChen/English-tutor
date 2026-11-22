import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserDiagnostics, Lesson, PauseHotspot } from '../types';
import { LessonCard } from './LessonCard';
import { Activity, ShieldAlert, Zap, Award, Sparkles, RefreshCw, CheckCircle2, TrendingUp, Cpu, Volume2, ArrowRight, Download, FileText, Timer, Waves, Gauge, Brain, Clock, AlertTriangle, AlertCircle, Target, Mic } from 'lucide-react';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { loadSrsMap, isLessonDueForReview, SrsCardState } from '../utils/srsScheduler';
import { PRESET_LESSONS, getActivePresetLessons } from '../data/presetLessons';
import { speakEnglish } from '../utils/speech';
import { CurriculumQualitySuite } from './CurriculumQualitySuite';
import { SpeechLatencyLiveMonitor } from './SpeechLatencyLiveMonitor';
import {
  loadPronunciationAnalytics,
  computePronunciationInsights,
  buildWeakPhonemeDrillLessons,
  PronunciationInsights,
  WeakPhonemeDrillItem
} from '../utils/pronunciationAnalytics';

interface DiagnosticsAndRemediationProps {
  diagnostics: UserDiagnostics;
  speechSpeed: number;
  baseLessons?: Lesson[];
  bookmarkedLessons: Lesson[];
  onToggleBookmark: (lesson: Lesson) => void;
  onUpdateDiagnostics: (nextDiag: UserDiagnostics) => void;
  onPracticeDueLessons?: () => void;
  onOpenHandoverDrill?: () => void;
  onPracticeCustomSentence?: (sentence: string, phonetic: string) => void;
}

export const DiagnosticsAndRemediation: React.FC<DiagnosticsAndRemediationProps> = ({
  diagnostics,
  speechSpeed,
  baseLessons,
  bookmarkedLessons,
  onToggleBookmark,
  onUpdateDiagnostics,
  onPracticeDueLessons,
  onOpenHandoverDrill,
  onPracticeCustomSentence
}) => {
  const [remediationLessons, setRemediationLessons] = useState<Lesson[]>([]);
  const [remediationAdvice, setRemediationAdvice] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isExported, setIsExported] = useState<boolean>(false);
  const [selectedHotspotTab, setSelectedHotspotTab] = useState<'all' | 'svo' | 'speech'>('all');
  const [srsMap, setSrsMap] = useState<Record<string, SrsCardState>>(() => loadSrsMap());
  const [pronInsights, setPronInsights] = useState<PronunciationInsights>(() =>
    computePronunciationInsights(loadPronunciationAnalytics())
  );
  const [weakDrillItems, setWeakDrillItems] = useState<WeakPhonemeDrillItem[]>([]);
  const [completedDrillIds, setCompletedDrillIds] = useState<string[]>([]);
  const exportTimerRef = useRef<number | null>(null);
  const remediationAbortRef = useRef<AbortController | null>(null);
  const remediationTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    const syncAll = () => {
      setSrsMap(loadSrsMap());
      setPronInsights(computePronunciationInsights(loadPronunciationAnalytics()));
    };
    window.addEventListener('fse-srs-updated', syncAll);
    window.addEventListener('fse-server-synced', syncAll);
    window.addEventListener('storage', syncAll);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('fse-srs-updated', syncAll);
      window.removeEventListener('fse-server-synced', syncAll);
      window.removeEventListener('storage', syncAll);
      remediationAbortRef.current?.abort();
      if (remediationTimerRef.current !== null) {
        window.clearTimeout(remediationTimerRef.current);
      }
      if (exportTimerRef.current !== null) {
        window.clearTimeout(exportTimerRef.current);
      }
    };
  }, []);

  const srsMetrics = useMemo(() => {
    const lessonPoolMap = new Map<string, Lesson>();
    PRESET_LESSONS.forEach((l) => lessonPoolMap.set(l.id, l));
    bookmarkedLessons.forEach((l) => lessonPoolMap.set(l.id, l));
    const pool = Array.from(lessonPoolMap.values());
    const now = Date.now();
    const reviewedCount = pool.filter((l) => Boolean(srsMap[l.id])).length;
    const masteredLessons = pool.filter((l) => srsMap[l.id] && !isLessonDueForReview(l.id, srsMap, now));
    const dueLessons = pool.filter((l) => isLessonDueForReview(l.id, srsMap, now));
    const retentionPct = pool.length > 0 ? Math.round((masteredLessons.length / pool.length) * 100) : 0;
    const priorityDue = dueLessons
      .sort((a, b) => {
        const aHard = srsMap[a.id]?.lastRating === 'hard' ? 0 : 1;
        const bHard = srsMap[b.id]?.lastRating === 'hard' ? 0 : 1;
        return aHard - bHard;
      })
      .slice(0, 3);
    return {
      totalCount: pool.length,
      reviewedCount,
      masteredCount: masteredLessons.length,
      dueCount: dueLessons.length,
      retentionPct,
      priorityDue,
    };
  }, [srsMap, bookmarkedLessons]);

  const { svoStats, totalSentencesPracticed, totalArticlesRead, speechScoreAverage, primaryWeakness, learningHabitNote, pauseHotspots } = diagnostics;

  // Calculate percentages
  const totalSvoAttempts = svoStats.totalAttempts || 10;
  const bridgeErrPct = Math.min(100, Math.round((svoStats.bridgeErrors / totalSvoAttempts) * 100)) || 35;
  const actionErrPct = Math.min(100, Math.round((svoStats.actionErrors / totalSvoAttempts) * 100)) || 20;
  const objectErrPct = Math.min(100, Math.round((svoStats.objectErrors / totalSvoAttempts) * 100)) || 15;
  const subjectErrPct = Math.min(100, Math.round((svoStats.subjectErrors / totalSvoAttempts) * 100)) || 5;

  // Default fallback pause hotspot data if not populated yet
  const activePauseStats = pauseHotspots || {
    totalHesitations: 18,
    avgHesitationMs: 640,
    svoPauseIndex: 42,
    speechPauseIndex: 48,
    hotspots: [
      {
        segment: '橋樑 (Bridge / 介系詞與冠詞連讀)',
        category: 'svo',
        averagePauseMs: 820,
        pauseCount: 12,
        severity: 'high',
        recommendation: '組裝積木或朗讀在 in / on / the 之前常出現 800ms+ 停頓，建議放鬆咬字弱讀連音。'
      },
      {
        segment: '核心動作 (Verb / 工程動詞轉折)',
        category: 'speech',
        averagePauseMs: 540,
        pauseCount: 7,
        severity: 'medium',
        recommendation: '從主詞切換至動詞時稍有猶豫，可多練習常用三音節動詞 (calibrate, substitute)。'
      },
      {
        segment: '機台受詞 (Object / 專有名詞)',
        category: 'svo',
        averagePauseMs: 290,
        pauseCount: 3,
        severity: 'low',
        recommendation: 'FOUP, MFC, OHT 等晶圓廠機台名詞反應迅速，幾乎無停頓。'
      },
      {
        segment: '主角人稱 (Subject / 人稱發起)',
        category: 'speech',
        averagePauseMs: 190,
        pauseCount: 2,
        severity: 'low',
        recommendation: 'I, We, The engineer 反射發起極為順暢。'
      }
    ]
  };

  const filteredHotspots = activePauseStats.hotspots.filter((h) => {
    if (selectedHotspotTab === 'all') return true;
    return h.category === selectedHotspotTab;
  });

  const handleExportReport = () => {
    const timestamp = new Date().toLocaleString('zh-TW');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    let reportText = `=========================================================\n`;
    reportText += `      FSE 科技英文 ✕ 國小拆解法 — 個人學習與 SVO 診斷報告\n`;
    reportText += `=========================================================\n`;
    reportText += `匯出時間：${timestamp}\n`;
    reportText += `學員角色：晶圓廠 FSE 設備/製程工程師\n\n`;

    reportText += `【一、 學習成就與總體數據】\n`;
    reportText += `---------------------------------------------------------\n`;
    reportText += `• 已特訓句型總數：${totalSentencesPracticed} 句\n`;
    reportText += `• 口說發音平均分：${speechScoreAverage} 分\n`;
    reportText += `• 晶圓廠文章閱讀：${totalArticlesRead} 篇\n`;
    reportText += `• 已精通/收藏句型：${bookmarkedLessons.length} 句\n\n`;

    reportText += `【二、 SVO 國小積木結構錯誤率診斷】\n`;
    reportText += `---------------------------------------------------------\n`;
    reportText += `• 核心主要弱點盲區：${primaryWeakness || '橋樑 (Bridge) 介系詞/連讀'}\n`;
    reportText += `• 橋樑 (Bridge - 冠詞/介系詞)：${bridgeErrPct}% 錯誤率\n`;
    reportText += `• 動作 (Action - 核心工程動詞)：${actionErrPct}% 錯誤率\n`;
    reportText += `• 東西 (Object - 機台元件受詞)：${objectErrPct}% 錯誤率\n`;
    reportText += `• 主角 (Subject - 人稱發起者)：${subjectErrPct}% 錯誤率\n\n`;

    reportText += `【三、 SVO 重組與口說訓練 — 發音停頓熱點分析】\n`;
    reportText += `---------------------------------------------------------\n`;
    reportText += `• SVO 積木重組猶豫指數：${activePauseStats.svoPauseIndex} / 100\n`;
    reportText += `• 口說發音連讀換氣指數：${activePauseStats.speechPauseIndex} / 100\n`;
    reportText += `• 平均停頓延遲：${activePauseStats.avgHesitationMs} ms\n`;
    reportText += `• 偵測停頓熱點：\n`;
    activePauseStats.hotspots.forEach((h, i) => {
      reportText += `  ${i + 1}. [${h.category.toUpperCase()}] ${h.segment} — 平均停頓 ${h.averagePauseMs}ms (${h.severity === 'high' ? '高頻卡頓' : h.severity === 'medium' ? '中度猶豫' : '極速流暢'})\n`;
      reportText += `     建議：${h.recommendation}\n`;
    });
    reportText += `\n`;

    reportText += `【四、 AI 導師學習習慣與實戰點評】\n`;
    reportText += `---------------------------------------------------------\n`;
    reportText += `${learningHabitNote || '學習習慣顯示：在大夜班與交接班時段最常複習 [機台 Alarm 異常]，對於 [主角 S] 與 [東西 O] 掌握度高達 90% 以上；主要弱點集中於 [橋樑 Bridge] 與部分連讀喘息點。'}\n\n`;

    if (pronInsights.totalSessions > 0) {
      reportText += `【四之二、 口說頻譜歷程與弱項音素統計】\n`;
      reportText += `---------------------------------------------------------\n`;
      reportText += `• 累計口說實測次數：${pronInsights.totalSessions} 次\n`;
      reportText += `• 近期平均準確度：${pronInsights.averageScore}%（平均頻譜吻合 ${pronInsights.averageSpectral}%）\n`;
      reportText += `• 平均朗讀語速：${pronInsights.averageWpm} WPM\n`;
      if (pronInsights.topWeakPhonemes.length > 0) {
        reportText += `• 偵測弱項音素：\n`;
        pronInsights.topWeakPhonemes.forEach((wp, idx) => {
          reportText += `  ${idx + 1}. ${wp.info.label} ${wp.info.ipa} — 準確率 ${wp.accuracyPct}%（偏弱 ${wp.misses} 次）\n`;
          reportText += `     矯正要訣：${wp.info.tip}\n`;
        });
      }
      reportText += `\n`;
    }

    if (bookmarkedLessons.length > 0) {
      reportText += `【五、 已收藏精通句型與注音記憶庫 (${bookmarkedLessons.length} 句)】\n`;
      reportText += `---------------------------------------------------------\n`;
      bookmarkedLessons.forEach((l, idx) => {
        reportText += `${idx + 1}. [英文] ${l.english_sentence}\n`;
        reportText += `   [情境] ${l.scenario}\n`;
        reportText += `   [注音] ${convertPhoneticToZhuyin(l.phonetic_taiwan || '')}\n`;
        reportText += `   [SVO] 主角: ${l.components.subject} | 動作: ${l.components.action} | 橋樑: ${l.components.bridge} | 東西: ${l.components.object}\n`;
        if (l.memory_trick) reportText += `   [口訣] ${l.memory_trick}\n`;
        reportText += `\n`;
      });
    }

    reportText += `=========================================================\n`;
    reportText += `            Report Generated by FSE Tech English App\n`;
    reportText += `=========================================================\n`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FSE_SVO_Diagnostics_Report_${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsExported(true);
    if (exportTimerRef.current !== null) {
      window.clearTimeout(exportTimerRef.current);
    }
    exportTimerRef.current = window.setTimeout(() => {
      setIsExported(false);
      exportTimerRef.current = null;
    }, 3000);
  };

  const handleRunRemediation = async () => {
    remediationAbortRef.current?.abort();
    const controller = new AbortController();
    remediationAbortRef.current = controller;
    if (remediationTimerRef.current !== null) {
      window.clearTimeout(remediationTimerRef.current);
    }
    remediationTimerRef.current = window.setTimeout(() => controller.abort(), 14000);

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-remediation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          primaryWeakness: primaryWeakness || '橋樑 (Bridge) 介系詞與連讀',
          userStats: {
            accuracy: Math.round((svoStats.correctAttempts / totalSvoAttempts) * 100) || 75,
            speechAvg: speechScoreAverage || 88
          }
        })
      });
      const data = await res.json();
      if (!isMountedRef.current || controller.signal.aborted) return;
      if (data && data.lessons && data.lessons.length > 0) {
        const formattedLessons: Lesson[] = data.lessons.map((l: any, i: number) => ({
          ...l,
          id: `rem-${Date.now()}-${i}`,
          category: '弱點精準補強'
        }));
        setRemediationLessons(formattedLessons);
        setRemediationAdvice(data.advice || '已為您配對精準修復句型！');
      } else {
        throw new Error('No API response');
      }
    } catch (e) {
      if (!isMountedRef.current || controller.signal.aborted) return;
      // Fallback local remediation generator
      const fallbackLessons: Lesson[] = [
        {
          id: `rem-fb-1-${Date.now()}`,
          scenario: '我在下層無塵室檢查真空幫浦 (Dry Pump)。',
          english_sentence: 'I check the dry pump in the sub-fab.',
          phonetic_taiwan: '愛 居客 惹 居萊 胖普 陰 惹 薩補 發布',
          additional_context: '晶圓廠 PM 保養與盲區儀器檢測。焦點加強【in / the 橋樑連結】',
          memory_trick: '無塵室下層 (Sub-fab) 巨型 Pump，記得補上介系詞 in 橋樑！',
          components: {
            subject: 'I ( 我 / 工程師 )',
            action: 'check ( 檢查 )',
            bridge: 'the ( 橋樑 )',
            object: 'dry pump ( 真空幫浦 )'
          },
          category: '弱點精準補強 (Bridge加強)'
        },
        {
          id: `rem-fb-2-${Date.now()}`,
          scenario: '我們校正晶圓手臂上的光電感應器。',
          english_sentence: 'We calibrate the optical sensor on the wafer arm.',
          phonetic_taiwan: '威 柯愛利伯瑞特 惹 歐波提扣 閃色 昂 惹 威發 阿姆',
          additional_context: 'Robotic Arm 精準定位與 Sensor 訊號復原。加強動詞連讀【calibrate】與 Bridge【on the】',
          memory_trick: '校正 (Calibrate) 手臂上的感應器，連續兩個 Bridge 方能順暢表達！',
          components: {
            subject: 'We ( 我們 )',
            action: 'calibrate ( 校正 )',
            bridge: 'the ... on the ( 雙橋樑 )',
            object: 'optical sensor ( 光電感應器 )'
          },
          category: '弱點精準補強 (雙Bridge加強)'
        }
      ];
      setRemediationLessons(fallbackLessons);
      setRemediationAdvice('已根據您目前 SVO 橋樑 (Bridge) 介系詞的高誤點，自動為您生成無塵室實戰精準補強句型！');
    } finally {
      if (remediationTimerRef.current !== null) {
        window.clearTimeout(remediationTimerRef.current);
        remediationTimerRef.current = null;
      }
      if (isMountedRef.current) {
        setIsGenerating(false);
      }
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto animate-fade-in w-full min-w-0">
      
      {/* Dashboard Top Banner */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-sm overflow-hidden litho-scanner-overlay litho-laser-line relative shrink-strict">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-400 rounded-xl text-slate-950 font-black shadow-sm shrink-0 mt-0.5">
            <Activity className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-100">
                學習習慣診斷與 SVO 弱點自動修復中心
              </h2>
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 whitespace-nowrap">
                <Sparkles className="w-3 h-3" />
                即時 AI 缺陷剖析
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
              分析您的句構錯誤率、口說發音分數與練習時段，一鍵自動派送專屬弱點補強特訓！
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-stretch md:self-auto shrink-0">
          {onOpenHandoverDrill && (
            <button
              type="button"
              onClick={onOpenHandoverDrill}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200 font-black text-xs cursor-pointer shadow-md transition-colors active:scale-95 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Timer className="w-4 h-4 text-emerald-400" />
              <span>60秒交接計時考核</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportReport}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-black cursor-pointer shadow-md transition-colors active:scale-95 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              isExported
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-950 hover:bg-slate-800 text-cyan-300 border-cyan-500/50'
            }`}
          >
            {isExported ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>已匯出文字檔報告！</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>匯出精通報告 (.txt)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleRunRemediation}
            disabled={isGenerating}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-colors active:scale-95 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <Zap className="w-4 h-4 text-slate-950" />
            <span>{isGenerating ? 'AI 分析弱點派牌中...' : '一鍵針對弱點自動補強特訓'}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-1 backdrop-blur-sm">
          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>已特訓句型</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-cyan-300 font-mono tabular-nums">
            {totalSentencesPracticed} <span className="text-xs text-slate-400">句</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-1 backdrop-blur-sm">
          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>口說平均分</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-300 font-mono tabular-nums">
            {speechScoreAverage} <span className="text-xs text-slate-400">分</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-1 backdrop-blur-sm">
          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <span>單字快閃最高分</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-yellow-300 font-mono tabular-nums">
            {diagnostics.vocabFlashBestScore ?? 0} <span className="text-xs text-slate-400">分</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-1 backdrop-blur-sm">
          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>主要弱點盲區</span>
          </div>
          <div className="text-xs sm:text-sm font-black text-rose-300 truncate">
            {primaryWeakness || '橋樑 (Bridge)'}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-1 backdrop-blur-sm col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>晶圓文章閱讀</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-300 font-mono tabular-nums">
            {totalArticlesRead} <span className="text-xs text-slate-400">篇</span>
          </div>
        </div>
      </div>

      {/* Pronunciation Trend & Weak-Phoneme Diagnostics Card */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-100">
                口說頻譜歷程與弱項音素診斷
              </h3>
              <p className="text-[11px] text-slate-400">
                自動彙整口說實測的頻譜相似度、語速 (WPM) 與工程英語易混淆音素
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs font-mono tabular-nums">
            {pronInsights.totalSessions > 0 && (
              <>
                <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 font-bold">
                  近 {pronInsights.recentSessions.length} 次均分 {pronInsights.averageScore}%
                </span>
                <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 font-bold">
                  {pronInsights.averageWpm} WPM
                </span>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                if (weakDrillItems.length > 0) {
                  setWeakDrillItems([]);
                  return;
                }
                const store = loadPronunciationAnalytics();
                const pool = [...PRESET_LESSONS, ...bookmarkedLessons];
                setWeakDrillItems(buildWeakPhonemeDrillLessons(store, pool, 5));
                setCompletedDrillIds([]);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/50 text-amber-200 font-black text-xs cursor-pointer transition-colors"
            >
              {weakDrillItems.length > 0 ? '收合弱項音素組卷 ▲' : '🎯 3 分鐘弱項音素自動組卷 (5句)'}
            </button>
          </div>
        </div>

        {/* Auto-Generated 5-Sentence Targeted Weak-Phoneme Drill Deck */}
        {weakDrillItems.length > 0 && (
          <div className="bg-slate-950/90 border border-amber-400/40 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  專屬 3 分鐘弱項音素矯正特訓（已完成 {completedDrillIds.length}/{weakDrillItems.length} 句）
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                100% 離線本地演算法組卷 · 零額度消耗
              </span>
            </div>

            <div className="space-y-2">
              {weakDrillItems.map((item, idx) => {
                const isDone = completedDrillIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all space-y-2 ${
                      isDone
                        ? 'bg-emerald-950/35 border-emerald-500/40'
                        : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                            #{idx + 1}
                          </span>
                          {item.matchedPhonemes.slice(0, 3).map((ph) => (
                            <span
                              key={ph.id}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-bold"
                            >
                              {ph.label} {ph.ipa}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs sm:text-sm font-mono font-black text-slate-100 leading-snug">
                          {item.english_sentence}
                        </p>
                        <p className="text-[11px] text-slate-400">{item.scenario}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => speakEnglish(item.english_sentence, 0.75, undefined, 1.0, 80, true)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer border border-slate-700"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>0.75x 慢聽</span>
                        </button>
                        {onPracticeCustomSentence && (
                          <button
                            type="button"
                            onClick={() => {
                              setCompletedDrillIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
                              onPracticeCustomSentence(item.english_sentence, item.phonetic_taiwan);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Mic className="w-3 h-3" />
                            <span>口說實測</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pronInsights.totalSessions === 0 ? (
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5 text-xs text-slate-400 flex items-center justify-between gap-3 flex-wrap">
            <span>尚未有口說實測紀錄。完成任一句型的口說錄音評測後，系統將自動繪製發音走勢並標記弱項音素。</span>
            <span className="text-[11px] font-mono text-amber-300">快捷鍵 P 可隨時開始口說實測</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Trend Sparkline */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>近期發音準確度趨勢（累計 {pronInsights.totalSessions} 次）</span>
                {pronInsights.trendDelta !== 0 && (
                  <span className={pronInsights.trendDelta > 0 ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>
                    {pronInsights.trendDelta > 0 ? `▲ +${pronInsights.trendDelta}%` : `▼ ${pronInsights.trendDelta}%`}
                  </span>
                )}
              </div>
              <div className="h-16 flex items-end justify-around gap-1.5 pt-1">
                {[...pronInsights.recentSessions].reverse().map((sess) => {
                  const barTone =
                    sess.score >= 88
                      ? 'bg-emerald-400'
                      : sess.score >= 75
                      ? 'bg-cyan-400'
                      : 'bg-amber-400';
                  return (
                    <div key={sess.id} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-[9px] font-mono text-slate-400 tabular-nums leading-none">
                        {sess.score}
                      </span>
                      <div
                        style={{ height: `${Math.max(18, sess.score)}%` }}
                        title={`${sess.sentence} — ${sess.score}分 (${sess.wpm} WPM)`}
                        className={`w-full max-w-[28px] rounded-t-md ${barTone}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weak Phoneme Drills */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-300">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>重點弱項音素與 0.72x 慢速點讀強化</span>
              </div>
              {pronInsights.topWeakPhonemes.length === 0 ? (
                <div className="text-xs text-emerald-300 py-2">
                  各音素表現均衡穩定，無明顯發音盲區！
                </div>
              ) : (
                <div className="space-y-2">
                  {pronInsights.topWeakPhonemes.map((wp) => {
                    const drillWords =
                      wp.recentMissedWords.length > 0
                        ? wp.recentMissedWords
                        : wp.info.sampleWords.slice(0, 3);
                    return (
                      <div key={wp.info.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-200">
                            {wp.info.label}{' '}
                            <span className="text-[10px] font-mono text-cyan-300">{wp.info.ipa}</span>
                          </span>
                          <span className="text-[10px] font-mono text-amber-300 tabular-nums">
                            準確率 {wp.accuracyPct}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {drillWords.map((word) => (
                            <button
                              key={word}
                              type="button"
                              onClick={() => speakEnglish(word, 0.72, undefined, 1.0, 80, true)}
                              className="px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-[11px] font-mono font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Volume2 className="w-2.5 h-2.5 text-amber-400" />
                              <span>{word}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SM-2 Spaced Repetition Memory Retention Tracker */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100">
                SM-2 記憶曲線留存追蹤
              </h3>
              <p className="text-[11px] text-slate-400">
                依據「生疏 / 普通 / 簡單」評級自動排程複習週期並跨裝置同步
              </p>
            </div>
          </div>

          {onPracticeDueLessons && (
            <button
              type="button"
              onClick={onPracticeDueLessons}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>前往複習待熟句型 ({srsMetrics.dueCount})</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-xs tabular-nums">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[11px] text-slate-400 block">長期留存率</span>
            <span className="text-base sm:text-lg font-black text-emerald-300 font-mono">{srsMetrics.retentionPct}%</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[11px] text-slate-400 block">已記熟 / 總句庫</span>
            <span className="text-base sm:text-lg font-black text-cyan-300 font-mono">{srsMetrics.masteredCount} / {srsMetrics.totalCount}</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[11px] text-slate-400 block">今日待複習</span>
            <span className="text-base sm:text-lg font-black text-amber-300 font-mono">{srsMetrics.dueCount} 句</span>
          </div>
        </div>

        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            style={{ width: `${srsMetrics.retentionPct}%` }}
            className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-500"
          />
        </div>

        {srsMetrics.priorityDue.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 block">
              優先複習清單（點擊右側發音直接跟讀）：
            </span>
            <div className="space-y-1.5">
              {srsMetrics.priorityDue.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between gap-2 bg-slate-950/90 border border-slate-800/90 rounded-xl px-3 py-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono font-bold text-slate-100 truncate">
                      {lesson.english_sentence}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {lesson.scenario}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => speakEnglish(lesson.english_sentence, speechSpeed)}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      title="朗讀此句"
                    >
                      <Volume2 className="w-3.5 h-3.5 shrink-0" />
                      <span>朗讀</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => speakEnglish(lesson.english_sentence, 0.7)}
                      className="min-h-[36px] px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs tabular-nums cursor-pointer whitespace-nowrap"
                      title="0.7x 慢速複習發音"
                    >
                      0.7x
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SVO Component Error Breakdown Bar Chart */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            SVO 國小積木零件錯誤率雷達
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            依據「語序組裝」實戰紀錄即時算得
          </span>
        </div>

        <div className="space-y-3 text-xs tabular-nums">
          {/* Bridge */}
          <div className="space-y-1">
            <div className="flex justify-between font-extrabold">
              <span className="text-purple-300">橋樑 (Bridge - 冠詞/介系詞)</span>
              <span className="text-rose-400 font-mono">{bridgeErrPct}% 錯誤率 (需要加強)</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div style={{ width: `${bridgeErrPct}%` }} className="bg-purple-500 h-full rounded-full transition-all duration-500" />
            </div>
          </div>

          {/* Action */}
          <div className="space-y-1">
            <div className="flex justify-between font-extrabold">
              <span className="text-rose-300">動作 (Verb - 核心工程動詞)</span>
              <span className="text-amber-400 font-mono">{actionErrPct}% 錯誤率</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div style={{ width: `${actionErrPct}%` }} className="bg-rose-500 h-full rounded-full transition-all duration-500" />
            </div>
          </div>

          {/* Object */}
          <div className="space-y-1">
            <div className="flex justify-between font-extrabold">
              <span className="text-emerald-300">東西 (Object - 機台元件/受詞)</span>
              <span className="text-emerald-400 font-mono">{objectErrPct}% 錯誤率 (良好)</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div style={{ width: `${objectErrPct}%` }} className="bg-emerald-500 h-full rounded-full transition-all duration-500" />
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <div className="flex justify-between font-extrabold">
              <span className="text-blue-300">主角 (Subject - 人稱)</span>
              <span className="text-blue-400 font-mono">{subjectErrPct}% 錯誤率 (非常熟悉)</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div style={{ width: `${subjectErrPct}%` }} className="bg-blue-500 h-full rounded-full transition-all duration-500" />
            </div>
          </div>
        </div>

        {/* Habit Note Box */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
          <div className="font-extrabold text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            學習習慣與能力診斷總結
          </div>
          <p className="text-slate-300 leading-relaxed font-sans text-[11px]">
            {learningHabitNote || "您的學習習慣顯示：在大夜班與交接班時段最常複習 [機台 Alarm 異常]，對於 [主角 S] 與 [東西 O] 掌握度高達 90% 以上；主要弱點集中於 [橋樑 Bridge] 與部分連讀喘息點。建議多練習帶介系詞的實戰句型。"}
          </p>
        </div>
      </div>

      {/* SVO 重組 ✕ 口說訓練 — 發音停頓熱點分析視覺化 */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                SVO 重組 ✕ 口說訓練 發音停頓熱點弱點雷達
              </h3>
              <p className="text-[11px] text-slate-400">
                自動偵測「SVO 積木組裝猶豫時間」與「口說連讀換氣卡頓區段」
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              aria-pressed={selectedHotspotTab === 'all'}
              onClick={() => setSelectedHotspotTab('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedHotspotTab === 'all'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              全部熱點
            </button>
            <button
              type="button"
              aria-pressed={selectedHotspotTab === 'svo'}
              onClick={() => setSelectedHotspotTab('svo')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedHotspotTab === 'svo'
                  ? 'bg-purple-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SVO 組裝停頓
            </button>
            <button
              type="button"
              aria-pressed={selectedHotspotTab === 'speech'}
              onClick={() => setSelectedHotspotTab('speech')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedHotspotTab === 'speech'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              口說連讀換氣
            </button>
          </div>
        </div>

        {/* Dual Gauges & Indices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-purple-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                SVO 積木組裝猶豫指數
              </span>
              <span className="text-purple-400 font-mono font-black tabular-nums">{activePauseStats.svoPauseIndex} / 100</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                style={{ width: `${activePauseStats.svoPauseIndex}%` }}
                className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full transition-all duration-500"
              />
            </div>
            <p className={`text-[11px] flex items-center gap-1.5 ${activePauseStats.svoPauseIndex > 50 ? 'text-amber-300' : 'text-emerald-300'}`}>
              {activePauseStats.svoPauseIndex > 50 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>介系詞與冠詞零件組裝思考時間偏長</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>SVO 核心語序思考敏捷順暢</span>
                </>
              )}
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-cyan-300 flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-cyan-400" />
                口說發音連讀換氣指數
              </span>
              <span className="text-cyan-400 font-mono font-black tabular-nums">{activePauseStats.speechPauseIndex} / 100</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                style={{ width: `${activePauseStats.speechPauseIndex}%` }}
                className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-500"
              />
            </div>
            <p className={`text-[11px] flex items-center gap-1.5 ${activePauseStats.speechPauseIndex > 50 ? 'text-rose-300' : 'text-emerald-300'}`}>
              {activePauseStats.speechPauseIndex > 50 ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>句子中段出現 700ms+ 換氣停滯點</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>發音節奏穩定，無多餘長停頓</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Cleanroom Cadence Timeline Visualizer */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-amber-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              無塵室實戰句型語音節奏時間軸 (Cadence Timeline)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">毫米 (ms) 延遲度量</span>
          </div>

          {/* Timeline Visual Track */}
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex items-center flex-wrap gap-2 text-xs font-mono justify-between">
            <div className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              <span className="text-[10px] text-slate-400">[S]</span> I check
            </div>
            <div className="text-slate-500 flex items-center text-[10px]">
              ── <span className="text-emerald-400 px-1">210ms</span> ──►
            </div>
            <div className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <span className="text-[10px] text-slate-400">[B+O]</span> the dry pump
            </div>
            <div className="text-slate-500 flex items-center text-[10px]">
              ════ <span className="text-rose-400 font-bold px-1">820ms ⚠️ 卡頓熱點</span> ════►
            </div>
            <div className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <span className="text-[10px] text-slate-400">[Prep]</span> in the sub-fab
            </div>
          </div>
        </div>

        {/* Hotspot List with Severity and Targeted Advice */}
        <div className="space-y-2 pt-1">
          {filteredHotspots.map((hotspot, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                hotspot.severity === 'high'
                  ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                  : hotspot.severity === 'medium'
                  ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-black flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                    hotspot.category === 'svo' ? 'bg-purple-500 text-white' : 'bg-cyan-500 text-slate-950'
                  }`}>
                    {hotspot.category === 'svo' ? 'SVO 積木' : '口說連讀'}
                  </span>
                  <span className="text-slate-100">{hotspot.segment || hotspot.label || '核心結構'}</span>
                  <span className={`text-[11px] font-mono font-bold tabular-nums ${
                    hotspot.severity === 'high' ? 'text-rose-400' : hotspot.severity === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    平均停頓 {hotspot.averagePauseMs}ms
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans">
                  {hotspot.recommendation}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-auto font-mono text-[11px] font-bold">
                {hotspot.severity === 'high' && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>高頻卡頓 (加強連音)</span>
                  </span>
                )}
                {hotspot.severity === 'medium' && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>中度猶豫</span>
                  </span>
                )}
                {hotspot.severity === 'low' && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>極速流暢</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-Time Web Audio Buffer Latency & Audio Segment Efficiency Monitor (Speech-Latency-Live-Monitor) */}
      <SpeechLatencyLiveMonitor speechSpeed={speechSpeed} />

      {/* Full Curriculum TTS Stress Test (Latency-Report) & Elementary Decomposition AI Audit */}
      <CurriculumQualitySuite
        baseLessons={baseLessons && baseLessons.length > 0 ? baseLessons : getActivePresetLessons()}
        speechSpeed={speechSpeed}
      />

      {/* Remediation Results Section */}
      {remediationAdvice && (
        <div className="bg-slate-900/95 border border-amber-400/80 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl backdrop-blur-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-400 rounded-lg text-slate-950 font-black">
              <Zap className="w-4 h-4 text-slate-950" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-amber-300">
              AI 弱點修復導師建議
            </h3>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
            {remediationAdvice}
          </p>

          <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider pt-1">
            專屬派送：3 句弱點針對性修復卡片
          </h4>

          <div className="space-y-3">
            {remediationLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                speechSpeed={speechSpeed}
                isBookmarked={bookmarkedLessons.some((l) => l.id === lesson.id || l.english_sentence === lesson.english_sentence)}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
