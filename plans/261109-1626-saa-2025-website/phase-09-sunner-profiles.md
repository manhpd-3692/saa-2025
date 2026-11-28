# Phase 09 — Own and other Sunner profiles (F007)

## Context Links
- F007: `spec/own-and-other-sunner-profiles/{functional-spec.md, technical-spec.md}`; screens `SCR-own-profile`, `SCR-other-profile`
- Contract: R01, R15; Addendum N10. Decisions: AD07 (D001–D011, D006 no header badge), X05, X07, C02
- Figma: Profile bản thân / người khác (docs/SCREENFLOW.md, User — Pages)
- Consumes: F006 `KudoCard` + envelope (P7), F008 `SecretBoxService` summary + `SecretBoxModal` (P8)

## Overview
- Priority: P2. Status: **complete (8073e25, pushed to `feat/saa-screens`)**. Effort: 7h. Delivery below.
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
- [x] Queries + service
- [x] Handlers + wire
- [x] Pages + components
- [x] Secret box hook-up
- [x] Tests

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
- None blocking for P10 or P11. Open items: see Delivery → Open carry-overs.

## Delivery
Commit `8073e25` (pushed to `feat/saa-screens`, origin ref confirmed). Screen tracker rows 51–53 Done (PASS, sha `8073e25`). Review: `reports/reviewer-phase-09.md` (round 1 and recheck): 0 critical, W1 and W2 closed. Status DONE, with the open items below.

**Done**
- Own profile `/profile`: avatar (initials), name, unit code, six icon slots, five counts, "Mở Secret Box" enabled only with ≥1 unopened (D009). Kudo list newest first, 10 per page. The filter stays in the address across reload.
- Teammate profile `/profile/<id>`: read-only. No box button and no box figures. Anonymous senders masked, no email on the page. Own id redirects to `/profile`. Unknown or malformed id shows Not found (404).
- Received/sent dropdown ("Đã nhận (n)" / "Đã gửi (n)"): switches the list, reloads from page 1, keeps the choice in the URL. A failed fetch keeps the cards and offers Retry (US002).
- Switching filter during "Xem thêm" shows only the new list. A late page from the old filter is never added (review W1).
- Counts and list refresh after a kudo is sent or a box is opened (FR-403, FR-404). A kudo turned spam leaves the list, and no gap is left after more than a page of new kudos (review W2).
- Header: "Sun* Kudos" highlighted on `/profile/<id>` only, as in the Figma teammate frame. `/profile` highlights nothing.
- Backend: profile queries with keyset cursor (base64url, strict parse, 400 on bad or other-filter cursor), three batched queries per page, 404 existence probe, no migration. Masking reuses `kudo.ReadService.CardsFromRows`.

**Fix rounds per screen** (tracker rows 51–53)

| Screen | Row | Fix rounds | Defect fixed |
|--------|-----|------------|--------------|
| U8 Profile bản thân | 51 | 0 | No defect on this screen. Re-verified in round 2 after the shared header fix below. Round 2 PASS |
| U9 Profile người khác | 52 | 1 | "Sun* Kudos" not highlighted on the teammate route. Now highlighted (text and bar gold). Round 2 PASS |
| Dropdown đã nhận/gửi | 53 | 0 | — Round 2 PASS (after review W1 rewrite) |

**Checks on final code** (`8073e25`), as reported by the orchestrator
- gofmt clean; `go vet` 0; `go test` 0; `go test -tags integration` 0 (round 1; no Go change after). Typecheck 0; lint 0; vitest 361 (30 files); `next build` 0.
- Playwright full suite 113/113 (1 worker). `e2e/sunner-profiles.spec.ts` 12/12.
- `-race` not run.
- Saved evidence: `evidence/screens/e2e/pw-profiles-run.log` (round 1, 11/11) and `pw-profiles-r2-run.log` (round 2, 12/12). The Go, vitest and full-suite outputs are not saved under `evidence/` (carry-over 13).

**Review** (`reports/reviewer-phase-09.md`)
- Round 1: 0 critical, 2 warnings, 4 suggestions. W1 closed: filter change during an in-flight load is no longer dropped (`createLoadGate`). W2 closed: refresh merge removes cards and leaves no gap (`refreshedList`). S4 closed: owner-anonymous test added. S6 closed: `ProfileUserExists` probe. History and URL sync are covered by the e2e reload assertions.
- Recheck found L1 (refresh during in-flight "Xem thêm" could append a stale page). Fixed in code after the recheck: list `generation` plus `withNextPage` (`profile-kudos-list-state.ts`, unit tests in `profile-kudos-list-state.test.ts`). The reviewer has not re-read this fix.
- Open: S3, S5, and one leftover (carry-overs 1, 4, 5).

**Deviations from plan**

| # | Deviation | Reason | Cost |
|---|-----------|--------|------|
| 1 | No hero badge in the profile header | D006 / N10 removes it on purpose | Header differs from Figma; no function lost |
| 2 | Teammate page has a 3-row counts block (received, sent, hearts), no box rows | US004 and FR-001 require counts on both pages; BR-004 forbids only box figures. Figma omits the block | Extra block not in Figma (spec over design) |
| 3 | Teammate page: dropdown replaces the "Đã nhận: 5 Kudos" label | FR-302 and FR-205 require the same filter and paging on teammate pages | Static sample label replaced |
| 4 | No spam badge on profile cards | D007 / FR-604: spam never appears on profiles | None |
| 5 | "Sun* Kudos" highlighted on `/profile/<id>` (Figma frame); footer highlights too, since it shares the rule | Figma teammate frame shows it; F001 is silent for profile routes | Shared nav rule now covers profile routes; spec gap, see carry-over 2 |
| 6 | Initials instead of avatar photos | Seed has no avatars | Visual only |
| 7 | Icon slots show name only (tooltip); no description | Seed has no icon descriptions; owned by F008 (FR-202) | Hover description missing |
| 8 | sr-only "Bạn chưa có Secret Box nào để mở." kept (visible to screen readers only) | SCR-own-profile §9 | Copy not in Figma (D011 wording pending); live DOM not checked, see carry-over 6 |
| 9 | One-line edits to `locale-config.ts` and `key-visual-backdrop.tsx` | Needed for the profile route and backdrop | Touches two shared files |
| 10 | `kudo.ReadService.CardsFromRows` added | Profile reuses the card assembly and masking, so masking stays on one path | New exported method in the kudo package |

**Open carry-overs**

| # | Item | Owner | Done when |
|---|------|-------|-----------|
| 1 | S3: box-summary failure nulls public counts for non-owners (`profile_service.go`). Matches C02 / SC-012 as written | User / spec owner | Decision logged in `spec/gap-resolution-log.md`; code either kept (decision recorded) or changed to match |
| 2 | Nav rule for `/profile/<id>` (deviation 5) is not in the F001/F007 spec | Main agent (spec owner) | Rule written into the spec and `gap-resolution-log.md` |
| 3 | L1 fix (`generation` + `withNextPage`) has no reviewer recheck | Reviewer | Reviewer records L1 closed on the current code |
| 4 | After a refresh drops a late page, "Xem thêm" is ignored until the old request returns (≤5 s) | Implementer (P9) | Unit test and fix, or accepted in writing |
| 5 | S5: cursor not bound to the owner (harmless) | Implementer (P9) | Owner id bound into cursor, or accepted in writing |
| 6 | Sr-only line verified in code only; needs unopened = 0 to show live | Tester | DOM check recorded in `evidence/` with unopened = 0 (reseed or a zero-box account) |
| 7 | README profile endpoints section missing | Doc-writer | README lists `/api/v1/users/{id}/profile` and `/kudos` |
| 8 | Changelog and roadmap entries for P9 | Doc-writer | Entries added per `documentation-management.md` |
| 9 | E2E write-kudo specs leave "E2E …" kudos in the `live` seed; they show on teammate lists | P14 owner | Specs clean up, or a separate seed is used; teammate lists free of E2E rows |
| 10 | `e2e/sunner-profiles.spec.ts` is 325 lines (rule: under 200) | P14 owner | Helpers moved to `e2e/support`; each file under 200 lines |
| 11 | Index sufficiency (tech-spec 5.3) and count cost (RISK-03) not measured | P14 owner | Measured in the P14 run |
| 12 | `-race` not run | User / CI | `go test -race` exit 0 on a host with gcc or in CI |
| 13 | Go, vitest and full-suite outputs not in `evidence/` | Tester | Outputs saved; counts match this section |
