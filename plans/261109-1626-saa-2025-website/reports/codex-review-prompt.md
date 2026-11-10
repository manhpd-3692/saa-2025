You are an independent senior reviewer. Review the SAA 2025 website SPECS and PLANS in this repo. Do NOT edit any existing file. Write your findings to ONE new file only:
`plans/261109-1626-saa-2025-website/reports/codex-review-specs-and-plans.md`

Context
- Project: SAA 2025 website (Sun* Annual Awards 2025, "Root Further"), internal Sun* hands-on course. Repo has only a Next.js 16 scaffold, no app code yet.
- Architecture decided (see decision log): Next.js 16 App Router at repo root = frontend only; Go REST API in `backend/` (net/http, pgx + sqlc) owns all business logic and authorization; Supabase = Google OAuth (Go verifies JWT via JWKS), Postgres, Storage.
- Design source: Figma file 9ypp4enmFmdK3YAFJLIu6C (not accessible to you); screen inventory in `docs/SCREENFLOW.md`.
- Course daily report tracks 8 categories: Login, Homepage SAA, Hệ thống giải, Countdown Prelaunch, Đa ngôn ngữ, Sun* Kudos, Viết Kudos, Like Kudos (see `docs/SCREENFLOW.md` § Course Checklist Categories).

Read
- `docs/SCREENFLOW.md`, `docs/screen-specs/*.md`
- `plans/261109-1626-saa-2025-website/spec/feature-list.md`, `spec/gap-resolution-log.md` (decisions G01–G19 + applied defaults), `spec/system/permissions.md`
- every `plans/261109-1626-saa-2025-website/spec/<feature>/functional-spec.md`, `technical-spec.md`, `screens/*/spec.md` (12 features F001–F012)
- `plans/261109-1626-saa-2025-website/reports/shared-spec-context-for-wave-2.md`
- any `plan.md` / `phase-*.md` under `plans/261109-1626-saa-2025-website/` (an implementation plan may not exist yet — if absent, say so and review readiness for planning instead)

Review for
1. Contradictions between features (data model ownership, table/column names, API paths, status values, heart weighting, anonymous-sender masking, notification kinds, campaign multiplier, countdown start_at vs ceremony_at).
2. Decisions in `gap-resolution-log.md` not reflected (or contradicted) in the specs, and stale leftovers from the pre-Go design (Server Actions, Postgres security-definer RPCs, Next.js talking to the DB).
3. Security / authorization gaps: JWT verification, admin checks on every admin endpoint, company-domain sign-in rule, anonymous sender leaks, RLS defence in depth, file upload (Storage) rules, HTML sanitisation, CSV formula injection.
4. Missing or untestable requirements, ambiguous acceptance criteria, missing error/empty/loading states, edge cases.
5. Coverage of the 8 course checklist categories — anything a grader would expect that is missing.
6. Over-engineering (YAGNI) for a course project, and the riskiest items to build first.

Output format (in the report file)
- Summary verdict (ready / ready with fixes / not ready) in 3–5 lines.
- Findings table: ID | Severity (critical/major/minor) | Feature(s) | File:line | Problem | Suggested fix.
- Cross-feature contract matrix (table/endpoint → owner → consumers) with any mismatches flagged.
- Top 5 fixes to do before writing the implementation plan.
Be specific and cite file paths with line numbers. Do not invent facts not in the files.
