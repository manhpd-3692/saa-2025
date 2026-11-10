# Phase 09 — Own and other Sunner profiles (F007)

## Context Links
- F007: `spec/own-and-other-sunner-profiles/{functional-spec.md, technical-spec.md}`; screens `SCR-own-profile`, `SCR-other-profile`
- Contract: R01, R15; Addendum N10. Decisions: AD07 (D001–D011, D006 no header badge), X05, X07, C02
- Figma: Profile bản thân / người khác (docs/SCREENFLOW.md, User — Pages)
- Consumes: F006 `KudoCard` + envelope (P7), F008 `SecretBoxService` summary + `SecretBoxModal` (P8)

## Overview
- Priority: P2. Status: pending. Effort: 7h.
- Checklist: outside the 8 categories (profiles).
- `/profile` (own) and `/profile/[userId]` (other): header (avatar, name, unit code, collected icons), five counts,
  "Mở Secret Box" for owner only, received/sent kudo list with filter and load more.

## Key Insights
- Kudo list items are F006 `KudoCard` verbatim (R15); counts failure → `counts: null`, `countsUnavailable: true`; F008 summary failure → `collectedIcons: null` (C02).
- "Hearts received" = sum of `kudo_heart_state.heart_total` over received public kudos (X07) — same as F010 Total Heart.
- Non-admin viewer: owner's anonymous **sent** kudos absent from list and count (SC-005); email never selected (FR-605).
- Own id on `/profile/[userId]` → redirect `/profile`; unknown/malformed → not-found.

## Requirements
- FR-001, FR-002, FR-101–FR-105, FR-201–FR-206, FR-301, FR-302, FR-401–FR-404, FR-601–FR-605, BR-001–BR-005, ALG-001, INT-001, INT-002, US001–US006; SC-001–SC-012.

## Architecture
```
/profile, /profile/[userId] (server, no-store) → GET /api/v1/users/{id}/profile → header + counts (+ isOwner fields)
ProfileKudosList (client) → GET /api/v1/users/{id}/kudos?filter=received|sent&cursor → KudoCard list
Go ProfileService → profile.sql (counts, lists) + KudoReadService DTO assembly + maskSender + SecretBoxService summary
```

## Related Code Files
Create (backend)
- `backend/internal/profile/{profile_handler.go, profile_service.go, profile_kudos_handler.go}`, `backend/cmd/api/wire_profile.go`, `backend/db/queries/profile.sql`
Create (frontend)
- `src/app/(shell)/profile/page.tsx`, `src/app/(shell)/profile/[userId]/page.tsx`
- `src/features/profile/{profile-header.tsx, profile-stats-block.tsx, profile-kudos-list.tsx, profile-api.ts}`
- `src/i18n/dictionaries/{vi,en}/profile.json`
- Tests: `backend/internal/profile/profile_integration_test.go`, `e2e/sunner-profiles.spec.ts`
Read-only reuse: `src/features/kudos-board/kudo-card.tsx`, `src/features/gamification/secret-box-modal.tsx`, `backend/internal/kudo/{kudo_read_service.go, mask_sender.go}`

## Implementation Steps
1. Profile queries (counts, keyset lists by received/sent) using P1 indexes.
2. Service: viewer-aware masking, owner-only box fields, counts/summaries failure isolation.
3. Pages + header + stats + list (load more, loading/empty/error).
4. Owner "Mở Secret Box" opens P8 modal (disabled when 0 unopened).
5. Tests.

## Todo List
- [ ] Queries + service
- [ ] Handlers + wire
- [ ] Pages + components
- [ ] Secret box hook-up
- [ ] Tests

## Success Criteria (test plan)
- Go integration: SC-002, SC-004, SC-005, SC-006, SC-007, SC-009, SC-010, SC-011 (third-user anonymous image inspection), SC-012 (DTO + forced summary failure).
- Playwright: SC-001, SC-003, SC-008; list filter + load more.

## Scope Contract
- Changed: profile Go package, profile pages/components.
- Impacted: none upstream (read-only consumer); notification links to own profile (P10).
- Will verify: Go integration for privacy/counts (API contract → full), Playwright for redirects/UI.
- Deliberately skipped: KudoCard rendering internals (P7), box open logic (P2/P8).

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| Anonymity leak via sent list/count (RISK-01) | M | H | SC-005 + SC-011 |
| Count vs list moment drift (RISK-02) | M | L | Accepted |
| Count cost (RISK-03) | M | M | Indexes; measure in P14 |

## Security Considerations
- Email never selected; box figures only for owner; admin sees anonymous sender per G04.

## Rollback
- Revert commits; additive pages/endpoints.

## Next Steps
- None blocking. Open item: index sufficiency (tech-spec 5.3) measured in P14.
