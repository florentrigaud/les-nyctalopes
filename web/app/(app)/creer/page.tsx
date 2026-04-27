import { createClient } from '@/lib/supabase/server';
import { parseClasses, parseRaces } from '@/lib/pathfinder';
import CreerForm from './CreerForm';

export const dynamic = 'force-dynamic';

export default async function CreerPage() {
  const supabase = await createClient();
  const [racesRes, classesRes] = await Promise.all([
    supabase.from('races').select('*'),
    supabase.from('classes').select('*'),
  ]);

  const races = parseRaces(racesRes.data || []);
  const classes = parseClasses(classesRes.data || []);

  return <CreerForm races={races} classes={classes} />;
}
