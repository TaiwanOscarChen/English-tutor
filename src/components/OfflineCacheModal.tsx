import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Layers,
  Volume2,
  CheckCircle2,
  Circle,
  RotateCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Copy,
  WifiOff,
  Sparkles,
  Bookmark,
  ShieldCheck,
  Cpu,
  BookOpen,
  Filter,
  Check,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Repeat,
  FileText,
  Sliders,
  Radio
} from 'lucide-react';
import { FAB_VOCAB } from '../data/fabVocab';
import { VocabItem } from '../types';
import { PRESET_LESSONS } from '../data/presetLessons';
import { speakEnglish, cancelSpeech } from '../utils/speech';
import { useOfflineSpeechPlaylist } from '../hooks/useOfflineSpeechPlaylist';
import {
  playClickSound,
  playSuccessChime,
  playLaserScanSound,
  playWaferSnapSound
} from '../utils/audioEffects';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getExampleTranslation } from '../utils/exampleSentenceTranslator';

interface OfflineCacheModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechSpeed: number;
  reviewedVocabIds: string[];
  onToggleVocabReviewed: (id: string) => void;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
}

type ViewMode = 'playlist' | 'flashcards' | 'list' | 'scenarios';
type CategoryFilter = 'all' | 'equipment' | 'process' | 'maintenance' | 'safety';

export const OfflineCacheModal: React.FC<OfflineCacheModalProps> = ({
  isOpen,
  onClose,
  speechSpeed,
  reviewedVocabIds,
  onToggleVocabReviewed,
  isSimulatedOffline,
  onToggleSimulatedOffline
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('playlist');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const playlist = useOfflineSpeechPlaylist();

  // Keep playlist reviewed IDs synced for 'unmastered_only' mode
  useEffect(() => {
    playlist.setReviewedVocabIds(reviewedVocabIds);
  }, [reviewedVocabIds]);

  // Filtered Vocab List
  const filteredVocab = useMemo(() => {
    return FAB_VOCAB.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        item.word.toLowerCase().includes(q) ||
        item.translation.toLowerCase().includes(q) ||
        (item.taiwanPhonetic && item.taiwanPhonetic.toLowerCase().includes(q)) ||
        item.memoryTrick.toLowerCase().includes(q) ||
        item.cleanroomContext.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchTerm]);

  // Adjust card index when list changes
  useEffect(() => {
    if (currentCardIndex >= filteredVocab.length) {
      setCurrentCardIndex(0);
    }
    setIsFlipped(false);
  }, [filteredVocab.length]);

  const currentVocab: VocabItem | undefined = filteredVocab[currentCardIndex] || filteredVocab[0];

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
        playWaferSnapSound();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyN') {
        e.preventDefault();
        handleNextCard();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyP') {
        e.preventDefault();
        handlePrevCard();
      } else if (e.code === 'Enter') {
        e.preventDefault();
        if (currentVocab) {
          handlePronounce(currentVocab.word);
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentVocab, filteredVocab.length]);

  if (!isOpen) return null;

  const handlePronounce = (text: string) => {
    setIsSpeaking(true);
    speakEnglish(text, speechSpeed, () => {
      setIsSpeaking(false);
    });
  };

  const handleNextCard = () => {
    if (filteredVocab.length === 0) return;
    playClickSound();
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % filteredVocab.length);
  };

  const handlePrevCard = () => {
    if (filteredVocab.length === 0) return;
    playClickSound();
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + filteredVocab.length) % filteredVocab.length);
  };

  const handleShuffleCard = () => {
    if (filteredVocab.length <= 1) return;
    playLaserScanSound();
    setIsFlipped(false);
    let rand = Math.floor(Math.random() * filteredVocab.length);
    if (rand === currentCardIndex) {
      rand = (rand + 1) % filteredVocab.length;
    }
    setCurrentCardIndex(rand);
  };

  const handleCopyAllNotes = () => {
    playClickSound();
    const text = FAB_VOCAB
      .map(
        (v, i) =>
          `[${i + 1}] ${v.word} (${v.partOfSpeech}) [${v.category}]\n中文：${v.translation}\n諧音：${v.taiwanPhonetic}\n口訣：${v.memoryTrick}\n例句：${v.exampleSentence}（中文意思：${v.exampleTranslation || v.exampleSentenceZh || getExampleTranslation(v.exampleSentence, v.word)}）\n脈絡：${v.cleanroomContext}\n`
      )
      .join('\n----------------------------------------\n\n');

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const reviewedProgress = Math.round(
    (reviewedVocabIds.length / FAB_VOCAB.length) * 100
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-slate-900 border-2 border-amber-400/90 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100 relative litho-laser-line"
      >
        
        {/* Top Header Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl text-slate-950 font-black shadow-md shadow-amber-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-1.5">
                  無塵室離線快取單字庫
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/80 text-[10px] font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  100% 離線就緒
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                地下廠房 / 無訊號無塵室專用 · 本機發音與完整單字卡已全數預載
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Offline Simulation Toggle */}
            <button
              onClick={() => {
                onToggleSimulatedOffline();
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isSimulatedOffline
                  ? 'bg-amber-400 text-slate-950 font-black border-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="切換模擬離線狀態，測試離線複習功能"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isSimulatedOffline ? '離線模式：開啟' : '離線模式：關閉'}
              </span>
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Mode Tabs & Progress */}
        <div className="p-2.5 sm:p-3 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <button
              onClick={() => {
                playClickSound();
                setViewMode('playlist');
              }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'playlist'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${playlist.isPlaying && !playlist.isPaused ? 'text-slate-950 animate-pulse' : 'text-amber-400'}`} />
              <span>一鍵朗讀播放清單</span>
              {playlist.isPlaying && !playlist.isPaused && (
                <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
              )}
            </button>

            <button
              onClick={() => {
                playClickSound();
                setViewMode('flashcards');
              }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'flashcards'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>抽卡複習</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setViewMode('list');
              }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>單字清單 ({FAB_VOCAB.length})</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setViewMode('scenarios');
              }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'scenarios'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>24 實戰金句</span>
            </button>
          </div>

          {/* Progress Tracker */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium text-[11px]">已複習掌握：</span>
              <span className="font-mono font-black text-amber-300">
                {reviewedVocabIds.length} / {FAB_VOCAB.length}
              </span>
              <span className="text-slate-500 font-mono text-[10px]">({reviewedProgress}%)</span>
            </div>

            <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 transition-all duration-300"
                style={{ width: `${reviewedProgress}%` }}
              />
            </div>

            <button
              onClick={handleCopyAllNotes}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
              title="匯出並複製所有單字卡文字"
            >
              {copiedNotification ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-amber-400" />
              )}
              <span>{copiedNotification ? '已複製！' : '匯出文字'}</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar (for Flashcards and List) */}
        {viewMode !== 'scenarios' && (
          <div className="p-2.5 sm:p-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜尋單字、中文或諧音..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-sans"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
              {[
                { id: 'all', label: '全部' },
                { id: 'equipment', label: '機台設備' },
                { id: 'process', label: '製程術語' },
                { id: 'maintenance', label: '維修保養' },
                { id: 'safety', label: '工安防護' }
              ].map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      playClickSound();
                      setSelectedCategory(cat.id as CategoryFilter);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 font-black'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {/* 0. Offline Batch Speech Playlist Mode */}
          {viewMode === 'playlist' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              {/* Player Deck Spotlight */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 border-2 border-amber-400/80 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden litho-laser-line">
                {/* Background glow */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-4">
                  {/* Top Status & Phase Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20">
                        <Radio className="w-3.5 h-3.5" />
                        離線批次連續朗讀中
                      </span>

                      {playlist.currentItem && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700">
                          進度：{playlist.currentIndex + 1} / {playlist.totalItemsCount}
                        </span>
                      )}
                    </div>

                    {/* Current Phase Indicator */}
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs px-3 py-1 rounded-full font-mono font-black border ${
                        playlist.currentPhase === 'word'
                          ? 'bg-amber-400 text-slate-950 border-amber-300 animate-pulse'
                          : playlist.currentPhase === 'taiwan_trick'
                          ? 'bg-cyan-400 text-slate-950 border-cyan-300 animate-pulse'
                          : playlist.currentPhase === 'example'
                          ? 'bg-emerald-400 text-slate-950 border-emerald-300 animate-pulse'
                          : playlist.currentPhase === 'interval'
                          ? 'bg-slate-800 text-slate-300 border-slate-700'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {playlist.currentPhase === 'word' && '▶ 步驟 1: 英文單字朗讀'}
                        {playlist.currentPhase === 'taiwan_trick' && '▶ 步驟 2: 諧音口訣與釋義'}
                        {playlist.currentPhase === 'example' && '▶ 步驟 3: 實戰例句朗讀'}
                        {playlist.currentPhase === 'interval' && '⏳ 步驟 4: 間隔緩衝中...'}
                        {playlist.currentPhase === 'paused' && '⏸ 已暫停'}
                        {playlist.currentPhase === 'idle' && '準備就緒'}
                      </span>
                    </div>
                  </div>

                  {/* Active Vocab Spotlight Card */}
                  {playlist.currentItem ? (
                    <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
                              {playlist.currentItem.word}
                            </h3>
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              {playlist.currentItem.partOfSpeech}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-mono">
                              {playlist.currentItem.taiwanPhonetic}
                            </span>
                          </div>
                          <div className="text-base font-black text-slate-100 mt-1">
                            {playlist.currentItem.translation}
                          </div>
                        </div>

                        {/* Audio Waveform Animation when playing */}
                        {playlist.isPlaying && !playlist.isPaused && (
                          <div className="flex items-center gap-1 h-6 px-2 py-1 bg-amber-400/10 border border-amber-400/30 rounded-lg">
                            <span className="w-1 h-3 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1 h-5 bg-amber-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1 h-4 bg-amber-400 rounded-full animate-bounce" />
                            <span className="w-1 h-2 bg-amber-300 rounded-full animate-bounce [animation-delay:-0.2s]" />
                          </div>
                        )}
                      </div>

                      {/* Memory Trick Note */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-cyan-300">台味諧音口訣：</span>
                          <span className="text-slate-200">{playlist.currentItem.memoryTrick}</span>
                        </div>
                      </div>

                      {/* Example Sentence with Chinese translation */}
                      {playlist.currentItem.exampleSentence && (
                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-xs space-y-1">
                          <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                            <FileText className="w-3.5 h-3.5" />
                            <span>無塵室實戰例句：</span>
                          </div>
                          <p className="font-mono font-medium text-slate-100 text-xs sm:text-sm">
                            "{playlist.currentItem.exampleSentence}"
                          </p>
                          <p className="text-emerald-300 font-medium text-[11px]">
                            中文意思：{playlist.currentItem.exampleTranslation || playlist.currentItem.exampleSentenceZh || getExampleTranslation(playlist.currentItem.exampleSentence, playlist.currentItem.word)}
                          </p>
                          <p className="text-slate-400 text-[11px]">
                            情境：{playlist.currentItem.cleanroomContext}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800">
                      <p className="text-slate-300 text-sm">尚未開始播放，請點擊下方播放鈕啟動批次朗讀清單</p>
                    </div>
                  )}

                  {/* Playback Controls Deck */}
                  <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => playlist.prev()}
                        className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 active:scale-95 transition-all cursor-pointer shadow-md"
                        title="上一首 (←)"
                      >
                        <SkipBack className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => {
                          playClickSound();
                          playlist.togglePlayPause();
                        }}
                        className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl active:scale-95 transition-all cursor-pointer ${
                          playlist.isPlaying && !playlist.isPaused
                            ? 'bg-amber-400 text-slate-950 hover:brightness-110 shadow-amber-500/30 border border-amber-300'
                            : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300 text-slate-950 hover:brightness-110 shadow-emerald-500/30'
                        }`}
                      >
                        {playlist.isPlaying && !playlist.isPaused ? (
                          <>
                            <Pause className="w-5 h-5 text-slate-950 fill-current" />
                            <span>暫停朗讀 (Space)</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5 text-slate-950 fill-current" />
                            <span>開始一鍵連續朗讀</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => playlist.next()}
                        className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 active:scale-95 transition-all cursor-pointer shadow-md"
                        title="下一首 (→)"
                      >
                        <SkipForward className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => {
                          playClickSound();
                          playlist.stop();
                        }}
                        className="p-3 rounded-2xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 active:scale-95 transition-all cursor-pointer"
                        title="停止並重置"
                      >
                        <Square className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex-1 min-w-[200px] flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 transition-all duration-300"
                          style={{
                            width: `${Math.round(((playlist.currentIndex + 1) / Math.max(1, playlist.totalItemsCount)) * 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-300 shrink-0">
                        {Math.round(((playlist.currentIndex + 1) / Math.max(1, playlist.totalItemsCount)) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Play Mode & Advanced Controls Bar */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                    {/* Play Mode Selector */}
                    <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
                      {(
                        [
                          { mode: 'sequential', label: '循序播放', icon: Play },
                          { mode: 'shuffle', label: '隨機抽考', icon: Shuffle },
                          { mode: 'loop_single', label: '單詞精聽', icon: Repeat },
                          { mode: 'unmastered_only', label: '僅未熟詞', icon: CheckCircle2 }
                        ] as const
                      ).map((m) => {
                        const Icon = m.icon;
                        const isActive = playlist.config.playMode === m.mode;
                        return (
                          <button
                            key={m.mode}
                            onClick={() => {
                              playClickSound();
                              playlist.updateConfig({ playMode: m.mode });
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                              isActive
                                ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Speed & Sleep Timer */}
                    <div className="flex items-center gap-2">
                      {/* Sleep Timer */}
                      <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-xs">
                        <span className="text-slate-400 font-bold ml-1 text-[11px]">定時:</span>
                        {[0, 5, 15, 30].map((min) => (
                          <button
                            key={min}
                            onClick={() => playlist.updateConfig({ sleepTimerMinutes: min })}
                            className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                              playlist.config.sleepTimerMinutes === min
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {min === 0 ? '關' : `${min}m`}
                          </button>
                        ))}
                      </div>

                      {/* Speed Presets */}
                      <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-xs">
                        <span className="text-slate-400 font-bold ml-1 text-[11px]">語速:</span>
                        {[0.8, 0.95, 1.1].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => playlist.updateConfig({ speechSpeed: spd })}
                            className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                              playlist.config.speechSpeed === spd
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Playlist Advanced Tuning Options */}
                  <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                    {/* Auto-start on Offline Toggle */}
                    <button
                      onClick={() => {
                        playlist.updateConfig({
                          autoStartOnOffline: !playlist.config.autoStartOnOffline
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        playlist.config.autoStartOnOffline
                          ? 'bg-amber-500/15 border-amber-400/60 text-amber-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>斷網時自動朗讀</span>
                      <span className="font-mono text-[11px]">
                        {playlist.config.autoStartOnOffline ? '已開啟' : '已關閉'}
                      </span>
                    </button>

                    {/* Word Repeat Count */}
                    <button
                      onClick={() => {
                        playlist.updateConfig({
                          repeatCount: playlist.config.repeatCount === 1 ? 2 : 1
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        playlist.config.repeatCount === 2
                          ? 'bg-amber-400 text-slate-950 font-black border-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span>單字重複次數</span>
                      <span className="font-mono">{playlist.config.repeatCount} 次</span>
                    </button>

                    {/* Include Example Sentence */}
                    <button
                      onClick={() => {
                        playlist.updateConfig({
                          includeExample: !playlist.config.includeExample
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        playlist.config.includeExample
                          ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>朗讀實戰例句</span>
                      <span className="font-mono">{playlist.config.includeExample ? '開啟' : '略過'}</span>
                    </button>

                    {/* Interval buffer */}
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">間隔緩衝</span>
                      <div className="flex items-center gap-1">
                        {[1.0, 1.5, 2.0, 3.0].map((s) => (
                          <button
                            key={s}
                            onClick={() => playlist.updateConfig({ intervalSeconds: s })}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                              playlist.config.intervalSeconds === s
                                ? 'bg-amber-400 text-slate-950 border-amber-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            {s}s
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Playlist Queue Header & Category Filter */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-200 flex items-center gap-2">
                  <span>播放清單佇列 ({filteredVocab.length} 首)</span>
                  <span className="text-[11px] text-slate-400 font-normal">點擊任一項目即可指定從該單字開始朗讀</span>
                </h4>

                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'all', label: '全部' },
                      { id: 'equipment', label: '設備' },
                      { id: 'process', label: '製程' },
                      { id: 'maintenance', label: '維修' },
                      { id: 'safety', label: '工安' }
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        playClickSound();
                        playlist.updateConfig({ category: cat.id as any });
                        setSelectedCategory(cat.id as any);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        playlist.config.category === cat.id
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Queue List Rows */}
              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {filteredVocab.map((vocab, index) => {
                  const isCurrent = playlist.currentIndex === index && playlist.isPlaying;
                  const isReviewed = reviewedVocabIds.includes(vocab.id);

                  return (
                    <div
                      key={vocab.id || index}
                      onClick={() => {
                        playlist.start(index);
                      }}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                        isCurrent
                          ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400/40 text-white'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs text-slate-400 w-6 text-right shrink-0">
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-mono font-black text-sm ${isCurrent ? 'text-amber-300' : 'text-slate-100'}`}>
                              {vocab.word}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              {vocab.partOfSpeech}
                            </span>
                            <span className="text-xs text-cyan-300 font-medium break-words">
                              {vocab.translation}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 break-words mt-0.5 leading-snug">
                            口訣：{vocab.memoryTrick} · 例句：{vocab.exampleSentence}（{vocab.exampleTranslation || vocab.exampleSentenceZh || getExampleTranslation(vocab.exampleSentence, vocab.word)}）
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isCurrent ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center gap-1">
                            <Volume2 className="w-3 h-3 animate-pulse" />
                            正在朗讀
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playlist.start(index);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-amber-400 group-hover:text-slate-950 text-slate-400 transition-all"
                            title="從此單字開始播放"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVocabReviewed(vocab.id);
                          }}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isReviewed
                              ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                          title="標記已掌握"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 1. Flashcard Carousel Mode */}
          {viewMode === 'flashcards' && (
            <div className="max-w-xl mx-auto space-y-4">
              {filteredVocab.length === 0 ? (
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <p className="text-sm text-slate-300">找不到符合條件的單字卡</p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                    }}
                    className="text-xs text-amber-400 hover:underline font-bold"
                  >
                    重設過濾條件
                  </button>
                </div>
              ) : currentVocab ? (
                <>
                  {/* Card Pagination indicator & Actions */}
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span className="font-mono">
                      單字卡 <strong className="text-amber-300 text-sm">{currentCardIndex + 1}</strong> / {filteredVocab.length}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleShuffleCard}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 font-bold transition-all cursor-pointer text-xs"
                        title="隨機抽下一張卡片"
                      >
                        <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
                        <span>隨機抽卡</span>
                      </button>

                      <button
                        onClick={() => {
                          playSuccessChime();
                          onToggleVocabReviewed(currentVocab.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          reviewedVocabIds.includes(currentVocab.id)
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-600 font-black'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {reviewedVocabIds.includes(currentVocab.id) ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{reviewedVocabIds.includes(currentVocab.id) ? '已複習' : '標記複習'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive Flip Card */}
                  <div
                    onClick={() => {
                      playWaferSnapSound();
                      setIsFlipped(!isFlipped);
                    }}
                    className="relative min-h-[300px] sm:min-h-[320px] rounded-3xl cursor-pointer perspective-1000 select-none group"
                  >
                    <div
                      className={`w-full h-full min-h-[300px] sm:min-h-[320px] rounded-3xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between shadow-2xl border-2 ${
                        isFlipped
                          ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 border-cyan-400/90 ring-2 ring-cyan-400/30'
                          : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-amber-400/90 ring-2 ring-amber-400/30 hover:border-amber-300'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-300 border border-slate-700 text-xs font-mono font-bold">
                          {currentVocab.category === 'equipment' && '機台設備'}
                          {currentVocab.category === 'process' && '製程術語'}
                          {currentVocab.category === 'maintenance' && '維修保養'}
                          {currentVocab.category === 'safety' && '工安防護'}
                          <span className="text-slate-500 ml-1">({currentVocab.partOfSpeech})</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePronounce(currentVocab.word);
                            }}
                            className="p-2 rounded-xl bg-amber-400 hover:bg-yellow-300 text-slate-950 font-black shadow-md transition-all active:scale-90"
                            title="離線朗讀單字"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Card Body (Front or Back) */}
                      {!isFlipped ? (
                        /* Front Face */
                        <div className="text-center my-auto space-y-3 py-4 w-full max-w-md mx-auto">
                          <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight break-words">
                            {currentVocab.word}
                          </div>

                          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 space-y-1.5 text-left shadow-inner">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono font-bold shrink-0">
                                注音
                              </span>
                              <span className="text-amber-300 font-mono font-black text-xs sm:text-sm tracking-wider break-words flex-1">
                                {(() => {
                                  const zh = convertPhoneticToZhuyin(currentVocab.taiwanPhonetic);
                                  const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                                  return clean ? `【 ${clean} 】` : '—';
                                })()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800/80 min-w-0">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold shrink-0">
                                諧音
                              </span>
                              <span className="text-emerald-300 font-sans font-black text-xs sm:text-sm tracking-wider break-words flex-1">
                                {(() => {
                                  const clean = currentVocab.taiwanPhonetic.trim().replace(/^【\s*|\s*】$/g, '').trim();
                                  return clean ? `【 ${clean} 】` : '—';
                                })()}
                              </span>
                            </div>
                          </div>

                          <div className="pt-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-400 group-hover:text-amber-300 transition-colors">
                              <RotateCw className="w-3 h-3 animate-spin-slow" />
                              點擊卡片翻面看中文口訣
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Back Face */
                        <div className="my-auto space-y-3 py-2 animate-fade-in">
                          <div className="text-center space-y-1">
                            <div className="text-xl sm:text-2xl font-black text-cyan-300">
                              {currentVocab.translation}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {currentVocab.word} · {currentVocab.taiwanPhonetic}
                            </div>
                          </div>

                          {/* Memory Trick */}
                          <div className="p-3 bg-amber-400 rounded-xl text-slate-950 font-black text-xs sm:text-sm shadow-md">
                            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-slate-900 mb-0.5 opacity-80">
                              <span>💡 台味諧音口訣</span>
                            </div>
                            <p className="leading-snug">{currentVocab.memoryTrick}</p>
                          </div>

                          {/* Cleanroom Context */}
                          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1">
                            <div className="text-cyan-400 font-bold text-[11px]">
                              🏭 無塵室實務脈絡與例句：
                            </div>
                            <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                              "{currentVocab.exampleSentence}"
                            </p>
                            <p className="text-emerald-300 font-medium text-[11px]">
                              中文意思：{currentVocab.exampleTranslation || currentVocab.exampleSentenceZh || getExampleTranslation(currentVocab.exampleSentence, currentVocab.word)}
                            </p>
                            <p className="text-slate-400 text-[10px]">
                              {currentVocab.cleanroomContext}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Card Footer */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                        <span>鍵盤：[空白鍵] 翻卡 · [Enter] 發音</span>
                        <span>[← / →] 上下一張</span>
                      </div>
                    </div>
                  </div>

                  {/* Carousel Controls */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      onClick={handlePrevCard}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>上一張 (P)</span>
                    </button>

                    <button
                      onClick={handleNextCard}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      <span>下一張 (N)</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* 2. List Grid Mode */}
          {viewMode === 'list' && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filteredVocab.map((vocab, idx) => {
                  const isReviewed = reviewedVocabIds.includes(vocab.id);
                  return (
                    <div
                      key={vocab.id || idx}
                      className={`p-3 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${
                        isReviewed
                          ? 'bg-slate-950/80 border-slate-800'
                          : 'bg-slate-900/90 border-slate-700/80 hover:border-amber-400/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-black text-sm text-slate-100">
                              {vocab.word}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                              {vocab.partOfSpeech}
                            </span>
                          </div>
                          <div className="text-xs font-black text-cyan-300 mt-0.5">
                            {vocab.translation}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handlePronounce(vocab.word)}
                            className="p-1.5 rounded-lg bg-amber-400/90 hover:bg-amber-300 text-slate-950 transition-all"
                            title="朗讀"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onToggleVocabReviewed(vocab.id)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isReviewed
                                ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                            title="標記為已複習"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 text-[11px] space-y-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] font-mono font-bold shrink-0">注音</span>
                          <span className="text-amber-300 font-mono font-black break-words flex-1">
                            {(() => {
                              const zh = convertPhoneticToZhuyin(vocab.taiwanPhonetic);
                              const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                              return clean ? `【 ${clean} 】` : '—';
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/70 min-w-0">
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold shrink-0">諧音</span>
                          <span className="text-emerald-300 font-sans font-bold break-words flex-1">
                            {(() => {
                              const clean = vocab.taiwanPhonetic.trim().replace(/^【\s*|\s*】$/g, '').trim();
                              return clean ? `【 ${clean} 】` : '—';
                            })()}
                          </span>
                        </div>
                        <div className="text-slate-300 leading-snug pt-1 border-t border-slate-800/70">
                          💡 {vocab.memoryTrick}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. 24 Cleanroom Scenario Sentences Mode */}
          {viewMode === 'scenarios' && (
            <div className="space-y-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex items-center justify-between">
                <span>已全數快取 24 組每日特訓實戰情境金句，離線狀態隨時點選發音！</span>
                <span className="font-mono font-bold text-amber-300">24 / 24 快取就緒</span>
              </div>

              <div className="space-y-2">
                {PRESET_LESSONS.map((lesson, idx) => (
                  <div
                    key={lesson.id || idx}
                    className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl hover:border-cyan-500/50 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-amber-300">
                        關卡 {idx + 1}：{lesson.scenario}
                      </span>
                      <button
                        onClick={() => handlePronounce(lesson.english_sentence)}
                        className="px-2 py-1 rounded-lg bg-amber-400 hover:bg-yellow-300 text-slate-950 font-black text-[11px] flex items-center gap-1 shrink-0"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>朗讀</span>
                      </button>
                    </div>

                    <div className="font-mono font-black text-sm text-slate-100">
                      {lesson.english_sentence}
                    </div>

                    <div className="text-xs text-cyan-300 font-medium">
                      中文：{lesson.chinese_translation}
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800/90 rounded-lg p-2 space-y-1 text-[11px]">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] font-mono font-bold shrink-0">注音</span>
                        <span className="font-mono font-black text-amber-300/95 tracking-wide break-words flex-1">
                          {(() => {
                            const zh = convertPhoneticToZhuyin(lesson.phonetic_taiwan);
                            const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                            return clean ? `【 ${clean} 】` : '';
                          })()}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 pt-1 border-t border-slate-800/80 min-w-0">
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold shrink-0">諧音</span>
                        <span className="font-sans font-bold text-emerald-300/95 tracking-wide break-words flex-1">
                          {(() => {
                            const clean = lesson.phonetic_taiwan.trim().replace(/^【\s*|\s*】$/g, '').trim();
                            return clean ? `【 ${clean} 】` : '';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono text-emerald-400 font-bold">Offline Cache Active</span>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            關閉視窗
          </button>
        </div>

      </motion.div>
    </div>
  );
};
