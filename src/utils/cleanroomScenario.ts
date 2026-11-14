// Cleanroom Scenario & Atmospheric Context Management for Semiconductor Fab
// Authentic environments: Lithography Yellow, Plasma CVD/Etch Cyan, Alarm/Handover Crimson, Cleanroom Aurora, and Ultra-High Contrast.

export type CleanroomScenarioId = 'litho' | 'plasma' | 'alert' | 'aurora' | 'contrast';

export interface CleanroomScenarioConfig {
  id: CleanroomScenarioId;
  name: string;
  shortName: string;
  tag: string;
  symbol: string;
  description: string;
  accentColor: string;
  accentBorder: string;
  badgeBg: string;
  badgeText: string;
  orbs: string[];
  particleColors: string[];
  gridColor: string;
  beamGrad: string[];
  highContrast: boolean;
}

export const CLEANROOM_SCENARIOS: CleanroomScenarioConfig[] = [
  {
    id: 'litho',
    name: '500nm 黃光微影曝光區 (Litho)',
    shortName: '黃光微影',
    tag: '500nm 濾光保護',
    symbol: '💛',
    description: '模擬半導體黃光區環境光，防光阻劑過曝，呈現極致琥珀暖金高對比與光刻軌跡。',
    accentColor: '#fbbf24',
    accentBorder: '#f59e0b',
    badgeBg: 'bg-amber-400/20',
    badgeText: 'text-amber-300',
    orbs: ['bg-amber-500/20', 'bg-yellow-500/20', 'bg-orange-500/15'],
    particleColors: ['#fbbf24', '#f59e0b', '#fde047', '#fed7aa', '#ffffff'],
    gridColor: 'rgba(245, 158, 11, 0.2)',
    beamGrad: ['#fbbf24', '#f59e0b', '#fde047'],
    highContrast: false,
  },
  {
    id: 'plasma',
    name: '電漿蝕刻與薄膜沉積室 (Plasma CVD)',
    shortName: '電漿薄膜',
    tag: '氬氣電漿放電',
    symbol: '💙',
    description: '模擬真空反應室 (Chamber) 高能電漿與雷射光刻，深邃電光青與藍寶石超清對比。',
    accentColor: '#38bdf8',
    accentBorder: '#0284c7',
    badgeBg: 'bg-cyan-400/20',
    badgeText: 'text-cyan-300',
    orbs: ['bg-cyan-500/20', 'bg-blue-500/20', 'bg-indigo-500/15'],
    particleColors: ['#38bdf8', '#06b6d4', '#60a5fa', '#a5f3fc', '#ffffff'],
    gridColor: 'rgba(56, 189, 248, 0.2)',
    beamGrad: ['#38bdf8', '#06b6d4', '#60a5fa'],
    highContrast: false,
  },
  {
    id: 'alert',
    name: '機台警報與工安交接 (Alarm SOS)',
    shortName: '警報搶修',
    tag: '機台 Interlock 警報',
    symbol: '🚨',
    description: '突發故障、Interlock 警報搶修與大夜班交接情境，高醒目度警示紅金超強對比。',
    accentColor: '#f43f5e',
    accentBorder: '#e11d48',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    orbs: ['bg-rose-500/25', 'bg-amber-500/20', 'bg-red-500/15'],
    particleColors: ['#f43f5e', '#fb7185', '#fbbf24', '#fecdd3', '#ffffff'],
    gridColor: 'rgba(244, 63, 94, 0.22)',
    beamGrad: ['#f43f5e', '#fbbf24', '#e11d48'],
    highContrast: false,
  },
  {
    id: 'aurora',
    name: '全光譜無塵室極光 (Cleanroom Aurora)',
    shortName: '無塵室極光',
    tag: '全光譜平衡護眼',
    symbol: '🌌',
    description: '兼顧長時間學習護眼與科技沉浸感，融合金黃、電光青與琉璃紫全光譜粒子。',
    accentColor: '#38bdf8',
    accentBorder: '#38bdf8',
    badgeBg: 'bg-indigo-500/20',
    badgeText: 'text-indigo-300',
    orbs: ['bg-cyan-500/15', 'bg-amber-500/15', 'bg-indigo-500/15'],
    particleColors: ['#38bdf8', '#facc15', '#818cf8', '#34d399', '#ffffff'],
    gridColor: 'rgba(56, 189, 248, 0.16)',
    beamGrad: ['#38bdf8', '#facc15', '#818cf8'],
    highContrast: false,
  },
  {
    id: 'contrast',
    name: '黑曜矽晶極限高對比 (Ultra Contrast Focus)',
    shortName: '極限高對比',
    tag: 'WCAG AAA 15:1+',
    symbol: '🔬',
    description: '純粹深黑黑曜石底色、純白發光字體與黃金標示，完全消除反光與視覺干擾。',
    accentColor: '#facc15',
    accentBorder: '#eab308',
    badgeBg: 'bg-yellow-400/25',
    badgeText: 'text-yellow-300',
    orbs: ['bg-slate-400/8', 'bg-yellow-500/10'],
    particleColors: ['#facc15', '#ffffff', '#e2e8f0'],
    gridColor: 'rgba(250, 204, 21, 0.18)',
    beamGrad: ['#facc15', '#ffffff'],
    highContrast: true,
  }
];

const SCENARIO_STORAGE_KEY = 'fse_cleanroom_scenario';

export function getStoredScenario(): CleanroomScenarioId {
  if (typeof window === 'undefined') return 'aurora';
  try {
    const saved = localStorage.getItem(SCENARIO_STORAGE_KEY) as CleanroomScenarioId;
    if (saved && CLEANROOM_SCENARIOS.some(s => s.id === saved)) {
      return saved;
    }
    // Also check legacy background theme
    const legacyBg = localStorage.getItem('fse_bg_theme');
    if (legacyBg === 'neon') return 'litho';
    if (legacyBg === 'matrix') return 'plasma';
    if (legacyBg === 'minimal') return 'contrast';
  } catch (e) {
    console.warn('Failed reading scenario from localStorage', e);
  }
  return 'aurora';
}

export function getScenarioConfig(id: CleanroomScenarioId): CleanroomScenarioConfig {
  return CLEANROOM_SCENARIOS.find(s => s.id === id) || CLEANROOM_SCENARIOS[3];
}

export function applyScenarioToDocument(id: CleanroomScenarioId): void {
  if (typeof document === 'undefined') return;
  try {
    const root = document.documentElement;
    root.setAttribute('data-cleanroom-scenario', id);
    
    // Also trigger contrast mode if scenario is contrast
    if (id === 'contrast') {
      root.setAttribute('data-contrast-mode', 'high-contrast');
      root.classList.add('cleanroom-high-contrast');
    } else {
      // Retain or restore standard contrast unless user explicitly toggled it
      const currentContrast = localStorage.getItem('fse_cleanroom_contrast_mode');
      if (currentContrast !== 'high-contrast') {
        root.removeAttribute('data-contrast-mode');
        root.classList.remove('cleanroom-high-contrast');
      }
    }

    localStorage.setItem(SCENARIO_STORAGE_KEY, id);
    localStorage.setItem('fse_bg_theme', id === 'litho' ? 'neon' : id === 'plasma' ? 'matrix' : id === 'contrast' ? 'minimal' : 'aurora');
  } catch (e) {
    console.warn('Failed applying scenario to document', e);
  }
}
