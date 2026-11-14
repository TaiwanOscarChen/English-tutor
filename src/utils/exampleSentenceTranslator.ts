/**
 * Semiconductor Cleanroom Example Sentence Chinese Translation Engine
 * 無塵室例句繁體中文翻譯與智慧對照引擎
 */

// 精準例句中文對照庫 (涵蓋核心單字庫、3天輪播技術專題、實戰演練例句)
const KNOWN_SENTENCE_TRANSLATIONS: Record<string, string> = {
  // === FAB_VOCAB 33 核心單字例句 ===
  "i test the optical sensor.": "我測試光學感測器。",
  "we calibrate the motor offset.": "我們校準馬達偏差值。",
  "i clean the process chamber.": "我清潔製程反應腔體。",
  "he checks the vacuum level.": "他檢查真空度數值。",
  "you lock the power line.": "你將電源線路上鎖斷電 (LOTO)。",
  "the system triggers the safety interlock.": "系統觸發了安全互鎖保護機制。",
  "we finish the shift handover.": "我們完成了交接班工作。",
  "the robot transfers the wafer.": "機械手臂搬送晶圓片。",
  "we calibrate the mfc valve.": "我們校準質量流量控制器閥門。",
  "we inspect the exhaust valve.": "我們檢查廢氣排氣閥門。",
  "i align the loadport mechanism.": "我對齊晶圓載入口機構。",
  "i check the particle count.": "我檢查微塵落塵數量。",
  "you reset the emergency button.": "你重置緊急停止按鈕 (E-Stop)。",
  "the engineer tunes the rf generator.": "工程師調諧射頻電源產生器。",
  "we purge the gas pipe.": "我們對氣體管路進行高純氮氣吹掃。",
  "the oht vehicle docks the foup.": "天車搬運車靠泊載入晶圓盒。",
  "the robot clamps the foup.": "機械手臂夾持固定前開式晶圓盒。",
  "i inspect the esc chuck.": "我檢查靜電吸盤表面。",
  "we dispense the slurry.": "我們供應研磨化學拋光液。",
  "he verifies the recipe.": "他驗證機台製程參數配方。",
  "we purge the scrubber.": "我們吹掃清洗尾氣洗滌塔。",
  "i check the chiller temperature.": "我檢查冰水冷卻機溫度。",
  "the system adjusts the throttle valve.": "系統自動調節真空節流閥門。",
  "we perform the leak check.": "我們執行氦氣測漏檢驗。",
  "he requests the interlock bypass.": "他申請安全互鎖旁路許可。",
  "we inspect the diamond conditioner.": "我們檢查金剛石研磨修整盤。",
  "tighten the flange bolts evenly.": "均勻鎖緊法蘭密封接頭螺栓。",
  "the engineer checks slurry viscosity.": "工程師檢測研磨液黏度數值。",
  "we calibrate the thermocouple reading.": "我們校正熱電偶溫度讀數。",
  "i zero the capacitance manometer.": "我將電容式薄膜真空計歸零。",
  "replace the flexible metal bellows.": "更換真空金屬可撓伸縮波紋管。",
  "we replace the chamber o-ring.": "我們更換腔體氟橡膠真空密封圈。",
  "the turbo pump spins up.": "渦輪分子真空幫浦加速運轉運作。",

  // === 3-Day Cycle Fallbacks & Hot Terms ===
  "the door interlock prevents gas leakage.": "機門安全互鎖防止氣體洩漏。",
  "we degas the chamber at high temperature.": "我們在高溫下對腔體進行去氣排氣。",
  "check the chuck tilt calibration.": "檢查靜電吸盤傾斜度校準數值。",
  "check the chamber interlock.": "檢查腔體安全互鎖保護機制。",
  "replace the worn diamond conditioner.": "更換磨損的金剛石研磨修整盤。",
  "high slurry viscosity causes uneven polishing.": "過高的研磨液黏度會導致拋光不均勻。",
  "the removal rate is steady.": "材料研磨移除率保持穩定。",
  "control the etchant gas flow strictly.": "嚴格控制蝕刻製程氣體流量。",
  "do not bypass the safety interlock.": "切勿擅自跳過安全互鎖保護開關。",
  "keep the reflected power near zero.": "將射頻反射功率維持在接近零瓦特。",
  "we calibrate the laser.": "我們校正微影雷射光源。",
  "they reset the robot.": "他們重設晶圓搬運機器人。",
  "i inspect the pump.": "我檢查乾式真空幫浦。",
  "i check the flow rate.": "我檢查冷卻水循環流量。",
  "do not touch the valve.": "請勿觸摸氣體管路閥門。",
  "we align the wafer.": "我們進行晶圓定位對準。",
  "the pressure is normal.": "腔體壓力數值正常。",
  "i adjust the slurry.": "我調整拋光研磨液流量。",
  "we check the pad.": "我們檢查研磨墊表面狀況。",
  "he cleans the nozzle.": "他清潔清洗槽噴嘴結晶。",
  "do not open the door.": "運轉中請勿打開防護門。",
  "inspect the pump seal.": "檢查幫浦密封圈是否洩漏。",
  "i test the sensor.": "我測試光電感應器信號。"
};

// 單字級語境翻譯回退對照表
const WORD_FALLBACK_TRANSLATIONS: Record<string, string> = {
  sensor: "測試/檢查感應器光電開關訊號正常。",
  calibrate: "校準機台參數、座標或感測器讀數。",
  chamber: "清潔或保養半導體真空製程腔體。",
  vacuum: "監控與確認真空度符合製程規範。",
  loto: "維修前執行斷電斷氣上鎖掛牌工安程序。",
  interlock: "觸發或檢查機台安全連鎖保護機制。",
  handover: "完成交接班機台狀態與異常紀錄傳承。",
  wafer: "搬送並對齊 12 吋高純度矽晶圓。",
  mfc: "校準質量流量控制器之氣體供應量。",
  exhaust: "巡檢負壓酸鹼廢氣排放管路閥門。",
  loadport: "校準並對齊晶圓盒自動載入介面。",
  particle: "檢測無塵室落塵或晶圓表面微塵粒子。",
  "e-stop": "重置或巡檢緊急停機安全開關按鈕。",
  "rf generator": "調諧 13.56MHz 射頻電漿電源產生器。",
  purge: "以高純度氮氣吹掃管路殘留氣體。",
  oht: "天車空中搬運車自動裝載晶圓盒。",
  foup: "夾持並傳輸前開式密封晶圓盒。",
  esc: "檢查並維護靜電吸盤表面吸附力。",
  slurry: "均勻供應化學機械研磨拋光漿料。",
  recipe: "驗證並載入機台標準製程配方參數。",
  scrubber: "吹掃清洗毒氣與酸氣洗滌塔設備。",
  chiller: "監控冷水循環機維持恆定溫度。",
  "throttle valve": "動態調節真空蝶閥以控制腔壓。",
  "leak check": "執行氦氣抓漏測漏確保高真空度。",
  "interlock bypass": "依工安程序申請安全互鎖旁路旁通。",
  conditioner: "巡檢並更換金剛石研磨墊修整刮刀。",
  flange: "均勻對稱鎖緊金屬法蘭密封螺栓。",
  viscosity: "量測研磨液之黏度與流動特性。",
  thermocouple: "校正熱電偶溫度感測器量測值。",
  manometer: "將薄膜電容真空壓力計歸零標定。",
  bellows: "更換吸震減震之金屬伸縮波紋管。",
  "o-ring": "檢查並更換真空氟橡膠密封 O 型環。",
  "turbo pump": "加速啟動渦輪分子幫浦抽取超高真空。"
};

/**
 * 取得例句的中文翻譯（支援精準句對照、詞彙回退、及自然語意生成）
 */
export function getExampleTranslation(sentence?: string, word?: string): string {
  if (!sentence && !word) return "半導體無塵室標準操作與維護例句。";

  // 1. 正規化比對句子
  if (sentence) {
    const cleanSentence = sentence.trim().toLowerCase().replace(/[.,!?;:"]+$/g, '');
    if (KNOWN_SENTENCE_TRANSLATIONS[cleanSentence]) {
      return KNOWN_SENTENCE_TRANSLATIONS[cleanSentence];
    }

    // 容錯去引號和空白
    const unquoted = cleanSentence.replace(/^["'\s]+|["'\s]+$/g, '');
    if (KNOWN_SENTENCE_TRANSLATIONS[unquoted]) {
      return KNOWN_SENTENCE_TRANSLATIONS[unquoted];
    }
  }

  // 2. 透過單字檢索特定專業翻譯
  if (word) {
    const cleanWord = word.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (WORD_FALLBACK_TRANSLATIONS[cleanWord]) {
      return WORD_FALLBACK_TRANSLATIONS[cleanWord];
    }
  }

  // 3. 智慧動詞/名詞關鍵詞解析推導
  if (sentence) {
    const s = sentence.toLowerCase();
    if (s.includes("calibrate") || s.includes("calibrat")) return "我們校準設備模組以維持高精密度。";
    if (s.includes("inspect") || s.includes("check")) return "檢查該組件狀態以確保符合無塵室規範。";
    if (s.includes("clean") || s.includes("purge")) return "清潔並吹除管路或腔體內的殘留物質。";
    if (s.includes("replace")) return "更換耗損的晶圓廠關鍵組件以防機台警報。";
    if (s.includes("reset")) return "重設機台控制器或安全保護開關。";
    if (s.includes("lock") || s.includes("loto")) return "執行安全斷電與上鎖掛牌工安防護。";
    if (s.includes("transfer") || s.includes("move")) return "機械手臂搬送晶圓至指定反應站點。";
    if (s.includes("adjust")) return "微調設備參數以達成最佳製程條件。";
  }

  return "半導體機台標準維護與溝通例句。";
}
