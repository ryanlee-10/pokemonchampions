import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { audioManager } from '../audio/audioManager';
import { ZenithLogo } from './ZenithLogo';
import { PreMenuBg } from './PreMenuBg';

const BARS = 72;

interface Props {
  onEnter: () => void;
}

/** Big logo with a radial audio visualizer on its edge; tilts toward the cursor. */
export const PreMenu: React.FC<Props> = ({ onEnter }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 140, damping: 18 });
  const sy = useSpring(my, { stiffness: 140, damping: 18 });
  const rotY = useTransform(sx, [-1, 1], [-14, 14]);
  const rotX = useTransform(sy, [-1, 1], [12, -12]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = 640;
    canvas.width = S * dpr;
    canvas.height = S * dpr;
    ctx.scale(dpr, dpr);
    const smooth = new Array(BARS).fill(0);
    let raf = 0;
    let t = 0;

    const draw = () => {
      t += 0.016;
      const bands = audioManager.getBands(BARS / 2);
      const silent = bands.every((b) => b === 0);
      ctx.clearRect(0, 0, S, S);
      ctx.save();
      ctx.translate(S / 2, S / 2);
      const R = 215;
      for (let i = 0; i < BARS; i++) {
        // mirror so the ring is symmetric
        const bi = i < BARS / 2 ? i : BARS - 1 - i;
        const idle = 0.12 + 0.1 * Math.sin(t * 2 + i * 0.45);
        const target = silent ? idle : Math.max(idle * 0.5, bands[bi]);
        smooth[i] += (target - smooth[i]) * 0.28;
        const len = 8 + smooth[i] * 70;
        const a = (i / BARS) * Math.PI * 2 - Math.PI / 2;
        const hue = 190 + (i / BARS) * 120;
        ctx.strokeStyle = `hsl(${hue} 95% 68%)`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = `hsl(${hue} 95% 60%)`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R);
        ctx.lineTo(Math.cos(a) * (R + len), Math.sin(a) * (R + len));
        ctx.stroke();
      }
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.div className="premenu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.15, filter: 'blur(8px)' }} transition={{ duration: 0.5 }}>
      <PreMenuBg />
      <motion.div
        className="premenu-logo"
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onClick={onEnter}
        style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 900 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 16 }}
      >
        <canvas ref={canvasRef} className="premenu-viz" />
        <ZenithLogo size={430} className="premenu-svg" />
      </motion.div>
      <motion.p className="premenu-hint" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 2.2, repeat: Infinity }}>
        Click the logo to start
      </motion.p>
    </motion.div>
  );
};
