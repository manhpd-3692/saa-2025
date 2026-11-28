# Review: phase 7 (F006 kudos live board + kudo detail)

## Scope
- Branch feat/saa-screens, base 440e059, uncommitted tree. Read-only; Go/tsc/tests NOT run (no toolchain), so everything below is from reading code.
- Reviewed: `backend/db/queries/{kudo_read,user_hover_card}.sql`, `backend/internal/kudo/{kudo_read_service,kudo_board_read_service,kudo_card_builder,keyset_cursor,mask_sender,kudo_*_handler}.go`, `backend/internal/user/user_hover_card_handler.go`, `backend/cmd/api/wire_kudo_board.go`, `backend/db/seeds/demo_activity.sql`, `src/app/(shell)/kudos/**`, `src/features/kudos-board/**`, `next.config.ts`, plus the integration tests and migrations for indexes.
- Not read: generated `*.sql.go`, e2e spec body, i18n JSON.

## Assessment
Solid. No critical findings. Anonymity is enforced in one place (`maskSender`, called from the single `newCard`), every list path goes through `buildCards`, spam is filtered in SQL for lists and checked in Go for detail, and the cursor is parsed strictly and bound as parameters. Remaining issues are one low-reach path-handling hole in the Next.js workaround, one query-shape perf risk, and a few edge cases.

## Critical
None.

## Warning

1. **`loadKudoDetail` forwards unvalidated `id` into the Go URL path** (`src/features/kudos-board/load-board-sections.ts:55`, `kudos-board-api.ts:27`).
   `encodeURIComponent` does not encode `.`, and WHATWG `fetch` collapses dot segments. A request that reaches Next with param `..` or `%2e%2e` (raw client, `curl --path-as-is`; browsers normalize it away first) makes the server call `GET {API}/api/v1/` or `/api/v1/kudos/` with the viewer's own Bearer token. Reach is small: GET only, one level up, caller's own token, and the response is then rendered as a `KudoCardData` (likely 404 -> not-found, or a malformed-shape render error). The marker-strip regex itself is anchored and only removes leading `(.)`/`(..)` groups, so it cannot add traversal; the hole is the missing id validation. It also makes the "uniform not-found" depend on a network round trip.
   Fix: after stripping, gate with a UUID regex and short-circuit:
   ```ts
   const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
   const id = idParam.replace(INTERCEPTION_MARKERS, "");
   if (!UUID.test(id)) notFound();
   ```
   Go stays the authority for existence/permission; this just keeps non-uuid ids from touching the URL.

2. **Feed/Highlight join the aggregating view without a per-row predicate** (`backend/db/queries/kudo_read.sql:20, 45, 68`).
   `JOIN kudo_heart_state hs ON hs.kudo_id = k.id` where the view is `kudos LEFT JOIN hearts GROUP BY k.id`. For `GetKudoForRead` the `k.id = @id` constant propagates into the view, but in `ListPublicKudoCards` there is no constant, so Postgres most likely aggregates every kudo and heart per 10-row page (and again per focus refresh, every 15 s per open tab). Cost grows with total hearts, not page size. Unverified by `EXPLAIN` (no DB here).
   Fix: keep the view (G08/R14 single number) but fetch it per row: `JOIN LATERAL (SELECT heart_total FROM kudo_heart_state WHERE kudo_id = k.id) hs ON true`; the parameterized qual on the group column is pushable and hits `hearts_kudo_user_key`. Run `EXPLAIN (ANALYZE)` on the seeded DB for both queries. Highlight must rank all public kudos by heart_total so the aggregate stays there; consider a short server cache or accept it for now and record it under RISK-02.

3. **Module-level hover-card cache survives a viewer change** (`src/features/kudos-board/sunner-avatar-hover.tsx:16`).
   `hoverCards` is keyed by person id only. The server returns `sentCount` including anonymous kudos when the viewer is an admin or the user themself. If an admin (or user X) signs out and another Sunner signs in without a full page reload, the new viewer is served the previous viewer's richer count (anonymous send count; not identity, but BR-002 intent). Also grows unbounded.
   Fix: key by `${viewerId}:${personId}` (viewer id from the session/shell context), or clear the map on sign-out/auth change, or drop the cache (the server query is two index counts).

4. **Board aggregates and sidebar scan unindexed sets** (`kudo_read.sql:109` `ListSpotlightReceivers`, `:142` `ListLatestGiftRecipients`).
   Spotlight does `GROUP BY receiver` over all public kudos (no `(receiver_id) WHERE status='public'` index); the sidebar does `DISTINCT ON (user_id)` over all opened secret_boxes with sort and no partial index on `opened_at`. Fine at demo size, linear later, and each is hit by SSR plus every refocus.
   Fix (new migration): `create index kudos_public_receiver_idx on public.kudos (receiver_id) where status = 'public';` and `create index secret_boxes_opened_idx on public.secret_boxes (opened_at desc, id desc) where opened_at is not null;`. The latter lets the "10 latest" use a bounded scan if rewritten as the latest opened row per user via LATERAL.

## Suggestion

1. **Infinite-scroll can stall after a silent refresh** (`use-all-kudos-feed.ts:58`). `loadMore` returns early while `busy.current` is set by a focus-triggered `loadFirst`; if that refresh merges nothing, `items.length`/`status` do not change, the observer effect (`all-kudos-feed.tsx` deps) is not re-armed and a sentinel already in view never fires again until the user scrolls away and back. Fix: use separate busy flags for refresh and paging, or bump a `tick` state when a refresh ends to re-run the effect.
2. **Signed URL lifetime vs long-lived page** (`kudo_read_service.go` `SignedURLTTL = 1h`, matches INT-001). Cards loaded more than an hour ago keep expired URLs; focus refresh only re-signs first-page cards. `onError` shows the placeholder, so it degrades safely. Optional: on image error, refetch that card via `/kudos/{id}`.
3. **`next.config.ts:13` `new URL(NEXT_PUBLIC_SUPABASE_URL)` throws at config load on a malformed value** (opaque build error), and images are `unoptimized`, so `remotePatterns` is not consulted for kudo images at all. Scope is tight and correct (`/storage/v1/object/sign/kudo-images/**` only). Wrap in try/catch or drop it if not needed. Also confirm Go's `SUPABASE_URL` (used to build the signed URL host in `storage_object_store_http.go:110`) is browser-reachable in every deploy, not an internal host.
4. **Seed** (`backend/db/seeds/demo_activity.sql`): no secrets; emails are `sunnerNN.demo@sun-asterisk.com` (same convention as rows 1-8). New display names come from the Figma mock; if any are real staff names, swap for invented ones. Confirm the seed is never run against prod (not verified).
5. **Duplicated column list x3** in `ListPublicKudoCards`/`ListHighlightKudoCards`/`GetKudoForRead` (sqlc cannot share it). The `cardRow(row)` conversions fail to compile on drift, which is an acceptable guard.
6. **Hover-card endpoint is a directory lookup** for any uuid by any signed-in user (name, unit, counts). Consistent with the spec; note no rate limit if enumeration ever matters.
7. **Tracking:** phase-07 TODO checkboxes are all unchecked and no docs (roadmap/changelog) are touched in the working tree; update on commit.

## Edge Cases Turned Up
- Non-uuid, missing, spam-of-other: Go returns the identical 404 `kudo_not_found` body for all three (`kudo_detail_handler.go:34-44`, `kudo_read_service.go` Get); timing differs by one query at most. Uniform.
- Cursor tamper: not base64, no `|`, bad time, bad uuid -> 400 `invalid_cursor`; valid-but-forged cursor only shifts the window over already-public rows (no leak); params are bound (`sqlc.narg`), no concatenation; nanosecond RFC3339 round-trips Postgres microseconds exactly; `uuid.Parse` also accepts urn/brace forms (harmless).
- `limit` clamped 1..50, default 10; `limit+1` read for `nextCursor`; empty pages serialize `[]`, not `null`.
- Anonymous + reader is sender: card shows "Ẩn danh" with `isOwn=true` (edit pencil), matches the spec edge case. Admin gets the real sender plus the "sent anonymously" marker.
- Spam: excluded from feed/highlight/spotlight/sidebar/hover counts in SQL; detail allows sender and admin only; `viewerCanHeart` false for non-public.
- Route precedence: literal `/kudos/{highlight,spotlight,sidebar,filter-options}` vs `/kudos/{id}` is resolved by Go 1.22 specificity; all six routes use `d.Routes.Profile` (verified JWT + profile row), which is the right class (no public/identity exposure).
- Spotlight/ticker select receiver fields only (no sender column); sidebar stats come from the JWT viewer, never a query param.
- Hero tier counts distinct senders to the receiver, so it does not reveal anonymous sender identity.
- Not verified: how `notFound()` thrown inside the `@modal` parallel slot renders (slot vs full page); worth an e2e case: click a stale card whose kudo was just marked spam.

## Done Well
- One masking function, one DTO builder, one row type (`cardRow`) with compile-time drift guard; `kudo_uploads.owner_id` is never selected and image keys are opaque.
- Batched card building: 3 queries + 1 sign call per page (no N+1); hashtags and images use `ANY(uuid[])`.
- Keyset order `(created_at, id)` matches `kudos_status_created_idx`, so the feed page is index-ordered.
- `Cache-Control: no-store` on JSON, `connection()` for per-viewer SSR, error states per section, abortable hover fetch, observers and timers cleaned up, `dangerouslySetInnerHTML` only for server-sanitized HTML.
- Integration tests cover the anonymity/spam matrix across highlight, feed and detail (third user, sender, admin) and the keyset-with-concurrent-insert case, plus hover-card anonymity through the router.
- Files stay under ~200 lines (largest hand-written: `kudo_board_read_service.go` 177, `highlight-carousel.tsx` 143).

## Highlight G12 check
`ListHighlightKudoCards` ranks every public kudo (zero-heart included), filters applied before ranking (hashtag via EXISTS, unit = receiver's unit), order `heart_total DESC, created_at DESC, id DESC`, limit 5. Matches BR-003.

## Actions In Order
1. Validate the id as UUID in `loadKudoDetail` before building the URL (W1).
2. EXPLAIN the feed/highlight queries; switch the heart-state join to LATERAL for the feed (W2).
3. Key or clear the hover-card cache per viewer (W3).
4. Add the two partial indexes in a migration (W4).
5. Fix feed stall (S1); tidy next.config (S3); tick plan checkboxes and docs (S7).

## Numbers
- Type coverage, test coverage, lint findings: not measured (no toolchain; tsc/eslint/go test not run).
- Critical 0, Warning 4, Suggestion 7.

## Still Unresolved
- EXPLAIN plans on a populated DB (W2, W4).
- `notFound()` behavior in the intercepted modal slot.
- Whether the seed is guarded from prod; whether Figma-derived seed names are real people.

**Status:** DONE
**Summary:** Critical 0 / Warning 4 / Suggestion 7. Anonymous masking, spam hiding, uniform 404 and cursor handling hold; the `(.)` strip is safe by itself but the unvalidated id can still reach `..`/`.` URL normalization (low reach, own token, GET).
**Concerns/Blockers:** None blocking. Fix W1 and measure W2 before merge; tests, tsc and lint were not run by me.

---

# Recheck (fix round 1)

Read-only again; Go, tsc, vitest and e2e were not run by me. EXPLAIN numbers are from `logs/p7-explain-*.txt` as written by the implementer.

## W1-W4 status

| # | Status | Evidence |
|---|--------|----------|
| W1 id traversal | Closed | `parseKudoIdParam` (`kudos-board-api.ts:53`) strips the anchored `(.)` markers, then requires a full-string UUID. `loadKudoDetail` calls `notFound()` before `connection()` and before any URL is built (`load-board-sections.ts:50-51`). The unit test covers `..`, `.`, `%2e%2e`, `../me`, `<uuid>/..`, `<uuid>x`, `(.)..` and empty. A dot segment can no longer reach the Go URL. |
| W2 feed heart total | Closed for the feed; Highlight open by design | `ListPublicKudoCards` now uses `JOIN LATERAL (... WHERE v.kudo_id = k.id OFFSET 0)`. In `p7-explain-scaled.txt` / `p7-explain-variants.txt` (20k kudos, 100k hearts): view join 40.9 ms, plain LATERAL 40.1 ms (still flattened), scalar subquery 0.18 ms, LATERAL + OFFSET 0 0.165 ms. The fence is what makes it work, so the SQL comment is load-bearing. Highlight is still 37.7 ms at that size (full aggregate, needed to rank). Accepted; keep it under RISK-02. |
| W3 hover cache | Closed | `hover-card-cache.ts` is a `WeakMap` keyed by the signed-in viewer object; a null viewer means no caching. Admin/self counts (which include anonymous sends) cannot reach another viewer. A `/me` refocus re-read yields a new object and empties the cache, which costs extra fetches only. |
| W4 indexes | Closed as a migration; benefit only partly shown | `20261128070000_kudo_board_read_indexes.sql` is valid. Both partial predicates (`status = 'public'`, `opened_at is not null`) match the query predicates, the key order matches `ORDER BY user_id, opened_at desc, id desc`, and the timestamp sorts after the existing migrations. Plain `create index` takes a short write lock (unavoidable in a migration transaction, fine at this size). There is no down migration, same as the others. But the log shows Spotlight 4.78 ms before vs 5.02 ms after `kudos_public_receiver_idx`, and the gift index was shown reachable only with `seqscan off`. See S-A. |

## New code reviewed

- **Chrome hiding** (`src/app/(shell)/layout.tsx:17,37-49`, `kudos/not-found.tsx`, `minimal-chrome.tsx`).
  - `contents group-has-[[data-minimal-page]]/shell:hidden` becomes `display: none` when the marker exists. That removes the subtree from layout, tab order and the accessibility tree, so the header links, FAB, footer and compose host are neither focusable nor read by screen readers. `contents` keeps the sticky header sticking to the page.
  - Flash: on a hard load the not-found boundary renders in the same RSC pass as the layout (no loading or Suspense boundary around the kudo page, and `notFound()` is thrown before any flush), so the marker is in the first HTML. On soft navigation the marker and the hide land in the same DOM commit. I found no flash path by reading; actual streaming behavior is unverified (no browser run).
  - Fallback: where `:has()` is unsupported (Chrome < 105, Safari < 15.4, Firefox < 121) the full chrome shows next to the minimal one (double header). Degraded, not broken.
  - The compose host stays mounted but hidden under the 404 and cannot be opened without a visible trigger. If focus was on a header link when a soft navigation lands on the 404, it falls to `<body>`; minor.
- **Seed Storage upload** (`backend/cmd/seed/seed_kudo_images.go`, `main.go`, `main_test.go`).
  - The guard runs first in `run()`, before any DB or network work. It rejects an empty url or key, an unparsable url, and any host that is not `localhost` or a loopback IP. `url.Hostname()` makes `http://localhost@evil.com` resolve to `evil.com`, so that is refused. The test covers `https://abc.supabase.co`.
  - The service key goes only into the `Authorization` and `apikey` headers. No log or error string contains it: `slog` logs only the object count, and errors carry the path, the status and at most 512 bytes of the Storage body.
  - Object keys are the fixed `kudo-images/{uuid}.png` written by the seed, so a reseed overwrites rather than orphans. Cleanup deletes `kudo_images` and `kudo_uploads` first (`demo_activity.sql:38-42`). Keys carry no sender identity (R01), including for the anonymous demo kudos with images.
  - The image is an embedded, committed 19 KB PNG cropped from the Figma card; no personal data beyond the mock.
- **Receiver prefill and `isSelf`**: the prefill payload is client state only, and the server still validates `receiverId` on create. `isSelf` comes from the JWT viewer (`viewer.UserID == id`). `ComposeController` keeps `current ??`, so an open modal is not overwritten. No finding.
- **`kudo-card-images.tsx` retry**: one re-read per card (`reloading` ref plus `retried`), then a placeholder; pre-hydration errors are handled. This resolves my earlier signed-URL-expiry suggestion. `fetchKudo` uses the same masked `/kudos/{id}` path, so the retry cannot unmask anything.

## New findings

Critical: none. Warning: none.

Suggestion:
- **S-A** `kudos_public_receiver_idx` adds write cost with no measured read gain (`20261128070000_kudo_board_read_indexes.sql:5`). A full group-by over all public kudos cannot use it, and the hover count already has `kudos_receiver_created_idx`. Keep it only if the hover count shows a win. For the gift list, re-run `EXPLAIN` without `seqscan off` at scale; if the planner will not pick `secret_boxes_opened_user_idx`, rewrite per user with LATERAL.
- **S-B** `MinimalChrome`'s `<header>` and `<footer>` now render inside the shell's `<main>` (`bodyAs="div"`), so screen readers lose the banner and contentinfo landmarks on the kudo 404. Fix: render the shell's `<main>` only when the page is not minimal, so `MinimalChrome` can keep its own `<main>`. Or accept and note it.
- **S-C** `http.DefaultClient` in `demoStorage.put` follows redirects, and Go forwards the custom `apikey` header cross-host (it strips only `Authorization` and `Cookie`). The host is loopback, so a redirect is unlikely, but set `CheckRedirect` to return `http.ErrUseLastResponse` for a service-key client.
- **S-D** The seed now fails at start if `SUPABASE_SERVICE_KEY` is unset, even for a DB-only reseed. It is documented in `backend/README.md:50,66`; just a behavior change.
- **S-E** `OFFSET 0` is a planner trick. A refactor that drops it silently returns the feed to ~40 ms at 20k kudos. The SQL comment explains it; also note it in phase-07 risks.
- **S-F** Still open from round 1: feed stall after a silent refresh (S1), `next.config.ts` `new URL()` throw (S3), Figma-derived seed names (S4), plan checkboxes and docs (S7).

## Numbers
- New: Critical 0, Warning 0, Suggestion 5 (S-A..S-E), plus the round-1 carry-overs in S-F.
- Round 1: W1, W2 (feed) and W3 closed; W4 closed with a caveat; Highlight aggregate accepted.
- Type coverage, test coverage and lint: not measured.

**Status:** DONE
**Summary:** W1, W2 (feed) and W3 closed; W4's migration is correct but one index shows no gain. No new critical or warning findings. Counts: 0 critical / 0 warning / 5 new suggestions.
**Concerns/Blockers:** None blocking. Unverified: streaming flash in a real browser, and the planner's choice of the gift index without `seqscan off`. tests, tsc and lint were not run by me.
