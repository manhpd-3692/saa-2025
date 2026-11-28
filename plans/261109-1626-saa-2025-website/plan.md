---
title: "SAA 2025 website — Next.js 16 frontend + Go API + Supabase"
description: "Build all 12 release-one features (F001–F012) on the decided Next.js/Go/Supabase stack, proving the risky contracts first."
status: in-progress
priority: P1
effort: 132h
branch: main
tags: [feature, frontend, backend, api, auth, database]
work_type: feature
spec_draft: plans/261109-1626-saa-2025-website/spec/
created: 2026-11-10
---

# SAA 2025 website — implementation plan

## Overview

Build the Sun* Annual Awards 2025 site from the approved spec drafts (`spec/`). Next.js 16 App Router at repo root is
frontend only; Go REST API in `backend/` (net/http, pgx + sqlc) owns all reads/writes/authz; Supabase local = Google
OAuth (Go verifies JWT via JWKS), Postgres, Storage. Desktop only (>= 1280 px). Figma `9ypp4enmFmdK3YAFJLIu6C` is
visual reference (read by eye). Precedence: `reports/codex-findings-resolution-contract.md` (+ Addendum N01–N12) →
`spec/gap-resolution-log.md` → feature specs → `docs/SCREENFLOW.md`. Phases cite spec codes; they never re-derive rules.

Strategy (Codex advice): foundation → one thin end-to-end risk path that proves auth, privacy, upload, weighted heart,
box idempotency and moderation versioning on real code → feature phases in the user's order → integration/E2E.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Foundation and bootstrap](./phase-01-foundation-bootstrap.md) | Complete |
| 2 | [End-to-end risk path](./phase-02-end-to-end-risk-path.md) | Complete (bb599fd) |
| 3 | [Auth, app shell, i18n, 403/404](./phase-03-auth-shell-i18n-error-pages.md) | Complete (manual Google sign-in check open) |
| 4 | [Countdown and launch gate](./phase-04-countdown-launch-gate.md) | Complete (ed625fa) |
| 5 | [Homepage, awards, community standards](./phase-05-homepage-awards-community-standards.md) | Complete (0e5bd13) |
| 6 | [Write, edit and send kudos](./phase-06-write-edit-send-kudos.md) | Complete (7a31bbd) |
| 7 | [Kudos live board and detail](./phase-07-kudos-live-board-and-detail.md) | Complete (2f44032) |
| 8 | [Hearts, hero badges, secret box](./phase-08-hearts-hero-badges-secret-box.md) | Complete (a9f3c68; carry-overs open) |
| 9 | [Sunner profiles](./phase-09-sunner-profiles.md) | Complete (8073e25; carry-overs open) |
| 10 | [Notification center](./phase-10-notification-center.md) | Complete (6ea9069; carry-overs open) |
| 11 | [Admin overview and users](./phase-11-admin-overview-and-users.md) | Complete (7e263ad; carry-overs open) |
| 12 | [Admin kudo moderation](./phase-12-admin-kudo-moderation.md) | Complete (a0d30a9; carry-overs open) |
| 13 | [Admin campaign settings](./phase-13-admin-campaign-settings.md) | Pending |
| 14 | [Final integration, E2E and docs](./phase-14-final-integration-e2e-docs.md) | Pending |

## Features, checklist categories, parallel lanes

| Ph | Features | Course checklist category | Blocked by | May run parallel with |
|----|----------|---------------------------|------------|-----------------------|
| 1 | system, F001/F002 plumbing | (enables all) Đa ngôn ngữ plumbing | — | — |
| 2 | F002, F003, F005, F006, F008, F009, F011, F012 (backend core) | Login, Viết Kudos, Like Kudos, Sun* Kudos | 1 | — |
| 3 | F001, F002 | Login, Đa ngôn ngữ, Homepage SAA (chrome) | 2 | — |
| 4 | F003 | Countdown Prelaunch | 3 | 5 (after P4 step 2), 6, 7 |
| 5 | F004 | Homepage SAA, Hệ thống giải | 3, P4 step 2 | 4, 6, 7 |
| 6 | F005 | Viết Kudos | 3 | 4, 5, 7 |
| 7 | F006 | Sun* Kudos | 3 | 4, 5, 6 |
| 8 | F008 | Like Kudos (+ outside: hero, box) | 6, 7 (shared shell files) | 10 |
| 9 | F007 | outside (profiles) | 8 | 10, 11 |
| 10 | F009 | outside (notifications) | 3 | 4–9, 11 |
| 11 | F010 | outside (admin) | 8 (tier/box reads) | 9, 10 |
| 12 | F011 | outside (admin, spam overlay) | 7, 11 | 13 |
| 13 | F012 | outside (admin) — feeds Like Kudos x2 | 11 | 12 |
| 14 | all | all 8 categories | 1–13 | — |

Parallel = disjoint file ownership (each phase lists it). Shared append points avoided by design: one
`backend/cmd/api/wire_<pkg>.go` per Go package, per-feature sqlc query files, per-namespace i18n JSON files.

## Key dependencies

- Local toolchain: Node 20+, Go 1.22+, Docker + Supabase CLI, sqlc, Google OAuth client (company domain).
- All schema lands in Phase 1 (dependency order F002 → F003 → F005 → F012 → F008 → F009 → F011); later phases add
  only index migrations if measured need.
- Next.js 16 rules read from `node_modules/next/dist/docs` (proxy.ts, route groups, layouts) via Read/Grep.
- No blocking spec gaps; non-blocking open items are listed per phase and in Phase 14.
