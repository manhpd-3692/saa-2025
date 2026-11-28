# Verify: Viết KUDO, validation error (F005, tracker row 16, `/` + FAB, Gửi with missing fields)

**Verdict: PASS.** The banner copy and position match the frame, the required fields are marked, nothing is sent, and a failed send keeps all typed input. Server-side validation for every broken rule (SC-002, BR-001..004) returns field-level 422 and writes no row.

Viewport: 1440×1024 CSS px, DPR 1, `http://localhost:3000`, VN. Data: `live` seed, sender sunner01.demo. Method: headless Chromium via a standalone Playwright script, plus direct Go API calls with the local test session token (token not printed).

## Defects

None blocking. One observation: in the error state the modal grows past 1024 px, so Hủy and Gửi sit below the fold at 1440×1024 and need scrolling. The frame `write-kudo-validation-error.png` is itself 1116 px tall, so this is consistent with the design. Listed for awareness only.

## Visual diff (`docs/figma-refs/user/write-kudo-validation-error.png` vs `evidence/screens/write-kudo-validation-error/vn-1440-validation-error.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Red banner copy | "Bạn cần điền đủ Người nhận, Lời nhắn gửi và Hashtag để gửi Kudos!" | identical | OK |
| Banner position | red line above the Hủy/Gửi row, below the anonymous checkbox | identical | OK |
| Field error marks | not shown in frame | recipient, title, editor, hashtag outlined red (recipient `rgb(212,39,29)`, `aria-invalid=true`) | Extra: spec FR-208 requires marking the fields |
| Title message "Hãy nhập danh hiệu cho Kudos." | not in frame | shown under Danh hiệu | Accepted: spec FR-202 field message; frame shows only the banner |
| Layout and spacing | frame 752 px wide | 752 px wide | OK |

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-208 missing or invalid required field: nothing saved, error state on those fields | PASS | banner shown; 3 fields `aria-invalid`; 0 `POST /api/v1/kudos` requests |
| FR-402 failed send keeps input, error shown | PASS | route abort on POST: banner "Gửi Kudos không thành công. Vui lòng thử lại."; title, text and hashtag kept (`send-failed-keeps-input.png`) |
| BR-001 cannot send to self | PASS | UI cannot pick self; API `receiverId == sender` → 422 `validation_failed`, field `receiverId`, code `self_kudo`; 0 rows |
| BR-002 1–5 hashtags | PASS | UI: banner names Hashtag. API: 0 → 422 `required`; 6 → 422 `too_many`; 0 rows |
| BR-003 ≤5 images, real type/size | PASS | API: 6 image ids → 422 `invalid_attachment`; unknown upload id → 422 `invalid_attachment`; 0 rows |
| BR-004 title and text required, length | PASS | API: title "   " → 422 `required`; 101 chars → `too_long`; 1,001 chars → `contentHtml too_long`; whitespace-only → `required`; script-only → `required`; 0 rows each |
| SC-002 every broken rule leaves DB unchanged and returns field-level 422 | PASS | 10 API cases, all 422 with a `fields` array, 0 rows; a valid control body returned 201 |

## Console, network, logs

- Browser console: `422 POST /api/v1/kudos` from the deliberate fake-image send (row 13 run), and `ERR_FAILED` from the deliberate abort (FR-402 test). Both expected.
- Network non-2xx: deliberate 422 (fake image) and the aborted POST. No unexpected 4xx or 5xx.
- Logs: no new ERROR lines attributable to this screen.

## Commands and exit codes

| Command | Exit | Result |
|---------|------|--------|
| `node s13-create.cjs` (run includes this screen) | 0 | validation-state items pass (`results-s13-s16.json`) |
| `node api-kudo-checks.cjs` | 0 | 10 SC-002 cases pass (`api-run.log`) |

## Fix list

None required for this screen.

Evidence: `plans/261109-1626-saa-2025-website/evidence/screens/write-kudo-validation-error/` (`vn-1440-validation-error.png`, `send-failed-keeps-input.png`).
