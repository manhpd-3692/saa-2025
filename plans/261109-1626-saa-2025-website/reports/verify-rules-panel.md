# Verify: Thể lệ rules panel (F008, tracker row 31, `docs/figma-refs/user/rules-panel.png`)

**Verdict: FAIL (minor).** The copy, the three blocks, the four tiers, the six icons and the Đóng / Viết KUDOS buttons all match. At 1440×1024 the two buttons sit below the fold, and the panel only reaches them by scrolling. The Figma frame is taller (about 1410 px), so its buttons sit at the bottom of a taller panel.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed. Standalone headless Chromium.

## Evidence

- Panel, top: `plans/261109-1626-saa-2025-website/evidence/screens/rules-panel/viewport.png`
- Panel, after scroll to buttons: `evidence/screens/rules-panel/bottom-after-scroll.png`
- Read values: `evidence/p8-capture-results.json` (S2), `evidence/p8-motion-panel-results.json` (rulesPanel)
- Layout: panel `scrollHeight` 1395, `clientHeight` 1024, `overflow-y: auto`. Đóng at y 1299 (fold at 1024), Viết KUDOS at y 1299.
- E2E: test 6 "Thể lệ opens from the FAB … Đóng and Esc close it; Viết KUDOS opens the write window" (runs 1 and 2, ok)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-101 opens from the floating button "Thể lệ" choice | PASS | e2e test 6 |
| FR-201 three rule blocks (hero tiers, Secret Box and 6 icons, Kudos Quốc Dân) | PASS | Headings: "NGƯỜI NHẬN KUDOS: HUY HIỆU HERO …", "NGƯỜI GỬI KUDOS: SƯU TẬP TRỌN BỘ 6 ICON …", "KUDOS QUỐC DÂN" |
| FR-201 tier ranges New 1–4, Rising 5–9, Super 10–20, Legend more than 20 | PASS | "Có 1-4", "Có 5-9", "Có 10–20", "Có hơn 20" (copy as in Figma) |
| FR-202 two buttons Đóng and Viết KUDOS | PASS (present) | Both in DOM |
| FR-202 both buttons usable at 1440×1024 without scrolling | FAIL | Buttons at y 1299, fold at 1024; reachable only by scroll |
| FR-103 Viết KUDOS closes the panel and opens the write window | PASS | e2e test 6 |
| US005 Đóng and Esc close it | PASS | e2e test 6 |

## Visual diff (`rules-panel.png` vs `screens/rules-panel/viewport.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Panel position and width | right side, starts x 887 | right side, starts x 887 | OK |
| Title "Thể lệ" in gold | as frame | same | OK |
| Block headings (caps, gold) | as frame | same | OK |
| Tier rows: pill art, range, description | as frame | same, pill art cropped from 1x PNG | OK (deviation 5) |
| Intro and body copy, "❤️" glyphs | as frame | same | OK |
| Six icon circles with labels | as frame | same, icons slightly soft | OK (deviation 5) |
| Footer buttons Đóng / Viết KUDOS | bottom of a ~1410 px panel | below the 1024 fold | FAIL (layout) |
| Dim overlay on the page | as frame | same | OK |

## Fix list

1. Keep the footer actions in view: make the Đóng / Viết KUDOS row `sticky bottom-0` inside the scrolling panel, or tighten vertical spacing so the whole panel fits 1024 px. File: `src/features/gamification/rules-panel.tsx` (and `rules-panel-sections.tsx` if the spacing lives there).
2. Re-run this capture and confirm both buttons are inside the 1024 px viewport without scroll.


---

## Round 2 (P8 fix round 1 re-verify)

**Final verdict: PASS.** The footer with Đóng and Viết KUDOS is pinned and visible at 1440×1024, and the copy and layout still match.

Run: `p8-round2.cjs` (scratchpad), viewport 1440×1024, VN, sunner01.demo, live seed.

| AC | Round 2 result | Evidence |
|----|----------------|----------|
| FR-202 Đóng and Viết KUDOS both in the viewport | PASS | Đóng at y 928, Viết KUDOS at y 928, both fully inside the 1024 px height (`inView` true, true) |
| Body scroll | Not needed at 1024 | Panel `scrollHeight` ≤ `clientHeight` (`scrollable: false`). The panel fits, so the footer never leaves view |
| Footer pinned on scroll | PASS (trivially) | Scroll to `scrollTop` 500 has no effect because the panel does not overflow. The footer stays at y 928 |
| FR-103 / US005 Đóng and Viết KUDOS behaviour | PASS | e2e test (rules panel, both runs ok) |
| Figma `rules-panel.png` | PASS | Copy, tier list, six icons and footer buttons match the frame's layout |

Screenshots: `plans/261109-1626-saa-2025-website/evidence/screens/r2-rules-panel-top.png`, `r2-rules-panel-scrolled.png`.

Limit: only the 1440×1024 viewport was checked. At shorter heights the footer is not guaranteed pinned, because the panel body still scrolls there.

Fix list: none for row 31.
