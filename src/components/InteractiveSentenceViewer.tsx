import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Info, Volume2, Play, Square } from 'lucide-react';
import { lookupWordDefinition, WordDefinition, getWordKKPhonetic } from '../utils/wordDictionary';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { speakSingleEnglishWord, speakEnglish, cancelSpeech } from '../utils/speech';
import { playClickSound } from '../utils/audioEffects';

interface InteractiveSentenceViewerProps {
  sentence: string;
  chinese?: string;
  phonetic?: string;
  mandarinPhonetic?: string;
  components?: {
    subject: string;
    action: string;
    bridge?: string;
    object: string;
  };
  highlightSvo?: 'subject' | 'action' | 'bridge' | 'object' | null;
  onSelectSvoRole?: (role: 'subject' | 'action' | 'bridge' | 'object' | null) => void;
  speechSpeed?: number;
  highlightWords?: string[];
  className?: string;
  compact?: boolean;
}

export const InteractiveSentenceViewer: React.FC<InteractiveSentenceViewerProps> = ({
  sentence,
  phonetic,
  components,
  highlightSvo,
  onSelectSvoRole,
  className = '',
}) => {
  const [selectedWord, setSelectedWord] = useState<WordDefinition | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [isStepReading, setIsStepReading] = useState<boolean>(false);
  const stepTimerRef = useRef<any>(null);

  // Stop step reading if sentence changes or component unmounts
  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, [sentence]);

  // Helper to strip Chinese/emoji annotations from component strings
  const stripComponentAnnotations = (raw?: string) => {
    if (!raw) return '';
    return raw
      .replace(/\s*[\(（\[【\{][^\)）\]\}]*[\)）\]\}]/g, '')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u4e00-\u9fa5]/g, '')
      .replace(/[.,!?;:]+$/g, '')
      .trim()
      .toLowerCase();
  };

  // 將句子拆分為單字與標點符號 token，並對齊整句音標分段與 SVO 角色
  const tokens = React.useMemo(() => {
    if (!sentence) return [];
    const phoneticSegments = phonetic
      ? phonetic
          .replace(/^【\s*|\s*】$/g, '')
          .split(/[｜|]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const subjWords = stripComponentAnnotations(components?.subject).split(/\s+/).filter(Boolean);
    const actWords = stripComponentAnnotations(components?.action).split(/\s+/).filter(Boolean);
    const bridgeWords = stripComponentAnnotations(components?.bridge || 'the').split(/\s+/).filter(Boolean);
    const objWords = stripComponentAnnotations(components?.object).split(/\s+/).filter(Boolean);

    const rawList = sentence.split(/\s+/).filter(Boolean);

    return rawList.map((rawToken, idx) => {
      const clean = rawToken.replace(/^[^a-zA-Z0-9-]+|[^a-zA-Z0-9-]+$/g, '');
      const lowerClean = clean.toLowerCase();
      const def = clean ? lookupWordDefinition(clean) : null;
      const kk = clean ? (def?.kkPhonetic || getWordKKPhonetic(clean, def?.ipa)) : '';
      const segPhonetic = phoneticSegments[idx] || '';

      const rawMandarin = (def?.mandarinPhonetic || def?.taiwanPhonetic || segPhonetic || '')
        .replace(/^【\s*|\s*】$/g, '')
        .replace(/\s*-\s*/g, '')
        .trim();

      const rawZhuyinSource = rawMandarin || def?.taiwanPhonetic || segPhonetic;
      const zhuyinClean = rawZhuyinSource
        ? convertPhoneticToZhuyin(rawZhuyinSource).replace(/^【\s*|\s*】$/g, '').replace(/\s*-\s*/g, ' ').trim()
        : '';

      // Determine SVO role for this token so left word cards match right SVO blocks and imperative sentences
      const IMPERATIVE_VERBS = new Set([
        'check', 'place', 'start', 'run', 'scan', 'inspect', 'test', 'calibrate',
        'clean', 'lock', 'reset', 'finish', 'verify', 'replace', 'adjust', 'purge',
        'stop', 'open', 'close', 'align', 'tune', 'read', 'save', 'fix', 'teach', 'fill'
      ]);
      const BRIDGE_WORDS = new Set(['the', 'a', 'an', 'this', 'that', 'to', 'in', 'on', 'at', 'for', 'with', 'of', 'from']);

      let svoRole: 'subject' | 'action' | 'bridge' | 'object' = 'object';
      if (BRIDGE_WORDS.has(lowerClean) || (bridgeWords.includes(lowerClean) && idx >= 1 && idx < rawList.length - 1)) {
        svoRole = 'bridge';
      } else if (idx === 0 && IMPERATIVE_VERBS.has(lowerClean) && !subjWords.includes(lowerClean)) {
        svoRole = 'action';
      } else if (idx === 0 || (idx < subjWords.length && subjWords.includes(lowerClean))) {
        svoRole = 'subject';
      } else if (actWords.includes(lowerClean) || IMPERATIVE_VERBS.has(lowerClean)) {
        svoRole = 'action';
      } else if (objWords.includes(lowerClean) || idx === rawList.length - 1) {
        svoRole = 'object';
      } else if (idx === 1) {
        svoRole = 'action';
      } else if (idx === 2 && rawList.length >= 4) {
        svoRole = 'bridge';
      }

      return {
        id: `${idx}-${rawToken}`,
        raw: rawToken,
        clean,
        def,
        kk,
        zhuyin: zhuyinClean,
        homophone: rawMandarin,
        svoRole,
        index: idx
      };
    });
  }, [sentence, phonetic, components]);

  const stopStepReading = () => {
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }
    setIsStepReading(false);
  };

  // 🐢 零基礎逐字慢速帶讀模式：一個字一個字亮燈、同步右側 SVO 字卡、慢速發音，最後整句連讀
  const handleToggleStepByStepReading = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();

    if (isStepReading) {
      stopStepReading();
      cancelSpeech();
      if (onSelectSvoRole) onSelectSvoRole(null);
      return;
    }

    const validTokens = tokens.filter((t) => Boolean(t.clean));
    if (validTokens.length === 0) return;

    setIsStepReading(true);
    let currentStep = 0;

    const runStep = () => {
      if (currentStep >= validTokens.length) {
        // 最後整句慢速連讀一次
        setActiveWordIndex(null);
        if (onSelectSvoRole) onSelectSvoRole(null);
        speakEnglish(sentence, 0.75, () => {
          setIsStepReading(false);
        });
        return;
      }

      const tk = validTokens[currentStep];
      setActiveWordIndex(tk.index);
      if (onSelectSvoRole) onSelectSvoRole(tk.svoRole);
      if (tk.def) setSelectedWord(tk.def);
      speakSingleEnglishWord(tk.clean, 0.72);

      currentStep++;
      stepTimerRef.current = setTimeout(runStep, 1250);
    };

    runStep();
  };

  const handleWordClick = (
    token: { clean: string; def: WordDefinition | null; svoRole: 'subject' | 'action' | 'bridge' | 'object'; index: number },
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!token.clean || !token.def) return;

    stopStepReading();
    playClickSound();
    setSelectedWord(token.def);
    setActiveWordIndex(token.index);
    if (onSelectSvoRole) onSelectSvoRole(token.svoRole);

    // 即時單獨慢速清晰朗讀該單字
    speakSingleEnglishWord(token.clean, 0.8);
  };

  const handleCloseWordModal = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    stopStepReading();
    setSelectedWord(null);
    setActiveWordIndex(null);
    if (onSelectSvoRole) onSelectSvoRole(null);
  };

  const gridColsClass =
    tokens.length <= 3
      ? 'grid-cols-3'
      : tokens.length === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';

  const getRoleTheme = (role: 'subject' | 'action' | 'bridge' | 'object') => {
    switch (role) {
      case 'subject':
        return {
          badge: '主角',
          badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          borderClass: 'border-cyan-500/45 hover:border-cyan-300 hover:bg-cyan-950/60',
          activeRing: 'ring-2 ring-cyan-400 border-cyan-300 bg-cyan-950/80'
        };
      case 'action':
        return {
          badge: '動作',
          badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          borderClass: 'border-rose-500/45 hover:border-rose-300 hover:bg-rose-950/60',
          activeRing: 'ring-2 ring-rose-400 border-rose-300 bg-rose-950/80'
        };
      case 'bridge':
        return {
          badge: '橋樑',
          badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          borderClass: 'border-indigo-500/45 hover:border-indigo-300 hover:bg-indigo-950/60',
          activeRing: 'ring-2 ring-indigo-400 border-indigo-300 bg-indigo-950/80'
        };
      case 'object':
      default:
        return {
          badge: '東西',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          borderClass: 'border-emerald-500/45 hover:border-emerald-300 hover:bg-emerald-950/60',
          activeRing: 'ring-2 ring-emerald-400 border-emerald-300 bg-emerald-950/80'
        };
    }
  };

  return (
    <div className={`w-full flex flex-col items-stretch select-none space-y-2 ${className}`}>
      {/* 完整英文原句主顯示框 (零基礎逐字拆解直讀 + 🐢 逐字慢讀) */}
      <div className="w-full bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5 space-y-2 shadow-inner">
        <div className="flex items-center justify-between gap-1.5 border-b border-slate-800/80 pb-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-black tracking-wider shrink-0">
              逐字導讀
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={handleToggleStepByStepReading}
              className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-black flex items-center gap-1 cursor-pointer transition-all shrink-0 active:scale-95 whitespace-nowrap ${
                isStepReading
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm animate-pulse'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-amber-300'
              }`}
              title="逐字慢讀"
            >
              {isStepReading ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current" />}
              <span>{isStepReading ? '停止' : '慢讀'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                stopStepReading();
                playClickSound();
                speakEnglish(sentence, 0.82);
              }}
              className="px-2 py-0.5 rounded-md bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0 active:scale-95 whitespace-nowrap"
              title="整句朗讀"
            >
              <Volume2 className="w-3 h-3 text-cyan-400" />
              <span>整句</span>
            </button>
          </div>
        </div>

        {/* 完整英文句子互動式大字標題列 (支援逐字高亮與點字直讀，不擠壓換行) */}
        <div className="flex items-center justify-between gap-2 bg-slate-950/90 border border-slate-800/90 rounded-lg px-2.5 py-1.5">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-base sm:text-lg font-mono font-black tracking-tight leading-snug select-text min-w-0 flex-1">
            {tokens.map((tk) => {
              const isCurWord = activeWordIndex === tk.index;
              const isRoleMatch = !isCurWord && highlightSvo === tk.svoRole;
              const roleColorText =
                tk.svoRole === 'subject'
                  ? 'text-cyan-300'
                  : tk.svoRole === 'action'
                  ? 'text-rose-300'
                  : tk.svoRole === 'bridge'
                  ? 'text-indigo-300'
                  : 'text-emerald-300';
              return (
                <span
                  key={`hero-${tk.id}`}
                  onClick={(e) => handleWordClick(tk, e)}
                  className={`cursor-pointer rounded px-1 py-0.2 transition-all ${
                    isCurWord
                      ? 'bg-amber-400 text-slate-950 scale-105 shadow-sm'
                      : isRoleMatch
                      ? `bg-slate-800 ${roleColorText} underline decoration-2 underline-offset-4`
                      : `text-white hover:${roleColorText} hover:bg-slate-900`
                  }`}
                  title={tk.def?.translation ? `${tk.clean}: ${tk.def.translation}` : tk.clean}
                >
                  {tk.raw}
                </span>
              );
            })}
          </div>
          <span className="text-[10px] font-mono text-slate-400 shrink-0 hidden lg:inline whitespace-nowrap">
            點字發音
          </span>
        </div>

        {/* 零基礎四層直讀單字卡陣列 (對稱網格排列，4字句自動單排4欄對齊 + SVO 色彩連動) */}
        <div className={`grid ${gridColsClass} gap-1.5 pt-0.5 w-full items-stretch`}>
          {tokens.map((token) => {
            const isSelected = activeWordIndex === token.index;
            const isRoleHighlighted = !isSelected && highlightSvo === token.svoRole;
            const hasCleanWord = Boolean(token.clean);
            const roleTheme = getRoleTheme(token.svoRole);
            const meaningShort = token.def?.translation
              ? token.def.translation
                  .replace(/\s*[\(（][^\)）]*[\)）]/g, '')
                  .split('/')[0]
                  .trim()
              : '';

            return (
              <button
                key={token.id}
                type="button"
                onClick={(e) => handleWordClick(token, e)}
                onMouseEnter={() => {
                  if (onSelectSvoRole && !isStepReading) onSelectSvoRole(token.svoRole);
                }}
                onMouseLeave={() => {
                  if (onSelectSvoRole && !isStepReading && activeWordIndex === null) onSelectSvoRole(null);
                }}
                disabled={!hasCleanWord}
                className={`group relative px-2 py-1.5 rounded-xl text-xs font-mono transition-all duration-200 ease-out gpu-smooth cursor-pointer hover:-translate-y-0.5 active:scale-95 text-left w-full flex flex-col items-start justify-between gap-0.5 border ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/35 -translate-y-0.5 scale-[1.02] ring-2 ring-amber-300'
                    : isRoleHighlighted
                    ? `text-white shadow-md -translate-y-0.5 scale-[1.015] ${roleTheme.activeRing}`
                    : `bg-slate-950/95 text-cyan-100 hover:text-white shadow-xs ${roleTheme.borderClass}`
                } ${!hasCleanWord ? 'opacity-70 cursor-default' : ''}`}
              >
                {/* 頂部語序對應標籤 + 喇叭 */}
                <div className="w-full flex items-center justify-between gap-1">
                  <span
                    className={`px-1 py-0.1 rounded text-[9px] font-sans font-black border whitespace-nowrap ${
                      isSelected ? 'bg-slate-950/20 text-slate-950 border-slate-950/30' : roleTheme.badgeClass
                    }`}
                  >
                    {roleTheme.badge}
                  </span>
                  <Volume2 className={`w-2.5 h-2.5 shrink-0 ${isSelected ? 'text-slate-950' : 'text-cyan-400/80 group-hover:text-cyan-300'}`} />
                </div>

                {/* 第一層：英文單字 */}
                <div className="w-full border-b border-current/15 pb-0.5 pt-0.5 flex items-baseline justify-between gap-1 flex-wrap">
                  <span className="font-mono font-black text-xs sm:text-[13px] tracking-tight leading-snug break-all">
                    {token.clean || token.raw.replace(/[.,!?;:]+$/g, '')}
                  </span>
                  {token.kk && (
                    <span
                      className={`text-[10px] font-mono font-bold whitespace-nowrap ${
                        isSelected ? 'text-slate-900' : 'text-cyan-300/90'
                      }`}
                    >
                      KK {token.kk}
                    </span>
                  )}
                </div>

                {/* 第二層：繁體中文詞義 */}
                {meaningShort && (
                  <span
                    className={`block text-[11px] font-sans font-black break-words whitespace-normal leading-tight pt-0.5 ${
                      isSelected ? 'text-slate-950' : 'text-amber-300 group-hover:text-amber-200'
                    }`}
                  >
                    {meaningShort}
                  </span>
                )}

                {/* 第三層：注音直讀 (以音節為單位保護不拆字、聲調不落單) */}
                {token.zhuyin && (
                  <div
                    className={`flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] font-mono font-bold leading-tight ${
                      isSelected ? 'text-slate-900 font-black' : 'text-yellow-200/95'
                    }`}
                  >
                    {token.zhuyin.split(/\s+/).filter(Boolean).map((syl, sIdx) => (
                      <span key={sIdx} className="inline-block whitespace-nowrap">
                        {syl}
                      </span>
                    ))}
                  </div>
                )}

                {/* 第四層：台味諧音直讀 */}
                {token.homophone && (
                  <span
                    className={`block text-[10px] font-sans font-bold whitespace-nowrap leading-tight ${
                      isSelected ? 'text-slate-950 font-black' : 'text-emerald-300/95'
                    }`}
                  >
                    諧音: {token.homophone}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 📖 點擊單字彈出的高傳真詳細解析卡 (Interactive Word Detail Card) */}
      <AnimatePresence>
        {selectedWord && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="w-full mt-1.5 p-3 bg-gradient-to-br from-slate-900 via-indigo-950/90 to-slate-950 rounded-2xl border-2 border-amber-400/80 shadow-xl shadow-amber-950/30 text-left relative overflow-hidden"
          >
            {/* Top Row: Word, POS, Audio, Close */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2 flex-wrap gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg sm:text-xl font-mono font-black text-amber-300">
                  {selectedWord.word}
                </span>
                <span className="text-xs px-1.5 py-0.2 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono font-bold">
                  {selectedWord.partOfSpeech}
                </span>
                {selectedWord.category && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-600/40 font-mono uppercase">
                    {selectedWord.category}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    speakSingleEnglishWord(selectedWord.word, 0.62);
                  }}
                  className="px-2 py-0.8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                  title="慢讀"
                >
                  <span>慢讀</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    speakSingleEnglishWord(selectedWord.word, 0.85);
                  }}
                  className="px-2 py-0.8 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                  title="發音"
                >
                  <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
                  <span>發音</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseWordModal}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
                  title="關閉單字釋義"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Translation & Phonetic Bar */}
            <div className="space-y-1.5">
              <div className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-1.5">
                <span className="text-amber-400">📖</span>
                <span>{selectedWord.translation}</span>
              </div>

              {/* Enhanced Phonetic Badges: KK, Syllables, Zhuyin, Homophone */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs pt-0.5">
                {(selectedWord.kkPhonetic || getWordKKPhonetic(selectedWord.word, selectedWord.ipa)) && (
                  <span className="px-2 py-0.5 rounded-lg bg-cyan-950/95 border border-cyan-400/70 text-cyan-200 font-mono font-black tracking-wide flex items-center gap-1">
                    <span className="text-[10px] text-cyan-400 font-sans">KK音標</span>
                    <span>{selectedWord.kkPhonetic || getWordKKPhonetic(selectedWord.word, selectedWord.ipa)}</span>
                  </span>
                )}

                {selectedWord.syllables && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono font-semibold tracking-wider flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-sans">音節</span>
                    <span>{selectedWord.syllables}</span>
                  </span>
                )}

                {selectedWord.taiwanPhonetic && (
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-950 border border-indigo-500/80 text-yellow-300 font-mono font-black tracking-wider flex items-center gap-1">
                    <span className="text-[10px] text-amber-400/80 font-sans">注音</span>
                    <span>
                      {(() => {
                        const zh = convertPhoneticToZhuyin(selectedWord.taiwanPhonetic);
                        const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                        return clean ? `【 ${clean} 】` : '';
                      })()}
                    </span>
                  </span>
                )}

                {selectedWord.mandarinPhonetic && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-950 border border-emerald-500/80 text-emerald-300 font-mono font-black tracking-wider flex items-center gap-1">
                    <span className="text-[10px] text-emerald-400/80 font-sans">諧音</span>
                    <span>
                      {(() => {
                        const clean = selectedWord.mandarinPhonetic.trim().replace(/^【\s*|\s*】$/g, '').trim();
                        return clean ? `【 ${clean} 】` : '';
                      })()}
                    </span>
                  </span>
                )}
              </div>

              {/* Cleanroom context or memory trick */}
              {selectedWord.cleanroomContext && (
                <div className="text-xs text-cyan-200/90 bg-slate-950/80 p-2 rounded-xl border border-cyan-900/40 flex items-start gap-1.5 mt-1 leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{selectedWord.cleanroomContext}</span>
                </div>
              )}

              {selectedWord.memoryTrick && (
                <div className="text-xs text-amber-200/90 bg-amber-950/30 p-2 rounded-xl border border-amber-900/40 flex items-start gap-1.5 leading-relaxed">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{selectedWord.memoryTrick}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
