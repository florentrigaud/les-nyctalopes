import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminTabs from './AdminTabs';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('users')
    .select('is_admin, status, is_validated')
    .eq('id', user.id)
    .maybeSingle();

  const isValidated = me?.status ? me.status === 'validated' : me?.is_validated !== false;
  if (!me?.is_admin || !isValidated) {
    return (
      <div className="empty-state">
        <div className="empty-glyph">⛔</div>
        <div className="empty-title">Accès refusé</div>
        <div className="empty-sub">Droits administrateur requis.</div>
      </div>
    );
  }

  return (
    <div>
      <h1
        style={{
          fontFamily: 'var(--ffd)',
          fontSize: '1.6rem',
          color: 'var(--textgold)',
          marginBottom: '1.2rem',
        }}
      >
        Administration
      </h1>
      <AdminTabs currentAdminId={user.id} />
    </div>
  );
}
