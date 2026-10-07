import React, { useState } from 'react';
import { ArrowLeft, Award, Info, Swords, Pocket } from 'lucide-react';
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

// Main Battle View
export const BattleView: React.FC<BattleViewProps> = (props) => {
  const {
    format, roomId, myTeamState, opponentTeamState, myActiveIndices, oppActiveIndices,
    fieldConditions, battleLog, activeLogMessage, selectedActorIndex, pendingActions,
    targetModalMove, isTurnProcessing, isWaitingForOpponentTurn, winner,
    onSelectMove, onSelectSwitch, onTargetConfirm, onUndoAction, onToggleMega, isMegaChecked,
    onExit, onShowCalc, onCancelTarget
  } = props;

  // View state: 'MAIN' | 'FIGHT' | 'POKEMON' | 'INFO'
  const [viewState, setViewState] = useState<'MAIN' | 'FIGHT' | 'POKEMON'>('MAIN');

  // If we are waiting for opponent, force MAIN view
  const isInputActive = !isTurnProcessing && !isWaitingForOpponentTurn && !winner && !targetModalMove;

  const currentActorPkmn = myTeamState[myActiveIndices[selectedActorIndex]];
  const allPlayerAlive = myActiveIndices.filter(i => myTeamState[i] && myTeamState[i].currentHp > 0);
  const allOppAlive = oppActiveIndices.filter(i => opponentTeamState[i] && opponentTeamState[i].currentHp > 0);

  // Background overlay for Weather/Terrain
  const getFieldOverlay = () => {
    if (fieldConditions.weather === 'Sun') return 'bg-orange-500/10 mix-blend-overlay';
    if (fieldConditions.weather === 'Rain') return 'bg-blue-500/10 mix-blend-overlay';
    if (fieldConditions.weather === 'Sandstorm') return 'bg-amber-600/10 mix-blend-overlay';
    if (fieldConditions.weather === 'Snow') return 'bg-sky-200/10 mix-blend-overlay';
    if (fieldConditions.terrain === 'Grassy') return 'bg-emerald-500/20 mix-blend-color-burn';
    if (fieldConditions.terrain === 'Electric') return 'bg-yellow-400/10 mix-blend-overlay';
    if (fieldConditions.terrain === 'Psychic') return 'bg-fuchsia-500/10 mix-blend-overlay';
    if (fieldConditions.terrain === 'Misty') return 'bg-pink-300/10 mix-blend-overlay';
    return '';
  };

  const hpColor = (pct: number) => {
    if (pct > 50) return '#4ade80'; // emerald-400
    if (pct > 20) return '#fbbf24'; // amber-400
    return '#f87171'; // red-400
  };

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden flex flex-col perspective-1000">
      {/* 3D Arena Background */}
      <div className={`absolute inset-0 bg-gradient-to-b from-slate-800 to-black ${getFieldOverlay()}`} style={{ zIndex: 0 }}>
        {/* Floor grid */}
        <div className="absolute bottom-0 w-full h-2/3 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-transparent to-transparent opacity-60" style={{ transform: 'rotateX(60deg) scale(2)', transformOrigin: 'bottom' }}>
           <div className="w-full h-full border-t border-indigo-500/20" style={{ backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
      </div>

      {/* Top Bar Navigation */}
      <div className="relative z-50 flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent">
        <button className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-bold bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/10" onClick={onExit}>
          <ArrowLeft size={16} /> Flee
        </button>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-bold bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/10" onClick={onShowCalc}>
            <Info size={16} /> Battle Info
          </button>
        </div>
      </div>

      {/* Center Action Text (Log / Status) */}
      {activeLogMessage && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-black/70 backdrop-blur-md border border-white/10 px-8 py-3 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)]">
            <h2 className="text-xl md:text-2xl font-bold text-white text-center" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {activeLogMessage}
            </h2>
          </div>
        </div>
      )}

      {/* Field Conditions Indicator */}
      <div className="absolute top-20 right-4 z-40 flex flex-col gap-2 items-end pointer-events-none">
        {fieldConditions.weather && fieldConditions.weather !== 'Clear' && (
          <div className="bg-black/60 backdrop-blur-md border border-white/20 text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
            <span>{fieldConditions.weather}</span> <span className="text-white/50">{fieldConditions.weatherTurns}t</span>
          </div>
        )}
        {fieldConditions.terrain && fieldConditions.terrain !== 'None' && (
          <div className="bg-black/60 backdrop-blur-md border border-white/20 text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
            <span>{fieldConditions.terrain} Terrain</span> <span className="text-white/50">{fieldConditions.terrainTurns}t</span>
          </div>
        )}
      </div>

      {/* Battle Scene - Sprites */}
      <div className="relative flex-1 w-full flex items-center justify-center z-10 pointer-events-none">
        
        {/* Opponent Side (Top Right) */}
        <div className="absolute top-[10%] right-[15%] flex gap-12 sm:gap-24 items-end justify-center transform scale-90 sm:scale-100 transition-all">
          {oppActiveIndices.map((idx, i) => {
            const pkmn = opponentTeamState[idx];
            if (!pkmn || pkmn.currentHp <= 0) return null;
            return (
              <div key={`opp-${idx}`} className="relative flex flex-col items-center">
                <img 
                  src={pkmn.activeSpriteUrl || pkmn.species.spriteUrl} 
                  alt={pkmn.nickname} 
                  className={`w-32 h-32 sm:w-48 sm:h-48 object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transform scale-x-[-1] ${activeLogMessage?.includes(pkmn.nickname) ? 'animate-bounce' : ''}`}
                />
                <div className="w-24 sm:w-36 h-4 sm:h-6 bg-black/40 rounded-[100%] absolute -bottom-2 sm:-bottom-3 blur-sm" />
              </div>
            );
          })}
        </div>

        {/* Player Side (Bottom Left) */}
        <div className="absolute bottom-[10%] left-[10%] flex gap-16 sm:gap-32 items-end justify-center transform scale-110 sm:scale-125 transition-all">
          {myActiveIndices.map((idx, i) => {
            const pkmn = myTeamState[idx];
            if (!pkmn || pkmn.currentHp <= 0) return null;
            const isActor = isInputActive && i === selectedActorIndex;
            return (
              <div key={`my-${idx}`} className={`relative flex flex-col items-center transition-all duration-300 ${isActor ? 'scale-110 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]' : ''}`}>
                {isActor && (
                  <div className="absolute -top-12 animate-bounce">
                    <div className="w-0 h-0 border-l-8 border-r-8 border-t-[16px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
                  </div>
                )}
                <img 
                  src={pkmn.activeSpriteUrl || pkmn.species.spriteUrl} 
                  alt={pkmn.nickname} 
                  className="w-40 h-40 sm:w-64 sm:h-64 object-contain filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)]"
                />
                <div className="w-32 sm:w-48 h-5 sm:h-8 bg-black/50 rounded-[100%] absolute -bottom-2 sm:-bottom-4 blur-sm" />
              </div>
            );
          })}
        </div>
      </div>

      {/* HUD - Opponent Plates (Top Left) */}
      <div className="absolute top-20 left-4 z-20 flex flex-col gap-3">
        {oppActiveIndices.map((idx, i) => {
          const pkmn = opponentTeamState[idx];
          if (!pkmn) return null;
          const pct = Math.max(0, Math.round((pkmn.currentHp / pkmn.maxStats.hp) * 100));
          const fainted = pkmn.currentHp <= 0;
          return (
            <div key={`opp-plate-${idx}`} className={`w-64 sm:w-72 bg-slate-900/80 backdrop-blur-md rounded-r-3xl rounded-l-md border-l-4 border-l-rose-500 p-2 shadow-lg flex flex-col gap-1 transition-all ${fainted ? 'opacity-40 grayscale' : ''}`}>
              <div className="flex justify-between items-end px-1">
                <span className="font-bold text-white truncate max-w-[140px] text-sm">{pkmn.nickname}</span>
                <span className="text-white/70 font-bold text-xs">Lv.{pkmn.level}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div className="h-full transition-all duration-500 ease-out" style={{ width: `${pct}%`, backgroundColor: hpColor(pct) }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* HUD - Player Plates (Bottom Left Area) */}
      <div className="absolute bottom-6 sm:bottom-12 left-4 sm:left-12 z-20 flex flex-col gap-3">
        {myActiveIndices.map((idx, i) => {
          const pkmn = myTeamState[idx];
          if (!pkmn) return null;
          const pct = Math.max(0, Math.round((pkmn.currentHp / pkmn.maxStats.hp) * 100));
          const isActor = isInputActive && i === selectedActorIndex;
          const fainted = pkmn.currentHp <= 0;
          return (
            <div key={`my-plate-${idx}`} className={`w-64 sm:w-80 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/50 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all ${isActor ? 'scale-105 border-indigo-500 bg-indigo-900/30' : ''} ${fainted ? 'opacity-40 grayscale' : ''}`}>
              <div className="flex justify-between items-end mb-1.5">
                <span className="font-bold text-white text-base truncate">{pkmn.nickname}</span>
                <span className="text-white/80 font-bold text-sm bg-black/40 px-2 rounded-md">{pkmn.currentHp}/{pkmn.maxStats.hp}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden shadow-inner p-[1px]">
                <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%`, backgroundColor: hpColor(pct) }} />
              </div>
              {/* Stat drops visual indicator */}
              {Object.entries(pkmn.statStages || {}).some(([, val]) => val !== 0) && (
                <div className="flex gap-1 mt-1">
                  {Object.entries(pkmn.statStages).map(([stat, val]) => {
                    if (!val) return null;
                    return <span key={stat} className={`w-2 h-2 rounded-full ${val > 0 ? 'bg-cyan-400' : 'bg-rose-400'}`} title={`${stat} ${val}`} />
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Menu (Bottom Right) */}
      <div className="absolute bottom-6 sm:bottom-12 right-6 sm:right-12 z-30 flex items-center gap-6">
        {isInputActive && viewState === 'MAIN' && !targetModalMove && (
          <div className="flex items-center gap-4 animate-in slide-in-from-right-8 duration-300">
            {selectedActorIndex > 0 && (
              <button 
                onClick={onUndoAction}
                className="w-16 h-16 rounded-full bg-slate-800/80 backdrop-blur-md border-2 border-slate-600 flex flex-col items-center justify-center text-white/70 hover:text-white hover:border-white transition-all hover:scale-105"
              >
                <ArrowLeft size={24} />
                <span className="text-[10px] font-bold mt-1">BACK</span>
              </button>
            )}
            <button 
              onClick={() => setViewState('FIGHT')}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-4 border-indigo-300 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-105 hover:shadow-[0_0_50px_rgba(99,102,241,0.8)] transition-all transform hover:-rotate-6"
            >
              <Swords size={40} className="text-white mb-2" />
              <span className="text-white font-black tracking-widest text-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>FIGHT</span>
            </button>
            <button 
              onClick={() => setViewState('POKEMON')}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 border-4 border-emerald-300 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:scale-105 hover:shadow-[0_0_40px_rgba(16,185,129,0.7)] transition-all transform hover:rotate-6"
            >
              <Pocket size={28} className="text-white mb-1" />
              <span className="text-white font-black tracking-wider text-sm" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>POKÉMON</span>
            </button>
          </div>
        )}

        {isInputActive && viewState === 'POKEMON' && !targetModalMove && currentActorPkmn && (
          <div className="absolute bottom-0 right-0 animate-in slide-in-from-bottom-8 duration-300 origin-bottom-right">
            <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/50 rounded-3xl p-4 shadow-[0_20px_50px_rgba(16,185,129,0.3)] w-[360px] sm:w-[480px]">
              <div className="flex justify-between items-center mb-3 px-2">
                <span className="text-white font-bold">Switch <span className="text-emerald-400">{currentActorPkmn.nickname}</span> with...</span>
                <button onClick={() => setViewState('MAIN')} className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded-full"><ArrowLeft size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {myTeamState.map((pkmn, idx) => {
                  const isActive = myActiveIndices.includes(idx);
                  const isFainted = pkmn.currentHp <= 0;
                  const hpPct = Math.round((pkmn.currentHp / pkmn.maxStats.hp) * 100);
                  return (
                    <button
                      key={pkmn.instanceId}
                      onClick={() => onSelectSwitch(idx)}
                      disabled={isActive || isFainted}
                      className="bg-slate-800 hover:bg-emerald-900/60 border border-slate-600 hover:border-emerald-500 rounded-xl p-2 flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                    >
                      <img src={pkmn.activeSpriteUrl || pkmn.species.spriteUrl} alt={pkmn.nickname} className="w-12 h-12 object-contain group-hover:scale-110 transition-transform" />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-white font-bold text-sm truncate">{pkmn.nickname}</div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div className={`h-full ${hpPct > 50 ? 'bg-emerald-500' : hpPct > 20 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${hpPct}%` }} />
                        </div>
                        {isActive && <div className="text-[9px] text-emerald-400 font-bold uppercase mt-0.5">Active</div>}
                        {isFainted && <div className="text-[9px] text-rose-400 font-bold uppercase mt-0.5">Fainted</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {isInputActive && viewState === 'FIGHT' && !targetModalMove && currentActorPkmn && (
          <div className="absolute bottom-0 right-0 animate-in slide-in-from-bottom-8 duration-300 origin-bottom-right">
            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] w-[360px] sm:w-[420px]">
              <div className="flex justify-between items-center mb-3 px-2">
                <span className="text-white font-bold">What will <span className="text-indigo-400">{currentActorPkmn.nickname}</span> do?</span>
                <button onClick={() => setViewState('MAIN')} className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded-full"><ArrowLeft size={18} /></button>
              </div>
              <div className="flex flex-col gap-2">
                {currentActorPkmn.moves.map(({ move, currentPp }) => (
                  <button
                    key={move.id}
                    onClick={() => onSelectMove(move)}
                    disabled={currentPp <= 0}
                    className="relative overflow-hidden w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl p-3 flex items-center justify-between group transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: TYPE_COLORS[move.type] || '#ccc' }} />
                    <div className="pl-4 flex flex-col items-start">
                      <span className="text-white font-bold text-lg">{move.name}</span>
                      <div className="flex gap-2 items-center">
                        <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: TYPE_COLORS[move.type] || '#ccc' }}>{move.type.toUpperCase()}</span>
                        <span className="text-slate-400 text-xs font-semibold">{move.category}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-white font-bold font-mono text-lg">{currentPp}<span className="text-slate-400 text-sm">/{move.maxPp}</span></span>
                      <span className="text-slate-500 text-xs font-bold uppercase">PP</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Target Modal Override */}
        {targetModalMove && (
          <div className="absolute bottom-0 right-0 animate-in slide-in-from-right-8 duration-300">
             <div className="bg-slate-900/95 backdrop-blur-xl border border-indigo-500/50 rounded-3xl p-5 shadow-[0_20px_50px_rgba(99,102,241,0.3)] w-[360px] sm:w-[480px]">
               <div className="flex justify-between items-center mb-4">
                 <span className="text-white font-bold text-lg">Select target for <span className="text-rose-400">{targetModalMove.name}</span></span>
                 <button onClick={onCancelTarget} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full"><ArrowLeft size={18} /></button>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 {oppActiveIndices.map((idx, slot) => {
                   const oppPkmn = opponentTeamState[idx];
                   if (!oppPkmn || oppPkmn.currentHp <= 0) return null;
                   return (
                     <button
                       key={`target-${idx}`}
                       onClick={() => onTargetConfirm(slot)}
                       className="bg-slate-800 hover:bg-indigo-900/80 border border-slate-600 hover:border-indigo-400 rounded-xl p-3 flex flex-col items-center gap-2 transition-all hover:scale-105"
                     >
                       <img src={oppPkmn.activeSpriteUrl || oppPkmn.species.spriteUrl} alt={oppPkmn.nickname} className="w-16 h-16 object-contain" />
                       <span className="text-white font-bold text-sm">{oppPkmn.nickname}</span>
                     </button>
                   );
                 })}
               </div>
             </div>
          </div>
        )}

        {/* Processing State */}
        {(isTurnProcessing || isWaitingForOpponentTurn) && !winner && (
           <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md px-6 py-4 rounded-full border border-slate-700 animate-in fade-in">
             <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
             <span className="text-white font-bold tracking-wide">
               {isTurnProcessing ? 'PROCESSING TURN...' : 'WAITING FOR OPPONENT...'}
             </span>
           </div>
        )}
      </div>

    </div>
  );
};
