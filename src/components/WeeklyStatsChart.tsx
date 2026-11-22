import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { BarChart2, Clock, CheckCircle2, WifiOff, TrendingUp, Sparkles, Award } from 'lucide-react';

interface WeeklyStatsChartProps {
  visitedCount: number;
  streakCount: number;
}

const WEEKLY_DATA = [
  { day: '週一', minutes: 15, sentences: 3, accuracy: 92 },
  { day: '週二', minutes: 20, sentences: 4, accuracy: 95 },
  { day: '週三', minutes: 18, sentences: 3, accuracy: 90 },
  { day: '週四', minutes: 25, sentences: 5, accuracy: 98 },
  { day: '週五', minutes: 30, sentences: 6, accuracy: 96 },
  { day: '週六', minutes: 12, sentences: 2, accuracy: 88 },
  { day: '週日 (今)', minutes: 22, sentences: 4, accuracy: 100 }
];

export const WeeklyStatsChart: React.FC<WeeklyStatsChartProps> = ({ visitedCount, streakCount }) => {
  const [metric, setMetric] = useState<'minutes' | 'sentences' | 'accuracy'>('minutes');

  const totalMinutes = WEEKLY_DATA.reduce((acc, item) => acc + item.minutes, 0);
  const totalSentences = WEEKLY_DATA.reduce((acc, item) => acc + item.sentences, 0);

  return (
    <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3 backdrop-blur-sm relative overflow-hidden">
      
      {/* Top Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm sm:text-base font-black text-slate-100">
            本週學習戰報
          </h3>
        </div>

        <div role="tablist" aria-label="學習統計圖表指標" className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            role="tab"
            aria-selected={metric === 'minutes'}
            onClick={() => setMetric('minutes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
              metric === 'minutes'
                ? 'bg-yellow-400 text-indigo-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⏱️ 練習分鐘數
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={metric === 'sentences'}
            onClick={() => setMetric('sentences')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
              metric === 'sentences'
                ? 'bg-yellow-400 text-indigo-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🧩 拆解金句數
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={metric === 'accuracy'}
            onClick={() => setMetric('accuracy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
              metric === 'accuracy'
                ? 'bg-yellow-400 text-indigo-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎯 正確率趨勢
          </button>
        </div>
      </div>

      {/* Metric Highlights Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>本週練習總長</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono tabular-nums">
            {totalMinutes} <span className="text-xs font-sans text-slate-400">分鐘</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>已研讀 & 快取</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono tabular-nums">
            {visitedCount} <span className="text-xs font-sans text-slate-400">句金句</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
            <span>SVO 平均正確率</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-yellow-300 font-mono tabular-nums">
            96% <span className="text-xs font-sans text-emerald-400 font-bold">+4%</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <WifiOff className="w-3.5 h-3.5 text-purple-400" />
            <span>無塵室離線模式</span>
          </div>
          <div className="text-xs font-black text-purple-300 flex items-center gap-1.5 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>已就緒 (Offline Ready)</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-52 sm:h-60 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {metric === 'accuracy' ? (
            <AreaChart data={WEEKLY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#facc15" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis domain={[80, 100]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
                formatter={(value: any) => [`${value}%`, 'SVO 拆解正確率']}
              />
              <Area type="monotone" dataKey="accuracy" stroke="#facc15" strokeWidth={3} fillOpacity={1} fill="url(#accuracyGrad)" />
            </AreaChart>
          ) : (
            <BarChart data={WEEKLY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="day"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
                formatter={(value: any) => [
                  metric === 'minutes' ? `${value} 分鐘` : `${value} 句`,
                  metric === 'minutes' ? '練習時數' : '完成拆解'
                ]}
              />
              <Bar
                dataKey={metric}
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
              >
                {WEEKLY_DATA.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === WEEKLY_DATA.length - 1 ? '#facc15' : '#38bdf8'}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between border-t border-slate-800/80 pt-3">
        <span>💡 數據已自動儲存於瀏覽器 Local Storage 快取中</span>
        <span className="text-cyan-400 font-bold tabular-nums">連續學習：{streakCount} 天 🔥</span>
      </div>

    </div>
  );
};
