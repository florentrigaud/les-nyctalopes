// Initialiser Supabase (sans module)
const supabase = window.supabase.createClient(
  import.meta.env?.SUPABASE_URL || window.env?.SUPABASE_URL || '',
  import.meta.env?.SUPABASE_KEY || window.env?.SUPABASE_KEY || ''
);

// Fonctions d'authentification
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return user;
}
