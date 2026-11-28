# Verify: Dropdown list hashtag (F005, tracker row 18, "+ Hashtag" list)

**Verdict: PASS.** The list offers the shared tags, marks the selected one, adds a new tag by typing, dedupes case-insensitively and ignores the leading #. The search/add box at the top is the known deviation, accepted under FR-205.

Viewport: 1440×1024 CSS px, DPR 1, `http://localhost:3000`, VN. Data: `live` seed, sender sunner01.demo. Method: headless Chromium via a standalone Playwright script.

## Defects

None.

## Visual diff (`docs/figma-refs/user/write-kudo-dropdown-hashtag.png` vs `evidence/screens/write-kudo-dropdown-hashtag/vn-1440-hashtag-list-unfiltered.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Popover style | dark panel, white bold uppercase tags, check icon on selected | dark panel, white bold tags, check icon on selected (`#teamwork`) | OK |
| Selected state | check icon, selected rows shaded | check icon on `#teamwork` (`aria-selected=true`) | OK |
| Search box at top | none in frame | "Tìm hoặc thêm hashtag" input at top | Accepted deviation: FR-205 allows typing a new tag. Listed in the brief |
| Tag case | uppercase in frame | lowercase names (e.g. `#teamwork`) | Non-material: names are lower-cased per D002; frame uses uppercase styling |
| Tag set | frame shows 8 tags | 23 shared tags in the seed (#again, #changed, #customerfirst, ...) | Data difference |

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-002 hashtags are shared tags reused across kudos | PASS | list shows existing tags from DB; a tag created in an earlier window (#e2e-s13-tag) is offered when searching |
| FR-205 pick from dropdown or type a new one | PASS | "#teamwork" picked; "e2e-…" typed and added (row 13) |
| FR-205 remove chip, add disabled at 5 | PASS | verified in row 13 (5 chips, disabled, re-enabled) |
| BR-002 1–5 hashtags, case-insensitive, leading # ignored | PASS | "#E2E Dup" + "e2e dup" → 1 chip (`results-states.json`) |

## Console, network, logs

- No new errors from this screen.

## Commands and exit codes

| Command | Exit | Result |
|---------|------|--------|
| `node compose-states-check.cjs` (second run) | 0 | hashtag items: 2 passed (`results-states.json`) |
| `node capture-hashtag-list-unfiltered.cjs` | 0 | unfiltered list captured with selection state |

## Fix list

None required for this screen.

Evidence: `plans/261109-1626-saa-2025-website/evidence/screens/write-kudo-dropdown-hashtag/` (`vn-1440-hashtag-dropdown.png`, `vn-1440-hashtag-list-unfiltered.png`).
