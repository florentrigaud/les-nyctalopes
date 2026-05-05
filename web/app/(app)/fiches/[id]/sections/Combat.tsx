'use client';

import { ms } from '@/lib/pathfinder';
import type { Classe, Combats, Personnage, Race } from '@/lib/types';
import { RollBtn } from '@/components/DiceRoller';

const EMPTY_SAVES = { vigueur: 0, reflexes: 0, volonte: 0 };

const NUMERIC_FIELDS = [
  ['pv_actuel', 'PV actuel', true] as const,
  ['pv_max', 'PV max', true] as const,
  ['ca', 'CA', false] as const,
  ['ca_contact', 'CA contact', false] as const,
  ['ca_surprise', 'CA surpris', false] as const,
  ['bba', 'BBA', false] as const,
  ['bmo', 'BMO', false] as const,
  ['initiative', 'Initiative', false] as const,
];

type NumericField = (typeof NUMERIC_FIELDS)[number][0];

export default function Combat({
  perso,
  race,
  classe,
  onChange,
}: {
  perso: Personnage;
  race: Race;
  classe: Classe;
  onChange: (p: Personnage) => void;
}) {
  const c = perso.combats || ({ saves: EMPTY_SAVES } as Combats);
  const saves = classe.jets_forts || [];

  function setField(key: NumericField, raw: number, clampZero: boolean) {
    const v = clampZero ? Math.max(0, raw || 0) : raw || 0;
    onChange({
      ...perso,
      combats: { ...c, [key]: v },
    });
  }

  function setSave(key: keyof Combats['saves'], raw: number) {
    onChange({
      ...perso,
      combats: {
        ...c,
        saves: { ...(c.saves || EMPTY_SAVES), [key]: raw || 0 },
      },
    });
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
        </div>

        <div className="pv-edit-row">
          {NUMERIC_FIELDS.map(([k, label, clamp]) => (
            <div key={k} className="pv-edit-group">
              <label className="edit-label">{label}</label>
              <input
                className="edit-input edit-input-sm"
                type="number"
                value={(c[k] as number) ?? 0}
                onChange={(e) => setField(k, parseInt(e.target.value) || 0, clamp)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="panel-block">
        <div className="panel-title">Jets de Sauvegarde</div>
        <div className="saves-grid">
          {([
            ['vigueur', 'Vigueur'],
            ['reflexes', 'Réflexes'],
            ['volonte', 'Volonté'],
          ] as const).map(([k, label]) => (
            <div key={k} className="sbox">
              <div className="sbox-label">{label}</div>
              <div className="sbox-val">
                <RollBtn label={label} modifier={c.saves?.[k] || 0}>{ms(c.saves?.[k] || 0)}</RollBtn>
              </div>
              <input
                className="edit-input edit-input-sm"
                type="number"
                value={c.saves?.[k] || 0}
                onChange={(e) => setSave(k, parseInt(e.target.value) || 0)}
                style={{ marginTop: '0.3rem' }}
              />
              <div className={`sbox-type ${isFort(label) ? 'fort' : 'faible'}`}>{isFort(label) ? 'FORT' : 'FAIBLE'}</div>
            </div>
          ))}
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
