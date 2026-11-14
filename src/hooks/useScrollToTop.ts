import { useEffect, RefObject } from 'react';

/**
 * Custom hook that automatically scrolls to the top of the window and main container
 * whenever the active tab (or sub-tab) changes.
 *
 * @param activeTab - The primary active tab identifier
 * @param subTab - Optional sub-tab identifier
 * @param containerRef - Optional React ref to the main container element
 */
export function useScrollToTop(
  activeTab: string,
  subTab?: string,
  containerRef?: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    // Scroll window to top smoothly
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });

    // Fallback direct resets for cross-browser safety
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }

    // Scroll main container element if ref is provided
    if (containerRef?.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [activeTab, subTab, containerRef]);
}
