/**
 * LOCAL-ONLY helpers of the F009 notification center spec (phase 10): database reads, fixtures
 * and page locators. Every expected list or count comes from the database at test time. Never
 * import this from `src/`.
 */
import { expect, type Page } from "@playwright/test";
import { sql } from "./gamification-fixtures";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuid = (value: string) => {
  if (!UUID.test(value)) throw new Error(`not a uuid: ${value}`);
  return value;
};

/** Keeps a Sunner's notifications as they were, whatever a test changes or adds. */
export function snapshotNotices(userId: string): () => void {
  const rows = sql(`select coalesce(json_agg(n), '[]') from public.notifications n where recipient_id = '${uuid(userId)}';`).replaceAll("'", "''");
  return () =>
    sql(`delete from public.notifications where recipient_id = '${userId}';
      insert into public.notifications select * from json_populate_recordset(null::public.notifications, '${rows}');`);
}

/** The Sunner's notice ids newest first (FR-203: created_at desc, id desc). */
export const noticeIdsNewestFirst = (userId: string) =>
  sql(`select coalesce(string_agg(id::text, ',' order by created_at desc, id desc), '') from public.notifications where recipient_id = '${uuid(userId)}';`)
    .split(",")
    .filter(Boolean);

export const unreadNotices = (userId: string) =>
  Number(sql(`select count(*) from public.notifications where recipient_id = '${uuid(userId)}' and read_at is null;`));

/** The newest notice of a kind: its id, kudo id and whether it is still unread. */
export function newestNotice(userId: string, kind: string, extra = "true") {
  const [id, kudoId, unread] = sql(`select id, coalesce(kudo_id::text, ''), (read_at is null)::text from public.notifications
    where recipient_id = '${uuid(userId)}' and kind = '${kind}' and ${extra} order by created_at desc, id desc limit 1;`).split("|");
  return { id: uuid(id), kudoId, unread: unread === "true" };
}

export const readAtOf = (noticeId: string) => sql(`select coalesce(read_at::text, '') from public.notifications where id = '${uuid(noticeId)}';`);

/** Adds a notice as a producer would have stored it; returns its id. */
export const insertNotice = (userId: string, kind: string, params = "{}", readAt = "null") =>
  uuid(sql(`insert into public.notifications (recipient_id, kind, params, read_at) values ('${uuid(userId)}', '${kind}', '${params.replaceAll("'", "''")}'::jsonb, ${readAt}) returning id;`));

export const bell = (page: Page) => page.getByTestId("notification-bell");
export const bellDot = (page: Page) => page.getByTestId("notification-bell-dot");
export const dropdown = (page: Page) => page.getByTestId("notification-panel");
export const fullHistory = (page: Page) => page.getByTestId("notification-panel-all");
export const rows = (page: Page) => page.getByTestId("notification-row");
export const row = (page: Page, id: string) => page.locator(`[data-testid="notification-row"][data-id="${id}"]`);
export const detail = (page: Page) => page.getByTestId("notification-detail");
export const rowIds = (page: Page) => rows(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-id")));

/** Loads a page and waits for the bell's first unread-count read, so the bell is hydrated. */
export async function gotoWithBell(page: Page, path = "/") {
  const counted = page.waitForResponse((r) => r.url().includes("/api/v1/me/notifications/unread-count"));
  await page.goto(path);
  await counted;
}

/** Opens the panel from the (hydrated) bell and waits for the first page. */
export async function openPanel(page: Page) {
  await bell(page).click();
  await expect(dropdown(page)).toBeVisible();
  await expect(page.getByTestId("notification-skeleton")).toHaveCount(0);
}

/** "Xem tất cả", then scrolls the full history until every page is in (FR-403). */
export async function loadFullHistory(page: Page, total: number) {
  await dropdown(page).getByRole("button", { name: "Xem tất cả" }).click();
  await expect(fullHistory(page)).toBeVisible();
  await expect
    .poll(async () => {
      await page.getByTestId("notification-all-backdrop").evaluate((el) => el.scrollTo(0, el.scrollHeight));
      return rows(page).count();
    })
    .toBe(total);
}
