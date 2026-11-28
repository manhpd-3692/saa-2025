import { expect, test, type Page, type Route } from "@playwright/test";
import { runLocalSql } from "./support/local-database";
import { requireState, stateOrAnonymous, USER_STATE } from "./support/test-sessions";

/**
 * F006 phase 7, fix round 1, against the `live` seed (which stores real images in the local
 * `kudo-images` bucket): thumbnails in sender order from opaque keys (FR-002, R01), an anonymous kudo
 * with images exposing no sender id (SC-007), the one reload before "Ảnh không khả dụng." (FR-002 edge,
 * INT-001), the hover card "Gửi KUDO" preselecting the recipient, and the selected filter chip colours
 * measured from Figma 1002:13094.
 */
test.use({ locale: "vi-VN", storageState: stateOrAnonymous(USER_STATE) });
test.beforeEach(() => requireState(USER_STATE));

const sql = (query: string) => runLocalSql(query);
const kudoId = (title: string) => sql(`select id from public.kudos where title = '${title}' order by created_at limit 1;`);
const OPAQUE_KEY = /\/storage\/v1\/object\/sign\/(kudo-images\/[0-9a-f-]{36}\.png)\?token=/;
const SIGNED_IMAGES = "**/storage/v1/object/sign/kudo-images/**";
const objectPaths = (id: string) =>
  sql(`select u.object_path from public.kudo_images ki join public.kudo_uploads u on u.id = ki.upload_id
    where ki.kudo_id = '${id}' order by ki.position;`).split("\n").filter(Boolean);
const thumbnails = (page: Page) => page.getByTestId("kudo-card-detail").getByTestId("kudo-images").locator("img");
const loaded = (page: Page) => thumbnails(page).evaluateAll((imgs) => (imgs as HTMLImageElement[]).map((img) => img.complete && img.naturalWidth > 0));

test("a kudo's thumbnails load from opaque keys in the sender's order (FR-002, FR-603, R01)", async ({ page }) => {
  const id = kudoId("IDOL GIỚI TRẺ");
  await page.goto(`/kudos/${id}`);
  await expect(thumbnails(page)).toHaveCount(5);
  const srcs = await thumbnails(page).evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src") ?? ""));
  expect(srcs.map((src) => src.match(OPAQUE_KEY)?.[1])).toEqual(objectPaths(id));
  await expect.poll(() => loaded(page)).toEqual([true, true, true, true, true]);
});

test("an anonymous kudo with images exposes no sender identifier in its markup or image links (SC-007, R01)", async ({ page }) => {
  const id = kudoId("Người kể chuyện bằng dữ liệu"); // sunner12 (Đỗ Hoàng Hiệp) → sunner13, anonymous, 3 images
  const sender = sql(`select sender_id || '|' || u.name || '|' || u.email from public.kudos k join public.users u on u.id = k.sender_id where k.id = '${id}';`).split("|");
  await page.goto(`/kudos/${id}`);
  await expect(page.getByTestId("anonymous-sender")).toContainText("Ẩn danh");
  await expect(thumbnails(page)).toHaveCount(3);
  const srcs = await thumbnails(page).evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src") ?? ""));
  expect(srcs.map((src) => src.match(OPAQUE_KEY)?.[1])).toEqual(objectPaths(id));
  const html = await page.content();
  for (const trace of [...sender, sender[2].split("@")[0]]) expect(html, trace).not.toContain(trace);
});

test("a thumbnail that fails to load makes the card fetch fresh links once, then it shows (FR-002 edge, INT-001)", async ({ page }) => {
  const id = kudoId("IDOL GIỚI TRẺ");
  // The links the page first renders always fail (as if expired); links signed later load.
  const firstLink = new Map<string, string>();
  await page.route(SIGNED_IMAGES, (route: Route) => {
    const url = new URL(route.request().url());
    if (!firstLink.has(url.pathname)) firstLink.set(url.pathname, url.search);
    return firstLink.get(url.pathname) === url.search ? route.abort("failed") : route.continue();
  });
  let refetches = 0;
  page.on("request", (request) => {
    if (request.method() === "GET" && new URL(request.url()).pathname === `/api/v1/kudos/${id}`) refetches++;
  });
  // Storage signs with second precision: let the re-read reach Go in a later second, as a real
  // re-read of an expired link would, so its links differ from the failed ones.
  await page.route(`**/api/v1/kudos/${id}`, async (route: Route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    await route.continue();
  });
  await page.goto(`/kudos/${id}`);
  await expect.poll(() => loaded(page), { timeout: 10_000 }).toEqual([true, true, true, true, true]);
  await expect(page.getByTestId("image-unavailable")).toHaveCount(0);
  expect(refetches).toBe(1);
});

test("a thumbnail that still fails after the reload shows 'Ảnh không khả dụng.' as text (FR-002 edge, D010)", async ({ page }) => {
  const id = kudoId("IDOL GIỚI TRẺ");
  await page.route(SIGNED_IMAGES, (route: Route) => route.abort("failed"));
  let refetches = 0;
  page.on("request", (request) => {
    if (request.method() === "GET" && new URL(request.url()).pathname === `/api/v1/kudos/${id}`) refetches++;
  });
  await page.goto(`/kudos/${id}`);
  const placeholders = page.getByTestId("kudo-card-detail").getByTestId("image-unavailable");
  await expect(placeholders).toHaveCount(5);
  for (const placeholder of await placeholders.all()) await expect(placeholder).toHaveText("Ảnh không khả dụng.");
  await expect(placeholders.first()).toBeVisible();
  expect(refetches).toBe(1);
});

test("'Gửi KUDO' on a hover card opens a new kudo with that Sunner preselected, still changeable", async ({ page }) => {
  await page.goto("/kudos");
  const card = page.getByTestId("all-kudos-feed").getByTestId("kudo-card-feed").first();
  const receiver = card.getByTestId("person-name").last();
  const name = await receiver.innerText();
  await card.getByTestId("sunner-avatar").last().hover();
  await page.getByTestId("hover-card-send").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Gửi lời cám ơn và ghi nhận đến đồng đội" })).toBeVisible();
  const recipient = dialog.getByRole("combobox");
  await expect(recipient).toHaveValue(name);
  await recipient.fill("Trần");
  await dialog.getByRole("option", { name: /Trần Thị Bình/ }).click();
  await expect(recipient).toHaveValue("Trần Thị Bình");
  await dialog.getByRole("button", { name: "Hủy" }).click();
  await expect(dialog).toHaveCount(0);
});

test("a chosen filter value shows on the chip of Figma 1002:13094: white fill, #998C5F outline (FR-203)", async ({ page }) => {
  await page.goto("/kudos");
  const trigger = page.getByTestId("filter-hashtag").getByRole("button");
  await trigger.click();
  await page.getByRole("menuitemradio", { name: "#high-performing" }).click();
  await expect(trigger).toHaveText("#high-performing");
  const style = await trigger.evaluate((el) => {
    const s = getComputedStyle(el);
    return { fill: s.backgroundColor, outline: s.borderTopColor, width: s.borderTopWidth, radius: s.borderTopLeftRadius, text: s.color };
  });
  // Measured from docs/figma-refs/user/hashtag-group.png: fill #FFFFFF, 1 px outline #998C5F, 8 px corners.
  expect(style).toEqual({ fill: "rgb(255, 255, 255)", outline: "rgb(153, 140, 95)", width: "1px", radius: "8px", text: "rgb(0, 16, 26)" });
});
