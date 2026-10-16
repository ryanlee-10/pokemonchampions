import React, { useMemo } from 'react';

export interface ProjectileState {
  phase: 'charge' | 'flight' | 'impact';
  direction: 'to-opp' | 'to-my';
  moveType: string;
  moveName: string;
  category?: 'Physical' | 'Special' | 'Status';
  /** Attacker centre, in % of the arena. */
  startX?: number;
  startY?: number;
  /** Target centre, in % of the arena. */
  endX?: number;
  endY?: number;
}

export const TYPE_VFX_COLORS: Record<string, { primary: string; glow: string; secondary: string }> = {
  Fire: { primary: '#ff4d00', glow: '#ff9a1f', secondary: '#fff1a8' },
  Water: { primary: '#1e88ff', glow: '#5cc8ff', secondary: '#e3f6ff' },
  Electric: { primary: '#ffd000', glow: '#fff36b', secondary: '#ffffff' },
  Grass: { primary: '#2fbf4a', glow: '#8cf06a', secondary: '#e8ffd9' },
  Ice: { primary: '#38d6f0', glow: '#a8f3ff', secondary: '#ffffff' },
  Fighting: { primary: '#e0402c', glow: '#ff9566', secondary: '#fff0d6' },
  Poison: { primary: '#a33ee0', glow: '#d88bff', secondary: '#f6e6ff' },
  Ground: { primary: '#c98a3a', glow: '#e9bd6c', secondary: '#fff1d2' },
  Flying: { primary: '#7fa8ff', glow: '#c9dcff', secondary: '#ffffff' },
  Psychic: { primary: '#ff4f9a', glow: '#ff9cc9', secondary: '#fff0f7' },
  Bug: { primary: '#8fbf1a', glow: '#cdf060', secondary: '#f6ffd9' },
  Rock: { primary: '#a8873e', glow: '#d6bb72', secondary: '#fff4d6' },
  Ghost: { primary: '#6a3fc4', glow: '#a77bff', secondary: '#e8ddff' },
  Dragon: { primary: '#5b4cff', glow: '#9a8cff', secondary: '#e6e2ff' },
  Steel: { primary: '#8fa3b8', glow: '#d3dee9', secondary: '#ffffff' },
  Dark: { primary: '#3a2d4f', glow: '#7d5fa8', secondary: '#d9cdea' },
  Fairy: { primary: '#ff7fc8', glow: '#ffc0e4', secondary: '#ffffff' },
  Normal: { primary: '#c9c4b0', glow: '#ffffff', secondary: '#ffffff' },
};

/** What travels across the field for special moves. */
const FLIGHT_KIND: Record<string, 'orb' | 'beam' | 'shards' | 'bolt' | 'drop' | 'ripple' | 'none'> = {
  Fire: 'orb', Ghost: 'orb', Poison: 'orb', Fairy: 'orb', Dark: 'orb', Normal: 'orb', Fighting: 'orb', Bug: 'shards',
  Water: 'beam', Dragon: 'beam', Ice: 'shards', Grass: 'shards', Flying: 'shards', Steel: 'shards',
  Electric: 'bolt', Rock: 'drop', Ground: 'none', Psychic: 'ripple',
};

/** What happens on the target. */
const IMPACT_KIND: Record<string, string> = {
  Fire: 'flame', Water: 'splash', Electric: 'spark', Grass: 'leaves', Ice: 'crystal', Fighting: 'strike',
  Poison: 'bubbles', Ground: 'quake', Flying: 'slash', Psychic: 'ripple', Bug: 'slash', Rock: 'quake',
  Ghost: 'wisp', Dragon: 'burst', Steel: 'slash', Dark: 'slash', Fairy: 'sparkle', Normal: 'strike',
};

const N = (n: number) => Array.from({ length: n }, (_, i) => i);

export const BattleProjectile: React.FC<{ state: ProjectileState }> = ({ state }) => {
  const { phase, direction, moveType, moveName, category } = state;
  const theme = TYPE_VFX_COLORS[moveType] || TYPE_VFX_COLORS.Normal;
  const toOpp = direction === 'to-opp';

  const sx = state.startX ?? (toOpp ? 36 : 63);
  const sy = state.startY ?? (toOpp ? 72 : 38);
  const ex = state.endX ?? (toOpp ? 63 : 36);
  const ey = state.endY ?? (toOpp ? 38 : 72);

  // Angle/length of the travel path in real pixels (for beams/bolts).
  const geo = useMemo(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1600;
    const h = typeof window !== 'undefined' ? window.innerHeight : 900;
    const dx = ((ex - sx) / 100) * w;
    const dy = ((ey - sy) / 100) * h;
    return { angle: Math.atan2(dy, dx) * (180 / Math.PI), len: Math.hypot(dx, dy) };
  }, [sx, sy, ex, ey]);

  const isContact = category === 'Physical';
  const isStatus = category === 'Status';
  const flight = isContact ? 'none' : (FLIGHT_KIND[moveType] || 'orb');
  const impact = IMPACT_KIND[moveType] || 'burst';

  const vars = {
    ['--c1' as string]: theme.primary,
    ['--c2' as string]: theme.glow,
    ['--c3' as string]: theme.secondary,
    ['--sx' as string]: `${sx}%`,
    ['--sy' as string]: `${sy}%`,
    ['--ex' as string]: `${ex}%`,
    ['--ey' as string]: `${ey}%`,
    ['--ang' as string]: `${geo.angle}deg`,
    ['--len' as string]: `${geo.len}px`,
  } as React.CSSProperties;

  return (
    <div className={`mv-layer mv-${moveType.toLowerCase()}`} style={vars} aria-hidden>
      {/* Charge: quick type-coloured aura on the user */}
      {phase === 'charge' && (
        <div className={`mv-charge ${isStatus ? 'status' : ''}`} style={{ left: `${sx}%`, top: `${sy}%` }}>
          <div className="mv-charge-ring" />
          <div className="mv-charge-glow" />
          {N(isStatus ? 10 : 6).map((i) => (
            <span key={i} className="mv-charge-mote" style={{ ['--a' as string]: `${i * (360 / (isStatus ? 10 : 6))}deg`, animationDelay: `${i * 0.03}s` }} />
          ))}
        </div>
      )}

      {/* Flight */}
      {phase === 'flight' && flight === 'orb' && (
        <div className="mv-orb">
          <div className="mv-orb-trail" />
          <div className="mv-orb-core" />
        </div>
      )}
      {phase === 'flight' && flight === 'beam' && (
        <div className="mv-beam" style={{ left: `${sx}%`, top: `${sy}%` }}>
          <div className="mv-beam-outer" />
          <div className="mv-beam-inner" />
        </div>
      )}
      {phase === 'flight' && flight === 'shards' && N(5).map((i) => (
        <div key={i} className={`mv-shard s-${moveType.toLowerCase()}`} style={{ animationDelay: `${i * 0.045}s`, ['--off' as string]: `${(i - 2) * 14}px` }} />
      ))}
      {phase === 'flight' && flight === 'bolt' && (
        <svg className="mv-bolt" style={{ left: `${ex}%`, top: `${ey}%` }} viewBox="0 0 60 300" preserveAspectRatio="none">
          <polyline points="30,0 18,70 40,110 14,180 38,215 22,300" />
          <polyline className="core" points="30,0 18,70 40,110 14,180 38,215 22,300" />
        </svg>
      )}
      {phase === 'flight' && flight === 'drop' && N(3).map((i) => (
        <div key={i} className="mv-rock" style={{ left: `calc(${ex}% + ${(i - 1) * 46}px)`, top: `${ey}%`, animationDelay: `${i * 0.06}s` }} />
      ))}
      {phase === 'flight' && flight === 'ripple' && N(3).map((i) => (
        <div key={i} className="mv-ripple-travel" style={{ animationDelay: `${i * 0.08}s` }} />
      ))}

      {/* Impact */}
      {phase === 'impact' && (
        <div className={`mv-impact i-${impact}`} style={{ left: `${ex}%`, top: `${ey}%` }}>
          <div className="mv-flash" />
          <div className="mv-ring" />
          {impact === 'flame' && N(7).map((i) => <span key={i} className="mv-flame" style={{ ['--a' as string]: `${-60 + i * 20}deg`, animationDelay: `${i * 0.02}s` }} />)}
          {impact === 'splash' && N(10).map((i) => <span key={i} className="mv-droplet" style={{ ['--a' as string]: `${-80 + i * 18}deg` }} />)}
          {impact === 'spark' && N(8).map((i) => <span key={i} className="mv-spark" style={{ ['--a' as string]: `${i * 45}deg` }} />)}
          {impact === 'leaves' && N(8).map((i) => <span key={i} className="mv-leaf" style={{ ['--a' as string]: `${i * 45 + 10}deg` }} />)}
          {impact === 'crystal' && N(8).map((i) => <span key={i} className="mv-crystal" style={{ ['--a' as string]: `${i * 45}deg` }} />)}
          {impact === 'strike' && N(8).map((i) => <span key={i} className="mv-ray" style={{ ['--a' as string]: `${i * 45 + 22}deg` }} />)}
          {impact === 'bubbles' && N(9).map((i) => <span key={i} className="mv-bubble" style={{ ['--a' as string]: `${i * 40}deg`, ['--d' as string]: `${40 + (i % 3) * 18}px` }} />)}
          {impact === 'quake' && N(7).map((i) => <span key={i} className="mv-debris" style={{ ['--x' as string]: `${(i - 3) * 22}px`, animationDelay: `${(i % 3) * 0.03}s` }} />)}
          {impact === 'slash' && N(3).map((i) => <span key={i} className="mv-slash" style={{ ['--a' as string]: `${-35 + i * 35}deg`, animationDelay: `${i * 0.05}s` }} />)}
          {impact === 'ripple' && N(3).map((i) => <span key={i} className="mv-pring" style={{ animationDelay: `${i * 0.08}s` }} />)}
          {impact === 'wisp' && N(6).map((i) => <span key={i} className="mv-wisp" style={{ ['--a' as string]: `${i * 60}deg` }} />)}
          {impact === 'sparkle' && N(8).map((i) => <span key={i} className="mv-star" style={{ ['--a' as string]: `${i * 45}deg` }} />)}
          {impact === 'burst' && N(10).map((i) => <span key={i} className="mv-spark" style={{ ['--a' as string]: `${i * 36}deg` }} />)}
          <div className="mv-name">{moveName}</div>
        </div>
      )}
    </div>
  );
};
