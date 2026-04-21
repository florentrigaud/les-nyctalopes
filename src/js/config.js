function isPlaceholder(value) {
  if (!value) return true;
  const upper = String(value).toUpperCase();
  return upper.includes("REMPLACE") || upper.includes("CHANGE_ME");
}

export function getSupabaseConfig() {
  const runtime = window.APP_CONFIG || {};
  const supabaseUrl = runtime.SUPABASE_URL || window.SUPABASE_URL || "";
  const supabaseKey = runtime.SUPABASE_KEY || window.SUPABASE_KEY || "";
  return { supabaseUrl, supabaseKey };
}

export function hasSupabaseConfig() {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  return !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseKey);
}
