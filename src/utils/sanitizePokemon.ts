import type { CustomPokemon } from '../types/pokemon';
import { POKEMON_ROSTER } from '../data/pokemonRoster';
import { MOVES_DATABASE } from '../data/moves';

/**
 * Sanitizes a Pokémon's moveset:
 * 1. Enforces strict max 4 moves (no 5th move).
 * 2. Removes any duplicate moves (e.g. Kingambit with 2 Swords Dances).
 * 3. Ensures moves exist in MOVES_DATABASE and in the species' learnset.
 * 4. Fills up to 4 moves from the species learnset if slots are missing or duplicates were purged.
 */
export function sanitizePokemonMoves(pkmn: CustomPokemon): CustomPokemon {
  const spec = POKEMON_ROSTER.find((s) => s.id === pkmn.speciesId) || POKEMON_ROSTER[0];
  const learnsetSet = new Set(spec.learnset);

  // 1. Filter out empty, non-existent, or unlearnable moves
  const filtered = (pkmn.moves || []).filter(
    (mId) => typeof mId === 'string' && mId.trim() !== '' && MOVES_DATABASE[mId] && learnsetSet.has(mId)
  );

  // 2. Deduplicate
  const uniqueMoves: string[] = [];
  const seen = new Set<string>();
  for (const m of filtered) {
    if (!seen.has(m)) {
      seen.add(m);
      uniqueMoves.push(m);
    }
  }

  // 3. Fill up to 4 from learnset if needed
  if (uniqueMoves.length < 4) {
    for (const learnable of spec.learnset) {
      if (!seen.has(learnable) && MOVES_DATABASE[learnable]) {
        seen.add(learnable);
        uniqueMoves.push(learnable);
        if (uniqueMoves.length >= 4) break;
      }
    }
  }

  // 4. Strict slice to 4
  const finalMoves = uniqueMoves.slice(0, 4);

  return {
    ...pkmn,
    moves: finalMoves,
  };
}

export function sanitizeTeam(team: CustomPokemon[]): CustomPokemon[] {
  return team.map(sanitizePokemonMoves);
}
