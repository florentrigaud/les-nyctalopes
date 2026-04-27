import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Topbar from '@/components/Topbar';
import { DiceProvider } from '@/components/DiceRoller';
import LiveEventPopup from '@/components/LiveEventPopup';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <DiceProvider>
      <Topbar email={user.email} />
      <main className="main-content">{children}</main>
      <LiveEventPopup />
    </DiceProvider>
  );
}
