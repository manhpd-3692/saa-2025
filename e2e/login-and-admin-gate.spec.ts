import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { mintLocalSessionCookies, supabaseSessionCookieNames } from "./support/local-session-cookies";
import { ADMIN_STATE, ANONYMOUS, DEMO_SUNNER_01 as SUNNER01, requireState, stateOrAnonymous, USER_STATE } from "./support/test-sessions";

/**
 * F002 sign-in, session and admin gate (phase 3) against the running stack, `live` seed.
 * Covers SC-003, SC-004 (page part; Go's 403 is proven in phase 2), SC-005, SC-006, SC-011,
 * FR-103, FR-201..203 and F001 SC-005 (403 page). Real Google OAuth stays a manual check:
 * the Login button is followed only up to the Supabase authorize request.
 */
test.use({ locale: "vi-VN" });

const loginButton = (page: Page) => page.getByRole("button", { name: "LOGIN With Google" });
// Next.js adds its own empty role="alert" route announcer, so the message is located by its reason.
const signInMessage = (page: Page) => page.locator("[data-error-reason]");

test.describe("Login for a visitor", () => {
  test.use({ storageState: ANONYMOUS });

  test("protected paths go to Login with an internal return path; public paths answer (SC-003, DEC-001)", async ({ page }) => {
    await page.goto("/kudos?tab=all");
    await expect(page).toHaveURL("/login?next=%2Fkudos%3Ftab%3Dall");
    await page.goto("/admin");
    await expect(page).toHaveURL("/login?next=%2Fadmin");
    await page.goto("/");
    await expect(page).toHaveURL("/login");
    // Public: never sent to Login itself; after the start (live seed) the page sends visitors
    // Home (F003 FR-102), and only "/" asks for sign-in, so no `next=%2Fcountdown` here.
    await page.goto("/countdown");
    await expect(page).toHaveURL("/login");
    await page.goto("/auth/callback"); // public; no code → back to Login with a reason, not a sign-in redirect
    await expect(page).toHaveURL("/login?error=failed");
  });

  test("Login shows the key visual, the copy and the Google button (FR-201)", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 }).getByRole("img", { name: "ROOT FURTHER" })).toBeVisible();
    await expect(page.getByText("Bắt đầu hành trình của bạn cùng SAA 2025.")).toBeVisible();
    await expect(page.getByText("Đăng nhập để khám phá!")).toBeVisible();
    await expect(loginButton(page)).toBeEnabled();
    await expect(signInMessage(page)).toHaveCount(0);
  });

  for (const [reason, message] of [
    ["cancelled", "Bạn đã huỷ đăng nhập. Vui lòng thử lại."],
    ["domain_not_allowed", "Tài khoản Google này không được phép đăng nhập."],
    ["profile_unavailable", "Không tải được hồ sơ của bạn. Vui lòng đăng nhập lại."],
    ["failed", "Chưa thể hoàn tất đăng nhập. Vui lòng thử lại."],
    ["<script>alert(1)</script>", "Chưa thể hoàn tất đăng nhập. Vui lòng thử lại."],
  ] as const) {
    test(`error=${reason} shows its fixed message and a usable button (FR-203)`, async ({ page }) => {
      await page.goto(`/login?error=${encodeURIComponent(reason)}`);
      await expect(signInMessage(page)).toHaveText(message);
      await expect(signInMessage(page)).toHaveAttribute("role", "alert");
      await expect(loginButton(page)).toBeEnabled();
    });
  }

  for (const [next, expectedNext] of [
    ["/kudos?tab=all", "/kudos?tab=all"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
  ] as const) {
    test(`the button starts Google sign-in once with next=${next} → ${expectedNext} (FR-202, SC-005)`, async ({ page }) => {
      const authorizeUrls: string[] = [];
      // Answer 204 so the browser stays on Login: the test checks the redirect, not Google.
      await page.route("**/auth/v1/authorize**", (route) => {
        authorizeUrls.push(route.request().url());
        return route.fulfill({ status: 204 });
      });
      await page.goto(`/login?next=${encodeURIComponent(next)}`);
      await loginButton(page).dblclick();

      await expect.poll(() => authorizeUrls.length).toBe(1);
      await expect(loginButton(page)).toBeDisabled();
      await expect(loginButton(page)).toHaveAttribute("aria-busy", "true");
      const authorize = new URL(authorizeUrls[0]!);
      expect(authorize.searchParams.get("provider")).toBe("google");
      expect(authorize.searchParams.get("hd")).toBe("sun-asterisk.com");
      const callback = new URL(authorize.searchParams.get("redirect_to")!);
      expect(`${callback.origin}${callback.pathname}`).toBe(`${new URL(page.url()).origin}/auth/callback`);
      expect(callback.searchParams.get("next")).toBe(expectedNext);
    });
  }
});

test.describe("signed-in Sunner", () => {
  test.use({ storageState: stateOrAnonymous(USER_STATE) });

  test("opening Login goes to the Homepage unless Login shows a sign-in problem (FR-103, R22)", async ({ page }) => {
    requireState(USER_STATE);
    await page.goto("/login");
    await expect(page).toHaveURL("/");
    await page.goto("/login?error=profile_unavailable");
    await expect(page).toHaveURL("/login?error=profile_unavailable");
  });

  test("a non-admin gets the localized Forbidden page in the minimal chrome on /admin (SC-004, F001 SC-005)", async ({ page, context, baseURL }) => {
    requireState(USER_STATE);
    await page.goto("/admin");
    await expect(page).toHaveURL("/admin");
    const forbidden = page.getByTestId("forbidden-page");
    await expect(forbidden.getByRole("heading", { level: 1 })).toHaveText("Không có quyền truy cập");
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Tài khoản:/ })).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toHaveText("Bản quyền thuộc về Sun* © 2025");

    await context.addCookies([{ name: "saa_locale", value: "en", url: baseURL! }]);
    await page.reload();
    await expect(forbidden.getByRole("heading", { level: 1 })).toHaveText("Access Denied");
    await forbidden.getByRole("link", { name: "Back to Homepage" }).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("signed-in admin", () => {
  test.use({ storageState: stateOrAnonymous(ADMIN_STATE) });

  test("an admin gets the admin chrome on /admin with Overview selected (SC-004, F010 DEC-001)", async ({ page }) => {
    requireState(ADMIN_STATE);
    await page.goto("/admin");
    await expect(page.getByTestId("forbidden-page")).toHaveCount(0);
    const nav = page.getByRole("navigation", { name: "Điều hướng quản trị" });
    await expect(nav.getByRole("link")).toHaveText(["Overview", "Review content", "User", "Settings"]);
    await expect(nav.locator('[aria-current="page"]')).toHaveText("Overview");
    await expect(page.getByRole("banner")).toContainText("ADMIN");
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  });
});

test.describe("session end", () => {
  test.use({ storageState: ANONYMOUS });

  // Sign-out waits at most 5 s for Supabase Auth (R23) before it expires the cookies itself.
  const SIGN_OUT_NAVIGATION = { timeout: 10_000 };

  for (const auth of ["reachable", "unreachable"] as const) {
    test(`Logout ends the session in this browser with Supabase Auth ${auth} (SC-006, FR-104, FR-402)`, async ({ page, context, baseURL }) => {
      // A minted session of the demo user, so the shared storage state is not signed out in GoTrue.
      await context.addCookies(mintLocalSessionCookies(SUNNER01, baseURL!));
      if (auth === "unreachable") await page.route("**/auth/v1/logout**", (route) => route.abort("connectionreset"));
      await page.goto("/");
      await page.getByRole("button", { name: /^Tài khoản:/ }).click();
      await page.getByRole("menuitem", { name: "Logout" }).click();

      await expect(page).toHaveURL("/login", SIGN_OUT_NAVIGATION);
      expect(supabaseSessionCookieNames(await context.cookies())).toEqual([]);
      await page.goto("/kudos");
      await expect(page).toHaveURL("/login?next=%2Fkudos");
    });
  }

  test("a session whose profile cannot be recreated ends on Login without a bounce (SC-011, R22, N06)", async ({ page, context, baseURL }) => {
    // A verified company identity with no auth user and no users row: provision is refused.
    const orphan = { userId: randomUUID(), email: `orphan.e2e.${Date.now()}@sun-asterisk.com`, name: "Orphan E2E" };
    await context.addCookies(mintLocalSessionCookies(orphan, baseURL!));

    // Direct document request: the shell layout renders only the recovery step, no chrome.
    const html = await (await context.request.get("/")).text();
    expect(html).not.toMatch(/<header|<footer|<nav/);

    await page.goto("/");
    await expect(page).toHaveURL("/login?error=profile_unavailable", SIGN_OUT_NAVIGATION);
    await expect(signInMessage(page)).toHaveText("Không tải được hồ sơ của bạn. Vui lòng đăng nhập lại.");
    expect(supabaseSessionCookieNames(await context.cookies())).toEqual([]);

    await page.reload();
    await expect(page).toHaveURL("/login?error=profile_unavailable");
    await expect(loginButton(page)).toBeEnabled();
  });
});
