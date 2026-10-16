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
    id: string; cls: string; title: string; sub: string; tag: string; mascot: string;
    icon: React.ReactNode; onClick: () => void; children?: React.ReactNode;
  }> = ({ id, cls, title, sub, tag, mascot, icon, onClick, children }) => (
    <motion.div
      variants={item}
      id={id}
      role="button"
      tabIndex={0}
      className={`menu-tile ${cls}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
    >
      <span className="tile-ball" aria-hidden />
      <span className="tile-sheen" />
      <div className="tile-top">
        <div className="tile-icon">{icon}</div>
        <span className="tile-tag">{tag}</span>
      </div>
      <img className="tile-mascot" src={`https://play.pokemonshowdown.com/sprites/ani/${mascot}.gif`} alt="" draggable={false} />
      <div className="tile-text">
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      <span className="tile-go" aria-hidden>›</span>
      {children}
    </motion.div>
  );

  return (
    <motion.div className="menu-screen" variants={container} initial="hidden" animate="show">
      <motion.header variants={item} className="menu-title">
        <small>Pokémon</small>
        <h1>Zenith</h1>
        <p className="menu-tagline">Competitive battling, your way.</p>
      </motion.header>
      <div className="menu-tiles">
        <Tile id="tile-multiplayer" cls="t-mp" tag="Online" mascot="pikachu" title="Multiplayer" sub="Create or join a room and battle a friend" icon={<MultiplayerIcon size={40} />} onClick={onMultiplayer} />
        <Tile id="tile-cpu" cls="t-cpu" tag="Solo" mascot="lucario" title="CPU Battle" sub="Singles or Doubles against the bot" icon={<CpuBattleIcon size={40} />} onClick={onCpu} />
        <Tile id="tile-teambuilder" cls="t-tb" tag={`${teamCount} team${teamCount === 1 ? '' : 's'}`} mascot="gardevoir" title="Teambuilder" sub="Teams · Boxes · Training" icon={<TeambuilderIcon size={40} />} onClick={onTeambuilder}>
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
