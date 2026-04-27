'use client';

import { useState } from 'react';
import type { Classe, Personnage, Race } from '@/lib/types';

const ALIGNS = ['LB', 'NB', 'CB', 'LN', 'N', 'CN', 'LM', 'NM', 'CM'];

export default function NiveauXp({
  perso,
  race,
  classe,
  onSave,
}: {
  perso: Personnage;
  race: Race;
  classe: Classe;
  onSave: (p: Personnage) => Promise<boolean>;
}) {
  const [edit, setEdit] = useState(false);
  const [niveau, setNiveau] = useState(perso.niveau || 1);
  const [xp, setXp] = useState(perso.xp_actuel || 0);
  const [xpNext, setXpNext] = useState(perso.xp_niveau_suivant || 1000);
  const [alignement, setAlignement] = useState(perso.alignement || 'N');
  const [divinite, setDivinite] = useState(perso.divinite || '');

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const ok = await onSave({
      ...perso,
      niveau: Math.max(1, niveau),
      xp_actuel: Math.max(0, xp),
      xp_niveau_suivant: Math.max(1, xpNext),
      alignement,
      divinite: divinite.trim() || '—',
    });
    if (ok) setEdit(false);
  }

  const canLevelUp =
    (perso.xp_actuel || 0) >= (perso.xp_niveau_suivant || 1000) && (perso.niveau || 1) < 20;

  const newNiveau = (perso.niveau || 1) + 1;
  const modCon = perso.carac?.CON?.mod ?? 0;
  const gainPv = (classe.pv_niv || 8) + modCon;
  const newPvMax = (perso.combats?.pv_max || 0) + gainPv;
  const newBba = (perso.combats?.bba || 0) + 1;
  const newSeuil = (perso.xp_niveau_suivant || 1000) + 1000 * newNiveau;

  async function applyLevelUp() {
    setBusy(true);
    const ok = await onSave({
      ...perso,
      niveau: newNiveau,
      xp_niveau_suivant: newSeuil,
      combats: {
        ...perso.combats,
        pv_max: newPvMax,
        pv_actuel: newPvMax,
        bba: newBba,
      },
    });
    setBusy(false);
    if (ok) setShowLevelUp(false);
  }

  return (
    <div className="fiche-header anim">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div className="fiche-nom">{perso.nom}</div>
          <div className="fiche-soustitre">
            {race.nom || perso.race_id} · {classe.nom || perso.classe_id} · Niveau {perso.niveau || 1} · {perso.edition || ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignSelf: 'flex-start', marginTop: '0.3rem' }}>
          {canLevelUp && !showLevelUp && (
            <button type="button" className="btn-levelup" onClick={() => setShowLevelUp(true)}>
              ⬆ Niveau {newNiveau}
            </button>
          )}
          <button type="button" className="btn-edit" onClick={() => setEdit((v) => !v)}>✎ Niveau &amp; XP</button>
        </div>
      </div>

      <div className="fiche-tags">
        <span className="tag tag-niv">Niv. {perso.niveau || 1}</span>
        <span className="tag tag-align">{perso.alignement || 'N'}</span>
        <span className="tag tag-div">⚑ {perso.divinite || '—'}</span>
        <span className="tag tag-race">{race.nom || perso.race_id}</span>
        <span className="tag tag-ed">{perso.edition || ''}</span>
        <span className="tag tag-align">XP {perso.xp_actuel || 0} / {perso.xp_niveau_suivant || 1000}</span>
      </div>

      {showLevelUp && (
        <div className="levelup-recap">
          <div className="levelup-recap-title">⬆ Passage au niveau {newNiveau}</div>
          <div className="levelup-recap-line"><span>Niveau</span><span className="levelup-recap-gain">{perso.niveau || 1} → {newNiveau}</span></div>
          <div className="levelup-recap-line"><span>PV max ({classe.pv_niv || 8} + {modCon} CON)</span><span className="levelup-recap-gain">+{gainPv} → {newPvMax}</span></div>
          <div className="levelup-recap-line"><span>BBA</span><span className="levelup-recap-gain">{perso.combats?.bba || 0} → {newBba}</span></div>
          <div className="levelup-recap-line"><span>Nouveau seuil XP</span><span className="levelup-recap-gain">{newSeuil}</span></div>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.8rem' }}>
            <button type="button" className="btn-save" onClick={applyLevelUp} disabled={busy}>
              {busy ? 'Application…' : 'Appliquer'}
            </button>
            <button type="button" className="btn-cancel" onClick={() => setShowLevelUp(false)} disabled={busy}>Annuler</button>
          </div>
          <div style={{ marginTop: '0.6rem', fontSize: '0.7rem', color: 'var(--textfaint)' }}>
            Note : les jets de sauvegarde ne sont pas modifiés automatiquement — édite manuellement via l&apos;onglet Combat si nécessaire.
          </div>
        </div>
      )}

      {edit && (
        <div style={{ marginTop: '0.8rem' }}>
          <div className="niveau-edit-row">
            <div className="niveau-edit-group">
              <label className="edit-label">Niveau</label>
              <input className="edit-input edit-input-xs" type="number" min={1} max={20} value={niveau} onChange={(e) => setNiveau(parseInt(e.target.value) || 1)} />
            </div>
            <div className="niveau-edit-group">
              <label className="edit-label">XP actuel</label>
              <input className="edit-input edit-input-sm" type="number" min={0} value={xp} onChange={(e) => setXp(parseInt(e.target.value) || 0)} />
            </div>
            <div className="niveau-edit-group">
              <label className="edit-label">XP prochain niv.</label>
              <input className="edit-input edit-input-sm" type="number" min={1} value={xpNext} onChange={(e) => setXpNext(parseInt(e.target.value) || 1)} />
            </div>
            <div className="niveau-edit-group">
              <label className="edit-label">Alignement</label>
              <select className="edit-input" style={{ width: 80 }} value={alignement} onChange={(e) => setAlignement(e.target.value)}>
                {ALIGNS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="niveau-edit-group">
              <label className="edit-label">Divinité</label>
              <input className="edit-input" style={{ width: 120 }} value={divinite} onChange={(e) => setDivinite(e.target.value)} />
            </div>
          </div>
          <div className="edit-bar">
            <button className="btn-save" onClick={submit}>Valider</button>
            <button className="btn-cancel" onClick={() => setEdit(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
