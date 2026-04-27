'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DiceToggleButton } from '@/components/DiceRoller';

export default function Topbar({ email }: { email: string | null | undefined }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const cls = (href: string) => (pathname === href || pathname.startsWith(href + '/') ? 'active' : '');

  return (
    <header className="topbar">
      <Link href="/fiches" className="topbar-brand">
        <div className="topbar-emblem">⚔</div>
        <div className="topbar-name">
          Les Nyctalopes <span>Plateforme Pathfinder · PF1 &amp; PF2</span>
        </div>
      </Link>
      <nav>
        <ul className="topbar-nav">
          <li>
            <Link href="/fiches" className={cls('/fiches')}>Fiches</Link>
          </li>
          <li>
            <Link href="/creer" className={cls('/creer')}>Créer</Link>
          </li>
          <li>
            <Link href="/aide" className={cls('/aide')}>Aide</Link>
          </li>
          <li>
            <Link href="/admin" className={cls('/admin')}>Admin</Link>
          </li>
        </ul>
      </nav>
      <div className="topbar-user">
        <DiceToggleButton />
        {email && <span className="topbar-email">{email}</span>}
        <button className="topbar-signout" onClick={signOut}>Déconnexion</button>
      </div>
    </header>
  );
}
