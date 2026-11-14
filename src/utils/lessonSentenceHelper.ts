import { Lesson } from '../types';
import { lookupWordDefinition } from './wordDictionary';

export interface LessonSentenceItem {
  id: string;
  tag: '句型 1 (極簡金句)' | '句型 2 (進階實戰)' | '句型 3 (交接口報)';
  english: string;
  chinese: string;
  phonetic: string;
  mandarinPhonetic?: string;
  components?: {
    subject: string;
    action: string;
    bridge?: string;
    object: string;
  };
}

const WORD_TO_MANDARIN: Record<string, string> = {
  i: "艾",
  we: "微",
  you: "尤",
  he: "希",
  she: "許",
  they: "賊",
  it: "伊特",
  this: "迪斯",
  that: "達特",
  the: "得",
  a: "額",
  an: "安",
  is: "伊斯",
  are: "阿爾",
  am: "安姆",
  was: "沃斯",
  were: "沃爾",
  has: "哈斯",
  have: "哈夫",
  had: "哈得",
  do: "度",
  does: "達斯",
  did: "迪得",
  can: "看",
  will: "威爾",
  test: "泰斯特",
  tests: "泰斯特斯",
  tested: "泰斯特得",
  testing: "泰斯庭",
  check: "柴克",
  checks: "柴克斯",
  checked: "柴克得",
  checking: "柴晴",
  sensor: "森瑟",
  sensors: "森瑟斯",
  value: "伐琉",
  signal: "席格諾",
  back: "貝克",
  calibrate: "凱利布瑞特",
  calibrates: "凱利布瑞茨",
  calibrated: "凱利布瑞特得",
  calibration: "凱利布瑞遜",
  motor: "摩特",
  motors: "摩特斯",
  position: "珀西遜",
  adjust: "額賈斯特",
  adjusts: "額賈斯特斯",
  done: "當",
  replace: "瑞普雷斯",
  replaces: "瑞普雷斯",
  replaced: "瑞普雷斯特",
  pump: "潘普",
  pumps: "潘普斯",
  dry: "抓愛",
  swap: "斯瓦普",
  swaps: "斯瓦普斯",
  new: "紐",
  run: "潤",
  runs: "潤斯",
  well: "威歐",
  read: "瑞德",
  reads: "瑞德斯",
  error: "艾惹",
  errors: "艾惹斯",
  code: "扣得",
  codes: "扣得斯",
  log: "洛格",
  logs: "洛格斯",
  clear: "克利爾",
  cleared: "克利厄得",
  lock: "洛克",
  locks: "洛克斯",
  locked: "洛克得",
  valve: "伐爾夫",
  valves: "伐爾夫斯",
  close: "克樓斯",
  closes: "克樓斯",
  gas: "蓋斯",
  line: "賴恩",
  lines: "賴恩斯",
  loto: "樓透",
  procedure: "普羅西居爾",
  active: "艾克梯夫",
  clean: "克林",
  cleans: "克林斯",
  cleaned: "克林得",
  chamber: "錢伯",
  chambers: "錢伯斯",
  wipe: "歪普",
  wipes: "歪普斯",
  inner: "因內",
  wall: "瓦歐",
  deposit: "德珀茲特",
  removed: "瑞木夫得",
  align: "額賴恩",
  aligns: "額賴恩斯",
  wafer: "威弗",
  wafers: "威弗斯",
  robot: "羅伯特",
  arm: "阿姆",
  alignment: "額賴恩門特",
  ok: "歐給",
  ready: "瑞蒂",
  now: "鬧",
  interlock: "因特洛克",
  reset: "瑞塞特",
  resets: "瑞塞特斯",
  recipe: "瑞西披",
  recipes: "瑞西披斯",
  vent: "溫特",
  vents: "溫特斯",
  foup: "伏普",
  inspect: "因斯佩克特",
  inspects: "因斯佩克特斯",
  inspection: "因斯佩克遜",
  report: "瑞珀特",
  reports: "瑞珀特斯",
  leak: "莉克",
  leaks: "莉克斯",
  purge: "珀居",
  purges: "珀居斯",
  rf: "阿爾艾夫",
  mfc: "艾姆艾夫席",
  slurry: "斯勒瑞",
  pads: "派德斯",
  flow: "樓",
  pressure: "普累雪",
  alarm: "額浪",
  stop: "斯托普",
  start: "斯塔特",
  open: "歐噴",
  door: "多爾",
  power: "拋爾",
  temp: "坦普",
  temperature: "坦普惹切",
  tool: "圖爾",
  status: "斯塔特斯",
  fine: "凡恩",
  pass: "帕斯",
  fail: "飛歐",
  ng: "恩居",
  high: "嗨",
  low: "樓",
  normal: "諾莫爾",
  warning: "沃寧",
  auto: "歐透",
  manual: "曼紐歐",
  pause: "珀斯",
  paused: "珀斯特",
  production: "普羅達克遜",
  notch: "諾奇",
  save: "塞夫",
  saved: "塞夫得",
  history: "希斯特瑞",
  uploaded: "阿普樓蒂得",
  seal: "希歐",
  ring: "瑞英",
  looks: "路克斯",
  good: "固得",
  reboot: "瑞布特",
  reboots: "瑞布特斯",
  breaker: "布瑞克",
  supply: "斯普賴",
  stable: "斯特波",
  scan: "斯干",
  scans: "斯干斯",
  barcode: "吧扣得",
  verify: "威瑞發",
  verifies: "威瑞發斯",
  success: "瑟克賽斯",
  fill: "費歐",
  oil: "歐伊歐",
  top: "踏普",
  up: "阿普",
  lube: "露伯",
  level: "萊福",
  full: "佛",
  exhaust: "依格佐斯特",
  working: "沃金",
  teach: "梯奇",
  teaches: "梯奇斯",
  teaching: "梯晴",
  point: "珀因特",
  laser: "雷澤",
  pad: "派德",
  plasma: "普拉茲瑪",
  tune: "吞",
  tunes: "吞斯",
  clamp: "克藍普",
  clamps: "克藍普斯",
  count: "康特",
  submit: "薩伯密特",
  submits: "薩伯密特斯",
  lens: "稜斯",
  lenses: "稜斯",
  mirror: "米惹",
  mirrors: "米惹斯",
  reticle: "瑞提口",
  mask: "馬斯克",
  stage: "斯戴居",
  chuck: "洽克",
  filter: "菲爾特",
  filters: "菲爾特斯",
  heater: "希特",
  chiller: "奇勒",
  cable: "凱伯",
  board: "博德",
  switch: "斯威奇",
  screen: "斯克林",
  fan: "凡",
  tube: "圖伯",
  pipe: "派普",
  lid: "利德",
  gauge: "給居",
  scrubber: "斯克拉伯",
  focus: "佛克斯",
  dose: "豆斯",
  defect: "低費克特",
  particle: "帕提口",
  nozzle: "拿走",
  frequency: "芙瑞昆西",
  match: "賣取",
  matches: "賣取斯",
  cylinder: "西林德",
  generator: "哲內瑞特",
  optical: "阿普提口",
  service: "瑟維斯",
  lot: "洛特",
  id: "艾蒂",
  "o-ring": "歐瑞英",
  oring: "歐瑞英",
  okay: "歐開",
  set: "塞特",
  fix: "費克斯",
  fixes: "費克斯",
  fixed: "費克斯特",
  density: "丹西替",
  chlorine: "克羅林",
  etchant: "欸取恩特",
  bypass: "拜帕斯",
  reflected: "瑞弗雷克特",
  steady: "斯泰蒂",
  removal: "瑞木佛",
  rate: "瑞特",
  profile: "普羅發歐",
  head: "黑德",
  isolate: "愛瑟累特",
  turn: "特恩",
  off: "歐夫",
  down: "當",
  safety: "塞夫替",
  keep: "奇普",
  control: "肯綽",
  degas: "低蓋斯",
  tilt: "踢歐特",
  leakage: "莉奇居",
  vibration: "歪布瑞遜",
  threshold: "斯瑞許厚德",
  conditioner: "肯低宣呢",
  viscosity: "微斯卡斯替",
  die: "代",
  dies: "代斯",
  jump: "強普",
  jig: "吉格",
  tuning: "吞寧",
  light: "賴特",
  layout: "雷奧特",
  transfer: "川斯弗",
  detect: "迪泰克特",
  detects: "迪泰克茨",
  empty: "恩普替",
  "2d": "兔迪",
  substrate: "薩伯斯特瑞特",
  c4: "西佛",
  bump: "邦普",
  bumps: "邦普斯",
  couple: "卡波",
  underfill: "安德菲歐",
  pc: "批西",
  ocv: "歐西微",
  ocr: "歐西阿爾",
  cu: "卡珀",
  place: "普雷斯",
  golden: "勾登",
  sample: "山波",
  plc: "批艾歐西",
  mark: "馬克",
  remote: "瑞莫特",
  mode: "莫德"
};

export function getMandarinPhoneticFromSentence(english: string, taiwanPhonetic?: string): string {
  // Always resolve word-by-word using WORD_TO_MANDARIN + wordDictionary so every word gets natural Chinese homophones
  const rawWords = english.replace(/[^\w\s-]/g, '').trim().split(/\s+/).filter(Boolean);
  if (rawWords.length > 0) {
    const mappedWords = rawWords.map((w) => {
      const cleanWord = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!cleanWord) return null;
      if (WORD_TO_MANDARIN[cleanWord]) return WORD_TO_MANDARIN[cleanWord];
      const dictDef = lookupWordDefinition(cleanWord);
      const fromDict = (dictDef?.mandarinPhonetic || dictDef?.taiwanPhonetic || '')
        .replace(/^【\s*|\s*】$/g, '')
        .replace(/\s*-\s*/g, '')
        .trim();
      return fromDict || null;
    }).filter(Boolean);

    if (mappedWords.length === rawWords.length) {
      return `【 ${(mappedWords as string[]).join(' ｜ ')} 】`;
    }
  }

  // Fallback conversion from Taiwanese phonetic: convert any dialect chars and strip all Zhuyin/dashes
  if (taiwanPhonetic) {
    let converted = taiwanPhonetic
      .replace(/愛/g, '艾')
      .replace(/泰-絲-特|泰絲特/g, '泰斯特')
      .replace(/山-瑟|山瑟/g, '森瑟')
      .replace(/切-克|切克/g, '柴克')
      .replace(/德/g, '得')
      .replace(/伐-路|伐路/g, '伐琉')
      .replace(/希-格-諾|希格諾/g, '席格諾')
      .replace(/依-斯|伊斯/g, '伊斯')
      .replace(/貝-克|貝克/g, '貝克')
      .replace(/威/g, '微')
      .replace(/柯-愛-利-伯-瑞-特|柯愛利伯瑞特/g, '凱利布瑞特')
      .replace(/摸-特|摸特/g, '摩特')
      .replace(/額-加-斯-特|額-加-斯特|額加斯特/g, '額賈斯特')
      .replace(/頗-西-閃|頗西閃/g, '珀西遜')
      .replace(/柯-利-伯-瑞-閃|柯利伯瑞閃/g, '凱利布瑞遜')
      .replace(/噹/g, '當')
      .replace(/嘻/g, '希')
      .replace(/瑞-普-雷-斯|瑞普雷斯/g, '瑞普雷斯')
      .replace(/胖-普|胖普/g, '潘普')
      .replace(/斯-瓦-普斯|斯瓦普斯/g, '斯瓦普斯')
      .replace(/抓-愛|抓愛/g, '抓愛')
      .replace(/潤-斯|潤斯/g, '潤斯')
      .replace(/威-歐|威歐/g, '威歐')
      .replace(/扣-德|扣德/g, '扣得')
      .replace(/瑞-德|瑞德/g, '瑞德')
      .replace(/誒-惹|誒惹/g, '艾惹')
      .replace(/羅-格|羅格/g, '洛格')
      .replace(/克-利-厄德|克利厄德/g, '克利厄得')
      .replace(/幽/g, '尤')
      .replace(/羅-克|羅克/g, '洛克')
      .replace(/伐-歐夫|伐歐夫/g, '伐爾夫')
      .replace(/克-樓-斯|克樓斯/g, '克樓斯')
      .replace(/蓋-斯|蓋斯/g, '蓋斯')
      .replace(/賴-恩|賴恩/g, '賴恩')
      .replace(/樓-透|樓透/g, '樓透')
      .replace(/普-囉-西-居-爾|普囉西居爾/g, '普羅西居爾')
      .replace(/誒-克-踢夫|誒克踢夫/g, '艾克梯夫')
      .replace(/賊/g, '賊')
      .replace(/克-林|克林/g, '克林')
      .replace(/錢-伯|錢伯/g, '錢伯')
      .replace(/歪-普|歪普/g, '歪普')
      .replace(/因-內|因內/g, '因內')
      .replace(/瓦-歐|瓦歐/g, '瓦歐')
      .replace(/瑞-蒂|瑞蒂/g, '瑞蒂')
      .replace(/鬧/g, '鬧')
      .replace(/費-克-斯|費克斯/g, '費克斯')
      .replace(/羅-霸-特|羅霸特/g, '羅伯特')
      .replace(/阿-姆|阿姆/g, '阿姆')
      .replace(/昂-賴-恩|昂賴恩/g, '昂賴恩')
      .replace(/斯-搭-普|斯搭普/g, '斯托普')
      .replace(/破-斯|破斯/g, '珀斯')
      .replace(/威-弗|威弗/g, '威弗')
      .replace(/潤/g, '潤')
      .replace(/普-囉-達-克-閃|普囉達克閃/g, '普羅達克遜')
      .replace(/破-斯特|破斯特/g, '珀斯特')
      .replace(/許/g, '許')
      .replace(/額-賴-恩|額賴恩/g, '額賴恩')
      .replace(/額-加-斯特斯|額加斯特斯/g, '額賈斯特斯')
      .replace(/諾-奇|諾奇/g, '諾奇')
      .replace(/額-賴-恩-門特|額賴恩門特/g, '額賴恩門特')
      .replace(/歐-開|歐開/g, '歐開')
      .replace(/ㄙㄟ-夫|ㄙㄟ夫/g, '塞夫')
      .replace(/瑞-破-特|瑞破特/g, '瑞珀特')
      .replace(/瑟-維斯|瑟維斯/g, '瑟維斯')
      .replace(/希-斯-特-瑞|希斯特瑞/g, '希斯特瑞')
      .replace(/阿普-樓-蒂德|阿普樓蒂德/g, '阿普樓蒂得')
      .replace(/印-斯-佩-克特|印斯佩克特/g, '因斯佩克特')
      .replace(/希-歐|希歐/g, '希歐')
      .replace(/歐-瑞-英|歐瑞英/g, '歐瑞英')
      .replace(/路-克斯|路克斯/g, '路克斯')
      .replace(/固-德|固德/g, '固得')
      .replace(/瑞-塞-特|瑞塞特/g, '瑞塞特')
      .replace(/頗-烏|頗烏/g, '拋爾')
      .replace(/瑞-布-特|瑞布特/g, '瑞布特')
      .replace(/ㄅ-瑞-克|ㄅ瑞克/g, '布瑞克')
      .replace(/ㄙ-普-賴|ㄙ普賴/g, '斯普賴')
      .replace(/斯-特-波|斯特波/g, '斯特波')
      .replace(/斯-幹|斯幹/g, '斯干')
      .replace(/吧-扣-德|吧扣德/g, '吧扣得')
      .replace(/威-瑞-發|威瑞發/g, '威瑞發')
      .replace(/芙-普|芙普/g, '伏普')
      .replace(/艾-蒂|艾蒂/g, '艾蒂')
      .replace(/瑟克-賽斯|瑟克賽斯/g, '瑟克賽斯')
      .replace(/費-歐|費歐/g, '費歐')
      .replace(/歐-伊-歐|歐伊歐/g, '歐伊歐')
      .replace(/踏-普|踏普/g, '踏普')
      .replace(/露-伯|露伯/g, '露伯')
      .replace(/萊-福|萊福/g, '萊福')
      .replace(/佛/g, '佛')
      .replace(/破-居|破居/g, '珀居')
      .replace(/剔-奇-英|剔奇英/g, '梯晴')
      .replace(/剔-奇|剔奇/g, '梯奇')
      .replace(/普-瑞-瑟|普瑞瑟/g, '普累雪')
      .replace(/依格-佐-斯特|依格佐斯特/g, '依格佐斯特')
      .replace(/沃-金|沃金/g, '沃金')
      .replace(/利-克|利克/g, '莉克')
      .replace(/塞-特|塞特/g, '塞特')
      .replace(/頗-因特|頗因特/g, '珀因特')
      .replace(/ㄅ/g, '布')
      .replace(/ㄆ/g, '普')
      .replace(/ㄇ/g, '姆')
      .replace(/ㄈ/g, '弗')
      .replace(/ㄉ/g, '得')
      .replace(/ㄊ/g, '特')
      .replace(/ㄋ/g, '訥')
      .replace(/ㄌ/g, '勒')
      .replace(/ㄍ/g, '格')
      .replace(/ㄎ/g, '克')
      .replace(/ㄏ/g, '喝')
      .replace(/ㄐ/g, '吉')
      .replace(/ㄑ/g, '奇')
      .replace(/ㄒ/g, '西')
      .replace(/ㄓ/g, '知')
      .replace(/ㄔ/g, '吃')
      .replace(/ㄕ/g, '詩')
      .replace(/ㄖ/g, '日')
      .replace(/ㄗ/g, '資')
      .replace(/ㄘ/g, '次')
      .replace(/ㄙ/g, '斯')
      .replace(/ㄚ/g, '阿')
      .replace(/ㄛ/g, '歐')
      .replace(/ㄜ/g, '額')
      .replace(/ㄝ/g, '耶')
      .replace(/ㄞ/g, '愛')
      .replace(/ㄟ/g, '欸')
      .replace(/ㄠ/g, '奧')
      .replace(/ㄡ/g, '歐')
      .replace(/ㄢ/g, '安')
      .replace(/ㄣ/g, '恩')
      .replace(/ㄤ/g, '昂')
      .replace(/ㄥ/g, '能')
      .replace(/ㄦ/g, '爾')
      .replace(/ㄧ/g, '伊')
      .replace(/ㄨ/g, '烏')
      .replace(/ㄩ/g, '魚')
      .replace(/[\u3105-\u312F\u02CA\u02C7\u02CB\u02D9-]/g, '');

    return converted;
  }

  const fallbackMapped = rawWords.map(w => {
    const lower = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    return WORD_TO_MANDARIN[lower] || w;
  });

  return `【 ${fallbackMapped.join(' ｜ ')} 】`;
}

const PRESET_EXTRA_SENTENCES: Record<string, LessonSentenceItem[]> = {
  "preset-1": [
    {
      id: "p1-s1",
      tag: "句型 1 (極簡金句)",
      english: "I test the sensor.",
      chinese: "我測試這個感應器。",
      phonetic: "【 愛 ｜ 泰-絲-特 ｜ 德 ｜ 山-瑟 】",
      mandarinPhonetic: "【 艾 ｜ 泰斯特 ｜ 得 ｜ 森瑟 】"
    },
    {
      id: "p1-s2",
      tag: "句型 2 (進階實戰)",
      english: "I check the sensor value.",
      chinese: "我檢查感應器數值。",
      phonetic: "【 愛 ｜ 切-克 ｜ 德 ｜ 山-瑟 ｜ 伐-路 】",
      mandarinPhonetic: "【 艾 ｜ 柴克 ｜ 得 ｜ 森瑟 ｜ 伐琉 】"
    },
    {
      id: "p1-s3",
      tag: "句型 3 (交接口報)",
      english: "The sensor signal is back.",
      chinese: "感應器訊號已恢復正常。",
      phonetic: "【 德 ｜ 山-瑟 ｜ 希-格-諾 ｜ 依-斯 ｜ 貝-克 】",
      mandarinPhonetic: "【 得 ｜ 森瑟 ｜ 席格諾 ｜ 伊斯 ｜ 貝克 】"
    }
  ],
  "preset-2": [
    {
      id: "p2-s1",
      tag: "句型 1 (極簡金句)",
      english: "We calibrate the motor.",
      chinese: "我們校正這個馬達。",
      phonetic: "【 威 ｜ 柯-愛-利-伯-瑞-特 ｜ 德 ｜ 摸-特 】",
      mandarinPhonetic: "【 微 ｜ 凱利布瑞特 ｜ 得 ｜ 摩特 】"
    },
    {
      id: "p2-s2",
      tag: "句型 2 (進階實戰)",
      english: "We adjust the motor position.",
      chinese: "我們微調馬達位置。",
      phonetic: "【 威 ｜ 額-加-斯特 ｜ 德 ｜ 摸-特 ｜ 頗-西-閃 】",
      mandarinPhonetic: "【 微 ｜ 額賈斯特 ｜ 得 ｜ 摩特 ｜ 珀西遜 】"
    },
    {
      id: "p2-s3",
      tag: "句型 3 (交接口報)",
      english: "Motor calibration is done.",
      chinese: "馬達校正程序已完成。",
      phonetic: "【 摸-特 ｜ 柯-利-伯-瑞-閃 ｜ 依-斯 ｜ 噹 】",
      mandarinPhonetic: "【 摩特 ｜ 凱利布瑞遜 ｜ 伊斯 ｜ 當 】"
    }
  ],
  "preset-3": [
    {
      id: "p3-s1",
      tag: "句型 1 (極簡金句)",
      english: "He replaces the pump.",
      chinese: "他更換這個幫浦。",
      phonetic: "【 嘻 ｜ 瑞-普-雷-斯 ｜ 德 ｜ 胖-普 】",
      mandarinPhonetic: "【 希 ｜ 瑞普雷斯 ｜ 得 ｜ 潘普 】"
    },
    {
      id: "p3-s2",
      tag: "句型 2 (進階實戰)",
      english: "He swaps the dry pump.",
      chinese: "他替換乾式真空幫浦。",
      phonetic: "【 嘻 ｜ 斯-瓦-普斯 ｜ 德 ｜ 抓-愛 ｜ 胖-普 】",
      mandarinPhonetic: "【 希 ｜ 斯瓦普斯 ｜ 得 ｜ 抓愛 ｜ 潘普 】"
    },
    {
      id: "p3-s3",
      tag: "句型 3 (交接口報)",
      english: "The new pump runs well.",
      chinese: "新幫浦運轉抽氣正常。",
      phonetic: "【 德 ｜ 紐 ｜ 胖-普 ｜ 潤-斯 ｜ 威-歐 】",
      mandarinPhonetic: "【 得 ｜ 紐 ｜ 潘普 ｜ 潤斯 ｜ 威歐 】"
    }
  ],
  "preset-4": [
    {
      id: "p4-s1",
      tag: "句型 1 (極簡金句)",
      english: "I check the code.",
      chinese: "我檢查這個錯誤代碼。",
      phonetic: "【 愛 ｜ 切-克 ｜ 德 ｜ 扣-德 】",
      mandarinPhonetic: "【 艾 ｜ 柴克 ｜ 得 ｜ 扣得 】"
    },
    {
      id: "p4-s2",
      tag: "句型 2 (進階實戰)",
      english: "I read the error log.",
      chinese: "我讀取警報記錄檔。",
      phonetic: "【 愛 ｜ 瑞-德 ｜ 德 ｜ 誒-惹 ｜ 羅-格 】",
      mandarinPhonetic: "【 艾 ｜ 瑞德 ｜ 得 ｜ 艾惹 ｜ 洛格 】"
    },
    {
      id: "p4-s3",
      tag: "句型 3 (交接口報)",
      english: "The error code is cleared.",
      chinese: "錯誤代碼警報已清除。",
      phonetic: "【 德 ｜ 誒-惹 ｜ 扣-德 ｜ 依-斯 ｜ 克-利-厄德 】",
      mandarinPhonetic: "【 得 ｜ 艾惹 ｜ 扣得 ｜ 伊斯 ｜ 克利厄得 】"
    }
  ],
  "preset-8": [
    {
      id: "p8-s1",
      tag: "句型 1 (極簡金句)",
      english: "We stop the line.",
      chinese: "我們停止這條產線。",
      phonetic: "【 威 ｜ 斯-搭-普 ｜ 德 ｜ 賴-恩 】",
      mandarinPhonetic: "【 微 ｜ 斯托普 ｜ 得 ｜ 賴恩 】"
    },
    {
      id: "p8-s2",
      tag: "句型 2 (進階實戰)",
      english: "We pause the wafer run.",
      chinese: "我們暫停晶圓運轉貨批。",
      phonetic: "【 威 ｜ 破-斯 ｜ 德 ｜ 威-弗 ｜ 潤 】",
      mandarinPhonetic: "【 微 ｜ 珀斯 ｜ 得 ｜ 威弗 ｜ 潤 】"
    },
    {
      id: "p8-s3",
      tag: "句型 3 (交接口報)",
      english: "Production line is paused.",
      chinese: "生產線目前安全扣機暫停中。",
      phonetic: "【 普-囉-達-克-閃 ｜ 賴-恩 ｜ 依-斯 ｜ 破-斯特 】",
      mandarinPhonetic: "【 普羅達克遜 ｜ 賴恩 ｜ 伊斯 ｜ 珀斯特 】"
    }
  ],
  "preset-9": [
    {
      id: "p9-s1",
      tag: "句型 1 (極簡金句)",
      english: "She aligns the wafer.",
      chinese: "她對齊這片晶圓。",
      phonetic: "【 許 ｜ 額-賴-恩斯 ｜ 德 ｜ 威-弗 】",
      mandarinPhonetic: "【 許 ｜ 額賴恩斯 ｜ 得 ｜ 威弗 】"
    },
    {
      id: "p9-s2",
      tag: "句型 2 (進階實戰)",
      english: "She adjusts the notch.",
      chinese: "她校正晶圓 Notch 缺口。",
      phonetic: "【 許 ｜ 額-加-斯特斯 ｜ 德 ｜ 諾-奇 】",
      mandarinPhonetic: "【 許 ｜ 額賈斯特斯 ｜ 得 ｜ 諾奇 】"
    },
    {
      id: "p9-s3",
      tag: "句型 3 (交接口報)",
      english: "Wafer alignment is okay.",
      chinese: "晶圓對齊校正無偏差。",
      phonetic: "【 威-弗 ｜ 額-賴-恩-門特 ｜ 依-斯 ｜ 歐-開 】",
      mandarinPhonetic: "【 威弗 ｜ 額賴恩門特 ｜ 伊斯 ｜ 歐開 】"
    }
  ],
  "preset-10": [
    {
      id: "p10-s1",
      tag: "句型 1 (極簡金句)",
      english: "I save the report.",
      chinese: "我儲存這份報告。",
      phonetic: "【 愛 ｜ 塞-夫 ｜ 德 ｜ 瑞-破-特 】",
      mandarinPhonetic: "【 艾 ｜ 塞夫 ｜ 得 ｜ 瑞珀特 】"
    },
    {
      id: "p10-s2",
      tag: "句型 2 (進階實戰)",
      english: "I log the service history.",
      chinese: "我記錄維修服務履歷。",
      phonetic: "【 愛 ｜ 羅-格 ｜ 德 ｜ 瑟-維斯 ｜ 希-斯-特-瑞 】",
      mandarinPhonetic: "【 艾 ｜ 洛格 ｜ 得 ｜ 瑟維斯 ｜ 希斯特瑞 】"
    },
    {
      id: "p10-s3",
      tag: "句型 3 (交接口報)",
      english: "Service report is uploaded.",
      chinese: "維修服務報告已傳給主管。",
      phonetic: "【 瑟-維斯 ｜ 瑞-破-特 ｜ 依-斯 ｜ 阿普-樓-蒂德 】",
      mandarinPhonetic: "【 瑟維斯 ｜ 瑞珀特 ｜ 伊斯 ｜ 阿普樓蒂得 】"
    }
  ],
  "preset-11": [
    {
      id: "p11-s1",
      tag: "句型 1 (極簡金句)",
      english: "We inspect the seal.",
      chinese: "我們檢查這個密封圈。",
      phonetic: "【 威 ｜ 印-斯-佩-克特 ｜ 德 ｜ 希-歐 】",
      mandarinPhonetic: "【 微 ｜ 因斯佩克特 ｜ 得 ｜ 希歐 】"
    },
    {
      id: "p11-s2",
      tag: "句型 2 (進階實戰)",
      english: "We check the O-ring.",
      chinese: "我們檢查 O 型環彈性與磨損。",
      phonetic: "【 威 ｜ 切-克 ｜ 德 ｜ 歐-瑞-英 】",
      mandarinPhonetic: "【 微 ｜ 柴克 ｜ 得 ｜ 歐瑞英 】"
    },
    {
      id: "p11-s3",
      tag: "句型 3 (交接口報)",
      english: "The O-ring looks good.",
      chinese: "O 型環狀態完好無龜裂。",
      phonetic: "【 德 ｜ 歐-瑞-英 ｜ 路-克斯 ｜ 固-德 】",
      mandarinPhonetic: "【 得 ｜ 歐瑞英 ｜ 路克斯 ｜ 固得 】"
    }
  ],
  "preset-12": [
    {
      id: "p12-s1",
      tag: "句型 1 (極簡金句)",
      english: "He resets the power.",
      chinese: "他重置這個電源。",
      phonetic: "【 嘻 ｜ 瑞-塞-特斯 ｜ 德 ｜ 頗-烏 】",
      mandarinPhonetic: "【 希 ｜ 瑞塞特斯 ｜ 得 ｜ 拋爾 】"
    },
    {
      id: "p12-s2",
      tag: "句型 2 (進階實戰)",
      english: "He reboots the breaker.",
      chinese: "他重啟無熔絲斷路器。",
      phonetic: "【 嘻 ｜ 瑞-布-特斯 ｜ 德 ｜ 布-瑞-克 】",
      mandarinPhonetic: "【 希 ｜ 瑞布特斯 ｜ 得 ｜ 布瑞克 】"
    },
    {
      id: "p12-s3",
      tag: "句型 3 (交接口報)",
      english: "Power supply is stable.",
      chinese: "電源供應電壓已恢復穩定。",
      phonetic: "【 頗-烏 ｜ 斯-普-賴 ｜ 依-斯 ｜ 斯-特-波 】",
      mandarinPhonetic: "【 拋爾 ｜ 斯普賴 ｜ 伊斯 ｜ 斯特波 】"
    }
  ],
  "preset-13": [
    {
      id: "p13-s1",
      tag: "句型 1 (極簡金句)",
      english: "I scan the barcode.",
      chinese: "我掃描這個條碼。",
      phonetic: "【 愛 ｜ 斯-幹 ｜ 德 ｜ 吧-扣-德 】",
      mandarinPhonetic: "【 艾 ｜ 斯干 ｜ 得 ｜ 吧扣得 】"
    },
    {
      id: "p13-s2",
      tag: "句型 2 (進階實戰)",
      english: "I verify the FOUP ID.",
      chinese: "我核對晶圓盒 FOUP ID。",
      phonetic: "【 愛 ｜ 威-瑞-發 ｜ 德 ｜ 芙-普 ｜ 艾-蒂 】",
      mandarinPhonetic: "【 艾 ｜ 威瑞發 ｜ 得 ｜ 伏普 ｜ 艾蒂 】"
    },
    {
      id: "p13-s3",
      tag: "句型 3 (交接口報)",
      english: "Barcode scan is done.",
      chinese: "條碼掃描核對完成。",
      phonetic: "【 吧-扣-德 ｜ 斯-幹 ｜ 依-斯 ｜ 當 】",
      mandarinPhonetic: "【 吧扣得 ｜ 斯干 ｜ 伊斯 ｜ 當 】"
    }
  ],
  "preset-14": [
    {
      id: "p14-s1",
      tag: "句型 1 (極簡金句)",
      english: "They fill the oil.",
      chinese: "他們加滿這個潤滑油。",
      phonetic: "【 賊 ｜ 費-歐 ｜ 德 ｜ 歐-伊-歐 】",
      mandarinPhonetic: "【 賊 ｜ 費歐 ｜ 得 ｜ 歐伊歐 】"
    },
    {
      id: "p14-s2",
      tag: "句型 2 (進階實戰)",
      english: "They top up the lube.",
      chinese: "他們補充真空油與齒輪油。",
      phonetic: "【 賊 ｜ 踏-普 ｜ 阿普 ｜ 德 ｜ 露-伯 】",
      mandarinPhonetic: "【 賊 ｜ 踏普 ｜ 阿普 ｜ 得 ｜ 露伯 】"
    },
    {
      id: "p14-s3",
      tag: "句型 3 (交接口報)",
      english: "Oil level is full now.",
      chinese: "油位指針已加滿至正常高度。",
      phonetic: "【 歐-伊-歐 ｜ 萊-福 ｜ 依-斯 ｜ 佛 ｜ 鬧 】",
      mandarinPhonetic: "【 歐伊歐 ｜ 萊福 ｜ 伊斯 ｜ 佛 ｜ 鬧 】"
    }
  ],
  "preset-15": [
    {
      id: "p15-s1",
      tag: "句型 1 (極簡金句)",
      english: "We inspect the valve.",
      chinese: "我們檢視這個排氣閥。",
      phonetic: "【 威 ｜ 印-斯-佩-克特 ｜ 德 ｜ 伐-歐夫 】",
      mandarinPhonetic: "【 微 ｜ 因斯佩克特 ｜ 得 ｜ 伐爾夫 】"
    },
    {
      id: "p15-s2",
      tag: "句型 2 (進階實戰)",
      english: "We test the pressure.",
      chinese: "我們測試管路迴路壓力。",
      phonetic: "【 威 ｜ 泰-絲-特 ｜ 德 ｜ 普-瑞-瑟 】",
      mandarinPhonetic: "【 微 ｜ 泰斯特 ｜ 得 ｜ 普累雪 】"
    },
    {
      id: "p15-s3",
      tag: "句型 3 (交接口報)",
      english: "Exhaust valve is working.",
      chinese: "排氣閥排氣開關順暢。",
      phonetic: "【 依格-佐-斯特 ｜ 伐-歐夫 ｜ 依-斯 ｜ 沃-金 】",
      mandarinPhonetic: "【 依格佐斯特 ｜ 伐爾夫 ｜ 伊斯 ｜ 沃金 】"
    }
  ],
  "preset-16": [
    {
      id: "p16-s1",
      tag: "句型 1 (極簡金句)",
      english: "I fix the leak.",
      chinese: "我修復這個洩漏。",
      phonetic: "【 愛 ｜ 費-克-斯 ｜ 德 ｜ 利-克 】",
      mandarinPhonetic: "【 艾 ｜ 費克斯 ｜ 得 ｜ 莉克 】"
    },
    {
      id: "p16-s2",
      tag: "句型 2 (進階實戰)",
      english: "I stop the gas leak.",
      chinese: "我止住氣體管路洩漏。",
      phonetic: "【 愛 ｜ 斯-搭-普 ｜ 德 ｜ 蓋-斯 ｜ 利-克 】",
      mandarinPhonetic: "【 艾 ｜ 斯托普 ｜ 得 ｜ 蓋斯 ｜ 莉克 】"
    },
    {
      id: "p16-s3",
      tag: "句型 3 (交接口報)",
      english: "Gas pressure is stable.",
      chinese: "管路壓力已止跌回升且穩定。",
      phonetic: "【 蓋-斯 ｜ 普-瑞-瑟 ｜ 依-斯 ｜ 斯-特-波 】",
      mandarinPhonetic: "【 蓋斯 ｜ 普累雪 ｜ 伊斯 ｜ 斯特波 】"
    }
  ],
  "preset-17": [
    {
      id: "p17-s1",
      tag: "句型 1 (極簡金句)",
      english: "We teach the robot.",
      chinese: "我們教導這個手臂。",
      phonetic: "【 威 ｜ 剔-奇 ｜ 德 ｜ 羅-霸-特 】",
      mandarinPhonetic: "【 微 ｜ 梯奇 ｜ 得 ｜ 羅伯特 】"
    },
    {
      id: "p17-s2",
      tag: "句型 2 (進階實戰)",
      english: "We set the teach point.",
      chinese: "我們校正教導原點位置。",
      phonetic: "【 威 ｜ 塞-特 ｜ 德 ｜ 剔-奇 ｜ 頗-因特 】",
      mandarinPhonetic: "【 微 ｜ 塞特 ｜ 得 ｜ 梯奇 ｜ 珀因特 】"
    },
    {
      id: "p17-s3",
      tag: "句型 3 (交接口報)",
      english: "Robot teaching is done.",
      chinese: "手臂教導傳輸測試合格完畢。",
      phonetic: "【 羅-霸-特 ｜ 剔-奇-英 ｜ 依-斯 ｜ 噹 】",
      mandarinPhonetic: "【 羅伯特 ｜ 梯晴 ｜ 伊斯 ｜ 當 】"
    }
  ],
  "preset-18": [
    {
      id: "p18-s1",
      tag: "句型 1 (極簡金句)",
      english: "I align the laser.",
      chinese: "我對準這個雷射。",
      phonetic: "【 愛 ｜ 額-賴-恩 ｜ 德 ｜ 雷-澤 】",
      mandarinPhonetic: "【 艾 ｜ 額賴恩 ｜ 得 ｜ 雷澤 】"
    },
    {
      id: "p18-s2",
      tag: "句型 2 (進階實戰)",
      english: "I check the laser focus.",
      chinese: "我檢查雷射對焦狀態。",
      phonetic: "【 愛 ｜ 切-克 ｜ 德 ｜ 雷-澤 ｜ 佛-克-斯 】",
      mandarinPhonetic: "【 艾 ｜ 柴克 ｜ 得 ｜ 雷澤 ｜ 佛克斯 】"
    },
    {
      id: "p18-s3",
      tag: "句型 3 (交接口報)",
      english: "The laser power is stable.",
      chinese: "雷射功率目前輸出穩定。",
      phonetic: "【 德 ｜ 雷-澤 ｜ 頗-烏 ｜ 依-斯 ｜ 斯-特-波 】",
      mandarinPhonetic: "【 得 ｜ 雷澤 ｜ 拋爾 ｜ 伊斯 ｜ 斯特波 】"
    }
  ],
  "preset-19": [
    {
      id: "p19-s1",
      tag: "句型 1 (極簡金句)",
      english: "We replace the pad.",
      chinese: "我們更換這個研磨墊。",
      phonetic: "【 威 ｜ 瑞-普-雷-斯 ｜ 德 ｜ 拍-德 】",
      mandarinPhonetic: "【 微 ｜ 瑞普雷斯 ｜ 得 ｜ 派德 】"
    },
    {
      id: "p19-s2",
      tag: "句型 2 (進階實戰)",
      english: "We check the slurry flow.",
      chinese: "我們檢查研磨液流量。",
      phonetic: "【 威 ｜ 切-克 ｜ 德 ｜ 斯-勒-瑞 ｜ 樓 】",
      mandarinPhonetic: "【 微 ｜ 柴克 ｜ 得 ｜ 斯勒瑞 ｜ 樓 】"
    },
    {
      id: "p19-s3",
      tag: "句型 3 (交接口報)",
      english: "The new pad is ready.",
      chinese: "新研磨墊已安裝就緒。",
      phonetic: "【 德 ｜ 紐 ｜ 拍-德 ｜ 依-斯 ｜ 瑞-蒂 】",
      mandarinPhonetic: "【 得 ｜ 紐 ｜ 派德 ｜ 伊斯 ｜ 瑞蒂 】"
    }
  ],
  "preset-20": [
    {
      id: "p20-s1",
      tag: "句型 1 (極簡金句)",
      english: "I tune the plasma.",
      chinese: "我調諧這個電漿。",
      phonetic: "【 愛 ｜ 吞 ｜ 德 ｜ 普-拉-茲-瑪 】",
      mandarinPhonetic: "【 艾 ｜ 吞 ｜ 得 ｜ 普拉茲瑪 】"
    },
    {
      id: "p20-s2",
      tag: "句型 2 (進階實戰)",
      english: "I match the RF power.",
      chinese: "我匹配射頻電源功率。",
      phonetic: "【 愛 ｜ 賣-取 ｜ 德 ｜ 阿爾-艾夫 ｜ 頗-烏 】",
      mandarinPhonetic: "【 艾 ｜ 賣取 ｜ 得 ｜ 阿爾艾夫 ｜ 拋爾 】"
    },
    {
      id: "p20-s3",
      tag: "句型 3 (交接口報)",
      english: "The plasma is stable now.",
      chinese: "電漿放電目前已穩定。",
      phonetic: "【 德 ｜ 普-拉-茲-瑪 ｜ 依-斯 ｜ 斯-特-波 ｜ 鬧 】",
      mandarinPhonetic: "【 得 ｜ 普拉茲瑪 ｜ 伊斯 ｜ 斯特波 ｜ 鬧 】"
    }
  ],
  "preset-21": [
    {
      id: "p21-s1",
      tag: "句型 1 (極簡金句)",
      english: "We purge the scrubber.",
      chinese: "我們吹掃這個洗滌塔。",
      phonetic: "【 威 ｜ 頗-哲 ｜ 德 ｜ 斯-克-拉-伯 】",
      mandarinPhonetic: "【 微 ｜ 珀居 ｜ 得 ｜ 斯克拉伯 】"
    },
    {
      id: "p21-s2",
      tag: "句型 2 (進階實戰)",
      english: "We check the exhaust line.",
      chinese: "我們檢查排氣管路。",
      phonetic: "【 威 ｜ 切-克 ｜ 德 ｜ 依格-佐-斯特 ｜ 賴-恩 】",
      mandarinPhonetic: "【 微 ｜ 柴克 ｜ 得 ｜ 依格佐斯特 ｜ 賴恩 】"
    },
    {
      id: "p21-s3",
      tag: "句型 3 (交接口報)",
      english: "The scrubber is normal.",
      chinese: "洗滌塔目前運作正常。",
      phonetic: "【 德 ｜ 斯-克-拉-伯 ｜ 依-斯 ｜ 諾-莫爾 】",
      mandarinPhonetic: "【 得 ｜ 斯克拉伯 ｜ 伊斯 ｜ 諾莫爾 】"
    }
  ],
  "preset-22": [
    {
      id: "p22-s1",
      tag: "句型 1 (極簡金句)",
      english: "The robot clamps the FOUP.",
      chinese: "手臂夾持這個晶圓盒。",
      phonetic: "【 德 ｜ 羅-霸-特 ｜ 克-藍-普-斯 ｜ 德 ｜ 富-普 】",
      mandarinPhonetic: "【 得 ｜ 羅伯特 ｜ 克藍普斯 ｜ 得 ｜ 伏普 】"
    },
    {
      id: "p22-s2",
      tag: "句型 2 (進階實戰)",
      english: "We check the FOUP door.",
      chinese: "我們檢查晶圓盒艙門。",
      phonetic: "【 威 ｜ 切-克 ｜ 德 ｜ 富-普 ｜ 多-爾 】",
      mandarinPhonetic: "【 微 ｜ 柴克 ｜ 得 ｜ 伏普 ｜ 多爾 】"
    },
    {
      id: "p22-s3",
      tag: "句型 3 (交接口報)",
      english: "The FOUP is locked now.",
      chinese: "晶圓盒目前已安全鎖固。",
      phonetic: "【 德 ｜ 富-普 ｜ 依-斯 ｜ 洛-克-得 ｜ 鬧 】",
      mandarinPhonetic: "【 得 ｜ 伏普 ｜ 伊斯 ｜ 洛克得 ｜ 鬧 】"
    }
  ],
  "preset-23": [
    {
      id: "p23-s1",
      tag: "句型 1 (極簡金句)",
      english: "I verify the count.",
      chinese: "我驗證這個計數值。",
      phonetic: "【 愛 ｜ 維-瑞-法-愛 ｜ 德 ｜ 康-特 】",
      mandarinPhonetic: "【 艾 ｜ 威瑞發 ｜ 得 ｜ 康特 】"
    },
    {
      id: "p23-s2",
      tag: "句型 2 (進階實戰)",
      english: "I check the particle count.",
      chinese: "我檢查微塵顆粒計數。",
      phonetic: "【 愛 ｜ 切-克 ｜ 德 ｜ 帕-提-口 ｜ 康-特 】",
      mandarinPhonetic: "【 艾 ｜ 柴克 ｜ 得 ｜ 帕提口 ｜ 康特 】"
    },
    {
      id: "p23-s3",
      tag: "句型 3 (交接口報)",
      english: "The count is normal.",
      chinese: "落塵計數值符合標準。",
      phonetic: "【 德 ｜ 康-特 ｜ 依-斯 ｜ 諾-莫爾 】",
      mandarinPhonetic: "【 得 ｜ 康特 ｜ 伊斯 ｜ 諾莫爾 】"
    }
  ],
  "preset-24": [
    {
      id: "p24-s1",
      tag: "句型 1 (極簡金句)",
      english: "We submit the log.",
      chinese: "我們提交這份日誌。",
      phonetic: "【 威 ｜ 薩-伯-密-特 ｜ 德 ｜ 樂-格 】",
      mandarinPhonetic: "【 微 ｜ 薩伯密特 ｜ 得 ｜ 洛格 】"
    },
    {
      id: "p24-s2",
      tag: "句型 2 (進階實戰)",
      english: "We save the error log.",
      chinese: "我們儲存異常紀錄檔。",
      phonetic: "【 威 ｜ 塞-夫 ｜ 德 ｜ 艾-惹 ｜ 洛-格 】",
      mandarinPhonetic: "【 微 ｜ 塞夫 ｜ 得 ｜ 艾惹 ｜ 洛格 】"
    },
    {
      id: "p24-s3",
      tag: "句型 3 (交接口報)",
      english: "The log is uploaded.",
      chinese: "維修日誌已上傳完成。",
      phonetic: "【 德 ｜ 洛-格 ｜ 依-斯 ｜ 阿普-樓-蒂-得 】",
      mandarinPhonetic: "【 得 ｜ 洛格 ｜ 伊斯 ｜ 阿普樓蒂得 】"
    }
  ]
};

export function getLessonAllSentences(lesson: Lesson): LessonSentenceItem[] {
  // If the preset has custom 3 sentences, return them with guaranteed mandarinPhonetic!
  if (PRESET_EXTRA_SENTENCES[lesson.id]) {
    return PRESET_EXTRA_SENTENCES[lesson.id].map((s) => ({
      ...s,
      mandarinPhonetic: getMandarinPhoneticFromSentence(s.english, s.phonetic)
    }));
  }

  // Dynamic fallback for custom/AI/3-day lessons — zero raw English inside Chinese translations!
  const rawObjectStr = lesson.components.object || 'the tool';
  const cleanObjectWithArticle = rawObjectStr
    .replace(/\s*[\(（\[【\{][^\)）\]\}]*[\)）\]\}]/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u4e00-\u9fa5]/g, '')
    .replace(/[.,!?;:]+$/g, '')
    .trim() || 'the tool';

  const pureNoun = cleanObjectWithArticle.replace(/^(the|a|an|this|that)\s+/i, '').trim() || 'tool';
  const objectWithThe = `the ${pureNoun}`;
  const capitalizedObjectWithThe = `The ${pureNoun}`;

  // Extract pure Chinese meaning for the object noun
  let objectChinese = '';
  const parenMatch = rawObjectStr.match(/[\(（]([^\)）]+)[\)）]/);
  if (parenMatch && parenMatch[1]) {
    objectChinese = parenMatch[1]
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[a-zA-Z]+\.?/g, '')
      .replace(/^那個|^這個/g, '')
      .split('/')[0]
      .trim();
  }
  if (!objectChinese) {
    const nounWords = pureNoun.split(/\s+/).filter(Boolean);
    const looked = nounWords
      .map((w) =>
        lookupWordDefinition(w)
          ?.translation?.replace(/\s*[\(（][^\)）]*[\)）]/g, '')
          .split('/')[0]
          ?.trim()
      )
      .filter(Boolean);
    objectChinese = looked.join('') || '設備零件';
  }

  const s1English = lesson.english_sentence;
  const s1Mandarin = getMandarinPhoneticFromSentence(s1English, lesson.phonetic_taiwan);
  const s2English = `I check ${objectWithThe}.`;
  const s2Mandarin = getMandarinPhoneticFromSentence(s2English);
  const s3English = `${capitalizedObjectWithThe} is ready.`;
  const s3Mandarin = getMandarinPhoneticFromSentence(s3English);

  return [
    {
      id: `${lesson.id}-s1`,
      tag: "句型 1 (極簡金句)",
      english: s1English,
      chinese: lesson.chinese_translation || `我處理這個${objectChinese}。`,
      phonetic: s1Mandarin,
      mandarinPhonetic: s1Mandarin
    },
    {
      id: `${lesson.id}-s2`,
      tag: "句型 2 (進階實戰)",
      english: s2English,
      chinese: `我檢查這個${objectChinese}。`,
      phonetic: s2Mandarin,
      mandarinPhonetic: s2Mandarin
    },
    {
      id: `${lesson.id}-s3`,
      tag: "句型 3 (交接口報)",
      english: s3English,
      chinese: `這個${objectChinese}已準備就緒。`,
      phonetic: s3Mandarin,
      mandarinPhonetic: s3Mandarin
    }
  ];
}

export function cleanComponentText(text: string): string {
  if (!text) return '';
  return text.replace(/^[•\-\*👤🏃🌉📦\s]+/, '').replace(/[.,!?;:]+$/g, '').trim();
}

export function getSentenceComponents(lesson: Lesson, sentenceItem: LessonSentenceItem): {
  subject: string;
  action: string;
  bridge: string;
  object: string;
} {
  const sanitize = (str?: string, defaultVal: string = '') => {
    if (!str) return defaultVal;
    return str.replace(/[.,!?;:]+$/g, '').trim();
  };

  const stripLeadingTheFromObject = (objStr: string, bridgeStr: string) => {
    const cleanB = bridgeStr.replace(/\s*[\(（][^\)）]*[\)）]/g, '').trim().toLowerCase();
    if (cleanB === 'the' || cleanB === 'a' || cleanB === 'an') {
      return objStr.replace(new RegExp(`^${cleanB}\\s+`, 'i'), '').trim() || objStr;
    }
    return objStr;
  };

  if (sentenceItem.components) {
    const b = sanitize(sentenceItem.components.bridge, 'the');
    return {
      subject: sanitize(sentenceItem.components.subject),
      action: sanitize(sentenceItem.components.action),
      bridge: b,
      object: stripLeadingTheFromObject(sanitize(sentenceItem.components.object), b),
    };
  }

  // If this sentence matches the main lesson sentence, prefer lesson.components directly!
  if (
    sentenceItem.english.trim().toLowerCase() === lesson.english_sentence.trim().toLowerCase() &&
    lesson.components
  ) {
    const b = sanitize(lesson.components.bridge, 'the');
    return {
      subject: sanitize(lesson.components.subject),
      action: sanitize(lesson.components.action),
      bridge: b,
      object: stripLeadingTheFromObject(sanitize(lesson.components.object), b),
    };
  }

  // Intelligent SVO parser for 3-6 word cleanroom sentences (handles "The robot clamps the FOUP", "The sensor signal is back", "They top up the lube", etc.)
  const words = sentenceItem.english
    .replace(/[.,!?;:]+$/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  // Pattern A: "... is/are <adj/state>" (e.g. "The sensor signal is back", "Motor calibration is done", "Oil level is full now")
  const beIdx = words.findIndex((w, i) => i > 0 && /^(is|are|was|were)$/i.test(w));
  if (beIdx > 0 && beIdx < words.length - 1) {
    const subjWords = words.slice(0, beIdx);
    const beWord = words[beIdx];
    const restWords = words.slice(beIdx + 1);
    return {
      subject: subjWords.join(' '),
      action: beWord,
      bridge: subjWords[0]?.toLowerCase() === 'the' ? 'the' : beWord,
      object: restWords.join(' ')
    };
  }

  // Pattern B: Sentence has an explicit article ("the" / "a" / "an") in the middle (e.g. "He swaps the dry pump", "They top up the lube", "The robot clamps the FOUP")
  const midArticleIdx = words.findIndex((w, i) => i >= 1 && i < words.length - 1 && /^(the|a|an|this|that)$/i.test(w));
  if (midArticleIdx >= 1) {
    let subjWords: string[] = [];
    let actWords: string[] = [];
    if (midArticleIdx === 1) {
      subjWords = [words[0]];
      actWords = [words[1]];
    } else if (/^(the|a|an|this|that)$/i.test(words[0]) && midArticleIdx >= 2) {
      subjWords = words.slice(0, midArticleIdx - 1);
      actWords = [words[midArticleIdx - 1]];
    } else {
      subjWords = [words[0]];
      actWords = words.slice(1, midArticleIdx);
    }
    return {
      subject: subjWords.join(' '),
      action: actWords.join(' '),
      bridge: words[midArticleIdx],
      object: words.slice(midArticleIdx + 1).join(' ')
    };
  }

  // Pattern C: Standard 4+ words fallback
  if (words.length >= 4) {
    return {
      subject: sanitize(words[0]),
      action: sanitize(words[1]),
      bridge: sanitize(words[2]),
      object: sanitize(words.slice(3).join(' '))
    };
  } else if (words.length === 3) {
    return {
      subject: sanitize(words[0]),
      action: sanitize(words[1]),
      bridge: 'the',
      object: sanitize(words[2])
    };
  }

  const b = sanitize(lesson.components.bridge, 'the');
  return {
    subject: sanitize(lesson.components.subject),
    action: sanitize(lesson.components.action),
    bridge: b,
    object: stripLeadingTheFromObject(sanitize(lesson.components.object), b),
  };
}

