'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type PendingUser = { id: string; email: string };

export default function AdminList({ initial, currentAdminId }: { initial: PendingUser[]; currentAdminId: string }) {
  const supabase = createClient();
  const [users, setUsers] = useState<PendingUser[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function validate(id: string) {
    setErr(null);
    if (id === currentAdminId) { setErr('Auto-validation interdite.'); return; }

    const { data: me } = await supabase
      .from('users')
      .select('is_admin, is_validated')
      .eq('id', currentAdminId)
      .maybeSingle();
    if (!me?.is_admin || me.is_validated === false) {
      setErr('Session admin invalide.');
      return;
    }

    setBusyId(id);
    const { error } = await supabase.from('users').update({ is_validated: true }).eq('id', id);
    setBusyId(null);
    if (error) { setErr(error.message); return; }
    setUsers(users.filter(u => u.id !== id));
  }

  if (users.length === 0) {
    return <div style={{ color: 'var(--textdim)', fontSize: '0.9rem' }}>Aucun utilisateur en attente.</div>;
  }

  return (
    <>
      {err && <p style={{ color: 'var(--red2)', fontFamily: 'var(--ffm)', fontSize: '0.75rem', marginBottom: '0.8rem' }}>❌ {err}</p>}
      <table className="admin-table">
        <thead><tr><th>Email</th><th style={{ width: 140 }}>Action</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>
                <button className="btn-validate" onClick={() => validate(u.id)} disabled={busyId === u.id}>
                  {busyId === u.id ? '…' : 'Valider'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
