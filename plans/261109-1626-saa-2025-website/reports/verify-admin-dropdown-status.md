# Verify: Admin dropdown - Trạng thái (F011, tracker row 69, `docs/figma-refs/admin/admin-dropdown-status.png`)

**Verdict: FAIL (low, visual).** The filter works and combines with the others. The panel style differs from the frame: the frame shows two bordered boxes, the app a plain list with an extra "Tất cả" item.

Setup: 1440×1024, VN, admin, `live` seed, standalone Chromium.

## Evidence

- Open dropdown: `evidence/screens/admin-dropdown-status/row69-status-open.png`
- Reference: `docs/figma-refs/admin/admin-dropdown-status.png`
- E2E: `evidence/screens/e2e/pw-admin-kudo-moderation-run1.log`, test 3 (ok)
- Live options: "Tất cả", "Public", "Spam" (menu items)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-203 filter to Public or Spam | PASS | e2e 3: `status=spam` ids equal the DB oracle |
| BR-001 | PASS | e2e 3 |
| SC-001 | PASS | e2e 3 |
| Clear back to all | PASS | live: "Tất cả" returns the full list (E04 "none chosen (all)") |

## Visual diff (`admin-dropdown-status.png` vs `row69-status-open.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Option style | two bordered rounded boxes "Public" and "Spam", on a dark panel | plain text rows, no borders | FAIL (low). Expected boxed buttons, actual plain rows |
| Option list | Public, Spam | "Tất cả", Public, Spam | Accepted: "Tất cả" is the all state the spec needs (E04) |
| Trigger | shows "Public" | shows "Chọn trạng thái" placeholder | Accepted: nothing chosen is the default in E04 |

## Accepted deviations

- "Tất cả" option: accepted (E04 default is "none chosen (all)"; the option is the way back).
- Trigger placeholder: accepted.

## Console, network, logs

- No console errors. No 4xx/5xx.

## Fix list

1. The status menu (`src/features/moderation/review-filter-bar.tsx`): style the options as bordered rounded items on the dark panel (`rounded-control`, 1 px border, same padding as the frame's boxes), keeping the keyboard and `menuitemradio` roles unchanged. Expected: as `docs/figma-refs/admin/admin-dropdown-status.png`.
2. Record the "Tất cả" item as accepted in `clarifications.md` (or drop it, but then the filter cannot be cleared from the menu; keeping it is the recommendation).

## Round 2 (fix round 1 re-verify, 2026-11-29)

**Final verdict: PASS.**

- Fix 2 applied: options are boxed rounded items. Live screenshot `evidence/screens/admin-dropdown-status/r2-row69-status-open.png` matches the frame `docs/figma-refs/admin/admin-dropdown-status.png` (three bordered boxes, dark panel).
- "Tất cả" kept as the all state. Accepted (E04 "none chosen (all)").
- Filter behaviour unchanged: e2e test 4 (green in round 2) covers the Spam filter against the DB oracle.
