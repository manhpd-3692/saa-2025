import { expect, test, type Page } from "@playwright/test";
import { setStoredRole } from "./support/local-database";
import { mintLocalSessionCookies } from "./support/local-session-cookies";
import { ADMIN_STATE, ANONYMOUS, DEMO_SUNNER_02 as SUNNER02, requireState, stateOrAnonymous, USER_STATE } from "./support/test-sessions";

/**
 * F001 App shell and i18n (phase 3) against the running stack, `live` seed.
 * Covers SC-001, SC-002, SC-003, SC-004 (Login part), SC-005 (404), SC-008, SC-009,
 * FR-101..104, FR-201, FR-602 and SM-001. The 403 page is in login-and-admin-gate.spec.ts.
 */
test.use({ locale: "vi-VN" });

const mainNav = (page: Page) => page.getByRole("navigation", { name: "Điều hướng chính" });
const accountButton = (page: Page) => page.getByRole("button", { name: /^Tài khoản:/ });

async function accountMenuItems(page: Page): Promise<string[]> {
  await accountButton(page).click();
  const items = (await page.getByRole("menuitem").allInnerTexts()).map((text) => text.trim());
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  return items;
}

test.describe("full shell for a signed-in Sunner", () => {
  test.use({ storageState: stateOrAnonymous(USER_STATE) });

  test("header, footer and FAB wrap the page; exactly one header link is selected (FR-101..104, SC-008)", async ({ page }) => {
    requireState(USER_STATE);
    await page.goto("/");
    await expect(mainNav(page).getByRole("link")).toHaveText(["About SAA 2025", "Award Information", "Sun* Kudos"]);
    await expect(mainNav(page).locator('[aria-current="page"]')).toHaveCount(1);
    await expect(mainNav(page).getByRole("link", { name: "About SAA 2025" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("banner").getByRole("link", { name: "Trang chủ SAA 2025" })).toHaveAttribute("href", "/");
    const footer = page.getByRole("contentinfo");
    const footerLinks = footer.getByRole("navigation").getByRole("link");
    await expect(footerLinks).toHaveText(["About SAA 2025", "Award Information", "Sun* Kudos", "Tiêu chuẩn chung"]);
    const hrefs = await footerLinks.evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs).toEqual(["/", "/awards", "/kudos", "/community-standards"]);
    await expect(footer).toContainText("Bản quyền thuộc về Sun* © 2025");
    await expect(page.getByRole("button", { name: "Thông báo" })).toBeVisible();
    await expect(accountButton(page)).toBeVisible();
    await expect(page.getByTestId("fab")).toBeVisible();
  });

  test("a Sunner's avatar menu lists Profile and Logout only and closes on Escape or outside click (DEC-001)", async ({ page }) => {
    requireState(USER_STATE);
    await page.goto("/");
    expect(await accountMenuItems(page)).toEqual(["Profile", "Logout"]);
    await accountButton(page).click();
    await expect(page.getByRole("menuitem", { name: "Profile" })).toHaveAttribute("href", "/profile");
    await page.mouse.click(700, 500);
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("the FAB opens two choices and closes on Escape, outside click or a pick (FR-104, SM-001)", async ({ page }) => {
    requireState(USER_STATE);
    await page.goto("/");
    const fab = page.getByTestId("fab");
    const open = fab.getByRole("button", { name: "Mở Thể lệ và Viết KUDOS" });
    const choices = fab.getByRole("listitem");
    await open.click();
    await expect(choices).toHaveText(["Thể lệ", "Viết KUDOS"]);
    await page.keyboard.press("Escape");
    await expect(choices).toHaveCount(0);
    await expect(open).toBeFocused();
    await open.click();
    await page.mouse.click(400, 400);
    await expect(choices).toHaveCount(0);
    await open.click();
    await fab.getByRole("button", { name: "Viết KUDOS" }).click();
    await expect(choices).toHaveCount(0);
    await open.click();
    await fab.getByRole("button", { name: "Đóng" }).click();
    await expect(choices).toHaveCount(0);
  });

  test("the language choice applies at once and survives reloads and other pages (SC-001, FR-401)", async ({ page, context }) => {
    requireState(USER_STATE);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    await page.getByRole("button", { name: "Ngôn ngữ: VN" }).click();
    await page.getByRole("menuitemradio", { name: "EN" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("contentinfo")).toContainText("Community Standards");
    await expect(page.getByRole("button", { name: "Language: EN" })).toBeVisible();
    expect((await context.cookies()).find((c) => c.name === "saa_locale")).toMatchObject({ value: "en", sameSite: "Lax" });
    await page.reload();
    await expect(page.getByRole("contentinfo")).toContainText("Copyright © 2025 Sun*");
    const other = await context.newPage();
    await other.goto("/a-page-that-does-not-exist");
    await expect(other.getByRole("heading", { level: 1 })).toHaveText("NOT FOUND");
  });

  test("an unknown URL shows the localized 404 page in the minimal chrome (SC-005, FR-402)", async ({ page, context, baseURL }) => {
    requireState(USER_STATE);
    const response = await page.goto("/a-page-that-does-not-exist");
    expect(response?.status()).toBe(404);
    const notFound = page.getByTestId("not-found-page");
    await expect(notFound.getByRole("heading", { level: 1 })).toHaveText("KHÔNG TÌM THẤY");
    await expect(mainNav(page)).toHaveCount(0);
    await expect(accountButton(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ngôn ngữ: VN" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toHaveText("Bản quyền thuộc về Sun* © 2025");
    await context.addCookies([{ name: "saa_locale", value: "en", url: baseURL! }]);
    await page.reload();
    await expect(notFound.getByRole("heading", { level: 1 })).toHaveText("NOT FOUND");
    await expect(notFound).toContainText("The resource you’re looking for doesn’t exist or has been removed.");
    await notFound.getByRole("link", { name: "Back to Homepage" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  });

  test("desktop only: no sideways scroll at 1280 px, the layout is kept and scrolls at 1024 px (SC-009)", async ({ page }) => {
    requireState(USER_STATE);
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    for (const path of ["/", "/a-page-that-does-not-exist"]) {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);
      expect(await overflow(), path).toBeLessThanOrEqual(0);
      await page.setViewportSize({ width: 1024, height: 900 });
      expect(await overflow(), path).toBeGreaterThan(0);
    }
    await page.goto("/"); // at 1024 px the header keeps its desktop row
    const linkTops = await mainNav(page).getByRole("link").evaluateAll((links) => links.map((a) => a.getBoundingClientRect().top));
    expect(new Set(linkTops).size).toBe(1);
  });
});

test.describe("avatar menu for an admin", () => {
  test.use({ storageState: stateOrAnonymous(ADMIN_STATE) });
  test("an admin sees Profile, Admin and Logout (SC-003, DEC-001)", async ({ page }) => {
    requireState(ADMIN_STATE);
    await page.goto("/");
    expect(await accountMenuItems(page)).toEqual(["Profile", "Admin", "Logout"]);
    await accountButton(page).click();
    await expect(page.getByRole("menuitem", { name: "Admin" })).toHaveAttribute("href", "/admin");
  });
});

test.describe("role refresh on window focus", () => {
  test.use({ storageState: ANONYMOUS });

  test("the Admin item follows a stored role change when the tab regains focus, without a reload (FR-601, SC-008)", async ({ page, context, baseURL }) => {
    test.setTimeout(120_000); // each role change is a psql call through `wsl docker`
    await context.addCookies(mintLocalSessionCookies(SUNNER02, baseURL!));
    const refocus = async () => {
      const me = page.waitForResponse((r) => r.url().endsWith("/api/v1/me") && r.request().method() === "GET");
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      expect((await me).status()).toBe(200);
    };
    try {
      await page.goto("/");
      await page.evaluate(() => Object.assign(window, { __noReload: true }));
      expect(await accountMenuItems(page)).toEqual(["Profile", "Logout"]);
      expect(setStoredRole(SUNNER02.email, "admin")).toBe("admin");
      await refocus();
      expect(await accountMenuItems(page)).toEqual(["Profile", "Admin", "Logout"]);
      expect(setStoredRole(SUNNER02.email, "user")).toBe("user");
      await refocus();
      expect(await accountMenuItems(page)).toEqual(["Profile", "Logout"]);
      expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
    } finally {
      setStoredRole(SUNNER02.email, "user");
    }
  });
});

test.describe("language before sign-in", () => {
  test.use({ storageState: ANONYMOUS });

  test("Login has only the language switch and copyright as chrome; EN applies at once and is kept (SC-004, FR-602, US005)", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("contentinfo")).toHaveText("Bản quyền thuộc về Sun* © 2025");
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Thông báo" })).toHaveCount(0);
    await expect(accountButton(page)).toHaveCount(0);
    await expect(page.getByTestId("fab")).toHaveCount(0);
    await expect(page.getByText("Bắt đầu hành trình của bạn cùng SAA 2025.")).toBeVisible();
    await page.getByRole("banner").getByRole("button", { name: "Ngôn ngữ: VN" }).click();
    await expect(page.getByRole("menuitemradio", { name: "VN" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("menuitemradio", { name: "EN" }).click();
    await expect(page.getByText("Start your journey with SAA 2025.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Start your journey with SAA 2025.")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  for (const [browserLocale, expected] of [["vi-VN", "vi"], ["en-US", "en"]] as const) {
    test.describe(`browser language ${browserLocale}`, () => {
      test.use({ locale: browserLocale });

      test(`an unsupported saved language is ignored and ${expected} is used (SC-002, BR-003)`, async ({ page, context, baseURL }) => {
        await context.addCookies([{ name: "saa_locale", value: "xx", url: baseURL! }]);
        await page.goto("/login");
        await expect(page.locator("html")).toHaveAttribute("lang", expected);
      });
    });
  }
});
