import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CleanroomScenarioId, getStoredScenario, getScenarioConfig } from '../utils/cleanroomScenario';

interface WaferCircuitParticlesProps {
  isTriggered?: boolean;
  scenario?: CleanroomScenarioId;
}

export const WaferCircuitParticles: React.FC<WaferCircuitParticlesProps> = React.memo(({ isTriggered, scenario: propScenario }) => {
  const [scenarioId, setScenarioId] = useState<CleanroomScenarioId>(() => {
    return propScenario || getStoredScenario();
  });
  const [isPageVisible, setIsPageVisible] = useState<boolean>(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );

  useEffect(() => {
    if (propScenario) {
      setScenarioId(propScenario);
    }
  }, [propScenario]);

  // Listen to page visibility to pause background animations when tab is hidden (0% background CPU/GPU)
  useEffect(() => {
    const handleVisibility = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Listen to custom scenario change events or storage updates
  useEffect(() => {
    const handleScenarioChange = (e: Event) => {
      const customEvent = e as CustomEvent<CleanroomScenarioId>;
      if (customEvent.detail) {
        setScenarioId(customEvent.detail);
      } else {
        setScenarioId(getStoredScenario());
      }
    };

    window.addEventListener('cleanroom-scenario-change', handleScenarioChange);
    window.addEventListener('storage', handleScenarioChange);
    return () => {
      window.removeEventListener('cleanroom-scenario-change', handleScenarioChange);
      window.removeEventListener('storage', handleScenarioChange);
    };
  }, []);

  const config = useMemo(() => {
    return getScenarioConfig(scenarioId);
  }, [scenarioId]);

  // Generate lightweight animated floating particles
  const particles = useMemo(() => {
    const isMinimal = scenarioId === 'contrast';
    const count = isMinimal ? 8 : 16;

    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (i * 7 + (i % 3) * 4 + 3) % 96,
      y: (i * 11 + (i % 4) * 3 + 5) % 92,
      size: isMinimal ? 2.5 : Math.floor((i % 4)) + 2.5,
      duration: 8 + (i % 5) * 2,
      delay: i * 0.35,
      color: config.particleColors[i % config.particleColors.length]
    }));
  }, [scenarioId, config]);

  // Circuit grid SVG lines
  const circuitLines = useMemo(() => {
    return [
      { id: 1, x1: 5, y1: 15, x2: 95, y2: 15 },
      { id: 2, x1: 10, y1: 45, x2: 90, y2: 45 },
      { id: 3, x1: 15, y1: 75, x2: 85, y2: 75 }
    ];
  }, []);

  // Deterministic burst particles on trigger (100% pure & GPU smooth)
  const burstParticles = useMemo(() => {
    if (!isTriggered) return [];
    return Array.from({ length: 22 }, (_, i) => ({
      id: i,
      angle: (i / 22) * 360,
      distance: 80 + ((i * 29) % 130),
      size: 3 + (i % 4),
      color: config.particleColors[i % config.particleColors.length]
    }));
  }, [isTriggered, config]);

  if (!isPageVisible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none gpu-smooth">
      {/* Ambient Atmospheric Glow Orbs */}
      <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${config.orbs[0] || 'bg-amber-500/15'}`} />
      <div className={`absolute top-1/2 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${config.orbs[1] || config.orbs[0] || 'bg-cyan-500/15'}`} />
      {config.orbs[2] && (
        <div className={`absolute -bottom-32 left-1/3 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${config.orbs[2]}`} />
      )}

      {/* Rotating 300mm Wafer Disk Silhouette with Notch */}
      <div className="absolute -right-28 -top-28 w-[420px] h-[420px] opacity-15 pointer-events-none transition-opacity duration-500">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
          className="w-full h-full rounded-full border-2 border-dashed relative flex items-center justify-center gpu-smooth"
          style={{ borderColor: config.accentColor }}
        >
          <div 
            className="w-3/4 h-3/4 rounded-full border border-dotted flex items-center justify-center"
            style={{ borderColor: config.accentColor }}
          >
            <div 
              className="w-1/2 h-1/2 rounded-full border border-dashed"
              style={{ borderColor: config.accentColor }}
            />
          </div>
          {/* Wafer Notch */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-2 rounded-b"
            style={{ backgroundColor: config.accentColor }}
          />
        </motion.div>
      </div>

      {/* Wafer Circuit Grid SVG Background Tracks */}
      <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none">
        <defs>
          <linearGradient id="beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={config.beamGrad[0]} stopOpacity="0.8" />
            <stop offset="50%" stopColor={config.beamGrad[1] || config.beamGrad[0]} stopOpacity="0.9" />
            <stop offset="100%" stopColor={config.beamGrad[2] || config.beamGrad[0]} stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {circuitLines.map((line) => (
          <g key={line.id}>
            <line
              x1={`${line.x1}%`}
              y1={`${line.y1}%`}
              x2={`${line.x2}%`}
              y2={`${line.y2}%`}
              stroke={config.gridColor}
              strokeWidth="1"
              strokeDasharray="4 8"
            />
            {/* Animated Laser Pulse Dot along trace */}
            <circle r="2.5" fill={config.accentColor}>
              <animate
                attributeName="cx"
                from={`${line.x1}%`}
                to={`${line.x2}%`}
                dur={`${10 + line.id * 3}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="cy"
                from={`${line.y1}%`}
                to={`${line.y2}%`}
                dur={`${10 + line.id * 3}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}
      </svg>

      {/* Floating Laser Photolithography Beam Overlay */}
      <div
        className="absolute top-0 left-0 right-0 h-[1.5px] opacity-75 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${config.particleColors[0]}, ${config.particleColors[1] || config.particleColors[0]}, transparent)`,
          boxShadow: `0 0 16px ${config.accentColor}`
        }}
      />

      {/* Floating Semiconductor Micro-Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          animate={{
            y: ['0%', '-30%', '0%'],
            x: ['0%', '8%', '-8%', '0%'],
            opacity: [0.25, 0.9, 0.25]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay
          }}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 10px ${p.color}`
          }}
        />
      ))}

      {/* Triggered Burst Effect on goal completion */}
      <AnimatePresence>
        {isTriggered && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
            {burstParticles.map((b) => {
              const rad = (b.angle * Math.PI) / 180;
              const targetX = Math.cos(rad) * b.distance;
              const targetY = Math.sin(rad) * b.distance;

              return (
                <motion.div
                  key={b.id}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{
                    x: targetX,
                    y: targetY,
                    scale: [0, 1.4, 0],
                    opacity: [1, 1, 0]
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute rounded-full"
                  style={{
                    width: `${b.size}px`,
                    height: `${b.size}px`,
                    backgroundColor: b.color,
                    boxShadow: `0 0 14px ${b.color}`
                  }}
                />
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

WaferCircuitParticles.displayName = 'WaferCircuitParticles';
