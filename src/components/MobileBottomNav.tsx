import React from 'react';
import {
  Sparkles,
  BookOpen,
  Cpu,
  Mic,
  Car
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
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab
}) => {
  const tabs = [
    { id: 'daily', label: '特訓', icon: Sparkles },
    { id: 'shadowing', label: 'AI跟讀', icon: Mic },
    { id: 'drive', label: '隨身聽', icon: Car },
    { id: 'vendors', label: '機台實裝', icon: Cpu },
    { id: 'knowledge', label: '知識診斷', icon: BookOpen },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-auto">
      {/* Background glass container with top border and litho line */}
      <div className="bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 shadow-2xl pb-[env(safe-area-inset-bottom,6px)] pt-1 px-2">
        <div className="flex items-center justify-around gap-1 max-w-md mx-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  playClickSound();
                  setActiveTab(tab.id as any);
                }}
                className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all cursor-pointer flex-1 min-w-0 select-none ${
                  isActive
                    ? 'text-amber-300 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={{ minHeight: '52px' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTabIndicator"
                    className="absolute inset-0 bg-amber-400/15 rounded-2xl border border-amber-400/30 z-0"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}

                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <div className={`p-1.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 scale-105'
                      : 'bg-slate-900/70 border border-slate-800/80 text-slate-400'
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  </div>
                  <span className={`text-[10px] tracking-tight leading-tight ${
                    isActive ? 'font-black text-amber-300' : 'font-bold text-slate-400'
                  }`}>
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
