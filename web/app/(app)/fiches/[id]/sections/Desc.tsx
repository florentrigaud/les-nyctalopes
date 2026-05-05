'use client';

import type { Personnage, PersoDescription } from '@/lib/types';

const EMPTY_DESC: PersoDescription = {};

export default function Desc({
  perso,
  onChange,
}: {
  perso: Personnage;
  onChange: (p: Personnage) => void;
}) {
  const d: PersoDescription = perso.description || EMPTY_DESC;

  function setDesc<K extends keyof PersoDescription>(key: K, value: PersoDescription[K]) {
    onChange({ ...perso, description: { ...d, [key]: value } });
  }

  const xpPct = perso.xp_niveau_suivant
    ? Math.round(((perso.xp_actuel || 0) / perso.xp_niveau_suivant) * 100)
    : 0;

  return (
    <>
      <div className="panel-block">
        <div className="panel-header panel-title-wrap">
          <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
            Apparence &amp; Historique
          </span>
        </div>

        <div className="desc-grid" style={{ marginBottom: '0.8rem' }}>
          <div>
            <label className="edit-label">Âge</label>
            <input
              className="edit-input"
              type="number"
              min={0}
              value={d.age ?? 0}
              onChange={(e) => setDesc('age', Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>
          <div>
            <label className="edit-label">Taille (cm)</label>
            <input
              className="edit-input"
              type="number"
              min={0}
              value={d.taille ?? 0}
              onChange={(e) => setDesc('taille', Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>
          <div>
            <label className="edit-label">Poids (kg)</label>
            <input
              className="edit-input"
              type="number"
              min={0}
              value={d.poids ?? 0}
              onChange={(e) => setDesc('poids', Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>
          <div>
            <label className="edit-label">Cheveux</label>
            <input
              className="edit-input"
              value={d.cheveux ?? ''}
              onChange={(e) => setDesc('cheveux', e.target.value)}
            />
          </div>
          <div>
            <label className="edit-label">Yeux</label>
            <input
              className="edit-input"
              value={d.yeux ?? ''}
              onChange={(e) => setDesc('yeux', e.target.value)}
            />
          </div>
          <div>
            <label className="edit-label">Peau</label>
            <input
              className="edit-input"
              value={d.peau ?? ''}
              onChange={(e) => setDesc('peau', e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginBottom: '0.6rem' }}>
          <label className="edit-label">Historique</label>
          <textarea
            className="edit-input"
            rows={3}
            style={{ resize: 'vertical', width: '100%' }}
            value={perso.background ?? ''}
            onChange={(e) => onChange({ ...perso, background: e.target.value })}
          />
        </div>
      </div>

      <div className="panel-block">
        <div className="panel-title">Expérience</div>
        <div className="xp-header">
          <span>XP actuel : {perso.xp_actuel || 0}</span>
          <span>Niveau suivant : {perso.xp_niveau_suivant || 1000}</span>
        </div>
        <div className="xp-bar"><div className="xp-fill" style={{ width: `${xpPct}%` }} /></div>
      </div>
    </>
  );
}
