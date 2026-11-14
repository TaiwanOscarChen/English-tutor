import React, { useState, useEffect } from 'react';
import { VocabItem } from '../types';
import { X, Volume2, Sparkles, ArrowLeft, ArrowRight, RotateCw, CheckCircle2, Bookmark, HelpCircle, Zap, Eye, EyeOff } from 'lucide-react';
import { speakEnglish, speakChinese } from '../utils/speech';
import { playClickSound, playSuccessChime, playWaferSnapSound } from '../utils/audioEffects';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getWordKKPhonetic } from '../utils/wordDictionary';
import { getExampleTranslation } from '../utils/exampleSentenceTranslator';
import { motion, AnimatePresence } from 'motion/react';

interface VocabFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  vocabList: VocabItem[];
  speechSpeed: number;
  userNotes?: Record<string, string>;
}

export const VocabFlashcardModal: React.FC<VocabFlashcardModalProps> = ({
  isOpen,
  onClose,
  vocabList,
  speechSpeed,
  userNotes = {}
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [masteredIds, setMasteredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fab_flashcard_mastered');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const currentVocab = vocabList[currentIndex] || vocabList[0];

  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  // Keyboard navigation: ArrowLeft, ArrowRight, Space (flip), KeyM (master)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleToggleMastered();
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (currentVocab) speakEnglish(currentVocab.word, speechSpeed);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, vocabList, isFlipped, currentVocab, speechSpeed]);

  if (!isOpen || !currentVocab) return null;

  const handleNext = () => {
    playClickSound();
    setCurrentIndex((prev) => (prev + 1) % vocabList.length);
  };

  const handlePrev = () => {
    playClickSound();
    setCurrentIndex((prev) => (prev - 1 + vocabList.length) % vocabList.length);
  };

  const handleFlip = () => {
    playWaferSnapSound();
    setIsFlipped((prev) => !prev);
  };

  const handleToggleMastered = () => {
    playSuccessChime();
    setMasteredIds((prev) => {
      const next = prev.includes(currentVocab.id)
        ? prev.filter((id) => id !== currentVocab.id)
        : [...prev, currentVocab.id];
      try {
        localStorage.setItem('fab_flashcard_mastered', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isCurrentMastered = masteredIds.includes(currentVocab.id);
  const masteredCount = vocabList.filter((v) => masteredIds.includes(v.id)).length;
  const progressPercent = Math.round((masteredCount / vocabList.length) * 100) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400 rounded-xl text-slate-950 font-black shadow-md">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>晶圓單字翻轉閃卡</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/80 text-[10px] font-mono">
                  {currentIndex + 1} / {vocabList.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">點擊卡片或按「空白鍵」翻轉，按方向鍵切換前後張</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span>已熟記:</span>
            <span className="text-emerald-400 font-bold">{masteredCount}/{vocabList.length} ({progressPercent}%)</span>
          </div>
          <div className="w-32 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Flashcard Body (Interactive 3D Flip) */}
        <div className="p-4 sm:p-6 flex-1 flex flex-col items-center justify-center min-h-[320px] select-none">
          <motion.div
            key={currentVocab.id + (isFlipped ? '-back' : '-front')}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onClick={handleFlip}
            className={`w-full min-h-[260px] sm:min-h-[280px] rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between text-center cursor-pointer shadow-2xl transition-all border-2 relative ${
              isFlipped
                ? 'bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-950 border-cyan-500/60 shadow-cyan-500/10'
                : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-amber-500/50 shadow-amber-500/10'
            }`}
          >
            {/* Top Badge inside card */}
            <div className="w-full flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300">
                {currentVocab.partOfSpeech} • {currentVocab.category}
              </span>
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <RotateCw className="w-3 h-3 text-amber-400" />
                <span>點擊翻面</span>
              </span>
            </div>

            {/* Card Content: Front vs Back */}
            {!isFlipped ? (
              // FRONT: English Word & Triple-Track KK + Taiwan Zhuyin + Character Phonetic
              <div className="space-y-3.5 my-auto w-full max-w-md mx-auto">
                <h3 className="text-3xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight">
                  {currentVocab.word.replace(/\s*[\(（][^\)）]*[\)）]/g, '')}
                </h3>
                
                {/* Triple-Track Phonetic Module: KK音標 + 注音 + 諧音 */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 space-y-2 text-left shadow-inner">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-black shrink-0">
                      KK音標
                    </span>
                    <span className="text-cyan-200 font-mono font-black text-sm sm:text-base tracking-wider break-words flex-1">
                      {currentVocab.kkPhonetic || getWordKKPhonetic(currentVocab.word, currentVocab.ipa)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-black shrink-0">
                      注音
                    </span>
                    <span className="text-yellow-300 font-mono font-black text-sm sm:text-base tracking-wider break-words flex-1">
                      {(() => {
                        const zh = convertPhoneticToZhuyin(currentVocab.taiwanPhonetic);
                        const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                        return clean ? `【 ${clean} 】` : '—';
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-black shrink-0">
                      諧音
                    </span>
                    <span className="text-emerald-300 font-sans font-black text-sm sm:text-base tracking-wider break-words flex-1">
                      {(() => {
                        const clean = (currentVocab.mandarinPhonetic || currentVocab.taiwanPhonetic || '').trim().replace(/^【\s*|\s*】$/g, '').trim();
                        return clean ? `【 ${clean} 】` : '—';
                      })()}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center justify-center gap-1 pt-1">
                  <span>點擊查看中文翻譯、台味記憶口訣與例句</span>
                </div>
              </div>
            ) : (
              // BACK: Chinese Meaning, Memory Trick & Cleanroom Context
              <div className="space-y-3 my-auto w-full">
                <div className="text-2xl sm:text-3xl font-black text-cyan-300">
                  {currentVocab.translation.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim() || currentVocab.translation}
                </div>
                
                {/* Memory Trick */}
                <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2.5 text-xs sm:text-sm text-amber-200 font-medium">
                  <span className="font-black text-amber-400 mr-1">💡 記憶口訣：</span>
                  <span>{currentVocab.memoryTrick}</span>
                </div>

                {/* Cleanroom Context */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 text-left">
                  <span className="font-bold text-cyan-400 mr-1">🏭 無塵室情境：</span>
                  <span>{currentVocab.cleanroomContext}</span>
                </div>

                {/* Example sentence with Chinese translation */}
                {currentVocab.exampleSentence && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-2.5 space-y-1 text-left">
                    <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                      <span>💬 無塵室實戰例句：</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            speakEnglish(currentVocab.exampleSentence, speechSpeed);
                          }}
                          className="text-emerald-300 hover:text-emerald-100 flex items-center gap-1 cursor-pointer font-bold px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/60 hover:bg-emerald-800/60 transition-colors text-[10px]"
                          title="朗讀例句發音"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>聽例句</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            const zh = currentVocab.exampleTranslation || currentVocab.exampleSentenceZh || getExampleTranslation(currentVocab.exampleSentence, currentVocab.word);
                            speakChinese(zh);
                          }}
                          className="text-emerald-400 hover:text-emerald-200 flex items-center gap-1 cursor-pointer font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 hover:bg-emerald-900/80 transition-colors text-[10px]"
                          title="朗讀中文意思"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>聽中文</span>
                        </button>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-emerald-200 italic font-semibold">
                      "{currentVocab.exampleSentence}"
                    </div>
                    <div className="text-[11px] text-emerald-300 font-medium">
                      中文意思：{currentVocab.exampleTranslation || currentVocab.exampleSentenceZh || getExampleTranslation(currentVocab.exampleSentence, currentVocab.word)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions inside Card */}
            <div className="w-full flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakEnglish(currentVocab.word, speechSpeed);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>發音 (P)</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleMastered();
                }}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                  isCurrentMastered
                    ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30 font-black'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${isCurrentMastered ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{isCurrentMastered ? '已標記熟記 (M)' : '標為已熟記 (M)'}</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Navigation Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handlePrev}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>上一張 (←)</span>
          </button>

          <button
            onClick={handleFlip}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            <span>{isFlipped ? '看正面 (空白鍵)' : '看解答 (空白鍵)'}</span>
          </button>

          <button
            onClick={handleNext}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>下一張 (→)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
