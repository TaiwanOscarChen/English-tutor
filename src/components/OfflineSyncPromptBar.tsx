import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CloudUpload,
  RefreshCw,
  CheckCircle2,
  X,
  Zap,
  Sparkles,
  Award,
  Volume2,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { PendingOfflineSyncStats, SyncResultSummary } from '../utils/offlineSyncManager';
import { UserDiagnostics } from '../types';

interface OfflineSyncPromptBarProps {
  showPrompt: boolean;
  isSyncing: boolean;
  pendingStats: PendingOfflineSyncStats | null;
  syncSummary: SyncResultSummary | null;
  onSync: () => void;
  onDismiss: () => void;
}

export const OfflineSyncPromptBar: React.FC<OfflineSyncPromptBarProps> = ({
  showPrompt,
  isSyncing,
  pendingStats,
  syncSummary,
  onSync,
  onDismiss
}) => {
  if (!showPrompt && !syncSummary) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="offline-sync-prompt-bar"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-xl pointer-events-auto"
      >
        {syncSummary ? (
          /* Sync Success State */
          <div
            id="offline-sync-success-pill"
            className="bg-slate-900/95 border border-emerald-400/80 rounded-2xl p-3 sm:py-2.5 sm:px-4 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-xs text-emerald-100 ring-2 ring-emerald-500/20"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0 border border-emerald-400/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="font-black text-emerald-300 flex items-center gap-1.5 flex-wrap text-xs sm:text-sm">
                  <span>離線學習進度已成功同步！</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    +{syncSummary.xpGained} XP
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/80 truncate font-mono">
                  已累計 {syncSummary.vocabCount} 個單字、{syncSummary.speechCount} 次口說評測至總成就地圖
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 shrink-0 flex items-center gap-1 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              已記錄
            </span>
          </div>
        ) : (
          /* Active Sync Prompt State */
          <div
            id="offline-sync-action-pill"
            className="bg-slate-950/95 border border-cyan-500/40 hover:border-cyan-400/70 rounded-2xl p-3 sm:py-2.5 sm:px-4 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs text-slate-100 ring-1 ring-cyan-500/30 transition-all"
          >
            {/* Left: Indicator & Description */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 shrink-0">
                <CloudUpload className="w-4 h-4 text-cyan-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
              </div>

              <div className="min-w-0">
                <div className="font-black text-slate-100 flex items-center gap-1.5 flex-wrap text-xs sm:text-[13px]">
                  <span>設備已恢復連線</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                    {pendingStats?.totalPending || 1} 筆離線進度待同步
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono flex-wrap">
                  {pendingStats?.unsyncedVocabCount ? (
                    <span className="flex items-center gap-0.5 text-cyan-300">
                      <BookOpen className="w-3 h-3 text-cyan-400" />
                      {pendingStats.unsyncedVocabCount} 個複習單字
                    </span>
                  ) : null}
                  {pendingStats?.unsyncedSpeechCount ? (
                    <span className="flex items-center gap-0.5 text-amber-300">
                      <Volume2 className="w-3 h-3 text-amber-400" />
                      {pendingStats.unsyncedSpeechCount} 次口說評測
                    </span>
                  ) : null}
                  {pendingStats?.unsyncedDrillCount ? (
                    <span className="flex items-center gap-0.5 text-emerald-300">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      {pendingStats.unsyncedDrillCount} 項離線闖關
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Right: Sync Action Button & Dismiss */}
            <div className="flex items-center gap-1.5 shrink-0 justify-end">
              <button
                id="offline-sync-execute-btn"
                onClick={onSync}
                disabled={isSyncing}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-950 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? '同步累積中...' : '自動同步進度'}</span>
              </button>

              <button
                id="offline-sync-dismiss-btn"
                onClick={onDismiss}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="稍後再同步"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
