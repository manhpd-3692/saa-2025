# Spec review decision brief (2026-11-10) — for spec editors

Source of truth: `spec/gap-resolution-log.md` rows G01–G19, AD01–AD13, X01–X05. All 12 features stay in release one (G05); nothing is deferred.

## Product rules
- Hearts (F008): the kudo SENDER may not heart their own kudo; the recipient and everyone else may (G06). One heart per Sunner per kudo; pressing again withdraws it (G07). Secret boxes go to the kudo SENDER: boxes granted = high-water mark of floor(weighted hearts received on their sent kudos / 5); never revoked, so withdraw + re-heart cannot farm boxes.
- Campaign multiplier (G08, G14): `campaigns.multiplier` integer 2–10 (default 2) entered in the F012 form. A heart's weight is fixed when given = highest multiplier among campaigns active at that instant, else 1. The weighted total is THE heart number everywhere (card display, box progress, Highlight/Quốc Dân ranking, profile, admin totals). `hearts.campaign_id` nullable, `on delete set null` (X04).
- Secret Box draw (G09): exactly one icon per box, equal 1/6 odds, repeats allowed.
- Highlight = Kudos Quốc Dân (G12): one ranking — public kudos by weighted hearts desc, newer wins ties, top 5. Highlight filters (Hashtag / Phòng ban) rank inside the filtered set. No separate Quốc Dân surface.
- No admin "Có <x> lời nhắn cần bạn xem xét!" notice; the `review_requested` kind is removed; kudos publish as Public immediately (G10).
- Homepage countdown counts to new column `events.ceremony_at` (seeded); the Countdown page and launch gate use `events.start_at` (G13). Default event start 15 Dec 2025 18:00 Asia/Ho_Chi_Minh (AD03).
- Anonymous kudos: real sender visible to admins only (G04); an anonymous kudo still counts toward the recipient's hero-badge distinct senders (AD05).
- A new kudo notifies its recipient (`kudo_received`) after commit, best-effort (X01).

## Architecture (G15–G19, AD13) — rewrite technical specs to this
- Repo: Next.js 16 App Router stays at the repo root and is FRONTEND ONLY. Go backend module in `backend/` (`backend/cmd/api`, `backend/internal/<domain>`, `backend/db/queries` for sqlc). Router: Go stdlib `net/http` ServeMux (Go 1.22+ method/path patterns). REST JSON under `/api/v1/...` served by Go.
- Next.js never touches the database. Server Components call the Go API server-side; Client Components call it from the browser with the Supabase access token as `Authorization: Bearer`. No Server Actions or Next route handlers for business data (a Next route handler remains only for the Supabase OAuth callback). `proxy.ts` (Next 16 name for middleware) only routes: launch-gate redirect (reads Go `GET /api/v1/events/current`, cached in-process 60 s) and sign-in redirect.
- Auth (G17): Supabase Auth Google OAuth run by Next.js (`@sun-asterisk.com` only, G01). Go middleware verifies the JWT against Supabase JWKS and loads `users.role` (F002 profile table) on each request; admins are seeded by email (G02). Admin endpoints under `/api/v1/admin/...` require role admin in Go (403 otherwise).
- Data (G18): Go services own all business logic inside Go transactions; sqlc-generated queries over pgx. The Postgres functions / `security definer` RPCs from the drafts are REPLACED by Go service methods + sqlc queries. Exception: `kudo_heart_state` may stay a plain SQL view (weighted totals) read by sqlc queries. Browser roles have no table grants; RLS enabled deny-all as defence in depth. Migrations via Supabase CLI (`supabase/migrations`).
- Anonymous mask (X05, supersedes G11): one Go helper `maskSender(kudo, viewer)` in the read layer, used by every endpoint that returns kudos.
- Images: Go issues a Supabase Storage signed upload URL; the browser uploads directly; Go stores paths and returns signed read URLs.
- Notifications: shared Go `NotificationService.Create(...)`, called after commit by the producing service; failure is logged and never blocks the caller.
- Cache: no Redis. Dynamic data `no-store`; static pages built per locale.

## Editing rules
- Spec prose in English. Keep every existing H2/H3 heading and its order (the lint depends on them); keep `### N.N Artifact References`; never add `fcode:`; never write hyphenated codes like `US-001` / `F-001` / `BL-001` (screen slugs `SCR-<name>` are fine).
- functional-spec `## 3. Open Decisions`: keep the table; rewrite each row's "Default proposal" cell into the RESOLVED answer followed by `— resolved (Gxx)` or `— resolved (applied default ADxx)`; set "Blocks work" to `no`; remove `[NEEDS_DOMAIN_CONFIRMATION]` tags that are now resolved. Rows superseded by a grill decision state the grill answer, not the old default.
- Update FRs, BRs, scenarios, edge cases, risks/open questions and screen specs that contradict a decision. Do not invent features.
- technical-spec: rewrite workspace/overview, action catalogue rows, BE lines and data-access notes to Go (`METHOD /api/v1/...` → `` `XxxHandler#method` (planned) `` in `backend/internal/<domain>`, services, sqlc queries); replace Postgres function names; FE lines stay Next.js but call Go endpoints. Close open questions the decisions answer.
- Touch only your owned folders. Do not commit.
