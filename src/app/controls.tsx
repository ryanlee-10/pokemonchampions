import React, { useRef } from 'react';
import { motion } from 'motion/react';

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  label?: string;
}

export const Slider: React.FC<SliderProps> = ({ value, min = 0, max = 100, onChange, label }) => {
  const ref = useRef<HTMLDivElement>(null);
  const pct = ((value - min) / (max - min)) * 100;

  const setFromX = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    onChange(Math.round(min + t * (max - min)));
  };

  return (
    <div className="ui-slider-row">
      {label && <span>{label}</span>}
      <div
        ref={ref}
        className="ui-slider"
        role="slider"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setFromX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons) setFromX(e.clientX);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onChange(Math.min(max, value + 1));
          if (e.key === 'ArrowLeft') onChange(Math.max(min, value - 1));
        }}
      >
        <div className="ui-slider-track">
          <div className="ui-slider-fill" style={{ width: `${pct}%` }} />
        </div>
        <motion.div
          className="ui-slider-thumb"
          style={{ left: `${pct}%` }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 1.35 }}
        />
      </div>
      <output className="ui-slider-val">{value}</output>
    </div>
  );
};

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    className={`ui-toggle ${checked ? 'on' : ''}`}
    onClick={() => onChange(!checked)}
  >
    <motion.span
      className="ui-toggle-knob"
      layout
      transition={{ type: 'spring', stiffness: 600, damping: 32 }}
    />
  </button>
);

export function Segmented<T extends string>({
  options, value, onChange,
}: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="ui-seg">
      {options.map((o) => (
        <button key={o} className={o === value ? 'active' : ''} onClick={() => onChange(o)}>
          {o === value && (
            <motion.span layoutId={`seg-${options.join('')}`} className="ui-seg-pill"
              transition={{ type: 'spring', stiffness: 500, damping: 36 }} />
          )}
          <span>{o}</span>
        </button>
      ))}
    </div>
  );
}
