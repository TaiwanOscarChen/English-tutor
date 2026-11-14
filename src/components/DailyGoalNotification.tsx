import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle2, Award, Flame, Sparkles } from 'lucide-react';
import { speakEnglish } from '../utils/speech';
import confetti from 'canvas-confetti';

interface DailyGoalNotificationProps {
  streakCount: number;
  onGoalCompleted: () => void;
  dailySentence?: string;
  speechSpeed?: number;
}

export const DailyGoalNotification: React.FC<DailyGoalNotificationProps> = ({
  streakCount,
  onGoalCompleted,
  dailySentence = "I fix the motor.",
  speechSpeed = 0.85
}) => {
  const [completedToday, setCompletedToday] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastCompleted = localStorage.getItem('fse_last_completed_date');
      if (lastCompleted === today) {
        setCompletedToday(true);
      }
    } catch (e) {
      console.warn("Daily goal state check failed:", e);
    }
  }, []);

  const handleCompleteGoal = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('fse_last_completed_date', today);
      setCompletedToday(true);
      onGoalCompleted();
      // Speak the sentence as part of completing the daily goal
      speakEnglish(dailySentence, speechSpeed);
      // Trigger celebratory confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.warn("Saving completion failed:", e);
    }
  };

  if (dismissed) return null;

  return (
    <div className={`p-3 sm:p-3.5 rounded-2xl border-2 transition-all shadow-xl backdrop-blur-sm ${
      completedToday
        ? 'bg-slate-900/90 border-emerald-500/80 text-emerald-300'
        : 'bg-indigo-950/90 border-yellow-400 text-slate-100 glow-yellow'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left Side: Goal status & motivational text */}
        <div className="flex items-start gap-2.5">
          <div className={`p-2.5 rounded-xl font-black flex items-center justify-center shrink-0 ${
            completedToday
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-yellow-400 text-indigo-950 shadow-lg shadow-yellow-400/20'
          }`}>
            {completedToday ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Flame className="w-5 h-5 animate-bounce text-indigo-950" />
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                completedToday
                  ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                  : 'bg-yellow-400 text-indigo-950'
              }`}>
                {completedToday ? '🎯 已完成今日目標' : '🔥 今日未打卡'}
              </span>
              <span className="text-xs font-mono font-bold text-amber-300">
                連勝打卡：{streakCount} 天
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-white">
              {completedToday
                ? `已完成今日特訓，連勝天數：${streakCount} 天！`
                : '收聽 1 句英文，即可完成今日打卡！'}
            </p>
          </div>
        </div>

        {/* Right Side: Action Button */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          {!completedToday ? (
            <button
              onClick={handleCompleteGoal}
              className="px-6 py-3 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-sm flex items-center gap-2 shadow-xl hover:shadow-yellow-400/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-900" />
              <span>一鍵聽讀打卡完成</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 text-xs font-mono border border-emerald-800 font-bold flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" />
                Streak Maintained!
              </span>
              <button
                onClick={() => setDismissed(true)}
                className="text-xs text-slate-400 hover:text-slate-200 underline px-2 py-1 cursor-pointer"
              >
                關閉提醒
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
