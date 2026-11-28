# Verify: KUDO card component (F006, tracker row 29, `docs/figma-refs/user/kudo-card.png`, anonymous: `write-kudo-anonymous.png`)

**Verdict: FAIL (low).** The card anatomy matches the Figma component, and the anonymity masking holds on every path I could reach. One spec miss: a broken image shows the placeholder straight away with no single reload retry, and the placeholder text is a tooltip only. This is confirmed in code. It was not exercised live, because the `live` seed has no kudo images.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed. Standalone headless Chromium (MCP profile locked).

## Evidence

- Card element (feed): `plans/261109-1626-saa-2025-website/evidence/screens/kudo-card/feed-card-element.png`
- Anonymous card element (feed): `evidence/screens/kudo-anonymous-card/feed-anonymous-card-element.png`
- References: `docs/figma-refs/user/kudo-card.png`, `docs/figma-refs/user/write-kudo-anonymous.png`
- Masking scan: standalone, API JSON parsed for 3 anonymous items, HTML proximity for all 5 anonymous kudos (method below)
- E2E: `evidence/screens/e2e/pw-kudos-board-run.log` (exit 0, 11 passed; tests 1, 9, 11)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-002 sender → receiver, avatar, name, unit code, badge | PASS | Card: avatars, names, unit codes, badge (text pill, see deviation D-badge) |
| FR-002 time "HH:mm - MM/dd/yyyy" | PASS | "13:29 - 11/28/2026" |
| FR-002 title, text, hashtags, heart count, Copy Link | PASS | Element capture; heart count "2" equals weighted total (e2e test 1 on highlight) |
| FR-002 up to 5 images in sender's order | NOT VERIFIED | `kudo_images` has 0 rows in `live`. See C1 |
| FR-003 anonymous shows no name, avatar or unit to a plain Sunner, only "Ẩn danh" | PASS | Card shows "Ẩn danh / Người gửi ẩn danh", incognito avatar, no unit code, no link (accepted D009) |
| FR-003 nothing in data or image links identifies the sender (R01) | PASS | See masking scan below |
| FR-211 places for heart and hero badges | PASS (P8 out of scope) | Heart count shown; heart button and hero artwork are P8 / F008 |
| FR-403 Copy Link on card | PASS | Element capture |
| BR-001 public only | PASS | e2e test 1 |
| BR-002 anonymous sender hidden | PASS | Masking scan; e2e test 11 for admin |
| SC-002 masking on every read | PASS | Masking scan (API and HTML) |
| SC-008 | Not verified | No separate check run |
| Edge: image link expires, card reloads once, else placeholder | FAIL | Code: `src/features/kudos-board/kudo-card.tsx` lines 48–52. `onError` sets `broken` at once. No reload attempt. Placeholder is a `title` tooltip only |

## Masking scan (FR-003, FR-602, R01, R02)

Method: the browser loads `/kudos` as sunner01 and scrolls the feed. I parsed every `/api/v1/kudos` response from the Go API (`localhost:8080`) and checked each anonymous item. I also searched the server-rendered HTML for each anonymous kudo's sender ID.

| Check | Result |
|-------|--------|
| API items fetched for anonymous kudos (scroll loaded 2 feed responses) | 3 of 5 |
| Each fetched anonymous item: `isAnonymous` true, `sender` null | 3 of 3 |
| Sender UUID absent from the serialised item | 3 of 3 |
| Item key set | `id, createdAt, title, contentHtml, isAnonymous, sender, receiver, hashtags, images, heart, isOwn, status` (no author field) |
| Anonymous kudos in first-page HTML | 3 of 5 (the other 2 are the API-only items) |
| HTML: sender UUID within 2,500 characters of an anonymous card's markup | 0 of 3. Nearest match is 4,219 to 6,513 characters away, in another card |
| Sender UUID in first-page HTML | Only as `/profile/<id>` links on other cards (the same user is a receiver there) |

All 5 anonymous kudos were covered by at least one surface: 3 by API JSON, and 3 by first-page HTML (one kudo is in both). The HTML check covers the server-rendered DTO; the API check covers the client-fetched DTO.

Caveat: the 5 sender UUIDs also appear as profile links on other, non-anonymous cards and in the Spotlight and gift list. Those are expected (the same users are receivers elsewhere).

## Visual diff (`docs/figma-refs/user/kudo-card.png` vs `feed-card-element.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Card surface, cream, rounded | as frame | identical | OK |
| Avatars and arrow between them | as frame | identical | OK |
| Names, unit code, badge row | as frame | identical | OK (badge artwork differs, see below) |
| Divider, time line, centred uppercase title | as frame | identical | OK |
| Body box, cream, gold outline | as frame | identical | OK |
| Image row (5 thumbnails) | 5 thumbnails | none on this seed | NOT VERIFIED (data, C1) |
| Hashtags in red, wrap | as frame | identical | OK |
| Heart count and Copy Link | as frame | identical | OK. Frame shows "1.000"; app formats small counts without separators. Not material |

## Visual diff (`docs/figma-refs/user/write-kudo-anonymous.png` vs `feed-anonymous-card-element.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Anonymous avatar | incognito disc | incognito disc | OK |
| Sender name line | real name (Anh Hùng Xạ Điêu) with "Người gửi ẩn danh" | "Ẩn danh" with "Người gửi ẩn danh" | Accepted deviation D009 (see below) |
| Edit pencil in title row | visible (sender's own view) | not shown (viewer is not the sender) | Correct for a plain viewer. Sender view not exercised here |
| Receiver block | as frame | identical | OK |

## Accepted deviations (judged)

- **Anonymous label "Ẩn danh / Người gửi ẩn danh" (D009):** accepted. FR-003 forbids any sender name to other Sunners. The frame shows a real name, which is the sender's own view, and that view is not in this card's scope. The masking scan confirms no name reaches a plain viewer.
- **Extra DTO fields (unit codes, unit name, gift icon, spotlight `recent`):** accepted for display. The masking scan found no extra author identifier in the item key set.
- **Badge text pill ("New Hero") in place of artwork:** accepted. Badge artwork is F008 data.
- **Hero and heart slots (P8):** not failed, per the brief.

## Console, network, logs

- Console: no errors on load or during the standalone runs.
- Non-2xx: none on the board. Only the e2e run's deliberate 404s.
- `logs/api.log`: unchanged. `logs/web.log`: new lines are the expected 404s only. No ERROR, panic or 5xx.

## Concerns and notes

- C1 Seed gap: no `kudo_images` rows on `live`. The five-thumbnail row, sender-order check, expired-link path and FR-603 cannot be checked from the card. Add images to a public kudo and an anonymous kudo, then re-run this screen. The R01 anonymous-with-images test needs this seed.
- C2 Image failure was judged from code only. A live check needs an image that fails to load, which needs C1.

## Defects

| ID | AC | Location | Expected | Actual | Severity |
|----|----|----------|----------|--------|----------|
| D1 | Edge: image link expires (spec edge, FR-603) | `src/features/kudos-board/kudo-card.tsx` lines 48–52 | On image error the card reloads the image once. If that fails, a visible placeholder shows with the text "Ảnh không khả dụng." (`kudos-board.card.imageUnavailable`) | `onError` sets the broken flag at once. No reload. The placeholder is an empty span with a `title` tooltip. No visible text | Low (spec miss, code-confirmed) |

## Fix list

1. D1 (`src/features/kudos-board/kudo-card.tsx`, the image `onError` handler near line 48): on the first error, retry once with a cache-busting query on the same signed URL. Set the broken flag only after the second failure. Render the placeholder with visible text "Ảnh không khả dụng." (the existing key), not only as a `title`. Expected: one retry, then visible placeholder. Actual: no retry, invisible text. Check with an image that fails once and then loads, and one that always fails, after C1 is seeded.

---

## Round 2 (after P7 fix round 1)

**Round 2 verdict: PASS.** D1 (broken image) is fixed. Image rendering, thumbnail order, and anonymity masking all pass on the reseeded data. No open defects.

| Command | Exit | Result |
|---------|------|--------|
| `npx playwright test e2e/kudos-board.spec.ts e2e/kudos-board-images-and-actions.spec.ts --workers=1` | 0 | 17 passed (tests 1–3 cover images and the broken-image path) |

| AC | Round 1 | Round 2 | Evidence |
|----|---------|---------|----------|
| FR-002 up to 5 images in the sender's order | NOT VERIFIED | PASS. Feed cards show 5, 5, 3, 2 and 1 thumbnails. Order equals `kudo_images.position` for all of them. All decoded | `r2-feed-card-5-images-a1118ef7.png`, `r2-feed-card-anonymous-3-images-e81077ea.png` |
| FR-603 short-lived, private links | NOT VERIFIED | PASS. Signed URLs with a 3600 s lifetime. Opaque key `kudo-images/<uploadId>.png`. Tokenless signed URL and public object URL both 400 | standalone check |
| FR-003 / R01 anonymous with images | PASS (no images) | PASS. Anonymous image cards: no sender UUID in markup or image URLs. Go API item for the 3-image anonymous kudo: `sender: null`, no sender UUID in the item, no author key | e2e tests 2 and 11; standalone check |
| Edge: broken image, one refetch, then visible placeholder | FAIL (no refetch, title only) | PASS. Case A: image 1 fails once and the refetch succeeds (2 requests, image shown). Case B: image 2 always fails: 2 requests (initial plus one refetch), then the visible text "Ảnh không khả dụng." (1 match), other 4 images still shown | `r2-feed-card-broken-image-placeholder.png`; e2e test 3 and 4 |
| FR-211 heart and hero slots | PASS (P8 out of scope) | PASS (unchanged) | n/a |

Deviations (round 1) status:
- Anonymous label "Ẩn danh / Người gửi ẩn danh" (D009): still accepted.
- Extra DTO fields: still accepted.
- Badge pill: still accepted.

Logs: no new ERROR, WARN or panic lines in `logs/api.log`. `logs/web.log`: expected 404s only.

**Verdict: PASS.** Fix list: none.



---

## Round 3 (P8 heart, x2 badge and hero badges on the card)

**Final verdict: PASS.** The card component renders the P8 heart, the x2 badge and the hero pills in the right slots. No layout regression shows against `kudo-card.png`.

Evidence (1440×1024, VN, sunner01.demo, live seed, no heart toggles):
- Card element (Highlight, Hoàng Thu Hà → Lê Minh Châu, 12 hearts): `plans/261109-1626-saa-2025-website/evidence/screens/r3-kudo-card.png`
- Reference: `docs/figma-refs/user/kudo-card.png`

Compared against the frame:

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Avatars, arrow, names | as frame | same | OK |
| Unit code and hero pill row | as frame (Legend pills) | Rising and New pills, same slot | OK (tier differs by data) |
| Time line, centred title | as frame | same | OK |
| Body box, cream, gold outline | as frame | same | OK |
| Hashtags, red | as frame | same | OK |
| Image row | 5 thumbnails in frame | none on this card (no images on this kudo) | NOT VERIFIED here (data, see round 1 C1) |
| Heart, count | filled red heart, "1.000" | outline red heart, "12" (weighted total) | Accepted: DEC-001 outline for un-hearted; weighted count per G08 |
| Campaign x2 badge | not in frame | flame x2 beside the heart | Accepted P8 addition (D013) |
| Copy Link | as frame | same | OK |
| "Xem chi tiết" link | not in the card frame | present (Highlight card, as in the board frame) | Accepted: same as `kudos-live-board.png` Highlight card |

Known differences, all accepted: outline heart (DEC-001), x2 badge (D013), and "Xem chi tiết" in the Highlight card (matches the board frame, not the card frame).

Fix list: none for row 29.
