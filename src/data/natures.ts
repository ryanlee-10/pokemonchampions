import type { Nature } from '../types/pokemon';

export const NATURES: Nature[] = [
  { name: 'Hardy' },
  { name: 'Lonely', plus: 'attack', minus: 'defense' },
  { name: 'Brave', plus: 'attack', minus: 'speed' },
  { name: 'Adamant', plus: 'attack', minus: 'spAtk' },
  { name: 'Naughty', plus: 'attack', minus: 'spDef' },

  { name: 'Bold', plus: 'defense', minus: 'attack' },
  { name: 'Docile' },
  { name: 'Relaxed', plus: 'defense', minus: 'speed' },
  { name: 'Impish', plus: 'defense', minus: 'spAtk' },
  { name: 'Lax', plus: 'defense', minus: 'spDef' },

  { name: 'Timid', plus: 'speed', minus: 'attack' },
  { name: 'Hasty', plus: 'speed', minus: 'defense' },
  { name: 'Serious' },
  { name: 'Jolly', plus: 'speed', minus: 'spAtk' },
  { name: 'Naive', plus: 'speed', minus: 'spDef' },

  { name: 'Modest', plus: 'spAtk', minus: 'attack' },
  { name: 'Mild', plus: 'spAtk', minus: 'defense' },
  { name: 'Quiet', plus: 'spAtk', minus: 'speed' },
  { name: 'Bashful' },
  { name: 'Rash', plus: 'spAtk', minus: 'spDef' },

  { name: 'Calm', plus: 'spDef', minus: 'attack' },
  { name: 'Gentle', plus: 'spDef', minus: 'defense' },
  { name: 'Sassy', plus: 'spDef', minus: 'speed' },
  { name: 'Careful', plus: 'spDef', minus: 'spAtk' },
  { name: 'Quirky' },
];

export function getNatureMultiplier(natureName: string, stat: string): number {
  const nature = NATURES.find((n) => n.name.toLowerCase() === natureName.toLowerCase());
  if (!nature) return 1.0;
  if (nature.plus === stat) return 1.1;
  if (nature.minus === stat) return 0.9;
  return 1.0;
}
