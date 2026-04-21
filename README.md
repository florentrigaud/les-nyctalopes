# Les Nyctalopes - Fiches Pathfinder

Application web statique pour gerer des fiches de personnages Pathfinder.

## Demarrage local
1. Lance un serveur HTTP dans le dossier du projet:
   - `python -m http.server 8000`
2. Ouvre:
   - `http://localhost:8000/index.html`
   - `http://localhost:8000/admin.html`
   - Debug UI: `http://localhost:8000/index.html?debug=1`

## Configuration Supabase
Les credentials ne sont plus hardcodes.

Option A (rapide, local browser):
```js
localStorage.setItem('SUPABASE_URL', 'https://<project>.supabase.co');
localStorage.setItem('SUPABASE_KEY', '<anon-key>');
```

Option B (runtime): injecter avant `src/js/config.global.js`:
```html
<script>
  window.APP_CONFIG = {
    SUPABASE_URL: 'https://<project>.supabase.co',
    SUPABASE_KEY: '<anon-key>'
  };
</script>
```

## Fonctionnalites
- Auth email/mot de passe via Supabase
- Creation/modification de fiches
- Ecran admin avec verification stricte du role admin
- Mode debug UI via `?debug=1` (logs console cibles)

## Etat Actuel (Surface)
- Sprint 1: extraction config Supabase + suppression des credentials hardcodes.
- Sprint 2: garde-fous UI/formulaires + debug leger + corrections formulaire de modification.

## QA Rapide
Checks manuels/headless executes:
1. Message explicite si config Supabase absente.
2. Chargement des helpers debug en mode `?debug=1`.
3. Echappement HTML des valeurs dynamiques (`esc()`).
4. Formulaire de modification Competences robuste.
5. Formulaire de modification Description robuste.

## Controle securite
Voir `SECURITY_CHECKLIST.md`.
