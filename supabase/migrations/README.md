# Supabase migrations

Fichiers SQL à exécuter manuellement dans **Supabase Dashboard → SQL Editor**, dans l'ordre numérique. Chaque fichier est idempotent (rerun safe).

| Ordre | Fichier | Rôle |
|---|---|---|
| `0000` | [0000_baseline_rls.sql](0000_baseline_rls.sql) | Helper `is_admin()` + activation RLS + policies de base sur `races`, `classes`, `personnages`, `users`. |
| `0001` | [0001_admin_gm.sql](0001_admin_gm.sql) | Sprint 3 : extension `users.status`, tables `groupes` / `gm_sessions` / `jets_des`, policies, Realtime. Voir [docs/sprints/sprint-3-admin-gm.md](../../docs/sprints/sprint-3-admin-gm.md). |

## Workflow

1. Ouvrir le Dashboard Supabase du projet.
2. **SQL Editor** → New query.
3. Coller le contenu du `.sql` (sans header de snippet — coller seulement le fichier).
4. Run. Si tout est vert, passer au suivant.

## Vérifier que Realtime est bien activé (post-`0001`)

Dans **Database → Replication → `supabase_realtime` publication**, vérifier que `personnages` et `jets_des` sont cochés. Le bloc `do $$ ... $$` du `0001` tente de les ajouter automatiquement, mais selon les permissions du projet ça peut échouer silencieusement (un `notice` apparaît alors).

## Promotion admin

Après que le compte admin a fait son signup :

```sql
update public.users
   set is_admin = true, status = 'validated'
 where email = '<email-admin>';
```

(Le trigger `users_sync_status_and_validated` mettra `is_validated = true` automatiquement.)
