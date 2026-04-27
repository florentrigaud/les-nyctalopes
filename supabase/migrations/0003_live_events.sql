-- =============================================================================
-- Sprint 4 — Événements live (QCM, votes, effets d'état)
-- À exécuter après 0002_admin_personnages_access.sql.
-- Idempotente.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. live_events : table polymorphe pour QCM + votes
-- ---------------------------------------------------------------------------

create table if not exists public.live_events (
  id                uuid primary key default gen_random_uuid(),
  gm_session_id     uuid not null references public.gm_sessions(id) on delete cascade,
  gm_id             uuid references auth.users(id) on delete set null,
  kind              text not null check (kind in ('qcm', 'vote')),
  prompt            text not null,
  options           jsonb not null,                              -- ["Option A", "Option B", ...]
  correct_index     int,                                         -- null pour kind='vote', requis pour 'qcm'
  target_perso_ids  uuid[] not null default '{}',                -- vide = broadcast à toute la party
  opens_at          timestamptz not null default now(),
  closes_at         timestamptz,                                 -- null = encore ouvert
  revealed          boolean not null default false,              -- GM a-t-il révélé la réponse ?
  created_at        timestamptz not null default now()
);

create index if not exists live_events_session_idx on public.live_events(gm_session_id);
create index if not exists live_events_open_idx on public.live_events(gm_session_id, closes_at) where closes_at is null;

-- ---------------------------------------------------------------------------
-- 2. live_event_responses : une ligne par (event, user). UPSERT-friendly.
-- ---------------------------------------------------------------------------

create table if not exists public.live_event_responses (
  id            bigint generated always as identity primary key,
  event_id      uuid not null references public.live_events(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  perso_id      uuid references public.personnages(id) on delete set null,
  choice_index  int not null,
  responded_at  timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists live_event_responses_event_idx on public.live_event_responses(event_id);

-- ---------------------------------------------------------------------------
-- 3. status_effects : effets temporaires sur un perso
-- ---------------------------------------------------------------------------

create table if not exists public.status_effects (
  id            uuid primary key default gen_random_uuid(),
  perso_id      uuid not null references public.personnages(id) on delete cascade,
  name          text not null,
  description   text,
  applied_by    uuid references auth.users(id) on delete set null,
  applied_at    timestamptz not null default now(),
  expires_at    timestamptz,                                    -- null = jusqu'à clear manuel
  cleared_at    timestamptz                                      -- non-null = effet retiré
);

create index if not exists status_effects_perso_active_idx
  on public.status_effects(perso_id) where cleared_at is null;

-- ---------------------------------------------------------------------------
-- 4. (Helper retiré — la logique de visibilité est inlinée dans la policy
--     live_events_select_target ci-dessous, parce que Postgres n'accepte pas
--     `public.live_events` comme argument row composite à l'intérieur d'une
--     RLS policy on the same table — ça déclenche 42P01 missing FROM clause.)
-- ---------------------------------------------------------------------------

drop function if exists public.is_event_target(public.live_events, public.personnages);

-- ---------------------------------------------------------------------------
-- 5. RLS — activation
-- ---------------------------------------------------------------------------

alter table public.live_events           enable row level security;
alter table public.live_event_responses  enable row level security;
alter table public.status_effects        enable row level security;

-- ---------------------------------------------------------------------------
-- 6. RLS — live_events
-- ---------------------------------------------------------------------------

drop policy if exists live_events_admin_all     on public.live_events;
drop policy if exists live_events_select_target on public.live_events;

create policy live_events_admin_all on public.live_events
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Un user voit un event si l'un de ses persos est dans la session de l'event
-- ET (broadcast OU explicitement ciblé). Logique inlinée — voir bloc 4 plus
-- haut pour la raison.
create policy live_events_select_target on public.live_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.gm_sessions s
      join public.personnages p on p.id = any(s.character_ids)
      where s.id = live_events.gm_session_id
        and p.user_id = auth.uid()
        and (
          cardinality(live_events.target_perso_ids) = 0
          or p.id = any(live_events.target_perso_ids)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 7. RLS — live_event_responses
-- ---------------------------------------------------------------------------

drop policy if exists ler_select_own       on public.live_event_responses;
drop policy if exists ler_select_admin     on public.live_event_responses;
drop policy if exists ler_insert_own       on public.live_event_responses;
drop policy if exists ler_update_own       on public.live_event_responses;

create policy ler_select_own on public.live_event_responses
  for select to authenticated
  using (auth.uid() = user_id);

create policy ler_select_admin on public.live_event_responses
  for select to authenticated
  using (public.is_admin(auth.uid()));

create policy ler_insert_own on public.live_event_responses
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Permettre au joueur de changer sa réponse tant que l'event n'est pas clos
create policy ler_update_own on public.live_event_responses
  for update to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.live_events e
      where e.id = live_event_responses.event_id
        and e.closes_at is null
    )
  )
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 8. RLS — status_effects
-- ---------------------------------------------------------------------------

drop policy if exists status_effects_admin_all   on public.status_effects;
drop policy if exists status_effects_select_own  on public.status_effects;

create policy status_effects_admin_all on public.status_effects
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Un joueur voit les effets sur ses propres persos.
create policy status_effects_select_own on public.status_effects
  for select to authenticated
  using (
    exists (
      select 1 from public.personnages p
      where p.id = status_effects.perso_id
        and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 9. Realtime — best effort
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_events'
  ) then
    begin execute 'alter publication supabase_realtime add table public.live_events';
    exception when others then raise notice 'live_events realtime: %', sqlerrm;
    end;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_event_responses'
  ) then
    begin execute 'alter publication supabase_realtime add table public.live_event_responses';
    exception when others then raise notice 'live_event_responses realtime: %', sqlerrm;
    end;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'status_effects'
  ) then
    begin execute 'alter publication supabase_realtime add table public.status_effects';
    exception when others then raise notice 'status_effects realtime: %', sqlerrm;
    end;
  end if;
end$$;
