import { VocabItem, Lesson, SingleSoundSyllable } from '../types';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getWordKKPhonetic } from '../utils/wordDictionary';

export interface AoiNoteSheetMeta {
  id: 'all' | 'sheet-1' | 'sheet-2' | 'sheet-3';
  shortLabel: string;
  title: string;
  subtitle: string;
  sourceTag: string;
}

export const AOI_NOTE_SHEETS: AoiNoteSheetMeta[] = [
  {
    id: 'all',
    shortLabel: '全部單元 (30詞)',
    title: '自動光學檢測公開教材 · 全套單音與極簡短句',
    subtitle: '完整收錄 20 個光學檢測核心學習單字 + 機台五態 + 日誌診斷（全部採用 3～4 字超短句）',
    sourceTag: 'ALL'
  },
  {
    id: 'sheet-1',
    shortLabel: '單元 1：20個光學檢測單字',
    title: '公開光學檢測單元 1：20 個必背光學檢測單字',
    subtitle: '跳晶感測器 · JIG板 · 檢測 · 調整光源 · 檢測教導 · 定位 · 模板 · 模板轉換 · 搜索無 · 2維條碼 · 基板 · 錫球 · 晶粒 · 複數晶粒 · 底膠 · 被動元件 · 散熱片 · 字元檢測 · 字元辨識 · 銅墊',
    sourceTag: '公開光學檢測單元 1'
  },
  {
    id: 'sheet-2',
    shortLabel: '單元 2：通訊與五態',
    title: '公開光學檢測單元 2：機台通訊與製程五階段狀態',
    subtitle: 'Process State · Wait Process · Processing · PLC Status · Control State',
    sourceTag: '公開光學檢測單元 2'
  },
  {
    id: 'sheet-3',
    shortLabel: '單元 3：日誌與黃金樣品',
    title: '公開光學檢測單元 3：日誌診斷、吸嘴管理與黃金樣本',
    subtitle: 'Alarm Log · Auto Focus Log · Motion Roller Log · Sucker Manager · Golden Sample',
    sourceTag: '公開光學檢測單元 3'
  }
];

type RawAoiVocabItem = Omit<VocabItem, 'zhuyinPhonetic' | 'kkPhonetic'> & {
  zhuyinPhonetic?: string;
  kkPhonetic?: string;
  singleSounds: SingleSoundSyllable[];
};

/**
 * 自動光學檢測公開工程教材：
 * 單元 1：完整寫入使用者指定的 20 個光學檢測學習單字
 * 單元 2：機台通訊與製程五階段狀態（5 個核心詞）
 * 單元 3：日誌診斷、吸嘴管理與黃金樣品（5 個核心詞）
 * 所有例句皆縮短為 3～4 個單字的極簡短句，一次學一個短句、零負擔秒背！
 */
const RAW_AOI_HANDWRITTEN_VOCAB: RawAoiVocabItem[] = [
  // ================= 單元 1：20 個光學檢測核心學習單字 =================
  {
    id: 'aoi-s1-01',
    word: 'Die Jump Sensor',
    kkPhonetic: '[daɪ dʒʌmp ˋsɛnsɚ]',
    ipa: '/daɪ dʒʌmp ˈsɛn.sər/',
    syllables: 'Die · Jump · Sen·sor',
    zhuyinPhonetic: 'ㄉㄞ ㄐㄧㄤˋ-ㄆㄨˇ ㄙㄣ-ㄙㄜˋ',
    taiwanPhonetic: '【 戴 · 醬普 · 森瑟 】',
    singleSounds: [
      { sound: 'Die', kk: '[daɪ]', zhuyin: 'ㄉㄞ', homophone: '戴 (晶粒)' },
      { sound: 'Jump', kk: '[dʒʌmp]', zhuyin: 'ㄐㄧㄤˋ-ㄆㄨˇ', homophone: '醬普 (跳躍)' },
      { sound: 'Sen', kk: '[ˋsɛn]', zhuyin: 'ㄙㄣ', homophone: '森' },
      { sound: 'sor', kk: '[sɚ]', zhuyin: 'ㄙㄜˋ', homophone: '瑟 (感測器)' }
    ],
    partOfSpeech: 'n.',
    translation: '跳晶感測器',
    cleanroomContext: '偵測晶粒是否翹起、疊晶或跳位異常的光電感測器（標準拼法為 Sensor）',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Check the jump sensor.',
    exampleTranslation: '檢查跳晶感測器。',
    exampleSentenceZh: '檢查跳晶感測器。',
    memoryTrick: 'Die(晶粒) + Jump(跳起) + Sensor(感測器)＝跳晶感測器（注意字尾是 -sor）！'
  },
  {
    id: 'aoi-s1-02',
    word: 'JIG Board',
    kkPhonetic: '[dʒɪg bord]',
    ipa: '/dʒɪɡ bɔːrd/',
    syllables: 'JIG · Board',
    zhuyinPhonetic: 'ㄐㄧˊ-ㄍㄜˊ ㄅㄛˊ-ㄉㄜˊ',
    taiwanPhonetic: '【 吉格 · 博德 】',
    singleSounds: [
      { sound: 'JIG', kk: '[dʒɪg]', zhuyin: 'ㄐㄧˊ-ㄍㄜˊ', homophone: '吉格 (治具)' },
      { sound: 'Board', kk: '[bord]', zhuyin: 'ㄅㄛˊ-ㄉㄜˊ', homophone: '博德 (板)' }
    ],
    partOfSpeech: 'n.',
    translation: 'JIG 板 / 定位治具板',
    cleanroomContext: '光學檢測機台用來校準鏡頭光軸、平台水平與基準座標的專用定位治具板',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Place the JIG board.',
    exampleTranslation: '放置定位治具板。',
    exampleSentenceZh: '放置定位治具板。',
    memoryTrick: 'JIG(治具) + Board(板子)＝調機與對焦必備的「JIG 定位治具板」！'
  },
  {
    id: 'aoi-s1-03',
    word: 'Inspection',
    kkPhonetic: '[ɪnˋspɛkʃən]',
    ipa: '/ɪnˈspɛk.ʃən/',
    syllables: 'In·spec·tion',
    zhuyinPhonetic: 'ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ',
    taiwanPhonetic: '【 因 · 斯佩克 · 宣 】',
    singleSounds: [
      { sound: 'In', kk: '[ɪn]', zhuyin: 'ㄧㄣ', homophone: '因 (往內)' },
      { sound: 'spec', kk: '[ˋspɛk]', zhuyin: 'ㄙ-ㄆㄟˋ-ㄎㄜ', homophone: '斯佩克 (看)' },
      { sound: 'tion', kk: '[ʃən]', zhuyin: 'ㄒㄩㄢ', homophone: '宣 (名詞字尾)' }
    ],
    partOfSpeech: 'n.',
    translation: '檢測',
    cleanroomContext: '透過高解析光學鏡頭自動掃描晶圓或封裝基板表面缺陷的檢測程序',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Start the inspection.',
    exampleTranslation: '啟動光學檢測。',
    exampleSentenceZh: '啟動光學檢測。',
    memoryTrick: 'In(往內) + spec(看) + tion＝仔細往裡面看就是「檢測」！'
  },
  {
    id: 'aoi-s1-04',
    word: 'Tuning Light',
    kkPhonetic: '[ˋtunɪŋ laɪt]',
    ipa: '/ˈtuː.nɪŋ laɪt/',
    syllables: 'Tu·ning · Light',
    zhuyinPhonetic: 'ㄊㄨˊ-ㄋㄧㄥˊ ㄌㄞˋ-ㄊㄜ',
    taiwanPhonetic: '【 圖寧 · 賴特 】',
    singleSounds: [
      { sound: 'Tu', kk: '[ˋtu]', zhuyin: 'ㄊㄨˊ', homophone: '圖' },
      { sound: 'ning', kk: '[nɪŋ]', zhuyin: 'ㄋㄧㄥˊ', homophone: '寧 (調整)' },
      { sound: 'Light', kk: '[laɪt]', zhuyin: 'ㄌㄞˋ-ㄊㄜ', homophone: '賴特 (光源)' }
    ],
    partOfSpeech: 'n./v.',
    translation: '調整光源',
    cleanroomContext: '調整同軸光與環形光亮度比例，使缺陷與背景對比最清晰',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'We tune the light.',
    exampleTranslation: '我們調整光源。',
    exampleSentenceZh: '我們調整光源。',
    memoryTrick: 'Tuning(調校微調) + Light(燈光)＝「調整光源」！'
  },
  {
    id: 'aoi-s1-05',
    word: 'Inspection Teach',
    kkPhonetic: '[ɪnˋspɛkʃən titʃ]',
    ipa: '/ɪnˈspɛk.ʃən tiːtʃ/',
    syllables: 'In·spec·tion · Teach',
    zhuyinPhonetic: 'ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ ㄊㄧˋ-ㄑㄩˇ',
    taiwanPhonetic: '【 因斯佩克宣 · 替取 】',
    singleSounds: [
      { sound: 'Inspection', kk: '[ɪnˋspɛkʃən]', zhuyin: 'ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ', homophone: '因斯佩克宣 (檢測)' },
      { sound: 'Teach', kk: '[titʃ]', zhuyin: 'ㄊㄧˋ-ㄑㄩˇ', homophone: '替取 (教導)' }
    ],
    partOfSpeech: 'n.',
    translation: '檢測教導',
    cleanroomContext: '在軟體框選檢測區域並設定基準影像，教導機台如何辨識良品與缺陷',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Run inspection teach.',
    exampleTranslation: '執行檢測教導。',
    exampleSentenceZh: '執行檢測教導。',
    memoryTrick: 'Inspection(檢測) + Teach(教導)＝教機台怎麼抓瑕疵的「檢測教導」！'
  },
  {
    id: 'aoi-s1-06',
    word: 'Align',
    kkPhonetic: '[əˋlaɪn]',
    ipa: '/əˈlaɪn/',
    syllables: 'A·lign',
    zhuyinPhonetic: 'ㄜ-ㄌㄞˋ-ㄣ',
    taiwanPhonetic: '【 額 · 賴恩 】',
    singleSounds: [
      { sound: 'A', kk: '[ə]', zhuyin: 'ㄜ', homophone: '額' },
      { sound: 'lign', kk: '[ˋlaɪn]', zhuyin: 'ㄌㄞˋ-ㄣ', homophone: '賴恩 (g不發音)' }
    ],
    partOfSpeech: 'v.',
    translation: '定位',
    cleanroomContext: '利用靶標十字對位點進行視覺角度與座標校正定位',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'We align the mark.',
    exampleTranslation: '我們對準定位標記。',
    exampleSentenceZh: '我們對準定位標記。',
    memoryTrick: 'A + lign(唸法像 line 線)＝對齊基準線就是「定位」（g 不發音）！'
  },
  {
    id: 'aoi-s1-07',
    word: 'Layout',
    kkPhonetic: '[ˋle͵aʊt]',
    ipa: '/ˈleɪ.aʊt/',
    syllables: 'Lay·out',
    zhuyinPhonetic: 'ㄌㄟˊ-ㄠˋ-ㄊㄜ',
    taiwanPhonetic: '【 雷 · 奧特 】',
    singleSounds: [
      { sound: 'Lay', kk: '[ˋle]', zhuyin: 'ㄌㄟˊ', homophone: '雷 (鋪設)' },
      { sound: 'out', kk: '[͵aʊt]', zhuyin: 'ㄠˋ-ㄊㄜ', homophone: '奧特 (展開)' }
    ],
    partOfSpeech: 'n.',
    translation: '模板',
    cleanroomContext: '基板或晶圓上所有晶粒行列座標排列的幾何陣列模板',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Check the die layout.',
    exampleTranslation: '檢查晶粒模板。',
    exampleSentenceZh: '檢查晶粒模板。',
    memoryTrick: 'Lay(擺放) + out(展開出來)＝把晶粒排列展開的「模板」！'
  },
  {
    id: 'aoi-s1-08',
    word: 'Layout Transfer',
    kkPhonetic: '[ˋle͵aʊt ˋtrænsfɚ]',
    ipa: '/ˈleɪ.aʊt ˈtræns.fər/',
    syllables: 'Lay·out · Trans·fer',
    zhuyinPhonetic: 'ㄌㄟˊ-ㄠˋ-ㄊㄜ ㄔㄨㄢ-ㄙ-ㄈㄜ',
    taiwanPhonetic: '【 雷奧特 · 穿斯弗 】',
    singleSounds: [
      { sound: 'Layout', kk: '[ˋle͵aʊt]', zhuyin: 'ㄌㄟˊ-ㄠˋ-ㄊㄜ', homophone: '雷奧特 (模板)' },
      { sound: 'Trans', kk: '[ˋtræns]', zhuyin: 'ㄔㄨㄢ-ㄙ', homophone: '穿斯 (轉換)' },
      { sound: 'fer', kk: '[fɚ]', zhuyin: 'ㄈㄜ', homophone: '弗 (移轉)' }
    ],
    partOfSpeech: 'n.',
    translation: '模板轉換',
    cleanroomContext: '將設計圖檔或教導好的單顆模板座標轉換套用到整片基板陣列',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Run layout transfer.',
    exampleTranslation: '執行模板轉換。',
    exampleSentenceZh: '執行模板轉換。',
    memoryTrick: 'Layout(模板) + Transfer(轉換傳送)＝「模板轉換」！'
  },
  {
    id: 'aoi-s1-09',
    word: 'Detect Empty',
    kkPhonetic: '[dɪˋtɛkt ˋɛmptɪ]',
    ipa: '/dɪˈtɛkt ˈɛmp.ti/',
    syllables: 'De·tect · Emp·ty',
    zhuyinPhonetic: 'ㄉㄧ-ㄊㄟˋ-ㄎㄜ-ㄊㄜ ㄣ-ㄆㄨˇ-ㄊㄧˋ',
    taiwanPhonetic: '【 迪泰克特 · 恩普替 】',
    singleSounds: [
      { sound: 'De', kk: '[dɪ]', zhuyin: 'ㄉㄧ', homophone: '迪' },
      { sound: 'tect', kk: '[ˋtɛkt]', zhuyin: 'ㄊㄟˋ-ㄎㄜ-ㄊㄜ', homophone: '泰克特 (搜索)' },
      { sound: 'Emp', kk: '[ˋɛmp]', zhuyin: 'ㄣ-ㄆㄨˇ', homophone: '恩普' },
      { sound: 'ty', kk: '[tɪ]', zhuyin: 'ㄊㄧˋ', homophone: '替 (空的)' }
    ],
    partOfSpeech: 'v./n.',
    translation: '搜索無目標',
    cleanroomContext: '鏡頭搜索不到目標晶粒、空焊盤或插槽無基板（搜索無 / 沒找到）',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Sensor detects empty.',
    exampleTranslation: '感測器搜索無目標。',
    exampleSentenceZh: '感測器搜索無目標。',
    memoryTrick: 'Detect(搜索偵測) + Empty(空的)＝「搜索無目標（沒找到）」！'
  },
  {
    id: 'aoi-s1-10',
    word: '2D Code',
    kkPhonetic: '[ˋtu ˋdi kod]',
    ipa: '/ˌtuːˈdiː koʊd/',
    syllables: '2·D · Code',
    zhuyinPhonetic: 'ㄊㄨˋ-ㄉㄧˊ ㄎㄡ-ㄉㄜˊ',
    taiwanPhonetic: '【 兔迪 · 扣得 】',
    singleSounds: [
      { sound: '2D', kk: '[ˋtu ˋdi]', zhuyin: 'ㄊㄨˋ-ㄉㄧˊ', homophone: '兔迪 (2維)' },
      { sound: 'Code', kk: '[kod]', zhuyin: 'ㄎㄡ-ㄉㄜˊ', homophone: '扣得 (條碼)' }
    ],
    partOfSpeech: 'n.',
    translation: '2維條碼',
    cleanroomContext: '雷射刻印於基板或晶圓載具上的 DataMatrix 二維追蹤條碼',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Scan the 2D code.',
    exampleTranslation: '掃描二維條碼。',
    exampleSentenceZh: '掃描二維條碼。',
    memoryTrick: '2D(二維平面) + Code(條碼代號)＝「2維條碼」！'
  },
  {
    id: 'aoi-s1-11',
    word: 'Substrate Inspection',
    kkPhonetic: '[ˋsʌbstret ɪnˋspɛkʃən]',
    ipa: '/ˈsʌb.streɪt ɪnˈspɛk.ʃən/',
    syllables: 'Sub·strate · In·spec·tion',
    zhuyinPhonetic: 'ㄙㄚˋ-ㄅㄨ-ㄙ-ㄘㄨㄟˋ-ㄊㄜ ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ',
    taiwanPhonetic: '【 薩布斯翠特 · 因斯佩克宣 】',
    singleSounds: [
      { sound: 'Sub', kk: '[ˋsʌb]', zhuyin: 'ㄙㄚˋ-ㄅㄨ', homophone: '薩布 (底下)' },
      { sound: 'strate', kk: '[stret]', zhuyin: 'ㄙ-ㄘㄨㄟˋ-ㄊㄜ', homophone: '斯翠特 (基板層)' },
      { sound: 'Inspection', kk: '[ɪnˋspɛkʃən]', zhuyin: 'ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ', homophone: '因斯佩克宣 (檢測)' }
    ],
    partOfSpeech: 'n.',
    translation: '基板檢測',
    cleanroomContext: '檢查封裝載板表面線路刮傷、異物污染或綠漆破損（標準拼法為 Substrate）',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Run substrate inspection.',
    exampleTranslation: '執行基板檢測。',
    exampleSentenceZh: '執行基板檢測。',
    memoryTrick: 'Sub(在底下) + strate(層板)＝承載晶片的「基板檢測」（注意字尾是 -strate）！'
  },
  {
    id: 'aoi-s1-12',
    word: 'C4 Bump Inspection',
    kkPhonetic: '[ˋsi ˋfor bʌmp ɪnˋspɛkʃən]',
    ipa: '/ˌsiːˈfɔːr bʌmp ɪnˈspɛk.ʃən/',
    syllables: 'C·4 · Bump · In·spec·tion',
    zhuyinPhonetic: 'ㄒㄧ-ㄈㄛˊ ㄅㄤˋ-ㄆㄨˇ ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ',
    taiwanPhonetic: '【 西佛 · 棒普 · 因斯佩克宣 】',
    singleSounds: [
      { sound: 'C4', kk: '[ˋsi ˋfor]', zhuyin: 'ㄒㄧ-ㄈㄛˊ', homophone: '西佛 (覆晶連接)' },
      { sound: 'Bump', kk: '[bʌmp]', zhuyin: 'ㄅㄤˋ-ㄆㄨˇ', homophone: '棒普 (錫球凸塊)' },
      { sound: 'Inspection', kk: '[ɪnˋspɛkʃən]', zhuyin: 'ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ', homophone: '因斯佩克宣 (檢測)' }
    ],
    partOfSpeech: 'n.',
    translation: '錫球檢測',
    cleanroomContext: '檢測覆晶封裝微錫球凸塊是否缺球、橋接短路、偏移或大小異常',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Check the C4 bumps.',
    exampleTranslation: '檢查錫球凸塊。',
    exampleSentenceZh: '檢查錫球凸塊。',
    memoryTrick: 'C4 Bump(覆晶微錫球凸塊) + Inspection(檢測)＝「錫球檢測」！'
  },
  {
    id: 'aoi-s1-13',
    word: 'Die Inspection',
    kkPhonetic: '[daɪ ɪnˋspɛkʃən]',
    ipa: '/daɪ ɪnˈspɛk.ʃən/',
    syllables: 'Die · In·spec·tion',
    zhuyinPhonetic: 'ㄉㄞ ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ',
    taiwanPhonetic: '【 戴 · 因斯佩克宣 】',
    singleSounds: [
      { sound: 'Die', kk: '[daɪ]', zhuyin: 'ㄉㄞ', homophone: '戴 (晶粒)' },
      { sound: 'Inspection', kk: '[ɪnˋspɛkʃən]', zhuyin: 'ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ', homophone: '因斯佩克宣 (檢測)' }
    ],
    partOfSpeech: 'n.',
    translation: '晶粒檢測',
    cleanroomContext: '檢查單顆晶粒表面崩角、裂紋、刮傷與偏移',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Run die inspection.',
    exampleTranslation: '執行晶粒檢測。',
    exampleSentenceZh: '執行晶粒檢測。',
    memoryTrick: 'Die(晶粒) + Inspection(檢測)＝「晶粒檢測」！'
  },
  {
    id: 'aoi-s1-14',
    word: 'Couple Die Inspection',
    kkPhonetic: '[ˋkʌp! daɪ ɪnˋspɛkʃən]',
    ipa: '/ˈkʌp.əl daɪ ɪnˈspɛk.ʃən/',
    syllables: 'Cou·ple · Die · In·spec·tion',
    zhuyinPhonetic: 'ㄎㄚˇ-ㄆㄛˊ ㄉㄞ ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ',
    taiwanPhonetic: '【 卡婆 · 戴 · 因斯佩克宣 】',
    singleSounds: [
      { sound: 'Couple', kk: '[ˋkʌp!]', zhuyin: 'ㄎㄚˇ-ㄆㄛˊ', homophone: '卡婆 (複數/成對)' },
      { sound: 'Die', kk: '[daɪ]', zhuyin: 'ㄉㄞ', homophone: '戴 (晶粒)' },
      { sound: 'Inspection', kk: '[ɪnˋspɛkʃən]', zhuyin: 'ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ', homophone: '因斯佩克宣 (檢測)' }
    ],
    partOfSpeech: 'n.',
    translation: '複數晶粒檢測',
    cleanroomContext: '針對多晶片封裝上並排之複數晶粒進行相對間距與外觀檢測',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Check the couple dies.',
    exampleTranslation: '檢查複數晶粒。',
    exampleSentenceZh: '檢查複數晶粒。',
    memoryTrick: 'Couple(成雙、複數) + Die(晶粒) + Inspection＝「複數晶粒檢測」！'
  },
  {
    id: 'aoi-s1-15',
    word: 'Underfill Inspection',
    kkPhonetic: '[ˋʌndɚ͵fɪl ɪnˋspɛkʃən]',
    ipa: '/ˈʌn.dər.fɪl ɪnˈspɛk.ʃən/',
    syllables: 'Un·der·fill · In·spec·tion',
    zhuyinPhonetic: 'ㄢ-ㄉㄜˊ-ㄈㄟ-ㄛ ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ',
    taiwanPhonetic: '【 安德菲爾 · 因斯佩克宣 】',
    singleSounds: [
      { sound: 'Under', kk: '[ˋʌndɚ]', zhuyin: 'ㄢ-ㄉㄜˊ', homophone: '安德 (在底部)' },
      { sound: 'fill', kk: '[͵fɪl]', zhuyin: 'ㄈㄟ-ㄛ', homophone: '菲爾 (填膠)' },
      { sound: 'Inspection', kk: '[ɪnˋspɛkʃən]', zhuyin: 'ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ', homophone: '因斯佩克宣 (檢測)' }
    ],
    partOfSpeech: 'n.',
    translation: '底膠檢測',
    cleanroomContext: '檢測晶粒底部填充保護膠之爬膠寬度、溢膠範圍、氣泡與未填滿缺陷',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Check the underfill.',
    exampleTranslation: '檢查底膠狀態。',
    exampleSentenceZh: '檢查底膠狀態。',
    memoryTrick: 'Under(在底下) + fill(填滿)＝點在晶粒底下的「底膠檢測」！'
  },
  {
    id: 'aoi-s1-16',
    word: 'PC Inspection',
    kkPhonetic: '[ˋpi ˋsi ɪnˋspɛkʃən]',
    ipa: '/ˌpiːˈsiː ɪnˈspɛk.ʃən/',
    syllables: 'P·C · In·spec·tion',
    zhuyinPhonetic: 'ㄆㄧ-ㄒㄧ ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ',
    taiwanPhonetic: '【 批西 · 因斯佩克宣 】',
    singleSounds: [
      { sound: 'PC', kk: '[ˋpi ˋsi]', zhuyin: 'ㄆㄧ-ㄒㄧ', homophone: '批西 (被動元件)' },
      { sound: 'Inspection', kk: '[ɪnˋspɛkʃən]', zhuyin: 'ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ', homophone: '因斯佩克宣 (檢測)' }
    ],
    partOfSpeech: 'n.',
    translation: '被動元件檢測',
    cleanroomContext: '檢測基板表面貼裝的電容、電阻等被動元件是否缺件、立碑、偏移或極性反置',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Run PC inspection.',
    exampleTranslation: '執行被動元件檢測。',
    exampleSentenceZh: '執行被動元件檢測。',
    memoryTrick: 'PC 是 Passive Component（被動元件）縮寫，檢查小電容電阻有沒貼歪！'
  },
  {
    id: 'aoi-s1-17',
    word: 'Lid Inspection',
    kkPhonetic: '[lɪd ɪnˋspɛkʃən]',
    ipa: '/lɪd ɪnˈspɛk.ʃən/',
    syllables: 'Lid · In·spec·tion',
    zhuyinPhonetic: 'ㄌㄧˋ-ㄉㄜˊ ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ',
    taiwanPhonetic: '【 利德 · 因斯佩克宣 】',
    singleSounds: [
      { sound: 'Lid', kk: '[lɪd]', zhuyin: 'ㄌㄧˋ-ㄉㄜˊ', homophone: '利德 (散熱上蓋)' },
      { sound: 'Inspection', kk: '[ɪnˋspɛkʃən]', zhuyin: 'ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ', homophone: '因斯佩克宣 (檢測)' }
    ],
    partOfSpeech: 'n.',
    translation: '散熱片檢測',
    cleanroomContext: '檢測封裝均熱片金屬上蓋貼合平整度、表面刮傷、溢膠與印字品質',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Run lid inspection.',
    exampleTranslation: '執行散熱片檢測。',
    exampleSentenceZh: '執行散熱片檢測。',
    memoryTrick: 'Lid(蓋子/均熱上蓋) + Inspection＝封裝頂部金屬「散熱片檢測」！'
  },
  {
    id: 'aoi-s1-18',
    word: 'OCV Inspection',
    kkPhonetic: '[ˋo ˋsi ˋvi ɪnˋspɛkʃən]',
    ipa: '/ˌoʊ.siːˈviː ɪnˈspɛk.ʃən/',
    syllables: 'O·C·V · In·spec·tion',
    zhuyinPhonetic: 'ㄡ-ㄒㄧ-ㄨㄟˊ ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ',
    taiwanPhonetic: '【 歐西維 · 因斯佩克宣 】',
    singleSounds: [
      { sound: 'OCV', kk: '[ˋo ˋsi ˋvi]', zhuyin: 'ㄡ-ㄒㄧ-ㄨㄟˊ', homophone: '歐西維 (字元驗證)' },
      { sound: 'Inspection', kk: '[ɪnˋspɛkʃən]', zhuyin: 'ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ', homophone: '因斯佩克宣 (檢測)' }
    ],
    partOfSpeech: 'n.',
    translation: '字元檢測',
    cleanroomContext: '驗證產品表面雷射印字是否清晰、有無斷字、重影或印字不良',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Run OCV inspection.',
    exampleTranslation: '執行字元檢測。',
    exampleSentenceZh: '執行字元檢測。',
    memoryTrick: 'OCV (V=Verification 驗證檢查)＝檢查字印得對不對、清不清楚的「字元檢測」！'
  },
  {
    id: 'aoi-s1-19',
    word: 'OCR Inspection',
    kkPhonetic: '[ˋo ˋsi ˋɑr ɪnˋspɛkʃən]',
    ipa: '/ˌoʊ.siːˈɑːr ɪnˈspɛk.ʃən/',
    syllables: 'O·C·R · In·spec·tion',
    zhuyinPhonetic: 'ㄡ-ㄒㄧ-ㄚˇ ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ',
    taiwanPhonetic: '【 歐西阿 · 因斯佩克宣 】',
    singleSounds: [
      { sound: 'OCR', kk: '[ˋo ˋsi ˋɑr]', zhuyin: 'ㄡ-ㄒㄧ-ㄚˇ', homophone: '歐西阿 (字元辨識)' },
      { sound: 'Inspection', kk: '[ɪnˋspɛkʃən]', zhuyin: 'ㄧㄣ-ㄙ-ㄆㄟˋ-ㄎㄜ-ㄒㄩㄢ', homophone: '因斯佩克宣 (檢測)' }
    ],
    partOfSpeech: 'n.',
    translation: '字元辨識',
    cleanroomContext: '透過光學鏡頭自動讀取並辨識晶片或基板上的批號與刻號字串',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Run OCR inspection.',
    exampleTranslation: '執行字元辨識。',
    exampleSentenceZh: '執行字元辨識。',
    memoryTrick: 'OCR (R=Recognition 辨識讀取)＝把刻號唸出來並核對資料庫的「字元辨識」！'
  },
  {
    id: 'aoi-s1-20',
    word: 'Cu Pad',
    kkPhonetic: '[ˋkɑpɚ pæd]',
    ipa: '/ˈkɑː.pər pæd/',
    syllables: 'Cu · Pad',
    zhuyinPhonetic: 'ㄎㄚˇ-ㄆㄜˋ ㄆㄞˋ-ㄉㄜˊ',
    taiwanPhonetic: '【 卡珀 · 派德 】',
    singleSounds: [
      { sound: 'Cu', kk: '[ˋkɑpɚ]', zhuyin: 'ㄎㄚˇ-ㄆㄜˋ', homophone: '卡珀 (銅元素 Cu)' },
      { sound: 'Pad', kk: '[pæd]', zhuyin: 'ㄆㄞˋ-ㄉㄜˊ', homophone: '派德 (銅墊)' }
    ],
    partOfSpeech: 'n.',
    translation: '銅墊',
    cleanroomContext: '基板或晶圓表面裸露供導電接合的銅金屬焊墊，檢測是否氧化、異物或刮傷',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 1',
    exampleSentence: 'Inspect the Cu pad.',
    exampleTranslation: '檢查基板銅墊。',
    exampleSentenceZh: '檢查基板銅墊。',
    memoryTrick: 'Cu 是化學元素 Copper(銅)，Cu Pad 就是基板上的導電「銅墊」！'
  },

  // ================= 單元 2：設備通訊與製程狀態 =================
  {
    id: 'aoi-s2-01',
    word: 'Process State',
    kkPhonetic: '[ˋprɑsɛs stet]',
    ipa: '/ˈprɑː.sɛs steɪt/',
    syllables: 'Pro·cess · State',
    zhuyinPhonetic: 'ㄆㄨ-ㄌㄨㄛˊ-ㄙㄞˋ-ㄙ ㄙ-ㄊㄟˋ-ㄊㄜ',
    taiwanPhonetic: '【 普羅賽斯 · 斯泰特 】',
    singleSounds: [
      { sound: 'Process', kk: '[ˋprɑsɛs]', zhuyin: 'ㄆㄨ-ㄌㄨㄛˊ-ㄙㄞˋ-ㄙ', homophone: '普羅賽斯 (製程)' },
      { sound: 'State', kk: '[stet]', zhuyin: 'ㄙ-ㄊㄟˋ-ㄊㄜ', homophone: '斯泰特 (狀態)' }
    ],
    partOfSpeech: 'n.',
    translation: '製程狀態',
    cleanroomContext: '機台當前的生產階段（No Wafer → No Process → Wait Process → Processing → End Process）',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 2',
    exampleSentence: 'Check the process state.',
    exampleTranslation: '檢查製程狀態。',
    exampleSentenceZh: '檢查製程狀態。',
    memoryTrick: 'Process(製程) + State(狀態)＝機台五階段「製程狀態」！'
  },
  {
    id: 'aoi-s2-02',
    word: 'Wait Process',
    kkPhonetic: '[wet ˋprɑsɛs]',
    ipa: '/weɪt ˈprɑː.sɛs/',
    syllables: 'Wait · Pro·cess',
    zhuyinPhonetic: 'ㄨㄟˋ-ㄊㄜ ㄆㄨ-ㄌㄨㄛˊ-ㄙㄞˋ-ㄙ',
    taiwanPhonetic: '【 威特 · 普羅賽斯 】',
    singleSounds: [
      { sound: 'Wait', kk: '[wet]', zhuyin: 'ㄨㄟˋ-ㄊㄜ', homophone: '威特 (等待)' },
      { sound: 'Process', kk: '[ˋprɑsɛs]', zhuyin: 'ㄆㄨ-ㄌㄨㄛˊ-ㄙㄞˋ-ㄙ', homophone: '普羅賽斯 (製程)' }
    ],
    partOfSpeech: 'n.',
    translation: '等待製程',
    cleanroomContext: '基板已定位且配方就緒，等待開始檢測指令',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 2',
    exampleSentence: 'Tool waits for process.',
    exampleTranslation: '機台等待製程。',
    exampleSentenceZh: '機台等待製程。',
    memoryTrick: 'Wait(等待) + Process(製程)＝萬事俱備的「等待製程」！'
  },
  {
    id: 'aoi-s2-03',
    word: 'Processing',
    kkPhonetic: '[ˋprɑsɛsɪŋ]',
    ipa: '/ˈprɑː.sɛs.ɪŋ/',
    syllables: 'Pro·cess·ing',
    zhuyinPhonetic: 'ㄆㄨ-ㄌㄨㄛˊ-ㄙㄞˋ-ㄙ-ㄧㄥ',
    taiwanPhonetic: '【 普羅賽斯英 】',
    singleSounds: [
      { sound: 'Process', kk: '[ˋprɑsɛs]', zhuyin: 'ㄆㄨ-ㄌㄨㄛˊ-ㄙㄞˋ-ㄙ', homophone: '普羅賽斯 (製程)' },
      { sound: 'ing', kk: '[ɪŋ]', zhuyin: 'ㄧㄥ', homophone: '英 (進行中)' }
    ],
    partOfSpeech: 'n./adj.',
    translation: '製程中',
    cleanroomContext: '機台正高速移動光學鏡頭進行自動掃描與演算法比對',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 2',
    exampleSentence: 'The tool is processing.',
    exampleTranslation: '機台正在檢測中。',
    exampleSentenceZh: '機台正在檢測中。',
    memoryTrick: 'Process + ing(正在進行)＝機台正在跑片「製程中」！'
  },
  {
    id: 'aoi-s2-04',
    word: 'PLC Status',
    kkPhonetic: '[ˋpi ˋɛl ˋsi ˋstetəs]',
    ipa: '/ˌpiː.ɛlˈsiː ˈsteɪ.təs/',
    syllables: 'P·L·C · Sta·tus',
    zhuyinPhonetic: 'ㄆㄧ-ㄞ-ㄡ-ㄒㄧ ㄙ-ㄊㄟˋ-ㄊㄜ-ㄙ',
    taiwanPhonetic: '【 批艾歐西 · 斯泰特斯 】',
    singleSounds: [
      { sound: 'PLC', kk: '[ˋpi ˋɛl ˋsi]', zhuyin: 'ㄆㄧ-ㄞ-ㄡ-ㄒㄧ', homophone: '批艾歐西 (控制器)' },
      { sound: 'Status', kk: '[ˋstetəs]', zhuyin: 'ㄙ-ㄊㄟˋ-ㄊㄜ-ㄙ', homophone: '斯泰特斯 (狀態)' }
    ],
    partOfSpeech: 'n.',
    translation: 'PLC 控制器狀態',
    cleanroomContext: '可程式邏輯控制器與氣壓閥、安全門鎖、馬達驅動器之連線狀態',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 2',
    exampleSentence: 'Check the PLC status.',
    exampleTranslation: '檢查控制器狀態。',
    exampleSentenceZh: '檢查控制器狀態。',
    memoryTrick: 'PLC(可程式控制器) + Status(狀態)＝硬體電控「PLC 狀態」！'
  },
  {
    id: 'aoi-s2-05',
    word: 'Control State',
    kkPhonetic: '[kənˋtrol stet]',
    ipa: '/kənˈtroʊl steɪt/',
    syllables: 'Con·trol · State',
    zhuyinPhonetic: 'ㄎㄣ-ㄔㄨㄛ ㄙ-ㄊㄟˋ-ㄊㄜ',
    taiwanPhonetic: '【 肯綽 · 斯泰特 】',
    singleSounds: [
      { sound: 'Control', kk: '[kənˋtrol]', zhuyin: 'ㄎㄣ-ㄔㄨㄛ', homophone: '肯綽 (控制)' },
      { sound: 'State', kk: '[stet]', zhuyin: 'ㄙ-ㄊㄟˋ-ㄊㄜ', homophone: '斯泰特 (狀態)' }
    ],
    partOfSpeech: 'n.',
    translation: '連線控制狀態',
    cleanroomContext: '機台與工廠自動化系統的連線控制權狀態（Remote 遠端 / Local 近端 / Offline 離線）',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 2',
    exampleSentence: 'Set remote mode.',
    exampleTranslation: '設定遠端模式。',
    exampleSentenceZh: '設定遠端模式。',
    memoryTrick: 'Control State(連線控制狀態)＝量產必切 Remote（遠端）！'
  },

  // ================= 單元 3：日誌診斷、吸嘴管理與黃金樣品 =================
  {
    id: 'aoi-s3-01',
    word: 'Alarm Log',
    kkPhonetic: '[əˋlɑrm lɔg]',
    ipa: '/əˈlɑːrm lɔːɡ/',
    syllables: 'A·larm · Log',
    zhuyinPhonetic: 'ㄜ-ㄌㄚˇ-ㄇㄨ ㄌㄨㄛˋ-ㄍㄜˊ',
    taiwanPhonetic: '【 額拉姆 · 洛格 】',
    singleSounds: [
      { sound: 'Alarm', kk: '[əˋlɑrm]', zhuyin: 'ㄜ-ㄌㄚˇ-ㄇㄨ', homophone: '額拉姆 (警報)' },
      { sound: 'Log', kk: '[lɔg]', zhuyin: 'ㄌㄨㄛˋ-ㄍㄜˊ', homophone: '洛格 (日誌)' }
    ],
    partOfSpeech: 'n.',
    translation: '警報日誌',
    cleanroomContext: '記錄機台歷史故障代碼與發生時間的警報日誌',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 3',
    exampleSentence: 'Check the alarm log.',
    exampleTranslation: '檢查警報日誌。',
    exampleSentenceZh: '檢查警報日誌。',
    memoryTrick: 'Alarm(警報) + Log(紀錄)＝追查當機原因必看的「警報日誌」！'
  },
  {
    id: 'aoi-s3-02',
    word: 'Auto Focus Log',
    kkPhonetic: '[ˋɔto ˋfokəs lɔg]',
    ipa: '/ˈɔː.toʊ ˈfoʊ.kəs lɔːɡ/',
    syllables: 'Au·to · Fo·cus · Log',
    zhuyinPhonetic: 'ㄡ-ㄊㄡˋ ㄈㄛˊ-ㄎㄜ-ㄙ ㄌㄨㄛˋ-ㄍㄜˊ',
    taiwanPhonetic: '【 歐透 · 佛克斯 · 洛格 】',
    singleSounds: [
      { sound: 'Auto', kk: '[ˋɔto]', zhuyin: 'ㄡ-ㄊㄡˋ', homophone: '歐透 (自動)' },
      { sound: 'Focus', kk: '[ˋfokəs]', zhuyin: 'ㄈㄛˊ-ㄎㄜ-ㄙ', homophone: '佛克斯 (對焦)' },
      { sound: 'Log', kk: '[lɔg]', zhuyin: 'ㄌㄨㄛˋ-ㄍㄜˊ', homophone: '洛格 (紀錄)' }
    ],
    partOfSpeech: 'n.',
    translation: '自動對焦紀錄',
    cleanroomContext: '記錄雷射或光學鏡頭自動對焦補償數值的歷史日誌',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 3',
    exampleSentence: 'Open the focus log.',
    exampleTranslation: '開啟對焦紀錄。',
    exampleSentenceZh: '開啟對焦紀錄。',
    memoryTrick: 'Auto Focus(自動對焦) + Log(紀錄)＝拍不清楚時先查「自動對焦紀錄」！'
  },
  {
    id: 'aoi-s3-03',
    word: 'Motion Roller Log',
    kkPhonetic: '[ˋmoʃən ˋrolɚ lɔg]',
    ipa: '/ˈmoʊ.ʃən ˈroʊ.lər lɔːɡ/',
    syllables: 'Mo·tion · Rol·ler · Log',
    zhuyinPhonetic: 'ㄇㄛˋ-ㄒㄩㄢ ㄌㄨㄛˊ-ㄌㄜˋ ㄌㄨㄛˋ-ㄍㄜˊ',
    taiwanPhonetic: '【 莫宣 · 羅勒 · 洛格 】',
    singleSounds: [
      { sound: 'Motion', kk: '[ˋmoʃən]', zhuyin: 'ㄇㄛˋ-ㄒㄩㄢ', homophone: '莫宣 (運動)' },
      { sound: 'Roller', kk: '[ˋrolɚ]', zhuyin: 'ㄌㄨㄛˊ-ㄌㄜˋ', homophone: '羅勒 (滾輪)' },
      { sound: 'Log', kk: '[lɔg]', zhuyin: 'ㄌㄨㄛˋ-ㄍㄜˊ', homophone: '洛格 (日誌)' }
    ],
    partOfSpeech: 'n.',
    translation: '滾輪傳動日誌',
    cleanroomContext: '記錄基板傳送軌道滾輪與伺服軸運動狀態的日誌',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 3',
    exampleSentence: 'Check the roller log.',
    exampleTranslation: '檢查滾輪日誌。',
    exampleSentenceZh: '檢查滾輪日誌。',
    memoryTrick: 'Motion(運動) + Roller(滾輪) + Log(紀錄)＝卡板時必查的「滾輪傳動日誌」！'
  },
  {
    id: 'aoi-s3-04',
    word: 'Sucker Manager',
    kkPhonetic: '[ˋsʌkɚ ˋmænɪdʒɚ]',
    ipa: '/ˈsʌk.ər ˈmæn.ɪ.dʒər/',
    syllables: 'Suck·er · Man·a·ger',
    zhuyinPhonetic: 'ㄙㄚˋ-ㄎㄜ ㄇㄞˋ-ㄋㄧ-ㄐㄩ-ㄦ',
    taiwanPhonetic: '【 薩克 · 麥尼居爾 】',
    singleSounds: [
      { sound: 'Sucker', kk: '[ˋsʌkɚ]', zhuyin: 'ㄙㄚˋ-ㄎㄜ', homophone: '薩克 (真空吸嘴)' },
      { sound: 'Manager', kk: '[ˋmænɪdʒɚ]', zhuyin: 'ㄇㄞˋ-ㄋㄧ-ㄐㄩ-ㄦ', homophone: '麥尼居爾 (管理介面)' }
    ],
    partOfSpeech: 'n.',
    translation: '吸嘴管理',
    cleanroomContext: '控制與監測取放手臂真空吸嘴破真空、負壓閾值與啟閉狀態的管理畫面',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 3',
    exampleSentence: 'Check sucker manager.',
    exampleTranslation: '檢查吸嘴管理。',
    exampleSentenceZh: '檢查吸嘴管理。',
    memoryTrick: 'Sucker(真空吸嘴) + Manager(管理員)＝吸不起基板時必看的「吸嘴管理」！'
  },
  {
    id: 'aoi-s3-05',
    word: 'Golden Sample',
    kkPhonetic: '[ˋgoldən ˋsæmp!]',
    ipa: '/ˈɡoʊl.dən ˈsæm.pəl/',
    syllables: 'Gol·den · Sam·ple',
    zhuyinPhonetic: 'ㄍㄡ-ㄉㄥ ㄙㄢˋ-ㄆㄛˊ',
    taiwanPhonetic: '【 勾登 · 散婆 】',
    singleSounds: [
      { sound: 'Golden', kk: '[ˋgoldən]', zhuyin: 'ㄍㄡ-ㄉㄥ', homophone: '勾登 (黃金標準)' },
      { sound: 'Sample', kk: '[ˋsæmp!]', zhuyin: 'ㄙㄢˋ-ㄆㄛˊ', homophone: '散婆 (樣本)' }
    ],
    partOfSpeech: 'n.',
    translation: '黃金樣本',
    cleanroomContext: '已知缺陷位置與標準特徵的基準樣品片，用於每日開機點檢驗證機台準確度',
    category: 'imported',
    isImported: true,
    sourceFileName: '公開光學檢測單元 3',
    exampleSentence: 'Test the golden sample.',
    exampleTranslation: '測試黃金樣本。',
    exampleSentenceZh: '測試黃金樣本。',
    memoryTrick: 'Golden(黃金級標準) + Sample(樣品)＝開機點檢必測的「黃金樣本」！'
  }
];

export const AOI_HANDWRITTEN_VOCAB: VocabItem[] = RAW_AOI_HANDWRITTEN_VOCAB.map((item) => ({
  ...item,
  kkPhonetic: item.kkPhonetic || getWordKKPhonetic(item.word, item.ipa),
  zhuyinPhonetic: item.zhuyinPhonetic || convertPhoneticToZhuyin(item.taiwanPhonetic)
}));

/**
 * 將 20 個光學檢測核心單字與機台狀態拆分為「3～4 個單字」的超短句型教材，
 * 讓學員一次只學一個短動作＋一個核心單字，零負擔輕鬆秒背！
 */
export const AOI_HANDWRITTEN_LESSONS: Lesson[] = [
  {
    id: 'aoi-hw-lesson-1',
    scenario: '公開光學檢測單元 1 · 跳晶感測器',
    english_sentence: 'Check the jump sensor.',
    chinese_translation: '檢查跳晶感測器。',
    components: {
      subject: 'We (我們)',
      action: 'check (檢查)',
      bridge: 'the (這顆)',
      object: 'jump sensor (跳晶感測器).'
    },
    phonetic_taiwan: '【 柴克 ｜ 惹 ｜ 醬普 ｜ 森瑟 】',
    memory_trick: '4字極簡句：Check(檢查) + the + jump sensor(跳晶感測器)！',
    additional_context: '極簡 4 字句：Check + the + jump sensor',
    category: 'custom-imported'
  },
  {
    id: 'aoi-hw-lesson-2',
    scenario: '公開光學檢測單元 1 · JIG 定位治具板',
    english_sentence: 'Place the JIG board.',
    chinese_translation: '放置 JIG 定位治具板。',
    components: {
      subject: 'We (我們)',
      action: 'place (放置)',
      bridge: 'the (這塊)',
      object: 'JIG board (JIG定位治具板).'
    },
    phonetic_taiwan: '【 普雷斯 ｜ 惹 ｜ 吉格 ｜ 博德 】',
    memory_trick: '4字極簡句：Place(放置) + the + JIG board(定位治具板)！',
    additional_context: '極簡 4 字句：Place + the + JIG board',
    category: 'custom-imported'
  },
  {
    id: 'aoi-hw-lesson-3',
    scenario: '公開光學檢測單元 1 · 調整光源与啟動檢測',
    english_sentence: 'We tune the light.',
    chinese_translation: '我們調整光源。',
    components: {
      subject: 'We (我們)',
      action: 'tune (調整)',
      bridge: 'the (這組)',
      object: 'light (光源).'
    },
    phonetic_taiwan: '【 威 ｜ 圖恩 ｜ 惹 ｜ 賴特 】',
    memory_trick: '4字極簡句：We(我們) + tune(調整) + the light(光源)，對應 Tuning Light！',
    additional_context: '極簡 4 字句：We + tune + the light',
    category: 'custom-imported'
  },
  {
    id: 'aoi-hw-lesson-4',
    scenario: '公開光學檢測單元 1 · 檢測教導設定',
    english_sentence: 'Run inspection teach.',
    chinese_translation: '執行檢測教導。',
    components: {
      subject: 'We (我們)',
      action: 'run (執行)',
      bridge: 'the (這項)',
      object: 'inspection teach (檢測教導).'
    },
    phonetic_taiwan: '【 潤 ｜ 因斯佩克宣 ｜ 替取 】',
    memory_trick: '3字極簡句：Run(執行) + inspection teach(檢測教導)！',
    additional_context: '極簡 3 字句：Run + inspection teach',
    category: 'custom-imported'
  },
  {
    id: 'aoi-hw-lesson-5',
    scenario: '公開光學檢測單元 1 · 定位與模板轉換',
    english_sentence: 'We align the layout.',
    chinese_translation: '我們對準定位模板。',
    components: {
      subject: 'We (我們)',
      action: 'align (定位對準)',
      bridge: 'the (這張)',
      object: 'layout (模板).'
    },
    phonetic_taiwan: '【 威 ｜ 額賴恩 ｜ 惹 ｜ 雷奧特 】',
    memory_trick: '4字極簡句：同時學會 Align(定位) 與 Layout(模板)！',
    additional_context: '極簡 4 字句：We + align + the layout',
    category: 'custom-imported'
  },
  {
    id: 'aoi-hw-lesson-6',
    scenario: '公開光學檢測單元 1 · 二維條碼與搜索無目標',
    english_sentence: 'Scan the 2D code.',
    chinese_translation: '掃描二維條碼。',
    components: {
      subject: 'We (我們)',
      action: 'scan (掃描)',
      bridge: 'the (這個)',
      object: '2D code (二維條碼).'
    },
    phonetic_taiwan: '【 斯干 ｜ 惹 ｜ 兔迪 ｜ 扣得 】',
    memory_trick: '4字極簡句：Scan(掃描) + the + 2D code(二維條碼)！',
    additional_context: '極簡 4 字句：Scan + the + 2D code',
    category: 'custom-imported'
  },
  {
    id: 'aoi-hw-lesson-7',
    scenario: '公開光學檢測單元 1 · 基板與錫球檢測',
    english_sentence: 'Check the C4 bumps.',
    chinese_translation: '檢查覆晶錫球。',
    components: {
      subject: 'We (我們)',
      action: 'check (檢查)',
      bridge: 'the (這些)',
      object: 'C4 bumps (覆晶錫球).'
    },
    phonetic_taiwan: '【 柴克 ｜ 惹 ｜ 西佛 ｜ 棒普斯 】',
    memory_trick: '4字極簡句：Check(檢查) + the + C4 bumps(錫球)！',
    additional_context: '極簡 4 字句：Check + the + C4 bumps',
    category: 'custom-imported'
  },
  {
    id: 'aoi-hw-lesson-8',
    scenario: '公開光學檢測單元 1 · 晶粒與複數晶粒檢測',
    english_sentence: 'Check the couple dies.',
    chinese_translation: '檢查複數晶粒。',
    components: {
      subject: 'We (我們)',
      action: 'check (檢查)',
      bridge: 'the (這組)',
      object: 'couple dies (複數晶粒).'
    },
    phonetic_taiwan: '【 柴克 ｜ 惹 ｜ 卡婆 ｜ 戴茲 】',
    memory_trick: '4字極簡句：Check(檢查) + the + couple dies(複數晶粒)！',
    additional_context: '極簡 4 字句：Check + the + couple dies',
    category: 'custom-imported'
  },
  {
    id: 'aoi-hw-lesson-9',
    scenario: '公開光學檢測單元 1 · 底膠與被動元件檢測',
    english_sentence: 'Check the underfill.',
    chinese_translation: '檢查底膠狀態。',
    components: {
      subject: 'We (我們)',
      action: 'check (檢查)',
      bridge: 'the (這層)',
      object: 'underfill (底膠).'
    },
    phonetic_taiwan: '【 柴克 ｜ 惹 ｜ 安德菲爾 】',
    memory_trick: '3字極簡句：Check(檢查) + the + underfill(底膠)！',
    additional_context: '極簡 3 字句：Check + the + underfill',
    category: 'custom-imported'
  },
  {
    id: 'aoi-hw-lesson-10',
    scenario: '公開光學檢測單元 1 · 散熱片、字元與銅墊檢測',
    english_sentence: 'Inspect the Cu pad.',
    chinese_translation: '檢測基板銅墊。',
    components: {
      subject: 'We (我們)',
      action: 'inspect (檢測)',
      bridge: 'the (這塊)',
      object: 'Cu pad (銅墊).'
    },
    phonetic_taiwan: '【 因斯佩克特 ｜ 惹 ｜ 卡珀 ｜ 派德 】',
    memory_trick: '4字極簡句：Inspect(檢測) + the + Cu pad(銅墊)！',
    additional_context: '極簡 4 字句：Inspect + the + Cu pad',
    category: 'custom-imported'
  },
  {
    id: 'aoi-hw-lesson-11',
    scenario: '公開光學檢測單元 2 · 檢查控制器與連線狀態',
    english_sentence: 'Check the PLC status.',
    chinese_translation: '檢查控制器狀態。',
    components: {
      subject: 'We (我們)',
      action: 'check (檢查)',
      bridge: 'the (這項)',
      object: 'PLC status (控制器狀態).'
    },
    phonetic_taiwan: '【 柴克 ｜ 惹 ｜ 批艾歐西 ｜ 斯泰特斯 】',
    memory_trick: '4字極簡句：Check + the + PLC status！',
    additional_context: '極簡 4 字句：Check + the + PLC status',
    category: 'custom-imported'
  },
  {
    id: 'aoi-hw-lesson-12',
    scenario: '公開光學檢測單元 3 · 測試黃金標準樣品',
    english_sentence: 'Test the golden sample.',
    chinese_translation: '測試黃金樣本。',
    components: {
      subject: 'We (我們)',
      action: 'test (測試)',
      bridge: 'the (這片)',
      object: 'golden sample (黃金樣本).'
    },
    phonetic_taiwan: '【 泰斯特 ｜ 惹 ｜ 勾登 ｜ 散婆 】',
    memory_trick: '4字極簡句：Test + the + golden sample！',
    additional_context: '極簡 4 字句：Test + the + golden sample',
    category: 'custom-imported'
  }
];
