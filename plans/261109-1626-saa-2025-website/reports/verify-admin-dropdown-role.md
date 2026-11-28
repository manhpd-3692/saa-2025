# Verify: Dropdown Role (F010, tracker row 61, `docs/figma-refs/admin/admin-dropdown-role.png`)

**Verdict: FAIL (1 item, shared).** The Role filter offers the right choices, narrows the list correctly, combines with Unit, and the Role column is display-only. The trigger and options are English under the Vietnamese locale, the same FR-002 gap as the Overview.

Method: viewport 1440×1024, DPR 1, standalone headless Chromium, admin session, `live` seed (pre-reseed). DB read with read-only `psql`.

## Evidence

- `evidence/screens/admin-dropdown-role/role-open.png` (menu open)
- Figma: `docs/figma-refs/admin/admin-dropdown-role.png` (placeholder "Chọn Role", options Admin, User)
- Raw: `evidence/admin-e2e/admin-directory-dropdowns-results.json` (`D4.*`)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-202 Role dropdown offers Admin and User | PASS | All, Admin, User |
| FR-202 Role filter narrows the list | PASS | Role = Admin → 1 row (DB: one admin, the SAA Admin E2E user) |
| FR-202 Unit + Role intersection | PASS | CECV1 + Admin → 0 (DB 0); CECV1 + User → 5 (DB 5) |
| FR-206 / US004 Role is text only, no change control | PASS | Table has no select or combobox; the dropdown is a filter only, not a role editor |
| FR-002 trigger and option copy in Vietnamese | FAIL | "Role: Select Role" and options Admin, User render as English under `lang=vi` (see `verify-admin-overview.md` fix 1–2). Figma VN placeholder "Chọn Role" not shown. The Figma reference shows the options as "Admin" and "User" and no VN option copy, so the VN option labels need the copy owner's decision |

## Figma vs spec deviations

| Deviation | Verdict | Reason |
|-----------|---------|--------|
| Extra "All" option | Accept | Clears the filter; Figma has none |
| Role choices only Admin and User | Accept | Matches Figma and the two roles in the permissions spec |

## Fix list (FAIL)

1. Apply the shared Vietnamese copy fixes, including the Role placeholder "Chọn Role" and `vi/admin.json` keys.


---

## Round 2 (P11 fix round 1)

**Final verdict: PASS.** The shared copy FAIL is fixed. The trigger reads "Chọn Role" in vi, matching the Figma VN frame.

| Check | vi | en |
|-------|----|----|
| Trigger | Chọn Role | Select Role |
| Options | Tất cả, Admin, User | All, Admin, User |
| CECV1 + Role Admin | 0 rows (DB 0); empty state "Không có người dùng nào khớp bộ lọc. Xóa bộ lọc" | 0 rows (DB 0); "No user matches your filters. Clear filters" |

"Admin" and "User" stay English in vi, as in the Figma VN frame, so they are accepted.

Correction to Round 1: the Round 1 result of "1 row" for CECV1 + Admin was a counting error on my side. The empty-state placeholder row was counted as a user. The corrected count is 0, which matches the DB.

Screenshots: `evidence/screens/admin-dropdown-role/r2-dropdown-role-vi.png`, `r2-dropdown-role-en.png`.

Fix list: none.
