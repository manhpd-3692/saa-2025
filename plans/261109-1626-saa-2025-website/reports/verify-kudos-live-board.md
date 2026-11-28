# Verify: Sun* Kudos Live board (F006, tracker row 22, U5, `/kudos`)

**Verdict: PASS (conditional).** Every behaviour AC that the e2e spec covers passes, and the visual comparison shows no material mismatch. Two ACs are NOT VERIFIED on this run and are listed below, not counted as passes: FR-403 first-paint section errors, and the FR-002 image row (the `live` seed has 0 kudo image rows).

Viewport 1440×1024 CSS px, DPR 1, `http://localhost:3000/kudos`, VN (`saa_locale=vi`). Data: `live` seed, 30 public kudos, signed in as sunner01.demo. Method: headless Chromium driven by a standalone Playwright script, because the MCP browser profile was locked ("Browser is already in use"). Session cookies from `playwright/.auth/user.json`. No Google login.

## Evidence

- Screens: `plans/261109-1626-saa-2025-website/evidence/screens/kudos-live-board/` (`viewport-top-1440x1024.png`, `viewport-highlight-1440x1024.png`, `explore-full.png` full page)
- Feed and section fault runs: `evidence/screens/all-kudos-feed-fault-*-1440x1024.png`
- E2E: `evidence/screens/e2e/pw-kudos-board-run.log` (run 1) and `pw-kudos-board-run-2.log` (run 2)

## Commands and exit codes

| Command | Exit | Result |
|---------|------|--------|
| `npx playwright test e2e/kudos-board.spec.ts --workers=1` (run 1) | 0 | 11 passed (36.3 s) |
| same command (run 2, flakiness check) | 0 | 11 passed (20.7 s), no retries needed |

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-001 public only (carousel, feed, counts) | PASS | e2e test 1: spotlight counter equals `count(status='public')`; "30 KUDOS" on screen |
| FR-101 header "Sun* Kudos" opens `/kudos` | PASS | e2e test 10 (header link `aria-current`). Homepage `/` and Awards `/awards` both have an `a[href="/kudos"]` and return 200 (standalone check) |
| FR-201 key visual and KUDOS logo | PASS | H1 "Hệ thống ghi nhận và cảm ơn KUDOS"; screenshot matches the Figma key visual |
| FR-202 Highlight, one card, n/5, prev/next disabled at ends | PASS | Position "Kudos 1 trên 5"; previous disabled; e2e test 1 walks 5 cards, hearts non-increasing, next disabled at 5 |
| FR-203 Hashtag filter | PASS | e2e test 2; standalone: choosing `#high-performing` shows the value on the button, position becomes "1 trên 4" |
| FR-204 Phòng ban filter (receiver unit) | PASS | e2e test 2; standalone: `CECV2` shows "1 trên 2" together with the hashtag |
| FR-205 Spotlight cloud and total | PASS | Names sized by count; "30 KUDOS" equals DB count (e2e test 1) |
| FR-206 Spotlight search, accent-insensitive | PASS | e2e test 3 |
| FR-207 All Kudos feed, newest first, pages | PASS | e2e test 4: 10 cards on first paint, next page on scroll, end marker; feed Retry covered |
| FR-208 sidebar stats | PASS | e2e test 1 against DB; sidebar shows received 4, sent 3, hearts 8 |
| FR-209 "Mở Secret Box" button present | PASS | Rendered (action belongs to F008) |
| FR-210 10 latest gift recipients | PASS | `gift-recipients` list has 10 items; each name links to a profile |
| FR-211 heart and hero slots | PASS (P8 out of scope) | Heart count shown; the heart button and secret-box slot are P8 placeholders, not failed |
| FR-403 each section loading, empty, error with Retry, independent | PARTIAL, NOT VERIFIED | Feed Retry PASS (e2e test 4). First-paint errors for Highlight, Spotlight and sidebar are server-side reads (`load-board-sections.ts`), so browser route aborts do not reach them. Injecting `/api/v1/kudos/spotlight` and `/sidebar` 500s left the sections rendering normally, which proves nothing either way. Needs a Go-side fault to close |
| FR-601 signed-out access | PASS | e2e test 10 (sign-in first, then back to the kudo) |
| FR-002 card images | NOT VERIFIED | `kudo_images` has 0 rows in the `live` seed. Image rendering and the broken-image path were not exercised (see row 29) |
| FR-003 anonymous sender hidden in board markup | PASS | Anonymity leak scan (see row 29) |
| BR-001 public only | PASS | e2e test 1 |
| BR-003 filters rank inside the filtered set | PASS | e2e test 2 |
| BR-004 accent-insensitive search | PASS | e2e test 3 |
| BR-005 feed order and no repeats | PASS | e2e test 4 |
| SC-001, SC-003, SC-004, SC-009 | PASS where they overlap e2e tests 1–4; no separate check run | Not verified separately |

## Visual diff (`docs/figma-refs/user/kudos-live-board.png` vs `viewport-top` and full page)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Key visual, KUDOS logo, search bars | as frame | identical structure | OK |
| "Sun* Annual Awards 2025" eyebrow, rule, section titles | as frame | identical | OK |
| Highlight card anatomy (avatars, arrow, names, unit, badge, time, title, text, hashtags, hearts, Copy Link, Xem chi tiết) | as frame | identical | OK |
| Highlight indicator | "2/5" (frame shows position 2) | "1/5" (data state) | Not compared: the frame is at 2/5, the live state is at 1/5 |
| Highlight neighbour cards | previous card partly visible at left | left slot blank at index 1 | Not compared: the frame and the live state differ in position; looks consistent with the first-slide rule (DEC-001) |
| Spotlight cloud and counter | "388 KUDOS" | "30 KUDOS" | Data, not a defect |
| Feed card layout | 1 column, card about 680 px wide (x 144–824) | 1 column, about 680 px (x 144–827, from the full-page capture) | OK |
| Sidebar blocks (stats, Secret Box button, 10 gift list) | as frame | identical structure | OK |
| Avatar images | photos | initials on a bronze disc | Data (seed has no avatar photos on this run). Listed for designer acceptance |
| Hero badge artwork | "Legend Hero" image in the frame | text pill "New Hero" | F008 data, not this screen. Not material |

## Console, network, logs

- Browser console: no errors on page load or during the standalone runs.
- Non-2xx responses: none on `/kudos` (standalone). Deliberate 404s only in the e2e run (FR-405 tests).
- `logs/api.log`: baseline 49 lines, unchanged after the run. Pre-existing ERROR lines (JWKS refresh, "read current event" timeouts) predate this run; none added.
- `logs/web.log`: baseline 5177 lines → 5242. New lines are the expected 404s for made-up kudo ids only. No ERROR, panic or 5xx.

## Concerns and notes

- C1 Seed gap: the `live` seed has no `kudo_images` rows, so the five-thumbnail row, image order, expired-link handling and FR-603 cannot be checked from the board. Add images to at least one public kudo and one anonymous kudo in the seed.
- C2 FR-403 coverage gap: first-paint section errors need a Go-side fault (for example a dev-only failing read) to be checked.
- C3 Recurring pre-existing `read current event ... context deadline exceeded` errors in `logs/api.log` (about hourly, most recent 13:57 today). Not caused by this screen, but worth a look.

## Fix list

No fixes required for PASS. Items to close the conditional verdict:

1. Seed at least one public kudo with images and one anonymous kudo with images (`backend/db/seeds/`, `live` scenario). Re-run row 22 FR-002 and row 29 image checks.
2. Provide a Go-side fault for `/api/v1/kudos/highlight`, `spotlight` and `sidebar` first paint, so FR-403 can be checked in the browser.

---

## Round 2 (after P7 fix round 1, DB reset and reseeded)

**Round 2 verdict: PASS.** The image-dependent ACs are now verified. The only open AC is FR-403 first-paint section errors, which still needs a Go-side fault.

Seed now has 16 kudo image rows: two named 5-image kudos, one named 1-image kudo, and anonymous kudos with 3 and 2 images. Method as round 1 (standalone Chromium, MCP profile still locked).

| Command | Exit | Result |
|---------|------|--------|
| `npx playwright test e2e/kudos-board.spec.ts e2e/kudos-board-images-and-actions.spec.ts --workers=1` | 0 | 17 passed (42.5 s). Log: `evidence/screens/r2/pw-r2-kudos-board-and-images.log` |

| AC | Round 1 | Round 2 | Evidence |
|----|---------|---------|----------|
| FR-002 images on cards | NOT VERIFIED | PASS. Feed cards show 5, 5, 3, 2 and 1 thumbnails, all decoded (naturalWidth > 0). The highlight card has no image row, matching the Figma highlight card | e2e test 1; `r2-feed-card-5-images-a1118ef7.png`, `r2-card-anonymous-3-images-e81077ea.png` |
| Thumbnail order (sender's order) | NOT VERIFIED | PASS. Rendered order equals `kudo_images.position` for all 5 kudos (checked against the DB upload ids) | e2e test 1 |
| FR-603 short-lived, private image links | NOT VERIFIED | PASS. Links are Storage signed URLs with a 3600 s lifetime (`exp` in the future). Object key shape `kudo-images/<uploadId>.png` with a random id, no user id. A tokenless signed URL and the public object URL both return 400 | standalone check |
| R01 anonymous with images: no sender identifier | NOT VERIFIED | PASS. Sender UUID absent from markup and from image URLs for all 2 anonymous image cards on the board. Go API item for the 3-image anonymous kudo has `sender: null` and no sender UUID | e2e test 2; standalone check |
| Anonymous image card in the feed | n/a | Rendered with 3 and 2 thumbnails | `r2-feed-card-anonymous-3-images-e81077ea.png` |
| FR-403 first-paint section errors | NOT VERIFIED | NOT VERIFIED (unchanged). Server-side reads; no browser route reaches them | n/a |
| FR-101 Homepage and Awards `/kudos` links | PASS | PASS (e2e test 16) | n/a |

Console: only the expected 404 for the made-up kudo id. Logs: `logs/api.log` has no new ERROR, WARN or panic lines. `logs/web.log` has only expected 404s.

**Still open for row 22:** FR-403 first-paint error for Highlight, Spotlight and sidebar (needs a Go-side fault). Nothing else.



---

## Round 3 (P8 heart, x2 badge and hero badges on the board)

**Final verdict: PASS.** The board renders with the P8 heart, the x2 badge and hero badge slots filled, and no layout regression shows against `kudos-live-board.png` in the regions compared.

Evidence (1440×1024, VN, sunner01.demo, live seed, no heart toggles, no box opens):
- Viewport of the Highlight carousel and top of the board: `plans/261109-1626-saa-2025-website/evidence/screens/r3-kudos-live-board-viewport.png`
- Full page (saved for the record, compared at region level only): `evidence/screens/r3-kudos-live-board-full.png`
- Read values: `evidence/p8-round3-results.json`: 15 cards with a heart, 15 with a campaign badge nearby, 2 hero badges on the first card

Compared against `docs/figma-refs/user/kudos-live-board.png`:

| Region | Reference | Actual | Result |
|--------|-----------|--------|--------|
| Header, hero, search bar | as frame | same | OK |
| "HIGHLIGHT KUDOS" title, Hashtag and Phòng ban filters | as frame | same | OK |
| Highlight carousel: card, arrows, pager | as frame (pager "2/5") | same structure, pager "1/5" | OK |
| Highlight card: "Xem chi tiết" link, heart count | as frame | same | OK |
| Hero badge slots (Rising, New) on the card | as frame (pills beside names) | same | OK |
| Campaign x2 badge beside the heart count | not in frame | flame x2 beside the count | Accepted P8 addition (D013) |

Known differences from the frame, all accepted:
- Hearts are outline (un-hearted) and the frame shows a filled red heart on the example card. DEC-001 defines outline for un-hearted (deviation 3 from round 1).
- The x2 badge is new on the card. The frame has no campaign badge. Spec D013 puts it beside the heart.

Fix list: none for row 22.
