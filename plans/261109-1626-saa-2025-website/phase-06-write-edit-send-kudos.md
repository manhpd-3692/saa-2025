# Phase 06 — Write, edit and send kudos (F005)

## Context Links
- F005: `spec/write-edit-and-send-kudos/{functional-spec.md, technical-spec.md}`; screen `SCR-write-kudo-modal`
- Contract: R01–R04, R20; Addendum N01, N02, N05, N07. Decisions: G04, AD05, X01
- Figma: Viết Kudo `520:11602`, variants `828:13433`/`1612:5056`, error `662:13035`, Dropdown người nhận `828:10943`, hashtag list `1002:13013`, Addlink `1002:12917`, Ẩn danh `2099:9148`, edit `1949:13746`
- Built on P2: `backend/internal/kudo/kudo_create_*`, `backend/internal/upload/*`, sanitizer/visible text

## Overview
- Priority: P1. Status: pending. Effort: 14h.
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
- [ ] Install and configure Tiptap (decided P01)
- [ ] User search + hashtags endpoints
- [ ] Edit prefill + PATCH + redaction
- [ ] Upload delete + cleanup + purge command
- [ ] Compose modal UI
- [ ] Shared text vectors
- [ ] Shell wiring + tests

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
| Editor bundle size on board | M | L | Lazy-load modal (`next/dynamic`) |
| Read-before-anonymous leak (RISK-03) | — | — | Known, accepted limitation (R02) |

## Security Considerations
- Go sanitizer is authority (allow-list); client never sends paths, only `uploadId`s (R03). Owner-only edit (FR-602).
- No sender identity in redacted params; anonymous flag honoured on every later read (R02).

## Rollback
- Revert commits; endpoints are additive. Purge command manual-only (no scheduler).

## Next Steps
- Open items: editor library decision; `pg_trgm` need (tech-spec 5.3 #2); compose copy strings read from Figma.
