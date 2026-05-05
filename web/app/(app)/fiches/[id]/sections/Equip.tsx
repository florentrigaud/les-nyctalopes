'use client';

import type { Arme, InventaireItem, Personnage, Richesses } from '@/lib/types';
import { RollBtn, useDice } from '@/components/DiceRoller';
import { parseDiceSpec } from '@/lib/dice';

const EMPTY_RICH: Richesses = { pp: 0, po: 0, pa: 0, pc: 0 };

export default function Equip({
  perso,
  onChange,
}: {
  perso: Personnage;
  onChange: (p: Personnage) => void;
}) {
  const { roll } = useDice();
  const armes: Arme[] = perso.armes || [];
  const inv: InventaireItem[] = perso.inventaire || [];
  const rich: Richesses = perso.richesses || EMPTY_RICH;

  function updateArme(i: number, patch: Partial<Arme>) {
    const next = armes.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
    onChange({ ...perso, armes: next });
  }
  function addArme() {
    const empty: Arme = { nom: '', type: '', toucher: '+0', degats: '1d6', crit: 'x2' };
    onChange({ ...perso, armes: [...armes, empty] });
  }
  function delArme(i: number) {
    onChange({ ...perso, armes: armes.filter((_, idx) => idx !== i) });
  }

  function updateInv(i: number, patch: Partial<InventaireItem>) {
    const next = inv.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    const charge = next.reduce((s, it) => s + (it.poids || 0), 0);
    onChange({ ...perso, inventaire: next, charge_actuelle: charge });
  }
  function addInv() {
    const empty: InventaireItem = { nom: '', poids: 0 };
    onChange({ ...perso, inventaire: [...inv, empty] });
  }
  function delInv(i: number) {
    const next = inv.filter((_, idx) => idx !== i);
    const charge = next.reduce((s, it) => s + (it.poids || 0), 0);
    onChange({ ...perso, inventaire: next, charge_actuelle: charge });
  }

  function setRich(k: keyof Richesses, raw: number) {
    onChange({ ...perso, richesses: { ...rich, [k]: Math.max(0, raw || 0) } });
  }

  return (
    <>
      <div className="panel-block">
        <div className="panel-header panel-title-wrap">
          <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>Armes</span>
        </div>

        {armes.length === 0 && (
          <div style={{ color: 'var(--textdim)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Aucune arme.</div>
        )}

        {armes.map((a, i) => {
          const toucherMod = typeof a.toucher === 'number'
            ? a.toucher
            : parseInt(String(a.toucher ?? '0').replace(/[^\d-]/g, ''), 10) || 0;
          const degatsSpec = parseDiceSpec(String(a.degats || '1d4'), `Dégâts — ${a.nom || 'arme'}`);
          return (
            <div key={i} className="edit-row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
              <input
                className="edit-input"
                style={{ flex: 2, minWidth: 110 }}
                placeholder="Nom"
                value={a.nom}
                onChange={(e) => updateArme(i, { nom: e.target.value })}
              />
              <div>
                <label className="edit-label">Type</label>
                <input
                  className="edit-input edit-input-sm"
                  placeholder="Corps-à-corps"
                  value={a.type || ''}
                  onChange={(e) => updateArme(i, { type: e.target.value })}
                />
              </div>
              <div>
                <label className="edit-label">Toucher</label>
                <input
                  className="edit-input edit-input-xs"
                  value={String(a.toucher ?? '0')}
                  onChange={(e) => updateArme(i, { toucher: e.target.value })}
                />
                {a.nom && (
                  <span style={{ marginLeft: '0.3rem' }}>
                    <RollBtn label={`Attaque — ${a.nom}`} modifier={toucherMod}>{a.toucher ?? 0}</RollBtn>
                  </span>
                )}
              </div>
              <div>
                <label className="edit-label">Dégâts</label>
                <input
                  className="edit-input edit-input-sm"
                  value={a.degats || ''}
                  onChange={(e) => updateArme(i, { degats: e.target.value })}
                />
                {a.nom && degatsSpec && (
                  <button type="button" className="roll-btn" onClick={() => roll(degatsSpec)} style={{ marginLeft: '0.3rem' }}>
                    🎲
                  </button>
                )}
              </div>
              <div>
                <label className="edit-label">Crit</label>
                <input
                  className="edit-input edit-input-xs"
                  value={a.crit || ''}
                  onChange={(e) => updateArme(i, { crit: e.target.value })}
                />
              </div>
              <button className="btn-del" onClick={() => delArme(i)}>x</button>
            </div>
          );
        })}

        <div className="edit-bar" style={{ marginTop: '0.6rem' }}>
          <button className="btn-add" onClick={addArme}>+ Ajouter arme</button>
        </div>
      </div>

      <div className="two-col">
        <div className="panel-block">
          <div className="panel-header panel-title-wrap">
            <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
              Inventaire · {perso.charge_actuelle || 0}/{perso.charge_max || 0} kg
            </span>
          </div>

          {inv.length === 0 && (
            <div style={{ color: 'var(--textdim)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Inventaire vide.</div>
          )}

          {inv.map((it, i) => (
            <div key={i} className="edit-row">
              <input
                className="edit-input"
                style={{ flex: 2 }}
                placeholder="Nom de l'item"
                value={it.nom}
                onChange={(e) => updateInv(i, { nom: e.target.value })}
              />
              <div>
                <label className="edit-label">Poids (kg)</label>
                <input
                  className="edit-input edit-input-xs"
                  type="number"
                  min={0}
                  step={0.1}
                  value={it.poids}
                  onChange={(e) => updateInv(i, { poids: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <button className="btn-del" onClick={() => delInv(i)}>x</button>
            </div>
          ))}

          <div className="edit-bar" style={{ marginTop: '0.5rem' }}>
            <button className="btn-add" onClick={addInv}>+ Ajouter item</button>
          </div>
        </div>

        <div className="panel-block">
          <div className="panel-header panel-title-wrap">
            <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>Richesses</span>
          </div>

          <div className="richesse-edit-grid">
            {(['pp', 'po', 'pa', 'pc'] as const).map((k) => (
              <div key={k} className="richesse-edit-cell">
                <label className="edit-label">{k === 'pp' ? 'Platine' : k === 'po' ? 'Or' : k === 'pa' ? 'Argent' : 'Cuivre'}</label>
                <input
                  className="edit-input"
                  type="number"
                  min={0}
                  value={rich[k]}
                  onChange={(e) => setRich(k, parseInt(e.target.value) || 0)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
