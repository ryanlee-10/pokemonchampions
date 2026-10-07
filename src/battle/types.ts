import type { BattleFieldConditions } from '../types/pokemon';

export type LogKind =
  | 'info' | 'turn' | 'move' | 'damage' | 'ability' | 'stat'
  | 'status' | 'field' | 'faint' | 'switch' | 'system' | 'chat';

export const STAT_ORDER = ['attack', 'defense', 'spAtk', 'spDef', 'speed', 'accuracy', 'evasion'] as const;
export type StageStat = (typeof STAT_ORDER)[number];

export const STAT_LABEL: Record<string, string> = {
  attack: 'Attack', defense: 'Defense', spAtk: 'Sp. Atk', spDef: 'Sp. Def',
  speed: 'Speed', accuracy: 'Accuracy', evasion: 'Evasiveness', hp: 'HP',
};

/** Compact per-Pokémon state captured after each log line so the UI can replay a turn step by step. */
export interface MonSnap {
  id: string;
  hp: number;
  mx: number;
  f: boolean;
  s?: string;
  st: number[]; // order = STAT_ORDER
  nm: string;
  sp?: string;
}

export interface BattleSnap {
  mons: MonSnap[];
  field: BattleFieldConditions;
  /** [host active team indices, guest active team indices] */
  act: [number[], number[]];
}

export interface LogMeta {
  kind?: LogKind;
  id?: string;
  ids?: string[];
  moveType?: string;
  category?: string;
  dir?: 'up' | 'down';
  stat?: string;
  amount?: number;
  field?: BattleFieldConditions;
}

export interface BattleEvent {
  text: string;
  meta?: LogMeta;
  snap: BattleSnap;
}

export interface LogEntry {
  id: number;
  turn: number;
  text: string;
  kind: LogKind;
}

export interface ChatMessage {
  id: number;
  mine: boolean;
  name: string;
  text: string;
}

export interface MatchStats {
  turns: number;
  damageDealt: number;
  damageTaken: number;
  koDealt: number;
  koTaken: number;
}

export const getSpriteUrls = (speciesId: string) => {
  const key = speciesId.toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9-]/g, '');
  return {
    front: `https://play.pokemonshowdown.com/sprites/ani/${key}.gif`,
    back: `https://play.pokemonshowdown.com/sprites/ani-back/${key}.gif`,
    icon: `https://play.pokemonshowdown.com/sprites/gen5/${key}.png`,
  };
};
