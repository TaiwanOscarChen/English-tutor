import React, { useState } from 'react';
import { SCENARIO_TOPICS } from '../data/presetLessons';
import { Lesson } from '../types';
import { LessonCard } from './LessonCard';
import { Zap, Sparkles, Send, RefreshCw, AlertCircle, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AiLessonGeneratorProps {
  speechSpeed: number;
  bookmarkedIds: string[];
  onToggleBookmark: (lesson: Lesson) => void;
  avoidSentences?: string[];
}

export const AiLessonGenerator: React.FC<AiLessonGeneratorProps> = ({
  speechSpeed,
  bookmarkedIds,
  onToggleBookmark,
  avoidSentences = []
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>(SCENARIO_TOPICS[0].title);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatedLesson, setGeneratedLesson] = useState<Lesson | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleGenerate = async (topicTitle?: string) => {
    setIsLoading(true);
    setNotice(null);

    const topic = topicTitle || selectedTopic;

    try {
      const res = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioTopic: topic,
          customPrompt: customPrompt.trim(),
          avoidSentences: avoidSentences
        })
      });

      const data = await res.json();
      if (data.errorMsg) {
        setNotice(data.errorMsg);
      } else if (data.notice) {
        setNotice(data.notice);
      }
      if (data.english_sentence) {
        setGeneratedLesson(data);
      }
    } catch (err: any) {
      console.info("Generate notice:", err?.message || err);
      setNotice("生成暫時繁忙，請稍後再試：" + (err?.message || "服務負載中"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full min-w-0">
      
      {/* Intro Card */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 backdrop-blur-sm overflow-hidden litho-scanner-overlay litho-laser-line relative shrink-strict">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-2 bg-amber-400 rounded-xl text-slate-950 font-black shadow-sm">
            <Cpu className="w-5 h-5 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-100">
                AI 智慧晶圓廠情境生成器
              </h2>
              {avoidSentences.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                  🛡️ 零重複防護（已紀錄 {avoidSentences.length} 句）
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              選擇無塵室情境或輸入自訂情境，由 AI 晶圓教練為您即時生成極簡拆解國小文法對照卡！
            </p>
          </div>
        </div>

        {/* Preset Topic Buttons Grid */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider block">
            選擇科技廠實戰情境主題：
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {SCENARIO_TOPICS.map((topic) => {
              const isSelected = selectedTopic === topic.title;
              return (
                <motion.button
                  key={topic.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setSelectedTopic(topic.title);
                    handleGenerate(topic.title);
                  }}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-950/90 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="font-extrabold text-xs text-slate-100 mb-0.5 flex items-center justify-between">
                    <span>{topic.title}</span>
                    {isSelected && <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />}
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
            自訂無塵室英文需求情境 (可選)：
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && customPrompt.trim()) {
                  handleGenerate();
                }
              }}
              placeholder="例如：向產線帶線工程師說明機台已完成保養可以放片"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-sans shadow-inner transition-colors"
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleGenerate()}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50 shrink-0 cursor-pointer transition-all ring-1 ring-amber-300/40"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>AI 思考生成中...</span>
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
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-2.5"
          >
            <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span>最新生成專屬英文教材</span>
              </span>
              <button
                onClick={() => handleGenerate()}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-xs underline cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                換一句新的
              </button>
            </div>

            <LessonCard
              lesson={generatedLesson}
              speechSpeed={speechSpeed}
              isBookmarked={bookmarkedIds.includes(generatedLesson.id)}
              onToggleBookmark={onToggleBookmark}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
