import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Volume2,
  Copy,
  Check,
  Play,
  Pause,
  ChevronDown
} from 'lucide-react';
import { GoldenQuoteItem } from '../hooks/useThreeDayAutoUpdate';
import { speakEnglish, cancelSpeech } from '../utils/speech';
import { playClickSound, playLaserScanSound } from '../utils/audioEffects';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getMandarinPhoneticFromSentence } from '../utils/lessonSentenceHelper';

interface CycleGoldenQuotesSectionProps {
  goldenQuotes: GoldenQuoteItem[];
  cycleNumber: number;
  speechSpeed: number;
}

export const CycleGoldenQuotesSection: React.FC<CycleGoldenQuotesSectionProps> = ({
  goldenQuotes,
  cycleNumber,
  speechSpeed
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState<boolean>(false);
  const [showSvoDetails, setShowSvoDetails] = useState<boolean>(false);

  const playSessionRef = useRef<number>(0);
  const playTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const stopPlayAll = () => {
    playSessionRef.current += 1;
    if (playTimerRef.current !== null) {
      window.clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
    setIsPlayingAll(false);
  };

  useEffect(() => {
    return () => {
      playSessionRef.current += 1;
      if (playTimerRef.current !== null) {
        window.clearTimeout(playTimerRef.current);
      }
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      cancelSpeech();
    };
  }, []);

  if (!goldenQuotes || goldenQuotes.length === 0) {
    return null;
  }

  const safeIndex = Math.min(currentIndex, goldenQuotes.length - 1);
  const currentQuote = goldenQuotes[safeIndex];

  const handleSpeak = (text: string, speedOverride?: number) => {
    playClickSound();
    stopPlayAll();
    cancelSpeech();
    speakEnglish(text, speedOverride ?? speechSpeed);
  };

  const handleCopy = (text: string, id: string) => {
    playLaserScanSound();
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      setCopiedId(id);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setCopiedId(null), 1800);
    } catch {}
  };

  const handlePlayAll = () => {
    playClickSound();
    if (isPlayingAll) {
      stopPlayAll();
      cancelSpeech();
      return;
    }

    stopPlayAll();
    cancelSpeech();
    const sessionId = ++playSessionRef.current;
    setIsPlayingAll(true);
    let idx = 0;

    const playNext = () => {
      if (playSessionRef.current !== sessionId) return;
      if (idx >= goldenQuotes.length) {
        setIsPlayingAll(false);
        return;
      }
      setCurrentIndex(idx);
      const quote = goldenQuotes[idx];
      speakEnglish(quote.english, speechSpeed, () => {
        if (playSessionRef.current !== sessionId) return;
        idx++;
        playTimerRef.current = window.setTimeout(() => {
          playTimerRef.current = null;
          playNext();
        }, 700);
      });
    };

    playNext();
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/80 border border-amber-500/30 p-3.5 sm:p-4 shadow-xl backdrop-blur-md">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-1.5">
                <span>本期實戰金句</span>
                <span className="text-xs text-amber-400 font-mono font-bold tabular-nums">
                  · 第 {cycleNumber} 輪
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              無塵室高頻交接「零廢話」SVO 極簡句型
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePlayAll}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0 self-start sm:self-auto whitespace-nowrap ${
            isPlayingAll
              ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300/60'
              : 'bg-slate-800/90 text-amber-300 border border-amber-500/30 hover:bg-slate-700'
          }`}
        >
          {isPlayingAll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isPlayingAll ? '停止連播' : '連續朗讀'}</span>
        </button>
      </div>

      {/* Quote Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2.5">
        {goldenQuotes.map((gq, idx) => {
          const isCur = idx === safeIndex;
          return (
            <button
              key={gq.id || idx}
              type="button"
              aria-pressed={isCur}
              onClick={() => {
                playClickSound();
                stopPlayAll();
                cancelSpeech();
                setCurrentIndex(idx);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isCur
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/60'
                  : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>{gq.tag || `金句 ${idx + 1}`}</span>
              <span className="text-[10px] opacity-75 font-mono">#{idx + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Active Golden Quote Display Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuote.id || safeIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
          className="bg-slate-950/90 rounded-xl p-3.5 sm:p-4 border border-slate-800/90 shadow-inner space-y-3"
        >
          {/* Tag & Controls (Max 2 primary actions) */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-black font-mono">
                {currentQuote.tag || '實戰金句'}
              </span>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {safeIndex + 1} / {goldenQuotes.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSpeak(currentQuote.english)}
                className="px-2.5 py-1.5 rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-300 font-black text-xs transition-transform active:scale-95 shadow-sm flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>發音</span>
              </button>
              <button
                type="button"
                onClick={() => handleSpeak(currentQuote.english, 0.7)}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 font-mono font-bold text-xs tabular-nums transition-colors cursor-pointer whitespace-nowrap"
                title="0.7x 慢速試聽"
              >
                0.7x
              </button>
              <button
                type="button"
                onClick={() => handleCopy(currentQuote.english, currentQuote.id)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                {copiedId === currentQuote.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedId === currentQuote.id ? '已複製' : '複製'}</span>
              </button>
            </div>
          </div>

          {/* Main Sentence & Translation */}
          <div className="space-y-1">
            <div className="text-lg sm:text-2xl font-black text-white tracking-tight font-sans break-words">
              {currentQuote.english}
            </div>
            <div className="text-sm sm:text-base font-bold text-amber-300/90 break-words">
              {currentQuote.chinese}
            </div>
          </div>

          {/* Phonetics */}
          <div className="flex items-center gap-2 font-mono flex-wrap text-xs pt-1 border-t border-slate-800/80">
            <span className="text-yellow-300 font-bold bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded text-[11px]">
              注音: {(() => {
                const zh = convertPhoneticToZhuyin(currentQuote.phonetic);
                const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                return clean ? `【 ${clean} 】` : '';
              })()}
            </span>
            <span className="text-emerald-300 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px]">
              諧音: {(() => {
                const mandarin = getMandarinPhoneticFromSentence(currentQuote.english, currentQuote.phonetic);
                const clean = mandarin.trim().replace(/^【\s*|\s*】$/g, '').trim();
                return clean ? `【 ${clean} 】` : '';
              })()}
            </span>
          </div>

          {/* Collapsible SVO Breakdown + Context */}
          {(currentQuote.svo || currentQuote.context) && (
            <div className="border-t border-slate-800/80 pt-2">
              <button
                type="button"
                aria-expanded={showSvoDetails}
                onClick={() => {
                  playClickSound();
                  setShowSvoDetails((prev) => !prev);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200 cursor-pointer"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSvoDetails ? 'rotate-180' : ''}`} />
                <span>{showSvoDetails ? '收起 SVO 積木與情境說明' : '展開 SVO 積木與情境說明'}</span>
              </button>

              {showSvoDetails && (
                <div className="mt-2 space-y-2">
                  {currentQuote.svo && (
                    <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-950 p-2 rounded border border-slate-800 min-w-0">
                        <span className="text-[10px] text-cyan-400 font-bold block mb-0.5">主角 S</span>
                        <span className="font-black text-slate-200 break-words block">{currentQuote.svo.subject}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800 min-w-0">
                        <span className="text-[10px] text-amber-400 font-bold block mb-0.5">動作 V</span>
                        <span className="font-black text-slate-200 break-words block">{currentQuote.svo.action}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800 min-w-0">
                        <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">東西 O</span>
                        <span className="font-black text-slate-200 break-words block">{currentQuote.svo.object}</span>
                      </div>
                    </div>
                  )}
                  {currentQuote.context && (
                    <p className="text-slate-400 italic text-[11px]">
                      💡 {currentQuote.context}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
