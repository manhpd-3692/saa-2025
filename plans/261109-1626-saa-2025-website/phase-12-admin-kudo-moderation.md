# Phase 12 — Admin kudo moderation (F011)

## Context Links
- F011: `spec/admin-kudo-moderation/{functional-spec.md, technical-spec.md}`; screens `SCR-admin-review-content`, `SCR-kudo-spam-alert`
- Contract: R05, R13; Addendum N05, N08. Decisions: G04, G10, AD11 (D002–D014), X06, C03
- Figma: Review content, KUDO spam / Alert Overlay (docs/SCREENFLOW.md, Admin)
- Built on P2: `backend/internal/moderation/{moderation_decision_handler.go, moderation_service.go}`; P7 detail page; P11 picker/pager

## Overview
- Priority: P3. Status: **complete (a0d30a9, pushed to `feat/saa-screens`)**. Effort: 8h. Delivery below.
- Checklist: outside the 8 categories (admin; spam overlay).
- `/admin/review` list (sender/receiver/status/date/search filters, paging, real sender of anonymous with marker),
  row actions Spam (with inline confirmation) / Public (no confirmation) using `expectedVersion`, stale-decision
  refresh, and the author-facing spam alert overlay on `/kudos/[id]`.

## Key Insights
- Decisions already proven in P2 (CAS, 409 `stale_decision`, 404 `kudo_not_found`, lock order kudo → receiver, no tier notices).
- UI on 409: refresh row to returned status/version and show stale message (E16).
- Overlay: sender sees it on every open while Spam; admin sees neutral notice; nobody once Public (BR-006, DEC-003).
- Earned hearts/boxes stay on a later-spam kudo (D006, RISK-04 accepted).

## Requirements
- FR-001, FR-101–FR-103, FR-201–FR-206, FR-301–FR-305, FR-401, FR-402, FR-601–FR-603, BR-001–BR-009, ALG-001, ALG-002, INT-001, INT-002, US001–US006; SC-001–SC-013 (SC-003–SC-006, SC-009–SC-013 from P2 re-run; SC-001, SC-002, SC-007, SC-008 new).

## Architecture
```
/admin/review?sender&receiver&status&from&to&q&page (server) → GET /api/v1/admin/kudos → ReviewTable
ReviewFilterBar people options ← GET /api/v1/admin/kudos/people?role&q
KudoActionMenu → POST /admin/kudos/{id}/spam|public {expectedVersion} → 200 changed | 409 stale → refresh row
/kudos/[id] (P7 page) → status spam & viewer is sender → SpamAlertOverlay ; admin → neutral notice
```

## Related Code Files
Create (backend)
- `backend/internal/moderation/{moderation_list_handler.go, moderation_people_handler.go}`, `backend/cmd/api/wire_moderation_review.go`
Modify: `backend/internal/moderation/moderation_service.go` (list, people), `backend/db/queries/moderation.sql`
Create (frontend)
- `src/app/admin/review/page.tsx`
- `src/features/moderation/{review-filter-bar.tsx, review-table.tsx, status-pill.tsx, kudo-action-menu.tsx, spam-alert-overlay.tsx, moderation-api.ts}`
- `src/i18n/dictionaries/{vi,en}/moderation.json`
- Tests: `backend/internal/moderation/moderation_list_integration_test.go`, `src/features/moderation/kudo-action-menu.test.tsx` (409 refresh), `e2e/admin-kudo-moderation.spec.ts`
Modify: `src/app/(shell)/kudos/[id]/page.tsx` and overlay route page (mount `SpamAlertOverlay`)
Read-only reuse: `src/features/admin/{date-range-picker.tsx, admin-pager.tsx}`

## Implementation Steps
1. List query with filters + paging clamp; anonymous rows show real sender + marker (admin only).
2. People options (only people who sent/received).
3. Review page + filter bar + table + action menu (inline confirm on Spam).
4. Stale handling UI; error/empty states.
5. Spam overlay on detail.
6. Tests.

## Todo List
- [x] List + people endpoints
- [x] Review page UI
- [x] Action menu + stale handling
- [x] Spam overlay
- [x] Tests

## Success Criteria (test plan)
- Go integration: SC-001, SC-002, SC-007 (403/401 matrix + browser-role table read refused); re-run SC-003–SC-006, SC-009–SC-013.
- Vitest: action menu refreshes row on 409 and shows stale message.
- Playwright: SC-008 overlay (sender / admin / after Public); mark Spam → kudo gone from board; mark Public → back.

## Scope Contract
- Changed: moderation list/people, review UI, overlay mount on detail page.
- Impacted: board/profile visibility (status), F009 spam notice (unchanged producer).
- Will verify: Go integration (admin authz + data mutation → full F011 suite), Vitest for stale UI, Playwright for overlay.
- Deliberately skipped: decision internals beyond re-run (unchanged since P2).

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| Identity leak via admin list (RISK-02) | L | H | ADMIN route class; SC-007 |
| Stale overwrite (RISK-05) | L | M | CAS proven P2 |
| VN copy missing (RISK-03, D014) | H | L | EN from design notes; VN to be supplied |

## Security Considerations
- Real sender of anonymous kudos only in ADMIN responses; role from `users.role` (R05).

## Rollback
- Revert commits; decisions endpoint (P2) stays; overlay removal leaves detail page as P7.

## Next Steps
- Open items (copy to confirm): VN text for overlay, menu items, messages (D014); "The author will be notified. Mark as Spam?", "This kudo was just changed by another admin.", "No kudo matches your filters.".

## Delivery
Commit `a0d30a9` (`feat(moderation): admin kudo moderation and spam alert`, pushed to `feat/saa-screens`). Screen tracker rows 62–71 Done (PASS, sha `a0d30a9`). Review: `reports/reviewer-phase-12.md` (first pass, then recheck after fix round 1): 0 critical. W1 closed, W2 closed by this sync, R1 and R3 closed. Open: S1–S6 and R2 (suggestions, carry-over 6). Status DONE, with the open items below.

**Done**
- `/admin/review`: newest first, 20 a page, page clamp, real sender of anonymous kudos with the "Ẩn danh" marker (admin only).
- Filters live in the URL: sender and receiver (people who sent or received, no email in the response), status, date range (report time zone; reversed range ignored), search on title and body (plain text, phrase marked). Filters combine and reset to page 1.
- Row actions: Spam (confirm, author warned once) and Public (no confirm), sending `expectedVersion`. 409 refreshes the row to the returned status and version with a stale notice; 404 reloads; 401 goes to Login; 403 shows Forbidden. A failed save keeps the row.
- Author spam overlay on `/kudos/[id]` (page and modal): `alertdialog` on every open while Spam, closes with × or Escape, focus moves in and back to the opener. Admin sees the neutral Spam badge; teammates get not-found; Public removes both.
- FR-602: the author cannot edit a Spam kudo. `GET …/edit` returns 409 `kudo_spam_locked`. Closes P6 carry-over 3.
- Spam overlay host for the sender is live. Closes P7 carry-over 16.
- Authz: all four moderation routes sit behind the admin route class, and each handler re-checks the caller. The decision handler moved to the same helper; its message and status are unchanged.

**Fix rounds per screen** (tracker rows 62–71)

| Screen | Row | Fix rounds | Defect fixed |
|--------|-----|------------|--------------|
| A2 Admin - Review content | 62 | 0 | None. PASS (accepted deviations); round 2 sanity PASS |
| A3 Review content - Search | 63 | 0 | None |
| Action - Spam | 64 | 0 | None. Round 2 sanity PASS |
| Action - Public | 65 | 0 | None |
| C_Filter | 66 | 0 | None |
| Dropdown người đã gửi | 67 | 1 | Avatar: photo when stored, initials as fallback (shared people select). Round 2 PASS |
| Dropdown người nhận | 68 | 1 | Same avatar fix. Round 2 PASS |
| Dropdown trạng thái | 69 | 1 | Panel: boxed options (`AdminSelect` `boxed`, status select only). Round 2 PASS |
| KUDO spam | 70 | 0 | None. Round 2 sanity PASS |
| Alert Overlay (KUDO spam) | 71 | 1 | Escape closes the alert, `alertdialog` with labelled heading, focus moved in and returned. Round 2 PASS |

**Checks on final code** (`a0d30a9`), as reported by the orchestrator (outputs not saved under `evidence/`)
- gofmt clean; `go vet` 0; `go test` 0; `go test -tags integration` 0 (round 1; no Go change after).
- Typecheck 0; lint 0; vitest 431; `next build` 0.
- Playwright full suite 149/149 (1 worker) on final code. Moderation spec 10/10 on final code (the spec has 10 tests).
- Saved logs do not show the final counts: `evidence/screens/e2e/pw-admin-kudo-moderation-r2.log` is 9 passed (predates the Escape test added in the recheck); `pw-admin-kudo-moderation-run1.log` is 8 passed. See carry-over 7.

**Review** (`reports/reviewer-phase-12.md`)
- First pass: DONE_WITH_CONCERNS. 0 critical, 2 warnings, 6 suggestions. W1: `q` with a NUL byte or invalid UTF-8 returned 500 → `cutQuery` strips NUL and applies `ToValidUTF8`; unit test and API integration test added. W2: plan checkboxes → ticked in this sync.
- Recheck: W1 closed. R1 added as e2e test 6 (modal Escape). R3 added as inert card. No new defects above suggestion.

**Deviations from plan**

| # | Deviation | Reason | Cost |
|---|-----------|--------|------|
| 1 | Time column added to the review table | FR-101 newest-first needs a visible time | None (accepted, verify-admin-review-content) |
| 2 | Heart shown as a plain number, no sort | Sort not in spec | Heart sort to confirm (carry-over 1) |
| 3 | No Export | D008 | Export to confirm (carry-over 1) |
| 4 | One action button per row (Đánh dấu Spam / Bỏ Spam); confirm only for Spam | DEC-001; D003 | Figma shows two boxed states |
| 5 | Excerpt 240 characters | Figma frame shows about 240; spec E11 says about 120 | Spec E11 out of date (carry-over 9) |
| 6 | Overlay has close × and the hidden line (FR-401, FR-402); `alertdialog` with focus management and inert card | Screen spec §4 and §9 | None |
| 7 | Pager right-aligned | Reuses the P11 shared pager | None |
| 8 | ID, Hashtag, Public, Spam kept English in vi | Reason not recorded in the reports | Copy sign-off (carry-over 2) |
| 9 | Extra API fields: pageSize, filters, excerpt, heartTotal, unit codes; people `unitCode`; 400 on missing role | Additive; existing fields unchanged | None |
| 10 | `kudo.SenderShownTo` and `VisibleText` exported; `admin.ParseOptionalDateRange` added | One anonymity rule shared by feed and admin list | Shared kudo code touched (reviewer checked) |
| 11 | P11 shared components extended: date picker clear, pager summary, locale namespaces, `AdminSelect` boxed | Needed by P12 filters; additive | P11 unaffected (reviewer checked) |
| 12 | Seed: three moderation examples among demo users 19–24 | Demo data for moderation e2e | Cleanup already in `demo_activity.sql` |
| 13 | Moderation integration data dated March 2004 | Test-only fixture | None |

**Open carry-overs**

| # | Item | Owner | Done when |
|---|------|-------|-----------|
| 1 | Heart sort and Export (D008) | User | Decision logged; column and export added, or accepted in writing |
| 2 | Vietnamese copy sign-off (D014): overlay, menu items, messages, and the English terms in deviation 8 | User (copy owner) | Wording approved or updated in `src/i18n/dictionaries/vi/moderation.json` |
| 3 | Live photo avatars not seeded; initials accepted, e2e proves the photo path | P14 owner | Photos seeded, or initials accepted in writing; e2e photo case kept |
| 4 | Board re-appearance after Public checked via the feed API, not the UI (FR-304) | P14 owner | UI check on the board in the P14 run; evidence under `evidence/` |
| 5 | R2: Escape on a header popover trigger closes the alert first (low) | P14 owner | Fixed, or accepted in writing |
| 6 | Reviewer suggestions open: S1 count and list not one snapshot; S2 duplicated search expression (add integration case); S3 SQL and excerpt highlight may differ (cosmetic); S4 card stays focusable (partly closed by R3); S5 seed notice missing for Public kudo `d2000004`; S6 kudos layout comment over 120 characters | Implementer (P12) | Each fixed or accepted in writing |
| 7 | Go, vitest 431, full suite 149/149 and moderation 10/10 outputs not saved under `evidence/`; saved logs show 9 and 8 | Tester | Outputs saved on `a0d30a9`; counts match this section |
| 8 | `saa_api` SASL auth errors in `logs/api.log` on 2026-11-28 22:52 (`load profile role`, SQLSTATE 28P01), likely from a DB reset before the dev-db-role re-run | P14 owner | dev-db-role re-run; a fresh log has no SASL errors |
| 9 | Spec E11 excerpt length "about 120" conflicts with the Figma frame (240) | Spec owner (user) | Spec E11 updated to match the frame, or the deviation accepted in writing |

Environment note: `next dev` may serve stale server code after edits when no browser page is open. Restart the dev server before any re-verify.
