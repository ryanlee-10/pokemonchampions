import React, { useState } from 'react';
import { ArrowLeft, Info, Swords, Package, ChevronLeft, Target } from 'lucide-react';
import '../styles/battleview.css';
import type { ActivePokemonState, BattleAction, BattleFieldConditions, Move } from '../types/pokemon';

export interface BattleViewProps {
  format: string;
  roomId: string;
  myTeamState: ActivePokemonState[];
  opponentTeamState: ActivePokemonState[];
  myActiveIndices: number[];
  oppActiveIndices: number[];
  fieldConditions: BattleFieldConditions;
  battleLog: string[];
  activeLogMessage: string | null;
  selectedActorIndex: number;
  pendingActions: BattleAction[];
  targetModalMove: Move | null;
  isTurnProcessing: boolean;
  isWaitingForOpponentTurn: boolean;
  winner: string | null;
  onSelectMove: (move: Move) => void;
  onSelectSwitch: (teamIndex: number) => void;
  onTargetConfirm: (targetSlot: number) => void;
  onUndoAction: () => void;
  onToggleMega: () => void;
  isMegaChecked: boolean;
  onExit: () => void;
  onShowCalc: () => void;
  onCancelTarget: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  Normal: '#A8A77A', Fire: '#EE8130', Water: '#6390F0', Electric: '#F7D02C',
  Grass: '#7AC74C', Ice: '#96D9D6', Fighting: '#C22E28', Poison: '#A33EA1',
  Ground: '#E2BF65', Flying: '#A98FF3', Psychic: '#F95587', Bug: '#A6B91A',
  Rock: '#B6A136', Ghost: '#735797', Dragon: '#6F35FC', Dark: '#705746',
  Steel: '#B7B7CE', Fairy: '#D685AD',
};

export const BattleView: React.FC<BattleViewProps> = (props) => {
  const {
    myTeamState, opponentTeamState, myActiveIndices, oppActiveIndices,
    fieldConditions, activeLogMessage, selectedActorIndex, targetModalMove,
    isTurnProcessing, isWaitingForOpponentTurn, winner,
    onSelectMove, onSelectSwitch, onTargetConfirm, onUndoAction, onExit, onShowCalc, onCancelTarget,
    onToggleMega, isMegaChecked
  } = props;

  const [viewState, setViewState] = useState<'MAIN' | 'FIGHT' | 'POKEMON'>('MAIN');

  const isInputActive = !isTurnProcessing && !isWaitingForOpponentTurn && !winner && !targetModalMove;
  const currentActorPkmn = myTeamState[myActiveIndices[selectedActorIndex]];

  const hpColor = (pct: number) => {
    if (pct > 50) return '#4ade80';
    if (pct > 20) return '#fbbf24';
    return '#f87171';
  };

  const getLogDisplay = () => {
    if (activeLogMessage) return activeLogMessage;
    if (isTurnProcessing) return "Processing turn...";
    if (isWaitingForOpponentTurn) return "Waiting for opponent...";
    if (winner) return "Battle Finished!";
    if (targetModalMove) return `Select target for ${targetModalMove.name}`;
    if (viewState === 'MAIN' && currentActorPkmn) return `What will ${currentActorPkmn.nickname} do?`;
    if (viewState === 'FIGHT') return "Select a move!";
    if (viewState === 'POKEMON') return "Switch to which Pokémon?";
    return "Battle in progress...";
  };

  return (
    <div className="battle-arena">
      {/* 3D Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#0a0a1a] to-black" />
      <div className="battle-floor" />

      {/* Top Navigation */}
      <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-start pointer-events-none">
        <button className="glass-panel px-4 py-2 flex items-center gap-2 text-white hover:text-rose-400 transition-colors pointer-events-auto rounded-full" onClick={onExit}>
          <ArrowLeft size={18} /> <span className="font-bold tracking-wide">FLEE</span>
        </button>
        
        <div className="flex flex-col items-end gap-2">
          <button className="glass-panel px-4 py-2 flex items-center gap-2 text-white hover:text-cyan-400 transition-colors pointer-events-auto rounded-full" onClick={onShowCalc}>
            <Info size={18} /> <span className="font-bold tracking-wide">INFO</span>
          </button>
          {fieldConditions.weather && fieldConditions.weather !== 'Clear' && (
            <div className="glass-panel px-4 py-1.5 flex items-center gap-2 rounded-full border-amber-500/30">
              <span className="font-bold text-amber-400">{fieldConditions.weather}</span>
              <span className="text-white/50 text-sm font-bold">{fieldConditions.weatherTurns}t</span>
            </div>
          )}
          {fieldConditions.terrain && fieldConditions.terrain !== 'None' && (
            <div className="glass-panel px-4 py-1.5 flex items-center gap-2 rounded-full border-fuchsia-500/30">
              <span className="font-bold text-fuchsia-400">{fieldConditions.terrain} Terrain</span>
              <span className="text-white/50 text-sm font-bold">{fieldConditions.terrainTurns}t</span>
            </div>
          )}
        </div>
      </div>

      {/* Sprites */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Opponent (Top Right) */}
        <div className="absolute top-[15%] right-[10%] flex gap-12 sm:gap-24 items-end justify-center transform scale-90 sm:scale-100 transition-all">
          {oppActiveIndices.map((idx) => {
            const pkmn = opponentTeamState[idx];
            if (!pkmn || pkmn.currentHp <= 0) return null;
            return (
              <div key={`opp-${idx}`} className="relative flex flex-col items-center">
                <img 
                  src={pkmn.activeSpriteUrl || pkmn.species.spriteUrl} 
                  alt={pkmn.nickname} 
                  className={`w-36 h-36 sm:w-48 sm:h-48 object-contain filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] transform scale-x-[-1] transition-transform duration-300 ${activeLogMessage?.includes(pkmn.nickname) ? 'animate-bounce' : ''}`}
                />
                <div className="w-24 sm:w-36 h-4 sm:h-6 bg-black/60 rounded-[100%] absolute -bottom-3 sm:-bottom-4 blur-md" />
              </div>
            );
          })}
        </div>

        {/* Player (Bottom Left) */}
        <div className="absolute bottom-[35%] left-[10%] flex gap-16 sm:gap-32 items-end justify-center transform scale-110 sm:scale-125 transition-all">
          {myActiveIndices.map((idx, i) => {
            const pkmn = myTeamState[idx];
            if (!pkmn || pkmn.currentHp <= 0) return null;
            const isActor = isInputActive && i === selectedActorIndex;
            return (
              <div key={`my-${idx}`} className={`relative flex flex-col items-center transition-all duration-300 ${isActor ? 'scale-110 filter drop-shadow-[0_0_20px_rgba(124,108,255,0.6)]' : ''}`}>
                {isActor && (
                  <div className="absolute -top-12 animate-bounce">
                    <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                  </div>
                )}
                <img 
                  src={pkmn.activeSpriteUrl || pkmn.species.spriteUrl} 
                  alt={pkmn.nickname} 
                  className="w-48 h-48 sm:w-64 sm:h-64 object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
                />
                <div className="w-32 sm:w-48 h-5 sm:h-8 bg-black/70 rounded-[100%] absolute -bottom-4 sm:-bottom-6 blur-md" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Opponent Plates (Top Left) */}
      <div className="absolute top-24 left-6 z-20 flex flex-col gap-4">
        {oppActiveIndices.map((idx) => {
          const pkmn = opponentTeamState[idx];
          if (!pkmn) return null;
          const pct = Math.max(0, Math.round((pkmn.currentHp / pkmn.maxStats.hp) * 100));
          const fainted = pkmn.currentHp <= 0;
          return (
            <div key={`opp-plate-${idx}`} className={`plate-glass plate-opp w-64 sm:w-80 transition-all ${fainted ? 'opacity-40 grayscale' : ''}`}>
              <div className="flex justify-between items-end mb-2">
                <span className="font-bold text-white text-lg truncate drop-shadow-md">{pkmn.nickname}</span>
                <span className="text-slate-300 font-bold text-xs bg-black/40 px-2 py-0.5 rounded-md border border-white/10">Lv.{pkmn.level}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3.5 overflow-hidden shadow-inner p-[1px] border border-slate-800">
                <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%`, backgroundColor: hpColor(pct) }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Player Plates (Bottom Right - Above HUD) */}
      <div className="absolute bottom-[160px] right-6 z-20 flex flex-col gap-4 items-end">
        {myActiveIndices.map((idx, i) => {
          const pkmn = myTeamState[idx];
          if (!pkmn) return null;
          const pct = Math.max(0, Math.round((pkmn.currentHp / pkmn.maxStats.hp) * 100));
          const isActor = isInputActive && i === selectedActorIndex;
          const fainted = pkmn.currentHp <= 0;
          return (
            <div key={`my-plate-${idx}`} className={`plate-glass plate-my w-72 sm:w-[360px] transition-all duration-300 ${isActor ? 'scale-105 border-r-cyan-400 bg-cyan-900/20' : ''} ${fainted ? 'opacity-40 grayscale' : ''}`}>
              <div className="flex justify-between items-end mb-2">
                <span className="font-bold text-white text-xl truncate drop-shadow-md">{pkmn.nickname}</span>
                <span className="text-white font-bold text-sm bg-black/60 px-3 py-1 rounded-md border border-white/20 tracking-wider shadow-inner">{pkmn.currentHp}/{pkmn.maxStats.hp}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden shadow-inner p-[2px] border border-slate-800">
                <div className="h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_currentColor]" style={{ width: `${pct}%`, backgroundColor: hpColor(pct), color: hpColor(pct) }} />
              </div>
              {Object.entries(pkmn.statStages || {}).some(([, val]) => val !== 0) && (
                <div className="flex gap-1.5 mt-2 justify-end">
                  {Object.entries(pkmn.statStages).map(([stat, val]) => {
                    if (!val) return null;
                    return <span key={stat} className={`w-2.5 h-2.5 rounded-full shadow-sm ${val > 0 ? 'bg-cyan-400 shadow-cyan-500/50' : 'bg-rose-400 shadow-rose-500/50'}`} title={`${stat} ${val}`} />
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unified Bottom HUD */}
      <div className="hud-bottom h-[140px]">
        {/* Log Area */}
        <div className="hud-log">
          <p className="hud-log-text animate-in fade-in zoom-in duration-300" key={getLogDisplay()}>{getLogDisplay()}</p>
        </div>

        {/* Action Area */}
        {isInputActive && !targetModalMove && currentActorPkmn && (
          <div className="w-[45%] lg:w-[40%] flex gap-4 h-full animate-in slide-in-from-right-8 duration-300">
            {viewState === 'MAIN' && (
              <div className="hud-actions w-full relative">
                {currentActorPkmn.species.megaForm && (
                  <button onClick={onToggleMega} className={`absolute -top-12 right-0 z-50 glass-panel px-4 py-1.5 rounded-full font-bold text-sm tracking-widest transition-all ${isMegaChecked ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'text-slate-400 hover:text-white'}`}>
                    {isMegaChecked ? 'MEGA EVOLVING' : 'MEGA EVOLVE'}
                  </button>
                )}
                {selectedActorIndex > 0 && (
                  <button onClick={onUndoAction} className="btn-battle-action w-[80px]" style={{ fontSize: '14px' }}>
                    <ChevronLeft size={28} />
                    <span>BACK</span>
                  </button>
                )}
                <button onClick={() => setViewState('FIGHT')} className="btn-battle-action btn-fight flex-1">
                  <Swords size={32} />
                  <span>FIGHT</span>
                </button>
                <button onClick={() => setViewState('POKEMON')} className="btn-battle-action btn-pokemon flex-1">
                  <Package size={32} />
                  <span>POKÉMON</span>
                </button>
              </div>
            )}

            {viewState === 'FIGHT' && (
              <div className="glass-panel w-full p-3 flex flex-col animate-in fade-in slide-in-from-bottom-4 relative">
                <button onClick={() => setViewState('MAIN')} className="absolute -top-3 -left-3 bg-slate-800 border border-white/20 rounded-full p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 z-10 transition-colors">
                  <ArrowLeft size={16} />
                </button>
                <div className="moves-grid">
                  {currentActorPkmn.moves.map(({ move, currentPp }) => (
                    <button key={move.id} onClick={() => onSelectMove(move)} disabled={currentPp <= 0} className="move-btn">
                      <div className="move-type-strip" style={{ backgroundColor: TYPE_COLORS[move.type] || '#ccc' }} />
                      <div className="pl-2">
                        <div className="move-name">{move.name}</div>
                        <div className="move-meta mt-1">
                          <span className="px-2 py-0.5 rounded text-[10px] text-white" style={{ backgroundColor: TYPE_COLORS[move.type] || '#ccc' }}>{move.type.toUpperCase()}</span>
                          <span className="move-pp">{currentPp}/{move.maxPp} PP</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {viewState === 'POKEMON' && (
              <div className="glass-panel w-full p-3 flex flex-col animate-in fade-in slide-in-from-bottom-4 relative overflow-y-auto overflow-x-hidden">
                <button onClick={() => setViewState('MAIN')} className="absolute top-2 right-3 text-slate-400 hover:text-white transition-colors z-20">
                  <ArrowLeft size={20} />
                </button>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {myTeamState.map((pkmn, idx) => {
                    const isActive = myActiveIndices.includes(idx);
                    const isFainted = pkmn.currentHp <= 0;
                    const hpPct = Math.round((pkmn.currentHp / pkmn.maxStats.hp) * 100);
                    return (
                      <button key={pkmn.instanceId} onClick={() => onSelectSwitch(idx)} disabled={isActive || isFainted} className="bg-slate-800/80 hover:bg-emerald-900/60 border border-slate-600/50 hover:border-emerald-400 rounded-xl p-2 flex items-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                        <img src={pkmn.activeSpriteUrl || pkmn.species.spriteUrl} alt={pkmn.nickname} className="w-10 h-10 object-contain drop-shadow-md" />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-white font-bold text-xs truncate">{pkmn.nickname}</div>
                          <div className="w-full bg-slate-950 h-1.5 rounded-full mt-1.5 border border-slate-800">
                            <div className="h-full rounded-full shadow-[0_0_5px_currentColor]" style={{ width: `${hpPct}%`, backgroundColor: hpColor(hpPct), color: hpColor(hpPct) }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Target Selection View */}
        {targetModalMove && (
          <div className="w-[45%] lg:w-[40%] flex gap-4 h-full animate-in slide-in-from-right-8 duration-300">
            <div className="glass-panel w-full p-3 flex flex-col relative justify-center">
              <button onClick={onCancelTarget} className="absolute -top-3 -left-3 bg-slate-800 border border-white/20 rounded-full p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 z-10 transition-colors">
                <ArrowLeft size={16} />
              </button>
              <div className="grid grid-cols-2 gap-3 px-2">
                {oppActiveIndices.map((idx, slot) => {
                  const oppPkmn = opponentTeamState[idx];
                  if (!oppPkmn || oppPkmn.currentHp <= 0) return null;
                  return (
                    <button key={`target-${idx}`} onClick={() => onTargetConfirm(slot)} className="bg-slate-800/60 hover:bg-indigo-900/60 border border-slate-600/50 hover:border-indigo-400 rounded-2xl p-3 flex flex-col items-center gap-2 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                      <Target size={24} className="absolute top-2 right-2 text-indigo-400 opacity-50" />
                      <img src={oppPkmn.activeSpriteUrl || oppPkmn.species.spriteUrl} alt={oppPkmn.nickname} className="w-14 h-14 object-contain filter drop-shadow-lg" />
                      <span className="text-white font-bold text-sm tracking-wide">{oppPkmn.nickname}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
