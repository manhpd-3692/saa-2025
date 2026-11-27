import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  GATE_CACHE_MS,
  applyEventScenario,
  eventStartMs,
  hideAndShowTab,
  landing,
  stallEventsRead,
  waitForCountdownHydration,
} from "./support/launch-gate-fixtures";
import { runLocalSql } from "./support/local-database";
import { ANONYMOUS, USER_STATE, requireState, stateOrAnonymous } from "./support/test-sessions";

/**
 * F003 countdown and launch gate (phase 4) against the running stack. The event row is switched
 * between seed scenarios here and put back to `live` at the end. The proxy keeps a successful
 * event read for 60 s, so the order of the steps below is deliberate: no step leaves a stale
 * "upcoming" reading in the gate while the next one needs the site open.
 * Covers SC-001..SC-005, SC-007..SC-012, FR-201..FR-204, FR-401..FR-403, FR-601, F001 SC-004.
 */
test.use({ locale: "vi-VN", storageState: stateOrAnonymous(USER_STATE) });
// SQL runs through `wsl docker`, which can stall for tens of seconds and retries (see e2e/README.md).
const TEST_TIMEOUT_MS = GATE_CACHE_MS + 150_000;
test.describe.configure({ mode: "serial", timeout: TEST_TIMEOUT_MS });

let anonymous: APIRequestContext;
const unit = (page: Page, name: "days" | "hours" | "minutes") => page.locator(`[data-unit="${name}"]`);
const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
const markDocument = (page: Page) => page.evaluate(() => Object.assign(window, { __sameDocument: true }));
const sameDocument = (page: Page) => page.evaluate(() => (window as { __sameDocument?: boolean }).__sameDocument === true);
const twoDigits = (value: number) => String(value).padStart(2, "0");

test.beforeAll(async ({ baseURL }) => {
  test.setTimeout(TEST_TIMEOUT_MS);
  anonymous = await request.newContext({ baseURL, storageState: ANONYMOUS });
  requireState(USER_STATE);
  applyEventScenario("prelaunch");
});

test.afterAll(async () => {
  test.setTimeout(TEST_TIMEOUT_MS);
  applyEventScenario("live");
  // Leave the gate open for the next spec file: wait out any cached "upcoming" reading.
  await expect.poll(() => landing(anonymous, "/"), { timeout: GATE_CACHE_MS + 15_000, intervals: [2_000] }).toBe("307 /login");
  await anonymous.dispose();
});

test("prelaunch: bare countdown page with days, hours and minutes on the server clock (SC-012, FR-201..203, SC-004)", async ({ page }) => {
  // Device clock 26 h ahead: digits still follow the server (BR-003). Prelaunch starts in 2 days.
  await page.clock.install({ time: Date.now() + 26 * 3_600_000 });
  await page.goto("/countdown");
  await expect(page.getByRole("heading", { level: 1, name: "Sự kiện sẽ bắt đầu sau" })).toBeVisible();
  await expect(unit(page, "days")).toHaveAttribute("data-value", "01");
  await expect(unit(page, "hours")).toHaveAttribute("data-value", "23");
  await expect(unit(page, "minutes")).toHaveAttribute("data-value", /^5\d$/);
  for (const name of ["days", "hours", "minutes"] as const) {
    await expect(unit(page, name).locator(":scope > div > div")).toHaveCount(2); // "01", never "1" (FR-202)
  }
  await expect(unit(page, "days")).toContainText("DAYS");
  await expect(page.getByText(/^1 ngày 23 giờ 5\d phút$/)).toHaveAttribute("aria-live", "polite");
  await expect(page.locator("header, footer, nav")).toHaveCount(0); // FR-203, F001 SC-004

  // FR-401: the values refresh on their own as time passes (a real minute may also tick over).
  await waitForCountdownHydration(page);
  const minutes = Number(await unit(page, "minutes").getAttribute("data-value"));
  await page.clock.fastForward("05:00");
  const expected = new RegExp(`^(${twoDigits(minutes - 5)}|${twoDigits(minutes - 6)})$`);
  await expect(unit(page, "minutes")).toHaveAttribute("data-value", expected);
});

test("a device clock step while counting changes nothing; refocus re-reads the server clock (BR-003, FR-402, SC-009)", async ({ page }) => {
  await page.clock.install();
  await page.goto("/countdown");
  await expect(unit(page, "hours")).toHaveAttribute("data-value", "23");
  await waitForCountdownHydration(page); // the server clock is anchored on mount, so step the device clock after it
  const minutes = Number(await unit(page, "minutes").getAttribute("data-value"));
  // Wall clock only (NTP or a manual change): Playwright's setSystemTime moves Date.now(), not performance.now().
  await page.clock.setSystemTime(Date.now() + 3 * 3_600_000);
  await page.clock.runFor(60_000); // one minute of counting after the step
  // The digits did re-render after the step (a minute went by), yet the hours ignore it.
  const oneMinuteLess = new RegExp(`^(${twoDigits(minutes - 1)}|${twoDigits(minutes - 2)})$`);
  await expect(unit(page, "minutes")).toHaveAttribute("data-value", oneMinuteLess);
  await expect(unit(page, "hours")).toHaveAttribute("data-value", "23");
  await hideAndShowTab(page);
  await expect(unit(page, "hours")).toHaveAttribute("data-value", "23");
  await expect(page).toHaveURL("/countdown");
});

test("gate: every page goes to the countdown before the start, sign-in and assets stay reachable (SC-001, SC-002, FR-601)", async ({ page }) => {
  // The gate may still hold the `live` reading from earlier specs for up to 60 s.
  await expect.poll(() => landing(anonymous, "/"), { timeout: GATE_CACHE_MS + 15_000, intervals: [2_000] }).toBe("307 /countdown");
  // Dotted slugs are pages too: only real asset files skip the proxy (FR-101).
  for (const path of ["/", "/kudos", "/awards?x=1", "/admin", "/profile/me", "/awards/v1.2", "/kudos/a.b", "/admin/users.json"]) {
    expect(await landing(anonymous, path), `anonymous ${path}`).toBe("307 /countdown"); // gate before sign-in
    expect(await landing(page.request, path), `signed-in ${path}`).toBe("307 /countdown");
  }
  expect(await landing(anonymous, "/login")).toBe("200");
  expect(await landing(anonymous, "/countdown")).toBe("200");
  expect(await landing(anonymous, "/auth/callback")).toBe("307 /login?error=failed");
  expect(await landing(anonymous, "/images/countdown/countdown-background.webp")).toBe("200");
  expect(await landing(anonymous, "/favicon.ico")).toBe("200");

  await page.goto("/kudos");
  await expect(page).toHaveURL("/countdown");
  await expect(unit(page, "days")).toHaveAttribute("data-value", "01");
  await page.goto("/login"); // signed in: Login → Home → gate → countdown (SCREENFLOW)
  await expect(page).toHaveURL("/countdown");
});

test("an early start while the gate still holds 'upcoming' lands on the Homepage without a redirect loop (FR-102, SC-007)", async ({ page }) => {
  expect(await landing(anonymous, "/countdown")).toBe("200"); // the gate re-reads "upcoming" (60 s cache)
  const readAt = Date.now();
  runLocalSql("update public.events set start_at = now() - interval '1 second';"); // started early
  test.skip(Date.now() - readAt > GATE_CACHE_MS / 2, "wsl stalled; the gate's cached reading may have expired");
  expect(await landing(anonymous, "/")).toBe("307 /countdown"); // stale cached reading
  expect(await landing(anonymous, "/countdown")).toBe("307 /"); // fresh page read: started
  expect(await landing(anonymous, "/")).toBe("307 /login"); // the /countdown request refreshed the gate
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(page.locator("header")).toBeVisible();
});

test("no event row: 'Coming soon' without digits, pages load normally; a stalled read fails open within 1.5 s and is not cached (SC-011, SC-010)", async ({ page }) => {
  runLocalSql("delete from public.events;");
  const deletedAt = Date.now();
  await page.goto("/countdown");
  await expect(page.getByRole("status").filter({ hasText: "Coming soon" })).toBeVisible();
  await expect(page.locator("[data-unit]")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);

  // No success can be cached after the delete, so by then the gate holds no reading and asks Go (404).
  await waitMs(deletedAt + GATE_CACHE_MS + 2_000 - Date.now());
  expect(await landing(anonymous, "/")).toBe("307 /login"); // fail open, then the F002 sign-in rule
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(page.locator("header")).toBeVisible();

  // Stall Go's read (table lock) while a sub-minute launch row is written in the same transaction.
  const lock = await stallEventsRead(
    `delete from public.events; insert into public.events (name, start_at, ceremony_at) values ('Sun* Annual Awards 2025', now() + interval '40 seconds', now() + interval '20 days');`,
    4.5,
  );
  const started = Date.now();
  expect(await landing(anonymous, "/kudos")).toBe("307 /login?next=%2Fkudos");
  const elapsed = Date.now() - started;
  expect(elapsed, "the gate waited for the stalled read").toBeGreaterThanOrEqual(1_400);
  expect(elapsed, "the gate gave up after 1.5 s").toBeLessThan(2_500);
  await lock.released;
  // The timeout was not cached: the next request reads again and is gated.
  await expect.poll(() => landing(anonymous, "/kudos"), { timeout: 10_000 }).toBe("307 /countdown");
});

test("sub-minute boundary: digits read 00 00 00 and the Homepage opens at 0 ms without a reload (SC-008, SC-005)", async ({ page }) => {
  const startMs = await eventStartMs(anonymous);
  await page.goto("/countdown");
  await markDocument(page);
  for (const name of ["days", "hours", "minutes"] as const) {
    await expect(unit(page, name)).toHaveAttribute("data-value", "00");
  }
  await waitForCountdownHydration(page);
  // The hand-over starts with the client navigation's request for the Homepage (RSC fetch of `/`).
  const isHomepageFetch = (url: string, rsc?: string) => new URL(url).pathname === "/" && rsc === "1";
  const handedOverAt = page
    .waitForRequest((req) => isHomepageFetch(req.url(), req.headers()["rsc"]), { timeout: 60_000 })
    .then(() => Date.now());
  await waitMs(startMs - 5_000 - Date.now());
  await expect(page).toHaveURL("/countdown"); // reads 00 00 00 but waits for the exact moment (D001)
  const handOverMs = await handedOverAt;
  expect(handOverMs, "not before start_at (1 s clock tolerance)").toBeGreaterThanOrEqual(startMs - 1_000);
  expect(handOverMs, "not later than 1 s after start_at (SC-008)").toBeLessThanOrEqual(startMs + 1_000);
  await page.waitForURL("/", { timeout: 20_000 });
  expect(await sameDocument(page), "client navigation, no full reload (FR-403)").toBe(true);
  await expect(page.locator("header")).toBeVisible();
});

test("a resync on refocus that reports the event active hands over at once (SC-009, SC-007)", async ({ page }) => {
  applyEventScenario("prelaunch");
  await page.goto("/countdown"); // the gate's cached reading (sub-minute event) has started: no re-read
  await expect(unit(page, "days")).toHaveAttribute("data-value", "01");
  await waitForCountdownHydration(page);
  await markDocument(page);
  // The tab is hidden while the start passes; only the resync can move it (the target is 2 days away).
  await hideAndShowTab(page, () => {
    runLocalSql("update public.events set start_at = now() - interval '1 second';");
  });
  await expect(page).toHaveURL("/", { timeout: 15_000 });
  expect(await sameDocument(page)).toBe(true);
});

test("live: the countdown address lands on the Homepage and renders no countdown (SC-003, SC-007, FR-102)", async ({ page }) => {
  applyEventScenario("live");
  const response = await page.request.get("/countdown", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(new URL(response.headers()["location"]!, "http://x").pathname).toBe("/");
  expect(await response.text()).not.toContain("data-unit");
  await page.goto("/countdown");
  await expect(page).toHaveURL("/");
  await expect(page.locator("[data-unit]")).toHaveCount(0);
});
