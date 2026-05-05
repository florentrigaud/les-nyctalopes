'use client';

import { pvColor } from '@/lib/pathfinder';
import type { Personnage } from '@/lib/types';

export default function PvSlider({
  perso,
  onChange,
}: {
  perso: Personnage;
  onChange: (p: Personnage) => void;
}) {
  const pvMax = perso.combats?.pv_max || 0;
  const value = perso.combats?.pv_actuel ?? pvMax;
  const pct = pvMax ? Math.round((value / pvMax) * 100) : 0;

  function setPv(v: number) {
    onChange({
      ...perso,
      combats: { ...perso.combats, pv_actuel: Math.max(0, Math.min(pvMax, v)) },
    });
  }

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
        onChange={(e) => setPv(parseInt(e.target.value) || 0)}
      />
      <div className="pv-bar-outer">
        <div className="pv-bar-inner" style={{ width: `${pct}%`, background: pvColor(pct) }} />
      </div>
      <div className="pv-pct-label">{pct}%</div>
    </div>
  );
}
