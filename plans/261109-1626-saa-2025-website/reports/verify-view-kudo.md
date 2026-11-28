# Verify: View Kudo detail (F006, tracker row 23, U7, overlay from board and `/kudos/<id>`)

**Verdict: FAIL.** One defect: the kudo not-found page renders inside the full shell header and footer. Decision C01 in `spec/gap-resolution-log.md` requires 403 and 404 pages to use the minimal frame, and it supersedes the older "shell's not-found page" wording in `SCR-kudo-detail/spec.md`. Everything else on the screen passes.

Viewport 1440×1024 CSS px, DPR 1, `http://localhost:3000`, VN. Data: `live` seed, sunner01.demo. Method: standalone headless Chromium (MCP profile locked). Session cookies from `playwright/.auth/user.json`.

## Evidence

- `plans/261109-1626-saa-2025-website/evidence/screens/view-kudo/overlay-from-board-1440x1024.png`
- `evidence/screens/view-kudo/direct-link-1440x1024.png` (route `/kudos/<id>`, 200)
- `evidence/screens/view-kudo/not-found-1440x1024.png` (made-up UUID, 404)
- E2E: `evidence/screens/e2e/pw-kudos-board-run.log` (exit 0, 11 passed) and `pw-kudos-board-run-2.log` (exit 0, 11 passed)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-102 click card opens detail, Đóng returns to board | PASS | Overlay opened from the board. Esc returned to `/kudos` (standalone). e2e test 5 covers Đóng and Esc |
| FR-104 sender sees edit entry on own kudo | PASS (placement accepted, see D008) | e2e test 9 (pencil on own kudo, none on others). Viewer here is not the sender, so no pencil shown, which is correct |
| FR-401 Copy Link copies the plain address and confirms | PASS | e2e test 6 (clipboard holds the plain address; the link opens the same kudo) |
| FR-404 enlarged card with Copy Link and Đóng | PASS | Overlay and direct page show the same content with Copy Link and Đóng |
| FR-405 missing, non-uuid or someone else's spam kudo shows the same not-found page | FAIL (chrome) | Status 404 and copy "KHÔNG TÌM THẤY / Nội dung bạn tìm không tồn tại hoặc đã bị gỡ bỏ." are right (e2e test 7 passes). Chrome is wrong, see defect D1 |
| BR-006 viewable only if public, sender or admin | PASS | e2e tests 5–7 |
| BR-007 Copy Link is the plain detail address | PASS | e2e test 6 |
| SC-006 not-found for non-viewable kudo | PASS (behaviour), FAIL (chrome) | e2e test 7 |

## Visual diff (`docs/figma-refs/user/view-kudo.png` vs `overlay-from-board-1440x1024.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Overlay width and position | 680 px, centred (x 380–1060) | 680 px, centred (x 380–1060) | OK |
| Header row: avatars, arrow, names, unit codes, badge | as frame | identical structure | OK |
| Badge artwork | "Legend Hero" image | text pill "New Hero" | F008 data, not material |
| Time under header, left-aligned, "HH:mm - MM/dd/yyyy" | as frame | identical format | OK |
| Centred uppercase title | as frame | identical | OK |
| Body box, cream fill, gold outline | as frame | identical | OK |
| Images row | 5 thumbnails | none (seed has no images on this kudo) | Data, not verifiable here (see C1) |
| Hashtags in red | as frame | identical | OK |
| Hearts left, Copy Link and Đóng right | as frame | identical | OK |
| Board dimmed behind overlay | dim | dim | OK |

## Defects

| ID | AC | Location | Expected | Actual | Severity |
|----|----|----------|----------|--------|----------|
| D1 | FR-405, SC-006, decision C01 | `src/app/(shell)/kudos/not-found.tsx` (renders `NotFoundPage` inside the `(shell)` layout) | Minimal frame for 404 (language switch and copyright only, centred 404 block), per C01 and `SCR-error-not-found/spec.md` | Full shell: header with About SAA 2025, Award Information, Sun* Kudos, bell, VN, avatar; footer with Tiêu chuẩn chung and copyright | Medium (chrome, material) |

## Console, network, logs

- Browser console on the 404 page: `Failed to load resource: 404` for the kudo request (expected for a made-up id). No other errors.
- Non-2xx: `404 GET /kudos/00000000-0000-4000-8000-000000000000` only (expected).
- `logs/web.log`: new lines are the 404s for the not-found probes only. No ERROR, panic or 5xx.
- `logs/api.log`: no new lines.

## Concerns and notes

- Spec conflict: `spec/kudos-live-board-and-kudo-detail/screens/SCR-kudo-detail/spec.md` says "the shell's not-found page" (lines 92 and 107). C01 (later row, "latest rows win") says minimal chrome. This report applies C01. The orchestrator should confirm, or amend the screen spec.
- D008 (edit entry placement): the Figma frame for an anonymous kudo puts the pencil in the title row, not next to Đóng. Accepted: the design is the placement authority for the visual, and FR-104 (an entry on the detail view) is met. Spec D008 should be updated to match.
- C1 image row on this kudo could not be checked: the seed has no `kudo_images`.

## Fix list

1. D1 (`src/app/(shell)/kudos/not-found.tsx`): the kudo 404 must use the minimal frame (C01). Expected: centred 404 block with the minimal header (language switch, copyright only) and no shell nav or footer. Actual: full shell chrome. Options: move the kudo detail route so its not-found falls through to the root minimal `src/app/not-found.tsx`, or give the not-found its own minimal layout. Keep the detail itself inside the shell. Keep status 404 and the copy. Re-run `e2e/kudos-board.spec.ts` (test 7) and re-check at 1440×1024.

---

## Round 2 (after P7 fix round 1)

**Round 2 verdict: PASS.** D1 (kudo 404 chrome) is fixed. Every AC on this screen now passes. No open defects.

| Command | Exit | Result |
|---------|------|--------|
| `npx playwright test e2e/kudos-board.spec.ts e2e/kudos-board-images-and-actions.spec.ts --workers=1` | 0 | 17 passed (test 13 now asserts the 404 in minimal chrome) |

| AC | Round 1 | Round 2 | Evidence |
|----|---------|---------|----------|
| FR-405 not-found, chrome | FAIL (shell chrome) | PASS. Status 404. Page shows the minimal frame: language switch VN and the copyright line only. No About SAA, Award Information or Sun* Kudos nav (C01). Copy "KHÔNG TÌM THẤY / Nội dung bạn tìm không tồn tại hoặc đã bị gỡ bỏ." | `r2-view-kudo-not-found-1440x1024.png` |
| SC-006 | PASS behaviour, FAIL chrome | PASS | e2e test 13 |
| FR-404 detail with images | PASS (no images on seed) | PASS. Direct `/kudos/<id>` for the 5-image named kudo: 200, 5 thumbnails in DB order. Anonymous 3-image kudo: 200, no sender in markup, no edit pencil for a non-sender | `r2-view-kudo-direct-a1118ef7-1440x1024.png`, `r2-view-kudo-direct-e81077ea-1440x1024.png` |
| FR-102, FR-401, BR-006, BR-007 | PASS | PASS (e2e tests 11, 12, 13) | e2e log |
| FR-104 edit entry | PASS (placement accepted) | PASS (e2e test 15). Pencil only for the sender | e2e log |
| Image row in detail | NOT VERIFIED | PASS (images in DB order, matching the Figma thumbnail row) | `r2-view-kudo-direct-a1118ef7-1440x1024.png` |

Logs: no new ERROR, WARN or panic lines in `logs/api.log`. `logs/web.log`: expected 404s only.

**Verdict: PASS.** Only the D008 placement note remains, which is accepted and should go into the spec.

