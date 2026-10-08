import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import '../styles/switchscreen.css';
import type { ActivePokemonState, StatName } from '../types/pokemon';
import { NATURES } from '../data/natures';
import { HELD_ITEMS } from '../data/items';
import { TYPE_COLORS, TypeBadge } from '../intro/TypeRing';
import { getSpriteUrls } from './types';

interface Props {
  myTeamState: ActivePokemonState[];
  myActiveIndices: number[];
  opponentTeamState: ActivePokemonState[];
  /** instanceIds of opposing Pokémon that have been sent out at least once. */
  revealedOppIds: Set<string>;
  opponentName?: string;
  timeLeft: number;
  /** Disable "send out" (e.g. only viewing). */
  canSwitch: boolean;
  onSelectSwitch: (teamIndex: number) => void;
  onBack: () => void;
}

const STATS: Array<{ key: StatName; label: string }> = [
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'Attack' },
  { key: 'defense', label: 'Defense' },
  { key: 'spAtk', label: 'Sp. Atk' },
  { key: 'spDef', label: 'Sp. Def' },
  { key: 'speed', label: 'Speed' },
];

const pctOf = (p: ActivePokemonState) => Math.max(0, Math.round((p.currentHp / p.maxStats.hp) * 100));
const hpBand = (pct: number) => (pct > 50 ? 'ok' : pct > 20 ? 'mid' : 'low');
const hasItem = (id?: string) => !!id && id !== 'none';
const itemName = (id: string) => HELD_ITEMS.find((i) => i.id === id)?.name ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const itemIconUrl = (id: string) => `https://play.pokemonshowdown.com/sprites/itemicons/${id.replace(/_/g, '-')}.png`;
const hide = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.visibility = 'hidden'; };

const ItemIcon: React.FC<{ mon: ActivePokemonState; className?: string }> = ({ mon, className }) =>
  hasItem(mon.item) ? (
    <img className={`${className ?? ''} ${mon.itemConsumed ? 'used' : ''}`} src={itemIconUrl(mon.item)} alt={itemName(mon.item)} title={itemName(mon.item)} onError={hide} />
  ) : null;

/** Two stacked open chevrons (triangle with no base): up = red (boost), down = blue (hindrance). */
const Chevrons: React.FC<{ dir: 'up' | 'down' }> = ({ dir }) => {
  const up = dir === 'up';
  const color = up ? '#ff4b4b' : '#4b8dff';
  const d = up ? ['M2 8 L8 2 L14 8', 'M2 14 L8 8 L14 14'] : ['M2 2 L8 8 L14 2', 'M2 8 L8 14 L14 8'];
  return (
    <svg className="ss-chev" viewBox="0 0 16 16" width="20" height="20" aria-label={up ? 'Boosted by nature' : 'Lowered by nature'}>
      {d.map((p) => <path key={p} d={p} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>
  );
};

export const SwitchScreen: React.FC<Props> = ({
  myTeamState, myActiveIndices, opponentTeamState, revealedOppIds, opponentName, timeLeft, canSwitch, onSelectSwitch, onBack,
}) => {
  const firstBench = myTeamState.findIndex((p, i) => !myActiveIndices.includes(i) && p.currentHp > 0);
  const [sel, setSel] = useState<number>(firstBench >= 0 ? firstBench : 0);
  const [tab, setTab] = useState<'moves' | 'stats'>('moves');
  const [showSummary, setShowSummary] = useState(true);

  const mon = myTeamState[sel];
  const isActive = myActiveIndices.includes(sel);
  const isFainted = !!mon && mon.currentHp <= 0;
  const switchable = canSwitch && !!mon && !isActive && !isFainted;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === 'Escape' || k === 'b' || k === 'B') onBack();
      else if (k === 'y' || k === 'Y') setShowSummary((s) => !s);
      else if (k === 'ArrowDown') setSel((s) => Math.min(myTeamState.length - 1, s + 1));
      else if (k === 'ArrowUp') setSel((s) => Math.max(0, s - 1));
      else if (k === 'ArrowLeft' || k === 'l' || k === 'L') setTab('moves');
      else if (k === 'ArrowRight' || k === 'r' || k === 'R') setTab('stats');
      else if (k === 'Enter' && switchable) onSelectSwitch(sel);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [myTeamState.length, onBack, onSelectSwitch, sel, switchable]);

  const nature = NATURES.find((n) => n.name === mon?.originalNature);
  const types = mon ? (mon.activeTypes ?? mon.species.types) : [];

  return (
    <div className="ss-root">
      <div className="ss-bg" />

      {/* ------- Left: your party ------- */}
      <div className="ss-party">
        {myTeamState.map((p, i) => {
          const pct = pctOf(p);
          const active = myActiveIndices.includes(i);
          const fainted = p.currentHp <= 0;
          return (
            <button
              key={p.instanceId}
              className={`ss-row ${i === sel ? 'sel' : ''} ${fainted ? 'fainted' : ''} ${active ? 'active' : ''}`}
              onClick={() => setSel(i)}
              onDoubleClick={() => { if (canSwitch && !active && !fainted) onSelectSwitch(i); }}
            >
              <div className="ss-row-main">
                <div className="ss-row-top">
                  <span className="ss-name">{p.nickname}</span>
                  {active && <em className="ss-tag">On field</em>}
                </div>
                <div className="ss-row-hp">
                  <span className="ss-hp-num"><b>{p.currentHp}</b>/{p.maxStats.hp}</span>
                  <div className="ss-hp"><div className={`ss-hp-fill ${hpBand(pct)}`} style={{ width: `${pct}%` }} /></div>
                </div>
              </div>
              <div className="ss-row-sprite">
                <img src={getSpriteUrls(p.species.id).icon} alt="" onError={hide} />
                <ItemIcon mon={p} className="ss-held" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ------- Center: summary ------- */}
      {showSummary && mon && (
        <div className="ss-summary" key={mon.instanceId}>
          <div className="ss-tabs">
            <button className="ss-key" onClick={() => setTab('moves')}>L</button>
            <div className="ss-tabbar">
              <button className={tab === 'moves' ? 'on' : ''} onClick={() => setTab('moves')}>Moves &amp; More</button>
              <button className={tab === 'stats' ? 'on' : ''} onClick={() => setTab('stats')}>Stats</button>
            </div>
            <button className="ss-key" onClick={() => setTab('stats')}>R</button>
          </div>

          <div className="ss-types">
            {types.map((t) => (
              <span key={t} className="ss-type"><TypeBadge type={t} size={30} />{t.toUpperCase()}</span>
            ))}
          </div>

          {tab === 'moves' ? (
            <>
              <div className="ss-moves">
                {mon.moves.map(({ move, currentPp }) => (
                  <div key={move.id} className="ss-move" style={{ ['--tc' as string]: TYPE_COLORS[move.type] || '#888' }}>
                    <TypeBadge type={move.type} size={34} />
                    <span className="ss-move-name">{move.name}</span>
                    <span className="ss-move-pp"><b>{currentPp}</b>/{move.maxPp}</span>
                  </div>
                ))}
              </div>
              <div className="ss-field"><span>Ability</span><b>{mon.ability}</b></div>
              <div className={`ss-field ${mon.itemConsumed ? 'used' : ''}`}>
                <span>Held Item</span>
                <b>
                  {hasItem(mon.item) ? (<><ItemIcon mon={mon} className="ss-item-inline" />{itemName(mon.item)}{mon.itemConsumed ? ' (used)' : ''}</>) : 'None'}
                </b>
              </div>
            </>
          ) : (
            <div className="ss-stats">
              <div style={{ display: 'grid', gridTemplateColumns: '100px 40px 1fr 60px', gap: '14px', padding: '0 14px 4px', fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Stat</span>
                <span>Base</span>
                <span>EVs</span>
                <span style={{ textAlign: 'right' }}>Total</span>
              </div>
              {STATS.map(({ key, label }) => {
                const baseVal = mon.species.baseStats[key];
                const evVal = mon.originalEvs?.[key] ?? 0;
                const val = mon.maxStats[key];
                const up = nature?.plus === key;
                const down = nature?.minus === key;
                const evWidth = Math.min(100, (evVal / 32) * 100);
                return (
                  <div key={key} className={`ss-stat ${up ? 'up' : ''} ${down ? 'down' : ''}`} style={{ gridTemplateColumns: '100px 40px 1fr 60px', gap: '14px' }}>
                    <span className="ss-stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {label}
                      {up && <Chevrons dir="up" />}
                      {down && <Chevrons dir="down" />}
                    </span>
                    <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>{baseVal}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="ss-stat-bar" style={{ flex: 1 }}><div style={{ width: `${evWidth}%` }} /></div>
                      <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', fontWeight: 700, width: '20px', textAlign: 'right' }}>{evVal}</span>
                    </div>
                    <b className="ss-stat-val">{key === 'hp' ? `${mon.currentHp}/${val}` : val}</b>
                  </div>
                );
              })}
              <div className="ss-nature">Nature: <b>{mon.originalNature || '—'}</b></div>
            </div>
          )}

          {switchable && (
            <button className="ss-send" onClick={() => onSelectSwitch(sel)}>Send out {mon.nickname}</button>
          )}
          {!switchable && mon && (
            <div className="ss-note">{isActive ? 'Already on the field' : isFainted ? 'Fainted' : ''}</div>
          )}
        </div>
      )}

      {/* ------- Right: opponent party ------- */}
      <div className="ss-opp">
        <div className="ss-opp-head">
          <div className="ss-movetime">MOVE TIME <b>{timeLeft}</b></div>
          <div className="ss-opp-name">{opponentName || 'Opponent'}</div>
        </div>
        {opponentTeamState.map((p) => {
          const revealed = revealedOppIds.has(p.instanceId);
          const pct = pctOf(p);
          const t = p.activeTypes ?? p.species.types;
          return (
            <div key={p.instanceId} className={`ss-opp-row ${revealed ? '' : 'hidden-mon'} ${revealed && p.currentHp <= 0 ? 'fainted' : ''}`}>
              <img className="ss-opp-sprite" src={getSpriteUrls(p.species.id).icon} alt="" onError={hide} />
              <div className="ss-opp-mid">
                {revealed && (
                  <>
                    <div className="ss-hp small"><div className={`ss-hp-fill ${hpBand(pct)}`} style={{ width: `${pct}%` }} /></div>
                    <span className="ss-opp-pct">{pct}%</span>
                  </>
                )}
              </div>
              <div className="ss-opp-types">{t.map((ty) => <TypeBadge key={ty} type={ty} size={24} />)}</div>
            </div>
          );
        })}
      </div>

      {/* ------- Footer ------- */}
      <div className="ss-footer">
        <button onClick={() => setShowSummary((s) => !s)}><i>Y</i> {showSummary ? 'Hide' : 'Show'} Summary</button>
        <button onClick={onBack}><i>B</i> <ArrowLeft size={14} /> Back</button>
      </div>
    </div>
  );
};
