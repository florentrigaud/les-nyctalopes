import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { hydratePersonnage, parseClasses, parseRaces } from '@/lib/pathfinder';

export const dynamic = 'force-dynamic';

export default async function FichesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [persosRes, racesRes, classesRes] = await Promise.all([
    supabase.from('personnages').select('*').eq('user_id', user.id),
    supabase.from('races').select('*'),
    supabase.from('classes').select('*'),
  ]);

  if (persosRes.error) {
    return <div className="empty-state"><div className="empty-title">Erreur chargement</div><div className="empty-sub">{persosRes.error.message}</div></div>;
  }

  const races = parseRaces(racesRes.data || []);
  const classes = parseClasses(classesRes.data || []);
  const persos = (persosRes.data || []).map(hydratePersonnage);

  if (persos.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-glyph">⚜</div>
        <div className="empty-title">Aucun personnage</div>
        <div className="empty-sub">Créez votre premier aventurier pour commencer.</div>
        <Link href="/creer" className="btn-sidebar" style={{ maxWidth: 280 }}>+ Créer une fiche</Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <h1 style={{ fontFamily: 'var(--ffd)', fontSize: '1.6rem', color: 'var(--textgold)' }}>Mes Aventuriers</h1>
        <Link href="/creer" className="btn-sidebar" style={{ maxWidth: 220 }}>+ Nouvelle fiche</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '0.8rem' }}>
        {persos.map(p => {
          const race = races[p.race_id];
          const cl = classes[p.classe_id];
          const badge = cl ? cl.nom.toLowerCase().replace(/[éè]/g, 'e').replace(/ô/g, 'o') : 'guerrier';
          return (
            <Link key={p._db_id} href={`/fiches/${p._db_id}`} className="char-card">
              <div className="char-card-name">{p.nom}</div>
              <div className="char-card-meta">{race?.nom || p.race_id || '?'} · Niv.{p.niveau || 1}</div>
              <span className={`char-card-badge badge-${badge}`}>{cl?.nom || p.classe_id || '?'} {p.edition || ''}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
