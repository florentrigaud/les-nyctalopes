'use client';

import { useEffect, useRef, useState } from 'react';
import { pvColor } from '@/lib/pathfinder';
import type { Personnage } from '@/lib/types';

export default function PvSlider({
  perso,
  onSave,
}: {
  perso: Personnage;
  onSave: (p: Personnage) => Promise<boolean>;
}) {
  const pvMax = perso.combats?.pv_max || 0;
  const [value, setValue] = useState(perso.combats?.pv_actuel ?? pvMax);
  const [autosave, setAutosave] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(perso.combats?.pv_actuel ?? pvMax);
  }, [perso.combats?.pv_actuel, pvMax]);

  function onChange(v: number) {
    setValue(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const ok = await onSave({
        ...perso,
        combats: { ...perso.combats, pv_actuel: v },
      });
      if (ok) {
        setAutosave(true);
        setTimeout(() => setAutosave(false), 2000);
      }
    }, 1500);
  }

  const pct = pvMax ? Math.round((value / pvMax) * 100) : 0;

  return (
    <div className="pv-slider-wrap">
      <div className="pv-slider-header">
        <span className="pv-label">Points de Vie</span>
        <span className="pv-val-display">
          {value} <span style={{ fontSize: '0.75rem', color: 'var(--textdim)' }}>/ {pvMax}</span>
        </span>
      </div>
      <input
        type="range"
        className="pv-slider"
        min={0}
        max={pvMax}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      />
      <div className="pv-bar-outer">
        <div className="pv-bar-inner" style={{ width: `${pct}%`, background: pvColor(pct) }} />
      </div>
      <div className="pv-pct-label">
        {pct}% <span className={`autosave-dot ${autosave ? 'show' : ''}`} />
      </div>
    </div>
  );
}
