# Phase 02 — End-to-end risk path

## Context Links
- Codex advice: `reports/codex-review-specs-and-plans.md` (last section "highest-risk first build"); `reports/codex-rereview-specs.md` § Verdict
- Contract: R01–R03, R09–R13, R20–R23; Addendum N01, N03–N05, N07–N09, N12
- F002: `spec/google-sign-in-session-and-roles/technical-spec.md` A2, A3, A5, A6, A8, A9
- F003: `spec/event-countdown-and-launch-gate/technical-spec.md` A3
- F005: `spec/write-edit-and-send-kudos/technical-spec.md` A4, A5, ALG-001..003
- F006: `spec/kudos-live-board-and-kudo-detail/technical-spec.md` A7, § 4.2 KudoCard DTO
- F008: `spec/hearts-hero-badges-and-secret-box/technical-spec.md` A1, A2, A4 (pure tier), A6, ALG-001..004
- F009: `spec/notification-center/technical-spec.md` A1; F011: `spec/admin-kudo-moderation/technical-spec.md` A3, A4, ALG-001

## Overview
- Priority: P1. Status: pending. Effort: 16h.
- Features: F002, F003, F005, F006, F008, F009, F011, F012 (backend cores). Checklist: Login, Viết Kudos, Like Kudos, Sun* Kudos.
- Prove the contracts on real, final code before any polish: Google sign-in → provision → read event → create
  anonymous kudo with validated image → third-user read (masked) → heart under x2 campaign → box grant → idempotent
  open → Spam/Public versioned decision → notifications. Minimal unstyled UI (Login + callback only); everything else
  driven by Go integration tests and one browser transport smoke.

## Key Insights
- Code written here is the production code; feature phases extend these packages, they do not rewrite them.
- Global lock order kudo row → receiver `users` row (N05). F005 create locks receiver only; F011 locks kudo then receiver.
- Barrier-style concurrency tests use test-held row locks (`select … for update` in a test tx) + goroutines; no test-only seams in production code.
- Injected interfaces that production already needs (`CampaignReader`, `Notifier`, `ObjectStore`) let tests force failures/stalls.
- Campaign rows for the x2 path come from test fixtures/seed; admin CRUD UI is Phase 13.

## Requirements
- F002: FR-001, FR-102, FR-401, FR-404, FR-601–FR-605, BR-001–BR-003, INT-001; SC-001, SC-002, SC-007, SC-009, SC-011, SC-012, SC-013; R22, N06 (recovery helper).
- F003: FR-001, FR-402, FR-601 (`GET /api/v1/events/current` → `{id,name,startAt,ceremonyAt,venue,livestreamNote,serverNow,status}`).
- F005: FR-001, FR-003, FR-206, FR-401, FR-603, FR-604, BR-001–BR-005, BR-007, ALG-001 (sanitize), ALG-002 (visible text, N07), ALG-003 (tier transition, R10/N04); SC-001, SC-002, SC-004, SC-005, SC-006, SC-007, SC-010.
- F006: A7 detail read + `maskSender` + KudoCard DTO (R15), INT-001 signed image URLs (opaque keys, R01).
- F008: FR-401–FR-404, FR-409, BR-001–BR-004, BR-006–BR-008, ALG-001..004; SC-001–SC-007, SC-009–SC-014.
- F009: A1 `NotificationService.Create` (seven kinds, dedupe, `for share` + strip, detached 2 s ctx); SC-001–SC-004, SC-010, SC-011, SC-014.
- F011: A3/A4 decisions only, ALG-001 (versioned CAS, R13, C03/N08); SC-003–SC-006, SC-009–SC-013.

## Architecture
```
Login(btn) ─Supabase PKCE─► /auth/callback (route.ts) ─ exchange ─► POST /me/provision (IDENTITY)
proxy.ts: refresh cookies + sign-in redirect (gate added P4)
POST /uploads/kudo-images → signed upload URL (opaque key) → browser PUT to Storage
POST /kudos ─tx: lock receiver → tier before/after → insert kudo/images/tags → finalize uploads (meta+512B sniff)
            └─ post-commit (detached 2 s): Notifier.kudo_received, hero_level_up
GET  /kudos/{id} → KudoReadService → maskSender → KudoCard
PUT/DELETE /kudos/{id}/heart ─tx: campaign lookup (error→500 rollback) → weight → high-water box grant (lock sender)
POST /me/secret-boxes/open (Idempotency-Key) ─tx: lock user → replay stored open_result | draw → icons_completed once
POST /admin/kudos/{id}/spam|public {expectedVersion} ─tx: lock kudo → lock receiver → CAS → notice after commit
```

## Related Code Files
Create (backend)
- `backend/internal/auth/{me_handler.go, profile_service.go}`; `backend/cmd/api/wire_auth.go`; extend `backend/db/queries/auth.sql` (`UpsertProfileOnSignIn`, `GetMe`)
- `backend/internal/events/{events_handler.go, event_service.go}`; `backend/cmd/api/wire_events.go`; `backend/db/queries/events.sql`
- `backend/internal/upload/{upload_handler.go, attachment_finalizer.go, image_magic_sniff.go, storage_object_store.go}`; `backend/cmd/api/wire_upload.go`; `backend/db/queries/uploads.sql`
- `backend/internal/kudo/{kudo_create_handler.go, kudo_create_service.go, html_sanitizer.go, visible_text.go, hero_transition.go, mask_sender.go, kudo_card_dto.go, kudo_read_service.go, kudo_detail_handler.go}`; `backend/cmd/api/wire_kudo.go`; `backend/db/queries/kudo_write.sql`, `kudo_read.sql`
- `backend/internal/gamification/{heart_handler.go, heart_service.go, campaign_reader.go, box_grant.go, hero_tier.go, secret_box_open_handler.go, secret_box_service.go}`; `backend/cmd/api/wire_gamification.go`; `backend/db/queries/gamification.sql`
- `backend/internal/notification/{notification_service.go, notification_kinds.go}`; `backend/db/queries/notifications.sql`
- `backend/internal/moderation/{moderation_decision_handler.go, moderation_service.go}`; `backend/cmd/api/wire_moderation.go`; `backend/db/queries/moderation.sql`
- Tests: `*_test.go` (unit) and `*_integration_test.go` (`//go:build integration`) beside each file
Create (frontend)
- `src/app/(minimal)/login/page.tsx`, `src/features/auth/google-sign-in-button.tsx`
- `src/app/auth/callback/route.ts` (code exchange, domain fast-path, safe `next`, provision call)
- `src/proxy.ts` (session refresh + sign-in redirect + exempt `/login`, `/countdown`, `/auth/callback`; keep signed-in user on `/login?error=…`)
- `src/lib/api/profile-recovery.ts` (403 `profile_not_provisioned` → provision once), `src/features/auth/profile-recovery-redirect.tsx` (N06)
- `playwright.config.ts`, `e2e/browser-transport-smoke.spec.ts`, `e2e/README.md` (storageState capture via one manual Google login)
Modify: `package.json` (`@playwright/test`, script `test:e2e`)

## Implementation Steps
1. Auth: provision (verified email, provider google, `@sun-asterisk.com` case-insensitive, C06 claim locations checked against a real local token), `ADMIN_EMAILS` role on insert only, `last_login_at`; `/me`.
2. Events handler (PUBLIC) with `serverNow` + derived `status`; assembled-router route-class test (F002 SC-013).
3. Upload: signed upload URL (no upsert), `kudo_uploads` pending row; finalizer reads Storage metadata + first 512 bytes, owner/state checks, 0–5 files → 422 `invalid_attachment`.
4. Sanitizer (Go allow-list) + visible text (N07) + 1,000 code point rule; create tx with receiver lock and tier transition; post-commit notifier calls.
5. KudoCard DTO + `maskSender` + detail read with signed read URLs; anonymous card carries no stable author id (R01).
6. Notification service: kinds allow-list, unread-merge dedupe, permanent once-ever kinds (`on conflict do nothing`), `for share` on kudo then strip sender if anonymous.
7. Hearts: PUT/DELETE idempotent setter, sender 403, spam 409, campaign lookup inside tx (error → 500 `campaign_lookup_failed`), max multiplier, high-water `floor(sum/5)` grant under sender lock.
8. Box open: Idempotency-Key required (400), user lock, replay stored `open_result` byte-for-byte, uniform draw, `icons_completed_at` once.
9. Moderation decisions: CAS on `moderation_version`, 409 `stale_decision` with current row, 404 `kudo_not_found`, `kudo_spam_warning` after commit, never tier notices.
10. Frontend: login button, callback, proxy, recovery helpers; Playwright transport smoke (fetch from frontend origin with Bearer for OPTIONS/POST/PATCH/PUT/DELETE).

## Todo List
- [ ] Provision + /me + events
- [ ] Upload URL + finalizer
- [ ] Kudo create (sanitize, visible text, tier transition) + detail read + mask
- [ ] Notification service core
- [ ] Heart PUT/DELETE + campaign lookup + box grant
- [ ] Box open idempotent + completion
- [ ] Moderation spam/public CAS
- [ ] Login/callback/proxy/recovery + transport smoke
- [ ] All SC integration tests green

## Success Criteria (test plan)
- Go unit: sanitizer/visible-text table (F005 SC-004 incl. `<p>a<strong>b</strong>c</p>`=3, 1,000/1,001, emoji, entities, unsafe links); magic sniff; tier map (F008 SC-005); `maskSender`.
- Go integration (real local Postgres + Storage): F002 SC-001/002/007/013; F005 SC-001/002/005/006/007/010; F008 SC-001–004, SC-006/007/009–014; F009 SC-001–004/010/011/014; F011 SC-003–006, SC-009–013.
- Concurrency cases explicitly: two hearts crossing 5 → one box; two concurrent 5th senders → one `hero_level_up`; two concurrent opens to 6 icons → one completion; lost response + same key → one box consumed; opposing stale admin decisions → one wins.
- Manual: real Google sign-in with company account lands on `/` with one `users` row; non-company account → Login `domain_not_allowed`.
- Playwright: browser transport smoke (F002 SC-009).

## Scope Contract
- Changed: Go packages auth, events, upload, kudo (create/detail), gamification (heart/open), notification (create), moderation (decisions); Login, callback, proxy.
- Impacted: every later feature consumes these services/DTOs.
- Will verify: Go unit + integration at service/HTTP level (cheapest layer that can fail on races); one Playwright smoke for CORS. Safety-critical (auth, tokens, data mutations, API contracts) → full.
- Deliberately skipped: visual UI, list/board endpoints, notification read APIs — later phases own them.

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| Google OAuth not automatable in E2E | H | M | Contract load on Go tests with test JWKS; manual Google run; Playwright storageState from one manual login |
| Supabase claim locations differ (C06) | M | M | Inspect a real local token first, adjust extractor |
| Deadlocks in concurrent tx | M | H | Fixed lock order (N05); integration races run with `-race -count=5` |
| Storage metadata API differs locally | M | M | `ObjectStore` interface; integration test against local Storage |

## Security Considerations
- JWT verified on every non-PUBLIC route; role only from `users.role` (R05). No sender identity in anonymous DTO/URL/HTML/notification params (R01, R02/N01).
- Upload keys opaque, write-once; never trust declared MIME/size (R03). Safe `next` param (F002 FR-605).

## Rollback
- Revert phase commits; schema untouched (P1). No data migration involved.

## Next Steps
- Unblocks Phase 3. Open items: Playwright auth strategy = storageState from one manual Google login (decided P02); C06 claim locations.
