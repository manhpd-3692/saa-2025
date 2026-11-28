# Phase 10 — Notification center (F009)

## Context Links
- F009: `spec/notification-center/{functional-spec.md, technical-spec.md}`; screens `SCR-notification-panel`, `SCR-notification-detail`
- Contract: R02, R19, R23; Addendum N01, N03, N04, N10. Decisions: G10, AD09, X01, X03, X06
- Figma: Thông báo panel/detail (docs/SCREENFLOW.md)
- Built on P2: `backend/internal/notification/notification_service.go`; P3: `src/components/shell/notification-bell-slot.tsx`

## Overview
- Priority: P2. Status: **complete (6ea9069, pushed to `feat/saa-screens`)**. Effort: 9h. Delivery below.
- Checklist: outside the 8 categories (notifications).
- Read APIs (list, unread count, mark read, read all) with current-anonymity re-mask, bell with unread dot, panel
  with paging, detail window, localized message builder for the seven kinds.

## Key Insights
- Exactly seven kinds; `review_requested` / `spam_warning` rejected (G10, X03, SC-011).
- Reads re-mask by the kudo's **current** `is_anonymous` for non-admins (R02, BR-007).
- Detail opens even when mark-read fails; unread dot stays; failure announced (R19).
- `kudo_spam_warning` notice: inline "Tiêu chuẩn cộng đồng" link + action button to the kudo detail (X06).
- `hero_level_up` params `{levelKey, fromLevelKey, sendersCount}` (N04); notice navigates to own profile (N10).
- `buildNotificationMessage` is one switch shared by row and detail (DRY).

## Requirements
- FR-001–FR-004, FR-101–FR-103, FR-201–FR-206, FR-401–FR-405, FR-601–FR-603, BR-001–BR-007, ALG-001, INT-001, US001–US006; SC-001–SC-014 (A1 SCs from P2 re-run; SC-005–SC-009, SC-012–SC-013 new).

## Architecture
```
Header bell (useUnreadCount: focus + UNREAD_REFRESH_INTERVAL_MS) ← GET /me/notifications/unread-count
NotificationPanel ← GET /me/notifications?cursor (NOTIFICATIONS_PAGE_SIZE) ; "read all" → POST …/read-all
NotificationItemRow → open → POST …/{id}/read (failure tolerated) → NotificationDetailDialog → action link
Go list: join kudos on kudo_id → strip sender params if currently anonymous and viewer not admin
```

## Related Code Files
Create (backend)
- `backend/internal/notification/{notification_list_handler.go, notification_read_handler.go, notification_remask.go}`, `backend/cmd/api/wire_notification.go`
Modify: `backend/db/queries/notifications.sql` (list, count, mark read, read all)
Create (frontend)
- `src/features/notifications/{notification-panel.tsx, notification-item-row.tsx, notification-detail-dialog.tsx, build-notification-message.ts, use-unread-count.ts, notifications-api.ts}`
- `src/i18n/dictionaries/{vi,en}/notifications.json`
- Tests: `src/features/notifications/build-notification-message.test.ts` (seven kinds, VN + EN, N04 contract), `backend/internal/notification/notification_read_integration_test.go`, `e2e/notification-center.spec.ts`
Modify: `src/components/shell/notification-bell-slot.tsx` (mount bell + panel)

## Implementation Steps
1. List (keyset, newest first), unread count, mark read (own only, 404 otherwise; first `read_at` kept), read all.
2. Re-mask on read by current anonymity.
3. Message builder for seven kinds (link targets: kudo detail `/kudos/[id]`, own profile `/profile`, secret box modal, community standards).
4. Bell + panel + detail UI from Figma; failure states.
5. Tests.

## Todo List
- [x] Read endpoints + re-mask
- [x] Message builder + tests
- [x] Bell, panel, detail UI
- [x] Tests

## Success Criteria (test plan)
- Go integration: SC-005, SC-006, SC-007, SC-008, SC-012 (with P6 edit), SC-013 (once-ever after read + moderation, N03); re-run SC-001–SC-004, SC-010, SC-011, SC-014.
- Vitest: builder covers seven kinds both locales; `hero_level_up` renders levelKey/fromLevelKey/sendersCount (SC-014 render part).
- Playwright: bell count, panel paging, mark read, read all, SC-009 forced read failure (route intercept).

## Scope Contract
- Changed: notification read APIs, notification UI, bell slot.
- Impacted: header for all shell pages.
- Will verify: Go integration for privacy/ownership (API contract → full), Vitest for message mapping, Playwright for panel UX.
- Deliberately skipped: producers (P2/P6/P12 own their calls).

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| Producer forgets Create (RISK-01) | M | M | SC-001 per producer kind in integration suite |
| Anonymous leak in params (RISK-02) | L | H | Store-time strip + read-time re-mask; SC-008/SC-012 |
| Polling load | L | L | Focus + interval only; partial index on unread |

## Security Considerations
- Own rows only (404 for others); no HTTP route creates/deletes notifications.

## Rollback
- Revert commits; bell slot reverts to empty slot; stored notifications unaffected.

## Next Steps
- Open carry-overs: see Delivery → Open carry-overs. Link targets confirmed: kudo detail, own profile and community standards all return 200 in verify.

## Delivery
Commit `6ea9069` (pushed to `feat/saa-screens`). Screen tracker rows 54–55 Done (PASS, sha `6ea9069`). Review: `reports/reviewer-phase-10.md` (round 1 and recheck): 0 critical. W1 and W3 closed; W2 accepted per FR-402 / A7, with a spec note still owed. Status DONE, with the open items below.

**Done**
- Read APIs: list (keyset, newest first), unread count, mark one read (own rows only, 404 otherwise; first `read_at` kept), read all (every unread row, FR-402).
- Re-mask on read by the kudo's current anonymity. Admins see the sender (spec exception). Verified: a probe name is absent from page text and the API response for a non-admin.
- Seven kinds render in vi and en; no `review_requested` row (G10). One message builder serves the row and the detail (DRY).
- Bell: unread dot and sr count; refresh on focus and visibility (5 s throttle), 60 s interval while visible; state keyed by user id, so an account switch resets it.
- Dropdown panel (528 px), full history (680 px), detail dialog (560 px). Mark-read failure still opens the detail, keeps the dot and announces the failure (R19).
- Spam notice: inline "Tiêu chuẩn cộng đồng" link to `/community-standards` plus an action to the kudo detail (X06). Closes phase-05 Open Item 8.
- Secret Box notice opens the box for non-admins (DEC-002, US003). Admins now get the same host in the admin layout; the round-1 close-only behaviour is gone.
- Seed: sunner01 has all six icons with `icons_completed_at`; one spam kudo by An; 24 notices covering all seven kinds; unused hashtags cleaned up.

**Fix rounds per screen** (tracker rows 54–55)

| Screen | Row | Fix rounds | Defect fixed |
|--------|-----|------------|--------------|
| Tất cả thông báo (panel) | 54 | 1 | Seed: sunner01 had an "all 6 badges" notice with 3 icons (R11). Seed fixed; round 2 PASS |
| View thông báo (chi tiết) | 55 | 0 | None on this screen. Round 1 admin Secret Box gap closed by the shared admin-layout change; round 2 PASS |

**Checks on final code** (`6ea9069`), as reported by the orchestrator (outputs not saved under `evidence/`)
- gofmt clean; `go vet` 0; `go test` 0; `go test -tags integration` 0; typecheck 0; lint 0; vitest 397; `next build` 0.
- Playwright full suite 126/126 (1 worker). The previous run was 125/126: write-kudo failed because leftover Go-test hashtags pushed `#teamwork` off the alphabetical list. Fixed by reseed cleanup of unused hashtags and by reusing the seeded tag. See carry-over 6: the Go suite still leaves hashtags behind.
- `e2e/notification-center.spec.ts` 13/13 (exit 0 twice after reseed, verify round 2).
- Verify: panel 59/59 and detail 59/59 checks pass in round 2. Both ran as a standalone Chromium script because the Playwright MCP browser was locked; the screens were not re-driven through MCP.
- `-race` not run.

**Review** (`reports/reviewer-phase-10.md`)
- Round 1: 0 critical, 3 warnings, 8 suggestions. W1 closed (bell keyed by `user.id`; `SessionUser` gained `id`). W3 closed (focus and visibility refresh throttled at 5 s, pure policy with boundary tests). W2 accepted as spec behaviour (carry-over 4).
- Recheck: no new warnings. One new suggestion (hashtag cleanup scope). Nine suggestions open (carry-over 7).

**Deviations from plan**

| # | Deviation | Reason | Cost |
|---|-----------|--------|------|
| 1 | "Xem tất cả" switches to the full-history layout over the page; no separate page | D001 | No route for full history; the layout is state on the page |
| 2 | Figma frame names swapped in the file set: bell opens 589:9152 (dropdown), "Xem tất cả" opens 589:9132 (full history) | Each layout matched to its frame by content | Mapping only |
| 3 | Detail window has no Figma frame; spec default layout | D002 | No design diff; design owner to confirm the look (carry-over 1) |
| 4 | 50% dim behind the full history (`bg-page/50`) | Backdrop blocks page clicks, as the detail overlay does | Figma shows none (carry-over 1) |
| 5 | Bell gold only in the full-history view; white in the dropdown | Both frames agree | None |
| 6 | Relative times without weeks ("11 ngày trước") | ALG-001 defines minutes, hours, days, months, years | Figma's "1 tuần trước" not reproduced |
| 7 | Review-request row not built | G10 removed the kind; no producer | None |
| 8 | "Đã thu thập đủ 6 huy hiệu" without a gift name | Spec has no prize data; Figma `<X>` is unfilled | Copy less specific than Figma |
| 9 | English copy is a draft | D012 pending | Carry-over 2 |
| 10 | "Xem tất cả" hidden at 20 or fewer notices | Nothing older to load; spec "offers" could read as always-on | Low; team may prefer always shown |
| 11 | List items carry `kudoAvailable` | Drives the E08 unavailable branch and the kudo link | Extra field in the list DTO |
| 12 | Notification cursor duplicates the kudo keyset cursor | Import cycle | Two copies can drift (review S2) |
| 13 | Admin layout mounts the Secret Box host and bell providers | Admins earn boxes (F008) | Shared file `src/app/admin/layout.tsx` touched; admin gate unchanged (recheck) |
| 14 | Seed rewritten: full six icons for sunner01, spam kudo by An, 24 notices across seven kinds, unused hashtag cleanup | Verify fix 1 (R11); coverage for the e2e spec | Demo data changed; later phases read it |
| 15 | Shared files touched: `globals.css` (tokens), `locale-config.ts`, `cmd/seed/main.go`, `seed_files.go`, `session-summary.ts` (`SessionUser.id`), `admin/layout.tsx` | Needed by bell, seed and admin | Later phases must re-check the shell |
| 16 | Header 8 px shorter than Figma | Set in an earlier phase, inherited here | Visual only |

**Open carry-overs**

| # | Item | Owner | Done when |
|---|------|-------|-----------|
| 1 | Designer: 50% dim behind the full history (deviation 4) and bell colour (deviation 5); look of the detail window (deviation 3) | Designer | Design confirms or updates the frames; decision logged in a verify report or the spec |
| 2 | D012: English copy is a draft | User | EN wording confirmed and `en/notifications.json` updated, or accepted in writing |
| 3 | `generic` kind carries one text; per-locale `{vi,en}` shape undecided (tech-spec 5.3 #5) | User | Shape decided and logged; generic notice renders in both locales |
| 4 | W2: read-all marks every unread row, including rows never shown; merged notices move in the keyset (review S3) | Spec owner (main agent) | Edge-case note written in `spec/notification-center/` and `spec/gap-resolution-log.md` |
| 5 | Not hand-verified: FR-601 cross-user 404 (test 4 covers the bell per account, not a 404); US001 unread-count failure keeps the last dot; E08 unavailable-kudo copy and disabled action (no unavailable kudo in seed); loading skeleton | Tester (P14) | Driven in the P14 run; results saved under `evidence/` |
| 6 | Go integration suite leaves random hashtags; the full suite passed only after the reseed cleanup (write-kudo 125/126 before) | P14 owner | Integration tests clean up their hashtags; full suite passes 126/126 on a run without a manual reseed |
| 7 | Review suggestions open: S1 re-mask is a three-key denylist (use allowlist or a contract test); S2 duplicated cursor code; S5 signed-out dictionary load; S6 dropdown does not close on Tab-out; S7 chunk-load error has no announcement; S8 `notification_read_integration_test.go` is 245 lines (rule under 200) and `key={line}` can collide; new: hashtag cleanup deletes all unused hashtags (local seed only) | Implementer (P10) | Each fixed or accepted in writing. S1 first, before P11/P12 add kudo-linked producers |
| 8 | Go, vitest and full-suite outputs not saved under `evidence/` | Tester | Outputs saved; counts match this section |
| 9 | `-race` not run | User / CI | `go test -race` exit 0 on a host with gcc or in CI |
| 10 | Changelog and roadmap entries for P10 (and P9, carry-over 8 of phase 09) | Doc-writer | Entries added per `documentation-management.md` |
