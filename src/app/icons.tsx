import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/** Two small people. */
const People = ({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx="5" cy="14" r="1.8" />
    <path d="M2.2 21v-2.2a2.8 2.8 0 0 1 5.6 0V21" />
    <circle cx="11" cy="14" r="1.8" />
    <path d="M8.2 21v-2.2a2.8 2.8 0 0 1 5.6 0V21" />
  </g>
);

const Swords = () => (
  <g>
    <path d="M3 3l8 8M3 3v4M3 3h4" />
    <path d="M21 3l-8 8M21 3v4M21 3h-4" />
    <path d="M7.5 9.5l-1.5 1.5M16.5 9.5l1.5 1.5" />
  </g>
);

export const HomeIcon: React.FC<IconProps> = ({ size = 22, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h5v-6h4v6h5V10" />
  </svg>
);

export const MusicIcon: React.FC<IconProps> = ({ size = 22, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M9 18V5l11-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
  </svg>
);

/** Two clashing swords + two people. */
export const MultiplayerIcon: React.FC<IconProps> = ({ size = 22, className }) => (
  <svg {...base(size)} className={className}>
    <Swords />
    <People x={5} y={-1.5} s={0.85} />
  </svg>
);

/** Two clashing swords + robot. */
export const CpuBattleIcon: React.FC<IconProps> = ({ size = 22, className }) => (
  <svg {...base(size)} className={className}>
    <Swords />
    <g>
      <path d="M12 11.5v1.5" />
      <circle cx="12" cy="11" r="0.7" />
      <rect x="6.5" y="13" width="11" height="8" rx="2" />
      <circle cx="10" cy="16.5" r="0.9" fill="currentColor" />
      <circle cx="14" cy="16.5" r="0.9" fill="currentColor" />
      <path d="M10 19h4M4.5 16v2M19.5 16v2" />
    </g>
  </svg>
);

/** Group of three people standing together. */
export const TeambuilderIcon: React.FC<IconProps> = ({ size = 22, className }) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="7" r="2.6" />
    <path d="M7.8 20v-3.5a4.2 4.2 0 0 1 8.4 0V20" />
    <circle cx="4.5" cy="9.5" r="2" />
    <path d="M1.2 19v-2.4a3.3 3.3 0 0 1 4.6-3" />
    <circle cx="19.5" cy="9.5" r="2" />
    <path d="M22.8 19v-2.4a3.3 3.3 0 0 0-4.6-3" />
  </svg>
);

export const ProfileIcon: React.FC<IconProps> = ({ size = 22, className }) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ size = 22, className }) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const PokeballIcon: React.FC<IconProps> = ({ size = 22, className }) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M2.5 12h6.8M14.7 12h6.8" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);
