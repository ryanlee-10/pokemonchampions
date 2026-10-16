import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Flag, X, Volume2, Calculator, Settings } from 'lucide-react';
import { useAppStore } from '../app/store';

interface BattleOptionsModalProps {
  isOptionsOpen: boolean;
  onCloseOptions: () => void;
  isConcedeOpen: boolean;
  onOpenConcede: () => void;
  onCloseConcede: () => void;
  onConfirmConcede: () => void;
  onShowCalc: () => void;
  onExit: () => void;
}

export const BattleOptionsModal: React.FC<BattleOptionsModalProps> = ({
  isOptionsOpen,
  onCloseOptions,
  isConcedeOpen,
  onOpenConcede,
  onCloseConcede,
  onConfirmConcede,
  onShowCalc,
  onExit,
}) => {
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);

  return (
    <>
      {/* ---------- Options Slide-Out Drawer (Smooth Slide from Left) ---------- */}
      <AnimatePresence>
        {isOptionsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseOptions}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 85,
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(3px)',
              }}
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: 'clamp(280px, 24vw, 360px)',
                zIndex: 90,
                background: 'linear-gradient(180deg, rgba(8, 9, 24, 0.96) 0%, rgba(14, 15, 36, 0.98) 100%)',
                borderRight: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '12px 0 36px rgba(0, 0, 0, 0.75)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "var(--font-display, 'Outfit', sans-serif)",
                backdropFilter: 'blur(16px)',
                userSelect: 'none',
                padding: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Settings size={20} color="#a5b4fc" />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Battle Options</h3>
                </div>
                <button
                  onClick={onCloseOptions}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '50%',
                    width: 30,
                    height: 30,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Volume Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Volume2 size={14} /> Master Volume</span>
                    <span>{settings.masterVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={settings.masterVolume}
                    onChange={(e) => setSetting('masterVolume', parseInt(e.target.value) || 0)}
                    className="ev-range-slider"
                    style={{ ['--fill-pct' as any]: `${settings.masterVolume}%` }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                    <span>Music Volume</span>
                    <span>{settings.musicVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={settings.musicVolume}
                    onChange={(e) => setSetting('musicVolume', parseInt(e.target.value) || 0)}
                    className="ev-range-slider"
                    style={{ ['--fill-pct' as any]: `${settings.musicVolume}%` }}
                  />
                </div>

                {/* Quick Calculator */}
                <button
                  onClick={() => { onCloseOptions(); onShowCalc(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '14px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    color: '#c7d2fe',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                  }}
                >
                  <Calculator size={18} color="#818cf8" />
                  <span>Damage Calculator</span>
                </button>

                {/* Forfeit & Exit Buttons inside Drawer */}
                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    onClick={() => { onCloseOptions(); onOpenConcede(); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      padding: '0.85rem',
                      borderRadius: '14px',
                      background: 'rgba(244, 63, 94, 0.18)',
                      border: '1.5px solid rgba(244, 63, 94, 0.5)',
                      color: '#fecdd3',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(244, 63, 94, 0.25)',
                    }}
                  >
                    <Flag size={18} />
                    <span>Forfeit Match</span>
                  </button>

                  <button
                    onClick={() => { onCloseOptions(); onExit(); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      padding: '0.75rem',
                      borderRadius: '14px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    <span>Exit to Main Menu</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---------- Concede Confirmation Modal ---------- */}
      <AnimatePresence>
        {isConcedeOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 130,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              fontFamily: "var(--font-display, 'Outfit', sans-serif)",
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: 'linear-gradient(180deg, #181124 0%, #0d0c18 100%)',
                border: '1.5px solid rgba(244, 63, 94, 0.45)',
                borderRadius: '24px',
                padding: '2rem',
                maxWidth: '440px',
                width: '100%',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 32px rgba(244, 63, 94, 0.25)',
                textAlign: 'center',
                color: '#fff',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(244, 63, 94, 0.18)',
                  border: '2px solid rgba(244, 63, 94, 0.6)',
                  color: '#f43f5e',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 1.25rem',
                  boxShadow: '0 0 20px rgba(244, 63, 94, 0.4)',
                }}
              >
                <AlertTriangle size={32} />
              </div>

              <h3 style={{ fontSize: '1.45rem', fontWeight: 900, margin: '0 0 0.5rem', letterSpacing: '0.02em' }}>
                Forfeit Match?
              </h3>

              <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.5, margin: '0 0 1.75rem' }}>
                Are you sure you want to concede? This match will end immediately and count as a defeat.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={onCloseConcede}
                  style={{
                    flex: 1,
                    padding: '0.85rem',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    onCloseConcede();
                    onConfirmConcede();
                  }}
                  style={{
                    flex: 1,
                    padding: '0.85rem',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(244, 63, 94, 0.5)',
                  }}
                >
                  Confirm Forfeit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
