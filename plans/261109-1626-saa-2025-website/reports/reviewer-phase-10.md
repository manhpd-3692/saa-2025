# Review: phase 10 (F009 notification center), uncommitted diff on 8c4aa6a

Scope: backend/internal/notification/{remask,list_cursor,list_handler,read_handler,read_service}, queries + generated sqlc, wire_notification.go, demo_notifications.sql + seed wiring, src/features/notifications/*, notification-bell-slot.tsx, dictionaries, globals.css tokens. Read-only; Go and tests not run (not in shell), judged by reading. Migration `20261110070245_notifications.sql` read for index coverage.

## Verdict

No critical findings. Anonymity re-mask, ownership and cursor hold up on every path I walked. 3 warnings (frontend cross-user state, read-all vs unseen rows, focus refresh storm), 8 suggestions.

## Walked and OK

- **Re-mask (R02, N01)**: `itemFromRow` strips `senderId/senderName/senderAvatarUrl` when the LEFT-JOINed kudo is anonymous NOW and the viewer is not admin. Admin flag comes from `auth.FromContext(...).IsAdmin()` (users.role per request), never from client input. Matches R02 text ("for non-admin viewers"). Removed kudo (`kudo_id` null, flag nil) leaves params as stored, which is right since insert-time strip (N01) and edit-time redaction already ran. Table test covers anon/Sunner, anon/admin, named, removed kudo. Avatar is covered via `senderAvatarUrl` key. `kudoId` is still returned for an anonymous kudo, which leaks nothing as long as the kudo detail endpoint masks the sender (F006, not in this diff).
- **Other params**: `heart_received.receiverName` is the kudo's receiver, `hero_level_up` carries tier + count, `kudo_spam_warning` and `secret_box_received` carry none. No other kind carries a sender name, so no leak by params today.
- **Ownership**: `MarkNotificationRead` has `WHERE id AND recipient_id`, `:execrows`, 0 rows becomes `ErrNotFound`. Malformed UUID, unknown id and foreign id all end in the same `writeNotificationNotFound` (same status, code, message). No existence oracle. List, count and read-all are all scoped by verified `recipient_id`; read-all keeps `read_at` of read rows (`read_at IS NULL`).
- **Route class**: all four routes via `d.Routes.Profile`; `viewerFrom` fails closed to 500 outside the chain. No write route for notifications (FR-602). Bearer auth, so no CSRF surface. `Cache-Control: no-store` on JSON and on the 204.
- **Cursor**: tag `n1` plus 3-part split, strict RFC3339Nano and `uuid.Parse`; a kudo feed cursor is rejected (test present). Values reach SQL only as typed params (`timestamptz`, `uuid`), no concatenation, so no injection. Empty `cursor=` is treated as first page. `limit` clamped 1..50.
- **Query cost**: list uses `notifications_recipient_feed_idx (recipient_id, created_at desc, id desc)` with row-compare keyset and `LIMIT`; join to kudos is by PK, at most 51 rows. Count uses the partial index `notifications_recipient_unread_idx`. Read-all uses the same index. `kudo_viewable` is computed in-row, no N+1.
- **Seed**: no real personal data (demo.sun-asterisk.com fixtures only). Temp tables `demo_people`/`demo_kudos` are `on commit drop` and the seed runs both files in one `pgx.BeginFunc`, so the dependency holds. Spam kudo id `d2000000-0000-4000-8000-000000000001` is removed on re-run by demo_activity step 1 (delete by sender/receiver in demo_people), so idempotent. Notifications are deleted first, FK `on delete set null` anyway. Anonymous demo kudos get `'{}'` params.
- **Frontend XSS**: every param is rendered as a React text node. `fillText` uses a function replacer (no `$&` expansion). Links are `/kudos/${encodeURIComponent(kudoId)}`, `/profile` and `/community-standards`, never built from params. `generic.message` is plain text.
- **Bell**: unread dot via `aria-describedby` and sr-only text; Esc closes and returns focus to the bell; detail dialog has focus trap, Esc stops propagation, returns focus to opener; mark-read failure opens the dialog anyway and announces (R19). Timers (`setInterval`, announcement timeout) and listeners (`focus`, `pointerdown`) are all cleaned up. Interval skips hidden tabs. Out-of-order unread answers are dropped via the sequence counter.
- **Server Component slot**: `NotificationBellSlot` is imported only by Server Components (`site-header.tsx`, `admin-chrome.tsx`; no `"use client"`), so the async conversion is legal.
- **File sizes**: all non-test source files under 200 lines (max 153).

## Critical

None.

## Warning

**W1. Bell and unread state are not keyed to the user** - `src/features/notifications/notification-bell.tsx:36`, `use-unread-count.ts:32-44`.
`useUnreadCount(user !== null)` depends on a boolean. If the signed-in Sunner changes without a full remount (MeRefresher swaps `user` on focus or on a new server render; sign-out then sign-in as another account in the same SPA session), the effect does not re-run: the previous user's `count` shows for up to 60 s, a request in flight for the old token can still `setCount` (the sequence is not bumped on cleanup), and an open `NotificationCenter` keeps the old user's list in `useNotificationList` state. Backend scoping is correct, so this is a display and privacy-of-a-number issue, not a data leak.
Fix: render `<NotificationBellInner key={user.id} .../>` (or `key={user?.id}` on the content) so state resets per user; and in the effect cleanup add `sequence.current++`.

**W2. "Mark all read" marks rows the user never saw** - `backend/db/queries/notifications.sql` (`MarkAllNotificationsRead`), `notification-center.tsx:97-110`.
The UPDATE hits every unread row at execution time. A notice created after the list loaded (60 s poll gap, or a merged heart notice bumped to the top) is marked read without ever being displayed; the client then sets count to 0 and `canMarkAll` hides it. FR-402 literally says every unread row, so this may be accepted, but it silently drops an unseen kudo notice.
Fix (if accepted as a defect): send `before=<loadedAt>` (or the newest loaded `createdAt`) and add `AND created_at <= @before`; or keep the contract and record the limitation in the spec. Decision needed from the orchestrator.

**W3. Focus refresh has no minimum gap** - `use-unread-count.ts:35-39`.
Every `focus` event fires `refresh()` (plus MeRefresher's own `/me` call on the same event). Rapid alt-tab or an iframe focus flip generates a request per event per tab, plus the panel open (`notification-center.tsx:~57`) and each A6 success (`adjust` + `refresh`) add more. Bounded by the 5 s timeout and cheap partial-index query, but trivially storm-able.
Fix: skip when the last completed refresh is under ~5 s old (`lastRun` ref), keep the 60 s interval as is. Also listen to `visibilitychange` (visible) so a tab shown without a `focus` event refreshes.

## Suggestion

1. **Re-mask is a denylist of three keys** - `notification_remask.go:35`, `notification_kinds.go:50`. A future producer adding e.g. `actorName` to a kudo-linked notice would bypass both the insert strip and the read re-mask. For `kudo_received` on an anonymous kudo, replace the delete loop with an allowlist (drop all params), or add a contract test that fails when a kudo-linked producer adds a key outside `{sender*}` + known safe keys.
2. **Cursor copy duplicates `kudo/keyset_cursor.go`** - `notification_list_cursor.go`. Import-cycle reason is valid, but both copies can drift. Extract a leaf package (e.g. `internal/keyset`) taking a tag, and have both import it. Low urgency.
3. **Merged notices move in the keyset** - `UpsertNotification` sets `created_at = now()`. A heart notice merged while the user is paging jumps above the cursor: it will not appear until reload and is not duplicated. Acceptable for a 60 s-poll product; note it in the spec edge cases.
4. **`MarkNotificationRead` rewrites an already-read row** - `notifications.sql` (`SET read_at = coalesce(read_at, now())`). Same value, but a new tuple and WAL each call. Client calls A6 once per unread row so impact is nil; if wanted: `UPDATE ... WHERE id=@id AND recipient_id=@r AND read_at IS NULL` plus an existence check on 0 rows.
5. **Dictionary loaded on every shell page, also signed out** - `notification-bell-slot.tsx:11-14`. `common` + `notifications` are serialized into the RSC payload for visitors where the bell renders null (client-side `useSessionUser` decides). Pass the session user down (layout already has it) and return `null` before loading, or pass only the `notifications.*` keys.
6. **Dropdown (non-modal) does not close on Tab-out** - `notification-panel.tsx:59`. `role="dialog"` without `aria-modal` and without focus-leave handling: keyboard users tab past the panel and leave it open over the page. Close on `focusout` to outside the wrapper, or give it `role="region"`/`aria-label` instead of `dialog`.
7. **`dynamic(..., { ssr: false })` has no error path** - `notification-bell.tsx:15`. A failed chunk load leaves the bell opening nothing, silently. Add a `loading`/catch that announces `notifications.panel.loadError`.
8. **Housekeeping**: `notification_read_integration_test.go` is 245 lines (>200 rule; split by endpoint); phase-10 plan todo boxes (`phase-10-notification-center.md:52-55`) still unchecked; `key={line}` in `notification-detail-dialog.tsx` and `notification-item-row.tsx` collides if two lines are equal (use index).

## Acceptance (plan / contract)

- R02 read-time re-mask by current anonymity, admin exception: met (code + unit test; DB-level test `TestListRemasksSenderByCurrentAnonymity` present, not run).
- R19 detail opens when mark-read fails, dot stays, failure announced: met.
- R23 request deadlines: `dbx.RequestContext` 5 s on all four reads/writes; post-commit 2 s is pre-existing and untouched.
- N01/N03/N04/N10: unchanged by this diff (insert side already in place); read side consistent with them. N10: no profile-header badge introduced.
- Seven kinds only, text built client-side from kind + params: met.

## Numbers

- Lint / type / tests: not run (read-only review, Go not available). Unit and integration tests exist for remask, cursor, page limit, mark-read ownership, read-all scope, paging, router flow, message builder, time format, e2e spec.
- Source files over 200 lines: 0; test files over 200: 1.

## Unresolved

- W2: is read-all meant to include rows the user has not seen? Needs a spec decision.
- Does the kudo detail endpoint (F006) mask the sender of an anonymous kudo for the receiver who reaches it from a notice? Out of this diff, but the notice now provides a direct link (`kudoId` + `kudoViewable`).

**Status:** DONE
**Summary:** 0 critical, 3 warning, 8 suggestion. Backend anonymity re-mask, ownership 404 uniformity, cursor validation, indexes, route class and seed all check out. Frontend is XSS-safe with clean timer/listener cleanup.
**Concerns/Blockers:** None blocking. Fix W1 (key by user id) before merge; decide W2 (read-all vs unseen rows) and W3 (focus throttle).

---

# Recheck (fix round 1)

Read the working-tree diff again: `notification-bell.tsx`, `use-unread-count.ts`, `unread-refresh-policy.ts` (+ test), `notifications-api.ts`, `session-summary.ts` (+ test), `src/app/admin/layout.tsx`, `demo_activity.sql`, `demo_notifications.sql`. Nothing was run.

## Closed

- **W1 closed.** `NotificationBell` renders `<UserNotificationBell key={user.id}>`, so count, open panel, and list state reset on a user switch. The effect cleanup bumps `sequence` and aborts the in-flight read, so an answer for the previous user is never applied. `signal` support already existed in `go-api-request.ts` (not in the diff): a caller abort is rethrown, not turned into an ApiError, and `shouldLogRefreshFailure` keeps it quiet. StrictMode double mount is safe (cleanup aborts, second mount refreshes).
- **W2 accepted as spec behaviour** (FR-402 / A7 "every unread"). No code change. Keep the limitation in the spec edge cases.
- **W3 closed.** `shouldRefreshOnReturn(visible, lastStartedAt, now)` gates focus and `visibilitychange` at 5 s; the 60 s interval is separate and visible-only. `lastStartedAt` is set on every refresh, so the panel-open and after-mark-read refreshes also count toward the gap (they themselves are not throttled, which is right: they are user-driven). Pure function with boundary tests.

## SessionUser.id: behaviour change beyond the new field? No

- Go `/me` already returns `id` (`profile_service.go:33`, `json:"id"`), so the new required field is satisfied by the real API.
- `toSessionUser` now also returns null when `id` is missing or empty. Effect: a `/me` body without a usable id is treated as unusable exactly like a missing `name` or `role` (existing behaviour for those). I found no other producer of a `SessionUser`: the consumers (`avatar-menu`, `floating-action-button`, `me-refresher`, `sunner-avatar-hover`) only read it, and no other file builds one (grep for `displayName:` outside the session-summary files is empty). Role still comes only from Go. No change to the role gate, token handling, or sign-out path.
- Residual: a strict `id` check turns a malformed `/me` into signed-out chrome rather than a half-working one. Acceptable and consistent.

## Admin layout: gate unaffected

The new providers are mounted only inside the existing `summary.kind === "signed-in" && role === "admin"` branch, after the unchanged 401/403/error branches (profile-missing redirect, unavailable notice, non-admin fallback). Dictionary load happens only for admins. The admin tree is outside `(shell)/layout.tsx`, so `ShellActionsProvider` and `GamificationShellHost` are not double-mounted. `RulesPanelController` registers a "rules" action with no FAB in admin: harmless. No new data path is exposed to non-admins; Go still guards every admin API.

## Seed

- `demo_activity.sql`: An's boxes 2..6 get five distinct icons; box 1 is `enum_range[1 + (1 % 6)]` = `TOUCH_OF_LIGHT`, so the set is exactly six; `icons_completed_at` = latest `opened_at` and only when `count(distinct icon) = 6` (guarded if An has fewer than 6 boxes). Enum values exist. Idempotent: the user row is deleted and recreated each run.
- `demo_notifications.sql` step 6 derives `icons_completed` from `users.icons_completed_at` with the same once-ever dedupe key; self-consistent with the producer (F008 BR-010).
- Hashtag cleanup deletes every hashtag with no `kudo_hashtags` row, not only demo ones. Only `demo_activity.sql` seeds hashtags and the seed is local-only, so safe here; the comment says so.
- Side effect: An's `icons_completed` notice is now dated about 7 h ago and unread (the old row was 3 days old and read). Any e2e assertion on An's unread total or on that notice being read needs to expect that; the spec reads counts from the DB, so it should be fine.

## New defects

None critical or warning.

- Suggestion: the hashtag cleanup as written would also delete non-demo orphan hashtags on a shared local DB; restrict to `created_at` within the test-run window only if that ever matters.
- Prior suggestions 1-8 are unchanged and still open (all low).

**Status:** DONE
**Summary:** Recheck: 0 critical, 0 warning, 1 new suggestion (9 suggestions open in total). W1 and W3 closed; W2 accepted per spec. `SessionUser.id` adds no behaviour change beyond rejecting an id-less `/me` body; admin gate and 403 paths unaffected.
**Concerns/Blockers:** None. Tests and lint were not run by me; the coordinator should run the Vitest session-summary and refresh-policy tests plus the Go notification suite.
