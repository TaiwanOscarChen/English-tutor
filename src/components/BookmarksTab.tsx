import React, { useState, useRef, useEffect } from 'react';
import { Lesson } from '../types';
import { LessonCard } from './LessonCard';
import { Bookmark, Search, Copy, CheckCircle2, Sparkles, Play, Pause, ArrowRight, Car } from 'lucide-react';
import { speakEnglish, cancelSpeech, globalAudioScheduler, SpeechSequenceStep } from '../utils/speech';
import { playClickSound } from '../utils/audioEffects';
import { SrsCardState, MemoryRating, isLessonDueForReview } from '../utils/srsScheduler';

interface BookmarksTabProps {
  bookmarkedLessons: Lesson[];
  speechSpeed: number;
  onToggleBookmark: (lesson: Lesson) => void;
  visitedLessonIds?: string[];
  onMarkVisited?: (id: string) => void;
  onOpenVoiceSettings?: () => void;
  onNavigateDaily?: () => void;
  srsMap?: Record<string, SrsCardState>;
  onRateMemory?: (lessonId: string, rating: MemoryRating) => void;
  onSendToDriveBookmarks?: () => void;
}

export const BookmarksTab: React.FC<BookmarksTabProps> = ({
  bookmarkedLessons,
  speechSpeed,
  onToggleBookmark,
  visitedLessonIds = [],
  onMarkVisited,
  onOpenVoiceSettings,
  onNavigateDaily,
  srsMap,
  onRateMemory,
  onSendToDriveBookmarks
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [srsFilter, setSrsFilter] = useState<'all' | 'due' | 'mastered'>('all');
  const [slowPlayMode, setSlowPlayMode] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [currentPlayIndex, setCurrentPlayIndex] = useState<number | null>(null);
  const isPlayingAllRef = useRef<boolean>(false);
  const isStartingPlayAllRef = useRef<boolean>(false);
  const playSessionRef = useRef<number>(0);
  const playTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleSpeechInterrupted = () => {
      if (isStartingPlayAllRef.current) return;
      if (isPlayingAllRef.current) {
        playSessionRef.current += 1;
        isPlayingAllRef.current = false;
        setIsPlayingAll(false);
        setCurrentPlayIndex(null);
      }
    };
    window.addEventListener('fse-speech-interrupted', handleSpeechInterrupted);
    return () => {
      window.removeEventListener('fse-speech-interrupted', handleSpeechInterrupted);
      playSessionRef.current += 1;
      isPlayingAllRef.current = false;
      if (playTimerRef.current !== null) {
        window.clearTimeout(playTimerRef.current);
      }
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      cancelSpeech();
    };
  }, []);

  const dueCount = srsMap
    ? bookmarkedLessons.filter((l) => isLessonDueForReview(l.id, srsMap)).length
    : bookmarkedLessons.length;
  const masteredCount = srsMap
    ? bookmarkedLessons.filter((l) => (srsMap[l.id]?.repetitions || 0) >= 2).length
    : 0;

  const filteredLessons = bookmarkedLessons.filter((l) => {
    if (srsFilter === 'due' && srsMap && !isLessonDueForReview(l.id, srsMap)) {
      return false;
    }
    if (srsFilter === 'mastered' && srsMap && (srsMap[l.id]?.repetitions || 0) < 2) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.scenario.toLowerCase().includes(term) ||
      l.english_sentence.toLowerCase().includes(term) ||
      l.chinese_translation.toLowerCase().includes(term) ||
      (l.phonetic_taiwan && l.phonetic_taiwan.includes(term))
    );
  });

  const handleCopyAll = () => {
    if (bookmarkedLessons.length === 0) return;
    playClickSound();
    const text = bookmarkedLessons
      .map((l, i) => `【${i + 1}. ${l.scenario}】\n英文：${l.english_sentence}\n中文：${l.chinese_translation}\n諧音：${l.phonetic_taiwan || '無'}\n技巧：${l.memory_trick}\n`)
      .join('\n------------------------\n\n');
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      setCopiedAll(true);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setCopiedAll(false), 2500);
    } catch {}
  };

  const handlePlayAllSequence = () => {
    playClickSound();
    if (isPlayingAllRef.current) {
      playSessionRef.current += 1;
      isPlayingAllRef.current = false;
      if (playTimerRef.current !== null) {
        window.clearTimeout(playTimerRef.current);
        playTimerRef.current = null;
      }
      cancelSpeech();
      setIsPlayingAll(false);
      setCurrentPlayIndex(null);
      return;
    }

    if (filteredLessons.length === 0) return;

    const sessionId = ++playSessionRef.current;
    isPlayingAllRef.current = true;
    setIsPlayingAll(true);

    const effectiveRate = slowPlayMode ? 0.7 : speechSpeed;

    isStartingPlayAllRef.current = true;
    try {
      cancelSpeech();
      const steps: SpeechSequenceStep[] = filteredLessons.map((lesson, idx) => ({
        text: lesson.english_sentence,
        lang: 'en-US',
        rate: effectiveRate,
        delayAfterMs: 600,
        onStepStart: () => {
          if (playSessionRef.current !== sessionId) return;
          setCurrentPlayIndex(idx);
        }
      }));

      globalAudioScheduler.scheduleSequence(steps, {
        interrupt: false,
        isCancelled: () => !isPlayingAllRef.current || playSessionRef.current !== sessionId,
        onSequenceEnd: () => {
          if (playSessionRef.current === sessionId) {
            isPlayingAllRef.current = false;
            setIsPlayingAll(false);
            setCurrentPlayIndex(null);
          }
        }
      });
    } finally {
      isStartingPlayAllRef.current = false;
    }
  };

  return (
    <div className="space-y-3 max-w-6xl mx-auto animate-fade-in w-full min-w-0">
      
      {/* Header Banner */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-sm overflow-hidden litho-scanner-overlay litho-laser-line relative shrink-strict">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl text-slate-950 font-black shadow-md shadow-amber-500/20">
            <Bookmark className="w-5 h-5 fill-slate-950 text-slate-950" />
          </div>
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-100">
                個人晶圓收藏錦囊庫
              </h2>
              <span className="text-cyan-300 text-xs font-mono font-bold tabular-nums">
                · 已收藏 {bookmarkedLessons.length} 句
                {srsMap && bookmarkedLessons.length > 0
                  ? ` · 已記熟 ${bookmarkedLessons.filter((l) => (srsMap[l.id]?.repetitions || 0) >= 2).length} 句`
                  : ''}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              無塵室實戰精選金句與 AI 拆解結果，進廠或交接前可隨時快速複習與連續播放！
            </p>
          </div>
        </div>

        {/* Action Controls */}
        {bookmarkedLessons.length > 0 && (
          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 flex-wrap">
            {onSendToDriveBookmarks && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onSendToDriveBookmarks();
                }}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm whitespace-nowrap"
                title="切換到隨身聽並僅針對收藏金句進行背景連播"
              >
                <Car className="w-3.5 h-3.5 shrink-0" />
                <span>隨身聽連播收藏</span>
              </button>
            )}

            <button
              type="button"
              aria-pressed={slowPlayMode}
              onClick={() => {
                playClickSound();
                setSlowPlayMode((prev) => !prev);
              }}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer border whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                slowPlayMode
                  ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
              }`}
              title="切換連續播放語速 (標準 vs 0.7x 慢速)"
            >
              {slowPlayMode ? '連播: 0.7x' : '連播: 標準'}
            </button>

            <button
              type="button"
              aria-pressed={isPlayingAll}
              onClick={handlePlayAllSequence}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm tabular-nums whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isPlayingAll
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/50 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="依序連續朗讀所有收藏金句"
            >
              {isPlayingAll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{isPlayingAll ? `停止連播 (${(currentPlayIndex ?? 0) + 1}/${filteredLessons.length})` : '連續播放全部'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyAll}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              title="匯出並複製所有收藏金句到剪貼簿"
            >
              {copiedAll ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedAll ? '已複製全部！' : '匯出文字筆記'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Search & SRS Filter Controls */}
      {bookmarkedLessons.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋收藏句型：輸入情境、英文關鍵字、中文意思或諧音..."
              className="w-full pl-10 pr-8 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-all font-sans"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="清除搜尋條件"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {srsMap && (
            <div
              role="tablist"
              aria-label="收藏複習狀態篩選"
              className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs shrink-0 self-start sm:self-auto"
            >
              {[
                { id: 'all' as const, label: `全部 (${bookmarkedLessons.length})` },
                { id: 'due' as const, label: `待複習 (${dueCount})` },
                { id: 'mastered' as const, label: `已記熟 (${masteredCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={srsFilter === tab.id}
                  onClick={() => {
                    playClickSound();
                    setSrsFilter(tab.id);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-mono font-bold tabular-nums whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    srsFilter === tab.id
                      ? 'bg-cyan-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bookmarked Lessons List */}
      {bookmarkedLessons.length === 0 ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-lg backdrop-blur-sm">
          <div className="w-12 h-12 bg-slate-800 text-amber-400 rounded-2xl mx-auto flex items-center justify-center border border-slate-700 shadow-inner">
            <Bookmark className="w-6 h-6" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-100">
            尚無收藏的無塵室實戰金句
          </h3>
          <p className="text-xs text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
            在「每日特訓」教材右上角點擊「收藏」按鈕，或使用「AI 句子拆解器」將現場遇到的工程英文句子拆解後存入錦囊庫，即可在此集中複習與連續播放！
          </p>
          {onNavigateDaily && (
            <button
              onClick={() => {
                playClickSound();
                onNavigateDaily();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>前往每日特訓挑重點收藏</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : filteredLessons.length === 0 ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 text-center space-y-2">
          <p className="text-xs text-slate-400">找不到與「{searchTerm}」相符的收藏句子</p>
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-cyan-400 hover:underline font-bold cursor-pointer"
          >
            清除搜尋條件
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLessons.map((lesson, idx) => (
            <div
              key={lesson.id || idx}
              className={`transition-colors ${
                currentPlayIndex === idx ? 'ring-2 ring-cyan-400/80 rounded-2xl' : ''
              }`}
            >
              <LessonCard
                lesson={lesson}
                speechSpeed={speechSpeed}
                isBookmarked={true}
                onToggleBookmark={onToggleBookmark}
                isVisited={visitedLessonIds.includes(lesson.id)}
                onMarkVisited={onMarkVisited}
                onOpenVoiceSettings={onOpenVoiceSettings}
                disableGlobalShortcuts={true}
                srsState={srsMap?.[lesson.id]}
                onRateMemory={onRateMemory}
              />
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
