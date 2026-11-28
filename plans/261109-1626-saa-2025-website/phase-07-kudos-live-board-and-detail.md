# Phase 07 — Kudos live board and kudo detail (F006)

## Context Links
- F006: `spec/kudos-live-board-and-kudo-detail/{functional-spec.md, technical-spec.md}` (§ 4.2 KudoCard DTO); screens `SCR-kudos-live-board`, `SCR-kudo-detail`
- Contract: R01, R15; Decisions: G04, G08, G12, AD06, X02, X05
- Figma: Live board `2940:13431`, View Kudo `520:18779`, Hashtag filter `721:5580`, Phòng ban `721:5684`, Hover Avatar `721:5827`/`2268:35101`, Hashtag group `1002:13094`
- Built on P2: `backend/internal/kudo/{kudo_card_dto.go, mask_sender.go, kudo_read_service.go, kudo_detail_handler.go}`

## Overview
- Priority: P1. Status: **complete (2f44032, pushed to `feat/saa-screens`)**. Effort: 12h. Delivery below.
- Checklist: **Sun\* Kudos**.
- Board `/kudos`: Highlight carousel (top 5 weighted, filters), Spotlight word cloud + counter + search, All Kudos
  infinite feed (keyset cursor), sidebar (stats, box button slot, latest gift recipients); detail `/kudos/[id]`
  (overlay from board, full page on direct link), Copy Link, avatar hover card.

## Key Insights
- (From P5) Homepage and Awards link to `/kudos` (constant `KUDOS_BOARD_PATH`) and return 404 until this phase lands; re-verify both links when the board route exists. Closed: round 2 of `verify-kudos-live-board.md` (e2e test 16) shows both CTAs land on the board.
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
- [x] Cursor + list
- [x] Highlight + filters
- [x] Spotlight + sidebar
- [x] Hover card
- [x] Board UI blocks + KudoCard
- [x] Detail + overlay
- [x] Tests + visual pass

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
| Feed heart join loses its `OFFSET 0` fence in a refactor (review S-E) | M | M | Fence and reason in the SQL comment (`kudo_read.sql`); re-run EXPLAIN at 20k kudos if the feed query changes. Measured: 40.9 ms without it, 0.17 ms with it |
| Highlight ranks over all public kudos and hearts (RISK-02) | M | M | Accepted at 20k kudos / 100k hearts (37.7 ms). P14 measures at target scale; add a short server cache only if over budget |

## Security Considerations
- Admin sees real sender with marker only via role from `users.role`. Signed image URLs short-lived, opaque keys.

## Rollback
- Revert commits; additive endpoints and pages.

## Next Steps
- Unblocks P8, P9, P12. Open items: see Delivery → Open carry-overs.

## Delivery
Commit `2f44032` (pushed to `origin/feat/saa-screens`). Screen tracker rows 22–29 Done (PASS, sha `2f44032`). Review closed by `reports/reviewer-phase-07.md` (round 1 plus recheck; DONE; 0 critical, 0 open warning).

**Done**
- Board `/kudos`: Highlight carousel (top 5 by weighted heart total, public only, zero-heart fills, hashtag and unit filters), Spotlight word cloud with counter and search, All Kudos infinite feed on keyset cursor `(created_at, id)`, sidebar with stats and latest gift recipients. Each block has independent states. Feed Retry is verified; first-paint errors for the other three blocks are not (carry-over 1).
- Hover card (`GET /users/{id}/hover-card`): name, unit and counts. Anonymous senders get no card. "Gửi KUDO" prefills the recipient.
- Filter dropdowns: hashtag and phòng ban (department filter uses the receiver's unit, D004).
- Detail `/kudos/[id]`: overlay from the board, full page on direct link, Copy Link. Spam, missing and non-uuid ids return the same not-found page (SC-006), on minimal chrome (C01).
- Edit pencil on the sender's own public kudo calls `runAction("compose", { kudoId })` (`kudo-card.tsx:80`; e2e test 15 checks it shows for the sender only). Board shows a newly sent kudo per the sync request; no e2e case creates a kudo and then checks the board.
- Seed: 16 Sunners, 30 kudos, 16 Storage image rows. Refuses non-local hosts.

**Fix rounds per screen** (round 2 verdict PASS on every screen that had one)

| Screen | Row | Fix rounds | Defect fixed |
|--------|-----|------------|--------------|
| U5 Sun* Kudos - Live board | 22 | 0 | — |
| U7 View Kudo | 23 | 1 | D1 kudo 404 rendered full shell chrome; now minimal chrome (C01) |
| Dropdown Hashtag filter | 24 | 0 | — |
| Dropdown Phòng ban | 25 | 0 | — |
| Hover Avatar info user | 26 | 0 * | — |
| Infor - HoverAvatar | 27 | 0 * | — |
| Hashtag group | 28 | 1 | H1 selected chip colour; now exact `#FFFFFF` fill and `#998C5F` outline |
| KUDO card | 29 | 1 | D1 broken image showed the placeholder with no retry; now one re-read per card |

\* Rows 26–27 have round-2 re-verify sections after P7 fix round 1 closed the shared "Gửi KUDO" prefill deviation. The tracker counts 0; see Open questions.

**Checks on final code** (`2f44032`)
- gofmt clean; `go vet` 0; `go test` 0; `go test -tags integration` 0 (12 packages).
- Typecheck 0; lint 0; vitest 317; `next build` 0.
- Playwright full suite 90/90 (1 worker). P7 specs 17/17 on re-verify.
- `-race` not run.

**Review** (`reports/reviewer-phase-07.md`)
- Round 1: 0 critical, 4 warnings (W1–W4), 7 suggestions.
  - W1 closed: id validated as a full UUID before any Go URL is built (dot-segment traversal).
  - W2 closed for the feed: heart total via `LATERAL` with an `OFFSET 0` fence, 40.9 ms to 0.17 ms at 20k kudos and 100k hearts. Highlight keeps the full aggregate (37.7 ms at that size), accepted under RISK-02.
  - W3 closed: hover-card cache keyed by viewer object, so admin or self counts cannot reach the next viewer.
  - W4 closed: migration `20261128070000_kudo_board_read_indexes.sql`. `kudos_public_receiver_idx` shows no gain (S-A).
- Recheck: 0 critical, 0 warning, 5 new suggestions (S-A to S-E). Round-1 S1, S3, S4, S7 still open.

**Deviations from plan**

| # | Deviation | Reason | Cost |
|---|-----------|--------|------|
| 1 | Next dev prefixes `(.)` to `[id]` on the intercepted route. `parseKudoIdParam` strips it, then requires a full UUID | Next interception marker | One extra parse step; covered by `kudos-board-api.test.ts` |
| 2 | Anonymous card shows "Ẩn danh" / "Người gửi ẩn danh" with no nickname (D009) | Anonymity (R01) | No nickname on anonymous cards |
| 3 | Extra DTO fields: unit codes, unit name, gift icon, spotlight recent | Figma card and sidebar need them | Wider DTO; P8 and P9 read the same DTO |
| 4 | Pencil sits in the title row per Figma, not next to Đóng (D008) | Figma is the visual placement authority | Spec D008 is now out of date; see carry-overs |
| 5 | Kudo 404 uses minimal chrome (C01): `display: contents` wrappers and a `data-minimal-page` marker in `(shell)/layout.tsx` | Decision C01 | Double header where `:has()` is unsupported (Chrome < 105, Safari < 15.4, Firefox < 121); S-B |
| 6 | Recipient prefill passes the whole `receiver` object | Simplest path from the hover card | Client state only; the server still validates `receiverId` |
| 7 | Hover card returns `isSelf` (server check `viewer.UserID == id`) | Self check from the JWT viewer, not the client | One extra field |
| 8 | Unit test is `kudo-card.test.ts` | Plan named `.test.tsx` | None |
| 9 | Seed now 16 Sunners and 30 kudos plus 16 Storage images. Needs `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`; refuses non-local hosts | Image evidence needed on the board | Seed fails at start without the service key, even for a DB-only reseed (S-D) |
| 10 | Files outside the list: `locale-config.ts`, `e2e/README.md`, `backend/README.md`, `kudos/layout.tsx`, `@modal/page.tsx`, `kudos/not-found.tsx`, `kudos-key-visual.webp` | Needed for the overlay route, not-found page and key visual | Larger change surface than planned |

**Open carry-overs**

| # | Item | Owner | Done when |
|---|------|-------|-----------|
| 1 | FR-403 first-paint errors for Highlight, Spotlight and sidebar are unverified. Server-side reads, so browser route aborts do not reach them | P14 owner | A Go-side fault (dev-only or test seam) shows error and Retry in the browser; row 22 FR-403 PASS |
| 2 | Highlight keeps the full heart aggregate (RISK-02): 37.7 ms at 20k kudos and 100k hearts | P14 owner | Measured at target scale; server cache added only if over budget |
| 3 | Selected hashtag chip is 56 px, Figma closed control 48 px | Designer | Designer accepts 56 px in `clarifications.md`, or chip set to 48 px |
| 4 | Figma typo "High-perorming" | Designer | Figma corrected, or decision logged in `clarifications.md` |
| 5 | Spec D008: pencil placement is title row, not beside Đóng | Main agent (spec owner) | `spec/kudos-live-board-and-kudo-detail` updated to the title-row placement |
| 6 | S-A: `kudos_public_receiver_idx` gives no measured gain; gift-list index chosen only with `seqscan off` | P14 owner | Index dropped, or kept on a measured win; gift query re-checked without `seqscan off` at scale |
| 7 | S-B: kudo 404 loses the banner and contentinfo landmarks (`MinimalChrome` renders inside the shell `<main>`) | P14 owner | Shell `<main>` skipped when the page is minimal, or the gap accepted in writing |
| 8 | S-C: seed HTTP client follows redirects and forwards `apikey` cross-host | P14 owner | `CheckRedirect` set to `http.ErrUseLastResponse` on the service-key client |
| 9 | S-D: seed needs `SUPABASE_SERVICE_KEY` even for a DB-only reseed | P14 owner | Key check moved to the image step, or behaviour documented as accepted |
| 10 | S-E: the `OFFSET 0` fence is a planner trick; a refactor silently costs ~40 ms at 20k kudos | P14 owner | Risk row kept (above); EXPLAIN re-run in the P14 run |
| 11 | S1: feed can stall after a silent focus refresh (`busy` flag shared with paging) | P14 owner | Separate busy flags for refresh and paging, with a test for a silent refresh |
| 12 | S3: `next.config.ts` `new URL(NEXT_PUBLIC_SUPABASE_URL)` throws on a malformed value | P14 owner | Guarded with a clear error, or dropped if unused |
| 13 | S4: Figma-derived seed display names could be real staff | P14 owner | Names confirmed as invented, or swapped |
| 14 | S7: roadmap and changelog not updated for P7 | P14 owner | `docs/development-roadmap.md` and `docs/project-changelog.md` updated for P7 |
| 15 | Heart button, hero badge and secret-box slots are placeholders | P8 owner | Closed in P8 (`a9f3c68`): `HeartSlot`, `HeroBadgeSlot` and the sidebar box slot are filled. Rows 22 and 29 re-check is open in P8 carry-over 16 |
| 16 | Spam overlay host for the sender is not built | P12 owner | **Closed in P12 (a0d30a9):** overlay host on the sender's spam kudo, page and modal; P12 e2e test 6 and test 8 cover it |
| 17 | Signed image URLs expire after 1 h. Card-level single re-read is in place, but a page open for over an hour still shows expired links after the retry | P14 owner | Long-open page check passes, or page-level re-sign added |

**Open questions**
- Rows 26 and 27 (fix rounds): the reports show a fix round on the shared "Gửi KUDO" prefill, but the tracker and this section count 0. Count as 1, or keep 0 with the note?
- Live board row 22 round 2 was a DB reset and reseed, not a code fix. Kept at 0.
