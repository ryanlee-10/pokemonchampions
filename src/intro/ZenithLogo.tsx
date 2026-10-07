import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  size?: number;
  /** Animate the outline being traced (intro). */
  trace?: boolean;
  traceDuration?: number;
  showText?: boolean;
  className?: string;
}

/** Stylized Pokéball with "Pokémon Zenith" across the belt. */
export const ZenithLogo: React.FC<LogoProps> = ({
  size = 320, trace = false, traceDuration = 3, showText = true, className,
}) => {
  const stroke = trace
    ? { initial: { pathLength: 0, opacity: 0.4 }, animate: { pathLength: 1, opacity: 1 }, transition: { duration: traceDuration, ease: 'easeInOut' as const } }
    : {};
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} className={className} aria-label="Pokémon Zenith">
      <defs>
        <linearGradient id="zl-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4d6d" />
          <stop offset="1" stopColor="#b5179e" />
        </linearGradient>
        <linearGradient id="zl-bot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#a5b4fc" />
        </linearGradient>
        <linearGradient id="zl-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
        <clipPath id="zl-clip-top"><rect x="0" y="0" width="400" height="190" /></clipPath>
        <clipPath id="zl-clip-bot"><rect x="0" y="210" width="400" height="190" /></clipPath>

      </defs>

      {!trace && (
        <>
          <circle cx="200" cy="200" r="170" fill="url(#zl-top)" clipPath="url(#zl-clip-top)" opacity="0.92" />
          <circle cx="200" cy="200" r="170" fill="url(#zl-bot)" clipPath="url(#zl-clip-bot)" opacity="0.96" />
          <rect x="30" y="184" width="340" height="32" fill="#0b0b18" />
        </>
      )}

      <g style={{ filter: 'drop-shadow(0 0 10px rgba(167, 139, 250, 0.8))' }} fill="none" stroke="url(#zl-line)" strokeWidth="7" strokeLinecap="round">
        <motion.circle cx="200" cy="200" r="170" {...stroke} />
        <motion.path d="M30 200 H150 M250 200 H370" {...stroke} />
        <motion.circle cx="200" cy="200" r="50" {...stroke} />
        {/* Zenith peak */}
        <motion.path d="M160 140 L200 96 L240 140" strokeWidth="5" {...stroke} />
      </g>

      {!trace && <circle cx="200" cy="200" r="34" fill="#0b0b18" stroke="url(#zl-line)" strokeWidth="5" />}

      {showText && !trace && (
        <text
          x="200" y="208" textAnchor="middle"
          fontFamily="Outfit, sans-serif" fontWeight="800" fontSize="40" letterSpacing="3"
          fill="#fff" style={{ paintOrder: 'stroke' }} stroke="#0b0b18" strokeWidth="6"
        >
          POKÉMON ZENITH
        </text>
      )}
    </svg>
  );
};
