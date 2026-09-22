import React from 'react';
import { Swords, Dumbbell, Package, Sparkles, Calculator } from 'lucide-react';
import type { CustomPokemon } from '../types/pokemon';

interface MainMenuProps {
  onSelectBattle: () => void;
  onSelectTraining: () => void;
  onSelectBoxes: () => void;
  onSelectCalculator: () => void;
  activeTeam: CustomPokemon[];
  pcBoxCount: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onSelectBattle,
  onSelectTraining,
  onSelectBoxes,
  onSelectCalculator,
  activeTeam,
  pcBoxCount
}) => {
  return (
    <div className="main-menu-scene animate-in">
      <div className="hero-section">
        <div className="hero-badge">
          <Sparkles size={16} /> Regulation M-C Cloud Engine
        </div>
        <h1 className="hero-title">
          Pokémon Champions
        </h1>
        <p className="hero-subtitle">
          Competitive Pokémon VGC simulator with zero IVs, free WebRTC cloud relay multiplayer, deep training EV spreads, battle damage calculator, and box management.
        </p>
      </div>

      <div className="menu-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {/* Option 1: Battle */}
        <div className="menu-card glass-card battle-card" onClick={onSelectBattle}>
          <div className="menu-card-icon">
            <Swords size={32} />
          </div>
          <h2 className="menu-card-title">Battle</h2>
          <p className="menu-card-desc">
            Enter or host room codes using the free WebRTC cloud relay server. Play 1v1 Singles, 2v2 Doubles, or practice solo vs CPU.
          </p>
          <div className="menu-card-footer">
            <span className="menu-card-meta">
              Cloud Relay P2P
            </span>
            <button className="btn-primary">
              Enter Lobby &rarr;
            </button>
          </div>
        </div>

        {/* Option 2: Training */}
        <div className="menu-card glass-card training-card" onClick={onSelectTraining}>
          <div className="menu-card-icon">
            <Dumbbell size={32} />
          </div>
          <h2 className="menu-card-title">Training</h2>
          <p className="menu-card-desc">
            Customize EV stat spreads (0–252 per stat, 510 total budget), choose learnable moves from roster learnsets, and set Pokémon natures.
          </p>
          <div className="menu-card-footer">
            <span className="menu-card-meta">
              EVs & Movesets
            </span>
            <button className="btn-secondary">
              Train Pokémon &rarr;
            </button>
          </div>
        </div>

        {/* Option 3: Boxes */}
        <div className="menu-card glass-card boxes-card" onClick={onSelectBoxes}>
          <div className="menu-card-icon">
            <Package size={32} />
          </div>
          <h2 className="menu-card-title">Boxes</h2>
          <p className="menu-card-desc">
            Manage your PC Storage Box, assemble your active 6-Pokémon battle team, equip held items with Item Clause, and organize teams.
          </p>
          <div className="menu-card-footer">
            <span className="menu-card-meta">
              Team: {activeTeam.length}/6 | Box: {pcBoxCount}
            </span>
            <button className="btn-secondary">
              Open Boxes &rarr;
            </button>
          </div>
        </div>

        {/* Option 4: Calculator */}
        <div className="menu-card glass-card calc-card" onClick={onSelectCalculator} style={{ cursor: 'pointer' }}>
          <div className="menu-card-icon" style={{ color: '#38bdf8' }}>
            <Calculator size={32} />
          </div>
          <h2 className="menu-card-title">Battle Calculator</h2>
          <p className="menu-card-desc">
            Calculate damage rolls and benchmark OHKO / 2HKO odds across multiple Pokémon simultaneously or analyze 1v1 matchups in depth.
          </p>
          <div className="menu-card-footer">
            <span className="menu-card-meta">
              Multi-Target OHKO Benchmarks
            </span>
            <button className="btn-secondary" style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}>
              Open Calculator &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
