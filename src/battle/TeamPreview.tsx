import React from 'react';
import { ArrowLeft, Shield, Sparkles } from 'lucide-react';
import type { BattleFormat, CustomPokemon } from '../types/pokemon';
import { POKEMON_ROSTER } from '../data/pokemonRoster';
import { HELD_ITEMS } from '../data/items';

interface TeamPreviewProps {
  format: BattleFormat;
  playerTeam: CustomPokemon[];
  requiredPicks: number;
  selectedPickIds: string[];
  isWaitingForOpponentTeam: boolean;
  onTogglePick: (id: string) => void;
  onConfirm: (forcedPicks?: string[]) => void;
  onExit: () => void;
}

export const TeamPreview: React.FC<TeamPreviewProps> = ({
  format,
  playerTeam,
  requiredPicks,
  selectedPickIds,
  isWaitingForOpponentTeam,
  onTogglePick,
  onConfirm,
  onExit
}) => {
  const [timeLeft, setTimeLeft] = React.useState(90);

  React.useEffect(() => {
    if (isWaitingForOpponentTeam) return;
    if (timeLeft <= 0) {
      // Auto-fill remaining picks if needed
      let finalPicks = [...selectedPickIds];
      if (finalPicks.length < requiredPicks) {
        playerTeam.forEach((pkmn) => {
          if (!finalPicks.includes(pkmn.id) && finalPicks.length < requiredPicks) {
            finalPicks.push(pkmn.id);
          }
        });
      }
      onConfirm(finalPicks);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isWaitingForOpponentTeam, selectedPickIds.length, requiredPicks, playerTeam, onTogglePick, onConfirm]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  return (
    <div className="animate-in" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={onExit}>
          <ArrowLeft size={16} /> Exit to Lobby
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0 }}>
            <Shield size={22} color="var(--primary)" /> Team Preview: Select {requiredPicks} of 6
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
            Format: <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{format}</span> ({format === 'Singles' ? '1 Lead, 2 Bench' : '2 Leads, 2 Bench'})
          </p>
          {!isWaitingForOpponentTeam && (
            <div style={{ marginTop: '0.5rem', fontSize: '1.2rem', fontWeight: 900, color: timeLeft <= 15 ? '#ef4444' : 'var(--accent-cyan)' }}>
              ⏱ {formatTime(timeLeft)}
            </div>
          )}
        </div>
        <button
          className="btn-primary"
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (selectedPickIds.length < requiredPicks || isWaitingForOpponentTeam) ? 0.5 : 1, cursor: (selectedPickIds.length < requiredPicks || isWaitingForOpponentTeam) ? 'not-allowed' : 'pointer' }}
          disabled={selectedPickIds.length < requiredPicks || isWaitingForOpponentTeam}
          onClick={() => onConfirm()}
        >
          <Sparkles size={16} /> Confirm & Enter ({selectedPickIds.length} / {requiredPicks})
        </button>
      </div>

      {isWaitingForOpponentTeam && (
        <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center', borderColor: 'var(--accent-cyan)', backgroundColor: 'rgba(6, 182, 212, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <div style={{ width: '18px', height: '18px', border: '2px solid var(--accent-cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              Team confirmed! Waiting for opponent to select their team...
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {playerTeam.map((pkmn) => {
          const spec = POKEMON_ROSTER.find((s) => s.id === pkmn.speciesId);
          const pickIndex = selectedPickIds.indexOf(pkmn.id);
          const isPicked = pickIndex !== -1;

          let slotLabel = '';
          if (isPicked) {
            if (format === 'Singles') {
              slotLabel = pickIndex === 0 ? 'Lead #1' : `Bench #${pickIndex}`;
            } else {
              slotLabel = pickIndex < 2 ? `Lead #${pickIndex + 1}` : `Bench #${pickIndex - 1}`;
            }
          }

          return (
            <div
              key={pkmn.id}
              className="glass-card"
              style={{
                position: 'relative',
                cursor: 'pointer',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: isPicked ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
                backgroundColor: isPicked ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0, 0, 0, 0.4)',
                boxShadow: isPicked ? '0 0 15px rgba(99, 102, 241, 0.3)' : 'none',
                transform: isPicked ? 'scale(1.02)' : 'scale(1)',
                transition: 'var(--transition)'
              }}
              onClick={() => onTogglePick(pkmn.id)}
            >
              {isPicked && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '-12px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                  border: '2px solid #0f111a',
                  zIndex: 10
                }}>
                  {pickIndex + 1}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src={spec?.spriteUrl} alt={spec?.name} style={{ width: '56px', height: '56px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ fontWeight: 800, fontSize: '1rem', color: isPicked ? '#fff' : 'var(--text)', margin: 0 }}>{pkmn.nickname || spec?.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lv. {pkmn.level || 50}</span>
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                      {(spec?.types || []).map((t) => (
                        <span key={t} className={`type-tag type-${t.toLowerCase()}`} style={{ fontSize: '0.55rem', padding: '0.1rem 0.4rem', borderRadius: '1rem', textTransform: 'uppercase', fontWeight: 800 }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {isPicked && (
                  <span style={{ backgroundColor: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: '0.65rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {slotLabel}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-glass)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div><span style={{ color: 'var(--text)', fontWeight: 600 }}>Item:</span> {HELD_ITEMS.find((i) => i.id === pkmn.item)?.name || 'None'}</div>
                <div><span style={{ color: 'var(--text)', fontWeight: 600 }}>Ability:</span> {pkmn.ability}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
