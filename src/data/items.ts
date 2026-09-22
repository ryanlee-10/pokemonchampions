export interface HeldItem {
  id: string;
  name: string;
  description: string;
  isMegaStone?: boolean;
}

export const HELD_ITEMS: HeldItem[] = [
  { id: 'none', name: 'None', description: 'No item equipped.' },

  // --- MEGA STONES ---
  { id: 'baxcalibrite', name: 'Baxcalibrite', description: 'Allows Baxcalibur to Mega Evolve in battle.', isMegaStone: true },
  { id: 'crabominite', name: 'Crabominite', description: 'Allows Crabominable to Mega Evolve in battle.', isMegaStone: true },
  { id: 'drampanite', name: 'Drampanite', description: 'Allows Drampa to Mega Evolve in battle.', isMegaStone: true },
  { id: 'slowbronite', name: 'Slowbronite', description: 'Allows Slowbro to Mega Evolve in battle.', isMegaStone: true },
  { id: 'salamencite', name: 'Salamencite', description: 'Allows Salamence to Mega Evolve in battle.', isMegaStone: true },
  { id: 'garchompite_z', name: 'Garchompite Z', description: 'Allows Garchomp to Mega Evolve in battle.', isMegaStone: true },
  { id: 'golisopodite', name: 'Golisopodite', description: 'Allows Golisopod to Mega Evolve in battle.', isMegaStone: true },
  { id: 'lucarionite_z', name: 'Lucarionite Z', description: 'Allows Lucario to Mega Evolve into Mega Lucario Z in battle.', isMegaStone: true },
  { id: 'floettite', name: 'Floettite', description: 'Allows Floette (Eternal Flower) to Mega Evolve in battle.', isMegaStone: true },
  { id: 'charizardite_x', name: 'Charizardite X', description: 'Allows Charizard to Mega Evolve into Mega Charizard X in battle.', isMegaStone: true },
  { id: 'charizardite_y', name: 'Charizardite Y', description: 'Allows Charizard to Mega Evolve into Mega Charizard Y in battle.', isMegaStone: true },
  { id: 'metagrossite', name: 'Metagrossite', description: 'Allows Metagross to Mega Evolve in battle.', isMegaStone: true },
  { id: 'gengarite', name: 'Gengarite', description: 'Allows Gengar to Mega Evolve in battle.', isMegaStone: true },
  { id: 'scizorite', name: 'Scizorite', description: 'Allows Scizor to Mega Evolve in battle.', isMegaStone: true },
  { id: 'swampertite', name: 'Swampertite', description: 'Allows Swampert to Mega Evolve in battle.', isMegaStone: true },
  { id: 'venusaurite', name: 'Venusaurite', description: 'Allows Venusaur to Mega Evolve in battle.', isMegaStone: true },
  { id: 'gardevoirite', name: 'Gardevoirite', description: 'Allows Gardevoir to Mega Evolve in battle.', isMegaStone: true },
  { id: 'greninjite', name: 'Greninjite', description: 'Allows Greninja to Mega Evolve in battle.', isMegaStone: true },
  { id: 'dragoninite', name: 'Dragoninite', description: 'Allows Dragonite to Mega Evolve in battle.', isMegaStone: true },
  { id: 'raichunite_y', name: 'Raichunite Y', description: 'Allows Raichu to Mega Evolve into Mega Raichu Y in battle.', isMegaStone: true },
  { id: 'gyaradosite', name: 'Gyaradosite', description: 'Allows Gyarados to Mega Evolve in battle.', isMegaStone: true },
  { id: 'delphoxite', name: 'Delphoxite', description: 'Allows Delphox to Mega Evolve in battle.', isMegaStone: true },
  { id: 'aerodactylite', name: 'Aerodactylite', description: 'Allows Aerodactyl to Mega Evolve in battle.', isMegaStone: true },
  { id: 'scraftinite', name: 'Scraftinite', description: 'Allows Scrafty to Mega Evolve in battle.', isMegaStone: true },
  { id: 'blastoisinite', name: 'Blastoisinite', description: 'Allows Blastoise to Mega Evolve in battle.', isMegaStone: true },
  { id: 'scovillainite', name: 'Scovillainite', description: 'Allows Scovillain to Mega Evolve in battle.', isMegaStone: true },
  { id: 'meowsticite', name: 'Meowsticite', description: 'Allows Meowstic to Mega Evolve in battle.', isMegaStone: true },
  { id: 'staraptorite', name: 'Staraptorite', description: 'Allows Staraptor to Mega Evolve in battle.', isMegaStone: true },
  { id: 'froslassite', name: 'Froslassite', description: 'Allows Froslass to Mega Evolve in battle.', isMegaStone: true },
  { id: 'absolite_z', name: 'Absolite Z', description: 'Allows Absol to Mega Evolve into Mega Absol Z in battle.', isMegaStone: true },

  // --- OFFENSIVE & CHOICE ITEMS ---
  { id: 'focus_sash', name: 'Focus Sash', description: 'If at full HP, endures a single lethal attack with 1 HP.' },
  { id: 'life_orb', name: 'Life Orb', description: 'Boosts move damage by 30%, but loses 10% max HP per attack.' },
  { id: 'choice_scarf', name: 'Choice Scarf', description: 'Boosts Speed by 50%, but locks into the first move used.' },
  { id: 'expert_belt', name: 'Expert Belt', description: 'Boosts damage of super-effective attacks by 20%.' },
  { id: 'scope_lens', name: 'Scope Lens', description: 'Increases the holder\'s critical hit ratio by 1 stage.' },
  { id: 'wide_lens', name: 'Wide Lens', description: 'Increases the accuracy of the holder\'s moves by 10%.' },

  // --- DEFENSIVE & UTILITY ITEMS ---
  { id: 'leftovers', name: 'Leftovers', description: 'Restores 1/16th of max HP at the end of every turn.' },
  { id: 'light_clay', name: 'Light Clay', description: 'Extends screen durations (Reflect, Light Screen, Aurora Veil) from 5 to 8 turns.' },
  { id: 'rocky_helmet', name: 'Rocky Helmet', description: 'Inflicts 1/16 max HP recoil on attackers hitting with contact moves.' },
  { id: 'air_balloon', name: 'Air Balloon', description: 'Provides Ground-type immunity until popped by a direct attack.' },
  { id: 'normal_gem', name: 'Normal Gem', description: 'Boosts the power of the holder\'s first Normal-type move by 30%.' },
  { id: 'red_card', name: 'Red Card', description: 'When hit by a contact move, forces attacker to switch out.' },
  { id: 'eject_button', name: 'Eject Button', description: 'Switches holder out immediately when taking direct damage.' },
  { id: 'binding_band', name: 'Binding Band', description: 'Increases partial-trapping residual damage from 1/8 to 1/6.' },
  { id: 'leek', name: 'Leek', description: 'Increases critical hit ratio of Farfetch\'d and Sirfetch\'d by 2 stages.' },
  { id: 'clear_amulet', name: 'Clear Amulet', description: 'Prevents stats from being lowered by opposing moves or abilities.' },

  // --- WEATHER & TERRAIN EXTENDERS / SEEDS ---
  { id: 'damp_rock', name: 'Damp Rock', description: 'Extends Rain duration from 5 turns to 8 turns.' },
  { id: 'heat_rock', name: 'Heat Rock', description: 'Extends Harsh Sunlight duration from 5 turns to 8 turns.' },
  { id: 'smooth_rock', name: 'Smooth Rock', description: 'Extends Sandstorm duration from 5 turns to 8 turns.' },
  { id: 'icy_rock', name: 'Icy Rock', description: 'Extends Snow duration from 5 turns to 8 turns.' },
  { id: 'terrain_extender', name: 'Terrain Extender', description: 'Extends Terrain duration from 5 turns to 8 turns.' },
  { id: 'grassy_seed', name: 'Grassy Seed', description: 'Boosts Defense by 1 stage when Grassy Terrain is active.' },
  { id: 'psychic_seed', name: 'Psychic Seed', description: 'Boosts Sp. Def by 1 stage when Psychic Terrain is active.' },
  { id: 'electric_seed', name: 'Electric Seed', description: 'Boosts Defense by 1 stage when Electric Terrain is active.' },
  { id: 'misty_seed', name: 'Misty Seed', description: 'Boosts Sp. Def by 1 stage when Misty Terrain is active.' },

  // --- TYPE BOOSTING ITEMS (20% BOOST) ---
  { id: 'silver_powder', name: 'Silver Powder', description: 'Boosts the power of Bug-type moves by 20%.' },
  { id: 'black_glasses', name: 'Black Glasses', description: 'Boosts the power of Dark-type moves by 20%.' },
  { id: 'dragon_fang', name: 'Dragon Fang', description: 'Boosts the power of Dragon-type moves by 20%.' },
  { id: 'magnet', name: 'Magnet', description: 'Boosts the power of Electric-type moves by 20%.' },
  { id: 'fairy_feather', name: 'Fairy Feather', description: 'Boosts the power of Fairy-type moves by 20%.' },
  { id: 'black_belt', name: 'Black Belt', description: 'Boosts the power of Fighting-type moves by 20%.' },
  { id: 'charcoal', name: 'Charcoal', description: 'Boosts the power of Fire-type moves by 20%.' },
  { id: 'sharp_beak', name: 'Sharp Beak', description: 'Boosts the power of Flying-type moves by 20%.' },
  { id: 'spell_tag', name: 'Spell Tag', description: 'Boosts the power of Ghost-type moves by 20%.' },
  { id: 'miracle_seed', name: 'Miracle Seed', description: 'Boosts the power of Grass-type moves by 20%.' },
  { id: 'soft_sand', name: 'Soft Sand', description: 'Boosts the power of Ground-type moves by 20%.' },
  { id: 'never_melt_ice', name: 'Never-Melt Ice', description: 'Boosts the power of Ice-type moves by 20%.' },
  { id: 'silk_scarf', name: 'Silk Scarf', description: 'Boosts the power of Normal-type moves by 20%.' },
  { id: 'poison_barb', name: 'Poison Barb', description: 'Boosts the power of Poison-type moves by 20%.' },
  { id: 'twisted_spoon', name: 'Twisted Spoon', description: 'Boosts the power of Psychic-type moves by 20%.' },
  { id: 'hard_stone', name: 'Hard Stone', description: 'Boosts the power of Rock-type moves by 20%.' },
  { id: 'metal_coat', name: 'Metal Coat', description: 'Boosts the power of Steel-type moves by 20%.' },
  { id: 'mystic_water', name: 'Mystic Water', description: 'Boosts the power of Water-type moves by 20%.' },

  // --- BERRIES ---
  { id: 'sitrus_berry', name: 'Sitrus Berry', description: 'Restores 25% max HP when HP drops below 50%.' },
  { id: 'occa_berry', name: 'Occa Berry', description: 'Halves damage from a super-effective Fire attack.' },
  { id: 'passho_berry', name: 'Passho Berry', description: 'Halves damage from a super-effective Water attack.' },
  { id: 'wacan_berry', name: 'Wacan Berry', description: 'Halves damage from a super-effective Electric attack.' },
  { id: 'rindo_berry', name: 'Rindo Berry', description: 'Halves damage from a super-effective Grass attack.' },
  { id: 'yache_berry', name: 'Yache Berry', description: 'Halves damage from a super-effective Ice attack.' },
  { id: 'chople_berry', name: 'Chople Berry', description: 'Halves damage from a super-effective Fighting attack.' },
  { id: 'kebia_berry', name: 'Kebia Berry', description: 'Halves damage from a super-effective Poison attack.' },
  { id: 'shuca_berry', name: 'Shuca Berry', description: 'Halves damage from a super-effective Ground attack.' },
  { id: 'coba_berry', name: 'Coba Berry', description: 'Halves damage from a super-effective Flying attack.' },
  { id: 'payapa_berry', name: 'Payapa Berry', description: 'Halves damage from a super-effective Psychic attack.' },
  { id: 'tanga_berry', name: 'Tanga Berry', description: 'Halves damage from a super-effective Bug attack.' },
  { id: 'charti_berry', name: 'Charti Berry', description: 'Halves damage from a super-effective Rock attack.' },
  { id: 'kasib_berry', name: 'Kasib Berry', description: 'Halves damage from a super-effective Ghost attack.' },
  { id: 'haban_berry', name: 'Haban Berry', description: 'Halves damage from a super-effective Dragon attack.' },
  { id: 'colbur_berry', name: 'Colbur Berry', description: 'Halves damage from a super-effective Dark attack.' },
  { id: 'babiri_berry', name: 'Babiri Berry', description: 'Halves damage from a super-effective Steel attack.' },
  { id: 'roseli_berry', name: 'Roseli Berry', description: 'Halves damage from a super-effective Fairy attack.' }
];
