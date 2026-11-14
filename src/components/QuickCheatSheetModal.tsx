import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  Zap,
  Volume2,
  Copy,
  Check,
  AlertTriangle,
  Radio,
  List,
  Sparkles,
  Play,
  ShieldAlert,
  Sliders,
  Flame,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { speakEnglish, cancelSpeech } from '../utils/speech';
import { playClickSound, playLaserScanSound, playSuccessChime } from '../utils/audioEffects';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getSentenceKKPhonetic } from '../utils/wordDictionary';

interface QuickCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechSpeed: number;
}

interface CheatPhrase {
  id: string;
  category: string;
  soundboardTag: 'alarm' | 'troubleshoot' | 'safety' | 'normal' | 'handover';
  english: string;
  chinese: string;
  phonetic: string;
  svo: string;
}

const CHEAT_PHRASES: CheatPhrase[] = [
  {
    id: 'c1',
    category: '機台警報與異常',
    soundboardTag: 'alarm',
    english: 'Hold the lot immediately.',
    chinese: '立即扣批停線！',
    phonetic: '後爾德 ｜ 德 ｜ 樂特 ｜ 伊咪迪爾特利',
    svo: 'Hold (動) + the lot (名) + immediately (副)'
  },
  {
    id: 'c2',
    category: '機台警報與異常',
    soundboardTag: 'alarm',
    english: 'The alarm light is on.',
    chinese: '警報紅燈正亮著。',
    phonetic: '德 ｜ 阿拉姆 ｜ 賴特 ｜ 伊斯 ｜ 昂',
    svo: 'The alarm light (主) + is (動) + on (補)'
  },
  {
    id: 'c3',
    category: '機台警報與異常',
    soundboardTag: 'alarm',
    english: 'Interlock tripped due to pressure alarm.',
    chinese: '因壓力異常觸發機台互鎖停機。',
    phonetic: '因特樂克 ｜ 翠普特 ｜ 丟 ｜ 吐 ｜ 普瑞雪 ｜ 阿拉姆',
    svo: 'Interlock (主) + tripped (動) + due to pressure alarm (狀)'
  },
  {
    id: 'c4',
    category: '機台警報與異常',
    soundboardTag: 'alarm',
    english: 'Abort process and purge N2.',
    chinese: '終止製程並通入氮氣置換！',
    phonetic: '阿波特 ｜ 普羅賽斯 ｜ 恩德 ｜ 珀吉 ｜ 恩-吐',
    svo: 'Abort (動) + process (名) + and + purge (動) + N2 (名)'
  },
  {
    id: 'c5',
    category: '元件校正與更換',
    soundboardTag: 'troubleshoot',
    english: 'I check the error code.',
    chinese: '我檢查機台錯誤碼。',
    phonetic: '愛 ｜ 切克 ｜ 德 ｜ 挨惹扣德',
    svo: 'I (主) + check (動) + the (橋) + error code (名)'
  },
  {
    id: 'c6',
    category: '元件校正與更換',
    soundboardTag: 'troubleshoot',
    english: 'Vacuum leak detected in chamber A.',
    chinese: '第一號腔體偵測到真空洩漏。',
    phonetic: '發克優姆 ｜ 力克 ｜ 迪泰克特 ｜ 陰 ｜ 切姆伯 ｜ ㄟ',
    svo: 'Vacuum leak (主) + detected (動) + in chamber A (介)'
  },
  {
    id: 'c7',
    category: '晶圓傳輸與對位',
    soundboardTag: 'troubleshoot',
    english: 'Wafer broken in transfer chamber.',
    chinese: '晶圓在傳輸腔內破片碎裂！',
    phonetic: '威弗 ｜ 布羅肯 ｜ 陰 ｜ 穿斯弗 ｜ 切姆伯',
    svo: 'Wafer (主) + broken (動) + in transfer chamber (介)'
  },
  {
    id: 'c8',
    category: '元件校正與更換',
    soundboardTag: 'troubleshoot',
    english: 'Swap RF generator and match network.',
    chinese: '更換射頻產生器與匹配箱。',
    phonetic: '斯挖普 ｜ 阿弗 ｜ 哲內瑞特 ｜ 恩德 ｜ 妹區 ｜ 網路',
    svo: 'Swap (動) + RF generator and match network (名)'
  },
  {
    id: 'c9',
    category: '工安上鎖與安全',
    soundboardTag: 'safety',
    english: 'I lock the power valve.',
    chinese: '我上鎖電源閥門。',
    phonetic: '愛 ｜ 樂克 ｜ 德 ｜ 趴爾 ｜ 閥爾夫',
    svo: 'I (主) + lock (動) + the power valve (名)'
  },
  {
    id: 'c10',
    category: '工安上鎖與安全',
    soundboardTag: 'safety',
    english: 'Please turn off the power.',
    chinese: '請關閉主電源開關。',
    phonetic: '普利斯 ｜ 特恩 ｜ 歐夫 ｜ 德 ｜ 趴爾',
    svo: 'Please + turn off (動) + the power (名)'
  },
  {
    id: 'c11',
    category: '工安上鎖與安全',
    soundboardTag: 'safety',
    english: 'You reset the emergency button.',
    chinese: '你重置緊急停止按鈕。',
    phonetic: '優 ｜ 瑞賽特 ｜ 德 ｜ 伊摸哲西 ｜ 拔騰',
    svo: 'You (主) + reset (動) + the emergency button (名)'
  },
  {
    id: 'c12',
    category: '定期保養與放片',
    soundboardTag: 'normal',
    english: 'The PM is finished.',
    chinese: '定期保養已順利完成。',
    phonetic: '德 ｜ 披-恩 ｜ 伊斯 ｜ 費尼許特',
    svo: 'The PM (主) + is (動) + finished (補)'
  },
  {
    id: 'c13',
    category: '定期保養與放片',
    soundboardTag: 'normal',
    english: 'You can release the tool.',
    chinese: '你可以放片運轉釋放機台了。',
    phonetic: '優 ｜ 看 ｜ 瑞利斯 ｜ 德 ｜ 吐爾',
    svo: 'You (主) + release (動) + the tool (名)'
  },
  {
    id: 'c14',
    category: '定期保養與放片',
    soundboardTag: 'normal',
    english: 'Particle count passed specification.',
    chinese: '微塵顆粒數已符合標準規格。',
    phonetic: '帕提扣 ｜ 康特 ｜ 帕斯特 ｜ 斯佩克',
    svo: 'Particle count (主) + passed (動) + spec (名)'
  },
  {
    id: 'c15',
    category: '晶圓傳輸與對位',
    soundboardTag: 'troubleshoot',
    english: 'The engineer aligns the wafer.',
    chinese: '工程師重新對齊晶圓。',
    phonetic: '德 ｜ 因吉妮爾 ｜ 額賴恩斯 ｜ 德 ｜ 威弗',
    svo: 'The engineer (主) + aligns (動) + the wafer (名)'
  },
  {
    id: 'c16',
    category: '交接班與回報',
    soundboardTag: 'handover',
    english: 'I update the service report.',
    chinese: '我更新線上維修交接報告。',
    phonetic: '愛 ｜ 阿普德特 ｜ 德 ｜ 瑟維斯 ｜ 瑞波特',
    svo: 'I (主) + update (動) + the service report (名)'
  },
  {
    id: 'c17',
    category: '交接班與回報',
    soundboardTag: 'handover',
    english: 'Request senior engineer support.',
    chinese: '請求資深工程專家支援。',
    phonetic: '瑞奎斯特 ｜ 希尼爾 ｜ 恩居尼爾 ｜ 瑟波特',
    svo: 'Request (動) + senior engineer support (名)'
  },
  {
    id: 'c18',
    category: '元件校正與更換',
    soundboardTag: 'troubleshoot',
    english: 'We calibrate the MFC valve.',
    chinese: '我們校正質量流量控制閥。',
    phonetic: '威 ｜ 柯愛利伯瑞特 ｜ 德 ｜ 恩弗西 ｜ 閥爾夫',
    svo: 'We (主) + calibrate (動) + the MFC valve (名)'
  },
  {
    id: 'c19',
    category: '元件校正與更換',
    soundboardTag: 'troubleshoot',
    english: 'He replaces the cryopump.',
    chinese: '他更換低溫真空幫浦。',
    phonetic: '嘻 ｜ 瑞普雷斯 ｜ 德 ｜ 快歐胖普',
    svo: 'He (主) + replaces (動) + the cryopump (名)'
  },
  {
    id: 'c20',
    category: '定期保養與放片',
    soundboardTag: 'normal',
    english: 'I test the chamber leak rate.',
    chinese: '我檢測腔體的真空漏氣率。',
    phonetic: '愛 ｜ 泰斯特 ｜ 德 ｜ 切姆伯 ｜ 力克 ｜ 瑞特',
    svo: 'I (主) + test (動) + the chamber leak rate (名)'
  }
];

export const QuickCheatSheetModal: React.FC<QuickCheatSheetModalProps> = ({
  isOpen,
  onClose,
  speechSpeed: initialSpeed
}) => {
  const [viewMode, setViewMode] = useState<'soundboard' | 'list'>('soundboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeSpeed, setActiveSpeed] = useState<number>(initialSpeed || 0.85);

  if (!isOpen) return null;

  const tagOptions = [
    { id: 'all', label: '全部廣播' },
    { id: 'alarm', label: '🔴 停機報警', color: 'text-rose-400' },
    { id: 'troubleshoot', label: '🟡 異常排除', color: 'text-amber-400' },
    { id: 'safety', label: '🔒 工安上鎖', color: 'text-purple-400' },
    { id: 'normal', label: '🟢 釋放正常', color: 'text-emerald-400' },
    { id: 'handover', label: '🔵 交接回報', color: 'text-cyan-400' }
  ];

  const filteredPhrases = CHEAT_PHRASES.filter((p) => {
    const matchesTag = selectedTag === 'all' || p.soundboardTag === selectedTag;
    const matchesSearch =
      p.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.chinese.includes(searchTerm) ||
      p.phonetic.includes(searchTerm);
    return matchesTag && matchesSearch;
  });

  const handlePlay = (phrase: CheatPhrase) => {
    playLaserScanSound();
    cancelSpeech();
    setPlayingId(phrase.id);
    speakEnglish(phrase.english, activeSpeed);
    setTimeout(() => {
      setPlayingId(null);
    }, 2400);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    playSuccessChime();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border-2 border-amber-400/60 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100 relative shrink-strict"
        >
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl text-slate-950 font-black shadow-md shrink-0 ring-2 ring-amber-400/30">
                <Radio className="w-5 h-5 text-slate-950 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-white">
                    無塵室即時口報發聲板 & 金句快查
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-[10px] font-mono text-cyan-300 font-bold hidden sm:inline">
                    20 組極速廣播
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  一鍵即發清澈聲線廣播、S-V-O 文法對齊、KK音標與台味諧音速讀
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl text-xs">
                <button
                  onClick={() => {
                    playClickSound();
                    setViewMode('soundboard');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'soundboard'
                      ? 'bg-amber-400 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">音效板</span>
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    setViewMode('list');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-amber-400 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">清單模式</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar & Speed Adjuster */}
          <div className="p-3 bg-slate-950/80 border-b border-slate-800 space-y-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="快速檢索：停機, 保養, 閥門, Vacuum, Lot, Report..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-sans shadow-inner"
                />
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-1.5 py-1 rounded-xl shrink-0">
                <span className="text-[10px] text-slate-400 font-bold px-1 hidden md:inline">語速:</span>
                {[0.65, 0.85, 1.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => {
                      playClickSound();
                      setActiveSpeed(spd);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      activeSpeed === spd
                        ? 'bg-cyan-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd === 0.65 ? '0.6x 慢' : spd === 0.85 ? '0.8x 標' : '1.0x 快'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tag filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
              {tagOptions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    playClickSound();
                    setSelectedTag(t.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                    selectedTag === t.id
                      ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Soundboard Mode (Grid of 20 Interactive Radio Tiles) */}
          {viewMode === 'soundboard' && (
            <div className="p-3 sm:p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {filteredPhrases.map((phrase) => {
                  const isPlaying = playingId === phrase.id;
                  const isCopied = copiedId === phrase.id;
                  const phraseKK = getSentenceKKPhonetic(phrase.english);
                  return (
                    <motion.div
                      key={phrase.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePlay(phrase)}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2 relative overflow-hidden group shadow-md ${
                        isPlaying
                          ? 'bg-cyan-950/90 border-cyan-400 ring-2 ring-cyan-400/50 text-cyan-200'
                          : phrase.soundboardTag === 'alarm'
                          ? 'bg-slate-950 border-rose-500/40 hover:border-rose-400 text-slate-100'
                          : phrase.soundboardTag === 'safety'
                          ? 'bg-slate-950 border-purple-500/40 hover:border-purple-400 text-slate-100'
                          : phrase.soundboardTag === 'normal'
                          ? 'bg-slate-950 border-emerald-500/40 hover:border-emerald-400 text-slate-100'
                          : 'bg-slate-950 border-amber-500/40 hover:border-amber-400 text-slate-100'
                      }`}
                    >
                      {/* Top status line */}
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            phrase.soundboardTag === 'alarm'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : phrase.soundboardTag === 'safety'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : phrase.soundboardTag === 'normal'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {phrase.soundboardTag === 'alarm'
                            ? '🔴 停機警報'
                            : phrase.soundboardTag === 'safety'
                            ? '🔒 工安上鎖'
                            : phrase.soundboardTag === 'normal'
                            ? '🟢 釋放放片'
                            : '🟡 實戰處置'}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(phrase.english, phrase.id);
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="複製英文"
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {/* Main English Text */}
                      <div className="space-y-0.5">
                        <div className="text-xs sm:text-sm font-black font-mono tracking-tight text-white group-hover:text-cyan-200 transition-colors break-words">
                          {phrase.english}
                        </div>
                        <div className="text-[11px] font-bold text-amber-300 break-words">
                          {phrase.chinese}
                        </div>
                      </div>

                      {/* Phonetics & Play Button Indicator */}
                      <div className="pt-1.5 border-t border-slate-800/80 space-y-1 text-[10px]">
                        <div className="flex flex-col gap-1">
                          {phraseKK && (
                            <div className="flex items-start gap-1.5 bg-cyan-950/50 border border-cyan-500/30 rounded-md px-1.5 py-0.5">
                              <span className="px-1 py-0.2 rounded bg-cyan-500/30 text-cyan-200 font-black text-[9px] shrink-0">KK音標</span>
                              <span className="text-cyan-200 font-mono font-bold tracking-wider break-words flex-1 leading-snug">
                                {phraseKK}
                              </span>
                            </div>
                          )}
                          <div className="flex items-start gap-1.5 bg-indigo-950/50 border border-indigo-500/30 rounded-md px-1.5 py-0.5">
                            <span className="px-1 py-0.2 rounded bg-indigo-500/30 text-indigo-200 font-black text-[9px] shrink-0">注音</span>
                            <span className="text-yellow-300 font-mono font-bold tracking-wider break-words flex-1 leading-snug">
                              {(() => {
                                const zh = convertPhoneticToZhuyin(phrase.phonetic);
                                const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                                return clean ? `【 ${clean} 】` : '';
                              })()}
                            </span>
                          </div>
                          <div className="flex items-start gap-1.5 bg-emerald-950/40 border border-emerald-500/30 rounded-md px-1.5 py-0.5">
                            <span className="px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-200 font-black text-[9px] shrink-0">諧音</span>
                            <span className="text-emerald-200 font-mono font-bold tracking-wider break-words flex-1 leading-snug">
                              {(() => {
                                const clean = phrase.phonetic.trim().replace(/^【\s*|\s*】$/g, '').trim();
                                return clean ? `【 ${clean} 】` : '';
                              })()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1 font-bold text-cyan-400 pt-0.5">
                          <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-bounce text-cyan-300' : ''}`} />
                          <span className="text-[9px] font-mono">點擊發聲</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List Mode */}
          {viewMode === 'list' && (
            <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1">
              {filteredPhrases.length === 0 ? (
                <div className="py-10 text-center text-slate-400 space-y-1.5">
                  <AlertTriangle className="w-7 h-7 text-amber-400 mx-auto" />
                  <p className="text-xs font-bold">未找到符合「{searchTerm}」的金句</p>
                </div>
              ) : (
                filteredPhrases.map((phrase) => {
                  const phraseKK = getSentenceKKPhonetic(phrase.english);
                  return (
                    <div
                      key={phrase.id}
                      className="bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3 transition-all space-y-1.5 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 text-[10px] font-extrabold">
                          {phrase.category}
                        </span>
                        <span className="text-[10px] font-mono text-amber-300 font-bold">
                          {phrase.svo}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm sm:text-base font-black text-slate-100 font-mono break-words">
                            {phrase.english}
                          </div>
                          <div className="text-xs font-bold text-slate-300 mt-0.5 break-words">
                            {phrase.chinese}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handlePlay(phrase)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors cursor-pointer border border-slate-700"
                            title="朗讀英文"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopy(phrase.english, phrase.id)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
                            title="複製句型"
                          >
                            {copiedId === phrase.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 pt-0.5">
                        {phraseKK && (
                          <div className="p-2 rounded-lg bg-cyan-950/70 border-l-2 border-cyan-400 text-xs font-mono font-black text-cyan-200 tracking-wider break-words max-w-full flex items-start gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-200 text-[10px] font-bold shrink-0">KK音標</span>
                            <span className="leading-relaxed">{phraseKK}</span>
                          </div>
                        )}
                        <div className="p-2 rounded-lg bg-indigo-950/80 border-l-2 border-indigo-400 text-xs font-mono font-black text-yellow-300 tracking-wider break-words max-w-full flex items-start gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 text-[10px] font-bold shrink-0">注音</span>
                          <span className="leading-relaxed">
                            {(() => {
                              const zh = convertPhoneticToZhuyin(phrase.phonetic);
                              const clean = zh.trim().replace(/^【\s*|\s*】$/g, '').trim();
                              return clean ? `【 ${clean} 】` : '';
                            })()}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-950/60 border-l-2 border-emerald-400 text-xs font-mono font-black text-emerald-200 tracking-wider break-words max-w-full flex items-start gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[10px] font-bold shrink-0">諧音</span>
                          <span className="leading-relaxed">
                            {(() => {
                              const clean = phrase.phonetic.trim().replace(/^【\s*|\s*】$/g, '').trim();
                              return clean ? `【 ${clean} 】` : '';
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Footer */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0 text-xs text-slate-400">
            <span className="text-[11px] font-mono">
              ⚡ 點擊任意音效磚即發出清晰廣播 | 共 {filteredPhrases.length} 條核心口報
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer transition-colors text-xs"
            >
              關閉視窗
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
