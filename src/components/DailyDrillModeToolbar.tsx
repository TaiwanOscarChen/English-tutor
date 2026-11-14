import React from 'react';
import { Play, Pause, Repeat, Headphones, Sparkles, Filter, CheckCircle2, RotateCcw, Volume2, ShieldAlert, Cpu, Gauge, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { playClickSound, playLaserScanSound } from '../utils/audioEffects';

export type DrillMode = 'standard' | 'cruise' | 'blind';

export interface CategoryFilterItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface DailyDrillModeToolbarProps {
  drillMode: DrillMode;
  setDrillMode: (mode: DrillMode) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  categories: CategoryFilterItem[];
  // Cruise mode controls
  isAutoPilot: boolean;
  onToggleAutoPilot: () => void;
  autoPilotCountdown: number;
  autoPilotMode: 'english' | 'bilingual' | 'svo';
  setAutoPilotMode: (mode: 'english' | 'bilingual' | 'svo') => void;
  autoPilotInterval: number;
  setAutoPilotInterval: (sec: number) => void;
  speechSpeed: number;
  setSpeechSpeed: (speed: number) => void;
  // Blind mode controls
  isBlindRevealed: boolean;
  setIsBlindRevealed: (revealed: boolean) => void;
  onBlindReplayAudio: () => void;
  // Progress stats
  completedCount: number;
  totalCount: number;
}

export const DailyDrillModeToolbar: React.FC<DailyDrillModeToolbarProps> = ({
  drillMode,
  setDrillMode,
  selectedCategory,
  setSelectedCategory,
  categories,
  isAutoPilot,
  onToggleAutoPilot,
  autoPilotCountdown,
  autoPilotMode,
  setAutoPilotMode,
  autoPilotInterval,
  setAutoPilotInterval,
  speechSpeed,
  setSpeechSpeed,
  isBlindRevealed,
  setIsBlindRevealed,
  onBlindReplayAudio,
  completedCount,
  totalCount
}) => {
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-2.5 w-full">
      {/* Mode Switcher Bar */}
      <div className="bg-slate-900/95 border-2 border-slate-700/80 rounded-2xl p-2 sm:p-2.5 shadow-xl backdrop-blur-md litho-laser-line relative overflow-hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        
        {/* Left: 3 Core Practice Modes */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/90 rounded-xl border border-slate-700/80 shrink-0">
          <button
            onClick={() => {
              playClickSound();
              if (isAutoPilot) onToggleAutoPilot();
              setDrillMode('standard');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer select-none ${
              drillMode === 'standard'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 font-black ring-1 ring-amber-300'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${drillMode === 'standard' ? 'text-slate-950 stroke-[2.5]' : 'text-amber-400'}`} />
            <span>標準 SVO 教具</span>
          </button>

          <button
            onClick={() => {
              playLaserScanSound();
              setDrillMode('cruise');
              if (!isAutoPilot) {
                onToggleAutoPilot();
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer select-none ${
              drillMode === 'cruise'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 font-black ring-1 ring-emerald-300'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Repeat className={`w-3.5 h-3.5 ${drillMode === 'cruise' ? 'text-slate-950 stroke-[2.5]' : 'text-emerald-400'}`} />
            <span>自動巡航朗讀</span>
            {isAutoPilot && (
              <span className="w-2 h-2 rounded-full bg-emerald-950 animate-ping shrink-0" />
            )}
          </button>

          <button
            onClick={() => {
              playClickSound();
              if (isAutoPilot) onToggleAutoPilot();
              setDrillMode('blind');
              setIsBlindRevealed(false);
              onBlindReplayAudio();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer select-none ${
              drillMode === 'blind'
                ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 font-black ring-1 ring-cyan-300'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Headphones className={`w-3.5 h-3.5 ${drillMode === 'blind' ? 'text-slate-950 stroke-[2.5]' : 'text-cyan-400'}`} />
            <span>聽力盲測挑戰</span>
          </button>
        </div>

        {/* Right: Progress Indicator and Quick Status */}
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <div className="flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs font-mono">
            <span className="text-slate-300 text-[11px] font-bold">今日進度</span>
            <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden shrink-0 border border-slate-700/60">
              <div
                className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="font-black text-amber-300">{completedCount}/{totalCount} ({completionPercent}%)</span>
          </div>
        </div>
      </div>

      {/* Mode-Specific Sub-Panels */}
      {/* 1. Cruise Mode Controller */}
      {drillMode === 'cruise' && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 sm:p-3.5 shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                playClickSound();
                onToggleAutoPilot();
              }}
              className={`px-3.5 py-2 rounded-xl font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all ${
                isAutoPilot
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
              }`}
            >
              {isAutoPilot ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>暫停巡航</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>開始自動巡航</span>
                </>
              )}
            </button>

            {isAutoPilot && (
              <div className="flex items-center gap-1.5 text-emerald-300 font-mono font-bold bg-emerald-900/60 px-2.5 py-1.5 rounded-lg border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>下句倒數: {autoPilotCountdown}s</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Cruise Mode Type */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 px-1.5 font-bold">模式:</span>
              {[
                { id: 'english', label: '純英文' },
                { id: 'bilingual', label: '英+中情境' },
                { id: 'svo', label: 'SVO 拆解' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    playClickSound();
                    setAutoPilotMode(m.id as any);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    autoPilotMode === m.id
                      ? 'bg-emerald-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Interval Setting */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 px-1.5 font-bold">間隔:</span>
              {[3, 5, 8].map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    playClickSound();
                    setAutoPilotInterval(sec);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    autoPilotInterval === sec
                      ? 'bg-emerald-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            {/* Speed Control */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 px-1.5 font-bold">語速:</span>
              {[
                { val: 0.75, label: '0.75x' },
                { val: 0.85, label: '0.85x' },
                { val: 1.0, label: '1.0x' }
              ].map((s) => (
                <button
                  key={s.val}
                  onClick={() => {
                    playClickSound();
                    setSpeechSpeed(s.val);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    speechSpeed === s.val
                      ? 'bg-emerald-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. Blind Listening Controller */}
      {drillMode === 'blind' && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cyan-950/40 border border-cyan-500/30 rounded-2xl p-3 sm:p-3.5 shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-cyan-400 text-slate-950 rounded-lg font-bold">
              <Headphones className="w-4 h-4" />
            </span>
            <div>
              <div className="font-bold text-cyan-200">無塵室實戰聽力盲測模式</div>
              <div className="text-[11px] text-slate-400">戴上耳機專注聽音辨義，先猜意思再揭曉句子與 SVO 結構</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playClickSound();
                onBlindReplayAudio();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Volume2 className="w-4 h-4" />
              <span>重播英文發音</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setIsBlindRevealed(!isBlindRevealed);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-md ${
                isBlindRevealed
                  ? 'bg-slate-800 text-slate-300 border border-slate-700'
                  : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-cyan-500/25'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isBlindRevealed ? '隱藏結構 (重新盲測)' : '揭曉英文與 SVO'}</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Category Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
        <span className="text-slate-500 font-mono text-[11px] font-bold shrink-0 flex items-center gap-1 pl-1">
          <Filter className="w-3 h-3 text-slate-400" />
          <span>分類情境:</span>
        </span>
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => {
                playClickSound();
                setSelectedCategory(cat.id);
              }}
              className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer select-none ${
                isSelected
                  ? 'bg-slate-100 text-slate-950 shadow font-black scale-105'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {Icon && <Icon className={`w-3 h-3 ${isSelected ? 'text-slate-950' : 'text-slate-400'}`} />}
              <span>{cat.label}</span>
              {cat.count !== undefined && (
                <span className={`text-[10px] font-mono px-1 rounded ${
                  isSelected ? 'bg-slate-950/15 text-slate-950 font-bold' : 'bg-slate-950 text-slate-500'
                }`}>
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
