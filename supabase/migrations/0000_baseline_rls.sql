-- =============================================================================
-- Baseline RLS — Les Nyctalopes
-- À exécuter en premier sur Supabase Dashboard → SQL Editor (idempotente).
-- Pré-requis : tables existantes (races, classes, personnages, users) avec
-- les colonnes documentées dans CLAUDE.md.
-- =============================================================================

-- 1. Helper SECURITY DEFINER pour éviter la récursion RLS sur public.users -----

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin and (is_validated is not false)
     from public.users where id = uid),
    false
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- 2. Activation RLS ------------------------------------------------------------

alter table public.races       enable row level security;
alter table public.classes     enable row level security;
alter table public.personnages enable row level security;
alter table public.users       enable row level security;

-- 3. races / classes : lecture seule pour user authentifié --------------------

drop policy if exists races_read on public.races;
create policy races_read on public.races
  for select to authenticated using (true);

drop policy if exists classes_read on public.classes;
create policy classes_read on public.classes
  for select to authenticated using (true);

-- 4. personnages : owner-scoped CRUD ------------------------------------------

drop policy if exists personnages_select_own on public.personnages;
create policy personnages_select_own on public.personnages
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists personnages_insert_own on public.personnages;
create policy personnages_insert_own on public.personnages
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists personnages_update_own on public.personnages;
create policy personnages_update_own on public.personnages
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists personnages_delete_own on public.personnages;
create policy personnages_delete_own on public.personnages
  for delete to authenticated using (auth.uid() = user_id);

-- 5. users : self-read + admin-read + admin-update (sauf soi-même) ------------

drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select to authenticated using (auth.uid() = id);

drop policy if exists users_select_admin on public.users;
create policy users_select_admin on public.users
  for select to authenticated using (public.is_admin(auth.uid()));

drop policy if exists users_update_admin on public.users;
create policy users_update_admin on public.users
  for update to authenticated
  using (public.is_admin(auth.uid()) and auth.uid() <> id)
  with check (public.is_admin(auth.uid()) and auth.uid() <> id);
