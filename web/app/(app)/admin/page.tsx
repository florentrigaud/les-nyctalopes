import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkAdmin } from '@/lib/admin-guard';
import AdminTabs from './AdminTabs';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  const check = await checkAdmin(supabase);

  if (!check.ok) {
    if (check.reason === 'unauthenticated') redirect('/login');
    return (
      <div className="empty-state">
        <div className="empty-glyph">⛔</div>
        <div className="empty-title">Accès refusé</div>
        <div className="empty-sub">
          {check.reason === 'not_admin'
            ? 'Droits administrateur requis.'
            : 'Votre compte attend la validation d’un administrateur.'}
        </div>
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
      <AdminTabs currentAdminId={check.userId} />
    </div>
  );
}
