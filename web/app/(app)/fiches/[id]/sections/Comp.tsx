'use client';

import { useState } from 'react';
import { ms } from '@/lib/pathfinder';
import type { Classe, Competence, Personnage } from '@/lib/types';
import { RollBtn } from '@/components/DiceRoller';

type DraftComp = Omit<Competence, 'total'>;

function total(c: DraftComp): number {
  return (c.rang || 0) + (c.mod_carac || 0) + (c.classe ? 3 : 0) + (c.autre || 0);
}

export default function Comp({
  perso,
  classe,
  onSave,
}: {
  perso: Personnage;
  classe: Classe;
  onSave: (p: Personnage) => Promise<boolean>;
}) {
  const [editComp, setEditComp] = useState(false);
  const [editDons, setEditDons] = useState(false);
  const [draft, setDraft] = useState<DraftComp[]>(
    () => (perso.competences || []).map(({ nom, rang, mod_carac, classe, autre }) => ({ nom, rang, mod_carac, classe, autre }))
  );
  const [dons, setDons] = useState<string[]>(() => [...(perso.dons || [])]);

  function updateRow(i: number, patch: Partial<DraftComp>) {
    setDraft((d) => d.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setDraft((d) => [...d, { nom: '', rang: 0, mod_carac: 0, classe: false, autre: 0 }]);
  }
  function delRow(i: number) {
    setDraft((d) => d.filter((_, idx) => idx !== i));
  }

  async function submitComp() {
    const comps: Competence[] = draft
      .filter((c) => c.nom.trim())
      .map((c) => ({ ...c, nom: c.nom.trim(), total: total(c) }));
    const ok = await onSave({ ...perso, competences: comps });
    if (ok) {
      setDraft(comps.map(({ nom, rang, mod_carac, classe, autre }) => ({ nom, rang, mod_carac, classe, autre })));
      setEditComp(false);
    }
  }

  async function submitDons() {
    const cleaned = dons.map((d) => d.trim()).filter(Boolean);
    const ok = await onSave({ ...perso, dons: cleaned });
    if (ok) {
      setDons(cleaned);
      setEditDons(false);
    }
  }

  const totalRangs = (perso.competences || []).reduce((s, c) => s + (c.rang || 0), 0);

  return (
    <>
      <div className="panel-block">
        <div className="panel-header panel-title-wrap">
          <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
            Compétences · {totalRangs} rangs
          </span>
          <button className="btn-edit" onClick={() => setEditComp((v) => !v)}>✎ Modifier</button>
        </div>

        {!editComp ? (
          <table className="comp-table">
            <thead>
              <tr><th>Compétence</th><th>Total</th><th>Rang</th><th>Mod.Carac</th><th>Classe</th><th>Autre</th></tr>
            </thead>
            <tbody>
              {(perso.competences || []).length === 0 ? (
                <tr><td colSpan={6} style={{ color: 'var(--textdim)', fontSize: '0.8rem', padding: '0.5rem' }}>Aucune compétence. Cliquez Modifier pour en ajouter.</td></tr>
              ) : (
                perso.competences.map((c, i) => (
                  <tr key={i}>
                    <td>{c.nom}</td>
                    <td className="td-total">
                      <RollBtn label={c.nom || 'Compétence'} modifier={c.total || 0}>{ms(c.total || 0)}</RollBtn>
                    </td>
                    <td>{c.rang || 0}</td>
                    <td>{ms(c.mod_carac || 0)}</td>
                    <td>{c.classe ? <span className="td-classe">+3</span> : ''}</td>
                    <td>{c.autre || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <>
            <table className="comp-edit-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 140 }}>Nom</th>
                  <th>Total</th>
                  <th>Rang</th>
                  <th>Mod.Carac</th>
                  <th>Classe +3</th>
                  <th>Autre</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {draft.map((c, i) => (
                  <tr key={i}>
                    <td><input type="text" value={c.nom} onChange={(e) => updateRow(i, { nom: e.target.value })} placeholder="Nom..." /></td>
                    <td className="comp-td-total">{ms(total(c))}</td>
                    <td><input type="number" value={c.rang} min={0} onChange={(e) => updateRow(i, { rang: parseInt(e.target.value) || 0 })} /></td>
                    <td><input type="number" value={c.mod_carac} onChange={(e) => updateRow(i, { mod_carac: parseInt(e.target.value) || 0 })} /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" checked={c.classe} onChange={(e) => updateRow(i, { classe: e.target.checked })} /></td>
                    <td><input type="number" value={c.autre} onChange={(e) => updateRow(i, { autre: parseInt(e.target.value) || 0 })} /></td>
                    <td><button className="btn-del" onClick={() => delRow(i)}>x</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="edit-bar" style={{ marginTop: '0.6rem' }}>
              <button className="btn-add" onClick={addRow}>+ Compétence</button>
              <button className="btn-save" onClick={submitComp}>Valider</button>
              <button className="btn-cancel" onClick={() => setEditComp(false)}>Annuler</button>
            </div>
          </>
        )}
      </div>

      {(classe.competences || []).length > 0 && (
        <div className="panel-block">
          <div className="panel-title">Compétences de classe — {classe.nom}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
            {classe.competences.map((c, i) => (
              <span key={i} className="tag tag-align" style={{ fontFamily: 'var(--ffs)', textTransform: 'none', fontSize: '0.82rem' }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      <div className="panel-block">
        <div className="panel-header panel-title-wrap">
          <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>Dons</span>
          <button className="btn-edit" onClick={() => setEditDons((v) => !v)}>✎ Modifier</button>
        </div>

        {!editDons ? (
          (perso.dons || []).length === 0 ? (
            <div style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>Aucun don.</div>
          ) : (
            perso.dons.map((d, i) => (
              <div key={i} className="don-item"><span className="don-icon">◆</span><span>{d}</span></div>
            ))
          )
        ) : (
          <>
            {dons.map((d, i) => (
              <div key={i} className="edit-row">
                <input
                  className="edit-input"
                  style={{ flex: 1 }}
                  placeholder="Nom du don"
                  value={d}
                  onChange={(e) => setDons((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))}
                />
                <button className="btn-del" onClick={() => setDons((arr) => arr.filter((_, idx) => idx !== i))}>x</button>
              </div>
            ))}
            <div className="edit-bar" style={{ marginTop: '0.6rem' }}>
              <button className="btn-add" onClick={() => setDons((arr) => [...arr, ''])}>+ Don</button>
              <button className="btn-save" onClick={submitDons}>Valider</button>
              <button className="btn-cancel" onClick={() => setEditDons(false)}>Annuler</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
