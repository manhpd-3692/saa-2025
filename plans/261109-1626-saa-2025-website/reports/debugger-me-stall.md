# GET /api/v1/me stalls: root cause

Date 2026-11-27. Verdict: **environment (Windows -> WSL relay/hvsock), not the Go API. No Go change made.**

## Symptom
`/api/v1/me` with a valid Bearer sometimes gets no answer (Next 5 s budget expires, /admin and / render "Cannot reach the server"). See verify-error-403.md.

## Hypotheses and elimination
| Hyp | Test | Result |
|---|---|---|
| (b) Go: JWKS refresh/lock, pool exhaustion, missing timeouts, provisioning | Code read: `main.go` server has ReadHeader 5 s/Read 15 s/Write 30 s/Idle 60 s; JWKS `HTTPTimeout 5s`, `RateLimitWaitMax 1ms` (fail fast, no lock wait); every DB call under `dbx.RequestContext` (5 s) with `defer cancel`; `/me` = verify JWT (cached key) + `GetProfileAuth` + `GetMe`, no provisioning. In-WSL curl vs `127.0.0.1` and `localhost`: 50 sequential each (fail=0, max 2.8 ms), 100 requests x 20 parallel (all 200, max 51 ms). In-WSL soak 442 requests/~310 s during a Windows stall period: **442 ok, 0 slow/failed**. api.log: 3 INFO lines, no errors. | Eliminated |
| (c) Supabase/Postgres slowness | Same in-WSL probes include the DB reads (2 queries per call): max 51 ms. No stall inside WSL ever. | Eliminated |
| (a) Windows->WSL relay | Windows probes (node http, `Connection: close`, 3 s timeout, 1 req/0.7 s): run 1 localhost 25/483 TIMEOUT, 127.0.0.1 24/488 TIMEOUT (same instant 10:21:40.162Z on both: not IPv4/IPv6 specific); run 2 (parallel with the clean in-WSL soak) localhost 21/331 TIMEOUT. | **Confirmed** |

Not reproducible when the relay is healthy: 40 PowerShell + 120 curl.exe (10 parallel, localhost/127.0.0.1/[::1]) + 80 Node fetch with 3.5-4.5 s gaps + keep-alive idle gaps up to 90 s = all 200, max 300 ms. So not keep-alive, not undici pool age, not IPv6 happy-eyeballs.

## Timeline (Windows local, UTC+7), run 2
- 17:32:59, 17:33:39, 17:34:18: isolated Windows timeouts; `wsl -e true` ok.
- 17:34:45 -> 17:38:01: every `wsl -e true` heartbeat fails (54 s, then 30 s each) with `Wsl/Service/WSAETIMEDOUT`. Windows /me timeouts at 17:35:34, 17:35:43, 17:36:04-17:36:29, 17:37:04-17:37:39 (bursts of consecutive 3 s timeouts) all inside this window.
- Same period, inside WSL: 0 failures. Run 1 shows the same pairing (stall bursts 17:22:25-17:22:53, 17:24:25-17:24:45, 17:27:58-17:28:20 sit in `wsl -e true` 30 s failure windows).
- Also seen live in this session: wsl.exe failed with WSAETIMEDOUT 3 times before any API probing began.
- Windows listener on :8080 is a single `wslrelay` (PID 5512, up since 11/25) on 127.0.0.1 and ::1; Go in WSL listens `*:8080`.

## Root cause
The host-to-WSL channel (wslrelay localhost forwarding, same hvsock/WSL service that makes `wsl.exe` fail with WSAETIMEDOUT) periodically stops forwarding for tens of seconds (and has isolated ~3 s stalls). Connections reach the relay but nothing comes back; the Go process never sees the request, so it logs nothing. Roughly 5-6 % of 3 s windows are affected on this machine now. I did not determine why the WSL service stalls (host load, security/VPN software, WSL build); that is outside the repo.

Caveat: isolated stalls at 17:32:59-17:34:18 had no matching `wsl -e true` failure (15 s sampling), so the correlation is strong for bursts, not proven for every single timeout.

## Mitigations (none touch frontend files)
1. Remove the relay: set `networkingMode=mirrored` under `[wsl2]` in `C:\Users\phan.duc.manh\.wslconfig` (currently only `bootConfigurationKeepAlive`, `vmIdleTimeout=-1`), then `wsl --shutdown` (restarts Supabase containers/Go API; do it deliberately). Also try `wsl --update`. Re-run `logs/dbg-me-inwsl-soak.sh` + the Windows soak to measure.
2. Cheaper proxy of the same fix: run Next dev server and Playwright inside WSL too (loopback stays inside the VM), keeping only the browser on Windows.
3. Frontend (for the other agent, optional): a stall is a 30 s-class outage, so a retry inside the 5 s budget will not help; the existing "unavailable" notice is the correct behaviour. Using 127.0.0.1 vs localhost makes no difference (both stall at the same instant).
4. e2e: treat `ServiceUnavailableNotice` on /admin as environment flake only after checking `wsl -e true` latency, so the SC-004 assertion is not weakened.

## Recurrence / monitoring gap
- Go API logs nothing for successful requests, so a stall is indistinguishable from "request never arrived". A small access-log middleware (method, path, status, duration, slog) would have shown instantly that the stalled requests never reached Go. Not added: outside the fix scope (cause is not Go); recommend as a follow-up.
- Cheap detector: `wsl -e true` latency > 5 s is the leading indicator.

## Evidence files
Scripts: `logs/dbg-me-probe.sh`, `logs/dbg-me-inwsl-soak.sh`; outputs `logs/dbg-probe-out.txt`, `logs/dbg-inwsl-soak.txt`. Windows soak outputs are in the session scratchpad. Tokens never printed here.

## Verification
No Go code changed, so gofmt/vet/test/reseed not needed. Go process untouched (not restarted; /healthz 200 not re-checked needed).

**Status:** DONE
**Summary:** Stalls are Windows->WSL relay/service outages (in-WSL 442/442 ok during 21 Windows timeouts); Go API is healthy and unchanged.
**Concerns:** Why WSL stalls is not determined; single-stall vs wsl heartbeat correlation is partial.
