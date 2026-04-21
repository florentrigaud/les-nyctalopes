# CLAUDE.md

## Scope
This repository is a static web app for Pathfinder character sheets ("Les Nyctalopes") with Supabase-backed auth and persistence.

## Current Architecture
- Main app: `index.html`
  - Contains most UI, CSS, and JS inline (single-file app, ~1400 lines).
  - Uses Supabase JS SDK from CDN.
  - Loads shared runtime config from `src/js/config.global.js`.
  - Includes lightweight debug helpers (`?debug=1`, `handleUiError`, safe input readers).
  - Handles auth, character CRUD, and in-app editing flows directly in inline functions.
- Admin app: `admin.html`
  - Loads `src/css/style.css`.
  - Loads shared runtime config from `src/js/config.global.js`.
  - Uses module scripts in `src/js/` (`admin.js`, `auth.js`, etc.).
- Extra files:
  - `src/js/config.global.js` and `src/js/config.js` are the single source for Supabase runtime config.
  - `src/js/ui.js`, `src/js/data.js`, `src/js/utils.js` exist but are not currently imported by `index.html`.
  - `src/templates/header.html` and `src/templates/footer.html` are static fragments and are not auto-injected.

## Runtime / Local Dev
- No build system, no package manager, no test runner.
- Fast local check: open `index.html` directly.
- Recommended for realistic behavior (auth/session/CORS-safe): run a local HTTP server from repo root.
  - Example: `python -m http.server 8000`
  - Then open `http://localhost:8000/index.html`

## Supabase Expectations
Code references these tables/fields:
- `races` (read)
- `classes` (read)
- `personnages` (read/write) with at least:
  - `id`, `user_id`, `nom`, `race_id`, `classe_id`, `niveau`, `edition`, `data_json`
- `users` (admin flow) with at least:
  - `id`, `email`, `is_validated` (and optional `is_admin`)

Auth flows use Supabase email/password (`signInWithPassword`, `signUp`, `signOut`, `getSession`/`getUser`).

## Editing Guidance
- Treat `index.html` as the source of truth for the main app today.
- Prefer small, targeted edits over broad rewrites.
- Keep naming and labels in French to match existing UX.
- Preserve visual tokens and CSS variable system unless a full theme refactor is requested.
- If migrating to modular JS/CSS, do it intentionally as a full step (do not leave half-inline/half-module drift).
- When injecting dynamic values in `innerHTML`, escape user-provided content first (use `esc()` pattern).

## Known Risks / Debt
- Significant logic duplication risk between inline app code and `src/js/*`.
- Encoding inconsistencies are visible in terminal output; keep files in UTF-8 consistently.
- Security posture still depends on Supabase RLS quality; keep `SECURITY_CHECKLIST.md` in sync with schema changes.

## Suggested Next Refactor Order
1. Extract inline JS from `index.html` into `src/js/` modules with parity tests/manual checks.
2. Extract inline CSS from `index.html` into `src/css/style.css` and remove duplication.
3. Add a minimal smoke-test checklist for auth + character CRUD + admin validation flow.
4. Replace direct DB writes from browser with RPC/endpoints for privileged admin actions.
