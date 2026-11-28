import { expect, test, type Page } from "@playwright/test";
import { API_BASE_URL, bearerFor, signIn, sql } from "./support/gamification-fixtures";
import {
  bell,
  bellDot,
  detail,
  dropdown,
  fullHistory,
  gotoWithBell,
  insertNotice,
  loadFullHistory,
  newestNotice,
  noticeIdsNewestFirst,
  openPanel,
  readAtOf,
  row,
  rowIds,
  rows,
  snapshotNotices,
  unreadNotices,
} from "./support/notification-fixtures";
import { ADMIN_STATE, DEMO_SUNNER_01 as AN, DEMO_SUNNER_02 as BINH, requireState, stateOrAnonymous, USER_STATE } from "./support/test-sessions";

/**
 * F009 notification center (phase 10) against the running stack, `live` seed with its demo
 * notices (all seven kinds for Nguyễn Văn An, 24 rows = two pages), signed in as An. Covers
 * screen-tracker rows 54–55: FR-101..103, FR-201..206, FR-401..405, BR-002, BR-004, BR-005, BR-007,
 * SC-002, SC-003, SC-006, SC-007, SC-009 (browser side; ownership, paging and re-mask are proven
 * in full by the Go tests). Every test restores An's notices.
 */
test.use({ locale: "vi-VN", storageState: stateOrAnonymous(USER_STATE) });

const PAGE_SIZE = 20;
const FAILED = "Không thể đánh dấu đã đọc. Vui lòng thử lại.";
const unreadLabel = (n: number) => `Có ${n} thông báo chưa đọc`;

let restore: () => void = () => {};
test.beforeEach(() => {
  requireState(USER_STATE);
  restore = snapshotNotices(AN.userId);
});
test.afterEach(() => restore());

test.describe("row 54 — the panel", () => {
  test("the bell shows a dot; the panel lists my notices newest first with icon, text, time and unread dots, and Xem tất cả pages the whole history (FR-101, FR-201..203, FR-205, FR-403, SC-007)", async ({ page }) => {
    const ids = noticeIdsNewestFirst(AN.userId);
    const unread = unreadNotices(AN.userId);
    expect(ids.length).toBeGreaterThan(PAGE_SIZE);
    await gotoWithBell(page);
    await expect(bellDot(page)).toBeVisible();
    await expect(bell(page)).toHaveAccessibleName("Thông báo");
    await expect(bell(page)).toHaveAccessibleDescription(unreadLabel(unread));

    await openPanel(page);
    await expect(dropdown(page).getByRole("heading", { name: "Thông báo" })).toBeVisible();
    await expect(dropdown(page).getByRole("button", { name: "Đánh dấu đọc tất cả" })).toBeEnabled();
    expect(await rowIds(page)).toEqual(ids.slice(0, PAGE_SIZE));
    const named = newestNotice(AN.userId, "kudo_received", "params ? 'senderName' and created_at > now() - interval '1 day'");
    const [sender, hours] = sql(`select params->>'senderName', floor(extract(epoch from now() - created_at) / 3600) from public.notifications where id = '${named.id}';`).split("|");
    await expect(row(page, named.id)).toContainText(`Sunner ${sender} vừa gửi đến bạn lời ghi nhận đầy yêu thương!`);
    await expect(row(page, named.id).locator("time")).toHaveText(Number(hours) === 0 ? /phút trước|Vừa xong/ : `${hours} giờ trước`);
    await expect(row(page, named.id).locator('[data-icon="mail"]')).toBeVisible();
    const dots = await rows(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-unread")));
    const dbUnread = ids.slice(0, PAGE_SIZE).map((id) => String(readAtOf(id) === ""));
    expect(dots).toEqual(dbUnread);
    expect(await page.locator('[data-unread="true"] [data-testid="notification-unread-dot"].bg-danger').count()).toBe(dbUnread.filter((u) => u === "true").length);

    await loadFullHistory(page, ids.length);
    expect(await rowIds(page)).toEqual(ids);
    await expect(fullHistory(page).getByRole("button", { name: "Đánh dấu đọc tất cả" })).toBeVisible();
    await expect(bell(page)).toHaveClass(/text-primary/); // gold bell while the full history is open (589:9132)
    expect(unreadNotices(AN.userId)).toBe(unread); // opening the panel marks nothing read (D011)

    await page.keyboard.press("Escape");
    await expect(fullHistory(page)).toHaveCount(0);
    await expect(bell(page)).toBeFocused();
  });

  test("Đánh dấu đọc tất cả clears every dot and the bell dot; a failure keeps them; read times stay (FR-402, US004, BR-005, SC-006)", async ({ page }) => {
    const earlier = newestNotice(AN.userId, "hero_level_up");
    const earlierReadAt = readAtOf(earlier.id);
    await gotoWithBell(page);
    await openPanel(page);
    const markAll = dropdown(page).getByRole("button", { name: "Đánh dấu đọc tất cả" });

    await page.route("**/api/v1/me/notifications/read-all", (route) => route.fulfill({ status: 500, body: "{}" }));
    await markAll.click();
    await expect(page.getByTestId("notification-announcement")).toHaveText(FAILED);
    await expect(dropdown(page).locator('[data-unread="true"]').first()).toBeVisible();
    await expect(bellDot(page)).toBeVisible();
    await page.unroute("**/api/v1/me/notifications/read-all");

    await markAll.click();
    await expect(dropdown(page).locator('[data-unread="true"]')).toHaveCount(0);
    await expect(bellDot(page)).toHaveCount(0);
    await expect(markAll).toBeDisabled();
    expect(unreadNotices(AN.userId)).toBe(0);
    expect(readAtOf(earlier.id)).toBe(earlierReadAt);
    const counted = page.waitForResponse(/\/api\/v1\/me\/notifications\/unread-count/);
    await page.reload();
    expect(await (await counted).json()).toEqual({ unreadCount: 0 });
    await expect(bellDot(page)).toHaveCount(0);
  });

  test("a new notice lights the bell without a reload: on focus or a shown tab, at most once per 5 s, and on the 60 s refresh (FR-404, D010, review W3)", async ({ page }) => {
    sql(`update public.notifications set read_at = now() where recipient_id = '${AN.userId}' and read_at is null;`);
    await page.clock.install();
    let reads = 0;
    page.on("request", (r) => {
      if (r.url().includes("/api/v1/me/notifications/unread-count")) reads++;
    });
    await gotoWithBell(page);
    await expect(bell(page)).toHaveAttribute("data-unread", "false");
    const focus = () => page.evaluate(() => window.dispatchEvent(new Event("focus")));

    const first = insertNotice(AN.userId, "generic", '{"message":"Thông báo mới từ BTC"}');
    const readsAfterLoad = reads;
    await focus(); // within 5 s of the read on load: throttled, no request
    await page.waitForTimeout(500);
    expect(reads).toBe(readsAfterLoad);
    await expect(bellDot(page)).toHaveCount(0);
    await page.clock.runFor(5_000);
    await focus();
    await expect(bellDot(page)).toBeVisible();
    await expect(bell(page)).toHaveAccessibleDescription(unreadLabel(1));

    sql(`update public.notifications set read_at = now() where id = '${first}';`);
    insertNotice(AN.userId, "secret_box_received");
    insertNotice(AN.userId, "secret_box_received");
    await page.clock.runFor(5_000);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); // the tab is shown again
    await expect(bell(page)).toHaveAccessibleDescription(unreadLabel(2));

    insertNotice(AN.userId, "generic", '{"message":"Thêm một thông báo"}');
    await page.clock.runFor(60_000); // no event at all: the interval reads
    await expect(bell(page)).toHaveAccessibleDescription(unreadLabel(3));
  });

  test("the bell belongs to the signed-in Sunner: after a switch to another account it shows only that account's count, never a late answer for the previous one (review W1)", async ({ page, context, baseURL }) => {
    const restoreBinh = snapshotNotices(BINH.userId);
    try {
      sql(`update public.notifications set read_at = now() where recipient_id = '${BINH.userId}' and read_at is null;`);
      insertNotice(BINH.userId, "generic", '{"message":"Chào Bình"}');
      const anUnread = unreadNotices(AN.userId);
      expect(anUnread).toBeGreaterThan(1);
      await gotoWithBell(page);
      await expect(bell(page)).toHaveAccessibleDescription(unreadLabel(anUnread));

      // An's next count read is held until the account has switched, then answered for An.
      let release = () => {};
      const held = new Promise<void>((resolve) => (release = resolve));
      let anReadsHeld = 0;
      await page.route(/\/api\/v1\/me\/notifications\/unread-count/, async (route) => {
        const token = (route.request().headers()["authorization"] ?? "").split(".")[1] ?? "";
        if ((JSON.parse(Buffer.from(token, "base64url").toString() || "{}") as { sub?: string }).sub === AN.userId) {
          anReadsHeld++;
          await held;
        }
        await route.continue().catch(() => {}); // a read the bell cancelled meanwhile is gone
      });
      await openPanel(page); // opening the panel re-reads the count (A2)
      await expect.poll(() => anReadsHeld).toBe(1);

      await context.clearCookies();
      await signIn(context, BINH, baseURL!);
      await page.evaluate(() => window.dispatchEvent(new Event("focus"))); // MeRefresher reads /me: now Bình
      await expect(page.getByRole("button", { name: `Tài khoản: ${BINH.name}` })).toBeVisible();
      await expect(dropdown(page)).toHaveCount(0); // An's open panel and list are gone
      await expect(bell(page)).toHaveAccessibleDescription(unreadLabel(1));
      release();
      await page.waitForTimeout(1000);
      await expect(bell(page)).toHaveAccessibleDescription(unreadLabel(1));
    } finally {
      restoreBinh();
    }
  });

  test("a repeated heart while unread updates the one notice and moves it to the top (BR-004, SC-003)", async ({ page, request, baseURL }) => {
    const kudoId = sql(`select k.id from public.kudos k where k.sender_id = '${AN.userId}' and k.status = 'public' order by k.created_at limit 1;`);
    const hearters = sql(`select u.id || ':' || u.email || ':' || u.name from public.users u where u.email like 'sunner%.demo@sun-asterisk.com'
      and u.id <> '${AN.userId}' and not exists (select 1 from public.hearts h where h.kudo_id = '${kudoId}' and h.user_id = u.id) order by u.email limit 2;`)
      .split("\n")
      .map((line) => {
        const [userId, email, name] = line.split(":");
        return { userId, email, name };
      });
    const boxes = sql(`select coalesce(json_agg(b), '[]') from public.secret_boxes b where user_id = '${AN.userId}';`).replaceAll("'", "''");
    const unreadHeart = () =>
      sql(`select coalesce(string_agg(id || '|' || created_at, ','), '') from public.notifications
        where recipient_id = '${AN.userId}' and kind = 'heart_received' and kudo_id = '${kudoId}' and read_at is null;`);
    const heart = async (hearter: (typeof hearters)[number]) => {
      const res = await request.put(`${API_BASE_URL}/api/v1/kudos/${kudoId}/heart`, { headers: { Authorization: `Bearer ${bearerFor(hearter, baseURL!)}` } });
      expect(res.status()).toBe(200);
    };
    try {
      // An earlier notice of this kudo was read (another spec may have just hearted it): the next heart adds a row.
      sql(`update public.notifications set read_at = now() where recipient_id = '${AN.userId}' and kind = 'heart_received' and kudo_id = '${kudoId}' and read_at is null;`);
      expect(unreadHeart()).toBe("");
      await heart(hearters[0]);
      await expect.poll(unreadHeart).not.toBe("");
      const [firstId, firstAt] = unreadHeart().split("|");
      await heart(hearters[1]);
      await expect.poll(() => unreadHeart().split("|")[1]).not.toBe(firstAt);
      const [mergedId, mergedAt] = unreadHeart().split("|");
      expect(mergedId).toBe(firstId); // one unread notice per kudo, updated in place
      expect(Date.parse(mergedAt)).toBeGreaterThan(Date.parse(firstAt)); // and moved up

      await gotoWithBell(page);
      await openPanel(page);
      const ids = noticeIdsNewestFirst(AN.userId);
      expect(await rowIds(page)).toEqual(ids.slice(0, PAGE_SIZE));
      expect(ids.indexOf(mergedId)).toBeLessThan(2); // only the box this second heart granted may be newer
      await expect(row(page, mergedId)).toHaveAttribute("data-unread", "true");
      await expect(row(page, mergedId).locator("time")).toHaveText("Vừa xong");
    } finally {
      sql(`delete from public.hearts where kudo_id = '${kudoId}' and user_id in (${hearters.map((h) => `'${h.userId}'`).join(",")});
        delete from public.secret_boxes where user_id = '${AN.userId}';
        insert into public.secret_boxes select * from json_populate_recordset(null::public.secret_boxes, '${boxes}');`);
    }
  });

  test("loading, error with retry, an older page failing, and the empty state (FR-204, DEC-003, US005)", async ({ page }) => {
    const total = noticeIdsNewestFirst(AN.userId).length;
    await gotoWithBell(page);
    let fail = true;
    await page.route(/\/api\/v1\/me\/notifications\?/, async (route) => {
      if (fail && !route.request().url().includes("cursor=")) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return route.fulfill({ status: 500, body: "{}" });
      }
      if (route.request().url().includes("cursor=") && fail) return route.fulfill({ status: 500, body: "{}" });
      return route.fallback();
    });
    await bell(page).click();
    await expect(page.getByTestId("notification-skeleton")).toBeVisible();
    await expect(dropdown(page).getByRole("alert")).toContainText("Không tải được thông báo.");
    fail = false;
    await dropdown(page).getByRole("button", { name: "Thử lại" }).click();
    await expect(rows(page)).toHaveCount(PAGE_SIZE);

    fail = true;
    await dropdown(page).getByRole("button", { name: "Xem tất cả" }).click();
    await page.getByTestId("notification-all-backdrop").evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(fullHistory(page).getByRole("alert")).toContainText("Không tải thêm được thông báo.");
    await expect(rows(page)).toHaveCount(PAGE_SIZE);
    fail = false;
    await fullHistory(page).getByRole("button", { name: "Thử lại" }).click();
    await expect(rows(page)).toHaveCount(total);
    await page.keyboard.press("Escape");

    sql(`delete from public.notifications where recipient_id = '${AN.userId}';`);
    await page.unrouteAll();
    await gotoWithBell(page);
    await expect(bellDot(page)).toHaveCount(0);
    await bell(page).click();
    await expect(page.getByTestId("notification-empty")).toHaveText("Bạn chưa có thông báo nào");
    await expect(dropdown(page).getByRole("button", { name: "Đánh dấu đọc tất cả" })).toBeDisabled();
    await expect(dropdown(page).getByRole("button", { name: "Xem tất cả" })).toHaveCount(0);
  });
});

const boxDialog = (page: Page) => page.getByRole("dialog", { name: /KHÁM PHÁ SECRET BOX CỦA BẠN|Chúc mừng/ });

test.describe("row 55 — opening a notice", () => {
  test("from the keyboard: a kudo notice opens its detail with the whole message and time, is marked read, and leads to the kudo (FR-102, FR-206, FR-401, FR-103)", async ({ page }) => {
    const notice = newestNotice(AN.userId, "kudo_received", "read_at is null and params ? 'senderName'");
    const unread = unreadNotices(AN.userId);
    const [sender, when] = sql(`select params->>'senderName', to_char(created_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM/YYYY')
      from public.notifications where id = '${notice.id}';`).split("|");
    await gotoWithBell(page);
    await expect(bell(page)).toHaveAccessibleDescription(unreadLabel(unread));
    await bell(page).focus();
    await page.keyboard.press("Enter");
    await expect(dropdown(page)).toBeFocused();
    const opener = row(page, notice.id).getByRole("button");
    await opener.focus();
    await page.keyboard.press("Enter");

    await expect(detail(page)).toBeFocused();
    await expect(detail(page)).toHaveAccessibleName("Lời ghi nhận mới");
    await expect(page.getByTestId("notification-detail-message")).toHaveText(`Sunner ${sender} vừa gửi đến bạn lời ghi nhận đầy yêu thương!`);
    await expect(page.getByTestId("notification-detail-time")).toHaveText(when);
    await expect(row(page, notice.id)).toHaveAttribute("data-unread", "false");
    await expect(bell(page)).toHaveAccessibleDescription(unreadLabel(unread - 1));
    expect(readAtOf(notice.id)).not.toBe("");
    await page.keyboard.press("Escape");
    await expect(detail(page)).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expect(dropdown(page)).toBeVisible();

    await page.keyboard.press("Enter");
    const action = detail(page).getByRole("link", { name: "Xem lời nhắn" });
    await expect(action).toHaveAttribute("href", `/kudos/${notice.kudoId}`);
    await action.click();
    await expect(page).toHaveURL(`/kudos/${notice.kudoId}`);
    await expect(page.getByTestId("kudo-detail-page")).toBeVisible();
    await expect(detail(page)).toHaveCount(0);
    await expect(dropdown(page)).toHaveCount(0);
  });

  test("each kind leads to its target: spam warning to the rules and the flagged kudo, level and icons to my profile, generic nowhere (FR-103, X06, D008, N10)", async ({ page }) => {
    const spam = newestNotice(AN.userId, "kudo_spam_warning");
    const hero = newestNotice(AN.userId, "hero_level_up");
    const icons = newestNotice(AN.userId, "icons_completed");
    const generic = newestNotice(AN.userId, "generic");
    await gotoWithBell(page);
    await openPanel(page);
    await loadFullHistory(page, noticeIdsNewestFirst(AN.userId).length);

    await expect(row(page, spam.id).locator('[data-icon="warning"]')).toBeVisible();
    await row(page, spam.id).getByRole("button").click();
    await expect(detail(page)).toHaveAccessibleName("Lời nhắn bị tạm ẩn");
    await expect(detail(page).getByRole("link", { name: "Tiêu chuẩn cộng đồng" })).toHaveAttribute("href", "/community-standards");
    await expect(detail(page).getByRole("link", { name: "Xem lời nhắn" })).toHaveAttribute("href", `/kudos/${spam.kudoId}`);
    await page.keyboard.press("Escape");

    for (const notice of [hero, icons]) {
      await row(page, notice.id).getByRole("button").click();
      await expect(detail(page).getByRole("link", { name: "Xem profile" })).toHaveAttribute("href", "/profile");
      await page.keyboard.press("Escape");
    }
    await expect(row(page, hero.id)).toContainText(/Bạn nhận được \d+ lời nhắn gửi từ đồng nghiệp và thăng hạng (New|Rising|Super|Legend) Hero!/);
    await row(page, generic.id).getByRole("button").click();
    await expect(page.getByTestId("notification-detail-message")).toHaveText(sql(`select params->>'message' from public.notifications where id = '${generic.id}';`));
    await expect(detail(page).getByRole("link")).toHaveCount(0);
    await page.keyboard.press("Escape");

    await row(page, spam.id).getByRole("link", { name: "Tiêu chuẩn cộng đồng" }).click();
    await expect(page).toHaveURL("/community-standards");
    await expect(page.getByRole("heading", { level: 1, name: "Tiêu chuẩn cộng đồng" })).toBeVisible();
    await expect(fullHistory(page)).toHaveCount(0);
  });

  test("the Secret Box notice goes straight to the Secret Box flow and is marked read (DEC-002, US003)", async ({ page }) => {
    const box = newestNotice(AN.userId, "secret_box_received", "read_at is null");
    await gotoWithBell(page);
    await openPanel(page);
    await row(page, box.id).getByRole("button").click();
    await expect(boxDialog(page)).toBeVisible();
    await expect(detail(page)).toHaveCount(0);
    await expect(dropdown(page)).toHaveCount(0);
    await expect.poll(() => readAtOf(box.id)).not.toBe("");
  });

  test("a failed mark-read still opens the detail or the Secret Box flow, keeps the dot and the bell count, and says so (FR-405, Codex R19, SC-009)", async ({ page }) => {
    const heart = newestNotice(AN.userId, "heart_received", "read_at is null");
    const box = newestNotice(AN.userId, "secret_box_received", "read_at is null");
    const unread = unreadNotices(AN.userId);
    await page.route(/\/api\/v1\/me\/notifications\/[^/]+\/read$/, (route) =>
      route.request().url().includes(heart.id) ? route.fulfill({ status: 500, body: "{}" }) : route.abort("internetdisconnected"),
    );
    await gotoWithBell(page);
    await openPanel(page);
    await row(page, heart.id).getByRole("button").click();
    await expect(detail(page)).toBeVisible();
    await expect(page.getByTestId("notification-detail-message")).toContainText("vừa nhận thêm lượt tim!");
    await expect(page.getByTestId("notification-detail-status")).toHaveText(FAILED);
    await page.keyboard.press("Escape");
    await expect(row(page, heart.id)).toHaveAttribute("data-unread", "true");
    await expect(bell(page)).toHaveAccessibleDescription(unreadLabel(unread));

    await row(page, box.id).getByRole("button").click(); // the network drops this time
    await expect(boxDialog(page)).toBeVisible();
    await expect(page.getByTestId("notification-announcement")).toHaveText(FAILED);
    await page.keyboard.press("Escape");
    await expect(boxDialog(page)).toHaveCount(0);
    await openPanel(page);
    await expect(row(page, box.id)).toHaveAttribute("data-unread", "true");
    await expect(bell(page)).toHaveAccessibleDescription(unreadLabel(unread));
    expect([readAtOf(heart.id), readAtOf(box.id)]).toEqual(["", ""]);
  });

  test("an anonymous kudo's notice names nobody, also when its sender turned it anonymous after I was notified (BR-002, BR-007, SC-002, Codex R02)", async ({ page, request, baseURL }) => {
    const headers = { Authorization: `Bearer ${bearerFor(BINH, baseURL!)}` };
    const kudo = { title: "Cảm ơn An vì buổi chia sẻ", contentHtml: "<p>Buổi chia sẻ rất hữu ích!</p>", hashtags: ["teamwork"], imageUploadIds: [] };
    const created = await request.post(`${API_BASE_URL}/api/v1/kudos`, { headers, data: { ...kudo, receiverId: AN.userId, isAnonymous: false } });
    expect(created.status()).toBe(201);
    const { kudoId } = (await created.json()) as { kudoId: string };
    try {
      await expect.poll(() => sql(`select count(*) from public.notifications where kudo_id = '${kudoId}' and kind = 'kudo_received';`)).toBe("1");
      const noticeId = sql(`select id from public.notifications where kudo_id = '${kudoId}' and kind = 'kudo_received';`);
      await gotoWithBell(page);
      await openPanel(page);
      await expect(row(page, noticeId)).toContainText(`Sunner ${BINH.name} vừa gửi đến bạn lời ghi nhận đầy yêu thương!`);
      await page.keyboard.press("Escape");

      const edited = await request.patch(`${API_BASE_URL}/api/v1/kudos/${kudoId}`, { headers, data: { ...kudo, isAnonymous: true } });
      expect(edited.status()).toBe(200);
      const listed = page.waitForResponse((r) => /\/api\/v1\/me\/notifications\?/.test(r.url()));
      await bell(page).click();
      const body = await (await listed).text();
      const item = (JSON.parse(body) as { items: { id: string; params: object }[] }).items.find((i) => i.id === noticeId);
      expect(item?.params).toEqual({});
      expect(body).not.toContain(BINH.userId);
      await expect(row(page, noticeId)).toContainText("Một Sunner ẩn danh vừa gửi đến bạn lời ghi nhận đầy yêu thương!");
      await row(page, noticeId).getByRole("button").click();
      await expect(detail(page)).toContainText("Một Sunner ẩn danh");
      await expect(detail(page)).not.toContainText(BINH.name);
    } finally {
      sql(`delete from public.notifications where kudo_id = '${kudoId}'; delete from public.kudos where id = '${kudoId}';`);
    }
  });

  test("texts follow the reader's language; a generic message stays as written (FR-004)", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "saa_locale", value: "en", url: baseURL! }]);
    const hero = newestNotice(AN.userId, "hero_level_up");
    const generic = newestNotice(AN.userId, "generic");
    const box = newestNotice(AN.userId, "secret_box_received");
    await gotoWithBell(page);
    await expect(bell(page)).toHaveAccessibleName("Notifications");
    await bell(page).click();
    await expect(dropdown(page).getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect(row(page, box.id)).toContainText("Congratulations! You just earned a new Secret Box! Click here to open it now!");
    await dropdown(page).getByRole("button", { name: "View all" }).click();
    await expect
      .poll(async () => {
        await page.getByTestId("notification-all-backdrop").evaluate((el) => el.scrollTo(0, el.scrollHeight));
        return row(page, hero.id).count();
      })
      .toBe(1);
    await expect(row(page, hero.id)).toContainText(/You have received kudos from \d+ colleagues and reached (New|Rising|Super|Legend) Hero!/);
    await expect(row(page, hero.id).locator("time")).toHaveText(/\d+ days? ago/);
    await expect(row(page, generic.id)).toContainText(sql(`select params->>'message' from public.notifications where id = '${generic.id}';`));
  });
});

test.describe("admin chrome", () => {
  test.use({ storageState: stateOrAnonymous(ADMIN_STATE) });

  test("an admin earns Secret Boxes too (F008): a Secret Box notice in the admin bell opens the box window there and is marked read (DEC-002)", async ({ page }) => {
    requireState(ADMIN_STATE);
    const adminId = sql(`select id from public.users where email = 'saa.admin.e2e@sun-asterisk.com';`);
    const restoreAdmin = snapshotNotices(adminId);
    try {
      const notice = insertNotice(adminId, "secret_box_received");
      await gotoWithBell(page, "/admin");
      await openPanel(page);
      await row(page, notice).getByRole("button").click();
      await expect(boxDialog(page)).toBeVisible();
      await expect(dropdown(page)).toHaveCount(0);
      await expect.poll(() => readAtOf(notice)).not.toBe("");
    } finally {
      restoreAdmin();
    }
  });
});
