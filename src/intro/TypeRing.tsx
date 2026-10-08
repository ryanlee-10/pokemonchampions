import React from 'react';
import { motion } from 'motion/react';

export const TYPE_COLORS: Record<string, string> = {
  Normal: '#a8a77a', Fire: '#ee8130', Water: '#6390f0', Grass: '#7ac74c',
  Electric: '#f7d02c', Ice: '#96d9d6', Fighting: '#c22e28', Poison: '#a33ea1',
  Ground: '#e2bf65', Flying: '#a98ff3', Psychic: '#f95587', Bug: '#a6b91a',
  Rock: '#b6a136', Ghost: '#735797', Dragon: '#6f35fc', Steel: '#b7b7ce',
  Dark: '#705746', Fairy: '#d685ad',
};
const TYPES = Object.keys(TYPE_COLORS);

/** Simple 24x24 line glyphs, one per type. */
const GLYPHS: Record<string, React.ReactNode> = {
  Normal: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" /></>,
  Fire: <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" />,
  Water: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  Grass: <path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14zM5 19l8-8" />,
  Electric: <path d="M13 2L5 14h6l-1 8 8-12h-6z" />,
  Ice: <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />,
  Fighting: <path d="M7 11V7a2 2 0 0 1 4 0V6a2 2 0 0 1 4 0v1a2 2 0 0 1 3 2v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z" />,
  Poison: <><path d="M12 3a7 7 0 0 0-4 12.7V19h8v-3.7A7 7 0 0 0 12 3z" /><circle cx="9.5" cy="11" r="1" /><circle cx="14.5" cy="11" r="1" /></>,
  Ground: <path d="M3 19l6-10 4 6 3-4 5 8z" />,
  Flying: <path d="M3 15c4 0 7-2 9-8 2 6 5 8 9 8-4 1-7 3-9 5-2-2-5-4-9-5z" />,
  Psychic: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  Bug: <path d="M12 8a4 5 0 0 1 4 5v2a4 4 0 0 1-8 0v-2a4 5 0 0 1 4-5zM12 8V5M9 5l3 1 3-1M5 11l3 2M19 11l-3 2M5 18l3-2M19 18l-3-2" />,
  Rock: <path d="M8 4h8l4 8-4 8H8l-4-8z" />,
  Ghost: <><path d="M6 20V11a6 6 0 0 1 12 0v9l-3-2-3 2-3-2z" /><circle cx="10" cy="11" r="1" /><circle cx="14" cy="11" r="1" /></>,
  Dragon: <path d="M12 3l8 9-8 9-8-9zM12 8l3 4-3 4-3-4z" />,
  Steel: <><path d="M12 3l7 4v10l-7 4-7-4V7z" /><circle cx="12" cy="12" r="3" /></>,
  Dark: <path d="M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z" />,
  Fairy: <path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" />,
};

const RADIUS = 190;
const ICON = 58;
const SPIN_SECONDS = 6;

/** All 18 types in a ring: they fly in from scattered positions, gather, then spin together. */
export const TypeRing: React.FC = () => (
  <div className="type-ring">
    <motion.div
      className="type-ring-spin"
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{ duration: SPIN_SECONDS, ease: 'linear', repeat: Infinity }}
    >
      {TYPES.map((name, i) => {
        const a = (i / TYPES.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * RADIUS;
        const y = Math.sin(a) * RADIUS;
        return (
          <motion.div
            key={name}
            className="type-ring-slot"
            initial={{ x: x * 3.2, y: y * 3.2, opacity: 0, scale: 0.3 }}
            animate={{ x, y, opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: i * 0.03, ease: 'easeOut' }}
          >
            {/* Counter-rotate so each icon stays upright while the ring spins */}
            <motion.div
              className="type-ring-icon"
              title={name}
              style={{ width: ICON, height: ICON, background: TYPE_COLORS[name], boxShadow: `0 0 24px ${TYPE_COLORS[name]}` }}
              animate={{ rotate: -360 }}
              transition={{ duration: SPIN_SECONDS, ease: 'linear', repeat: Infinity }}
            >
              <svg viewBox="0 0 24 24" width={ICON * 0.58} height={ICON * 0.58} fill="none" stroke="#0b0b18" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                {GLYPHS[name]}
              </svg>
            </motion.div>
          </motion.div>
        );
      })}
    </motion.div>
  </div>
);

/** Single circular type icon (colored disc + glyph); reused across the UI. */
export const TypeBadge: React.FC<{ type: string; size?: number; className?: string }> = ({ type, size = 28, className }) => (
  <span
    className={className}
    title={type}
    style={{ width: size, height: size, borderRadius: '50%', background: TYPE_COLORS[type] || '#888', display: 'inline-grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 0 0 1.5px rgba(255,255,255,0.55), 0 2px 6px rgba(0,0,0,0.45)' }}
  >
    <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke="#0b0b18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {GLYPHS[type]}
    </svg>
  </span>
);
