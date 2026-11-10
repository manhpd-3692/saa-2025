# Phase 04 — Countdown and launch gate (F003)

## Context Links
- F003: `spec/event-countdown-and-launch-gate/{functional-spec.md, technical-spec.md}`; screen `SCR-countdown-prelaunch`
- `docs/screen-specs/countdown-prelaunch.md` (visual evidence only; API mapping historical)
- Contract: R08, R16, R23; Addendum N09. Decisions: G03, G13, AD03, AD13, AD14
- Figma: Countdown - Prelaunch page `2268:35127`
- Next guide: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`

## Overview
- Priority: P1. Status: pending. Effort: 5h.
- Checklist: **Countdown Prelaunch**.
- Launch gate in `proxy.ts` (before the sign-in redirect), bare `/countdown` page, shared `CountdownDisplay` +
  `useCountdown` (reused by F004), `LaunchCountdown` with server offset, refocus resync and redirect at 0 ms.

## Key Insights
- Gate lookup: 1.5 s deadline, fail open, 60 s in-process cache of successes only (R23, AD13); page fetch no-store 5 s.
- Digits use server offset (`serverNow`) so a wrong device clock still shows correct time (BR-003).
- Redirect at exactly 0 ms, not when minutes read 00 (D001, SC-008).
- Step 2 (shared countdown files) is the hand-off point that lets P5 start in parallel.
- "Digital Numbers" font only if licensed; else free LED/monospace fallback (D008).

## Requirements
- FR-001, FR-002, FR-101–FR-103, FR-201–FR-204, FR-401–FR-403, FR-601, BR-001–BR-003, ALG-001, US001–US003; SC-001–SC-012.
- F001 SC-004 (countdown without chrome; countdown → `/` client navigation).

## Architecture
```
proxy.ts: LaunchGate (exempt: /countdown, /login, /auth/callback, assets)
   └─ eventsApi.getCurrentForGate() 1.5 s, cache 60 s → now < startAt ? redirect /countdown : next → SignInRedirect
/countdown (server, no-store) → event? status active → redirect "/" : <LaunchCountdown startAt serverNow/>
LaunchCountdown = useCountdown(startAt, serverNow) + CountdownDisplay ; focus → refetch → active → router.replace("/")
no event row → "Coming soon" without digits (FR-204)
```

## Related Code Files
Modify: `src/proxy.ts` (gate first)
Create
- `src/lib/events/events-api.ts` (gate + page variants), `src/lib/events/launch-gate-cache.ts`
- `src/app/countdown/page.tsx`
- `src/features/countdown/{countdown-display.tsx, use-countdown.ts, split-remaining-time.ts, launch-countdown.tsx}`
- `src/i18n/dictionaries/{vi,en}/countdown.json`; `public/fonts/` (only if licensed)
- Tests: `src/features/countdown/split-remaining-time.test.ts`, `src/features/countdown/use-countdown.test.ts`, `src/lib/events/launch-gate-cache.test.ts`, `e2e/countdown-prelaunch.spec.ts`
- Go: `backend/internal/events/events_router_integration_test.go` (SC-006 on assembled router)

## Implementation Steps
1. ALG-001 pure split (days/hours/minutes) + Vitest.
2. `useCountdown(targetIso, serverNowIso)` + `CountdownDisplay` (pure, live region) — **merge first; P5 can start**.
3. Events API client variants + cache (successes only).
4. Proxy gate composed before the F002 redirect; exemptions per FR-103.
5. `/countdown` page + `LaunchCountdown` (tick `COUNTDOWN_TICK_MS`, focus resync, 0 ms redirect), blur fallback (AD14).
6. Visuals from Figma by eye; font decision.
7. Tests.

## Todo List
- [ ] ALG-001 split + tests
- [ ] Shared hook + display (hand-off to P5)
- [ ] Events client + gate cache
- [ ] Proxy gate
- [ ] Countdown page + LaunchCountdown
- [ ] Visuals + font
- [ ] E2E + Go router test

## Success Criteria (test plan)
- Vitest: split math; hook with fake timers and a skewed `Date.now()` (SC-004); cache does not store failures (SC-010).
- Go integration: SC-006 on `backend/cmd/api` router.
- Playwright with seeds: `prelaunch` → SC-001, SC-002, SC-012; `live` → SC-003, SC-007; boundary `start_at = now()+30 s` → SC-005, SC-008; refocus SC-009; no event row → SC-011; stalled Go (stopped API) → SC-010.

## Scope Contract
- Changed: proxy gate, events client, countdown page/components.
- Impacted: every page request (proxy); F004 reuses hook/display.
- Will verify: Vitest for time math, Playwright for redirect/gate (browser + proxy behaviour), Go router test. Proxy touches routing of all requests → run F002 proxy E2E (sign-in redirect) again.
- Deliberately skipped: Go events handler internals (P2, unchanged).

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| Gate fault hides site (RISK-01) | L | H | Fail open at 1.5 s; failures never cached |
| Multi-instance cache lag up to 60 s | M | L | Accepted (tech-spec 5.3 #2) |
| Early redirect when display reads 00 | M | M | Redirect on `remainingMs <= 0` only; SC-008 |

## Security Considerations
- Gate is a convenience, not access control; PUBLIC events endpoint exposes only event fields.

## Rollback
- Revert `proxy.ts` gate block; site opens without gate. Countdown files are additive.

## Next Steps
- P5 consumes shared countdown. Open items: Digital Numbers font licence (D008); real production `start_at` (AD03 placeholder 15 Dec 2025 18:00 ICT).
