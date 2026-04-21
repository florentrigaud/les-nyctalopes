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

## Controle securite
Voir `SECURITY_CHECKLIST.md`.
