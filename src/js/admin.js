import { supabase } from './auth.js';

export async function validateUser(userId) {
  const { error } = await supabase.from('users').update({ is_validated: true }).eq('id', userId);
  if (error) throw new Error(error.message);
  return { success: true };
}