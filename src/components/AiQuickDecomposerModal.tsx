import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Volume2, Search, Bookmark, ShieldCheck, AlertCircle, Check, Copy } from 'lucide-react';
import { speakEnglish } from '../utils/speech';
import { playClickSound, playSuccessChime } from '../utils/audioEffects';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getSentenceKKPhonetic } from '../utils/wordDictionary';
import { getMandarinPhoneticFromSentence } from '../utils/lessonSentenceHelper';
import { sanitizeLessonToPublicSafe, sanitizeTextToPublicSafe } from '../utils/pipSanitizer';

interface AiQuickDecomposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookmarkLesson?: (lesson: any) => void;
  initialSentence?: string;
}

function buildLocalFallbackDecomposition(sentence: string) {
  const clean = sentence.trim().replace(/\s+/g, ' ');
  const tokens = clean.replace(/[.!?]+$/, '').split(/\s+/).filter(Boolean);
  const subject = tokens[0] || 'We';
  const action = tokens[1] || 'check';
  const bridge = tokens.length > 3 && /^(the|a|an|in|on|at|to|for|with|from)$/i.test(tokens[2]) ? tokens[2] : '';
  const object = tokens.slice(bridge ? 3 : 2).join(' ') || 'the tool';
  return {
    english_sentence: clean,
    chinese_translation: '晶圓工程現場實戰操作句型（本機極速拆解）',
    components: {
      subject,
      action,
      bridge,
      object
    },
    phonetic_taiwan: getMandarinPhoneticFromSentence(clean),
    memory_trick: `先抓「${subject}」做動作「${action}」，最後接目標「${object}」，跟著注音節奏唸兩遍就能順口！`
  };
}

export const AiQuickDecomposerModal: React.FC<AiQuickDecomposerModalProps> = ({
  isOpen,
  onClose,
  onBookmarkLesson,
  initialSentence
}) => {
  const [inputSentence, setInputSentence] = useState<string>('We replace the dry pump.');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [decomposedResult, setDecomposedResult] = useState<any | null>(null);
  const [sanitizedCount, setSanitizedCount] = useState<number>(0);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const runDecompose = useCallback(async (targetSentence: string, playSfx = true) => {
    const trimmed = targetSentence.trim();
    if (!trimmed) return;
    if (playSfx) playClickSound();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 9000);

    setIsLoading(true);
    setDecomposedResult(null);
    setErrorNotice(null);
    setIsBookmarked(false);

    const sanitizedInput = sanitizeTextToPublicSafe(trimmed);

    try {
      const response = await fetch('/api/decompose-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentenceText: sanitizedInput.text }),
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const { lesson: safeLesson, changes } = sanitizeLessonToPublicSafe({
        id: 'decomposed-' + Date.now(),
        scenario: '🎬 AI 隨手拆解解密句型',
        english_sentence: data.english_sentence || sanitizedInput.text,
        chinese_translation: data.chinese_translation || '',
        components: data.components || { subject: 'We', action: 'check', object: 'the tool' },
        phonetic_taiwan: data.phonetic_taiwan || getMandarinPhoneticFromSentence(sanitizedInput.text),
        memory_trick: data.memory_trick || ''
      });
      setSanitizedCount(sanitizedInput.reasons.length + changes.length);
      setDecomposedResult(safeLesson);
      playSuccessChime();
    } catch {
      if (controller.signal.aborted) return;
      const fallback = buildLocalFallbackDecomposition(sanitizedInput.text);
      const { lesson: safeLesson, changes } = sanitizeLessonToPublicSafe({
        id: 'decomposed-' + Date.now(),
        scenario: '🎬 離線極速拆解句型',
        ...fallback
      });
      setSanitizedCount(sanitizedInput.reasons.length + changes.length);
      setDecomposedResult(safeLesson);
      setErrorNotice('AI 連線繁忙，已自動啟用本機離線 SVO 結構與發音拆解引擎。');
    } finally {
      window.clearTimeout(timeoutId);
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen && initialSentence && initialSentence.trim()) {
      const target = initialSentence.trim();
      setInputSentence(target);
      runDecompose(target, false);
    }
  }, [isOpen, initialSentence, runDecompose]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort();
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyDecomposed = () => {
    if (!decomposedResult) return;
    playClickSound();
    const kk = getSentenceKKPhonetic(decomposedResult.english_sentence);
    const zh = convertPhoneticToZhuyin(decomposedResult.phonetic_taiwan || '').trim().replace(/^【\s*|\s*】$/g, '').trim();
    const homophone = (decomposedResult.phonetic_taiwan || '').trim().replace(/^【\s*|\s*】$/g, '').trim();
    const bridgeText =
      decomposedResult.components?.bridge &&
      !/^(null|undefined|none|n\/a|無|-|—)$/i.test(decomposedResult.components.bridge.trim())
        ? decomposedResult.components.bridge
        : '—';
    const text = [
      decomposedResult.english_sentence,
      decomposedResult.chinese_translation,
      `SVO: ${decomposedResult.components?.subject || ''} / ${decomposedResult.components?.action || ''} / ${bridgeText} / ${decomposedResult.components?.object || ''}`,
      kk ? `KK音標: ${kk}` : '',
      zh ? `注音: ${zh}` : '',
      homophone ? `諧音: ${homophone}` : '',
      decomposedResult.memory_trick ? `記憶口訣: ${decomposedResult.memory_trick}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      setIsCopied(true);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setIsCopied(false), 1800);
    } catch {}
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI 任意句國小拆解法"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-cyan-500/40 p-5 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-y-auto litho-laser-line"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-5 h-5" />
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
            type="button"
            aria-label="關閉 AI 拆句視窗"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runDecompose(inputSentence);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputSentence}
                onChange={(e) => setInputSentence(e.target.value)}
                placeholder="例如: The technician inspects the wafer chuck."
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isLoading || !inputSentence.trim()}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-amber-300 hover:from-cyan-300 hover:to-amber-200 shadow-md active:scale-95 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <Search className={`w-3.5 h-3.5 ${isLoading ? 'motion-safe:animate-spin' : ''}`} />
                <span>{isLoading ? '拆解中...' : '即刻拆解'}</span>
              </button>
            </form>
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
                type="button"
                onClick={() => {
                  setInputSentence(ex);
                  runDecompose(ex);
                }}
                className="px-2 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] cursor-pointer"
              >
                {ex}
              </button>
            ))}
          </div>

          {errorNotice && (
            <div className="px-3 py-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

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
                    <span className="text-[10px] font-mono text-amber-300 tabular-nums">
                      已去識別化轉換 {sanitizedCount} 處敏感詞
                    </span>
                  )}
                </div>

                {/* Sentence Header */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
                      <span className="break-words">{decomposedResult.english_sentence}</span>
                      <button
                        type="button"
                        onClick={() => speakEnglish(decomposedResult.english_sentence)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 cursor-pointer shrink-0"
                        title="原速朗讀"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => speakEnglish(decomposedResult.english_sentence, 0.7)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[10px] font-bold cursor-pointer shrink-0 tabular-nums"
                        title="0.7x 慢速精聽"
                      >
                        0.7x
                      </button>
                    </h3>
                    <p className="text-xs text-slate-300 font-semibold mt-0.5">
                      {decomposedResult.chinese_translation}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyDecomposed}
                      className="px-2 py-1.5 rounded-lg border bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 text-xs flex items-center gap-1 shrink-0 cursor-pointer whitespace-nowrap"
                      title="複製拆解卡片內容"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                      <span>{isCopied ? '已複製' : '複製'}</span>
                    </button>

                    {onBookmarkLesson && (
                      <button
                        type="button"
                        disabled={isBookmarked}
                        onClick={() => {
                          playSuccessChime();
                          setIsBookmarked(true);
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
                        className={`px-2 py-1.5 rounded-lg border text-xs flex items-center gap-1 shrink-0 cursor-pointer whitespace-nowrap ${
                          isBookmarked
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                        }`}
                      >
                        {isBookmarked ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                        <span>{isBookmarked ? '已收藏' : '收藏此句'}</span>
                      </button>
                    )}
                  </div>
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
                    <span className="font-semibold text-slate-100">
                      {decomposedResult.components?.bridge &&
                      !/^(null|undefined|none|n\/a|無|-|—)$/i.test(decomposedResult.components.bridge.trim())
                        ? decomposedResult.components.bridge
                        : '— (直接連接)'}
                    </span>
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
