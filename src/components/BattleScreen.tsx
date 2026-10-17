import { useState, useEffect, useRef } from 'react';
import type {
  ActivePokemonState,
  BattleAction,
  BattleFieldConditions,
  BattleFormat,
  CustomPokemon,
  Move
} from '../types/pokemon';
import { POKEMON_ROSTER } from '../data/pokemonRoster';
import { MOVES_DATABASE } from '../data/moves';
import { calculateAllStats } from '../engine/statCalc';
import { resolveTurnCore, checkEntranceAbilities, applyEntranceHazards } from '../engine/battleEngine';
import type { LogMeta, TurnSnapshot, MonSnapshot } from '../engine/battleEngine';
import { peerManager } from '../network/peerManager';
import type { NetworkMessage } from '../network/peerManager';
import { generateRandomCpuTeam } from '../utils/showdownParser';
import { sanitizePokemonMoves } from '../utils/sanitizePokemon';
import { BattleCalculator } from './BattleCalculator';

import { TeamPreview } from '../battle/TeamPreview';
import { MatchIntro } from '../battle/MatchIntro';
import { BattleView } from '../battle/BattleView';
import { ResultScreen } from '../battle/ResultScreen';


interface BattleScreenProps {
  format: BattleFormat;
  playerTeam: CustomPokemon[];
  isHost: boolean;
  roomId: string;
  onExit: () => void;
  onRematch: () => void;
  opponentTeam?: CustomPokemon[];
  opponentName?: string;
}

export const BattleScreen: React.FC<BattleScreenProps> = ({
  format,
  playerTeam,
  isHost,
  roomId,
  onExit,
  opponentName
}) => {
  // Convert custom team to initial active state with strict move sanitization (max 4, no duplicates)
  const initializeTeamState = (team: CustomPokemon[], prefix = '', activeCount = 2): ActivePokemonState[] => {
    return team.map((rawP, index) => {
      const p = sanitizePokemonMoves(rawP);
      const spec = POKEMON_ROSTER.find((s) => s.id === p.speciesId)!;
      const stats = calculateAllStats(p, spec);
      return {
        instanceId: prefix + p.id,
        species: spec,
        nickname: p.nickname || spec.name,
        level: p.level || 50,
        item: p.item,
        ability: p.ability,
        maxStats: stats,
        currentHp: stats.hp,
        originalEvs: p.evs,
        originalNature: p.nature,
        statStages: { attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 },
        moves: p.moves.slice(0, 4).map((mId) => {
          const moveObj = MOVES_DATABASE[mId] || MOVES_DATABASE['protect'];
          return {
            move: moveObj,
            currentPp: moveObj.maxPp || moveObj.pp
          };
        }),
        isFainted: false,
        turnsOnField: index < activeCount ? 1 : 0,
        activeSpriteUrl: spec.spriteUrl
      };
    });
  };

  const requiredPicks = format === 'Singles' ? 3 : 4;
  const [phase, setPhase] = useState<'PREVIEW' | 'INTRO' | 'BATTLE'>('PREVIEW');
  const [selectedPickIds, setSelectedPickIds] = useState<string[]>([]);


  const handleTogglePick = (id: string) => {
    if (selectedPickIds.includes(id)) {
      setSelectedPickIds(selectedPickIds.filter((pId) => pId !== id));
    } else {
      if (selectedPickIds.length < requiredPicks) {
        setSelectedPickIds([...selectedPickIds, id]);
      }
    }
  };

  const [myTeamState, setMyTeamState] = useState<ActivePokemonState[]>(() =>
    initializeTeamState(
      playerTeam.length > 0 ? playerTeam.slice(0, requiredPicks) : generateRandomCpuTeam().slice(0, requiredPicks),
      'my_',
      format === 'Singles' ? 1 : 2
    )
  );

  const [opponentTeamState, setOpponentTeamState] = useState<ActivePokemonState[]>(() =>
    initializeTeamState(
      generateRandomCpuTeam().slice(0, requiredPicks),
      'opp_',
      format === 'Singles' ? 1 : 2
    )
  );

  // Active slots indices: Singles uses 1 slot (0), Doubles uses 2 slots (0, 1)
  const [myActiveIndices, setMyActiveIndices] = useState<number[]>(
    format === 'Singles' ? [0] : [0, 1]
  );
  const [oppActiveIndices, setOppActiveIndices] = useState<number[]>(
    format === 'Singles' ? [0] : [0, 1]
  );
  const [fieldConditions, setFieldConditions] = useState<BattleFieldConditions>({});

  // Synchronization refs for multiplayer
  const logsHold = useRef<boolean>(false);
  const mySubmittedMonsRef = useRef<CustomPokemon[] | null>(null);
  const oppSubmittedMonsRef = useRef<CustomPokemon[] | null>(null);
  const hostPendingActionsRef = useRef<BattleAction[] | null>(null);
  const guestPendingActionsRef = useRef<BattleAction[] | null>(null);

  const myTeamStateRef = useRef(myTeamState);
  const opponentTeamStateRef = useRef(opponentTeamState);
  const fieldConditionsRef = useRef<BattleFieldConditions>({});
  const myActiveIndicesRef = useRef(myActiveIndices);
  const oppActiveIndicesRef = useRef(oppActiveIndices);


  useEffect(() => {
    myTeamStateRef.current = myTeamState;
    opponentTeamStateRef.current = opponentTeamState;
    fieldConditionsRef.current = fieldConditions;
    myActiveIndicesRef.current = myActiveIndices;
    oppActiveIndicesRef.current = oppActiveIndices;
  }, [myTeamState, opponentTeamState, fieldConditions, myActiveIndices, oppActiveIndices]);

  const [isWaitingForOpponentTeam, setIsWaitingForOpponentTeam] = useState<boolean>(false);
  const [isWaitingForOpponentTurn, setIsWaitingForOpponentTurn] = useState<boolean>(false);

  const startBattleWithTeams = (myMons: CustomPokemon[], oppMons: CustomPokemon[]) => {
    const myPrefix = 'my_';
    const oppPrefix = 'opp_';
    const myActive = format === 'Singles' ? [0] : [0, 1];
    const oppActive = format === 'Singles' ? [0] : [0, 1];
    const initMyTeam = initializeTeamState(myMons, myPrefix, myActive.length);
    const initOppTeam = initializeTeamState(oppMons, oppPrefix, oppActive.length);

    setMyTeamState(initMyTeam);
    setOpponentTeamState(initOppTeam);
    setMyActiveIndices(myActive);
    setOppActiveIndices(oppActive);
    setIsWaitingForOpponentTeam(false);

    // Reset battlefield conditions and hold logs during loading screen
    setFieldConditions({});
    fieldConditionsRef.current = {};
    logsHold.current = true;
    logQueue.current = [];
    setActiveLogMessage(null);

    // Transition to short loading screen
    setPhase('INTRO');
  };

  const handleLoadingComplete = () => {
    setPhase('BATTLE');
    triggerEntranceAbilities();
  };

  const triggerEntranceAbilities = () => {
    logsHold.current = true;
    logQueue.current = [];
    setActiveLogMessage(null);

    setFieldConditions({});
    fieldConditionsRef.current = {};

    let currentField: BattleFieldConditions = {};
    const myLeads = myActiveIndices.map((i) => myTeamStateRef.current[i]).filter(Boolean);
    const oppLeads = oppActiveIndices.map((i) => opponentTeamStateRef.current[i]).filter(Boolean);

    // Simulate entrance abilities with cloned leads so initial battlefield view starts clean
    const hostLeads = isHost ? myLeads : oppLeads;
    const guestLeads = isHost ? oppLeads : myLeads;
    const hostLeadsCloned = hostLeads.map((p) => ({ ...p, statStages: { ...p.statStages } }));
    const guestLeadsCloned = guestLeads.map((p) => ({ ...p, statStages: { ...p.statStages } }));

    hostLeadsCloned.forEach((m) => {
      currentField = checkEntranceAbilities(m, currentField, addLog, guestLeadsCloned, hostLeadsCloned);
    });
    guestLeadsCloned.forEach((m) => {
      currentField = checkEntranceAbilities(m, currentField, addLog, hostLeadsCloned, guestLeadsCloned);
    });

    const updatedMyLeads = isHost ? hostLeadsCloned : guestLeadsCloned;
    const updatedOppLeads = isHost ? guestLeadsCloned : hostLeadsCloned;

    setMyTeamState((prev) =>
      prev.map((p) => {
        const lead = updatedMyLeads.find((l) => l.instanceId === p.instanceId);
        return lead ? { ...p, statStages: { ...lead.statStages } } : p;
      })
    );
    setOpponentTeamState((prev) =>
      prev.map((p) => {
        const lead = updatedOppLeads.find((l) => l.instanceId === p.instanceId);
        return lead ? { ...p, statStages: { ...lead.statStages } } : p;
      })
    );
    setFieldConditions(currentField);
    fieldConditionsRef.current = currentField;

    addLog(`Battle started in ${format} format! Choose your moves.`);

    // Give 350ms for BattleView to mount cleanly before starting entrance animations & banners
    window.setTimeout(() => {
      logsHold.current = false;
      processLogQueue();
    }, 350);
  };

  const handleConfirmTeamSelection = (forcedPickIds?: string[]) => {
    const finalPicks = forcedPickIds || selectedPickIds;
    if (finalPicks.length < requiredPicks) return;

    if (forcedPickIds) setSelectedPickIds(forcedPickIds);

    const fullPlayerTeam = playerTeam.length > 0 ? playerTeam : generateRandomCpuTeam();
    const chosenPlayerMons = finalPicks
      .map((id) => fullPlayerTeam.find((p) => p.id === id))
      .filter(Boolean) as CustomPokemon[];

    mySubmittedMonsRef.current = chosenPlayerMons;

    if (roomId === 'LOCAL_SOLO') {
      const fullCpuTeam = generateRandomCpuTeam();
      const chosenCpuMons = fullCpuTeam.slice(0, requiredPicks);
      startBattleWithTeams(chosenPlayerMons, chosenCpuMons);
    } else {
      peerManager.sendMessage('TEAM_SUBMIT', { team: chosenPlayerMons });
      if (oppSubmittedMonsRef.current) {
        startBattleWithTeams(chosenPlayerMons, oppSubmittedMonsRef.current);
      } else {
        setIsWaitingForOpponentTeam(true);
      }
    }
  };

  interface FaintedSlotReplacement {
    activeSlotIndex: number;
    faintedMonName: string;
  }
  const [pendingReplacements, setPendingReplacements] = useState<FaintedSlotReplacement[]>([]);
  const [showBattleCalc, setShowBattleCalc] = useState<boolean>(false);

  // Selection state for current turn
  const [selectedActorIndex, setSelectedActorIndex] = useState<number>(0);
  const [pendingActions, setPendingActions] = useState<BattleAction[]>([]);
  const [targetModalMove, setTargetModalMove] = useState<Move | null>(null);
  const [battleLog, setBattleLog] = useState<{ text: string; meta?: LogMeta }[]>([
    { text: `Battle started in ${format} format! Choose your moves.` }
  ]);
  const [activeLogMessage, setActiveLogMessage] = useState<{ text: string; meta?: LogMeta } | null>(null);

  /**
   * Queue entry. `snap` + `asHost` replays the battlefield state captured when the log was emitted
   * (so HP drops / faints / switches play out one-by-one in speed order). `apply` runs a callback
   * when reached (used to commit the authoritative end-of-turn state after playback).
   */
  type QueuedLog = { text?: string; meta?: LogMeta; snap?: TurnSnapshot; asHost?: boolean; apply?: () => void };
  const logQueue = useRef<QueuedLog[]>([]);
  const isPlayingLogs = useRef<boolean>(false);

  const mergeSnapshot = (team: ActivePokemonState[], snaps: MonSnapshot[]) =>
    team.map((p, i) => (snaps[i] ? { ...p, ...snaps[i] } : p));

  const applySnapshot = (snap: TurnSnapshot, asHost: boolean) => {
    const mine = asHost ? snap.host : snap.guest;
    const theirs = asHost ? snap.guest : snap.host;
    setMyTeamState((prev) => mergeSnapshot(prev, mine));
    setOpponentTeamState((prev) => mergeSnapshot(prev, theirs));
    setMyActiveIndices([...(asHost ? snap.hostActive : snap.guestActive)]);
    setOppActiveIndices([...(asHost ? snap.guestActive : snap.hostActive)]);
  };

  const processLogQueue = async () => {
    if (isPlayingLogs.current || logsHold.current || logQueue.current.length === 0) return;
    isPlayingLogs.current = true;
    while (logQueue.current.length > 0) {
      if (logsHold.current) break;
      const nextLog = logQueue.current.shift();
      if (!nextLog) continue;

      if (nextLog.apply) nextLog.apply();
      if (nextLog.text === undefined) continue; // pure state-commit entry, no delay

      // Replay battlefield state at this exact moment of the turn
      if (nextLog.snap) applySnapshot(nextLog.snap, nextLog.asHost ?? true);

      // Dynamically apply field conditions (Weather & Terrain)
      if (nextLog.meta?.field) {
        setFieldConditions(nextLog.meta.field);
        fieldConditionsRef.current = nextLog.meta.field;
      }

      const entry = { text: nextLog.text, meta: nextLog.meta };
      setActiveLogMessage(entry);
      setBattleLog((prev) => [...prev, entry]);
      // Faints linger a bit longer so the player can watch the KO; others 1.25s so animations are visible
      const isFaint = nextLog.meta?.kind === 'faint' || / fainted!/.test(nextLog.text);
      await new Promise((r) => setTimeout(r, isFaint ? 1700 : 1250));
    }
    setActiveLogMessage(null);
    isPlayingLogs.current = false;
  };

  const enqueue = (entry: QueuedLog) => {
    logQueue.current.push(entry);
    if (!logsHold.current) {
      processLogQueue();
    }
  };

  const addLog = (text: string, meta?: LogMeta) => enqueue({ text, meta });

  const [isTurnProcessing, setIsTurnProcessing] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);




  const [isMegaChecked, setIsMegaChecked] = useState<boolean>(false);
  const [turn, setTurn] = useState<number>(0);



  const handleSelectMove = (move: Move) => {
    // If doubles and move targets single enemy, open target picker modal
    if (format === 'Doubles' && move.target === 'SingleEnemy') {
      setTargetModalMove(move);
      return;
    }

    // Default target: first opponent active slot
    submitAction({
      playerId: isHost ? 'host' : 'guest',
      actorIndex: selectedActorIndex,
      type: 'MOVE',
      moveId: move.id,
      targetSlot: 0,
      megaEvolve: isMegaChecked
    });
    setIsMegaChecked(false);
  };

  const handleTargetConfirm = (targetSlot: number) => {
    if (!targetModalMove) return;
    submitAction({
      playerId: isHost ? 'host' : 'guest',
      actorIndex: selectedActorIndex,
      type: 'MOVE',
      moveId: targetModalMove.id,
      targetSlot,
      megaEvolve: isMegaChecked
    });
    setTargetModalMove(null);
    setIsMegaChecked(false);
  };

  const alivePlayerActiveIndices = myActiveIndices.filter((idx) => {
    const p = myTeamState[idx];
    return p && !p.isFainted && p.currentHp > 0;
  });
  const aliveOppActiveIndices = oppActiveIndices.filter((idx) => {
    const p = opponentTeamState[idx];
    return p && !p.isFainted && p.currentHp > 0;
  });




  const handleSelectSwitch = (teamIndex: number) => {
    submitAction({
      playerId: isHost ? 'host' : 'guest',
      actorIndex: selectedActorIndex,
      type: 'SWITCH',
      switchToTeamIndex: teamIndex
    });
  };

  const submitAction = (action: BattleAction) => {
    finalizeActions([...pendingActions, action]);
  };

  /** Move timer expired: auto-pick a random usable move for every undecided Pokémon. */
  const handleTimeout = () => {
    setTargetModalMove(null);
    const filled = [...pendingActions];
    for (let slot = filled.length; slot < alivePlayerActiveIndices.length; slot++) {
      const mon = myTeamState[myActiveIndices[slot]];
      if (!mon) continue;
      const usable = mon.moves.filter((m) => m.currentPp > 0);
      const pick = (usable.length > 0 ? usable : mon.moves)[Math.floor(Math.random() * (usable.length > 0 ? usable.length : mon.moves.length))];
      const targetSlot = aliveOppActiveIndices.length > 0
        ? Math.max(0, oppActiveIndices.indexOf(aliveOppActiveIndices[Math.floor(Math.random() * aliveOppActiveIndices.length)]))
        : 0;
      filled.push({
        playerId: isHost ? 'host' : 'guest',
        actorIndex: slot,
        type: 'MOVE',
        moveId: pick.move.id,
        targetSlot,
      });
    }
    setIsMegaChecked(false);
    finalizeActions(filled);
  };

  const finalizeActions = (updated: BattleAction[]) => {
    setPendingActions(updated);

    // Check if all active living slots have actions selected
    if (updated.length >= alivePlayerActiveIndices.length) {
      if (roomId === 'LOCAL_SOLO') {
        // AI Solo turn generation for living active Pokemon
        const aiActions: BattleAction[] = aliveOppActiveIndices.map((oppIdx) => {
          const oppPkmn = opponentTeamState[oppIdx];
          const availableMoves = oppPkmn.moves.filter((m) => m.currentPp > 0);
          const chosenMove = availableMoves.length > 0
            ? availableMoves[Math.floor(Math.random() * availableMoves.length)]
            : oppPkmn.moves[0];
            
          const randomTargetTeamIdx = alivePlayerActiveIndices[Math.floor(Math.random() * alivePlayerActiveIndices.length)] ?? myActiveIndices[0];
          const targetSlot = myActiveIndices.indexOf(randomTargetTeamIdx);

          return {
            playerId: 'cpu',
            actorIndex: oppActiveIndices.indexOf(oppIdx),
            type: 'MOVE',
            moveId: chosenMove.move.id,
            targetSlot: Math.max(0, targetSlot)
          };
        });

        resolveSoloTurn(updated, aiActions);
      } else {
        // Multiplayer turn submission
        setIsWaitingForOpponentTurn(true);
        if (!isHost) {
          // Guest: send to Host
          peerManager.sendMessage('TURN_ACTION', { actions: updated });
          addLog('Submitted turn choices! Waiting for host to resolve...');
        } else {
          // Host: store Host actions
          hostPendingActionsRef.current = updated;
          if (guestPendingActionsRef.current) {
            executeAuthoritativeTurn(updated, guestPendingActionsRef.current);
          } else {
            addLog('Submitted turn choices! Waiting for opponent...');
          }
        }
      }
    } else {
      setSelectedActorIndex((prev) => prev + 1);
    }
  };


  const handleUndoAction = () => {
    if (pendingActions.length > 0 || selectedActorIndex > 0) {
      setPendingActions((prev) => prev.slice(0, -1));
      setSelectedActorIndex((prev) => Math.max(0, prev - 1));
      addLog('Undid previous action selection.');
    }
  };



  const [totalDamageDealt, setTotalDamageDealt] = useState<number>(0);

  const executeAuthoritativeTurn = (hostActs: BattleAction[], guestActs: BattleAction[]) => {
    setTurn((t) => t + 1);
    setIsTurnProcessing(true);
    const turnResult = resolveTurnCore(
      hostActs,
      guestActs,
      myTeamStateRef.current,
      opponentTeamStateRef.current,
      fieldConditionsRef.current,
      [...myActiveIndicesRef.current],
      [...oppActiveIndicesRef.current],
      format
    );

    // Track damage dealt to opponent
    const prevOppHp = opponentTeamStateRef.current.reduce((sum, p) => sum + p.currentHp, 0);
    const nextOppHp = turnResult.nextGuestTeam.reduce((sum, p) => sum + p.currentHp, 0);
    setTotalDamageDealt((prev) => prev + Math.max(0, prevOppHp - nextOppHp));

    // Send Authoritative GAME_STATE_UPDATE to Guest
    peerManager.sendMessage('GAME_STATE_UPDATE', {
      hostTeam: turnResult.nextHostTeam,
      guestTeam: turnResult.nextGuestTeam,
      fieldConditions: turnResult.activeField,
      logs: turnResult.turnLogs,
      winner: turnResult.winner,
      hostActiveIndices: turnResult.nextHostActive,
      guestActiveIndices: turnResult.nextGuestActive
    });

    hostPendingActionsRef.current = null;
    guestPendingActionsRef.current = null;

    // Replay the turn step-by-step, then commit the authoritative state
    turnResult.turnLogs.forEach((l) => enqueue({ text: l.text, meta: l.meta, snap: l.snap, asHost: true }));
    enqueue({
      apply: () => {
        setMyTeamState(turnResult.nextHostTeam);
        setOpponentTeamState(turnResult.nextGuestTeam);
        setFieldConditions(turnResult.activeField);
        fieldConditionsRef.current = turnResult.activeField;
        setMyActiveIndices(turnResult.nextHostActive);
        setOppActiveIndices(turnResult.nextGuestActive);
        if (turnResult.winner) setWinner(turnResult.winner);
        setPendingActions([]);
        setSelectedActorIndex(0);
        setIsWaitingForOpponentTurn(false);
        setIsTurnProcessing(false);
      }
    });
  };

  const handleIncomingGameStateUpdate = (payload: any) => {
    setTurn((t) => t + 1);
    setIsTurnProcessing(true);

    // Track damage dealt to opponent (host in this case)
    const prevOppHp = opponentTeamStateRef.current.reduce((sum, p) => sum + p.currentHp, 0);
    const nextOppHp = payload.hostTeam.reduce((sum: number, p: any) => sum + p.currentHp, 0);
    setTotalDamageDealt((prev) => prev + Math.max(0, prevOppHp - nextOppHp));

    if (payload.logs && Array.isArray(payload.logs)) {
      payload.logs.forEach((l: any) => {
        if (typeof l === 'string') enqueue({ text: l });
        else enqueue({ text: l.text, meta: l.meta, snap: l.snap, asHost: false });
      });
    }

    enqueue({
      apply: () => {
        setMyTeamState(payload.guestTeam);
        setOpponentTeamState(payload.hostTeam);
        setFieldConditions(payload.fieldConditions);
        fieldConditionsRef.current = payload.fieldConditions;
        setMyActiveIndices(payload.guestActiveIndices);
        setOppActiveIndices(payload.hostActiveIndices);
        if (payload.winner) {
          if (payload.winner === 'Player') setWinner('Opponent');
          else if (payload.winner === 'Opponent') setWinner('Player');
          else setWinner(payload.winner);
        }
        setPendingActions([]);
        setSelectedActorIndex(0);
        setIsWaitingForOpponentTurn(false);
        setIsTurnProcessing(false);
      }
    });
  };

  useEffect(() => {
    if (roomId === 'LOCAL_SOLO') return;

    const handleMsg = (msg: NetworkMessage) => {
      if (msg.type === 'TEAM_SUBMIT') {
        const oppMons: CustomPokemon[] = msg.payload.team;
        oppSubmittedMonsRef.current = oppMons;
        if (mySubmittedMonsRef.current) {
          startBattleWithTeams(mySubmittedMonsRef.current, oppMons);
        }
      } else if (msg.type === 'TURN_ACTION') {
        if (isHost) {
          guestPendingActionsRef.current = msg.payload.actions;
          if (hostPendingActionsRef.current) {
            executeAuthoritativeTurn(hostPendingActionsRef.current, msg.payload.actions);
          } else {
            addLog('⚡ Opponent has locked in their moves!');
          }
        }
      } else if (msg.type === 'GAME_STATE_UPDATE') {
        handleIncomingGameStateUpdate(msg.payload);
      } else if (msg.type === 'FORFEIT') {
        addLog('Opponent forfeited the match!');
        setWinner('Player');
      }
    };

    peerManager.setMessageCallback(handleMsg);

    return () => {
      peerManager.setMessageCallback(undefined);
    };
  }, [roomId, isHost]);

  const resolveSoloTurn = (myActs: BattleAction[], aiActs: BattleAction[]) => {
    setTurn((t) => t + 1);
    setIsTurnProcessing(true);
    const turnResult = resolveTurnCore(
      myActs,
      aiActs,
      myTeamStateRef.current,
      opponentTeamStateRef.current,
      fieldConditionsRef.current,
      [...myActiveIndicesRef.current],
      [...oppActiveIndicesRef.current],
      format
    );

    // Track damage dealt to opponent
    const prevOppHp = opponentTeamStateRef.current.reduce((sum, p) => sum + p.currentHp, 0);
    const nextOppHp = turnResult.nextGuestTeam.reduce((sum, p) => sum + p.currentHp, 0);
    setTotalDamageDealt((prev) => prev + Math.max(0, prevOppHp - nextOppHp));

    // Replay the turn step-by-step, then commit the final state
    turnResult.turnLogs.forEach((l) => enqueue({ text: l.text, meta: l.meta, snap: l.snap, asHost: true }));
    enqueue({
      apply: () => {
        setMyTeamState(turnResult.nextHostTeam);
        setOpponentTeamState(turnResult.nextGuestTeam);
        setFieldConditions(turnResult.activeField);
        fieldConditionsRef.current = turnResult.activeField;
        setMyActiveIndices(turnResult.nextHostActive);
        setOppActiveIndices(turnResult.nextGuestActive);
        if (turnResult.winner) setWinner(turnResult.winner);
        setPendingActions([]);
        setSelectedActorIndex(0);
        setIsWaitingForOpponentTurn(false);
        setIsTurnProcessing(false);
      }
    });
  };

  const handleChooseReplacement = (benchTeamIndex: number) => {
    if (pendingReplacements.length === 0) return;
    const currentFainted = pendingReplacements[0];
    const slotNum = currentFainted.activeSlotIndex;

    const nextActive = [...myActiveIndices];
    nextActive[slotNum] = benchTeamIndex;
    setMyActiveIndices(nextActive);

    const originalMon = myTeamState[benchTeamIndex];
    if (originalMon) {
      const sentMon = { ...originalMon, turnsOnField: 1 };
      addLog(`✨ Go, ${sentMon.nickname}!`);
      const oppFoes = oppActiveIndices.map(i => opponentTeamState[i]).filter(f => f && !f.isFainted && f.currentHp > 0);
      setFieldConditions((prev) => {
        let currentField = applyEntranceHazards(sentMon, prev, true, addLog);
        if (!sentMon.isFainted && sentMon.currentHp > 0) {
          const allies = nextActive.map(i => (i === benchTeamIndex ? sentMon : myTeamState[i])).filter(a => a && !a.isFainted && a.currentHp > 0);
          currentField = checkEntranceAbilities(sentMon, currentField, addLog, oppFoes, allies);
        }
        return currentField;
      });
      setMyTeamState((prev) => prev.map((p, i) => (i === benchTeamIndex ? sentMon : p)));
    }

    const remaining = pendingReplacements.slice(1);
    setPendingReplacements(remaining);

    if (remaining.length === 0) {
      setPendingActions([]);
      setSelectedActorIndex(0);
      setIsTurnProcessing(false);
      addLog('Both sides ready! Choose your moves.');
    }
  };



  
  if (phase === 'PREVIEW') {
    const fullTeam = playerTeam.length > 0 ? playerTeam : generateRandomCpuTeam();
    return (
      <TeamPreview
        format={format}
        playerTeam={fullTeam}
        requiredPicks={requiredPicks}
        selectedPickIds={selectedPickIds}
        isWaitingForOpponentTeam={isWaitingForOpponentTeam}
        onTogglePick={handleTogglePick}
        onConfirm={handleConfirmTeamSelection}
        onExit={onExit}
      />
    );
  }

  if (phase === 'INTRO') {
    const myLeads = myActiveIndices.map(i => myTeamState[i]).filter(Boolean);
    const oppLeads = oppActiveIndices.map(i => opponentTeamState[i]).filter(Boolean);
    return (
      <MatchIntro
        myLeads={myLeads}
        oppLeads={oppLeads}
        opponentName={opponentName}
        format={format}
        onComplete={handleLoadingComplete}
      />
    );
  }

  const handleConcede = () => {
    addLog('You forfeited the match.');
    if (roomId !== 'LOCAL_SOLO') {
      peerManager.sendMessage('FORFEIT', {});
    }
    setWinner('Opponent');
  };

  const handleRematch = () => {
    setWinner(null);
    setTurn(0);
    setTotalDamageDealt(0);
    setPendingActions([]);
    setSelectedActorIndex(0);
    setBattleLog([{ text: `Battle started in ${format} format! Choose your moves.` }]);
    if (roomId === 'LOCAL_SOLO') {
      setSelectedPickIds([]);
      setPhase('PREVIEW');
    } else {
      onExit();
    }
  };

  if (winner) {
    const stats = {
      turns: Math.max(1, turn),
      playerFainted: myTeamState.filter((p) => p.isFainted || p.currentHp <= 0).length,
      opponentFainted: opponentTeamState.filter((p) => p.isFainted || p.currentHp <= 0).length,
      totalDamageDealt,
    };
    return (
      <ResultScreen
        winner={winner}
        stats={stats}
        isMultiplayer={roomId !== 'LOCAL_SOLO'}
        onRematch={handleRematch}
        onExit={onExit}
      />
    );
  }

  return (
    <>
      <BattleView
        format={format}
        roomId={roomId}
        isHost={isHost}
        opponentName={opponentName}
        turn={turn}
        onTimeout={handleTimeout}
        myTeamState={myTeamState}
        opponentTeamState={opponentTeamState}
        myActiveIndices={myActiveIndices}
        oppActiveIndices={oppActiveIndices}
        fieldConditions={fieldConditions}
        battleLog={battleLog}
        activeLogMessage={activeLogMessage}
        selectedActorIndex={selectedActorIndex}
        pendingActions={pendingActions}
        targetModalMove={targetModalMove}
        isTurnProcessing={isTurnProcessing}
        isWaitingForOpponentTurn={isWaitingForOpponentTurn}
        winner={winner}
        onSelectMove={handleSelectMove}
        onSelectSwitch={handleSelectSwitch}
        onTargetConfirm={handleTargetConfirm}
        onUndoAction={handleUndoAction}
        onToggleMega={() => setIsMegaChecked(!isMegaChecked)}
        isMegaChecked={isMegaChecked}
        onExit={onExit}
        onConcede={handleConcede}
        onShowCalc={() => setShowBattleCalc(true)}
        onCancelTarget={() => setTargetModalMove(null)}
      />

      {pendingReplacements.length > 0 && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="bg-slate-900 border border-indigo-500/60 p-6 rounded-3xl max-w-xl w-full text-center space-y-4 shadow-2xl">
            <div className="text-center pb-3 border-b border-white/10">
              <h3 className="font-extrabold text-xl text-white flex items-center justify-center gap-2">
                ⚠️ Send Out Replacement
              </h3>
              <p className="text-sm text-slate-300 mt-1">
                <strong className="text-rose-400">{pendingReplacements[0].faintedMonName}</strong> fainted! Choose a bench Pokémon:
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {myTeamState.map((pkmn, benchIdx) => {
                const isCurrentlyActive = myActiveIndices.includes(benchIdx);
                const isFainted = pkmn.isFainted || pkmn.currentHp <= 0;
                if (isCurrentlyActive || isFainted) return null;
                const hpPct = Math.round((pkmn.currentHp / pkmn.maxStats.hp) * 100);
                return (
                  <button
                    key={pkmn.instanceId}
                    onClick={() => handleChooseReplacement(benchIdx)}
                    className="p-3 rounded-2xl border border-white/10 bg-slate-800 hover:bg-indigo-900/80 hover:border-indigo-400 flex items-center gap-3 transition-all text-left group"
                  >
                    <img
                      src={pkmn.activeSpriteUrl || pkmn.species.spriteUrl}
                      alt={pkmn.nickname}
                      className="w-16 h-16 object-contain group-hover:scale-110 transition-transform"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white truncate">{pkmn.nickname}</div>
                      <div className="text-xs text-slate-400">Lv. {pkmn.level}</div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-1.5 border border-slate-700">
                        <div
                          className={`h-full ${hpPct < 15 ? 'bg-rose-500' : hpPct < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {pkmn.currentHp} / {pkmn.maxStats.hp} HP
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showBattleCalc && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] animate-in fade-in slide-in-from-bottom-8">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] overflow-y-auto p-4 shadow-2xl relative">
            <button
              className="absolute top-4 right-4 text-xs px-4 py-2 rounded-full bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 hover:text-white transition-colors flex items-center gap-2 font-bold z-10"
              onClick={() => setShowBattleCalc(false)}
            >
              ✕ Close Calculator
            </button>
            <BattleCalculator
              playerTeam={myTeamState.map(p => ({
                id: p.instanceId,
                speciesId: p.species.id,
                nickname: p.nickname,
                level: p.level,
                item: p.item,
                ability: p.ability,
                nature: 'Adamant',
                evs: { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
                moves: p.moves.map(m => m.move.id)
              }))}
              onBack={() => setShowBattleCalc(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};