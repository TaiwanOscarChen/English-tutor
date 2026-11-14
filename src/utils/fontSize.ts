// Font Size & Responsive Fluid Readability Management for FSE Web

export type FontSizeLevel = 'sm' | 'md' | 'lg' | 'xl';

export interface FontSizeOption {
  level: FontSizeLevel;
  label: string;
  shortLabel: string;
  multiplier: number;
  description: string;
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  {
    level: 'sm',
    label: '緊湊 (小)',
    shortLabel: '小',
    multiplier: 0.88,
    description: '預設緊湊視圖，版面精煉高密度'
  },
  {
    level: 'md',
    label: '標準 (中)',
    shortLabel: '中',
    multiplier: 1.0,
    description: '標準自適應流體字級'
  },
  {
    level: 'lg',
    label: '放大 (大)',
    shortLabel: '大',
    multiplier: 1.12,
    description: '提升字體對比與遠距閱讀'
  },
  {
    level: 'xl',
    label: '特大 (特大)',
    shortLabel: '特大',
    multiplier: 1.25,
    description: '適合平板立架或無塵室站姿遠看'
  }
];

export function getStoredFontSize(): FontSizeLevel {
  if (typeof window === 'undefined') return 'sm';
  try {
    const saved = localStorage.getItem('fse_font_size_level');
    if (saved === 'sm' || saved === 'md' || saved === 'lg' || saved === 'xl') {
      return saved;
    }
  } catch (e) {}
  return 'sm';
}

export function applyFontSizeToDocument(level: FontSizeLevel): void {
  if (typeof document === 'undefined') return;
  try {
    document.documentElement.setAttribute('data-font-size', level);
    const opt = FONT_SIZE_OPTIONS.find(o => o.level === level) || FONT_SIZE_OPTIONS[0];
    document.documentElement.style.setProperty('--font-scale', opt.multiplier.toString());
    localStorage.setItem('fse_font_size_level', level);
  } catch (e) {}
}

export function cycleNextFontSize(current: FontSizeLevel): FontSizeLevel {
  const levels: FontSizeLevel[] = ['sm', 'md', 'lg', 'xl'];
  const idx = levels.indexOf(current);
  const nextIdx = (idx + 1) % levels.length;
  return levels[nextIdx];
}
