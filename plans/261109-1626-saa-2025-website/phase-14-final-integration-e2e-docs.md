# Phase 14 — Final integration, E2E and docs

## Context Links
- Course categories: `docs/SCREENFLOW.md` § Course Checklist Categories; `reports/codex-review-specs-and-plans.md` § Course checklist coverage
- All feature specs (`spec/*/technical-spec.md` § 5.1 Technical Verification)
- Docs rules: `.claude/rules/documentation-management.md`

## Overview
- Priority: P1. Status: pending. Effort: 8h.
- Checklist: all 8 — Login, Homepage SAA, Hệ thống giải, Countdown Prelaunch, Đa ngôn ngữ, Sun* Kudos, Viết Kudos, Like Kudos.
- One E2E evidence run per category with a named fixture, cross-feature regression, performance sanity on aggregate
  reads, copy reconciliation, visual pass at 1280 px, and project docs.

## Key Insights
- Each category needs a fixture + expected result (Codex top-5 #5). Seeds: `prelaunch` (Countdown), `live` (most), `after-ceremony` (Homepage zero).
- Google OAuth runs manually once per day of reporting; automated E2E reuses captured storageState (user + admin accounts).
- Indexes added only if measured need (F006/F007/F010 open items) via a new forward migration.

## Requirements
- Every SC listed in phases 1–13 green in the final code.
- Desktop acceptance at 1280 px; horizontal scroll below (R17).

## Architecture
```
e2e/checklist/<category>.spec.ts  ──► Next (3000) ─► Go (8080) ─► local Supabase
fixtures: SEED_SCENARIO + storageState(user, admin) + seeded x2 campaign
```

## Related Code Files
Create
- `e2e/checklist/{login,homepage-saa,he-thong-giai,countdown-prelaunch,da-ngon-ngu,sun-kudos,viet-kudos,like-kudos}.spec.ts`
- `docs/system-architecture.md`, `docs/code-standards.md`, `docs/development-roadmap.md`, `docs/project-changelog.md` (via `doc-writer`)
- `supabase/migrations/*_performance_indexes.sql` (only if measured need)
Modify: `README.md` (local run: supabase start, seed, go run, npm run dev), dictionaries for confirmed copy (owning phase namespaces)

## Implementation Steps
1. Checklist E2E per category (fixture → steps → expected):
   - Login: company account → `/`; non-company → `domain_not_allowed`; missing profile recovery; admin vs user.
   - Homepage SAA: chrome, ceremony countdown running (`live`), stops at 00 (`after-ceremony`), event fallback.
   - Hệ thống giải: six cards, deep links, scroll-spy, Signature dual prize.
   - Countdown Prelaunch: `prelaunch` gate, 30 s boundary, wrong device clock, exempt Login/callback, no shell.
   - Đa ngôn ngữ: VN/EN on Login + signed-in pages, persistence, fallback, disabled while composing.
   - Sun* Kudos: blocks load/empty/retry, filters, paging, detail link, anonymous payload incl. images.
   - Viết Kudos: files allowed/refused, max five, sanitized content, owner-only edit, retained input, anonymous edit vs notices.
   - Like Kudos: PUT/DELETE persistence, x2 weight across card/detail/ranking, sender denied, campaign failure revert.
2. Full Go suite `go test ./... && go test -tags integration -race ./...`; `npm run lint && npm run build && npm test`.
3. EXPLAIN on board/profile/admin aggregate queries with demo volume; add indexes only if needed.
4. Copy reconciliation: replace "copy to confirm" strings with confirmed text where supplied; list leftovers.
5. Visual pass vs Figma at 1280 px per screen.
6. `doc-writer`: architecture, code standards, roadmap, changelog.
7. `reviewer` on whole diff; `delivery-tracker` updates plan status.

## Todo List
- [ ] 8 checklist E2E specs
- [ ] Full Go + frontend suites
- [ ] Query performance check
- [ ] Copy reconciliation
- [ ] Visual pass
- [ ] Docs
- [ ] Review + status update

## Success Criteria
- All 8 checklist specs green with recorded evidence (screenshots/traces) per category.
- Full suites green; no skipped safety-critical tests.
- Docs reflect final architecture; plan phases marked complete.

## Scope Contract
- Changed: E2E specs, docs, optional index migration, copy.
- Impacted: everything (final gate).
- Will verify: full suites (final release gate; migrations/auth/API contracts are safety-critical → full).
- Deliberately skipped: nothing.

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| storageState tokens expire | H | L | Recapture before run; documented in `e2e/README.md` |
| Late copy changes | M | L | Copy lives in dictionaries; no code change |
| Flaky timing tests | M | M | Fake clocks in Vitest; seeds relative to now; retries off for safety-critical |

## Security Considerations
- Verify no secrets in repo/`.env*` committed; confirm `anon` grants still absent after any index migration.

## Rollback
- E2E/docs additive; index migration reversible by a follow-up drop migration.

## Next Steps
- Release decisions outside specs: hosting target, real `start_at`/`ceremony_at` values, font licence.
