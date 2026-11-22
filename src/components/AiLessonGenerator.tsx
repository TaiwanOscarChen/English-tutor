import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SCENARIO_TOPICS } from '../data/presetLessons';
import { Lesson } from '../types';
import { LessonCard } from './LessonCard';
import { Sparkles, Send, RefreshCw, AlertCircle, Cpu, PlusCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playClickSound, playSuccessChime } from '../utils/audioEffects';

interface AiLessonGeneratorProps {
  speechSpeed: number;
  bookmarkedIds: string[];
  onToggleBookmark: (lesson: Lesson) => void;
  avoidSentences?: string[];
  onSaveToDeck?: (lesson: Lesson) => void;
}

export const AiLessonGenerator: React.FC<AiLessonGeneratorProps> = ({
  speechSpeed,
  bookmarkedIds,
  onToggleBookmark,
  avoidSentences = [],
  onSaveToDeck
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>(SCENARIO_TOPICS[0].title);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatedLesson, setGeneratedLesson] = useState<Lesson | null>(null);
  const [sessionSentences, setSessionSentences] = useState<string[]>([]);
  const [savedLessonIds, setSavedLessonIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const combinedAvoidSentences = useMemo(() => {
    const merged = [...avoidSentences, ...sessionSentences];
    return Array.from(new Set(merged.filter(Boolean)));
  }, [avoidSentences, sessionSentences]);

  const handleGenerate = async (topicTitle?: string) => {
    setIsLoading(true);
    setNotice(null);

    const topic = topicTitle || selectedTopic;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => controller.abort(), 14000);

    try {
      const res = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioTopic: topic,
          customPrompt: customPrompt.trim(),
          avoidSentences: combinedAvoidSentences
        }),
        signal: controller.signal
      });

      const data = await res.json();
      if (!isMountedRef.current) return;
      if (!res.ok) {
        throw new Error(data.errorMsg || data.error || '生成服務暫時異常');
      }
      if (data.errorMsg) {
        setNotice(data.errorMsg);
      } else if (data.notice) {
        setNotice(data.notice);
      }
      if (data.english_sentence) {
        const enrichedLesson: Lesson = {
          ...data,
          id: data.id || `ai-gen-${Date.now()}`,
          category: 'custom-imported',
        };
        setGeneratedLesson(enrichedLesson);
        setSessionSentences((prev) =>
          prev.includes(enrichedLesson.english_sentence)
            ? prev
            : [...prev, enrichedLesson.english_sentence]
        );
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      const msg = err?.name === 'AbortError' ? '連線逾時，請稍後再試' : (err?.message || '服務負載中');
      setNotice('生成暫時繁忙，請稍後再試：' + msg);
    } finally {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const isSavedToDeck = generatedLesson ? savedLessonIds.includes(generatedLesson.id) : false;

  return (
    <div className="space-y-3.5 max-w-6xl mx-auto w-full min-w-0">
      {/* Generator Card */}
      <div className="bg-slate-900/95 border border-amber-400/35 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 backdrop-blur-sm overflow-hidden litho-scanner-overlay litho-laser-line relative shrink-strict">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-amber-400 rounded-xl text-slate-950 font-black shadow-sm shrink-0">
              <Cpu className="w-5 h-5 text-slate-950 fill-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-slate-100">
                  AI 智慧晶圓廠情境生成器
                </h2>
                {combinedAvoidSentences.length > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700/70 text-[10px] font-bold tabular-nums">
                    零重複防護（已排除 {combinedAvoidSentences.length} 句）
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                點選無塵室情境主題或輸入自訂需求，即時生成極簡 S+V+O 拆解對照卡
              </p>
            </div>
          </div>
        </div>

        {/* Preset Topic Buttons Grid */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider block">
            選擇科技廠實戰情境主題：
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {SCENARIO_TOPICS.map((topic) => {
              const isSelected = selectedTopic === topic.title;
              return (
                <motion.button
                  key={topic.id}
                  type="button"
                  aria-pressed={isSelected}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={isLoading}
                  onClick={() => {
                    playClickSound();
                    setSelectedTopic(topic.title);
                    handleGenerate(topic.title);
                  }}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    isSelected
                      ? 'bg-slate-950/95 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950/75 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="font-extrabold text-xs text-slate-100 mb-0.5 flex items-center justify-between gap-2">
                    <span>{topic.title}</span>
                    {isSelected && <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 font-medium">
                    {topic.description}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Custom Prompt Box */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider block">
            自訂無塵室英文需求情境（可選）：
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="例如：向產線帶線工程師說明機台已完成保養可以放片"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-sans shadow-inner transition-colors"
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                playClickSound();
                handleGenerate();
              }}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50 shrink-0 cursor-pointer transition-all ring-1 ring-amber-300/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 motion-safe:animate-spin text-slate-950" />
                  <span>AI 生成中...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-slate-950" />
                  <span>生成晶圓金句</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Notice Banner if offline/preset */}
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 text-amber-200 text-xs flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>{notice}</p>
        </motion.div>
      )}

      {/* Render Generated Lesson Card */}
      <AnimatePresence mode="wait">
        {generatedLesson && (
          <motion.div
            key={generatedLesson.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-bold text-cyan-300 px-1">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>最新生成專屬英文教材</span>
              </span>
              <div className="flex items-center gap-2">
                {onSaveToDeck && (
                  <button
                    type="button"
                    disabled={isSavedToDeck}
                    onClick={() => {
                      playSuccessChime();
                      onSaveToDeck(generatedLesson);
                      setSavedLessonIds((prev) =>
                        prev.includes(generatedLesson.id) ? prev : [...prev, generatedLesson.id]
                      );
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      isSavedToDeck
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border-cyan-500/40'
                    }`}
                  >
                    {isSavedToDeck ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>已加入導入教材</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                        <span>加入每日教材</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    playClickSound();
                    handleGenerate();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 text-xs cursor-pointer transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'motion-safe:animate-spin' : ''}`} />
                  <span>換一句新的</span>
                </button>
              </div>
            </div>

            <LessonCard
              lesson={generatedLesson}
              speechSpeed={speechSpeed}
              isBookmarked={bookmarkedIds.includes(generatedLesson.id)}
              onToggleBookmark={onToggleBookmark}
              disableGlobalShortcuts={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
