import React, { useState, useRef, useEffect } from 'react';
import { Lesson } from '../types';
import { LessonCard } from './LessonCard';
import { Bookmark, Search, Copy, CheckCircle2, Sparkles, Play, Pause, ArrowRight } from 'lucide-react';
import { speakEnglish, cancelSpeech } from '../utils/speech';
import { playClickSound } from '../utils/audioEffects';

interface BookmarksTabProps {
  bookmarkedLessons: Lesson[];
  speechSpeed: number;
  onToggleBookmark: (lesson: Lesson) => void;
  visitedLessonIds?: string[];
  onMarkVisited?: (id: string) => void;
  onOpenVoiceSettings?: () => void;
  onNavigateDaily?: () => void;
}

export const BookmarksTab: React.FC<BookmarksTabProps> = ({
  bookmarkedLessons,
  speechSpeed,
  onToggleBookmark,
  visitedLessonIds = [],
  onMarkVisited,
  onOpenVoiceSettings,
  onNavigateDaily
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [currentPlayIndex, setCurrentPlayIndex] = useState<number | null>(null);
  const isPlayingAllRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (isPlayingAllRef.current) {
        isPlayingAllRef.current = false;
        cancelSpeech();
      }
    };
  }, []);

  const filteredLessons = bookmarkedLessons.filter((l) => {
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
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handlePlayAllSequence = async () => {
    playClickSound();
    if (isPlayingAllRef.current) {
      isPlayingAllRef.current = false;
      cancelSpeech();
      setIsPlayingAll(false);
      setCurrentPlayIndex(null);
      return;
    }

    if (filteredLessons.length === 0) return;

    isPlayingAllRef.current = true;
    setIsPlayingAll(true);

    for (let i = 0; i < filteredLessons.length; i++) {
      if (!isPlayingAllRef.current) break;
      setCurrentPlayIndex(i);
      const lesson = filteredLessons[i];
      await new Promise<void>((resolve) => {
        speakEnglish(
          lesson.english_sentence,
          speechSpeed,
          () => {
            setTimeout(resolve, 650);
          }
        );
      });
    }

    isPlayingAllRef.current = false;
    setIsPlayingAll(false);
    setCurrentPlayIndex(null);
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
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-100">
                個人晶圓收藏錦囊庫
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono font-bold">
                已收藏 {bookmarkedLessons.length} 句
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
            <button
              onClick={handlePlayAllSequence}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isPlayingAll
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/50 font-black animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="依序連續朗讀所有收藏金句"
            >
              {isPlayingAll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{isPlayingAll ? `停止連播 (${(currentPlayIndex ?? 0) + 1}/${filteredLessons.length})` : '連續播放全部'}</span>
            </button>

            <button
              onClick={handleCopyAll}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="匯出並複製所有收藏金句到剪貼簿"
            >
              {copiedAll ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedAll ? '已複製全部！' : '匯出文字筆記'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Input Filter */}
      {bookmarkedLessons.length > 0 && (
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋收藏句型：輸入情境、英文關鍵字、中文意思或諧音..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-all font-sans"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
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
              className={`transition-all ${
                currentPlayIndex === idx ? 'ring-2 ring-cyan-400/80 rounded-2xl scale-[1.005]' : ''
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
              />
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
