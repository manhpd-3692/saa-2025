# Verify: Dropdown phòng ban / Unit (F010, tracker row 59, `docs/figma-refs/admin/admin-dropdown-department.png`)

**Verdict: FAIL (1 item, shared).** The Unit filter lists every unit, narrows the list correctly, and combines with Role. The trigger label and option copy stay English in Vietnamese, the same FR-002 gap as the Overview.

Method: viewport 1440×1024, DPR 1, standalone headless Chromium, admin session, `live` seed (pre-reseed). DB read with read-only `psql`.

## Evidence

- `evidence/screens/admin-dropdown-department/unit-open.png` (menu open)
- Figma: `docs/figma-refs/admin/admin-dropdown-department.png` (placeholder "Chọn phòng ban", options CECV1–CECV4)
- Raw: `evidence/admin-e2e/admin-directory-dropdowns-results.json` (`D2.*`, `D4.*`)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| US005 Unit dropdown lists every unit | PASS | Options: All, CECV1, CECV2, CECV3, CECV4, CECV5 (Figma shows four; the seed has five units) |
| US005 Unit filter narrows the list | PASS | CECV1 → 5 rows; DB CECV1 users = 5 |
| FR-202 Unit + Role together | PASS | CECV1 + Admin → 0 (DB 0); CECV1 + User → 5 (DB 5) |
| FR-202 clearing back to All | PASS | Reset returns to unfiltered page 1 (20 rows) |
| Users without unit not selectable (edge case) | PASS | The admin with no unit is not offered as a unit choice; they appear only under All |
| FR-002 trigger and option copy in Vietnamese | FAIL | Trigger label "Unit: Select unit" and options come from the same English-valued dictionary (see `verify-admin-overview.md` fix 1–2). The Figma VN placeholder "Chọn phòng ban" is not shown |

## Figma vs spec deviations

| Deviation | Verdict | Reason |
|-----------|---------|--------|
| Extra "All" option at the top | Accept | Clears the unit filter; Figma has none |
| Five units listed, Figma shows four | Accept | Data-driven; the design shows a sample of four |
| Option order CECV1…CECV5 | Accept | Matches Figma order |

## Fix list (FAIL)

1. Apply the shared Vietnamese copy fixes: placeholder "Chọn phòng ban" for the Unit trigger (Figma VN) and the `vi/admin.json` label keys.


---

## Round 2 (P11 fix round 1)

**Final verdict: PASS.** The shared copy FAIL is fixed. The trigger reads "Chọn phòng ban" in vi, matching the Figma VN frame.

| Check | vi | en |
|-------|----|----|
| Trigger | Chọn phòng ban | Select unit |
| Options | Tất cả, CECV1–CECV5 | All, CECV1–CECV5 |
| CECV1 filter | 5 rows (DB 5) | 5 rows (DB 5) |
| CECV1 + Role Admin | 0 rows (DB 0) | 0 rows (DB 0) |

The extra "All" option is accepted as in Round 1.

Screenshots: `evidence/screens/admin-dropdown-department/r2-dropdown-department-vi.png`, `r2-dropdown-department-en.png`.

Fix list: none.
