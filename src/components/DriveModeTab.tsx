import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Lesson } from '../types';
import {
  Car,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Clock,
  Radio,
  Bookmark,
  BookmarkCheck,
  Zap,
  Moon,
  Sun,
  Mic,
  Repeat,
  Volume2,
  Sparkles,
  Settings2,
  RefreshCw,
  Gauge,
  AlertTriangle,
  Activity,
  HelpCircle,
  ListMusic,
  Search,
  X,
  Keyboard,
  Check,
  Shuffle,
  Languages,
  Cloud,
  Eye,
  EyeOff,
  Brain,
  CheckCircle2,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PlaylistItem,
  AudioPlaybackMode,
  DRIVE_PLAYBACK_MODES,
  buildDrivePlaylist,
  getCleanSpeechSegments,
  cleanScenarioLabel,
  speakAsync,
  clearSpeechQueue,
  sleepWithCancel
} from '../utils/drivingAudioPlayer';
import {
  findStandardEnglishVoice,
  findTaiwanChineseVoice,
  resetSpeechEngine,
  speakEnglish,
  unlockAudioContext,
  primeMobileSpeechEngine,
  isAnySpeechPlaying,
  globalAudioScheduler,
  getPreferredVoiceEngine,
  setPreferredVoiceEngine,
  VoiceEngineMode
} from '../utils/speech';
import {
  getAudioCacheStats,
  clearAllAudioCache
} from '../utils/audioCacheDB';
import { playClickSound, playSuccessChime, playWaferSnapSound, playLaserScanSound } from '../utils/audioEffects';
import { prefetchSpeechText, prefetchCloudAudioBatch, CloudAudioBatchProgress } from '../utils/speechPrefetcher';
import {
  startAudioKeepAlive,
  stopAudioKeepAlive,
  updateCarMediaSession,
  pauseCarMediaSession
} from '../utils/audioKeepAlive';
import { VoiceSettingsModal } from './VoiceSettingsModal';
import { DriveTutorialModal } from './DriveTutorialModal';
import { getSentenceKKPhonetic } from '../utils/wordDictionary';
import { loadSrsMap, isLessonDueForReview, getDueLessonsCount, rateLessonMemory, formatNextReviewLabel, SrsCardState, MemoryRating } from '../utils/srsScheduler';
import { queueAutoServerSync } from '../utils/serverSyncService';

interface DriveModeTabProps {
  lessons: Lesson[];
  speechSpeed: number;
  setSpeechSpeed?: (speed: number) => void;
  bookmarkedLessons?: Lesson[];
  onToggleBookmark?: (lesson: Lesson) => void;
}

type PacingMode = 'compact' | 'standard' | 'relaxed';
type DriveRepeatMode = 'all' | 'one' | 'shuffle';

const DRIVE_PREFS_STORAGE_KEY = 'fse_drive_prefs_v2';

interface StoredDrivePrefs {
  playbackMode?: AudioPlaybackMode;
  repeatMode?: DriveRepeatMode;
  singleRepeatCount?: 1 | 2 | 3;
  speedMultiplier?: number;
  pacingMode?: PacingMode;
  selectedCategory?: string;
  includeChineseCue?: boolean;
  blindMode?: boolean;
  currentIndex?: number;
}

function loadDrivePrefs(): StoredDrivePrefs {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DRIVE_PREFS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredDrivePrefs;
  } catch {}
  return {};
}

export const DriveModeTab: React.FC<DriveModeTabProps> = ({
  lessons,
  speechSpeed,
  setSpeechSpeed,
  bookmarkedLessons = [],
  onToggleBookmark
}) => {
  const initialPrefs = useMemo(() => loadDrivePrefs(), []);

  // Player Configuration State
  const [playbackMode, setPlaybackMode] = useState<AudioPlaybackMode>(
    initialPrefs.playbackMode && DRIVE_PLAYBACK_MODES.some((m) => m.id === initialPrefs.playbackMode)
      ? initialPrefs.playbackMode
      : 'full_flow'
  );
  const [repeatMode, setRepeatMode] = useState<DriveRepeatMode>(
    initialPrefs.repeatMode === 'one' || initialPrefs.repeatMode === 'shuffle' ? initialPrefs.repeatMode : 'all'
  );
  const [singleRepeatCount, setSingleRepeatCount] = useState<1 | 2 | 3>(
    initialPrefs.singleRepeatCount === 2 || initialPrefs.singleRepeatCount === 3 ? initialPrefs.singleRepeatCount : 1
  );
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(
    typeof initialPrefs.speedMultiplier === 'number' ? initialPrefs.speedMultiplier : 0.85
  );
  const [pacingMode, setPacingMode] = useState<PacingMode>(
    initialPrefs.pacingMode === 'compact' || initialPrefs.pacingMode === 'relaxed' ? initialPrefs.pacingMode : 'standard'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    try {
      const pending = localStorage.getItem('fse_drive_pending_category');
      if (pending) {
        localStorage.removeItem('fse_drive_pending_category');
        return pending;
      }
    } catch {}
    return initialPrefs.selectedCategory || 'all';
  });
  const [includeChineseCue, setIncludeChineseCue] = useState<boolean>(
    typeof initialPrefs.includeChineseCue === 'boolean' ? initialPrefs.includeChineseCue : true
  );
  const [blindMode, setBlindMode] = useState<boolean>(Boolean(initialPrefs.blindMode));
  const [isBlindRevealed, setIsBlindRevealed] = useState<boolean>(false);
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngineMode>(() => getPreferredVoiceEngine());
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [remainingSleepSeconds, setRemainingSleepSeconds] = useState<number | null>(null);
  const [isNightMode, setIsNightMode] = useState<boolean>(true);
  const [isAutoAdvance, setIsAutoAdvance] = useState<boolean>(true);

  // Runtime Playback State
  const [currentIndex, setCurrentIndex] = useState<number>(
    typeof initialPrefs.currentIndex === 'number' && initialPrefs.currentIndex >= 0 ? initialPrefs.currentIndex : 0
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [currentStepPrompt, setCurrentStepPrompt] = useState<string>('準備就緒，點擊下方「連播」開始英文精聽');
  const [isEchoCountdown, setIsEchoCountdown] = useState<number | null>(null);
  const [bookmarkToast, setBookmarkToast] = useState<string | null>(null);
  const [testVoiceInfo, setTestVoiceInfo] = useState<string | null>(null);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isTracklistOpen, setIsTracklistOpen] = useState<boolean>(false);
  const [tracklistSearch, setTracklistSearch] = useState<string>('');
  const [showDriveConfig, setShowDriveConfig] = useState<boolean>(false);

  // IndexedDB Cache State
  const [cachedSnippetsCount, setCachedSnippetsCount] = useState<number>(0);
  const [playableBlobCount, setPlayableBlobCount] = useState<number>(0);
  const [isCacheWarm, setIsCacheWarm] = useState<boolean>(false);
  const [isPreloadingAudio, setIsPreloadingAudio] = useState<boolean>(false);
  const [preloadProgress, setPreloadProgress] = useState<CloudAudioBatchProgress | null>(null);
  const preloadAbortRef = useRef<AbortController | null>(null);

  // Visualizer & Speech Health Diagnostics State
  const [speechEnergy, setSpeechEnergy] = useState<number[]>(new Array(24).fill(10));
  const [isSynthesizerSpeaking, setIsSynthesizerSpeaking] = useState<boolean>(false);
  const [engineHealthError, setEngineHealthError] = useState<string | null>(null);

  // Concurrency Session Ref & Mutex Lock
  const sessionCounterRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const currentIndexRef = useRef<number>(currentIndex);
  const isTransitioningRef = useRef<boolean>(false);
  const isEchoWaitingRef = useRef<boolean>(false);
  const autoRecoveryAttemptsRef = useRef<number>(0);
  const wakeLockRef = useRef<any>(null);
  const rafVisualizerIdRef = useRef<number | null>(null);
  const speechSpeakingRef = useRef<boolean>(false);
  const lastActiveTimestampRef = useRef<number>(Date.now());
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const testVoiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live config refs so runLoop always reflects user changes during playback
  const playbackModeRef = useRef<AudioPlaybackMode>(playbackMode);
  playbackModeRef.current = playbackMode;
  const repeatModeRef = useRef<DriveRepeatMode>(repeatMode);
  repeatModeRef.current = repeatMode;
  const singleRepeatCountRef = useRef<1 | 2 | 3>(singleRepeatCount);
  singleRepeatCountRef.current = singleRepeatCount;
  const speedMultiplierRef = useRef<number>(speedMultiplier);
  speedMultiplierRef.current = speedMultiplier;
  const includeChineseCueRef = useRef<boolean>(includeChineseCue);
  includeChineseCueRef.current = includeChineseCue;
  const isAutoAdvanceRef = useRef<boolean>(isAutoAdvance);
  isAutoAdvanceRef.current = isAutoAdvance;

  // Persist user preferences cleanly
  useEffect(() => {
    try {
      const payload: StoredDrivePrefs = {
        playbackMode,
        repeatMode,
        singleRepeatCount,
        speedMultiplier,
        pacingMode,
        selectedCategory,
        includeChineseCue,
        blindMode,
        currentIndex,
      };
      localStorage.setItem(DRIVE_PREFS_STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [playbackMode, repeatMode, singleRepeatCount, speedMultiplier, pacingMode, selectedCategory, includeChineseCue, blindMode, currentIndex]);

  // Listen for voice engine changes and external category jumps
  useEffect(() => {
    const syncEngine = () => setVoiceEngine(getPreferredVoiceEngine());
    const handleCategoryJump = (e: Event) => {
      const cat = (e as CustomEvent)?.detail?.category;
      if (typeof cat === 'string' && cat) {
        setSelectedCategory(cat);
        currentIndexRef.current = 0;
        setCurrentIndex(0);
      }
    };
    window.addEventListener('fse-voice-changed', syncEngine);
    window.addEventListener('fse-drive-select-category', handleCategoryJump);
    return () => {
      window.removeEventListener('fse-voice-changed', syncEngine);
      window.removeEventListener('fse-drive-select-category', handleCategoryJump);
    };
  }, []);

  // Refresh cache stats
  const refreshCacheStats = async () => {
    try {
      const stats = await getAudioCacheStats();
      setCachedSnippetsCount(stats.count);
      setPlayableBlobCount(stats.playableBlobCount);
      setIsCacheWarm(stats.playableBlobCount > 0 || stats.count > 0);
    } catch {}
  };

  useEffect(() => {
    refreshCacheStats();
    return () => {
      preloadAbortRef.current?.abort();
    };
  }, []);

  // Keep refs in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (isPlaying) {
      lastActiveTimestampRef.current = Date.now();
    }
  }, [isPlaying]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
    setIsBlindRevealed(false);
  }, [currentIndex]);

  const [srsMap, setSrsMap] = useState<Record<string, SrsCardState>>(() => loadSrsMap());

  useEffect(() => {
    const refreshSrs = () => setSrsMap(loadSrsMap());
    window.addEventListener('fse-srs-updated', refreshSrs);
    window.addEventListener('storage', refreshSrs);
    return () => {
      window.removeEventListener('fse-srs-updated', refreshSrs);
      window.removeEventListener('storage', refreshSrs);
    };
  }, []);

  const dueCount = useMemo(() => getDueLessonsCount(lessons, srsMap), [lessons, srsMap]);

  // Build full raw playlist
  const allPlaylistItems: PlaylistItem[] = useMemo(() => {
    return buildDrivePlaylist(lessons);
  }, [lessons]);

  // Filter playlist by category, due review status, or bookmarks
  const playlist: PlaylistItem[] = useMemo(() => {
    if (selectedCategory === 'due') {
      return allPlaylistItems.filter((item) => isLessonDueForReview(item.lessonId, srsMap));
    }
    if (selectedCategory === 'bookmarks') {
      const bookmarkedIds = new Set(bookmarkedLessons.map((b) => b.id));
      return allPlaylistItems.filter((item) => bookmarkedIds.has(item.lessonId));
    }
    if (selectedCategory === 'all') {
      return allPlaylistItems;
    }
    return allPlaylistItems.filter((item) => {
      const text = `${item.scenario} ${item.english} ${item.chinese}`.toLowerCase();
      if (selectedCategory === 'aoi') return text.includes('aoi') || text.includes('substrate') || text.includes('bump') || text.includes('underfill') || text.includes('golden sample') || text.includes('sucker') || text.includes('roller') || text.includes('jig') || text.includes('ocv') || text.includes('ocr') || text.includes('光學') || text.includes('基板') || text.includes('錫球') || text.includes('公開單元');
      if (selectedCategory === 'foup') return text.includes('foup') || text.includes('arm') || text.includes('robot') || text.includes('傳送') || text.includes('晶圓');
      if (selectedCategory === 'vacuum') return text.includes('vacuum') || text.includes('chamber') || text.includes('pressure') || text.includes('真空') || text.includes('腔體');
      if (selectedCategory === 'rf') return text.includes('rf') || text.includes('plasma') || text.includes('match') || text.includes('射頻') || text.includes('電漿');
      if (selectedCategory === 'mfc') return text.includes('mfc') || text.includes('gas') || text.includes('flow') || text.includes('valve') || text.includes('流量') || text.includes('閥門');
      if (selectedCategory === 'alarm') return text.includes('alarm') || text.includes('error') || text.includes('hold') || text.includes('report') || text.includes('警報') || text.includes('交接');
      return true;
    });
  }, [allPlaylistItems, selectedCategory, bookmarkedLessons, srsMap]);

  const playlistRef = useRef<PlaylistItem[]>(playlist);
  playlistRef.current = playlist;

  // Ensure index validity
  const safeCurrentIndex = useMemo(() => {
    if (playlist.length === 0) return 0;
    return Math.min(Math.max(0, currentIndex), playlist.length - 1);
  }, [currentIndex, playlist.length]);

  useEffect(() => {
    if (playlist.length === 0 && isPlayingRef.current) {
      stopPlaybackRef.current();
    } else if (playlist.length > 0 && currentIndex >= playlist.length) {
      setCurrentIndex(playlist.length - 1);
    }
  }, [playlist.length, currentIndex]);

  const safeCurrentIndexRef = useRef<number>(safeCurrentIndex);
  safeCurrentIndexRef.current = safeCurrentIndex;

  const currentItem = playlist[safeCurrentIndex];

  // Pause duration based on pacing mode
  const pauseDuration = useMemo(() => {
    if (pacingMode === 'compact') return 500;
    if (pacingMode === 'standard') return 1200;
    return 2000;
  }, [pacingMode]);

  const pauseDurationRef = useRef<number>(pauseDuration);
  pauseDurationRef.current = pauseDuration;

  /**
   * 1. requestAnimationFrame 僅驅動前景 24 頻段聲波視覺化（避免背景分頁/鎖屏 rAF 暫停引發誤判停滯）
   * 2. 獨立的 2000ms 健康度巡檢 + visibilitychange 喚醒校正：僅於前景真正完全靜默逾時才觸發平滑自癒
   */
  useEffect(() => {
    let animFrame: number;
    let tickCount = 0;

    const monitorLoop = () => {
      tickCount++;
      const synthSpeaking = isAnySpeechPlaying();
      speechSpeakingRef.current = !!synthSpeaking;
      setIsSynthesizerSpeaking(!!synthSpeaking);

      if (synthSpeaking || isEchoWaitingRef.current) {
        lastActiveTimestampRef.current = Date.now();
        if (synthSpeaking) {
          autoRecoveryAttemptsRef.current = 0;
          setEngineHealthError((prev) => (prev ? null : prev));
        }
      }

      if (synthSpeaking) {
        const bars = Array.from({ length: 24 }, (_, i) => {
          const wave = Math.sin(tickCount * 0.18 + i * 0.35);
          const noise = Math.random() * 0.25;
          const height = Math.max(16, Math.min(100, (wave * 0.45 + 0.55 + noise) * 92));
          return height;
        });
        setSpeechEnergy(bars);
      } else {
        setSpeechEnergy((prev) => prev.map((val) => Math.max(8, val * 0.85)));
      }

      animFrame = requestAnimationFrame(monitorLoop);
    };

    const handleVisibilityRefresh = () => {
      // 從背景分頁或手機鎖屏返回時先重置計時基準，杜絕因 rAF 休眠超過 22 秒被誤判為語音卡死而硬中斷
      if (document.visibilityState === 'visible') {
        lastActiveTimestampRef.current = Date.now();
      }
    };

    const healthCheckInterval = setInterval(() => {
      const synthSpeaking = isAnySpeechPlaying();
      const schedulerState = globalAudioScheduler.getState();
      const schedulerBusyPhase =
        schedulerState.enginePhase === 'BUFFERING' ||
        schedulerState.enginePhase === 'PLAYING_CLOUD' ||
        schedulerState.enginePhase === 'PLAYING_NATIVE' ||
        schedulerState.enginePhase === 'RECOVERING' ||
        schedulerState.enginePhase === 'INTER_SENTENCE_BUFFER';

      if (synthSpeaking || schedulerBusyPhase || isEchoWaitingRef.current) {
        lastActiveTimestampRef.current = Date.now();
        if (synthSpeaking) {
          autoRecoveryAttemptsRef.current = 0;
          setEngineHealthError((prev) => (prev ? null : prev));
        }
        return;
      }

      // 僅在播放中且整個語音排程器完全處於 IDLE 無動作逾 24 秒才判定失聯並自動重啟
      if (isPlayingRef.current && document.visibilityState === 'visible') {
        const idleDuration = Date.now() - lastActiveTimestampRef.current;
        if (idleDuration > 24000) {
          console.warn("[SpeechDiagnostic] 語音通道逾時停滯，自動重新校準中...");
          lastActiveTimestampRef.current = Date.now();
          if (autoRecoveryAttemptsRef.current < 3) {
            autoRecoveryAttemptsRef.current += 1;
            setEngineHealthError(`語音通道逾時停滯（卡在第 ${currentIndexRef.current + 1} 句），已自動校準並恢復連播`);
            resetSpeechEngine();
            unlockAudioContext();
            primeMobileSpeechEngine();
            if (transitionTimerRef.current) {
              clearTimeout(transitionTimerRef.current);
              transitionTimerRef.current = null;
            }
            const recoverIdx = safeCurrentIndexRef.current;
            sessionCounterRef.current++;
            transitionTimerRef.current = setTimeout(() => {
              transitionTimerRef.current = null;
              startPlaybackRef.current(recoverIdx);
            }, 180);
          } else {
            autoRecoveryAttemptsRef.current = 0;
            setEngineHealthError(`語音通道持續逾時（第 ${currentIndexRef.current + 1} 句），已安全暫停並重置，請點「連播」或「試聽」確認音效`);
            stopPlaybackRef.current();
          }
        }
      }
    }, 2000);

    document.addEventListener('visibilitychange', handleVisibilityRefresh, { passive: true });
    animFrame = requestAnimationFrame(monitorLoop);
    rafVisualizerIdRef.current = animFrame;

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      clearInterval(healthCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    };
  }, []);

  // Prefetch speech for upcoming tracks in IndexedDB
  useEffect(() => {
    if (playlist.length === 0) return;
    const nextIdx1 = (safeCurrentIndex + 1) % playlist.length;
    const nextIdx2 = (safeCurrentIndex + 2) % playlist.length;
    const nextItem1 = playlist[nextIdx1];
    const nextItem2 = playlist[nextIdx2];

    if (nextItem1) {
      if (nextItem1.english) prefetchSpeechText(nextItem1.english, 'en-US', speechSpeed).catch(() => {});
      if (nextItem1.chinese) prefetchSpeechText(nextItem1.chinese, 'zh-TW', 1.0).catch(() => {});
    }
    if (nextItem2) {
      if (nextItem2.english) prefetchSpeechText(nextItem2.english, 'en-US', speechSpeed).catch(() => {});
      if (nextItem2.chinese) prefetchSpeechText(nextItem2.chinese, 'zh-TW', 1.0).catch(() => {});
    }

    const statsTimer = setTimeout(() => {
      refreshCacheStats();
    }, 1200);
    return () => clearTimeout(statsTimer);
  }, [safeCurrentIndex, playlist, speechSpeed]);

  // Screen WakeLock handling
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch {}
    };

    if (isPlaying) {
      requestWakeLock();
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [isPlaying]);

  // Sleep timer countdown (pure state tick)
  useEffect(() => {
    if (remainingSleepSeconds === null || remainingSleepSeconds <= 0 || !isPlaying) return;
    const interval = setInterval(() => {
      setRemainingSleepSeconds((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSleepSeconds !== null && remainingSleepSeconds > 0, isPlaying]);

  // Trigger stop cleanly when sleep timer hits 0 (no side effects inside state updater)
  useEffect(() => {
    if (remainingSleepSeconds === 0 && isPlaying) {
      stopPlayback();
      setSleepTimerMinutes(null);
      setRemainingSleepSeconds(null);
    }
  }, [remainingSleepSeconds, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionCounterRef.current++;
      isPlayingRef.current = false;
      isEchoWaitingRef.current = false;
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      if (testVoiceTimerRef.current) {
        clearTimeout(testVoiceTimerRef.current);
        testVoiceTimerRef.current = null;
      }
      clearSpeechQueue();
      stopAudioKeepAlive();
      pauseCarMediaSession();
    };
  }, []);

  /**
   * 播放單句內容的音訊完整流程（全面「英文學習優先」設計，徹底修正只播翻譯與空字串 Bug）
   */
  const playItemSequence = async (item: PlaylistItem, sessionId: number): Promise<boolean> => {
    const isCancelled = () => sessionCounterRef.current !== sessionId || !isPlayingRef.current;

    if (!item || isCancelled()) return false;

    updateCarMediaSession(
      {
        title: item.english,
        artist: `${cleanScenarioLabel(item.scenario)} • ${item.chinese}`,
        album: '晶圓廠無塵室英文隨身聽'
      },
      {
        onPlay: () => {
          if (!isPlayingRef.current) togglePlayPause();
        },
        onPause: () => {
          if (isPlayingRef.current) togglePlayPause();
        },
        onNext: () => handleNextTrack(),
        onPrev: () => handlePrevTrack()
      }
    );

    const activeSpeed = speedMultiplierRef.current;
    const slowSpeed = Math.max(0.7, Number((activeSpeed * 0.84).toFixed(2)));
    const normalSpeed = activeSpeed;
    const p = pauseDurationRef.current;
    const mode = playbackModeRef.current;
    const withChinese = includeChineseCueRef.current;

    const {
      english: rawCleanEnglish,
      chinese: rawCleanChinese,
      focusEnglish
    } = getCleanSpeechSegments(item);

    const hasDistinctFocus =
      Boolean(focusEnglish) &&
      focusEnglish.toLowerCase() !== rawCleanEnglish.toLowerCase();

    try {
      // 模式 1: 英文精聽五步（先慢速英文 ➔ 核心字彙焦點 ➔ 簡潔中文理解 ➔ 節奏回想 ➔ 原速美語強化收尾）
      if (mode === 'full_flow') {
        // Step 1: 慢速清晰英文（首聽抓準音節與字尾子音）
        setCurrentStepIndex(1);
        setCurrentStepPrompt('🎧 慢速清晰英文 — 抓準每個單字發音');
        await speakAsync(rawCleanEnglish, 'en-US', slowSpeed, isCancelled, Math.max(350, p * 0.65));
        if (isCancelled()) return false;

        // Step 2: 核心動作與目標字詞焦點（或字詞重複精聽）
        setCurrentStepIndex(2);
        if (hasDistinctFocus) {
          setCurrentStepPrompt(`🎯 核心焦點字彙：${focusEnglish}`);
          await speakAsync(focusEnglish, 'en-US', slowSpeed, isCancelled, Math.max(300, p * 0.55));
        } else {
          setCurrentStepPrompt('🎯 關鍵發音細節再聽一遍');
          await speakAsync(rawCleanEnglish, 'en-US', Math.max(0.7, slowSpeed - 0.05), isCancelled, Math.max(300, p * 0.55));
        }
        if (isCancelled()) return false;

        // Step 3: 簡潔中文點撥（不唸「中文意思是：」廢話，關閉中文輔助時則轉為輕量停頓思考）
        setCurrentStepIndex(3);
        if (withChinese && rawCleanChinese) {
          setCurrentStepPrompt(`💡 中文理解：${item.chinese}`);
          await speakAsync(rawCleanChinese, 'zh-TW', 1.0, isCancelled, Math.max(350, p * 0.6));
          if (isCancelled()) return false;
        } else {
          setCurrentStepPrompt('🧠 默念句意與畫面連結');
          await sleepWithCancel(Math.max(450, p * 0.6), isCancelled);
          if (isCancelled()) return false;
        }

        // Step 4: 主動口語默念留白（大腦主動喚起英文輸出）
        setCurrentStepIndex(4);
        setCurrentStepPrompt('🗣️ 預備跟讀節奏 — 跟著在心中複誦');
        await sleepWithCancel(Math.max(550, Math.round(p * 0.75)), isCancelled);
        if (isCancelled()) return false;

        // Step 5: 原速自然美語強化（結尾一定停留在英文，形成耳朵定型記憶）
        setCurrentStepIndex(5);
        setCurrentStepPrompt('⚡ 母語原速強化定型');
        await speakAsync(rawCleanEnglish, 'en-US', normalSpeed, isCancelled, Math.max(500, p * 1.1));
        if (isCancelled()) return false;
      }

      // 模式 2: 開口跟讀 3s 特訓 (Echo Mode)
      else if (mode === 'follow_repeat') {
        // Step 1: 慢速英文示範
        setCurrentStepIndex(1);
        setCurrentStepPrompt('🎧 慢速美語示範');
        await speakAsync(rawCleanEnglish, 'en-US', slowSpeed, isCancelled, 450);
        if (isCancelled()) return false;

        // Step 2: 簡潔中文重點提示
        setCurrentStepIndex(2);
        if (withChinese && rawCleanChinese) {
          setCurrentStepPrompt(`💡 重點句意：${item.chinese}`);
          await speakAsync(rawCleanChinese, 'zh-TW', 1.05, isCancelled, 400);
          if (isCancelled()) return false;
        } else {
          setCurrentStepPrompt('🎯 關鍵語塊整理');
          await speakAsync(hasDistinctFocus ? focusEnglish : rawCleanEnglish, 'en-US', slowSpeed, isCancelled, 400);
          if (isCancelled()) return false;
        }

        // Step 3: 原速示範準備跟讀
        setCurrentStepIndex(3);
        setCurrentStepPrompt('⚡ 原速示範，準備開口跟讀');
        await speakAsync(rawCleanEnglish, 'en-US', normalSpeed, isCancelled, 300);
        if (isCancelled()) return false;

        // Step 4: 留白 3 秒跟讀倒數
        setCurrentStepIndex(4);
        setCurrentStepPrompt('🎤 請大聲唸出這句英文！');
        playClickSound();
        isEchoWaitingRef.current = true;
        try {
          for (let cd = 3; cd >= 1; cd--) {
            setIsEchoCountdown(cd);
            lastActiveTimestampRef.current = Date.now();
            await sleepWithCancel(1000, isCancelled);
            if (isCancelled()) {
              setIsEchoCountdown(null);
              return false;
            }
          }
        } finally {
          isEchoWaitingRef.current = false;
        }
        setIsEchoCountdown(null);

        // Step 5: 原速複誦確認
        setCurrentStepIndex(5);
        setCurrentStepPrompt('✓ 原速美語確認對音');
        await speakAsync(rawCleanEnglish, 'en-US', normalSpeed, isCancelled, Math.max(450, p));
        if (isCancelled()) return false;
      }

      // 模式 3: 英 ➔ 中 ➔ 英 三明治強化（先聽英文 ➔ 簡潔理解 ➔ 最後停在原速英文）
      else if (mode === 'bilingual') {
        setCurrentStepIndex(1);
        setCurrentStepPrompt('🎧 清晰英文首聽');
        await speakAsync(rawCleanEnglish, 'en-US', slowSpeed, isCancelled, Math.max(300, p * 0.55));
        if (isCancelled()) return false;

        setCurrentStepIndex(2);
        if (withChinese && rawCleanChinese) {
          setCurrentStepPrompt(`💡 中文點撥：${item.chinese}`);
          await speakAsync(rawCleanChinese, 'zh-TW', 1.05, isCancelled, Math.max(280, p * 0.5));
          if (isCancelled()) return false;
        } else {
          setCurrentStepPrompt('🧠 句意消化緩衝');
          await sleepWithCancel(Math.max(400, p * 0.5), isCancelled);
          if (isCancelled()) return false;
        }

        setCurrentStepIndex(3);
        setCurrentStepPrompt('⚡ 原速美語定型收尾');
        await speakAsync(rawCleanEnglish, 'en-US', normalSpeed, isCancelled, Math.max(450, p));
        if (isCancelled()) return false;
      }

      // 模式 4: SVO 句構拆解精煉（正確抽出純英文與簡潔中文詞意，最後原速串接）
      else if (mode === 'svo_breakdown') {
        const { subjectEn, subjectZh, verbEn, verbZh, bridgeEn, objectEn, objectZh } = item.cleanSvo;

        setCurrentStepIndex(1);
        setCurrentStepPrompt(`主角 S：${subjectEn || item.svo.subject}`);
        if (subjectEn) {
          await speakAsync(subjectEn, 'en-US', slowSpeed, isCancelled, withChinese && subjectZh ? 180 : 380);
          if (isCancelled()) return false;
        }
        if (withChinese && subjectZh) {
          await speakAsync(subjectZh, 'zh-TW', 1.05, isCancelled, 260);
          if (isCancelled()) return false;
        }

        setCurrentStepIndex(2);
        setCurrentStepPrompt(`動作 V：${verbEn || item.svo.verb}`);
        if (verbEn) {
          await speakAsync(verbEn, 'en-US', slowSpeed, isCancelled, withChinese && verbZh ? 180 : 380);
          if (isCancelled()) return false;
        }
        if (withChinese && verbZh) {
          await speakAsync(verbZh, 'zh-TW', 1.05, isCancelled, 260);
          if (isCancelled()) return false;
        }

        setCurrentStepIndex(3);
        const targetEn = [bridgeEn, objectEn].filter(Boolean).join(' ') || objectEn;
        setCurrentStepPrompt(`對象 O：${targetEn || item.svo.object}`);
        if (targetEn) {
          await speakAsync(targetEn, 'en-US', slowSpeed, isCancelled, withChinese && objectZh ? 180 : 380);
          if (isCancelled()) return false;
        }
        if (withChinese && objectZh) {
          await speakAsync(objectZh, 'zh-TW', 1.05, isCancelled, 300);
          if (isCancelled()) return false;
        }

        setCurrentStepIndex(4);
        setCurrentStepPrompt('⚡ 完整英文組裝輸出');
        await speakAsync(rawCleanEnglish, 'en-US', normalSpeed, isCancelled, Math.max(500, p * 1.1));
        if (isCancelled()) return false;
      }

      // 模式 5: 純英文沉浸磨耳朵（零中文干擾）
      else if (mode === 'english_repeat') {
        setCurrentStepIndex(1);
        setCurrentStepPrompt('🎧 慢速清晰抓音 (0中文干擾)');
        await speakAsync(rawCleanEnglish, 'en-US', slowSpeed, isCancelled, Math.max(350, p * 0.6));
        if (isCancelled()) return false;

        setCurrentStepIndex(2);
        setCurrentStepPrompt('🧠 內化節奏短拍');
        await sleepWithCancel(Math.max(400, Math.round(p * 0.55)), isCancelled);
        if (isCancelled()) return false;

        setCurrentStepIndex(3);
        setCurrentStepPrompt('⚡ 原速流暢定型');
        await speakAsync(rawCleanEnglish, 'en-US', normalSpeed, isCancelled, Math.max(500, p * 1.1));
        if (isCancelled()) return false;
      }

      return true;
    } catch (err) {
      console.error("[DriveModeTab] Sequence error:", err);
      return false;
    }
  };

  /**
   * 挑選下一個播放索引（支援 循序 / 隨機 / 單句循環）
   */
  const pickNextTrackIndex = (currentIdx: number, total: number, mode: DriveRepeatMode): number => {
    if (total <= 1) return 0;
    if (mode === 'one') return currentIdx;
    if (mode === 'shuffle') {
      let candidate = Math.floor(Math.random() * total);
      if (candidate === currentIdx) {
        candidate = (currentIdx + 1 + Math.floor(Math.random() * (total - 1))) % total;
      }
      return candidate;
    }
    return (currentIdx + 1) % total;
  };

  /**
   * 核心播放迴圈發動機
   */
  const startPlayback = (startIndex: number = safeCurrentIndexRef.current) => {
    const activeList = playlistRef.current;
    if (activeList.length === 0) return;

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    isTransitioningRef.current = false;

    primeMobileSpeechEngine();
    unlockAudioContext();
    startAudioKeepAlive();

    const newSessionId = ++sessionCounterRef.current;
    // CRITICAL: Synchronously set refs BEFORE launching runLoop so the first iteration never sees isPlayingRef.current === false
    isPlayingRef.current = true;
    isEchoWaitingRef.current = false;
    lastActiveTimestampRef.current = Date.now();
    setIsPlaying(true);
    setEngineHealthError(null);

    const runLoop = async () => {
      try {
        let idx = Math.min(Math.max(0, startIndex), Math.max(0, playlistRef.current.length - 1));
        let consecutiveLoopFailures = 0;

        while (isPlayingRef.current && sessionCounterRef.current === newSessionId) {
          const currentList = playlistRef.current;
          if (currentList.length === 0) {
            stopPlayback();
            break;
          }

          if (idx >= currentList.length) {
            idx = 0;
          }

          currentIndexRef.current = idx;
          setCurrentIndex(idx);
          const item = currentList[idx];

          if (item) {
            const loopsForThisItem = singleRepeatCountRef.current;
            for (let loop = 0; loop < loopsForThisItem; loop++) {
              if (!isPlayingRef.current || sessionCounterRef.current !== newSessionId) return;
              const success = await playItemSequence(item, newSessionId);
              if (!isPlayingRef.current || sessionCounterRef.current !== newSessionId) return;
              if (!success) {
                consecutiveLoopFailures += 1;
                if (consecutiveLoopFailures <= 3) {
                  // 單句偶發異常時主動喚醒音訊上下文、退避冷卻並自動推進，絕不讓 isPlaying 僵死於播放中
                  unlockAudioContext();
                  primeMobileSpeechEngine();
                  await sleepWithCancel(
                    450 * consecutiveLoopFailures,
                    () => !isPlayingRef.current || sessionCounterRef.current !== newSessionId
                  );
                  if (!isPlayingRef.current || sessionCounterRef.current !== newSessionId) return;
                  break;
                } else {
                  setEngineHealthError('連續多句語音合成異常，已安全暫停，請確認網路或裝置音量後再試');
                  stopPlayback();
                  return;
                }
              }
              consecutiveLoopFailures = 0;
              if (loop < loopsForThisItem - 1) {
                await sleepWithCancel(280, () => !isPlayingRef.current || sessionCounterRef.current !== newSessionId);
              }
            }
          }

          if (!isPlayingRef.current || sessionCounterRef.current !== newSessionId) break;

          if (!isAutoAdvanceRef.current) {
            stopPlayback();
            break;
          } else {
            await sleepWithCancel(300, () => !isPlayingRef.current || sessionCounterRef.current !== newSessionId);
            if (!isPlayingRef.current || sessionCounterRef.current !== newSessionId) break;
            idx = pickNextTrackIndex(idx, currentList.length, repeatModeRef.current);
          }
        }
      } catch (err) {
        console.error("[DriveModeTab] runLoop fatal error:", err);
        if (sessionCounterRef.current === newSessionId) {
          stopPlayback();
        }
      }
    };

    runLoop();
  };

  const stopPlayback = () => {
    sessionCounterRef.current++;
    isPlayingRef.current = false;
    isEchoWaitingRef.current = false;
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    isTransitioningRef.current = false;
    clearSpeechQueue();
    setIsPlaying(false);
    setIsEchoCountdown(null);
    setCurrentStepIndex(0);
    setCurrentStepPrompt('已暫停播放');
    stopAudioKeepAlive();
    pauseCarMediaSession();
  };

  const startPlaybackRef = useRef(startPlayback);
  startPlaybackRef.current = startPlayback;
  const stopPlaybackRef = useRef(stopPlayback);
  stopPlaybackRef.current = stopPlayback;

  const togglePlayPause = () => {
    playWaferSnapSound();
    if (isPlayingRef.current || isPlaying) {
      stopPlayback();
    } else {
      startPlayback(safeCurrentIndex);
    }
  };

  const scheduleDelayedStart = (targetIdx: number) => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = setTimeout(() => {
      transitionTimerRef.current = null;
      isTransitioningRef.current = false;
      startPlayback(targetIdx);
    }, 55);
  };

  const handleNextTrack = () => {
    if (playlist.length === 0) return;
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    playClickSound();
    const wasPlaying = isPlayingRef.current || isPlaying;
    const nextIdx = (safeCurrentIndex + 1) % playlist.length;
    stopPlayback();
    currentIndexRef.current = nextIdx;
    setCurrentIndex(nextIdx);
    if (wasPlaying) {
      scheduleDelayedStart(nextIdx);
    } else {
      isTransitioningRef.current = false;
    }
  };

  const handlePrevTrack = () => {
    if (playlist.length === 0) return;
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    playClickSound();
    const wasPlaying = isPlayingRef.current || isPlaying;
    const prevIdx = (safeCurrentIndex - 1 + playlist.length) % playlist.length;
    stopPlayback();
    currentIndexRef.current = prevIdx;
    setCurrentIndex(prevIdx);
    if (wasPlaying) {
      scheduleDelayedStart(prevIdx);
    } else {
      isTransitioningRef.current = false;
    }
  };

  const handleReplayCurrent = () => {
    if (playlist.length === 0) return;
    playClickSound();
    const targetIdx = safeCurrentIndex;
    stopPlayback();
    scheduleDelayedStart(targetIdx);
  };

  const handleToggleBookmarkCurrent = () => {
    if (!currentItem) return;
    playClickSound();
    if (onToggleBookmark) {
      onToggleBookmark(currentItem.rawLesson);
      const isBookmarked = bookmarkedLessons.some((b) => b.id === currentItem.lessonId);
      setBookmarkToast(isBookmarked ? '已從隨身收藏中移除' : '⭐ 已成功收藏至開車隨身清單');
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        toastTimerRef.current = null;
        setBookmarkToast(null);
      }, 2500);
    }
  };

  const isCurrentBookmarked = useMemo(() => {
    if (!currentItem) return false;
    return bookmarkedLessons.some((b) => b.id === currentItem.lessonId);
  }, [currentItem, bookmarkedLessons]);

  const handleQuickRateCurrent = (rating: MemoryRating) => {
    if (!currentItem) return;
    playClickSound();
    const { updatedCard, map: updatedMap } = rateLessonMemory(currentItem.lessonId, rating);
    setSrsMap(updatedMap);
    queueAutoServerSync(2500);
    setBookmarkToast(
      rating === 'hard'
        ? '已標記「生疏」· 今日清單將優先重複加強'
        : `已標記「記熟」· ${formatNextReviewLabel(updatedCard)}`
    );
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null;
      setBookmarkToast(null);
    }, 2600);
  };

  const handleSetSleepTimer = (minutes: number | null) => {
    playClickSound();
    setSleepTimerMinutes(minutes);
    if (minutes === null) {
      setRemainingSleepSeconds(null);
    } else {
      setRemainingSleepSeconds(minutes * 60);
    }
  };

  const formatSeconds = (sec: number | null) => {
    if (sec === null) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleManualResetEngine = () => {
    playClickSound();
    sessionCounterRef.current++;
    isPlayingRef.current = false;
    isEchoWaitingRef.current = false;
    autoRecoveryAttemptsRef.current = 0;
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    isTransitioningRef.current = false;
    resetSpeechEngine();
    unlockAudioContext();
    primeMobileSpeechEngine();
    clearSpeechQueue();
    setIsPlaying(false);
    setIsEchoCountdown(null);
    setCurrentStepIndex(0);
    setCurrentStepPrompt('語音引擎與手機音訊通道已重新解鎖校準');
    setEngineHealthError(null);
    refreshCacheStats();
    playSuccessChime();
  };

  const handleTestVoice = () => {
    playClickSound();
    const enVoice = findStandardEnglishVoice();
    const zhVoice = findTaiwanChineseVoice();
    const engineLabel =
      voiceEngine === 'cloud_hd'
        ? '雲端美式 HD 原音'
        : enVoice?.name || '雲端原生美語備援';
    const zhLabel =
      voiceEngine === 'cloud_hd'
        ? '雲端台灣國語 HD'
        : zhVoice?.name || '雲端國語備援';
    const msg = `英文: ${engineLabel} | 中文: ${zhLabel}`;
    setTestVoiceInfo(msg);
    if (testVoiceTimerRef.current) clearTimeout(testVoiceTimerRef.current);
    testVoiceTimerRef.current = setTimeout(() => {
      testVoiceTimerRef.current = null;
      setTestVoiceInfo(null);
    }, 4500);
    const sampleEnglish = currentItem?.english || 'Check the jump sensor.';
    speakEnglish(sampleEnglish, speedMultiplier);
  };

  const handleToggleVoiceEngine = () => {
    playClickSound();
    const nextEngine: VoiceEngineMode = voiceEngine === 'cloud_hd' ? 'auto' : 'cloud_hd';
    setPreferredVoiceEngine(nextEngine);
    setVoiceEngine(nextEngine);
    setBookmarkToast(
      nextEngine === 'cloud_hd'
        ? '☁️ 已切換「雲端美式 HD 原音」：徹底統一美語發音品質，不受裝置系統語音干擾'
        : '🔊 已切換「智慧雙源模式」：本機優先、無對應聲線自動無縫切換雲端 HD 原音'
    );
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null;
      setBookmarkToast(null);
    }, 3200);
    if (isPlayingRef.current || isPlaying) {
      const targetIdx = safeCurrentIndex;
      stopPlayback();
      scheduleDelayedStart(targetIdx);
    }
  };

  const handleTogglePreloadPlaylistAudio = async () => {
    playClickSound();
    if (isPreloadingAudio) {
      preloadAbortRef.current?.abort();
      preloadAbortRef.current = null;
      setIsPreloadingAudio(false);
      return;
    }
    if (playlist.length === 0) return;

    const controller = new AbortController();
    preloadAbortRef.current = controller;
    setIsPreloadingAudio(true);

    const items: Array<{ text: string; lang: 'en-US' | 'zh-TW' }> = [];
    playlist.forEach((track) => {
      if (track.english) items.push({ text: track.english, lang: 'en-US' });
      const segs = getCleanSpeechSegments(track);
      if (segs.focusEnglish) items.push({ text: segs.focusEnglish, lang: 'en-US' });
    });

    try {
      const summary = await prefetchCloudAudioBatch(
        items,
        (prog) => setPreloadProgress(prog),
        controller.signal
      );
      await refreshCacheStats();
      if (!controller.signal.aborted) {
        playSuccessChime();
        setBookmarkToast(
          `離線原音包就緒：新增 ${summary.newlyDownloaded} 段 · 已快取 ${summary.alreadyCached} 段`
        );
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          toastTimerRef.current = null;
          setBookmarkToast(null);
        }, 3600);
      }
    } finally {
      if (preloadAbortRef.current === controller) {
        preloadAbortRef.current = null;
      }
      setIsPreloadingAudio(false);
    }
  };

  const keyActionsRef = useRef({
    togglePlayPause,
    handleNextTrack,
    handlePrevTrack,
    handleReplayCurrent,
    handleToggleBookmarkCurrent
  });
  keyActionsRef.current = {
    togglePlayPause,
    handleNextTrack,
    handlePrevTrack,
    handleReplayCurrent,
    handleToggleBookmarkCurrent
  };

  // Keyboard Shortcuts (Space: Play/Pause, ArrowLeft/Right: Prev/Next, R: Replay, B: Bookmark, L: Tracklist, Esc: Close Tracklist)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTracklistOpen) {
        e.preventDefault();
        setIsTracklistOpen(false);
        return;
      }
      if (isVoiceSettingsOpen || isTutorialOpen || isTracklistOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement)?.tagName?.toLowerCase() || '')) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        keyActionsRef.current.togglePlayPause();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyK') {
        e.preventDefault();
        keyActionsRef.current.handleNextTrack();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyJ') {
        e.preventDefault();
        keyActionsRef.current.handlePrevTrack();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        keyActionsRef.current.handleReplayCurrent();
      } else if (e.code === 'KeyB') {
        e.preventDefault();
        keyActionsRef.current.handleToggleBookmarkCurrent();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        setIsTracklistOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVoiceSettingsOpen, isTutorialOpen, isTracklistOpen]);

  // Step names synced dynamically with current mode & Chinese cue setting
  const activeModeMeta = useMemo(() => {
    return DRIVE_PLAYBACK_MODES.find((m) => m.id === playbackMode) || DRIVE_PLAYBACK_MODES[0];
  }, [playbackMode]);

  const stepList = useMemo(() => {
    if (playbackMode === 'full_flow') {
      return ['慢速清晰', '關鍵字音', includeChineseCue ? '中文點撥' : '畫面連結', '跟讀記憶', '原速強化'];
    }
    if (playbackMode === 'follow_repeat') {
      return ['慢速示範', includeChineseCue ? '重點理解' : '核心字音', '原速預備', '開口 3s', '原速確認'];
    }
    if (playbackMode === 'bilingual') {
      return ['清晰英文', includeChineseCue ? '簡潔釋義' : '語意消化', '原速定型'];
    }
    return activeModeMeta.steps;
  }, [playbackMode, includeChineseCue, activeModeMeta]);

  // Filtered tracklist drawer items
  const drawerFilteredTracks = useMemo(() => {
    if (!tracklistSearch.trim()) return playlist;
    const q = tracklistSearch.toLowerCase();
    return playlist.filter(
      (item) =>
        item.english.toLowerCase().includes(q) ||
        item.chinese.includes(q) ||
        item.scenario.includes(q) ||
        item.taiwanPhonetic.includes(q)
    );
  }, [playlist, tracklistSearch]);

  return (
    <div
      id="drive-mode-container"
      className={`min-h-[85vh] rounded-3xl transition-all duration-300 flex flex-col justify-between p-4 sm:p-6 select-none relative overflow-hidden ${
        isNightMode
          ? 'bg-slate-950 text-slate-100 border-2 border-slate-800/90 shadow-2xl'
          : 'bg-slate-900 text-slate-100 border-2 border-slate-700 shadow-xl'
      }`}
    >
      {/* Simplified Top Bar */}
      <div id="drive-top-bar" className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
            <Car className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-amber-300 tracking-wide font-mono">
              隨身聽
            </h2>
            <p className="text-[11px] text-slate-400 hidden sm:block font-medium tabular-nums">
              背景連播 · 離線原音 {playableBlobCount} 段 {cachedSnippetsCount > playableBlobCount ? `(索引 ${cachedSnippetsCount})` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            id="drive-btn-tracklist"
            onClick={() => {
              playClickSound();
              setIsTracklistOpen(true);
            }}
            className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-cyan-300 text-xs font-black transition-all active:scale-95 cursor-pointer whitespace-nowrap tabular-nums"
            title="快速選曲 (L)"
          >
            <ListMusic className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-mono">{safeCurrentIndex + 1}/{playlist.length}</span>
            <span className="hidden md:inline">選曲</span>
          </button>

          <button
            id="drive-btn-timer"
            onClick={() => {
              if (sleepTimerMinutes === null) handleSetSleepTimer(15);
              else if (sleepTimerMinutes === 15) handleSetSleepTimer(30);
              else if (sleepTimerMinutes === 30) handleSetSleepTimer(45);
              else handleSetSleepTimer(null);
            }}
            className={`min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
              remainingSleepSeconds !== null
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
            title="睡眠定時 (15/30/45 分鐘)"
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono">{remainingSleepSeconds !== null ? formatSeconds(remainingSleepSeconds) : '定時'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowDriveConfig((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer whitespace-nowrap ${
              showDriveConfig
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>設定 {showDriveConfig ? '▴' : '▾'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Mode, Category & Utility Bar (Default collapsed for clean HUD) */}
      <div className="my-2">
        {!showDriveConfig ? (
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowDriveConfig(true);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-300 cursor-pointer transition-colors"
          >
            <span className="font-mono truncate">
              模式：<strong className="text-amber-300">{activeModeMeta.shortLabel}</strong> · 中文釋義：<strong className={includeChineseCue ? 'text-emerald-300' : 'text-slate-400'}>{includeChineseCue ? '開' : '純英關'}</strong> · 聲線：<strong className="text-cyan-300">{voiceEngine === 'cloud_hd' ? '雲端HD' : '智慧雙源'}</strong>
            </span>
            <span className="text-[11px] font-bold text-slate-400 shrink-0 ml-2">展開設定與篩選 ▾</span>
          </button>
        ) : (
          <div id="drive-mode-selectors" className="p-3 rounded-2xl bg-slate-900/95 border border-slate-800 space-y-2.5 animate-fade-in">
            {/* Playback Modes */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {[
                { id: 'full_flow', label: '英文精聽 5步', icon: Sparkles },
                { id: 'english_repeat', label: '純英沉浸連播', icon: Repeat },
                { id: 'bilingual', label: '英中英三明治', icon: Radio },
                { id: 'follow_repeat', label: '開口跟讀 3s', icon: Mic },
                { id: 'svo_breakdown', label: 'SVO 拆解', icon: Zap },
              ].map((mode) => (
                <button
                  key={mode.id}
                  id={`drive-mode-${mode.id}`}
                  onClick={() => {
                    playClickSound();
                    const nextMode = mode.id as AudioPlaybackMode;
                    const wasPlaying = isPlayingRef.current || isPlaying;
                    playbackModeRef.current = nextMode;
                    setPlaybackMode(nextMode);
                    if (wasPlaying) {
                      stopPlayback();
                      scheduleDelayedStart(safeCurrentIndex);
                    }
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                    playbackMode === mode.id
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <mode.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{mode.label}</span>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-cyan-300/90 bg-slate-950/70 border border-slate-800/80 rounded-xl px-2.5 py-1.5 font-medium">
              {activeModeMeta.desc}
            </p>

            {/* Category Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs tabular-nums">
              {[
                { id: 'all', label: `全部 (${lessons.length})` },
                { id: 'due', label: `待複習 (${dueCount})` },
                { id: 'aoi', label: 'AOI光學' },
                { id: 'bookmarks', label: `收藏 (${bookmarkedLessons.length})` },
                { id: 'foup', label: 'FOUP/手臂' },
                { id: 'vacuum', label: '真空/腔體' },
                { id: 'rf', label: 'RF/電漿' },
                { id: 'mfc', label: 'MFC/氣體' },
                { id: 'alarm', label: '警報交接' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    playClickSound();
                    const wasPlaying = isPlayingRef.current || isPlaying;
                    setSelectedCategory(cat.id);
                    currentIndexRef.current = 0;
                    setCurrentIndex(0);
                    if (wasPlaying) {
                      stopPlayback();
                      scheduleDelayedStart(0);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-bold transition-colors border cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60 font-black'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Secondary Utilities Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  id="drive-btn-voice-engine"
                  onClick={handleToggleVoiceEngine}
                  className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    voiceEngine === 'cloud_hd'
                      ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                      : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                  title="若覺得手機/電腦內建聲線太像機器或翻譯，點此一鍵切換雲端美式 HD 原音"
                >
                  <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{voiceEngine === 'cloud_hd' ? '聲源: 雲端HD原音' : '聲源: 智慧雙源'}</span>
                </button>
                <button
                  id="drive-btn-manual-reset-engine"
                  onClick={handleManualResetEngine}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>重置引擎</span>
                </button>
                <button
                  id="drive-btn-voice-settings"
                  onClick={() => {
                    playClickSound();
                    setIsVoiceSettingsOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>進階調音</span>
                </button>
                <button
                  id="drive-btn-tutorial"
                  onClick={() => {
                    playClickSound();
                    setIsTutorialOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>指南</span>
                </button>
                <button
                  id="drive-btn-hud-toggle"
                  onClick={() => {
                    playClickSound();
                    setIsNightMode(!isNightMode);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {isNightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  <span>{isNightMode ? '夜間 HUD' : '標準 HUD'}</span>
                </button>
                <button
                  id="drive-btn-preload-offline"
                  type="button"
                  onClick={handleTogglePreloadPlaylistAudio}
                  className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 cursor-pointer transition-colors tabular-nums ${
                    isPreloadingAudio
                      ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                      : 'bg-slate-950 hover:bg-slate-800 border-emerald-500/40 text-emerald-300'
                  }`}
                  title="預先把目前清單的雲端 HD 原音存進本機 IndexedDB，進無塵室無網路也能高音質播放"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isPreloadingAudio && preloadProgress
                      ? `預載中 ${preloadProgress.done}/${preloadProgress.total} (點此停止)`
                      : `預載離線音訊 (${playableBlobCount})`}
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowDriveConfig(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                收合 ▴
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 異常警告與自癒標記條 */}
      <AnimatePresence>
        {engineHealthError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="my-2 p-3 bg-rose-950/90 border border-rose-500/50 rounded-2xl flex items-center justify-between text-xs font-bold text-rose-200 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{engineHealthError}</span>
            </div>
            <button
              onClick={handleManualResetEngine}
              className="px-2.5 py-1 bg-rose-500 text-slate-950 font-black rounded-lg hover:bg-rose-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              立即解除
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 提示訊息浮層 */}
      <AnimatePresence>
        {(bookmarkToast || testVoiceInfo) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="my-2 p-2.5 bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-xs font-bold rounded-xl text-center shadow-lg backdrop-blur-md"
          >
            {bookmarkToast || testVoiceInfo}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 車載大字版 HUD 核心主畫面 */}
      <div
        id="drive-main-hud"
        className={`relative flex-1 flex flex-col justify-between items-center text-center p-4 sm:p-7 rounded-2xl my-2 border transition-all overflow-hidden ${
          isNightMode
            ? 'bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950 border-slate-800 shadow-2xl'
            : 'bg-gradient-to-b from-slate-800/95 via-slate-900 to-slate-950 border-slate-700 shadow-xl'
        }`}
      >
        {/* Top Playlist Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900/90" aria-hidden="true">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-emerald-400 transition-all duration-300"
            style={{ width: `${playlist.length > 0 ? Math.round(((safeCurrentIndex + 1) / playlist.length) * 100) : 0}%` }}
          />
        </div>

        {/* 當前情境標籤、音訊發音狀態與收藏按鈕 */}
        <div className="w-full flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/12 text-cyan-300 border border-cyan-500/30 truncate">
              {(currentItem?.scenario || '晶圓廠無塵室實戰').replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim()}
            </span>
            {(currentItem?.rawLesson?.isImported || currentItem?.rawLesson?.category === 'custom-imported') && (
              <span className="text-[11px] font-mono font-bold text-emerald-400 shrink-0 hidden sm:inline">
                自訂導入
              </span>
            )}
            <span className="text-xs font-mono font-bold text-slate-400 tabular-nums shrink-0">
              {safeCurrentIndex + 1} / {playlist.length}
            </span>
          </div>

          {/* 視覺化動態標籤 */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
              isSynthesizerSpeaking
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : isPlaying
                ? 'bg-amber-500/12 text-amber-300 border-amber-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}>
              <Activity className={`w-3.5 h-3.5 shrink-0 ${isSynthesizerSpeaking ? 'text-emerald-400' : ''}`} />
              <span className="font-mono whitespace-nowrap">{isSynthesizerSpeaking ? '朗讀中' : isPlaying ? '準備中' : '就緒'}</span>
            </div>

            <button
              id="drive-btn-bookmark"
              onClick={handleToggleBookmarkCurrent}
              className={`p-2 rounded-2xl border transition-all active:scale-90 cursor-pointer ${
                isCurrentBookmarked
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-md shadow-amber-400/20'
                  : 'bg-slate-900/80 text-slate-400 border-slate-700/80 hover:text-slate-200'
              }`}
              title="收藏此句至隨身清單 (快捷鍵 B)"
            >
              {isCurrentBookmarked ? <BookmarkCheck className="w-4 h-4 text-amber-400" /> : <Bookmark className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 【24 頻段動態音訊 Visualizer 反饋條】 */}
        <div id="drive-speech-visualizer" className="flex items-center justify-center gap-1 sm:gap-1.5 h-7 my-1 w-full max-w-md">
          {speechEnergy.map((energy, idx) => (
            <motion.div
              key={idx}
              className={`flex-1 rounded-full transition-all duration-75 ${
                isSynthesizerSpeaking
                  ? 'bg-gradient-to-t from-cyan-500 via-amber-400 to-yellow-300 shadow-sm shadow-cyan-500/40'
                  : isPlaying
                  ? 'bg-slate-700/80'
                  : 'bg-slate-800/50'
              }`}
              style={{
                height: `${energy}%`,
                minHeight: '4px'
              }}
            />
          ))}
        </div>

        {/* 核心英文大字 (支援盲聽測驗模式，點擊單字可單獨發音，空清單時引導一鍵切換) */}
        <div className="my-auto space-y-2.5 max-w-3xl py-2 w-full">
          {playlist.length === 0 ? (
            <div className="w-full max-w-lg mx-auto py-8 px-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 text-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto" />
              <div className="text-base sm:text-lg font-black text-slate-100">
                {selectedCategory === 'due'
                  ? '今日待複習句型已全部熟記！'
                  : selectedCategory === 'bookmarks'
                  ? '目前隨身收藏清單尚無句型'
                  : '此分類暫無可播放句型'}
              </div>
              <p className="text-xs text-slate-400 font-sans">
                {selectedCategory === 'due'
                  ? '所有 SM-2 排程句型皆處於熟記週期中，您可以切換回全部清單繼續磨耳朵！'
                  : '切回全部句型清單即可立即啟動背景連播學習。'}
              </p>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setSelectedCategory('all');
                  setCurrentIndex(0);
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer transition-colors whitespace-nowrap"
              >
                切換全部句型繼續聆聽
              </button>
            </div>
          ) : blindMode && !isBlindRevealed ? (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsBlindRevealed(true);
              }}
              className="w-full max-w-lg mx-auto py-8 px-6 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 transition-all cursor-pointer flex flex-col items-center justify-center gap-2.5 group"
            >
              <EyeOff className="w-8 h-8 text-cyan-400 transition-colors" />
              <div className="text-base sm:text-lg font-black text-cyan-200">
                盲聽測驗模式啟動中
              </div>
              <p className="text-xs text-slate-400 font-sans">
                先用耳朵聽出句意，點擊此處即時揭曉英文與中文解析
              </p>
            </button>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1">
                {(currentItem?.english || '請選取播放清單').split(/\s+/).filter(Boolean).map((token, wIdx) => (
                  <button
                    key={`${safeCurrentIndex}-${wIdx}-${token}`}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      const cleanToken = token.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '') || token;
                      speakEnglish(cleanToken, Math.max(0.7, speedMultiplier * 0.9));
                    }}
                    className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-100 hover:text-cyan-300 leading-tight drop-shadow-md font-mono cursor-pointer transition-colors rounded-lg px-1 hover:bg-slate-800/60"
                    title={`點擊單獨慢讀 "${token}"`}
                  >
                    {token}
                  </button>
                ))}
              </div>

              {currentItem?.english && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs sm:text-sm font-mono font-bold max-w-full overflow-hidden">
                  <span className="text-cyan-400 font-black shrink-0">KK音標：</span>
                  <span className="break-words">{getSentenceKKPhonetic(currentItem.english)}</span>
                </div>
              )}

              <p className="text-lg sm:text-2xl font-bold text-amber-300 leading-relaxed break-words">
                {currentItem?.chinese || ''}
              </p>

              {currentItem?.taiwanPhonetic && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm sm:text-base font-black max-w-full overflow-hidden">
                  <span className="text-slate-400 font-normal">口訣：</span>
                  <span className="break-words">{currentItem.taiwanPhonetic}</span>
                </div>
              )}

              {/* S-V-O 即時語法分解晶圓膠囊 (點擊單詞即精準發英文原音) */}
              {currentItem?.svo && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                  <button
                    onClick={() => {
                      playClickSound();
                      speakEnglish(currentItem.cleanSvo.subjectEn || currentItem.svo.subject, speedMultiplier);
                    }}
                    className="min-h-[36px] px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-400/60 text-blue-200 text-xs font-mono font-bold hover:bg-blue-900 cursor-pointer flex items-center gap-1 transition-all"
                    title="點擊單獨聆聽主角 (S)"
                  >
                    <span className="text-[9px] text-blue-400 font-black">S</span>
                    <span>{currentItem.svo.subject}</span>
                  </button>

                  <button
                    onClick={() => {
                      playClickSound();
                      speakEnglish(currentItem.cleanSvo.verbEn || currentItem.svo.verb, speedMultiplier);
                    }}
                    className="min-h-[36px] px-2.5 py-1 rounded-xl bg-rose-950/80 border border-rose-400/60 text-rose-200 text-xs font-mono font-bold hover:bg-rose-900 cursor-pointer flex items-center gap-1 transition-all"
                    title="點擊單獨聆聽動作 (V)"
                  >
                    <span className="text-[9px] text-rose-400 font-black">V</span>
                    <span>{currentItem.svo.verb}</span>
                  </button>

                  {currentItem.svo.bridge && (
                    <button
                      onClick={() => {
                        playClickSound();
                        speakEnglish(currentItem.cleanSvo.bridgeEn || currentItem.svo.bridge!, speedMultiplier);
                      }}
                      className="min-h-[36px] px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-400/60 text-purple-200 text-xs font-mono font-bold hover:bg-purple-900 cursor-pointer flex items-center gap-1 transition-all"
                      title="點擊單獨聆聽橋樑 (Bridge)"
                    >
                      <span className="text-[9px] text-purple-400 font-black">Bridge</span>
                      <span>{currentItem.svo.bridge}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      playClickSound();
                      speakEnglish(currentItem.cleanSvo.objectEn || currentItem.svo.object, speedMultiplier);
                    }}
                    className="min-h-[36px] px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-400/60 text-emerald-200 text-xs font-mono font-bold hover:bg-emerald-900 cursor-pointer flex items-center gap-1 transition-all"
                    title="點擊單獨聆聽受詞東西 (O)"
                  >
                    <span className="text-[9px] text-emerald-400 font-black">O</span>
                    <span>{currentItem.svo.object}</span>
                  </button>
                </div>
              )}

              {/* SM-2 隨身聽單鍵記憶標記 (開車/通勤快速評級) */}
              {currentItem && (
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 whitespace-nowrap tabular-nums">
                    <Brain className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{formatNextReviewLabel(srsMap[currentItem.lessonId])}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickRateCurrent('hard')}
                      className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        srsMap[currentItem.lessonId]?.lastRating === 'hard'
                          ? 'bg-rose-500 text-white border-rose-400 font-black'
                          : 'bg-slate-900/90 hover:bg-rose-950/70 text-rose-300 border-rose-500/40'
                      }`}
                      title="標記生疏，讓此句保留在待複習清單"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span>生疏 · 待複習</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickRateCurrent('good')}
                      className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        srsMap[currentItem.lessonId]?.lastRating === 'good' || srsMap[currentItem.lessonId]?.lastRating === 'easy'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                          : 'bg-slate-900/90 hover:bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                      }`}
                      title="已記熟此句，系統將自動排入 SM-2 延後複習"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>已記熟</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 5 步驟狀態導引燈與倒數進度 */}
        <div className="w-full mt-2 space-y-2">
          {/* 跟讀倒數提示 */}
          {isEchoCountdown !== null && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-black tabular-nums">
              <Mic className="w-4 h-4 motion-safe:animate-pulse" />
              <span>車內大聲跟讀倒數: {isEchoCountdown} 秒</span>
            </div>
          )}

          {/* 當前執行提示字 */}
          <p className="text-xs sm:text-sm font-bold text-amber-400 tracking-wider font-mono">
            {currentStepPrompt}
          </p>

          {/* 步驟進度燈 */}
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            {stepList.map((stName, idx) => {
              const stepNum = idx + 1;
              const isActive = currentStepIndex === stepNum;
              const isPast = currentStepIndex > stepNum;

              return (
                <div
                  key={stName}
                  className={`flex-1 max-w-[120px] py-1.5 px-1 rounded-xl text-[10px] sm:text-xs font-bold text-center border transition-all ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-md shadow-amber-400/30 ring-2 ring-amber-300/60'
                      : isPast
                      ? 'bg-slate-800 text-slate-400 border-slate-700/60'
                      : 'bg-slate-950/60 text-slate-600 border-slate-800/80'
                  }`}
                >
                  <span className="truncate block">{stName}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部大型控制中心（車載觸控黃金區域） */}
      <div id="drive-control-bar" className="mt-2 space-y-2.5">
        {/* 速度、連播循環與中英學習微調列 */}
        <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
          {/* 語速調節 */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 tabular-nums">
            <Gauge className="w-3.5 h-3.5 text-slate-400 ml-1.5 shrink-0" />
            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">語速:</span>
            {[0.7, 0.85, 1.0, 1.15].map((spd) => (
              <button
                key={spd}
                onClick={() => {
                  playClickSound();
                  setSpeedMultiplier(spd);
                }}
                className={`min-h-[30px] px-2.5 py-1 rounded-lg font-mono font-bold text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  speedMultiplier === spd
                    ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* 句子間隔節奏調節 */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 ml-1.5 hidden sm:inline">節奏:</span>
            {(['compact', 'standard', 'relaxed'] as PacingMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  playClickSound();
                  setPacingMode(mode);
                }}
                className={`min-h-[30px] px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  pacingMode === mode
                    ? 'bg-cyan-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'compact' ? '緊湊' : mode === 'standard' ? '標準' : '寬鬆'}
              </button>
            ))}
          </div>

          {/* 連播順序：循序 / 隨機 / 單句循環 */}
          <button
            id="drive-btn-repeat-mode"
            onClick={() => {
              playClickSound();
              setRepeatMode((prev) => (prev === 'all' ? 'shuffle' : prev === 'shuffle' ? 'one' : 'all'));
            }}
            className={`min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-colors cursor-pointer whitespace-nowrap ${
              repeatMode === 'shuffle'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60 font-black'
                : repeatMode === 'one'
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/60 font-black'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white'
            }`}
            title="切換全清單循序連播 / 隨機抽考 / 單句重複洗腦"
          >
            {repeatMode === 'shuffle' ? <Shuffle className="w-3.5 h-3.5 shrink-0" /> : <Repeat className="w-3.5 h-3.5 shrink-0" />}
            <span>{repeatMode === 'all' ? '循序連播' : repeatMode === 'shuffle' ? '隨機連播' : '單句循環'}</span>
          </button>

          {/* 單句次數 1x / 2x / 3x */}
          <button
            id="drive-btn-repeat-3x"
            onClick={() => {
              playClickSound();
              setSingleRepeatCount((prev) => (prev === 1 ? 2 : prev === 2 ? 3 : 1));
            }}
            className={`min-h-[38px] flex items-center gap-1 px-3 py-1.5 rounded-xl border font-bold text-xs transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
              singleRepeatCount > 1
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 font-black'
                : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
            title="每句連唸遍數 (1遍 / 2遍 / 3遍)"
          >
            <span>每句 {singleRepeatCount} 遍</span>
          </button>

          {/* 一鍵純英 / 含簡短中文釋義 */}
          <button
            id="drive-btn-chinese-cue"
            aria-pressed={!includeChineseCue}
            onClick={() => {
              playClickSound();
              setIncludeChineseCue((prev) => !prev);
            }}
            className={`min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-colors cursor-pointer whitespace-nowrap ${
              includeChineseCue
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60 font-black'
            }`}
            title="切換：是否穿插簡短中文釋義，關閉即純英文聽力特訓"
          >
            <Languages className="w-3.5 h-3.5 shrink-0" />
            <span>{includeChineseCue ? '英+簡中' : '純英學習'}</span>
          </button>

          {/* 盲聽測驗模式 */}
          <button
            id="drive-btn-blind-mode"
            aria-pressed={blindMode}
            onClick={() => {
              playClickSound();
              setBlindMode((prev) => !prev);
              setIsBlindRevealed(false);
            }}
            className={`min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-colors cursor-pointer whitespace-nowrap ${
              blindMode
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white'
            }`}
            title="隱藏文字只用耳朵聽，考驗直覺聽力反應"
          >
            {blindMode ? <EyeOff className="w-3.5 h-3.5 shrink-0" /> : <Eye className="w-3.5 h-3.5 shrink-0" />}
            <span>{blindMode ? '盲聽開' : '盲聽'}</span>
          </button>
        </div>

        {/* 核心播放五大按鈕 (特大尺寸，直覺防誤觸) */}
        <div className="grid grid-cols-5 gap-1 sm:gap-2.5 items-center">
          {/* 上一句 */}
          <button
            id="drive-btn-prev"
            onClick={handlePrevTrack}
            className="h-14 sm:h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all shadow-lg cursor-pointer touch-manipulation min-w-0"
            title="上一句 (快捷鍵 ← 或 J)"
          >
            <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 truncate w-full text-center px-0.5">上一句</span>
          </button>

          {/* 重播當前句 */}
          <button
            id="drive-btn-replay"
            onClick={handleReplayCurrent}
            className="h-14 sm:h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all shadow-lg cursor-pointer touch-manipulation min-w-0"
            title="重播當前句 (快捷鍵 R)"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 truncate w-full text-center px-0.5">重播</span>
          </button>

          {/* 播放 / 暫停主按鈕 (特大凸顯) */}
          <button
            id="drive-btn-play-pause"
            onClick={togglePlayPause}
            className={`h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all shadow-2xl cursor-pointer touch-manipulation min-w-0 ${
              isPlaying
                ? 'bg-amber-400 text-slate-950 font-black shadow-amber-400/30 ring-2 ring-amber-300'
                : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black shadow-cyan-400/30 ring-2 ring-cyan-300'
            }`}
            title={isPlaying ? '暫停播放 (空白鍵)' : '開始全自動播放 (空白鍵)'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 sm:w-7 sm:h-7 fill-slate-950" />
                <span className="text-[10px] sm:text-xs font-black truncate">暫停</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 sm:w-7 sm:h-7 fill-slate-950 translate-x-0.5" />
                <span className="text-[10px] sm:text-xs font-black truncate">連播</span>
              </>
            )}
          </button>

          {/* 試聽與校正聲線 */}
          <button
            id="drive-btn-test-voice"
            onClick={handleTestVoice}
            className="h-14 sm:h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all shadow-lg cursor-pointer touch-manipulation min-w-0"
            title="發音引擎測試"
          >
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 truncate w-full text-center px-0.5">試聽</span>
          </button>

          {/* 下一句 */}
          <button
            id="drive-btn-next"
            onClick={handleNextTrack}
            className="h-14 sm:h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all shadow-lg cursor-pointer touch-manipulation min-w-0"
            title="下一句 (快捷鍵 → 或 K)"
          >
            <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 truncate w-full text-center px-0.5">下一句</span>
          </button>
        </div>

        {/* 鍵盤快捷鍵提示 */}
        <div className="hidden sm:flex items-center justify-center gap-3 text-[10px] text-slate-500 font-mono pt-1">
          <span className="flex items-center gap-1">
            <Keyboard className="w-3 h-3 text-slate-400" />
            <span>快捷鍵:</span>
          </span>
          <span>[空白鍵] 播放/暫停</span>
          <span>[←/→] 上下首</span>
          <span>[R] 重播</span>
          <span>[B] 收藏</span>
          <span>[L] 快速曲目</span>
        </div>
      </div>

      {/* 快速選曲清單抽屜 Modal (Tracklist Drawer) */}
      <AnimatePresence>
        {isTracklistOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="開車隨身聽快速選曲清單"
            onClick={() => setIsTracklistOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border-2 border-cyan-400/60 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-100 relative shrink-strict"
            >
              {/* Header */}
              <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg">
                    <ListMusic className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      開車隨身聽 • 快速選曲清單
                    </h3>
                    <p className="text-[11px] text-slate-400 tabular-nums">
                      點擊任意曲目立即跳轉播放 (共 {playlist.length} 首)
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsTracklistOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3 bg-slate-950/70 border-b border-slate-800 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={tracklistSearch}
                    onChange={(e) => setTracklistSearch(e.target.value)}
                    placeholder="搜尋英文句型、中文、情境..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans shadow-inner"
                  />
                </div>
              </div>

              {/* Tracklist List */}
              <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1">
                {drawerFilteredTracks.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    未找到符合「{tracklistSearch}」的曲目
                  </div>
                ) : (
                  drawerFilteredTracks.map((item) => {
                    const originalIndex = playlist.findIndex((p) => p.lessonId === item.lessonId);
                    const isCurrent = originalIndex === safeCurrentIndex;
                    return (
                      <div
                        key={item.lessonId}
                        onClick={() => {
                          playClickSound();
                          setIsTracklistOpen(false);
                          stopPlayback();
                          currentIndexRef.current = originalIndex;
                          setCurrentIndex(originalIndex);
                          scheduleDelayedStart(originalIndex);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-cyan-950/90 border-cyan-400 ring-2 ring-cyan-400/40 text-cyan-200'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 tabular-nums ${
                            isCurrent ? 'bg-cyan-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {originalIndex + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 leading-none">
                                {item.scenario}
                              </span>
                              {isCurrent && isPlaying && (
                                <span className="text-[10px] font-bold text-amber-300 inline-flex items-center gap-1">
                                  <Volume2 className="w-3 h-3" />
                                  <span>播放中</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs sm:text-sm font-black font-mono tracking-tight truncate text-white">
                              {item.english}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {item.chinese}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {isCurrent ? (
                            <div className="p-1.5 rounded-lg bg-cyan-400 text-slate-950">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0 text-xs text-slate-400">
                <span className="text-[11px] font-mono tabular-nums">
                  共 {drawerFilteredTracks.length} 條可選曲目
                </span>
                <button
                  onClick={() => setIsTracklistOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer transition-colors text-xs"
                >
                  關閉
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 調音設定彈窗 */}
      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
        speechSpeed={speechSpeed}
        setSpeechSpeed={setSpeechSpeed || (() => {})}
      />

      {/* 開車教學指南分頁彈窗 */}
      <DriveTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onStartDriveMode={() => {
          if (!isPlaying) {
            togglePlayPause();
          }
        }}
      />
    </div>
  );
};
