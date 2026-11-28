import { expect, test, type Page } from "@playwright/test";
import { accessTokenOf, addDays, API_BASE_URL, sql, vnToday } from "./support/admin-report-fixtures";
import { bearerFor } from "./support/gamification-fixtures";
import { mintLocalSessionCookies } from "./support/local-session-cookies";
import {
  ADMIN_EMAIL, deleteKudo, insertKudo, kudoCount, moderationOf, noticesAbout, peopleNames, reviewIds, row, rowIds, rows, settled,
} from "./support/moderation-fixtures";
import { ADMIN_STATE, ANONYMOUS, DEMO_SUNNER_01 as AN, DEMO_SUNNER_02 as BINH, requireState, stateOrAnonymous, USER_STATE } from "./support/test-sessions";

/**
 * F011 admin kudo moderation (phase 12) against the running stack, `live` seed, signed in as
 * `saa.admin.e2e`. Covers screen-tracker rows 62–71: FR-001, FR-101..103, FR-201..206, FR-301..305,
 * FR-401, FR-402, FR-601..603, BR-001..009, DEC-001..003, SC-001..003, SC-006..010 (browser side).
 * Expected rows come from the database at test time; stale decisions are made by writing the row
 * as "another admin" would. Versioning, notices and the authz matrix are proven in full by Go.
 */
test.use({ locale: "vi-VN", storageState: stateOrAnonymous(ADMIN_STATE) });

const VI_COLUMNS = ["ID", "Người gửi", "Người nhận", "Nội dung", "Hashtag", "Tim", "Thời gian", "Trạng thái", "Thao tác"];
const STALE = "Kudos này vừa được một admin khác thay đổi.";
/** A 1x1 PNG as a stored avatar address, so the photo path is proven without a network fetch. */
const AVATAR = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const pill = (page: Page, id: string) => row(page, id).getByTestId("status-pill");
const action = (page: Page, id: string) => row(page, id).getByTestId("kudo-action");
async function markSpam(page: Page, id: string) {
  await action(page, id).click();
  const dialog = row(page, id).getByRole("dialog");
  await expect(dialog).toContainText("Tác giả sẽ nhận được thông báo. Đánh dấu kudos này là Spam?");
  await dialog.getByTestId("kudo-action-confirm").click();
}
async function feedHas(request: import("@playwright/test").APIRequestContext, token: string, id: string) {
  const res = await request.get(`${API_BASE_URL}/api/v1/kudos?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
  expect(res.status()).toBe(200);
  return ((await res.json()) as { items: { id: string }[] }).items.some((item) => item.id === id);
}

test.describe("Review content (rows 62, 63, 66–69)", () => {
  test("lists every kudo newest first, 20 a page, with the real sender of anonymous kudos marked (FR-101, FR-102, BR-004, SC-001, SC-002)", async ({ page }) => {
    requireState(ADMIN_STATE);
    await page.goto("/admin/review");
    const nav = page.getByRole("navigation", { name: "Điều hướng quản trị" });
    await expect(nav.locator('[aria-current="page"]')).toHaveText(["Duyệt nội dung"]);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Duyệt nội dung");
    await expect(page.getByTestId("review-table").locator("thead th")).toHaveText(VI_COLUMNS);
    expect(await rowIds(page)).toEqual(reviewIds());
    const total = kudoCount();
    await expect(page.getByTestId("admin-pager")).toContainText(`1–20 trên ${total} kudos`);

    const [anonId, realSender] = sql(`select k.id || '|' || u.name from public.kudos k join public.users u on u.id = k.sender_id
      where k.id = any(array[${reviewIds().map((id) => `'${id}'::uuid`).join(",")}]) and k.is_anonymous order by k.created_at desc limit 1;`).split("|");
    await expect(row(page, anonId).locator("td").nth(1)).toContainText(realSender);
    await expect(row(page, anonId).getByTestId("anonymous-marker")).toHaveText("Ẩn danh");
    const named = reviewIds("not k.is_anonymous", 1)[0];
    await expect(row(page, named).getByTestId("anonymous-marker")).toHaveCount(0);

    const last = Math.ceil(total / 20);
    await page.goto("/admin/review?page=99"); // clamped to the last page
    await expect(page.getByTestId("admin-pager").locator('[aria-current="page"]')).toHaveText(String(last));
    expect(await rowIds(page)).toEqual(reviewIds("true", 20, (last - 1) * 20));
  });

  test("search matches title or body text, marks the phrase, and an empty result offers Clear filters (FR-205, FR-103, BR-001, DEC-002)", async ({ page }) => {
    requireState(ADMIN_STATE);
    await page.goto("/admin/review?page=2");
    const search = page.getByRole("searchbox", { name: "Tìm theo tiêu đề hoặc nội dung" });
    await search.fill("phi thường");
    await search.press("Enter");
    await expect(page).toHaveURL(`/admin/review?q=${encodeURIComponent("phi thường").replaceAll("%20", "+")}`);
    await settled(page);
    expect(await rowIds(page)).toEqual(reviewIds("(k.title ilike '%phi thường%' or k.content ilike '%phi thường%')"));
    await expect(rows(page).first().locator("mark").first()).toHaveText(/phi thường/i);

    await page.goto("/admin/review?q=zz-khong-co-kudo-nao");
    await expect(page.getByTestId("review-empty")).toContainText("Không có kudos nào khớp bộ lọc.");
    await page.getByRole("link", { name: "Xóa bộ lọc" }).click();
    await expect(page).toHaveURL("/admin/review");
    await expect(rows(page)).toHaveCount(20);
  });

  test("a Sender / Receiver option shows the Sunner's avatar photo, the initial only without one (Figma 1002:15428, 1002:15464)", async ({ page }) => {
    requireState(ADMIN_STATE);
    const before = sql(`select coalesce(avatar_url, '') from public.users where id = '${AN.userId}';`);
    sql(`update public.users set avatar_url = '${AVATAR}' where id = '${AN.userId}';`);
    try {
      await page.goto("/admin/review");
      for (const filter of ["filter-sender", "filter-receiver"]) {
        await page.getByTestId(filter).getByRole("button").first().click();
        const search = page.getByRole("combobox", { name: "Tìm theo tên hoặc email" });
        await search.fill(AN.name);
        await expect(page.getByTestId(filter).getByRole("option", { name: new RegExp(AN.name) }).locator("img")).toHaveAttribute("src", AVATAR);
        await search.fill(BINH.name);
        const binh = page.getByTestId(filter).getByRole("option", { name: new RegExp(BINH.name) });
        await expect(binh).toContainText(BINH.name.charAt(0).toUpperCase());
        await expect(binh.locator("img")).toHaveCount(0);
        await page.keyboard.press("Escape");
      }
    } finally {
      sql(`update public.users set avatar_url = ${before ? `'${before}'` : "null"} where id = '${AN.userId}';`);
    }
  });

  test("Sender, Receiver and Status filters list only real senders / receivers and combine on page 1 (FR-201..204, FR-206, BR-005, BR-009, SC-001)", async ({ page }) => {
    requireState(ADMIN_STATE);
    await page.goto("/admin/review?page=2");
    await page.getByTestId("filter-sender").getByRole("button").first().click();
    const options = page.getByTestId("filter-sender").getByRole("option");
    await expect(options.nth(1)).toBeVisible();
    expect(await options.getByTestId("person-name").allInnerTexts()).toEqual(peopleNames("sender_id"));
    await page.getByRole("combobox", { name: "Tìm theo tên hoặc email" }).fill(AN.name);
    await page.getByTestId("filter-sender").getByRole("option", { name: new RegExp(AN.name) }).click();
    await expect(page).toHaveURL(`/admin/review?sender=${AN.userId}`);
    await settled(page);
    expect(await rowIds(page)).toEqual(reviewIds(`k.sender_id = '${AN.userId}'`));
    await expect(page.getByTestId("filter-sender").getByRole("button").first()).toHaveAccessibleName(`Người gửi: ${AN.name}`);

    await page.getByTestId("filter-status").getByRole("button").click();
    await page.getByRole("menuitemradio", { name: "Spam", exact: true }).click();
    await expect(page).toHaveURL(`/admin/review?sender=${AN.userId}&status=spam`);
    await settled(page);
    expect(await rowIds(page)).toEqual(reviewIds(`k.sender_id = '${AN.userId}' and k.status = 'spam'`));

    await page.getByTestId("filter-receiver").getByRole("button").first().click();
    const receivers = page.getByTestId("filter-receiver").getByRole("option");
    await expect(receivers.nth(1)).toBeVisible();
    expect(await receivers.getByTestId("person-name").allInnerTexts()).toEqual(peopleNames("receiver_id"));
    await page.keyboard.press("Escape");

    // Whole days in the report time zone; a reversed range is ignored (BR-005).
    const to = vnToday();
    const from = addDays(to, -2);
    await page.goto(`/admin/review?from=${from}&to=${to}`);
    const window = `k.created_at >= ('${from}'::date)::timestamp at time zone 'Asia/Ho_Chi_Minh'
      and k.created_at < ('${to}'::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh'`;
    expect(await rowIds(page)).toEqual(reviewIds(window));
    await expect(page.getByTestId("date-range-field")).toHaveAttribute("aria-label", `Khoảng thời gian: ${from} → ${to}`);
    await page.getByTestId("date-range-field").click();
    await page.getByRole("button", { name: "Xóa", exact: true }).click();
    await expect(page).toHaveURL("/admin/review");
    await page.goto(`/admin/review?from=${to}&to=${from}`);
    await expect(page.getByTestId("date-range-field")).toHaveAttribute("aria-label", "Khoảng thời gian: Chưa chọn");
    expect(await rowIds(page)).toEqual(reviewIds());
  });
});

test.describe("Spam and Public decisions (rows 64, 65, 70, 71)", () => {
  let kudoId = "";
  test.beforeEach(() => {
    kudoId = insertKudo(AN.userId, BINH.userId, `P12 E2E ${Date.now()}`);
  });
  test.afterEach(() => deleteKudo(kudoId));

  test("Spam asks once, hides the kudo, warns the author once; a stale Un Spam refreshes the row; Public restores it (FR-301..305, FR-602, FR-603, BR-002, BR-003, BR-008, SC-003, SC-006, SC-009)", async ({ page, request, baseURL }) => {
    requireState(ADMIN_STATE);
    const binhToken = bearerFor(BINH, baseURL!); // a teammate: neither author nor admin
    expect(await feedHas(request, binhToken, kudoId)).toBe(true);

    await page.goto("/admin/review");
    await expect(pill(page, kudoId)).toHaveText("Public");
    await expect(action(page, kudoId)).toHaveText("Đánh dấu Spam"); // DEC-001: only the decision that changes it
    await action(page, kudoId).click();
    await row(page, kudoId).getByRole("button", { name: "Hủy" }).click(); // D003: cancelled, nothing sent
    expect(moderationOf(kudoId)).toBe("public|0|");

    await markSpam(page, kudoId);
    await expect(pill(page, kudoId)).toHaveText("Spam");
    await expect(action(page, kudoId)).toHaveText("Bỏ Spam");
    await expect(row(page, kudoId)).toHaveAttribute("data-version", "1");
    expect(moderationOf(kudoId)).toBe(`spam|1|${ADMIN_EMAIL}`);
    expect(noticesAbout(kudoId, "kudo_spam_warning")).toBe(1);
    expect(await feedHas(request, binhToken, kudoId)).toBe(false);

    // Another admin restores it meanwhile: this row still holds version 1 (Codex R13, E16).
    sql(`update public.kudos set status = 'public', moderation_version = 2, moderated_at = now() where id = '${kudoId}';`);
    await action(page, kudoId).click(); // Un Spam with the stale version
    await expect(row(page, kudoId).getByTestId("kudo-action-notice")).toHaveText(STALE);
    await expect(pill(page, kudoId)).toHaveText("Public");
    await expect(action(page, kudoId)).toHaveText("Đánh dấu Spam");
    expect(moderationOf(kudoId)).toBe(`public|2|${ADMIN_EMAIL}`);

    await markSpam(page, kudoId); // fresh version 2 -> 3
    await expect(pill(page, kudoId)).toHaveText("Spam");
    await action(page, kudoId).click(); // Un Spam, no confirmation (D003)
    await expect(pill(page, kudoId)).toHaveText("Public");
    expect(moderationOf(kudoId)).toBe(`public|4|${ADMIN_EMAIL}`);
    expect(noticesAbout(kudoId, "kudo_spam_warning")).toBe(1); // merged while unread, none for Public (D002)
    expect(await feedHas(request, binhToken, kudoId)).toBe(true);
  });

  test("in the View Kudo modal opened from the board, the first Escape closes only the alert and the second the modal, focus back on the card link (reviewer R1)", async ({ browser }) => {
    requireState(USER_STATE);
    const author = await browser.newContext({ storageState: USER_STATE, locale: "vi-VN", viewport: { width: 1440, height: 1024 } });
    const board = await author.newPage();
    await board.goto("/kudos");
    const card = board.locator(`[data-testid="kudo-card-feed"][data-kudo-id="${kudoId}"]`);
    await expect(card).toBeVisible();
    sql(`update public.kudos set status = 'spam', moderation_version = 1, moderated_at = now() where id = '${kudoId}';`); // moderated while the board is open
    const opener = card.locator("h3 a");
    await opener.click();
    await expect(board).toHaveURL(`/kudos/${kudoId}`);
    const modal = board.getByTestId("kudo-detail-overlay");
    const alert = modal.getByRole("alertdialog", { name: /Cảnh báo vi phạm\s+tiêu chuẩn cộng đồng/ });
    await expect(alert.getByRole("button", { name: "Đóng cảnh báo" })).toBeFocused();
    await board.keyboard.press("Escape");
    await expect(alert).toHaveCount(0);
    await expect(modal).toBeVisible(); // the modal stays
    await expect(board).toHaveURL(`/kudos/${kudoId}`);
    await expect(modal.getByRole("dialog")).toBeFocused();
    await board.keyboard.press("Escape");
    await expect(board).toHaveURL("/kudos");
    await expect(board.getByRole("dialog")).toHaveCount(0); // closed (the router may keep the slot hidden, as in P7)
    await expect(modal).toBeHidden();
    await expect(opener).toBeFocused();
    await author.close();
  });

  test("a failed decision keeps the row and says so (US004 error, FR-103)", async ({ page }) => {
    requireState(ADMIN_STATE);
    await page.goto("/admin/review");
    await page.route("**/api/v1/admin/kudos/*/spam", (route) => route.fulfill({ status: 500, contentType: "application/json", body: '{"error":{"code":"internal_error","message":"x"}}' }));
    await markSpam(page, kudoId);
    await expect(row(page, kudoId).getByTestId("kudo-action-notice")).toHaveText("Không lưu được thay đổi. Vui lòng thử lại.");
    await expect(pill(page, kudoId)).toHaveText("Public");
    expect(moderationOf(kudoId)).toBe("public|0|");
  });

  test("the admin sees the neutral Spam badge on the detail, the author the alert overlay, others not-found; Public removes both (FR-401, FR-402, BR-006, DEC-003, SC-008)", async ({ page, browser, baseURL }) => {
    requireState(ADMIN_STATE);
    requireState(USER_STATE);
    sql(`update public.kudos set status = 'spam', moderation_version = 1, moderated_at = now() where id = '${kudoId}';`);
    await page.goto(`/kudos/${kudoId}`);
    await expect(page.getByTestId("spam-badge")).toContainText("Spam");
    await expect(page.getByTestId("spam-alert-overlay")).toHaveCount(0);

    const author = await browser.newContext({ storageState: USER_STATE, locale: "vi-VN", viewport: { width: 1440, height: 1024 } });
    const own = await author.newPage();
    await own.goto(`/kudos/${kudoId}`);
    // SCR-kudo-spam-alert § 9: an alert dialog named by its heading, focus moved in, Tab kept inside.
    const overlay = own.getByRole("alertdialog", { name: /Cảnh báo vi phạm\s+tiêu chuẩn cộng đồng/ });
    const closeAlert = overlay.getByRole("button", { name: "Đóng cảnh báo" });
    const standards = overlay.getByRole("link", { name: "tiêu chuẩn cộng đồng" });
    await expect(overlay).toHaveAttribute("data-testid", "spam-alert-overlay");
    await expect(overlay).toHaveAccessibleDescription("Kudos này đã bị ẩn vì vi phạm tiêu chuẩn cộng đồng.");
    await expect(standards).toHaveAttribute("href", "/community-standards");
    await expect(closeAlert).toBeFocused();
    await own.keyboard.press("Tab");
    await expect(standards).toBeFocused();
    await own.keyboard.press("Tab"); // wraps inside the alert
    await expect(closeAlert).toBeFocused();
    await own.keyboard.press("Shift+Tab");
    await expect(standards).toBeFocused();
    await own.keyboard.press("Escape"); // SCR § 4: Escape closes like ×
    await expect(own.getByTestId("spam-alert-overlay")).toHaveCount(0);
    await expect(own.getByTestId("spam-kudo-frame")).toBeFocused(); // focus back on the card, not lost
    await expect(own.getByTestId("kudo-card-detail")).toBeVisible();
    await expect(own.getByTestId("kudo-edit")).toHaveCount(0); // no edit while Spam (F005 FR-602)
    await own.reload(); // not remembered (D005)
    await expect(own.getByRole("button", { name: "Đóng cảnh báo" })).toBeFocused(); // hydrated: focus moved in again
    await expect(own.getByTestId("kudo-card-detail").locator("xpath=..")).toHaveAttribute("inert", ""); // card behind is inert (R3)
    const bell = own.getByTestId("notification-bell");
    await bell.focus(); // focus elsewhere on the page, outside the alert
    await expect(bell).toBeFocused();
    await own.keyboard.press("Escape");
    await expect(own.getByTestId("spam-alert-overlay")).toHaveCount(0);
    await expect(own.getByTestId("kudo-card-detail").locator("xpath=..")).not.toHaveAttribute("inert", "");
    await own.reload();
    await expect(own.getByRole("button", { name: "Đóng cảnh báo" })).toBeFocused();
    await own.getByRole("button", { name: "Đóng cảnh báo" }).click();
    await expect(own.getByTestId("spam-alert-overlay")).toHaveCount(0);
    await own.reload();
    await expect(own.getByTestId("spam-alert-overlay")).toBeVisible();

    const other = await browser.newContext({ storageState: ANONYMOUS, locale: "vi-VN" });
    await other.addCookies(mintLocalSessionCookies(BINH, baseURL!));
    const theirs = await other.newPage();
    await theirs.goto(`/kudos/${kudoId}`);
    await expect(theirs.getByTestId("not-found-page")).toBeVisible();

    sql(`update public.kudos set status = 'public', moderation_version = 2 where id = '${kudoId}';`);
    await own.reload();
    await expect(own.getByTestId("kudo-card-detail")).toBeVisible();
    await expect(own.getByTestId("spam-alert-overlay")).toHaveCount(0);
    await expect(own.getByTestId("spam-badge")).toHaveCount(0);
    await theirs.reload();
    await expect(theirs.getByTestId("kudo-card-detail")).toBeVisible();
    await author.close();
    await other.close();
  });
});

test.describe("language and access", () => {
  test("the page and the row actions follow the chosen language (FR-001)", async ({ page, context, baseURL }) => {
    requireState(ADMIN_STATE);
    await context.addCookies([{ name: "saa_locale", value: "en", url: baseURL! }]);
    await page.goto("/admin/review");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Review content");
    await expect(page.getByTestId("review-table").locator("thead th")).toHaveText(["ID", "Sender", "Receiver", "Content", "Hashtag", "Heart", "Time", "Status", "Actions"]);
    await expect(rows(page).locator('[data-testid="kudo-action"]').first()).toHaveText(/Mark Spam|Un Spam/);
  });

  test.describe("as a Sunner without the admin role", () => {
    test.use({ storageState: stateOrAnonymous(USER_STATE) });
    test("the page is Forbidden and every moderation endpoint answers 403, or 401 without a token (FR-601, BR-007, SC-007)", async ({ page, context, baseURL, request }) => {
      requireState(USER_STATE);
      await page.goto("/admin/review");
      await expect(page.getByTestId("forbidden-page")).toBeVisible();
      await expect(page.getByTestId("review-table")).toHaveCount(0);
      const token = await accessTokenOf(context, baseURL!);
      const kudo = reviewIds("true", 1)[0];
      const calls: [string, string][] = [
        ["GET", "/api/v1/admin/kudos"], ["GET", "/api/v1/admin/kudos/people?role=sender"],
        ["POST", `/api/v1/admin/kudos/${kudo}/spam`], ["POST", `/api/v1/admin/kudos/${kudo}/public`],
      ];
      for (const [method, path] of calls) {
        const send = (headers: Record<string, string>) => request.fetch(API_BASE_URL + path, { method, headers, data: method === "POST" ? { expectedVersion: 0 } : undefined });
        const asUser = await send({ Authorization: `Bearer ${token}` });
        expect(asUser.status(), path).toBe(403);
        expect(await asUser.text(), path).not.toContain("items");
        expect((await send({})).status(), path).toBe(401);
      }
      expect(moderationOf(kudo).split("|")[0]).toMatch(/public|spam/);
    });
  });
});
