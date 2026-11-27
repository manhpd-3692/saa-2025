# Verify: Countdown Prelaunch (F003, SCR-countdown-prelaunch, `/countdown`)

**Verdict: FAIL.** Two acceptance criteria fail: the launch gate skips dotted paths (D1, FR-101) and a device clock step while the tab is visible moves the digits (D2, FR-402 / BR-003). The screen itself matches the reference, and the e2e spec is green on its second run (7/7, exit 0).

Viewport: 1440×1024 CSS px, DPR 1, origin `http://[::1]:3000`. Locale VN by `saa_locale=vi`, EN by `saa_locale=en`. Scenario `prelaunch` for the gate and visual checks, `live` restored at the end.

## Defects

| ID | AC | Location | Expected | Actual | Severity |
|---|---|---|---|---|---|
| D1 | FR-101, SC-001 | `src/lib/events/launch-gate.ts:18`, `STATIC_FILE = /\/[^/]+\.[A-Za-z0-9]+$/` exempts any path whose last segment has a dot | Prelaunch: `/awards/v1.2`, `/kudos/a.b`, `/admin/users.json` → `307 /countdown` | `307 /login?next=…` (gate skipped, the request goes to the sign-in rule) | Medium. No current route has a dot, so there is no live exposure today. The e2e gate test (`e2e/countdown-prelaunch.spec.ts:86`) only uses dot-free paths, so it cannot catch this. Fix: exempt only real static extensions (the proxy matcher already excludes those) and add a dotted-slug case. |
| D2 | FR-402, BR-003 (SC-004 holds for a shift at load) | `src/features/countdown/countdown-clock.ts:33` takes the server offset once; the only resync is on visibility or focus (`launch-countdown.tsx`) | Device clock stepped +3 h while the tab stays visible: hours still read 23 | Hours read 20 at once and stay wrong until refocus. The spec asserts "20" at `countdown-prelaunch.spec.ts:77` before the refocus correction | Medium-low. The spec's edge case says re-check on visible again, so the team may accept this on purpose. BR-003 ("a wrong device clock changes nothing") reads stronger. Needs an explicit decision. |

## Concerns (not counted as FAIL)

- **C1, hand-over lag not asserted.** The offset is anchored at hydration, but `serverNow` was read at render time (`countdown-clock.ts:33`). The countdown and the 0 ms hand-over therefore lag the render-to-hydration gap. The sub-minute e2e test checks only "not earlier than start minus 1 s" (line 144), so a late hand-over passes. Not measured.
- **C2, locale fallback wording.** D004 says "Vietnamese when none", but `get-request-locale` tries Accept-Language before `vi` (F001 BR-001). An English-browser visitor sees EN copy. The code follows F001; align the D004 wording.
- **C3, dev-only indicator.** The Next.js dev badge (bottom-left) is visible in `next dev`. It is not part of the design. Check it is absent in the production build.

## Visual diff (reference PNG 1512×1077 vs implementation 1440×1024)

The reference frame is wider and taller than the viewport, so the comparison uses proportions and sizes in px.

| Element | Reference | Actual (1440×1024) | Result |
|---|---|---|---|
| Background | dark navy, wave art on right | `body` `rgb(0,16,26)` = #00101A. Art is a low-res crop with the gradient baked in | OK (accepted: low-res crop) |
| Title "Sự kiện sẽ bắt đầu sau" | centred, ~423 px wide, 36 px bold white | centred, 423.1 px wide, 36 px 700 Montserrat, white | OK |
| Title vertical position | centre at 31.4% of frame height | centre at 31.5% (322.5 px) | OK (proportional; absolute −15.5 px comes from `29.15vh` at 1024 px high) |
| Digit box size | 77×122 px | 77×123 px | OK (1 px) |
| Gap between digit boxes | 21 px | 21 px | OK |
| Gap between units | ~61 px | 60 px | OK (1 px) |
| Unit group centring | centred on frame | centred (group 397.5 → 1042.5, centre 720) | OK |
| Box top to label centre | 168 px | 168 px | OK |
| Labels DAYS / HOURS / MINUTES | bold uppercase white | 36 px 700 uppercase white, Montserrat | OK |
| Digit glyphs | LED "Digital Numbers" 40×76 | SVG seven-segment 37×74, 6 polygons for "8" | OK (accepted: D008 fallback) |
| Digit box fill | glass gradient, light border | gradient, `backdrop-filter: blur(24.96px)`, gold hairline | OK, qualitative judgment (no pixel metric) |
| Header, footer, nav | none | 0 `header`, 0 `footer`, 0 `nav` | OK |
| Digit values | sample 00 05 20 | live 01 23 57 (data, not a layout defect) | OK |
| Horizontal scroll at 1440 | n/a | `scrollWidth` 1440 = viewport | OK |

## Acceptance criteria

| AC | Result | Proof |
|---|---|---|
| FR-101 pages before start go to countdown | **FAIL (D1)** | PASS for `/`, `/awards`, `/kudos`, `/kudos/new`, `/profile/me`, `/admin`: all `307 /countdown` (curl). FAIL for `/awards/v1.2`, `/kudos/a.b`, `/admin/users.json`: `307 /login?next=…` |
| FR-102 countdown after start goes to Homepage | PASS | live: `GET /countdown` → `307`, `location: /` (`evidence/.../live-redirect-proof.txt`). e2e test 7 |
| FR-103 sign-in, callback, assets stay reachable | PASS | `/login` 200, `/countdown` 200, `/images/countdown/countdown-background.webp` 200, `/favicon.ico` 200, `/auth/callback` not gated (F002 redirect). e2e test 3 |
| FR-201 title and DAYS / HOURS / MINUTES | PASS | VN h1 "Sự kiện sẽ bắt đầu sau"; labels DAYS, HOURS, MINUTES. e2e test 1 |
| FR-202 two digits, leading zero | PASS | `data-value` "01", "23", "57"; two glyph boxes per unit. e2e test 1. Days above 99 widen (unit test, not re-run) |
| FR-203 standalone, no chrome | PASS | 0 header / footer / nav. e2e test 1 |
| FR-204 "Coming soon", no digits, no event row | PASS | e2e test 4 (run 2): `role=status` "Coming soon", 0 `[data-unit]`, 0 h1. Pages load normally |
| FR-401 values refresh on their own | PASS | minutes change after `clock.fastForward` (e2e test 1) |
| FR-402 server clock, not device clock | **FAIL (D2)** | Load-time skew +26 h: correct 01 23 (e2e test 1, PASS). Mid-session +3 h step: hours 23 → 20, stays wrong until refocus (e2e test 2 asserts "20") |
| FR-403 hand-over at start, no full reload | PASS | e2e test 5: `sameDocument` true at 0 ms. Test 6: resync reports active, hand-over with no reload |
| BR-001 launched iff `now >= start_at` | PASS | Go `event_service.go:75` `now.Before(startAt)` → upcoming, else active. Boundary e2e test 5; live status `active` |
| BR-002 days, hours, minutes only, floored | PASS | Two-digit values; spoken "1 day 23 hours 58 minutes" with no seconds. Floor logic in `split-remaining-time.ts` (unit test, not re-run) |
| BR-003 server clock is the reference | **FAIL (D2)** | Holds for a skew present at load. Not for a step during the visible countdown, see D2 |
| SC-003 countdown after start → Homepage, no countdown markup | PASS | `307 /` (curl, live); e2e test 7: `response.text()` has no `data-unit`, page URL `/` |
| SC-004 device clock shifted, digits match server | PASS (load-time) | e2e test 1 (+26 h). Mid-session case covered by D2 |
| SC-005 at 0 ms lands on Homepage without reload | PASS | e2e tests 5 and 6, `sameDocument` true |
| SC-008 launch zero boundary (00 00 00 until 0 ms) | PASS (early side only) | e2e test 5: digits 00 00 00 while `start_at` is 30 s away; redirect not earlier than start minus 1 s. Lateness not asserted, see C1 |
| SC-011 no event row → "Coming soon", pages load | PASS | e2e test 4 (run 2); after the delete, `/` → `307 /login` (fail open) and header visible |
| F001 SC-004 countdown without chrome, client navigation to `/` | PASS | 0 chrome elements; e2e tests 5 and 6 (`sameDocument`) |

Also covered: SC-001, SC-002 (e2e test 3), SC-007 (test 7 plus test 6), SC-009 (tests 2 and 6), SC-010 (test 4, stall: fail open within the 1.5 s deadline, not cached), SC-012 (test 1). Not re-run here: SC-006 Go router test and the Vitest suites, which the implementer ran (see Commands).

## Console, network and logs

- **Browser console (current `/countdown` load, `level=error`):** 0 errors, 0 warnings. The 13 errors earlier in the same MCP session all came from `/some-unknown-url`, a 404 page from an earlier check, not this screen.
- **Network (countdown load, VN and EN):** every request 200 or 304. No 4xx or 5xx. The browser makes no direct call to the events API (the page is server-rendered).
- **`logs/api.log`** (baseline 8 lines): 1 new line, `WARN current event request cancelled by the caller` (the stall test, expected). No ERROR.
- **`logs/web.log`** (baseline 2060 lines, now 2102): 5 new lines, all expected fail-open warnings from the gate or the no-event test: `event_not_found (status 404)` ×4 and `timeout (status 0)` ×1 (the 1.5 s stall). No ERROR, panic or 5xx.

## Commands and exit codes

| Command | Exit | Result |
|---|---|---|
| `wc -l logs/api.log logs/web.log` (baseline) | 0 | 8 and 2060 lines |
| `powershell.exe -NoProfile -Command "wsl bash -l …/p4-reseed-prelaunch.sh"` (first try) | 1 | `WSAETIMEDOUT`, no seed run |
| `wsl -e true` probe (wake, retried) | -1 then 0 | WSL woke, probe healthy |
| `wsl bash -l …/p4-reseed-prelaunch.sh` (retry) | 0 | `SEED_EXIT 0`, `start_at` +2 days |
| `npm run e2e:session` (after prelaunch) | 0 | sessions regenerated |
| `curl` gate probes (`/`, `/awards`, `/kudos`, `/admin`, `/login`, `/countdown`, …) | 0 | statuses as in the AC table |
| `npx playwright test e2e/countdown-prelaunch.spec.ts` (run 1) | 1 | 3 passed, 1 failed, 3 did not run. Failure: `lock session failed … WSL/Service/WSAETIMEDOUT` in `launch-gate-fixtures.ts:65`, the infra fixture, not a product assertion. Log: `evidence/screens/countdown-prelaunch/e2e-countdown-run1.txt` |
| `wsl -e true` probe (before run 2) | 127 then 0 | flapping, then healthy in 1 s |
| `npx playwright test e2e/countdown-prelaunch.spec.ts` (run 2, unchanged) | 0 | 7 passed in 2.4 min. Log: `e2e-countdown-run2.txt` |
| `wsl bash -l …/p4-reseed-live.sh` | 0 | `SEED_EXIT 0`, `start_at` −1 day, `ceremony_at` +14 days |
| `npm run e2e:session` (after live) | 0 | sessions regenerated |
| `curl /countdown` after live | 0 | `307`, `location: /` |

Run 1 wrote no stall lock. Its afterAll restored `live` before run 2, and the DB was verified on `live` after the final restore.

Slow tests (run 2): no event row 1.1 min (lock and wait), live 31.3 s and sub-minute boundary 35.9 s (real clock waits). These are wall-clock waits, not overhead.

## Evidence

- `evidence/screens/countdown-prelaunch/countdown-vi.png`: VN, 1440×1024, `lang=vi`
- `evidence/screens/countdown-prelaunch/countdown-en.png`: EN, same viewport, `lang=en`
- `evidence/screens/countdown-prelaunch/live-redirect-proof.txt`: `307 Location: /` on `live`
- `evidence/screens/countdown-prelaunch/e2e-countdown-run1.txt` (exit 1, infra) and `e2e-countdown-run2.txt` (exit 0)
- `evidence/screens/countdown-prelaunch/session-prelaunch.txt`, `session-live.txt`

## Notes

- The PowerShell tool was not in this session's tool list. The seed ran as `powershell.exe -NoProfile -Command "wsl bash -l …"` from Git Bash, which runs the same WSL command.
- Concerns C1 and C2 are judgments on spec wording and timing. D1 and D2 are the only defects, and both have a concrete expected value above.
- Deliberately skipped: the full repo suite, the Go router test (SC-006), and Vitest. The implementer ran them at exit 0, and the contract excludes them from this run.

## Re-verify after fix round 1

**Final verdict: PASS.** D1 (FR-101, dotted paths) and D2 (FR-402, BR-003, device clock step) are both fixed and proven below. No new defect found. Open items are judgments, not FAILs: C2 (D004 locale wording), C3 (dev-only badge), and the static-file matcher note in "Notes".

Scope: the gate exemption, the clock source, the gate re-read on `/countdown`, and Go logging. The countdown e2e was rerun in full, with a screenshot sanity check and a scoped vitest and Go run. The full repo suite was not rerun.

Viewport 1440×1024 CSS px, DPR 1. Browser `[::1]:3000` for server-rendered checks, `localhost:3000` for the clock-step check (hydration). Prelaunch seeded for every gate and clock check. Live restored at the end.

### Defect status

| ID | Round 0 | Round 1 | Proof |
|---|---|---|---|
| D1 FR-101 dotted paths | FAIL | PASS | curl, anonymous: `/awards/v1.2`, `/kudos/a.b`, `/admin/users.json` each `307 → /countdown` (was `307 /login`). e2e test 3 checks the same paths for anonymous and signed-in visitors |
| D2 FR-402 / BR-003 clock step | FAIL | PASS | e2e test 2 (`setSystemTime` +3 h, one minute of counting): hours stay 23. Manual check on `localhost` with the same step and +60 s: `01 23 59` → `01 23 58`, hours unchanged; refocus re-reads the server: `01 23 59`. The spec now asserts the BR-003 reading, so the earlier "needs a decision" is closed |

### AC table

| AC | Round 0 | Round 1 | Proof (round 1) |
|---|---|---|---|
| FR-101 | FAIL | PASS | D1 row above |
| FR-102 | PASS | PASS | live `/countdown` → `307 /`. e2e test 4 (stale "upcoming" cache: `/countdown` 200, then `/` 307 `/countdown`, then `/countdown` 307 `/`, then `/` 307 `/login`; no loop). e2e test 8 |
| FR-103 | PASS | PASS | `/login` 200, `/countdown` 200, `/favicon.ico` 200, `/images/countdown/countdown-background.webp` 200, `/auth/callback` 307 `/login?error=failed` (not gated). Browser `/login`: every request 200 or 304. e2e test 3 |
| FR-201 | PASS | PASS | VN h1 "Sự kiện sẽ bắt đầu sau", EN "Event will start in"; labels DAYS, HOURS, MINUTES. e2e test 1 |
| FR-202 | PASS | PASS | `data-value` `01` `23` `59`, two glyph boxes per unit. e2e test 1. Days above 99: `split-remaining-time.test.ts` (vitest) |
| FR-203 | PASS | PASS | 0 header, footer or nav. e2e test 1 |
| FR-204 | PASS | PASS | e2e test 5: "Coming soon" status, 0 `[data-unit]`, 0 h1 |
| FR-401 | PASS | PASS | e2e test 1 (`clock.fastForward`, minutes drop by 5) |
| FR-402 | FAIL | PASS | D2 row above |
| FR-403 | PASS | PASS | e2e test 6 `sameDocument` true at hand-over; test 7 |
| BR-001 | PASS | PASS | `event_service.go:75` unchanged (`now.Before(startAt)` → upcoming). e2e test 6 boundary. `go test ./internal/events/...` exit 0 |
| BR-002 | PASS | PASS | `split-remaining-time.test.ts`: floor (59,999 ms reads 00 00 00), days above 99. Vitest 38/38 |
| BR-003 | FAIL | PASS | D2 row above |
| SC-003 | PASS | PASS | live `307 → /`, no `data-unit` in the body. e2e test 8 |
| SC-004 | PASS | PASS | load-time +26 h skew reads 01 23 (e2e test 1). Step during counting: e2e test 2 and the manual check |
| SC-005 | PASS | PASS | e2e test 6: hand-over with `sameDocument` true |
| SC-008 | PASS (early side only) | PASS | e2e test 6 now asserts hand-over in [start_at − 1 s, start_at + 1 s]. The late side (C1) is now asserted |
| SC-011 | PASS | PASS | e2e test 5 (no event row: "Coming soon", pages load, fail-open `307 /login`) |
| F001 SC-004 | PASS | PASS | 0 chrome elements; e2e tests 6 and 7 `sameDocument` |

Also re-passed: SC-007 (tests 4, 7, 8), SC-009 (tests 2, 7), SC-010 (test 5: stall fails open within 1.5 s, not cached), FR-601 (test 3).

### Visual sanity (1440×1024, scenario prelaunch)

- `countdown-vi-round1.png` and `countdown-en-round1.png` in the evidence folder. Saved under new names so the round 0 PNGs stay for comparison.
- Layout, title position, digit boxes, labels, gaps, and 0 header/footer/nav are unchanged from round 0 when compared visually. Only the digit values differ, because the live clock moved on (round 0 `01 23 57`, round 1 `01 23 59`).
- Qualitative judgment only, no pixel metric. Round 0 already accepted the background crop and the digit glyph fallback.

### Console, network and logs

- Browser `/countdown` (VN) and `/login`: `level=error` shows 0 errors. Every `/login` request returned 200 or 304.
- Baseline at the start of this round: `logs/api.log` 13 lines, `logs/web.log` 2312 lines.
- `logs/api.log`: 1 new line, `WARN current event request cancelled by the caller` (the stall test). No ERROR.
- `logs/web.log`: 40 new lines. 3 are `[launch-gate] event lookup failed, letting the request through` (`event_not_found` ×2 for the no-event test, `timeout` ×1 for the 1.5 s stall). These are expected fail-open warnings. The rest are request logs (200, 307, and a 404 for my `/images/nope.png` probe). No 5xx, no ERROR, no panic.
- The `/images/nope.png` and `/_next/static/nonexistent.js` 404s are Next's own responses for missing files, not gate output.

### Commands and exit codes

| Command | Exit | Result |
|---|---|---|
| `wc -l logs/api.log logs/web.log` (baseline) | 0 | 13 and 2312 lines |
| `powershell.exe -NoProfile -Command "wsl bash -l …/p4-reseed-prelaunch.sh"` | 0 | `SEED_EXIT 0`, `start_at` +2 days (first try, no WSAETIMEDOUT) |
| `curl` gate probes (`/awards/v1.2`, `/kudos/a.b`, `/admin/users.json`, `/`, `/awards`, `/kudos/new`, `/countdown`, `/login`, `/auth/callback`, `/favicon.ico`, `/images/…webp`) | 0 | statuses as in the defect table |
| `npx playwright test e2e/countdown-prelaunch.spec.ts` | 0 | 8 passed, 1.9 min. Log: `evidence/screens/countdown-prelaunch/e2e-countdown-round1.txt`. No re-run needed |
| Manual clock-step check (Playwright MCP, `localhost`) | n/a | `01 23 59` → `01 23 58` (+3 h, +60 s) → refocus `01 23 59` |
| `npx vitest run src/features/countdown src/lib/events` | 0 | 4 files, 38 passed. Log: `vitest-countdown-round1.txt` |
| `wsl bash -l -c "cd backend && go test ./internal/events/..."` | 0 | `ok …/internal/events`. Log: `go-events-round1.txt` |
| `powershell.exe … wsl bash -l …/p4-reseed-prelaunch.sh` (after e2e, for the manual check) | 0 | `SEED_EXIT 0`, prelaunch again |
| `powershell.exe … wsl bash -l …/p4-reseed-live.sh` | 0 | `SEED_EXIT 0`, `start_at` −1 day, `ceremony_at` +14 days |
| `npm run e2e:session` (after live) | 0 | sessions regenerated: `user.json`, `admin.json`. Log: `session-live-round1.txt` |
| `curl /countdown` after live | 0 | `307 → http://[::1]:3000/` |

Database state: `live` restored and verified. The countdown route redirects to `/` and the sessions are regenerated, so the DB is back on `live`.

### Concern on system sleep (implementer's note)

`performance.now()` may or may not advance during system sleep, depending on the platform. The spec does cover the case. `functional-spec.md` (failure table) says "Device clock wrong or tab asleep → server clock re-checked when the tab is visible again". `technical-spec.md` A4 says a tab suspended in the background is corrected by the visibility resync. So this is not a FAIL, because the spec requires the re-check on visibility, not a clock that keeps counting through sleep.

Residual risk, not required by the spec: if `performance.now()` stops during sleep and the tab wakes without a `visibilitychange` or `focus` event, the digits lag by the sleep time until the next resync, and the 0 ms hand-over lags too. Not reproducible here (no sleep simulation), not measured. Optional hardening if the team wants it: also resync on `pageshow` or on a large gap between two ticks.

### Notes

- Matcher: the proxy matcher skips only image, font and icon extensions (`svg, png, jpg, jpeg, gif, webp, ico, woff2?, ttf`). A future `public/` file with another extension (`.json`, `.txt`, `.js`, `.css`, `.webmanifest`, `.mp4`) would be gated like a page. No such file exists now (`public/` has `*.svg` and `images/`). Worth a line in the README or the matcher comment before adding one.
- C2 (D004 locale wording) and C3 (dev badge) are unchanged. C3 needs a check on the production build.
- Round 1 e2e file is 199 lines, within the 200-line rule.
