# Verify: Dropdown Hashtag filter (F006, tracker row 24, `721:5580`)

**Verdict: PASS.** The panel matches the Figma dropdown and the filter narrows and re-ranks as specified.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed. Standalone headless Chromium (MCP profile locked).

## Evidence

- `plans/261109-1626-saa-2025-website/evidence/screens/kudos-dropdown-hashtag-filter/viewport-open-1440x1024.png` (open panel)
- `evidence/screens/kudos-dropdown-hashtag-filter/after-select-1440x1024.png` (after choosing `#high-performing`)
- E2E: `evidence/screens/e2e/pw-kudos-board-run.log` (exit 0, 11 passed; test 2 covers the filter)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-203 hashtag narrows highlights to one hashtag or "all", top 5 ranked inside the set | PASS | e2e test 2. Standalone: `#high-performing` → position "Kudos 1 trên 4" |
| BR-003 filters combine, ranking inside the filtered set | PASS | e2e test 2; with CECV2 also set → "1 trên 2" |
| SC-004 filter reset and clear | PASS | e2e test 2 (clear). "Tất cả" resets |
| US003 choosing "all" clears the filter | PASS | "Tất cả" is the first item; e2e test 2 clears |

## Visual diff (`docs/figma-refs/user/kudos-dropdown-hashtag-filter.png` vs `viewport-open`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Panel: dark surface, gold outline, rounded corners | as frame | identical | OK |
| Option type: bold, cream text | as frame | identical | OK |
| Highlighted (active) option: lighter band | first option highlighted | first option "Tất cả" highlighted | OK |
| Option list | `#Dedicated`, `#Inspring` (frame sample) | `Tất cả`, `#customerfirst`, `#dedication`, `#high-performing`, `#innovation`, `#inspiring`, … | Data. "Tất cả" is needed for US003 and is accepted |
| Trigger button, closed | "Hashtag ▾" | "Hashtag ▾" | OK |

## Console, network, logs

- Console: no errors. Non-2xx: none. `logs/api.log` unchanged. `logs/web.log`: no new ERROR, panic or 5xx.

## Concerns

- Selected-state colours of the trigger are a separate discrepancy and are reported on row 28 (`verify-hashtag-group.md`).

## Fix list

None.

---

## Round 2 (after P7 fix round 1)

**Round 2 verdict: PASS (unchanged).** The e2e run (exit 0, 17 passed) still covers test 2. The selected-state chip changed in fix round 1 and is now verified on row 28 (`verify-hashtag-group.md`, Round 2). The earlier note that the chip colour differed no longer applies.

