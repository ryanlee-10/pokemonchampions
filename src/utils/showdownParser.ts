import type { CustomPokemon, StatBlock } from '../types/pokemon';
import { POKEMON_ROSTER } from '../data/pokemonRoster';
import { MOVES_DATABASE } from '../data/moves';
import { HELD_ITEMS } from '../data/items';
import { NATURES } from '../data/natures';
import { sanitizePokemonMoves } from './sanitizePokemon';

/** Export a single Pokémon to standard Pokémon Showdown paste format */
export function exportToShowdown(pkmn: CustomPokemon): string {
  const species = POKEMON_ROSTER.find((s) => s.id === pkmn.speciesId);
  if (!species) return '';

  const heldItemObj = HELD_ITEMS.find((i) => i.id === pkmn.item);
  const itemName = heldItemObj && heldItemObj.id !== 'none' ? heldItemObj.name : undefined;

  let text = species.name;
  if (pkmn.nickname && pkmn.nickname.trim() !== '' && pkmn.nickname !== species.name) {
    text = `${pkmn.nickname} (${species.name})`;
  }
  if (itemName) {
    text += ` @ ${itemName}`;
  }
  text += '\n';

  text += `Ability: ${pkmn.ability || species.abilities[0]}\n`;
  text += `Level: ${pkmn.level || 50}\n`;

  const evParts: string[] = [];
  if (pkmn.evs.hp) evParts.push(`${pkmn.evs.hp} HP`);
  if (pkmn.evs.attack) evParts.push(`${pkmn.evs.attack} Atk`);
  if (pkmn.evs.defense) evParts.push(`${pkmn.evs.defense} Def`);
  if (pkmn.evs.spAtk) evParts.push(`${pkmn.evs.spAtk} SpA`);
  if (pkmn.evs.spDef) evParts.push(`${pkmn.evs.spDef} SpD`);
  if (pkmn.evs.speed) evParts.push(`${pkmn.evs.speed} Spe`);
  if (evParts.length > 0) text += `EVs: ${evParts.join(' / ')}\n`;

  text += `${pkmn.nature || 'Adamant'} Nature\n`;

  for (const moveId of pkmn.moves) {
    const move = MOVES_DATABASE[moveId];
    if (move) text += `- ${move.name}\n`;
  }

  return text.trim();
}

/** Export an entire team to standard Pokémon Showdown paste format */
export function exportTeamToShowdown(team: CustomPokemon[]): string {
  return team
    .map(exportToShowdown)
    .filter(Boolean)
    .join('\n\n');
}

/** Result of parsing Pokémon Showdown paste */
export interface ParseShowdownResult {
  pokemon: CustomPokemon[];
  warnings: string[];
  skipped: string[];
}

/** Normalized key helper (lowercase alphanumeric only) */
function toKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Lookup maps for fast and tolerant matching */
const speciesMap = new Map<string, typeof POKEMON_ROSTER[0]>();
POKEMON_ROSTER.forEach((spec) => {
  speciesMap.set(toKey(spec.id), spec);
  speciesMap.set(toKey(spec.name), spec);
});

// Common Showdown species aliases mapping to our 74-mon Regulation M-C roster
const SPECIES_ALIASES: Record<string, string> = {
  rotomw: 'rotom_wash',
  rotomwash: 'rotom_wash',
  basculegion: 'basculegion',
  basculegionm: 'basculegion',
  basculegionmale: 'basculegion',
  indeedee: 'indeedee_f',
  indeedeef: 'indeedee_f',
  indeedeefemale: 'indeedee_f',
  indeedeem: 'indeedee_m',
  indeedeemale: 'indeedee_m',
  floette: 'floette_eternal',
  floetteeternal: 'floette_eternal',
  floetteeternalflower: 'floette_eternal',
  arcanineh: 'arcanine_hisui',
  arcaninehisui: 'arcanine_hisui',
  ninetalesa: 'ninetales_alola',
  ninetalesalola: 'ninetales_alola',
  lycanrocd: 'lycanroc_dusk',
  lycanrocdusk: 'lycanroc_dusk',
  meowstic: 'meowstic',
  meowsticm: 'meowstic',
  meowsticf: 'meowstic',
  toxtricity: 'toxtricity',
  toxtricityamped: 'toxtricity',
  toxtricitylowkey: 'toxtricity',
  maushold: 'maushold',
  mausholdfour: 'maushold',
  mausholdthree: 'maushold',
  sirfetchd: 'sirfetchd',
};

const itemMap = new Map<string, typeof HELD_ITEMS[0]>();
HELD_ITEMS.forEach((it) => {
  itemMap.set(toKey(it.id), it);
  itemMap.set(toKey(it.name), it);
});

// Explicitly banned/unsupported items in Regulation M-C
const DISALLOWED_ITEMS = new Set([
  'assaultvest',
  'choicespecs',
  'choiceband',
  'boosterenergy',
  'covertcloak',
]);

const moveMap = new Map<string, typeof MOVES_DATABASE[string]>();
Object.entries(MOVES_DATABASE).forEach(([id, mv]) => {
  moveMap.set(toKey(id), mv);
  moveMap.set(toKey(mv.name), mv);
});

const natureSet = new Set(NATURES.map((n) => n.name.toLowerCase()));

/**
 * Parses a Pokémon Showdown text paste or PokéPaste.
 * Strictly adheres to the current 74 Pokémon roster and Regulation M-C ruleset.
 */
export function parseShowdownText(text: string): ParseShowdownResult {
  const warnings: string[] = [];
  const skipped: string[] = [];
  const parsedTeam: CustomPokemon[] = [];

  if (!text || !text.trim()) {
    return { pokemon: [], warnings: ['Paste text is empty.'], skipped: [] };
  }

  // Split into Pokémon blocks by blank lines
  const rawBlocks = text
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  for (const block of rawBlocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) continue;

    const firstLine = lines[0];

    // Parse Header Line: "Nickname (Species) @ Item" or "Species (Gender) @ Item" or "Species @ Item"
    let headerWithoutItem = firstLine;
    let rawItemName = '';
    const atIndex = firstLine.indexOf('@');
    if (atIndex !== -1) {
      headerWithoutItem = firstLine.substring(0, atIndex).trim();
      rawItemName = firstLine.substring(atIndex + 1).trim();
    }

    let speciesRaw = headerWithoutItem;
    let nickname = '';

    // Check for "Nickname (Species)" or "Species (Gender)"
    const parenMatch = headerWithoutItem.match(/^(.*?)\s*\((.*?)\)$/);
    if (parenMatch) {
      const part1 = parenMatch[1].trim();
      const part2 = parenMatch[2].trim();

      // If paren is just (M) or (F) gender indicator
      if (part2.toUpperCase() === 'M' || part2.toUpperCase() === 'F') {
        speciesRaw = part1;
      } else {
        // part1 is nickname, part2 is species
        nickname = part1;
        speciesRaw = part2;
      }
    }

    // Strip remaining gender flags if any
    speciesRaw = speciesRaw.replace(/\s*\([MFmf]\)\s*$/, '').trim();

    // Look up Species
    const speciesLookupKey = toKey(speciesRaw);
    let matchedSpecies = speciesMap.get(speciesLookupKey);
    if (!matchedSpecies && SPECIES_ALIASES[speciesLookupKey]) {
      const aliasedId = SPECIES_ALIASES[speciesLookupKey];
      matchedSpecies = speciesMap.get(toKey(aliasedId));
    }

    if (!matchedSpecies) {
      skipped.push(`${speciesRaw || 'Unknown Pokémon'} (not in Regulation M-C roster)`);
      continue;
    }

    // Look up Item
    let resolvedItem = 'none';
    if (rawItemName) {
      const itemLookupKey = toKey(rawItemName);
      if (DISALLOWED_ITEMS.has(itemLookupKey)) {
        warnings.push(`${matchedSpecies.name}: Item '${rawItemName}' is not allowed in Regulation M-C ruleset (set to None).`);
      } else {
        const foundItem = itemMap.get(itemLookupKey);
        if (foundItem) {
          resolvedItem = foundItem.id;
        } else {
          warnings.push(`${matchedSpecies.name}: Held item '${rawItemName}' not recognized (set to None).`);
        }
      }
    }

    let ability = matchedSpecies.abilities[0];
    let level = 50;
    let nature = 'Adamant';
    const evs: StatBlock = { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 };
    const parsedMoves: string[] = [];

    // Parse remaining lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Ability:
      if (/^ability:/i.test(line)) {
        const rawAb = line.replace(/^ability:\s*/i, '').trim();
        const matchingAb = matchedSpecies.abilities.find(
          (a) => toKey(a) === toKey(rawAb)
        );
        if (matchingAb) {
          ability = matchingAb;
        } else {
          warnings.push(`${matchedSpecies.name}: Ability '${rawAb}' is invalid for this species (using '${ability}').`);
        }
        continue;
      }

      // Level:
      if (/^level:/i.test(line)) {
        const lvlNum = parseInt(line.replace(/^level:\s*/i, '').trim(), 10);
        if (!isNaN(lvlNum) && lvlNum >= 1 && lvlNum <= 100) {
          level = lvlNum;
        }
        continue;
      }

      // Nature: "<Nature> Nature"
      const natureMatch = line.match(/^([A-Za-z]+)\s+nature/i);
      if (natureMatch) {
        const natName = natureMatch[1].toLowerCase();
        if (natureSet.has(natName)) {
          nature = natName.charAt(0).toUpperCase() + natName.slice(1);
        }
        continue;
      }

      // EVs: "EVs: 252 HP / 252 Atk / 4 Spe"
      if (/^evs:/i.test(line)) {
        const evContent = line.replace(/^evs:\s*/i, '').trim();
        const statParts = evContent.split('/');
        for (const part of statParts) {
          const match = part.trim().match(/^(\d+)\s*([A-Za-z]+)$/i);
          if (match) {
            const rawVal = parseInt(match[1], 10);
            const statTag = match[2].toLowerCase();

            // Convert standard 0..252 EV to game's 0..32 scale (4 EV = 1 point, 252 EV = 32 points)
            let scaledVal = rawVal;
            if (rawVal > 32) {
              scaledVal = rawVal === 4 ? 1 : Math.min(32, Math.max(0, Math.round((rawVal / 252) * 32)));
            } else {
              scaledVal = Math.min(32, Math.max(0, rawVal));
            }

            if (statTag === 'hp') evs.hp = scaledVal;
            else if (statTag === 'atk' || statTag === 'attack') evs.attack = scaledVal;
            else if (statTag === 'def' || statTag === 'defense') evs.defense = scaledVal;
            else if (statTag === 'spa' || statTag === 'spatk' || statTag === 'spattack') evs.spAtk = scaledVal;
            else if (statTag === 'spd' || statTag === 'spdef' || statTag === 'spdefense') evs.spDef = scaledVal;
            else if (statTag === 'spe' || statTag === 'speed') evs.speed = scaledVal;
          }
        }
        continue;
      }

      // Moves: "- Move Name"
      if (line.startsWith('-')) {
        const rawMoveName = line.replace(/^-\s*/, '').trim();
        const foundMove = moveMap.get(toKey(rawMoveName));
        if (foundMove) {
          if (!parsedMoves.includes(foundMove.id)) {
            parsedMoves.push(foundMove.id);
          }
        } else {
          warnings.push(`${matchedSpecies.name}: Move '${rawMoveName}' not found in database.`);
        }
        continue;
      }
    }

    // Ensure total EVs do not exceed 66
    let evSum = evs.hp + evs.attack + evs.defense + evs.spAtk + evs.spDef + evs.speed;
    if (evSum > 66) {
      const statKeys: (keyof StatBlock)[] = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'];
      while (evSum > 66) {
        // find highest stat and decrease by 1
        let maxKey: keyof StatBlock = 'hp';
        let maxVal = -1;
        for (const k of statKeys) {
          if (evs[k] > maxVal) {
            maxVal = evs[k];
            maxKey = k;
          }
        }
        if (maxVal <= 0) break;
        evs[maxKey]--;
        evSum--;
      }
    }

    const uniqueId = `imported_${matchedSpecies.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const customPkmn: CustomPokemon = {
      id: uniqueId,
      speciesId: matchedSpecies.id,
      nickname: nickname || matchedSpecies.name,
      level,
      item: resolvedItem,
      ability,
      nature,
      evs,
      moves: parsedMoves
    };

    // Sanitize moves: ensure valid, learnable, and exactly 4 unique moves
    const sanitizedPkmn = sanitizePokemonMoves(customPkmn);
    parsedTeam.push(sanitizedPkmn);
  }

  return {
    pokemon: parsedTeam,
    warnings,
    skipped
  };
}

export function generateRandomCpuTeam(): CustomPokemon[] {
  // Select 6 distinct random species from POKEMON_ROSTER for the CPU opponent
  const shuffled = [...POKEMON_ROSTER].sort(() => 0.5 - Math.random());
  const selectedSpecies = shuffled.slice(0, 6);
  const commonItems = ['none', 'sitrus_berry', 'leftovers', 'life_orb', 'rocky_helmet', 'focus_sash'];

  return selectedSpecies.map((spec, idx) => {
    let item = commonItems[idx % commonItems.length];
    if (spec.megaForm) {
      const megaStone = Array.isArray(spec.megaForm) ? spec.megaForm[0].megaStoneId : spec.megaForm.megaStoneId;
      item = megaStone;
    }

    return {
      id: `cpu_${spec.id}_${idx}_${Date.now()}`,
      speciesId: spec.id,
      nickname: spec.name,
      level: 50,
      item: item,
      ability: spec.abilities[0] || 'Overgrow',
      nature: 'Adamant',
      evs: { hp: 32, attack: 32, defense: 2, spAtk: 0, spDef: 0, speed: 0 },
      moves: Array.from(new Set(spec.learnset)).slice(0, 4)
    };
  });
}
