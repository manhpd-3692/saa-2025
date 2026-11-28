# Reviewer — Phase 09 (F007 own and other Sunner profiles)

Base `d62b8f3`, uncommitted working tree. Read-only review; Go, tsc, lint and e2e were not run by the reviewer (the implementer's gate run covers them).

Scope: `backend/db/queries/profile.sql`, `backend/internal/profile/*`, `backend/cmd/api/wire_profile.go`, `backend/internal/kudo/kudo_cards_from_rows.go`, both integration tests, `src/features/profile/*`, `src/app/(shell)/profile/*`, trivial edits to `key-visual-backdrop.tsx` and `locale-config.ts`.

## Round 1 — 0 critical, 2 warnings, 4 suggestions

### Warning
1. **W1 — filter change dropped while a load is in flight.** `src/features/profile/use-profile-kudos.ts:~77` (`if (busy.current) return;` in `loadFirst`). Picking a filter during "Xem thêm" or Retry is ignored silently. Fix: pending-filter ref, or request-id counter so `loadFirst` supersedes `loadMore`.
2. **W2 — post-refresh merge never removes cards.** `use-profile-kudos.ts:34-41` (`withFreshFirstPage`). A kudo that becomes spam stays visible while the server count drops (FR-403); more than 10 new kudos between refreshes leaves a gap. Fix: replace the list when the fresh page has no next cursor or does not overlap; otherwise reset to the fresh page.

### Suggestion
3. **S3** — box-summary failure nulls public counts for non-owners (`profile_service.go:104-110`). Matches C02/SC-012 as written; tweak needs spec owner.
4. **S4** — add a test: owner reading a received anonymous kudo sees no sender (`api_profile_integration_test.go`).
5. **S5** — cursor tied to filter but not owner (`profile_list_cursor.go:34-53`); harmless.
6. **S6** — `ListKudos` existence check reads full header row with units join (`profile_kudos_list.go:31`).

### Verified, no issue
- Masking: all cards go through `ReadService.CardsFromRows` → `buildCards` → `maskSender`; sender nulled for every non-admin viewer on an anonymous kudo; `senderID` never serialised; image URLs opaque.
- Sent count and sent list share `(NOT is_anonymous OR include_anonymous_sent)`; `include_anonymous_sent = viewer == owner || admin`. Spam excluded via `status = 'public'`.
- Box figures `omitempty`, owner only (admin does not get them); no email field; raw body checked in tests.
- Cursor: base64url `filter:created_at|id`, strictly parsed, 400 on failure or other-filter cursor; typed parameters.
- Both routes `Routes.Profile`; 401 without token; non-uuid and unknown id same 404 body.
- Indexes `kudos_receiver_created_idx`, `kudos_sender_created_idx`, `kudos_public_receiver_idx`; 3 batched queries per page, no N+1.
- `counts: null` + HTTP 200 + `countsUnavailable` + logged cause acceptable (R15).
- Frontend: list keyed `${userId}:${filter}`; failures keep cards with Retry; 401 → login; own id redirects to `/profile` keeping filter; non-uuid → not-found; compose and box actions trigger `router.refresh()`.
- All files under 200 lines.

Open: `history.replaceState` interaction with the Next 16 router (confirm by e2e).

## Recheck — fix round 1 (read-only; Go, tsc, lint, vitest, e2e not run by the reviewer)

Result: W1, W2, S4, S6 closed. 0 critical, 0 warnings, 2 low suggestions.

### Closed
- **W1** — `createLoadGate` (`profile-kudos-list-state.ts:62-79`) with tickets in `use-profile-kudos.ts`. `loadFirst` always starts (`start("first")!` is safe: only `"more"` can return null). Walked the interleavings: more then first → more's answer and failure both dropped (`finish` false), `inFlight` stays `"first"` until first ends; first then first → latest wins; first in flight blocks `"more"` and clears on its own finish; a superseded request never writes state, so no stale `loadingMore` or error leaks. Gate is created once via `useState(createLoadGate)`. Gate tests + e2e (late page never added to new list) cover it.
- **W2** — `refreshedList` logic checked: whole-list page (`nextCursor === null`) replaces; no overlap resets (no gap); overlap drops removed cards newer than `last`, keeps older loaded ones, cursor = `state.nextCursor` when older cards kept (keyset after the last loaded card, still valid), else `page.nextCursor`; `state.nextCursor === null` with kept older cards stays null (correct, list was complete). Tie-break `isOlder` matches Go keyset (created_at desc, id desc). Wired only when `initialFilter === state.filter`.
- **S4** — owner reading anonymous received kudo: sender null, `isOwn` false, raw body has no sender id/name/email (`api_profile_integration_test.go:135-144`).
- **S6** — `ProfileUserExists` is a PK `EXISTS` probe; generated code matches the query; interface updated, only one implementer (`*db.Queries`), no fakes to break. Cursor decode (400) still runs before the 404 probe, fine.
- **Nav** — `matches` on `/profile` (no match, own profile selects nothing), `/profile/<id>` (Kudos), `/profilex/1` (none, prefix includes the slash), `/kudosx`, `/` (exact only). Longest-match unaffected. Both new cases are in the test table. Footer shares the rule, so Kudos also reads active there; consistent with header. Literal `/profile/` (trailing slash) would highlight Kudos; Next redirects it, harmless.

### Low
1. **L1 — refresh vs in-flight "Xem thêm"** (`use-profile-kudos.ts:35-38` and `67-80`). The refresh path does not touch the gate. If `refreshedList` takes the no-overlap reset branch while a `loadMore` (old cursor) is in flight, that late page is appended to the reset list, leaving a gap, and it sets `status: "ready"` while the load still runs. Needs a compose/box action during a load and more than a page of new kudos, so rare. Fix if wanted: call `gate.start("first")` in the refresh branch to supersede (and drop) the in-flight load.
2. **L2 — refresh vs in-flight filter change.** A first-page load for another filter finishing after a refresh overwrites it; correct, since the filter changed. No action.

### Numbers
- New unit cases: 4 refresh, 3 gate, 2 nav (all read, none run). Lint/type results not produced by the reviewer.

**Status:** DONE
**Summary:** W1, W2, S4, S6 confirmed closed; nav rule correct for `/profile`, `/profile/<id>`, `/profilex`. Counts: 0 critical, 0 warning, 2 low (L1 worth a one-line fix, L2 none).
**Concerns:** L1 (refresh during in-flight load, rare). The implementer's gate run must confirm vitest, tsc, go test and e2e green, as the reviewer ran none. The earlier open question (`history.replaceState` with Next 16 router) is covered by the e2e URL assertions only if that run passes.
