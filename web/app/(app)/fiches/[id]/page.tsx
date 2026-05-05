import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hydratePersonnage, parseClasses, parseRaces } from '@/lib/pathfinder';
import type { Classe, Race } from '@/lib/types';
import FicheView from './FicheView';

export const dynamic = 'force-dynamic';

export default async function FicheDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [persoRes, racesRes, classesRes] = await Promise.all([
    supabase.from('personnages').select('*').eq('id', id).maybeSingle(),
    supabase.from('races').select('*'),
    supabase.from('classes').select('*'),
  ]);

  if (!persoRes.data) notFound();

  const races = parseRaces(racesRes.data || []);
  const classes = parseClasses(classesRes.data || []);
  const perso = hydratePersonnage(persoRes.data);

  const race: Race = races[perso.race_id] || {
    id: perso.race_id,
    nom: perso.race_id || 'Race inconnue',
    modifs: {},
    desc: '',
  };
  const classe: Classe = classes[perso.classe_id] || {
    id: perso.classe_id,
    nom: perso.classe_id || 'Classe inconnue',
    pv_niv: 8,
    pts_comp: 2,
    cle: 'FOR',
    desc: '',
    jets_forts: [],
    jets_faibles: [],
    competences: [],
  };

  return <FicheView initial={perso} race={race} classe={classe} />;
}
