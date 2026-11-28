# Verify: Secret Box, Open Giftbox result (2) (F008, tracker row 41, `docs/figma-refs/user/secret-box-giftbox-2.png`)

**Verdict: FAIL (design vs spec).** Same as row 40. The Figma frame is the closed box under the congratulation heading, with no icon and no collection count. It matches the implementation's 6/6 pending screen. The ordinary reveal shows the icon and the count, as FR-206 and D012 require.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed. Standalone headless Chromium. One box opened (DB 4 → 3 on the second reveal).

## Evidence

- Second ordinary reveal (glow frame while the icon rises, footer 01, "Icon đã sưu tập 4/6"): `plans/261109-1626-saa-2025-website/evidence/screens/secret-box-giftbox-2/viewport.png`
- 6/6 pending screen (matches the Figma frame): `evidence/screens/secret-box-giftbox-3/viewport.png`
- Reference: `docs/figma-refs/user/secret-box-giftbox-2.png`
- Read values: `evidence/p8-capture-results.json` (S8): `collected` "Icon đã sưu tập 4/6", `unopened` "01"

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-206 revealed icon after opening | PASS | Second reveal shows the glow with the icon rising (screenshot taken at the glow) |
| FR-206 collection count | PASS | "Icon đã sưu tập 4/6" |
| FR-404 retry and double click do not spend an extra box | PASS | Double click consumed exactly 1 (S6); e2e test 8 (lost answer, retry) ok in both runs |
| Figma frame content | FAIL | Same as row 40 |

## Visual diff

Same as row 40. The reveal is a glow frame, and the icon appears a moment later (timing-dependent). The Figma frame shows the completion pending layout.

## Fix list

1. Same decision as row 40. No code change until the owner decides.


---

## Round 2 (orchestrator decision: spec wins)

**Final verdict: PASS.** Same decision as row 40. The spec's result frame (revealed icon plus collection count) is implemented and verified. The Figma frame (6/6 pending layout) is an open design item.

Round 2 evidence (`p8-round2.cjs`, live seed, sunner01.demo):
- Second reveal captured: `plans/261109-1626-saa-2025-website/evidence/screens/r2-giftbox-2.png`
- DOM read: `data-picture="revealed"`, `data-icon="REVIVAL"`, footer "Icon đã sưu tập 4/6", one more box spent (DB unopened 4 → 3)

| AC | Round 2 result |
|----|----------------|
| FR-206 revealed icon | PASS |
| FR-206 collection count | PASS (4/6) |
| FR-404 retry and double click spend no extra box | PASS (e2e test "lost answer, retry", both runs ok) |
| Figma `secret-box-giftbox-2.png` layout | Open design item (same as row 40). Not a defect |

Fix list: none. Owner action: decide the Figma frame's meaning (open design item, row 40).
