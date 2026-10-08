import type { ActivePokemonState, BattleAction, BattleFieldConditions, BattleFormat } from '../types/pokemon';
import { MOVES_DATABASE } from '../data/moves';
import { calculateAllStats } from './statCalc';
import { calculateDamage, isGrounded, INTIMIDATE_IMMUNE } from './damageCalc';

export type LogMeta = {
  kind?: 'damage' | 'heal' | 'status' | 'stat' | 'faint' | 'ability' | 'field' | 'switch';
  id?: string;
  amount?: number;
  stat?: string;
  dir?: 'up' | 'down';
  field?: any;
};

export type Logger = (msg: string, meta?: LogMeta) => void;

export const checkEntranceAbilities = (
  enteringMon: ActivePokemonState,
  currentFields: BattleFieldConditions,
  logger: Logger,
  foes?: ActivePokemonState[]
): BattleFieldConditions => {
  const updated = { ...currentFields };
  const ab = enteringMon.ability;
  const announce = () =>
    logger(`${enteringMon.nickname}'s ${ab}`, { kind: 'ability', id: enteringMon.instanceId, field: { ...updated } });
  const effect = (text: string) => logger(text, { kind: 'field', field: { ...updated } });
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
          logger(`${foe.nickname}'s ${foe.ability} prevents Attack loss!`, { kind: 'ability', id: foe.instanceId });
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
    const turnLogs: { text: string; meta?: LogMeta }[] = [];
    const pushLog = (txt: string, meta?: LogMeta) => {
      turnLogs.push({ text: txt, meta });
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
      const isTailwind = isPlayer ? Boolean(activeField.tailwindTeam1 && activeField.tailwindTeam1 > 0) : Boolean(activeField.tailwindTeam2 && activeField.tailwindTeam2 > 0);
      if (isTailwind) {
        spd = Math.floor(spd * 2);
      }
      return spd;
    };

    // Combine actions and sort by priority & speed
    const allActions: { action: BattleAction; isMyAction: boolean; speed: number; priority: number; randomTiebreaker: number }[] = [];

    myActs.forEach((act) => {
      const actualSlotIdx = alivePlayerActiveIndices[act.actorIndex] ?? hostActiveSlots[act.actorIndex];
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
      }
      allActions.push({
        action: act,
        isMyAction: true,
        speed: getEffectiveSpeed(actorPkmn, true, act),
        priority,
        randomTiebreaker: Math.random()
      });
    });

    oppActs.forEach((act) => {
      const actualSlotIdx = aliveOppActiveIndices[act.actorIndex] ?? guestActiveSlots[act.actorIndex];
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
      }
      allActions.push({
        action: act,
        isMyAction: false,
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

    // Execute actions sequentially
    allActions.forEach(({ action, isMyAction }) => {
      const attackerTeam = isMyAction ? nextMyTeam : nextOppTeam;
      const defenderTeam = isMyAction ? nextOppTeam : nextMyTeam;
      const attackerActiveIndices = isMyAction ? hostActiveSlots : guestActiveSlots;
      const defenderActiveIndices = isMyAction ? guestActiveSlots : hostActiveSlots;

      const attackerSlotIndex = attackerActiveIndices[action.actorIndex];
      const attacker = attackerTeam[attackerSlotIndex];

      if (!attacker || attacker.isFainted || attacker.currentHp <= 0) return;

      // Handle SWITCH
      if (action.type === 'SWITCH' && action.switchToTeamIndex !== undefined) {
        const newPkmn = attackerTeam[action.switchToTeamIndex];
        if (newPkmn && newPkmn.currentHp > 0) {
          pushLog(`🔄 ${attacker.nickname} withdrew! Go! ${newPkmn.nickname}!`);
          attackerActiveIndices[action.actorIndex] = action.switchToTeamIndex;
          attacker.statStages = { attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 };
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

        // Decrement move PP properly!
        const moveEntry = attacker.moves.find((m) => m.move.id === move.id);
        if (moveEntry && moveEntry.currentPp > 0) {
          moveEntry.currentPp -= 1;
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
          const terrainText: Record<string, string> = {
            Grassy: '🌿 An emerald turf spread across the battlefield!',
            Psychic: '🔮 The battlefield got weird and mysterious!',
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

        // Glaive Rush: User takes 2x double damage until its next move
        if (move.id === 'glaive_rush') {
          attacker.isGlaiveRushVulnerable = true;
          pushLog(`⚠️ ${attacker.nickname} used Glaive Rush and is vulnerable to double damage!`);
        } else {
          pushLog(`${attacker.nickname} used ${move.name}!`);
        }

        // Double Shock: User loses Electric typing until switched out
        if (move.id === 'double_shock') {
          const currentTypes = attacker.activeTypes || attacker.species.types;
          if (currentTypes.includes('Electric')) {
            attacker.activeTypes = currentTypes.filter((t) => t !== 'Electric');
            pushLog(`⚡ ${attacker.nickname} used up all its electricity and lost its Electric typing!`);
          }
        }

        // Aurora Veil: Usable only in Snow, blocks 1/3 physical and special damage taken
        if (move.id === 'aurora_veil') {
          if (activeField.weather !== 'Snow') {
            pushLog(`${attacker.nickname} used Aurora Veil... but it failed! (Aurora Veil can only be used during Snow)`);
            return;
          }
          const veilTurns = attacker.item === 'light_clay' ? 8 : 5;
          if (isMyAction) {
            activeField = { ...activeField, auroraVeilTeam1: veilTurns };
          } else {
            activeField = { ...activeField, auroraVeilTeam2: veilTurns };
          }
          pushLog(`❄️ ${attacker.nickname} set up an Aurora Veil! (Blocks 1/3 of physical & special damage for ${veilTurns} turns)`);
          return;
        }

        const checkMoveHit = (m: typeof move, _atk: typeof attacker, def: typeof attacker): boolean => {
          if (def.isGlaiveRushVulnerable) return true; // All moves hit during Glaive Rush vulnerability
          if (activeField.weather === 'Rain' && (m.id === 'thunder' || m.id === 'hurricane')) return true;
          if (activeField.weather === 'Sun' && (m.id === 'thunder' || m.id === 'hurricane')) {
            return Math.random() * 100 <= 50; // Accuracy drops to 50% in Sun
          }
          if (m.accuracy === null || m.accuracy === undefined || m.accuracy === 0) return true;
          return Math.random() * 100 <= m.accuracy;
        };

        const isDefAuroraActive = isMyAction
          ? Boolean(activeField.auroraVeilTeam2 && activeField.auroraVeilTeam2 > 0)
          : Boolean(activeField.auroraVeilTeam1 && activeField.auroraVeilTeam1 > 0);

        let moveEffectivePriority = move.priority || 0;
        if (move.id === 'grassy_glide' && activeField.terrain === 'Grassy' && isGrounded(attacker)) {
          moveEffectivePriority = 1;
        }

        const applyMoveSecondaryEffects = (m: typeof move, atk: typeof attacker, def: typeof attacker, damageDealt: number) => {
          // 1. Flinch (e.g. Fake Out, Icicle Crash, Rock Slide, Iron Head, Headbutt)
          if (m.flinchChance && Math.random() * 100 < m.flinchChance) {
            if (def.ability !== 'Inner Focus') {
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
                    pushLog(`${targetPkmn.nickname}'s ${statNameFormatted} ${direction}${amountText}`, { kind: 'stat', id: targetPkmn.instanceId, dir: sc.stages > 0 ? 'up' : 'down' });
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
                pushLog(`🔮 Psychic Terrain protected ${defender.nickname} from ${attacker.nickname}'s ${move.name}!`);
                return;
              }
              if (!checkMoveHit(move, attacker, defender)) {
                pushLog(`${attacker.nickname}'s attack missed ${defender.nickname}!`);
                return;
              }
              defender.timesHit = (defender.timesHit || 0) + 1;
              const res = calculateDamage(attacker, defender, move, format, false, attackerTeam, isDefAuroraActive, activeField);
              defender.currentHp = Math.max(0, defender.currentHp - res.damage);
              if (res.description) pushLog(res.description);
              pushLog(`${defender.nickname} took ${res.damage} damage!`);

              applyMoveSecondaryEffects(move, attacker, defender, res.damage);

              if (defender.currentHp <= 0) {
                defender.isFainted = true;
                pushLog(`${defender.nickname} fainted!`);
              }

              // Recoil damage calculation
              if (move.recoilPercent && res.damage > 0 && !attacker.isFainted) {
                const recoilDamage = Math.max(1, Math.floor((res.damage * move.recoilPercent) / 100));
                attacker.currentHp = Math.max(0, attacker.currentHp - recoilDamage);
                pushLog(`${attacker.nickname} took ${recoilDamage} recoil damage!`);
                if (attacker.currentHp <= 0) {
                  attacker.isFainted = true;
                  pushLog(`${attacker.nickname} fainted from recoil!`);
                }
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

            if (!checkMoveHit(move, attacker, defender)) {
              pushLog(`${attacker.nickname}'s attack missed ${defender.nickname}!`);
              return;
            }

            defender.timesHit = (defender.timesHit || 0) + 1;
            const res = calculateDamage(attacker, defender, move, format, false, attackerTeam, isDefAuroraActive, activeField);
            defender.currentHp = Math.max(0, defender.currentHp - res.damage);
            if (res.description) pushLog(res.description);
            pushLog(`${defender.nickname} took ${res.damage} damage!`);

            applyMoveSecondaryEffects(move, attacker, defender, res.damage);

            if (defender.currentHp <= 0) {
              defender.isFainted = true;
              pushLog(`${defender.nickname} fainted!`);
            }

            // Recoil damage calculation
            if (move.recoilPercent && res.damage > 0 && !attacker.isFainted) {
              const recoilDamage = Math.max(1, Math.floor((res.damage * move.recoilPercent) / 100));
              attacker.currentHp = Math.max(0, attacker.currentHp - recoilDamage);
              pushLog(`${attacker.nickname} took ${recoilDamage} recoil damage!`);
              if (attacker.currentHp <= 0) {
                attacker.isFainted = true;
                pushLog(`${attacker.nickname} fainted from recoil!`);
              }
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

    // Increment turns on field for active Pokemon
    hostActiveSlots.forEach((idx) => {
      if (nextMyTeam[idx] && !nextMyTeam[idx].isFainted) {
        nextMyTeam[idx].turnsOnField = (nextMyTeam[idx].turnsOnField || 1) + 1;
      }
    });
    guestActiveSlots.forEach((idx) => {
      if (nextOppTeam[idx] && !nextOppTeam[idx].isFainted) {
        nextOppTeam[idx].turnsOnField = (nextOppTeam[idx].turnsOnField || 1) + 1;
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
    if (activeField.weather && activeField.weather !== 'Clear') {
      activeField.weatherTurns = (activeField.weatherTurns || 5) - 1;
      if (activeField.weatherTurns <= 0) {
        pushLog(`☀️ The ${activeField.weather.toLowerCase()} cleared up!`);
        activeField.weather = 'Clear';
      }
    }
    if (activeField.terrain && activeField.terrain !== 'None') {
      activeField.terrainTurns = (activeField.terrainTurns || 5) - 1;
      if (activeField.terrainTurns <= 0) {
        pushLog(`✨ The ${activeField.terrain.toLowerCase()} terrain faded away!`);
        activeField.terrain = 'None';
      }
    }
    if (activeField.auroraVeilTeam1 && activeField.auroraVeilTeam1 > 0) {
      activeField.auroraVeilTeam1 -= 1;
      if (activeField.auroraVeilTeam1 <= 0) pushLog(`Host's Aurora Veil wore off!`);
    }
    if (activeField.auroraVeilTeam2 && activeField.auroraVeilTeam2 > 0) {
      activeField.auroraVeilTeam2 -= 1;
      if (activeField.auroraVeilTeam2 <= 0) pushLog(`Opposing Aurora Veil wore off!`);
    }

    // 4. Process Guest / Opponent replacements
    let updatedOppActive = [...guestActiveSlots];
    guestActiveSlots.forEach((oppIdx, slotNum) => {
      const oppMon = nextOppTeam[oppIdx];
      if (oppMon && (oppMon.isFainted || oppMon.currentHp <= 0)) {
        const availableBenchIdx = nextOppTeam.findIndex(
          (p, i) => !updatedOppActive.includes(i) && !p.isFainted && p.currentHp > 0
        );
        if (availableBenchIdx !== -1) {
          updatedOppActive[slotNum] = availableBenchIdx;
          nextOppTeam[availableBenchIdx].turnsOnField = 1;
          pushLog(`⚡ Opponent sent out ${nextOppTeam[availableBenchIdx].nickname}!`);
          activeField = checkEntranceAbilities(nextOppTeam[availableBenchIdx], activeField, pushLog);
        }
      }
    });

    // 5. Process Host / Player replacements
    let updatedMyActive = [...hostActiveSlots];
    hostActiveSlots.forEach((myIdx, slotNum) => {
      const myMon = nextMyTeam[myIdx];
      if (myMon && (myMon.isFainted || myMon.currentHp <= 0)) {
        const availableBenchIdx = nextMyTeam.findIndex(
          (p, i) => !updatedMyActive.includes(i) && !p.isFainted && p.currentHp > 0
        );
        if (availableBenchIdx !== -1) {
          updatedMyActive[slotNum] = availableBenchIdx;
          nextMyTeam[availableBenchIdx].turnsOnField = 1;
          pushLog(`⚡ Go, ${nextMyTeam[availableBenchIdx].nickname}!`);
          activeField = checkEntranceAbilities(nextMyTeam[availableBenchIdx], activeField, pushLog);
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