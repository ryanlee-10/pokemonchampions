import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { audioManager } from '../audio/audioManager';
import { ZenithLogo } from './ZenithLogo';

export const TYPE_COLORS: Record<string, string> = {
  Normal: '#a8a77a', Fire: '#ee8130', Water: '#6390f0', Grass: '#7ac74c',
  Electric: '#f7d02c', Ice: '#96d9d6', Fighting: '#c22e28', Poison: '#a33ea1',
  Ground: '#e2bf65', Flying: '#a98ff3', Psychic: '#f95587', Bug: '#a6b91a',
  Rock: '#b6a136', Ghost: '#735797', Dragon: '#6f35fc', Steel: '#b7b7ce',
  Dark: '#705746', Fairy: '#d685ad',
};
const TYPES = Object.keys(TYPE_COLORS);

interface Props {
  onFinish: () => void;
}

/**
 * Black screen -> "Welcome to Pokémon Zenith" -> type icons flash -> logo outline trace
 * -> flash on the music drop -> pre-menu. Timings key off `audioManager.introDropAt`.
 */
export const IntroSequence: React.FC<Props> = ({ onFinish }) => {
  const [started, setStarted] = useState(false);
  const [stage, setStage] = useState<'welcome' | 'types' | 'trace' | 'flash'>('welcome');
  const [typeIdx, setTypeIdx] = useState(0);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onFinish();
  };

  const start = async () => {
    setStarted(true);
    await audioManager.startIntro();
    const drop = audioManager.introDropAt;
    const at = (frac: number, fn: () => void) => timers.current.push(window.setTimeout(fn, drop * frac));
    at(0.32, () => setStage('types'));
    at(0.52, () => setStage('trace'));
    at(1, () => setStage('flash'));
    at(1.35, finish);
  };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (stage !== 'types') return;
    const id = setInterval(() => setTypeIdx((i) => (i + 1) % TYPES.length), 95);
    return () => clearInterval(id);
  }, [stage]);

  const drop = audioManager.introDropAt / 1000;

  return (
    <div className="intro-root">
      {!started && (
        <motion.button className="intro-gate" onClick={start} initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          Click to Begin
        </motion.button>
      )}

      {started && (
        <>
          <button className="intro-skip" onClick={finish}>Skip ›</button>
          <AnimatePresence mode="wait">
            {stage === 'welcome' && (
              <motion.div key="w" className="intro-text" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.6 }}>
                <small>Welcome to</small>
                <h1>Pokémon Zenith</h1>
              </motion.div>
            )}
            {stage === 'types' && (
              <motion.div key="t" className="intro-types" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {[0, 1, 2].map((o) => {
                  const name = TYPES[(typeIdx + o * 6) % TYPES.length];
                  return (
                    <motion.div
                      key={`${o}-${name}`}
                      className="intro-type"
                      style={{ background: TYPE_COLORS[name], boxShadow: `0 0 60px ${TYPE_COLORS[name]}` }}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      {name}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
            {(stage === 'trace' || stage === 'flash') && (
              <motion.div key="l" className="intro-logo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ZenithLogo size={360} trace traceDuration={Math.max(1.2, drop * 0.45)} />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {stage === 'flash' && (
              <motion.div className="intro-flash" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.9] }} transition={{ duration: 0.35 }} />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};
