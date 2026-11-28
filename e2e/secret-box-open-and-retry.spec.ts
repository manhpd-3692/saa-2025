import { expect, test, type Page } from "@playwright/test";
import { API_BASE_URL, bearerFor, distinctIcons, ensureUnopenedBoxes, ICONS, resetBoxes, signIn, sql, unopenedBoxes } from "./support/gamification-fixtures";
import { ANONYMOUS, DEMO_SUNNER_01 as AN, requireState, stateOrAnonymous, USER_STATE } from "./support/test-sessions";

/**
 * F008 Secret Box window (phase 8) against the running stack, `live` seed: opened from the Live
 * board's "Mở Secret Box", one box per click through POST /api/v1/me/secret-boxes/open with an
 * Idempotency-Key. Box inventories of the two extra demo Sunners are set by fixture rows (the
 * open itself is always the real endpoint). Covers F008 FR-102, FR-205..207, FR-404, FR-409,
 * FR-602, BR-007, BR-008, BR-010, DEC-004, DEC-005, SC-006, SC-012, SC-013 and tracker rows 36–50.
 */
test.use({ locale: "vi-VN", storageState: stateOrAnonymous(USER_STATE) });
test.beforeEach(() => requireState(USER_STATE));

const OPEN_PATH = "**/api/v1/me/secret-boxes/open";
const SUNNER_23 = { userId: "d0000000-0000-4000-8000-000000000023", email: "sunner23.demo@sun-asterisk.com", name: "Tô Việt Hoàng" };
const SUNNER_24 = { userId: "d0000000-0000-4000-8000-000000000024", email: "sunner24.demo@sun-asterisk.com", name: "Lâm Khánh Vy" };
const modal = (page: Page) => page.getByRole("dialog", { name: /KHÁM PHÁ SECRET BOX CỦA BẠN|Chúc mừng/ });
const picture = (page: Page) => modal(page).getByTestId("secret-box-picture");
const pad2 = (n: number) => String(n).padStart(2, "0");
const latestOpen = (userId: string) =>
  sql(`select icon || '|' || open_request_id || '|' || (open_result->>'icon') from public.secret_boxes
    where user_id = '${userId}' and opened_at is not null order by opened_at desc limit 1;`).split("|");

async function openWindow(page: Page) {
  await page.goto("/kudos");
  await page.getByTestId("open-secret-box").click();
  await expect(modal(page)).toBeVisible();
  await expect(modal(page)).toHaveAttribute("data-phase", "ready");
}

test("the window shows the unopened count; a click shakes the box, reveals one icon and the count drops by one (FR-102, FR-205, FR-206, FR-404, BR-007, BR-008, SC-006)", async ({ page }) => {
  const before = ensureUnopenedBoxes(AN.userId, 2);
  await openWindow(page);
  await expect(modal(page).getByTestId("secret-box-hint")).toHaveText("Click vào box để mở");
  await expect(modal(page).getByTestId("secret-box-unopened")).toHaveText(pad2(before));
  await expect(picture(page).locator("[data-picture]")).toHaveAttribute("data-picture", "closed-sparkle");

  await picture(page).click();
  await expect(picture(page).locator("[data-picture]")).toHaveAttribute("data-picture", "opening");
  const revealed = modal(page).locator('[data-picture="revealed"]');
  await expect(revealed).toBeVisible();
  const icon = await revealed.getAttribute("data-icon");
  expect(ICONS).toContain(icon);
  await expect(modal(page).getByTestId("secret-box-unopened")).toHaveText(pad2(before - 1));
  await expect(modal(page).getByTestId("secret-box-collected")).toHaveText(`Icon đã sưu tập ${distinctIcons(AN.userId)}/6`);
  const [storedIcon, key, resultIcon] = latestOpen(AN.userId);
  expect([storedIcon, resultIcon]).toEqual([icon, icon]);
  expect(key).toMatch(/^[0-9a-f-]{36}$/);
  expect(unopenedBoxes(AN.userId)).toBe(before - 1);

  await modal(page).getByRole("button", { name: "Đóng" }).click();
  await expect(modal(page)).toHaveCount(0);
  const sidebarCount = page.getByTestId("board-sidebar").locator("dl > div").filter({ hasText: "Số Secret Box chưa mở:" }).locator("dd");
  await expect(sidebarCount).toHaveText(String(before - 1));
});

test("an open whose answer is lost is retried with the same Idempotency-Key: the same icon, one box consumed (Codex R12, N12, DEC-005, SC-013)", async ({ page }) => {
  const before = ensureUnopenedBoxes(AN.userId, 2);
  const keys: string[] = [];
  let firstBody = "";
  await page.route(OPEN_PATH, async (route) => {
    keys.push(route.request().headers()["idempotency-key"]);
    if (keys.length === 1) {
      firstBody = await (await route.fetch()).text(); // Go commits the open; the browser never hears back
      await route.abort("connectionreset");
      return;
    }
    await route.continue();
  });
  await openWindow(page);
  await picture(page).click();
  await expect(modal(page)).toHaveAttribute("data-phase", "open-error");
  await expect(modal(page).getByTestId("secret-box-hint")).toHaveText("Chưa nhận được kết quả mở box. Hãy thử lại: box sẽ không bị mở thêm lần nữa.");
  expect(unopenedBoxes(AN.userId)).toBe(before - 1);

  await modal(page).getByRole("button", { name: "Thử lại" }).click();
  const revealed = modal(page).locator('[data-picture="revealed"]');
  await expect(revealed).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
  const first = JSON.parse(firstBody) as { icon: string; summary: { unopened: number } };
  await expect(revealed).toHaveAttribute("data-icon", first.icon);
  expect(unopenedBoxes(AN.userId)).toBe(before - 1); // the retry consumed nothing
  await expect(modal(page).getByTestId("secret-box-unopened")).toHaveText(pad2(before - 1));

  await page.unroute(OPEN_PATH);
  await picture(page).click(); // the next box is a new intent
  await expect(modal(page).getByTestId("secret-box-unopened")).toHaveText(pad2(before - 2));
});

test.describe("other Sunners", () => {
  test.use({ storageState: ANONYMOUS });

  test("with no box left the window says so and nothing opens; a box taken in another tab ends in the same empty state (FR-207, DEC-004, SC-006)", async ({ page, context, request, baseURL }) => {
    resetBoxes(SUNNER_24.userId, ["STAY_GOLD"], 0);
    await signIn(context, SUNNER_24, baseURL!);
    await openWindow(page);
    await expect(modal(page).getByTestId("secret-box-hint")).toHaveText("Bạn không còn Secret Box nào để mở.");
    await expect(modal(page).getByTestId("secret-box-unopened")).toHaveText("00");
    await expect(modal(page).getByRole("button", { name: "Mở một Secret Box" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(modal(page)).toHaveCount(0);

    resetBoxes(SUNNER_24.userId, ["STAY_GOLD"], 1);
    await openWindow(page);
    await expect(modal(page).getByTestId("secret-box-unopened")).toHaveText("01");
    const other = await request.post(`${API_BASE_URL}/api/v1/me/secret-boxes/open`, {
      headers: { Authorization: `Bearer ${bearerFor(SUNNER_24, baseURL!)}`, "Idempotency-Key": crypto.randomUUID() },
    });
    expect(other.status()).toBe(200); // the other tab took the last box
    await picture(page).click();
    await expect(modal(page).getByTestId("secret-box-hint")).toHaveText("Bạn không còn Secret Box nào để mở.");
    await expect(modal(page).getByTestId("secret-box-unopened")).toHaveText("00");
    expect(unopenedBoxes(SUNNER_24.userId)).toBe(0);
  });

  test("the open that brings the sixth icon completes the set once: the congratulation box, then all six icons (BR-010, FR-409, SC-012)", async ({ page, context, baseURL }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ reducedMotion: "reduce" }); // no shake or rise: the states switch at once
    resetBoxes(SUNNER_23.userId, ICONS.slice(0, 5), 40); // ROOT_FURTHER missing
    await signIn(context, SUNNER_23, baseURL!);
    await openWindow(page);
    const revealed = modal(page).locator('[data-picture="revealed"]');
    let opens = 0;
    for (let icon = ""; icon !== "ROOT_FURTHER"; ) {
      expect(opens++, "the 1-in-6 draw kept missing for 40 boxes").toBeLessThan(40);
      await expect(modal(page)).toHaveAttribute("data-phase", "ready");
      await picture(page).click();
      await expect(modal(page).getByTestId("secret-box-unopened")).toHaveText(pad2(40 - opens));
      icon = (await revealed.getAttribute("data-icon")) ?? "";
      if (icon !== "ROOT_FURTHER") await expect(modal(page).getByTestId("secret-box-collected")).toHaveText("Icon đã sưu tập 5/6");
    }
    await expect(modal(page).getByTestId("secret-box-collected")).toHaveText("Icon đã sưu tập 6/6");
    await expect(modal(page).getByRole("heading", { name: "Chúc mừng bạn đã nhận được phần quà từ BTC SAA 2025" })).toBeVisible({ timeout: 5000 });
    await expect(modal(page).getByTestId("secret-box-hint")).toHaveText("Click vào box để mở");
    await modal(page).getByRole("button", { name: "Mở phần quà" }).click();
    await expect(modal(page).locator('[data-picture="completed"] li')).toHaveCount(6);
    await expect(modal(page)).toContainText("Trọn bộ 6 icon SAA 2025");
    await expect(modal(page)).toContainText("Phần quà bí ẩn sẽ được trao cho bạn tại SAA 2025.");

    expect(sql(`select icons_completed_at is not null from public.users where id = '${SUNNER_23.userId}';`)).toBe("t");
    await expect
      .poll(() => sql(`select count(*) from public.notifications where recipient_id = '${SUNNER_23.userId}' and kind = 'icons_completed';`))
      .toBe("1");
  });
});
