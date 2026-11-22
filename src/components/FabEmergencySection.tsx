import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  Copy,
  Check,
  ShieldAlert,
  Zap,
  BookOpen,
  Sparkles,
  ChevronDown,
  Radio
} from 'lucide-react';
import { FAB_EMERGENCY_PROTOCOLS, EmergencyProtocol } from '../data/emergencyProtocols';
import { speakEnglish, cancelSpeech } from '../utils/speech';
import { playClickSound, playLaserScanSound } from '../utils/audioEffects';
import { EmergencyErrorCodeDrill } from '../hooks/useThreeDayAutoUpdate';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getMandarinPhoneticFromSentence } from '../utils/lessonSentenceHelper';
import { InteractiveSentenceViewer } from './InteractiveSentenceViewer';

interface FabEmergencySectionProps {
  speechSpeed: number;
  autoDrills?: EmergencyErrorCodeDrill[];
}

const getProtocolPillLabel = (proto: EmergencyProtocol) => {
  switch (proto.id) {
    case 'sos-toxic-gas':
      return { zh: '劇毒氣體洩漏', en: 'Gas Leak', icon: '🚨' };
    case 'sos-hf-chemical-burn':
      return { zh: '氫氟酸強酸噴濺', en: 'HF Splash', icon: '🧪' };
    case 'sos-wafer-drop-crash':
    case 'sos-wafer-drop-shatter':
      return { zh: '機械手臂破片', en: 'Wafer Break', icon: '🤖' };
    case 'sos-loto-interlock':
    case 'sos-loto-high-voltage':
      return { zh: '高壓斷電上鎖', en: 'LOTO', icon: '⚡' };
    case 'sos-smoke-fire':
    case 'sos-vesda-fire-smoke':
      return { zh: '極早期煙霧警報', en: 'Early Smoke', icon: '🔥' };
    case 'sos-earthquake-fab':
    case 'sos-earthquake-interlock':
      return { zh: '強震停機應變', en: 'Earthquake', icon: '🌍' };
    default:
      return { zh: '緊急應變 SOP', en: 'Emergency', icon: '⚠️' };
  }
};

export const FabEmergencySection: React.FC<FabEmergencySectionProps> = ({ speechSpeed, autoDrills }) => {
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>(
    FAB_EMERGENCY_PROTOCOLS[0].id
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPlayingBroadcast, setIsPlayingBroadcast] = useState(false);
  const [expandedWordByWordKeys, setExpandedWordByWordKeys] = useState<Record<string, boolean>>({});
  const [showAutoDrills, setShowAutoDrills] = useState<boolean>(true);
  const [showSopSteps, setShowSopSteps] = useState<boolean>(true);
  const [showVocabBank, setShowVocabBank] = useState<boolean>(false);

  const broadcastTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (broadcastTimerRef.current !== null) {
        window.clearTimeout(broadcastTimerRef.current);
      }
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      cancelSpeech();
    };
  }, []);

  const toggleWordByWord = (key: string) => {
    playClickSound();
    setExpandedWordByWordKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentProtocol =
    FAB_EMERGENCY_PROTOCOLS.find((p) => p.id === selectedProtocolId) ||
    FAB_EMERGENCY_PROTOCOLS[0];

  const handleCopy = (text: string, key: string) => {
    playLaserScanSound();
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      setCopiedKey(key);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Ignore clipboard permission errors in restricted contexts
    }
  };

  const handlePlayBroadcast = (text: string) => {
    playClickSound();
    if (broadcastTimerRef.current !== null) {
      window.clearTimeout(broadcastTimerRef.current);
      broadcastTimerRef.current = null;
    }
    if (isPlayingBroadcast) {
      cancelSpeech();
      setIsPlayingBroadcast(false);
      return;
    }
    setIsPlayingBroadcast(true);
    speakEnglish(text, Math.min(0.9, speechSpeed), () => {
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
    <div className="space-y-2.5 max-w-6xl mx-auto animate-fade-in w-full min-w-0 pb-1.5">
      {/* Top Banner */}
      <div className="bg-slate-900/95 border border-rose-500/40 rounded-xl p-2.5 sm:p-3 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-rose-500/20 border border-rose-500/50 rounded-lg text-rose-400 font-black shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-100">
              無塵室緊急應變與廣播手冊
            </h2>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">
              標準英文通報與廣播原稿，點擊「拆解」即可檢視逐字讀音與慢讀。
            </p>
          </div>
        </div>
      </div>

      {/* Collapsible 3-Day Emergency Error Code Drills */}
      {autoDrills && autoDrills.length > 0 && (
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm">
          <button
            type="button"
            aria-expanded={showAutoDrills}
            onClick={() => {
              playClickSound();
              setShowAutoDrills((prev) => !prev);
            }}
            className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs sm:text-sm font-black text-slate-100 tabular-nums">
                機台警報代碼實戰句（{autoDrills.length} 句輪替）
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showAutoDrills ? 'rotate-180' : ''}`} />
          </button>

          {showAutoDrills && (
            <div className="px-3 pb-3 pt-1 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {autoDrills.map((drill, idx) => {
                const zhRaw = convertPhoneticToZhuyin(drill.phonetic);
                const zhClean = zhRaw.trim().replace(/^【\s*|\s*】$/g, '').trim();
                const mandarinRaw = getMandarinPhoneticFromSentence(drill.sentence, drill.phonetic);
                const mandarinClean = mandarinRaw.trim().replace(/^【\s*|\s*】$/g, '').trim();
                const drillKey = `drill-wbw-${idx}`;
                const isDrillExpanded = Boolean(expandedWordByWordKeys[drillKey]);

                return (
                  <div
                    key={drill.code || idx}
                    className="bg-slate-950/95 border border-slate-800 rounded-xl p-3 space-y-2 hover:border-amber-400/50 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5 border-b border-slate-800/80 pb-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/80 font-mono text-xs font-black">
                          {drill.code}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              speakEnglish(drill.sentence, speechSpeed);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-cyan-400 hover:text-slate-950 text-cyan-300 transition-colors cursor-pointer border border-slate-700/80 text-[10px] font-bold flex items-center gap-1 whitespace-nowrap"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>朗讀</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              speakEnglish(drill.sentence, 0.7);
                            }}
                            className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold tabular-nums cursor-pointer whitespace-nowrap"
                            title="0.7x 慢速朗讀"
                          >
                            0.7x
                          </button>
                          <button
                            type="button"
                            aria-expanded={isDrillExpanded}
                            onClick={() => toggleWordByWord(drillKey)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border whitespace-nowrap ${
                              isDrillExpanded
                                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-slate-700/80'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>拆解 {isDrillExpanded ? '▴' : '▾'}</span>
                          </button>
                        </div>
                      </div>

                      {isDrillExpanded ? (
                        <div className="pt-1 space-y-1.5">
                          <InteractiveSentenceViewer
                            sentence={drill.sentence}
                            speechSpeed={speechSpeed}
                            compact={true}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => speakEnglish(drill.sentence, 0.7)}
                              className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold tabular-nums cursor-pointer"
                            >
                              0.7x 慢讀
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(`[${drill.code}] ${drill.sentence}\n${drill.translation}`, `drill-${idx}`)}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700 cursor-pointer flex items-center gap-1"
                            >
                              {copiedKey === `drill-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedKey === `drill-${idx}` ? '已複製' : '複製'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm font-black text-white font-mono leading-snug break-words">{drill.sentence}</p>
                      )}

                      <p className="text-xs text-amber-300 font-bold break-words">{drill.translation}</p>

                      <div className="bg-slate-900/90 rounded-lg border border-slate-800 p-2 space-y-1 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] font-mono font-bold shrink-0">注音</span>
                          <span className="text-amber-300 font-mono font-black tracking-wider break-words flex-1">
                            {zhClean ? `【 ${zhClean} 】` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80 min-w-0">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold shrink-0">諧音</span>
                          <span className="text-emerald-300 font-sans font-bold tracking-wider break-words flex-1">
                            {mandarinClean ? `【 ${mandarinClean} 】` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {drill.solutionZh && (
                      <p className="text-[11px] text-emerald-300 font-medium bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/50 mt-1 break-words">
                        <span className="font-bold text-emerald-400">💡 對策：</span>{drill.solutionZh}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Protocol Navigation Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 pt-0.5 text-xs no-scrollbar w-full">
        {FAB_EMERGENCY_PROTOCOLS.map((proto) => {
          const isSelected = proto.id === selectedProtocolId;
          const info = getProtocolPillLabel(proto);
          return (
            <button
              key={proto.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                playClickSound();
                if (broadcastTimerRef.current !== null) {
                  window.clearTimeout(broadcastTimerRef.current);
                  broadcastTimerRef.current = null;
                }
                cancelSpeech();
                setIsPlayingBroadcast(false);
                setSelectedProtocolId(proto.id);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                isSelected
                  ? 'bg-rose-500 text-slate-950 font-black shadow-md shadow-rose-500/30 ring-1 ring-rose-300'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
              }`}
            >
              <span className="text-sm">{info.icon}</span>
              <span>{info.zh}</span>
            </button>
          );
        })}
      </div>

      {/* Main Selected Protocol Details */}
      <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-3.5 sm:p-4 space-y-3.5 backdrop-blur-sm shadow-md">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <span className="text-[11px] font-mono font-bold text-rose-300">
              {currentProtocol.titleEn}
            </span>
            <h3 className="text-base font-black text-slate-100 mt-0.5">
              {currentProtocol.titleZh}
            </h3>
          </div>

          <span className="px-2 py-0.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-700 font-mono font-bold text-[10px] uppercase">
            {currentProtocol.urgency}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          {currentProtocol.summary}
        </p>

        {/* Public Broadcast Loudspeaker Box - 2 Primary Buttons */}
        <div className="bg-gradient-to-br from-rose-950/40 via-slate-950 to-slate-900 border border-rose-500/60 rounded-xl p-3.5 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-rose-300 font-black text-xs sm:text-sm">
              <Radio className={`w-4 h-4 shrink-0 ${isPlayingBroadcast ? 'text-amber-400' : 'text-rose-400'}`} />
              <span>全區緊急廣播原稿</span>
              {isPlayingBroadcast && (
                <span className="text-[10px] font-mono font-bold text-amber-300">· 廣播中</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePlayBroadcast(currentProtocol.broadcastScriptEn)}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 whitespace-nowrap"
              >
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                <span>{isPlayingBroadcast ? '停止廣播' : '廣播朗讀'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  if (broadcastTimerRef.current !== null) {
                    window.clearTimeout(broadcastTimerRef.current);
                    broadcastTimerRef.current = null;
                  }
                  setIsPlayingBroadcast(false);
                  speakEnglish(currentProtocol.broadcastScriptEn, 0.7);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold tabular-nums cursor-pointer whitespace-nowrap"
                title="0.7x 慢速試聽廣播"
              >
                0.7x
              </button>

              <button
                type="button"
                aria-expanded={Boolean(expandedWordByWordKeys['broadcast'])}
                onClick={() => toggleWordByWord('broadcast')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border whitespace-nowrap ${
                  expandedWordByWordKeys['broadcast']
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-slate-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>拆解 {expandedWordByWordKeys['broadcast'] ? '▴' : '▾'}</span>
              </button>
            </div>
          </div>

          {expandedWordByWordKeys['broadcast'] ? (
            <div className="pt-0.5 space-y-1.5">
              <InteractiveSentenceViewer
                sentence={currentProtocol.broadcastScriptEn}
                speechSpeed={speechSpeed}
                compact={true}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => speakEnglish(currentProtocol.broadcastScriptEn, 0.7)}
                  className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold tabular-nums cursor-pointer"
                >
                  0.7x 慢讀
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(currentProtocol.broadcastScriptEn, 'broadcast')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700 cursor-pointer flex items-center gap-1"
                >
                  {copiedKey === 'broadcast' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'broadcast' ? '已複製' : '複製原稿'}</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="font-mono text-xs sm:text-[13.5px] font-bold text-slate-100 leading-relaxed bg-slate-950/90 p-3 rounded-lg border border-slate-800 shadow-inner break-words">
              "{currentProtocol.broadcastScriptEn}"
            </p>
          )}

          <p className="text-xs text-rose-200/95 font-medium pl-1 break-words">
            <span className="font-bold text-rose-400">廣播中譯：</span>{currentProtocol.broadcastScriptZh}
          </p>

          {(() => {
            const bcHomophone = getMandarinPhoneticFromSentence(currentProtocol.broadcastScriptEn);
            const bcZhuyin = convertPhoneticToZhuyin(bcHomophone);
            return (
              <div className="bg-slate-950/90 border border-rose-500/30 rounded-lg p-2.5 space-y-1 text-[11px] font-mono">
                <div className="text-emerald-300 break-words">
                  <span className="text-rose-300 font-bold">廣播注音：</span>【 {bcZhuyin} 】
                </div>
                <div className="text-amber-300 break-words">
                  <span className="text-rose-300 font-bold">廣播諧音：</span>「{bcHomophone}」
                </div>
              </div>
            );
          })()}
        </div>

        {/* Collapsible SOP Steps */}
        <div className="border border-slate-800 rounded-xl bg-slate-950/40 overflow-hidden">
          <button
            type="button"
            aria-expanded={showSopSteps}
            onClick={() => {
              playClickSound();
              setShowSopSteps((prev) => !prev);
            }}
            className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-900/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-300 tabular-nums">
              <Zap className="w-3.5 h-3.5" />
              <span>三步驟黃金應變處置（{currentProtocol.sopSteps.length} 步）</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showSopSteps ? 'rotate-180' : ''}`} />
          </button>

          {showSopSteps && (
            <div className="p-3 pt-1 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {currentProtocol.sopSteps.map((step) => {
                const stepHomophone = getMandarinPhoneticFromSentence(step.actionEn);
                const zhStep = convertPhoneticToZhuyin(stepHomophone).trim().replace(/^【\s*|\s*】$/g, '').trim();
                const stepKey = `step-wbw-${currentProtocol.id}-${step.stepNumber}`;
                const isStepExpanded = Boolean(expandedWordByWordKeys[stepKey]);
                return (
                  <div
                    key={step.stepNumber}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono font-black text-[10px] tabular-nums">
                          STEP {step.stepNumber}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              speakEnglish(step.actionEn, speechSpeed);
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>朗讀</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              speakEnglish(step.actionEn, 0.7);
                            }}
                            className="px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold tabular-nums cursor-pointer whitespace-nowrap"
                            title="0.7x 慢讀步驟"
                          >
                            0.7x
                          </button>
                          <button
                            type="button"
                            aria-expanded={isStepExpanded}
                            onClick={() => toggleWordByWord(stepKey)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-all cursor-pointer border whitespace-nowrap ${
                              isStepExpanded
                                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                            }`}
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>拆解 {isStepExpanded ? '▴' : '▾'}</span>
                          </button>
                        </div>
                      </div>

                      {isStepExpanded ? (
                        <div className="pt-0.5 space-y-1">
                          <InteractiveSentenceViewer
                            sentence={step.actionEn}
                            speechSpeed={speechSpeed}
                            compact={true}
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => speakEnglish(step.actionEn, 0.7)}
                              className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold tabular-nums cursor-pointer"
                            >
                              0.7x 慢讀
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(step.actionEn, `step-${step.stepNumber}`)}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono cursor-pointer flex items-center gap-1"
                            >
                              {copiedKey === `step-${step.stepNumber}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>複製</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="font-mono font-bold text-xs text-slate-100 leading-snug break-words">
                          {step.actionEn}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-300 break-words">
                        {step.actionZh}
                      </p>
                      <div className="bg-slate-900/90 rounded-lg border border-slate-800 p-1.5 space-y-1 text-[10px]">
                        {step.phonetic && (
                          <div className="flex items-center gap-1.5">
                            <span className="px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono font-bold shrink-0">KK</span>
                            <span className="text-cyan-300 font-mono font-bold break-words">{step.phonetic}</span>
                          </div>
                        )}
                        {zhStep && (
                          <div className="flex items-center gap-1.5">
                            <span className="px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] font-mono font-bold shrink-0">注音</span>
                            <span className="text-amber-300 font-mono font-bold break-words">【 {zhStep} 】</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold shrink-0">諧音</span>
                          <span className="text-emerald-300 font-sans font-bold break-words">【 {stepHomophone} 】</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10.5px] text-amber-200 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 mt-1 break-words leading-snug">
                      📌 {step.cleanroomTip}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Collapsible Essential Vocabularies */}
        <div className="border border-slate-800 rounded-xl bg-slate-950/40 overflow-hidden">
          <button
            type="button"
            aria-expanded={showVocabBank}
            onClick={() => {
              playClickSound();
              setShowVocabBank((prev) => !prev);
            }}
            className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-900/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-cyan-300 tabular-nums">
              <BookOpen className="w-3.5 h-3.5" />
              <span>求救核心關鍵字庫（{currentProtocol.essentialVocab.length} 詞）</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showVocabBank ? 'rotate-180' : ''}`} />
          </button>

          {showVocabBank && (
            <div className="p-3 pt-1 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {currentProtocol.essentialVocab.map((vocab, i) => {
                const vocabHomophone = getMandarinPhoneticFromSentence(vocab.term);
                const vocabZhuyin = convertPhoneticToZhuyin(vocabHomophone);
                return (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-black text-amber-300 text-xs break-words">
                          {vocab.term}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              speakEnglish(vocab.term, 0.7);
                            }}
                            className="px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold tabular-nums cursor-pointer"
                            title="0.7x 慢速聽單字"
                          >
                            0.7x
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              speakEnglish(vocab.term, speechSpeed);
                            }}
                            className="p-1 rounded-md bg-slate-800 text-cyan-300 hover:bg-cyan-400 hover:text-slate-950 transition-colors cursor-pointer shrink-0"
                            title="聽單字發音"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-100 text-[11px] font-bold break-words">{vocab.meaning}</p>
                      <div className="bg-slate-900/90 rounded border border-slate-800/80 px-1.5 py-1 space-y-0.5 text-[10px] font-mono">
                        {vocab.phonetic && (
                          <div className="text-cyan-300 break-words">KK：{vocab.phonetic}</div>
                        )}
                        <div className="text-emerald-300 break-words">注音：{vocabZhuyin}</div>
                        <div className="text-amber-300 break-words">諧音：{vocabHomophone}</div>
                      </div>
                    </div>
                    <div className="pt-1 border-t border-slate-900 flex items-center justify-between gap-1">
                      <p className="text-slate-400 font-mono text-[10.5px] italic break-words leading-snug flex-1">
                        "{vocab.example}"
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          speakEnglish(vocab.example, 0.7);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 text-[9px] font-mono tabular-nums shrink-0 cursor-pointer whitespace-nowrap"
                        title="0.7x 慢速聽例句"
                      >
                        0.7x 例句
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
