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
  Radio,
  Download
} from 'lucide-react';
import { FAB_VOCAB } from '../data/fabVocab';
import { VocabItem } from '../types';
import { PRESET_LESSONS } from '../data/presetLessons';
import { speakEnglish, cancelSpeech, cleanEnglishText, splitTtsChunks, isSentenceAudioCached } from '../utils/speech';
import { useOfflineSpeechPlaylist } from '../hooks/useOfflineSpeechPlaylist';
import { getAudioCacheStats, generateAudioCacheKey, pruneOldestAudioCache } from '../utils/audioCacheDB';
import {
  prefetchCloudAudioBatch,
  CloudAudioBatchProgress,
  isIdleAudioPrefetchEnabled,
  setIdleAudioPrefetchEnabled
} from '../utils/speechPrefetcher';
import {
  playClickSound,
  playSuccessChime,
  playLaserScanSound,
  playWaferSnapSound
} from '../utils/audioEffects';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getExampleTranslation } from '../utils/exampleSentenceTranslator';
import { getLessonAllSentences } from '../utils/lessonSentenceHelper';

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
  const [playableBlobCount, setPlayableBlobCount] = useState(0);
  const [cacheBytes, setCacheBytes] = useState(0);
  const [cachedIdSet, setCachedIdSet] = useState<Set<string>>(() => new Set());
  const [isPreloadingAudio, setIsPreloadingAudio] = useState(false);
  const [activePackId, setActivePackId] = useState<string | null>(null);
  const [showCategoryPacks, setShowCategoryPacks] = useState(false);
  const [idlePrefetchEnabled, setIdlePrefetchEnabledState] = useState<boolean>(() => isIdleAudioPrefetchEnabled());
  const [pruneNotice, setPruneNotice] = useState<string | null>(null);
  const [preloadProgress, setPreloadProgress] = useState<CloudAudioBatchProgress | null>(null);
  const preloadAbortRef = React.useRef<AbortController | null>(null);
  const copyTimerRef = React.useRef<number | null>(null);

  const playlist = useOfflineSpeechPlaylist();

  // 建立無塵室全套常用晶圓廠英文教材離線語音包清單（涵蓋全部核心單字、實戰例句與 24 關卡三階完整句型）
  const {
    allVoicePackItems,
    voicePackChunks,
    vocabSnippetCount,
    lessonSnippetCount
  } = useMemo(() => {
    const items: Array<{ text: string; lang: 'en-US' | 'zh-TW'; moduleType: 'vocab' | 'lesson' }> = [];

    FAB_VOCAB.forEach((v) => {
      if (v.word) items.push({ text: v.word, lang: 'en-US', moduleType: 'vocab' });
      if (v.exampleSentence) items.push({ text: v.exampleSentence, lang: 'en-US', moduleType: 'vocab' });
    });

    PRESET_LESSONS.forEach((l) => {
      const lessonSentences = getLessonAllSentences(l);
      if (lessonSentences.length > 0) {
        lessonSentences.forEach((s) => {
          if (s.english) {
            items.push({ text: s.english, lang: 'en-US', moduleType: 'lesson' });
          }
        });
      } else if (l.english_sentence) {
        items.push({ text: l.english_sentence, lang: 'en-US', moduleType: 'lesson' });
      }
    });

    const seen = new Set<string>();
    const chunks: Array<{ chunkText: string; lang: 'en-US' | 'zh-TW'; moduleType: 'vocab' | 'lesson' }> = [];
    let vocabCount = 0;
    let lessonCount = 0;

    for (const item of items) {
      const cleaned = cleanEnglishText(item.text);
      if (!cleaned) continue;
      for (const chunkText of splitTtsChunks(cleaned, 155)) {
        const dedupeKey = `${item.lang}::${chunkText.toLowerCase()}`;
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          chunks.push({ chunkText, lang: item.lang, moduleType: item.moduleType });
          if (item.moduleType === 'vocab') {
            vocabCount++;
          } else {
            lessonCount++;
          }
        }
      }
    }

    return {
      allVoicePackItems: items.map(({ text, lang }) => ({ text, lang })),
      voicePackChunks: chunks,
      vocabSnippetCount: vocabCount,
      lessonSnippetCount: lessonCount
    };
  }, []);

  const refreshCacheStats = () => {
    getAudioCacheStats()
      .then((s) => {
        setPlayableBlobCount(s.playableBlobCount);
        setCacheBytes(s.totalEstimatedBytes);
        setCachedIdSet(new Set(s.cachedIds || []));
      })
      .catch(() => {});
  };

  // 計算無塵室全套語音包已下載與待下載片段數量與百分比
  const {
    totalPackSnippets,
    downloadedSnippets,
    pendingSnippets,
    cacheCompletionPct,
    activeDisplayPercent,
    isFullyCached
  } = useMemo(() => {
    const total = voicePackChunks.length;
    if (total === 0) {
      return {
        totalPackSnippets: 0,
        downloadedSnippets: 0,
        pendingSnippets: 0,
        cacheCompletionPct: 100,
        activeDisplayPercent: 100,
        isFullyCached: true
      };
    }

    let matchedCount = 0;
    for (const chunk of voicePackChunks) {
      const stdId = generateAudioCacheKey(chunk.chunkText, chunk.lang, 1.0);
      const speedId = generateAudioCacheKey(chunk.chunkText, chunk.lang, speechSpeed);
      if (
        cachedIdSet.has(stdId) ||
        cachedIdSet.has(speedId) ||
        isSentenceAudioCached(chunk.chunkText, chunk.lang, speechSpeed)
      ) {
        matchedCount++;
      }
    }

    const activeDownloaded =
      isPreloadingAudio && preloadProgress
        ? Math.max(matchedCount, preloadProgress.alreadyCached + preloadProgress.newlyDownloaded)
        : matchedCount;

    const clampedDownloaded = Math.min(total, activeDownloaded);
    const pending = Math.max(0, total - clampedDownloaded);
    const pct = Math.min(100, Math.round((clampedDownloaded / total) * 100));
    const displayPct =
      isPreloadingAudio && preloadProgress
        ? Math.max(pct, preloadProgress.percent)
        : pct;

    return {
      totalPackSnippets: total,
      downloadedSnippets: clampedDownloaded,
      pendingSnippets: pending,
      cacheCompletionPct: pct,
      activeDisplayPercent: displayPct,
      isFullyCached: pending === 0
    };
  }, [voicePackChunks, cachedIdSet, speechSpeed, isPreloadingAudio, preloadProgress]);

  // 分類增量離線語音包（按單元獨立下載、自動跳過已快取片段與顯示預估空間）
  const categoryVoicePacks = useMemo(() => {
    const packDefs: Array<{
      id: string;
      label: string;
      desc: string;
      rawItems: Array<{ text: string; lang: 'en-US' | 'zh-TW' }>;
    }> = [
      {
        id: 'safety',
        label: '工安防護與緊急警報包',
        desc: 'LOTO / 氣體洩漏 / 緊急停機必備',
        rawItems: FAB_VOCAB.filter((v) => v.category === 'safety').flatMap((v) => [
          ...(v.word ? [{ text: v.word, lang: 'en-US' as const }] : []),
          ...(v.exampleSentence ? [{ text: v.exampleSentence, lang: 'en-US' as const }] : [])
        ])
      },
      {
        id: 'equipment',
        label: '機台設備核心術語包',
        desc: '腔體 / 幫浦 / 傳片手臂術語',
        rawItems: FAB_VOCAB.filter((v) => v.category === 'equipment').flatMap((v) => [
          ...(v.word ? [{ text: v.word, lang: 'en-US' as const }] : []),
          ...(v.exampleSentence ? [{ text: v.exampleSentence, lang: 'en-US' as const }] : [])
        ])
      },
      {
        id: 'maintenance',
        label: 'PM 維修保養實戰包',
        desc: '校準 / 更換耗材 / 排錯指令',
        rawItems: FAB_VOCAB.filter((v) => v.category === 'maintenance').flatMap((v) => [
          ...(v.word ? [{ text: v.word, lang: 'en-US' as const }] : []),
          ...(v.exampleSentence ? [{ text: v.exampleSentence, lang: 'en-US' as const }] : [])
        ])
      },
      {
        id: 'process',
        label: '製程參數與良率詞彙包',
        desc: '蝕刻 / 沉積 / 微影高頻製程詞',
        rawItems: FAB_VOCAB.filter((v) => v.category === 'process').flatMap((v) => [
          ...(v.word ? [{ text: v.word, lang: 'en-US' as const }] : []),
          ...(v.exampleSentence ? [{ text: v.exampleSentence, lang: 'en-US' as const }] : [])
        ])
      },
      {
        id: 'lessons',
        label: '24 關交接與對話句型包',
        desc: '全關卡三階完整實戰句型',
        rawItems: PRESET_LESSONS.flatMap((l) => {
          const allS = getLessonAllSentences(l);
          if (allS.length > 0) {
            return allS
              .filter((s) => Boolean(s.english))
              .map((s) => ({ text: s.english, lang: 'en-US' as const }));
          }
          return l.english_sentence ? [{ text: l.english_sentence, lang: 'en-US' as const }] : [];
        })
      }
    ];

    return packDefs.map((pack) => {
      const seen = new Set<string>();
      const chunks: Array<{ text: string; lang: 'en-US' | 'zh-TW' }> = [];
      for (const item of pack.rawItems) {
        const cleaned = cleanEnglishText(item.text);
        if (!cleaned) continue;
        for (const chunkText of splitTtsChunks(cleaned, 155)) {
          const key = `${item.lang}::${chunkText.toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            chunks.push({ text: chunkText, lang: item.lang });
          }
        }
      }
      let cachedCount = 0;
      for (const c of chunks) {
        const stdId = generateAudioCacheKey(c.text, c.lang, 1.0);
        const speedId = generateAudioCacheKey(c.text, c.lang, speechSpeed);
        if (
          cachedIdSet.has(stdId) ||
          cachedIdSet.has(speedId) ||
          isSentenceAudioCached(c.text, c.lang, speechSpeed)
        ) {
          cachedCount++;
        }
      }
      const total = chunks.length;
      const pending = Math.max(0, total - cachedCount);
      const pct = total > 0 ? Math.min(100, Math.round((cachedCount / total) * 100)) : 100;
      const estimatedMb = Math.max(0.1, (total * 18) / 1024).toFixed(1);
      return {
        id: pack.id,
        label: pack.label,
        desc: pack.desc,
        items: pack.rawItems,
        total,
        cachedCount,
        pending,
        pct,
        estimatedMb
      };
    });
  }, [cachedIdSet, speechSpeed]);

  const startIncrementalPreload = async (
    packId: string,
    items: Array<{ text: string; lang: 'en-US' | 'zh-TW' }>
  ) => {
    playClickSound();
    if (isPreloadingAudio && activePackId === packId) {
      preloadAbortRef.current?.abort();
      preloadAbortRef.current = null;
      setIsPreloadingAudio(false);
      setActivePackId(null);
      refreshCacheStats();
      return;
    }
    if (isPreloadingAudio) {
      preloadAbortRef.current?.abort();
      preloadAbortRef.current = null;
    }
    const controller = new AbortController();
    preloadAbortRef.current = controller;
    setActivePackId(packId);
    setIsPreloadingAudio(true);
    try {
      await prefetchCloudAudioBatch(
        items,
        (p) => {
          setPreloadProgress(p);
          if (p.done % 4 === 0 || p.done === p.total) {
            refreshCacheStats();
          }
        },
        controller.signal,
        {
          speechSpeed,
          concurrency: 2,
          maxRetries: 2
        }
      );
      refreshCacheStats();
      if (!controller.signal.aborted) {
        playSuccessChime();
      }
    } finally {
      if (preloadAbortRef.current === controller) {
        preloadAbortRef.current = null;
      }
      setIsPreloadingAudio(false);
      setActivePackId(null);
    }
  };

  const handleToggleBatchPreload = async () => {
    await startIncrementalPreload('all', allVoicePackItems);
  };

  useEffect(() => {
    if (isOpen) {
      refreshCacheStats();
    } else {
      preloadAbortRef.current?.abort();
      preloadAbortRef.current = null;
      setIsPreloadingAudio(false);
    }
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, [isOpen]);

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

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      setCopiedNotification(true);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setCopiedNotification(false), 2500);
    } catch {}
  };

  const reviewedProgress = Math.round(
    (reviewedVocabIds.length / FAB_VOCAB.length) * 100
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="無塵室離線快取單字庫"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
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
                <span
                  className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold flex items-center gap-1 tabular-nums ${
                    isFullyCached
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80'
                      : 'bg-amber-950/80 text-amber-300 border-amber-600/80'
                  }`}
                >
                  <ShieldCheck className={`w-3 h-3 ${isFullyCached ? 'text-emerald-400' : 'text-amber-400'}`} />
                  {isFullyCached
                    ? `100% 全套教材語音包已就緒 (${downloadedSnippets}/${totalPackSnippets})`
                    : `離線語音包進度 ${activeDisplayPercent}% (待載 ${pendingSnippets} 段)`}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                地下廠房 / 弱網無塵室專用 · 支援一鍵下載全套晶圓廠教材離線語音包（含斷線重連保護）
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Offline Simulation Toggle */}
            <button
              type="button"
              aria-pressed={isSimulatedOffline}
              onClick={() => {
                onToggleSimulatedOffline();
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
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
              type="button"
              aria-label="關閉離線快取單字庫"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Full Curriculum Voice Pack Downloader & Progress Percentage Panel (無塵室全套教材語音包下載器) */}
        <div className="px-3.5 sm:px-4 py-3 bg-slate-900/95 border-b border-slate-800/90 space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-black shrink-0">
                無塵室弱網救星
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-100">
                全套晶圓廠英文教材離線語音包下載器
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 text-[10px] font-mono tabular-nums">
                單字例句 {vocabSnippetCount} 段 + 24關三階句型 {lessonSnippetCount} 段
              </span>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border tabular-nums ${
                  isFullyCached
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                    : isPreloadingAudio
                    ? 'bg-cyan-950/90 text-cyan-200 border-cyan-400/60'
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                }`}
              >
                {isFullyCached
                  ? '✓ 100% 全套語音包已下載完畢，無塵室零訊號可離線播放'
                  : isPreloadingAudio
                  ? `下載進度 ${activeDisplayPercent}% (${preloadProgress?.done ?? downloadedSnippets}/${preloadProgress?.total ?? totalPackSnippets})`
                  : `目前完成 ${activeDisplayPercent}% · 尚有 ${pendingSnippets} 段語音待下載`}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
              {/* Prominent Progress Percentage Badge */}
              <div
                className={`px-2.5 py-1 rounded-xl border font-mono font-black text-sm sm:text-base tabular-nums flex items-center gap-1 shadow-inner ${
                  isFullyCached
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                    : isPreloadingAudio
                    ? 'bg-cyan-950 text-cyan-200 border-cyan-400/70'
                    : 'bg-slate-950 text-amber-300 border-amber-500/50'
                }`}
                title="全套離線語音包下載完成百分比"
              >
                <span className="text-[10px] font-sans font-bold text-slate-400">進度</span>
                <span>{activeDisplayPercent}%</span>
              </div>

              <button
                type="button"
                onClick={handleToggleBatchPreload}
                className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 tabular-nums whitespace-nowrap ${
                  isPreloadingAudio
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                    : isFullyCached
                    ? 'bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border-emerald-500/50'
                    : 'bg-gradient-to-r from-cyan-400 to-emerald-400 hover:brightness-110 text-slate-950 border-cyan-300 font-black shadow-sm'
                }`}
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isPreloadingAudio
                    ? `暫停下載 (${activeDisplayPercent}%)`
                    : isFullyCached
                    ? '重新校驗全套語音包'
                    : preloadProgress && preloadProgress.failed > 0
                    ? `續傳重試待載語音 (${pendingSnippets} 段)`
                    : `一鍵下載全套語音包 (${pendingSnippets} 段)`}
                </span>
              </button>
            </div>
          </div>

          {/* Visual Progress Track with Percentage Indicator */}
          <div
            role="progressbar"
            aria-valuenow={activeDisplayPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="無塵室全套離線語音包下載進度百分比"
            className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative shadow-inner"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isFullyCached
                  ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 shadow-sm shadow-emerald-500/40'
                  : 'bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400 shadow-sm shadow-cyan-500/40'
              }`}
              style={{ width: `${Math.max(isPreloadingAudio ? 4 : 0, activeDisplayPercent)}%` }}
            />
          </div>

          {/* Downloaded vs Pending Snippet Counts & Weak-Network Status */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono tabular-nums">
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              <span className="flex items-center gap-1 text-emerald-300 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                已下載：<strong className="text-emerald-200 font-black">{downloadedSnippets}</strong> 段
              </span>
              <span className={`flex items-center gap-1 font-bold ${pendingSnippets > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                <span className={`w-2 h-2 rounded-full inline-block ${pendingSnippets > 0 ? 'bg-amber-400' : 'bg-slate-600'}`} />
                待下載：<strong className={pendingSnippets > 0 ? 'text-amber-200 font-black' : 'text-slate-300'}>{pendingSnippets}</strong> 段
              </span>
              <span className="text-slate-400">
                全套總計：{totalPackSnippets} 段
              </span>
              {isPreloadingAudio && preloadProgress?.currentText && (
                <span className="text-cyan-300 truncate max-w-[220px] sm:max-w-[320px]">
                  正在下載："{preloadProgress.currentText}"
                </span>
              )}
              {preloadProgress && preloadProgress.retriedCount > 0 && (
                <span className="text-amber-300">
                  弱網自動重試：{preloadProgress.retriedCount} 次
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap text-slate-400">
              <span>
                本機快取：{playableBlobCount} 段 ({(cacheBytes / (1024 * 1024)).toFixed(2)} MB)
              </span>
              <span className={`font-black ${isFullyCached ? 'text-emerald-400' : 'text-cyan-300'}`}>
                完成度 {activeDisplayPercent}%
              </span>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  const next = !idlePrefetchEnabled;
                  setIdlePrefetchEnabledState(next);
                  setIdleAudioPrefetchEnabled(next);
                }}
                aria-pressed={idlePrefetchEnabled}
                className={`px-2 py-0.5 rounded-lg border font-bold text-[10px] cursor-pointer transition-colors ${
                  idlePrefetchEnabled
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="Wi-Fi 穩定且頁面閒置時，背景低頻寬自動補齊最多 6 段工安語音（省流量模式自動跳過）"
              >
                {idlePrefetchEnabled ? 'Wi-Fi 閒置補齊：開' : 'Wi-Fi 閒置補齊：關'}
              </button>
              {playableBlobCount >= 4 && (
                <button
                  type="button"
                  onClick={async () => {
                    playClickSound();
                    const res = await pruneOldestAudioCache(0.3);
                    refreshCacheStats();
                    if (res.deletedCount > 0) {
                      setPruneNotice(`已釋放 ${res.deletedCount} 段最久未用音檔 (${(res.freedBytes / 1024).toFixed(0)} KB)`);
                      window.setTimeout(() => setPruneNotice(null), 3500);
                    }
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-950 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-200 font-bold text-[10px] cursor-pointer transition-colors"
                  title="依 LRU 移除 30% 最久未聽的快取音檔以釋放手機空間"
                >
                  智慧釋放 30% 空間
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowCategoryPacks((prev) => !prev);
                }}
                aria-expanded={showCategoryPacks}
                className="px-2 py-0.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-bold text-[10px] cursor-pointer transition-colors"
              >
                {showCategoryPacks ? '收合分類語音包 ▲' : '按單元增量下載 ▼'}
              </button>
            </div>
            {pruneNotice && (
              <div className="w-full text-[11px] font-mono text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 rounded-lg px-2.5 py-1">
                ✓ {pruneNotice}
              </div>
            )}
          </div>

          {/* Category Incremental Voice Pack Selector */}
          {showCategoryPacks && (
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {categoryVoicePacks.map((pack) => {
                const isPackRunning = isPreloadingAudio && activePackId === pack.id;
                const isPackDone = pack.pending === 0;
                return (
                  <div
                    key={pack.id}
                    className={`p-2.5 rounded-xl border bg-slate-950/80 flex flex-col justify-between gap-2 ${
                      isPackDone
                        ? 'border-emerald-500/40'
                        : isPackRunning
                        ? 'border-cyan-400/70'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-100 truncate">{pack.label}</div>
                        <div className="text-[10px] text-slate-400 truncate">{pack.desc}</div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 tabular-nums">
                        ~{pack.estimatedMb} MB
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isPackDone ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-400 to-cyan-400'
                          }`}
                          style={{ width: `${pack.pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono tabular-nums">
                        <span className={isPackDone ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                          {pack.cachedCount}/{pack.total} 段 ({pack.pct}%)
                        </span>
                        <button
                          type="button"
                          onClick={() => startIncrementalPreload(pack.id, pack.items)}
                          className={`px-2 py-0.5 rounded-md font-bold cursor-pointer transition-colors ${
                            isPackRunning
                              ? 'bg-amber-400 text-slate-950'
                              : isPackDone
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50 hover:bg-emerald-900'
                              : 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/30'
                          }`}
                        >
                          {isPackRunning
                            ? '暫停'
                            : isPackDone
                            ? '已就緒'
                            : `增量載 ${pack.pending} 段`}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation Mode Tabs & Progress */}
        <div className="p-2.5 sm:p-3 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          {/* Tabs */}
          <div role="tablist" aria-label="離線單字庫模式" className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'playlist'}
              onClick={() => {
                playClickSound();
                setViewMode('playlist');
              }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                viewMode === 'playlist'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${playlist.isPlaying && !playlist.isPaused ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>一鍵朗讀播放清單</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'flashcards'}
              onClick={() => {
                playClickSound();
                setViewMode('flashcards');
              }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                viewMode === 'flashcards'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>抽卡複習</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'list'}
              onClick={() => {
                playClickSound();
                setViewMode('list');
              }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                viewMode === 'list'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>單字清單 ({FAB_VOCAB.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'scenarios'}
              onClick={() => {
                playClickSound();
                setViewMode('scenarios');
              }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
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
            <div className="flex items-center gap-2 tabular-nums">
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
                  type="button"
                  aria-label="清除搜尋文字"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
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
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      playClickSound();
                      setSelectedCategory(cat.id as CategoryFilter);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
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
                      <span className={`text-xs px-3 py-1 rounded-md font-mono font-black border ${
                        playlist.currentPhase === 'word'
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : playlist.currentPhase === 'taiwan_trick'
                          ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                          : playlist.currentPhase === 'example'
                          ? 'bg-emerald-400 text-slate-950 border-emerald-300'
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
                            <span className="w-1 h-3 bg-amber-400 rounded-sm" />
                            <span className="w-1 h-5 bg-amber-300 rounded-sm" />
                            <span className="w-1 h-4 bg-amber-400 rounded-sm" />
                            <span className="w-1 h-2 bg-amber-300 rounded-sm" />
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
                      <span className="text-xs font-mono font-bold text-amber-300 shrink-0 tabular-nums">
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
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => {
                              playClickSound();
                              playlist.updateConfig({ playMode: m.mode });
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
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
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Sleep Timer */}
                      <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-xs tabular-nums">
                        <span className="text-slate-400 font-bold ml-1 text-[11px]">定時:</span>
                        {[0, 5, 15, 30].map((min) => (
                          <button
                            key={min}
                            type="button"
                            aria-pressed={playlist.config.sleepTimerMinutes === min}
                            onClick={() => playlist.updateConfig({ sleepTimerMinutes: min })}
                            className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
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
                      <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-xs tabular-nums">
                        <span className="text-slate-400 font-bold ml-1 text-[11px]">語速:</span>
                        {[0.7, 0.85, 1.0, 1.15].map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            aria-pressed={playlist.config.speechSpeed === spd}
                            onClick={() => playlist.updateConfig({ speechSpeed: spd })}
                            className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
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
                      type="button"
                      aria-pressed={playlist.config.autoStartOnOffline}
                      onClick={() => {
                        playlist.updateConfig({
                          autoStartOnOffline: !playlist.config.autoStartOnOffline
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
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
                      type="button"
                      aria-pressed={playlist.config.repeatCount === 2}
                      onClick={() => {
                        playlist.updateConfig({
                          repeatCount: playlist.config.repeatCount === 1 ? 2 : 1
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
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
                      type="button"
                      aria-pressed={playlist.config.includeExample}
                      onClick={() => {
                        playlist.updateConfig({
                          includeExample: !playlist.config.includeExample
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
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
                      <div className="flex items-center gap-1 tabular-nums">
                        {[1.0, 1.5, 2.0, 3.0].map((s) => (
                          <button
                            key={s}
                            type="button"
                            aria-pressed={playlist.config.intervalSeconds === s}
                            onClick={() => playlist.updateConfig({ intervalSeconds: s })}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer border focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
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
                <h4 className="text-xs sm:text-sm font-black text-slate-200 flex items-center gap-2 tabular-nums">
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
                      type="button"
                      aria-pressed={playlist.config.category === cat.id}
                      onClick={() => {
                        playClickSound();
                        playlist.updateConfig({ category: cat.id as any });
                        setSelectedCategory(cat.id as any);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
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
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        playlist.start(index);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          playlist.start(index);
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        isCurrent
                          ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400/40 text-white'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs text-slate-400 w-6 text-right shrink-0 tabular-nums">
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-mono font-black text-sm ${isCurrent ? 'text-amber-300' : 'text-slate-100'}`}>
                              {vocab.word}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
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
                          <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] flex items-center gap-1">
                            <Volume2 className="w-3 h-3" />
                            正在朗讀
                          </span>
                        ) : (
                          <button
                            type="button"
                            aria-label={`從 ${vocab.word} 開始播放`}
                            onClick={(e) => {
                              e.stopPropagation();
                              playlist.start(index);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-amber-400 group-hover:text-slate-950 text-slate-400 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                            title="從此單字開始播放"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}

                        <button
                          type="button"
                          aria-pressed={isReviewed}
                          aria-label={`標記 ${vocab.word} 已掌握`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVocabReviewed(vocab.id);
                          }}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
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
                    <span className="font-mono tabular-nums">
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
                        type="button"
                        aria-pressed={reviewedVocabIds.includes(currentVocab.id)}
                        onClick={() => {
                          playSuccessChime();
                          onToggleVocabReviewed(currentVocab.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
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
                    role="button"
                    tabIndex={0}
                    aria-pressed={isFlipped}
                    aria-label="翻轉單字卡"
                    onClick={() => {
                      playWaferSnapSound();
                      setIsFlipped(!isFlipped);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        playWaferSnapSound();
                        setIsFlipped(!isFlipped);
                      }
                    }}
                    className="relative min-h-[300px] sm:min-h-[320px] rounded-3xl cursor-pointer perspective-1000 select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
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
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-amber-300 border border-slate-700 text-xs font-mono font-bold">
                          {currentVocab.category === 'equipment' && '機台設備'}
                          {currentVocab.category === 'process' && '製程術語'}
                          {currentVocab.category === 'maintenance' && '維修保養'}
                          {currentVocab.category === 'safety' && '工安防護'}
                          <span className="text-slate-500 ml-1">({currentVocab.partOfSpeech})</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playClickSound();
                              speakEnglish(currentVocab.word, 0.7);
                            }}
                            className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-mono font-bold text-xs transition-all cursor-pointer tabular-nums"
                            title="0.7x 慢速發音"
                          >
                            0.7x
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePronounce(currentVocab.word);
                            }}
                            className="p-2 rounded-xl bg-amber-400 hover:bg-yellow-300 text-slate-950 font-black shadow-md transition-all active:scale-90 cursor-pointer"
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
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-400 group-hover:text-amber-300 transition-colors">
                              <RotateCw className="w-3 h-3" />
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
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                              {vocab.partOfSpeech}
                            </span>
                          </div>
                          <div className="text-xs font-black text-cyan-300 mt-0.5">
                            {vocab.translation}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              speakEnglish(vocab.word, 0.7);
                            }}
                            className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[10px] font-bold transition-all cursor-pointer tabular-nums"
                            title="0.7x 慢讀"
                          >
                            0.7x
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePronounce(vocab.word)}
                            className="p-1.5 rounded-lg bg-amber-400/90 hover:bg-amber-300 text-slate-950 transition-all cursor-pointer"
                            title="朗讀"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            aria-pressed={isReviewed}
                            aria-label={`標記 ${vocab.word} 為已複習`}
                            onClick={() => onToggleVocabReviewed(vocab.id)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
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
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] font-mono font-bold shrink-0">注音</span>
                          <span className="text-amber-300 font-mono font-black break-words flex-1">
                            {(() => {
                              const zh = convertPhoneticToZhuyin(vocab.taiwanPhonetic);
                              const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                              return clean ? `【 ${clean} 】` : '—';
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/70 min-w-0">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold shrink-0">諧音</span>
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
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex items-center justify-between tabular-nums">
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
                      <span className="text-xs font-black text-amber-300 tabular-nums">
                        關卡 {idx + 1}：{lesson.scenario}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            speakEnglish(lesson.english_sentence, 0.7);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-mono font-bold text-[11px] cursor-pointer tabular-nums"
                          title="0.7x 慢讀"
                        >
                          0.7x
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePronounce(lesson.english_sentence)}
                          className="px-2 py-1 rounded-lg bg-amber-400 hover:bg-yellow-300 text-slate-950 font-black text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>朗讀</span>
                        </button>
                      </div>
                    </div>

                    <div className="font-mono font-black text-sm text-slate-100">
                      {lesson.english_sentence}
                    </div>

                    <div className="text-xs text-cyan-300 font-medium">
                      中文：{lesson.chinese_translation}
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800/90 rounded-lg p-2 space-y-1 text-[11px]">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] font-mono font-bold shrink-0">注音</span>
                        <span className="font-mono font-black text-amber-300/95 tracking-wide break-words flex-1">
                          {(() => {
                            const zh = convertPhoneticToZhuyin(lesson.phonetic_taiwan);
                            const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                            return clean ? `【 ${clean} 】` : '';
                          })()}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 pt-1 border-t border-slate-800/80 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold shrink-0">諧音</span>
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
        <div className="p-3 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 tabular-nums">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-mono text-emerald-400 font-bold">
                已下載 {downloadedSnippets} 段 / 待下載 {pendingSnippets} 段 ({(cacheBytes / (1024 * 1024)).toFixed(2)} MB)
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleBatchPreload}
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors tabular-nums ${
                isPreloadingAudio
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                  : 'bg-slate-900 hover:bg-slate-800 border-emerald-500/40 text-emerald-300'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {isPreloadingAudio && preloadProgress
                  ? `下載離線音訊 ${preloadProgress.done}/${preloadProgress.total} (停止)`
                  : isFullyCached
                  ? `語音包已全數下載 (${totalPackSnippets}/${totalPackSnippets})`
                  : `一鍵下載全部離線音訊包 (待載 ${pendingSnippets} 段)`}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            關閉視窗
          </button>
        </div>

      </motion.div>
    </div>
  );
};
