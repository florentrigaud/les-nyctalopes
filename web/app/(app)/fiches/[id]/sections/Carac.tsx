'use client';

import { useState } from 'react';
import { mod, ms } from '@/lib/pathfinder';
import type { CaracKey, Personnage } from '@/lib/types';

const STATS: CaracKey[] = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];

export default function Carac({
  perso,
  onSave,
}: {
  perso: Personnage;
  onSave: (p: Personnage) => Promise<boolean>;
}) {
  const [edit, setEdit] = useState(false);
  const [values, setValues] = useState<Record<CaracKey, number>>(() => {
    const out = {} as Record<CaracKey, number>;
    for (const s of STATS) out[s] = perso.carac?.[s]?.base ?? 10;
    return out;
  });

  async function submit() {
    const carac = {} as Personnage['carac'];
    for (const s of STATS) {
      const base = Math.max(3, Math.min(30, values[s] || 10));
      carac[s] = { base, mod: mod(base) };
    }
    const ok = await onSave({ ...perso, carac });
    if (ok) setEdit(false);
  }

  return (
    <div className="panel-block anim" style={{ marginBottom: '1rem' }}>
      <div className="panel-header panel-title-wrap">
        <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>Caractéristiques</span>
        <button className="btn-edit" onClick={() => setEdit((v) => !v)}>✎ Modifier</button>
      </div>

      {!edit ? (
        <div className="stats-grid" style={{ marginBottom: 0 }}>
          {STATS.map((k) => {
            const v = perso.carac?.[k];
            if (!v) return null;
            return (
              <div key={k} className="stat-box">
                <span className="stat-abbr">{k}</span>
                <span className="stat-base">{v.base}</span>
                <span className={`stat-mod ${v.mod > 0 ? 'mod-pos' : v.mod < 0 ? 'mod-neg' : 'mod-zer'}`}>{ms(v.mod)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="stat-edit-grid" style={{ marginBottom: '0.8rem' }}>
            {STATS.map((k) => (
              <div key={k} className="stat-edit-cell">
                <label>{k}</label>
                <input type="number" min={3} max={30} value={values[k]} onChange={(e) => setValues({ ...values, [k]: parseInt(e.target.value) || 10 })} />
              </div>
            ))}
          </div>
          <div className="edit-bar">
            <button className="btn-save" onClick={submit}>Valider</button>
            <button className="btn-cancel" onClick={() => setEdit(false)}>Annuler</button>
          </div>
        </>
      )}
    </div>
  );
}
