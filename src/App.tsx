import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lesson, UserDiagnostics, VocabItem } from './types';
import {
  PRESET_LESSONS,
  PRESET_LESSONS_UPDATED_EVENT,
  getActivePresetLessons,
  applyPresetLessonBatchUpdates,
  type PresetLessonPatch,
} from './data/presetLessons';
import { fetchServerPresetLessonOverrides } from './utils/curriculumAuditEngine';
import { Header } from './components/Header';
import { LessonCard } from './components/LessonCard';
import { WaferCircuitParticles } from './components/WaferCircuitParticles';
import { TechSpotlightCard } from './components/TechSpotlightCard';
import { ShiftScheduler } from './components/ShiftScheduler';
import { HandoverReminderBanner } from './components/HandoverReminderBanner';
import { getStoredGlobalSpeechSpeed, saveGlobalSpeechSpeed } from './utils/speechSpeedCalibrator';
import { globalOfflineSpeechPlaylist } from './utils/offlineSpeechPlaylist';
import { OfflineCachePromptBanner } from './components/OfflineCachePromptBanner';
import { OfflinePlaylistPlayerBar } from './components/OfflinePlaylistPlayerBar';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { TypographyOptimizer } from './components/TypographyOptimizer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineSyncPromptBar } from './components/OfflineSyncPromptBar';

// Code-split secondary tabs (loaded on demand to keep first-paint bundle lean)
const FabVocabBank = lazy(() => import('./components/FabVocabBank').then((m) => ({ default: m.FabVocabBank })));
const CleanroomArticlesTab = lazy(() => import('./components/CleanroomArticlesTab').then((m) => ({ default: m.CleanroomArticlesTab })));
const FabEmergencySection = lazy(() => import('./components/FabEmergencySection').then((m) => ({ default: m.FabEmergencySection })));
const FabScenarioSection = lazy(() => import('./components/FabScenarioSection').then((m) => ({ default: m.FabScenarioSection })));
const CleanroomSpeechShadowing = lazy(() => import('./components/CleanroomSpeechShadowing').then((m) => ({ default: m.CleanroomSpeechShadowing })));
const FabVendorEquipmentHub = lazy(() => import('./components/FabVendorEquipmentHub').then((m) => ({ default: m.FabVendorEquipmentHub })));
const BookmarksTab = lazy(() => import('./components/BookmarksTab').then((m) => ({ default: m.BookmarksTab })));
const DriveModeTab = lazy(() => import('./components/DriveModeTab').then((m) => ({ default: m.DriveModeTab })));
const DiagnosticsAndRemediation = lazy(() => import('./components/DiagnosticsAndRemediation').then((m) => ({ default: m.DiagnosticsAndRemediation })));
const AchievementTree = lazy(() => import('./components/AchievementTree').then((m) => ({ default: m.AchievementTree })));
const AiLessonGenerator = lazy(() => import('./components/AiLessonGenerator').then((m) => ({ default: m.AiLessonGenerator })));
const AiTutorChat = lazy(() => import('./components/AiTutorChat').then((m) => ({ default: m.AiTutorChat })));

// Code-split modals (mounted and loaded only when opened)
const InteractiveGuideModal = lazy(() => import('./components/InteractiveGuideModal').then((m) => ({ default: m.InteractiveGuideModal })));
const QuickCheatSheetModal = lazy(() => import('./components/QuickCheatSheetModal').then((m) => ({ default: m.QuickCheatSheetModal })));
const SpeechPracticeModal = lazy(() => import('./components/SpeechPracticeModal').then((m) => ({ default: m.SpeechPracticeModal })));
const CleanroomBadgeModal = lazy(() => import('./components/CleanroomBadgeModal').then((m) => ({ default: m.CleanroomBadgeModal })));
const AiErrorCodeGeneratorModal = lazy(() => import('./components/AiErrorCodeGeneratorModal').then((m) => ({ default: m.AiErrorCodeGeneratorModal })));
const AiQuickDecomposerModal = lazy(() => import('./components/AiQuickDecomposerModal').then((m) => ({ default: m.AiQuickDecomposerModal })));
const VoiceSettingsModal = lazy(() => import('./components/VoiceSettingsModal').then((m) => ({ default: m.VoiceSettingsModal })));
const OfflineCacheModal = lazy(() => import('./components/OfflineCacheModal').then((m) => ({ default: m.OfflineCacheModal })));
const FabEmergencyModal = lazy(() => import('./components/FabEmergencyModal').then((m) => ({ default: m.FabEmergencyModal })));
const FabScenarioSimulatorModal = lazy(() => import('./components/FabScenarioSimulatorModal').then((m) => ({ default: m.FabScenarioSimulatorModal })));
const GlobalCommandPaletteModal = lazy(() => import('./components/GlobalCommandPaletteModal').then((m) => ({ default: m.GlobalCommandPaletteModal })));
const VocabMatchGameModal = lazy(() => import('./components/VocabMatchGameModal').then((m) => ({ default: m.VocabMatchGameModal })));
const KeyboardShortcutsModal = lazy(() => import('./components/KeyboardShortcutsModal').then((m) => ({ default: m.KeyboardShortcutsModal })));
const SystemDataBackupModal = lazy(() => import('./components/SystemDataBackupModal').then((m) => ({ default: m.SystemDataBackupModal })));
const SystemHealthModal = lazy(() => import('./components/SystemHealthModal').then((m) => ({ default: m.SystemHealthModal })));
const CustomMediaImportModal = lazy(() => import('./components/CustomMediaImportModal').then((m) => ({ default: m.CustomMediaImportModal })));
const CleanroomScenarioModal = lazy(() => import('./components/CleanroomScenarioModal').then((m) => ({ default: m.CleanroomScenarioModal })));
const ShiftHandoverTimedDrillModal = lazy(() => import('./components/ShiftHandoverTimedDrillModal').then((m) => ({ default: m.ShiftHandoverTimedDrillModal })));
import { ToastProvider } from './context/ToastContext';
import { useThreeDayAutoUpdate } from './hooks/useThreeDayAutoUpdate';
import { useOfflineStatus } from './hooks/useOfflineStatus';
import { useOfflineSync } from './hooks/useOfflineSync';
import { FAB_VOCAB } from './data/fabVocab';
import { AOI_HANDWRITTEN_VOCAB, AOI_HANDWRITTEN_LESSONS } from './data/aoiHandwrittenData';
import { getWordKKPhonetic } from './utils/wordDictionary';
import { auditAndConvertImportedData, sanitizeVocabItemToPublicSafe } from './utils/pipSanitizer';
import { ShiftSettings, PauseHotspot } from './types';
import { speakEnglish, speakChinese, cancelSpeech, useSpeechLatencyMonitor, globalAudioScheduler } from './utils/speech';
import { prefetchAdjacentLessons, warmupCommonFabVocabulary, scheduleIdleSafetyAudioPrefetch } from './utils/speechPrefetcher';
import { playClickSound, playSuccessChime, isSoundEnabled, setSoundEnabled } from './utils/audioEffects';
import { getStoredFontSize, applyFontSizeToDocument } from './utils/fontSize';
import { getStoredContrastMode, applyContrastModeToDocument, toggleContrastMode } from './utils/contrastMode';
import { CleanroomScenarioId, getStoredScenario, applyScenarioToDocument } from './utils/cleanroomScenario';
import { runStorageSelfHealing, runFullSystemDiagnostics } from './utils/systemSelfHeal';
import { pushLocalProgressToServer, queueAutoServerSync } from './utils/serverSyncService';
import { useScrollToTop } from './hooks/useScrollToTop';
import { loadSrsMap, rateLessonMemory, isLessonDueForReview, getDueLessonsCount, SrsCardState, MemoryRating } from './utils/srsScheduler';
import { Sparkles, ArrowRight, Cpu, Layers, BookOpen, FileText, Bookmark, Award, Activity, Play, Pause, Repeat, Filter, CheckCircle2, ShieldAlert, Zap, Clock, Flame, Waves, Timer, ChevronLeft, ChevronRight, Wand2, Gamepad2, Headphones, Upload, FolderOpen, Bot } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'daily' | 'shadowing' | 'drive' | 'vendors' | 'knowledge'>('daily');
  const [knowledgeSubTab, setKnowledgeSubTab] = useState<'vocab' | 'articles' | 'emergency' | 'scenario' | 'bookmarks' | 'tutor' | 'diagnostics'>('vocab');
  const [showAiGenerator, setShowAiGenerator] = useState<boolean>(false);

  const mainContainerRef = useRef<HTMLElement | null>(null);

  // Hook for 3-Day Auto Update System
  const {
    cycleNumber,
    daysLeft,
    hoursLeft,
    minutesLeft,
    secondsLeft,
    cycleProgressPercent,
    isUpdating: is3DayUpdating,
    threeDayBundle,
    triggerManualUpdate
  } = useThreeDayAutoUpdate();

  // Hook for Cleanroom Offline Cache & Network Instability Detection
  const offlineStatus = useOfflineStatus();

  // Hook for Offline Progress Sync Mechanism
  const offlineSync = useOfflineSync();

  // Hook for Speech Engine Latency & Pre-warning fallback
  const speechLatency = useSpeechLatencyMonitor();

  // Hook to automatically scroll window and main container to top when activeTab or sub-tabs change
  useScrollToTop(activeTab, knowledgeSubTab, mainContainerRef);

  const handleSetActiveTab = (tab: 'daily' | 'shadowing' | 'drive' | 'vendors' | 'knowledge', subTab?: string) => {
    cancelSpeech();
    if (isAutoPilot && tab !== 'daily') {
      setIsAutoPilot(false);
    }
    setActiveTab(tab);
    if (tab === 'knowledge' && subTab) {
      setKnowledgeSubTab(subTab as any);
    }
  };
  const [speechSpeed, setSpeechSpeedState] = useState<number>(() => getStoredGlobalSpeechSpeed(0.85));
  const setSpeechSpeed = (nextSpeed: number) => {
    const saved = saveGlobalSpeechSpeed(nextSpeed);
    setSpeechSpeedState(saved);
    try {
      localStorage.setItem('fse_speech_speed_updated_at', String(Date.now()));
      globalOfflineSpeechPlaylist.updateConfig({ speechSpeed: saved });
      queueAutoServerSync(2000);
    } catch {}
  };
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentDailyIndex, setCurrentDailyIndex] = useState<number>(0);
  const [bookmarkedLessons, setBookmarkedLessons] = useState<Lesson[]>([]);
  const [visitedLessonIds, setVisitedLessonIds] = useState<string[]>([]);
  const [readArticleIds, setReadArticleIds] = useState<string[]>([]);
  const [bookmarkedArticleIds, setBookmarkedArticleIds] = useState<string[]>([]);
  const [streakCount, setStreakCount] = useState<number>(3);
  const [isWaferPulseActive, setIsWaferPulseActive] = useState<boolean>(false);
  const [isCompact, setIsCompact] = useState<boolean>(true);
  const [isMinimal, setIsMinimal] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);

  // Auto-Pilot Cruise & Shift Planner State
  const [isAutoPilot, setIsAutoPilot] = useState<boolean>(false);
  const [autoPilotCountdown, setAutoPilotCountdown] = useState<number>(5);
  const [autoPilotMode, setAutoPilotMode] = useState<'english' | 'bilingual' | 'svo'>('english');
  const [autoPilotInterval, setAutoPilotInterval] = useState<number>(5);
  const [autoPilotRepeat, setAutoPilotRepeat] = useState<boolean>(false);
  const [isSpeakingInCruise, setIsSpeakingInCruise] = useState<boolean>(false);
  const [selectedShift, setSelectedShift] = useState<'all' | 'day' | 'night' | 'off'>('all');

  // Shift & Handover Reminder State
  const [shiftSettings, setShiftSettings] = useState<ShiftSettings>({
    shiftType: 'day',
    handoverTimeStr: '18:30',
    enableReminder: true,
    enableSoundAlert: true,
    reminderMinutesBefore: 60
  });

  // User Diagnostics & Habit State
  const [diagnostics, setDiagnostics] = useState<UserDiagnostics>({
    totalSentencesPracticed: 12,
    totalArticlesRead: 2,
    speechScoreAverage: 88,
    svoStats: {
      subjectErrors: 1,
      actionErrors: 3,
      bridgeErrors: 7,
      objectErrors: 2,
      totalAttempts: 25,
      correctAttempts: 18
    },
    primaryWeakness: '🌉 橋樑 (Bridge) 介系詞與連讀',
    learningHabitNote: '習慣在大夜班與交接前複習 [機台警報與 PM 指令]；對 [主角 S] 與 [東西 O] 熟練度最高，對帶介系詞的 [橋樑 Bridge] 連讀容易停頓。',
    masteredTopics: ['LOTO 工安程序', '真空幫浦 PM', '機台警報對答']
  });

  // Modals state
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState<boolean>(false);
  const [isSpeechModalOpen, setIsSpeechModalOpen] = useState<boolean>(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState<boolean>(false);
  const [isErrorCodeModalOpen, setIsErrorCodeModalOpen] = useState<boolean>(false);
  const [isDecomposerModalOpen, setIsDecomposerModalOpen] = useState<boolean>(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);
  const [isMatchGameModalOpen, setIsMatchGameModalOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isSystemHealthModalOpen, setIsSystemHealthModalOpen] = useState<boolean>(false);
  const [isCleanroomAmbienceModalOpen, setIsCleanroomAmbienceModalOpen] = useState<boolean>(false);
  const [isMediaImportModalOpen, setIsMediaImportModalOpen] = useState<boolean>(false);
  const [isHandoverDrillOpen, setIsHandoverDrillOpen] = useState<boolean>(false);
  const [customSpeechTarget, setCustomSpeechTarget] = useState<{ sentence: string; phonetic: string } | null>(null);
  const [importedVocab, setImportedVocab] = useState<VocabItem[]>(AOI_HANDWRITTEN_VOCAB);
  const [importedLessons, setImportedLessons] = useState<Lesson[]>(AOI_HANDWRITTEN_LESSONS);
  const [showOnlyImportedLessons, setShowOnlyImportedLessons] = useState<boolean>(false);
  const [showOnlyDueLessons, setShowOnlyDueLessons] = useState<boolean>(false);
  const [srsMap, setSrsMap] = useState<Record<string, SrsCardState>>(() => loadSrsMap());
  const [decomposerInitialSentence, setDecomposerInitialSentence] = useState<string>('');
  const [showDailyToolbox, setShowDailyToolbox] = useState<boolean>(false);

  // Cleanroom Scenario Atmosphere & Contrast State
  const [currentScenario, setCurrentScenario] = useState<CleanroomScenarioId>(() => getStoredScenario());
  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => getStoredContrastMode() === 'high-contrast');

  useEffect(() => {
    applyScenarioToDocument(currentScenario);
  }, [currentScenario]);

  useEffect(() => {
    applyContrastModeToDocument(isHighContrast ? 'high-contrast' : 'standard');
  }, [isHighContrast]);

  const handleSelectScenario = (newScenario: CleanroomScenarioId) => {
    setCurrentScenario(newScenario);
    applyScenarioToDocument(newScenario);
    if (newScenario === 'contrast') {
      setIsHighContrast(true);
      applyContrastModeToDocument('high-contrast');
    }
    window.dispatchEvent(new CustomEvent('cleanroom-scenario-change', { detail: newScenario }));
  };

  const handleToggleHighContrast = () => {
    const next = toggleContrastMode();
    const isNowHigh = next === 'high-contrast';
    setIsHighContrast(isNowHigh);
  };

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const currentDailyIndexRef = useRef(currentDailyIndex);
  currentDailyIndexRef.current = currentDailyIndex;
  const displayedLessonsRef = useRef<Lesson[]>([]);
  const isMountedRef = useRef<boolean>(true);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiDrawerRef = useRef<HTMLDivElement | null>(null);

  const anyModalOpen =
    isGuideOpen ||
    isCheatSheetOpen ||
    isSpeechModalOpen ||
    isBadgeModalOpen ||
    isErrorCodeModalOpen ||
    isDecomposerModalOpen ||
    isVoiceSettingsOpen ||
    isSearchModalOpen ||
    isEmergencyModalOpen ||
    isScenarioModalOpen ||
    isMatchGameModalOpen ||
    isShortcutsOpen ||
    isBackupModalOpen ||
    isSystemHealthModalOpen ||
    isCleanroomAmbienceModalOpen ||
    isMediaImportModalOpen ||
    isHandoverDrillOpen ||
    offlineStatus.isFlashcardsModalOpen;

  const anyModalOpenRef = useRef(anyModalOpen);
  anyModalOpenRef.current = anyModalOpen;

  // Polite idle low-bandwidth safety audio prefetch (skips saveData / slow networks, capped to 6 new clips)
  useEffect(() => {
    const safetyAudioItems = FAB_VOCAB.filter((v) => v.category === 'safety')
      .flatMap((v) => [
        ...(v.word ? [{ text: v.word, lang: 'en-US' as const }] : []),
        ...(v.exampleSentence ? [{ text: v.exampleSentence, lang: 'en-US' as const }] : [])
      ]);
    return scheduleIdleSafetyAudioPrefetch(safetyAudioItems, speechSpeed, 6);
  }, []);

  // Pause Auto-Pilot cruise automatically if user opens any modal overlay
  useEffect(() => {
    if (anyModalOpen && isAutoPilot) {
      setIsAutoPilot(false);
      cancelSpeech();
    }
  }, [anyModalOpen, isAutoPilot]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  // Global Keyboard Shortcuts (Cmd+K, ?, 1-4, M, B, Escape, ArrowLeft/Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox');

      // 1. 全域搜尋指令調色盤 (Cmd+K / Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
        return;
      }

      // 2. Escape: 關閉所有彈跳視窗
      if (e.key === 'Escape') {
        setIsSearchModalOpen(false);
        setIsShortcutsOpen(false);
        setIsCheatSheetOpen(false);
        setIsSpeechModalOpen(false);
        setIsBadgeModalOpen(false);
        setIsErrorCodeModalOpen(false);
        setIsDecomposerModalOpen(false);
        setIsVoiceSettingsOpen(false);
        setIsEmergencyModalOpen(false);
        setIsScenarioModalOpen(false);
        setIsMatchGameModalOpen(false);
        setIsGuideOpen(false);
        setIsBackupModalOpen(false);
        setIsSystemHealthModalOpen(false);
        setIsCleanroomAmbienceModalOpen(false);
        setIsMediaImportModalOpen(false);
        offlineStatus.closeOfflineFlashcards();
        return;
      }

      // 若在輸入框內打字或任何彈窗已開啟，不觸發單鍵快捷導航
      if (isInput || anyModalOpenRef.current || e.metaKey || e.ctrlKey || e.altKey) return;

      // 3. ? 鍵: 開啟快捷鍵指引
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // 4. M 鍵: 快速切換音效靜音
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        const currentSound = isSoundEnabled();
        setSoundEnabled(!currentSound);
        if (!currentSound) {
          playClickSound();
        }
        return;
      }

      // 5. 數字鍵 1-5: 快速切換頂層標籤頁
      if (e.key === '1') {
        e.preventDefault();
        handleSetActiveTab('daily');
      } else if (e.key === '2') {
        e.preventDefault();
        handleSetActiveTab('shadowing');
      } else if (e.key === '3') {
        e.preventDefault();
        handleSetActiveTab('drive');
      } else if (e.key === '4') {
        e.preventDefault();
        handleSetActiveTab('vendors');
      } else if (e.key === '5') {
        e.preventDefault();
        handleSetActiveTab('knowledge');
      }

      // 6. 方向鍵 Left / Right: 每日句型快速切換上一關 / 下一關
      if (activeTabRef.current === 'daily') {
        const total = displayedLessonsRef.current.length || 1;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          playClickSound();
          setCurrentDailyIndex((prev) => (prev - 1 + total) % total);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          playClickSound();
          setCurrentDailyIndex((prev) => (prev + 1) % total);
        }
      }

      // 7. P 鍵: 快速開啟當前句型口說實測 / R 鍵: 立即重聽當前句型
      if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        playClickSound();
        setIsSpeechModalOpen(true);
        return;
      }
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        const activeList = displayedLessonsRef.current;
        if (activeList.length > 0) {
          const idx = currentDailyIndexRef.current % activeList.length;
          const targetSentence = activeList[idx]?.english_sentence;
          if (targetSentence) {
            speakEnglish(targetSentence, getStoredGlobalSpeechSpeed(0.85));
          }
        }
        return;
      }

      // 8. B 鍵: 數據備份與系統健全診斷
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        playClickSound();
        setIsBackupModalOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSetActiveTab]);

  // Load state from LocalStorage on mount
  useEffect(() => {
    try {
      setTheme('dark');
      applyFontSizeToDocument(getStoredFontSize());
      applyContrastModeToDocument(getStoredContrastMode());

      const savedCompact = localStorage.getItem('fse_compact_mode');
      if (savedCompact === 'true') {
        setIsCompact(true);
      }

      const savedMinimal = localStorage.getItem('fse_minimal_mode');
      if (savedMinimal === 'true') {
        setIsMinimal(true);
      }

      const savedBookmarks = localStorage.getItem('fse_bookmarks');
      if (savedBookmarks) {
        try {
          const parsed = JSON.parse(savedBookmarks);
          if (Array.isArray(parsed)) setBookmarkedLessons(parsed);
        } catch {}
      }

      const savedVisited = localStorage.getItem('fse_visited_lessons');
      if (savedVisited) {
        try {
          const parsed = JSON.parse(savedVisited);
          if (Array.isArray(parsed)) setVisitedLessonIds(parsed);
        } catch {}
      }

      const savedReadArticles = localStorage.getItem('fse_read_articles');
      if (savedReadArticles) {
        try {
          const parsed = JSON.parse(savedReadArticles);
          if (Array.isArray(parsed)) setReadArticleIds(parsed);
        } catch {}
      }

      const savedBookmarkedArticles = localStorage.getItem('fse_bookmarked_articles');
      if (savedBookmarkedArticles) {
        try {
          const parsed = JSON.parse(savedBookmarkedArticles);
          if (Array.isArray(parsed)) setBookmarkedArticleIds(parsed);
        } catch {}
      }

      const savedDiag = localStorage.getItem('fse_user_diagnostics');
      if (savedDiag) {
        try {
          setDiagnostics(JSON.parse(savedDiag));
        } catch {}
      }

      const savedStreak = localStorage.getItem('fse_streak');
      if (savedStreak) {
        const parsed = parseInt(savedStreak, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          setStreakCount(parsed);
        } else {
          setStreakCount(3);
        }
      } else {
        localStorage.setItem('fse_streak', '3');
        setStreakCount(3);
      }

      const savedShift = localStorage.getItem('fse_shift_settings');
      if (savedShift) {
        try {
          setShiftSettings(JSON.parse(savedShift));
        } catch {}
      }

      const savedImportedVocab = localStorage.getItem('fse_imported_vocab');
      if (savedImportedVocab) {
        try {
          const parsed = JSON.parse(savedImportedVocab);
          if (Array.isArray(parsed)) {
            const customOnly = parsed.filter(
              (p: VocabItem) =>
                !String(p.id || '').startsWith('aoi-') &&
                !AOI_HANDWRITTEN_VOCAB.some((a) => a.word.toLowerCase() === String(p.word || '').toLowerCase())
            );
            const auditedVocab = auditAndConvertImportedData([...AOI_HANDWRITTEN_VOCAB, ...customOnly], []).vocab;
            setImportedVocab(auditedVocab);
            localStorage.setItem('fse_imported_vocab', JSON.stringify(auditedVocab));
          }
        } catch {}
      } else {
        localStorage.setItem('fse_imported_vocab', JSON.stringify(AOI_HANDWRITTEN_VOCAB));
      }

      const savedImportedLessons = localStorage.getItem('fse_imported_lessons');
      if (savedImportedLessons) {
        try {
          const parsed = JSON.parse(savedImportedLessons);
          if (Array.isArray(parsed)) {
            const customOnly = parsed.filter(
              (p: Lesson) =>
                !String(p.id || '').startsWith('aoi-') &&
                !AOI_HANDWRITTEN_LESSONS.some((a) => a.english_sentence === p.english_sentence)
            );
            const auditedLessons = auditAndConvertImportedData([], [...AOI_HANDWRITTEN_LESSONS, ...customOnly]).lessons;
            setImportedLessons(auditedLessons);
            localStorage.setItem('fse_imported_lessons', JSON.stringify(auditedLessons));
          }
        } catch {}
      } else {
        localStorage.setItem('fse_imported_lessons', JSON.stringify(AOI_HANDWRITTEN_LESSONS));
      }
    } catch (e) {
      console.warn("LocalStorage access failed:", e);
    }
  }, []);

  // 後台靜默自動化全系統自我修復、資料庫健全巡檢與伺服器雙向同步機制
  useEffect(() => {
    // 啟動時立即自動執行一次儲存自癒、全系統診斷與伺服器雲端同步
    runStorageSelfHealing();
    runFullSystemDiagnostics().catch(() => {});
    pushLocalProgressToServer().catch(() => {});

    // 網路連線恢復時自動雙向同步
    const handleOnlineSync = () => {
      pushLocalProgressToServer().catch(() => {});
    };
    window.addEventListener('online', handleOnlineSync);

    // 每 10 分鐘自動在背景守護巡檢與定時雲端同步一次
    const healTimer = setInterval(() => {
      runStorageSelfHealing();
      runFullSystemDiagnostics().catch(() => {});
      pushLocalProgressToServer().catch(() => {});
    }, 10 * 60 * 1000);

    return () => {
      window.removeEventListener('online', handleOnlineSync);
      clearInterval(healTimer);
    };
  }, []);

  // 同步記憶曲線 (SM-2) 狀態變更
  useEffect(() => {
    const refreshSrs = () => setSrsMap(loadSrsMap());
    window.addEventListener('fse-srs-updated', refreshSrs);
    window.addEventListener('storage', refreshSrs);
    return () => {
      window.removeEventListener('fse-srs-updated', refreshSrs);
      window.removeEventListener('storage', refreshSrs);
    };
  }, []);

  // 當伺服器雙向合併回傳更新紀錄時，即時同步更新前端 React 狀態（無須手動重整）
  useEffect(() => {
    const handleServerSynced = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const rec = detail?.record;
      if (!rec || !isMountedRef.current) return;

      if (Array.isArray(rec.bookmarks)) {
        setBookmarkedLessons((prev) => (rec.bookmarks.length > prev.length ? rec.bookmarks : prev));
      }
      if (Array.isArray(rec.visitedLessonIds)) {
        setVisitedLessonIds((prev) => (rec.visitedLessonIds.length > prev.length ? rec.visitedLessonIds : prev));
      }
      if (Array.isArray(rec.readArticleIds)) {
        setReadArticleIds((prev) => (rec.readArticleIds.length > prev.length ? rec.readArticleIds : prev));
      }
      if (Array.isArray(rec.bookmarkedArticleIds)) {
        setBookmarkedArticleIds((prev) => (rec.bookmarkedArticleIds.length > prev.length ? rec.bookmarkedArticleIds : prev));
      }
      if (typeof rec.streakCount === 'number') {
        setStreakCount((prev) => (rec.streakCount > prev ? rec.streakCount : prev));
      }
      if (rec.diagnostics && typeof rec.diagnostics === 'object') {
        setDiagnostics((prev) => {
          const remotePracticed = rec.diagnostics.totalSentencesPracticed || 0;
          const localPracticed = prev.totalSentencesPracticed || 0;
          if (remotePracticed > localPracticed) {
            return { ...prev, ...rec.diagnostics };
          }
          return prev;
        });
      }
    };

    window.addEventListener('fse-server-synced', handleServerSynced);
    return () => window.removeEventListener('fse-server-synced', handleServerSynced);
  }, []);

  const handleUpdateShiftSettings = (nextSettings: ShiftSettings) => {
    setShiftSettings(nextSettings);
    try {
      localStorage.setItem('fse_shift_settings', JSON.stringify(nextSettings));
      queueAutoServerSync(2500);
    } catch (e) {}
  };

  const handleSaveImportedData = useCallback((newVocab: VocabItem[], newLessons: Lesson[]) => {
    const audited = auditAndConvertImportedData(newVocab, newLessons);
    const sanitizedNewVocab = audited.vocab;
    const sanitizedNewLessons = audited.lessons;

    setImportedVocab((prev) => {
      const merged = [
        ...sanitizedNewVocab,
        ...prev.filter((p) => !sanitizedNewVocab.some((n) => n.word.toLowerCase() === p.word.toLowerCase())),
      ];
      try {
        localStorage.setItem('fse_imported_vocab', JSON.stringify(merged));
      } catch {}
      return merged;
    });

    setImportedLessons((prev) => {
      const merged = [
        ...sanitizedNewLessons,
        ...prev.filter((p) => !sanitizedNewLessons.some((n) => n.english_sentence === p.english_sentence)),
      ];
      try {
        localStorage.setItem('fse_imported_lessons', JSON.stringify(merged));
        queueAutoServerSync(1500);
      } catch {}
      return merged;
    });
  }, []);

  const handleUpdateImportedVocab = useCallback((updatedItem: VocabItem) => {
    const sanitizedItem = sanitizeVocabItemToPublicSafe(updatedItem).item;
    setImportedVocab((prev) => {
      const next = prev.map((v) => (v.id === sanitizedItem.id ? sanitizedItem : v));
      try {
        localStorage.setItem('fse_imported_vocab', JSON.stringify(next));
        queueAutoServerSync(1500);
      } catch {}
      return next;
    });
  }, []);

  const handleClearImportedData = useCallback(() => {
    setImportedVocab(AOI_HANDWRITTEN_VOCAB);
    setImportedLessons(AOI_HANDWRITTEN_LESSONS);
    setShowOnlyImportedLessons(false);
    try {
      localStorage.setItem('fse_imported_vocab', JSON.stringify(AOI_HANDWRITTEN_VOCAB));
      localStorage.setItem('fse_imported_lessons', JSON.stringify(AOI_HANDWRITTEN_LESSONS));
      queueAutoServerSync(1500);
    } catch {}
  }, []);

  const handleDeleteImportedVocab = useCallback((vocabId: string) => {
    setImportedVocab((prev) => {
      const next = prev.filter((v) => v.id !== vocabId);
      try {
        localStorage.setItem('fse_imported_vocab', JSON.stringify(next));
        queueAutoServerSync(1500);
      } catch {}
      return next;
    });
  }, []);

  const handleDeleteImportedLesson = useCallback((lessonId: string) => {
    setImportedLessons((prev) => {
      const next = prev.filter((l) => l.id !== lessonId);
      if (next.length === 0) setShowOnlyImportedLessons(false);
      try {
        localStorage.setItem('fse_imported_lessons', JSON.stringify(next));
        queueAutoServerSync(1500);
      } catch {}
      return next;
    });
  }, []);

  // Reactive PRESET_LESSONS synced with confirmed batch updates (local + server overrides)
  const [activePresetLessons, setActivePresetLessons] = useState<Lesson[]>(() => getActivePresetLessons());

  useEffect(() => {
    const refreshPresets = () => {
      setActivePresetLessons(getActivePresetLessons());
    };
    window.addEventListener(PRESET_LESSONS_UPDATED_EVENT, refreshPresets);
    window.addEventListener('storage', refreshPresets);

    fetchServerPresetLessonOverrides().then((serverOverrides) => {
      if (serverOverrides && Object.keys(serverOverrides).length > 0) {
        const patches = Object.values(serverOverrides) as PresetLessonPatch[];
        if (patches.length > 0) {
          applyPresetLessonBatchUpdates(patches);
        }
      }
    }).catch(() => {});

    return () => {
      window.removeEventListener(PRESET_LESSONS_UPDATED_EVENT, refreshPresets);
      window.removeEventListener('storage', refreshPresets);
    };
  }, []);

  // Merge activePresetLessons with importedLessons and 3-Day generated lessons if available
  const baseLessons = React.useMemo(() => {
    let list: Lesson[] = [...activePresetLessons];
    if (threeDayBundle?.lessons && threeDayBundle.lessons.length > 0) {
      const bundleLessons: Lesson[] = threeDayBundle.lessons.map((l, i) => ({
        id: l.id || `3d-gen-${i}`,
        scenario: l.scenario,
        english_sentence: l.english_sentence,
        chinese_translation: l.chinese_translation,
        components: l.components,
        phonetic_taiwan: l.phonetic_taiwan,
        memory_trick: l.memory_trick,
        category: '3day-auto-update',
        additional_context: l.additional_context
      }));
      list = [...bundleLessons, ...list];
    }
    if (importedLessons.length > 0) {
      list = [...importedLessons, ...list];
    }
    return list;
  }, [activePresetLessons, threeDayBundle, importedLessons]);

  const dueLessonsCount = React.useMemo(
    () => getDueLessonsCount(baseLessons, srsMap),
    [baseLessons, srsMap]
  );

  // Filter lessons based on selected shift, due review filter, or personal imported filter
  const filteredLessons = React.useMemo(() => {
    return baseLessons.filter((lesson) => {
      if (showOnlyDueLessons && !isLessonDueForReview(lesson.id, srsMap)) {
        return false;
      }
      if (showOnlyImportedLessons && importedLessons.length > 0) {
        return (
          lesson.category === 'custom-imported' ||
          importedLessons.some((il) => il.id === lesson.id || il.english_sentence === lesson.english_sentence)
        );
      }
      if (selectedShift === 'day') {
        return ['calibration', 'vacuum-pump', 'shift-handover', '3day-auto-update', 'custom-imported'].includes(lesson.category || '');
      }
      if (selectedShift === 'night') {
        return ['error-code', 'safety-loto', 'wafer-transfer', '3day-auto-update', 'custom-imported'].includes(lesson.category || '');
      }
      return true;
    });
  }, [baseLessons, showOnlyDueLessons, srsMap, showOnlyImportedLessons, importedLessons, selectedShift]);

  const displayedLessons = React.useMemo(
    () => (filteredLessons.length > 0 ? filteredLessons : baseLessons),
    [filteredLessons, baseLessons]
  );
  displayedLessonsRef.current = displayedLessons;

  // Keep currentDailyIndex within bounds whenever active list size changes
  useEffect(() => {
    if (displayedLessons.length > 0 && currentDailyIndex >= displayedLessons.length) {
      setCurrentDailyIndex(0);
    }
  }, [displayedLessons.length, currentDailyIndex]);

  // Real English sentence list for AI duplicate prevention
  const knownLessonSentences = React.useMemo(
    () => Array.from(new Set(baseLessons.map((l) => l.english_sentence).filter(Boolean))),
    [baseLessons]
  );

  // User custom-added vocabulary count for Header badge (excludes default 30 AOI preset)
  const customImportedVocabCount = React.useMemo(
    () => importedVocab.filter((v) => !String(v.id || '').startsWith('aoi-')).length,
    [importedVocab]
  );

  // 1. 全域半導體高頻術語與教材音訊閒置背景預熱
  useEffect(() => {
    warmupCommonFabVocabulary(baseLessons, speechSpeed);
  }, [baseLessons, speechSpeed]);

  // 2. 當切換教材 (currentDailyIndex) 或變更教材列表時，自動在背景預載下一個及前後句型
  useEffect(() => {
    if (displayedLessons && displayedLessons.length > 0) {
      prefetchAdjacentLessons(displayedLessons, currentDailyIndex, 3, speechSpeed);
    }
  }, [displayedLessons, currentDailyIndex, speechSpeed]);

  // Enhanced Deep Automation Auto-Pilot Cruise effect
  useEffect(() => {
    let countdownTimer: any = null;
    let stepTimer: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const cleanSvoSegment = (raw?: string) =>
      String(raw || '')
        .replace(/\s*[\(（\[【\{][^\)）\]\}]*[\)）\]\}]/g, '')
        .replace(/[\u4e00-\u9fa5]/g, '')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (isAutoPilot && activeTab === 'daily' && displayedLessons.length > 0) {
      const currentLesson = displayedLessons[currentDailyIndex % displayedLessons.length];
      if (!currentLesson) return;

      setIsSpeakingInCruise(true);
      setAutoPilotCountdown(autoPilotInterval);

      const executeSequence = () => {
        if (isCancelled) return;

        // Auto mark lesson as visited with server sync
        setVisitedLessonIds((prev) => {
          if (prev.includes(currentLesson.id)) return prev;
          const updated = [...prev, currentLesson.id];
          try {
            localStorage.setItem('fse_visited_lessons', JSON.stringify(updated));
            queueAutoServerSync(4000);
          } catch {}
          return updated;
        });

        const onFinishedSpeech = () => {
          if (isCancelled) return;
          setIsSpeakingInCruise(false);

          let remaining = autoPilotInterval;
          setAutoPilotCountdown(remaining);

          if (countdownTimer) clearInterval(countdownTimer);
          countdownTimer = setInterval(() => {
            if (isCancelled) return;
            remaining -= 1;
            setAutoPilotCountdown(remaining);

            if (remaining <= 0) {
              clearInterval(countdownTimer);
              if (autoPilotRepeat) {
                setIsSpeakingInCruise(true);
                executeSequence();
              } else {
                setCurrentDailyIndex((prev) => (prev + 1) % displayedLessons.length);
              }
            }
          }, 1000);
        };

        if (autoPilotMode === 'english') {
          const slowSpd = Math.max(0.7, Number((speechSpeed * 0.85).toFixed(2)));
          globalAudioScheduler.scheduleSequence(
            [
              { text: currentLesson.english_sentence, lang: 'en-US', rate: slowSpd, bufferAfterMs: 320 },
              { text: currentLesson.english_sentence, lang: 'en-US', rate: speechSpeed, bufferAfterMs: 180 }
            ],
            {
              interrupt: true,
              isCancelled: () => isCancelled,
              onSequenceEnd: onFinishedSpeech
            }
          );
        } else if (autoPilotMode === 'bilingual') {
          const slowSpd = Math.max(0.7, Number((speechSpeed * 0.85).toFixed(2)));
          const conciseZh = currentLesson.chinese_translation || currentLesson.scenario;
          globalAudioScheduler.scheduleSequence(
            [
              { text: currentLesson.english_sentence, lang: 'en-US', rate: slowSpd, bufferAfterMs: 280 },
              { text: conciseZh, lang: 'zh-TW', rate: 1.0, bufferAfterMs: 260 },
              { text: currentLesson.english_sentence, lang: 'en-US', rate: speechSpeed, bufferAfterMs: 180 }
            ],
            {
              interrupt: true,
              isCancelled: () => isCancelled,
              onSequenceEnd: onFinishedSpeech
            }
          );
        } else if (autoPilotMode === 'svo') {
          const slowSpd = Math.max(0.7, Number((speechSpeed * 0.85).toFixed(2)));
          const cleanSubject = cleanSvoSegment(currentLesson.components.subject);
          const cleanAction = cleanSvoSegment(currentLesson.components.action);
          const cleanBridge = cleanSvoSegment(currentLesson.components.bridge);
          const cleanObject = cleanSvoSegment(currentLesson.components.object);
          const svoText = [cleanSubject, cleanAction, cleanBridge, cleanObject].filter(Boolean).join(', ');
          globalAudioScheduler.scheduleSequence(
            [
              { text: currentLesson.english_sentence, lang: 'en-US', rate: slowSpd, bufferAfterMs: 320 },
              { text: svoText || currentLesson.english_sentence, lang: 'en-US', rate: slowSpd, bufferAfterMs: 300 },
              { text: currentLesson.english_sentence, lang: 'en-US', rate: speechSpeed, bufferAfterMs: 180 }
            ],
            {
              interrupt: true,
              isCancelled: () => isCancelled,
              onSequenceEnd: onFinishedSpeech
            }
          );
        }
      };

      executeSequence();
    } else {
      setIsSpeakingInCruise(false);
      setAutoPilotCountdown(autoPilotInterval);
    }

    return () => {
      isCancelled = true;
      if (countdownTimer) clearInterval(countdownTimer);
      if (stepTimer) clearTimeout(stepTimer);
      if (isAutoPilot) {
        cancelSpeech();
      }
    };
  }, [
    isAutoPilot,
    activeTab,
    currentDailyIndex,
    autoPilotMode,
    autoPilotInterval,
    autoPilotRepeat,
    speechSpeed,
    displayedLessons.length,
    showOnlyImportedLessons
  ]);

  const handleMarkArticleRead = (artId: string) => {
    setReadArticleIds((prev) => {
      if (prev.includes(artId)) return prev;
      const updated = [...prev, artId];
      try {
        localStorage.setItem('fse_read_articles', JSON.stringify(updated));
      } catch (e) {}

      // Update total articles read count
      setDiagnostics((diag) => {
        const next = { ...diag, totalArticlesRead: updated.length };
        try {
          localStorage.setItem('fse_user_diagnostics', JSON.stringify(next));
          queueAutoServerSync(2500);
        } catch (e) {}
        return next;
      });

      return updated;
    });
  };

  const handleToggleBookmarkArticle = (artId: string) => {
    setBookmarkedArticleIds((prev) => {
      const exists = prev.includes(artId);
      const updated = exists ? prev.filter((id) => id !== artId) : [...prev, artId];
      try {
        localStorage.setItem('fse_bookmarked_articles', JSON.stringify(updated));
        queueAutoServerSync(2500);
      } catch (e) {}
      return updated;
    });
  };

  const handleSvoAttempt = (isCorrect: boolean, failedType?: 'subject' | 'action' | 'bridge' | 'object') => {
    setDiagnostics((prev) => {
      const stats = { ...prev.svoStats };
      stats.totalAttempts += 1;
      if (isCorrect) {
        stats.correctAttempts += 1;
      } else if (failedType) {
        if (failedType === 'subject') stats.subjectErrors += 1;
        if (failedType === 'action') stats.actionErrors += 1;
        if (failedType === 'bridge') stats.bridgeErrors += 1;
        if (failedType === 'object') stats.objectErrors += 1;
      }

      // Re-evaluate primary weakness
      const errs = [
        { name: '橋樑 (Bridge) 介系詞與連讀', count: stats.bridgeErrors },
        { name: '動作 (Verb) 工程動詞', count: stats.actionErrors },
        { name: '東西 (Object) 專有名詞', count: stats.objectErrors },
        { name: '主角 (Subject) 人稱與指稱', count: stats.subjectErrors }
      ];
      errs.sort((a, b) => b.count - a.count);

      const nextDiag: UserDiagnostics = {
        ...prev,
        svoStats: stats,
        totalSentencesPracticed: prev.totalSentencesPracticed + 1,
        primaryWeakness: errs[0].name
      };

      try {
        localStorage.setItem('fse_user_diagnostics', JSON.stringify(nextDiag));
        queueAutoServerSync(3500);
      } catch (e) {}
      return nextDiag;
    });
  };

  const handleRecordPauseHotspot = useCallback((
    category: 'svo' | 'speech',
    segment: string,
    pauseMs: number,
    _sentenceText?: string
  ) => {
    setDiagnostics((prev) => {
      const existing = prev.pauseHotspots || {
        totalHesitations: 0,
        avgHesitationMs: 450,
        svoPauseIndex: 35,
        speechPauseIndex: 40,
        hotspots: []
      };

      const newTotalHesitations = existing.totalHesitations + 1;
      const newAvgHesitation = Math.round(
        (existing.avgHesitationMs * existing.totalHesitations + pauseMs) / newTotalHesitations
      );

      // Adjust SVO or speech pause index
      const deltaIndex = Math.min(15, Math.max(3, Math.round(pauseMs / 100)));
      const newSvoIndex = category === 'svo'
        ? Math.min(100, Math.max(10, existing.svoPauseIndex + (pauseMs > 600 ? deltaIndex : -2)))
        : existing.svoPauseIndex;
      const newSpeechIndex = category === 'speech'
        ? Math.min(100, Math.max(10, existing.speechPauseIndex + (pauseMs > 600 ? deltaIndex : -2)))
        : existing.speechPauseIndex;

      // Find or create hotspot
      const currentHotspots = [...existing.hotspots];
      const existingIdx = currentHotspots.findIndex(h => h.segment.includes(segment) || segment.includes(h.segment));
      
      const severity: 'low' | 'medium' | 'high' = pauseMs > 800 ? 'high' : pauseMs > 450 ? 'medium' : 'low';
      
      let recommendation = '發音與語序掌握流暢。';
      if (category === 'svo') {
        recommendation = pauseMs > 600
          ? `積木組裝在「${segment}」思考猶豫超過 ${pauseMs}ms，建議多複習該結構的黃金公式。`
          : `「${segment}」組裝迅速，掌握度高。`;
      } else {
        recommendation = pauseMs > 600
          ? `朗讀在「${segment}」出現 ${pauseMs}ms 換氣停頓，建議使用美式弱讀與連音滑過。`
          : `「${segment}」發音換氣自然。`;
      }

      if (existingIdx >= 0) {
        const item = currentHotspots[existingIdx];
        const newCount = item.pauseCount + 1;
        const newAvg = Math.round((item.averagePauseMs * item.pauseCount + pauseMs) / newCount);
        currentHotspots[existingIdx] = {
          ...item,
          pauseCount: newCount,
          averagePauseMs: newAvg,
          severity: newAvg > 800 ? 'high' : newAvg > 450 ? 'medium' : 'low',
          recommendation
        };
      } else {
        currentHotspots.push({
          segment,
          category,
          averagePauseMs: pauseMs,
          pauseCount: 1,
          severity,
          recommendation
        });
      }

      const updatedDiag: UserDiagnostics = {
        ...prev,
        pauseHotspots: {
          totalHesitations: newTotalHesitations,
          avgHesitationMs: newAvgHesitation,
          svoPauseIndex: newSvoIndex,
          speechPauseIndex: newSpeechIndex,
          hotspots: currentHotspots
        }
      };

      try {
        localStorage.setItem('fse_user_diagnostics', JSON.stringify(updatedDiag));
        queueAutoServerSync(3500);
      } catch (e) {}
      return updatedDiag;
    });
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('fse_theme', next);
      } catch (e) {}
      return next;
    });
  };

  const toggleCompactMode = () => {
    setIsCompact((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('fse_compact_mode', next.toString());
      } catch (e) {}
      return next;
    });
  };

  const toggleMinimalMode = () => {
    setIsMinimal((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('fse_minimal_mode', next.toString());
      } catch (e) {}
      return next;
    });
  };

  const handleMarkVisited = useCallback((lessonId: string) => {
    setVisitedLessonIds((prev) => {
      if (prev.includes(lessonId)) return prev;
      const updated = [...prev, lessonId];
      try {
        localStorage.setItem('fse_visited_lessons', JSON.stringify(updated));
        queueAutoServerSync(4000);
      } catch (e) {
        console.warn("Failed saving visited lessons:", e);
      }
      return updated;
    });
  }, []);

  const handleRateMemory = useCallback((lessonId: string, rating: MemoryRating) => {
    const { map: updatedMap } = rateLessonMemory(lessonId, rating);
    setSrsMap(updatedMap);
    handleMarkVisited(lessonId);
    setDiagnostics((prev) => {
      const nextDiag: UserDiagnostics = {
        ...prev,
        totalSentencesPracticed: (prev.totalSentencesPracticed || 0) + 1
      };
      try {
        localStorage.setItem('fse_user_diagnostics', JSON.stringify(nextDiag));
      } catch {}
      return nextDiag;
    });
    queueAutoServerSync(2500);
  }, [handleMarkVisited]);

  const handleToggleBookmark = useCallback((lesson: Lesson) => {
    setBookmarkedLessons((prev) => {
      const exists = prev.some((l) => l.id === lesson.id || l.english_sentence === lesson.english_sentence);
      let updated: Lesson[];
      if (exists) {
        updated = prev.filter((l) => l.id !== lesson.id && l.english_sentence !== lesson.english_sentence);
      } else {
        updated = [lesson, ...prev];
      }
      try {
        localStorage.setItem('fse_bookmarks', JSON.stringify(updated));
        queueAutoServerSync(2000);
      } catch (e) {
        console.warn("Failed saving bookmarks:", e);
      }
      return updated;
    });
  }, []);

  const handleGoalCompleted = () => {
    setIsWaferPulseActive(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      pulseTimerRef.current = null;
      if (isMountedRef.current) setIsWaferPulseActive(false);
    }, 2000);

    setStreakCount((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem('fse_streak', next.toString());
        queueAutoServerSync(2000);
      } catch (e) {
        console.warn("Failed saving streak:", e);
      }

      // Trigger Badge Modal on milestone thresholds (3, 5, 7, 10)
      if ([3, 5, 7, 10].includes(next)) {
        if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
        badgeTimerRef.current = setTimeout(() => {
          badgeTimerRef.current = null;
          if (isMountedRef.current) setIsBadgeModalOpen(true);
        }, 600);
      }

      return next;
    });
  };

  const currentDailyLesson = displayedLessons[currentDailyIndex % displayedLessons.length] || PRESET_LESSONS[0];
  const isDailyBookmarked = currentDailyLesson ? bookmarkedLessons.some((l) => l.id === currentDailyLesson.id || l.english_sentence === currentDailyLesson.english_sentence) : false;
  const isDailyVisited = currentDailyLesson ? visitedLessonIds.includes(currentDailyLesson.id) : false;

  return (
    <ToastProvider>
      <div 
        data-cleanroom-scenario={currentScenario}
        data-contrast-mode={isHighContrast ? 'high-contrast' : 'standard'}
        className={`min-h-screen bg-cleanroom-grid flex flex-col font-sans selection:bg-yellow-400 selection:text-indigo-950 relative overflow-x-hidden transition-all duration-300 w-full max-w-full strict-container ${
          theme === 'light' ? 'theme-light bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
        } ${isHighContrast ? 'cleanroom-high-contrast' : ''} ${isCompact ? 'compact-mode' : ''}`}>
        
        {/* Wafer Circuit Ambient Particles & Burst Effect */}
        <WaferCircuitParticles isTriggered={isWaferPulseActive} scenario={currentScenario} />

        {/* Header Bar */}
        <Header
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          bookmarkCount={bookmarkedLessons.length}
          importedCount={importedVocab.length}
          badgeImportedCount={customImportedVocabCount}
          onOpenSystemHealth={() => setIsSystemHealthModalOpen(true)}
          onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
          isOffline={offlineStatus.isOffline || offlineStatus.isSimulatedOffline}
          onOpenOfflineModal={offlineStatus.openOfflineFlashcards}
          onOpenSearchModal={() => setIsSearchModalOpen(true)}
          onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
          onOpenScenarioModal={() => setIsScenarioModalOpen(true)}
          onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
          onOpenKeyboardShortcuts={() => setIsShortcutsOpen(true)}
          onOpenDecomposerModal={() => setIsDecomposerModalOpen(true)}
          onOpenMediaImportModal={() => setIsMediaImportModalOpen(true)}
        />

      {/* Cleanroom Offline Cache Preload Prompt Banner */}
      <OfflineCachePromptBanner
        isVisible={offlineStatus.showOfflinePrompt}
        isOffline={offlineStatus.isOffline}
        isSimulatedOffline={offlineStatus.isSimulatedOffline}
        reviewedCount={offlineStatus.reviewedVocabIds.length}
        totalVocabCount={FAB_VOCAB.length}
        onOpenFlashcards={offlineStatus.openOfflineFlashcards}
        onDismiss={offlineStatus.dismissOfflinePrompt}
        onToggleSimulate={offlineStatus.toggleSimulatedOffline}
      />

      {/* Main Container with Motion Animation Transitions */}
      <main ref={mainContainerRef} className={`flex-1 max-w-6xl w-full mx-auto transition-all min-w-0 ${
        isCompact ? 'px-2.5 sm:px-5 pt-2 pb-18 md:pb-4 space-y-2' : 'px-3 sm:px-5 pt-2.5 sm:pt-4 pb-20 md:pb-5 space-y-2.5'
      }`}>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="w-full min-w-0 max-w-full"
          >
            {/* Tab 1: Daily Featured Cleanroom Lesson */}
            {activeTab === 'daily' && (
              <div className="w-full min-w-0 space-y-2.5">
                
                {/* Minimal Mode Active Banner */}
                {isMinimal && (
                  <div className="bg-cyan-950/80 border border-cyan-500/40 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-cyan-200 backdrop-blur-md break-words">
                    <span className="font-bold">極簡專注模式</span>
                    <button
                      onClick={toggleMinimalMode}
                      className="text-cyan-300 hover:text-white font-bold cursor-pointer shrink-0 ml-2 px-2 py-0.5 rounded-lg bg-cyan-500/15"
                    >
                      退出
                    </button>
                  </div>
                )}

                {/* Daily Readiness Summary Strip (Clean Unboxed Editorial Metadata) */}
                {!isMinimal && (
                  <div className="px-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-mono text-slate-400 tabular-nums">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                        <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>連續 {streakCount} 天</span>
                      </span>
                      <span className="text-slate-700">·</span>
                      <span>
                        今日進度 <strong className="text-slate-200">{visitedLessonIds.length}</strong>/{baseLessons.length} 關
                      </span>
                      <span className="text-slate-700">·</span>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setShowOnlyDueLessons((prev) => !prev);
                          setCurrentDailyIndex(0);
                        }}
                        className={`cursor-pointer transition-colors ${
                          showOnlyDueLessons
                            ? 'text-amber-300 font-black underline underline-offset-4'
                            : dueLessonsCount > 0
                            ? 'text-cyan-300 hover:text-cyan-200 font-bold'
                            : 'text-emerald-400 font-bold'
                        }`}
                        title="點擊切換只練習待複習關卡"
                      >
                        {dueLessonsCount > 0 ? `待複習 ${dueLessonsCount} 句` : '今日記憶已清空'}
                      </button>
                      <span className="text-slate-700 hidden sm:inline">·</span>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          handleSetActiveTab('knowledge', 'bookmarks');
                        }}
                        className="hidden sm:inline text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        收藏 {bookmarkedLessons.length} 句
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setIsHandoverDrillOpen(true);
                        }}
                        className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Timer className="w-3.5 h-3.5 shrink-0" />
                        <span>60s 交接考核</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          handleSetActiveTab('knowledge', 'tutor');
                        }}
                        className="text-emerald-300 hover:text-emerald-200 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Bot className="w-3.5 h-3.5 shrink-0" />
                        <span>AI 教練提問</span>
                      </button>
                    </div>
                  </div>
                )}

                {showOnlyDueLessons && filteredLessons.length === 0 && (
                  <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 text-xs text-emerald-200">
                    <span>所有句型皆已通過目前複習排程，已為您自動切換回完整教材檢視。</span>
                    <button
                      type="button"
                      onClick={() => setShowOnlyDueLessons(false)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 font-bold shrink-0 cursor-pointer"
                    >
                      顯示全部
                    </button>
                  </div>
                )}

                {/* Lesson Card */}
                <LessonCard
                  lesson={currentDailyLesson}
                  speechSpeed={speechSpeed}
                  isBookmarked={isDailyBookmarked}
                  onToggleBookmark={handleToggleBookmark}
                  isVisited={isDailyVisited}
                  onMarkVisited={handleMarkVisited}
                  onNextLesson={() => setCurrentDailyIndex((prev) => (prev + 1) % displayedLessons.length)}
                  onPrevLesson={() => setCurrentDailyIndex((prev) => (prev - 1 + displayedLessons.length) % displayedLessons.length)}
                  currentIndex={currentDailyIndex % Math.max(1, displayedLessons.length)}
                  totalLessons={displayedLessons.length}
                  allLessons={displayedLessons}
                  visitedLessonIds={visitedLessonIds}
                  onSelectLessonIndex={(idx) => setCurrentDailyIndex(idx)}
                  onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
                  cycleNumber={cycleNumber}
                  daysLeft={daysLeft}
                  hoursLeft={hoursLeft}
                  minutesLeft={minutesLeft}
                  onRefreshQuestions={triggerManualUpdate}
                  disableGlobalShortcuts={anyModalOpen}
                  srsState={currentDailyLesson ? srsMap[currentDailyLesson.id] : undefined}
                  onRateMemory={handleRateMemory}
                />

                {/* Cleanroom Bottom Action Bar */}
                {!isMinimal && (
                  <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl px-3 sm:px-3.5 py-2.5 sm:py-3 space-y-2.5 shadow-xl shadow-black/30 backdrop-blur-md">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2">
                      {/* Left: Auto-Pilot Cruise & Imported Filter */}
                      <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
                        <button
                          type="button"
                          aria-pressed={isAutoPilot}
                          onClick={() => {
                            playClickSound();
                            setIsAutoPilot((prev) => !prev);
                          }}
                          className={`min-h-[38px] px-2 sm:px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer border whitespace-nowrap active:scale-95 tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                            isAutoPilot
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20'
                              : 'bg-slate-950/90 hover:bg-slate-800 text-cyan-200 border-slate-700/80 hover:border-cyan-400/50'
                          }`}
                          title="免動手自動巡航朗讀所有關卡句型"
                        >
                          {isAutoPilot ? <Pause className="w-3.5 h-3.5 shrink-0" /> : <Headphones className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                          <span>{isAutoPilot ? `連播 (${isSpeakingInCruise ? '讀' : `${autoPilotCountdown}s`})` : '自動連播'}</span>
                        </button>

                        <button
                          type="button"
                          aria-pressed={showOnlyDueLessons}
                          onClick={() => {
                            playClickSound();
                            setShowOnlyDueLessons((prev) => !prev);
                            setCurrentDailyIndex(0);
                          }}
                          className={`min-h-[38px] px-2 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border whitespace-nowrap active:scale-95 tabular-nums flex items-center justify-center gap-1 sm:gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                            showOnlyDueLessons
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md shadow-amber-500/20'
                              : 'bg-slate-950/90 text-amber-200 border-slate-700/80 hover:bg-slate-800 hover:border-amber-400/50'
                          }`}
                          title="依 SM-2 記憶曲線篩選目前需要複習的句型"
                        >
                          <Clock className={`w-3.5 h-3.5 shrink-0 ${showOnlyDueLessons ? 'text-slate-950' : 'text-amber-400'}`} />
                          <span>
                            {showOnlyDueLessons
                              ? `複習 (${filteredLessons.length})`
                              : `待複習 (${dueLessonsCount})`}
                          </span>
                        </button>

                        <button
                          type="button"
                          aria-pressed={showOnlyImportedLessons}
                          onClick={() => {
                            playClickSound();
                            if (importedLessons.length === 0) {
                              setIsMediaImportModalOpen(true);
                              return;
                            }
                            setShowOnlyImportedLessons((prev) => !prev);
                            setCurrentDailyIndex(0);
                          }}
                          className={`min-h-[38px] px-2 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border whitespace-nowrap active:scale-95 tabular-nums flex items-center justify-center gap-1 sm:gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                            showOnlyImportedLessons && importedLessons.length > 0
                              ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black shadow-md shadow-cyan-500/20'
                              : 'bg-slate-950/90 text-cyan-200 border-slate-700/80 hover:bg-slate-800 hover:border-cyan-400/50'
                          }`}
                          title={importedLessons.length > 0 ? '切換僅練習導入教材或全部教材' : '尚無導入教材，點擊立即導入'}
                        >
                          <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${showOnlyImportedLessons ? 'text-slate-950' : 'text-cyan-400'}`} />
                          <span>
                            {importedLessons.length === 0
                              ? '導入 (0)'
                              : showOnlyImportedLessons
                              ? `導入 (${importedLessons.length})`
                              : `導入 (${importedLessons.length})`}
                          </span>
                        </button>
                      </div>

                      {isAutoPilot && (
                        <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-950/95 p-1 rounded-xl border border-slate-700/80 flex-wrap w-full sm:w-auto">
                          {[
                            { id: 'english', label: '純英' },
                            { id: 'bilingual', label: '雙語' },
                            { id: 'svo', label: 'SVO' }
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              aria-pressed={autoPilotMode === m.id}
                              onClick={() => {
                                playClickSound();
                                setAutoPilotMode(m.id as any);
                              }}
                              className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                                autoPilotMode === m.id
                                  ? 'bg-cyan-400 text-slate-950 font-black'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            aria-pressed={autoPilotRepeat}
                            onClick={() => {
                              playClickSound();
                              setAutoPilotRepeat((prev) => !prev);
                            }}
                            className={`min-h-[30px] px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                              autoPilotRepeat
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="單句循環模式"
                          >
                            <Repeat className="w-3 h-3 shrink-0" />
                            <span>循環</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              setAutoPilotInterval((prev) => (prev === 3 ? 5 : prev === 5 ? 8 : 3));
                            }}
                            className="min-h-[30px] px-2 py-1 rounded-lg text-[11px] font-mono font-bold text-cyan-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 cursor-pointer whitespace-nowrap tabular-nums"
                            title="切換每句切換間隔秒數 (3s / 5s / 8s)"
                          >
                            間隔 {autoPilotInterval}s
                          </button>
                        </div>
                      )}

                      {/* Right: Primary AI Toggle + Collapsible Toolbox Toggle */}
                      <div className="grid grid-cols-2 sm:flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          aria-expanded={showAiGenerator}
                          onClick={() => {
                            playClickSound();
                            setShowAiGenerator((prev) => {
                              const next = !prev;
                              if (next) {
                                if (scrollTimerRef.current) {
                                  clearTimeout(scrollTimerRef.current);
                                }
                                scrollTimerRef.current = setTimeout(() => {
                                  scrollTimerRef.current = null;
                                  aiDrawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }, 120);
                              }
                              return next;
                            });
                          }}
                          className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                            showAiGenerator
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md shadow-amber-500/20'
                              : 'bg-slate-950/90 hover:bg-slate-800 text-amber-300 border-slate-700/80 hover:border-amber-400/50'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>{showAiGenerator ? '收起生成' : 'AI 生成'}</span>
                        </button>

                        <button
                          type="button"
                          aria-expanded={showDailyToolbox}
                          onClick={() => {
                            playClickSound();
                            setShowDailyToolbox((prev) => !prev);
                          }}
                          className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                            showDailyToolbox
                              ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black shadow-md shadow-cyan-500/20'
                              : 'bg-slate-950/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-cyan-400/40'
                          }`}
                        >
                          <span>工具箱 {showDailyToolbox ? '▴' : '▾'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Secondary Tools Drawer */}
                    {showDailyToolbox && (
                      <div className="pt-2.5 border-t border-slate-800/90 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setIsMediaImportModalOpen(true);
                          }}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Upload className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>導入單音</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setIsDecomposerModalOpen(true);
                          }}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-700/80 hover:border-amber-400/50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>AI 拆句</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setIsErrorCodeModalOpen(true);
                          }}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-rose-300 border border-slate-700/80 hover:border-rose-400/50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Cpu className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>警報交接</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setIsMatchGameModalOpen(true);
                          }}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-slate-700/80 hover:border-emerald-400/50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Gamepad2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>術語配對</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setIsScenarioModalOpen(true);
                          }}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-slate-700/80 hover:border-indigo-400/50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>情境闖關</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            handleSetActiveTab('knowledge', 'bookmarks');
                          }}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 hover:border-cyan-400/50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>收藏 ({bookmarkedLessons.length})</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Expandable AI Custom Scenario Lesson Generator */}
                <AnimatePresence>
                  {showAiGenerator && !isMinimal && (
                    <motion.div
                      ref={aiDrawerRef}
                      key="ai-generator-drawer"
                      initial={{ opacity: 0, y: -8, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.99 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="pt-1 gpu-smooth"
                    >
                      <Suspense fallback={<div className="p-6 text-center text-xs text-slate-400">載入情境生成器...</div>}>
                        <AiLessonGenerator
                          speechSpeed={speechSpeed}
                          bookmarkedIds={bookmarkedLessons.map((b) => b.id)}
                          onToggleBookmark={handleToggleBookmark}
                          avoidSentences={knownLessonSentences}
                          onSaveToDeck={(newLesson) => handleSaveImportedData([], [newLesson])}
                        />
                      </Suspense>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Tab 2: AI Speech Shadowing & Fluency Evaluation (PRO) */}
            {activeTab === 'shadowing' && (
              <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">載入口說跟讀演練模組...</div>}>
                <CleanroomSpeechShadowing
                  lessons={displayedLessons}
                  onShadowingScored={({ score: scoredValue, averageScore }) => {
                    if (diagnostics) {
                      const updatedDiag = {
                        ...diagnostics,
                        speechScoreAverage: averageScore,
                        totalSentencesPracticed: (diagnostics.totalSentencesPracticed || 0) + 1,
                        totalXp: (diagnostics.totalXp || 0) + (scoredValue >= 80 ? 15 : 5),
                      };
                      setDiagnostics(updatedDiag);
                      try { localStorage.setItem('fse_user_diagnostics', JSON.stringify(updatedDiag)); } catch {}
                    }
                  }}
                />
              </Suspense>
            )}

            {/* Tab 3: Hands-Free Commute & Cleanroom Audio Player (AUDIO) */}
            {activeTab === 'drive' && (
              <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">載入通勤免持聽力播放器...</div>}>
                <DriveModeTab
                  lessons={displayedLessons}
                  speechSpeed={speechSpeed}
                  setSpeechSpeed={setSpeechSpeed}
                  bookmarkedLessons={bookmarkedLessons}
                  onToggleBookmark={handleToggleBookmark}
                />
              </Suspense>
            )}

            {/* Tab 4: Fab Vendor & Equipment Deep-Dive Hub (NEW) */}
            {activeTab === 'vendors' && (
              <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">載入設備大廠術語專區...</div>}>
                <FabVendorEquipmentHub />
              </Suspense>
            )}

            {/* Tab 5: Fab Knowledge & Diagnostics Bank */}
            {activeTab === 'knowledge' && (
              <div className="space-y-2 w-full min-w-0">
                {/* Cleanroom Knowledge Subtab Console Bar */}
                <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-1.5 w-full backdrop-blur-md shadow-lg overflow-hidden litho-laser-line">
                  <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-7 gap-1 sm:gap-1.5 w-full relative">
                    {[
                      { id: 'vocab', label: '單字', icon: BookOpen, count: FAB_VOCAB.length + importedVocab.length },
                      { id: 'articles', label: '長文', icon: FileText, count: null },
                      { id: 'emergency', label: 'SOS', icon: ShieldAlert, count: null },
                      { id: 'scenario', label: '闖關', icon: Zap, count: null },
                      { id: 'bookmarks', label: '收藏', icon: Bookmark, count: bookmarkedLessons.length },
                      { id: 'tutor', label: 'AI教練', icon: Bot, count: null },
                      { id: 'diagnostics', label: '診斷', icon: Activity, count: null }
                    ].map((sub) => {
                      const isSelected = knowledgeSubTab === sub.id;
                      const Icon = sub.icon;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            playClickSound();
                            setKnowledgeSubTab(sub.id as any);
                          }}
                          className={`relative py-2 px-1.5 sm:py-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer select-none group min-w-0 ${
                            isSelected
                              ? 'text-slate-950 font-black shadow-md'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                          }`}
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="activeKnowledgeSubTabPill"
                              className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-400 rounded-xl shadow-md shadow-cyan-500/25 z-0 ring-1 ring-cyan-300"
                              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-1 min-w-0">
                            <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${isSelected ? 'text-slate-950 stroke-[2.5]' : 'text-slate-400 group-hover:text-cyan-300'}`} />
                            <span className="tracking-tight">{sub.label}</span>
                            {sub.count !== null && (
                              <span className={`hidden sm:inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded leading-none shrink-0 tabular-nums ${
                                isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {sub.count}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={knowledgeSubTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full min-w-0 gpu-smooth"
                  >
                    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">載入無塵室知識庫模組...</div>}>
                    {knowledgeSubTab === 'vocab' && (
                      <FabVocabBank
                        speechSpeed={speechSpeed}
                        diagnostics={diagnostics}
                        autoVocab={threeDayBundle?.vocab}
                        importedVocab={importedVocab}
                        onOpenMediaImportModal={() => setIsMediaImportModalOpen(true)}
                        onUpdateDiagnostics={(nextDiag) => {
                          setDiagnostics(nextDiag);
                          try { localStorage.setItem('fse_user_diagnostics', JSON.stringify(nextDiag)); } catch (e) {}
                        }}
                      />
                    )}

                    {knowledgeSubTab === 'articles' && (
                      <CleanroomArticlesTab
                        speechSpeed={speechSpeed}
                        autoArticles={threeDayBundle?.articles}
                        readArticleIds={readArticleIds}
                        onMarkArticleRead={(id) => {
                          if (!readArticleIds.includes(id)) {
                            const nextRead = [...readArticleIds, id];
                            setReadArticleIds(nextRead);
                            try { localStorage.setItem('fse_read_articles', JSON.stringify(nextRead)); } catch (e) {}
                            if (diagnostics) {
                              const updatedDiag = {
                                ...diagnostics,
                                totalArticlesRead: nextRead.length
                              };
                              setDiagnostics(updatedDiag);
                              try { localStorage.setItem('fse_user_diagnostics', JSON.stringify(updatedDiag)); } catch (e) {}
                            }
                          }
                        }}
                        bookmarkedArticleIds={bookmarkedArticleIds}
                        onToggleBookmarkArticle={(id) => {
                          const nextBm = bookmarkedArticleIds.includes(id)
                            ? bookmarkedArticleIds.filter(b => b !== id)
                            : [...bookmarkedArticleIds, id];
                          setBookmarkedArticleIds(nextBm);
                          try { localStorage.setItem('fse_bookmarked_articles', JSON.stringify(nextBm)); } catch (e) {}
                        }}
                      />
                    )}

                    {knowledgeSubTab === 'emergency' && (
                      <FabEmergencySection
                        speechSpeed={speechSpeed}
                        autoDrills={threeDayBundle?.emergencyErrorCodeDrills}
                      />
                    )}

                    {knowledgeSubTab === 'scenario' && (
                      <FabScenarioSection
                        speechSpeed={speechSpeed}
                        onScenarioCompleted={(score) => {
                          if (diagnostics) {
                            const updatedDiag = {
                              ...diagnostics,
                              totalXp: (diagnostics.totalXp || 0) + score
                            };
                            setDiagnostics(updatedDiag);
                            try { localStorage.setItem('fse_user_diagnostics', JSON.stringify(updatedDiag)); } catch (e) {}
                          }
                        }}
                      />
                    )}

                    {knowledgeSubTab === 'bookmarks' && (
                      <BookmarksTab
                        bookmarkedLessons={bookmarkedLessons}
                        speechSpeed={speechSpeed}
                        onToggleBookmark={handleToggleBookmark}
                        visitedLessonIds={visitedLessonIds}
                        onMarkVisited={handleMarkVisited}
                        onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
                        onNavigateDaily={() => handleSetActiveTab('daily')}
                        srsMap={srsMap}
                        onRateMemory={handleRateMemory}
                        onSendToDriveBookmarks={() => {
                          try {
                            localStorage.setItem('fse_drive_pending_category', 'bookmarks');
                          } catch {}
                          window.dispatchEvent(new CustomEvent('fse-drive-select-category', { detail: { category: 'bookmarks' } }));
                          handleSetActiveTab('drive');
                        }}
                      />
                    )}

                    {knowledgeSubTab === 'tutor' && (
                      <AiTutorChat
                        speechSpeed={speechSpeed}
                        onDecomposePhrase={(phrase) => {
                          setDecomposerInitialSentence(phrase);
                          setIsDecomposerModalOpen(true);
                        }}
                      />
                    )}

                    {knowledgeSubTab === 'diagnostics' && (
                      <div className="space-y-4">
                        <DiagnosticsAndRemediation
                          diagnostics={diagnostics}
                          speechSpeed={speechSpeed}
                          baseLessons={baseLessons}
                          bookmarkedLessons={bookmarkedLessons}
                          onToggleBookmark={handleToggleBookmark}
                          onUpdateDiagnostics={(nextDiag) => {
                            setDiagnostics(nextDiag);
                            try { localStorage.setItem('fse_user_diagnostics', JSON.stringify(nextDiag)); } catch (e) {}
                          }}
                          onPracticeDueLessons={() => {
                            setShowOnlyDueLessons(true);
                            handleSetActiveTab('daily');
                          }}
                          onOpenHandoverDrill={() => setIsHandoverDrillOpen(true)}
                          onPracticeCustomSentence={(sentence, phonetic) => {
                            setCustomSpeechTarget({ sentence, phonetic });
                            setIsSpeechModalOpen(true);
                          }}
                        />
                        <AchievementTree
                          diagnostics={diagnostics}
                          speechSpeed={speechSpeed}
                          onUpdateDiagnostics={(nextDiag) => {
                            setDiagnostics(nextDiag);
                            try { localStorage.setItem('fse_user_diagnostics', JSON.stringify(nextDiag)); } catch (e) {}
                          }}
                        />
                      </div>
                    )}
                    </Suspense>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Non-intrusive Scroll To Top Floating Button */}
      <ScrollToTopButton />

      {/* Global Typography & Reading Ergonomics Optimizer */}
      <TypographyOptimizer />

      {/* Modals (Conditionally mounted & lazy-loaded on demand for zero idle overhead) */}
      <Suspense fallback={null}>
        {isGuideOpen && (
          <InteractiveGuideModal
            isOpen={isGuideOpen}
            onClose={() => setIsGuideOpen(false)}
          />
        )}

        {isCheatSheetOpen && (
          <QuickCheatSheetModal
            isOpen={isCheatSheetOpen}
            onClose={() => setIsCheatSheetOpen(false)}
            speechSpeed={speechSpeed}
          />
        )}

        {isSpeechModalOpen && (
          <SpeechPracticeModal
            isOpen={isSpeechModalOpen}
            onClose={() => {
              setIsSpeechModalOpen(false);
              setCustomSpeechTarget(null);
            }}
            sentence={customSpeechTarget?.sentence || currentDailyLesson.english_sentence}
            phonetic={customSpeechTarget?.phonetic ?? currentDailyLesson.phonetic_taiwan}
            speechSpeed={speechSpeed}
            onRecordPauseHotspot={handleRecordPauseHotspot}
          />
        )}

        {isHandoverDrillOpen && (
          <ShiftHandoverTimedDrillModal
            isOpen={isHandoverDrillOpen}
            onClose={() => setIsHandoverDrillOpen(false)}
            speechSpeed={speechSpeed}
          />
        )}

        {isBadgeModalOpen && (
          <CleanroomBadgeModal
            isOpen={isBadgeModalOpen}
            onClose={() => setIsBadgeModalOpen(false)}
            streakCount={streakCount}
          />
        )}

        {isErrorCodeModalOpen && (
          <AiErrorCodeGeneratorModal
            isOpen={isErrorCodeModalOpen}
            onClose={() => setIsErrorCodeModalOpen(false)}
          />
        )}

        {isDecomposerModalOpen && (
          <AiQuickDecomposerModal
            isOpen={isDecomposerModalOpen}
            onClose={() => setIsDecomposerModalOpen(false)}
            onBookmarkLesson={handleToggleBookmark}
            initialSentence={decomposerInitialSentence}
          />
        )}

        {isMediaImportModalOpen && (
          <CustomMediaImportModal
            isOpen={isMediaImportModalOpen}
            onClose={() => setIsMediaImportModalOpen(false)}
            speechSpeed={speechSpeed}
            importedVocab={importedVocab}
            importedLessons={importedLessons}
            onSaveImportedData={handleSaveImportedData}
            onUpdateImportedVocab={handleUpdateImportedVocab}
            onClearImportedData={handleClearImportedData}
            onDeleteImportedVocab={handleDeleteImportedVocab}
            onDeleteImportedLesson={handleDeleteImportedLesson}
            onJumpToImportedLessons={() => {
              setShowOnlyImportedLessons(true);
              setCurrentDailyIndex(0);
              handleSetActiveTab('daily');
            }}
          />
        )}

        {isCleanroomAmbienceModalOpen && (
          <CleanroomScenarioModal
            isOpen={isCleanroomAmbienceModalOpen}
            onClose={() => setIsCleanroomAmbienceModalOpen(false)}
            currentScenario={currentScenario}
            onSelectScenario={handleSelectScenario}
            isHighContrast={isHighContrast}
            onToggleHighContrast={handleToggleHighContrast}
          />
        )}

        {isVoiceSettingsOpen && (
          <VoiceSettingsModal
            isOpen={isVoiceSettingsOpen}
            onClose={() => setIsVoiceSettingsOpen(false)}
            speechSpeed={speechSpeed}
            setSpeechSpeed={setSpeechSpeed}
          />
        )}

        {offlineStatus.isFlashcardsModalOpen && (
          <OfflineCacheModal
            isOpen={offlineStatus.isFlashcardsModalOpen}
            onClose={offlineStatus.closeOfflineFlashcards}
            speechSpeed={speechSpeed}
            reviewedVocabIds={offlineStatus.reviewedVocabIds}
            onToggleVocabReviewed={offlineStatus.toggleVocabReviewed}
            isSimulatedOffline={offlineStatus.isSimulatedOffline}
            onToggleSimulatedOffline={offlineStatus.toggleSimulatedOffline}
          />
        )}

        {isEmergencyModalOpen && (
          <FabEmergencyModal
            isOpen={isEmergencyModalOpen}
            onClose={() => setIsEmergencyModalOpen(false)}
            speechSpeed={speechSpeed}
          />
        )}

        {isScenarioModalOpen && (
          <FabScenarioSimulatorModal
            isOpen={isScenarioModalOpen}
            onClose={() => setIsScenarioModalOpen(false)}
            speechSpeed={speechSpeed}
            onScenarioCompleted={(_xpGained) => handleGoalCompleted()}
          />
        )}

        {isSearchModalOpen && (
          <GlobalCommandPaletteModal
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
            speechSpeed={speechSpeed}
            onNavigateTab={(tab, subTab) => handleSetActiveTab(tab, subTab)}
            onOpenOfflineModal={offlineStatus.openOfflineFlashcards}
            onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
            onOpenScenarioModal={() => setIsScenarioModalOpen(true)}
            onOpenMatchGameModal={() => setIsMatchGameModalOpen(true)}
            onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
            onOpenSystemHealth={() => setIsSystemHealthModalOpen(true)}
            onOpenDecomposerModal={(initialSentence?: string) => {
              setDecomposerInitialSentence(initialSentence ? initialSentence : undefined);
              setIsDecomposerModalOpen(true);
            }}
            onOpenErrorCodeModal={() => setIsErrorCodeModalOpen(true)}
            onOpenMediaImportModal={() => setIsMediaImportModalOpen(true)}
            onPracticeDueLessons={() => {
              setShowOnlyDueLessons(true);
              handleSetActiveTab('daily');
            }}
            importedVocab={importedVocab}
            importedLessons={importedLessons}
            bookmarkedLessons={bookmarkedLessons}
            autoVocab={threeDayBundle?.vocab}
            autoLessons={threeDayBundle?.lessons}
            autoArticles={threeDayBundle?.articles}
            onSelectLesson={(lessonId) => {
              const foundInDisplayed = displayedLessons.findIndex((l) => l.id === lessonId);
              if (foundInDisplayed >= 0) {
                setCurrentDailyIndex(foundInDisplayed);
              } else {
                const foundInBase = baseLessons.findIndex((l) => l.id === lessonId);
                if (foundInBase >= 0) {
                  setShowOnlyImportedLessons(false);
                  setSelectedShift('all');
                  setCurrentDailyIndex(foundInBase);
                } else {
                  const target = bookmarkedLessons.find((l) => l.id === lessonId);
                  if (target) {
                    handleSaveImportedData([], [target]);
                    setShowOnlyImportedLessons(false);
                    setSelectedShift('all');
                    setCurrentDailyIndex(0);
                  }
                }
              }
              handleSetActiveTab('daily');
            }}
          />
        )}

        {isMatchGameModalOpen && (
          <VocabMatchGameModal
            isOpen={isMatchGameModalOpen}
            onClose={() => setIsMatchGameModalOpen(false)}
            vocabPool={FAB_VOCAB}
            speechSpeed={speechSpeed}
            onCompletedGame={(_score, _matchCount) => handleGoalCompleted()}
          />
        )}
      </Suspense>

      {/* Minimalist Offline Learning Records Sync Prompt Bar */}
      <OfflineSyncPromptBar
        showPrompt={offlineSync.showPrompt}
        isSyncing={offlineSync.isSyncing}
        pendingStats={offlineSync.pendingStats}
        syncSummary={offlineSync.syncSummary}
        onSync={() => offlineSync.triggerSync(diagnostics, setDiagnostics, setStreakCount)}
        onDismiss={offlineSync.dismissPrompt}
      />

      {/* Offline Speech Playlist Floating Bar */}
      <OfflinePlaylistPlayerBar
        onOpenOfflineModal={offlineStatus.openOfflineFlashcards}
        isOffline={offlineStatus.isOffline || offlineStatus.isSimulatedOffline}
      />

      {/* Mobile Bottom Navigation Dock for Thumb Ergonomics */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        bookmarkCount={bookmarkedLessons.length}
        onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
        onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
        onOpenSearchModal={() => setIsSearchModalOpen(true)}
        onOpenSpeechPractice={() => setIsSpeechModalOpen(true)}
        onQuickReplaySentence={() => {
          if (currentDailyLesson?.english_sentence) {
            speakEnglish(currentDailyLesson.english_sentence, speechSpeed);
          }
        }}
      />

      <Suspense fallback={null}>
        {isShortcutsOpen && (
          <KeyboardShortcutsModal
            isOpen={isShortcutsOpen}
            onClose={() => setIsShortcutsOpen(false)}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            onOpenSystemHealth={() => setIsSystemHealthModalOpen(true)}
          />
        )}

        {isBackupModalOpen && (
          <SystemDataBackupModal
            isOpen={isBackupModalOpen}
            onClose={() => setIsBackupModalOpen(false)}
            streakCount={streakCount}
            bookmarkedLessons={bookmarkedLessons}
            visitedLessonIds={visitedLessonIds}
            readArticleIds={readArticleIds}
            shiftSettings={shiftSettings}
            diagnostics={diagnostics}
            onRestoreData={(restored) => {
              if (typeof restored.streakCount === 'number') {
                setStreakCount(restored.streakCount);
                try { localStorage.setItem('fse_streak', String(restored.streakCount)); } catch (e) {}
              }
              if (Array.isArray(restored.bookmarkedLessons)) {
                setBookmarkedLessons(restored.bookmarkedLessons);
                try { localStorage.setItem('fse_bookmarks', JSON.stringify(restored.bookmarkedLessons)); } catch (e) {}
              }
              if (Array.isArray(restored.visitedLessonIds)) {
                setVisitedLessonIds(restored.visitedLessonIds);
                try { localStorage.setItem('fse_visited_lessons', JSON.stringify(restored.visitedLessonIds)); } catch (e) {}
              }
              if (Array.isArray(restored.readArticleIds)) {
                setReadArticleIds(restored.readArticleIds);
                try { localStorage.setItem('fse_read_articles', JSON.stringify(restored.readArticleIds)); } catch (e) {}
              }
              if (restored.shiftSettings) {
                setShiftSettings(restored.shiftSettings);
                try { localStorage.setItem('fse_shift_settings', JSON.stringify(restored.shiftSettings)); } catch (e) {}
              }
              if (restored.diagnostics) {
                setDiagnostics(restored.diagnostics);
                try { localStorage.setItem('fse_user_diagnostics', JSON.stringify(restored.diagnostics)); } catch (e) {}
              }
              queueAutoServerSync(800);
            }}
          />
        )}

        {isSystemHealthModalOpen && (
          <SystemHealthModal
            isOpen={isSystemHealthModalOpen}
            onClose={() => setIsSystemHealthModalOpen(false)}
            onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
            onOpenScenarioModal={() => setIsCleanroomAmbienceModalOpen(true)}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            onOpenShortcutsModal={() => setIsShortcutsOpen(true)}
            cycleNumber={cycleNumber}
            onRefresh3DayCycle={triggerManualUpdate}
          />
        )}
      </Suspense>

      {/* Geometric Footer - Public Information & InfoSec Compliance Declaration */}
      <footer className="border-t border-slate-800/90 bg-slate-950/95 py-2.5 text-center text-xs text-slate-400 mt-auto pb-18 md:pb-3 relative z-10 w-full max-w-full overflow-hidden">
        <div className="max-w-6xl mx-auto px-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-bold text-slate-200 whitespace-nowrap">FSE Studio</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/12 border border-emerald-500/35 text-emerald-300 font-mono text-[10px] font-bold whitespace-nowrap">
              公開資訊 · 去識別合規
            </span>
          </div>

          <p className="text-[11px] text-slate-400 font-medium leading-snug break-words">
            所有單字、KK音標、句型與設備教學皆屬通用公開資訊，無企業機密或資安疑慮。
          </p>

          <div className="hidden lg:flex items-center gap-2 shrink-0 text-slate-500 font-mono text-[11px] whitespace-nowrap">
            <span>S + V + O 國小拆解</span>
          </div>
        </div>
      </footer>

      </div>
    </ToastProvider>
  );
}

