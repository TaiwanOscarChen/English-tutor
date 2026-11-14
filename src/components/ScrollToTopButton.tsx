import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playClickSound } from '../utils/audioEffects';

export const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show when page has scrolled down more than 180px
      if (window.scrollY > 180 || document.documentElement.scrollTop > 180) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    playClickSound();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 15 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 pointer-events-auto"
        >
          <button
            onClick={scrollToTop}
            className="group flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/50 hover:border-amber-300 font-black text-xs shadow-2xl backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            title="回到頂部 (Scroll to top)"
            aria-label="回到最頂部"
          >
            <ArrowUp className="w-4 h-4 stroke-[3] group-hover:-translate-y-0.5 transition-transform" />
            <span className="font-mono text-[11px] font-black hidden sm:inline">TOP 頂部</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
