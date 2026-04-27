-- =============================================================================
-- Sprint 3 — Admin GM Panel — schéma + RLS
-- À exécuter dans Supabase Dashboard → SQL Editor (idempotente).
-- Pré-requis : 0000_baseline_rls.sql (la requête RLS de base déjà passée).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extension users : status canonique + pseudo + raison de refus
-- ---------------------------------------------------------------------------

alter table public.users add column if not exists status         text;
alter table public.users add column if not exists refused_reason text;
alter table public.users add column if not exists pseudo         text;

-- Backfill : dérive status à partir de l'ancien is_validated.
update public.users
   set status = case
                  when is_validated is true  then 'validated'
                  when is_validated is false then 'pending'
                  else 'pending'
                end
 where status is null;

alter table public.users
  alter column status set default 'pending',
  alter column status set not null;

-- Garde-fou de cohérence
alter table public.users drop constraint if exists users_status_check;
alter table public.users
  add constraint users_status_check
  check (status in ('pending', 'validated', 'refused'));

-- Trigger de dual-sync : maintient is_validated <-> status pour ne rien casser
-- côté legacy index.html (qui écrit encore sur is_validated).
create or replace function public.users_sync_status_and_validated()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status is null then
      new.status := case when new.is_validated is true then 'validated' else 'pending' end;
    end if;
    if new.is_validated is null then
      new.is_validated := (new.status = 'validated');
    end if;
    return new;
  end if;

  -- UPDATE : si l'un change, on aligne l'autre.
  if new.is_validated is distinct from old.is_validated
     and new.status is not distinct from old.status then
    new.status := case when new.is_validated is true then 'validated' else 'pending' end;
  end if;

  if new.status is distinct from old.status
     and new.is_validated is not distinct from old.is_validated then
    new.is_validated := (new.status = 'validated');
  end if;

  return new;
end;
$$;

drop trigger if exists users_sync_status_and_validated on public.users;
create trigger users_sync_status_and_validated
  before insert or update on public.users
  for each row execute function public.users_sync_status_and_validated();

-- ---------------------------------------------------------------------------
-- 2. Table groupes (étiquettes d'organisation)
-- ---------------------------------------------------------------------------

create table if not exists public.groupes (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  description text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.personnages
  add column if not exists groupe_id uuid;

-- FK avec on delete set null : si on supprime un groupe, les persos restent.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'personnages_groupe_id_fkey'
      and conrelid = 'public.personnages'::regclass
  ) then
    alter table public.personnages
      add constraint personnages_groupe_id_fkey
      foreign key (groupe_id) references public.groupes(id) on delete set null;
  end if;
end$$;

create index if not exists personnages_groupe_id_idx on public.personnages(groupe_id);

-- ---------------------------------------------------------------------------
-- 3. Table gm_sessions (sessions GM live)
-- ---------------------------------------------------------------------------

create table if not exists public.gm_sessions (
  id             uuid primary key default gen_random_uuid(),
  nom            text not null,
  max_size       int  not null default 6 check (max_size > 0 and max_size <= 12),
  character_ids  uuid[] not null default '{}',
  created_by     uuid references auth.users(id) on delete set null,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz
);

create index if not exists gm_sessions_open_idx on public.gm_sessions(started_at desc) where ended_at is null;

-- ---------------------------------------------------------------------------
-- 4. Table jets_des (historique des jets, alimentée par DiceRoller)
-- ---------------------------------------------------------------------------

create table if not exists public.jets_des (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  perso_id   uuid references public.personnages(id) on delete set null,
  contexte   text,
  formule    text not null,
  resultat   int  not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create index if not exists jets_des_created_at_idx on public.jets_des(created_at desc);
create index if not exists jets_des_user_id_idx    on public.jets_des(user_id);
create index if not exists jets_des_perso_id_idx   on public.jets_des(perso_id);

-- ---------------------------------------------------------------------------
-- 5. RLS — activation
-- ---------------------------------------------------------------------------

alter table public.groupes     enable row level security;
alter table public.gm_sessions enable row level security;
alter table public.jets_des    enable row level security;

-- ---------------------------------------------------------------------------
-- 6. RLS — policies
--    (réutilise la fonction public.is_admin(uuid) du baseline RLS)
-- ---------------------------------------------------------------------------

-- groupes : tout user authentifié peut lire (pour afficher le nom du groupe
-- d'un perso côté joueur). Seul un admin peut écrire.
drop policy if exists groupes_read     on public.groupes;
drop policy if exists groupes_write    on public.groupes;

create policy groupes_read on public.groupes
  for select to authenticated using (true);

create policy groupes_write on public.groupes
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- gm_sessions : lecture pour user authentifié si son perso fait partie de la
-- session (pour afficher un éventuel badge "en partie"). Sinon admin only.
drop policy if exists gm_sessions_read_admin   on public.gm_sessions;
drop policy if exists gm_sessions_read_member  on public.gm_sessions;
drop policy if exists gm_sessions_write_admin  on public.gm_sessions;

create policy gm_sessions_read_admin on public.gm_sessions
  for select to authenticated using (public.is_admin(auth.uid()));

create policy gm_sessions_read_member on public.gm_sessions
  for select to authenticated
  using (
    exists (
      select 1 from public.personnages p
      where p.user_id = auth.uid()
        and p.id = any(public.gm_sessions.character_ids)
    )
  );

create policy gm_sessions_write_admin on public.gm_sessions
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- jets_des : owner insert/select ses propres jets ; admin read all ; pas
-- d'update/delete pour personne (les jets sont historiques, donc immuables).
drop policy if exists jets_des_select_own    on public.jets_des;
drop policy if exists jets_des_select_admin  on public.jets_des;
drop policy if exists jets_des_insert_own    on public.jets_des;

create policy jets_des_select_own on public.jets_des
  for select to authenticated using (auth.uid() = user_id);

create policy jets_des_select_admin on public.jets_des
  for select to authenticated using (public.is_admin(auth.uid()));

create policy jets_des_insert_own on public.jets_des
  for insert to authenticated
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 7. Realtime — à activer manuellement.
-- ---------------------------------------------------------------------------
-- Va dans Supabase Dashboard → Database → Replication →
--   publication "supabase_realtime" → coche :
--     - public.personnages
--     - public.jets_des
-- (Le bloc DO automatique a été retiré : il déclenchait des "syntax error
-- at end of input" dans certaines versions du SQL Editor Supabase.)
