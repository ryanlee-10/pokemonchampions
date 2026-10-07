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
import { calculateDamage, isGrounded } from '../engine/damageCalc';
import { resolveTurnCore } from '../engine/battleEngine';
import { peerManager } from '../network/peerManager';
import type { NetworkMessage } from '../network/peerManager';
import { generateRandomCpuTeam } from '../utils/showdownParser';
import { X } from 'lucide-react';
import { BattleCalculator } from './BattleCalculator';
import { useAppStore, animSpeedFactor } from '../app/store';
import type { BattleEvent, BattleSnap, ChatMessage, LogEntry, LogKind, LogMeta, MatchStats, StageStat } from '../battle/types';
import { STAT_ORDER } from '../battle/types';
import { TeamPreview } from '../battle/TeamPreview';
import { MatchIntro } from '../battle/MatchIntro';
import { BattleView } from '../battle/BattleView';
import { ResultScreen } from '../battle/ResultScreen';

const PROTECT_MOVES = ['protect', 'detect', 'spiky_shield', 'baneful_bunker', 'king_s_shield', 'silk_trap', 'burning_bulwark'];
const INTIMIDATE_IMMUNE = ['Inner Focus', 'Own Tempo', 'Oblivious', 'Scrappy', 'Clear Body', 'White Smoke', 'Hyper Cutter', 'Full Metal Body', 'Guard Dog'];

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
  onRematch,
  opponentTeam,
  opponentName
}) => {
  const profileName = useAppStore((s) => s.profile.name);
  // Convert custom team to initial active state
  const initializeTeamState = (team: CustomPokemon[], prefix = ''): ActivePokemonState[] => {
    return team.map((p) => {
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
        moves: p.moves.map((mId) => {
          const moveObj = MOVES_DATABASE[mId] || MOVES_DATABASE['protect'];
          return {
            move: moveObj,
            currentPp: moveObj.maxPp || moveObj.pp
          };
        }),
        isFainted: false,
        turnsOnField: 1,
        activeSpriteUrl: spec.spriteUrl
      };
    });
  };

  const requiredPicks = format === 'Singles' ? 3 : 4;
  const [phase, setPhase] = useState<'PREVIEW' | 'INTRO' | 'BATTLE'>('PREVIEW');
  const [selectedPickIds, setSelectedPickIds] = useState<string[]>([]);
  const [cpuFullTeam] = useState<CustomPokemon[]>(() => generateRandomCpuTeam());
  const previewOppTeam: CustomPokemon[] = roomId === 'LOCAL_SOLO' ? cpuFullTeam : (opponentTeam ?? []);

  const handleTogglePick = (id: string) => {
    if (selectedPickIds.includes(id)) {
      setSelectedPickIds(selectedPickIds.filter((pId) => pId !== id));
    } else {
      if (selectedPickIds.length < requiredPicks) {
        setSelectedPickIds([...selectedPickIds, id]);
      }
    }
  };

  type Logger = (msg: string, meta?: LogMeta) => void;

  const checkEntranceAbilities = (
    enteringMon: ActivePokemonState,
    currentFields: BattleFieldConditions,
    logger?: Logger,
    foes?: ActivePokemonState[]
  ): BattleFieldConditions => {
    const updated = { ...currentFields };
    const logFn: Logger = logger || addLog;
    const ab = enteringMon.ability;
    const announce = () =>
      logFn(`${enteringMon.nickname}'s ${ab}`, { kind: 'ability', id: enteringMon.instanceId, field: { ...updated } });
    const effect = (text: string) => logFn(text, { kind: 'field', field: { ...updated } });
    if (ab === 'Grassy Surge') {
      updated.terrain = 'Grassy';
      updated.terrainTurns = 5;
      announce();
      effect('Grass grew to cover the battlefield!');
    } else if (ab === 'Psychic Surge') {
      updated.terrain = 'Psychic';
      updated.terrainTurns = 5;
      announce();
      effect('The battlefield got weird!');
    } else if (ab === 'Electric Surge' || ab === 'Hadron Engine') {
      updated.terrain = 'Electric';
      updated.terrainTurns = 5;
      announce();
      effect('An electric current ran across the battlefield!');
    } else if (ab === 'Misty Surge') {
      updated.terrain = 'Misty';
      updated.terrainTurns = 5;
      announce();
      effect('Mist swirled about the battlefield!');
    } else if (ab === 'Drought') {
      updated.weather = 'Sun';
      updated.weatherTurns = 5;
      announce();
      effect('The sunlight turned harsh!');
    } else if (ab === 'Drizzle') {
      updated.weather = 'Rain';
      updated.weatherTurns = 5;
      announce();
      effect('It started to rain!');
    } else if (ab === 'Sand Stream') {
      updated.weather = 'Sandstorm';
      updated.weatherTurns = 5;
      announce();
      effect('A sandstorm kicked up!');
    } else if (ab === 'Snow Warning') {
      updated.weather = 'Snow';
      updated.weatherTurns = 5;
      announce();
      effect('It started to snow!');
    } else if (ab === 'Intimidate') {
      announce();
      (foes || [])
        .filter((f) => f && !f.isFainted && f.currentHp > 0)
        .forEach((foe) => {
          if (INTIMIDATE_IMMUNE.includes(foe.ability)) {
            logFn(`${foe.nickname}'s ${foe.ability} prevents Attack loss!`, { kind: 'ability', id: foe.instanceId });
            return;
          }
          const cur = foe.statStages.attack || 0;
          if (cur <= -6) {
            logFn(`${foe.nickname}'s Attack won't go any lower!`, { kind: 'stat', id: foe.instanceId });
            return;
          }
          foe.statStages.attack = cur - 1;
          logFn(`${foe.nickname}'s Attack dropped by 1 stage!`, { kind: 'stat', id: foe.instanceId, dir: 'down', stat: 'attack' });
          if (foe.ability === 'Defiant') {
            foe.statStages.attack = Math.min(6, foe.statStages.attack + 2);
            logFn(`${foe.nickname}'s Defiant sharply raised its Attack!`, { kind: 'stat', id: foe.instanceId, dir: 'up', stat: 'attack' });
          } else if (foe.ability === 'Competitive') {
            foe.statStages.spAtk = Math.min(6, (foe.statStages.spAtk || 0) + 2);
            logFn(`${foe.nickname}'s Competitive sharply raised its Sp. Atk!`, { kind: 'stat', id: foe.instanceId, dir: 'up', stat: 'spAtk' });
          }
        });
    }
    return updated;
  };

  const [myTeamState, setMyTeamState] = useState<ActivePokemonState[]>(() =>
    initializeTeamState(playerTeam.length > 0 ? playerTeam.slice(0, requiredPicks) : generateRandomCpuTeam().slice(0, requiredPicks))
  );

  const [opponentTeamState, setOpponentTeamState] = useState<ActivePokemonState[]>(() =>
    initializeTeamState(generateRandomCpuTeam().slice(0, requiredPicks))
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
    const [myPrefix, oppPrefix] = isHost ? ['A_', 'B_'] : ['B_', 'A_'];
    const initMyTeam = initializeTeamState(myMons, myPrefix);
    const initOppTeam = initializeTeamState(oppMons, oppPrefix);
    const myActive = format === 'Singles' ? [0] : [0, 1];
    const oppActive = format === 'Singles' ? [0] : [0, 1];

    setMyTeamState(initMyTeam);
    setOpponentTeamState(initOppTeam);
    setMyActiveIndices(myActive);
    setOppActiveIndices(oppActive);
    setIsWaitingForOpponentTeam(false);
    setPhase('INTRO');

    // Entrance abilities are announced after the match-intro screen finishes
    logsHold.current = true;
    let initField: BattleFieldConditions = {};
    const myLeads = myActive.map((i) => initMyTeam[i]).filter(Boolean);
    const oppLeads = oppActive.map((i) => initOppTeam[i]).filter(Boolean);
    const hostLeads = isHost ? myLeads : oppLeads;
    const guestLeads = isHost ? oppLeads : myLeads;
    hostLeads.forEach((m) => {
      initField = checkEntranceAbilities(m, initField, undefined, guestLeads);
    });
    guestLeads.forEach((m) => {
      initField = checkEntranceAbilities(m, initField, undefined, hostLeads);
    });
    setFieldConditions(initField);
    fieldConditionsRef.current = initField;

    window.setTimeout(() => {
      setPhase('BATTLE');
      logsHold.current = false;
      processLogQueue();
    }, 3400);
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
  const [battleLog, setBattleLog] = useState<string[]>([
    `Battle started in ${format} format! Choose your moves.`
  ]);
  const [activeLogMessage, setActiveLogMessage] = useState<string | null>(null);
  const logQueue = useRef<string[]>([]);
  const isPlayingLogs = useRef<boolean>(false);

  const processLogQueue = async () => {
    if (isPlayingLogs.current || logQueue.current.length === 0) return;
    isPlayingLogs.current = true;
    while (logQueue.current.length > 0) {
      const nextLog = logQueue.current.shift();
      if (nextLog) {
        setActiveLogMessage(nextLog);
        setBattleLog(prev => [...prev, nextLog]);
        await new Promise(r => setTimeout(r, 750)); // Show each log for 0.75 seconds
      }
    }
    setActiveLogMessage(null);
    isPlayingLogs.current = false;
  };

  const addLog = (text: string) => {
    logQueue.current.push(text);
    processLogQueue();
  };

  const [isTurnProcessing, setIsTurnProcessing] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);




  const [isMegaChecked, setIsMegaChecked] = useState<boolean>(false);

  const getMatchingMegaForm = (pkmn?: ActivePokemonState) => {
    if (!pkmn || pkmn.isMegaEvolved || !pkmn.species.megaForm) return null;
    const megaForms = Array.isArray(pkmn.species.megaForm) ? pkmn.species.megaForm : [pkmn.species.megaForm];
    return megaForms.find((mf) => mf.megaStoneId === pkmn.item) || null;
  };

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

  const currentActorSlotIdx = alivePlayerActiveIndices[selectedActorIndex] ?? alivePlayerActiveIndices[0];
  const currentActorPkmn = myTeamState[currentActorSlotIdx];

  const handleSelectSwitch = (teamIndex: number) => {
    submitAction({
      playerId: isHost ? 'host' : 'guest',
      actorIndex: selectedActorIndex,
      type: 'SWITCH',
      switchToTeamIndex: teamIndex
    });
  };

  const submitAction = (action: BattleAction) => {
    const updated = [...pendingActions, action];
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



  const executeAuthoritativeTurn = (hostActs: BattleAction[], guestActs: BattleAction[]) => {
    setIsTurnProcessing(true);
    const turnResult = resolveTurnCore(
      hostActs,
      guestActs,
      myTeamStateRef.current,
      opponentTeamStateRef.current,
      fieldConditionsRef.current,
      myActiveIndicesRef.current,
      oppActiveIndicesRef.current
    );

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

    // Update Host state
    setMyTeamState(turnResult.nextHostTeam);
    setOpponentTeamState(turnResult.nextGuestTeam);
    setFieldConditions(turnResult.activeField);
    setMyActiveIndices(turnResult.nextHostActive);
    setOppActiveIndices(turnResult.nextGuestActive);
    if (turnResult.winner) setWinner(turnResult.winner);
    turnResult.turnLogs.forEach(addLog);

    hostPendingActionsRef.current = null;
    guestPendingActionsRef.current = null;
    setPendingActions([]);
    setSelectedActorIndex(0);
    setIsWaitingForOpponentTurn(false);
    setIsTurnProcessing(false);
  };

  const handleIncomingGameStateUpdate = (payload: any) => {
    setMyTeamState(payload.guestTeam);
    setOpponentTeamState(payload.hostTeam);
    setFieldConditions(payload.fieldConditions);
    setMyActiveIndices(payload.guestActiveIndices);
    setOppActiveIndices(payload.hostActiveIndices);
    if (payload.winner) {
      if (payload.winner === 'Player') setWinner('Opponent');
      else if (payload.winner === 'Opponent') setWinner('Player');
      else setWinner(payload.winner);
    }
    if (payload.logs && Array.isArray(payload.logs)) {
      payload.logs.forEach(addLog);
    }

    setPendingActions([]);
    setSelectedActorIndex(0);
    setIsWaitingForOpponentTurn(false);
    setIsTurnProcessing(false);
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
      }
    };

    peerManager.setMessageCallback(handleMsg);

    return () => {
      peerManager.setMessageCallback(undefined);
    };
  }, [roomId, isHost]);

  const resolveSoloTurn = (myActs: BattleAction[], aiActs: BattleAction[]) => {
    setIsTurnProcessing(true);
    const turnResult = resolveTurnCore(
      myActs,
      aiActs,
      myTeamStateRef.current,
      opponentTeamStateRef.current,
      fieldConditionsRef.current,
      myActiveIndicesRef.current,
      oppActiveIndicesRef.current
    );

    setMyTeamState(turnResult.nextHostTeam);
    setOpponentTeamState(turnResult.nextGuestTeam);
    setFieldConditions(turnResult.activeField);
    setMyActiveIndices(turnResult.nextHostActive);
    setOppActiveIndices(turnResult.nextGuestActive);
    if (turnResult.winner) setWinner(turnResult.winner);
    turnResult.turnLogs.forEach(addLog);

    setPendingActions([]);
    setSelectedActorIndex(0);
    setIsWaitingForOpponentTurn(false);
    setIsTurnProcessing(false);
  };

  const handleChooseReplacement = (benchTeamIndex: number) => {
    if (pendingReplacements.length === 0) return;
    const currentFainted = pendingReplacements[0];
    const slotNum = currentFainted.activeSlotIndex;

    const nextActive = [...myActiveIndices];
    nextActive[slotNum] = benchTeamIndex;
    setMyActiveIndices(nextActive);

    const sentMon = myTeamState[benchTeamIndex];
    if (sentMon) {
      setMyTeamState((prev) => prev.map((p, i) => (i === benchTeamIndex ? { ...p, turnsOnField: 1 } : p)));
      addLog(`✨ Go, ${sentMon.nickname}!`);
      setFieldConditions((prev) => checkEntranceAbilities(sentMon, prev));
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
        isHost={isHost}
        opponentName={opponentName}
        format={format}
      />
    );
  }

  if (winner) {
    return <ResultScreen winner={winner} onExit={onExit} />;
  }

  return (
    <>
      <BattleView
        format={format}
        roomId={roomId}
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
                          className={`h-full ${hpPct < 20 ? 'bg-rose-500' : hpPct < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
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