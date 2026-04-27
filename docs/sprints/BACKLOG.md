# Sprints — backlog (idées pour itérations futures)

Sont notés ici les sujets soulevés en cours de sprint mais non couverts dans le sprint en cours. Réordonner par priorité au moment du planning.

---

## Sprint 4 candidat — `feat/admin-gm-live-events`

- **QCM scénario** — table `qcm` (énoncé / options / bonne réponse / push à un sous-ensemble de la party). Capture des réponses et révélation contrôlée par le GM.
- **Votes live** — table `votes` + popup côté joueur via Realtime, agrégation côté GM avec barres de progression en temps réel.
- **Effets d'état temporaires** — étourdi, paralysé, ralenti, etc. avec timer de tour qui se décrémente automatiquement et expire la condition. Visible côté joueur sur la fiche.

---

## Authentification

### Gmail / Google OAuth (priorité moyenne)
**Ce que ça apporte** : suppression du couple email/mot de passe au profit du flux Google, élimination des oublis de mot de passe, signup en 1 clic.

**Implémentation Supabase** :
1. Dans Supabase Dashboard → **Authentication → Providers → Google** : activer, renseigner `Client ID` et `Client Secret` (créer un OAuth Client côté Google Cloud Console, projet dédié).
2. **Authorized redirect URI** côté Google Cloud : `https://<project>.supabase.co/auth/v1/callback`.
3. Côté Next.js — sur la page `/login`, ajouter un bouton "Continuer avec Google" qui appelle :
   ```ts
   await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo: `${location.origin}/auth/callback` },
   });
   ```
4. Créer une route `/auth/callback` (Server Component ou Route Handler) qui finalise le code-exchange, puis redirige vers `/fiches`.
5. Le trigger côté DB qui crée la ligne `public.users` à partir de `auth.users` continue de fonctionner (Google signup déclenche le même `INSERT` sur `auth.users`).

**Points d'attention** :
- Le compte créé par OAuth démarre en `status='pending'` comme un signup classique → l'admin doit toujours valider.
- `email_confirmed_at` est rempli automatiquement par Google → pas de double-validation email.
- Migration utilisateur : un compte email existant peut-il "lier" Google ? Par défaut Supabase considère que les deux providers sont distincts s'ils partagent l'email seulement s'ils ont la même `auth.users.id`. À tester.

**Tickets implicites** :
- Activation provider côté Supabase
- Bouton "Continuer avec Google" sur `/login`
- Route `/auth/callback`
- Documentation utilisateur (README.md prod) sur le flux

---

## Performance / observabilité

- **Pagination des persos** : actuellement `select('*')` global côté admin. Au-delà de quelques centaines, ajouter pagination ou cursor-based fetch.
- **Auto-purge `jets_des`** : un job nightly qui supprime les jets > 30 jours pour borner le volume. Ou rétention par session.

## UX

- **Vue admin → fiche détail d'un joueur** : aujourd'hui le clic sur un perso dans l'onglet Personnages ne navigue pas (le route `/fiches/[id]` filtre par `user_id = auth.uid()`). Ajouter un mode `?asAdmin=1` qui by-pass le filtre et affiche en lecture seule + actions GM.
- **Multi-sessions GM** : aujourd'hui une seule session active à la fois. Pour des campagnes parallèles, permettre N sessions actives + sélecteur.
