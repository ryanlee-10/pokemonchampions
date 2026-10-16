import React, { useState, useEffect, useMemo } from 'react';
import { Clock, X } from 'lucide-react';
import type { ActivePokemonState, BattleFieldConditions } from '../types/pokemon';
import { getSpriteUrls } from './types';
import { TYPE_COLORS } from '../intro/TypeRing';
import '../styles/battle-info-modal.css';

export interface BattleInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  mySlots: { idx: number; i?: number; mon: ActivePokemonState }[];
  oppSlots: { idx: number; mon: ActivePokemonState }[];
  fieldConditions: BattleFieldConditions;
  timeLeft: number;
  turn: number;
  mySide: 1 | 2;
}

interface EffectItem {
  id: string;
  name: string;
  duration?: string;
  description: string;
}



/** Get Showdown CDN item icon */
const getItemIconUrl = (itemId?: string) => {
  if (!itemId || itemId === 'none') return null;
  const cleanId = itemId.toLowerCase().replace(/_/g, '-');
  return `https://play.pokemonshowdown.com/sprites/itemicons/${cleanId}.png`;
};

/** Format stat multiplier following standard Pokemon VGC formulas */
const getMultiplierText = (statKey: string, stage: number): string => {
  if (stage === 0) return '×1.0';
  const isAccEva = statKey === 'accuracy' || statKey === 'evasion';
  if (isAccEva) {
    if (stage > 0) {
      const num = (3 + stage) / 3;
      return `×${num.toFixed(2).replace(/\.?0+$/, '')}`;
    } else {
      const num = 3 / (3 + Math.abs(stage));
      return `×${num.toFixed(2).replace(/\.?0+$/, '')}`;
    }
  } else {
    if (stage > 0) {
      const num = (2 + stage) / 2;
      return `×${num.toFixed(1).replace(/\.0$/, '')}`;
    } else {
      const num = 2 / (2 + Math.abs(stage));
      // In SV drops: 0.67, 0.5, 0.4, 0.33, 0.28, 0.25
      return `×${num.toFixed(2).replace(/0$/, '')}`;
    }
  }
};

const STAT_CONFIG = [
  { key: 'attack', label: 'Attack' },
  { key: 'defense', label: 'Defense' },
  { key: 'spAtk', label: 'Sp. Atk' },
  { key: 'spDef', label: 'Sp. Def' },
  { key: 'speed', label: 'Speed' },
  { key: 'divider', label: '' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'evasion', label: 'Evasiveness' },
] as const;

export const BattleInfoModal: React.FC<BattleInfoModalProps> = ({
  isOpen,
  onClose,
  mySlots,
  oppSlots,
  fieldConditions,
  timeLeft,
  turn,
  mySide,
}) => {
  // Current view selection: { side: 'player' | 'opponent', slotIndex: number }
  const [selectedSide, setSelectedSide] = useState<'player' | 'opponent'>('player');
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);

  // Keep selection valid when slots change
  useEffect(() => {
    if (selectedSide === 'player') {
      if (selectedSlotIndex >= mySlots.length) setSelectedSlotIndex(0);
    } else {
      if (selectedSlotIndex >= oppSlots.length) setSelectedSlotIndex(0);
    }
  }, [mySlots, oppSlots, selectedSide, selectedSlotIndex]);

  // Handle keyboard navigation: L, R, ArrowLeft, ArrowRight, B, Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'l' || e.key === 'L' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (selectedSide === 'opponent') {
          setSelectedSide('player');
          setSelectedSlotIndex(0);
        } else if (selectedSlotIndex > 0) {
          setSelectedSlotIndex(prev => prev - 1);
        }
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (selectedSide === 'player') {
          setSelectedSide('opponent');
          setSelectedSlotIndex(0);
        } else if (selectedSlotIndex < oppSlots.length - 1) {
          setSelectedSlotIndex(prev => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedSide, selectedSlotIndex, mySlots.length, oppSlots.length, onClose]);

  const activeSlot = selectedSide === 'player' ? mySlots[selectedSlotIndex] : oppSlots[selectedSlotIndex];
  const activeMon = activeSlot?.mon;

  // Compile active effects based on field conditions and inspected Pokemon
  const activeEffects = useMemo<EffectItem[]>(() => {
    const list: EffectItem[] = [];
    if (!activeMon) return list;

    // 1. Weather
    if (fieldConditions.weather && fieldConditions.weather !== 'Clear') {
      const w = fieldConditions.weather;
      const wTurns = fieldConditions.weatherTurns ?? 5;
      const weatherName = w === 'Sun' ? 'Harsh Sunlight' : w;
      let desc = '';
      if (w === 'Rain') {
        desc = 'Boosts the damage dealt by Water-type moves by 50% and halves the damage dealt by Fire-type moves.';
      } else if (w === 'Sun') {
        desc = 'Boosts the damage dealt by Fire-type moves by 50% and halves the damage dealt by Water-type moves.';
      } else if (w === 'Sandstorm') {
        desc = 'Damages Pokémon that are not Rock, Ground, or Steel type every turn, and boosts the Sp. Def of Rock-type Pokémon.';
      } else if (w === 'Snow') {
        desc = 'Boosts the Defense of Ice-type Pokémon by 50%.';
      }
      list.push({
        id: `weather-${w}`,
        name: weatherName,
        duration: `${wTurns}/5`,
        description: desc,
      });
    }

    // 2. Terrain
    if (fieldConditions.terrain && fieldConditions.terrain !== 'None') {
      const t = fieldConditions.terrain;
      const tTurns = fieldConditions.terrainTurns ?? 5;
      let desc = '';
      if (t === 'Psychic') {
        desc = 'Pokémon on the ground have the power of their Psychic-type moves boosted by 30% and they are immune to priority moves.';
      } else if (t === 'Electric') {
        desc = 'Pokémon on the ground are immune to falling asleep, and their Electric-type moves are boosted by 30%.';
      } else if (t === 'Grassy') {
        desc = 'Pokémon on the ground restore 1/16 of their max HP every turn, and their Grass-type moves are boosted by 30%.';
      } else if (t === 'Misty') {
        desc = 'Pokémon on the ground are protected from status conditions, and damage taken from Dragon-type moves is halved.';
      }
      list.push({
        id: `terrain-${t}`,
        name: `${t} Terrain`,
        duration: `${tTurns}/5`,
        description: desc,
      });
    }

    // 3. Trick Room
    if ((fieldConditions.trickRoom ?? 0) > 0) {
      list.push({
        id: 'trick-room',
        name: 'Trick Room',
        duration: `${fieldConditions.trickRoom}/5`,
        description: 'Reverses the move order so slower Pokémon move first for 5 turns.',
      });
    }

    // 4. Side Screens for this Pokemon's team
    const sideNum = selectedSide === 'player' ? mySide : (mySide === 1 ? 2 : 1);
    const f = fieldConditions as Record<string, number | undefined>;
    const tailwind = f[`tailwindTeam${sideNum}`];
    const reflect = f[`reflectTeam${sideNum}`];
    const lightScreen = f[`lightScreenTeam${sideNum}`];
    const auroraVeil = f[`auroraVeilTeam${sideNum}`];

    if ((tailwind ?? 0) > 0) {
      list.push({
        id: 'side-tailwind',
        name: 'Tailwind',
        duration: `${tailwind}/4`,
        description: "Doubles the Speed of all Pokémon on the user's team for 4 turns.",
      });
    }
    if ((reflect ?? 0) > 0) {
      list.push({
        id: 'side-reflect',
        name: 'Reflect',
        duration: `${reflect}/5`,
        description: 'Halves physical damage taken by Pokémon on this side of the field.',
      });
    }
    if ((lightScreen ?? 0) > 0) {
      list.push({
        id: 'side-lightscreen',
        name: 'Light Screen',
        duration: `${lightScreen}/5`,
        description: 'Halves special damage taken by Pokémon on this side of the field.',
      });
    }
    if ((auroraVeil ?? 0) > 0) {
      list.push({
        id: 'side-auroraveil',
        name: 'Aurora Veil',
        duration: `${auroraVeil}/5`,
        description: 'Halves physical and special damage taken by Pokémon on this side of the field.',
      });
    }

    // 5. Pokemon Status Condition
    if (activeMon.status) {
      const s = activeMon.status;
      let desc = '';
      if (s === 'Burn') desc = 'Deals damage equal to 1/16 max HP each turn and halves Physical Attack power.';
      if (s === 'Paralysis') desc = 'Reduces Speed by 50% and causes a 25% chance of being unable to move.';
      if (s === 'Sleep') desc = 'The Pokémon is fast asleep and cannot move until it wakes up.';
      if (s === 'Freeze') desc = 'The Pokémon is frozen solid and cannot move. It has a 20% chance to thaw each turn.';
      if (s === 'Poison') desc = 'Deals damage equal to 1/8 max HP each turn.';
      list.push({
        id: `status-${s}`,
        name: s,
        description: desc,
      });
    }

    // 6. Volatile Conditions
    if (activeMon.isProtecting) {
      list.push({
        id: 'protect',
        name: 'Protect',
        description: 'The Pokémon is protecting itself from all attacks this turn.',
      });
    }
    if (activeMon.isGlaiveRushVulnerable) {
      list.push({
        id: 'glaive-rush',
        name: 'Glaive Rush Vulnerability',
        description: 'Attacks directed at this Pokémon cannot miss and deal double damage until its next action.',
      });
    }

    return list;
  }, [activeMon, fieldConditions, selectedSide, mySide]);

  // Default selection for effect
  useEffect(() => {
    if (activeEffects.length > 0) {
      if (!selectedEffectId || !activeEffects.some(e => e.id === selectedEffectId)) {
        setSelectedEffectId(activeEffects[0].id);
      }
    } else {
      setSelectedEffectId(null);
    }
  }, [activeEffects, selectedEffectId]);

  if (!isOpen || !activeMon) return null;

  const selectedEffect = activeEffects.find(e => e.id === selectedEffectId) || activeEffects[0];
  const isPlayerSide = selectedSide === 'player';
  const hpPct = Math.max(0, Math.round((activeMon.currentHp / activeMon.maxStats.hp) * 100));
  const hpBand = hpPct > 50 ? 'ok' : hpPct > 20 ? 'mid' : 'low';
  const types = activeMon.activeTypes || activeMon.species.types;
  const urls = getSpriteUrls(activeMon.species.id);
  const spriteSrc = activeMon.isMegaEvolved && activeMon.activeSpriteUrl ? activeMon.activeSpriteUrl : urls.front;
  const itemIcon = getItemIconUrl(activeMon.item);

  // Approximate match elapsed time based on turn count
  const estimatedSeconds = Math.max(0, turn * 35 + (45 - timeLeft));
  const totalMins = Math.floor(estimatedSeconds / 60);
  const totalSecs = estimatedSeconds % 60;
  const formattedTotalTime = `${String(totalMins).padStart(2, '0')}:${String(totalSecs).padStart(2, '0')}`;

  return (
    <div className="sv-status-overlay" onClick={onClose}>
      {/* ---------------- Top Header ---------------- */}
      <div className="sv-top-header" onClick={e => e.stopPropagation()}>
        {/* Left: Exit/Back Chip */}
        <button className="sv-exit-chip" onClick={onClose} title="Close (Esc / B)">
          <span className="sv-exit-icon"><X size={12} /></span>
          <span>Back</span>
        </button>

        {/* Center: L / R Pokémon Tabs */}
        <div className="sv-center-tabs">
          {/* Player Tab */}
          <div className="sv-tab-team player">
            <span className="sv-tab-btn-pill">L</span>
            <div className="sv-tab-icons">
              {mySlots.map((slot, idx) => {
                const isSelected = selectedSide === 'player' && selectedSlotIndex === idx;
                const iconUrl = getSpriteUrls(slot.mon.species.id).icon;
                return (
                  <button
                    key={`tab-my-${slot.mon.instanceId}`}
                    className={`sv-mon-tab-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedSide('player');
                      setSelectedSlotIndex(idx);
                    }}
                    title={slot.mon.nickname}
                  >
                    <img src={iconUrl} alt={slot.mon.nickname} onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opponent Tab */}
          <div className="sv-tab-team opponent">
            <div className="sv-tab-icons">
              {oppSlots.map((slot, idx) => {
                const isSelected = selectedSide === 'opponent' && selectedSlotIndex === idx;
                const iconUrl = getSpriteUrls(slot.mon.species.id).icon;
                return (
                  <button
                    key={`tab-opp-${slot.mon.instanceId}`}
                    className={`sv-mon-tab-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedSide('opponent');
                      setSelectedSlotIndex(idx);
                    }}
                    title={slot.mon.nickname}
                  >
                    <img src={iconUrl} alt={slot.mon.nickname} onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
                  </button>
                );
              })}
            </div>
            <span className="sv-tab-btn-pill">R</span>
          </div>
        </div>

        {/* Right: Move Timer Chip */}
        <div className={`sv-move-time-chip ${timeLeft <= 10 ? 'urgent' : ''}`}>
          <span>MOVE TIME</span>
          <b>{timeLeft}</b>
        </div>
      </div>

      {/* ---------------- Main Status Card ---------------- */}
      <div
        className={`sv-status-card ${isPlayerSide ? 'theme-player' : 'theme-opponent'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Left Column: Pokémon Info & Stat Changes */}
        <div className="sv-left-column">
          {/* Pokémon Header */}
          <div className="sv-mon-header">
            {/* Sprite */}
            <div className="sv-mon-sprite-box">
              <img src={spriteSrc} alt={activeMon.nickname} />
            </div>

            {/* Details */}
            <div className="sv-mon-info-details">
              {/* Name */}
              <div className="sv-name-row">
                <span className="sv-mon-name">{activeMon.nickname}</span>
              </div>

              {/* HP Bar */}
              <div className="sv-hp-bar-row">
                <div className="sv-hp-track">
                  <div className={`sv-hp-fill ${hpBand}`} style={{ width: `${hpPct}%` }} />
                </div>
                {/* Player side shows exact HP, opponent shows percentage */}
                <div className="sv-hp-text">
                  {isPlayerSide ? (
                    <span>{activeMon.currentHp}/{activeMon.maxStats.hp}</span>
                  ) : (
                    <span>{hpPct}%</span>
                  )}
                </div>
              </div>

              {/* Types */}
              <div className="sv-types-row">
                {types.map(t => (
                  <div key={t} className="sv-type-badge">
                    <span className="sv-type-icon-disc" style={{ background: TYPE_COLORS[t] || '#666' }} />
                    <span className="sv-type-label">{t.toUpperCase()}</span>
                  </div>
                ))}
              </div>

              {/* Player Side Only: Ability & Item */}
              {isPlayerSide && (
                <>
                  <div className="sv-meta-row">
                    <span className="sv-meta-label">Ability</span>
                    <span className="sv-meta-val">{activeMon.ability}</span>
                  </div>
                  <div className="sv-meta-row">
                    {itemIcon && (
                      <img
                        className="sv-item-icon"
                        src={itemIcon}
                        alt=""
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <span className="sv-meta-val">{activeMon.item ? activeMon.item.replace(/_/g, ' ') : 'None'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stat Changes Box */}
          <div className="sv-stats-box">
            {STAT_CONFIG.map(({ key, label }) => {
              if (key === 'divider') {
                return <div key="divider" className="sv-stat-divider" />;
              }

              const stageKey = key as keyof ActivePokemonState['statStages'];
              const stage = activeMon.statStages?.[stageKey] ?? 0;
              const absStage = Math.min(6, Math.abs(stage));
              const multText = getMultiplierText(key, stage);
              const multClass = stage > 0 ? 'up' : stage < 0 ? 'down' : 'neutral';

              return (
                <div key={key} className="sv-stat-row">
                  <span className="sv-stat-name">{label}</span>
                  {/* Exactly 6 pips */}
                  <div className="sv-pips-container">
                    {Array.from({ length: 6 }).map((_, idx) => {
                      if (idx < absStage) {
                        if (stage > 0) {
                          // Orange upward triangle
                          return <span key={idx} className="sv-pip sv-pip-up">▲</span>;
                        } else {
                          // Blue downward triangle
                          return <span key={idx} className="sv-pip sv-pip-down">▼</span>;
                        }
                      }
                      // Subtle neutral dot
                      return <span key={idx} className="sv-pip sv-pip-dot">•</span>;
                    })}
                  </div>
                  <span className={`sv-stat-mult ${multClass}`}>{multText}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Statuses & Effects */}
        <div className="sv-right-column">
          {/* Header Row */}
          <div className="sv-effects-header-row">
            <span className="sv-effects-title-pill">Active Statuses & Effects</span>
            <div className="sv-total-time-box">
              <span>TOTAL TIME</span>
              <b>{formattedTotalTime}</b>
            </div>
          </div>

          {/* Effects List */}
          <div className="sv-effects-list">
            {activeEffects.length === 0 ? (
              <div className="sv-empty-effects-box">No active statuses or effects</div>
            ) : (
              activeEffects.map(effect => {
                const isSelected = selectedEffect?.id === effect.id;
                return (
                  <div
                    key={effect.id}
                    className="sv-effect-item-wrapper"
                    onClick={() => setSelectedEffectId(effect.id)}
                  >
                    <span className={`sv-effect-indicator-arrow ${isSelected ? 'visible' : ''}`}>▶</span>
                    <div className={`sv-effect-pill ${isSelected ? 'selected' : ''}`}>
                      <span>{effect.name}</span>
                      {effect.duration && <span className="sv-effect-turns">{effect.duration}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Effect Description Box */}
          <div className="sv-effect-description-box">
            <p className="sv-effect-description-text">
              {selectedEffect ? selectedEffect.description : 'There are currently no active field conditions or status effects on this Pokémon.'}
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- Bottom Bar ---------------- */}
      <div className="sv-bottom-bar" onClick={e => e.stopPropagation()}>
        {/* Match Clock on Left */}
        <div className="sv-bottom-clock">
          <Clock size={16} />
          <span>{formattedTotalTime}</span>
        </div>

        {/* Back Button on Right */}
        <button className="sv-back-btn" onClick={onClose} title="Back (B / Esc)">
          <span className="sv-back-btn-pill">B</span>
          <span>Back</span>
        </button>
      </div>
    </div>
  );
};
