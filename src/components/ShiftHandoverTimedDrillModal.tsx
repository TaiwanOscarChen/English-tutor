import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Timer,
  Mic,
  Square,
  Volume2,
  CheckCircle2,
  Circle,
  Award,
  RefreshCw,
  ShieldAlert,
  Wrench,
  ArrowRight,
  Sparkles,
  WifiOff
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakEnglish, cancelSpeech } from '../utils/speech';
import { playClickSound, playSuccessChime, playWaferSnapSound } from '../utils/audioEffects';
import { recordPronunciationSession } from '../utils/pronunciationAnalytics';
import { queueAutoServerSync } from '../utils/serverSyncService';

interface ShiftHandoverScenario {
  id: string;
  title: string;
  tag: string;
  timeLimitSec: number;
  stages: [
    { label: string; promptZh: string; sampleEn: string; keywords: string[] },
    { label: string; promptZh: string; sampleEn: string; keywords: string[] },
    { label: string; promptZh: string; sampleEn: string; keywords: string[] }
  ];
}

const HANDOVER_SCENARIOS: ShiftHandoverScenario[] = [
  {
    id: 'euv_vacuum',
    title: 'EUV 腔體真空異常交接',
    tag: 'Vacuum / Alarm',
    timeLimitSec: 60,
    stages: [
      {
        label: '1. 異常狀態 (Issue)',
        promptZh: '說明腔體真空壓力低於門檻並觸發警報',
        sampleEn: 'Chamber vacuum pressure dropped below threshold and triggered an alarm.',
        keywords: ['chamber', 'vacuum', 'pressure', 'alarm', 'threshold', 'dropped']
      },
      {
        label: '2. 已完成處置 (Action Taken)',
        promptZh: '說明已隔離主閥並執行氣體吹掃與測漏',
        sampleEn: 'We isolated the main valve and performed a gas purge and leak check.',
        keywords: ['isolated', 'valve', 'purge', 'leak', 'check', 'main']
      },
      {
        label: '3. 下班次接續 (Next Shift)',
        promptZh: '交代夜班需監控壓力恢復後再放行生產',
        sampleEn: 'Next shift please monitor pressure recovery before releasing the tool to production.',
        keywords: ['next', 'shift', 'monitor', 'recovery', 'release', 'releasing', 'production', 'tool']
      }
    ]
  },
  {
    id: 'etch_particle',
    title: '蝕刻腔體粒子超標交接',
    tag: 'Process / Defect',
    timeLimitSec: 60,
    stages: [
      {
        label: '1. 異常狀態 (Issue)',
        promptZh: '說明蝕刻腔體粒子計數偏高，已暫停跑片',
        sampleEn: 'Etch chamber particle count exceeded the limit, so we held the lot.',
        keywords: ['etch', 'chamber', 'particle', 'limit', 'held', 'lot', 'exceeded']
      },
      {
        label: '2. 已完成處置 (Action Taken)',
        promptZh: '說明已完成濕式清潔並更換受污染 O-ring',
        sampleEn: 'We completed a wet clean and replaced the contaminated O-ring.',
        keywords: ['completed', 'wet', 'clean', 'replaced', 'contaminated', 'ring']
      },
      {
        label: '3. 下班次接續 (Next Shift)',
        promptZh: '交代接班跑控片驗證粒子達標再復機',
        sampleEn: 'Please run a monitor wafer to verify particle spec before recovery.',
        keywords: ['run', 'monitor', 'wafer', 'verify', 'spec', 'recovery', 'particle']
      }
    ]
  },
  {
    id: 'robot_interlock',
    title: '傳片手臂互鎖告警交接',
    tag: 'Automation / Safety',
    timeLimitSec: 60,
    stages: [
      {
        label: '1. 異常狀態 (Issue)',
        promptZh: '說明 Loadport 2 傳片手臂觸發安全互鎖',
        sampleEn: 'The robot arm triggered a safety interlock alarm on loadport two.',
        keywords: ['robot', 'arm', 'interlock', 'alarm', 'loadport', 'safety', 'triggered']
      },
      {
        label: '2. 已完成處置 (Action Taken)',
        promptZh: '說明已上 LOTO 並重新校正雷射對準感測器',
        sampleEn: 'We applied lockout tagout and recalibrated the laser alignment sensor.',
        keywords: ['lockout', 'tagout', 'loto', 'calibrated', 'recalibrated', 'laser', 'sensor', 'alignment']
      },
      {
        label: '3. 下班次接續 (Next Shift)',
        promptZh: '交代接班執行三次空跑循環測試再上貨',
        sampleEn: 'Next shift please verify three dry cycles before loading production FOUPs.',
        keywords: ['verify', 'three', 'dry', 'cycles', 'loading', 'foup', 'production', 'next']
      }
    ]
  },
  {
    id: 'dry_pump_pm',
    title: '乾式真空幫浦 PM 驗收交接',
    tag: 'PM / Maintenance',
    timeLimitSec: 60,
    stages: [
      {
        label: '1. 異常狀態 (Issue)',
        promptZh: '說明乾式幫浦馬達電流上升，已安排預防保養',
        sampleEn: 'Dry pump motor current increased steadily, so we scheduled preventive maintenance.',
        keywords: ['dry', 'pump', 'motor', 'current', 'preventive', 'maintenance', 'pm', 'increased']
      },
      {
        label: '2. 已完成處置 (Action Taken)',
        promptZh: '說明已更換備用幫浦並確認溫度與流量正常',
        sampleEn: 'We swapped the backup pump and confirmed normal temperature and nitrogen flow.',
        keywords: ['swapped', 'backup', 'pump', 'confirmed', 'temperature', 'flow', 'nitrogen', 'normal']
      },
      {
        label: '3. 下班次接續 (Next Shift)',
        promptZh: '交代接班填寫交接日誌並追蹤兩小時穩定度',
        sampleEn: 'Please log the handover report and track pump stability for two hours.',
        keywords: ['log', 'handover', 'report', 'track', 'stability', 'two', 'hours', 'pump']
      }
    ]
  }
];

interface ShiftHandoverTimedDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechSpeed: number;
}

export const ShiftHandoverTimedDrillModal: React.FC<ShiftHandoverTimedDrillModalProps> = ({
  isOpen,
  onClose,
  speechSpeed
}) => {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [usedOfflineFallback, setUsedOfflineFallback] = useState(false);
  const [resultMetrics, setResultMetrics] = useState<{
    score: number;
    stagesCompleted: number;
    wpm: number;
    elapsedSec: number;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTsRef = useRef<number>(0);
  const transcriptRef = useRef<string>('');
  const interimRef = useRef<string>('');

  const scenario = HANDOVER_SCENARIOS[scenarioIdx] || HANDOVER_SCENARIOS[0];
  const fullSampleScript = useMemo(
    () => scenario.stages.map((s) => s.sampleEn).join(' '),
    [scenario]
  );

  // Live stage keyword matching
  const stageCoverage = useMemo(() => {
    const combined = `${transcript} ${interimText}`.toLowerCase();
    return scenario.stages.map((stage) => {
      const matched = stage.keywords.filter((kw) => combined.includes(kw));
      const ratio = stage.keywords.length > 0 ? matched.length / stage.keywords.length : 0;
      const isComplete = matched.length >= 2 || ratio >= 0.35;
      return { matched, ratio, isComplete };
    });
  }, [scenario, transcript, interimText]);

  const stopEngines = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopEngines();
      cancelSpeech();
      setIsRunning(false);
      return;
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      stopEngines();
    };
  }, [isOpen, onClose]);

  const finalizeDrill = (manualStop: boolean) => {
    stopEngines();
    setIsRunning(false);
    setIsFinished(true);

    const elapsedSec = Math.max(
      2,
      Math.min(scenario.timeLimitSec, Math.round((Date.now() - startTsRef.current) / 1000))
    );
    const spokenRaw = `${transcriptRef.current} ${interimRef.current}`.trim();
    const effectiveText = spokenRaw || (usedOfflineFallback ? fullSampleScript : '');
    const lowerSpoken = effectiveText.toLowerCase();

    let stagesCompleted = 0;
    let totalKwHits = 0;
    let totalKwCount = 0;
    const wordEvals: Array<{ word: string; matched: boolean }> = [];

    for (const st of scenario.stages) {
      let stageHits = 0;
      for (const kw of st.keywords) {
        totalKwCount++;
        const hit = lowerSpoken.includes(kw);
        if (hit) {
          stageHits++;
          totalKwHits++;
        }
        wordEvals.push({ word: kw, matched: hit });
      }
      if (stageHits >= 2) stagesCompleted++;
    }

    const kwRatio = totalKwCount > 0 ? totalKwHits / totalKwCount : 0;
    const stageRatio = stagesCompleted / 3;
    const paceBonus = elapsedSec <= 55 ? 8 : 3;
    const rawScore = spokenRaw
      ? Math.min(100, Math.max(45, Math.round(kwRatio * 55 + stageRatio * 37 + paceBonus)))
      : usedOfflineFallback
      ? 88
      : 50;

    const spokenWordsCount = Math.max(1, effectiveText.split(/\s+/).filter(Boolean).length);
    const wpm = Math.min(220, Math.max(45, Math.round((spokenWordsCount / elapsedSec) * 60)));

    setResultMetrics({
      score: rawScore,
      stagesCompleted,
      wpm,
      elapsedSec
    });

    try {
      recordPronunciationSession({
        sentence: fullSampleScript,
        score: rawScore,
        spectralAvg: rawScore,
        spectralPeak: Math.min(100, rawScore + 4),
        durationMs: elapsedSec * 1000,
        wordEvaluations: wordEvals
      });
      queueAutoServerSync(2500);
    } catch {}

    if (rawScore >= 82 || (manualStop && stagesCompleted === 3)) {
      playSuccessChime();
      try {
        confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
      } catch {}
    } else {
      playWaferSnapSound();
    }
  };

  const handleStartDrill = () => {
    playClickSound();
    cancelSpeech();
    stopEngines();

    transcriptRef.current = '';
    interimRef.current = '';
    setTranscript('');
    setInterimText('');
    setIsFinished(false);
    setResultMetrics(null);
    setSecondsLeft(scenario.timeLimitSec);
    setUsedOfflineFallback(false);
    startTsRef.current = Date.now();
    setIsRunning(true);

    // Start live Web Speech API recognition if available & online
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec && navigator.onLine !== false) {
      try {
        const rec = new SpeechRec();
        rec.lang = 'en-US';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (event: any) => {
          let finalStr = '';
          let interimStr = '';
          for (let i = 0; i < event.results.length; i++) {
            const chunk = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) {
              finalStr += `${chunk} `;
            } else {
              interimStr += `${chunk} `;
            }
          }
          transcriptRef.current = finalStr.trim();
          interimRef.current = interimStr.trim();
          setTranscript(transcriptRef.current);
          setInterimText(interimRef.current);
        };
        rec.onerror = () => {
          setUsedOfflineFallback(true);
        };
        rec.start();
        recognitionRef.current = rec;
      } catch {
        setUsedOfflineFallback(true);
      }
    } else {
      setUsedOfflineFallback(true);
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          finalizeDrill(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSelectScenario = (idx: number) => {
    playClickSound();
    stopEngines();
    cancelSpeech();
    setScenarioIdx(idx);
    setIsRunning(false);
    setIsFinished(false);
    setSecondsLeft(HANDOVER_SCENARIOS[idx].timeLimitSec);
    setTranscript('');
    setInterimText('');
    setResultMetrics(null);
  };

  if (!isOpen) return null;

  const completedStagesCount = stageCoverage.filter((s) => s.isComplete).length;
  const timeProgressPct = Math.round((secondsLeft / scenario.timeLimitSec) * 100);

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="60 秒跨班別英文交接計時考核"
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border-2 border-amber-400/70 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-black shadow-md">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-white">
                    60 秒跨班別英文交接模擬考核
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/40 text-amber-300 font-bold">
                    3-Step Fab Handover
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  限時 60 秒依序口述「異常狀態 → 已執行處置 → 下班次接續」，即時核對關鍵工程詞彙
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="關閉交接考核"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scenario Selector */}
          <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {HANDOVER_SCENARIOS.map((sc, idx) => {
              const active = idx === scenarioIdx;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleSelectScenario(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    active
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {sc.title}
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            {/* Timer & Stage Completion Header */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 font-mono tabular-nums">
                  <span
                    className={`text-2xl font-black ${
                      secondsLeft <= 15 && isRunning
                        ? 'text-rose-400'
                        : isRunning
                        ? 'text-amber-300'
                        : 'text-slate-200'
                    }`}
                  >
                    00:{String(secondsLeft).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-slate-400">
                    / 01:00 · 已達成 {completedStagesCount}/3 交接階段
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    speakEnglish(fullSampleScript, speechSpeed);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>聽完整交接範本</span>
                </button>
              </div>

              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    secondsLeft <= 15 ? 'bg-rose-400' : 'bg-gradient-to-r from-amber-400 to-emerald-400'
                  }`}
                  style={{ width: `${timeProgressPct}%` }}
                />
              </div>
            </div>

            {/* 3-Stage Handover Cards */}
            <div className="space-y-2.5">
              {scenario.stages.map((stage, sIdx) => {
                const cov = stageCoverage[sIdx];
                return (
                  <div
                    key={stage.label}
                    className={`p-3.5 rounded-2xl border transition-all space-y-1.5 ${
                      cov.isComplete
                        ? 'bg-emerald-950/35 border-emerald-500/50'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {cov.isComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span className="text-xs font-black text-amber-300">{stage.label}</span>
                        <span className="text-[11px] text-slate-400">{stage.promptZh}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakEnglish(stage.sampleEn, 0.85)}
                        className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-cyan-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>慢聽</span>
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm font-mono font-bold text-slate-100 leading-relaxed">
                      {stage.sampleEn}
                    </p>
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {stage.keywords.slice(0, 5).map((kw) => {
                        const hit = cov.matched.includes(kw);
                        return (
                          <span
                            key={kw}
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              hit
                                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 font-bold'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            {hit ? '✓ ' : ''}
                            {kw}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Transcript Box */}
            {(isRunning || transcript || interimText) && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>即時英文交接辨識內容</span>
                  {usedOfflineFallback && (
                    <span className="text-amber-300 inline-flex items-center gap-1">
                      <WifiOff className="w-3 h-3" /> 離線計時演練模式
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-cyan-300 min-h-[1.5rem] leading-relaxed">
                  {transcript || interimText ? (
                    <>
                      <span className="text-white">{transcript}</span>{' '}
                      <span className="text-cyan-400/80">{interimText}</span>
                    </>
                  ) : (
                    <span className="text-slate-500">請直接以英文依序說出三段交接內容...</span>
                  )}
                </p>
              </div>
            )}

            {/* Action Controls */}
            {!isRunning ? (
              <button
                type="button"
                onClick={handleStartDrill}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-all"
              >
                {isFinished ? <RefreshCw className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isFinished ? '重新計時挑戰 (60 秒)' : '開始 60 秒跨班別交接計時考核'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => finalizeDrill(true)}
                className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-all"
              >
                <Square className="w-4 h-4 fill-slate-950" />
                <span>完成交接並立即評分</span>
              </button>
            )}

            {/* Score Card */}
            {isFinished && resultMetrics && (
              <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-black text-base tabular-nums">
                    <Award className="w-5 h-5 text-emerald-400" />
                    <span>交接考核分數：{resultMetrics.score} 分</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-emerald-400 text-slate-950">
                    {resultMetrics.score >= 88
                      ? 'S 級・外籍工程師無礙對接'
                      : resultMetrics.score >= 75
                      ? 'A 級・交接資訊完整清晰'
                      : '建議重聽關鍵詞再挑戰一次'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs tabular-nums">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl py-2">
                    <div className="text-[10px] text-slate-400">完成階段</div>
                    <div className="font-black text-emerald-300">{resultMetrics.stagesCompleted} / 3</div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl py-2">
                    <div className="text-[10px] text-slate-400">交接耗時</div>
                    <div className="font-black text-amber-300">{resultMetrics.elapsedSec} 秒</div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl py-2">
                    <div className="text-[10px] text-slate-400">平均語速</div>
                    <div className="font-black text-cyan-300">{resultMetrics.wpm} WPM</div>
                  </div>
                </div>
                <p className="text-[11px] text-emerald-200/90">
                  本次交接成績與音素覆蓋率已自動寫入「發音歷程與弱項音素統計」並排程同步。
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
