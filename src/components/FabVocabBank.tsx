import React, { useState, useEffect } from 'react';
import { FAB_VOCAB } from '../data/fabVocab';
import { VocabItem, UserDiagnostics } from '../types';
import { Search, Volume2, BookOpen, Filter, Sparkles, Zap, Timer, CheckCircle2, XCircle, Trophy, RefreshCw, X, Flame, ShieldAlert, Award, Edit3, Gamepad2, FileText, StickyNote, Copy, Check, Layers, Cpu, Activity, Wrench, Upload, FolderOpen } from 'lucide-react';
import { speakEnglish, speakSingleEnglishWord, speakEnhancedPronunciation, speakChinese } from '../utils/speech';
import { getMandarinPhoneticFromSentence } from '../utils/lessonSentenceHelper';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { lookupWord, getWordKKPhonetic } from '../utils/wordDictionary';
import { getExampleTranslation } from '../utils/exampleSentenceTranslator';
import { playClickSound, playSuccessChime, playWaferSnapSound, playLaserScanSound } from '../utils/audioEffects';
import { motion, AnimatePresence } from 'motion/react';
import { VocabNoteModal } from './VocabNoteModal';
import { VocabMatchGameModal } from './VocabMatchGameModal';
import { VocabFlashcardModal } from './VocabFlashcardModal';
import { InteractiveSentenceViewer } from './InteractiveSentenceViewer';

interface FabVocabBankProps {
  speechSpeed: number;
  diagnostics?: UserDiagnostics;
  onUpdateDiagnostics?: (nextDiag: UserDiagnostics) => void;
  autoVocab?: VocabItem[];
  importedVocab?: VocabItem[];
  onOpenMediaImportModal?: () => void;
}

interface QuestionItem {
  vocabItem: VocabItem;
  prompt: string;
  subPrompt: string;
  type: 'wordToTrans' | 'phoneticToWord' | 'contextToWord';
  options: string[];
  correctAnswerIndex: number;
}

interface AnswerRecord {
  question: QuestionItem;
  selectedOptionIdx: number;
  isCorrect: boolean;
  timeUsed: number;
  pointsEarned: number;
}

const LOCAL_STORAGE_NOTES_KEY = 'fab_fse_vocab_notes';

export const FabVocabBank: React.FC<FabVocabBankProps> = ({
  speechSpeed,
  diagnostics,
  onUpdateDiagnostics,
  autoVocab,
  importedVocab = [],
  onOpenMediaImportModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewDensity, setViewDensity] = useState<'compact' | 'normal'>('normal');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSentenceId, setExpandedSentenceId] = useState<string | null>(null);

  // Personal Notes State from localStorage
  const [userNotes, setUserNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [activeNoteVocab, setActiveNoteVocab] = useState<VocabItem | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState<boolean>(false);

  // Mini Game State
  const [isMatchGameOpen, setIsMatchGameOpen] = useState<boolean>(false);
  const [isFlashcardOpen, setIsFlashcardOpen] = useState<boolean>(false);

  // Single-player Flash Challenge state
  const [isChallengeActive, setIsChallengeActive] = useState<boolean>(false);
  const [challengeQuestions, setChallengeQuestions] = useState<QuestionItem[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(8);
  const [userAnswers, setUserAnswers] = useState<AnswerRecord[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Handle saving personal note
  const handleSaveNote = (vocabId: string, noteText: string) => {
    const updated = { ...userNotes };
    if (noteText.trim()) {
      updated[vocabId] = noteText.trim();
    } else {
      delete updated[vocabId];
    }
    setUserNotes(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist vocab notes to localStorage', e);
    }
  };

  const handleCopyWord = (item: VocabItem, e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    const kk = item.kkPhonetic || getWordKKPhonetic(item.word, item.ipa);
    const cleanTrans = item.translation.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim() || item.translation;
    const textToCopy = `${item.word} ${kk} (${item.partOfSpeech}) - ${cleanTrans}\n例句: ${item.exampleSentence}\n${item.exampleTranslation || item.exampleSentenceZh || ''}`;
    try {
      navigator.clipboard.writeText(textToCopy);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {}
  };

  const allVocabList = React.useMemo(() => {
    let combined = [...FAB_VOCAB];
    if (autoVocab && autoVocab.length > 0) {
      const newItems = autoVocab.filter(
        (v) => !combined.some((p) => p.word.toLowerCase() === v.word.toLowerCase())
      );
      combined = [...newItems, ...combined];
    }
    if (importedVocab && importedVocab.length > 0) {
      const userItems = importedVocab.map((v) => ({
        ...v,
        isImported: true,
      }));
      const dedupedRest = combined.filter(
        (c) => !userItems.some((u) => u.word.toLowerCase() === c.word.toLowerCase())
      );
      combined = [...userItems, ...dedupedRest];
    }
    return combined;
  }, [autoVocab, importedVocab]);

  const filteredVocab = allVocabList.filter((item) => {
    const exZh = item.exampleTranslation || item.exampleSentenceZh || '';
    const matchesSearch =
      item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.translation.includes(searchTerm) ||
      item.taiwanPhonetic.includes(searchTerm) ||
      (item.exampleSentence && item.exampleSentence.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exZh && exZh.includes(searchTerm)) ||
      (userNotes[item.id] && userNotes[item.id].toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'imported' ? Boolean(item.isImported || item.category === 'imported') : item.category === selectedCategory);

    return matchesSearch && matchesCategory;
  });

  // Generate Flash Challenge Quiz Questions
  const generateQuestions = (pool: VocabItem[]): QuestionItem[] => {
    const sourcePool = pool.length >= 4 ? pool : allVocabList;
    const shuffledSource = [...sourcePool].sort(() => 0.5 - Math.random());
    const selectedItems = shuffledSource.slice(0, Math.min(8, sourcePool.length));

    return selectedItems.map((item) => {
      const randType = Math.floor(Math.random() * 3);
      const itemKK = item.kkPhonetic || getWordKKPhonetic(item.word, item.ipa);
      const cleanWord = item.word.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim() || item.word;
      const cleanTrans = item.translation.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim() || item.translation;
      let prompt = '';
      let subPrompt = '';
      let correctAnswer = '';
      let wrongPool: string[] = [];
      let typeName: 'wordToTrans' | 'phoneticToWord' | 'contextToWord' = 'wordToTrans';

      if (randType === 0) {
        typeName = 'wordToTrans';
        prompt = `${cleanWord} ${itemKK}`;
        subPrompt = `[ ${item.partOfSpeech} ] 請選擇此單字的正確中文意思：`;
        correctAnswer = cleanTrans;
        wrongPool = allVocabList
          .filter((v) => v.id !== item.id)
          .map((v) => v.translation.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim());
      } else if (randType === 1) {
        typeName = 'phoneticToWord';
        prompt = `KK ${itemKK} ｜ ${item.taiwanPhonetic}`;
        subPrompt = `口訣：${item.memoryTrick} ➔ 請選出對應英文單字：`;
        correctAnswer = cleanWord;
        wrongPool = allVocabList
          .filter((v) => v.id !== item.id)
          .map((v) => v.word.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim());
      } else {
        typeName = 'contextToWord';
        prompt = item.cleanroomContext || item.memoryTrick;
        subPrompt = `無塵室實景描述（KK ${itemKK}）：這是在說明哪一個單字？`;
        correctAnswer = cleanWord;
        wrongPool = allVocabList
          .filter((v) => v.id !== item.id)
          .map((v) => v.word.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim());
      }

      const shuffledWrong = [...new Set(wrongPool)].filter((w) => w && w !== correctAnswer).sort(() => 0.5 - Math.random()).slice(0, 3);
      const allOptions = [...shuffledWrong, correctAnswer].sort(() => 0.5 - Math.random());
      const correctAnswerIndex = allOptions.indexOf(correctAnswer);

      return {
        vocabItem: item,
        prompt,
        subPrompt,
        type: typeName,
        options: allOptions,
        correctAnswerIndex,
      };
    });
  };

  const handleStartChallenge = () => {
    playLaserScanSound();
    const questions = generateQuestions(filteredVocab);
    setChallengeQuestions(questions);
    setCurrentQuestionIdx(0);
    setSelectedOptionIdx(null);
    setIsAnswered(false);
    setScore(0);
    setCombo(0);
    setTimeLeft(8);
    setUserAnswers([]);
    setShowResults(false);
    setSyncSuccessMessage(null);
    setIsChallengeActive(true);
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (!isChallengeActive || showResults || isAnswered) return;

    if (timeLeft <= 0) {
      handleAnswerOption(-1); // Timeout as incorrect
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isChallengeActive, showResults, isAnswered, timeLeft]);

  // Answer Option Handler
  const handleAnswerOption = (optionIdx: number) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOptionIdx(optionIdx);

    const currentQ = challengeQuestions[currentQuestionIdx];
    const isCorrect = optionIdx === currentQ.correctAnswerIndex;
    const timeUsed = 8 - timeLeft;

    let addedPoints = 0;
    let newCombo = combo;

    if (isCorrect) {
      playSuccessChime();
      newCombo = combo + 1;
      const speedBonus = timeUsed <= 3 ? 5 : 0;
      addedPoints = 10 + speedBonus + Math.min(newCombo * 2, 10);
      setScore((prev) => prev + addedPoints);
      setCombo(newCombo);
    } else {
      playClickSound();
      setCombo(0);
    }

    // Pronounce the word
    speakEnglish(currentQ.vocabItem.word, speechSpeed);

    const answerRecord: AnswerRecord = {
      question: currentQ,
      selectedOptionIdx: optionIdx,
      isCorrect,
      timeUsed,
      pointsEarned: addedPoints,
    };

    const nextAnswers = [...userAnswers, answerRecord];
    setUserAnswers(nextAnswers);

    // Advance to next question or complete challenge
    setTimeout(() => {
      if (currentQuestionIdx + 1 < challengeQuestions.length) {
        setCurrentQuestionIdx((prev) => prev + 1);
        setTimeLeft(8);
        setIsAnswered(false);
        setSelectedOptionIdx(null);
      } else {
        const totalMaxPossible = challengeQuestions.length * 15;
        const finalScaledScore = Math.min(100, Math.round(((score + addedPoints) / totalMaxPossible) * 100)) || (isCorrect ? 100 : 0);
        setShowResults(true);
        performDiagnosticsSync(finalScaledScore, nextAnswers);
      }
    }, 1200);
  };

  // Sync Results to UserDiagnostics
  const performDiagnosticsSync = (finalScore: number, answers: AnswerRecord[]) => {
    if (!diagnostics || !onUpdateDiagnostics) return;

    const correctCount = answers.filter((a) => a.isCorrect).length;
    const prevBest = diagnostics.vocabFlashBestScore ?? 0;
    const newBest = Math.max(prevBest, finalScore);
    const prevCount = diagnostics.vocabFlashCount ?? 0;

    const newMastered = [...diagnostics.masteredTopics];
    if (finalScore >= 80 && !newMastered.includes('無塵室高頻單字快閃')) {
      newMastered.push('無塵室高頻單字快閃');
    }

    const updatedDiagnostics: UserDiagnostics = {
      ...diagnostics,
      totalSentencesPracticed: diagnostics.totalSentencesPracticed + answers.length,
      vocabFlashCount: prevCount + 1,
      vocabFlashBestScore: newBest,
      vocabFlashLastScore: finalScore,
      learningHabitNote: `最新單字快閃挑戰：${finalScore} 分（答對 ${correctCount}/${answers.length} 題）。${finalScore >= 80 ? '高頻單字反射神經極佳！' : '持續鞏固無塵室常用字庫。'}`,
      masteredTopics: newMastered,
    };

    onUpdateDiagnostics(updatedDiagnostics);
    setSyncSuccessMessage(`✓ 挑戰得分 (${finalScore} 分) 已成功記錄並同步更新至 UserDiagnostics 學習診斷！`);
  };

  return (
    <div className="space-y-2.5 max-w-6xl mx-auto animate-fade-in w-full min-w-0 relative">
      {/* Top Search & Interactive Cleanroom Console */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 sm:p-3.5 space-y-2.5 backdrop-blur-md shadow-xl relative overflow-hidden litho-laser-line">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋半導體單字、中譯或諧音 (如 slurry, calibrate, chamber)..."
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-all font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer rounded-md hover:bg-slate-800 transition-colors"
                title="清除搜尋"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Study Aids Launcher Tools */}
          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
            {onOpenMediaImportModal && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenMediaImportModal();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="導入照片或檔案，將資料內的英文加入學習單音庫"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>導入單音</span>
              </button>
            )}

            <button
              onClick={() => {
                playClickSound();
                setIsFlashcardOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="晶圓單字翻卡記憶模式"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>翻卡</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setIsMatchGameOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="單字配對挑戰遊戲"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>配對</span>
            </button>

            <button
              onClick={handleStartChallenge}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="單字限時快閃測驗"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>快閃</span>
            </button>
          </div>
        </div>

        {/* Category Pills Filter with Clean Vector Icons & Counts */}
        <div className="flex items-center justify-between gap-2.5 flex-wrap pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1 w-full sm:w-auto">
            {[
              { id: 'all', label: '全部', icon: Layers },
              { id: 'imported', label: '導入', icon: FolderOpen },
              { id: 'equipment', label: '設備', icon: Cpu },
              { id: 'process', label: '製程', icon: Activity },
              { id: 'safety', label: '工安', icon: ShieldAlert },
              { id: 'maintenance', label: '保養', icon: Wrench },
            ].map((cat) => {
              const count =
                cat.id === 'all'
                  ? allVocabList.length
                  : cat.id === 'imported'
                  ? allVocabList.filter((v) => Boolean(v.isImported || v.category === 'imported')).length
                  : allVocabList.filter((v) => v.category === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              const Icon = cat.icon;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    playClickSound();
                    setSelectedCategory(cat.id);
                  }}
                  className={`shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 select-none tabular-nums ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-black shadow-md shadow-cyan-500/20 ring-1 ring-cyan-300'
                      : 'bg-slate-950/90 text-slate-400 hover:text-slate-100 border border-slate-800 hover:bg-slate-900/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950 stroke-[2.5]' : 'text-slate-400'}`} />
                  <span className="font-sans font-bold tracking-tight">{cat.label}</span>
                  <span
                    className={`ml-0.5 text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold leading-none inline-flex items-center justify-center min-w-[20px] ${
                      isSelected
                        ? 'bg-slate-950/20 text-slate-950'
                        : 'bg-slate-800/80 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* View Density Toggle - Clean Segmented Control */}
            <div className="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-[11px] font-mono">
              <button
                onClick={() => {
                  playClickSound();
                  setViewDensity('compact');
                }}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all font-bold whitespace-nowrap ${
                  viewDensity === 'compact'
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="三欄精簡網格"
              >
                3 欄網格
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  setViewDensity('normal');
                }}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all font-bold whitespace-nowrap ${
                  viewDensity === 'normal'
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="兩欄寬版舒適精讀"
              >
                2 欄精讀
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-mono tabular-nums hidden md:inline shrink-0">
              共 <strong className="text-cyan-300 font-black">{filteredVocab.length}</strong> / {allVocabList.length} 詞
            </span>
          </div>
        </div>
      </div>

      {/* Vocab Cards Grid: Balanced 2-column or 3-column layout */}
      <motion.div
        layout
        className={`grid gap-3 pb-2 md:pb-1 items-stretch ${
          viewDensity === 'compact'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2'
        }`}
      >
        <AnimatePresence mode="popLayout">
          {filteredVocab.map((item, idx) => {
            const hasUserNote = Boolean(userNotes[item.id]);
            const isCopied = copiedId === item.id;
            const kkPhonetic = item.kkPhonetic || getWordKKPhonetic(item.word, item.ipa);
            const cleanTranslation = item.translation.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim() || item.translation;
            const zhuyinRaw = convertPhoneticToZhuyin(item.taiwanPhonetic);
            const zhuyinClean = zhuyinRaw.trim().replace(/^【\s*|\s*】$/g, '').trim();
            const mandarinRaw = item.mandarinPhonetic || getMandarinPhoneticFromSentence(item.word, item.taiwanPhonetic);
            const mandarinClean = mandarinRaw.trim().replace(/^【\s*|\s*】$/g, '').trim();
            const exTranslation = item.exampleTranslation || item.exampleSentenceZh || getExampleTranslation(item.exampleSentence, item.word);
            const resolvedContext = item.cleanroomContext?.trim() || lookupWord(item.word)?.cleanroomContext?.trim() || '半導體無塵室工程維護與即時監控情境。';

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18, delay: Math.min(idx * 0.015, 0.25) }}
                whileHover={{ y: -2, transition: { duration: 0.12 } }}
                key={item.id}
                onClick={() => {
                  playClickSound();
                  speakEnglish(item.word, speechSpeed);
                }}
                className={`bg-slate-900/95 border rounded-2xl p-3.5 pb-0 space-y-2.5 transition-all shadow-md flex flex-col justify-between backdrop-blur-sm group hover:shadow-cyan-950/20 relative cursor-pointer overflow-hidden ${
                  hasUserNote
                    ? 'border-amber-400/60 hover:border-amber-300'
                    : 'border-slate-800 hover:border-cyan-500/50'
                }`}
              >
                <div className="space-y-2.5 flex-1 flex flex-col">
                  {/* Word, Metadata & Audio Actions Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-cyan-300 font-mono tracking-tight group-hover:text-cyan-200 transition-colors">
                          {item.word.replace(/\s*[\(（][^\)）]*[\)）]/g, '')}
                        </h3>
                        {kkPhonetic && (
                          <span className="text-xs font-mono font-bold text-cyan-200/90">
                            KK {kkPhonetic}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <span className="font-extrabold text-slate-100 text-xs sm:text-sm tracking-tight">
                          {cleanTranslation}
                        </span>
                        <span className="text-slate-600" aria-hidden="true">·</span>
                        <span className="text-[11px] font-mono text-slate-400 italic">
                          {item.partOfSpeech}
                        </span>
                        {item.syllables && (
                          <>
                            <span className="text-slate-600" aria-hidden="true">·</span>
                            <span className="text-[11px] font-mono text-cyan-400/90">
                              {item.syllables}
                            </span>
                          </>
                        )}
                        {item.isImported && (
                          <>
                            <span className="text-slate-600" aria-hidden="true">·</span>
                            <span className="text-[11px] font-sans font-bold text-emerald-400">
                              光學檢測必背
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Audio & Note Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleCopyWord(item, e)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-xs active:scale-95 ${
                          isCopied
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800/80 text-slate-400 hover:text-white border-slate-700/80 hover:bg-slate-700'
                        }`}
                        title="複製單字與釋義"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playClickSound();
                          setActiveNoteVocab(item);
                          setIsNoteModalOpen(true);
                        }}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-xs active:scale-95 ${
                          hasUserNote
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800/80 text-slate-400 hover:text-white border-slate-700/80 hover:bg-slate-700'
                        }`}
                        title="開啟單字個人備忘筆記"
                      >
                        <StickyNote className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playClickSound();
                          speakEnglish(item.word, speechSpeed);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800/90 text-cyan-300 hover:bg-cyan-400 hover:text-slate-950 border border-slate-700/80 transition-all cursor-pointer shadow-xs active:scale-95"
                        title="點擊聽英文標準發音"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 整合式單音點讀與音標發音模組 (避免重複堆疊 KK 音標框) */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-slate-950/90 rounded-xl border border-slate-800/90 p-2.5 space-y-2 shadow-inner"
                  >
                    {/* 整詞 KK + 注音 + 諧音 對齊列 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800/80">
                        <span className="text-[10px] font-mono font-bold text-indigo-300 shrink-0">注音</span>
                        <span className="font-mono font-black text-amber-300 tracking-wide truncate">
                          {zhuyinClean || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800/80">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">諧音</span>
                        <span className="font-sans font-black text-emerald-300 tracking-wide truncate">
                          {mandarinClean || '—'}
                        </span>
                      </div>
                    </div>

                    {/* 若有單音拆解積木，提供一鍵逐音拆讀與可點擊音節積木 */}
                    {item.singleSounds && item.singleSounds.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>單音積木拆解（點擊單音慢讀）</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playClickSound();
                              const sounds = item.singleSounds || [];
                              let sIdx = 0;
                              const stepNext = () => {
                                if (sIdx < sounds.length) {
                                  const cur = sounds[sIdx];
                                  sIdx += 1;
                                  speakSingleEnglishWord(cur.sound, 0.6, () => {
                                    setTimeout(stepNext, 200);
                                  });
                                } else {
                                  speakEnglish(item.word, 0.78, () => {
                                    setTimeout(() => speakChinese(cleanTranslation, 1.05), 200);
                                  });
                                }
                              };
                              stepNext();
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold cursor-pointer transition-all whitespace-nowrap"
                            title="依序慢讀每個單音 ➔ 整字發音 ➔ 中文意思"
                          >
                            ▶ 逐音拆讀
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {item.singleSounds.map((syl, sIdx) => {
                            const sylKK = syl.kk || getWordKKPhonetic(syl.sound);
                            return (
                              <button
                                key={`${item.id}-s-${sIdx}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playClickSound();
                                  speakSingleEnglishWord(syl.sound, 0.62);
                                }}
                                className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400/60 text-left cursor-pointer transition-all flex flex-col justify-between gap-0.5"
                              >
                                <div className="flex items-baseline justify-between gap-1 w-full">
                                  <span className="text-xs font-black font-mono text-cyan-300">{syl.sound}</span>
                                  {sylKK && <span className="text-[10px] font-mono text-cyan-400/80">{sylKK}</span>}
                                </div>
                                <div className="flex items-center justify-between gap-1 text-[10px] w-full">
                                  <span className="font-mono text-amber-300 truncate">{syl.zhuyin}</span>
                                  <span className="font-sans text-emerald-300 font-bold shrink-0">{syl.homophone}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 極簡實戰例句區 (3~4 字短句 + 即時聽讀與展開拆解) */}
                  <div className="bg-slate-950/85 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-baseline gap-2 min-w-0 flex-1 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-white font-mono leading-snug">
                          {item.exampleSentence}
                        </span>
                        <span className="text-xs text-amber-300 font-sans font-bold leading-snug">
                          {exTranslation}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            setExpandedSentenceId(expandedSentenceId === item.id ? null : item.id);
                          }}
                          className={`px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-bold cursor-pointer transition-all active:scale-95 whitespace-nowrap ${
                            expandedSentenceId === item.id
                              ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                              : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-400/30'
                          }`}
                          title="展開例句逐字中文、注音與諧音拆解"
                        >
                          {expandedSentenceId === item.id ? '收合' : '拆解'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            speakEnglish(item.exampleSentence, 0.68);
                          }}
                          className="px-1.5 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                          title="0.68x 慢速清晰朗讀例句"
                        >
                          慢讀
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            speakEnglish(item.exampleSentence, speechSpeed);
                          }}
                          className="px-1.5 py-0.5 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/30 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                          title="播放例句英文發音"
                        >
                          <Volume2 className="w-3 h-3 text-cyan-400" />
                          <span>例句</span>
                        </button>
                      </div>
                    </div>

                    {/* 例句單行諧音與注音直讀 */}
                    {(() => {
                      const exMandarinRaw = getMandarinPhoneticFromSentence(item.exampleSentence);
                      const exMandarinClean = exMandarinRaw.trim().replace(/^【\s*|\s*】$/g, '').trim();
                      const exZhuyinRaw = convertPhoneticToZhuyin(exMandarinRaw);
                      const exZhuyinClean = exZhuyinRaw.trim().replace(/^【\s*|\s*】$/g, '').trim();
                      if (!exMandarinClean && !exZhuyinClean) return null;
                      return (
                        <div className="pt-1 border-t border-slate-800/70 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                          {exMandarinClean && (
                            <span className="font-sans font-bold text-emerald-300/95">
                              諧音：{exMandarinClean}
                            </span>
                          )}
                          {exZhuyinClean && (
                            <span className="font-mono text-yellow-300/90">
                              · 注音：{exZhuyinClean}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {expandedSentenceId === item.id && (
                      <div className="pt-1.5" onClick={(e) => e.stopPropagation()}>
                        <InteractiveSentenceViewer
                          sentence={item.exampleSentence}
                          chinese={exTranslation}
                          speechSpeed={speechSpeed}
                        />
                      </div>
                    )}
                  </div>

                  {/* Personal User Note preview if exists */}
                  {hasUserNote && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-[11px] text-amber-200 space-y-0.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300">
                        <StickyNote className="w-3 h-3 text-amber-400" />
                        <span>個人備忘：</span>
                      </div>
                      <p className="text-slate-200 break-words">
                        {userNotes[item.id]}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer: Memory Trick & Cleanroom Context */}
                <div className="-mx-3.5 -mb-0 mt-auto px-3.5 py-2 bg-slate-950/95 border-t border-slate-800/80 rounded-b-xl space-y-1 text-[11px]">
                  {item.memoryTrick && (
                    <div className="flex items-start gap-1.5 text-amber-200/95 leading-snug">
                      <span className="text-amber-400 font-mono font-bold shrink-0">速記 ·</span>
                      <span className="break-words flex-1">{item.memoryTrick}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-1.5 text-slate-400 leading-snug">
                    <span className="text-cyan-400 font-mono font-bold shrink-0">實務 ·</span>
                    <span className="text-slate-300 break-words flex-1">{resolvedContext}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* VOCAB NOTE MODAL */}
      <VocabNoteModal
        vocabItem={activeNoteVocab}
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        currentNote={activeNoteVocab ? userNotes[activeNoteVocab.id] || '' : ''}
        onSaveNote={handleSaveNote}
      />

      {/* VOCAB MATCH PAIR MINI GAME MODAL */}
      <VocabMatchGameModal
        isOpen={isMatchGameOpen}
        onClose={() => setIsMatchGameOpen(false)}
        vocabPool={filteredVocab.length >= 6 ? filteredVocab : FAB_VOCAB}
        speechSpeed={speechSpeed}
        onCompletedGame={(gameScore, matchCount) => {
          if (diagnostics && onUpdateDiagnostics) {
            const updatedDiagnostics: UserDiagnostics = {
              ...diagnostics,
              totalSentencesPracticed: diagnostics.totalSentencesPracticed + matchCount,
              learningHabitNote: `完成單字-中文配對 Mini-Game！得分：${gameScore} 分（成功匹配 ${matchCount} 組半導體單字）。`,
            };
            onUpdateDiagnostics(updatedDiagnostics);
          }
        }}
      />

      {/* FLASH CHALLENGE MODAL */}
      <AnimatePresence>
        {isChallengeActive && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-5 shadow-2xl relative overflow-hidden litho-scanner-overlay litho-laser-line max-h-[92vh] overflow-y-auto"
            >
              {/* Challenge Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-black">
                    <Zap className="w-4 h-4 fill-slate-950" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-100">
                      無塵室單字快閃競速挑戰
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      題數 {currentQuestionIdx + 1} / {challengeQuestions.length}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Streak Combo Badge */}
                  {combo > 1 && (
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 font-mono font-black text-xs animate-bounce">
                      🔥 {combo} 連勝
                    </span>
                  )}

                  {/* Close Quiz */}
                  <button
                    onClick={() => setIsChallengeActive(false)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {!showResults ? (
                /* IN-GAME QUIZ SCREEN */
                challengeQuestions[currentQuestionIdx] && (
                  <div className="space-y-5">
                    {/* Timer & Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 flex items-center gap-1 font-bold">
                          <Timer className={`w-3.5 h-3.5 ${timeLeft <= 3 ? 'text-rose-400 animate-spin' : 'text-cyan-400'}`} />
                          限時倒數:
                          <strong className={`ml-1 text-sm ${timeLeft <= 3 ? 'text-rose-400 font-extrabold' : 'text-cyan-300'}`}>
                            {timeLeft} 秒
                          </strong>
                        </span>

                        <span className="text-amber-300 font-bold">
                          目前得分: <strong className="text-amber-400 text-sm">{score}</strong>
                        </span>
                      </div>

                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <motion.div
                          className={`h-full transition-all duration-300 ${
                            timeLeft <= 3 ? 'bg-rose-500' : 'bg-cyan-400'
                          }`}
                          style={{ width: `${(timeLeft / 8) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 text-center relative overflow-hidden shadow-inner">
                      <span className="inline-block px-3 py-1 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 text-[11px] font-extrabold">
                        {challengeQuestions[currentQuestionIdx].subPrompt}
                      </span>

                      <div className="py-2">
                        <h4 className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-wide break-words">
                          {challengeQuestions[currentQuestionIdx].prompt}
                        </h4>
                      </div>

                      <button
                        onClick={() => speakEnglish(challengeQuestions[currentQuestionIdx].vocabItem.word, speechSpeed)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>播放單字發音</span>
                      </button>
                    </div>

                    {/* Multiple Choice Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {challengeQuestions[currentQuestionIdx].options.map((opt, optIdx) => {
                        const isCorrectOpt = optIdx === challengeQuestions[currentQuestionIdx].correctAnswerIndex;
                        const isSelectedOpt = selectedOptionIdx === optIdx;

                        let btnStyle = "bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-cyan-500/50";
                        
                        if (isAnswered) {
                          if (isCorrectOpt) {
                            btnStyle = "bg-emerald-950 border-emerald-400 text-emerald-200 font-black shadow-lg shadow-emerald-500/20";
                          } else if (isSelectedOpt && !isCorrectOpt) {
                            btnStyle = "bg-rose-950 border-rose-500 text-rose-200 font-black";
                          } else {
                            btnStyle = "bg-slate-950/50 border-slate-900 text-slate-600 opacity-50";
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={isAnswered}
                            onClick={() => handleAnswerOption(optIdx)}
                            className={`p-4 rounded-2xl border text-sm font-black transition-all flex items-center justify-between cursor-pointer min-h-[56px] text-left ${btnStyle}`}
                          >
                            <span className="font-sans leading-snug">{opt}</span>
                            {isAnswered && isCorrectOpt && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />}
                            {isAnswered && isSelectedOpt && !isCorrectOpt && <XCircle className="w-5 h-5 text-rose-400 shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : (
                /* QUIZ RESULT SCREEN */
                <div className="space-y-5 text-center py-2">
                  <div className="space-y-2">
                    <div className="w-16 h-16 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 flex items-center justify-center mx-auto shadow-xl">
                      <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
                    </div>
                    <h3 className="text-xl font-black text-slate-100">
                      快閃挑戰測試完成！
                    </h3>
                    <p className="text-xs text-slate-400">
                      測試成績已算得，評分與高頻單字掌握度結果如下：
                    </p>
                  </div>

                  {/* Score & Rank Display */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2 max-w-md mx-auto shadow-inner">
                    <span className="text-xs font-bold text-slate-400">測驗總分</span>
                    <div className="text-4xl font-black font-mono text-amber-300">
                      {Math.min(100, Math.round((userAnswers.filter((a) => a.isCorrect).length / challengeQuestions.length) * 100))} <span className="text-sm text-slate-400 font-normal">分</span>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-around text-xs font-mono">
                      <div>
                        <span className="text-slate-500 block">答對題數</span>
                        <span className="text-emerald-400 font-extrabold">
                          {userAnswers.filter((a) => a.isCorrect).length} / {challengeQuestions.length}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-slate-800" />
                      <div>
                        <span className="text-slate-500 block">評價等級</span>
                        <span className="text-amber-300 font-extrabold">
                          {userAnswers.filter((a) => a.isCorrect).length >= 7
                            ? '🏆 S級 晶圓狂魔'
                            : userAnswers.filter((a) => a.isCorrect).length >= 5
                            ? '🥇 A級 頂級FSE'
                            : '🥈 B級 熟練工程師'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sync Notification Banner */}
                  {syncSuccessMessage && (
                    <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 rounded-xl p-3 text-xs font-bold flex items-center justify-center gap-2 shadow-md">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{syncSuccessMessage}</span>
                    </div>
                  )}

                  {/* Question Review Breakdown */}
                  <div className="text-left space-y-2 max-h-48 overflow-y-auto pr-1">
                    <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                      <span>關鍵單字錯題複習：</span>
                    </h4>
                    {userAnswers.map((ans, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between font-mono ${
                          ans.isCorrect ? 'bg-slate-950 border-slate-850 text-slate-300' : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {ans.isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span className="font-black text-cyan-300">{ans.question.vocabItem.word}</span>
                          <span className="text-slate-400">({ans.question.vocabItem.translation})</span>
                        </div>
                        <span className="text-[11px] text-amber-300 font-bold">
                          【 {ans.question.vocabItem.taiwanPhonetic} 】
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={handleStartChallenge}
                      className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>再次發起快閃挑戰</span>
                    </button>

                    <button
                      onClick={() => setIsChallengeActive(false)}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs cursor-pointer transition-all"
                    >
                      關閉挑戰
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Vocab Flashcard Deck Modal */}
      <VocabFlashcardModal
        isOpen={isFlashcardOpen}
        onClose={() => setIsFlashcardOpen(false)}
        vocabList={filteredVocab.length > 0 ? filteredVocab : FAB_VOCAB}
        speechSpeed={speechSpeed}
        userNotes={userNotes}
      />

    </div>
  );
};
