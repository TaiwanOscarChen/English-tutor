import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  CheckCircle2,
  ChevronDown,
  Sliders,
  Sparkles,
  Play,
  RotateCcw,
  VolumeX,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getCurrentVoiceSummary,
  getTopVoicePresets,
  getEnglishVoices,
  setPreferredVoiceURI,
  setPreferredAccentMode,
  restoreDefaultVoiceSettings,
  speakEnglish,
  cancelSpeech,
  VoicePresetOption
} from '../utils/speech';
import { playClickSound, playSuccessChime } from '../utils/audioEffects';

interface QuickVoiceSelectorProps {
  onOpenFullSettings?: () => void;
  className?: string;
}

export const QuickVoiceSelector: React.FC<QuickVoiceSelectorProps> = ({
  onOpenFullSettings,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [voiceSummary, setVoiceSummary] = useState(getCurrentVoiceSummary());
  const [presets, setPresets] = useState<VoicePresetOption[]>(getTopVoicePresets());
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>(getEnglishVoices());
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [showAllList, setShowAllList] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const refreshVoiceState = () => {
    setVoiceSummary(getCurrentVoiceSummary());
    setPresets(getTopVoicePresets());
    setAllVoices(getEnglishVoices());
  };

  useEffect(() => {
    refreshVoiceState();
    const handleVoiceChange = () => {
      refreshVoiceState();
    };
    window.addEventListener('fse-voice-changed', handleVoiceChange);
    return () => {
      window.removeEventListener('fse-voice-changed', handleVoiceChange);
    };
  }, []);

  // Handle outside click to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectPreset = (preset: VoicePresetOption) => {
    playClickSound();
    cancelSpeech();

    if (preset.category === 'tw_accent') {
      setPreferredAccentMode('tw_fab');
    } else {
      setPreferredAccentMode('us_standard');
      setPreferredVoiceURI(preset.voiceURI);
    }

    refreshVoiceState();
    playSuccessChime();

    // Give audio confirmation of the new voice
    speakEnglish(
      preset.category === 'tw_accent'
        ? "台灣晶圓廠在地口音已套用。FOUP check ready."
        : `Voice switched to ${preset.title.replace(/[^a-zA-Z\s]/g, '').trim() || 'selected voice'}.`,
      1.0,
      undefined,
      undefined,
      100,
      true
    );
  };

  const handlePreviewPreset = (e: React.MouseEvent, preset: VoicePresetOption) => {
    e.stopPropagation();
    playClickSound();
    cancelSpeech();
    setPreviewingId(preset.id);

    if (preset.category === 'tw_accent') {
      // Temporarily test in tw_accent
      const prevMode = voiceSummary.accentMode;
      setPreferredAccentMode('tw_fab');
      speakEnglish(
        preset.sampleText,
        0.95,
        () => {
          setPreviewingId(null);
          setPreferredAccentMode(prevMode);
        },
        undefined,
        100,
        true
      );
    } else {
      const prevMode = voiceSummary.accentMode;
      setPreferredAccentMode('us_standard');
      if (preset.voiceURI) setPreferredVoiceURI(preset.voiceURI);

      speakEnglish(
        preset.sampleText,
        0.95,
        () => {
          setPreviewingId(null);
          setPreferredAccentMode(prevMode);
        },
        undefined,
        100,
        true
      );
    }
  };

  const handleSelectRawVoice = (uri: string) => {
    playClickSound();
    cancelSpeech();
    setPreferredAccentMode('us_standard');
    setPreferredVoiceURI(uri);
    refreshVoiceState();
    playSuccessChime();
    speakEnglish("Custom voice calibrated.", 1.0);
  };

  const handleResetToDefault = () => {
    playClickSound();
    cancelSpeech();
    restoreDefaultVoiceSettings();
    refreshVoiceState();
    playSuccessChime();
    speakEnglish("Speech engine reset to system default.", 1.0);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="quick-voice-selector-btn"
        onClick={() => {
          playClickSound();
          setIsOpen(!isOpen);
          refreshVoiceState();
        }}
        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 touch-manipulation ${
          isOpen
            ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/30'
            : 'bg-slate-900/90 hover:bg-slate-850 border-slate-700/80 text-slate-200 hover:text-cyan-300 hover:border-cyan-500/50'
        }`}
        title="快速更換發音聲線（女聲 / 男聲 / 台灣口音）"
      >
        <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="max-w-[110px] sm:max-w-[140px] truncate font-medium">
          {voiceSummary.label}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-[310px] sm:w-[360px] bg-slate-900/98 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl p-3.5 text-slate-100 z-50 space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-100">發音聲線切換</h4>
                  <p className="text-[10px] text-slate-400">點擊即時試聽並自由更換朗讀聲音</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets List */}
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-0.5">
              {presets.map((preset) => {
                const isSelected = preset.isCurrent;
                const isPreviewing = previewingId === preset.id;

                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 text-left group ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-400/80 text-cyan-100 shadow-md ring-1 ring-cyan-400/30'
                        : 'bg-slate-950/60 border-slate-800/90 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs text-white">
                          {preset.title}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-400 text-slate-950 font-black">
                            使用中
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {preset.subtitle}
                      </p>
                    </div>

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => handlePreviewPreset(e, preset)}
                      className={`p-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                        isPreviewing
                          ? 'bg-amber-400 text-slate-950 border-amber-300 animate-pulse'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50'
                      }`}
                      title="試聽此聲線"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span className="hidden sm:inline">{isPreviewing ? '播放中' : '試聽'}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Collapsible: All System Voices */}
            <div className="border-t border-slate-800/80 pt-2">
              <button
                type="button"
                onClick={() => setShowAllList(!showAllList)}
                className="w-full py-1 text-[11px] text-slate-400 hover:text-cyan-300 flex items-center justify-between font-bold cursor-pointer"
              >
                <span>瀏覽系統所有安裝聲線 ({allVoices.length} 組)</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showAllList ? 'rotate-180' : ''}`} />
              </button>

              {showAllList && (
                <div className="mt-2 max-h-36 overflow-y-auto space-y-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px]">
                  {allVoices.map((v) => (
                    <button
                      key={v.voiceURI || v.name}
                      onClick={() => handleSelectRawVoice(v.voiceURI)}
                      className="w-full text-left p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-between gap-1 cursor-pointer truncate"
                    >
                      <span className="truncate">{v.name}</span>
                      <span className="text-[9px] text-slate-500 shrink-0 font-mono">{v.lang}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions Footer */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 font-bold cursor-pointer transition-colors"
                title="重設為系統標準預設聲音"
              >
                <RotateCcw className="w-3 h-3" />
                <span>預設原音</span>
              </button>

              {onOpenFullSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFullSettings();
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <Sliders className="w-3 h-3" />
                  <span>等化器與進階調校</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
