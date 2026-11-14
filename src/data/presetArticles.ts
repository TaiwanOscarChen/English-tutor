import { Article } from '../types';

export const PRESET_ARTICLES: Article[] = [
  {
    id: 'art-1',
    title: '【無塵室交接心法】如何用 3 句 SVO 直覺英文回覆值班主管機台 Alarm？',
    category: '高頻交接',
    readTime: '3 分鐘',
    publishDate: '2026 年第 32 週實戰週報',
    summary: '當無塵室警報聲大作，值班主管或資深設備工程師趕到機台前時，掌握 SVO 國小語序拆解法能讓你在 10 秒內用超短句清楚交代進度。',
    contentSections: [
      {
        id: 'sec-1-1',
        englishText: 'I check the code.',
        chineseTranslation: '我檢查錯誤代碼。',
        phonetic: '【 愛 ｜ 切-克 ｜ 德 ｜ 扣-德 】',
        svoBreakdown: 'I (主) + check (動) + the code (名)'
      },
      {
        id: 'sec-1-2',
        englishText: 'We calibrate the sensor.',
        chineseTranslation: '我們校正這個感應器。',
        phonetic: '【 威 ｜ 柯-愛-利-伯-瑞-特 ｜ 德 ｜ 山-瑟 】',
        svoBreakdown: 'We (主) + calibrate (動) + the sensor (名)'
      },
      {
        id: 'sec-1-3',
        englishText: 'He resets the module.',
        chineseTranslation: '他重設這個模組。',
        phonetic: '【 嘻 ｜ 瑞-賽-特-斯 ｜ 德 ｜ 模-組 】',
        svoBreakdown: 'He (主) + resets (動) + the module (名)'
      }
    ],
    keyVocab: [
      { word: 'Check code', translation: '檢查代碼', phonetic: '切克 扣德' },
      { word: 'Calibrate', translation: '校正 / 標定', phonetic: '凱利布瑞特' },
      { word: 'Sensor', translation: '感應器', phonetic: '山瑟' },
      { word: 'Reset module', translation: '重設模組', phonetic: '瑞賽特 模組' }
    ],
    quizQuestions: [
      {
        id: 'q-1-1',
        question: '「I check the code」這句話的 [動作 Verb] 是哪一個字？',
        options: ['I', 'check', 'the', 'code'],
        correctAnswerIndex: 1,
        explanation: 'check 為動詞「檢查」，在此扮演句子最關鍵的動作核心。'
      },
      {
        id: 'q-1-2',
        question: '無塵室中當要表達「校正感應器」時，最適當的工程動詞是？',
        options: ['calibrate', 'eat', 'sleep', 'download'],
        correctAnswerIndex: 0,
        explanation: 'calibrate 為科技業校正、調整量測工具的標準專業術語。'
      }
    ]
  },
  {
    id: 'art-2',
    title: '【歲修特刊】乾式真空幫浦更換與上鎖掛牌工安程序雙語標準 SOP',
    category: '機台排除',
    readTime: '4 分鐘',
    publishDate: '2026 年最新晶圓指南',
    summary: '歲修保養期間，工安上鎖掛牌與真空幫浦更換是最高風險項目。本篇拆解必備極簡 4 字口說短句。',
    contentSections: [
      {
        id: 'sec-2-1',
        englishText: 'You lock the breaker.',
        chineseTranslation: '你鎖上電源斷路器。',
        phonetic: '【 優 ｜ 樂-克 ｜ 德 ｜ 瑞-克 】',
        svoBreakdown: 'You (主) + lock (動) + the breaker (名)'
      },
      {
        id: 'sec-2-2',
        englishText: 'We replace the pump.',
        chineseTranslation: '我們更換這個幫浦。',
        phonetic: '【 威 ｜ 瑞-普-雷-斯 ｜ 德 ｜ 胖-普 】',
        svoBreakdown: 'We (主) + replace (動) + the pump (名)'
      }
    ],
    keyVocab: [
      { word: 'Breaker', translation: '電源斷路器', phonetic: '瑞克' },
      { word: 'Lock', translation: '上鎖 / 鎖定', phonetic: '樂克' },
      { word: 'Pump', translation: '真空幫浦', phonetic: '胖普' },
      { word: 'Replace', translation: '更換', phonetic: '瑞普雷斯' }
    ],
    quizQuestions: [
      {
        id: 'q-2-1',
        question: '工安上 Lockout-Tagout 指的是什麼程序？',
        options: ['鎖定與掛牌斷電', '機台放片速測', '晶圓清潔程序', '下班簽到'],
        correctAnswerIndex: 0,
        explanation: 'Lockout-Tagout 是進入任何危險設備前上鎖掛牌的強制工安程序。'
      }
    ]
  },
  {
    id: 'art-3',
    title: '【自動化特刊】晶圓廠無塵室自動化搬運系統英語詞彙大解密',
    category: '晶圓趨勢',
    readTime: '3 分鐘',
    publishDate: '2026 年前沿晶圓技術',
    summary: '空中天車與自動化物料搬運系統構成了晶圓廠無塵室自動化運轉的血脈。學習如何用極簡英文描述天車異常狀況。',
    contentSections: [
      {
        id: 'sec-3-1',
        englishText: 'The robot stops here.',
        chineseTranslation: '天車搬運車在此停止。',
        phonetic: '【 德 ｜ 羅-伯 ｜ 斯搭普斯 ｜ 嘻-爾 】',
        svoBreakdown: 'The robot (主) + stops (動) + here (橋)'
      },
      {
        id: 'sec-3-2',
        englishText: 'I check the track.',
        chineseTranslation: '我檢查這個軌道。',
        phonetic: '【 愛 ｜ 切-克 ｜ 德 ｜ 揣-克 】',
        svoBreakdown: 'I (主) + check (動) + the track (名)'
      }
    ],
    keyVocab: [
      { word: 'Robot', translation: '搬運車 / 機器人', phonetic: '羅伯' },
      { word: 'Check track', translation: '檢查軌道', phonetic: '切克 揣克' }
    ],
    quizQuestions: [
      {
        id: 'q-3-1',
        question: '「I check the track」中的 [東西/部位] 是？',
        options: ['check', 'the track', 'I', 'stops'],
        correctAnswerIndex: 1,
        explanation: 'the track 為被檢查的名詞受詞。'
      }
    ]
  },
  {
    id: 'art-4',
    title: '【MFC 氣體控制校正】高純氮氣與反應氣體流量異常雙語對談 SOP',
    category: '機台排除',
    readTime: '3 分鐘',
    publishDate: '2026 年晶圓廠設備專題',
    summary: '質量流量控制器控制製程氣體進氣量。學習 2 句超極簡句向工程團隊描述校正程序。',
    contentSections: [
      {
        id: 'sec-4-1',
        englishText: 'We test the valve.',
        chineseTranslation: '我們測試這個閥門。',
        phonetic: '【 威 ｜ 泰-絲-特 ｜ 德 ｜ 閥-爾-夫 】',
        svoBreakdown: 'We (主) + test (動) + the valve (名)'
      },
      {
        id: 'sec-4-2',
        englishText: 'I check the gas.',
        chineseTranslation: '我檢查這個氣體。',
        phonetic: '【 愛 ｜ 切-克 ｜ 德 ｜ 蓋-斯 】',
        svoBreakdown: 'I (主) + check (動) + the gas (名)'
      }
    ],
    keyVocab: [
      { word: 'Valve', translation: '閥門', phonetic: '閥爾夫' },
      { word: 'Gas', translation: '氣體', phonetic: '蓋斯' }
    ],
    quizQuestions: [
      {
        id: 'q-4-1',
        question: '「We test the valve」中的動詞 test 中文含意是？',
        options: ['破壞', '測試 / 檢驗', '忽視', '複製'],
        correctAnswerIndex: 1,
        explanation: 'test 為檢測與測試數值的專業動詞。'
      }
    ]
  },
  {
    id: 'art-5',
    title: '【真空腔體壓差與 Leak Test】氦氣測漏與真空度下降標準語序雙語心法',
    category: '無塵室心法',
    readTime: '4 分鐘',
    publishDate: '2026 年無塵室實戰精選',
    summary: 'Chamber 真空度無法下降時，通常涉及 O-ring 劣化或測漏。學習用 2 句極簡超短句向團隊通報進度。',
    contentSections: [
      {
        id: 'sec-5-1',
        englishText: 'I test the chamber.',
        chineseTranslation: '我測試這個腔體。',
        phonetic: '【 愛 ｜ 泰-絲-特 ｜ 德 ｜ 切-姆-伯 】',
        svoBreakdown: 'I (主) + test (動) + the chamber (名)'
      },
      {
        id: 'sec-5-2',
        englishText: 'He replaces the seal.',
        chineseTranslation: '他更換密封圈。',
        phonetic: '【 嘻 ｜ 瑞-普-雷-斯 ｜ 德 ｜ 斯-爾 】',
        svoBreakdown: 'He (主) + replaces (動) + the seal (名)'
      }
    ],
    keyVocab: [
      { word: 'Chamber', translation: '真空腔體', phonetic: '切姆伯' },
      { word: 'Seal', translation: '密封環 / 封圈', phonetic: '斯爾' }
    ],
    quizQuestions: [
      {
        id: 'q-5-1',
        question: '「I test the chamber」這句話的主角是誰？',
        options: ['the chamber', 'I', 'test', 'leak'],
        correctAnswerIndex: 1,
        explanation: 'I 為執行該動作的主角發起人。'
      }
    ]
  },
  {
    id: 'art-6',
    title: '【EUV 微影極紫外光曝光】雷射對焦與光罩 Reticle 異常應變英文指南',
    category: '週報導讀',
    readTime: '4 分鐘',
    publishDate: '2026 年第 33 週技術特刊',
    summary: '極紫外光曝光機台在高精度對焦與光罩傳送時，如何用 SVO 極短句與資深設備工程師無縫溝通對齊狀態。',
    contentSections: [
      {
        id: 'sec-6-1',
        englishText: 'I align the laser.',
        chineseTranslation: '我對準雷射光束。',
        phonetic: '【 愛 ｜ 額-賴-恩 ｜ 德 ｜ 雷-澤 】',
        svoBreakdown: 'I (主) + align (動) + the laser (名)'
      },
      {
        id: 'sec-6-2',
        englishText: 'We clamp the reticle.',
        chineseTranslation: '我們夾緊光罩片。',
        phonetic: '【 威 ｜ 克-藍-普 ｜ 德 ｜ 瑞-提-扣 】',
        svoBreakdown: 'We (主) + clamp (動) + the reticle (名)'
      }
    ],
    keyVocab: [
      { word: 'Laser', translation: '雷射光束', phonetic: '雷澤' },
      { word: 'Reticle', translation: '光罩片 / 光罩載具', phonetic: '瑞提扣' },
      { word: 'Align', translation: '對準 / 校直', phonetic: '額賴恩' },
      { word: 'Clamp', translation: '夾持 / 夾緊', phonetic: '克藍普' }
    ],
    quizQuestions: [
      {
        id: 'q-6-1',
        question: '「We clamp the reticle」中的 reticle 在微影製程中是指什麼？',
        options: ['光罩片', '冷卻水管', '天花板天車', '螺絲起子'],
        correctAnswerIndex: 0,
        explanation: 'Reticle 為微影曝光製程專用的高精密電路光罩載具。'
      }
    ]
  },
  {
    id: 'art-7',
    title: '【CMP 研磨與平坦化】研磨液 Slurry 流量與拋光墊更換即時回報雙語指南',
    category: '機台排除',
    readTime: '3 分鐘',
    publishDate: '2026 年晶圓平坦化精選',
    summary: '化學機械研磨頭壓力與漿料流量波動時，現場設備與製程工程師的交接溝通金句。',
    contentSections: [
      {
        id: 'sec-7-1',
        englishText: 'We replace the pad.',
        chineseTranslation: '我們更換研磨墊。',
        phonetic: '【 威 ｜ 瑞-普-雷-斯 ｜ 德 ｜ 拍-德 】',
        svoBreakdown: 'We (主) + replace (動) + the pad (名)'
      },
      {
        id: 'sec-7-2',
        englishText: 'I dispense the slurry.',
        chineseTranslation: '我分配供給研磨液。',
        phonetic: '【 愛 ｜ 迪-斯-噴-斯 ｜ 德 ｜ 斯-勒-瑞 】',
        svoBreakdown: 'I (主) + dispense (動) + the slurry (名)'
      }
    ],
    keyVocab: [
      { word: 'Pad', translation: '研磨拋光墊', phonetic: '拍德' },
      { word: 'Slurry', translation: '研磨液 / 漿料', phonetic: '斯勒瑞' },
      { word: 'Dispense', translation: '分配 / 供給', phonetic: '迪斯噴斯' }
    ],
    quizQuestions: [
      {
        id: 'q-7-1',
        question: '「I dispense the slurry」中 dispense 的核心動作意思是？',
        options: ['分配 / 滴出供給', '銷毀', '重設電源', '擦拭外殼'],
        correctAnswerIndex: 0,
        explanation: 'dispense 在半導體液體/漿料系統中代表精準分配給料。'
      }
    ]
  }
];
