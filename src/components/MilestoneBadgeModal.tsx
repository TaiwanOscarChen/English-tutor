import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MilestoneBadge } from '../types';
import { Award, Sparkles, CheckCircle2, ShieldCheck, Zap, Download, X, Flame } from 'lucide-react';

interface MilestoneBadgeModalProps {
  badge: MilestoneBadge | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MilestoneBadgeModal: React.FC<MilestoneBadgeModalProps> = ({
  badge,
  isOpen,
  onClose
}) => {
  if (!isOpen || !badge) return null;

  const handleExportBadgeCard = () => {
    const text = `======================================\n` +
      `   FSE 科技英文 ✕ 晶圓維修成就榮譽徽章卡\n` +
      `======================================\n` +
      `獲得稱號：【 ${badge.title} 】\n` +
      `解鎖類別：${badge.category}\n` +
      `獲得日期：${badge.unlockedAt || new Date().toISOString().slice(0, 10)}\n\n` +
      `成就說明：\n${badge.description}\n\n` +
      `天賦加成與能力屬性：\n` +
      badge.bonusAttributes.map(a => ` • ${a}`).join('\n') + `\n\n` +
      `======================================\n` +
      `      Issued by FSE Tech English App\n` +
      `======================================`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FSE_Achievement_Badge_${badge.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-slate-900 border-2 border-amber-400/80 rounded-3xl p-6 text-center space-y-5 shadow-[0_0_50px_rgba(250,204,21,0.25)] overflow-hidden litho-scanner-overlay litho-laser-line shrink-strict"
        >
          {/* Top Decorative Wafer Light Aura */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-b from-amber-400/30 via-yellow-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Title */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/60 text-amber-300 font-mono text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>晶圓維修成就里程碑解鎖</span>
            </div>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight font-mono pt-1">
              {badge.title}
            </h2>
            <p className="text-xs text-amber-400/90 font-mono font-bold">
              [{badge.category}]
            </p>
          </div>

          {/* Badge Icon Shield Centerpiece */}
          <div className="relative my-4 flex items-center justify-center">
            {/* Animated Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute w-32 h-32 rounded-full border-2 border-dashed border-amber-400/50"
            />
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 p-0.5 shadow-xl shadow-amber-500/30 flex items-center justify-center relative group">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex flex-col items-center justify-center p-3 text-amber-400">
                <Award className="w-12 h-12 stroke-[1.8] text-amber-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] animate-bounce" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-left text-xs text-slate-300 space-y-1">
            <span className="text-amber-400 font-bold block font-mono">能力勳章記述：</span>
            <p className="leading-relaxed font-medium">
              {badge.description}
            </p>
          </div>

          {/* Bonus Attributes list */}
          <div className="space-y-1 text-left">
            <span className="text-[11px] font-mono font-extrabold text-cyan-400 uppercase tracking-wider block">
              ⚡ 實戰戰力天賦加成 (Bonus Stats)
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {badge.bonusAttributes.map((attr, idx) => (
                <div key={idx} className="bg-cyan-950/40 border border-cyan-800/50 rounded-xl px-3 py-1.5 text-xs text-cyan-200 font-mono font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{attr}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={handleExportBadgeCard}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>匯出成就卡 (.txt)</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95"
            >
              <Flame className="w-3.5 h-3.5 fill-slate-950" />
              <span>收下徽章，繼續特訓</span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
