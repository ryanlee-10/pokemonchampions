import type { CustomPokemon } from '../types/pokemon';
import { POKEMON_ROSTER } from '../data/pokemonRoster';
import { MOVES_DATABASE } from '../data/moves';

export function exportToShowdown(pkmn: CustomPokemon): string {
  const species = POKEMON_ROSTER.find((s) => s.id === pkmn.speciesId);
  if (!species) return '';

  let text = `${species.name} @ ${pkmn.item || 'No Item'}\n`;
  text += `Ability: ${pkmn.ability || species.abilities[0]}\n`;
  
  const evParts: string[] = [];
  if (pkmn.evs.hp) evParts.push(`${pkmn.evs.hp} HP`);
  if (pkmn.evs.attack) evParts.push(`${pkmn.evs.attack} Atk`);
  if (pkmn.evs.defense) evParts.push(`${pkmn.evs.defense} Def`);
  if (pkmn.evs.spAtk) evParts.push(`${pkmn.evs.spAtk} SpA`);
  if (pkmn.evs.spDef) evParts.push(`${pkmn.evs.spDef} SpD`);
  if (pkmn.evs.speed) evParts.push(`${pkmn.evs.speed} Spe`);
  if (evParts.length > 0) text += `EVs: ${evParts.join(' / ')}\n`;

  text += `${pkmn.nature} Nature\n`;

  for (const moveId of pkmn.moves) {
    const move = MOVES_DATABASE[moveId];
    if (move) text += `- ${move.name}\n`;
  }

  return text.trim();
}

export function generateRandomCpuTeam(): CustomPokemon[] {
  // Select 4 distinct random species from POKEMON_ROSTER for the CPU opponent
  const shuffled = [...POKEMON_ROSTER].sort(() => 0.5 - Math.random());
  const selectedSpecies = shuffled.slice(0, 4);
  const commonItems = ['none'];

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
      moves: spec.learnset.slice(0, 4)
    };
  });
}
