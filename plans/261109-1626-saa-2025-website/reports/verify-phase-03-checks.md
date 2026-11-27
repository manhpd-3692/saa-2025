# Verify: phase 03 automated checks

Round 1 re-check (after fix round 1). Branch feat/saa-screens. Local stack: Next dev on :3000, Go API on :8080, Supabase local. `npm run build` was not run (controller runs it).

## Commands (round 1)

| Command | Exit code | Result |
|---|---|---|
| `npm run test:e2e` (run 1, foreground) | **0** | 30 passed, 0 failed, 1.9 min, 1 worker. Includes the role-refresh test that failed in round 0 with WSL `WSAETIMEDOUT` |

No rerun was needed: the round 1 run had no WSL timeout. WSL probe before the run: exit 0, 333 ms.

Only `test:e2e` was rerun this round. Round 0 values for typecheck, lint, vitest and `e2e:session` stand as history:
typecheck 0, lint 0, vitest 0 (104 tests), `e2e:session` 0. Round 0 `test:e2e` runs 1 and 2 both exited 1 with the same WSL psql timeout.

## Log check (new lines since round 1 baseline)

Baseline at round 1 start: `logs/web.log` 117920 bytes, `logs/api.log` 286 bytes. End: web.log 119850 bytes (+1930), api.log 286 bytes (no new lines).

- `logs/api.log`: no new lines.
- `logs/web.log` new lines: `GET /` ×13, `GET /login` ×4, `GET /admin` ×5 (54–119 ms, all 200), `GET /some-unknown-url 404`. All expected.
- No ERROR, panic or 5xx in the new lines.
- Slow loads: four `GET /` at 5.2–5.4 s total, `application-code` 5.1–5.2 s. This is the Go `/me` call hitting the 5 s budget. They were home loads, not the counted `/admin` attempts. Not attributed to WSL with evidence. Check again if it recurs.

## Concerns for the controller

1. Go `/me` slow answers: four home loads crossed the 5 s budget (`application-code` 5.1–5.2 s). Same mechanism as round 0. All five 403 attempts were fast (54–119 ms).
2. `[::1]:3000` is not hydrated under `next dev` (cross-origin dev block). The FAB and avatar menu can only be exercised on `localhost`, which the browser zooms (DPR 0.5 or 0.75, `innerWidth` 2880). The true 1440×1024 check holds for server-rendered screens only.
3. Dev HMR websocket refused for the `[::1]` and `localhost.` origins. Likely a dev config item (`allowedDevOrigins`), not an app defect. Not changed here (controller decision).
4. WSL instability: probes at about 17:39 included a 30.5 s `WSAETIMEDOUT`. Probes at 17:50–17:53 were all healthy (314–427 ms).
5. Reference PNG measurements are read by eye, so about ±2 px is noise. The "Thể lệ" width (9 px), the dropdown card width (25 px) and the ≈5 px title offset are above that, or need a decision.

## Round 2 re-check

Branch feat/saa-screens. Local stack: Next dev on :3000, Go API on :8080, Supabase local. Only `npm run test:e2e` was run this round (the controller runs build, typecheck and lint).

### Command

| Command | Exit code | Result |
|---|---|---|
| `npm run test:e2e` (one run) | **0** | 34 passed, 0 failed, 1.2 min (74 s wall). Round 1: 30 passed. The 4 new tests are the keyboard tests in `e2e/shell-menu-keyboard.spec.ts` (avatar menu focus and arrows, avatar Tab-out, language menu, FAB focus-leave) |

Output saved to the scratchpad (`r2-e2e-run.txt`). No failure, no retry, no WSL timeout during the run. One run only this round, so no flake claim is made.

### Log check (new lines since round 2 baseline)

Baseline at round 2 start (11:40 UTC): `logs/web.log` 131639 bytes, `logs/api.log` 590 bytes. End: web.log 138735 bytes (+7096, 89 new lines), api.log 590 bytes (no new lines).

- web.log status codes: 70 x 200, 1 x 307, 6 x 404. The 404s are expected test URLs (`/some-unknown-url`, `/a-page-that-does-not-exist`, `/countdown`). No 5xx.
- web.log error-level lines: one sign-out path logged `sign-out failed Failed to fetch` (`src/features/auth/sign-out-action.ts:23`). This is the e2e test "Logout ends the session ... with Supabase Auth unreachable", which aborts the Supabase logout request on purpose. The app still ends the session locally. Expected.
- Slow loads: one `GET /` at 5.2 s (`application-code` 5.1 s). It was the home load right after my `saa_locale` reload, and the header rendered with no avatar, bell or FAB at that moment. The next navigation (154 ms) showed them again. This is the designed 5 s fallback (F001 A1), but the slow `/me` is still unexplained. Not reproduced on any other load this round (all other `GET /` were 58-640 ms). Round 1 saw four such loads.
- `api.log`: no new line this round. The only ERROR in the file predates the baseline (JWKS refresh `context deadline exceeded` at 18:27 local, in the WSL outage window).

### WSL and environment

- `wsl -e true` probes: several runs of exit 127 with WSAETIMEDOUT after about 30 s, up to 5 in a row. Each counted `/admin` attempt was preceded by a healthy probe (313-483 ms). Detail in verify-error-403.md.
- `127.0.0.1:3000` serves a different application (page title "Grafana", redirects to /login). This round used `[::1]:3000` for server-rendered screens and `localhost:3000` for hydrated menus. Not a defect in this app, but do not use `127.0.0.1:3000` for SAA checks.
- `localhost:3000` is zoomed to 50 % in the MCP browser (`innerWidth` 2880, DPR 0.5). Control+0 did not reset it. CSS px measurements are unaffected; screenshots are zoomed.
- `[::1]:3000` is not hydrated under `next dev` (allowedDevOrigins not reloaded). Menus were measured on `localhost` only.

### Concerns for the controller

1. Tab-out focus (avatar and admin menus): focus lands on the header logo after the menu closes, not on the next control after the avatar. The round 2 AC "focus leaving closes" is met, but the focus target is a minor UX gap.
2. Slow server `/me`: one 5.1 s application-code load this round (round 1: four). The 5 s fallback hides the avatar and bell for that load. The root cause is not proven. The timing matches the WSL outage window, so it is probably environment. Re-check on a stable relay.
3. Title width residual on error-403 and error-404 (4 px and 5 px narrower than the reference frame). Listed for explicit acceptance, not counted as a fail.
