import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Sparkles, ShieldAlert, Search, Mic, MessageSquare, Zap, X, ChevronUp, RefreshCw } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../utils/audioEffects';

interface FloatingAiAssistantProps {
  cycleNumber: number;
  onOpenErrorCodeModal: () => void;
  onOpenDecomposerModal: () => void;
  onOpenSpeechModal: () => void;
  onOpenChatTab: () => void;
  onManualTrigger3DayUpdate: () => Promise<void>;
}

export const FloatingAiAssistant: React.FC<FloatingAiAssistantProps> = ({
  cycleNumber,
  onOpenErrorCodeModal,
  onOpenDecomposerModal,
  onOpenSpeechModal,
  onOpenChatTab,
  onManualTrigger3DayUpdate
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isUpdating3Day, setIsUpdating3Day] = useState<boolean>(false);

  const toggleOpen = () => {
    playClickSound();
    setIsOpen(!isOpen);
  };

  const handleTriggerUpdate = async () => {
    playClickSound();
    setIsUpdating3Day(true);
    await onManualTrigger3DayUpdate();
    setIsUpdating3Day(false);
    playSuccessChime();
  };

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 select-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className="mb-3 w-72 rounded-2xl bg-slate-900/95 border border-cyan-500/40 p-4 shadow-2xl backdrop-blur-xl text-slate-100 space-y-2.5 litho-laser-line"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Bot className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100">FSE 晶圓級 AI 助手</div>
                  <div className="text-[10px] text-cyan-300">第 {cycleNumber} 輪 3 天全網 AI 週期中</div>
                </div>
              </div>

              <button
                onClick={toggleOpen}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action List */}
            <div className="space-y-1.5 text-xs">
              <button
                onClick={handleTriggerUpdate}
                disabled={isUpdating3Day}
                className="w-full text-left p-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-amber-500/20 hover:from-cyan-500/30 hover:to-amber-500/30 border border-cyan-400/30 text-cyan-200 font-bold flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>3 天全網 AI 動態大更新</span>
                </span>
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdating3Day ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => {
                  toggleOpen();
                  onOpenErrorCodeModal();
                }}
                className="w-full text-left p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center gap-2 transition-all"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Error Code 緊急交接生成器</span>
              </button>

              <button
                onClick={() => {
                  toggleOpen();
                  onOpenDecomposerModal();
                }}
                className="w-full text-left p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center gap-2 transition-all"
              >
                <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>任意句 SVO 拆解與台味諧音</span>
              </button>

              <button
                onClick={() => {
                  toggleOpen();
                  onOpenSpeechModal();
                }}
                className="w-full text-left p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center gap-2 transition-all"
              >
                <Mic className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>晶圓口說評測特訓</span>
              </button>

              <button
                onClick={() => {
                  toggleOpen();
                  onOpenChatTab();
                }}
                className="w-full text-left p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center gap-2 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>1 對 1 AI 晶圓英文導師對話</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleOpen}
        className="relative group flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 via-amber-400 to-indigo-500 text-slate-950 font-extrabold text-xs shadow-2xl shadow-cyan-500/30 border border-cyan-300/50 cursor-pointer"
      >
        <div className="relative">
          <Bot className="w-4 h-4 text-slate-950" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        </div>
        <span className="hidden sm:inline font-bold">AI 晶圓特訓助手</span>
        <span className="px-1.5 py-0.5 rounded-full bg-slate-950/80 text-cyan-300 text-[10px] font-mono">
          3天週期 #{cycleNumber}
        </span>
      </motion.button>
    </div>
  );
};
