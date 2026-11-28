# Phase 08 — Hearts, hero badges, secret box (F008)

## Context Links
- F008: `spec/hearts-hero-badges-and-secret-box/{functional-spec.md, technical-spec.md}`; screens `SCR-hero-badge-and-campaign-hover`, `SCR-rules-panel`, `SCR-secret-box-modal`
- Contract: R09–R12; Addendum N10, N12. Decisions: G06–G09, G12, G14, AD08, X02, X04, X07, C02, C04
- Figma: Hover campaign `3241:15021`; heart control on cards / View Kudo; Thể lệ panel, Secret Box, hero badge hovers (SCREENFLOW)
- Built on P2: `backend/internal/gamification/*` (heart, campaign lookup, box grant, open); P7 slots

## Overview
- Priority: P2 (Like Kudos part treated as P1 per Codex). Status: **complete (a9f3c68, pushed to `feat/saa-screens`)**. Effort: 10h. Delivery below.
- Checklist: **Like Kudos** (heart + x2 campaign badge); outside categories: hero badges, rules panel, Secret Box.
- Add the remaining reads (active campaign, secret-box summary, latest recipients, tier read) and all F008 UI:
  HeartButton (optimistic), HeroBadge + hover, CampaignBadge + hover, RulesPanel (FAB), SecretBoxModal (idempotent retry).

## Key Insights
- Heart is an idempotent setter: PUT/DELETE; sender 403, spam 409; recipient allowed (G06, G07).
- Failed `GET /campaigns/active` only hides the badge; failed lookup inside heart tx → 500, control reverts (R09).
- Modal holds one `Idempotency-Key` per opening intent and reuses it on Retry (R12); replay = stored `open_result` (N12).
- Boxes accrue to the **sender** via high-water mark; do not "fix" toward profile "hearts received" metric (contract note).
- No hero badge in the profile header (N10, F007 D006). Rules-panel copy kept verbatim from design.

## Requirements
- FR-001–FR-003, FR-101–FR-103, FR-201–FR-207, FR-401–FR-409, FR-601–FR-604, BR-001–BR-010, ALG-001–ALG-004, INT-001, US001–US009; SC-001–SC-014 (backend SCs proven in P2 re-run here; SC-008 with P7 Highlight).

## Architecture
```
KudoCard.HeartSlot → HeartButton (optimistic) → PUT|DELETE /kudos/{id}/heart → {total, viewerHearted}
KudoCard.HeroBadgeSlot → HeroBadge(tier from DTO) + hover (thresholds from gamification-config)
CampaignBadge ← GET /campaigns/active (error → hidden)
FAB "Thể lệ" → shell-actions.openRules() → RulesPanel (static)
BoardSidebar box button / profile button → SecretBoxModal ← GET /me/secret-boxes ; open → POST …/open (Idempotency-Key)
BoardSidebar latest recipients ← SecretBoxService.LatestRecipients (via /kudos/sidebar)
```

## Related Code Files
Create (backend)
- `backend/internal/gamification/{active_campaign_handler.go, secret_box_summary_handler.go, latest_gift_recipients.go, hero_tier_reader.go}`
- `backend/cmd/api/wire_gamification_reads.go`
Modify: `backend/internal/gamification/secret_box_service.go` (summary read), `backend/db/queries/gamification.sql`, `backend/internal/kudo/kudo_read_service.go` (heroTier + sidebar recipients via F008 services)
Create (frontend)
- `src/features/gamification/{heart-button.tsx, hero-badge.tsx, hero-badge-hover.tsx, campaign-badge.tsx, rules-panel.tsx, secret-box-modal.tsx, use-open-secret-box.ts, gamification-config.ts, gamification-api.ts}`
- `src/i18n/dictionaries/{vi,en}/gamification.json`
- Tests: `src/features/gamification/use-open-secret-box.test.ts` (key reuse on retry), `src/features/gamification/heart-button.test.tsx` (revert on 500), `e2e/like-kudos-and-secret-box.spec.ts`
Modify: `src/features/kudos-board/{heart-slot.tsx, hero-badge-slot.tsx, board-sidebar.tsx}`, `src/app/(shell)/layout.tsx` (mount RulesPanel), `src/components/shell/shell-actions-context.tsx` (register rules)

## Implementation Steps
1. Active campaign endpoint (highest multiplier, none vs error distinct).
2. Secret-box summary `{unopened, opened, distinctIcons}`; latest gift recipients; tier read `TiersFor` for DTO heroTier.
3. HeartButton optimistic + revert, disabled for sender (`viewerCanHeart`), campaign-aware total.
4. HeroBadge + hover; CampaignBadge + hover (Figma `3241:15021`).
5. RulesPanel static (copy verbatim) via FAB.
6. SecretBoxModal states unopened/opening/revealed/empty; idempotency key per intent; retry reuses key.
7. Fill P7 slots + sidebar; tests.

## Todo List
- [x] Active campaign endpoint
- [x] Summary + recipients + tier read
- [x] HeartButton
- [x] Hero + campaign badges
- [x] Rules panel
- [x] Secret box modal
- [x] Slot wiring + tests

## Success Criteria (test plan)
- Go integration: re-run P2 F008 SC-001–SC-014; new: active campaign none/error; summary + C02/C04 shapes; SC-008 Highlight with zero-heart fill.
- Vitest: retry reuses Idempotency-Key; HeartButton reverts on 500/409.
- Playwright (`live` seed + seeded x2 campaign): recipient hearts → total +2; sender sees disabled heart; withdraw → total back; x2 badge hover; open box → icon revealed; network-drop retry → same result.
- Daily check: Like Kudos category.

## Scope Contract
- Changed: gamification reads, F008 UI, P7 slot files, shell rules mount.
- Impacted: board/detail cards, sidebar, profile (P9 reuses modal + summary).
- Will verify: Go integration (mutations, idempotency, concurrency = safety-critical data mutations → full F008 suite), Vitest for client retry logic, Playwright for heart/box UX.
- Deliberately skipped: campaign CRUD (P13).

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| Totals disagree across surfaces (RISK-02) | L | M | Single `kudo_heart_state` read |
| Heart-swapping rings (RISK-01) | M | L | Accepted (D017) |
| Optimistic UI drift under errors | M | L | Reconcile with server response total |

## Security Considerations
- Sender check server-side; idempotency key scoped to caller (lookup by user + key); no box data for others.

## Rollback
- Revert UI commits → slots show placeholders; backend reads are additive.

## Next Steps
- Unblocks P9, P11. Open items: see Delivery → Open carry-overs.

## Delivery
Commit `a9f3c68` (pushed to `feat/saa-screens`). Screen tracker rows 30–50 Done (PASS, sha `a9f3c68`). Review closed by `reports/reviewer-phase-08.md` (round 1, recheck, recheck 2): 0 critical, 0 open warning. Status DONE.

**Done**
- Like Kudos: heart on every card and View Kudo. Optimistic toggle reconciled to the server total; sender sees a disabled heart; a failed campaign lookup returns 500 and the control reverts (R09). The heart store is keyed by viewer id, and one claim per kudo is shared across cards.
- Campaign x2 badge beside each card heart and in the sidebar (D013). Hidden when no campaign is active or the read fails.
- Hero badges New, Rising, Super, Legend on the card, with hover (tier from the DTO).
- Thể lệ rules panel from the FAB: static copy verbatim, sticky footer with Đóng and Viết KUDOS.
- Secret Box modal: unopened, opening, revealed, empty, standby and completion states. One `Idempotency-Key` per intent, reused on retry. Replay returns the stored `open_result` (N12). The 6th icon completes the set once (`IS NULL` guard under the user lock).
- Sidebar: Secret Box button always enabled, footer "Icon đã sưu tập n/6", gift list with an 88 px right inset for the FAB.
- Seed: 8 more Sunners, 30 generated kudos, x2 campaign authored by demo Sunner 1, An with 5 unopened and 3 opened boxes.

**Fix rounds per screen** (tracker rows 30–50)

| Screen | Row | Fix rounds | Defect fixed |
|--------|-----|------------|--------------|
| Hover campaign (x2 heart) | 30 | 1 | Badge placed in the sidebar only, against D013. Now beside each card heart; sidebar badge kept. Round 2 PASS |
| Thể lệ UPDATE (rules panel) | 31 | 1 | Footer below the fold at 1440×1024. Now pinned. Round 2 PASS (1440×1024 only) |
| Hover danh hiệu New, Rising, Super, Legend | 32–35 | 0 | — |
| Open secret box, unopened (1, 2) and opening (1, 2) | 36–39 | 0 | — |
| Open Giftbox, result (1) and (2) | 40–41 | 1 each | Orchestrator decision: spec FR-206 and D012 win over the Figma 6/6 frame. No code change. Re-marked PASS; Figma frame is an open design item |
| Open Giftbox, prize frame (3) | 42 | 0 | Prize frame = completion screen (D010) |
| Standby (1/8 to 8/8) and completion | 43–50 | 0 | — |

**Checks on final code** (`a9f3c68`), as reported by the orchestrator
- gofmt clean; `go vet` 0; `go test` 0; `go test -tags integration` 0; typecheck 0; lint 0; vitest 347 (29 files); `next build` 0.
- Playwright full suite 101/101 (1 worker). One run hit a P3 FAB timing flake (`app-shell-and-locale.spec.ts:55`) that passed alone and in the next two full runs.
- `-race` not run (no gcc on host).
- Evidence gap: `evidence/` holds the P8 spec subsets only (`p8-e2e-run1.txt` and `run2` 10/10 each, `p8-r2-e2e-run1.txt` 11/11). The full-suite, Go and vitest outputs are not saved under `evidence/`. Save them before merge (carry-over 17).
- Run-wide checks in `verify-secret-box-standby.md` round 2: FAIL (minor) for profile-role ERROR logs and FAB overlap. Both have code fixes in `a9f3c68`, but no re-verify is recorded (carry-over 13, 14).

**Review** (`reports/reviewer-phase-08.md`)
- Round 1: 0 critical, 3 warnings, 7 suggestions. W1 closed: heart store keyed by user id (the store was a WeakMap per viewer object, so a focus refresh dropped optimistic state). W2 closed: per-kudo in-flight claim with safe rollback. W3 closed: `icons_completed` notice written in the open tx via `notification.StoreInTx` under a savepoint, exactly once. S1, S2, S5 closed.
- Recheck 1: N1 (claim not released on throw) found. No new warnings.
- Recheck 2: N1 closed (`withHeartClaim` with `finally`). Auth change is log-only: `LogRequestFailure` replaces the `slog.ErrorContext` in `RequireProfile` and `me_handler.go`; status and authz flow unchanged.
- Open suggestions: R1, R2, N2, N3, N5, N6.

**Deviations from plan**

| # | Deviation | Reason | Cost |
|---|-----------|--------|------|
| 1 | Prize frames (standby 2–7, giftbox 3) are one completion screen with six icons; no prize data (D010) | No prize catalogue | Prize copy only says it is handed out at SAA 2025 |
| 2 | Campaign badge beside each card heart and in the sidebar (D013) | Round 1 FAIL on placement | Badge renders once per card; hidden when no campaign |
| 3 | Heart: red outline; own kudo uses a grey filled heart with title and label (DEC-001) | Figma and own-kudo reason | Own-kudo state carries its reason in label, not only colour |
| 4 | Secret Box button always enabled; footer "Icon đã sưu tập n/6" | FR-102 contradicts the old disabled guard; FR-207 covers zero boxes | Button never disabled |
| 5 | Reveal artwork cropped from 1x PNGs (soft reveal icons) | Only 1x assets supplied | Soft edges; @2x requested (carry-over 5) |
| 6 | Vitest tests are pure modules, not `.tsx` (`heart-button.test.ts`) | No DOM needed for the toggle logic | None |
| 7 | Seed: 8 more Sunners, 30 generated kudos, x2 campaign by demo Sunner 1, An 5 unopened and 3 opened boxes | Coverage for heart, box and tier paths | Seed grows; still local-only |
| 8 | E2E fixtures insert box rows directly (`e2e/support/gamification-fixtures.ts`) | Reaching 6/6 and completion states | Test-only; not imported by `src/` |
| 9 | Shared `httpx.LogRequestFailure` applied to ~20 handlers, including auth middleware | Cancelled-caller requests logged as ERROR | Log level only; status unchanged |
| 10 | `icons_completed` notice written from the gamification tx via `notification.StoreInTx` | Exactly-once needs atomic write (R11) | Spec line "F008 never writes notifications directly" is now out of date (carry-over 2) |
| 11 | Gift-recipient query moved from `kudo_read.sql` to `gamification.sql` (`SidebarRecipients` alias of `GiftRecipientsLimit`) | Single owner for gift data | P7 query file changed; no behaviour change |
| 12 | Rules panel body scrolls; footer is a `shrink-0` row | Fits 1024 px only with the footer pinned | Only 1440×1024 checked (carry-over 15) |
| 13 | Sidebar gift rows: 88 px right inset (`pr-[88px]`) | FAB overlap | Narrows names on small widths (carry-over 14) |

**Open carry-overs**

| # | Item | Owner | Done when |
|---|------|-------|-----------|
| 1 | Figma giftbox frames 40–41 show the 6/6 pending layout; spec FR-206 and D012 show the revealed icon and count | User / designer | Figma frame meaning decided and logged in `clarifications.md`, or frame updated |
| 2 | Spec line "F008 never writes notifications directly" is out of date for the in-tx `icons_completed` notice (W3) | Main agent (spec owner) | Technical spec and contract amended; D015 confirmed |
| 3 | Heart error copy "Could not save your heart…" | User | Copy confirmed or replaced in `gamification` dictionaries |
| 4 | Panel title "Thể lệ" wording | User | Wording confirmed or replaced |
| 5 | @2x reveal icons (deviation 5) | Designer | @2x assets supplied and reveal art swapped |
| 6 | Real prize catalogue (D010) | User | Catalogue supplied, or one-screen completion accepted in writing |
| 7 | Gift recipient copy "Nhận được 1 icon" vs Figma "áo phông" | User | Copy chosen and logged |
| 8 | R1: INFO can hide a DB stall (browser 5 s budget vs server 5 s DB deadline) | User | Choose WARN for cancelled-by-caller, or elapsed-time rule; log decision |
| 9 | R2: `LogRequestFailure` appends to caller's variadic slice | P8 owner (implementer) | `slices.Concat` used; helper test still green |
| 10 | N2: `identify` clears in-flight while a request is pending | P8 owner (implementer) | Viewer generation check in `set`; test for sign-out mid-request |
| 11 | N3: client abort (5 s) gives status 0 and a "failed" revert even if the server committed | User | Accepted in writing, or reconcile GET after failure |
| 12 | N5: `campaign-badge` `placement="above"` inside the `overflow-hidden` carousel | Tester | First and last carousel card and a short feed card checked; screenshot in `evidence/` |
| 13 | Log hygiene: profile-role load logged `context canceled` at ERROR (standby round 2 FAIL) | Tester | Code fix re-verified: no ERROR for client-cancelled requests in `logs/api.log` after the e2e runs |
| 14 | FAB covers gift-row text in sidebar (standby round 2 FAIL) | Tester | `r2-fab-sidebar-scrolled.png` re-captured with the 88 px inset; no overlap |
| 15 | Rules panel checked only at 1440×1024; footer not pinned below that height | Tester | Capture at 1280×800 (desktop minimum) and footer visible or accepted |
| 16 | Rows 22 and 29 re-check (P7 carry-over 15) not recorded | Tester | Board card re-captured with live heart and hero slots; rows 22 and 29 PASS recorded |
| 17 | Full-suite, Go and vitest outputs not in `evidence/` | Tester | Outputs saved to `evidence/`; counts match this section |
| 18 | `read current event: timeout` ERROR (recurring, from countdown spec table lock) | P14 owner | Checked under load in the P14 run; fixed or logged as known |
| 19 | P3 FAB e2e flake (`app-shell-and-locale.spec.ts:55`) | P14 owner | Passes in three consecutive full runs without retry |
| 20 | `-race` not run | User / CI | `go test -race` exit 0 on a host with gcc or in CI |

Not on the orchestrator's list, disposition needed: round-1 S3 (campaign read once per layout mount), S4 (`aria-label` on withdraw; `aria-disabled` for own kudo), S6 (seed comment says 22 senders, query yields 21), S7 (no rate limit on heart endpoints); recheck N4 (heart and open handlers covered by the recheck-2 cancellation test, which looks satisfied); recheck N6 (reviewer: nothing to do).
