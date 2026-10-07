import React from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../app/store';
import { POKEMON_ROSTER } from '../data/pokemonRoster';

const AVATARS = ['⚡', '🔥', '💧', '🌿', '👑', '🌙', '❄️', '🐉'];

export const ProfileScreen: React.FC = () => {
  const { profile, setProfileName, setAvatar } = useAppStore();
  const total = profile.wins + profile.losses;
  const rate = total ? Math.round((profile.wins / total) * 100) : 0;
  const top = Object.entries(profile.usage).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="profile-screen">
      <motion.section className="profile-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="profile-avatar">{profile.avatar}</div>
        <div className="profile-id">
          <input value={profile.name} maxLength={16} onChange={(e) => setProfileName(e.target.value)} aria-label="Trainer name" />
          <div className="avatar-pick">
            {AVATARS.map((a) => (
              <button key={a} className={a === profile.avatar ? 'active' : ''} onClick={() => setAvatar(a)}>{a}</button>
            ))}
          </div>
        </div>
        <div className="profile-stats">
          <div><b>{profile.wins}</b><small>Wins</small></div>
          <div><b>{profile.losses}</b><small>Losses</small></div>
          <div><b>{rate}%</b><small>Win Rate</small></div>
        </div>
      </motion.section>

      <div className="profile-cols">
        <motion.section className="profile-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <h3>Most Used</h3>
          {top.length === 0 && <p className="muted">Play a match to see usage.</p>}
          {top.map(([id, n]) => {
            const sp = POKEMON_ROSTER.find((s) => s.id === id);
            return <div key={id} className="usage-row"><img src={sp?.spriteUrl} alt="" /><span>{sp?.name ?? id}</span><b>{n}</b></div>;
          })}
        </motion.section>
        <motion.section className="profile-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <h3>Recent Matches</h3>
          {profile.history.length === 0 && <p className="muted">No matches yet.</p>}
          {profile.history.slice(0, 8).map((m) => (
            <div key={m.id} className={`hist-row ${m.result}`}>
              <b>{m.result}</b><span>{m.mode} · {m.format}</span><small>{m.turns} turns</small>
            </div>
          ))}
        </motion.section>
      </div>
    </div>
  );
};
