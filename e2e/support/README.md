# e2e/support

## create-local-test-session.ts (local only)

Creates logged-in Playwright storage states without the Google OAuth screen.

```sh
npm run e2e:session   # = node e2e/support/create-local-test-session.ts (Node 22.18+/26 strips types)
```

Writes `playwright/.auth/user.json` (demo user `sunner01.demo@sun-asterisk.com`) and
`playwright/.auth/admin.json` (`saa.admin.e2e@sun-asterisk.com`, role admin). Both are gitignored.
Use them with `test.use({ storageState: "playwright/.auth/user.json" })`.

What it does:

1. Refuses to run unless `SUPABASE_URL` (default `http://127.0.0.1:54321`) and `API_BASE_URL`
   (default `http://localhost:8080`) are `127.0.0.1` or `localhost`.
2. Signs an ES256 access token with `supabase/signing_keys.json` (claims shaped like a GoTrue Google
   sign-in token, 7-day expiry) and checks its `kid` is published in the local JWKS.
3. Through `docker exec ... psql` in the Supabase DB container (`wsl docker` on Windows; override the
   container name with `SAA_DB_CONTAINER`) it idempotently creates the admin in `auth.users` +
   `auth.identities` (Google, `email_verified` true) and one `auth.sessions` row per user, so GoTrue
   `getUser()` accepts the token too.
4. Writes the `@supabase/ssr` cookie `sb-127-auth-token` (`base64-` + base64url session JSON, chunked
   `.0`, `.1` above 3180 chars) for `localhost` and `127.0.0.1`.
5. Calls `POST /api/v1/me/provision` with the admin token, so the real Go code creates the `users` row
   and assigns role admin from `ADMIN_EMAILS` (the API's env file must list
   `saa.admin.e2e@sun-asterisk.com`; restart the API after changing it). A 404 or an unreachable API
   only prints a warning; re-run the script once the endpoint is up.

Re-run it after `supabase db reset` or a reseed (the demo seed recreates the demo users and drops
their sessions). The regular user's `users` row comes from the demo seed (`go run ./cmd/seed`).

This is test tooling only: it adds no bypass route or flag to the app, and Go still verifies every
token through the JWKS. Never import it from `src/`, never point it at a hosted project.
