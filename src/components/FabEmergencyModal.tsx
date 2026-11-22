import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  AlertTriangle,
  Volume2,
  Copy,
  Check,
  ShieldAlert,
  Radio,
  Zap,
  Cpu,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { FAB_EMERGENCY_PROTOCOLS, EmergencyProtocol } from '../data/emergencyProtocols';
import { speakEnglish, cancelSpeech } from '../utils/speech';
import { playClickSound, playLaserScanSound, playWaferSnapSound } from '../utils/audioEffects';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { useToast } from '../context/ToastContext';

interface FabEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechSpeed: number;
}

// Protocol category icon mapping
const getProtocolIcon = (proto: EmergencyProtocol) => {
  if (proto.id.includes('fire') || proto.id.includes('smoke')) return '🔥';
  if (proto.id.includes('earthquake')) return '🌍';
  switch (proto.category) {
    case 'gas':
      return '🚨';
    case 'chemical':
      return '🧪';
    case 'equipment':
      return '🤖';
    case 'safety':
      return '⚡';
    default:
      return '⚠️';
  }
};

const getProtocolShortTitle = (titleZh: string) => {
  return titleZh
    .replace(/^[\p{Emoji}\u2000-\u3300\s]+/gu, '')
    .replace(/\s*\([^)]*\).*$/, '')
    .trim();
};

export const FabEmergencyModal: React.FC<FabEmergencyModalProps> = ({
  isOpen,
  onClose,
  speechSpeed
}) => {
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>(
    FAB_EMERGENCY_PROTOCOLS[0].id
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPlayingBroadcast, setIsPlayingBroadcast] = useState(false);
  const { showCopyToast } = useToast();

  const broadcastTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const clearBroadcastTimer = () => {
    if (broadcastTimerRef.current !== null) {
      window.clearTimeout(broadcastTimerRef.current);
      broadcastTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      clearBroadcastTimer();
      setIsPlayingBroadcast(false);
      cancelSpeech();
    }
  }, [isOpen]);

  useEffect(() => {
    clearBroadcastTimer();
    setIsPlayingBroadcast(false);
    cancelSpeech();
  }, [selectedProtocolId]);

  useEffect(() => {
    return () => {
      clearBroadcastTimer();
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      cancelSpeech();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelSpeech();
        onClose();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const curIdx = FAB_EMERGENCY_PROTOCOLS.findIndex((p) => p.id === selectedProtocolId);
        const total = FAB_EMERGENCY_PROTOCOLS.length;
        if (curIdx >= 0 && total > 1) {
          const nextIdx = e.key === 'ArrowRight' ? (curIdx + 1) % total : (curIdx - 1 + total) % total;
          playClickSound();
          setSelectedProtocolId(FAB_EMERGENCY_PROTOCOLS[nextIdx].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, selectedProtocolId]);

  if (!isOpen) return null;

  const currentProtocol =
    FAB_EMERGENCY_PROTOCOLS.find((p) => p.id === selectedProtocolId) ||
    FAB_EMERGENCY_PROTOCOLS[0];

  const handleCopy = (text: string, key: string, label: string = 'SOP 通報範本') => {
    playLaserScanSound();
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      setCopiedKey(key);
      showCopyToast(label);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {}
  };

  const handlePlayBroadcast = (text: string, customRate?: number) => {
    playClickSound();
    if (broadcastTimerRef.current !== null) {
      window.clearTimeout(broadcastTimerRef.current);
      broadcastTimerRef.current = null;
    }
    if (isPlayingBroadcast && customRate === undefined) {
      cancelSpeech();
      setIsPlayingBroadcast(false);
      return;
    }
    cancelSpeech();
    setIsPlayingBroadcast(true);
    speakEnglish(text, customRate ?? Math.min(0.9, speechSpeed), () => {
      if (broadcastTimerRef.current !== null) {
        window.clearTimeout(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
      setIsPlayingBroadcast(false);
    });
    broadcastTimerRef.current = window.setTimeout(() => {
      setIsPlayingBroadcast(false);
      broadcastTimerRef.current = null;
    }, 15000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="無塵室緊急事故應變與英文廣播求救手冊"
      onClick={() => {
        cancelSpeech();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-slate-900 border-2 border-rose-500/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-950 via-slate-950 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>無塵室緊急事故應變與英文廣播求救手冊</span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-950 text-rose-300 border border-rose-700 text-xs font-mono">
                    Fab SOS Protocol
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                氣體洩漏、化學噴濺、機械臂破片、高壓 LOTO 與全廠廣播通報
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="關閉緊急手冊"
            onClick={() => {
              cancelSpeech();
              playClickSound();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            title="關閉手冊 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Protocol Category Navigation Tabs */}
        <div
          role="tablist"
          aria-label="緊急事故應變類型"
          className="p-2.5 bg-slate-950 border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0 no-scrollbar"
        >
          {FAB_EMERGENCY_PROTOCOLS.map((proto) => {
            const isSelected = proto.id === selectedProtocolId;
            return (
              <button
                key={proto.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  playClickSound();
                  setSelectedProtocolId(proto.id);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                  isSelected
                    ? 'bg-rose-500 text-slate-950 font-black shadow-md shadow-rose-500/30 ring-1 ring-rose-300'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <span className="text-sm">{getProtocolIcon(proto)}</span>
                <span>{getProtocolShortTitle(proto.titleZh)}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Main Selected Protocol Info */}
          <div className="bg-slate-950/90 border border-rose-500/40 rounded-3xl p-4 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <span className="text-rose-400 text-xs font-mono font-bold">
                  {currentProtocol.titleEn}
                </span>
                <h3 className="text-lg font-black text-slate-100 mt-1">
                  {currentProtocol.titleZh}
                </h3>
              </div>

              <span className="px-3 py-1 rounded-xl bg-rose-950 text-rose-300 border border-rose-700 font-mono font-bold text-xs uppercase">
                {currentProtocol.urgency} Urgency
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              {currentProtocol.summary}
            </p>

            {/* Public Broadcast Loudspeaker Box */}
            <div className="bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-500/60 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-rose-300 font-black text-xs">
                  <Radio className="w-4 h-4 text-rose-400" />
                  <span>無塵室/廠務即時廣播英文原稿 (Emergency Broadcast Script)：</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-pressed={isPlayingBroadcast}
                    onClick={() => handlePlayBroadcast(currentProtocol.broadcastScriptEn)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isPlayingBroadcast ? '停止廣播' : '廣播朗讀'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlayBroadcast(currentProtocol.broadcastScriptEn, 0.7)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold transition-colors cursor-pointer tabular-nums"
                    title="0.7x 慢速清晰朗讀緊急廣播"
                  >
                    0.7x
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(currentProtocol.broadcastScriptEn, 'broadcast')}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all cursor-pointer"
                    title="複製廣播稿"
                  >
                    {copiedKey === 'broadcast' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="font-mono text-xs sm:text-sm font-semibold text-slate-100 italic bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                "{currentProtocol.broadcastScriptEn}"
              </p>
              <p className="text-xs text-slate-400">
                廣播中譯：{currentProtocol.broadcastScriptZh}
              </p>
            </div>

            {/* SOP Steps */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>現場三步驟黃金應變處置 (3-Step Emergency Response)</span>
              </h4>

              <div className="space-y-3">
                {currentProtocol.sopSteps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-mono font-black text-xs tabular-nums">
                        STEP {step.stepNumber}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            speakEnglish(step.actionEn, speechSpeed);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs transition-all cursor-pointer"
                          title="朗讀英文處置"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            speakEnglish(step.actionEn, 0.7);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold transition-colors cursor-pointer tabular-nums"
                          title="0.7x 慢速清晰朗讀"
                        >
                          0.7x
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(step.actionEn, `step-${step.stepNumber}`)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all cursor-pointer"
                          title="複製英文"
                        >
                          {copiedKey === `step-${step.stepNumber}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="font-mono font-bold text-xs sm:text-sm text-slate-100 break-words">
                      {step.actionEn}
                    </p>
                    <p className="text-xs text-slate-300 break-words">
                      {step.actionZh}
                    </p>
                    <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-2 space-y-1 text-xs">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono font-bold shrink-0">
                          注音
                        </span>
                        <span className="font-mono font-black text-amber-300 tracking-wider break-words flex-1 leading-snug">
                          {(() => {
                            const zh = convertPhoneticToZhuyin(step.phonetic);
                            const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                            return clean ? `【 ${clean} 】` : step.phonetic;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 pt-1 border-t border-slate-800/80 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold shrink-0">
                          諧音
                        </span>
                        <span className="font-sans font-black text-emerald-300 tracking-wider break-words flex-1 leading-snug">
                          {(() => {
                            const clean = step.phonetic.trim().replace(/^【\s*|\s*】$/g, '').trim();
                            return clean ? `【 ${clean} 】` : step.phonetic;
                          })()}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 break-words">
                      📌 無塵室現場提示：{step.cleanroomTip}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Essential Vocabularies */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs sm:text-sm font-black text-cyan-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>求救核心關鍵字庫 (Essential SOS Glossary)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentProtocol.essentialVocab.map((vocab, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-black text-amber-300 text-xs">
                        {vocab.term}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            speakEnglish(vocab.term, speechSpeed);
                          }}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                          title="標準發音"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            speakEnglish(vocab.term, 0.7);
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold cursor-pointer transition-colors"
                          title="0.7x 慢速發音"
                        >
                          0.7x
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-300 font-medium">{vocab.meaning}</p>
                    <p className="text-slate-400 font-mono text-[11px] italic">
                      "{vocab.example}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 font-mono">
            ⚠️ 本手冊依據半導體晶圓廠標準工安規範 (SEMI S2/S8) 編制
          </span>

          <button
            type="button"
            onClick={() => {
              cancelSpeech();
              playClickSound();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            關閉手冊
          </button>
        </div>
      </motion.div>
    </div>
  );
};
