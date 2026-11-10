# Phase 03 — Auth, app shell, i18n, 403/404 (F001, F002)

## Context Links
- F001: `spec/app-shell-navigation-and-i18n/{functional-spec.md, technical-spec.md}`; screens `SCR-app-shell`, `SCR-error-forbidden`, `SCR-error-not-found`
- F002: `spec/google-sign-in-session-and-roles/{functional-spec.md, technical-spec.md}`; screen `SCR-login`; `spec/system/permissions.md`
- Contract: R07, R17, R18, R22, R23; Addendum N06. Decisions: AD01, AD15, C01, D007 (copy)
- Figma: Header/Footer/FAB `313:9137`/`313:9139`, Dropdown-ngôn ngữ `721:4942`, Dropdown-profile `721:5223`/`721:5277`, Login `662:14387`, 403 `2182:9291`, 404 `1378:5063` (docs/SCREENFLOW.md)
- Next guides: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/{layout,route-groups,not-found}.md`

## Overview
- Priority: P1. Status: pending. Effort: 10h.
- Checklist: **Login**, **Đa ngôn ngữ**, Homepage SAA (shared chrome).
- Finish F002 user-facing flows (styled Login, return path, logout, admin gate) and build all F001 chrome: header,
  nav, avatar menu, locale switch, bell slot, footer, FAB, minimal chrome, 403/404, design tokens.

## Key Insights
- Root layout = html/body/fonts/locale only; `(shell)` full chrome; `(minimal)` Login + 403/404; `countdown/` bare; `admin/layout.tsx` admin chrome + F010 nav (R07).
- 403 is a plain page rendered by `admin/layout.tsx`; visual acceptance only; no `authInterrupts` (AD15, R18). 403/404 always minimal chrome (C01).
- `/me` server fetch `no-store` 5 s in shell/admin layouts; client `MeRefresher` re-fetches on window focus.
- FAB items open F005 modal and F008 rules panel: this phase ships `shell-actions-context.tsx` (open/close state); P6/P8 mount their components and register.
- Bell is a slot; F009 (P10) fills it. Admin nav config (F010 A7) is created here from its spec and owned by P11 afterwards.

## Requirements
- F001: FR-001–FR-004, FR-101–FR-104, FR-201–FR-203, FR-401–FR-403, FR-601, FR-602, BR-001–BR-003, US001–US007; SC-001–SC-009 (SC-007 completed in P6).
- F002: FR-002, FR-003, FR-101–FR-104, FR-201–FR-203, FR-402, FR-403, FR-602, FR-603, FR-605, BR-002, BR-004, US001–US006; SC-003–SC-006, SC-011, SC-012.
- Desktop only, min 1280 px, horizontal scroll below (R17).

## Architecture
```
app/layout.tsx (locale from cookie→Accept-Language→vi)
 ├─ (shell)/layout.tsx  → getMe() → {signedIn, role, displayName, avatarUrl} → Header/Footer/FAB
 │                         403 profile_not_provisioned → provision once → fail → <ProfileRecoveryRedirect/>
 ├─ (minimal)/layout.tsx → MinimalChrome (lang switch + copyright) → login, …
 ├─ countdown/ (bare, P4)        └─ not-found.tsx → MinimalChrome + NotFoundPage
 └─ admin/layout.tsx → getMe() → role≠admin → MinimalChrome + ForbiddenPage ; else AdminChrome(NavLinks(adminNavItems))
LocaleSwitcher → set cookie → router.refresh(); disabled while compose modal open (shell-actions state)
```

## Related Code Files
Modify: `src/app/(shell)/layout.tsx`, `src/app/(minimal)/layout.tsx`, `src/app/admin/layout.tsx`, `src/app/(minimal)/login/page.tsx`, `src/features/auth/google-sign-in-button.tsx`, `src/app/globals.css` (design tokens read from Figma), `src/proxy.ts` (return path `next`, logout redirect), `src/app/layout.tsx` (fonts)
Create
- `src/app/not-found.tsx`
- `src/components/shell/{site-header.tsx, nav-links.tsx, avatar-menu.tsx, locale-switcher.tsx, notification-bell-slot.tsx, site-footer.tsx, floating-action-button.tsx, me-refresher.tsx, minimal-chrome.tsx, admin-chrome.tsx, shell-actions-context.tsx}`
- `src/components/errors/{forbidden-page.tsx, not-found-page.tsx}`
- `src/features/auth/{sign-out-action.ts, login-error-message.tsx}`, `src/lib/auth/get-session-summary.ts`
- `src/features/admin/admin-nav-items.ts` (F010 A7 static config; P11 owns later edits)
- `src/i18n/dictionaries/{vi,en}/{shell,auth,errors}.json`
- `e2e/app-shell-and-locale.spec.ts`, `e2e/login-and-admin-gate.spec.ts`
- Vitest: `src/components/shell/nav-links.test.tsx`, `src/lib/auth/get-session-summary.test.ts`

## Implementation Steps
1. Read Figma frames by eye → Tailwind v4 `@theme` tokens (colors, fonts, spacing, radius) in `globals.css`.
2. Session summary helper (`/me` no-store 5 s; 401 → signed-out; error/timeout → links+language only; 403 → recovery path).
3. Shell layout: header (nav, bell slot, locale switch, avatar menu Profile / Admin-for-admins / Logout), footer (4 links incl. "Tiêu chuẩn chung"), FAB with two items via shell-actions context.
4. Minimal chrome + Login visual (error reasons: `domain_not_allowed`, `failed`, `profile_unavailable`), 403/404 pages.
5. Admin layout gate + admin chrome using `admin-nav-items.ts`.
6. Locale switcher: cookie write, `router.refresh()`, invalid cookie ignored (BR-003); disabled flag read from shell-actions (wired by P6).
7. Logout: browser `signOut()` then navigate to Login; proxy redirects protected paths afterwards.
8. Playwright specs + Vitest units.

## Todo List
- [ ] Design tokens
- [ ] Session summary + recovery handling
- [ ] Shell chrome components
- [ ] Minimal chrome, Login visuals, 403/404
- [ ] Admin layout gate + nav config
- [ ] Locale switcher + logout
- [ ] Tests

## Success Criteria (test plan)
- Playwright (signed-in storageState, `live` seed): F001 SC-001, SC-002, SC-003, SC-004 (Login part; countdown part in P4), SC-005, SC-008, SC-009; F002 SC-003, SC-004 (visual + Go 403 already proven P2), SC-005, SC-006, SC-011 (N06 cookies cleared, Login stable after reload).
- Vitest: NavLinks single active item; session-summary outcome mapping (F001 SC-006, F002 SC-012).
- Manual: VN/EN on Login and signed-in pages (checklist Đa ngôn ngữ); real Google login + logout (checklist Login).

## Scope Contract
- Changed: layouts, shell/error components, Login visuals, proxy return path, i18n namespaces shell/auth/errors.
- Impacted: every page under `(shell)`/`admin`; P6/P8/P10 mount into shell slots.
- Will verify: Playwright for routing/redirect/locale persistence (behaviour lives in browser + proxy), Vitest for pure mapping. Auth/session = safety-critical → full F002 E2E set.
- Deliberately skipped: Go auth internals (proven P1/P2, unchanged).

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| Visual values misread from Figma | M | L | Side-by-side screenshot review at 1280 px in P14 |
| Mount-point change later forces rework (F001 RISK-02) | M | M | Shell-actions context + bell slot fixed here; consumers only register |
| Redirect loop Login ↔ Home on missing profile | L | H | N06 handoff; `error` param keeps user on Login (R22) |

## Security Considerations
- Admin UI gate is cosmetic; Go `RequireAdmin` enforces (F002 BR-004). `next` param internal-only (FR-605).
- No tokens logged; server never writes cookies outside callback/proxy.

## Rollback
- Revert phase commits; Go/schema unaffected. Risk-path Login from P2 remains usable.

## Next Steps
- Unblocks P4–P7, P10. Open items (copy to confirm): F001 messages "Your session has ended…", "You do not have access to this page.", "This page could not be found.", "Close the form to change language."; F002 Login E04 "Your profile could not be loaded…".
