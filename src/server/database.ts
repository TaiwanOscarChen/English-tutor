import fs from 'fs';
import path from 'path';
import {
  PronunciationAnalyticsStore,
  mergePronunciationAnalytics
} from '../utils/pronunciationAnalytics';

/**
 * Fab Server Embedded Persistence Database Engine
 * 專為晶圓廠系統設計的高可靠性嵌入式伺服器資料庫引擎
 * 具備原子級寫入 (Atomic Staging)、自動快照備份、衝突雙向合併與資料完整性校驗
 */

export interface UserProfileRecord {
  userId: string;
  bookmarks: any[];
  visitedLessonIds: string[];
  readArticleIds: string[];
  bookmarkedArticleIds: string[];
  diagnostics: any;
  streakCount: number;
  shiftSettings: any;
  lessonNotes?: Record<string, string>;
  vocabNotes?: Record<string, string>;
  noteTimestamps?: Record<string, number>;
  flashcardMastered?: string[];
  importedVocab?: any[];
  importedLessons?: any[];
  srsMemory?: Record<string, any>;
  shadowingScores?: Record<string, number>;
  pronunciationAnalytics?: PronunciationAnalyticsStore;
  speechSpeed?: number;
  speechSpeedUpdatedAt?: number;
  speechRecordingsCount: number;
  completedDrillsCount: number;
  revision: number;
  lastUpdated: string;
}

export interface SyncJournalEntry {
  id: string;
  userId: string;
  type: 'push' | 'pull' | 'merge';
  syncedItemsCount: number;
  clientTimestamp: number;
  serverTimestamp: number;
  status: 'success' | 'conflict_resolved' | 'warning';
  details: string;
}

export interface DatabaseSchema {
  version: number;
  createdAt: string;
  lastFlushedAt: string;
  userProfiles: Record<string, UserProfileRecord>;
  syncJournals: SyncJournalEntry[];
  customLessons: any[];
  systemAuditLogs: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    event: string;
    meta?: any;
  }>;
}

const RESERVED_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype', 'toString', 'valueOf']);
const SAFE_USER_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export function isValidProfileUserId(userId: unknown): userId is string {
  return (
    typeof userId === 'string' &&
    SAFE_USER_ID_PATTERN.test(userId) &&
    !RESERVED_OBJECT_KEYS.has(userId)
  );
}

function clampSafeRecord<T>(input: unknown, maxEntries: number): Record<string, T> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const safe: Record<string, T> = {};
  let count = 0;
  for (const [key, val] of Object.entries(input as Record<string, T>)) {
    if (count >= maxEntries) break;
    if (!key || key.length > 128 || RESERVED_OBJECT_KEYS.has(key)) continue;
    safe[key] = val;
    count++;
  }
  return safe;
}

class FabDatabase {
  private dataDir: string;
  private dbFilePath: string;
  private backupDir: string;
  private memoryData: DatabaseSchema;
  private isDirty = false;
  private isFlushing = false;
  private flushQueued = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private soonFlushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.backupDir = path.join(this.dataDir, 'backups');
    this.dbFilePath = path.join(this.dataDir, 'fab_persistence_db.json');

    this.ensureDirectories();
    this.memoryData = this.loadDatabaseFromDisk();

    // Start auto-flush safety sweep every 5 seconds if dirty (.unref prevents blocking process exit)
    this.flushTimer = setInterval(() => {
      if (this.isDirty) {
        this.flushToDisk();
      }
    }, 5000);
    if (typeof this.flushTimer.unref === 'function') {
      this.flushTimer.unref();
    }
  }

  private scheduleFastFlush(delayMs = 400): void {
    if (this.soonFlushTimer) {
      clearTimeout(this.soonFlushTimer);
    }
    this.soonFlushTimer = setTimeout(() => {
      this.soonFlushTimer = null;
      if (this.isDirty) {
        this.flushToDisk();
      }
    }, delayMs);
    if (typeof this.soonFlushTimer.unref === 'function') {
      this.soonFlushTimer.unref();
    }
  }

  private ensureDirectories(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
    } catch (err) {
      console.error('[FabDB] Failed to ensure data directories:', err);
    }
  }

  private loadDatabaseFromDisk(): DatabaseSchema {
    const defaultSchema: DatabaseSchema = {
      version: 2,
      createdAt: new Date().toISOString(),
      lastFlushedAt: new Date().toISOString(),
      userProfiles: {},
      syncJournals: [],
      customLessons: [],
      systemAuditLogs: [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          event: 'Database initialized with high-resilience engine'
        }
      ]
    };

    if (!fs.existsSync(this.dbFilePath)) {
      this.atomicWriteFile(this.dbFilePath, JSON.stringify(defaultSchema, null, 2));
      return defaultSchema;
    }

    try {
      const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.userProfiles) parsed.userProfiles = {};
      if (!parsed.syncJournals) parsed.syncJournals = [];
      if (!parsed.customLessons) parsed.customLessons = [];
      if (!parsed.systemAuditLogs) parsed.systemAuditLogs = [];
      return parsed;
    } catch (err) {
      console.error('[FabDB] Database file corrupted or invalid JSON. Rebuilding from backup or defaults:', err);
      // Attempt restore from latest backup
      const restored = this.attemptLatestBackupRestore();
      if (restored) return restored;

      this.atomicWriteFile(this.dbFilePath, JSON.stringify(defaultSchema, null, 2));
      return defaultSchema;
    }
  }

  /**
   * 原子級寫入檔案：寫入帶有高精度時間與隨機 Nonce 的臨時檔再透過 OS atomic rename 替換，防止斷電/並行寫入異常
   */
  private atomicWriteFile(targetPath: string, content: string): void {
    const nonce = Math.random().toString(36).substring(2, 8);
    const tempPath = `${targetPath}.tmp.${Date.now()}_${nonce}`;
    try {
      fs.writeFileSync(tempPath, content, 'utf-8');
      fs.renameSync(tempPath, targetPath);
    } catch (err) {
      console.error('[FabDB] Atomic file write failed:', err);
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
    }
  }

  /**
   * 立即將記憶體數據持久化寫入磁碟（具備排隊互斥保護）
   */
  public flushToDisk(): void {
    if (this.isFlushing) {
      this.flushQueued = true;
      return;
    }
    this.isFlushing = true;
    try {
      this.memoryData.lastFlushedAt = new Date().toISOString();
      const content = JSON.stringify(this.memoryData, null, 2);
      this.atomicWriteFile(this.dbFilePath, content);
      this.isDirty = false;
    } catch (err) {
      console.error('[FabDB] Flush to disk error:', err);
    } finally {
      this.isFlushing = false;
      if (this.flushQueued) {
        this.flushQueued = false;
        // Non-recursive next-tick execution
        setImmediate(() => this.flushToDisk());
      }
    }
  }

  /**
   * 建立帶有時間戳的資料庫快照 (Snapshot)
   */
  public createSnapshotBackup(): string | null {
    try {
      this.ensureDirectories();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `db_snapshot_${timestamp}.json`);
      const content = JSON.stringify(this.memoryData, null, 2);
      this.atomicWriteFile(backupPath, content);

      // Rotate: keep only the newest 10 backups
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('db_snapshot_') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length > 10) {
        for (let i = 10; i < files.length; i++) {
          try {
            fs.unlinkSync(path.join(this.backupDir, files[i]));
          } catch {}
        }
      }

      this.logAudit('info', 'Database snapshot created', { backupPath });
      return backupPath;
    } catch (err) {
      console.error('[FabDB] Failed to create snapshot:', err);
      return null;
    }
  }

  private attemptLatestBackupRestore(): DatabaseSchema | null {
    try {
      if (!fs.existsSync(this.backupDir)) return null;
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('db_snapshot_') && f.endsWith('.json'))
        .sort()
        .reverse();

      for (const file of files) {
        const candidatePath = path.join(this.backupDir, file);
        try {
          const raw = fs.readFileSync(candidatePath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && parsed.userProfiles && typeof parsed.userProfiles === 'object') {
            if (!Array.isArray(parsed.syncJournals)) parsed.syncJournals = [];
            if (!Array.isArray(parsed.customLessons)) parsed.customLessons = [];
            if (!Array.isArray(parsed.systemAuditLogs)) parsed.systemAuditLogs = [];
            console.warn(`[FabDB] Restored database successfully from backup: ${candidatePath}`);
            return parsed;
          }
        } catch {
          console.warn(`[FabDB] Skipping unreadable backup file: ${candidatePath}`);
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 使用者檔案雙向智能合併儲存 (Bidirectional Intelligent Merge)
   */
  public upsertUserProfile(userId: string, incomingData: Partial<UserProfileRecord>): {
    record: UserProfileRecord;
    mergedChangesCount: number;
  } {
    if (!isValidProfileUserId(userId)) {
      throw new Error('Invalid userId format');
    }

    const hasExisting = Object.prototype.hasOwnProperty.call(this.memoryData.userProfiles, userId);
    const existing = hasExisting ? this.memoryData.userProfiles[userId] : undefined;
    let mergedChanges = 0;

    const safeBookmarks = Array.isArray(incomingData.bookmarks) ? incomingData.bookmarks.slice(0, 500) : [];
    const safeVisited = Array.isArray(incomingData.visitedLessonIds) ? incomingData.visitedLessonIds.slice(0, 2000) : [];
    const safeReadArticles = Array.isArray(incomingData.readArticleIds) ? incomingData.readArticleIds.slice(0, 1000) : [];
    const safeBookmarkedArticles = Array.isArray(incomingData.bookmarkedArticleIds) ? incomingData.bookmarkedArticleIds.slice(0, 500) : [];
    const safeLessonNotes = clampSafeRecord<string>(incomingData.lessonNotes, 500);
    const safeVocabNotes = clampSafeRecord<string>(incomingData.vocabNotes, 500);
    const safeNoteTimestamps = clampSafeRecord<number>(incomingData.noteTimestamps, 1000);
    const safeFlashcardMastered = Array.isArray(incomingData.flashcardMastered) ? incomingData.flashcardMastered.slice(0, 2000) : [];
    const safeImportedVocab = Array.isArray(incomingData.importedVocab) ? incomingData.importedVocab.slice(0, 500) : [];
    const safeImportedLessons = Array.isArray(incomingData.importedLessons) ? incomingData.importedLessons.slice(0, 300) : [];
    const safeSrsMemory = clampSafeRecord<any>(incomingData.srsMemory, 1500);
    const safeShadowingScores = clampSafeRecord<number>(incomingData.shadowingScores, 500);
    const safePronunciationAnalytics = incomingData.pronunciationAnalytics
      ? mergePronunciationAnalytics(null, incomingData.pronunciationAnalytics)
      : undefined;
    const incomingSpeed =
      typeof incomingData.speechSpeed === 'number' &&
      Number.isFinite(incomingData.speechSpeed) &&
      incomingData.speechSpeed >= 0.5 &&
      incomingData.speechSpeed <= 2.0
        ? Math.round(incomingData.speechSpeed * 100) / 100
        : undefined;
    const incomingSpeedTs = Number(incomingData.speechSpeedUpdatedAt) || 0;

    if (!existing) {
      const newRecord: UserProfileRecord = {
        userId,
        bookmarks: safeBookmarks,
        visitedLessonIds: safeVisited,
        readArticleIds: safeReadArticles,
        bookmarkedArticleIds: safeBookmarkedArticles,
        diagnostics: incomingData.diagnostics && typeof incomingData.diagnostics === 'object' ? incomingData.diagnostics : {},
        streakCount: Math.max(1, Math.min(9999, Number(incomingData.streakCount) || 1)),
        shiftSettings: incomingData.shiftSettings && typeof incomingData.shiftSettings === 'object' ? incomingData.shiftSettings : {},
        lessonNotes: safeLessonNotes,
        vocabNotes: safeVocabNotes,
        noteTimestamps: safeNoteTimestamps,
        flashcardMastered: safeFlashcardMastered,
        importedVocab: safeImportedVocab,
        importedLessons: safeImportedLessons,
        srsMemory: safeSrsMemory,
        shadowingScores: safeShadowingScores,
        pronunciationAnalytics: safePronunciationAnalytics,
        speechSpeed: incomingSpeed,
        speechSpeedUpdatedAt: incomingSpeed !== undefined ? incomingSpeedTs || Date.now() : undefined,
        speechRecordingsCount: Math.max(0, Number(incomingData.speechRecordingsCount) || 0),
        completedDrillsCount: Math.max(0, Number(incomingData.completedDrillsCount) || 0),
        revision: 1,
        lastUpdated: new Date().toISOString()
      };
      this.memoryData.userProfiles[userId] = newRecord;
      this.isDirty = true;
      this.scheduleFastFlush();
      mergedChanges =
        (newRecord.bookmarks.length || 0) +
        (newRecord.visitedLessonIds.length || 0) +
        (newRecord.readArticleIds.length || 0) +
        Object.keys(newRecord.lessonNotes || {}).length +
        Object.keys(newRecord.vocabNotes || {}).length +
        Object.keys(newRecord.srsMemory || {}).length;
      return { record: newRecord, mergedChangesCount: mergedChanges };
    }

    // Smart Union & Merge for existing record:
    // 1. Bookmarks: Union by lesson ID or sentence (capped to 500)
    const existingLessonIds = new Set((existing.bookmarks || []).map((b: any) => b?.id || b?.english_sentence).filter(Boolean));
    const mergedBookmarks = [...(existing.bookmarks || [])];
    safeBookmarks.forEach((b: any) => {
      if (!b || typeof b !== 'object' || mergedBookmarks.length >= 500) return;
      const key = b.id || b.english_sentence;
      if (key && !existingLessonIds.has(key)) {
        mergedBookmarks.push(b);
        existingLessonIds.add(key);
        mergedChanges++;
      }
    });

    // 2. Visited Lessons: Set union (capped to 2000)
    const mergedVisited = Array.from(new Set([
      ...(Array.isArray(existing.visitedLessonIds) ? existing.visitedLessonIds : []),
      ...safeVisited
    ])).slice(0, 2000);
    if (mergedVisited.length > (existing.visitedLessonIds?.length || 0)) {
      mergedChanges += mergedVisited.length - (existing.visitedLessonIds?.length || 0);
    }

    // 3. Read Articles & Bookmarked Articles: Set union
    const mergedReadArticles = Array.from(new Set([
      ...(Array.isArray(existing.readArticleIds) ? existing.readArticleIds : []),
      ...safeReadArticles
    ])).slice(0, 1000);
    if (mergedReadArticles.length > (existing.readArticleIds?.length || 0)) {
      mergedChanges += mergedReadArticles.length - (existing.readArticleIds?.length || 0);
    }
    const mergedBookmarkedArticles = Array.from(new Set([
      ...(Array.isArray(existing.bookmarkedArticleIds) ? existing.bookmarkedArticleIds : []),
      ...safeBookmarkedArticles
    ])).slice(0, 500);
    if (mergedBookmarkedArticles.length > (existing.bookmarkedArticleIds?.length || 0)) {
      mergedChanges += mergedBookmarkedArticles.length - (existing.bookmarkedArticleIds?.length || 0);
    }

    // 4. Streak: Choose maximum to preserve hard-earned cleanroom discipline
    const mergedStreak = Math.max(
      existing.streakCount || 1,
      incomingData.streakCount || 1
    );
    if (mergedStreak !== existing.streakCount) {
      mergedChanges++;
    }

    // 5. Diagnostics: Deep merge SVO stats, mastered topics, and pause hotspots
    const exDiag = existing.diagnostics || {};
    const inDiag = incomingData.diagnostics || {};
    const exSvo = exDiag.svoStats || {};
    const inSvo = inDiag.svoStats || {};
    const mergedSvoStats = (exDiag.svoStats || inDiag.svoStats) ? {
      subjectErrors: Math.max(exSvo.subjectErrors || 0, inSvo.subjectErrors || 0),
      actionErrors: Math.max(exSvo.actionErrors || 0, inSvo.actionErrors || 0),
      bridgeErrors: Math.max(exSvo.bridgeErrors || 0, inSvo.bridgeErrors || 0),
      objectErrors: Math.max(exSvo.objectErrors || 0, inSvo.objectErrors || 0),
      totalAttempts: Math.max(exSvo.totalAttempts || 0, inSvo.totalAttempts || 0),
      correctAttempts: Math.max(exSvo.correctAttempts || 0, inSvo.correctAttempts || 0),
    } : undefined;

    const hotspotMap = new Map<string, any>();
    for (const h of (exDiag.pauseHotspots?.hotspots || [])) {
      if (h?.segment) hotspotMap.set(`${h.category || 'svo'}:${h.segment}`, h);
    }
    for (const h of (inDiag.pauseHotspots?.hotspots || [])) {
      if (!h?.segment) continue;
      const k = `${h.category || 'svo'}:${h.segment}`;
      const prevH = hotspotMap.get(k);
      if (!prevH || (h.pauseCount || 0) >= (prevH.pauseCount || 0)) {
        hotspotMap.set(k, h);
      }
    }
    const mergedPauseHotspots = (exDiag.pauseHotspots || inDiag.pauseHotspots) ? {
      totalHesitations: Math.max(exDiag.pauseHotspots?.totalHesitations || 0, inDiag.pauseHotspots?.totalHesitations || 0),
      avgHesitationMs: inDiag.pauseHotspots?.avgHesitationMs ?? exDiag.pauseHotspots?.avgHesitationMs ?? 450,
      svoPauseIndex: inDiag.pauseHotspots?.svoPauseIndex ?? exDiag.pauseHotspots?.svoPauseIndex ?? 35,
      speechPauseIndex: inDiag.pauseHotspots?.speechPauseIndex ?? exDiag.pauseHotspots?.speechPauseIndex ?? 40,
      hotspots: Array.from(hotspotMap.values()).slice(0, 40)
    } : undefined;

    const mergedDiagnostics = {
      ...exDiag,
      ...inDiag,
      totalSentencesPracticed: Math.max(
        exDiag.totalSentencesPracticed || 0,
        inDiag.totalSentencesPracticed || 0
      ),
      totalArticlesRead: Math.max(
        exDiag.totalArticlesRead || 0,
        inDiag.totalArticlesRead || 0
      ),
      speechScoreAverage: inDiag.speechScoreAverage ?? exDiag.speechScoreAverage ?? 88,
      masteredTopics: Array.from(new Set([
        ...(Array.isArray(exDiag.masteredTopics) ? exDiag.masteredTopics : []),
        ...(Array.isArray(inDiag.masteredTopics) ? inDiag.masteredTopics : [])
      ])),
      ...(mergedSvoStats ? { svoStats: mergedSvoStats } : {}),
      ...(mergedPauseHotspots ? { pauseHotspots: mergedPauseHotspots } : {})
    };
    if (mergedDiagnostics.totalSentencesPracticed > (exDiag.totalSentencesPracticed || 0)) {
      mergedChanges++;
    }

    // 6. Merge Engineer Notes with per-key timestamp conflict protection & Flashcard Mastery
    const mergedNoteTimestamps: Record<string, number> = clampSafeRecord<number>(existing.noteTimestamps || {}, 1000);
    const mergedLessonNotes: Record<string, string> = clampSafeRecord<string>(existing.lessonNotes || {}, 500);
    const mergedVocabNotes: Record<string, string> = clampSafeRecord<string>(existing.vocabNotes || {}, 500);

    for (const [k, v] of Object.entries(safeLessonNotes)) {
      const tsKey = `lesson:${k}`;
      const prevTs = Number(mergedNoteTimestamps[tsKey]) || 0;
      const inTs = Number(safeNoteTimestamps[tsKey]) || 0;
      const hasPrev = Object.prototype.hasOwnProperty.call(mergedLessonNotes, k);
      if (!hasPrev || inTs === 0 || inTs >= prevTs) {
        if (mergedLessonNotes[k] !== v) {
          mergedLessonNotes[k] = v;
          mergedChanges++;
        }
        if (inTs > prevTs) mergedNoteTimestamps[tsKey] = inTs;
      }
    }
    for (const [k, v] of Object.entries(safeVocabNotes)) {
      const tsKey = `vocab:${k}`;
      const prevTs = Number(mergedNoteTimestamps[tsKey]) || 0;
      const inTs = Number(safeNoteTimestamps[tsKey]) || 0;
      const hasPrev = Object.prototype.hasOwnProperty.call(mergedVocabNotes, k);
      if (!hasPrev || inTs === 0 || inTs >= prevTs) {
        if (mergedVocabNotes[k] !== v) {
          mergedVocabNotes[k] = v;
          mergedChanges++;
        }
        if (inTs > prevTs) mergedNoteTimestamps[tsKey] = inTs;
      }
    }

    const mergedFlashcardMastered = Array.from(new Set([
      ...(Array.isArray(existing.flashcardMastered) ? existing.flashcardMastered : []),
      ...safeFlashcardMastered
    ])).slice(0, 2000);
    if (mergedFlashcardMastered.length > (existing.flashcardMastered?.length || 0)) {
      mergedChanges += mergedFlashcardMastered.length - (existing.flashcardMastered?.length || 0);
    }

    // 7. Merge Imported Vocab & Imported Lessons via Set Union (prevents losing custom items across devices)
    const vocabKeySet = new Set<string>();
    const mergedImportedVocab: any[] = [];
    for (const item of [...(existing.importedVocab || []), ...safeImportedVocab]) {
      if (!item || typeof item !== 'object' || mergedImportedVocab.length >= 500) continue;
      const key = String(item.id || item.word || '').trim().toLowerCase();
      if (!key || vocabKeySet.has(key)) continue;
      vocabKeySet.add(key);
      mergedImportedVocab.push(item);
    }
    if (mergedImportedVocab.length > (existing.importedVocab?.length || 0)) {
      mergedChanges += mergedImportedVocab.length - (existing.importedVocab?.length || 0);
    }

    const lessonKeySet = new Set<string>();
    const mergedImportedLessons: any[] = [];
    for (const item of [...(existing.importedLessons || []), ...safeImportedLessons]) {
      if (!item || typeof item !== 'object' || mergedImportedLessons.length >= 300) continue;
      const key = String(item.id || item.english_sentence || '').trim().toLowerCase();
      if (!key || lessonKeySet.has(key)) continue;
      lessonKeySet.add(key);
      mergedImportedLessons.push(item);
    }
    if (mergedImportedLessons.length > (existing.importedLessons?.length || 0)) {
      mergedChanges += mergedImportedLessons.length - (existing.importedLessons?.length || 0);
    }

    // 8. Merge SM-2 Spaced Repetition Memory (newest lastReviewedAt wins per lessonId)
    const mergedSrsMemory: Record<string, any> = clampSafeRecord<any>(existing.srsMemory || {}, 1500);
    for (const [lessonId, incomingEntry] of Object.entries(safeSrsMemory)) {
      if (!incomingEntry || typeof incomingEntry !== 'object') continue;
      const prevEntry = Object.prototype.hasOwnProperty.call(mergedSrsMemory, lessonId) ? mergedSrsMemory[lessonId] : undefined;
      const incomingTs = Number((incomingEntry as any).lastReviewedAt) || 0;
      const prevTs = Number(prevEntry?.lastReviewedAt) || 0;
      if (!prevEntry || incomingTs > prevTs) {
        mergedSrsMemory[lessonId] = incomingEntry;
        mergedChanges++;
      }
    }

    // 9. Merge Speech Shadowing Best Scores (highest score wins per scenarioId)
    const mergedShadowingScores: Record<string, number> = clampSafeRecord<number>(existing.shadowingScores || {}, 500);
    for (const [scenarioId, rawScore] of Object.entries(safeShadowingScores)) {
      const numericScore = Number(rawScore);
      if (!Number.isFinite(numericScore)) continue;
      const clamped = Math.min(100, Math.max(0, Math.round(numericScore)));
      const prevScore = Object.prototype.hasOwnProperty.call(mergedShadowingScores, scenarioId)
        ? mergedShadowingScores[scenarioId]
        : -1;
      if (clamped > prevScore) {
        mergedShadowingScores[scenarioId] = clamped;
        mergedChanges++;
      }
    }

    // 10. Merge Pronunciation Trend History & Weak Phoneme Analytics (CRDT union)
    const mergedPronunciationAnalytics =
      existing.pronunciationAnalytics || safePronunciationAnalytics
        ? mergePronunciationAnalytics(existing.pronunciationAnalytics, safePronunciationAnalytics)
        : undefined;
    if (
      mergedPronunciationAnalytics &&
      mergedPronunciationAnalytics.sessions.length > (existing.pronunciationAnalytics?.sessions?.length || 0)
    ) {
      mergedChanges +=
        mergedPronunciationAnalytics.sessions.length - (existing.pronunciationAnalytics?.sessions?.length || 0);
    }

    // 11. Merge Speech Speed Preference (latest timestamp wins)
    const prevSpeedTs = Number(existing.speechSpeedUpdatedAt) || 0;
    const useIncomingSpeed = incomingSpeed !== undefined && (existing.speechSpeed === undefined || incomingSpeedTs >= prevSpeedTs);
    const mergedSpeechSpeed = useIncomingSpeed ? incomingSpeed : existing.speechSpeed;
    const mergedSpeechSpeedTs = useIncomingSpeed ? (incomingSpeedTs || Date.now()) : prevSpeedTs;
    if (useIncomingSpeed && incomingSpeed !== existing.speechSpeed) {
      mergedChanges++;
    }

    const updatedRecord: UserProfileRecord = {
      userId,
      bookmarks: mergedBookmarks,
      visitedLessonIds: mergedVisited,
      readArticleIds: mergedReadArticles,
      bookmarkedArticleIds: mergedBookmarkedArticles,
      diagnostics: mergedDiagnostics,
      streakCount: mergedStreak,
      shiftSettings: incomingData.shiftSettings && Object.keys(incomingData.shiftSettings).length > 0
        ? { ...(existing.shiftSettings || {}), ...incomingData.shiftSettings }
        : (existing.shiftSettings || {}),
      lessonNotes: mergedLessonNotes,
      vocabNotes: mergedVocabNotes,
      noteTimestamps: mergedNoteTimestamps,
      flashcardMastered: mergedFlashcardMastered,
      importedVocab: mergedImportedVocab,
      importedLessons: mergedImportedLessons,
      srsMemory: mergedSrsMemory,
      shadowingScores: mergedShadowingScores,
      pronunciationAnalytics: mergedPronunciationAnalytics,
      speechSpeed: mergedSpeechSpeed,
      speechSpeedUpdatedAt: mergedSpeechSpeedTs || undefined,
      speechRecordingsCount: Math.max(
        existing.speechRecordingsCount || 0,
        incomingData.speechRecordingsCount || 0
      ),
      completedDrillsCount: Math.max(
        existing.completedDrillsCount || 0,
        incomingData.completedDrillsCount || 0
      ),
      revision: (existing.revision || 1) + 1,
      lastUpdated: new Date().toISOString()
    };

    this.memoryData.userProfiles[userId] = updatedRecord;
    this.isDirty = true;
    this.scheduleFastFlush();

    return { record: updatedRecord, mergedChangesCount: mergedChanges };
  }

  public deleteUserProfile(userId: string): boolean {
    if (!isValidProfileUserId(userId)) return false;
    if (Object.prototype.hasOwnProperty.call(this.memoryData.userProfiles, userId)) {
      delete this.memoryData.userProfiles[userId];
      this.isDirty = true;
      this.scheduleFastFlush();
      return true;
    }
    return false;
  }

  public getUserProfile(userId: string): UserProfileRecord | null {
    if (!isValidProfileUserId(userId)) return null;
    if (!Object.prototype.hasOwnProperty.call(this.memoryData.userProfiles, userId)) {
      return null;
    }
    return this.memoryData.userProfiles[userId] || null;
  }

  public logSyncJournal(entry: Omit<SyncJournalEntry, 'id'>): SyncJournalEntry {
    const journal: SyncJournalEntry = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...entry
    };

    this.memoryData.syncJournals.unshift(journal);
    if (this.memoryData.syncJournals.length > 50) {
      this.memoryData.syncJournals = this.memoryData.syncJournals.slice(0, 50);
    }
    this.isDirty = true;
    return journal;
  }

  public getSyncJournals(limit = 20): SyncJournalEntry[] {
    return this.memoryData.syncJournals.slice(0, limit);
  }

  public saveCustomLesson(lesson: any): any {
    const newLesson = {
      ...lesson,
      id: lesson.id || `custom_${Date.now()}`,
      savedAt: new Date().toISOString()
    };
    this.memoryData.customLessons.unshift(newLesson);
    if (this.memoryData.customLessons.length > 100) {
      this.memoryData.customLessons = this.memoryData.customLessons.slice(0, 100);
    }
    this.isDirty = true;
    return newLesson;
  }

  public getCustomLessons(): any[] {
    return this.memoryData.customLessons;
  }

  public logAudit(level: 'info' | 'warn' | 'error', event: string, meta?: any): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      meta
    };
    this.memoryData.systemAuditLogs.unshift(entry);
    if (this.memoryData.systemAuditLogs.length > 100) {
      this.memoryData.systemAuditLogs = this.memoryData.systemAuditLogs.slice(0, 100);
    }
    this.isDirty = true;
  }

  public getDatabaseStats(): {
    databaseVersion: number;
    totalUserProfiles: number;
    totalSyncJournals: number;
    totalCustomLessons: number;
    dbFileSizeBytes: number;
    lastFlushedAt: string;
    backupsAvailableCount: number;
    status: 'healthy' | 'degraded';
  } {
    let sizeBytes = 0;
    try {
      if (fs.existsSync(this.dbFilePath)) {
        sizeBytes = fs.statSync(this.dbFilePath).size;
      }
    } catch {}

    let backupCount = 0;
    try {
      if (fs.existsSync(this.backupDir)) {
        backupCount = fs.readdirSync(this.backupDir).filter(f => f.endsWith('.json')).length;
      }
    } catch {}

    return {
      databaseVersion: this.memoryData.version,
      totalUserProfiles: Object.keys(this.memoryData.userProfiles).length,
      totalSyncJournals: this.memoryData.syncJournals.length,
      totalCustomLessons: this.memoryData.customLessons.length,
      dbFileSizeBytes: sizeBytes,
      lastFlushedAt: this.memoryData.lastFlushedAt,
      backupsAvailableCount: backupCount,
      status: 'healthy'
    };
  }
}

// Global Singleton Instance
export const fabDatabase = new FabDatabase();
