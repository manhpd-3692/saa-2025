# End-to-end tests (Playwright)

Browser tests run against the **locally running stack**; Playwright does not start servers.

| Service | URL | How it runs |
|---|---|---|
| Next.js | http://localhost:3000 | `npm run dev` |
| Go API | http://localhost:8080 | `cd backend && go run ./cmd/api` (WSL, `backend/.env` loaded) |
| Supabase | http://127.0.0.1:54321 | `supabase start` (WSL), seeded with `SEED_SCENARIO=live` |

## Signed-in state: local test session (no Google login)

Google OAuth cannot be automated and no real OAuth client is configured locally, so tests never
click through Google. Instead a **local-only** script signs a Supabase-shaped access token with the
local signing key and writes the `@supabase/ssr` session cookie as a Playwright storage state:

```sh
npm run e2e:session      # writes playwright/.auth/user.json and playwright/.auth/admin.json
```

Details and safety rules: `e2e/support/README.md` (refuses non-loopback hosts, adds no bypass route
or flag to the app; Go still verifies every token through the JWKS and loads the role from `users`).
The files under `playwright/.auth/` are gitignored. Re-run the script after `supabase db reset` or a
reseed.

`playwright.config.ts` uses `playwright/.auth/user.json` as the default storage state when the file
exists. Admin screens opt in with `test.use({ storageState: "playwright/.auth/admin.json" })`. Tests
that need a session skip with a hint when the file is missing.

## Run

```sh
npx playwright install chromium   # once per machine
npm run test:e2e                  # all specs
npx playwright test e2e/browser-transport-smoke.spec.ts
```

Playwright runs with **one worker** (`workers: 1` in `playwright.config.ts`): the local stack is
reached through the Windows to WSL port relay, which drops requests under parallel load (analysis:
`plans/261109-1626-saa-2025-website/reports/debugger-me-stall.md`). Do not raise it on this setup.

Overrides: `E2E_BASE_URL` (default http://localhost:3000), `E2E_API_BASE_URL` (default
http://localhost:8080; must be an origin listed in the API's `FRONTEND_ORIGINS` for the frontend
side). Reports and traces go to `logs/playwright/` (gitignored; ESLint ignores `logs/**`).

## Specs

| Spec | Covers |
|---|---|
| `browser-transport-smoke.spec.ts` | F002 SC-009 (Codex R06): from a page on the frontend origin, GET/POST/PATCH/PUT/DELETE and an `Idempotency-Key` header reach Go with a bearer token (no cookies); preflight answered 204 without a JWT for allowed origins only; a page on another origin is blocked by the browser. Requests are picked so they change no data. |
| `app-shell-and-locale.spec.ts` | F001 (phase 3): header/footer/FAB, one selected header link, avatar menu per role, Admin item after a stored role change on window focus (SC-003, SC-008; toggles `sunner02.demo`'s `users.role` and restores it), FAB states (SM-001), VN/EN switch kept across reloads and pages (SC-001), unsupported cookie ignored (SC-002), Login chrome (SC-004), localized 404 (SC-005), 1280/1024 px widths (SC-009). |
| `login-and-admin-gate.spec.ts` | F002 (phase 3): sign-in redirects and public paths (SC-003), Login copy and reason messages (FR-201, FR-203), Google button up to the Supabase authorize request with a safe `next` (FR-202, SC-005), Login → Home when signed in (FR-103), Forbidden page vs admin chrome on `/admin` (SC-004, F001 SC-005), logout (SC-006) and the missing-profile recovery ending on Login without a bounce (SC-011). |
| `countdown-prelaunch.spec.ts` | F003 (phase 4): countdown page on the server clock with a skewed device clock and a device clock step while counting (SC-004, SC-012, FR-201..203, FR-402), refocus resync before and after the start (SC-009, SC-007), proxy launch gate before sign-in for every page including dotted slugs, with exempt Login/callback/assets (SC-001, SC-002, FR-601), an early start while the gate still caches "upcoming" lands Home without a redirect loop, no event row → "Coming soon" and fail open (SC-011), stalled Go read (table lock) fails open in 1.5 s and is not cached (SC-010), sub-minute boundary 00 00 00 then Homepage at 0 ms (hand-over within 1 s of `start_at`) without a reload (SC-008, SC-005), `live` → `/countdown` lands Home (SC-003). Switches the `events` row with the real `backend/db/seeds/*.sql` and restores `live`; takes ~3 min because the gate caches a reading for 60 s. |
| `homepage-and-awards.spec.ts` | F004 Homepage (phase 5): ceremony countdown to `ceremony_at` on the server clock with no redirect while the site is open (SC-005, SC-007, FR-403), refocus re-read of `serverNow` (SC-009), a ceremony 75 s ahead reaching 00 00 00 and stopping, and the `after-ceremony` seed showing 00 00 00 at load (SC-008), event info from the event row, about text, six award cards and their links, CTAs and the Kudos block (FR-201..207), no event row and a stalled read (table lock) falling back with retry while the rest renders (SC-010), a card opening its award on the Awards page (US002). Switches the `events` row with the real seed files and restores `live`. |
| `awards-and-community-standards.spec.ts` | F004 Awards and Community Standards (phase 5, `live` seed only): six cards with quantities and prizes, Signature's two prizes split by "Hoặc" (SC-001, SC-002), `/awards#mvp` and an unknown fragment (SC-003), menu pick with smooth scroll, fragment and Back (FR-401), scroll-spy order (SC-004), ten rules and the security standards from the footer (FR-351, FR-352), sign-in redirects (SC-006), Vietnamese fallback in English (FR-002), 1280 / 1024 px (SC-011). |
| `shell-menu-keyboard.spec.ts` | F001 (phase 3): keyboard model of the avatar menu, language menu and FAB choices: focus on open, ArrowUp/ArrowDown wrap, Home/End, Escape returns focus to the trigger, focus leaving closes the panel. |
| `kudos-board.spec.ts` | F006 Live board and View Kudo (phase 7, `live` seed, expected numbers read from the database): key visual and four sections, Highlight n/5 ranked by weighted hearts with the ends disabled (FR-202), Hashtag / Phòng ban filters, no-match empty state and "Xoá bộ lọc" (FR-203, FR-204, SC-004), Spotlight counter and accent-insensitive search (FR-205, FR-206, BR-004), sidebar stats and gift recipients (FR-208, FR-210), All Kudos infinite scroll in keyset order to the end marker with a failed page and Retry (FR-207, BR-005, SM-001), detail over the board closed by Đóng/Esc at the same scroll position, direct link page and Copy Link (FR-102, FR-401, FR-404, BR-007), one 404 in the minimal chrome (same as the root 404, C01) for a missing, non-uuid and spam id (SC-006; inserts and deletes one spam kudo), avatar hover card counts and no card/link for an anonymous sender (FR-402, DEC-002), anonymous sender absent from the page markup and the admin's marked real sender (SC-007, G04), the own-kudo edit pencil opening the edit window (FR-104), Homepage/Awards links and the signed-out redirect (FR-101, FR-601). |
| `kudos-board-images-and-actions.spec.ts` | F006 phase 7 fix round 1 (`live` seed with real images in the local `kudo-images` bucket): thumbnails from opaque keys in the sender's order (FR-002, R01), an anonymous kudo with images exposing no sender id in markup or links (SC-007), one fresh re-read of the kudo when an image fails and then the images load, and visible "Ảnh không khả dụng." when it still fails (route-aborted Storage requests), the hover card "Gửi KUDO" preselecting the recipient (still changeable), the selected filter chip colours measured from Figma 1002:13094. |
| `like-kudos-and-secret-box.spec.ts` | F008 phase 8 (`live` seed with its x2 heart campaign): the recipient's heart adds the campaign weight at once and after reload, withdraw, a double click storing one heart (FR-401, FR-402, BR-001, BR-004, SC-001, SC-003); a failed in-transaction campaign check reverts with a message and a failed badge read only hides the badge (R09, SC-010); the sender's disabled heart and Go's 403, a spam kudo's 409 (DEC-001, BR-002, BR-003, SC-002); the campaign badge hover with name and window (FR-204); hero badges per tier with their hover and no badge without senders (FR-203, BR-005, DEC-003, SC-005); Thể lệ from the FAB, Đóng/Esc, Viết KUDOS opening the write window (FR-101, FR-103, FR-201, FR-202). Deletes and restores Bình's heart on one demo kudo; inserts and deletes one spam kudo. |
| `secret-box-open-and-retry.spec.ts` | F008 phase 8 secret box window: count, shaking box, revealed icon and n/6, sidebar refresh after closing (FR-102, FR-205, FR-206, FR-404, SC-006); a committed open whose answer is dropped (route fetch + abort) retried with the same Idempotency-Key, same icon, one box consumed (R12, N12, SC-013); empty state and a box taken by another tab (FR-207, DEC-004); the sixth icon completing the set once with the congratulation box and an `icons_completed` notice (BR-010, SC-012). Box inventories of `sunner23/24.demo` are fixture rows; opens always go through Go. |

Helpers: `support/local-session-cookies.ts` mints a short-lived session (fresh `session_id`) in memory for
one test, so logout and the missing-profile case never touch the shared storage states;
`support/local-database.ts` runs SQL in the local Supabase DB container (`wsl docker` on Windows).

## Open items

- **Manual real-Google check** (phase 02 success criteria): sign in with a real company Google
  account and land on `/` with exactly one `users` row; a non-company account returns to Login with
  `domain_not_allowed`. Needs a Google OAuth client in `supabase/.env`; not automatable.
- **Claim locations (gap log C06)**: confirm a real GoTrue Google token carries
  `app_metadata.provider = "google"` and `providers = ["google"]` during that manual run.
- F002 SC-009 also lists the F010 CSV export (`Content-Disposition` readable from JS); that endpoint
  arrives in phase 11, which extends this smoke.
