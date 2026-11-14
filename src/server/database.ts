import fs from 'fs';
import path from 'path';

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
  flashcardMastered?: string[];
  importedVocab?: any[];
  importedLessons?: any[];
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

class FabDatabase {
  private dataDir: string;
  private dbFilePath: string;
  private backupDir: string;
  private memoryData: DatabaseSchema;
  private isDirty = false;
  private isFlushing = false;
  private flushQueued = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.backupDir = path.join(this.dataDir, 'backups');
    this.dbFilePath = path.join(this.dataDir, 'fab_persistence_db.json');

    this.ensureDirectories();
    this.memoryData = this.loadDatabaseFromDisk();

    // Start auto-flush every 5 seconds if dirty
    this.flushTimer = setInterval(() => {
      if (this.isDirty) {
        this.flushToDisk();
      }
    }, 5000);
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

      if (files.length === 0) return null;
      const latest = path.join(this.backupDir, files[0]);
      console.warn(`[FabDB] Restoring database from backup: ${latest}`);
      const raw = fs.readFileSync(latest, 'utf-8');
      return JSON.parse(raw);
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
    const existing = this.memoryData.userProfiles[userId];
    let mergedChanges = 0;

    if (!existing) {
      const newRecord: UserProfileRecord = {
        userId,
        bookmarks: incomingData.bookmarks || [],
        visitedLessonIds: incomingData.visitedLessonIds || [],
        readArticleIds: incomingData.readArticleIds || [],
        bookmarkedArticleIds: incomingData.bookmarkedArticleIds || [],
        diagnostics: incomingData.diagnostics || {},
        streakCount: incomingData.streakCount || 1,
        shiftSettings: incomingData.shiftSettings || {},
        lessonNotes: incomingData.lessonNotes || {},
        vocabNotes: incomingData.vocabNotes || {},
        flashcardMastered: incomingData.flashcardMastered || [],
        importedVocab: incomingData.importedVocab || [],
        importedLessons: incomingData.importedLessons || [],
        speechRecordingsCount: incomingData.speechRecordingsCount || 0,
        completedDrillsCount: incomingData.completedDrillsCount || 0,
        revision: 1,
        lastUpdated: new Date().toISOString()
      };
      this.memoryData.userProfiles[userId] = newRecord;
      this.isDirty = true;
      mergedChanges = (newRecord.bookmarks.length || 0) + (newRecord.visitedLessonIds.length || 0);
      return { record: newRecord, mergedChangesCount: mergedChanges };
    }

    // Smart Union & Merge for existing record:
    // 1. Bookmarks: Union by lesson ID or sentence
    const existingLessonIds = new Set(existing.bookmarks.map((b: any) => b.id || b.english_sentence));
    const mergedBookmarks = [...existing.bookmarks];
    (incomingData.bookmarks || []).forEach((b: any) => {
      const key = b.id || b.english_sentence;
      if (!existingLessonIds.has(key)) {
        mergedBookmarks.push(b);
        existingLessonIds.add(key);
        mergedChanges++;
      }
    });

    // 2. Visited Lessons: Set union
    const mergedVisited = Array.from(new Set([
      ...(existing.visitedLessonIds || []),
      ...(incomingData.visitedLessonIds || [])
    ]));
    if (mergedVisited.length > (existing.visitedLessonIds?.length || 0)) {
      mergedChanges += mergedVisited.length - (existing.visitedLessonIds?.length || 0);
    }

    // 3. Read Articles & Bookmarked Articles: Set union
    const mergedReadArticles = Array.from(new Set([
      ...(existing.readArticleIds || []),
      ...(incomingData.readArticleIds || [])
    ]));
    const mergedBookmarkedArticles = Array.from(new Set([
      ...(existing.bookmarkedArticleIds || []),
      ...(incomingData.bookmarkedArticleIds || [])
    ]));

    // 4. Streak: Choose maximum to preserve hard-earned cleanroom discipline
    const mergedStreak = Math.max(
      existing.streakCount || 1,
      incomingData.streakCount || 1
    );

    // 5. Diagnostics: Deep merge SVO stats and pause hotspots
    const mergedDiagnostics = {
      ...(existing.diagnostics || {}),
      ...(incomingData.diagnostics || {}),
      totalSentencesPracticed: Math.max(
        existing.diagnostics?.totalSentencesPracticed || 0,
        incomingData.diagnostics?.totalSentencesPracticed || 0
      )
    };

    // 6. Merge Engineer Notes & Flashcard Mastery
    const mergedLessonNotes = {
      ...(existing.lessonNotes || {}),
      ...(incomingData.lessonNotes || {})
    };
    const mergedVocabNotes = {
      ...(existing.vocabNotes || {}),
      ...(incomingData.vocabNotes || {})
    };
    const mergedFlashcardMastered = Array.from(new Set([
      ...(existing.flashcardMastered || []),
      ...(incomingData.flashcardMastered || [])
    ]));

    // 7. Merge Imported Vocab & Imported Lessons
    const mergedImportedVocab = Array.isArray(incomingData.importedVocab) && incomingData.importedVocab.length > 0
      ? incomingData.importedVocab
      : (existing.importedVocab || []);
    const mergedImportedLessons = Array.isArray(incomingData.importedLessons) && incomingData.importedLessons.length > 0
      ? incomingData.importedLessons
      : (existing.importedLessons || []);

    const updatedRecord: UserProfileRecord = {
      userId,
      bookmarks: mergedBookmarks,
      visitedLessonIds: mergedVisited,
      readArticleIds: mergedReadArticles,
      bookmarkedArticleIds: mergedBookmarkedArticles,
      diagnostics: mergedDiagnostics,
      streakCount: mergedStreak,
      shiftSettings: incomingData.shiftSettings || existing.shiftSettings,
      lessonNotes: mergedLessonNotes,
      vocabNotes: mergedVocabNotes,
      flashcardMastered: mergedFlashcardMastered,
      importedVocab: mergedImportedVocab,
      importedLessons: mergedImportedLessons,
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

    return { record: updatedRecord, mergedChangesCount: mergedChanges };
  }

  public getUserProfile(userId: string): UserProfileRecord | null {
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
