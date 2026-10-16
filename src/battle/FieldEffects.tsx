import React, { useMemo } from 'react';
import type { BattleFieldConditions } from '../types/pokemon';

/** Deterministic pseudo-random so particles don't reshuffle every render. */
const rand = (i: number, salt = 1) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/* ------------------------------------------------------------------ */
/* Weather                                                             */
/* ------------------------------------------------------------------ */
export const WeatherLayer: React.FC<{ weather?: BattleFieldConditions['weather'] }> = ({ weather }) => {
  const drops = useMemo(() => range(90).map((i) => ({
    left: `${rand(i, 1) * 110 - 5}%`,
    delay: `${-rand(i, 2) * 1.2}s`,
    dur: `${0.45 + rand(i, 3) * 0.35}s`,
    h: `${40 + rand(i, 4) * 50}px`,
    o: 0.35 + rand(i, 5) * 0.5,
  })), []);
  const flakes = useMemo(() => range(70).map((i) => ({
    left: `${rand(i, 6) * 100}%`,
    delay: `${-rand(i, 7) * 9}s`,
    dur: `${6 + rand(i, 8) * 6}s`,
    size: `${3 + rand(i, 9) * 6}px`,
    sway: `${(rand(i, 10) - 0.5) * 120}px`,
  })), []);
  const grains = useMemo(() => range(80).map((i) => ({
    top: `${rand(i, 11) * 100}%`,
    delay: `${-rand(i, 12) * 2}s`,
    dur: `${0.9 + rand(i, 13) * 1}s`,
    w: `${20 + rand(i, 14) * 70}px`,
  })), []);

  if (!weather || weather === 'Clear') return null;

  return (
    <div className={`fx-weather fx-weather-${weather.toLowerCase()}`} aria-hidden>
      {weather === 'Rain' && (
        <>
          <div className="fx-rain-haze" />
          {drops.map((d, i) => (
            <span key={i} className="fx-drop" style={{ left: d.left, animationDelay: d.delay, animationDuration: d.dur, height: d.h, opacity: d.o }} />
          ))}
          {range(14).map((i) => (
            <span key={`s${i}`} className="fx-splash" style={{ left: `${8 + rand(i, 20) * 84}%`, top: `${58 + rand(i, 21) * 38}%`, animationDelay: `${-rand(i, 22) * 1.4}s` }} />
          ))}
        </>
      )}
      {weather === 'Sun' && (
        <>
          <div className="fx-sun-orb" />
          <div className="fx-sun-rays" />
          <div className="fx-sun-warm" />
          {range(5).map((i) => <span key={i} className={`fx-flare f${i}`} />)}
        </>
      )}
      {weather === 'Sandstorm' && (
        <>
          <div className="fx-sand-haze" />
          {grains.map((g, i) => (
            <span key={i} className="fx-grain" style={{ top: g.top, animationDelay: g.delay, animationDuration: g.dur, width: g.w }} />
          ))}
        </>
      )}
      {weather === 'Snow' && (
        <>
          <div className="fx-snow-haze" />
          {flakes.map((f, i) => (
            <span key={i} className="fx-flake" style={{ left: f.left, animationDelay: f.delay, animationDuration: f.dur, width: f.size, height: f.size, ['--sway' as string]: f.sway }} />
          ))}
        </>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Terrain (drawn on the ground plane, below the Pokémon)              */
/* ------------------------------------------------------------------ */
export const TerrainLayer: React.FC<{ terrain?: BattleFieldConditions['terrain'] }> = ({ terrain }) => {
  if (!terrain || terrain === 'None') return null;
  const t = terrain.toLowerCase();
  return (
    <div className={`fx-terrain fx-terrain-${t}`} aria-hidden>
      <div className="fx-terrain-floor" />
      {range(t === 'electric' ? 16 : 22).map((i) => (
        <span
          key={i}
          className="fx-tp"
          style={{
            left: `${4 + rand(i, 30) * 92}%`,
            top: `${50 + rand(i, 31) * 46}%`,
            animationDelay: `${-rand(i, 32) * 4}s`,
            animationDuration: `${(t === 'electric' ? 0.9 : 3.5) + rand(i, 33) * 2}s`,
          }}
        />
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Field status badge (top-center)                                     */
/* ------------------------------------------------------------------ */
const WEATHER_INFO: Record<string, { label: string; icon: string; desc: string }> = {
  Rain: { label: 'Rain', icon: '🌧️', desc: 'Water ×1.5 · Fire ×0.5' },
  Sun: { label: 'Harsh Sunlight', icon: '☀️', desc: 'Fire ×1.5 · Water ×0.5' },
  Sandstorm: { label: 'Sandstorm', icon: '🌪️', desc: 'Chip damage · Rock Sp.Def ↑' },
  Snow: { label: 'Snow', icon: '❄️', desc: 'Ice Defense ↑' },
};
const TERRAIN_INFO: Record<string, { label: string; icon: string; desc: string }> = {
  Electric: { label: 'Electric Terrain', icon: '⚡', desc: 'Electric ×1.3 · No sleep' },
  Grassy: { label: 'Grassy Terrain', icon: '🌿', desc: 'Grass ×1.3 · Heals 1/16' },
  Psychic: { label: 'Psychic Terrain', icon: '🔮', desc: 'Psychic ×1.3 · Blocks priority' },
  Misty: { label: 'Misty Terrain', icon: '🌸', desc: 'Dragon ×0.5 · No status' },
};

export const FieldBadge: React.FC<{ field: BattleFieldConditions }> = ({ field }) => {
  const chips: { key: string; cls: string; icon: string; label: string; desc: string; turns?: number }[] = [];
  if (field.weather && field.weather !== 'Clear' && WEATHER_INFO[field.weather]) {
    chips.push({ key: 'w', cls: `w-${field.weather.toLowerCase()}`, ...WEATHER_INFO[field.weather], turns: field.weatherTurns });
  }
  if (field.terrain && field.terrain !== 'None' && TERRAIN_INFO[field.terrain]) {
    chips.push({ key: 't', cls: `t-${field.terrain.toLowerCase()}`, ...TERRAIN_INFO[field.terrain], turns: field.terrainTurns });
  }
  if (field.trickRoom) {
    chips.push({ key: 'tr', cls: 'trick', icon: '🔄', label: 'Trick Room', desc: 'Slower moves first', turns: field.trickRoom });
  }
  if (!chips.length) return null;
  return (
    <div className="fx-badges">
      {chips.map((c) => (
        <div key={c.key} className={`fx-badge ${c.cls}`} title={c.desc}>
          <span className="fx-badge-icon">{c.icon}</span>
          <span className="fx-badge-text">
            <b>{c.label}</b>
            <small>{c.desc}</small>
          </span>
          {typeof c.turns === 'number' && c.turns > 0 && (
            <span className="fx-badge-turns">
              {range(Math.min(c.turns, 8)).map((i) => <i key={i} />)}
              <em>{c.turns}</em>
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
