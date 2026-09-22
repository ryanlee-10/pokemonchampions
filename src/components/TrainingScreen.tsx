import React, { useState } from 'react';
import type { CustomPokemon, StatName } from '../types/pokemon';
import { POKEMON_ROSTER } from '../data/pokemonRoster';
import { NATURES } from '../data/natures';
import { MOVES_DATABASE } from '../data/moves';
import { calculateAllStats } from '../engine/statCalc';
import { Dumbbell, ArrowLeft, Check, Sparkles, Search } from 'lucide-react';

interface TrainingScreenProps {
  pokemonList: CustomPokemon[];
  onUpdatePokemon: (updatedPkmn: CustomPokemon) => void;
  onBackToMenu: () => void;
}

const STAT_LABELS: Record<StatName, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  spAtk: 'Sp. Atk',
  spDef: 'Sp. Def',
  speed: 'Speed'
};

export const TrainingScreen: React.FC<TrainingScreenProps> = ({
  pokemonList,
  onUpdatePokemon,
  onBackToMenu
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [rosterSearchQuery, setRosterSearchQuery] = useState<string>('');

  const activePkmn = pokemonList[selectedIndex] || pokemonList[0];
  const species = activePkmn ? POKEMON_ROSTER.find((s) => s.id === activePkmn.speciesId) : null;
  const calculatedStats = activePkmn && species ? calculateAllStats(activePkmn, species) : null;

  const totalEvs = activePkmn
    ? Object.values(activePkmn.evs).reduce((a, b) => a + b, 0)
    : 0;

  const triggerToast = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleEvChange = (stat: StatName, value: number) => {
    if (!activePkmn) return;
    const currentVal = activePkmn.evs[stat];
    const diff = value - currentVal;
    if (totalEvs + diff > 66) return;

    const updated = {
      ...activePkmn,
      evs: {
        ...activePkmn.evs,
        [stat]: Math.min(32, Math.max(0, value))
      }
    };
    onUpdatePokemon(updated);
    triggerToast();
  };

  const handleFieldChange = (field: keyof CustomPokemon, value: any) => {
    if (!activePkmn) return;
    const updated = { ...activePkmn, [field]: value };
    onUpdatePokemon(updated);
    triggerToast();
  };

  const handleMoveChange = (moveIndex: number, moveId: string) => {
    if (!activePkmn) return;
    const newMoves = [...activePkmn.moves];
    newMoves[moveIndex] = moveId;
    handleFieldChange('moves', newMoves);
  };

  return (
    <div className="animate-in" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={onBackToMenu}>
            <ArrowLeft size={16} /> Main Menu
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Training Grounds</h2>
        </div>
        {saveToast && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-emerald)', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.4rem 0.8rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
            <Check size={14} /> Training saved!
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Select Roster Member */}
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Select Pokémon</h3>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search roster..."
              value={rosterSearchQuery}
              onChange={e => setRosterSearchQuery(e.target.value)}
              className="input-base"
              style={{ paddingLeft: '1.75rem', fontSize: '0.75rem', width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {pokemonList.filter(pkmn => {
              if (!rosterSearchQuery.trim()) return true;
              const spec = POKEMON_ROSTER.find((s) => s.id === pkmn.speciesId);
              const q = rosterSearchQuery.toLowerCase();
              return (
                (pkmn.nickname && pkmn.nickname.toLowerCase().includes(q)) ||
                (spec && spec.name.toLowerCase().includes(q)) ||
                (spec && spec.types.some(t => t.toLowerCase().includes(q)))
              );
            }).map((pkmn) => {
              // We need the original index in pokemonList for setSelectedIndex
              const originalIdx = pokemonList.findIndex(p => p.id === pkmn.id);
              const spec = POKEMON_ROSTER.find((s) => s.id === pkmn.speciesId);
              const isActive = originalIdx === selectedIndex;
              return (
                <div
                  key={pkmn.id}
                  onClick={() => setSelectedIndex(originalIdx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                    backgroundColor: isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0, 0, 0, 0.4)',
                    border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-glass)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  <img src={spec?.spriteUrl} alt={spec?.name} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isActive ? 'var(--text-bright)' : 'var(--text)' }}>
                      {pkmn.nickname || spec?.name}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Nature: {pkmn.nature}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Training Customizer */}
        {activePkmn && species ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
              <img src={species.spriteUrl} alt={species.name} style={{ width: '80px', height: '80px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.3))' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={activePkmn.nickname || ''}
                  onChange={(e) => handleFieldChange('nickname', e.target.value)}
                  className="input-base"
                  style={{ fontSize: '1.2rem', fontWeight: 800, padding: '0.5rem 1rem', width: '250px' }}
                  placeholder="Nickname"
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {species.types.map((t) => (
                    <span key={t} className={`type-tag type-${t.toLowerCase()}`} style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Config Selectors: Nature & Ability */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Nature</label>
                <select
                  value={activePkmn.nature}
                  onChange={(e) => handleFieldChange('nature', e.target.value)}
                  className="input-base"
                  style={{ width: '100%' }}
                >
                  {NATURES.map((n) => (
                    <option key={n.name} value={n.name}>
                      {n.name} {n.plus ? `(+${n.plus}, -${n.minus})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Ability</label>
                <select
                  value={activePkmn.ability}
                  onChange={(e) => handleFieldChange('ability', e.target.value)}
                  className="input-base"
                  style={{ width: '100%' }}
                >
                  {species.abilities.map((ab) => (
                    <option key={ab} value={ab}>
                      {ab}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Learnable Moves Customizer */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="var(--accent-amber)" /> Learnable Moveset
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[0, 1, 2, 3].map((mIdx) => {
                  const currentMoveId = activePkmn.moves[mIdx] || '';
                  const moveData = MOVES_DATABASE[currentMoveId];
                  return (
                    <div key={mIdx} style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Move Slot {mIdx + 1}</label>
                      <select
                        value={currentMoveId}
                        onChange={(e) => handleMoveChange(mIdx, e.target.value)}
                        className="input-base"
                        style={{ width: '100%', marginBottom: '0.5rem' }}
                      >
                        <option value="">-- Select Move --</option>
                        {species.learnset.map((mId) => {
                          const mObj = MOVES_DATABASE[mId];
                          return (
                            <option key={mId} value={mId}>
                              {mObj ? `${mObj.name} (${mObj.type} ${mObj.power ? mObj.power + ' BP' : 'Status'})` : mId}
                            </option>
                          );
                        })}
                      </select>
                      {moveData && (
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{moveData.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* EV Stat Spread Customizer */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Dumbbell size={18} color="var(--primary)" /> EV Stat Spread Customizer (Lv. 50)
                </h3>
                <span style={{ 
                  padding: '0.3rem 0.8rem', 
                  borderRadius: '1rem', 
                  fontSize: '0.75rem', 
                  fontWeight: 800,
                  backgroundColor: totalEvs > 66 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                  color: totalEvs > 66 ? 'var(--accent-rose)' : 'var(--primary)',
                  border: `1px solid ${totalEvs > 66 ? 'rgba(244, 63, 94, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`
                }}>
                  EV Total: {totalEvs} / 66
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.5fr 2fr 1fr', gap: '1rem', padding: '0 0.5rem 0.5rem', borderBottom: '1px solid var(--border-glass)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <span>Stat</span>
                  <span>Base</span>
                  <span>EVs (0-32)</span>
                  <span style={{ textAlign: 'right' }}>Calculated</span>
                </div>

                {(['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'] as StatName[]).map(
                  (statKey) => {
                    const evVal = activePkmn.evs[statKey];
                    const finalVal = calculatedStats ? calculatedStats[statKey] : 0;
                    const baseVal = species.baseStats[statKey];

                    return (
                      <div key={statKey} style={{ display: 'grid', gridTemplateColumns: '1fr 0.5fr 2fr 1fr', gap: '1rem', alignItems: 'center', padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{STAT_LABELS[statKey]}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{baseVal}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <input
                            type="range"
                            min="0"
                            max="32"
                            step="1"
                            value={evVal}
                            onChange={(e) => handleEvChange(statKey, parseInt(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--primary)' }}
                          />
                          <input
                            type="number"
                            min="0"
                            max="32"
                            step="1"
                            value={evVal}
                            onChange={(e) => handleEvChange(statKey, parseInt(e.target.value) || 0)}
                            className="input-base"
                            style={{ width: '60px', textAlign: 'center', padding: '0.25rem' }}
                          />
                        </div>
                        <span style={{ textAlign: 'right', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>{finalVal}</span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <p style={{ color: 'var(--text-muted)' }}>Select a Pokémon from the left sidebar to edit EVs, movesets, and natures.</p>
          </div>
        )}
      </div>
    </div>
  );
};
