import { expect, test, type Page } from "@playwright/test";
import { API_BASE_URL, bearerFor, distinctIcons, kudoByTitle, resetBoxes, sql } from "./support/gamification-fixtures";
import { ADMIN_STATE, ANONYMOUS, DEMO_SUNNER_01 as AN, DEMO_SUNNER_02 as BINH, requireState, stateOrAnonymous, USER_STATE } from "./support/test-sessions";

/**
 * F007 own and other Sunner profiles (phase 9) against the running stack, `live` seed, signed in
 * as Nguyễn Văn An. Every expected number and list comes from the database at test time. Covers
 * screen-tracker rows 51–53: F007 FR-001, FR-101..105, FR-201..206, FR-301, FR-302, FR-401..404,
 * FR-601..605, BR-001..005, DEC-001, DEC-002, SC-001, SC-002, SC-003, SC-005, SC-007, SC-008,
 * SC-011 (browser side) and US001..US006. Privacy and counts are proven in full by the Go tests.
 */
test.use({ locale: "vi-VN", storageState: stateOrAnonymous(USER_STATE) });

const demo = (n: number) => `d0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const CHAU = demo(3); // sent "Giải cứu deadline" anonymously to An
const KHANG = demo(6); // received "Tinh thần học hỏi" anonymously from Đặng Mai Linh (7)
const MAI_LINH = { userId: demo(7), name: "Đặng Mai Linh" };
const NHAT = demo(10); // Legend Hero: more than 20 kudos received
const NHAT_NAME = "Huỳnh Dương Xuân Nhật";
const n = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

/** Public kudos matching `where` (BR-003: spam never counts). */
const count = (where: string) => Number(sql(`select count(*) from public.kudos where status = 'public' and ${where};`));
/** Ids of public kudos matching `where`, newest first (BR-005). */
const newestIds = (where: string, limit = 100) =>
  sql(`select coalesce(string_agg(id::text, ',' order by created_at desc, id desc), '') from (
    select id, created_at from public.kudos where status = 'public' and ${where} order by created_at desc, id desc limit ${limit}) k;`)
    .split(",")
    .filter(Boolean);
const heartsReceived = (userId: string) =>
  Number(sql(`select coalesce(sum(h.weight), 0) from public.hearts h join public.kudos k on k.id = h.kudo_id
    where k.receiver_id = '${userId}' and k.status = 'public';`));

const stat = (page: Page, key: string) => page.getByTestId(`profile-stat-${key}`);
const cards = (page: Page) => page.getByTestId("profile-kudos-list").getByTestId("kudo-card-feed");
const cardIds = (page: Page) => cards(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-kudo-id")));
const filterButton = (page: Page) => page.getByTestId("profile-filter").getByRole("button");
const openBox = (page: Page) => page.getByTestId("profile-open-box");
const headerNav = (page: Page) => page.getByRole("banner").getByRole("navigation");
const boxModal = (page: Page) => page.getByRole("dialog", { name: /KHÁM PHÁ SECRET BOX CỦA BẠN|Chúc mừng/ });

/** Keeps An's secret boxes as they were, whatever a test changes (other specs read them too). */
function snapshotBoxes(userId: string): () => void {
  const rows = sql(`select coalesce(json_agg(b), '[]') from public.secret_boxes b where user_id = '${userId}';`).replaceAll("'", "''");
  const completed = sql(`select coalesce(icons_completed_at::text, '') from public.users where id = '${userId}';`);
  return () =>
    sql(`delete from public.secret_boxes where user_id = '${userId}';
      insert into public.secret_boxes select * from json_populate_recordset(null::public.secret_boxes, '${rows}');
      update public.users set icons_completed_at = ${completed ? `'${completed}'` : "null"} where id = '${userId}';`);
}

async function loadWholeList(page: Page) {
  const more = page.getByRole("button", { name: "Xem thêm" });
  while (await more.isVisible()) {
    const shown = await cards(page).count();
    await more.click();
    await expect.poll(() => cards(page).count()).toBeGreaterThan(shown);
  }
}

test.describe("as a Sunner", () => {
  test.beforeEach(() => requireState(USER_STATE));

  test("Profile in the avatar menu opens my profile: identity, collected icons, five counts and my received kudos (row 51, FR-101, FR-201..204, FR-403, SC-001, SC-008)", async ({ page }) => {
    const restore = snapshotBoxes(AN.userId);
    try {
      resetBoxes(AN.userId, ["REVIVAL", "STAY_GOLD"], 0);
      await page.goto("/");
      await page.getByRole("button", { name: /^Tài khoản:/ }).click();
      await page.getByRole("menuitem", { name: "Profile" }).click();
      await expect(page).toHaveURL("/profile");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(AN.name);
      await expect(headerNav(page).locator('[aria-current="page"]')).toHaveCount(0); // own frame 362:5037: no section
      await expect(page.getByTestId("profile-unit")).toHaveText("CECV1");
      const icons = page.getByTestId("profile-icons").getByRole("listitem");
      await expect(icons).toHaveCount(6);
      expect(await icons.evaluateAll((els) => els.filter((el) => el.dataset.collected === "true").map((el) => el.dataset.icon))).toEqual(["REVIVAL", "STAY_GOLD"]);
      await expect(page.getByText("Bộ sưu tập icon của tôi")).toBeVisible();

      const received = count(`receiver_id = '${AN.userId}'`);
      const sent = count(`sender_id = '${AN.userId}'`); // the owner's anonymous kudos count for the owner (BR-002)
      await expect(stat(page, "kudosReceived")).toHaveText(n(received));
      await expect(stat(page, "kudosSent")).toHaveText(n(sent));
      await expect(stat(page, "heartsReceived")).toHaveText(n(heartsReceived(AN.userId)));
      await expect(stat(page, "boxesOpened")).toHaveText("2");
      await expect(stat(page, "boxesUnopened")).toHaveText("0");
      await expect(openBox(page)).toBeDisabled(); // D009: 0 unopened boxes
      // Screen spec § 9: the disabled button states why, to screen readers only (no visible copy in the design).
      await expect(openBox(page)).toHaveAccessibleDescription("Bạn chưa có Secret Box nào để mở.");
      await openBox(page).click({ force: true });
      await expect(boxModal(page)).toHaveCount(0);

      await expect(filterButton(page)).toHaveText(`Đã nhận (${n(received)})`);
      expect(await cardIds(page)).toEqual(newestIds(`receiver_id = '${AN.userId}'`, 10));
    } finally {
      restore();
    }
  });

  test("Mở Secret Box opens the F008 window from my profile; closing it refreshes counts and icons without a reload (row 51, FR-203, FR-404, US005, SC-008)", async ({ page }) => {
    const restore = snapshotBoxes(AN.userId);
    try {
      resetBoxes(AN.userId, ["REVIVAL"], 1);
      await page.goto("/profile");
      await expect(stat(page, "boxesUnopened")).toHaveText("1");
      await expect(openBox(page)).toBeEnabled();
      await openBox(page).click();
      await expect(boxModal(page)).toHaveAttribute("data-phase", "ready");
      await boxModal(page).getByTestId("secret-box-picture").click();
      await expect(boxModal(page).locator('[data-picture="revealed"]')).toBeVisible();
      await boxModal(page).getByRole("button", { name: "Đóng" }).click();
      await expect(boxModal(page)).toHaveCount(0);
      await expect(stat(page, "boxesUnopened")).toHaveText("0");
      await expect(stat(page, "boxesOpened")).toHaveText("2");
      await expect(openBox(page)).toBeDisabled();
      const collected = page.getByTestId("profile-icons").locator('[data-collected="true"]');
      await expect(collected).toHaveCount(distinctIcons(AN.userId));
    } finally {
      restore();
    }
  });

  test("the received/sent dropdown switches to my sent kudos, keeps the choice in the address and after a reload (rows 51 + 53, FR-205, FR-401, SC-002, D002)", async ({ page }) => {
    await page.goto("/profile");
    const received = count(`receiver_id = '${AN.userId}'`);
    const sent = count(`sender_id = '${AN.userId}'`);
    await filterButton(page).click();
    const options = page.getByTestId("profile-filter").getByRole("menuitemradio");
    await expect(options).toHaveText([`Đã nhận (${n(received)})`, `Đã gửi (${n(sent)})`]);
    await expect(options.first()).toHaveAttribute("aria-checked", "true");
    await options.last().click();
    await expect(page).toHaveURL("/profile?filter=sent");
    await expect(filterButton(page)).toHaveText(`Đã gửi (${n(sent)})`);
    const want = newestIds(`sender_id = '${AN.userId}'`, 10);
    await expect.poll(() => cardIds(page)).toEqual(want);
    // D002: the owner's own anonymous kudos are listed, with the sender masked like for everyone else.
    const anonymous = count(`sender_id = '${AN.userId}' and is_anonymous and id in (${want.map((id) => `'${id}'`).join(",")})`);
    await expect(page.getByTestId("profile-kudos-list").getByTestId("anonymous-sender")).toHaveCount(anonymous);

    await page.reload();
    await expect(filterButton(page)).toHaveText(`Đã gửi (${n(sent)})`);
    expect(await cardIds(page)).toEqual(want);
  });

  test("a teammate's avatar opens their read-only profile: no box action or figure, no email, and the send button preselects them (row 52, FR-102, FR-301, FR-605, SC-007, US003, US004)", async ({ page }) => {
    await page.goto(`/kudos/${kudoByTitle("Người đồng đội tận tâm")}`); // An → Bình
    await page.getByTestId("kudo-card-detail").getByTestId("sunner-avatar").last().click();
    await expect(page).toHaveURL(`/profile/${BINH.userId}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(BINH.name);
    // Figma 362:5097: a teammate's profile sits under Sun* Kudos in the header.
    await expect(headerNav(page).locator('[aria-current="page"]')).toHaveText("Sun* Kudos");
    await expect(page.getByText(`Bộ sưu tập icon của ${BINH.name}`)).toBeVisible();
    await expect(openBox(page)).toHaveCount(0);
    await expect(stat(page, "boxesOpened")).toHaveCount(0);
    await expect(stat(page, "boxesUnopened")).toHaveCount(0);
    await expect(stat(page, "kudosReceived")).toHaveText(n(count(`receiver_id = '${BINH.userId}'`)));
    await expect(stat(page, "kudosSent")).toHaveText(n(count(`sender_id = '${BINH.userId}' and not is_anonymous`)));
    await expect(stat(page, "heartsReceived")).toHaveText(n(heartsReceived(BINH.userId)));
    expect(await page.content()).not.toContain(BINH.email);

    await page.getByTestId("profile-send-kudo").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("combobox")).toHaveValue(BINH.name);
    await dialog.getByRole("button", { name: "Hủy" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("after a kudo is sent from a teammate's profile the list follows the new counts without a reload: the new kudo on top, a kudo turned spam gone (FR-403, FR-604, review W2)", async ({ page }) => {
    await page.goto(`/profile/${NHAT}`);
    const before = count(`receiver_id = '${NHAT}'`);
    expect(before, "Nhật's received list has more than one page in the live seed").toBeGreaterThan(10);
    await expect(stat(page, "kudosReceived")).toHaveText(n(before));
    const turnedSpam = (await cardIds(page))[1]!;
    sql(`update public.kudos set status = 'spam' where id = '${turnedSpam}';`); // moderated while the page is open
    let kudoId = "";
    try {
      await page.getByTestId("profile-send-kudo").click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("combobox")).toHaveValue(NHAT_NAME);
      await dialog.getByLabel("Danh hiệu").fill("E2E kudo từ trang cá nhân");
      await dialog.getByRole("textbox", { name: "Lời nhắn" }).click();
      await page.keyboard.type("Cảm ơn bạn từ trang cá nhân!");
      await dialog.getByTestId("hashtag-add").click();
      const search = page.getByRole("textbox", { name: "Tìm hoặc thêm hashtag" });
      await search.fill("e2e-profile");
      await search.press("Enter");
      await search.press("Escape");
      const created = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/api/v1/kudos"));
      await dialog.getByRole("button", { name: "Gửi", exact: true }).click();
      const answer = await created;
      expect(answer.status()).toBe(201);
      kudoId = ((await answer.json()) as { kudoId: string }).kudoId;
      await expect(dialog).toHaveCount(0);
      await expect(stat(page, "kudosReceived")).toHaveText(n(before)); // one in, one out
      await expect(filterButton(page)).toHaveText(`Đã nhận (${n(before)})`);
      await expect(cards(page).first()).toHaveAttribute("data-kudo-id", kudoId);
      await expect.poll(() => cardIds(page)).not.toContain(turnedSpam);
      expect(await cardIds(page)).toEqual(newestIds(`receiver_id = '${NHAT}'`, 10));
    } finally {
      sql(`update public.kudos set status = 'public' where id = '${turnedSpam}';`);
      if (kudoId) sql(`delete from public.notifications where kudo_id = '${kudoId}'; delete from public.kudos where id = '${kudoId}';`);
    }
  });

  test("a filter change while 'Xem thêm' is loading wins: the late page is never added to the new list (review W1)", async ({ page }) => {
    await page.goto(`/profile/${NHAT}`);
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/v1/users/*/kudos?filter=received&cursor=*", async (route) => {
      await held;
      await route.continue();
    });
    await page.getByRole("button", { name: "Xem thêm" }).click();
    await filterButton(page).click();
    await page.getByTestId("profile-filter").getByRole("menuitemradio").last().click();
    const sent = newestIds(`sender_id = '${NHAT}' and not is_anonymous`, 10);
    await expect(page).toHaveURL(`/profile/${NHAT}?filter=sent`);
    await expect.poll(() => cardIds(page)).toEqual(sent);
    const late = page.waitForResponse((r) => r.url().includes("filter=received&cursor="));
    release();
    await late;
    await page.waitForTimeout(500); // give a wrongly applied late answer the time to render
    expect(await cardIds(page)).toEqual(sent);
    await expect(filterButton(page)).toContainText("Đã gửi");
  });

  test("my own id on the teammate address opens my profile with the filter kept; unknown and malformed ids show Not found (row 52, FR-103, FR-104, DEC-001, SC-003)", async ({ page }) => {
    await page.goto(`/profile/${AN.userId}?filter=sent`);
    await expect(page).toHaveURL("/profile?filter=sent");
    await expect(openBox(page)).toBeVisible();
    await expect(filterButton(page)).toContainText("Đã gửi");
    for (const id of ["not-a-uuid", "6b0f3c55-0000-4000-8000-00000000dead"]) {
      expect((await page.request.get(`/profile/${id}`)).status(), id).toBe(404);
      await page.goto(`/profile/${id}`);
      await expect(page.getByTestId("not-found-page"), id).toBeVisible();
      await expect(page.getByTestId("fab").filter({ visible: true }), id).toHaveCount(0); // minimal chrome (C01)
      await expect(page.getByTestId("profile-header"), id).toHaveCount(0);
    }
  });

  test("load more appends the next 10 cards until the end; an empty filter shows the empty state (FR-206, FR-302, FR-402, BR-005)", async ({ page }) => {
    const want = newestIds(`receiver_id = '${NHAT}'`);
    expect(want.length, "the live seed gives Nhật more than 20 kudos").toBeGreaterThan(20);
    await page.goto(`/profile/${NHAT}`);
    expect(await cardIds(page)).toEqual(want.slice(0, 10));
    await page.getByRole("button", { name: "Xem thêm" }).click();
    await expect(cards(page)).toHaveCount(20);
    await loadWholeList(page);
    expect(await cardIds(page)).toEqual(want);
    await expect(page.getByRole("button", { name: "Xem thêm" })).toHaveCount(0);

    const quiet = sql(`select u.id from public.users u where u.email like 'sunner%.demo@sun-asterisk.com'
      and not exists (select 1 from public.kudos k where k.receiver_id = u.id and k.status = 'public') order by u.email limit 1;`);
    await page.goto(`/profile/${quiet}`);
    await expect(page.getByTestId("profile-kudos-empty")).toHaveText("Chưa có Kudos nào ở đây.");
    await expect(stat(page, "kudosReceived")).toHaveText("0");
  });

  test("a failed list request keeps the cards shown, says so and retries; the address follows only a loaded filter (US002 error path)", async ({ page }) => {
    await page.goto(`/profile/${NHAT}`);
    const shown = await cardIds(page);
    await page.route("**/api/v1/users/*/kudos?filter=sent*", (route) => route.fulfill({ status: 500, json: { error: { code: "internal_error", message: "x" } } }));
    await filterButton(page).click();
    await page.getByTestId("profile-filter").getByRole("menuitemradio").last().click();
    await expect(page.getByTestId("profile-kudos-section").getByRole("alert")).toContainText("Không tải được Kudos. Vui lòng thử lại.");
    expect(await cardIds(page)).toEqual(shown);
    await expect(page).toHaveURL(`/profile/${NHAT}`);
    await page.unroute("**/api/v1/users/*/kudos?filter=sent*");
    await page.getByTestId("profile-kudos-section").getByRole("button", { name: "Thử lại" }).click();
    await expect(page).toHaveURL(`/profile/${NHAT}?filter=sent`);
    await expect.poll(() => cardIds(page)).toEqual(newestIds(`sender_id = '${NHAT}' and not is_anonymous`, 10));
  });

  test("anonymous kudos stay anonymous on teammates' profiles: masked sender without a link, anonymous sends out of the list and the count (row 52, FR-602, FR-603, BR-001, BR-002, SC-005, SC-011)", async ({ page, baseURL }) => {
    const visibleSent = count(`sender_id = '${CHAU}' and not is_anonymous`);
    const hidden = newestIds(`sender_id = '${CHAU}' and is_anonymous`);
    expect(hidden.length, "Châu sent An an anonymous kudo in the live seed").toBeGreaterThan(0);
    await page.goto(`/profile/${CHAU}?filter=sent`);
    await expect(stat(page, "kudosSent")).toHaveText(n(visibleSent));
    await expect(filterButton(page)).toHaveText(`Đã gửi (${n(visibleSent)})`);
    await loadWholeList(page);
    const ids = await cardIds(page);
    expect(ids).toHaveLength(visibleSent);
    for (const id of hidden) expect(ids).not.toContain(id);

    const anonymousKudo = kudoByTitle("Tinh thần học hỏi"); // Đặng Mai Linh → Khang, anonymous
    await page.goto(`/profile/${KHANG}`);
    const card = page.locator(`[data-testid="kudo-card-feed"][data-kudo-id="${anonymousKudo}"]`);
    await expect(card.getByTestId("anonymous-sender")).toBeVisible();
    await expect(card.locator(`a[href="/profile/${MAI_LINH.userId}"]`)).toHaveCount(0);
    await expect(card).not.toContainText(MAI_LINH.name);
    const api = await page.request.get(`${API_BASE_URL}/api/v1/users/${KHANG}/kudos?filter=received`, {
      headers: { Authorization: `Bearer ${bearerFor(AN, baseURL!)}` },
    });
    expect(api.status()).toBe(200);
    expect(await api.text()).not.toContain(MAI_LINH.userId);
  });
});

test.describe("signed out", () => {
  test.use({ storageState: ANONYMOUS });

  test("both profile addresses send an anonymous visitor to Login with the way back (FR-601)", async ({ page }) => {
    for (const path of ["/profile", `/profile/${CHAU}`]) {
      await page.goto(path);
      await expect(page).toHaveURL(`/login?next=${encodeURIComponent(path)}`);
    }
  });
});

test.describe("as an admin", () => {
  test.use({ storageState: stateOrAnonymous(ADMIN_STATE) });
  test.beforeEach(() => requireState(ADMIN_STATE));

  test("an admin sees a teammate's anonymous sends, with the real sender and the anonymous marker (D010, G04)", async ({ page }) => {
    const allSent = count(`sender_id = '${CHAU}'`);
    const anonymousKudo = kudoByTitle("Giải cứu deadline"); // Châu → An, anonymous
    await page.goto(`/profile/${CHAU}?filter=sent`);
    await expect(stat(page, "kudosSent")).toHaveText(n(allSent));
    await loadWholeList(page);
    const card = page.locator(`[data-testid="kudo-card-feed"][data-kudo-id="${anonymousKudo}"]`);
    await expect(card.getByTestId("person-name").first()).toHaveText("Lê Minh Châu");
    await expect(card).toContainText("(Gửi ẩn danh)");
  });
});
