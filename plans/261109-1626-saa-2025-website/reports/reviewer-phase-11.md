# Reviewer report - Phase 11 (F010 admin overview + user directory)

Scope: uncommitted tree on feat/saa-screens (base 19209bd). Read-only review; Go and tests were not run (no Go in shell). Reviewed: backend/internal/admin/*, backend/cmd/api/wire_admin_reports.go, backend/db/queries/admin_reports.sql, gamification/hero_tier.go diff, src/app/admin/{page,users/page}.tsx, src/features/admin/*, i18n/css diffs. Checked against phase-11 plan, F010 functional/technical spec, permissions.md, codex contract (R05, R06, R16, R23, N11).

## Verdict
No critical findings. Authorization, CSV safety and the N11 streaming contract hold. Two small frontend warnings and one query-cost warning.

## Critical
None.

## Warning

W1. Export stuck in "busy" if API base env is missing. `src/features/admin/export-button.tsx:41` - `apiUrl(path)` throws (no `NEXT_PUBLIC_API_BASE_URL`) as an argument of `downloadExport`, outside any try. `run()` rejects, `state` stays `"busy"`, button disabled forever, no error shown. Fix: build the url inside a try/catch (or `useMemo` once) and `setState("failed")` on throw.

W2. Suggest list ignores 401. `src/features/admin/user-search-box.tsx:32-37` - only 403 is handled; an expired session shows "no results" instead of going to Login (spec: 401 -> Login, as ExportButton does). Fix: `if (isApiError(error) && error.status === 401) navigate(\`/login?next=...\`)`.

W3. AdminListUsers cost grows with users x pages. `backend/db/queries/admin_reports.sql:96-140` - five `CROSS JOIN LATERAL` aggregates per user, then `ORDER BY u.name, u.id LIMIT`. No index on `users (name, id)` (only `users_unit_id_idx`), so Postgres cannot stop early: each 500-row export page recomputes laterals for every remaining user (about N^2/500 total), and each table page for every matching user. Fine at hundreds of users; risky against the 5 s / 20 s deadlines at tens of thousands. Fix: add migration `create index users_name_id_idx on public.users (name, id);` and check `EXPLAIN` shows ordered index scan under the nested loop; or select the page of user ids in a CTE first, then join the laterals to that page only. Note the level filter (`rc.senders`) forces full evaluation anyway when set.

## Suggestion

S1. Unbounded date range. `report_date_range.go:50-58` accepts `from=0001-01-01&to=9999-12-31`. Safe (5 s deadline, 500 on timeout) but admin-only expensive query. Optional clamp (e.g. reject ranges > 5 years -> default).

S2. `csv_stream_writer.go:19` - formula leaders match the spec (`= + - @ TAB CR`). Many guidance lists also add LF; cheap to add `\n` if you want belt and braces. Leading-space values (" =1+1") are not neutralised; Excel does not execute those, so fine.

S3. Two definitions of "distinct senders over public kudos": the `AdminCountUsers` correlated subquery (sql:79-81) and the `rc` lateral in `AdminListUsers`. Both agree today; a shared SQL fragment is not possible in sqlc, so keep a test asserting count == list length per level (the integration test partly does).

S4. `Users()` runs count, list and units as three statements without one snapshot; a concurrent insert can make `total` and rows disagree by one for one render. Harmless; ignore unless a pager off-by-one is reported.

S5. `UserSearchBox` keeps `text` in local state and is remounted by `key={query.q}` - correct. Suggestion fetch depends on `query` identity; stable per server render, fine.

## Checked and OK (evidence)

- Authorization: all four routes use `d.Routes.Admin(...)` = PROFILE + RequireAdmin (`wire_admin_reports.go:12-15`, `route_classes.go:46`). Suggest uses A4 (`/admin/users?pageSize=8`), so it is behind the same guard. Role is read from the stored record (R05). `api_admin_reports_integration_test.go` asserts 401 (no / invalid token) and 403 (user role) with empty body for every F010 path, through the assembled router.
- Data exposure: directory returns email (spec FR-201, admin only). Anonymous kudos: queries only count (`sent`, `received`, `senders`); no sender identity or message leaves SQL. Directory counts `status='public'` only; Overview `status <> 'spam'` equals public (enum is only `public|spam`). Spam excluded as BR-002. Export columns equal table columns (header order matches D007), Actions omitted.
- CSV: `encoding/csv` quoting with CRLF, BOM written first, `csvText` applied to unit code, name and email (text cells), numbers/role/level are system strings. `Content-Disposition` built with `mime.FormatMediaType` from an ASCII filename; exposed in `cors_middleware.go:13` (R06). `nosniff`, `no-store` set.
- Streaming (N11): first page read before status/headers/BOM, so early failure is 500 JSON with no CSV byte; later failure logs and `panic(http.ErrAbortHandler)`; `Recover` middleware re-panics that value (`recover_middleware.go:23`), so no terminating chunk. Frontend `downloadExport` saves only after `response.blob()` resolves; a cut body rejects -> `failed`, nothing saved; non-2xx / 401 / 403 / timeout handled. 20 s export context (`dbx.ExportTimeout`) < server `writeTimeout` 30 s < client 25 s timeout order is sensible. Memory: 500-row pages on a (name,id) keyset, one page in memory; overview is one page. Keyset order matches `ORDER BY u.name, u.id` (same collation), no skipped or duplicated rows.
- Dates: strict `YYYY-MM-DD` round-trip parse in Asia/Ho_Chi_Minh (tzdata embedded, no DST), bad/missing/from>to -> default last 30 days incl. today, window half-open `[from 00:00, to+1d 00:00)`, matches BR-001/006. Frontend `report-dates.ts` uses the same zone.
- SQL: LIKE input escaped via `dbx.ContainsPattern` (backslash, %, _), parameterised, no concatenation; role cast to enum after `Valid()`; query capped at 100 runes; page clamps to last page; pageSize <= 100. Overview uses existing `kudos_created_idx`; per-user counts are set-based (no N+1). Unit rows: every unit incl. zero activity, All row counts each user once (BR-003). Weighted hearts via `kudo_heart_state` with OFFSET 0 fence as in F007.
- HeroTierSenderRange (`gamification/hero_tier.go`): pure addition after `HeroTierFor`; thresholds and `HeroTierFor` untouched, so F008 behaviour is unchanged. Inverse test covers every boundary +-1. Legend upper bound MaxInt32 fits the `::int` param.
- Frontend: 401 -> `redirect('/login?next=...')` outside the try block (`load-admin-report.ts:18`); 403 -> `ForbiddenPage` inside the admin chrome; other errors -> `AdminLoadError` with Export disabled. URL params validated (UUID regex, level/role whitelists, page int) and re-validated by Go. Files all under 200 lines (largest 142). `instant = false` explained.
- Phase done-criteria spot-check: routes, exports, filters, pager, picker present; docs/roadmap update not reviewed (out of scope).

## Numbers
- Lint / tsc / go test: not run by this reviewer.
- Critical 0, Warning 3, Suggestion 5.

## Unresolved
- Whether production sits behind a proxy that buffers or normalises aborted chunked responses (would hide truncation from the browser). N11 holds for direct Go, not verified end to end.
- Expected user count: decides whether W3 is a must-do now or a later index.

**Status:** DONE_WITH_CONCERNS
**Summary:** 0 critical, 3 warning, 5 suggestion. Admin authorization, PII scope, CSV escaping/streaming, date handling and the shared HeroTier change are sound; fix W1 and W2 before merge, schedule W3.
**Concerns/Blockers:** No blockers. W1 (export button can stick busy) and W2 (suggest 401) are small frontend fixes; W3 needs an EXPLAIN check against realistic data. Tests were not executed.

---

## Recheck (fix round 1)

Read-only; tests not run (no Go/Node execution by reviewer). Files re-read: `admin-call-failure.ts`, `export-download.ts`, `export-button.tsx`, `load-admin-report.ts`, `user-search-box.tsx`, migration `20261128080000_admin_user_directory_order_index.sql`, `logs/p11/explain-users-scaled.txt`, `e2e/login-and-admin-gate.spec.ts` diff.

- **W1 closed.** `runExport` (`export-download.ts`) builds the URL inside try, treats a missing `apiBase` and a token failure as `failed`, and never rejects. `export-button.tsx` sets state in `finally`, so "busy" always ends; 401 -> Login, 403 -> reload, else idle/failed.
- **W2 closed.** `classifyAdminCallFailure` + `loginHref` are shared by the search box (401 -> Login, 403 -> reload, empty list otherwise), the export button and `loadAdminReport` (redirect still outside the try). Open-redirect (FR-605): `loginHref` only receives internal paths (`window.location.pathname + search`, or server-built `/admin...` / `usersPageHref`), and the Login side re-validates through `safeNext` (`auth-routing.ts:28`: rejects non-`/` start, `//`, `/\`, `://`, backslash, control chars). No external value reaches `next`.
- **W3 closed.** Migration adds `users_name_id_idx (name, id)` (additive, reversible by drop; no data change). EXPLAIN at 20,025 users / 60,068 kudos: table page 1 859 ms -> 1.8 ms (generic plan 819 -> 1.3 ms), export keyset page 377 -> 28 ms (generic 399 -> 35 ms), ordered index scan with the laterals run for the page only. Residual: deep offset (page 500) is 810 -> 482 ms, still inside the 5 s deadline; acceptable, inherent to OFFSET paging.
- **Other changes.** vi nav copy and the e2e expected strings (`Tổng quan`, `Duyệt nội dung`, `Người dùng`, `Cài đặt`) are consistent with each other; English path stays covered by `admin-overview-and-users.spec.ts`. Fixture campaign moved to Feb 2003 is test-only. No new defects found; no change to the backend authorization surface.

Suggestions S1-S5 from the first pass are unchanged and still optional.

**Status:** DONE
**Summary:** W1, W2, W3 closed; 0 critical, 0 warning, 5 suggestion (S1-S5, unchanged), no new defects.
**Concerns/Blockers:** None. Not executed by me: unit tests for `runExport`/`admin-call-failure`, and the migration against a live database (EXPLAIN log taken as given).
