import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  WifiOff,
  Sparkles,
  Layers,
  Repeat,
  FileText,
  Sliders,
  X,
  ChevronUp,
  Cpu,
  Shuffle,
  Clock,
  Zap,
  CheckCircle2,
  Gauge
} from 'lucide-react';
import { useOfflineSpeechPlaylist } from '../hooks/useOfflineSpeechPlaylist';
import { playClickSound, playLaserScanSound } from '../utils/audioEffects';

interface OfflinePlaylistPlayerBarProps {
  onOpenOfflineModal: () => void;
  isOffline: boolean;
}

export const OfflinePlaylistPlayerBar: React.FC<OfflinePlaylistPlayerBarProps> = ({
  onOpenOfflineModal,
  isOffline
}) => {
  const playlist = useOfflineSpeechPlaylist();
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Global Keyboard Shortcuts for Playlist
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space' && (playlist.isPlaying || playlist.isPaused)) {
        e.preventDefault();
        playlist.togglePlayPause();
      } else if (e.code === 'ArrowRight' && playlist.isPlaying) {
        e.preventDefault();
        playlist.next();
      } else if (e.code === 'ArrowLeft' && playlist.isPlaying) {
        e.preventDefault();
        playlist.prev();
      } else if (e.code === 'Escape' && playlist.isPlaying) {
        e.preventDefault();
        playlist.stop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playlist.isPlaying, playlist.isPaused]);

  // Only render if playing, paused, or if offline with active session
  if (!playlist.isPlaying && !playlist.isPaused && !isOffline) {
    return null;
  }

  // If completely idle, return null
  if (!playlist.isPlaying && !playlist.isPaused) {
    return null;
  }

  const currentItem = playlist.currentItem;

  const phaseLabel = () => {
    switch (playlist.currentPhase) {
      case 'word':
        return { text: '1. 英文單字', color: 'bg-amber-400 text-slate-950 font-black' };
      case 'taiwan_trick':
        return { text: '2. 諧音口訣與中文', color: 'bg-cyan-400 text-slate-950 font-black' };
      case 'example':
        return { text: '3. 實戰例句朗讀', color: 'bg-emerald-400 text-slate-950 font-black' };
      case 'interval':
        return { text: '間隔緩衝中...', color: 'bg-slate-800 text-slate-300' };
      case 'paused':
        return { text: '已暫停', color: 'bg-slate-700 text-slate-300' };
      default:
        return { text: '準備就緒', color: 'bg-slate-800 text-slate-300' };
    }
  };

  const currentPhaseInfo = phaseLabel();

  // Format sleep timer seconds
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-[58px] md:bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t-2 border-amber-400/80 shadow-2xl backdrop-blur-xl text-slate-100 px-3 sm:px-6 py-2.5"
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-2">
          
          {/* Main Player Row */}
          <div className="flex items-center justify-between gap-3 flex-wrap lg:flex-nowrap">
            
            {/* Left: Current Playing Info + Audio Visualizer */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <div className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                  playlist.isPlaying && !playlist.isPaused
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  <Volume2 className="w-4 h-4" />
                </div>
                {playlist.isPlaying && !playlist.isPaused && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-black text-amber-300 truncate font-mono">
                    {currentItem ? currentItem.word : '無塵室快取播放清單'}
                  </span>
                  
                  {currentItem?.taiwanPhonetic && (
                    <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800/60 hidden sm:inline">
                      {currentItem.taiwanPhonetic}
                    </span>
                  )}

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${currentPhaseInfo.color}`}>
                    {currentPhaseInfo.text}
                  </span>

                  <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                    [{playlist.currentIndex + 1} / {playlist.totalItemsCount}]
                  </span>

                  {/* Sleep timer remaining badge */}
                  {playlist.sleepTimerSecondsLeft > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/80 font-mono flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTimer(playlist.sleepTimerSecondsLeft)}
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-300 truncate mt-0.5 flex items-center gap-2">
                  <span className="font-bold text-slate-200">
                    {currentItem ? currentItem.translation : '點擊播放即可開始連續朗讀'}
                  </span>
                  {currentItem?.memoryTrick && (
                    <span className="text-slate-400 text-[11px] hidden lg:inline border-l border-slate-700 pl-2">
                      口訣：{currentItem.memoryTrick}
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Audio Waves Animation */}
              {playlist.isPlaying && !playlist.isPaused && (
                <div className="hidden xl:flex items-center gap-1 h-5 px-2 py-1 bg-amber-400/10 border border-amber-400/25 rounded-lg shrink-0">
                  <span className="w-1 h-2.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-4 bg-amber-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-3 bg-amber-400 rounded-full animate-bounce" />
                  <span className="w-1 h-1.5 bg-amber-300 rounded-full animate-bounce [animation-delay:-0.2s]" />
                </div>
              )}
            </div>

            {/* Middle: Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Prev Button */}
              <button
                onClick={() => playlist.prev()}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 active:scale-95 transition-all cursor-pointer"
                title="上一首 (快捷鍵: ←)"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              {/* Play / Pause Toggle */}
              <button
                onClick={() => {
                  playClickSound();
                  playlist.togglePlayPause();
                }}
                className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer ${
                  playlist.isPlaying && !playlist.isPaused
                    ? 'bg-amber-400 text-slate-950 hover:brightness-110 shadow-amber-500/25 border border-amber-300'
                    : 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 hover:brightness-110 shadow-emerald-500/25'
                }`}
                title={playlist.isPlaying && !playlist.isPaused ? '暫停播放 (快捷鍵: 空白鍵)' : '播放清單 (快捷鍵: 空白鍵)'}
              >
                {playlist.isPlaying && !playlist.isPaused ? (
                  <>
                    <Pause className="w-4 h-4 text-slate-950 fill-current" />
                    <span>暫停 (Space)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-slate-950 fill-current" />
                    <span>朗讀 (Space)</span>
                  </>
                )}
              </button>

              {/* Next Button */}
              <button
                onClick={() => playlist.next()}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 active:scale-95 transition-all cursor-pointer"
                title="下一首 (快捷鍵: →)"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Stop Button */}
              <button
                onClick={() => {
                  playClickSound();
                  playlist.stop();
                }}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-700/60 active:scale-95 transition-all cursor-pointer"
                title="停止播放 (快捷鍵: Esc)"
              >
                <Square className="w-4 h-4" />
              </button>

              {/* Toggle Advanced Settings Drawer */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-2 sm:p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  isExpanded
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                }`}
                title="調整進階設定 (隨機抽考、循環單字、定時關閉、語速)"
              >
                <Sliders className="w-4 h-4" />
                <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {/* Open Full Flashcards Modal */}
              <button
                onClick={() => {
                  playClickSound();
                  onOpenOfflineModal();
                }}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 transition-all cursor-pointer hidden sm:flex items-center gap-1.5 text-xs font-bold"
                title="開啟完整離線單字庫清單"
              >
                <Layers className="w-4 h-4 text-amber-400" />
                <span>字卡庫</span>
              </button>
            </div>

          </div>

          {/* Expanded Advanced Tuning Deck */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2 flex-wrap">
                {/* Play Mode Selector */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {(
                    [
                      { mode: 'sequential', label: '循序播放', icon: Play },
                      { mode: 'shuffle', label: '隨機抽考', icon: Shuffle },
                      { mode: 'loop_single', label: '單詞精聽', icon: Repeat },
                      { mode: 'unmastered_only', label: '僅未熟詞', icon: CheckCircle2 }
                    ] as const
                  ).map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.mode}
                        onClick={() => {
                          playClickSound();
                          playlist.updateConfig({ playMode: m.mode });
                        }}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                          playlist.config.playMode === m.mode
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Category selector */}
                <select
                  value={playlist.config.category}
                  onChange={(e) => {
                    playlist.updateConfig({ category: e.target.value as any });
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-2.5 py-1 text-xs outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="all">全站快取 (150+)</option>
                  <option value="equipment">設備機台 (Equipment)</option>
                  <option value="process">黃光薄膜 (Process)</option>
                  <option value="maintenance">維修交接 (Maintenance)</option>
                  <option value="safety">無塵室工安 (Safety)</option>
                </select>

                {/* Speech Speed Tuning */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <Gauge className="w-3 h-3 text-slate-400 ml-1" />
                  {[0.8, 0.95, 1.1].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => playlist.updateConfig({ speechSpeed: spd })}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold cursor-pointer ${
                        playlist.config.speechSpeed === spd
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Repeat Count */}
                <button
                  onClick={() => {
                    playlist.updateConfig({
                      repeatCount: playlist.config.repeatCount === 1 ? 2 : 1
                    });
                  }}
                  className={`px-2.5 py-1 rounded-xl border font-bold text-[11px] flex items-center gap-1 cursor-pointer ${
                    playlist.config.repeatCount === 2
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <Repeat className="w-3 h-3" />
                  <span>重複: {playlist.config.repeatCount}次</span>
                </button>

                {/* Include Example Sentence */}
                <button
                  onClick={() => {
                    playlist.updateConfig({
                      includeExample: !playlist.config.includeExample
                    });
                  }}
                  className={`px-2.5 py-1 rounded-xl border font-bold text-[11px] flex items-center gap-1 cursor-pointer ${
                    playlist.config.includeExample
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 line-through'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>實戰例句</span>
                </button>

                {/* Include Memory Trick */}
                <button
                  onClick={() => {
                    playlist.updateConfig({
                      includeMemoryTrick: !playlist.config.includeMemoryTrick
                    });
                  }}
                  className={`px-2.5 py-1 rounded-xl border font-bold text-[11px] flex items-center gap-1 cursor-pointer ${
                    playlist.config.includeMemoryTrick
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 line-through'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>諧音口訣</span>
                </button>
              </div>

              {/* Sleep Timer & Interval Seconds */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Sleep Timer */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <Clock className="w-3 h-3 text-slate-400 ml-1" />
                  <span className="text-slate-400 text-[11px] font-bold">定時關閉:</span>
                  {[0, 5, 15, 30].map((min) => (
                    <button
                      key={min}
                      onClick={() => playlist.updateConfig({ sleepTimerMinutes: min })}
                      className={`px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold cursor-pointer ${
                        playlist.config.sleepTimerMinutes === min
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {min === 0 ? '關' : `${min}m`}
                    </button>
                  ))}
                </div>

                {/* Interval Seconds */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] font-bold ml-1">間隔:</span>
                  {[1.0, 1.5, 2.0, 3.0].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => playlist.updateConfig({ intervalSeconds: sec })}
                      className={`px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold cursor-pointer ${
                        playlist.config.intervalSeconds === sec
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
