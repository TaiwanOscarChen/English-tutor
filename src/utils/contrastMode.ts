// Contrast Mode Management for Semiconductor Cleanroom Environment
// Supports Standard (標準模式) and High Contrast (高對比模式)

export type ContrastMode = 'standard' | 'high-contrast';

const STORAGE_KEY = 'fse_cleanroom_contrast_mode';

export function getStoredContrastMode(): ContrastMode {
  if (typeof window === 'undefined') return 'standard';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'high-contrast' || saved === 'standard') {
      return saved;
    }
  } catch (e) {
    console.warn('Failed to read contrast mode from localStorage:', e);
  }
  return 'standard';
}

export function applyContrastModeToDocument(mode: ContrastMode): void {
  if (typeof document === 'undefined') return;
  try {
    const root = document.documentElement;
    if (mode === 'high-contrast') {
      root.setAttribute('data-contrast-mode', 'high-contrast');
      root.classList.add('cleanroom-high-contrast');
    } else {
      root.removeAttribute('data-contrast-mode');
      root.classList.remove('cleanroom-high-contrast');
    }
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (e) {
    console.warn('Failed to set contrast mode:', e);
  }
}

export function toggleContrastMode(): ContrastMode {
  const current = getStoredContrastMode();
  const next: ContrastMode = current === 'high-contrast' ? 'standard' : 'high-contrast';
  applyContrastModeToDocument(next);
  return next;
}
