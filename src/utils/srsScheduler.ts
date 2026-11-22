import { Lesson } from '../types';

export type MemoryRating = 'hard' | 'good' | 'easy';

export interface SrsCardState {
  lessonId: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lastRating: MemoryRating;
  lastReviewedAt: number;
  nextReviewAt: number;
}

export const SRS_STORAGE_KEY = 'fse_srs_memory_v1';
const DAY_MS = 24 * 60 * 60 * 1000;

export function loadSrsMap(): Record<string, SrsCardState> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(SRS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveSrsMap(map: Record<string, SrsCardState>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('fse-srs-updated'));
  } catch {
    // Ignore storage quota errors safely
  }
}

/**
 * SM-2 Spaced Repetition calculation tailored for short FSE cleanroom drills
 */
export function rateLessonMemory(
  lessonId: string,
  rating: MemoryRating,
  now: number = Date.now()
): { updatedCard: SrsCardState; map: Record<string, SrsCardState> } {
  const map = loadSrsMap();
  const prev = map[lessonId];

  let repetitions = prev?.repetitions ?? 0;
  let easeFactor = prev?.easeFactor ?? 2.5;
  let intervalDays = prev?.intervalDays ?? 0;

  if (rating === 'hard') {
    repetitions = 0;
    intervalDays = 0;
    easeFactor = Math.max(1.3, Number((easeFactor - 0.2).toFixed(2)));
  } else if (rating === 'good') {
    repetitions += 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 3;
    } else {
      intervalDays = Math.max(2, Math.round(intervalDays * easeFactor));
    }
  } else {
    // 'easy'
    repetitions += 1;
    easeFactor = Math.min(3.0, Number((easeFactor + 0.15).toFixed(2)));
    if (repetitions === 1) {
      intervalDays = 4;
    } else {
      intervalDays = Math.max(4, Math.round(intervalDays * easeFactor * 1.25));
    }
  }

  const nextReviewAt = intervalDays === 0 ? now : now + intervalDays * DAY_MS;

  const updatedCard: SrsCardState = {
    lessonId,
    intervalDays,
    easeFactor,
    repetitions,
    lastRating: rating,
    lastReviewedAt: now,
    nextReviewAt,
  };

  const nextMap = {
    ...map,
    [lessonId]: updatedCard,
  };
  saveSrsMap(nextMap);

  return { updatedCard, map: nextMap };
}

export function isLessonDueForReview(
  lessonId: string,
  srsMap: Record<string, SrsCardState>,
  now: number = Date.now()
): boolean {
  const entry = srsMap[lessonId];
  if (!entry) return true; // Unreviewed lessons are ready for study/review
  return entry.nextReviewAt <= now;
}

export function getDueLessonsCount(
  lessons: Lesson[],
  srsMap: Record<string, SrsCardState>,
  now: number = Date.now()
): number {
  return lessons.filter((l) => isLessonDueForReview(l.id, srsMap, now)).length;
}

export function formatNextReviewLabel(
  entry?: SrsCardState,
  now: number = Date.now()
): string {
  if (!entry) return '尚未評級 · 建議熟記';
  if (entry.lastRating === 'hard' || entry.nextReviewAt <= now) {
    return '今日待複習';
  }
  const diffDays = Math.max(1, Math.ceil((entry.nextReviewAt - now) / DAY_MS));
  return `已記熟 · ${diffDays} 天後複習`;
}
