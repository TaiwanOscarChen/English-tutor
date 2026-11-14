import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  Copy,
  Sparkles,
  Volume2,
  VolumeX,
  Bookmark,
  Zap,
  X
} from 'lucide-react';
import { playClickSound, playWaferSnapSound } from '../utils/audioEffects';

export type ToastType = 'success' | 'info' | 'warning' | 'copy' | 'sound' | 'bookmark' | 'xp';

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, options?: { title?: string; type?: ToastType; duration?: number }) => void;
  showCopyToast: (textLabel?: string) => void;
  showBookmarkToast: (isBookmarked: boolean, itemTitle?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options?: { title?: string; type?: ToastType; duration?: number }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newToast: ToastItem = {
        id,
        message,
        title: options?.title,
        type: options?.type || 'info',
        duration: options?.duration || 3200
      };

      setToasts((prev) => [...prev.slice(-3), newToast]);

      if (options?.type === 'success' || options?.type === 'xp') {
        playWaferSnapSound();
      }

      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    },
    [removeToast]
  );

  const showCopyToast = useCallback(
    (textLabel: string = '內容') => {
      showToast(`已複製「${textLabel}」至剪貼簿，可直接貼入交接日誌或報告`, {
        title: '複製成功',
        type: 'copy',
        duration: 2500
      });
    },
    [showToast]
  );

  const showBookmarkToast = useCallback(
    (isBookmarked: boolean, itemTitle?: string) => {
      const name = itemTitle ? `「${itemTitle}」` : '項目';
      if (isBookmarked) {
        showToast(`已將 ${name} 加入重點複習收藏清單`, {
          title: '已加入收藏',
          type: 'bookmark',
          duration: 2500
        });
      } else {
        showToast(`已從收藏清單中移除 ${name}`, {
          title: '已取消收藏',
          type: 'info',
          duration: 2000
        });
      }
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, showCopyToast, showBookmarkToast }}>
      {children}

      {/* Global Floating Toast Container */}
      <div
        id="global-toast-container"
        className="fixed top-16 sm:top-5 right-3 sm:right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
        style={{ width: 'calc(100% - 24px)', maxWidth: '380px' }}
      >
        <AnimatePresence>
          {toasts.map((t) => {
            let Icon = Info;
            let bgClass = 'bg-slate-900/95 border-slate-700/80 text-slate-100 ring-1 ring-slate-700/40';
            let iconColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';

            if (t.type === 'success') {
              Icon = CheckCircle2;
              bgClass = 'bg-slate-900/95 border-emerald-500/60 text-slate-100 ring-1 ring-emerald-500/30';
              iconColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40';
            } else if (t.type === 'copy') {
              Icon = Copy;
              bgClass = 'bg-slate-900/95 border-cyan-500/60 text-slate-100 ring-1 ring-cyan-500/30';
              iconColor = 'text-cyan-400 bg-cyan-500/15 border-cyan-500/40';
            } else if (t.type === 'bookmark') {
              Icon = Bookmark;
              bgClass = 'bg-slate-900/95 border-amber-500/60 text-slate-100 ring-1 ring-amber-500/30';
              iconColor = 'text-amber-400 bg-amber-500/15 border-amber-500/40';
            } else if (t.type === 'xp') {
              Icon = Sparkles;
              bgClass = 'bg-slate-900/95 border-yellow-400/70 text-slate-100 ring-1 ring-yellow-400/40';
              iconColor = 'text-yellow-300 bg-yellow-400/15 border-yellow-400/40';
            } else if (t.type === 'warning') {
              Icon = AlertCircle;
              bgClass = 'bg-slate-900/95 border-rose-500/60 text-slate-100 ring-1 ring-rose-500/30';
              iconColor = 'text-rose-400 bg-rose-500/15 border-rose-500/40';
            }

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 380 }}
                className={`p-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-start gap-3 pointer-events-auto transition-all ${bgClass}`}
              >
                <div className={`p-2 rounded-xl border shrink-0 ${iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  {t.title && (
                    <div className="text-xs font-black tracking-tight text-white mb-0.5 font-mono flex items-center gap-1.5">
                      <span>{t.title}</span>
                    </div>
                  )}
                  <div className="text-xs text-slate-300 leading-snug break-words font-sans">
                    {t.message}
                  </div>
                </div>

                <button
                  onClick={() => removeToast(t.id)}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showToast: () => {},
      showCopyToast: () => {},
      showBookmarkToast: () => {}
    };
  }
  return context;
}
