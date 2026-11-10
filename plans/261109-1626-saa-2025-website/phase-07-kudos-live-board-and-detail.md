# Phase 07 — Kudos live board and kudo detail (F006)

## Context Links
- F006: `spec/kudos-live-board-and-kudo-detail/{functional-spec.md, technical-spec.md}` (§ 4.2 KudoCard DTO); screens `SCR-kudos-live-board`, `SCR-kudo-detail`
- Contract: R01, R15; Decisions: G04, G08, G12, AD06, X02, X05
- Figma: Live board `2940:13431`, View Kudo `520:18779`, Hashtag filter `721:5580`, Phòng ban `721:5684`, Hover Avatar `721:5827`/`2268:35101`, Hashtag group `1002:13094`
- Built on P2: `backend/internal/kudo/{kudo_card_dto.go, mask_sender.go, kudo_read_service.go, kudo_detail_handler.go}`

## Overview
- Priority: P1. Status: pending. Effort: 12h.
- Checklist: **Sun\* Kudos**.
- Board `/kudos`: Highlight carousel (top 5 weighted, filters), Spotlight word cloud + counter + search, All Kudos
  infinite feed (keyset cursor), sidebar (stats, box button slot, latest gift recipients); detail `/kudos/[id]`
  (overlay from board, full page on direct link), Copy Link, avatar hover card.

## Key Insights
- One `KudoCard` DTO + `{items, nextCursor}` from `KudoReadService` (also consumed by P9). `heart.total` from `kudo_heart_state` (X02).
- Highlight = Kudos Quốc Dân: weighted desc, newer wins ties, public only, zero-heart fills (G12, SC-009).
- Independent loading/empty/error/retry per block; refresh on focus/poll, no live push (Codex checklist).
- `HeartSlot`/`HeroBadgeSlot` render placeholders here; P8 fills them. Sidebar secret-box button slot filled by P8.
- Spam/missing/non-uuid → same not-found page (SC-006); spam overlay host for sender added by P12.

## Requirements
- FR-001–FR-003, FR-101–FR-104, FR-201–FR-211, FR-401–FR-405, FR-601–FR-603, BR-001–BR-007, ALG-001, ALG-002, INT-001, US001–US009; SC-001–SC-009.

## Architecture
```
/kudos (server shell, client blocks with Bearer)
  HighlightCarousel ← GET /kudos/highlight?hashtag&unit ; FilterDropdown ← GET /kudos/filter-options
  SpotlightBoard ← GET /kudos/spotlight ; AllKudosFeed ← GET /kudos?cursor ; BoardSidebar ← GET /kudos/sidebar
  SunnerAvatarHover ← GET /users/{id}/hover-card (delay HOVER_CARD_DELAY_MS)
/kudos/[id] → GET /kudos/{id} → KudoCard(detail) ; intercepted overlay from board
Go: KudoReadService → sqlc (ListKudos keyset, HighlightKudos, SpotlightCounts…) → maskSender → DTO
```

## Related Code Files
Create (backend)
- `backend/internal/kudo/{kudo_list_handler.go, kudo_highlight_handler.go, kudo_spotlight_handler.go, kudo_sidebar_handler.go, kudo_filter_options_handler.go, keyset_cursor.go}`
- `backend/internal/user/user_hover_card_handler.go`, `backend/db/queries/user_hover_card.sql`
- `backend/cmd/api/wire_kudo_board.go` (registers list, highlight, spotlight, sidebar, filter options, hover card)
Modify: `backend/internal/kudo/kudo_read_service.go`, `backend/db/queries/kudo_read.sql` (P6 never touches these)
Create (frontend)
- `src/app/(shell)/kudos/page.tsx`, `src/app/(shell)/kudos/[id]/page.tsx`, `src/app/(shell)/kudos/@modal/(.)[id]/page.tsx` + `@modal/default.tsx` (overlay; confirm intercepting-route API in bundled docs)
- `src/features/kudos-board/{kudo-card.tsx, highlight-carousel.tsx, filter-dropdown.tsx, spotlight-board.tsx, all-kudos-feed.tsx, board-sidebar.tsx, sunner-avatar-hover.tsx, hashtag-group.tsx, copy-link-button.tsx, heart-slot.tsx, hero-badge-slot.tsx, kudos-board-api.ts, kudo-card-types.ts}`
- `src/i18n/dictionaries/{vi,en}/kudos-board.json`
- Tests: `backend/internal/kudo/kudo_read_integration_test.go`, `src/features/kudos-board/kudo-card.test.tsx`, `e2e/kudos-board.spec.ts`
Modify: `next.config.ts` (images remotePatterns for local Supabase Storage signed URLs)

## Implementation Steps
1. Keyset cursor (opaque base64 of `created_at,id`); list endpoint; no-dup/no-gap test.
2. Highlight ranking query (filters ranked inside set); filter options; spotlight counts + search; sidebar (via F008 service reads — box parts filled P8; implement stats now).
3. Hover card (public kudo counts, unit code, tier from F008 pure tier via read).
4. Frontend blocks with independent states; KudoCard variants feed/highlight/detail; Copy Link.
5. Detail page + overlay route; not-found unification.
6. Visual pass vs Figma at 1280 px.

## Todo List
- [ ] Cursor + list
- [ ] Highlight + filters
- [ ] Spotlight + sidebar
- [ ] Hover card
- [ ] Board UI blocks + KudoCard
- [ ] Detail + overlay
- [ ] Tests + visual pass

## Success Criteria (test plan)
- Go integration: SC-001, SC-002, SC-003 (insert midway), SC-004, SC-005, SC-007 (third-user anonymous image inspection across highlight/feed/detail), SC-008 (DTO shape validation), SC-009.
- Vitest: KudoCard renders masked sender, no author attributes.
- Playwright: board blocks load/empty/retry; filters; infinite scroll end; detail direct link + overlay; SC-006 not-found; Copy Link.

## Scope Contract
- Changed: kudo read endpoints, hover card, board/detail UI.
- Impacted: P8 slots, P9 profile lists (DTO consumers), P12 overlay host.
- Will verify: Go integration for ranking/paging/masking (privacy = API contract → full), Playwright for board UX.
- Deliberately skipped: heart writes (P2/P8), compose (P6).

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| Anonymity leak on a read path (RISK-01) | M | H | Single `maskSender`; SC-007 inspects every field/URL |
| Aggregate counts slow (RISK-02, 5.3 #1) | M | M | Indexes from P1; measure in P14; materialize only on need |
| Feed hearts stale after toggle (5.3 #2) | M | L | Optimistic update in HeartButton (P8) |

## Security Considerations
- Admin sees real sender with marker only via role from `users.role`. Signed image URLs short-lived, opaque keys.

## Rollback
- Revert commits; additive endpoints and pages.

## Next Steps
- Unblocks P8, P9, P12. Open items: feed freshness policy confirmation (5.3 #2); aggregate index need (5.3 #1).
