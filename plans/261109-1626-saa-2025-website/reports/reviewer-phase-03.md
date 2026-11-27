# Review: Phase 3 (auth, shell, i18n, 403/404)

Scope: `git diff HEAD` + untracked under src/, e2e/, public/images/, eslint.config.mjs, playwright.config.ts. ~1900 lines of source. Depth: full on auth/session/locale/shell.
Checks run: `tsc --noEmit` clean, `eslint src e2e` clean, `vitest run` 104/104 pass. Not run: Playwright (needs local stack).

## Assessment
Solid. No login bypass, no open redirect, no token logging, test helpers not imported by `src/`. Findings are a11y and robustness, no blocker.

## Critical
None.

## Warnings
1. **Menus claim `role="menu"` but do not behave like one** (a11y). `src/components/shell/avatar-menu.tsx:63-88`, `src/components/shell/locale-switcher.tsx:52-74`. No focus move on open, no ArrowUp/Down/Home/End, and `useDismissablePopover` (`use-dismissable-popover.ts:15-31`) closes only on outside pointer or Escape, so Tab out leaves the panel open. Screen readers switch to menu mode and expect arrow keys. Fix (KISS): drop `role="menu"/"menuitem"/"menuitemradio"/"none"` and `aria-haspopup="menu"`, use the disclosure pattern (button `aria-expanded` + plain list of links/buttons; keep `aria-checked`→`aria-current="true"` for the language). Add a `focusout` close (`if (!ref.current?.contains(e.relatedTarget)) setOpen(false)`) in the hook. Alternative: keep role=menu and implement roving focus.
2. **`MeRefresher` focus refresh can wedge forever.** `src/components/shell/me-refresher.tsx:24-42` + `src/lib/api/go-api-browser.ts:14-22` (no `timeoutMs`). A hung `/me` keeps `inFlight=true`, so no later focus refresh runs and the Admin item never follows a role change (FR-601). Server side has 5 s (R23), browser does not. Fix: pass `timeoutMs: 5000` from `goApiBrowser` (or `init.signal = AbortSignal.timeout(5000)` in `refresh`). The transport already maps it to `timeout` -> `unavailable` -> state kept.
3. **Admin gate is evaluated once per layout mount.** `src/app/admin/layout.tsx:20-43`. Layouts do not re-render on client navigation, so a demoted admin keeps the admin chrome until a full load (MeRefresher updates the user, not the gate). Safe because Go `RequireAdmin` enforces, but every F010 page must treat Go 403 as "show Forbidden", not as a generic error. Fix: record this as a P11 requirement in the plan; optionally have `MeRefresher` call `router.refresh()` when the role changes from admin to user.

## Suggestions
1. `src/components/shell/locale-switcher.tsx:28` `!isLocale(next)` is dead: `next` is typed `Locale` and comes from `SUPPORTED_LOCALES`. Remove (BR-003 is enforced server-side in `resolve-locale.ts:39`, which is the real guard).
2. `src/app/admin/layout.tsx:23-42`: `signed-out` (Go 401 with a still-valid JWT, e.g. revoked session) renders Forbidden rather than Login. Consider `redirect(loginPath with next)` for that kind; proxy cannot catch it because it verifies the JWT locally only.
3. `src/app/layout.tsx:16-19` and `src/app/not-found.tsx:5`: titles hard-coded in one language; use `generateMetadata` with `getRequestTranslator` (`app.name` exists in `common`).
4. `src/features/auth/sign-out-action.ts:27-29`: cookie clearing omits `Secure`; fine on https (browser allows), but add `;Secure` when `location.protocol==="https:"` to match how the session cookies were written, avoids edge cases on browsers that enforce strict-secure matching.
5. `public/images/brand/saa-logo.png` (71x65) is upscaled to 69x63 in the footer and header; open item already known, track for P14.
6. `errors.forbidden.message` (vi/en) says the resource "doesn't exist or has been removed", same as 404. Matches Figma copy but is wrong for 403; plan lists "You do not have access to this page." as an open copy item. Resolve with the owner.
7. No CSP / `images.remotePatterns` for `<Image unoptimized>` avatars (`avatar-menu.tsx:48-57`). `referrerPolicy="no-referrer"` and `unoptimized` are right; a CSP `img-src` allow-list is a later hardening item.

## Edge cases checked
- `safeNext` (`auth-routing.ts:28-34`): `//x`, `/\x`, `https://`, backslash, control chars, tab trick all refused; `%2f` forms decode to `//` before check. Re-validated in Login page, `buildCallbackUrl`, callback and proxy. FR-605 met.
- Sign-out: `Promise.race` 5 s budget, then explicit cookie expiry of `sb-*-auth-token(.N|-code-verifier)`; full-page `location.replace` (no cached RSC). Errors logged as message only, never tokens. Idempotent. N06 met.
- Missing profile: server renders only `ProfileRecoveryRedirect`; `error` param stops the proxy bounce. No loop.
- Locale: cookie only accepted when exactly `vi`/`en`; Accept-Language q-weights handled; per-key fallback to `vi`; dynamic `import()` path built from a validated `Locale` + closed namespace union (no traversal). vi/en key parity 25/8/5/9, all referenced literal keys exist.
- Caching: root, `(shell)`, admin, login, pages use `instant = false`; `getSessionSummary` calls `connection()`; `/me` is `no-store`, 5 s. 403/404 call no `/me`. Server never writes cookies (`setAll` no-op).
- Test helpers: `e2e/support/*` not imported by `src/` (grep clean); signing key refused for non-localhost; `supabase/signing_keys.json` and `playwright/.auth/` gitignored; SQL helper validates email before interpolation.
- Sizes: all files <200 lines (largest `e2e/app-shell-and-locale.spec.ts` 199); names kebab-case; no `console.log`, TODO, `any` or `dangerouslySetInnerHTML` found.

## Done well
Pure, unit-tested cores (`auth-routing`, `session-summary`, `session-cookie-names`, `nav-active-item`); single `ShellActions` mount point; `useDismissablePopover` shared across three widgets (DRY); `role="alert"` on login errors with fixed reason keys (no reflected URL text); admin gate documented as cosmetic with Go as authority; no login-bypass flag anywhere in app code.

## Acceptance vs plan
FR-605, FR-402/N06, BR-003 locale, R22 recovery, R23 timeouts (server), 403/404 minimal chrome, admin gate, file-size and naming rules: met. Menu a11y (FR keyboard/Escape): Escape met, keyboard model partial (Warning 1). Browser `/me` timeout (R23 "every backend wait"): not met in `MeRefresher` (Warning 2).

## Actions in order
1. Add timeout to `goApiBrowser` / MeRefresher refresh (Warning 2).
2. Fix menu semantics + focusout close (Warning 1).
3. Note admin-gate-per-mount rule in phase 11 (Warning 3).
4. Suggestions 1-3 and copy decision 6.

## Numbers
- tsc errors 0; eslint findings 0; vitest 104/104. Coverage and type-coverage not measured. Playwright not executed.

## Unresolved
- Playwright specs unexecuted by reviewer (need local Supabase via WSL).
- Forbidden copy (Suggestion 6) and low-res assets are product/design decisions.

**Status:** DONE_WITH_CONCERNS
**Summary:** 0 critical, 3 warnings, 7 suggestions. Safe to merge after Warnings 1-2; Warning 3 is a plan note.
