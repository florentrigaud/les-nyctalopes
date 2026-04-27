# Les Nyctalopes — Next.js

Portage Next.js 15 (App Router + TypeScript) de l'app statique `../index.html`. Hébergement Vercel, persistance Supabase.

## Développement local

```bash
cd web
cp .env.local.example .env.local
# édite .env.local avec tes clés Supabase
npm install
npm run dev
```

Ouvre `http://localhost:3000`. Le middleware redirige vers `/login` si non authentifié, et vers `/fiches` une fois connecté.

## Variables d'environnement

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon Supabase |

Les deux sont exposées au navigateur (préfixe `NEXT_PUBLIC_`) — la clé anon Supabase est conçue pour ça ; la sécurité repose sur les policies RLS.

## Déploiement Vercel

1. Depuis le dashboard Vercel → **Add New Project** → importe ce repo.
2. **Root Directory** : `web`.
3. Framework auto-détecté : Next.js. Commandes par défaut OK (`next build`).
4. **Environment Variables** : ajoute `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` pour Production / Preview / Development.
5. Deploy.

Pour les previews de PR, Vercel utilise les mêmes env si tu les as cochées pour l'environnement Preview.

## Structure

```
web/
  middleware.ts            # redirige vers /login si non auth, /fiches sinon
  app/
    layout.tsx             # html/body + globals.css
    page.tsx               # redirect /fiches
    globals.css            # CSS porté depuis ../index.html
    login/page.tsx         # login + register (client)
    (app)/
      layout.tsx           # check session + Topbar (server)
      fiches/page.tsx              # liste
      fiches/[id]/page.tsx         # détail (server, charge data + races/classes)
      fiches/[id]/FicheView.tsx    # orchestrateur client (tabs + save)
      fiches/[id]/sections/*.tsx   # Carac, NiveauXp, PvSlider, Combat, Comp, Equip, Capas, Desc
      creer/page.tsx + CreerForm.tsx
      admin/page.tsx + AdminList.tsx
  components/
    Topbar.tsx
  lib/
    supabase/{client,server,middleware}.ts
    pathfinder.ts          # mod, ms, parseRaces/Classes, hydratePersonnage
    types.ts
```

## Parité fonctionnelle avec l'app statique

| Feature | Statut |
|---|---|
| Login / register / logout | ✅ |
| Liste des fiches | ✅ |
| Création d'une fiche | ✅ |
| Détail fiche (lecture) | ✅ |
| Édition Niveau / XP / alignement / divinité | ✅ |
| Édition caractéristiques | ✅ |
| Édition combat (PV, CA, BBA, BMO, saves, initiative) | ✅ |
| Slider PV live avec autosave debounce | ✅ |
| Édition compétences (table + classe +3) | ✅ |
| Édition dons | ✅ |
| Édition armes | ✅ |
| Édition inventaire (recalcul poids total) | ✅ |
| Édition richesses | ✅ |
| Édition notes libres capacités | ✅ |
| Édition description + historique + XP | ✅ |
| Validation admin (double-gate + anti auto-validation) | ✅ |
| Vue Wiki | ❌ (lien Pathfinder-FR externe suffit) |

## Base de données

Tables attendues (identiques à l'app statique) :
- `races`, `classes` : lecture
- `personnages` : `id, user_id, nom, race_id, classe_id, niveau, edition, data_json`
- `users` : `id, email, is_validated, is_admin`

Les policies RLS doivent être configurées côté Supabase — voir `../SECURITY_CHECKLIST.md`. Sans RLS, n'importe quel utilisateur authentifié peut tout lire/écrire.
