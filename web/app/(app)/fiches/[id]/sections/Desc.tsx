'use client';

import { useState } from 'react';
import type { Personnage } from '@/lib/types';

export default function Desc({
  perso,
  onSave,
}: {
  perso: Personnage;
  onSave: (p: Personnage) => Promise<boolean>;
}) {
  const d = perso.description || {};
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState({
    age: d.age ?? 25,
    taille: d.taille ?? 170,
    poids: d.poids ?? 70,
    cheveux: d.cheveux ?? '',
    yeux: d.yeux ?? '',
    peau: d.peau ?? '',
    background: perso.background ?? '',
    xp: perso.xp_actuel ?? 0,
  });

  async function submit() {
    const ok = await onSave({
      ...perso,
      description: {
        age: Math.max(0, draft.age),
        taille: Math.max(0, draft.taille),
        poids: Math.max(0, draft.poids),
        cheveux: draft.cheveux.trim(),
        yeux: draft.yeux.trim(),
        peau: draft.peau.trim(),
      },
      background: draft.background.trim(),
      xp_actuel: Math.max(0, draft.xp),
    });
    if (ok) setEdit(false);
  }

  const xpPct = perso.xp_niveau_suivant ? Math.round(((perso.xp_actuel || 0) / perso.xp_niveau_suivant) * 100) : 0;

  return (
    <>
      <div className="panel-block">
        <div className="panel-header panel-title-wrap">
          <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
            Apparence &amp; Historique
          </span>
          <button className="btn-edit" onClick={() => setEdit((v) => !v)}>✎ Modifier</button>
        </div>

        {!edit ? (
          <>
            <div className="desc-grid">
              <div className="dbox"><div className="dbox-label">Âge</div><div className="dbox-val">{d.age || '?'} ans</div></div>
              <div className="dbox"><div className="dbox-label">Taille</div><div className="dbox-val">{d.taille || '?'} cm</div></div>
              <div className="dbox"><div className="dbox-label">Poids</div><div className="dbox-val">{d.poids || '?'} kg</div></div>
              <div className="dbox"><div className="dbox-label">Cheveux</div><div className="dbox-val">{d.cheveux || '?'}</div></div>
              <div className="dbox"><div className="dbox-label">Yeux</div><div className="dbox-val">{d.yeux || '?'}</div></div>
              <div className="dbox"><div className="dbox-label">Peau</div><div className="dbox-val">{d.peau || '?'}</div></div>
            </div>
            <div className="background-block" style={{ marginTop: '0.8rem' }}>“{perso.background || 'Origines inconnues.'}”</div>
          </>
        ) : (
          <>
            <div className="desc-grid" style={{ marginBottom: '0.8rem' }}>
              <div><label className="edit-label">Âge</label><input className="edit-input" type="number" min={0} value={draft.age} onChange={(e) => setDraft({ ...draft, age: parseInt(e.target.value) || 0 })} /></div>
              <div><label className="edit-label">Taille (cm)</label><input className="edit-input" type="number" min={0} value={draft.taille} onChange={(e) => setDraft({ ...draft, taille: parseInt(e.target.value) || 0 })} /></div>
              <div><label className="edit-label">Poids (kg)</label><input className="edit-input" type="number" min={0} value={draft.poids} onChange={(e) => setDraft({ ...draft, poids: parseInt(e.target.value) || 0 })} /></div>
              <div><label className="edit-label">Cheveux</label><input className="edit-input" value={draft.cheveux} onChange={(e) => setDraft({ ...draft, cheveux: e.target.value })} /></div>
              <div><label className="edit-label">Yeux</label><input className="edit-input" value={draft.yeux} onChange={(e) => setDraft({ ...draft, yeux: e.target.value })} /></div>
              <div><label className="edit-label">Peau</label><input className="edit-input" value={draft.peau} onChange={(e) => setDraft({ ...draft, peau: e.target.value })} /></div>
            </div>
            <div style={{ marginBottom: '0.6rem' }}>
              <label className="edit-label">Historique</label>
              <textarea className="edit-input" rows={3} style={{ resize: 'vertical' }} value={draft.background} onChange={(e) => setDraft({ ...draft, background: e.target.value })} />
            </div>
            <div style={{ marginBottom: '0.6rem' }}>
              <label className="edit-label">XP actuel</label>
              <input className="edit-input edit-input-sm" type="number" min={0} value={draft.xp} onChange={(e) => setDraft({ ...draft, xp: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="edit-bar">
              <button className="btn-save" onClick={submit}>Valider</button>
              <button className="btn-cancel" onClick={() => setEdit(false)}>Annuler</button>
            </div>
          </>
        )}
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
