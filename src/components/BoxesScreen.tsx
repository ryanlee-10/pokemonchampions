import React, { useState } from 'react';
import type { CustomPokemon, PlayerTeam } from '../types/pokemon';
import { POKEMON_ROSTER } from '../data/pokemonRoster';

import {
  Package,
  Plus,
  Trash2,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Edit2,
  Search,
  X
} from 'lucide-react';
import { ItemSelect } from './ItemSelect';


interface BoxesScreenProps {
  activeTeam: CustomPokemon[];
  pcBox: CustomPokemon[];
  teams?: PlayerTeam[];
  onUpdateTeam: (team: CustomPokemon[]) => void;
  onUpdatePcBox: (box: CustomPokemon[]) => void;
  onUpdateTeams?: (teams: PlayerTeam[]) => void;
  onBackToMenu: () => void;
}

export const BoxesScreen: React.FC<BoxesScreenProps> = ({
  activeTeam,
  pcBox,
  teams: initialTeams,
  onUpdateTeam,
  onUpdatePcBox,
  onUpdateTeams,
}) => {
  const [battleTeams, setBattleTeams] = useState<PlayerTeam[]>(() => {
    if (initialTeams && initialTeams.length > 0) return initialTeams;
    return [{ playerId: 'player', name: 'Team 1 (Active)', pokemon: activeTeam }];
  });

  const [activeTeamIdx, setActiveTeamIdx] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<{ id?: string, index?: number, location: 'TEAM' | 'BOX' } | null>(null);
  
  // Drag and drop state
  const [draggedSlot, setDraggedSlot] = useState<{ id?: string, index?: number, location: 'TEAM' | 'BOX' } | null>(null);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [rosterSearchQuery, setRosterSearchQuery] = useState<string>('');
  const [boxSearchQuery, setBoxSearchQuery] = useState<string>('');
  const [editingTeamNameIdx, setEditingTeamNameIdx] = useState<number | null>(null);
  const [newTeamNameInput, setNewTeamNameInput] = useState<string>('');

  const currentTeam = battleTeams[activeTeamIdx] || battleTeams[0];
  const currentTeamPokemon = currentTeam ? currentTeam.pokemon : [];

  // Item Clause calculation for current team
  const currentTeamItemCounts: Record<string, number> = {};
  currentTeamPokemon.forEach((p) => {
    if (p.item && p.item !== 'none') {
      currentTeamItemCounts[p.item] = (currentTeamItemCounts[p.item] || 0) + 1;
    }
  });
  const hasItemClauseViolation = Object.values(currentTeamItemCounts).some((count) => count > 1);

  const takenItemMap: Record<string, string> = {};
  currentTeamPokemon.forEach((p) => {
    if (p.item && p.item !== 'none') {
      takenItemMap[p.item] = p.id;
    }
  });

  // Sync state upward
  const syncTeamState = (newTeamPkmn: CustomPokemon[], newTeamsState?: PlayerTeam[]) => {
    onUpdateTeam(newTeamPkmn);
    const updatedTeams = newTeamsState || battleTeams.map((t, idx) => (idx === activeTeamIdx ? { ...t, pokemon: newTeamPkmn } : t));
    setBattleTeams(updatedTeams);
    if (onUpdateTeams) onUpdateTeams(updatedTeams);
  };

  const handleCreateNewTeam = () => {
    const newTeam: PlayerTeam = {
      playerId: 'player',
      name: `Team ${battleTeams.length + 1}`,
      pokemon: []
    };
    const nextTeams = [...battleTeams, newTeam];
    setBattleTeams(nextTeams);
    setActiveTeamIdx(nextTeams.length - 1);
    syncTeamState([], nextTeams);
  };

  const handleSelectTeam = (idx: number) => {
    setActiveTeamIdx(idx);
    setSelectedSlot(null);
    onUpdateTeam(battleTeams[idx]?.pokemon || []);
  };

  const handleDeleteTeam = (idx: number) => {
    if (battleTeams.length <= 1) return;
    const teamToDelete = battleTeams[idx];
    if (teamToDelete.pokemon.length > 0) {
      onUpdatePcBox([...pcBox, ...teamToDelete.pokemon]);
    }
    const nextTeams = battleTeams.filter((_, i) => i !== idx);
    const nextActiveIdx = Math.max(0, activeTeamIdx >= nextTeams.length ? nextTeams.length - 1 : activeTeamIdx);
    setBattleTeams(nextTeams);
    setActiveTeamIdx(nextActiveIdx);
    syncTeamState(nextTeams[nextActiveIdx].pokemon, nextTeams);
  };

  const handleRenameTeam = (idx: number) => {
    if (!newTeamNameInput.trim()) return;
    const nextTeams = battleTeams.map((t, i) => (i === idx ? { ...t, name: newTeamNameInput.trim() } : t));
    setBattleTeams(nextTeams);
    if (onUpdateTeams) onUpdateTeams(nextTeams);
    setEditingTeamNameIdx(null);
  };

  const performSwap = (source: { id?: string, index?: number, location: 'TEAM' | 'BOX' }, target: { id?: string, index?: number, location: 'TEAM' | 'BOX' }) => {
    if (source.location === target.location && source.index === target.index && source.id === target.id) {
      return;
    }

    if (source.location === 'TEAM' && target.location === 'TEAM') {
      if (source.index !== undefined && target.index !== undefined) {
        const nextTeam = [...currentTeamPokemon];
        const temp = nextTeam[source.index];
        nextTeam[source.index] = nextTeam[target.index];
        nextTeam[target.index] = temp;
        syncTeamState(nextTeam.filter(Boolean));
      }
      return;
    }

    if (source.location === 'BOX' && target.location === 'BOX') {
      return;
    }

    const teamIndex = target.location === 'TEAM' ? target.index : source.index;
    const boxId = target.location === 'BOX' ? target.id : source.id;
    
    if (teamIndex === undefined) return;

    const newTeam = [...currentTeamPokemon];
    let newBox = [...pcBox];

    const teamMon = currentTeamPokemon[teamIndex];
    const boxMonIdx = pcBox.findIndex(p => p.id === boxId);
    const boxMon = boxMonIdx >= 0 ? pcBox[boxMonIdx] : null;

    if (boxMon) {
      newTeam[teamIndex] = boxMon;
      newBox.splice(boxMonIdx, 1);
      if (teamMon) newBox.push(teamMon);
    } else if (teamMon && !boxMon) {
      newTeam.splice(teamIndex, 1);
      newBox.push(teamMon);
    }

    syncTeamState(newTeam.filter(Boolean));
    onUpdatePcBox(newBox);
  };

  const handleSlotClick = (location: 'TEAM' | 'BOX', index?: number, pkmnId?: string) => {
    if (!selectedSlot) {
      setSelectedSlot({ location, index, id: pkmnId });
      return;
    }

    if (selectedSlot.location === location && selectedSlot.index === index && selectedSlot.id === pkmnId) {
      setSelectedSlot(null);
      return;
    }

    performSwap(selectedSlot, { location, index, id: pkmnId });
    setSelectedSlot(null);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, location: 'TEAM' | 'BOX', index?: number, pkmnId?: string) => {
    setDraggedSlot({ location, index, id: pkmnId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, location: 'TEAM' | 'BOX', index?: number, pkmnId?: string) => {
    e.preventDefault();
    if (!draggedSlot) return;
    performSwap(draggedSlot, { location, index, id: pkmnId });
    setDraggedSlot(null);
  };

  const handleDragEnd = () => {
    setDraggedSlot(null);
  };

  const handleItemChange = (pkmnId: string, location: 'TEAM' | 'BOX', itemId: string) => {
    if (location === 'TEAM') {
      const nextTeam = currentTeamPokemon.map((p) => (p.id === pkmnId ? { ...p, item: itemId } : p));
      syncTeamState(nextTeam);
    } else {
      const nextBox = pcBox.map((p) => (p.id === pkmnId ? { ...p, item: itemId } : p));
      onUpdatePcBox(nextBox);
    }
  };

  const handleDeleteFromBox = (pkmnId: string) => {
    onUpdatePcBox(pcBox.filter((p) => p.id !== pkmnId));
    if (selectedSlot?.id === pkmnId) setSelectedSlot(null);
  };

  const handleAddFromRoster = (speciesId: string) => {
    const spec = POKEMON_ROSTER.find((s) => s.id === speciesId);
    if (!spec) return;

    const newPkmn: CustomPokemon = {
      id: `pkmn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      speciesId: spec.id,
      nickname: spec.name,
      level: 50,
      item: spec.megaForm ? (Array.isArray(spec.megaForm) ? spec.megaForm[0].megaStoneId : spec.megaForm.megaStoneId) : 'none',
      ability: spec.abilities[0] || 'Overgrow',
      nature: 'Adamant',
      evs: { hp: 32, attack: 32, defense: 2, spAtk: 0, spDef: 0, speed: 0 },
      moves: spec.learnset.slice(0, 4)
    };

    onUpdatePcBox([...pcBox, newPkmn]);
    setShowAddModal(false);
  };

  const selectedObject = selectedSlot?.id 
    ? (selectedSlot.location === 'TEAM' 
        ? currentTeamPokemon.find(p => p.id === selectedSlot.id) 
        : pcBox.find(p => p.id === selectedSlot.id))
    : null;
    
  const selectedSpecies = selectedObject ? POKEMON_ROSTER.find(s => s.id === selectedObject.speciesId) : null;

  return (
    <div className="boxes-scene animate-in">
      <div className="boxes-header">
        <h2 className="boxes-title">
          <Package size={28} /> Box & Team Manager
        </h2>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Add to PC Box
        </button>
      </div>

      <div className="boxes-workspace">
        {/* TEAM PANE */}
        <div className="team-pane">
          <div className="team-tabs">
            {battleTeams.map((team, idx) => {
              const isActive = idx === activeTeamIdx;
              const isEditing = editingTeamNameIdx === idx;
              return (
                <div key={idx} className={`team-tab ${isActive ? 'active' : ''}`} onClick={() => handleSelectTeam(idx)}>
                  {isEditing ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={newTeamNameInput}
                        onChange={(e) => setNewTeamNameInput(e.target.value)}
                        className="input-base text-xs py-1 px-2"
                        autoFocus
                      />
                      <button className="text-accent-emerald font-bold text-xs" onClick={() => handleRenameTeam(idx)}>Save</button>
                    </div>
                  ) : (
                    <>
                      <Shield size={14} />
                      {team.name}
                      <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); setEditingTeamNameIdx(idx); setNewTeamNameInput(team.name); }}>
                        <Edit2 size={12} />
                      </button>
                      {battleTeams.length > 1 && (
                        <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); handleDeleteTeam(idx); }}>
                          <Trash2 size={12} color="#f43f5e" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            <button className="btn-ghost text-xs" onClick={handleCreateNewTeam}>
              <Plus size={14} /> New Team
            </button>
            <div
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{
                backgroundColor: !hasItemClauseViolation ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${!hasItemClauseViolation ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.5)'}`,
                color: !hasItemClauseViolation ? '#4ade80' : '#f87171'
              }}
              title={hasItemClauseViolation ? 'Multiple Pokémon on this team hold the same item!' : 'Item Clause: Valid'}
            >
              {!hasItemClauseViolation ? (
                <>
                  <ShieldCheck size={13} /> Item Clause: Valid
                </>
              ) : (
                <>
                  <AlertTriangle size={13} /> Item Clause: Duplicate Item!
                </>
              )}
            </div>
          </div>

          <div className="glass-card team-slots-container">
            {[0, 1, 2, 3, 4, 5].map(slotIdx => {
              const pkmn = currentTeamPokemon[slotIdx];
              const spec = pkmn ? POKEMON_ROSTER.find(s => s.id === pkmn.speciesId) : null;
              const isSelected = selectedSlot?.location === 'TEAM' && selectedSlot.index === slotIdx;
              const isDragging = draggedSlot?.location === 'TEAM' && draggedSlot.index === slotIdx;

              if (pkmn && spec) {
                return (
                  <div 
                    key={pkmn.id} 
                    className={`team-slot ${isSelected ? 'selected' : ''} ${isDragging ? 'opacity-50' : ''}`}
                    onClick={() => handleSlotClick('TEAM', slotIdx, pkmn.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'TEAM', slotIdx, pkmn.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'TEAM', slotIdx, pkmn.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <img src={spec.spriteUrl} alt={spec.name} className="slot-sprite" draggable={false} />
                    <div className="slot-info">
                      <div className="slot-name">{pkmn.nickname || spec.name}</div>
                      <div className="slot-item">
                        <ItemSelect
                          value={pkmn.item}
                          onChange={(itemId) => handleItemChange(pkmn.id, 'TEAM', itemId)}
                          takenItemMap={currentTeamPokemon.reduce((acc, teammate) => {
                            if (teammate.id !== pkmn.id && teammate.item && teammate.item !== 'none') {
                              const teammateSpec = POKEMON_ROSTER.find((s) => s.id === teammate.speciesId);
                              acc[teammate.item] = teammate.nickname || teammateSpec?.name || 'Teammate';
                            }
                            return acc;
                          }, {} as Record<string, string>)}
                          enforceItemClause={true}
                        />
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div 
                    key={`empty_${slotIdx}`} 
                    className={`team-slot empty ${isSelected ? 'selected' : ''}`} 
                    onClick={() => handleSlotClick('TEAM', slotIdx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'TEAM', slotIdx)}
                  >
                    <span>Empty Slot {slotIdx + 1}</span>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* BOX PANE */}
        <div className="box-pane">
          <div className="glass-card flex-1 flex flex-col gap-4">
            <div className="box-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 className="font-bold text-lg">PC Storage ({pcBox.length})</h3>
                <p className="text-xs text-muted">Select or Drag a Pokémon to a team slot to swap.</p>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search PC Box..."
                  value={boxSearchQuery}
                  onChange={e => setBoxSearchQuery(e.target.value)}
                  className="input-base"
                  style={{ paddingLeft: '1.75rem', fontSize: '0.75rem', width: '200px' }}
                />
              </div>
            </div>
            
            <div className="box-grid">
              {pcBox.filter(pkmn => {
                if (!boxSearchQuery.trim()) return true;
                const spec = POKEMON_ROSTER.find((s) => s.id === pkmn.speciesId);
                const q = boxSearchQuery.toLowerCase();
                return (
                  (pkmn.nickname && pkmn.nickname.toLowerCase().includes(q)) ||
                  (spec && spec.name.toLowerCase().includes(q)) ||
                  (spec && spec.types.some(t => t.toLowerCase().includes(q)))
                );
              }).map(pkmn => {
                const spec = POKEMON_ROSTER.find((s) => s.id === pkmn.speciesId);
                const isSelected = selectedSlot?.location === 'BOX' && selectedSlot.id === pkmn.id;
                const isDragging = draggedSlot?.location === 'BOX' && draggedSlot.id === pkmn.id;

                return (
                  <div 
                    key={pkmn.id} 
                    className={`box-mon ${isSelected ? 'selected' : ''} ${isDragging ? 'opacity-50 scale-95' : ''}`} 
                    onClick={() => handleSlotClick('BOX', undefined, pkmn.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'BOX', undefined, pkmn.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'BOX', undefined, pkmn.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <img src={spec?.spriteUrl} alt={spec?.name} className="box-mon-sprite" draggable={false} />
                    <span className="box-mon-name">{pkmn.nickname || spec?.name}</span>
                    {pkmn.item !== 'none' && <div className="box-mon-item-indicator">•</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Bar / Inspector */}
          <div className="action-bar glass-panel">
            {selectedObject && selectedSpecies ? (
              <>
                <div className="selected-mon-preview">
                  <img src={selectedSpecies.spriteUrl} alt={selectedSpecies.name} className="w-12 h-12 object-contain" />
                  <div>
                    <div className="font-bold">{selectedObject.nickname || selectedSpecies.name}</div>
                    <div className="text-xs text-muted">{selectedSlot?.location === 'TEAM' ? 'In Battle Team' : 'In PC Box'}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div style={{ width: '200px' }}>
                    <ItemSelect
                      value={selectedObject.item}
                      onChange={(itemId) => handleItemChange(selectedObject.id, selectedSlot!.location, itemId)}
                      takenItemMap={selectedSlot?.location === 'TEAM' ? currentTeamPokemon.reduce((acc, teammate) => {
                        if (teammate.id !== selectedObject.id && teammate.item && teammate.item !== 'none') {
                          const teammateSpec = POKEMON_ROSTER.find((s) => s.id === teammate.speciesId);
                          acc[teammate.item] = teammate.nickname || teammateSpec?.name || 'Teammate';
                        }
                        return acc;
                      }, {} as Record<string, string>) : {}}
                      enforceItemClause={selectedSlot?.location === 'TEAM'}
                    />
                  </div>
                  
                  {selectedSlot?.location === 'BOX' && (
                    <button className="btn-danger" onClick={() => handleDeleteFromBox(selectedObject.id)}>
                      <Trash2 size={16} /> Delete
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted px-2 w-full text-center">
                Select a Pokémon to inspect and change items.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Roster Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in">
            <div className="modal-header">
              <div>
                <h3 className="font-bold text-xl">Add to PC Box</h3>
                <p className="text-sm text-muted">Select a Pokémon from the National Dex</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Search name or type..."
                    value={rosterSearchQuery}
                    onChange={e => setRosterSearchQuery(e.target.value)}
                    className="input-base pl-9 w-64"
                  />
                </div>
                <button className="btn-ghost" onClick={() => setShowAddModal(false)}>
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="modal-body box-grid p-2">
              {POKEMON_ROSTER.filter(spec => {
                if (!rosterSearchQuery.trim()) return true;
                const q = rosterSearchQuery.toLowerCase();
                return spec.name.toLowerCase().includes(q) || spec.types.some(t => t.toLowerCase().includes(q));
              }).map(spec => (
                <div key={spec.id} className="box-mon" onClick={() => handleAddFromRoster(spec.id)}>
                  <img src={spec.spriteUrl} alt={spec.name} className="box-mon-sprite" />
                  <span className="box-mon-name">{spec.name}</span>
                  <div className="flex gap-1 mt-1 justify-center w-full">
                    {spec.types.slice(0, 1).map(t => (
                      <span key={t} className={`type-badge type-${t.toLowerCase()} text-[8px] px-1 py-0.5`}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
