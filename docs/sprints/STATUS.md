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
