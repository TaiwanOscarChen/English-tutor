import React from 'react';

interface FseLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  glow?: boolean;
}

export const FseLogo: React.FC<FseLogoProps> = ({
  size = 'md',
  className = '',
  glow = true
}) => {
  const sizeMap = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-16 h-16'
  };

  const dim = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-xl select-none group transition-transform ${dim} ${
        glow ? 'shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/30' : ''
      } ${className}`}
      title="FSE Studio 晶圓科技英文"
    >
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full drop-shadow-md group-hover:scale-105 group-hover:rotate-1 transition-all duration-300 ease-out"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Deep Obsidian Cleanroom Substrate */}
          <linearGradient id="fse-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="50%" stopColor="#0b1329" />
            <stop offset="100%" stopColor="#020817" />
          </linearGradient>

          {/* 24K Wafer Gold Metallic Bevel */}
          <linearGradient id="fse-logo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="25%" stopColor="#fde047" />
            <stop offset="65%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Cleanroom Argon Laser Cyan */}
          <linearGradient id="fse-logo-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          {/* Central Silicon Die Gradient */}
          <linearGradient id="fse-logo-die" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="60%" stopColor="#080e1c" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* High-Legibility Typography Gradient */}
          <linearGradient id="fse-logo-text" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          {/* Subtle Laser Core Glow */}
          <filter id="fse-logo-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Squircle Chip Carrier Carrier Substrate */}
        <rect width="120" height="120" rx="26" fill="url(#fse-logo-bg)" />
        <rect
          x="1.5"
          y="1.5"
          width="117"
          height="117"
          rx="24.5"
          stroke="url(#fse-logo-gold)"
          strokeWidth="2.5"
          strokeOpacity="0.45"
        />
        <rect
          x="3.5"
          y="3.5"
          width="113"
          height="113"
          rx="22.5"
          stroke="url(#fse-logo-cyan)"
          strokeWidth="1.2"
          strokeOpacity="0.3"
        />

        {/* Silicon Wafer 300mm Outer Ring */}
        <circle
          cx="60"
          cy="60"
          r="46"
          stroke="url(#fse-logo-gold)"
          strokeWidth="4"
          fill="#050a16"
        />

        {/* Photolithography Concentric Laser Tracks */}
        <circle
          cx="60"
          cy="60"
          r="41"
          stroke="url(#fse-logo-cyan)"
          strokeWidth="1.2"
          strokeDasharray="5 3.5"
          strokeOpacity="0.85"
        />
        <circle
          cx="60"
          cy="60"
          r="38"
          stroke="#1e293b"
          strokeWidth="1"
          strokeOpacity="0.8"
        />

        {/* Semiconductor Standard Wafer Orientation Notch (晶圓缺角) */}
        <path
          d="M 54 13 L 66 13 L 64 19 L 56 19 Z"
          fill="url(#fse-logo-gold)"
          filter="url(#fse-logo-glow)"
        />

        {/* Stepper Photolithography Axis Reticle (十字光標線) */}
        <line x1="20" y1="60" x2="100" y2="60" stroke="url(#fse-logo-cyan)" strokeWidth="0.8" strokeOpacity="0.4" strokeDasharray="3 3" />
        <line x1="60" y1="20" x2="60" y2="100" stroke="url(#fse-logo-cyan)" strokeWidth="0.8" strokeOpacity="0.4" strokeDasharray="3 3" />

        {/* Microchip Contact Pins (金屬接腳 - 4 on each side) */}
        <g fill="url(#fse-logo-gold)">
          {/* Top Pins */}
          <rect x="47" y="27" width="3" height="7" rx="1" />
          <rect x="54" y="27" width="3" height="7" rx="1" />
          <rect x="63" y="27" width="3" height="7" rx="1" />
          <rect x="70" y="27" width="3" height="7" rx="1" />
          {/* Bottom Pins */}
          <rect x="47" y="86" width="3" height="7" rx="1" />
          <rect x="54" y="86" width="3" height="7" rx="1" />
          <rect x="63" y="86" width="3" height="7" rx="1" />
          <rect x="70" y="86" width="3" height="7" rx="1" />
          {/* Left Pins */}
          <rect x="27" y="47" width="7" height="3" rx="1" />
          <rect x="27" y="54" width="7" height="3" rx="1" />
          <rect x="27" y="63" width="7" height="3" rx="1" />
          <rect x="27" y="70" width="7" height="3" rx="1" />
          {/* Right Pins */}
          <rect x="86" y="47" width="7" height="3" rx="1" />
          <rect x="86" y="54" width="7" height="3" rx="1" />
          <rect x="86" y="63" width="7" height="3" rx="1" />
          <rect x="86" y="70" width="7" height="3" rx="1" />
        </g>

        {/* Central Silicon Microchip Die (核心晶片主體) */}
        <rect
          x="34"
          y="34"
          width="52"
          height="52"
          rx="12"
          fill="url(#fse-logo-die)"
          stroke="url(#fse-logo-gold)"
          strokeWidth="2.5"
        />
        <rect
          x="37"
          y="37"
          width="46"
          height="46"
          rx="9"
          stroke="url(#fse-logo-cyan)"
          strokeWidth="1"
          strokeOpacity="0.6"
        />

        {/* 4 Corner Precision Laser Fiducial Nodes (奈米對位點) */}
        <circle cx="41" cy="41" r="2" fill="#38bdf8" />
        <circle cx="79" cy="41" r="2" fill="#38bdf8" />
        <circle cx="41" cy="79" r="2" fill="#38bdf8" />
        <circle cx="79" cy="79" r="2" fill="#fbbf24" />

        {/* Core FSE Bold High-Tech Emblem Typography with High Contrast Drop Shadow */}
        <text
          x="60"
          y="64.5"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="21"
          fontWeight="900"
          fill="#020617"
          textAnchor="middle"
          letterSpacing="-0.8"
        >
          FSE
        </text>
        <text
          x="60"
          y="63.5"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="21"
          fontWeight="900"
          fill="url(#fse-logo-text)"
          textAnchor="middle"
          letterSpacing="-0.8"
        >
          FSE
        </text>

        {/* Micro Sub-Label: STUDIO */}
        <text
          x="60"
          y="74"
          fontFamily="system-ui, -apple-system, monospace"
          fontSize="6.8"
          fontWeight="900"
          fill="#38bdf8"
          textAnchor="middle"
          letterSpacing="1.8"
        >
          STUDIO
        </text>
      </svg>

      {/* Laser Reflection Shimmer Ambient Effect */}
      <div className="absolute inset-0 rounded-xl pointer-events-none ring-1 ring-amber-400/20 group-hover:ring-amber-300/50 transition-all duration-300" />
    </div>
  );
};

export default FseLogo;
