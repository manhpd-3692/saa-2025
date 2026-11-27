# Verify: login (signed out)

**Verdict: PASS** (concern logged: one React hydration warning seen once in web.log, not reproduced on this page; see Error check)

Viewport: 1440×1024 CSS px, origin `http://[::1]:3000/login` (true 1440 layout; see Notes on the localhost zoom issue). Language: VN (`saa_locale=vi`) to match the VN reference; EN also captured.

## Visual comparison (vs docs/figma-refs/user/login.png)

| Element | Expected (reference) | Actual | Result |
|---|---|---|---|
| "ROOT FURTHER" key visual | x≈140–595, y≈285–490 | x≈145–597, y≈290–490 | OK (≤5 px; known raster crop) |
| Intro copy (VN) | 2 lines, y≈588 / 628 | y≈590 / 630 | OK |
| "LOGIN With Google" button | 160–465 × 673–732, yellow, G icon | 160–465 × 673–733, same | OK |
| Language chip | VN flag + "VN" + caret | same | OK |
| Footer copyright (VN) | "Bản quyền thuộc về Sun* © 2025" centred, y≈978 | same, y≈979 | OK |
| Header bar | dark bar with logo, 80 px | same | OK |

No mismatch of text, colour, element or position beyond a few pixels. Known raster smudges accepted per brief.

## Acceptance criteria (F002 Login + F001 shell)

| AC | Result | Proof |
|---|---|---|
| F002 FR-201 key visual, button, language switch, footer | PASS | Visual table above; snapshot shows heading image, button, language button, contentinfo |
| F002 FR-202 one press starts Google sign-in; second press does nothing | PASS (spinner not captured) | Double-click produced exactly one Supabase `/auth/v1/authorize` request (run_code network capture). Button uses `disabled` + `aria-busy` (code). The spinner is visible only for the moment before the browser leaves, so it was not captured on screen |
| F002 FR-203 cancelled/failed shows a message, button usable | PASS (messages); real cancel MANUAL | `?error=cancelled` → "Bạn đã huỷ đăng nhập. Vui lòng thử lại."; `domain_not_allowed`, `profile_unavailable`, unknown value → `failed` message. Button `disabled=false` in all four. Real Google cancel = MANUAL |
| F002 FR-101 deep link lands on page after sign-in | PASS (redirect part) | `/profile` → `/login?next=%2Fprofile`. Post-sign-in landing = MANUAL |
| F002 FR-102 lands on Homepage after sign-in | MANUAL (needs real Google login) | — |
| F002 FR-103 signed-in Sunner opening Login → Homepage | PASS (e2e) | e2e "opening Login goes to the Homepage" passed in the first e2e run (29 passed) |
| F002 FR-604 / BR-003 company domain only | MANUAL (real Google) | Go-side refusal proven P2; domain_not_allowed message renders |
| F002 FR-605 / BR-002 / SC-005 external return address never used | PASS | Hostile `next=https://evil.example/steal`: the Supabase `redirect_to` became `…/auth/callback?next=%2F` (sanitised to `/`). Internal `next=/awards` kept |
| F002 SC-001, SC-007 | MANUAL | Real Google account needed |
| F002 SC-003 anonymous → /login with internal return; /login, /auth/callback answer without session | PASS | `/` → `/login` (307); `/profile` → `/login?next=%2Fprofile`; `/admin` → `/login?next=%2Fadmin`; `/auth/callback` (no code) → `/login?error=failed` |
| F001 FR-602 no avatar/bell without session | PASS | Snapshot: only language button and no account/bell |
| F001 FR-003 minimal frame on Login (language switch + copyright only) | PASS | Header has logo + language only; footer copyright only |
| F002 SC-011 (N06) profile-recovery Login without bounce | PASS (e2e) | e2e "a session whose profile cannot be recreated ends on Login without a bounce" passed (first e2e run) |
| F001 SC-004 Login chrome | PASS | As FR-003 above |

## Error check

- Browser console (error level), on `[::1]:3000/login`: only the Next HMR WebSocket refusals caused by the dev origin (`ws://[::1]:3000/_next/hmr` — dev-only, see Notes). No app errors.
- Network: no 4xx/5xx on signed-out Login loads. The `401` expectation is met (no `/api/v1/me` call on Login).
- Logs: `logs/api.log`: no new lines since baseline. `logs/web.log`: no new error/panic lines attributable to Login. One React hydration warning (root layout `<html lang>`/`<body class>` mismatch) appeared once after `GET /` requests; not reproduced in four later page loads at 1440 px. Logged as an open concern under "Errors" in `verify-phase-03-checks.md` and on the homepage/shell reports.

## Evidence

- `evidence/screens/login/actual-vi-1440.png` — authoritative VN capture at true 1440 px
- `evidence/screens/login/actual.png` — EN capture (localhost, half-scale; superseded for layout)
- `evidence/screens/login/actual-vi.png` — VN capture (localhost, half-scale; superseded)
- `evidence/screens/login/actual-error-cancelled-vi.png` — error message state (localhost, half-scale)

## Notes

- The MCP browser had a 50% host zoom for `localhost` (layout 2880 CSS px, device-pixel ratio 0.5). Screenshots taken there are half-scale. Layout values for shell pages were re-measured at true 1440 px on `[::1]:3000`. Login screenshots happened to be unaffected, so the visual verdict stands at both sizes.
- No Google OAuth was attempted. The click leaves for `accounts.google.com` with the placeholder client id (`invalid_client`), as expected locally.
