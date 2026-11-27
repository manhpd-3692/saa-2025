# SAA 2025 — Sun* Annual Awards website

Internal website for Sun* Annual Awards 2025 ("Root Further"): countdown and launch gate,
homepage, award system, Sun* Kudos (live board, hearts, secret boxes), Sunner profiles,
notifications and an admin area. Sign-in is Google OAuth restricted to `@sun-asterisk.com`.

## Stack

| Part | Where | Role |
|---|---|---|
| Frontend | repo root (`src/`) | Next.js 16 (App Router), React 19, Tailwind 4. Presentation only: it never reads or writes the database. |
| API | `backend/` | Go REST API, `/api/v1`. Owns every business read/write and all authorization. |
| Data/Auth | `supabase/` | Local Supabase: Google OAuth, Postgres (migrations + seed), private Storage. |

Architecture: [`docs/system-architecture.md`](docs/system-architecture.md).

## Prerequisites

- Node.js and npm (frontend)
- Docker (local Supabase)
- Go 1.25+, Supabase CLI, sqlc. On the reference machine these run inside WSL Ubuntu; see the
  toolchain section of [`backend/README.md`](backend/README.md).

## Quick start

Full first-time setup (signing key, Google OAuth, `.env` values) is in
[`backend/README.md`](backend/README.md) under "Local Supabase (first time)". Short version, from the
repo root:

```sh
supabase start                                        # migrations + units seed + kudo-images bucket
# give the saa_api role a login (re-run after every `supabase db reset`)
set -a; . backend/.env; set +a
docker exec -i supabase_db_saa-2025 psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -v saa_api_password="$SAA_API_DB_PASSWORD" < backend/scripts/dev-db-role.sql
(cd backend && set -a && . ./.env && set +a && go run ./cmd/seed)   # SEED_SCENARIO=prelaunch|live|after-ceremony
(cd backend && set -a && . ./.env && set +a && go run ./cmd/api)    # API on :8080, GET /healthz
cp .env.example .env.local                            # fill the NEXT_PUBLIC_* and API_BASE_URL values
npm install
npm run dev                                           # frontend
```

Frontend variables (names only, see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_BASE_URL`, `API_BASE_URL`. Only the
publishable key belongs in the frontend; never a service/secret key.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (`vitest run`) |
| `npm run e2e:session` | Write local test sessions for Playwright (no Google login) |
| `npm run test:e2e` | Playwright against the running local stack, one worker; see [`e2e/README.md`](e2e/README.md) |

Backend checks (`go build`, `go vet`, `go test`, integration tests, `sqlc generate`) are listed in
[`backend/README.md`](backend/README.md).

## Documentation

- [`docs/system-architecture.md`](docs/system-architecture.md) — architecture as implemented
- [`docs/project-changelog.md`](docs/project-changelog.md) — what each phase delivered
- [`e2e/README.md`](e2e/README.md) — Playwright setup, local test sessions, specs
- [`docs/SCREENFLOW.md`](docs/SCREENFLOW.md) — screen flow overview; per-screen specs in `docs/screen-specs/`
- [`backend/README.md`](backend/README.md) — Go API: layout, local setup, route classes, adding routes
- [`plans/261109-1626-saa-2025-website/plan.md`](plans/261109-1626-saa-2025-website/plan.md) — phased implementation plan
