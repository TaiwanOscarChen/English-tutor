import React from 'react';
import {
  Sparkles,
  BookOpen,
  Mic,
  Cpu,
  Search,
  Volume2,
  FileText,
  Activity,
  Keyboard,
  Bookmark,
  Wand2,
  Car,
  Upload
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  playClickSound
} from '../utils/audioEffects';

import { FseLogo } from './FseLogo';

interface HeaderProps {
  activeTab: 'daily' | 'shadowing' | 'drive' | 'vendors' | 'knowledge';
  setActiveTab: (tab: any, subTab?: string) => void;
  bookmarkCount: number;
  importedCount?: number;
  onOpenSystemHealth?: () => void;
  onOpenVoiceSettings?: () => void;
  isOffline?: boolean;
  onOpenOfflineModal?: () => void;
  onOpenSearchModal?: () => void;
  onOpenEmergencyModal?: () => void;
  onOpenScenarioModal?: () => void;
  onOpenCheatSheet?: () => void;
  onOpenKeyboardShortcuts?: () => void;
  onOpenDecomposerModal?: () => void;
  onOpenMediaImportModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  bookmarkCount,
  importedCount = 0,
  onOpenSystemHealth,
  onOpenVoiceSettings,
  onOpenSearchModal,
  onOpenCheatSheet,
  onOpenKeyboardShortcuts,
  onOpenDecomposerModal,
  onOpenMediaImportModal
}) => {

  return (
    <header className="bg-slate-950/95 backdrop-blur-xl text-white border-b border-slate-800/90 sticky top-0 z-50 shadow-xl w-full max-w-full overflow-hidden litho-laser-line">
      <div className="max-w-6xl mx-auto px-2.5 sm:px-4 w-full min-w-0">
        <div className="flex items-center justify-between py-1 sm:py-1.5 gap-2.5 flex-wrap sm:flex-nowrap">
          
          {/* Brand Logo & Title with High-Tech Wafer Die Icon */}
          <div 
            onClick={() => {
              playClickSound();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0 cursor-pointer group select-none"
            title="FSE Studio - 點擊回到頂部"
          >
            <div className="relative">
              <FseLogo size="md" glow={true} className="group-hover:rotate-6 group-hover:scale-105 active:scale-95 transition-all duration-300" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-black tracking-tight text-slate-100 text-xs sm:text-sm font-mono flex items-center gap-1.5 truncate">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 font-extrabold group-hover:brightness-110 transition-all">
                    FSE Studio
                  </span>
                  <span className="text-slate-600 font-sans text-xs">✕</span>
                  <span className="text-cyan-400 font-sans font-bold">晶圓科技英文</span>
                </h1>
              </div>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:block tracking-wide">
                無塵室實戰 · 國小拆解
              </span>
            </div>
          </div>

          {/* Right Quick Console Utility Bar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenMediaImportModal && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenMediaImportModal();
                }}
                className="px-2.5 py-1.2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 hover:text-white border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="導入照片或檔案單音"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">導入</span>
                {importedCount > 0 && (
                  <span className="px-1.5 py-0.1 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-mono font-black">
                    {importedCount}
                  </span>
                )}
              </button>
            )}

            {onOpenSearchModal && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenSearchModal();
                }}
                className="px-2.5 py-1.2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="快搜 (Ctrl + K)"
              >
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">快搜</span>
                <kbd className="hidden lg:inline-block px-1 py-0.2 text-[9px] font-mono bg-slate-950 text-slate-400 rounded border border-slate-800">
                  ⌘K
                </kbd>
              </button>
            )}

            {onOpenDecomposerModal && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenDecomposerModal();
                }}
                className="px-2.5 py-1.2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="AI 拆句"
              >
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">拆句</span>
              </button>
            )}

            <button
              onClick={() => {
                playClickSound();
                setActiveTab('knowledge', 'bookmarks');
              }}
              className="px-2.5 py-1.2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="收藏庫"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">收藏</span>
              {bookmarkCount > 0 && (
                <span className="px-1.5 py-0.1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-mono font-black">
                  {bookmarkCount}
                </span>
              )}
            </button>

            {onOpenCheatSheet && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenCheatSheet();
                }}
                className="px-2.5 py-1.2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="交接小抄"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">小抄</span>
              </button>
            )}

            {onOpenVoiceSettings && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenVoiceSettings();
                }}
                className="px-2 py-1.2 sm:px-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="語音設定"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">語音</span>
              </button>
            )}

            {onOpenKeyboardShortcuts && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenKeyboardShortcuts();
                }}
                className="hidden sm:flex px-2 py-1.2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 text-xs font-mono font-bold items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                title="快捷鍵"
              >
                <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden xl:inline">熱鍵</span>
              </button>
            )}

            {onOpenSystemHealth && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenSystemHealth();
                }}
                className="px-2 py-1.2 sm:px-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="系統中心"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">系統</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-800/70 pt-0.5 pb-0.5 sm:pt-1 sm:pb-1 text-xs max-w-full relative">
          {[
            { id: 'daily', label: '每日特訓', icon: Sparkles, badge: null },
            { id: 'shadowing', label: '口語跟讀', icon: Mic, badge: 'PRO' },
            { id: 'drive', label: '隨身聽', icon: Car, badge: 'AUDIO' },
            { id: 'vendors', label: '四大機台', icon: Cpu, badge: 'NEW' },
            { id: 'knowledge', label: '知識庫', icon: BookOpen, badge: null },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`header-tab-${tab.id}`}
                onClick={() => {
                  playClickSound();
                  setActiveTab(tab.id as any);
                }}
                className={`relative px-3 py-1.2 sm:px-3.5 sm:py-1.2 rounded-xl font-black whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer select-none group shrink-0 ${
                  isActive
                    ? 'text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/90 border border-transparent hover:border-slate-800'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 rounded-xl shadow-lg shadow-amber-500/25 z-0 ring-1 ring-amber-300/60"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-slate-950/15 text-slate-950'
                      : 'bg-slate-900/80 border border-slate-800/80 text-slate-400 group-hover:text-amber-300 group-hover:border-amber-400/30'
                  }`}>
                    <Icon className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${isActive ? 'text-slate-950 stroke-[2.4]' : 'stroke-[2]'}`} />
                  </span>
                  <span className="tracking-tight">{tab.label}</span>
                  {tab.badge && (
                    <span className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded ${
                      isActive 
                        ? 'bg-slate-950 text-amber-300' 
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};




