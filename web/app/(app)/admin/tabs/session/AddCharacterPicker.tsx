'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { JoueurInfo, Lookup } from './types';

type CandidatePerso = {
  id: string;
  user_id: string;
  nom: string;
  race_id: string | null;
  classe_id: string | null;
  niveau: number | null;
  groupe_id: string | null;
};

export default function AddCharacterPicker({
  excludedIds,
  remainingSlots,
  onPick,
  onClose,
}: {
  excludedIds: string[];
  remainingSlots: number;
  onPick: (id: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [persos, setPersos] = useState<CandidatePerso[]>([]);
  const [races, setRaces] = useState<Lookup>({});
  const [classes, setClasses] = useState<Lookup>({});
  const [groupes, setGroupes] = useState<Lookup>({});
  const [joueurs, setJoueurs] = useState<Record<string, JoueurInfo>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [groupeFilter, setGroupeFilter] = useState<'all' | 'none' | string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pRes, rRes, cRes, gRes, uRes] = await Promise.all([
        supabase.from('personnages').select('id, user_id, nom, race_id, classe_id, niveau, groupe_id'),
        supabase.from('races').select('id, nom'),
        supabase.from('classes').select('id, nom'),
        supabase.from('groupes').select('id, nom'),
        supabase.from('users').select('id, email, pseudo'),
      ]);
      if (cancelled) return;
      if (pRes.error) {
        setErr(pRes.error.message);
        setLoading(false);
        return;
      }
      setPersos((pRes.data as CandidatePerso[]) || []);
      setRaces(Object.fromEntries(((rRes.data || []) as { id: string; nom: string }[]).map((r) => [r.id, r.nom])));
      setClasses(Object.fromEntries(((cRes.data || []) as { id: string; nom: string }[]).map((c) => [c.id, c.nom])));
      setGroupes(Object.fromEntries(((gRes.data || []) as { id: string; nom: string }[]).map((g) => [g.id, g.nom])));
      const jm: Record<string, JoueurInfo> = {};
      for (const u of (uRes.data || []) as { id: string; email: string; pseudo: string | null }[]) {
        jm[u.id] = { email: u.email, pseudo: u.pseudo };
      }
      setJoueurs(jm);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const candidates = useMemo(() => {
    const exSet = new Set(excludedIds);
    const needle = search.trim().toLowerCase();
    return persos
      .filter((p) => !exSet.has(p.id))
      .filter((p) => {
        if (groupeFilter === 'all') return true;
        if (groupeFilter === 'none') return !p.groupe_id;
        return p.groupe_id === groupeFilter;
      })
      .filter((p) => {
        if (!needle) return true;
        const j = joueurs[p.user_id];
        const haystack = [
          p.nom,
          j ? j.pseudo || j.email : '',
          p.race_id ? races[p.race_id] || '' : '',
          p.classe_id ? classes[p.classe_id] || '' : '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [persos, excludedIds, groupeFilter, search, joueurs, races, classes]);

  async function pick(id: string) {
    setBusyId(id);
    setErr(null);
    const ok = await onPick(id);
    setBusyId(null);
    if (!ok) {
      setErr('Échec de l’ajout. Vérifie tes droits ou les contraintes de session.');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel modal-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Ajouter un personnage à la session ({remainingSlots} place{remainingSlots > 1 ? 's' : ''} restante{remainingSlots > 1 ? 's' : ''})</span>
          <button className="dice-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body">
          <div className="admin-toolbar" style={{ marginBottom: '0.6rem' }}>
            <input
              type="search"
              className="admin-search"
              placeholder="Rechercher un perso, joueur, race, classe…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <select
              className="admin-select"
              value={groupeFilter}
              onChange={(e) => setGroupeFilter(e.target.value)}
            >
              <option value="all">Tous groupes</option>
              <option value="none">Sans groupe</option>
              {Object.entries(groupes).map(([id, nom]) => (
                <option key={id} value={id}>{nom}</option>
              ))}
            </select>
            <span className="admin-count">{candidates.length}</span>
          </div>

          {err && (
            <p style={{ color: 'var(--red2)', fontFamily: 'var(--ffm)', fontSize: '0.75rem' }}>❌ {err}</p>
          )}

          {loading ? (
            <div style={{ color: 'var(--textdim)' }}>Chargement…</div>
          ) : candidates.length === 0 ? (
            <div style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>Aucun perso disponible avec ces filtres.</div>
          ) : (
            <div className="picker-list">
              {candidates.map((p) => {
                const j = joueurs[p.user_id];
                return (
                  <div key={p.id} className="picker-row">
                    <div className="picker-row-info">
                      <div className="picker-row-name">{p.nom}</div>
                      <div className="picker-row-meta">
                        {(p.race_id ? races[p.race_id] || p.race_id : '—')} ·{' '}
                        {(p.classe_id ? classes[p.classe_id] || p.classe_id : '—')} · niv {p.niveau ?? '?'} ·{' '}
                        {j ? j.pseudo || j.email : '?'}{' '}
                        {p.groupe_id && <span className="picker-row-groupe">[{groupes[p.groupe_id] || '?'}]</span>}
                      </div>
                    </div>
                    <button
                      className="btn-validate"
                      disabled={busyId === p.id || remainingSlots <= 0}
                      onClick={() => pick(p.id)}
                    >
                      {busyId === p.id ? '…' : 'Ajouter'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
