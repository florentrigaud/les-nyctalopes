# Sprint 4 — Événements live (QCM, votes, effets d'état)

**Branche** : `feat/admin-gm-live-events` (depuis `main`)
**Démarrage** : 2026-04-27
**Durée cible** : ~5-6 jours de dev
**Préreq** : Sprint 3 livré (gm_sessions, jets_des, Realtime activé).

---

## Objectif

Étendre le cockpit GM avec des **événements live** que le GM pousse en direct vers les joueurs en session, avec popup côté joueur et agrégation live côté GM.

3 types d'événements visés :
- **QCM** scénario : question + N options + bonne réponse cachée. Sert à faire évoluer l'univers selon les réponses.
- **Vote** : prompt + N options sans bonne réponse. Sert à trancher en groupe (« on franchit le pont ou on cherche un détour ? »).
- **Effet d'état temporaire** : applique un état (paralysé, étourdi, ralenti…) avec timer auto-décrémenté.

---

## Décisions prises

| # | Sujet | Décision |
|---|---|---|
| D1 | Granularité des tables | **Une table polymorphe `live_events`** + `live_event_responses` : flexible et léger. QCM et votes partagent la structure (prompt + options + réponse), seul `kind` diffère. Les effets d'état utilisent une table dédiée car la sémantique est très différente (durée, perso ciblé, pas de réponse). |
| D2 | Cible d'un event | **Sous-ensemble de la party active** (`target_perso_ids` nullable = broadcast). Permet de questionner uniquement les magiciens, ou un seul perso. |
| D3 | Popup joueur | **Bloquante mais réductible**. Apparition automatique via Realtime, peut être minimisée (badge en topbar pour la rouvrir), reste visible jusqu'à réponse ou fermeture par le GM. |
| D4 | Révélation | **Côté GM uniquement** : il choisit quand `closes_at` est posé et peut ensuite révéler la bonne réponse (QCM) ou afficher les agrégats (votes) aux joueurs en pushant un payload `revealed: true`. |
| D5 | Anonymat des votes | Les votes restent **non-anonymes côté GM** (il voit qui a voté quoi pour modérer). Optionnellement on pourra masquer côté affichage joueur. |

---

## Schéma DB — deltas

### Tables ajoutées

```sql
live_events (
  id              uuid pk default gen_random_uuid(),
  gm_session_id   uuid fk gm_sessions(id) on delete cascade,
  gm_id           uuid fk auth.users(id),
  kind            text check (kind in ('qcm','vote')),
  prompt          text not null,
  options         jsonb not null,       -- ["Option A", "Option B", ...]
  correct_index   int,                  -- null pour 'vote', set pour 'qcm'
  target_perso_ids uuid[] not null default '{}',  -- vide = toute la party
  opens_at        timestamptz default now(),
  closes_at       timestamptz,          -- null = encore ouvert
  revealed        boolean default false, -- GM a-t-il révélé la réponse ?
  created_at      timestamptz default now()
);

live_event_responses (
  id            bigint pk identity,
  event_id      uuid fk live_events(id) on delete cascade,
  user_id       uuid fk auth.users(id),
  perso_id      uuid fk personnages(id) on delete set null,
  choice_index  int not null,
  responded_at  timestamptz default now(),
  unique (event_id, user_id)
);

status_effects (
  id           uuid pk default gen_random_uuid(),
  perso_id     uuid fk personnages(id) on delete cascade,
  name         text not null,            -- "Paralysé", "Étourdi", etc.
  description  text,
  applied_by   uuid fk auth.users(id),
  applied_at   timestamptz default now(),
  expires_at   timestamptz,              -- null = permanent jusqu'à dispel
  cleared_at   timestamptz               -- non-null = effet retiré
);
```

### RLS

- `live_events` : admin = full CRUD ; user = SELECT si `auth.uid()` est dans une row `personnages` dont `id ∈ target_perso_ids` (ou si `target_perso_ids` est vide ET le perso est dans la session active).
- `live_event_responses` : user INSERT ses propres réponses (avec check `user_id = auth.uid()`) ; admin SELECT toutes ; user SELECT seulement ses propres réponses.
- `status_effects` : admin full CRUD ; user SELECT s'il est propriétaire du `perso_id` ciblé.

### Realtime

Ajouter `live_events`, `live_event_responses`, `status_effects` à la publication `supabase_realtime`.

---

## Tickets

### Bloc 1 — Fondations (J1)

#### S4-T1 — Migration 0003_live_events.sql
Schéma + RLS + Realtime publication.

#### S4-T2 — Hook `useLiveEvents(sessionId, persoId)` côté joueur
Souscrit aux INSERT/UPDATE sur `live_events` filtré par session active. Renvoie les events ouverts adressés au joueur courant.

### Bloc 2 — QCM et votes côté GM (J2-J3)

#### S4-T3 — Onglet "Événements" dans la session GM
Nouveau panneau dans `SessionTab` (ou nouveau sub-tab) listant les events de la session, avec bouton "Lancer un QCM" / "Lancer un vote".

#### S4-T4 — Composer un événement
Modal : prompt + add/remove options + sélection de la cible (toute la party / sous-sélection). Pour QCM : sélecteur de la bonne réponse. INSERT sur `live_events`.

#### S4-T5 — Vue temps réel d'un event en cours
Pour chaque event ouvert, afficher : barre de progression par option (count + %), liste des joueurs qui ont répondu vs en attente. Souscription Realtime sur `live_event_responses`.

#### S4-T6 — Clôturer + révéler
Boutons "Clôturer" (set `closes_at`) et "Révéler" (set `revealed=true`) sur chaque event. Une fois révélé, les joueurs voient la bonne réponse (QCM) ou les agrégats (vote).

### Bloc 3 — Popup côté joueur (J4)

#### S4-T7 — Composant `LiveEventPopup`
Affiché en overlay quand un event ouvert est adressé au joueur. Peut être minimisé en badge dans la topbar. INSERT sur `live_event_responses` à la soumission. Rerender à la révélation.

#### S4-T8 — Intégration dans le layout `(app)`
Le popup vit dans le layout pour être visible peu importe la page consultée.

### Bloc 4 — Effets d'état (J5)

#### S4-T9 — Composer / appliquer un effet d'état
Bouton dans `PartyCard` "Appliquer un effet" → modal (nom, description, durée). INSERT sur `status_effects` avec `expires_at = now() + duration`.

#### S4-T10 — Affichage côté joueur (fiche)
Section "États en cours" sur la fiche perso. Auto-refresh / Realtime pour expirations. Compte à rebours visible.

#### S4-T11 — Auto-clear côté GM
Job côté UI (interval) qui nettoie les effets dont `expires_at < now()` en mettant `cleared_at = now()`. Fait depuis n'importe quel onglet GM ouvert (best-effort).

### Bloc 5 — Finitions (J6)

#### S4-T12 — QA + doc + STATUS update
Test manuel complet, mise à jour de la table de parité dans `web/README.md`, entrée Sprint 4 dans `STATUS.md`.

---

## Hors-sprint

- Anonymat configurable des votes
- Templates d'events sauvegardables (« questionnaire d'introduction », « vote de confiance »…)
- Historique des events archivés consultable hors session

---

## Risques & mitigations

| Risque | Mitigation |
|---|---|
| Popup joueur intrusif si trop d'events simultanés | Limiter à 1 event "bloquant" actif à la fois ; les autres en file d'attente avec badge. |
| Spam de réponses (un joueur change d'avis 50 fois) | UNIQUE constraint sur `(event_id, user_id)` + UPSERT pour update propre. |
| RLS sur `live_events` complexe (intersection target/session) | Helper SQL `is_event_visible(event_id, user_id)` SECURITY DEFINER pour simplifier les policies. |
