import React, { useState, useMemo } from 'react';
import type { BattleFormat, CustomPokemon, Move, PokemonSpecies, ActivePokemonState, StatBlock } from '../types/pokemon';
import { POKEMON_ROSTER } from '../data/pokemonRoster';
import { MOVES_DATABASE } from '../data/moves';
import { HELD_ITEMS } from '../data/items';
import { NATURES } from '../data/natures';
import { calculateAllStats } from '../engine/statCalc';
import { calculateDamageSpread, type CalcFieldConditions, type DamageSpreadResult } from '../engine/damageCalc';
import {
  Calculator,
  Swords,
  Shield,
  ArrowLeft,
  Users,
  Search,
  Check,
  Plus,
  ArrowLeftRight,
  Zap
} from 'lucide-react';


interface BattleCalculatorProps {
  playerTeam?: CustomPokemon[];
  onBack: () => void;
}

const META_DEFENDER_IDS = [
  'incineroar',
  'kingambit',
  'archaludon',
  'rillaboom',
  'garchomp',
  'basculegion',
  'dragonite',
  'gholdengo',
  'sneasler',
  'volcarona',
  'tyranitar',
  'maushold'
];

type StatKey = keyof StatBlock;

const STAT_DISPLAY_NAMES: Record<StatKey, string> = {
  hp: 'HP',
  attack: 'Atk',
  defense: 'Def',
  spAtk: 'SpA',
  spDef: 'SpD',
  speed: 'Spe'
};

export const BattleCalculator: React.FC<BattleCalculatorProps> = ({ playerTeam = [], onBack }) => {
  const [calcMode, setCalcMode] = useState<'1v1' | 'MULTI'>('1v1');
  const [format, setFormat] = useState<BattleFormat>('Doubles');

  // Attacker state
  const [attackerSpeciesId, setAttackerSpeciesId] = useState<string>(
    playerTeam[0]?.speciesId || 'garchomp'
  );
  const [attackerItem, setAttackerItem] = useState<string>(
    playerTeam[0]?.item || 'none'
  );
  const [attackerNature, setAttackerNature] = useState<string>(
    playerTeam[0]?.nature || 'Adamant'
  );
  const [attackerAbility, setAttackerAbility] = useState<string>('Rough Skin');
  const [attackerAtkStage, setAttackerAtkStage] = useState<number>(0);
  const [attackerSpAtkStage, setAttackerSpAtkStage] = useState<number>(0);
  const [attackerStatus, setAttackerStatus] = useState<string>('None');
  const [attackerEvs, setAttackerEvs] = useState<StatBlock>({
    hp: 4,
    attack: 252,
    defense: 0,
    spAtk: 0,
    spDef: 0,
    speed: 252
  });
  const [attackerIvs, setAttackerIvs] = useState<StatBlock>({
    hp: 31,
    attack: 31,
    defense: 31,
    spAtk: 31,
    spDef: 31,
    speed: 31
  });
  const [selectedMoveId, setSelectedMoveId] = useState<string>('earthquake');
  const [customMoveSearch, setCustomMoveSearch] = useState<string>('');
  const [showCustomMovePicker, setShowCustomMovePicker] = useState<boolean>(false);

  // Defender state (1v1)
  const [defenderSpeciesId, setDefenderSpeciesId] = useState<string>('incineroar');
  const [defenderItem, setDefenderItem] = useState<string>('none');
  const [defenderNature, setDefenderNature] = useState<string>('Careful');
  const [defenderAbility, setDefenderAbility] = useState<string>('Intimidate');
  const [defenderDefStage, setDefenderDefStage] = useState<number>(0);
  const [defenderSpDefStage, setDefenderSpDefStage] = useState<number>(0);
  const [defenderStatus, setDefenderStatus] = useState<string>('None');
  const [defenderEvs, setDefenderEvs] = useState<StatBlock>({
    hp: 252,
    attack: 0,
    defense: 148,
    spAtk: 0,
    spDef: 108,
    speed: 0
  });
  const [defenderIvs, setDefenderIvs] = useState<StatBlock>({
    hp: 31,
    attack: 31,
    defense: 31,
    spAtk: 31,
    spDef: 31,
    speed: 31
  });

  // Multi-defender selection state
  const [multiDefenderIds, setMultiDefenderIds] = useState<string[]>(META_DEFENDER_IDS);
  const [searchTargetQuery, setSearchTargetQuery] = useState<string>('');
  const [showTargetPicker, setShowTargetPicker] = useState<boolean>(false);

  // Field conditions
  const [field, setField] = useState<CalcFieldConditions>({
    weather: undefined,
    terrain: undefined,
    reflect: false,
    lightScreen: false,
    auroraVeil: false
  });

  // Resolve attacker species and active state
  const attackerSpecies = useMemo(() => {
    return POKEMON_ROSTER.find((s) => s.id === attackerSpeciesId) || POKEMON_ROSTER[0];
  }, [attackerSpeciesId]);

  const defenderSpecies = useMemo(() => {
    return POKEMON_ROSTER.find((s) => s.id === defenderSpeciesId) || POKEMON_ROSTER[1];
  }, [defenderSpeciesId]);

  // Total EVs tally
  const totalAttackerEvs = useMemo(() => {
    return Object.values(attackerEvs).reduce((a, b) => a + b, 0);
  }, [attackerEvs]);

  const totalDefenderEvs = useMemo(() => {
    return Object.values(defenderEvs).reduce((a, b) => a + b, 0);
  }, [defenderEvs]);

  // Construct active attacker
  const attackerActiveState = useMemo<ActivePokemonState>(() => {
    const dummy: CustomPokemon = {
      id: 'attacker_calc',
      speciesId: attackerSpecies.id,
      nickname: attackerSpecies.name,
      level: 50,
      item: attackerItem,
      ability: attackerAbility || attackerSpecies.abilities[0],
      nature: attackerNature,
      evs: attackerEvs,
      moves: attackerSpecies.learnset.slice(0, 4)
    };
    const maxStats = calculateAllStats(dummy, attackerSpecies, attackerIvs);
    return {
      instanceId: 'attacker_calc',
      species: attackerSpecies,
      nickname: attackerSpecies.name,
      level: 50,
      item: attackerItem,
      ability: attackerAbility || attackerSpecies.abilities[0],
      maxStats,
      currentHp: maxStats.hp,
      status: attackerStatus === 'Burn' ? 'Burn' : attackerStatus === 'Paralysis' ? 'Paralysis' : undefined,
      statStages: {
        attack: attackerAtkStage,
        defense: 0,
        spAtk: attackerSpAtkStage,
        spDef: 0,
        speed: 0,
        accuracy: 0,
        evasion: 0
      },
      moves: [],
      isFainted: false
    };
  }, [attackerSpecies, attackerItem, attackerNature, attackerAbility, attackerAtkStage, attackerSpAtkStage, attackerStatus, attackerEvs, attackerIvs]);

  // Construct active defender
  const defenderActiveState = useMemo<ActivePokemonState>(() => {
    const dummy: CustomPokemon = {
      id: `def_${defenderSpecies.id}`,
      speciesId: defenderSpecies.id,
      nickname: defenderSpecies.name,
      level: 50,
      item: defenderItem,
      ability: defenderAbility || defenderSpecies.abilities[0],
      nature: defenderNature,
      evs: defenderEvs,
      moves: defenderSpecies.learnset.slice(0, 4)
    };
    const maxStats = calculateAllStats(dummy, defenderSpecies, defenderIvs);
    return {
      instanceId: `def_${defenderSpecies.id}`,
      species: defenderSpecies,
      nickname: defenderSpecies.name,
      level: 50,
      item: defenderItem,
      ability: defenderAbility || defenderSpecies.abilities[0],
      maxStats,
      currentHp: maxStats.hp,
      status: defenderStatus === 'Burn' ? 'Burn' : defenderStatus === 'Paralysis' ? 'Paralysis' : undefined,
      statStages: {
        attack: 0,
        defense: defenderDefStage,
        spAtk: 0,
        spDef: defenderSpDefStage,
        speed: 0,
        accuracy: 0,
        evasion: 0
      },
      moves: [],
      isFainted: false
    };
  }, [defenderSpecies, defenderItem, defenderNature, defenderAbility, defenderDefStage, defenderSpDefStage, defenderStatus, defenderEvs, defenderIvs]);

  // Active Move
  const activeMove = useMemo<Move>(() => {
    return MOVES_DATABASE[selectedMoveId] || MOVES_DATABASE['earthquake'];
  }, [selectedMoveId]);

  // 1v1 Result
  const singleCalcResult = useMemo<DamageSpreadResult>(() => {
    return calculateDamageSpread(attackerActiveState, defenderActiveState, activeMove, format, field);
  }, [attackerActiveState, defenderActiveState, activeMove, format, field]);

  // Moveset results for 1v1
  const attackerMovesetResults = useMemo(() => {
    const movesToCalc = Array.from(new Set([...attackerSpecies.learnset, selectedMoveId]));
    return movesToCalc.map((mId) => {
      const mObj = MOVES_DATABASE[mId];
      if (!mObj) return null;
      const res = calculateDamageSpread(attackerActiveState, defenderActiveState, mObj, format, field);
      return { move: mObj, result: res };
    }).filter(Boolean) as { move: Move; result: DamageSpreadResult }[];
  }, [attackerActiveState, defenderActiveState, attackerSpecies, selectedMoveId, format, field]);

  // Multi-defender benchmark results (testing attacker against multiple defenders)
  const multiBenchmarkResults = useMemo(() => {
    return multiDefenderIds.map((specId) => {
      const spec = POKEMON_ROSTER.find((s) => s.id === specId);
      if (!spec) return null;
      // Build standard defender
      const dummy: CustomPokemon = {
        id: `bench_${spec.id}`,
        speciesId: spec.id,
        nickname: spec.name,
        level: 50,
        item: 'none',
        ability: spec.abilities[0],
        nature: 'Careful',
        evs: { hp: 252, attack: 0, defense: 128, spAtk: 0, spDef: 128, speed: 0 },
        moves: spec.learnset.slice(0, 4)
      };
      const maxStats = calculateAllStats(dummy, spec);
      const defState: ActivePokemonState = {
        instanceId: `bench_${spec.id}`,
        species: spec,
        nickname: spec.name,
        level: 50,
        item: 'none',
        ability: spec.abilities[0],
        maxStats,
        currentHp: maxStats.hp,
        statStages: { attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 },
        moves: [],
        isFainted: false
      };
      const res = calculateDamageSpread(attackerActiveState, defState, activeMove, format, field);
      return {
        species: spec,
        defenderState: defState,
        result: res
      };
    }).filter(Boolean) as { species: PokemonSpecies; defenderState: ActivePokemonState; result: DamageSpreadResult }[];
  }, [multiDefenderIds, attackerActiveState, activeMove, format, field]);

  const filteredMultiResults = useMemo(() => {
    if (!searchTargetQuery.trim()) return multiBenchmarkResults;
    const q = searchTargetQuery.toLowerCase();
    return multiBenchmarkResults.filter((r) => r.species.name.toLowerCase().includes(q));
  }, [multiBenchmarkResults, searchTargetQuery]);

  // EV handlers
  const handleSetAttackerEv = (stat: StatKey, value: number) => {
    const clamped = Math.min(252, Math.max(0, Math.round(value / 4) * 4));
    setAttackerEvs((prev) => ({ ...prev, [stat]: clamped }));
  };

  const handleSetDefenderEv = (stat: StatKey, value: number) => {
    const clamped = Math.min(252, Math.max(0, Math.round(value / 4) * 4));
    setDefenderEvs((prev) => ({ ...prev, [stat]: clamped }));
  };

  // Swap attacker and defender
  const handleSwapPokemon = () => {
    const prevAttackerId = attackerSpeciesId;
    const prevAttackerItem = attackerItem;
    const prevAttackerNature = attackerNature;
    const prevAttackerAbility = attackerAbility;
    const prevAttackerEvs = attackerEvs;

    setAttackerSpeciesId(defenderSpeciesId);
    setAttackerItem(defenderItem);
    setAttackerNature(defenderNature);
    setAttackerAbility(defenderAbility);
    setAttackerEvs(defenderEvs);

    setDefenderSpeciesId(prevAttackerId);
    setDefenderItem(prevAttackerItem);
    setDefenderNature(prevAttackerNature);
    setDefenderAbility(prevAttackerAbility);
    setDefenderEvs(prevAttackerEvs);

    const newSpec = POKEMON_ROSTER.find((s) => s.id === defenderSpeciesId);
    if (newSpec && newSpec.learnset.length > 0) {
      setSelectedMoveId(newSpec.learnset[0]);
    }
  };

  const getVerdictBadgeStyle = (verdict: string) => {
    if (verdict.includes('Guaranteed OHKO')) {
      return { bg: 'rgba(34, 197, 94, 0.25)', border: '#22c55e', text: '#4ade80' };
    }
    if (verdict.includes('chance to OHKO')) {
      return { bg: 'rgba(234, 179, 8, 0.25)', border: '#eab308', text: '#fde047' };
    }
    if (verdict.includes('2HKO')) {
      return { bg: 'rgba(249, 115, 22, 0.25)', border: '#f97316', text: '#fb923c' };
    }
    if (verdict.includes('3HKO')) {
      return { bg: 'rgba(168, 85, 247, 0.25)', border: '#a855f7', text: '#c084fc' };
    }
    if (verdict.includes('Immune') || verdict.includes('0%')) {
      return { bg: 'rgba(100, 116, 139, 0.25)', border: '#64748b', text: '#cbd5e1' };
    }
    return { bg: 'rgba(239, 68, 68, 0.25)', border: '#ef4444', text: '#f87171' };
  };

  // Remaining HP after damage
  const defMaxHp = defenderActiveState.maxStats.hp;
  const remMinHp = Math.max(0, defMaxHp - singleCalcResult.maxDamage);
  const remMaxHp = Math.max(0, defMaxHp - singleCalcResult.minDamage);
  const remMinPct = Number(((remMinHp / defMaxHp) * 100).toFixed(1));
  const remMaxPct = Number(((remMaxHp / defMaxHp) * 100).toFixed(1));

  return (
    <div className="battle-calc-container animate-in w-full max-w-7xl mx-auto space-y-4 p-4">
      {/* Top Header */}
      <div className="glass-panel flex justify-between items-center p-3.5 rounded-2xl border border-glass flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5" onClick={onBack}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <Calculator size={22} className="text-sky-400" />
            <h2 className="text-lg font-black text-white m-0">Pokémon Damage Calculator</h2>
          </div>
        </div>

        {/* Mode Switcher & Format */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-glass">
            <button
              onClick={() => setCalcMode('1v1')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                calcMode === '1v1' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Swords size={14} /> 1v1 EV Matchup Lab
            </button>
            <button
              onClick={() => setCalcMode('MULTI')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                calcMode === 'MULTI' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users size={14} /> Multi-Target Benchmark
            </button>
          </div>

          <button
            className="btn-secondary text-xs px-2.5 py-1.5 font-bold flex items-center gap-1 text-slate-300"
            onClick={handleSwapPokemon}
            title="Swap Attacker and Defender"
          >
            <ArrowLeftRight size={14} /> Swap Sides
          </button>

          <button
            className="btn-secondary text-xs px-3 py-1.5 font-bold"
            onClick={() => setFormat(format === 'Doubles' ? 'Singles' : 'Doubles')}
          >
            {format} ({format === 'Doubles' ? 'Spread 0.75x' : '1.0x'})
          </button>
        </div>
      </div>

      {/* Main 1v1 View: Attacker, Damage Verdict, Defender */}
      {calcMode === '1v1' && (
        <div className="flex flex-col gap-6">
          {/* HERO SECTION: The Result */}
          {/* MIDDLE: Damage Output & Visual Gauge (4 Cols) */}
          <div className={`calc-card hero-result-card p-8 space-y-6 ${singleCalcResult.koVerdict === 'Guaranteed OHKO' ? 'result-card-pulse border-rose-500/50' : 'border-indigo-500/40 bg-gradient-to-b from-indigo-950/40 to-slate-900/80'}`}>
            <div className="text-center pb-2 border-b border-glass">
              <span className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase">
                Damage Calculation
              </span>
              <h3 className="font-black text-lg text-white mt-0.5">
                {attackerSpecies.name}’s {activeMove.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                vs. {defenderSpecies.name} ({defenderEvs.hp} HP / {defenderEvs.defense} Def / {defenderEvs.spDef} SpD)
              </p>
            </div>

            {/* Massive Numbers Display */}
            <div className="text-center py-2 bg-slate-950/70 rounded-2xl border border-glass space-y-1 shadow-inner">
              <div className="text-3xl font-black text-white tracking-wide">
                {singleCalcResult.minDamage} – {singleCalcResult.maxDamage}
              </div>
              <div className="text-lg font-extrabold text-sky-400">
                ({singleCalcResult.minPercent}% – {singleCalcResult.maxPercent}%)
              </div>

              {/* KO Verdict Badge */}
              <div className="pt-2">
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.35rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    ...getVerdictBadgeStyle(singleCalcResult.koVerdict)
                  }}
                >
                  {singleCalcResult.koVerdict}
                </span>
              </div>
            </div>

            {/* Defender HP Interactive Bar Gauge */}
            <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-glass">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-bold text-slate-300">Defender HP Impact:</span>
                <span className="font-mono text-slate-400 font-bold">{defMaxHp} Max HP</span>
              </div>

              {/* Advanced HP Bar with Custom CSS */}
              <div className="damage-bar-track relative">
                {/* Remaining Min Bar */}
                <div
                  className={`damage-bar-fill ${remMaxPct <= 0 ? 'bg-slate-700' : remMaxPct < 25 ? 'ohko' : remMaxPct < 50 ? 'high' : 'low'}`}
                  style={{ width: `${Math.max(0, Math.min(100, remMaxPct))}%` }}
                />
                {/* Damage Chunk Highlight */}
                <div
                  className="absolute top-0 bottom-0 bg-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.8)] border-l border-white/40"
                  style={{
                    left: `${Math.max(0, Math.min(100, remMinPct))}%`,
                    width: `${Math.max(0, Math.min(100, remMaxPct - remMinPct))}%`
                  }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-300 font-medium">
                <span>Remaining after hit:</span>
                <span className="font-mono font-bold text-amber-300">
                  {remMinHp} – {remMaxHp} HP ({remMinPct}% – {remMaxPct}%)
                </span>
              </div>
            </div>

            {/* 16 Discrete Damage Rolls */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300">16 Discrete Damage Rolls:</span>
                <span className="text-[10px] text-emerald-400 font-bold">Green = KOs Target</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {singleCalcResult.rolls.map((roll, idx) => {
                  const isKo = roll >= defMaxHp;
                  return (
                    <div
                      key={idx}
                      className={`text-center py-1 rounded text-xs font-mono font-extrabold border transition-all ${
                        isKo
                          ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-sm'
                          : 'bg-slate-950/80 border-glass text-slate-300'
                      }`}
                    >
                      {roll}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Environmental / Field Conditions */}
            <div className="pt-2 border-t border-glass space-y-2">
              <span className="text-xs font-bold text-slate-300 block">Battle Conditions & Weather</span>
              <div className="flex flex-wrap gap-1.5">
                {(['None', 'Sun', 'Rain', 'Sandstorm', 'Snow'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setField({ ...field, weather: w === 'None' ? undefined : w })}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                      (field.weather === w || (!field.weather && w === 'None'))
                        ? 'bg-indigo-600 border-indigo-400 text-white'
                        : 'bg-slate-950/60 border-glass text-slate-400 hover:text-white'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {(['None', 'Electric', 'Grassy', 'Psychic', 'Misty'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setField({ ...field, terrain: t === 'None' ? undefined : t })}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                      (field.terrain === t || (!field.terrain && t === 'None'))
                        ? 'bg-emerald-700 border-emerald-400 text-white'
                        : 'bg-slate-950/60 border-glass text-slate-400 hover:text-white'
                    }`}
                  >
                    {t} Terrain
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5 pt-1">
                <button
                  onClick={() => setField({ ...field, reflect: !field.reflect })}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex-1 transition-all ${
                    field.reflect ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-950/60 border-glass text-slate-400'
                  }`}
                >
                  Reflect
                </button>
                <button
                  onClick={() => setField({ ...field, lightScreen: !field.lightScreen })}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex-1 transition-all ${
                    field.lightScreen ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-950/60 border-glass text-slate-400'
                  }`}
                >
                  Light Screen
                </button>
                <button
                  onClick={() => setField({ ...field, auroraVeil: !field.auroraVeil })}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex-1 transition-all ${
                    field.auroraVeil ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-950/60 border-glass text-slate-400'
                  }`}
                >
                  Aurora Veil
                </button>
              </div>
            </div>

            {/* Other moves comparison against this exact Defender */}
            <div className="pt-2 border-t border-glass space-y-1.5">
              <span className="text-xs font-bold text-slate-300 block">All Learnset Attacks vs. this Spread:</span>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {attackerMovesetResults.map(({ move, result }) => (
                  <div
                    key={move.id}
                    onClick={() => setSelectedMoveId(move.id)}
                    className={`p-2 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${
                      selectedMoveId === move.id
                        ? 'bg-indigo-950 border-indigo-400'
                        : 'bg-slate-950/60 border-glass hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{move.name}</div>
                      <div className="text-[10px] text-slate-400">{move.type} • {move.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-sky-300">
                        {result.minPercent}% – {result.maxPercent}%
                      </div>
                      <div className="text-[10px] font-bold" style={{ color: getVerdictBadgeStyle(result.koVerdict).text }}>
                        {result.koVerdict}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Attacker Column (4 Cols) */}
          <div className="config-panel glass-panel rounded-2xl p-6 relative overflow-hidden space-y-4 pb-4">
            <div className="calc-header flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-indigo-400 flex items-center gap-1.5">
                <Swords size={16} /> Attacker (Offense)
              </h3>
              {playerTeam.length > 0 && (
                <select
                  className="input-base text-[11px] py-1 px-2"
                  onChange={(e) => {
                    const picked = playerTeam.find((p) => p.id === e.target.value);
                    if (picked) {
                      setAttackerSpeciesId(picked.speciesId);
                      setAttackerItem(picked.item);
                      setAttackerNature(picked.nature);
                      setAttackerAbility(picked.ability);
                      // convert 0..32 to 0..252 scale if needed
                      setAttackerEvs({
                        hp: picked.evs.hp <= 32 && picked.evs.hp > 0 ? Math.min(252, picked.evs.hp * 8) : picked.evs.hp,
                        attack: picked.evs.attack <= 32 && picked.evs.attack > 0 ? Math.min(252, picked.evs.attack * 8) : picked.evs.attack,
                        defense: picked.evs.defense <= 32 && picked.evs.defense > 0 ? Math.min(252, picked.evs.defense * 8) : picked.evs.defense,
                        spAtk: picked.evs.spAtk <= 32 && picked.evs.spAtk > 0 ? Math.min(252, picked.evs.spAtk * 8) : picked.evs.spAtk,
                        spDef: picked.evs.spDef <= 32 && picked.evs.spDef > 0 ? Math.min(252, picked.evs.spDef * 8) : picked.evs.spDef,
                        speed: picked.evs.speed <= 32 && picked.evs.speed > 0 ? Math.min(252, picked.evs.speed * 8) : picked.evs.speed
                      });
                    }
                  }}
                >
                  <option value="">Load from Team...</option>
                  {playerTeam.map((p) => (
                    <option key={p.id} value={p.id}>{p.nickname}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Species Select & Types */}
            <div className="flex gap-3 items-center">
              <img
                src={attackerSpecies.spriteUrl}
                alt={attackerSpecies.name}
                className="w-16 h-16 object-contain drop-shadow"
              />
              <div className="flex-1">
                <select
                  className="input-base w-full text-xs font-bold"
                  value={attackerSpeciesId}
                  onChange={(e) => {
                    setAttackerSpeciesId(e.target.value);
                    const spec = POKEMON_ROSTER.find((s) => s.id === e.target.value);
                    if (spec) {
                      setAttackerAbility(spec.abilities[0]);
                      if (spec.learnset.length > 0) setSelectedMoveId(spec.learnset[0]);
                    }
                  }}
                >
                  {POKEMON_ROSTER.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {attackerSpecies.types.map((t) => (
                    <span key={t} className={`type-tag type-${t.toLowerCase()}`} style={{ fontSize: '0.55rem', padding: '0.05rem 0.35rem' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Nature, Ability, Item, Status */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Item</label>
                <select
                  className="input-base w-full text-[11px] py-1"
                  value={attackerItem}
                  onChange={(e) => setAttackerItem(e.target.value)}
                >
                  <option value="none">None</option>
                  {HELD_ITEMS.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Nature</label>
                <select
                  className="input-base w-full text-[11px] py-1"
                  value={attackerNature}
                  onChange={(e) => setAttackerNature(e.target.value)}
                >
                  {NATURES.map((n) => (
                    <option key={n.name} value={n.name}>{n.name} {n.plus ? `(+${n.plus})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Ability</label>
                <select
                  className="input-base w-full text-[11px] py-1"
                  value={attackerAbility}
                  onChange={(e) => setAttackerAbility(e.target.value)}
                >
                  {attackerSpecies.abilities.map((ab) => (
                    <option key={ab} value={ab}>{ab}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Status</label>
                <select
                  className="input-base w-full text-[11px] py-1"
                  value={attackerStatus}
                  onChange={(e) => setAttackerStatus(e.target.value)}
                >
                  <option value="None">Healthy</option>
                  <option value="Burn">Burned (0.5x Phys Atk)</option>
                  <option value="Paralysis">Paralyzed (0.5x Spe)</option>
                </select>
              </div>
            </div>

            {/* Stat Stage Boosts */}
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-glass space-y-2">
              <span className="text-[11px] font-bold text-slate-300 block">Attacker Stat Boosts:</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Atk Stage</span>
                    <span className={`font-bold ${attackerAtkStage > 0 ? 'text-emerald-400' : attackerAtkStage < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {attackerAtkStage > 0 ? `+${attackerAtkStage}` : attackerAtkStage}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-6}
                    max={6}
                    value={attackerAtkStage}
                    onChange={(e) => setAttackerAtkStage(Number(e.target.value))}
                    className="calc-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">SpA Stage</span>
                    <span className={`font-bold ${attackerSpAtkStage > 0 ? 'text-emerald-400' : attackerSpAtkStage < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {attackerSpAtkStage > 0 ? `+${attackerSpAtkStage}` : attackerSpAtkStage}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-6}
                    max={6}
                    value={attackerSpAtkStage}
                    onChange={(e) => setAttackerSpAtkStage(Number(e.target.value))}
                    className="calc-slider"
                  />
                </div>
              </div>
            </div>

            {/* 6-STAT EV SLIDERS (SPECIFIC EVs FEATURE) */}
            <div className="space-y-2 pt-2 border-t border-glass">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-white flex items-center gap-1">
                  <Zap size={14} className="text-amber-400" /> Specific EVs (0–252)
                </span>
                <span className={`text-[11px] font-mono font-bold ${totalAttackerEvs > 508 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {totalAttackerEvs}/508
                </span>
              </div>

              {/* Quick EV Presets */}
              <div className="flex gap-1 flex-wrap">
                <button
                  className="btn-secondary text-[10px] px-2 py-0.5"
                  onClick={() => setAttackerEvs({ hp: 4, attack: 252, defense: 0, spAtk: 0, spDef: 0, speed: 252 })}
                >
                  252 Atk / Spe
                </button>
                <button
                  className="btn-secondary text-[10px] px-2 py-0.5"
                  onClick={() => setAttackerEvs({ hp: 4, attack: 0, defense: 0, spAtk: 252, spDef: 0, speed: 252 })}
                >
                  252 SpA / Spe
                </button>
                <button
                  className="btn-secondary text-[10px] px-2 py-0.5"
                  onClick={() => setAttackerEvs({ hp: 252, attack: 252, defense: 4, spAtk: 0, spDef: 0, speed: 0 })}
                >
                  252 HP / Atk
                </button>
                <button
                  className="btn-secondary text-[10px] px-2 py-0.5 text-slate-400"
                  onClick={() => setAttackerEvs({ hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 })}
                >
                  Reset
                </button>
                <button
                  className={`btn-secondary text-[10px] px-1.5 py-0.5 ${attackerIvs.speed === 0 ? 'bg-amber-600 text-white font-bold' : 'text-slate-400'}`}
                  onClick={() => setAttackerIvs((prev) => ({ ...prev, speed: prev.speed === 0 ? 31 : 0 }))}
                  title="Toggle 0 Speed IV for Trick Room"
                >
                  {attackerIvs.speed === 0 ? '0 Spe IV' : '31 Spe IV'}
                </button>
                <button
                  className={`btn-secondary text-[10px] px-1.5 py-0.5 ${attackerIvs.attack === 0 ? 'bg-amber-600 text-white font-bold' : 'text-slate-400'}`}
                  onClick={() => setAttackerIvs((prev) => ({ ...prev, attack: prev.attack === 0 ? 31 : 0 }))}
                  title="Toggle 0 Atk IV for Foul Play / confusion"
                >
                  {attackerIvs.attack === 0 ? '0 Atk IV' : '31 Atk IV'}
                </button>
              </div>

              {/* EV Sliders */}
              {(['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'] as StatKey[]).map((stat) => (
                <div key={stat} className="stat-slider-row">
                  <span className="stat-slider-label">{STAT_DISPLAY_NAMES[stat]}</span>
                  <input
                    type="range"
                    min={0}
                    max={252}
                    step={4}
                    value={attackerEvs[stat]}
                    onChange={(e) => handleSetAttackerEv(stat, Number(e.target.value))}
                    className="stat-slider-track accent-indigo-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={252}
                    step={4}
                    value={attackerEvs[stat]}
                    onChange={(e) => handleSetAttackerEv(stat, Number(e.target.value))}
                    className="stat-slider-num"
                  />
                  <div className="w-12 text-right font-mono font-bold text-xs text-indigo-300">
                    {attackerActiveState.maxStats[stat]}
                  </div>
                </div>
              ))}
            </div>

            {/* Live Stat Readout */}
            <div className="grid grid-cols-6 gap-1 bg-slate-950/80 p-2 rounded-xl border border-glass text-center">
              {(['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'] as StatKey[]).map((stat) => (
                <div key={stat} className="stat-chip">
                  <span className="stat-chip-name">{STAT_DISPLAY_NAMES[stat]}</span>
                  <span className="stat-chip-val">{attackerActiveState.maxStats[stat]}</span>
                </div>
              ))}
            </div>

            {/* Attack Selection */}
            <div className="pt-2 border-t border-glass space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-white">Select Attack</span>
                <button
                  className="btn-secondary text-[10px] px-2 py-0.5 text-sky-400"
                  onClick={() => setShowCustomMovePicker(!showCustomMovePicker)}
                >
                  {showCustomMovePicker ? 'Show Learnset' : 'Search All Moves'}
                </button>
              </div>

              {showCustomMovePicker ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Search 194 moves database..."
                    value={customMoveSearch}
                    onChange={(e) => setCustomMoveSearch(e.target.value)}
                    className="input-base w-full text-xs py-1"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-950 p-1.5 rounded-xl border border-glass">
                    {Object.values(MOVES_DATABASE)
                      .filter((m) => m.name.toLowerCase().includes(customMoveSearch.toLowerCase()))
                      .slice(0, 15)
                      .map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedMoveId(m.id);
                            setShowCustomMovePicker(false);
                          }}
                          className={`w-full text-left text-xs p-1.5 rounded-lg flex justify-between items-center transition-all ${
                            selectedMoveId === m.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="font-bold">{m.name}</span>
                          <span className="text-[10px] opacity-75">{m.type} • {m.power || 0} BP</span>
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {attackerSpecies.learnset.map((mId) => {
                    const mObj = MOVES_DATABASE[mId];
                    if (!mObj) return null;
                    const isSelected = selectedMoveId === mId;
                    return (
                      <button
                        key={mId}
                        onClick={() => setSelectedMoveId(mId)}
                        className={`btn-move move-type-${mObj.type.toLowerCase()} p-2 text-left rounded-xl transition-all ${
                          isSelected ? 'ring-2 ring-white shadow-lg' : 'opacity-90'
                        }`}
                      >
                        <div className="font-bold text-xs text-white">{mObj.name}</div>
                        <div className="flex justify-between items-center text-[10px] text-slate-300 mt-1">
                          <span className={`type-tag type-${mObj.type.toLowerCase()}`} style={{ fontSize: '0.5rem', padding: '0.05rem 0.25rem' }}>
                            {mObj.type}
                          </span>
                          <span>{mObj.power ? `${mObj.power} BP` : 'Status'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Defender Column (4 Cols) */}
          <div className="config-panel glass-panel rounded-2xl p-6 relative overflow-hidden space-y-4 pb-4">
            <div className="calc-header flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-sky-400 flex items-center gap-1.5">
                <Shield size={16} /> Defender (Target)
              </h3>
              <div className="flex gap-1">
                {(['incineroar', 'archaludon', 'kingambit'] as const).map((quickId) => (
                  <button
                    key={quickId}
                    className="btn-secondary text-[10px] px-1.5 py-0.5 capitalize"
                    onClick={() => {
                      setDefenderSpeciesId(quickId);
                      const s = POKEMON_ROSTER.find(p => p.id === quickId);
                      if (s) setDefenderAbility(s.abilities[0]);
                    }}
                  >
                    {quickId}
                  </button>
                ))}
              </div>
            </div>

            {/* Defender Species Select & Types */}
            <div className="flex gap-3 items-center">
              <img
                src={defenderSpecies.spriteUrl}
                alt={defenderSpecies.name}
                className="w-16 h-16 object-contain drop-shadow"
              />
              <div className="flex-1">
                <select
                  className="input-base w-full text-xs font-bold"
                  value={defenderSpeciesId}
                  onChange={(e) => {
                    setDefenderSpeciesId(e.target.value);
                    const spec = POKEMON_ROSTER.find((s) => s.id === e.target.value);
                    if (spec) setDefenderAbility(spec.abilities[0]);
                  }}
                >
                  {POKEMON_ROSTER.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {defenderSpecies.types.map((t) => (
                    <span key={t} className={`type-tag type-${t.toLowerCase()}`} style={{ fontSize: '0.55rem', padding: '0.05rem 0.35rem' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Defender Config: Nature, Ability, Item, Status */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Held Item</label>
                <select
                  className="input-base w-full text-[11px] py-1"
                  value={defenderItem}
                  onChange={(e) => setDefenderItem(e.target.value)}
                >
                  <option value="none">None</option>
                  {HELD_ITEMS.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Nature</label>
                <select
                  className="input-base w-full text-[11px] py-1"
                  value={defenderNature}
                  onChange={(e) => setDefenderNature(e.target.value)}
                >
                  {NATURES.map((n) => (
                    <option key={n.name} value={n.name}>{n.name} {n.plus ? `(+${n.plus})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Ability</label>
                <select
                  className="input-base w-full text-[11px] py-1"
                  value={defenderAbility}
                  onChange={(e) => setDefenderAbility(e.target.value)}
                >
                  {defenderSpecies.abilities.map((ab) => (
                    <option key={ab} value={ab}>{ab}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Status</label>
                <select
                  className="input-base w-full text-[11px] py-1"
                  value={defenderStatus}
                  onChange={(e) => setDefenderStatus(e.target.value)}
                >
                  <option value="None">Healthy</option>
                  <option value="Burn">Burned</option>
                  <option value="Paralysis">Paralyzed</option>
                </select>
              </div>
            </div>

            {/* Defender Stat Stages */}
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-glass space-y-2">
              <span className="text-[11px] font-bold text-slate-300 block">Defender Stat Boosts:</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Def Stage</span>
                    <span className={`font-bold ${defenderDefStage > 0 ? 'text-emerald-400' : defenderDefStage < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {defenderDefStage > 0 ? `+${defenderDefStage}` : defenderDefStage}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-6}
                    max={6}
                    value={defenderDefStage}
                    onChange={(e) => setDefenderDefStage(Number(e.target.value))}
                    className="calc-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">SpD Stage</span>
                    <span className={`font-bold ${defenderSpDefStage > 0 ? 'text-emerald-400' : defenderSpDefStage < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {defenderSpDefStage > 0 ? `+${defenderSpDefStage}` : defenderSpDefStage}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-6}
                    max={6}
                    value={defenderSpDefStage}
                    onChange={(e) => setDefenderSpDefStage(Number(e.target.value))}
                    className="calc-slider"
                  />
                </div>
              </div>
            </div>

            {/* 6-STAT DEFENDER EV SLIDERS (SPECIFIC EVs FEATURE) */}
            <div className="space-y-2 pt-2 border-t border-glass">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-white flex items-center gap-1">
                  <Zap size={14} className="text-sky-400" /> Defender Specific EVs (0–252)
                </span>
                <span className={`text-[11px] font-mono font-bold ${totalDefenderEvs > 508 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {totalDefenderEvs}/508
                </span>
              </div>

              {/* Defender Quick EV Presets */}
              <div className="flex gap-1 flex-wrap">
                <button
                  className="btn-secondary text-[10px] px-2 py-0.5"
                  onClick={() => setDefenderEvs({ hp: 252, attack: 0, defense: 252, spAtk: 0, spDef: 4, speed: 0 })}
                >
                  252 HP / Def
                </button>
                <button
                  className="btn-secondary text-[10px] px-2 py-0.5"
                  onClick={() => setDefenderEvs({ hp: 252, attack: 0, defense: 4, spAtk: 0, spDef: 252, speed: 0 })}
                >
                  252 HP / SpD
                </button>
                <button
                  className="btn-secondary text-[10px] px-2 py-0.5"
                  onClick={() => setDefenderEvs({ hp: 252, attack: 0, defense: 128, spAtk: 0, spDef: 128, speed: 0 })}
                >
                  Balanced Bulk
                </button>
                <button
                  className="btn-secondary text-[10px] px-2 py-0.5"
                  onClick={() => setDefenderEvs({ hp: 4, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 252 })}
                >
                  Uninvested (4 HP)
                </button>
                <button
                  className="btn-secondary text-[10px] px-2 py-0.5 text-slate-400"
                  onClick={() => setDefenderEvs({ hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 })}
                >
                  Reset
                </button>
                <button
                  className={`btn-secondary text-[10px] px-1.5 py-0.5 ${defenderIvs.speed === 0 ? 'bg-amber-600 text-white font-bold' : 'text-slate-400'}`}
                  onClick={() => setDefenderIvs((prev) => ({ ...prev, speed: prev.speed === 0 ? 31 : 0 }))}
                  title="Toggle 0 Speed IV for Trick Room"
                >
                  {defenderIvs.speed === 0 ? '0 Spe IV' : '31 Spe IV'}
                </button>
              </div>

              {/* Defender Sliders */}
              {(['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'] as StatKey[]).map((stat) => (
                <div key={stat} className="stat-slider-row">
                  <span className="stat-slider-label">{STAT_DISPLAY_NAMES[stat]}</span>
                  <input
                    type="range"
                    min={0}
                    max={252}
                    step={4}
                    value={defenderEvs[stat]}
                    onChange={(e) => handleSetDefenderEv(stat, Number(e.target.value))}
                    className="stat-slider-track accent-sky-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={252}
                    step={4}
                    value={defenderEvs[stat]}
                    onChange={(e) => handleSetDefenderEv(stat, Number(e.target.value))}
                    className="stat-slider-num"
                  />
                  <div className="w-12 text-right font-mono font-bold text-xs text-sky-300">
                    {defenderActiveState.maxStats[stat]}
                  </div>
                </div>
              ))}
            </div>

            {/* Defender Live Stat Readout */}
            <div className="grid grid-cols-6 gap-1 bg-slate-950/80 p-2 rounded-xl border border-glass text-center">
              {(['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'] as StatKey[]).map((stat) => (
                <div key={stat} className="stat-chip">
                  <span className="stat-chip-name">{STAT_DISPLAY_NAMES[stat]}</span>
                  <span className="stat-chip-val">{defenderActiveState.maxStats[stat]}</span>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* MULTI-TARGET BENCHMARK MODE */}
      {calcMode === 'MULTI' && (
        <div className="glass-card p-5 rounded-2xl border border-glass space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Users size={20} className="text-indigo-400" /> Multi-Target Benchmark
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Benchmarking <strong>{attackerSpecies.name}</strong> ({attackerEvs.attack} Atk / {attackerEvs.spAtk} SpA) with <strong>{activeMove.name}</strong> ({activeMove.power} BP) against {filteredMultiResults.length} targets:
              </p>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              <button
                className="btn-secondary text-xs px-2.5 py-1"
                onClick={() => setShowTargetPicker(!showTargetPicker)}
              >
                <Plus size={12} className="inline mr-1" /> Pick Targets ({multiDefenderIds.length})
              </button>
              <button
                className="btn-secondary text-xs px-2.5 py-1"
                onClick={() => setMultiDefenderIds(META_DEFENDER_IDS)}
              >
                Top Meta (12)
              </button>
              <button
                className="btn-secondary text-xs px-2.5 py-1"
                onClick={() => setMultiDefenderIds(POKEMON_ROSTER.map((p) => p.id))}
              >
                All Roster ({POKEMON_ROSTER.length})
              </button>
              <button
                className="btn-secondary text-xs px-2.5 py-1 text-slate-400"
                onClick={() => setMultiDefenderIds([])}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Search Filter */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search benchmark targets..."
              value={searchTargetQuery}
              onChange={(e) => setSearchTargetQuery(e.target.value)}
              className="input-base w-full pl-8 text-xs py-1.5"
            />
          </div>

          {/* Target Drawer */}
          {showTargetPicker && (
            <div className="bg-slate-950 p-3 rounded-xl border border-glass max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
              {POKEMON_ROSTER.map((p) => {
                const isChecked = multiDefenderIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (isChecked) {
                        setMultiDefenderIds(multiDefenderIds.filter((id) => id !== p.id));
                      } else {
                        setMultiDefenderIds([...multiDefenderIds, p.id]);
                      }
                    }}
                    className={`text-xs p-1.5 rounded-lg border text-left flex items-center gap-1.5 transition-all ${
                      isChecked
                        ? 'bg-indigo-900/50 border-indigo-400 text-white font-bold'
                        : 'bg-transparent border-glass text-slate-400 hover:text-white'
                    }`}
                  >
                    {isChecked ? <Check size={12} className="text-emerald-400" /> : <div className="w-3" />}
                    <span className="truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Results Table */}
          <div className="overflow-x-auto rounded-xl border border-glass max-h-[580px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 border-b border-glass text-slate-300 font-bold z-10">
                <tr>
                  <th className="p-3">Target Pokémon</th>
                  <th className="p-3">Typing</th>
                  <th className="p-3">Bulk (HP/Def/SpD)</th>
                  <th className="p-3">Damage Range</th>
                  <th className="p-3">OHKO / 2HKO Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMultiResults.map(({ species: spec, defenderState, result }) => {
                  const badge = getVerdictBadgeStyle(result.koVerdict);
                  return (
                    <tr
                      key={spec.id}
                      className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                      onClick={() => {
                        setDefenderSpeciesId(spec.id);
                        setCalcMode('1v1');
                      }}
                      title="Click to inspect in 1v1 EV Matchup Lab"
                    >
                      <td className="p-3 flex items-center gap-2.5">
                        <img src={spec.spriteUrl} alt={spec.name} className="w-9 h-9 object-contain" />
                        <div>
                          <div className="font-bold text-white text-xs">{spec.name}</div>
                          <div className="text-[10px] text-sky-400 hover:underline">Click to test EVs &rarr;</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {spec.types.map((t) => (
                            <span key={t} className={`type-tag type-${t.toLowerCase()}`} style={{ fontSize: '0.55rem', padding: '0.05rem 0.35rem' }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-slate-400 font-mono">
                        {defenderState.maxStats.hp} / {defenderState.maxStats.defense} / {defenderState.maxStats.spDef}
                      </td>
                      <td className="p-3">
                        <div className="font-extrabold text-white">
                          {result.minDamage} – {result.maxDamage} HP
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ({result.minPercent}% – {result.maxPercent}%)
                        </div>
                        {/* mini bar */}
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full ${result.maxPercent >= 100 ? 'bg-emerald-500' : result.maxPercent >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, result.maxPercent)}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                            color: badge.text
                          }}
                        >
                          {result.koVerdict}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
