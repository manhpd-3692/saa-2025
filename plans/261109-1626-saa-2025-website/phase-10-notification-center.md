# Phase 10 — Notification center (F009)

## Context Links
- F009: `spec/notification-center/{functional-spec.md, technical-spec.md}`; screens `SCR-notification-panel`, `SCR-notification-detail`
- Contract: R02, R19, R23; Addendum N01, N03, N04, N10. Decisions: G10, AD09, X01, X03, X06
- Figma: Thông báo panel/detail (docs/SCREENFLOW.md)
- Built on P2: `backend/internal/notification/notification_service.go`; P3: `src/components/shell/notification-bell-slot.tsx`

## Overview
- Priority: P2. Status: pending. Effort: 9h.
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
- [ ] Read endpoints + re-mask
- [ ] Message builder + tests
- [ ] Bell, panel, detail UI
- [ ] Tests

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
- Open item: `generic` kind carries one text — per-locale `{vi,en}` shape undecided (tech-spec 5.3 #5); notification link targets confirm against P7/P8/P9 routes.
