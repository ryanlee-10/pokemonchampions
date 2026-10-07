import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppStore, SETTING_PRESETS } from './store';
import type { Settings } from './store';
import { Slider, Toggle, Segmented } from './controls';

type Page = 'Audio' | 'Graphics' | 'Gameplay';
const PAGES: Page[] = ['Audio', 'Graphics', 'Gameplay'];

const Row: React.FC<{ title: string; desc?: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <div className="set-row">
    <div className="set-label"><strong>{title}</strong>{desc && <small>{desc}</small>}</div>
    <div className="set-control">{children}</div>
  </div>
);

export const SettingsPanel: React.FC = () => {
  const open = useAppStore((s) => s.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);
  const loadPreset = useAppStore((s) => s.loadPreset);
  const [page, setPage] = useState<Page>('Audio');
  const [preset, setPreset] = useState('Default');

  const set = <K extends keyof Settings>(k: K) => (v: Settings[K]) => setSetting(k, v);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="settings-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="settings-scrim" onClick={() => setOpen(false)} />
          <motion.section
            className="settings-shell"
            initial={{ x: -40, opacity: 0, scale: 0.97 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -40, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          >
            <aside className="settings-side">
              <h2>Settings</h2>
              {PAGES.map((p) => (
                <button key={p} className={`side-link ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                  {p === page && <motion.span layoutId="set-pill" className="side-pill" transition={{ type: 'spring', stiffness: 480, damping: 36 }} />}
                  <span>{p}</span>
                </button>
              ))}
              <div className="preset-box">
                <small>Preset</small>
                <select value={preset} onChange={(e) => setPreset(e.target.value)}>
                  {Object.keys(SETTING_PRESETS).map((n) => <option key={n}>{n}</option>)}
                </select>
                <button className="btn-secondary" onClick={() => loadPreset(preset)}>Load Preset</button>
              </div>
            </aside>

            <div className="settings-main">
              <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <h3>{page}</h3>
                  {page === 'Audio' && (
                    <>
                      <Row title="Master Volume"><Slider value={settings.masterVolume} onChange={set('masterVolume')} /></Row>
                      <Row title="Music Volume"><Slider value={settings.musicVolume} onChange={set('musicVolume')} /></Row>
                      <Row title="Sound Effects"><Slider value={settings.sfxVolume} onChange={set('sfxVolume')} /></Row>
                      <Row title="Mute When Unfocused" desc="Silence audio when this tab is in the background"><Toggle checked={settings.muteWhenBlurred} onChange={set('muteWhenBlurred')} /></Row>
                    </>
                  )}
                  {page === 'Graphics' && (
                    <>
                      <Row title="Animation Speed"><Segmented options={['Slow', 'Normal', 'Fast'] as const} value={settings.animationSpeed} onChange={set('animationSpeed')} /></Row>
                      <Row title="Particle Quality" desc="Rain, snow, sand and move effects"><Segmented options={['Low', 'Medium', 'High'] as const} value={settings.particleQuality} onChange={set('particleQuality')} /></Row>
                      <Row title="Screen Shake"><Toggle checked={settings.screenShake} onChange={set('screenShake')} /></Row>
                      <Row title="Reduced Motion" desc="Minimise animations and transitions"><Toggle checked={settings.reducedMotion} onChange={set('reducedMotion')} /></Row>
                    </>
                  )}
                  {page === 'Gameplay' && (
                    <>
                      <Row title="Battle Text Speed"><Segmented options={['Slow', 'Normal', 'Fast'] as const} value={settings.textSpeed} onChange={set('textSpeed')} /></Row>
                      <Row title="Auto-Skip Move Animations"><Toggle checked={settings.autoSkipAnimations} onChange={set('autoSkipAnimations')} /></Row>
                      <Row title="Show Damage %" desc="Display HP as a percentage"><Toggle checked={settings.showDamagePercent} onChange={set('showDamagePercent')} /></Row>
                      <Row title="Move Timer vs CPU" desc="40-second move timer in CPU battles"><Toggle checked={settings.cpuTimer} onChange={set('cpuTimer')} /></Row>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <button className="settings-close" onClick={() => setOpen(false)} aria-label="Close settings">✕</button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
