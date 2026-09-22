import type { PokemonSpecies } from '../types/pokemon';

export const POKEMON_ROSTER: PokemonSpecies[] = [
  // 1. Rillaboom
  {
    id: 'rillaboom',
    name: 'Rillaboom',
    types: ['Grass'],
    baseStats: { hp: 100, attack: 125, defense: 90, spAtk: 60, spDef: 70, speed: 85 },
    abilities: ['Grassy Surge', 'Overgrow'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/812.png',
    learnset: ['grassy_glide', 'wood_hammer', 'drum_beating', 'fake_out', 'u_turn', 'protect', 'high_horsepower']
  },
  // 2. Sneasler
  {
    id: 'sneasler',
    name: 'Sneasler',
    types: ['Fighting', 'Poison'],
    baseStats: { hp: 80, attack: 130, defense: 60, spAtk: 40, spDef: 80, speed: 120 },
    abilities: ['Unburden', 'Pressure', 'Poison Touch'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/903.png',
    learnset: ['dire_claw', 'close_combat', 'rock_slide', 'protect', 'fake_out', 'feint', 'coaching']
  },
  // 3. Kingambit
  {
    id: 'kingambit',
    name: 'Kingambit',
    types: ['Dark', 'Steel'],
    baseStats: { hp: 100, attack: 135, defense: 120, spAtk: 60, spDef: 85, speed: 50 },
    abilities: ['Defiant', 'Supreme Overlord', 'Pressure'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/983.png',
    learnset: ['sucker_punch', 'kowtow_cleave', 'iron_head', 'swords_dance', 'low_kick', 'protect']
  },
  // 4. Basculegion (Male)
  {
    id: 'basculegion',
    name: 'Basculegion (Male)',
    types: ['Water', 'Ghost'],
    baseStats: { hp: 120, attack: 112, defense: 65, spAtk: 80, spDef: 75, speed: 78 },
    abilities: ['Swift Swim', 'Adaptability'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/902.png',
    learnset: ['last_respects', 'wave_crash', 'aqua_jet', 'head_smash', 'flip_turn', 'protect']
  },
  // 5. Garchomp / Mega Garchomp
  {
    id: 'garchomp',
    name: 'Garchomp',
    types: ['Dragon', 'Ground'],
    baseStats: { hp: 108, attack: 130, defense: 95, spAtk: 80, spDef: 85, speed: 102 },
    abilities: ['Rough Skin', 'Sand Veil'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/445.png',
    learnset: ['earthquake', 'dragon_claw', 'rock_slide', 'swords_dance', 'stealth_rock', 'protect', 'stomping_tantrum'],
    megaForm: {
      megaName: 'Mega Garchomp',
      megaStoneId: 'garchompite_z',
      megaBaseStats: { hp: 108, attack: 170, defense: 115, spAtk: 120, spDef: 95, speed: 92 },
      megaAbility: 'Sand Force',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10058.png'
    }
  },
  // 6. Incineroar
  {
    id: 'incineroar',
    name: 'Incineroar',
    types: ['Fire', 'Dark'],
    baseStats: { hp: 95, attack: 115, defense: 90, spAtk: 80, spDef: 90, speed: 60 },
    abilities: ['Intimidate', 'Blaze'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/727.png',
    learnset: ['fake_out', 'throat_chop', 'darkest_lariat', 'flare_blitz', 'parting_shot', 'protect']
  },
  // 7. Salamence / Mega Salamence
  {
    id: 'salamence',
    name: 'Salamence',
    types: ['Dragon', 'Flying'],
    baseStats: { hp: 95, attack: 135, defense: 80, spAtk: 110, spDef: 80, speed: 100 },
    abilities: ['Intimidate', 'Moxie'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/373.png',
    learnset: ['double_edge', 'hyper_voice', 'draco_meteor', 'tailwind', 'roost', 'flamethrower', 'earthquake', 'protect'],
    megaForm: {
      megaName: 'Mega Salamence',
      megaStoneId: 'salamencite',
      megaBaseStats: { hp: 95, attack: 145, defense: 130, spAtk: 120, spDef: 90, speed: 120 },
      megaAbility: 'Aerilate',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10089.png'
    }
  },
  // 8. Archaludon
  {
    id: 'archaludon',
    name: 'Archaludon',
    types: ['Steel', 'Dragon'],
    baseStats: { hp: 90, attack: 105, defense: 130, spAtk: 125, spDef: 65, speed: 85 },
    abilities: ['Stamina', 'Sturdy', 'Heavy Metal'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1018.png',
    learnset: ['electro_shot', 'flash_cannon', 'draco_meteor', 'body_press', 'snarl', 'dragon_pulse', 'protect']
  },
  // 9. Floette (Eternal Flower) / Mega Floette
  {
    id: 'floette_eternal',
    name: 'Floette (Eternal Flower)',
    types: ['Fairy'],
    baseStats: { hp: 74, attack: 65, defense: 67, spAtk: 125, spDef: 128, speed: 92 },
    abilities: ['Flower Veil'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10061.png',
    learnset: ['light_of_ruin', 'moonblast', 'dazzling_gleam', 'calm_mind', 'protect'],
    megaForm: {
      megaName: 'Mega Floette',
      megaStoneId: 'floettite',
      megaBaseStats: { hp: 74, attack: 75, defense: 87, spAtk: 145, spDef: 148, speed: 122 },
      megaAbility: 'Flower Veil',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10061.png'
    }
  },
  // 10. Farigiraf
  {
    id: 'farigiraf',
    name: 'Farigiraf',
    types: ['Normal', 'Psychic'],
    baseStats: { hp: 120, attack: 90, defense: 70, spAtk: 110, spDef: 70, speed: 60 },
    abilities: ['Armor Tail', 'Cud Chew', 'Sap Sipper'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/981.png',
    learnset: ['hyper_voice', 'twin_beam', 'psychic_move', 'trick_room', 'helping_hand', 'imprison', 'protect']
  },
  // 11. Whimsicott
  {
    id: 'whimsicott',
    name: 'Whimsicott',
    types: ['Grass', 'Fairy'],
    baseStats: { hp: 60, attack: 67, defense: 85, spAtk: 77, spDef: 75, speed: 116 },
    abilities: ['Prankster', 'Infiltrator', 'Chlorophyll'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/547.png',
    learnset: ['tailwind', 'moonblast', 'encore', 'taunt', 'sunny_day', 'helping_hand', 'protect']
  },
  // 12. Gholdengo
  {
    id: 'gholdengo',
    name: 'Gholdengo',
    types: ['Steel', 'Ghost'],
    baseStats: { hp: 87, attack: 60, defense: 95, spAtk: 133, spDef: 91, speed: 84 },
    abilities: ['Good as Gold'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1000.png',
    learnset: ['make_it_rain', 'shadow_ball', 'nasty_plot', 'thunderbolt', 'focus_blast', 'recover', 'protect']
  },
  // 13. Pelipper
  {
    id: 'pelipper',
    name: 'Pelipper',
    types: ['Water', 'Flying'],
    baseStats: { hp: 60, attack: 50, defense: 100, spAtk: 95, spDef: 70, speed: 65 },
    abilities: ['Drizzle', 'Keen Eye', 'Rain Dish'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/279.png',
    learnset: ['hurricane', 'weather_ball', 'tailwind', 'protect', 'wide_guard']
  },
  // 14. Tyranitar
  {
    id: 'tyranitar',
    name: 'Tyranitar',
    types: ['Rock', 'Dark'],
    baseStats: { hp: 100, attack: 134, defense: 110, spAtk: 95, spDef: 100, speed: 61 },
    abilities: ['Sand Stream', 'Unnerve'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/248.png',
    learnset: ['rock_slide', 'dragon_dance', 'low_kick', 'ice_punch', 'knock_off', 'protect']
  },
  // 15. Charizard / Mega Charizard X & Y
  {
    id: 'charizard',
    name: 'Charizard',
    types: ['Fire', 'Flying'],
    baseStats: { hp: 78, attack: 84, defense: 78, spAtk: 109, spDef: 85, speed: 100 },
    abilities: ['Blaze', 'Solar Power'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    learnset: ['heat_wave', 'solar_beam', 'weather_ball', 'protect', 'dragon_claw', 'dragon_dance', 'flare_blitz'],
    megaForm: [
      {
        megaName: 'Mega Charizard X',
        megaStoneId: 'charizardite_x',
        megaTypes: ['Fire', 'Dragon'],
        megaBaseStats: { hp: 78, attack: 130, defense: 111, spAtk: 130, spDef: 85, speed: 100 },
        megaAbility: 'Tough Claws',
        megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10034.png'
      },
      {
        megaName: 'Mega Charizard Y',
        megaStoneId: 'charizardite_y',
        megaTypes: ['Fire', 'Flying'],
        megaBaseStats: { hp: 78, attack: 104, defense: 78, spAtk: 159, spDef: 115, speed: 100 },
        megaAbility: 'Drought',
        megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10035.png'
      }
    ]
  },
  // 16. Sinistcha
  {
    id: 'sinistcha',
    name: 'Sinistcha',
    types: ['Grass', 'Ghost'],
    baseStats: { hp: 71, attack: 60, defense: 106, spAtk: 121, spDef: 80, speed: 70 },
    abilities: ['Hospitality', 'Heatproof'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1013.png',
    learnset: ['matcha_gotcha', 'shadow_ball', 'rage_powder', 'life_dew', 'strength_sap', 'trick_room', 'protect', 'imprison']
  },
  // 17. Hisuian Arcanine
  {
    id: 'arcanine_hisui',
    name: 'Arcanine (Hisui)',
    types: ['Fire', 'Rock'],
    baseStats: { hp: 95, attack: 115, defense: 80, spAtk: 95, spDef: 80, speed: 90 },
    abilities: ['Rock Head', 'Intimidate', 'Flash Fire'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10229.png',
    learnset: ['flare_blitz', 'head_smash', 'extreme_speed', 'will_o_wisp', 'wild_charge', 'protect']
  },
  // 18. Baxcalibur / Mega Baxcalibur
  {
    id: 'baxcalibur',
    name: 'Baxcalibur',
    types: ['Dragon', 'Ice'],
    baseStats: { hp: 115, attack: 145, defense: 92, spAtk: 75, spDef: 86, speed: 87 },
    abilities: ['Thermal Exchange', 'Ice Body'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/998.png',
    learnset: ['glaive_rush', 'ice_shard', 'dragon_dance', 'high_horsepower', 'iron_head', 'scale_shot', 'protect'],
    megaForm: {
      megaName: 'Mega Baxcalibur',
      megaStoneId: 'baxcalibrite',
      megaBaseStats: { hp: 115, attack: 175, defense: 112, spAtk: 85, spDef: 106, speed: 107 },
      megaAbility: 'Thermal Exchange',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/998.png'
    }
  },
  // 19. Indeedee (Female)
  {
    id: 'indeedee_f',
    name: 'Indeedee (Female)',
    types: ['Psychic', 'Normal'],
    baseStats: { hp: 70, attack: 55, defense: 65, spAtk: 95, spDef: 105, speed: 85 },
    abilities: ['Psychic Surge', 'Own Tempo', 'Synchronize'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10186.png',
    learnset: ['follow_me', 'helping_hand', 'trick_room', 'imprison', 'psychic_move', 'protect']
  },
  // 20. Golisopod / Mega Golisopod
  {
    id: 'golisopod',
    name: 'Golisopod',
    types: ['Bug', 'Water'],
    baseStats: { hp: 75, attack: 125, defense: 140, spAtk: 60, spDef: 90, speed: 40 },
    abilities: ['Emergency Exit'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/768.png',
    learnset: ['first_impression', 'liquidation', 'sucker_punch', 'iron_head', 'leech_life', 'protect'],
    megaForm: {
      megaName: 'Mega Golisopod',
      megaStoneId: 'golisopodite',
      megaBaseStats: { hp: 75, attack: 155, defense: 170, spAtk: 60, spDef: 105, speed: 65 },
      megaAbility: 'Tough Claws',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/768.png'
    }
  },
  // 21. Sylveon
  {
    id: 'sylveon',
    name: 'Sylveon',
    types: ['Fairy'],
    baseStats: { hp: 95, attack: 65, defense: 65, spAtk: 110, spDef: 130, speed: 60 },
    abilities: ['Pixilate', 'Cute Charm'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/700.png',
    learnset: ['hyper_voice', 'quick_attack', 'hyper_beam', 'protect']
  },
  // 22. Milotic
  {
    id: 'milotic',
    name: 'Milotic',
    types: ['Water'],
    baseStats: { hp: 95, attack: 60, defense: 79, spAtk: 100, spDef: 125, speed: 81 },
    abilities: ['Competitive', 'Marvel Scale'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/350.png',
    learnset: ['scald', 'muddy_water', 'ice_beam', 'icy_wind', 'recover', 'coil', 'hypnosis', 'haze', 'protect']
  },
  // 23. Raichu / Mega Raichu Y
  {
    id: 'raichu',
    name: 'Raichu',
    types: ['Electric'],
    baseStats: { hp: 60, attack: 90, defense: 55, spAtk: 90, spDef: 80, speed: 110 },
    abilities: ['Lightning Rod', 'Static'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/26.png',
    learnset: ['fake_out', 'volt_switch', 'zap_cannon', 'focus_blast', 'endeavor', 'encore', 'protect'],
    megaForm: {
      megaName: 'Mega Raichu Y',
      megaStoneId: 'raichunite_y',
      megaBaseStats: { hp: 60, attack: 90, defense: 65, spAtk: 140, spDef: 90, speed: 140 },
      megaAbility: 'No Guard',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10100.png'
    }
  },
  // 24. Dragonite / Mega Dragonite
  {
    id: 'dragonite',
    name: 'Dragonite',
    types: ['Dragon', 'Flying'],
    baseStats: { hp: 91, attack: 134, defense: 95, spAtk: 100, spDef: 100, speed: 80 },
    abilities: ['Multiscale', 'Inner Focus'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png',
    learnset: ['extreme_speed', 'dragon_claw', 'earthquake', 'dragon_dance', 'roost', 'hyper_voice', 'double_edge', 'flamethrower', 'tailwind', 'draco_meteor', 'protect'],
    megaForm: {
      megaName: 'Mega Dragonite',
      megaStoneId: 'dragoninite',
      megaBaseStats: { hp: 91, attack: 164, defense: 115, spAtk: 130, spDef: 120, speed: 80 },
      megaAbility: 'Multiscale',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png'
    }
  },
  // 25. Grimmsnarl
  {
    id: 'grimmsnarl',
    name: 'Grimmsnarl',
    types: ['Dark', 'Fairy'],
    baseStats: { hp: 95, attack: 120, defense: 65, spAtk: 95, spDef: 75, speed: 60 },
    abilities: ['Prankster', 'Frisk'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/861.png',
    learnset: ['reflect', 'light_screen', 'spirit_break', 'foul_play', 'thunder_wave', 'parting_shot']
  },
  // 26. Primarina
  {
    id: 'primarina',
    name: 'Primarina',
    types: ['Water', 'Fairy'],
    baseStats: { hp: 80, attack: 74, defense: 74, spAtk: 126, spDef: 116, speed: 60 },
    abilities: ['Liquid Voice', 'Torrent'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/730.png',
    learnset: ['hyper_voice', 'moonblast', 'sparkling_aria', 'dazzling_gleam', 'protect']
  },
  // 27. Metagross / Mega Metagross
  {
    id: 'metagross',
    name: 'Metagross',
    types: ['Steel', 'Psychic'],
    baseStats: { hp: 80, attack: 135, defense: 130, spAtk: 95, spDef: 90, speed: 70 },
    abilities: ['Clear Body'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/376.png',
    learnset: ['iron_head', 'meteor_mash', 'zen_headbutt', 'bullet_punch', 'ice_punch', 'protect'],
    megaForm: {
      megaName: 'Mega Metagross',
      megaStoneId: 'metagrossite',
      megaBaseStats: { hp: 80, attack: 145, defense: 150, spAtk: 105, spDef: 110, speed: 110 },
      megaAbility: 'Tough Claws',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10076.png'
    }
  },
  // 28. Meowscarada
  {
    id: 'meowscarada',
    name: 'Meowscarada',
    types: ['Grass', 'Dark'],
    baseStats: { hp: 76, attack: 110, defense: 70, spAtk: 81, spDef: 70, speed: 123 },
    abilities: ['Protean', 'Overgrow'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/908.png',
    learnset: ['flower_trick', 'knock_off', 'u_turn', 'sucker_punch', 'triple_axel', 'protect']
  },
  // 29. Gardevoir / Mega Gardevoir
  {
    id: 'gardevoir',
    name: 'Gardevoir',
    types: ['Psychic', 'Fairy'],
    baseStats: { hp: 68, attack: 65, defense: 65, spAtk: 125, spDef: 115, speed: 80 },
    abilities: ['Trace', 'Synchronize'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/282.png',
    learnset: ['hyper_voice', 'moonblast', 'dazzling_gleam', 'expanding_force', 'trick_room', 'imprison', 'calm_mind', 'protect'],
    megaForm: {
      megaName: 'Mega Gardevoir',
      megaStoneId: 'gardevoirite',
      megaBaseStats: { hp: 68, attack: 85, defense: 65, spAtk: 165, spDef: 135, speed: 100 },
      megaAbility: 'Pixilate',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10051.png'
    }
  },
  // 30. Hippowdon
  {
    id: 'hippowdon',
    name: 'Hippowdon',
    types: ['Ground'],
    baseStats: { hp: 108, attack: 112, defense: 118, spAtk: 68, spDef: 72, speed: 47 },
    abilities: ['Sand Stream', 'Sand Force'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/450.png',
    learnset: ['earthquake', 'slack_off', 'stealth_rock', 'yawn', 'whirlwind', 'protect']
  },
  // 31. Greninja / Mega Greninja
  {
    id: 'greninja',
    name: 'Greninja',
    types: ['Water', 'Dark'],
    baseStats: { hp: 72, attack: 95, defense: 67, spAtk: 103, spDef: 71, speed: 122 },
    abilities: ['Protean', 'Torrent'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/658.png',
    learnset: ['hydro_pump', 'scald', 'dark_pulse', 'ice_beam', 'water_shuriken', 'u_turn', 'protect'],
    megaForm: {
      megaName: 'Mega Greninja',
      megaStoneId: 'greninjite',
      megaBaseStats: { hp: 72, attack: 125, defense: 77, spAtk: 133, spDef: 81, speed: 142 },
      megaAbility: 'Protean',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10116.png'
    }
  },
  // 32. Alolan Ninetales
  {
    id: 'ninetales_alola',
    name: 'Ninetales (Alola)',
    types: ['Ice', 'Fairy'],
    baseStats: { hp: 73, attack: 67, defense: 75, spAtk: 81, spDef: 100, speed: 109 },
    abilities: ['Snow Warning', 'Snow Cloak'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10103.png',
    learnset: ['aurora_veil', 'blizzard', 'freeze_dry', 'moonblast', 'encore', 'protect']
  },
  // 33. Gengar / Mega Gengar
  {
    id: 'gengar',
    name: 'Gengar',
    types: ['Ghost', 'Poison'],
    baseStats: { hp: 60, attack: 65, defense: 60, spAtk: 130, spDef: 75, speed: 110 },
    abilities: ['Cursed Body'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png',
    learnset: ['shadow_ball', 'sludge_bomb', 'perish_song', 'icy_wind', 'taunt', 'destiny_bond', 'protect'],
    megaForm: {
      megaName: 'Mega Gengar',
      megaStoneId: 'gengarite',
      megaBaseStats: { hp: 60, attack: 65, defense: 80, spAtk: 170, spDef: 95, speed: 130 },
      megaAbility: 'Shadow Tag',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10038.png'
    }
  },
  // 34. Froslass / Mega Froslass
  {
    id: 'froslass',
    name: 'Froslass',
    types: ['Ice', 'Ghost'],
    baseStats: { hp: 70, attack: 80, defense: 70, spAtk: 80, spDef: 70, speed: 110 },
    abilities: ['Snow Cloak', 'Cursed Body'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/478.png',
    learnset: ['blizzard', 'shadow_ball', 'aurora_veil', 'taunt', 'protect'],
    megaForm: {
      megaName: 'Mega Froslass',
      megaStoneId: 'froslassite',
      megaBaseStats: { hp: 70, attack: 90, defense: 80, spAtk: 110, spDef: 90, speed: 140 },
      megaAbility: 'Snow Warning',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/478.png'
    }
  },
  // 35. Scizor / Mega Scizor
  {
    id: 'scizor',
    name: 'Scizor',
    types: ['Bug', 'Steel'],
    baseStats: { hp: 70, attack: 130, defense: 100, spAtk: 55, spDef: 80, speed: 65 },
    abilities: ['Technician', 'Swarm'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/212.png',
    learnset: ['bullet_punch', 'bug_bite', 'u_turn', 'swords_dance', 'dual_wingbeat', 'protect'],
    megaForm: {
      megaName: 'Mega Scizor',
      megaStoneId: 'scizorite',
      megaBaseStats: { hp: 70, attack: 150, defense: 140, spAtk: 65, spDef: 100, speed: 75 },
      megaAbility: 'Technician',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10046.png'
    }
  },
  // 36. Corviknight
  {
    id: 'corviknight',
    name: 'Corviknight',
    types: ['Flying', 'Steel'],
    baseStats: { hp: 98, attack: 87, defense: 105, spAtk: 53, spDef: 85, speed: 67 },
    abilities: ['Mirror Armor', 'Pressure', 'Unnerve'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/823.png',
    learnset: ['brave_bird', 'body_press', 'iron_defense', 'roost', 'tailwind', 'u_turn', 'protect']
  },
  // 37. Staraptor / Mega Staraptor
  {
    id: 'staraptor',
    name: 'Staraptor',
    types: ['Normal', 'Flying'],
    baseStats: { hp: 85, attack: 120, defense: 70, spAtk: 50, spDef: 60, speed: 100 },
    abilities: ['Intimidate', 'Reckless'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/398.png',
    learnset: ['brave_bird', 'close_combat', 'u_turn', 'final_gambit', 'protect'],
    megaForm: {
      megaName: 'Mega Staraptor',
      megaStoneId: 'staraptorite',
      megaBaseStats: { hp: 85, attack: 150, defense: 90, spAtk: 60, spDef: 80, speed: 120 },
      megaAbility: 'Intimidate',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/398.png'
    }
  },
  // 38. Venusaur / Mega Venusaur
  {
    id: 'venusaur',
    name: 'Venusaur',
    types: ['Grass', 'Poison'],
    baseStats: { hp: 80, attack: 82, defense: 83, spAtk: 100, spDef: 100, speed: 80 },
    abilities: ['Chlorophyll', 'Overgrow'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/3.png',
    learnset: ['sludge_bomb', 'giga_drain', 'earth_power', 'sleep_powder', 'protect'],
    megaForm: {
      megaName: 'Mega Venusaur',
      megaStoneId: 'venusaurite',
      megaBaseStats: { hp: 80, attack: 100, defense: 123, spAtk: 122, spDef: 120, speed: 80 },
      megaAbility: 'Thick Fat',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10033.png'
    }
  },
  // 39. Gyarados / Mega Gyarados
  {
    id: 'gyarados',
    name: 'Gyarados',
    types: ['Water', 'Flying'],
    baseStats: { hp: 95, attack: 125, defense: 79, spAtk: 60, spDef: 100, speed: 81 },
    abilities: ['Intimidate', 'Moxie'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/130.png',
    learnset: ['waterfall', 'crunch', 'dragon_dance', 'earthquake', 'ice_fang', 'protect'],
    megaForm: {
      megaName: 'Mega Gyarados',
      megaStoneId: 'gyaradosite',
      megaTypes: ['Water', 'Dark'],
      megaBaseStats: { hp: 95, attack: 155, defense: 109, spAtk: 70, spDef: 130, speed: 81 },
      megaAbility: 'Mold Breaker',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10041.png'
    }
  },
  // 40. Lucario / Mega Lucario Z
  {
    id: 'lucario',
    name: 'Lucario',
    types: ['Fighting', 'Steel'],
    baseStats: { hp: 70, attack: 110, defense: 70, spAtk: 115, spDef: 70, speed: 90 },
    abilities: ['Inner Focus', 'Justified'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/448.png',
    learnset: ['close_combat', 'meteor_mash', 'extreme_speed', 'swords_dance', 'bullet_punch', 'aura_sphere', 'vacuum_wave', 'flash_cannon', 'nasty_plot', 'protect'],
    megaForm: {
      megaName: 'Mega Lucario Z',
      megaStoneId: 'lucarionite_z',
      megaBaseStats: { hp: 70, attack: 145, defense: 88, spAtk: 145, spDef: 70, speed: 112 },
      megaAbility: 'Adaptability',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10059.png'
    }
  },
  // 41. Hydreigon
  {
    id: 'hydreigon',
    name: 'Hydreigon',
    types: ['Dark', 'Dragon'],
    baseStats: { hp: 92, attack: 105, defense: 90, spAtk: 125, spDef: 90, speed: 98 },
    abilities: ['Levitate'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/635.png',
    learnset: ['dark_pulse', 'draco_meteor', 'flamethrower', 'earth_power', 'tailwind', 'nasty_plot', 'protect']
  },
  // 42. Delphox / Mega Delphox
  {
    id: 'delphox',
    name: 'Delphox',
    types: ['Fire', 'Psychic'],
    baseStats: { hp: 75, attack: 69, defense: 72, spAtk: 114, spDef: 100, speed: 104 },
    abilities: ['Blaze', 'Magician'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/655.png',
    learnset: ['heat_wave', 'psychic_move', 'nasty_plot', 'will_o_wisp', 'focus_blast', 'protect'],
    megaForm: {
      megaName: 'Mega Delphox',
      megaStoneId: 'delphoxite',
      megaBaseStats: { hp: 75, attack: 79, defense: 92, spAtk: 144, spDef: 115, speed: 129 },
      megaAbility: 'Levitate',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/655.png'
    }
  },
  // 43. Swampert / Mega Swampert
  {
    id: 'swampert',
    name: 'Swampert',
    types: ['Water', 'Ground'],
    baseStats: { hp: 100, attack: 110, defense: 90, spAtk: 85, spDef: 90, speed: 60 },
    abilities: ['Torrent', 'Damp'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/260.png',
    learnset: ['waterfall', 'earthquake', 'ice_punch', 'flip_turn', 'yawn', 'protect'],
    megaForm: {
      megaName: 'Mega Swampert',
      megaStoneId: 'swampertite',
      megaBaseStats: { hp: 100, attack: 150, defense: 110, spAtk: 95, spDef: 110, speed: 70 },
      megaAbility: 'Swift Swim',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10064.png'
    }
  },
  // 44. Mimikyu
  {
    id: 'mimikyu',
    name: 'Mimikyu',
    types: ['Ghost', 'Fairy'],
    baseStats: { hp: 55, attack: 90, defense: 80, spAtk: 50, spDef: 105, speed: 96 },
    abilities: ['Disguise'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/778.png',
    learnset: ['play_rough', 'shadow_sneak', 'shadow_claw', 'swords_dance', 'trick_room', 'taunt', 'protect']
  },
  // 46. Aerodactyl / Mega Aerodactyl
  {
    id: 'aerodactyl',
    name: 'Aerodactyl',
    types: ['Rock', 'Flying'],
    baseStats: { hp: 80, attack: 105, defense: 65, spAtk: 60, spDef: 75, speed: 130 },
    abilities: ['Unnerve', 'Pressure'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/142.png',
    learnset: ['rock_slide', 'dual_wingbeat', 'tailwind', 'earthquake', 'ice_fang', 'taunt', 'rain_dance', 'protect'],
    megaForm: {
      megaName: 'Mega Aerodactyl',
      megaStoneId: 'aerodactylite',
      megaBaseStats: { hp: 80, attack: 135, defense: 85, spAtk: 70, spDef: 95, speed: 150 },
      megaAbility: 'Tough Claws',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10042.png'
    }
  },
  // 47. Torkoal
  {
    id: 'torkoal',
    name: 'Torkoal',
    types: ['Fire'],
    baseStats: { hp: 70, attack: 85, defense: 140, spAtk: 85, spDef: 70, speed: 20 },
    abilities: ['Drought', 'White Smoke'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/324.png',
    learnset: ['eruption', 'heat_wave', 'overheat', 'earth_power', 'body_press', 'protect']
  },
  // 48. Annihilape
  {
    id: 'annihilape',
    name: 'Annihilape',
    types: ['Fighting', 'Ghost'],
    baseStats: { hp: 110, attack: 115, defense: 80, spAtk: 50, spDef: 90, speed: 90 },
    abilities: ['Defiant'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/979.png',
    learnset: ['rage_fist', 'drain_punch', 'close_combat', 'final_gambit', 'bulk_up', 'protect']
  },
  // 49. Rotom-Wash
  {
    id: 'rotom_wash',
    name: 'Rotom (Wash)',
    types: ['Electric', 'Water'],
    baseStats: { hp: 50, attack: 65, defense: 107, spAtk: 105, spDef: 107, speed: 86 },
    abilities: ['Levitate'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10008.png',
    learnset: ['hydro_pump', 'volt_switch', 'will_o_wisp', 'thunderbolt', 'protect']
  },
  // 50. Scrafty / Mega Scrafty
  {
    id: 'scrafty',
    name: 'Scrafty',
    types: ['Dark', 'Fighting'],
    baseStats: { hp: 65, attack: 90, defense: 115, spAtk: 45, spDef: 115, speed: 58 },
    abilities: ['Intimidate'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/560.png',
    learnset: ['fake_out', 'drain_punch', 'knock_off', 'close_combat', 'taunt', 'protect'],
    megaForm: {
      megaName: 'Mega Scrafty',
      megaStoneId: 'scraftinite',
      megaBaseStats: { hp: 65, attack: 120, defense: 135, spAtk: 45, spDef: 135, speed: 88 },
      megaAbility: 'Intimidate',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/560.png'
    }
  },
  // 54. Snorlax
  {
    id: 'snorlax',
    name: 'Snorlax',
    types: ['Normal'],
    baseStats: { hp: 160, attack: 110, defense: 65, spAtk: 65, spDef: 110, speed: 30 },
    abilities: ['Thick Fat'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/143.png',
    learnset: ['body_slam', 'double_edge', 'high_horsepower', 'belly_drum', 'curse', 'protect', 'fissure', 'stockpile']
  },
  // 55. Blastoise / Mega Blastoise
  {
    id: 'blastoise',
    name: 'Blastoise',
    types: ['Water'],
    baseStats: { hp: 79, attack: 83, defense: 100, spAtk: 85, spDef: 105, speed: 78 },
    abilities: ['Torrent', 'Rain Dish'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png',
    learnset: ['water_pulse', 'dark_pulse', 'aura_sphere', 'ice_beam', 'shell_smash', 'protect'],
    megaForm: {
      megaName: 'Mega Blastoise',
      megaStoneId: 'blastoisinite',
      megaBaseStats: { hp: 79, attack: 103, defense: 120, spAtk: 135, spDef: 115, speed: 78 },
      megaAbility: 'Mega Launcher',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10036.png'
    }
  },
  // 56. Scovillain / Mega Scovillain
  {
    id: 'scovillain',
    name: 'Scovillain',
    types: ['Grass', 'Fire'],
    baseStats: { hp: 75, attack: 108, defense: 65, spAtk: 108, spDef: 65, speed: 75 },
    abilities: ['Chlorophyll'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/952.png',
    learnset: ['overheat', 'giga_drain', 'rage_powder', 'leech_seed', 'protect'],
    megaForm: {
      megaName: 'Mega Scovillain',
      megaStoneId: 'scovillainite',
      megaBaseStats: { hp: 75, attack: 128, defense: 85, spAtk: 128, spDef: 85, speed: 85 },
      megaAbility: 'Spicy Spray',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/952.png'
    }
  },
  // 63. Meowstic / Mega Meowstic
  {
    id: 'meowstic',
    name: 'Meowstic',
    types: ['Psychic'],
    baseStats: { hp: 74, attack: 48, defense: 76, spAtk: 83, spDef: 81, speed: 104 },
    abilities: ['Prankster', 'Infiltrator'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/678.png',
    learnset: ['expanding_force', 'psychic_move', 'shadow_ball', 'nasty_plot', 'skill_swap', 'fake_out', 'protect'],
    megaForm: {
      megaName: 'Mega Meowstic',
      megaStoneId: 'meowsticite',
      megaBaseStats: { hp: 74, attack: 48, defense: 96, spAtk: 123, spDef: 101, speed: 124 },
      megaAbility: 'Trace',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/678.png'
    }
  },
  // 68. Crabominable / Mega Crabominable
  {
    id: 'crabominable',
    name: 'Crabominable',
    types: ['Fighting', 'Ice'],
    baseStats: { hp: 97, attack: 132, defense: 77, spAtk: 62, spDef: 67, speed: 43 },
    abilities: ['Iron Fist'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/740.png',
    learnset: ['ice_hammer', 'ice_spinner', 'close_combat', 'mach_punch', 'drain_punch', 'thunder_punch', 'stomping_tantrum', 'crabhammer', 'protect'],
    megaForm: {
      megaName: 'Mega Crabominable',
      megaStoneId: 'crabominite',
      megaBaseStats: { hp: 97, attack: 162, defense: 97, spAtk: 62, spDef: 87, speed: 53 },
      megaAbility: 'Iron Fist',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/740.png'
    }
  },
  // 69. Drampa / Mega Drampa
  {
    id: 'drampa',
    name: 'Drampa',
    types: ['Normal', 'Dragon'],
    baseStats: { hp: 78, attack: 60, defense: 85, spAtk: 135, spDef: 91, speed: 36 },
    abilities: ['Berserk', 'Cloud Nine'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/780.png',
    learnset: ['hyper_voice', 'draco_meteor', 'dragon_pulse', 'earth_power', 'flamethrower', 'protect'],
    megaForm: {
      megaName: 'Mega Drampa',
      megaStoneId: 'drampanite',
      megaBaseStats: { hp: 78, attack: 60, defense: 105, spAtk: 165, spDef: 111, speed: 66 },
      megaAbility: 'Berserk',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/780.png'
    }
  },
  // 70. Slowbro / Mega Slowbro
  {
    id: 'slowbro',
    name: 'Slowbro',
    types: ['Water', 'Psychic'],
    baseStats: { hp: 95, attack: 75, defense: 110, spAtk: 100, spDef: 80, speed: 30 },
    abilities: ['Regenerator', 'Oblivious'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/80.png',
    learnset: ['hydro_pump', 'scald', 'ice_beam', 'surf', 'hypnosis', 'encore', 'protect'],
    megaForm: {
      megaName: 'Mega Slowbro',
      megaStoneId: 'slowbronite',
      megaBaseStats: { hp: 95, attack: 75, defense: 180, spAtk: 130, spDef: 80, speed: 30 },
      megaAbility: 'Shell Armor',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10071.png'
    }
  },
    {
    id: 'aegislash',
    name: 'Aegislash',
    types: ['Steel', 'Ghost'],
    baseStats: { hp: 60, attack: 50, defense: 140, spAtk: 50, spDef: 140, speed: 60 },
    abilities: ['Stance Change'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/681.png',
    learnset: ['kings_shield', 'shadow_ball', 'shadow_sneak', 'flash_cannon', 'sacred_sword', 'toxic', 'wide_guard', 'substitute', 'iron_head']
  },
    {
    id: 'glimmora',
    name: 'Glimmora',
    types: ['Rock', 'Poison'],
    baseStats: { hp: 83, attack: 55, defense: 90, spAtk: 130, spDef: 81, speed: 86 },
    abilities: ['Toxic Debris', 'Corrosion'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/969.png',
    learnset: ['sludge_wave', 'mortal_spin', 'power_gem', 'earth_power', 'stealth_rock', 'toxic_spikes', 'spiky_shield']
  },
    {
    id: 'kleavor',
    name: 'Kleavor',
    types: ['Bug', 'Rock'],
    baseStats: { hp: 70, attack: 135, defense: 95, spAtk: 45, spDef: 70, speed: 85 },
    abilities: ['Sharpness', 'Sheer Force'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/900.png',
    learnset: ['stone_axe', 'x_scissor', 'night_slash', 'close_combat', 'protect']
  },
    {
    id: 'lycanroc_dusk',
    name: 'Lycanroc (Dusk)',
    types: ['Rock'],
    baseStats: { hp: 75, attack: 117, defense: 65, spAtk: 55, spDef: 65, speed: 110 },
    abilities: ['Tough Claws', 'Sand Rush', 'Vital Spirit'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10126.png',
    learnset: ['accelerock', 'rock_slide', 'close_combat', 'protect']
  },
    {
    id: 'dragapult',
    name: 'Dragapult',
    types: ['Dragon', 'Ghost'],
    baseStats: { hp: 88, attack: 120, defense: 75, spAtk: 100, spDef: 75, speed: 142 },
    abilities: ['Infiltrator', 'Clear Body', 'Cursed Body'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/887.png',
    learnset: ['dragon_darts', 'phantom_force', 'shadow_ball', 'u_turn', 'protect']
  },
    {
    id: 'sableye',
    name: 'Sableye',
    types: ['Dark', 'Ghost'],
    baseStats: { hp: 50, attack: 75, defense: 75, spAtk: 65, spDef: 65, speed: 50 },
    abilities: ['Prankster', 'Keen Eye', 'Stall'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/302.png',
    learnset: ['quash', 'rain_dance', 'foul_play', 'recover', 'taunt', 'disable', 'protect']
  },
    {
    id: 'toxtricity',
    name: 'Toxtricity',
    types: ['Electric', 'Poison'],
    baseStats: { hp: 75, attack: 98, defense: 70, spAtk: 114, spDef: 70, speed: 75 },
    abilities: ['Punk Rock', 'Plus', 'Minus'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/849.png',
    learnset: ['overdrive', 'boomburst', 'sludge_bomb', 'volt_switch', 'protect']
  },
    {
    id: 'sirfetchd',
    name: 'Sirfetch\'d',
    types: ['Fighting'],
    baseStats: { hp: 62, attack: 135, defense: 95, spAtk: 68, spDef: 82, speed: 65 },
    abilities: ['Scrappy', 'Steadfast'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/865.png',
    learnset: ['close_combat', 'brave_bird', 'leaf_blade', 'knock_off', 'protect']
  },
    {
    id: 'indeedee_m',
    name: 'Indeedee (Male)',
    types: ['Psychic', 'Normal'],
    baseStats: { hp: 60, attack: 65, defense: 55, spAtk: 105, spDef: 95, speed: 95 },
    abilities: ['Psychic Surge', 'Inner Focus', 'Synchronize'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/876.png',
    learnset: ['expanding_force', 'shadow_ball', 'dazzling_gleam', 'trick', 'imprison', 'protect']
  },
    {
    id: 'armarouge',
    name: 'Armarouge',
    types: ['Fire', 'Psychic'],
    baseStats: { hp: 85, attack: 60, defense: 100, spAtk: 125, spDef: 80, speed: 75 },
    abilities: ['Flash Fire', 'Weak Armor'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/936.png',
    learnset: ['armor_cannon', 'expanding_force', 'trick_room', 'wide_guard', 'protect']
  },
  // 71. Psyduck
  {
    id: 'psyduck',
    name: 'Psyduck',
    types: ['Water'],
    baseStats: { hp: 50, attack: 52, defense: 48, spAtk: 65, spDef: 50, speed: 55 },
    abilities: ['Cloud Nine', 'Swift Swim', 'Damp'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/54.png',
    learnset: ['hydro_pump', 'scald', 'ice_beam', 'surf', 'hypnosis', 'encore', 'protect']
  },
  // 72. Pawmot
  {
    id: 'pawmot',
    name: 'Pawmot',
    types: ['Electric', 'Fighting'],
    baseStats: { hp: 70, attack: 115, defense: 70, spAtk: 70, spDef: 60, speed: 105 },
    abilities: ['Volt Absorb', 'Natural Cure', 'Iron Fist'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/923.png',
    learnset: ['revival_blessing', 'double_shock', 'close_combat', 'mach_punch', 'fake_out', 'protect']
  },
  // 73. Absol / Mega Absol Z
  {
    id: 'absol',
    name: 'Absol',
    types: ['Dark'],
    baseStats: { hp: 65, attack: 130, defense: 60, spAtk: 75, spDef: 60, speed: 75 },
    abilities: ['Pressure', 'Super Luck', 'Justified'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/359.png',
    learnset: ['sucker_punch', 'night_slash', 'knock_off', 'shadow_claw', 'sacred_sword', 'psycho_cut', 'play_rough', 'swords_dance', 'protect'],
    megaForm: {
      megaName: 'Mega Absol Z',
      megaStoneId: 'absolite_z',
      megaBaseStats: { hp: 65, attack: 150, defense: 60, spAtk: 115, spDef: 60, speed: 115 },
      megaAbility: 'Sharpness',
      megaSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10057.png'
    }
  },
  // 74. Politoed
  {
    id: 'politoed',
    name: 'Politoed',
    types: ['Water'],
    baseStats: { hp: 90, attack: 75, defense: 75, spAtk: 90, spDef: 100, speed: 70 },
    abilities: ['Drizzle', 'Water Absorb', 'Damp'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/186.png',
    learnset: ['muddy_water', 'weather_ball', 'icy_wind', 'ice_beam', 'helping_hand', 'perish_song', 'protect']
  },
  // 75. Excadrill
  {
    id: 'excadrill',
    name: 'Excadrill',
    types: ['Ground', 'Steel'],
    baseStats: { hp: 110, attack: 135, defense: 60, spAtk: 50, spDef: 65, speed: 88 },
    abilities: ['Sand Rush', 'Mold Breaker', 'Sand Force'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/530.png',
    learnset: ['earthquake', 'iron_head', 'rock_slide', 'swords_dance', 'high_horsepower', 'protect']
  },
  // 76. Volcarona
  {
    id: 'volcarona',
    name: 'Volcarona',
    types: ['Bug', 'Fire'],
    baseStats: { hp: 85, attack: 60, defense: 65, spAtk: 135, spDef: 105, speed: 100 },
    abilities: ['Flame Body', 'Swarm'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/637.png',
    learnset: ['heat_wave', 'quiver_dance', 'rage_powder', 'tailwind', 'protect']
  },
  // 77. Maushold
  {
    id: 'maushold',
    name: 'Maushold',
    types: ['Normal'],
    baseStats: { hp: 74, attack: 75, defense: 70, spAtk: 65, spDef: 75, speed: 111 },
    abilities: ['Technician', 'Friend Guard', 'Cheek Pouch'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/925.png',
    learnset: ['population_bomb', 'super_fang', 'follow_me', 'taunt', 'protect']
  },
  // 78. Ceruledge
  {
    id: 'ceruledge',
    name: 'Ceruledge',
    types: ['Fire', 'Ghost'],
    baseStats: { hp: 75, attack: 125, defense: 80, spAtk: 60, spDef: 100, speed: 85 },
    abilities: ['Flash Fire', 'Weak Armor'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/937.png',
    learnset: ['bitter_blade', 'poltergeist', 'shadow_sneak', 'swords_dance', 'bulk_up', 'protect']
  },
  // 79. Tsareena
  {
    id: 'tsareena',
    name: 'Tsareena',
    types: ['Grass'],
    baseStats: { hp: 72, attack: 120, defense: 98, spAtk: 50, spDef: 98, speed: 72 },
    abilities: ['Queenly Majesty', 'Leaf Guard', 'Sweet Veil'],
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/763.png',
    learnset: ['power_whip', 'trop_kick', 'high_jump_kick', 'triple_axel', 'protect']
  }
];
