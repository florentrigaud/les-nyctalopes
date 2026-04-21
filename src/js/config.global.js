// Shared runtime config for non-module and module pages.
// Priority order:
// 1) window.APP_CONFIG values
// 2) legacy window.SUPABASE_URL / window.SUPABASE_KEY
// 3) localStorage overrides (SUPABASE_URL / SUPABASE_KEY)
(function bootstrapAppConfig(global) {
  function isPlaceholder(value) {
    if (!value) return true;
    const upper = String(value).toUpperCase();
    return upper.includes("REMPLACE") || upper.includes("CHANGE_ME");
  }

  const existing = global.APP_CONFIG || {};
  const storageUrl = global.localStorage?.getItem("SUPABASE_URL") || "";
  const storageKey = global.localStorage?.getItem("SUPABASE_KEY") || "";

  const supabaseUrl = existing.SUPABASE_URL || global.SUPABASE_URL || storageUrl || "";
  const supabaseKey = existing.SUPABASE_KEY || global.SUPABASE_KEY || storageKey || "";

  global.APP_CONFIG = {
    ...existing,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_KEY: supabaseKey,
  };

  global.getSupabaseConfig = function getSupabaseConfig() {
    return {
      supabaseUrl: global.APP_CONFIG.SUPABASE_URL || "",
      supabaseKey: global.APP_CONFIG.SUPABASE_KEY || "",
    };
  };

  global.hasSupabaseConfig = function hasSupabaseConfig() {
    const { supabaseUrl: url, supabaseKey: key } = global.getSupabaseConfig();
    return !isPlaceholder(url) && !isPlaceholder(key);
  };
})(window);
