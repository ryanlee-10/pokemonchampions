import React, { useEffect, useState } from 'react';
import type { ActivePokemonState } from '../types/pokemon';
import { getSpriteUrls } from './types';
import '../styles/battleview.css';

export interface MatchIntroProps {
  myLeads: ActivePokemonState[];
  oppLeads: ActivePokemonState[];
  opponentName?: string;
  format: string;
  onComplete?: () => void;
}

export const MatchIntro: React.FC<MatchIntroProps> = ({
  myLeads,
  oppLeads,
  opponentName,
  format,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Background preload of animated Showdown sprites for leads
  useEffect(() => {
    const allLeads = [...myLeads, ...oppLeads];
    allLeads.forEach((lead) => {
      if (!lead?.species?.id) return;
      const urls = getSpriteUrls(lead.species.id);
      const imgFront = new Image();
      imgFront.src = urls.front;
      const imgBack = new Image();
      imgBack.src = urls.back;
      const imgIcon = new Image();
      imgIcon.src = urls.icon;
    });
  }, [myLeads, oppLeads]);

  // Smooth loading progress bar (1.25s duration)
  useEffect(() => {
    const startTime = Date.now();
    const duration = 1200; // ms

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct >= 100) {
        window.clearInterval(interval);
        // Quick 150ms fade-out transition into battle arena
        window.setTimeout(() => {
          setIsFadingOut(true);
          window.setTimeout(() => {
            onComplete?.();
          }, 180);
        }, 100);
      }
    }, 25);

    return () => window.clearInterval(interval);
  }, [onComplete]);

  const statusText = (() => {
    if (progress < 30) return 'INITIALIZING BATTLE CHAMBER...';
    if (progress < 65) return 'PRE-LOADING POKÉMON DATA...';
    if (progress < 90) return 'CALIBRATING ARENA CONDITIONS...';
    return 'ARENA READY — COMMENCING MATCH!';
  })();

  const oppDisplay = opponentName ? opponentName.toUpperCase() : 'CPU';

  return (
    <div
      className={`bv-loading-root transition-opacity duration-200 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Dynamic Background Radiance */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.25)_0%,rgba(6,7,24,0.95)_65%,#04040c_100%)] pointer-events-none" />
      <div className="absolute top-[-10%] left-[20%] w-[450px] h-[450px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[20%] w-[450px] h-[450px] bg-sky-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Futuristic Arena Perspective Grid */}
      <div className="bv-loading-grid-perspective" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-lg w-full">
        {/* Top Tag Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span className="text-[11px] font-bold text-slate-300 tracking-[0.2em] uppercase">
            CHAMPIONS LEAGUE · ARENA ENTRY
          </span>
        </div>

        {/* Holographic Glowing Pokéball Centerpiece */}
        <div className="relative w-40 h-40 flex items-center justify-center mb-8">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 120 120">
            {/* Outer Rotating Energy Ring (Clockwise) */}
            <circle
              cx="60"
              cy="60"
              r="55"
              fill="none"
              stroke="rgba(56, 189, 248, 0.4)"
              strokeWidth="2"
              strokeDasharray="14 10 28 10"
              className="bv-loading-orbit-cw"
            />

            {/* Inner Tech Compass Ring (Counter-Clockwise) */}
            <circle
              cx="60"
              cy="60"
              r="49"
              fill="none"
              stroke="rgba(168, 85, 247, 0.35)"
              strokeWidth="1.5"
              strokeDasharray="6 14 18 10"
              className="bv-loading-orbit-ccw"
            />

            {/* Core Pokéball Sphere */}
            <g className="bv-loading-core">
              <defs>
                <clipPath id="ball-clip">
                  <circle cx="60" cy="60" r="38" />
                </clipPath>
                <linearGradient id="ball-top-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="60%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#312e81" />
                </linearGradient>
                <linearGradient id="ball-bot-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>

              {/* Sphere Background with Clip */}
              <g clipPath="url(#ball-clip)">
                <rect x="20" y="20" width="80" height="40" fill="url(#ball-top-grad)" />
                <rect x="20" y="60" width="80" height="40" fill="url(#ball-bot-grad)" />
                {/* Horizontal Center Band */}
                <rect x="20" y="56" width="80" height="8" fill="#04040c" />
                {/* Subtle Surface Specular Highlight */}
                <ellipse cx="60" cy="32" rx="20" ry="7" fill="rgba(255, 255, 255, 0.25)" />
              </g>

              {/* Outer Border Rim */}
              <circle
                cx="60"
                cy="60"
                r="38"
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                filter="drop-shadow(0 0 10px rgba(99,102,241,0.6))"
              />

              {/* Center Button Housing */}
              <circle cx="60" cy="60" r="12" fill="#04040c" stroke="#818cf8" strokeWidth="2" />

              {/* Glowing Core Button */}
              <circle
                cx="60"
                cy="60"
                r="6.5"
                fill="#38bdf8"
                filter="drop-shadow(0 0 8px #38bdf8)"
              />
            </g>
          </svg>
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl font-black italic tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-sky-300 drop-shadow-[0_0_24px_rgba(129,140,248,0.6)] mb-2">
          ENTERING THE ARENA
        </h1>

        {/* Matchup Subtitle Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1 rounded-full bg-slate-900/80 border border-indigo-500/30 text-xs font-semibold text-indigo-200 tracking-wider mb-8 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <span className="font-extrabold text-white">{format.toUpperCase()}</span>
          <span className="text-indigo-400/50">•</span>
          <span>YOU VS {oppDisplay}</span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full max-w-xs space-y-2">
          <div className="w-full h-2 rounded-full bg-slate-950/80 border border-white/10 overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-100 ease-out relative bv-loading-bar-glow"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status Label & Percentage */}
          <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-slate-400 px-0.5">
            <span className="text-indigo-300/90 font-medium truncate">{statusText}</span>
            <span className="font-bold text-white ml-2">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BattleLoadingScreen = MatchIntro;
