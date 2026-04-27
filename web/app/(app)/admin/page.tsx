import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminList from './AdminList';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('users')
    .select('is_admin, is_validated')
    .eq('id', user.id)
    .maybeSingle();

  if (!me?.is_admin || me.is_validated === false) {
    return (
      <div className="empty-state">
        <div className="empty-glyph">⛔</div>
        <div className="empty-title">Accès refusé</div>
        <div className="empty-sub">Droits administrateur requis.</div>
      </div>
    );
  }

  const { data: pending } = await supabase
    .from('users')
    .select('id, email')
    .eq('is_validated', false);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--ffd)', fontSize: '1.6rem', color: 'var(--textgold)', marginBottom: '1.2rem' }}>
        Administration
      </h1>
      <div className="panel-block">
        <div className="panel-title">Utilisateurs en attente de validation</div>
        <AdminList initial={pending || []} currentAdminId={user.id} />
      </div>
    </div>
  );
}
