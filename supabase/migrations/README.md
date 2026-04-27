# Supabase migrations

Fichiers SQL à exécuter manuellement dans **Supabase Dashboard → SQL Editor**, dans l'ordre numérique. Chaque fichier est idempotent (rerun safe).

| Ordre | Fichier | Rôle |
|---|---|---|
| `0000` | [0000_baseline_rls.sql](0000_baseline_rls.sql) | Helper `is_admin()` + activation RLS + policies de base sur `races`, `classes`, `personnages`, `users`. |
| `0001` | [0001_admin_gm.sql](0001_admin_gm.sql) | Sprint 3 : extension `users.status`, tables `groupes` / `gm_sessions` / `jets_des`, policies, Realtime. Voir [docs/sprints/sprint-3-admin-gm.md](../../docs/sprints/sprint-3-admin-gm.md). |
| `0002` | [0002_admin_personnages_access.sql](0002_admin_personnages_access.sql) | Sprint 3 (T4/T5/T7) : policies admin select/update sur `personnages`. |
| `0003` | [0003_live_events.sql](0003_live_events.sql) | Sprint 4 : tables `live_events`, `live_event_responses`, `status_effects` + RLS + Realtime. Voir [docs/sprints/sprint-4-live-events.md](../../docs/sprints/sprint-4-live-events.md). |

## Workflow

1. Ouvrir le Dashboard Supabase du projet.
2. **SQL Editor** → New query.
3. Coller le contenu du `.sql` (sans header de snippet — coller seulement le fichier).
4. Run. Si tout est vert, passer au suivant.

## Activer Realtime manuellement (après `0001` et `0003`)

Le SQL Editor de Supabase plante sur les blocs `do $$ ... $$` selon les versions (« syntax error at end of input »), donc l'activation Realtime se fait **à la main** :

1. **Database → Replication → `supabase_realtime` publication**.
2. Coche les 5 tables suivantes :
   - `public.personnages` (sprint 3, T8)
   - `public.jets_des` (sprint 3, T10)
   - `public.live_events` (sprint 4, T7)
   - `public.live_event_responses` (sprint 4, T5)
   - `public.status_effects` (sprint 4, T10)
3. Save.

## Promotion admin

Après que le compte admin a fait son signup :

```sql
update public.users
   set is_admin = true, status = 'validated'
 where email = '<email-admin>';
```

(Le trigger `users_sync_status_and_validated` mettra `is_validated = true` automatiquement.)
