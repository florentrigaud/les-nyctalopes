'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type PendingUser = { id: string; email: string };

export default function InscriptionsTab({ currentAdminId }: { currentAdminId: string }) {
  const supabase = createClient();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Sélectionne les comptes en attente — tolérant à l'ancien schéma sans
      // colonne `status` : on retombe sur `is_validated = false` si besoin.
      let { data, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('status', 'pending');

      if (error && /column .*status.* does not exist/i.test(error.message)) {
        const fallback = await supabase
          .from('users')
          .select('id, email')
          .eq('is_validated', false);
        data = fallback.data;
        error = fallback.error;
      }

      if (cancelled) return;
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      setUsers(data || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function validate(id: string) {
    setErr(null);
    if (id === currentAdminId) {
      setErr('Auto-validation interdite.');
      return;
    }

    const { data: me } = await supabase
      .from('users')
      .select('is_admin, status, is_validated')
      .eq('id', currentAdminId)
      .maybeSingle();
    const meIsValidated = me?.status ? me.status === 'validated' : me?.is_validated !== false;
    if (!me?.is_admin || !meIsValidated) {
      setErr('Session admin invalide.');
      return;
    }

    setBusyId(id);
    let { error } = await supabase
      .from('users')
      .update({ status: 'validated' })
      .eq('id', id);
    if (error && /column .*status.* of relation .users. does not exist/i.test(error.message)) {
      const fallback = await supabase
        .from('users')
        .update({ is_validated: true })
        .eq('id', id);
      error = fallback.error;
    }
    setBusyId(null);
    if (error) {
      setErr(error.message);
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <section className="panel-block">
      <div className="panel-title">Utilisateurs en attente de validation</div>

      {err && (
        <p
          style={{
            color: 'var(--red2)',
            fontFamily: 'var(--ffm)',
            fontSize: '0.75rem',
            marginBottom: '0.8rem',
          }}
        >
          ❌ {err}
        </p>
      )}

      {loading ? (
        <div style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>Chargement…</div>
      ) : users.length === 0 ? (
        <div style={{ color: 'var(--textdim)', fontSize: '0.9rem' }}>Aucun utilisateur en attente.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th style={{ width: 140 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>
                  <button
                    className="btn-validate"
                    onClick={() => validate(u.id)}
                    disabled={busyId === u.id}
                  >
                    {busyId === u.id ? '…' : 'Valider'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p
        className="admin-tab-todo"
        style={{ marginTop: '1rem', color: 'var(--textdim)', fontSize: '0.7rem' }}
      >
        T3 à venir : refus avec raison, modification du pseudo, filtre par statut
        (pending / validated / refused).
      </p>
    </section>
  );
}
