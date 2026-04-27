'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Status = 'pending' | 'validated' | 'refused';

type UserRow = {
  id: string;
  email: string;
  pseudo: string | null;
  status: Status;
  refused_reason: string | null;
  is_admin: boolean | null;
};

type FilterKey = 'all' | Status;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'pending', label: 'En attente' },
  { key: 'validated', label: 'Validés' },
  { key: 'refused', label: 'Refusés' },
  { key: 'all', label: 'Tous' },
];

const STATUS_LABEL: Record<Status, string> = {
  pending: 'En attente',
  validated: 'Validé',
  refused: 'Refusé',
};

export default function InscriptionsTab({ currentAdminId }: { currentAdminId: string }) {
  const supabase = createClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState<FilterKey>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [legacyMode, setLegacyMode] = useState(false);

  const [refuseTarget, setRefuseTarget] = useState<UserRow | null>(null);
  const [refuseReason, setRefuseReason] = useState('');

  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editPseudo, setEditPseudo] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let { data, error } = await supabase
        .from('users')
        .select('id, email, pseudo, status, refused_reason, is_admin');

      // Fallback transparent si la migration 0001 n'a pas encore été jouée.
      if (error && /column .* does not exist/i.test(error.message)) {
        setLegacyMode(true);
        const fb = await supabase.from('users').select('id, email, is_admin, is_validated');
        if (fb.error) {
          if (!cancelled) {
            setErr(fb.error.message);
            setLoading(false);
          }
          return;
        }
        data = (fb.data || []).map((u: { id: string; email: string; is_admin: boolean | null; is_validated: boolean | null }) => ({
          id: u.id,
          email: u.email,
          pseudo: null,
          status: (u.is_validated ? 'validated' : 'pending') as Status,
          refused_reason: null,
          is_admin: u.is_admin,
        }));
        error = null;
      }

      if (cancelled) return;
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      setUsers((data as UserRow[]) || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filtered = useMemo(() => {
    const sorted = [...users].sort((a, b) => a.email.localeCompare(b.email));
    if (filter === 'all') return sorted;
    return sorted.filter((u) => u.status === filter);
  }, [users, filter]);

  const counts = useMemo(() => {
    const c = { all: users.length, pending: 0, validated: 0, refused: 0 } as Record<FilterKey, number>;
    for (const u of users) c[u.status]++;
    return c;
  }, [users]);

  async function checkAdminSession(): Promise<boolean> {
    const { data: me } = await supabase
      .from('users')
      .select('is_admin, status, is_validated')
      .eq('id', currentAdminId)
      .maybeSingle();
    const meIsValidated = me?.status ? me.status === 'validated' : me?.is_validated !== false;
    if (!me?.is_admin || !meIsValidated) {
      setErr('Session admin invalide.');
      return false;
    }
    return true;
  }

  async function setStatus(target: UserRow, next: Status, reason: string | null) {
    setErr(null);
    if (target.id === currentAdminId) {
      setErr('Impossible de modifier votre propre statut.');
      return false;
    }
    if (!(await checkAdminSession())) return false;

    setBusyId(target.id);

    if (legacyMode) {
      // Schéma sans colonne status : on synchronise uniquement is_validated.
      const { error } = await supabase
        .from('users')
        .update({ is_validated: next === 'validated' })
        .eq('id', target.id);
      setBusyId(null);
      if (error) {
        setErr(error.message);
        return false;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, status: next === 'validated' ? 'validated' : 'pending' } : u))
      );
      return true;
    }

    const { error } = await supabase
      .from('users')
      .update({ status: next, refused_reason: next === 'refused' ? reason : null })
      .eq('id', target.id);

    setBusyId(null);
    if (error) {
      setErr(error.message);
      return false;
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === target.id ? { ...u, status: next, refused_reason: next === 'refused' ? reason : null } : u
      )
    );
    return true;
  }

  async function savePseudo(target: UserRow, pseudo: string) {
    setErr(null);
    if (legacyMode) {
      setErr('La colonne pseudo n’est pas encore déployée. Exécute la migration 0001.');
      return false;
    }
    if (!(await checkAdminSession())) return false;
    setBusyId(target.id);
    const { error } = await supabase
      .from('users')
      .update({ pseudo: pseudo.trim() || null })
      .eq('id', target.id);
    setBusyId(null);
    if (error) {
      setErr(error.message);
      return false;
    }
    setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, pseudo: pseudo.trim() || null } : u)));
    return true;
  }

  function openRefuse(u: UserRow) {
    setRefuseTarget(u);
    setRefuseReason(u.refused_reason || '');
  }

  function openEdit(u: UserRow) {
    setEditTarget(u);
    setEditPseudo(u.pseudo || '');
  }

  return (
    <section className="panel-block">
      <div className="panel-title">Inscriptions</div>

      {legacyMode && (
        <p className="admin-tab-todo" style={{ color: 'var(--amber)', marginBottom: '0.8rem' }}>
          ⚠ Schéma legacy détecté. La migration <code>0001_admin_gm.sql</code> n’a pas été exécutée — le refus avec raison
          et l’édition de pseudo sont désactivés.
        </p>
      )}

      <div className="admin-filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`admin-filter-chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="admin-filter-count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {err && (
        <p style={{ color: 'var(--red2)', fontFamily: 'var(--ffm)', fontSize: '0.75rem', marginBottom: '0.8rem' }}>
          ❌ {err}
        </p>
      )}

      {loading ? (
        <div style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'var(--textdim)', fontSize: '0.9rem' }}>Aucun compte dans cette catégorie.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Pseudo</th>
              <th style={{ width: 110 }}>Statut</th>
              <th>Raison du refus</th>
              <th style={{ width: 280 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const isSelf = u.id === currentAdminId;
              return (
                <tr key={u.id}>
                  <td>
                    {u.email}
                    {u.is_admin && <span className="badge-admin" title="Administrateur">admin</span>}
                  </td>
                  <td style={{ color: u.pseudo ? 'var(--text)' : 'var(--textdim)' }}>{u.pseudo || '—'}</td>
                  <td>
                    <span className={`status-badge status-${u.status}`}>{STATUS_LABEL[u.status]}</span>
                  </td>
                  <td style={{ color: 'var(--textdim)', fontSize: '0.82rem', maxWidth: 280 }}>
                    {u.refused_reason || (u.status === 'refused' ? '(non précisée)' : '—')}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      {u.status !== 'validated' && (
                        <button
                          className="btn-validate"
                          disabled={busyId === u.id || isSelf}
                          title={isSelf ? 'Auto-validation interdite' : 'Valider ce compte'}
                          onClick={() => setStatus(u, 'validated', null)}
                        >
                          {busyId === u.id ? '…' : 'Valider'}
                        </button>
                      )}
                      {u.status !== 'refused' && (
                        <button
                          className="btn-refuse"
                          disabled={busyId === u.id || isSelf || legacyMode}
                          title={isSelf ? 'Auto-refus interdit' : 'Refuser ce compte'}
                          onClick={() => openRefuse(u)}
                        >
                          Refuser
                        </button>
                      )}
                      <button
                        className="btn-edit"
                        disabled={busyId === u.id || legacyMode}
                        title="Modifier le pseudo"
                        onClick={() => openEdit(u)}
                      >
                        Pseudo
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {refuseTarget && (
        <Modal title={`Refuser ${refuseTarget.email}`} onClose={() => setRefuseTarget(null)}>
          <label className="auth-label">Raison (optionnelle, visible uniquement par les admins)</label>
          <textarea
            className="dice-label-input"
            rows={4}
            value={refuseReason}
            onChange={(e) => setRefuseReason(e.target.value)}
            placeholder="Ex : compte de test, demande non aboutie, doublon…"
            autoFocus
          />
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setRefuseTarget(null)}>
              Annuler
            </button>
            <button
              className="btn-refuse"
              disabled={busyId === refuseTarget.id}
              onClick={async () => {
                const ok = await setStatus(refuseTarget, 'refused', refuseReason.trim() || null);
                if (ok) setRefuseTarget(null);
              }}
            >
              {busyId === refuseTarget.id ? '…' : 'Confirmer le refus'}
            </button>
          </div>
        </Modal>
      )}

      {editTarget && (
        <Modal title={`Pseudo de ${editTarget.email}`} onClose={() => setEditTarget(null)}>
          <label className="auth-label">Pseudo affiché en jeu</label>
          <input
            className="dice-label-input"
            value={editPseudo}
            onChange={(e) => setEditPseudo(e.target.value)}
            placeholder="Laisse vide pour effacer"
            autoFocus
          />
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setEditTarget(null)}>
              Annuler
            </button>
            <button
              className="btn-validate"
              disabled={busyId === editTarget.id}
              onClick={async () => {
                const ok = await savePseudo(editTarget, editPseudo);
                if (ok) setEditTarget(null);
              }}
            >
              {busyId === editTarget.id ? '…' : 'Enregistrer'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{title}</span>
          <button className="dice-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
