import React, { useState, useEffect, useRef } from 'react';
import { VocabItem } from '../types';
import { X, Trophy, Sparkles, Timer, RotateCcw, CheckCircle2, Flame, Award, Gamepad2, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { speakEnglish, cancelSpeech } from '../utils/speech';
import { playClickSound, playSuccessChime, playWaferSnapSound } from '../utils/audioEffects';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import confetti from 'canvas-confetti';

interface VocabMatchGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  vocabPool: VocabItem[];
  speechSpeed: number;
  onCompletedGame?: (score: number, matchCount: number) => void;
}

interface MatchCard {
  id: string; // unique card id
  vocabId: string;
  type: 'word' | 'translation';
  text: string;
  phonetic?: string;
  isMatched: boolean;
}

const MATCH_BEST_STORAGE_KEY = 'fse_vocab_match_best_v1';

interface MatchBestRecord {
  bestScore: number;
  fastestSec: number;
}

export const VocabMatchGameModal: React.FC<VocabMatchGameModalProps> = ({
  isOpen,
  onClose,
  vocabPool,
  speechSpeed,
  onCompletedGame
}) => {
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<MatchCard[]>([]);
  const [mismatchedCardIds, setMismatchedCardIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [matchedPairsCount, setMatchedPairsCount] = useState<number>(0);
  const [totalPairs, setTotalPairs] = useState<number>(6);
  const [moves, setMoves] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [pairLimit, setPairLimit] = useState<6 | 8>(6);
  const [onlyUnmastered, setOnlyUnmastered] = useState<boolean>(false);
  const [slowAudioMode, setSlowAudioMode] = useState<boolean>(false);
  const [bestRecords, setBestRecords] = useState<Record<string, MatchBestRecord>>(() => {
    try {
      const raw = localStorage.getItem(MATCH_BEST_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const matchTimerRef = useRef<number | null>(null);

  const clearMatchTimer = () => {
    if (matchTimerRef.current !== null) {
      window.clearTimeout(matchTimerRef.current);
      matchTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearMatchTimer();
      cancelSpeech();
    };
  }, []);

  // Initialize new game session
  const initGame = (customPairLimit?: 6 | 8, customOnlyUnmastered?: boolean) => {
    clearMatchTimer();
    playWaferSnapSound();
    const targetPairs = customPairLimit ?? pairLimit;
    const filterUnmastered = customOnlyUnmastered ?? onlyUnmastered;
    let pool = vocabPool;
    if (filterUnmastered) {
      try {
        const raw = localStorage.getItem('fab_flashcard_mastered');
        const mastered = raw ? (JSON.parse(raw) as string[]) : [];
        const unmasteredPool = vocabPool.filter((v) => !mastered.includes(v.id));
        if (unmasteredPool.length >= 4) {
          pool = unmasteredPool;
        }
      } catch {}
    }
    const shuffledSource = [...pool].sort(() => 0.5 - Math.random());
    const selectedVocab = shuffledSource.slice(0, Math.min(targetPairs, pool.length));
    const pairCount = selectedVocab.length;
    setTotalPairs(pairCount);

    const generatedCards: MatchCard[] = [];
    selectedVocab.forEach((item) => {
      // English card
      generatedCards.push({
        id: `word-${item.id}`,
        vocabId: item.id,
        type: 'word',
        text: item.word,
        phonetic: item.taiwanPhonetic,
        isMatched: false,
      });
      // Chinese Translation card
      generatedCards.push({
        id: `trans-${item.id}`,
        vocabId: item.id,
        type: 'translation',
        text: item.translation,
        isMatched: false,
      });
    });

    // Shuffle all 12 cards
    setCards(generatedCards.sort(() => 0.5 - Math.random()));
    setSelectedCards([]);
    setMismatchedCardIds([]);
    setIsProcessing(false);
    setMatchedPairsCount(0);
    setMoves(0);
    setSeconds(0);
    setIsGameFinished(false);
    setStreak(0);
    setScore(0);
    setIsNewRecord(false);
  };

  useEffect(() => {
    if (isOpen) {
      initGame();
    } else {
      clearMatchTimer();
      cancelSpeech();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        initGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, pairLimit, onlyUnmastered]);

  // Game Timer
  useEffect(() => {
    if (!isOpen || isGameFinished) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isGameFinished]);

  // Card click handler
  const handleCardClick = (card: MatchCard) => {
    if (isProcessing || card.isMatched || selectedCards.some((c) => c.id === card.id)) {
      return;
    }

    playClickSound();

    const activeRate = slowAudioMode ? 0.7 : speechSpeed;

    if (card.type === 'word') {
      speakEnglish(card.text, activeRate);
    }

    const nextSelected = [...selectedCards, card];
    setSelectedCards(nextSelected);

    if (nextSelected.length === 2) {
      setIsProcessing(true);
      setMoves((prev) => prev + 1);

      const [first, second] = nextSelected;
      const isMatch = first.vocabId === second.vocabId && first.type !== second.type;

      if (isMatch) {
        playSuccessChime();
        // Pronounce the matched word
        const targetWord = first.type === 'word' ? first.text : second.text;
        speakEnglish(targetWord, activeRate);

        const newStreak = streak + 1;
        setStreak(newStreak);
        const points = 100 + newStreak * 20;
        const nextTotalScore = score + points;
        setScore(nextTotalScore);

        clearMatchTimer();
        matchTimerRef.current = window.setTimeout(() => {
          matchTimerRef.current = null;
          setCards((prev) =>
            prev.map((c) =>
              c.vocabId === first.vocabId ? { ...c, isMatched: true } : c
            )
          );
          setSelectedCards([]);
          setIsProcessing(false);

          const nextMatchedCount = matchedPairsCount + 1;
          setMatchedPairsCount(nextMatchedCount);

          if (nextMatchedCount === totalPairs) {
            // Trigger Victory Confetti!
            try {
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
              });
            } catch (err) {
              // Ignore confetti error if any
            }
            const difficultyKey = `${pairLimit}p`;
            const prevBest = bestRecords[difficultyKey];
            const brokeRecord =
              !prevBest ||
              nextTotalScore > prevBest.bestScore ||
              seconds < prevBest.fastestSec;
            if (brokeRecord) {
              const updatedRecord: MatchBestRecord = {
                bestScore: Math.max(prevBest?.bestScore || 0, nextTotalScore),
                fastestSec: prevBest ? Math.min(prevBest.fastestSec, seconds) : seconds,
              };
              const nextMap = { ...bestRecords, [difficultyKey]: updatedRecord };
              setBestRecords(nextMap);
              setIsNewRecord(true);
              try {
                localStorage.setItem(MATCH_BEST_STORAGE_KEY, JSON.stringify(nextMap));
              } catch {}
            }
            setIsGameFinished(true);
            if (onCompletedGame) {
              onCompletedGame(nextTotalScore, nextMatchedCount);
            }
          }
        }, 500);
      } else {
        // Mismatch
        setStreak(0);
        setMismatchedCardIds([first.id, second.id]);
        clearMatchTimer();
        matchTimerRef.current = window.setTimeout(() => {
          matchTimerRef.current = null;
          setSelectedCards([]);
          setMismatchedCardIds([]);
          setIsProcessing(false);
        }, 800);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="單字中文反射配對挑戰"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-slate-900 border-2 border-cyan-500/50 rounded-3xl max-w-3xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative overflow-hidden litho-scanner-overlay litho-laser-line max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-slate-950 font-black shadow-md">
                <Gamepad2 className="w-5 h-5 fill-slate-950" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2 flex-wrap">
                  <span>單字 ✕ 中文反射配對挑戰</span>
                  <span className="text-xs text-cyan-300 font-mono font-bold">
                    · FSE Memory Match
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  點擊英文單字與對應中文解釋完成配對，考驗無塵室高頻字彙記憶！
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="關閉配對遊戲"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              title="關閉視窗 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode & Difficulty Controls */}
          {!isGameFinished && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {([6, 8] as const).map((limit) => (
                  <button
                    key={limit}
                    type="button"
                    aria-pressed={pairLimit === limit}
                    onClick={() => {
                      setPairLimit(limit);
                      initGame(limit, onlyUnmastered);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold cursor-pointer transition-colors tabular-nums ${
                      pairLimit === limit
                        ? 'bg-cyan-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {limit} 組配對
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  aria-pressed={slowAudioMode}
                  onClick={() => {
                    playClickSound();
                    setSlowAudioMode((prev) => !prev);
                  }}
                  className={`px-3 py-1.5 rounded-xl border font-mono font-bold cursor-pointer transition-colors tabular-nums ${
                    slowAudioMode
                      ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {slowAudioMode ? '語速: 0.7x 慢速清晰' : '語速: 標準'}
                </button>
                <button
                  type="button"
                  aria-pressed={onlyUnmastered}
                  onClick={() => {
                    const next = !onlyUnmastered;
                    setOnlyUnmastered(next);
                    initGame(pairLimit, next);
                  }}
                  className={`px-3 py-1.5 rounded-xl border font-bold cursor-pointer transition-colors ${
                    onlyUnmastered
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {onlyUnmastered ? '篩選：只練未熟詞' : '篩選：全詞庫隨機'}
                </button>
              </div>
            </div>
          )}

          {/* Status Bar */}
          <div className="grid grid-cols-4 gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-3 text-center text-xs font-mono tabular-nums">
            <div>
              <span className="text-slate-500 block text-[10px]">配對進度</span>
              <span className="text-cyan-300 font-black text-sm">
                {matchedPairsCount} / {totalPairs}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">累計步數</span>
              <span className="text-slate-200 font-black text-sm">{moves}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">遊戲秒數</span>
              <span className="text-amber-300 font-black text-sm flex items-center justify-center gap-1">
                <Timer className="w-3 h-3" />
                {seconds}s
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">目前得分</span>
              <span className="text-yellow-400 font-black text-sm flex items-center justify-center gap-1">
                {streak > 1 && <Flame className="w-3 h-3 text-rose-400" />}
                {score}
              </span>
            </div>
          </div>

          {!isGameFinished ? (
            /* GAME CARD GRID */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-2">
              {cards.map((card) => {
                const isSelected = selectedCards.some((c) => c.id === card.id);
                const isMismatched = mismatchedCardIds.includes(card.id);

                let cardStyle =
                  'bg-slate-950/90 border-slate-800 text-slate-200 hover:border-cyan-400/50 hover:bg-slate-850';

                if (card.isMatched) {
                  cardStyle =
                    'bg-emerald-950/70 border-emerald-500/80 text-emerald-300 opacity-90 shadow-sm shadow-emerald-500/10 cursor-default';
                } else if (isMismatched) {
                  cardStyle =
                    'bg-rose-950 border-rose-500 text-rose-200 ring-2 ring-rose-400 animate-shake';
                } else if (isSelected) {
                  cardStyle =
                    'bg-cyan-950 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20';
                }

                return (
                  <motion.button
                    key={card.id}
                    type="button"
                    aria-pressed={isSelected}
                    layout
                    whileTap={!card.isMatched && !isProcessing ? { scale: 0.98 } : {}}
                    onClick={() => handleCardClick(card)}
                    disabled={card.isMatched || isProcessing}
                    className={`p-3 sm:p-4 rounded-2xl border text-center transition-colors flex flex-col items-center justify-center min-h-[90px] relative overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${cardStyle}`}
                  >
                    {/* Badge */}
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded absolute top-2 left-2 ${
                        card.type === 'word'
                          ? 'bg-indigo-900/60 text-indigo-300'
                          : 'bg-amber-900/60 text-amber-300'
                      }`}
                    >
                      {card.type === 'word' ? 'English' : '中文翻譯'}
                    </span>

                    {/* Matched check icon */}
                    {card.isMatched && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute top-2 right-2" />
                    )}

                    <div className="pt-5 sm:pt-6 pb-1 space-y-1 w-full px-1">
                      <span
                        className={`font-black break-words leading-tight block ${
                          card.type === 'word'
                            ? 'text-sm sm:text-base font-mono text-cyan-200'
                            : 'text-xs sm:text-sm font-sans text-slate-100'
                        }`}
                      >
                        {card.text}
                      </span>
                      {card.phonetic && (
                        <span className="text-[10px] text-amber-300 font-mono block">
                          {(() => {
                            const zh = convertPhoneticToZhuyin(card.phonetic);
                            const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                            return clean ? `【 ${clean} 】` : '';
                          })()}
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            /* VICTORY SUMMARY SCREEN */
            <div className="space-y-5 text-center py-4">
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/50 text-amber-300 flex items-center justify-center mx-auto shadow-xl">
                  <Trophy className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-xl font-black text-slate-100 font-mono">
                  {isNewRecord ? '破紀錄完成全套單字配對！' : '恭喜完成全部單字配對！'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isNewRecord
                    ? '刷新個人最佳成績！半導體關鍵單字反射神經已大幅提升。'
                    : '全數精準匹配成功，半導體關鍵單字反射神經已大幅提升！'}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 max-w-sm mx-auto space-y-3 shadow-inner tabular-nums">
                <div className="text-3xl font-black font-mono text-amber-300">
                  {score} <span className="text-sm font-normal text-slate-400">PTS</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block">耗費時間</span>
                    <span className="text-cyan-300 font-extrabold">{seconds} 秒</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">總操作步數</span>
                    <span className="text-slate-200 font-extrabold">{moves} 步</span>
                  </div>
                </div>
                {bestRecords[`${pairLimit}p`] && (
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-center gap-3">
                    <span>{pairLimit} 組最佳：{bestRecords[`${pairLimit}p`].bestScore} 分</span>
                    <span>最快：{bestRecords[`${pairLimit}p`].fastestSec} 秒</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => initGame()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-black text-xs cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>再來一局配對</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  返回單字庫
                </button>
              </div>
            </div>
          )}

          {/* Footer controls */}
          {!isGameFinished && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-[11px] text-slate-400">
                點擊英文單字時會即時朗讀美式發音
              </span>
              <button
                type="button"
                onClick={() => initGame()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono font-bold text-xs flex items-center gap-1 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重新洗牌</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
