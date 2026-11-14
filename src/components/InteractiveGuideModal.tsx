import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lightbulb, Sparkles, Volume2, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

interface InteractiveGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InteractiveGuideModal: React.FC<InteractiveGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'svo' | 'phonetic' | 'tips'>('svo');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-slate-100 litho-scanner-overlay litho-laser-line relative shrink-strict"
        >
          {/* Modal Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-400 rounded-xl text-slate-950 font-black shadow-sm shrink-0">
                <Lightbulb className="w-4 h-4 text-slate-950 fill-slate-950" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  國小語序拆解 ✕ 無塵室口訣通關指南
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  零基礎 FSE 專用！3 分鐘掌握無塵室溝通核心法則
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('svo')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'svo'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1. SVO 國小語序拆解</span>
            </button>
            <button
              onClick={() => setActiveTab('phonetic')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'phonetic'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>2. 擬真台味諧音法</span>
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'tips'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>3. 無塵室 3 大鐵則</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-200 leading-relaxed font-sans flex-1">
            {activeTab === 'svo' && (
              <div className="space-y-3.5">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    心法：句構就像搭積木，4 個零件搞定 90% 無塵室英語
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    在無塵室戴著防塵面罩講英文，外國技師與學長最怕聽落落長的複雜句式。國小語序拆解法將所有英文句子一律拆為最直覺的 4 個積木零件：
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-500/40 space-y-1">
                    <div className="text-[11px] font-black text-blue-400">1. 主角 (Subject)</div>
                    <div className="text-xs font-extrabold text-blue-100">I / We / He / The engineer</div>
                    <p className="text-[10px] text-blue-300/80">指出「是誰」要進行維修或檢查操作。</p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 space-y-1">
                    <div className="text-[11px] font-black text-rose-400">2. 動作 (Verb)</div>
                    <div className="text-xs font-extrabold text-rose-100">test / calibrate / replace / lock</div>
                    <p className="text-[10px] text-rose-300/80">最核心的動詞！直接講出你對機台做了什麼。</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/40 space-y-1">
                    <div className="text-[11px] font-black text-purple-400">3. 橋樑 (Bridge)</div>
                    <div className="text-xs font-extrabold text-purple-100">the / a / for</div>
                    <p className="text-[10px] text-purple-300/80">指定這台特定機台或連接介系詞。</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 space-y-1">
                    <div className="text-[11px] font-black text-emerald-400">4. 東西 (Object)</div>
                    <div className="text-xs font-extrabold text-emerald-100">sensor / motor / pump / valve</div>
                    <p className="text-[10px] text-emerald-300/80">處理對象（感應器、馬達、幫浦、閥門）。</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="font-bold text-cyan-400">範例：I test the sensor.</div>
                  <div className="text-slate-300 font-mono text-[11px]">I (我) ➔ test (測試) ➔ the (那一個) ➔ sensor (感應器)</div>
                </div>
              </div>
            )}

            {activeTab === 'phonetic' && (
              <div className="space-y-3.5">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    為什麼獨創「頂級擬真台味諧音」？
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    傳統國際音標標示極度抽象，在無塵室應急時根本想不起來。台味諧音採用台灣口音最熟悉的漢字連讀，將英語的輕重音與斷句轉換成朗朗上口的台式注音節奏！
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-xs font-black text-amber-400">連讀喘息點 (豎線 ｜)</div>
                    <p className="text-[11px] text-slate-300">
                      句中的「｜」代表口語表達的停頓節奏。看到「｜」稍微留白 0.2 秒再講下一個字即可。
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-xs font-black text-amber-400">畫面故事結合</div>
                    <p className="text-[11px] text-slate-300">
                      每一個諧音都綁定一個半導體廠實用維修故事（例如：「泰」然自若做「特」訊＝test），讓你聯想機台畫面的同時英文脫口而出！
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tips' && (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-black text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    鐵則一：精簡優先 (SVO 先講)
                  </div>
                  <p className="text-[11px] text-emerald-200/90">
                    講話直奔主題！先講 I test the sensor，別扯一堆冗長形容詞，確保對方第一秒聽懂主旨。
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-500/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-300 font-black text-xs">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    鐵則二：語速維持 0.7x ~ 0.85x
                  </div>
                  <p className="text-[11px] text-blue-200/90">
                    無塵室風車聲（FFU）與對講機雜訊大，清晰穩定的 0.8x 語速勝過含糊不清的快口！
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    鐵則三：關鍵詞大聲重音
                  </div>
                  <p className="text-[11px] text-amber-200/90">
                    動詞與名詞（如 replace, pump, error code）要加強音量重讀，對手秒懂你的維修意圖。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Close */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              我知道了，開始實戰練習！
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
