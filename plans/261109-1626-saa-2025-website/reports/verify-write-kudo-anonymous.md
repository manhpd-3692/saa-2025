# Verify: Ẩn danh (F005, tracker row 20, compose-side anonymous send and resulting notification)

**Verdict: PASS, with dependencies.** The compose side works. An anonymous kudo is stored with its sender kept for admins, the recipient's notice carries no sender, and the image key carries no user id. The read-side checks (other Sunners on board, detail and profile) need P7, P9 and P10, which are not built, so they are recorded as dependencies.

Viewport: 1440×1024 CSS px, DPR 1, `http://localhost:3000`, VN. Data: `live` seed. Sender sunner01.demo, recipient sunner02.demo. Method: headless Chromium via a standalone Playwright script, DB reads through the local Supabase container.

## Defects

None in this screen's behaviour. Observation O1 (quota) below affected my first attempt.

## Visual diff (`docs/figma-refs/user/write-kudo-anonymous.png` vs `evidence/screens/write-kudo-anonymous/vn-1440-anonymous-on.png`)

The reference is the kudo card (P7 component, "Người gửi ẩn danh" with an anonymous avatar), not the compose form. It cannot be compared pixel to pixel with this screen. Only the compose-side checkbox state is comparable.

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Anonymous checkbox, checked | brown check on checkbox | brown check, label "Gửi lời cám ơn và ghi nhận ẩn danh" | OK |
| Hint that the name will be hidden | not in frame | none in UI | Spec state `anonymous-on` asks for a hint with wording "to confirm". Listed for product wording decision |
| Anonymous card (sender "Người gửi ẩn danh", anonymous avatar) | in frame | P7 not built | Dependency (P7). Not verified here |

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-207 checkbox sends the kudo anonymously | PASS | checkbox checked; POST 201 in the first states run (`50699678-…`). The second states run was blocked by the upload quota (429, no POST). The clean run after the quota cleanup: POST 201 `0e523e48-0f43-4470-929a-7633f3eb8a0e` |
| FR-404 an anonymous kudo never shows its sender to other Sunners (before and after edit, nor in notification) | PASS at DB level, DEPENDENCY for read APIs | `notifications.params` for the `kudo_received` row = `{}` (no `senderId`, `senderName` or avatar). Board, detail and profile reads are P7/P9 |
| FR-604 nothing returned to other Sunners identifies the author (fields, image URLs, notifications) | PARTIAL | image object path `kudo-images/<uuid>.png`: no user id (R01). Notification params: none. Board, detail and profile DTOs not built |
| BR-005 anonymous hides sender from everyone but admins; system still knows the sender | PASS | DB: `is_anonymous = true`, `sender_id` set (`true|true`) |
| SC-006 one `kudo_received` notification, no sender fields when anonymous; POST 201 | PASS | one row, params `{}`; 201. The stalled-service case (2 s bound) is not exercised in this run |
| SC-007 third-party read of anonymous kudo with images | DEPENDENCY | needs a second Sunner session and the board (P7) |

## Console, network, logs

- The first attempt in this screen hit the upload quota: `POST /api/v1/uploads/kudo-images` → 429 (API log WARN `kudo upload quota reached`, pending 22). The thumbnail showed "Không tải được ảnh. Hãy thử lại hoặc xoá ảnh." and Gửi waited. I cleared my own orphans with the app's DELETE, then reran the send.
- No console errors from the successful run.

## Observations

- **O1 Upload quota blocks uploads (not in spec).** `PendingUploadQuota = 20` pending uploads per Sunner in 24 h (`backend/internal/upload/upload_handler.go` line 31). Abandoned windows keep their pending uploads. There is no UI path to clear them and the thumbnail gives no reason. See `verify-write-kudo.md` C1. Decision needed.

## Commands and exit codes

| Command | Exit | Result |
|---------|------|--------|
| `node anonymous-send-and-edit-check.cjs` | 0 | anonymous send PASS, notification `{}`, image key clean (`results-s20-s21.json`) |
| `node api-kudo-checks.cjs` | 0 | SC-009 own pending → 204 (22 orphans cleared) |

## Fix list

None required for this screen's behaviour.

Open items for the owner:
1. Decide the upload quota policy (O1), and whether the window should purge its own pending uploads on close or navigation.
2. Confirm the anonymous-on hint wording (spec state `anonymous-on`), or drop it.
3. Re-verify FR-404, FR-604 and SC-007 on the board, detail and profile when P7, P9 and P10 land.

Evidence: `plans/261109-1626-saa-2025-website/evidence/screens/write-kudo-anonymous/` (`vn-1440-anonymous-on.png`, `vn-1440-anonymous-sent.png`).
