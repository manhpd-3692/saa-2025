# Review: Phase 4 countdown launch gate (F003), uncommitted

Scope: `src/proxy.ts`, `src/lib/events/*`, `src/app/countdown/page.tsx`, `src/features/countdown/*`, i18n dictionaries, `backend/internal/events/events_handler.go` + test, `e2e/login-and-admin-gate.spec.ts`, `e2e/countdown-prelaunch.spec.ts`, `e2e/support/launch-gate-fixtures.ts`. ~790 lines of app code; all files < 200 lines, kebab-case. Depth: recent.
Read against: phase-04 plan, F003 functional/technical spec (DEC-003, SC-010). Not run: tests, tsc, lint (read-only review; counts below are from reading only).

## Assessment
Solid. Fail-open matches DEC-003 (404 / error / 1.5 s all pass through, failures logged, never cached). No security finding: redirect target is the constant `/countdown`, no header or query trust, no bypass flag, no login shortcut. One real operational defect (redirect loop on a stale gate cache), one gate-bypass hole (dotted paths), one logging blind spot.

## Critical
None.

## Warning

**W1. Redirect loop when the gate cache says "upcoming" but Go says "active"** — `src/lib/events/launch-gate-cache.ts:113-128`, `src/app/countdown/page.tsx:27`, `src/lib/events/launch-gate.ts:51`
- `/countdown` is exempt and reads Go fresh; on `active` it does `redirect("/")`. `/` goes through the gate, which still holds an "upcoming" reading for up to 60 s. Gate sends `/countdown`, page sends `/`, and so on: `ERR_TOO_MANY_REDIRECTS` for every visitor of that instance.
- Natural start is safe (cache advances serverNow by elapsed time). The loop appears when `start_at` is edited earlier, or the event is launched early by a DB update, within the TTL. The e2e spec dodges it by ordering steps (comment at `countdown-prelaunch.spec.ts:14-18`), which shows the hazard is real. The accepted "lag up to 60 s" (tech spec 5.3 #2) is a stale countdown, not a loop; the loop is worse than what was accepted.
- Fix (pick one; needs a product call, so listed under Unresolved):
  1. Cap the TTL of an *upcoming* reading, e.g. `ttlMs = Math.min(60_000, 10_000)` when `startAt` is in the future; keep 60 s only for "live" readings. Shrinks the loop window to ~10 s.
  2. Break the loop: when the gate is about to redirect and `request.headers.get("referer")` path is `/countdown`, ignore the cache once (`gate.invalidate()` then re-lookup). Referer is not trusted for access, only to force a fresh read.
  3. Have the page redirect to `/` only after `status === "active"` AND tell the gate via a short-lived signal; heavier, not recommended.

**W2. Static-file exemption lets any dotted path skip the gate** — `src/lib/events/launch-gate.ts:57-61`
- `STATIC_FILE = /\/[^/]+\.[A-Za-z0-9]+$/` exempts *every* path whose last segment contains a dot: `/profile/john.doe`, `/kudos/a.b`, `/awards/2025.1`. FR-101/SC-001 say every page is gated. Not an auth bypass (the F002 sign-in rule still runs), but a dotted dynamic segment shows the pre-launch page content.
- The proxy `matcher` (`src/proxy.ts:37`) already excludes real asset extensions, so the regexp is redundant for them and only widens the hole.
- Fix: delete `STATIC_FILE`; `/countdown`, `/login`, `/auth/callback`, `/_next` stay. If a root file such as `/robots.txt` is needed, list it explicitly in `EXEMPT_PREFIXES`-style exact matches. Add the unit test from S3.

**W3. WARN branch can hide a real DB error** — `backend/internal/events/events_handler.go:31-35`
- `case r.Context().Err() != nil` demotes to WARN whatever `err` is. If the DB fails and the caller disconnects in the same moment, the real error is logged at WARN. During a DB brownout slower than 1.5 s, every gate lookup is cancelled by the caller, so a sustained outage never produces an ERROR line that alerting watches.
- Fix: require the error to be the cancellation itself:
  ```go
  case r.Context().Err() != nil && errors.Is(err, context.Canceled):
  ```
  (add `"context"` import). A server-side `DeadlineExceeded` and any other DB error stay ERROR. Extend the test with `fakeEvents{err: errors.New("down")}` plus a cancelled context: expect ERROR. Consider a counter for cancelled reads so the brownout stays visible.

## Suggestion

**S1. Stamp `fetchedAtMs` before the request, not after** — `launch-gate-cache.ts:118`. The estimate `serverNow + elapsed` lags by the lookup latency (up to 1.5 s), so at the start moment the gate opens that much late; the client may already navigate to `/` and bounce once via the W1 path. Capture `const requestedAt = Date.now()` before `lookup()` and use it (conservative toward opening slightly early). Same small fix shrinks W1's natural-start window to zero.

**S2. Client offset is taken at mount** — `countdown-clock.ts:33`. `serverNow` was read at SSR; mount may be seconds later (slow JS), so digits and the 0 ms hand-over lag by load time. Anchor on the response time: `performance.timeOrigin + performance.getEntriesByType("navigation")[0]?.responseStart`, falling back to `Date.now()` for client navigations. Also use `performance.now()` for elapsed so a device wall-clock step (NTP, manual change) cannot move the countdown until refocus (the e2e at `countdown-prelaunch.spec.ts:76` shows this drift is known). Resync on refocus already limits the damage.

**S3. No unit test for the exempt list** — `src/lib/events/launch-gate.ts` has none. Add `launch-gate.test.ts`: `/countdown`, `/countdown/`, `/login`, `/auth/callback`, `/_next/static/x` exempt; `/countdown-x`, `/loginx`, `/profile/john.doe`, `/_nextx` not exempt. Cheap, protects W2.

**S4. Failure log repeats per awaiter** — `launch-gate-cache.ts:119-122`. Concurrent requests share one rejected promise, and each calls `onLookupFailure`: N identical warns per outage tick. Log once in the `pending` creator (`lookup().catch(e => { onLookupFailure(e); throw e; })`). Also no rate limit: during a Go outage every request pays up to 1.5 s (spec-mandated by "never cache a failure"); fine, but worth a runbook line.

**S5. P3 e2e edit is sound but indirect** — `e2e/login-and-admin-gate.spec.ts:28-31`. It does not weaken the test: exact `/login` (no `next`) fails if `/countdown` were protected (`/login?next=%2Fcountdown`), so "public" is still proven. Two cost points: the proof now goes through `/countdown` -> `/` -> `/login` and depends on Go answering and the live seed (Go down shows "Coming soon", stays on `/countdown`, test fails). Stronger and exact: `expect(await landing(request, "/countdown")).toBe("307 /")` using the existing `landing` helper (`launch-gate-fixtures.ts:33`), which pins the proxy behaviour with no chain. The pre-launch spec already asserts `/countdown` = 200 (`countdown-prelaunch.spec.ts:91`), so coverage overall is intact.

**S6. Fixture leaves the shared DB in `prelaunch` if the process dies** — `launch-gate-fixtures.ts:20`, `countdown-prelaunch.spec.ts:40-46`. `afterAll` restores `live`, but a killed run (WSL stall, Ctrl-C) leaves every later spec gated. Add one line to `e2e/README.md`: "after an aborted run: `applyEventScenario('live')` / re-run seed `live.sql`".

## Focus-area checklist

| Area | Result |
|---|---|
| Exempt paths, `/countdown-x`, `/login/../` | `pathname === p \|\| startsWith(p + "/")` is exact; WHATWG URL normalises `..`. OK except W2 |
| Order vs session refresh | Gate before sign-in rule, run in parallel with refresh, cookies carried by `redirectWithSession`. OK |
| Redirect status | `NextResponse.redirect` default 307, matches plan and e2e |
| Fail open / closed | Open on 404, error, timeout, bad shape, missing env; matches DEC-003 / SC-010 |
| Cache | Success only, in-flight dedupe, no unbounded wait (`AbortSignal.timeout` covers body read), no user data in module state. Races benign (S1, S4) |
| Server time | Gate and client use serverNow + elapsed; device skew handled (tests with +1 day / -3 h). Mount-anchoring: S2 |
| Timer | Last tick scheduled at exact zero, cleared on last unsubscribe, self-corrects early timer fires; one resync in flight; listeners removed on unmount; `router.replace` once, no reload |
| `/countdown` page | `connection()` + `instant = false` consistent with other pages; active -> 307 `/`; no row or Go error -> "Coming soon" with `role="status"`; sr-only polite live region with full words |
| Go handler | Correct for the stated case; masking risk W3 |
| Security | No open redirect (constant target), no header trust, no bypass flag or route, no secrets |

## Done Well
- Gate is explicit about being convenience, not access control; failures never cached; concurrent lookups shared.
- `parseCurrentEvent` validates the body, so garbage from Go becomes a failed read, not NaN math.
- Pure `countdown-clock` store: framework-free, testable with fake timers, server snapshot avoids hydration mismatch.
- Tests aim at risk: skewed clocks, exact-zero tick, TTL edge (59 999 / 60 000 ms), failure not cached, expired success not reused.
- e2e covers stalled Go via a real table lock and a sub-minute boundary with no-reload assertion.

## Actions In Order
1. W1: decide and implement the stale-cache loop breaker (shorter upcoming TTL or fresh read on `/countdown` referer).
2. W2: remove `STATIC_FILE`, add `launch-gate.test.ts` (S3).
3. W3: tighten the Go case to `errors.Is(err, context.Canceled)`; extend the test.
4. S1 (cheap, same file as W1), then S4.
5. S5, S6, S2 as follow-ups.

## Numbers
- Type coverage: not measured (no `any` seen in the change)
- Test coverage: not measured; new Vitest files cover split, clock, cache; e2e covers SC-001..005, 007..012; no unit test for `launch-gate.ts`
- Lint findings: not run

## Still Unresolved
- W1 needs a decision: is a shorter TTL for "upcoming" readings acceptable against AD13 (60 s)?
- Acceptance criteria: plan lists `use-countdown.test.ts` and a Go router test for SC-006; the former is replaced by `countdown-clock.test.ts` (fine); the router test exists in `backend/cmd/api/router_test.go` per grep, not re-verified here.
- `node_modules/next/dist/docs` was unreadable from Bash (hook block); `instant = false` usage checked via Grep against the docs and matches the other pages.

**Status:** DONE_WITH_CONCERNS
**Summary:** Gate logic is spec-faithful and safe; fix the stale-cache redirect loop (W1) and the dotted-path exemption (W2) before commit.
**Counts:** critical 0, warning 3, suggestion 6
