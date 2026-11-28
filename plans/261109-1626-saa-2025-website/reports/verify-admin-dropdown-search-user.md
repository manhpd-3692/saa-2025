# Verify: Dropdown search user (F010, tracker row 58, `docs/figma-refs/admin/admin-dropdown-search-user.png`)

**Verdict: FAIL (1 item, shared).** Suggestions, the minimum length, Enter-to-search, empty state and row-menu navigation all pass. The search placeholder and the surrounding admin copy fail FR-002 in Vietnamese, the same gap as the Overview.

Method: viewport 1440×1024, DPR 1, standalone headless Chromium, admin session, `live` seed (pre-reseed). Dropdown captured through the admin User page.

## Evidence

- `evidence/screens/admin-dropdown-search-user/search-suggest.png` (typed "Ng", suggestions open)
- Figma: `docs/figma-refs/admin/admin-dropdown-search-user.png`
- Raw: `evidence/admin-e2e/admin-verify-results.json` (`A5.suggestMinTwoChars`), `admin-directory-dropdowns-results.json` (`D1.*`, `A5.*`)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-203 suggest appears after 2 characters | PASS | "N" → 0 suggestions; "Ng" → 8 suggestions |
| FR-203 suggestions show avatar, name, email | PASS | Capture: initial avatar, name, email under the name |
| FR-203 Enter searches the typed text | PASS | "Ng" + Enter → 17 rows, every name or email contains "ng" |
| BR-005 search is case-insensitive name or email | PASS | Matches on names such as "Đặng Mai Linh" and emails |
| US005 no match → "no user matches", Clear filters | PASS | `zzzz-no-match` → text and Clear filters link; Clear restores 20 rows |
| FR-205 row menu opens View profile | PASS | Navigates to `/profile/<id>` |
| FR-002 placeholder and copy in Vietnamese | FAIL | Placeholder "Search by name or email" and the admin strings are English in `lang=vi`; see `verify-admin-overview.md` fix 1–2 |

## Figma vs spec deviations

| Deviation | Verdict | Reason |
|-----------|---------|--------|
| Second line is the email, not the unit code (Figma "CECV1") | Accept | Technical spec A5: avatar, name, email |
| Avatar is an initial circle, Figma shows a photo | Accept | Demo users have no avatar image in the `live` seed; the initial circle is the fallback shown when no image exists. Not checked against a user with a real avatar |
| No highlighted first row | Accept | Keyboard-highlight style not in the functional spec |

## Fix list (FAIL)

1. Apply the shared Vietnamese copy fixes (`vi/admin.json`, `vi/shell.json`), including the search placeholder key.


---

## Round 2 (P11 fix round 1)

**Final verdict: PASS.** The shared copy FAIL is fixed. Suggest behaviour is unchanged. The suggest 401 path now goes to Login (spec test passes).

| Check | vi | en |
|-------|----|----|
| Suggest after "Ng" | 8 options; first "Đặng Mai Linh", email as second line | 8 options, same |
| Placeholder | Tìm kiếm | Search |
| Enter searches typed text | Round 1 behaviour, unchanged (17 rows) | same |
| API errors / console | none | none |

Deviation judged: the placeholder is "Tìm kiếm" in vi, while the Figma VN frame shows "Search" in English. FR-002 requires Vietnamese in Vietnamese, so the translation is accepted. Figma shows the unit code as the second line; spec A5 uses the email, which is the shipped behaviour and is accepted.

Screenshots: `evidence/screens/admin-dropdown-search-user/r2-dropdown-search-user-vi.png`, `r2-dropdown-search-user-en.png`.

Fix list: none.
