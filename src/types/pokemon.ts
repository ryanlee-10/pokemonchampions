export type PokemonType = 
  | 'Normal' | 'Fire' | 'Water' | 'Grass' | 'Electric' | 'Ice' 
  | 'Fighting' | 'Poison' | 'Ground' | 'Flying' | 'Psychic' | 'Bug' 
  | 'Rock' | 'Ghost' | 'Dragon' | 'Steel' | 'Dark' | 'Fairy';

export type StatName = 'hp' | 'attack' | 'defense' | 'spAtk' | 'spDef' | 'speed';
export type BattleStatName = StatName | 'accuracy' | 'evasion';

export interface StatBlock {
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export interface Nature {
  name: string;
  plus?: StatName;
  minus?: StatName;
}

export type MoveCategory = 'Physical' | 'Special' | 'Status';

export type MoveTarget = 'SingleEnemy' | 'SpreadEnemies' | 'Self' | 'Ally' | 'AllAdjacent';

export interface StatChange {
  stat: BattleStatName;
  stages: number;
  chance?: number;
  target?: 'Self' | 'Target';
}

export interface Move {
  id: string;
  name: string;
  type: PokemonType;
  power: number; // 0 for status
  accuracy: number; // e.g. 100
  pp: number;
  maxPp: number;
  category: MoveCategory;
  target: MoveTarget;
  priority?: number; // default 0
  description: string;
  statusEffect?: 'Burn' | 'Paralysis' | 'Sleep' | 'Poison' | 'Freeze';
  statusChance?: number; // percentage, e.g. 30
  statChanges?: StatChange[];
  flinchChance?: number;
  recoilPercent?: number;
  drainPercent?: number;
  weatherEffect?: 'Sun' | 'Rain' | 'Sandstorm' | 'Snow';
  terrainEffect?: 'Electric' | 'Grassy' | 'Psychic' | 'Misty';
  requiresCharge?: boolean;
  requiresRecharge?: boolean;
  highCritRatio?: boolean;
}

export interface MegaForm {
  megaName: string;
  megaStoneId: string;
  megaTypes?: PokemonType[];
  megaBaseStats: StatBlock;
  megaAbility: string;
  megaSpriteUrl?: string;
}

export interface PokemonSpecies {
  id: string;
  name: string;
  types: PokemonType[];
  baseStats: StatBlock;
  abilities: string[];
  spriteUrl: string;
  learnset: string[]; // move IDs
  megaForm?: MegaForm | MegaForm[];
}

export interface CustomPokemon {
  id: string; // unique instance ID
  speciesId: string;
  nickname?: string;
  level: number; // default 50 for VGC Regulation M-C
  item: string;
  ability: string;
  nature: string;
  evs: StatBlock; // max 66 total, max 32 per stat (1 EV = +1 Stat)
  moves: string[]; // up to 4 move IDs
}

export interface ActivePokemonState {
  instanceId: string;
  species: PokemonSpecies;
  nickname: string;
  level: number;
  item: string;
  ability: string;
  
  // Mega Evolution battle state
  isMegaEvolved?: boolean;
  activeTypes?: PokemonType[];
  activeSpriteUrl?: string;
  
  // Charge / Recharge Turn mechanics
  isChargingMove?: boolean;
  mustRecharge?: boolean;
  
  // Stats calculated for battle at level 50
  maxStats: StatBlock;
  currentHp: number;
  originalEvs?: StatBlock;
  originalIvs?: Partial<StatBlock>;
  originalNature?: string;
  
  // In-battle dynamic modifiers
  statStages: {
    attack: number;
    defense: number;
    spAtk: number;
    spDef: number;
    speed: number;
    accuracy: number;
    evasion: number;
  };
  
  status?: 'Burn' | 'Paralysis' | 'Sleep' | 'Poison' | 'Freeze';
  statusTurns?: number;
  
  // Moves current PP
  moves: {
    move: Move;
    currentPp: number;
  }[];
  
  isFainted: boolean;
  isProtecting?: boolean;
  isFlinched?: boolean;
  timesHit?: number;
  turnsOnField?: number;
  isGlaiveRushVulnerable?: boolean;
}

export type BattleFormat = 'Singles' | 'Doubles';

export interface PlayerTeam {
  playerId: string;
  name: string;
  pokemon: CustomPokemon[];
}

export interface BattleAction {
  playerId: string;
  actorIndex: number; // Index of active pokemon making the move (0 or 1)
  type: 'MOVE' | 'SWITCH';
  moveId?: string;
  targetSlot?: number; // 0 or 1 for enemy active slot, -1 for self, etc.
  switchToTeamIndex?: number;
  megaEvolve?: boolean;
}

export interface BattleFieldConditions {
  weather?: 'Sun' | 'Rain' | 'Sandstorm' | 'Snow' | 'Clear';
  weatherTurns?: number; // turns remaining (5 default, 8 with Weather Rock)
  terrain?: 'Electric' | 'Grassy' | 'Psychic' | 'Misty' | 'None';
  terrainTurns?: number; // turns remaining (5 default)
  trickRoom?: number; // turns remaining
  tailwindTeam1?: number;
  tailwindTeam2?: number;
  reflectTeam1?: number;
  reflectTeam2?: number;
  lightScreenTeam1?: number;
  lightScreenTeam2?: number;
  auroraVeilTeam1?: number;
  auroraVeilTeam2?: number;
}
