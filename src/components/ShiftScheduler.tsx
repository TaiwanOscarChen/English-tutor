import React, { useState, useEffect } from 'react';
import { ShiftSettings, ShiftType, Lesson } from '../types';
import { PRESET_LESSONS } from '../data/presetLessons';
import { Clock, Bell, BellOff, Volume2, Calendar, Zap, AlertTriangle, CheckCircle2, ArrowRight, Shield, Play, RotateCcw, ChevronRight } from 'lucide-react';
import { speakEnglish } from '../utils/speech';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { motion, AnimatePresence } from 'motion/react';

interface ShiftSchedulerProps {
  shiftSettings: ShiftSettings;
  onUpdateShiftSettings: (settings: ShiftSettings) => void;
  speechSpeed: number;
  onStartHandoverPractice?: () => void;
}

export const ShiftScheduler: React.FC<ShiftSchedulerProps> = ({
  shiftSettings,
  onUpdateShiftSettings,
  speechSpeed,
  onStartHandoverPractice
}) => {
  const [now, setNow] = useState<Date>(new Date());
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [isHandoverImminent, setIsHandoverImminent] = useState<boolean>(false);
  const [activeHandoverFlashcardIndex, setActiveHandoverFlashcardIndex] = useState<number>(0);
  const [showHandoverPracticeModal, setShowHandoverPracticeModal] = useState<boolean>(false);

  // Filter lessons specifically tailored for Handover (Category: 'shift-handover' or 'error-code' or 'alarm')
  const handoverLessons = PRESET_LESSONS.filter(l => 
    l.category === 'shift-handover' || l.category === 'error-code' || l.category === 'vacuum-pump'
  );

  // Clock Ticker & Handover Countdown calculation
  useEffect(() => {
    const timer = setInterval(() => {
      const current = new Date();
      setNow(current);

      if (shiftSettings.shiftType === 'off') {
        setTimeLeftSeconds(0);
        setIsHandoverImminent(false);
        return;
      }

      // Parse handover time (e.g. "18:30" or "06:30")
      const [targetH, targetM] = shiftSettings.handoverTimeStr.split(':').map(Number);
      
      const targetTimeToday = new Date(current);
      targetTimeToday.setHours(targetH, targetM, 0, 0);

      let diffSec = Math.floor((targetTimeToday.getTime() - current.getTime()) / 1000);

      // If time has passed today, target tomorrow's handover
      if (diffSec < 0) {
        const targetTimeTomorrow = new Date(current);
        targetTimeTomorrow.setDate(targetTimeTomorrow.getDate() + 1);
        targetTimeTomorrow.setHours(targetH, targetM, 0, 0);
        diffSec = Math.floor((targetTimeTomorrow.getTime() - current.getTime()) / 1000);
      }

      setTimeLeftSeconds(diffSec);

      // Is handover within 60 minutes?
      const isImminent = diffSec <= shiftSettings.reminderMinutesBefore * 60 && diffSec > 0;
      setIsHandoverImminent(isImminent);

      // Trigger audio alert chime if enabled and crossing boundary
      if (isImminent && shiftSettings.enableSoundAlert && (!shiftSettings.lastRemindedTimestamp || current.getTime() - shiftSettings.lastRemindedTimestamp > 1800000)) {
        playHandoverAlertSound();
        onUpdateShiftSettings({
          ...shiftSettings,
          lastRemindedTimestamp: current.getTime()
        });
      }

    }, 1000);

    return () => clearInterval(timer);
  }, [shiftSettings]);

  // Audio Chime Synthesizer using Web Audio API
  const playHandoverAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn("Audio Context not allowed or blocked:", e);
    }
  };

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return {
      hours: String(hours).padStart(2, '0'),
      mins: String(mins).padStart(2, '0'),
      secs: String(secs).padStart(2, '0')
    };
  };

  const { hours, mins, secs } = formatCountdown(timeLeftSeconds);

  const handleSelectShiftType = (type: ShiftType) => {
    let handover = '18:30';
    if (type === 'night') handover = '06:30';
    if (type === 'off') handover = '00:00';

    onUpdateShiftSettings({
      ...shiftSettings,
      shiftType: type,
      handoverTimeStr: handover
    });
  };

  const currentLesson = handoverLessons[activeHandoverFlashcardIndex] || handoverLessons[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full min-w-0">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden litho-scanner-overlay litho-laser-line shrink-strict">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between gap-4 flex-wrap relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-mono font-bold">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>無塵室輪班與交接學習排程 (Shift Smart Reminder)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight font-mono">
              交接前 1 小時重點複習系統
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              根據您的輪班時間（日班/夜班）自動倒數，在交接班前一小時推播 Alarm 排除與交接專用 SVO 句型，確保最需要時順暢溝通。
            </p>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-right space-y-1 shrink-0">
            <span className="text-[11px] text-slate-500 font-mono font-bold block">無塵室目前時間</span>
            <div className="text-lg font-black font-mono text-cyan-400 tracking-wider">
              {now.toLocaleTimeString('zh-TW', { hour12: false })}
            </div>
          </div>
        </div>
      </div>

      {/* Handover Urgent Alert Banner if < 60 mins */}
      <AnimatePresence>
        {isHandoverImminent && shiftSettings.shiftType !== 'off' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-amber-400 text-slate-950 border-2 border-amber-300 rounded-3xl p-5 shadow-[0_0_30px_rgba(250,204,21,0.4)] flex items-center justify-between gap-4 flex-wrap animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase font-mono bg-slate-950 text-amber-400 px-2 py-0.5 rounded">
                    ⚠️ 交接時間臨近！
                  </span>
                  <span className="text-xs font-black font-mono">
                    距離交接僅剩 {hours}:{mins}:{secs}
                  </span>
                </div>
                <h3 className="text-base font-black tracking-tight">
                  建議立即進行【交接前 3 分鐘重點句型快閃特訓】！
                </h3>
              </div>
            </div>

            <button
              onClick={() => setShowHandoverPracticeModal(true)}
              className="px-5 py-3 rounded-2xl bg-slate-950 hover:bg-slate-850 text-amber-300 font-black text-xs cursor-pointer shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shrink-0"
            >
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>一鍵開始交接預習</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Shift Config + Live Countdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Left: Shift Selection Card */}
        <div className="md:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-base font-black text-slate-100 font-mono flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>設定個人輪班別 (Shift Type)</span>
            </h3>
            <span className="text-xs font-mono font-bold text-amber-400">
              目前班別：{
                shiftSettings.shiftType === 'day' ? '☀️ 日班 (Day Shift)' :
                shiftSettings.shiftType === 'night' ? '🌙 夜班 (Night Shift)' :
                shiftSettings.shiftType === 'custom' ? '⚙️ 自訂班別' : '💤 輪休 (Off)'
              }
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'day', name: '日班 (Day)', time: '07:30 - 19:30', handover: '18:30', icon: '☀️' },
              { id: 'night', name: '夜班 (Night)', time: '19:30 - 07:30', handover: '06:30', icon: '🌙' },
              { id: 'off', name: '輪休 (Off)', time: '休假中', handover: '免交接', icon: '☕' },
              { id: 'custom', name: '自訂 (Custom)', time: '手動交接點', handover: shiftSettings.handoverTimeStr, icon: '⚙️' },
            ].map((shift) => {
              const isSelected = shiftSettings.shiftType === shift.id;
              return (
                <button
                  key={shift.id}
                  onClick={() => handleSelectShiftType(shift.id as ShiftType)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between space-y-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/20 border-cyan-400 shadow-md ring-1 ring-cyan-400/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{shift.icon}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-100">{shift.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{shift.time}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded w-max">
                    交接 {shift.handover}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Detailed Handover Time Adjustment */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <label className="text-xs font-black text-slate-200 block font-mono">
                  ⏰ 設定交接準備目標時間 (Handover Target Time)
                </label>
                <p className="text-[11px] text-slate-400">
                  通常為交接班會議前 30-60 分鐘開始準備紀錄 Log。
                </p>
              </div>

              <input
                type="time"
                value={shiftSettings.handoverTimeStr}
                onChange={(e) => onUpdateShiftSettings({ ...shiftSettings, handoverTimeStr: e.target.value })}
                className="bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-black text-sm px-3 py-1.5 rounded-xl focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Notification Toggles */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-4 flex-wrap text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateShiftSettings({ ...shiftSettings, enableReminder: !shiftSettings.enableReminder })}
                  className={`p-2 rounded-xl border flex items-center gap-1.5 font-extrabold cursor-pointer transition-all ${
                    shiftSettings.enableReminder
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {shiftSettings.enableReminder ? <Bell className="w-3.5 h-3.5 text-cyan-400" /> : <BellOff className="w-3.5 h-3.5" />}
                  <span>交接前 1 小時提醒</span>
                </button>

                <button
                  onClick={() => {
                    const nextSound = !shiftSettings.enableSoundAlert;
                    if (nextSound) playHandoverAlertSound();
                    onUpdateShiftSettings({ ...shiftSettings, enableSoundAlert: nextSound });
                  }}
                  className={`p-2 rounded-xl border flex items-center gap-1.5 font-extrabold cursor-pointer transition-all ${
                    shiftSettings.enableSoundAlert
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{shiftSettings.enableSoundAlert ? '警示音效已開啟' : '靜音提醒'}</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-500">
                每 30 分鐘防重複提醒
              </span>
            </div>
          </div>

        </div>

        {/* Right: Live Handover Countdown Wheel */}
        <div className="md:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-5 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest block">
              ⏱️ Real-time Handover Timer
            </span>
            <h3 className="text-lg font-black text-slate-100 font-mono">
              距離下次交接班倒數
            </h3>
          </div>

          {shiftSettings.shiftType === 'off' ? (
            <div className="py-12 text-center space-y-2">
              <div className="text-4xl">☕</div>
              <h4 className="text-base font-black text-slate-300">目前為輪休模式 (Off Day)</h4>
              <p className="text-xs text-slate-500">好好休息放鬆，或自由選擇感興趣的晶圓週報閱讀。</p>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-5 text-center space-y-3 shadow-inner">
              <div className="flex items-center justify-center gap-2 font-mono text-4xl sm:text-5xl font-black text-cyan-400 tracking-tight">
                <div className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 min-w-[60px]">
                  {hours}
                  <span className="text-[10px] text-slate-500 block font-sans font-medium uppercase tracking-normal">Hrs</span>
                </div>
                <span>:</span>
                <div className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 min-w-[60px]">
                  {mins}
                  <span className="text-[10px] text-slate-500 block font-sans font-medium uppercase tracking-normal">Min</span>
                </div>
                <span>:</span>
                <div className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 min-w-[60px] text-yellow-400">
                  {secs}
                  <span className="text-[10px] text-slate-500 block font-sans font-medium uppercase tracking-normal">Sec</span>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>預計交接時間：{shiftSettings.handoverTimeStr}</span>
              </div>
            </div>
          )}

          {/* Quick Start Handover Practice Deck */}
          <button
            onClick={() => setShowHandoverPracticeModal(true)}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>開啟【交接班高頻口頭匯報速記卡】</span>
          </button>

        </div>

      </div>

      {/* Handover Practice Flashcard Deck Modal */}
      <AnimatePresence>
        {showHandoverPracticeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-slate-900 border-2 border-amber-400/80 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-100 font-mono">
                      交接班急診速記 Flashcard ({activeHandoverFlashcardIndex + 1} / {handoverLessons.length})
                    </h3>
                    <p className="text-xs text-slate-400">掌握大夜班 Alarm Down 機與處置進度匯報句型</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowHandoverPracticeModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                >
                  關閉
                </button>
              </div>

              {/* Current Flashcard */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-inner">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-400 font-bold">【無塵室情境】{currentLesson.scenario}</span>
                  <button
                    onClick={() => speakEnglish(currentLesson.english_sentence, speechSpeed)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-400 text-slate-950 font-black flex items-center gap-1.5 hover:bg-cyan-300 cursor-pointer shadow"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>聽正確發音</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
                  <div className="text-lg sm:text-xl font-black text-slate-100 font-mono tracking-tight">
                    "{currentLesson.english_sentence}"
                  </div>
                  <div className="text-xs font-black text-amber-300 font-mono bg-amber-950/40 py-1 px-3 rounded-lg inline-block tracking-wide">
                    注音輔助：{(() => {
                      const zh = convertPhoneticToZhuyin(currentLesson.phonetic_taiwan);
                      const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                      return clean ? `【 ${clean} 】` : '';
                    })()}
                  </div>
                </div>

                {/* SVO Structure Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="bg-blue-950/50 border border-blue-800/60 p-2 rounded-xl text-center">
                    <span className="text-blue-400 font-bold block text-[10px]">主角 (Subject)</span>
                    <span className="text-slate-200 font-black">{currentLesson.components.subject}</span>
                  </div>
                  <div className="bg-amber-950/50 border border-amber-800/60 p-2 rounded-xl text-center">
                    <span className="text-amber-400 font-bold block text-[10px]">動作 (Action)</span>
                    <span className="text-slate-200 font-black">{currentLesson.components.action}</span>
                  </div>
                  <div className="bg-emerald-950/50 border border-emerald-800/60 p-2 rounded-xl text-center">
                    <span className="text-emerald-400 font-bold block text-[10px]">橋樑 (Bridge)</span>
                    <span className="text-slate-200 font-black">{currentLesson.components.bridge || '—'}</span>
                  </div>
                  <div className="bg-purple-950/50 border border-purple-800/60 p-2 rounded-xl text-center">
                    <span className="text-purple-400 font-bold block text-[10px]">東西 (Object)</span>
                    <span className="text-slate-200 font-black">{currentLesson.components.object}</span>
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setActiveHandoverFlashcardIndex((prev) => (prev > 0 ? prev - 1 : handoverLessons.length - 1))}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                >
                  上一張句型
                </button>

                <button
                  onClick={() => setActiveHandoverFlashcardIndex((prev) => (prev + 1) % handoverLessons.length)}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer shadow flex items-center gap-1.5"
                >
                  <span>下一張速記</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
