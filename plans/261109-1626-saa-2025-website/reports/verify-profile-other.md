# Verify: U9 Profile người khác (F007, tracker row 52, `/profile/<id>`, `docs/figma-refs/user/profile-other.png`)

**Verdict: FAIL (low).** The teammate profile is read-only as specced: no box button, no box figures, no email, masked anonymous senders, not-found for unknown and malformed ids, and the own-id redirect works. One visual miss: the header nav does not highlight "Sun* Kudos" on the teammate profile, while the Figma frame does. Fix item 1 below.

Viewport 1440×1024, DPR 1, `http://localhost:3000/profile/d0000000-0000-4000-8000-000000000002` (Trần Thị Bình, CECV1), VN, sunner01.demo viewer, `live` seed. Standalone headless Chromium with `playwright/.auth/user.json`.

## Evidence

- Full page: `plans/261109-1626-saa-2025-website/evidence/screens/profile-other/full.png`
- Anonymous-masking page (Khang): `evidence/screens/profile-anon-masked-khang/full.png`
- Not-found: `evidence/screens/profile-not-found-unknown/full.png`, `evidence/screens/profile-not-found-malformed/full.png`
- Capture data: `evidence/screens/profile-capture-results.json`
- E2E run: `evidence/screens/e2e/pw-profiles-run.log` (exit 0, 11 passed)
- Reference: `docs/figma-refs/user/profile-other.png` (1440×4384)

## E2E run

| Command | Exit | Result |
|---------|------|--------|
| `npx playwright test e2e/sunner-profiles.spec.ts --workers=1` | 0 | 11 passed (49.1 s). Single run |

Teammate-relevant tests: 4 (avatar opens profile, read-only, send preselects), 5 (send from teammate profile, count follows), 6 (own id redirect, unknown and malformed → Not found), 7 (load more, empty state), 8 (failed list keeps cards, retry), 9 (anonymous masking), 10 (signed out → Login), 11 (admin sees real sender).

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-102 teammate avatar on a kudo card opens their profile | PASS | e2e test 4 |
| FR-102 anonymous, masked avatar does nothing | PASS | e2e test 9 (no link to the sender's id on Khang's page) |
| FR-103 own id on the teammate address shows own profile | PASS | e2e test 6: `/profile/<AN>?filter=sent` redirects to `/profile?filter=sent` |
| FR-104 unknown / malformed id → Not found, minimal chrome | PASS | Captured `/profile/6b0f3c55-…-dead` and `/profile/not-a-uuid`: HTTP 404, "KHÔNG TÌM THẤY", "Về trang chủ", no FAB (C01). e2e test 6 |
| FR-301 no "Mở Secret Box" button, no unopened figure | PASS | Capture shows no box button; e2e test 4 asserts `profile-open-box` and both box stats absent |
| FR-302 same received/sent filter and paging | PASS | Capture "Đã nhận (17)" dropdown; e2e test 7 load more |
| FR-402 load more appends next 10 | PASS | e2e test 7 on Nhật (>20 received) |
| FR-206 empty state on teammate | PASS | e2e test 7 (quiet Sunner: "Chưa có Kudos nào ở đây.") |
| FR-605 no email on the page | PASS | Email scan on capture: 0 emails for An or Bình in HTML (e2e test 4 also checks Bình's email) |
| FR-601 signed-out → Login | PASS | e2e test 10 |
| FR-602 / BR-001 anonymous sender masked, no link | PASS | Khang's page: anonymous card "Ẩn danh / Người gửi ẩn danh", Mai Linh's id absent from the HTML (scan: false). e2e test 9 |
| FR-603 / BR-002 teammate's sent list and count exclude anonymous | PASS | e2e test 9: Châu's sent count = visible sends; anonymous ids absent from list |
| FR-403 counts match list | PASS | e2e test 4 compares counts with SQL |
| FR-604 spam excluded | PASS (by SQL in tests) | Counts query filters `status = 'public'` in e2e |
| FR-202 / D008 hearts received = weighted total | PASS | Capture 15; e2e test 4 SQL-sums weights |
| D010 / G04 admin sees the real sender of an anonymous send | PASS | e2e test 11 (Lê Minh Châu shown, "(Gửi ẩn danh)") |
| Header highlights the current section (F001 FR-101 / Figma) | FAIL | See the nav row below and fix item 1 |

## Visual diff (`profile-other.png` vs live capture)

Qualitative judgment only. No pixel-diff metric was produced.

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Header nav "Sun* Kudos" | highlighted (filled tile) | not highlighted | FAIL (low), fix 1 |
| Avatar, name, unit | photo, "CECV3", tier badge | initials "T", "CECV1", no badge | Accepted: photo (no seed avatars); badge removed (D006 / N10). Name and unit are seed data |
| Icon row | 6 slots, collected one(s) coloured | 6 slots; only STAY GOLD collected, labelled | Accepted (data-driven). Icon names shown as tooltip only, see Accepted deviations |
| Counts block | none in Figma | 3 rows: received 17, sent 4, hearts 15, no box rows | Accepted: spec US004 and FR-001 require "counts", and BR-004 forbids only box figures. Figma frame lacks it |
| "Gửi lời cảm ơn và ghi nhận tới Trần Thị Bình" | pill button below icons | same button, opens send dialog preselected | PASS |
| KUDOS title + "Đã nhận: 5 Kudos" label | label on the right | dropdown "Đã nhận (17)" on the right | Accepted: FR-302 and FR-205 require the filter on teammate pages; the label is a static sample |
| Cards | shared KUDO card | same anatomy, anonymous cards show "Ẩn danh" | PASS (card owned by F006) |

## Accepted deviations (judged)

- **D-counts:** the 3-row counts block (received, sent, hearts) on the teammate page is kept. Reason: the spec requires counts on both pages (US004, FR-001). BR-004 only removes the box figures. Figma omits the block, so it is a spec-over-design call. Accepted.
- **D-dropdown:** the received/sent dropdown replaces the "Đã nhận: 5 Kudos" label. Reason: FR-302 requires the same filter and paging on teammate pages. Accepted.
- **D-badge:** no hero badge in the header (D006 / N10). Accepted.
- **D-spam:** no spam badges (D007 / FR-604). Accepted.
- **D-avatar:** initials instead of a photo. Seed has no avatars. Accepted.
- **D-icon:** icon slots show the name as a tooltip only. No description data in the seed, and the icon description is owned by F008 (FR-202 icon hover). Accepted as a data gap, not a screen defect.

## Nav highlight: decision

- F001 FR-101 says the header "highlights the one for the current section" and the tests say "on each of the three main sections exactly one header link is highlighted". The three are Homepage/Awards/Kudos.
- The Figma own frame (`profile-own.png`) shows no highlight. The Figma other frame (`profile-other.png`) highlights Sun* Kudos.
- Live DOM: the "Sun* Kudos" link has no `aria-current` and no highlight class on either `/profile` or `/profile/<id>`. So the own page matches Figma and F001. The other page does not match the Figma frame.
- Decision: FAIL (low). The Figma frame is the visual truth for the teammate page. F001 has no rule covering profile pages, so the spec is silent for `/profile/<id>`. The fix is to highlight "Sun* Kudos" on teammate profile routes only, which is what the frame shows. If the team considers the F001 rule authoritative, amend F007 to say no highlight and record it in `spec/gap-resolution-log.md` instead. Either way, the implementer must not change the own-profile behaviour.

## Console, network, logs

- Console errors on `/profile/<Bình>`: none. Responses ≥400: none (the capture ran with `networkidle`).
- Khang page (`/profile/<Khang>`): no console or response errors. Châu's page was not captured standalone; its sent-list masking is covered by e2e test 9 only.
- Not-found probes: one expected 404 document response each, plus the browser's "Failed to load resource: 404" console line for the same document. Expected, not a defect.
- Web log: only 200s and the two expected 404s. No 5xx.
- API log: no new lines during the capture. Line 88 (`read current event` timeout, 18:07:57) predates this run.

## Concerns

- C1: The teammate list shows E2E-created kudos ("E2E ĐÃ SỬA", "E2E GỬI LẠI SAU LỖI", …) left in `live` by the write-kudo specs. They appear on Bình's profile and mix with seed data. Seed hygiene issue, not a screen defect.
- C2: The e2e spec creates and deletes one kudo on Bình's profile (test 5). It passed, so the deletion path is working.
- C3: Only one e2e run; flakiness not measured.

## Defects

| ID | AC | Location | Expected | Actual | Severity |
|----|----|----------|----------|--------|----------|
| D-nav | Header highlight on teammate profile (Figma `profile-other.png`) | Header nav component, route check for `/profile/<id>` (F001 `NavLinks`) | "Sun* Kudos" highlighted on `/profile/<id>` as in the frame | Not highlighted | Low |

## Fix list

1. Header nav (F001 `NavLinks`, `usePathname()`): on `/profile/<id>` (teammate route only, not `/profile`), mark the "Sun* Kudos" link as the current section, using the same highlight style as the Kudos page. Keep `/profile` (own) unhighlighted to match its frame. Verify with `profile-other.png` and the own page. Expected: teammate page highlights Sun* Kudos; own page does not. Actual now: neither highlights. Re-run `npx playwright test e2e/sunner-profiles.spec.ts --workers=1` after the fix.

**Status:** DONE (verdict FAIL, low; one fix item)

---

## Round 2 (after P9 fix round 1, DB reseeded `live`, sessions recreated)

**Round 2 verdict: PASS.** The round-1 defect D-nav is fixed.

| Command | Exit | Result |
|---------|------|--------|
| `npx playwright test e2e/sunner-profiles.spec.ts --workers=1` | 0 | 12 passed (41.7 s). Log: `evidence/screens/e2e/pw-profiles-r2-run.log` |

Live state after reseed: teammate Bình received 3, sent 4, hearts 15. The round-1 counts (17 received) changed with the reseed.

| AC | Round 1 | Round 2 | Evidence |
|----|---------|---------|----------|
| Header "Sun* Kudos" highlighted on `/profile/<id>` (Figma `profile-other.png`) | FAIL (low) | PASS. Computed style: text and bottom bar both `rgb(255, 234, 158)` (gold). "About SAA 2025" is unhighlighted | `evidence/screens/profile-other/r2-header-nav.png`, `profile-r2-capture-results.json` |
| Own `/profile` highlights nothing (regression check from round 1) | PASS | PASS | `profile-own/r2-header-nav.png` |
| Teammate list refresh and filter switch (rows touched by list-state rewrite) | not tested | PASS. e2e tests 5, 6, 7, 8 pass | e2e log |
| No box button and no box figures; no email; masked anonymous senders; Not-found | PASS | PASS (unchanged; e2e tests 4, 6, 9, 10) | e2e log |

Round-2 screenshots: `evidence/screens/profile-other/r2-full.png`, `evidence/screens/profile-other/r2-header-nav.png`.

**Final verdict (other, row 52): PASS.** D-nav closed. The accepted deviations in round 1 (counts block, dropdown in place of the label, no hero badge, no spam badges, initials, icon tooltip) still stand. C1 (E2E test data on teammate lists) remains a seed-hygiene concern, not a screen defect.
