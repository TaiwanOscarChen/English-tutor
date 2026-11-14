import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Volume2, Search, Bookmark, ShieldCheck } from 'lucide-react';
import { speakEnglish } from '../utils/speech';
import { playClickSound, playSuccessChime } from '../utils/audioEffects';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getSentenceKKPhonetic } from '../utils/wordDictionary';
import { sanitizeLessonToPublicSafe, sanitizeTextToPublicSafe } from '../utils/pipSanitizer';

interface AiQuickDecomposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookmarkLesson?: (lesson: any) => void;
}

export const AiQuickDecomposerModal: React.FC<AiQuickDecomposerModalProps> = ({
  isOpen,
  onClose,
  onBookmarkLesson
}) => {
  const [inputSentence, setInputSentence] = useState<string>('We replace the dry pump.');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [decomposedResult, setDecomposedResult] = useState<any | null>(null);
  const [sanitizedCount, setSanitizedCount] = useState<number>(0);

  if (!isOpen) return null;

  const handleDecompose = async () => {
    if (!inputSentence.trim()) return;
    playClickSound();
    setIsLoading(true);
    setDecomposedResult(null);

    const sanitizedInput = sanitizeTextToPublicSafe(inputSentence);

    try {
      const response = await fetch('/api/decompose-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentenceText: sanitizedInput.text })
      });
      if (response.ok) {
        const data = await response.json();
        const { lesson: safeLesson, changes } = sanitizeLessonToPublicSafe({
          id: 'decomposed-' + Date.now(),
          scenario: '🎬 AI 隨手拆解解密句型',
          english_sentence: data.english_sentence || sanitizedInput.text,
          chinese_translation: data.chinese_translation || '',
          components: data.components || { subject: 'We', action: 'check', object: 'the tool' },
          phonetic_taiwan: data.phonetic_taiwan || '',
          memory_trick: data.memory_trick || ''
        });
        setSanitizedCount(sanitizedInput.reasons.length + changes.length);
        setDecomposedResult(safeLesson);
        playSuccessChime();
      }
    } catch (e) {
      console.info("Notice decomposing sentence:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-cyan-500/40 p-5 shadow-2xl text-slate-100 flex flex-col litho-laser-line"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                AI 任意句國小拆解法、KK音標與台味諧音
              </h2>
              <p className="text-xs text-slate-400">
                貼上任何英文句子，自動執行資安去識別化並拆解為 👤主角 🏃‍♂️動作 📦東西 與 KK音標
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              輸入或貼上想要拆解的英文句子：
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputSentence}
                onChange={(e) => setInputSentence(e.target.value)}
                placeholder="例如: The technician inspects the wafer chuck."
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleDecompose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-amber-300 hover:from-cyan-300 hover:to-amber-200 shadow-md active:scale-95 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <Search className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? '拆解中...' : '即刻拆解'}</span>
              </button>
            </div>
          </div>

          {/* Quick Example Chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 text-[11px]">範例句：</span>
            {[
              'I test the sensor.',
              'We calibrate the motor.',
              'He inspects the wafer.'
            ].map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  playClickSound();
                  setInputSentence(ex);
                }}
                className="px-2 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px]"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Result View */}
          <AnimatePresence>
            {decomposedResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30 space-y-3"
              >
                {/* InfoSec Badge */}
                <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-[11px] text-emerald-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>已通過公開資訊檢核（無資安風險）</span>
                  </span>
                  {sanitizedCount > 0 && (
                    <span className="text-[10px] font-mono text-amber-300">
                      已去識別化轉換 {sanitizedCount} 處敏感詞
                    </span>
                  )}
                </div>

                {/* Sentence Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      {decomposedResult.english_sentence}
                      <button
                        onClick={() => speakEnglish(decomposedResult.english_sentence)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </h3>
                    <p className="text-xs text-slate-300 font-semibold mt-0.5">
                      {decomposedResult.chinese_translation}
                    </p>
                  </div>

                  {onBookmarkLesson && (
                    <button
                      onClick={() => {
                        playClickSound();
                        onBookmarkLesson({
                          id: 'decomposed-' + Date.now(),
                          scenario: '🎬 AI 隨手拆解解密句型',
                          english_sentence: decomposedResult.english_sentence,
                          chinese_translation: decomposedResult.chinese_translation,
                          components: decomposedResult.components,
                          phonetic_taiwan: decomposedResult.phonetic_taiwan,
                          memory_trick: decomposedResult.memory_trick
                        });
                      }}
                      className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs flex items-center gap-1"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>收藏此句</span>
                    </button>
                  )}
                </div>

                {/* SVO Components Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                    <span className="text-[10px] text-indigo-300 block font-bold">👤 主角</span>
                    <span className="font-semibold text-slate-100">{decomposedResult.components?.subject}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-300 block font-bold">🏃‍♂️ 動作</span>
                    <span className="font-semibold text-slate-100">{decomposedResult.components?.action}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <span className="text-[10px] text-amber-300 block font-bold">📦 東西</span>
                    <span className="font-semibold text-slate-100">{decomposedResult.components?.object}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <span className="text-[10px] text-purple-300 block font-bold">🌉 橋樑</span>
                    <span className="font-semibold text-slate-100">{decomposedResult.components?.bridge || 'the'}</span>
                  </div>
                </div>

                {/* KK Phonetic + Zhuyin + Taiwan Homophone */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold shrink-0">
                      KK音標
                    </span>
                    <span className="font-mono font-bold text-cyan-200 tracking-wide break-words">
                      {getSentenceKKPhonetic(decomposedResult.english_sentence)}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono font-bold shrink-0">
                      注音
                    </span>
                    <span className="font-mono font-bold text-amber-300 tracking-wide break-words">
                      {(() => {
                        const zh = convertPhoneticToZhuyin(decomposedResult.phonetic_taiwan);
                        const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                        return clean ? `【 ${clean} 】` : '';
                      })()}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold shrink-0">
                      諧音
                    </span>
                    <span className="font-sans font-bold text-emerald-300 tracking-wide break-words">
                      {(() => {
                        const clean = (decomposedResult.phonetic_taiwan || '').trim().replace(/^【\s*|\s*】$/g, '').trim();
                        return clean ? `【 ${clean} 】` : '';
                      })()}
                    </span>
                  </div>
                </div>

                {/* Memory Trick */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <span className="text-cyan-400 font-bold block mb-0.5">💡 無塵室畫面記憶故事：</span>
                  {decomposedResult.memory_trick}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

