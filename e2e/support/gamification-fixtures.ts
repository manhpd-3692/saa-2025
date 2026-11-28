/**
 * LOCAL-ONLY helpers of the F008 specs (phase 8): database reads and fixtures through
 * `runLocalSql`, and bearer tokens of minted local sessions for direct Go calls (the same
 * token the browser sends). Never import this from `src/`.
 */
import type { BrowserContext } from "@playwright/test";
import { runLocalSql } from "./local-database";
import { mintLocalSessionCookies, type LocalTestIdentity } from "./local-session-cookies";

export const API_BASE_URL = (process.env.E2E_API_BASE_URL ?? "http://localhost:8080").replace(/\/+$/, "");
export const ICONS = ["REVIVAL", "TOUCH_OF_LIGHT", "STAY_GOLD", "FLOW_TO_HORIZON", "BEYOND_THE_BOUNDARY", "ROOT_FURTHER"] as const;

export const sql = (query: string) => runLocalSql(query);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuid = (value: string) => {
  if (!UUID.test(value)) throw new Error(`not a uuid: ${value}`);
  return value;
};

/** Signs `identity` into `context` with a fresh minted session and returns its access token. */
export async function signIn(context: BrowserContext, identity: LocalTestIdentity, baseURL: string): Promise<string> {
  const cookies = mintLocalSessionCookies(identity, baseURL);
  await context.addCookies(cookies);
  return accessToken(cookies.map((c) => c.value).join(""));
}

/** The access token of a minted session without touching any browser context. */
export function bearerFor(identity: LocalTestIdentity, baseURL: string): string {
  return accessToken(mintLocalSessionCookies(identity, baseURL).map((c) => c.value).join(""));
}

function accessToken(cookieValue: string): string {
  const session = JSON.parse(Buffer.from(cookieValue.replace(/^base64-/, ""), "base64url").toString("utf8")) as { access_token: string };
  return session.access_token;
}

/** The demo kudo with this title (oldest when titles repeat). */
export const kudoByTitle = (title: string) => uuid(sql(`select id from public.kudos where title = '${title.replaceAll("'", "''")}' order by created_at limit 1;`));

/** Weighted heart total of a kudo (the kudo_heart_state view, G08). */
export const heartTotal = (kudoId: string) => Number(sql(`select coalesce(sum(weight), 0) from public.hearts where kudo_id = '${uuid(kudoId)}';`));

/** Multiplier a heart given now gets: the highest active campaign, else 1 (BR-004). */
export const activeMultiplier = () => Number(sql(`select coalesce(max(multiplier), 1) from public.campaigns where starts_at <= now() and now() < ends_at;`));

export const unopenedBoxes = (userId: string) =>
  Number(sql(`select count(*) from public.secret_boxes where user_id = '${uuid(userId)}' and opened_at is null;`));

export const distinctIcons = (userId: string) =>
  Number(sql(`select count(distinct icon) from public.secret_boxes where user_id = '${uuid(userId)}' and icon is not null;`));

/** Test fixture: at least `min` unopened boxes, added above the user's highest box number. */
export function ensureUnopenedBoxes(userId: string, min: number): number {
  const missing = Math.max(0, min - unopenedBoxes(userId));
  if (missing > 0) {
    sql(`insert into public.secret_boxes (user_id, seq)
      select '${uuid(userId)}', coalesce((select max(seq) from public.secret_boxes where user_id = '${userId}'), 0) + s
      from generate_series(1, ${missing}) s;`);
  }
  return unopenedBoxes(userId);
}

/** Test fixture: the user's boxes become exactly `opened` icons plus `unopened` closed boxes; completion cleared. */
export function resetBoxes(userId: string, opened: readonly string[], unopened: number) {
  const values = opened.map((icon, i) => `('${uuid(userId)}', ${i + 1}, now() - interval '1 day', '${icon}'::public.secret_box_icon)`);
  sql(`delete from public.secret_boxes where user_id = '${uuid(userId)}';
    update public.users set icons_completed_at = null where id = '${userId}';
    ${values.length > 0 ? `insert into public.secret_boxes (user_id, seq, opened_at, icon) values ${values.join(", ")};` : ""}
    insert into public.secret_boxes (user_id, seq) select '${userId}', ${opened.length} + s from generate_series(1, ${unopened}) s;`);
}
