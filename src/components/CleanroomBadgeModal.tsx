import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Award, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CleanroomBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakCount: number;
}

interface BadgeItem {
  id: string;
  minStreak: number;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  perk: string;
}

export const BADGES: BadgeItem[] = [
  {
    id: 'b1',
    minStreak: 1,
    title: '無塵室菜鳥實習生',
    subtitle: 'Apprentice FSE',
    icon: '🐣',
    color: 'from-blue-600 to-cyan-500',
    perk: '解鎖每日基本語序拆解卡片'
  },
  {
    id: 'b2',
    minStreak: 3,
    title: '獨當一面台味技師',
    subtitle: 'Junior FSE',
    icon: '🛠️',
    color: 'from-emerald-600 to-teal-400',
    perk: '解鎖台味諧音金句快查對話框'
  },
  {
    id: 'b3',
    minStreak: 5,
    title: '無塵室資深帶線工程師',
    subtitle: 'Senior FSE',
    icon: '⚡',
    color: 'from-amber-500 to-yellow-400',
    perk: '解鎖 1-on-1 AI 晶圓英文教練無限問答'
  },
  {
    id: 'b4',
    minStreak: 7,
    title: '晶圓廠神級學長',
    subtitle: 'Principal FSE',
    icon: '👑',
    color: 'from-purple-600 to-pink-500',
    perk: '解鎖 AI 自訂無塵室極速故障情境生成'
  },
  {
    id: 'b5',
    minStreak: 10,
    title: '半導體無塵室傳奇大師',
    subtitle: 'FSE Legend Master',
    icon: '🏆',
    color: 'from-yellow-400 via-orange-500 to-red-500',
    perk: '榮登晶圓廠殿堂級口說傳奇勳章'
  }
];

export const CleanroomBadgeModal: React.FC<CleanroomBadgeModalProps> = ({
  isOpen,
  onClose,
  streakCount
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentBadge = BADGES.slice().reverse().find((b) => streakCount >= b.minStreak) || BADGES[0];

  const handleTriggerConfetti = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 }
      });
    } catch (e) {
      console.warn("Confetti error:", e);
    }
  };

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="無塵室工程師階級勳章成就館"
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-slate-100 litho-scanner-overlay litho-laser-line relative shrink-strict"
        >
          {/* Header */}
          <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-400 rounded-xl text-slate-950 font-black shadow-sm shrink-0">
                <Award className="w-4 h-4 text-slate-950" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  無塵室工程師階級勳章成就館
                </h3>
                <p className="text-[10px] text-slate-400 font-medium tabular-nums">
                  目前累積連續學習：{streakCount} 天 🔥
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="關閉成就館"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              title="關閉視窗 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Rank Showcase */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 text-center space-y-2 shrink-0">
            <div className="inline-flex p-3 rounded-2xl bg-slate-900 border border-amber-400/80 shadow-md relative group">
              <span className="text-4xl">{currentBadge.icon}</span>
              <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                CURRENT
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                YOUR CURRENT CLEANROOM RANK
              </div>
              <h4 className="text-lg font-black text-white tracking-tight">
                {currentBadge.title} ({currentBadge.subtitle})
              </h4>
              <p className="text-xs text-slate-400 font-medium">
                解鎖特權：{currentBadge.perk}
              </p>
            </div>

            <button
              type="button"
              onClick={handleTriggerConfetti}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs inline-flex items-center gap-1 cursor-pointer shadow-sm transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>點擊釋放慶祝煙火</span>
            </button>
          </div>

          {/* Badge Milestones List */}
          <div className="p-4 overflow-y-auto space-y-2 flex-1">
            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
              階級晉升門檻一覽
            </h5>

            {BADGES.map((badge) => {
              const isUnlocked = streakCount >= badge.minStreak;
              return (
                <div
                  key={badge.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    isUnlocked
                      ? 'bg-slate-950/90 border-slate-800 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="text-2xl p-1.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                      {badge.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">{badge.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({badge.subtitle})</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {badge.perk}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {isUnlocked ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] font-black inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>已解鎖</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-[11px] font-bold inline-flex items-center gap-1 tabular-nums">
                        <Lock className="w-3 h-3" />
                        <span>需 {badge.minStreak} 天</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              關閉視窗
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
