# Gap Resolution Log (Spec Stage 3)

Decisions answered by the user, applied across feature drafts. Date: 2026-11-10.

| # | Question | Answer | Affects |
|---|----------|--------|---------|
| G01 | Which Google accounts may sign in? | Company email domain only (`@sun-asterisk.com`) | F002 |
| G02 | How does a user become admin? | Seed by email (seed / env list), no role-management UI | F002, F010 |
| G03 | Event start time source | Stored in DB (`events`), set via seed | F003, F004 |
| G04 | Who may see the real sender of an anonymous kudo? | Admins only | F005, F006, F007, F009, F011 |

Scope note from the user (2026-11-10): the course daily report tracks 8 categories — Login, Homepage SAA, Hệ thống giải, Countdown Prelaunch, Đa ngôn ngữ, Sun* Kudos, Viết Kudos, Like Kudos. See docs/SCREENFLOW.md § Course Checklist Categories.

## Grill session 2026-11-10 (spec review)

| # | Question | Options shown | Answer | Rationale | Affects |
|---|----------|---------------|--------|-----------|---------|
| G05 | Which features are in release one? | F001–F006 + heart part of F008 (Recommended) / + full F008 / + F011 moderation / keep all 12 | Keep all 12 features | User wants the full system; no feature is deferred, so every open decision and cross-spec contract (F009 notifications, F011 masking, F012 multiplier) must be resolved | F001–F012 |
| G06 | May a Sunner heart a kudo they sent or received? | Sender may not, recipient may (Recommended) / neither sender nor recipient / allow all | Sender may not, recipient may | Blocks self-pumping of hearts and secret boxes while letting the recipient react | F008, F006, F007 |
| G07 | How many hearts per Sunner per kudo, and can a heart be withdrawn? | One heart, press again to withdraw (Recommended) / one heart, permanent / multiple hearts | One heart, press again to withdraw | Familiar like-toggle; boxes already granted are kept; box grants follow the high-water mark of floor(counted hearts / 5) so withdraw + re-heart cannot farm boxes | F008, F006, F007, F010 |
| G08 | What does a campaign multiplier (e.g. x2) affect? | Weighted count everywhere (Recommended) / only Secret Box progress / only display + ranking | Weighted count everywhere | One number (`kudo_heart_state` weighted total) drives displayed hearts, box progress, Highlight and Quốc Dân ranking, admin totals; weight fixed at heart time | F008, F006, F007, F010, F012 |
| G09 | Secret Box icon draw rule? | One icon, equal odds, repeats allowed (Recommended) / favour missing icons / rare icons + empty boxes | One icon, equal odds, repeats allowed | Matches the rules-panel text; no odds configuration to build | F008, F010 |
| G10 | Admin notice "Có <x> lời nhắn cần bạn xem xét!" (Hợp lệ / Tạm ẩn / Reject) vs F011's two statuses? | Drop the notice (Recommended) / add a report-a-kudo queue / pre-moderation with Pending status | Drop the notice | Kudos publish as Public immediately; admins use the Review page; `review_requested` kind removed from F009; no pending status | F009, F011 |
| G11 | Where is the anonymous-sender mask enforced? | Postgres read functions (Recommended) / `kudos_public` view / column-level revoke | Postgres read functions | Browser roles get no direct SELECT on `kudos`; every read is a `security definer` function using one shared masking helper (sender null unless viewer is admin) | F005, F006, F007, F008, F009, F011 |
| G12 | Relationship between HIGHLIGHT KUDOS and "Kudos Quốc Dân"? | Highlight = Quốc Dân (Recommended) / Highlight = last-7-days top 5, Quốc Dân separate / admin-pinned Highlight | Highlight = Quốc Dân | One ranking function (weighted hearts desc, newer wins ties, public only); unfiltered Highlight is the Quốc Dân top 5; filters rank within the filtered set; no separate Quốc Dân surface | F006, F008 |
| G13 | What does the Homepage countdown count down to? | Ceremony time `events.ceremony_at` (Recommended) / same `start_at` / drop launch gate, one target | Ceremony time `events.ceremony_at` | Countdown page counts to `start_at` (site opens); Homepage counts to new seeded column `ceremony_at`; at zero shows 00 | F003, F004 |
| G14 | How is the campaign multiplier entered? | Integer field 2–10, default 2 (Recommended) / fixed x2 / parsed from name | Integer field 2–10, default 2 | Explicit `campaigns.multiplier` column F008 reads; overlapping campaigns use the highest multiplier | F012, F008 |
| G15 | Keep the Next.js-only backend (Server Actions, route handlers, Postgres functions) or change? | Keep stack, update specs (Recommended) / add a cache layer | Other: "t muốn backend dùng go" (backend in Go) | Backend logic moves to a Go service; every technical-spec BE line, the action/route catalogue and data-access notes must be rewritten; sub-decisions G16+ settle the shape | F001–F012, system |
| G16 | With a Go backend, what role does Next.js keep? | Next.js frontend only (Recommended) / Next.js as BFF proxying to Go / Go serves HTML, drop Next.js | Next.js frontend only | Next.js renders UI; Server Components call the Go REST API server-side, client components call it from the browser with the user's bearer token; Next.js never touches the database; all business reads/writes and authorization live in Go. `proxy.ts` keeps only routing concerns (launch gate redirect, sign-in redirect) using Go/API data | F001–F012 |
| G17 | Who handles Google OAuth and sessions with a Go backend? | Keep Supabase Auth, Go verifies JWT (Recommended) / Go does OAuth itself / drop Supabase entirely | Keep Supabase Auth, Go verifies JWT | Next.js runs the Supabase Google OAuth flow (G01 domain rule stays); Go verifies the access token against Supabase JWKS and loads role from the `users` profile row (F002) on every request (G02 seeding unchanged); Supabase Postgres and Storage stay | F002, F001, all Go endpoints |
| G18 | Where do data access and business logic live with Go? (revises G11) | Logic in Go, pgx + sqlc (Recommended) / keep Postgres functions, Go calls them / ORM (GORM/ent) | Logic in Go, pgx + sqlc | Go services own rules (anonymous masking as one shared Go helper, weighted hearts, box grants, notifications) inside Go transactions; sqlc-generated queries over pgx; Postgres functions/`security definer` RPCs from the drafts are replaced; browser roles get no table access (RLS deny-all as defence in depth). G11 is superseded: mask enforced in the Go read layer | F005–F012, system |
| G19 | Repo layout with Go? | Keep Next.js at repo root, Go module in `/backend` (Recommended) / monorepo `apps/web` + `apps/api` / separate Go repo | Keep Next.js at repo root, Go module in `/backend` | No move of the existing scaffold; Go layout `backend/cmd/api`, `backend/internal/...`, `backend/db/queries` (sqlc) | system, all technical specs |

Grill stopped 2026-11-10 after G19 (user confirmed "Đồng ý, cập nhật spec"). Remaining open decisions take the draft's default proposal, adjusted only where a G row above overrides it.

### Applied defaults (not asked; draft default proposal adopted)

| # | Feature | Open decisions resolved by default | Overridden by grill rows |
|---|---------|-----------------------------------|--------------------------|
| AD01 | F001 App shell & i18n | D001–D007 (locale in cookie; cookie → Accept-Language → `vi`; JSON dictionaries, no i18n library; desktop only; language switch blocked while the write form is open) | — |
| AD02 | F002 Google auth | D003, D004, D005, D006 | D001 by G01, D002 by G02; session verification by G17 |
| AD03 | F003 Countdown & launch gate | D001–D008; D009 event start = design sample 15 Dec 2025 18:00 Asia/Ho_Chi_Minh until the real value is given | gate data source via Go API (G16) |
| AD04 | F004 Static content | D002–D007 (event info from the `events` row; Vietnamese master; static Kudos teaser; awards as static content; community-standards text transcribed from Figma `1161:8944` at build) | D001 by G13 |
| AD05 | F005 Write kudos | D001–D005, D007–D017 (no self-kudo; senders may create lower-cased de-duplicated hashtags; sanitized HTML stored, sanitized in Go; recipient locked on edit; no edit while spam; anonymous kudo counts toward hero badge; JPEG/PNG/WebP up to 5 MB) | D006 by G04 |
| AD06 | F006 Live board | D002, D004–D012 | D001 by G12/G08, D003 by G04 |
| AD07 | F007 Profiles | D001–D011 | — |
| AD08 | F008 Gamification | D004, D008–D010, D012, D013, D014 (F009 notifies box earned), D015–D017 | D001 by G06, D002/D003 by G07, D005 by G08, D006 by G14, D007 by G09, D011 by G12 |
| AD09 | F009 Notifications | D001, D002, D004 (recipient notified of a new kudo; sender hidden if anonymous), D005–D013 | D003 by G10 |
| AD10 | F010 Admin overview & users | D001–D013 | — |
| AD11 | F011 Moderation | D002–D014 | D001 by G10 |
| AD12 | F012 Campaigns | D002–D011 | D001 by G14 |
| AD13 | Go stack details | stdlib `net/http` router (Go 1.22+ patterns); images uploaded browser → Supabase Storage via a Go-issued signed upload URL; migrations via Supabase CLI (`supabase/migrations`); no Redis; in-process 60 s cache of the event start stays in the Next.js proxy, which reads the Go API | from G15–G19 |
| AD14 | F003/F004 small gaps | `events` also carries `venue` and `livestream_note` for the Homepage event info (follows AD04); the countdown page uses solid semi-transparent boxes when the browser cannot blur | — |
| AD15 | F001/F002 small gaps | 403 page is a plain page rendered by the admin layout (no experimental `forbidden()`); admins seeded through an `ADMIN_EMAILS` list in the Go config (one reading of G02); profile row created by Go `POST /api/v1/me/provision` from the Next `/auth/callback`; `proxy.ts` also refreshes Supabase session cookies (no DB or Go call) | — |

### Cross-spec fixes applied (no question needed)

| # | Inconsistency | Resolution | Affects |
|---|---------------|------------|---------|
| X01 | F005 create kudo did not notify the recipient | Go kudo service calls the shared notification service (`kudo_received`) after commit, best-effort (failure never blocks the kudo, F009 BR-006) | F005, F009 |
| X02 | F006 counted raw hearts | F006 reads the weighted total from F008's `kudo_heart_state` (SQL view over `hearts.weight`) through the shared Go query | F006, F007, F008, F010 |
| X03 | F009 `review_requested` kind had no producer | Kind removed (G10) | F009, F011 |
| X04 | F012 asked for `hearts.campaign_id` nullable `on delete set null` | Adopted in F008's `hearts` model | F008, F012 |
| X06 | F009 sent the spam warning to Community Standards; F011 D005 linked it to the kudo | Notice keeps an inline "Tiêu chuẩn cộng đồng" link; its action button opens the flagged kudo, where F011's alert overlay shows | F009, F011 |
| X07 | Profile "hearts received" vs F010 Total Heart; view column name; hero level-up trigger | Both = sum of `kudo_heart_state.heart_total` over the Sunner's received public kudos; F005 calls F008 `HeroTierService.TierCrossed` after commit for `hero_level_up` | F005, F007, F008, F010 |
| X05 | Anonymous-sender mask layer differed per feature | One Go helper `maskSender(kudo, viewer)` in the read layer (G18 supersedes G11) | F005, F006, F007, F008, F009, F011 |

## Codex review fixes (2026-11-10)

Source: `reports/codex-review-specs-and-plans.md` (findings) and `reports/codex-findings-resolution-contract.md` (authoritative resolutions, approved by the user). Rows summarize the contract; the contract wins on any wording difference.

| # | Finding | Resolution (from the contract) | Affects |
|---|---------|--------------------------------|---------|
| R01 | Anonymous attachments kept the author's user id in the object path | Opaque keys `kudo-images/{uploadId}.{ext}` (random UUID); ownership only in server-side `kudo_uploads` owned by F005; anonymous DTOs, URLs, HTML and filenames carry no stable author identifier; test an anonymous image kudo read by a third user | F005, F006, F007, F009 |
| R02 | Turning a kudo anonymous left the sender in notification history | `PATCH /api/v1/kudos/{id}` turning `is_anonymous` on redacts `senderId`, `senderName`, avatar from that kudo's `notifications.params` in the same Go transaction; reads re-mask by the kudo's current `is_anonymous` for non-admins; turning it off re-adds nothing; already-seen data cannot be recalled | F005, F009 |
| R03 | File limits checked against declarations, not stored objects | Private bucket with 5 MB `file_size_limit` and JPEG/PNG/WebP `allowed_mime_types`; no upsert; Go finalizes each `uploadId` (exists, owned, unattached or on this kudo, stored size/type, 512-byte magic sniff, 0–5 files) else 422 `invalid_attachment`; client sends `uploadId`s, never paths | F005 |
| R04 | Upload cleanup had no API and no attachment-reference safety | `DELETE /api/v1/uploads/{uploadId}` for own unattached uploads (204), attached → 409; one upload attaches to at most one kudo; unsaved uploads deleted on cancel (best-effort, AD05); detached committed images deleted after commit; manual purge of unattached uploads older than 24 h | F005, F006 |
| R05 | F011 loaded the role from `profiles` | Role only from `users.role` via F002's shared auth context and `RequireAdmin`; no `profiles` table anywhere | F002, F011 |
| R06 | Browser-to-Go transport contract incomplete | F002-owned Go CORS middleware before auth: `FRONTEND_ORIGINS`, 204 preflight without JWT, GET/POST/PUT/PATCH/DELETE, headers `Authorization, Content-Type, Idempotency-Key`, exposes `Content-Disposition`, no credentials, max-age 600; bearer token only, no BFF | F002, F003, F005–F012 |
| R07 | Root layout could not choose chrome or active links per route | Root layout = html/body, fonts, locale provider; route groups `(shell)`, `(minimal)`, bare `countdown/`, `admin/layout.tsx` with F010 static nav; client `NavLinks` with `usePathname()`; `/me` fetched server-side `no-store` in shell/admin layouts and re-fetched on window focus; Go still enforces admin calls | F001, F002, F010 |
| R08 | One countdown component had incompatible completion behavior | Shared pure `CountdownDisplay` + `useCountdown(targetIso, serverNowIso)`; `LaunchCountdown` (F003, target `startAt`, redirects at 0 ms or resync `status: active`); `CeremonyCountdown` (F004, target `ceremonyAt`, never redirects, stops at 00, ignores `status`); tests for `start_at <= now < ceremony_at`, refocus, both zero boundaries | F003, F004 |
| R09 | Campaign lookup failure had two scoring outcomes | Failed lookup inside the heart transaction → rollback, 500 `campaign_lookup_failed`, heart not recorded; weight 1 only when the lookup succeeds and finds no campaign; failed `GET /api/v1/campaigns/active` only hides the badge | F008, F012 |
| R10 | Hero tier crossing could not be detected | Kudo-create transaction locks the receiver row, computes distinct-real-sender tier before/after insert, passes `{receiverId, fromTier, toTier}` to the post-commit notifier; dedupe `hero_level:{receiverId}:{toTier}`; moderation changes never emit level-up | F005, F008, F009, F011 |
| R11 | Concurrent box opens could miss icon-set completion | Box open locks the user row; Go compares the distinct icon set before/after; first time it reaches 6 sets `users.icons_completed_at` once and emits completion (dedupe `icons_completed:{userId}`) | F008, F009 |
| R12 | Retrying an uncertain open could consume another box | Client `Idempotency-Key` per opening intent; `secret_boxes.open_request_id uuid unique null`; replay returns the stored `{ boxId, icon, summary }` with 200 and consumes nothing; UI retry reuses the key | F008 |
| R13 | "First decision wins" not enforced by the target-status check | `kudos.moderation_version`; requests carry `{ expectedVersion }`; conditional update; mismatch → 409 `stale_decision` with the current row; same target and version → 200 `changed:false` | F011 |
| R14 | Handoff file and discovery docs described the superseded architecture | `reports/shared-spec-context-for-wave-2.md` rewritten to G15–G19 (Next.js frontend only, Go `/api/v1` with pgx+sqlc, Supabase Auth/Postgres/Storage, `kudo_heart_state` SQL view, seven notification kinds, `NotificationService.Create`, `users.role`) with precedence contract → this log → feature specs → discovery docs; `docs/screen-specs/*.md` carry a historical-API-mapping note | F001–F012, shared context |
| R15 | Unit code, card DTO and unavailable counts unresolved | `units.code text not null unique`; one F006 `KudoCard` DTO and `{ items, nextCursor }` list shape consumed by F007; counts failure → `counts: null`, `countsUnavailable: true` | F002, F006, F007 |
| R16 | Default seed could not demonstrate temporal flows | `SEED_SCENARIO` in `backend/db/seeds/`: `prelaunch` (+2 d / +20 d), `live` default (−1 d / +14 d), `after-ceremony` (−30 d / −1 d); demo activity within the last 14 days; sub-minute launch boundary test; event-unavailable fallback; AD03 date documented as production placeholder | F003, F004, F010 |
| R17 | Mobile/tablet requirements survived the desktop-only decision | Desktop only: minimum width 1280 px, horizontal scroll below; inherited mobile/tablet rows marked "Out of release scope (AD01, R17)" | F001, F003, F004 |
| R18 | Plain Forbidden page promised an HTTP 403 | Forbidden page acceptance is visual only (AD15); HTTP 403 acceptance applies to Go endpoints only; `experimental.authInterrupts` not enabled | F001, F002 |
| R19 | Detail screen marked notices read even when the write failed | Detail window opens even when mark-read fails; unread dot stays and the failure is announced, same as the panel | F009 |
| R20 | Content validation lacked a post-sanitization definition | Sanitize → derive canonical visible text → required non-empty and max 1,000 Unicode code points on the stored representation; frontend counter mirrors the metric; boundary, whitespace, entity, emoji and unsafe-link tests | F005 |
| R21 | Auth and database bootstrap not executable | Asymmetric JWKS keys (ES256/RS256), issuer `${SUPABASE_URL}/auth/v1`, audience `authenticated`; Google provider only, verified `@sun-asterisk.com`; Go role `saa_api` with DML grants and `BYPASSRLS`; RLS deny-all; no `anon`/`authenticated` grants; secrets only in Go env | F002, system |
| R22 | Valid token without profile had no terminating recovery | On 403 `profile_not_provisioned` call `POST /api/v1/me/provision` once; on failure sign out to `/login?error=profile_unavailable`; proxy keeps a signed-in user on `/login` when `error` is present | F001, F002 |
| R23 | Failure promises had no timing bounds | Go ReadHeaderTimeout 5 s, ReadTimeout 15 s, WriteTimeout 30 s; DB context 5 s (exports 20 s); Next.js server fetches 5 s; `proxy.ts` gate lookup 1.5 s then fail open; post-commit notifications in a detached 2 s context, failures logged only | F001–F003, F005, F008, F009 |

### Orchestrator calls during the Codex fixes (2026-11-10)

| # | Decision | Affects |
|---|----------|---------|
| C01 | 403 and 404 pages always render minimal chrome (revises F001 D003 from AD01's "full chrome when signed in", per R07 route-group layout) | F001 |
| C02 | `GET /api/v1/me/secret-boxes` summary failure on a profile → `collectedIcons: null` alongside `counts: null` + `countsUnavailable: true` | F007, F008 |
| C03 | Moderation decision on a kudo id that does not exist → 404 `kudo_not_found` (not `changed:false`) | F011 |
| C04 | `POST /api/v1/me/secret-boxes/open` without a valid `Idempotency-Key` header → 400; `summary.distinctIcons` is the array of distinct collected icons (same list as `collectedIcons`) | F008, F007 |
| C05 | `users.icons_completed_at` is added by F008's migration to F002's `users` table | F002, F008 |
| C06 | Unverified email / non-Google provider reuses the `domain_not_allowed` refusal; claim locations (`app_metadata.provider`, `user_metadata.email_verified`) to be confirmed against a real local Supabase token at build | F002 |
| C07 | X07's `TierCrossed` wording is superseded by R10 (transition computed in F005's create transaction) | F005, F008, F009 |

## Codex re-review fixes N01–N12 (2026-11-10)

Resolutions as in `reports/codex-findings-resolution-contract.md` § Addendum; applied to the feature specs.

| # | Resolution | Affects |
|---|------------|---------|
| N01 | Kudo-linked notification insert takes `for share` on the kudo and strips sender fields if anonymous; edit holds `for update` | F005, F009 |
| N02 | `kudo_uploads.state` pending / attached / pending_delete; pending_delete never reusable; cleanup deletes only pending_delete | F005, F006 |
| N03 | Permanent unique dedupe for `hero_level_up` and `icons_completed`, independent of read state | F009 |
| N04 | F005 produces `hero_level_up` with `{receiverId, fromTier, toTier, sendersCount}`; F009 maps to levelKey/fromLevelKey/sendersCount | F005, F008, F009 |
| N05 | Global lock order kudo → receiver; F011 status changes take both locks; no level-up from moderation | F005, F011 |
| N06 | Failed reprovision in a Server Component renders client `ProfileRecoveryRedirect` (browser sign-out, then Login error) | F001, F002 |
| N07 | Visible text: no separator between inline text nodes; blocks/br = newline; collapse; trim | F005 |
| N08 | Missing kudo in moderation → 404 `kudo_not_found` | F011 |
| N09 | Go route classes PUBLIC / IDENTITY-ONLY / PROFILE / ADMIN, CORS around the whole mux | F002, F003 |
| N10 | No hero badge in the profile header (F007 D006); rules-panel design copy kept verbatim with a note | F008, F009 |
| N11 | Export streams after the first page; late failure aborts; browser saves only a complete blob | F010 |
| N12 | `secret_boxes.open_result` stores the original response; replay returns it exactly | F008 |

## Planning decisions (2026-11-10)

| # | Question | Answer | Affects |
|---|----------|--------|---------|
| P01 | Rich-text editor library | Tiptap | F005 (phase 6) |
| P02 | E2E sign-in approach | Playwright storage state captured from one manual Google sign-in | phase 2, phase 14 |
