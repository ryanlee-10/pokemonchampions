import type { Move } from '../types/pokemon';

/**
 * Moves classified as "Slicing" moves (boosted by 50% under Sharpness).
 */
export const SLICING_MOVE_IDS = new Set<string>([
  'kowtow_cleave',
  'night_slash',
  'shadow_claw',
  'sacred_sword',
  'psycho_cut',
  'bitter_blade',
  'stone_axe',
  'leaf_blade',
  'x_scissor',
  'population_bomb',
  'mortal_spin',
  'air_slash',
  'air_cutter',
  'cross_poison',
  'slash',
  'cut',
  'aerial_ace',
  'aqua_cutter',
  'ceaseless_edge'
]);

export function isSlicingMove(move: Move): boolean {
  return SLICING_MOVE_IDS.has(move.id);
}

/**
 * Moves classified as "Punching" moves (boosted by 20% under Iron Fist).
 */
export const PUNCHING_MOVE_IDS = new Set<string>([
  'mach_punch',
  'bullet_punch',
  'drain_punch',
  'ice_punch',
  'thunder_punch',
  'fire_punch',
  'ice_hammer',
  'hammer_arm',
  'meteor_mash',
  'rage_fist',
  'shadow_punch',
  'focus_punch',
  'wicked_blow',
  'surging_strikes',
  'jet_punch'
]);

export function isPunchMove(move: Move): boolean {
  return PUNCHING_MOVE_IDS.has(move.id);
}

/**
 * Moves classified as "Sound" moves (boosted by 30% under Punk Rock, 50% damage reduction against Punk Rock, converted to Water under Liquid Voice).
 */
export const SOUND_MOVE_IDS = new Set<string>([
  'hyper_voice',
  'boomburst',
  'snarl',
  'bug_buzz',
  'parting_shot',
  'overdrive',
  'perish_song',
  'sparkling_aria',
  'sing',
  'roar',
  'clanging_scales',
  'torch_song',
  'alluring_voice',
  'psychic_noise'
]);

export function isSoundMove(move: Move): boolean {
  return SOUND_MOVE_IDS.has(move.id);
}

/**
 * Non-contact physical moves.
 * In Gen 9, almost all Physical moves make contact except these prominent exceptions.
 */
export const NON_CONTACT_PHYSICAL_MOVE_IDS = new Set<string>([
  'earthquake',
  'rock_slide',
  'stone_edge',
  'high_horsepower',
  'dragon_darts',
  'scale_shot',
  'water_shuriken',
  'icicle_spear',
  'pin_missile',
  'bone_rush',
  'bullet_seed',
  'rock_blast',
  'thousand_arrows',
  'thousand_waves'
]);

export function makesContact(move: Move): boolean {
  if (move.category === 'Status') return false;
  if (move.category === 'Special') {
    // Rare exceptions for special contact moves (e.g. Draining Kiss, Petal Dance)
    return move.id === 'draining_kiss' || move.id === 'petal_dance' || move.id === 'infestation';
  }
  // Physical move
  return !NON_CONTACT_PHYSICAL_MOVE_IDS.has(move.id);
}

/**
 * Moves that possess secondary effects eligible for Sheer Force (30% power boost, secondary effect chance removed).
 */
export function hasSecondaryEffect(move: Move): boolean {
  if (move.category === 'Status') return false;
  if (move.statusEffect) return true;
  if (move.flinchChance && move.flinchChance > 0) return true;
  if (move.statChanges && move.statChanges.some((sc) => sc.target !== 'Self' || (sc.chance && sc.chance < 100))) {
    return true;
  }
  return false;
}
