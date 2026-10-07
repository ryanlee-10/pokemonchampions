import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { audioManager, useAudio } from '../audio/audioManager';
import { useAppStore } from './store';

export const MusicPopover: React.FC = () => {
  const open = useAppStore((s) => s.musicOpen);
  const setOpen = useAppStore((s) => s.setMusicOpen);
  const audio = useAudio();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="popover-scrim"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="music-popover"
            initial={{ opacity: 0, x: -24, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -24, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <header className="mp-head">
              <div className={`eq ${audio.playing ? 'on' : ''}`}><i /><i /><i /><i /></div>
              <div className="mp-now">
                <small>Now Playing</small>
                <strong>{audio.current?.title ?? 'Nothing playing'}</strong>
              </div>
              <button className="mp-ctl" onClick={() => audioManager.toggle()} aria-label="Play/Pause">
                {audio.playing ? '❚❚' : '▶'}
              </button>
              <button className="mp-ctl" onClick={() => audioManager.next()} aria-label="Next">⏭</button>
            </header>
            <ul className="mp-list">
              {audio.tracks.length === 0 && (
                <li className="mp-empty">
                  No tracks found. Add MP3s to <code>public/audio/</code> and list them in <code>playlist.json</code>.
                </li>
              )}
              {audio.tracks.map((t, i) => {
                const active = audio.current?.file === t.file;
                return (
                  <motion.li
                    key={t.file}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i }}
                  >
                    <button className={`mp-track ${active ? 'active' : ''}`} onClick={() => audioManager.playTrack(t)}>
                      <span className="mp-idx">{active && audio.playing ? '♪' : i + 1}</span>
                      {t.title}
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
