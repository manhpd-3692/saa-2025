# Verify: Admin dropdown - Người nhận (F011, tracker row 68, `docs/figma-refs/admin/admin-dropdown-receiver.png`)

**Verdict: FAIL (low, visual).** Same as the sender dropdown: the behaviour is right, but the avatars are letter discs where the frame shows photos.

Setup: 1440×1024, VN, admin, `live` seed (`/admin/review?page=2`), standalone Chromium.

## Evidence

- Open dropdown: `evidence/screens/admin-dropdown-receiver/row68-receiver-open.png`
- Reference: `docs/figma-refs/admin/admin-dropdown-receiver.png`
- E2E: `evidence/screens/e2e/pw-admin-kudo-moderation-run1.log`, test 3 (ok)
- Live: 18 options, sorted by name

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-202 lists only people who received a kudo | PASS | e2e 3: names equal the DB oracle (`peopleNames('receiver_id')`) |
| BR-009 | PASS | e2e 3 |
| SC-002 | PASS | e2e 3 |
| Search narrows the list | PASS | live: search field "Tìm theo tên hoặc email" |

## Visual diff (`admin-dropdown-receiver.png` vs `row68-receiver-open.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Avatar | round photo | round disc with letter initial | FAIL (low). Expected photo, actual initials |
| Panel layout and unit code | as frame | as frame | OK |
| Trigger | "Chọn Receiver" | "Chọn người nhận" | Accepted: vi copy |

## Accepted deviations

- Search field, "Tất cả", vi copy: accepted as in the sender report.

## Console, network, logs

- No console errors. No 4xx/5xx.

## Fix list

1. `src/features/moderation/review-people-select.tsx` (shared with the sender filter): show the user's avatar image when present, initials only as fallback. Re-check both dropdowns together.
2. Same data decision as the sender report: seed avatars, or record the initial-disc decision in `clarifications.md`.

## Round 2 (fix round 1 re-verify, 2026-11-29)

**Final verdict: PASS (data-driven visual state).**

- Fix 1 applied to the shared people select. Photo when stored, initials fallback. Proven by e2e test 3 in the round-2 run (`evidence/screens/e2e/pw-admin-kudo-moderation-r2.log`, 9 passed, exit 0).
- Live: initials only, because the seed has no photos. Screenshot: `evidence/screens/admin-dropdown-receiver/r2-row68-receiver-open.png`.
- Not captured live: the photo state (same as the sender report). Flagged for acceptance.
- 18 names, sorted, search and unit codes unchanged.
