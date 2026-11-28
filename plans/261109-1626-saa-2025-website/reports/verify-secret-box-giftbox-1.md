# Verify: Secret Box, Open Giftbox result (1) (F008, tracker row 40, `docs/figma-refs/user/secret-box-giftbox-1.png`)

**Verdict: FAIL (design vs spec).** The Figma frame shows "Chúc mừng bạn đã nhận được phần quà từ BTC SAA 2025" over a closed box, with no icon and no collection count. Spec FR-206 and D012 say the result frame shows the revealed icon and the collection count. The implementation follows the spec for the ordinary reveal. Its 6/6 pending screen matches this Figma frame exactly. The reveal does not match. No code change is recommended. The owner must decide whether the Figma frame is the reveal or the completion pending screen.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed. Standalone headless Chromium. One box opened (DB 5 → 4).

## Evidence

- Ordinary reveal (REVIVAL, footer 04, "Icon đã sưu tập 3/6"): `plans/261109-1626-saa-2025-website/evidence/screens/secret-box-giftbox-1/viewport.png`
- 6/6 pending screen (matches the Figma frame): `evidence/screens/secret-box-giftbox-3/viewport.png`
- Reference: `docs/figma-refs/user/secret-box-giftbox-1.png`
- Read values: `evidence/p8-capture-results.json` (S5 `revealedIcon` "REVIVAL", facts `collected` "Icon đã sưu tập 3/6", `dbDistinct` 3)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-206 after opening, window shows the revealed icon | PASS | REVIVAL revealed (`data-picture="revealed"`) |
| FR-206 shows how many of 6 icons the Sunner has | PASS | "Icon đã sưu tập 3/6" equals DB distinct 3 |
| FR-404 one icon per open, box not reusable | PASS | Count 5 → 4 |
| D012 result frame = icon revealed and collection updated | PASS | As above |
| Figma frame content (closed box, congratulation heading, no icon, no footer) | FAIL | Not the reveal layout |

## Visual diff

| Element | Reference | Actual (reveal) | Actual (6/6 pending) | Result |
|---------|-----------|-----------------|----------------------|--------|
| Heading | "Chúc mừng bạn đã nhận được phần quà từ BTC SAA 2025" | "KHÁM PHÁ SECRET BOX CỦA BẠN" | same congratulation heading | Matches only the pending screen |
| Picture | closed box, no icon | REVIVAL icon rising out of the box | closed box | Matches only the pending screen |
| Footer | none | "Secretbox chưa mở 04" and "Icon đã sưu tập 3/6" | none visible | Matches only the pending screen |

## Fix list

1. Owner decides which frame Figma `secret-box-giftbox-1` represents. (a) If it is the 6/6 pending screen, update the Figma frame or the tracker row so it is not compared to the reveal, and close this row. (b) If it is the reveal, the spec FR-206/D012 must change first, because the reveal would then hide the icon. Do not change the code until that is decided.


---

## Round 2 (orchestrator decision: spec wins)

**Final verdict: PASS.** Per the orchestrator decision (source order: contract → gap log → spec → Figma), spec FR-206 and D012 win. The result frame shows the revealed icon and the collection count, and the implementation does that.

**Open design item (not a defect):** Figma `secret-box-giftbox-1.png` shows the 6/6 pending layout (congratulation heading over a closed box, no icon, no collection count). The implementation's pending screen matches that frame exactly. Designers should update this frame or mark it as the completion-pending screen.

Round 2 evidence (`p8-round2.cjs`, live seed, sunner01.demo):
- Reveal captured: `plans/261109-1626-saa-2025-website/evidence/screens/r2-giftbox-1.png`
- DOM read: `data-picture="revealed"`, `data-icon="STAY_GOLD"`, footer "Icon đã sưu tập 4/6", one box spent (DB unopened 5 → 4)

| AC | Round 2 result |
|----|----------------|
| FR-206 revealed icon after opening | PASS |
| FR-206 collection count of 6 | PASS (4/6) |
| FR-404 one box per open | PASS |
| D012 result frame = icon revealed, collection updated | PASS |
| Figma frame layout (pending screen) | Open design item (above). Not a defect |

Fix list: none. Owner action: decide the Figma frame's meaning (open design item).
