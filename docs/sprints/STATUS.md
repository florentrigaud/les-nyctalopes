# Sprints — statut

Index des sprints avec état d'avancement de chaque ticket. Mettre à jour à chaque commit principal.

## Sprint 3 — `/admin` Game Master Panel
**Branche** : `feat/admin-gm-panel`
**Plan** : [sprint-3-admin-gm.md](sprint-3-admin-gm.md) · **Audit sécurité** : [sprint-3-security-audit.md](sprint-3-security-audit.md)

| Ticket | Statut | Commit |
|---|---|---|
| T1 — Migration schéma + RLS (`0001_admin_gm.sql`) | ✅ | `a779ff4` |
| T2 — Refacto `/admin` en tabs shell | ✅ | `a779ff4` |
| T3 — Onglet Inscriptions (refus + raison, édition pseudo, filtres) | ✅ | `15608fb` |
| T4 — Onglet Personnages (table globale + filtres + tri) | ✅ | `85b4fc1` |
| T5 — CRUD groupes + assignation inline | ✅ | `85b4fc1` |
| T6 — Création / chargement / clôture session GM | ✅ | `f70c5db` |
| T7 — Vue détail perso + actions GM (PV / XP / items / dons / notes) | ✅ | `f70c5db` |
| T8 — Realtime côté joueur (sync fiche en direct) | ✅ | `3676f27` |
| T9 — DiceRoller persiste dans `jets_des` | ✅ | `6917b41` |
| T10 — Onglet Jets de dés (feed live + filtres) | ✅ | `8fd593c` |
| T11 — Garde-fou admin renforcé (`checkAdmin` + audit RLS) | ✅ | `91d2b1f` |
| T12 — QA pass + doc finale | ✅ | _ce commit_ |

### Verrous side-effects à vérifier sur Supabase avant la prod
1. Exécuter dans l'ordre : `0000_baseline_rls.sql` → `0001_admin_gm.sql` → `0002_admin_personnages_access.sql`.
2. Vérifier que `personnages` et `jets_des` sont cochés dans **Database → Replication → `supabase_realtime`** (la migration tente de les ajouter en best-effort).
3. Promouvoir le compte GM admin via `update public.users set is_admin = true, status = 'validated' where email = '<email>';`.
4. Auth → URL Configuration : ajouter le domaine de prod dans Site URL et Redirect URLs.

### Notes pour le sprint suivant (`feat/admin-gm-live-events`)
- QCM scénario : table `qcm` (énoncé / options / bonne réponse / push à un sous-ensemble de la party).
- Votes live : table `votes` + popup côté joueur via Realtime.
- Effets d'état temporaires (paralysé, étourdi…) avec timer.

---

## Sprint 4 — Événements live (QCM, votes, effets d'état)
**Branche** : `feat/admin-gm-live-events`
**Plan** : [sprint-4-live-events.md](sprint-4-live-events.md)

| Ticket | Statut | Commit |
|---|---|---|
| S4-T1 — Migration `0003_live_events.sql` | ✅ | `7e972a7` |
| S4-T2 — Hook `useLiveEvents` côté joueur | ✅ | `fd87262` |
| S4-T3 — Sub-panel Événements dans SessionTab | ✅ | `fd87262` |
| S4-T4 — Composer QCM/vote | ✅ | `fd87262` |
| S4-T5 — Vue temps réel des réponses (counts + pending) | ✅ | `fd87262` |
| S4-T6 — Clôturer + révéler (QCM/vote) | ✅ | `fd87262` |
| S4-T7 — Popup `LiveEventPopup` côté joueur | ✅ | `fd87262` |
| S4-T8 — Intégration popup dans le layout `(app)` | ✅ | `fd87262` |
| S4-T9 — Appliquer un effet d'état (GM via `StatusEffectsBar`) | ✅ | _ce commit_ |
| S4-T10 — Affichage des états côté joueur (FicheView) | ✅ | _ce commit_ |
| S4-T11 — Auto-clear des effets expirés (interval 15 s) | ✅ | _ce commit_ |
| S4-T12 — QA build + doc | ✅ | _ce commit_ |

### Migration à exécuter sur Supabase avant la prod (sprint 4)
- [supabase/migrations/0003_live_events.sql](../../supabase/migrations/0003_live_events.sql)
- Vérifier que `live_events`, `live_event_responses`, `status_effects` apparaissent dans **Database → Replication → `supabase_realtime`** (le bloc `do $$` les ajoute en best-effort).

---

## Améliorations post-sprint 4

| Sujet | Statut | Commit |
|---|---|---|
| FicheView : autosave global 800 ms (silencieux, `mirrorColumns`, anti-écho Realtime) | ✅ | _ce commit_ |

- Tout changement local de `perso` est désormais persisté après 800 ms d'inactivité, sans toast.
- `lastSavedRef` (référence du dernier état sauvegardé) coupe les double-saves quand une section enfant a déjà appelé `save` directement.
- `lastRealtimeRef` empêche le client de re-pousser une modif reçue du MJ (anti-boucle Realtime, fenêtre 1500 ms).
- `mirrorColumns: true` est systématique sur l'autosave pour garder `niveau`/`edition` cohérents avec `data_json`.
