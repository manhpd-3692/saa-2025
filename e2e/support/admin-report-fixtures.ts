/**
 * LOCAL-ONLY helpers of the F010 spec (phase 11): database oracles for the Overview and the user
 * directory (each rule restated in SQL, so the page is checked against a hand count, SC-001), the
 * admin's bearer token from its storage state, and a small CSV reader for the downloaded exports.
 * Never import this from `src/`.
 */
import { readFileSync } from "node:fs";
import type { BrowserContext, Download } from "@playwright/test";
import { runLocalSql } from "./local-database";

export const API_BASE_URL = (process.env.E2E_API_BASE_URL ?? "http://localhost:8080").replace(/\/+$/, "");
export const sql = (query: string) => runLocalSql(query);

/** Today in Asia/Ho_Chi_Minh (D009) and day arithmetic on `YYYY-MM-DD`. */
export function vnToday(): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Overview figures of one unit code (or All when null) for [from, to] in the report time zone:
 * spam excluded (BR-002), both edge days included (BR-001), "with kudo" = sent or received, each
 * person once (BR-003), headcount without window.
 */
export function overviewOracle(from: string, to: string, unitCode: string | null): string[] {
  const inUnit = (alias: string) => (unitCode === null ? "true" : `${alias}.unit_id = (select id from public.units where code = '${unitCode}')`);
  const row = sql(`
    with w as (
      select ('${from}'::date)::timestamp at time zone 'Asia/Ho_Chi_Minh' as s,
             ('${to}'::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh' as e
    ), k as (
      select k.sender_id, k.receiver_id from public.kudos k, w
      where k.status <> 'spam' and k.created_at >= w.s and k.created_at < w.e
    )
    select concat_ws('|',
      (select count(*) from public.users u where ${inUnit("u")}),
      (select count(*) from k join public.users u on u.id = k.sender_id where ${inUnit("u")}),
      (select count(*) from k join public.users u on u.id = k.receiver_id where ${inUnit("u")}),
      (select count(*) from public.users u where ${inUnit("u")}
         and u.id in (select sender_id from k union select receiver_id from k)),
      (select count(*) from public.secret_boxes b join public.users u on u.id = b.user_id, w
         where ${inUnit("u")} and b.earned_at >= w.s and b.earned_at < w.e));`);
  return row.split("|");
}

/** Emails of the users matching a SQL predicate on `u` (users) and `un` (units), by name then id. */
export function directoryEmails(where = "true", limit = 1000): string[] {
  return sql(`select coalesce(string_agg(email, ',' order by name, id), '') from (
      select u.email, u.name, u.id from public.users u left join public.units un on un.id = u.unit_id
      where ${where} order by u.name, u.id limit ${limit}) x;`)
    .split(",")
    .filter(Boolean);
}

/** The access token of a storage-state session (the `@supabase/ssr` cookie, maybe chunked). */
export async function accessTokenOf(context: BrowserContext, origin: string): Promise<string> {
  const parts = (await context.cookies(origin))
    .filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => Number(a.name.split(".").at(1) ?? 0) - Number(b.name.split(".").at(1) ?? 0));
  const raw = parts.map((c) => c.value).join("");
  const json = raw.startsWith("base64-") ? Buffer.from(raw.slice("base64-".length), "base64url").toString("utf8") : decodeURIComponent(raw);
  return (JSON.parse(json) as { access_token: string }).access_token;
}

/** A saved download: whether it starts with the UTF-8 BOM, and its records (quoted cells allowed). */
export async function readCsvDownload(download: Download): Promise<{ bom: boolean; records: string[][] }> {
  const bytes = readFileSync(await download.path());
  const bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const text = bytes.subarray(bom ? 3 : 0).toString("utf8");
  // A quoted cell may hold commas, CRLF and doubled quotes; every row ends with CRLF (ALG-002).
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted && c === '"' && text[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (c === '"') {
      quoted = !quoted;
    } else if (!quoted && c === ",") {
      record.push(cell);
      cell = "";
    } else if (!quoted && c === "\r" && text[i + 1] === "\n") {
      records.push([...record, cell]);
      record = [];
      cell = "";
      i++;
    } else {
      cell += c;
    }
  }
  return { bom, records };
}
