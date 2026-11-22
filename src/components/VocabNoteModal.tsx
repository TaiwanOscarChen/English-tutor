import React, { useState } from 'react';
import { VocabItem } from '../types';
import { X, Sparkles, Edit3, Save, Trash2, CheckCircle2, BookOpen, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playClickSound, playSuccessChime } from '../utils/audioEffects';
import { getExampleTranslation } from '../utils/exampleSentenceTranslator';
import { speakEnglish, speakChinese } from '../utils/speech';

interface VocabNoteModalProps {
  vocabItem: VocabItem | null;
  isOpen: boolean;
  onClose: () => void;
  currentNote: string;
  onSaveNote: (vocabId: string, note: string) => void;
}

export const VocabNoteModal: React.FC<VocabNoteModalProps> = ({
  vocabItem,
  isOpen,
  onClose,
  currentNote,
  onSaveNote,
}) => {
  const [noteText, setNoteText] = useState(currentNote);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const closeTimerRef = React.useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // Sync state when opened with a new item
  React.useEffect(() => {
    clearCloseTimer();
    setNoteText(currentNote || '');
    setSavedSuccess(false);
  }, [vocabItem, currentNote, isOpen]);

  React.useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !vocabItem) return null;

  const handleSave = () => {
    playSuccessChime();
    onSaveNote(vocabItem.id, noteText.trim());
    setSavedSuccess(true);
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, 600);
  };

  const handleClear = () => {
    playClickSound();
    setNoteText('');
    onSaveNote(vocabItem.id, '');
    setSavedSuccess(true);
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, 400);
  };

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="客製化單字備忘筆記"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          className="bg-slate-900 border-2 border-amber-400/70 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative overflow-hidden litho-laser-line"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-black">
                <Edit3 className="w-4 h-4 fill-slate-950" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-100 font-mono">
                  客製化單字備忘筆記
                </h3>
                <p className="text-xs text-amber-300 font-medium">
                  {vocabItem.word} ({vocabItem.translation})
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="關閉筆記"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              title="關閉筆記 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Reference Word Info */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400">系統台味諧音：</span>
              <span className="font-mono font-black text-yellow-300">【 {vocabItem.taiwanPhonetic} 】</span>
            </div>
            <div className="text-slate-300 text-[11px] leading-relaxed">
              <span className="text-cyan-400 font-bold">預設聯想：</span>
              {vocabItem.memoryTrick}
            </div>
            {vocabItem.exampleSentence && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300">
                  <span>💬 無塵室例句：</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        speakEnglish(vocabItem.exampleSentence);
                      }}
                      className="text-cyan-300 hover:text-cyan-100 flex items-center gap-1 cursor-pointer font-bold px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 hover:bg-cyan-900/60 transition-colors text-[10px]"
                      title="播放例句發音"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>聽例句</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        speakEnglish(vocabItem.exampleSentence, 0.7);
                      }}
                      className="text-amber-300 hover:text-amber-100 cursor-pointer font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-amber-500/30 hover:bg-slate-800 transition-colors text-[10px]"
                      title="0.7x 慢速清晰聽例句"
                    >
                      0.7x
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        const zh = vocabItem.exampleTranslation || vocabItem.exampleSentenceZh || getExampleTranslation(vocabItem.exampleSentence, vocabItem.word);
                        speakChinese(zh);
                      }}
                      className="text-emerald-400 hover:text-emerald-200 flex items-center gap-1 cursor-pointer font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 hover:bg-emerald-900/80 transition-colors text-[10px]"
                      title="朗讀例句中文"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>聽中文</span>
                    </button>
                  </div>
                </div>
                <div className="font-mono font-semibold text-slate-200 text-xs pl-0.5 break-words">
                  "{vocabItem.exampleSentence}"
                </div>
                <div className="text-[11px] text-emerald-300 font-medium bg-emerald-950/40 border border-emerald-800/50 rounded px-2 py-1 leading-relaxed">
                  <span className="font-bold text-emerald-400">中文意思：</span>
                  {vocabItem.exampleTranslation || vocabItem.exampleSentenceZh || getExampleTranslation(vocabItem.exampleSentence, vocabItem.word)}
                </div>
              </div>
            )}
          </div>

          {/* User Custom Note Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>個人的記憶諧音 / 機台情境備忘：</span>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+Enter 快速儲存</span>
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
              placeholder="輸入你自己最熟悉的諧音口訣、光學檢測或製程設備異常情境、交接備忘提醒..."
              rows={4}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors shadow-inner resize-none font-sans"
            />
          </div>

          {/* Feedback & Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            {currentNote && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清除筆記</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all"
              >
                取消
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>已儲存！</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-slate-950" />
                    <span>儲存筆記</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
