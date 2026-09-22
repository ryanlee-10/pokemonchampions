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
import { peerManager } from '../network/peerManager';
import { generateRandomCpuTeam } from '../utils/showdownParser';
import { HELD_ITEMS } from '../data/items';
import { Award, ArrowLeft, Shield, Sparkles, Calculator, X } from 'lucide-react';
import { BattleCalculator } from './BattleCalculator';


interface BattleScreenProps {
  format: BattleFormat;
  playerTeam: CustomPokemon[];
  isHost: boolean;
  roomId: string;
  onExit: () => void;
}

export const BattleScreen: React.FC<BattleScreenProps> = ({
  format,
  playerTeam,
  isHost,
  roomId,
  onExit
}) => {
  // Convert custom team to initial active state
  const initializeTeamState = (team: CustomPokemon[]): ActivePokemonState[] => {
    return team.map((p) => {
      const spec = POKEMON_ROSTER.find((s) => s.id === p.speciesId)!;
      const stats = calculateAllStats(p, spec);
      return {
        instanceId: p.id,
        species: spec,
        nickname: p.nickname || spec.name,
        level: p.level || 50,
        item: p.item,
        ability: p.ability,
        maxStats: stats,
        currentHp: stats.hp,
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
  const [isSelectingTeam, setIsSelectingTeam] = useState<boolean>(true);
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

  const checkEntranceAbilities = (
    enteringMon: ActivePokemonState,
    currentFields: BattleFieldConditions
  ): BattleFieldConditions => {
    const updated = { ...currentFields };
    const ab = enteringMon.ability;
    if (ab === 'Grassy Surge') {
      updated.terrain = 'Grassy';
      updated.terrainTurns = 5;
      addLog(`🌿 ${enteringMon.nickname}'s Grassy Surge turned the ground green!`);
    } else if (ab === 'Psychic Surge') {
      updated.terrain = 'Psychic';
      updated.terrainTurns = 5;
      addLog(`🔮 ${enteringMon.nickname}'s Psychic Surge made the ground weird!`);
    } else if (ab === 'Electric Surge' || ab === 'Hadron Engine') {
      updated.terrain = 'Electric';
      updated.terrainTurns = 5;
      addLog(`⚡ ${enteringMon.nickname}'s ${ab} electrified the battlefield!`);
    } else if (ab === 'Misty Surge') {
      updated.terrain = 'Misty';
      updated.terrainTurns = 5;
      addLog(`🌫️ ${enteringMon.nickname}'s Misty Surge enveloped the field in mist!`);
    } else if (ab === 'Drought') {
      updated.weather = 'Sun';
      updated.weatherTurns = 5;
      addLog(`☀️ ${enteringMon.nickname}'s Drought made the sunlight turn harsh!`);
    } else if (ab === 'Drizzle') {
      updated.weather = 'Rain';
      updated.weatherTurns = 5;
      addLog(`🌧️ ${enteringMon.nickname}'s Drizzle made it start to rain!`);
    } else if (ab === 'Sand Stream') {
      updated.weather = 'Sandstorm';
      updated.weatherTurns = 5;
      addLog(`🏜️ ${enteringMon.nickname}'s Sand Stream whipped up a sandstorm!`);
    } else if (ab === 'Snow Warning') {
      updated.weather = 'Snow';
      updated.weatherTurns = 5;
      addLog(`❄️ ${enteringMon.nickname}'s Snow Warning made snow fall!`);
    } else if (ab === 'Intimidate') {
      addLog(`🦁 ${enteringMon.nickname}'s Intimidate cut opposing Pokémon's Attack!`);
    }
    return updated;
  };

  const handleConfirmTeamSelection = () => {
    if (selectedPickIds.length < requiredPicks) return;

    const fullPlayerTeam = playerTeam.length > 0 ? playerTeam : generateRandomCpuTeam();
    const chosenPlayerMons = selectedPickIds
      .map((id) => fullPlayerTeam.find((p) => p.id === id))
      .filter(Boolean) as CustomPokemon[];

    const fullCpuTeam = generateRandomCpuTeam();
    const chosenCpuMons = fullCpuTeam.slice(0, requiredPicks);

    const initMyTeam = initializeTeamState(chosenPlayerMons);
    const initOppTeam = initializeTeamState(chosenCpuMons);
    const myActive = format === 'Singles' ? [0] : [0, 1];
    const oppActive = format === 'Singles' ? [0] : [0, 1];

    setMyTeamState(initMyTeam);
    setOpponentTeamState(initOppTeam);
    setMyActiveIndices(myActive);
    setOppActiveIndices(oppActive);
    setIsSelectingTeam(false);

    let initField: BattleFieldConditions = {};
    myActive.forEach((idx) => {
      if (initMyTeam[idx]) initField = checkEntranceAbilities(initMyTeam[idx], initField);
    });
    oppActive.forEach((idx) => {
      if (initOppTeam[idx]) initField = checkEntranceAbilities(initOppTeam[idx], initField);
    });
    setFieldConditions(initField);

    setBattleLog([
      `Battle started in ${format} format! Bring ${requiredPicks} of 6 VGC rules applied.`
    ]);
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
        await new Promise(r => setTimeout(r, 2000)); // Show each log for 2 seconds
      }
    }
    setActiveLogMessage(null);
    isPlayingLogs.current = false;
  };

  const addLog = (text: string) => {
    logQueue.current.push(text);
    processLogQueue();
  };

  const [fieldConditions, setFieldConditions] = useState<BattleFieldConditions>({});
  const [isTurnProcessing, setIsTurnProcessing] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  // Listen for PeerJS network messages
  useEffect(() => {
    if (roomId === 'LOCAL_SOLO') return;

    const handleMsg = (msg: any) => {
      if (msg.type === 'TURN_ACTION') {
        const oppActions: BattleAction[] = msg.payload.actions;
        resolveTurn(oppActions);
      }
    };

    // Attach peer listener
    const peer = (peerManager as any).peer;
    if (peer) {
      peerManager['onMessageCallback'] = handleMsg;
    }
  }, [roomId, pendingActions, myTeamState, opponentTeamState]);


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

  const submitAction = (action: BattleAction) => {
    const updated = [...pendingActions, action];
    setPendingActions(updated);

    // Check if all active living slots have actions selected
    if (updated.length >= alivePlayerActiveIndices.length) {
      if (roomId !== 'LOCAL_SOLO') {
        // Send to remote friend
        peerManager.sendMessage('TURN_ACTION', { actions: updated });
        addLog('Submitted turn choices! Waiting for opponent...');
      } else {
        // AI Solo turn generation for living active Pokemon
        const aiActions: BattleAction[] = aliveOppActiveIndices.map((oppIdx, slot) => {
          const oppPkmn = opponentTeamState[oppIdx];
          const availableMoves = oppPkmn.moves.filter((m) => m.currentPp > 0);
          const chosenMove = availableMoves.length > 0
            ? availableMoves[Math.floor(Math.random() * availableMoves.length)]
            : oppPkmn.moves[0];
          return {
            playerId: 'cpu',
            actorIndex: slot,
            type: 'MOVE',
            moveId: chosenMove.move.id,
            targetSlot: Math.floor(Math.random() * Math.max(1, alivePlayerActiveIndices.length))
          };
        });

        resolveTurnWithActions(updated, aiActions);
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

  const resolveTurn = (oppActions: BattleAction[]) => {
    resolveTurnWithActions(pendingActions, oppActions);
  };

  const resolveTurnWithActions = (myActs: BattleAction[], oppActs: BattleAction[]) => {
    setIsTurnProcessing(true);

    // Clone team states
    let nextMyTeam = [...myTeamState];
    let nextOppTeam = [...opponentTeamState];
    let activeField: BattleFieldConditions = { ...fieldConditions };

    const getEffectiveSpeed = (pkmn: ActivePokemonState | undefined, isPlayer: boolean): number => {
      if (!pkmn) return 0;
      let spd = pkmn.maxStats.speed * ((pkmn.statStages?.speed && pkmn.statStages.speed !== 0) ? (pkmn.statStages.speed > 0 ? (2 + pkmn.statStages.speed) / 2 : 2 / (2 - pkmn.statStages.speed)) : 1);
      if (pkmn.status === 'Paralysis' && pkmn.ability !== 'Quick Feet') {
        spd = Math.floor(spd * 0.5);
      }
      if (pkmn.item === 'choice_scarf') {
        spd = Math.floor(spd * 1.5);
      }
      if (activeField.weather === 'Rain' && pkmn.ability === 'Swift Swim') {
        spd = Math.floor(spd * 2);
      }
      if (activeField.weather === 'Sun' && pkmn.ability === 'Chlorophyll') {
        spd = Math.floor(spd * 2);
      }
      if (activeField.weather === 'Sandstorm' && pkmn.ability === 'Sand Rush') {
        spd = Math.floor(spd * 2);
      }
      if (activeField.weather === 'Snow' && pkmn.ability === 'Slush Rush') {
        spd = Math.floor(spd * 2);
      }
      const isTailwind = isPlayer ? Boolean(activeField.tailwindTeam1 && activeField.tailwindTeam1 > 0) : Boolean(activeField.tailwindTeam2 && activeField.tailwindTeam2 > 0);
      if (isTailwind) {
        spd = Math.floor(spd * 2);
      }
      return spd;
    };

    // Combine actions and sort by priority & speed
    const allActions: { action: BattleAction; isMyAction: boolean; speed: number; priority: number }[] = [];

    myActs.forEach((act) => {
      const actualSlotIdx = alivePlayerActiveIndices[act.actorIndex] ?? myActiveIndices[act.actorIndex];
      const actorPkmn = nextMyTeam[actualSlotIdx];
      const move = act.moveId ? MOVES_DATABASE[act.moveId] : null;
      let priority = move ? move.priority || 0 : 0;
      if (move && move.id === 'grassy_glide' && activeField.terrain === 'Grassy' && actorPkmn && isGrounded(actorPkmn)) {
        priority = 1;
      }
      allActions.push({
        action: act,
        isMyAction: true,
        speed: getEffectiveSpeed(actorPkmn, true),
        priority
      });
    });

    oppActs.forEach((act) => {
      const actualSlotIdx = aliveOppActiveIndices[act.actorIndex] ?? oppActiveIndices[act.actorIndex];
      const actorPkmn = nextOppTeam[actualSlotIdx];
      const move = act.moveId ? MOVES_DATABASE[act.moveId] : null;
      let priority = move ? move.priority || 0 : 0;
      if (move && move.id === 'grassy_glide' && activeField.terrain === 'Grassy' && actorPkmn && isGrounded(actorPkmn)) {
        priority = 1;
      }
      allActions.push({
        action: act,
        isMyAction: false,
        speed: getEffectiveSpeed(actorPkmn, false),
        priority
      });
    });

    // Sort by priority desc, then speed desc (or asc in Trick Room)
    allActions.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (activeField.trickRoom && activeField.trickRoom > 0) {
        return a.speed - b.speed;
      }
      return b.speed - a.speed;
    });

    // Execute actions sequentially
    allActions.forEach(({ action, isMyAction }) => {
      const attackerTeam = isMyAction ? nextMyTeam : nextOppTeam;
      const defenderTeam = isMyAction ? nextOppTeam : nextMyTeam;
      const attackerActiveIndices = isMyAction ? myActiveIndices : oppActiveIndices;
      const defenderActiveIndices = isMyAction ? oppActiveIndices : myActiveIndices;

      const attackerSlotIndex = attackerActiveIndices[action.actorIndex];
      const attacker = attackerTeam[attackerSlotIndex];

      if (!attacker || attacker.isFainted || attacker.currentHp <= 0) return;

      // Execute Mega Evolution before move if requested
      if (action.megaEvolve && !attacker.isMegaEvolved && attacker.species.megaForm) {
        const megaForms = Array.isArray(attacker.species.megaForm) ? attacker.species.megaForm : [attacker.species.megaForm];
        const matchingMega = megaForms.find((mf) => mf.megaStoneId === attacker.item);
        if (matchingMega) {
          attacker.isMegaEvolved = true;
          attacker.nickname = matchingMega.megaName;
          attacker.ability = matchingMega.megaAbility;
          attacker.species = {
            ...attacker.species,
            types: matchingMega.megaTypes || attacker.species.types
          };
          if (matchingMega.megaSpriteUrl) {
            attacker.activeSpriteUrl = matchingMega.megaSpriteUrl;
          }
          
          const megaSpecies = { ...attacker.species, baseStats: matchingMega.megaBaseStats };
          const dummyCustom = {
            id: attacker.instanceId,
            speciesId: attacker.species.id,
            nickname: attacker.nickname,
            level: attacker.level,
            item: attacker.item,
            ability: matchingMega.megaAbility,
            nature: 'Hardy',
            evs: { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
            moves: []
          };
          attacker.maxStats = calculateAllStats(dummyCustom, megaSpecies);
          addLog(`✨ ${attacker.nickname} Mega Evolved! Ability became ${matchingMega.megaAbility}!`);
        }
      }

      // Handle Flinching
      if (attacker.isFlinched) {
        attacker.isFlinched = false;
        addLog(`😵 ${attacker.nickname} flinched and couldn't move!`);
        return;
      }

      // Handle Recharge turn requirement
      if (attacker.mustRecharge) {
        attacker.mustRecharge = false;
        addLog(`${attacker.nickname} must recharge and cannot move!`);
        return;
      }

      if (action.type === 'MOVE' && action.moveId) {
        const move = MOVES_DATABASE[action.moveId];
        if (!move) return;

        // Reset Glaive Rush vulnerability on attacker's turn
        attacker.isGlaiveRushVulnerable = false;

        // First Impression & Fake Out: Fail if not used on the first turn out on the field
        if ((move.id === 'first_impression' || move.id === 'fake_out') && (attacker.turnsOnField || 1) > 1) {
          addLog(`${attacker.nickname} used ${move.name}... but it failed!`);
          return;
        }

        // Handle Weather-setting moves (Sunny Day, Rain Dance, Sandstorm, Snowscape)
        if (move.weatherEffect) {
          activeField = { ...activeField, weather: move.weatherEffect, weatherTurns: 5 };
          const weatherText: Record<string, string> = {
            Sun: '☀️ The sunlight turned harsh!',
            Rain: '🌧️ Heavy rain began to fall!',
            Sandstorm: '⏳ A sandstorm kicked up!',
            Snow: '🌨️ It began to snow!'
          };
          addLog(weatherText[move.weatherEffect] || `The weather changed to ${move.weatherEffect}!`);
        }

        // Handle Terrain-setting moves (Grassy Terrain, Psychic Terrain, Electric Terrain, Misty Terrain)
        if (move.terrainEffect) {
          activeField = { ...activeField, terrain: move.terrainEffect, terrainTurns: 5 };
          const terrainText: Record<string, string> = {
            Grassy: '🌿 An emerald turf spread across the battlefield!',
            Psychic: '🔮 The battlefield got weird and mysterious!',
            Electric: '⚡ An electric current ran across the battlefield!',
            Misty: '🌫️ Mist swirled around the battlefield!'
          };
          addLog(terrainText[move.terrainEffect] || `The terrain became ${move.terrainEffect}!`);
        }

        // Handle Charging turn requirement (1-turn instant in matching weather: Solar Beam in Sun, Electro Shot in Rain)
        if (move.requiresCharge && !attacker.isChargingMove) {
          const isInstantWeather =
            (move.id === 'solar_beam' && (activeField.weather === 'Sun' || attacker.ability === 'Drought')) ||
            (move.id === 'electro_shot' && (activeField.weather === 'Rain' || attacker.ability === 'Drizzle'));

          if (!isInstantWeather) {
            attacker.isChargingMove = true;
            addLog(`⚡ ${attacker.nickname} is absorbing energy for ${move.name}!`);
            return;
          } else {
            const weatherName = move.id === 'solar_beam' ? 'harsh sunlight' : 'heavy rain';
            addLog(`✨ ${attacker.nickname} absorbed energy for ${move.name} instantly in the ${weatherName}!`);
          }
        }
        if (attacker.isChargingMove) {
          attacker.isChargingMove = false;
        }

        // Set Recharge for next turn if move requires it (e.g. Hyper Beam)
        if (move.requiresRecharge) {
          attacker.mustRecharge = true;
        }

        // Glaive Rush: User takes 2x double damage until its next move
        if (move.id === 'glaive_rush') {
          attacker.isGlaiveRushVulnerable = true;
          addLog(`⚠️ ${attacker.nickname} used Glaive Rush and is vulnerable to double damage!`);
        } else {
          addLog(`${attacker.nickname} used ${move.name}!`);
        }

        // Double Shock: User loses Electric typing until switched out
        if (move.id === 'double_shock') {
          const currentTypes = attacker.activeTypes || attacker.species.types;
          if (currentTypes.includes('Electric')) {
            attacker.activeTypes = currentTypes.filter((t) => t !== 'Electric');
            addLog(`⚡ ${attacker.nickname} used up all its electricity and lost its Electric typing!`);
          }
        }

        // Aurora Veil: Usable only in Snow, blocks 1/3 physical and special damage taken
        if (move.id === 'aurora_veil') {
          if (activeField.weather !== 'Snow') {
            addLog(`${attacker.nickname} used Aurora Veil... but it failed! (Aurora Veil can only be used during Snow)`);
            return;
          }
          const veilTurns = attacker.item === 'light_clay' ? 8 : 5;
          if (isMyAction) {
            activeField = { ...activeField, auroraVeilTeam1: veilTurns };
          } else {
            activeField = { ...activeField, auroraVeilTeam2: veilTurns };
          }
          addLog(`❄️ ${attacker.nickname} set up an Aurora Veil! (Blocks 1/3 of physical & special damage for ${veilTurns} turns)`);
          return;
        }

        const checkMoveHit = (m: typeof move, atk: typeof attacker, def: typeof attacker): boolean => {
          if (def.isGlaiveRushVulnerable) return true; // All moves hit during Glaive Rush vulnerability
          if (activeField.weather === 'Rain' && (m.id === 'thunder' || m.id === 'hurricane')) return true;
          if (activeField.weather === 'Snow' && m.id === 'blizzard') return true;
          if (m.accuracy >= 101 || m.accuracy === 0) return true;
          let baseAcc = m.accuracy;
          if (activeField.weather === 'Sun' && (m.id === 'thunder' || m.id === 'hurricane')) {
            baseAcc = 50;
          }
          const accStage = (atk.statStages?.accuracy || 0) - (def.statStages?.evasion || 0);
          const clampedStage = Math.max(-6, Math.min(6, accStage));
          const stageMultipliers: Record<number, number> = {
            '-6': 3 / 9, '-5': 3 / 8, '-4': 3 / 7, '-3': 3 / 6, '-2': 3 / 5, '-1': 3 / 4,
            '0': 1.0, '1': 4 / 3, '2': 5 / 3, '3': 6 / 3, '4': 7 / 3, '5': 8 / 3, '6': 9 / 3
          };
          let multiplier = stageMultipliers[clampedStage] || 1.0;
          
          if (activeField.weather === 'Sandstorm' && def.ability === 'Sand Veil') multiplier *= 0.8;
          if (activeField.weather === 'Snow' && def.ability === 'Snow Cloak') multiplier *= 0.8;
          
          const itemAccMod = atk.item === 'wide_lens' ? 1.1 : 1.0;
          return Math.random() * 100 < baseAcc * multiplier * itemAccMod;
        };

        const isDefAuroraActive = isMyAction
          ? Boolean(activeField.auroraVeilTeam2 && activeField.auroraVeilTeam2 > 0)
          : Boolean(activeField.auroraVeilTeam1 && activeField.auroraVeilTeam1 > 0);

        const moveEffectivePriority = (move.id === 'grassy_glide' && activeField.terrain === 'Grassy' && isGrounded(attacker))
          ? 1
          : (move.priority || 0);

        const applyMoveSecondaryEffects = (m: typeof move, atk: typeof attacker, def: typeof attacker, damageDealt: number) => {
          if (def.isFainted) return;

          // 1. Flinch (e.g. Rock Slide 30%, Iron Head 30%, Fake Out 100%)
          if (m.flinchChance && !def.isFainted) {
            if (Math.random() * 100 < m.flinchChance) {
              def.isFlinched = true;
              addLog(`💥 ${def.nickname} flinched!`);
            }
          }

          // 2. Status Effects (e.g. Scald 30% Burn, Sludge Bomb 30% Poison, Thunderbolt 10% Paralysis, Ice Beam 10% Freeze)
          if (m.statusEffect && !def.status && !def.isFainted) {
            // Electric Terrain prevents Sleep on grounded Pokemon
            if (activeField.terrain === 'Electric' && m.statusEffect === 'Sleep' && isGrounded(def)) {
              addLog(`⚡ Electric Terrain prevented ${def.nickname} from falling asleep!`);
              return;
            }
            // Misty Terrain prevents all status conditions on grounded Pokemon
            if (activeField.terrain === 'Misty' && isGrounded(def)) {
              addLog(`🌫️ Misty Terrain protected ${def.nickname} from status conditions!`);
              return;
            }

            const chance = m.statusChance ?? 100;
            if (Math.random() * 100 < chance) {
              def.status = m.statusEffect;
              const statusEmoji: Record<string, string> = {
                Burn: '🔥',
                Paralysis: '⚡',
                Sleep: '😴',
                Poison: '☠️',
                Freeze: '❄️'
              };
              addLog(`${statusEmoji[m.statusEffect] || '✨'} ${def.nickname} was afflicted with ${m.statusEffect}!`);
            }
          }

          // 3. HP Drain (e.g. Bitter Blade, Giga Drain, Drain Punch, Leech Life, Matcha Gotcha)
          if (m.drainPercent && damageDealt > 0 && !atk.isFainted && atk.currentHp < atk.maxStats.hp) {
            const drained = Math.max(1, Math.floor((damageDealt * m.drainPercent) / 100));
            atk.currentHp = Math.min(atk.maxStats.hp, atk.currentHp + drained);
            addLog(`💚 ${atk.nickname} drained ${drained} HP!`);
          }

          // 4. Stat Changes (e.g. Trop Kick, Snarl, Icy Wind, Moonblast, Shadow Ball, Close Combat, Make It Rain, Armor Cannon)
          if (m.statChanges && m.statChanges.length > 0) {
            m.statChanges.forEach((sc) => {
              const chance = sc.chance ?? 100;
              if (Math.random() * 100 <= chance) {
                const targetPkmn = (sc.target === 'Self' || (sc.stages < 0 && sc.target !== 'Target')) ? atk : def;
                if (targetPkmn && !targetPkmn.isFainted && targetPkmn.statStages) {
                  const statKey = sc.stat as keyof typeof targetPkmn.statStages;
                  if (statKey in targetPkmn.statStages) {
                    const currentStage = targetPkmn.statStages[statKey] || 0;
                    const newStage = Math.max(-6, Math.min(6, currentStage + sc.stages));
                    targetPkmn.statStages[statKey] = newStage;
                    const direction = sc.stages > 0 ? 'rose' : 'fell';
                    const amountText = Math.abs(sc.stages) > 1 ? ` sharply!` : '!';
                    const statNameFormatted = statKey === 'spAtk' ? 'Sp. Atk' : statKey === 'spDef' ? 'Sp. Def' : statKey.charAt(0).toUpperCase() + statKey.slice(1);
                    addLog(`${targetPkmn.nickname}'s ${statNameFormatted} ${direction}${amountText}`);
                  }
                }
              }
            });
          }
        };

        if (move.target === 'SpreadEnemies') {
          // Hits all active defender slots in 2v2
          defenderActiveIndices.forEach((defSlotIdx) => {
            const defender = defenderTeam[defSlotIdx];
            if (defender && !defender.isFainted) {
              // Psychic Terrain blocks priority attacks against grounded targets
              if (activeField.terrain === 'Psychic' && moveEffectivePriority > 0 && isGrounded(defender)) {
                addLog(`🔮 Psychic Terrain protected ${defender.nickname} from ${attacker.nickname}'s ${move.name}!`);
                return;
              }
              if (!checkMoveHit(move, attacker, defender)) {
                addLog(`${attacker.nickname}'s attack missed ${defender.nickname}!`);
                return;
              }
              defender.timesHit = (defender.timesHit || 0) + 1;
              const res = calculateDamage(attacker, defender, move, format, false, attackerTeam, isDefAuroraActive, activeField);
              defender.currentHp = Math.max(0, defender.currentHp - res.damage);
              if (res.description) addLog(res.description);
              addLog(`${defender.nickname} took ${res.damage} damage!`);

              applyMoveSecondaryEffects(move, attacker, defender, res.damage);

              if (defender.currentHp <= 0) {
                defender.isFainted = true;
                addLog(`${defender.nickname} fainted!`);
              }

              // Recoil damage calculation
              if (move.recoilPercent && res.damage > 0 && !attacker.isFainted) {
                const recoilDamage = Math.max(1, Math.floor((res.damage * move.recoilPercent) / 100));
                attacker.currentHp = Math.max(0, attacker.currentHp - recoilDamage);
                addLog(`${attacker.nickname} took ${recoilDamage} recoil damage!`);
                if (attacker.currentHp <= 0) {
                  attacker.isFainted = true;
                  addLog(`${attacker.nickname} fainted from recoil!`);
                }
              }

              // Spicy Spray ability (burns attacker when hit)
              if (defender.ability === 'Spicy Spray' && res.damage > 0 && !attacker.isFainted && !attacker.status) {
                attacker.status = 'Burn';
                addLog(`🌶️ ${defender.nickname}'s Spicy Spray burned ${attacker.nickname}!`);
              }
            }
          });
        } else {
          // Single target attack
          const targetSlot = action.targetSlot || 0;
          let targetSlotIdx = defenderActiveIndices[targetSlot] ?? defenderActiveIndices[0];
          let defender = defenderTeam[targetSlotIdx];

          // Mid-turn retargeting: if targeted enemy fainted mid-turn, redirect to remaining alive defender
          if ((!defender || defender.isFainted || defender.currentHp <= 0) && format === 'Doubles') {
            const altSlot = defenderActiveIndices.find((idx) => {
              const d = defenderTeam[idx];
              return d && !d.isFainted && d.currentHp > 0;
            });
            if (altSlot !== undefined) {
              targetSlotIdx = altSlot;
              defender = defenderTeam[targetSlotIdx];
              addLog(`${attacker.nickname}'s attack redirected to ${defender.nickname}!`);
            }
          }

          if (defender && !defender.isFainted) {
            // Psychic Terrain blocks priority attacks against grounded targets
            if (activeField.terrain === 'Psychic' && moveEffectivePriority > 0 && isGrounded(defender)) {
              addLog(`🔮 Psychic Terrain protected ${defender.nickname} from ${attacker.nickname}'s ${move.name}!`);
              return;
            }
            if (!checkMoveHit(move, attacker, defender)) {
              addLog(`${attacker.nickname}'s attack missed!`);
              return;
            }
            defender.timesHit = (defender.timesHit || 0) + 1;
            const res = calculateDamage(attacker, defender, move, format, false, attackerTeam, isDefAuroraActive, activeField);
            defender.currentHp = Math.max(0, defender.currentHp - res.damage);
            if (res.description) addLog(res.description);
            addLog(`${defender.nickname} took ${res.damage} damage!`);

            applyMoveSecondaryEffects(move, attacker, defender, res.damage);

            if (defender.currentHp <= 0) {
              defender.isFainted = true;
              addLog(`${defender.nickname} fainted!`);
            }

            // Recoil damage calculation
            if (move.recoilPercent && res.damage > 0 && !attacker.isFainted) {
              const recoilDamage = Math.max(1, Math.floor((res.damage * move.recoilPercent) / 100));
              attacker.currentHp = Math.max(0, attacker.currentHp - recoilDamage);
              addLog(`${attacker.nickname} took ${recoilDamage} recoil damage!`);
              if (attacker.currentHp <= 0) {
                attacker.isFainted = true;
                addLog(`${attacker.nickname} fainted from recoil!`);
              }
            }

            // Spicy Spray ability (burns attacker when hit)
            if (defender.ability === 'Spicy Spray' && res.damage > 0 && !attacker.isFainted && !attacker.status) {
              attacker.status = 'Burn';
              addLog(`🌶️ ${defender.nickname}'s Spicy Spray burned ${attacker.nickname}!`);
            }
          }
        }
      }
    });

    // Increment turns on field for active Pokemon
    myActiveIndices.forEach((idx) => {
      if (nextMyTeam[idx] && !nextMyTeam[idx].isFainted) {
        nextMyTeam[idx].turnsOnField = (nextMyTeam[idx].turnsOnField || 1) + 1;
      }
    });
    oppActiveIndices.forEach((idx) => {
      if (nextOppTeam[idx] && !nextOppTeam[idx].isFainted) {
        nextOppTeam[idx].turnsOnField = (nextOppTeam[idx].turnsOnField || 1) + 1;
      }
    });

    // End-of-Turn Weather & Terrain Effects
    // 1. Grassy Terrain HP recovery (1/16 max HP to alive grounded active Pokemon)
    if (activeField.terrain === 'Grassy') {
      [...myActiveIndices.map((i) => nextMyTeam[i]), ...oppActiveIndices.map((i) => nextOppTeam[i])].forEach((pkmn) => {
        if (pkmn && !pkmn.isFainted && pkmn.currentHp > 0 && pkmn.currentHp < pkmn.maxStats.hp && isGrounded(pkmn)) {
          const healAmount = Math.max(1, Math.floor(pkmn.maxStats.hp / 16));
          pkmn.currentHp = Math.min(pkmn.maxStats.hp, pkmn.currentHp + healAmount);
          addLog(`🌿 Grassy Terrain restored HP to ${pkmn.nickname}! (+${healAmount} HP)`);
        }
      });
    }

    // 2. Sandstorm chip damage (1/16 max HP to non-Rock/Steel/Ground active Pokemon)
    if (activeField.weather === 'Sandstorm') {
      [...myActiveIndices.map((i) => nextMyTeam[i]), ...oppActiveIndices.map((i) => nextOppTeam[i])].forEach((pkmn) => {
        if (pkmn && !pkmn.isFainted && pkmn.currentHp > 0) {
          const types = pkmn.activeTypes || pkmn.species.types;
          const isImmune =
            types.includes('Rock') ||
            types.includes('Ground') ||
            types.includes('Steel') ||
            pkmn.ability === 'Sand Force' ||
            pkmn.ability === 'Sand Rush' ||
            pkmn.ability === 'Sand Veil';
          if (!isImmune) {
            const chip = Math.max(1, Math.floor(pkmn.maxStats.hp / 16));
            pkmn.currentHp = Math.max(0, pkmn.currentHp - chip);
            addLog(`⏳ ${pkmn.nickname} is buffeted by the sandstorm! (-${chip} HP)`);
            if (pkmn.currentHp <= 0) {
              pkmn.isFainted = true;
              addLog(`${pkmn.nickname} fainted from the sandstorm!`);
            }
          }
        }
      });
    }

    // 3. Weather & Terrain duration countdown
    if (activeField.weather && activeField.weather !== 'Clear') {
      activeField.weatherTurns = (activeField.weatherTurns || 5) - 1;
      if (activeField.weatherTurns <= 0) {
        addLog(`☀️ The ${activeField.weather.toLowerCase()} cleared up!`);
        activeField.weather = 'Clear';
      }
    }
    if (activeField.terrain && activeField.terrain !== 'None') {
      activeField.terrainTurns = (activeField.terrainTurns || 5) - 1;
      if (activeField.terrainTurns <= 0) {
        addLog(`✨ The ${activeField.terrain.toLowerCase()} terrain faded away!`);
        activeField.terrain = 'None';
      }
    }
    if (activeField.auroraVeilTeam1 && activeField.auroraVeilTeam1 > 0) {
      activeField.auroraVeilTeam1 -= 1;
      if (activeField.auroraVeilTeam1 <= 0) addLog(`Your team's Aurora Veil wore off!`);
    }
    if (activeField.auroraVeilTeam2 && activeField.auroraVeilTeam2 > 0) {
      activeField.auroraVeilTeam2 -= 1;
      if (activeField.auroraVeilTeam2 <= 0) addLog(`Opposing team's Aurora Veil wore off!`);
    }

    setFieldConditions(activeField);
    setMyTeamState(nextMyTeam);
    setOpponentTeamState(nextOppTeam);

    // Replacements are ONLY sent out after everyone's turn is finished!

    // 4. Process CPU / Opponent replacements
    let updatedOppActive = [...oppActiveIndices];
    oppActiveIndices.forEach((oppIdx, slotNum) => {
      const oppMon = nextOppTeam[oppIdx];
      if (oppMon && (oppMon.isFainted || oppMon.currentHp <= 0)) {
        const availableBenchIdx = nextOppTeam.findIndex(
          (p, i) => !updatedOppActive.includes(i) && !p.isFainted && p.currentHp > 0
        );
        if (availableBenchIdx !== -1) {
          updatedOppActive[slotNum] = availableBenchIdx;
          nextOppTeam[availableBenchIdx].turnsOnField = 1;
          addLog(`⚡ Opponent sent out ${nextOppTeam[availableBenchIdx].nickname}!`);
          activeField = checkEntranceAbilities(nextOppTeam[availableBenchIdx], activeField);
          setFieldConditions(activeField);
        }
      }
    });
    setOppActiveIndices(updatedOppActive);

    // 5. Check Win / Loss condition immediately
    const myAllFainted = nextMyTeam.every((p) => p.isFainted || p.currentHp <= 0);
    const oppAllFainted = nextOppTeam.every((p) => p.isFainted || p.currentHp <= 0);

    if (myAllFainted && oppAllFainted) {
      setWinner('Draw');
      addLog('The battle ended in a Draw!');
      setIsTurnProcessing(false);
      return;
    } else if (oppAllFainted) {
      setWinner('Player');
      addLog('You won the Pokémon Champion battle!');
      setIsTurnProcessing(false);
      return;
    } else if (myAllFainted) {
      setWinner('Opponent');
      addLog('Opponent won the battle!');
      setIsTurnProcessing(false);
      return;
    }

    // 6. Check Player fainted active slots requiring replacement
    const faintedPlayerSlots: FaintedSlotReplacement[] = [];
    myActiveIndices.forEach((myIdx, slotNum) => {
      const myMon = nextMyTeam[myIdx];
      if (myMon && (myMon.isFainted || myMon.currentHp <= 0)) {
        const hasBenchAvailable = nextMyTeam.some(
          (p, i) => !myActiveIndices.includes(i) && !p.isFainted && p.currentHp > 0
        );
        if (hasBenchAvailable) {
          faintedPlayerSlots.push({
            activeSlotIndex: slotNum,
            faintedMonName: myMon.nickname
          });
        }
      }
    });

    if (faintedPlayerSlots.length > 0) {
      setPendingReplacements(faintedPlayerSlots);
      addLog(`⚠️ ${faintedPlayerSlots.map((s) => s.faintedMonName).join(' and ')} fainted! Choose a Pokémon to send out.`);
      setIsTurnProcessing(false);
    } else {
      setPendingActions([]);
      setSelectedActorIndex(0);
      setIsTurnProcessing(false);
      addLog('Turn finished! Choose your next moves.');
    }
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
      sentMon.turnsOnField = 1;
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


  if (isSelectingTeam) {
    const fullTeam = playerTeam.length > 0 ? playerTeam : generateRandomCpuTeam();

    return (
      <div className="animate-in" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
        <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', marginBottom: '1.5rem' }}>
          <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={onExit}>
            <ArrowLeft size={16} /> Exit to Lobby
          </button>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0 }}>
              <Shield size={22} color="var(--primary)" /> Team Preview: Select {requiredPicks} of 6
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
              Format: <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{format}</span> ({format === 'Singles' ? '1 Lead, 2 Bench' : '2 Leads, 2 Bench'})
            </p>
          </div>
          <button
            className="btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: selectedPickIds.length < requiredPicks ? 0.5 : 1, cursor: selectedPickIds.length < requiredPicks ? 'not-allowed' : 'pointer' }}
            disabled={selectedPickIds.length < requiredPicks}
            onClick={handleConfirmTeamSelection}
          >
            <Sparkles size={16} /> Confirm & Enter ({selectedPickIds.length} / {requiredPicks})
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {fullTeam.map((pkmn) => {
            const spec = POKEMON_ROSTER.find((s) => s.id === pkmn.speciesId);
            const pickIndex = selectedPickIds.indexOf(pkmn.id);
            const isPicked = pickIndex !== -1;

            let slotLabel = '';
            if (isPicked) {
              if (format === 'Singles') {
                slotLabel = pickIndex === 0 ? 'Lead #1' : `Bench #${pickIndex}`;
              } else {
                slotLabel = pickIndex < 2 ? `Lead #${pickIndex + 1}` : `Bench #${pickIndex - 1}`;
              }
            }

            return (
              <div
                key={pkmn.id}
                className="glass-card"
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isPicked ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
                  backgroundColor: isPicked ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0, 0, 0, 0.4)',
                  boxShadow: isPicked ? '0 0 15px rgba(99, 102, 241, 0.3)' : 'none',
                  transform: isPicked ? 'scale(1.02)' : 'scale(1)',
                  transition: 'var(--transition)'
                }}
                onClick={() => handleTogglePick(pkmn.id)}
              >
                {/* Big Selection Number Badge */}
                {isPicked && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '-12px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                    border: '2px solid #0f111a',
                    zIndex: 10
                  }}>
                    {pickIndex + 1}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src={spec?.spriteUrl} alt={spec?.name} style={{ width: '56px', height: '56px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ fontWeight: 800, fontSize: '1rem', color: isPicked ? '#fff' : 'var(--text)', margin: 0 }}>{pkmn.nickname || spec?.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lv. {pkmn.level || 50}</span>
                      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                        {spec?.types.map((t) => (
                          <span key={t} className={`type-tag type-${t.toLowerCase()}`} style={{ fontSize: '0.55rem', padding: '0.1rem 0.4rem', borderRadius: '1rem', textTransform: 'uppercase', fontWeight: 800 }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {isPicked && (
                    <span style={{ backgroundColor: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: '0.65rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {slotLabel}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-glass)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div><span style={{ color: 'var(--text)', fontWeight: 600 }}>Item:</span> {HELD_ITEMS.find((i) => i.id === pkmn.item)?.name || 'None'}</div>
                  <div><span style={{ color: 'var(--text)', fontWeight: 600 }}>Ability:</span> {pkmn.ability}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="battle-container w-full max-w-full space-y-4">
      {/* Top Bar Header */}
      <div className="battle-topbar flex justify-between items-center bg-slate-900/60 p-3 rounded-2xl border border-glass">
        <button className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-slate-300 hover:text-white" onClick={onExit}>
          <ArrowLeft size={16} /> Exit / Back to Lobby
        </button>
        <div className="battle-title font-bold text-base flex items-center gap-2 flex-wrap justify-end">
          {/* Weather Badge */}
          {fieldConditions.weather && fieldConditions.weather !== 'Clear' && (
            <span
              style={{
                backgroundColor:
                  fieldConditions.weather === 'Sun' ? 'rgba(234, 88, 12, 0.25)' :
                  fieldConditions.weather === 'Rain' ? 'rgba(37, 99, 235, 0.25)' :
                  fieldConditions.weather === 'Sandstorm' ? 'rgba(217, 119, 6, 0.25)' : 'rgba(147, 197, 253, 0.25)',
                border: `1px solid ${
                  fieldConditions.weather === 'Sun' ? '#f97316' :
                  fieldConditions.weather === 'Rain' ? '#3b82f6' :
                  fieldConditions.weather === 'Sandstorm' ? '#f59e0b' : '#60a5fa'}`,
                color: '#fff',
                borderRadius: '9999px',
                padding: '0.2rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              {fieldConditions.weather === 'Sun' ? '☀️ Harsh Sun' :
               fieldConditions.weather === 'Rain' ? '🌧️ Heavy Rain' :
               fieldConditions.weather === 'Sandstorm' ? '⏳ Sandstorm' : '🌨️ Snow'} ({fieldConditions.weatherTurns || 5}t)
            </span>
          )}

          {/* Terrain Badge */}
          {fieldConditions.terrain && fieldConditions.terrain !== 'None' && (
            <span
              style={{
                backgroundColor:
                  fieldConditions.terrain === 'Electric' ? 'rgba(234, 179, 8, 0.25)' :
                  fieldConditions.terrain === 'Grassy' ? 'rgba(34, 197, 94, 0.25)' :
                  fieldConditions.terrain === 'Psychic' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(236, 72, 153, 0.25)',
                border: `1px solid ${
                  fieldConditions.terrain === 'Electric' ? '#eab308' :
                  fieldConditions.terrain === 'Grassy' ? '#22c55e' :
                  fieldConditions.terrain === 'Psychic' ? '#a855f7' : '#ec4899'}`,
                color: '#fff',
                borderRadius: '9999px',
                padding: '0.2rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              {fieldConditions.terrain === 'Electric' ? '⚡ Electric Terrain' :
               fieldConditions.terrain === 'Grassy' ? '🌿 Grassy Terrain' :
               fieldConditions.terrain === 'Psychic' ? '🔮 Psychic Terrain' : '🌫️ Misty Terrain'} ({fieldConditions.terrainTurns || 5}t)
            </span>
          )}

          <span>Pokémon Champions ({format})</span>
          <span className="room-badge">{roomId}</span>
          <button
            className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1 font-bold text-sky-400 border-sky-500/40 hover:bg-sky-950/40"
            onClick={() => setShowBattleCalc(true)}
            title="Open Battle Damage Calculator"
          >
            <Calculator size={13} /> Calc
          </button>
        </div>
      </div>


      {/* 2.5D Battle Arena View */}
      <div className="battle-field-arena w-full relative">
        <div className="arena-stadium-lights" />

        {/* Floating Active Log Banner (Top) */}
        {activeLogMessage && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-4/5 max-w-2xl bg-slate-900/90 backdrop-blur-md border border-indigo-500/50 rounded-xl p-4 shadow-2xl text-center transform transition-all duration-300 animate-in fade-in slide-in-from-top-4">
            <h2 className="text-xl font-black text-white tracking-wide">{activeLogMessage}</h2>
          </div>
        )}

        {/* Opponent Active Side (Top) */}
        <div className="active-side opponent-side">
          {oppActiveIndices.map((idx) => {
            const pkmn = opponentTeamState[idx];
            if (!pkmn) return null;
            const hpPct = Math.round((pkmn.currentHp / pkmn.maxStats.hp) * 100);

            return (
              <div key={pkmn.instanceId} className="pokemon-battle-card opp-card">
                <div className="hp-bar-container">
                  <div className="pkmn-meta">
                    <span className="pkmn-name">{pkmn.nickname}</span>
                    <span className="pkmn-lvl">Lv. {pkmn.level}</span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    {pkmn.species.types.map((t) => (
                      <span key={t} className={`type-tag type-${t.toLowerCase()}`} style={{ fontSize: '0.55rem', padding: '0.05rem 0.35rem' }}>
                        {t}
                      </span>
                    ))}
                    {pkmn.status && (
                      <span className={`status-pill status-${pkmn.status.toLowerCase().slice(0, 3)}`}>
                        {pkmn.status === 'Burn' ? '🔥 BRN' :
                         pkmn.status === 'Paralysis' ? '⚡ PAR' :
                         pkmn.status === 'Freeze' ? '❄️ FRZ' :
                         pkmn.status === 'Sleep' ? '💤 SLP' :
                         '☠️ PSN'}
                      </span>
                    )}
                  </div>

                  <div className="hp-bar-track">
                    <div
                      className={`hp-bar-fill ${
                        hpPct < 20 ? 'critical' : hpPct < 50 ? 'warning' : 'healthy'
                      }`}
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                  <span className="hp-text">{pkmn.currentHp} / {pkmn.maxStats.hp} HP</span>

                  {/* Stat Stage Chips */}
                  {Object.entries(pkmn.statStages || {}).some(([, val]) => val !== 0) && (
                    <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-glass">
                      {Object.entries(pkmn.statStages).map(([stat, val]) => {
                        if (!val) return null;
                        const isPos = val > 0;
                        const label = stat === 'spAtk' ? 'SpA' : stat === 'spDef' ? 'SpD' : stat.slice(0, 3).toUpperCase();
                        return (
                          <span key={stat} className={`stat-stage-badge ${isPos ? 'positive' : 'negative'}`}>
                            {isPos ? `▲ +${val}` : `▼ ${val}`} {label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pokemon-stage">
                  <div className="battle-pedestal opponent-pedestal" />
                  <img
                    src={pkmn.activeSpriteUrl || pkmn.species.spriteUrl}
                    alt={pkmn.nickname}
                    className="battle-sprite"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Player Active Side (Bottom) */}
        <div className="active-side player-side">
          {myActiveIndices.map((idx, slotNum) => {
            const pkmn = myTeamState[idx];
            if (!pkmn) return null;
            const hpPct = Math.round((pkmn.currentHp / pkmn.maxStats.hp) * 100);
            const isActor = slotNum === selectedActorIndex;

            return (
              <div
                key={pkmn.instanceId}
                className={`pokemon-battle-card my-card ${isActor ? 'selecting-actor' : ''}`}
              >
                <div className="pokemon-stage">
                  <div className="battle-pedestal" />
                  {isActor && <div className="active-indicator-pulse" />}
                  <img
                    src={pkmn.activeSpriteUrl || pkmn.species.spriteUrl}
                    alt={pkmn.nickname}
                    className="battle-sprite"
                  />
                </div>

                <div className="hp-bar-container">
                  <div className="pkmn-meta">
                    <span className="pkmn-name">{pkmn.nickname}</span>
                    <span className="pkmn-lvl">Lv. {pkmn.level}</span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    {pkmn.species.types.map((t) => (
                      <span key={t} className={`type-tag type-${t.toLowerCase()}`} style={{ fontSize: '0.55rem', padding: '0.05rem 0.35rem' }}>
                        {t}
                      </span>
                    ))}
                    {pkmn.status && (
                      <span className={`status-pill status-${pkmn.status.toLowerCase().slice(0, 3)}`}>
                        {pkmn.status === 'Burn' ? '🔥 BRN' :
                         pkmn.status === 'Paralysis' ? '⚡ PAR' :
                         pkmn.status === 'Freeze' ? '❄️ FRZ' :
                         pkmn.status === 'Sleep' ? '💤 SLP' :
                         '☠️ PSN'}
                      </span>
                    )}
                    {isActor && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/50 animate-pulse">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="hp-bar-track">
                    <div
                      className={`hp-bar-fill ${
                        hpPct < 20 ? 'critical' : hpPct < 50 ? 'warning' : 'healthy'
                      }`}
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                  <span className="hp-text">{pkmn.currentHp} / {pkmn.maxStats.hp} HP</span>

                  {/* Stat Stage Chips */}
                  {Object.entries(pkmn.statStages || {}).some(([, val]) => val !== 0) && (
                    <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-glass">
                      {Object.entries(pkmn.statStages).map(([stat, val]) => {
                        if (!val) return null;
                        const isPos = val > 0;
                        const label = stat === 'spAtk' ? 'SpA' : stat === 'spDef' ? 'SpD' : stat.slice(0, 3).toUpperCase();
                        return (
                          <span key={stat} className={`stat-stage-badge ${isPos ? 'positive' : 'negative'}`}>
                            {isPos ? `▲ +${val}` : `▼ ${val}`} {label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Deck & Battle Log */}
      <div className="battle-bottom-deck grid grid-cols-3 gap-4">
        {/* Moves & Actions Menu (2 Columns width) */}
        <div className="moves-menu-panel col-span-2 space-y-3">
          {currentActorPkmn && !winner && (
            <div>
              <div className="actor-header flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">Action for: {currentActorPkmn.nickname}</h3>
                  {(pendingActions.length > 0 || selectedActorIndex > 0) && (
                    <button
                      className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1.5 font-semibold text-amber-300 border-amber-500/50 hover:bg-amber-950/40"
                      onClick={handleUndoAction}
                      title="Undo previous slot action selection"
                    >
                      <ArrowLeft size={14} /> Back / Change Previous Action
                    </button>
                  )}
                </div>

                {getMatchingMegaForm(currentActorPkmn) && (
                  <button
                    className={`btn-secondary text-xs px-3 py-1 flex items-center gap-1 font-bold ${
                      isMegaChecked ? 'bg-amber-500 text-black border-amber-400' : 'text-amber-400 border-amber-500/50'
                    }`}
                    onClick={() => setIsMegaChecked(!isMegaChecked)}
                  >
                    ⚡ {isMegaChecked ? 'Mega Evolution Active!' : `Mega Evolve (${getMatchingMegaForm(currentActorPkmn)?.megaName})`}
                  </button>
                )}
              </div>

              <div className="moves-buttons-grid grid grid-cols-2 gap-3">
                {currentActorPkmn.moves.map(({ move, currentPp }) => (
                  <button
                    key={move.id}
                    className={`btn-move move-type-${move.type.toLowerCase()}`}
                    onClick={() => handleSelectMove(move)}
                    disabled={currentPp <= 0 || isTurnProcessing}
                  >
                    <div className="move-btn-top">
                      <span className="move-title">{move.name}</span>
                      <span className="move-pp">{currentPp}/{move.maxPp} PP</span>
                    </div>
                    <div className="move-btn-bottom">
                      <span className={`type-tag type-${move.type.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.45rem' }}>
                        {move.type}
                      </span>
                      <span className="move-bp">
                        {move.category} • {move.power ? `${move.power} BP` : 'Status'} • {move.accuracy || 100}% Acc
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {winner && (
            <div className="victory-card flex flex-col items-center justify-center p-6">
              <Award size={48} className="text-yellow-400 mb-2" />
              <h2>{winner === 'Player' ? 'Victory!' : winner === 'Draw' ? 'Draw!' : 'Defeat!'}</h2>
              <button className="btn-primary mt-4 flex items-center gap-2" onClick={onExit}>
                <ArrowLeft size={16} /> Return to Lobby
              </button>
            </div>
          )}
        </div>

        {/* Live Battle Log Feed */}
        <div className="battle-log-panel col-span-1">
          <h4 className="font-bold text-sm text-slate-200">Battle Log</h4>
          <div className="battle-log-feed">
            {battleLog.map((log, i) => (
              <p key={i} className="log-line">
                {log}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Target Selection Modal */}
      {targetModalMove && (
        <div className="modal-overlay fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="modal-card bg-slate-900 border border-glass p-6 rounded-2xl max-w-lg w-full text-center space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-glass pb-2">
              <h3 className="font-bold text-base text-white">Select Target for {targetModalMove.name}</h3>
              <button
                className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1 text-amber-300 border-amber-500/40"
                onClick={() => setTargetModalMove(null)}
              >
                <ArrowLeft size={14} /> Back to Moves
              </button>
            </div>
            <div className="target-buttons grid grid-cols-2 gap-3 pt-2">
              {oppActiveIndices.map((idx, slot) => {
                const oppPkmn = opponentTeamState[idx];
                if (!oppPkmn || oppPkmn.isFainted) return null;
                const hpPct = Math.round((oppPkmn.currentHp / oppPkmn.maxStats.hp) * 100);
                return (
                  <button
                    key={slot}
                    className="reticle-target p-4 rounded-xl border border-glass bg-slate-900/80 flex flex-col items-center group cursor-pointer"
                    onClick={() => handleTargetConfirm(slot)}
                  >
                    <div className="relative mb-2">
                      <img src={oppPkmn.activeSpriteUrl || oppPkmn.species.spriteUrl} alt={oppPkmn.nickname} className="w-16 h-16 object-contain group-hover:scale-110 transition-transform duration-300" />
                      {/* Animated crosshair overlay on hover */}
                      <div className="absolute inset-0 border-2 border-indigo-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping pointer-events-none" style={{ animationDuration: '1.5s' }} />
                    </div>
                    <span className="text-sm font-extrabold text-white tracking-wide">Slot {slot + 1}: {oppPkmn.nickname}</span>
                    <div className="flex gap-1 my-1">
                      {oppPkmn.species.types.map((t) => (
                        <span key={t} className={`type-tag type-${t.toLowerCase()}`} style={{ fontSize: '0.55rem', padding: '0.05rem 0.35rem' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full ${hpPct < 20 ? 'bg-rose-500' : hpPct < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${hpPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5">{oppPkmn.currentHp} / {oppPkmn.maxStats.hp} HP</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Replacement Selection Modal - Only shown after everyone's turn is finished */}
      {pendingReplacements.length > 0 && (
        <div className="modal-overlay fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-in">
          <div className="modal-card bg-slate-900 border border-indigo-500/60 p-6 rounded-2xl max-w-xl w-full text-center space-y-4 shadow-2xl">
            <div className="text-center pb-2 border-b border-glass">
              <h3 className="font-extrabold text-lg text-white flex items-center justify-center gap-2">
                ⚠️ Send Out Replacement Pokémon
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                <strong className="text-rose-400">{pendingReplacements[0].faintedMonName}</strong> fainted! Choose a bench Pokémon to send out:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {myTeamState.map((pkmn, benchIdx) => {
                const isCurrentlyActive = myActiveIndices.includes(benchIdx);
                const isFainted = pkmn.isFainted || pkmn.currentHp <= 0;
                if (isCurrentlyActive || isFainted) return null;

                const spec = pkmn.species;
                const hpPct = Math.round((pkmn.currentHp / pkmn.maxStats.hp) * 100);

                return (
                  <button
                    key={pkmn.instanceId}
                    onClick={() => handleChooseReplacement(benchIdx)}
                    className="p-3 rounded-xl border border-glass bg-slate-950/80 hover:bg-indigo-950/80 hover:border-indigo-400 flex items-center gap-3 transition-all text-left group"
                  >
                    <img
                      src={pkmn.activeSpriteUrl || spec.spriteUrl}
                      alt={pkmn.nickname}
                      className="w-14 h-14 object-contain group-hover:scale-110 transition-transform"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white truncate">{pkmn.nickname}</div>
                      <div className="text-xs text-slate-400">Lv. {pkmn.level}</div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
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

      {/* Battle Calculator In-Battle Modal */}
      {showBattleCalc && (
        <div className="modal-overlay fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-in">
          <div className="bg-slate-950 border border-glass rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto p-4 shadow-2xl relative">
            <button
              className="btn-secondary absolute top-4 right-4 text-xs px-3 py-1 flex items-center gap-1 text-slate-300 hover:text-white"
              onClick={() => setShowBattleCalc(false)}
            >
              <X size={16} /> Close Calculator
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
    </div>
  );
};

