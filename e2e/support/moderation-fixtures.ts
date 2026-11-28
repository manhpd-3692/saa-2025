/**
 * LOCAL-ONLY helpers of the F011 spec (phase 12): a fresh kudo per test to moderate (removed with
 * its notices afterwards), database oracles for the review list, and page locators. Every expected
 * row list comes from the database at test time. Never import this from `src/`.
 */
import { expect, type Page } from "@playwright/test";
import { sql } from "./admin-report-fixtures";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuid = (value: string) => {
  if (!UUID.test(value)) throw new Error(`not a uuid: ${value}`);
  return value;
};
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

export const ADMIN_EMAIL = "saa.admin.e2e@sun-asterisk.com";

/** Inserts a public kudo dated now (the newest row) and returns its id. */
export function insertKudo(senderId: string, receiverId: string, title: string, anonymous = false): string {
  return uuid(sql(`insert into public.kudos (sender_id, receiver_id, title, content, is_anonymous)
    values ('${uuid(senderId)}', '${uuid(receiverId)}', ${literal(title)}, '<p>Kiểm thử duyệt nội dung</p>', ${anonymous})
    returning id;`));
}

/** Removes a test kudo and every notice about it. */
export function deleteKudo(id: string): void {
  sql(`delete from public.notifications where kudo_id = '${uuid(id)}'; delete from public.kudos where id = '${id}';`);
}

/** `status|moderation_version|moderated_by email` of a kudo. */
export const moderationOf = (id: string) =>
  sql(`select k.status || '|' || k.moderation_version || '|' || coalesce(u.email, '')
    from public.kudos k left join public.users u on u.id = k.moderated_by where k.id = '${uuid(id)}';`);

/** Number of notices of a kind about one kudo. */
export const noticesAbout = (id: string, kind: string) =>
  Number(sql(`select count(*) from public.notifications where kudo_id = '${uuid(id)}' and kind = ${literal(kind)};`));

/** Review list oracle (ALG-002): ids matching a SQL predicate on `k` (kudos), newest first. */
export function reviewIds(where = "true", limit = 20, offset = 0): string[] {
  return sql(`select coalesce(string_agg(id::text, ',' order by created_at desc, id desc), '') from (
      select k.id, k.created_at from public.kudos k where ${where}
      order by k.created_at desc, k.id desc limit ${limit} offset ${offset}) x;`)
    .split(",")
    .filter(Boolean);
}

export const kudoCount = (where = "true") => Number(sql(`select count(*) from public.kudos k where ${where};`));

/** Names of the people who sent (or received) a kudo, by name: the A2 options (BR-009). */
export const peopleNames = (column: "sender_id" | "receiver_id", limit = 20) =>
  sql(`select coalesce(string_agg(name, '|' order by name, id), '') from (
      select u.name, u.id from public.users u where exists (select 1 from public.kudos k where k.${column} = u.id)
      order by u.name, u.id limit ${limit}) x;`).split("|");

export const rows = (page: Page) => page.getByTestId("review-row");
export const row = (page: Page, id: string) => page.locator(`[data-testid="review-row"][data-kudo-id="${id}"]`);
export const rowIds = (page: Page) => rows(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-kudo-id")));

/** Waits for the table of the current address (the navigation transition is over). */
export async function settled(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}
