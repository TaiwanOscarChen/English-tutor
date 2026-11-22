import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Sparkles, Contrast } from 'lucide-react';
import {
  CleanroomScenarioId,
  CLEANROOM_SCENARIOS,
} from '../utils/cleanroomScenario';
import { playClickSound, playLaserScanSound } from '../utils/audioEffects';

interface CleanroomScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScenario: CleanroomScenarioId;
  onSelectScenario: (id: CleanroomScenarioId) => void;
  isHighContrast: boolean;
  onToggleHighContrast: () => void;
}

export const CleanroomScenarioModal: React.FC<CleanroomScenarioModalProps> = ({
  isOpen,
  onClose,
  currentScenario,
  onSelectScenario,
  isHighContrast,
  onToggleHighContrast
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

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="無塵室情境氛圍與對比色調校"
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border-2 border-slate-700/80 rounded-2xl max-w-xl w-full p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                  <span>無塵室情境氛圍與對比色調校</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  切換半導體晶圓廠實境光影、粒子軌跡與高辨識度對比色
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="關閉情境設定"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              title="關閉 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick High-Contrast One-Click Switcher */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-lg border ${
                isHighContrast
                  ? 'bg-yellow-400/20 border-yellow-400 text-yellow-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                <Contrast className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-slate-100">
                    WCAG AAA 極限超強對比模式
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    isHighContrast ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isHighContrast ? '已開啟' : '標準'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  消除微影反光，黑曜石底盤 + 純白發光文字 + 24K 黃金聚焦標籤
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-pressed={isHighContrast}
              onClick={() => {
                playLaserScanSound();
                onToggleHighContrast();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isHighContrast
                  ? 'bg-yellow-400 text-slate-950 border-yellow-300 shadow-md shadow-yellow-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {isHighContrast ? '還原標準' : '一鍵超強對比'}
            </button>
          </div>

          {/* Scenarios List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 px-0.5">
              <span>晶圓廠四大實景環境與光譜情境</span>
              <span className="text-[10px] text-slate-500">點擊立即套用環境光</span>
            </div>

            <div role="radiogroup" aria-label="晶圓廠情境氛圍選擇" className="grid grid-cols-1 gap-2 max-h-[320px] overflow-y-auto pr-1">
              {CLEANROOM_SCENARIOS.map((sc) => {
                const isSelected = currentScenario === sc.id;
                return (
                  <div
                    key={sc.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => {
                      playLaserScanSound();
                      onSelectScenario(sc.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        playLaserScanSound();
                        onSelectScenario(sc.id);
                      }
                    }}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative flex items-start justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      isSelected
                        ? 'bg-slate-950/95 shadow-lg ring-1'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950/80'
                    }`}
                    style={{
                      borderColor: isSelected ? sc.accentColor : undefined,
                      boxShadow: isSelected ? `0 0 16px -2px ${sc.accentColor}33` : undefined
                    }}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-xl shrink-0 mt-0.5">{sc.symbol}</span>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-slate-100">
                            {sc.name}
                          </span>
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border"
                            style={{
                              borderColor: `${sc.accentColor}66`,
                              backgroundColor: `${sc.accentColor}18`,
                              color: sc.accentColor
                            }}
                          >
                            {sc.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {sc.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-center pt-1">
                      {isSelected ? (
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-slate-950 font-black text-xs shadow-sm"
                          style={{ backgroundColor: sc.accentColor }}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-md border border-slate-700" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>情境設定將自動儲存，離線亦維持設定。</span>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold transition-colors cursor-pointer border border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              完成設定
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
