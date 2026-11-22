import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Cpu, Sparkles, Volume2, Copy, Check, ShieldAlert, BookOpen, ShieldCheck } from 'lucide-react';
import { speakEnglish } from '../utils/speech';
import { playClickSound, playSuccessChime } from '../utils/audioEffects';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getSentenceKKPhonetic } from '../utils/wordDictionary';
import { sanitizeTextToPublicSafe } from '../utils/pipSanitizer';

interface AiErrorCodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_ERROR_CODES = [
  { code: 'ALM-01', title: 'Optical Sensor Alert', desc: '腔體光學感應器訊號遮蔽或髒污' },
  { code: 'ALM-02', title: 'Vacuum Pressure Low', desc: '真空幫浦壓力不足或腔體微漏' },
  { code: 'ALM-03', title: 'Robot Wafer Slip', desc: '晶圓手臂傳輸偏移或夾爪定位異常' },
  { code: 'ALM-04', title: 'MFC Gas Flow Drift', desc: '質量流量控制器氣體流量漂移' },
  { code: 'ALM-05', title: 'Laser Thermal Alert', desc: '曝光機光源雷射冷卻溫度過高' }
];

export const AiErrorCodeGeneratorModal: React.FC<AiErrorCodeGeneratorModalProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedCode, setSelectedCode] = useState<string>('ALM-01');
  const [machineType, setMachineType] = useState<string>('Process Chamber');
  const [customDesc, setCustomDesc] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultData, setResultData] = useState<any | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const copyTimerRef = React.useRef<number | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort();
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    playClickSound();
    setIsLoading(true);
    setResultData(null);

    const safeCode = sanitizeTextToPublicSafe(selectedCode).text || 'ALM-01';
    const safeMachine = sanitizeTextToPublicSafe(machineType).text || 'Process Chamber';
    const safeDesc = sanitizeTextToPublicSafe(customDesc, { stripEnglishParens: true }).text;

    const fallbackResult = {
      errorCode: safeCode,
      handoverReport: 'I test the sensor. We reset the alarm.',
      chineseTranslation: '我測試感應器。我們重設警報。',
      svoSentences: [
        {
          english: 'I test the sensor.',
          chinese: '我測試這個感應器。',
          phonetic: '【 愛 ｜ 泰-絲-特 ｜ 德 ｜ 山-瑟 】'
        },
        {
          english: 'We reset the alarm.',
          chinese: '我們重設這個警報。',
          phonetic: '【 威 ｜ 瑞-賽-特 ｜ 德 ｜ 阿-拉-姆 】'
        }
      ]
    };

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch('/api/error-code-handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorCode: safeCode,
          machineType: safeMachine,
          issueDescription: safeDesc
        }),
        signal: controller.signal
      });
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (controller.signal.aborted) return;
      if (response.ok) {
        const data = await response.json();
        const sanitizedResult = {
          ...data,
          handoverReport: sanitizeTextToPublicSafe(data.handoverReport || fallbackResult.handoverReport).text,
          chineseTranslation: sanitizeTextToPublicSafe(data.chineseTranslation || fallbackResult.chineseTranslation, { stripEnglishParens: true }).text,
          svoSentences: Array.isArray(data.svoSentences) && data.svoSentences.length > 0
            ? data.svoSentences.map((s: any) => ({
                ...s,
                english: sanitizeTextToPublicSafe(s.english || '').text,
                chinese: sanitizeTextToPublicSafe(s.chinese || '', { stripEnglishParens: true }).text
              }))
            : fallbackResult.svoSentences
        };
        setResultData(sanitizedResult);
        playSuccessChime();
      } else {
        setResultData(fallbackResult);
        playSuccessChime();
      }
    } catch {
      if (controller.signal.aborted) return;
      setResultData(fallbackResult);
      playSuccessChime();
    } finally {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  const handleCopy = (text: string) => {
    playClickSound();
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      setCopied(true);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        copyTimerRef.current = null;
        setCopied(false);
      }, 2000);
    } catch {}
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI 通用機台警報暨交接金句產生器"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-amber-500/30 p-5 shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col litho-laser-line"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                AI 通用機台警報暨交接金句產生器
              </h2>
              <p className="text-xs text-slate-400">
                選擇公開通用機台警報類別，自動生成 4 字極簡英文交接報告、KK音標與國小拆解對話句
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="關閉產生器"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            title="關閉視窗 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-4 overflow-y-auto shrink min-h-0">
          {/* Quick Error Code Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              1. 選擇公開通用機台警報類別或自行輸入：
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {COMMON_ERROR_CODES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  aria-pressed={selectedCode === item.code}
                  onClick={() => {
                    playClickSound();
                    setSelectedCode(item.code);
                  }}
                  className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    selectedCode === item.code
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                    {item.code}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.title}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                通用警報類別：
              </label>
              <input
                type="text"
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                placeholder="如: ALM-01, Vacuum Drift"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                通用機台與腔體名稱：
              </label>
              <input
                type="text"
                value={machineType}
                onChange={(e) => setMachineType(e.target.value)}
                placeholder="如: Process Chamber, Optical Tool"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              補充問題或處置說明：
            </label>
            <input
              type="text"
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="如: 光學傳感器被晶圓粉塵遮蔽，已更換清潔"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Sparkles className={`w-4 h-4 ${isLoading ? 'motion-safe:animate-spin' : ''}`} />
            <span>{isLoading ? 'AI 正在分析機台警報並生成公開通用交接報告...' : 'AI 生成標準交接報告與對話金句'}</span>
          </button>

          {/* Generated Result Output */}
          <AnimatePresence>
            {resultData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-3"
              >
                {/* Public InfoSec Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-[11px] text-emerald-300 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>已轉換為半導體公開通用工程術語（無資安風險）</span>
                </div>

                {/* Handover Report Box */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" /> 標準英文交接報告
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => speakEnglish(resultData.handoverReport)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        title="原速朗讀"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => speakEnglish(resultData.handoverReport, 0.7)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[10px] font-bold cursor-pointer tabular-nums"
                        title="0.7x 慢速朗讀"
                      >
                        0.7x
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(resultData.handoverReport)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[10px] cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? '已複製' : '複製'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 font-mono leading-relaxed">
                    "{resultData.handoverReport}"
                  </p>
                  <div className="mt-1.5 flex items-start gap-2 text-[11px] font-mono text-cyan-300">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold shrink-0">
                      KK音標
                    </span>
                    <span className="break-words">{getSentenceKKPhonetic(resultData.handoverReport)}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-semibold mt-1">
                    中文：{resultData.chineseTranslation}
                  </p>
                </div>

                {/* SVO Drill Sentences */}
                {resultData.svoSentences && resultData.svoSentences.length > 0 && (
                  <div className="border-t border-slate-800 pt-3">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 mb-2">
                      <BookOpen className="w-3.5 h-3.5" /> 拆解國小對話金句、KK音標與擬真台味諧音
                    </span>

                    <div className="space-y-2">
                      {resultData.svoSentences.map((svo: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-100 font-mono">{svo.english}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => speakEnglish(svo.english)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 cursor-pointer"
                                title="原速朗讀"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => speakEnglish(svo.english, 0.7)}
                                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[10px] font-bold cursor-pointer tabular-nums"
                                title="0.7x 慢速朗讀"
                              >
                                0.7x
                              </button>
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-300 font-semibold">{svo.chinese}</div>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] font-mono">
                            <span className="bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/20">
                              KK音標：{getSentenceKKPhonetic(svo.english)}
                            </span>
                            <span className="bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                              注音：{(() => {
                                const zh = convertPhoneticToZhuyin(svo.phonetic);
                                const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                                return clean ? `【 ${clean} 】` : '';
                              })()}
                            </span>
                            <span className="bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                              諧音：{(() => {
                                const clean = (svo.phonetic || '').trim().replace(/^【\s*|\s*】$/g, '').trim();
                                return clean ? `【 ${clean} 】` : '';
                              })()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

