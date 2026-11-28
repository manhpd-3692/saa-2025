# Verify: U8 Profile bản thân (F007, tracker row 51, `/profile`, `docs/figma-refs/user/profile-own.png`)

**Verdict: PASS (with notes).** Identity, icons, five counts, the box button state, the received list and the not-found path all behave to spec on the `live` seed. The only visual gap against Figma is the hero-tier badge in the header, which spec D006 / N10 removes on purpose. No FAIL items.

Viewport 1440×1024, DPR 1, `http://localhost:3000/profile`, VN, sunner01.demo (Nguyễn Văn An, CECV1), `live` seed. Standalone headless Chromium with `playwright/.auth/user.json` (Playwright MCP not used; a scripted capture was used directly for all screens).

## Evidence

- Full page: `plans/261109-1626-saa-2025-website/evidence/screens/profile-own/full.png`
- Capture data (text, console, responses, email scan): `evidence/screens/profile-capture-results.json`
- E2E run: `evidence/screens/e2e/pw-profiles-run.log` (exit 0, 11 passed)
- Reference: `docs/figma-refs/user/profile-own.png` (1440×4660)

## E2E run (same command as the spec's gate)

| Command | Exit | Result |
|---------|------|--------|
| `npx playwright test e2e/sunner-profiles.spec.ts --workers=1` | 0 | 11 passed (49.1 s). Single run, no retry, so flakiness is not measured |

The own-profile tests are 1 (identity, icons, counts, received list), 2 (secret box refresh), 3 (dropdown and address). Each count is compared with a live DB query at test time.

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-101 avatar menu "Profile" opens `/profile` | PASS | e2e test 1 |
| FR-001 / FR-201 avatar, name, unit code, icon row | PASS | Name "Nguyễn Văn An", unit "CECV1", 6 icon slots, collected icons match `icons` in DB (e2e test 1) |
| FR-202 counts: received, sent, hearts (weighted), opened, unopened | PASS | Capture: received 4, sent 20, hearts 10, opened 9, unopened 0. e2e test 1 checks each against SQL |
| FR-203 "Mở Secret Box" enabled only with ≥1 unopened | PASS | 0 unopened: button disabled (D009). e2e test 2 checks enabled at 1 |
| FR-204 KUDOS list newest first, 10 per page | PASS | e2e test 1 compares card ids with SQL, newest first, limit 10 |
| FR-205 / FR-401 filter switches list and keeps address | PASS | e2e test 3: `/profile?filter=sent` after reload |
| FR-206 empty state for a filter with no kudos | PASS | e2e test 7 (on a quiet Sunner) |
| FR-404 close secret-box flow refreshes counts and icons | PASS | e2e test 2 (unopened 1→0, opened 2) |
| FR-403 counts follow list visibility | PASS | e2e test 1: received/sent counts exclude spam via the same SQL filter |
| FR-601 signed-out visitor sent to Login | PASS | e2e "signed out" test |
| FR-605 no email, no other person's box inventory | PASS | Email scan on own page: neither the owner's nor Bình's email appears in the HTML |
| FR-104 unknown / malformed id shows Not found, minimal chrome | PASS (on the teammate route) | Captured `/profile/<unknown>` and `/profile/not-a-uuid`: "KHÔNG TÌM THẤY", HTTP 404. Own route has no id, so this is covered by the other-profile check |
| US001 new Sunner sees zeros, not an error | NOT VERIFIED | No zero-activity account in `live` (the `quiet` Sunner used for the empty state is teammate-side only) |
| US002 error path: failed list keeps cards and shows retry | PASS | e2e test 8 (route returns 500) |
| Counts error with retry (E19, `countsUnavailable`) | NOT VERIFIED | Not forced in a test. Only the happy path was exercised |

## Visual diff (`profile-own.png` vs live capture)

Judgment is qualitative: no pixel-diff metric was produced, so nothing here is marked "exact".

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Header hero (banner, avatar ring, name, unit) | photo avatar, unit "CECV3", tier badge "Legend Hero" beside unit | initials "N" disc, unit "CECV1", no tier badge | Deviation accepted: photo (seed has no avatars); badge removed by D006 / N10 |
| Icon row | 6 slots, all coloured in Figma | 6 slots rendered as coloured discs with labels; collected state is data-driven (e2e test 1 checks `data-collected` against DB) | Accepted (not pixel-compared) |
| Counts block | 5 rows, right-aligned gold numerals, gold "Mở Secret Box" | same 5 rows and labels; button is disabled (dim) | Accepted: Figma shows 25 unopened, live data 0 (D009 disabled state) |
| Extra helper line "Bạn chưa có Secret Box nào để mở." under the button | not in Figma | shown when 0 unopened | Minor, accepted with a note: copy is not in the design (D011 wording pending). See Concern C2 |
| KUDOS title, filter button "Đã nhận (4)" | "Đã gửi (5)" as sample | same control, count in label | PASS (state differs by data) |
| Cards | shared KUDO card | same card anatomy; Spam badge absent | Accepted: spam never on profiles (FR-604, D007) |
| Header nav "Sun* Kudos" | not highlighted | not highlighted | PASS (matches Figma and F001 FR-101 rule) |

## Masking and privacy (own page)

- Anonymous kudo received by An (`Giải cứu deadline`-style card, sender "Ẩn danh") is masked, and the avatar is not a link. This matches D002 (the owner sees their received anonymous kudos masked like everyone else).
- Email scan: 0 emails in the HTML.
- No secret-box inventory of another person on this page.

## Console, network, logs

- Console errors: none on `/profile` (standalone capture).
- Responses ≥400 on `/profile`: none.
- Web log for the run: 30 new lines, all 200s and the two expected 404s from the not-found probes. No 5xx.
- API log baseline: 88 lines before the run. No lines added during the captures. Line 88 is an ERROR `read current event: timeout` at 18:07:57, which predates this run and is not new.

## Concerns

- C1: Seed-dependent. The list and counts are correct for `live` data at the time of the run. Re-run after reseed.
- C2: The helper line "Bạn chưa có Secret Box nào để mở." is extra copy. Confirm it against the final dictionary (D011) or remove it.
- C3: Test-data pollution in `live`. Teammate-profile lists show E2E-created kudos ("E2E ĐÃ SỬA", "E2E GỬI LẠI SAU LỖI", etc.) left by the write-kudo specs. Not caused by this screen, but it visibly shows on profiles. Consider cleanup or a separate seed.

## Defects

None open for this screen.

## Fix list

None required for PASS. Optional: resolve C2 (copy) and C3 (seed hygiene).

**Status:** DONE (verdict PASS with notes)

---

## Round 2 (after P9 fix round 1, DB reseeded `live`, sessions recreated)

**Round 2 verdict: PASS.** The round-1 notes C2 and the unverified sr-only line are resolved as far as the live state allows. The sr-only line is code-verified only; it cannot be shown live until unopened reaches 0.

| Command | Exit | Result |
|---------|------|--------|
| `npx playwright test e2e/sunner-profiles.spec.ts --workers=1` | 0 | 12 passed (41.7 s). Log: `evidence/screens/e2e/pw-profiles-r2-run.log`. Test 2 opens the box flow and restores the box snapshot afterwards (see Concerns) |

Live state after reseed (captured): received 4, sent 6, hearts 10, opened 3, unopened 5. The counts changed from round 1 because of the reseed, not from a code change.

| AC | Round 1 | Round 2 | Evidence |
|----|---------|---------|----------|
| Header highlight: own `/profile` highlights nothing | PASS | PASS. "Sun* Kudos" and "About SAA 2025" both have a transparent background and no gold bar | `r2-header-nav.png` (own), computed styles in `profile-r2-capture-results.json` |
| Filter switch during "Xem thêm" (list-state rewrite) | not tested | PASS. Standalone on Nhật: 20 cards after load more, then "Đã gửi" gives 2 cards, URL `?filter=sent`, label "Đã gửi (2)", no received cards left behind. e2e test 6 (late-page race, review W1) passes | `evidence/screens/profile-dropdown-received-sent/r2-filter-switch-after-load-more.png` |
| Refresh after sending a kudo (FR-403, review W2) | not tested | PASS (on the teammate route; own-profile list is unaffected by this path). e2e test 5 passes: new kudo on top, count follows, spam-turned kudo removed | e2e log |
| "Bạn chưa có Secret Box nào để mở." is sr-only, not visible | flagged visible in round 1 (C2) | CODE PASS, LIVE NOT VERIFIED. `src/features/profile/profile-stats-block.tsx` lines 36 and 44: `<p class="sr-only">` rendered only when unopened is 0, linked to the disabled button by `aria-describedby`. The live account has 5 unopened, so the line is not in the DOM (count 0). Reaching 0 would consume boxes, which was not allowed | `profile-stats-block.tsx`, `r2` DOM check |

Round-2 screenshots: `evidence/screens/profile-own/r2-full.png`, `evidence/screens/profile-own/r2-header-nav.png`, `evidence/screens/profile-dropdown-received-sent/r2-filter-switch-after-load-more.png`.

**Final verdict (own, row 51): PASS.** C2 is closed (sr-only). C3 (seed test data on teammate lists) still applies to row 52 and is not a defect of this screen.
