# Sprint 3 — audit de sécurité (T11)

Audit des chemins d'écriture côté `/admin` et de leur garde RLS effective. Le check côté UI (`lib/admin-guard.ts`) est de la défense en profondeur ; la frontière réelle reste les policies RLS Supabase, qui valident chaque requête peu importe le client.

## Tableau récapitulatif

| Action UI | Table cible | Policy RLS engagée | Garde-fou supplémentaire |
|---|---|---|---|
| Valider / refuser un compte | `public.users` UPDATE | `users_update_admin` (`is_admin(auth.uid()) AND auth.uid() <> id`) | UI bloque le bouton si self ; backfill `refused_reason`. |
| Modifier le pseudo | `public.users` UPDATE | `users_update_admin` | UI désactivée en legacy mode. |
| Lire la liste des inscriptions | `public.users` SELECT | `users_select_admin` (`is_admin(auth.uid())`) | Fallback sur `users_select_self` si pas admin. |
| Vue globale des personnages | `public.personnages` SELECT | `personnages_select_admin` (migration 0002) | Sans RLS admin → l'admin ne voit que ses propres fiches. |
| Assigner un perso à un groupe | `public.personnages` UPDATE | `personnages_update_admin` (migration 0002) | — |
| Créer / renommer / supprimer un groupe | `public.groupes` ALL | `groupes_write` (`is_admin(auth.uid())`) | FK `personnages.groupe_id ON DELETE SET NULL` empêche les orphelins. |
| Créer / clôturer / éditer une session GM | `public.gm_sessions` ALL | `gm_sessions_write_admin` | Lecture limitée aux membres via `gm_sessions_read_member`. |
| Mutations `data_json` (PV, XP, items, dons, notes) | `public.personnages` UPDATE | `personnages_update_admin` | Optimistic UI avec rollback ; pas d'upsert (force `eq('id', …)`). |
| Insertion d'un jet de dés | `public.jets_des` INSERT | `jets_des_insert_own` (`auth.uid() = user_id`) | Le client ne peut pas spoofer le `user_id` (forcé via `auth.getUser()`). |
| Lecture du feed des jets | `public.jets_des` SELECT | `jets_des_select_admin` ∪ `jets_des_select_own` | Un joueur non-admin ne voit que ses propres jets. |

## Vérifications manuelles à exécuter avant prod

1. **Token non-admin → endpoint admin** :
   ```bash
   # Avec un JWT user simple (pas admin) :
   curl -H "Authorization: Bearer <jwt>" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$SUPABASE_URL/rest/v1/users?select=*"
   # Doit ne renvoyer que la propre ligne du user (users_select_self).
   ```
2. **Insert spoofé sur jets_des** :
   ```bash
   curl -X POST -H "Authorization: Bearer <jwt-userA>" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"user_id":"<jwt-userB-uuid>","formule":"1d20","resultat":42}' \
     "$SUPABASE_URL/rest/v1/jets_des"
   # Doit échouer sur `with check (auth.uid() = user_id)`.
   ```
3. **UPDATE personnages d'autrui depuis un user non-admin** :
   ```bash
   curl -X PATCH -H "Authorization: Bearer <jwt-non-admin>" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"data_json":{}}' \
     "$SUPABASE_URL/rest/v1/personnages?id=eq.<perso-d-un-autre>"
   # Doit échouer (personnages_update_own + auth.uid() = user_id).
   ```

## Rappels

- **Aucune utilisation de `service_role` côté Next** : la clé `service_role` contournerait toutes les policies RLS et n'a rien à faire dans `web/`. Seule `NEXT_PUBLIC_SUPABASE_ANON_KEY` est exposée.
- **`is_admin(auth.uid())` est une fonction `security definer`** (cf. `0000_baseline_rls.sql`) — elle évite la récursion RLS et ne révèle pas plus que ce que prévu.
- **Helper UI [`checkAdmin`](../../web/lib/admin-guard.ts)** : à utiliser dans toute future Server Action ou Route Handler avant d'autoriser un effet de bord. Ne pas remplacer les RLS par ce check.
