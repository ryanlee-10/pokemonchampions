import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Swords, RotateCcw, ArrowLeft, Clock, Skull, Zap, ShieldAlert } from 'lucide-react';

export interface BattleStats {
  turns: number;
  playerFainted: number;
  opponentFainted: number;
  totalDamageDealt: number;
}

export interface ResultScreenProps {
  winner: string;
  stats?: BattleStats;
  isMultiplayer?: boolean;
  onRematch: () => void;
  onExit: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  winner,
  stats = { turns: 1, playerFainted: 0, opponentFainted: 0, totalDamageDealt: 0 },
  isMultiplayer = false,
  onRematch,
  onExit,
}) => {
  const isVictory = winner === 'Player';
  const isDraw = winner === 'Draw';

  const themeColors = isVictory
    ? {
        primary: '#f59e0b',
        secondary: '#10b981',
        bgGlow: 'radial-gradient(ellipse at 50% 30%, rgba(245, 158, 11, 0.28) 0%, rgba(16, 185, 129, 0.15) 45%, transparent 75%)',
        accentBorder: 'rgba(245, 158, 11, 0.45)',
        badgeGradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 50%, #b45309 100%)',
        title: 'VICTORY!',
        subtitle: 'Champions Stadium Conquered',
      }
    : isDraw
    ? {
        primary: '#38bdf8',
        secondary: '#818cf8',
        bgGlow: 'radial-gradient(ellipse at 50% 30%, rgba(56, 189, 248, 0.25) 0%, rgba(129, 140, 248, 0.15) 45%, transparent 75%)',
        accentBorder: 'rgba(56, 189, 248, 0.45)',
        badgeGradient: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
        title: 'STALEMATE!',
        subtitle: 'Honorable Draw on the Field',
      }
    : {
        primary: '#f43f5e',
        secondary: '#9333ea',
        bgGlow: 'radial-gradient(ellipse at 50% 30%, rgba(244, 63, 94, 0.28) 0%, rgba(147, 51, 234, 0.15) 45%, transparent 75%)',
        accentBorder: 'rgba(244, 63, 94, 0.45)',
        badgeGradient: 'linear-gradient(135deg, #f43f5e 0%, #be123c 50%, #881337 100%)',
        title: 'DEFEAT',
        subtitle: 'Defeated in Battle — Rise Again',
      };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#04040c',
        color: '#fff',
        fontFamily: "var(--font-display, 'Outfit', sans-serif)",
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Background radial glow & perspective arena floor */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: themeColors.bgGlow,
          pointerEvents: 'none',
          transition: 'background 1s ease',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: '-20%',
          right: '-20%',
          bottom: '-15%',
          height: '60%',
          transformOrigin: '50% 0',
          transform: 'rotateX(68deg)',
          backgroundImage:
            'linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(180deg, transparent 0%, #000 30%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 30%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating particles */}
      {isVictory && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: `${Math.random() * 100}vw`,
                y: '105vh',
                scale: Math.random() * 0.8 + 0.4,
                opacity: 0,
              }}
              animate={{
                y: '-10vh',
                opacity: [0, 0.9, 0],
                rotate: [0, 360],
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: i % 2 === 0 ? '#fbbf24' : '#34d399',
                boxShadow: '0 0 12px currentColor',
              }}
            />
          ))}
        </div>
      )}

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '720px',
          width: '92%',
          padding: '2.5rem 2rem',
          borderRadius: '32px',
          background: 'rgba(10, 11, 26, 0.82)',
          border: `1.5px solid ${themeColors.accentBorder}`,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Main Graphic / Badge */}
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
          style={{
            position: 'relative',
            width: '110px',
            height: '110px',
            borderRadius: '50%',
            background: themeColors.badgeGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 45px ${themeColors.primary}88, inset 0 2px 8px rgba(255,255,255,0.6)`,
            marginBottom: '1.25rem',
          }}
        >
          {isVictory ? (
            <Trophy size={56} color="#ffffff" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }} />
          ) : isDraw ? (
            <Swords size={56} color="#ffffff" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }} />
          ) : (
            <ShieldAlert size={56} color="#ffffff" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }} />
          )}

          {isVictory && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                inset: -12,
                borderRadius: '50%',
                border: '2px dashed rgba(245, 158, 11, 0.45)',
                pointerEvents: 'none',
              }}
            />
          )}
        </motion.div>

        {/* Title & Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          style={{ textAlign: 'center', marginBottom: '1.75rem' }}
        >
          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 3.6rem)',
              fontWeight: 900,
              fontStyle: 'italic',
              letterSpacing: '0.04em',
              margin: 0,
              background: themeColors.badgeGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            {themeColors.title}
          </h1>
          <p
            style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.65)',
              margin: '0.35rem 0 0',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {themeColors.subtitle}
          </p>
        </motion.div>

        {/* Post-Match Details: Battle Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            width: '100%',
            marginBottom: '2rem',
          }}
        >
          {/* Turns Taken */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '12px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <Clock size={20} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Turns Taken
            </span>
            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', fontStyle: 'italic', marginTop: '0.2rem' }}>
              {stats.turns}
            </span>
          </div>

          {/* Pokémon Fainted */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '12px',
                background: 'rgba(244, 63, 94, 0.15)',
                color: '#f43f5e',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <Skull size={20} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Pokémon Down
            </span>
            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', fontStyle: 'italic', marginTop: '0.2rem' }}>
              {stats.playerFainted} <small style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>vs</small> {stats.opponentFainted}
            </span>
          </div>

          {/* Total Damage Dealt */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <Zap size={20} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Damage Dealt
            </span>
            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', fontStyle: 'italic', marginTop: '0.2rem' }}>
              {stats.totalDamageDealt} <small style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>HP</small>
            </span>
          </div>
        </motion.div>

        {/* Bottom Routing Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          style={{
            display: 'flex',
            gap: '1rem',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          {/* Rematch Button */}
          <button
            onClick={onRematch}
            style={{
              flex: 1,
              padding: '1rem 1.5rem',
              borderRadius: '16px',
              background: themeColors.badgeGradient,
              color: '#fff',
              border: 'none',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              boxShadow: `0 8px 24px ${themeColors.primary}55`,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
            }}
          >
            <RotateCcw size={18} />
            <span>Rematch</span>
          </button>

          {/* Back to Menu / Lobby Button */}
          <button
            onClick={onExit}
            style={{
              flex: 1,
              padding: '1rem 1.5rem',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#fff',
              border: '1.5px solid rgba(255, 255, 255, 0.2)',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              backdropFilter: 'blur(8px)',
              transition: 'transform 0.2s, background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
              e.currentTarget.style.borderColor = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            <ArrowLeft size={18} />
            <span>{isMultiplayer ? 'Back to Lobby' : 'Back to Menu'}</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};
