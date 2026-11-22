import React, { useState, useEffect, useRef } from 'react';
import { Lesson } from '../types';
import { Volume2, Bookmark, CheckCircle2, Copy, Sparkles, Mic, MicOff, HelpCircle, Check, X, Award, Keyboard, ArrowRight, ArrowLeft, Edit3, StickyNote, Save, Trash2, SkipForward, Play, ShieldAlert, Headphones, Globe, Zap, Square, SlidersHorizontal, RefreshCw, Cpu, LayoutGrid, Layers } from 'lucide-react';
import { speakEnglish, speakChinese, speakSingleEnglishWord, speakBilingualLesson, speakEnhancedPronunciation, cancelSpeech, listenSpeech, useSpeechQueue, cleanEnglishText, unlockAudioContext, getPreferredAccentMode, setPreferredAccentMode, globalAudioScheduler, SpeechProgressPayload, predictAndCacheNextSentences, schedulePredictiveAudioCache } from '../utils/speech';
import { playClickSound, playSuccessChime, playLaserScanSound, playSvoAssembleChime, triggerHapticClick, triggerHapticPhraseComplete, triggerHapticWarning } from '../utils/audioEffects';
import { getLessonPracticeQuestions } from '../utils/lessonQuizHelper';
import { getLessonAllSentences, getSentenceComponents, getMandarinPhoneticFromSentence, LessonSentenceItem } from '../utils/lessonSentenceHelper';
import { convertPhoneticToZhuyin, getSentenceZhuyinPhonetic } from '../utils/zhuyinHelper';
import { lookupWordDefinition, getWordKKPhonetic, getSentenceKKPhonetic } from '../utils/wordDictionary';
import { InteractiveSentenceViewer } from './InteractiveSentenceViewer';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { SrsCardState, MemoryRating, formatNextReviewLabel } from '../utils/srsScheduler';
import { queueAutoServerSync } from '../utils/serverSyncService';

interface LessonCardProps {
  lesson: Lesson;
  speechSpeed: number;
  isBookmarked: boolean;
  onToggleBookmark: (lesson: Lesson) => void;
  isVisited?: boolean;
  onMarkVisited?: (lessonId: string) => void;
  onNextLesson?: () => void;
  onPrevLesson?: () => void;
  currentIndex?: number;
  totalLessons?: number;
  allLessons?: Lesson[];
  visitedLessonIds?: string[];
  onSelectLessonIndex?: (index: number) => void;
  onOpenVoiceSettings?: () => void;
  cycleNumber?: number;
  daysLeft?: number;
  hoursLeft?: number;
  minutesLeft?: number;
  onRefreshQuestions?: () => void;
  disableGlobalShortcuts?: boolean;
  srsState?: SrsCardState;
  onRateMemory?: (lessonId: string, rating: MemoryRating) => void;
}

const LESSON_NOTES_STORAGE_KEY = 'fab_fse_lesson_notes';

const LessonCardComponent: React.FC<LessonCardProps> = ({
  lesson,
  speechSpeed,
  isBookmarked,
  onToggleBookmark,
  isVisited = false,
  onMarkVisited,
  onNextLesson,
  onPrevLesson,
  currentIndex,
  totalLessons,
  allLessons = [],
  visitedLessonIds = [],
  onSelectLessonIndex,
  onOpenVoiceSettings,
  cycleNumber = 18,
  daysLeft = 2,
  hoursLeft = 14,
  minutesLeft = 30,
  onRefreshQuestions,
  disableGlobalShortcuts = false,
  srsState,
  onRateMemory
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnhancedPlaying, setIsEnhancedPlaying] = useState(false);
  const [isThreeSpeedPlaying, setIsThreeSpeedPlaying] = useState(false);
  const [threeSpeedStage, setThreeSpeedStage] = useState<number>(0);
  const [isListening, setIsListening] = useState(false);
  const [userTranscript, setUserTranscript] = useState<string | null>(null);
  const [speechMatch, setSpeechMatch] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [highlightSvo, setHighlightSvo] = useState<'subject' | 'action' | 'bridge' | 'object' | null>(null);
  const [readingWordIndex, setReadingWordIndex] = useState<number | null>(null);
  const [showSyntaxBlocks, setShowSyntaxBlocks] = useState<boolean>(false);
  const [isLevelPickerOpen, setIsLevelPickerOpen] = useState<boolean>(false);
  const [isMaskingHelper, setIsMaskingHelper] = useState<boolean>(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState<boolean>(false);
  const [showMemoryTrick, setShowMemoryTrick] = useState<boolean>(false);
  const [currentSpeed, setCurrentSpeed] = useState<number>(speechSpeed);

  const drillSessionRef = useRef<number>(0);
  const drillTimerRef = useRef<any>(null);
  const isStartingSpeechRef = useRef<boolean>(false);
  const lastSpeechClickTimeRef = useRef<number>(0);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moreActionsRef = useRef<HTMLDivElement | null>(null);

  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(0);
  const { showCopyToast, showBookmarkToast } = useToast();

  // Sequential Speech Queue State
  const {
    isPlaying: isQueuePlaying,
    enginePhase,
    currentTask,
    progress: queueProgress,
    wordIndex: queueWordIndex,
    currentWord: queueCurrentWord,
    totalWords: queueTotalWords,
    queueLength,
    remainingQueueCount,
    remainingSeconds,
    totalEstimatedSeconds,
    skipCurrent,
    replayCurrent
  } = useSpeechQueue();

  // Personal Lesson Notes from localStorage
  const [lessonNotes, setLessonNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(LESSON_NOTES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isNoteModalOpen, setIsNoteModalOpen] = useState<boolean>(false);
  const [tempNoteText, setTempNoteText] = useState<string>('');

  useEffect(() => {
    const syncNotes = () => {
      try {
        const saved = localStorage.getItem(LESSON_NOTES_STORAGE_KEY);
        if (saved) {
          setLessonNotes(JSON.parse(saved));
        }
      } catch {}
    };
    window.addEventListener('fse-server-synced', syncNotes);
    return () => window.removeEventListener('fse-server-synced', syncNotes);
  }, []);

  const currentLessonNote = lessonNotes[lesson.id] || '';

  const handleSaveLessonNote = () => {
    playSuccessChime();
    const updated = { ...lessonNotes };
    if (tempNoteText.trim()) {
      updated[lesson.id] = tempNoteText.trim();
    } else {
      delete updated[lesson.id];
    }
    setLessonNotes(updated);
    try {
      localStorage.setItem(LESSON_NOTES_STORAGE_KEY, JSON.stringify(updated));
      queueAutoServerSync(2500);
    } catch (e) {
      console.error('Failed to save lesson note', e);
    }
    setIsNoteModalOpen(false);
  };

  const handleClearLessonNote = () => {
    playClickSound();
    const updated = { ...lessonNotes };
    delete updated[lesson.id];
    setLessonNotes(updated);
    setTempNoteText('');
    try {
      localStorage.setItem(LESSON_NOTES_STORAGE_KEY, JSON.stringify(updated));
      queueAutoServerSync(2500);
    } catch (e) {
      console.error('Failed to clear lesson note', e);
    }
    setIsNoteModalOpen(false);
  };

  const allSentences = getLessonAllSentences(lesson);
  const currentSentence = allSentences[activeSentenceIndex] || allSentences[0];
  const activeComponents = getSentenceComponents(lesson, currentSentence);

  const cancelActiveDrills = () => {
    drillSessionRef.current += 1;
    if (drillTimerRef.current) {
      clearTimeout(drillTimerRef.current);
      drillTimerRef.current = null;
    }
    setIsPlaying(false);
    setIsEnhancedPlaying(false);
    setIsThreeSpeedPlaying(false);
    setThreeSpeedStage(0);
    setReadingWordIndex(null);
  };

  useEffect(() => {
    const handleSpeechInterrupted = () => {
      if (isStartingSpeechRef.current) return;
      drillSessionRef.current += 1;
      if (drillTimerRef.current) {
        clearTimeout(drillTimerRef.current);
        drillTimerRef.current = null;
      }
      setIsPlaying(false);
      setIsEnhancedPlaying(false);
      setIsThreeSpeedPlaying(false);
      setThreeSpeedStage(0);
      setReadingWordIndex(null);
    };
    window.addEventListener('fse-speech-interrupted', handleSpeechInterrupted);
    return () => {
      window.removeEventListener('fse-speech-interrupted', handleSpeechInterrupted);
    };
  }, []);

  useEffect(() => {
    cancelActiveDrills();
    cancelSpeech();
    setActiveSentenceIndex(0);
    setSelectedAnswers({});
    setUserTranscript(null);
    setSpeechMatch(null);
    setIsMoreActionsOpen(false);
    return () => {
      drillSessionRef.current += 1;
      if (drillTimerRef.current) {
        clearTimeout(drillTimerRef.current);
        drillTimerRef.current = null;
      }
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
      cancelSpeech();
    };
  }, [lesson.id]);

  // Escape & outside-click handling for internal popovers & note modal
  useEffect(() => {
    if (!isNoteModalOpen && !isLevelPickerOpen && !isMoreActionsOpen) return;
    const handleOverlayKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNoteModalOpen) {
          setIsNoteModalOpen(false);
        } else if (isMoreActionsOpen) {
          setIsMoreActionsOpen(false);
        } else if (isLevelPickerOpen) {
          setIsLevelPickerOpen(false);
        }
      }
    };
    const handleOutsideClick = (e: MouseEvent) => {
      if (isMoreActionsOpen && moreActionsRef.current && !moreActionsRef.current.contains(e.target as Node)) {
        setIsMoreActionsOpen(false);
      }
    };
    window.addEventListener('keydown', handleOverlayKey);
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      window.removeEventListener('keydown', handleOverlayKey);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isNoteModalOpen, isLevelPickerOpen, isMoreActionsOpen]);

  useEffect(() => {
    setCurrentSpeed(speechSpeed);
  }, [speechSpeed]);

  // 預測性音訊緩存：根據 currentSpeed (speechSpeed) 提前預取當前句型、下一個句型與前後相鄰關卡的音訊數據，消除切換關卡時的載入空白
  useEffect(() => {
    const total = allLessons.length;
    const curIdx = typeof currentIndex === 'number' && currentIndex >= 0 ? currentIndex : 0;
    const nextLesson = total > 1 ? allLessons[(curIdx + 1) % total] : undefined;
    const prevLesson = total > 1 ? allLessons[(curIdx - 1 + total) % total] : undefined;

    const nextLessonSentences = nextLesson ? getLessonAllSentences(nextLesson) : [];
    const prevLessonSentences = prevLesson ? getLessonAllSentences(prevLesson) : [];

    predictAndCacheNextSentences({
      currentSentences: allSentences,
      activeSentenceIndex,
      nextLessonSentences,
      prevLessonSentences,
      speechSpeed: currentSpeed,
      includeBilingual: getPreferredAccentMode() === 'tw_mandarin_bilingual'
    });
  }, [lesson.id, activeSentenceIndex, currentSpeed, allLessons, currentIndex]);

  // Mark card as visited on load or interaction
  useEffect(() => {
    if (onMarkVisited && lesson.id && !isVisited) {
      onMarkVisited(lesson.id);
    }
  }, [lesson.id, isVisited]);

  const handleSentenceProgress = (payload: SpeechProgressPayload, sessionEpoch: number) => {
    if (drillSessionRef.current !== sessionEpoch) return;
    setReadingWordIndex(payload.wordIndex >= 0 ? payload.wordIndex : null);
  };

  // Uses Cloud HD + Native Fallback Speech Engine (Click to Play / Rapid-click restarts cleanly)
  const handleListenSpeech = (customSpeed?: number, targetText?: string, forceRestart: boolean = false) => {
    const now = Date.now();
    const isRapidBurst = now - lastSpeechClickTimeRef.current < 320;
    lastSpeechClickTimeRef.current = now;

    if (!forceRestart && !isRapidBurst && (isPlaying || isThreeSpeedPlaying)) {
      cancelActiveDrills();
      cancelSpeech();
      return;
    }

    isStartingSpeechRef.current = true;
    try {
      cancelActiveDrills();
      cancelSpeech();
      if (!isRapidBurst) {
        triggerHapticClick();
      }
      const mySession = ++drillSessionRef.current;
      setIsPlaying(true);
      setIsEnhancedPlaying(false);
      if (onMarkVisited && lesson.id) onMarkVisited(lesson.id);
      const effectiveSpeed = customSpeed || currentSpeed;

      // 若使用者於語音中心開啟「🇹🇼 台英雙語對照教學」，點擊主發音鈕自動執行中英雙語導讀
      if (!targetText && getPreferredAccentMode() === 'tw_mandarin_bilingual') {
        speakBilingualLesson(
          currentSentence.english,
          currentSentence.chinese,
          effectiveSpeed,
          () => {
            if (drillSessionRef.current === mySession) {
              setIsPlaying(false);
              setIsEnhancedPlaying(false);
              setReadingWordIndex(null);
            }
          },
          (payload) => handleSentenceProgress(payload, mySession)
        );
        return;
      }

      speakEnglish(
        targetText || currentSentence.english,
        effectiveSpeed,
        () => {
          if (drillSessionRef.current === mySession) {
            setIsPlaying(false);
            setIsEnhancedPlaying(false);
            setReadingWordIndex(null);
            triggerHapticPhraseComplete();
          }
        },
        undefined,
        100,
        false,
        (payload) => handleSentenceProgress(payload, mySession)
      );
    } finally {
      isStartingSpeechRef.current = false;
    }
  };

  // ⚡ 強化發音：以 0.78x 慢速重音音節清晰咬字朗讀 (Click again to stop, rapid-click restarts cleanly)
  const handleListenEnhancedPronunciation = () => {
    const now = Date.now();
    const isRapidBurst = now - lastSpeechClickTimeRef.current < 320;
    lastSpeechClickTimeRef.current = now;

    if (!isRapidBurst && isPlaying && isEnhancedPlaying) {
      cancelActiveDrills();
      cancelSpeech();
      return;
    }

    isStartingSpeechRef.current = true;
    try {
      cancelActiveDrills();
      cancelSpeech();
      if (!isRapidBurst) {
        triggerHapticClick();
      }
      const mySession = ++drillSessionRef.current;
      setIsPlaying(true);
      setIsEnhancedPlaying(true);
      if (onMarkVisited && lesson.id) onMarkVisited(lesson.id);
      speakEnhancedPronunciation(
        currentSentence.english,
        0.78,
        () => {
          if (drillSessionRef.current === mySession) {
            setIsPlaying(false);
            setIsEnhancedPlaying(false);
            setReadingWordIndex(null);
            triggerHapticPhraseComplete();
          }
        },
        1.05,
        (payload) => handleSentenceProgress(payload, mySession)
      );
    } finally {
      isStartingSpeechRef.current = false;
    }
  };

  // 雙語對照朗讀（中文情境釋義 + 晶圓廠英文句子）
  const handleListenBilingual = () => {
    const now = Date.now();
    const isRapidBurst = now - lastSpeechClickTimeRef.current < 320;
    lastSpeechClickTimeRef.current = now;

    if (!isRapidBurst && (isPlaying || isThreeSpeedPlaying)) {
      cancelActiveDrills();
      cancelSpeech();
      return;
    }

    isStartingSpeechRef.current = true;
    try {
      cancelActiveDrills();
      cancelSpeech();
      if (!isRapidBurst) {
        triggerHapticClick();
      }
      const mySession = ++drillSessionRef.current;
      setIsPlaying(true);
      setIsEnhancedPlaying(false);
      if (onMarkVisited && lesson.id) onMarkVisited(lesson.id);
      speakBilingualLesson(
        currentSentence.english,
        currentSentence.chinese,
        currentSpeed,
        () => {
          if (drillSessionRef.current === mySession) {
            setIsPlaying(false);
            setIsEnhancedPlaying(false);
            setReadingWordIndex(null);
          }
        },
        (payload) => handleSentenceProgress(payload, mySession)
      );
    } finally {
      isStartingSpeechRef.current = false;
    }
  };

  // 🔁 零基礎三速漸進帶讀特訓：第1遍 0.7x 慢速聽音 ➔ 第2遍 0.85x 跟讀記憶 ➔ 第3遍 1.0x 現場實戰 (透過單一 Session Epoch 原子化排程，零計時器衝突)
  const handleListenThreeSpeedDrill = () => {
    const now = Date.now();
    const isRapidBurst = now - lastSpeechClickTimeRef.current < 320;
    lastSpeechClickTimeRef.current = now;

    if (!isRapidBurst && (isThreeSpeedPlaying || isPlaying)) {
      cancelActiveDrills();
      cancelSpeech();
      return;
    }

    isStartingSpeechRef.current = true;
    try {
      cancelActiveDrills();
      cancelSpeech();
      if (!isRapidBurst) {
        triggerHapticClick();
      }
      const mySession = ++drillSessionRef.current;
      setIsThreeSpeedPlaying(true);
      setIsPlaying(true);
      setThreeSpeedStage(1);
      if (onMarkVisited && lesson.id) onMarkVisited(lesson.id);

      const target = currentSentence.english;
      globalAudioScheduler.scheduleSequence(
        [
          {
            text: target,
            lang: 'en-US',
            rate: 0.7,
            bufferAfterMs: 320,
            onStepStart: () => {
              if (drillSessionRef.current === mySession) setThreeSpeedStage(1);
            },
            onStepProgress: (payload) => handleSentenceProgress(payload, mySession)
          },
          {
            text: target,
            lang: 'en-US',
            rate: 0.85,
            bufferAfterMs: 320,
            onStepStart: () => {
              if (drillSessionRef.current === mySession) setThreeSpeedStage(2);
            },
            onStepProgress: (payload) => handleSentenceProgress(payload, mySession)
          },
          {
            text: target,
            lang: 'en-US',
            rate: 1.0,
            bufferAfterMs: 180,
            onStepStart: () => {
              if (drillSessionRef.current === mySession) setThreeSpeedStage(3);
            },
            onStepProgress: (payload) => handleSentenceProgress(payload, mySession)
          }
        ],
        {
          interrupt: false,
          isCancelled: () => drillSessionRef.current !== mySession,
          onSequenceEnd: () => {
            if (drillSessionRef.current === mySession) {
              setIsThreeSpeedPlaying(false);
              setIsPlaying(false);
              setThreeSpeedStage(0);
              setReadingWordIndex(null);
            }
          }
        }
      );
    } finally {
      isStartingSpeechRef.current = false;
    }
  };

  const [speechScore, setSpeechScore] = useState<number | null>(null);

  const calculateSpeechAccuracy = (target: string, transcript: string): number => {
    const cleanTarget = target.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const cleanUser = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    if (cleanTarget.length === 0 || cleanUser.length === 0) return 0;
    
    let matchedCount = 0;
    cleanTarget.forEach((word) => {
      if (cleanUser.some((u) => u === word || (word.length >= 4 && u.includes(word)) || (u.length >= 4 && word.includes(u)))) {
        matchedCount++;
      }
    });
    return Math.min(100, Math.round((matchedCount / cleanTarget.length) * 100));
  };

  const handleStartMicTest = () => {
    setUserTranscript(null);
    setSpeechMatch(null);
    setSpeechScore(null);
    setIsListening(true);
    unlockAudioContext();

    listenSpeech(
      (transcript) => {
        setIsListening(false);
        setUserTranscript(transcript);

        const score = calculateSpeechAccuracy(currentSentence.english, transcript);
        setSpeechScore(score);

        if (score >= 60) {
          setSpeechMatch(true);
          playSuccessChime();
          triggerHapticPhraseComplete();
        } else {
          setSpeechMatch(false);
          playClickSound();
          triggerHapticWarning();
        }
      },
      (err) => {
        setIsListening(false);
        showCopyToast("語音錄音提示：" + err);
      }
    );
  };

  const handleCopy = async () => {
    playClickSound();
    const mandarinPhoneticStr = currentSentence.mandarinPhonetic || getMandarinPhoneticFromSentence(currentSentence.english, currentSentence.phonetic);
    const kkStr = getSentenceKKPhonetic(currentSentence.english);
    const textToCopy = `${lesson.scenario}\n句型：${currentSentence.english}\n中文：${currentSentence.chinese}\nKK音標：${kkStr}\n台味諧音：${currentSentence.phonetic}\n中文諧音：${mandarinPhoneticStr}\n記憶技巧：${lesson.memory_trick}`;
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      showCopyToast(lesson.scenario);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        copyTimerRef.current = null;
        setCopied(false);
      }, 2000);
    } catch {
      showCopyToast('複製失敗，請手動選取文字複製');
    }
  };

  const [activeDetailTab, setActiveDetailTab] = useState<'svo' | 'builder' | 'quiz'>('svo');
  const quizStorageKey = `fse_quiz_answers_c${cycleNumber}_${lesson.id}`;

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem(quizStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const practiceQuestions = getLessonPracticeQuestions(lesson, cycleNumber);

  // Cleanroom Glove-Friendly Horizontal Touch Swipe Gestures (無塵室手套友善：左右滑動切換上一關/下一關)
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const isHorizontalSwipingRef = useRef<boolean>(false);
  const hasTriggeredThresholdVibrateRef = useRef<boolean>(false);
  const swipeFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [swipeOffsetX, setSwipeOffsetX] = useState<number>(0);
  const [swipeActionReady, setSwipeActionReady] = useState<'prev' | 'next' | null>(null);
  const [lastSwipeFlash, setLastSwipeFlash] = useState<'prev' | 'next' | null>(null);

  useEffect(() => {
    return () => {
      if (swipeFlashTimerRef.current) {
        clearTimeout(swipeFlashTimerRef.current);
      }
    };
  }, []);

  const triggerHapticPulse = (ms: number = 12) => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(ms);
      }
    } catch {}
  };

  const triggerSwipeFlash = (dir: 'prev' | 'next') => {
    setLastSwipeFlash(dir);
    if (swipeFlashTimerRef.current) clearTimeout(swipeFlashTimerRef.current);
    swipeFlashTimerRef.current = setTimeout(() => {
      swipeFlashTimerRef.current = null;
      setLastSwipeFlash(null);
    }, 360);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
      touchStartTimeRef.current = Date.now();
      isHorizontalSwipingRef.current = false;
      hasTriggeredThresholdVibrateRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = currentY - touchStartYRef.current;

    if (!isHorizontalSwipingRef.current) {
      // Lock into horizontal gesture when horizontal drag clearly dominates vertical scroll
      if (Math.abs(deltaX) > 14 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
        isHorizontalSwipingRef.current = true;
      } else if (Math.abs(deltaY) > 22) {
        // User is scrolling vertically; abort horizontal tracking
        touchStartXRef.current = null;
        touchStartYRef.current = null;
        setSwipeOffsetX(0);
        setSwipeActionReady(null);
        return;
      } else {
        return;
      }
    }

    // Smooth damped resistance so card & gesture pill follow the gloved thumb naturally
    const dampedOffset = Math.max(-88, Math.min(88, Math.round(deltaX * 0.48)));
    setSwipeOffsetX(dampedOffset);

    const readyDir: 'prev' | 'next' | null =
      deltaX <= -46 && onNextLesson
        ? 'next'
        : deltaX >= 46 && onPrevLesson
        ? 'prev'
        : null;

    if (readyDir && !hasTriggeredThresholdVibrateRef.current) {
      hasTriggeredThresholdVibrateRef.current = true;
      triggerHapticPulse(10);
      // 當手勢滑動達臨界點時，立即以最高優先權預熱目標關卡首句音訊，確保放開手指瞬間 0ms 就緒
      if (allLessons.length > 1 && typeof currentIndex === 'number') {
        const targetIdx =
          readyDir === 'next'
            ? (currentIndex + 1) % allLessons.length
            : (currentIndex - 1 + allLessons.length) % allLessons.length;
        const targetLesson = allLessons[targetIdx];
        if (targetLesson) {
          const targetSentences = getLessonAllSentences(targetLesson);
          if (targetSentences[0]?.english) {
            schedulePredictiveAudioCache(
              [
                {
                  text: targetSentences[0].english,
                  lang: 'en-US',
                  speechSpeed: currentSpeed,
                  priority: 'immediate'
                }
              ],
              currentSpeed
            ).catch(() => {});
          }
        }
      }
    } else if (!readyDir && hasTriggeredThresholdVibrateRef.current) {
      hasTriggeredThresholdVibrateRef.current = false;
    }

    setSwipeActionReady(readyDir);
  };

  const resetSwipeState = () => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isHorizontalSwipingRef.current = false;
    hasTriggeredThresholdVibrateRef.current = false;
    setSwipeOffsetX(0);
    setSwipeActionReady(null);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) {
      resetSwipeState();
      return;
    }
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - touchStartYRef.current;
    const elapsedMs = Math.max(1, Date.now() - touchStartTimeRef.current);

    resetSwipeState();

    // Support both deliberate gloved drag (>= 46px) and quick gloved thumb flick (>= 30px within 250ms)
    const isValidDrag = Math.abs(deltaX) >= 46 && Math.abs(deltaY) < 68;
    const isValidQuickFlick = Math.abs(deltaX) >= 30 && elapsedMs <= 250 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4;

    if (isValidDrag || isValidQuickFlick) {
      if (deltaX < 0 && onNextLesson) {
        // 向左滑動 -> 下一關
        triggerHapticPulse(16);
        playClickSound();
        triggerSwipeFlash('next');
        onNextLesson();
      } else if (deltaX > 0 && onPrevLesson) {
        // 向右滑動 -> 上一關
        triggerHapticPulse(16);
        playClickSound();
        triggerSwipeFlash('prev');
        onPrevLesson();
      }
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(quizStorageKey);
      setSelectedAnswers(saved ? JSON.parse(saved) : {});
    } catch {
      setSelectedAnswers({});
    }
  }, [lesson.id, quizStorageKey]);

  const handleResetCurrentQuiz = () => {
    playClickSound();
    setSelectedAnswers({});
    try {
      localStorage.removeItem(quizStorageKey);
    } catch {}
    if (onRefreshQuestions) {
      onRefreshQuestions();
    }
  };

  // Keyboard navigation for ultra-fast learning (scoped only to primary card when no modals are open)
  useEffect(() => {
    if (disableGlobalShortcuts || isNoteModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName) ||
          activeElement.isContentEditable)
      ) {
        return;
      }
      if (e.key === ' ' || e.key === 'r' || e.key === 'R' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        handleListenSpeech();
      } else if (e.key === 's' || e.key === 'S') {
        setActiveDetailTab('svo');
        playClickSound();
      } else if (e.key === 'q' || e.key === 'Q') {
        setActiveDetailTab('quiz');
        playClickSound();
      } else if (e.key === 'n' || e.key === 'N') {
        if (onNextLesson) {
          e.preventDefault();
          playClickSound();
          onNextLesson();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disableGlobalShortcuts, isNoteModalOpen, currentSentence, currentSpeed, onNextLesson]);

  const handleSelectAnswer = (qIdx: number, optIdx: number) => {
    setSelectedAnswers((prev) => {
      const next = { ...prev, [qIdx]: optIdx };
      try {
        localStorage.setItem(quizStorageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
    const q = practiceQuestions[qIdx];
    if (q && optIdx === q.correctIndex) {
      playSuccessChime();
      triggerHapticPhraseComplete();
    } else {
      playClickSound();
      triggerHapticWarning();
    }
  };

  // Strip embedded duplicate emojis and Chinese annotations from component strings for clean display and speech
  const cleanComponentText = (text: string | undefined) => {
    if (!text) return '';
    return text
      .replace(/\s*[\(（\[【\{][^\)）\]\}]*[\)）\]\}]/g, '')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u4e00-\u9fa5]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Zero-Basis Component Details Helper: extracts English, Chinese meaning, KK, Zhuyin, and Homophone
  const getComponentDetails = (rawText: string | undefined, fallbackMeaning: string) => {
    const english = cleanComponentText(rawText);
    if (!english) {
      return { english: '', chinese: fallbackMeaning, kk: '', zhuyin: '', homophone: '' };
    }
    // Extract Chinese text from parentheses or raw string if present
    let extractedChinese = '';
    if (rawText) {
      const parenMatches = rawText.match(/[\(（]([^\)）]+)[\)）]/g);
      if (parenMatches && parenMatches.length > 0) {
        extractedChinese = parenMatches
          .map((m) =>
            m
              .replace(/[\(（\)）]/g, '')
              .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
              .replace(/[a-zA-Z]+\.?/g, '')
              .trim()
          )
          .filter(Boolean)
          .join(' / ');
      }
      if (!extractedChinese) {
        const cjkMatch = rawText.match(/[\u4e00-\u9fa5]+/g);
        if (cjkMatch) extractedChinese = cjkMatch.join(' ');
      }
    }
    // If no embedded Chinese or it's just generic "橋樑", look up each English word in wordDictionary
    if (!extractedChinese || extractedChinese === '橋樑') {
      const words = english.split(/\s+/).filter(Boolean);
      const lookedUp = words
        .map((w) =>
          lookupWordDefinition(w)
            ?.translation?.replace(/\s*[\(（][^\)）]*[\)）]/g, '')
            .split('/')[0]
            ?.trim()
        )
        .filter(Boolean);
      if (lookedUp.length > 0) {
        extractedChinese = lookedUp.join(' + ');
      }
    }
    const kk = getWordKKPhonetic(english);
    const homophone = getMandarinPhoneticFromSentence(english)
      .replace(/^【\s*|\s*】$/g, '')
      .trim();
    const zhuyin = convertPhoneticToZhuyin(homophone)
      .replace(/^【\s*|\s*】$/g, '')
      .trim();
    return {
      english,
      chinese: extractedChinese || fallbackMeaning,
      kk,
      zhuyin,
      homophone
    };
  };

  const subjectDetails = getComponentDetails(activeComponents.subject, '維修工程師 / 主體');
  const actionDetails = getComponentDetails(activeComponents.action, '處理 / 執行動作');
  const bridgeDetails = getComponentDetails(activeComponents.bridge || 'the', '指定那台 / 連接橋樑');
  const objectDetails = getComponentDetails(activeComponents.object, '機台 / 被處理對象');

  const renderBracketedPhonetic = (prefix: string, raw: string) => {
    const parts = (raw || '').split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;
    return parts.map((part, idx) => {
      const text =
        parts.length === 1
          ? `${prefix}【${part}】`
          : idx === 0
          ? `${prefix}【${part}`
          : idx === parts.length - 1
          ? `${part}】`
          : part;
      return (
        <span key={idx} className="inline-block break-words">
          {text}
        </span>
      );
    });
  };

  // SVO 積木盲測組裝挑戰狀態
  const [builderSelectedOrder, setBuilderSelectedOrder] = useState<string[]>([]);
  const [builderErrorTile, setBuilderErrorTile] = useState<string | null>(null);

  useEffect(() => {
    setBuilderSelectedOrder([]);
    setBuilderErrorTile(null);
  }, [lesson.id, activeSentenceIndex]);

  type SvoTileItem = {
    id: 's' | 'v' | 'b' | 'o';
    text: string;
    chinese: string;
    zhuyin: string;
    homophone: string;
    label: string;
    role: string;
    color: string;
  };
  const rawSvoTiles: SvoTileItem[] = [
    {
      id: 's',
      text: subjectDetails.english,
      chinese: subjectDetails.chinese,
      zhuyin: subjectDetails.zhuyin,
      homophone: subjectDetails.homophone,
      label: '👤 主角',
      role: '誰在做動作',
      color: 'border-blue-500 bg-blue-950/90 text-blue-200'
    },
    {
      id: 'v',
      text: actionDetails.english,
      chinese: actionDetails.chinese,
      zhuyin: actionDetails.zhuyin,
      homophone: actionDetails.homophone,
      label: '🏃 動作',
      role: '做什麼維修動作',
      color: 'border-rose-500 bg-rose-950/90 text-rose-200'
    },
    {
      id: 'b',
      text: bridgeDetails.english,
      chinese: bridgeDetails.chinese,
      zhuyin: bridgeDetails.zhuyin,
      homophone: bridgeDetails.homophone,
      label: '🌉 橋樑',
      role: '連接詞 / 指定那台',
      color: 'border-amber-500 bg-amber-950/90 text-amber-200'
    },
    {
      id: 'o',
      text: objectDetails.english,
      chinese: objectDetails.chinese,
      zhuyin: objectDetails.zhuyin,
      homophone: objectDetails.homophone,
      label: '📦 東西',
      role: '被處理的機台零件',
      color: 'border-emerald-500 bg-emerald-950/90 text-emerald-200'
    }
  ];
  const targetSvoTiles: SvoTileItem[] = rawSvoTiles.filter((t): t is SvoTileItem => t.text.trim().length > 0);

  const shuffledAvailableTiles = React.useMemo(() => {
    const arr = [...targetSvoTiles];
    return arr.sort((a, b) => {
      const hA = (a.id.charCodeAt(0) * 19 + lesson.id.length * 7) % 31;
      const hB = (b.id.charCodeAt(0) * 19 + lesson.id.length * 7) % 31;
      return hA - hB;
    });
  }, [lesson.id, activeSentenceIndex, activeComponents]);

  const handleTileClick = (tileId: string) => {
    const clickedTile = targetSvoTiles.find((t) => t.id === tileId);
    if (clickedTile) {
      speakEnglish(clickedTile.text, 0.82);
    }
    if (builderSelectedOrder.includes(tileId)) return;
    const currentStep = builderSelectedOrder.length;
    const expected = targetSvoTiles[currentStep];

    if (expected && expected.id === tileId) {
      playSvoAssembleChime();
      const next = [...builderSelectedOrder, tileId];
      setBuilderSelectedOrder(next);
      if (next.length === targetSvoTiles.length) {
        playSuccessChime();
        triggerHapticPhraseComplete();
      }
    } else {
      playClickSound();
      triggerHapticWarning();
      setBuilderErrorTile(tileId);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        errorTimerRef.current = null;
        setBuilderErrorTile(null);
      }, 600);
    }
  };

  const handleResetBuilder = () => {
    playClickSound();
    setBuilderSelectedOrder([]);
    setBuilderErrorTile(null);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resetSwipeState}
      style={
        swipeOffsetX !== 0
          ? {
              transform: `translate3d(${swipeOffsetX * 0.28}px, 0, 0)`,
              transition: 'none',
            }
          : {
              transform: 'translate3d(0, 0, 0)',
              transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
            }
      }
      className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex flex-col text-slate-100 relative overflow-hidden backdrop-blur-sm w-full shrink-strict litho-border-scan touch-pan-y"
    >
      {/* Mobile Cleanroom Glove Swipe Edge HUD Indicators (即時滑動邊緣視覺回饋) */}
      <AnimatePresence>
        {(swipeOffsetX > 10 || lastSwipeFlash === 'prev') && onPrevLesson && (
          <motion.div
            key="swipe-prev-hud"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.12 }}
            className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 z-40 px-2.5 py-2 rounded-xl border backdrop-blur-md flex items-center gap-1.5 shadow-xl ${
              swipeActionReady === 'prev' || lastSwipeFlash === 'prev'
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black scale-105'
                : 'bg-slate-950/90 text-amber-300 border-amber-400/50 font-bold'
            }`}
          >
            <span className="text-xs font-mono">⟪</span>
            <span className="text-xs font-mono whitespace-nowrap">
              {swipeActionReady === 'prev' || lastSwipeFlash === 'prev' ? '放開回上一關' : '右滑上一關'}
            </span>
          </motion.div>
        )}

        {(swipeOffsetX < -10 || lastSwipeFlash === 'next') && onNextLesson && (
          <motion.div
            key="swipe-next-hud"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.12 }}
            className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 z-40 px-2.5 py-2 rounded-xl border backdrop-blur-md flex items-center gap-1.5 shadow-xl ${
              swipeActionReady === 'next' || lastSwipeFlash === 'next'
                ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black scale-105'
                : 'bg-slate-950/90 text-cyan-300 border-cyan-400/50 font-bold'
            }`}
          >
            <span className="text-xs font-mono whitespace-nowrap">
              {swipeActionReady === 'next' || lastSwipeFlash === 'next' ? '放開進下一關' : '左滑下一關'}
            </span>
            <span className="text-xs font-mono">⟫</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header Section: Cleanroom Scenario Card Flush to Top Frame */}
      <div className="px-3 sm:px-4 py-2.5 bg-slate-950/95 border-b border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          <span className="text-[11px] font-mono font-bold text-amber-400 shrink-0 tracking-wide mt-0.5 sm:mt-0">
            實戰情境 ·
          </span>
          <h3 className="text-xs sm:text-sm font-black text-slate-100 leading-snug break-words flex-1 min-w-0">
            {lesson.scenario
              .replace(/^🎬\s*情境：/, '')
              .replace(/^🎬\s*/, '')
              .replace(/\s*[\(（][^\)）]*[\)）]/g, '')}
          </h3>
          {isVisited && (
            <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-0.5 shrink-0 mt-0.5 sm:mt-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>已讀</span>
            </span>
          )}
        </div>

        {/* Simplified Header Actions: Level Picker + Bookmark + More Menu */}
        <div ref={moreActionsRef} className="grid grid-cols-3 sm:flex items-center gap-1.5 w-full sm:w-auto shrink-0 relative">
          {typeof currentIndex === 'number' && typeof totalLessons === 'number' && (
            <button
              type="button"
              aria-expanded={isLevelPickerOpen}
              onClick={() => {
                playClickSound();
                setIsLevelPickerOpen((prev) => !prev);
              }}
              className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-mono font-bold tabular-nums transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                isLevelPickerOpen
                  ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black'
                  : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/40'
              }`}
              title="展開關卡快速跳轉"
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span>選關 {currentIndex + 1}/{totalLessons}</span>
              <span className="text-[9px]">{isLevelPickerOpen ? '▴' : '▾'}</span>
            </button>
          )}

          <button
            type="button"
            aria-pressed={isBookmarked}
            onClick={() => {
              playClickSound();
              onToggleBookmark(lesson);
              showBookmarkToast(!isBookmarked, lesson.scenario);
            }}
            className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
              isBookmarked
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
            title={isBookmarked ? '取消收藏' : '加入收藏'}
          >
            <Bookmark className={`w-3.5 h-3.5 shrink-0 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>{isBookmarked ? '已藏' : '收藏'}</span>
          </button>

          <button
            type="button"
            aria-expanded={isMoreActionsOpen}
            onClick={() => {
              playClickSound();
              setIsMoreActionsOpen((prev) => !prev);
            }}
            className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
              isMoreActionsOpen
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
            title="更多操作（雙語朗讀、筆記、複製）"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span>更多</span>
          </button>

          {isMoreActionsOpen && (
            <div className="absolute right-0 top-9 z-40 w-44 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-1.5 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsMoreActionsOpen(false);
                  handleListenBilingual();
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-cyan-300 text-xs font-bold flex items-center gap-2 cursor-pointer text-left"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>雙語朗讀（中+英）</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMoreActionsOpen(false);
                  playClickSound();
                  setTempNoteText(currentLessonNote);
                  setIsNoteModalOpen(true);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-amber-300 text-xs font-bold flex items-center gap-2 cursor-pointer text-left"
              >
                <StickyNote className="w-3.5 h-3.5" />
                <span>{currentLessonNote ? '編輯交接筆記' : '新增交接筆記'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMoreActionsOpen(false);
                  handleCopy();
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer text-left"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已複製內容' : '複製句型筆記'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main 2-Column Integrated Balanced Grid */}
      <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        
        {/* Left Column: Active Sentence Hero Display & Speech Player */}
        <div className="md:col-span-6 space-y-2 flex flex-col min-w-0 h-full">
          <div className="bg-slate-950/90 rounded-xl border border-slate-800 flex flex-col relative min-w-0 flex-1 justify-between overflow-hidden">
            <div className="p-3 sm:p-3.5 flex flex-col gap-2.5 flex-1">
            {/* Sentence Switcher & Tag Badges */}
            <div className="flex items-center justify-between w-full flex-wrap gap-1 pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-1 w-full">
                {allSentences.map((s, idx) => {
                  const isCurSentence = activeSentenceIndex === idx;
                  const pillGradient =
                    idx === 0
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 ring-amber-300 shadow-amber-500/20'
                      : idx === 1
                      ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-400 ring-cyan-300 shadow-cyan-500/20'
                      : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 ring-emerald-300 shadow-emerald-500/20';
                  return (
                    <button
                      key={s.id || idx}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setActiveSentenceIndex(idx);
                        setReadingWordIndex(null);
                        setUserTranscript(null);
                        setSpeechScore(null);
                      }}
                      className={`relative flex-1 py-1 px-1.5 rounded-lg text-xs font-black transition-all cursor-pointer text-center overflow-hidden whitespace-nowrap ${
                        isCurSentence
                          ? 'text-slate-950 font-extrabold shadow-md'
                          : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-700/80 hover:bg-slate-800/80'
                      }`}
                    >
                      {isCurSentence && (
                        <motion.div
                          layoutId="activeSentencePatternPill"
                          className={`absolute inset-0 rounded-lg ring-1 shadow-md z-0 ${pillGradient}`}
                          transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                        />
                      )}
                      <span className="relative z-10">{s.tag.replace(/\s*\([^)]*\)/g, '')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active English Sentence Display with Word-by-Word Click Translation & SVO Breakdown */}
            <InteractiveSentenceViewer
              sentence={currentSentence.english}
              chinese={currentSentence.chinese}
              phonetic={currentSentence.phonetic}
              mandarinPhonetic={currentSentence.mandarinPhonetic || getMandarinPhoneticFromSentence(currentSentence.english, currentSentence.phonetic)}
              components={activeComponents}
              highlightSvo={highlightSvo}
              onSelectSvoRole={(role) => setHighlightSvo(role)}
              activeReadingWordIndex={readingWordIndex}
              speechSpeed={currentSpeed}
            />

            {/* Unified Trilingual Pronunciation & Translation Panel - 清潔分割排版 + 遮中文自測模式 */}
            <div className="w-full bg-slate-900/75 border border-slate-800/90 rounded-xl overflow-hidden divide-y divide-slate-800/70">
              {/* Chinese Meaning Row + Self-Test Mask Toggle */}
              <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={isMaskingHelper ? '揭曉中文與諧音提示' : '點擊朗讀中文句意'}
                  onClick={() => {
                    if (isMaskingHelper) {
                      playClickSound();
                      setIsMaskingHelper(false);
                    } else {
                      playClickSound();
                      speakChinese(currentSentence.chinese, 1.0);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      playClickSound();
                      if (isMaskingHelper) {
                        setIsMaskingHelper(false);
                      } else {
                        speakChinese(currentSentence.chinese, 1.0);
                      }
                    }
                  }}
                  className="flex items-center gap-2 text-slate-100 font-extrabold text-xs sm:text-sm leading-snug min-w-0 flex-1 rounded cursor-pointer hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  title={isMaskingHelper ? '點擊揭曉中文與諧音' : '點擊聆聽中文句意朗讀'}
                >
                  <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-mono font-black shrink-0 border border-amber-400/35 leading-none flex items-center gap-1">
                    <Volume2 className="w-2.5 h-2.5 text-amber-300" />
                    <span>中文</span>
                  </span>
                  {isMaskingHelper ? (
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-dashed border-amber-400/40 text-amber-300/90 text-xs font-mono">
                      已遮蔽（點擊揭曉）
                    </span>
                  ) : (
                    <span className="break-words font-sans text-amber-300 font-bold">{currentSentence.chinese}</span>
                  )}
                </div>

                <button
                  type="button"
                  aria-pressed={isMaskingHelper}
                  onClick={() => {
                    playClickSound();
                    setIsMaskingHelper((prev) => !prev);
                  }}
                  className={`min-h-[28px] px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold cursor-pointer transition-colors shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    isMaskingHelper
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title="遮住中文與諧音，測試自己聽英文能不能直接反應意思"
                >
                  {isMaskingHelper ? '顯示' : '自測'}
                </button>
              </div>

              {/* Phonetic Pronunciation Rows - 清潔微分割取代多層 nested box + 點擊即可發音 */}
              {!isMaskingHelper && (() => {
                const cleanKK = getSentenceKKPhonetic(currentSentence.english);
                const kkGroups = cleanKK.split(/\s*[｜|]\s*/).filter(Boolean);
                const cleanHomophone = getMandarinPhoneticFromSentence(currentSentence.english)
                  .replace(/^【\s*|\s*】$/g, '')
                  .trim();
                const cleanZhuyin = convertPhoneticToZhuyin(cleanHomophone || currentSentence.phonetic || '')
                  .replace(/^【\s*|\s*】$/g, '')
                  .trim();
                const zhuyinGroups = cleanZhuyin.split(/\s*[｜|]\s*/).filter(Boolean);
                const homophoneGroups = cleanHomophone.split(/\s*[｜|]\s*/).filter(Boolean);
                return (
                  <div className="divide-y divide-slate-800/60 text-xs">
                    {/* KK音標 - 點擊觸發 0.78x 強化重音清晰發音 */}
                    {kkGroups.length > 0 && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={handleListenEnhancedPronunciation}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleListenEnhancedPronunciation();
                          }
                        }}
                        title="點擊以 0.78x 強化咬字模式朗讀 KK 音標"
                        className="flex items-start sm:items-center gap-2 px-2.5 sm:px-3 py-2 bg-cyan-950/20 hover:bg-cyan-950/35 transition-colors cursor-pointer min-w-0"
                      >
                        <span className="w-11 sm:w-12 text-center py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[10px] font-bold shrink-0 border border-cyan-500/30 leading-none mt-0.5 sm:mt-0">
                          KK音標
                        </span>
                        <div className="text-cyan-200 font-mono font-bold tracking-wide text-xs sm:text-[13px] leading-snug flex flex-wrap items-center gap-x-1 gap-y-0.5 min-w-0 flex-1 select-text">
                          {kkGroups.map((grp, gIdx) => (
                            <React.Fragment key={gIdx}>
                              <span className="inline-block break-words">
                                {grp}
                              </span>
                              {gIdx < kkGroups.length - 1 && (
                                <span className="text-cyan-500/60 font-normal">｜</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 注音諧音 - 點擊觸發 0.7x 慢速清晰導讀 */}
                    {zhuyinGroups.length > 0 && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleListenSpeech(0.7, undefined, true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleListenSpeech(0.7, undefined, true);
                          }
                        }}
                        title="點擊對照注音以 0.7x 慢速清晰發音"
                        className="flex items-start sm:items-center gap-2 px-2.5 sm:px-3 py-2 bg-indigo-950/20 hover:bg-indigo-950/35 transition-colors cursor-pointer min-w-0"
                      >
                        <span className="w-11 sm:w-12 text-center py-0.5 rounded bg-indigo-500/15 text-indigo-200 text-[10px] font-bold shrink-0 border border-indigo-400/30 leading-none mt-0.5 sm:mt-0">
                          注音
                        </span>
                        <div className="text-yellow-300 font-mono font-bold tracking-wide text-xs sm:text-[13px] leading-snug flex flex-wrap items-center gap-x-1 gap-y-0.5 min-w-0 flex-1 select-text">
                          {zhuyinGroups.map((grp, gIdx) => (
                            <React.Fragment key={gIdx}>
                              <span className="inline-block break-words">
                                {gIdx === 0 ? `【 ${grp}` : grp}
                                {gIdx === zhuyinGroups.length - 1 ? ' 】' : ''}
                              </span>
                              {gIdx < zhuyinGroups.length - 1 && (
                                <span className="text-indigo-400/60 font-normal">｜</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 中文標音 - 點擊觸發 0.7x 慢速清晰導讀 */}
                    {homophoneGroups.length > 0 && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleListenSpeech(0.7, undefined, true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleListenSpeech(0.7, undefined, true);
                          }
                        }}
                        title="點擊對照台味諧音以 0.7x 慢速清晰發音"
                        className="flex items-start sm:items-center gap-2 px-2.5 sm:px-3 py-2 bg-emerald-950/20 hover:bg-emerald-950/35 transition-colors cursor-pointer min-w-0"
                      >
                        <span className="w-11 sm:w-12 text-center py-0.5 rounded bg-emerald-500/15 text-emerald-200 text-[10px] font-bold shrink-0 border border-emerald-400/30 leading-none mt-0.5 sm:mt-0">
                          諧音
                        </span>
                        <div className="text-emerald-300 font-mono font-bold text-xs sm:text-[13px] leading-snug flex flex-wrap items-center gap-x-1 gap-y-0.5 min-w-0 flex-1 select-text">
                          {homophoneGroups.map((grp, gIdx) => (
                            <React.Fragment key={gIdx}>
                              <span className="inline-block break-words">
                                {gIdx === 0 ? `【 ${grp}` : grp}
                                {gIdx === homophoneGroups.length - 1 ? ' 】' : ''}
                              </span>
                              {gIdx < homophoneGroups.length - 1 && (
                                <span className="text-emerald-500/60 font-normal">｜</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Collapsible Memory Trick Accordion */}
            {lesson.memory_trick && (
              <div className="w-full bg-slate-900/90 border border-amber-500/35 rounded-xl px-2.5 py-2 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    aria-expanded={showMemoryTrick}
                    onClick={() => {
                      playClickSound();
                      setShowMemoryTrick((prev) => !prev);
                    }}
                    className="flex-1 flex items-center justify-between gap-2 cursor-pointer text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs">
                      <Cpu className="w-3.5 h-3.5 text-amber-400" />
                      <span>記憶口訣</span>
                    </div>
                    <span className="text-[11px] font-mono text-amber-300/90 whitespace-nowrap">
                      {showMemoryTrick ? '收合 ▴' : '展開口訣 ▾'}
                    </span>
                  </button>
                  {showMemoryTrick && (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        speakChinese(lesson.memory_trick.replace(/➔/g, '，'), 1.0);
                      }}
                      className="px-2 py-0.5 rounded bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      title="語音朗讀記憶口訣"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>聽口訣</span>
                    </button>
                  )}
                </div>

                {showMemoryTrick && (
                  <div className="pt-2 mt-1.5 border-t border-slate-800/80">
                    {lesson.memory_trick.includes('➔') ? (
                      <div className="flex flex-wrap items-center gap-1 text-[11px]">
                        {lesson.memory_trick.replace(/簽簿/g, '錢伯/簽簿').split('➔').map((step, sIdx, arr) => (
                          <React.Fragment key={sIdx}>
                            <div className="px-1.5 py-0.5 rounded-md bg-slate-950/80 border border-amber-500/20 text-slate-200 font-sans leading-tight">
                              {step.trim()}
                            </div>
                            {sIdx < arr.length - 1 && (
                              <span className="text-amber-400 font-black text-[10px]">➔</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-200 font-sans leading-relaxed break-words text-[11px]">
                        {lesson.memory_trick.replace(/簽簿/g, '錢伯/簽簿')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Acoustic Audio Waveform Animation when playing */}
            {(isPlaying || (isQueuePlaying && (currentTask?.rawText === currentSentence.english || currentTask?.text === cleanEnglishText(currentSentence.english)))) && (
              <div className="flex items-end gap-1.5 h-3.5 my-0.5 animate-fade-in">
                {[45, 85, 65, 100, 55, 95, 75, 40, 90, 50, 100, 65].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-cyan-400 to-amber-300 rounded-full acoustic-bar"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 0.06}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Dynamic Sequential Speech Queue Progress Bar with Real-time State Machine & Countdown */}
            {isQueuePlaying && (
              <div className="w-full space-y-1 pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[10px] font-mono px-0.5 flex-wrap gap-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="flex items-center gap-1 text-cyan-300">
                      <Volume2 className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>
                        {enginePhase === 'BUFFERING'
                          ? '預緩衝載入中'
                          : enginePhase === 'INTER_SENTENCE_BUFFER'
                          ? '句間韻律緩衝'
                          : enginePhase === 'RECOVERING'
                          ? '雙通道自癒切換'
                          : (currentTask?.rawText === currentSentence.english || currentTask?.text === cleanEnglishText(currentSentence.english))
                          ? '正在朗讀本句'
                          : '佇列連播中'}
                      </span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-950 border border-cyan-500/30 text-emerald-300 text-[9px] font-mono">
                      {enginePhase === 'PLAYING_CLOUD'
                        ? 'HD預緩衝'
                        : enginePhase === 'PLAYING_NATIVE'
                        ? '本機引擎'
                        : enginePhase === 'BUFFERING'
                        ? 'RAM緩衝'
                        : '穩定排程'}
                    </span>
                    {queueCurrentWord && queueWordIndex >= 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[9px] font-mono font-black">
                        {queueCurrentWord} ({queueWordIndex + 1}/{Math.max(1, queueTotalWords)})
                      </span>
                    )}
                  </div>
                  
                  {/* Real-time Countdown and Queue remaining badges */}
                  <div className="flex items-center gap-1 tabular-nums">
                    {remainingQueueCount > 0 && (
                      <span className="text-indigo-300 text-[10px] font-bold">
                        待播 {remainingQueueCount} 句 ·
                      </span>
                    )}

                    {/* Countdown Remaining Seconds */}
                    <span className="text-cyan-300 text-[10px] font-mono font-extrabold">
                      剩餘 {remainingSeconds.toFixed(1)}s
                    </span>

                    <span className="font-extrabold text-cyan-400">
                      · {queueProgress}%
                    </span>
                  </div>
                </div>

                {/* Progress Track & Glow */}
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800 relative shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 shadow-sm shadow-cyan-500/50 transition-all duration-100 ease-out"
                    style={{ width: `${Math.max(4, queueProgress)}%` }}
                  />
                </div>
              </div>
            )}

            </div>
            {/* Audio Action Bar - Dedicated Anchored Bottom Row (完整呈現不裁切) */}
            <div className="w-full mt-auto px-2.5 sm:px-3 py-2 bg-slate-900/95 border-t border-slate-800/90">
              <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {/* Speed Presets */}
                <div className="min-h-[34px] grid grid-cols-4 sm:flex items-center gap-0.5 bg-slate-950/90 p-0.5 rounded-lg border border-slate-800 shrink-0 tabular-nums">
                  {[0.7, 0.85, 1.0, 1.2].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      aria-pressed={currentSpeed === spd}
                      onClick={() => {
                        setCurrentSpeed(spd);
                        handleListenSpeech(spd, undefined, true);
                      }}
                      className={`h-7 px-2 flex items-center justify-center rounded-md text-[11px] font-mono font-bold cursor-pointer transition-colors active:scale-95 touch-manipulation whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        currentSpeed === spd
                          ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                      }`}
                      title={`以 ${spd}x 語速立即播放`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 sm:flex items-center gap-1.5 flex-1 sm:justify-end min-w-0">
                  {/* ⚡ 強化咬字重音導讀 (0.78x) */}
                  <button
                    type="button"
                    aria-pressed={isEnhancedPlaying}
                    onClick={handleListenEnhancedPronunciation}
                    className={`min-h-[34px] px-2 sm:px-2.5 rounded-lg border text-[11px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 active:scale-95 whitespace-nowrap ${
                      isEnhancedPlaying
                        ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-black'
                        : 'bg-slate-950 hover:bg-slate-800 text-emerald-300 border-emerald-500/40'
                    }`}
                    title="0.78x 強化咬字模式：加重單字重音與無塵室抗噪穿透力 (快捷鍵 E)"
                  >
                    <Zap className="w-3 h-3 shrink-0" />
                    <span>強化</span>
                  </button>

                  {/* 🔁 零基礎三速漸進帶讀 (慢->中->快) */}
                  <button
                    type="button"
                    onClick={handleListenThreeSpeedDrill}
                    className={`min-h-[34px] px-2 sm:px-2.5 rounded-lg border text-[11px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 active:scale-95 whitespace-nowrap ${
                      isThreeSpeedPlaying
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                        : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border-amber-500/40'
                    }`}
                    title="零基礎三遍漸進帶讀：0.7x慢聽 ➔ 0.85x跟讀 ➔ 1.0x實戰"
                  >
                    <RefreshCw className={`w-3 h-3 shrink-0 ${isThreeSpeedPlaying ? 'motion-safe:animate-spin' : ''}`} />
                    <span className="tabular-nums">{isThreeSpeedPlaying ? `${threeSpeedStage}/3` : '三速'}</span>
                  </button>

                  {/* 🎤 開口跟讀檢測 */}
                  <button
                    type="button"
                    onClick={handleStartMicTest}
                    disabled={isListening}
                    className={`min-h-[34px] px-2 sm:px-2.5 rounded-lg border text-[11px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 active:scale-95 whitespace-nowrap ${
                      isListening
                        ? 'bg-rose-500 text-white border-rose-400 font-black'
                        : 'bg-slate-950 hover:bg-slate-800 text-cyan-300 border-cyan-500/40'
                    }`}
                    title="點擊開口跟讀，即時比對發音準確度 (快捷鍵 M)"
                  >
                    {isListening ? <MicOff className="w-3 h-3 shrink-0" /> : <Mic className="w-3 h-3 shrink-0" />}
                    <span>{isListening ? '聆聽中' : '跟讀'}</span>
                  </button>

                  {/* 主發音按鈕 */}
                  <button
                    type="button"
                    aria-pressed={isPlaying}
                    onClick={() => handleListenSpeech()}
                    className={`min-h-[34px] shrink-0 px-2.5 sm:px-3.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-[0.98] touch-manipulation relative group overflow-hidden whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      isPlaying
                        ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-300'
                        : 'bg-gradient-to-r from-cyan-400 to-teal-400 hover:brightness-110 text-slate-950'
                    }`}
                    title={isPlaying ? "點擊停止 (快捷鍵 Space)" : "點擊發音 (快捷鍵 Space)"}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="w-3 h-3 fill-slate-950 text-slate-950 shrink-0" />
                        <span className="font-black tracking-wide text-xs">停止</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-slate-950 stroke-[2.2] shrink-0" />
                        <span className="tracking-wide font-black text-xs">發音</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* User Transcript & Word-by-Word Pronunciation Diagnostic Feedback */}
          {userTranscript && (
            <div className={`p-2.5 rounded-xl border text-xs font-medium space-y-1.5 animate-fade-in ${
              speechMatch
                ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-200'
                : 'bg-amber-950/60 border-amber-500/80 text-amber-200'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-extrabold flex items-center gap-1.5">
                  {speechMatch ? '發音高度相符！' : '可點擊下方單字針對強化練習'}
                  {speechScore !== null && (
                    <span className="text-[11px] font-mono font-black tabular-nums">
                      · 準確率 {speechScore}%
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleListenEnhancedPronunciation}
                    className="px-2 py-0.5 rounded bg-black/40 text-[10px] font-bold border border-current hover:bg-black/60 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Zap className="w-3 h-3" />
                    <span>慢速強化</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleListenSpeech()}
                    className="px-2 py-0.5 rounded bg-black/40 text-[10px] font-bold border border-current hover:bg-black/60 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>聽標準音</span>
                  </button>
                </div>
              </div>

              <div className="text-[10px] space-y-1 bg-black/30 p-2 rounded font-mono">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-slate-400 mr-0.5">逐字診斷（點擊單獨聽發音）：</span>
                  {currentSentence.english.split(/\s+/).filter(Boolean).map((rawWord, wIdx) => {
                    const cleanTargetW = rawWord.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const userWords = userTranscript.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
                    const isWordHit = cleanTargetW.length > 0 && userWords.some(
                      (u) => u === cleanTargetW || (cleanTargetW.length >= 4 && u.includes(cleanTargetW)) || (u.length >= 4 && cleanTargetW.includes(u))
                    );
                    return (
                      <button
                        key={wIdx}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          speakSingleEnglishWord(rawWord, 0.78);
                        }}
                        className={`px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold cursor-pointer transition-transform active:scale-95 ${
                          isWordHit
                            ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30'
                            : 'bg-rose-500/25 border-rose-400/60 text-rose-200 hover:bg-rose-500/35 underline decoration-rose-400'
                        }`}
                        title={isWordHit ? `發音正確：點擊重聽 ${rawWord}` : `建議加強：點擊慢速單獨聽 ${rawWord}`}
                      >
                        {rawWord}
                      </button>
                    );
                  })}
                </div>
                <div><span className="text-slate-400">您的跟讀：</span> <span className="text-amber-200">"{userTranscript}"</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Integrated SVO Breakdown & Context */}
        <div className="md:col-span-6 space-y-1.5 flex flex-col">
          
          {/* Segmented Detail Tabs Control (3-Step Guided Flow with Completion Badges & Spring Pill) */}
          <div role="tablist" aria-label="句型學習模式" className="flex items-center justify-between bg-slate-950/80 p-0.5 rounded-lg border border-slate-800/90 gap-1 overflow-x-auto no-scrollbar w-full max-w-full">
            {[
              { id: 'svo', label: '1. 拆解', icon: LayoutGrid, done: false },
              { id: 'builder', label: '2. 盲測', icon: Layers, done: builderSelectedOrder.length === targetSvoTiles.length && targetSvoTiles.length > 0 },
              { id: 'quiz', label: '3. 測驗', icon: HelpCircle, done: Object.keys(selectedAnswers).length === 2 },
            ].map((tab) => {
              const isCur = activeDetailTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isCur}
                  onClick={() => {
                    playClickSound();
                    setActiveDetailTab(tab.id as any);
                  }}
                  className={`relative flex-1 py-1 px-1.5 rounded-md text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    isCur
                      ? 'text-slate-950 shadow-md'
                      : tab.done
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/60'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                  }`}
                >
                  {isCur && (
                    <motion.div
                      layoutId="activeLessonDetailTabPill"
                      className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 rounded-md ring-1 ring-amber-300 shadow-md z-0"
                      transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-1">
                    <TabIcon className={`w-3.5 h-3.5 shrink-0 ${isCur ? 'text-slate-950 stroke-[2.4]' : tab.done ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                    {tab.done && (
                      <span className={`px-1 rounded text-[9px] font-mono font-black ${isCur ? 'bg-slate-950 text-emerald-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                        ✓
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 flex flex-col justify-start">
            <AnimatePresence mode="wait">
              {/* Tab 1: SVO Breakdown Grid */}
              {activeDetailTab === 'svo' && (
                <motion.div
                  key={`svo-tab-${activeSentenceIndex}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="gap-2 h-full flex flex-col justify-between"
                >
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 items-stretch flex-1">
                    
                    {/* 主角 (S) */}
                    <motion.button
                      type="button"
                      aria-pressed={highlightSvo === 'subject'}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onMouseEnter={() => setHighlightSvo('subject')}
                      onMouseLeave={() => setHighlightSvo(null)}
                      onClick={() => {
                        setHighlightSvo(highlightSvo === 'subject' ? null : 'subject');
                        speakEnglish(subjectDetails.english, currentSpeed);
                      }}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all text-center cursor-pointer flex flex-col justify-between h-full min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                        highlightSvo === 'subject'
                          ? 'bg-cyan-950/90 border-cyan-400 shadow-lg ring-1 ring-cyan-400/60'
                          : 'bg-gradient-to-b from-cyan-950/40 to-slate-950/95 border-cyan-500/35 hover:border-cyan-400/70'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full text-cyan-400 font-bold text-[10px] tracking-wider gap-1">
                        <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-cyan-950/90 border border-cyan-500/35 whitespace-nowrap">1. 主角</span>
                        <span className="flex items-center gap-1 text-[10px] text-cyan-300/90 font-mono whitespace-nowrap">
                          <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        </span>
                      </div>
                      <div className="my-auto py-1.5 sm:py-2 space-y-0.5 w-full min-w-0">
                        <div className="text-center font-black text-slate-100 font-mono text-base sm:text-xl break-words tracking-tight leading-snug">
                          {subjectDetails.english}
                        </div>
                        <div className="text-center font-bold text-cyan-300 text-xs sm:text-sm break-words">
                          {subjectDetails.chinese}
                        </div>
                      </div>
                      <div className="w-full space-y-0.5 pt-1.5 sm:pt-2 border-t border-cyan-500/20 text-[10px] sm:text-[11px] min-w-0">
                        {subjectDetails.kk && (
                          <div className="text-cyan-300 font-mono font-bold flex flex-wrap items-center justify-center gap-x-1 break-words">
                            <span>KK：{subjectDetails.kk}</span>
                          </div>
                        )}
                        <div className="text-yellow-300 font-mono font-bold flex flex-wrap items-center justify-center gap-x-1">
                          {renderBracketedPhonetic('注音：', subjectDetails.zhuyin)}
                        </div>
                        <div className="text-emerald-300 font-mono font-bold flex flex-wrap items-center justify-center gap-x-1">
                          {renderBracketedPhonetic('諧音：', subjectDetails.homophone)}
                        </div>
                      </div>
                    </motion.button>

                    {/* 動作 */}
                    <motion.button
                      type="button"
                      aria-pressed={highlightSvo === 'action'}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onMouseEnter={() => setHighlightSvo('action')}
                      onMouseLeave={() => setHighlightSvo(null)}
                      onClick={() => {
                        setHighlightSvo(highlightSvo === 'action' ? null : 'action');
                        speakEnglish(actionDetails.english, currentSpeed);
                      }}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all text-center cursor-pointer flex flex-col justify-between h-full min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                        highlightSvo === 'action'
                          ? 'bg-rose-950/90 border-rose-400 shadow-lg ring-1 ring-rose-400/60'
                          : 'bg-gradient-to-b from-rose-950/40 to-slate-950/95 border-rose-500/35 hover:border-rose-400/70'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full text-rose-400 font-bold text-[10px] tracking-wider gap-1">
                        <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-950/90 border border-rose-500/35 whitespace-nowrap">2. 動作</span>
                        <span className="flex items-center gap-1 text-[10px] text-rose-300/90 font-mono whitespace-nowrap">
                          <Volume2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        </span>
                      </div>
                      <div className="my-auto py-1.5 sm:py-2 space-y-0.5 w-full min-w-0">
                        <div className="text-center font-black text-slate-100 font-mono text-base sm:text-xl break-words tracking-tight leading-snug">
                          {actionDetails.english}
                        </div>
                        <div className="text-center font-bold text-rose-300 text-xs sm:text-sm break-words">
                          {actionDetails.chinese}
                        </div>
                      </div>
                      <div className="w-full space-y-0.5 pt-1.5 sm:pt-2 border-t border-rose-500/20 text-[10px] sm:text-[11px] min-w-0">
                        {actionDetails.kk && (
                          <div className="text-cyan-300 font-mono font-bold flex flex-wrap items-center justify-center gap-x-1 break-words">
                            <span>KK：{actionDetails.kk}</span>
                          </div>
                        )}
                        <div className="text-yellow-300 font-mono font-bold flex flex-wrap items-center justify-center gap-x-1">
                          {renderBracketedPhonetic('注音：', actionDetails.zhuyin)}
                        </div>
                        <div className="text-emerald-300 font-mono font-bold flex flex-wrap items-center justify-center gap-x-1">
                          {renderBracketedPhonetic('諧音：', actionDetails.homophone)}
                        </div>
                      </div>
                    </motion.button>

                    {/* 橋樑 */}
                    <motion.button
                      type="button"
                      aria-pressed={highlightSvo === 'bridge'}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onMouseEnter={() => setHighlightSvo('bridge')}
                      onMouseLeave={() => setHighlightSvo(null)}
                      onClick={() => {
                        setHighlightSvo(highlightSvo === 'bridge' ? null : 'bridge');
                        speakEnglish(bridgeDetails.english, currentSpeed);
                      }}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all text-center cursor-pointer flex flex-col justify-between h-full min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                        highlightSvo === 'bridge'
                          ? 'bg-indigo-950/90 border-indigo-400 shadow-lg ring-1 ring-indigo-400/60'
                          : 'bg-gradient-to-b from-indigo-950/40 to-slate-950/95 border-indigo-500/35 hover:border-indigo-400/70'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full text-indigo-400 font-bold text-[10px] tracking-wider gap-1">
                        <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-indigo-950/90 border border-indigo-500/35 whitespace-nowrap">3. 橋樑</span>
                        <span className="flex items-center gap-1 text-[10px] text-indigo-300/90 font-mono whitespace-nowrap">
                          <Volume2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        </span>
                      </div>
                      <div className="my-auto py-1.5 sm:py-2 space-y-0.5 w-full min-w-0">
                        <div className="text-center font-black text-slate-100 font-mono text-base sm:text-xl break-words tracking-tight leading-snug">
                          {bridgeDetails.english}
                        </div>
                        <div className="text-center font-bold text-indigo-300 text-xs sm:text-sm break-words">
                          {bridgeDetails.chinese}
                        </div>
                      </div>
                      <div className="w-full space-y-0.5 pt-1.5 sm:pt-2 border-t border-indigo-500/20 text-[10px] sm:text-[11px] min-w-0">
                        {bridgeDetails.kk && (
                          <div className="text-cyan-300 font-mono font-bold flex flex-wrap items-center justify-center gap-x-1 break-words">
                            <span>KK：{bridgeDetails.kk}</span>
                          </div>
                        )}
                        <div className="text-yellow-300 font-mono font-bold flex flex-wrap items-center justify-center gap-x-1">
                          {renderBracketedPhonetic('注音：', bridgeDetails.zhuyin)}
                        </div>
                        <div className="text-emerald-300 font-mono font-bold flex flex-wrap items-center justify-center gap-x-1">
                          {renderBracketedPhonetic('諧音：', bridgeDetails.homophone)}
                        </div>
                      </div>
                    </motion.button>

                    {/* 東西 */}
                    <motion.button
                      type="button"
                      aria-pressed={highlightSvo === 'object'}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onMouseEnter={() => setHighlightSvo('object')}
                      onMouseLeave={() => setHighlightSvo(null)}
                      onClick={() => {
                        setHighlightSvo(highlightSvo === 'object' ? null : 'object');
                        speakEnglish(objectDetails.english, currentSpeed);
                      }}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all text-center cursor-pointer flex flex-col justify-between h-full min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                        highlightSvo === 'object'
                          ? 'bg-emerald-950/90 border-emerald-400 shadow-lg ring-1 ring-emerald-400/60'
                          : 'bg-gradient-to-b from-emerald-950/40 to-slate-950/95 border-emerald-500/35 hover:border-emerald-400/70'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full text-emerald-400 font-bold text-[10px] tracking-wider gap-1">
                        <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/35 whitespace-nowrap">4. 東西</span>
                        <span className="flex items-center gap-1 text-[10px] text-emerald-300/90 font-mono whitespace-nowrap">
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        </span>
                      </div>
                      <div className="my-auto py-1.5 sm:py-2 space-y-0.5 w-full min-w-0">
                        <div className="text-center font-black text-slate-100 font-mono text-base sm:text-xl break-words tracking-tight leading-snug">
                          {objectDetails.english}
                        </div>
                        <div className="text-center font-bold text-emerald-300 text-xs sm:text-sm break-words">
                          {objectDetails.chinese}
                        </div>
                      </div>
                      <div className="w-full space-y-0.5 pt-1.5 sm:pt-2 border-t border-emerald-500/20 text-[10px] sm:text-[11px] min-w-0">
                        {objectDetails.kk && (
                          <div className="text-cyan-300 font-mono font-bold flex flex-wrap items-center justify-center gap-x-1 break-words">
                            <span>KK：{objectDetails.kk}</span>
                          </div>
                        )}
                        <div className="text-yellow-300 font-mono font-bold flex flex-wrap items-center justify-center gap-x-1">
                          {renderBracketedPhonetic('注音：', objectDetails.zhuyin)}
                        </div>
                        <div className="text-emerald-300 font-mono font-bold flex flex-wrap items-center justify-center gap-x-1">
                          {renderBracketedPhonetic('諧音：', objectDetails.homophone)}
                        </div>
                      </div>
                    </motion.button>

                  </div>

                  {/* 一口氣語序連讀與盲測啟動列 (精簡單排設計，不重複堆疊卡片) */}
                  <div className="bg-slate-950/95 border border-slate-800/90 rounded-xl px-2.5 sm:px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-inner">
                    <div className="flex items-start sm:items-center gap-1.5 min-w-0 flex-1 text-xs font-mono">
                      <span className="text-emerald-400 font-black shrink-0">連讀口訣 ·</span>
                      <span className="text-emerald-200 font-bold break-words leading-snug">
                        {subjectDetails.homophone} ➔ {actionDetails.homophone} ➔ {bridgeDetails.homophone} ➔ {objectDetails.homophone}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          isStartingSpeechRef.current = true;
                          try {
                            cancelActiveDrills();
                            cancelSpeech();
                            playClickSound();
                            const mySession = ++drillSessionRef.current;
                            setIsPlaying(true);
                            setHighlightSvo('subject');
                            globalAudioScheduler.scheduleSequence(
                              [
                                {
                                  text: subjectDetails.english,
                                  lang: 'en-US',
                                  rate: 0.76,
                                  bufferAfterMs: 220,
                                  onStepStart: () => {
                                    if (drillSessionRef.current === mySession) setHighlightSvo('subject');
                                  }
                                },
                                {
                                  text: actionDetails.english,
                                  lang: 'en-US',
                                  rate: 0.76,
                                  bufferAfterMs: 220,
                                  onStepStart: () => {
                                    if (drillSessionRef.current === mySession) setHighlightSvo('action');
                                  }
                                },
                                {
                                  text: bridgeDetails.english,
                                  lang: 'en-US',
                                  rate: 0.76,
                                  bufferAfterMs: 220,
                                  onStepStart: () => {
                                    if (drillSessionRef.current === mySession) setHighlightSvo('bridge');
                                  }
                                },
                                {
                                  text: objectDetails.english,
                                  lang: 'en-US',
                                  rate: 0.76,
                                  bufferAfterMs: 260,
                                  onStepStart: () => {
                                    if (drillSessionRef.current === mySession) setHighlightSvo('object');
                                  }
                                },
                                {
                                  text: currentSentence.english,
                                  lang: 'en-US',
                                  rate: 0.85,
                                  bufferAfterMs: 150,
                                  onStepStart: () => {
                                    if (drillSessionRef.current === mySession) setHighlightSvo(null);
                                  }
                                }
                              ],
                              {
                                interrupt: false,
                                isCancelled: () => drillSessionRef.current !== mySession,
                                onSequenceEnd: () => {
                                  if (drillSessionRef.current === mySession) {
                                    setHighlightSvo(null);
                                    setIsPlaying(false);
                                  }
                                }
                              }
                            );
                          } finally {
                            isStartingSpeechRef.current = false;
                          }
                        }}
                        className="min-h-[32px] px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold cursor-pointer transition-all shrink-0 whitespace-nowrap flex items-center justify-center gap-1"
                        title="自動依序高亮並朗讀：主角 ➔ 動作 ➔ 橋樑 ➔ 東西 ➔ 整句連讀"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>依序帶讀</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setActiveDetailTab('builder');
                        }}
                        className="min-h-[32px] px-2.5 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-[11px] font-mono font-bold cursor-pointer transition-all shrink-0 whitespace-nowrap flex items-center justify-center"
                      >
                        盲測 →
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab 2: SVO Sentence Builder Reassembly Challenge */}
              {activeDetailTab === 'builder' && (
                <motion.div
                  key={`builder-tab-${activeSentenceIndex}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="gap-2.5 h-full flex flex-col justify-between"
                >
                  <div className="bg-slate-950/90 rounded-xl p-2.5 sm:p-3 border border-slate-800 space-y-2 shadow-inner">
                    <div className="flex items-center justify-between gap-1.5 text-[11px] flex-wrap">
                      <div className="flex items-center gap-1.5 text-cyan-300 font-black">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>依序點擊積木組裝</span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-auto">
                        {builderSelectedOrder.length < targetSvoTiles.length && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextExpected = targetSvoTiles[builderSelectedOrder.length];
                              if (nextExpected) {
                                handleTileClick(nextExpected.id);
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                            title="零基礎輔助：自動幫您填入下一塊正確語序積木"
                          >
                            提示
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleResetBuilder}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                        >
                          重置
                        </button>
                      </div>
                    </div>

                    {/* Target Chinese Hint + Listen Button */}
                    <div className="flex items-center justify-between gap-2 text-xs text-amber-300 font-bold bg-amber-950/30 p-2 rounded-lg border border-amber-500/30">
                      <span>目標：{currentSentence.chinese}</span>
                      <button
                        type="button"
                        onClick={() => speakEnglish(currentSentence.english, 0.78)}
                        className="px-2 py-0.5 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>聽提示</span>
                      </button>
                    </div>

                    {/* 4-Slot Guided Blueprint Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {targetSvoTiles.map((slotTile, idx) => {
                        const selectedTileId = builderSelectedOrder[idx];
                        const filledTile = selectedTileId ? targetSvoTiles.find((t) => t.id === selectedTileId) : null;
                        const isNextSlot = idx === builderSelectedOrder.length;
                        return (
                          <div
                            key={slotTile.id}
                            className={`p-2 rounded-lg border text-xs font-mono flex flex-col justify-between min-h-[60px] transition-all ${
                              filledTile
                                ? `${filledTile.color} shadow-sm`
                                : isNextSlot
                                ? 'bg-amber-500/10 border-dashed border-amber-400/80 text-amber-300'
                                : 'bg-slate-900/50 border-dashed border-slate-800 text-slate-500'
                            }`}
                          >
                            <span className="text-[10px] font-black opacity-85 whitespace-nowrap">
                              {idx + 1}. {slotTile.label}
                            </span>
                            {filledTile ? (
                              <>
                                <span className="font-black text-white break-words leading-snug">{filledTile.text}</span>
                                <span className="text-[10px] text-amber-300 font-sans break-words">{filledTile.chinese}</span>
                              </>
                            ) : (
                              <span className="text-[10px] font-sans opacity-75">
                                {isNextSlot ? '👈 請點選此角色' : slotTile.role}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Success or Progress Notification */}
                    {builderSelectedOrder.length === targetSvoTiles.length ? (
                      <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-black flex items-center justify-between gap-2 flex-wrap animate-fade-in">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>SVO 語序拼裝成功！</span>
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => handleListenSpeech(0.7)}
                            className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-400/40 text-[11px] font-mono font-black cursor-pointer hover:bg-amber-500/30 whitespace-nowrap tabular-nums"
                            title="以 0.7x 慢速複習整句"
                          >
                            0.7x
                          </button>
                          <button
                            type="button"
                            onClick={() => handleListenSpeech()}
                            className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-400/50 text-[11px] font-black flex items-center gap-1 cursor-pointer hover:bg-emerald-500/30 whitespace-nowrap"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>朗讀</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              setActiveDetailTab('quiz');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-black flex items-center gap-1 cursor-pointer hover:bg-amber-300 whitespace-nowrap shadow-xs"
                          >
                            <span>下一步：實戰測驗 →</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-mono text-center">
                        組裝進度：{builderSelectedOrder.length} / {targetSvoTiles.length} 積木
                      </div>
                    )}
                  </div>

                  {/* Available Shuffled Tiles */}
                  <div className="grid grid-cols-2 gap-2.5 items-stretch flex-1">
                    {shuffledAvailableTiles.map((tile) => {
                      const isSelected = builderSelectedOrder.includes(tile.id);
                      const isError = builderErrorTile === tile.id;
                      return (
                        <motion.button
                          key={tile.id}
                          type="button"
                          whileTap={{ scale: isSelected ? 1 : 0.98 }}
                          disabled={isSelected}
                          onClick={() => handleTileClick(tile.id)}
                          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                            isSelected
                              ? 'opacity-30 grayscale cursor-not-allowed bg-slate-950 border-slate-800'
                              : isError
                              ? 'bg-rose-900/90 border-rose-400 shadow-lg'
                              : `${tile.color} hover:brightness-110 shadow-md`
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-black tracking-wider mb-0.5 opacity-90">
                            <span className="whitespace-nowrap">{tile.label}</span>
                            <Volume2 className="w-3.5 h-3.5 opacity-80 shrink-0" />
                          </div>
                          <div className="font-black text-base sm:text-lg font-mono break-words my-auto py-1 text-white">
                            {tile.text}
                          </div>
                          <div className="text-xs font-bold text-amber-300 break-words">
                            {tile.chinese}
                          </div>
                          <div className="text-[10px] font-mono text-emerald-300/90 mt-1 bg-black/35 px-1.5 py-1 rounded border border-white/10 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-x-1">
                              {renderBracketedPhonetic('注音：', tile.zhuyin)}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-1">
                              {renderBracketedPhonetic('諧音：', tile.homophone)}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Tab 3: Quiz (2 Practice Questions per Level) */}
              {activeDetailTab === 'quiz' && (
                <motion.div
                  key="quiz-tab"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2"
                >
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 space-y-2.5 shadow-inner">
                    {/* 3-Day Auto-Update Notice Banner */}
                    <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/40 border border-amber-500/40 rounded-xl px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-black text-amber-300 text-xs sm:text-sm tabular-nums">
                          第 {cycleNumber} 輪題庫
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/35 tabular-nums">
                          {daysLeft}天 {hoursLeft}時 更新
                        </span>
                      </div>
                      <button
                        onClick={handleResetCurrentQuiz}
                        title="立即手動更新或重新測試題目"
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-300 text-[11px] font-bold cursor-pointer flex items-center gap-1.5 border border-slate-700 hover:border-amber-500/50 transition-all self-start sm:self-auto shrink-0 active:scale-95"
                      >
                        <RefreshCw className="w-3 h-3 text-amber-400" />
                        <span>換題</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-yellow-400" />
                        <h4 className="font-black text-sm text-yellow-300">
                          隨堂測驗
                        </h4>
                      </div>
                      {Object.keys(selectedAnswers).length === 2 && (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs font-black flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-emerald-400" />
                            <span>本輪已完成</span>
                          </span>
                          {onNextLesson && (
                            <button
                              type="button"
                              onClick={() => {
                                playClickSound();
                                onNextLesson();
                                setActiveDetailTab('svo');
                              }}
                              className="px-2.5 py-0.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <span>前往下一關 →</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 max-h-[520px] sm:max-h-[580px] overflow-y-auto pr-0.5">
                      {practiceQuestions.map((q, qIdx) => {
                        const userSel = selectedAnswers[qIdx];
                        const hasAnswered = userSel !== undefined;
                        const isCorrect = userSel === q.correctIndex;

                        return (
                          <div key={q.id || qIdx} className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2 shadow-sm">
                            <div className="text-xs sm:text-sm font-black text-slate-100 leading-snug">
                              {q.question}
                            </div>

                            <div className="grid grid-cols-1 gap-1.5">
                              {q.options.map((opt, optIdx) => {
                                let btnStyle = 'bg-slate-950 hover:bg-slate-800/90 border-slate-800 text-slate-200 hover:border-slate-700';
                                if (hasAnswered) {
                                  if (optIdx === q.correctIndex) {
                                    btnStyle = 'bg-emerald-950/90 border-emerald-500 text-emerald-100 font-bold ring-1 ring-emerald-400/80 shadow-md shadow-emerald-950/40';
                                  } else if (optIdx === userSel && !isCorrect) {
                                    btnStyle = 'bg-rose-950/90 border-rose-500 text-rose-100 font-bold ring-1 ring-rose-400/80 shadow-md shadow-rose-950/40';
                                  } else {
                                    btnStyle = 'bg-slate-950/50 border-slate-900 text-slate-500 opacity-60';
                                  }
                                }

                                // Check if option contains English text without Chinese meaning so we can assist zero-English learners
                                const hasEnglishWords = /[a-zA-Z]{2,}/.test(opt);
                                const hasChineseChars = /[\u4e00-\u9fa5]/.test(opt);
                                const cleanOptEng = cleanComponentText(opt);
                                const optHomophone = hasEnglishWords ? getMandarinPhoneticFromSentence(cleanOptEng) : '';
                                const optZhuyin = optHomophone ? convertPhoneticToZhuyin(optHomophone) : '';
                                const optWordMeanings =
                                  hasEnglishWords && !hasChineseChars
                                    ? cleanOptEng
                                        .replace(/[.,!?]/g, '')
                                        .split(/\s+/)
                                        .map((w) =>
                                          lookupWordDefinition(w)
                                            ?.translation?.replace(/\s*[\(（][^\)）]*[\)）]/g, '')
                                            .split('/')[0]
                                            ?.trim()
                                        )
                                        .filter(Boolean)
                                        .join(' · ')
                                    : '';

                                return (
                                  <div
                                    key={optIdx}
                                    role="button"
                                    tabIndex={hasAnswered ? -1 : 0}
                                    aria-disabled={hasAnswered}
                                    onClick={() => {
                                      if (!hasAnswered) handleSelectAnswer(qIdx, optIdx);
                                    }}
                                    onKeyDown={(e) => {
                                      if (!hasAnswered && (e.key === 'Enter' || e.key === ' ')) {
                                        e.preventDefault();
                                        handleSelectAnswer(qIdx, optIdx);
                                      }
                                    }}
                                    className={`px-2.5 py-2 rounded-xl border text-xs sm:text-[13px] text-left transition-all flex items-center justify-between gap-2 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${hasAnswered ? 'cursor-default' : 'cursor-pointer'} ${btnStyle}`}
                                  >
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                      <span className="w-5 h-5 rounded-md bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-[10px] font-mono font-black text-amber-300 shrink-0 mt-0.5">
                                        {String.fromCharCode(65 + optIdx)}
                                      </span>
                                      <div className="flex-1 min-w-0 space-y-0.5">
                                        <div className="font-semibold text-slate-100 break-words leading-snug whitespace-normal">
                                          {opt}
                                        </div>
                                        {hasEnglishWords && (
                                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono">
                                            {optWordMeanings && (
                                              <span className="text-cyan-300 font-bold">
                                                詞義：{optWordMeanings}
                                              </span>
                                            )}
                                            <span className="text-emerald-300/90">
                                              注音：{optZhuyin}
                                            </span>
                                            <span className="text-amber-300/90">
                                              諧音：{optHomophone}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {hasEnglishWords && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            speakEnglish(cleanOptEng, 0.78);
                                          }}
                                          title="聽選項英文慢速發音"
                                          className="px-1.5 py-1 rounded-lg bg-slate-800/90 hover:bg-amber-400/20 text-amber-300 border border-slate-700 hover:border-amber-400/40 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                          <Volume2 className="w-3 h-3" />
                                          <span>聽發音</span>
                                        </button>
                                      )}
                                      {hasAnswered && optIdx === q.correctIndex && (
                                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                      )}
                                      {hasAnswered && optIdx === userSel && !isCorrect && (
                                        <X className="w-4 h-4 text-rose-400 shrink-0" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {hasAnswered && (
                              <div className={`p-2 rounded-xl text-xs font-medium leading-relaxed animate-fade-in ${
                                isCorrect
                                  ? 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-300'
                                  : 'bg-rose-950/70 border border-rose-800/80 text-rose-300'
                              }`}>
                                <div className="font-black flex items-center gap-1 mb-0.5">
                                  {isCorrect ? '🎉 答對了！' : '❌ 解析：'}
                                </div>
                                <div>{q.explanation}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Persistent Personal Handover Note Display */}
            {currentLessonNote && (
              <div className="mt-2 bg-amber-950/40 border border-amber-500/50 rounded-xl p-2.5 flex items-start justify-between gap-2 shadow-sm">
                <div className="flex items-start gap-2 min-w-0">
                  <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200 leading-relaxed font-sans">
                    <span className="font-black text-amber-400 mr-1">個人自訂筆記：</span>
                    {currentLessonNote}
                  </div>
                </div>
                <button
                  onClick={() => {
                    playClickSound();
                    setTempNoteText(currentLessonNote);
                    setIsNoteModalOpen(true);
                  }}
                  className="text-[10px] text-amber-300 hover:text-white underline font-mono shrink-0 cursor-pointer"
                >
                  修改
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Interactive 23-Level Quick Jump Matrix Drawer */}
      <AnimatePresence>
        {isLevelPickerOpen && allLessons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="bg-slate-950/95 border border-cyan-500/40 rounded-xl p-2.5 sm:p-3 space-y-2 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-2 text-xs font-mono font-black text-cyan-300">
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                <span>選關總覽 ({allLessons.length} 關)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLevelPickerOpen(false)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
              >
                收起 ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {allLessons.map((item, idx) => {
                const isCur = idx === currentIndex;
                const isDone = visitedLessonIds.includes(item.id);
                const cleanTitle = item.scenario
                  .replace(/^🎬\s*【[^】]+】\s*/, '')
                  .replace(/^🎬\s*情境：/, '')
                  .replace(/^🎬\s*/, '');
                return (
                  <button
                    key={item.id || idx}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      if (onSelectLessonIndex) onSelectLessonIndex(idx);
                      setIsLevelPickerOpen(false);
                    }}
                    className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-0.5 ${
                      isCur
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                        : isDone
                        ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-bold tabular-nums">
                      <span>關卡 {idx + 1}</span>
                      {isDone && !isCur && <span className="text-emerald-400">✓ 已讀</span>}
                      {isCur && <span>當前</span>}
                    </div>
                    <div className="text-[11px] font-bold break-words leading-tight">
                      {cleanTitle}
                    </div>
                    <div className={`text-[10px] font-mono break-words ${isCur ? 'text-slate-900' : 'text-cyan-400/90'}`}>
                      {item.english_sentence}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SM-2 Memory Curve Self-Rating Strip */}
      {onRateMemory && (
        <div className="px-3.5 py-2 sm:px-4 bg-slate-950/80 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300 tabular-nums">
            <span className="font-bold text-amber-300">記憶曲線評估</span>
            <span className="text-slate-600">·</span>
            <span className={srsState && srsState.nextReviewAt <= Date.now() ? 'text-amber-300 font-bold' : 'text-cyan-300'}>
              {srsState ? formatNextReviewLabel(srsState) : '尚未評級（新句型）'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 sm:gap-1.5 sm:flex sm:items-center w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onRateMemory(lesson.id, 'hard');
              }}
              className={`min-h-[34px] px-1.5 sm:px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-all active:scale-95 text-center leading-tight ${
                srsState?.lastRating === 'hard'
                  ? 'bg-rose-500/25 border-rose-400 text-rose-200 font-black'
                  : 'bg-slate-900 hover:bg-rose-950/60 border-slate-700/80 hover:border-rose-500/50 text-rose-300'
              }`}
              title="標記生疏：立即排入待複習清單"
            >
              生疏 · 複習
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onRateMemory(lesson.id, 'good');
              }}
              className={`min-h-[34px] px-1.5 sm:px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-all active:scale-95 text-center leading-tight tabular-nums ${
                srsState?.lastRating === 'good'
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-black'
                  : 'bg-slate-900 hover:bg-cyan-950/60 border-slate-700/80 hover:border-cyan-500/50 text-cyan-300'
              }`}
              title="標記尚可：依 SM-2 曲線排程下次複習"
            >
              尚可 · 1天後
            </button>
            <button
              type="button"
              onClick={() => {
                playSuccessChime();
                onRateMemory(lesson.id, 'easy');
              }}
              className={`min-h-[34px] px-1.5 sm:px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-all active:scale-95 text-center leading-tight tabular-nums ${
                srsState?.lastRating === 'easy'
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 font-black'
                  : 'bg-slate-900 hover:bg-emerald-950/60 border-slate-700/80 hover:border-emerald-500/50 text-emerald-300'
              }`}
              title="標記秒懂：大幅拉長複習週期"
            >
              秒懂 · 4天後
            </button>
          </div>
        </div>
      )}

      {/* Level Navigation Footer: Mobile Cleanroom Glove Swipe Trackpad + Desktop Controls */}
      {(onNextLesson || onPrevLesson) && (
        <div className="mt-auto px-3 py-2.5 sm:px-4 bg-slate-950/95 border-t border-slate-800/90">
          {/* 行動版無塵室手套友善滑動觸控軌 (取代傳統左右箭頭按鈕) */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={resetSwipeState}
            role="region"
            aria-label="無塵室手套滑動換關觸控區：向右滑動上一關，向左滑動下一關"
            className={`md:hidden relative w-full min-h-[46px] rounded-xl border px-3 py-1.5 flex items-center justify-between select-none touch-pan-y overflow-hidden transition-colors ${
              swipeActionReady === 'next'
                ? 'bg-cyan-950/90 border-cyan-400 shadow-inner'
                : swipeActionReady === 'prev'
                ? 'bg-amber-950/90 border-amber-400 shadow-inner'
                : 'bg-slate-900/95 border-slate-700/90'
            }`}
          >
            {/* Left Swipe Runway Hint (向右滑：上一關) */}
            <div
              className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-mono whitespace-nowrap transition-all pointer-events-none ${
                swipeOffsetX > 8 || swipeActionReady === 'prev'
                  ? 'text-amber-300 font-black scale-105'
                  : 'text-slate-400 font-bold'
              }`}
            >
              <span className="text-amber-400 font-black tracking-tighter">⟪</span>
              <span>{swipeActionReady === 'prev' ? '放開上一關' : '右滑上一關'}</span>
            </div>

            {/* Center Interactive Sliding Pill (跟隨手指位移 + 點擊展開選關) */}
            <button
              type="button"
              onClick={() => {
                if (Math.abs(swipeOffsetX) < 6 && typeof currentIndex === 'number' && typeof totalLessons === 'number') {
                  playClickSound();
                  setIsLevelPickerOpen((prev) => !prev);
                }
              }}
              style={{
                transform: `translate3d(${swipeOffsetX * 0.65}px, 0, 0)`,
                transition: swipeOffsetX === 0 ? 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
              }}
              className={`z-10 min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] sm:text-xs font-mono font-black tabular-nums flex items-center gap-1 shadow-md cursor-pointer active:scale-95 whitespace-nowrap ${
                swipeActionReady === 'next'
                  ? 'bg-cyan-400 text-slate-950 border-cyan-200'
                  : swipeActionReady === 'prev'
                  ? 'bg-amber-400 text-slate-950 border-amber-200'
                  : 'bg-slate-950 text-cyan-300 border-cyan-500/45'
              }`}
              title="左右滑動切換關卡，或點此展開關卡總覽"
            >
              {typeof currentIndex === 'number' && typeof totalLessons === 'number' ? (
                <>
                  <span>
                    關卡 <strong className={swipeActionReady ? 'text-slate-950' : 'text-amber-300'}>{currentIndex + 1}</strong>/{totalLessons}
                  </span>
                  <span className="text-[10px] opacity-80">{isLevelPickerOpen ? '▴' : '▾'}</span>
                </>
              ) : (
                <span>手套滑動換關</span>
              )}
            </button>

            {/* Right Swipe Runway Hint (向左滑：下一關) */}
            <div
              className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-mono whitespace-nowrap transition-all pointer-events-none ${
                swipeOffsetX < -8 || swipeActionReady === 'next'
                  ? 'text-cyan-300 font-black scale-105'
                  : 'text-slate-400 font-bold'
              }`}
            >
              <span>{swipeActionReady === 'next' ? '放開下一關' : '左滑下一關'}</span>
              <span className="text-cyan-400 font-black tracking-tighter">⟫</span>
            </div>
          </div>

          {/* 桌面版導覽列與鍵盤快捷鍵提示 */}
          <div className="hidden md:flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {onPrevLesson && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onPrevLesson();
                  }}
                  className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer active:scale-95 whitespace-nowrap"
                  title="上一關 (←)"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>上一關</span>
                </button>
              )}
            </div>

            {/* Integrated Compact Shortcuts Hint (Center Aligned) */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800/60">
              <span className="flex items-center gap-1 text-cyan-400 font-bold">
                <Keyboard className="w-3 h-3" />
                <span>快捷鍵:</span>
              </span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded text-[9px] font-bold">Space</kbd> 朗讀</span>
              <span className="text-slate-700">·</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 text-indigo-300 rounded text-[9px] font-bold">S</kbd> SVO</span>
              <span className="text-slate-700">·</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 text-emerald-300 rounded text-[9px] font-bold">Q</kbd> 測驗</span>
              {onNextLesson && (
                <>
                  <span className="text-slate-700">·</span>
                  <span><kbd className="px-1.5 py-0.5 bg-slate-800 text-cyan-300 rounded text-[9px] font-bold">N / →</kbd> 下一關</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {typeof currentIndex === 'number' && typeof totalLessons === 'number' && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsLevelPickerOpen((prev) => !prev);
                  }}
                  className="min-h-[38px] text-xs text-slate-200 hover:text-white font-mono font-bold bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-cyan-500/50 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 tabular-nums"
                  title="點擊展開全關卡快速跳轉選單"
                >
                  <span>關卡 <strong className="text-cyan-300 font-black">{currentIndex + 1}</strong> / {totalLessons}</span>
                  <span className="text-[10px] text-amber-400">{isLevelPickerOpen ? '▴' : '▾'}</span>
                </button>
              )}
              {onNextLesson && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onNextLesson();
                  }}
                  className="min-h-[38px] flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-cyan-500/20 transition-all cursor-pointer whitespace-nowrap"
                  title="前往下一關 (→ 或 N)"
                >
                  <span>下一關</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.4] shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lesson Personal Note Modal */}
      <AnimatePresence>
        {isNoteModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="關卡個人筆記與實務備忘"
            onClick={() => setIsNoteModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              className="w-full max-w-lg bg-slate-900 border-2 border-amber-400/80 rounded-3xl p-5 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    <StickyNote className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-100 font-mono">
                      關卡個人筆記與實務備忘
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono truncate block max-w-xs">
                      {lesson.scenario}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="關閉筆記視窗"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-amber-300 block">
                  輸入個人記憶口訣、交接備忘或無塵室特殊 SOP：
                </label>
                <textarea
                  value={tempNoteText}
                  onChange={(e) => setTempNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveLessonNote();
                    }
                  }}
                  placeholder="例：交接時記得提醒下一班確認 RF match box 溫度；或諧音口訣記法...（Ctrl+Enter 快速儲存）"
                  rows={4}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-400 leading-relaxed resize-none font-sans"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <div>
                  {currentLessonNote && (
                    <button
                      type="button"
                      onClick={handleClearLessonNote}
                      className="px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 hover:bg-rose-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>清除筆記</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNoteModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLessonNote}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-400/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>儲存筆記</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export const LessonCard = React.memo(LessonCardComponent);

