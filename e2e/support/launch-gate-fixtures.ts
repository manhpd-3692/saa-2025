/**
 * LOCAL-ONLY helpers for the F003 countdown / launch-gate spec: switch the one `events` row
 * between seed scenarios (the real `backend/db/seeds/*.sql`, event row only, so demo users and
 * test sessions survive), stall the Go events read with a table lock, and fake a hidden tab.
 * Never import this from `src/`.
 */
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { APIRequestContext, Page } from "@playwright/test";
import { runLocalSql } from "./local-database";

const DB_CONTAINER = process.env.SAA_DB_CONTAINER ?? "supabase_db_saa-2025";

/** The proxy launch gate keeps a successful read for 60 s (AD13). */
export const GATE_CACHE_MS = 60_000;

export type SeedScenario = "prelaunch" | "live";

/** Applies the event part of a seed scenario (`delete` + `insert` of the `events` row). */
export function applyEventScenario(scenario: SeedScenario): void {
  runLocalSql(readFileSync(`backend/db/seeds/${scenario}.sql`, "utf8"));
}

/** `startAt` of the current event as epoch milliseconds, read from the public Go endpoint. */
export async function eventStartMs(api: APIRequestContext): Promise<number> {
  const apiBase = process.env.E2E_API_BASE_URL ?? "http://localhost:8080";
  const response = await api.get(`${apiBase}/api/v1/events/current`);
  if (!response.ok()) throw new Error(`events/current answered ${response.status()}`);
  return Date.parse((await response.json()).startAt);
}

/** Where a request is sent without following redirects: `307 /countdown`, `200`, … */
export async function landing(api: APIRequestContext, path: string): Promise<string> {
  const response = await api.get(path, { maxRedirects: 0 });
  const location = response.headers()["location"];
  if (!location) return String(response.status());
  const url = new URL(location, "http://placeholder");
  return `${response.status()} ${url.pathname}${url.search}`;
}

const LOCKED_MARKER = "events-locked";

/** One psql session holding the lock; resolves `locked` true once psql prints the marker. */
function lockSession(sqlInside: string, holdSeconds: number) {
  const docker = process.platform === "win32" ? ["wsl", "docker"] : ["docker"];
  const args = [...docker, "exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-qAt"];
  const child = spawn(args[0], args.slice(1), { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  let onOutput = () => {};
  const collect = (chunk: Buffer) => {
    output += chunk.toString().replaceAll("\0", "");
    onOutput();
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  const exited = new Promise<number | null>((resolve) => child.on("exit", resolve));
  const locked = new Promise<boolean>((resolve) => {
    onOutput = () => output.includes(LOCKED_MARKER) && resolve(true);
    void exited.then(() => resolve(output.includes(LOCKED_MARKER)));
  });
  child.stdin.end(
    `begin;\nlock table public.events in access exclusive mode;\nselect '${LOCKED_MARKER}';\n${sqlInside}\nselect pg_sleep(${holdSeconds});\ncommit;\n`,
  );
  const released = exited.then((code) => {
    if (code !== 0) throw new Error(`lock session failed: ${output}`);
  });
  return { locked, released, output: () => output };
}

/**
 * Holds an ACCESS EXCLUSIVE lock on `events` (Go's read waits: a stalled endpoint, not a
 * refused one) for `holdSeconds`, runs `sqlInside` (keep it idempotent) in the same
 * transaction, and resolves once the lock is granted. `released` settles on commit.
 * `wsl` can time out (WSAETIMEDOUT) before psql starts: wake it and retry.
 */
export async function stallEventsRead(sqlInside: string, holdSeconds: number): Promise<{ released: Promise<void> }> {
  let failure = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const session = lockSession(sqlInside, holdSeconds);
    if (await session.locked) return { released: session.released };
    failure = session.output();
    if (process.platform === "win32") spawnSync("wsl", ["-e", "true"], { timeout: 40_000 });
  }
  throw new Error(`events lock was never granted:\n${failure}`);
}

/**
 * Waits until React has hydrated the countdown (its effects, e.g. the refocus listeners, run
 * only then); the server markup already shows the digits before that.
 */
export async function waitForCountdownHydration(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const unit = document.querySelector("[data-unit]");
    return unit !== null && Object.keys(unit).some((key) => key.startsWith("__reactFiber"));
  });
}

/** Fakes the tab going to the background and back (visibilitychange), running `whileHidden` between. */
export async function hideAndShowTab(page: Page, whileHidden?: () => Promise<void> | void): Promise<void> {
  const setVisibility = (state: "hidden" | "visible") =>
    page.evaluate((value) => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => value });
      document.dispatchEvent(new Event("visibilitychange"));
    }, state);
  await setVisibility("hidden");
  await whileHidden?.();
  await setVisibility("visible");
}
