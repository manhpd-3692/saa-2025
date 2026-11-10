---
passed: true
issues: 0
warnings: 0
---

# Feature List Review (greenfield subset)

File: `spec/feature-list.md` (12 features, F001-F012). Criteria: `verification-checklist-quality-gates.md` § FeatureList.

## Check results

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 1-3 | US/SCR coverage and orphans | - | SKIPPED (no upstream artifacts, greenfield) |
| 4 | F-code uniqueness | critical | PASS. F001-F012 each used once, in table and Feature Details. |
| 5 | Capability intent | pointer | Not evaluated (see code-formats.md). |
| 6 | Clear flow | warning | PASS. Every feature has a trigger and an outcome. |
| 7 | Vague naming | warning | PASS. No standalone generic noun in any name. |
| 8 | Scope overlap >50% | warning | PASS. No pair shares scope. |
| 9 | Grouping coherence | critical | PASS. Every screen set is thematically coherent. |

## Notes

- Check 6: F001-F003 and F005-F012 state an explicit "Flow:". F004 and F010 do not, but both are implicit: F004 is page visit then reading, F010 is filter/date range then table then export. Optional: add a one-line Flow to each.
- Check 7: closest names are F009_Notifications and F012_AdminCampaigns. Each is qualified by domain, and "Center" and "Settings" are not on the generic list.
- Check 8: closest pairs are F010 vs F011 (both admin) and F006 vs F007 (both kudos). They differ in screen sets and outcomes: overview/users vs moderation, board vs profile. F001/F008/F009 boundaries (shell vs overlays vs bell) are stated explicitly in the descriptions.
- Check 9: F001 holds the shell, language switch and error pages, including the profile dropdown that triggers logout. Logout itself sits in F002's description. This is an entry-point vs logic split that the F001 description calls out, not a miscategorization. F008 keeps heart, badge, secret box, Thể lệ panel and Quốc Dân together as one gamification loop. Observation, not a finding: the Homepage countdown block is listed in F004 while the standalone countdown is F003. Clear enough, but the F004 text could say it reuses F003's countdown source.

## Merge/split actions

None required.

## Housekeeping

- Frontmatter and the Cross-Reference Validation checkbox match the verified result.
- Related-artifact fields are `TBD (draft)` as expected pre-promote. Re-run Checks 1-3 once US/SCR artifacts exist.
