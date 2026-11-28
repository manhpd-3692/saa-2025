# Reviewer report — phase 6 (F005 write / edit / send kudos)

Scope: uncommitted tree on feat/saa-screens vs b4bad0a. Read-only review. Ignored: .mcp.json, plans/**, spec, .claude, logs.
Method: read every changed/new Go (kudo, upload, user, dbx, cmd/purge-uploads, wiring, SQL), TS (src/features/kudo-compose, shell wiring), dictionaries, e2e edit.
Checked against contract R01-R04, R20, N01, N02, N05, N07.
Not run: Go toolchain absent in this shell (`go` not found), so `go build/vet/test` and the integration tests were NOT executed. `tsc --noEmit` and `eslint` (src/features/kudo-compose, src/app, src/components) produced no output (clean). en/vi `kudo-compose.json` keys identical.

## Verdict
No critical defects found. The data-mutation core matches the contract. Warnings are about robustness and test gaps, not correctness of the happy or contested paths.

## Critical
None.

## Warning

W1. Post-commit cleanup runs inline and delays the PATCH response — `backend/internal/kudo/kudo_update_service.go:23,98-102`
`s.cleaner.Cleanup` (up to 5 sequential Storage DELETEs + row deletes) runs before returning, with a 10 s budget. R04/R23 say best-effort, post-commit, 2 s detached. A slow Storage turns a committed edit into a ~10 s response (and the client may time out and retry a save that already succeeded). Fix: run it in a goroutine with `context.WithTimeout(context.WithoutCancel(ctx), cleanupTimeout)` (and lower to the R23 2 s per call, or keep 10 s total), or keep synchronous but cap at 2 s. Tests that need determinism can inject a synchronous cleaner (the `PendingDeleteCleaner` interface already allows it).

W2. Storage I/O while holding a row lock inside the 5 s tx — `backend/internal/upload/upload_delete_handler.go:81-92`, `backend/internal/upload/pending_delete_cleanup.go:98-109` (purge)
`store.DeleteObject` is called after `FOR UPDATE` and before the row delete, in the same tx. A slow Storage holds the upload row lock (blocking a concurrent create attach, which waits then 422s) and eats the 5 s tx deadline. Safe, because order is object-then-row and ErrObjectNotFound is tolerated, but avoidable. Fix for DELETE: lock + verify state, mark the row (or just delete the row) in the tx, delete the object after commit; leftover objects are an orphan-purge matter anyway. Acceptable to defer, since purge handles leftovers and the state machine stays correct.

W3. Double-submit can create two kudos — `src/features/kudo-compose/kudo-compose-form-state.ts:145-146,158-160`
`if (submitting) return` reads the render-closure state; two clicks before the re-render both pass. Create has no idempotency key, so a duplicate kudo is possible (the second call's attachments would 422, but with zero images both succeed). Fix: guard with a ref (`const sending = useRef(false)`; set at start, clear in `finally`) in addition to the disabled button.

W4. Escape discards the whole form without confirmation — `src/features/kudo-compose/kudo-compose-form.tsx:46-51`
Any Escape not `defaultPrevented` (including from the title input or the editor) calls `cancel()`: typed content and unsaved uploads are dropped (uploads are deleted best-effort). One stray key loses a 1,000-character message. Fix: confirm when the form is dirty (compare against `initial`), or limit Escape-cancel to when focus is on the panel/buttons. Check FR-405 in the functional spec to see if silent cancel is mandated; if so, document it.

W5. Dialog has no focus trap / focus restore — `src/features/kudo-compose/kudo-compose-modal.tsx:46-60`
`aria-modal="true"` but Tab can leave the dialog into the page behind; focus is not returned to the FAB on close. The nested LinkBox has the same gap. Fix: trap Tab within the panel (or use `<dialog>.showModal()`), and restore focus to the opener on unmount.

W6. Missing concurrency tests for the lock-order claims — `backend/internal/kudo/*_integration_test.go`
Present and good: barrier test for late notice vs anonymous edit (N01), stale prefill (N02), router tests for 404/403/409, wildcard search, purge selectivity. Absent: (a) PATCH vs F011 spam status change on the same kudo (N05 serialization, and the under-lock `editRefusal` re-check at `kudo_update_service.go:112`), (b) DELETE upload vs create/edit attach race (409 vs 422 outcome documented at `upload_delete_handler.go:73-74`), (c) two concurrent edits of one kudo. The code looks right by inspection (kudo `FOR NO KEY UPDATE` first, uploads `FOR UPDATE` in id order, no cycle with create's receiver-then-uploads order), but the claims are untested. Add at least (a) and (b) with `HoldRowLock`.

## Suggestion

S1. `RedactKudoNotificationSenders` has no supporting index check — `backend/db/queries/kudo_write.sql:98-102`
`WHERE kudo_id = $1` on `notifications`. I could not find the migration dir via `db/migrations/*.sql` (path differs); confirm an index on `notifications(kudo_id)` exists, else every anonymous edit seq-scans the table while holding the kudo lock.

S2. Mention text is client-authored and unverified — `backend/internal/kudo/html_sanitizer.go:30-31` (pre-existing from create, now also reachable via edit)
Sanitizer keeps `span[data-type=mention][data-id=<uuid>]` with arbitrary text; nothing checks the id exists or that the text equals that user's name (a forged `@CEO` pointing at someone else). Cosmetic spoofing, not XSS (text is escaped, schemes allow-listed). Optional: in Go, resolve mention ids and rewrite the text to the stored name, or drop spans whose id is unknown.

S3. User search lets any Sunner probe email fragments — `backend/db/queries/user_search.sql:11`
Matching `u.email ILIKE` while returning only name/unit lets a caller confirm whether a given email prefix exists (a result for `q=alice.nguy` where the displayed name does not contain it). Spec-mandated (tech spec line 80-81) and internal domain only, so low risk; consider name-only match for the @mention path.

S4. `purge-uploads` has no dry-run — `backend/cmd/purge-uploads/main.go:34-55`
It deletes Storage objects and rows for every `pending` > 24 h and all `pending_delete` using the API's service key. Safe against attached rows (re-checked under `FOR UPDATE SKIP LOCKED`, `DeletePurgedUpload` guards by state), exit code reflects failures. Add a `-dry-run` flag that only logs `ListPurgeableUploads` and counts, because this is the one command an operator runs against production data by hand. Also `ListPurgeableUploads` is unbounded (loads all ids); fine at current scale.

S5. `localhost:3000`-style links rejected — `src/features/kudo-compose/link-box.tsx:11-14`
`/^[a-z][a-z0-9+.-]*:/i` treats `host:port` as a scheme, so `localhost:3000` / `example.com:8080` are reported invalid instead of getting `https://`. Safe direction (nothing unsafe passes; `javascript:` is rejected by the protocol check). Optional: only treat as a scheme when followed by `//` or in a known list.

S6. Client counter parity is regex-based, Go uses the HTML5 parser — `src/features/kudo-compose/visible-text-length.ts:26-27,87-116`
Shared vectors (`testdata/visible_text_vectors.json`, both test files) pin the agreed cases and the counter reads the editor's well-formed HTML, so N07 is met for Tiptap output. Residual drift risk is only for exotic markup the editor cannot emit; Go stays authoritative and answers 422. No change needed; keep adding vectors whenever the allow-list grows.

S7. File sizes — all code files < 200 lines (largest: `kudo-compose-form-state.ts` 191, `kudo_input_validation.go` 181). `kudo-compose-form-state.ts` is near the limit; the next feature touching it should split image handling (`useComposeImages`) out.

## e2e edit outside P6 — `e2e/browser-transport-smoke.spec.ts:71-72`
Legitimate contract update. The test PATCHes a random UUID with body `{}`. Before: route unregistered, 405 (the old comment said the real handler arrives in phase 6). Now: `UpdateService.Update` runs `editableKudo` (pre-check) before validation, so an unknown id returns 404 `kudo_not_found` regardless of the empty body (`kudo_update_service.go:79-84`, mapped in `kudo_edit_handler.go:99-100`). The test still proves what it exists for (CORS preflight passes, method reaches the handler, JSON error envelope readable cross-origin). It matches the sibling heart/unheart expectations. Note it depends on the refusal-before-validation order; if that order changes, this assertion flips to 422.

## Contract checklist
- R02/N01 anonymity vs notifications: PASS. Redaction in the edit tx (`kudo_update_service.go:130-136`) strips senderId/senderName/senderAvatarUrl for all notices of the kudo (read or unread); keys match `notification_kinds.go:45-47`; kudo lock is `FOR NO KEY UPDATE`, which conflicts with F009's `FOR SHARE`; never restored when anonymity turns off. Not implemented here (and not required by N01): the read-side re-mask by current `is_anonymous` mentioned in R02. N01 says insert + edit redaction are sufficient; confirm F009 intends no read-side mask.
- N02 state machine: PASS. pending -> attached (`AttachKudoUpload` guarded by state/owner/kudo_id null); removal sets `pending_delete` + deletes the `kudo_images` row in the same tx (`attachment_edit_finalizer.go:110-126`); kept images re-verified under the kudo lock against the current `kudo_images` rows; `pending_delete` never eligible again (`InspectEdit` default branch, `lockAndCheck`); post-commit cleanup deletes only `pending_delete` (`DeletePendingDeleteUpload` has `state='pending_delete'`); mark-count mismatch aborts the tx. Stale-prefill double edit covered by `TestStalePrefillCannotKeepARemovedImage`.
- R04 DELETE upload: PASS. Row locked `FOR UPDATE`; missing / malformed id / foreign owner -> 404 (foreign not revealed); attached or pending_delete -> 409; pending -> object then row -> 204; storage failure -> 5xx and the row stays for purge.
- R03 / authority of the sanitizer: PASS. `UpdateInput` carries only `imageUploadIds`; no receiverId read; content sanitized then validated on stored form; real-object inspection for new uploads; client sends only uploadIds.
- BR-006 edit authorization: PASS. Non-author on non-public -> 404, non-author on public -> 403, author on spam -> 409; re-checked under the lock; refusals precede validation and Storage reads.
- N05 lock order: PASS by inspection. Edit locks only the kudo row; uploads locked in id order; no users-row lock.
- A2 search: PASS. Excludes caller in SQL (`u.id <> viewer`), limit clamped 1..20, query capped at 100 code points, NUL stripped, `\ % _` escaped (`dbx/like_pattern.go`), wildcard test present. Hashtag list: normalized prefix + escaped, limit 50.
- R20/N07: Go `visibleText` and client mirror use the same shared vectors.
- Frontend: Tiptap lazy loaded via `next/dynamic({ssr:false})`; inputs and uploads kept on failed submit (422 field errors and problem key mapping); locale lock set while open and released on unmount; no `dangerouslySetInnerHTML`; links limited to http(s) client-side and by sanitizer; mention/user names rendered as React text.
- Secrets: none in source (grep for keys/service role/JWT patterns clean); service key stays in Go env. `package.json` pins Tiptap exactly (3.33.1); lock file change is dependency expansion only.

## Done well
- One shared error mapper (`writeKudoWriteError`) for create and edit; refusals are indistinguishable from not-found where probing matters.
- Re-check under lock after a cheap unlocked pre-check; explicit comments tying each step to R/N ids.
- Purge: per-row short tx, `SKIP LOCKED`, re-check predicate under lock, guarded delete, non-zero exit on failures, test-suite advisory lock to avoid cross-package interference.
- Client keeps `uploadId` only; late upload completions after cancel/remove are discarded server-side; blob URLs revoked.

## Actions in order
1. W1 move/limit post-commit cleanup (response latency vs retry duplication).
2. W6 add the missing concurrency tests (PATCH vs spam moderation, DELETE vs attach).
3. W3 ref guard against double submit.
4. W4/W5 dirty-form confirm on Escape; focus trap + focus restore.
5. W2 move Storage delete out of the locked tx (optional).
6. S1 confirm `notifications(kudo_id)` index; S4 add `-dry-run`.

## Numbers
- Type coverage: not measured. `tsc --noEmit` clean.
- Test coverage: not measured; Go tests not executed here (no toolchain). Integration + unit tests present: ~1,400 lines in kudo/upload packages plus 2 TS unit test files.
- Lint findings: 0 (eslint on touched TS dirs).

## Unresolved
- Go build/vet/tests unverified in this review (no `go`); run `go vet ./... && go test -tags integration ./...` before commit.
- Confirm F009 does not need the read-side re-mask (R02 second sentence).
- Confirm FR-405 allows silent Escape-cancel (W4).

**Status:** DONE_WITH_CONCERNS
**Summary:** 0 critical, 6 warning, 7 suggestion. Contract items R02, R03, R04, R20, N01, N02, N05, N07 satisfied by inspection; the e2e 405 -> 404 change is a legitimate contract update.
**Concerns/Blockers:** Go toolchain unavailable here, so backend build/tests were not run. No blocking defects found; warnings W1 (inline cleanup latency), W3 (double-submit duplicate kudo) and W6 (untested lock races) should be addressed before merge.

---

# Recheck (after implementer fixes W1-W6, S4, S5)

Re-read: `upload/{stale_upload_purge,pending_delete_cleanup,upload_delete_handler}.go`, `queries/uploads.sql`, `kudo_update_service.go`, `wire_kudo_compose.go`, `cmd/purge-uploads/main.go`, `kudo-compose-{form-state,modal,host}`, `dialog-focus-trap.ts`, `link-url.ts`, FAB diff, new test names. Gates (go vet/test, npm, e2e 73/73) are as reported by the implementer; I did not re-run them (no Go toolchain here).

## Warnings
- W1 CLOSED. `AsyncCleaner` (`pending_delete_cleanup.go:84-108`) returns at once; goroutine runs under `context.WithoutCancel(ctx)` + 10 s timeout, `defer cancel()`, `recover` logs panics; wired in `wire_kudo_compose.go:15`. Lifetime check: context detached from the request (correct, otherwise the response end would cancel it); bounded; one goroutine per edit that removed images, so bounded by request rate; on shutdown the goroutine is simply lost and the row stays `pending_delete` for the purge (acceptable, never lost data). Tests: `TestAsyncCleanerReturnsAtOnceUnderADetachedBoundedContext`, `...SkipsAnEmptyList`.
- W2 CLOSED with a new caveat (N1 below). DELETE handler (`upload_delete_handler.go:57-80`) and purge (`stale_upload_purge.go:68-90`) now delete the row under lock, commit, then delete the object; on Storage failure the whole row is restored (`RestoreKudoUpload`, same state/created_at, `ON CONFLICT DO NOTHING`). Lifecycle test asserts the restored row equals the original.
- W3 CLOSED. `sending` ref (`kudo-compose-form-state.ts:75,152,173,186`) set synchronously and cleared in `finally`.
- W4 CLOSED AS WON'T-FIX, correctly. Functional spec FR-405 (line 87) says Hủy closes "without asking for confirmation"; Escape mirrors Hủy and an e2e (`write-kudo.spec.ts:102`) pins it. My warning was wrong against the spec.
- W5 CLOSED. `trapTabKey` (`dialog-focus-trap.ts`) wraps Tab / Shift+Tab, handles the panel itself as the wrap origin, ignores events from outside the container (portal LinkBox has its own trap, `link-box.tsx:8`); host restores focus to the opener on close (`kudo-compose-host.tsx:56-63`); editor refocuses after the link box; FAB gains one line to refocus its trigger. Logic sound; one nit N3.
- W6 CLOSED. `TestEditRacingASpamDecisionSerializesOnTheKudoRow`, `TestDeleteUploadRacingAnAttachingCreate` added (`kudo_edit_race_integration_test.go`, `api_upload_delete_race_integration_test.go`).
- S1 confirmed by implementer (index exists). S4 CLOSED: `-dry-run` flag, `Candidates` count, returns before any delete. S5 CLOSED: `EXPLICIT_SCHEME` uses `(?!\d)`, so `localhost:3000` gets `https://`; `javascript:` still rejected by the protocol check; `link-url.test.ts` added.

## New findings
Critical: none.

N1 (warning). Row-first ordering can strand an object permanently — `upload_delete_handler.go:75`, `pending_delete_cleanup.go:131-141`, `stale_upload_purge.go:84`.
Before, a crash or Storage failure between the two steps left a row (object-then-row), which the purge would retry. Now the row delete is committed first; if the process dies before the object delete, or the restore insert fails, the object has no row and nothing will ever find it (the restore failure is only logged at Error). Likelihood is low and the cost is an orphan image (privacy: the object key is opaque and private bucket, so no exposure), but it is a regression against "purge handles leftovers". Mitigations, cheapest first: (a) accept and document, with the Error log as the signal; (b) have `purge-uploads` also list bucket objects with no row (Storage list API) — larger; (c) keep the row, mark it `pending_delete` in the claim tx instead of deleting, then delete object + row after (state machine already supports it, and the existing purge/cleanup covers a crash). Option (c) is the robust one for the DELETE handler.

N2 (suggestion). Restore runs with no deadline — `pending_delete_cleanup.go:133`. `context.WithoutCancel(ctx)` also drops the 10 s deadline of `deleteCtx`, so a hung pool blocks the handler (and the purge loop) indefinitely. Use `context.WithTimeout(context.WithoutCancel(ctx), dbx.RequestTimeout)`.

N3 (suggestion). Focus trap filters by `getClientRects().length`; focusables inside the Tiptap contenteditable (`[contenteditable="true"]`) are matched, but the editor's `role=textbox` div is both the contenteditable and the only editor focus stop, so fine; with the edit-load "loading" state there are no focusables and Tab is not trapped (`items.length === 0` returns) — focus can escape the dialog for the brief loading period. Minor: `preventDefault` when no items.

N4 (suggestion). Between the DELETE row-delete commit and a failed-delete restore, a concurrent create attaching that upload gets 422 `invalid_attachment` for an upload that ends up existing again. Narrow and harmless for an unsaved upload being deleted by its own owner; noting only.

## Recheck verdict
All six warnings closed (W4 justified by spec). One new warning (N1) on the delete-then-restore design; no critical findings.

**Status:** DONE_WITH_CONCERNS
**Summary:** Recheck: 0 critical, 1 new warning (N1), 3 new suggestions (N2-N4); original W1-W6 closed (W4 by spec FR-405), S1/S4/S5 closed.
**Concerns/Blockers:** N1 — row-first deletes can orphan a Storage object if the process dies or the restore insert fails; prefer marking `pending_delete` in the claim tx (option c) or accept and document. Gates not re-run by me.

---

# Recheck 2 (N1-N3 fixes; migration `20261128060000_kudo_uploads_unsaved_pending_delete.sql`)

Read: the migration, original constraints (`20261110070238_kudos_uploads_images_hashtags.sql:44-45`), `uploads.sql`, `upload_delete_handler.go`, `stale_upload_purge.go` (`purgeOne`), `pending_delete_cleanup.go`. Gates per implementer; not re-run by me (no Go toolchain, no DB here).

## N1 closed
DELETE and purge now claim under the row lock by setting `pending_delete` (`MarkUnsavedUploadPendingDelete`, guarded `WHERE state='pending'`), commit, then delete the object, then the row (`deletePendingDeleteUpload`, row delete guarded `state='pending_delete'`). Any failure or crash leaves a `pending_delete` row, which `ListPurgeableUploads` / `LockPurgeableUpload` pick up on the next run, so an object can no longer exist without a row. The restore path is gone. Concurrency: a create attaching the same upload after the claim finds `pending_delete` and gets 422; a second DELETE sees `pending_delete` and gets 409; purge re-checks under `FOR UPDATE SKIP LOCKED`; purge of an already `pending_delete` row skips the mark and just deletes. Correct.
N2 (restore deadline) and N3 (trap while loading) removed or fixed per the implementer; the restore code no longer exists and `dialog-focus-trap.ts` was touched; not re-read in depth (suggestion-level).

## Migration review
- Constraint correctness: old rule was `(state='pending') = (kudo_id is null)` and the same for `attached_at`, which forced a `pending_delete` row to carry both. New rule: `pending` => both null; `attached` => both not null; `pending_delete` => unconstrained. `pending` and `attached` semantics are unchanged (the old biconditional is exactly the first two branches plus the old `pending_delete => not null`). A state outside the three enum values cannot occur (enum type).
- Invariants not broken: `AttachKudoUpload` still requires `state='pending' AND kudo_id IS NULL`, the only code reading `kudo_id IS NULL` (checked by grep). `pending_delete` is terminal and never re-attached or kept; edit-removed rows keep kudo_id/attached_at (N02), unsaved ones have them null, both are valid.
- Single statement: both drops and adds in one `ALTER TABLE`, so it is atomic (Postgres DDL is transactional) and the intermediate state with no constraint is never visible. It takes ACCESS EXCLUSIVE and validates existing rows; `kudo_uploads` is small, so negligible. Existing rows satisfy the looser check by construction.
- Reversibility: forward-only, consistent with the repo (no migration in `supabase/migrations` carries a down/rollback section). Rolling back to the old constraints would fail if any `pending_delete` row has a null `kudo_id`/`attached_at`; the manual rollback is `delete from kudo_uploads where state='pending_delete' and (kudo_id is null or attached_at is null)` (after the purge, such rows are transient) then re-add the old constraints. Worth one line in the migration header (S8 below), not a blocker.

## New findings
Critical: none. Warning: none.

S8 (suggestion). Tighten `pending_delete` slightly so a half-set state cannot exist: replace `or state = 'pending_delete'` with `or (state = 'pending_delete' and (kudo_id is null) = (attached_at is null))` in both constraints, or keep it as one combined check. Today `pending_delete` with `kudo_id` set and `attached_at` null is allowed, though no code produces it. Also add the manual rollback statement above as a comment in the migration.

S9 (suggestion). Confirm the migration is applied by the integration harness and by whatever `supabase db reset` seeds run in CI; the implementer reports integration green, which implies the test DB picked it up.

## Verdict
N1 resolved; migration is correct, atomic, and does not allow any state that breaks the attach/edit invariants.

**Status:** DONE
**Summary:** Recheck 2: 0 critical, 0 warning, 2 suggestions (S8-S9); N1-N3 closed. Overall phase 6 review: 0 open critical, 0 open warning.
**Concerns/Blockers:** none blocking. Go build/tests and the migration were not executed by me.
