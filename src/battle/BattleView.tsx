import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import '../styles/battleview.css';
import type { ActivePokemonState, BattleAction, BattleFieldConditions, Move } from '../types/pokemon';
import type { LogMeta } from '../engine/battleEngine';
import { TYPE_COLORS, TypeBadge } from '../intro/TypeRing';
import { PokeballIcon } from '../app/icons';
import { getSpriteUrls, STAT_LABEL } from './types';
import { SwitchScreen } from './SwitchScreen';

export interface BattleViewProps {
  format: string;
  roomId: string;
  isHost: boolean;
  opponentName?: string;
  turn: number;
  myTeamState: ActivePokemonState[];
  opponentTeamState: ActivePokemonState[];
  myActiveIndices: number[];
  oppActiveIndices: number[];
  fieldConditions: BattleFieldConditions;
  battleLog: { text: string; meta?: LogMeta }[];
  activeLogMessage: { text: string; meta?: LogMeta } | null;
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
  /** Called when the move timer hits 0 with choices still outstanding. */
  onTimeout: () => void;
}

const MOVE_TIME = 45;
const URGENT_AT = 10;

type Panel = 'MAIN' | 'FIGHT' | 'POKEMON';

const hpBand = (pct: number) => (pct > 50 ? 'ok' : pct > 20 ? 'mid' : 'low');
const pctOf = (p: ActivePokemonState) => Math.max(0, Math.round((p.currentHp / p.maxStats.hp) * 100));

/** Showdown animated sprite (front/back) with artwork fallback. */
const MonSprite: React.FC<{ mon: ActivePokemonState; back?: boolean; className?: string }> = ({ mon, back, className }) => {
  const urls = getSpriteUrls(mon.species.id);
  const preferred = mon.isMegaEvolved && mon.activeSpriteUrl ? mon.activeSpriteUrl : (back ? urls.back : urls.front);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [preferred]);
  return (
    <img
      className={className}
      src={failed ? (mon.activeSpriteUrl || mon.species.spriteUrl) : preferred}
      alt={mon.nickname}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
};

/** Row of tiny balls: filled green = still able to battle. */
const PartyBalls: React.FC<{ team: ActivePokemonState[] }> = ({ team }) => (
  <div className="bv-balls">
    {team.map((p) => (
      <span key={p.instanceId} className={`bv-ball ${p.currentHp > 0 && !p.isFainted ? 'alive' : 'down'}`} />
    ))}
  </div>
);

const FightGlyph = () => (
  <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden>
    <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M32 6l6 14 15-4-8 13 12 9-15 2 1 15-11-10-11 10 1-15-15-2 12-9-8-13 15 4z" />
      <circle cx="32" cy="32" r="6" />
    </g>
  </svg>
);

const STAGE_KEYS: Array<keyof ActivePokemonState['statStages']> = ['attack', 'defense', 'spAtk', 'spDef', 'speed', 'accuracy', 'evasion'];

export const BattleView: React.FC<BattleViewProps> = (props) => {
  const {
    isHost, roomId, turn, opponentName,
    myTeamState, opponentTeamState, myActiveIndices, oppActiveIndices,
    fieldConditions, activeLogMessage, selectedActorIndex, targetModalMove,
    isTurnProcessing, isWaitingForOpponentTurn, winner, format,
    onSelectMove, onSelectSwitch, onTargetConfirm, onUndoAction, onExit, onShowCalc, onCancelTarget,
    onToggleMega, isMegaChecked, onTimeout,
  } = props;

  const [panel, setPanel] = useState<Panel>('MAIN');
  const [infoOpen, setInfoOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MOVE_TIME);

  // Opposing Pokémon are "revealed" once they've been sent out at least once.
  const [revealedOppIds, setRevealedOppIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    setRevealedOppIds((prev) => {
      const next = new Set(prev);
      oppActiveIndices.forEach((i) => { const m = opponentTeamState[i]; if (m) next.add(m.instanceId); });
      return next.size === prev.size ? prev : next;
    });
  }, [oppActiveIndices, opponentTeamState]);

  const isInputActive = !isTurnProcessing && !isWaitingForOpponentTurn && !winner;
  const canChoose = isInputActive && !targetModalMove;
  const currentActorPkmn = myTeamState[myActiveIndices[selectedActorIndex]];
  const timerRunning = isInputActive && !activeLogMessage;
  const mySide = roomId === 'LOCAL_SOLO' || isHost ? 1 : 2;

  // Fresh clock every turn; return to the main menu.
  useEffect(() => { setTimeLeft(MOVE_TIME); setPanel('MAIN'); }, [turn]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (timeLeft === 0 && timerRunning) {
      setPanel('MAIN');
      onTimeout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, timerRunning]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'x' || e.key === 'X') setInfoOpen((o) => !o);
      if (e.key === 'Escape') { setInfoOpen(false); setPanel('MAIN'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const urgent = timerRunning && timeLeft <= URGENT_AT;

  const logText = (() => {
    if (activeLogMessage) return activeLogMessage.text;
    if (targetModalMove) return `Select a target for ${targetModalMove.name}!`;
    if (isTurnProcessing) return 'Processing turn...';
    if (isWaitingForOpponentTurn) return 'Waiting for opponent...';
    if (winner) return 'Battle Finished!';
    return null;
  })();

  const arenaTint = (() => {
    const w = fieldConditions.weather;
    const t = fieldConditions.terrain;
    if (w && w !== 'Clear') return `w-${w.toLowerCase()}`;
    if (t && t !== 'None') return `t-${t.toLowerCase()}`;
    return 'plain';
  })();

  const oppSlots = oppActiveIndices.map((idx) => ({ idx, mon: opponentTeamState[idx] })).filter((s) => s.mon);
  const mySlots = myActiveIndices.map((idx, i) => ({ idx, i, mon: myTeamState[idx] })).filter((s) => s.mon);

  const sideInfo = useMemo(() => {
    const mk = (side: 1 | 2) => {
      const f = fieldConditions as Record<string, number | undefined>;
      return [
        { label: 'Tailwind', turns: f[`tailwindTeam${side}`] },
        { label: 'Reflect', turns: f[`reflectTeam${side}`] },
        { label: 'Light Screen', turns: f[`lightScreenTeam${side}`] },
        { label: 'Aurora Veil', turns: f[`auroraVeilTeam${side}`] },
      ].filter((e) => (e.turns ?? 0) > 0);
    };
    const opp = (mySide === 1 ? 2 : 1) as 1 | 2;
    return { mine: mk(mySide as 1 | 2), theirs: mk(opp) };
  }, [fieldConditions, mySide]);

  const statLines = (mon: ActivePokemonState) =>
    STAGE_KEYS.filter((k) => mon.statStages?.[k]).map((k) => ({ k, v: mon.statStages[k] }));

  const isDoubles = format === 'Doubles' || mySlots.length > 1 || oppSlots.length > 1;

  return (
    <div className={`bv-root ${arenaTint}`}>
      {/* ---------- Arena ---------- */}
      <div className="bv-stage" aria-hidden>
        <div className="bv-lights" />
        <div className="bv-crowd" />
        <div className="bv-wall" />
        <div className="bv-floor" />
        <div className="bv-floor-glow" />
      </div>

      {/* ---------- Sprites ---------- */}
      <div className="bv-field">
        {oppSlots.map(({ idx, mon }, n) => {
          if (mon.currentHp <= 0) return null;
          const hit = !!activeLogMessage && activeLogMessage.text.includes(mon.nickname) && activeLogMessage.meta?.kind !== 'ability';
          const statDrop = activeLogMessage?.meta?.kind === 'stat' && activeLogMessage.meta.dir === 'down' && activeLogMessage.meta.id === mon.instanceId;
          const statRaise = activeLogMessage?.meta?.kind === 'stat' && activeLogMessage.meta.dir === 'up' && activeLogMessage.meta.id === mon.instanceId;
          const x = oppSlots.length > 1 ? (n === 0 ? 54 : 72) : 63;
          return (
            <div key={`opp-${idx}`} className={`bv-mon bv-mon-opp ${hit ? 'hit' : ''} ${statDrop ? 'stat-drop' : ''} ${statRaise ? 'stat-raise' : ''}`} style={{ left: `${x}%`, top: '47%' }}>
              <MonSprite mon={mon} className="bv-sprite" />
              <div className="bv-shadow" />
            </div>
          );
        })}
        {mySlots.map(({ idx, i, mon }) => {
          if (mon.currentHp <= 0) return null;
          const isActor = canChoose && i === selectedActorIndex;
          const hit = !!activeLogMessage && activeLogMessage.text.includes(mon.nickname) && activeLogMessage.meta?.kind !== 'ability';
          const statDrop = activeLogMessage?.meta?.kind === 'stat' && activeLogMessage.meta.dir === 'down' && activeLogMessage.meta.id === mon.instanceId;
          const statRaise = activeLogMessage?.meta?.kind === 'stat' && activeLogMessage.meta.dir === 'up' && activeLogMessage.meta.id === mon.instanceId;
          const x = mySlots.length > 1 ? (i === 0 ? 24 : 46) : 36;
          return (
            <div key={`my-${idx}`} className={`bv-mon bv-mon-my ${isActor && isDoubles ? 'actor' : ''} ${hit ? 'hit' : ''} ${statDrop ? 'stat-drop' : ''} ${statRaise ? 'stat-raise' : ''}`} style={{ left: `${x}%`, top: '86%' }}>
              <MonSprite mon={mon} back className="bv-sprite" />
              <div className="bv-shadow" />
            </div>
          );
        })}
      </div>

      {/* ---------- Top-left controls ---------- */}
      <div className="bv-corner">
        <button className="bv-chip" onClick={onExit}><ArrowLeft size={16} /> Flee</button>
        <button className="bv-chip" onClick={onShowCalc}><Info size={16} /> Calc</button>
      </div>

      {/* ---------- Opponent plates (top right) ---------- */}
      <div className="bv-opp-hud">
        <div className="bv-opp-plates">
          {oppSlots.map(({ idx, mon }) => {
            const pct = pctOf(mon);
            return (
              <div key={`op-${idx}`} className={`bv-plate bv-plate-opp ${mon.currentHp <= 0 ? 'fainted' : ''}`}>
                <img className="bv-plate-icon" src={getSpriteUrls(mon.species.id).icon} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
                <div className="bv-plate-body">
                  <div className="bv-plate-name">{mon.nickname}</div>
                  <div className="bv-hp-row">
                    <div className="bv-hp"><div className={`bv-hp-fill ${hpBand(pct)}`} style={{ width: `${pct}%` }} /></div>
                    <span className="bv-hp-pct">{pct}<small>%</small></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="bv-opp-balls"><PartyBalls team={opponentTeamState} /></div>

        <div className={`bv-timer ${urgent ? 'hidden' : ''}`}>
          <span>MOVE TIME</span>
          <b>{timeLeft}</b>
        </div>
        <button className={`bv-info-btn ${infoOpen ? 'on' : ''}`} onClick={() => setInfoOpen((o) => !o)}>
          <i>X</i> Battle Info
        </button>
      </div>

      {/* Urgent timer — center, red, unobtrusive */}
      {urgent && <div className="bv-urgent" key={timeLeft}>{timeLeft}</div>}

      {/* ---------- Battle Info panel ---------- */}
      <div className={`bv-info ${infoOpen ? 'open' : ''}`}>
        <h3>Battle Info</h3>
        <section>
          <h4>Field</h4>
          <ul>
            <li>
              <span>Weather</span>
              <b>{fieldConditions.weather && fieldConditions.weather !== 'Clear' ? `${fieldConditions.weather} · ${fieldConditions.weatherTurns ?? '–'}t` : 'None'}</b>
            </li>
            <li>
              <span>Terrain</span>
              <b>{fieldConditions.terrain && fieldConditions.terrain !== 'None' ? `${fieldConditions.terrain} · ${fieldConditions.terrainTurns ?? '–'}t` : 'None'}</b>
            </li>
            {(fieldConditions.trickRoom ?? 0) > 0 && <li><span>Trick Room</span><b>{fieldConditions.trickRoom}t</b></li>}
          </ul>
        </section>
        <section>
          <h4>Your side</h4>
          <ul>
            {sideInfo.mine.length === 0 && <li className="none">No effects</li>}
            {sideInfo.mine.map((e) => <li key={e.label}><span>{e.label}</span><b>{e.turns}t</b></li>)}
          </ul>
        </section>
        <section>
          <h4>Opponent's side</h4>
          <ul>
            {sideInfo.theirs.length === 0 && <li className="none">No effects</li>}
            {sideInfo.theirs.map((e) => <li key={e.label}><span>{e.label}</span><b>{e.turns}t</b></li>)}
          </ul>
        </section>
        <section>
          <h4>Stat changes</h4>
          {[...mySlots.map((s) => ({ mon: s.mon, mine: true })), ...oppSlots.map((s) => ({ mon: s.mon, mine: false }))].map(({ mon, mine }) => {
            const lines = statLines(mon);
            return (
              <div key={mon.instanceId} className="bv-stat-block">
                <div className={`bv-stat-name ${mine ? 'mine' : 'theirs'}`}>{mine ? '' : 'Opposing '}{mon.nickname}</div>
                {lines.length === 0 ? <div className="none">No changes</div> : (
                  <div className="bv-stat-chips">
                    {lines.map(({ k, v }) => (
                      <span key={k} className={v > 0 ? 'up' : 'down'}>{STAT_LABEL[k]} {v > 0 ? `+${v}` : v}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      {/* ---------- Player plates (bottom left) ---------- */}
      <div className="bv-my-hud">
        <PartyBalls team={myTeamState} />
        <div className="bv-my-plates">
          {mySlots.map(({ idx, i, mon }) => {
            const pct = pctOf(mon);
            const isActor = canChoose && i === selectedActorIndex;
            return (
              <div key={`mp-${idx}`} className={`bv-plate bv-plate-my ${isActor ? 'actor' : ''} ${mon.currentHp <= 0 ? 'fainted' : ''}`}>
                <img className="bv-plate-icon" src={getSpriteUrls(mon.species.id).icon} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
                <div className="bv-plate-body">
                  <div className="bv-plate-name">{mon.nickname}</div>
                  <div className="bv-hp"><div className={`bv-hp-fill ${hpBand(pct)}`} style={{ width: `${pct}%` }} /></div>
                  <div className="bv-hp-num"><b>{mon.currentHp}</b><span>/{mon.maxStats.hp}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- Message blurb & Ability Banner ---------- */}
      {activeLogMessage?.meta?.kind === 'ability' ? (() => {
        const triggerMon = [...mySlots, ...oppSlots].map(s => s.mon).find(m => m.instanceId === activeLogMessage.meta?.id);
        const isMine = triggerMon ? mySlots.some(s => s.mon.instanceId === triggerMon.instanceId) : false;
        return (
          <div className={`bv-ability-banner ${isMine ? 'mine' : 'theirs'}`} key={activeLogMessage.text}>
            {triggerMon && <img src={getSpriteUrls(triggerMon.species.id).icon} alt="" className="bv-ability-icon" />}
            <div className="bv-ability-text">
              <span className="bv-ability-name">{triggerMon?.nickname}'s</span>
              <span className="bv-ability-ability">{(triggerMon?.ability || activeLogMessage.text).replace(new RegExp(`^${triggerMon?.nickname}[']s `, 'i'), '')}</span>
            </div>
          </div>
        );
      })() : null}

      {logText && activeLogMessage?.meta?.kind !== 'ability' && (
        <div className="bv-blurb" key={logText}>
          <p>{logText}</p>
        </div>
      )}

      {/* ---------- Command area (bottom right) ---------- */}
      {canChoose && currentActorPkmn && (
        <div className="bv-commands">
          {panel === 'MAIN' && (
            <>
              {currentActorPkmn.species.megaForm && (
                <button onClick={onToggleMega} className={`bv-mega ${isMegaChecked ? 'on' : ''}`}>
                  {isMegaChecked ? 'Mega Evolving' : 'Mega Evolve'}
                </button>
              )}
              {selectedActorIndex > 0 && (
                <button onClick={onUndoAction} className="bv-back"><ArrowLeft size={16} /> Back</button>
              )}
              <div className="bv-cmd-stack">
                <button className="bv-cmd bv-cmd-fight" onClick={() => setPanel('FIGHT')}>
                  <FightGlyph />
                  <span>Fight</span>
                </button>
                <button className="bv-cmd bv-cmd-poke" onClick={() => setPanel('POKEMON')}>
                  <PokeballIcon size={54} />
                  <span>Pokémon</span>
                </button>
              </div>
            </>
          )}

          {panel === 'FIGHT' && (
            <div className="bv-moves">
              <button className="bv-moves-close" onClick={() => setPanel('MAIN')}><ArrowLeft size={16} /> Back</button>
              {currentActorPkmn.moves.map(({ move, currentPp }) => (
                <button
                  key={move.id}
                  className="bv-move"
                  disabled={currentPp <= 0}
                  onClick={() => onSelectMove(move)}
                  style={{ ['--tc' as string]: TYPE_COLORS[move.type] || '#888' }}
                >
                  <TypeBadge type={move.type} size={32} />
                  <span className="bv-move-name">{move.name}</span>
                  <span className="bv-move-pp"><b>{currentPp}</b>/{move.maxPp}</span>
                </button>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ---------- Switch / summary screen ---------- */}
      {panel === 'POKEMON' && (
        <SwitchScreen
          myTeamState={myTeamState}
          myActiveIndices={myActiveIndices}
          opponentTeamState={opponentTeamState}
          revealedOppIds={revealedOppIds}
          opponentName={opponentName}
          timeLeft={timeLeft}
          canSwitch={canChoose}
          onSelectSwitch={(idx) => { setPanel('MAIN'); onSelectSwitch(idx); }}
          onBack={() => setPanel('MAIN')}
        />
      )}

      {/* ---------- Target selection ---------- */}
      {targetModalMove && (
        <div className="bv-targets">
          <button className="bv-moves-close" onClick={onCancelTarget}><ArrowLeft size={16} /> Back</button>
          {oppActiveIndices.map((idx, slot) => {
            const m = opponentTeamState[idx];
            if (!m || m.currentHp <= 0) return null;
            return (
              <button key={`t-${idx}`} className="bv-target" onClick={() => onTargetConfirm(slot)}>
                <img src={getSpriteUrls(m.species.id).icon} alt="" />
                <span>{m.nickname}</span>
                <b>{pctOf(m)}%</b>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
