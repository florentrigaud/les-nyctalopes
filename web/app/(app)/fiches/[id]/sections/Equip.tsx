'use client';

import { useState } from 'react';
import type { Arme, InventaireItem, Personnage, Richesses } from '@/lib/types';
import { RollBtn, useDice } from '@/components/DiceRoller';
import { parseDiceSpec } from '@/lib/dice';

export default function Equip({
  perso,
  onSave,
}: {
  perso: Personnage;
  onSave: (p: Personnage) => Promise<boolean>;
}) {
  const { roll } = useDice();
  const [editArmes, setEditArmes] = useState(false);
  const [editInv, setEditInv] = useState(false);
  const [editRich, setEditRich] = useState(false);

  const [armes, setArmes] = useState<Arme[]>(() => [...(perso.armes || [])]);
  const [inv, setInv] = useState<InventaireItem[]>(() => [...(perso.inventaire || [])]);
  const [rich, setRich] = useState<Richesses>(() => ({
    pp: perso.richesses?.pp || 0,
    po: perso.richesses?.po || 0,
    pa: perso.richesses?.pa || 0,
    pc: perso.richesses?.pc || 0,
  }));

  async function submitArmes() {
    const cleaned = armes.map((a) => ({ ...a, nom: a.nom.trim() })).filter((a) => a.nom);
    const ok = await onSave({ ...perso, armes: cleaned });
    if (ok) { setArmes(cleaned); setEditArmes(false); }
  }
  async function submitInv() {
    const cleaned = inv.map((i) => ({ ...i, nom: i.nom.trim() })).filter((i) => i.nom);
    const charge = cleaned.reduce((s, i) => s + (i.poids || 0), 0);
    const ok = await onSave({ ...perso, inventaire: cleaned, charge_actuelle: charge });
    if (ok) { setInv(cleaned); setEditInv(false); }
  }
  async function submitRich() {
    const ok = await onSave({ ...perso, richesses: rich });
    if (ok) setEditRich(false);
  }

  return (
    <>
      <div className="panel-block">
        <div className="panel-header panel-title-wrap">
          <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>Armes</span>
          <button className="btn-edit" onClick={() => setEditArmes((v) => !v)}>✎ Modifier</button>
        </div>

        {!editArmes ? (
          (perso.armes || []).length === 0 ? (
            <div style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>Aucune arme.</div>
          ) : (
            perso.armes.map((a, i) => {
              const toucherMod = typeof a.toucher === 'number'
                ? a.toucher
                : parseInt(String(a.toucher ?? '0').replace(/[^\d-]/g, ''), 10) || 0;
              const degatsSpec = parseDiceSpec(String(a.degats || '1d4'), `Dégâts — ${a.nom}`);
              return (
                <div key={i} className="arme-row">
                  <div className="arme-nom">⚔ {a.nom} <span style={{ fontFamily: 'var(--ffm)', fontSize: '0.6rem', color: 'var(--textdim)', marginLeft: '0.5rem' }}>{a.type || ''}</span></div>
                  <div className="arme-stat">
                    <div className="arme-stat-l">Toucher</div>
                    <div className="arme-stat-v">
                      <RollBtn label={`Attaque — ${a.nom}`} modifier={toucherMod}>{a.toucher ?? 0}</RollBtn>
                    </div>
                  </div>
                  <div className="arme-stat">
                    <div className="arme-stat-l">Dégâts</div>
                    <div className="arme-stat-v">
                      {degatsSpec ? (
                        <button type="button" className="roll-btn" onClick={() => roll(degatsSpec)}>{a.degats || '1d4'}</button>
                      ) : (
                        <span>{a.degats || '1d4'}</span>
                      )}
                    </div>
                  </div>
                  <div className="arme-stat"><div className="arme-stat-l">Critique</div><div className="arme-stat-v">{a.crit || 'x2'}</div></div>
                </div>
              );
            })
          )
        ) : (
          <>
            {armes.map((a, i) => (
              <div key={i} className="edit-row">
                <input className="edit-input" style={{ flex: 2, minWidth: 110 }} placeholder="Nom" value={a.nom} onChange={(e) => setArmes((arr) => arr.map((x, idx) => (idx === i ? { ...x, nom: e.target.value } : x)))} />
                <div><label className="edit-label">Type</label><input className="edit-input edit-input-sm" placeholder="Corps-à-corps" value={a.type || ''} onChange={(e) => setArmes((arr) => arr.map((x, idx) => (idx === i ? { ...x, type: e.target.value } : x)))} /></div>
                <div><label className="edit-label">Toucher</label><input className="edit-input edit-input-xs" value={String(a.toucher ?? '0')} onChange={(e) => setArmes((arr) => arr.map((x, idx) => (idx === i ? { ...x, toucher: e.target.value } : x)))} /></div>
                <div><label className="edit-label">Dégâts</label><input className="edit-input edit-input-sm" value={a.degats || ''} onChange={(e) => setArmes((arr) => arr.map((x, idx) => (idx === i ? { ...x, degats: e.target.value } : x)))} /></div>
                <div><label className="edit-label">Crit</label><input className="edit-input edit-input-xs" value={a.crit || ''} onChange={(e) => setArmes((arr) => arr.map((x, idx) => (idx === i ? { ...x, crit: e.target.value } : x)))} /></div>
                <button className="btn-del" onClick={() => setArmes((arr) => arr.filter((_, idx) => idx !== i))}>x</button>
              </div>
            ))}
            <div className="edit-bar" style={{ marginTop: '0.6rem' }}>
              <button className="btn-add" onClick={() => setArmes((arr) => [...arr, { nom: '', type: '', toucher: '+0', degats: '1d6', crit: 'x2' }])}>+ Ajouter arme</button>
              <button className="btn-save" onClick={submitArmes}>Valider</button>
              <button className="btn-cancel" onClick={() => setEditArmes(false)}>Annuler</button>
            </div>
          </>
        )}
      </div>

      <div className="two-col">
        <div className="panel-block">
          <div className="panel-header panel-title-wrap">
            <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
              Inventaire · {perso.charge_actuelle || 0}/{perso.charge_max || 0} kg
            </span>
            <button className="btn-edit" onClick={() => setEditInv((v) => !v)}>✎ Modifier</button>
          </div>

          {!editInv ? (
            (perso.inventaire || []).length === 0 ? (
              <div style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>Inventaire vide.</div>
            ) : (
              perso.inventaire.map((it, i) => (
                <div key={i} className="inv-row"><span>{it.nom}</span><span className="inv-poids">{it.poids} kg</span></div>
              ))
            )
          ) : (
            <>
              {inv.map((it, i) => (
                <div key={i} className="edit-row">
                  <input className="edit-input" style={{ flex: 2 }} placeholder="Nom de l'item" value={it.nom} onChange={(e) => setInv((arr) => arr.map((x, idx) => (idx === i ? { ...x, nom: e.target.value } : x)))} />
                  <div>
                    <label className="edit-label">Poids (kg)</label>
                    <input className="edit-input edit-input-xs" type="number" min={0} step={0.1} value={it.poids} onChange={(e) => setInv((arr) => arr.map((x, idx) => (idx === i ? { ...x, poids: parseFloat(e.target.value) || 0 } : x)))} />
                  </div>
                  <button className="btn-del" onClick={() => setInv((arr) => arr.filter((_, idx) => idx !== i))}>x</button>
                </div>
              ))}
              <div className="edit-bar" style={{ marginTop: '0.5rem' }}>
                <button className="btn-add" onClick={() => setInv((arr) => [...arr, { nom: '', poids: 0 }])}>+ Ajouter item</button>
                <button className="btn-save" onClick={submitInv}>Valider</button>
                <button className="btn-cancel" onClick={() => setEditInv(false)}>Annuler</button>
              </div>
            </>
          )}
        </div>

        <div className="panel-block">
          <div className="panel-header panel-title-wrap">
            <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>Richesses</span>
            <button className="btn-edit" onClick={() => setEditRich((v) => !v)}>✎ Modifier</button>
          </div>

          {!editRich ? (
            <div className="richesses-grid">
              <div className="rbox rbox-pp"><div className="rbox-label">Platine</div><div className="rbox-val">{perso.richesses?.pp || 0}</div></div>
              <div className="rbox rbox-po"><div className="rbox-label">Or</div><div className="rbox-val">{perso.richesses?.po || 0}</div></div>
              <div className="rbox rbox-pa"><div className="rbox-label">Argent</div><div className="rbox-val">{perso.richesses?.pa || 0}</div></div>
              <div className="rbox rbox-pc"><div className="rbox-label">Cuivre</div><div className="rbox-val">{perso.richesses?.pc || 0}</div></div>
            </div>
          ) : (
            <>
              <div className="richesse-edit-grid">
                {(['pp', 'po', 'pa', 'pc'] as const).map((k) => (
                  <div key={k} className="richesse-edit-cell">
                    <label className="edit-label">{k === 'pp' ? 'Platine' : k === 'po' ? 'Or' : k === 'pa' ? 'Argent' : 'Cuivre'}</label>
                    <input className="edit-input" type="number" min={0} value={rich[k]} onChange={(e) => setRich({ ...rich, [k]: parseInt(e.target.value) || 0 })} />
                  </div>
                ))}
              </div>
              <div className="edit-bar" style={{ marginTop: '0.6rem' }}>
                <button className="btn-save" onClick={submitRich}>Valider</button>
                <button className="btn-cancel" onClick={() => setEditRich(false)}>Annuler</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
