# Review: phase 8 (F008 hearts, x2 badge, hero badges, Thể lệ, Secret Box)

Scope: uncommitted tree vs fd141ca, read-only static review (no Go toolchain, nothing executed). 19 modified and about 45 new files. Ignored: .mcp.json, spec/.claude, logs, evidence/screens.
Contract items checked: R09, R11, R12, R02, N10, N12.

## Assessment
Backend is solid. The heart and box-open transactions follow the contract: row locks, server-side weight, stored replay, no fallback weight on lookup failure. Two real defects in the client heart store (W1, W2). One contract gap on "exactly one notification" (W3). No critical findings. Every file is under 200 lines (largest: secret_box_service_integration_test.go 194, secret-box-modal.tsx 175).

## Critical
None.

## Warning

**W1. Optimistic heart state is dropped on every window focus.** `src/features/gamification/heart-state-store.ts:19-32,45`
- The store is a `WeakMap` keyed by the `useSessionUser()` object. `MeRefresher` (`src/components/shell/me-refresher.tsx:34`) runs `setState(... user: summary.user)` on every `focus` event, and `summary.user` is a fresh object each time.
- After the user hearts a card and alt-tabs back, the entry map is new. The card falls back to its stale server props and shows the pre-click heart and total, although the server stored it. The feed data is client state and is not re-fetched.
- Fix: key by a stable id (`Map<string, Map<kudoId, Entry>>` keyed by the viewer's user id; confirm the SessionUser id field name). Clear the other users' maps when the id changes, so the no-leak-between-users property stays. Add a store test: "viewer object replaced, same id, state kept".

**W2. Concurrent toggles on the same kudo are not serialized.** `heart-button.tsx:34-48`, `heart-toggle.ts:31-47`
- `inFlight` is a per-component ref. The same kudo can render in Highlight, the feed and the detail at once, and the store is shared across them.
- Two cards clicked within one request time send PUT and DELETE concurrently. Go commits in an unknown order, but the UI shows whichever response arrives last. The rollback `show(current)` can also overwrite a newer confirmed state from the other card.
- Fix: keep an in-flight set keyed by kudoId in `heart-state-store.ts`. Expose `busy(kudoId)` and have `toggle()` bail and set `busy` from it, so all cards of one kudo disable together. Do not roll back past a state that the store has since changed.

**W3. "Exactly one notification" is really "at most one".** `secret_box_service.go:92-103`, `heart_service.go:112-134`
- The `icons_completed` notice is sent after commit, best effort. A notifier failure, a timeout or a crash between commit and send loses it permanently, because the replay path sets `completed=false` and never re-sends.
- The flag is set once (the `SetIconsCompletedAt ... IS NULL` guard under the user lock). The race is correct, and no duplicate is possible: the dedupe key `icons_completed:<user>` covers it.
- Fix: on a replay or retry of the completing key, when `GetIconsCompleted` is true, call `notifier.Create` again with the same DedupeKey. That is safe because it is idempotent, and it turns a lost notice into a retry. Otherwise write the notification row in the same tx. If best effort was the accepted R23 decision, say so in the contract. The e2e SC-012 only covers the happy path.

## Suggestion

- S1. `use-open-secret-box.ts:94,98`: `refresh()` after an open is not sequenced. A slow GET from open 1 can land after open 2's `summaryAfter` and show stale counts until the next refresh. Keep a request counter and ignore a refresh that is older than the last open.
- S2. `secret-box-modal.tsx:62-65`: the `openGift` `setTimeout` is never cleared on unmount. It is harmless in React 19 but not clean. Store the id in a ref and clear it in the effect cleanup.
- S3. `active-campaign-context.tsx`: the campaign is read once per layout mount. A campaign that starts while the page is open shows no badge, and the optimistic guess uses weight 1 until the server total replaces it (hearts stay correct). Optionally re-read on `focus` or at `startsAt`.
- S4. `heart-button.tsx:63-68`: the `aria-label` always reads "give". With `aria-pressed` that is acceptable, but a withdraw label would be clearer. A `disabled` button is not focusable, so the keyboard user only gets the own-kudo reason through the label. That is fine, but `aria-disabled` would keep it reachable.
- S5. `backend/db/queries/gamification.sql` (`SumHeartsOnSentKudos`): hearts on non-public (spam) kudos of the sender still count towards the box high-water mark. Confirm that this matches BR-006 and the contract note, and add it to the test if intended.
- S6. `backend/db/seeds/demo_activity.sql:135-137`: the comment says Nhật gets kudos from 22 senders. The query yields 21 (1..23 minus 9 and 10); the old demo kudos may add more. Still Legend (>20), but fix the comment or the numbers.
- S7. The heart endpoints have no rate limit. Toggling after the sender reads the notice creates new `heart_received` rows (the dedupe only merges unread). Boxes cannot be farmed (high-water mark). Low risk; note it.

## Checked and fine (focus list)
- **Heart server logic.** One tx: `FOR NO KEY UPDATE` on the kudo, then sender 403, then non-public 409, then the weight from a single `LookupActiveCampaign` in the tx. A lookup error returns `ErrCampaignLookup`, rolls back, answers 500, and there is no weight-1 fallback (R09; `heart_service_integration_test.go:112`). `InsertHeart ... DO NOTHING` plus an `added==0` guard means the box top-up and notification only run on a real add. `heartTotal` comes from `kudo_heart_state`, with `viewerHearted` read in the same tx.
- **Box accrual.** The sender's user row lock serializes top-ups; the same lock is used by open. Lock order is kudo, then user row, then box. A mutual-heart test covers the deadlock case.
- **Open idempotency.** The user lock, then a key lookup scoped by user, then the stored `open_result` replay (N12). The replay consumes nothing and cannot notify twice. A key owned by another user hits the unique violation, rolls back the whole tx (including `SetIconsCompletedAt`) and returns 409. The box is chosen server-side. The client keeps one key per intent across a retry after a 5xx, network or invalid-body failure, and drops it on a definite 4xx (`secret-box-open-intent.ts`). A double click is blocked by the `opening` ref. A lost response replays the same result.
- **6th icon.** `len(before)<6 && len(after)==6` under the user lock, and `SetIconsCompletedAt` has an `IS NULL` guard. `completed` is true only when that update touched one row (`TestConcurrentOpensCompleteTheSetOnce`).
- **New read routes.** Both use `d.Routes.Profile`, and the viewer comes from the token only. The summary has no user id input. The active campaign `ID` is `json:"-"`. Recipients return only id, name, avatar and icon, with no kudo or sender data (R02). `ListLatestGiftRecipients` moved verbatim, and `SidebarRecipients` is now an alias of `gamification.GiftRecipientsLimit` (10, same value). There is no import cycle (gamification does not import kudo). The anonymous sender's tier is masked by `maskSender`, and the DTO builds tiers with one batch query (no N+1).
- **Client state across users.** There is no cross-user leak (WeakMap per viewer object). The modal state is per mount. W1 is the flip side of that design.
- **Reduced motion.** Shake and pop-in are skipped, the opening hold is 0 ms, and the heart transition has `motion-reduce:transition-none`. The hover timer, popover timer and campaign timer are cleaned up. Pre-loaded images are harmless.
- **Seed.** Only `*.demo@sun-asterisk.com` fake people, no secrets, a local-only header, and an idempotent delete order (hearts, then campaigns, then kudos). The campaign author is a demo Sunner, since admins come from env. The generated kudos use sanitized HTML. 4a gives hero tiers coverage.
- **e2e fixture.** `e2e/support/gamification-fixtures.ts` is test-only and uses `runLocalSql` with a UUID guard. It is not imported from `src/` or from product code.

## Implementer deviations
- Prize frames as one completion screen (D010): accepted. There is no prize data, and the caption says the prize is handed out at SAA 2025.
- Campaign badge sidebar-only (D013): accepted.
- Heart outline and grey states (DEC-001): accepted. Own-kudo uses a grey filled heart plus a title and label.
- Secret Box button always enabled: accepted. The empty state (FR-207) covers zero boxes. The old `disabled` guard contradicted FR-102.

## Plan completeness
All 7 todo items are implemented. The plan lists `heart-button.test.tsx`, but `heart-button.test.ts` covers the toggle logic, which is fine (no DOM). There is no test for the store (W1) or for a rate-limited/stale heart. All new e2e specs are listed in `e2e/README.md`. `backend/README.md` documents the endpoints.

## Actions in order
1. W1: key the heart store by user id and add a test.
2. W2: serialize hearts per kudo in the store.
3. W3: decide at-most-once vs exactly-once for `icons_completed`; re-send idempotently on replay if exactly-once.
4. S1, S2, S5 (confirm), S6 (comment fix).
5. Re-run the Go integration suite in full (safety-critical data mutations) and the e2e specs after W1 and W2.

## Numbers
- Type coverage: not measured.
- Test coverage: not measured (no toolchain). Go integration covers idempotent hearts, campaign failure, concurrent 5th heart, mutual hearts, concurrent completion, replay and reads. Vitest covers toggle revert and key reuse.
- Lint findings: not run.

## Still unresolved
- Is the post-commit notice meant to be at-most-once (R23) or exactly-once (contract R11/R12)? (W3.)
- Does BR-006 count hearts on spam kudos? (S5.)
- The exact SessionUser id field for W1 was not checked.

**Status:** DONE_WITH_CONCERNS
**Summary:** 0 critical, 3 warning (W1-W3), 7 suggestion (S1-S7). Server logic for hearts, box open and idempotency is correct on read. No leak found in the new endpoints.
**Concerns/Blockers:** W1 (heart reverts visually on window focus) and W2 (concurrent card toggles) should be fixed before merge. W3 needs a decision. Nothing was executed here, so Go compile, tests, lint and e2e still need to be run.

---

## Recheck (fix round 1)

Static read only again (no Go toolchain, nothing executed). Re-read: heart-state-store.ts, use-heart-view.ts, heart-toggle.ts, heart-button.tsx, secret_box_completion_notice.go, secret_box_service.go, notification_service.go, caller_cancellation.go (+ handler diffs), campaign-badge.tsx, heart-slot.tsx, rules-panel.tsx, board-sidebar.tsx, use-open-secret-box.ts, secret-box-modal.tsx, box_grant_spam_kudo_integration_test.go.

### W1, W2, W3: closed
- **W1 closed.** The store is now one `Map` per page, bound to the Supabase user id through `onAuthStateChange` (`use-heart-view.ts`). Focus re-reads of `/me` no longer touch it, and a TOKEN_REFRESHED event with the same id is a no-op (`identify` returns early). A sign-out or another account clears entries and in-flight claims. Entries made before the first auth event are kept for the first identified viewer, which is fine because the button only renders signed in.
- **W2 closed.** `begin(kudoId)` is a per-kudo claim shared by all cards, and `busy` drives `aria-busy`. `revert` restores only when the guess is still what `view()` shows, so a newer state is never undone. `end()` clears the claim.
- **W3 closed**, and the departure from the spec is acceptable (next section).

### Judgement: `notification.StoreInTx` vs "F008 never writes notifications directly"
Acceptable, with one condition. The write still goes through the notification package: `validate`, the BR-003 self-action skip, the N01 anonymity lock, the N03 once-ever insert and the BR-004 merge are the same code as `Create` (the refactor splits `store` into `validate` + `insert`, behaviour unchanged). F008 does not touch the notifications table or know its columns. Only the transaction boundary changed, and the contract needs that: `icons_completed_at` and its notice must be atomic (R11, "exactly one"). The spec line was written for a post-commit best-effort world; amend it rather than obey it here.
- Condition: amend the technical spec/contract text so the next reader does not treat this as a violation. Heart notices stay post-commit best-effort, which is right: they are mergeable and non-critical.
- **Savepoint semantics are correct.** `pgx.BeginFunc(ctx, tx, ...)` on a `pgx.Tx` opens a nested transaction, which is a `SAVEPOINT`. An error runs `ROLLBACK TO SAVEPOINT`, so the outer transaction is not aborted and the open still commits. Success releases the savepoint, so the notice commits with `icons_completed_at`. `InsertOnceNotification ... ON CONFLICT DO NOTHING` returning no rows is handled as a duplicate no-op, so a replay or lost-response retry cannot add a second row. The post-commit `Create` is then a no-op through the dedupe key, and it only does real work if the in-tx write had failed. `completed` is true only for the one open that flipped `icons_completed_at` under the user lock, so the in-tx write runs at most once per user.
- Residual: if the context is cancelled inside the savepoint, the outer commit fails too, so the open and its notice roll back together. Consistent.

### New findings
**Warning:** none.

**Suggestion**
- N1. `heart-button.tsx:40-47`: `end()` runs after `await runHeartToggle(...)` with no `try/finally`. Request errors are caught inside `runHeartToggle`, but a throw from `show` or `revert` (a listener error) would leave the kudo claimed, and every card of it disabled. Wrap in `try { ... } finally { end(); }`.
- N2. `heart-state-store.ts` `identify`: clearing `inFlight` while a request is pending lets a second request for the same kudo start under the new viewer, and the old response then calls `set` for the new viewer. It needs a sign-out or account switch mid-request, so very low risk. A viewer generation check in `set` would close it.
- N3. A client abort (the 5 s budget) on a heart request gives status 0, so the heart reverts with "failed" even if the server committed just before. A retry is an idempotent PUT/DELETE, so it self-heals. Not a regression; noted only.
- N4. `caller_cancellation.go`: INFO is used only when `r.Context()` itself ended, so our own 5 s `dbx.RequestContext` deadline stays ERROR. I found no middleware that gives `r.Context()` a deadline, so a server-side timeout is not hidden. In `heart_handler.go` the case sits before `ErrCampaignLookup`, so a cancelled lookup is INFO plus a generic 500 instead of `campaign_lookup_failed`. The caller is gone, so that is fine. Check that a test covers the heart and open handlers, not just the active-campaign handler.
- N5. `campaign-badge.tsx` `placement="above"` inside the card: the Highlight carousel wraps cards in `overflow-hidden`. The 368 px overlay opens upward inside the card, so it should fit, but I did not check it visually. Eyeball the first and last carousel card and a short feed card.
- N6. The badge now renders once per card with its own hover timer. Cheap, and hidden without a campaign. Nothing to do.

### Other items in the round
- **S1 done:** the `opens` counter makes a stale summary refresh a no-op (`use-open-secret-box.ts`).
- **S2 done:** `giftTimer` is kept in a ref and cleared in the cleanup (`secret-box-modal.tsx:33,44,57`).
- **S5 done** by the spam-kudo test: 4 kept hearts on a spam kudo plus 1 new heart give 1 box (D015 cited in the comment). Confirm D015 in the contract.
- **S6:** not re-verified in this round; check the sender count in the seed comment.
- **Rules panel footer:** correct. The panel is a flex column with a scrolling body (`flex-1 overflow-y-auto`) and a `shrink-0` action row, so "Đóng" and "Viết KUDOS" stay visible. The body is a focusable labelled region for keyboard scrolling. The focus trap, Esc and backdrop close are unchanged.
- **Sidebar spacing:** class changes only. The Secret Box button lost its `disabled:*` classes, consistent with the declared always-enabled deviation.
- No new file over 200 lines among those read.

### Actions
1. N1 (try/finally); optionally N2.
2. Amend the spec/contract line on in-transaction notification writes.
3. Run the Go integration suite in full (the notification refactor touches a shared package, so also the notification, kudo-compose and board suites), Vitest, lint and the two e2e specs. Look at N5 in the browser.

**Status:** DONE (W1, W2, W3 confirmed closed; nothing here blocks merge)
**Counts (recheck):** 0 critical, 0 warning, 6 suggestion (N1-N6). Round 1 totals: 3 warnings closed, 7 suggestions (S1, S2, S5 closed).
**Concerns:** nothing was executed, so compile, tests and lint are unverified. The `store` to `validate` + `insert` refactor in the notification package needs its suite run.

---

## Recheck 2 (fix round 2)

Static read only (no Go toolchain, nothing executed). Read: `httpx/request_failure_log.go` + test, every `LogRequestFailure` call site (diffs of auth, gamification, kudo, user, moderation, upload), `auth_middleware_cancellation_test.go`, `api_gamification_cancellation_integration_test.go`, `heart-toggle.ts` (`withHeartClaim`), `heart-button.tsx`, `board-sidebar.tsx`.

### Auth (safety-critical): only the log call changed
- `auth_middleware.go` (`RequireProfile`, "load profile role"): the `slog.ErrorContext(...)` line became `httpx.LogRequestFailure(r, err, ...)`. The surrounding `switch` is untouched: `pgx.ErrNoRows` still gives 403 `CodeProfileNotProvisioned`, any other error still gives `WriteInternalError` (500) and `return`, and the identity/auth context is attached only on success. No status code, error flow or authorization decision moved.
- `me_handler.go` ("read me", "provision profile"): same one-line swap each, nothing else in the diff.
- The token check and the identity/permission steps run before these lines and are not in the diff. A cancelled caller still gets the 500 that it got before; only the log level differs.
- `auth_middleware_cancellation_test.go` asserts exactly this: 500 in both cases, INFO when the caller hung up, ERROR when the database fails while the caller waits.

### `httpx.LogRequestFailure` and its call sites
- Logic is right: INFO only when `r.Context()` itself ended and the error is `Canceled` or `DeadlineExceeded`. The server's own 5 s database deadline while the caller waits stays ERROR (the helper's test covers all five combinations, including "database down after the caller left" staying ERROR).
- Imports are consistent in every touched file: where `slog` is no longer used, the import was removed (kudo list/highlight/sidebar/spotlight/filter/hashtag handlers), and where it is still used elsewhere it stays. No unused import or missing `httpx` import found.
- Old `caller_cancellation.go` is gone and no reference to `canceledByCaller` remains in the files I read.
- `heart_handler.go`: the `ErrCampaignLookup` case now has `&& !httpx.CanceledByCaller(r, err)`, so a caller who hung up during the campaign lookup falls to `default` (INFO log, generic 500) instead of the `campaign_lookup_failed` body. The caller is gone, so this is harmless; the 500 status is unchanged.
- Cancellation integration test: holds the same row lock the handler's transaction takes, waits for the handler to block, cancels, then asserts 500, INFO only, and zero rows written for both the heart and box open. This proves the rollback and the log level on the real router; good test.

### Frontend
- **N1 closed.** `withHeartClaim` takes the claim, runs, and releases in `finally`; a thrown `show` callback no longer leaves the kudo locked. Three unit tests cover the busy, released and throwing cases. `toggle()` ignores a `null` (claim held by another card), as intended. A throw from `run` becomes an unhandled rejection in the click handler. It needs a store listener to throw, so rare; not worth more code.
- **board-sidebar right inset** (`pr-2` to `pr-[88px]`, `max-h-[444px]`): a layout-only change; the comment gives the Figma measurement. The 88 px inset narrows the recipients list on small widths. Eyeball the sidebar at the narrowest supported width for wrapped names.

### New findings
**Warning:** none.

**Suggestion**
- R1. INFO can hide a database stall. The server's 5 s database deadline and the browser's 5 s budget end at about the same moment, so during a real database slowdown many failing requests will see the caller's cancellation first and be logged at INFO, not ERROR. The alert that "a database outage still pages" then depends on the race. Options: log cancelled-by-caller at WARN, or keep ERROR when the request ran at least `dbx.RequestTimeout` before the caller left. Add a metric or count if there is one. Not a blocker.
- R2. `LogRequestFailure` does `append(args, "error", err)` on the caller's variadic slice; harmless for the literal call sites, but a caller passing a slice with spare capacity would get it written. Use `slices.Concat(args, []any{"error", err})` if you want to be safe.

### Actions
1. Decide R1 (WARN, or an elapsed-time rule).
2. Run the full Go suite (auth is safety-critical; the helper touches 20 handlers), the cancellation integration tests, Vitest, lint.

**Status:** DONE (N1 closed; auth change is log-only; nothing blocks merge)
**Counts (recheck 2):** 0 critical, 0 warning, 2 suggestion (R1, R2). Running total across rounds: 0 critical, 3 warnings closed, N1 closed.
**Concerns:** nothing executed, so compile and test results are unverified. R1 is a monitoring trade-off for you to decide.
