import { Lesson, ScenarioTopic } from "../types";
import { sanitizeLessonToPublicSafe } from "../utils/pipSanitizer";

export const SCENARIO_TOPICS: ScenarioTopic[] = [
  {
    id: "error-code",
    title: "錯誤代碼排除與異常",
    iconName: "AlertTriangle",
    description: "機台警報響起，超短句快速回報",
    samplePrompt: "請提供一句 3-4 個字的超簡單錯誤代碼英文句子。"
  },
  {
    id: "calibration",
    title: "馬達與感應器校正",
    iconName: "Compass",
    description: "機械手臂、氣動馬達與感應器對位",
    samplePrompt: "請提供一句 3-4 個字的馬達校正極簡英文。"
  },
  {
    id: "vacuum-pump",
    title: "真空泵浦與定期保養",
    iconName: "Gauge",
    description: "乾式幫浦與反應腔體抽真空保養",
    samplePrompt: "請提供一句 3-4 個字的幫浦維修極簡英文。"
  },
  {
    id: "wafer-transfer",
    title: "晶圓傳輸與對位異常",
    iconName: "Disc",
    description: "晶圓傳輸對齊與晶圓盒載入測試",
    samplePrompt: "請提供一句 3-4 個字的晶圓對齊極簡英文。"
  },
  {
    id: "safety-loto",
    title: "無塵室工安上鎖斷電",
    iconName: "ShieldCheck",
    description: "安全上鎖掛牌與斷電斷氣程序",
    samplePrompt: "請提供一句 3-4 個字的安全上鎖極簡英文。"
  },
  {
    id: "shift-handover",
    title: "交接班與維修報告",
    iconName: "ClipboardList",
    description: "填寫維修工作日誌與報告交接",
    samplePrompt: "請提供一句 3-4 個字的交接報告極簡英文。"
  }
];

const RAW_PRESET_LESSONS: Lesson[] = [
  {
    id: "preset-1",
    scenario: "🎬 情境：無塵室感應器訊號異常，進行功能測試。",
    english_sentence: "I test the sensor.",
    chinese_translation: "我測試這個感應器。",
    components: {
      subject: "I (👤 我)",
      action: "test (🏃‍♂️ 測試)",
      object: "the sensor (📦 那個感應器)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 愛 ｜ 泰-絲-特 ｜ 德 ｜ 山-瑟 】",
    memory_trick: "「愛」工作的我 ➔ 「泰」然自若做「特」測試 ➔ 檢查訊號線抖得像爬「山」的感應器。",
    additional_context: "極簡 4 字句：I (主) + test (動) + the sensor (名)",
    category: "calibration"
  },
  {
    id: "preset-2",
    scenario: "🎬 情境：定期保養期間，工程師正在校正馬達精度。",
    english_sentence: "We calibrate the motor.",
    chinese_translation: "我們校正這個馬達。",
    components: {
      subject: "We (👤 我們)",
      action: "calibrate (🏃‍♂️ 校正)",
      object: "the motor (📦 馬達)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 威 ｜ 柯-愛-利-伯-瑞-特 ｜ 德 ｜ 摸-特 】",
    memory_trick: "很有「威」嚴的我們 ➔ 「柯」學加「利」害地「特」訓校正 ➔ 摸運轉中的馬達。",
    additional_context: "極簡 4 字句：We (主) + calibrate (動) + the motor (名)",
    category: "calibration"
  },
  {
    id: "preset-4",
    scenario: "🎬 情境：機台跳出警報，工程師檢查錯誤代碼。",
    english_sentence: "I check the code.",
    chinese_translation: "我檢查這個代碼。",
    components: {
      subject: "I (👤 我)",
      action: "check (🏃‍♂️ 檢查)",
      object: "the code (📦 錯誤代碼)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 愛 ｜ 切-克 ｜ 德 ｜ 扣-德 】",
    memory_trick: "「愛」工作的我 ➔ 一按「切」換檢查畫面 ➔ 找出「扣」德機台的錯誤代碼。",
    additional_context: "極簡 4 字句：I (主) + check (動) + the code (名)",
    category: "error-code"
  },
  {
    id: "preset-8",
    scenario: "🎬 情境：氣體流量管制，校正質量流量控制閥。",
    english_sentence: "We test the valve.",
    chinese_translation: "我們測試這個閥門。",
    components: {
      subject: "We (👤 我們)",
      action: "test (🏃‍♂️ 測試)",
      object: "the valve (📦 閥門)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 威 ｜ 泰-絲-特 ｜ 德 ｜ 閥-爾-夫 】",
    memory_trick: "最有「威」嚴的我們 ➔ 「泰」特測試 ➔ 無塵室氣體流量閥。",
    additional_context: "極簡 4 字句：We (主) + test (動) + the valve (名)",
    category: "calibration"
  },
  {
    id: "preset-9",
    scenario: "🎬 情境：腔體抽真空前，進行密閉腔體檢測。",
    english_sentence: "I test the chamber.",
    chinese_translation: "我測試這個腔體。",
    components: {
      subject: "I (👤 我)",
      action: "test (🏃‍♂️ 測試/檢測)",
      object: "the chamber (📦 腔體)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 愛 ｜ 泰-絲-特 ｜ 德 ｜ 切-姆-伯 】",
    memory_trick: "「愛」工作的我 ➔ 「泰」然自若做檢測 ➔ 測試密閉真空腔體。",
    additional_context: "極簡 4 字句：I (主) + test (動) + the chamber (名)",
    category: "vacuum-pump"
  },
  {
    id: "preset-10",
    scenario: "🎬 情境：晶圓傳輸門閥做動異常，更換驅動氣壓缸。",
    english_sentence: "He replaces the cylinder.",
    chinese_translation: "他更換這個氣缸。",
    components: {
      subject: "He (👤 他/工程師)",
      action: "replaces (🏃‍♂️ 更換)",
      object: "the cylinder (📦 氣壓缸)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 嘻 ｜ 瑞-普-雷-斯 ｜ 德 ｜ 西-林-德 】",
    memory_trick: "笑「嘻」嘻的工程師 ➔ 迅速「瑞」特更換 ➔ 驅動門閥的氣壓缸。",
    additional_context: "極簡 4 字句：He (主) + replaces (動) + the cylinder (名)",
    category: "calibration"
  },
  {
    id: "preset-11",
    scenario: "🎬 情境：電漿點火失敗，工程師調校射頻產生器。",
    english_sentence: "He tunes the generator.",
    chinese_translation: "他調校這個產生器。",
    components: {
      subject: "He (👤 他/工程師)",
      action: "tunes (🏃‍♂️ 調校/調頻)",
      object: "the generator (📦 射頻產生器)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 嘻 ｜ 吐-恩-斯 ｜ 德 ｜ 哲-內-瑞-特 】",
    memory_trick: "笑「嘻」嘻的工程師 ➔ 專注「吐」氣調整頻率 ➔ 高頻電漿產生器。",
    additional_context: "極簡 4 字句：He (主) + tunes (動) + the generator (名)",
    category: "error-code"
  },
  {
    id: "preset-12",
    scenario: "🎬 情境：晶圓載具無法對齊，重新校準前開式晶圓盒載入傳輸介面。",
    english_sentence: "I align the loadport.",
    chinese_translation: "我對齊這個載具平台。",
    components: {
      subject: "I (👤 我)",
      action: "align (🏃‍♂️ 對齊/校準)",
      object: "the loadport (📦 晶圓載具平台)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 愛 ｜ 額-賴-恩 ｜ 德 ｜ 扣-特 】",
    memory_trick: "「愛」維修的我 ➔ 依靠「額」「賴」著重新校準 ➔ 晶圓盒載具平台。",
    additional_context: "極簡 4 字句：I (主) + align (動) + the loadport (名)",
    category: "wafer-transfer"
  },
  {
    id: "preset-13",
    scenario: "🎬 情境：排除緊急警報後，工程師解除並重置緊急按鈕。",
    english_sentence: "You reset the button.",
    chinese_translation: "你重置這個按鈕。",
    components: {
      subject: "You (👤 你)",
      action: "reset (🏃‍♂️ 重置/復歸)",
      object: "the button (📦 緊急按鈕)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 優 ｜ 瑞-賽-特 ｜ 德 ｜ 拔-騰 】",
    memory_trick: "最「優」秀的你 ➔ 「瑞」氣干雲「賽」過危險後重置 ➔ 緊急按鈕。",
    additional_context: "極簡 4 字句：You (主) + reset (動) + the button (名)",
    category: "safety-loto"
  },
  {
    id: "preset-14",
    scenario: "🎬 情境：無塵室落塵檢測，工程師確認微塵粒子數量。",
    english_sentence: "I check the particles.",
    chinese_translation: "我檢查這些微塵粒子。",
    components: {
      subject: "I (👤 我)",
      action: "check (🏃‍♂️ 檢查/檢測)",
      object: "the particles (📦 微塵粒子)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 愛 ｜ 切-克 ｜ 德 ｜ 趴-提-扣-斯 】",
    memory_trick: "「愛」潔淨的我 ➔ 一按「切」換畫面檢查 ➔ 關乎無塵標準的微塵粒子。",
    additional_context: "極簡 4 字句：I (主) + check (動) + the particles (名)",
    category: "error-code"
  },
  {
    id: "preset-15",
    scenario: "🎬 情境：抽風管路異常，工程師檢查排氣閥。",
    english_sentence: "We inspect the valve.",
    chinese_translation: "我們巡檢這個排氣閥。",
    components: {
      subject: "We (👤 我們)",
      action: "inspect (🏃‍♂️ 檢查/巡檢)",
      object: "the valve (📦 排氣閥)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 威 ｜ 印-斯-佩-克-特 ｜ 德 ｜ 閥-爾-夫 】",
    memory_trick: "很有「威」嚴的我們 ➔ 「印」特別「佩」「克」特檢視 ➔ 安全排氣閥。",
    additional_context: "極簡 4 字句：We (主) + inspect (動) + the valve (名)",
    category: "vacuum-pump"
  },
  {
    id: "preset-16",
    scenario: "🎬 情境：高危險特氣管路壓降測試，工程師確認並修復氣體洩漏。",
    english_sentence: "I fix the leak.",
    chinese_translation: "我修復這個洩漏。",
    components: {
      subject: "I (👤 我)",
      action: "fix (🏃‍♂️ 修復/處理)",
      object: "the leak (📦 氣體洩漏)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 愛 ｜ 費-克-斯 ｜ 德 ｜ 利-克 】",
    memory_trick: "「愛」安檢的我 ➔ 快速「費」盡心思「克」服困難修好 ➔ 關乎工安的洩漏。",
    additional_context: "極簡 4 字句：I (主) + fix (動) + the leak (名)",
    category: "safety-loto"
  },
  {
    id: "preset-17",
    scenario: "🎬 情境：機械手臂點位偏移，工程師重新教導對位。",
    english_sentence: "We teach the robot.",
    chinese_translation: "我們教導這個手臂。",
    components: {
      subject: "We (👤 我們)",
      action: "teach (🏃‍♂️ 教導/校準點位)",
      object: "the robot (📦 機械手臂)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 威 ｜ 剔-奇 ｜ 德 ｜ 羅-霸-特 】",
    memory_trick: "最有「威」嚴的我們 ➔ 「剔」除誤差「奇」蹟校位 ➔ 精密晶圓傳輸機械手臂。",
    additional_context: "極簡 4 字句：We (主) + teach (動) + the robot (名)",
    category: "wafer-transfer"
  },
  {
    id: "preset-18",
    scenario: "🎬 情境：極紫外光微影曝光機台光束微偏，工程師精細對準雷射。",
    english_sentence: "I align the laser.",
    chinese_translation: "我對準這個雷射。",
    components: {
      subject: "I (👤 我)",
      action: "align (🏃‍♂️ 對準/校直)",
      object: "the laser (📦 雷射光束)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 愛 ｜ 額-賴-恩 ｜ 德 ｜ 雷-澤 】",
    memory_trick: "「愛」精準的我 ➔ 「額」外用「賴」皮特技「恩」准 ➔ 校準高能極紫外光雷射。",
    additional_context: "極簡 4 字句：I (主) + align (動) + the laser (名)",
    category: "calibration"
  },
  {
    id: "preset-19",
    scenario: "🎬 情境：化學機械研磨製程平坦化，保養人員定期更換研磨墊。",
    english_sentence: "We replace the pad.",
    chinese_translation: "我們更換這個研磨墊。",
    components: {
      subject: "We (👤 我們)",
      action: "replace (🏃‍♂️ 更換/換新)",
      object: "the pad (📦 研磨墊)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 威 ｜ 瑞-普-雷-斯 ｜ 德 ｜ 拍-德 】",
    memory_trick: "很有「威」力的我們 ➔ 「瑞」「普」特手速更換 ➔ 晶圓平坦化拋光研磨墊。",
    additional_context: "極簡 4 字句：We (主) + replace (動) + the pad (名)",
    category: "vacuum-pump"
  },
  {
    id: "preset-20",
    scenario: "🎬 情境：蝕刻反應室點火不良，工程師微調電漿阻抗。",
    english_sentence: "I tune the plasma.",
    chinese_translation: "我調諧這個電漿。",
    components: {
      subject: "I (👤 我)",
      action: "tune (🏃‍♂️ 調諧/匹配阻抗)",
      object: "the plasma (📦 電漿反應)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 愛 ｜ 吞 ｜ 德 ｜ 普-拉-茲-瑪 】",
    memory_trick: "「愛」研究的我 ➔ 把數據全「吞」下去微調阻抗匹配器 ➔ 穩定腔體電漿放電。",
    additional_context: "極簡 4 字句：I (主) + tune (動) + the plasma (名)",
    category: "error-code"
  },
  {
    id: "preset-21",
    scenario: "🎬 情境：廢氣洗滌塔壓差偏高，工程師以純氮氣進行安全吹掃。",
    english_sentence: "We purge the scrubber.",
    chinese_translation: "我們吹掃這個洗滌塔。",
    components: {
      subject: "We (👤 我們)",
      action: "purge (🏃‍♂️ 吹掃/淨化)",
      object: "the scrubber (📦 廢氣洗滌塔)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 威 ｜ 頗-哲 ｜ 德 ｜ 斯-克-拉-伯 】",
    memory_trick: "極有「威」望的我們 ➔ 「頗」有「哲」理排氣 ➔ 消除酸鹼氣體的洗滌塔。",
    additional_context: "極簡 4 字句：We (主) + purge (動) + the scrubber (名)",
    category: "safety-loto"
  },
  {
    id: "preset-22",
    scenario: "🎬 情境：天車載運晶圓盒，手臂進行自動夾持與固定。",
    english_sentence: "The robot clamps the FOUP.",
    chinese_translation: "手臂夾持這個晶圓盒。",
    components: {
      subject: "The robot (👤 機械手臂)",
      action: "clamps (🏃‍♂️ 夾持/扣緊)",
      object: "the FOUP (📦 晶圓傳輸盒)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 德-羅-霸-特 ｜ 克-藍-普-斯 ｜ 德 ｜ 富-普 】",
    memory_trick: "機械手臂「克」服萬難「藍」「普」夾緊 ➔ 滿載12吋高價晶圓的「富」「普」晶圓盒。",
    additional_context: "極簡 4 字句：The robot (主) + clamps (動) + the FOUP (名)",
    category: "wafer-transfer"
  },
  {
    id: "preset-23",
    scenario: "🎬 情境：無塵室黃光區落塵檢測，工程師嚴格驗證微塵計數。",
    english_sentence: "I verify the count.",
    chinese_translation: "我驗證這個計數值。",
    components: {
      subject: "I (👤 我)",
      action: "verify (🏃‍♂️ 驗證/核對)",
      object: "the count (📦 落塵計數值)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 愛 ｜ 維-瑞-法-愛 ｜ 德 ｜ 康-特 】",
    memory_trick: "「愛」乾淨的我 ➔ 「維」持「瑞」智「法」眼確認 ➔ 落塵顆粒精準計數。",
    additional_context: "極簡 4 字句：I (主) + verify (動) + the count (名)",
    category: "error-code"
  },
  {
    id: "preset-24",
    scenario: "🎬 情境：日班交接夜班，工程師完成維修報告並提交工作日誌。",
    english_sentence: "We submit the log.",
    chinese_translation: "我們提交這份日誌。",
    components: {
      subject: "We (👤 我們)",
      action: "submit (🏃‍♂️ 提交/送出)",
      object: "the log (📦 維修工作日誌)",
      bridge: "the (🌉 橋樑)"
    },
    phonetic_taiwan: "【 威 ｜ 薩-伯-密-特 ｜ 德 ｜ 樂-格 】",
    memory_trick: "很有「威」信的我們 ➔ 「薩」其馬配「伯」「密」「特」送出 ➔ 機台維修交接日誌。",
    additional_context: "極簡 4 字句：We (主) + submit (動) + the log (名)",
    category: "shift-handover"
  }
];

export const PRESET_LESSONS: Lesson[] = RAW_PRESET_LESSONS.map((l) => sanitizeLessonToPublicSafe(l).lesson);
