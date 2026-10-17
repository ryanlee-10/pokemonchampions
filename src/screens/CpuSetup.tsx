import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Bot, Swords, Users, Shield, Zap, Play } from 'lucide-react';
import type { BattleFormat, CustomPokemon, PlayerTeam } from '../types/pokemon';
import { POKEMON_ROSTER } from '../data/pokemonRoster';
import { TypeBadge } from '../intro/TypeRing';
import '../styles/arena-menus.css';

interface CpuSetupProps {
  team?: CustomPokemon[];
  teams?: PlayerTeam[];
  activeTeamIdx?: number;
  onSelectTeamIdx?: (idx: number) => void;
  onBack?: () => void;
  onStart: (format: BattleFormat) => void;
}

export const CpuSetup: React.FC<CpuSetupProps> = ({
  team = [],
  teams = [],
  activeTeamIdx = 0,
  onSelectTeamIdx,
  onBack,
  onStart,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<BattleFormat>('Doubles');

  // Check Item Clause
  const itemCounts: Record<string, number> = {};
  team.forEach((p) => {
    if (p.item && p.item !== 'none') {
      itemCounts[p.item] = (itemCounts[p.item] || 0) + 1;
    }
  });
  const duplicateItemIds = Object.keys(itemCounts).filter((id) => itemCounts[id] > 1);
  const isItemClauseValid = duplicateItemIds.length === 0;

  return (
    <div className="arena-menu-scene animate-in">
      <div className="arena-bg-watermark" aria-hidden />

      {/* Top Header */}
      <header className="arena-header-bar">
        <div className="arena-header-left">
          {onBack && (
            <button className="arena-back-btn" onClick={onBack} title="Return to Main Menu">
              <ArrowLeft size={16} /> Main Menu
            </button>
          )}
          <div className="arena-title-wrap">
            <h1>CPU Battle Arena</h1>
            <p>Simulate championship battles against AI bots with customized party teams</p>
          </div>
        </div>

        <div className="arena-header-badge orange">
          <Bot size={15} /> Solo Battle Simulator
        </div>
      </header>

      {/* Main 2-Column Panoramic Layout */}
      <div className="arena-grid-layout">
        {/* Left Column: Match Format & Combat Rules */}
        <motion.div
          className="arena-card-panel"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="arena-panel-title">
            <h2><Swords size={18} /> Choose Battle Format</h2>
            <span style={{ fontSize: '11px', color: 'var(--z-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
              STEP 1 OF 2
            </span>
          </div>

          <div className="format-select-grid">
            {/* Singles 1v1 Card */}
            <div
              className={`format-box-card ${selectedFormat === 'Singles' ? 'active-orange' : ''}`}
              onClick={() => setSelectedFormat('Singles')}
              role="button"
              tabIndex={0}
            >
              <div className="format-box-top">
                <div className="format-badge-big">1 v 1</div>
                <div className="format-badge-sub">Singles</div>
              </div>
              <img
                src="https://play.pokemonshowdown.com/sprites/ani/garchomp.gif"
                alt="Singles mascot"
                className="format-box-mascot"
                draggable={false}
              />
              <div className="format-box-info">
                <h3>Singles Battle</h3>
                <p>1 active Pokémon on field. Bring 6, pick 3 to battle.</p>
              </div>
            </div>

            {/* Doubles 2v2 Card */}
            <div
              className={`format-box-card ${selectedFormat === 'Doubles' ? 'active' : ''}`}
              onClick={() => setSelectedFormat('Doubles')}
              role="button"
              tabIndex={0}
            >
              <div className="format-box-top">
                <div className="format-badge-big">2 v 2</div>
                <div className="format-badge-sub">Doubles VGC</div>
              </div>
              <img
                src="https://play.pokemonshowdown.com/sprites/ani/incineroar.gif"
                alt="Doubles mascot"
                className="format-box-mascot"
                draggable={false}
              />
              <div className="format-box-info">
                <h3>Official Doubles</h3>
                <p>2 active Pokémon. Official VGC rules. Bring 6, pick 4.</p>
              </div>
            </div>
          </div>

          {/* Rules Strip */}
          <div style={{ marginTop: 'auto' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Battle Environment Specifications
            </div>
            <div className="battle-rules-strip">
              <div className="rule-chip highlight"><Zap size={13} /> Level 50 Auto-Scaled</div>
              <div className="rule-chip"><Shield size={13} /> Mega Evolution Active</div>
              <div className="rule-chip">Dynamic Weather & Terrains</div>
              <div className="rule-chip highlight">
                {selectedFormat === 'Singles' ? 'Bring 6, Pick 3' : 'Bring 6, Pick 4'}
              </div>
              <div className="rule-chip">Random AI Move Engine</div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Deployed Team & Match Launch */}
        <motion.div
          className="arena-card-panel"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <div className="arena-panel-title">
            <h2><Users size={18} /> Deployed Battle Party</h2>
            {teams.length > 0 && onSelectTeamIdx && (
              <select
                className="team-dropdown"
                value={activeTeamIdx}
                onChange={(e) => onSelectTeamIdx(Number(e.target.value))}
              >
                {teams.map((t, idx) => (
                  <option key={idx} value={idx}>
                    {t.name} ({t.pokemon.length}/6)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 6-Slot Party Grid */}
          <div className="team-mon-grid">
            {team.length > 0 ? (
              team.slice(0, 6).map((mon) => {
                const spec = POKEMON_ROSTER.find((s) => s.id === mon.speciesId);
                const types = spec?.types || ['Normal'];
                const sprite = spec?.spriteUrl || `https://play.pokemonshowdown.com/sprites/gen5/${mon.speciesId}.png`;
                const itemClean = mon.item && mon.item !== 'none' ? mon.item.replace(/_/g, ' ') : 'No item';

                return (
                  <div key={mon.id} className="mon-slot-card">
                    <img src={sprite} alt={mon.nickname} className="mon-slot-sprite" />
                    <div className="mon-slot-details">
                      <div className="mon-slot-name">{mon.nickname}</div>
                      <div className="mon-slot-sub">
                        <span className="mon-slot-item">{itemClean}</span>
                      </div>
                    </div>
                    <div className="mon-slot-types">
                      {types.map((t) => (
                        <TypeBadge key={t} type={t} size={18} />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: 'var(--z-muted)' }}>
                No Pokémon found in active team.
              </div>
            )}
          </div>

          {/* Item clause status */}
          <div style={{ marginBottom: '16px' }}>
            {isItemClauseValid ? (
              <div className="item-clause-badge">
                <span>✓</span> Item Clause Validated (All Pokémon hold unique items)
              </div>
            ) : (
              <div className="item-clause-badge invalid">
                <span>⚠️</span> Duplicate item detected ({duplicateItemIds.join(', ')}). Unique items required for ranked play.
              </div>
            )}
          </div>

          {/* CPU Opponent Box */}
          <div className="opponent-preview-box">
            <div className="opponent-preview-left">
              <div className="opponent-avatar">🤖</div>
              <div>
                <h4>Zenith AI Champion Bot</h4>
                <p>Autonomous bot with randomized competitive tier roster</p>
              </div>
            </div>
            <div className="opponent-balls">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="mystery-ball" title="Mystery Pokémon" />
              ))}
            </div>
          </div>

          {/* Giant Launch Button */}
          <button
            className="arena-launch-btn"
            onClick={() => onStart(selectedFormat)}
          >
            <Play size={20} fill="currentColor" />
            ENTER BATTLE ARENA ({selectedFormat.toUpperCase()})
          </button>
        </motion.div>
      </div>
    </div>
  );
};
