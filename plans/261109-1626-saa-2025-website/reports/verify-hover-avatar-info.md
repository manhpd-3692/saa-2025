# Verify: Hover Avatar info user (F006, tracker row 26, `721:5827`)

**Verdict: PASS.** Hover shows the avatar ring and the info card; an anonymous sender gets no card.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed. Standalone headless Chromium (MCP profile locked).

## Evidence

- `plans/261109-1626-saa-2025-website/evidence/screens/hover-avatar-info/viewport-1440x1024.png` (hover on the first visible feed avatar, Lê Kiều Trang, card open)
- E2E: `evidence/screens/e2e/pw-kudos-board-run.log` (exit 0, 11 passed; test 8)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-402 hover or focus shows info card with name, unit, badge, counts | PASS | Card shows name, unit line, badge, "Số Kudos nhận được: 1", "Số Kudos đã gửi: 2" |
| FR-402 card opens after a short delay (300 ms in config) | PASS | e2e test 8 (waits for the delay). Standalone: card visible 900 ms after hover |
| FR-103 clicking avatar or name opens profile | PASS | e2e test 8 (link `/profile/<id>`) |
| BR-002 anonymous sender has no card and no link | PASS | e2e test 8; anonymous cards carry no `/profile` link (row 29) |
| SC-002 hover card for a named sender | PASS | Standalone |

## Visual diff (`docs/figma-refs/user/hover-avatar-info.png` vs `viewport-1440x1024.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Hovered avatar: gold ring | gold ring on hovered avatar | gold ring on hovered avatar | OK |
| Info card anchored below the avatar | card below | card below, left-aligned to the avatar | OK |
| Card surface dark, gold name | as frame (Figma info card) | identical | OK |

## Notes

- The card's "Gửi KUDO" button opens a blank compose with no recipient prefill. Accepted deviation: see row 27 and the implementer's report.

## Console, network, logs

- Console: no errors. Non-2xx: none. `logs/api.log` unchanged. `logs/web.log`: no new ERROR, panic or 5xx.

## Fix list

None.

---

## Round 2 (after P7 fix round 1)

**Round 2 verdict: PASS.** The hover card's "Gửi KUDO" now prefills the recipient, and that was the one open deviation on this card. Everything else still passes.

| AC | Round 2 | Evidence |
|----|---------|----------|
| FR-402 card with name, unit, badge, counts | PASS (unchanged) | `r2-hover-card-open-1440x1024.png` |
| "Gửi KUDO" prefill (round 1 deviation) | PASS. Clicking opens the compose window with the recipient combobox holding the hovered Sunner's name ("Lê Kiều Trang"). The field stays changeable (it is a search combobox) | `r2-compose-prefill-1440x1024.png`; e2e test 5 |
| FR-103 avatar click opens profile | PASS (e2e test 14) | e2e log |
| BR-002 anonymous has no card | PASS (e2e test 14) | e2e log |

Command: `npx playwright test e2e/kudos-board.spec.ts e2e/kudos-board-images-and-actions.spec.ts --workers=1`, exit 0, 17 passed.

**Verdict: PASS.** Fix list: none.

