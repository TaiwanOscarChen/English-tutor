import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Car,
  Sparkles,
  Volume2,
  Mic,
  ShieldCheck,
  Zap,
  Play,
  RotateCcw,
  Headphones,
  CheckCircle2,
  Activity,
  ArrowRight,
  Database,
  Radio,
  Moon,
  Clock,
  Gauge
} from 'lucide-react';
import { playClickSound, playSuccessChime } from '../utils/audioEffects';

interface DriveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDriveMode?: () => void;
}

export const DriveTutorialModal: React.FC<DriveTutorialModalProps> = ({
  isOpen,
  onClose,
  onStartDriveMode
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveStep((prev) => Math.min(3, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveStep((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tutorialSteps = [
    {
      id: 'flow',
      title: '1. 五步全流暢金句聽力循環',
      subtitle: '車載雙耳沉浸，不需分心看螢幕',
      icon: Sparkles,
      color: 'amber',
      badge: '核心流程',
      description: '隨身聽採用為半導體工程師量身打造的「全流暢聽力循序學習法」，每句自動依序播放：',
      items: [
        { label: '步驟 1：中文情境引導', desc: '先告知當前無塵室工況（如：FOUP 傳送異常、腔體洩漏等）。' },
        { label: '步驟 2：慢速美式發音', desc: '以 0.7x~0.85x 速度清晰示範母語標準發音與連音細節。' },
        { label: '步驟 3：中文核心翻譯', desc: '快速對照工程術語與中文含義，建立語意連結。' },
        { label: '步驟 4：台味諧音口訣', desc: '以台灣工程師秒懂的生動諧音口訣強化記憶（如：福普、發克）。' },
        { label: '步驟 5：標準原速複誦', desc: '以標準原速進行最後確認，鍛鍊實戰聽力。' }
      ]
    },
    {
      id: 'modes',
      title: '2. 專屬五大駕駛學習模式',
      subtitle: '依照上班路況與精神狀態隨時切換',
      icon: Headphones,
      color: 'cyan',
      badge: '模式介紹',
      description: '提供 5 種專門設計的學習模式，滿足不同通勤場景：',
      items: [
        { label: '🌟 全流暢五步', desc: '完整 5 步循環（情境 ➔ 慢速 ➔ 中文 ➔ 諧音 ➔ 原速），最扎實的通勤複習。' },
        { label: '🎙️ 駕駛跟讀 3s', desc: '示範朗讀後提供 3 秒留白倒數，鼓勵在車內大聲開口跟讀。' },
        { label: '📻 中英對照速聽', desc: '精簡版中英雙語快速切換，適合快節奏通勤刷題。' },
        { label: '🔁 純英文雙倍', desc: '每句連續雙倍英文複誦，專注強化純英語聽感。' },
        { label: '⚡ SVO 慢速拆解', desc: '將句子拆解為 主角(S) + 動作(V) + 東西(O) 依序朗讀。' }
      ]
    },
    {
      id: 'car-controls',
      title: '3. 車載藍牙與安全操作指南',
      subtitle: '支援方向盤控制鍵、大字 HUD 與夜間模式',
      icon: Car,
      color: 'emerald',
      badge: '車載硬體相容',
      description: '針對開車通勤情境優化，零干擾專心開車：',
      items: [
        { label: '🚗 藍牙 MediaSession 支援', desc: '支援汽車方向盤按鈕切換上一句 / 下一句，車機螢幕同步顯示英文字幕與情境。' },
        { label: '🌙 HUD 夜間高對比模式', desc: '高對比深色背景避免夜間刺眼，維持行車視線安全。' },
        { label: '⏱️ 睡眠定時器', desc: '支援 15 / 30 / 45 分鐘自動關閉，到廠或下班路程時間剛好。' },
        { label: '⚡ 螢幕防休眠 (WakeLock)', desc: '播放期間自動保持螢幕常亮，不需手動解鎖手機。' }
      ]
    },
    {
      id: 'stability',
      title: '4. AudioScheduler 與 IndexedDB 離線快取',
      subtitle: '抗網路抖動與發音自癒保護架構',
      icon: Database,
      color: 'purple',
      badge: '系統韌性',
      description: '為了保證高速公路與隧道收訊不穩時也能 100% 流暢播放：',
      items: [
        { label: '🛡️ IndexedDB 本地快取', desc: '自動將合成片段與時長快取於本地瀏覽器，過隧道網路斷線仍能流暢讀取。' },
        { label: '📊 16 頻段動態視覺化', desc: '即時監控語音合成狀態，若偵測到通道死鎖會自動校準自癒。' },
        { label: '🔄 手動重置發音按鈕', desc: '遇到系統異常卡頓時，點擊頂部「重置」按鈕可一鍵清空隊列並重啟通道。' },
        { label: '⚙️ 停頓節奏與速度微調', desc: '底部提供「緊湊 / 標準 / 寬鬆」停頓間隔與 0.7x~1.15x 語速隨選調節。' }
      ]
    }
  ];

  const currentStepData = tutorialSteps[activeStep];
  const Icon = currentStepData.icon;

  const handleNext = () => {
    playClickSound();
    if (activeStep < tutorialSteps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      playSuccessChime();
      onClose();
      if (onStartDriveMode) {
        onStartDriveMode();
      }
    }
  };

  const handlePrev = () => {
    playClickSound();
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="無塵室隨身聽開車教學指南"
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100 relative"
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-400/10 border border-amber-400/30 rounded-2xl text-amber-400 shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white">
                    無塵室隨身聽 • 開車教學指南
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Drive Mode Tutorial
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  專為半導體工程師設計的車載免操作通勤特訓系統
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="關閉開車教學指南"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 分頁導航指示列 */}
          <div
            role="tablist"
            aria-label="開車教學步驟"
            className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-1.5 shrink-0 overflow-x-auto no-scrollbar"
          >
            {tutorialSteps.map((step, idx) => {
              const isSelected = activeStep === idx;
              const StepIcon = step.icon;
              return (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    playClickSound();
                    setActiveStep(idx);
                  }}
                  className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white border-slate-800/80'
                  }`}
                >
                  <StepIcon className="w-3.5 h-3.5" />
                  <span>{step.badge}</span>
                </button>
              );
            })}
          </div>

          {/* 教學內容展示區 */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-200 leading-relaxed flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-amber-300">
                  {currentStepData.title}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {currentStepData.subtitle}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              {currentStepData.description}
            </p>

            <div className="space-y-2">
              {currentStepData.items.map((item, i) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 transition-colors flex items-start gap-2.5"
                >
                  <div className="w-5 h-5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                    {i + 1}
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-black text-slate-100 text-xs block">
                      {item.label}
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 底部按鈕控制區 */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              {tutorialSteps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    activeStep === idx ? 'w-6 bg-amber-400' : 'w-2 bg-slate-800'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {activeStep > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  上一步
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-105 text-slate-950 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span>{activeStep === tutorialSteps.length - 1 ? '開啟隨身聽' : '下一步'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
