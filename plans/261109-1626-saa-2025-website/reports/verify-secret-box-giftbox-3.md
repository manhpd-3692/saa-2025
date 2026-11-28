# Verify: Secret Box, Open Giftbox result (3), prize frame (F008, tracker row 42, `docs/figma-refs/user/secret-box-giftbox-3.png`)

**Verdict: PASS with accepted deviation 1.** Figma shows a T-shirt prize ("1 Áo phông SAA") under the congratulation heading. The implementation shows the six-icon completion screen "Trọn bộ 6 icon SAA 2025" with "Phần quà bí ẩn sẽ được trao cho bạn tại SAA 2025." The spec has no prize data. US008 requires a completion message, and D010 says the prize is handed out offline with no claim screen. So the completion screen is the spec-consistent result. The prize artwork is not reproducible from the spec.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed. Reached by a fixture: five distinct icons and 40 unopened, then opened until ROOT_FURTHER (3 opens in this run). Fixture is in `e2e/support/gamification-fixtures.ts` (`resetBoxes` pattern); noted per task.

## Evidence

- 6/6 pending screen: `plans/261109-1626-saa-2025-website/evidence/screens/secret-box-giftbox-3/viewport.png`
- Six-icon list after "Mở phần quà": `evidence/screens/secret-box-standby-3/viewport.png`
- Reference: `docs/figma-refs/user/secret-box-giftbox-3.png`
- Read values: `evidence/p8-capture-results.json` (S10c): `opens` 3, heading "Chúc mừng bạn đã nhận được phần quà từ BTC SAA 2025", list text with "Bạn nhận được icon Root Further."
- DB: `distinctAfter` 6, `completedAt` true, `notificationsAfterCompletion` 1 (S10d)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| US008 holding all 6 shows a completion message | PASS | "Trọn bộ 6 icon SAA 2025" |
| US008 collection shows which icons and how many of 6 | PASS | Six icon circles; "Icon đã sưu tập 6/6" |
| BR-010 / FR-409 completion set once | PASS | `icons_completed_at` set; 1 notification; no second notice after an extra open (S10d) |
| D010 prize handed out offline, no claim screen | PASS | "Phần quà bí ẩn sẽ được trao cho bạn tại SAA 2025." |
| Figma prize artwork (T-shirt) | Accepted deviation 1 | Spec has no prize data |

## Visual diff

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Heading "Chúc mừng … BTC SAA 2025" | as frame | same | OK |
| Picture | T-shirt on the pedestal | six icon circles on the pedestal | Accepted deviation 1 |
| Caption | "1 Áo phông SAA" | "Trọn bộ 6 icon SAA 2025" and the line on prize pickup | Accepted deviation 1 |

## Fix list

None for this row. Prize artwork and names would need spec data first.
