'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDice } from '@/components/DiceRoller';
import StatusEffectsBar from '@/components/StatusEffectsBar';
import { hydratePersonnage } from '@/lib/pathfinder';
import { usePersonnageRealtime } from '@/lib/usePersonnageRealtime';
import type { Classe, Personnage, Race } from '@/lib/types';
import Carac from './sections/Carac';
import NiveauXp from './sections/NiveauXp';
import PvSlider from './sections/PvSlider';
import Combat from './sections/Combat';
import Comp from './sections/Comp';
import Equip from './sections/Equip';
import Capas from './sections/Capas';
import Desc from './sections/Desc';

type Section = 'combat' | 'competences' | 'equipement' | 'capacites' | 'description';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'combat', label: 'Combat' },
  { key: 'competences', label: 'Compétences' },
  { key: 'equipement', label: 'Équipement' },
  { key: 'capacites', label: 'Capacités' },
  { key: 'description', label: 'Description' },
];

export default function FicheView({
  initial,
  race,
  classe,
}: {
  initial: Personnage;
  race: Race;
  classe: Classe;
}) {
  const supabase = createClient();
  const router = useRouter();
  const { setActivePerso } = useDice();
  const [perso, setPerso] = useState<Personnage>(initial);
  const [section, setSection] = useState<Section>('combat');
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastLocalSaveRef = useRef<number>(0);
  const lastSavedRef = useRef<Personnage>(initial);
  const lastRealtimeRef = useRef<number>(0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // T9 — rattache les jets de dés effectués sur cette fiche à perso_id.
  useEffect(() => {
    setActivePerso(initial._db_id);
    return () => setActivePerso(null);
  }, [initial._db_id, setActivePerso]);

  // T8 — Realtime : reçoit les modifications GM en direct.
  usePersonnageRealtime(initial._db_id, (row) => {
    const next = hydratePersonnage({
      id: row.id,
      user_id: row.user_id,
      nom: row.nom,
      race_id: row.race_id ?? '',
      classe_id: row.classe_id ?? '',
      data_json: row.data_json,
    });
    lastRealtimeRef.current = Date.now();
    lastSavedRef.current = next;
    setPerso(next);
    // Si le payload arrive juste après notre propre save, on ne notifie pas.
    if (Date.now() - lastLocalSaveRef.current > 1500) {
      showToast('🛡 MJ : votre fiche a été mise à jour');
    }
  });

  const handleDelete = useCallback(async () => {
    if (!confirm(`Supprimer définitivement "${perso.nom}" ?`)) return;
    setBusy(true);
    const { error } = await supabase.from('personnages').delete().eq('id', perso._db_id);
    setBusy(false);
    if (error) {
      showToast('Erreur suppression : ' + error.message);
      return;
    }
    router.push('/fiches');
    router.refresh();
  }, [perso, supabase, router, showToast]);

  const handleDuplicate = useCallback(async () => {
    setBusy(true);
    const { _db_id, user_id, nom, race_id, classe_id, ...data } = perso;
    const { data: inserted, error } = await supabase
      .from('personnages')
      .insert({
        user_id,
        nom: `${nom} (copie)`,
        race_id,
        classe_id,
        niveau: perso.niveau,
        edition: perso.edition,
        data_json: data,
      })
      .select()
      .single();
    setBusy(false);
    if (error) {
      showToast('Erreur duplication : ' + error.message);
      return;
    }
    router.push(`/fiches/${inserted.id}`);
    router.refresh();
  }, [perso, supabase, router, showToast]);

  const save = useCallback(
    async (next: Personnage, opts?: { silent?: boolean; mirrorColumns?: boolean }) => {
      const { _db_id, user_id, nom, race_id, classe_id, ...data } = next;
      const patch: Record<string, unknown> = { data_json: data };
      if (opts?.mirrorColumns) {
        patch.niveau = next.niveau;
        patch.edition = next.edition;
      }
      lastLocalSaveRef.current = Date.now();
      const { error } = await supabase.from('personnages').update(patch).eq('id', _db_id);
      if (error) {
        showToast('Erreur sauvegarde : ' + error.message);
        return false;
      }
      setPerso(next);
      lastSavedRef.current = next;
      if (!opts?.silent) showToast('Sauvegarde effectuée');
      return true;
    },
    [supabase, showToast]
  );

  const onChange = useCallback((next: Personnage) => setPerso(next), []);

  // Autosave global — debounce 800 ms, silencieux, ignore les modifs venues du Realtime.
  useEffect(() => {
    if (perso === lastSavedRef.current) return;
    if (Date.now() - lastRealtimeRef.current < 1500) {
      lastSavedRef.current = perso;
      return;
    }
    const t = setTimeout(async () => {
      const ok = await save(perso, { silent: true, mirrorColumns: true });
      if (ok) lastSavedRef.current = perso;
    }, 800);
    return () => clearTimeout(t);
  }, [perso, save]);

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/fiches" style={{ color: 'var(--textdim)', fontFamily: 'var(--ffm)', fontSize: '0.7rem', letterSpacing: '0.15em', textDecoration: 'none' }}>
          ← Retour aux fiches
        </Link>
        <div className="fiche-actions">
          <button type="button" className="btn-cancel" onClick={handleDuplicate} disabled={busy}>⎘ Dupliquer</button>
          <button type="button" className="btn-del" onClick={handleDelete} disabled={busy}>🗑 Supprimer</button>
        </div>
      </div>

      <NiveauXp
        perso={perso}
        race={race}
        classe={classe}
        onChange={onChange}
        onSave={(p) => save(p, { mirrorColumns: true })}
      />

      <Carac perso={perso} onChange={onChange} />

      <div className="section-tabs anim">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`stab ${section === s.key ? 'active' : ''}`}
            onClick={() => setSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="anim">
        {section === 'combat' && (
          <>
            <div className="panel-block">
              <div className="panel-title">États en cours</div>
              <StatusEffectsBar persoId={perso._db_id} mode="view" />
            </div>
            <PvSlider perso={perso} onChange={onChange} />
            <Combat perso={perso} race={race} classe={classe} onChange={onChange} />
          </>
        )}
        {section === 'competences' && <Comp perso={perso} classe={classe} onChange={onChange} />}
        {section === 'equipement' && <Equip perso={perso} onChange={onChange} />}
        {section === 'capacites' && <Capas perso={perso} race={race} classe={classe} onChange={onChange} />}
        {section === 'description' && <Desc perso={perso} onChange={onChange} />}
      </div>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
