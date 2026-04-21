# Security Checklist (Sprint 1)

## Immediate Controls
- Do not hardcode Supabase URL/key in committed HTML/JS.
- Load runtime config from `window.APP_CONFIG` or local storage only.
- Deny admin page access by default when role verification fails.
- Require `users.is_admin = true` before admin actions.
- Re-check admin rights before every write action in admin flow.
- Escape dynamic values rendered in HTML attributes/textarea content.

## Supabase RLS Baseline
Apply strict Row Level Security policies before production.

### `personnages`
- `SELECT`: user can read only rows where `auth.uid() = user_id`
- `INSERT`: user can insert only rows where `auth.uid() = user_id`
- `UPDATE`: user can update only rows where `auth.uid() = user_id`
- `DELETE`: user can delete only rows where `auth.uid() = user_id`

### `users`
- `SELECT`: user can read only own row, admins can read all
- `UPDATE`: only admins can validate users (`is_validated`)
- `INSERT`: handled by trusted backend or controlled trigger

### `races` and `classes`
- `SELECT`: allow authenticated read-only access
- `INSERT/UPDATE/DELETE`: admin-only

## Manual Verification Steps
1. Open app without config and verify login is blocked with explicit message.
2. Log in as non-admin user and verify `/admin.html` redirects to `/index.html`.
3. Log in as admin and verify pending users list loads.
4. Attempt write action with revoked admin role and verify action is blocked.
5. Confirm no Supabase key appears in committed files (`git grep "SUPABASE_KEY"`).
