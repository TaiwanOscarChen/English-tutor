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
  CheckCircle2,
  Sparkles,
  Settings2,
  RefreshCw,
  Gauge,
  AlertTriangle,
  Activity,
  Database,
  ShieldCheck,
  HelpCircle,
  BookOpen,
  ListMusic,
  Search,
  X,
  Keyboard,
  Check,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PlaylistItem,
  AudioPlaybackMode,
  buildDrivePlaylist,
  speakAsync,
  clearSpeechQueue,
  sleepWithCancel
} from '../utils/drivingAudioPlayer';
import {
  preprocessSpeechText,
  findStandardEnglishVoice,
  findTaiwanChineseVoice,
  cancelSpeech,
  resetSpeechEngine,
  speakEnglish,
  unlockAudioContext,
  primeMobileSpeechEngine
} from '../utils/speech';
import {
  getAudioCacheStats,
  clearAllAudioCache
} from '../utils/audioCacheDB';
import { playClickSound, playSuccessChime, playWaferSnapSound, playLaserScanSound } from '../utils/audioEffects';
import { prefetchSpeechText } from '../utils/speechPrefetcher';
import {
  startAudioKeepAlive,
  stopAudioKeepAlive,
  updateCarMediaSession,
  pauseCarMediaSession
} from '../utils/audioKeepAlive';
import { VoiceSettingsModal } from './VoiceSettingsModal';
import { DriveTutorialModal } from './DriveTutorialModal';
import { getSentenceKKPhonetic } from '../utils/wordDictionary';

interface DriveModeTabProps {
  lessons: Lesson[];
  speechSpeed: number;
  setSpeechSpeed?: (speed: number) => void;
  bookmarkedLessons?: Lesson[];
  onToggleBookmark?: (lesson: Lesson) => void;
}

type PacingMode = 'compact' | 'standard' | 'relaxed';

export const DriveModeTab: React.FC<DriveModeTabProps> = ({
  lessons,
  speechSpeed,
  setSpeechSpeed,
  bookmarkedLessons = [],
  onToggleBookmark
}) => {
  // Player Configuration State
  const [playbackMode, setPlaybackMode] = useState<AudioPlaybackMode>('full_flow');
  const [repeatMode, setRepeatMode] = useState<'all' | 'one' | 'none'>('all');
  const [repeatThreeTimes, setRepeatThreeTimes] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(0.85);
  const [pacingMode, setPacingMode] = useState<PacingMode>('standard');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [remainingSleepSeconds, setRemainingSleepSeconds] = useState<number | null>(null);
  const [isNightMode, setIsNightMode] = useState<boolean>(true);
  const [isAutoAdvance, setIsAutoAdvance] = useState<boolean>(true);

  // Runtime Playback State
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [currentStepPrompt, setCurrentStepPrompt] = useState<string>('準備就緒，點擊下方按鈕開始播放');
  const [isEchoCountdown, setIsEchoCountdown] = useState<number | null>(null);
  const [bookmarkToast, setBookmarkToast] = useState<string | null>(null);
  const [testVoiceInfo, setTestVoiceInfo] = useState<string | null>(null);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isTracklistOpen, setIsTracklistOpen] = useState<boolean>(false);
  const [tracklistSearch, setTracklistSearch] = useState<string>('');

  // IndexedDB Cache State
  const [cachedSnippetsCount, setCachedSnippetsCount] = useState<number>(0);
  const [isCacheWarm, setIsCacheWarm] = useState<boolean>(false);

  // Visualizer & Speech Health Diagnostics State
  const [speechEnergy, setSpeechEnergy] = useState<number[]>(new Array(24).fill(10));
  const [isSynthesizerSpeaking, setIsSynthesizerSpeaking] = useState<boolean>(false);
  const [engineHealthError, setEngineHealthError] = useState<string | null>(null);

  // Concurrency Session Ref & Mutex Lock
  const sessionCounterRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const currentIndexRef = useRef<number>(0);
  const isTransitioningRef = useRef<boolean>(false);
  const wakeLockRef = useRef<any>(null);
  const rafVisualizerIdRef = useRef<number | null>(null);
  const speechSpeakingRef = useRef<boolean>(false);
  const lastActiveTimestampRef = useRef<number>(Date.now());

  // Refresh cache stats
  const refreshCacheStats = async () => {
    try {
      const stats = await getAudioCacheStats();
      setCachedSnippetsCount(stats.count);
      setIsCacheWarm(stats.count > 0);
    } catch {}
  };

  useEffect(() => {
    refreshCacheStats();
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
  }, [currentIndex]);

  /**
   * 透過 requestAnimationFrame 監控 speech.speaking 狀態與 24 頻段動態視覺反饋 (Visualizer)
   */
  useEffect(() => {
    let animFrame: number;
    let tickCount = 0;

    const monitorLoop = () => {
      tickCount++;
      const synthSpeaking = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
      speechSpeakingRef.current = !!synthSpeaking;
      setIsSynthesizerSpeaking(!!synthSpeaking);

      if (synthSpeaking) {
        lastActiveTimestampRef.current = Date.now();
        // 動態生成 24 條聲波波紋高度
        const bars = Array.from({ length: 24 }, (_, i) => {
          const wave = Math.sin(tickCount * 0.18 + i * 0.35);
          const noise = Math.random() * 0.25;
          const height = Math.max(16, Math.min(100, (wave * 0.45 + 0.55 + noise) * 92));
          return height;
        });
        setSpeechEnergy(bars);
      } else {
        // 靜音平穩待機
        setSpeechEnergy((prev) => prev.map((val) => Math.max(8, val * 0.85)));
      }

      // 監控健康度：若 isPlaying 為 true，但超過 14 秒完全沒有 speech 合成活躍且非跟讀階段
      if (isPlayingRef.current && !synthSpeaking && currentStepIndex !== 4) {
        const idleDuration = Date.now() - lastActiveTimestampRef.current;
        if (idleDuration > 14000) {
          console.warn("[SpeechDiagnostic] 語音通道逾時停滯，UI 自動重新校準中...");
          setEngineHealthError(`語音通道逾時停滯（卡在第 ${currentIndexRef.current + 1} 句），已自動校準解除鎖定`);
          lastActiveTimestampRef.current = Date.now();
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          }
        }
      }

      animFrame = requestAnimationFrame(monitorLoop);
    };

    animFrame = requestAnimationFrame(monitorLoop);
    rafVisualizerIdRef.current = animFrame;

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [currentStepIndex]);

  // Build full raw playlist
  const allPlaylistItems: PlaylistItem[] = useMemo(() => {
    return buildDrivePlaylist(lessons);
  }, [lessons]);

  // Filter playlist by category or bookmarks
  const playlist: PlaylistItem[] = useMemo(() => {
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
  }, [allPlaylistItems, selectedCategory, bookmarkedLessons]);

  // Ensure index validity
  const safeCurrentIndex = useMemo(() => {
    if (playlist.length === 0) return 0;
    return Math.min(Math.max(0, currentIndex), playlist.length - 1);
  }, [currentIndex, playlist.length]);

  const currentItem = playlist[safeCurrentIndex];

  // Pause duration based on pacing mode
  const pauseDuration = useMemo(() => {
    if (pacingMode === 'compact') return 500;
    if (pacingMode === 'standard') return 1200;
    return 2000;
  }, [pacingMode]);

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
  }, [safeCurrentIndex, playlist, speechSpeed]);

  // Screen WakeLock handling
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {}
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

  // Sleep timer interval
  useEffect(() => {
    let interval: any = null;
    if (remainingSleepSeconds !== null && remainingSleepSeconds > 0 && isPlaying) {
      interval = setInterval(() => {
        setRemainingSleepSeconds((prev) => {
          if (prev === null || prev <= 1) {
            stopPlayback();
            setSleepTimerMinutes(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [remainingSleepSeconds, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionCounterRef.current++;
      clearSpeechQueue();
      stopAudioKeepAlive();
      pauseCarMediaSession();
    };
  }, []);

  /**
   * 播放單句內容的音訊完整流程
   */
  const playItemSequence = async (item: PlaylistItem, sessionId: number): Promise<boolean> => {
    const isCancelled = () => sessionCounterRef.current !== sessionId;

    if (!item || isCancelled()) return false;

    updateCarMediaSession(
      {
        title: item.english,
        artist: `${item.scenario} • ${item.chinese}`,
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

    const slowSpeed = Math.max(0.72, speedMultiplier * 0.85);
    const normalSpeed = speedMultiplier;
    const p = pauseDuration;

    const rawCleanEnglish = preprocessSpeechText(item.english);
    const rawCleanChinese = preprocessSpeechText(item.chinese);
    const rawCleanPhonetic = preprocessSpeechText(item.taiwanPhonetic || '');
    const rawCleanScenario = preprocessSpeechText(item.scenario || '情境');

    try {
      // 模式 1: 全流暢五步教學模式
      if (playbackMode === 'full_flow') {
        // Step 1: 中文情境導讀
        setCurrentStepIndex(1);
        setCurrentStepPrompt(`情境：${item.scenario}`);
        await speakAsync(`無塵室情境：${rawCleanScenario}`, 'zh-TW', 1.0, isCancelled, p);
        if (isCancelled()) return false;

        // Step 2: 慢速美式標準發音
        setCurrentStepIndex(2);
        setCurrentStepPrompt('慢速英文朗讀');
        await speakAsync(rawCleanEnglish, 'en-US', slowSpeed, isCancelled, p);
        if (isCancelled()) return false;

        // Step 3: 中文含義
        setCurrentStepIndex(3);
        setCurrentStepPrompt(`中文：${item.chinese}`);
        await speakAsync(`中文意思是：${rawCleanChinese}`, 'zh-TW', 1.0, isCancelled, p);
        if (isCancelled()) return false;

        // Step 4: 台味諧音口訣
        if (item.taiwanPhonetic) {
          setCurrentStepIndex(4);
          setCurrentStepPrompt(`口訣：${item.taiwanPhonetic}`);
          await speakAsync(`台味口訣：${rawCleanPhonetic}`, 'zh-TW', 1.0, isCancelled, p);
          if (isCancelled()) return false;
        }

        // Step 5: 原速標準複誦
        setCurrentStepIndex(5);
        setCurrentStepPrompt('標準原速複誦');
        await speakAsync(rawCleanEnglish, 'en-US', normalSpeed, isCancelled, p * 1.5);
        if (isCancelled()) return false;
      }

      // 模式 2: 駕駛跟讀留白模式 (Echo Mode)
      else if (playbackMode === 'follow_repeat') {
        // Step 1: 慢速示範
        setCurrentStepIndex(1);
        setCurrentStepPrompt('慢速英文示範');
        await speakAsync(rawCleanEnglish, 'en-US', slowSpeed, isCancelled, 600);
        if (isCancelled()) return false;

        // Step 2: 中文提示
        setCurrentStepIndex(2);
        setCurrentStepPrompt(`含義：${item.chinese}`);
        await speakAsync(rawCleanChinese, 'zh-TW', 1.05, isCancelled, 600);
        if (isCancelled()) return false;

        // Step 3: 原速英文
        setCurrentStepIndex(3);
        setCurrentStepPrompt('原速示範，準備跟讀');
        await speakAsync(rawCleanEnglish, 'en-US', normalSpeed, isCancelled, 400);
        if (isCancelled()) return false;

        // Step 4: 留白 3 秒跟讀倒數
        setCurrentStepIndex(4);
        setCurrentStepPrompt('🎤 請在車內大聲朗讀出來！');
        for (let cd = 3; cd >= 1; cd--) {
          setIsEchoCountdown(cd);
          await sleepWithCancel(1000, isCancelled);
          if (isCancelled()) {
            setIsEchoCountdown(null);
            return false;
          }
        }
        setIsEchoCountdown(null);

        // Step 5: 複誦確認
        setCurrentStepIndex(5);
        setCurrentStepPrompt('再次複誦確認');
        await speakAsync(rawCleanEnglish, 'en-US', normalSpeed, isCancelled, p);
        if (isCancelled()) return false;
      }

      // 模式 3: 中英雙語速聽
      else if (playbackMode === 'bilingual') {
        setCurrentStepIndex(1);
        setCurrentStepPrompt('英文朗讀');
        await speakAsync(rawCleanEnglish, 'en-US', normalSpeed, isCancelled, p);
        if (isCancelled()) return false;

        setCurrentStepIndex(2);
        setCurrentStepPrompt(`中文：${item.chinese}`);
        await speakAsync(rawCleanChinese, 'zh-TW', 1.0, isCancelled, p * 1.2);
        if (isCancelled()) return false;
      }

      // 模式 4: SVO 語法慢速拆解
      else if (playbackMode === 'svo_breakdown') {
        setCurrentStepIndex(1);
        setCurrentStepPrompt(`主角 S: ${item.svo.subject}`);
        await speakAsync(`主角：${item.svo.subject}`, 'zh-TW', 1.0, isCancelled, 350);
        await speakAsync(item.svo.subject, 'en-US', slowSpeed, isCancelled, 500);
        if (isCancelled()) return false;

        setCurrentStepIndex(2);
        setCurrentStepPrompt(`動作 V: ${item.svo.verb}`);
        await speakAsync(`動作：${item.svo.verb}`, 'zh-TW', 1.0, isCancelled, 350);
        await speakAsync(item.svo.verb, 'en-US', slowSpeed, isCancelled, 500);
        if (isCancelled()) return false;

        if (item.svo.bridge) {
          await speakAsync(`連接：${item.svo.bridge}`, 'zh-TW', 1.0, isCancelled, 300);
          await speakAsync(item.svo.bridge, 'en-US', slowSpeed, isCancelled, 400);
          if (isCancelled()) return false;
        }

        setCurrentStepIndex(3);
        setCurrentStepPrompt(`東西 O: ${item.svo.object}`);
        await speakAsync(`受詞東西：${item.svo.object}`, 'zh-TW', 1.0, isCancelled, 350);
        await speakAsync(item.svo.object, 'en-US', slowSpeed, isCancelled, 500);
        if (isCancelled()) return false;

        setCurrentStepIndex(4);
        setCurrentStepPrompt('完整金句組合');
        await speakAsync(rawCleanEnglish, 'en-US', normalSpeed, isCancelled, p * 1.5);
        if (isCancelled()) return false;
      }

      // 模式 5: 純英文雙倍磨耳朵
      else if (playbackMode === 'english_repeat') {
        setCurrentStepIndex(1);
        setCurrentStepPrompt('英文第 1 遍');
        await speakAsync(rawCleanEnglish, 'en-US', slowSpeed, isCancelled, p);
        if (isCancelled()) return false;

        setCurrentStepIndex(2);
        setCurrentStepPrompt('英文第 2 遍 (原速)');
        await speakAsync(rawCleanEnglish, 'en-US', normalSpeed, isCancelled, p * 1.5);
        if (isCancelled()) return false;
      }

      return true;
    } catch (err) {
      console.error("[DriveModeTab] Sequence error:", err);
      return false;
    }
  };

  /**
   * 核心播放迴圈發動機
   */
  const startPlayback = (startIndex: number = safeCurrentIndex) => {
    if (playlist.length === 0) return;

    primeMobileSpeechEngine();
    unlockAudioContext();
    startAudioKeepAlive();

    const newSessionId = ++sessionCounterRef.current;
    setIsPlaying(true);
    setEngineHealthError(null);

    const runLoop = async () => {
      let idx = startIndex;

      while (isPlayingRef.current && sessionCounterRef.current === newSessionId) {
        if (idx >= playlist.length) {
          if (repeatMode === 'all') {
            idx = 0;
          } else {
            stopPlayback();
            break;
          }
        }

        setCurrentIndex(idx);
        const item = playlist[idx];

        if (item) {
          const loopsForThisItem = repeatThreeTimes ? 3 : 1;
          for (let loop = 0; loop < loopsForThisItem; loop++) {
            if (sessionCounterRef.current !== newSessionId) return;
            const success = await playItemSequence(item, newSessionId);
            if (!success || sessionCounterRef.current !== newSessionId) return;
          }
        }

        if (sessionCounterRef.current !== newSessionId) break;

        if (!isAutoAdvance || repeatMode === 'one') {
          if (!isAutoAdvance) {
            stopPlayback();
            break;
          }
        } else {
          await sleepWithCancel(350, () => sessionCounterRef.current !== newSessionId);
          if (sessionCounterRef.current !== newSessionId) break;
          idx += 1;
        }
      }
    };

    runLoop();
  };

  const stopPlayback = () => {
    sessionCounterRef.current++;
    clearSpeechQueue();
    setIsPlaying(false);
    setIsEchoCountdown(null);
    setCurrentStepIndex(0);
    setCurrentStepPrompt('已暫停播放');
    stopAudioKeepAlive();
    pauseCarMediaSession();
  };

  const togglePlayPause = () => {
    playWaferSnapSound();
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback(safeCurrentIndex);
    }
  };

  const handleNextTrack = () => {
    if (playlist.length === 0) return;
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    playClickSound();
    const nextIdx = (safeCurrentIndex + 1) % playlist.length;
    stopPlayback();
    if (isPlayingRef.current || isPlaying) {
      setTimeout(() => {
        startPlayback(nextIdx);
        isTransitioningRef.current = false;
      }, 50);
    } else {
      setCurrentIndex(nextIdx);
      isTransitioningRef.current = false;
    }
  };

  const handlePrevTrack = () => {
    if (playlist.length === 0) return;
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    playClickSound();
    const prevIdx = (safeCurrentIndex - 1 + playlist.length) % playlist.length;
    stopPlayback();
    if (isPlayingRef.current || isPlaying) {
      setTimeout(() => {
        startPlayback(prevIdx);
        isTransitioningRef.current = false;
      }, 50);
    } else {
      setCurrentIndex(prevIdx);
      isTransitioningRef.current = false;
    }
  };

  const handleReplayCurrent = () => {
    if (playlist.length === 0) return;
    playClickSound();
    stopPlayback();
    setTimeout(() => {
      startPlayback(safeCurrentIndex);
    }, 50);
  };

  const handleToggleBookmarkCurrent = () => {
    if (!currentItem) return;
    playClickSound();
    if (onToggleBookmark) {
      onToggleBookmark(currentItem.rawLesson);
      const isBookmarked = bookmarkedLessons.some((b) => b.id === currentItem.lessonId);
      setBookmarkToast(isBookmarked ? '已從隨身收藏中移除' : '⭐ 已成功收藏至開車隨身清單');
      setTimeout(() => setBookmarkToast(null), 2500);
    }
  };

  const isCurrentBookmarked = useMemo(() => {
    if (!currentItem) return false;
    return bookmarkedLessons.some((b) => b.id === currentItem.lessonId);
  }, [currentItem, bookmarkedLessons]);

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
    resetSpeechEngine();
    unlockAudioContext();
    primeMobileSpeechEngine();
    clearSpeechQueue();
    setIsPlaying(false);
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
    const msg = `美式: ${enVoice?.name || '預設'} | 台味: ${zhVoice?.name || '預設'}`;
    setTestVoiceInfo(msg);
    setTimeout(() => setTestVoiceInfo(null), 4000);
    speakAsync('MFC and RF generators are online.', 'en-US', speedMultiplier);
  };

  // Keyboard Shortcuts (Space: Play/Pause, ArrowLeft/Right: Prev/Next, R: Replay, B: Bookmark, L: Tracklist)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase() || '')) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyK') {
        e.preventDefault();
        handleNextTrack();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyJ') {
        e.preventDefault();
        handlePrevTrack();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleReplayCurrent();
      } else if (e.code === 'KeyB') {
        e.preventDefault();
        handleToggleBookmarkCurrent();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        setIsTracklistOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeCurrentIndex, isPlaying, playlist.length, currentItem]);

  // Step names based on mode
  const stepList = useMemo(() => {
    if (playbackMode === 'full_flow') {
      return ['中文情境', '慢速美式', '中文翻譯', '諧音口訣', '原速複誦'];
    }
    if (playbackMode === 'follow_repeat') {
      return ['慢速示範', '中文含義', '原速示範', '跟讀 3s', '複誦確認'];
    }
    if (playbackMode === 'bilingual') {
      return ['英文朗讀', '中文含義'];
    }
    if (playbackMode === 'svo_breakdown') {
      return ['主角 S', '動作 V', '東西 O', '原速金句'];
    }
    return ['第 1 遍朗讀', '第 2 遍朗讀'];
  }, [playbackMode]);

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
      {/* 頂部快捷列：車載模式標題、視覺狀態、IndexedDB 快取狀態、播放清單抽屜按鈕、手動重置按鈕、HUD 夜間切換、睡眠定時器 */}
      <div id="drive-top-bar" className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 ring-2 ring-amber-400/40">
            <Car className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-amber-300 tracking-wide flex items-center gap-1.5 font-mono">
                隨身聽
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40">
                免操作
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block font-medium">
              背景連播 · SVO 拆解
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 播放清單抽屜切換按鈕 */}
          <button
            id="drive-btn-tracklist"
            onClick={() => {
              playClickSound();
              setIsTracklistOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-cyan-300 text-xs font-black transition-all active:scale-95 shadow-sm cursor-pointer"
            title="開啟快速選曲清單 (快捷鍵 L)"
          >
            <ListMusic className="w-4 h-4 text-cyan-400" />
            <span className="font-mono">{safeCurrentIndex + 1}/{playlist.length}</span>
            <span className="hidden md:inline">選曲</span>
          </button>

          {/* IndexedDB 快取指標 */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-colors ${
              isCacheWarm
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="IndexedDB 本地音訊快取已就緒，確保駕駛時瞬間斷網或重載時語音流暢無停頓"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>快取: {cachedSnippetsCount} 條</span>
          </div>

          {/* 【手動重置發音按鈕】 */}
          <button
            id="drive-btn-manual-reset-engine"
            onClick={handleManualResetEngine}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black transition-all active:scale-95 shadow-sm cursor-pointer"
            title="若語音異常或停頓，點此強制重置並清空隊列"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">重置</span>
          </button>

          {/* 開車教學指南入口 */}
          <button
            id="drive-btn-tutorial"
            onClick={() => {
              playClickSound();
              setIsTutorialOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-black transition-all active:scale-95 shadow-sm cursor-pointer"
            title="查看開車隨身聽分頁教學模式"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">指南</span>
          </button>

          {/* 調音設定入口 */}
          <button
            id="drive-btn-voice-settings"
            onClick={() => {
              playClickSound();
              setIsVoiceSettingsOpen(true);
            }}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="發音與聲線調音"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* 睡眠定時器 */}
          <div className="relative flex items-center">
            <button
              id="drive-btn-timer"
              onClick={() => {
                if (sleepTimerMinutes === null) handleSetSleepTimer(15);
                else if (sleepTimerMinutes === 15) handleSetSleepTimer(30);
                else if (sleepTimerMinutes === 30) handleSetSleepTimer(45);
                else handleSetSleepTimer(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                remainingSleepSeconds !== null
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
              title="設定自動停止播放定時器 (15/30/45 分鐘)"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono">{remainingSleepSeconds !== null ? formatSeconds(remainingSleepSeconds) : '定時'}</span>
            </button>
          </div>

          {/* HUD 夜間模式切換 */}
          <button
            id="drive-btn-hud-toggle"
            onClick={() => {
              playClickSound();
              setIsNightMode(!isNightMode);
            }}
            className={`p-2 sm:p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isNightMode
                ? 'bg-slate-900 text-amber-400 border-slate-800'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="切換高對比度夜間駕駛 HUD"
          >
            {isNightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
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
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 animate-bounce" />
              <span>{engineHealthError}</span>
            </div>
            <button
              onClick={handleManualResetEngine}
              className="px-2.5 py-1 bg-rose-500 text-slate-950 font-black rounded-lg hover:bg-rose-400 transition-colors cursor-pointer"
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

      {/* 播放模式與情境篩選 (大按鈕適合車載點選) */}
      <div id="drive-mode-selectors" className="my-2.5 space-y-2">
        {/* 播放流程 5 種模式切換 */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-inner">
          {[
            { id: 'full_flow', label: '全流暢五步', icon: Sparkles, hint: '情境➔慢➔中➔諧➔原' },
            { id: 'follow_repeat', label: '駕駛跟讀 3s', icon: Mic, hint: '示範➔留白跟讀➔確認' },
            { id: 'bilingual', label: '中英對照速聽', icon: Radio, hint: '英文朗讀➔中文含義' },
            { id: 'english_repeat', label: '純英文雙倍', icon: Repeat, hint: '慢速英文➔原速複誦' },
            { id: 'svo_breakdown', label: 'SVO 慢速拆解', icon: Zap, hint: '主角➔動作➔東西' },
          ].map((mode) => (
            <button
              key={mode.id}
              id={`drive-mode-${mode.id}`}
              onClick={() => {
                playClickSound();
                setPlaybackMode(mode.id as AudioPlaybackMode);
                if (isPlaying) {
                  stopPlayback();
                  setTimeout(() => startPlayback(safeCurrentIndex), 50);
                }
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                playbackMode === mode.id
                  ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/20 ring-2 ring-amber-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <mode.icon className="w-3.5 h-3.5" />
              <span className="font-bold">{mode.label}</span>
              <span className="text-[9px] opacity-75 font-mono hidden md:inline">{mode.hint}</span>
            </button>
          ))}
        </div>

        {/* 分類篩選與收藏金句庫 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'all', label: `全部情境 (${lessons.length})` },
            { id: 'aoi', label: 'AOI光學檢測' },
            { id: 'bookmarks', label: `⭐ 收藏精選 (${bookmarkedLessons.length})` },
            { id: 'foup', label: 'FOUP/傳送手臂' },
            { id: 'vacuum', label: '真空腔體/壓力' },
            { id: 'rf', label: 'RF射頻/電漿' },
            { id: 'mfc', label: 'MFC流量/氣體' },
            { id: 'alarm', label: '警報排除/交接' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                playClickSound();
                setSelectedCategory(cat.id);
                setCurrentIndex(0);
                if (isPlaying) {
                  stopPlayback();
                  setTimeout(() => startPlayback(0), 50);
                }
              }}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition-colors border cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-800 text-cyan-300 border-cyan-400/60 shadow-sm font-black'
                  : 'bg-slate-950/70 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 車載大字版 HUD 核心主畫面 (整合 24 頻段音訊視覺化 Visualizer 與 S-V-O 語法即點即聽) */}
      <div
        id="drive-main-hud"
        className={`relative flex-1 flex flex-col justify-between items-center text-center p-5 sm:p-7 rounded-3xl my-2 border-2 transition-all overflow-hidden ${
          isNightMode
            ? 'bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950 border-slate-800 shadow-2xl'
            : 'bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-slate-700 shadow-xl'
        }`}
      >
        {/* 當前情境標籤、音訊發音狀態與收藏按鈕 */}
        <div className="w-full flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {(currentItem?.scenario || '晶圓廠無塵室實戰').replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim()}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              {safeCurrentIndex + 1} / {playlist.length}
            </span>
          </div>

          {/* 視覺化動態標籤 */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              isSynthesizerSpeaking
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : isPlaying
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}>
              <Activity className={`w-3 h-3 ${isSynthesizerSpeaking ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="font-mono">{isSynthesizerSpeaking ? '語音朗讀中' : isPlaying ? '排程緩衝中' : '待機就緒'}</span>
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

        {/* 核心英文大字 (車載超清晰高對比排版) */}
        <div className="my-auto space-y-2.5 max-w-3xl py-2">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-100 leading-tight drop-shadow-md font-mono select-all break-words">
            {currentItem?.english || '請選取播放清單'}
          </h1>

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

          {/* S-V-O 即時語法分解晶圓膠囊 (點擊單詞即發音) */}
          {currentItem?.svo && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
              <button
                onClick={() => {
                  playClickSound();
                  speakEnglish(currentItem.svo.subject, speedMultiplier);
                }}
                className="px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-400/60 text-blue-200 text-xs font-mono font-bold hover:bg-blue-900 cursor-pointer flex items-center gap-1 transition-all"
                title="點擊單獨聆聽主角 (S)"
              >
                <span className="text-[9px] text-blue-400 font-black">S</span>
                <span>{currentItem.svo.subject}</span>
              </button>

              <button
                onClick={() => {
                  playClickSound();
                  speakEnglish(currentItem.svo.verb, speedMultiplier);
                }}
                className="px-2.5 py-1 rounded-xl bg-rose-950/80 border border-rose-400/60 text-rose-200 text-xs font-mono font-bold hover:bg-rose-900 cursor-pointer flex items-center gap-1 transition-all"
                title="點擊單獨聆聽動作 (V)"
              >
                <span className="text-[9px] text-rose-400 font-black">V</span>
                <span>{currentItem.svo.verb}</span>
              </button>

              {currentItem.svo.bridge && (
                <button
                  onClick={() => {
                    playClickSound();
                    speakEnglish(currentItem.svo.bridge!, speedMultiplier);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-400/60 text-purple-200 text-xs font-mono font-bold hover:bg-purple-900 cursor-pointer flex items-center gap-1 transition-all"
                  title="點擊單獨聆聽橋樑 (Bridge)"
                >
                  <span className="text-[9px] text-purple-400 font-black">Bridge</span>
                  <span>{currentItem.svo.bridge}</span>
                </button>
              )}

              <button
                onClick={() => {
                  playClickSound();
                  speakEnglish(currentItem.svo.object, speedMultiplier);
                }}
                className="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-400/60 text-emerald-200 text-xs font-mono font-bold hover:bg-emerald-900 cursor-pointer flex items-center gap-1 transition-all"
                title="點擊單獨聆聽受詞東西 (O)"
              >
                <span className="text-[9px] text-emerald-400 font-black">O</span>
                <span>{currentItem.svo.object}</span>
              </button>
            </div>
          )}
        </div>

        {/* 5 步驟狀態導引燈與倒數進度 */}
        <div className="w-full mt-2 space-y-2">
          {/* 跟讀倒數提示 */}
          {isEchoCountdown !== null && (
            <div className="animate-bounce inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-black">
              <Mic className="w-4 h-4 animate-pulse" />
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
                      ? 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-md shadow-amber-400/30 scale-105'
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
        {/* 速度與節奏微調列 */}
        <div className="flex items-center justify-between gap-2 px-1 text-xs flex-wrap">
          {/* 語速調節 */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <Gauge className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <span className="text-[11px] font-bold text-slate-400">語速:</span>
            {[0.75, 0.85, 1.0, 1.15].map((spd) => (
              <button
                key={spd}
                onClick={() => {
                  playClickSound();
                  setSpeedMultiplier(spd);
                }}
                className={`px-2 py-1 rounded-lg font-mono font-bold text-xs transition-colors cursor-pointer ${
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
            <span className="text-[11px] font-bold text-slate-400 ml-1.5">停頓:</span>
            {(['compact', 'standard', 'relaxed'] as PacingMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  playClickSound();
                  setPacingMode(mode);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  pacingMode === mode
                    ? 'bg-cyan-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'compact' ? '緊湊' : mode === 'standard' ? '標準' : '寬鬆'}
              </button>
            ))}
          </div>

          {/* 連播 3 次切換 */}
          <button
            id="drive-btn-repeat-3x"
            onClick={() => {
              playClickSound();
              setRepeatThreeTimes(!repeatThreeTimes);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${
              repeatThreeTimes
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 font-black'
                : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
            title="每句重複播放 3 次再換下一句"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>單句 3 遍: {repeatThreeTimes ? '開' : '關'}</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
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
                    <p className="text-[11px] text-slate-400">
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
                          setCurrentIndex(originalIndex);
                          setTimeout(() => startPlayback(originalIndex), 50);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-cyan-950/90 border-cyan-400 ring-2 ring-cyan-400/40 text-cyan-200'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                            isCurrent ? 'bg-cyan-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {originalIndex + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                {item.scenario}
                              </span>
                              {isCurrent && isPlaying && (
                                <span className="text-[10px] font-bold text-amber-300 animate-pulse">
                                  ● 播放中
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
                <span className="text-[11px] font-mono">
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
