// Initialiser Supabase
// Les variables sont définies dans index.html / admin.html via window.SUPABASE_URL et window.SUPABASE_KEY
const supabase = window.supabase.createClient(
  window.SUPABASE_URL || '',
  window.SUPABASE_KEY || ''
);

export { supabase };

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
  if (error) return null; // Pas d'erreur si simplement non connecté
  return user;
}
