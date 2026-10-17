import React, { useEffect, useState } from 'react';
import { ArrowLeft, Info, Flag, Settings, ScrollText } from 'lucide-react';
import '../styles/battleview.css';
import type { ActivePokemonState, BattleAction, BattleFieldConditions, Move } from '../types/pokemon';
import type { LogMeta } from '../engine/battleEngine';
import { TYPE_COLORS, TypeBadge } from '../intro/TypeRing';
import { PokeballIcon } from '../app/icons';
import { getSpriteUrls, STAT_LABEL } from './types';
import { SwitchScreen } from './SwitchScreen';
import { BattleInfoModal } from './BattleInfoModal';
import { BattleOptionsModal } from './BattleOptionsModal';
import { BattleSidebar } from './BattleSidebar';
import { BattleProjectile, type ProjectileState } from './BattleProjectile';
import { WeatherLayer, TerrainLayer, FieldBadge } from './FieldEffects';
import { MOVES_DATABASE } from '../data/moves';

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
  onConcede: () => void;
  onShowCalc: () => void;
  onCancelTarget: () => void;
  /** Called when the move timer hits 0 with choices still outstanding. */
  onTimeout: () => void;
}

const MOVE_TIME = 45;
const URGENT_AT = 10;

type Panel = 'MAIN' | 'FIGHT' | 'POKEMON';

/** Strict HP Bar Thresholds: Green 50-100%, Yellow 15-49%, Red 0-14% */
const hpBand = (pct: number) => (pct >= 50 ? 'ok' : pct >= 15 ? 'mid' : 'low');
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

export const BattleView: React.FC<BattleViewProps> = (props) => {
  const {
    isHost, roomId, turn, opponentName,
    myTeamState, opponentTeamState, myActiveIndices, oppActiveIndices,
    fieldConditions, activeLogMessage, selectedActorIndex, targetModalMove,
    isTurnProcessing, isWaitingForOpponentTurn, winner, format,
    onSelectMove, onSelectSwitch, onTargetConfirm, onUndoAction, onExit, onConcede, onShowCalc, onCancelTarget,
    onToggleMega, isMegaChecked, onTimeout,
  } = props;

  const [panel, setPanel] = useState<Panel>('MAIN');
  const [infoOpen, setInfoOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [concedeOpen, setConcedeOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MOVE_TIME);

  // Stable cinematic battle camera with tactile impact screen shake
  const [projectileState, setProjectileState] = useState<ProjectileState | null>(null);
  const [screenShake, setScreenShake] = useState(false);

  // Opposing PokÃ©mon are "revealed" once they've been sent out at least once.
  const [revealedOppIds, setRevealedOppIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    setRevealedOppIds((prev) => {
      const next = new Set(prev);
      oppActiveIndices.forEach((i) => { const m = opponentTeamState[i]; if (m) next.add(m.instanceId); });
      return next.size === prev.size ? prev : next;
    });
  }, [oppActiveIndices, opponentTeamState]);

  const isInputActive = !isTurnProcessing && !isWaitingForOpponentTurn && !winner;
  const canChoose = isInputActive && !targetModalMove && !activeLogMessage;
  const alivePlayerIndices = myActiveIndices.filter((idx) => {
    const p = myTeamState[idx];
    return p && !p.isFainted && p.currentHp > 0;
  });
  const currentActorSlot = alivePlayerIndices[selectedActorIndex] ?? myActiveIndices[selectedActorIndex] ?? myActiveIndices[0];
  const currentActorPkmn = myTeamState[currentActorSlot];
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
      if (e.key === 'x' || e.key === 'X' || e.key === 'y' || e.key === 'Y') setInfoOpen((o) => !o);
      if (e.key === 'Escape') { setInfoOpen(false); setPanel('MAIN'); setOptionsOpen(false); setConcedeOpen(false); }
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

  const isDoubles = format === 'Doubles' || mySlots.length > 1 || oppSlots.length > 1;

  // Arena coordinates (sprite centres, % of viewport) for each active slot.
  const slotPos = (side: 'my' | 'opp', n: number, count: number) => {
    if (side === 'opp') return { x: count > 1 ? (n === 0 ? 54 : 72) : 63, y: 37 };
    return { x: count > 1 ? (n === 0 ? 24 : 46) : 36, y: 71 };
  };

  // Attack VFX: user aura -> type projectile (special only) -> type impact on target
  useEffect(() => {
    if (!activeLogMessage) {
      setProjectileState(null);
      setScreenShake(false);
      return;
    }

    const txt = activeLogMessage.text;
    const isMoveUsed = txt.includes(' used ') || activeLogMessage.meta?.kind === 'move';
    const isHitOrDmg = txt.includes(' took ') && txt.includes(' damage');

    if (isMoveUsed) {
      const myIdx = mySlots.findIndex((s) => (activeLogMessage.meta?.id ? s.mon.instanceId === activeLogMessage.meta.id : txt.startsWith(s.mon.nickname)));
      const oppIdx = oppSlots.findIndex((s) => (activeLogMessage.meta?.id ? s.mon.instanceId === activeLogMessage.meta.id : txt.startsWith(s.mon.nickname)));
      const isMine = myIdx >= 0 && !(oppIdx >= 0 && txt.toLowerCase().includes('opposing'));

      const rawMoveName = txt.replace(/^.*? used /, '').replace(/!.*$/, '').trim();
      const metaMoveId = (activeLogMessage.meta as { moveId?: string } | undefined)?.moveId;
      const moveObj = (metaMoveId ? MOVES_DATABASE[metaMoveId] : undefined)
        || Object.values(MOVES_DATABASE).find((m) => m.name.toLowerCase() === rawMoveName.toLowerCase());
      const moveType = activeLogMessage.meta?.moveType || moveObj?.type || 'Normal';
      const moveName = moveObj?.name || rawMoveName || 'Attack';
      const category = (moveObj?.category || activeLogMessage.meta?.category || 'Special') as ProjectileState['category'];
      const isStatusMove = category === 'Status';

      const start = isMine
        ? slotPos('my', Math.max(0, myIdx), mySlots.length)
        : slotPos('opp', Math.max(0, oppIdx), oppSlots.length);
      const targetList = isMine ? oppSlots : mySlots;
      const tIdx = Math.max(0, targetList.findIndex((s) => s.mon.currentHp > 0));
      const end = slotPos(isMine ? 'opp' : 'my', tIdx, targetList.length);

      const base: ProjectileState = {
        phase: 'charge',
        direction: isMine ? 'to-opp' : 'to-my',
        moveType, moveName, category,
        startX: start.x, startY: start.y, endX: end.x, endY: end.y,
      };

      setProjectileState(base);
      const timers: number[] = [];
      if (isStatusMove) {
        timers.push(window.setTimeout(() => setProjectileState(null), 750));
      } else {
        const contact = category === 'Physical';
        const impactAt = contact ? 260 : 560;
        if (!contact) timers.push(window.setTimeout(() => setProjectileState({ ...base, phase: 'flight' }), 200));
        timers.push(window.setTimeout(() => { setScreenShake(true); setProjectileState({ ...base, phase: 'impact' }); }, impactAt));
        timers.push(window.setTimeout(() => setScreenShake(false), impactAt + 300));
        timers.push(window.setTimeout(() => setProjectileState(null), impactAt + 520));
      }
      return () => timers.forEach((t) => window.clearTimeout(t));
    } else if (isHitOrDmg) {
      setScreenShake(true);
      const t = window.setTimeout(() => {
        setScreenShake(false);
      }, 280);
      return () => window.clearTimeout(t);
    }
  }, [activeLogMessage]);

  /** True while the current log line is this Pokémon's faint message (plays the KO animation). */
  const isFaintingNow = (mon: ActivePokemonState) =>
    !!activeLogMessage && (
      (activeLogMessage.meta?.kind === 'faint' && activeLogMessage.meta.id === mon.instanceId) ||
      (!activeLogMessage.meta?.id && activeLogMessage.text.includes(`${mon.nickname} fainted`))
    );

  const getStatLabel = (msgText?: string, metaStat?: string): string => {
    if (metaStat && STAT_LABEL[metaStat]) return STAT_LABEL[metaStat];
    if (metaStat) return metaStat;
    if (!msgText) return 'STAT';
    if (msgText.includes('Sp. Atk')) return 'Sp. Atk';
    if (msgText.includes('Sp. Def')) return 'Sp. Def';
    if (msgText.includes('Attack')) return 'Attack';
    if (msgText.includes('Defense')) return 'Defense';
    if (msgText.includes('Speed')) return 'Speed';
    if (msgText.includes('Accuracy')) return 'Accuracy';
    if (msgText.includes('Evasion')) return 'Evasiveness';
    return 'STAT';
  };

  return (
    <div className={`bv-root ${arenaTint}`}>
      {/* ---------- Stable Stadium Arena Viewport ---------- */}
      <div className={`bv-camera-rig ${screenShake ? 'shake' : ''}`}>
        {/* Arena Stage */}
        <div className="bv-stage" aria-hidden>
          <div className="ar-sky" />
          <div className="ar-clouds" />
          <div className="ar-stands" />
          <div className="ar-ground" />
          <div className="ar-lines" />
          <div className="ar-pad ar-pad-opp" />
          <div className="ar-pad ar-pad-my" />
          <TerrainLayer terrain={fieldConditions.terrain} />
        </div>

        <WeatherLayer weather={fieldConditions.weather} />

        {/* Dynamic Type-Themed Move Projectile Visual Effect */}
        {projectileState && <BattleProjectile state={projectileState} />}

        {/* ---------- 2D Showdown Animated Sprites ---------- */}
        <div className="bv-field">
          {oppSlots.map(({ idx, mon }, n) => {
            const fainting = isFaintingNow(mon);
            if (mon.currentHp <= 0 && !fainting) return null;
            const isAttacker = !!activeLogMessage && activeLogMessage.text.startsWith(mon.nickname) && activeLogMessage.text.includes(' used ');
            const hit = !fainting && !!activeLogMessage && (activeLogMessage.meta?.kind === 'damage' || / took .*damage|lost .*HP|was hit/.test(activeLogMessage.text)) && (activeLogMessage.meta?.id ? activeLogMessage.meta.id === mon.instanceId : activeLogMessage.text.includes(mon.nickname));
            const statDrop = (activeLogMessage?.meta?.kind === 'stat' && activeLogMessage.meta.dir === 'down' && (activeLogMessage.meta.id === mon.instanceId || (!activeLogMessage.meta.id && activeLogMessage.text.includes(mon.nickname))))
              || (!!activeLogMessage && activeLogMessage.text.includes(mon.nickname) && (activeLogMessage.text.includes('dropped') || activeLogMessage.text.includes('fell') || activeLogMessage.text.includes('lowered')));
            const statRaise = (activeLogMessage?.meta?.kind === 'stat' && activeLogMessage.meta.dir === 'up' && (activeLogMessage.meta.id === mon.instanceId || (!activeLogMessage.meta.id && activeLogMessage.text.includes(mon.nickname))))
              || (!!activeLogMessage && activeLogMessage.text.includes(mon.nickname) && (activeLogMessage.text.includes('rose') || activeLogMessage.text.includes('raised') || activeLogMessage.text.includes('boosted')));
            const statLabel = getStatLabel(activeLogMessage?.text, activeLogMessage?.meta?.stat);
            const x = oppSlots.length > 1 ? (n === 0 ? 54 : 72) : 63;
            return (
              <div key={`opp-${idx}`} className={`bv-mon bv-mon-opp ${fainting ? 'fainting' : ''} ${isAttacker ? 'attacking' : ''} ${hit ? 'hit' : ''} ${statDrop ? 'stat-drop' : ''} ${statRaise ? 'stat-raise' : ''}`} style={{ left: `${x}%`, top: '47%' }}>
                <MonSprite mon={mon} className="bv-sprite" />
                <div className="bv-shadow" />
                {statDrop && (
                  <div className="bv-stat-fx down">
                    <div className="bv-stat-arrows"><span>â–¼</span><span>â–¼</span><span>â–¼</span></div>
                    <div className="bv-stat-badge">{statLabel} â–¼</div>
                  </div>
                )}
                {statRaise && (
                  <div className="bv-stat-fx up">
                    <div className="bv-stat-arrows"><span>â–²</span><span>â–²</span><span>â–²</span></div>
                    <div className="bv-stat-badge">{statLabel} â–²</div>
                  </div>
                )}
              </div>
            );
          })}
          {mySlots.map(({ idx, i, mon }) => {
            const fainting = isFaintingNow(mon);
            if (mon.currentHp <= 0 && !fainting) return null;
            const isActor = canChoose && i === selectedActorIndex;
            const isAttacker = !!activeLogMessage && activeLogMessage.text.startsWith(mon.nickname) && activeLogMessage.text.includes(' used ');
            const hit = !fainting && !!activeLogMessage && (activeLogMessage.meta?.kind === 'damage' || / took .*damage|lost .*HP|was hit/.test(activeLogMessage.text)) && (activeLogMessage.meta?.id ? activeLogMessage.meta.id === mon.instanceId : activeLogMessage.text.includes(mon.nickname));
            const statDrop = (activeLogMessage?.meta?.kind === 'stat' && activeLogMessage.meta.dir === 'down' && (activeLogMessage.meta.id === mon.instanceId || (!activeLogMessage.meta.id && activeLogMessage.text.includes(mon.nickname))))
              || (!!activeLogMessage && activeLogMessage.text.includes(mon.nickname) && (activeLogMessage.text.includes('dropped') || activeLogMessage.text.includes('fell') || activeLogMessage.text.includes('lowered')));
            const statRaise = (activeLogMessage?.meta?.kind === 'stat' && activeLogMessage.meta.dir === 'up' && (activeLogMessage.meta.id === mon.instanceId || (!activeLogMessage.meta.id && activeLogMessage.text.includes(mon.nickname))))
              || (!!activeLogMessage && activeLogMessage.text.includes(mon.nickname) && (activeLogMessage.text.includes('rose') || activeLogMessage.text.includes('raised') || activeLogMessage.text.includes('boosted')));
            const statLabel = getStatLabel(activeLogMessage?.text, activeLogMessage?.meta?.stat);
            const x = mySlots.length > 1 ? (i === 0 ? 24 : 46) : 36;
            return (
              <div key={`my-${idx}`} className={`bv-mon bv-mon-my ${fainting ? 'fainting' : ''} ${isActor && isDoubles ? 'actor' : ''} ${isAttacker ? 'attacking' : ''} ${hit ? 'hit' : ''} ${statDrop ? 'stat-drop' : ''} ${statRaise ? 'stat-raise' : ''}`} style={{ left: `${x}%`, top: '86%' }}>
                <MonSprite mon={mon} back className="bv-sprite" />
                <div className="bv-shadow" />
                {statDrop && (
                  <div className="bv-stat-fx down">
                    <div className="bv-stat-arrows"><span>â–¼</span><span>â–¼</span><span>â–¼</span></div>
                    <div className="bv-stat-badge">{statLabel} â–¼</div>
                  </div>
                )}
                {statRaise && (
                  <div className="bv-stat-fx up">
                    <div className="bv-stat-arrows"><span>â–²</span><span>â–²</span><span>â–²</span></div>
                    <div className="bv-stat-badge">{statLabel} â–²</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- Top-Left Controls: Concede, Options, Calc ---------- */}
      <div className="bv-corner">
        <button className="bv-chip bv-chip-concede" onClick={() => setConcedeOpen(true)} title="Forfeit Battle">
          <Flag size={15} /> Forfeit
        </button>
        <button className="bv-chip" onClick={() => setOptionsOpen(true)} title="Battle Options">
          <Settings size={15} /> Options
        </button>
        <button className="bv-chip" onClick={onShowCalc} title="Damage Calculator">
          <Info size={15} /> Calc
        </button>
      </div>

      {/* ---------- Opponent HUD (Top Right) ---------- */}
      <div className="bv-opp-hud">
        {/* Toggle Right Sidebar for Battle Log & Chat */}
        <button
          className="bv-sidebar-toggle"
          onClick={() => setSidebarOpen((o) => !o)}
          title="Battle Log & Chat"
        >
          <ScrollText size={15} />
          <span>Log & Chat</span>
        </button>

        <div className="bv-opp-plates">
          {oppSlots.map(({ idx, mon }) => {
            const pct = pctOf(mon);
            return (
              <div key={`op-${idx}`} className={`bv-plate bv-plate-opp ${mon.currentHp <= 0 ? 'fainted' : ''}`}>
                <div className="bv-plate-avatar">
                  <img className="bv-plate-icon" src={getSpriteUrls(mon.species.id).icon} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
                </div>
                <div className="bv-plate-body">
                  <div className="bv-plate-top">
                    <span className="bv-plate-name">{mon.nickname}</span>
                    {mon.status && <span className={`bv-status-tag bv-status-${mon.status.toLowerCase()}`}>{mon.status.toUpperCase().slice(0, 3)}</span>}
                  </div>
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

        <div className={`bv-timer ${urgent ? 'urgent-pulse' : ''}`}>
          <span>MOVE TIME</span>
          <b>{timeLeft}</b>
        </div>
        <button className={`bv-info-btn ${infoOpen ? 'on' : ''}`} onClick={() => setInfoOpen((o) => !o)}>
          <i>i</i> Battle Info
        </button>
      </div>

      <FieldBadge field={fieldConditions} />

      {/* Urgent Timer Pulse Center Alert */}
      {urgent && <div className="bv-urgent" key={timeLeft}>{timeLeft}</div>}

      {/* ---------- Battle Info Modal ---------- */}
      <BattleInfoModal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        mySlots={mySlots}
        oppSlots={oppSlots}
        fieldConditions={fieldConditions}
        timeLeft={timeLeft}
        turn={turn}
        mySide={mySide as 1 | 2}
      />

      {/* ---------- Options Slide-Out & Concede Confirmation Modal ---------- */}
      <BattleOptionsModal
        isOptionsOpen={optionsOpen}
        onCloseOptions={() => setOptionsOpen(false)}
        isConcedeOpen={concedeOpen}
        onOpenConcede={() => setConcedeOpen(true)}
        onCloseConcede={() => setConcedeOpen(false)}
        onConfirmConcede={onConcede}
        onShowCalc={onShowCalc}
        onExit={onExit}
      />

      {/* ---------- Collapsible Right Sidebar (Log & Chat) ---------- */}
      <BattleSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        turn={turn}
        battleLog={props.battleLog}
        isMultiplayer={roomId !== 'LOCAL_SOLO'}
        opponentName={opponentName}
      />

      {/* ---------- Player HUD (Bottom Left) ---------- */}
      <div className="bv-my-hud">
        <PartyBalls team={myTeamState} />
        <div className="bv-my-plates">
          {mySlots.map(({ idx, mon }) => {
            const pct = pctOf(mon);
            const isActor = canChoose && mon && mon.instanceId === currentActorPkmn?.instanceId;
            return (
              <div key={`mp-${idx}`} className={`bv-plate bv-plate-my ${isActor ? 'actor' : ''} ${mon.currentHp <= 0 ? 'fainted' : ''}`}>
                <div className="bv-plate-avatar">
                  <img className="bv-plate-icon" src={getSpriteUrls(mon.species.id).icon} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
                </div>
                <div className="bv-plate-body">
                  <div className="bv-plate-top">
                    <span className="bv-plate-name">{mon.nickname}</span>
                    {mon.status && <span className={`bv-status-tag bv-status-${mon.status.toLowerCase()}`}>{mon.status.toUpperCase().slice(0, 3)}</span>}
                  </div>
                  <div className="bv-hp-row">
                    <div className="bv-hp"><div className={`bv-hp-fill ${hpBand(pct)}`} style={{ width: `${pct}%` }} /></div>
                    <span className="bv-hp-pct">{pct}<small>%</small></span>
                  </div>
                  <div className="bv-hp-num"><b>{mon.currentHp}</b><span> / {mon.maxStats.hp}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- Ability Announcement Banner ---------- */}
      {activeLogMessage?.meta?.kind === 'ability' ? (() => {
        const triggerMon = [...mySlots, ...oppSlots].map(s => s.mon).find(m => m.instanceId === activeLogMessage.meta?.id || activeLogMessage.text.includes(m.nickname));
        const isMine = triggerMon ? mySlots.some(s => s.mon.instanceId === triggerMon.instanceId) : !activeLogMessage.text.toLowerCase().includes('opposing');
        const abilityDisplayName = triggerMon?.ability || activeLogMessage.text.replace(/^[^\s]+'s\s*/, '');
        return (
          <div className={`bv-ability-banner ${isMine ? 'mine' : 'theirs'}`} key={activeLogMessage.text}>
            {triggerMon && <img src={getSpriteUrls(triggerMon.species.id).icon} alt="" className="bv-ability-icon" />}
            <div className="bv-ability-text">
              <span className="bv-ability-name">{triggerMon?.nickname || 'Pokémon'}'s</span>
              <span className="bv-ability-ability">{abilityDisplayName}</span>
            </div>
          </div>
        );
      })() : null}

      {/* ---------- Floating Action Text Pop-Up (Compact & Brief) ---------- */}
      {logText && activeLogMessage?.meta?.kind !== 'ability' && (
        <div className="bv-action-popup" key={logText}>
          <p>{logText}</p>
        </div>
      )}

      {/* ---------- Command Area (Bottom Right) ---------- */}
      {canChoose && currentActorPkmn && (
        <div className="bv-commands">
          {panel === 'MAIN' && (
            <div className="bv-main-panel">
              <div className="bv-cmd-top-row">
                {currentActorPkmn.species.megaForm && (
                  <button onClick={onToggleMega} className={`bv-mega-badge ${isMegaChecked ? 'on' : ''}`}>
                    <span className="bv-mega-icon">🧬</span>
                    <span>{isMegaChecked ? 'Mega Ready' : 'Mega Evolve'}</span>
                  </button>
                )}
                {selectedActorIndex > 0 && (
                  <button onClick={onUndoAction} className="bv-back-pill">
                    <ArrowLeft size={14} /> Back
                  </button>
                )}
              </div>
              <div className="bv-cmd-bar">
                <button className="bv-action-btn bv-act-fight" onClick={() => setPanel('FIGHT')}>
                  <div className="bv-act-icon-wrap">
                    <FightGlyph />
                  </div>
                  <div className="bv-act-label">
                    <span className="bv-act-title">FIGHT</span>
                    <span className="bv-act-sub">4 Moves</span>
                  </div>
                </button>
                <button className="bv-action-btn bv-act-poke" onClick={() => setPanel('POKEMON')}>
                  <div className="bv-act-icon-wrap">
                    <PokeballIcon size={34} />
                  </div>
                  <div className="bv-act-label">
                    <span className="bv-act-title">POKÉMON</span>
                    <span className="bv-act-sub">Switch</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {panel === 'FIGHT' && (
            <div className="bv-moves-panel">
              <div className="bv-moves-header">
                <span className="bv-moves-title">Choose Attack</span>
                <button className="bv-moves-close" onClick={() => setPanel('MAIN')}>
                  <ArrowLeft size={14} /> Back
                </button>
              </div>
              <div className="bv-moves-grid">
                {currentActorPkmn.moves
                  .filter((item, idx, arr) => arr.findIndex((x) => x.move.id === item.move.id) === idx)
                  .slice(0, 4)
                  .map(({ move, currentPp }) => {
                    const ppPct = Math.round((currentPp / move.maxPp) * 100);
                    const catIcon = move.category === 'Physical' ? '💥 PHYS' : move.category === 'Special' ? '🌀 SPEC' : '🛡️ STAT';
                    return (
                      <button
                        key={move.id}
                        className={`bv-move-card ${currentPp <= 0 ? 'no-pp' : ''}`}
                        disabled={currentPp <= 0}
                        onClick={() => onSelectMove(move)}
                        style={{ ['--tc' as string]: TYPE_COLORS[move.type] || '#888' }}
                      >
                        <div className="bv-move-card-top">
                          <TypeBadge type={move.type} size={22} />
                          <span className={`bv-cat-pill ${move.category.toLowerCase()}`}>{catIcon}</span>
                        </div>
                        <div className="bv-move-card-name">{move.name}</div>
                        <div className="bv-move-card-bottom">
                          <div className="bv-move-card-stats">
                            <span>PWR {move.power > 0 ? move.power : '—'}</span>
                            <span>ACC {move.accuracy > 0 ? `${move.accuracy}%` : '—'}</span>
                          </div>
                          <div className="bv-move-card-pp">
                            <b>{currentPp}</b>/{move.maxPp}
                          </div>
                        </div>
                        <div className="bv-move-pp-bar">
                          <div className="bv-move-pp-fill" style={{ width: `${ppPct}%` }} />
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- Switch / Summary Screen ---------- */}
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

      {/* ---------- Custom Target Selection Element (Clean 2D Mini-Sprites, Matching BG, No White Boxes) ---------- */}
      {targetModalMove && (
        <div className="bv-targets">
          <div className="bv-targets-header">
            <span className="bv-targets-title">Target: {targetModalMove.name}</span>
            <button className="bv-moves-close" onClick={onCancelTarget}><ArrowLeft size={14} /> Back</button>
          </div>
          {oppActiveIndices.map((idx, slot) => {
            const m = opponentTeamState[idx];
            if (!m || m.currentHp <= 0) return null;
            const pct = pctOf(m);
            const band = hpBand(pct);
            return (
              <button key={`t-${idx}`} className="bv-target" onClick={() => onTargetConfirm(slot)}>
                <div className="bv-target-sprite-wrap">
                  <img src={getSpriteUrls(m.species.id).icon} alt={m.nickname} />
                </div>
                <div className="bv-target-info">
                  <div className="bv-target-name">{m.nickname}</div>
                  <div className="bv-target-hp-row">
                    <div className="bv-target-hp-bar">
                      <div className={`bv-hp-fill ${band}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="bv-target-hp-pct">{pct}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
