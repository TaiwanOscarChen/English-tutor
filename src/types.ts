export interface Components {
  subject: string;
  action: string;
  object: string;
  bridge?: string;
}

export interface LessonQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  scenario: string;
  english_sentence: string;
  chinese_translation?: string;
  components: Components;
  phonetic_taiwan: string;
  mandarin_phonetic?: string;
  chinese_phonetic?: string;
  memory_trick: string;
  additional_context?: string;
  category?: string;
  favorite?: boolean;
  practiceQuestions?: LessonQuizQuestion[];
}

export interface SingleSoundSyllable {
  sound: string;
  kk?: string;
  zhuyin: string;
  homophone: string;
}

export interface VocabItem {
  id: string;
  word: string;
  partOfSpeech: string;
  translation: string;
  kkPhonetic?: string;
  ipa?: string;
  syllables?: string;
  singleSounds?: SingleSoundSyllable[];
  zhuyinPhonetic?: string;
  taiwanPhonetic: string;
  mandarinPhonetic?: string;
  chinesePhonetic?: string;
  memoryTrick: string;
  exampleSentence: string;
  exampleTranslation?: string;
  exampleSentenceZh?: string;
  cleanroomContext?: string;
  category: "equipment" | "maintenance" | "safety" | "communication" | "process" | "imported";
  isImported?: boolean;
  sourceFileName?: string;
}

export interface ScenarioTopic {
  id: string;
  title: string;
  iconName: string;
  description: string;
  samplePrompt: string;
}

export interface ArticleSection {
  id: string;
  englishText: string;
  chineseTranslation: string;
  phonetic?: string;
  svoBreakdown?: string;
}

export interface ArticleQuiz {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Article {
  id: string;
  title: string;
  category: "週報導讀" | "機台排除" | "無塵室心法" | "高頻交接" | "晶圓趨勢";
  readTime: string;
  publishDate: string;
  summary: string;
  contentSections: ArticleSection[];
  keyVocab: { word: string; translation: string; phonetic: string }[];
  quizQuestions: ArticleQuiz[];
  isRead?: boolean;
  isBookmarked?: boolean;
}

export interface SvoErrorStats {
  subjectErrors: number;
  actionErrors: number;
  bridgeErrors: number;
  objectErrors: number;
  totalAttempts: number;
  correctAttempts: number;
}

export interface PauseHotspot {
  id?: string;
  label?: string; // e.g. "介系詞與連讀 (Bridge Linking)" | "核心動詞轉折 (Verb Action Shift)" | "專有名詞首音 (Technical Term Initial)" | "長句換氣節奏 (Breath Cadence)"
  segment?: string;
  category: 'svo' | 'speech' | 'both';
  averagePauseMs: number; // e.g. 820ms
  hesitationCount?: number; // e.g. 12
  pauseCount?: number;
  severity: 'high' | 'medium' | 'low';
  examplePhonetic?: string; // e.g. "dry pump -> in the sub-fab (停頓 850ms)"
  recommendation: string;
}

export interface PauseHotspotStats {
  totalHesitations: number;
  avgHesitationMs: number;
  svoPauseIndex: number; // 0 - 100
  speechPauseIndex: number; // 0 - 100
  hotspots: PauseHotspot[];
  lastAnalyzedTimestamp?: number;
}

export interface UserDiagnostics {
  totalSentencesPracticed: number;
  totalArticlesRead: number;
  speechScoreAverage: number;
  svoStats: SvoErrorStats;
  pauseHotspots?: PauseHotspotStats;
  primaryWeakness: string; // e.g. "橋樑 (Bridge) 與介系詞" | "動作 (Verb) 連讀" | "東西 (Object) 專有名詞"
  learningHabitNote: string;
  masteredTopics: string[];
  vocabFlashCount?: number;
  vocabFlashBestScore?: number;
  vocabFlashLastScore?: number;
  totalXp?: number;
}

export type ShiftType = 'day' | 'night' | 'off' | 'custom';

export interface ShiftSettings {
  shiftType: ShiftType;
  handoverTimeStr: string; // "18:30" or "06:30"
  enableReminder: boolean;
  enableSoundAlert: boolean;
  reminderMinutesBefore: number; // e.g., 60 minutes
  lastRemindedTimestamp?: number;
}

export interface AchievementNode {
  id: string;
  title: string;
  domainId: string;
  domainName: string;
  svoPattern: string;
  scenario: string;
  level: number;
  iconName: string;
  status: 'mastered' | 'practicing' | 'locked';
  masteryPercentage: number;
  requiredNodeIds?: string[];
  rewardBadgeTitle?: string;
}

export interface AchievementDomain {
  id: string;
  title: string;
  englishTitle: string;
  iconName: string;
  description: string;
  color: string;
  nodes: AchievementNode[];
}

export interface MilestoneBadge {
  id: string;
  title: string;
  category: string;
  icon: string;
  description: string;
  unlockedAt?: string;
  bonusAttributes: string[];
  isUnlocked: boolean;
}

