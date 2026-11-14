import { Lesson, LessonQuizQuestion } from '../types';

function cleanText(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\(（][^\)）]*[\u4e00-\u9fa5][^\)）]*[\)）]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deterministic pseudo-random placement generator based on seed string & range
 */
function getPlacementIndex(seedString: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash * 31 + seedString.charCodeAt(i)) >>> 0;
  }
  return hash % max;
}

export function getLessonPracticeQuestions(lesson: Lesson, cycleNumber: number = 18): LessonQuizQuestion[] {
  // If custom practiceQuestions already exist on the lesson, return them
  if (lesson.practiceQuestions && lesson.practiceQuestions.length >= 2) {
    return lesson.practiceQuestions;
  }

  const cleanSubject = cleanText(lesson.components.subject) || 'I';
  const cleanAction = cleanText(lesson.components.action) || 'test';
  const cleanObject = cleanText(lesson.components.object) || 'the machine';
  const sentence = lesson.english_sentence;
  const scenarioShort = lesson.scenario.replace(/^🎬\s*【[^】]+】\s*/, '').replace(/^🎬\s*情境：/, '').split('，')[0];

  // Rotate question types across 3-day cycles (Every 3 days presents a fresh pedagogical focus)
  const cycleVariation = (cycleNumber + (lesson.id ? lesson.id.length : 0)) % 4;

  let q1: LessonQuizQuestion;
  let q2: LessonQuizQuestion;

  // Semiconductor engineering verbs bank
  const semiconductorVerbs = ['calibrate', 'inspect', 'purge', 'isolate', 'measure', 'replace', 'verify', 'align', 'monitor', 'clean'];
  const otherVerbs = semiconductorVerbs.filter(v => v.toLowerCase() !== cleanAction.toLowerCase());

  // Question 1: Rotates every 3-day cycle between Action Identification, SVO Syntax Order, and Tool Diagnostics
  if (cycleVariation === 0) {
    // Mode 0: 核心動作 (Verb / Action) 辨析
    const rawOptions = [cleanAction, otherVerbs[0] || 'inspect', otherVerbs[1] || 'purge', otherVerbs[2] || 'calibrate'];
    const correctPlacement = getPlacementIndex(`${lesson.id}-q1-c${cycleNumber}`, 4);
    const options = [...rawOptions];
    const temp = options[0];
    options[0] = options[correctPlacement];
    options[correctPlacement] = temp;

    q1 = {
      id: `${lesson.id}-c${cycleNumber}-q1`,
      question: `【第 ${cycleNumber} 輪實戰題 1/2】在本關『${sentence}』中，代表『${cleanAction} (動作 V)』的核心工程動詞是哪一個？`,
      options,
      correctIndex: correctPlacement,
      explanation: `正確答案為「${cleanAction}」。在國小 SVO 結構中，${cleanSubject} (主角 S) 搭配 ${cleanAction} (動作 V)，後面接 ${cleanObject} (受詞/東西 O)。`
    };
  } else if (cycleVariation === 1) {
    // Mode 1: 語序結構 (SVO vs Chinglish)
    const rawOptions = [
      `${cleanSubject} + ${cleanAction} + ${cleanObject} (主角 + 動作 + 東西)`,
      `${cleanObject} + ${cleanAction} + ${cleanSubject} (受詞前置倒裝)`,
      `${cleanAction} + ${cleanObject} + ${cleanSubject} (祈使祈求倒裝)`,
      `${cleanSubject} + ${cleanObject} + ${cleanAction} (台語日語語序)`
    ];
    const correctPlacement = getPlacementIndex(`${lesson.id}-q1-c${cycleNumber}`, 4);
    const options = [...rawOptions];
    const temp = options[0];
    options[0] = options[correctPlacement];
    options[correctPlacement] = temp;

    q1 = {
      id: `${lesson.id}-c${cycleNumber}-q1`,
      question: `【第 ${cycleNumber} 輪實戰題 1/2】『${sentence}』符合國小拆解法中的哪一種標準無塵室直覺語序？`,
      options,
      correctIndex: correctPlacement,
      explanation: `正確答案為「${cleanSubject} + ${cleanAction} + ${cleanObject}」。先鎖定開口的主角 (S)，立刻接動作 (V)，再說出被處置的機台或組件 (O)。`
    };
  } else if (cycleVariation === 2) {
    // Mode 2: 動作意義與現場處置
    const rawOptions = [
      `對 ${cleanObject} 執行 ${cleanAction} 操作`,
      `放任 ${cleanObject} 繼續運轉`,
      `直接報廢整個模組`,
      `等待外籍技師下週處理`
    ];
    const correctPlacement = getPlacementIndex(`${lesson.id}-q1-c${cycleNumber}`, 4);
    const options = [...rawOptions];
    const temp = options[0];
    options[0] = options[correctPlacement];
    options[correctPlacement] = temp;

    q1 = {
      id: `${lesson.id}-c${cycleNumber}-q1`,
      question: `【第 ${cycleNumber} 輪實戰題 1/2】當向現場副理回報『${sentence}』時，代表目前工程處置為？`,
      options,
      correctIndex: correctPlacement,
      explanation: `正確答案：回報「${sentence}」表示工程團隊正在或已針對「${cleanObject}」落實「${cleanAction}」程序。`
    };
  } else {
    // Mode 3: 受詞東西 (Object) 辨析
    const rawOptions = [
      cleanObject,
      'the cleanroom floor',
      'the office computer',
      'the wafer scrap bin'
    ];
    const correctPlacement = getPlacementIndex(`${lesson.id}-q1-c${cycleNumber}`, 4);
    const options = [...rawOptions];
    const temp = options[0];
    options[0] = options[correctPlacement];
    options[correctPlacement] = temp;

    q1 = {
      id: `${lesson.id}-c${cycleNumber}-q1`,
      question: `【第 ${cycleNumber} 輪實戰題 1/2】在『${sentence}』中，被執行的目標東西（受詞 O）是哪一項？`,
      options,
      correctIndex: correctPlacement,
      explanation: `正確答案為「${cleanObject}」。動作「${cleanAction}」直接作用在此組件上，確保工程團隊清楚受詞標的。`
    };
  }

  // Question 2: Cleanroom Scenario & Communication Application Question (Rotates every cycle)
  const q2Variation = (cycleNumber + 1) % 3;
  if (q2Variation === 0) {
    // 情境口報標準句
    const rawOptions = [
      sentence,
      `I no know ${cleanObject} bad.`,
      `${cleanObject} is broken problem.`,
      `We doing wait tomorrow.`
    ];
    const correctPlacement = getPlacementIndex(`${lesson.id}-q2-c${cycleNumber}`, 4);
    const options = [...rawOptions];
    const temp = options[0];
    options[0] = options[correctPlacement];
    options[correctPlacement] = temp;

    q2 = {
      id: `${lesson.id}-c${cycleNumber}-q2`,
      question: `【第 ${cycleNumber} 輪實戰題 2/2】遇到【${scenarioShort}】時，向交接主管口報最符合標準 SVO 規範的極簡句子是？`,
      options,
      correctIndex: correctPlacement,
      explanation: `正確答案為「${sentence}」。極簡短句清晰好懂，避免使用 Broken English 或「broken」等非正式含糊字眼。`
    };
  } else if (q2Variation === 1) {
    // 資深工程師詢問應對
    const rawOptions = [
      `Yes, ${sentence.toLowerCase().replace(/[.]+$/, '')}.`,
      `No English, please ask PE.`,
      `Machine finish maybe ok.`,
      `I don't care about this.`
    ];
    const correctPlacement = getPlacementIndex(`${lesson.id}-q2-c${cycleNumber}`, 4);
    const options = [...rawOptions];
    const temp = options[0];
    options[0] = options[correctPlacement];
    options[correctPlacement] = temp;

    q2 = {
      id: `${lesson.id}-c${cycleNumber}-q2`,
      question: `【第 ${cycleNumber} 輪實戰題 2/2】若資深設備工程師抵達機台前詢問狀態，你該如何專業應對？`,
      options,
      correctIndex: correctPlacement,
      explanation: `正確答案為「Yes, ${sentence.toLowerCase().replace(/[.]+$/, '')}。」主動且精確交代主角與動作，建立工程團隊的高度信任感。`
    };
  } else {
    // 工安 LOTO 與防呆互鎖
    const rawOptions = [
      `先落實 LOTO 斷電氣體隔離並口報：${sentence}`,
      `不理會警告標誌直接徒手拆卸`,
      `把警報器靜音後立刻離開無塵室`,
      `交由夜班助理工程師單獨承擔風險`
    ];
    const correctPlacement = getPlacementIndex(`${lesson.id}-q2-c${cycleNumber}`, 4);
    const options = [...rawOptions];
    const temp = options[0];
    options[0] = options[correctPlacement];
    options[correctPlacement] = temp;

    q2 = {
      id: `${lesson.id}-c${cycleNumber}-q2`,
      question: `【第 ${cycleNumber} 輪實戰題 2/2】在執行【${scenarioShort}】作業時，工安（Safety）規範要求的第一準則是？`,
      options,
      correctIndex: correctPlacement,
      explanation: `正確答案為「先落實 LOTO 斷電氣體隔離並口報：${sentence}」。無塵室工安永遠第一，口報明確且落實防護。`
    };
  }

  return [q1, q2];
}
