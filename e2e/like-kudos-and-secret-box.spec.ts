import { expect, test, type Page } from "@playwright/test";
import { activeMultiplier, API_BASE_URL, bearerFor, heartTotal, kudoByTitle, signIn, sql } from "./support/gamification-fixtures";
import { ANONYMOUS, DEMO_SUNNER_01 as AN, DEMO_SUNNER_02 as BINH, requireState, stateOrAnonymous, USER_STATE } from "./support/test-sessions";

/**
 * F008 Like Kudos, hero badges and Thể lệ (phase 8) against the running stack, `live` seed with its
 * running x2 heart campaign. Expected numbers come from the database at test time. The kudo
 * "Người đồng đội tận tâm" is An → Bình: Bình (the recipient) may heart it, An (the sender) may not.
 * Covers F008 FR-002, FR-101, FR-103, FR-201..204, FR-401, FR-402, FR-408, FR-604, BR-001..005,
 * DEC-001..003, D013, US004, SC-001..003, SC-005, SC-010 (badge side) and the screen-tracker rows 30–35.
 */
test.use({ locale: "vi-VN", storageState: stateOrAnonymous(USER_STATE) });
test.beforeEach(() => requireState(USER_STATE));

const KUDO_TITLE = "Người đồng đội tận tâm";
const heartButton = (page: Page) => page.getByTestId("kudo-detail-page").getByTestId("heart-button");
const heartCount = (page: Page) => page.getByTestId("kudo-detail-page").getByTestId("heart-count");
const binhHearts = (kudoId: string) =>
  sql(`select coalesce(string_agg(weight || ':' || (campaign_id is not null), ','), '') from public.hearts where kudo_id = '${kudoId}' and user_id = '${BINH.userId}';`);

test.describe("as the recipient", () => {
  test.use({ storageState: ANONYMOUS });

  test("a heart during the x2 campaign adds 2 at once and after reload; pressing again withdraws it; a double click stores one heart (FR-401, FR-402, BR-001, BR-004, SC-001, SC-003)", async ({ page, context, baseURL }) => {
    const kudoId = kudoByTitle(KUDO_TITLE);
    sql(`delete from public.hearts where kudo_id = '${kudoId}' and user_id = '${BINH.userId}';`);
    const weight = activeMultiplier();
    expect(weight, "the live seed runs an x2 heart campaign").toBeGreaterThanOrEqual(2);
    const before = heartTotal(kudoId);
    await signIn(context, BINH, baseURL!);

    await page.goto(`/kudos/${kudoId}`);
    await expect(heartCount(page)).toHaveText(String(before));
    await expect(heartButton(page)).toHaveAttribute("aria-pressed", "false");
    await heartButton(page).click();
    await expect(heartCount(page)).toHaveText(String(before + weight));
    await expect(heartButton(page)).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => binhHearts(kudoId)).toBe(`${weight}:true`); // weight and campaign stored with the heart
    // The shell re-reads /me on window focus (a new session object): the heart must stay (review W1).
    const meReread = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/v1/me");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await meReread;
    await expect(heartButton(page)).toHaveAttribute("aria-pressed", "true");
    await expect(heartCount(page)).toHaveText(String(before + weight));
    await page.reload();
    await expect(heartCount(page)).toHaveText(String(before + weight));
    await expect(heartButton(page)).toHaveAttribute("aria-pressed", "true");

    await heartButton(page).click();
    await expect(heartCount(page)).toHaveText(String(before));
    await expect(heartButton(page)).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => binhHearts(kudoId)).toBe("");

    await heartButton(page).dblclick(); // the second click waits for the first answer
    await expect(heartButton(page)).toHaveAttribute("aria-busy", "false");
    await expect.poll(() => binhHearts(kudoId)).toBe(`${weight}:true`);
    await expect(heartCount(page)).toHaveText(String(before + weight));
    await heartButton(page).click();
    await expect.poll(() => binhHearts(kudoId)).toBe("");
  });

  test("a failed campaign check saves no heart: the control reverts and says so; a failed badge read only hides the badge (DEC-002, Codex R09, SC-010)", async ({ page, context, baseURL }) => {
    const kudoId = kudoByTitle(KUDO_TITLE);
    sql(`delete from public.hearts where kudo_id = '${kudoId}' and user_id = '${BINH.userId}';`);
    const before = heartTotal(kudoId);
    await signIn(context, BINH, baseURL!);
    await page.route("**/api/v1/campaigns/active", (route) => route.fulfill({ status: 500, json: { error: { code: "campaign_lookup_failed", message: "x" } } }));
    await page.goto("/kudos");
    await expect(page.getByTestId("board-sidebar").locator("dd").first()).toBeVisible();
    await expect(page.getByTestId("campaign-badge")).toHaveCount(0);

    await page.goto(`/kudos/${kudoId}`);
    await page.route(`**/api/v1/kudos/${kudoId}/heart`, (route) =>
      route.fulfill({ status: 500, json: { error: { code: "campaign_lookup_failed", message: "The heart was not recorded; please retry." } } }),
    );
    await heartButton(page).click();
    await expect(page.getByTestId("kudo-detail-page").getByRole("alert")).toHaveText("Không lưu được lượt thả tim. Vui lòng thử lại.");
    await expect(heartCount(page)).toHaveText(String(before));
    await expect(heartButton(page)).toHaveAttribute("aria-pressed", "false");
    expect(binhHearts(kudoId)).toBe("");

    await page.unroute(`**/api/v1/kudos/${kudoId}/heart`); // the badge read still fails; Go's own lookup weighs the heart
    await heartButton(page).click();
    await expect.poll(() => binhHearts(kudoId)).toBe(`${activeMultiplier()}:true`);
    await heartButton(page).click();
    await expect.poll(() => binhHearts(kudoId)).toBe("");
  });
});

test.describe("with no campaign running", () => {
  test.use({ storageState: ANONYMOUS });

  test("no campaign badge shows anywhere and a new heart adds 1 without a campaign (US004 AC2, FR-402, SC-003)", async ({ page, context, baseURL }) => {
    const kudoId = kudoByTitle(KUDO_TITLE);
    sql(`delete from public.hearts where kudo_id = '${kudoId}' and user_id = '${BINH.userId}';`);
    const running = sql(`select id || '|' || starts_at || '|' || ends_at from public.campaigns where starts_at <= now() and now() < ends_at;`)
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split("|"));
    expect(running.length, "the live seed runs a campaign to pause").toBeGreaterThan(0);
    sql(`update public.campaigns set starts_at = least(starts_at, now() - interval '2 seconds'), ends_at = now() - interval '1 second'
      where id in (${running.map(([id]) => `'${id}'`).join(", ")});`);
    try {
      expect(activeMultiplier()).toBe(1);
      const before = heartTotal(kudoId);
      await signIn(context, BINH, baseURL!);
      const campaignRead = page.waitForResponse("**/api/v1/campaigns/active");
      await page.goto("/kudos");
      expect(await (await campaignRead).text()).toBe("null\n");
      await expect(page.getByTestId("board-sidebar").locator("dd").first()).toBeVisible();
      await expect(page.getByTestId("all-kudos-feed").getByTestId("heart-button").first()).toBeVisible();
      await expect(page.getByTestId("campaign-badge")).toHaveCount(0);

      await page.goto(`/kudos/${kudoId}`);
      await heartButton(page).click();
      await expect(heartCount(page)).toHaveText(String(before + 1));
      await expect(page.getByTestId("campaign-badge")).toHaveCount(0);
      await expect.poll(() => binhHearts(kudoId)).toBe("1:false");
      await heartButton(page).click();
      await expect.poll(() => binhHearts(kudoId)).toBe("");
    } finally {
      for (const [id, startsAt, endsAt] of running) sql(`update public.campaigns set starts_at = '${startsAt}', ends_at = '${endsAt}' where id = '${id}';`);
    }
    expect(activeMultiplier()).toBeGreaterThanOrEqual(2);
  });
});

test("the sender's own heart is disabled and Go refuses it; a spam kudo refuses hearts (DEC-001, BR-002, BR-003, FR-604, SC-002)", async ({ page, request, baseURL }) => {
  const kudoId = kudoByTitle(KUDO_TITLE);
  await page.goto(`/kudos/${kudoId}`);
  await expect(heartButton(page)).toBeDisabled();
  await expect(heartButton(page)).toHaveAttribute("title", "Bạn không thể thả tim cho Kudos của mình");
  const headers = { Authorization: `Bearer ${bearerFor(AN, baseURL!)}` };
  const own = await request.put(`${API_BASE_URL}/api/v1/kudos/${kudoId}/heart`, { headers });
  expect(own.status()).toBe(403);
  expect((await own.json()).error.code).toBe("cannot_heart_own_kudo");

  const spam = sql(`insert into public.kudos (sender_id, receiver_id, title, content, status)
    values ('${BINH.userId}', '${AN.userId}', 'E2E spam heart', '<p>spam</p>', 'spam') returning id;`).split("\n")[0];
  try {
    const refused = await request.put(`${API_BASE_URL}/api/v1/kudos/${spam}/heart`, { headers });
    expect(refused.status()).toBe(409);
    expect(Number(sql(`select count(*) from public.hearts where kudo_id = '${spam}';`))).toBe(0);
  } finally {
    sql(`delete from public.kudos where id = '${spam}';`);
  }
});

test("the x2 campaign badge next to the heart total shows name, multiplier and window on hover and on focus (FR-204, US004, D013)", async ({ page }) => {
  expect(activeMultiplier(), "the live seed runs an x2 heart campaign").toBe(2);
  const [name, startsAt, endsAt] = sql(`select name || '|' || starts_at || '|' || ends_at from public.campaigns
    where starts_at <= now() and now() < ends_at order by multiplier desc, starts_at desc limit 1;`).split("|");
  const at = (iso: string) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23", day: "2-digit", month: "2-digit" })
        .formatToParts(new Date(iso.replace(" ", "T").replace(/\+00$/, "Z")))
        .map((x) => [x.type, x.value]),
    );
    return [`${p.hour}:${p.minute}`, `${p.day}/${p.month}`];
  };
  const [startTime, startDate] = at(startsAt);
  const [endTime, endDate] = at(endsAt);
  await page.goto("/kudos");
  const row = page.getByTestId("board-sidebar").locator("dl > div").filter({ hasText: "Số tim bạn nhận được:" });
  const badge = row.getByTestId("campaign-badge");
  await expect(badge.getByRole("button")).toHaveAccessibleName(`Chiến dịch ${name}: mỗi tim được nhân 2`);
  await badge.hover();
  const hover = page.getByTestId("campaign-hover");
  await expect(hover).toContainText(name);
  await expect(hover).toContainText(`Từ ${startTime} ngày ${startDate} đến ${endTime} ngày ${endDate}, tất cả tim bạn nhận được đều được nhân đôi.`);
  await expect(hover.locator("svg text")).toHaveText("x2");
  await page.mouse.move(10, 10);
  await expect(hover).toHaveCount(0);
  await badge.getByRole("button").focus();
  await expect(page.getByTestId("campaign-hover")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("campaign-hover")).toHaveCount(0);

  // D013: the same badge sits beside the heart control of every card; its overlay opens above it.
  const card = page.getByTestId("all-kudos-feed").getByTestId("kudo-card-feed").first();
  await card.scrollIntoViewIfNeeded();
  const cardBadge = card.getByTestId("campaign-badge");
  await expect(cardBadge).toBeVisible();
  const [heartBox, badgeBox] = [await card.getByTestId("heart-button").boundingBox(), await cardBadge.boundingBox()];
  expect(badgeBox!.x).toBeGreaterThan(heartBox!.x + heartBox!.width - 1); // right after the heart
  expect(Math.abs(badgeBox!.y + badgeBox!.height / 2 - (heartBox!.y + heartBox!.height / 2))).toBeLessThan(8);
  await cardBadge.hover();
  const cardHover = card.getByTestId("campaign-hover");
  await expect(cardHover).toContainText(name);
  expect((await cardHover.boundingBox())!.y + 2).toBeLessThan(badgeBox!.y);
});

test("hero badges follow distinct senders and each tier's hover tells its range; a Sunner without senders has none (FR-002, FR-203, BR-005, DEC-003, SC-005)", async ({ page }) => {
  const tierOf = (n: number) => (n === 0 ? null : n <= 4 ? "New" : n <= 9 ? "Rising" : n <= 20 ? "Super" : "Legend");
  const ranges = { New: "Có 1–4 người gửi Kudos cho bạn", Rising: "Có 5-9 người gửi Kudos cho bạn", Super: "Có 10–20 người gửi Kudos cho bạn", Legend: "Có hơn 20 người gửi Kudos cho bạn" };
  // One public, named kudo per tier, received by the Sunner with the most senders in that tier.
  const rows = sql(`with senders as (
      select receiver_id, count(distinct sender_id) n from public.kudos where status = 'public' group by receiver_id)
    select distinct on (t.tier) t.tier || '|' || k.id || '|' || s.n from senders s
    cross join lateral (select case when s.n <= 4 then 'New' when s.n <= 9 then 'Rising' when s.n <= 20 then 'Super' else 'Legend' end tier) t
    join public.kudos k on k.receiver_id = s.receiver_id and k.status = 'public' and not k.is_anonymous
    order by t.tier, s.n desc, k.created_at desc;`).split("\n");
  expect(rows.map((r) => r.split("|")[0]).sort()).toEqual(["Legend", "New", "Rising", "Super"]);
  for (const row of rows) {
    const [tier, kudoId, senders] = row.split("|") as [keyof typeof ranges, string, string];
    expect(tierOf(Number(senders))).toBe(tier);
    await page.goto(`/kudos/${kudoId}`);
    const people = page.getByTestId("kudo-detail-page").getByTestId("person-name");
    const receiverBadge = page.getByTestId("kudo-detail-page").locator('[data-slot="hero-badge"]').last();
    await expect(people.last()).toBeVisible();
    await expect(receiverBadge).toHaveAttribute("data-tier", tier);
    await receiverBadge.hover();
    const hover = page.getByTestId("hero-badge-hover");
    await expect(hover).toContainText(ranges[tier]);
    await expect(hover.getByRole("img")).toHaveAccessibleName(`Huy hiệu ${tier} Hero`);
  }
  // DEC-003: a named sender who never received a public kudo shows no badge.
  const lonely = sql(`select k.id from public.kudos k where k.status = 'public' and not k.is_anonymous
    and not exists (select 1 from public.kudos r where r.receiver_id = k.sender_id and r.status = 'public') order by k.created_at desc limit 1;`);
  await page.goto(`/kudos/${lonely}`);
  await expect(page.getByTestId("kudo-detail-page").locator('[data-slot="hero-badge"]')).toHaveCount(1); // the receiver's only
});

test("Thể lệ opens from the FAB with the three rule blocks; Đóng and Esc close it; Viết KUDOS opens the write window (FR-101, FR-103, FR-201, FR-202, US005)", async ({ page }) => {
  await page.goto("/kudos");
  const toggle = page.getByTestId("fab").getByRole("button", { name: "Mở Thể lệ và Viết KUDOS" });
  const openRules = async () => {
    await toggle.click();
    await page.getByTestId("fab").getByRole("button", { name: "Thể lệ" }).click();
    return page.getByRole("dialog", { name: "Thể lệ" });
  };
  const rules = await openRules();
  await expect(rules.getByRole("heading", { level: 3 })).toHaveText([
    "NGƯỜI NHẬN KUDOS: HUY HIỆU HERO CHO NHỮNG ẢNH HƯỞNG TÍCH CỰC",
    "NGƯỜI GỬI KUDOS: SƯU TẬP TRỌN BỘ 6 ICON, NHẬN NGAY PHẦN QUÀ BÍ ẨN",
    "KUDOS QUỐC DÂN",
  ]);
  await expect(rules.getByTestId("rules-tiers").getByRole("listitem")).toHaveCount(4);
  for (const range of ["Có 1-4 người gửi Kudos cho bạn", "Có 5-9 người gửi Kudos cho bạn", "Có 10–20 người gửi Kudos cho bạn", "Có hơn 20 người gửi Kudos cho bạn"]) {
    await expect(rules.getByTestId("rules-tiers")).toContainText(range);
  }
  await expect(rules.getByTestId("rules-icons").getByRole("listitem")).toHaveText(["Revival", "Touch of Light", "Stay Gold", "Flow to Horizon", "Beyond the Boundary", "Root Further"]);
  await expect(rules).toContainText("Cứ mỗi 5 lượt");
  await expect(rules).toContainText("5 Kudos nhận về nhiều");
  // FR-202 at 1440 x 1024: both actions in view without scrolling; the rules scroll above them.
  await expect(rules.getByRole("button", { name: "Đóng" })).toBeInViewport({ ratio: 1 });
  await expect(rules.getByRole("button", { name: "Viết KUDOS" })).toBeInViewport({ ratio: 1 });
  const body = rules.getByTestId("rules-body");
  expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(rules.getByText("phần quà đặc biệt từ SAA 2025: Root Further.", { exact: false })).toBeInViewport();
  await expect(rules.getByRole("button", { name: "Đóng" })).toBeInViewport({ ratio: 1 });

  await rules.getByRole("button", { name: "Đóng" }).click();
  await expect(rules).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await openRules();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Thể lệ" })).toHaveCount(0);

  await (await openRules()).getByRole("button", { name: "Viết KUDOS" }).click();
  await expect(page.getByRole("dialog", { name: "Thể lệ" })).toHaveCount(0);
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Gửi lời cám ơn và ghi nhận đến đồng đội" })).toBeVisible();
});
