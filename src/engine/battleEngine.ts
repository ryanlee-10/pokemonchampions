import type { ActivePokemonState, BattleAction, BattleFieldConditions, BattleFormat } from '../types/pokemon';
import { MOVES_DATABASE } from '../data/moves';
import { getTypeEffectiveness } from '../data/typeChart';
import { calculateAllStats, getStatStageMultiplier } from './statCalc';
import { calculateDamage, isGrounded, INTIMIDATE_IMMUNE, type CalcFieldConditions } from './damageCalc';
import { hasSecondaryEffect, makesContact } from '../data/moveFlags';

export const STAT_DISPLAY_NAMES: Record<string, string> = {
  attack: 'Attack',
  defense: 'Defense',
  spAtk: 'Sp. Atk',
  spDef: 'Sp. Def',
  speed: 'Speed',
  accuracy: 'Accuracy',
  evasion: 'Evasiveness'
};

export type LogMeta = {
  kind?: 'damage' | 'heal' | 'status' | 'stat' | 'faint' | 'ability' | 'field' | 'switch' | 'move';
  id?: string;
  amount?: number;
  stat?: string;
  dir?: 'up' | 'down';
  field?: any;
  moveId?: string;
  moveType?: string;
  category?: 'Physical' | 'Special' | 'Status';
  targetSlot?: number;
  targetId?: string;
};

export type Logger = (msg: string, meta?: LogMeta) => void;

/** Visual-only state of a Pokémon captured at the moment a log line was emitted. */
export type MonSnapshot = Pick<
  ActivePokemonState,
  'currentHp' | 'maxStats' | 'isFainted' | 'status' | 'statStages' | 'activeSpriteUrl' | 'isMegaEvolved' | 'activeTypes' | 'ability' | 'item' | 'nickname'
>;

/** Snapshot of both sides at a point during turn resolution (used for step-by-step replay). */
export type TurnSnapshot = {
  host: MonSnapshot[];
  guest: MonSnapshot[];
  hostActive: number[];
  guestActive: number[];
};

export type TurnLogEntry = { text: string; meta?: LogMeta; snap?: TurnSnapshot };

const snapshotMon = (p: ActivePokemonState): MonSnapshot => ({
  currentHp: p.currentHp,
  maxStats: p.maxStats,
  isFainted: p.isFainted,
  status: p.status,
  statStages: { ...p.statStages },
  activeSpriteUrl: p.activeSpriteUrl,
  isMegaEvolved: p.isMegaEvolved,
  activeTypes: p.activeTypes ? [...p.activeTypes] : undefined,
  ability: p.ability,
  item: p.item,
  nickname: p.nickname
});

export const applyEntranceHazards = (
  enteringMon: ActivePokemonState,
  currentFields: BattleFieldConditions,
  isMyMon: boolean,
  logger: Logger
): BattleFieldConditions => {
  const updated = { ...currentFields };
  if (!enteringMon || enteringMon.isFainted || enteringMon.currentHp <= 0) return updated;

  const hasStealthRock = isMyMon ? updated.stealthRockTeam1 : updated.stealthRockTeam2;
  const toxicSpikesLayers = isMyMon ? updated.toxicSpikesTeam1 : updated.toxicSpikesTeam2;

  // 1. Stealth Rock
  if (hasStealthRock) {
    const monTypes = enteringMon.activeTypes || enteringMon.species.types;
    const rockEffectiveness = getTypeEffectiveness('Rock', monTypes);
    const damageFraction = (1 / 8) * rockEffectiveness;
    const rockDamage = Math.max(1, Math.floor(enteringMon.maxStats.hp * damageFraction));
    enteringMon.currentHp = Math.max(0, enteringMon.currentHp - rockDamage);
    logger(`🪨 Pointed stones dug into ${enteringMon.nickname}! (-${rockDamage} HP)`, {
      kind: 'damage',
      id: enteringMon.instanceId,
      amount: rockDamage
    });
    if (enteringMon.currentHp <= 0) {
      enteringMon.isFainted = true;
      logger(`${enteringMon.nickname} fainted!`, { kind: 'faint', id: enteringMon.instanceId });
      return updated;
    }
  }

  // 2. Toxic Spikes
  if (toxicSpikesLayers && toxicSpikesLayers > 0 && isGrounded(enteringMon)) {
    const monTypes = enteringMon.activeTypes || enteringMon.species.types;
    if (monTypes.includes('Poison')) {
      if (isMyMon) updated.toxicSpikesTeam1 = 0;
      else updated.toxicSpikesTeam2 = 0;
      logger(`☠️ ${enteringMon.nickname} absorbed the Toxic Spikes from the ground!`, { kind: 'field' });
    } else if (!monTypes.includes('Steel') && !enteringMon.status && enteringMon.ability !== 'Immunity') {
      enteringMon.status = 'Poison';
      logger(`☠️ ${enteringMon.nickname} was poisoned by the Toxic Spikes!`, { kind: 'status', id: enteringMon.instanceId });
    }
  }

  return updated;
};

export const checkEntranceAbilities = (
  enteringMon: ActivePokemonState,
  currentFields: BattleFieldConditions,
  logger: Logger,
  foes?: ActivePokemonState[],
  allies?: ActivePokemonState[]
): BattleFieldConditions => {
  const updated = { ...currentFields };
  const ab = enteringMon.ability;
  const announce = () =>
    logger(`${enteringMon.nickname}'s ${ab}`, { kind: 'ability', id: enteringMon.instanceId, field: { ...updated } });
  const effect = (text: string) => logger(text, { kind: 'field', field: { ...updated } });
  const terrainTurns = enteringMon.item === 'terrain_extender' ? 8 : 5;
  if (ab === 'Grassy Surge') {
    updated.terrain = 'Grassy';
    updated.terrainTurns = terrainTurns;
    announce();
    effect('The battlefield turned grassy!');
  } else if (ab === 'Psychic Surge') {
    updated.terrain = 'Psychic';
    updated.terrainTurns = terrainTurns;
    announce();
    effect('The battlefield got weird!');
  } else if (ab === 'Electric Surge' || ab === 'Hadron Engine') {
    updated.terrain = 'Electric';
    updated.terrainTurns = terrainTurns;
    announce();
    effect('An electric current ran across the battlefield!');
  } else if (ab === 'Misty Surge') {
    updated.terrain = 'Misty';
    updated.terrainTurns = terrainTurns;
    announce();
    effect('Mist swirled about the battlefield!');
  } else if (ab === 'Drought') {
    updated.weather = 'Sun';
    updated.weatherTurns = enteringMon.item === 'heat_rock' ? 8 : 5;
    announce();
    effect('The sunlight turned harsh!');
  } else if (ab === 'Drizzle') {
    updated.weather = 'Rain';
    updated.weatherTurns = enteringMon.item === 'damp_rock' ? 8 : 5;
    announce();
    effect('It started to rain!');
  } else if (ab === 'Sand Stream') {
    updated.weather = 'Sandstorm';
    updated.weatherTurns = enteringMon.item === 'smooth_rock' ? 8 : 5;
    announce();
    effect('A sandstorm kicked up!');
  } else if (ab === 'Snow Warning') {
    updated.weather = 'Snow';
    updated.weatherTurns = enteringMon.item === 'icy_rock' ? 8 : 5;
    announce();
    effect('It started to snow!');
  } else if (ab === 'Hospitality') {
    announce();
    (allies || [])
      .filter((a) => a && !a.isFainted && a.currentHp > 0 && a.instanceId !== enteringMon.instanceId)
      .forEach((ally) => {
        const heal = Math.floor(ally.maxStats.hp / 4);
        ally.currentHp = Math.min(ally.maxStats.hp, ally.currentHp + heal);
        logger(`🍵 ${enteringMon.nickname} served matcha hospitality to ${ally.nickname}! (+${heal} HP)`, {
          kind: 'heal',
          id: ally.instanceId,
          amount: heal
        });
      });
  } else if (ab === 'Trace') {
    const validFoes = (foes || []).filter((f) => f && !f.isFainted && f.ability && f.ability !== 'Trace' && f.ability !== 'Disguise');
    if (validFoes.length > 0) {
      const targetFoe = validFoes[Math.floor(Math.random() * validFoes.length)];
      enteringMon.ability = targetFoe.ability;
      logger(`✨ ${enteringMon.nickname} traced ${targetFoe.nickname}'s ${targetFoe.ability}!`, {
        kind: 'ability',
        id: enteringMon.instanceId
      });
    }
  } else if (ab === 'Frisk') {
    (foes || []).filter((f) => f && !f.isFainted && f.item && f.item !== 'none').forEach((foe) => {
      logger(`🔍 ${enteringMon.nickname} frisked ${foe.nickname} and found its ${foe.item.replace(/_/g, ' ')}!`, {
        kind: 'ability',
        id: enteringMon.instanceId
      });
    });
  } else if (ab === 'Unnerve') {
    announce();
    logger(`😱 The opposing team is too nervous to eat Berries!`);
  } else if (ab === 'Intimidate') {
    announce();
    (foes || [])
      .filter((f) => f && !f.isFainted && f.currentHp > 0)
      .forEach((foe) => {
        if (INTIMIDATE_IMMUNE.includes(foe.ability)) {
          logger(`${foe.nickname}'s ${foe.ability} prevents Attack loss!`, { kind: 'ability', id: foe.instanceId });
          return;
        }
        if (foe.item === 'clear_amulet') {
          logger(`${foe.nickname}'s Clear Amulet prevents its stats from being lowered!`, { kind: 'ability', id: foe.instanceId });
          return;
        }
        const cur = foe.statStages.attack || 0;
        if (cur <= -6) {
          logger(`${foe.nickname}'s Attack won't go any lower!`, { kind: 'stat', id: foe.instanceId });
          return;
        }
        foe.statStages.attack = cur - 1;
        logger(`${foe.nickname}'s Attack dropped by 1 stage!`, { kind: 'stat', id: foe.instanceId, dir: 'down', stat: 'attack' });
        if (foe.ability === 'Defiant') {
          foe.statStages.attack = Math.min(6, foe.statStages.attack + 2);
          logger(`${foe.nickname}'s Defiant sharply raised its Attack!`, { kind: 'stat', id: foe.instanceId, dir: 'up', stat: 'attack' });
        } else if (foe.ability === 'Competitive') {
          foe.statStages.spAtk = Math.min(6, (foe.statStages.spAtk || 0) + 2);
          logger(`${foe.nickname}'s Competitive sharply raised its Sp. Atk!`, { kind: 'stat', id: foe.instanceId, dir: 'up', stat: 'spAtk' });
        }
      });
  }
  return updated;
};

export const resolveTurnCore = (

    myActs: BattleAction[],
    oppActs: BattleAction[],
    currentHostTeam: ActivePokemonState[],
    currentGuestTeam: ActivePokemonState[],
    currentField: BattleFieldConditions,
    hostActiveSlots: number[],
    guestActiveSlots: number[],
    format: BattleFormat
  ) => {
    const turnLogs: TurnLogEntry[] = [];
    // Active-slot arrays used for snapshots (swapped to the post-replacement arrays at end of turn)
    let snapHostActive: number[] = hostActiveSlots;
    let snapGuestActive: number[] = guestActiveSlots;
    const pushLog = (txt: string, meta?: LogMeta) => {
      turnLogs.push({
        text: txt,
        meta,
        snap: {
          host: nextMyTeam.map(snapshotMon),
          guest: nextOppTeam.map(snapshotMon),
          hostActive: [...snapHostActive],
          guestActive: [...snapGuestActive]
        }
      });
    };

    // Deep clone team states and field
    let nextMyTeam = currentHostTeam.map((p) => ({
      ...p,
      activeTypes: p.activeTypes ? [...p.activeTypes] : undefined,
      statStages: { ...p.statStages },
      moves: p.moves.map((m) => ({ ...m }))
    }));
    let nextOppTeam = currentGuestTeam.map((p) => ({
      ...p,
      activeTypes: p.activeTypes ? [...p.activeTypes] : undefined,
      statStages: { ...p.statStages },
      moves: p.moves.map((m) => ({ ...m }))
    }));
    let activeField: BattleFieldConditions = { ...currentField };

    const alivePlayerActiveIndices = hostActiveSlots.filter((idx) => {
      const p = nextMyTeam[idx];
      return p && !p.isFainted && p.currentHp > 0;
    });
    const aliveOppActiveIndices = guestActiveSlots.filter((idx) => {
      const p = nextOppTeam[idx];
      return p && !p.isFainted && p.currentHp > 0;
    });

    const getEffectiveSpeed = (pkmn: ActivePokemonState | undefined, isPlayer: boolean, action?: BattleAction): number => {
      if (!pkmn) return 0;

      let baseSpeed = pkmn.maxStats.speed;
      
      // Look ahead for Mega Evolution speed update
      if (action?.megaEvolve && !pkmn.isMegaEvolved && pkmn.species.megaForm) {
        const megaForms = Array.isArray(pkmn.species.megaForm) ? pkmn.species.megaForm : [pkmn.species.megaForm];
        const matchingMega = megaForms.find((mf) => mf.megaStoneId === pkmn.item);
        if (matchingMega) {
          const megaSpecies = { ...pkmn.species, baseStats: matchingMega.megaBaseStats };
          const dummyCustom = {
            id: pkmn.instanceId,
            speciesId: pkmn.species.id,
            nickname: pkmn.nickname,
            level: pkmn.level,
            item: pkmn.item,
            ability: matchingMega.megaAbility,
            nature: pkmn.originalNature || 'Hardy',
            evs: pkmn.originalEvs || { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
            moves: []
          };
          baseSpeed = calculateAllStats(dummyCustom, megaSpecies).speed;
        }
      }

      let spd = baseSpeed * ((pkmn.statStages?.speed && pkmn.statStages.speed !== 0) ? (pkmn.statStages.speed > 0 ? (2 + pkmn.statStages.speed) / 2 : 2 / (2 - pkmn.statStages.speed)) : 1);
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
      if (pkmn.ability === 'Unburden' && pkmn.itemConsumed) {
        spd = Math.floor(spd * 2);
      }
      const isTailwind = isPlayer ? Boolean(activeField.tailwindTeam1 && activeField.tailwindTeam1 > 0) : Boolean(activeField.tailwindTeam2 && activeField.tailwindTeam2 > 0);
      if (isTailwind) {
        spd = Math.floor(spd * 2);
      }
      return spd;
    };

    // Combine actions and sort by priority & speed
    const allActions: {
      action: BattleAction;
      isMyAction: boolean;
      actorTeamIndex: number;
      speed: number;
      priority: number;
      randomTiebreaker: number;
    }[] = [];

    myActs.forEach((act) => {
      const actualSlotIdx = alivePlayerActiveIndices[act.actorIndex] ?? hostActiveSlots[act.actorIndex] ?? hostActiveSlots[0];
      const actorPkmn = nextMyTeam[actualSlotIdx];
      let priority = 0;
      if (act.type === 'SWITCH') {
        priority = 6;
      } else {
        const move = act.moveId ? MOVES_DATABASE[act.moveId] : null;
        priority = move ? move.priority || 0 : 0;
        if (move && move.id === 'grassy_glide' && activeField.terrain === 'Grassy' && actorPkmn && isGrounded(actorPkmn)) {
          priority = 1;
        }
        if (actorPkmn && actorPkmn.ability === 'Prankster' && move && move.category === 'Status') {
          priority += 1;
        }
      }
      allActions.push({
        action: act,
        isMyAction: true,
        actorTeamIndex: actualSlotIdx,
        speed: getEffectiveSpeed(actorPkmn, true, act),
        priority,
        randomTiebreaker: Math.random()
      });
    });

    oppActs.forEach((act) => {
      const actualSlotIdx = aliveOppActiveIndices[act.actorIndex] ?? guestActiveSlots[act.actorIndex] ?? guestActiveSlots[0];
      const actorPkmn = nextOppTeam[actualSlotIdx];
      let priority = 0;
      if (act.type === 'SWITCH') {
        priority = 6;
      } else {
        const move = act.moveId ? MOVES_DATABASE[act.moveId] : null;
        priority = move ? move.priority || 0 : 0;
        if (move && move.id === 'grassy_glide' && activeField.terrain === 'Grassy' && actorPkmn && isGrounded(actorPkmn)) {
          priority = 1;
        }
        if (actorPkmn && actorPkmn.ability === 'Prankster' && move && move.category === 'Status') {
          priority += 1;
        }
      }
      allActions.push({
        action: act,
        isMyAction: false,
        actorTeamIndex: actualSlotIdx,
        speed: getEffectiveSpeed(actorPkmn, false, act),
        priority,
        randomTiebreaker: Math.random()
      });
    });

    // Sort by priority desc, then speed desc (or asc in Trick Room), then random tiebreaker
    allActions.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      
      let speedDiff = b.speed - a.speed;
      if (activeField.trickRoom && activeField.trickRoom > 0) {
        speedDiff = a.speed - b.speed;
      }
      
      if (speedDiff === 0) {
        return b.randomTiebreaker - a.randomTiebreaker;
      }
      return speedDiff;
    });

    // Track conditions activated during this turn so they don't decrement on the setup turn
    const conditionsSetThisTurn = new Set<string>();

    // Execute actions sequentially
    allActions.forEach(({ action, isMyAction, actorTeamIndex }) => {
      const attackerTeam = isMyAction ? nextMyTeam : nextOppTeam;
      const defenderTeam = isMyAction ? nextOppTeam : nextMyTeam;
      const attackerActiveIndices = isMyAction ? hostActiveSlots : guestActiveSlots;
      const defenderActiveIndices = isMyAction ? guestActiveSlots : hostActiveSlots;

      const attacker = attackerTeam[actorTeamIndex];

      if (!attacker || attacker.isFainted || attacker.currentHp <= 0) return;

      // Handle SWITCH
      if (action.type === 'SWITCH' && action.switchToTeamIndex !== undefined) {
        const newPkmn = attackerTeam[action.switchToTeamIndex];
        if (newPkmn && newPkmn.currentHp > 0) {
          // Switch-out abilities: Regenerator & Natural Cure
          if (attacker.ability === 'Regenerator') {
            const regenAmount = Math.floor(attacker.maxStats.hp / 3);
            attacker.currentHp = Math.min(attacker.maxStats.hp, attacker.currentHp + regenAmount);
            pushLog(`✨ ${attacker.nickname}'s Regenerator restored HP!`, {
              kind: 'heal',
              id: attacker.instanceId,
              amount: regenAmount
            });
          }
          if (attacker.ability === 'Natural Cure' && attacker.status) {
            pushLog(`🌿 ${attacker.nickname}'s Natural Cure healed its status condition!`, {
              kind: 'status',
              id: attacker.instanceId
            });
            attacker.status = undefined;
          }

          pushLog(`🔄 ${attacker.nickname} withdrew! Go! ${newPkmn.nickname}!`);
          const slotPos = attackerActiveIndices.indexOf(actorTeamIndex);
          if (slotPos !== -1) {
            attackerActiveIndices[slotPos] = action.switchToTeamIndex;
          }
          attacker.statStages = { attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 };
          attacker.turnsOnField = 0; // Bench reset
          attacker.proteanUsed = false;
          attacker.activeTypes = undefined;
          newPkmn.turnsOnField = 0; // Freshly entered field! Becomes 1 at end of turn for next attack turn!
          newPkmn.proteanUsed = false;

          // Hazards apply on entry!
          activeField = applyEntranceHazards(newPkmn, activeField, isMyAction, pushLog);

          if (!newPkmn.isFainted) {
            const foes = defenderActiveIndices
              .map((i) => defenderTeam[i])
              .filter((f) => f && !f.isFainted && f.currentHp > 0);
            const allies = attackerActiveIndices
              .map((i) => attackerTeam[i])
              .filter((a) => a && !a.isFainted && a.currentHp > 0);
            activeField = checkEntranceAbilities(newPkmn, activeField, pushLog, foes, allies);
          }
        }
        return;
      }

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
            nature: attacker.originalNature || 'Hardy',
            evs: attacker.originalEvs || { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
            moves: []
          };
          attacker.maxStats = calculateAllStats(dummyCustom, megaSpecies);
          pushLog(`✨ ${attacker.nickname} Mega Evolved! Ability became ${matchingMega.megaAbility}!`);
        }
      }

      // Handle Flinching
      if (attacker.isFlinched) {
        attacker.isFlinched = false;
        pushLog(`😵 ${attacker.nickname} flinched and couldn't move!`);
        return;
      }

      // Handle Recharge turn requirement
      if (attacker.mustRecharge) {
        attacker.mustRecharge = false;
        pushLog(`${attacker.nickname} must recharge and cannot move!`);
        return;
      }

      if (action.type === 'MOVE' && action.moveId) {
        const move = MOVES_DATABASE[action.moveId];
        if (!move) return;

        // Check disabled move (Cursed Body)
        if (attacker.disabledMoveId === move.id) {
          pushLog(`🚫 ${attacker.nickname}'s ${move.name} is disabled and cannot be used!`);
          return;
        }

        // Decrement move PP properly! (Pressure consumes 2 PP if opponent has Pressure)
        const moveEntry = attacker.moves.find((m) => m.move.id === move.id);
        if (moveEntry && moveEntry.currentPp > 0) {
          const hasPressureOpponent = defenderTeam.some(
            (d, idx) => defenderActiveIndices.includes(idx) && d && !d.isFainted && d.ability === 'Pressure'
          );
          const ppCost = hasPressureOpponent ? 2 : 1;
          moveEntry.currentPp = Math.max(0, moveEntry.currentPp - ppCost);
        }

        // Protean Ability: Transforms user's type to match the move before executing!
        if (attacker.ability === 'Protean' && !attacker.proteanUsed && move.type) {
          attacker.activeTypes = [move.type];
          attacker.proteanUsed = true;
          pushLog(`🦎 ${attacker.nickname}'s Protean changed its type to ${move.type}!`, {
            kind: 'ability',
            id: attacker.instanceId
          });
        }

        // Reset Glaive Rush vulnerability on attacker's turn
        attacker.isGlaiveRushVulnerable = false;

        // First Impression & Fake Out: Fail if not used on the first turn out on the field
        if ((move.id === 'first_impression' || move.id === 'fake_out') && (attacker.turnsOnField || 1) > 1) {
          pushLog(`${attacker.nickname} used ${move.name}... but it failed!`);
          return;
        }

        // Handle Weather-setting moves (Sunny Day, Rain Dance, Sandstorm, Snowscape)
        if (move.weatherEffect) {
          activeField = { ...activeField, weather: move.weatherEffect, weatherTurns: 5 };
          conditionsSetThisTurn.add('weather');
          const weatherText: Record<string, string> = {
            Sun: '☀️ The sunlight turned harsh!',
            Rain: '🌧️ Heavy rain began to fall!',
            Sandstorm: '⏳ A sandstorm kicked up!',
            Snow: '🌨️ It began to snow!'
          };
          pushLog(weatherText[move.weatherEffect] || `The weather changed to ${move.weatherEffect}!`);
        }

        // Handle Terrain-setting moves (Grassy Terrain, Psychic Terrain, Electric Terrain, Misty Terrain)
        if (move.terrainEffect) {
          activeField = { ...activeField, terrain: move.terrainEffect, terrainTurns: 5 };
          conditionsSetThisTurn.add('terrain');
          const terrainText: Record<string, string> = {
            Grassy: '🌿 The battlefield turned grassy!',
            Psychic: '🔮 The battlefield got weird!',
            Electric: '⚡ An electric current ran across the battlefield!',
            Misty: '🌫️ Mist swirled around the battlefield!'
          };
          pushLog(terrainText[move.terrainEffect] || `The terrain became ${move.terrainEffect}!`);
        }

        // Handle Charging turn requirement (1-turn instant in matching weather: Solar Beam in Sun, Electro Shot in Rain)
        if (move.requiresCharge && !attacker.isChargingMove) {
          const isInstantWeather =
            (move.id === 'solar_beam' && (activeField.weather === 'Sun' || attacker.ability === 'Drought')) ||
            (move.id === 'electro_shot' && (activeField.weather === 'Rain' || attacker.ability === 'Drizzle'));

          if (!isInstantWeather) {
            attacker.isChargingMove = true;
            pushLog(`⚡ ${attacker.nickname} is absorbing energy for ${move.name}!`);
            return;
          } else {
            const weatherName = move.id === 'solar_beam' ? 'harsh sunlight' : 'heavy rain';
            pushLog(`✨ ${attacker.nickname} absorbed energy for ${move.name} instantly in the ${weatherName}!`);
          }
        }
        if (attacker.isChargingMove) {
          attacker.isChargingMove = false;
        }

        // Set Recharge for next turn if move requires it (e.g. Hyper Beam)
        if (move.requiresRecharge) {
          attacker.mustRecharge = true;
        }

        const moveLogMeta: LogMeta = {
          kind: 'move',
          id: attacker.instanceId,
          moveId: move.id,
          moveType: move.type,
          category: move.category,
          targetSlot: action.targetSlot
        };

        // Glaive Rush: User takes 2x double damage until its next move
        if (move.id === 'glaive_rush') {
          attacker.isGlaiveRushVulnerable = true;
          pushLog(`⚠️ ${attacker.nickname} used Glaive Rush and is vulnerable to double damage!`, moveLogMeta);
        } else {
          pushLog(`${attacker.nickname} used ${move.name}!`, moveLogMeta);
        }

        // Double Shock: User loses Electric typing until switched out
        if (move.id === 'double_shock') {
          const currentTypes = attacker.activeTypes || attacker.species.types;
          if (currentTypes.includes('Electric')) {
            attacker.activeTypes = currentTypes.filter((t) => t !== 'Electric');
            pushLog(`⚡ ${attacker.nickname} used up all its electricity and lost its Electric typing!`);
          }
        }

        const checkMoveHit = (m: typeof move, _atk: typeof attacker, def: typeof attacker): boolean => {
          if (def.isGlaiveRushVulnerable) return true; // All moves hit during Glaive Rush vulnerability
          if (activeField.weather === 'Rain' && (m.id === 'thunder' || m.id === 'hurricane')) return true;
          if (activeField.weather === 'Sun' && (m.id === 'thunder' || m.id === 'hurricane')) {
            return Math.random() * 100 <= 50; // Accuracy drops to 50% in Sun
          }
          if (m.accuracy === null || m.accuracy === undefined || m.accuracy === 0) return true;
          let finalAccuracy = m.accuracy;
          if (_atk.item === 'wide_lens') finalAccuracy *= 1.1;
          return Math.random() * 100 <= finalAccuracy;
        };

        let moveEffectivePriority = move.priority || 0;
        if (move.id === 'grassy_glide' && activeField.terrain === 'Grassy' && isGrounded(attacker)) {
          moveEffectivePriority = 1;
        }
        if (attacker.ability === 'Prankster' && move.category === 'Status') {
          moveEffectivePriority += 1;
        }

        const checkWhiteHerb = (pkmn: ActivePokemonState) => {
          if (pkmn.item === 'white_herb' && !pkmn.itemConsumed && pkmn.statStages) {
            const hasDrop = Object.values(pkmn.statStages).some((v) => v < 0);
            if (hasDrop) {
              (Object.keys(pkmn.statStages) as (keyof typeof pkmn.statStages)[]).forEach((k) => {
                if (pkmn.statStages[k] < 0) pkmn.statStages[k] = 0;
              });
              pkmn.itemConsumed = true;
              pushLog(`🌿 ${pkmn.nickname} restored its lowered stats using its White Herb!`);
            }
          }
        };

        const applyStatStages = (target: ActivePokemonState, stat: string, stages: number) => {
          if (!target || target.isFainted || !target.statStages) return;
          const statKey = stat as keyof typeof target.statStages;
          if (!(statKey in target.statStages)) return;

          // Clear Body / White Smoke / Full Metal Body prevents stat reduction from opponent
          if (stages < 0 && target !== attacker) {
            if (target.ability === 'Clear Body' || target.ability === 'White Smoke' || target.ability === 'Full Metal Body') {
              pushLog(`🛡️ ${target.nickname}'s ${target.ability} prevents stat reduction!`, {
                kind: 'ability',
                id: target.instanceId
              });
              return;
            }
            if (target.ability === 'Mirror Armor') {
              pushLog(`🪞 ${target.nickname}'s Mirror Armor reflected the stat drop!`);
              applyStatStages(attacker, stat, stages);
              return;
            }
          }

          const currentStage = target.statStages[statKey] || 0;
          if (stages > 0 && currentStage >= 6) {
            pushLog(`${target.nickname}'s ${STAT_DISPLAY_NAMES[statKey] || statKey} won't go any higher!`);
            return;
          }
          if (stages < 0 && currentStage <= -6) {
            pushLog(`${target.nickname}'s ${STAT_DISPLAY_NAMES[statKey] || statKey} won't go any lower!`);
            return;
          }

          const newStage = Math.max(-6, Math.min(6, currentStage + stages));
          target.statStages[statKey] = newStage;
          const direction = stages > 0 ? 'rose' : 'fell';
          const amountText = Math.abs(stages) >= 3 ? ' drastically!' : Math.abs(stages) === 2 ? ' sharply!' : '!';
          const statNameFormatted = STAT_DISPLAY_NAMES[statKey] || statKey;
          pushLog(`${target.nickname}'s ${statNameFormatted} ${direction}${amountText}`, {
            kind: 'stat',
            id: target.instanceId,
            dir: stages > 0 ? 'up' : 'down',
            amount: Math.abs(stages),
            stat: statKey
          });

          if (stages < 0) {
            if (target !== attacker) {
              if (target.ability === 'Defiant' && target.statStages.attack < 6) {
                target.statStages.attack = Math.min(6, target.statStages.attack + 2);
                pushLog(`⚔️ ${target.nickname}'s Defiant boosted its Attack sharply!`, {
                  kind: 'stat',
                  id: target.instanceId,
                  dir: 'up',
                  amount: 2,
                  stat: 'attack'
                });
              } else if (target.ability === 'Competitive' && target.statStages.spAtk < 6) {
                target.statStages.spAtk = Math.min(6, target.statStages.spAtk + 2);
                pushLog(`🔮 ${target.nickname}'s Competitive boosted its Sp. Atk sharply!`, {
                  kind: 'stat',
                  id: target.instanceId,
                  dir: 'up',
                  amount: 2,
                  stat: 'spAtk'
                });
              }
            }
            checkWhiteHerb(target);
          }
        };

        // --- NON-DAMAGING / STATUS MOVES EXECUTION ---
        if (move.category === 'Status' || move.power === 0) {
          // 1. Protect & Shield variants
          if (move.id === 'protect' || move.id === 'spiky_shield' || move.id === 'kings_shield') {
            attacker.isProtecting = true;
            pushLog(`🛡️ ${attacker.nickname} protected itself!`);
            return;
          }
          if (move.id === 'wide_guard') {
            attacker.isProtecting = true;
            pushLog(`🛡️ ${attacker.nickname} and its allies are protected by Wide Guard!`);
            return;
          }

          // 2. Weather Moves
          if (move.id === 'sunny_day') {
            const turns = attacker.item === 'heat_rock' ? 8 : 5;
            activeField = { ...activeField, weather: 'Sun', weatherTurns: turns };
            conditionsSetThisTurn.add('weather');
            pushLog(`☀️ The sunlight turned harsh! (${turns} turns)`, { kind: 'field', field: { ...activeField } });
            return;
          }
          if (move.id === 'rain_dance') {
            const turns = attacker.item === 'damp_rock' ? 8 : 5;
            activeField = { ...activeField, weather: 'Rain', weatherTurns: turns };
            conditionsSetThisTurn.add('weather');
            pushLog(`🌧️ Heavy rain began to fall! (${turns} turns)`, { kind: 'field', field: { ...activeField } });
            return;
          }
          if (move.id === 'sandstorm') {
            const turns = attacker.item === 'smooth_rock' ? 8 : 5;
            activeField = { ...activeField, weather: 'Sandstorm', weatherTurns: turns };
            conditionsSetThisTurn.add('weather');
            pushLog(`⏳ A sandstorm kicked up! (${turns} turns)`, { kind: 'field', field: { ...activeField } });
            return;
          }
          if (move.id === 'snowscape') {
            const turns = attacker.item === 'icy_rock' ? 8 : 5;
            activeField = { ...activeField, weather: 'Snow', weatherTurns: turns };
            conditionsSetThisTurn.add('weather');
            pushLog(`🌨️ It began to snow! (${turns} turns)`, { kind: 'field', field: { ...activeField } });
            return;
          }

          // 3. Terrain Moves
          if (move.id === 'grassy_terrain') {
            const turns = attacker.item === 'terrain_extender' ? 8 : 5;
            activeField = { ...activeField, terrain: 'Grassy', terrainTurns: turns };
            conditionsSetThisTurn.add('terrain');
            pushLog(`🌿 The battlefield turned grassy! (${turns} turns)`, { kind: 'field', field: { ...activeField } });
            return;
          }
          if (move.id === 'electric_terrain') {
            const turns = attacker.item === 'terrain_extender' ? 8 : 5;
            activeField = { ...activeField, terrain: 'Electric', terrainTurns: turns };
            conditionsSetThisTurn.add('terrain');
            pushLog(`⚡ An electric current ran across the battlefield! (${turns} turns)`, { kind: 'field', field: { ...activeField } });
            return;
          }
          if (move.id === 'psychic_terrain') {
            const turns = attacker.item === 'terrain_extender' ? 8 : 5;
            activeField = { ...activeField, terrain: 'Psychic', terrainTurns: turns };
            conditionsSetThisTurn.add('terrain');
            pushLog(`🔮 The battlefield got weird! (${turns} turns)`, { kind: 'field', field: { ...activeField } });
            return;
          }
          if (move.id === 'misty_terrain') {
            const turns = attacker.item === 'terrain_extender' ? 8 : 5;
            activeField = { ...activeField, terrain: 'Misty', terrainTurns: turns };
            conditionsSetThisTurn.add('terrain');
            pushLog(`🌫️ Mist swirled around the battlefield! (${turns} turns)`, { kind: 'field', field: { ...activeField } });
            return;
          }

          // 4. Barriers, Tailwind & Trick Room
          if (move.id === 'tailwind') {
            if (isMyAction) {
              activeField = { ...activeField, tailwindTeam1: 4 };
              conditionsSetThisTurn.add('tailwindTeam1');
            } else {
              activeField = { ...activeField, tailwindTeam2: 4 };
              conditionsSetThisTurn.add('tailwindTeam2');
            }
            pushLog(`💨 The Tailwind blew from behind ${attacker.nickname}'s team! (4 turns)`, { kind: 'field', field: { ...activeField } });
            return;
          }
          if (move.id === 'trick_room') {
            if (activeField.trickRoom && activeField.trickRoom > 0) {
              activeField = { ...activeField, trickRoom: 0 };
              pushLog(`🔄 ${attacker.nickname} reversed the dimensions back to normal!`, { kind: 'field', field: { ...activeField } });
            } else {
              activeField = { ...activeField, trickRoom: 5 };
              conditionsSetThisTurn.add('trickRoom');
              pushLog(`🔄 ${attacker.nickname} twisted the dimensions! (Trick Room active for 5 turns)`, { kind: 'field', field: { ...activeField } });
            }
            return;
          }
          if (move.id === 'reflect') {
            const turns = attacker.item === 'light_clay' ? 8 : 5;
            if (isMyAction) {
              activeField = { ...activeField, reflectTeam1: turns };
              conditionsSetThisTurn.add('reflectTeam1');
            } else {
              activeField = { ...activeField, reflectTeam2: turns };
              conditionsSetThisTurn.add('reflectTeam2');
            }
            pushLog(`🧱 Reflect raised ${attacker.nickname}'s team's Defense against physical moves! (${turns} turns)`, { kind: 'field', field: { ...activeField } });
            return;
          }
          if (move.id === 'light_screen') {
            const turns = attacker.item === 'light_clay' ? 8 : 5;
            if (isMyAction) {
              activeField = { ...activeField, lightScreenTeam1: turns };
              conditionsSetThisTurn.add('lightScreenTeam1');
            } else {
              activeField = { ...activeField, lightScreenTeam2: turns };
              conditionsSetThisTurn.add('lightScreenTeam2');
            }
            pushLog(`✨ Light Screen raised ${attacker.nickname}'s team's Sp. Def against special moves! (${turns} turns)`, { kind: 'field', field: { ...activeField } });
            return;
          }
          if (move.id === 'aurora_veil') {
            if (activeField.weather !== 'Snow') {
              pushLog(`${attacker.nickname} used Aurora Veil... but it failed! (Aurora Veil requires Snow)`);
              return;
            }
            const turns = attacker.item === 'light_clay' ? 8 : 5;
            if (isMyAction) {
              activeField = { ...activeField, auroraVeilTeam1: turns };
              conditionsSetThisTurn.add('auroraVeilTeam1');
            } else {
              activeField = { ...activeField, auroraVeilTeam2: turns };
              conditionsSetThisTurn.add('auroraVeilTeam2');
            }
            pushLog(`❄️ ${attacker.nickname} set up an Aurora Veil! (${turns} turns)`, { kind: 'field', field: { ...activeField } });
            return;
          }

          // 5. Field Stat Reset
          if (move.id === 'haze') {
            [...nextMyTeam, ...nextOppTeam].forEach((p) => {
              if (p.statStages) {
                p.statStages = { attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 };
              }
            });
            pushLog(`🌫️ All stat changes were eliminated by Haze!`);
            return;
          }

          // 6. Healing & Recovery
          if (move.id === 'recover' || move.id === 'roost' || move.id === 'slack_off') {
            if (attacker.currentHp >= attacker.maxStats.hp) {
              pushLog(`${attacker.nickname}'s HP is already full!`);
              return;
            }
            const healAmount = Math.max(1, Math.floor(attacker.maxStats.hp / 2));
            attacker.currentHp = Math.min(attacker.maxStats.hp, attacker.currentHp + healAmount);
            pushLog(`💚 ${attacker.nickname} recovered 50% of its total HP! (+${healAmount} HP)`, {
              kind: 'heal',
              id: attacker.instanceId,
              amount: healAmount
            });
            return;
          }
          if (move.id === 'life_dew') {
            attackerActiveIndices.forEach((idx) => {
              const ally = attackerTeam[idx];
              if (ally && !ally.isFainted && ally.currentHp < ally.maxStats.hp) {
                const healAmount = Math.max(1, Math.floor(ally.maxStats.hp / 4));
                ally.currentHp = Math.min(ally.maxStats.hp, ally.currentHp + healAmount);
                pushLog(`💧 ${ally.nickname} restored ${healAmount} HP!`, {
                  kind: 'heal',
                  id: ally.instanceId,
                  amount: healAmount
                });
              }
            });
            return;
          }
          if (move.id === 'revival_blessing') {
            const faintedTeammate = attackerTeam.find((p) => p.isFainted || p.currentHp <= 0);
            if (faintedTeammate) {
              faintedTeammate.isFainted = false;
              faintedTeammate.currentHp = Math.max(1, Math.floor(faintedTeammate.maxStats.hp / 2));
              pushLog(`✨ Revival Blessing revived ${faintedTeammate.nickname} with 50% HP!`);
            } else {
              pushLog(`${attacker.nickname} used Revival Blessing... but no teammates are fainted!`);
            }
            return;
          }

          // 7. HP Manipulation Setup
          if (move.id === 'belly_drum') {
            const halfHp = Math.floor(attacker.maxStats.hp / 2);
            if (attacker.currentHp >= halfHp && attacker.statStages && attacker.statStages.attack < 6) {
              attacker.currentHp = halfHp;
              attacker.statStages.attack = 6;
              pushLog(`🥁 ${attacker.nickname} set its HP in half and maximized its Attack!`, {
                kind: 'stat',
                id: attacker.instanceId,
                dir: 'up',
                amount: 6,
                stat: 'attack'
              });
              if (attacker.currentHp <= halfHp && attacker.item === 'sitrus_berry' && !attacker.itemConsumed) {
                const berryHeal = Math.floor(attacker.maxStats.hp / 4);
                attacker.currentHp = Math.min(attacker.maxStats.hp, attacker.currentHp + berryHeal);
                attacker.itemConsumed = true;
                pushLog(`🫐 ${attacker.nickname} restored its health using its Sitrus Berry!`);
              }
            } else {
              pushLog(`${attacker.nickname} used Belly Drum... but it failed!`);
            }
            return;
          }
          if (move.id === 'substitute') {
            const cost = Math.floor(attacker.maxStats.hp / 4);
            if (attacker.currentHp > cost) {
              attacker.currentHp -= cost;
              pushLog(`🧸 ${attacker.nickname} put in a substitute!`);
            } else {
              pushLog(`${attacker.nickname} used Substitute... but it failed!`);
            }
            return;
          }

          // 8. Self & Ally Buffs (Swords Dance, Nasty Plot, Quiver Dance, Dragon Dance, Calm Mind, Bulk Up, Coaching, Shell Smash, Coil, Curse, Stockpile, Iron Defense)
          if (move.id === 'coaching') {
            let coachTarget = attacker;
            if (format === 'Doubles') {
              const allySlotIdx = attackerActiveIndices.find((idx) => idx !== actorTeamIndex);
              if (allySlotIdx !== undefined && attackerTeam[allySlotIdx] && !attackerTeam[allySlotIdx].isFainted) {
                coachTarget = attackerTeam[allySlotIdx];
              }
            }
            applyStatStages(coachTarget, 'attack', 1);
            applyStatStages(coachTarget, 'defense', 1);
            return;
          }
          if (move.target === 'Self' && move.statChanges && move.statChanges.length > 0) {
            move.statChanges.forEach((sc) => {
              applyStatStages(attacker, sc.stat, sc.stages);
            });
            return;
          }

          // 9. Targeted Enemy Moves (Acquire defender & check immunities)
          const targetSlot = action.targetSlot || 0;
          let targetSlotIdx = defenderActiveIndices[targetSlot] ?? defenderActiveIndices[0];
          let defender = defenderTeam[targetSlotIdx];

          if ((!defender || defender.isFainted || defender.currentHp <= 0) && format === 'Doubles') {
            const alternateSlotIdx = defenderActiveIndices.find(
              (idx) => idx !== targetSlotIdx && defenderTeam[idx] && !defenderTeam[idx].isFainted && defenderTeam[idx].currentHp > 0
            );
            if (alternateSlotIdx !== undefined) {
              targetSlotIdx = alternateSlotIdx;
              defender = defenderTeam[targetSlotIdx];
              pushLog(`${attacker.nickname}'s ${move.name} redirected to ${defender.nickname}!`);
            }
          }

          if (!defender || defender.isFainted || defender.currentHp <= 0) {
            pushLog(`There was no target for ${attacker.nickname}'s ${move.name}!`);
            return;
          }

          if (activeField.terrain === 'Psychic' && moveEffectivePriority > 0 && isGrounded(defender)) {
            pushLog(`🔮 Psychic Terrain protected ${defender.nickname} from ${attacker.nickname}'s ${move.name}!`);
            return;
          }

          // Armor Tail & Queenly Majesty block opposing priority moves targeting this side
          const activeDefenders = defenderTeam.filter((p) => p && !p.isFainted && p.currentHp > 0);
          const priorityBlocker = activeDefenders.find((p) => p.ability === 'Armor Tail' || p.ability === 'Queenly Majesty');
          if (priorityBlocker && moveEffectivePriority > 0) {
            pushLog(`👑 ${priorityBlocker.nickname}'s ${priorityBlocker.ability} blocked ${attacker.nickname}'s ${move.name}!`, {
              kind: 'ability',
              id: priorityBlocker.instanceId
            });
            return;
          }

          // Good as Gold prevents opposing Status moves
          if (defender.ability === 'Good as Gold' && move.category === 'Status') {
            pushLog(`🪙 ${defender.nickname}'s Good as Gold protected it from ${attacker.nickname}'s ${move.name}!`, {
              kind: 'ability',
              id: defender.instanceId
            });
            return;
          }

          // Dark-types are immune to Prankster-boosted Status moves
          if (attacker.ability === 'Prankster' && move.category === 'Status') {
            const defTypes = defender.activeTypes || defender.species.types;
            if (defTypes.includes('Dark')) {
              pushLog(`🌑 Dark-type Pokémon are immune to Prankster status moves!`);
              return;
            }
          }

          if (defender.isProtecting) {
            pushLog(`🛡️ ${defender.nickname} protected itself!`);
            return;
          }

          if (!checkMoveHit(move, attacker, defender)) {
            pushLog(`${attacker.nickname}'s ${move.name} missed ${defender.nickname}!`);
            return;
          }

          // Sleep moves: spore, sleep_powder, hypnosis, yawn
          if (move.id === 'spore' || move.id === 'sleep_powder' || move.id === 'hypnosis' || move.id === 'yawn') {
            const defTypes = defender.activeTypes || defender.species.types;
            if ((move.id === 'spore' || move.id === 'sleep_powder') && defTypes.includes('Grass')) {
              pushLog(`🍃 Grass-type Pokémon are immune to powder moves!`);
              return;
            }
            if (activeField.terrain === 'Electric' && isGrounded(defender)) {
              pushLog(`⚡ Electric Terrain prevented ${defender.nickname} from falling asleep!`);
              return;
            }
            if (activeField.terrain === 'Misty' && isGrounded(defender)) {
              pushLog(`🌫️ Misty Terrain protected ${defender.nickname} from status conditions!`);
              return;
            }
            if (defender.status) {
              pushLog(`${defender.nickname} already has a status condition!`);
              return;
            }
            if (defender.ability === 'Insomnia' || defender.ability === 'Vital Spirit') {
              pushLog(`🛡️ ${defender.nickname}'s ${defender.ability} prevents sleep!`, { kind: 'ability', id: defender.instanceId });
              return;
            }
            defender.status = 'Sleep';
            pushLog(`😴 ${defender.nickname} fell asleep!`, { kind: 'status', id: defender.instanceId });
            return;
          }

          // Burn move: will_o_wisp
          if (move.id === 'will_o_wisp') {
            const defTypes = defender.activeTypes || defender.species.types;
            if (defTypes.includes('Fire')) {
              pushLog(`🔥 Fire-type Pokémon cannot be burned!`);
              return;
            }
            if (activeField.terrain === 'Misty' && isGrounded(defender)) {
              pushLog(`🌫️ Misty Terrain protected ${defender.nickname} from status conditions!`);
              return;
            }
            if (defender.status) {
              pushLog(`${defender.nickname} already has a status condition!`);
              return;
            }
            if (defender.ability === 'Water Veil') {
              pushLog(`🛡️ ${defender.nickname}'s Water Veil prevents burns!`, { kind: 'ability', id: defender.instanceId });
              return;
            }
            defender.status = 'Burn';
            pushLog(`🔥 ${defender.nickname} was burned!`, { kind: 'status', id: defender.instanceId });
            return;
          }

          // Paralysis move: thunder_wave
          if (move.id === 'thunder_wave') {
            const defTypes = defender.activeTypes || defender.species.types;
            if (defTypes.includes('Electric') || defTypes.includes('Ground')) {
              pushLog(`⚡ ${defender.nickname} is immune to Thunder Wave!`);
              return;
            }
            if (activeField.terrain === 'Misty' && isGrounded(defender)) {
              pushLog(`🌫️ Misty Terrain protected ${defender.nickname} from status conditions!`);
              return;
            }
            if (defender.status) {
              pushLog(`${defender.nickname} already has a status condition!`);
              return;
            }
            if (defender.ability === 'Limber') {
              pushLog(`🛡️ ${defender.nickname}'s Limber prevents paralysis!`, { kind: 'ability', id: defender.instanceId });
              return;
            }
            defender.status = 'Paralysis';
            pushLog(`⚡ ${defender.nickname} is paralyzed! It may be unable to move!`, { kind: 'status', id: defender.instanceId });
            return;
          }

          // Poison move: toxic
          if (move.id === 'toxic') {
            const defTypes = defender.activeTypes || defender.species.types;
            if (defTypes.includes('Poison') || defTypes.includes('Steel')) {
              pushLog(`☠️ ${defender.nickname} is immune to poison!`);
              return;
            }
            if (activeField.terrain === 'Misty' && isGrounded(defender)) {
              pushLog(`🌫️ Misty Terrain protected ${defender.nickname} from status conditions!`);
              return;
            }
            if (defender.status) {
              pushLog(`${defender.nickname} already has a status condition!`);
              return;
            }
            if (defender.ability === 'Immunity') {
              pushLog(`🛡️ ${defender.nickname}'s Immunity prevents poisoning!`, { kind: 'ability', id: defender.instanceId });
              return;
            }
            defender.status = 'Poison';
            pushLog(`☠️ ${defender.nickname} was badly poisoned!`, { kind: 'status', id: defender.instanceId });
            return;
          }

          // Strength Sap
          if (move.id === 'strength_sap') {
            const atkMultiplier = getStatStageMultiplier(defender.statStages?.attack || 0);
            const effAtk = Math.max(1, Math.floor(defender.maxStats.attack * atkMultiplier));
            attacker.currentHp = Math.min(attacker.maxStats.hp, attacker.currentHp + effAtk);
            pushLog(`💚 ${attacker.nickname} restored ${effAtk} HP by sapping ${defender.nickname}'s strength!`, {
              kind: 'heal',
              id: attacker.instanceId,
              amount: effAtk
            });
            applyStatStages(defender, 'attack', -1);
            return;
          }

          // Parting Shot
          if (move.id === 'parting_shot') {
            applyStatStages(defender, 'attack', -1);
            applyStatStages(defender, 'spAtk', -1);
            const benchIdx = attackerTeam.findIndex(
              (p, i) => !attackerActiveIndices.includes(i) && !p.isFainted && p.currentHp > 0
            );
            if (benchIdx !== -1) {
              const slotPos = attackerActiveIndices.indexOf(actorTeamIndex);
              const newPkmn = attackerTeam[benchIdx];
              if (slotPos !== -1 && newPkmn) {
                attackerActiveIndices[slotPos] = benchIdx;
                attacker.statStages = { attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 };
                attacker.turnsOnField = 0;
                attacker.proteanUsed = false;
                attacker.activeTypes = undefined;
                newPkmn.turnsOnField = 0;
                newPkmn.proteanUsed = false;
                pushLog(`🔄 ${attacker.nickname} parted and switched to ${newPkmn.nickname}!`);
                activeField = applyEntranceHazards(newPkmn, activeField, isMyAction, pushLog);
                if (!newPkmn.isFainted) {
                  const foes = defenderActiveIndices
                    .map((i) => defenderTeam[i])
                    .filter((f) => f && !f.isFainted && f.currentHp > 0);
                  const allies = attackerActiveIndices
                    .map((i) => attackerTeam[i])
                    .filter((a) => a && !a.isFainted && a.currentHp > 0);
                  activeField = checkEntranceAbilities(newPkmn, activeField, pushLog, foes, allies);
                }
              }
            }
            return;
          }

          // Whirlwind
          if (move.id === 'whirlwind') {
            const oppBench = defenderTeam
              .map((p, i) => ({ p, i }))
              .filter(({ p, i }) => !defenderActiveIndices.includes(i) && !p.isFainted && p.currentHp > 0);
            if (oppBench.length > 0) {
              const chosen = oppBench[Math.floor(Math.random() * oppBench.length)];
              const defSlotPos = defenderActiveIndices.indexOf(targetSlotIdx);
              if (defSlotPos !== -1) {
                defenderActiveIndices[defSlotPos] = chosen.i;
                defender.statStages = { attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 };
                defender.turnsOnField = 0;
                defender.proteanUsed = false;
                defender.activeTypes = undefined;
                chosen.p.turnsOnField = 0;
                chosen.p.proteanUsed = false;
                pushLog(`💨 Whirlwind blew ${defender.nickname} away! In came ${chosen.p.nickname}!`);
                activeField = applyEntranceHazards(chosen.p, activeField, !isMyAction, pushLog);
                if (!chosen.p.isFainted) {
                  const foes = attackerActiveIndices
                    .map((i) => attackerTeam[i])
                    .filter((f) => f && !f.isFainted && f.currentHp > 0);
                  const allies = defenderActiveIndices
                    .map((i) => defenderTeam[i])
                    .filter((a) => a && !a.isFainted && a.currentHp > 0);
                  activeField = checkEntranceAbilities(chosen.p, activeField, pushLog, foes, allies);
                }
              }
            } else {
              pushLog(`${attacker.nickname} used Whirlwind... but there was no replacement Pokémon!`);
            }
            return;
          }

          // Trick
          if (move.id === 'trick') {
            const userItem = attacker.item;
            attacker.item = defender.item;
            defender.item = userItem;
            pushLog(`🔄 ${attacker.nickname} swapped items with ${defender.nickname}!`);
            return;
          }

          // Skill Swap
          if (move.id === 'skill_swap') {
            const userAb = attacker.ability;
            attacker.ability = defender.ability;
            defender.ability = userAb;
            pushLog(`🔄 ${attacker.nickname} swapped abilities with ${defender.nickname}!`);
            return;
          }

          // Leech Seed
          if (move.id === 'leech_seed') {
            const defTypes = defender.activeTypes || defender.species.types;
            if (defTypes.includes('Grass')) {
              pushLog(`🍃 Leech Seed does not affect Grass-type Pokémon!`);
            } else {
              pushLog(`🌱 ${defender.nickname} was seeded!`);
            }
            return;
          }

          // Taunt, Encore, Disable, Quash
          if (move.id === 'taunt') {
            pushLog(`🤬 ${defender.nickname} fell for the taunt!`);
            return;
          }
          if (move.id === 'encore') {
            pushLog(`👏 ${defender.nickname} received an encore!`);
            return;
          }
          if (move.id === 'disable') {
            pushLog(`🚫 ${defender.nickname}'s move was disabled!`);
            return;
          }
          if (move.id === 'quash') {
            pushLog(`⏳ ${defender.nickname} was made to move last!`);
            return;
          }

          // Redirection, Hazards & Field Status
          if (move.id === 'helping_hand') {
            pushLog(`🤝 ${attacker.nickname} is ready to help its ally!`);
            return;
          }
          if (move.id === 'follow_me' || move.id === 'rage_powder') {
            pushLog(`🎯 ${attacker.nickname} drew attention to itself!`);
            return;
          }
          if (move.id === 'destiny_bond') {
            pushLog(`👻 ${attacker.nickname} took its opponent with it in spirit!`);
            return;
          }
          if (move.id === 'imprison') {
            pushLog(`🔒 ${attacker.nickname} sealed any moves its opponents share with it!`);
            return;
          }
          if (move.id === 'perish_song') {
            pushLog(`🎵 All Pokémon hearing the song will faint in 3 turns!`);
            return;
          }
          if (move.id === 'stealth_rock') {
            if (isMyAction) {
              if (activeField.stealthRockTeam2) {
                pushLog(`Pointed stones are already floating around the opposing team!`);
              } else {
                activeField.stealthRockTeam2 = true;
                pushLog(`🪨 Pointed stones float in the air around the opposing team!`, { kind: 'field' });
              }
            } else {
              if (activeField.stealthRockTeam1) {
                pushLog(`Pointed stones are already floating around your team!`);
              } else {
                activeField.stealthRockTeam1 = true;
                pushLog(`🪨 Pointed stones float in the air around your team!`, { kind: 'field' });
              }
            }
            return;
          }
          if (move.id === 'toxic_spikes') {
            if (isMyAction) {
              const cur = activeField.toxicSpikesTeam2 || 0;
              if (cur >= 2) {
                pushLog(`Poison spikes can't be scattered any further!`);
              } else {
                activeField.toxicSpikesTeam2 = cur + 1;
                pushLog(`☠️ Poison spikes were scattered on the opposing field! (Layer ${cur + 1})`, { kind: 'field' });
              }
            } else {
              const cur = activeField.toxicSpikesTeam1 || 0;
              if (cur >= 2) {
                pushLog(`Poison spikes can't be scattered any further!`);
              } else {
                activeField.toxicSpikesTeam1 = cur + 1;
                pushLog(`☠️ Poison spikes were scattered around your team! (Layer ${cur + 1})`, { kind: 'field' });
              }
            }
            return;
          }

          // Fallback for any other status move with statChanges
          if (move.statChanges && move.statChanges.length > 0) {
            move.statChanges.forEach((sc) => {
              const targetMon = sc.target === 'Self' ? attacker : defender;
              applyStatStages(targetMon, sc.stat, sc.stages);
            });
            return;
          }

          return; // Finish Status Move execution
        }

        // --- DAMAGING MOVE PREPARATION ---
        const defField: CalcFieldConditions = {
          weather: activeField.weather,
          terrain: activeField.terrain,
          auroraVeil: isMyAction
            ? Boolean(activeField.auroraVeilTeam2 && activeField.auroraVeilTeam2 > 0)
            : Boolean(activeField.auroraVeilTeam1 && activeField.auroraVeilTeam1 > 0),
          reflect: isMyAction
            ? Boolean(activeField.reflectTeam2 && activeField.reflectTeam2 > 0)
            : Boolean(activeField.reflectTeam1 && activeField.reflectTeam1 > 0),
          lightScreen: isMyAction
            ? Boolean(activeField.lightScreenTeam2 && activeField.lightScreenTeam2 > 0)
            : Boolean(activeField.lightScreenTeam1 && activeField.lightScreenTeam1 > 0),
        };
        const isDefAuroraActive = defField.auroraVeil || false;

        const applyMoveSecondaryEffects = (m: typeof move, atk: typeof attacker, def: typeof attacker, damageDealt: number) => {
          // Sheer Force negates secondary effects
          if (atk.ability === 'Sheer Force' && hasSecondaryEffect(m)) {
            return;
          }

          // 1. Flinch (e.g. Fake Out, Icicle Crash, Rock Slide, Iron Head, Headbutt)
          if (m.flinchChance && damageDealt > 0 && Math.random() * 100 < m.flinchChance) {
            if (def.ability === 'Inner Focus') {
              pushLog(`🛡️ ${def.nickname}'s Inner Focus prevents flinching!`, { kind: 'ability', id: def.instanceId });
            } else {
              def.isFlinched = true;
              pushLog(`💫 ${def.nickname} flinched!`);
            }
          }

          // 2. Status Effects (Burn, Paralysis, Sleep, Poison, Freeze)
          if (m.statusEffect && !def.status && !def.isFainted) {
            if (activeField.terrain === 'Electric' && m.statusEffect === 'Sleep' && isGrounded(def)) {
              pushLog(`⚡ Electric Terrain prevented ${def.nickname} from falling asleep!`);
              return;
            }
            if (activeField.terrain === 'Misty' && isGrounded(def)) {
              pushLog(`🌫️ Misty Terrain protected ${def.nickname} from status conditions!`);
              return;
            }
            if (def.ability === 'Thermal Exchange' && m.statusEffect === 'Burn') {
              pushLog(`❄️ ${def.nickname}'s Thermal Exchange prevents burns!`, { kind: 'ability', id: def.instanceId });
              return;
            }
            if (def.ability === 'Sweet Veil' && m.statusEffect === 'Sleep') {
              pushLog(`🍬 ${def.nickname}'s Sweet Veil prevents sleep!`, { kind: 'ability', id: def.instanceId });
              return;
            }
            if (def.ability === 'Leaf Guard' && activeField.weather === 'Sun') {
              pushLog(`🌿 ${def.nickname}'s Leaf Guard prevents status conditions in harsh sunlight!`, { kind: 'ability', id: def.instanceId });
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
              pushLog(`${statusEmoji[m.statusEffect] || '✨'} ${def.nickname} was afflicted with ${m.statusEffect}!`);
            }
          }

          // 3. HP Drain (e.g. Bitter Blade, Giga Drain, Drain Punch, Leech Life, Matcha Gotcha)
          if (m.drainPercent && damageDealt > 0 && !atk.isFainted && atk.currentHp < atk.maxStats.hp) {
            const drained = Math.max(1, Math.floor((damageDealt * m.drainPercent) / 100));
            atk.currentHp = Math.min(atk.maxStats.hp, atk.currentHp + drained);
            pushLog(`💚 ${atk.nickname} drained ${drained} HP!`);
          }

          // 4. Stat Changes (e.g. Trop Kick, Snarl, Icy Wind, Moonblast, Shadow Ball, Close Combat, Make It Rain, Armor Cannon)
          if (m.statChanges && m.statChanges.length > 0) {
            m.statChanges.forEach((sc) => {
              const chance = sc.chance ?? 100;
              if (Math.random() * 100 <= chance) {
                const targetPkmn = sc.target === 'Self' ? atk : def;
                if (targetPkmn && !targetPkmn.isFainted) {
                  applyStatStages(targetPkmn, sc.stat, sc.stages);
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
                pushLog(`🔮 Psychic Terrain protected ${defender.nickname} from ${attacker.nickname}'s ${move.name}!`);
                return;
              }

              // Armor Tail & Queenly Majesty block opposing priority moves
              const activeSpreadDefs = defenderTeam.filter((p) => p && !p.isFainted && p.currentHp > 0);
              const spreadPriorityBlocker = activeSpreadDefs.find((p) => p.ability === 'Armor Tail' || p.ability === 'Queenly Majesty');
              if (spreadPriorityBlocker && moveEffectivePriority > 0) {
                pushLog(`👑 ${spreadPriorityBlocker.nickname}'s ${spreadPriorityBlocker.ability} blocked ${attacker.nickname}'s ${move.name}!`, {
                  kind: 'ability',
                  id: spreadPriorityBlocker.instanceId
                });
                return;
              }

              if (defender.isProtecting) {
                pushLog(`🛡️ ${defender.nickname} protected itself!`);
                return;
              }

              // Type Absorption Abilities (Flash Fire, Water Absorb, Volt Absorb, Sap Sipper)
              if (attacker.ability !== 'Mold Breaker') {
                if (move.type === 'Fire' && defender.ability === 'Flash Fire') {
                  defender.hasFlashFireActive = true;
                  pushLog(`🔥 ${defender.nickname}'s Flash Fire absorbed the Fire attack and boosted its Fire power!`, { kind: 'ability', id: defender.instanceId });
                  return;
                }
                if (move.type === 'Water' && defender.ability === 'Water Absorb') {
                  const heal = Math.floor(defender.maxStats.hp / 4);
                  defender.currentHp = Math.min(defender.maxStats.hp, defender.currentHp + heal);
                  pushLog(`💧 ${defender.nickname}'s Water Absorb restored its HP! (+${heal} HP)`, { kind: 'heal', id: defender.instanceId, amount: heal });
                  return;
                }
                if (move.type === 'Electric' && defender.ability === 'Volt Absorb') {
                  const heal = Math.floor(defender.maxStats.hp / 4);
                  defender.currentHp = Math.min(defender.maxStats.hp, defender.currentHp + heal);
                  pushLog(`⚡ ${defender.nickname}'s Volt Absorb restored its HP! (+${heal} HP)`, { kind: 'heal', id: defender.instanceId, amount: heal });
                  return;
                }
                if (move.type === 'Grass' && defender.ability === 'Sap Sipper') {
                  defender.statStages.attack = Math.min(6, (defender.statStages.attack || 0) + 1);
                  pushLog(`🍃 ${defender.nickname}'s Sap Sipper boosted its Attack!`, { kind: 'stat', id: defender.instanceId, dir: 'up', stat: 'attack' });
                  return;
                }
              }

              if (!checkMoveHit(move, attacker, defender)) {
                pushLog(`${attacker.nickname}'s attack missed ${defender.nickname}!`);
                return;
              }
              defender.timesHit = (defender.timesHit || 0) + 1;
              const res = calculateDamage(attacker, defender, move, format, false, attackerTeam, isDefAuroraActive, defField);

              // Disguise Ability: Absorbs first damage hit
              if (defender.ability === 'Disguise' && !defender.isDisguiseBusted && res.damage > 0 && attacker.ability !== 'Mold Breaker') {
                defender.isDisguiseBusted = true;
                const disguiseDamage = Math.max(1, Math.floor(defender.maxStats.hp / 8));
                defender.currentHp = Math.max(0, defender.currentHp - disguiseDamage);
                pushLog(`🎭 ${defender.nickname}'s Disguise absorbed the hit and was busted!`, {
                  kind: 'damage',
                  id: defender.instanceId,
                  amount: disguiseDamage
                });
                if (defender.currentHp <= 0) {
                  defender.isFainted = true;
                  pushLog(`${defender.nickname} fainted!`);
                }
                return;
              }

              const isFullHp = defender.currentHp === defender.maxStats.hp;
              const prevDefenderHp = defender.currentHp;
              defender.currentHp = Math.max(0, defender.currentHp - res.damage);

              const hasSturdy = defender.ability === 'Sturdy' && attacker.ability !== 'Mold Breaker';
              if (defender.currentHp <= 0 && isFullHp) {
                if (hasSturdy) {
                  defender.currentHp = 1;
                  pushLog(`🛡️ ${defender.nickname} endured the hit with Sturdy!`, { kind: 'ability', id: defender.instanceId });
                } else if (defender.item === 'focus_sash' && !defender.itemConsumed) {
                  defender.currentHp = 1;
                  defender.itemConsumed = true;
                  pushLog(`${defender.nickname} hung on using its Focus Sash!`);
                }
              }

              if (res.description) pushLog(res.description);
              pushLog(`${defender.nickname} took ${res.damage} damage!`, { kind: 'damage', id: defender.instanceId, amount: res.damage });

              // Stamina Ability: Boosts Defense by 1 when hit
              if (defender.ability === 'Stamina' && defender.currentHp > 0 && res.damage > 0) {
                const curDef = defender.statStages.defense || 0;
                if (curDef < 6) {
                  defender.statStages.defense = curDef + 1;
                  pushLog(`🛡️ ${defender.nickname}'s Stamina boosted its Defense!`, {
                    kind: 'stat',
                    id: defender.instanceId,
                    dir: 'up',
                    stat: 'defense'
                  });
                }
              }

              // Weak Armor: -1 Def, +2 Spe on physical hit
              if (defender.ability === 'Weak Armor' && move.category === 'Physical' && defender.currentHp > 0 && res.damage > 0) {
                defender.statStages.defense = Math.max(-6, (defender.statStages.defense || 0) - 1);
                defender.statStages.speed = Math.min(6, (defender.statStages.speed || 0) + 2);
                pushLog(`🛡️ ${defender.nickname}'s Weak Armor lowered Defense and sharply raised Speed!`, { kind: 'stat', id: defender.instanceId, dir: 'up', stat: 'speed' });
              }

              // Thermal Exchange: +1 Atk on Fire hit
              if (defender.ability === 'Thermal Exchange' && move.type === 'Fire' && defender.currentHp > 0 && res.damage > 0) {
                defender.statStages.attack = Math.min(6, (defender.statStages.attack || 0) + 1);
                pushLog(`❄️ ${defender.nickname}'s Thermal Exchange boosted its Attack!`, { kind: 'stat', id: defender.instanceId, dir: 'up', stat: 'attack' });
              }

              // Justified: +1 Atk on Dark hit
              if (defender.ability === 'Justified' && move.type === 'Dark' && defender.currentHp > 0 && res.damage > 0) {
                defender.statStages.attack = Math.min(6, (defender.statStages.attack || 0) + 1);
                pushLog(`⚔️ ${defender.nickname}'s Justified boosted its Attack!`, { kind: 'stat', id: defender.instanceId, dir: 'up', stat: 'attack' });
              }

              // Berserk: +1 Sp. Atk when HP drops below 50%
              if (defender.ability === 'Berserk' && defender.currentHp > 0 && prevDefenderHp > Math.floor(defender.maxStats.hp / 2) && defender.currentHp <= Math.floor(defender.maxStats.hp / 2) && res.damage > 0) {
                defender.statStages.spAtk = Math.min(6, (defender.statStages.spAtk || 0) + 1);
                pushLog(`🐉 ${defender.nickname}'s Berserk boosted its Sp. Atk!`, { kind: 'stat', id: defender.instanceId, dir: 'up', stat: 'spAtk' });
              }

              // Toxic Debris: Scatters Toxic Spikes when hit by physical attack
              if (defender.ability === 'Toxic Debris' && move.category === 'Physical' && res.damage > 0) {
                if (isMyAction) {
                  const cur = activeField.toxicSpikesTeam1 || 0;
                  if (cur < 2) {
                    activeField.toxicSpikesTeam1 = cur + 1;
                    pushLog(`☠️ ${defender.nickname}'s Toxic Debris scattered poison spikes on your team's field!`, { kind: 'field' });
                  }
                } else {
                  const cur = activeField.toxicSpikesTeam2 || 0;
                  if (cur < 2) {
                    activeField.toxicSpikesTeam2 = cur + 1;
                    pushLog(`☠️ ${defender.nickname}'s Toxic Debris scattered poison spikes on opposing team's field!`, { kind: 'field' });
                  }
                }
              }
              
              if (defender.currentHp > 0 && defender.currentHp <= Math.floor(defender.maxStats.hp / 2) && defender.item === 'sitrus_berry' && !defender.itemConsumed) {
                defender.currentHp = Math.min(defender.maxStats.hp, defender.currentHp + Math.floor(defender.maxStats.hp / 4));
                defender.itemConsumed = true;
                pushLog(`🫐 ${defender.nickname} restored its health using its Sitrus Berry!`);
              }

              applyMoveSecondaryEffects(move, attacker, defender, res.damage);

              // Hazard clearing with Mortal Spin / Rapid Spin
              if ((move.id === 'mortal_spin' || move.id === 'rapid_spin') && !attacker.isFainted) {
                if (isMyAction) {
                  if (activeField.stealthRockTeam1 || activeField.toxicSpikesTeam1) {
                    activeField.stealthRockTeam1 = false;
                    activeField.toxicSpikesTeam1 = 0;
                    pushLog(`🌪️ ${attacker.nickname} blew away entry hazards from your team's field!`, { kind: 'field' });
                  }
                } else {
                  if (activeField.stealthRockTeam2 || activeField.toxicSpikesTeam2) {
                    activeField.stealthRockTeam2 = false;
                    activeField.toxicSpikesTeam2 = 0;
                    pushLog(`🌪️ ${attacker.nickname} blew away entry hazards from opposing team's field!`, { kind: 'field' });
                  }
                }
              }

              if (defender.currentHp <= 0) {
                defender.isFainted = true;
                pushLog(`${defender.nickname} fainted!`);
                // Moxie
                if (attacker.ability === 'Moxie' && !attacker.isFainted) {
                  attacker.statStages.attack = Math.min(6, (attacker.statStages.attack || 0) + 1);
                  pushLog(`🐉 ${attacker.nickname}'s Moxie boosted its Attack!`, { kind: 'stat', id: attacker.instanceId, dir: 'up', stat: 'attack' });
                }
              }

              // Recoil damage calculation (Rock Head blocks recoil)
              if (move.recoilPercent && res.damage > 0 && !attacker.isFainted) {
                if (attacker.ability === 'Rock Head') {
                  pushLog(`🛡️ ${attacker.nickname}'s Rock Head protected it from recoil!`, { kind: 'ability', id: attacker.instanceId });
                } else {
                  const recoilDamage = Math.max(1, Math.floor((res.damage * move.recoilPercent) / 100));
                  attacker.currentHp = Math.max(0, attacker.currentHp - recoilDamage);
                  pushLog(`${attacker.nickname} took ${recoilDamage} recoil damage!`);
                  if (attacker.currentHp <= 0) {
                    attacker.isFainted = true;
                    pushLog(`${attacker.nickname} fainted from recoil!`);
                  }
                }
              }

              // Contact Retaliation abilities (Rough Skin, Flame Body, Static) and Rocky Helmet
              if (res.damage > 0 && !attacker.isFainted && makesContact(move)) {
                if (defender.item === 'rocky_helmet') {
                  const rockyDamage = Math.max(1, Math.floor(attacker.maxStats.hp / 6));
                  attacker.currentHp = Math.max(0, attacker.currentHp - rockyDamage);
                  pushLog(`💥 ${attacker.nickname} was hurt by ${defender.nickname}'s Rocky Helmet!`);
                  if (attacker.currentHp <= 0) {
                    attacker.isFainted = true;
                    pushLog(`${attacker.nickname} fainted!`);
                  }
                }
                if (defender.ability === 'Rough Skin' && !attacker.isFainted) {
                  const roughDamage = Math.max(1, Math.floor(attacker.maxStats.hp / 8));
                  attacker.currentHp = Math.max(0, attacker.currentHp - roughDamage);
                  pushLog(`💥 ${attacker.nickname} was hurt by ${defender.nickname}'s Rough Skin!`);
                  if (attacker.currentHp <= 0) {
                    attacker.isFainted = true;
                    pushLog(`${attacker.nickname} fainted!`);
                  }
                }
                if (defender.ability === 'Flame Body' && !attacker.isFainted && !attacker.status && Math.random() < 0.3) {
                  attacker.status = 'Burn';
                  pushLog(`🔥 ${defender.nickname}'s Flame Body burned ${attacker.nickname}!`, { kind: 'status', id: attacker.instanceId });
                }
                if (defender.ability === 'Static' && !attacker.isFainted && !attacker.status && Math.random() < 0.3) {
                  attacker.status = 'Paralysis';
                  pushLog(`⚡ ${defender.nickname}'s Static paralyzed ${attacker.nickname}!`, { kind: 'status', id: attacker.instanceId });
                }
                if (attacker.ability === 'Poison Touch' && !defender.isFainted && !defender.status && Math.random() < 0.3) {
                  defender.status = 'Poison';
                  pushLog(`☠️ ${attacker.nickname}'s Poison Touch poisoned ${defender.nickname}!`, { kind: 'status', id: defender.instanceId });
                }
              }

              // Cursed Body
              if (res.damage > 0 && defender.ability === 'Cursed Body' && !attacker.disabledMoveId && Math.random() < 0.3) {
                attacker.disabledMoveId = move.id;
                attacker.disabledMoveTurns = 4;
                pushLog(`👻 ${defender.nickname}'s Cursed Body disabled ${attacker.nickname}'s ${move.name}!`, { kind: 'ability', id: defender.instanceId });
              }

              // Spicy Spray ability (burns attacker when hit)
              if (defender.ability === 'Spicy Spray' && res.damage > 0 && !attacker.isFainted && !attacker.status) {
                attacker.status = 'Burn';
                pushLog(`🌶️ ${defender.nickname}'s Spicy Spray burned ${attacker.nickname}!`);
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
            const alternateSlotIdx = defenderActiveIndices.find(
              (idx) => idx !== targetSlotIdx && defenderTeam[idx] && !defenderTeam[idx].isFainted && defenderTeam[idx].currentHp > 0
            );
            if (alternateSlotIdx !== undefined) {
              targetSlotIdx = alternateSlotIdx;
              defender = defenderTeam[targetSlotIdx];
              pushLog(`${attacker.nickname}'s attack redirected to ${defender.nickname}!`);
            }
          }

          if (defender && !defender.isFainted && defender.currentHp > 0) {
            // Psychic Terrain blocks priority attacks against grounded targets
            if (activeField.terrain === 'Psychic' && moveEffectivePriority > 0 && isGrounded(defender)) {
              pushLog(`🔮 Psychic Terrain protected ${defender.nickname} from ${attacker.nickname}'s ${move.name}!`);
              return;
            }

            // Armor Tail & Queenly Majesty block opposing priority moves
            const activeSingleDefs = defenderTeam.filter((p) => p && !p.isFainted && p.currentHp > 0);
            const singlePriorityBlocker = activeSingleDefs.find((p) => p.ability === 'Armor Tail' || p.ability === 'Queenly Majesty');
            if (singlePriorityBlocker && moveEffectivePriority > 0) {
              pushLog(`👑 ${singlePriorityBlocker.nickname}'s ${singlePriorityBlocker.ability} blocked ${attacker.nickname}'s ${move.name}!`, {
                kind: 'ability',
                id: singlePriorityBlocker.instanceId
              });
              return;
            }

            if (defender.isProtecting) {
              pushLog(`🛡️ ${defender.nickname} protected itself!`);
              return;
            }

            // Lightning Rod draws in single-target Electric moves
            if (move.type === 'Electric' && attacker.ability !== 'Mold Breaker') {
              const lrDefender = defenderTeam.find(
                (p, idx) => defenderActiveIndices.includes(idx) && p && !p.isFainted && p.currentHp > 0 && p.ability === 'Lightning Rod'
              );
              if (lrDefender) {
                lrDefender.statStages.spAtk = Math.min(6, (lrDefender.statStages.spAtk || 0) + 1);
                pushLog(`⚡ ${lrDefender.nickname}'s Lightning Rod drew in the Electric attack and boosted its Sp. Atk!`, {
                  kind: 'stat',
                  id: lrDefender.instanceId,
                  dir: 'up',
                  stat: 'spAtk'
                });
                return;
              }
            }

            // Type Absorption Abilities (Flash Fire, Water Absorb, Volt Absorb, Sap Sipper)
            if (attacker.ability !== 'Mold Breaker') {
              if (move.type === 'Fire' && defender.ability === 'Flash Fire') {
                defender.hasFlashFireActive = true;
                pushLog(`🔥 ${defender.nickname}'s Flash Fire absorbed the Fire attack and boosted its Fire power!`, { kind: 'ability', id: defender.instanceId });
                return;
              }
              if (move.type === 'Water' && defender.ability === 'Water Absorb') {
                const heal = Math.floor(defender.maxStats.hp / 4);
                defender.currentHp = Math.min(defender.maxStats.hp, defender.currentHp + heal);
                pushLog(`💧 ${defender.nickname}'s Water Absorb restored its HP! (+${heal} HP)`, { kind: 'heal', id: defender.instanceId, amount: heal });
                return;
              }
              if (move.type === 'Electric' && defender.ability === 'Volt Absorb') {
                const heal = Math.floor(defender.maxStats.hp / 4);
                defender.currentHp = Math.min(defender.maxStats.hp, defender.currentHp + heal);
                pushLog(`⚡ ${defender.nickname}'s Volt Absorb restored its HP! (+${heal} HP)`, { kind: 'heal', id: defender.instanceId, amount: heal });
                return;
              }
              if (move.type === 'Grass' && defender.ability === 'Sap Sipper') {
                defender.statStages.attack = Math.min(6, (defender.statStages.attack || 0) + 1);
                pushLog(`🍃 ${defender.nickname}'s Sap Sipper boosted its Attack!`, { kind: 'stat', id: defender.instanceId, dir: 'up', stat: 'attack' });
                return;
              }
            }

            if (!checkMoveHit(move, attacker, defender)) {
              pushLog(`${attacker.nickname}'s attack missed ${defender.nickname}!`);
              return;
            }

            defender.timesHit = (defender.timesHit || 0) + 1;
            const res = calculateDamage(attacker, defender, move, format, false, attackerTeam, isDefAuroraActive, defField);

            // Disguise Ability: Absorbs first damage hit
            if (defender.ability === 'Disguise' && !defender.isDisguiseBusted && res.damage > 0 && attacker.ability !== 'Mold Breaker') {
              defender.isDisguiseBusted = true;
              const disguiseDamage = Math.max(1, Math.floor(defender.maxStats.hp / 8));
              defender.currentHp = Math.max(0, defender.currentHp - disguiseDamage);
              pushLog(`🎭 ${defender.nickname}'s Disguise absorbed the hit and was busted!`, {
                kind: 'damage',
                id: defender.instanceId,
                amount: disguiseDamage
              });
              if (defender.currentHp <= 0) {
                defender.isFainted = true;
                pushLog(`${defender.nickname} fainted!`);
              }
              return;
            }

            const isFullHp = defender.currentHp === defender.maxStats.hp;
            const prevDefenderHp = defender.currentHp;
            defender.currentHp = Math.max(0, defender.currentHp - res.damage);

            const hasSturdy = defender.ability === 'Sturdy' && attacker.ability !== 'Mold Breaker';
            if (defender.currentHp <= 0 && isFullHp) {
              if (hasSturdy) {
                defender.currentHp = 1;
                pushLog(`🛡️ ${defender.nickname} endured the hit with Sturdy!`, { kind: 'ability', id: defender.instanceId });
              } else if (defender.item === 'focus_sash' && !defender.itemConsumed) {
                defender.currentHp = 1;
                defender.itemConsumed = true;
                pushLog(`${defender.nickname} hung on using its Focus Sash!`);
              }
            }

            if (res.description) pushLog(res.description);
            pushLog(`${defender.nickname} took ${res.damage} damage!`, { kind: 'damage', id: defender.instanceId, amount: res.damage });

            // Stamina Ability: Boosts Defense by 1 when hit
            if (defender.ability === 'Stamina' && defender.currentHp > 0 && res.damage > 0) {
              const curDef = defender.statStages.defense || 0;
              if (curDef < 6) {
                defender.statStages.defense = curDef + 1;
                pushLog(`🛡️ ${defender.nickname}'s Stamina boosted its Defense!`, {
                  kind: 'stat',
                  id: defender.instanceId,
                  dir: 'up',
                  stat: 'defense'
                });
              }
            }

            // Weak Armor: -1 Def, +2 Spe on physical hit
            if (defender.ability === 'Weak Armor' && move.category === 'Physical' && defender.currentHp > 0 && res.damage > 0) {
              defender.statStages.defense = Math.max(-6, (defender.statStages.defense || 0) - 1);
              defender.statStages.speed = Math.min(6, (defender.statStages.speed || 0) + 2);
              pushLog(`🛡️ ${defender.nickname}'s Weak Armor lowered Defense and sharply raised Speed!`, { kind: 'stat', id: defender.instanceId, dir: 'up', stat: 'speed' });
            }

            // Thermal Exchange: +1 Atk on Fire hit
            if (defender.ability === 'Thermal Exchange' && move.type === 'Fire' && defender.currentHp > 0 && res.damage > 0) {
              defender.statStages.attack = Math.min(6, (defender.statStages.attack || 0) + 1);
              pushLog(`❄️ ${defender.nickname}'s Thermal Exchange boosted its Attack!`, { kind: 'stat', id: defender.instanceId, dir: 'up', stat: 'attack' });
            }

            // Justified: +1 Atk on Dark hit
            if (defender.ability === 'Justified' && move.type === 'Dark' && defender.currentHp > 0 && res.damage > 0) {
              defender.statStages.attack = Math.min(6, (defender.statStages.attack || 0) + 1);
              pushLog(`⚔️ ${defender.nickname}'s Justified boosted its Attack!`, { kind: 'stat', id: defender.instanceId, dir: 'up', stat: 'attack' });
            }

            // Berserk: +1 Sp. Atk when HP drops below 50%
            if (defender.ability === 'Berserk' && defender.currentHp > 0 && prevDefenderHp > Math.floor(defender.maxStats.hp / 2) && defender.currentHp <= Math.floor(defender.maxStats.hp / 2) && res.damage > 0) {
              defender.statStages.spAtk = Math.min(6, (defender.statStages.spAtk || 0) + 1);
              pushLog(`🐉 ${defender.nickname}'s Berserk boosted its Sp. Atk!`, { kind: 'stat', id: defender.instanceId, dir: 'up', stat: 'spAtk' });
            }

            // Toxic Debris: Scatters Toxic Spikes when hit by physical attack
            if (defender.ability === 'Toxic Debris' && move.category === 'Physical' && res.damage > 0) {
              if (isMyAction) {
                const cur = activeField.toxicSpikesTeam1 || 0;
                if (cur < 2) {
                  activeField.toxicSpikesTeam1 = cur + 1;
                  pushLog(`☠️ ${defender.nickname}'s Toxic Debris scattered poison spikes on your team's field!`, { kind: 'field' });
                }
              } else {
                const cur = activeField.toxicSpikesTeam2 || 0;
                if (cur < 2) {
                  activeField.toxicSpikesTeam2 = cur + 1;
                  pushLog(`☠️ ${defender.nickname}'s Toxic Debris scattered poison spikes on opposing team's field!`, { kind: 'field' });
                }
              }
            }
            
            if (defender.currentHp > 0 && defender.currentHp <= Math.floor(defender.maxStats.hp / 2) && defender.item === 'sitrus_berry' && !defender.itemConsumed) {
              defender.currentHp = Math.min(defender.maxStats.hp, defender.currentHp + Math.floor(defender.maxStats.hp / 4));
              defender.itemConsumed = true;
              pushLog(`🫐 ${defender.nickname} restored its health using its Sitrus Berry!`);
            }

            applyMoveSecondaryEffects(move, attacker, defender, res.damage);

            // Hazard clearing with Mortal Spin / Rapid Spin
            if ((move.id === 'mortal_spin' || move.id === 'rapid_spin') && !attacker.isFainted) {
              if (isMyAction) {
                if (activeField.stealthRockTeam1 || activeField.toxicSpikesTeam1) {
                  activeField.stealthRockTeam1 = false;
                  activeField.toxicSpikesTeam1 = 0;
                  pushLog(`🌪️ ${attacker.nickname} blew away entry hazards from your team's field!`, { kind: 'field' });
                }
              } else {
                if (activeField.stealthRockTeam2 || activeField.toxicSpikesTeam2) {
                  activeField.stealthRockTeam2 = false;
                  activeField.toxicSpikesTeam2 = 0;
                  pushLog(`🌪️ ${attacker.nickname} blew away entry hazards from opposing team's field!`, { kind: 'field' });
                }
              }
            }

            if (defender.currentHp <= 0) {
              defender.isFainted = true;
              pushLog(`${defender.nickname} fainted!`);
              // Moxie
              if (attacker.ability === 'Moxie' && !attacker.isFainted) {
                attacker.statStages.attack = Math.min(6, (attacker.statStages.attack || 0) + 1);
                pushLog(`🐉 ${attacker.nickname}'s Moxie boosted its Attack!`, { kind: 'stat', id: attacker.instanceId, dir: 'up', stat: 'attack' });
              }
            }

            // Recoil damage calculation (Rock Head blocks recoil)
            if (move.recoilPercent && res.damage > 0 && !attacker.isFainted) {
              if (attacker.ability === 'Rock Head') {
                pushLog(`🛡️ ${attacker.nickname}'s Rock Head protected it from recoil!`, { kind: 'ability', id: attacker.instanceId });
              } else {
                const recoilDamage = Math.max(1, Math.floor((res.damage * move.recoilPercent) / 100));
                attacker.currentHp = Math.max(0, attacker.currentHp - recoilDamage);
                pushLog(`${attacker.nickname} took ${recoilDamage} recoil damage!`);
                if (attacker.currentHp <= 0) {
                  attacker.isFainted = true;
                  pushLog(`${attacker.nickname} fainted from recoil!`);
                }
              }
            }

            // Contact Retaliation abilities (Rough Skin, Flame Body, Static) and Rocky Helmet
            if (res.damage > 0 && !attacker.isFainted && makesContact(move)) {
              if (defender.item === 'rocky_helmet') {
                const rockyDamage = Math.max(1, Math.floor(attacker.maxStats.hp / 6));
                attacker.currentHp = Math.max(0, attacker.currentHp - rockyDamage);
                pushLog(`💥 ${attacker.nickname} was hurt by ${defender.nickname}'s Rocky Helmet!`);
                if (attacker.currentHp <= 0) {
                  attacker.isFainted = true;
                  pushLog(`${attacker.nickname} fainted!`);
                }
              }
              if (defender.ability === 'Rough Skin' && !attacker.isFainted) {
                const roughDamage = Math.max(1, Math.floor(attacker.maxStats.hp / 8));
                attacker.currentHp = Math.max(0, attacker.currentHp - roughDamage);
                pushLog(`💥 ${attacker.nickname} was hurt by ${defender.nickname}'s Rough Skin!`);
                if (attacker.currentHp <= 0) {
                  attacker.isFainted = true;
                  pushLog(`${attacker.nickname} fainted!`);
                }
              }
              if (defender.ability === 'Flame Body' && !attacker.isFainted && !attacker.status && Math.random() < 0.3) {
                attacker.status = 'Burn';
                pushLog(`🔥 ${defender.nickname}'s Flame Body burned ${attacker.nickname}!`, { kind: 'status', id: attacker.instanceId });
              }
              if (defender.ability === 'Static' && !attacker.isFainted && !attacker.status && Math.random() < 0.3) {
                attacker.status = 'Paralysis';
                pushLog(`⚡ ${defender.nickname}'s Static paralyzed ${attacker.nickname}!`, { kind: 'status', id: attacker.instanceId });
              }
              if (attacker.ability === 'Poison Touch' && !defender.isFainted && !defender.status && Math.random() < 0.3) {
                defender.status = 'Poison';
                pushLog(`☠️ ${attacker.nickname}'s Poison Touch poisoned ${defender.nickname}!`, { kind: 'status', id: defender.instanceId });
              }
            }

            // Cursed Body
            if (res.damage > 0 && defender.ability === 'Cursed Body' && !attacker.disabledMoveId && Math.random() < 0.3) {
              attacker.disabledMoveId = move.id;
              attacker.disabledMoveTurns = 4;
              pushLog(`👻 ${defender.nickname}'s Cursed Body disabled ${attacker.nickname}'s ${move.name}!`, { kind: 'ability', id: defender.instanceId });
            }

            // Spicy Spray ability (burns attacker when hit)
            if (defender.ability === 'Spicy Spray' && res.damage > 0 && !attacker.isFainted && !attacker.status) {
              attacker.status = 'Burn';
              pushLog(`🌶️ ${defender.nickname}'s Spicy Spray burned ${attacker.nickname}!`);
            }
          }
        }
      }
    });

    // Clear single-turn temporary flags (protect, flinch)
    nextMyTeam.forEach((p) => {
      p.isProtecting = false;
      p.isFlinched = false;
    });
    nextOppTeam.forEach((p) => {
      p.isProtecting = false;
      p.isFlinched = false;
    });

    // Increment turns on field for active Pokemon
    hostActiveSlots.forEach((idx) => {
      if (nextMyTeam[idx] && !nextMyTeam[idx].isFainted) {
        nextMyTeam[idx].turnsOnField = (nextMyTeam[idx].turnsOnField ?? 0) + 1;
      }
    });
    guestActiveSlots.forEach((idx) => {
      if (nextOppTeam[idx] && !nextOppTeam[idx].isFainted) {
        nextOppTeam[idx].turnsOnField = (nextOppTeam[idx].turnsOnField ?? 0) + 1;
      }
    });

    // End-of-Turn Weather & Terrain Effects
    // 1. Grassy Terrain HP recovery (1/16 max HP to alive grounded active Pokemon)
    if (activeField.terrain === 'Grassy') {
      [...hostActiveSlots.map((i) => nextMyTeam[i]), ...guestActiveSlots.map((i) => nextOppTeam[i])].forEach((pkmn) => {
        if (pkmn && !pkmn.isFainted && pkmn.currentHp > 0 && pkmn.currentHp < pkmn.maxStats.hp && isGrounded(pkmn)) {
          const healAmount = Math.max(1, Math.floor(pkmn.maxStats.hp / 16));
          pkmn.currentHp = Math.min(pkmn.maxStats.hp, pkmn.currentHp + healAmount);
          pushLog(`🌿 Grassy Terrain restored HP to ${pkmn.nickname}! (+${healAmount} HP)`);
        }
      });
    }
    
    // 1.5 Leftovers & Ability healing / chip
    [...hostActiveSlots.map((i) => nextMyTeam[i]), ...guestActiveSlots.map((i) => nextOppTeam[i])].forEach((pkmn) => {
      if (pkmn && !pkmn.isFainted && pkmn.currentHp > 0) {
        // Leftovers
        if (pkmn.currentHp < pkmn.maxStats.hp && pkmn.item === 'leftovers') {
          const healAmount = Math.max(1, Math.floor(pkmn.maxStats.hp / 16));
          pkmn.currentHp = Math.min(pkmn.maxStats.hp, pkmn.currentHp + healAmount);
          pushLog(`🍏 ${pkmn.nickname} restored a little HP using its Leftovers!`);
        }
        // Rain Dish in Rain
        if (activeField.weather === 'Rain' && pkmn.ability === 'Rain Dish' && pkmn.currentHp < pkmn.maxStats.hp) {
          const healAmount = Math.max(1, Math.floor(pkmn.maxStats.hp / 16));
          pkmn.currentHp = Math.min(pkmn.maxStats.hp, pkmn.currentHp + healAmount);
          pushLog(`🌧️ ${pkmn.nickname}'s Rain Dish restored HP!`);
        }
        // Ice Body in Snow
        if (activeField.weather === 'Snow' && pkmn.ability === 'Ice Body' && pkmn.currentHp < pkmn.maxStats.hp) {
          const healAmount = Math.max(1, Math.floor(pkmn.maxStats.hp / 16));
          pkmn.currentHp = Math.min(pkmn.maxStats.hp, pkmn.currentHp + healAmount);
          pushLog(`❄️ ${pkmn.nickname}'s Ice Body restored HP!`);
        }
        // Solar Power in Sun (loses 1/8 max HP)
        if (activeField.weather === 'Sun' && pkmn.ability === 'Solar Power') {
          const solarChip = Math.max(1, Math.floor(pkmn.maxStats.hp / 8));
          pkmn.currentHp = Math.max(0, pkmn.currentHp - solarChip);
          pushLog(`☀️ ${pkmn.nickname} lost HP from Solar Power! (-${solarChip} HP)`);
          if (pkmn.currentHp <= 0) {
            pkmn.isFainted = true;
            pushLog(`${pkmn.nickname} fainted from Solar Power!`);
          }
        }
        // Non-volatile status chip damage (Burn: 1/16, Poison: 1/8)
        if (!pkmn.isFainted && pkmn.currentHp > 0) {
          if (pkmn.status === 'Burn') {
            const burnDmg = Math.max(1, Math.floor(pkmn.maxStats.hp / 16));
            pkmn.currentHp = Math.max(0, pkmn.currentHp - burnDmg);
            pushLog(`🔥 ${pkmn.nickname} is hurt by its burn! (-${burnDmg} HP)`);
            if (pkmn.currentHp <= 0) {
              pkmn.isFainted = true;
              pushLog(`${pkmn.nickname} fainted from its burn!`);
            }
          } else if (pkmn.status === 'Poison') {
            const psnDmg = Math.max(1, Math.floor(pkmn.maxStats.hp / 8));
            pkmn.currentHp = Math.max(0, pkmn.currentHp - psnDmg);
            pushLog(`☠️ ${pkmn.nickname} is hurt by poison! (-${psnDmg} HP)`);
            if (pkmn.currentHp <= 0) {
              pkmn.isFainted = true;
              pushLog(`${pkmn.nickname} fainted from poison!`);
            }
          }
        }
        // Decrement Cursed Body disabled move turns
        if (pkmn.disabledMoveTurns && pkmn.disabledMoveTurns > 0) {
          pkmn.disabledMoveTurns -= 1;
          if (pkmn.disabledMoveTurns === 0) {
            pkmn.disabledMoveId = undefined;
            pushLog(`🔓 ${pkmn.nickname} is no longer disabled!`);
          }
        }
      }
    });

    // 2. Sandstorm chip damage (1/16 max HP to non-Rock/Steel/Ground active Pokemon)
    if (activeField.weather === 'Sandstorm') {
      [...hostActiveSlots.map((i) => nextMyTeam[i]), ...guestActiveSlots.map((i) => nextOppTeam[i])].forEach((pkmn) => {
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
            pushLog(`⏳ ${pkmn.nickname} is buffeted by the sandstorm! (-${chip} HP)`);
            if (pkmn.currentHp <= 0) {
              pkmn.isFainted = true;
              pushLog(`${pkmn.nickname} fainted from the sandstorm!`);
            }
          }
        }
      });
    }

    // 3. Weather & Terrain duration countdown
    if (!conditionsSetThisTurn.has('weather') && activeField.weather && activeField.weather !== 'Clear') {
      activeField.weatherTurns = (activeField.weatherTurns || 5) - 1;
      if (activeField.weatherTurns <= 0) {
        pushLog(`☀️ The ${activeField.weather.toLowerCase()} cleared up!`);
        activeField.weather = 'Clear';
      }
    }
    if (!conditionsSetThisTurn.has('terrain') && activeField.terrain && activeField.terrain !== 'None') {
      activeField.terrainTurns = (activeField.terrainTurns || 5) - 1;
      if (activeField.terrainTurns <= 0) {
        pushLog(`✨ The ${activeField.terrain.toLowerCase()} terrain faded away!`);
        activeField.terrain = 'None';
      }
    }
    // 3.5 Field screens & countdowns
    if (!conditionsSetThisTurn.has('trickRoom') && activeField.trickRoom && activeField.trickRoom > 0) {
      activeField.trickRoom -= 1;
      if (activeField.trickRoom <= 0) pushLog(`🔄 The dimensions returned to normal! (Trick Room ended)`, { kind: 'field', field: { ...activeField } });
    }
    if (!conditionsSetThisTurn.has('tailwindTeam1') && activeField.tailwindTeam1 && activeField.tailwindTeam1 > 0) {
      activeField.tailwindTeam1 -= 1;
      if (activeField.tailwindTeam1 <= 0) pushLog(`💨 Your team's Tailwind petered out!`, { kind: 'field', field: { ...activeField } });
    }
    if (!conditionsSetThisTurn.has('tailwindTeam2') && activeField.tailwindTeam2 && activeField.tailwindTeam2 > 0) {
      activeField.tailwindTeam2 -= 1;
      if (activeField.tailwindTeam2 <= 0) pushLog(`💨 Opposing team's Tailwind petered out!`, { kind: 'field', field: { ...activeField } });
    }
    if (!conditionsSetThisTurn.has('reflectTeam1') && activeField.reflectTeam1 && activeField.reflectTeam1 > 0) {
      activeField.reflectTeam1 -= 1;
      if (activeField.reflectTeam1 <= 0) pushLog(`🧱 Your team's Reflect wore off!`, { kind: 'field', field: { ...activeField } });
    }
    if (!conditionsSetThisTurn.has('reflectTeam2') && activeField.reflectTeam2 && activeField.reflectTeam2 > 0) {
      activeField.reflectTeam2 -= 1;
      if (activeField.reflectTeam2 <= 0) pushLog(`🧱 Opposing team's Reflect wore off!`, { kind: 'field', field: { ...activeField } });
    }
    if (!conditionsSetThisTurn.has('lightScreenTeam1') && activeField.lightScreenTeam1 && activeField.lightScreenTeam1 > 0) {
      activeField.lightScreenTeam1 -= 1;
      if (activeField.lightScreenTeam1 <= 0) pushLog(`✨ Your team's Light Screen wore off!`, { kind: 'field', field: { ...activeField } });
    }
    if (!conditionsSetThisTurn.has('lightScreenTeam2') && activeField.lightScreenTeam2 && activeField.lightScreenTeam2 > 0) {
      activeField.lightScreenTeam2 -= 1;
      if (activeField.lightScreenTeam2 <= 0) pushLog(`✨ Opposing team's Light Screen wore off!`, { kind: 'field', field: { ...activeField } });
    }
    if (!conditionsSetThisTurn.has('auroraVeilTeam1') && activeField.auroraVeilTeam1 && activeField.auroraVeilTeam1 > 0) {
      activeField.auroraVeilTeam1 -= 1;
      if (activeField.auroraVeilTeam1 <= 0) pushLog(`❄️ Host's Aurora Veil wore off!`, { kind: 'field', field: { ...activeField } });
    }
    if (!conditionsSetThisTurn.has('auroraVeilTeam2') && activeField.auroraVeilTeam2 && activeField.auroraVeilTeam2 > 0) {
      activeField.auroraVeilTeam2 -= 1;
      if (activeField.auroraVeilTeam2 <= 0) pushLog(`❄️ Opposing Aurora Veil wore off!`, { kind: 'field', field: { ...activeField } });
    }

    // 4. Process Guest / Opponent replacements
    let updatedOppActive = [...guestActiveSlots];
    snapGuestActive = updatedOppActive;
    guestActiveSlots.forEach((oppIdx, slotNum) => {
      const oppMon = nextOppTeam[oppIdx];
      if (oppMon && (oppMon.isFainted || oppMon.currentHp <= 0)) {
        const availableBenchIdx = nextOppTeam.findIndex(
          (p, i) => !updatedOppActive.includes(i) && !p.isFainted && p.currentHp > 0
        );
        if (availableBenchIdx !== -1) {
          updatedOppActive[slotNum] = availableBenchIdx;
          const sentMon = nextOppTeam[availableBenchIdx];
          sentMon.turnsOnField = 1;
          pushLog(`⚡ Opponent sent out ${sentMon.nickname}!`);
          activeField = applyEntranceHazards(sentMon, activeField, false, pushLog);
          if (!sentMon.isFainted) {
            const hostFoes = hostActiveSlots.map((i) => nextMyTeam[i]).filter((f) => f && !f.isFainted && f.currentHp > 0);
            const allies = updatedOppActive.map((i) => nextOppTeam[i]).filter((a) => a && !a.isFainted && a.currentHp > 0);
            activeField = checkEntranceAbilities(sentMon, activeField, pushLog, hostFoes, allies);
          }
        }
      }
    });

    // 5. Process Host / Player replacements
    let updatedMyActive = [...hostActiveSlots];
    snapHostActive = updatedMyActive;
    hostActiveSlots.forEach((myIdx, slotNum) => {
      const myMon = nextMyTeam[myIdx];
      if (myMon && (myMon.isFainted || myMon.currentHp <= 0)) {
        const availableBenchIdx = nextMyTeam.findIndex(
          (p, i) => !updatedMyActive.includes(i) && !p.isFainted && p.currentHp > 0
        );
        if (availableBenchIdx !== -1) {
          updatedMyActive[slotNum] = availableBenchIdx;
          const sentMon = nextMyTeam[availableBenchIdx];
          sentMon.turnsOnField = 1;
          pushLog(`⚡ Go, ${sentMon.nickname}!`);
          activeField = applyEntranceHazards(sentMon, activeField, true, pushLog);
          if (!sentMon.isFainted) {
            const guestFoes = updatedOppActive.map((i) => nextOppTeam[i]).filter((f) => f && !f.isFainted && f.currentHp > 0);
            const allies = updatedMyActive.map((i) => nextMyTeam[i]).filter((a) => a && !a.isFainted && a.currentHp > 0);
            activeField = checkEntranceAbilities(sentMon, activeField, pushLog, guestFoes, allies);
          }
        }
      }
    });

    // 6. Check Win / Loss condition immediately
    let turnWinner: string | null = null;
    const myAllFainted = nextMyTeam.every((p) => p.isFainted || p.currentHp <= 0);
    const oppAllFainted = nextOppTeam.every((p) => p.isFainted || p.currentHp <= 0);

    if (myAllFainted && oppAllFainted) {
      turnWinner = 'Draw';
      pushLog('The battle ended in a Draw!');
    } else if (oppAllFainted) {
      turnWinner = 'Player';
      pushLog('You won the Pokémon Champion battle!');
    } else if (myAllFainted) {
      turnWinner = 'Opponent';
      pushLog('Opponent won the battle!');
    } else {
      pushLog('Turn finished! Choose your next moves.');
    }

    return {
      nextHostTeam: nextMyTeam,
      nextGuestTeam: nextOppTeam,
      activeField,
      turnLogs,
      winner: turnWinner,
      nextHostActive: updatedMyActive,
      nextGuestActive: updatedOppActive
    };
  };