# Phase 12 — Admin kudo moderation (F011)

## Context Links
- F011: `spec/admin-kudo-moderation/{functional-spec.md, technical-spec.md}`; screens `SCR-admin-review-content`, `SCR-kudo-spam-alert`
- Contract: R05, R13; Addendum N05, N08. Decisions: G04, G10, AD11 (D002–D014), X06, C03
- Figma: Review content, KUDO spam / Alert Overlay (docs/SCREENFLOW.md, Admin)
- Built on P2: `backend/internal/moderation/{moderation_decision_handler.go, moderation_service.go}`; P7 detail page; P11 picker/pager

## Overview
- Priority: P3. Status: pending. Effort: 8h.
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
- [ ] List + people endpoints
- [ ] Review page UI
- [ ] Action menu + stale handling
- [ ] Spam overlay
- [ ] Tests

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
