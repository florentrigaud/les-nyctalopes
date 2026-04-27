import type { SupabaseClient } from '@supabase/supabase-js';

export type AdminCheckResult =
  | { ok: true; userId: string; email: string | undefined }
  | { ok: false; reason: 'unauthenticated' | 'not_admin' | 'not_validated' };

/**
 * Vérifie que l'utilisateur courant est admin et validé. Tolère le schéma
 * legacy (is_validated booléen) et le schéma post-0001 (status enum). À
 * appeler côté server (Server Component, Server Action ou Route Handler).
 *
 * Note de sécurité : les écritures privilégiées passent toutes par les
 * policies RLS définies dans supabase/migrations/. Cette vérification est
 * une défense en profondeur côté UI — la frontière effective reste RLS.
 */
export async function checkAdmin(supabase: SupabaseClient): Promise<AdminCheckResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'unauthenticated' };

  const { data: me } = await supabase
    .from('users')
    .select('is_admin, status, is_validated')
    .eq('id', user.id)
    .maybeSingle();

  if (!me?.is_admin) return { ok: false, reason: 'not_admin' };

  const status = (me as { status?: string }).status;
  const isValidated =
    typeof status === 'string'
      ? status === 'validated'
      : (me as { is_validated?: boolean }).is_validated !== false;
  if (!isValidated) return { ok: false, reason: 'not_validated' };

  return { ok: true, userId: user.id, email: user.email };
}
