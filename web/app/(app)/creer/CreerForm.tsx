'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { mod, ms } from '@/lib/pathfinder';
import type { CaracKey, Classe, PersoData, Race } from '@/lib/types';

type Props = { races: Record<string, Race>; classes: Record<string, Classe> };

const STATS: CaracKey[] = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];
const ALIGNS = ['LB', 'NB', 'CB', 'LN', 'N', 'CN', 'LM', 'NM', 'CM'];

export default function CreerForm({ races, classes }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [nom, setNom] = useState('');
  const [joueur, setJoueur] = useState('');
  const [edition, setEdition] = useState('PF1');
  const [raceId, setRaceId] = useState('');
  const [classeId, setClasseId] = useState('');
  const [alignement, setAlignement] = useState('CN');
  const [divinite, setDivinite] = useState('');
  const [bg, setBg] = useState('');
  const [stats, setStats] = useState<Record<CaracKey, number>>({
    FOR: 15, DEX: 12, CON: 14, INT: 10, SAG: 12, CHA: 8,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const raceOptions = useMemo(
    () => Object.values(races).filter(r => !r.edition || r.edition === edition),
    [races, edition]
  );
  const classeOptions = useMemo(
    () => Object.values(classes).filter(c => !c.edition || c.edition === edition),
    [classes, edition]
  );

  const race = raceId ? races[raceId] : undefined;
  const classe = classeId ? classes[classeId] : undefined;

  const calc = useMemo(() => {
    if (!race || !classe) return null;
    const rm = race.modifs || {};
    const final: Record<CaracKey, number> = { ...stats };
    for (const s of STATS) final[s] = stats[s] + (rm[s] || 0);
    const conMod = mod(final.CON);
    const dexMod = mod(final.DEX);
    const sagMod = mod(final.SAG);
    const intMod = mod(final.INT);
    const pv = classe.pv_niv + conMod;
    const pts = (classe.pts_comp || 2) + intMod;
    return { final, conMod, dexMod, sagMod, intMod, pv, pts };
  }, [race, classe, stats]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!nom.trim()) { setErr('Entrez un nom de personnage.'); return; }
    if (!race || !classe) { setErr('Sélectionnez une race et une classe.'); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr('Session expirée.'); return; }

    const rm = race.modifs || {};
    const carac: PersoData['carac'] = {} as PersoData['carac'];
    for (const s of STATS) {
      const base = stats[s] + (rm[s] || 0);
      carac[s] = { base, mod: mod(base) };
    }
    const conMod = carac.CON.mod;
    const dexMod = carac.DEX.mod;
    const sagMod = carac.SAG.mod;
    const pvMax = classe.pv_niv + conMod;

    const data: PersoData = {
      edition,
      joueur: joueur.trim(),
      date_creation: new Date().toISOString().slice(0, 10),
      niveau: 1,
      xp_actuel: 0,
      xp_niveau_suivant: 1000,
      alignement,
      divinite: divinite || '—',
      background: bg || 'Origines inconnues.',
      carac,
      combats: {
        pv_max: pvMax, pv_actuel: pvMax,
        initiative: dexMod, bba: 1, bmo: 4,
        ca: 10 + dexMod, ca_contact: 10 + dexMod, ca_surprise: 10,
        saves: { vigueur: 2 + conMod, reflexes: dexMod, volonte: sagMod },
        rm: 0,
      },
      competences: [],
      dons: [],
      armes: [],
      inventaire: [{ nom: 'Sac à dos', poids: 1 }],
      charge_actuelle: 1,
      charge_max: Math.max(10, carac.FOR.base * 2),
      richesses: { pp: 0, po: 0, pa: 0, pc: 0 },
      description: { age: 25, taille: 170, poids: 70, cheveux: '?', yeux: '?', peau: '?' },
    };

    setBusy(true);
    const { data: inserted, error } = await supabase
      .from('personnages')
      .insert({
        user_id: user.id,
        nom: nom.trim(),
        race_id: raceId,
        classe_id: classeId,
        niveau: 1,
        edition,
        data_json: data,
      })
      .select()
      .single();
    setBusy(false);

    if (error) { setErr(error.message); return; }
    router.push(`/fiches/${inserted.id}`);
    router.refresh();
  }

  return (
    <div className="form-wrap">
      <div className="form-hero">
        <div className="form-hero-title">Forger un Aventurier</div>
        <div className="form-hero-sub">Pathfinder 1ère &amp; 2ème édition · Création guidée</div>
      </div>

      <form onSubmit={submit}>
        <div className="row2">
          <div className="form-group">
            <label className="form-label">Nom du personnage</label>
            <input className="form-input" value={nom} onChange={e => setNom(e.target.value)} placeholder="Kael Brandebois…" />
          </div>
          <div className="form-group">
            <label className="form-label">Joueur</label>
            <input className="form-input" value={joueur} onChange={e => setJoueur(e.target.value)} placeholder="Votre prénom" />
          </div>
        </div>

        <div className="row3">
          <div className="form-group">
            <label className="form-label">Édition</label>
            <select className="form-select" value={edition} onChange={e => { setEdition(e.target.value); setRaceId(''); setClasseId(''); }}>
              <option value="PF1">Pathfinder 1</option>
              <option value="PF2">Pathfinder 2</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Race / Ascendance</label>
            <select className="form-select" value={raceId} onChange={e => setRaceId(e.target.value)}>
              <option value="">— Choisir —</option>
              {raceOptions.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
            </select>
            {race?.desc && <div className="info-preview show"><strong>{race.nom}</strong> — {race.desc}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Classe</label>
            <select className="form-select" value={classeId} onChange={e => setClasseId(e.target.value)}>
              <option value="">— Choisir —</option>
              {classeOptions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            {classe?.desc && <div className="info-preview show"><strong>{classe.nom}</strong> — {classe.desc}</div>}
          </div>
        </div>

        <div className="row2">
          <div className="form-group">
            <label className="form-label">Alignement</label>
            <select className="form-select" value={alignement} onChange={e => setAlignement(e.target.value)}>
              {ALIGNS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Divinité</label>
            <input className="form-input" value={divinite} onChange={e => setDivinite(e.target.value)} placeholder="Iomedae, Torag, Desna…" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Caractéristiques de base (avant modificateurs raciaux)</label>
          <div className="stat-inputs-grid">
            {STATS.map(s => (
              <div key={s} className="stat-inp-wrap">
                <span className="stat-inp-abbr">{s}</span>
                <input
                  className="stat-inp-num"
                  type="number"
                  min={3}
                  max={20}
                  value={stats[s]}
                  onChange={e => setStats({ ...stats, [s]: parseInt(e.target.value) || 10 })}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Historique</label>
          <input className="form-input" value={bg} onChange={e => setBg(e.target.value)} placeholder="Son histoire en une phrase…" />
        </div>

        {calc && race && classe && (
          <div className="calc-box">
            <div className="calc-box-title">⚙ Calculs automatiques à la création</div>
            {STATS.map(s => {
              const raceMod = race.modifs?.[s] || 0;
              return (
                <div className="calc-line" key={s}>
                  <span>{s} final</span>
                  <span>{stats[s]} + {raceMod} = <strong style={{ color: 'var(--textgold)' }}>{calc.final[s]}</strong> (mod {ms(mod(calc.final[s]))})</span>
                </div>
              );
            })}
            <div className="calc-line">
              <span>PV max</span>
              <span>{classe.pv_niv} + {calc.conMod} (CON) = <strong style={{ color: 'var(--red2)' }}>{calc.pv}</strong></span>
            </div>
            <div className="calc-line">
              <span>Points de compétences</span>
              <span>{classe.pts_comp} + {calc.intMod} (INT) = <strong style={{ color: 'var(--gold)' }}>{calc.pts}</strong></span>
            </div>
          </div>
        )}

        {err && <p style={{ color: 'var(--red2)', fontFamily: 'var(--ffm)', fontSize: '0.75rem', marginTop: '0.8rem' }}>❌ {err}</p>}

        <button className="btn-forge" type="submit" disabled={busy}>⚔ {busy ? 'Forge en cours…' : 'Forger ce Personnage'}</button>
      </form>
    </div>
  );
}
