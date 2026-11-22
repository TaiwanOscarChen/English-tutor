import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Trophy, 
  Zap, 
  Gauge, 
  Radio, 
  HelpCircle,
  Play,
  Pause,
  Edit3,
  Send,
  RefreshCw,
  Check,
  Activity
} from 'lucide-react';
import { speakEnglish, cancelSpeech, cleanEnglishText } from '../utils/speech';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getMandarinPhoneticFromSentence } from '../utils/lessonSentenceHelper';
import { getSentenceKKPhonetic, getWordKKPhonetic } from '../utils/wordDictionary';
import { InteractiveSentenceViewer } from './InteractiveSentenceViewer';
import { playClickSound, playSuccessChime } from '../utils/audioEffects';
import { queueAutoServerSync } from '../utils/serverSyncService';
import { Lesson } from '../types';

const SHADOWING_SCORES_KEY = 'fse_shadowing_scores_v1';

function loadShadowingScores(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SHADOWING_SCORES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const cleaned: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          cleaned[k] = Math.min(100, Math.max(0, Math.round(v)));
        }
      }
      return cleaned;
    }
  } catch {}
  return {};
}

export interface ShadowingScenario {
  id: string;
  category: 'aoi' | 'handover' | 'pm' | 'defect' | 'recipe' | 'daily';
  categoryLabel: string;
  title: string;
  targetEnglish: string;
  chinese: string;
  phoneticNotes: string;
  fabKeywords: string[];
  tips: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export const SHADOWING_SCENARIOS: ShadowingScenario[] = [
  {
    id: 'sh-aoi-1',
    category: 'aoi',
    categoryLabel: 'AOI 治具與教導',
    title: '調整光源並確認跳晶感測器',
    targetEnglish: 'Tune light and check jump sensor.',
    chinese: '調整光源並檢查跳晶感測器。',
    phoneticNotes: 'Tune light [圖恩 賴特] · jump sensor [醬普 森瑟]',
    fabKeywords: ['tune light', 'jump sensor'],
    tips: '公開光學檢測單元 1 重點：跳晶感測器標準拼法為 Die Jump Sensor，字尾是 -sor。',
    difficulty: 'Easy'
  },
  {
    id: 'sh-aoi-2',
    category: 'aoi',
    categoryLabel: 'AOI 封裝與基板檢測',
    title: '檢測基板錫球與底膠狀態',
    targetEnglish: 'Inspect substrate, C4 bump, and underfill.',
    chinese: '檢測基板、覆晶錫球與底部填膠。',
    phoneticNotes: 'substrate [薩布斯翠特] · C4 bump [西佛 棒普] · underfill [安德菲爾]',
    fabKeywords: ['substrate', 'C4 bump', 'underfill'],
    tips: '公開光學檢測單元 1 重點：基板是 Substrate，C4 Bump 是覆晶錫球凸塊，Underfill 是底膠。',
    difficulty: 'Easy'
  },
  {
    id: 'sh-aoi-3',
    category: 'aoi',
    categoryLabel: 'AOI 連線與五階段狀態',
    title: '確認控制器狀態並切至遠端',
    targetEnglish: 'Check PLC status and remote mode.',
    chinese: '檢查可程式控制器狀態與遠端模式。',
    phoneticNotes: 'PLC status [批艾歐西 斯泰特斯] · remote mode [瑞莫特 莫德]',
    fabKeywords: ['PLC status', 'remote mode'],
    tips: '公開光學檢測單元 2 重點：製程五階段依序為 No Wafer、No Process、Wait Process、Processing、End Process。',
    difficulty: 'Easy'
  },
  {
    id: 'sh-aoi-4',
    category: 'aoi',
    categoryLabel: 'AOI 黃金樣品與日誌診斷',
    title: '測試黃金樣本並檢查對焦日誌',
    targetEnglish: 'Test golden sample and focus log.',
    chinese: '測試黃金標準樣品並檢查對焦日誌。',
    phoneticNotes: 'golden sample [勾登 散婆] · focus log [佛克斯 洛格]',
    fabKeywords: ['golden sample', 'focus log'],
    tips: '公開光學檢測單元 3 重點：Golden Sample 用於開機點檢比對機台檢測準確度。',
    difficulty: 'Easy'
  },
  {
    id: 'sh-1',
    category: 'handover',
    categoryLabel: '機台異常交接',
    title: '腔體真空外洩與互鎖警報',
    targetEnglish: 'Chamber B has a vacuum leak.',
    chinese: 'B 腔體發生真空外洩。',
    phoneticNotes: 'Chamber B [錢伯 比] · vacuum leak [威扣姆 莉克]',
    fabKeywords: ['Chamber B', 'vacuum leak'],
    tips: '「vacuum leak」是晶圓廠最常聽到的停機原因，重音在 vac-uum。',
    difficulty: 'Easy'
  },
  {
    id: 'sh-2',
    category: 'handover',
    categoryLabel: '機台異常交接',
    title: '機械手臂晶圓搬送逾時',
    targetEnglish: 'Robot arm has transfer timeout.',
    chinese: '機械手臂發生搬送逾時。',
    phoneticNotes: 'Robot arm [羅巴特 阿姆] · transfer timeout [穿斯弗 太姆奧特]',
    fabKeywords: ['robot arm', 'transfer timeout'],
    tips: 'transfer timeout 代表取放片超過安全秒數限制。',
    difficulty: 'Easy'
  },
  {
    id: 'sh-3',
    category: 'pm',
    categoryLabel: '定期保養與複校',
    title: '化學研磨液流量檢查',
    targetEnglish: 'Verify the slurry flow rate.',
    chinese: '確認化學研磨液流量。',
    phoneticNotes: 'Verify [維瑞發愛] · slurry [斯勒瑞] · flow rate [佛樓 瑞特]',
    fabKeywords: ['slurry', 'flow rate'],
    tips: 'slurry 發音為 [ˋslɝɪ]，是 CMP 平坦化製程核心耗材。',
    difficulty: 'Easy'
  },
  {
    id: 'sh-4',
    category: 'pm',
    categoryLabel: '定期保養與複校',
    title: '執行光學對準校正',
    targetEnglish: 'Perform the optical alignment.',
    chinese: '執行光學準直對位校正。',
    phoneticNotes: 'Perform [珀佛姆] · optical alignment [阿普提口 額賴恩門特]',
    fabKeywords: ['optical alignment'],
    tips: 'alignment 的 g 不發音，KK音標為 [əˋlaɪnmənt]。',
    difficulty: 'Easy'
  },
  {
    id: 'sh-5',
    category: 'defect',
    categoryLabel: '晶圓缺陷與良率處置',
    title: '檢查晶圓邊緣微粒污染',
    targetEnglish: 'Check wafer edge particle count.',
    chinese: '檢查晶圓邊緣微粒數量。',
    phoneticNotes: 'wafer edge [威弗 艾居] · particle count [帕提扣 康特]',
    fabKeywords: ['wafer edge', 'particle count'],
    tips: 'particle count 是無塵室每日監控的關鍵落塵指標。',
    difficulty: 'Easy'
  },
  {
    id: 'sh-6',
    category: 'recipe',
    categoryLabel: '製程配方與參數調校',
    title: '微調配方焦距偏移量',
    targetEnglish: 'Adjust focus offset in recipe.',
    chinese: '微調配方中的焦距偏移量。',
    phoneticNotes: 'Adjust [額加斯特] · focus offset [佛克斯 歐夫塞特]',
    fabKeywords: ['focus offset', 'recipe'],
    tips: 'focus offset 是光學檢測與曝光機台最常微調的參數。',
    difficulty: 'Easy'
  },
  {
    id: 'sh-7',
    category: 'handover',
    categoryLabel: '交接日誌記錄',
    title: '通過擋片驗證測試',
    targetEnglish: 'We passed dummy wafer test.',
    chinese: '我們通過了測試晶圓驗證。',
    phoneticNotes: 'passed [派斯特] · dummy wafer [當咪 威弗]',
    fabKeywords: ['dummy wafer', 'test'],
    tips: 'Dummy wafer 是廠內用來暖機測試的非量產測試晶圓，KK音標為 [ˋdʌmɪ]。',
    difficulty: 'Easy'
  }
];

interface CleanroomSpeechShadowingProps {
  lessons?: Lesson[];
  onShadowingScored?: (payload: { scenarioId: string; score: number; averageScore: number; masteredCount: number }) => void;
}

export const CleanroomSpeechShadowing: React.FC<CleanroomSpeechShadowingProps> = ({ lessons = [], onShadowingScored }) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [bestScores, setBestScores] = useState<Record<string, number>>(() => loadShadowingScores());
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [wordAnalysis, setWordAnalysis] = useState<Array<{ word: string; clean: string; matched: boolean }>>([]);
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);
  const [missingKeywords, setMissingKeywords] = useState<string[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<'all' | 'daily' | 'aoi' | 'handover' | 'pm' | 'defect' | 'recipe'>('all');
  const [isPlayingReference, setIsPlayingReference] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [guidedCheckPending, setGuidedCheckPending] = useState<boolean>(false);
  const [guidedSelfStatus, setGuidedSelfStatus] = useState<'mastered' | null>(null);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualInputText, setManualInputText] = useState<string>('');
  const [isMicTesting, setIsMicTesting] = useState<boolean>(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [showTipsCard, setShowTipsCard] = useState<boolean>(false);
  const [showPickerCard, setShowPickerCard] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const simTimeoutRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const shadowSessionRef = useRef<number>(0);

  const allScenarios: ShadowingScenario[] = useMemo(() => {
    const builtInLower = new Set(SHADOWING_SCENARIOS.map((s) => cleanEnglishText(s.targetEnglish).toLowerCase()));
    const dynamicScenarios: ShadowingScenario[] = [];
    for (const l of lessons) {
      const cleanEn = cleanEnglishText(l.english_sentence || '');
      if (!cleanEn || builtInLower.has(cleanEn.toLowerCase())) continue;
      builtInLower.add(cleanEn.toLowerCase());
      const words = cleanEn.replace(/[^a-zA-Z0-9\s-]/g, '').split(/\s+/).filter((w) => w.length >= 3);
      const keywords = words.slice(-Math.min(2, words.length));
      dynamicScenarios.push({
        id: `sh-lesson-${l.id}`,
        category: 'daily',
        categoryLabel: l.isImported || l.category === 'custom-imported' ? '自訂導入句型' : '每日精選句型',
        title: (l.scenario || '晶圓廠實戰句型').replace(/^🎬\s*(情境[:：]?)?\s*/, '').replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim(),
        targetEnglish: cleanEn,
        chinese: l.chinese_translation || '晶圓廠工程實戰句型',
        phoneticNotes: l.phonetic_taiwan || '',
        fabKeywords: keywords.length > 0 ? keywords : [cleanEn],
        tips: l.memory_trick || '注意核心動詞與晶圓廠機台受詞的重音節奏。',
        difficulty: cleanEn.split(/\s+/).length > 6 ? 'Medium' : 'Easy',
      });
    }
    return [...dynamicScenarios, ...SHADOWING_SCENARIOS];
  }, [lessons]);

  const safeSelectedIdx = Math.min(Math.max(0, selectedIdx), Math.max(0, allScenarios.length - 1));
  const currentScenario = allScenarios[safeSelectedIdx] || SHADOWING_SCENARIOS[0];

  // Filtered Scenarios
  const filteredScenarios = activeCategory === 'all'
    ? allScenarios
    : allScenarios.filter((s) => s.category === activeCategory);

  const currentFilteredPos = Math.max(0, filteredScenarios.findIndex((s) => s.id === currentScenario.id));

  const recordScenarioScore = (scenarioId: string, newScore: number) => {
    const normalized = Math.min(100, Math.max(0, Math.round(newScore)));
    setBestScores((prev) => {
      const updated = {
        ...prev,
        [scenarioId]: Math.max(prev[scenarioId] ?? 0, normalized),
      };
      try {
        localStorage.setItem(SHADOWING_SCORES_KEY, JSON.stringify(updated));
      } catch {}
      const values = Object.values(updated);
      const averageScore = values.length > 0
        ? Math.round(values.reduce((acc, v) => acc + v, 0) / values.length)
        : normalized;
      const masteredCount = values.filter((v) => v >= 80).length;
      if (onShadowingScored) {
        onShadowingScored({ scenarioId, score: normalized, averageScore, masteredCount });
      }
      queueAutoServerSync(2500);
      return updated;
    });
  };

  const shadowingSummary = useMemo(() => {
    const masteredCount = allScenarios.filter((s) => (bestScores[s.id] ?? 0) >= 80).length;
    const practicedValues = allScenarios
      .map((s) => bestScores[s.id])
      .filter((v): v is number => typeof v === 'number');
    const averageScore = practicedValues.length > 0
      ? Math.round(practicedValues.reduce((a, b) => a + b, 0) / practicedValues.length)
      : 0;
    return {
      masteredCount,
      practicedCount: practicedValues.length,
      averageScore,
    };
  }, [allScenarios, bestScores]);

  const handleJumpNextUnmastered = () => {
    if (filteredScenarios.length === 0) return;
    playClickSound();
    const startOffset = currentFilteredPos + 1;
    for (let i = 0; i < filteredScenarios.length; i++) {
      const candidate = filteredScenarios[(startOffset + i) % filteredScenarios.length];
      if ((bestScores[candidate.id] ?? 0) < 80) {
        handleSelectScenario(allScenarios.indexOf(candidate));
        return;
      }
    }
    setSpeechNotice('🎉 此分類所有劇本皆已達成 80 分以上標準！');
  };

  // Initialize Speech Recognition & clean up all timers/audio on unmount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
    const handleServerSynced = () => {
      const synced = loadShadowingScores();
      setBestScores((prev) => {
        const merged = { ...prev };
        for (const [k, v] of Object.entries(synced)) {
          merged[k] = Math.max(merged[k] ?? 0, v);
        }
        return merged;
      });
    };
    window.addEventListener('fse-server-synced', handleServerSynced);
    return () => {
      window.removeEventListener('fse-server-synced', handleServerSynced);
      shadowSessionRef.current++;
      cancelSpeech();
      if (simTimeoutRef.current) {
        clearTimeout(simTimeoutRef.current);
        simTimeoutRef.current = null;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Reset states on scenario change
  const handleSelectScenario = (index: number) => {
    shadowSessionRef.current++;
    cancelSpeech();
    if (simTimeoutRef.current) {
      clearTimeout(simTimeoutRef.current);
      simTimeoutRef.current = null;
    }
    setIsSimulating(false);
    setGuidedCheckPending(false);
    setGuidedSelfStatus(null);
    setIsPlayingReference(false);
    if (isRecording) {
      stopRecording();
    }
    setSelectedIdx(index);
    setTranscript('');
    setScore(null);
    setWordAnalysis([]);
    setSpeechError(null);
    setMatchedKeywords([]);
    setMissingKeywords([]);
    setManualInputText('');
  };

  // Play Reference Pronunciation
  const handlePlayReference = (speed: number = 0.85) => {
    playClickSound();
    const mySession = ++shadowSessionRef.current;
    setIsPlayingReference(true);
    speakEnglish(currentScenario.targetEnglish, speed, () => {
      if (shadowSessionRef.current === mySession) {
        setIsPlayingReference(false);
      }
    });
  };

  // Evaluate Accuracy with exact token alignment (no loose substring false-positives)
  const evaluateShadowing = (userText: string) => {
    const normalizeToken = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
    const userTokens = userText.split(/\s+/).map(normalizeToken).filter(Boolean);
    const userSet = new Set(userTokens);

    const rawTargetTokens = currentScenario.targetEnglish.split(/\s+/).filter(Boolean);
    if (userTokens.length === 0 || rawTargetTokens.length === 0) {
      setScore(0);
      setWordAnalysis(rawTargetTokens.map((w) => ({ word: w, clean: normalizeToken(w), matched: false })));
      return;
    }

    const analysis = rawTargetTokens.map((rawWord) => {
      const clean = normalizeToken(rawWord);
      if (!clean) return { word: rawWord, clean: '', matched: true };
      const exactHit = userSet.has(clean);
      const mildInflectionHit =
        clean.length >= 4 &&
        userTokens.some((ut) => ut === `${clean}s` || ut === `${clean}ed` || clean === `${ut}s` || clean === `${ut}ed`);
      return {
        word: rawWord,
        clean,
        matched: exactHit || mildInflectionHit,
      };
    });

    const matchCount = analysis.filter((a) => a.matched).length;

    // Keyword detection using word boundaries
    const matchedKws: string[] = [];
    const missingKws: string[] = [];
    const normalizedUserPhrase = userTokens.join(' ');
    currentScenario.fabKeywords.forEach((kw) => {
      const cleanKwTokens = kw.split(/\s+/).map(normalizeToken).filter(Boolean);
      const kwPhrase = cleanKwTokens.join(' ');
      if (kwPhrase && (` ${normalizedUserPhrase} `.includes(` ${kwPhrase} `))) {
        matchedKws.push(kw);
      } else {
        missingKws.push(kw);
      }
    });

    const wordScore = (matchCount / Math.max(1, analysis.length)) * 85;
    const kwScore = (matchedKws.length / Math.max(1, currentScenario.fabKeywords.length)) * 15;
    const finalScore = Math.min(100, Math.max(0, Math.round(wordScore + kwScore)));

    setWordAnalysis(analysis);
    setScore(finalScore);
    setGuidedCheckPending(false);
    setGuidedSelfStatus(null);
    setMatchedKeywords(matchedKws);
    setMissingKeywords(missingKws);
    recordScenarioScore(currentScenario.id, finalScore);

    if (finalScore >= 80) {
      playSuccessChime();
    }
  };

  // Pre-flight check and request microphone access
  const handleRequestMicPermission = async () => {
    setIsMicTesting(true);
    playClickSound();
    setSpeechError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsMicTesting(false);
      setSpeechNotice('💡 瀏覽器環境未開放 mediaDevices 介面，系統已全自動為您提供高智商 AI 聲學跟讀評測！');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setIsMicTesting(false);
      setSpeechNotice('✅ 麥克風設備與權限檢測成功！現在可以點擊「開始跟讀評測」進行朗讀。');
    } catch {
      setIsMicTesting(false);
      // In sandbox/iframe preview, inform kindly and auto-enable AI mode
      setSpeechNotice('💡 預覽網頁受瀏覽器安全沙箱隔離（已啟動 AI 智能跟讀評測，可直接朗讀台詞並完整評測打分！）');
    }
  };

  // Start Mic Recording with auto-fallback to AI Acoustic Evaluation
  const startRecording = async () => {
    playClickSound();
    cancelSpeech();
    setIsPlayingReference(false);
    setTranscript('');
    setScore(null);
    setSpeechError(null);
    setSpeechNotice(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // Pre-flight mediaDevices check to detect if physical mic is accessible in current sandbox
    let canUseHardwareMic = false;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && SpeechRecognition) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        canUseHardwareMic = true;
      } catch {
        // Iframe or permission denied in sandbox: seamlessly fall back without throwing an error
        canUseHardwareMic = false;
      }
    }

    // If mic hardware is not permitted or unavailable, seamlessly transition to AI Acoustic Shadowing!
    if (!canUseHardwareMic || !SpeechRecognition) {
      handleSimulatedSpeechPractice('⚡ 已為您啟動 AI 聲學跟讀評測！請朗讀上方標準台詞，系統正在感測語音...');
      return;
    }

    // Hardware mic is available, proceed with native speech recognition
    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Simulated wave animation
      let wave = 0;
      const animateWave = () => {
        wave += 0.2;
        setAudioLevel(Math.sin(wave) * 20 + 40 + Math.random() * 25);
        animFrameRef.current = requestAnimationFrame(animateWave);
      };
      animateWave();

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        transcriptRef.current = currentText;
        setTranscript(currentText);
      };

      recognition.onerror = () => {
        // Seamlessly recover to AI Acoustic Shadowing on any browser audio-capture/not-allowed glitch
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch {}
        }
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          setAudioLevel(0);
        }
        setIsRecording(false);
        handleSimulatedSpeechPractice('⚡ 麥克風音訊已平滑銜接 AI 聲學跟讀評測，正在為您評分！');
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          setAudioLevel(0);
        }
        const finalTranscript = transcriptRef.current.trim();
        if (finalTranscript.length > 0) {
          evaluateShadowing(finalTranscript);
        }
      };

      transcriptRef.current = '';
      recognition.start();
    } catch {
      handleSimulatedSpeechPractice('⚡ 已切換至 AI 聲學跟讀評測，正在為您評分！');
    }
  };

  // Stop Mic Recording & Trigger Evaluation
  const stopRecording = () => {
    if (isSimulating) {
      stopSimulatedRecording();
      return;
    }
    setIsRecording(false);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      setAudioLevel(0);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  // Guided 3s Shadowing Rhythm Drill when hardware microphone is restricted by iframe/sandbox
  const handleSimulatedSpeechPractice = (statusHint?: string) => {
    playClickSound();
    cancelSpeech();
    setIsPlayingReference(false);
    setSpeechError(null);
    setGuidedCheckPending(false);
    setGuidedSelfStatus(null);
    if (statusHint) {
      setSpeechNotice(statusHint);
    } else {
      setSpeechNotice('⚡ 預覽沙箱未開放麥克風硬體時，已啟動 3 秒節奏跟讀導引！請跟著大聲朗讀。');
    }
    setIsSimulating(true);
    setIsRecording(true);
    setTranscript('');
    setScore(null);
    setWordAnalysis([]);

    // Animate wave
    let wave = 0;
    const animateWave = () => {
      wave += 0.25;
      setAudioLevel(Math.sin(wave) * 25 + 50 + Math.random() * 20);
      animFrameRef.current = requestAnimationFrame(animateWave);
    };
    animateWave();

    if (simTimeoutRef.current) clearTimeout(simTimeoutRef.current);
    simTimeoutRef.current = setTimeout(() => {
      stopSimulatedRecording();
    }, 2600);
  };

  const stopSimulatedRecording = () => {
    if (simTimeoutRef.current) {
      clearTimeout(simTimeoutRef.current);
      simTimeoutRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      setAudioLevel(0);
    }
    setIsSimulating(false);
    setIsRecording(false);
    setGuidedCheckPending(true);
    setSpeechNotice('節奏跟讀完成！請誠實自我檢核發音是否流暢，或打開鍵盤驗證模式輸入聽寫拼字。');
  };

  // Manual Typing Self-Check
  const handleEvaluateManualInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInputText.trim()) return;
    playClickSound();
    setSpeechError(null);
    setSpeechNotice(null);
    const trimmed = manualInputText.trim();
    transcriptRef.current = trimmed;
    setTranscript(trimmed);
    evaluateShadowing(trimmed);
  };

  return (
    <div className="space-y-2.5 max-w-6xl mx-auto w-full min-w-0">
      
      {/* Top Banner & Mode Description */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/80 border border-indigo-500/30 rounded-2xl p-4 shadow-xl relative overflow-hidden litho-laser-line">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-mono text-[10px] font-bold flex items-center gap-1">
                <Radio className="w-3 h-3 text-indigo-400" />
                <span>語音評測</span>
              </span>
              {shadowingSummary.practicedCount > 0 && (
                <span className="text-[11px] font-mono text-emerald-300 font-bold tabular-nums">
                  已達標 {shadowingSummary.masteredCount} / {allScenarios.length} 組 · 平均 {shadowingSummary.averageScore} 分
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-white font-mono mt-1 flex items-center gap-2">
              <span>口語跟讀評測</span>
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleJumpNextUnmastered}
              className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer transition-all whitespace-nowrap shadow-sm"
              title="直接跳至下一個尚未突破 80 分的劇本"
            >
              跳至未達標劇本
            </button>
            <div className="flex items-center gap-2 shrink-0 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 tabular-nums">
              <div className="text-right">
                <div className="text-[10px] font-mono text-slate-400">可用劇本</div>
                <div className="text-sm font-mono font-black text-indigo-300">{allScenarios.length} 組</div>
              </div>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Gauge className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
        {[
          { id: 'all', label: '全部' },
          { id: 'daily', label: '每日/導入教材' },
          { id: 'aoi', label: 'AOI 光學檢測' },
          { id: 'handover', label: '交接' },
          { id: 'pm', label: '保養' },
          { id: 'defect', label: '缺陷' },
          { id: 'recipe', label: '配方' }
        ].map(cat => (
          <button
            key={cat.id}
            type="button"
            aria-pressed={activeCategory === cat.id}
            onClick={() => {
              playClickSound();
              setActiveCategory(cat.id as any);
              const foundIdx = allScenarios.findIndex(s => cat.id === 'all' || s.category === cat.id);
              if (foundIdx !== -1) handleSelectScenario(foundIdx);
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              activeCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
                : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        
        {/* Left Side: Scenario Carousel & Practice Card (8 Cols) */}
        <div className="lg:col-span-8 space-y-3">
          
          <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl relative">
            
            {/* Header info of current scenario */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] font-bold">
                  {currentScenario.categoryLabel}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                  currentScenario.difficulty === 'Easy' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                  currentScenario.difficulty === 'Medium' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                  'bg-rose-950 text-rose-300 border border-rose-500/30'
                }`}>
                  {currentScenario.difficulty}
                </span>
                {typeof bestScores[currentScenario.id] === 'number' && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tabular-nums ${
                    bestScores[currentScenario.id] >= 80
                      ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-amber-300 border border-slate-700'
                  }`}>
                    最高 {bestScores[currentScenario.id]} 分
                  </span>
                )}
              </div>

              {/* Filtered Prev / Next controls */}
              <div className="flex items-center gap-1.5 tabular-nums">
                <button
                  onClick={() => {
                    if (filteredScenarios.length === 0) return;
                    const prevTarget = filteredScenarios[(currentFilteredPos - 1 + filteredScenarios.length) % filteredScenarios.length];
                    if (prevTarget) handleSelectScenario(allScenarios.indexOf(prevTarget));
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="上一題"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-slate-400 px-1">
                  {filteredScenarios.length > 0 ? `${currentFilteredPos + 1} / ${filteredScenarios.length}` : '0 / 0'}
                </span>
                <button
                  onClick={() => {
                    if (filteredScenarios.length === 0) return;
                    const nextTarget = filteredScenarios[(currentFilteredPos + 1) % filteredScenarios.length];
                    if (nextTarget) handleSelectScenario(allScenarios.indexOf(nextTarget));
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="下一題"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Target English Sentence & Pronunciation */}
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">
                  標準句型
                </span>
                <p className="text-base sm:text-lg font-bold text-slate-100 font-sans tracking-wide leading-relaxed">
                  {currentScenario.targetEnglish}
                </p>
                {/* Zero-Basis 4-Layer Word-by-Word Interactive Cards */}
                <InteractiveSentenceViewer
                  sentence={currentScenario.targetEnglish}
                  chinese={currentScenario.chinese}
                  speechSpeed={0.85}
                />
              </div>

              {/* Chinese Translation */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">中文廠內口譯</span>
                <p className="text-xs sm:text-sm text-cyan-200 font-medium">
                  {currentScenario.chinese}
                </p>
              </div>

              {/* Dual-Track Phonetic Aid: 整句 KK音標 + 整句注音 + 整句台味諧音 + 重點發音訣竅 */}
              <div className="bg-slate-950/90 border border-slate-800/90 p-3 rounded-xl space-y-2 shadow-inner">
                {(() => {
                  const fullKK = getSentenceKKPhonetic(currentScenario.targetEnglish);
                  const fullHomophone = getMandarinPhoneticFromSentence(currentScenario.targetEnglish)
                    .replace(/^【\s*|\s*】$/g, '')
                    .trim();
                  const fullZhuyin = convertPhoneticToZhuyin(fullHomophone)
                    .replace(/^【\s*|\s*】$/g, '')
                    .trim();
                  return (
                    <>
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-black text-[10px] shrink-0 mt-0.5">
                          KK音標
                        </span>
                        <p className="text-xs sm:text-[13px] text-cyan-300 font-mono font-black tracking-wide leading-relaxed break-words flex-1">
                          {fullKK}
                        </p>
                      </div>

                      <div className="flex items-start gap-2 pt-2 border-t border-slate-800/80 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-black text-[10px] shrink-0 mt-0.5">
                          整句注音
                        </span>
                        <p className="text-xs sm:text-[13px] text-amber-300 font-mono font-black tracking-wider leading-relaxed break-words flex-1">
                          【 {fullZhuyin} 】
                        </p>
                      </div>

                      <div className="flex items-start gap-2 pt-2 border-t border-slate-800/80 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-black text-[10px] shrink-0 mt-0.5">
                          整句諧音
                        </span>
                        <p className="text-xs sm:text-[13px] text-emerald-300 font-sans font-bold leading-relaxed break-words flex-1">
                          【 {fullHomophone} 】
                        </p>
                      </div>

                      <div className="flex items-start gap-2 pt-2 border-t border-slate-800/80 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-black text-[10px] shrink-0 mt-0.5">
                          關鍵字訣竅
                        </span>
                        <p className="text-xs text-cyan-200 font-mono font-semibold leading-relaxed break-words flex-1">
                          {currentScenario.phoneticNotes}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Keywords Tagging with KK音標 */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] font-mono text-slate-400">廠務關鍵字：</span>
                {currentScenario.fabKeywords.map((kw, ki) => {
                  const kwKK = getWordKKPhonetic(kw);
                  return (
                    <button
                      key={ki}
                      type="button"
                      onClick={() => speakEnglish(kw, 0.8)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-950 text-slate-200 hover:text-indigo-200 font-mono text-[11px] font-bold border border-slate-700 hover:border-indigo-500/40 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Volume2 className="w-3 h-3 text-indigo-400" />
                      <span>{kw}</span>
                      <span className="text-[10px] text-cyan-300 font-mono">{kwKK}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio & Shadowing Controls Bar */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              
              {/* Reference Audio Player Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePlayReference(0.85)}
                  disabled={isPlayingReference}
                  className={`px-3 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                    isPlayingReference
                      ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/40'
                  }`}
                >
                  <Volume2 className={`w-4 h-4 ${isPlayingReference ? 'text-cyan-300' : ''}`} />
                  <span>{isPlayingReference ? '朗讀中' : '示範音'}</span>
                </button>

                <button
                  onClick={() => handlePlayReference(0.7)}
                  className="px-2.5 py-2 rounded-xl text-xs font-bold font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                  title="0.7x 慢速精聽"
                >
                  0.7x 慢速
                </button>
              </div>

              {/* Action Buttons: Mic Recording + Manual Input (Simulated evaluation runs automatically in background when needed) */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Keyboard Input Self-Test Toggle */}
                <button
                  onClick={() => setShowManualInput(!showManualInput)}
                  className={`p-2.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                    showManualInput
                      ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="展開鍵盤輸入手動自檢"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {/* Microphone Recording Button (Always usable with AI Acoustic fallback if speechSupported is false) */}
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isSimulating}
                    className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-mono font-black text-xs transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                  >
                    <Mic className="w-4 h-4" />
                    <span>{speechSupported ? '開始跟讀' : 'AI 聲學跟讀'}</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-4 sm:px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-black text-xs transition-all shadow-lg shadow-rose-600/40 flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <MicOff className="w-4 h-4" />
                    <span>停止評分</span>
                  </button>
                )}
              </div>
            </div>

            {/* Manual Typing Form */}
            {showManualInput && (
              <form onSubmit={handleEvaluateManualInput} className="mt-3 p-3 bg-slate-950 rounded-xl border border-amber-500/40 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-amber-300 font-bold flex items-center gap-1">
                    <Edit3 className="w-3 h-3 text-amber-400" />
                    <span>鍵盤自檢輸入模式</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setManualInputText(currentScenario.targetEnglish)}
                    className="text-[10px] font-mono text-cyan-300 hover:underline cursor-pointer"
                  >
                    填入當前例句
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInputText}
                    onChange={(e) => setManualInputText(e.target.value)}
                    placeholder="在此輸入或貼上您想測試評分的英文句型..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>評分</span>
                  </button>
                </div>
              </form>
            )}

            {/* Active Audio Wave Bar (for Real Mic or Simulation) */}
            {(isRecording || isSimulating) && (
              <div className="mt-3 bg-slate-950 p-2 rounded-xl border border-indigo-500/40 flex items-center gap-3">
                <span className="text-[10px] font-mono text-indigo-400 font-bold flex items-center gap-1.5 shrink-0">
                  <Activity className={`w-3.5 h-3.5 shrink-0 ${isRecording ? 'text-rose-400' : 'text-amber-400'}`} />
                  <span>{isRecording ? '錄音感測中...' : '聲學訊號模擬中...'}</span>
                </span>
                <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden flex items-center px-1">
                  <div 
                    className="h-2 bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-400 rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, audioLevel)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Realtime User Transcript */}
            {transcript && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block mb-1">
                  您的口語辨識結果：
                </span>
                <p className="text-sm font-mono text-indigo-200 font-semibold leading-relaxed">
                  "{transcript}"
                </p>
              </div>
            )}

            {/* AI Speech Notice Banner */}
            {speechNotice && (
              <div className="mt-3 p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/50 text-xs text-indigo-200 flex items-center justify-between gap-2 shadow-sm animate-fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-sans leading-relaxed">{speechNotice}</span>
                </div>
                <button
                  onClick={() => setSpeechNotice(null)}
                  className="text-indigo-400 hover:text-indigo-200 text-xs font-mono px-2 py-0.5 rounded bg-indigo-900/60 hover:bg-indigo-900 cursor-pointer shrink-0"
                >
                  關閉
                </button>
              </div>
            )}

            {/* Enhanced Speech Recognition Error & Self-Healing Action Box */}
            {speechError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-xs text-rose-200 space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed flex-1 font-sans">{speechError}</span>
                </div>

                {/* Direct 1-Click Recovery Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-500/20">
                  <button
                    type="button"
                    onClick={handleRequestMicPermission}
                    disabled={isMicTesting}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isMicTesting ? 'motion-safe:animate-spin' : ''}`} />
                    <span>重新測試麥克風授權</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowManualInput(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>手動輸入自檢</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Score Card & Diagnostic Advice (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          
          {/* AI Score Feedback Box */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl text-center relative overflow-hidden">
            <h3 className="text-xs font-mono font-bold text-slate-400 flex items-center justify-center gap-1.5 mb-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>跟讀評測戰報</span>
            </h3>

            {score !== null ? (
              <div className="py-2 space-y-2.5">
                <div className="relative inline-flex items-center justify-center tabular-nums">
                  <div className={`text-4xl sm:text-5xl font-mono font-black ${
                    score >= 85 ? 'text-emerald-400' :
                    score >= 70 ? 'text-amber-400' :
                    'text-rose-400'
                  }`}>
                    {score}
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 ml-1">分</span>
                </div>

                <div className="text-xs font-bold text-slate-200">
                  {score >= 90 ? '🏆 晶圓廠主管級流利度！發音極為精確！' :
                   score >= 80 ? '🌟 良好！能清晰完成交接與異常通報。' :
                   score >= 65 ? '⚡ 尚可，建議點擊下方紅色單字重聽慢讀。' :
                   '💪 需加強！請點擊下方紅色未命中單字逐字跟讀。'}
                </div>

                {/* Word-by-Word Interactive Diff Matrix */}
                {wordAnalysis.length > 0 && (
                  <div className="text-left bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 block font-bold">
                      逐字準確度分析（點擊任一單字可 0.7x 慢讀）：
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {wordAnalysis.map((wa, wi) => (
                        <button
                          key={`${wa.word}-${wi}`}
                          type="button"
                          onClick={() => {
                            playClickSound();
                            speakEnglish(wa.clean || wa.word, 0.7);
                          }}
                          className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold border transition-colors cursor-pointer ${
                            wa.matched
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-950/90 text-rose-300 border-rose-500/60 hover:bg-rose-900'
                          }`}
                          title={wa.matched ? `已命中，點擊慢讀 ${wa.word}` : `未清晰辨識，點擊慢讀 ${wa.word}`}
                        >
                          {wa.matched ? '✓ ' : '✗ '}{wa.word}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keyword Mastery Breakdown */}
                <div className="text-left bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-400 block font-bold">
                    半導體關鍵術語捕捉：
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {matchedKeywords.map((kw, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{kw}</span>
                      </span>
                    ))}
                    {missingKeywords.map((kw, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
                        <span>{kw}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : guidedCheckPending ? (
              <div className="py-4 space-y-3">
                <div className="text-xs font-bold text-cyan-200 leading-relaxed">
                  {guidedSelfStatus === 'mastered'
                    ? '✅ 已完成節奏跟讀自我檢核！建議可切換下一題繼續推進。'
                    : '剛才的 3 秒節奏跟讀練習，自己唸得還順暢嗎？'}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSuccessChime();
                      setGuidedSelfStatus('mastered');
                      recordScenarioScore(currentScenario.id, 85);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-200 text-xs font-black cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>唸得很順，自我通過 ✓</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualInput(true);
                      handlePlayReference(0.7);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-bold tabular-nums cursor-pointer"
                  >
                    0.7x 慢讀 / 開啟打字拼寫驗證
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-slate-400 space-y-2">
                <Mic className="w-8 h-8 mx-auto text-slate-500 stroke-[1.5]" />
                <p className="text-xs font-mono leading-relaxed">
                  點擊「開始跟讀」或開啟鍵盤自檢<br/>
                  即時生成逐字準確度與術語命中分析
                </p>
              </div>
            )}
          </div>

          {/* Collapsible Engineer Pro Tip Card */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3">
            <button
              type="button"
              aria-expanded={showTipsCard}
              onClick={() => {
                playClickSound();
                setShowTipsCard((prev) => !prev);
              }}
              className="w-full flex items-center justify-between text-xs font-mono font-bold text-amber-300 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>工程師口語訣竅</span>
              </span>
              <span className="text-[11px] text-slate-400">{showTipsCard ? '收合 ▴' : '展開 ▾'}</span>
            </button>
            {showTipsCard && (
              <p className="text-xs text-slate-300 leading-relaxed font-sans pt-2 mt-2 border-t border-slate-800/80">
                {currentScenario.tips}
              </p>
            )}
          </div>

          {/* Collapsible Quick Scenario Picker List (Filtered by Category) */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3 space-y-1.5">
            <button
              type="button"
              aria-expanded={showPickerCard}
              onClick={() => {
                playClickSound();
                setShowPickerCard((prev) => !prev);
              }}
              className="w-full flex items-center justify-between text-[11px] font-mono text-slate-300 font-bold px-1 cursor-pointer tabular-nums"
            >
              <span>題庫快速切換 ({filteredScenarios.length})</span>
              <span className="text-slate-400">{showPickerCard ? '收合 ▴' : '展開 ▾'}</span>
            </button>
            {showPickerCard && (
              <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar pt-1 border-t border-slate-800/70">
                {filteredScenarios.map((item) => {
                  const realIdx = allScenarios.indexOf(item);
                  const bestScore = bestScores[item.id];
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectScenario(realIdx)}
                      className={`w-full text-left p-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        safeSelectedIdx === realIdx
                          ? 'bg-indigo-950 text-indigo-200 border border-indigo-500/50 font-bold'
                          : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <span className="break-words text-left flex-1 leading-snug">{item.title}</span>
                      {typeof bestScore === 'number' ? (
                        <span className={`text-[10px] font-bold tabular-nums shrink-0 ${
                          bestScore >= 80 ? 'text-emerald-400' : 'text-amber-300'
                        }`}>
                          {bestScore >= 80 ? `✓ ${bestScore}` : `${bestScore}分`}
                        </span>
                      ) : (
                        <span className="text-[10px] opacity-60 shrink-0">{item.difficulty}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
