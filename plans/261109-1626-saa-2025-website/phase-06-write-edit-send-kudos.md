# Phase 06 — Write, edit and send kudos (F005)

## Context Links
- F005: `spec/write-edit-and-send-kudos/{functional-spec.md, technical-spec.md}`; screen `SCR-write-kudo-modal`
- Contract: R01–R04, R20; Addendum N01, N02, N05, N07. Decisions: G04, AD05, X01
- Figma: Viết Kudo `520:11602`, variants `828:13433`/`1612:5056`, error `662:13035`, Dropdown người nhận `828:10943`, hashtag list `1002:13013`, Addlink `1002:12917`, Ẩn danh `2099:9148`, edit `1949:13746`
- Built on P2: `backend/internal/kudo/kudo_create_*`, `backend/internal/upload/*`, sanitizer/visible text

## Overview
- Priority: P1. Status: **complete (7a31bbd, pushed to `feat/saa-screens`)**. Effort: 14h. Delivery below.
- Checklist: **Viết Kudos**.
- Complete F005: recipient search, hashtag list, edit prefill + PATCH (anonymity redaction, upload lifecycle), unsaved
  upload deletion, purge script, and the full compose modal UI (rich text, mentions, links, tags, images, anonymous).

## Key Insights
- Edit holds `for update` on the kudo row; recipient immutable; no edit while spam (BR-006); no receiver lock on edit (N05).
- Turning anonymous on redacts sender keys in that kudo's `notifications.params` in the same tx (R02); never re-add (N01).
- Upload states pending → attached → pending_delete; pending_delete never reusable; post-commit cleanup deletes only pending_delete (N02).
- Client counter mirrors ALG-002 exactly (N07) — shared test vectors in Go and TS.
- Editor library: Tiptap (decided P01, gap-resolution-log; mention + link extensions exist).

## Requirements
- FR-001–FR-003, FR-101, FR-102, FR-201–FR-210, FR-401–FR-406, FR-601–FR-604, BR-001–BR-008, ALG-001–ALG-003, INT-001, INT-002, US001–US008; SC-001–SC-010 (SC-003, SC-008, SC-009 new here; others re-run).
- F001 SC-007 (language switch disabled while modal open, D005).

## Architecture
```
FAB/board CTA → shell-actions.openWriteKudo() → KudoComposeModal (create | edit id)
  RecipientCombobox → GET /api/v1/users/search ; HashtagPicker → GET /api/v1/hashtags
  ImageAttachmentGrid → POST /uploads/kudo-images → PUT Storage ; remove/cancel new → DELETE /uploads/{id}
  RichTextEditor → visibleTextLength (ALG-002 mirror) counter 0/1,000
  submit → POST /kudos | PATCH /kudos/{id} (422 field errors → keep input)
PATCH tx: lock kudo → owner/spam checks → finalize uploads (kept must be attached + referenced) → removed → pending_delete
          → anonymous on → redact notifications.params → commit → delete pending_delete objects (best-effort)
```

## Related Code Files
Create (backend)
- `backend/internal/user/user_search_handler.go`, `backend/db/queries/user_search.sql` (`SearchUsers`)
- `backend/cmd/api/wire_kudo_compose.go` (registers search, hashtags, edit, update, upload delete)
- `backend/internal/kudo/{hashtag_list_handler.go, kudo_edit_handler.go, kudo_update_service.go, notification_redaction.go}`
- `backend/internal/upload/{upload_delete_handler.go, pending_delete_cleanup.go}`
- `backend/cmd/purge-uploads/main.go` (pending > 24 h, leftover pending_delete)
Modify: `backend/db/queries/kudo_write.sql`, `backend/db/queries/uploads.sql` (P7 never touches these)
Create (frontend)
- `src/features/kudo-compose/{kudo-compose-modal.tsx, kudo-compose-form-state.ts, recipient-combobox.tsx, rich-text-editor.tsx, link-box.tsx, visible-text-length.ts, hashtag-picker.tsx, image-attachment-grid.tsx, anonymous-toggle.tsx, kudo-input-schema.ts, kudo-compose-api.ts}`
- `src/i18n/dictionaries/{vi,en}/kudo-compose.json`
- Tests: `src/features/kudo-compose/visible-text-length.test.ts` (shared vectors `backend/internal/kudo/testdata/visible_text_vectors.json`), `kudo-input-schema.test.ts`, `e2e/write-kudo.spec.ts`
Modify: `src/app/(shell)/layout.tsx` (mount modal), `src/components/shell/shell-actions-context.tsx` (register compose + `isComposeOpen`), `src/components/shell/locale-switcher.tsx` (disable while open)

## Implementation Steps
1. User search (debounced, limit `RECIPIENT_SEARCH_LIMIT`, excludes self per BR-001; `ILIKE`, revisit `pg_trgm` only if slow).
2. Hashtag list (normalized lower-case, de-duplicated).
3. Edit prefill (owner only, not spam) + PATCH service per diagram; redaction under kudo lock.
4. DELETE upload (own pending → 204; attached/pending_delete → 409; foreign → 404); post-commit cleanup; purge command.
5. Frontend modal + subcomponents from Figma; error state keeps input; anonymous toggle; edit mode recipient locked.
6. Shared visible-text vectors used by Go and Vitest.
7. Wire FAB + locale switch disable.

## Todo List
- [x] Install and configure Tiptap (decided P01)
- [x] User search + hashtags endpoints
- [x] Edit prefill + PATCH + redaction
- [x] Upload delete + cleanup + purge command
- [x] Compose modal UI
- [x] Shared text vectors
- [x] Shell wiring + tests (e2e 73/73 on final code)

## Success Criteria (test plan)
- Go integration: SC-003 (unauth/non-author/spam edit writes nothing), SC-008 (redaction both notices, off doesn't restore), SC-009 incl. N02 two edits from same stale prefill with cleanup paused, F009 SC-012 sequence (named → anonymous → late insert → named), re-run SC-001/002/004–007/010.
- Vitest: visible-text vectors identical to Go; schema mirrors Go 422 rules.
- Playwright: create named + anonymous kudo with images; sixth image refused; 1,001 chars blocked; failed submit keeps input; edit own kudo; language switch disabled while open (F001 SC-007).

## Scope Contract
- Changed: user/hashtag/edit/update/upload-delete endpoints, purge command, compose UI, shell wiring.
- Impacted: notifications params (redaction), board/detail reads (images), profile lists.
- Will verify: Go integration for data mutations + redaction (safety-critical: data mutations, API contracts → full F005 suite), Vitest for counter parity, Playwright for modal flow.
- Deliberately skipped: board rendering (P7).

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| Counter vs server disagree | M | M | Shared vectors file, both test suites |
| Orphaned uploads (RISK-02) | M | L | Best-effort delete + manual purge (accepted) |
| Editor bundle size on board | M | L | Mitigated: editor lazy-loaded (`next/dynamic`, ssr off); bundle size not measured |
| Read-before-anonymous leak (RISK-03) | — | — | Known, accepted limitation (R02); read-side re-mask question open (carry-over 7) |
| Counter vs server disagree | M | M | Closed: shared vectors in Go and Vitest; review S6 informational only |
| Pending-upload quota blocks compose after abandoned windows (20 per 24 h, no UI to clear) | M | M | Open: product decision, carry-over 1 |

## Security Considerations
- Go sanitizer is authority (allow-list); client never sends paths, only `uploadId`s (R03). Owner-only edit (FR-602).
- No sender identity in redacted params; anonymous flag honoured on every later read (R02).

## Rollback
- Revert commits; endpoints are additive. Purge command manual-only (no scheduler).

## Next Steps
- Closed: editor library (Tiptap 3.33.1 installed); `pg_trgm` not added, user search stays on plain `ILIKE` (tech-spec 5.3 #2, revisit only if slow).
- Closed: compose copy matches Figma (verify visual diffs); VN/EN `kudo-compose.json` keys identical.
- Open items are in Delivery → Open carry-overs.

## Delivery
Commit `7a31bbd` (pushed to `origin/feat/saa-screens`). Screen tracker rows 13–21 Done (PASS, sha `7a31bbd`). Review closed by `reports/reviewer-phase-06.md` recheck 2 (DONE, 0 critical, 0 open warning).

**Done**
- Compose modal (create and edit): recipient search, hashtag list, rich text (Tiptap, lazy-loaded), link box, up to 5 images, anonymous toggle. Hủy and Escape close without confirmation (FR-405).
- Edit flow: prefill, PATCH with anonymity redaction in the same tx (R02, N01), recipient locked (BR-006).
- Upload lifecycle: DELETE and purge claim `pending_delete` under lock, then delete the object, then the row. `backend/cmd/purge-uploads` with `-dry-run`.
- Visible-text counter shares test vectors between Go and Vitest (ALG-002, N07).
- Shell wiring: FAB opens the compose modal; locale switch disabled while open (F001 SC-007, closes P3 carry-over 2).

**Fix rounds per screen** (round 2 verdict PASS on every screen that had one)

| Screen | Fix rounds | Defect fixed |
|---|---|---|
| Viết Kudo (create) | 1 | M1 Image button wrapped at five thumbs |
| Variant 1 | 1 | M1, same |
| Variant 2 | 1 | M1, same |
| Validation error | 0 | — |
| Dropdown người nhận | 0 | — |
| Dropdown hashtag | 0 | — |
| Addlink box | 1 | L1 "Nội dung" label wrapped |
| Ẩn danh | 0 | — |
| Edit mode | 1 | M2 placeholder over prefilled text; M1 Image button |

**Checks on final code** (`7a31bbd`)
- gofmt clean; `go vet` 0; `go test` 0; `go test -tags integration` 0.
- Typecheck 0; lint 0; vitest 303/303 (22 files); `next build` 0.
- Playwright e2e 73/73 (1 worker).
- `-race` not run (no gcc in WSL).

**Review** (`reports/reviewer-phase-06.md`)
- Round 1: 0 critical, 6 warnings (W1–W6), 7 suggestions.
- Recheck 1: W1–W6 closed. W4 closed as won't-fix: FR-405 says Hủy closes without confirmation, and Escape mirrors Hủy. New N1 (row-first delete could orphan an object) closed in recheck 2 by migration `20261128060000_kudo_uploads_unsaved_pending_delete.sql`. N2, N3 fixed.
- Remaining suggestions: S2, S3, S8, S9 (carry-overs 5–6). S6 and S7 are informational. S7: `kudo-compose-form-state.ts` is 191 lines, so split image handling before the next change there.

**Deviations from plan**
- Edit entry is the shell action `runAction("compose", {kudoId})` and the URL `?editKudo=<id>`. P7's detail pencil must call the same action.
- FAB stays visible above the modal backdrop, keeping the P3 FAB test. Frame differs; spec does not require hiding it.
- Danh hiệu field kept in edit mode (FR-403). The frame omits it.
- Figma "Nickname ẩn danh" field not built (not in spec).
- Hashtag dropdown has a search/add box at the top (FR-205).
- Search results include `unitCode` and `unitName`.
- A non-author edit of a spam kudo returns 404.
- One focus line changed in P3 `floating-action-button.tsx` (refocus trigger on close, review W5).
- `e2e/browser-transport-smoke.spec.ts:72` now expects 404 `kudo_not_found` for PATCH (route exists; was 405 before phase 6).
- New migration `20261128060000_kudo_uploads_unsaved_pending_delete.sql` (not in the plan's file list). Cost: relaxes the `kudo_uploads` state constraints under ACCESS EXCLUSIVE on a small table; forward-only.

**Open carry-overs**

| # | Item | Owner | Done when |
|---|------|-------|-----------|
| 1 | Pending upload quota is 20 per 24 h (`backend/internal/upload/upload_handler.go:31`), not in spec. Abandoned windows block compose for up to 24 h with no UI to clear it (hit during verify run) | User (product decision) | Quota written into the spec, or purge-on-close chosen; decision in `clarifications.md`; verify C1 closed |
| 2 | Board part of FR-401; FR-102 entry from detail view; FR-404, FR-604 and SC-007 read side | P7 owner (main agent until P7 starts) | `GET /kudos` returns 200 with the saved kudo; detail pencil calls `runAction("compose", {kudoId})`; read-side e2e passes |
| 3 | FR-602 spam refusal (PATCH on spam kudo → 409); F011 admin spam action not built | P12 owner (F011 admin) | Admin spam action sets the flag; e2e shows the edit refused |
| 4 | Hint alignment: centred in frame 13, left in variants | User (designer acceptance) | Designer accepts left alignment in `clarifications.md`, or implementation is changed to centred |
| 5 | Review S2: client-authored mention text can spoof a name. Review S3: user search lets callers probe email fragments | Main agent (P6 implementer) | Each applied, or closed with reason, in this table |
| 6 | Review S8: `pending_delete` both-or-neither columns check, plus manual rollback note in migration header. Review S9: confirm the migration is applied in CI reset | Main agent (P6 implementer) | Follow-up migration or documented close for S8; CI log shows the migration applied for S9 |
| 7 | Review question: does F009 need a read-side re-mask of sender by current `is_anonymous` (R02 second sentence)? | P10 owner (F009) | F009 spec confirms no read-side mask, or P10 adds it |
| 8 | Go tests leave hashtag rows in the shared table | Main agent (P6 implementer) | Suite cleans up or isolates its rows; two consecutive runs leave the counts unchanged |
| 9 | `-race` not run (no gcc in WSL) | User (host or CI) | `go test -race` passes on a host with gcc, or in CI |
| 10 | SC-008: UI verify exercised one unread notice only; Go integration covers redaction | Main agent | Read-row case added to the edit verify run, or accepted in writing |
| 11 | Verify report headers for edit mode, variant 1, variant 2 and write-kudo still describe the round 1 defect on line 3. Round 2 tables and verdicts say PASS | Main agent (verify report owner) | Line 3 reworded to match the round 2 verdict |
