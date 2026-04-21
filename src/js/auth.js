import { getSupabaseConfig, hasSupabaseConfig } from './config.js';

const { supabaseUrl, supabaseKey } = getSupabaseConfig();
const supabase = hasSupabaseConfig()
  ? window.supabase.createClient(supabaseUrl, supabaseKey)
  : null;

function requireSupabase() {
  if (!supabase) {
    throw new Error("Configuration Supabase manquante. Renseigne APP_CONFIG ou localStorage.");
  }
}

export { supabase };

export async function signIn(email, password) {
  requireSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signUp(email, password) {
  requireSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  requireSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}
