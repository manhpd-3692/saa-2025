# Verify: dropdown-language (Login and signed-in page)

**Verdict: PASS** (same Errors concern as login; see verify-login.md)

Viewport 1440×1024 CSS px on `[::1]` for the Login state. Reference: docs/figma-refs/user/dropdown-language.png (VN above EN, grey backdrop is the design frame, not part of the component).

## Visual comparison

| Element | Expected | Actual (measured, CSS px) | Result |
|---|---|---|---|
| Menu card | ≈122 × 122 px, rounded, gold border | 122 × 125 px, radius 8 px, border 0.67 px `rgb(153,140,95)` (gold-olive) | OK |
| Row pitch | ≈56 px | 56 px (VN row y 75, EN row y 130 in 1x shot) | OK |
| Selected row (VN) | olive-tint highlight | `rgba(255,234,158,0.2)` tint, label "VN" with flag | OK |
| Flags + labels | VN flag, UK flag, "VN"/"EN" | same | OK |

No mismatch beyond rounding. Grey backdrop in the reference is part of the design frame and is not expected in the implementation.

## Acceptance criteria

| AC | Result | Proof |
|---|---|---|
| F001 FR-203 control shows current language, offers VN and EN | PASS | Menu `menuitemradio` VN, EN; VN checked on Login |
| F001 FR-401 choice applies at once and is kept next visit | PASS | Chose EN → `saa_locale=en`; after reload and after `/login?error=cancelled` footer and alert read EN |
| F001 BR-001 saved language wins, else browser language, else VN | PASS | No cookie, en-US browser → EN. Saved `en` kept |
| F001 BR-003 unsupported value ignored | PASS | `saa_locale=xx` → page renders EN (browser fallback), `html lang=en` |
| F001 SC-001 choose EN, reload, open another page keeps EN | PASS | As FR-401 |
| F001 SC-002 cookie `xx` ignored | PASS | As BR-003 |
| F001 FR-002 words from dictionaries | PASS | Both languages render from `dictionaries/{vi,en}` |
| F001 FR-001/FR-003 signed-in page shows language control | PASS | Signed-in `/` shows `Ngôn ngữ`/language button; menu VN+EN with EN checked after `saa_locale=en` |
| F001 SC-007 language locked while write-kudo modal open | DEFERRED P6 | Modal not built |

## Error check

- Console error level: none from the language switch.
- Network: no 4xx/5xx from the switch (client-side cookie write only).
- Logs: no new app error lines from this flow.

## Evidence

- `evidence/screens/dropdown-language/actual-login.png` — Login with menu open (localhost, half-scale)
- `evidence/screens/dropdown-language/actual-signed-in-en.png` — signed-in `/`, menu open, EN checked (localhost, half-scale)

Measurements are from `getBoundingClientRect`/`getComputedStyle` on the live page.

## Round 2 re-check

**Verdict: PASS.** Visual unchanged from round 1 on the Login state. Keyboard navigation (new in round 2) works on both the signed-in header and the Login page.

Method: `localhost:3000` (zoomed to 50 %, CSS px). Signed in on `/` as admin with EN, then Login with `saa_locale=vi` (matches the reference, VN selected).

### Visual

| Element | Expected | Actual (round 2, CSS px) | Result |
|---|---|---|---|
| Card (Login) | ≈122 × 122, gold border | 122 × 126.7, border 1.33 px rgb(153,140,95), radius 8 px | Width PASS. Height +4.7 px vs the eyeballed reference. Round 1 measured 125 px with a 0.67 px border; same component, so this is treated as a zoom-measurement difference, not a regression |
| Selected row (VN) | olive tint | rgba(255,234,158,0.2), VN checked | PASS |
| Other row (EN) | plain | transparent | PASS |
| Row pitch | 56 px | 56 px | PASS |
| Flags and labels | VN flag, UK flag, VN / EN | same | PASS |

Screenshot compared to `docs/figma-refs/user/dropdown-language.png`: same arrangement and selected state.

### Keyboard (round 2 change)

| Step | Expected | Actual | Result |
|---|---|---|---|
| Open (signed-in) | first item focused | VN focused | PASS |
| ArrowDown / ArrowUp / End / Home | move, wrap, no locale change | EN, VN, EN, EN, VN; html lang stays en | PASS |
| Escape | close, focus to trigger | closed, focus on trigger | PASS |
| Enter on trigger | open, first item focused | VN focused | PASS |
| Tab x2 | EN, then leave (close) | EN, then closed; focus to avatar | PASS |
| Login: ArrowDown, Escape, Enter | same behaviour, locale unchanged | EN focused; Escape closes and focuses "Ngôn ngữ: VN"; Enter reopens | PASS |

Enter on a language item was not pressed, since it would change the locale.

## Acceptance criteria

| AC | Result | Proof |
|---|---|---|
| F001 FR-203 control shows current language, offers VN and EN | PASS | menuitemradio VN, EN; checked state matches |
| F001 FR-401 choice applies and is kept | PASS (round 1) | Not re-run; the keyboard path does not change the locale |
| F001 SC-007 locked while write-kudo modal open | DEFERRED (P6) | Modal not built |

## Error check

- Console: 0 errors on signed-in `/` and on Login.
- Network: no 4xx/5xx from the switch.

## Evidence

- `evidence/screens/dropdown-language/actual-signed-in-open-r2.png`: signed-in `/`, EN checked, zoomed viewport.
- `evidence/screens/dropdown-language/actual-login-open-r2.png`: Login, VN checked, zoomed viewport.
