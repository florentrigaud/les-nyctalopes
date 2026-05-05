'use client';

import { mod, ms } from '@/lib/pathfinder';
import type { CaracKey, Personnage } from '@/lib/types';

const STATS: CaracKey[] = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];

export default function Carac({
  perso,
  onChange,
}: {
  perso: Personnage;
  onChange: (p: Personnage) => void;
}) {
  function setBase(k: CaracKey, raw: number) {
    const base = Math.max(3, Math.min(30, raw || 10));
    const carac = { ...(perso.carac || ({} as Personnage['carac'])) };
    carac[k] = { base, mod: mod(base) };
    onChange({ ...perso, carac });
  }

  return (
    <div className="panel-block anim" style={{ marginBottom: '1rem' }}>
      <div className="panel-header panel-title-wrap">
        <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>Caractéristiques</span>
      </div>

      <div className="stat-edit-grid" style={{ marginBottom: 0 }}>
        {STATS.map((k) => {
          const v = perso.carac?.[k];
          const base = v?.base ?? 10;
          const m = v?.mod ?? mod(base);
          return (
            <div key={k} className="stat-edit-cell">
              <label>{k}</label>
              <input
                type="number"
                min={3}
                max={30}
                value={base}
                onChange={(e) => setBase(k, parseInt(e.target.value) || 10)}
              />
              <span className={`stat-mod ${m > 0 ? 'mod-pos' : m < 0 ? 'mod-neg' : 'mod-zer'}`} style={{ marginLeft: '0.4rem' }}>{ms(m)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
