import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  CheckCircle2,
  RotateCcw,
  X,
  Sparkles,
  Play,
  Square,
  Settings2,
  Sliders,
  Activity,
  Zap,
  Bell,
  Send,
  Wind,
  AlertTriangle,
  VolumeX,
  Radio,
  Headphones,
  Waves,
  Type,
  Sun,
  Moon,
  Eye,
  Contrast,
  Smartphone,
  ShieldCheck,
  Search,
  Copy,
  Check,
  Gauge,
  SlidersHorizontal,
  Mic,
  Cpu,
  RefreshCw,
  Info,
  Languages,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getStoredContrastMode,
  applyContrastModeToDocument,
  ContrastMode
} from '../utils/contrastMode';
import {
  getStoredFontSize,
  applyFontSizeToDocument,
  FONT_SIZE_OPTIONS,
  FontSizeLevel
} from '../utils/fontSize';
import {
  speakEnglish,
  speakChinese,
  speakBilingualLesson,
  getEnglishVoices,
  getTaiwanChineseVoices,
  getPreferredVoiceURI,
  setPreferredVoiceURI,
  getPreferredTaiwanVoiceURI,
  setPreferredTaiwanVoiceURI,
  getPreferredAccentMode,
  setPreferredAccentMode,
  AccentMode,
  ACCENT_OPTIONS,
  getPreferredSpeechPitch,
  setPreferredSpeechPitch,
  getPreferredSpeechStyle,
  setPreferredSpeechStyle,
  getPreferredSpeechVolume,
  setPreferredSpeechVolume,
  getPreferredLoudnessBoost,
  setPreferredLoudnessBoost,
  SpeechStylePreset,
  LoudnessBoostMode,
  resetSpeechEngine,
  restoreDefaultVoiceSettings,
  findStandardEnglishVoice,
  findTaiwanChineseVoice,
  getAudioEngineDiagnostics,
  unlockAudioContext,
  primeMobileSpeechEngine,
  SpeechEngineDiagnostics,
  analyzePhoneticTransformations,
  EQUALIZER_PROFILES,
  EqualizerProfileId,
  getPreferredEqualizerProfile,
  setPreferredEqualizerProfile,
  listenSpeech
} from '../utils/speech';
import {
  playClickSound,
  playSuccessChime,
  playLaserScanSound,
  playWaferSnapSound,
  playCleanroomConfirmationCue,
  getAmbientSoundType,
  setAmbientSoundType,
  getAmbientSoundVolume,
  setAmbientSoundVolume,
  previewAmbientSound,
  startContinuousAmbient,
  stopContinuousAmbient,
  playMachineryAlertPulse,
  AmbientSoundType
} from '../utils/audioEffects';
import { getPrefetchStats, clearPrefetchCache } from '../utils/speechPrefetcher';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechSpeed: number;
  setSpeechSpeed: (speed: number) => void;
}

interface SemiconductorAcronymItem {
  id: string;
  category: 'equipment' | 'chemicals' | 'safety' | 'metrology' | 'systems';
  categoryLabel: string;
  term: string;
  label: string;
  text: string;
  desc: string;
  phoneticHint: string;
}

interface TaiwanAccentTestItem {
  id: string;
  category: string;
  term: string;
  english: string;
  taiwanChinese: string;
  taiwanPhonetic: string;
  explanation: string;
  tag: string;
}

const TAIWAN_ACCENT_TEST_ITEMS: TaiwanAccentTestItem[] = [
  {
    id: 'tw-foup-loadport',
    category: '搬送機台',
    term: 'FOUP & Load Port',
    english: 'The robot arm transports the FOUP to load port one.',
    taiwanChinese: '機械手臂將晶圓傳送盒（FOUP）平穩搬送至一號載入埠。',
    taiwanPhonetic: 'FOUP [foop 負普]・Load Port [漏得破特]',
    explanation: '晶圓廠習慣將 FOUP 自然發音為 [foop]，切勿單獨唸成 F-O-U-P。',
    tag: '必備術語'
  },
  {
    id: 'tw-recipe-pump',
    category: '製程真空',
    term: 'Recipe & Pump',
    english: 'Please verify the recipe parameters and swap the dry pump.',
    taiwanChinese: '請確認配方參數無誤，並更換乾式真空泵浦。',
    taiwanPhonetic: 'Recipe [reh-suh-pee 瑞瑟匹]・Pump [潘普]',
    explanation: 'Recipe 念作 [reh-suh-pee]，切勿重音後移或發成 receipt (收據)。',
    tag: '高頻易錯'
  },
  {
    id: 'tw-mfc-sccm',
    category: '氣體流量',
    term: 'MFC & sccm',
    english: 'Inspect the MFC flow rate and calibrate gas to 200 sccm.',
    taiwanChinese: '檢查質流控制器（MFC）流量，並校正氣體至 200 sccm。',
    taiwanPhonetic: 'MFC [M-F-C]・sccm [S-C-C-M 耶斯西西愛姆]',
    explanation: 'MFC 為字母縮寫分讀，sccm 為標準毫升每分鐘流量單位。',
    tag: '計量單位'
  },
  {
    id: 'tw-loto-chamber',
    category: '安全斷電',
    term: 'LOTO & Chamber',
    english: 'Execute LOTO procedure before opening the CVD chamber.',
    taiwanChinese: '在打開化學氣相沉積（CVD）腔體前，務必確實執行斷電掛牌（LOTO）程序。',
    taiwanPhonetic: 'LOTO [low-toe 肉頭]・Chamber [謙伯]',
    explanation: 'LOTO 發音為 [low-toe]，為晶圓廠最高等級安全 SOP。',
    tag: '工安首要'
  },
  {
    id: 'tw-vacuum-mtorr',
    category: '計量單位',
    term: 'mTorr & °C',
    english: 'The chamber vacuum reached 5 mTorr at 400 °C.',
    taiwanChinese: '腔體真空度在 400 度高溫下已達 5 毫托。',
    taiwanPhonetic: 'mTorr [millitorr 米里托]・°C [degrees Celsius]',
    explanation: '自動展開為口語化標準讀音，避免生硬文字。',
    tag: '真空規範'
  },
  {
    id: 'tw-secs-gem',
    category: '通訊系統',
    term: 'SECS/GEM',
    english: 'Verify SECS and GEM communication status with host.',
    taiwanChinese: '確認機台與上位電腦（Host）之間的 SECS/GEM 通訊連線狀態。',
    taiwanPhonetic: 'SECS [secs 賽克斯]・GEM [gem 傑姆]',
    explanation: '半導體設備通訊標準，習慣連音發為 SECS/GEM。',
    tag: '系統通訊'
  },
  {
    id: 'tw-interlock-alarm',
    category: '機台警告',
    term: 'Interlock & Alarm',
    english: 'Clear the error code and reset safety interlock.',
    taiwanChinese: '清除異常錯誤代碼，並重置安全連鎖（Interlock）機制。',
    taiwanPhonetic: 'Interlock [硬特拉克]・Alarm [額浪]',
    explanation: '強化子音清晰度，在嘈雜機房中清晰辨識。',
    tag: '異常排除'
  },
  {
    id: 'tw-cdsem-nm',
    category: '量測分析',
    term: 'CD-SEM & 3nm',
    english: 'The CD-SEM inspected critical dimension across 3 nm wafers.',
    taiwanChinese: '電子顯微量測機（CD-SEM）完成 3 奈米晶圓關鍵尺寸檢測。',
    taiwanPhonetic: 'CD-SEM [C-D-S-E-M]・nm [nanometers 奈米]',
    explanation: '先進製程奈米單位與電子顯微量測專有名詞精確讀音。',
    tag: '先進製程'
  },
  {
    id: 'tw-bypass-purge',
    category: '管線維護',
    term: 'Bypass & Purge',
    english: 'Bypass the interlock sensor and purge the toxic gas line.',
    taiwanChinese: '暫時旁路（Bypass）感測器，並對毒性氣體管路進行氮氣吹洗（Purge）。',
    taiwanPhonetic: 'Bypass [拜帕斯]・Purge [珀居]',
    explanation: '台灣晶圓廠常用維護動詞，強化長母音與尾音清晰度。',
    tag: '日常維護'
  },
  {
    id: 'tw-align-wafer',
    category: '搬送定位',
    term: 'Wafer & Chuck',
    english: 'Align the wafer on the electrostatic chuck with zero tilt.',
    taiwanChinese: '將晶圓精準對準於靜電吸盤（E-Chuck）上，確保零傾斜。',
    taiwanPhonetic: 'Wafer [威佛]・Chuck [掐克]',
    explanation: 'Wafer 發音為 [way-fer]，Chuck 唸作 [chuck]。',
    tag: '機械對位'
  },
  {
    id: 'tw-dryclean-pm',
    category: '預防保養',
    term: 'Dry Clean & PM',
    english: 'Start dry clean cycle and complete scheduled PM checklist.',
    taiwanChinese: '啟動乾式電漿清洗程序，並逐項完成例行預防保養（PM）檢查表。',
    taiwanPhonetic: 'Dry Clean [居萊克林]・PM [P-M 預防保養]',
    explanation: '晶圓廠最頻繁進行的 PM 保養與腔體乾洗動作。',
    tag: '保養檢查'
  },
  {
    id: 'tw-ocap-handover',
    category: '交接管理',
    term: 'OCAP & Handover',
    english: 'Follow the OCAP guide and complete shift handover log.',
    taiwanChinese: '依循異常處置指南（OCAP）處理，並完整填寫值班交接日誌。',
    taiwanPhonetic: 'OCAP [O-CAP 歐凱普]・Handover [漢德歐佛 交接]',
    explanation: '標準交接與問題處置程序名詞發音。',
    tag: '班別交接'
  }
];

const SEMICONDUCTOR_TEST_ITEMS: SemiconductorAcronymItem[] = [
  {
    id: 'foup-loadport',
    category: 'equipment',
    categoryLabel: '機台與搬送',
    term: 'FOUP & Load Port',
    label: 'FOUP 晶圓載具與載入埠',
    text: 'The robot arm transports the FOUP to load port one.',
    desc: '測試 FOUP (foop) 自然道地發音與機器人搬送名詞',
    phoneticHint: 'FOUP 唸作 [foop]，勿單獨拆讀字母'
  },
  {
    id: 'mfc-sccm',
    category: 'equipment',
    categoryLabel: '機台與搬送',
    term: 'MFC & sccm',
    label: 'MFC 流量計與氣體流量',
    text: 'I inspect the MFC flow rate at 200 sccm.',
    desc: '測試 MFC (M-F-C) 字母縮寫與 sccm 物理量單位展開',
    phoneticHint: 'MFC 分讀字母，sccm 展開為 S-C-C-M'
  },
  {
    id: 'secs-gem',
    category: 'systems',
    categoryLabel: '系統與通訊',
    term: 'SECS/GEM',
    label: 'SECS/GEM 設備連線通訊',
    text: 'Verify SECS and GEM communication status on host.',
    desc: '測試 SECS / GEM 半導體通訊協定自然連音',
    phoneticHint: 'SECS 唸作 [secs]，GEM 唸作 [gem]'
  },
  {
    id: 'loto-breaker',
    category: 'safety',
    categoryLabel: '安全SOP',
    term: 'LOTO',
    label: 'LOTO 安全斷電掛牌鎖定',
    text: 'Execute LOTO procedure before opening the chamber.',
    desc: '測試半導體廠高壓電/毒氣維修最高安全 SOP 發音',
    phoneticHint: 'LOTO 唸作 [low-toe]'
  },
  {
    id: 'chemical-sc1-hf',
    category: 'chemicals',
    categoryLabel: '化學品與氣體',
    term: 'SC-1 & HF',
    label: 'SC-1 清洗液與 HF 氫氟酸',
    text: 'Clean the quartz with SC-1 and verify HF chemical level.',
    desc: '測試濕式清洗槽 SC-1、HF 等常見酸鹼化學品發音',
    phoneticHint: 'SC-1 唸作 S-C-1，HF 唸作 H-F'
  },
  {
    id: 'vacuum-mtorr',
    category: 'metrology',
    categoryLabel: '計量與物理量',
    term: 'mTorr & °C',
    label: '腔體真空度與溫度單位',
    text: 'Chamber vacuum reached 5 mTorr at 450 °C.',
    desc: '測試高真空毫托 (mTorr) 與攝氏溫度 (°C) 單位精確口語展開',
    phoneticHint: 'mTorr 展開為 millitorr，°C 展開為 degrees Celsius'
  },
  {
    id: 'euv-litho',
    category: 'equipment',
    categoryLabel: '機台與搬送',
    term: 'EUV & AOI',
    label: '極紫外光微影與光學檢測',
    text: 'The EUV lithography scanner and AOI system aligned the substrate accurately.',
    desc: '測試 EUV 與 AOI 專業縮寫發音',
    phoneticHint: 'EUV 分讀字母，AOI 分讀字母'
  },
  {
    id: 'angstrom-thickness',
    category: 'metrology',
    categoryLabel: '計量與物理量',
    term: 'Å (Angstroms)',
    label: '薄膜厚度埃量測',
    text: 'The oxide thickness is 25 Å across the wafer.',
    desc: '測試薄膜原子層厚度單位 Å 發音',
    phoneticHint: 'Å 展開為 angstroms'
  },
  {
    id: 'mes-lot-handover',
    category: 'systems',
    categoryLabel: '系統與通訊',
    term: 'MES & SECS',
    label: '製造執行系統與通訊交接',
    text: 'Check the MES system and confirm SECS communication status.',
    desc: '測試 MES 製造執行系統與通訊交接英語',
    phoneticHint: 'MES 唸作 M-E-S，SECS 唸作 S-E-C-S'
  },
  {
    id: 'fmea-ocap',
    category: 'systems',
    categoryLabel: '系統與通訊',
    term: 'OCAP & FMEA',
    label: '異常處置指南與失效模式分析',
    text: 'Follow the OCAP guide to resolve temperature drift.',
    desc: '測試 OCAP 異常應變程序與品質手法發音',
    phoneticHint: 'OCAP 唸作 O-CAP'
  },
  {
    id: 'svo-svo-structure',
    category: 'safety',
    categoryLabel: '安全SOP',
    term: 'SVO Structure',
    label: 'SVO 直覺拆解極簡短句',
    text: 'He replaces the pump and aligns the wafer.',
    desc: '測試 He/We 主詞代名詞與 SVO 直覺主動賓結構',
    phoneticHint: '極簡主詞 + 動詞 + 受詞，字字清晰'
  }
];

const FAB_CATEGORIZED_SAMPLES = [
  {
    category: '🟡 微影曝光',
    text: 'The EUV lithography scanner aligned the reticle with zero error.'
  },
  {
    category: '🔵 薄膜蝕刻 (Thin Film / Etch)',
    text: 'The CVD chamber completed silane deposition at 400 °C.'
  },
  {
    category: '🟣 氣體與真空 (Gas / Vacuum)',
    text: 'Check the MFC at 300 sccm and confirm chamber vacuum at 2 mTorr.'
  },
  {
    category: '🔴 EHS 安全 (Safety SOP)',
    text: 'Please execute LOTO before replacing the pneumatic valve.'
  },
  {
    category: '🟢 量測與計量 (Metrology)',
    text: 'The CD-SEM inspected critical dimension across thirty wafers.'
  },
  {
    category: '⚪ 系統交接 (MES & Communication)',
    text: 'Verify SECS and GEM communication status on MES host.'
  }
];

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  speechSpeed,
  setSpeechSpeed,
}) => {
  const [englishVoices, setEnglishVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [twVoices, setTwVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(getPreferredVoiceURI() || '');
  const [selectedTaiwanVoiceURI, setSelectedTaiwanVoiceURI] = useState<string>(getPreferredTaiwanVoiceURI() || '');
  const [activeVoiceName, setActiveVoiceName] = useState<string>('');
  const [activeTaiwanVoiceName, setActiveTaiwanVoiceName] = useState<string>('');
  const [accentMode, setAccentModeState] = useState<AccentMode>(getPreferredAccentMode());
  const [pitch, setPitch] = useState<number>(getPreferredSpeechPitch());
  const [speechStyle, setSpeechStyle] = useState<SpeechStylePreset>(getPreferredSpeechStyle());
  const [speechVolume, setSpeechVolume] = useState<number>(getPreferredSpeechVolume());
  const [loudnessBoostMode, setLoudnessBoostMode] = useState<LoudnessBoostMode>(getPreferredLoudnessBoost());
  const [equalizerProfile, setEqualizerProfileState] = useState<EqualizerProfileId>(getPreferredEqualizerProfile());
  const [ambientSoundTypeState, setAmbientSoundTypeState] = useState<AmbientSoundType>(getAmbientSoundType());
  const [ambientVolume, setAmbientVolume] = useState<number>(getAmbientSoundVolume());
  const [previewingAmbient, setPreviewingAmbient] = useState<AmbientSoundType | null>(null);
  const [fontSizeLevel, setFontSizeLevel] = useState<FontSizeLevel>(getStoredFontSize());
  const [contrastMode, setContrastMode] = useState<ContrastMode>(getStoredContrastMode());
  const previewStopRef = useRef<(() => void) | null>(null);
  const ambientTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Custom text input lab
  const [customTestInput, setCustomTestInput] = useState<string>('The MFC on Chamber A reached 250 sccm while the FOUP docked at Load Port 1.');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testingText, setTestingText] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);
  const [copiedPhonetic, setCopiedPhonetic] = useState<boolean>(false);
  const [diagnostics, setDiagnostics] = useState<SpeechEngineDiagnostics | null>(null);
  
  // Navigation tabs: 6 specialized tabs
  const [activeTab, setActiveTab] = useState<'accent' | 'voice' | 'equalizer' | 'custom' | 'acronyms' | 'diagnostics'>('voice');

  // Filter & Search states
  const [voiceSearchQuery, setVoiceSearchQuery] = useState<string>('');
  const [voiceCategoryFilter, setVoiceCategoryFilter] = useState<'all' | 'natural' | 'mobile' | 'tw'>('all');
  const [acronymSearchQuery, setAcronymSearchQuery] = useState<string>('');
  const [acronymCategoryFilter, setAcronymCategoryFilter] = useState<string>('all');
  const [twAccentCategoryFilter, setTwAccentCategoryFilter] = useState<string>('all');

  // Mic test state for diagnostics
  const [micListening, setMicListening] = useState<boolean>(false);
  const [micTranscript, setMicTranscript] = useState<string | null>(null);

  const refreshState = () => {
    unlockAudioContext();
    const en = getEnglishVoices();
    const tw = getTaiwanChineseVoices();
    setEnglishVoices(en);
    setTwVoices(tw);

    const activeEn = findStandardEnglishVoice();
    if (activeEn) {
      setActiveVoiceName(activeEn.name);
      if (!selectedVoiceURI) {
        setSelectedVoiceURI(activeEn.voiceURI);
      }
    }

    const activeTw = findTaiwanChineseVoice();
    if (activeTw) {
      setActiveTaiwanVoiceName(activeTw.name);
      if (!selectedTaiwanVoiceURI) {
        setSelectedTaiwanVoiceURI(activeTw.voiceURI);
      }
    }

    setAccentModeState(getPreferredAccentMode());
    const curPitch = getPreferredSpeechPitch();
    setPitch(curPitch);
    const curStyle = getPreferredSpeechStyle();
    setSpeechStyle(curStyle);
    setSpeechVolume(getPreferredSpeechVolume());
    setLoudnessBoostMode(getPreferredLoudnessBoost());
    setEqualizerProfileState(getPreferredEqualizerProfile());

    setAmbientSoundTypeState(getAmbientSoundType());
    setAmbientVolume(getAmbientSoundVolume());
    setFontSizeLevel(getStoredFontSize());
    setContrastMode(getStoredContrastMode());

    const diag = getAudioEngineDiagnostics();
    setDiagnostics(diag);
  };

  const handleAccentChange = (mode: AccentMode) => {
    playClickSound();
    setAccentModeState(mode);
    setPreferredAccentMode(mode);
    const opt = ACCENT_OPTIONS.find(o => o.id === mode);
    setTestingText(`發音口音切換為：${opt?.name || mode}`);

    if (mode === 'tw_fab') {
      speakEnglish('FOUP docked at Load Port 1. Please check the recipe.', speechSpeed, () => {
        setTestingText(null);
      }, pitch);
    } else if (mode === 'tw_mandarin_bilingual') {
      speakBilingualLesson('Verify SECS and GEM communication status.', '確認半導體設備通訊連線狀態無誤。', speechSpeed, () => {
        setTestingText(null);
      });
    } else {
      speakEnglish('Standard US cleanroom pronunciation engaged.', speechSpeed, () => {
        setTestingText(null);
      }, pitch);
    }
  };

  const handleSelectTaiwanVoice = (uri: string) => {
    playClickSound();
    setSelectedTaiwanVoiceURI(uri);
    setPreferredTaiwanVoiceURI(uri);
    const chosen = twVoices.find(v => v.voiceURI === uri);
    if (chosen) {
      setActiveTaiwanVoiceName(chosen.name);
    }
    setTestingText(`已指定台灣國語聲線：${chosen?.name || '繁體中文'}`);
    speakChinese('台灣國語導讀聲線設定完成，晶圓廠設備維護導讀就緒。', speechSpeed, () => {
      setTestingText(null);
    }, pitch);
  };

  const handleVolumeChange = (newVol: number) => {
    playClickSound();
    setSpeechVolume(newVol);
    setPreferredSpeechVolume(newVol);
    setTestingText(`音量設定為 ${Math.round(newVol * 100)}%`);
    speakEnglish(`Volume set to ${Math.round(newVol * 100)} percent.`, speechSpeed, () => {
      setTestingText(null);
    }, pitch);
  };

  const handleLoudnessBoostChange = (mode: LoudnessBoostMode) => {
    playClickSound();
    setLoudnessBoostMode(mode);
    setPreferredLoudnessBoost(mode);
    const msg = mode === 'boost_max'
      ? '超大聲穿透模式已啟動，人聲中高頻共鳴強化。'
      : mode === 'loud'
      ? '高響度模式已啟用。'
      : '標準響度模式已就緒。';
    setTestingText(msg);
    speakEnglish(mode === 'boost_max' ? 'Max loudness boost engaged for cleanroom clarity.' : 'Speech volume calibrated.', speechSpeed, () => {
      setTestingText(null);
    }, pitch);
  };

  const handleEqualizerChange = (id: EqualizerProfileId) => {
    playClickSound();
    setEqualizerProfileState(id);
    setPreferredEqualizerProfile(id);
    const profile = EQUALIZER_PROFILES.find(p => p.id === id);
    setTestingText(`聲學等化器套用：${profile?.name}`);
    speakEnglish(`${profile?.name || 'Acoustic equalizer'} profile activated.`, speechSpeed, () => {
      setTestingText(null);
    }, pitch);
  };

  const handleContrastModeChange = (mode: ContrastMode) => {
    playClickSound();
    setContrastMode(mode);
    applyContrastModeToDocument(mode);
  };

  useEffect(() => {
    if (!isOpen) {
      if (ambientTimerRef.current) {
        clearTimeout(ambientTimerRef.current);
        ambientTimerRef.current = null;
      }
      if (previewStopRef.current) {
        previewStopRef.current();
        previewStopRef.current = null;
      }
      setPreviewingAmbient(null);
      return;
    }
    refreshState();
    const timer1 = setTimeout(refreshState, 200);
    const timer2 = setTimeout(refreshState, 600);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (ambientTimerRef.current) {
        clearTimeout(ambientTimerRef.current);
        ambientTimerRef.current = null;
      }
      if (previewStopRef.current) {
        previewStopRef.current();
        previewStopRef.current = null;
      }
    };
  }, [isOpen, selectedVoiceURI, selectedTaiwanVoiceURI]);

  if (!isOpen) return null;

  const handleAmbientTypeChange = (type: AmbientSoundType) => {
    playClickSound();
    unlockAudioContext();
    setAmbientSoundType(type);
    setAmbientSoundTypeState(type);

    if (ambientTimerRef.current) {
      clearTimeout(ambientTimerRef.current);
      ambientTimerRef.current = null;
    }

    if (previewStopRef.current) {
      previewStopRef.current();
      previewStopRef.current = null;
    }

    if (type === 'fan') {
      setPreviewingAmbient('fan');
      const stop = previewAmbientSound('fan', 2200);
      previewStopRef.current = stop;
      ambientTimerRef.current = setTimeout(() => {
        setPreviewingAmbient((curr) => (curr === 'fan' ? null : curr));
        ambientTimerRef.current = null;
      }, 2200);
    } else if (type === 'alarm') {
      setPreviewingAmbient('alarm');
      const stop = previewAmbientSound('alarm', 2400);
      previewStopRef.current = stop;
      ambientTimerRef.current = setTimeout(() => {
        setPreviewingAmbient((curr) => (curr === 'alarm' ? null : curr));
        ambientTimerRef.current = null;
      }, 2400);
    } else {
      setPreviewingAmbient(null);
      stopContinuousAmbient();
    }
  };

  const handleTogglePreviewAmbient = (type: AmbientSoundType, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playClickSound();
    unlockAudioContext();

    if (ambientTimerRef.current) {
      clearTimeout(ambientTimerRef.current);
      ambientTimerRef.current = null;
    }

    if (previewingAmbient === type) {
      if (previewStopRef.current) {
        previewStopRef.current();
        previewStopRef.current = null;
      }
      setPreviewingAmbient(null);
      return;
    }

    if (previewStopRef.current) {
      previewStopRef.current();
      previewStopRef.current = null;
    }

    if (type === 'silent') {
      setPreviewingAmbient(null);
      stopContinuousAmbient();
      return;
    }

    setPreviewingAmbient(type);
    const stop = previewAmbientSound(type, 3000);
    previewStopRef.current = stop;
    ambientTimerRef.current = setTimeout(() => {
      setPreviewingAmbient((curr) => (curr === type ? null : curr));
      ambientTimerRef.current = null;
    }, 3000);
  };

  const handleSelectVoice = (uri: string) => {
    playClickSound();
    setSelectedVoiceURI(uri);
    setPreferredVoiceURI(uri);
    const chosen = englishVoices.find(v => v.voiceURI === uri);
    if (chosen) {
      setActiveVoiceName(chosen.name);
    }
    setTestingText('Standard American voice calibrated.');
    speakEnglish("Standard American voice calibrated.", speechSpeed, () => {
      setTestingText(null);
    }, pitch);
  };

  const handlePitchChange = (newPitch: number) => {
    playClickSound();
    setPitch(newPitch);
    setPreferredSpeechPitch(newPitch);
    setTestingText(`Voice pitch tuned to ${newPitch.toFixed(2)}`);
    speakEnglish(`Voice pitch calibrated.`, speechSpeed, () => {
      setTestingText(null);
    }, newPitch);
  };

  const handleStyleChange = (style: SpeechStylePreset) => {
    playClickSound();
    setSpeechStyle(style);
    setPreferredSpeechStyle(style);
    const sample = style === 'cleanroom'
      ? 'Cleanroom precision mode engaged.'
      : style === 'natural'
      ? 'Natural native flow mode active.'
      : 'Syllable clarity slow mode ready.';
    setTestingText(sample);
    speakEnglish(sample, speechSpeed, () => {
      setTestingText(null);
    }, pitch);
  };

  const handleResetEngine = () => {
    playClickSound();
    unlockAudioContext();
    primeMobileSpeechEngine();
    restoreDefaultVoiceSettings();
    setSelectedVoiceURI(null);
    setSelectedTaiwanVoiceURI(null);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);

    refreshState();
    playSuccessChime();
    setTestingText('已成功重置為系統預設原音 (Standard US Native Voice)。');
    speakEnglish("Speech engine reset to system default voice.", speechSpeed, () => {
      setTestingText(null);
      refreshState();
    }, 1.0);
  };

  const handleTestEnglish = () => {
    setIsTesting(true);
    setTestingText('The FOUP has arrived at the load port. Please verify SECS and GEM status.');
    speakEnglish('The FOUP has arrived at the load port. Please verify SECS and GEM status.', speechSpeed, () => {
      setIsTesting(false);
      setTestingText(null);
    }, pitch);
  };

  const handleTestChinese = () => {
    setIsTesting(true);
    setTestingText('晶圓半導體無塵室語音合成系統運作正常，發音清晰。');
    speakChinese('晶圓半導體無塵室語音合成系統運作正常，發音清晰。', speechSpeed, () => {
      setIsTesting(false);
      setTestingText(null);
    }, pitch);
  };

  const handleTestPhrase = (phrase: string, slowRate: boolean = false) => {
    setIsTesting(true);
    const targetRate = slowRate ? 0.72 : speechSpeed;
    setTestingText(phrase);
    speakEnglish(phrase, targetRate, () => {
      setIsTesting(false);
      setTestingText(null);
    }, pitch);
  };

  const handleTestBilingual = (english: string, chinese: string) => {
    setIsTesting(true);
    setTestingText(`雙語朗讀：${chinese}`);
    speakBilingualLesson(english, chinese, speechSpeed, () => {
      setIsTesting(false);
      setTestingText(null);
    });
  };

  const handleCustomTest = (slowRate: boolean = false) => {
    if (!customTestInput.trim()) return;
    setIsTesting(true);
    const targetRate = slowRate ? 0.72 : speechSpeed;
    setTestingText(customTestInput);
    speakEnglish(customTestInput, targetRate, () => {
      setIsTesting(false);
      setTestingText(null);
    }, pitch);
  };

  const handleCopyTransformedText = (textToCopy: string) => {
    playClickSound();
    navigator.clipboard.writeText(textToCopy);
    setCopiedPhonetic(true);
    setTimeout(() => setCopiedPhonetic(false), 2000);
  };

  const handleStartMicTest = () => {
    unlockAudioContext();
    playClickSound();
    setMicListening(true);
    setMicTranscript('正在聆聽中... 請對著麥克風朗讀晶圓廠英文 (例如 "I replace the pump")');

    listenSpeech(
      (transcript) => {
        setMicTranscript(`辨識結果：${transcript}`);
        setMicListening(false);
        playSuccessChime();
      },
      (err) => {
        setMicTranscript(`辨識錯誤或權限未允許：${err}`);
        setMicListening(false);
      }
    );
  };

  // Filtered voice list
  const filteredVoices = englishVoices.filter((v) => {
    const matchesSearch = !voiceSearchQuery || v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (voiceCategoryFilter === 'natural') {
      return /natural|google|jenny|aria|guy|samantha|ava|allison|susan/i.test(v.name);
    }
    if (voiceCategoryFilter === 'mobile') {
      return /samantha|ava|allison|susan|tom|sfg|google/i.test(v.name);
    }
    return true;
  });

  // Filtered acronym test bench
  const filteredAcronymItems = SEMICONDUCTOR_TEST_ITEMS.filter((item) => {
    const matchesCategory = acronymCategoryFilter === 'all' || item.category === acronymCategoryFilter;
    const matchesSearch = !acronymSearchQuery ||
      item.term.toLowerCase().includes(acronymSearchQuery.toLowerCase()) ||
      item.label.toLowerCase().includes(acronymSearchQuery.toLowerCase()) ||
      item.text.toLowerCase().includes(acronymSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filtered Taiwan Accent items
  const filteredTaiwanAccentItems = TAIWAN_ACCENT_TEST_ITEMS.filter((item) => {
    const matchesCategory = twAccentCategoryFilter === 'all' || item.category === twAccentCategoryFilter;
    return matchesCategory;
  });

  // Phonetic transformation breakdown for custom text
  const customPhoneticAnalysis = analyzePhoneticTransformations(customTestInput);
  const currentEqualizerData = EQUALIZER_PROFILES.find(p => p.id === equalizerProfile) || EQUALIZER_PROFILES[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh] relative"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-slate-100">
                    語音發音與音訊深度調校中心
                  </h3>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-400/30 font-bold">
                    🇹🇼 台灣在地口音支援
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  調校台灣晶圓廠在地口音、美式真人聲線、DSP 等化器、術語發音透視與雙語導讀
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sub-tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/70 p-2 gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
            {[
              { id: 'voice', label: '聲線與聲音選擇', icon: Sliders },
              { id: 'accent', label: '台灣口音調校', icon: Languages },
              { id: 'equalizer', label: '聲學等化器 (DSP)', icon: SlidersHorizontal },
              { id: 'acronyms', label: '晶圓術語發音台', icon: Sparkles },
              { id: 'custom', label: '即時語句透視', icon: Send },
              { id: 'diagnostics', label: '引擎診斷與自癒', icon: Activity },
            ].map((tab) => {
              const isCur = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    playClickSound();
                    setActiveTab(tab.id as any);
                  }}
                  className={`flex-1 min-w-[115px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap border ${
                    isCur
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md font-black'
                      : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white border-slate-800'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-sm">
            
            {/* Real-time speech status toast & Waveform Visualizer */}
            {testingText && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-gradient-to-r from-cyan-950/90 via-slate-900 to-indigo-950/90 border border-cyan-500/50 rounded-2xl flex items-center justify-between gap-3 text-cyan-200 text-xs shadow-lg shadow-cyan-950/30"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-cyan-300">正在播放發音測試：</span>
                    <span className="font-mono ml-1 text-slate-100">"{testingText}"</span>
                  </div>
                </div>
                {/* Animated Spectrum Waveform Bars */}
                <div className="flex items-center gap-0.5 shrink-0 px-2 py-1 bg-slate-950/70 rounded-lg border border-cyan-500/30">
                  {[40, 75, 100, 60, 90, 50, 85].map((height, i) => (
                    <div
                      key={i}
                      className="w-1 bg-cyan-400 rounded-full animate-pulse"
                      style={{
                        height: `${height}%`,
                        animationDuration: `${0.3 + (i % 3) * 0.15}s`,
                        animationDelay: `${i * 0.05}s`
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Quick Engine Status Bar */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>音訊架構：{diagnostics?.isWebSpeechSupported ? 'Web Speech 雙通道頂級引擎' : '雲端串流備援引擎'}</span>
                  <span className="text-[10px] text-amber-300 font-mono font-bold">
                    [口音：{ACCENT_OPTIONS.find(o => o.id === accentMode)?.name || '台灣晶圓廠在地口音'}]
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate max-w-sm sm:max-w-md">
                  英語聲線：{activeVoiceName || '系統預設美語'} ｜ 國語聲線：{activeTaiwanVoiceName || '系統預設繁中'}
                </div>
              </div>
              <button
                onClick={handleResetEngine}
                className="px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resetSuccess ? 'animate-spin' : ''}`} />
                <span>{resetSuccess ? '重置完成' : '一鍵重置語音引擎'}</span>
              </button>
            </div>

            {/* Tab 0: 🇹🇼 Taiwan Accent Studio */}
            {activeTab === 'accent' && (
              <div className="space-y-4">
                {/* 1. Accent Mode Selector Cards */}
                <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-950/80 to-emerald-950/40 rounded-2xl border-2 border-amber-500/40 shadow-lg shadow-amber-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/30">
                        <Languages className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-slate-100 font-black text-xs flex items-center gap-1.5">
                          <span>口音風格與在地化調校模式</span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono font-bold">
                            Taiwan Accent Engine
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-normal">
                          無縫切換台灣半導體在地發音習慣、標準美語或台英雙語導讀
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3 Accent Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {ACCENT_OPTIONS.map((opt) => {
                      const isCur = accentMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleAccentChange(opt.id)}
                          className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative flex flex-col justify-between ${
                            isCur
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-bold ring-2 ring-amber-300'
                              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black">{opt.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                isCur ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {opt.badge}
                              </span>
                            </div>
                            <div className={`text-[10px] font-mono mb-1.5 ${isCur ? 'text-slate-900 font-bold' : 'text-amber-400/90'}`}>
                              {opt.subtitle}
                            </div>
                            <p className={`text-[11px] leading-relaxed mb-2 ${isCur ? 'text-slate-900/90' : 'text-slate-400'}`}>
                              {opt.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Taiwan Mandarin Voice Selection */}
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold flex-wrap gap-2">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      台灣國語在地聲線自選 (Taiwan Chinese Voices)
                    </span>
                    <span className="text-[11px] text-slate-400">已偵測 {twVoices.length} 組台灣國語聲線</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {twVoices.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-900 text-xs text-slate-400 text-center sm:col-span-2">
                        使用系統標準繁體中文 (zh-TW) 聲線導讀
                      </div>
                    ) : (
                      twVoices.map((v) => {
                        const isSelected = selectedTaiwanVoiceURI === v.voiceURI || (!selectedTaiwanVoiceURI && v.name === activeTaiwanVoiceName);
                        return (
                          <button
                            key={v.voiceURI || v.name}
                            type="button"
                            onClick={() => handleSelectTaiwanVoice(v.voiceURI)}
                            className={`p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer border ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60 font-bold shadow-sm'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                            }`}
                          >
                            <div className="truncate">
                              <div className="font-bold truncate">{v.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{v.lang}</div>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 3. Taiwan Fab Pronunciation Test Bench (12 Items) */}
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300 flex-wrap gap-2">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      台灣晶圓廠實戰術語發音對照測試台 (12 組經典對照)
                    </span>
                    <span className="text-[10px] text-amber-300/80">包含台式諧音標註與雙語導讀</span>
                  </div>

                  {/* Filter category pills */}
                  <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'all', label: '全部' },
                      { id: '搬送機台', label: '搬送機台' },
                      { id: '製程真空', label: '製程真空' },
                      { id: '氣體流量', label: '氣體流量' },
                      { id: '安全斷電', label: '安全斷電' },
                      { id: '通訊系統', label: '通訊系統' },
                      { id: '預防保養', label: '預防保養' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setTwAccentCategoryFilter(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                          twAccentCategoryFilter === cat.id
                            ? 'bg-amber-400/20 text-amber-300 border-amber-400/60'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Test Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[46vh] overflow-y-auto pr-1">
                    {filteredTaiwanAccentItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-amber-400/50 hover:bg-slate-850 transition-all flex flex-col justify-between gap-2 group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-amber-300 group-hover:text-amber-200">
                              {item.term}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-slate-900 text-emerald-400 border border-slate-800">
                              {item.tag}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-200 font-mono leading-relaxed mb-1 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80">
                            "{item.english}"
                          </div>
                          <div className="text-[11px] text-slate-300 leading-snug mb-1">
                            {item.taiwanChinese}
                          </div>
                          <div className="text-[10px] font-mono text-emerald-300 bg-emerald-950/40 p-1 rounded border border-emerald-800/40">
                            🇹🇼 諧音標註：{item.taiwanPhonetic}
                          </div>
                        </div>

                        {/* Triple Action Buttons */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleTestPhrase(item.english, true)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                          >
                            <Play className="w-2.5 h-2.5" />
                            <span>慢速</span>
                          </button>
                          <button
                            onClick={() => handleTestBilingual(item.english, item.taiwanChinese)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/40 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                          >
                            <Languages className="w-2.5 h-2.5" />
                            <span>雙語導讀</span>
                          </button>
                          <button
                            onClick={() => handleTestPhrase(item.english, false)}
                            className="px-3 py-1 rounded-lg text-[10px] font-black bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-sm"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>晶圓發音</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 1: Voice, Pitch & Loudness */}
            {activeTab === 'voice' && (
              <div className="space-y-4">
                {/* 🔊 Loudness Booster & Master Volume Module */}
                <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-950/80 to-indigo-950/40 rounded-2xl border-2 border-amber-500/40 shadow-lg shadow-amber-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/30">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-slate-100 font-black text-xs flex items-center gap-1.5">
                          <span>語音發音音量與穿透力增強</span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono font-bold">
                            Loudness Booster
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-normal">
                          專為無塵室風機噪音、開車通勤與嘈雜環境調校，一鍵極致超大聲
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-lg border border-amber-500/40 text-xs font-black">
                      {Math.round(speechVolume * 100)}% 音量
                    </span>
                  </div>

                  {/* Loudness Boost Modes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        id: 'boost_max',
                        label: '🚀 極致清晰超大聲 MAX',
                        subtitle: '100% 音量 + 中高頻人聲穿透',
                        desc: '滿載硬體音量，強化高音共鳴頻段，在嘈雜背景中字音依舊清晰爆發',
                        vol: 1.0,
                        badge: '🔥 強烈推薦'
                      },
                      {
                        id: 'loud',
                        label: '⚡ 標準響亮模式',
                        subtitle: '90% 飽滿清晰音量',
                        desc: '維持高解析度與飽滿輸出，適合一般安靜到微嘈雜室內環境',
                        vol: 0.9,
                        badge: '標準'
                      },
                      {
                        id: 'standard',
                        label: '🔉 溫和舒適模式',
                        subtitle: '70% 柔和近場音量',
                        desc: '低刺激柔順輸出，適合佩戴高靈敏入耳式耳機夜間精聽',
                        vol: 0.7,
                        badge: '耳機'
                      }
                    ].map((mode) => {
                      const isCur = loudnessBoostMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            handleLoudnessBoostChange(mode.id as LoudnessBoostMode);
                            handleVolumeChange(mode.vol);
                          }}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer relative flex flex-col justify-between ${
                            isCur
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-bold ring-1 ring-amber-300'
                              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black">{mode.label}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                isCur ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {mode.badge}
                              </span>
                            </div>
                            <div className={`text-[10px] font-mono mb-1 ${isCur ? 'text-slate-900 font-bold' : 'text-amber-400/90'}`}>
                              {mode.subtitle}
                            </div>
                            <p className={`text-[10px] leading-relaxed ${isCur ? 'text-slate-900/90' : 'text-slate-400'}`}>
                              {mode.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Volume Slider & Quick Volume Steppers */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <span className="text-[11px] font-bold text-slate-400 shrink-0">快捷音量階級：</span>
                      <div className="grid grid-cols-4 gap-1.5 flex-1 sm:flex-initial">
                        {[
                          { val: 0.6, label: '60%' },
                          { val: 0.8, label: '80%' },
                          { val: 0.9, label: '90%' },
                          { val: 1.0, label: '100% 滿載' },
                        ].map((v) => (
                          <button
                            key={v.val}
                            type="button"
                            onClick={() => handleVolumeChange(v.val)}
                            className={`py-1 px-2 rounded-lg text-[11px] font-bold border transition-all text-center cursor-pointer ${
                              Math.abs(speechVolume - v.val) < 0.04
                                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsTesting(true);
                        setTestingText('🔥 正在以 100% 滿載超大聲與中高頻共鳴朗讀測試範例...');
                        speakEnglish('The vacuum chamber is sealed and ready for high-yield wafer processing at full volume.', speechSpeed, () => {
                          setIsTesting(false);
                          setTestingText(null);
                        }, pitch);
                      }}
                      className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-950/30 cursor-pointer shrink-0 active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>試聽超大聲朗讀</span>
                    </button>
                  </div>
                </div>

                {/* Voice Selection with Category Filters and Search */}
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold flex-wrap gap-2">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
                      美式英文發音聲線選擇 (Voice Selector)
                    </span>
                    <span className="text-[11px] text-slate-400">已偵測 {englishVoices.length} 組系統語音</span>
                  </div>

                  {/* Search box & filter tags */}
                  <div className="flex gap-2 items-center flex-wrap">
                    <div className="relative flex-1 min-w-[160px]">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={voiceSearchQuery}
                        onChange={(e) => setVoiceSearchQuery(e.target.value)}
                        placeholder="搜尋聲線名稱 (如 Google, Samantha, Natural)..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div className="flex gap-1">
                      {[
                        { id: 'all', label: '全部' },
                        { id: 'natural', label: '🌟 自然真人' },
                        { id: 'mobile', label: '📱 行動極速' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setVoiceCategoryFilter(cat.id as any)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            voiceCategoryFilter === cat.id
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Voice List */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-950/70 rounded-2xl border border-slate-800">
                    {filteredVoices.length === 0 ? (
                      <div className="text-xs text-slate-400 p-4 text-center space-y-2">
                        <p>未找到符合條件的語音，可嘗試清空搜尋或點擊「一鍵重置語音引擎」強制喚醒</p>
                      </div>
                    ) : (
                      filteredVoices.map((v) => {
                        const isSelected = selectedVoiceURI === v.voiceURI || (!selectedVoiceURI && v.name === activeVoiceName);
                        const isNatural = /natural|google|jenny|aria|guy|samantha|ava|allison/i.test(v.name);
                        return (
                          <button
                            key={v.voiceURI || v.name}
                            onClick={() => handleSelectVoice(v.voiceURI)}
                            className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer border ${
                              isSelected
                                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60 font-bold shadow-sm'
                                : 'bg-slate-900 border-slate-800/80 text-slate-300 hover:bg-slate-850'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="truncate">{v.name}</span>
                              {isNatural && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 font-bold">
                                  Natural 推薦
                                </span>
                              )}
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Speech Style Preset */}
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      發音模式與情境風格 (Speech Style)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cleanroom', label: '🎯 晶圓無塵室實戰', desc: '強調術語重音與字字清晰' },
                      { id: 'natural', label: '🎙️ 母語自然流暢', desc: '美語連音與自然語調' },
                      { id: 'slow_clarity', label: '⚡ 音節清晰拆解', desc: '清晰慢速音節強化' },
                    ].map((s) => {
                      const isCur = speechStyle === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => handleStyleChange(s.id as SpeechStylePreset)}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            isCur
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                          }`}
                        >
                          <div className="text-xs font-black mb-0.5">{s.label}</div>
                          <div className={`text-[10px] ${isCur ? 'text-slate-900/80' : 'text-slate-500'}`}>{s.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Speed & Pitch / Tone Adjustment Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Speed Adjustment */}
                  <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-amber-400" />
                        語速微調 (Speech Rate)
                      </span>
                      <span className="font-mono text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-500/30 font-bold">
                        {speechSpeed.toFixed(2)}x
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { rate: 0.75, label: '0.75x 慢速精聽' },
                        { rate: 0.88, label: '0.88x 標準教學' },
                        { rate: 1.0, label: '1.0x 原速日常' },
                        { rate: 1.15, label: '1.15x 快速實戰' },
                      ].map((s) => (
                        <button
                          key={s.rate}
                          onClick={() => {
                            playClickSound();
                            setSpeechSpeed(s.rate);
                            setTestingText(`Speech rate set to ${s.rate}x`);
                            speakEnglish(`Speech rate set to ${s.rate}x`, s.rate, () => {
                              setTestingText(null);
                            }, pitch);
                          }}
                          className={`py-1.5 px-1 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                            Math.abs(speechSpeed - s.rate) < 0.03
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pitch / Tone Adjustment */}
                  <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                        音調音高 (Voice Pitch)
                      </span>
                      <span className="font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-lg border border-cyan-500/30 font-bold">
                        {pitch.toFixed(2)}x
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { val: 0.90, label: '0.9x 低音' },
                        { val: 1.00, label: '1.0x 標準' },
                        { val: 1.10, label: '1.1x 清脆' },
                      ].map((p) => (
                        <button
                          key={p.val}
                          onClick={() => handlePitchChange(p.val)}
                          className={`py-1.5 px-1 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                            Math.abs(pitch - p.val) < 0.03
                              ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-md font-black'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: 🎛️ Equalizer Profile */}
            {activeTab === 'equalizer' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-gradient-to-r from-cyan-950/40 via-slate-950/80 to-indigo-950/40 rounded-2xl border-2 border-cyan-500/40 shadow-lg shadow-cyan-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-500/30">
                        <SlidersHorizontal className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-slate-100 font-black text-xs flex items-center gap-1.5">
                          <span>聲學等化器 DSP 與頻譜響應 (Acoustic Equalizer)</span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-mono font-bold">
                            5-Band DSP Active
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-normal">
                          數位訊號處理 (DSP) 濾波器，專門消除低頻機械嗡鳴並加強 3.5kHz 人聲輔音穿透力
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Equalizer Profile Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {EQUALIZER_PROFILES.map((prof) => {
                      const isSelected = equalizerProfile === prof.id;
                      return (
                        <div
                          key={prof.id}
                          onClick={() => handleEqualizerChange(prof.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-cyan-950/70 border-cyan-400 shadow-md ring-1 ring-cyan-400/80'
                              : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850 hover:border-slate-750'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black text-slate-100">{prof.name}</span>
                              {isSelected ? (
                                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-slate-700" />
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-cyan-400/90 mb-1">{prof.subtitle}</div>
                            <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                              {prof.desc}
                            </p>
                          </div>
                          <div className="text-[10px] font-mono text-emerald-400/90 pt-1.5 border-t border-slate-800/80 flex items-center gap-1">
                            <span>🎯 適用：</span>
                            <span className="text-slate-300">{prof.recommendedFor}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5-Band Graphic Equalizer Frequency Bands Visualizer */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      5 頻段聲學濾波器響應圖 (5-Band Frequency Response)
                    </span>
                    <button
                      onClick={() => {
                        setIsTesting(true);
                        setTestingText(`以 ${currentEqualizerData.name} 等化器頻響曲線試聽...`);
                        speakEnglish('Equalizer profile applied. Wafer handling robotics and vacuum sensors calibrated.', speechSpeed, () => {
                          setIsTesting(false);
                          setTestingText(null);
                        }, pitch);
                      }}
                      className="px-3 py-1 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>試聽當前等化器效果</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-5 gap-2 pt-2 pb-1">
                    {[
                      { band: '80 Hz', desc: '超低頻濾除', val: currentEqualizerData.bands.hz80, color: 'from-blue-500 to-indigo-500' },
                      { band: '300 Hz', desc: '風機嗡鳴抑制', val: currentEqualizerData.bands.hz300, color: 'from-cyan-500 to-blue-500' },
                      { band: '1.0 kHz', desc: '母音飽滿度', val: currentEqualizerData.bands.hz1k, color: 'from-emerald-500 to-teal-500' },
                      { band: '3.5 kHz', desc: '子音爆破穿透', val: currentEqualizerData.bands.hz3k5, color: 'from-amber-400 to-orange-500' },
                      { band: '8.0 kHz', desc: '高頻空氣感', val: currentEqualizerData.bands.hz8k, color: 'from-purple-400 to-pink-500' },
                    ].map((b) => (
                      <div key={b.band} className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex flex-col items-center gap-1.5 text-center">
                        <span className="text-[10px] font-mono font-bold text-slate-300">{b.band}</span>
                        <div className="h-20 w-3.5 bg-slate-950 rounded-full flex flex-col justify-end p-0.5 border border-slate-800">
                          <div
                            className={`w-full rounded-full bg-gradient-to-t ${b.color} transition-all duration-300`}
                            style={{ height: `${Math.max(15, Math.min(100, (b.val + 12) * 4.16))}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-mono font-black ${b.val > 0 ? 'text-amber-400' : b.val < 0 ? 'text-cyan-400' : 'text-slate-400'}`}>
                          {b.val > 0 ? `+${b.val}dB` : `${b.val}dB`}
                        </span>
                        <span className="text-[9px] text-slate-500 leading-tight">{b.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Semiconductor Acronyms Pronunciation Test Bench */}
            {activeTab === 'acronyms' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 flex-wrap gap-2">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    晶圓廠專業術語發音測試台 ({filteredAcronymItems.length} 組)
                  </span>
                  <span className="text-[10px] text-amber-300/80">支援標準與 0.7x 慢速拆解朗讀</span>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex gap-2 items-center flex-wrap">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={acronymSearchQuery}
                      onChange={(e) => setAcronymSearchQuery(e.target.value)}
                      placeholder="搜尋術語關鍵字 (如 MFC, FOUP, LOTO, EUV, sccm)..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'all', label: '全部' },
                      { id: 'equipment', label: '機台與搬送' },
                      { id: 'chemicals', label: '化學與氣體' },
                      { id: 'safety', label: '安全SOP' },
                      { id: 'metrology', label: '計量單位' },
                      { id: 'systems', label: '系統通訊' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setAcronymCategoryFilter(cat.id)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                          acronymCategoryFilter === cat.id
                            ? 'bg-amber-400/20 text-amber-300 border-amber-400/60'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid of Acronym Items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredAcronymItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-amber-400/50 hover:bg-slate-850 transition-all flex flex-col justify-between gap-2 group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-amber-300 group-hover:text-amber-200">
                            {item.label}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-slate-900 text-slate-400 border border-slate-800">
                            {item.categoryLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-200 font-mono leading-relaxed mb-1 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80">
                          "{item.text}"
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight mb-1">
                          {item.desc}
                        </div>
                        <div className="text-[10px] font-mono text-emerald-400/90">
                          💡 {item.phoneticHint}
                        </div>
                      </div>

                      {/* Dual Action Buttons */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleTestPhrase(item.text, true)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 hover:bg-slate-850 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                        >
                          <Play className="w-2.5 h-2.5" />
                          <span>0.7x 慢速</span>
                        </button>
                        <button
                          onClick={() => handleTestPhrase(item.text, false)}
                          className="px-3 py-1 rounded-lg text-[10px] font-black bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-sm"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>標準發音</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: Custom Text & Phonetic Analyzer */}
            {activeTab === 'custom' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-amber-400" />
                      輸入任意晶圓術語或英文短句即時試聽與音節透視
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={customTestInput}
                    onChange={(e) => setCustomTestInput(e.target.value)}
                    placeholder="請輸入英文句子，例如：The MFC timed out while the FOUP docked at Load Port 1."
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-400 transition-colors"
                  />
                  
                  {/* Realtime Phonetic Transformation Breakdown */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        語音引擎實際發音韻律轉換詞 (Prosody Phonetics)：
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyTransformedText(customPhoneticAnalysis.processed)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedPhonetic ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPhonetic ? '已複製' : '複製發音詞'}</span>
                      </button>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg font-mono text-xs text-amber-300 border border-slate-800 break-words">
                      "{customPhoneticAnalysis.processed}"
                    </div>

                    {/* Detected technical terms pills */}
                    {customPhoneticAnalysis.detectedTerms.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center pt-1">
                        <span className="text-[10px] text-slate-400 font-mono">命中術語字典：</span>
                        {customPhoneticAnalysis.detectedTerms.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1"
                          >
                            <span className="font-bold">{t.term}</span>
                            <span className="text-slate-400">➔</span>
                            <span className="text-emerald-300">{t.phonetic}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dual Play Buttons */}
                  <div className="flex gap-2 flex-wrap justify-between items-center pt-1">
                    <div className="text-[11px] text-slate-400">
                      💡 支援自動展開 FOUP、SECS/GEM、MFC、LOTO、sccm、mTorr 等專業發音
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCustomTest(true)}
                        disabled={isTesting || !customTestInput.trim()}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3 h-3 text-cyan-400" />
                        <span>0.7x 慢速拆解</span>
                      </button>
                      <button
                        onClick={() => handleCustomTest(false)}
                        disabled={isTesting || !customTestInput.trim()}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>標準朗讀測試</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Categorized semiconductor presets */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300">帶入 6 大晶圓廠分類實戰短句：</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FAB_CATEGORIZED_SAMPLES.map((sample, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCustomTestInput(sample.text);
                          speakEnglish(sample.text, speechSpeed, () => {}, pitch);
                        }}
                        className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400/50 text-left text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
                      >
                        <div className="text-[10px] font-sans font-bold text-amber-400/90 mb-0.5">{sample.category}</div>
                        "{sample.text}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Deep Diagnostics & Self-Healing */}
            {activeTab === 'diagnostics' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-400" />
                    瀏覽器音訊架構深度診斷矩陣
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Web Speech API</span>
                      <span className={`font-mono font-bold ${diagnostics?.isWebSpeechSupported ? 'text-emerald-400' : 'text-red-400'}`}>
                        {diagnostics?.isWebSpeechSupported ? '✅ 支援' : '❌ 不支援'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Web Audio 上下文</span>
                      <span className={`font-mono font-bold ${diagnostics?.audioContextState === 'running' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {diagnostics?.audioContextState || 'active'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">已偵測美語語音</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {diagnostics?.englishVoicesCount || 0} 組
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">已偵測台灣國語語音</span>
                      <span className="font-mono font-bold text-amber-300">
                        {diagnostics?.taiwanVoicesCount || 0} 組
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center sm:col-span-2">
                      <span className="text-slate-400">當前口音引擎模式</span>
                      <span className="font-mono font-bold text-amber-400">
                        {ACCENT_OPTIONS.find(o => o.id === accentMode)?.name || '台灣晶圓廠在地口音'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center sm:col-span-2">
                      <span className="text-slate-400">發音通道運作狀態</span>
                      <div className="flex items-center gap-2">
                        {diagnostics && diagnostics.queueLength > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono">
                            佇列中: {diagnostics.queueLength} 句
                          </span>
                        )}
                        <span className="font-mono text-slate-200 font-bold">
                          {diagnostics?.isSpeaking ? '正在朗讀 (Speaking)' : '待命就緒 (Idle Ready)'}
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex justify-between items-center sm:col-span-2">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-slate-300 font-bold">語音預載 (Prefetch) 緩存</span>
                      </div>
                      <span className="font-mono text-emerald-300 font-bold">
                        已預加載 {getPrefetchStats().memoryCacheCount} 句型 (命中 {getPrefetchStats().cacheHits} 次)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Microphone Recognition Interactive Test */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-indigo-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-indigo-400" />
                      口說錄音與語音辨識硬體測試 (Microphone Test)
                    </h4>
                    <button
                      onClick={handleStartMicTest}
                      disabled={micListening}
                      className="px-3 py-1 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Mic className={`w-3.5 h-3.5 ${micListening ? 'animate-pulse text-red-300' : ''}`} />
                      <span>{micListening ? '錄音測試中...' : '開始麥克風測試'}</span>
                    </button>
                  </div>
                  {micTranscript && (
                    <div className="p-2.5 bg-slate-900 rounded-xl text-xs font-mono text-indigo-200 border border-slate-800">
                      {micTranscript}
                    </div>
                  )}
                </div>

                {/* Mobile Anti-Freeze Audio Shield Card */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-cyan-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      手機端發音抗卡頓防護狀態 (Mobile Speech Protection)
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      全時防護中
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-cyan-400" /> 裝置架構
                      </span>
                      <span className="font-mono font-bold text-slate-200 text-[11px]">
                        {diagnostics?.isMobileDevice ? '📱 行動裝置 (iOS/Android)' : '💻 桌面工作站 (Desktop)'}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" /> 啟動看門狗 (Watchdog)
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-[11px]">
                        ✅ 1.4s 逾時防卡死自癒
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" /> 睡眠喚醒防護
                      </span>
                      <span className="font-mono font-bold text-cyan-300 text-[11px]">
                        ✅ 頁面回訪自動重連
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sound Effects & Web Audio Test Bench */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-cyan-400" />
                    無塵室 Web Audio 音效與情境聲學測試台
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => {
                        unlockAudioContext();
                        playCleanroomConfirmationCue();
                      }}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-cyan-500/40 text-xs font-bold text-cyan-200 flex flex-col items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>語句過渡音標</span>
                    </button>
                    <button
                      onClick={() => {
                        unlockAudioContext();
                        handleTogglePreviewAmbient('fan');
                      }}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-cyan-500/40 text-xs font-bold text-cyan-300 flex flex-col items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Wind className="w-4 h-4 text-cyan-400" />
                      <span>FFU風扇白噪音</span>
                    </button>
                    <button
                      onClick={() => {
                        unlockAudioContext();
                        handleTogglePreviewAmbient('alarm');
                      }}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-amber-500/40 text-xs font-bold text-amber-300 flex flex-col items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>機台警報蜂鳴</span>
                    </button>
                    <button
                      onClick={() => {
                        unlockAudioContext();
                        playSuccessChime();
                      }}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-emerald-300 flex flex-col items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>成功通關鈴聲</span>
                    </button>
                    <button
                      onClick={() => {
                        unlockAudioContext();
                        playLaserScanSound();
                      }}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-cyan-300 flex flex-col items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Zap className="w-4 h-4" />
                      <span>雷射掃描音效</span>
                    </button>
                    <button
                      onClick={() => {
                        unlockAudioContext();
                        playWaferSnapSound();
                      }}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-amber-300 flex flex-col items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>晶圓吸附音效</span>
                    </button>
                    <button
                      onClick={() => {
                        unlockAudioContext();
                        playClickSound();
                      }}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-300 flex flex-col items-center gap-1 cursor-pointer sm:col-span-2 active:scale-95"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>介面觸覺回饋音效</span>
                    </button>
                  </div>
                </div>

                {/* Emergency Unlock & Repair Action */}
                <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-amber-300 block">遇到發音沒聲音或卡住？</span>
                    <p className="text-[11px] text-amber-200/80">
                      一鍵徹底解除瀏覽器音訊鎖定、清空死鎖 Utterance、重新載入系統聲線並啟動備援通道。
                    </p>
                  </div>
                  <button
                    onClick={handleResetEngine}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs shrink-0 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    🛠️ 深度修復解鎖
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              💡 提示：使用 Chrome 或 Edge 瀏覽器可享有最流暢的高清自然聲線與台灣在地口音優化。
            </span>
            <button
              onClick={() => {
                playSuccessChime();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-md ml-auto"
            >
              完成設定
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
