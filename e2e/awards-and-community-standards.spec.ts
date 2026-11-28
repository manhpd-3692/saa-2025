import { expect, request, test, type Page } from "@playwright/test";
import {
  AWARD_NAMES,
  AWARD_PRIZES,
  AWARD_QUANTITIES,
  MENU_LABELS,
  activeMenuLabel,
} from "./support/homepage-fixtures";
import { landing } from "./support/launch-gate-fixtures";
import { ANONYMOUS, USER_STATE, requireState, stateOrAnonymous } from "./support/test-sessions";

/**
 * F004 Awards Information and Community Standards (phase 5) against the running stack, `live`
 * seed (no event switching). Covers SC-001..SC-004, SC-006, SC-011, FR-001, FR-002, FR-102,
 * FR-103, FR-301..FR-305, FR-351, FR-352, FR-401, FR-402, FR-601, BR-001..BR-003, US003, US004.
 */
test.use({ locale: "vi-VN", storageState: stateOrAnonymous(USER_STATE) });
test.beforeEach(() => requireState(USER_STATE));

const menu = (page: Page) => page.getByRole("navigation", { name: "Hệ thống giải thưởng" });
const card = (page: Page, name: string) => page.getByRole("article", { name, exact: true });
const cardTop = async (page: Page, name: string) => (await card(page, name).boundingBox())?.y ?? -1;
const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

test("six award cards in catalog order with quantity, unit and prize; only Signature has two prizes (SC-001, SC-002, BR-001, BR-002)", async ({ page }) => {
  await page.goto("/awards");
  await expect(page.getByRole("heading", { level: 1, name: "Hệ thống giải thưởng SAA 2025" })).toBeVisible();
  await expect(page.getByText("Sun* Annual Awards 2025", { exact: true })).toBeVisible();
  await expect(menu(page).getByRole("link")).toHaveText(MENU_LABELS);
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(6);
  await expect(cards.getByRole("heading", { level: 2 })).toHaveText(AWARD_NAMES);
  for (const [index, name] of AWARD_NAMES.entries()) {
    const award = card(page, name);
    await expect(award.getByTestId("award-prize"), name).toHaveText(AWARD_PRIZES[index]);
    await expect(award.getByTestId("award-quantity"), name).toHaveText(AWARD_QUANTITIES[index]);
    await expect(award, name).toContainText("Số lượng giải thưởng:");
  }
  const signature = card(page, "Signature 2025 - Creator");
  await expect(signature).toContainText("Cá nhân hoặc tập thể");
  await expect(signature).toContainText(/5\.000\.000 VNĐcho giải cá nhânHoặcGiá trị giải thưởng:8\.000\.000 VNĐcho giải tập thể/);
  await expect(card(page, "Top Project")).toContainText("Tập thể");
  await expect(page.getByText("Hoặc", { exact: true })).toHaveCount(1);
  // FR-305: the Kudos block closes the page and leads to the board.
  await expect(page.getByRole("link", { name: "Chi tiết: Sun* Kudos" })).toHaveAttribute("href", "/kudos");
});

test("an award link lands on that card with its menu item marked; an unknown one stays at the top (SC-003, BR-003)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto("/awards#mvp");
  await expect.poll(() => cardTop(page, "MVP (Most Valuable Person)")).toBeLessThan(200);
  expect(await cardTop(page, "MVP (Most Valuable Person)")).toBeGreaterThanOrEqual(80);
  await expect.poll(() => activeMenuLabel(page)).toBe("MVP");

  await page.goto("about:blank"); // a fresh load, not a same-document fragment change
  await page.goto("/awards#unknown");
  await page.waitForTimeout(500);
  expect(await scrollY(page)).toBe(0);
  await expect.poll(() => activeMenuLabel(page)).toBe("Top Talent");
  await expect(page.getByRole("heading", { level: 1, name: "Hệ thống giải thưởng SAA 2025" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0); // only the empty route announcer
  expect(errors).toEqual([]);
});

test("a menu pick scrolls to the award, marks it, puts it in the address; Back returns (FR-401, US003)", async ({ page }) => {
  await page.goto("/awards");
  await expect.poll(() => activeMenuLabel(page)).toBe("Top Talent");
  await menu(page).getByRole("link", { name: "Best Manager" }).click();
  await expect(page).toHaveURL("/awards#best-manager");
  await expect.poll(() => activeMenuLabel(page)).toBe("Best Manager");
  await expect.poll(() => cardTop(page, "Best Manager")).toBeLessThan(200);
  expect(await cardTop(page, "Best Manager")).toBeGreaterThanOrEqual(80);
  // The menu is sticky: still on screen after the long scroll.
  const menuBox = await menu(page).boundingBox();
  expect(menuBox!.y).toBeGreaterThanOrEqual(80);
  expect(menuBox!.y).toBeLessThan(200);
  await expect(card(page, "Best Manager")).toBeFocused();

  await page.goBack();
  await expect(page).toHaveURL("/awards");
});

test("keyboard focus on a menu item shows a gold outline on the dark page (WCAG 2.4.7)", async ({ page }) => {
  await page.goto("/awards");
  await menu(page).getByRole("link", { name: "Top Talent" }).focus();
  await page.keyboard.press("Tab");
  const focused = menu(page).getByRole("link", { name: "Top Project", exact: true });
  await expect(focused).toBeFocused();
  await expect(focused).toHaveCSS("outline-style", "solid");
  await expect(focused).toHaveCSS("outline-width", "2px");
  await expect(focused).toHaveCSS("outline-color", "rgb(255, 234, 158)");
});

test("scrolling by hand moves the marked menu item through the awards in order (SC-004, FR-402, DEC-002)", async ({ page }) => {
  await page.goto("/awards");
  await expect.poll(() => activeMenuLabel(page)).toBe("Top Talent");
  const seen = [await activeMenuLabel(page)];
  const bottom = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (let step = 0; step < 80 && (await scrollY(page)) < bottom; step++) {
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(120);
    const label = await activeMenuLabel(page);
    if (label !== seen.at(-1)) seen.push(label);
  }
  expect(seen).toEqual(MENU_LABELS);
});

test("Community Standards from the footer: ten numbered rules and the security standards (US004, FR-103, FR-351, FR-352)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Tiêu chuẩn chung" }).click();
  await expect(page).toHaveURL("/community-standards");
  await expect(page.getByRole("heading", { level: 1, name: "Tiêu chuẩn cộng đồng" })).toBeVisible();
  const rules = page.getByTestId("community-rules").getByRole("listitem");
  await expect(rules).toHaveCount(10);
  await expect(rules.first()).toHaveText("Sử dụng từ ngữ thô tục, chửi bậy, hay có nội dung xúc phạm, bôi nhọ.");
  await expect(rules.last()).toHaveText("Mức độ “tim” tăng đột biến bất thường (theo hành vi người dùng trung bình).");
  expect(await page.getByTestId("community-rules").evaluate((list) => list.tagName)).toBe("OL");
  const security = page.getByRole("region", { name: "Tiêu chuẩn bảo mật" });
  await expect(security.getByRole("listitem")).toHaveCount(2);
  await expect(security).toContainText("Sunner cam kết bảo vệ thông tin.");
  await expect(security).toContainText("Liên hệ Hỗ trợ:");
});

test("signed out, every F004 page goes to Login (SC-006, FR-601)", async ({ baseURL }) => {
  const anonymous = await request.newContext({ baseURL, storageState: ANONYMOUS });
  expect(await landing(anonymous, "/")).toBe("307 /login");
  expect(await landing(anonymous, "/awards")).toBe("307 /login?next=%2Fawards");
  expect(await landing(anonymous, "/community-standards")).toBe("307 /login?next=%2Fcommunity-standards");
  await anonymous.dispose();
});

test("English shows the English copy the design has and Vietnamese for the rest (FR-002, D004)", async ({ page, context, baseURL }) => {
  // The image-unavailable label (an artwork prop in the server HTML) is the one cached Awards string that
  // differs by locale. No page.route here: routing makes Chromium send `cache-control: no-cache`, and
  // `next dev` then bypasses `use cache`, which would hide a leak. page.request shares the context cookies.
  const awardsHtml = async () => (await page.request.get("/awards")).text();
  await context.addCookies([{ name: "saa_locale", value: "en", url: baseURL! }]);
  await page.goto("/community-standards");
  await expect(page.getByRole("heading", { level: 1, name: "Community Standards" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Tiêu chuẩn bảo mật" })).toBeVisible();
  await expect(page.getByTestId("community-rules").getByRole("listitem").first()).toContainText("Sử dụng từ ngữ thô tục");
  await page.goto("/awards");
  await expect(page.getByText("Sun* Annual Awards 2025", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Hệ thống giải thưởng SAA 2025" })).toBeVisible();
  await expect(card(page, "MVP (Most Valuable Person)")).toContainText("Giá trị giải thưởng:");
  expect(await awardsHtml()).toContain("Image unavailable");
  await page.goto("/");
  await expect(page.getByText("Coming soon", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "ABOUT KUDOS" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Hệ thống giải thưởng" })).toBeVisible();

  // `use cache` is keyed by locale: back on Vietnamese, neither page may serve the English render.
  await context.addCookies([{ name: "saa_locale", value: "vi", url: baseURL! }]);
  await page.goto("/community-standards");
  await expect(page.getByRole("heading", { level: 1, name: "Tiêu chuẩn cộng đồng" })).toBeVisible();
  const viAwards = await awardsHtml();
  expect(viAwards).toContain("Không tải được hình ảnh");
  expect(viAwards).not.toContain("Image unavailable");
});

test("1280 px keeps the desktop layout without sideways scroll; narrower windows scroll sideways (SC-011, R17)", async ({ page }) => {
  const layout = () =>
    page.evaluate(() => {
      const box = (el: Element | null) => el?.getBoundingClientRect();
      const menuBox = box(document.querySelector("nav[aria-label] a[href='#top-talent']"));
      const cardBox = box(document.getElementById("top-talent"));
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, menuRight: menuBox?.right ?? 0, cardLeft: cardBox?.left ?? 0, menuTop: menuBox?.top ?? 0, cardTop: cardBox?.top ?? -1 };
    });
  for (const [width, scrolls] of [[1280, false], [1024, true]] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/awards");
    const awards = await layout();
    expect(awards.overflow > 0, `awards ${width}`).toBe(scrolls);
    expect(awards.menuRight, `menu beside the cards at ${width}`).toBeLessThan(awards.cardLeft);
    expect(Math.abs(awards.menuTop - awards.cardTop)).toBeLessThan(10);
    await page.goto("/");
    const firstRow = await page.getByRole("heading", { level: 3 }).evaluateAll((titles) => titles.slice(0, 3).map((t) => Math.round(t.getBoundingClientRect().top)));
    expect(new Set(firstRow).size, `three cards per row at ${width}`).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(scrolls);
  }
});
