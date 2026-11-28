import { expect, test, type Page } from "@playwright/test";
import { runLocalSql } from "./support/local-database";
import { DEMO_SUNNER_02 as RECEIVER, requireState, stateOrAnonymous, USER_STATE } from "./support/test-sessions";

/**
 * F005 write / edit / send kudos (phase 6) against the running stack, `live` seed, as the demo
 * Sunner `sunner01.demo` sending to `sunner02.demo`. Covers FR-101, FR-102, FR-201..210, FR-401..405,
 * BR-001..006, SC-001 (UI side), SC-002 (validation state) and F001 SC-007 (no language switch while
 * the window is open). Kudos created here stay in the local database like demo data.
 */
test.use({ locale: "vi-VN", storageState: stateOrAnonymous(USER_STATE) });

// A real 1x1 PNG: Go sniffs the stored object's magic number (R03).
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const png = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `photo-${i + 1}.png`, mimeType: "image/png", buffer: PNG }));
const UUID = /^[0-9a-f-]{36}$/;
const sql = (query: string) => runLocalSql(query);

const dialog = (page: Page) => page.getByRole("dialog");
const editor = (page: Page) => dialog(page).getByRole("textbox", { name: "Lời nhắn" });
const sendButton = (page: Page) => dialog(page).getByRole("button", { name: "Gửi", exact: true });
const focusInDialog = (page: Page) => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
const placeholder = (page: Page) => dialog(page).getByText("Hãy gửi gắm lời cám ơn và ghi nhận đến đồng đội tại đây nhé!");

async function openCompose(page: Page) {
  await page.goto("/");
  await page.getByTestId("fab").getByRole("button", { name: "Mở Thể lệ và Viết KUDOS" }).click();
  await page.getByTestId("fab").getByRole("button", { name: "Viết KUDOS" }).click();
  await expect(dialog(page).getByRole("heading", { name: "Gửi lời cám ơn và ghi nhận đến đồng đội" })).toBeVisible();
  await expect(editor(page)).toBeVisible();
}

async function pickRecipient(page: Page) {
  await dialog(page).getByRole("combobox").fill("Trần");
  await dialog(page).getByRole("option", { name: new RegExp(RECEIVER.name) }).click();
}

async function addHashtag(page: Page, name: string) {
  await dialog(page).getByTestId("hashtag-add").click();
  const search = page.getByRole("textbox", { name: "Tìm hoặc thêm hashtag" });
  await search.fill(name);
  await search.press("Enter");
  await search.press("Escape");
}

async function fillValidKudo(page: Page, title: string) {
  await pickRecipient(page);
  await dialog(page).getByLabel("Danh hiệu").fill(title);
  await editor(page).click();
  await page.keyboard.type("Cảm ơn bạn đã luôn đồng hành!");
  await addHashtag(page, "e2e-kudos");
}

async function attach(page: Page, count: number) {
  await dialog(page).getByTestId("image-input").setInputFiles(png(count));
  await expect(dialog(page).locator('[data-testid="image-thumb"][data-status="ready"]')).toHaveCount(Math.min(count, 5));
}

/** Clicks the submit button and returns the created/edited kudo id from Go's answer. */
async function submit(page: Page, method: "POST" | "PATCH", label = "Gửi"): Promise<string> {
  const response = page.waitForResponse((r) => r.request().method() === method && /\/api\/v1\/kudos(\/[0-9a-f-]+)?$/.test(r.url()));
  await dialog(page).getByRole("button", { name: label, exact: true }).click();
  const answer = await response;
  expect(answer.status(), await answer.text()).toBe(method === "POST" ? 201 : 200);
  const { kudoId } = (await answer.json()) as { kudoId: string };
  expect(kudoId).toMatch(UUID);
  await expect(dialog(page)).toHaveCount(0);
  return kudoId;
}

test.beforeEach(() => requireState(USER_STATE));

test("the FAB opens the window and the language switch is disabled until it closes (FR-101, F001 SC-007)", async ({ page }) => {
  await openCompose(page);
  const language = page.getByTestId("locale-switcher").getByRole("button");
  await expect(language).toBeDisabled();
  await expect(placeholder(page)).toBeVisible(); // empty message shows the placeholder
  await expect(language).toHaveAttribute("title", "Đóng biểu mẫu để đổi ngôn ngữ.");
  const standards = dialog(page).getByRole("link", { name: "Tiêu chuẩn cộng đồng" }); // FR-210
  await expect(standards).toHaveAttribute("href", "/community-standards");
  await expect(standards).toHaveAttribute("target", "_blank");
  await dialog(page).getByRole("button", { name: "Hủy" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(language).toBeEnabled();
});

test("focus stays inside the window and returns to the FAB when it closes (WAI-ARIA dialog)", async ({ page }) => {
  await openCompose(page);
  expect(await focusInDialog(page)).toBe(true);
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab"); // more stops than the window has: it must wrap
    expect(await focusInDialog(page), `after ${i + 1} Tab`).toBe(true);
  }
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await focusInDialog(page), `after ${i + 1} Shift+Tab`).toBe(true);
  }
  await dialog(page).getByRole("button", { name: "Hủy" }).click();
  await expect(page.getByTestId("fab").getByRole("button", { name: "Mở Thể lệ và Viết KUDOS" })).toBeFocused();
});

test("Escape closes the window exactly like Hủy and deletes its unsaved upload (FR-405, D012)", async ({ page }) => {
  await openCompose(page);
  await attach(page, 1);
  await dialog(page).getByLabel("Danh hiệu").fill("Sẽ bị bỏ");
  const discarded = page.waitForResponse((r) => r.request().method() === "DELETE" && r.url().includes("/api/v1/uploads/"));
  await dialog(page).getByLabel("Danh hiệu").press("Escape");
  expect((await discarded).status()).toBe(204);
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByTestId("fab").getByRole("button", { name: "Mở Thể lệ và Viết KUDOS" })).toBeFocused();
});

test("recipient dropdown lists Sunners with their unit and never the sender (FR-201, BR-001)", async ({ page }) => {
  await openCompose(page);
  const recipient = dialog(page).getByRole("combobox");
  await recipient.fill("Trần");
  const option = dialog(page).getByRole("option", { name: new RegExp(RECEIVER.name) });
  await expect(option).toContainText("CECV1");
  await option.click();
  await expect(recipient).toHaveValue(RECEIVER.name);
  await recipient.fill("Nguyễn Văn An"); // the signed-in sender
  await expect(dialog(page).getByRole("listbox")).toContainText("Không tìm thấy Sunner phù hợp.");
});

test("hashtag dropdown picks shared tags, adds new ones and stops at five (FR-205, BR-002, DEC-002)", async ({ page }) => {
  await openCompose(page);
  await dialog(page).getByTestId("hashtag-add").click();
  const list = page.getByRole("listbox", { name: "Danh sách hashtag" });
  await list.getByRole("option", { name: "#teamwork" }).click();
  await expect(list.getByRole("option", { name: "#teamwork" })).toHaveAttribute("aria-selected", "true");
  const search = page.getByRole("textbox", { name: "Tìm hoặc thêm hashtag" });
  for (const name of ["#E2E One", "e2e two", "E2E TWO", "e2e three", "e2e four"]) {
    await search.fill(name);
    await search.press("Enter");
  }
  await search.press("Escape");
  const chips = dialog(page).getByRole("button", { name: /^Xoá hashtag/ });
  await expect(chips).toHaveCount(5); // "E2E TWO" is the same tag as "e2e two"
  await expect(dialog(page).getByTestId("hashtag-add")).toBeDisabled();
  await dialog(page).getByRole("button", { name: "Xoá hashtag #e2e one" }).click();
  await expect(chips).toHaveCount(4);
  await expect(dialog(page).getByTestId("hashtag-add")).toBeEnabled();
});

test("the add-link box inserts an http(s) link and refuses anything else (FR-209)", async ({ page }) => {
  await openCompose(page);
  await editor(page).click();
  await page.keyboard.type("Xem ");
  await dialog(page).getByRole("button", { name: "Thêm đường dẫn" }).click();
  const box = page.getByRole("dialog", { name: "Thêm đường dẫn" });
  await box.getByLabel("Nội dung").fill("trang SAA");
  await box.getByLabel("URL").fill("javascript:alert(1)");
  await box.getByRole("button", { name: "Lưu" }).click();
  await expect(box).toContainText("Hãy nhập một đường dẫn http:// hoặc https:// hợp lệ.");
  await box.getByLabel("URL").fill("example.com/saa");
  await box.getByRole("button", { name: "Lưu" }).click();
  await expect(box).toHaveCount(0);
  await expect(editor(page).getByRole("link", { name: "trang SAA" })).toHaveAttribute("href", "https://example.com/saa");
  await expect(dialog(page).getByTestId("content-counter")).toHaveText("13/1.000"); // "Xem trang SAA"
});

test("typing @ suggests Sunners and inserts a mention counted as its @Name (FR-204, FR-203)", async ({ page }) => {
  await openCompose(page);
  await editor(page).click();
  await page.keyboard.type("Cảm ơn @Trần");
  const suggestions = page.getByTestId("mention-list");
  await expect(suggestions.getByRole("option", { name: new RegExp(RECEIVER.name) })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(editor(page).locator('span[data-type="mention"]')).toHaveText(`@${RECEIVER.name}`);
  await expect(dialog(page).getByTestId("content-counter")).toHaveText("21/1.000");
});

test("Gửi with missing fields shows the error state and sends nothing; fixing them sends (FR-208, US007)", async ({ page }) => {
  await openCompose(page);
  let posts = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/v1/kudos")) posts++;
  });
  await sendButton(page).click();
  await expect(page.getByTestId("compose-error")).toHaveText("Bạn cần điền đủ Người nhận, Lời nhắn gửi và Hashtag để gửi Kudos!");
  await expect(dialog(page).getByText("Hãy nhập danh hiệu cho Kudos.")).toBeVisible();
  await expect(dialog(page).getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
  expect(posts).toBe(0);
  await fillValidKudo(page, "E2E sửa lỗi rồi gửi");
  await submit(page, "POST");
  await expect(page.getByRole("status").filter({ hasText: "Gửi Kudos thành công!" })).toBeVisible();
});

test("1,001 visible characters are blocked; 1,000 are allowed (FR-203, BR-004)", async ({ page }) => {
  await openCompose(page);
  await fillValidKudo(page, "E2E giới hạn ký tự");
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText("a".repeat(1001));
  const counter = dialog(page).getByTestId("content-counter");
  await expect(counter).toHaveText("1.001/1.000");
  await sendButton(page).click();
  await expect(dialog(page).getByText("Lời nhắn tối đa 1.000 ký tự.")).toBeVisible();
  await expect(dialog(page)).toBeVisible();
  await editor(page).press("Backspace"); // focus left the editor for the Gửi button
  await expect(counter).toHaveText("1.000/1.000");
  const kudoId = await submit(page, "POST");
  expect(sql(`select length(content) - length('<p></p>') from public.kudos where id = '${kudoId}';`)).toBe("1000");
});

test("a named kudo with images is saved and its recipient notified with the sender (FR-401, FR-206, SC-001)", async ({ page }) => {
  await openCompose(page);
  await fillValidKudo(page, "E2E kudo có ảnh");
  await attach(page, 2);
  const kudoId = await submit(page, "POST");
  expect(sql(`select k.is_anonymous || '|' || k.receiver_id || '|' ||
    (select string_agg(u.state::text, ',') from public.kudo_images ki join public.kudo_uploads u on u.id = ki.upload_id where ki.kudo_id = k.id)
    from public.kudos k where k.id = '${kudoId}';`)).toBe(`false|${RECEIVER.userId}|attached,attached`);
  expect(sql(`select params->>'senderName' from public.notifications where kudo_id = '${kudoId}' and kind = 'kudo_received';`)).toBe("Nguyễn Văn An");
});

test("an anonymous kudo keeps the sender out of the recipient's notification (FR-207, FR-404, BR-005)", async ({ page }) => {
  await openCompose(page);
  await fillValidKudo(page, "E2E kudo ẩn danh");
  await attach(page, 1);
  await dialog(page).getByRole("checkbox", { name: "Gửi lời cám ơn và ghi nhận ẩn danh" }).check();
  const kudoId = await submit(page, "POST");
  expect(sql(`select is_anonymous from public.kudos where id = '${kudoId}';`)).toBe("t");
  expect(sql(`select params::text from public.notifications where kudo_id = '${kudoId}' and kind = 'kudo_received';`)).not.toMatch(/sender/);
});

test("a sixth image is refused; removed and cancelled unsaved uploads are deleted (FR-206, FR-405, BR-003)", async ({ page }) => {
  const uploadIds: string[] = [];
  page.on("response", async (r) => {
    if (r.request().method() === "POST" && r.url().endsWith("/api/v1/uploads/kudo-images") && r.ok()) uploadIds.push((await r.json()).uploadId);
  });
  await openCompose(page);
  await dialog(page).getByTestId("image-input").setInputFiles(png(6));
  await expect(dialog(page).getByRole("alert").filter({ hasText: "tối đa 5 ảnh JPEG, PNG hoặc WebP" })).toBeVisible();
  await expect(dialog(page).locator('[data-testid="image-thumb"][data-status="ready"]')).toHaveCount(5);
  await expect.poll(() => uploadIds.length).toBe(5);

  const removed = page.waitForResponse((r) => r.request().method() === "DELETE" && r.url().includes("/api/v1/uploads/"));
  await dialog(page).getByRole("button", { name: "Xoá ảnh 1" }).click();
  expect((await removed).status()).toBe(204);
  await expect(dialog(page).getByTestId("image-thumb")).toHaveCount(4);

  let deletes = 0;
  page.on("response", (r) => {
    if (r.request().method() === "DELETE" && r.url().includes("/api/v1/uploads/") && r.status() === 204) deletes++;
  });
  await dialog(page).getByRole("button", { name: "Hủy" }).click();
  await expect.poll(() => deletes).toBe(4);
  expect(uploadIds.every((id) => UUID.test(id))).toBe(true);
  expect(sql(`select count(*) from public.kudo_uploads where id in (${uploadIds.map((id) => `'${id}'`).join(",")});`)).toBe("0");
});

test("two clicks on Gửi in the same instant send one kudo (edge case: double submit)", async ({ page }) => {
  await openCompose(page);
  await fillValidKudo(page, "E2E bấm gửi hai lần");
  let posts = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/v1/kudos")) posts++;
  });
  const created = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/api/v1/kudos"));
  // Both clicks land before React re-renders the button as disabled.
  await sendButton(page).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  expect((await created).status()).toBe(201);
  await expect(dialog(page)).toHaveCount(0);
  await page.waitForTimeout(1000); // a second request would have left by now
  expect(posts).toBe(1);
});

test("a failed send keeps everything typed, and a retry succeeds (FR-402)", async ({ page }) => {
  await openCompose(page);
  await fillValidKudo(page, "E2E gửi lại sau lỗi");
  await attach(page, 1);
  await dialog(page).getByRole("checkbox", { name: "Gửi lời cám ơn và ghi nhận ẩn danh" }).check();
  await page.route("**/api/v1/kudos", (route) => (route.request().method() === "POST" ? route.abort("failed") : route.fallback()));
  await sendButton(page).click();
  await expect(page.getByTestId("compose-error")).toHaveText("Gửi Kudos không thành công. Vui lòng thử lại.");
  await expect(dialog(page).getByLabel("Danh hiệu")).toHaveValue("E2E gửi lại sau lỗi");
  await expect(editor(page)).toHaveText("Cảm ơn bạn đã luôn đồng hành!");
  await expect(dialog(page).getByRole("button", { name: "Xoá hashtag #e2e-kudos" })).toBeVisible();
  await expect(dialog(page).getByRole("checkbox", { name: "Gửi lời cám ơn và ghi nhận ẩn danh" })).toBeChecked();
  await expect(dialog(page).getByTestId("image-thumb")).toHaveCount(1);
  await page.unroute("**/api/v1/kudos");
  await submit(page, "POST");
});

test("the author edits their own kudo with the recipient locked (FR-102, FR-403, BR-006, D004)", async ({ page }) => {
  await openCompose(page);
  await fillValidKudo(page, "E2E trước khi sửa");
  await attach(page, 1);
  const kudoId = await submit(page, "POST");
  const uploadId = sql(`select upload_id from public.kudo_images where kudo_id = '${kudoId}';`);

  // While the prefill loads the window has nothing focusable; Tab must still stay inside it.
  let releasePrefill = () => {};
  const prefillHeld = new Promise<void>((resolve) => (releasePrefill = resolve));
  await page.route("**/api/v1/kudos/*/edit", async (route) => {
    await prefillHeld;
    await route.continue();
  });
  await page.goto(`/?editKudo=${kudoId}`);
  await expect(dialog(page).getByText("Đang tải...")).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press(i === 1 ? "Shift+Tab" : "Tab");
    expect(await focusInDialog(page), `loading, key ${i + 1}`).toBe(true);
  }
  releasePrefill();
  await expect(dialog(page).getByRole("heading", { name: "Chỉnh sửa bài viết của bạn" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog(page).getByTestId("recipient-locked")).toHaveText(RECEIVER.name);
  await expect(dialog(page).getByRole("combobox")).toHaveCount(0);
  await expect(dialog(page).getByLabel("Danh hiệu")).toHaveValue("E2E trước khi sửa");
  await expect(editor(page)).toHaveText("Cảm ơn bạn đã luôn đồng hành!");
  await expect(placeholder(page)).toBeHidden(); // never drawn over the prefilled message
  await expect(dialog(page).getByTestId("image-thumb")).toHaveCount(1);
  await expect(page.getByTestId("locale-switcher").getByRole("button")).toBeDisabled();

  await dialog(page).getByLabel("Danh hiệu").fill("E2E đã sửa");
  await dialog(page).getByRole("button", { name: "Xoá ảnh 1" }).click(); // committed: dropped from the save only
  await dialog(page).getByRole("checkbox", { name: "Gửi lời cám ơn và ghi nhận ẩn danh" }).check();
  await submit(page, "PATCH", "Lưu");
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu thay đổi." })).toBeVisible();
  expect(sql(`select title || '|' || is_anonymous || '|' || receiver_id || '|' ||
    (select count(*) from public.kudo_images where kudo_id = '${kudoId}') from public.kudos where id = '${kudoId}';`)).toBe(`E2E đã sửa|true|${RECEIVER.userId}|0`);
  // Deleted after commit, in the background (the answer does not wait for Storage).
  await expect.poll(() => sql(`select count(*) from public.kudo_uploads where id = '${uploadId}';`), { timeout: 10_000 }).toBe("0");
});
