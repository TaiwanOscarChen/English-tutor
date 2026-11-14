import React, { useEffect } from 'react';

export type LineHeightMode = 'compact' | 'comfortable' | 'spacious';
export type ReadingWidthMode = 'full' | 'optimal' | 'focus';

interface TypographyOptimizerProps {
  enabled?: boolean;
}

const STORAGE_KEY_TYPO = 'fse_typography_optimizer_config';

/**
 * Global Typography Optimizer
 * Automatically optimizes paragraphs and text containers across the DOM in the background
 * with comfortable line-height, optimal line-width, and reading ergonomics.
 */
export const TypographyOptimizer: React.FC<TypographyOptimizerProps> = ({ enabled = true }) => {
  useEffect(() => {
    if (!enabled) return;

    let lineHeight: LineHeightMode = 'comfortable';
    let readingWidth: ReadingWidthMode = 'optimal';
    let paragraphIndent: boolean = false;

    try {
      const saved = localStorage.getItem(STORAGE_KEY_TYPO);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lineHeight) lineHeight = parsed.lineHeight;
        if (parsed.readingWidth) readingWidth = parsed.readingWidth;
        if (typeof parsed.paragraphIndent === 'boolean') paragraphIndent = parsed.paragraphIndent;
      }
    } catch {}

    const optimizeParagraphs = () => {
      // Only target dedicated long-form reading prose, never generic UI components, buttons, or cards
      const candidates = document.querySelectorAll('.reading-block, .article-content p, .sop-description, .article-reader-body p');

      candidates.forEach((el) => {
        // Skip if inside buttons, badges, navbars, or cards
        if (el.closest('button, nav, header, footer, .no-typo-opt, .lesson-card, .vocab-card')) return;
        const text = el.textContent || '';
        // If paragraph has more than 35 characters, optimize its reading ergonomics
        if (text.trim().length > 35) {
          el.classList.add('reader-optimized-paragraph');
          
          // Apply line-height class
          el.classList.remove('lh-compact', 'lh-comfortable', 'lh-spacious');
          el.classList.add(`lh-${lineHeight}`);

          // Apply reading width restriction
          el.classList.remove('rw-full', 'rw-optimal', 'rw-focus');
          el.classList.add(`rw-${readingWidth}`);

          // Apply paragraph indentation if active
          if (paragraphIndent) {
            el.classList.add('para-indent');
          } else {
            el.classList.remove('para-indent');
          }
        }
      });
    };

    // Run initially
    optimizeParagraphs();

    // Observe DOM mutations to automatically format newly rendered/AI-generated paragraphs
    const observer = new MutationObserver(() => {
      optimizeParagraphs();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
    };
  }, [enabled]);

  // Clean background worker: does not render intrusive floating buttons on the screen
  return null;
};
