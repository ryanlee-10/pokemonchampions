import type { ActivePokemonState, BattleFormat, Move } from '../types/pokemon';
import { getTypeEffectiveness } from '../data/typeChart';
import { getStatStageMultiplier } from './statCalc';
import { isSlicingMove, isPunchMove, isSoundMove, hasSecondaryEffect, makesContact } from '../data/moveFlags';

export const INTIMIDATE_IMMUNE = ['Inner Focus', 'Own Tempo', 'Oblivious', 'Scrappy', 'Clear Body', 'White Smoke', 'Hyper Cutter', 'Full Metal Body', 'Guard Dog'];

export interface DamageResult {
  damage: number;
  isCrit: boolean;
  effectiveness: number; // 0, 0.25, 0.5, 1, 2, 4
  randomRoll: number; // 85 to 100
  description: string;
}

export function isGrounded(pokemon: ActivePokemonState): boolean {
  const types = pokemon.activeTypes || pokemon.species.types;
  if (types.includes('Flying')) return false;
  if (pokemon.ability === 'Levitate') return false;
  if (pokemon.item === 'air_balloon') return false;
  return true;
}

/**
 * Official Main-Series Pokémon Damage Formula (Gen 6+ standard).
 * Step-by-step integer math matching standard cartridge/Showdown behavior.
 */
export function calculateDamage(
  attacker: ActivePokemonState,
  defender: ActivePokemonState,
  move: Move,
  format: BattleFormat,
  forceCrit: boolean = false,
  attackerTeam?: ActivePokemonState[],
  isDefenderAuroraVeilActive: boolean = false,
  field?: CalcFieldConditions
): DamageResult {
  if (move.category === 'Status' || move.power === 0) {
    return { damage: 0, isCrit: false, effectiveness: 1, randomRoll: 100, description: '' };
  }

  const isMoldBreaker = attacker.ability === 'Mold Breaker';
  const effectiveDefenderAbility = isMoldBreaker ? '' : defender.ability;

  // Cloud Nine suppresses all weather
  const isCloudNine = attacker.ability === 'Cloud Nine' || defender.ability === 'Cloud Nine';
  const effectiveWeather = isCloudNine ? 'Clear' : (field?.weather || 'Clear');

  const level = attacker.level || 50;
  let power = move.power;
  let moveType = move.type;

  // Type-changing abilities
  if (attacker.ability === 'Pixilate' && moveType === 'Normal') {
    moveType = 'Fairy';
    power = Math.floor(power * 1.2);
  } else if (attacker.ability === 'Liquid Voice' && isSoundMove(move)) {
    moveType = 'Water';
  }

  // Weather Ball dynamically changes type and doubles power in weather
  if (move.id === 'weather_ball' && effectiveWeather !== 'Clear') {
    power = 100;
    if (effectiveWeather === 'Sun') moveType = 'Fire';
    else if (effectiveWeather === 'Rain') moveType = 'Water';
    else if (effectiveWeather === 'Sandstorm') moveType = 'Rock';
    else if (effectiveWeather === 'Snow') moveType = 'Ice';
  }

  // Solar Beam & Solar Blade power is halved in non-Sun weather (Rain, Sandstorm, Snow)
  if ((move.id === 'solar_beam' || move.id === 'solar_blade') && effectiveWeather !== 'Sun' && effectiveWeather !== 'Clear') {
    power = Math.floor(power * 0.5);
  }

  // Dynamic Move Power Calculations for Rage Fist & Last Respects
  if (move.id === 'rage_fist') {
    const hits = attacker.timesHit || 0;
    power = 50 + Math.min(300, hits * 50);
  } else if (move.id === 'last_respects') {
    const faintedCount = attackerTeam ? attackerTeam.filter((p) => p.isFainted || p.currentHp <= 0).length : 0;
    power = 50 + faintedCount * 50;
  }

  // Supreme Overlord Ability (Boosts move power by 10% per fainted ally, max 5 allies / +50%)
  if (attacker.ability === 'Supreme Overlord' && attackerTeam) {
    const faintedAllies = Math.min(5, attackerTeam.filter((p) => (p.isFainted || p.currentHp <= 0) && p.instanceId !== attacker.instanceId).length);
    if (faintedAllies > 0) {
      power = Math.floor(power * (1 + faintedAllies * 0.1));
    }
  }

  // Base power boosting abilities
  if (attacker.ability === 'Technician' && power <= 60 && power > 0) {
    power = Math.floor(power * 1.5);
  }
  if (attacker.ability === 'Sharpness' && isSlicingMove(move)) {
    power = Math.floor(power * 1.5);
  }
  if (attacker.ability === 'Iron Fist' && isPunchMove(move)) {
    power = Math.floor(power * 1.2);
  }
  if (attacker.ability === 'Reckless' && move.recoilPercent && move.recoilPercent > 0) {
    power = Math.floor(power * 1.2);
  }
  if (attacker.ability === 'Punk Rock' && isSoundMove(move)) {
    power = Math.floor(power * 1.3);
  }
  if (attacker.ability === 'Sheer Force' && hasSecondaryEffect(move)) {
    power = Math.floor(power * 1.3);
  }
  if (attacker.hasFlashFireActive && moveType === 'Fire') {
    power = Math.floor(power * 1.5);
  }

  // Pinch abilities (Blaze, Overgrow, Torrent, Swarm) when HP <= 33%
  if (attacker.currentHp <= Math.floor(attacker.maxStats.hp / 3)) {
    if (attacker.ability === 'Blaze' && moveType === 'Fire') power = Math.floor(power * 1.5);
    else if (attacker.ability === 'Overgrow' && moveType === 'Grass') power = Math.floor(power * 1.5);
    else if (attacker.ability === 'Torrent' && moveType === 'Water') power = Math.floor(power * 1.5);
    else if (attacker.ability === 'Swarm' && moveType === 'Bug') power = Math.floor(power * 1.5);
  }

  // Terrain Power Modifiers (Grounded checks)
  if (field?.terrain === 'Electric' && moveType === 'Electric' && isGrounded(attacker)) {
    power = Math.floor(power * 1.3);
  } else if (field?.terrain === 'Grassy' && moveType === 'Grass' && isGrounded(attacker)) {
    power = Math.floor(power * 1.3);
  } else if (field?.terrain === 'Psychic' && moveType === 'Psychic' && isGrounded(attacker)) {
    power = Math.floor(power * 1.3);
  } else if (field?.terrain === 'Misty' && moveType === 'Dragon' && isGrounded(defender)) {
    power = Math.floor(power * 0.5);
  }

  // Expanding Force boosted on Psychic Terrain
  if (field?.terrain === 'Psychic' && move.id === 'expanding_force' && isGrounded(attacker)) {
    power = Math.floor(power * 1.5);
  }

  // Sand Force Ability (Boosts Rock, Ground, Steel moves by 30% in Sandstorm)
  if (effectiveWeather === 'Sandstorm' && attacker.ability === 'Sand Force' && ['Rock', 'Ground', 'Steel'].includes(moveType)) {
    power = Math.floor(power * 1.3);
  }

  // Determine Attack vs Defense stat category
  let atkStatName: 'attack' | 'spAtk' = move.category === 'Physical' ? 'attack' : 'spAtk';
  let defStatName: 'defense' | 'spDef' = move.category === 'Physical' ? 'defense' : 'spDef';

  let attackValue = attacker.maxStats[atkStatName] * getStatStageMultiplier(attacker.statStages[atkStatName]);
  let defenseValue = defender.maxStats[defStatName] * getStatStageMultiplier(defender.statStages[defStatName]);

  // Solar Power in Sun (Sp. Atk x1.5)
  if (effectiveWeather === 'Sun' && attacker.ability === 'Solar Power' && atkStatName === 'spAtk') {
    attackValue = Math.floor(attackValue * 1.5);
  }

  // Marvel Scale (Def x1.5 if statused)
  if (effectiveDefenderAbility === 'Marvel Scale' && defender.status && defStatName === 'defense') {
    defenseValue = Math.floor(defenseValue * 1.5);
  }

  // Weather Defensive Stat Boosts
  const defTypes = defender.activeTypes || defender.species.types;
  if (effectiveWeather === 'Sandstorm' && defStatName === 'spDef' && defTypes.includes('Rock')) {
    defenseValue = Math.floor(defenseValue * 1.5);
  }
  if (effectiveWeather === 'Snow' && defStatName === 'defense' && defTypes.includes('Ice')) {
    defenseValue = Math.floor(defenseValue * 1.5);
  }

  // Held Item Stat Modifiers
  if (attacker.item === 'life_orb') attackValue = Math.floor(attackValue * 1.3);

  // Critical Hit Determination (Gen 7-9 official mechanics)
  const isAlwaysCrit =
    forceCrit ||
    move.id === 'surging_strikes' ||
    move.id === 'wicked_blow' ||
    move.id === 'flower_trick';

  let critStage = 0;
  if (move.highCritRatio) critStage += 1;
  if (attacker.item === 'scope_lens') critStage += 1;
  if (attacker.ability === 'Super Luck') critStage += 1;

  let critProbability = 1 / 24; // Stage 0: ~4.17%
  if (critStage === 1) critProbability = 1 / 8; // 12.5%
  else if (critStage === 2) critProbability = 1 / 2; // 50.0%
  else if (critStage >= 3) critProbability = 1.0; // 100.0%

  const isCrit = isAlwaysCrit || Math.random() < critProbability;

  // Step 1: Base Damage formula
  let damage = Math.floor(
    Math.floor(Math.floor((2 * level) / 5 + 2) * power * (attackValue / Math.max(1, defenseValue))) / 50
  ) + 2;

  // Step 2: Doubles Spread Move Penalty (0.75x multiplier for multi-target attacks in 2v2)
  if (format === 'Doubles' && move.target === 'SpreadEnemies') {
    damage = Math.floor(damage * 0.75);
  }

  // Step 2.5: Weather Modifiers (Sun / Rain)
  if (effectiveWeather === 'Sun') {
    if (moveType === 'Fire') damage = Math.floor(damage * 1.5);
    if (moveType === 'Water') damage = Math.floor(damage * 0.5);
  } else if (effectiveWeather === 'Rain') {
    if (moveType === 'Water') damage = Math.floor(damage * 1.5);
    if (moveType === 'Fire') damage = Math.floor(damage * 0.5);
  }

  // Step 2.8: Grassy Terrain Halves Ground-type Damage against Grounded Pokémon
  if (field?.terrain === 'Grassy' && moveType === 'Ground' && isGrounded(defender)) {
    damage = Math.floor(damage * 0.5);
  }

  // Step 3: Critical Hit multiplier
  if (isCrit) {
    damage = Math.floor(damage * 1.5);
  }

  // Step 4: Official Main-Series Discrete Random Roll (Integer between 85 and 100 inclusive)
  const randomRoll = Math.floor(Math.random() * 16) + 85; // 85, 86, 87, ..., 100
  damage = Math.floor((damage * randomRoll) / 100);

  // Step 5: STAB (Same Type Attack Bonus - 1.5x multiplier)
  const attackerTypes = attacker.activeTypes || attacker.species.types;
  const isStab = attackerTypes.includes(moveType);
  if (isStab) {
    const stabMultiplier = attacker.ability === 'Adaptability' ? 2.0 : 1.5;
    damage = Math.floor(damage * stabMultiplier);
  }

  // Tough Claws: Contact moves deal 1.3x damage
  if (attacker.ability === 'Tough Claws' && makesContact(move)) {
    damage = Math.floor(damage * 1.3);
  }

  // Step 6: Type Effectiveness Multiplier (0x, 0.25x, 0.5x, 1x, 2x, 4x)
  const defenderTypes = defender.activeTypes || defender.species.types;
  const effectiveness = getTypeEffectiveness(moveType, defenderTypes);
  damage = Math.floor(damage * effectiveness);

  // Step 7: Burn Penalty (0.5x multiplier for physical attacks when burned)
  if (attacker.status === 'Burn' && move.category === 'Physical' && attacker.ability !== 'Guts') {
    damage = Math.floor(damage * 0.5);
  }

  // Step 7.5: Aurora Veil / Reflect / Light Screen damage reduction (Bypassed by Infiltrator)
  const bypassScreens = attacker.ability === 'Infiltrator';
  if (!bypassScreens) {
    if ((isDefenderAuroraVeilActive || field?.auroraVeil) && effectiveness > 0) {
      damage = Math.floor(damage * (format === 'Doubles' ? 0.66 : 0.5));
    } else if (field?.reflect && move.category === 'Physical' && effectiveness > 0) {
      damage = Math.floor(damage * (format === 'Doubles' ? 0.66 : 0.5));
    } else if (field?.lightScreen && move.category === 'Special' && effectiveness > 0) {
      damage = Math.floor(damage * (format === 'Doubles' ? 0.66 : 0.5));
    }
  }

  // Multiscale Ability (Halves damage when defender is at full HP)
  if (effectiveDefenderAbility === 'Multiscale' && defender.currentHp >= defender.maxStats.hp && effectiveness > 0) {
    damage = Math.floor(damage * 0.5);
  }

  // Punk Rock (Defender takes 50% damage from sound moves)
  if (effectiveDefenderAbility === 'Punk Rock' && isSoundMove(move) && effectiveness > 0) {
    damage = Math.floor(damage * 0.5);
  }

  // Thick Fat (Defender takes 50% damage from Fire and Ice attacks)
  if (effectiveDefenderAbility === 'Thick Fat' && (moveType === 'Fire' || moveType === 'Ice') && effectiveness > 0) {
    damage = Math.floor(damage * 0.5);
  }

  // Heatproof (Defender takes 50% damage from Fire attacks)
  if (effectiveDefenderAbility === 'Heatproof' && moveType === 'Fire' && effectiveness > 0) {
    damage = Math.floor(damage * 0.5);
  }

  // Step 7.8: Glaive Rush vulnerability (defender takes 2x double damage)
  let isGlaiveVulnerableHit = false;
  if (defender.isGlaiveRushVulnerable) {
    damage = Math.floor(damage * 2);
    isGlaiveVulnerableHit = true;
  }

  // Step 8: Minimum 1 damage if move lands and is type-effective (> 0)
  if (effectiveness > 0 && damage < 1) {
    damage = 1;
  }

  let desc = '';
  if (effectiveness === 0) desc = `It doesn't affect ${defender.nickname}...`;
  else if (effectiveness >= 4) desc = "It's extremely effective!";
  else if (effectiveness >= 2) desc = "It's super effective!";
  else if (effectiveness > 0 && effectiveness < 1) desc = "It's not very effective...";

  if (effectiveWeather === 'Sun' && moveType === 'Fire') desc += ' (☀️ Boosted by Sun!)';
  if (effectiveWeather === 'Sun' && moveType === 'Water') desc += ' (☀️ Weakened by Sun!)';
  if (effectiveWeather === 'Rain' && moveType === 'Water') desc += ' (🌧️ Boosted by Rain!)';
  if (effectiveWeather === 'Rain' && moveType === 'Fire') desc += ' (🌧️ Weakened by Rain!)';
  if (field?.terrain === 'Grassy' && moveType === 'Ground' && isGrounded(defender)) desc += ' (🌿 Halved by Grassy Terrain!)';

  if (isGlaiveVulnerableHit && effectiveness > 0) desc += ' (2x Glaive Rush Vulnerability!)';
  if (isCrit && effectiveness > 0) desc += ' A critical hit!';

  return {
    damage,
    isCrit,
    effectiveness,
    randomRoll,
    description: desc
  };
}

export interface DamageSpreadResult {
  minDamage: number;
  maxDamage: number;
  rolls: number[];
  minPercent: number;
  maxPercent: number;
  effectiveness: number;
  ohkoChance: number; // 0 to 100
  twoHkoChance: number; // 0 to 100
  koVerdict: string;
  description: string;
}

export interface CalcFieldConditions {
  weather?: 'Sun' | 'Rain' | 'Sandstorm' | 'Snow' | 'Clear';
  terrain?: 'Electric' | 'Grassy' | 'Psychic' | 'Misty' | 'None';
  reflect?: boolean;
  lightScreen?: boolean;
  auroraVeil?: boolean;
}

export function calculateDamageSpread(
  attacker: ActivePokemonState,
  defender: ActivePokemonState,
  move: Move,
  format: BattleFormat = 'Doubles',
  field: CalcFieldConditions = {}
): DamageSpreadResult {
  if (move.category === 'Status' || move.power === 0) {
    return {
      minDamage: 0,
      maxDamage: 0,
      rolls: new Array(16).fill(0),
      minPercent: 0,
      maxPercent: 0,
      effectiveness: 1,
      ohkoChance: 0,
      twoHkoChance: 0,
      koVerdict: 'Status move (0 damage)',
      description: 'Status move'
    };
  }

  const isMoldBreaker = attacker.ability === 'Mold Breaker';
  const effectiveDefenderAbility = isMoldBreaker ? '' : defender.ability;

  // Cloud Nine suppresses all weather
  const isCloudNine = attacker.ability === 'Cloud Nine' || defender.ability === 'Cloud Nine';
  const effectiveWeather = isCloudNine ? 'Clear' : (field.weather || 'Clear');

  const level = attacker.level || 50;
  let power = move.power;
  let moveType = move.type;

  // Type-changing abilities
  if (attacker.ability === 'Pixilate' && moveType === 'Normal') {
    moveType = 'Fairy';
    power = Math.floor(power * 1.2);
  } else if (attacker.ability === 'Liquid Voice' && isSoundMove(move)) {
    moveType = 'Water';
  }

  // Weather Ball dynamically changes type and doubles power in weather
  if (move.id === 'weather_ball' && effectiveWeather !== 'Clear') {
    power = 100;
    if (effectiveWeather === 'Sun') moveType = 'Fire';
    else if (effectiveWeather === 'Rain') moveType = 'Water';
    else if (effectiveWeather === 'Sandstorm') moveType = 'Rock';
    else if (effectiveWeather === 'Snow') moveType = 'Ice';
  }

  // Solar Beam & Solar Blade power is halved in non-Sun weather (Rain, Sandstorm, Snow)
  if ((move.id === 'solar_beam' || move.id === 'solar_blade') && effectiveWeather !== 'Sun' && effectiveWeather !== 'Clear') {
    power = Math.floor(power * 0.5);
  }

  if (move.id === 'rage_fist') {
    const hits = attacker.timesHit || 0;
    power = 50 + Math.min(300, hits * 50);
  } else if (move.id === 'last_respects') {
    power = 150;
  }

  // Base power boosting abilities
  if (attacker.ability === 'Technician' && power <= 60 && power > 0) {
    power = Math.floor(power * 1.5);
  }
  if (attacker.ability === 'Sharpness' && isSlicingMove(move)) {
    power = Math.floor(power * 1.5);
  }
  if (attacker.ability === 'Iron Fist' && isPunchMove(move)) {
    power = Math.floor(power * 1.2);
  }
  if (attacker.ability === 'Reckless' && move.recoilPercent && move.recoilPercent > 0) {
    power = Math.floor(power * 1.2);
  }
  if (attacker.ability === 'Punk Rock' && isSoundMove(move)) {
    power = Math.floor(power * 1.3);
  }
  if (attacker.ability === 'Sheer Force' && hasSecondaryEffect(move)) {
    power = Math.floor(power * 1.3);
  }
  if (attacker.hasFlashFireActive && moveType === 'Fire') {
    power = Math.floor(power * 1.5);
  }

  // Pinch abilities (Blaze, Overgrow, Torrent, Swarm) when HP <= 33%
  if (attacker.currentHp <= Math.floor(attacker.maxStats.hp / 3)) {
    if (attacker.ability === 'Blaze' && moveType === 'Fire') power = Math.floor(power * 1.5);
    else if (attacker.ability === 'Overgrow' && moveType === 'Grass') power = Math.floor(power * 1.5);
    else if (attacker.ability === 'Torrent' && moveType === 'Water') power = Math.floor(power * 1.5);
    else if (attacker.ability === 'Swarm' && moveType === 'Bug') power = Math.floor(power * 1.5);
  }

  // Terrain boosts (Grounded check)
  if (field.terrain === 'Electric' && moveType === 'Electric' && isGrounded(attacker)) power = Math.floor(power * 1.3);
  if (field.terrain === 'Grassy' && moveType === 'Grass' && isGrounded(attacker)) power = Math.floor(power * 1.3);
  if (field.terrain === 'Psychic' && moveType === 'Psychic' && isGrounded(attacker)) power = Math.floor(power * 1.3);
  if (field.terrain === 'Psychic' && move.id === 'expanding_force' && isGrounded(attacker)) power = Math.floor(power * 1.5);
  if (field.terrain === 'Misty' && moveType === 'Dragon' && isGrounded(defender)) power = Math.floor(power * 0.5);

  const atkStatName: 'attack' | 'spAtk' = move.category === 'Physical' ? 'attack' : 'spAtk';
  const defStatName: 'defense' | 'spDef' = move.category === 'Physical' ? 'defense' : 'spDef';

  let attackValue = attacker.maxStats[atkStatName] * getStatStageMultiplier(attacker.statStages[atkStatName]);
  let defenseValue = defender.maxStats[defStatName] * getStatStageMultiplier(defender.statStages[defStatName]);

  // Solar Power in Sun (Sp. Atk x1.5)
  if (effectiveWeather === 'Sun' && attacker.ability === 'Solar Power' && atkStatName === 'spAtk') {
    attackValue = Math.floor(attackValue * 1.5);
  }

  // Marvel Scale (Def x1.5 if statused)
  if (effectiveDefenderAbility === 'Marvel Scale' && defender.status && defStatName === 'defense') {
    defenseValue = Math.floor(defenseValue * 1.5);
  }

  // Weather defensive stat boosts
  const defenderTypes = defender.activeTypes || defender.species.types;
  if (effectiveWeather === 'Sandstorm' && defStatName === 'spDef' && defenderTypes.includes('Rock')) {
    defenseValue = Math.floor(defenseValue * 1.5);
  }
  if (effectiveWeather === 'Snow' && defStatName === 'defense' && defenderTypes.includes('Ice')) {
    defenseValue = Math.floor(defenseValue * 1.5);
  }

  // Item modifiers
  if (attacker.item === 'life_orb') attackValue = Math.floor(attackValue * 1.3);

  // Ruin abilities
  if (attacker.ability === 'Sword of Ruin' && move.category === 'Physical') defenseValue = Math.floor(defenseValue * 0.75);
  if (attacker.ability === 'Beads of Ruin' && move.category === 'Special') defenseValue = Math.floor(defenseValue * 0.75);

  let baseDmg = Math.floor(
    Math.floor(Math.floor((2 * level) / 5 + 2) * power * (attackValue / Math.max(1, defenseValue))) / 50
  ) + 2;

  if (format === 'Doubles' && move.target === 'SpreadEnemies') {
    baseDmg = Math.floor(baseDmg * 0.75);
  }

  // Weather modifier (Sun: Fire +50%, Water -50%; Rain: Water +50%, Fire -50%)
  if (effectiveWeather === 'Sun') {
    if (moveType === 'Fire') baseDmg = Math.floor(baseDmg * 1.5);
    if (moveType === 'Water') baseDmg = Math.floor(baseDmg * 0.5);
  } else if (effectiveWeather === 'Rain') {
    if (moveType === 'Water') baseDmg = Math.floor(baseDmg * 1.5);
    if (moveType === 'Fire') baseDmg = Math.floor(baseDmg * 0.5);
  }

  // Grassy Terrain halves Ground-type damage against grounded targets
  if (field.terrain === 'Grassy' && moveType === 'Ground' && isGrounded(defender)) {
    baseDmg = Math.floor(baseDmg * 0.5);
  }

  // STAB
  const attackerTypes = attacker.activeTypes || attacker.species.types;
  const isStab = attackerTypes.includes(moveType);
  if (isStab) {
    const stabMultiplier = attacker.ability === 'Adaptability' ? 2.0 : 1.5;
    baseDmg = Math.floor(baseDmg * stabMultiplier);
  }

  // Tough Claws: Contact moves deal 1.3x damage
  if (attacker.ability === 'Tough Claws' && makesContact(move)) {
    baseDmg = Math.floor(baseDmg * 1.3);
  }

  // Type-boosting Items
  const typeBoosters: Record<string, string> = {
    silver_powder: 'Bug', black_glasses: 'Dark', dragon_fang: 'Dragon', magnet: 'Electric', fairy_feather: 'Fairy', black_belt: 'Fighting', charcoal: 'Fire', sharp_beak: 'Flying', spell_tag: 'Ghost', miracle_seed: 'Grass', soft_sand: 'Ground', never_melt_ice: 'Ice', silk_scarf: 'Normal', poison_barb: 'Poison', twisted_spoon: 'Psychic', hard_stone: 'Rock', metal_coat: 'Steel', mystic_water: 'Water'
  };
  if (typeBoosters[attacker.item] === moveType) {
    baseDmg = Math.floor(baseDmg * 1.2);
  }

  // Type effectiveness
  let effectiveness = getTypeEffectiveness(moveType, defenderTypes);
  
  // Type-resist Berries
  const resistBerries: Record<string, string> = {
    occa_berry: 'Fire', passho_berry: 'Water', wacan_berry: 'Electric', rindo_berry: 'Grass', yache_berry: 'Ice', chople_berry: 'Fighting', kebia_berry: 'Poison', shuca_berry: 'Ground', coba_berry: 'Flying', payapa_berry: 'Psychic', tanga_berry: 'Bug', charti_berry: 'Rock', kasib_berry: 'Ghost', haban_berry: 'Dragon', colbur_berry: 'Dark', babiri_berry: 'Steel', roseli_berry: 'Fairy'
  };
  let berryActivated = false;
  if (effectiveness > 1 && resistBerries[defender.item] === moveType && !defender.itemConsumed) {
    effectiveness = effectiveness * 0.5;
    berryActivated = true;
  }

  // Expert Belt
  if (attacker.item === 'expert_belt' && effectiveness > 1) {
    baseDmg = Math.floor(baseDmg * 1.2);
  }

  // Burn
  if (attacker.status === 'Burn' && move.category === 'Physical' && attacker.ability !== 'Guts') {
    baseDmg = Math.floor(baseDmg * 0.5);
  }

  // Screens (Bypassed by Infiltrator)
  const bypassScreens = attacker.ability === 'Infiltrator';
  if (!bypassScreens) {
    if (field.auroraVeil) {
      baseDmg = Math.floor(baseDmg * (format === 'Doubles' ? 0.66 : 0.5));
    } else if (field.reflect && move.category === 'Physical') {
      baseDmg = Math.floor(baseDmg * (format === 'Doubles' ? 0.66 : 0.5));
    } else if (field.lightScreen && move.category === 'Special') {
      baseDmg = Math.floor(baseDmg * (format === 'Doubles' ? 0.66 : 0.5));
    }
  }

  // Multiscale Ability (Halves damage when defender is at full HP)
  if (effectiveDefenderAbility === 'Multiscale' && defender.currentHp >= defender.maxStats.hp && effectiveness > 0) {
    baseDmg = Math.floor(baseDmg * 0.5);
  }

  // Punk Rock (Defender takes 50% damage from sound moves)
  if (effectiveDefenderAbility === 'Punk Rock' && isSoundMove(move) && effectiveness > 0) {
    baseDmg = Math.floor(baseDmg * 0.5);
  }

  // Thick Fat (Defender takes 50% damage from Fire and Ice attacks)
  if (effectiveDefenderAbility === 'Thick Fat' && (moveType === 'Fire' || moveType === 'Ice') && effectiveness > 0) {
    baseDmg = Math.floor(baseDmg * 0.5);
  }

  // Heatproof (Defender takes 50% damage from Fire attacks)
  if (effectiveDefenderAbility === 'Heatproof' && moveType === 'Fire' && effectiveness > 0) {
    baseDmg = Math.floor(baseDmg * 0.5);
  }

  if (defender.isGlaiveRushVulnerable) {
    baseDmg = Math.floor(baseDmg * 2);
  }

  // Calculate 16 damage rolls (85 to 100)
  const rolls: number[] = [];
  for (let r = 85; r <= 100; r++) {
    let rollDmg = Math.floor((baseDmg * r) / 100);
    rollDmg = Math.floor(rollDmg * effectiveness);
    if (effectiveness > 0 && rollDmg < 1) rollDmg = 1;
    rolls.push(rollDmg);
  }

  const minDamage = rolls[0];
  const maxDamage = rolls[rolls.length - 1];
  const defHp = Math.max(1, defender.maxStats.hp);
  const minPercent = Number(((minDamage / defHp) * 100).toFixed(1));
  const maxPercent = Number(((maxDamage / defHp) * 100).toFixed(1));

  // OHKO probability
  const ohkoCount = rolls.filter((d) => d >= defHp).length;
  const ohkoChance = Number(((ohkoCount / 16) * 100).toFixed(1));

  // 2HKO probability (approximation across roll distribution pairs)
  let twoHkoCount = 0;
  for (const r1 of rolls) {
    for (const r2 of rolls) {
      if (r1 + r2 >= defHp) twoHkoCount++;
    }
  }
  const twoHkoChance = Number(((twoHkoCount / 256) * 100).toFixed(1));

  let koVerdict = '';
  if (effectiveness === 0) {
    koVerdict = 'Immune (0% damage)';
  } else if (ohkoChance === 100) {
    koVerdict = 'Guaranteed OHKO';
  } else if (ohkoChance > 0) {
    koVerdict = `${ohkoChance}% chance to OHKO`;
  } else if (twoHkoChance === 100) {
    koVerdict = 'Guaranteed 2HKO';
  } else if (twoHkoChance > 0) {
    koVerdict = `${twoHkoChance}% chance to 2HKO`;
  } else if (minPercent * 3 >= 100) {
    koVerdict = 'Guaranteed 3HKO';
  } else if (maxPercent * 3 >= 100) {
    koVerdict = 'Possible 3HKO';
  } else {
    koVerdict = '4+ HKO';
  }

  let desc = '';
  if (effectiveness === 0) desc = 'No effect';
  else if (effectiveness >= 4) desc = `Extremely effective (${effectiveness}x)`;
  else if (effectiveness >= 2) desc = `Super effective (${effectiveness}x)`;
  else if (effectiveness > 0 && effectiveness < 1) desc = `Not very effective (${effectiveness}x)`;
  else desc = 'Neutral (1x)';

  if (field.weather === 'Sun' && moveType === 'Fire') desc += ' • ☀️ Sun boosted (+50%)';
  if (field.weather === 'Sun' && moveType === 'Water') desc += ' • ☀️ Sun weakened (-50%)';
  if (field.weather === 'Rain' && moveType === 'Water') desc += ' • 🌧️ Rain boosted (+50%)';
  if (field.weather === 'Rain' && moveType === 'Fire') desc += ' • 🌧️ Rain weakened (-50%)';
  if (field.terrain === 'Grassy' && moveType === 'Ground' && isGrounded(defender)) desc += ' • 🌿 Grassy Terrain halved (-50%)';
  if (field.terrain === 'Grassy' && moveType === 'Grass' && isGrounded(attacker)) desc += ' • 🌿 Grassy Terrain boosted (+30%)';
  if (field.terrain === 'Electric' && moveType === 'Electric' && isGrounded(attacker)) desc += ' • ⚡ Electric Terrain boosted (+30%)';
  if (field.terrain === 'Psychic' && moveType === 'Psychic' && isGrounded(attacker)) desc += ' • 🔮 Psychic Terrain boosted (+30%)';
  if (typeBoosters[attacker.item] === moveType) desc += ` • 💥 Item boosted (+20%)`;
  if (berryActivated) desc += ` • 🫐 Berry halved damage`;

  return {
    minDamage,
    maxDamage,
    rolls,
    minPercent,
    maxPercent,
    effectiveness,
    ohkoChance,
    twoHkoChance,
    koVerdict,
    description: desc
  };
}

