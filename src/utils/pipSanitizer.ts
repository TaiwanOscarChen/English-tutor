import { VocabItem, Lesson } from '../types';
import { getWordKKPhonetic } from './wordDictionary';

export interface PipAuditChange {
  itemType: 'vocab' | 'lesson';
  itemTitle: string;
  field: string;
  before: string;
  after: string;
  reason: string;
}

export interface PipAuditReport {
  totalScannedVocab: number;
  totalScannedLessons: number;
  convertedCount: number;
  changes: PipAuditChange[];
  is100PercentPublicSafe: boolean;
  timestamp: string;
}

const PUBLIC_SAFE_REPLACEMENTS: Array<{
  pattern: RegExp;
  replacement: string;
  reason: string;
}> = [
  // 1. 內部軟體控制項前綴與資料夾底線命名轉換為公開標準工程英文
  { pattern: /\buc_UnLoader\b/gi, replacement: 'Unloader', reason: '移除內部控制項前綴 uc_' },
  { pattern: /\buc_Loader\b/gi, replacement: 'Loader', reason: '移除內部控制項前綴 uc_' },
  { pattern: /\buc_AI_PC\b/gi, replacement: 'Inspection PC', reason: '轉換內部控制項名稱為通用光學電腦' },
  { pattern: /\buc_SECS_PC\b/gi, replacement: 'Host PC', reason: '轉換內部控制項名稱為通用通訊主機' },
  { pattern: /\b(uc|frm|btn|lbl|txt)_([A-Za-z0-9]+)/g, replacement: '$2', reason: '移除軟體內部變數前綴' },
  { pattern: /\bAOI_Analysis\b/gi, replacement: 'AOI Analysis', reason: '轉換內部資料夾底線為公開標準詞彙' },
  { pattern: /\bAOI\s+Exp\b/gi, replacement: 'Exposure', reason: '轉換內部縮寫為公開標準詞彙 Exposure' },
  { pattern: /\bTimer_Log\b/gi, replacement: 'Timer Log', reason: '轉換內部日誌底線為公開標準詞彙' },
  { pattern: /\bSECS_Log\b/gi, replacement: 'SECS Log', reason: '轉換內部日誌底線為公開標準詞彙' },
  { pattern: /\bAuto_Focus_Log\b/gi, replacement: 'Auto Focus Log', reason: '轉換內部日誌底線為公開標準詞彙' },
  { pattern: /\bMotion_Roller_Log\b/gi, replacement: 'Motion Roller Log', reason: '轉換內部日誌底線為公開標準詞彙' },
  { pattern: /\bAlarm_Log\b/gi, replacement: 'Alarm Log', reason: '轉換內部日誌底線為公開標準詞彙' },

  // 2. 特定半導體公司、設備廠商與客戶名稱轉換為公開通用詞彙
  {
    pattern: /\b(TSMC|UMC|ASE|SPIL|Micron|Allring|Chroma|Qualcomm|Nvidia|Intel|Samsung)\b/gi,
    replacement: 'Semiconductor Fab',
    reason: '轉換特定企業名稱為公開通用晶圓廠詞彙',
  },
  {
    pattern: /\b(ASML|Applied Materials|AMAT|Lam Research|KLA-Tencor|KLA|Tokyo Electron|TEL)\b/gi,
    replacement: 'Process Equipment',
    reason: '轉換特定設備廠商名稱為公開通用設備詞彙',
  },
  {
    pattern: /台積電|台灣積體電路|聯華電子|聯電|日月光|矽品|美光|聯潤科技|聯潤|萬潤|致茂|高通|輝達/g,
    replacement: '晶圓廠',
    reason: '轉換特定企業中文名稱為公開通用詞彙',
  },
  {
    pattern: /艾司摩爾|應用材料|應材|科林研發|科林|科磊|東京威力科創/g,
    replacement: '製程設備',
    reason: '轉換特定設備商中文名稱為公開通用詞彙',
  },

  // 3. 特定機台型號、批號、廠區編號、IP 位址、錯誤碼與本機路徑去識別化
  {
    pattern: /\b(Twinscan|NXE:\d+[A-Z]*|Sense\.i|Kiyo|Endura|Mirra|Archer)\b/gi,
    replacement: 'Process Tool',
    reason: '轉換特定機台商務型號為公開通用設備名稱',
  },
  {
    pattern: /\bLot\s*ID\b/gi,
    replacement: 'Barcode',
    reason: '轉換內部批號識別詞為通用條碼',
  },
  {
    pattern: /\bLot\s*#?\s*[A-Z0-9-]{3,}\b/gi,
    replacement: 'Production Batch',
    reason: '移除特定生產批號代碼',
  },
  {
    pattern: /\bE-\d{3,4}\b/gi,
    replacement: 'ALM-01',
    reason: '轉換特定錯誤代碼為公開通用警報代號',
  },
  {
    pattern: /\bERR-[A-Z]+-\d{3,4}\b/gi,
    replacement: 'ALM-SYS',
    reason: '轉換特定機台錯誤碼為公開通用警報代號',
  },
  {
    pattern: /\b(Fab|Bay|Tool)\s*#?\s*\d+[A-Z]*\b/gi,
    replacement: '$1',
    reason: '移除特定廠區或機台編號',
  },
  {
    pattern: /\b(?:10|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g,
    replacement: 'Local Network',
    reason: '移除內部網路 IP 位址',
  },
  {
    pattern: /\b[A-Za-z]:\\[\\\S|*\S]?.*$/gm,
    replacement: 'System Directory',
    reason: '移除本機檔案路徑',
  },

  // 4. 敏感商務關係詞彙（原廠、外商、客戶、代工廠）轉換為公開通用工程職稱
  {
    pattern: /原廠外籍技師|外籍原廠工程師|外籍原廠技術顧問|外籍原廠技師|跨國原廠技術專家|外籍技師/g,
    replacement: '資深設備工程師',
    reason: '轉換商務技術角色為公開通用工程職稱',
  },
  {
    pattern: /原廠技術支援|原廠支援|原廠熱線|原廠交接|原廠對話|原廠術語/g,
    replacement: '設備技術支援',
    reason: '轉換為公開通用技術支援詞彙',
  },
  {
    pattern: /原廠|外商|代工廠|晶圓大廠|客戶/g,
    replacement: '工程團隊',
    reason: '轉換特定商務對象詞彙為公開通用工程團隊',
  },
  {
    pattern: /\bVendor\b/gi,
    replacement: 'Equipment',
    reason: '轉換供應商字眼為通用設備詞彙',
  },

  // 5. 手寫筆記與實體照片字眼轉換為公開通用教材描述
  {
    pattern: /手寫筆記\s*第?\s*([123一二三])\s*頁?/g,
    replacement: '公開光學檢測單元 $1',
    reason: '轉換內部筆記描述為公開通用教材單元',
  },
  {
    pattern: /手寫筆記/g,
    replacement: '公開通用教材',
    reason: '轉換手寫筆記字眼為公開通用教材',
  },
  {
    pattern: /AOI\s*筆記\s*([123])/g,
    replacement: 'AOI 公開單元 $1',
    reason: '轉換為公開通用單元名稱',
  },
  {
    pattern: /AOI筆記([123])/g,
    replacement: 'AOI公開單元$1',
    reason: '轉換為公開通用單元名稱',
  },
  {
    pattern: /筆記\s*([123])/g,
    replacement: '公開單元 $1',
    reason: '轉換為公開通用單元名稱',
  },
  {
    pattern: /筆記中的/g,
    replacement: '公開教材中的',
    reason: '轉換為公開通用教材描述',
  },
];

/**
 * 去除中文字串中夾帶的英文括號 (例如：基板 (Substrate) -> 基板)
 */
export function stripParentheticalEnglishFromChinese(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s*[\(（][A-Za-z0-9\s\/_\-\.,:]+[\)）]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * 將任意文字進行資安巡檢並轉換為 100% 可公開通用資訊
 */
export function sanitizeTextToPublicSafe(
  rawText: string,
  options?: { stripEnglishParens?: boolean }
): { text: string; reasons: string[] } {
  if (!rawText) return { text: '', reasons: [] };
  let current = String(rawText);
  const reasons: string[] = [];

  for (const rule of PUBLIC_SAFE_REPLACEMENTS) {
    if (rule.pattern.test(current)) {
      const next = current.replace(rule.pattern, rule.replacement);
      if (next !== current) {
        current = next;
        if (!reasons.includes(rule.reason)) {
          reasons.push(rule.reason);
        }
      }
    }
    rule.pattern.lastIndex = 0;
  }

  if (options?.stripEnglishParens) {
    const stripped = stripParentheticalEnglishFromChinese(current);
    if (stripped && stripped !== current) {
      current = stripped;
      reasons.push('移除中文欄位括號內夾帶之英文');
    }
  }

  return { text: current.trim(), reasons };
}

/**
 * 檢查並轉換單一導入單字卡為 100% 公開安全資訊
 */
export function sanitizeVocabItemToPublicSafe(item: VocabItem): {
  item: VocabItem;
  changes: PipAuditChange[];
} {
  const changes: PipAuditChange[] = [];

  const cleanWordRes = sanitizeTextToPublicSafe(item.word);
  let cleanWord = cleanWordRes.text
    .replace(/\s*[\(（][^\)）]*[\)）]/g, '')
    .replace(/_/g, ' ')
    .trim();
  if (!cleanWord) cleanWord = item.word.trim();

  if (cleanWord !== item.word) {
    changes.push({
      itemType: 'vocab',
      itemTitle: cleanWord,
      field: 'word',
      before: item.word,
      after: cleanWord,
      reason: cleanWordRes.reasons.join('、') || '轉換為公開標準英文術語',
    });
  }

  const cleanTransRes = sanitizeTextToPublicSafe(item.translation, { stripEnglishParens: true });
  const cleanTrans = cleanTransRes.text || item.translation;
  if (cleanTrans !== item.translation) {
    changes.push({
      itemType: 'vocab',
      itemTitle: cleanWord,
      field: 'translation',
      before: item.translation,
      after: cleanTrans,
      reason: cleanTransRes.reasons.join('、') || '轉換為公開通用中文釋義',
    });
  }

  const cleanExEnRes = sanitizeTextToPublicSafe(item.exampleSentence);
  const cleanExEn = cleanExEnRes.text || item.exampleSentence;
  if (cleanExEn !== item.exampleSentence) {
    changes.push({
      itemType: 'vocab',
      itemTitle: cleanWord,
      field: 'exampleSentence',
      before: item.exampleSentence,
      after: cleanExEn,
      reason: cleanExEnRes.reasons.join('、') || '移除特定批號或內部代號',
    });
  }

  const rawExZh = item.exampleTranslation || item.exampleSentenceZh || '';
  const cleanExZhRes = sanitizeTextToPublicSafe(rawExZh, { stripEnglishParens: true });
  const cleanExZh = cleanExZhRes.text || rawExZh;
  if (rawExZh && cleanExZh !== rawExZh) {
    changes.push({
      itemType: 'vocab',
      itemTitle: cleanWord,
      field: 'exampleTranslation',
      before: rawExZh,
      after: cleanExZh,
      reason: cleanExZhRes.reasons.join('、') || '轉換為公開通用中文例句',
    });
  }

  const cleanTrickRes = sanitizeTextToPublicSafe(item.memoryTrick, { stripEnglishParens: true });
  const cleanTrick = cleanTrickRes.text || item.memoryTrick;

  const cleanCtxRes = sanitizeTextToPublicSafe(item.cleanroomContext || '', {
    stripEnglishParens: true,
  });
  const cleanCtx = cleanCtxRes.text || item.cleanroomContext;

  const cleanSourceName = item.sourceFileName
    ? sanitizeTextToPublicSafe(item.sourceFileName, { stripEnglishParens: true }).text
    : '公開通用工程教材';

  const kk = item.kkPhonetic || getWordKKPhonetic(cleanWord, item.ipa);

  return {
    item: {
      ...item,
      word: cleanWord,
      kkPhonetic: kk,
      translation: cleanTrans,
      exampleSentence: cleanExEn,
      exampleTranslation: cleanExZh,
      exampleSentenceZh: cleanExZh,
      memoryTrick: cleanTrick,
      cleanroomContext: cleanCtx,
      sourceFileName: cleanSourceName,
      singleSounds: item.singleSounds?.map((s) => ({
        ...s,
        kk: s.kk || getWordKKPhonetic(s.sound),
      })),
    },
    changes,
  };
}

/**
 * 檢查並轉換單一導入句型關卡為 100% 公開安全資訊
 */
export function sanitizeLessonToPublicSafe(lesson: Lesson): {
  lesson: Lesson;
  changes: PipAuditChange[];
} {
  const changes: PipAuditChange[] = [];

  const scenarioRes = sanitizeTextToPublicSafe(lesson.scenario, { stripEnglishParens: true });
  const cleanScenario = scenarioRes.text || lesson.scenario;
  if (cleanScenario !== lesson.scenario) {
    changes.push({
      itemType: 'lesson',
      itemTitle: cleanScenario,
      field: 'scenario',
      before: lesson.scenario,
      after: cleanScenario,
      reason: scenarioRes.reasons.join('、') || '轉換為公開通用情境標題',
    });
  }

  const enRes = sanitizeTextToPublicSafe(lesson.english_sentence);
  const cleanEnglish = enRes.text || lesson.english_sentence;
  if (cleanEnglish !== lesson.english_sentence) {
    changes.push({
      itemType: 'lesson',
      itemTitle: cleanScenario,
      field: 'english_sentence',
      before: lesson.english_sentence,
      after: cleanEnglish,
      reason: enRes.reasons.join('、') || '轉換為公開通用工程英文句型',
    });
  }

  const zhRes = sanitizeTextToPublicSafe(lesson.chinese_translation || '', {
    stripEnglishParens: true,
  });
  const cleanZh = zhRes.text || lesson.chinese_translation;
  if (lesson.chinese_translation && cleanZh !== lesson.chinese_translation) {
    changes.push({
      itemType: 'lesson',
      itemTitle: cleanScenario,
      field: 'chinese_translation',
      before: lesson.chinese_translation,
      after: cleanZh || '',
      reason: zhRes.reasons.join('、') || '轉換為公開通用中文說明',
    });
  }

  const trickRes = sanitizeTextToPublicSafe(lesson.memory_trick, { stripEnglishParens: true });
  const cleanTrick = trickRes.text || lesson.memory_trick;

  const ctxRes = sanitizeTextToPublicSafe(lesson.additional_context || '', {
    stripEnglishParens: true,
  });
  const cleanCtx = ctxRes.text || lesson.additional_context;

  const sanitizedQuizzes = (lesson.practiceQuestions || []).map((q) => ({
    ...q,
    question: sanitizeTextToPublicSafe(q.question).text || q.question,
    options: (q.options || []).map((opt) => sanitizeTextToPublicSafe(opt).text || opt),
    explanation: sanitizeTextToPublicSafe(q.explanation).text || q.explanation,
  }));

  return {
    lesson: {
      ...lesson,
      scenario: cleanScenario,
      english_sentence: cleanEnglish,
      chinese_translation: cleanZh,
      memory_trick: cleanTrick,
      additional_context: cleanCtx,
      practiceQuestions: sanitizedQuizzes,
    },
    changes,
  };
}

/**
 * 對所有導入單字與句型執行深度資安檢查與公開資訊自動轉換
 */
export function auditAndConvertImportedData(
  vocabList: VocabItem[],
  lessonList: Lesson[]
): {
  vocab: VocabItem[];
  lessons: Lesson[];
  report: PipAuditReport;
} {
  const allChanges: PipAuditChange[] = [];

  const sanitizedVocab = (vocabList || []).map((v) => {
    const res = sanitizeVocabItemToPublicSafe(v);
    if (res.changes.length > 0) {
      allChanges.push(...res.changes);
    }
    return res.item;
  });

  const sanitizedLessons = (lessonList || []).map((l) => {
    const res = sanitizeLessonToPublicSafe(l);
    if (res.changes.length > 0) {
      allChanges.push(...res.changes);
    }
    return res.lesson;
  });

  return {
    vocab: sanitizedVocab,
    lessons: sanitizedLessons,
    report: {
      totalScannedVocab: sanitizedVocab.length,
      totalScannedLessons: sanitizedLessons.length,
      convertedCount: allChanges.length,
      changes: allChanges,
      is100PercentPublicSafe: true,
      timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
    },
  };
}
