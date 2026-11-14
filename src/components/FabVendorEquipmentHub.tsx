import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  Layers, 
  Wrench, 
  AlertTriangle, 
  Volume2, 
  CheckCircle2, 
  ExternalLink, 
  Radio, 
  Zap, 
  PhoneCall, 
  FileText,
  ShieldCheck,
  Flame,
  Search,
  Play,
  Square,
  Copy,
  Check
} from 'lucide-react';
import { speakEnglish, cancelSpeech } from '../utils/speech';
import { playClickSound } from '../utils/audioEffects';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getMandarinPhoneticFromSentence } from '../utils/lessonSentenceHelper';
import { getSentenceKKPhonetic, getWordKKPhonetic } from '../utils/wordDictionary';
import { InteractiveSentenceViewer } from './InteractiveSentenceViewer';

interface EquipmentCategoryData {
  id: 'aoi' | 'litho' | 'etch' | 'dep' | 'metro';
  badgeCode: string;
  systemName: string;
  category: string;
  flagshipTool: string;
  badgeColor: string;
  description: string;
  commonAlarms: {
    code: string;
    description: string;
    englishSop: string;
    chineseSop: string;
  }[];
  tacDialogues: {
    speaker: 'FSE' | 'System Specialist';
    english: string;
    chinese: string;
  }[];
  systemTerms: {
    term: string;
    kk?: string;
    phonetic: string;
    definition: string;
  }[];
}

const EQUIPMENT_DATA: EquipmentCategoryData[] = [
  {
    id: 'aoi',
    badgeCode: 'AOI',
    systemName: 'AOI 自動光學檢測',
    category: '先進封裝與基板光學檢測',
    flagshipTool: 'Substrate / C4 Bump / Underfill / OCV & OCR System',
    badgeColor: 'border-indigo-500/50 bg-indigo-950/40 text-indigo-300',
    description: '涵蓋公開通用光學檢測核心：治具板調光、基板與覆晶錫球檢測、底膠與散熱蓋檢測、字元檢測與字元辨識。',
    commonAlarms: [
      {
        code: 'ALM-AOI-01',
        description: 'Die Jump Sensor Triggered & Detect Empty Alert',
        englishSop: 'Check die jump sensor.',
        chineseSop: '檢查跳晶感測器狀態。'
      },
      {
        code: 'ALM-AOI-02',
        description: 'Light Intensity Drift & Teach Alignment Alert',
        englishSop: 'Use JIG board now.',
        chineseSop: '立即使用治具板調校。'
      }
    ],
    tacDialogues: [
      {
        speaker: 'FSE',
        english: 'Check die jump sensor.',
        chinese: '檢查跳晶感測器。'
      },
      {
        speaker: 'System Specialist',
        english: 'We tune the light.',
        chinese: '我們調整光源。'
      },
      {
        speaker: 'FSE',
        english: 'Check the C4 bump.',
        chinese: '檢查覆晶錫球。'
      }
    ],
    systemTerms: [
      { term: 'Substrate Inspection', kk: '[ˋsʌbstret ɪnˋspɛkʃən]', phonetic: '[薩布斯翠特 因斯佩克宣]', definition: '基板檢測，檢查封裝載板表面線路與外觀品質' },
      { term: 'C4 Bump Inspection', kk: '[si fɔr bʌmp ɪnˋspɛkʃən]', phonetic: '[西佛 棒普 因斯佩克宣]', definition: '錫球檢測，檢查覆晶焊接錫球高度與共面度' },
      { term: 'Underfill Inspection', kk: '[ˋʌndɚfɪl ɪnˋspɛkʃən]', phonetic: '[安德菲爾 因斯佩克宣]', definition: '底膠檢測，檢查晶片底部保護膠溢膠均勻度' }
    ]
  },
  {
    id: 'litho',
    badgeCode: 'LITHO',
    systemName: '微影光刻曝光設備',
    category: '紫外光微影與對位系統',
    flagshipTool: 'Step-and-Scan Optical Lithography System',
    badgeColor: 'border-blue-500/50 bg-blue-950/40 text-blue-300',
    description: '通用光學微影步進掃描曝光系統，利用光學鏡組與雷射定位技術，將光罩圖案轉印至晶圓光阻層。',
    commonAlarms: [
      {
        code: 'ALM-LITHO-01',
        description: 'Optical Mirror Reflectivity Drift',
        englishSop: 'We purge the chamber.',
        chineseSop: '我們吹掃真空腔體。'
      },
      {
        code: 'ALM-LITHO-02',
        description: 'Reticle Stage Alignment Alert',
        englishSop: 'I align the stage.',
        chineseSop: '我對準光罩載台。'
      }
    ],
    tacDialogues: [
      {
        speaker: 'FSE',
        english: 'Check the focus log.',
        chinese: '檢查對焦日誌。'
      },
      {
        speaker: 'System Specialist',
        english: 'I align the laser.',
        chinese: '我對準雷射光束。'
      },
      {
        speaker: 'FSE',
        english: 'We clamp the reticle.',
        chinese: '我們夾緊光罩片。'
      }
    ],
    systemTerms: [
      { term: 'Pellicle', kk: '[ˋpɛlɪkəl]', phonetic: '[配立口]', definition: '光罩防塵薄膜，防止微塵落在精密電路上' },
      { term: 'Numerical Aperture', kk: '[njuˋmɛrɪkəl ˋæpɚtʃɚ]', phonetic: '[紐梅瑞口 艾波卻]', definition: '數值孔徑，決定光學曝光系統的聚焦與解析能力' },
      { term: 'Dose Margin', kk: '[dos ˋmɑrdʒɪn]', phonetic: '[豆死 媽準]', definition: '曝光劑量寬容度，確保光阻反應均勻度' }
    ]
  },
  {
    id: 'etch',
    badgeCode: 'ETCH',
    systemName: '電漿蝕刻與去膠設備',
    category: '乾式電漿蝕刻與表面清潔',
    flagshipTool: 'Inductively Coupled Plasma Etch System',
    badgeColor: 'border-amber-500/50 bg-amber-950/40 text-amber-300',
    description: '通用電漿乾式蝕刻與清洗設備，透過射頻功率與反應氣體精確移除微影後無光阻保護的薄膜層。',
    commonAlarms: [
      {
        code: 'ALM-ETCH-01',
        description: 'RF Match Tuning Timeout Alert',
        englishSop: 'We match the frequency.',
        chineseSop: '我們匹配射頻頻率。'
      },
      {
        code: 'ALM-ETCH-02',
        description: 'Optical Window Transparency Alert',
        englishSop: 'Clean the quartz window.',
        chineseSop: '清潔石英觀測視窗。'
      }
    ],
    tacDialogues: [
      {
        speaker: 'FSE',
        english: 'Check the base pressure.',
        chinese: '檢查基礎真空度。'
      },
      {
        speaker: 'System Specialist',
        english: 'Test the throttle valve.',
        chinese: '測試節流控制閥。'
      },
      {
        speaker: 'FSE',
        english: 'We match the power.',
        chinese: '我們匹配射頻功率。'
      }
    ],
    systemTerms: [
      { term: 'ICP Plasma', kk: '[aɪ si pi ˋplæzmə]', phonetic: '[愛-吸-披 普拉茲馬]', definition: '感應耦合電漿，產生高密度離子進行非等向性垂直蝕刻' },
      { term: 'Endpoint Detection', kk: '[ˋɛndpɔɪnt dɪˋtɛkʃən]', phonetic: '[恩得朋特 滴特克宣]', definition: '終點偵測技術，透過光譜變化判斷薄膜已精準蝕刻穿透' },
      { term: 'Polymer Seasoning', kk: '[ˋpɑlɪmɚ ˋsizənɪŋ]', phonetic: '[拋利麼 吸則寧]', definition: '暖機腔體鈍化鍍膜，讓製程環境達到化學穩定平衡' }
    ]
  },
  {
    id: 'dep',
    badgeCode: 'DEP/CMP',
    systemName: '薄膜沉積與研磨設備',
    category: '氣相沉積與化學機械平坦化',
    flagshipTool: 'PVD / CVD Deposition & CMP Polishing System',
    badgeColor: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300',
    description: '涵蓋物理氣相沉積、化學氣相沉積與化學機械平坦化研磨系統，負責晶圓表面成膜與全局平坦化處理。',
    commonAlarms: [
      {
        code: 'ALM-CMP-01',
        description: 'Polishing Head Pressure Alert',
        englishSop: 'Calibrate the carrier head.',
        chineseSop: '校準晶圓研磨頭。'
      },
      {
        code: 'ALM-PVD-02',
        description: 'Deposition Uniformity Drift',
        englishSop: 'Inspect the target depth.',
        chineseSop: '檢查靶材侵蝕深度。'
      }
    ],
    tacDialogues: [
      {
        speaker: 'FSE',
        english: 'I adjust the slurry.',
        chinese: '我調整研磨液流量。'
      },
      {
        speaker: 'System Specialist',
        english: 'Check the pump tube.',
        chinese: '檢查幫浦軟管狀態。'
      },
      {
        speaker: 'FSE',
        english: 'We replace the pad.',
        chinese: '我們更換研磨墊。'
      }
    ],
    systemTerms: [
      { term: 'Slurry', kk: '[ˋslɝɪ]', phonetic: '[死樂瑞]', definition: '化學機械研磨液，內含研磨微粒與化學反應溶劑' },
      { term: 'Pad Conditioning', kk: '[pæd kənˋdɪʃənɪŋ]', phonetic: '[趴得 肯地宣寧]', definition: '鑽石碟研磨墊整修，粗化墊面以維持穩定研磨移除率' },
      { term: 'Sputtering Target', kk: '[ˋspʌtɚɪŋ ˋtɑrgɪt]', phonetic: '[死趴特林 他給特]', definition: '濺鍍金屬靶材，如鈦、銅、鈷等高純度金屬靶' }
    ]
  },
  {
    id: 'metro',
    badgeCode: 'METRO',
    systemName: '製程診斷與量測設備',
    category: '缺陷掃描與幾何疊對量測',
    flagshipTool: 'Optical Defect & Overlay Metrology System',
    badgeColor: 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300',
    description: '高解析度光學量測系統，負責晶圓表面微粒缺陷分類、層間疊對對準與關鍵尺寸量測。',
    commonAlarms: [
      {
        code: 'ALM-MET-01',
        description: 'Wafer Chuck Vacuum Alert',
        englishSop: 'Clean the chuck pins.',
        chineseSop: '清潔晶圓吸盤頂針。'
      },
      {
        code: 'ALM-MET-02',
        description: 'Defect Library Sync Alert',
        englishSop: 'Restart the image server.',
        chineseSop: '重啟影像處理伺服器。'
      }
    ],
    tacDialogues: [
      {
        speaker: 'FSE',
        english: 'We scan the wafer.',
        chinese: '我們掃描這片晶圓。'
      },
      {
        speaker: 'System Specialist',
        english: 'Check the laser balance.',
        chinese: '檢查雷射平衡狀態。'
      },
      {
        speaker: 'FSE',
        english: 'Adjust the threshold now.',
        chinese: '立即微調門檻數值。'
      }
    ],
    systemTerms: [
      { term: 'Killer Defect', kk: '[ˋkɪlɚ ˋdifɛkt]', phonetic: '[科勒 滴非克特]', definition: '致命缺陷，會導致晶片短路或斷路報廢的微粒' },
      { term: 'Overlay Error', kk: '[ˋovɚle ˋɛrɚ]', phonetic: '[歐發雷 額勒]', definition: '層間疊對誤差，上下光阻電路層之對齊偏離量' },
      { term: 'Darkfield Laser', kk: '[ˋdɑrkfild ˋlezɚ]', phonetic: '[達克菲爾得 雷則]', definition: '暗場雷射散射技術，專門捕捉超微小次微米表面微粒' }
    ]
  }
];

export const FabVendorEquipmentHub: React.FC = () => {
  const [activeVendorId, setActiveVendorId] = useState<'aoi' | 'litho' | 'etch' | 'dep' | 'metro'>('aoi');
  const [playingLineIdx, setPlayingLineIdx] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedBreakdownKey, setExpandedBreakdownKey] = useState<string | null>(null);

  const currentVendor = EQUIPMENT_DATA.find(v => v.id === activeVendorId) || EQUIPMENT_DATA[0];

  const handleSpeakLine = (text: string, idx: number) => {
    playClickSound();
    cancelSpeech();
    setIsPlayingAll(false);
    setPlayingLineIdx(idx);
    speakEnglish(text, 0.85, () => {
      setPlayingLineIdx(null);
    });
  };

  const handleTogglePlayAllDialogue = () => {
    playClickSound();
    if (isPlayingAll) {
      cancelSpeech();
      setIsPlayingAll(false);
      setPlayingLineIdx(null);
      return;
    }

    const dialogues = currentVendor.tacDialogues;
    if (!dialogues || dialogues.length === 0) return;

    setIsPlayingAll(true);
    let idx = 0;

    const speakNext = () => {
      if (idx >= dialogues.length) {
        setIsPlayingAll(false);
        setPlayingLineIdx(null);
        return;
      }
      setPlayingLineIdx(idx);
      speakEnglish(dialogues[idx].english, 0.85, () => {
        idx++;
        setTimeout(speakNext, 450);
      });
    };

    speakNext();
  };

  const handleCopyText = (text: string, key: string) => {
    playClickSound();
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {}
  };

  return (
    <div className="space-y-3 max-w-6xl mx-auto w-full min-w-0">
      
      {/* Vendor Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/80 border border-cyan-500/30 rounded-2xl p-4 shadow-xl litho-laser-line">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono text-[10px] font-bold flex items-center gap-1">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>五大核心設備</span>
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white font-mono mt-1 flex items-center gap-2">
              <span>機台警報與設備技術支援對話</span>
            </h2>
          </div>
        </div>
      </div>

      {/* 5 System Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {EQUIPMENT_DATA.map((vendor) => {
          const isSelected = activeVendorId === vendor.id;
          return (
            <button
              key={vendor.id}
              onClick={() => {
                playClickSound();
                cancelSpeech();
                setIsPlayingAll(false);
                setPlayingLineIdx(null);
                setActiveVendorId(vendor.id);
              }}
              className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-300'
                  : 'bg-slate-950/70 hover:bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${vendor.badgeColor}`}>
                  {vendor.badgeCode}
                </span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </div>
              <div className="mt-2 text-xs sm:text-sm font-black font-mono text-white break-words leading-snug">
                {vendor.systemName}
              </div>
              <div className="text-[10px] text-slate-400 break-words leading-snug mt-0.5">
                {vendor.category}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active System Details Console */}
      <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
        
        {/* System Header Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white font-mono">
                {currentVendor.systemName}
              </h3>
              <span className="text-xs text-cyan-300 font-mono">
                / {currentVendor.category}
              </span>
            </div>
            <div className="text-xs text-amber-300 font-mono mt-0.5 flex items-center gap-1.5">
              <span className="text-slate-400">通用系統架構：</span>
              <span className="font-bold">{currentVendor.flagshipTool}</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 max-w-md text-left sm:text-right">
            {currentVendor.description}
          </p>
        </div>

        {/* Section 1: Technical Support Simulation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
              <span>技術支援極簡對話</span>
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePlayAllDialogue}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                  isPlayingAll
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/30'
                }`}
              >
                {isPlayingAll ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                <span>{isPlayingAll ? '停止' : '連播對話'}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950/80 rounded-xl border border-slate-800/90 p-3 space-y-2.5">
            {currentVendor.tacDialogues.map((dlg, dIdx) => {
              const copyKey = `dlg-${activeVendorId}-${dIdx}`;
              const breakdownKey = `dlg-bd-${activeVendorId}-${dIdx}`;
              const isCopied = copiedKey === copyKey;
              const isExpanded = expandedBreakdownKey === breakdownKey;
              const dlgKK = getSentenceKKPhonetic(dlg.english);
              const dlgHomophone = getMandarinPhoneticFromSentence(dlg.english)
                .replace(/^【\s*|\s*】$/g, '')
                .trim();
              const dlgZhuyin = convertPhoneticToZhuyin(dlgHomophone)
                .replace(/^【\s*|\s*】$/g, '')
                .trim();
              return (
                <div 
                  key={dIdx} 
                  className={`p-3 rounded-xl border transition-all space-y-1.5 ${
                    playingLineIdx === dIdx
                      ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/50'
                      : dlg.speaker === 'FSE'
                      ? 'bg-slate-900/80 border-cyan-500/30'
                      : 'bg-indigo-950/30 border-indigo-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      dlg.speaker === 'FSE'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {dlg.speaker === 'FSE' ? 'FSE 工程師' : '設備技術專家'}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setExpandedBreakdownKey(isExpanded ? null : breakdownKey);
                        }}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          isExpanded
                            ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black'
                            : 'bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border-cyan-500/40'
                        }`}
                        title="展開零基礎逐字導讀字卡"
                      >
                        {isExpanded ? '收起' : '拆解'}
                      </button>

                      <button
                        onClick={() => handleCopyText(`${dlg.english}\n${dlg.chinese}`, copyKey)}
                        className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-xs transition-all cursor-pointer"
                        title="複製對話台詞"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => speakEnglish(dlg.english, 0.68)}
                        className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer"
                        title="0.68x 零基礎慢速朗讀"
                      >
                        慢讀
                      </button>

                      <button
                        onClick={() => handleSpeakLine(dlg.english, dIdx)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          playingLineIdx === dIdx
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                        title="聆聽發音"
                      >
                        <Volume2 className={`w-3.5 h-3.5 ${playingLineIdx === dIdx ? 'animate-bounce text-cyan-400' : ''}`} />
                        <span className="text-[10px]">發音</span>
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <InteractiveSentenceViewer
                      sentence={dlg.english}
                      chinese={dlg.chinese}
                      speechSpeed={0.82}
                    />
                  ) : (
                    <p className="text-xs sm:text-sm font-semibold text-slate-100 font-mono leading-relaxed break-words">
                      {dlg.english}
                    </p>
                  )}
                  <p className="text-xs text-slate-200 font-medium flex items-start gap-1.5">
                    <span className="text-cyan-400 font-bold shrink-0">↳ 中文：</span>
                    <span>{dlg.chinese}</span>
                  </p>
                  <div className="pt-1.5 border-t border-slate-800/80 space-y-1 text-[11px] font-mono">
                    <div className="text-cyan-300 break-words">
                      <span className="text-slate-400">KK音標：</span>{dlgKK}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      <div className="text-emerald-300 break-words">
                        <span className="text-slate-400">注音：</span>【 {dlgZhuyin} 】
                      </div>
                      <div className="text-amber-300 break-words">
                        <span className="text-slate-400">諧音：</span>【 {dlgHomophone} 】
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Common Alarm Codes & English Recovery SOP */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>警報與 SOP 處置</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {currentVendor.commonAlarms.map((alarm, aIdx) => {
              const copyKey = `alarm-${activeVendorId}-${aIdx}`;
              const alarmBreakdownKey = `alarm-bd-${activeVendorId}-${aIdx}`;
              const isCopied = copiedKey === copyKey;
              const isAlarmExpanded = expandedBreakdownKey === alarmBreakdownKey;
              return (
                <div key={aIdx} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-rose-400 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30">
                        {alarm.code}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyText(`[${alarm.code}] ${alarm.description}\nSOP: ${alarm.englishSop}\n${alarm.chineseSop}`, copyKey)}
                          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
                          title="複製報錯代碼與 SOP"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          ALARM
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-slate-100 pt-0.5">
                      {alarm.description}
                    </div>
                  </div>
                  
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">SOP 處置:</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => setExpandedBreakdownKey(isAlarmExpanded ? null : alarmBreakdownKey)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer border ${
                            isAlarmExpanded
                              ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                              : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30'
                          }`}
                          title="展開逐字中文、注音與諧音拆解"
                        >
                          {isAlarmExpanded ? '收合' : '拆解'}
                        </button>
                        <button
                          onClick={() => speakEnglish(alarm.englishSop, 0.68)}
                          className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                          title="0.68x 慢速朗讀 SOP"
                        >
                          慢讀
                        </button>
                        <button
                          onClick={() => handleSpeakLine(alarm.englishSop, 100 + aIdx)}
                          className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="朗讀 SOP 英文"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>SOP</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-mono text-emerald-200/95 leading-relaxed break-words">
                      {alarm.englishSop}
                    </p>
                    <p className="text-[11px] text-slate-200 font-medium flex items-start gap-1">
                      <span className="text-emerald-400 font-bold shrink-0">↳ 中文：</span>
                      <span>{alarm.chineseSop}</span>
                    </p>
                    {(() => {
                      const sopKK = getSentenceKKPhonetic(alarm.englishSop);
                      const sopHomophone = getMandarinPhoneticFromSentence(alarm.englishSop)
                        .replace(/^【\s*|\s*】$/g, '')
                        .trim();
                      const sopZhuyin = convertPhoneticToZhuyin(sopHomophone)
                        .replace(/^【\s*|\s*】$/g, '')
                        .trim();
                      return (
                        <div className="pt-1 border-t border-slate-800/80 space-y-0.5 text-[10px] font-mono">
                          <div className="text-cyan-300 break-words">
                            <span className="text-slate-400">KK音標：</span>{sopKK}
                          </div>
                          <div className="text-emerald-300 break-words">
                            <span className="text-slate-400">注音：</span>【 {sopZhuyin} 】
                          </div>
                          <div className="text-amber-300 break-words">
                            <span className="text-slate-400">諧音：</span>【 {sopHomophone} 】
                          </div>
                        </div>
                      );
                    })()}
                    {isAlarmExpanded && (
                      <div className="pt-1.5">
                        <InteractiveSentenceViewer
                          sentence={alarm.englishSop}
                          chinese={alarm.chineseSop}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: System Jargon & Acronym Flashcards */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>設備核心術語</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {currentVendor.systemTerms.map((term, tIdx) => {
              const cleanPhonetic = term.phonetic.replace(/^\[|\]$/g, '').trim();
              const zhuyin = convertPhoneticToZhuyin(cleanPhonetic).replace(/^【\s*|\s*】$/g, '').trim();
              const kkDisplay = term.kk || getWordKKPhonetic(term.term);
              return (
                <div
                  key={tIdx}
                  onClick={() => handleSpeakLine(term.term, 200 + tIdx)}
                  className="bg-slate-950/90 hover:border-cyan-500/50 p-3 rounded-xl border border-slate-800/80 space-y-2 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="font-mono text-sm font-black text-cyan-300 group-hover:text-cyan-200">{term.term}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSpeakLine(term.term, 200 + tIdx);
                      }}
                      className="p-1 rounded-lg bg-slate-900 text-cyan-400 hover:bg-cyan-400 hover:text-slate-950 border border-slate-800 cursor-pointer transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono font-bold shrink-0">
                        KK音標
                      </span>
                      <span className="font-mono font-black text-cyan-300 tracking-wide break-words">
                        {kkDisplay}
                      </span>
                    </div>
                    {zhuyin && (
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] font-mono font-bold shrink-0">
                          注音
                        </span>
                        <span className="font-mono font-black text-amber-300 tracking-wider break-words">
                          【 {zhuyin} 】
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold shrink-0">
                        諧音
                      </span>
                      <span className="font-sans font-bold text-emerald-300 tracking-wider break-words">
                        【 {cleanPhonetic} 】
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-snug pt-0.5 border-t border-slate-900">
                    {term.definition}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
