import { expect, test, type Page } from "@playwright/test";
import { requireState, stateOrAnonymous, USER_STATE } from "./support/test-sessions";

/**
 * F001 keyboard model of the avatar menu, the language menu and the FAB choices
 * (WAI-ARIA menu pattern for the first two): focus on open, arrow keys, Home/End,
 * Escape returns focus to the trigger, focus leaving closes the panel.
 */
test.use({ locale: "vi-VN", storageState: stateOrAnonymous(USER_STATE) });

const account = (page: Page) => page.getByRole("button", { name: /^Tài khoản:/ });
const language = (page: Page) => page.getByRole("button", { name: /^Ngôn ngữ:/ });

test.beforeEach(async ({ page }) => {
  requireState(USER_STATE);
  await page.goto("/");
});

test("avatar menu: focus on open, arrows wrap, Home/End, Escape returns to the trigger", async ({ page }) => {
  const profile = page.getByRole("menuitem", { name: "Profile" });
  const logout = page.getByRole("menuitem", { name: "Logout" });
  await account(page).click();
  await expect(profile).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(logout).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(profile).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(logout).toBeFocused();
  await page.keyboard.press("Home");
  await expect(profile).toBeFocused();
  await page.keyboard.press("End");
  await expect(logout).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(account(page)).toBeFocused();
});

test("avatar menu closes when Tab moves focus out of it", async ({ page }) => {
  await account(page).click();
  await page.keyboard.press("End");
  await expect(page.getByRole("menuitem", { name: "Logout" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("language menu: ArrowDown moves to EN, Escape closes and returns focus", async ({ page }) => {
  await language(page).click();
  await expect(page.getByRole("menuitemradio", { name: "VN" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitemradio", { name: "EN" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(language(page)).toBeFocused();
  await language(page).click();
  await page.keyboard.press("End");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("FAB choices close when focus leaves the FAB", async ({ page }) => {
  const fab = page.getByTestId("fab");
  await fab.getByRole("button", { name: "Mở Thể lệ và Viết KUDOS" }).click();
  await fab.getByRole("button", { name: "Thể lệ" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(fab.getByRole("listitem")).toHaveCount(0);
});
