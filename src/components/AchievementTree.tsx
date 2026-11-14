import React, { useState, useMemo } from 'react';
import { AchievementDomain, AchievementNode, MilestoneBadge, UserDiagnostics } from '../types';
import { FAB_ACHIEVEMENT_DOMAINS, MILESTONE_BADGES } from '../data/achievementData';
import { MilestoneBadgeModal } from './MilestoneBadgeModal';
import {
  Cpu,
  Award,
  CheckCircle2,
  Lock,
  Sparkles,
  Volume2,
  Zap,
  ArrowRight,
  Trophy,
  Flame,
  Play,
  Shield,
  Sliders,
  Box,
  Gauge,
  Radio,
  Wind,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Calendar,
  Activity,
  Check
} from 'lucide-react';
import { speakEnglish } from '../utils/speech';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface AchievementTreeProps {
  diagnostics: UserDiagnostics;
  onUpdateDiagnostics: (nextDiag: UserDiagnostics) => void;
  speechSpeed: number;
}

export const AchievementTree: React.FC<AchievementTreeProps> = ({
  diagnostics,
  onUpdateDiagnostics,
  speechSpeed
}) => {
  const [domains, setDomains] = useState<AchievementDomain[]>(FAB_ACHIEVEMENT_DOMAINS);
  const [badges, setBadges] = useState<MilestoneBadge[]>(MILESTONE_BADGES);
  const [selectedNode, setSelectedNode] = useState<AchievementNode | null>(null);
  const [celebratingBadge, setCelebratingBadge] = useState<MilestoneBadge | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState<boolean>(false);
  const [chartTimeframe, setChartTimeframe] = useState<'7days' | '14days'>('7days');

  // Calculate stats
  const allNodes = domains.flatMap((d) => d.nodes);
  const masteredNodesCount = allNodes.filter((n) => n.status === 'mastered').length;
  const overallMasteryPct = Math.round((masteredNodesCount / allNodes.length) * 100);

  // Generate dynamic chart data based on diagnostics & timeframe
  const { trendData, frequencyData } = useMemo(() => {
    const days = chartTimeframe === '7days' ? 7 : 14;
    const baseWords = Math.max(24, (diagnostics.masteredTopics.length || 1) * 8);
    const basePracticed = Math.max(15, diagnostics.totalSentencesPracticed || 20);

    const trend = [];
    const freq = [];

    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayLabel = `${d.getMonth() + 1}/${d.getDate()}`;
      
      const factor = (days - i) / days;
      // Cumulative learned words curve
      const wordsCount = Math.round(baseWords * (0.35 + 0.65 * factor) + (i === 0 ? 0 : (Math.sin(i) * 3)));
      const termsMastered = Math.round(wordsCount * 0.72);

      trend.push({
        date: dayLabel,
        總學習字數: wordsCount,
        精通專業術語: termsMastered,
      });

      // Daily practice frequency
      const dailySentences = Math.max(3, Math.round((basePracticed / days) * (0.8 + Math.sin(i * 1.5) * 0.4) + (i === 0 ? 6 : 2)));
      const speechDrills = Math.max(2, Math.round(dailySentences * 0.65));

      freq.push({
        date: dayLabel,
        句型練習次數: dailySentences,
        語音發音校正: speechDrills,
      });
    }

    return { trendData: trend, frequencyData: freq };
  }, [diagnostics, chartTimeframe]);

  // Toggle node mastery
  const handleToggleNodeMastery = (nodeId: string) => {
    let newlyUnlockedBadge: MilestoneBadge | null = null;

    const nextDomains = domains.map((d) => {
      const nextNodes = d.nodes.map((n) => {
        if (n.id === nodeId) {
          const nextStatus: 'mastered' | 'practicing' | 'locked' =
            n.status === 'mastered' ? 'practicing' : 'mastered';
          const nextPct = nextStatus === 'mastered' ? 100 : 50;
          return { ...n, status: nextStatus, masteryPercentage: nextPct };
        }
        return n;
      });

      // Check if domain is newly 100% mastered
      const isDomainFullyMastered = nextNodes.every((n) => n.status === 'mastered');
      if (isDomainFullyMastered) {
        // Find matching badge
        const matchingBadge = badges.find(
          (b) =>
            b.category.includes(d.title.slice(0, 4)) ||
            b.title.includes(d.title.slice(0, 2))
        );
        if (matchingBadge && !matchingBadge.isUnlocked) {
          newlyUnlockedBadge = {
            ...matchingBadge,
            isUnlocked: true,
            unlockedAt: new Date().toISOString().slice(0, 10),
          };
        }
      }

      return { ...d, nodes: nextNodes };
    });

    setDomains(nextDomains);

    // Update mastered topics array in user diagnostics
    const updatedMasteredTitles = nextDomains
      .flatMap((d) => d.nodes)
      .filter((n) => n.status === 'mastered')
      .map((n) => n.title);

    onUpdateDiagnostics({
      ...diagnostics,
      masteredTopics: updatedMasteredTitles,
    });

    if (newlyUnlockedBadge) {
      setBadges((prev) =>
        prev.map((b) => (b.id === newlyUnlockedBadge!.id ? newlyUnlockedBadge! : b))
      );
      setCelebratingBadge(newlyUnlockedBadge);
      setIsBadgeModalOpen(true);
    }
  };

  const getDomainIcon = (iconName: string) => {
    switch (iconName) {
      case 'Box':
        return Box;
      case 'Gauge':
        return Gauge;
      case 'Zap':
        return Zap;
      case 'Wind':
        return Wind;
      case 'MessageSquare':
        return MessageSquare;
      default:
        return Cpu;
    }
  };

  // Custom Dark Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-cyan-500/50 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1 font-mono">
          <p className="text-cyan-300 font-bold border-b border-slate-800 pb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span>日期：{label}</span>
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <strong className="text-slate-100">{entry.value}</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto w-full min-w-0">
      
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden litho-scanner-overlay litho-laser-line shrink-strict">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-6 flex-wrap relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-black">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>晶圓維修成就樹與技能地圖 (Fab Skill Tree)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight font-mono">
              FSE 設備維修專業 Topic 成就點陣圖
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              根據無塵室五大高頻領域（FOUP、真空、RF 電漿、MFC 特氣、Alarm 交接）繪製技術節點。點擊維修 Topic 進行 SVO 精通認證，即時查看動態掌握進度條與視覺化學習趨勢！
            </p>
          </div>

          {/* Overall Mastery Gauge with Dynamic Animated Bar */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 min-w-[220px] text-center space-y-2 shadow-inner shrink-0">
            <span className="text-[11px] font-mono font-extrabold text-slate-400 block uppercase tracking-wider">
              整體 Topic 精通總進度
            </span>
            <div className="text-3xl font-black font-mono text-amber-400 flex items-center justify-center gap-1">
              <span>{overallMasteryPct}%</span>
              <Trophy className="w-6 h-6 text-yellow-400 fill-yellow-400/20 animate-pulse" />
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800 p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallMasteryPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="bg-gradient-to-r from-amber-400 via-yellow-400 to-cyan-400 h-full rounded-full shadow-lg shadow-amber-400/30"
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono block">
              已認證 {masteredNodesCount} / {allNodes.length} 個維修單元
            </span>
          </div>
        </div>
      </div>

      {/* LEARNING VISUALIZATION DASHBOARD (RECHARTS) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-2xl backdrop-blur-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base sm:text-lg font-black text-slate-100 font-mono">
                學習成果與練習趨勢視覺化 (Visual Learning Analytics)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              透過 Recharts 繪製總學習字數成長曲線與每日練習頻率分佈圖
            </p>
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setChartTimeframe('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                chartTimeframe === '7days'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              最近 7 天
            </button>
            <button
              onClick={() => setChartTimeframe('14days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                chartTimeframe === '14days'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              最近 14 天
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-1 shadow-inner">
            <span className="text-[10px] text-slate-400 font-mono block">累積掌握總字數</span>
            <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300">
              {trendData[trendData.length - 1]?.總學習字數 || 24} <span className="text-xs text-slate-500 font-normal">字</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +18% 本週成長
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-1 shadow-inner">
            <span className="text-[10px] text-slate-400 font-mono block">累積實戰練習句數</span>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-300">
              {diagnostics.totalSentencesPracticed || 32} <span className="text-xs text-slate-500 font-normal">句</span>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-0.5">
              <Activity className="w-3 h-3" /> SVO 語序拆解
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-1 shadow-inner">
            <span className="text-[10px] text-slate-400 font-mono block">已精通維修 Topics</span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-300">
              {masteredNodesCount} <span className="text-xs text-slate-500 font-normal">/ {allNodes.length}</span>
            </div>
            <span className="text-[10px] text-amber-400 font-mono">
              ★ {overallMasteryPct}% 完成度
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-1 shadow-inner">
            <span className="text-[10px] text-slate-400 font-mono block">口說發音均分</span>
            <div className="text-xl sm:text-2xl font-black font-mono text-indigo-300">
              {diagnostics.speechScoreAverage || 88} <span className="text-xs text-slate-500 font-normal">分</span>
            </div>
            <span className="text-[10px] text-indigo-400 font-mono">
              FSE 標準美式校正
            </span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          
          {/* Chart 1: Cumulative Words Trend (Area Chart) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-200 font-mono flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>總學習字數累積成長曲線</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">單位: 單字量</span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="總學習字數"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#cyanGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="精通專業術語"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#amberGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Daily Practice Frequency (Bar Chart) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-200 font-mono flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <span>每日維修句型練習頻率與語音測試</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">單位: 次數</span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={frequencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="句型練習次數"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="語音發音校正"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* Main Domains Skill Tree Grid with Dynamic Progress Bars */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-lg font-black text-slate-100 font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>無塵室五大維修領域 Topic 節點與動態進度 (Circuit Skill Graph)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            共 {domains.length} 大核心領域
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {domains.map((domain) => {
            const DomainIcon = getDomainIcon(domain.iconName);
            const domainMasteredCount = domain.nodes.filter((n) => n.status === 'mastered').length;
            const domainPct = Math.round((domainMasteredCount / domain.nodes.length) * 100);

            return (
              <div
                key={domain.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between backdrop-blur-sm relative overflow-hidden group"
              >
                <div className="space-y-3">
                  {/* Domain Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-cyan-400 group-hover:scale-105 transition-transform">
                        <DomainIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-100 font-mono">
                          {domain.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono italic block">
                          {domain.englishTitle}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-1 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-mono font-black shrink-0">
                      {domainPct}% 完成
                    </span>
                  </div>

                  {/* DOMAIN DYNAMIC PROGRESS BAR */}
                  <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-850">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400 font-bold">Topic 掌握進度條：</span>
                      <span className="text-cyan-300 font-bold">{domainMasteredCount} / {domain.nodes.length} 關</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${domainPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          domainPct === 100
                            ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-sm shadow-emerald-400/30'
                            : domainPct >= 50
                            ? 'bg-gradient-to-r from-cyan-400 to-indigo-500'
                            : 'bg-gradient-to-r from-amber-400 to-orange-500'
                        }`}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    {domain.description}
                  </p>

                  {/* Skill Nodes List with individual dynamic bars */}
                  <div className="space-y-2 pt-1">
                    {domain.nodes.map((node) => {
                      const isMastered = node.status === 'mastered';
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                            isMastered
                              ? 'bg-slate-950 border-emerald-500/60 shadow-sm shadow-emerald-500/10'
                              : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
                                  isMastered
                                    ? 'bg-emerald-400 text-slate-950'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {isMastered ? <CheckCircle2 className="w-4 h-4 stroke-[3]" /> : node.level}
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-black text-slate-200 truncate">
                                  {node.title}
                                </h5>
                                <span className="text-[10px] text-slate-400 font-mono truncate block">
                                  {node.svoPattern}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleNodeMastery(node.id);
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-extrabold transition-all cursor-pointer shrink-0 ${
                                isMastered
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                                  : 'bg-slate-800 text-cyan-300 hover:bg-cyan-400 hover:text-slate-950'
                              }`}
                            >
                              {isMastered ? '已精通' : '標記熟練'}
                            </button>
                          </div>

                          {/* Node Mastered Mini Progress indicator */}
                          <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isMastered ? 'bg-emerald-400 w-full' : 'bg-slate-800 w-0'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Progress Bar Footer */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>階段進度: {domainMasteredCount} / {domain.nodes.length}</span>
                  <span className="text-cyan-400 font-bold">查看維修細節 →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestone Badges Collection Gallery */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-slate-100 font-mono">
              晶圓維修榮譽勳章陳列館 (Milestone Badges)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            已解鎖 {badges.filter((b) => b.isUnlocked).length} / {badges.length} 面勳章
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              onClick={() => {
                if (badge.isUnlocked) {
                  setCelebratingBadge(badge);
                  setIsBadgeModalOpen(true);
                }
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 flex flex-col justify-between relative overflow-hidden ${
                badge.isUnlocked
                  ? 'bg-slate-950 border-amber-400/80 shadow-lg hover:scale-105'
                  : 'bg-slate-950/40 border-slate-800 opacity-60 grayscale'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded">
                  {badge.category}
                </span>
                {badge.isUnlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-500" />
                )}
              </div>

              <div className="space-y-1 py-1">
                <h4 className="text-xs font-black text-slate-100 font-mono">
                  {badge.title}
                </h4>
                <p className="text-[10px] text-slate-400 line-clamp-2">
                  {badge.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-cyan-300 font-bold flex items-center justify-between">
                <span>{badge.isUnlocked ? `解鎖於 ${badge.unlockedAt}` : '尚未解鎖'}</span>
                {badge.isUnlocked && <span>點擊檢視卡片 →</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Node Detail Inspector Modal */}
      <AnimatePresence>
        {selectedNode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-lg bg-slate-900 border-2 border-cyan-400/80 rounded-3xl p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    [{selectedNode.domainName}]
                  </span>
                  <h3 className="text-lg font-black text-slate-100 font-mono">
                    {selectedNode.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                >
                  關閉
                </button>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 font-mono">無塵室維修情境：</span>
                  <p className="text-xs font-black text-slate-200">
                    {selectedNode.scenario}
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-400 font-mono">拆解 SVO 核心結構：</span>
                    <button
                      onClick={() => speakEnglish(selectedNode.svoPattern, speechSpeed)}
                      className="text-xs font-bold text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      朗讀範例
                    </button>
                  </div>
                  <div className="text-sm font-mono font-black text-slate-100 bg-slate-900 p-2.5 rounded-xl text-center border border-slate-800">
                    {selectedNode.svoPattern}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => {
                    handleToggleNodeMastery(selectedNode.id);
                    setSelectedNode(null);
                  }}
                  className={`w-full py-3 rounded-2xl font-black text-xs cursor-pointer shadow-lg transition-all hover:scale-[1.02] active:scale-95 ${
                    selectedNode.status === 'mastered'
                      ? 'bg-slate-800 text-slate-300 border border-slate-700'
                      : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                  }`}
                >
                  {selectedNode.status === 'mastered' ? '取消熟練標記' : '一鍵標記為【已精通 Topic】'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Celebratory Milestone Badge Modal */}
      <MilestoneBadgeModal
        badge={celebratingBadge}
        isOpen={isBadgeModalOpen}
        onClose={() => setIsBadgeModalOpen(false)}
      />

    </div>
  );
};
