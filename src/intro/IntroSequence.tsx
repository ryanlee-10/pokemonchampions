import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { audioManager } from '../audio/audioManager';
import { ZenithLogo } from './ZenithLogo';
import { TypeRing } from './TypeRing';

export { TYPE_COLORS } from './TypeRing';

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
                <TypeRing />
              </motion.div>
            )}
            {(stage === 'trace' || stage === 'flash') && (
              <motion.div key="l" className="intro-logo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ZenithLogo size={360} trace traceDuration={Math.max(1.2, drop * 0.45)} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};
