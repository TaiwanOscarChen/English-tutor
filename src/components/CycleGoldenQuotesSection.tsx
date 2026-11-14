import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Volume2,
  Copy,
  Check,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Bookmark,
  ShieldCheck,
  Zap,
  Flame,
  ArrowRight
} from 'lucide-react';
import { GoldenQuoteItem } from '../hooks/useThreeDayAutoUpdate';
import { speakEnglish, cancelSpeech } from '../utils/speech';
import { playClickSound, playSuccessChime, playLaserScanSound } from '../utils/audioEffects';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getMandarinPhoneticFromSentence } from '../utils/lessonSentenceHelper';
import { useToast } from '../context/ToastContext';

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
  const { showBookmarkToast } = useToast();

  if (!goldenQuotes || goldenQuotes.length === 0) {
    return null;
  }

  const safeIndex = Math.min(currentIndex, goldenQuotes.length - 1);
  const currentQuote = goldenQuotes[safeIndex];

  const handleSpeak = (text: string) => {
    playClickSound();
    speakEnglish(text, speechSpeed);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    playLaserScanSound();
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handlePlayAll = () => {
    if (isPlayingAll) {
      cancelSpeech();
      setIsPlayingAll(false);
      return;
    }

    setIsPlayingAll(true);
    let idx = 0;

    const playNext = () => {
      if (idx >= goldenQuotes.length) {
        setIsPlayingAll(false);
        return;
      }
      setCurrentIndex(idx);
      const quote = goldenQuotes[idx];
      speakEnglish(quote.english, speechSpeed, () => {
        idx++;
        setTimeout(playNext, 800);
      });
    };

    playNext();
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/80 border border-amber-500/30 p-3.5 sm:p-4 shadow-xl backdrop-blur-md relative overflow-hidden litho-laser-line">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-1.5">
                <span>本期晶圓實戰金句</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono font-bold">
                  第 {cycleNumber} 輪自動更迭
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              無塵室高頻交接與異常排查「零廢話」極簡句型，符合國小 SVO 直覺語序
            </p>
          </div>
        </div>

        {/* Global actions: Continuous play */}
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={handlePlayAll}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
              isPlayingAll
                ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                : 'bg-slate-800/90 text-amber-300 border border-amber-500/30 hover:bg-slate-700'
            }`}
            title="連續朗讀本期所有金句"
          >
            {isPlayingAll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlayingAll ? '暫停朗讀' : '連續朗讀本期金句'}</span>
          </button>
        </div>
      </div>

      {/* Quote Selector Tabs / Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2.5 relative z-10">
        {goldenQuotes.map((gq, idx) => {
          const isCur = idx === safeIndex;
          return (
            <button
              key={gq.id || idx}
              onClick={() => {
                playClickSound();
                setCurrentIndex(idx);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                isCur
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/60'
                  : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isCur ? 'bg-slate-950' : 'bg-amber-400'}`} />
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
          transition={{ duration: 0.18 }}
          className="bg-slate-950/90 rounded-xl p-3.5 sm:p-4 border border-slate-800/90 shadow-inner space-y-3 relative z-10"
        >
          {/* Tag & Controls */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-black font-mono">
                {currentQuote.tag || '無塵室實戰金句'}
              </span>
              <span className="text-xs text-slate-400">
                金句 {safeIndex + 1} / {goldenQuotes.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleSpeak(currentQuote.english)}
                className="p-1.5 rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold transition-transform active:scale-95 shadow-sm"
                title="發音朗讀"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleCopy(currentQuote.english, currentQuote.id)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
                title="複製金句英文"
              >
                {copiedId === currentQuote.id ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Main Sentence & Translation */}
          <div className="space-y-1">
            <div className="text-lg sm:text-2xl font-black text-white tracking-tight font-sans break-words flex items-center gap-2">
              <span>{currentQuote.english}</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-amber-300/90 break-words">
              {currentQuote.chinese}
            </div>
          </div>

          {/* SVO Breakdown Pills */}
          {currentQuote.svo && (
            <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-950 p-2 rounded border border-slate-800 min-w-0">
                <span className="text-[10px] text-cyan-400 font-bold block mb-0.5">👤 主角 S (Subject)</span>
                <span className="font-black text-slate-200 break-words block">{currentQuote.svo.subject}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800 min-w-0">
                <span className="text-[10px] text-amber-400 font-bold block mb-0.5">🏃 動作 V (Verb)</span>
                <span className="font-black text-slate-200 break-words block">{currentQuote.svo.action}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800 min-w-0">
                <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">📦 東西 O (Object)</span>
                <span className="font-black text-slate-200 break-words block">{currentQuote.svo.object}</span>
              </div>
            </div>
          )}

          {/* Phonetic & Cleanroom Context */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1 border-t border-slate-800/80">
            <div className="flex items-center gap-2 font-mono flex-wrap">
              <span className="text-yellow-300 font-bold bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded text-[11px]">
                注音: {(() => {
                  const zh = convertPhoneticToZhuyin(currentQuote.phonetic);
                  const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                  return clean ? `【 ${clean} 】` : '';
                })()}
              </span>
              <span className="text-emerald-300 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px]">
                中文: {(() => {
                  const mandarin = getMandarinPhoneticFromSentence(currentQuote.english, currentQuote.phonetic);
                  const clean = mandarin.trim().replace(/^【\s*|\s*】$/g, '').trim();
                  return clean ? `【 ${clean} 】` : '';
                })()}
              </span>
            </div>
            {currentQuote.context && (
              <div className="text-slate-400 italic text-[11px] sm:text-right">
                💡 {currentQuote.context}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
