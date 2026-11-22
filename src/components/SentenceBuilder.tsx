import React, { useState, useEffect, useRef } from 'react';
import { PRESET_LESSONS } from '../data/presetLessons';
import { Lesson } from '../types';
import { Volume2, CheckCircle2, RotateCcw, ArrowRight, ArrowLeft, Shuffle, Trophy, Sparkles, Puzzle } from 'lucide-react';
import { speakEnglish } from '../utils/speech';
import { prefetchAdjacentLessons } from '../utils/speechPrefetcher';
import { playClickSound, playSuccessChime } from '../utils/audioEffects';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';

import confetti from 'canvas-confetti';

const cleanSvoTileText = (raw: string | undefined): string => {
  if (!raw) return '';
  return raw
    .replace(/[\(（][^\)）]*[\)）]/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
    .trim();
};

interface SentenceBuilderProps {
  speechSpeed: number;
  onSvoAttempt?: (isCorrect: boolean, failedType?: 'subject' | 'action' | 'bridge' | 'object') => void;
  onRecordPauseHotspot?: (category: 'svo' | 'speech', segment: string, pauseMs: number, sentenceText?: string) => void;
}

interface TileItem {
  id: string;
  text: string;
  type: 'subject' | 'action' | 'bridge' | 'object';
  label: string;
}

const SVO_STATS_STORAGE_KEY = 'fse_svo_builder_stats_v1';

export const SentenceBuilder: React.FC<SentenceBuilderProps> = ({ speechSpeed, onSvoAttempt, onRecordPauseHotspot }) => {
  const [gameMode, setGameMode] = useState<'assembly' | 'matching'>('assembly');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [availableTiles, setAvailableTiles] = useState<TileItem[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<TileItem[]>([]);
  
  // Matching Game Slots state
  const [slots, setSlots] = useState<{
    subject: TileItem | null;
    action: TileItem | null;
    bridge: TileItem | null;
    object: TileItem | null;
  }>({ subject: null, action: null, bridge: null, object: null });

  const [isSuccess, setIsSuccess] = useState(false);
  const [score, setScore] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(SVO_STATS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return typeof parsed.score === 'number' ? parsed.score : 0;
      }
    } catch {}
    return 0;
  });
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [wrongAttemptHint, setWrongAttemptHint] = useState<string | null>(null);
  const [activeTargetSlot, setActiveTargetSlot] = useState<'subject' | 'action' | 'bridge' | 'object'>('subject');

  const lastStepTimestampRef = useRef<number>(Date.now());
  const autoAdvanceTimerRef = useRef<number | null>(null);

  const clearAutoAdvanceTimer = () => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearAutoAdvanceTimer();
    };
  }, []);

  const currentLesson: Lesson = PRESET_LESSONS[currentIndex % PRESET_LESSONS.length];

  useEffect(() => {
    try {
      localStorage.setItem(SVO_STATS_STORAGE_KEY, JSON.stringify({ score, lastIndex: currentIndex }));
    } catch {}
  }, [score, currentIndex]);

  useEffect(() => {
    if (!isSuccess) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearAutoAdvanceTimer();
        setCurrentIndex((prev) => (prev + 1) % PRESET_LESSONS.length);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSuccess]);

  // Initialize game round
  useEffect(() => {
    setIsSuccess(false);
    setWrongAttemptHint(null);
    setActiveTargetSlot('subject');
    setSelectedTiles([]);
    setSlots({ subject: null, action: null, bridge: null, object: null });
    lastStepTimestampRef.current = Date.now();

    const comp = currentLesson.components;
    const tiles: TileItem[] = [
      { id: 's', text: cleanSvoTileText(comp.subject), type: 'subject', label: '主角 (Subject)' },
      { id: 'v', text: cleanSvoTileText(comp.action), type: 'action', label: '動作 (Verb)' },
      { id: 'b', text: cleanSvoTileText(comp.bridge) || 'the', type: 'bridge', label: '橋樑 (Bridge)' },
      { id: 'o', text: cleanSvoTileText(comp.object), type: 'object', label: '東西 (Object)' }
    ];

    // Fisher-Yates Shuffle
    const shuffled = [...tiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setAvailableTiles(shuffled);

    // 切換題目時自動在背景預載下一個及前後句型的語音
    prefetchAdjacentLessons(PRESET_LESSONS, currentIndex, 2, speechSpeed);
  }, [currentIndex, gameMode, speechSpeed]);

  const SLOT_LABELS: Record<'subject' | 'action' | 'bridge' | 'object', string> = {
    subject: '主角 (Subject)',
    action: '動作 (Verb)',
    bridge: '橋樑 (Bridge)',
    object: '東西 (Object)'
  };

  const handleTileClick = (tile: TileItem) => {
    if (isSuccess) return;
    playClickSound();
    setWrongAttemptHint(null);

    const now = Date.now();
    const pauseMs = now - lastStepTimestampRef.current;
    lastStepTimestampRef.current = now;

    // 紀錄 SVO 積木重組各零件停頓熱點數據
    if (onRecordPauseHotspot) {
      onRecordPauseHotspot('svo', tile.type, pauseMs, currentLesson.english_sentence);
    }

    if (gameMode === 'assembly') {
      // Move from available to selected
      setAvailableTiles((prev) => prev.filter((t) => t.id !== tile.id));
      const newSelected = [...selectedTiles, tile];
      setSelectedTiles(newSelected);

      // Check if sentence is completed (4 tiles)
      if (newSelected.length === 4) {
        const types = newSelected.map((t) => t.type);
        const isCorrectOrder =
          types[0] === 'subject' &&
          types[1] === 'action' &&
          types[2] === 'bridge' &&
          types[3] === 'object';

        if (isCorrectOrder) {
          setWrongAttemptHint(null);
          if (onSvoAttempt) onSvoAttempt(true);
          triggerWin();
        } else {
          // Identify which position was wrong first
          let wrongType: 'subject' | 'action' | 'bridge' | 'object' = 'bridge';
          let wrongPos = 3;
          if (types[0] !== 'subject') {
            wrongType = 'subject';
            wrongPos = 1;
          } else if (types[1] !== 'action') {
            wrongType = 'action';
            wrongPos = 2;
          } else if (types[2] !== 'bridge') {
            wrongType = 'bridge';
            wrongPos = 3;
          } else if (types[3] !== 'object') {
            wrongType = 'object';
            wrongPos = 4;
          }

          setWrongAttemptHint(
            `第 ${wrongPos} 格應放「${SLOT_LABELS[wrongType]}」，請點擊錯誤積木退回，或按「重置」重新依 S → V → Bridge → O 組裝。`
          );
          if (onSvoAttempt) onSvoAttempt(false, wrongType);
        }
      }
    }
  };

  const handleMatchSlot = (targetType: 'subject' | 'action' | 'bridge' | 'object', tile: TileItem) => {
    if (isSuccess) return;
    playClickSound();

    const now = Date.now();
    const pauseMs = now - lastStepTimestampRef.current;
    lastStepTimestampRef.current = now;

    if (onRecordPauseHotspot) {
      onRecordPauseHotspot('svo', targetType, pauseMs, currentLesson.english_sentence);
    }

    if (tile.type === targetType) {
      setWrongAttemptHint(null);
      setSlots((prev) => {
        const updated = { ...prev, [targetType]: tile };
        const order: Array<'subject' | 'action' | 'bridge' | 'object'> = ['subject', 'action', 'bridge', 'object'];
        const nextEmpty = order.find((k) => !updated[k]);
        if (nextEmpty) {
          setActiveTargetSlot(nextEmpty);
        }
        if (updated.subject && updated.action && updated.bridge && updated.object) {
          if (onSvoAttempt) onSvoAttempt(true);
          triggerWin();
        }
        return updated;
      });
      setAvailableTiles((prev) => prev.filter((t) => t.id !== tile.id));
    } else {
      setWrongAttemptHint(
        `「${tile.text}」屬於 ${SLOT_LABELS[tile.type]}，目前鎖定的目標槽位是「${SLOT_LABELS[targetType]}」。可點擊上方任一空槽位切換目標！`
      );
      if (onSvoAttempt) onSvoAttempt(false, targetType);
    }
  };

  const triggerWin = () => {
    setIsSuccess(true);
    setScore((prev) => prev + 10);
    playSuccessChime();
    speakEnglish(currentLesson.english_sentence, speechSpeed);
    try {
      confetti({
        particleCount: 110,
        spread: 85,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.warn("Confetti error:", e);
    }

    clearAutoAdvanceTimer();
    if (autoAdvance) {
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        autoAdvanceTimerRef.current = null;
        setCurrentIndex((prev) => prev + 1);
      }, 2200);
    }
  };

  const handleRemoveTile = (tile: TileItem) => {
    if (isSuccess) return;
    playClickSound();
    setWrongAttemptHint(null);
    setSelectedTiles((prev) => prev.filter((t) => t.id !== tile.id));
    setAvailableTiles((prev) => [...prev, tile]);
  };

  const handleResetRound = () => {
    playClickSound();
    clearAutoAdvanceTimer();
    setIsSuccess(false);
    setWrongAttemptHint(null);
    setActiveTargetSlot('subject');
    setSelectedTiles([]);
    setSlots({ subject: null, action: null, bridge: null, object: null });
    const comp = currentLesson.components;
    const tiles: TileItem[] = [
      { id: 's', text: cleanSvoTileText(comp.subject), type: 'subject', label: '主角' },
      { id: 'v', text: cleanSvoTileText(comp.action), type: 'action', label: '動作' },
      { id: 'b', text: cleanSvoTileText(comp.bridge) || 'the', type: 'bridge', label: '橋樑' },
      { id: 'o', text: cleanSvoTileText(comp.object), type: 'object', label: '東西' }
    ];

    const shuffled = [...tiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setAvailableTiles(shuffled);
  };

  const handlePrevRound = () => {
    playClickSound();
    clearAutoAdvanceTimer();
    setCurrentIndex((prev) => (prev - 1 + PRESET_LESSONS.length) % PRESET_LESSONS.length);
  };

  const handleNextRound = () => {
    playClickSound();
    clearAutoAdvanceTimer();
    setCurrentIndex((prev) => (prev + 1) % PRESET_LESSONS.length);
  };

  const handleRandomRound = () => {
    playClickSound();
    clearAutoAdvanceTimer();
    if (PRESET_LESSONS.length <= 1) return;
    let next = Math.floor(Math.random() * PRESET_LESSONS.length);
    if (next === currentIndex % PRESET_LESSONS.length) {
      next = (next + 1) % PRESET_LESSONS.length;
    }
    setCurrentIndex(next);
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl max-w-3xl mx-auto backdrop-blur-sm animate-fade-in w-full overflow-hidden litho-scanner-overlay litho-laser-line relative shrink-strict">
      
      {/* Title & Score header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Puzzle className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-black text-slate-100">
              晶圓英文 SVO 拆解對照與配對挑戰
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            國小直覺語序 ✕ 晶圓無塵室實戰指令拆解
          </p>
        </div>

        {/* Mode Switcher & Auto Advance */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            aria-pressed={autoAdvance}
            onClick={() => setAutoAdvance(!autoAdvance)}
            className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1 ${
              autoAdvance
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title="組裝成功後自動發音並進入下一關"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>{autoAdvance ? '答對自動過關 ON' : '答對自動過關 OFF'}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              aria-pressed={gameMode === 'assembly'}
              onClick={() => setGameMode('assembly')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                gameMode === 'assembly'
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              順序組裝
            </button>
            <button
              type="button"
              aria-pressed={gameMode === 'matching'}
              onClick={() => setGameMode('matching')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                gameMode === 'matching'
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              零件槽位配對
            </button>
          </div>
        </div>
      </div>

      {/* Target Scenario Box */}
      <div className="bg-slate-950 border-2 border-slate-800/80 rounded-2xl p-4 sm:p-4.5 space-y-2 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-cyan-400 uppercase tracking-wider tabular-nums">
              目標情境任務 (第 {(currentIndex % PRESET_LESSONS.length) + 1} / {PRESET_LESSONS.length} 關)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevRound}
                className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="上一關"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleNextRound}
                className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="下一關"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleRandomRound}
                className="px-1.5 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="隨機抽一題挑戰"
              >
                <Shuffle className="w-2.5 h-2.5" />
                <span>抽題</span>
              </button>
            </div>
          </div>
          <p className="text-base font-bold text-slate-100">
            {currentLesson.scenario}
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-black text-amber-400 shrink-0 tabular-nums self-start sm:self-center">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>{score} 分</span>
        </div>
      </div>

      {/* Wrong-order / Slot mismatch live feedback banner */}
      {wrongAttemptHint && !isSuccess && (
        <div className="bg-amber-950/70 border border-amber-500/60 rounded-xl px-3.5 py-2.5 text-xs text-amber-200 font-bold flex items-center justify-between gap-2">
          <span>{wrongAttemptHint}</span>
          <button
            type="button"
            onClick={handleResetRound}
            className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[11px] shrink-0 cursor-pointer hover:bg-amber-300"
          >
            一鍵重排
          </button>
        </div>
      )}

      {/* Mode 1: Sequential Assembly */}
      {gameMode === 'assembly' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="tabular-nums">請依語序點選組裝 (已選 {selectedTiles.length} / 4)</span>
              <button
                onClick={handleResetRound}
                className="min-h-[36px] px-2 text-slate-400 hover:text-white flex items-center gap-1 text-xs cursor-pointer font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置
              </button>
            </div>

            <div className="min-h-[88px] bg-slate-950/90 border-2 border-dashed border-indigo-500/50 rounded-2xl p-4 flex flex-wrap items-center gap-3 justify-center shadow-inner">
              {selectedTiles.length === 0 ? (
                <span className="text-xs text-slate-500 font-medium italic">
                  請從下方點擊零件放入這裡...
                </span>
              ) : (
                selectedTiles.map((tile, idx) => {
                  const expectedOrder = ['subject', 'action', 'bridge', 'object'];
                  const isPosMismatch = selectedTiles.length === 4 && !isSuccess && tile.type !== expectedOrder[idx];
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => handleRemoveTile(tile)}
                      className={`min-h-[44px] px-4 py-2 rounded-2xl font-black text-base font-mono shadow-lg active:scale-95 transition-colors flex items-center gap-2 cursor-pointer border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                        isPosMismatch
                          ? 'bg-rose-500/20 text-rose-200 border-rose-400'
                          : 'bg-yellow-400 text-indigo-950 border-yellow-300'
                      }`}
                      title="點擊收回此零件"
                    >
                      <span>{tile.text}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                        isPosMismatch ? 'bg-rose-950 text-rose-200' : 'bg-indigo-950/20 text-indigo-950'
                      }`}>
                        {tile.label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Available Tiles Pool */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400">
              待組裝英文零件庫 (點擊組裝)
            </span>
            <div className="flex flex-wrap items-center justify-center gap-3 p-5 bg-slate-950/60 border-2 border-slate-800/80 rounded-2xl shadow-inner">
              {availableTiles.length === 0 && !isSuccess && selectedTiles.length === 4 && (
                <div className="text-xs text-amber-300 font-extrabold">
                  可點擊上方紅框零件退回微調，或按「一鍵重排」重新組裝！
                </div>
              )}

              {availableTiles.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleTileClick(tile)}
                  className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-indigo-900/80 text-slate-100 font-black text-base font-mono border-2 border-slate-700/80 hover:border-cyan-400 shadow-md active:scale-95 transition-colors flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <span>{tile.text}</span>
                  <span className="text-[10px] bg-slate-900 text-indigo-200 px-1.5 py-0.5 rounded font-bold">
                    {tile.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Slot Matching Game Mode */}
      {gameMode === 'matching' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>先點選目標槽位（或依序填滿），再從下方點選正確詞性放入：</span>
            <button
              onClick={handleResetRound}
              className="min-h-[36px] px-2 text-slate-400 hover:text-white flex items-center gap-1 text-xs cursor-pointer font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(
              [
                { key: 'subject', title: '1. 主角 (Subject)', tone: 'text-cyan-400' },
                { key: 'action', title: '2. 動作 (Verb)', tone: 'text-emerald-400' },
                { key: 'bridge', title: '3. 橋樑 (Bridge)', tone: 'text-purple-400' },
                { key: 'object', title: '4. 東西 (Object)', tone: 'text-amber-400' }
              ] as const
            ).map((slotMeta) => {
              const filled = slots[slotMeta.key];
              const isSelectedTarget = !filled && activeTargetSlot === slotMeta.key;
              return (
                <button
                  key={slotMeta.key}
                  type="button"
                  onClick={() => {
                    if (!filled) {
                      playClickSound();
                      setActiveTargetSlot(slotMeta.key);
                      setWrongAttemptHint(null);
                    }
                  }}
                  className={`bg-slate-950 border-2 rounded-2xl p-3.5 text-center space-y-2 min-h-[110px] flex flex-col justify-between transition-all cursor-pointer ${
                    isSelectedTarget
                      ? 'border-cyan-400 ring-2 ring-cyan-400/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className={`text-[11px] font-black ${slotMeta.tone}`}>{slotMeta.title}</span>
                  {filled ? (
                    <div className="py-2 px-3 rounded-xl bg-yellow-400 text-indigo-950 font-black text-sm font-mono shadow-md animate-fade-in">
                      {filled.text}
                    </div>
                  ) : (
                    <div className={`py-3 rounded-xl border-2 border-dashed text-xs font-bold ${
                      isSelectedTarget
                        ? 'border-cyan-400/70 text-cyan-300 bg-cyan-950/30'
                        : 'border-slate-800 text-slate-500'
                    }`}>
                      {isSelectedTarget ? '目標槽位 ▾' : '點擊選此槽位'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Available Tiles Pool */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400">
              請將對應詞性零件放入「<span className="text-cyan-300">{SLOT_LABELS[activeTargetSlot]}</span>」：
            </span>
            <div className="flex flex-wrap items-center justify-center gap-3 p-4 bg-slate-950/60 border-2 border-slate-800 rounded-2xl">
              {availableTiles.length === 0 && !isSuccess && (
                <div className="text-xs text-slate-400">全部零件已放入槽位</div>
              )}

              {availableTiles.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleMatchSlot(activeTargetSlot, tile)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-indigo-900/80 text-white font-black text-sm font-mono border border-slate-700 hover:border-yellow-400 cursor-pointer transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  {tile.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success Banner & Next Button */}
      {isSuccess && (
        <div className="bg-emerald-950/90 border-2 border-emerald-500/80 rounded-2xl p-5 space-y-4 text-emerald-200 animate-fade-in shadow-2xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-lg font-black text-emerald-300">
                太棒了！完美配對組裝完成！
              </h3>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                完整句子：<strong className="text-cyan-300 font-mono text-sm font-black">{currentLesson.english_sentence}</strong>
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-emerald-900/60 text-xs text-slate-300 space-y-1 shadow-inner">
            <div className="font-extrabold text-amber-300">💬 標準台灣注音輔助：</div>
            <div className="font-mono text-amber-200 font-black text-sm tracking-wide">
              {(() => {
                const zh = convertPhoneticToZhuyin(currentLesson.phonetic_taiwan);
                const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                return clean ? `【 ${clean} 】` : '';
              })()}
            </div>
            <div className="text-slate-300 mt-1">{currentLesson.memory_trick}</div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => speakEnglish(currentLesson.english_sentence, speechSpeed)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                <span>再聽一次發音</span>
              </button>
              <button
                type="button"
                onClick={() => speakEnglish(currentLesson.english_sentence, 0.7)}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-mono font-bold border border-amber-500/30 cursor-pointer transition-colors"
                title="0.7x 慢速清晰發音"
              >
                0.7x 慢速
              </button>
            </div>

            <button
              type="button"
              onClick={handleNextRound}
              className="px-6 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-sm flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-colors"
            >
              <span>下一關任務 (Enter)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

