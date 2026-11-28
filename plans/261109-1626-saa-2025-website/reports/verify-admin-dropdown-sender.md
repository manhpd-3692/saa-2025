# Verify: Admin dropdown - Người đã gửi (F011, tracker row 67, `docs/figma-refs/admin/admin-dropdown-sender.png`)

**Verdict: FAIL (low, visual).** The behaviour is right. The avatars differ from the frame: the frame shows photos, the app shows letter discs. That needs a fix or an explicit acceptance.

Setup: 1440×1024, VN, admin, `live` seed (`/admin/review?page=2`), standalone Chromium.

## Evidence

- Open dropdown: `evidence/screens/admin-dropdown-sender/row67-sender-open.png`
- Reference: `docs/figma-refs/admin/admin-dropdown-sender.png`
- E2E: `evidence/screens/e2e/pw-admin-kudo-moderation-run1.log`, test 3 (ok)
- Live: 20 options, sorted by name, first five "Bùi Thanh Nam", "Đặng Mai Linh", "Đinh Quang Huy", "Đỗ Hoàng Hiệp", "Dương Thùy An"

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-201 lists only people who sent a kudo | PASS | e2e 3: names equal the DB oracle (`peopleNames('sender_id')`) |
| BR-009 | PASS | e2e 3 |
| SC-002 | PASS | e2e 3 (picking Nguyễn Văn An gives `sender=` and the matching ids) |
| Search narrows the list | PASS | e2e 3 (combobox "Tìm theo tên hoặc email") |
| Unit code under the name | PASS | live: "CECV5", "CECV4" shown under names |

## Visual diff (`admin-dropdown-sender.png` vs `row67-sender-open.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Avatar | round photo | round disc with letter initial | FAIL (low). Expected photo, actual initials |
| Name and unit line | name over unit code | name over unit code | OK |
| Panel | dark, bordered, highlighted first row | dark, bordered, search field on top, "Tất cả" first | Accepted: the search field and "Tất cả" are needed by FR-201 and E04 |
| Trigger | "Chọn Sender" | "Chọn người gửi" | Accepted: vi copy |

## Accepted deviations

- Search field and "Tất cả" item: accepted (needed by the spec).
- vi copy in the trigger: accepted.

## Console, network, logs

- No console errors. No 4xx/5xx on the people request.

## Fix list

1. `src/features/moderation/review-people-select.tsx`: when a user has an avatar image, show it in the option (the same avatar used on kudo cards). Keep the initial disc as the fallback only when there is no image. Expected: photo, as in `docs/figma-refs/admin/admin-dropdown-sender.png`. Actual now: initials disc for every user.
2. Data question: the `live` seed may have no avatar images for these users. If so, either seed avatars or record in `clarifications.md` that initial discs are accepted for this screen. Decide, then re-run `p12-capture.cjs` and re-compare.

## Round 2 (fix round 1 re-verify, 2026-11-29)

**Final verdict: PASS (data-driven visual state).**

- Fix 1 applied: a stored photo shows, initials are the fallback. Proven by e2e test 3 ("a Sender / Receiver option shows the Sunner's avatar photo, the initial only without one"), green in the round-2 run (`evidence/screens/e2e/pw-admin-kudo-moderation-r2.log`, 9 passed, exit 0).
- Live: the `live` seed has no avatar photos, so the dropdown shows initials. That is the no-photo fallback, and it is the correct output for this data. Screenshot: `evidence/screens/admin-dropdown-sender/r2-row67-sender-open.png`.
- Not captured live: the photo state. The e2e sets a photo temporarily. The Figma photo look is therefore covered by the assertion, not by a live image. Flagged for the coordinator to accept.
- Options, names (20, sorted), search and unit codes unchanged from round 1.
