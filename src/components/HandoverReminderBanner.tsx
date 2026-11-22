import React from 'react';
import { ShiftSettings } from '../types';
import { AlertTriangle, Zap, ArrowRight, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HandoverReminderBannerProps {
  shiftSettings: ShiftSettings;
  onOpenShiftTab: () => void;
  onDismissAlert?: () => void;
}

export const HandoverReminderBanner: React.FC<HandoverReminderBannerProps> = ({
  shiftSettings,
  onOpenShiftTab
}) => {
  if (shiftSettings.shiftType === 'off' || !shiftSettings.enableReminder) return null;

  // Calculate if handover is within 60 minutes
  const [targetH, targetM] = shiftSettings.handoverTimeStr.split(':').map(Number);
  const current = new Date();
  const targetTimeToday = new Date(current);
  targetTimeToday.setHours(targetH || 18, targetM || 30, 0, 0);

  let diffSec = Math.floor((targetTimeToday.getTime() - current.getTime()) / 1000);
  if (diffSec < 0) {
    const targetTomorrow = new Date(current);
    targetTomorrow.setDate(targetTomorrow.getDate() + 1);
    targetTomorrow.setHours(targetH || 18, targetM || 30, 0, 0);
    diffSec = Math.floor((targetTomorrow.getTime() - current.getTime()) / 1000);
  }

  const minsLeft = Math.floor(diffSec / 60);

  // Show banner if <= 60 minutes
  if (minsLeft > 60 || minsLeft <= 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-sans shadow-xl border-b border-amber-300 relative z-40">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-slate-950 text-amber-400 shrink-0">
            <Clock className="w-4 h-4" />
          </span>
          <div className="text-xs font-black tracking-tight font-mono tabular-nums">
            <span>【交接前 1 小時動態衝刺提醒】距離 {shiftSettings.handoverTimeStr} 交接會議僅剩 </span>
            <span className="bg-slate-950 text-amber-300 px-2 py-0.5 rounded font-black text-sm">
              {minsLeft} 分鐘
            </span>
            <span>！</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenShiftTab}
          className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-850 text-amber-300 font-black text-xs cursor-pointer shadow-md transition-colors active:scale-95 flex items-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>立即進行交接重點特訓</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
