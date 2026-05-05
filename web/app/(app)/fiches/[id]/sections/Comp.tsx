'use client';

import { ms } from '@/lib/pathfinder';
import type { Classe, Competence, Personnage } from '@/lib/types';
import { RollBtn } from '@/components/DiceRoller';

function total(c: Omit<Competence, 'total'>): number {
  return (c.rang || 0) + (c.mod_carac || 0) + (c.classe ? 3 : 0) + (c.autre || 0);
}

export default function Comp({
  perso,
  classe,
  onChange,
}: {
  perso: Personnage;
  classe: Classe;
  onChange: (p: Personnage) => void;
}) {
  const comps: Competence[] = perso.competences || [];
  const dons: string[] = perso.dons || [];

  function updateComp(i: number, patch: Partial<Competence>) {
    const next = comps.map((row, idx) => {
      if (idx !== i) return row;
      const merged = { ...row, ...patch };
      return { ...merged, total: total(merged) };
    });
    onChange({ ...perso, competences: next });
  }

  function addComp() {
    const empty: Competence = { nom: '', rang: 0, mod_carac: 0, classe: false, autre: 0, total: 0 };
    onChange({ ...perso, competences: [...comps, empty] });
  }

  function delComp(i: number) {
    onChange({ ...perso, competences: comps.filter((_, idx) => idx !== i) });
  }

  function updateDon(i: number, value: string) {
    onChange({ ...perso, dons: dons.map((d, idx) => (idx === i ? value : d)) });
  }

  function addDon() {
    onChange({ ...perso, dons: [...dons, ''] });
  }

  function delDon(i: number) {
    onChange({ ...perso, dons: dons.filter((_, idx) => idx !== i) });
  }

  const totalRangs = comps.reduce((s, c) => s + (c.rang || 0), 0);

  return (
    <>
      <div className="panel-block">
        <div className="panel-header panel-title-wrap">
          <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
            Compétences · {totalRangs} rangs
          </span>
        </div>

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
            {comps.length === 0 ? (
              <tr><td colSpan={7} style={{ color: 'var(--textdim)', fontSize: '0.8rem', padding: '0.5rem' }}>Aucune compétence. Ajoutez-en avec le bouton ci-dessous.</td></tr>
            ) : (
              comps.map((c, i) => (
                <tr key={i}>
                  <td>
                    <input
                      type="text"
                      value={c.nom}
                      placeholder="Nom..."
                      onChange={(e) => updateComp(i, { nom: e.target.value })}
                    />
                  </td>
                  <td className="comp-td-total">
                    <RollBtn label={c.nom || 'Compétence'} modifier={c.total || 0}>{ms(c.total || 0)}</RollBtn>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={c.rang}
                      min={0}
                      onChange={(e) => updateComp(i, { rang: parseInt(e.target.value) || 0 })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={c.mod_carac}
                      onChange={(e) => updateComp(i, { mod_carac: parseInt(e.target.value) || 0 })}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={c.classe}
                      onChange={(e) => updateComp(i, { classe: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={c.autre}
                      onChange={(e) => updateComp(i, { autre: parseInt(e.target.value) || 0 })}
                    />
                  </td>
                  <td><button className="btn-del" onClick={() => delComp(i)}>x</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="edit-bar" style={{ marginTop: '0.6rem' }}>
          <button className="btn-add" onClick={addComp}>+ Compétence</button>
        </div>
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
        </div>

        {dons.length === 0 ? (
          <div style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>Aucun don.</div>
        ) : (
          dons.map((d, i) => (
            <div key={i} className="edit-row">
              <input
                className="edit-input"
                style={{ flex: 1 }}
                placeholder="Nom du don"
                value={d}
                onChange={(e) => updateDon(i, e.target.value)}
              />
              <button className="btn-del" onClick={() => delDon(i)}>x</button>
            </div>
          ))
        )}
        <div className="edit-bar" style={{ marginTop: '0.6rem' }}>
          <button className="btn-add" onClick={addDon}>+ Don</button>
        </div>
      </div>
    </>
  );
}
