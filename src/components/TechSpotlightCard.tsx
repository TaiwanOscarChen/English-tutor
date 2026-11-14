import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';

interface TechSpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  borderColor?: string;
  enableTilt?: boolean;
}

export const TechSpotlightCard: React.FC<TechSpotlightCardProps> = ({
  children,
  className = '',
  glowColor = 'rgba(56, 189, 248, 0.22)', // Cyan glow by default
  borderColor = 'rgba(250, 204, 21, 0.4)', // Yellow accent
  enableTilt = true
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: -200, y: -200 });
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setPosition({ x, y });

    if (enableTilt) {
      // Calculate 3D tilt relative to center of card
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = -((y - centerY) / centerY) * 5; // Max 5 deg tilt
      const rotateY = ((x - centerX) / centerX) * 5;  // Max 5 deg tilt
      setTilt({ rotateX, rotateY });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  return (
    <div className="perspective-1000 w-full h-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX: tilt.rotateX,
          rotateY: tilt.rotateY,
          scale: isHovered ? 1.008 : 1
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20
        }}
        style={{ transformStyle: 'preserve-3d' }}
        className={`relative overflow-hidden rounded-3xl transition-all duration-300 litho-border-scan ${className}`}
      >
        {/* Dynamic Wafer Circuit Light Spotlight following mouse */}
        {isHovered && (
          <>
            {/* Surface Glow Spotlight */}
            <div
              className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-10 rounded-3xl"
              style={{
                background: `radial-gradient(450px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 80%)`,
              }}
            />
            {/* Border Circuit Light Tracking */}
            <div
              className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-10 rounded-3xl p-[1.5px]"
              style={{
                background: `radial-gradient(280px circle at ${position.x}px ${position.y}px, ${borderColor}, transparent 80%)`,
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />
            {/* Subtle 3D Glass Sheen Reflection */}
            <div
              className="pointer-events-none absolute inset-0 z-10 rounded-3xl opacity-30"
              style={{
                background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(56,189,248,0.05) 100%)`
              }}
            />
          </>
        )}

        {/* Card Content Container */}
        <div className="relative z-20 h-full">{children}</div>
      </motion.div>
    </div>
  );
};

