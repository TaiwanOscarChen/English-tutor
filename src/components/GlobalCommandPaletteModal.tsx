import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  X,
  Volume2,
  Sparkles,
  Zap,
  Layers,
  Sliders,
  ShieldAlert,
  Gamepad2,
  Bookmark,
  ArrowRight,
  FileText,
  ShieldCheck,
  Cpu,
  Car,
  Activity
} from 'lucide-react';
import { FAB_VOCAB } from '../data/fabVocab';
import { PRESET_ARTICLES } from '../data/presetArticles';
import { PRESET_LESSONS } from '../data/presetLessons';
import { speakEnglish } from '../utils/speech';
import { playClickSound, playLaserScanSound } from '../utils/audioEffects';

interface GlobalCommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechSpeed: number;
  onNavigateTab: (tab: 'daily' | 'shadowing' | 'drive' | 'vendors' | 'knowledge', subTab?: string) => void;
  onOpenOfflineModal: () => void;
  onOpenEmergencyModal: () => void;
  onOpenScenarioModal: () => void;
  onOpenMatchGameModal: () => void;
  onOpenVoiceSettings: () => void;
  onOpenSystemHealth?: () => void;
  onOpenDecomposerModal?: () => void;
  onOpenErrorCodeModal?: () => void;
  onSelectLesson?: (lessonId: string) => void;
}

export const GlobalCommandPaletteModal: React.FC<GlobalCommandPaletteModalProps> = ({
  isOpen,
  onClose,
  speechSpeed,
  onNavigateTab,
  onOpenOfflineModal,
  onOpenEmergencyModal,
  onOpenScenarioModal,
  onOpenMatchGameModal,
  onOpenVoiceSettings,
  onOpenSystemHealth,
  onOpenDecomposerModal,
  onOpenErrorCodeModal,
  onSelectLesson
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Global keydown listeners for Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const query = searchQuery.trim().toLowerCase();

  // 1. Actions
  const quickActions = [
    {
      id: 'act-decomposer',
      type: 'action',
      title: 'AI 萬能句子國小拆解器 (貼上工程英文秒拆 S+V+O+注音)',
      subtitle: '遇到看不懂的機台手冊或技術文件，貼上立即拆解成國小積木與諧音',
      icon: Sparkles,
      badge: 'AI 拆句神器',
      action: () => {
        onClose();
        onOpenDecomposerModal?.();
      }
    },
    {
      id: 'act-error-code',
      type: 'action',
      title: 'AI 機台 Error Code 交接金句產生器',
      subtitle: '輸入機台 Alarm 或異常現象，自動生成 3 句極簡 Shift Handover 交接英文',
      icon: Cpu,
      badge: 'AI 故障交接',
      action: () => {
        onClose();
        onOpenErrorCodeModal?.();
      }
    },
    {
      id: 'act-drive',
      type: 'action',
      title: '無塵室通勤隨身聽 (免視線聽力與回音跟讀電台)',
      subtitle: '支援三遍連播、睡眠定時、回音倒數與車機 MediaSession 控制',
      icon: Car,
      badge: '通勤必備',
      action: () => {
        onClose();
        onNavigateTab('drive');
      }
    },
    {
      id: 'act-diagnostics',
      type: 'action',
      title: 'AI 弱點雷達診斷與成就技能樹中心',
      subtitle: '分析 SVO 積木與口說停頓熱點，一鍵生成 3 句針對性補強特訓與匯出報告',
      icon: Activity,
      badge: 'AI 診斷補強',
      action: () => {
        onClose();
        onNavigateTab('knowledge', 'diagnostics');
      }
    },
    {
      id: 'act-bookmarks',
      type: 'action',
      title: '個人晶圓收藏錦囊庫 (集中複習與連續播放)',
      subtitle: '檢視所有收藏的重點句型，支援一鍵連續朗讀與匯出筆記',
      icon: Bookmark,
      badge: '收藏錦囊',
      action: () => {
        onClose();
        onNavigateTab('knowledge', 'bookmarks');
      }
    },
    {
      id: 'act-shadowing',
      type: 'action',
      title: 'AI 口語跟讀與發音評測中心 (麥克風即時打分)',
      subtitle: '即時評測 EUV、FOUP、真空外洩、機台交接流利度與準確分',
      icon: Sparkles,
      badge: 'PRO 升級',
      action: () => {
        onClose();
        onNavigateTab('shadowing');
      }
    },
    {
      id: 'act-vendors',
      type: 'action',
      title: '五大製程設備專區（曝光／蝕刻／薄膜／量測／光學檢測）',
      subtitle: '曝光、蝕刻、薄膜、量測與 AOI 光學檢測標準作業流程與技術支援模擬',
      icon: Zap,
      badge: '通用設備',
      action: () => {
        onClose();
        onNavigateTab('vendors');
      }
    },
    {
      id: 'act-health',
      type: 'action',
      title: '晶圓系統強化監控中心 (AI / 語音 / 資料自癒)',
      subtitle: '即時檢測全系統健康度、AI 連線、語音發音與儲存自癒',
      icon: ShieldCheck,
      badge: '系統強化',
      action: () => {
        onClose();
        onOpenSystemHealth?.();
      }
    },
    {
      id: 'act-scenario',
      type: 'action',
      title: '無塵室實戰對話情境模擬闖關',
      subtitle: '設備交接、良率會議與大夜班應對',
      icon: Zap,
      badge: '互動模擬',
      action: () => {
        onClose();
        onOpenScenarioModal();
      }
    },
    {
      id: 'act-sos',
      type: 'action',
      title: '無塵室緊急事故應變與廣播手冊 (SOS)',
      subtitle: '氣體洩漏、HF 化學噴濺、破片處理 SOP',
      icon: ShieldAlert,
      badge: '工安求救',
      action: () => {
        onClose();
        onOpenEmergencyModal();
      }
    },
    {
      id: 'act-offline',
      type: 'action',
      title: '無塵室離線快取字卡與連續朗讀',
      subtitle: '斷網即用 150+ 專業晶圓廠單字清單',
      icon: Layers,
      badge: '無塵室離線',
      action: () => {
        onClose();
        onOpenOfflineModal();
      }
    },
    {
      id: 'act-game',
      type: 'action',
      title: '晶圓術語連連看配對遊戲',
      subtitle: '限時考驗中英術語直覺反應速度',
      icon: Gamepad2,
      badge: '趣味測驗',
      action: () => {
        onClose();
        onOpenMatchGameModal();
      }
    },
    {
      id: 'act-voice',
      type: 'action',
      title: '語音調音與發音診斷中心',
      subtitle: '調整 Speech Synthesis 語速與聲線',
      icon: Sliders,
      badge: '語音設定',
      action: () => {
        onClose();
        onOpenVoiceSettings();
      }
    }
  ].filter((act) => !query || act.title.toLowerCase().includes(query) || act.subtitle.toLowerCase().includes(query));

  // 2. Vocabularies
  const matchedVocab = FAB_VOCAB.filter(
    (v) =>
      !query ||
      v.word.toLowerCase().includes(query) ||
      v.translation.toLowerCase().includes(query) ||
      v.category.toLowerCase().includes(query) ||
      (v.memoryTrick && v.memoryTrick.toLowerCase().includes(query))
  ).slice(0, 8);

  // 3. Articles
  const matchedArticles = PRESET_ARTICLES.filter(
    (a) =>
      !query ||
      a.title.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query) ||
      a.readTime.toLowerCase().includes(query)
  ).slice(0, 4);

  // 4. Lessons
  const matchedLessons = PRESET_LESSONS.filter(
    (l) =>
      !query ||
      l.english_sentence.toLowerCase().includes(query) ||
      (l.chinese_translation && l.chinese_translation.toLowerCase().includes(query)) ||
      l.scenario.toLowerCase().includes(query)
  ).slice(0, 6);

  const totalResultsCount =
    quickActions.length + matchedVocab.length + matchedArticles.length + matchedLessons.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        className="bg-slate-900 border-2 border-cyan-400/80 rounded-3xl w-full max-w-3xl max-h-[82vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-3 shrink-0">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋晶圓廠單字 (Chamber, LOTO)、SOP 文章、實戰例句、AI 拆句工具..."
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-500 outline-none font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-lg text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 rounded-lg text-[11px] font-mono text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 cursor-pointer shrink-0"
          >
            ESC 關閉
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {totalResultsCount === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-600 opacity-50" />
              <p>查無符合 "{searchQuery}" 的晶圓廠術語或工具</p>
              <p className="text-[11px] text-slate-500">
                試試輸入「Chamber」、「SVO」、「LOTO」、「HF」或直接使用上方「AI 萬能句子拆解器」
              </p>
              {onOpenDecomposerModal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenDecomposerModal();
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>用 AI 拆解「{searchQuery}」</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Quick Actions */}
              {quickActions.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono font-bold text-slate-400 px-2 uppercase tracking-wider">
                    ⚡ 常用快捷功能與 AI 工具 (Quick Actions)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quickActions.map((act) => {
                      const Icon = act.icon;
                      return (
                        <div
                          key={act.id}
                          onClick={() => {
                            playLaserScanSound();
                            act.action();
                          }}
                          className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800/90 hover:border-cyan-400/50 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-100 break-words group-hover:text-cyan-300">
                                {act.title}
                              </p>
                              <p className="text-[11px] text-slate-400 break-words">
                                {act.subtitle}
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                            {act.badge}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vocabularies */}
              {matchedVocab.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono font-bold text-amber-400 px-2 uppercase tracking-wider flex items-center justify-between">
                    <span>📚 晶圓廠核心單字庫 ({matchedVocab.length})</span>
                    <span className="text-[10px] text-slate-500">點擊可朗讀發音</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {matchedVocab.map((vocab) => (
                      <div
                        key={vocab.id}
                        onClick={() => {
                          playClickSound();
                          speakEnglish(vocab.word, speechSpeed);
                        }}
                        className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800/90 hover:border-amber-400/50 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs text-amber-300 break-words group-hover:text-amber-200">
                              {vocab.word}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 font-mono">
                              {vocab.taiwanPhonetic}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 break-words mt-0.5">
                            {vocab.translation}
                          </p>
                          {vocab.memoryTrick && (
                            <p className="text-[10px] text-cyan-300/90 break-words font-mono mt-0.5">
                              💡 {vocab.memoryTrick}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            speakEnglish(vocab.word, speechSpeed);
                          }}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-amber-400 hover:text-slate-950 text-slate-400 transition-all shrink-0 cursor-pointer"
                          title="播放發音"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preset Articles */}
              {matchedArticles.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono font-bold text-cyan-400 px-2 uppercase tracking-wider">
                    📄 無塵室 SOP 專題文章 ({matchedArticles.length})
                  </div>
                  <div className="space-y-2">
                    {matchedArticles.map((article) => (
                      <div
                        key={article.id}
                        onClick={() => {
                          playLaserScanSound();
                          onClose();
                          onNavigateTab('knowledge', 'articles');
                        }}
                        className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-400/50 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-100 break-words group-hover:text-cyan-300">
                              {article.title}
                            </p>
                            <p className="text-[11px] text-slate-400 break-words">
                              {article.category} • {article.readTime}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preset Lessons */}
              {matchedLessons.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono font-bold text-emerald-400 px-2 uppercase tracking-wider flex items-center justify-between">
                    <span>🎯 每日實戰句型 ({matchedLessons.length})</span>
                    <span className="text-[10px] text-slate-500">點擊直接跳轉至該關卡教材</span>
                  </div>
                  <div className="space-y-2">
                    {matchedLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        onClick={() => {
                          playClickSound();
                          if (onSelectLesson) {
                            onSelectLesson(lesson.id);
                          }
                          speakEnglish(lesson.english_sentence, speechSpeed);
                          onClose();
                        }}
                        className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-400/50 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                              {lesson.scenario.replace(/^🎬\s*情境：\s*/, '')}
                            </span>
                            <p className="font-mono text-xs font-bold text-emerald-300 break-words">
                              {lesson.english_sentence}
                            </p>
                          </div>
                          <p className="text-xs text-slate-300 break-words mt-0.5">
                            {lesson.chinese_translation}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playClickSound();
                              speakEnglish(lesson.english_sentence, speechSpeed);
                            }}
                            className="p-1.5 rounded-xl bg-slate-900 hover:bg-emerald-400 hover:text-slate-950 text-slate-400 transition-all cursor-pointer"
                            title="僅試聽發音"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-300" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span>快捷鍵：</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px]">
              ⌘K / Ctrl+K
            </kbd>
          </div>
          <span>科技英文 ✕ 國小拆解法</span>
        </div>
      </motion.div>
    </div>
  );
};
