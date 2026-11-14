import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Keyboard,
  X,
  Sparkles,
  Volume2,
  Search,
  BookOpen,
  Bot,
  Car,
  Award,
  Zap,
  Command
} from 'lucide-react';
import { playClickSound } from '../utils/audioEffects';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBackupModal?: () => void;
  onOpenSystemHealth?: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onOpenBackupModal,
  onOpenSystemHealth
}) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      group: '導航與關卡巡航',
      items: [
        { key: '1', desc: '每日句型特訓' },
        { key: '2', desc: 'AI 口語跟讀評測' },
        { key: '3', desc: '五大製程設備專區（曝光／蝕刻／薄膜／量測／光學檢測）' },
        { key: '4', desc: '晶圓知識庫（單字／文章／急救／情境）' },
        { key: '← / →', desc: '每日句型：極速切換上一關 / 下一關' },
      ]
    },
    {
      group: '全域指令與系統工具',
      items: [
        { key: '⌘ K / Ctrl+K', desc: '開啟全站指令快搜 (Command Palette)' },
        { key: 'Space 空白鍵', desc: '播放 / 暫停 當前焦點句型發音' },
        { key: 'M', desc: '切換 UI 音效開啟 / 靜音' },
        { key: 'B', desc: '數據備份與系統健全診斷 (Backup & Health)' },
        { key: '?', desc: '開啟本快捷鍵指南' },
        { key: 'Esc', desc: '關閉所有彈跳視窗與選單' }
      ]
    },
    {
      group: '無塵室交接實戰支援',
      items: [
        { key: 'PWA 離線保護', desc: '支援安裝至手機/平板，無塵室無訊號依然可用' },
        { key: '一鍵複製', desc: '點擊句卡右上角可秒複製標準報告' }
      ]
    }
  ];

  return (
    <AnimatePresence>
      <div
        id="keyboard-shortcuts-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="keyboard-shortcuts-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl text-slate-100 relative max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-300">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-mono flex items-center gap-2">
                  <span>鍵盤操作快捷鍵指南</span>
                  <span className="px-2 py-0.5 text-[10px] bg-amber-400 text-slate-950 font-bold rounded-md">
                    Pro Tips
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  專為半導體工程師設計的高效無鼠鍵盤巡航
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shortcuts Grid */}
          <div className="space-y-4 pt-4">
            {shortcutGroups.map((grp, gIdx) => (
              <div key={gIdx} className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 font-mono flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>{grp.group}</span>
                </h4>

                <div className="bg-slate-950/80 rounded-2xl border border-slate-800/80 divide-y divide-slate-800/60 overflow-hidden">
                  {grp.items.map((item, iIdx) => (
                    <div
                      key={iIdx}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-800/30 transition-colors"
                    >
                      <span className="text-slate-300 font-medium">{item.desc}</span>
                      <kbd className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-mono text-[11px] font-black shadow-sm shrink-0">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-5 pt-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-1.5 flex-wrap">
              {onOpenSystemHealth && (
                <button
                  onClick={() => {
                    playClickSound();
                    onClose();
                    onOpenSystemHealth();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer"
                >
                  ⚡ 全系統強化監控
                </button>
              )}
              {onOpenBackupModal && (
                <button
                  onClick={() => {
                    playClickSound();
                    onClose();
                    onOpenBackupModal();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition-all cursor-pointer"
                >
                  💾 數據備份
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span>隨時按 <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold">?</kbd> 開啟指南</span>
              <button
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors cursor-pointer"
              >
                我知道了
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
