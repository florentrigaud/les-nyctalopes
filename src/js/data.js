import { supabase } from './auth.js';

export async function createFiche(data) {
  const { error } = await supabase.from('personnages').insert(data);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function loadFiches(userId) {
  const { data, error } = await supabase.from('personnages').select('*').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data;
}
