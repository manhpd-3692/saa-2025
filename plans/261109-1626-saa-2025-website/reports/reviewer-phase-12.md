# Review: phase 12 (F011 admin kudo moderation + author spam overlay)

Scope: uncommitted tree on feat/saa-screens vs b9a44af. 15 modified + new files in `backend/internal/moderation`, `backend/cmd/api/wire_moderation_review.go`, `src/features/moderation`, `src/app/admin/review`, seeds, e2e. Read-only, static (no Go toolchain, nothing executed). Depth: full on the safety-critical paths.

Contracts checked: R05, R13, N05, N08 (codex-findings-resolution-contract.md), spec BR-001..BR-009, SC-006/012.

## Assessment

Sound. Authorization is consistent, the anonymity refactor is behaviour-neutral, decisions are versioned and lock-ordered, the search is injection-safe and renders XSS-safe. No critical or blocking issue. One robustness defect (NUL / invalid UTF-8 in `q` becomes a 500) and a few small items.

## Critical

None.

## Warning

W1. `q` with a NUL byte or invalid UTF-8 returns 500 on list and people.
- `backend/internal/moderation/moderation_review_filter.go:67-73` (`cutQuery`), used by `ParseReviewFilter` and by `ReviewService.People` (`moderation_review_service.go:107`).
- `?q=%00` or `?q=%FF` reaches Postgres as a bound text param; Postgres rejects it ("invalid byte sequence for encoding UTF8"), the handler logs and returns 500. Admin-only, no data exposure, but it is an externally triggerable 500 and noisy error logging. The repo already handles this elsewhere (`backend/internal/user/user_search_handler.go:83` strips `\x00`).
- Fix in `cutQuery`: `q := strings.TrimSpace(strings.ToValidUTF8(strings.ReplaceAll(raw, "\x00", ""), ""))`. Add a case to `moderation_review_filter_test.go`.

W2. Plan checklist not updated.
- `plans/261109-1626-saa-2025-website/phase-12-admin-kudo-moderation.md:54-58`: all five TODO boxes still `[ ]` although the code and tests exist. Tick them (and the roadmap/changelog per documentation-management rules) when closing the phase.

## Suggestion

S1. Count and list are two separate statements (`moderation_review_service.go:75,80`), not one snapshot. A decision or new kudo between them can make `total`, the clamped page and the rows disagree by one page edge. Harmless for an admin tool (next load corrects it); a `REPEATABLE READ` read-only tx would close it, or accept and note.

S2. The 12-line search expression is duplicated in `AdminCountKudos` and `AdminListKudos` (`backend/db/queries/moderation.sql`). Drift risk, since the pager must count exactly the listed set. sqlc cannot share fragments; keep the existing comment and add one integration case that searches a tag name, an `&amp;` and a block boundary and asserts `total == len(all pages)` (the list integration test partly does this).

S3. Search/highlight can disagree slightly. SQL normalizes by regex; the excerpt uses Go `visibleText` (HTML parser). A phrase matched in SQL across a block boundary or exotic entity may not be marked in the excerpt (`search-match-highlight.ts`). Cosmetic only; the highlight guard for length-changing lowercase is correct and rendering is plain React text/`<mark>` (no `dangerouslySetInnerHTML`), so XSS-safe.

S4. Spam overlay accessibility: `spam-alert-overlay.tsx:21-37` is `role="alert"` over a card that stays tabbable and readable by screen readers behind the blur. Consider `inert` on the sibling content while open (the overlay is closable, so no trap needed).

S5. Seed `backend/db/seeds/demo_notifications.sql` 5b: the restored Public kudo (`d2000004`) has a spam warning but no `kudo_received` notice for its receiver, which the file header ("every notice matches the data it reports") implies for a Public kudo. Demo data only.

S6. `src/app/(shell)/kudos/layout.tsx` doc comment line is >120 chars; wrap.

## Checks requested (all verified by reading)

| Item | Result |
|---|---|
| Admin-only on list/people/decision | All 4 routes mounted via `d.Routes.Admin(...)` (`wire_moderation.go:12-13`, `wire_moderation_review.go:13-14`); each handler re-checks via `adminCaller` (403 if context missing or non-admin). Decision handler refactored to the same helper; message and status unchanged. Route class + in-handler check consistent, no bypass. `GET /admin/kudos/people` vs `POST /admin/kudos/{id}/...` do not collide. Authorization matrix test covers 401/403 on all routes. |
| Decision / R13 / N05 / N08 | Unchanged logic (`moderation_service.go`): lock kudo, lock receiver, CAS on `moderation_version AND status<>target`. 409 only when version moved, else `changed:false` with no write and no notice; notice only on real change to Spam, after commit, detached ctx. 404 for missing id and bad UUID. Lock order kudo -> receiver matches P6 edit (kudo only) and P8 heart (`GetKudoForHeartForUpdate`, kudo first, then user rows); no inversion found. Lock-order integration test present. |
| Visibility after Public | Every read filters on `status='public'` live (kudo_read, profile, gamification, admin_reports, hover card); nothing denormalized to unwind. Detail read (`kudo_read_service.go:66`) unchanged: non-author non-admin gets uniform not-found. |
| `SenderShownTo` / `maskSender` | `!SenderShownTo(anon, v)` == `anon && !v.IsAdmin`, identical to the old condition. No behaviour change for P7/P9/P10. Review list sender goes through the same rule. |
| People endpoint | No email column selected or serialized (`ReviewPerson`). Limit 20, role validated (400). Email used only as a match term (admin-only, same exposure as the P11 directory). Anonymous real senders appear only for admin callers. |
| Search | Pattern built by `dbx.ContainsPattern` (escapes `\ % _`), bound as parameter, `q` capped at 100 runes (W1 aside). Tags/attributes stripped before match; `&amp;` decoded last (correct order). `<pre>`/`<p>` regex does not mis-split. Indexes: `kudos_created_idx` serves ORDER BY; heart view has a row for every kudo so the LATERAL inner join drops none. |
| Date / page | `ParseOptionalDateRange` drops lone/bad/reversed ranges; window is half-open in report TZ. Page clamped before the OFFSET multiply (no int32 overflow). |
| Spam overlay | Rendered only when `isOwn` (server-computed) and status spam; badge for any viewer Go lets see a spam kudo (author, admin). Teammate path unchanged (not-found). `moderation` namespace added to the kudos layout covering both `@modal` and page routes (only two callers of the overlay). |
| Frontend failure handling | `runKudoDecision`: 409 -> row refresh + stale notice, 404 -> reload, 401 -> login with return path, 403 -> `router.refresh()` into Forbidden. Button disabled while pending (double click writes once; server also guards). People select handles 401/403, aborts on change. Page uses `loadAdminReport` (401 redirect, 403 Forbidden). |
| P11 shared components | `DateRangePicker`: with `from`/`to` set and no `onClear` output is identical to before (aria-label, spans, no Clear button). `AdminPager`: `summary` optional, default unchanged. `AdminLocaleProvider`: `extraNamespaces` defaults to `[]`. `ParseOptionalDateRange` is additive. P11 unaffected. |
| Seeds | Rows use existing `demo_people` n=19..24; cleanup in `demo_activity.sql` already deletes demo kudos/notifications; the kudo_spam dedupe index only covers hero/icons kinds, so no conflict. See S5. |
| File size | All new files <=214 lines (tests 214/172/248 lines; `review-people-select.tsx` 148). Within the ~200 guideline except the integration tests. |

## Done well

- One anonymity rule (`SenderShownTo`) shared by feed and admin list; handlers fail closed outside the admin chain.
- Status target fixed by route, never from the body; version CAS plus idempotent same-target branch.
- Search normalization is documented in the SQL and mirrored in the count query so the pager matches the list.
- Filters live in the URL, Go echoes the applied values (labels, ignored range), UI parser mirrors Go's drop rules.
- Backend tests: auth matrix, anonymity, paging/search, browser-role grant check, lock-order race.

## Actions in order

1. W1: sanitize `q` in `cutQuery` (+ test).
2. W2: tick phase-12 TODOs, roadmap/changelog.
3. S1-S6 as time allows (S2 test, S4 inert, S5 seed notice).

## Numbers

- Type coverage / test coverage / lint: not measured (read-only, no Go toolchain; TS not run).
- Findings: 0 critical, 2 warning, 6 suggestion.

## Still unresolved

- Not executed: Go build, `sqlc` regeneration parity for `moderation.sql.go`, integration/e2e tests. The generated `moderation.sql.go` was read and matches the `.sql` (params numbering, columns, scan order) by eye only.
- Whether the Postgres `\s` / `[\s/]` classes in the tag regex behave as intended on the target server version was reasoned, not run; the list integration test should cover it.

**Status:** DONE_WITH_CONCERNS
**Summary:** 0 critical, 2 warning, 6 suggestion. Authorization, anonymity, concurrency and visibility hold; no blocking defect.
**Concerns/Blockers:** W1 (NUL/invalid-UTF-8 `q` gives a 500) should be fixed before merge; nothing was executed, so build and tests still need a run.

```json
{ "score": 8, "criticalCount": 0, "decision": "REWORK",
  "acceptanceCovered": ["admin-only list/people/decision", "R13 versioned decision with 409", "N05 lock order", "N08 404 kudo_not_found", "anonymous sender admin-only", "people without email", "spam overlay author-only"],
  "regressionChecked": ["maskSender behaviour P7/P9/P10", "P11 DateRangePicker/AdminPager/AdminLocaleProvider", "teammate not-found on spam kudo", "P6 edit and P8 heart lock order"],
  "contractStatus": "OK", "refuted": [], "unproven": ["Postgres regex classes in search SQL and generated sqlc code not executed"], "reachableRegressions": [],
  "findings": [
    { "severity": "Warning", "category": "Input validation", "location": "backend/internal/moderation/moderation_review_filter.go:67-73", "summary": "q with NUL or invalid UTF-8 reaches Postgres and returns 500 on list and people", "disposition": "Accept" },
    { "severity": "Warning", "category": "Completeness", "location": "plans/261109-1626-saa-2025-website/phase-12-admin-kudo-moderation.md:54-58", "summary": "phase TODO boxes not ticked", "disposition": "Accept" },
    { "severity": "Low", "category": "Concurrency", "location": "backend/internal/moderation/moderation_review_service.go:75-80", "summary": "count and list not one snapshot", "disposition": "Defer" },
    { "severity": "Low", "category": "Accessibility", "location": "src/features/moderation/spam-alert-overlay.tsx:21-37", "summary": "card behind overlay stays focusable", "disposition": "Defer" }
  ] }
```

---

## Recheck (fix round 1)

Re-read: `moderation_review_filter.go`, its unit test, the API integration test, `spam-alert-overlay.tsx`, `admin-select.tsx`, `review-filter-bar.tsx`, `kudo-detail-overlay.tsx`, `use-dismissable-popover.ts`, the e2e spec. Static only, nothing executed.

**W1 closed.** `cutQuery` (`moderation_review_filter.go:64-71`) strips `\x00`, applies `ToValidUTF8`, then trims and cuts; it feeds both list and people. Unit test (`moderation_review_filter_test.go:27-30`) covers NUL, invalid byte, and all-invalid -> empty. API integration test (`api_moderation_review_integration_test.go:104`) sends `%00`, `%FF`, `ph%00i%FE`. W2 is deferred to delivery-tracker as stated.

**P11 dropdowns unchanged.** `AdminSelect` `boxed` defaults to `false`; the non-boxed item and `<ul>` class strings are character-identical to the old ones. The other callers (`user-filter-bar.tsx:23,33,43`) pass no `boxed`. Only the Status select in `review-filter-bar.tsx:48` opts in.

**Overlay Escape vs modal/popover Escape: no conflict.**
- The alert's keydown listener is on `document` in the capture phase with `stopPropagation`, so it runs before React's root handlers and before the modal's `onKeyDown` Escape (`kudo-detail-overlay.tsx:86-90`) and before the bubble-phase popover listener. First Escape closes only the alert; the listener is removed when `open` goes false, so the second Escape reaches the modal and closes it.
- Menus and lists (`role=menu|listbox`) keep their own Escape.
- Listener and the 0 ms focus timer are both removed in the effect cleanup (also on unmount via `router.back()` and under StrictMode re-run).

**Focus.** Child effect runs before the modal's own `dialog.focus()`, hence the 0 ms timer: `returnTo` is the modal (overlay mode) or `body` (page mode), and close restores to the modal or falls back to the `tabIndex=-1` frame. Correct for both. Tab ring: the alert's `onKeyDown` stops propagation so the modal's trap does not fight it; focusables are the close button and the standards link.

**New findings: none above suggestion.**
- Suggestion R1: the e2e covers page mode only (`/kudos/{id}`). Add a case in the intercepted modal (open from the board): Escape once -> alert gone and modal still open, Escape twice -> modal closes and focus returns to the opener. This is the interaction the change was written for and it is unproven.
- Suggestion R2: the capture listener closes the alert for any Escape whose target is not inside a `role=menu|listbox`. A shell popover whose trigger (not its menu) holds focus would lose its Escape to the alert. Only reachable while the alert is open on a kudo detail; low.
- Suggestion R3: the alert sits inside the `aria-modal` dialog but the card beneath stays in the accessibility tree; consider `aria-hidden`/`inert` on the sibling `children` of `SpamKudoFrame` while open (carried from S4; Tab is now trapped, screen-reader virtual cursor is not).

**Status:** DONE
**Summary:** W1 confirmed closed; P11 `AdminSelect` unaffected; overlay Escape, cleanup and focus restore are correct. Updated counts: 0 critical, 1 warning open (W2, deferred to delivery-tracker), 8 suggestion (S1-S6, R1-R3 less S4 partly addressed = 8 open).
**Concerns/Blockers:** none blocking; R1 e2e gap for the modal path; nothing executed.
