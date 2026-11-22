import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Upload,
  Image as ImageIcon,
  FileText,
  Volume2,
  CheckCircle2,
  Sparkles,
  Trash2,
  PlusCircle,
  Layers,
  BookOpen,
  Play,
  Square,
  FolderOpen,
  RefreshCw,
  ClipboardPaste,
  Search,
  Download,
  Cpu,
  Edit3,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Lesson, VocabItem, SingleSoundSyllable } from '../types';
import { AOI_NOTE_SHEETS, AOI_HANDWRITTEN_VOCAB, AOI_HANDWRITTEN_LESSONS } from '../data/aoiHandwrittenData';
import { getWordKKPhonetic } from '../utils/wordDictionary';
import { auditAndConvertImportedData, sanitizeTextToPublicSafe, PipAuditReport } from '../utils/pipSanitizer';
import { speakEnglish, speakSingleEnglishWord, speakChinese, cancelSpeech } from '../utils/speech';
import { playClickSound, playSuccessChime } from '../utils/audioEffects';
import { InteractiveSentenceViewer } from './InteractiveSentenceViewer';

interface CustomMediaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechSpeed: number;
  importedVocab: VocabItem[];
  importedLessons: Lesson[];
  onSaveImportedData: (newVocab: VocabItem[], newLessons: Lesson[]) => void;
  onUpdateImportedVocab?: (updatedItem: VocabItem) => void;
  onClearImportedData: () => void;
  onDeleteImportedVocab?: (vocabId: string) => void;
  onDeleteImportedLesson?: (lessonId: string) => void;
  onJumpToImportedLessons?: () => void;
}

const SAMPLE_IMPORT_PRESETS = [
  {
    id: 'preset-photo-alarm',
    label: '光學檢測 20 單字速學範本',
    fileName: 'Optical_Inspection_20_Vocab.txt',
    rawText: `Check the jump sensor. Place the JIG board. We tune the light. Run inspection teach. We align the layout. Scan the 2D code. Check the C4 bumps. Check the underfill. Inspect the Cu pad.`,
  },
  {
    id: 'preset-file-pm',
    label: '氣相沉積保養範例 (.txt)',
    fileName: 'Chamber_PM_SOP_Checklist.txt',
    rawText: `Purge the chamber. Replace the O-ring. Clean the nozzle. Reset the interlock.`,
  },
  {
    id: 'preset-file-email',
    label: '設備交接日誌範例 (.log)',
    fileName: 'Shift_Handover_Report.log',
    rawText: `Check the RF power. Plasma is normal. Check water flow.`,
  },
  {
    id: 'preset-file-etch',
    label: '電漿蝕刻腔體範例 (.csv)',
    fileName: 'Etch_Chamber_Report.csv',
    rawText: `Check the chuck. Inspect the valve. Clean the exhaust.`,
  },
];

function sanitizeConfidentialInput(text: string): string {
  return sanitizeTextToPublicSafe(String(text || '')).text;
}

const AOI_PROCESS_FIVE_STATES = [
  {
    step: 1,
    eng: 'No Wafer',
    kk: '[no ˋwefɚ]',
    zhuyin: 'ㄋㄡ · ㄨㄟ · ㄈㄜˇ',
    homo: '諾 · 威 · 弗',
    zh: '無晶圓',
    desc: '載台或吸盤上目前無基板，等待上料機進片',
  },
  {
    step: 2,
    eng: 'No Process',
    kk: '[no ˋprɑsɛs]',
    zhuyin: 'ㄋㄡ · ㄆㄨˇ ㄌㄨㄛˊ · ㄙㄞˋ ㄙ',
    homo: '諾 · 普羅 · 賽斯',
    zh: '未執行製程',
    desc: '機台待機中，尚未啟動檢測配方或批次任務',
  },
  {
    step: 3,
    eng: 'Wait Process',
    kk: '[wet ˋprɑsɛs]',
    zhuyin: 'ㄨㄟˋ ㄊㄜˋ · ㄆㄨˇ ㄌㄨㄛˊ · ㄙㄞˋ ㄙ',
    homo: '威特 · 普羅 · 賽斯',
    zh: '等待製程',
    desc: '基板已定位對準完成，等待鏡頭開始取像掃描',
  },
  {
    step: 4,
    eng: 'Processing',
    kk: '[ˋprɑsɛsɪŋ]',
    zhuyin: 'ㄆㄨˇ ㄌㄨㄛˊ · ㄙㄞˋ · ㄒㄧㄥ',
    homo: '普羅 · 賽 · 星',
    zh: '製程檢測中',
    desc: '光學鏡頭高速取像與演算法比對中，嚴禁開門',
  },
  {
    step: 5,
    eng: 'End Process',
    kk: '[ɛnd ˋprɑsɛs]',
    zhuyin: 'ㄣ ㄉㄜˊ · ㄆㄨˇ ㄌㄨㄛˊ · ㄙㄞˋ ㄙ',
    homo: '恩德 · 普羅 · 賽斯',
    zh: '製程結束',
    desc: '單片檢測完成並產出結果，交由下料機收片完成一個 Cycle',
  },
];

const AOI_SPELLING_TIPS = [
  {
    wrong: 'Die Jump Senser',
    correct: 'Die Jump Sensor',
    kk: '[daɪ dʒʌmp ˋsɛnsɚ]',
    zh: '跳晶感測器',
    tip: '公開光學檢測單元 1 常誤寫為 Senser，標準字尾是 -sor！',
  },
  {
    wrong: 'Substract Inspection',
    correct: 'Substrate Inspection',
    kk: '[ˋsʌbstret ɪnˋspɛkʃən]',
    zh: '基板檢測',
    tip: '公開光學檢測單元 1 常多寫 c 為 Substract，正確拼法是 Substrate！',
  },
  {
    wrong: 'OCV vs OCR 混淆',
    correct: 'OCV 驗證 / OCR 辨識',
    kk: '[o si vi] / [o si ɑr]',
    zh: '字元檢測與字元辨識',
    tip: 'V 是 Verification 檢查印字品質；R 是 Recognition 讀出序號文字！',
  },
];

// Client-side image compression helper so high-res camera photos upload rapidly and never exceed payload limits
async function compressImageFile(file: File, maxDim = 1280, quality = 0.82): Promise<{ dataUrl: string; mimeType: string; name: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      const img = new window.Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve({ dataUrl: compressed, mimeType: 'image/jpeg', name: file.name });
            return;
          }
        } catch {}
        resolve({ dataUrl: rawUrl, mimeType: file.type || 'image/png', name: file.name });
      };
      img.onerror = () => {
        resolve({ dataUrl: rawUrl, mimeType: file.type || 'image/png', name: file.name });
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const CustomMediaImportModal: React.FC<CustomMediaImportModalProps> = ({
  isOpen,
  onClose,
  speechSpeed,
  importedVocab,
  importedLessons,
  onSaveImportedData,
  onUpdateImportedVocab,
  onClearImportedData,
  onDeleteImportedVocab,
  onDeleteImportedLesson,
  onJumpToImportedLessons,
}) => {
  const [importMode, setImportMode] = useState<'aoi-notes' | 'photo' | 'file' | 'library'>('aoi-notes');
  const [selectedAoiSheet, setSelectedAoiSheet] = useState<'all' | 'sheet-1' | 'sheet-2' | 'sheet-3'>('all');
  const [activeResultTab, setActiveResultTab] = useState<'phonics' | 'sentences' | 'quiz'>('phonics');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [previewImages, setPreviewImages] = useState<Array<{ dataUrl: string; mimeType: string; name: string }>>([]);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [rawTextInput, setRawTextInput] = useState<string>('');
  const [quickInputText, setQuickInputText] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [sourceSummary, setSourceSummary] = useState<string>('');
  const [extractedVocab, setExtractedVocab] = useState<VocabItem[]>([]);
  const [extractedLessons, setExtractedLessons] = useState<Lesson[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeSpeakingSound, setActiveSpeakingSound] = useState<string | null>(null);
  const [isAutoPlayingPhonics, setIsAutoPlayingPhonics] = useState<boolean>(false);

  // AOI 5-State Process Simulator State
  const [activeProcessStateStep, setActiveProcessStateStep] = useState<number>(4);
  const [isSimulatingCycle, setIsSimulatingCycle] = useState<boolean>(false);

  // Inline Edit State for Vocab Cards
  const [editingVocabId, setEditingVocabId] = useState<string | null>(null);
  const [editTranslation, setEditTranslation] = useState<string>('');
  const [editKK, setEditKK] = useState<string>('');
  const [editMemoryTrick, setEditMemoryTrick] = useState<string>('');

  // Quick Phonics Quiz State
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizSelectedIdx, setQuizSelectedIdx] = useState<number | null>(null);
  const [quizCorrectCount, setQuizCorrectCount] = useState<number>(0);
  const [quizTotalAttempts, setQuizTotalAttempts] = useState<number>(0);
  const [pipAuditReport, setPipAuditReport] = useState<PipAuditReport | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backupJsonInputRef = useRef<HTMLInputElement | null>(null);
  const autoPlayAbortRef = useRef<boolean>(false);
  const cycleSimAbortRef = useRef<boolean>(false);
  const chainSessionRef = useRef<number>(0);
  const mediaTimerRef = useRef<number | null>(null);

  const clearMediaTimer = () => {
    if (mediaTimerRef.current !== null) {
      window.clearTimeout(mediaTimerRef.current);
      mediaTimerRef.current = null;
    }
  };

  // Stop auto-play when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      autoPlayAbortRef.current = true;
      cycleSimAbortRef.current = true;
      chainSessionRef.current += 1;
      clearMediaTimer();
      setIsAutoPlayingPhonics(false);
      setIsSimulatingCycle(false);
      setActiveSpeakingSound(null);
      cancelSpeech();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      autoPlayAbortRef.current = true;
      cycleSimAbortRef.current = true;
      chainSessionRef.current += 1;
      clearMediaTimer();
      cancelSpeech();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingVocabId) {
          setEditingVocabId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, editingVocabId, onClose]);

  // Global Ctrl+V / Paste support for instant screenshot or text import when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = async (e: ClipboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const f = items[i].getAsFile();
          if (f) imageFiles.push(f);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        playClickSound();
        setImportMode('photo');
        await processPhotoFiles(imageFiles);
        return;
      }

      const pastedText = e.clipboardData?.getData('text/plain')?.trim();
      if (pastedText && /[a-zA-Z]{2,}/.test(pastedText)) {
        e.preventDefault();
        playClickSound();
        setImportMode('file');
        setRawTextInput(pastedText.slice(0, 5000));
        setSelectedFileName('剪貼簿英文');
        triggerExtraction({
          rawText: pastedText.slice(0, 5000),
          fileName: '剪貼簿英文',
        });
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const triggerExtraction = async (payload: {
    imageBase64?: string;
    mimeType?: string;
    images?: Array<{ data: string; mimeType?: string; name?: string }>;
    rawText?: string;
    fileName?: string;
  }) => {
    setIsAnalyzing(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/import-media-english', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          rawText: payload.rawText ? sanitizeConfidentialInput(payload.rawText) : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || '解析失敗');
      }

      const rawVocab: VocabItem[] = (data.vocab || []).map((v: VocabItem) => ({
        ...v,
        word: String(v.word || '').replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim() || v.word,
        translation: String(v.translation || '').replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim() || v.translation,
        kkPhonetic: v.kkPhonetic || getWordKKPhonetic(v.word || '', v.ipa),
        category: 'imported',
        isImported: true,
        sourceFileName: payload.fileName || '公開通用導入',
      }));

      const rawLessons: Lesson[] = (data.lessons || []).map((l: Lesson) => ({
        ...l,
        scenario: (l.scenario || '公開通用導入')
          .replace(/^[^\w\u4e00-\u9fa5【]+/, '')
          .replace(/\s*[\(（][^\)）]*[\)）]/g, '')
          .trim(),
        category: 'custom-imported',
      }));

      const audited = auditAndConvertImportedData(rawVocab, rawLessons);
      const newVocab = audited.vocab;
      const newLessons = audited.lessons;
      setPipAuditReport(audited.report);

      setExtractedVocab(newVocab);
      setExtractedLessons(newLessons);
      setSourceSummary(
        sanitizeTextToPublicSafe(
          data.sourceSummary ||
            `已完成資安去識別化並拆解 ${newVocab.length} 個公開單音詞彙與 ${newLessons.length} 句實戰英文。`,
          { stripEnglishParens: true }
        ).text
      );
      setActiveResultTab('phonics');

      if (newVocab.length > 0 || newLessons.length > 0) {
        onSaveImportedData(newVocab, newLessons);
        playSuccessChime();
        setStatusMessage(
          `已通過資安檢查並轉換為公開資訊：加入 ${newVocab.length} 個單音與 ${newLessons.length} 句英文！`
        );
      }
    } catch (err: any) {
      setStatusMessage(`提示：${err?.message || '請確認檔案或輸入英文內容'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processPhotoFiles = async (files: File[]) => {
    const validFiles = files.filter((f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name)).slice(0, 4);
    if (validFiles.length === 0) return;

    const compressedList = await Promise.all(validFiles.map((f) => compressImageFile(f)));
    setPreviewImages(compressedList);
    const label =
      compressedList.length === 1
        ? compressedList[0].name
        : `${compressedList[0].name} 等 ${compressedList.length} 張照片`;
    setSelectedFileName(label);

    await triggerExtraction({
      imageBase64: compressedList[0].dataUrl,
      mimeType: compressedList[0].mimeType,
      images: compressedList.map((c) => ({ data: c.dataUrl, mimeType: c.mimeType, name: c.name })),
      rawText: rawTextInput.trim() || undefined,
      fileName: label,
    });
  };

  const processTextFiles = async (files: File[]) => {
    const validFiles = files.slice(0, 5);
    if (validFiles.length === 0) return;

    const contents = await Promise.all(
      validFiles.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => resolve('');
            reader.readAsText(file);
          })
      )
    );

    const combinedText = contents.filter(Boolean).join('\n\n').slice(0, 5000);
    const label =
      validFiles.length === 1 ? validFiles[0].name : `${validFiles[0].name} 等 ${validFiles.length} 份檔案`;
    setSelectedFileName(label);
    setPreviewImages([]);
    setRawTextInput(combinedText);

    if (combinedText.trim()) {
      await triggerExtraction({
        rawText: combinedText,
        fileName: label,
      });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    playClickSound();
    await processPhotoFiles(files);
    e.target.value = '';
  };

  const handleTextFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    playClickSound();
    await processTextFiles(files);
    e.target.value = '';
  };

  const handleDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    playClickSound();

    const hasImages = files.some((f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(f.name));
    if (hasImages) {
      setImportMode('photo');
      await processPhotoFiles(files);
    } else {
      setImportMode('file');
      await processTextFiles(files);
    }
  };

  const handleClipboardButtonClick = async () => {
    playClickSound();
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = (await navigator.clipboard.readText()).trim();
        if (text) {
          setImportMode('file');
          setRawTextInput(text.slice(0, 5000));
          setSelectedFileName('剪貼簿英文');
          await triggerExtraction({
            rawText: text.slice(0, 5000),
            fileName: '剪貼簿英文',
          });
          return;
        }
      }
      setStatusMessage('請直接按鍵盤 Ctrl+V 貼上截圖或英文文字！');
    } catch {
      setStatusMessage('請直接按鍵盤 Ctrl+V 貼上截圖或英文文字！');
    }
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInputText.trim() || isAnalyzing) return;
    playClickSound();
    const text = quickInputText.trim();
    setQuickInputText('');
    triggerExtraction({
      rawText: text,
      fileName: '快速新增',
    });
  };

  const handlePresetClick = (preset: (typeof SAMPLE_IMPORT_PRESETS)[0]) => {
    playClickSound();
    setSelectedFileName(preset.fileName);
    setRawTextInput(preset.rawText);
    setPreviewImages([]);
    triggerExtraction({
      rawText: preset.rawText,
      fileName: preset.fileName,
    });
  };

  const handleSpeakSingleSound = (soundText: string, keyId: string) => {
    playClickSound();
    autoPlayAbortRef.current = true;
    cycleSimAbortRef.current = true;
    setIsAutoPlayingPhonics(false);
    setIsSimulatingCycle(false);
    chainSessionRef.current += 1;
    clearMediaTimer();
    setActiveSpeakingSound(keyId);
    speakSingleEnglishWord(soundText, 0.62, () => {
      setActiveSpeakingSound((prev) => (prev === keyId ? null : prev));
    });
    mediaTimerRef.current = window.setTimeout(() => {
      setActiveSpeakingSound((prev) => (prev === keyId ? null : prev));
    }, 1500);
  };

  // Syllable-by-syllable chain playback: reads each syllable slowly -> full word -> Chinese translation
  const handleChainPlayWordSyllables = (item: VocabItem, singleSounds: SingleSoundSyllable[]) => {
    playClickSound();
    autoPlayAbortRef.current = true;
    cycleSimAbortRef.current = true;
    setIsAutoPlayingPhonics(false);
    setIsSimulatingCycle(false);
    cancelSpeech();
    clearMediaTimer();
    const sessionId = ++chainSessionRef.current;
    let idx = 0;

    const nextSyllable = () => {
      if (chainSessionRef.current !== sessionId) return;
      if (idx < singleSounds.length) {
        const syl = singleSounds[idx];
        const soundKey = `${item.id}-syl-${idx}`;
        setActiveSpeakingSound(soundKey);
        idx += 1;
        speakSingleEnglishWord(syl.sound, 0.6, () => {
          if (chainSessionRef.current !== sessionId) return;
          mediaTimerRef.current = window.setTimeout(nextSyllable, 220);
        });
      } else {
        setActiveSpeakingSound(null);
        speakEnglish(item.word, 0.78, () => {
          if (chainSessionRef.current !== sessionId) return;
          mediaTimerRef.current = window.setTimeout(() => {
            if (chainSessionRef.current !== sessionId) return;
            const cleanTrans = item.translation.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim() || item.translation;
            speakChinese(cleanTrans, 1.05);
          }, 220);
        });
      }
    };

    nextSyllable();
  };

  // Simulate AOI 5-State Process Cycle
  const handleToggleSimulateCycle = () => {
    playClickSound();
    clearMediaTimer();
    autoPlayAbortRef.current = true;
    setIsAutoPlayingPhonics(false);
    chainSessionRef.current += 1;
    setActiveSpeakingSound(null);
    if (isSimulatingCycle) {
      cycleSimAbortRef.current = true;
      setIsSimulatingCycle(false);
      cancelSpeech();
      return;
    }

    cycleSimAbortRef.current = false;
    setIsSimulatingCycle(true);
    let stepIdx = 0;

    const runStep = () => {
      if (cycleSimAbortRef.current || stepIdx >= AOI_PROCESS_FIVE_STATES.length) {
        setIsSimulatingCycle(false);
        return;
      }
      const st = AOI_PROCESS_FIVE_STATES[stepIdx];
      setActiveProcessStateStep(st.step);
      stepIdx += 1;

      speakEnglish(st.eng, 0.78, () => {
        if (cycleSimAbortRef.current) return;
        mediaTimerRef.current = window.setTimeout(() => {
          if (cycleSimAbortRef.current) return;
          speakChinese(st.zh, 1.05, () => {
            if (cycleSimAbortRef.current) return;
            mediaTimerRef.current = window.setTimeout(runStep, 350);
          });
        }, 180);
      });
    };

    runStep();
  };

  const activeSheetMeta = AOI_NOTE_SHEETS.find((s) => s.id === selectedAoiSheet) || AOI_NOTE_SHEETS[0];

  const baseVocabList =
    importMode === 'aoi-notes'
      ? selectedAoiSheet === 'all'
        ? importedVocab.filter((v) => String(v.id || '').startsWith('aoi-'))
        : importedVocab.filter((v) => v.sourceFileName === activeSheetMeta.sourceTag)
      : importMode === 'library'
      ? importedVocab
      : extractedVocab.length > 0
      ? extractedVocab
      : importedVocab;

  const resolvedBaseVocab = baseVocabList.length > 0 ? baseVocabList : AOI_HANDWRITTEN_VOCAB;

  const baseLessonList =
    importMode === 'aoi-notes'
      ? selectedAoiSheet === 'all'
        ? AOI_HANDWRITTEN_LESSONS
        : AOI_HANDWRITTEN_LESSONS.filter((l) => {
            if (selectedAoiSheet === 'sheet-1') return l.scenario.includes('單元 1');
            if (selectedAoiSheet === 'sheet-2') return l.scenario.includes('單元 2');
            if (selectedAoiSheet === 'sheet-3') return l.scenario.includes('單元 3');
            return true;
          })
      : importMode === 'library'
      ? importedLessons
      : extractedLessons.length > 0
      ? extractedLessons
      : importedLessons;

  const q = searchFilter.trim().toLowerCase();
  const displayVocabList = q
    ? resolvedBaseVocab.filter(
        (v) =>
          v.word.toLowerCase().includes(q) ||
          v.translation.toLowerCase().includes(q) ||
          (v.kkPhonetic || '').toLowerCase().includes(q) ||
          (v.taiwanPhonetic || '').includes(q)
      )
    : resolvedBaseVocab;

  const displayLessonList = q
    ? baseLessonList.filter(
        (l) =>
          l.english_sentence.toLowerCase().includes(q) ||
          (l.chinese_translation || '').includes(q) ||
          l.scenario.toLowerCase().includes(q)
      )
    : baseLessonList;

  // Sequential Auto-Play across all displayed single-sound words
  const handleToggleAutoPlayPhonics = () => {
    playClickSound();
    clearMediaTimer();
    cycleSimAbortRef.current = true;
    setIsSimulatingCycle(false);
    chainSessionRef.current += 1;
    if (isAutoPlayingPhonics) {
      autoPlayAbortRef.current = true;
      setIsAutoPlayingPhonics(false);
      setActiveSpeakingSound(null);
      cancelSpeech();
      return;
    }

    if (displayVocabList.length === 0) return;
    autoPlayAbortRef.current = false;
    setIsAutoPlayingPhonics(true);

    let wordIdx = 0;
    const playNextWord = () => {
      if (autoPlayAbortRef.current || wordIdx >= displayVocabList.length) {
        setIsAutoPlayingPhonics(false);
        setActiveSpeakingSound(null);
        return;
      }
      const item = displayVocabList[wordIdx];
      const soundKey = `${item.id}-syl-0`;
      setActiveSpeakingSound(soundKey);
      const cleanTrans =
        item.translation
          .replace(/\s*[\(（][^\)）]*[\)）]/g, '')
          .split('/')[0]
          .trim() || item.translation;

      speakSingleEnglishWord(item.word, 0.65, () => {
        if (autoPlayAbortRef.current) return;
        mediaTimerRef.current = window.setTimeout(() => {
          if (autoPlayAbortRef.current) return;
          speakChinese(cleanTrans, 1.05, () => {
            if (autoPlayAbortRef.current) return;
            wordIdx += 1;
            mediaTimerRef.current = window.setTimeout(playNextWord, 350);
          });
        }, 200);
      });
    };

    playNextWord();
  };

  // Export personal imported single-sound dictionary & sentences as JSON
  const handleExportImportedData = () => {
    playClickSound();
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      totalSingleSoundWords: importedVocab.length,
      totalSentences: importedLessons.length,
      vocab: importedVocab,
      lessons: importedLessons,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fse_personal_phonics_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('已匯出個人單音與句型備份檔！');
  };

  // Import backup JSON file
  const handleImportBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playClickSound();
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const restoredVocab: VocabItem[] = Array.isArray(parsed.vocab) ? parsed.vocab : [];
        const restoredLessons: Lesson[] = Array.isArray(parsed.lessons) ? parsed.lessons : [];
        if (restoredVocab.length > 0 || restoredLessons.length > 0) {
          const audited = auditAndConvertImportedData(restoredVocab, restoredLessons);
          setPipAuditReport(audited.report);
          onSaveImportedData(audited.vocab, audited.lessons);
          playSuccessChime();
          setStatusMessage(
            `已通過資安檢查並轉換為公開資訊：還原 ${audited.vocab.length} 個單音與 ${audited.lessons.length} 句教材！`
          );
        } else {
          setStatusMessage('備份檔格式無效或無內容');
        }
      } catch {
        setStatusMessage('無法解析備份檔，請確認為 JSON 格式');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRunFullInfoSecAudit = () => {
    playClickSound();
    const audited = auditAndConvertImportedData(importedVocab, importedLessons);
    setPipAuditReport(audited.report);
    onSaveImportedData(audited.vocab, audited.lessons);
    playSuccessChime();
    setStatusMessage(
      `全庫資安巡檢完成：已確認 ${audited.report.totalScannedVocab} 個單字與 ${audited.report.totalScannedLessons} 個句型 100% 為可公開安全資訊（自動去識別化轉換 ${audited.report.convertedCount} 處）！`
    );
  };

  const handleStartEditVocab = (item: VocabItem) => {
    playClickSound();
    setEditingVocabId(item.id);
    setEditTranslation(item.translation.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim() || item.translation);
    setEditKK(item.kkPhonetic || getWordKKPhonetic(item.word, item.ipa));
    setEditMemoryTrick(item.memoryTrick || '');
  };

  const handleSaveEditVocab = (item: VocabItem) => {
    playSuccessChime();
    const updated: VocabItem = {
      ...item,
      translation: editTranslation.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim() || item.translation,
      kkPhonetic: editKK.trim() || getWordKKPhonetic(item.word, item.ipa),
      memoryTrick: editMemoryTrick.trim() || item.memoryTrick,
    };
    if (onUpdateImportedVocab) {
      onUpdateImportedVocab(updated);
    } else {
      onSaveImportedData([updated], []);
    }
    setExtractedVocab((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    setEditingVocabId(null);
    setStatusMessage(`已更新「${item.word}」的單音與 KK音標設定！`);
  };

  // Current Quiz Question item
  const quizPool = displayVocabList.length >= 4 ? displayVocabList : AOI_HANDWRITTEN_VOCAB;
  const activeQuizItem = quizPool[quizIndex % quizPool.length] || AOI_HANDWRITTEN_VOCAB[0];
  const quizOptions = (() => {
    const correctTrans = activeQuizItem.translation.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim();
    const others = quizPool
      .filter((v) => v.id !== activeQuizItem.id)
      .map((v) => v.translation.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim())
      .filter((t, i, arr) => t !== correctTrans && arr.indexOf(t) === i)
      .slice(0, 3);
    const combined = [correctTrans, ...others];
    return combined.sort((a, b) => a.localeCompare(b));
  })();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="單音與教材導入系統"
      onClick={() => {
        playClickSound();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden litho-laser-line"
      >
        {/* Modal Header */}
        <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                單音與教材導入系統
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                支援多圖拖放、Ctrl+V 貼上截圖、KK音標與單音逐節拆讀
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleRunFullInfoSecAudit}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
              title="立即檢查所有導入資料並自動轉換為 100% 可公開安全資訊"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>資安公開化檢查</span>
            </button>

            <button
              onClick={handleClipboardButtonClick}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
              title="直接貼上剪貼簿文字或按 Ctrl+V 貼上螢幕截圖"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
              <span>貼上</span>
            </button>

            <input
              ref={backupJsonInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportBackupJson}
              className="hidden"
            />
            <button
              onClick={() => backupJsonInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
              title="匯入 JSON 備份檔還原個人單音庫"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">還原</span>
            </button>

            {(importedVocab.length > 0 || importedLessons.length > 0) && (
              <button
                onClick={handleExportImportedData}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                title="匯出個人導入單音與句型 JSON"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">匯出</span>
              </button>
            )}

            <button
              type="button"
              aria-label="關閉導入系統"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              title="關閉"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Selector & Quick Word/Sentence Input Bar */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div role="tablist" aria-label="導入模式切換" className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              role="tab"
              aria-selected={importMode === 'aoi-notes'}
              onClick={() => {
                playClickSound();
                setImportMode('aoi-notes');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                importMode === 'aoi-notes'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-amber-300 hover:text-white border border-amber-500/40'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>AOI 公開教材</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={importMode === 'photo'}
              onClick={() => {
                playClickSound();
                setImportMode('photo');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                importMode === 'photo'
                  ? 'bg-cyan-400 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>照片導入</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={importMode === 'file'}
              onClick={() => {
                playClickSound();
                setImportMode('file');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                importMode === 'file'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>檔案導入</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={importMode === 'library'}
              onClick={() => {
                playClickSound();
                setImportMode('library');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                importMode === 'library'
                  ? 'bg-emerald-400 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>個人庫</span>
            </button>
          </div>

          {/* Instant Word or Sentence Quick Adder */}
          <form onSubmit={handleQuickAddSubmit} className="flex items-center gap-1.5 flex-1 max-w-md min-w-[220px]">
            <input
              type="text"
              value={quickInputText}
              onChange={(e) => setQuickInputText(e.target.value)}
              placeholder="輸入任何英文單字或句子立即拆解單音與KK音標..."
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={isAnalyzing || !quickInputText.trim()}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-40 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>拆解</span>
            </button>
          </form>

          {importedLessons.length > 0 && onJumpToImportedLessons && (
            <button
              onClick={() => {
                playClickSound();
                onJumpToImportedLessons();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            >
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span>演練導入句</span>
            </button>
          )}
        </div>

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
          {/* AOI Handwritten Notes Sheet Selector, 5-State Simulator & Photo Gallery */}
          {importMode === 'aoi-notes' && (
            <div className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{activeSheetMeta.title}</span>
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">{activeSheetMeta.subtitle}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {AOI_NOTE_SHEETS.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => {
                        playClickSound();
                        setSelectedAoiSheet(sheet.id);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black cursor-pointer transition-all ${
                        selectedAoiSheet === sheet.id
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                      }`}
                    >
                      {sheet.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Public Information Security Shield & Digital Study Unit Cards */}
              <div className="bg-emerald-950/35 border border-emerald-500/40 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start sm:items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                  <div className="text-[11px] text-emerald-200 leading-snug">
                    <span className="font-black text-emerald-300">導入資料資安檢查與公開資訊自動轉換已啟用：</span>
                    <span>
                      所有導入之照片、檔案、文字與單字句型皆經自動去識別化掃描，排除特定企業、機型、批號與內部變數前綴，100% 轉換為網際網路可公開通用工程資訊。
                    </span>
                    {pipAuditReport && (
                      <span className="ml-1.5 text-amber-300 font-mono font-bold">
                        （最近巡檢：{pipAuditReport.timestamp}｜已驗證 {pipAuditReport.totalScannedVocab} 單字 / {pipAuditReport.totalScannedLessons} 句型）
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRunFullInfoSecAudit}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 font-mono text-[10px] font-black shrink-0 self-start sm:self-center cursor-pointer transition-all"
                >
                  100% 公開資訊驗證
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {AOI_NOTE_SHEETS.filter((s) => s.id !== 'all').map((sheet) => {
                  const isSelected = selectedAoiSheet === sheet.id;
                  return (
                    <div
                      key={sheet.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => {
                        playClickSound();
                        setSelectedAoiSheet(isSelected ? 'all' : sheet.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          playClickSound();
                          setSelectedAoiSheet(isSelected ? 'all' : sheet.id);
                        }
                      }}
                      className={`rounded-xl border p-3 bg-slate-900/90 cursor-pointer transition-all flex flex-col justify-between gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        isSelected
                          ? 'border-amber-400 ring-1 ring-amber-400/50 bg-amber-950/20'
                          : 'border-slate-800 hover:border-cyan-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-amber-300">{sheet.title}</span>
                        <span className="text-[10px] font-mono text-cyan-300 shrink-0">
                          {isSelected ? '顯示全部' : '點擊篩選'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{sheet.subtitle}</p>
                    </div>
                  );
                })}
              </div>

              {/* Interactive AOI 5-State Process Simulator */}
              {(selectedAoiSheet === 'all' || selectedAoiSheet === 'sheet-2') && (
                <div className="bg-slate-900/95 border border-cyan-500/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                        單元 2 核心
                      </span>
                      <span className="text-xs font-black text-white">
                        AOI 製程五態循環模擬器 · Process State [ˋprɑsɛs stet]
                      </span>
                    </div>
                    <button
                      onClick={handleToggleSimulateCycle}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                        isSimulatingCycle
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40'
                      }`}
                    >
                      {isSimulatingCycle ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                      <span>{isSimulatingCycle ? '停止演示' : '自動演示五態 Cycle'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
                    {AOI_PROCESS_FIVE_STATES.map((st) => {
                      const isCurrent = activeProcessStateStep === st.step;
                      return (
                        <button
                          key={st.step}
                          onClick={() => {
                            playClickSound();
                            clearMediaTimer();
                            setActiveProcessStateStep(st.step);
                            speakEnglish(st.eng, 0.78, () => {
                              mediaTimerRef.current = window.setTimeout(() => {
                                mediaTimerRef.current = null;
                                speakChinese(st.zh, 1.05);
                              }, 180);
                            });
                          }}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isCurrent
                              ? 'bg-cyan-950/90 border-cyan-400 ring-1 ring-cyan-400/50'
                              : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black font-mono text-cyan-300">
                              {st.step}. {st.eng}
                            </span>
                            <Volume2 className="w-3 h-3 text-cyan-400 shrink-0" />
                          </div>
                          <div className="text-[10px] font-mono text-cyan-200 mt-0.5">KK {st.kk}</div>
                          <div className="text-[10px] font-mono text-amber-300 truncate">{st.zhuyin}</div>
                          <div className="text-xs font-black text-white mt-1">{st.zh}</div>
                        </button>
                      );
                    })}
                  </div>

                  {(() => {
                    const currentSt = AOI_PROCESS_FIVE_STATES.find((s) => s.step === activeProcessStateStep) || AOI_PROCESS_FIVE_STATES[0];
                    return (
                      <div className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-300 flex-wrap">
                        <span>
                          <strong className="text-cyan-300 font-mono">
                            State {currentSt.step}: {currentSt.eng} {currentSt.kk}
                          </strong>{' '}
                          — {currentSt.desc}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-300">
                          諧音：【 {currentSt.homo} 】
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Handwritten Note Spelling Correction & Key Distinction Bar */}
              {(selectedAoiSheet === 'all' || selectedAoiSheet === 'sheet-1') && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {AOI_SPELLING_TIPS.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        playClickSound();
                        speakEnglish(item.correct.replace(/[^a-zA-Z0-9\s]/g, ' '), 0.75);
                      }}
                      className="bg-slate-900/90 hover:bg-slate-900 border border-amber-500/30 rounded-xl p-2.5 cursor-pointer transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 line-through">
                          {item.wrong}
                        </span>
                        <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="text-xs font-mono font-black text-emerald-300 truncate">
                          {item.correct}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-white">{item.zh}</span>
                        <span className="font-mono text-cyan-300">KK {item.kk}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-snug">{item.tip}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload & Preset Section */}
          {(importMode === 'photo' || importMode === 'file') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
              {/* Left Column: Drag & Drop Photo or File Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDropFiles}
                className={`lg:col-span-6 bg-slate-950/90 border rounded-2xl p-3.5 flex flex-col justify-between space-y-2.5 transition-all ${
                  isDraggingOver ? 'border-cyan-400 ring-2 ring-cyan-400/40 bg-cyan-950/20' : 'border-slate-800'
                }`}
              >
                {importMode === 'photo' ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span>照片與截圖導入</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">支援多張與拖放</span>
                    </div>

                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />

                    <div
                      onClick={() => photoInputRef.current?.click()}
                      className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-slate-900/70 hover:bg-slate-900 rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[145px] gap-2"
                    >
                      {previewImages.length > 0 ? (
                        <div className="space-y-2 w-full flex flex-col items-center">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {previewImages.map((img, idx) => (
                              <img
                                key={idx}
                                src={img.dataUrl}
                                alt={img.name}
                                className="h-20 w-auto rounded-xl border border-slate-700 object-contain bg-slate-950"
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-cyan-300 truncate max-w-full">
                            {selectedFileName || '已載入照片'}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center">
                            <Upload className="w-5 h-5 text-cyan-300" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs sm:text-sm font-black text-slate-100">
                              拖放照片至此、點擊選擇，或按 Ctrl+V 貼上截圖
                            </p>
                            <p className="text-[11px] text-slate-400">
                              自動智慧辨識英文，拆解為「KK音標 + 單音音節 + 注音 + 諧音」
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>檔案與文字導入</span>
                      </span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 cursor-pointer hover:brightness-110 transition-all"
                      >
                        <Upload className="w-3 h-3" />
                        <span>選檔案</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".txt,.csv,.log,.md,.json,text/*"
                        onChange={handleTextFileUpload}
                        className="hidden"
                      />
                    </div>

                    <textarea
                      value={rawTextInput}
                      onChange={(e) => setRawTextInput(e.target.value)}
                      placeholder="在此貼上機台手冊、工作信件、Alarm Log 或想學習的英文內容..."
                      rows={4}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono leading-relaxed"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 truncate">
                        {selectedFileName ? `檔案：${selectedFileName}` : '支援多檔拖放或貼上文字'}
                      </span>
                      <button
                        disabled={isAnalyzing || !rawTextInput.trim()}
                        onClick={() => {
                          playClickSound();
                          triggerExtraction({
                            rawText: rawTextInput,
                            fileName: selectedFileName || '貼上英文內容',
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>拆解單音</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Instant Sample Templates & Status */}
              <div className="lg:col-span-6 bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between space-y-2.5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>快速範本</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">一鍵導入</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {SAMPLE_IMPORT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        disabled={isAnalyzing}
                        onClick={() => handlePresetClick(preset)}
                        className="text-left p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col justify-between gap-1 group"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                            {preset.label}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono font-bold shrink-0">
                            導入
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {preset.rawText.split('\n')[0]}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loading or Status Banner */}
                {isAnalyzing && (
                  <div className="bg-cyan-950/60 border border-cyan-500/40 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-cyan-200">
                    <RefreshCw className="w-4 h-4 text-cyan-400 motion-safe:animate-spin shrink-0" />
                    <span>正在拆解英文單音音節、KK音標、注音與諧音...</span>
                  </div>
                )}

                {statusMessage && !isAnalyzing && (
                  <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs text-emerald-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate font-bold">{statusMessage}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Extracted / Library Results Section */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{importMode === 'library' ? '個人單音與教材庫' : '單音與句型解析'}</span>
                </h3>
                {sourceSummary && (
                  <p className="text-[11px] text-slate-400 mt-0.5 break-words">{sourceSummary}</p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {/* Search inside imported items */}
                {(resolvedBaseVocab.length > 0 || baseLessonList.length > 0) && (
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="搜尋單字或KK..."
                      className="pl-7 pr-2 py-1 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-xs text-white placeholder-slate-500 focus:outline-none w-28 sm:w-36"
                    />
                  </div>
                )}

                {displayVocabList.length > 0 && activeResultTab === 'phonics' && (
                  <button
                    onClick={handleToggleAutoPlayPhonics}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                      isAutoPlayingPhonics
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30'
                    }`}
                    title="自動依序連播所有單音字卡"
                  >
                    {isAutoPlayingPhonics ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    <span>{isAutoPlayingPhonics ? '停止' : '連播單音'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    playClickSound();
                    setActiveResultTab('phonics');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all tabular-nums ${
                    activeResultTab === 'phonics'
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-slate-900 text-slate-300 border border-slate-800'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>單音 {displayVocabList.length}</span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setActiveResultTab('sentences');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all tabular-nums ${
                    activeResultTab === 'sentences'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-900 text-slate-300 border border-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>句型 {displayLessonList.length}</span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setActiveResultTab('quiz');
                    setQuizSelectedIdx(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeResultTab === 'quiz'
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-900 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>單音快測</span>
                </button>

                {(importedVocab.length > 0 || importedLessons.length > 0) && (
                  <button
                    onClick={() => {
                      playClickSound();
                      onClearImportedData();
                      setExtractedVocab([]);
                      setExtractedLessons([]);
                      setStatusMessage('已重置為 AOI 預設教材庫。');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                    title="重置導入資料"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>重置</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tab 1: Single-Sound Phonics Breakdown Cards */}
            {activeResultTab === 'phonics' && (
              <div>
                {displayVocabList.length === 0 ? (
                  <div className="py-8 text-center space-y-1.5">
                    <p className="text-xs sm:text-sm font-bold text-slate-300">
                      尚無單音資料
                    </p>
                    <p className="text-xs text-slate-400">
                      請上傳照片或檔案、輸入單字，或點擊上方「快速範本」立即拆解單音字卡。
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {displayVocabList.map((item) => {
                      const kkPhonetic = item.kkPhonetic || getWordKKPhonetic(item.word, item.ipa);
                      const cleanTranslation =
                        item.translation.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim() || item.translation;
                      const singleSounds: SingleSoundSyllable[] =
                        item.singleSounds && item.singleSounds.length > 0
                          ? item.singleSounds
                          : (item.syllables || item.word).split(/[·\-.\s]+/).map((s) => ({
                              sound: s,
                              kk: getWordKKPhonetic(s),
                              zhuyin: item.zhuyinPhonetic?.replace(/^【\s*|\s*】$/g, '') || '',
                              homophone: item.mandarinPhonetic?.replace(/^【\s*|\s*】$/g, '') || '',
                            }));
                      const isEditingThis = editingVocabId === item.id;

                      return (
                        <div
                          key={item.id}
                          className="bg-slate-900/95 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-3 space-y-2.5 flex flex-col justify-between transition-all shadow-md"
                        >
                          <div className="space-y-2">
                            {/* Word Header */}
                            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-base sm:text-lg font-black text-cyan-300 font-mono">
                                    {item.word.replace(/\s*[\(（][^\)）]*[\)）]/g, '')}
                                  </span>
                                  {kkPhonetic && (
                                    <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-200 border border-cyan-500/40 text-xs font-mono font-bold">
                                      KK {kkPhonetic}
                                    </span>
                                  )}
                                  {item.syllables && (
                                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-200 border border-cyan-500/30 text-xs font-mono font-bold">
                                      單音：{item.syllables}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                    {item.partOfSpeech}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm font-extrabold text-white mt-1">
                                  {cleanTranslation}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleChainPlayWordSyllables(item, singleSounds)}
                                  className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                                  title="逐音拆讀：依序讀每個單音 ➔ 完整單字 ➔ 中文意思"
                                >
                                  <Volume2 className="w-3 h-3 text-emerald-400" />
                                  <span>拆讀</span>
                                </button>
                                <button
                                  onClick={() => {
                                    playClickSound();
                                    speakEnglish(item.word, speechSpeed);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                                  title="正常語速朗讀"
                                >
                                  <Play className="w-3 h-3 text-cyan-400" />
                                  <span>發音</span>
                                </button>
                                <button
                                  onClick={() =>
                                    isEditingThis ? setEditingVocabId(null) : handleStartEditVocab(item)
                                  }
                                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 cursor-pointer"
                                  title="編輯翻譯、KK音標或記憶口訣"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                {onDeleteImportedVocab && (
                                  <button
                                    onClick={() => {
                                      playClickSound();
                                      onDeleteImportedVocab(item.id);
                                      setExtractedVocab((prev) => prev.filter((v) => v.id !== item.id));
                                    }}
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 cursor-pointer"
                                    title="刪除此單音卡"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Inline Editor if active */}
                            {isEditingThis && (
                              <div className="bg-slate-950 border border-amber-400/50 rounded-xl p-2.5 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] font-mono text-slate-400 block mb-0.5">
                                      中文意思
                                    </label>
                                    <input
                                      type="text"
                                      value={editTranslation}
                                      onChange={(e) => setEditTranslation(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:border-amber-400 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-mono text-slate-400 block mb-0.5">
                                      KK音標
                                    </label>
                                    <input
                                      type="text"
                                      value={editKK}
                                      onChange={(e) => setEditKK(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-cyan-200 focus:border-amber-400 focus:outline-none"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">
                                    記憶口訣
                                  </label>
                                  <input
                                    type="text"
                                    value={editMemoryTrick}
                                    onChange={(e) => setEditMemoryTrick(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-100 focus:border-amber-400 focus:outline-none"
                                  />
                                </div>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setEditingVocabId(null)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                                  >
                                    取消
                                  </button>
                                  <button
                                    onClick={() => handleSaveEditVocab(item)}
                                    className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>儲存</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Interactive Single-Sound Syllable Blocks (點擊任一單音聽發音) */}
                            <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-2.5 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span>點擊單音聽發音</span>
                                <span>KK {kkPhonetic}</span>
                              </div>
                              <div className="flex items-stretch gap-1.5 flex-wrap">
                                {singleSounds.map((syl, sIdx) => {
                                  const soundKey = `${item.id}-syl-${sIdx}`;
                                  const isSpeakingThis = activeSpeakingSound === soundKey;
                                  const sylKK = syl.kk || getWordKKPhonetic(syl.sound);
                                  return (
                                    <button
                                      key={soundKey}
                                      onClick={() => handleSpeakSingleSound(syl.sound, soundKey)}
                                      className={`flex-1 min-w-[72px] p-2 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                                        isSpeakingThis
                                          ? 'bg-cyan-500/25 border-cyan-400 ring-1 ring-cyan-300'
                                          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 hover:border-cyan-500/50'
                                      }`}
                                      title={`點擊聆聽單音「${syl.sound}」`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs sm:text-sm font-black font-mono text-cyan-300">
                                          {syl.sound}
                                        </span>
                                        <Volume2 className="w-3 h-3 text-cyan-400/80 shrink-0" />
                                      </div>
                                      <div className="mt-1 pt-1 border-t border-slate-800/80 space-y-0.5">
                                        {sylKK && (
                                          <div className="text-[10px] font-mono font-bold text-cyan-200 truncate">
                                            KK: {sylKK}
                                          </div>
                                        )}
                                        <div className="text-[10px] font-mono font-bold text-amber-300 truncate">
                                          注音: {syl.zhuyin || '—'}
                                        </div>
                                        <div className="text-[10px] font-sans font-bold text-emerald-300 truncate">
                                          諧音: {syl.homophone || '—'}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Full Word KK, Zhuyin & Homophone Summary */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                              <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold shrink-0">
                                  KK音標
                                </span>
                                <span className="font-mono font-bold text-cyan-200 truncate">
                                  {kkPhonetic}
                                </span>
                              </div>
                              <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold shrink-0">
                                  注音
                                </span>
                                <span className="font-mono font-bold text-amber-300 truncate">
                                  {item.zhuyinPhonetic || item.taiwanPhonetic}
                                </span>
                              </div>
                              <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold shrink-0">
                                  諧音
                                </span>
                                <span className="font-sans font-bold text-emerald-300 truncate">
                                  {item.mandarinPhonetic || item.taiwanPhonetic}
                                </span>
                              </div>
                            </div>

                            {/* Memory Trick */}
                            {item.memoryTrick && (
                              <div className="bg-amber-400/[0.06] border border-amber-400/25 rounded-xl p-2 text-xs text-amber-100 leading-relaxed">
                                <span className="font-black text-amber-300 mr-1.5">口訣：</span>
                                <span>{item.memoryTrick}</span>
                              </div>
                            )}

                            {/* Related Sentence from User's Data */}
                            {item.exampleSentence && (
                              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono text-slate-400">
                                    關聯例句
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => speakEnglish(item.exampleSentence, speechSpeed)}
                                      className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[10px] font-mono font-bold cursor-pointer"
                                    >
                                      英文
                                    </button>
                                    {item.exampleTranslation && (
                                      <button
                                        onClick={() => speakChinese(item.exampleTranslation || '')}
                                        className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-mono font-bold cursor-pointer"
                                      >
                                        中文
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs font-mono font-bold text-white">
                                  {item.exampleSentence}
                                </p>
                                <p className="text-[11px] text-slate-300">
                                  {item.exampleTranslation || item.exampleSentenceZh}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Extracted Personal SVO Sentences */}
            {activeResultTab === 'sentences' && (
              <div className="space-y-3">
                {displayLessonList.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs sm:text-sm font-bold text-slate-300">
                      尚無導入句型
                    </p>
                  </div>
                ) : (
                  displayLessonList.map((lesson, idx) => (
                    <div
                      key={lesson.id || idx}
                      className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/30 text-xs font-bold">
                          {lesson.scenario.replace(/\s*[\(（][^\)）]*[\)）]/g, '')}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              speakEnglish(lesson.english_sentence, 0.7);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                            title="以 0.7x 慢速朗讀"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>0.7x 慢讀</span>
                          </button>
                          <button
                            onClick={() => {
                              playClickSound();
                              speakEnglish(lesson.english_sentence, speechSpeed);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 text-cyan-400" />
                            <span>整句</span>
                          </button>
                          {onDeleteImportedLesson && (
                            <button
                              onClick={() => {
                                playClickSound();
                                onDeleteImportedLesson(lesson.id);
                                setExtractedLessons((prev) => prev.filter((l) => l.id !== lesson.id));
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 cursor-pointer"
                              title="刪除此句型"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <InteractiveSentenceViewer
                        sentence={lesson.english_sentence}
                        chinese={lesson.chinese_translation}
                        phonetic={lesson.phonetic_taiwan}
                        components={lesson.components}
                        speechSpeed={speechSpeed}
                        compact={true}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Interactive Single-Sound & KK Phonetic Flash Quiz */}
            {activeResultTab === 'quiz' && activeQuizItem && (
              <div className="bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold tabular-nums">
                      題目 {(quizIndex % quizPool.length) + 1} / {quizPool.length}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      聽音與 KK音標辨識挑戰
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black text-amber-300 tabular-nums">
                    答對 {quizCorrectCount} / {quizTotalAttempts} 題
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg sm:text-xl font-black font-mono text-cyan-300">
                        {activeQuizItem.word.replace(/\s*[\(（][^\)）]*[\)）]/g, '')}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-500/40 text-xs font-mono font-bold">
                        KK {activeQuizItem.kkPhonetic || getWordKKPhonetic(activeQuizItem.word, activeQuizItem.ipa)}
                      </span>
                      {activeQuizItem.syllables && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-700 text-xs font-mono">
                          單音：{activeQuizItem.syllables}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-300 font-mono">
                      注音：{activeQuizItem.zhuyinPhonetic} ｜ 諧音：{activeQuizItem.taiwanPhonetic}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      playClickSound();
                      speakEnglish(activeQuizItem.word, 0.75);
                    }}
                    className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <span>播放發音</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {quizOptions.map((opt, oIdx) => {
                    const correctTrans = activeQuizItem.translation.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim();
                    const isCorrectOpt = opt === correctTrans;
                    const isSelected = quizSelectedIdx === oIdx;

                    let btnClass = 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200';
                    if (quizSelectedIdx !== null) {
                      if (isCorrectOpt) {
                        btnClass = 'bg-emerald-950/90 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400';
                      } else if (isSelected) {
                        btnClass = 'bg-rose-950/90 border-rose-500 text-rose-200';
                      }
                    }

                    return (
                      <button
                        key={oIdx}
                        onClick={() => {
                          if (quizSelectedIdx !== null) return;
                          setQuizSelectedIdx(oIdx);
                          setQuizTotalAttempts((p) => p + 1);
                          if (isCorrectOpt) {
                            playSuccessChime();
                            setQuizCorrectCount((p) => p + 1);
                            speakEnglish(activeQuizItem.word, 0.8);
                          } else {
                            playClickSound();
                          }
                        }}
                        className={`p-3 rounded-xl border text-left text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${btnClass}`}
                      >
                        <span>{opt}</span>
                        {quizSelectedIdx !== null && isCorrectOpt && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {quizSelectedIdx !== null && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-amber-200">
                      口訣：{activeQuizItem.memoryTrick}
                    </span>
                    <button
                      onClick={() => {
                        playClickSound();
                        setQuizSelectedIdx(null);
                        setQuizIndex((prev) => prev + 1);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black cursor-pointer shrink-0"
                    >
                      下一題
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-400">
            個人庫：{importedVocab.length} 單音 · {importedLessons.length} 句
          </span>
          <div className="flex items-center gap-2">
            {extractedVocab.length > 0 && (
              <button
                onClick={() => {
                  playSuccessChime();
                  onSaveImportedData(extractedVocab, extractedLessons);
                  setStatusMessage('已同步至個人單音與教材庫！');
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>同步儲存</span>
              </button>
            )}
            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
            >
              完成
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
