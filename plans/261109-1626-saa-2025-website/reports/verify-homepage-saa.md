# Verify: Homepage SAA (F004, SCR-HomepageSaa, `/`)

**Verdict: FAIL.** The screen matches the reference closely, and the countdown, award links and the e2e homepage tests pass. One acceptance criterion fails: the two Kudos CTAs lead to `/kudos`, which returns 404 because the Kudos board (F006) is not built. The cause is outside Phase 5, but FR-204 and FR-207 are not met in the current build.

Viewport: 1440×1024 CSS px, DPR 1, origin `http://[::1]:3000` for captures and `http://localhost:3000` for hydration checks. Locale VN by `saa_locale=vi`, EN by `saa_locale=en`. Data: `live` (reseeded 2026-11-28 10:24:49, ceremony_at 2026-12-12 10:24:49 +07).

## Defects

| ID | AC | Location | Expected | Actual | Severity |
|---|---|---|---|---|---|
| H1 | FR-204, FR-207 (SC-010 not affected) | `src/features/home/home-hero.tsx:32` (`ABOUT KUDOS`, target `KUDOS_BOARD_PATH` from `src/features/awards/sun-kudos-promo-block`), and the Kudos block "Chi tiết" link `/kudos` | Navigates to the Kudos board | `GET /kudos` → 404 (browser console: two `Failed to load resource ... 404` at `localhost:3000/kudos`). There is no `src/app/(shell)/kudos` route yet | High for this screen, but a dependency: fix when F006 lands. Do not fake the route. |

## Visual diff (reference `docs/figma-refs/user/homepage-saa.png` vs 1440 capture `evidence/screens/homepage-saa/vn-1440-full.png`)

| Element | Reference | Actual | Result |
|---|---|---|---|
| Body background | dark navy | `rgb(0,16,26)` | OK |
| Hero "ROOT FURTHER" key visual | wave art, title left | same layout | OK (raster is a crop with text painted out, accepted) |
| "Coming soon" label | white bold | 24 px, 700, `rgb(255,255,255)` | OK (Figma typo "Comming" not reproduced; accepted) |
| Countdown digits | 20 / 20 / 20 (design sample) | 13 / 23 / 58 (seed `live`) | OK (data, not layout) |
| Event date | 26/12/2026 | 12/12/2026 (seed ceremony_at) | OK (data) |
| Venue | "Âu Cơ Art Center" | "Địa điểm tổ chức (dữ liệu mẫu)" | Data gap: seed placeholder. Real venue not supplied. Acceptable until the real event row is set |
| Livestream note | "Tường thuật trực tiếp qua sóng Livestream" | "Livestream nội bộ cho Sunner ở xa (dữ liệu mẫu)" | Data gap, as above |
| CTA "ABOUT AWARDS" | gold fill, dark text | `rgb(255,234,158)` bg, `rgb(0,16,26)` text, 275×60 | OK |
| CTA "ABOUT KUDOS" | dark outline | `rgba(255,234,158,.1)` bg, white text, 255×60 | OK |
| Section eyebrow + H2 "Hệ thống giải thưởng" | gold H2 | `rgb(255,234,158)` | OK |
| Award grid | 3 × 2 | `336px 336px 336px`, rows at y 2448 and 3056 | OK |
| Award titles and descriptions | per reference | all six match | OK |
| Kudos promo block | heading, copy, "Chi tiết" | matches | OK |
| Footer | links, copyright | matches; "Tiêu chuẩn chung" present, current page not marked | OK (P3 open item, accepted) |
| Dev badge (bottom-left "N") | absent | visible in `next dev` | Not counted (dev-only; check in production build) |

Full-page height 6406 px vs reference 4480 px frame: proportions differ because the reference frame is not the same size. Compared by sections.

## Acceptance criteria

| AC | Result | Evidence |
|---|---|---|
| FR-101 Homepage is the landing page once live | PASS | `/` renders for signed-in user; e2e "live: hero, ceremony countdown..." passed |
| FR-201 hero with Root Further key visual | PASS | snapshot and capture |
| FR-202 countdown to `ceremony_at`, "Coming soon", 00 at zero, no redirect | PASS | displayed 13 d 23 h 58 min; after 60 s it read 13 d 23 h 56 min (ticks). e2e SC-007, SC-008 passed |
| FR-203 event info from event row | PASS (data placeholder) | date, venue, livestream rendered from `/api/v1/events/current` |
| FR-204 "ABOUT AWARDS" → `/awards`; "ABOUT KUDOS" → Kudos board | FAIL (ABOUT KUDOS) | ABOUT AWARDS → `/awards` verified by click; ABOUT KUDOS → `/kudos` 404 (H1) |
| FR-205 long-form theme text | PASS | copy matches |
| FR-206 six cards, image/name/description, "Chi tiết" to `/awards#slug` | PASS | hrefs: `/awards#top-talent`, `#top-project`, `#top-project-leader`, `#best-manager`, `#signature-2025-creator`, `#mvp`. Click on Best Manager → `/awards#best-manager`, card top at 96 px |
| FR-207 Kudos block with "Chi tiết" to board | FAIL | target 404 (H1) |
| FR-403 countdown updates while open | PASS | tick measured |
| FR-601 signed-out redirected to Login | PASS | e2e "signed out, every F004 page goes to Login" passed (on the awards spec; homepage covered by proxy) |
| SC-001 six awards order and values | PASS | matches catalog (see awards report) |
| SC-005 counts to `ceremony_at`, not `start_at` | PASS | target 12/12/2026 |
| SC-007 `live`: renders, counts, no redirect | PASS | e2e passed |
| SC-008 zero boundary and after-ceremony | PASS | e2e passed (both cases) |
| SC-010 event-unavailable fallback with retry | PASS | e2e "no event row" and "stalled event read" passed |
| SC-011 1280 px: desktop layout, horizontal scroll below | PASS | see 1280 check |
| F005 FR-210 | not applicable here | FR-210 is the gift sidebar on `/kudos` (kudos spec), not a homepage requirement. Traceability entry in the brief is wrong |

## English (`saa_locale=en`)

- `<html lang="en">`. Mixed copy: CTAs and card titles stay Vietnamese ("Chi tiết", "Hệ thống giải thưởng"), per the fallback rule (AD04, FR-002).
- Dictionary gaps (`src/i18n/dictionaries/en/home.json` has 6 keys vs 15 in vi): missing `home.event.time`, `home.event.venue`, `home.about.p1..p3`, `home.about.quoteSource`, and others. Listed as open items; not a FAIL.
- Capture: `evidence/screens/homepage-saa/en-1440-full.png`.

## 1280 px

- `innerWidth` 1280, `scrollWidth` 1265 (no overflow on the homepage). Cards 336 px, desktop grid kept. Capture not taken for the homepage at 1280; the e2e SC-011 test covers it.

## Console, network, logs

- Browser console (error level, whole session): 2 messages, both `404 http://localhost:3000/kudos` (H1).
- Web log new lines since baseline (2798): 49 lines, no ERROR, no 5xx. Two `GET /kudos 404`, plus `[countdown] current event unavailable: timeout (status 0)` from the intentional stall test.
- API log new lines since baseline (21): 1 line, `ERROR read current event: timeout: context deadline exceeded` at 10:23:46 from the stalled-event fixture (`e2e/homepage-and-awards.spec.ts:143`, `stallEventsRead`). Expected, intentional fault injection. Not a product defect.

## Commands and exit codes

| Command | Exit | Result |
|---|---|---|
| `powershell.exe -NoProfile -Command "wsl bash -l /mnt/c/.../logs/p4-reseed-live.sh"` (before tests) | 0 | seed applied scenario=live |
| `npm run e2e:session` | 0 | sessions written; admin provision HTTP 200 |
| `npx playwright test e2e/homepage-and-awards.spec.ts e2e/awards-and-community-standards.spec.ts` | 0 | 15 passed (29.3 s); log `evidence/screens/pw-run-1.log` |
| `p4-reseed-live.sh` (after tests) | 0 | seed applied scenario=live |
| `npm run e2e:session` (after tests) | 0 | sessions regenerated |

## Notes

- Session tokens were echoed into the MCP transcript when loading cookies (tool output echo). Local test sessions only; they expire about 2026-12-04. Loader files were deleted.

Evidence: `plans/261109-1626-saa-2025-website/evidence/screens/homepage-saa/` (`vn-1440-full.png`, `en-1440-full.png`).

## Re-verify after fix round 1

Viewport 1440×1024, `http://[::1]:3000/` signed in as the local test user. Data: `live` (Go API: status `active`, startAt 2026-11-27 10:43:09 +07, ceremonyAt 2026-12-12 10:43:09 +07, venue marked as sample data).

**Final verdict: PASS**

Accepted dependency (re-verify when F006 lands): H1 / FR-204 "ABOUT KUDOS" and FR-207 Kudos block "Chi tiết" → `/kudos`. Still 404 for the signed-in user. Recorded per the orchestrator decision, not a FAIL of Phase 5. Do not fake the route.

### Fix round 1 checks

| Item | Result | Evidence |
|---|---|---|
| H1 `/kudos` 404 | Accepted dependency | MCP signed-in `GET /kudos` → HTTP 404, page title "404 · Sun* Annual Awards 2025" |
| Countdown keyed by `serverNow` | PASS | `home-event-panel.tsx:35` `key={event.serverNow}`. Live read: "13 ngày 23 giờ 57 phút" (ticks, not frozen). e2e "refocus re-reads the server clock" passed |
| Countdown vs seed | PASS | Displayed time matches `ceremonyAt` 2026-12-12 10:43:09 +07 at read time |
| ABOUT AWARDS → `/awards` | PASS | link href `/awards`, e2e test 16 passed |

### Visual discrepancies (listed, not hidden)

No new visual discrepancies this round. Carried from round 0 and unchanged: venue and livestream are sample data ("dữ liệu mẫu"), the countdown digits come from the live seed, and the Figma typo "Comming" is not reproduced. Judgment is qualitative (no pixel metric run); no result is called "exact".

Capture: `evidence/screens/homepage-saa/home-vi-round1.png` (full page, 1440).

### Acceptance criteria (every code)

| AC | Result | Evidence |
|---|---|---|
| FR-101 Homepage is landing page once live | PASS | `/` renders signed in; e2e test 10 passed |
| FR-201 hero with Root Further key visual | PASS | carried; capture `home-vi-round1.png` |
| FR-202 countdown to `ceremony_at`, "Coming soon", 00 at zero, no redirect | PASS | ticks; e2e tests 10, 12 passed |
| FR-203 event info from event row | PASS (sample data) | live API |
| FR-204 ABOUT AWARDS → `/awards` | PASS | link verified; e2e test 16 passed |
| FR-204 ABOUT KUDOS → Kudos board | Accepted dependency | H1, re-verify when F006 lands |
| FR-205 long-form theme text | PASS | carried; unchanged |
| FR-206 six cards, "Chi tiết" → `/awards#slug` | PASS | e2e test 16 passed |
| FR-207 Kudos block "Chi tiết" → board | Accepted dependency | H1, re-verify when F006 lands |
| FR-403 countdown updates while open | PASS | tick measured; e2e test 11 passed |
| FR-601 signed-out → Login | PASS | e2e awards test 7 passed (homepage covered by proxy) |
| SC-001 six awards order and values | PASS | e2e awards test 1 passed |
| SC-005 counts to `ceremony_at` | PASS | e2e test 10 passed |
| SC-007 `live` renders, counts, no redirect | PASS | e2e test 10 passed |
| SC-008 zero boundary and after-ceremony | PASS | e2e tests 12, 13 passed |
| SC-009 refocus re-reads server clock | PASS | e2e test 11 passed |
| SC-010 event-unavailable fallback with retry | PASS | e2e tests 14, 15 passed |
| SC-011 1280 px desktop layout | PASS | carried; e2e awards test 9 passed |

### Commands and exit codes

| Command | Exit | Result |
|---|---|---|
| `wc -l logs/api.log logs/web.log` | 0 | baseline api 25, web 2969 |
| `npx playwright test e2e/homepage-and-awards.spec.ts e2e/awards-and-community-standards.spec.ts` (log `evidence/screens/pw-run-round1-1.log`) | 0 | 16 passed (30.1 s). No retry needed |
| `curl http://127.0.0.1:8080/api/v1/events/current` | 0 (HTTP 200) | status `active`, live shape |
| `npm run e2e:session` / reseed | not run | sessions written 2026-11-28 10:39:51 +07, valid to 2026-12-05 03:39 UTC |

### Logs (new since baseline)

- `logs/api.log`: 1 new line, `ERROR read current event: timeout` at 10:43:03. Expected: the stalled-event fixture (`homepage-and-awards.spec.ts:144`). Not a product defect.
- `logs/web.log`: 37 new lines, 0 ERROR. The 404s are `GET /kudos` (accepted dependency) and one `GET /api/v1/events/current` from my own probe on the web port. That route lives on the Go API, so it is not an app defect. Two `[countdown] current event unavailable: timeout` lines come from the intentional stall test.

### Notes

- Same session-echo caveat as the awards report: the local test session was printed into the MCP transcript. Valid to 2026-12-05.
- Blocked: reading `backend/.env` for a direct DB query was refused by the secret guardrail. Not bypassed. The DB state was read via the Go API instead.
- Evidence: `evidence/screens/homepage-saa/home-vi-round1.png`, `evidence/screens/pw-run-round1-1.log`.
