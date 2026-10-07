import React from 'react';
import { motion } from 'motion/react';
import { MultiplayerIcon, CpuBattleIcon, TeambuilderIcon } from '../app/icons';

interface Props {
  onMultiplayer: () => void;
  onCpu: () => void;
  onTeambuilder: () => void;
  onDamageCalc: () => void;
  teamCount: number;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
};

export const MainMenu: React.FC<Props> = ({ onMultiplayer, onCpu, onTeambuilder, onDamageCalc, teamCount }) => {
  const Tile: React.FC<{
    id: string; cls: string; title: string; sub: string;
    icon: React.ReactNode; onClick: () => void; children?: React.ReactNode;
  }> = ({ id, cls, title, sub, icon, onClick, children }) => (
    <motion.div
      variants={item}
      id={id}
      role="button"
      tabIndex={0}
      className={`menu-tile ${cls}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
    >
      <span className="tile-sheen" />
      <div className="tile-icon">{icon}</div>
      <div className="tile-text">
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      {children}
    </motion.div>
  );

  return (
    <motion.div className="menu-screen" variants={container} initial="hidden" animate="show">
      <motion.header variants={item} className="menu-title">
        <small>Pokémon</small>
        <h1>Zenith</h1>
      </motion.header>
      <div className="menu-tiles">
        <Tile id="tile-multiplayer" cls="t-mp" title="Multiplayer Battle" sub="Create or join a room and battle a friend" icon={<MultiplayerIcon size={64} />} onClick={onMultiplayer} />
        <Tile id="tile-cpu" cls="t-cpu" title="CPU Battle" sub="Singles or Doubles against the bot" icon={<CpuBattleIcon size={64} />} onClick={onCpu} />
        <Tile id="tile-teambuilder" cls="t-tb" title="Teambuilder" sub={`${teamCount} team${teamCount === 1 ? '' : 's'} · Boxes · Training`} icon={<TeambuilderIcon size={64} />} onClick={onTeambuilder}>
          <button
            id="tile-damage-calc"
            className="tile-sub"
            onClick={(e) => { e.stopPropagation(); onDamageCalc(); }}
          >
            Damage Calc ›
          </button>
        </Tile>
      </div>
    </motion.div>
  );
};
