# Verify: Addlink box "Thêm đường dẫn" (F005, tracker row 19, link popover from toolbar)

**Final verdict (round 2): PASS.** Round 1 was FAIL on L1, now fixed. Validation and insertion work. The "Nội dung" label wraps onto two lines, where the frame `write-kudo-addlink-box.png` keeps it on one. That is a material layout mismatch, and the fix is small.

Viewport: 1440×1024 CSS px, DPR 1, `http://localhost:3000`, VN. Data: `live` seed. Method: headless Chromium via a standalone Playwright script.

## Round 2 (2026-11-28, after fix round 1)

Fix round 1 claimed: link-box label nowrap. Re-run: `round2-visual-fix-checks.cjs` (label measurement) and `compose-states-check.cjs` (addlink items). Screenshot `r2-addlink-box-label.png`.

| Item | Round 1 | Round 2 |
|------|---------|---------|
| L1 "Nội dung" on one line | FAIL (wrapped to "Nội / dung") | PASS. Label height 33 px = 1 line |
| FR-209 insert `example.com/saa` as https link; `javascript:` refused; Hủy inserts nothing | PASS | PASS (2/2 addlink items) |
| FR-203 / SC-004 counter 13/1.000 for "Xem trang SAA" | PASS | PASS |

Logs: `r2-visual.log`, `r2-states.log`. Console: no errors from this box.

**Round 2 verdict: PASS.**

## Defects

| ID | AC | Location | Expected | Actual | Severity |
|----|----|----------|----------|--------|----------|
| L1 | Layout (frame label on one line) | `src/features/kudo-compose/link-box.tsx` (field label "Nội dung") | "Nội dung" on one line, input starts at the frame's column (x 163 of 752) | Label wraps to "Nội / dung"; the label column is narrower than the label text | Low to medium (visual, material layout) |

## Visual diff (`docs/figma-refs/user/write-kudo-addlink-box.png` vs `evidence/screens/write-kudo-addlink-box/vn-1440-addlink-box-invalid.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Heading "Thêm đường dẫn" | bold | identical | OK |
| Label "Nội dung" | one line | wraps to two lines | FAIL (L1) |
| Label "URL" | one line | one line | OK |
| Inputs | white, outlined | white, outlined | OK |
| Buttons Hủy (outlined) and Lưu (gold, link icon) | as frame | as frame | OK |
| Error text | not in frame | red "Hãy nhập một đường dẫn http:// hoặc https:// hợp lệ." under URL, input outlined red | Accepted: spec FR-209 requires URL validation; error shown in the design system colour |
| Popover over dimmed modal | not in frame | dimmed modal behind | OK |

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-209 link box adds a web link into the text | PASS | "example.com/saa" inserted as `href="https://example.com/saa"` on "trang SAA" |
| FR-209 unsafe URL refused | PASS | `javascript:alert(1)` → URL error, link not inserted |
| FR-209 Hủy closes without inserting | PASS | box closed, no link on "bỏ qua" |
| FR-203 link text adds no visible character beyond its text | PASS | "Xem " + "trang SAA" → counter 13/1.000 |
| SC-004 link adjacency | PASS | same counter result as above |

## Console, network, logs

- No new errors from this screen.

## Commands and exit codes

| Command | Exit | Result |
|---------|------|--------|
| `node compose-states-check.cjs` (second run) | 0 | addlink items: 2 passed (`results-states.json`) |

## Fix list

1. (L1) `src/features/kudo-compose/link-box.tsx`: keep "Nội dung" on one line. Expected: label on one line, input column as in the frame (label column ≈ 106 px for the text). Actual: label wraps to "Nội / dung". Fix: add `whitespace-nowrap` to the label, or widen the label column to fit the text. Re-check at 1440 px with the box open.

Evidence: `plans/261109-1626-saa-2025-website/evidence/screens/write-kudo-addlink-box/` (`vn-1440-addlink-box-empty.png`, `vn-1440-addlink-box-invalid.png`).
