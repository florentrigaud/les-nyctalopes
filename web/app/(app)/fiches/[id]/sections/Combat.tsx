'use client';

import { useState } from 'react';
import { ms } from '@/lib/pathfinder';
import type { Classe, Personnage, Race } from '@/lib/types';
import { RollBtn } from '@/components/DiceRoller';

export default function Combat({
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
  const c = perso.combats || ({} as Personnage['combats']);
  const saves = classe.jets_forts || [];
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState({
    pv_actuel: c.pv_actuel ?? c.pv_max ?? 0,
    pv_max: c.pv_max ?? 0,
    ca: c.ca ?? 10,
    ca_contact: c.ca_contact ?? 10,
    ca_surprise: c.ca_surprise ?? 10,
    bba: c.bba ?? 1,
    bmo: c.bmo ?? 1,
    initiative: c.initiative ?? 0,
    vig: c.saves?.vigueur ?? 0,
    ref: c.saves?.reflexes ?? 0,
    vol: c.saves?.volonte ?? 0,
  });

  function bind<K extends keyof typeof draft>(key: K) {
    return {
      value: draft[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setDraft({ ...draft, [key]: parseInt(e.target.value) || 0 }),
    };
  }

  async function submit() {
    const ok = await onSave({
      ...perso,
      combats: {
        ...perso.combats,
        pv_actuel: Math.max(0, draft.pv_actuel),
        pv_max: Math.max(0, draft.pv_max),
        ca: draft.ca,
        ca_contact: draft.ca_contact,
        ca_surprise: draft.ca_surprise,
        bba: draft.bba,
        bmo: draft.bmo,
        initiative: draft.initiative,
        saves: { vigueur: draft.vig, reflexes: draft.ref, volonte: draft.vol },
      },
    });
    if (ok) setEdit(false);
  }

  const isFort = (name: string) =>
    saves.some((s) => s.localeCompare(name, 'fr', { sensitivity: 'base' }) === 0);

  return (
    <>
      <div className="panel-block">
        <div className="panel-title-wrap panel-header">
          <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
            Points de Vie &amp; Combat
          </span>
          <button className="btn-edit" onClick={() => setEdit((v) => !v)}>✎ Modifier</button>
        </div>

        {!edit ? (
          <div className="combat-grid" style={{ marginBottom: 0 }}>
            <div className="cbox">
              <div className="cbox-label">PV actuel</div>
              <div className="cbox-val">{c.pv_actuel ?? c.pv_max ?? 0}</div>
              <div className="cbox-sub">/ {c.pv_max || 0} max</div>
            </div>
            <div className="cbox">
              <div className="cbox-label">CA totale</div>
              <div className="cbox-val">{c.ca || 10}</div>
              <div className="cbox-sub">contact {c.ca_contact || 10} · surpris {c.ca_surprise || 10}</div>
            </div>
            <div className="cbox">
              <div className="cbox-label">BBA</div>
              <div className="cbox-val">
                <RollBtn label={`Attaque (BBA ${ms(c.bba || 1)})`} modifier={c.bba || 1}>{ms(c.bba || 1)}</RollBtn>
              </div>
              <div className="cbox-sub">BMO {ms(c.bmo || 1)}</div>
            </div>
            <div className="cbox">
              <div className="cbox-label">Initiative</div>
              <div className="cbox-val">
                <RollBtn label="Initiative" modifier={c.initiative || 0}>{ms(c.initiative || 0)}</RollBtn>
              </div>
              <div className="cbox-sub">DEX {perso.carac?.DEX ? ms(perso.carac.DEX.mod) : '0'}</div>
            </div>
          </div>
        ) : (
          <>
            <div className="pv-edit-row">
              {([
                ['pv_actuel', 'PV actuel'],
                ['pv_max', 'PV max'],
                ['ca', 'CA'],
                ['ca_contact', 'CA contact'],
                ['ca_surprise', 'CA surpris'],
                ['bba', 'BBA'],
                ['bmo', 'BMO'],
                ['initiative', 'Initiative'],
                ['vig', 'Vigueur'],
                ['ref', 'Réflexes'],
                ['vol', 'Volonté'],
              ] as const).map(([k, label]) => (
                <div key={k} className="pv-edit-group">
                  <label className="edit-label">{label}</label>
                  <input className="edit-input edit-input-sm" type="number" {...bind(k)} />
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

      <div className="panel-block">
        <div className="panel-title">Jets de Sauvegarde</div>
        <div className="saves-grid">
          <div className="sbox">
            <div className="sbox-label">Vigueur</div>
            <div className="sbox-val"><RollBtn label="Vigueur" modifier={c.saves?.vigueur || 0}>{ms(c.saves?.vigueur || 0)}</RollBtn></div>
            <div className={`sbox-type ${isFort('Vigueur') ? 'fort' : 'faible'}`}>{isFort('Vigueur') ? 'FORT' : 'FAIBLE'}</div>
          </div>
          <div className="sbox">
            <div className="sbox-label">Réflexes</div>
            <div className="sbox-val"><RollBtn label="Réflexes" modifier={c.saves?.reflexes || 0}>{ms(c.saves?.reflexes || 0)}</RollBtn></div>
            <div className={`sbox-type ${isFort('Réflexes') ? 'fort' : 'faible'}`}>{isFort('Réflexes') ? 'FORT' : 'FAIBLE'}</div>
          </div>
          <div className="sbox">
            <div className="sbox-label">Volonté</div>
            <div className="sbox-val"><RollBtn label="Volonté" modifier={c.saves?.volonte || 0}>{ms(c.saves?.volonte || 0)}</RollBtn></div>
            <div className={`sbox-type ${isFort('Volonté') ? 'fort' : 'faible'}`}>{isFort('Volonté') ? 'FORT' : 'FAIBLE'}</div>
          </div>
        </div>
      </div>

      {(race.bonus_raciaux || []).length > 0 && (
        <div className="panel-block">
          <div className="panel-title">Bonus Raciaux — {race.nom}</div>
          {(race.bonus_raciaux || []).map((b, i) => (
            <div key={i} className="bonus-row"><span>{b.label}</span><span className="bonus-val">{b.val}</span></div>
          ))}
        </div>
      )}
    </>
  );
}
