import React, { useState, useRef, useEffect } from 'react';
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
  Upload,
  Menu,
  X,
  ShieldAlert,
  Layers,
  Zap,
  WifiOff,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playClickSound } from '../utils/audioEffects';
import { FseLogo } from './FseLogo';

interface HeaderProps {
  activeTab: 'daily' | 'shadowing' | 'drive' | 'vendors' | 'knowledge';
  setActiveTab: (tab: any, subTab?: string) => void;
  bookmarkCount: number;
  importedCount?: number;
  badgeImportedCount?: number;
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
  badgeImportedCount = 0,
  onOpenSystemHealth,
  onOpenVoiceSettings,
  isOffline = false,
  onOpenOfflineModal,
  onOpenSearchModal,
  onOpenEmergencyModal,
  onOpenScenarioModal,
  onOpenCheatSheet,
  onOpenKeyboardShortcuts,
  onOpenDecomposerModal,
  onOpenMediaImportModal
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHamburgerOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsHamburgerOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsHamburgerOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isHamburgerOpen]);

  type UtilityItem = {
    id: string;
    label: string;
    desc: string;
    icon: React.FC<any>;
    accent: string;
    badge?: string;
    highlight?: boolean;
    onClick: () => void;
  };

  type UtilityGroup = {
    groupTitle: string;
    items: UtilityItem[];
  };

  const utilityGroups: UtilityGroup[] = [
    {
      groupTitle: '學習與教材工具',
      items: [
        onOpenMediaImportModal && {
          id: 'import',
          label: '導入教材與單音',
          desc: importedCount > 0 ? `已收錄 ${importedCount} 單音 · 支援照片/文字` : '照片 / 檔案一鍵轉單音與 KK',
          icon: Upload,
          accent: 'text-cyan-400',
          badge: importedCount > 0 ? String(importedCount) : undefined,
          onClick: () => onOpenMediaImportModal(),
        },
        onOpenDecomposerModal && {
          id: 'decomposer',
          label: 'AI 萬能拆句器',
          desc: '工程英文即時拆 S+V+O 與諧音',
          icon: Wand2,
          accent: 'text-amber-400',
          onClick: () => onOpenDecomposerModal(),
        },
        {
          id: 'ai-tutor',
          label: 'AI 晶圓對話教練',
          desc: '即時串流問答、Error Code 解析與句型拆解',
          icon: Bot,
          accent: 'text-emerald-400',
          onClick: () => setActiveTab('knowledge', 'tutor'),
        },
        {
          id: 'bookmarks',
          label: '我的晶圓收藏',
          desc: bookmarkCount > 0 ? `${bookmarkCount} 句已收藏 · 支援連播` : '集中複習重點實戰句型',
          icon: Bookmark,
          accent: 'text-amber-400',
          badge: bookmarkCount > 0 ? String(bookmarkCount) : undefined,
          onClick: () => setActiveTab('knowledge', 'bookmarks'),
        },
        onOpenCheatSheet && {
          id: 'cheatsheet',
          label: '交接小抄卡',
          desc: '高頻口報與交接關鍵字速查',
          icon: FileText,
          accent: 'text-amber-300',
          onClick: () => onOpenCheatSheet(),
        },
      ].filter(Boolean) as UtilityItem[],
    },
    {
      groupTitle: '無塵室實戰與急救',
      items: [
        onOpenScenarioModal && {
          id: 'scenario',
          label: '情境對話闖關',
          desc: '交接、良率會議與夜間異常模擬',
          icon: Zap,
          accent: 'text-emerald-400',
          onClick: () => onOpenScenarioModal(),
        },
        onOpenEmergencyModal && {
          id: 'emergency',
          label: '急難求救廣播 SOS',
          desc: '氣體洩漏、化學噴濺與工安通報',
          icon: ShieldAlert,
          accent: 'text-rose-400',
          onClick: () => onOpenEmergencyModal(),
        },
        onOpenOfflineModal && {
          id: 'offline',
          label: isOffline ? '離線字卡（目前離線）' : '無塵室離線字卡',
          desc: isOffline ? '偵測到無網路，立即切換離線練習' : '斷網即用高頻單字卡庫',
          icon: isOffline ? WifiOff : Layers,
          accent: isOffline ? 'text-amber-300' : 'text-cyan-300',
          highlight: isOffline,
          onClick: () => onOpenOfflineModal(),
        },
      ].filter(Boolean) as UtilityItem[],
    },
    {
      groupTitle: '語音與系統控制',
      items: [
        onOpenVoiceSettings && {
          id: 'voice',
          label: '語音聲線調音',
          desc: '英語聲線、語速與口音切換',
          icon: Volume2,
          accent: 'text-emerald-400',
          onClick: () => onOpenVoiceSettings(),
        },
        onOpenKeyboardShortcuts && {
          id: 'shortcuts',
          label: '鍵盤快捷鍵一覽',
          desc: '無鼠極速切換與播放控制',
          icon: Keyboard,
          accent: 'text-indigo-400',
          onClick: () => onOpenKeyboardShortcuts(),
        },
        onOpenSystemHealth && {
          id: 'system',
          label: '系統健康監控中心',
          desc: 'AI 連線、TTS 語音診斷與自癒',
          icon: Activity,
          accent: 'text-cyan-400',
          onClick: () => onOpenSystemHealth(),
        },
      ].filter(Boolean) as UtilityItem[],
    },
  ].filter((g) => g.items.length > 0);

  const menuBadgeCount = bookmarkCount + badgeImportedCount;

  const navTabs = [
    { id: 'daily', label: '每日特訓', icon: Sparkles },
    { id: 'shadowing', label: '口語跟讀', icon: Mic },
    { id: 'drive', label: '隨身聽', icon: Car },
    { id: 'vendors', label: '五大設備', icon: Cpu },
    { id: 'knowledge', label: '知識庫', icon: BookOpen },
  ] as const;

  return (
    <header
      className="bg-slate-950/90 backdrop-blur-xl text-white border-b border-slate-800/80 sticky top-0 z-50 shadow-lg shadow-black/25 w-full max-w-full litho-laser-line"
      ref={drawerRef}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-5 w-full min-w-0 relative">
        <div className="flex items-center justify-between h-13 sm:h-14 gap-2 sm:gap-3">
          {/* Brand Logo & Wordmark */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 shrink-0 min-w-0 cursor-pointer group select-none text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl py-1 pr-1"
            title="FSE Studio - 回到頂部"
          >
            <FseLogo
              size="md"
              glow={true}
              className="active:scale-95 transition-transform duration-200 shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold tracking-tight text-slate-100 text-xs sm:text-sm font-sans flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 font-black">
                  FSE Studio
                </span>
                <span className="text-slate-600 text-xs font-normal">/</span>
                <span className="text-cyan-300 font-bold">晶圓科技英文</span>
              </span>
            </div>
          </button>

          {/* Desktop Integrated Single-Row Navigation (Hidden on mobile where MobileBottomNav handles thumb navigation) */}
          <nav
            aria-label="主導覽列"
            className="hidden md:flex items-center gap-1 bg-slate-900/75 border border-slate-800/80 rounded-xl p-1 shrink-0"
          >
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`header-tab-${tab.id}`}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsHamburgerOpen(false);
                    setActiveTab(tab.id as any);
                  }}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer select-none shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    isActive
                      ? 'text-slate-950 font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-lg shadow-sm shadow-amber-500/25 z-0"
                      transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-slate-950 stroke-[2.4]' : 'text-slate-400 stroke-[2]'}`} />
                    <span className="tracking-tight">{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Bar: Search + Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenSearchModal && (
              <button
                type="button"
                aria-label="開啟全站指令快搜"
                onClick={() => {
                  playClickSound();
                  setIsHamburgerOpen(false);
                  onOpenSearchModal();
                }}
                className="min-h-[36px] px-3 sm:px-3.5 py-1.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-slate-200 hover:text-cyan-200 border border-slate-700/80 hover:border-cyan-400/60 shadow-sm hover:shadow-cyan-500/15 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                title="全站指令與術語快搜 (Ctrl+K / ⌘K)"
              >
                <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">快搜</span>
                <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-950 text-cyan-300/90 rounded border border-slate-700/90 leading-none">
                  ⌘K
                </kbd>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsHamburgerOpen((prev) => !prev);
              }}
              aria-expanded={isHamburgerOpen}
              aria-haspopup="menu"
              aria-label="開啟功能選單"
              className={`min-h-[36px] px-3 sm:px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 relative ${
                isHamburgerOpen
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/95 hover:bg-slate-800 text-slate-100 border-slate-700/80 hover:border-amber-400/60 shadow-sm'
              }`}
            >
              {isHamburgerOpen ? (
                <X className="w-4 h-4 shrink-0" />
              ) : (
                <Menu className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>選單</span>
              {isOffline && !isHamburgerOpen && (
                <WifiOff
                  className="w-3.5 h-3.5 text-rose-400 shrink-0"
                  aria-label="目前為離線狀態"
                />
              )}
              {menuBadgeCount > 0 && !isHamburgerOpen && (
                <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-mono font-black leading-none tabular-nums">
                  {menuBadgeCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hamburger Slide-Down Utility Drawer */}
        <AnimatePresence>
          {isHamburgerOpen && (
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="absolute right-3 sm:right-5 top-14 w-[calc(100vw-24px)] sm:w-84 bg-slate-950/98 backdrop-blur-2xl border border-slate-700/85 rounded-2xl shadow-2xl shadow-black/80 p-3 z-50"
            >
              <div className="px-2 py-1.5 mb-2 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-300 font-bold">快捷功能選單</span>
                <span className={`font-semibold px-2 py-0.5 rounded-md border ${
                  isOffline
                    ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                    : 'text-cyan-300 bg-cyan-500/10 border-cyan-500/25'
                }`}>
                  {isOffline ? '離線支援中' : 'FSE 工具箱'}
                </span>
              </div>
              <div className="space-y-3 max-h-[72vh] overflow-y-auto pr-0.5">
                {utilityGroups.map((group) => (
                  <div key={group.groupTitle} className="space-y-1">
                    <div className="px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      {group.groupTitle}
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            role="menuitem"
                            type="button"
                            onClick={() => {
                              playClickSound();
                              setIsHamburgerOpen(false);
                              item.onClick();
                            }}
                            className={`w-full px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-left transition-all cursor-pointer group ${
                              item.highlight
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-400/50'
                                : 'bg-slate-900/75 hover:bg-slate-800/95 border-slate-800/70 hover:border-cyan-500/45'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0 group-hover:border-slate-700">
                                <Icon className={`w-4 h-4 ${item.accent}`} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-100 group-hover:text-white flex items-center gap-1.5">
                                  <span className="truncate">{item.label}</span>
                                  {item.badge && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-mono font-black leading-none tabular-nums shrink-0">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate mt-0.5">{item.desc}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
