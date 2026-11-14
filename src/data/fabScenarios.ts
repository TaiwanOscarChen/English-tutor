export interface ScenarioChoice {
  id: string;
  textEn: string;
  textZh: string;
  isCorrect: boolean;
  score: number;
  explanation: string;
  nativeTip: string;
  svoBreakdown: {
    s: string;
    v: string;
    b?: string;
    o: string;
  };
}

export interface FabScenario {
  id: string;
  title: string;
  difficulty: 'Junior' | 'Senior' | 'Lead';
  department: '設備工程部' | '製程工程部' | '良率整合部' | '廠務工安部';
  backgroundDescription: string;
  interlocutor: {
    name: string;
    role: string;
    avatarBadge: string;
    quoteEn: string;
    quoteZh: string;
  };
  questionPromptEn: string;
  questionPromptZh: string;
  choices: ScenarioChoice[];
}

export const FAB_SCENARIOS: FabScenario[] = [
  {
    id: 'sc-vendor-chamber',
    title: '資深設備工程師進廠更換真空腔體',
    difficulty: 'Senior',
    department: '設備工程部',
    backgroundDescription: '資深設備技術顧問抵達無塵室，正要進行乾式蝕刻機台的射頻匹配盒與下電極預防性保養。此時需要向對方確認上鎖掛牌與氣體隔離狀態。',
    interlocutor: {
      name: 'Markus Van Der Berg',
      role: 'Principal Field Service Specialist',
      avatarBadge: 'TAC',
      quoteEn: 'Hi Kevin! I have the spare RF generator ready. Can you confirm if the chamber toxic gas line is isolated and zero-energy state is verified?',
      quoteZh: '嗨 Kevin！我已經準備好備用的射頻產生器了。你能跟我確認腔體劇毒氣體管線是否已隔離，且零殘餘能量已通過量測了嗎？'
    },
    questionPromptEn: 'How should you answer the specialist professionally with SVO standard protocol?',
    questionPromptZh: '身為晶圓廠設備負責工程師，你應該如何以標準 SVO 句型專業回答設備技術顧問？',
    choices: [
      {
        id: 'c1',
        textEn: 'I have isolated all gas purge valves and verified zero residual voltage with my multimeter.',
        textZh: '我已經隔離所有氣體吹洗閥門，並用三用電表確認殘餘電壓歸零。',
        isCorrect: true,
        score: 100,
        explanation: '結構精準且完整符合半導體國際工安零能量驗證與氣體隔離標準，使用主動 SVO 句型清晰明確。',
        nativeTip: '使用 have isolated 與 verified 展現資深工程師的嚴謹專業感。',
        svoBreakdown: {
          s: 'I [主角]',
          v: 'have isolated [動作]',
          b: 'with my multimeter [工具橋樑]',
          o: 'all gas purge valves [目標物]'
        }
      },
      {
        id: 'c2',
        textEn: 'Everything is no problem, you can change the RF match right now.',
        textZh: '完全沒問題，你現在可以直接換射頻匹配盒。',
        isCorrect: false,
        score: 40,
        explanation: '缺少關鍵技術名詞與安全量測確認，在工程團隊中屬於高風險含糊回覆，容易造成工安稽核缺失。',
        nativeTip: '避免使用空洞的 "No problem"，在晶圓廠必須具體陳述 "Specific Actions Taken"。',
        svoBreakdown: {
          s: 'Everything [主角]',
          v: 'is [狀態]',
          o: 'no problem [結果]'
        }
      },
      {
        id: 'c3',
        textEn: 'The machine is broken, please help me fix it quickly because production line is waiting.',
        textZh: '機台壞掉了，請幫我趕快修好，因為產線在等。',
        isCorrect: false,
        score: 30,
        explanation: '完全偏離對方的安全詢問，且使用過度情緒化與非標準術語。',
        nativeTip: '機台異常應使用 tool is down 或 in alarm status，而非口語的 broken。',
        svoBreakdown: {
          s: 'The machine [主角]',
          v: 'is [狀態]',
          o: 'broken [異常]'
        }
      }
    ]
  },
  {
    id: 'sc-yield-excursion',
    title: '早會臨時良率異常跨部門除錯會議',
    difficulty: 'Senior',
    department: '良率整合部',
    backgroundDescription: '無塵室在先進製程批次中發現微粒污染，造成良率異常波動。品質工程代表在線上晨會要求工程團隊說明根本原因與圍堵措施。',
    interlocutor: {
      name: 'Sarah Jenkins',
      role: 'Director of Quality Operations',
      avatarBadge: 'QA',
      quoteEn: 'Our metrology data shows a yield drop on the current lot. We need your containment plan and initial defect review immediately.',
      quoteZh: '我們的量測數據顯示當前晶圓批次良率下滑。我們需要你們立即提供圍堵防護措施與初步缺陷分析！'
    },
    questionPromptEn: 'Choose the most authoritative 8D engineering response for the quality review meeting:',
    questionPromptZh: '請選擇晨會上最權威、合乎 8D 異常處置標準的英文應答：',
    choices: [
      {
        id: 'c1',
        textEn: 'We have quarantined the affected lots and sent wafer cross-section samples to the TEM lab for defect inspection.',
        textZh: '我們已扣留隔離受影響批次，並將晶圓剖面樣品送交穿透式電子顯微鏡實驗室進行缺陷分析。',
        isCorrect: true,
        score: 100,
        explanation: '完美展現 8D 圍堵與真因分析，名詞 quarantined 與 cross-section 極為道地。',
        nativeTip: 'Quarantined the lots 是晶圓廠處理異常批次的最高頻術語。',
        svoBreakdown: {
          s: 'We [主角]',
          v: 'have quarantined [動作]',
          b: 'to the TEM lab [送往實驗室]',
          o: 'the affected lots [受影響批次]'
        }
      },
      {
        id: 'c2',
        textEn: 'Maybe the chemical supplier changed something, we will ask them next week.',
        textZh: '也許是化學品供應商改了東西，我們下週會問他們。',
        isCorrect: false,
        score: 20,
        explanation: '推卸責任且缺乏時效性，在跨部門品質會議上會嚴重影響工程團隊信譽。',
        nativeTip: '工程會議切忌使用 Maybe 推諉，應以 Investigating potential root causes 替代。',
        svoBreakdown: {
          s: 'We [主角]',
          v: 'will ask [動作]',
          o: 'them [對象]'
        }
      },
      {
        id: 'c3',
        textEn: 'The yield is bad today, don\'t worry we will run new wafers tomorrow.',
        textZh: '今天良率不太好，別擔心我們明天會重跑新晶圓。',
        isCorrect: false,
        score: 10,
        explanation: '輕率且未說明晶圓報廢風險與真因控制，屬於不合格之工程應答。',
        nativeTip: '嚴禁在品質會議說 Don\'t worry，這在半導體品質稽核屬於重大警訊詞彙。',
        svoBreakdown: {
          s: 'We [主角]',
          v: 'will run [動作]',
          o: 'new wafers [目標物]'
        }
      }
    ]
  },
  {
    id: 'sc-shift-handover',
    title: '大夜班與日班交接機台未解警報',
    difficulty: 'Junior',
    department: '設備工程部',
    backgroundDescription: '早上 07:15，大夜班交接時刻。黃光曝光機出現冷卻水流量偏低警報已兩小時，需要清楚交代目前處理進度與日班注意事項。',
    interlocutor: {
      name: 'David Chen',
      role: '設備日班帶線組長',
      avatarBadge: 'SHIFT',
      quoteEn: 'Morning! What is the current status on the stepper tool? Can we release the tool for high-volume production now?',
      quoteZh: '早安！曝光機台目前狀況如何？我們現在可以放行給產線跑量產了嗎？'
    },
    questionPromptEn: 'Provide a crisp, actionable handover status in English:',
    questionPromptZh: '請向日班主管提供清楚明確、具執行性的英文交接說明：',
    choices: [
      {
        id: 'c1',
        textEn: 'The tool is still on hold due to chiller flow fluctuation, so the day shift needs to replace the filter cartridge before production release.',
        textZh: '機台因冷卻水流量波動目前仍處於 Hold 扣留狀態，請日班在放行產線前先更換水過濾器濾芯。',
        isCorrect: true,
        score: 100,
        explanation: '機台狀態、流量波動原因與更換濾芯指示三要素齊全，堪稱典範交接！',
        nativeTip: 'Filter cartridge 與 Production release 是交接簿必備單字。',
        svoBreakdown: {
          s: 'The day shift [主角]',
          v: 'needs to replace [動作]',
          b: 'before production release [時間條件]',
          o: 'the filter cartridge [目標物]'
        }
      },
      {
        id: 'c2',
        textEn: 'I think it is OK, just click reset button and run wafers.',
        textZh: '我覺得應該可以，只要點重設按鈕然後跑晶圓就行了。',
        isCorrect: false,
        score: 30,
        explanation: '盲目重設警報而不處理水流問題，會導致高價曝光機雷射腔體過熱受損。',
        nativeTip: '千萬不能對冷卻機警報輕描淡寫地直接按重設。',
        svoBreakdown: {
          s: 'You [主角]',
          v: 'just click [動作]',
          o: 'reset button [目標物]'
        }
      },
      {
        id: 'c3',
        textEn: 'I worked 12 hours very tired, please read the shift log yourself.',
        textZh: '我上了 12 小時很累，請你自己看交接日誌。',
        isCorrect: false,
        score: 0,
        explanation: '嚴重的團隊溝通缺失與失職。',
        nativeTip: '口頭交接在半導體晶圓廠是不可或缺的雙重確認流程。',
        svoBreakdown: {
          s: 'Please [語氣]',
          v: 'read [動作]',
          o: 'the shift log [目標物]'
        }
      }
    ]
  }
];
