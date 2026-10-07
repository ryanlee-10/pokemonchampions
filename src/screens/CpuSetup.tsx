import React from 'react';
import { motion } from 'motion/react';
import type { BattleFormat } from '../types/pokemon';

interface Props {
  onStart: (format: BattleFormat) => void;
}

export const CpuSetup: React.FC<Props> = ({ onStart }) => (
  <div className="setup-screen">
    <motion.h1 initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>CPU Battle</motion.h1>
    <p className="setup-sub">Choose a format. The bot picks moves at random and never uses priority moves.</p>
    <div className="setup-cards">
      {([['Singles', '1 v 1', 'Bring 3'], ['Doubles', '2 v 2', 'Bring 4']] as const).map(([f, big, small], i) => (
        <motion.button
          key={f}
          id={`cpu-${f.toLowerCase()}`}
          className="format-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 260, damping: 22 }}
          whileHover={{ y: -8, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onStart(f)}
        >
          <span className="format-big">{big}</span>
          <strong>{f}</strong>
          <small>{small}</small>
        </motion.button>
      ))}
    </div>
  </div>
);
