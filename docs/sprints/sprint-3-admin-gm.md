# Sprint 3 — `/admin` Game Master Panel

**Branche** : `feat/admin-gm-panel` (depuis `feat/nextjs-port`)
**Démarrage** : 2026-04-27
**Durée cible** : ~7 jours de dev
**App concernée** : Next.js (`web/`) uniquement. La version statique `index.html` n'évolue plus dans ce sprint.

---

## Objectif

Transformer `/admin` (aujourd'hui une simple liste d'inscriptions en attente) en un cockpit GM live à 4 onglets, avec un schéma DB étendu pour les groupes, sessions GM, et jets de dés. Permettre au GM de piloter une partie en direct depuis le navigateur.

---

## Décisions prises (en amont du sprint)

| # | Sujet | Décision |
|---|---|---|
| D1 | Migration `is_validated` → `status` | **Dual-sync via trigger** — `users.status` (`pending` / `validated` / `refused`) devient la colonne canonique, `is_validated` est maintenue par trigger pour ne rien casser côté legacy. |
| D2 | Composition d'une session GM | **Personnalisable en live** — une session n'est pas figée à un groupe ; le GM ajoute/retire n'importe quel perso à la volée. Les `groupes` servent au filtrage / organisation, pas à la composition. |
| D3 | Realtime | **Activé** sur `personnages` et `jets_des` (Database → Replication côté Supabase). |
| D4 | Refus d'inscription | **Soft** : `status='refused'` + raison optionnelle. Le compte n'est pas supprimé. |
| D5 | Limite de party | **Configurable** — `gm_sessions.max_size`, défaut 6. |

---

## Schéma DB — deltas

### Colonnes ajoutées

| Table | Colonne | Type | Note |
|---|---|---|---|
| `users` | `status` | text | `'pending' \| 'validated' \| 'refused'` — colonne canonique |
| `users` | `refused_reason` | text | nullable |
| `users` | `pseudo` | text | nullable, nom du joueur affichable |
| `personnages` | `groupe_id` | uuid | FK → `groupes.id`, nullable |

### Tables ajoutées

| Table | Rôle |
|---|---|
| `groupes` | Étiquettes d'organisation des personnages (campagnes, factions…). |
| `gm_sessions` | Sessions GM live : sélection de N personnages pour l'action en cours. |
| `jets_des` | Historique des jets de dés des joueurs (lecture filtrée par fenêtre temporelle). |

Migration idempotente : [supabase/migrations/0001_admin_gm.sql](../../supabase/migrations/0001_admin_gm.sql)

### RLS deltas

- `groupes`, `gm_sessions` : admin = full CRUD ; user authentifié = `select` only.
- `jets_des` : user `insert` / `select` ses propres jets ; admin `select` tout.

---

## Architecture cible — 4 onglets

```
/admin
├── Inscriptions   ← T3
├── Personnages    ← T4 + T5
├── Session live   ← T6 + T7 + T8
└── Jets de dés    ← T9 + T10
```

Layout = composant `AdminTabs` client (state local), pages serveur pour le gating et le pre-fetch de la donnée initiale, puis composants client par onglet pour les interactions et les souscriptions Realtime.

---

## Tickets

### Bloc 1 — Fondations

#### T1 — Migration schéma + RLS
- **Livrable** : `supabase/migrations/0001_admin_gm.sql` exécuté sur le projet Supabase.
- **Acceptance** : toutes les colonnes/tables/policies en place ; backfill `status` cohérent avec `is_validated` ; trigger de sync vérifié sur un update test ; Realtime activé sur `personnages` et `jets_des` (via dashboard).

#### T2 — Refacto layout en onglets
- **Livrable** : `web/app/(app)/admin/page.tsx` (server, gate inchangée) + `AdminTabs.tsx` (client, state d'onglet) + 4 fichiers `tabs/{Inscriptions,Personnages,Session,Jets}Tab.tsx`.
- **Acceptance** : navigation entre onglets fluide ; URL hash (`#inscriptions`, `#personnages`…) pour deep-link ; placeholders sur les 3 nouveaux onglets ; logique de validation existante migrée dans `InscriptionsTab` sans régression.

### Bloc 2 — Inscriptions

#### T3 — Onglet Inscriptions complet
- **Livrable** : table filtrable (`pending` / `validated` / `refused` / tous), actions Valider / Refuser (avec raison) / Modifier (pseudo, email).
- **Acceptance** : refus marque `status='refused'` + raison ; validation passe `status='validated'` ; modification pseudo persiste ; auto-validation toujours interdite (perso `auth.uid() <> id`) ; messages d'erreur lisibles.

### Bloc 3 — Personnages

#### T4 — Onglet Personnages : table globale
- **Livrable** : table tous personnages (joueur, perso, race, classe, niveau, groupe). Filtres : groupe, joueur, recherche texte. Tri par colonne.
- **Acceptance** : pagination ou virtualisation au-delà de 100 lignes ; race/classe résolues via les lookup tables ; lien vers la fiche détail au clic.

#### T5 — CRUD `groupes` + assignation
- **Livrable** : modal "Gérer les groupes" (créer / renommer / supprimer) + sélecteur de groupe sur chaque ligne du tableau.
- **Acceptance** : création/renommage/suppression persistés ; assignation update `personnages.groupe_id` ; suppression d'un groupe met les `groupe_id` à `null` (FK `on delete set null`).

### Bloc 4 — Session live (cœur du sprint)

#### T6 — Création / chargement de session GM
- **Livrable** : panneau "Session active" avec création d'une nouvelle session (`nom`, `max_size` configurable) + reprise de la session ouverte la plus récente.
- **Acceptance** : `gm_sessions` row créée à `started_at = now()` ; `character_ids` initialement vide ; bouton "Clôturer" set `ended_at`.

#### T7 — Vue détaillée perso en session + actions GM
- **Livrable** : grille de cartes pour chaque perso de la session, avec :
  - PV bar (slider GM)
  - XP delta (`+/− N`)
  - Donner objet (modal → push `data_json.inventaire`)
  - Donner don (modal → push `data_json.dons`)
  - Note capacité libre (textarea → `data_json.notes_capacites`)
- **Acceptance** : toute action update `personnages.data_json` côté server ; UI optimiste avec rollback sur erreur ; max_size respecté à l'ajout.

#### T8 — Realtime side-joueur
- **Livrable** : hook `usePersonnageRealtime(perso_id)` côté pages joueur ; abonnement à la row `personnages` correspondante.
- **Acceptance** : modif GM visible côté joueur en < 2 s sans refresh ; déconnexion propre au unmount ; pas de leak de canal.

### Bloc 5 — Jets de dés

#### T9 — `DiceRoller` écrit dans `jets_des`
- **Livrable** : extension de `web/components/DiceRoller.tsx` pour persister chaque jet (`user_id`, `perso_id` si en contexte fiche, `formule`, `resultat`, `detail`, `contexte`).
- **Acceptance** : insert non-bloquant (UI ne ralentit pas) ; échec silencieux loggé en console ; jet local toujours affiché même si insert échoue.

#### T10 — Onglet Jets de dés (feed live)
- **Livrable** : feed trié desc, filtres (joueur, perso, groupe, fenêtre 5min/1h/session active), abonnement Realtime sur `jets_des`.
- **Acceptance** : nouveau jet apparaît en tête en < 2 s ; auto-purge visuelle au-delà de la fenêtre choisie ; export CSV des jets de la session active (bonus).

### Bloc 6 — Finitions

#### T11 — Garde-fou admin renforcé
- **Livrable** : helper `requireAdmin(supabase)` côté server ; appel systématique avant toute écriture privilégiée ; audit que les RLS suffisent (les checks client sont défense en profondeur).
- **Acceptance** : un appel direct REST avec un JWT non-admin est rejeté pour toute écriture sur `users`, `groupes`, `gm_sessions`.

#### T12 — QA pass + doc
- **Livrable** : run-through manuel complet (validation → assignation groupe → création session → action GM → réception côté joueur → jet → feed). Mise à jour de [README.md](../../web/README.md) parité table.
- **Acceptance** : pas de régression sur le flow existant (CRUD perso, login) ; entrée Sprint dans `docs/sprints/STATUS.md` (à créer si absent).

---

## Hors-sprint (sprint 4 prévu : `feat/admin-gm-live-events`)

- **QCM scénario** : table `qcm`, push au joueur via Realtime, capture des réponses.
- **Votes live** : table `votes`, popup côté joueur, agrégation côté GM.
- **Effets d'état temporaires** (étourdi, paralysé…) avec timer de tour.

---

## Risques & mitigations

| Risque | Mitigation |
|---|---|
| Replication Supabase non activée → Realtime silencieux | Checklist T1 inclut activation explicite + smoke test (insert manuel + écoute via console). |
| RLS récursive sur `users` (helper admin) | Fonction SQL `is_admin()` `security definer` déjà introduite dans `0001_admin_gm.sql`. |
| `data_json` corrompu par actions GM concurrentes | Utiliser des updates atomiques ciblés sur les chemins JSON (`jsonb_set`) plutôt que rewrite complet de la colonne — voir T7. |
| Volume jets_des explosif | Index `(created_at desc)` + limite UI à 200 lignes par défaut. Nettoyage au sprint suivant si besoin. |

---

## Suivi d'avancement

À chaque ticket terminé, mettre à jour `docs/sprints/STATUS.md` (ligne par ticket : ✅ / 🚧 / ❌ + lien commit).
