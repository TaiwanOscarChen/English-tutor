/**
 * Comprehensive Semiconductor & Cleanroom Interactive Word Translation Dictionary
 * 晶圓半導體無塵室專用單字即時字典與智慧詞型還原引擎 (Lemmatization & Domain Lookup)
 */

export interface WordDefinition {
  word: string;
  lemma: string;
  translation: string;
  partOfSpeech: string;
  kkPhonetic?: string;
  ipa?: string;
  syllables?: string;
  taiwanPhonetic?: string;
  mandarinPhonetic?: string;
  cleanroomContext?: string;
  memoryTrick?: string;
  category?: 'equipment' | 'process' | 'safety' | 'maintenance' | 'communication' | 'alarm' | 'general' | 'grammar';
}

// 核心半導體與高頻工程單字專屬字典
const DICTIONARY_MAP: Record<string, WordDefinition> = {
  // === 光刻、雷射與光學系統 (Lithography, Laser & Optics) ===
  laser: {
    word: 'laser',
    lemma: 'laser',
    translation: '雷射 / 光刻雷射光源',
    partOfSpeech: 'n.',
    ipa: '/ˈleɪ.zər/',
    syllables: 'la·ser',
    taiwanPhonetic: '【 ㄌㄟˊ - ㄗㄜˊ 】',
    mandarinPhonetic: '【 雷澤 】',
    cleanroomContext: 'EUV / DUV 光刻機 CO2 高功率脈衝雷射激發電漿極紫外光源。',
    memoryTrick: '「雷」射光束打下來，「澤」被整個晶圓表面！',
    category: 'equipment'
  },
  calibrate: {
    word: 'calibrate',
    lemma: 'calibrate',
    translation: '校正 / 校準 / 標定',
    partOfSpeech: 'v.',
    ipa: '/ˈkæl.ə.breɪt/',
    syllables: 'cal·i·brate',
    taiwanPhonetic: '【 ㄎㄜ-ㄞˋ - ㄌㄧˋ - ㄅㄜˊ - ㄖㄨㄟˋ - ㄊㄜˋ 】',
    mandarinPhonetic: '【 凱利布瑞特 】',
    cleanroomContext: '校準光學鏡頭、感測器零點或機器人座標。',
    memoryTrick: '「開」始用「利」器「補」「瑞」氣，完成精密「校正」！',
    category: 'maintenance'
  },
  calibration: {
    word: 'calibration',
    lemma: 'calibrate',
    translation: '校正程序 / 標定作業',
    partOfSpeech: 'n.',
    ipa: '/ˌkæl.əˈbreɪ.ʃən/',
    syllables: 'cal·i·bra·tion',
    taiwanPhonetic: '【 ㄎㄜ-ㄞˋ - ㄌㄧˋ - ㄅㄜˊ - ㄖㄨㄟˋ - ㄒㄩㄣˇ 】',
    mandarinPhonetic: '【 凱利布瑞宣 】',
    cleanroomContext: '定期執行的機台感測器與光學聚焦校準作業。',
    category: 'maintenance'
  },
  euv: {
    word: 'euv',
    lemma: 'euv',
    translation: '極紫外光 (EUV 13.5nm)',
    partOfSpeech: 'n.',
    ipa: '/ˌiː.juːˈviː/',
    syllables: 'E-U-V',
    taiwanPhonetic: '【 ㄧ - ㄧㄡ - 薇 】',
    mandarinPhonetic: '【 依優薇 】',
    cleanroomContext: '最先進 7nm/5nm/3nm/2nm 製程必備之極紫外光微影技術。',
    category: 'equipment'
  },
  litho: {
    word: 'litho',
    lemma: 'litho',
    translation: '黃光微影 / 光刻製程',
    partOfSpeech: 'n.',
    ipa: '/ˈlɪθ.oʊ/',
    syllables: 'li·tho',
    taiwanPhonetic: '【 ㄌㄧˋ - ㄙㄡ 】',
    mandarinPhonetic: '【 莉搜 】',
    cleanroomContext: '無塵室黃光微影區 (Photolithography / Yellow Area)。',
    category: 'process'
  },
  scanner: {
    word: 'scanner',
    lemma: 'scanner',
    translation: '光刻機 / 步進掃描曝光機',
    partOfSpeech: 'n.',
    ipa: '/ˈskæn.ər/',
    syllables: 'scan·ner',
    taiwanPhonetic: '【 ㄙ - ㄎㄢ - ㄋㄜ 】',
    mandarinPhonetic: '【 斯康納 】',
    cleanroomContext: '微影製程中之高精準步進光刻掃描曝光機台。',
    category: 'equipment'
  },
  optics: {
    word: 'optics',
    lemma: 'optics',
    translation: '光學元件 / 反射鏡組',
    partOfSpeech: 'n.',
    ipa: '/ˈɑːp.tɪks/',
    syllables: 'op·tics',
    taiwanPhonetic: '【 ㄚ - ㄆ - ㄊㄧ - ㄎ - ㄙ 】',
    mandarinPhonetic: '【 阿普提克斯 】',
    cleanroomContext: '光刻機內部高精度多層膜鉬矽反射鏡組。',
    category: 'equipment'
  },
  power: {
    word: 'power',
    lemma: 'power',
    translation: '功率 / 電源 / 能量',
    partOfSpeech: 'n.',
    ipa: '/ˈpaʊ.ər/',
    syllables: 'pow·er',
    taiwanPhonetic: '【 ㄆㄠ - ㄦ 】',
    mandarinPhonetic: '【 拋爾 】',
    cleanroomContext: 'RF 射頻功率 (Watts) 或雷射光源輸出能量強度。',
    category: 'process'
  },
  the: {
    word: 'the',
    lemma: 'the',
    translation: '這 / 該 (指定機台/部件)',
    partOfSpeech: 'art.',
    ipa: '/ðə/',
    syllables: 'the',
    taiwanPhonetic: '【 ㄉㄜ˙ 】',
    mandarinPhonetic: '【 得 】',
    cleanroomContext: '指定現場特定之腔體、管路或機台。',
    category: 'grammar'
  },
  we: {
    word: 'we',
    lemma: 'we',
    translation: '我們 (工程團隊)',
    partOfSpeech: 'pron.',
    ipa: '/wiː/',
    syllables: 'we',
    taiwanPhonetic: '【 ㄨㄟ 】',
    mandarinPhonetic: '【 微 】',
    cleanroomContext: '值班與設備維修工程師團隊。',
    category: 'grammar'
  },
  // === 壓力與流體、真空系統 (Pressure, Vacuum & Fluids) ===
  pressure: {
    word: 'pressure',
    lemma: 'pressure',
    translation: '壓力 / 氣壓 / 腔體壓力',
    partOfSpeech: 'n.',
    ipa: '/ˈpreʃ.ər/',
    syllables: 'pres·sure',
    taiwanPhonetic: '【 普 - 瑞 - 許 - 爾 】',
    mandarinPhonetic: '【 普瑞舍 】',
    cleanroomContext: '監控真空腔體 (Chamber) 或氣體管路 (Gas Line) 的即時壓力指數 (Torr / psi / mbar)。',
    memoryTrick: '「普」通「瑞」氣很「許」可這股「壓力」！',
    category: 'process'
  },
  vacuum: {
    word: 'vacuum',
    lemma: 'vacuum',
    translation: '真空 / 真空度',
    partOfSpeech: 'n./adj.',
    ipa: '/ˈvæk.juːm/',
    syllables: 'vac·u·um',
    taiwanPhonetic: '【 威 - 扣 - 姆 】',
    mandarinPhonetic: '【 威扣姆 】',
    cleanroomContext: '半導體蝕刻 (Etch) 與薄膜沉積 (CVD/PVD) 必備的高真空環境。',
    memoryTrick: '「威」風「扣」住阿「姆」的空氣變成「真空」！',
    category: 'process'
  },
  chamber: {
    word: 'chamber',
    lemma: 'chamber',
    translation: '反應腔體 / 密閉真空室',
    partOfSpeech: 'n.',
    ipa: '/ˈtʃeɪm.bər/',
    syllables: 'cham·ber',
    taiwanPhonetic: '【 切 - 姆 - 伯 】',
    mandarinPhonetic: '【 錢伯 】',
    cleanroomContext: '晶圓進行蝕刻、沉積或離子植入的密封製程空間。',
    memoryTrick: '拿刀「切」「木」頭「伯」伯的密閉「腔體」！',
    category: 'equipment'
  },
  pump: {
    word: 'pump',
    lemma: 'pump',
    translation: '幫浦 / 抽氣幫浦 / 抽真空泵',
    partOfSpeech: 'n./v.',
    ipa: '/pʌmp/',
    syllables: 'pump',
    taiwanPhonetic: '【 潘 - 普 】',
    mandarinPhonetic: '【 胖普 】',
    cleanroomContext: 'Dry Pump (乾式幫浦) 或 Turbo Pump (渦輪分子泵) 抽取腔體氣體。',
    memoryTrick: '「胖」子「普」遍愛用打氣「幫浦」！',
    category: 'equipment'
  },
  valve: {
    word: 'valve',
    lemma: 'valve',
    translation: '閥門 / 氣閥 / 控制閥',
    partOfSpeech: 'n.',
    ipa: '/vælv/',
    syllables: 'valve',
    taiwanPhonetic: '【 伐 - 爾 - 夫 】',
    mandarinPhonetic: '【 瓦爾夫 】',
    cleanroomContext: 'Slit Valve (閘閥)、Isolation Valve (隔離閥) 控制氣體或晶圓進出。',
    memoryTrick: '「伐」木「爾」後用「夫」人給的「閥門」！',
    category: 'equipment'
  },
  flow: {
    word: 'flow',
    lemma: 'flow',
    translation: '流量 / 流速 / 流動',
    partOfSpeech: 'n./v.',
    ipa: '/floʊ/',
    syllables: 'flow',
    taiwanPhonetic: '【 佛 - 樓 】',
    mandarinPhonetic: '【 佛樓 】',
    cleanroomContext: '透過 MFC (質量流量控制器) 調節氣體或冷卻水流速。',
    category: 'process'
  },
  gas: {
    word: 'gas',
    lemma: 'gas',
    translation: '氣體 / 特殊氣體 (特氣)',
    partOfSpeech: 'n.',
    ipa: '/ɡæs/',
    syllables: 'gas',
    taiwanPhonetic: '【 蓋 - 斯 】',
    mandarinPhonetic: '【 蓋斯 】',
    cleanroomContext: '製程氣體 (如 Ar, CF4, Cl2, N2, O2, H2)。',
    category: 'process'
  },
  purge: {
    word: 'purge',
    lemma: 'purge',
    translation: '吹驅 / 吹除 / 惰性氣體清洗管路',
    partOfSpeech: 'v./n.',
    ipa: '/pɝːdʒ/',
    syllables: 'purge',
    taiwanPhonetic: '【 珀 - 居 】',
    mandarinPhonetic: '【 珀吉 】',
    cleanroomContext: '保養或維修前使用高純度氮氣 (N2) 吹除殘留毒氣或腐蝕性氣體。',
    category: 'safety'
  },
  exhaust: {
    word: 'exhaust',
    lemma: 'exhaust',
    translation: '排氣 / 抽氣 / 廢氣排放系統',
    partOfSpeech: 'n./v.',
    ipa: '/ɪɡˈzɑːst/',
    syllables: 'ex·haust',
    taiwanPhonetic: '【 依格 - 奏 - 斯特 】',
    mandarinPhonetic: '【 艾格佐斯特 】',
    cleanroomContext: '無塵室酸鹼與毒氣排風管路 (Scrubber / Acid Exhaust)。',
    category: 'equipment'
  },
  leak: {
    word: 'leak',
    lemma: 'leak',
    translation: '洩漏 / 漏氣 / 漏水 / 測漏',
    partOfSpeech: 'n./v.',
    ipa: '/liːk/',
    syllables: 'leak',
    taiwanPhonetic: '【 利 - 克 】',
    mandarinPhonetic: '【 立克 】',
    cleanroomContext: '氦氣測漏 (Helium Leak Check) 確保真空腔體無漏氣點。',
    category: 'maintenance'
  },

  // === 晶圓與自動化搬送 (Wafer, Automation & AMHS) ===
  wafer: {
    word: 'wafer',
    lemma: 'wafer',
    translation: '晶圓 / 矽晶圓片',
    partOfSpeech: 'n.',
    ipa: '/ˈweɪ.fər/',
    syllables: 'wa·fer',
    taiwanPhonetic: '【 威 - 弗 】',
    mandarinPhonetic: '【 威弗 】',
    cleanroomContext: '8吋或12吋高純度單晶矽晶圓片 (Silicon Wafer)。',
    memoryTrick: '「威」風「弗」面吹過高價 12 吋「晶圓」！',
    category: 'equipment'
  },
  sensor: {
    word: 'sensor',
    lemma: 'sensor',
    translation: '感應器 / 光電開關 / 感測器',
    partOfSpeech: 'n.',
    ipa: '/ˈsen.sər/',
    syllables: 'sen·sor',
    taiwanPhonetic: '【 山 - 瑟 】',
    mandarinPhonetic: '【 森瑟 】',
    cleanroomContext: '光纖感應器、晶圓在席檢知 (Wafer Presence Sensor)。',
    memoryTrick: '爬「山」時訊號不好，感應器（Sensor）在抖得像「瑟」瑟發抖！',
    category: 'equipment'
  },
  robot: {
    word: 'robot',
    lemma: 'robot',
    translation: '機械手臂 / 搬送機器人',
    partOfSpeech: 'n.',
    ipa: '/ˈroʊ.bɑːt/',
    syllables: 'ro·bot',
    taiwanPhonetic: '【 柔 - 伯 - 特 】',
    mandarinPhonetic: '【 羅伯特 】',
    cleanroomContext: 'EFEM 或傳輸室 (Transfer Chamber) 搬送晶圓的雙臂機械手。',
    category: 'equipment'
  },
  loadport: {
    word: 'loadport',
    lemma: 'loadport',
    translation: '裝載門 / 晶圓裝卸載台 / Load Port',
    partOfSpeech: 'n.',
    ipa: '/ˈloʊd.pɔːrt/',
    syllables: 'load·port',
    taiwanPhonetic: '【 樓 - 德 - 珀 - 特 】',
    mandarinPhonetic: '【 樓德珀特 】',
    cleanroomContext: '機台前端供 OHT 天車或工程師放置 FOUP 晶圓盒的介面站。',
    category: 'equipment'
  },
  foup: {
    word: 'foup',
    lemma: 'foup',
    translation: '晶圓前開式傳送盒 (FOUP)',
    partOfSpeech: 'n.',
    ipa: '/fuːp/',
    syllables: 'FOUP',
    taiwanPhonetic: '【 夫 - 普 】',
    mandarinPhonetic: '【 富普 】',
    cleanroomContext: '裝載 25 片 12 吋晶圓的超潔淨密封載具。',
    category: 'equipment'
  },
  cassette: {
    word: 'cassette',
    lemma: 'cassette',
    translation: '晶圓承載匣 / 晶舟盒',
    partOfSpeech: 'n.',
    ipa: '/kəˈset/',
    syllables: 'cas·sette',
    taiwanPhonetic: '【 卡 - 賽 - 特 】',
    mandarinPhonetic: '【 卡塞特 】',
    cleanroomContext: '承載晶圓的塑膠或石英卡匣。',
    category: 'equipment'
  },
  transfer: {
    word: 'transfer',
    lemma: 'transfer',
    translation: '傳送 / 搬移 / 轉移晶圓',
    partOfSpeech: 'v./n.',
    taiwanPhonetic: '【 穿 - 斯 - 弗 】',
    mandarinPhonetic: '【 傳斯弗 】',
    cleanroomContext: '機械手臂在 Load Port 與 Chamber 之間精準傳送晶圓。',
    category: 'equipment'
  },
  align: {
    word: 'align',
    lemma: 'align',
    translation: '對齊 / 校平 / 尋邊對位',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 額 - 賴 - 恩 】',
    mandarinPhonetic: '【 阿賴恩 】',
    cleanroomContext: '晶圓對位儀 (Aligner) 旋轉晶圓並尋找 Notch 缺口對齊角度。',
    category: 'equipment'
  },
  slot: {
    word: 'slot',
    lemma: 'slot',
    translation: '晶圓槽位 / 插槽 (Slot 1-25)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 斯 - 洛 - 特 】',
    mandarinPhonetic: '【 斯洛特 】',
    cleanroomContext: 'FOUP 內部共 25 個槽位，編號 Slot 01 至 Slot 25。',
    category: 'equipment'
  },

  // === 維修校準與保養 (Maintenance & Calibration) ===
  replace: {
    word: 'replace',
    lemma: 'replace',
    translation: '更換 / 替換 / 置換耗材',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 瑞 - 普 - 雷 - 斯 】',
    mandarinPhonetic: '【 瑞普雷斯 】',
    cleanroomContext: '定期保養時更換 O-ring 密封圈、ESC 靜電吸盤或濾心 (Filter)。',
    category: 'maintenance'
  },
  clean: {
    word: 'clean',
    lemma: 'clean',
    translation: '清潔 / 清洗 / 擦拭無塵',
    partOfSpeech: 'v./adj.',
    taiwanPhonetic: '【 克 - 利 - 恩 】',
    mandarinPhonetic: '【 克林 】',
    cleanroomContext: '使用無塵布與 IPA (異丙醇) 擦拭機台腔體內部沉積物。',
    category: 'maintenance'
  },
  inspect: {
    word: 'inspect',
    lemma: 'inspect',
    translation: '檢驗 / 檢查 / 巡檢',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 因 - 斯 - 佩 - 克 - 特 】',
    mandarinPhonetic: '【 因斯佩克特 】',
    cleanroomContext: '使用強光手電筒檢查密封圈是否有刮傷或顆粒污染。',
    category: 'maintenance'
  },
  verify: {
    word: 'verify',
    lemma: 'verify',
    translation: '驗證 / 確認 / 複驗',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 威 - 瑞 - 發 - 愛 】',
    mandarinPhonetic: '【 韋瑞發愛 】',
    cleanroomContext: '維修後執行 Dummy Wafer 暖機驗證製程良率。',
    category: 'maintenance'
  },
  troubleshoot: {
    word: 'troubleshoot',
    lemma: 'troubleshoot',
    translation: '故障排除 / 查修問題',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 戳 - 伯 - 秀 - 特 】',
    mandarinPhonetic: '【 差博修特 】',
    cleanroomContext: '依照 OCAP 規範排查機台報警碼 (Alarm Code) 之根本原因。',
    category: 'maintenance'
  },
  adjust: {
    word: 'adjust',
    lemma: 'adjust',
    translation: '調整 / 微調 / 校調',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 額 - 賈 - 斯特 】',
    mandarinPhonetic: '【 阿賈斯特 】',
    cleanroomContext: '微調水平度 (Leveling) 或光電感應器靈敏度 (Sensitivity)。',
    category: 'maintenance'
  },
  tighten: {
    word: 'tighten',
    lemma: 'tighten',
    translation: '鎖緊 / 鎖固螺栓 (使用扭力板手)',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 太 - 特 - 恩 】',
    mandarinPhonetic: '【 泰騰 】',
    cleanroomContext: '使用扭力板手 (Torque Wrench) 依照星形順序平均鎖緊法蘭螺絲。',
    category: 'maintenance'
  },
  reboot: {
    word: 'reboot',
    lemma: 'reboot',
    translation: '重開機 / 重新啟動系統',
    partOfSpeech: 'v./n.',
    taiwanPhonetic: '【 瑞 - 布 - 特 】',
    mandarinPhonetic: '【 瑞布特 】',
    cleanroomContext: '通訊斷線時重啟 PLC 控制器或 IPC 工控機台電腦。',
    category: 'maintenance'
  },
  reset: {
    word: 'reset',
    lemma: 'reset',
    translation: '重置 / 復歸 / 警報消除',
    partOfSpeech: 'v./n.',
    taiwanPhonetic: '【 瑞 - 賽 - 特 】',
    mandarinPhonetic: '【 瑞塞特 】',
    cleanroomContext: '排除警報後於 HMI 人機介面上按下 Alarm Reset 鍵。',
    category: 'maintenance'
  },

  // === 工安與防護 (Safety, LOTO & Interlocks) ===
  interlock: {
    word: 'interlock',
    lemma: 'interlock',
    translation: '互鎖機制 / 安全連鎖保護',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 因 - 特 - 樂 - 克 】',
    mandarinPhonetic: '【 因特洛克 】',
    cleanroomContext: '當機門開啟或氣體外洩時，硬體自動切斷高壓電源與雷射。',
    memoryTrick: '「因」為「特」別「樂」意「克」服危險而觸發安全「互鎖」！',
    category: 'safety'
  },
  loto: {
    word: 'loto',
    lemma: 'loto',
    translation: '上鎖掛牌 (Lockout / Tagout)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 樂 - 扣 - 特 / 泰 - 扣 - 特 】',
    mandarinPhonetic: '【 樓透 】',
    cleanroomContext: '進入機台維修前，必須關閉總電源開關並掛上專用鎖具與警示吊牌。',
    memoryTrick: '「樂」透「扣」住安全鎖，工安「標」籤掛好不被懲罰！',
    category: 'safety'
  },
  isolate: {
    word: 'isolate',
    lemma: 'isolate',
    translation: '隔離 / 斷開電源或氣源',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 愛 - 瑟 - 雷 - 特 】',
    mandarinPhonetic: '【 艾瑟雷特 】',
    cleanroomContext: '徹底斷開主電路 (Main Breaker) 或關閉氣閥完成能量隔離。',
    category: 'safety'
  },
  alarm: {
    word: 'alarm',
    lemma: 'alarm',
    translation: '警報 / 警示 / 異常鳴響',
    partOfSpeech: 'n./v.',
    taiwanPhonetic: '【 額 - 浪 - 姆 】',
    mandarinPhonetic: '【 阿拉姆 】',
    cleanroomContext: '紅燈塔鳴響表示機台製程異常或安全互鎖跳脫 (Interlock Open)。',
    category: 'safety'
  },
  emergency: {
    word: 'emergency',
    lemma: 'emergency',
    translation: '緊急 / 緊急狀況',
    partOfSpeech: 'n./adj.',
    taiwanPhonetic: '【 依 - 摸 - 簡 - 西 】',
    mandarinPhonetic: '【 依默金西 】',
    cleanroomContext: '緊急情況按下 EMO (緊急停止鈕) 或通報 ERC 緊急應變中心。',
    category: 'safety'
  },
  stop: {
    word: 'stop',
    lemma: 'stop',
    translation: '停止 / 煞停 / 終止運作',
    partOfSpeech: 'v./n.',
    taiwanPhonetic: '【 斯 - 踏 - 普 】',
    mandarinPhonetic: '【 斯塔普 】',
    cleanroomContext: 'E-Stop 緊急停機或暫停機械手臂搬送動作。',
    category: 'safety'
  },
  hazard: {
    word: 'hazard',
    lemma: 'hazard',
    translation: '危害 / 危險因子',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 哈 - 惹 - 德 】',
    mandarinPhonetic: '【 哈扎德 】',
    cleanroomContext: '辨識化學酸鹼、高電壓與高溫熱源危害。',
    category: 'safety'
  },
  ppe: {
    word: 'ppe',
    lemma: 'ppe',
    translation: '個人防護裝備 (PPE)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 批 - 批 - 依 】',
    mandarinPhonetic: '【 披披依 】',
    cleanroomContext: '無塵衣、護目鏡、防酸防毒手套與安全鞋。',
    category: 'safety'
  },

  // === 製程與電控參數 (Process, Recipe & Electronics) ===
  recipe: {
    word: 'recipe',
    lemma: 'recipe',
    translation: '製程配方 / 製程條件參數檔案',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 瑞 - 瑟 - 批 】',
    mandarinPhonetic: '【 瑞瑟批 】',
    cleanroomContext: '包含氣體配比、腔壓、電漿射頻功率 (RF Power) 與時間之製程程式。',
    category: 'process'
  },
  temperature: {
    word: 'temperature',
    lemma: 'temperature',
    translation: '溫度 (常縮寫為 Temp)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 添 - 普 - 瑞 - 徹 】',
    mandarinPhonetic: '【 坦普瑞徹 】',
    cleanroomContext: '加熱底座 (Heater Chuck) 或冷水機 (Chiller) 控溫精準度。',
    category: 'process'
  },
  voltage: {
    word: 'voltage',
    lemma: 'voltage',
    translation: '電壓 (伏特 V)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 沃 - 爾 - 梯 - 吉 】',
    mandarinPhonetic: '【 沃爾梯吉 】',
    cleanroomContext: '使用三用電表 (DMM) 量測 24VDC 控制電壓或 208VAC 動力電源。',
    category: 'process'
  },
  current: {
    word: 'current',
    lemma: 'current',
    translation: '電流 (安培 A)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 柯 - 倫 - 特 】',
    mandarinPhonetic: '【 柯倫特 】',
    cleanroomContext: '監控馬達運轉電流或電漿放電電流。',
    category: 'process'
  },
  signal: {
    word: 'signal',
    lemma: 'signal',
    translation: '訊號 / 信號 / 電氣通訊反饋',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 席 - 格 - 諾 】',
    mandarinPhonetic: '【 席格諾 】',
    cleanroomContext: '確認 PLC 與機台模組之間的數位 I/O 訊號正常。',
    category: 'equipment'
  },
  offset: {
    word: 'offset',
    lemma: 'offset',
    translation: '偏移量 / 補償值',
    partOfSpeech: 'n./v.',
    taiwanPhonetic: '【 歐 - 夫 - 賽 - 特 】',
    mandarinPhonetic: '【 奧夫塞特 】',
    cleanroomContext: '輸入 X/Y/Z/Theta 座標微米 (um) 補償參數以修正夾爪中心點。',
    category: 'process'
  },
  yield: {
    word: 'yield',
    lemma: 'yield',
    translation: '晶圓良率 / 產出良率',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 依 - 歐 - 德 】',
    mandarinPhonetic: '【 易歐德 】',
    cleanroomContext: '晶圓製造品質指標 (例如 99.8% 高良率)。',
    category: 'process'
  },
  particle: {
    word: 'particle',
    lemma: 'particle',
    translation: '微塵粒子 / 顆粒污染 (Defect)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 帕 - 提 - 克 】',
    mandarinPhonetic: '【 帕提克 】',
    cleanroomContext: '無塵室落塵或晶圓表面微塵顆粒檢測。',
    category: 'process'
  },
  handover: {
    word: 'handover',
    lemma: 'handover',
    translation: '交接 / 交接班報告 (Shift Handover)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 漢 - 德 - 歐 - 弗 】',
    mandarinPhonetic: '【 漢德歐弗 】',
    cleanroomContext: '早晚班工程師傳承機台狀態、維修進度與未解問題。',
    memoryTrick: '吃了「漢」堡手「德」意地「歐」「弗」（Over）完成「交接」！',
    category: 'maintenance'
  },
  sop: {
    word: 'sop',
    lemma: 'sop',
    translation: '標準作業程序 (SOP)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 艾斯 - 歐 - 批 】',
    mandarinPhonetic: '【 艾斯歐批 】',
    cleanroomContext: '維修與操作必須 100% 遵循的文件步驟規範。',
    category: 'safety'
  },

  // === 常用工程動詞與修飾詞 (Common Verbs & Action Words) ===
  test: {
    word: 'test',
    lemma: 'test',
    translation: '測試 / 試驗 / 檢測',
    partOfSpeech: 'v./n.',
    taiwanPhonetic: '【 泰 - 斯 - 特 】',
    mandarinPhonetic: '【 泰斯特 】',
    category: 'maintenance'
  },
  check: {
    word: 'check',
    lemma: 'check',
    translation: '確認 / 檢查 / 核對',
    partOfSpeech: 'v./n.',
    taiwanPhonetic: '【 柴 - 克 】',
    mandarinPhonetic: '【 柴克 】',
    category: 'maintenance'
  },
  monitor: {
    word: 'monitor',
    lemma: 'monitor',
    translation: '監控 / 監視 / 監測指數',
    partOfSpeech: 'v./n.',
    taiwanPhonetic: '【 莫 - 尼 - 特 】',
    mandarinPhonetic: '【 摩尼特 】',
    category: 'process'
  },
  read: {
    word: 'read',
    lemma: 'read',
    translation: '讀取 / 判讀數值 / 讀取警報',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 瑞 - 德 】',
    mandarinPhonetic: '【 瑞德 】',
    category: 'maintenance'
  },
  lock: {
    word: 'lock',
    lemma: 'lock',
    translation: '上鎖 / 鎖定 / 扣緊',
    partOfSpeech: 'v./n.',
    taiwanPhonetic: '【 洛 - 克 】',
    mandarinPhonetic: '【 洛克 】',
    category: 'safety'
  },
  unlock: {
    word: 'unlock',
    lemma: 'unlock',
    translation: '開鎖 / 解鎖 / 解除鎖定',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 安 - 洛 - 克 】',
    mandarinPhonetic: '【 安洛克 】',
    category: 'safety'
  },
  open: {
    word: 'open',
    lemma: 'open',
    translation: '開啟 / 打開 / 開放',
    partOfSpeech: 'v./adj.',
    taiwanPhonetic: '【 歐 - 噴 】',
    mandarinPhonetic: '【 歐噴 】',
    category: 'general'
  },
  close: {
    word: 'close',
    lemma: 'close',
    translation: '關閉 / 緊閉 / 結案',
    partOfSpeech: 'v./adj.',
    taiwanPhonetic: '【 克 - 樓 - 斯 】',
    mandarinPhonetic: '【 克樓斯 】',
    category: 'general'
  },
  seal: {
    word: 'seal',
    lemma: 'seal',
    translation: '密封 / 封裝 / 氣密密封圈',
    partOfSpeech: 'v./n.',
    taiwanPhonetic: '【 希 - 歐 】',
    mandarinPhonetic: '【 希爾 】',
    category: 'equipment'
  },
  connect: {
    word: 'connect',
    lemma: 'connect',
    translation: '連接 / 接上管線 / 通訊連線',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 肯 - 內 - 克 - 特 】',
    mandarinPhonetic: '【 肯耐克特 】',
    category: 'equipment'
  },
  disconnect: {
    word: 'disconnect',
    lemma: 'disconnect',
    translation: '斷開 / 拔除接頭 / 離線',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 迪 - 斯 - 肯 - 內 - 克 - 特 】',
    mandarinPhonetic: '【 迪斯肯耐克特 】',
    category: 'equipment'
  },
  measure: {
    word: 'measure',
    lemma: 'measure',
    translation: '測量 / 量測尺寸與數值',
    partOfSpeech: 'v./n.',
    taiwanPhonetic: '【 梅 - 許 - 爾 】',
    mandarinPhonetic: '【 美熱爾 】',
    category: 'process'
  },
  stabilize: {
    word: 'stabilize',
    lemma: 'stabilize',
    translation: '穩定 / 趨於穩定 / 保持恆溫恆壓',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 斯 - 太 - 比 - 賴 - 茲 】',
    mandarinPhonetic: '【 斯太比賴茲 】',
    category: 'process'
  },
  reach: {
    word: 'reach',
    lemma: 'reach',
    translation: '達到 / 抵達特定數值',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 瑞 - 區 】',
    mandarinPhonetic: '【 瑞區 】',
    category: 'process'
  },
  trigger: {
    word: 'trigger',
    lemma: 'trigger',
    translation: '觸發 / 引起 / 觸動開關',
    partOfSpeech: 'v./n.',
    taiwanPhonetic: '【 吹 - 格 】',
    mandarinPhonetic: '【 崔格 】',
    category: 'safety'
  },
  swap: {
    word: 'swap',
    lemma: 'swap',
    translation: '更換 / 替換料件 (Swap Parts)',
    partOfSpeech: 'v./n.',
    taiwanPhonetic: '【 斯 - 挖 - 普 】',
    mandarinPhonetic: '【 斯挖普 】',
    cleanroomContext: '定期保養 PM 或故障維修時更換 RF Generator 或 Mass Flow Controller 等模組。',
    memoryTrick: '「斯」文地「挖」出「普」通舊料進行「更換」！',
    category: 'maintenance'
  },
  overheat: {
    word: 'overheat',
    lemma: 'overheat',
    translation: '過熱 / 溫度超標 (Overheating)',
    partOfSpeech: 'v./n.',
    taiwanPhonetic: '【 歐 - 弗 - 希 - 特 】',
    mandarinPhonetic: '【 歐弗希特 】',
    cleanroomContext: '幫浦馬達或電漿匹配器超過最高安全容許溫度時觸發 Interlock。',
    memoryTrick: '「歐」「弗」熱「希」「特」別燙就是「過熱」！',
    category: 'alarm'
  },
  generator: {
    word: 'generator',
    lemma: 'generator',
    translation: '產生器 / 射頻電源供應器 (RF Generator)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 哲 - 內 - 瑞 - 特 】',
    mandarinPhonetic: '【 哲內瑞特 】',
    cleanroomContext: '半導體腔體內提供 13.56MHz 高頻射頻能量激發電漿。',
    category: 'equipment'
  },
  plasma: {
    word: 'plasma',
    lemma: 'plasma',
    translation: '電漿 / 等離子體',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 普 - 拉 - 茲 - 瑪 】',
    mandarinPhonetic: '【 普拉茲瑪 】',
    cleanroomContext: '蝕刻 (Etch) 與薄膜沉積 (PECVD) 的高能量解離反應氣體。',
    category: 'process'
  },
  rf: {
    word: 'rf',
    lemma: 'rf',
    translation: '射頻 (Radio Frequency / RF Power)',
    partOfSpeech: 'n./adj.',
    taiwanPhonetic: '【 阿 - 爾 - 艾 - 夫 】',
    mandarinPhonetic: '【 阿爾艾夫 】',
    cleanroomContext: '晶圓製程激發電漿的核心高頻電力源。',
    category: 'equipment'
  },
  cleanroom: {
    word: 'cleanroom',
    lemma: 'cleanroom',
    translation: '無塵室 / 潔淨室 (Cleanroom Class 1/10/100)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 柯 - 林 - 倫 】',
    mandarinPhonetic: '【 柯林倫 】',
    cleanroomContext: '半導體晶圓製造需嚴格控管落塵、溫濕度與微震動之超潔淨廠房。',
    category: 'general'
  },
  lockout: {
    word: 'lockout',
    lemma: 'lockout',
    translation: '上鎖斷電 (LOTO / Lockout)',
    partOfSpeech: 'n./v.',
    taiwanPhonetic: '【 洛 - 克 - 奧 - 特 】',
    mandarinPhonetic: '【 洛克奧特 】',
    cleanroomContext: '機台維修保養前將斷路器與氣閥上鎖掛牌以確保零殘餘能量。',
    category: 'safety'
  },
  tagout: {
    word: 'tagout',
    lemma: 'tagout',
    translation: '掛牌警告 (Tagout)',
    partOfSpeech: 'n./v.',
    taiwanPhonetic: '【 太 - 格 - 奧 - 特 】',
    mandarinPhonetic: '【 泰格奧特 】',
    cleanroomContext: 'LOTO 安全程序中在主開關懸掛專屬工程師名牌與警告標籤。',
    category: 'safety'
  },
  defect: {
    word: 'defect',
    lemma: 'defect',
    translation: '缺陷 / 晶圓微粒瑕疵',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 迪 - 費 - 克 - 特 】',
    mandarinPhonetic: '【 迪費克特 】',
    cleanroomContext: '微粒掉落或刮傷導致晶圓良率下降之瑕疵。',
    category: 'process'
  },
  contamination: {
    word: 'contamination',
    lemma: 'contamination',
    translation: '污染 / 微粒或金屬離子污染',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 肯 - 塔 - 咪 - 內 - 遜 】',
    mandarinPhonetic: '【 肯塔咪內遜 】',
    cleanroomContext: '有機落塵、金屬離子或殘留氣體污染晶圓表面。',
    category: 'process'
  },
  carrier: {
    word: 'carrier',
    lemma: 'carrier',
    translation: '晶圓載具 / 晶舟盒 (Cassette / Carrier)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 凱 - 瑞 - 爾 】',
    mandarinPhonetic: '【 凱瑞爾 】',
    cleanroomContext: '承載 25 片晶圓之專用載具，進入 Load Port 傳送。',
    category: 'equipment'
  },
  slit: {
    word: 'slit',
    lemma: 'slit',
    translation: '閘縫閥 / 狹縫 (Slit Valve)',
    partOfSpeech: 'n./adj.',
    taiwanPhonetic: '【 斯 - 利 - 特 】',
    mandarinPhonetic: '【 斯利特 】',
    cleanroomContext: 'Load Lock 腔體與 Transfer Chamber 之間晶圓進出的超薄密封閘門。',
    category: 'equipment'
  },
  gate: {
    word: 'gate',
    lemma: 'gate',
    translation: '閘閥 / 主閘門 (Gate Valve)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 蓋 - 特 】',
    mandarinPhonetic: '【 蓋特 】',
    cleanroomContext: '隔離 High Vacuum 與 Atmospheric 環境的主閥門。',
    category: 'equipment'
  },
  throttle: {
    word: 'throttle',
    lemma: 'throttle',
    translation: '節流閥 / 壓力調節閥 (Throttle Valve)',
    partOfSpeech: 'n./adj.',
    taiwanPhonetic: '【 斯 - 洛 - 托 】',
    mandarinPhonetic: '【 斯洛托 】',
    cleanroomContext: '透過蝶閥開度精準控制製程腔體內部壓強。',
    category: 'equipment'
  },
  gauge: {
    word: 'gauge',
    lemma: 'gauge',
    translation: '計量器 / 壓強計 / 儀表 (Pressure Gauge)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 蓋 - 居 】',
    mandarinPhonetic: '【 蓋居 】',
    cleanroomContext: 'Baratron 電容壓力計或 Pirani 真空計。',
    category: 'equipment'
  },
  coolant: {
    word: 'coolant',
    lemma: 'coolant',
    translation: '冷卻液 / 水冷液',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 庫 - 倫 - 特 】',
    mandarinPhonetic: '【 庫倫特 】',
    cleanroomContext: 'Chiller 冷水循環系統中維持 Electrostatic Chuck 恆溫之介質。',
    category: 'process'
  },
  water: {
    word: 'water',
    lemma: 'water',
    translation: '冷卻水 / 超純水 (DI Water / PCW)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 沃 - 特 】',
    mandarinPhonetic: '【 沃特 】',
    cleanroomContext: 'Process Cooling Water (PCW) 與 Deionized Water (DI Water)。',
    category: 'process'
  },
  prevent: {
    word: 'prevent',
    lemma: 'prevent',
    translation: '防止 / 預防 / 避免異常',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 普 - 瑞 - 溫 - 特 】',
    mandarinPhonetic: '【 普瑞文特 】',
    category: 'safety'
  },
  secure: {
    word: 'secure',
    lemma: 'secure',
    translation: '牢固固定 / 確保安全無虞',
    partOfSpeech: 'v./adj.',
    taiwanPhonetic: '【 瑟 - 秋 - 爾 】',
    mandarinPhonetic: '【 瑟秋爾 】',
    category: 'safety'
  },
  execute: {
    word: 'execute',
    lemma: 'execute',
    translation: '執行指令 / 跑程式 (Run Command)',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 艾克 - 瑟 - 秋 - 特 】',
    mandarinPhonetic: '【 艾克瑟秋特 】',
    category: 'maintenance'
  },
  notify: {
    word: 'notify',
    lemma: 'notify',
    translation: '通知 / 通報值班主管',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 諾 - 提 - 發 - 愛 】',
    mandarinPhonetic: '【 諾提發愛 】',
    category: 'communication'
  },
  confirm: {
    word: 'confirm',
    lemma: 'confirm',
    translation: '確認 / 核實 / 雙重確認 (Double Check)',
    partOfSpeech: 'v.',
    taiwanPhonetic: '【 肯 - 風 - 姆 】',
    mandarinPhonetic: '【 肯風姆 】',
    category: 'communication'
  },
  log: {
    word: 'log',
    lemma: 'log',
    translation: '記錄 / 日誌 / 登錄機台歷史',
    partOfSpeech: 'v./n.',
    taiwanPhonetic: '【 洛 - 格 】',
    mandarinPhonetic: '【 洛格 】',
    category: 'maintenance'
  },
  clear: {
    word: 'clear',
    lemma: 'clear',
    translation: '清除 / 清空 / 放行正常',
    partOfSpeech: 'v./adj.',
    taiwanPhonetic: '【 克 - 利 - 爾 】',
    mandarinPhonetic: '【 克利爾 】',
    category: 'general'
  },
  ready: {
    word: 'ready',
    lemma: 'ready',
    translation: '就緒 / 準備完成',
    partOfSpeech: 'adj.',
    taiwanPhonetic: '【 瑞 - 滴 】',
    mandarinPhonetic: '【 瑞滴 】',
    category: 'general'
  },
  error: {
    word: 'error',
    lemma: 'error',
    translation: '錯誤 / 異常碼 (Error Code)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 艾 - 惹 】',
    mandarinPhonetic: '【 艾惹 】',
    category: 'maintenance'
  },
  code: {
    word: 'code',
    lemma: 'code',
    translation: '代碼 / 故障代號 (Fault Code)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 扣 - 得 】',
    mandarinPhonetic: '【 扣得 】',
    category: 'maintenance'
  },
  status: {
    word: 'status',
    lemma: 'status',
    translation: '狀態 / 機台當前運轉狀態',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 斯 - 太 - 特 - 斯 】',
    mandarinPhonetic: '【 斯泰特斯 】',
    category: 'equipment'
  },
  level: {
    word: 'level',
    lemma: 'level',
    translation: '水位 / 濃度 / 數值水平 / 水平度',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 來 - 佛 】',
    mandarinPhonetic: '【 來佛 】',
    category: 'process'
  },
  value: {
    word: 'value',
    lemma: 'value',
    translation: '數值 / 指數 / 測量值',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 伐 - 琉 】',
    mandarinPhonetic: '【 伐琉 】',
    category: 'process'
  },
  position: {
    word: 'position',
    lemma: 'position',
    translation: '位置 / 座標點 (X/Y/Z/T)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 珀 - 西 - 遜 】',
    mandarinPhonetic: '【 珀西遜 】',
    category: 'equipment'
  },
  motor: {
    word: 'motor',
    lemma: 'motor',
    translation: '馬達 / 驅動伺服馬達 (Servo Motor)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 摩 - 特 】',
    mandarinPhonetic: '【 摩特 】',
    category: 'equipment'
  },
  heater: {
    word: 'heater',
    lemma: 'heater',
    translation: '加熱器 / 加熱底座 (Heater Pedestal)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 希 - 特 】',
    mandarinPhonetic: '【 希特 】',
    category: 'equipment'
  },
  chiller: {
    word: 'chiller',
    lemma: 'chiller',
    translation: '冷卻水機 / 恆溫冰水系統',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 漆 - 勒 】',
    mandarinPhonetic: '【 漆勒 】',
    category: 'equipment'
  },
  nitrogen: {
    word: 'nitrogen',
    lemma: 'nitrogen',
    translation: '氮氣 (N2) / 高純度無塵室氮氣',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 奈 - 楚 - 簡 】',
    mandarinPhonetic: '【 奈楚金 】',
    category: 'process'
  },
  helium: {
    word: 'helium',
    lemma: 'helium',
    translation: '氦氣 (He) / 背壓冷卻氦氣 / 測漏氦氣',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 希 - 利 - 恩 】',
    mandarinPhonetic: '【 希利恩 】',
    category: 'process'
  },
  argon: {
    word: 'argon',
    lemma: 'argon',
    translation: '氬氣 (Ar) / 濺鍍與電漿惰性氣體',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 阿 - 爾 - 岡 】',
    mandarinPhonetic: '【 阿爾岡 】',
    category: 'process'
  },
  oxygen: {
    word: 'oxygen',
    lemma: 'oxygen',
    translation: '氧氣 (O2) / 去光阻灰化氣體 (Ashing)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 奧 - 克 - 西 - 簡 】',
    mandarinPhonetic: '【 奧克西金 】',
    category: 'process'
  },
  shift: {
    word: 'shift',
    lemma: 'shift',
    translation: '輪班 / 當班 (Day / Night Shift)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 許 - 夫 - 特 】',
    mandarinPhonetic: '【 許夫特 】',
    category: 'maintenance'
  },
  line: {
    word: 'line',
    lemma: 'line',
    translation: '管路 / 線路 / 產線',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 賴 - 恩 】',
    mandarinPhonetic: '【 賴恩 】',
    category: 'equipment'
  },
  flange: {
    word: 'flange',
    lemma: 'flange',
    translation: '法蘭 / 凸緣接頭 (真空法蘭 KF/ISO/CF)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 佛 - 蘭 - 居 】',
    mandarinPhonetic: '【 佛蘭吉 】',
    category: 'equipment'
  },
  fitting: {
    word: 'fitting',
    lemma: 'fitting',
    translation: '管件接頭 (VCR / Swagelok 接頭)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 飛 - 廷 】',
    mandarinPhonetic: '【 飛廷 】',
    category: 'equipment'
  },
  gasket: {
    word: 'gasket',
    lemma: 'gasket',
    translation: '墊片 / 金屬密封墊片 (VCR Gasket)',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 蓋 - 斯 - 凱 - 特 】',
    mandarinPhonetic: '【 蓋斯凱特 】',
    category: 'equipment'
  },
  system: {
    word: 'system',
    lemma: 'system',
    translation: '系統 / 機台整機系統',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 希 - 斯 - 騰 】',
    mandarinPhonetic: '【 希斯騰 】',
    category: 'equipment'
  },
  module: {
    word: 'module',
    lemma: 'module',
    translation: '模組 / 腔體獨立單元模組',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 摩 - 糾 - 爾 】',
    mandarinPhonetic: '【 摩糾爾 】',
    category: 'equipment'
  },
  tool: {
    word: 'tool',
    lemma: 'tool',
    translation: '機台 / 半導體製造設備 / 工具',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 圖 - 爾 】',
    mandarinPhonetic: '【 圖爾 】',
    category: 'equipment'
  },
  equipment: {
    word: 'equipment',
    lemma: 'equipment',
    translation: '設備 / 機台裝備',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 依 - 奎 - 普 - 門 - 特 】',
    mandarinPhonetic: '【 依奎普門特 】',
    category: 'equipment'
  },
  process: {
    word: 'process',
    lemma: 'process',
    translation: '製程 / 處理程序 / 進行加工',
    partOfSpeech: 'n./v.',
    taiwanPhonetic: '【 普 - 羅 - 賽 - 斯 】',
    mandarinPhonetic: '【 普羅塞斯 】',
    category: 'process'
  },
  quality: {
    word: 'quality',
    lemma: 'quality',
    translation: '品質 / 良率品質',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 誇 - 利 - 梯 】',
    mandarinPhonetic: '【 誇利梯 】',
    category: 'process'
  },
  safe: {
    word: 'safe',
    lemma: 'safe',
    translation: '安全的 / 無危險狀態',
    partOfSpeech: 'adj.',
    taiwanPhonetic: '【 賽 - 夫 】',
    mandarinPhonetic: '【 塞夫 】',
    category: 'safety'
  },
  manual: {
    word: 'manual',
    lemma: 'manual',
    translation: '手動模式 / 說明手冊',
    partOfSpeech: 'adj./n.',
    taiwanPhonetic: '【 曼 - 紐 - 歐 】',
    mandarinPhonetic: '【 曼紐爾 】',
    category: 'maintenance'
  },
  auto: {
    word: 'auto',
    lemma: 'auto',
    translation: '自動模式 (Auto Mode / Online)',
    partOfSpeech: 'adj./n.',
    taiwanPhonetic: '【 歐 - 透 】',
    mandarinPhonetic: '【 歐透 】',
    category: 'equipment'
  },
  normal: {
    word: 'normal',
    lemma: 'normal',
    translation: '正常 / 規格標準內 (In Spec)',
    partOfSpeech: 'adj.',
    taiwanPhonetic: '【 諾 - 摸 】',
    mandarinPhonetic: '【 諾摩 】',
    category: 'general'
  },
  abnormal: {
    word: 'abnormal',
    lemma: 'abnormal',
    translation: '異常 / 超出規格 (Out of Spec)',
    partOfSpeech: 'adj.',
    taiwanPhonetic: '【 艾布 - 諾 - 摸 】',
    mandarinPhonetic: '【 艾布諾摩 】',
    category: 'maintenance'
  },

  // === 常見功能詞與代名詞 (Grammar & Functional Words) ===
  slurry: {
    word: 'slurry',
    lemma: 'slurry',
    translation: '研磨液 / 化學研磨漿料',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 斯 - 勒 - 瑞 】',
    mandarinPhonetic: '【 斯勒瑞 】',
    cleanroomContext: '化學機械研磨 (CMP) 平坦化製程之化學拋光液。',
    category: 'process'
  },
  pad: {
    word: 'pad',
    lemma: 'pad',
    translation: '研磨墊 / 拋光墊',
    partOfSpeech: 'n.',
    taiwanPhonetic: '【 派 - 德 】',
    mandarinPhonetic: '【 派德 】',
    cleanroomContext: 'CMP 機台研磨基盤 (Platen) 耗材表面，搭配 Conditioner 修整。',
    category: 'process'
  },
  i: { word: 'i', lemma: 'i', translation: '我 (工程師)', partOfSpeech: 'pron.', ipa: '/aɪ/', taiwanPhonetic: '【 愛 】', mandarinPhonetic: '【 愛 】', memoryTrick: '最「愛」無塵室專業工作的「我」！', category: 'grammar' },
  you: { word: 'you', lemma: 'you', translation: '你 / 你們', partOfSpeech: 'pron.', ipa: '/juː/', taiwanPhonetic: '【 優 】', mandarinPhonetic: '【 優 】', memoryTrick: '最「優」秀的搭檔就是「你」！', category: 'grammar' },
  he: { word: 'he', lemma: 'he', translation: '他 (學長/工程師)', partOfSpeech: 'pron.', ipa: '/hiː/', taiwanPhonetic: '【 嘻 】', mandarinPhonetic: '【 希 】', memoryTrick: '笑「嘻」嘻幫忙修機台的「他」！', category: 'grammar' },
  she: { word: 'she', lemma: 'she', translation: '她 (工程師)', partOfSpeech: 'pron.', ipa: '/ʃiː/', taiwanPhonetic: '【 許 】', mandarinPhonetic: '【 希 】', memoryTrick: '備受讚「許」的女性工程師「她」！', category: 'grammar' },
  they: { word: 'they', lemma: 'they', translation: '他們 (工程團隊)', partOfSpeech: 'pron.', ipa: '/ðeɪ/', taiwanPhonetic: '【 賊 】', mandarinPhonetic: '【 雷 】', memoryTrick: '技術「賊」厲害的值班夥伴「他們」！', category: 'grammar' },
  it: { word: 'it', lemma: 'it', translation: '它 (機台/感應器/數值)', partOfSpeech: 'pron.', ipa: '/ɪt/', taiwanPhonetic: '【 伊-特 】', mandarinPhonetic: '【 伊特 】', category: 'grammar' },
  a: { word: 'a', lemma: 'a', translation: '一個 / 某個', partOfSpeech: 'art.', ipa: '/ə/', taiwanPhonetic: '【 額 】', mandarinPhonetic: '【 額 】', category: 'grammar' },
  an: { word: 'an', lemma: 'an', translation: '一個 (母音前)', partOfSpeech: 'art.', ipa: '/æn/', taiwanPhonetic: '【 恩 】', mandarinPhonetic: '【 安 】', category: 'grammar' },
  this: { word: 'this', lemma: 'this', translation: '這個 (當前機台)', partOfSpeech: 'pron.', ipa: '/ðɪs/', taiwanPhonetic: '【 利-斯 】', mandarinPhonetic: '【 迪斯 】', category: 'grammar' },
  that: { word: 'that', lemma: 'that', translation: '那個 (指定狀態)', partOfSpeech: 'pron.', ipa: '/ðæt/', taiwanPhonetic: '【 賴-特 】', mandarinPhonetic: '【 達特 】', category: 'grammar' },
  is: { word: 'is', lemma: 'be', translation: '是 / 處於...狀態', partOfSpeech: 'v.', ipa: '/ɪz/', taiwanPhonetic: '【 一-滋 】', mandarinPhonetic: '【 伊茲 】', category: 'grammar' },
  are: { word: 'are', lemma: 'be', translation: '是 (複數)', partOfSpeech: 'v.', ipa: '/ɑːr/', taiwanPhonetic: '【 阿-爾 】', mandarinPhonetic: '【 阿爾 】', category: 'grammar' },
  am: { word: 'am', lemma: 'be', translation: '是 (第一人稱)', partOfSpeech: 'v.', ipa: '/æm/', taiwanPhonetic: '【 艾-姆 】', mandarinPhonetic: '【 艾姆 】', category: 'grammar' },
  was: { word: 'was', lemma: 'be', translation: '曾是 (過去式)', partOfSpeech: 'v.', ipa: '/wʌz/', taiwanPhonetic: '【 瓦-茲 】', mandarinPhonetic: '【 瓦茲 】', category: 'grammar' },
  were: { word: 'were', lemma: 'be', translation: '曾是 (複數過去式)', partOfSpeech: 'v.', ipa: '/wɝː/', taiwanPhonetic: '【 沃-爾 】', mandarinPhonetic: '【 沃爾 】', category: 'grammar' },
  has: { word: 'has', lemma: 'have', translation: '有 / 出現 (第三人稱)', partOfSpeech: 'v.', ipa: '/hæz/', taiwanPhonetic: '【 害-茲 】', mandarinPhonetic: '【 哈茲 】', category: 'grammar' },
  have: { word: 'have', lemma: 'have', translation: '有 / 已經完成', partOfSpeech: 'v.', ipa: '/hæv/', taiwanPhonetic: '【 害-夫 】', mandarinPhonetic: '【 哈夫 】', category: 'grammar' },
  had: { word: 'had', lemma: 'have', translation: '曾有 / 已完成', partOfSpeech: 'v.', ipa: '/hæd/', taiwanPhonetic: '【 害-德 】', mandarinPhonetic: '【 哈德 】', category: 'grammar' },
  will: { word: 'will', lemma: 'will', translation: '將會 / 即將執行', partOfSpeech: 'aux.', ipa: '/wɪl/', taiwanPhonetic: '【 威-歐 】', mandarinPhonetic: '【 威爾 】', category: 'grammar' },
  can: { word: 'can', lemma: 'can', translation: '可以 / 能夠', partOfSpeech: 'aux.', ipa: '/kæn/', taiwanPhonetic: '【 坎-恩 】', mandarinPhonetic: '【 肯恩 】', category: 'grammar' },
  should: { word: 'should', lemma: 'should', translation: '應該 / 建議按規範', partOfSpeech: 'aux.', ipa: '/ʃʊd/', taiwanPhonetic: '【 許-德 】', mandarinPhonetic: '【 休德 】', category: 'grammar' },
  must: { word: 'must', lemma: 'must', translation: '必須 (工安強制)', partOfSpeech: 'aux.', ipa: '/mʌst/', taiwanPhonetic: '【 罵-斯-特 】', mandarinPhonetic: '【 瑪斯特 】', category: 'grammar' },
  do: { word: 'do', lemma: 'do', translation: '做 / 執行 (助動詞)', partOfSpeech: 'v./aux.', ipa: '/duː/', taiwanPhonetic: '【 肚 】', mandarinPhonetic: '【 度 】', category: 'grammar' },
  not: { word: 'not', lemma: 'not', translation: '不 / 禁止 (否定)', partOfSpeech: 'adv.', ipa: '/nɑːt/', taiwanPhonetic: '【 那-特 】', mandarinPhonetic: '【 納特 】', category: 'grammar' },
  and: { word: 'and', lemma: 'and', translation: '而且 / 與 / 並', partOfSpeech: 'conj.', ipa: '/ænd/', taiwanPhonetic: '【 恩-德 】', mandarinPhonetic: '【 安德 】', category: 'grammar' },
  or: { word: 'or', lemma: 'or', translation: '或者 / 否則', partOfSpeech: 'conj.', ipa: '/ɔːr/', taiwanPhonetic: '【 歐-爾 】', mandarinPhonetic: '【 奧爾 】', category: 'grammar' },
  in: { word: 'in', lemma: 'in', translation: '在...裡面', partOfSpeech: 'prep.', ipa: '/ɪn/', taiwanPhonetic: '【 硬 】', mandarinPhonetic: '【 因 】', category: 'grammar' },
  on: { word: 'on', lemma: 'on', translation: '在...上面 / 開啟', partOfSpeech: 'prep.', ipa: '/ɑːn/', taiwanPhonetic: '【 昂 】', mandarinPhonetic: '【 昂 】', category: 'grammar' },
  at: { word: 'at', lemma: 'at', translation: '在...位置/數值', partOfSpeech: 'prep.', ipa: '/æt/', taiwanPhonetic: '【 艾-特 】', mandarinPhonetic: '【 艾特 】', category: 'grammar' },
  to: { word: 'to', lemma: 'to', translation: '到 / 去 / 為了', partOfSpeech: 'prep.', ipa: '/tuː/', taiwanPhonetic: '【 兔 】', mandarinPhonetic: '【 吐 】', category: 'grammar' },
  for: { word: 'for', lemma: 'for', translation: '為了 / 針對', partOfSpeech: 'prep.', ipa: '/fɔːr/', taiwanPhonetic: '【 佛 】', mandarinPhonetic: '【 佛 】', category: 'grammar' },
  of: { word: 'of', lemma: 'of', translation: '的 / 屬於', partOfSpeech: 'prep.', ipa: '/ʌv/', taiwanPhonetic: '【 歐-夫 】', mandarinPhonetic: '【 奧夫 】', category: 'grammar' },
  from: { word: 'from', lemma: 'from', translation: '從 / 來自', partOfSpeech: 'prep.', ipa: '/frʌm/', taiwanPhonetic: '【 佛-讓-姆 】', mandarinPhonetic: '【 佛讓姆 】', category: 'grammar' },
  with: { word: 'with', lemma: 'with', translation: '使用 / 搭配', partOfSpeech: 'prep.', ipa: '/wɪð/', taiwanPhonetic: '【 威-斯 】', mandarinPhonetic: '【 威斯 】', category: 'grammar' },
  without: { word: 'without', lemma: 'without', translation: '沒有 / 無', partOfSpeech: 'prep.', ipa: '/wɪˈðaʊt/', taiwanPhonetic: '【 威-斯-奧-特 】', mandarinPhonetic: '【 威斯奧特 】', category: 'grammar' },
  before: { word: 'before', lemma: 'before', translation: '在...之前', partOfSpeech: 'prep.', ipa: '/bɪˈfɔːr/', taiwanPhonetic: '【 比-佛 】', mandarinPhonetic: '【 比佛 】', category: 'grammar' },
  after: { word: 'after', lemma: 'after', translation: '在...之後', partOfSpeech: 'prep.', ipa: '/ˈæf.tər/', taiwanPhonetic: '【 艾-夫-特 】', mandarinPhonetic: '【 艾夫特 】', category: 'grammar' },
  during: { word: 'during', lemma: 'during', translation: '在...期間', partOfSpeech: 'prep.', ipa: '/ˈdʊr.ɪŋ/', taiwanPhonetic: '【 丟-瑞-恩 】', mandarinPhonetic: '【 丟林 】', category: 'grammar' },
  under: { word: 'under', lemma: 'under', translation: '在...之下', partOfSpeech: 'prep.', ipa: '/ˈʌn.dər/', taiwanPhonetic: '【 昂-德 】', mandarinPhonetic: '【 安德 】', category: 'grammar' },
  below: { word: 'below', lemma: 'below', translation: '低於 / 在...下方', partOfSpeech: 'prep.', ipa: '/bɪˈloʊ/', taiwanPhonetic: '【 比-樓 】', mandarinPhonetic: '【 比樓 】', category: 'grammar' },
  all: { word: 'all', lemma: 'all', translation: '全部 / 所有', partOfSpeech: 'adj./pron.', ipa: '/ɔːl/', taiwanPhonetic: '【 歐-爾 】', mandarinPhonetic: '【 奧爾 】', category: 'general' },
  now: { word: 'now', lemma: 'now', translation: '現在 / 立即', partOfSpeech: 'adv.', ipa: '/naʊ/', taiwanPhonetic: '【 鬧 】', mandarinPhonetic: '【 腦 】', category: 'general' },
  well: { word: 'well', lemma: 'well', translation: '良好地 / 正常', partOfSpeech: 'adv.', ipa: '/wel/', taiwanPhonetic: '【 威-歐 】', mandarinPhonetic: '【 威爾 】', category: 'general' },
  fast: { word: 'fast', lemma: 'fast', translation: '快速的', partOfSpeech: 'adj./adv.', ipa: '/fæst/', taiwanPhonetic: '【 費-斯-特 】', mandarinPhonetic: '【 法斯特 】', category: 'general' },
  slow: { word: 'slow', lemma: 'slow', translation: '緩慢的', partOfSpeech: 'adj./adv.', ipa: '/sloʊ/', taiwanPhonetic: '【 斯-樓 】', mandarinPhonetic: '【 斯樓 】', category: 'general' },
  high: { word: 'high', lemma: 'high', translation: '高的 / 過高', partOfSpeech: 'adj.', ipa: '/haɪ/', taiwanPhonetic: '【 海 】', mandarinPhonetic: '【 嗨 】', category: 'general' },
  low: { word: 'low', lemma: 'low', translation: '低的 / 偏低', partOfSpeech: 'adj.', ipa: '/loʊ/', taiwanPhonetic: '【 樓 】', mandarinPhonetic: '【 摟 】', category: 'general' },
  new: { word: 'new', lemma: 'new', translation: '新的 / 全新', partOfSpeech: 'adj.', ipa: '/nuː/', taiwanPhonetic: '【 紐 】', mandarinPhonetic: '【 紐 】', category: 'general' },
  old: { word: 'old', lemma: 'old', translation: '舊的 / 耗損的', partOfSpeech: 'adj.', ipa: '/oʊld/', taiwanPhonetic: '【 歐-德 】', mandarinPhonetic: '【 歐德 】', category: 'general' },
  done: { word: 'done', lemma: 'do', translation: '已完成', partOfSpeech: 'adj.', ipa: '/dʌn/', taiwanPhonetic: '【 當 】', mandarinPhonetic: '【 當 】', category: 'general' },
  optical: { word: 'optical', lemma: 'optical', translation: '光學的 / 光電感應', partOfSpeech: 'adj.', ipa: '/ˈɑːp.tɪ.kəl/', taiwanPhonetic: '【 阿-普-提-口 】', mandarinPhonetic: '【 阿普提口 】', category: 'equipment' },
  nozzle: { word: 'nozzle', lemma: 'nozzle', translation: '噴嘴 / 化學液噴頭', partOfSpeech: 'n.', ipa: '/ˈnɑː.zəl/', taiwanPhonetic: '【 拿-走 】', mandarinPhonetic: '【 納澤爾 】', category: 'equipment' },
  frequency: { word: 'frequency', lemma: 'frequency', translation: '頻率 / 射頻頻率', partOfSpeech: 'n.', ipa: '/ˈfriː.kwən.si/', taiwanPhonetic: '【 芙-瑞-昆-西 】', mandarinPhonetic: '【 弗瑞昆西 】', category: 'process' },
  match: { word: 'match', lemma: 'match', translation: '匹配 / 調諧阻抗', partOfSpeech: 'v./n.', ipa: '/mætʃ/', taiwanPhonetic: '【 賣-取 】', mandarinPhonetic: '【 麥奇 】', category: 'maintenance' },
  supply: { word: 'supply', lemma: 'supply', translation: '供應 / 供料系統', partOfSpeech: 'n./v.', ipa: '/səˈplaɪ/', taiwanPhonetic: '【 瑟-普-賴 】', mandarinPhonetic: '【 薩普萊 】', category: 'process' },
  profile: { word: 'profile', lemma: 'profile', translation: '輪廓 / 膜厚分佈曲線', partOfSpeech: 'n.', ipa: '/ˈproʊ.faɪl/', taiwanPhonetic: '【 破-摟-發-歐 】', mandarinPhonetic: '【 普羅法爾 】', category: 'process' },
  head: { word: 'head', lemma: 'head', translation: '研磨頭 / 機頭', partOfSpeech: 'n.', ipa: '/hed/', taiwanPhonetic: '【 黑-德 】', mandarinPhonetic: '【 黑德 】', category: 'equipment' },
  rate: { word: 'rate', lemma: 'rate', translation: '速率 / 流量率', partOfSpeech: 'n.', ipa: '/reɪt/', taiwanPhonetic: '【 瑞-特 】', mandarinPhonetic: '【 瑞特 】', category: 'process' },
  touch: { word: 'touch', lemma: 'touch', translation: '觸碰 / 接觸', partOfSpeech: 'v.', ipa: '/tʌtʃ/', taiwanPhonetic: '【 踏-取 】', mandarinPhonetic: '【 塔奇 】', category: 'safety' },
  door: { word: 'door', lemma: 'door', translation: '機門 / 腔門', partOfSpeech: 'n.', ipa: '/dɔːr/', taiwanPhonetic: '【 都-爾 】', mandarinPhonetic: '【 多爾 】', category: 'equipment' },
  button: { word: 'button', lemma: 'button', translation: '按鈕 / 開關鈕', partOfSpeech: 'n.', ipa: '/ˈbʌt.ən/', taiwanPhonetic: '【 拔-騰 】', mandarinPhonetic: '【 巴騰 】', category: 'equipment' },
  cylinder: { word: 'cylinder', lemma: 'cylinder', translation: '氣壓缸 / 氣瓶', partOfSpeech: 'n.', ipa: '/ˈsɪl.ɪn.dər/', taiwanPhonetic: '【 西-林-德 】', mandarinPhonetic: '【 希林德 】', category: 'equipment' },
  tune: { word: 'tune', lemma: 'tune', translation: '調諧 / 微調頻率', partOfSpeech: 'v.', ipa: '/tuːn/', taiwanPhonetic: '【 吐-恩 】', mandarinPhonetic: '【 圖恩 】', category: 'maintenance' },
  teach: { word: 'teach', lemma: 'teach', translation: '教導點位 (設定手臂座標)', partOfSpeech: 'v.', ipa: '/tiːtʃ/', taiwanPhonetic: '【 替-取 】', mandarinPhonetic: '【 提奇 】', category: 'maintenance' },
  dispense: { word: 'dispense', lemma: 'dispense', translation: '吐出 / 供應滴注 (藥液)', partOfSpeech: 'v.', ipa: '/dɪˈspens/', taiwanPhonetic: '【 迪-斯-噴-斯 】', mandarinPhonetic: '【 迪斯噴斯 】', category: 'process' },
  zero: { word: 'zero', lemma: 'zero', translation: '歸零 / 零點校正', partOfSpeech: 'v./n.', ipa: '/ˈzɪr.oʊ/', taiwanPhonetic: '【 茲-羅 】', mandarinPhonetic: '【 吉羅 】', category: 'maintenance' },
  bolt: { word: 'bolt', lemma: 'bolt', translation: '螺栓 / 螺絲', partOfSpeech: 'n.', ipa: '/boʊlt/', taiwanPhonetic: '【 波-特 】', mandarinPhonetic: '【 博特 】', category: 'equipment' },
  evenly: { word: 'evenly', lemma: 'evenly', translation: '均勻地 / 對稱地', partOfSpeech: 'adv.', ipa: '/ˈiː.vən.li/', taiwanPhonetic: '【 伊-分-利 】', mandarinPhonetic: '【 伊分利 】', category: 'maintenance' },
  lens: { word: 'lens', lemma: 'lens', translation: '曝光鏡頭 / 光學透鏡', partOfSpeech: 'n.', ipa: '/lenz/', taiwanPhonetic: '【 稜-斯 】', mandarinPhonetic: '【 稜斯 】', cleanroomContext: 'EUV / DUV 曝光機投影物鏡組，需定期檢測熱像差與反射表面潔淨度。', memoryTrick: '鏡頭有「稜」有角，擦乾淨才「斯」毫無塵！', category: 'equipment' },
  mirror: { word: 'mirror', lemma: 'mirror', translation: '反射鏡 / 曝光鏡片', partOfSpeech: 'n.', ipa: '/ˈmɪr.ər/', taiwanPhonetic: '【 米-惹 】', mandarinPhonetic: '【 米惹 】', category: 'equipment' },
  reticle: { word: 'reticle', lemma: 'reticle', translation: '光罩 (Reticle)', partOfSpeech: 'n.', ipa: '/ˈret.ɪ.kəl/', taiwanPhonetic: '【 瑞-提-口 】', mandarinPhonetic: '【 瑞提口 】', category: 'equipment' },
  mask: { word: 'mask', lemma: 'mask', translation: '光罩 / 遮罩', partOfSpeech: 'n.', ipa: '/mæsk/', taiwanPhonetic: '【 馬-斯-克 】', mandarinPhonetic: '【 馬斯克 】', category: 'equipment' },
  stage: { word: 'stage', lemma: 'stage', translation: '晶圓載台', partOfSpeech: 'n.', ipa: '/steɪdʒ/', taiwanPhonetic: '【 斯-戴-居 】', mandarinPhonetic: '【 斯戴居 】', category: 'equipment' },
  chuck: { word: 'chuck', lemma: 'chuck', translation: '靜電吸盤 (Chuck)', partOfSpeech: 'n.', ipa: '/tʃʌk/', taiwanPhonetic: '【 洽-克 】', mandarinPhonetic: '【 洽克 】', category: 'equipment' },
  filter: { word: 'filter', lemma: 'filter', translation: '濾網 / 過濾器', partOfSpeech: 'n.', ipa: '/ˈfɪl.tər/', taiwanPhonetic: '【 費-歐-特 】', mandarinPhonetic: '【 菲爾特 】', category: 'equipment' },
  cable: { word: 'cable', lemma: 'cable', translation: '電纜 / 訊號線', partOfSpeech: 'n.', ipa: '/ˈkeɪ.bəl/', taiwanPhonetic: '【 凱-伯 】', mandarinPhonetic: '【 凱伯 】', category: 'equipment' },
  board: { word: 'board', lemma: 'board', translation: '電路控制板', partOfSpeech: 'n.', ipa: '/bɔːrd/', taiwanPhonetic: '【 博-德 】', mandarinPhonetic: '【 博德 】', category: 'equipment' },
  switch: { word: 'switch', lemma: 'switch', translation: '開關 / 切換器', partOfSpeech: 'n./v.', ipa: '/swɪtʃ/', taiwanPhonetic: '【 斯-威-取 】', mandarinPhonetic: '【 斯威奇 】', category: 'equipment' },
  screen: { word: 'screen', lemma: 'screen', translation: '機台螢幕', partOfSpeech: 'n.', ipa: '/skriːn/', taiwanPhonetic: '【 斯-克-林 】', mandarinPhonetic: '【 斯克林 】', category: 'equipment' },
  fan: { word: 'fan', lemma: 'fan', translation: '排氣風扇 (FFU)', partOfSpeech: 'n.', ipa: '/fæn/', taiwanPhonetic: '【 凡 】', mandarinPhonetic: '【 凡 】', category: 'equipment' },
  tube: { word: 'tube', lemma: 'tube', translation: '石英管 / 管路', partOfSpeech: 'n.', ipa: '/tuːb/', taiwanPhonetic: '【 圖-伯 】', mandarinPhonetic: '【 圖伯 】', category: 'equipment' },
  pipe: { word: 'pipe', lemma: 'pipe', translation: '排氣管線', partOfSpeech: 'n.', ipa: '/paɪp/', taiwanPhonetic: '【 派-普 】', mandarinPhonetic: '【 派普 】', category: 'equipment' },
  lid: { word: 'lid', lemma: 'lid', translation: '腔體上蓋', partOfSpeech: 'n.', ipa: '/lɪd/', taiwanPhonetic: '【 利-德 】', mandarinPhonetic: '【 利德 】', category: 'equipment' },
  scrubber: { word: 'scrubber', lemma: 'scrubber', translation: '尾氣洗滌塔', partOfSpeech: 'n.', ipa: '/ˈskrʌb.ər/', taiwanPhonetic: '【 斯-克-拉-伯 】', mandarinPhonetic: '【 斯克拉伯 】', category: 'equipment' },
  focus: { word: 'focus', lemma: 'focus', translation: '曝光焦距 / 對焦', partOfSpeech: 'n./v.', ipa: '/ˈfoʊ.kəs/', taiwanPhonetic: '【 佛-克-斯 】', mandarinPhonetic: '【 佛克斯 】', category: 'process' },
  dose: { word: 'dose', lemma: 'dose', translation: '曝光能量劑量', partOfSpeech: 'n.', ipa: '/doʊs/', taiwanPhonetic: '【 豆-斯 】', mandarinPhonetic: '【 豆斯 】', category: 'process' },
  air: { word: 'air', lemma: 'air', translation: '氣壓 / 潔淨空氣', partOfSpeech: 'n.', ipa: '/er/', taiwanPhonetic: '【 艾-爾 】', mandarinPhonetic: '【 艾爾 】', category: 'process' },
  back: { word: 'back', lemma: 'back', translation: '恢復 / 返回', partOfSpeech: 'adv./adj.', ipa: '/bæk/', taiwanPhonetic: '【 貝-克 】', mandarinPhonetic: '【 貝克 】', category: 'general' },
  pause: { word: 'pause', lemma: 'pause', translation: '暫停 / 中斷', partOfSpeech: 'v./n.', ipa: '/pɑːz/', taiwanPhonetic: '【 珀-斯 】', mandarinPhonetic: '【 珀斯 】', category: 'maintenance' },
  paused: { word: 'paused', lemma: 'pause', translation: '已暫停', partOfSpeech: 'adj./v.', ipa: '/pɑːzd/', taiwanPhonetic: '【 珀-斯-特 】', mandarinPhonetic: '【 珀斯特 】', category: 'maintenance' },
  run: { word: 'run', lemma: 'run', translation: '運轉 / 生產批', partOfSpeech: 'v./n.', ipa: '/rʌn/', taiwanPhonetic: '【 潤 】', mandarinPhonetic: '【 潤 】', category: 'process' },
  runs: { word: 'runs', lemma: 'run', translation: '運轉 / 執行', partOfSpeech: 'v.', ipa: '/rʌnz/', taiwanPhonetic: '【 潤-斯 】', mandarinPhonetic: '【 潤斯 】', category: 'process' },
  production: { word: 'production', lemma: 'production', translation: '量產 / 生產線', partOfSpeech: 'n.', ipa: '/prəˈdʌk.ʃən/', taiwanPhonetic: '【 普-羅-達-克-遜 】', mandarinPhonetic: '【 普羅達克遜 】', category: 'process' },
  notch: { word: 'notch', lemma: 'notch', translation: '晶圓定位缺口', partOfSpeech: 'n.', ipa: '/nɑːtʃ/', taiwanPhonetic: '【 諾-奇 】', mandarinPhonetic: '【 諾奇 】', category: 'equipment' },
  alignment: { word: 'alignment', lemma: 'alignment', translation: '對準 / 校準度', partOfSpeech: 'n.', ipa: '/əˈlaɪn.mənt/', taiwanPhonetic: '【 額-賴-恩-門-特 】', mandarinPhonetic: '【 額賴恩門特 】', category: 'maintenance' },
  okay: { word: 'okay', lemma: 'okay', translation: '正常 / 沒問題', partOfSpeech: 'adj.', ipa: '/oʊˈkeɪ/', taiwanPhonetic: '【 歐-開 】', mandarinPhonetic: '【 歐開 】', category: 'general' },
  save: { word: 'save', lemma: 'save', translation: '儲存 / 存檔', partOfSpeech: 'v.', ipa: '/seɪv/', taiwanPhonetic: '【 塞-夫 】', mandarinPhonetic: '【 塞夫 】', category: 'maintenance' },
  saved: { word: 'saved', lemma: 'save', translation: '已儲存', partOfSpeech: 'v./adj.', ipa: '/seɪvd/', taiwanPhonetic: '【 塞-夫-得 】', mandarinPhonetic: '【 塞夫得 】', category: 'maintenance' },
  report: { word: 'report', lemma: 'report', translation: '維修報告 / 回報', partOfSpeech: 'n./v.', ipa: '/rɪˈpɔːrt/', taiwanPhonetic: '【 瑞-珀-特 】', mandarinPhonetic: '【 瑞珀特 】', category: 'maintenance' },
  service: { word: 'service', lemma: 'service', translation: '維修服務 / 保養', partOfSpeech: 'n./v.', ipa: '/ˈsɜː.vɪs/', taiwanPhonetic: '【 瑟-維-斯 】', mandarinPhonetic: '【 瑟維斯 】', category: 'maintenance' },
  history: { word: 'history', lemma: 'history', translation: '歷史紀錄 / 履歷', partOfSpeech: 'n.', ipa: '/ˈhɪs.tər.i/', taiwanPhonetic: '【 希-斯-特-瑞 】', mandarinPhonetic: '【 希斯特瑞 】', category: 'maintenance' },
  uploaded: { word: 'uploaded', lemma: 'upload', translation: '已上傳', partOfSpeech: 'adj./v.', ipa: '/ʌpˈloʊ.dɪd/', taiwanPhonetic: '【 阿-普-樓-蒂-得 】', mandarinPhonetic: '【 阿普樓蒂得 】', category: 'maintenance' },
  'o-ring': { word: 'O-ring', lemma: 'O-ring', translation: 'O型密封環', partOfSpeech: 'n.', ipa: '/ˈoʊ.rɪŋ/', taiwanPhonetic: '【 歐-瑞-英 】', mandarinPhonetic: '【 歐瑞英 】', category: 'equipment' },
  oring: { word: 'O-ring', lemma: 'O-ring', translation: 'O型密封環', partOfSpeech: 'n.', ipa: '/ˈoʊ.rɪŋ/', taiwanPhonetic: '【 歐-瑞-英 】', mandarinPhonetic: '【 歐瑞英 】', category: 'equipment' },
  looks: { word: 'looks', lemma: 'look', translation: '看起來 / 外觀', partOfSpeech: 'v.', ipa: '/lʊks/', taiwanPhonetic: '【 路-克-斯 】', mandarinPhonetic: '【 路克斯 】', category: 'general' },
  good: { word: 'good', lemma: 'good', translation: '正常良好', partOfSpeech: 'adj.', ipa: '/ɡʊd/', taiwanPhonetic: '【 固-得 】', mandarinPhonetic: '【 固得 】', category: 'general' },
  breaker: { word: 'breaker', lemma: 'breaker', translation: '斷路器 / 無熔絲開關', partOfSpeech: 'n.', ipa: '/ˈbreɪ.kər/', taiwanPhonetic: '【 布-瑞-克 】', mandarinPhonetic: '【 布瑞克 】', category: 'equipment' },
  stable: { word: 'stable', lemma: 'stable', translation: '穩定正常', partOfSpeech: 'adj.', ipa: '/ˈsteɪ.bəl/', taiwanPhonetic: '【 斯-特-波 】', mandarinPhonetic: '【 斯特波 】', category: 'process' },
  scan: { word: 'scan', lemma: 'scan', translation: '掃描 / 刷讀', partOfSpeech: 'v./n.', ipa: '/skæn/', taiwanPhonetic: '【 斯-干 】', mandarinPhonetic: '【 斯干 】', category: 'maintenance' },
  barcode: { word: 'barcode', lemma: 'barcode', translation: '條碼', partOfSpeech: 'n.', ipa: '/ˈbɑːr.koʊd/', taiwanPhonetic: '【 吧-扣-得 】', mandarinPhonetic: '【 吧扣得 】', category: 'equipment' },
  id: { word: 'ID', lemma: 'ID', translation: '識別碼 / 編號', partOfSpeech: 'n.', ipa: '/ˌaɪˈdiː/', taiwanPhonetic: '【 艾-蒂 】', mandarinPhonetic: '【 艾蒂 】', category: 'general' },
  lot: { word: 'lot', lemma: 'lot', translation: '晶圓批號 (Lot)', partOfSpeech: 'n.', ipa: '/lɑːt/', taiwanPhonetic: '【 洛-特 】', mandarinPhonetic: '【 洛特 】', category: 'process' },
  success: { word: 'success', lemma: 'success', translation: '成功 / 通過', partOfSpeech: 'n.', ipa: '/səkˈses/', taiwanPhonetic: '【 瑟-克-賽-斯 】', mandarinPhonetic: '【 瑟克賽斯 】', category: 'general' },
  fill: { word: 'fill', lemma: 'fill', translation: '加滿 / 填充', partOfSpeech: 'v.', ipa: '/fɪl/', taiwanPhonetic: '【 費-歐 】', mandarinPhonetic: '【 費歐 】', category: 'maintenance' },
  oil: { word: 'oil', lemma: 'oil', translation: '真空油 / 潤滑油', partOfSpeech: 'n.', ipa: '/ɔɪl/', taiwanPhonetic: '【 歐-伊-歐 】', mandarinPhonetic: '【 歐伊歐 】', category: 'equipment' },
  top: { word: 'top', lemma: 'top', translation: '補滿 / 頂部', partOfSpeech: 'v./n.', ipa: '/tɑːp/', taiwanPhonetic: '【 踏-普 】', mandarinPhonetic: '【 踏普 】', category: 'maintenance' },
  up: { word: 'up', lemma: 'up', translation: '向上 / 滿位', partOfSpeech: 'adv./prep.', ipa: '/ʌp/', taiwanPhonetic: '【 阿-普 】', mandarinPhonetic: '【 阿普 】', category: 'general' },
  lube: { word: 'lube', lemma: 'lube', translation: '潤滑油 / 油脂', partOfSpeech: 'n.', ipa: '/luːb/', taiwanPhonetic: '【 露-伯 】', mandarinPhonetic: '【 露伯 】', category: 'maintenance' },
  full: { word: 'full', lemma: 'full', translation: '已滿 / 滿位', partOfSpeech: 'adj.', ipa: '/fʊl/', taiwanPhonetic: '【 佛 】', mandarinPhonetic: '【 佛 】', category: 'general' },
  working: { word: 'working', lemma: 'work', translation: '正常運作中', partOfSpeech: 'adj./v.', ipa: '/ˈwɜː.kɪŋ/', taiwanPhonetic: '【 沃-金 】', mandarinPhonetic: '【 沃金 】', category: 'general' },
  fix: { word: 'fix', lemma: 'fix', translation: '修復 / 排除故障', partOfSpeech: 'v.', ipa: '/fɪks/', taiwanPhonetic: '【 費-克-斯 】', mandarinPhonetic: '【 費克斯 】', category: 'maintenance' },
  clamp: { word: 'clamp', lemma: 'clamp', translation: '夾持 / 鎖緊', partOfSpeech: 'v./n.', ipa: '/klæmp/', taiwanPhonetic: '【 克-藍-普 】', mandarinPhonetic: '【 克藍普 】', category: 'equipment' },
  clamps: { word: 'clamps', lemma: 'clamp', translation: '夾持 / 扣緊', partOfSpeech: 'v.', ipa: '/klæmps/', taiwanPhonetic: '【 克-藍-普-斯 】', mandarinPhonetic: '【 克藍普斯 】', category: 'equipment' },
  count: { word: 'count', lemma: 'count', translation: '計數值 / 顆粒數', partOfSpeech: 'n./v.', ipa: '/kaʊnt/', taiwanPhonetic: '【 康-特 】', mandarinPhonetic: '【 康特 】', category: 'process' },
  submit: { word: 'submit', lemma: 'submit', translation: '提交 / 送出報告', partOfSpeech: 'v.', ipa: '/səbˈmɪt/', taiwanPhonetic: '【 薩-伯-密-特 】', mandarinPhonetic: '【 薩伯密特 】', category: 'maintenance' },
  set: { word: 'set', lemma: 'set', translation: '設定 / 校定', partOfSpeech: 'v./n.', ipa: '/set/', taiwanPhonetic: '【 塞-特 】', mandarinPhonetic: '【 塞特 】', category: 'maintenance' },
  point: { word: 'point', lemma: 'point', translation: '座標點位 / 原點', partOfSpeech: 'n.', ipa: '/pɔɪnt/', taiwanPhonetic: '【 珀-因-特 】', mandarinPhonetic: '【 珀因特 】', category: 'equipment' },
  dry: { word: 'dry', lemma: 'dry', translation: '乾式 / 乾燥', partOfSpeech: 'adj./v.', ipa: '/draɪ/', taiwanPhonetic: '【 抓-愛 】', mandarinPhonetic: '【 抓愛 】', category: 'equipment' },
  machine: { word: 'machine', lemma: 'machine', translation: '機台 / 設備', partOfSpeech: 'n.', ipa: '/məˈʃiːn/', taiwanPhonetic: '【 麼-許-恩 】', mandarinPhonetic: '【 麼許恩 】', category: 'equipment' },
  broken: { word: 'broken', lemma: 'break', translation: '損壞 / 故障', partOfSpeech: 'adj.', ipa: '/ˈbroʊ.kən/', taiwanPhonetic: '【 布-羅-肯 】', mandarinPhonetic: '【 布羅肯 】', category: 'maintenance' },
  wait: { word: 'wait', lemma: 'wait', translation: '等待 / 待命', partOfSpeech: 'v.', ipa: '/weɪt/', taiwanPhonetic: '【 威-特 】', mandarinPhonetic: '【 威特 】', category: 'general' },
  off: { word: 'off', lemma: 'off', translation: '關閉 / 切斷', partOfSpeech: 'adv./prep.', ipa: '/ɔːf/', taiwanPhonetic: '【 歐-夫 】', mandarinPhonetic: '【 歐夫 】', category: 'safety' },
  turn: { word: 'turn', lemma: 'turn', translation: '轉動 / 切換', partOfSpeech: 'v.', ipa: '/tɜːrn/', taiwanPhonetic: '【 特-恩 】', mandarinPhonetic: '【 特恩 】', category: 'maintenance' },
  down: { word: 'down', lemma: 'down', translation: '當機 / 停機下降', partOfSpeech: 'adj./adv.', ipa: '/daʊn/', taiwanPhonetic: '【 當 】', mandarinPhonetic: '【 當 】', category: 'maintenance' },
  safety: { word: 'safety', lemma: 'safety', translation: '工安 / 安全防護', partOfSpeech: 'n.', ipa: '/ˈseɪf.ti/', taiwanPhonetic: '【 塞-夫-替 】', mandarinPhonetic: '【 塞夫替 】', category: 'safety' },
  keep: { word: 'keep', lemma: 'keep', translation: '維持 / 保持', partOfSpeech: 'v.', ipa: '/kiːp/', taiwanPhonetic: '【 奇-普 】', mandarinPhonetic: '【 奇普 】', category: 'maintenance' },
  control: { word: 'control', lemma: 'control', translation: '控制 / 調控', partOfSpeech: 'v./n.', ipa: '/kənˈtroʊl/', taiwanPhonetic: '【 肯-綽 】', mandarinPhonetic: '【 肯綽 】', category: 'process' },
  degas: { word: 'degas', lemma: 'degas', translation: '除氣 / 預熱排氣', partOfSpeech: 'v.', ipa: '/diːˈɡæs/', taiwanPhonetic: '【 低-蓋-斯 】', mandarinPhonetic: '【 低蓋斯 】', category: 'process' },
  tilt: { word: 'tilt', lemma: 'tilt', translation: '傾斜度 / 傾角', partOfSpeech: 'n./v.', ipa: '/tɪlt/', taiwanPhonetic: '【 踢-歐-特 】', mandarinPhonetic: '【 踢歐特 】', category: 'equipment' },
  leakage: { word: 'leakage', lemma: 'leakage', translation: '洩漏量 / 滲漏', partOfSpeech: 'n.', ipa: '/ˈliː.kɪdʒ/', taiwanPhonetic: '【 莉-奇-居 】', mandarinPhonetic: '【 莉奇居 】', category: 'safety' },
  vibration: { word: 'vibration', lemma: 'vibration', translation: '震動 / 機械振動', partOfSpeech: 'n.', ipa: '/vaɪˈbreɪ.ʃən/', taiwanPhonetic: '【 歪-布-瑞-遜 】', mandarinPhonetic: '【 歪布瑞遜 】', category: 'maintenance' },
  threshold: { word: 'threshold', lemma: 'threshold', translation: '安全門檻值 / 閾值', partOfSpeech: 'n.', ipa: '/ˈθreʃ.hoʊld/', taiwanPhonetic: '【 斯-瑞-許-厚-德 】', mandarinPhonetic: '【 斯瑞許厚德 】', category: 'process' },
  conditioner: { word: 'conditioner', lemma: 'conditioner', translation: '研磨墊修整器', partOfSpeech: 'n.', ipa: '/kənˈdɪʃ.ən.ər/', taiwanPhonetic: '【 肯-低-宣-呢 】', mandarinPhonetic: '【 肯低宣呢 】', category: 'equipment' },
  viscosity: { word: 'viscosity', lemma: 'viscosity', translation: '研磨液黏度', partOfSpeech: 'n.', ipa: '/vɪsˈkɑː.sə.ti/', taiwanPhonetic: '【 微-斯-卡-斯-替 】', mandarinPhonetic: '【 微斯卡斯替 】', category: 'process' },
  chlorine: { word: 'chlorine', lemma: 'chlorine', translation: '氯氣 (蝕刻特氣)', partOfSpeech: 'n.', ipa: '/ˈklɔːr.iːn/', taiwanPhonetic: '【 克-羅-林 】', mandarinPhonetic: '【 克羅林 】', category: 'process' },
  etchant: { word: 'etchant', lemma: 'etchant', translation: '蝕刻氣體 / 蝕刻劑', partOfSpeech: 'n.', ipa: '/ˈetʃ.ənt/', taiwanPhonetic: '【 欸-取-恩-特 】', mandarinPhonetic: '【 欸取恩特 】', category: 'process' },
  reflected: { word: 'reflected', lemma: 'reflect', translation: '反射的 (反射功率)', partOfSpeech: 'adj.', ipa: '/rɪˈflek.tɪd/', taiwanPhonetic: '【 瑞-弗-雷-克-特 】', mandarinPhonetic: '【 瑞弗雷克特 】', category: 'process' },
  steady: { word: 'steady', lemma: 'steady', translation: '穩定持續', partOfSpeech: 'adj.', ipa: '/ˈsted.i/', taiwanPhonetic: '【 斯-泰-蒂 】', mandarinPhonetic: '【 斯泰蒂 】', category: 'process' },
  removal: { word: 'removal', lemma: 'removal', translation: '移除 / 磨除率', partOfSpeech: 'n.', ipa: '/rɪˈmuː.vəl/', taiwanPhonetic: '【 瑞-木-佛 】', mandarinPhonetic: '【 瑞木佛 】', category: 'process' },
    density: { word: 'density', lemma: 'density', translation: '電漿密度', partOfSpeech: 'n.', ipa: '/ˈden.sə.ti/', taiwanPhonetic: '【 丹-西-替 】', mandarinPhonetic: '【 丹西替 】', category: 'process' },
    bypass: { word: 'bypass', lemma: 'bypass', translation: '旁路 / 跳過互鎖', partOfSpeech: 'v./n.', ipa: '/ˈbaɪ.pæs/', taiwanPhonetic: '【 拜-帕-斯 】', mandarinPhonetic: '【 拜帕斯 】', category: 'safety' },
    number: { word: 'number', lemma: 'number', translation: '編號 / 號碼', partOfSpeech: 'n.', taiwanPhonetic: '【 難-伯 】', mandarinPhonetic: '【 難伯 】', category: 'general' },
    four: { word: 'four', lemma: 'four', translation: '四號 (4)', partOfSpeech: 'num.', taiwanPhonetic: '【 佛 】', mandarinPhonetic: '【 佛 】', category: 'general' },
    due: { word: 'due', lemma: 'due', translation: '由於 / 因為 (due to)', partOfSpeech: 'prep.', taiwanPhonetic: '【 丟 】', mandarinPhonetic: '【 丟 】', category: 'grammar' },
    b: { word: 'B', lemma: 'B', translation: 'B腔 / B區', partOfSpeech: 'n.', taiwanPhonetic: '【 比 】', mandarinPhonetic: '【 比 】', category: 'equipment' },
    arm: { word: 'arm', lemma: 'arm', translation: '機械手臂 (Robot Arm)', partOfSpeech: 'n.', taiwanPhonetic: '【 阿-姆 】', mandarinPhonetic: '【 阿姆 】', category: 'equipment' },
    encountered: { word: 'encountered', lemma: 'encounter', translation: '遭遇 / 發生異常', partOfSpeech: 'v.', taiwanPhonetic: '【 因-康-特-得 】', mandarinPhonetic: '【 因康特得 】', category: 'maintenance' },
    timeout: { word: 'timeout', lemma: 'timeout', translation: '逾時錯誤 (Timeout)', partOfSpeech: 'n.', taiwanPhonetic: '【 太-姆-奧-特 】', mandarinPhonetic: '【 太姆奧特 】', category: 'maintenance' },
    unloading: { word: 'unloading', lemma: 'unload', translation: '卸片 / 取片 (Unloading)', partOfSpeech: 'n./v.', taiwanPhonetic: '【 昂-樓-頂 】', mandarinPhonetic: '【 昂樓頂 】', category: 'process' },
    please: { word: 'please', lemma: 'please', translation: '請 (執行動作)', partOfSpeech: 'adv.', taiwanPhonetic: '【 普-利-斯 】', mandarinPhonetic: '【 普利斯 】', category: 'communication' },
    conditioning: { word: 'conditioning', lemma: 'condition', translation: '修整 / 活化 (Pad Conditioning)', partOfSpeech: 'n.', taiwanPhonetic: '【 肯-低-宣-寧 】', mandarinPhonetic: '【 肯低宣寧 】', category: 'process' },
    cmp: { word: 'CMP', lemma: 'CMP', translation: '化學機械研磨 (CMP)', partOfSpeech: 'n.', taiwanPhonetic: '【 西-艾姆-批 】', mandarinPhonetic: '【 西艾姆批 】', category: 'process' },
    complete: { word: 'complete', lemma: 'complete', translation: '完成 / 執行完畢', partOfSpeech: 'v./adj.', taiwanPhonetic: '【 肯-普-利-特 】', mandarinPhonetic: '【 肯普利特 】', category: 'maintenance' },
    source: { word: 'source', lemma: 'source', translation: '光源 / 射源 (EUV Source)', partOfSpeech: 'n.', taiwanPhonetic: '【 索-斯 】', mandarinPhonetic: '【 索斯 】', category: 'equipment' },
    replacement: { word: 'replacement', lemma: 'replacement', translation: '更換作業 / 替換品', partOfSpeech: 'n.', taiwanPhonetic: '【 瑞-普-雷-斯-門-特 】', mandarinPhonetic: '【 瑞普雷斯門特 】', category: 'maintenance' },
    perform: { word: 'perform', lemma: 'perform', translation: '執行 / 進行保養', partOfSpeech: 'v.', taiwanPhonetic: '【 珀-佛-姆 】', mandarinPhonetic: '【 珀佛姆 】', category: 'maintenance' },
    severe: { word: 'severe', lemma: 'severe', translation: '嚴重的 / 劇烈的', partOfSpeech: 'adj.', taiwanPhonetic: '【 瑟-維-爾 】', mandarinPhonetic: '【 瑟維爾 】', category: 'maintenance' },
    detected: { word: 'detected', lemma: 'detect', translation: '偵測到 / 檢出異常', partOfSpeech: 'v./adj.', taiwanPhonetic: '【 低-泰-克-特 】', mandarinPhonetic: '【 低泰克特 】', category: 'process' },
    edge: { word: 'edge', lemma: 'edge', translation: '晶圓邊緣 (Wafer Edge)', partOfSpeech: 'n.', taiwanPhonetic: '【 艾-居 】', mandarinPhonetic: '【 艾居 】', category: 'equipment' },
    requiring: { word: 'requiring', lemma: 'require', translation: '需要 / 要求立即處置', partOfSpeech: 'v.', taiwanPhonetic: '【 瑞-誇-爾-英 】', mandarinPhonetic: '【 瑞誇爾英 】', category: 'maintenance' },
    immediate: { word: 'immediate', lemma: 'immediate', translation: '立即的 / 緊急即刻', partOfSpeech: 'adj.', taiwanPhonetic: '【 伊-咪-低-額-特 】', mandarinPhonetic: '【 伊咪低額特 】', category: 'safety' },
    critical: { word: 'critical', lemma: 'critical', translation: '關鍵的 / 臨界重要', partOfSpeech: 'adj.', taiwanPhonetic: '【 克-瑞-提-口 】', mandarinPhonetic: '【 克瑞提口 】', category: 'process' },
    dimension: { word: 'dimension', lemma: 'dimension', translation: '線寬尺寸 (CD 值)', partOfSpeech: 'n.', taiwanPhonetic: '【 戴-門-遜 】', mandarinPhonetic: '【 戴門遜 】', category: 'process' },
    within: { word: 'within', lemma: 'within', translation: '在...範圍內', partOfSpeech: 'prep.', taiwanPhonetic: '【 威-斯-因 】', mandarinPhonetic: '【 威斯因 】', category: 'grammar' },
    tolerance: { word: 'tolerance', lemma: 'tolerance', translation: '公差範圍 / 容許度', partOfSpeech: 'n.', taiwanPhonetic: '【 塔-勒-倫-斯 】', mandarinPhonetic: '【 塔勒倫斯 】', category: 'process' },
    successfully: { word: 'successfully', lemma: 'successfully', translation: '成功順利地', partOfSpeech: 'adv.', taiwanPhonetic: '【 瑟-克-賽-斯-佛-利 】', mandarinPhonetic: '【 瑟克賽斯佛利 】', category: 'general' },
    passed: { word: 'passed', lemma: 'pass', translation: '通過測試 (Pass)', partOfSpeech: 'v./adj.', taiwanPhonetic: '【 派-斯-特 】', mandarinPhonetic: '【 派斯特 】', category: 'process' },
    dummy: { word: 'dummy', lemma: 'dummy', translation: '擋片 / 測試假晶圓 (Dummy Wafer)', partOfSpeech: 'n./adj.', taiwanPhonetic: '【 當-咪 】', mandarinPhonetic: '【 當咪 】', category: 'process' },
    qualification: { word: 'qualification', lemma: 'qualification', translation: '機台驗證 (Qual / 測機合格)', partOfSpeech: 'n.', taiwanPhonetic: '【 誇-利-費-凱-遜 】', mandarinPhonetic: '【 誇利費凱遜 】', category: 'process' },
    hydrogen: { word: 'hydrogen', lemma: 'hydrogen', translation: '氫氣 (H2 / 保護與清潔氣體)', partOfSpeech: 'n.', taiwanPhonetic: '【 嗨-卓-簡 】', mandarinPhonetic: '【 嗨卓簡 】', category: 'process' },
    vessel: { word: 'vessel', lemma: 'vessel', translation: '反應槽 / 真空腔容器 (Source Vessel)', partOfSpeech: 'n.', taiwanPhonetic: '【 維-索 】', mandarinPhonetic: '【 維索 】', category: 'equipment' },
    recalibrate: { word: 'recalibrate', lemma: 'recalibrate', translation: '重新校準 / 再次校正', partOfSpeech: 'v.', taiwanPhonetic: '【 瑞-卡-利-布-瑞-特 】', mandarinPhonetic: '【 瑞卡利布瑞特 】', category: 'maintenance' },
    co2: { word: 'CO2', lemma: 'CO2', translation: '二氧化碳雷射 (CO2 Laser)', partOfSpeech: 'n.', taiwanPhonetic: '【 西-歐-兔 】', mandarinPhonetic: '【 西歐兔 】', category: 'equipment' },
    pulse: { word: 'pulse', lemma: 'pulse', translation: '脈衝 / 雷射脈波', partOfSpeech: 'n.', taiwanPhonetic: '【 帕-歐-斯 】', mandarinPhonetic: '【 帕歐斯 】', category: 'process' },
    pellicle: { word: 'pellicle', lemma: 'pellicle', translation: '光罩保護膜 (Pellicle)', partOfSpeech: 'n.', taiwanPhonetic: '【 佩-利-口 】', mandarinPhonetic: '【 佩利口 】', category: 'equipment' },
    integrity: { word: 'integrity', lemma: 'integrity', translation: '完整性 / 無破損狀態', partOfSpeech: 'n.', taiwanPhonetic: '【 因-泰-格-瑞-替 】', mandarinPhonetic: '【 因泰格瑞替 】', category: 'process' },
    'zero-point': { word: 'zero-point', lemma: 'zero-point', translation: '零點基準 / 原點', partOfSpeech: 'n.', taiwanPhonetic: '【 茲-羅-珀-因-特 】', mandarinPhonetic: '【 茲羅珀因特 】', category: 'maintenance' },
    autofocus: { word: 'autofocus', lemma: 'autofocus', translation: '自動對焦系統', partOfSpeech: 'n.', taiwanPhonetic: '【 歐-透-佛-克-斯 】', mandarinPhonetic: '【 歐透佛克斯 】', category: 'equipment' },
    hello: { word: 'hello', lemma: 'hello', translation: '您好 (通報開場)', partOfSpeech: 'interj.', taiwanPhonetic: '【 哈-樓 】', mandarinPhonetic: '【 哈樓 】', category: 'communication' },
    aoi: { word: 'AOI', lemma: 'aoi', translation: '自動光學檢測系統', partOfSpeech: 'n.', kkPhonetic: '[͵e o ˋaɪ]', taiwanPhonetic: '【 欸-歐-愛 】', mandarinPhonetic: '【 欸歐愛 】', category: 'equipment' },
    tac: { word: 'TAC', lemma: 'TAC', translation: '技術支援中心', partOfSpeech: 'n.', taiwanPhonetic: '【 泰-克 】', mandarinPhonetic: '【 泰克 】', category: 'communication' },
    '102': { word: '102', lemma: '102', translation: '一百零二', partOfSpeech: 'num.', taiwanPhonetic: '【 一-零-二 】', mandarinPhonetic: '【 一零二 】', category: 'general' },
    unexpected: { word: 'unexpected', lemma: 'unexpected', translation: '非預期的 / 突發異常', partOfSpeech: 'adj.', taiwanPhonetic: '【 昂-伊-克-斯-佩-克-特 】', mandarinPhonetic: '【 昂伊克斯佩克特 】', category: 'maintenance' },
    drift: { word: 'drift', lemma: 'drift', translation: '漂移 / 數值偏移', partOfSpeech: 'n./v.', taiwanPhonetic: '【 追-夫-特 】', mandarinPhonetic: '【 追夫特 】', category: 'process' },
    exceeding: { word: 'exceeding', lemma: 'exceed', translation: '超過 / 超出規格上限', partOfSpeech: 'v.', taiwanPhonetic: '【 伊-克-西-頂 】', mandarinPhonetic: '【 伊克西頂 】', category: 'process' },
    five: { word: 'five', lemma: 'five', translation: '五', partOfSpeech: 'num.', taiwanPhonetic: '【 發-愛-夫 】', mandarinPhonetic: '【 發愛夫 】', category: 'general' },
    nanometers: { word: 'nanometers', lemma: 'nanometer', translation: '奈米', partOfSpeech: 'n.', taiwanPhonetic: '【 奈-諾-咪-特-斯 】', mandarinPhonetic: '【 奈諾咪特斯 】', category: 'process' },
    nanometer: { word: 'nanometer', lemma: 'nanometer', translation: '奈米', partOfSpeech: 'n.', taiwanPhonetic: '【 奈-諾-咪-特 】', mandarinPhonetic: '【 奈諾咪特 】', category: 'process' },
    layer: { word: 'layer', lemma: 'layer', translation: '製程層別 / 薄膜層', partOfSpeech: 'n.', taiwanPhonetic: '【 雷-爾 】', mandarinPhonetic: '【 雷爾 】', category: 'process' },
    exposure: { word: 'exposure', lemma: 'exposure', translation: '微影曝光', partOfSpeech: 'n.', taiwanPhonetic: '【 伊-克-斯-珀-決 】', mandarinPhonetic: '【 伊克斯珀決 】', category: 'process' },
    acknowledged: { word: 'acknowledged', lemma: 'acknowledge', translation: '已收到確認', partOfSpeech: 'v./adj.', taiwanPhonetic: '【 額-克-諾-利-居-得 】', mandarinPhonetic: '【 額克諾利居得 】', category: 'communication' },
    dump: { word: 'dump', lemma: 'dump', translation: '傾印匯出', partOfSpeech: 'v./n.', taiwanPhonetic: '【 當-普 】', mandarinPhonetic: '【 當普 】', category: 'maintenance' },
    interferometer: { word: 'interferometer', lemma: 'interferometer', translation: '雷射干涉儀', partOfSpeech: 'n.', taiwanPhonetic: '【 因-特-費-羅-咪-特 】', mandarinPhonetic: '【 因特費羅咪特 】', category: 'equipment' },
    if: { word: 'if', lemma: 'if', translation: '如果 / 是否', partOfSpeech: 'conj.', taiwanPhonetic: '【 伊-夫 】', mandarinPhonetic: '【 伊夫 】', category: 'grammar' },
    surface: { word: 'surface', lemma: 'surface', translation: '表面', partOfSpeech: 'n.', taiwanPhonetic: '【 瑟-費-斯 】', mandarinPhonetic: '【 瑟費斯 】', category: 'equipment' },
    any: { word: 'any', lemma: 'any', translation: '任何', partOfSpeech: 'det.', taiwanPhonetic: '【 艾-尼 】', mandarinPhonetic: '【 艾尼 】', category: 'grammar' },
    thermal: { word: 'thermal', lemma: 'thermal', translation: '熱能的 / 溫度的', partOfSpeech: 'adj.', taiwanPhonetic: '【 瑟-摸 】', mandarinPhonetic: '【 瑟摩 】', category: 'process' },
    distortion: { word: 'distortion', lemma: 'distortion', translation: '變形 / 熱像差失真', partOfSpeech: 'n.', taiwanPhonetic: '【 迪-斯-托-遜 】', mandarinPhonetic: '【 迪斯托遜 】', category: 'process' },
    been: { word: 'been', lemma: 'be', translation: '已經', partOfSpeech: 'v.', taiwanPhonetic: '【 賓 】', mandarinPhonetic: '【 賓 】', category: 'grammar' },
    portal: { word: 'portal', lemma: 'portal', translation: '系統入口網站', partOfSpeech: 'n.', taiwanPhonetic: '【 珀-透 】', mandarinPhonetic: '【 珀透 】', category: 'communication' },
    capacitor: { word: 'capacitor', lemma: 'capacitor', translation: '電容器 / 可變電容', partOfSpeech: 'n.', taiwanPhonetic: '【 卡-派-西-特 】', mandarinPhonetic: '【 卡派西特 】', category: 'equipment' },
    coaxial: { word: 'coaxial', lemma: 'coaxial', translation: '同軸的', partOfSpeech: 'adj.', taiwanPhonetic: '【 扣-艾-克-西-歐 】', mandarinPhonetic: '【 扣艾克西歐 】', category: 'equipment' },
    impedance: { word: 'impedance', lemma: 'impedance', translation: '阻抗', partOfSpeech: 'n.', taiwanPhonetic: '【 因-批-登-斯 】', mandarinPhonetic: '【 因批登斯 】', category: 'process' },
    mismatch: { word: 'mismatch', lemma: 'mismatch', translation: '不匹配 / 失配異常', partOfSpeech: 'n.', taiwanPhonetic: '【 咪-斯-賣-取 】', mandarinPhonetic: '【 咪斯麥奇 】', category: 'maintenance' },
    window: { word: 'window', lemma: 'window', translation: '視窗 / 石英觀測窗', partOfSpeech: 'n.', taiwanPhonetic: '【 溫-豆 】', mandarinPhonetic: '【 溫豆 】', category: 'equipment' },
    transparency: { word: 'transparency', lemma: 'transparency', translation: '透光度 / 透明度', partOfSpeech: 'n.', taiwanPhonetic: '【 穿-斯-佩-倫-西 】', mandarinPhonetic: '【 穿斯佩倫西 】', category: 'process' },
    'polymer-coated': { word: 'polymer-coated', lemma: 'polymer-coated', translation: '被高分子聚合物附著覆蓋的', partOfSpeech: 'adj.', taiwanPhonetic: '【 帕-利-麼-扣-特 】', mandarinPhonetic: '【 帕利麼扣特 】', category: 'process' },
    quartz: { word: 'quartz', lemma: 'quartz', translation: '石英', partOfSpeech: 'n.', taiwanPhonetic: '【 誇-茲 】', mandarinPhonetic: '【 誇茲 】', category: 'equipment' },
    viewing: { word: 'viewing', lemma: 'view', translation: '觀測 / 監看用', partOfSpeech: 'n./adj.', taiwanPhonetic: '【 菲-優-英 】', mandarinPhonetic: '【 菲優英 】', category: 'equipment' },
    etcher: { word: 'etcher', lemma: 'etcher', translation: '電漿蝕刻機台', partOfSpeech: 'n.', taiwanPhonetic: '【 艾-雀 】', mandarinPhonetic: '【 艾雀 】', category: 'equipment' },
    hotline: { word: 'hotline', lemma: 'hotline', translation: '緊急技術熱線', partOfSpeech: 'n.', taiwanPhonetic: '【 哈-特-賴-恩 】', mandarinPhonetic: '【 哈特賴恩 】', category: 'communication' },
    c: { word: 'C', lemma: 'C', translation: '反應腔區', partOfSpeech: 'n.', taiwanPhonetic: '【 西 】', mandarinPhonetic: '【 西 】', category: 'equipment' },
    suffered: { word: 'suffered', lemma: 'suffer', translation: '發生 / 遭遇', partOfSpeech: 'v.', taiwanPhonetic: '【 薩-弗-得 】', mandarinPhonetic: '【 薩弗得 】', category: 'maintenance' },
    strike: { word: 'strike', lemma: 'strike', translation: '點火激發', partOfSpeech: 'n./v.', taiwanPhonetic: '【 斯-踹-克 】', mandarinPhonetic: '【 斯踹克 】', category: 'process' },
    failure: { word: 'failure', lemma: 'failure', translation: '失敗 / 故障異常', partOfSpeech: 'n.', taiwanPhonetic: '【 費-歐-爾 】', mandarinPhonetic: '【 費歐爾 】', category: 'maintenance' },
    sf6: { word: 'SF6', lemma: 'SF6', translation: '六氟化硫', partOfSpeech: 'n.', taiwanPhonetic: '【 艾斯-艾夫-六 】', mandarinPhonetic: '【 艾斯艾夫六 】', category: 'process' },
    ignition: { word: 'ignition', lemma: 'ignition', translation: '點火 / 電漿激發', partOfSpeech: 'n.', taiwanPhonetic: '【 伊-格-尼-遜 】', mandarinPhonetic: '【 伊格尼遜 】', category: 'process' },
    turbo: { word: 'turbo', lemma: 'turbo', translation: '渦輪分子幫浦', partOfSpeech: 'n.', taiwanPhonetic: '【 特-波 】', mandarinPhonetic: '【 特波 】', category: 'equipment' },
    angle: { word: 'angle', lemma: 'angle', translation: '角度 / 開度', partOfSpeech: 'n.', taiwanPhonetic: '【 安-苟 】', mandarinPhonetic: '【 安苟 】', category: 'process' },
    ensure: { word: 'ensure', lemma: 'ensure', translation: '確保 / 確認達成', partOfSpeech: 'v.', taiwanPhonetic: '【 因-許-爾 】', mandarinPhonetic: '【 因許爾 】', category: 'safety' },
    base: { word: 'base', lemma: 'base', translation: '基礎 / 背景底壓', partOfSpeech: 'n.', taiwanPhonetic: '【 貝-斯 】', mandarinPhonetic: '【 貝斯 】', category: 'process' },
    '10': { word: '10', lemma: '10', translation: '十', partOfSpeech: 'num.', taiwanPhonetic: '【 騰 】', mandarinPhonetic: '【 騰 】', category: 'general' },
    millitorr: { word: 'millitorr', lemma: 'millitorr', translation: '毫托', partOfSpeech: 'n.', taiwanPhonetic: '【 咪-利-托-爾 】', mandarinPhonetic: '【 咪利托爾 】', category: 'process' },
    nominal: { word: 'nominal', lemma: 'nominal', translation: '標稱正常的 / 額定規格內', partOfSpeech: 'adj.', taiwanPhonetic: '【 諾-咪-農 】', mandarinPhonetic: '【 諾咪農 】', category: 'process' },
    proceed: { word: 'proceed', lemma: 'proceed', translation: '繼續進行 / 接續執行', partOfSpeech: 'v.', taiwanPhonetic: '【 普-羅-西-得 】', mandarinPhonetic: '【 普羅西得 】', category: 'maintenance' },
    forward: { word: 'forward', lemma: 'forward', translation: '順向 / 入射功率', partOfSpeech: 'adj./adv.', taiwanPhonetic: '【 佛-沃-德 】', mandarinPhonetic: '【 佛沃德 】', category: 'process' },
    pneumatic: { word: 'pneumatic', lemma: 'pneumatic', translation: '氣動式的', partOfSpeech: 'adj.', taiwanPhonetic: '【 紐-賣-提-克 】', mandarinPhonetic: '【 紐麥提克 】', category: 'equipment' },
    zones: { word: 'zones', lemma: 'zone', translation: '區域 / 獨立溫控或氣壓分區', partOfSpeech: 'n.', taiwanPhonetic: '【 縱-斯 】', mandarinPhonetic: '【 縱斯 】', category: 'equipment' },
    zone: { word: 'zone', lemma: 'zone', translation: '區域 / 分區', partOfSpeech: 'n.', taiwanPhonetic: '【 縱 】', mandarinPhonetic: '【 縱 】', category: 'equipment' },
    retention: { word: 'retention', lemma: 'retention', translation: '保持 / 固定環', partOfSpeech: 'n.', taiwanPhonetic: '【 瑞-騰-遜 】', mandarinPhonetic: '【 瑞騰遜 】', category: 'equipment' },
    ring: { word: 'ring', lemma: 'ring', translation: '環件 / 聚焦環或固定環', partOfSpeech: 'n.', taiwanPhonetic: '【 瑞-英 】', mandarinPhonetic: '【 瑞英 】', category: 'equipment' },
    wear: { word: 'wear', lemma: 'wear', translation: '磨耗 / 耗損量', partOfSpeech: 'n./v.', taiwanPhonetic: '【 威-爾 】', mandarinPhonetic: '【 威爾 】', category: 'maintenance' },
    cathode: { word: 'cathode', lemma: 'cathode', translation: '陰極 / 濺鍍靶材陰極座', partOfSpeech: 'n.', taiwanPhonetic: '【 卡-索-德 】', mandarinPhonetic: '【 卡索德 】', category: 'equipment' },
    magnet: { word: 'magnet', lemma: 'magnet', translation: '磁鐵組', partOfSpeech: 'n.', taiwanPhonetic: '【 賣-格-內-特 】', mandarinPhonetic: '【 麥格內特 】', category: 'equipment' },
    rotation: { word: 'rotation', lemma: 'rotation', translation: '旋轉運作', partOfSpeech: 'n.', taiwanPhonetic: '【 羅-泰-遜 】', mandarinPhonetic: '【 羅泰遜 】', category: 'equipment' },
    mechanism: { word: 'mechanism', lemma: 'mechanism', translation: '機構 / 機械傳動裝置', partOfSpeech: 'n.', taiwanPhonetic: '【 賣-肯-尼-茲-姆 】', mandarinPhonetic: '【 麥肯尼茲姆 】', category: 'equipment' },
    remaining: { word: 'remaining', lemma: 'remain', translation: '剩餘的', partOfSpeech: 'adj.', taiwanPhonetic: '【 瑞-妹-寧 】', mandarinPhonetic: '【 瑞妹寧 】', category: 'maintenance' },
    target: { word: 'target', lemma: 'target', translation: '金屬靶材 / 目標值', partOfSpeech: 'n.', taiwanPhonetic: '【 塔-給-特 】', mandarinPhonetic: '【 塔給特 】', category: 'equipment' },
    erosion: { word: 'erosion', lemma: 'erosion', translation: '侵蝕 / 靶材轟擊消耗溝槽', partOfSpeech: 'n.', taiwanPhonetic: '【 伊-羅-遜 】', mandarinPhonetic: '【 伊羅遜 】', category: 'process' },
    depth: { word: 'depth', lemma: 'depth', translation: '深度', partOfSpeech: 'n.', taiwanPhonetic: '【 戴-普-斯 】', mandarinPhonetic: '【 戴普斯 】', category: 'process' },
    deposition: { word: 'deposition', lemma: 'deposition', translation: '薄膜沉積製程', partOfSpeech: 'n.', taiwanPhonetic: '【 戴-珀-茲-遜 】', mandarinPhonetic: '【 戴珀茲遜 】', category: 'process' },
    support: { word: 'support', lemma: 'support', translation: '技術支援', partOfSpeech: 'n./v.', taiwanPhonetic: '【 瑟-珀-特 】', mandarinPhonetic: '【 瑟珀特 】', category: 'communication' },
    our: { word: 'our', lemma: 'our', translation: '我們的', partOfSpeech: 'pron.', taiwanPhonetic: '【 奧-爾 】', mandarinPhonetic: '【 奧爾 】', category: 'grammar' },
    polisher: { word: 'polisher', lemma: 'polisher', translation: '化學機械研磨機台', partOfSpeech: 'n.', taiwanPhonetic: '【 帕-利-許-爾 】', mandarinPhonetic: '【 帕利許爾 】', category: 'equipment' },
    shows: { word: 'shows', lemma: 'show', translation: '顯示出 / 呈現', partOfSpeech: 'v.', taiwanPhonetic: '【 秀-斯 】', mandarinPhonetic: '【 秀斯 】', category: 'general' },
    delivery: { word: 'delivery', lemma: 'delivery', translation: '輸送 / 供液傳送', partOfSpeech: 'n.', taiwanPhonetic: '【 迪-利-弗-瑞 】', mandarinPhonetic: '【 迪利弗瑞 】', category: 'process' },
    instability: { word: 'instability', lemma: 'instability', translation: '不穩定現象 / 波動異常', partOfSpeech: 'n.', taiwanPhonetic: '【 因-斯-特-比-利-替 】', mandarinPhonetic: '【 因斯特比利替 】', category: 'process' },
    copper: { word: 'copper', lemma: 'copper', translation: '銅製程 / 銅導線', partOfSpeech: 'n.', taiwanPhonetic: '【 卡-珀 】', mandarinPhonetic: '【 卡珀 】', category: 'process' },
    polishing: { word: 'polishing', lemma: 'polish', translation: '化學機械研磨拋光', partOfSpeech: 'n./v.', taiwanPhonetic: '【 帕-利-許-英 】', mandarinPhonetic: '【 帕利許英 】', category: 'process' },
    peristaltic: { word: 'peristaltic', lemma: 'peristaltic', translation: '蠕動式的', partOfSpeech: 'adj.', taiwanPhonetic: '【 佩-瑞-斯-塔-提-克 】', mandarinPhonetic: '【 佩瑞斯塔提克 】', category: 'equipment' },
    loop: { word: 'loop', lemma: 'loop', translation: '迴路 / 循環管路', partOfSpeech: 'n.', taiwanPhonetic: '【 露-普 】', mandarinPhonetic: '【 露普 】', category: 'equipment' },
    backpressure: { word: 'backpressure', lemma: 'backpressure', translation: '背壓', partOfSpeech: 'n.', taiwanPhonetic: '【 貝-克-普-瑞-許 】', mandarinPhonetic: '【 貝克普瑞許 】', category: 'process' },
    understood: { word: 'understood', lemma: 'understand', translation: '了解 / 收到明白', partOfSpeech: 'v./adj.', taiwanPhonetic: '【 昂-德-斯-兔-德 】', mandarinPhonetic: '【 安德斯兔德 】', category: 'communication' },
    disposable: { word: 'disposable', lemma: 'disposable', translation: '拋棄式耗材的', partOfSpeech: 'adj.', taiwanPhonetic: '【 迪-斯-珀-茲-伯 】', mandarinPhonetic: '【 迪斯珀茲伯 】', category: 'equipment' },
    're-verifying': { word: 're-verifying', lemma: 're-verify', translation: '重新驗證確認', partOfSpeech: 'v.', taiwanPhonetic: '【 瑞-維-瑞-發-英 】', mandarinPhonetic: '【 瑞維瑞發英 】', category: 'maintenance' },
    meter: { word: 'meter', lemma: 'meter', translation: '計量錶 / 流量計', partOfSpeech: 'n.', taiwanPhonetic: '【 咪-特 】', mandarinPhonetic: '【 咪特 】', category: 'equipment' },
    volumetric: { word: 'volumetric', lemma: 'volumetric', translation: '體積流量的 / 容積式', partOfSpeech: 'adj.', taiwanPhonetic: '【 發-琉-賣-翠-克 】', mandarinPhonetic: '【 發琉麥翠克 】', category: 'process' },
    output: { word: 'output', lemma: 'output', translation: '輸出量 / 供應輸出', partOfSpeech: 'n.', taiwanPhonetic: '【 奧-特-普-特 】', mandarinPhonetic: '【 奧特普特 】', category: 'process' },
    backside: { word: 'backside', lemma: 'backside', translation: '晶圓背面', partOfSpeech: 'n.', taiwanPhonetic: '【 貝-克-賽-德 】', mandarinPhonetic: '【 貝克賽德 】', category: 'equipment' },
    contact: { word: 'contact', lemma: 'contact', translation: '接觸 / 電極接觸點', partOfSpeech: 'n./v.', taiwanPhonetic: '【 康-泰-克-特 】', mandarinPhonetic: '【 康泰克特 】', category: 'equipment' },
    pins: { word: 'pins', lemma: 'pin', translation: '頂針 / 定位支撐針', partOfSpeech: 'n.', taiwanPhonetic: '【 拼-斯 】', mandarinPhonetic: '【 拼斯 】', category: 'equipment' },
    pin: { word: 'pin', lemma: 'pin', translation: '頂針 / 插銷', partOfSpeech: 'n.', taiwanPhonetic: '【 拼 】', mandarinPhonetic: '【 拼 】', category: 'equipment' },
    pinhole: { word: 'pinhole', lemma: 'pinhole', translation: '針孔缺陷', partOfSpeech: 'n.', taiwanPhonetic: '【 拼-厚 】', mandarinPhonetic: '【 拼厚 】', category: 'process' },
    're-index': { word: 're-index', lemma: 're-index', translation: '重新定位索引', partOfSpeech: 'v.', taiwanPhonetic: '【 瑞-因-戴-克-斯 】', mandarinPhonetic: '【 瑞因戴克斯 】', category: 'maintenance' },
    cluster: { word: 'cluster', lemma: 'cluster', translation: '叢集 / 群聚性缺陷', partOfSpeech: 'n.', taiwanPhonetic: '【 克-拉-斯-特 】', mandarinPhonetic: '【 克拉斯特 】', category: 'process' },
    library: { word: 'library', lemma: 'library', translation: '資料庫 / 圖庫', partOfSpeech: 'n.', taiwanPhonetic: '【 賴-布-瑞-瑞 】', mandarinPhonetic: '【 賴布瑞瑞 】', category: 'equipment' },
    restart: { word: 'restart', lemma: 'restart', translation: '重新啟動', partOfSpeech: 'v.', taiwanPhonetic: '【 瑞-斯-塔-特 】', mandarinPhonetic: '【 瑞斯塔特 】', category: 'maintenance' },
    image: { word: 'image', lemma: 'image', translation: '影像 / 光學掃描圖像', partOfSpeech: 'n.', taiwanPhonetic: '【 伊-咪-居 】', mandarinPhonetic: '【 伊咪居 】', category: 'process' },
    server: { word: 'server', lemma: 'server', translation: '伺服器 / 運算主機', partOfSpeech: 'n.', taiwanPhonetic: '【 瑟-弗 】', mandarinPhonetic: '【 瑟弗 】', category: 'equipment' },
    metrology: { word: 'metrology', lemma: 'metrology', translation: '精密量測與檢測系統', partOfSpeech: 'n.', taiwanPhonetic: '【 賣-抓-勒-居 】', mandarinPhonetic: '【 麥抓勒居 】', category: 'equipment' },
    engineer: { word: 'engineer', lemma: 'engineer', translation: '工程師', partOfSpeech: 'n.', taiwanPhonetic: '【 恩-居-尼-爾 】', mandarinPhonetic: '【 恩居尼爾 】', category: 'general' },
    observed: { word: 'observed', lemma: 'observe', translation: '觀測到 / 發現', partOfSpeech: 'v.', taiwanPhonetic: '【 歐-伯-茲-弗-得 】', mandarinPhonetic: '【 歐伯茲弗得 】', category: 'process' },
    false: { word: 'false', lemma: 'false', translation: '誤判的 / 假警報', partOfSpeech: 'adj.', taiwanPhonetic: '【 佛-歐-斯 】', mandarinPhonetic: '【 佛歐斯 】', category: 'process' },
    repeating: { word: 'repeating', lemma: 'repeat', translation: '重複性的', partOfSpeech: 'adj.', taiwanPhonetic: '【 瑞-批-廷 】', mandarinPhonetic: '【 瑞批廷 】', category: 'process' },
    killer: { word: 'killer', lemma: 'killer', translation: '致命的', partOfSpeech: 'adj./n.', taiwanPhonetic: '【 奇-勒 】', mandarinPhonetic: '【 奇勒 】', category: 'process' },
    '489': { word: '489', lemma: '489', translation: '四百八十九', partOfSpeech: 'num.', taiwanPhonetic: '【 四-八-九 】', mandarinPhonetic: '【 四八九 】', category: 'general' },
    review: { word: 'review', lemma: 'review', translation: '複檢 / 影像複查 (SEM Review)', partOfSpeech: 'n./v.', taiwanPhonetic: '【 瑞-菲-優 】', mandarinPhonetic: '【 瑞菲優 】', category: 'process' },
    sensitivity: { word: 'sensitivity', lemma: 'sensitivity', translation: '靈敏度 (檢出靈敏度)', partOfSpeech: 'n.', taiwanPhonetic: '【 森-西-替-維-替 】', mandarinPhonetic: '【 森西替維替 】', category: 'process' },
    inspector: { word: 'inspector', lemma: 'inspector', translation: '檢測機台 (Inspector)', partOfSpeech: 'n.', taiwanPhonetic: '【 因-斯-佩-克-特 】', mandarinPhonetic: '【 因斯佩克特 】', category: 'equipment' },
    darkfield: { word: 'darkfield', lemma: 'darkfield', translation: '暗視野光學模式 (Darkfield)', partOfSpeech: 'n./adj.', taiwanPhonetic: '【 達-克-費-歐-德 】', mandarinPhonetic: '【 達克費歐德 】', category: 'process' },
    balance: { word: 'balance', lemma: 'balance', translation: '平衡狀態', partOfSpeech: 'n./v.', taiwanPhonetic: '【 巴-倫-斯 】', mandarinPhonetic: '【 巴倫斯 】', category: 'process' },
    dropped: { word: 'dropped', lemma: 'drop', translation: '下降 / 掉壓', partOfSpeech: 'v.', taiwanPhonetic: '【 抓-普-特 】', mandarinPhonetic: '【 抓普特 】', category: 'process' },
    factory: { word: 'factory', lemma: 'factory', translation: '出廠預設值 / 晶圓廠', partOfSpeech: 'n.', taiwanPhonetic: '【 費-克-特-瑞 】', mandarinPhonetic: '【 費克特瑞 】', category: 'general' },
    baseline: { word: 'baseline', lemma: 'baseline', translation: '基準線 / 標準基線 (Baseline)', partOfSpeech: 'n.', taiwanPhonetic: '【 貝-斯-賴-恩 】', mandarinPhonetic: '【 貝斯賴恩 】', category: 'process' },
    standards: { word: 'standards', lemma: 'standard', translation: '標準規範 (Standards)', partOfSpeech: 'n.', taiwanPhonetic: '【 斯-坦-德-茲 】', mandarinPhonetic: '【 斯坦德茲 】', category: 'process' },
    standard: { word: 'standard', lemma: 'standard', translation: '標準 / 規範', partOfSpeech: 'n./adj.', taiwanPhonetic: '【 斯-坦-德 】', mandarinPhonetic: '【 斯坦德 】', category: 'process' },
    here: { word: 'here', lemma: 'here', translation: '這裡 / 本站', partOfSpeech: 'adv.', taiwanPhonetic: '【 希-爾 】', mandarinPhonetic: '【 希爾 】', category: 'general' },
    track: { word: 'track', lemma: 'track', translation: '光阻塗佈顯影機 (Track) / 軌道', partOfSpeech: 'n./v.', taiwanPhonetic: '【 踹-克 】', mandarinPhonetic: '【 踹克 】', category: 'equipment' },
    finish: { word: 'finish', lemma: 'finish', translation: '完成 / 結束製程', partOfSpeech: 'v./n.', taiwanPhonetic: '【 費-尼-許 】', mandarinPhonetic: '【 費尼許 】', category: 'general' },
    mfc: { word: 'MFC', lemma: 'MFC', translation: '質量流量控制器 (Mass Flow Controller)', partOfSpeech: 'n.', taiwanPhonetic: '【 艾姆-艾夫-西 】', mandarinPhonetic: '【 艾姆艾夫西 】', category: 'equipment' },
    oht: { word: 'OHT', lemma: 'OHT', translation: '天車自動搬運系統 (Overhead Hoist Transport)', partOfSpeech: 'n.', taiwanPhonetic: '【 歐-艾奇-替 】', mandarinPhonetic: '【 歐艾奇替 】', category: 'equipment' },
    vehicle: { word: 'vehicle', lemma: 'vehicle', translation: '天車載具 / 搬運車 (OHT Vehicle)', partOfSpeech: 'n.', taiwanPhonetic: '【 維-伊-口 】', mandarinPhonetic: '【 維伊口 】', category: 'equipment' },
    docks: { word: 'docks', lemma: 'dock', translation: '靠站對接 (Docking)', partOfSpeech: 'v.', taiwanPhonetic: '【 達-克-斯 】', mandarinPhonetic: '【 達克斯 】', category: 'equipment' },
    dock: { word: 'dock', lemma: 'dock', translation: '對接靠站 (Dock)', partOfSpeech: 'v./n.', taiwanPhonetic: '【 達-克 】', mandarinPhonetic: '【 達克 】', category: 'equipment' },
    esc: { word: 'ESC', lemma: 'ESC', translation: '靜電吸盤', partOfSpeech: 'n.', taiwanPhonetic: '【 伊-艾斯-西 】', mandarinPhonetic: '【 伊艾斯西 】', category: 'equipment' },
    requests: { word: 'requests', lemma: 'request', translation: '要求 / 請領請求', partOfSpeech: 'v./n.', taiwanPhonetic: '【 瑞-奎-斯-特-斯 】', mandarinPhonetic: '【 瑞奎斯特斯 】', category: 'communication' },
    request: { word: 'request', lemma: 'request', translation: '要求 / 申請', partOfSpeech: 'v./n.', taiwanPhonetic: '【 瑞-奎-斯-特 】', mandarinPhonetic: '【 瑞奎斯特 】', category: 'communication' },
    diamond: { word: 'diamond', lemma: 'diamond', translation: '金剛石修整碟', partOfSpeech: 'n.', taiwanPhonetic: '【 戴-門-德 】', mandarinPhonetic: '【 戴門德 】', category: 'equipment' },
    thermocouple: { word: 'thermocouple', lemma: 'thermocouple', translation: '熱電偶溫度感測器', partOfSpeech: 'n.', taiwanPhonetic: '【 瑟-摩-卡-婆 】', mandarinPhonetic: '【 瑟摩卡婆 】', category: 'equipment' },
    capacitance: { word: 'capacitance', lemma: 'capacitance', translation: '電容式', partOfSpeech: 'n.', taiwanPhonetic: '【 卡-派-西-騰-斯 】', mandarinPhonetic: '【 卡派西騰斯 】', category: 'equipment' },
    manometer: { word: 'manometer', lemma: 'manometer', translation: '薄膜真空壓力計', partOfSpeech: 'n.', taiwanPhonetic: '【 曼-諾-咪-特 】', mandarinPhonetic: '【 曼諾咪特 】', category: 'equipment' },
    flexible: { word: 'flexible', lemma: 'flexible', translation: '撓性的 / 可彎曲彈性的', partOfSpeech: 'adj.', taiwanPhonetic: '【 佛-雷-克-西-伯 】', mandarinPhonetic: '【 佛雷克西伯 】', category: 'equipment' },
    metal: { word: 'metal', lemma: 'metal', translation: '金屬 / 金屬製程', partOfSpeech: 'n.', taiwanPhonetic: '【 賣-頭 】', mandarinPhonetic: '【 麥頭 】', category: 'process' },
    bellows: { word: 'bellows', lemma: 'bellows', translation: '真空波紋管 / 伸縮囊', partOfSpeech: 'n.', kkPhonetic: '[ˋbɛloz]', taiwanPhonetic: '【 貝-樓-斯 】', mandarinPhonetic: '【 貝樓斯 】', category: 'equipment' },
    spins: { word: 'spins', lemma: 'spin', translation: '高速旋轉', partOfSpeech: 'v.', kkPhonetic: '[spɪnz]', taiwanPhonetic: '【 斯-拼-斯 】', mandarinPhonetic: '【 斯拼斯 】', category: 'process' },
    spin: { word: 'spin', lemma: 'spin', translation: '旋轉塗佈 / 自轉', partOfSpeech: 'v./n.', kkPhonetic: '[spɪn]', taiwanPhonetic: '【 斯-拼 】', mandarinPhonetic: '【 斯拼 】', category: 'process' },
    // === AOI 光學檢測設備專用詞彙 ===
    die: { word: 'die', lemma: 'die', translation: '晶粒 / 裸晶', partOfSpeech: 'n.', kkPhonetic: '[daɪ]', ipa: '/daɪ/', syllables: 'die', taiwanPhonetic: '【 戴 】', mandarinPhonetic: '【 戴 】', cleanroomContext: '晶圓切割或封裝基板上的單顆晶粒，AOI 會逐顆進行視覺檢測。', memoryTrick: '「戴」在基板上的核心小晶粒！', category: 'process' },
    dies: { word: 'dies', lemma: 'die', translation: '複數晶粒', partOfSpeech: 'n.', kkPhonetic: '[daɪz]', ipa: '/daɪz/', syllables: 'dies', taiwanPhonetic: '【 戴-茲 】', mandarinPhonetic: '【 戴茲 】', cleanroomContext: '封裝基板上的多顆晶粒 (Couple Die)。', category: 'process' },
    jump: { word: 'jump', lemma: 'jump', translation: '跳過 / 跳晶', partOfSpeech: 'n./v.', kkPhonetic: '[dʒʌmp]', ipa: '/dʒʌmp/', syllables: 'jump', taiwanPhonetic: '【 醬-普 】', mandarinPhonetic: '【 醬普 】', cleanroomContext: 'AOI 跳晶檢測或 Die Jump Sensor 跳晶高度感測。', memoryTrick: '鏡頭「醬普」跳過指定空位！', category: 'process' },
    jig: { word: 'JIG', lemma: 'jig', translation: '定位治具 / 校準治具板', partOfSpeech: 'n.', kkPhonetic: '[dʒɪg]', ipa: '/dʒɪɡ/', syllables: 'jig', taiwanPhonetic: '【 居-格 】', mandarinPhonetic: '【 吉格 】', cleanroomContext: 'AOI JIG Board 定位治具板，用於校正鏡頭對焦與座標基準。', memoryTrick: '「吉格」治具把基板夾得整整齊齊！', category: 'equipment' },
    tuning: { word: 'tuning', lemma: 'tune', translation: '調校 / 調整光源', partOfSpeech: 'n./v.', kkPhonetic: '[ˋtunɪŋ]', ipa: '/ˈtuː.nɪŋ/', syllables: 'tu·ning', taiwanPhonetic: '【 吐-寧 】', mandarinPhonetic: '【 圖寧 】', cleanroomContext: 'AOI Tuning Light 調整同軸光與環形光亮度對比。', memoryTrick: '「圖寧」把光源調到最清晰安「寧」！', category: 'maintenance' },
    layout: { word: 'layout', lemma: 'layout', translation: '模板 / 晶粒排列圖', partOfSpeech: 'n.', kkPhonetic: '[ˋle͵aʊt]', ipa: '/ˈleɪ.aʊt/', syllables: 'lay·out', taiwanPhonetic: '【 雷-奧-特 】', mandarinPhonetic: '【 雷奧特 】', cleanroomContext: 'AOI 畫面上的基板晶粒矩陣排列模板配置與 Layout Transfer 模板轉換。', memoryTrick: '「雷奧特」把整片晶粒陣列鋪開排列！', category: 'process' },
    empty: { word: 'empty', lemma: 'empty', translation: '空的 / 無目標', partOfSpeech: 'adj.', kkPhonetic: '[ˋɛmptɪ]', ipa: '/ˈɛmp.ti/', syllables: 'emp·ty', taiwanPhonetic: '【 恩-普-替 】', mandarinPhonetic: '【 恩普替 】', cleanroomContext: 'Detect Empty 搜索無目標或空插槽偵測。', memoryTrick: '「恩普替」空空如也、沒有晶粒！', category: 'process' },
    '2d': { word: '2D', lemma: '2d', translation: '二維條碼', partOfSpeech: 'adj./n.', kkPhonetic: '[ˋtuˋdi]', ipa: '/ˌtuːˈdiː/', syllables: '2·D', taiwanPhonetic: '【 兔-迪 】', mandarinPhonetic: '【 兔迪 】', cleanroomContext: '基板邊緣雷射刻印的 2D Code 二維追溯條碼。', category: 'process' },
    substrate: { word: 'substrate', lemma: 'substrate', translation: '基板 / 載板', partOfSpeech: 'n.', kkPhonetic: '[ˋsʌbstret]', ipa: '/ˈsʌb.streɪt/', syllables: 'sub·strate', taiwanPhonetic: '【 薩-布-斯-翠-特 】', mandarinPhonetic: '【 薩布斯翠特 】', cleanroomContext: '承載晶粒與錫球的封裝基板，AOI 核心檢測對象。', memoryTrick: '「薩布斯翠特」是在底下承載晶片的「基板」！', category: 'process' },
    c4: { word: 'C4', lemma: 'c4', translation: '覆晶錫球 (C4 Bump)', partOfSpeech: 'n.', kkPhonetic: '[ˋsi ˋfor]', ipa: '/ˌsiːˈfɔːr/', syllables: 'C·4', taiwanPhonetic: '【 西-佛 】', mandarinPhonetic: '【 西佛 】', cleanroomContext: 'C4 Bump 覆晶控制塌陷晶片連接錫球。', category: 'process' },
    bump: { word: 'bump', lemma: 'bump', translation: '錫球 / 凸塊', partOfSpeech: 'n.', kkPhonetic: '[bʌmp]', ipa: '/bʌmp/', syllables: 'bump', taiwanPhonetic: '【 棒-普 】', mandarinPhonetic: '【 棒普 】', cleanroomContext: 'C4 Bump Inspection 錫球檢測，檢查高度、圓度與橋接短路。', memoryTrick: '一顆顆圓滾滾「棒普」凸起的錫球！', category: 'process' },
    bumps: { word: 'bumps', lemma: 'bump', translation: '錫球凸塊 (複數)', partOfSpeech: 'n.', kkPhonetic: '[bʌmps]', ipa: '/bʌmps/', syllables: 'bumps', taiwanPhonetic: '【 棒-普-斯 】', mandarinPhonetic: '【 棒普斯 】', cleanroomContext: 'C4 Bump Inspection 錫球檢測。', category: 'process' },
    couple: { word: 'couple', lemma: 'couple', translation: '複數 / 雙晶粒', partOfSpeech: 'n./adj.', kkPhonetic: '[ˋkʌp!]', ipa: '/ˈkʌp.əl/', syllables: 'cou·ple', taiwanPhonetic: '【 卡-婆 】', mandarinPhonetic: '【 卡婆 】', cleanroomContext: 'Couple Die Inspection 複數晶粒檢測，檢查多晶粒間距與偏移。', memoryTrick: '成雙成對的「卡婆」就是複數晶粒！', category: 'process' },
    ball: { word: 'ball', lemma: 'ball', translation: '錫球 / 焊球', partOfSpeech: 'n.', kkPhonetic: '[bɔl]', ipa: '/bɔːl/', syllables: 'ball', taiwanPhonetic: '【 博-歐 】', mandarinPhonetic: '【 博歐 】', cleanroomContext: 'BGA 封裝植球後的導電錫球，檢測是否缺球、橋接或大小異常。', category: 'process' },
    underfill: { word: 'underfill', lemma: 'underfill', translation: '底部填充膠 / 底膠', partOfSpeech: 'n.', kkPhonetic: '[ˋʌndɚ͵fɪl]', ipa: '/ˈʌn.dər.fɪl/', syllables: 'un·der·fill', taiwanPhonetic: '【 昂-德-費-歐 】', mandarinPhonetic: '【 安德菲爾 】', cleanroomContext: '點塗在覆晶晶粒底部的保護環氧樹脂底膠，AOI 檢查溢膠寬度與氣泡。', memoryTrick: '在晶片底下「昂德」填滿「菲爾」就是「底膠」！', category: 'process' },
    pc: { word: 'PC', lemma: 'pc', translation: '被動元件 (Passive Component)', partOfSpeech: 'n.', kkPhonetic: '[ˋpi ˋsi]', ipa: '/ˌpiːˈsiː/', syllables: 'P·C', taiwanPhonetic: '【 批-西 】', mandarinPhonetic: '【 批西 】', cleanroomContext: 'PC Inspection 被動元件檢測，檢查基板表面電容與電阻是否立碑或偏移。', category: 'process' },
    ocv: { word: 'OCV', lemma: 'ocv', translation: '光學字元檢測', partOfSpeech: 'n.', kkPhonetic: '[ˋo ˋsi ˋvi]', ipa: '/ˌoʊ.siːˈviː/', syllables: 'O·C·V', taiwanPhonetic: '【 歐-西-維 】', mandarinPhonetic: '【 歐西維 】', cleanroomContext: 'OCV Inspection 字元檢測，驗證表面印字是否清晰無缺漏。', category: 'process' },
    ocr: { word: 'OCR', lemma: 'ocr', translation: '光學字元辨識', partOfSpeech: 'n.', kkPhonetic: '[͵o si ˋɑr]', ipa: '/ˌoʊ.siːˈɑːr/', syllables: 'O·C·R', taiwanPhonetic: '【 歐-西-阿 】', mandarinPhonetic: '【 歐西阿 】', cleanroomContext: 'AOI 鏡頭自動讀取晶粒或基板上的雷射刻印序號字元。', category: 'process' },
    cu: { word: 'Cu', lemma: 'cu', translation: '銅 / 銅墊', partOfSpeech: 'n.', kkPhonetic: '[ˋkɑpɚ]', ipa: '/ˈkɑː.pər/', syllables: 'Cu', taiwanPhonetic: '【 卡-珀 】', mandarinPhonetic: '【 卡珀 】', cleanroomContext: '化學元素銅，Cu Pad 代表基板上的銅墊。', category: 'process' },
    plc: { word: 'PLC', lemma: 'plc', translation: '可程式控制器', partOfSpeech: 'n.', kkPhonetic: '[ˋpi ˋɛl ˋsi]', ipa: '/ˌpiː.ɛlˈsiː/', syllables: 'P·L·C', taiwanPhonetic: '【 批-艾歐-西 】', mandarinPhonetic: '【 批艾歐西 】', cleanroomContext: 'PLC Status 控制器通訊與感測器狀態。', category: 'equipment' },
    secs: { word: 'SECS', lemma: 'secs', translation: '半導體設備通訊協定', partOfSpeech: 'n.', kkPhonetic: '[sɛks]', ipa: '/sɛks/', syllables: 'SECS', taiwanPhonetic: '【 賽-克-斯 】', mandarinPhonetic: '【 賽克斯 】', cleanroomContext: 'SECS Log 機台與自動化主機通訊日誌。', category: 'communication' },
    sucker: { word: 'sucker', lemma: 'sucker', translation: '真空吸嘴', partOfSpeech: 'n.', kkPhonetic: '[ˋsʌkɚ]', ipa: '/ˈsʌk.ər/', syllables: 'suck·er', taiwanPhonetic: '【 薩-克 】', mandarinPhonetic: '【 薩克 】', cleanroomContext: 'Sucker Manager 真空吸嘴管理介面。', category: 'equipment' },
    viewer: { word: 'viewer', lemma: 'viewer', translation: '檢視器', partOfSpeech: 'n.', kkPhonetic: '[ˋvjuɚ]', ipa: '/ˈvjuː.ər/', syllables: 'view·er', taiwanPhonetic: '【 菲-優-爾 】', mandarinPhonetic: '【 菲優爾 】', cleanroomContext: 'Data Viewer 檢測資料與缺陷影像檢視器。', category: 'equipment' },
    sealer: { word: 'sealer', lemma: 'sealer', translation: '封合機 / 封裝膠條', partOfSpeech: 'n.', kkPhonetic: '[ˋsilɚ]', ipa: '/ˈsiː.lər/', syllables: 'sea·ler', taiwanPhonetic: '【 西-勒 】', mandarinPhonetic: '【 西勒 】', cleanroomContext: '保護環或封膠機構，AOI 檢查封膠連續性與裂紋。', category: 'equipment' },
    roller: { word: 'roller', lemma: 'roller', translation: '傳送滾輪', partOfSpeech: 'n.', kkPhonetic: '[ˋrolɚ]', ipa: '/ˈroʊ.lər/', syllables: 'rol·ler', taiwanPhonetic: '【 羅-勒 】', mandarinPhonetic: '【 羅勒 】', cleanroomContext: 'AOI 軌道傳送基板的滾輪機構，對應 Roller Log 滾輪傳動日誌。', category: 'equipment' },
    unload: { word: 'unload', lemma: 'unload', translation: '下料 / 卸載', partOfSpeech: 'v./n.', kkPhonetic: '[ʌnˋlod]', ipa: '/ʌnˈloʊd/', syllables: 'un·load', taiwanPhonetic: '【 昂-漏-德 】', mandarinPhonetic: '【 安漏德 】', cleanroomContext: '檢測完成後將基板或晶圓從機台卸載收料。', category: 'process' },
    unit: { word: 'unit', lemma: 'unit', translation: '組件 / 單元機構', partOfSpeech: 'n.', kkPhonetic: '[ˋjunɪt]', ipa: '/ˈjuː.nɪt/', syllables: 'u·nit', taiwanPhonetic: '【 優-尼-特 】', mandarinPhonetic: '【 優尼特 】', cleanroomContext: '機台獨立功能模組，如 Load/Unload Unit 上下料組件。', category: 'equipment' },
    management: { word: 'management', lemma: 'management', translation: '管理系統 / 控制設定', partOfSpeech: 'n.', kkPhonetic: '[ˋmænɪdʒmənt]', ipa: '/ˈmæn.ɪdʒ.mənt/', syllables: 'man·age·ment', taiwanPhonetic: '【 賣-尼-居-門-特 】', mandarinPhonetic: '【 麥尼居門特 】', cleanroomContext: 'Vacuum Nozzle Management 真空吸嘴管理介面。', category: 'maintenance' },
    golden: { word: 'golden', lemma: 'golden', translation: '黃金標準的 / 基準的', partOfSpeech: 'adj.', kkPhonetic: '[ˋgoldən]', ipa: '/ˈɡoʊl.dən/', syllables: 'gol·den', taiwanPhonetic: '【 苟-登 】', mandarinPhonetic: '【 勾登 】', cleanroomContext: 'Golden Sample 黃金樣本，作為 AOI 光學比對的最高標準無缺陷樣品。', category: 'process' },
    sample: { word: 'sample', lemma: 'sample', translation: '樣本 / 標準片', partOfSpeech: 'n.', kkPhonetic: '[ˋsæmp!]', ipa: '/ˈsæm.pəl/', syllables: 'sam·ple', taiwanPhonetic: '【 散-婆 】', mandarinPhonetic: '【 散婆 】', cleanroomContext: 'Golden Sample 標準樣本片，用於對比良率與靈敏度驗證。', category: 'process' },
    sampling: { word: 'sampling', lemma: 'sample', translation: '抽檢 / 取樣檢測', partOfSpeech: 'n./v.', kkPhonetic: '[ˋsæmplɪŋ]', ipa: '/ˈsæm.plɪŋ/', syllables: 'sam·pling', taiwanPhonetic: '【 散-普-林 】', mandarinPhonetic: '【 散普林 】', cleanroomContext: 'Golden Sampling 黃金樣本抽檢比對模式。', category: 'process' }
  };

  /**
   * 台灣標準 KK 音標對照表與智慧轉換引擎 (Kenyon & Knott Phonetic Transcription)
   */
  const KK_EXACT_MAP: Record<string, string> = {
    we: '[wi]',
    i: '[aɪ]',
    you: '[ju]',
    they: '[ðe]',
    he: '[hi]',
    she: '[ʃi]',
    it: '[ɪt]',
    our: '[aʊr]',
    the: '[ðə]',
    a: '[ə]',
    an: '[æn]',
    to: '[tu]',
    in: '[ɪn]',
    on: '[ɑn]',
    at: '[æt]',
    of: '[ʌv]',
    for: '[fɔr]',
    with: '[wɪð]',
    from: '[frɑm]',
    by: '[baɪ]',
    before: '[bɪˋfor]',
    after: '[ˋæftɚ]',
    during: '[ˋdjʊrɪŋ]',
    and: '[ænd]',
    or: '[ɔr]',
    is: '[ɪz]',
    are: '[ɑr]',
    was: '[wɑz]',
    were: '[wɝ]',
    be: '[bi]',
    been: '[bɪn]',
    will: '[wɪl]',
    can: '[kæn]',
    must: '[mʌst]',
    please: '[pliz]',
    check: '[tʃɛk]',
    checks: '[tʃɛks]',
    checked: '[tʃɛkt]',
    checking: '[ˋtʃɛkɪŋ]',
    inspect: '[ɪnˋspɛkt]',
    inspected: '[ɪnˋspɛktɪd]',
    inspection: '[ɪnˋspɛkʃən]',
    inspector: '[ɪnˋspɛktɚ]',
    die: '[daɪ]',
    dies: '[daɪz]',
    jump: '[dʒʌmp]',
    sensor: '[ˋsɛnsɚ]',
    sensors: '[ˋsɛnsɚz]',
    jig: '[dʒɪg]',
    board: '[bord]',
    tuning: '[ˋtunɪŋ]',
    tune: '[tun]',
    light: '[laɪt]',
    teach: '[titʃ]',
    align: '[əˋlaɪn]',
    aligns: '[əˋlaɪnz]',
    alignment: '[əˋlaɪnmənt]',
    layout: '[ˋle͵aʊt]',
    transfer: '[ˋtrænsfɚ]',
    detect: '[dɪˋtɛkt]',
    detects: '[dɪˋtɛkts]',
    detected: '[dɪˋtɛktɪd]',
    empty: '[ˋɛmptɪ]',
    '2d': '[ˋtuˋdi]',
    code: '[kod]',
    substrate: '[ˋsʌbstret]',
    c4: '[ˋsi ˋfor]',
    bump: '[bʌmp]',
    bumps: '[bʌmps]',
    couple: '[ˋkʌp!]',
    pc: '[ˋpi ˋsi]',
    ocv: '[ˋo ˋsi ˋvi]',
    ball: '[bɔl]',
    balls: '[bɔlz]',
    underfill: '[ˋʌndɚ͵fɪl]',
    ocr: '[͵o si ˋɑr]',
    cu: '[ˋkɑpɚ]',
    copper: '[ˋkɑpɚ]',
    pad: '[pæd]',
    pads: '[pædz]',
    plc: '[ˋpi ˋɛl ˋsi]',
    secs: '[sɛks]',
    sucker: '[ˋsʌkɚ]',
    viewer: '[ˋvjuɚ]',
    sealer: '[ˋsilɚ]',
    seal: '[sil]',
    defect: '[ˋdifɛkt]',
    defects: '[ˋdifɛkts]',
    crack: '[kræk]',
    cracks: '[kræks]',
    control: '[kənˋtrol]',
    controller: '[kənˋtrolɚ]',
    state: '[stet]',
    remote: '[rɪˋmot]',
    wafer: '[ˋwefɚ]',
    wafers: '[ˋwefɚz]',
    no: '[no]',
    not: '[nɑt]',
    wait: '[wet]',
    waiting: '[ˋwetɪŋ]',
    process: '[ˋprɑsɛs]',
    processing: '[ˋprɑsɛsɪŋ]',
    end: '[ɛnd]',
    cycle: '[ˋsaɪk!]',
    auto: '[ˋɔto]',
    automatic: '[͵ɔtəˋmætɪk]',
    automatically: '[͵ɔtəˋmætɪklɪ]',
    focus: '[ˋfokəs]',
    autofocus: '[ˋɔto͵fokəs]',
    log: '[lɔg]',
    logs: '[lɔgz]',
    roller: '[ˋrolɚ]',
    rollers: '[ˋrolɚz]',
    load: '[lod]',
    loader: '[ˋlodɚ]',
    loading: '[ˋlodɪŋ]',
    unload: '[ʌnˋlod]',
    unloader: '[ʌnˋlodɚ]',
    unit: '[ˋjunɪt]',
    vacuum: '[ˋvækjuəm]',
    nozzle: '[ˋnɑz!]',
    nozzles: '[ˋnɑz!z]',
    management: '[ˋmænɪdʒmənt]',
    recipe: '[ˋrɛsəpɪ]',
    recipes: '[ˋrɛsəpɪz]',
    stop: '[stɑp]',
    stopped: '[stɑpt]',
    lot: '[lɑt]',
    lots: '[lɑts]',
    golden: '[ˋgoldən]',
    sample: '[ˋsæmp!]',
    sampling: '[ˋsæmplɪŋ]',
    mode: '[mod]',
    save: '[sev]',
    saved: '[sevd]',
    data: '[ˋdetə]',
    report: '[rɪˋport]',
    reported: '[rɪˋportɪd]',
    run: '[rʌn]',
    running: '[ˋrʌnɪŋ]',
    start: '[stɑrt]',
    restart: '[riˋstɑrt]',
    place: '[ples]',
    replace: '[rɪˋples]',
    replaced: '[rɪˋplest]',
    stage: '[stedʒ]',
    camera: '[ˋkæmərə]',
    mark: '[mɑrk]',
    screen: '[skrin]',
    setup: '[ˋsɛt͵ʌp]',
    execute: '[ˋɛksɪ͵kjut]',
    apply: '[əˋplaɪ]',
    new: '[nju]',
    map: '[mæp]',
    system: '[ˋsɪstəm]',
    slot: '[slɑt]',
    three: '[θri]',
    one: '[wʌn]',
    two: '[tu]',
    four: '[for]',
    five: '[faɪv]',
    ten: '[tɛn]',
    scan: '[skæn]',
    scanner: '[ˋskænɚ]',
    laser: '[ˋlezɚ]',
    calibrate: '[ˋkælə͵bret]',
    calibration: '[͵kæləˋbreʃən]',
    optics: '[ˋɑptɪks]',
    optical: '[ˋɑptɪk!]',
    power: '[ˋpaʊɚ]',
    pressure: '[ˋprɛʃɚ]',
    chamber: '[ˋtʃembɚ]',
    pump: '[pʌmp]',
    valve: '[vælv]',
    valves: '[vælvz]',
    clean: '[klin]',
    purge: '[pɝdʒ]',
    verify: '[ˋvɛrə͵faɪ]',
    reset: '[riˋsɛt]',
    alarm: '[əˋlɑrm]',
    error: '[ˋɛrɚ]',
    switch: '[swɪtʃ]',
    flow: '[flo]',
    rate: '[ret]',
    water: '[ˋwɔtɚ]',
    gas: '[gæs]',
    leak: '[lik]',
    ring: '[rɪŋ]',
    temperature: '[ˋtɛmpərətʃɚ]',
    helium: '[ˋhilɪəm]',
    nitrogen: '[ˋnaɪtrədʒən]',
    plasma: '[ˋplæzmə]',
    rf: '[͵ɑrˋɛf]',
    euv: '[͵i ju ˋvi]',
    aoi: '[͵e o ˋaɪ]',
    pm: '[͵pi ˋɛm]',
    sop: '[͵ɛs o ˋpi]',
    loto: '[ˋlo͵to]',
    change: '[tʃendʒ]',
    changing: '[ˋtʃendʒɪŋ]',
    enable: '[ɪnˋeb!]',
    disable: '[dɪsˋeb!]',
    open: '[ˋopən]',
    close: '[kloz]',
    closed: '[klozd]',
    normal: '[ˋnɔrm!]',
    stable: '[ˋsteb!]',
    monitor: '[ˋmɑnətɚ]',
    next: '[nɛkst]',
    adjust: '[əˋdʒʌst]',
    exhaust: '[ɪgˋzɔst]',
    line: '[laɪn]',
    main: '[men]',
    gate: '[get]',
    immediately: '[ɪˋmidɪɪtlɪ]',
    sequence: '[ˋsikwəns]',
    damaged: '[ˋdæmɪdʒd]',
    safety: '[ˋseftɪ]',
    interlock: '[ˋɪntɚ͵lɑk]'
  };

  /**
   * 將 IPA 國際音標或英文單字轉為台灣學習者最熟悉的標準 KK 音標 (如 [ɪnˋspɛkʃən])
   */
  export function getWordKKPhonetic(rawWord: string, ipa?: string): string {
    const clean = rawWord.replace(/^[^a-zA-Z0-9-]+|[^a-zA-Z0-9-]+$/g, '').toLowerCase().trim();
    if (!clean) return '';

    if (KK_EXACT_MAP[clean]) {
      return KK_EXACT_MAP[clean];
    }

    // 若處理複合詞 (如 Die Jump Sensor)
    if (rawWord.trim().includes(' ')) {
      const parts = rawWord
        .trim()
        .split(/\s+/)
        .map((w) => getWordKKPhonetic(w).replace(/^\[|\]$/g, '').trim())
        .filter(Boolean);
      if (parts.length > 0) {
        return `[${parts.join(' ')}]`;
      }
    }

    // 若有提供 IPA 音標，精準轉換為台灣 KK 音標符號格式
    const sourceIpa = ipa || DICTIONARY_MAP[clean]?.ipa;
    if (sourceIpa) {
      const inner = sourceIpa
        .replace(/^[/[\s]+|[/\]\s]+$/g, '')
        .replace(/ˈ/g, 'ˋ')
        .replace(/ˌ/g, '͵')
        .replace(/\./g, '')
        .replace(/eɪ/g, 'e')
        .replace(/oʊ/g, 'o')
        .replace(/əʊ/g, 'o')
        .replace(/iː/g, 'i')
        .replace(/uː/g, 'u')
        .replace(/ɑːr/g, 'ɑr')
        .replace(/ɑː/g, 'ɑ')
        .replace(/ɔːr/g, 'ɔr')
        .replace(/ɔː/g, 'ɔ')
        .replace(/ɜːr/g, 'ɝ')
        .replace(/ɜr/g, 'ɝ')
        .replace(/ər/g, 'ɚ')
        .replace(/ɡ/g, 'g')
        .replace(/ː/g, '')
        .trim();
      return `[${inner}]`;
    }

    // 嘗試詞型還原查找
    const candidates = getStemmedCandidates(clean);
    for (const cand of candidates) {
      if (KK_EXACT_MAP[cand]) {
        return KK_EXACT_MAP[cand];
      }
      if (DICTIONARY_MAP[cand]?.kkPhonetic) {
        return DICTIONARY_MAP[cand].kkPhonetic!;
      }
      if (DICTIONARY_MAP[cand]?.ipa) {
        return getWordKKPhonetic(cand, DICTIONARY_MAP[cand].ipa);
      }
    }

    // 規則合成回退：依自然發音規則推導 KK 音標，確保 100% 單字都有 KK 音標
    let kk = clean
      .replace(/tion$/g, 'ʃən')
      .replace(/sion$/g, 'ʒən')
      .replace(/ture$/g, 'tʃɚ')
      .replace(/ment$/g, 'mənt')
      .replace(/ness$/g, 'nɪs')
      .replace(/able$/g, 'əb!')
      .replace(/ible$/g, 'əb!')
      .replace(/ing$/g, 'ɪŋ')
      .replace(/er$/g, 'ɚ')
      .replace(/or$/g, 'ɚ')
      .replace(/ch/g, 'tʃ')
      .replace(/sh/g, 'ʃ')
      .replace(/th/g, 'θ')
      .replace(/ph/g, 'f')
      .replace(/ck/g, 'k')
      .replace(/qu/g, 'kw')
      .replace(/ee/g, 'i')
      .replace(/ea/g, 'i')
      .replace(/oo/g, 'u')
      .replace(/ou/g, 'aʊ')
      .replace(/ow/g, 'o')
      .replace(/ai/g, 'e')
      .replace(/ay/g, 'e')
      .replace(/igh/g, 'aɪ')
      .replace(/y$/g, 'ɪ')
      .replace(/c(?=[eiy])/g, 's')
      .replace(/c/g, 'k')
      .replace(/j/g, 'dʒ')
      .replace(/x/g, 'ks');

    if (clean.length >= 5 && !kk.includes('ˋ')) {
      kk = `ˋ${kk}`;
    }
    return `[${kk}]`;
  }

  /**
   * 取得整句英文的逐字 KK 音標串列 (以 ｜ 分隔，對齊整句音律)
   */
  export function getSentenceKKPhonetic(sentence: string): string {
    if (!sentence) return '';
    const words = sentence
      .split(/\s+/)
      .map((t) => t.replace(/^[^a-zA-Z0-9-]+|[^a-zA-Z0-9-]+$/g, ''))
      .filter(Boolean);
    if (words.length === 0) return '';
    return words.map((w) => getWordKKPhonetic(w)).join(' ｜ ');
  }

  /**
   * 零基礎自動音標推導合成器：當遇到字典未收錄的新單字時，依英文字母發音規則自動生成易讀台味諧音，確保 100% 單字皆有標音
   */
  function synthesizeFallbackPhonetic(word: string): string {
    const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!clean) return '【 — 】';
    const syllableRules: Array<[RegExp, string]> = [
      [/0/g, '零'],
      [/1/g, '一'],
      [/2/g, '二'],
      [/3/g, '三'],
      [/4/g, '四'],
      [/5/g, '五'],
      [/6/g, '六'],
      [/7/g, '七'],
      [/8/g, '八'],
      [/9/g, '九'],
      [/tion/g, '宣'],
      [/sion/g, '遜'],
      [/ture/g, '雀'],
      [/ment/g, '門特'],
      [/ness/g, '尼斯'],
      [/able/g, '額伯'],
      [/ible/g, '伊伯'],
      [/ing/g, '英'],
      [/ed$/g, '特'],
      [/er$/g, '爾'],
      [/or$/g, '爾'],
      [/ar$/g, '阿爾'],
      [/al$/g, '歐'],
      [/le$/g, '歐'],
      [/ch/g, '取'],
      [/sh/g, '許'],
      [/th/g, '斯'],
      [/ph/g, '夫'],
      [/qu/g, '誇'],
      [/ck/g, '克'],
      [/ee/g, '伊'],
      [/ea/g, '伊'],
      [/oo/g, '烏'],
      [/ou/g, '奧'],
      [/ow/g, '歐'],
      [/ai/g, '艾'],
      [/ay/g, '欸'],
      [/oi/g, '歐伊'],
      [/a/g, '阿'],
      [/e/g, '欸'],
      [/i/g, '伊'],
      [/o/g, '歐'],
      [/u/g, '優'],
      [/b/g, '布'],
      [/c/g, '克'],
      [/d/g, '德'],
      [/f/g, '夫'],
      [/g/g, '格'],
      [/h/g, '赫'],
      [/j/g, '吉'],
      [/k/g, '克'],
      [/l/g, '勒'],
      [/m/g, '姆'],
      [/n/g, '恩'],
      [/p/g, '普'],
      [/r/g, '瑞'],
      [/s/g, '斯'],
      [/t/g, '特'],
      [/v/g, '弗'],
      [/w/g, '威'],
      [/x/g, '克斯'],
      [/y/g, '伊'],
      [/z/g, '茲']
    ];
  let result = clean;
  for (const [pattern, rep] of syllableRules) {
    result = result.replace(pattern, rep);
  }
  const compact = result.slice(0, 6);
  return `【 ${compact || clean} 】`;
}

/**
 * 詞型還原規則 (Lemmatization & Suffix Stripping)
 * 將複數 (sensors -> sensor), 過去式 (inspected -> inspect), 進行式 (testing -> test), 第三人稱單數 (checks -> check) 精準還原
 */
export function getStemmedCandidates(word: string): string[] {
  const clean = word.toLowerCase().trim();
  const candidates: string[] = [clean];

  // 1. 處理 's 或 ’s
  const noApos = clean.replace(/['’]s$/, '');
  if (noApos !== clean) candidates.push(noApos);

  // 2. 處理複數與第三人稱 -s / -es / -ies
  if (clean.endsWith('ies') && clean.length > 4) {
    candidates.push(clean.slice(0, -3) + 'y');
  }
  if (clean.endsWith('sses') || clean.endsWith('shes') || clean.endsWith('ches') || clean.endsWith('xes') || clean.endsWith('zes')) {
    candidates.push(clean.slice(0, -2));
  } else if (clean.endsWith('es') && clean.length > 3) {
    candidates.push(clean.slice(0, -2));
    candidates.push(clean.slice(0, -1)); // e.g. valves -> valve
  } else if (clean.endsWith('s') && !clean.endsWith('ss') && clean.length > 2) {
    candidates.push(clean.slice(0, -1)); // e.g. sensors -> sensor, pumps -> pump
  }

  // 3. 處理過去式 -ed / -d
  if (clean.endsWith('ied') && clean.length > 4) {
    candidates.push(clean.slice(0, -3) + 'y');
  } else if (clean.endsWith('ed') && clean.length > 3) {
    candidates.push(clean.slice(0, -2)); // e.g. inspected -> inspect
    candidates.push(clean.slice(0, -1)); // e.g. calibrated -> calibrate, replaced -> replace
    // 雙寫字母還原 (e.g. stopped -> stop, swapped -> swap)
    if (clean.length > 4 && clean[clean.length - 3] === clean[clean.length - 4]) {
      candidates.push(clean.slice(0, -3));
    }
  }

  // 4. 處理進行式 -ing
  if (clean.endsWith('ing') && clean.length > 4) {
    candidates.push(clean.slice(0, -3)); // e.g. checking -> check
    candidates.push(clean.slice(0, -3) + 'e'); // e.g. tuning -> tune, closing -> close
    // 雙寫字母還原 (e.g. running -> run, stopping -> stop)
    if (clean.length > 5 && clean[clean.length - 4] === clean[clean.length - 5]) {
      candidates.push(clean.slice(0, -4));
    }
  }

  // 5. 處理形容詞/副詞 -ly / -er / -est / -able / -ive
  if (clean.endsWith('ly') && clean.length > 4) {
    candidates.push(clean.slice(0, -2));
  }

  return Array.from(new Set(candidates));
}

/**
 * 查詢單字之完整詳細定義 (包含詞性、繁體中文翻譯、KK音標、諧音與無塵室半導體語境)
 */
export function lookupWordDefinition(rawWord: string): WordDefinition {
  // 清除前後標點符號（如逗號、句號、括號、分號、引號等）
  const sanitized = rawWord.replace(/^[^a-zA-Z0-9-]+|[^a-zA-Z0-9-]+$/g, '').toLowerCase().trim();

  if (!sanitized) {
    return {
      word: rawWord,
      lemma: rawWord,
      translation: '符號 / 標點',
      partOfSpeech: 'sym.',
      category: 'general'
    };
  }

  const cleanWordDisplay = rawWord.replace(/^[^a-zA-Z0-9-]+|[^a-zA-Z0-9-]+$/g, '');

  // 1. 直接全字比對
  if (DICTIONARY_MAP[sanitized]) {
    const match = DICTIONARY_MAP[sanitized];
    const fallbackPhonetic = !match.taiwanPhonetic ? synthesizeFallbackPhonetic(sanitized) : undefined;
    const cleanTrans = match.translation.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim() || match.translation;
    const kk = match.kkPhonetic || getWordKKPhonetic(sanitized, match.ipa);
    return {
      ...match,
      translation: cleanTrans,
      kkPhonetic: kk,
      taiwanPhonetic: match.taiwanPhonetic || fallbackPhonetic,
      mandarinPhonetic: match.mandarinPhonetic || match.taiwanPhonetic?.replace(/\s*-\s*/g, '') || fallbackPhonetic,
      word: cleanWordDisplay
    };
  }

  // 2. 透過詞型還原比對 (Stemmed Candidates)
  const candidates = getStemmedCandidates(sanitized);
  for (const cand of candidates) {
    if (DICTIONARY_MAP[cand]) {
      const base = DICTIONARY_MAP[cand];
      const fallbackPhonetic = !base.taiwanPhonetic ? synthesizeFallbackPhonetic(cand) : undefined;
      const cleanTrans = base.translation.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim() || base.translation;
      const kk = base.kkPhonetic || getWordKKPhonetic(sanitized, base.ipa);
      return {
        ...base,
        translation: cleanTrans,
        kkPhonetic: kk,
        taiwanPhonetic: base.taiwanPhonetic || fallbackPhonetic,
        mandarinPhonetic: base.mandarinPhonetic || base.taiwanPhonetic?.replace(/\s*-\s*/g, '') || fallbackPhonetic,
        word: cleanWordDisplay
      };
    }
  }

  // 3. 通用智能推導回退（Fallback heuristic，自動合成 KK 音標、台味諧音與注音來源）
  const autoPhonetic = synthesizeFallbackPhonetic(sanitized);
  const autoKK = getWordKKPhonetic(sanitized);
  return {
    word: cleanWordDisplay,
    lemma: sanitized,
    translation: '工程術語',
    partOfSpeech: 'term',
    kkPhonetic: autoKK,
    taiwanPhonetic: autoPhonetic,
    mandarinPhonetic: autoPhonetic,
    cleanroomContext: '半導體無塵室工程術語 / 常用語境單字，點擊可聆聽標準發音。',
    category: 'general'
  };
}

export const lookupWord = lookupWordDefinition;
