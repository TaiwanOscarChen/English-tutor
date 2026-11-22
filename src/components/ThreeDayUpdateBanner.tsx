import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Sparkles, Clock, Zap, Cpu, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSuccessChime, playClickSound } from '../utils/audioEffects';
import { getExampleTranslation } from '../utils/exampleSentenceTranslator';
import { speakEnglish, speakChinese } from '../utils/speech';

interface ThreeDayUpdateBannerProps {
  cycleNumber: number;
  daysLeft: number;
  hoursLeft: number;
  minutesLeft: number;
  secondsLeft: number;
  cycleProgressPercent: number;
  isUpdating: boolean;
  bundleNotice?: string;
  onManualTrigger?: () => Promise<void>;
  onTriggerManualUpdate?: () => Promise<void>;
  hotTerm?: {
    term: string;
    meaning: string;
    exampleSentence: string;
    exampleTranslation?: string;
  };
}

export const ThreeDayUpdateBanner: React.FC<ThreeDayUpdateBannerProps> = ({
  cycleNumber,
  daysLeft,
  hoursLeft,
  minutesLeft,
  secondsLeft,
  cycleProgressPercent,
  isUpdating,
  bundleNotice,
  onManualTrigger,
  onTriggerManualUpdate,
  hotTerm
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleTrigger = async () => {
    playClickSound();
    const triggerFn = onManualTrigger || onTriggerManualUpdate;
    if (triggerFn) {
      await triggerFn();
    }
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.2 }
    });
    playSuccessChime();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 relative rounded-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/80 to-slate-900/90 border border-cyan-500/30 p-4 shadow-xl backdrop-blur-md overflow-hidden litho-laser-line"
    >
      {/* Background ambient glowing orbs */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-10 -top-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        {/* Left Info: Cycle Badge & Live Countdown */}
        <div className="flex items-start md:items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-amber-500/20 border border-cyan-400/40 text-cyan-300 shadow-inner shrink-0 mt-0.5 md:mt-0">
            <Zap className="w-5 h-5 text-amber-300" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                每 3 天自動更迭系統
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-xs font-semibold text-amber-300 tabular-nums">
                第 {cycleNumber} 輪 晶圓 AI 週期
              </span>
            </div>

            <h3 className="text-sm md:text-base font-bold text-slate-100 mt-1 flex items-center gap-2 flex-wrap">
              <span>全網自動更迭：關卡 ＋ 實戰金句 ＋ 晶圓知識庫</span>
            </h3>

            {/* Content update status pills */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950/80 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                <span>🧩 實戰關卡自動更新</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950/80 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
                <span>🏆 交接金句自動更新</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950/80 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                <span>📚 晶圓知識庫全自動注入</span>
              </span>
            </div>

            {/* Live Ticker Timer */}
            <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>離下一輪自動更新還剩：</span>
              <span className="font-mono font-bold text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-700/80 tracking-wider tabular-nums">
                {daysLeft}天 {hoursLeft.toString().padStart(2, '0')}時 {minutesLeft.toString().padStart(2, '0')}分 {secondsLeft.toString().padStart(2, '0')}秒
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions: Manual Update Button & Expand Details */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            type="button"
            onClick={handleTrigger}
            disabled={isUpdating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-amber-300 to-yellow-400 hover:from-cyan-300 hover:to-yellow-300 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'motion-safe:animate-spin' : ''}`} />
            <span>{isUpdating ? 'AI 生成更新中...' : '手動觸發 3 天 AI 大更新'}</span>
          </button>

          <button
            type="button"
            aria-expanded={isExpanded}
            aria-label="檢視 3 天更迭說明"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            title="檢視 3 天更迭說明"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Cycle Progress Bar */}
      <div className="mt-3 w-full bg-slate-950/70 rounded-full h-1.5 border border-slate-800/80 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${cycleProgressPercent}%` }}
          transition={{ duration: 1 }}
        />
      </div>

      {/* Expanded Explanation Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300 space-y-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5 mb-1">
                  <Cpu className="w-3.5 h-3.5" /> 1. 自動循環演算法
                </div>
                <p className="text-slate-400 leading-relaxed">
                  系統精確以 72 小時 (3 天) 為全網生命週期，不需手動刷網，時間一到即自動帶入全新 AI 生成晶圓情境教材。
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> 2. 避免重複記憶
                </div>
                <p className="text-slate-400 leading-relaxed">
                  每一輪更新均自動對比使用者最近練過的預設單字與弱點，產出不重複的「國小拆解法 SVO」無塵室黃金句型。
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="font-semibold text-emerald-300 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 3. 離線與即時備援
                </div>
                <p className="text-slate-400 leading-relaxed">
                  支援本機 LocalStorage 快取與伺服器端 Gemini 即時生成，隨時體驗無限量的 3 天更迭科技英文特訓！
                </p>
              </div>
            </div>

            {hotTerm && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/40 text-xs text-slate-200 space-y-1.5 mt-2">
                <div className="flex items-center justify-between text-amber-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>本輪 3 天精選熱門詞：{hotTerm.term}</span>
                  </span>
                  <span className="text-[10px] bg-amber-400/20 px-2 py-0.5 rounded text-amber-300 border border-amber-400/40 font-mono font-bold">
                    HOT TERM
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">{hotTerm.meaning}</p>
                {hotTerm.exampleSentence && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1.5 mt-1">
                    <div className="flex items-center justify-between text-[10px] text-cyan-300 font-bold">
                      <span>💬 無塵室例句：</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            speakEnglish(hotTerm.exampleSentence);
                          }}
                          className="text-cyan-400 hover:text-cyan-200 flex items-center gap-1 cursor-pointer font-bold px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 transition-colors text-[10px]"
                          title="聽例句英文發音"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>聽例句</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            const zh = hotTerm.exampleTranslation || getExampleTranslation(hotTerm.exampleSentence, hotTerm.term);
                            speakChinese(zh);
                          }}
                          className="text-emerald-400 hover:text-emerald-200 flex items-center gap-1 cursor-pointer font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 transition-colors text-[10px]"
                          title="朗讀例句中文意思"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>聽中文</span>
                        </button>
                      </div>
                    </div>
                    <div className="font-mono text-slate-100 text-xs font-semibold pl-0.5">
                      "{hotTerm.exampleSentence}"
                    </div>
                    <div className="text-[11px] text-emerald-300 font-medium bg-emerald-950/40 border border-emerald-800/50 rounded px-2 py-1 leading-relaxed">
                      <span className="font-bold text-emerald-400">中文意思：</span>
                      {hotTerm.exampleTranslation || getExampleTranslation(hotTerm.exampleSentence, hotTerm.term)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {bundleNotice && (
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{bundleNotice}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
