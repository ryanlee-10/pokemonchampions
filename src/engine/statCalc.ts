import type { CustomPokemon, PokemonSpecies, StatBlock } from '../types/pokemon';
import { getNatureMultiplier } from '../data/natures';

export function calculateStat(
  statName: keyof StatBlock,
  base: number,
  ev: number,
  level: number,
  natureName: string,
  iv: number = 31
): number {
  if (statName === 'hp') {
    if (base === 1) return 1; // Shedinja special case
    // Support both standard 0..252 EV scale and legacy 0..32 training points scale
    const standardEv = ev <= 32 && ev > 0 ? Math.min(252, Math.round((ev / 32) * 252)) : Math.min(252, Math.max(0, ev));
    return Math.floor(((2 * base + iv + Math.floor(standardEv / 4)) * level) / 100) + level + 10;
  }

  const standardEv = ev <= 32 && ev > 0 ? Math.min(252, Math.round((ev / 32) * 252)) : Math.min(252, Math.max(0, ev));
  const baseCalc = Math.floor(((2 * base + iv + Math.floor(standardEv / 4)) * level) / 100) + 5;
  const natureMult = getNatureMultiplier(natureName, statName);
  return Math.floor(baseCalc * natureMult);
}

export function calculateAllStats(
  customPkmn: CustomPokemon,
  species: PokemonSpecies,
  customIvs?: Partial<StatBlock>
): StatBlock {
  const level = customPkmn.level || 50;
  const evs = customPkmn.evs || { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 };
  const ivs: StatBlock = {
    hp: customIvs?.hp ?? 31,
    attack: customIvs?.attack ?? 31,
    defense: customIvs?.defense ?? 31,
    spAtk: customIvs?.spAtk ?? 31,
    spDef: customIvs?.spDef ?? 31,
    speed: customIvs?.speed ?? 31,
  };

  return {
    hp: calculateStat('hp', species.baseStats.hp, evs.hp, level, customPkmn.nature, ivs.hp),
    attack: calculateStat('attack', species.baseStats.attack, evs.attack, level, customPkmn.nature, ivs.attack),
    defense: calculateStat('defense', species.baseStats.defense, evs.defense, level, customPkmn.nature, ivs.defense),
    spAtk: calculateStat('spAtk', species.baseStats.spAtk, evs.spAtk, level, customPkmn.nature, ivs.spAtk),
    spDef: calculateStat('spDef', species.baseStats.spDef, evs.spDef, level, customPkmn.nature, ivs.spDef),
    speed: calculateStat('speed', species.baseStats.speed, evs.speed, level, customPkmn.nature, ivs.speed),
  };
}

export function getStatStageMultiplier(stage: number): number {
  if (stage >= 0) {
    return (2 + stage) / 2;
  } else {
    return 2 / (2 + Math.abs(stage));
  }
}

