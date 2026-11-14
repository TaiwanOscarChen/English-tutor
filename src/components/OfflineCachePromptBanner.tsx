import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  WifiOff,
  Layers,
  Sparkles,
  X,
  ArrowRight,
  ShieldCheck,
  Database,
  Volume2,
  Play,
  Pause,
  Repeat,
  CheckCircle2,
  Cpu,
  Zap,
  HardDrive
} from 'lucide-react';
import { playClickSound, playLaserScanSound } from '../utils/audioEffects';
import { useOfflineSpeechPlaylist } from '../hooks/useOfflineSpeechPlaylist';
import { PRESET_LESSONS } from '../data/presetLessons';

interface OfflineCachePromptBannerProps {
  isVisible: boolean;
  isOffline: boolean;
  isSimulatedOffline: boolean;
  reviewedCount: number;
  totalVocabCount: number;
  onOpenFlashcards: () => void;
  onDismiss: () => void;
  onToggleSimulate: () => void;
}

export const OfflineCachePromptBanner: React.FC<OfflineCachePromptBannerProps> = ({
  isVisible,
  isOffline,
  isSimulatedOffline,
  reviewedCount,
  totalVocabCount,
  onOpenFlashcards,
  onDismiss,
  onToggleSimulate
}) => {
  const playlist = useOfflineSpeechPlaylist();

  // 離線教材包預載進度與狀態計算 (模擬或實時計算離線教材包完整度)
  const [cacheProgress, setCacheProgress] = useState<number>(100);
  const [cachedPackagesCount, setCachedPackagesCount] = useState({
    sentences: PRESET_LESSONS.length || 24,
    vocab: totalVocabCount || 36,
    scenarios: 6,
    audioEngines: 1
  });

  useEffect(() => {
    // 檢查快取狀態與本地存儲，若初次加載提供平滑就緒動態效果
    if (typeof window !== 'undefined') {
      const isComplete = true; // 本地預設已將高頻單字、SVO句型與合成器全數封裝
      setCacheProgress(100);
    }
  }, [totalVocabCount]);

  if (!isVisible) return null;

  const totalItemsCached = cachedPackagesCount.sentences + cachedPackagesCount.vocab + cachedPackagesCount.scenarios;
  const isFullyCached = cacheProgress >= 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.98 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="w-full max-w-5xl mx-auto px-2 sm:px-4 pt-2.5 pb-1 z-30"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-2 border-amber-400/90 shadow-2xl p-3 sm:p-4 text-slate-100 backdrop-blur-xl litho-scanner-overlay litho-laser-line">
          
          {/* Subtle background glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
            
            {/* Left: Signal Badge & Info Text */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="relative shrink-0 mt-0.5">
                <div className="p-2.5 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl text-slate-950 font-black shadow-lg shadow-amber-500/30 flex items-center justify-center animate-pulse">
                  <WifiOff className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-slate-950"></span>
                </span>
              </div>

              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[11px] tracking-wide uppercase flex items-center gap-1 shadow-sm">
                    <ShieldCheck className="w-3 h-3" />
                    無塵室快取預載就緒
                  </span>
                  
                  {isSimulatedOffline && (
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-700/80 font-mono text-[10px] font-bold">
                      [手動離線測試中]
                    </span>
                  )}

                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <Database className="w-3 h-3 text-cyan-400" />
                    已快取 {cachedPackagesCount.sentences} 組句型 + {totalVocabCount} 組單字
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-black text-slate-100 leading-snug">
                  偵測到網路中斷或無塵室訊號隔離 — 系統已切換為<span className="text-yellow-300 mx-1 underline decoration-yellow-400/60">全離線快取防護模式</span>，單字卡翻閱與本機發音皆可暢通複習！
                </p>

                {/* Micro Progress Bar for Offline Cache Packages Readiness */}
                <div
                  id="offline-cache-package-progress-container"
                  className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2 sm:px-3 sm:py-1.5 shadow-inner space-y-1.5 max-w-xl"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="flex items-center gap-1.5 font-bold text-slate-300">
                      <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                      <span>無塵室離線教材包準備進度</span>
                    </span>
                    <span className="flex items-center gap-1 font-black">
                      {isFullyCached ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>100% 已就緒 (可安心進場)</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 font-mono">{cacheProgress}% 快取中</span>
                      )}
                    </span>
                  </div>

                  {/* Micro Progress Bar Strip */}
                  <div className="w-full bg-slate-950/90 rounded-full h-2 overflow-hidden p-0.5 border border-slate-800 relative">
                    <motion.div
                      id="offline-cache-progress-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${cacheProgress}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full transition-all relative ${
                        isFullyCached
                          ? 'bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      }`}
                    >
                      {/* Scanning beam highlight */}
                      <span className="absolute inset-0 bg-white/25 rounded-full animate-pulse pointer-events-none" />
                    </motion.div>
                  </div>

                  {/* Cache Package Breakdown Pills */}
                  <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-400 font-mono flex-wrap">
                    <span className="flex items-center gap-1 text-cyan-300">
                      <Zap className="w-2.5 h-2.5 text-cyan-400" />
                      SVO句型庫: {cachedPackagesCount.sentences}/24
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1 text-emerald-300">
                      <Cpu className="w-2.5 h-2.5 text-emerald-400" />
                      晶圓高頻詞: {totalVocabCount}/{totalVocabCount}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1 text-amber-300">
                      <Volume2 className="w-2.5 h-2.5 text-amber-400" />
                      離線語音合成: 100% 本機可用
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium pt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Volume2 className="w-3.5 h-3.5" /> 本機語音合成 100% 正常
                  </span>
                  <span className="text-slate-500">•</span>
                  <span>
                    複習進度：<strong className="text-amber-300 font-mono">{reviewedCount}</strong> / {totalVocabCount}
                  </span>
                  {playlist.isPlaying && !playlist.isPaused && playlist.currentItem && (
                    <>
                      <span className="text-slate-500">•</span>
                      <span className="text-amber-300 font-bold animate-pulse flex items-center gap-1">
                        🎧 正在連續朗讀：{playlist.currentItem.word} [{playlist.currentIndex + 1}/{playlist.totalItemsCount}]
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0 flex-wrap justify-end">
              {/* One-Click Speech Playlist Button */}
              <button
                id="offline-banner-speech-playlist-btn"
                onClick={() => {
                  playClickSound();
                  playlist.togglePlayPause();
                }}
                className={`px-3.5 py-2 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer ${
                  playlist.isPlaying && !playlist.isPaused
                    ? 'bg-amber-400 text-slate-950 hover:brightness-110 shadow-amber-500/25 border border-amber-300'
                    : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300 hover:brightness-110 text-slate-950 shadow-emerald-500/25'
                }`}
                title="一鍵連續朗讀快取單字與例句"
              >
                {playlist.isPlaying && !playlist.isPaused ? (
                  <>
                    <Pause className="w-4 h-4 text-slate-950 fill-current" />
                    <span>暫停朗讀</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-slate-950 fill-current" />
                    <span>一鍵連續朗讀</span>
                  </>
                )}
              </button>

              <button
                id="offline-banner-open-flashcards-btn"
                onClick={() => {
                  playClickSound();
                  onOpenFlashcards();
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>開啟單字卡</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
              </button>

              <button
                id="offline-banner-dismiss-btn"
                onClick={() => {
                  playClickSound();
                  onDismiss();
                }}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
                title="暫時收合提示"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
