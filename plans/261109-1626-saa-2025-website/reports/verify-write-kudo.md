# Verify: Viết Kudo, create window (F005, tracker row 13, U6, `/` + FAB "Viết KUDOS")

**Final verdict (round 2): PASS.** Round 1 was FAIL on M1, now fixed. Every behaviour AC in row 13 passes. Round 1 defect (fixed in round 2): with five images attached the "Image" button dropped onto a second row. The Kudos board check (FR-401, board part) is a dependency on P7 and is not counted against this screen.

Viewport: 1440×1024 CSS px, DPR 1, `http://localhost:3000`, VN (`saa_locale=vi`). Data: `live` seed. Signed in as sunner01.demo (Nguyễn Văn An). Recipient sunner02.demo (Trần Thị Bình, CECV1). Method: headless Chromium driven by a standalone Playwright script. The Playwright MCP profile was held by another Chrome session ("Browser is already in use"), so MCP tools were not used. Session: cookies from `playwright/.auth/user.json`. No Google login.

## Round 2 (2026-11-28, after fix round 1)

Fix round 1 claimed: M1 Image button narrowed to about 95 px and the thumbnail row no-wrap. Re-run with the same scripts. Screenshots carry the `r2-` prefix; round 1 files are kept. Pending uploads cleared with the app's DELETE before and after each run (5 found at start, 0 left at end).

| Item | Round 1 | Round 2 |
|------|---------|---------|
| M1 five thumbs keep Image button on the thumbnail row | FAIL | PASS. Thumb band y 778–858. Image button y 794–842, x 953, w 95, right edge 1049 (content edge 1056). Button is inside the band, same row (`r2-five-thumbs-row.png`) |
| Behaviour ACs (FR-101…210, FR-401 save, FR-402, FR-405, BR-001…004, SC-001, SC-004) | PASS | PASS. `s13-create.cjs`: 20 checks ok, 1 failing (dependency below) |
| FR-401 board visibility | dependency | dependency. `GET /kudos` still 404 (F006, P7 not built) |

Logs: `r2-s13.log` in `evidence/screens/write-kudo-verify-runs/`. Console: only `404 /kudos` and the deliberate `ERR_FAILED`. API log: no new ERROR or WARN lines. Web log: no new ERROR, panic or 5xx lines.

**Round 2 verdict: PASS**, with the FR-401 board part still open until P7 lands. The hint-alignment item stays listed for designer acceptance.

## Defects

| ID | AC | Location | Expected | Actual | Severity |
|----|----|----------|----------|--------|----------|
| M1 | FR-206 (layout, frame `write-kudo.png` shows 5 thumbs) | `src/features/kudo-compose/image-attachment-grid.tsx` (Image add button) | With 5 thumbnails the Image button stays on the thumbnail row (frame: button x 610–708 in a 752 px frame) | Button is 107 px wide (frame 98 px). Five thumbs end at x 937 (content right edge 1056). Button needs 937+16+107 = 1060, so it wraps to y 902 under the thumbs | Medium (visual, material) |

## Visual diff (`docs/figma-refs/user/write-kudo.png` vs `evidence/screens/write-kudo/vn-1440-create.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Modal width | 752 px | 752 px (x 344–1096) | OK |
| Heading, copy, field labels (Người nhận*, Danh hiệu*, Hashtag*, Image) | VN copy | identical | OK |
| Title hint | "Ví dụ…" + "Danh hiệu sẽ hiển thị…" | identical | OK |
| Toolbar (B, I, S, list, link, quote, Tiêu chuẩn cộng đồng) | as frame | identical | OK |
| Counter 0/1.000 | not shown in this frame (shown in variant frames) | shown right-aligned | Accepted: spec E06 requires the counter always |
| Hint "Bạn có thể “@ + tên”…" | centred under editor | left-aligned, counter on the right | Non-material. Matches the variant frames (14/15/21). Listed for designer acceptance |
| Image row with 5 thumbs | button inline (see M1) | button wraps to second row | FAIL (M1) |
| Anonymous checkbox | as frame | identical | OK |
| Hủy / Gửi buttons | 2 buttons, Gửi wide | identical | OK |
| FAB bottom-right above backdrop | not in frame | visible at x 1190–1296 | Accepted deviation (FR-104: FAB stays on full-frame pages; spec does not require hiding it) |

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-101 window opens over the page from the FAB and from the rules panel | PASS | FAB → "Viết KUDOS" opens dialog with heading. FAB → "Thể lệ" opens a panel that has a Viết KUDOS button (`fab-thele-panel.png`) |
| FR-201 recipient by name search, shows name and unit | PASS | "Trần" → option "Trần Thị Bình CECV1". "Nguyễn Văn An" (self) → "Không tìm thấy Sunner phù hợp." |
| FR-202 title required, ≤100 characters, shown as heading | PASS | Empty Gửi → "Hãy nhập danh hiệu cho Kudos." 101 chars typed (no `maxlength` attribute); send refused with "Danh hiệu tối đa 100 ký tự.", POST count 0 (`title-101-refused.png`). Server 422 `too_long` (row 16 API run) |
| FR-203 toolbar, 0/1.000 counter, 1,000 limit | PASS | 6 toolbar buttons and Tiêu chuẩn link. Bold applied. "Xin chào " → 8/1.000 (trailing space trimmed, per R20). 1,001 chars → "1.001/1.000" and "Lời nhắn tối đa 1.000 ký tự." |
| FR-204 @ suggests Sunners and inserts mention | PASS | "@Trần" → suggestion "Trần Thị Bình"; Enter inserts `span[data-type=mention]` "@Trần Thị Bình" (`mention-inserted.png`) |
| FR-205 1–5 hashtags, add disabled at 5, removable | PASS | 5 chips (case variant "E2E SCREEN13 B" merged with "E2E screen13 b"); add disabled at 5; re-enabled after removing one (`hashtags-five.png`) |
| FR-206 up to 5 images, thumbnails, remove, JPEG/PNG/WebP ≤5 MB | PASS (layout M1) | 6th image refused: "Bạn chỉ có thể đính kèm tối đa 5 ảnh JPEG, PNG hoặc WebP, mỗi ảnh không quá 5 MB."; remove → 4 thumbs. `text/plain` refused at pick with the same message, 0 thumbs (`non-image-refused-at-pick.png`). A PNG-labelled file with text bytes is accepted at pick and refused at send: POST 422 `invalid_attachment`, alert "Một trong các ảnh không hợp lệ. Hãy xoá ảnh đó và thử lại.", 0 DB rows (`fake-image-refused-at-send.png`) |
| FR-207 anonymous checkbox | PASS | toggles on/off |
| FR-209 link box present | PASS | "Thêm đường dẫn" opens box with Nội dung and URL. Detail on row 19 |
| FR-210 Tiêu chuẩn cộng đồng link | PASS | href `/community-standards`, target `_blank`; new tab loads "Sun* Annual Awards 2025" |
| FR-401 valid send saves, closes window, confirms; board shows it | PASS (save), DEPENDENCY (board) | POST 201 (kudoId `e0313191-…`), window closed, toast "Gửi Kudos thành công!", DB: 1 kudo row, 1 hashtag link, 1 image. `GET /kudos` → 404: Kudos board (F006, P7) not built, so the board part cannot be checked yet |
| FR-402 failed send keeps input | PASS | Covered on row 16: banner "Gửi Kudos không thành công. Vui lòng thử lại." and typed input kept |
| FR-405 Hủy closes without confirm, unsaved uploads deleted | PASS | Hủy: 0 browser dialogs, window closed, 5 upload `DELETE` → 204 |
| BR-001 cannot pick self | PASS | self absent from list; server `self_kudo` 422 (row 16 API run) |
| BR-002 1–5 hashtags | PASS | 0 hashtags: POST count 0, banner names Hashtag. API: 0 → 422 `required`, 6 → 422 `too_many` |
| BR-003 ≤5 images | PASS | 6th refused in UI; API 6 ids → 422 `invalid_attachment` |
| BR-004 title + text required, text ≤1,000 | PASS | Title required and ≤100 (API 422 `too_long`). Text 1,001 blocked (UI and API `too_long`). Whitespace-only and script-only → API 422 `required` |
| SC-001 valid payload creates one kudo with hashtag links, image rows, attached uploads | PASS | DB after send: 1 `kudos` row, 1 `kudo_hashtags`, 1 `kudo_images`. The e2e spec covers the attached state |
| SC-004 sanitizer and length boundaries (UI side) | PASS | 1,001 blocked (UI). 1,000 accepted (row 14 run and e2e DB length check `1000`). Formatting adds no characters (row 15) |

## Console, network, logs

- Browser console (create run, all checks): `404 GET /kudos` (board not built), and `net::ERR_FAILED` from the deliberate route abort on row 16 (FR-402 test). Both expected.
- Non-2xx responses: `404 GET /kudos`. Deliberate: `POST /api/v1/kudos` 422 (fake image at send). Deliberate: `POST /api/v1/uploads/kudo-images` 429 (see C1 below; caused by my test volume, not by this screen's normal use).
- `logs/api.log` new lines since baseline (11:57:20, 32 lines): 1 WARN `kudo upload quota reached`, user d000…0001, pending 22. No ERROR, no panic.
- `logs/web.log` new lines since baseline (3474): only `GET /kudos 404`. No ERROR, no 5xx.

## Commands and exit codes

| Command | Exit | Result |
|---------|------|--------|
| `npx playwright test e2e/write-kudo.spec.ts --workers=1` | 0 | 12 passed (36.1 s). Log: `evidence/screens/pw-write-kudo-run.log` |
| `node s13-create.cjs` (standalone, create window checks) | 0 | Script ran to the end. Check results: `evidence/screens/write-kudo-verify-runs/results-s13-s16.json`. Only failing check: FR-401 board visibility (dependency) |
| `node compose-states-check.cjs` (second run) | 0 | Results: `results-states.json`. Its `FR-203/204/206/209 formatted state` item shows `bold=1`, from my script's toggle sequence (not a product result). Counter (`a**b**c` = 3) passed |
| `node api-kudo-checks.cjs` | 0 | All SC-002, SC-003, SC-009, FR-601 checks passed (`api-run.log`). Its JSON save failed (missing path), so results are in the log |

## Concerns and notes

- **C1 Upload quota not in spec (affects rows 13, 14, 15, 20).** `backend/internal/upload/upload_handler.go` line 31: `PendingUploadQuota = 20` pending uploads per Sunner in 24 h (reviewer W2). No spec line defines it. Closing or navigating away from the window without Hủy leaves pending uploads. After 20 the upload returns 429 and the thumbnail shows "Không tải được ảnh. Hãy thử lại hoặc xoá ảnh." with no reason. There is no UI to clear the orphans, so the Sunner is blocked for up to 24 h. My run hit this (22 pending). I cleared my own orphans with the app's `DELETE /api/v1/uploads/{id}` (22 → 204). Decision needed: spec the quota, and/or purge pending uploads on modal unmount.
- **C2 Test debris.** Kudos created by my runs remain in the local DB (no delete in the UI): titles beginning "E2E S13 …", "E2E anon …", "E2E anon2 …", "E2E api … control", and "E2E đã sửa …" (edited by rows 20–21). Also the e2e spec's `E2E …` rows. The API PATCH check (row 21) rewrote the body and hashtags of "E2E api … control" to `<p>x</p>` and `x1` (title kept).
- **C3 Title input has no `maxlength`.** Typing beyond 100 is allowed and the limit is enforced at send. Works, but the counter-style feedback is missing for the title.
- Test images are 1×1 px PNG, so thumbnails render as flat green squares. This is test data, not a defect.

## Fix list

1. (M1) `src/features/kudo-compose/image-attachment-grid.tsx`: the Image add button must fit beside five thumbnails. Expected: at 5 thumbs the button is on the same row (frame: 98 px wide, x 610–708 in the 752 px frame). Actual: 107 px wide, wraps to y 902. Fix: cut the button to ≤98 px (padding or min-width), or tighten the thumbnail gap so 937 + gap + 98 ≤ 1056. Re-check at 1440 with 5 images.

Evidence: `plans/261109-1626-saa-2025-website/evidence/screens/write-kudo/` (`vn-1440-create.png`, `toolbar-and-counter.png`, `mention-inserted.png`, `hashtags-five.png`, `images-five-and-refusal.png`, `non-image-refused-at-pick.png`, `fake-image-refused-at-send.png`, `title-101-refused.png`, `after-send-toast.png`, `fab-thele-panel.png`).
