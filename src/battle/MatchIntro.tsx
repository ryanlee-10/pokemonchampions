import React, { useEffect, useState } from 'react';
import type { ActivePokemonState } from '../types/pokemon';
import { Shield } from 'lucide-react';

interface MatchIntroProps {
  myLeads: ActivePokemonState[];
  oppLeads: ActivePokemonState[];
  isHost: boolean;
  opponentName?: string;
  format: string;
}

export const MatchIntro: React.FC<MatchIntroProps> = ({ myLeads, oppLeads, isHost, opponentName, format }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 500);
    const t2 = setTimeout(() => setStage(2), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="absolute inset-0 bg-black z-50 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-black to-black" />
      
      <div className={`relative flex flex-col items-center justify-center w-full transition-all duration-1000 ${stage >= 1 ? 'scale-100 opacity-100' : 'scale-150 opacity-0'}`}>
        <div className="flex items-center gap-16 w-full max-w-5xl justify-center">
          
          {/* Player Side */}
          <div className={`flex flex-col items-center gap-4 transition-all duration-700 delay-300 ${stage >= 1 ? 'translate-x-0 opacity-100' : '-translate-x-32 opacity-0'}`}>
            <h2 className="text-3xl font-black text-white italic tracking-wider">YOU</h2>
            <div className="flex gap-4">
              {myLeads.map((p, i) => (
                <div key={i} className="w-32 h-32 rounded-full bg-indigo-500/20 border-4 border-indigo-500 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                  <img src={p.activeSpriteUrl || p.species.spriteUrl} alt={p.nickname} className="w-24 h-24 object-contain" />
                </div>
              ))}
            </div>
          </div>

          {/* VS Badge */}
          <div className={`relative flex items-center justify-center transition-all duration-500 delay-700 ${stage >= 1 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
            <div className="absolute w-32 h-32 bg-rose-500/30 rounded-full blur-2xl animate-pulse" />
            <Shield size={64} className="text-white relative z-10" />
            <span className="absolute z-20 text-4xl font-black text-white italic" style={{ WebkitTextStroke: '2px black' }}>VS</span>
          </div>

          {/* Opponent Side */}
          <div className={`flex flex-col items-center gap-4 transition-all duration-700 delay-500 ${stage >= 1 ? 'translate-x-0 opacity-100' : 'translate-x-32 opacity-0'}`}>
            <h2 className="text-3xl font-black text-white italic tracking-wider">{opponentName || 'OPPONENT'}</h2>
            <div className="flex gap-4">
              {oppLeads.map((p, i) => (
                <div key={i} className="w-32 h-32 rounded-full bg-rose-500/20 border-4 border-rose-500 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.5)]">
                  <img src={p.activeSpriteUrl || p.species.spriteUrl} alt={p.nickname} className="w-24 h-24 object-contain" />
                </div>
              ))}
            </div>
          </div>

        </div>
        
        <div className={`mt-12 text-center transition-all duration-1000 delay-1000 ${stage >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <h3 className="text-xl font-bold text-slate-300 tracking-[0.2em] uppercase">{format} Battle</h3>
        </div>
      </div>
    </div>
  );
};
