import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Award,
  HelpCircle
} from 'lucide-react';
import { FAB_SCENARIOS } from '../data/fabScenarios';
import { speakEnglish } from '../utils/speech';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getMandarinPhoneticFromSentence } from '../utils/lessonSentenceHelper';
import {
  playClickSound,
  playSuccessChime,
  playLaserScanSound,
  playWaferSnapSound
} from '../utils/audioEffects';
import { InteractiveSentenceViewer } from './InteractiveSentenceViewer';
import { queueAutoServerSync } from '../utils/serverSyncService';

const SCENARIO_PROGRESS_KEY = 'fse_scenario_progress_v1';

function loadScenarioProgress(): { totalScore: number; completedScenarios: string[] } {
  if (typeof window === 'undefined') return { totalScore: 0, completedScenarios: [] };
  try {
    const raw = localStorage.getItem(SCENARIO_PROGRESS_KEY);
    if (!raw) return { totalScore: 0, completedScenarios: [] };
    const parsed = JSON.parse(raw);
    return {
      totalScore: typeof parsed?.totalScore === 'number' ? parsed.totalScore : 0,
      completedScenarios: Array.isArray(parsed?.completedScenarios) ? parsed.completedScenarios : [],
    };
  } catch {
    return { totalScore: 0, completedScenarios: [] };
  }
}

interface FabScenarioSectionProps {
  speechSpeed: number;
  onScenarioCompleted?: (score: number) => void;
}

export const FabScenarioSection: React.FC<FabScenarioSectionProps> = ({
  speechSpeed,
  onScenarioCompleted
}) => {
  const initialProgress = loadScenarioProgress();
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [totalScore, setTotalScore] = useState<number>(initialProgress.totalScore);
  const [completedScenarios, setCompletedScenarios] = useState<string[]>(initialProgress.completedScenarios);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [expandedWordByWordKeys, setExpandedWordByWordKeys] = useState<Record<string, boolean>>({
    npcQuote: true
  });

  const persistProgress = (nextScore: number, nextCompleted: string[]) => {
    try {
      localStorage.setItem(
        SCENARIO_PROGRESS_KEY,
        JSON.stringify({ totalScore: nextScore, completedScenarios: nextCompleted })
      );
      queueAutoServerSync(2500);
    } catch {}
  };

  const toggleWordByWord = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playClickSound();
    setExpandedWordByWordKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentScenario = FAB_SCENARIOS[currentScenarioIndex];
  const selectedChoice = currentScenario?.choices.find((c) => c.id === selectedChoiceId);

  const handleSelectChoice = (choiceId: string) => {
    if (hasSubmitted) return;
    playClickSound();
    setSelectedChoiceId(choiceId);
  };

  const handleSubmit = () => {
    if (!selectedChoiceId || hasSubmitted || !selectedChoice) return;
    setHasSubmitted(true);

    if (selectedChoice.isCorrect) {
      playSuccessChime();
    } else {
      playWaferSnapSound();
    }

    const nextScore = totalScore + selectedChoice.score;
    const nextCompleted = completedScenarios.includes(currentScenario.id)
      ? completedScenarios
      : [...completedScenarios, currentScenario.id];

    setTotalScore(nextScore);
    setCompletedScenarios(nextCompleted);
    persistProgress(nextScore, nextCompleted);
  };

  const handleNextScenario = () => {
    playLaserScanSound();
    if (currentScenarioIndex + 1 < FAB_SCENARIOS.length) {
      setCurrentScenarioIndex((prev) => prev + 1);
      setSelectedChoiceId(null);
      setHasSubmitted(false);
    } else {
      setShowFullSummary(true);
      if (onScenarioCompleted) {
        onScenarioCompleted(totalScore);
      }
    }
  };

  const handleRestart = () => {
    playClickSound();
    setCurrentScenarioIndex(0);
    setSelectedChoiceId(null);
    setHasSubmitted(false);
    setTotalScore(0);
    setShowFullSummary(false);
    setCompletedScenarios([]);
    persistProgress(0, []);
  };

  return (
    <div className="space-y-2.5 max-w-6xl mx-auto animate-fade-in w-full min-w-0 pb-1.5">
      {/* Top Banner - Compact */}
      <div className="bg-slate-900/95 border border-indigo-500/40 rounded-xl p-2.5 sm:p-3 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 backdrop-blur-sm relative overflow-hidden">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-500/20 border border-indigo-500/50 rounded-lg text-indigo-400 font-black shadow-xs shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-100">
                無塵室實戰對話情境模擬
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-700 text-[10px] font-extrabold font-mono">
                Roleplay Simulation
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">
              設備工程交接、突發異常良率會議與危機應變對答（支援零基礎逐字拆解）。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-indigo-500/30 shrink-0 tabular-nums">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] text-slate-300 font-mono">積分:</span>
          <span className="font-mono text-xs font-black text-amber-400">
            {totalScore} XP
          </span>
        </div>
      </div>

      {/* Scenario Progress Tabs - Compact Pills with Smooth Scrolling */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar w-full">
        {FAB_SCENARIOS.map((sc, idx) => {
          const isSelected = idx === currentScenarioIndex;
          const isDone = completedScenarios.includes(sc.id);
          return (
            <button
              key={sc.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                if (showFullSummary) setShowFullSummary(false);
                playClickSound();
                setCurrentScenarioIndex(idx);
                setSelectedChoiceId(null);
                setHasSubmitted(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                isSelected
                  ? 'bg-indigo-500 text-white font-black shadow-xs ring-1 ring-indigo-300'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Zap className="w-3 h-3 text-indigo-400" />
              <span>關卡 {idx + 1}</span>
              {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
            </button>
          );
        })}
      </div>

      {/* Scenario Main Panel - Compact */}
      <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-3 sm:p-3.5 space-y-3 backdrop-blur-sm shadow-md">
        {showFullSummary ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6 space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-400 mx-auto shadow-md">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-100">
              晶圓廠情境全通關大師！
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              您已完成所有設備技術交接、良率排查與緊急交接挑戰，累積獲得{' '}
              <span className="font-black text-amber-400 font-mono">{totalScore} XP</span>！
            </p>

            <button
              onClick={handleRestart}
              className="px-5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5 mx-auto cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>再次挑戰全部情境</span>
            </button>
          </motion.div>
        ) : (
          <>
            {/* Mission Header */}
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10.5px] font-bold font-mono">
                  {currentScenario.department}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10.5px] font-mono">
                  難度: {currentScenario.difficulty}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 tabular-nums">
                <span>關卡進度:</span>
                <span className="text-cyan-300 font-bold">
                  {currentScenarioIndex + 1} / {FAB_SCENARIOS.length}
                </span>
              </div>
            </div>

            {/* Mission Scenario Title & Context Banner */}
            <div className="space-y-1.5">
              <h3 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{currentScenario.title}</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-normal bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                {currentScenario.backgroundDescription}
              </p>
            </div>

            {/* Interlocutor NPC Speech Cockpit - Unified High Contrast */}
            <div className="bg-gradient-to-br from-indigo-950/50 via-slate-950 to-slate-900 border border-indigo-600/70 rounded-xl p-3 space-y-2 shadow-md">
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-indigo-900/60 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500 text-slate-950 font-black text-[10px] shadow-xs">
                    {currentScenario.interlocutor.avatarBadge}
                  </span>
                  <span className="text-xs font-black text-indigo-200">
                    {currentScenario.interlocutor.name}
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    · {currentScenario.interlocutor.role}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      speakEnglish(currentScenario.interlocutor.quoteEn, speechSpeed);
                    }}
                    className="px-2.5 py-1 rounded-md bg-indigo-900/90 hover:bg-indigo-800 text-indigo-200 hover:text-white border border-indigo-500/50 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-indigo-300" />
                    <span>發音</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      speakEnglish(currentScenario.interlocutor.quoteEn, 0.7);
                    }}
                    className="px-2 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold tabular-nums cursor-pointer whitespace-nowrap"
                    title="0.7x 慢速聽對白"
                  >
                    0.7x
                  </button>
                  <button
                    type="button"
                    aria-expanded={Boolean(expandedWordByWordKeys['npcQuote'])}
                    onClick={() => toggleWordByWord('npcQuote')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer border whitespace-nowrap ${
                      expandedWordByWordKeys['npcQuote']
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs'
                        : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-slate-700'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>拆解 {expandedWordByWordKeys['npcQuote'] ? '▴' : '▾'}</span>
                  </button>
                </div>
              </div>

              {expandedWordByWordKeys['npcQuote'] ? (
                <div className="pt-0.5 space-y-1">
                  <InteractiveSentenceViewer
                    sentence={currentScenario.interlocutor.quoteEn}
                    speechSpeed={speechSpeed}
                    compact={true}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        speakEnglish(currentScenario.interlocutor.quoteEn, 0.7);
                      }}
                      className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold tabular-nums cursor-pointer"
                    >
                      0.7x 慢讀
                    </button>
                  </div>
                </div>
              ) : (
                <p className="font-mono text-xs sm:text-sm font-bold text-slate-100 italic bg-slate-950/90 p-2 rounded-lg border border-slate-800/80 leading-relaxed break-words">
                  "{currentScenario.interlocutor.quoteEn}"
                </p>
              )}
              
              <p className="text-xs text-amber-300 font-bold pl-1">
                <span className="text-amber-400">中文語意：</span>{currentScenario.interlocutor.quoteZh}
              </p>

              {(() => {
                const quoteHomophone = getMandarinPhoneticFromSentence(currentScenario.interlocutor.quoteEn);
                const quoteZhuyin = convertPhoneticToZhuyin(quoteHomophone);
                return (
                  <div className="bg-slate-950/90 border border-indigo-500/30 rounded-lg p-2 space-y-0.5 text-[11px] font-mono">
                    <div className="text-emerald-300 break-words">
                      <span className="text-indigo-300 font-bold">對白注音：</span>【 {quoteZhuyin} 】
                    </div>
                    <div className="text-amber-300 break-words">
                      <span className="text-indigo-300 font-bold">對白諧音：</span>「{quoteHomophone}」
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Question prompt - High Contrast */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs sm:text-sm">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>實戰挑戰題：{currentScenario.questionPromptZh}</span>
              </div>
              <p className="text-xs text-slate-300 font-mono font-medium">
                {currentScenario.questionPromptEn}
              </p>

              {/* Choices */}
              <div className="space-y-1.5" role="radiogroup" aria-label="實戰應對選項">
                {currentScenario.choices.map((choice, idx) => {
                  const isSelected = selectedChoiceId === choice.id;
                  let borderClass = 'border-slate-700/80 bg-slate-950/70 hover:border-slate-600 hover:bg-slate-900/80';

                  if (hasSubmitted) {
                    if (choice.isCorrect) {
                      borderClass = 'border-emerald-500 bg-emerald-950/50 ring-2 ring-emerald-500/60';
                    } else if (isSelected && !choice.isCorrect) {
                      borderClass = 'border-rose-500 bg-rose-950/50 ring-2 ring-rose-500/60';
                    } else {
                      borderClass = 'border-slate-800 bg-slate-950/40 opacity-70';
                    }
                  } else if (isSelected) {
                    borderClass = 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400/70';
                  }

                  const choiceHomophone = getMandarinPhoneticFromSentence(choice.textEn);
                  const choiceZhuyin = convertPhoneticToZhuyin(choiceHomophone);
                  const choiceWbwKey = `choice-wbw-${choice.id}`;
                  const isChoiceExpanded = Boolean(expandedWordByWordKeys[choiceWbwKey]);

                  return (
                    <div
                      key={choice.id}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={hasSubmitted ? -1 : 0}
                      onClick={() => handleSelectChoice(choice.id)}
                      onKeyDown={(e) => {
                        if (hasSubmitted) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectChoice(choice.id);
                        }
                      }}
                      className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer space-y-1.5 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${borderClass}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-md bg-slate-800 text-[11px] font-mono font-black text-amber-300 flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="font-mono text-xs sm:text-sm font-black text-slate-100 leading-snug break-words">
                            {choice.textEn}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playClickSound();
                              speakEnglish(choice.textEn, speechSpeed);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white shrink-0 cursor-pointer border border-slate-700 transition-colors text-[10px] font-bold flex items-center gap-1 whitespace-nowrap"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>發音</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playClickSound();
                              speakEnglish(choice.textEn, 0.7);
                            }}
                            className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold tabular-nums cursor-pointer whitespace-nowrap shrink-0"
                            title="0.7x 慢速試聽選項"
                          >
                            0.7x
                          </button>
                          <button
                            type="button"
                            aria-expanded={isChoiceExpanded}
                            onClick={(e) => toggleWordByWord(choiceWbwKey, e)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border whitespace-nowrap ${
                              isChoiceExpanded
                                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>拆解 {isChoiceExpanded ? '▴' : '▾'}</span>
                          </button>
                        </div>
                      </div>

                      {isChoiceExpanded && (
                        <div className="pl-7 pt-1 space-y-1" onClick={(e) => e.stopPropagation()}>
                          <InteractiveSentenceViewer
                            sentence={choice.textEn}
                            speechSpeed={speechSpeed}
                            compact={true}
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                playClickSound();
                                speakEnglish(choice.textEn, 0.7);
                              }}
                              className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold tabular-nums cursor-pointer"
                            >
                              0.7x 慢讀
                            </button>
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-slate-200 pl-7 font-bold">
                        中譯：{choice.textZh}
                      </p>

                      <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10.5px] font-mono">
                        <div className="text-emerald-300 break-words">
                          <span className="text-slate-400">注音：</span>【 {choiceZhuyin} 】
                        </div>
                        <div className="text-amber-300 break-words">
                          <span className="text-slate-400">諧音：</span>「{choiceHomophone}」
                        </div>
                      </div>

                      {hasSubmitted && (
                        <div className="mt-2 pt-2 border-t border-slate-800 space-y-2 text-xs pl-8">
                          <div className="flex items-center gap-1 font-black text-xs tabular-nums">
                            {choice.isCorrect ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                最佳應對方式 (+{choice.score} XP)
                              </span>
                            ) : (
                              <span className="text-rose-400 flex items-center gap-1">
                                ❌ 待改進應對 (+{choice.score} XP)
                              </span>
                            )}
                          </div>

                          <p className="text-slate-100 text-xs leading-relaxed bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                            💡 專業解析：{choice.explanation}
                          </p>

                          <p className="text-cyan-300 font-mono text-xs bg-slate-950 p-2.5 rounded-lg border border-cyan-800/60 leading-relaxed">
                            ⚡ 工程實戰心法：{choice.nativeTip}
                          </p>

                          {/* SVO breakdown */}
                          <div className="p-1.5 rounded-md bg-slate-900/90 border border-slate-800 flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                            <span className="text-slate-400 font-bold">句型拆解:</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                              [S] {choice.svoBreakdown.s}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                              [V] {choice.svoBreakdown.v}
                            </span>
                            {choice.svoBreakdown.b && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                [B] {choice.svoBreakdown.b}
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                              [O] {choice.svoBreakdown.o}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Sticky Action Bar - Elevated above mobile bottom nav dock */}
            <div className="sticky bottom-[70px] md:bottom-2 z-30 flex items-center justify-between gap-2 p-2 sm:p-2.5 bg-slate-900/95 backdrop-blur-md rounded-xl border border-indigo-500/40 shadow-2xl mt-2">
              <div className="text-[11px] font-mono text-slate-300">
                {hasSubmitted ? (
                  <span className="text-emerald-400 font-bold">✨ 已完成本關對答！</span>
                ) : selectedChoiceId ? (
                  <span className="text-cyan-300 font-bold">✓ 已選擇選項，點擊確認送出</span>
                ) : (
                  <span className="text-slate-400">請點擊上方選項以進行回覆</span>
                )}
              </div>
              {!hasSubmitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={!selectedChoiceId}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs transition-all shadow-sm cursor-pointer shrink-0 active:scale-95 touch-manipulation"
                >
                  確認送出回覆
                </button>
              ) : (
                <button
                  onClick={handleNextScenario}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-indigo-400 text-slate-950 font-black text-xs transition-all shadow-sm flex items-center gap-1 cursor-pointer hover:brightness-110 shrink-0 active:scale-95 touch-manipulation"
                >
                  <span>
                    {currentScenarioIndex + 1 < FAB_SCENARIOS.length
                      ? '進行下一關卡'
                      : '查看結算總分'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
