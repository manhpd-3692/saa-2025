# Verify: Dropdown Level (F010, tracker row 60, `docs/figma-refs/admin/admin-dropdown-level.png`)

**Verdict: FAIL (1 item, shared).** The Level filter returns exactly the users of each hero tier, and it combines with the other filters. The trigger and option labels are English under the Vietnamese locale, the same FR-002 gap as the Overview.

Method: viewport 1440×1024, DPR 1, standalone headless Chromium, admin session, `live` seed (pre-reseed).

## Evidence

- `evidence/screens/admin-dropdown-level/level-open.png` (menu open)
- Figma: `docs/figma-refs/admin/admin-dropdown-level.png` (placeholder "Chọn Level", options "Level 1 / 2 / 3")
- Raw: `evidence/admin-e2e/admin-directory-dropdowns-results.json` (`D3.levelOptions`)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-202 Level dropdown offers the four tiers | PASS | All, New Hero, Rising Hero, Super Hero, Legend Hero (D005) |
| FR-202 each tier filter returns exactly that tier | PASS | Unfiltered tally (25 users): New Hero 13, Rising 1, Super 1, Legend 1, no tier "-" 9. Filtered: 13, 1, 1, 1; every row shows its own tier |
| FR-202 Level + Unit + Role intersection | NOT VERIFIED | Level was tested alone; the three-way combination was not run |
| Users with no tier are not selectable | PASS | No "no tier" option; 9 users show "-" in the column |
| FR-002 trigger and option copy in Vietnamese | FAIL | "Level: Select Level" and options read English under `lang=vi` (see `verify-admin-overview.md` fix 1–2). Figma VN placeholder "Chọn Level" not shown |

## Figma vs spec deviations

| Deviation | Verdict | Reason |
|-----------|---------|--------|
| Options are tier names (New Hero …) not "Level 1 / 2 / 3" | Accept | D005: Level is the hero tier (New, Rising, Super, Legend) |
| Extra "All" option | Accept | Clears the filter; Figma has none |
| Users with no tier (shown "-") cannot be filtered to | Accept | Consistent with D005 (no tier, no level) |

## Fix list (FAIL)

1. Apply the shared Vietnamese copy fixes, including the Level placeholder "Chọn Level" and `vi/admin.json` keys.
2. Add one run that combines Level with Unit and Role (the intersection AC) to the admin E2E spec.


---

## Round 2 (P11 fix round 1)

**Final verdict: PASS.** The shared copy FAIL is fixed. The trigger reads "Chọn Level" in vi, matching the Figma VN frame, and the options are the four tiers.

| Check | vi | en |
|-------|----|----|
| Trigger | Chọn Level | Select Level |
| Options | Tất cả, New Hero, Rising Hero, Super Hero, Legend Hero | All, New Hero, Rising Hero, Super Hero, Legend Hero |

Tier filters were verified in Round 1 (New 13, Rising 1, Super 1, Legend 1). The Level copy stays English in vi, as in the Figma VN frame, which is accepted.

Screenshots: `evidence/screens/admin-dropdown-level/r2-dropdown-level-vi.png`, `r2-dropdown-level-en.png`.

Fix list: none.
