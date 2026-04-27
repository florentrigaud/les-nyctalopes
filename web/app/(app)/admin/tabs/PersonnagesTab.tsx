'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type PersoRow = {
  id: string;
  user_id: string;
  nom: string;
  race_id: string | null;
  classe_id: string | null;
  niveau: number | null;
  groupe_id: string | null;
};

type Lookup = Record<string, string>;
type Groupe = { id: string; nom: string; description: string | null };
type JoueurInfo = { email: string; pseudo: string | null };

type SortKey = 'joueur' | 'nom' | 'niveau' | 'groupe';
type SortDir = 'asc' | 'desc';

export default function PersonnagesTab() {
  const supabase = createClient();
  const [persos, setPersos] = useState<PersoRow[]>([]);
  const [races, setRaces] = useState<Lookup>({});
  const [classes, setClasses] = useState<Lookup>({});
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [joueurs, setJoueurs] = useState<Record<string, JoueurInfo>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [legacyMode, setLegacyMode] = useState(false);

  const [search, setSearch] = useState('');
  const [groupeFilter, setGroupeFilter] = useState<'all' | 'none' | string>('all');
  const [joueurFilter, setJoueurFilter] = useState<'all' | string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('joueur');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [busyId, setBusyId] = useState<string | null>(null);
  const [groupesOpen, setGroupesOpen] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setErr(null);

    let persoData: PersoRow[] = [];
    {
      const r = await supabase
        .from('personnages')
        .select('id, user_id, nom, race_id, classe_id, niveau, groupe_id');
      if (r.error && /column .*groupe_id.* does not exist/i.test(r.error.message)) {
        setLegacyMode(true);
        const fb = await supabase
          .from('personnages')
          .select('id, user_id, nom, race_id, classe_id, niveau');
        if (fb.error) {
          setErr(fb.error.message);
          setLoading(false);
          return;
        }
        persoData = ((fb.data || []) as Omit<PersoRow, 'groupe_id'>[]).map((p) => ({
          ...p,
          groupe_id: null,
        }));
      } else if (r.error) {
        setErr(r.error.message);
        setLoading(false);
        return;
      } else {
        persoData = (r.data as PersoRow[]) || [];
      }
    }

    const [rRes, cRes] = await Promise.all([
      supabase.from('races').select('id, nom'),
      supabase.from('classes').select('id, nom'),
    ]);

    let groupeData: Groupe[] = [];
    {
      const r = await supabase.from('groupes').select('id, nom, description');
      if (!r.error) groupeData = (r.data as Groupe[]) || [];
      // Si la table n’existe pas, legacyMode est déjà set ou on tolère silencieusement.
    }

    let joueurMap: Record<string, JoueurInfo> = {};
    {
      const r = await supabase.from('users').select('id, email, pseudo');
      if (r.error && /pseudo/i.test(r.error.message)) {
        const fb = await supabase.from('users').select('id, email');
        for (const u of (fb.data as { id: string; email: string }[]) || []) {
          joueurMap[u.id] = { email: u.email, pseudo: null };
        }
      } else {
        for (const u of (r.data as { id: string; email: string; pseudo: string | null }[]) || []) {
          joueurMap[u.id] = { email: u.email, pseudo: u.pseudo };
        }
      }
    }

    setPersos(persoData);
    setRaces(Object.fromEntries((rRes.data as { id: string; nom: string }[] | null || []).map((r) => [r.id, r.nom])));
    setClasses(Object.fromEntries((cRes.data as { id: string; nom: string }[] | null || []).map((c) => [c.id, c.nom])));
    setGroupes(groupeData);
    setJoueurs(joueurMap);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const groupeNomById = useMemo(() => Object.fromEntries(groupes.map((g) => [g.id, g.nom])), [groupes]);

  const joueursList = useMemo(() => {
    return Object.entries(joueurs)
      .map(([id, info]) => ({ id, label: info.pseudo || info.email }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [joueurs]);

  const filteredSorted = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const out = persos.filter((p) => {
      const j = joueurs[p.user_id];
      const joueurLabel = j ? (j.pseudo || j.email) : '';
      if (joueurFilter !== 'all' && p.user_id !== joueurFilter) return false;
      if (groupeFilter === 'none' && p.groupe_id) return false;
      if (groupeFilter !== 'all' && groupeFilter !== 'none' && p.groupe_id !== groupeFilter) return false;
      if (needle) {
        const haystack = [
          p.nom,
          joueurLabel,
          p.race_id ? races[p.race_id] || '' : '',
          p.classe_id ? classes[p.classe_id] || '' : '',
          p.groupe_id ? groupeNomById[p.groupe_id] || '' : '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    out.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'joueur': {
          const la = (joueurs[a.user_id]?.pseudo || joueurs[a.user_id]?.email || '').toLowerCase();
          const lb = (joueurs[b.user_id]?.pseudo || joueurs[b.user_id]?.email || '').toLowerCase();
          return la.localeCompare(lb) * dir;
        }
        case 'nom':
          return a.nom.localeCompare(b.nom) * dir;
        case 'niveau':
          return ((a.niveau ?? 0) - (b.niveau ?? 0)) * dir;
        case 'groupe': {
          const ga = a.groupe_id ? groupeNomById[a.groupe_id] || '' : '';
          const gb = b.groupe_id ? groupeNomById[b.groupe_id] || '' : '';
          return ga.localeCompare(gb) * dir;
        }
      }
    });
    return out;
  }, [persos, joueurs, races, classes, groupeNomById, search, groupeFilter, joueurFilter, sortBy, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  }

  async function assignGroupe(perso: PersoRow, groupeId: string | null) {
    if (legacyMode) {
      setErr('Migration 0001 requise pour assigner un groupe.');
      return;
    }
    setBusyId(perso.id);
    setErr(null);
    const { error } = await supabase
      .from('personnages')
      .update({ groupe_id: groupeId })
      .eq('id', perso.id);
    setBusyId(null);
    if (error) {
      setErr(error.message);
      return;
    }
    setPersos((prev) => prev.map((p) => (p.id === perso.id ? { ...p, groupe_id: groupeId } : p)));
  }

  return (
    <section className="panel-block">
      <div className="panel-title">Personnages — vue globale</div>

      {legacyMode && (
        <p className="admin-tab-todo" style={{ color: 'var(--amber)', marginBottom: '0.8rem' }}>
          ⚠ Migrations <code>0001_admin_gm.sql</code> et <code>0002_admin_personnages_access.sql</code> requises pour
          activer la lecture admin globale et les groupes.
        </p>
      )}

      <div className="admin-toolbar">
        <input
          type="search"
          className="admin-search"
          placeholder="Rechercher un perso, joueur, race, classe…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-select"
          value={joueurFilter}
          onChange={(e) => setJoueurFilter(e.target.value)}
          aria-label="Filtrer par joueur"
        >
          <option value="all">Tous joueurs</option>
          {joueursList.map((j) => (
            <option key={j.id} value={j.id}>
              {j.label}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          value={groupeFilter}
          onChange={(e) => setGroupeFilter(e.target.value)}
          aria-label="Filtrer par groupe"
        >
          <option value="all">Tous groupes</option>
          <option value="none">Sans groupe</option>
          {groupes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nom}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-edit"
          onClick={() => setGroupesOpen(true)}
          disabled={legacyMode}
          title="Créer / renommer / supprimer des groupes"
        >
          Gérer les groupes
        </button>
        <span className="admin-count">
          {filteredSorted.length} / {persos.length}
        </span>
      </div>

      {err && (
        <p style={{ color: 'var(--red2)', fontFamily: 'var(--ffm)', fontSize: '0.75rem', marginBottom: '0.8rem' }}>
          ❌ {err}
        </p>
      )}

      {loading ? (
        <div style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>Chargement…</div>
      ) : filteredSorted.length === 0 ? (
        <div style={{ color: 'var(--textdim)', fontSize: '0.9rem' }}>Aucun personnage ne correspond aux filtres.</div>
      ) : (
        <table className="admin-table sortable">
          <thead>
            <tr>
              <SortHeader label="Joueur" field="joueur" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
              <SortHeader label="Personnage" field="nom" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
              <th>Race</th>
              <th>Classe</th>
              <SortHeader label="Niv." field="niveau" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
              <SortHeader label="Groupe" field="groupe" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {filteredSorted.map((p) => {
              const j = joueurs[p.user_id];
              return (
                <tr key={p.id}>
                  <td style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>
                    {j ? j.pseudo || j.email : <em>compte inconnu</em>}
                  </td>
                  <td style={{ color: 'var(--textgold)', fontFamily: 'var(--ff)' }}>{p.nom}</td>
                  <td>{p.race_id ? races[p.race_id] || p.race_id : '—'}</td>
                  <td>{p.classe_id ? classes[p.classe_id] || p.classe_id : '—'}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'var(--ffm)' }}>{p.niveau ?? '—'}</td>
                  <td>
                    <select
                      className="admin-select admin-select-inline"
                      value={p.groupe_id || ''}
                      disabled={legacyMode || busyId === p.id}
                      onChange={(e) => assignGroupe(p, e.target.value || null)}
                      aria-label={`Groupe de ${p.nom}`}
                    >
                      <option value="">Sans groupe</option>
                      {groupes.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nom}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {groupesOpen && (
        <GroupesManager
          groupes={groupes}
          onClose={() => setGroupesOpen(false)}
          onChanged={refetch}
        />
      )}
    </section>
  );
}

function SortHeader({
  label,
  field,
  sortBy,
  sortDir,
  onClick,
}: {
  label: string;
  field: SortKey;
  sortBy: SortKey;
  sortDir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const active = sortBy === field;
  return (
    <th
      onClick={() => onClick(field)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      <span style={{ marginLeft: 4, color: active ? 'var(--gold)' : 'var(--textfaint)' }}>
        {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </th>
  );
}

function GroupesManager({
  groupes,
  onClose,
  onChanged,
}: {
  groupes: Groupe[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [renameTarget, setRenameTarget] = useState<Groupe | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function create() {
    const nom = newName.trim();
    if (!nom) return;
    setBusy('__new__');
    setErr(null);
    const { error } = await supabase.from('groupes').insert({ nom });
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    setNewName('');
    onChanged();
  }

  async function rename(g: Groupe, nom: string) {
    const trimmed = nom.trim();
    if (!trimmed || trimmed === g.nom) {
      setRenameTarget(null);
      return;
    }
    setBusy(g.id);
    setErr(null);
    const { error } = await supabase.from('groupes').update({ nom: trimmed }).eq('id', g.id);
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    setRenameTarget(null);
    onChanged();
  }

  async function remove(g: Groupe) {
    if (!confirm(`Supprimer le groupe « ${g.nom} » ? Les personnages assignés deviendront « sans groupe ».`)) return;
    setBusy(g.id);
    setErr(null);
    const { error } = await supabase.from('groupes').delete().eq('id', g.id);
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    onChanged();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Gérer les groupes</span>
          <button className="dice-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body">
          {err && (
            <p style={{ color: 'var(--red2)', fontFamily: 'var(--ffm)', fontSize: '0.75rem' }}>❌ {err}</p>
          )}
          <div className="groupes-list">
            {groupes.length === 0 && (
              <div style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>Aucun groupe encore.</div>
            )}
            {groupes.map((g) => (
              <div key={g.id} className="groupes-row">
                {renameTarget?.id === g.id ? (
                  <>
                    <input
                      className="dice-label-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && rename(g, renameValue)}
                    />
                    <button
                      className="btn-validate"
                      disabled={busy === g.id}
                      onClick={() => rename(g, renameValue)}
                    >
                      OK
                    </button>
                    <button className="btn-cancel" onClick={() => setRenameTarget(null)}>
                      Annuler
                    </button>
                  </>
                ) : (
                  <>
                    <span className="groupes-name">{g.nom}</span>
                    <button
                      className="btn-edit"
                      disabled={busy === g.id}
                      onClick={() => {
                        setRenameTarget(g);
                        setRenameValue(g.nom);
                      }}
                    >
                      Renommer
                    </button>
                    <button
                      className="btn-refuse"
                      disabled={busy === g.id}
                      onClick={() => remove(g)}
                    >
                      Supprimer
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="groupes-create">
            <input
              className="dice-label-input"
              placeholder="Nom du nouveau groupe"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
            <button className="btn-validate" disabled={busy === '__new__' || !newName.trim()} onClick={create}>
              Créer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
