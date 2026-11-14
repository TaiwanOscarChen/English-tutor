import { useState, useEffect, useCallback } from 'react';
import { playSuccessChime } from '../utils/audioEffects';
import { queueAutoServerSync } from '../utils/serverSyncService';
import { Article, VocabItem, Lesson } from '../types';

export interface GoldenQuoteItem {
  id: string;
  tag: string; // e.g. '交接必備' | '機台警報' | '無塵工安' | '微影關鍵' | '真空防護'
  english: string;
  chinese: string;
  svo: {
    subject: string;
    action: string;
    object: string;
    bridge?: string;
  };
  phonetic: string;
  context?: string;
}

export interface EmergencyErrorCodeDrill {
  code: string;
  sentence: string;
  translation: string;
  phonetic: string;
  solutionZh?: string;
}

export interface ThreeDayUpdateBundle {
  cycleNumber: number;
  updateTime: string;
  isFallback?: boolean;
  notice?: string;
  lessons: Lesson[];
  goldenQuotes?: GoldenQuoteItem[];
  articles?: Article[];
  vocab?: VocabItem[];
  emergencyErrorCodeDrills?: EmergencyErrorCodeDrill[];
  hotTerm?: {
    term: string;
    meaning: string;
    exampleSentence: string;
    exampleTranslation?: string;
  };
}

// Fixed epoch: 2026-08-01 00:00:00 UTC
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const EPOCH_START = new Date('2026-08-01T00:00:00Z').getTime();

export function useThreeDayAutoUpdate() {
  const [now, setNow] = useState<number>(Date.now());
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [threeDayBundle, setThreeDayBundle] = useState<ThreeDayUpdateBundle | null>(null);
  const [manualOffset, setManualOffset] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fse_3day_manual_offset');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  // Time calculations
  const elapsedTime = Math.max(0, now - EPOCH_START);
  const baseCycleNumber = Math.floor(elapsedTime / THREE_DAYS_MS) + 1;
  const cycleNumber = baseCycleNumber + manualOffset;
  const currentCycleStart = EPOCH_START + (baseCycleNumber - 1) * THREE_DAYS_MS;
  const nextCycleStart = currentCycleStart + THREE_DAYS_MS;
  const msRemaining = Math.max(0, nextCycleStart - now);

  const daysLeft = Math.floor(msRemaining / (24 * 60 * 60 * 1000));
  const hoursLeft = Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutesLeft = Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000));
  const secondsLeft = Math.floor((msRemaining % (60 * 1000)) / 1000);

  const cycleProgressPercent = Math.min(
    100,
    Math.max(0, ((THREE_DAYS_MS - msRemaining) / THREE_DAYS_MS) * 100)
  );

  // Ticking countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch or load bundle for current cycle
  const fetchThreeDayBundle = useCallback(async (targetCycle: number, force = false) => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/3day-auto-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleNumber: targetCycle, forceRefresh: force })
      });
      if (response.ok) {
        const data: ThreeDayUpdateBundle = await response.json();
        setThreeDayBundle(data);
        localStorage.setItem(`fse_3day_bundle_v${targetCycle}`, JSON.stringify(data));
        localStorage.setItem('fse_last_3day_cycle', targetCycle.toString());
        queueAutoServerSync(500);
      }
    } catch (err) {
      console.info('Using local cached 3-day update bundle.');
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Check on load or when cycle changes
  useEffect(() => {
    const savedBundle = localStorage.getItem(`fse_3day_bundle_v${cycleNumber}`);

    if (savedBundle) {
      try {
        const parsed = JSON.parse(savedBundle);
        setThreeDayBundle(parsed);
      } catch (e) {
        fetchThreeDayBundle(cycleNumber);
      }
    } else {
      fetchThreeDayBundle(cycleNumber);
    }
  }, [cycleNumber, fetchThreeDayBundle]);

  const triggerManualUpdate = async () => {
    playSuccessChime();
    const nextOffset = manualOffset + 1;
    setManualOffset(nextOffset);
    try {
      localStorage.setItem('fse_3day_manual_offset', nextOffset.toString());
    } catch {}
    await fetchThreeDayBundle(baseCycleNumber + nextOffset, true);
  };

  return {
    cycleNumber,
    daysLeft,
    hoursLeft,
    minutesLeft,
    secondsLeft,
    cycleProgressPercent,
    isUpdating,
    threeDayBundle,
    triggerManualUpdate
  };
}
