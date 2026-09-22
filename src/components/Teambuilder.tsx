import { useState } from 'react';
import type { CustomPokemon, StatName } from '../types/pokemon';
import { POKEMON_ROSTER } from '../data/pokemonRoster';
import { NATURES } from '../data/natures';
import { MOVES_DATABASE } from '../data/moves';

import { calculateAllStats } from '../engine/statCalc';
import { Trash2, ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ItemSelect } from './ItemSelect';


interface TeambuilderProps {
  team: CustomPokemon[];
  onUpdateTeam: (team: CustomPokemon[]) => void;
  onBack: () => void;
}

const STAT_LABELS: Record<StatName, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  spAtk: 'Sp. Atk',
  spDef: 'Sp. Def',
  speed: 'Speed'
};

export const Teambuilder: React.FC<TeambuilderProps> = ({ team, onUpdateTeam, onBack }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const activePkmn = team[selectedIndex];
  const species = activePkmn ? POKEMON_ROSTER.find((s) => s.id === activePkmn.speciesId) : null;
  const calculatedStats = activePkmn && species ? calculateAllStats(activePkmn, species) : null;

  const totalEvs = activePkmn
    ? Object.values(activePkmn.evs).reduce((a, b) => a + b, 0)
    : 0;

  // Build takenItemMap for other team members
  const takenItemMap: Record<string, string> = {};
  team.forEach((p, idx) => {
    if (idx !== selectedIndex && p.item && p.item !== 'none') {
      const spec = POKEMON_ROSTER.find((s) => s.id === p.speciesId);
      takenItemMap[p.item] = p.nickname || spec?.name || 'Teammate';
    }
  });

  // Calculate duplicate items across the team
  const itemCounts: Record<string, number> = {};
  team.forEach((p) => {
    if (p.item && p.item !== 'none') {
      itemCounts[p.item] = (itemCounts[p.item] || 0) + 1;
    }
  });
  const duplicateItemIds = Object.keys(itemCounts).filter((id) => itemCounts[id] > 1);
  const isItemClauseValid = duplicateItemIds.length === 0;

  const handleFixDuplicates = () => {
    const seen = new Set<string>();
    const fixedTeam = team.map((p) => {
      if (p.item && p.item !== 'none') {
        if (seen.has(p.item)) {
          return { ...p, item: 'none' };
        }
        seen.add(p.item);
      }
      return p;
    });
    onUpdateTeam(fixedTeam);
  };


  const handleAddPokemon = (speciesId: string) => {
    if (team.length >= 6) return;
    const spec = POKEMON_ROSTER.find((s) => s.id === speciesId);
    if (!spec) return;

    const newPkmn: CustomPokemon = {
      id: `pkmn_${Date.now()}_${Math.random()}`,
      speciesId: spec.id,
      nickname: spec.name,
      level: 50,
      item: 'none',
      ability: spec.abilities[0] || 'Overgrow',
      nature: 'Adamant',
      evs: { hp: 32, attack: 32, defense: 2, spAtk: 0, spDef: 0, speed: 0 },
      moves: spec.learnset.slice(0, 4)
    };

    onUpdateTeam([...team, newPkmn]);
    setSelectedIndex(team.length);
  };

  const handleRemovePokemon = (index: number) => {
    const next = team.filter((_, i) => i !== index);
    onUpdateTeam(next);
    if (selectedIndex >= next.length) {
      setSelectedIndex(Math.max(0, next.length - 1));
    }
  };

  const handleEvChange = (stat: StatName, value: number) => {
    if (!activePkmn) return;
    const currentVal = activePkmn.evs[stat];
    const diff = value - currentVal;
    if (totalEvs + diff > 66) return; // Enforce max 66 total EVs

    const updated = {
      ...activePkmn,
      evs: {
        ...activePkmn.evs,
        [stat]: Math.min(32, Math.max(0, value))
      }
    };

    const nextTeam = [...team];
    nextTeam[selectedIndex] = updated;
    onUpdateTeam(nextTeam);
  };

  const handleFieldChange = (field: keyof CustomPokemon, value: any) => {
    if (!activePkmn) return;
    const updated = { ...activePkmn, [field]: value };
    const nextTeam = [...team];
    nextTeam[selectedIndex] = updated;
    onUpdateTeam(nextTeam);
  };

  const handleMoveChange = (moveIndex: number, moveId: string) => {
    if (!activePkmn) return;
    const newMoves = [...activePkmn.moves];
    newMoves[moveIndex] = moveId;
    handleFieldChange('moves', newMoves);
  };

  return (
    <div className="teambuilder-container">
      <div className="teambuilder-header">
        <button className="btn-secondary flex items-center gap-2" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Lobby
        </button>
        <h2>Teambuilder (Regulation M-C)</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="ev-badge">Team Count: {team.length}/6</span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.3rem 0.65rem',
              borderRadius: '1rem',
              backgroundColor: isItemClauseValid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.2)',
              border: `1px solid ${isItemClauseValid ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.5)'}`,
              color: isItemClauseValid ? '#4ade80' : '#f87171'
            }}
          >
            {isItemClauseValid ? (
              <>
                <ShieldCheck size={14} /> Item Clause: Valid
              </>
            ) : (
              <>
                <AlertTriangle size={14} /> Duplicate Item!
                <button
                  onClick={handleFixDuplicates}
                  style={{
                    marginLeft: '0.4rem',
                    background: 'rgba(239, 68, 68, 0.8)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  title="Unequip duplicate items"
                >
                  Fix
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="teambuilder-grid">
        {/* Left Column: Team List & Add */}
        <div className="team-sidebar">
          <h3>Your Team</h3>
          <div className="team-slots-list">
            {team.map((pkmn, idx) => {
              const spec = POKEMON_ROSTER.find((s) => s.id === pkmn.speciesId);
              return (
                <div
                  key={pkmn.id}
                  className={`team-slot-card ${idx === selectedIndex ? 'active' : ''}`}
                  onClick={() => setSelectedIndex(idx)}
                >
                  <img src={spec?.spriteUrl} alt={spec?.name} className="slot-sprite" />
                  <div className="slot-info">
                    <span className="slot-name">{pkmn.nickname || spec?.name}</span>
                    <span className="slot-item">{pkmn.item || 'No Item'}</span>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePokemon(idx);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          {team.length < 6 && (
            <div className="add-pokemon-section">
              <h4>Add Pokémon</h4>
              <div className="roster-grid">
                {POKEMON_ROSTER.map((spec) => (
                  <button
                    key={spec.id}
                    className="roster-pick-btn"
                    onClick={() => handleAddPokemon(spec.id)}
                  >
                    <img src={spec.spriteUrl} alt={spec.name} />
                    <span>{spec.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Customizer & Stat Editor */}
        {activePkmn && species ? (
          <div className="customizer-panel">
            <div className="customizer-header">
              <img src={species.spriteUrl} alt={species.name} className="active-artwork" />
              <div className="header-meta">
                <input
                  type="text"
                  value={activePkmn.nickname || ''}
                  onChange={(e) => handleFieldChange('nickname', e.target.value)}
                  className="input-nickname"
                  placeholder="Nickname"
                />
                <div className="types-container">
                  {species.types.map((t) => (
                    <span key={t} className={`type-tag type-${t.toLowerCase()}`}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Config Selectors: Nature, Item, Ability */}
            <div className="config-grid">
              <div className="config-field">
                <label>Nature</label>
                <select
                  value={activePkmn.nature}
                  onChange={(e) => handleFieldChange('nature', e.target.value)}
                >
                  {NATURES.map((n) => (
                    <option key={n.name} value={n.name}>
                      {n.name} {n.plus ? `(+${n.plus}, -${n.minus})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="config-field">
                <label>Held Item</label>
                <ItemSelect
                  value={activePkmn.item}
                  onChange={(itemId) => handleFieldChange('item', itemId)}
                  takenItemMap={takenItemMap}
                  enforceItemClause={true}
                />
              </div>


              <div className="config-field">
                <label>Ability</label>
                <select
                  value={activePkmn.ability}
                  onChange={(e) => handleFieldChange('ability', e.target.value)}
                >
                  {species.abilities.map((ab) => (
                    <option key={ab} value={ab}>
                      {ab}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Moveset Customizer */}
            <div className="moves-section">
              <h3>Moveset (4 Moves)</h3>
              <div className="moves-grid">
                {[0, 1, 2, 3].map((mIdx) => {
                  const currentMoveId = activePkmn.moves[mIdx] || '';
                  const moveData = MOVES_DATABASE[currentMoveId];
                  return (
                    <div key={mIdx} className="move-select-card">
                      <label>Slot {mIdx + 1}</label>
                      <select
                        value={currentMoveId}
                        onChange={(e) => handleMoveChange(mIdx, e.target.value)}
                      >
                        <option value="">-- Select Move --</option>
                        {species.learnset.map((mId) => {
                          const mObj = MOVES_DATABASE[mId];
                          return (
                            <option key={mId} value={mId}>
                              {mObj ? `${mObj.name} (${mObj.type} ${mObj.power || 0} BP)` : mId}
                            </option>
                          );
                        })}
                      </select>
                      {moveData && (
                        <p className="move-desc-mini">{moveData.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* EV Stat Spread Customizer */}
            <div className="stats-section">
              <div className="stats-header flex justify-between items-center">
                <h3>EV Stat Spread Customizer (Lv. 50)</h3>
                <span className={`ev-total-badge ${totalEvs > 66 ? 'over-limit' : ''}`}>
                  EV Total: {totalEvs} / 66
                </span>
              </div>

              <div className="stats-table">
                <div className="stats-row head">
                  <span>Stat</span>
                  <span>Base</span>
                  <span>EVs (0-32)</span>
                  <span>Actual Stat</span>
                </div>

                {(['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'] as StatName[]).map(
                  (statKey) => {
                    const evVal = activePkmn.evs[statKey];
                    const finalVal = calculatedStats ? calculatedStats[statKey] : 0;
                    const baseVal = species.baseStats[statKey];

                    return (
                      <div key={statKey} className="stats-row">
                        <span className="stat-name">{STAT_LABELS[statKey]}</span>
                        <span className="stat-base">{baseVal}</span>
                        <div className="ev-control">
                          <input
                            type="range"
                            min="0"
                            max="32"
                            step="1"
                            value={evVal}
                            onChange={(e) => handleEvChange(statKey, parseInt(e.target.value))}
                          />
                          <input
                            type="number"
                            min="0"
                            max="32"
                            step="1"
                            value={evVal}
                            onChange={(e) => handleEvChange(statKey, parseInt(e.target.value) || 0)}
                            className="ev-number-input"
                          />
                        </div>
                        <span className="final-stat-badge">{finalVal}</span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-customizer flex flex-col items-center justify-center">
            <p>Select or add a Pokémon to customize stats, moves, and held items.</p>
          </div>
        )}
      </div>
    </div>
  );
};
