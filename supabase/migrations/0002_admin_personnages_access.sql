-- =============================================================================
-- Sprint 3 — Admin read/write sur personnages (T4 / T5 / T7)
-- À exécuter après 0001_admin_gm.sql.
-- =============================================================================

-- Lecture : un admin voit toutes les fiches (pour la table globale + GM live).
drop policy if exists personnages_select_admin on public.personnages;
create policy personnages_select_admin on public.personnages
  for select to authenticated
  using (public.is_admin(auth.uid()));

-- Écriture : un admin peut modifier toutes les fiches (assignation groupe,
-- actions GM live : XP, PV, items, dons, capacités).
drop policy if exists personnages_update_admin on public.personnages;
create policy personnages_update_admin on public.personnages
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Pas de delete admin — les joueurs gardent la main sur la suppression de leurs
-- propres fiches via personnages_delete_own (du baseline RLS).
