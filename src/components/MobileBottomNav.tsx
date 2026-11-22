import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Cpu,
  Mic,
  Car,
  Volume2,
  Sliders,
  Search,
  ChevronUp,
  ChevronDown,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { playClickSound } from '../utils/audioEffects';

interface MobileBottomNavProps {
  activeTab: 'daily' | 'shadowing' | 'drive' | 'vendors' | 'knowledge';
  setActiveTab: (tab: any, subTab?: string) => void;
  bookmarkCount: number;
  onOpenCheatSheet?: () => void;
  onOpenVoiceSettings?: () => void;
  onOpenSearchModal?: () => void;
  onOpenSpeechPractice?: () => void;
  onQuickReplaySentence?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenCheatSheet,
  onOpenVoiceSettings,
  onOpenSearchModal,
  onOpenSpeechPractice,
  onQuickReplaySentence
}) => {
  const [oneHandDockOpen, setOneHandDockOpen] = useState(false);

  const tabs = [
    { id: 'daily', label: '特訓', icon: Sparkles },
    { id: 'shadowing', label: '跟讀', icon: Mic },
    { id: 'drive', label: '隨身聽', icon: Car },
    { id: 'vendors', label: '設備', icon: Cpu },
    { id: 'knowledge', label: '知識庫', icon: BookOpen },
  ];

  return (
    <nav
      aria-label="行動端分頁列與單手快捷操作"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-auto"
    >
      {/* Expandable One-Handed Quick Action Strip */}
      {oneHandDockOpen && (
        <div className="bg-slate-950/95 backdrop-blur-2xl border-t border-amber-400/35 px-2.5 py-2 shadow-2xl">
          <div className="max-w-md mx-auto grid grid-cols-4 gap-1.5">
            {onQuickReplaySentence && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onQuickReplaySentence();
                }}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-amber-400/15 active:bg-amber-400/30 border border-amber-400/40 text-amber-200 text-[10px] font-black cursor-pointer touch-manipulation"
              >
                <Volume2 className="w-4 h-4 text-amber-300" />
                <span>重聽本句</span>
              </button>
            )}
            {onOpenSpeechPractice && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setOneHandDockOpen(false);
                  onOpenSpeechPractice();
                }}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-cyan-500/15 active:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[10px] font-black cursor-pointer touch-manipulation"
              >
                <Mic className="w-4 h-4 text-cyan-300" />
                <span>口說實測</span>
              </button>
            )}
            {onOpenVoiceSettings && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setOneHandDockOpen(false);
                  onOpenVoiceSettings();
                }}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-slate-900 active:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold cursor-pointer touch-manipulation"
              >
                <Sliders className="w-4 h-4 text-emerald-300" />
                <span>語速降噪</span>
              </button>
            )}
            {(onOpenSearchModal || onOpenCheatSheet) && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setOneHandDockOpen(false);
                  if (onOpenSearchModal) onOpenSearchModal();
                  else if (onOpenCheatSheet) onOpenCheatSheet();
                }}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-slate-900 active:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold cursor-pointer touch-manipulation"
              >
                <Search className="w-4 h-4 text-indigo-300" />
                <span>快搜速查</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 shadow-2xl pb-[env(safe-area-inset-bottom,4px)] pt-1 px-1.5 relative">
        {/* Thumb-friendly One-Hand Quick Bar Toggle Pill */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setOneHandDockOpen((prev) => !prev);
          }}
          aria-expanded={oneHandDockOpen}
          aria-label={oneHandDockOpen ? '收合單手快捷列' : '展開單手快捷列'}
          className="absolute -top-6 right-3 px-2.5 py-0.5 rounded-t-xl bg-slate-950/95 border border-b-0 border-slate-700 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1 shadow-md cursor-pointer touch-manipulation"
        >
          <Zap className="w-2.5 h-2.5 text-amber-400" />
          <span>單手快捷</span>
          {oneHandDockOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        <div className="flex items-center justify-around gap-1 max-w-md mx-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                id={`mobile-tab-${tab.id}`}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  playClickSound();
                  setActiveTab(tab.id as any);
                }}
                className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors cursor-pointer flex-1 min-w-0 select-none min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  isActive
                    ? 'text-amber-300 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTabIndicator"
                    className="absolute inset-0 bg-amber-400/12 rounded-xl border border-amber-400/30 z-0"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}

                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <div
                    className={`p-1 rounded-lg transition-all ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/30'
                        : 'text-slate-400'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.9]'}`} />
                  </div>
                  <span
                    className={`text-[10px] tracking-tight leading-none whitespace-nowrap ${
                      isActive ? 'font-black text-amber-300' : 'font-semibold text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
