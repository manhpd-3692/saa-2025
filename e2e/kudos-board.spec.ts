import { expect, test, type Page } from "@playwright/test";
import { runLocalSql } from "./support/local-database";
import { ADMIN_STATE, ANONYMOUS, DEMO_SUNNER_01 as ME, requireState, stateOrAnonymous, USER_STATE } from "./support/test-sessions";

/**
 * F006 Live board and View Kudo (phase 7) against the running stack, `live` seed, as the demo
 * Sunner `sunner01.demo`. Expected numbers are read from the database at test time, so kudos left
 * by other specs do not break them. Covers FR-001..003, FR-101..104, FR-201..211, FR-401..405,
 * BR-001..007, SC-001, SC-002, SC-004, SC-006, SC-007 (page markup) and the Homepage/Awards links.
 */
test.use({ locale: "vi-VN", storageState: stateOrAnonymous(USER_STATE) });
test.beforeEach(() => requireState(USER_STATE));

const sql = (query: string) => runLocalSql(query);
const kudoId = (title: string) => sql(`select id from public.kudos where title = '${title}' order by created_at limit 1;`);
const section = (page: Page, id: string) => page.getByTestId(id);
const highlightPosition = (page: Page) => page.getByTestId("highlight-position");
const activeHighlight = (page: Page) => section(page, "highlight-section").locator('li[aria-hidden="false"] [data-testid="kudo-card-highlight"]');
/** Browser requests for a later feed page (the first page is read by the server). */
const NEXT_PAGE = (url: URL) => url.pathname === "/api/v1/kudos" && url.searchParams.has("cursor");
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/gi, "d").toLowerCase();

async function scrollFeedToEnd(page: Page) {
  const end = page.getByTestId("feed-end");
  for (let i = 0; i < 30 && !(await end.isVisible()); i++) {
    await page.getByTestId("feed-sentinel").scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(400);
  }
  await expect(end).toBeVisible();
}

test("the board opens with its key visual and four sections filled from the database (US001, FR-201..210, BR-001)", async ({ page }) => {
  await page.goto("/kudos");
  await expect(page.getByRole("heading", { level: 1, name: /Hệ thống ghi nhận và cảm ơn/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sun* Kudos" }).first()).toHaveAttribute("aria-current", "page");
  // FR-202 / US002: n/5 indicator, previous disabled first, ranked by weighted hearts (non-increasing).
  await expect(highlightPosition(page)).toHaveAttribute("aria-label", "Kudos 1 trên 5");
  const prev = section(page, "highlight-section").getByRole("button", { name: "Kudos trước" }).first();
  const next = section(page, "highlight-section").getByRole("button", { name: "Kudos tiếp theo" }).first();
  await expect(prev).toBeDisabled();
  const hearts: number[] = [];
  for (let i = 0; i < 5; i++) {
    hearts.push(Number((await activeHighlight(page).getByTestId("heart-count").innerText()).replace(/\D/g, "")));
    if (i < 4) await next.click();
  }
  expect(hearts).toEqual([...hearts].sort((a, b) => b - a));
  await expect(highlightPosition(page)).toHaveAttribute("aria-label", "Kudos 5 trên 5");
  await expect(next).toBeDisabled();
  const expectedTop = sql(`select coalesce(sum(h.weight), 0) from public.kudos k left join public.hearts h on h.kudo_id = k.id
    where k.status = 'public' group by k.id order by 1 desc, max(k.created_at) desc limit 1;`);
  expect(hearts[0]).toBe(Number(expectedTop));
  // FR-205: the counter counts public kudos only.
  await expect(page.getByTestId("spotlight-total")).toHaveText(`${sql(`select count(*) from public.kudos where status = 'public';`)} KUDOS`);
  // FR-208 / FR-210: the viewer's own numbers and the latest gift recipients.
  const stats = sql(`select (select count(*) from public.kudos where receiver_id = '${ME.userId}' and status = 'public') || '|' ||
    (select count(*) from public.kudos where sender_id = '${ME.userId}' and status = 'public') || '|' ||
    (select coalesce(sum(h.weight), 0) from public.kudos k join public.hearts h on h.kudo_id = k.id where k.receiver_id = '${ME.userId}' and k.status = 'public');`).split("|");
  const sidebar = page.getByTestId("board-sidebar");
  for (const [label, value] of [["Số Kudos bạn nhận được:", stats[0]], ["Số Kudos bạn đã gửi:", stats[1]], ["Số tim bạn nhận được:", stats[2]]]) {
    await expect(sidebar.locator("dl > div").filter({ hasText: label }).locator("dd")).toHaveText(value);
  }
  const recipients = Number(sql(`select count(distinct user_id) from public.secret_boxes where opened_at is not null;`));
  await expect(page.getByTestId("gift-recipients").getByRole("link")).toHaveCount(Math.min(10, recipients));
});

test("Hashtag and Phòng ban filters re-rank inside the filtered set, reset to the first card and can be cleared (FR-203, FR-204, SC-004)", async ({ page }) => {
  await page.goto("/kudos");
  await page.getByTestId("filter-hashtag").getByRole("button").click();
  await page.getByRole("menuitemradio", { name: "#mentor" }).click();
  await expect(page.getByTestId("filter-hashtag").getByRole("button")).toHaveAccessibleName("Hashtag: #mentor");
  await expect(highlightPosition(page)).toHaveAttribute("aria-label", /^Kudos 1 trên /);
  const cards = section(page, "highlight-section").getByTestId("kudo-card-highlight");
  for (const card of await cards.all()) await expect(card.getByTestId("hashtag-group")).toContainText("#mentor");

  await page.getByTestId("filter-unit").getByRole("button").click();
  await page.getByRole("menuitemradio", { name: "CECV2" }).click();
  const ids = await cards.evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-kudo-id")));
  const expected = sql(`select k.id from public.kudos k join public.users r on r.id = k.receiver_id join public.units u on u.id = r.unit_id
    join public.kudo_hashtags kh on kh.kudo_id = k.id join public.hashtags h on h.id = kh.hashtag_id
    where k.status = 'public' and u.code = 'CECV2' and h.name = 'mentor' order by k.created_at desc;`).split("\n").filter(Boolean);
  expect(new Set(ids)).toEqual(new Set(expected.slice(0, 5)));

  // A combination nothing matches shows the empty state, and "Xoá bộ lọc" brings the top 5 back.
  const [tag, unit] = sql(`select h.name || '|' || u.code from public.hashtags h cross join public.units u
    where exists (select 1 from public.kudo_hashtags kh join public.kudos k on k.id = kh.kudo_id and k.status = 'public' where kh.hashtag_id = h.id)
      and not exists (select 1 from public.kudo_hashtags kh join public.kudos k on k.id = kh.kudo_id join public.users r on r.id = k.receiver_id
        where kh.hashtag_id = h.id and k.status = 'public' and r.unit_id = u.id) order by h.name, u.code limit 1;`).split("|");
  await page.getByTestId("filter-hashtag").getByRole("button").click();
  await page.getByRole("menuitemradio", { name: `#${tag}` }).click();
  await page.getByTestId("filter-unit").getByRole("button").click();
  await page.getByRole("menuitemradio", { name: unit, exact: true }).click();
  await expect(page.getByText("Chưa có Kudos nào phù hợp.")).toBeVisible();
  await page.getByRole("button", { name: "Xoá bộ lọc" }).click();
  await expect(highlightPosition(page)).toHaveAttribute("aria-label", "Kudos 1 trên 5");
  await expect(page.getByTestId("filter-unit").getByRole("button")).toHaveAccessibleName("Phòng ban");
});

test("Spotlight search ignores case and accents and says when nothing matches (FR-206, BR-004)", async ({ page }) => {
  await page.goto("/kudos");
  const names = sql(`select distinct u.name from public.kudos k join public.users u on u.id = k.receiver_id where k.status = 'public';`).split("\n");
  await page.getByTestId("spotlight-search").fill("nguyen");
  await expect(section(page, "spotlight-section").locator("a[data-match]")).toHaveCount(names.filter((n) => fold(n).includes("nguyen")).length);
  await page.getByTestId("spotlight-search").fill("zzzz không ai");
  await expect(page.getByTestId("spotlight-search-status")).toHaveText("Không có kết quả.");
  await expect(section(page, "spotlight-section").locator("a[data-match]")).toHaveCount(0);
});

test("All Kudos loads every public kudo newest first while scrolling, once each, then an end marker; a failed page offers Retry (FR-207, BR-005, SM-001)", async ({ page }) => {
  await page.goto("/kudos");
  const feed = page.getByTestId("all-kudos-feed").getByTestId("kudo-card-feed");
  await expect(feed).toHaveCount(10);
  await page.route(NEXT_PAGE, (route) => route.abort("failed"));
  await page.getByTestId("feed-sentinel").scrollIntoViewIfNeeded();
  await expect(page.getByText("Không tải được thêm Kudos.")).toBeVisible();
  await expect(feed).toHaveCount(10); // loaded cards stay
  await page.unroute(NEXT_PAGE);
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(feed).toHaveCount(20);
  await scrollFeedToEnd(page);
  const ids = await feed.evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-kudo-id")));
  const expected = sql(`select id from public.kudos where status = 'public' order by created_at desc, id desc;`).split("\n");
  expect(ids).toEqual(expected);
  await expect(page.getByTestId("feed-end")).toHaveText("Bạn đã xem hết Kudos.");
});

test("a card opens the detail over the board; Đóng and Esc return to the same place (FR-102, FR-404, D005)", async ({ page }) => {
  await page.goto("/kudos");
  const first = page.getByTestId("all-kudos-feed").getByTestId("kudo-card-feed").first();
  await first.scrollIntoViewIfNeeded();
  const id = await first.getAttribute("data-kudo-id");
  const scrollY = await page.evaluate(() => window.scrollY);
  await first.getByRole("link", { name: /^Xem Kudos: / }).click();
  const dialog = page.getByRole("dialog");
  await expect(page).toHaveURL(`/kudos/${id}`);
  await expect(dialog.getByTestId("kudo-card-detail")).toHaveAttribute("data-kudo-id", id!);
  await expect(page.getByTestId("highlight-section")).toBeAttached(); // the board stays underneath
  await dialog.getByRole("button", { name: "Đóng" }).click();
  await expect(page).toHaveURL("/kudos");
  await expect(dialog).toHaveCount(0);
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrollY)).toBeLessThan(80);
  // Content click and Esc
  await first.locator(".cursor-pointer").click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/kudos");
});

test("a copied link opens the kudo as a page; Copy Link puts its plain address on the clipboard (FR-401, BR-007, US007)", async ({ page, context, baseURL }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const id = kudoId("IDOL GIỚI TRẺ");
  await page.goto(`/kudos/${id}?from=share`);
  const card = page.getByTestId("kudo-detail-page").getByTestId("kudo-card-detail");
  await expect(card.getByRole("heading", { name: "IDOL GIỚI TRẺ" })).toBeVisible();
  await card.getByTestId("copy-link").click();
  await expect(card.getByTestId("copy-link")).toHaveText("Đã sao chép liên kết");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}/kudos/${id}`);
  await card.getByRole("link", { name: "Đóng" }).click();
  await expect(page).toHaveURL("/kudos");
});

/** What the minimal chrome (C01) shows and the full shell would add: visible landmarks, links, FAB. */
async function chromeOf(page: Page) {
  return {
    page: await page.getByTestId("not-found-page").isVisible(),
    nav: await page.getByRole("link", { name: "About SAA 2025", exact: true }).count(),
    languages: await page.getByTestId("locale-switcher").filter({ visible: true }).count(),
    fab: await page.getByTestId("fab").filter({ visible: true }).count(),
    copyright: await page.getByText("Bản quyền thuộc về Sun* © 2025", { exact: true }).filter({ visible: true }).count(),
    avatarMenu: await page.getByRole("button", { name: /^Tài khoản:/ }).count(),
  };
}

test("a missing id, a non-uuid id and someone else's spam kudo show the same 404 in the minimal chrome (FR-405, BR-006, SC-006, C01)", async ({ page }) => {
  const minimal = { page: true, nav: 0, languages: 1, fab: 0, copyright: 1, avatarMenu: 0 };
  const status = (await page.request.get("/no-such-page")).status();
  await page.goto("/no-such-page"); // the root 404 every unknown URL gets
  expect(status).toBe(404);
  expect(await chromeOf(page)).toEqual(minimal);
  const spam = sql(`insert into public.kudos (sender_id, receiver_id, title, content, status)
    values ('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 'E2E spam', '<p>x</p>', 'spam') returning id;`);
  try {
    for (const id of ["not-a-uuid", "6b0f3c55-0000-4000-8000-00000000dead", spam]) {
      expect((await page.request.get(`/kudos/${id}`)).status(), id).toBe(404);
      await page.goto(`/kudos/${id}`);
      await expect(page.getByTestId("not-found-page"), id).toBeVisible();
      expect(await chromeOf(page), id).toEqual(minimal);
      await expect(page.getByTestId("kudo-card-detail")).toHaveCount(0);
    }
  } finally {
    sql(`delete from public.kudos where id = '${spam}';`);
  }
});

test("hovering a named avatar shows the info card after a short delay; an anonymous sender has no card and no link (FR-402, FR-103, DEC-002)", async ({ page }) => {
  await page.goto("/kudos");
  const card = page.getByTestId("all-kudos-feed").getByTestId("kudo-card-feed").first();
  const avatar = card.getByTestId("sunner-avatar").last();
  const userId = (await avatar.getAttribute("href"))!.split("/").pop()!;
  await avatar.hover();
  const hover = page.getByTestId("hover-card");
  await expect(hover).toBeVisible();
  const [name, received, sent] = sql(`select u.name || '|' || (select count(*) from public.kudos where receiver_id = u.id and status = 'public') || '|' ||
    (select count(*) from public.kudos where sender_id = u.id and status = 'public' and not is_anonymous) from public.users u where u.id = '${userId}';`).split("|");
  await expect(hover).toContainText(name);
  await expect(hover).toContainText("Tên đơn vị:");
  await expect(hover).toContainText(`Số Kudos nhận được: ${received}`);
  await expect(hover).toContainText(`Số Kudos đã gửi: ${sent}`);
  await page.mouse.move(5, 5);
  await expect(hover).toHaveCount(0);

  const anonymous = page.getByTestId("all-kudos-feed").getByTestId("anonymous-sender").first();
  await anonymous.scrollIntoViewIfNeeded();
  await anonymous.hover();
  await page.waitForTimeout(600);
  await expect(page.getByTestId("hover-card")).toHaveCount(0);
  await expect(anonymous.locator("a")).toHaveCount(0);
});

test("an anonymous kudo hides its sender from the page markup; the sender's own kudo carries the edit pencil (FR-003, SC-007, FR-104)", async ({ page }) => {
  const anonymous = kudoId("Giải cứu deadline"); // sunner03 → sunner01, anonymous
  await page.goto(`/kudos/${anonymous}`);
  await expect(page.getByTestId("anonymous-sender")).toContainText("Ẩn danh");
  const html = await page.content();
  for (const trace of ["d0000000-0000-4000-8000-000000000003", "Lê Minh Châu", "sunner03"]) expect(html).not.toContain(trace);
  await expect(page.getByTestId("kudo-edit")).toHaveCount(0);

  await page.goto(`/kudos/${kudoId("Đồng đội số một")}`); // sent by sunner01
  await page.getByTestId("kudo-edit").click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Chỉnh sửa bài viết của bạn" })).toBeVisible();
});

test("the Homepage, Awards and header links land on the board; a signed-out kudo link asks to sign in first (FR-101, FR-601)", async ({ page, browser }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "ABOUT KUDOS" }).click();
  await expect(page).toHaveURL("/kudos");
  await expect(page.getByRole("heading", { name: "HIGHLIGHT KUDOS" })).toBeVisible();
  await page.goto("/awards");
  await page.getByRole("link", { name: "Chi tiết: Sun* Kudos" }).click();
  await expect(page).toHaveURL("/kudos");
  await expect(page.getByRole("heading", { name: "ALL KUDOS" })).toBeVisible();

  const id = kudoId("IDOL GIỚI TRẺ");
  const anonymous = await browser.newContext({ storageState: ANONYMOUS });
  const signedOut = await anonymous.newPage();
  await signedOut.goto(`/kudos/${id}`);
  await expect(signedOut).toHaveURL(`/login?next=%2Fkudos%2F${id}`);
  await anonymous.close();
});

test.describe("as an admin", () => {
  test.use({ storageState: stateOrAnonymous(ADMIN_STATE) });
  test.beforeEach(() => requireState(ADMIN_STATE));

  test("the real sender of an anonymous kudo shows with the anonymous marker (G04, FR-003)", async ({ page }) => {
    await page.goto(`/kudos/${kudoId("Giải cứu deadline")}`);
    const card = page.getByTestId("kudo-card-detail");
    await expect(card.getByTestId("person-name").first()).toHaveText("Lê Minh Châu");
    await expect(card).toContainText("(Gửi ẩn danh)");
    await expect(card.getByTestId("anonymous-sender")).toHaveCount(0);
  });
});
