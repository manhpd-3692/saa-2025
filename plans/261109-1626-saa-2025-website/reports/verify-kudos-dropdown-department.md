# Verify: Dropdown Phòng ban (F006, tracker row 25, `721:5684`)

**Verdict: PASS.** The panel matches the Figma dropdown style. The filter uses the receiver's unit (D004) and re-ranks inside the set.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed. Standalone headless Chromium (MCP profile locked).

## Evidence

- `plans/261109-1626-saa-2025-website/evidence/screens/kudos-dropdown-department/viewport-open-1440x1024.png` (open panel)
- `evidence/screens/kudos-dropdown-department/after-select-1440x1024.png` (after choosing CECV2, with the hashtag filter still set)
- E2E: `evidence/screens/e2e/pw-kudos-board-run.log` (exit 0, 11 passed; test 2)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-204 department narrows highlights to one unit or "all" | PASS | e2e test 2. Standalone: CECV2 → button shows "CECV2" |
| D004 filter matches receiver's unit | PASS | e2e test 2 checks receiver unit against DB |
| BR-003 combined filters, ranking inside the set | PASS | Standalone: hashtag + CECV2 → "Kudos 1 trên 2" |
| SC-004 clear and reset | PASS | e2e test 2 |

## Visual diff (`docs/figma-refs/user/kudos-dropdown-department.png` vs `viewport-open`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Panel: dark surface, gold outline, rounded | as frame | identical | OK |
| Option text: bold, white/cream | as frame | identical | OK |
| Highlighted first option | first option lighter | "Tất cả" lighter | OK |
| Option list | CECVC2, CECVC3, CECVC4, CECVC1, OPD, Infra (frame sample) | Tất cả, CECV1 … CECV5 (seed unit codes, list continues) | Data. Accepted |
| Option order | unsorted in frame | sorted in app | Not material |
| Trigger "Phòng ban ▾" | as frame | identical | OK |

## Console, network, logs

- Console: no errors. Non-2xx: none. `logs/api.log` unchanged. `logs/web.log`: no new ERROR, panic or 5xx.

## Fix list

None.

---

## Round 2 (after P7 fix round 1)

**Round 2 verdict: PASS (unchanged).** The e2e run (exit 0, 17 passed) still covers test 2. The round 1 checks still hold on the reseeded data.

