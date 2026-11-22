import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trophy,
  Sparkles,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Award,
  Zap,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { FAB_SCENARIOS, FabScenario, ScenarioChoice } from '../data/fabScenarios';
import { speakEnglish, cancelSpeech } from '../utils/speech';
import {
  playClickSound,
  playSuccessChime,
  playLaserScanSound,
  playWaferSnapSound
} from '../utils/audioEffects';
import confetti from 'canvas-confetti';

interface FabScenarioSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechSpeed: number;
  onScenarioCompleted?: (xpGained: number) => void;
}

export const FabScenarioSimulatorModal: React.FC<FabScenarioSimulatorModalProps> = ({
  isOpen,
  onClose,
  speechSpeed,
  onScenarioCompleted
}) => {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [completedScenarios, setCompletedScenarios] = useState<string[]>([]);
  const [showFullSummary, setShowFullSummary] = useState(false);

  const maxTotalXp = useMemo(
    () =>
      FAB_SCENARIOS.reduce(
        (sum, scenario) => sum + Math.max(0, ...scenario.choices.map((c) => c.score)),
        0
      ),
    []
  );

  const currentScenario = FAB_SCENARIOS[currentScenarioIndex];
  const selectedChoice = currentScenario?.choices.find((c) => c.id === selectedChoiceId);

  const handleSelectChoice = (choiceId: string) => {
    if (hasSubmitted) return;
    playClickSound();
    setSelectedChoiceId(choiceId);
  };

  const handleSubmit = () => {
    if (!selectedChoiceId || hasSubmitted || !currentScenario) return;

    setHasSubmitted(true);
    const choice = currentScenario.choices.find((c) => c.id === selectedChoiceId);

    if (choice?.isCorrect) {
      playSuccessChime();
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 }
      });
      setTotalScore((prev) => prev + choice.score);
    } else {
      playWaferSnapSound();
    }

    if (!completedScenarios.includes(currentScenario.id)) {
      setCompletedScenarios((prev) => [...prev, currentScenario.id]);
    }
  };

  const handleNext = () => {
    cancelSpeech();
    playLaserScanSound();
    if (currentScenarioIndex < FAB_SCENARIOS.length - 1) {
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
    cancelSpeech();
    playWaferSnapSound();
    setCurrentScenarioIndex(0);
    setSelectedChoiceId(null);
    setHasSubmitted(false);
    setTotalScore(0);
    setShowFullSummary(false);
    setCompletedScenarios([]);
  };

  useEffect(() => {
    if (!isOpen) {
      cancelSpeech();
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelSpeech();
        onClose();
        return;
      }
      if (showFullSummary || !currentScenario) return;
      const lower = e.key.toLowerCase();
      const idxMap: Record<string, number> = {
        '1': 0, a: 0,
        '2': 1, b: 1,
        '3': 2, c: 2,
        '4': 3, d: 3
      };
      if (!hasSubmitted && lower in idxMap) {
        const targetChoice = currentScenario.choices[idxMap[lower]];
        if (targetChoice) {
          e.preventDefault();
          handleSelectChoice(targetChoice.id);
        }
        return;
      }
      if (e.key === 'Enter') {
        if (!hasSubmitted && selectedChoiceId) {
          e.preventDefault();
          handleSubmit();
        } else if (hasSubmitted) {
          e.preventDefault();
          handleNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showFullSummary, currentScenario, hasSubmitted, selectedChoiceId, totalScore]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="無塵室實戰對話情境模擬闖關"
      onClick={() => {
        cancelSpeech();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-slate-900 border-2 border-cyan-400/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative"
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                  <span>無塵室實戰對話情境模擬闖關</span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-700 text-xs font-mono">
                    Fab Roleplay Simulation
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                考驗設備工程交接、突發異常良率會議與大夜班危機應變對答
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono font-black text-xs tabular-nums">
              <Trophy className="w-3.5 h-3.5" />
              <span>積分: {totalScore} XP</span>
            </div>

            <button
              type="button"
              aria-label="關閉對話模擬"
              onClick={() => {
                cancelSpeech();
                playClickSound();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              title="關閉視窗 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Area with Smooth Scrolling and Safe Clearance */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 pb-8 sm:pb-6 no-scrollbar">
          {!showFullSummary ? (
            <>
              {/* Progress & Department Tracker */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold font-mono">
                    {currentScenario.department}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono">
                    難度: {currentScenario.difficulty}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
                  <span>關卡進度:</span>
                  <span className="text-cyan-300 font-bold">
                    {currentScenarioIndex + 1} / {FAB_SCENARIOS.length}
                  </span>
                </div>
              </div>

              {/* Scenario Context Card */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{currentScenario.title}</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {currentScenario.backgroundDescription}
                </p>

                {/* NPC Interlocutor Dialogue Card */}
                <div className="mt-3 bg-gradient-to-br from-slate-900 to-indigo-950/50 border border-indigo-800/60 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-500 text-slate-950 font-black text-xs">
                        {currentScenario.interlocutor.avatarBadge}
                      </span>
                      <span className="text-xs font-bold text-indigo-200">
                        {currentScenario.interlocutor.name}
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        ({currentScenario.interlocutor.role})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          speakEnglish(currentScenario.interlocutor.quoteEn, speechSpeed);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        title="朗讀對方的對話"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>聽標準對話</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          speakEnglish(currentScenario.interlocutor.quoteEn, 0.7);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold transition-colors cursor-pointer"
                        title="0.7x 慢速清晰重聽對方對話"
                      >
                        0.7x
                      </button>
                    </div>
                  </div>

                  <p className="font-mono text-xs sm:text-sm font-semibold text-slate-100 italic">
                    "{currentScenario.interlocutor.quoteEn}"
                  </p>
                  <p className="text-xs text-slate-400">
                    中文譯意：{currentScenario.interlocutor.quoteZh}
                  </p>
                </div>
              </div>

              {/* Question & Choices */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs font-black text-cyan-300 flex-wrap">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    <span>{currentScenario.questionPromptZh}</span>
                  </div>
                  <span className="text-[10px] font-mono font-normal text-slate-400 hidden sm:inline">
                    支援鍵盤 A-D / 1-4 選取，Enter 確認
                  </span>
                </div>

                <div className="space-y-2.5" role="radiogroup" aria-label={currentScenario.questionPromptZh}>
                  {currentScenario.choices.map((choice, idx) => {
                    const isSelected = selectedChoiceId === choice.id;
                    let borderClass = 'border-slate-800 hover:border-slate-700 bg-slate-950/60';

                    if (hasSubmitted) {
                      if (choice.isCorrect) {
                        borderClass = 'border-emerald-400 bg-emerald-950/40 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400';
                      } else if (isSelected && !choice.isCorrect) {
                        borderClass = 'border-rose-500 bg-rose-950/40';
                      }
                    } else if (isSelected) {
                      borderClass = 'border-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-400';
                    }

                    return (
                      <div
                        key={choice.id}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => handleSelectChoice(choice.id)}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            handleSelectChoice(choice.id);
                          }
                        }}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${borderClass}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-black shrink-0 mt-0.5 ${
                              isSelected ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <div className="space-y-1">
                              <p className="font-mono text-xs sm:text-sm font-semibold text-slate-100">
                                {choice.textEn}
                              </p>
                              <p className="text-xs text-slate-400">
                                {choice.textZh}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playClickSound();
                                speakEnglish(choice.textEn, speechSpeed);
                              }}
                              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer"
                              title="試聽此選項發音"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playClickSound();
                                speakEnglish(choice.textEn, 0.7);
                              }}
                              className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer"
                              title="0.7x 慢速試聽此選項"
                            >
                              0.7x
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submitted Feedback Breakdown */}
              {hasSubmitted && selectedChoice && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                    selectedChoice.isCorrect
                      ? 'bg-emerald-950/30 border-emerald-500/60'
                      : 'bg-rose-950/30 border-rose-500/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selectedChoice.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                    )}
                    <span className="font-black text-sm text-slate-100">
                      {selectedChoice.isCorrect
                        ? '🎉 應答完美！符合國際半導體晶圓廠標準規範 (+100 XP)'
                        : '⚠️ 應答需改進：未達半導體工程標準規範'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {selectedChoice.explanation}
                  </p>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>國小拆解法 S-V-O 拆解分析：</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                        <span className="text-amber-400 font-bold">[主角 S]: </span>
                        <span className="text-slate-200">{selectedChoice.svoBreakdown.s}</span>
                      </div>
                      <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
                        <span className="text-cyan-400 font-bold">[動作 V]: </span>
                        <span className="text-slate-200">{selectedChoice.svoBreakdown.v}</span>
                      </div>
                      {selectedChoice.svoBreakdown.b && (
                        <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20">
                          <span className="text-indigo-400 font-bold">[橋樑 B]: </span>
                          <span className="text-slate-200">{selectedChoice.svoBreakdown.b}</span>
                        </div>
                      )}
                      <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-emerald-400 font-bold">[東西 O]: </span>
                        <span className="text-slate-200">{selectedChoice.svoBreakdown.o}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-300 font-medium pt-1">
                      💡 工程道地心法：{selectedChoice.nativeTip}
                    </p>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            /* Full Summary Card */
            <div className="p-6 text-center space-y-5 bg-slate-950/90 rounded-3xl border border-cyan-400/40">
              <div className="w-16 h-16 rounded-3xl bg-amber-400/20 border border-amber-400/50 mx-auto flex items-center justify-center text-amber-300 shadow-xl">
                <Trophy className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-100">
                  恭喜完成全套無塵室實戰對話特訓！
                </h3>
                <p className="text-sm text-slate-300 max-w-lg mx-auto">
                  你已順利通關所有設備工程交接、突發良率危機與日夜班輪調對答，掌握了半導體廠最強 S-V-O 應對框架！
                </p>
              </div>

              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-mono font-black text-base shadow-lg tabular-nums">
                <Award className="w-5 h-5" />
                <span>獲得總積分：{totalScore} / {maxTotalXp} XP</span>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 font-black text-sm flex items-center gap-2 mx-auto shadow-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>再挑戰一次</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        {!showFullSummary && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              稍後再練
            </button>

            {!hasSubmitted ? (
              <button
                disabled={!selectedChoiceId}
                onClick={handleSubmit}
                className={`px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  selectedChoiceId
                    ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>送出回答並查看解析</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <span>{currentScenarioIndex < FAB_SCENARIOS.length - 1 ? '下一關' : '查看總成果'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
