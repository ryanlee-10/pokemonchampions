import React, { useState } from 'react';
import { motion } from 'motion/react';
import type { CustomPokemon, PlayerTeam } from '../types/pokemon';
import { BoxesScreen } from '../components/BoxesScreen';
import { TrainingScreen } from '../components/TrainingScreen';
import { BattleCalculator } from '../components/BattleCalculator';

export type TeambuilderTab = 'Boxes' | 'Training' | 'Damage Calc';
const TABS: TeambuilderTab[] = ['Boxes', 'Training', 'Damage Calc'];

interface Props {
  initialTab: TeambuilderTab;
  activeTeam: CustomPokemon[];
  pcBox: CustomPokemon[];
  teams: PlayerTeam[];
  onUpdateTeam: (t: CustomPokemon[]) => void;
  onUpdatePcBox: (b: CustomPokemon[]) => void;
  onUpdateTeams: React.Dispatch<React.SetStateAction<PlayerTeam[]>>;
  onUpdatePokemon: (p: CustomPokemon) => void;
  onBackToMenu: () => void;
}

export const TeambuilderHub: React.FC<Props> = (p) => {
  const [tab, setTab] = useState<TeambuilderTab>(p.initialTab);
  return (
    <div className="tb-hub">
      <div className="tb-tabs">
        {TABS.map((t) => (
          <button key={t} id={`tb-tab-${t.replace(' ', '-').toLowerCase()}`} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
            {t === tab && <motion.span layoutId="tb-pill" className="tb-pill" transition={{ type: 'spring', stiffness: 460, damping: 34 }} />}
            <span>{t}</span>
          </button>
        ))}
      </div>
      <motion.div key={tab} className="tb-body" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
        {tab === 'Boxes' && (
          <BoxesScreen
            activeTeam={p.activeTeam}
            pcBox={p.pcBox}
            teams={p.teams}
            onUpdateTeam={p.onUpdateTeam}
            onUpdatePcBox={p.onUpdatePcBox}
            onUpdateTeams={p.onUpdateTeams}
            onBackToMenu={p.onBackToMenu}
          />
        )}
        {tab === 'Training' && (
          <TrainingScreen
            pokemonList={[...p.activeTeam, ...p.pcBox]}
            onUpdatePokemon={p.onUpdatePokemon}
            onBackToMenu={p.onBackToMenu}
          />
        )}
        {tab === 'Damage Calc' && <BattleCalculator playerTeam={p.activeTeam} onBack={p.onBackToMenu} />}
      </motion.div>
    </div>
  );
};
