import React, { useEffect, useRef } from 'react';
import { TYPE_COLORS } from './TypeRing';
import './PreMenuBg.css';

const COLORS = Object.values(TYPE_COLORS);

interface Particle { x: number; y: number; r: number; vy: number; vx: number; c: string; ph: number; }

/** Layered animated backdrop: aurora blobs, perspective grid, rising type-colored embers, vignette. */
export const PreMenuBg: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const make = (initial: boolean): Particle => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      r: 1 + Math.random() * 2.6,
      vy: 0.25 + Math.random() * 0.8,
      vx: (Math.random() - 0.5) * 0.25,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      ph: Math.random() * Math.PI * 2,
    });
    const ps: Particle[] = Array.from({ length: 90 }, () => make(true));
    let raf = 0;
    let t = 0;
    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.y -= p.vy;
        p.x += p.vx + Math.sin(t + p.ph) * 0.15;
        if (p.y < -10) ps[i] = make(false);
        const a = 0.35 + 0.35 * Math.sin(t * 2 + p.ph);
        ctx.globalAlpha = Math.max(0.1, a);
        ctx.fillStyle = p.c;
        ctx.shadowColor = p.c;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="pmbg" aria-hidden>
      <div className="pmbg-aurora pmbg-a1" />
      <div className="pmbg-aurora pmbg-a2" />
      <div className="pmbg-aurora pmbg-a3" />
      <div className="pmbg-grid" />
      <canvas ref={ref} className="pmbg-particles" />
      <div className="pmbg-vignette" />
    </div>
  );
};
