'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
  const [perso, setPerso] = useState<Personnage>(initial);
  const [section, setSection] = useState<Section>('combat');
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

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
      const { error } = await supabase.from('personnages').update(patch).eq('id', _db_id);
      if (error) {
        showToast('Erreur sauvegarde : ' + error.message);
        return false;
      }
      setPerso(next);
      if (!opts?.silent) showToast('Sauvegarde effectuée');
      return true;
    },
    [supabase, showToast]
  );

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

      <NiveauXp perso={perso} race={race} classe={classe} onSave={(p) => save(p, { mirrorColumns: true })} />

      <Carac perso={perso} onSave={save} />

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
            <PvSlider perso={perso} onSave={(p) => save(p, { silent: true })} />
            <Combat perso={perso} race={race} classe={classe} onSave={save} />
          </>
        )}
        {section === 'competences' && <Comp perso={perso} classe={classe} onSave={save} />}
        {section === 'equipement' && <Equip perso={perso} onSave={save} />}
        {section === 'capacites' && <Capas perso={perso} race={race} classe={classe} onSave={save} />}
        {section === 'description' && <Desc perso={perso} onSave={save} />}
      </div>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
