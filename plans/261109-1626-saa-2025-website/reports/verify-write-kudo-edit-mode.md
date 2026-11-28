# Verify: Màn sửa bài viết, edit mode (F005, tracker row 21, `/?editKudo=<id>`)

**Final verdict (round 2): PASS**, with the spam-refusal dependency (F011) and the F006 entry point still open. Round 1 was FAIL on M2 and M1, both now fixed. The edit flow works end to end: prefill, locked recipient, PATCH save, anonymity redaction of existing notices, and the non-author refusal. Round 1 defects (fixed in round 2): placeholder drawn over prefilled text (M2) and Image button wrap at five thumbs (M1).

Viewport: 1440×1024 CSS px, DPR 1, `http://localhost:3000`, VN. Data: `live` seed. Author sunner01.demo (edits own kudo). Non-author: saa.admin.e2e (admin session). Entry: the detail view (F006, P7) is not built, so I opened the window by URL `/?editKudo=<id>` as the task instructs. Method: headless Chromium via a standalone Playwright script, DB reads through the local Supabase container.

## Round 2 (2026-11-28, after fix round 1)

Fix round 1 claimed: M2 placeholder follows the form value; M1 Image button narrowed. Re-run: `anonymous-send-and-edit-check.cjs` (10/10 ok), `round2-visual-fix-checks.cjs` (M2 check). Screenshots `r2-vn-1440-edit-prefilled.png` and `r2-edit-prefilled-no-placeholder.png`. Pending uploads cleared before and after the run.

| Item | Round 1 | Round 2 |
|------|---------|---------|
| M2 placeholder over prefilled text | FAIL (placeholder `<p>` visible over "sửa bài viết") | PASS. Placeholder elements in the dialog DOM: 0. Editor shows "sửa bài viết" with no overlay (`r2-vn-1440-edit-prefilled.png`) |
| M1 Image button beside 5th thumb | FAIL | PASS by the same component measurement as row 13 round 2 (5 thumbs, button x 953 w 95, inside the thumbnail band). This run has 2 thumbs |
| FR-102, BR-006, FR-403, FR-406, BR-008, SC-008 (unread row), FR-602 non-author, SC-003 | PASS | PASS. Anonymous send PASS; notice `params` `{}` after anonymous save and after named-again save |
| FR-602 spam refusal | dependency | dependency. F011 admin spam action (P12) not built |
| FR-102 entry from the detail view | dependency | dependency. F006 (P7) not built; opened by URL |

Logs: `r2-s20-s21.log`. Admin session: deliberate `403 GET …/edit` ×2 (non-author check). User session: no console errors. API log: no new ERROR or WARN lines.

**Round 2 verdict: PASS**, with the two dependencies above.

## Defects

| ID | AC | Location | Expected | Actual | Severity |
|----|----|----------|----------|--------|----------|
| M2 | FR-102 (pre-filled editor) | `src/features/kudo-compose/rich-text-editor.tsx` lines 67, 71, 95-97 | The placeholder is hidden when the editor holds content | In edit mode the placeholder `<p aria-hidden>` (absolute, `left-6 top-1.5`) stays on top of the prefilled text "sửa bài viết" (`isEmpty` still `true`). The placeholder is removed only after the user types | High (visible text overlap in the main edit window) |
| M1 | Layout (frame shows 5 thumbs inline) | `src/features/kudo-compose/image-attachment-grid.tsx` | Image button beside the 5th thumbnail | Wraps at 5 thumbs (107 px vs 98 px). Not visible with the 2 images in this run, same component | Medium (visual, material) |

Root cause for M2 (hypothesis, to confirm in the fix): the editor is created with `content: value` (line 67). `isEmpty` is read from `useEditorState` (line 71), which updates on editor transactions. Content set at creation fires no transaction, so the flag keeps its initial `true`. Typing triggers `onUpdate`, which is why the placeholder disappears only then.

## Visual diff (`docs/figma-refs/user/write-kudo-edit-mode.png` vs `evidence/screens/write-kudo-edit-mode/vn-1440-edit-prefilled.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Heading "Chỉnh sửa bài viết của bạn" | centred, bold | identical | OK |
| Recipient, locked (no chevron/popover) | "Dương Huỳnh Xuân Nhật B" with chevron | "Trần Thị Bình" with chevron; no popover, no combobox | Locked. Chevron kept in frame look; accepted |
| Editor text | "sửa bài viết" | "sửa bài viết" with placeholder overlay | FAIL (M2) |
| Counter | 0/1.000 | 12/1.000 (counts the text) | Data state; OK |
| Hashtag chips + Hashtag button | 4 chips, button on row 2 | 2 chips, button beside them (seed of this run) | Data difference |
| Image row, 5 thumbs | Image button beside 5th thumb | 2 thumbs here; M1 at 5 | M1 (not triggered in this run) |
| Danh hiệu field | absent in frame | present, prefilled | Accepted: FR-403 says the author can change the title. Frame omits it |
| Nickname ẩn danh field | present in frame | not built | Accepted: not in spec (see row 14) |
| Anonymous checkbox | checked in frame | unchecked (kudo named) | Data state |
| Lưu button with save icon | "Lưu" with save icon | "Lưu" with save icon | OK |
| Banner "Bạn cần điền đủ…" | in frame | not shown in edit flow | Not part of the prefill state |

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-102 window opens pre-filled from the author's own kudo | PASS (via URL) | heading "Chỉnh sửa bài viết của bạn"; title, text, 2 chips, 2 thumbs prefilled; anonymous off; language switch disabled. Entry from the detail view: DEPENDENCY (F006, P7) |
| FR-403 author saves changes; title, text, hashtags, images, anonymity | PASS | PATCH 200; window closed; toast "Đã lưu thay đổi."; DB: title updated, `is_anonymous = true`, 1 image left; the removed upload deleted after commit (not present in `kudo_uploads`) |
| FR-404 anonymous kudo hides sender after edit | PASS (DB) | notice `params` = `{}` after anonymous save |
| FR-406 named → anonymous redacts existing notices; anonymity off does not restore names | PASS | existing `kudo_received` `params` `{}` after anonymous save; after named-again save still `{}`, `is_anonymous = false` |
| FR-602 only the author may edit; refused otherwise | PASS (non-author) | admin session: window shows "Chỉnh sửa bài viết của bạn" with "Bạn chỉ có thể sửa Kudos của chính mình." and only Hủy; `PATCH` 403 `not_kudo_author`; title unchanged |
| FR-602 editing refused while spam-marked | DEPENDENCY | spam flag set by F011 admin moderation (P12), not built |
| BR-006 recipient locked on edit | PASS | no combobox; "Trần Thị Bình" locked; PATCH body with `receiverId` = self ignored, DB receiver unchanged |
| BR-008 named → anonymous redacts sender in existing notices | PASS | as FR-406 |
| SC-003 non-author or unauthenticated edit writes nothing | PASS | non-author PATCH 403; unauthenticated PATCH 401; title unchanged |
| SC-008 named kudo with read and unread notices edited to anonymous | PARTIAL | one unread `kudo_received` row redacted and stays redacted after named save. Read-row variant not exercised |

## Console, network, logs

- Admin session console: `403 GET /api/v1/kudos/<id>/edit` (×2). Deliberate non-author check. Expected.
- User session: no console errors, no non-2xx except the expected PATCH and upload paths noted elsewhere.
- Logs: no new ERROR or panic lines.

## Commands and exit codes

| Command | Exit | Result |
|---------|------|--------|
| `node anonymous-send-and-edit-check.cjs` | 0 | 9 edit-mode items pass; 1 dependency (spam) recorded (`results-s20-s21.json`) |
| `node api-kudo-checks.cjs` | 0 | SC-003 / FR-601 / BR-006 API checks pass |
| `node measure-compose-layout.cjs <id>` | 0 | Image button 107 px, five-thumb wrap confirmed |
| `node probe-edit-placeholder.cjs <id>` | 0 | placeholder `<p>` absolute, visible over prefilled text |

## Fix list

1. (M2) `src/features/kudo-compose/rich-text-editor.tsx`: hide the placeholder when the editor holds content. Expected: no placeholder over the prefilled "sửa bài viết". Actual: `isEmpty` (line 71) stays `true` after content set at creation (line 67). Fix: initialise `isEmpty` from the live editor (for example `editor.isEmpty` read after creation, or re-sync on the editor's `create` and `update` events, or set content via `editor.commands.setContent` with an emitted update). Re-check: open `/?editKudo=<id>` for a kudo with text, placeholder must be absent. Also check an empty new kudo still shows it.
2. (M1) `src/features/kudo-compose/image-attachment-grid.tsx`: keep the Image button beside the 5th thumbnail. Expected: inline (frame). Actual: 107 px button wraps at 5 thumbs. Fix as in `verify-write-kudo.md` M1. Re-check with 5 images in edit mode.

Evidence: `plans/261109-1626-saa-2025-website/evidence/screens/write-kudo-edit-mode/` (`vn-1440-edit-prefilled.png`, `vn-1440-edit-non-author.png`).
