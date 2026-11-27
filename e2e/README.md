# End-to-end tests (Playwright)

Browser tests run against the **locally running stack**; Playwright does not start servers.

| Service | URL | How it runs |
|---|---|---|
| Next.js | http://localhost:3000 | `npm run dev` |
| Go API | http://localhost:8080 | `cd backend && go run ./cmd/api` (WSL, `backend/.env` loaded) |
| Supabase | http://127.0.0.1:54321 | `supabase start` (WSL), seeded with `SEED_SCENARIO=live` |

## Signed-in state: local test session (no Google login)

Google OAuth cannot be automated and no real OAuth client is configured locally, so tests never
click through Google. Instead a **local-only** script signs a Supabase-shaped access token with the
local signing key and writes the `@supabase/ssr` session cookie as a Playwright storage state:

```sh
npm run e2e:session      # writes playwright/.auth/user.json and playwright/.auth/admin.json
```

Details and safety rules: `e2e/support/README.md` (refuses non-loopback hosts, adds no bypass route
or flag to the app; Go still verifies every token through the JWKS and loads the role from `users`).
The files under `playwright/.auth/` are gitignored. Re-run the script after `supabase db reset` or a
reseed.

`playwright.config.ts` uses `playwright/.auth/user.json` as the default storage state when the file
exists. Admin screens opt in with `test.use({ storageState: "playwright/.auth/admin.json" })`. Tests
that need a session skip with a hint when the file is missing.

## Run

```sh
npx playwright install chromium   # once per machine
npm run test:e2e                  # all specs
npx playwright test e2e/browser-transport-smoke.spec.ts
```

Overrides: `E2E_BASE_URL` (default http://localhost:3000), `E2E_API_BASE_URL` (default
http://localhost:8080; must be an origin listed in the API's `FRONTEND_ORIGINS` for the frontend
side). Reports and traces go to `logs/playwright/` (gitignored).

## Specs

| Spec | Covers |
|---|---|
| `browser-transport-smoke.spec.ts` | F002 SC-009 (Codex R06): from a page on the frontend origin, GET/POST/PATCH/PUT/DELETE and an `Idempotency-Key` header reach Go with a bearer token (no cookies); preflight answered 204 without a JWT for allowed origins only; a page on another origin is blocked by the browser. Requests are picked so they change no data. |

## Open items

- **Manual real-Google check** (phase 02 success criteria): sign in with a real company Google
  account and land on `/` with exactly one `users` row; a non-company account returns to Login with
  `domain_not_allowed`. Needs a Google OAuth client in `supabase/.env`; not automatable.
- **Claim locations (gap log C06)**: confirm a real GoTrue Google token carries
  `app_metadata.provider = "google"` and `providers = ["google"]` during that manual run.
- F002 SC-009 also lists the F010 CSV export (`Content-Disposition` readable from JS); that endpoint
  arrives in phase 11, which extends this smoke.
